"""Pack a user-chosen subset of src/ + .abapgit.xml into an abapGit-importable ZIP.

The developer (or agent) decides what goes into the ZIP. The script does NOT
auto-detect changes - no git diff, no manifest tracking, no checkpoint. Two
scope options:

  --all           every file under src/
  --files <...>   explicit list (paths or globs, relative to repo root)

If neither flag is given and stdin is a TTY, the script prompts interactively.

Critical: every file in the ZIP gets deserialised by SAP and written to the
transport, including files you never touched. Pick only the files you
actually changed - especially in packages shared with other developers.

Deletions are NOT propagated. abapGit ZIP import only creates and updates
objects. To remove a SAP object, delete it manually in SE80 / SE14 / SE38.

Usage:
  python abapgit_export_zip.py                                  # interactive prompt
  python abapgit_export_zip.py --all                            # everything in src/
  python abapgit_export_zip.py --files src/zcl_foo.clas.abap src/zcl_foo.clas.xml
  python abapgit_export_zip.py --files "src/zcl_foo*"           # glob OK
  python abapgit_export_zip.py --list --files "src/zcl_foo*"    # preview, no ZIP
  python abapgit_export_zip.py --all --out /tmp/push.zip
"""
from __future__ import annotations

import argparse
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path


SOFT_WARN_THRESHOLD = 20
HARD_WARN_THRESHOLD = 100
HARD_CONFIRM_TOKEN = "BOOTSTRAP"


def _find_root() -> Path:
    """Walk up from cwd looking for src/ or .abapgit.xml. No git required."""
    p = Path.cwd().resolve()
    while True:
        if (p / "src").is_dir() or (p / ".abapgit.xml").is_file():
            return p
        if p.parent == p:
            print("error: cannot find src/ or .abapgit.xml in cwd or any parent.",
                  file=sys.stderr)
            sys.exit(2)
        p = p.parent


def _all_src_files(root: Path) -> list[Path]:
    src = root / "src"
    if not src.is_dir():
        return []
    return sorted(p for p in src.rglob("*") if p.is_file())


def _expand_files(root: Path, patterns: list[str]) -> tuple[list[Path], list[str]]:
    """Resolve each pattern (literal path or glob) relative to root.
    Returns (matched_files, errors). Globs use Path.glob semantics; '**' works
    for recursive matching."""
    matched: set[Path] = set()
    errors: list[str] = []
    for pat in patterns:
        norm = pat.replace("\\", "/")
        literal = (root / norm)
        if literal.is_file():
            matched.add(literal.resolve())
            continue
        hits = [h for h in root.glob(norm) if h.is_file()]
        if hits:
            for h in hits:
                matched.add(h.resolve())
            continue
        errors.append(f"no match: {pat}")
    return sorted(matched), errors


def _prompt_scope(root: Path) -> tuple[str, list[Path]]:
    """Interactive scope picker. Returns (scope_label, files) or exits."""
    src_files = _all_src_files(root)
    n = len(src_files)
    print(f"src/ contains {n} file{'s' if n != 1 else ''}. What should go in the ZIP?")
    print( "  (1) specific files      (paste paths or globs, one per line, blank ends)")
    print( "                          ^ recommended for incremental work — minimum blast radius")
    print(f"  (2) all {n} files       [writes {n} objects to transport — bootstrap or full re-sync]")
    print( "  (3) cancel")
    try:
        choice = input("> ").strip()
    except EOFError:
        choice = ""
    if choice == "1":
        print("Paste files (paths or globs, relative to repo root). Blank line ends.")
        lines: list[str] = []
        while True:
            try:
                line = input().strip()
            except EOFError:
                break
            if not line:
                break
            lines.append(line)
        if not lines:
            print("nothing entered, cancelling.", file=sys.stderr)
            sys.exit(1)
        files, errs = _expand_files(root, lines)
        for e in errs:
            print(f"warn: {e}", file=sys.stderr)
        if not files:
            print("error: no files matched.", file=sys.stderr)
            sys.exit(2)
        return "files", files
    if choice == "2":
        if n == 0:
            print("error: src/ is empty or missing.", file=sys.stderr)
            sys.exit(2)
        return "all", src_files
    print("cancelled.", file=sys.stderr)
    sys.exit(1)


def _confirm_threshold(count: int, is_tty: bool) -> bool:
    """Apply file-count guard. Returns True to proceed."""
    if count > HARD_WARN_THRESHOLD:
        if is_tty:
            print(f"\nWARNING: {count} files exceeds {HARD_WARN_THRESHOLD}. "
                  f"Type {HARD_CONFIRM_TOKEN} to confirm (anything else aborts):",
                  file=sys.stderr)
            try:
                resp = input("> ").strip()
            except EOFError:
                return False
            if resp != HARD_CONFIRM_TOKEN:
                print("not confirmed; aborting.", file=sys.stderr)
                return False
            return True
        print(f"WARNING: {count} files exceeds {HARD_WARN_THRESHOLD}; "
              "non-interactive run, proceeding anyway.", file=sys.stderr)
        return True
    if count > SOFT_WARN_THRESHOLD:
        if is_tty:
            print(f"\n{count} files. Continue? [Y/n]", file=sys.stderr)
            try:
                resp = input("> ").strip().lower()
            except EOFError:
                return False
            return resp in ("", "y", "yes")
        print(f"note: {count} files; non-interactive run, proceeding.",
              file=sys.stderr)
        return True
    return True


def _print_preview(files: list[Path], root: Path, abapgit_xml: Path | None) -> None:
    print("\nAbout to pack:")
    for f in files:
        print(f"  + {f.relative_to(root).as_posix()}")
    if abapgit_xml is not None:
        print(f"  + {abapgit_xml.relative_to(root).as_posix()}   "
              "(abapGit metadata, always included)")
    n = len(files)
    print(f"\nTotal: {n} file{'s' if n != 1 else ''} from src/.")


def _default_out_path(root: Path) -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return root / "dist" / f"{root.name}-{ts}.zip"


def _build_zip(out_path: Path, files: list[Path], abapgit_xml: Path | None,
               root: Path, message: str | None, scope_label: str) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_lines = [
        "# abapgit-bridge export manifest",
        f"created:  {datetime.now(timezone.utc).isoformat()}",
        f"repo:     {root.name}",
        f"scope:    {scope_label}",
        f"files:    {len(files)}",
    ]
    if message:
        manifest_lines.append(f"message:  {message}")
    manifest = "\n".join(manifest_lines) + "\n"

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(".abapgit-bridge-manifest.txt", manifest)
        if abapgit_xml is not None:
            zf.write(abapgit_xml, ".abapgit.xml")
        for f in files:
            zf.write(f, f.relative_to(root).as_posix())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Pack a user-chosen subset of src/ into an abapGit ZIP. "
                    "User decides scope; no auto-detection.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    scope_group = parser.add_mutually_exclusive_group()
    scope_group.add_argument("--all", action="store_true",
                             help="Include every file under src/.")
    scope_group.add_argument("--files", nargs="+", metavar="PATH",
                             help="Explicit file list (paths or globs, "
                                  "relative to repo root).")
    parser.add_argument("--list", action="store_true", dest="list_only",
                        help="Preview what would be packed; do not build the ZIP.")
    parser.add_argument("--out",
                        help="Output ZIP path (default: dist/<repo>-<UTC>.zip).")
    parser.add_argument("-m", "--message",
                        help="Annotation written to the ZIP manifest "
                             "(no git side effects).")
    args = parser.parse_args(argv)

    root = _find_root()

    abapgit_xml: Path | None = None
    if (root / ".abapgit.xml").is_file():
        abapgit_xml = root / ".abapgit.xml"

    if args.all:
        files = _all_src_files(root)
        scope_label = "all"
        if not files:
            print("error: src/ is empty or missing.", file=sys.stderr)
            return 2
    elif args.files:
        files, errs = _expand_files(root, args.files)
        for e in errs:
            print(f"warn: {e}", file=sys.stderr)
        if not files:
            print("error: no files matched.", file=sys.stderr)
            return 2
        scope_label = "files"
    else:
        if not sys.stdin.isatty():
            print("error: no scope specified (--all or --files) and stdin is "
                  "not a TTY. Cannot prompt.", file=sys.stderr)
            return 2
        scope_label, files = _prompt_scope(root)

    if abapgit_xml is None:
        print("warn: .abapgit.xml not found at repo root; abapGit's Import "
              "ZIP may reject this archive.", file=sys.stderr)

    _print_preview(files, root, abapgit_xml)

    is_tty = sys.stdin.isatty()
    if not args.list_only and not _confirm_threshold(len(files), is_tty):
        return 1

    if args.list_only:
        print("\n--list set; no ZIP built.")
        return 0

    out_path = Path(args.out) if args.out else _default_out_path(root)
    _build_zip(out_path, files, abapgit_xml, root, args.message, scope_label)

    print(f"\nwrote {out_path}  ({len(files)} files)")
    print()
    print("next steps:")
    print(f"  1. Transfer {out_path.name} to a workstation with SAPGUI access.")
    print("  2. SAPGUI -> ZGIT_BRIDGE (Import tab) or ZABAPGIT_STANDALONE -> Import ZIP.")
    print("  3. Pick transport, F8 (or Stage all + Commit), activate.")
    print("  4. If errors: capture log, run /abapgit-import-status-zip <path>.")
    print()
    print("Note: removing a file from src/ does NOT delete the SAP object. "
          "Delete manually in SE80 / SE14 if intended.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
