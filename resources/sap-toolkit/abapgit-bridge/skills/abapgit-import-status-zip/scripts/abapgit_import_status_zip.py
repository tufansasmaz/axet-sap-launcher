"""Ingest a status artifact from the SAP side into .abapgit-status/.

In **minimal mode** (no SAP-side automation), the developer manually captures
whatever feedback they got from SAPGUI — typically a copy/paste of the
activation error log into a .txt file, or a ZIP they exported from abapGit
showing what got imported.

This script accepts:
  - A single .txt / .log / .json file: copied verbatim into .abapgit-status/
  - A .zip containing any of the above: contents extracted into .abapgit-status/
                                        (skips src/ and binary blobs by default)

It does NOT:
  - Validate against a strict schema (no schema enforced — Claude reads loosely)
  - Touch src/ (source-of-truth stays in Git)

Usage:
  python abapgit_import_status_zip.py path/to/errors.txt
  python abapgit_import_status_zip.py path/to/abapgit-export.zip
  python abapgit_import_status_zip.py --dry-run path/to/file
  python abapgit_import_status_zip.py --label fix-attempt-1 path/to/file.txt
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path


# Filename patterns we consider "status content" worth surfacing
STATUS_PATTERNS = ("error", "log", "activation", "status", "syntax", "atc", "check")
ALLOWED_TEXT_EXT = {".txt", ".log", ".json", ".xml", ".md", ".csv", ".yaml", ".yml"}


def _repo_root() -> Path:
    return Path(
        subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    )


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _looks_like_status_member(name: str) -> bool:
    """Heuristic: should this ZIP member be treated as status content?"""
    norm = name.replace("\\", "/").lower().lstrip("/")

    # Reject src/ paths — never overwrite local source from a SAP export
    if norm.startswith("src/") or "/src/" in norm:
        return False

    ext = Path(norm).suffix.lower()
    if ext not in ALLOWED_TEXT_EXT:
        return False

    # Always accept anything under a status-ish folder
    if "abapgit-status/" in norm or norm.startswith("status/"):
        return True

    # Accept if the basename hints at status-like content
    base = Path(norm).name.lower()
    return any(p in base for p in STATUS_PATTERNS) or ext == ".json"


def _import_single_file(src: Path, status_dir: Path, label: str | None,
                        force: bool, dry_run: bool) -> int:
    """Returns 1 on success, 0 if skipped, -1 on error."""
    ts = _timestamp()
    base = src.name
    target_name = f"{ts}-{label}-{base}" if label else f"{ts}-{base}"
    target = status_dir / target_name

    if target.exists() and not force:
        print(f"SKIP  {target_name} (already exists; --force to overwrite)")
        return 0

    if dry_run:
        print(f"WOULD {target_name}")
    else:
        shutil.copy2(src, target)
        print(f"OK    {target_name}")
    return 1


def _import_zip(zip_path: Path, status_dir: Path, label: str | None,
                force: bool, dry_run: bool) -> tuple[int, int]:
    """Returns (imported, skipped)."""
    imported = 0
    skipped = 0
    ts = _timestamp()

    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.namelist():
            if member.endswith("/"):
                continue
            if not _looks_like_status_member(member):
                continue

            base = Path(member.replace("\\", "/")).name
            target_name = f"{ts}-{label}-{base}" if label else f"{ts}-{base}"
            target = status_dir / target_name

            if target.exists() and not force:
                print(f"SKIP  {target_name} (already exists)")
                skipped += 1
                continue

            data = zf.read(member)
            if dry_run:
                print(f"WOULD {target_name}  ({len(data)} bytes from {member})")
            else:
                target.write_bytes(data)
                print(f"OK    {target_name}  (from {member})")
            imported += 1

    return imported, skipped


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", help="Path to .txt / .log / .json / .zip from SAP side")
    parser.add_argument("--dry-run", action="store_true",
                        help="List what would be imported without writing")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing target files")
    parser.add_argument("--label", default=None,
                        help="Optional tag to prepend to target filenames "
                             "(e.g., --label fix-attempt-1)")
    args = parser.parse_args(argv)

    src_path = Path(args.artifact)
    if not src_path.exists():
        print(f"error: {src_path} not found", file=sys.stderr)
        return 2

    try:
        root = _repo_root()
    except subprocess.CalledProcessError:
        print("error: not in a git repo", file=sys.stderr)
        return 2

    status_dir = root / ".abapgit-status"
    status_dir.mkdir(exist_ok=True)

    ext = src_path.suffix.lower()
    if ext == ".zip":
        imported, skipped = _import_zip(src_path, status_dir, args.label,
                                        args.force, args.dry_run)
    elif ext in ALLOWED_TEXT_EXT:
        result = _import_single_file(src_path, status_dir, args.label,
                                     args.force, args.dry_run)
        imported = max(0, result)
        skipped = 1 if result == 0 else 0
    else:
        print(f"error: unsupported extension {ext!r}", file=sys.stderr)
        print(f"       supported: .zip + {sorted(ALLOWED_TEXT_EXT)}", file=sys.stderr)
        return 2

    print()
    print(f"imported: {imported}, skipped: {skipped}")
    if imported == 0 and skipped == 0:
        print(
            f"note: nothing matched in {src_path.name}.\n"
            "      For a ZIP: it should contain text/log/json files in any folder.\n"
            "      For a single file: extension must be one of "
            f"{sorted(ALLOWED_TEXT_EXT)}.",
            file=sys.stderr,
        )
        return 1

    if not args.dry_run and imported > 0:
        print()
        print("next: read .abapgit-status/ - Claude can ingest the new entries directly.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
