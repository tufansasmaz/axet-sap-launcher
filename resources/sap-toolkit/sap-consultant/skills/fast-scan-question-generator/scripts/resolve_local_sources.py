"""Resolve the local delivery shortcut. Metadata only: no network, no content read.

Finds the synced folder that holds the past-project library, by CONTENT -- the
two child directories below -- rather than by guessing what the OneDrive
shortcut was named. Measured 2026-09-21: on a real machine the shortcuts sit
directly under the OneDrive root, not under the `Shortcuts/` subfolder the
original version hard-coded, and each one is its own registry MountPoint.

No tenant, no site URL, no library name in here. That is a house rule, and it is
also what lets this run on a consultant machine whose library is synced
somewhere else entirely. A Registry `Document Link` is mapped to a local file by
its path TAIL -- everything from the `1 - Proje Dokumanlari` segment onwards --
so the host and site in front of it are never consulted and never needed.
"""
from __future__ import annotations

import argparse
import json
import os
import stat
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

# The two directories that identify the library. Content, not a name we invented:
# a folder carrying both of these IS the delivery root, wherever it is synced.
PROJECTS = "1 - Proje Dokümanları"
AGENT = "2 - Agent Dokümanları"
CONTROLS = {
    "registry": Path(PROJECTS) / "[0] - SAP_Blueprint_Project_Registry.xlsx",
    # The incoming skill contradicted itself: its prose table named this path,
    # its script named a deeper one under "Templates and Question Sets/
    # 01_Business_Driven_Configuration_Questionnaires". Measured 2026-09-21
    # against the real library -- the prose was right, and that deeper folder
    # is empty. Preserve the "Genarator" spelling; it is the folder's name.
    "bdc": Path(AGENT) / "Explore - Question Genarator"
    / "Business_Driven_Configuration.xlsx",
}
# Superseded layout. Rejected rather than silently accepted: it resolves, and
# then every answer comes from a library nobody maintains any more.
LEGACY = "sdkb_sap_delivery_copilot_kb"

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from onedrive import candidate_roots, long_path
except ImportError:                      # pragma: no cover - no plugin root
    candidate_roots = None
    long_path = None


def console() -> None:
    """cp1254/cp857 consoles cannot print a Turkish path; see ntt_setup."""
    for stream in (sys.stdout, sys.stderr):
        try:
            if stream.isatty():
                stream.reconfigure(errors="replace")
            else:
                stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass


def io_path(path) -> Path:
    """Extended Windows path for stat/open; never shortens a source filename."""
    if long_path is not None:
        return long_path(Path(path))
    value = os.path.abspath(path)
    if os.name == "nt" and not value.startswith("\\\\?\\"):
        value = ("\\\\?\\UNC\\" + value[2:] if value.startswith("\\\\")
                 else "\\\\?\\" + value)
    return Path(value)


def inspect_path(path, directory: bool = False) -> dict:
    """Metadata presence proves neither hydration nor readable content.

    A cloud placeholder stats exactly like a file whose bytes are on disk, so
    `present` here means "OneDrive knows about it", never "it can be read".

    A DIRECTORY gets one extra state: `empty`. Measured 2026-09-21 on the first
    real sync -- OneDrive creates every shortcut subfolder immediately and fills
    them one at a time, so both marker directories existed while one of them was
    a hollow shell. Calling that `present` sent the consultant back to add a
    shortcut they already had; the fix is to tick the folder in Choose folders,
    or simply to wait.
    """
    try:
        info = io_path(path).stat()
        correct = stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode)
        state = "present" if correct else "wrong_type"
        if state == "present" and directory:
            try:
                if not any(io_path(path).iterdir()):
                    state = "empty"
            except OSError:
                state = "unavailable"
        return {"path": str(path), "access_path": str(io_path(path)),
                "state": state}
    except FileNotFoundError:
        return {"path": str(path), "state": "missing"}
    except OSError as exc:
        return {"path": str(path), "state": "unavailable", "error": str(exc)}


def is_delivery_root(path: Path) -> bool:
    if any(LEGACY in part.casefold() for part in path.parts):
        return False
    try:
        return (path / PROJECTS).is_dir() and (path / AGENT).is_dir()
    except OSError:
        return False


def validate_root(path: Path) -> dict:
    try:
        path = path.expanduser().resolve()
    except OSError as exc:
        return {"root": str(path), "valid": False, "error": str(exc)}
    if any(LEGACY in part.casefold() for part in path.parts):
        return {"root": str(path), "valid": False, "reason": "legacy_source"}
    # Reported one by one: a single missing control directory is a diagnosable
    # fact, and collapsing it into "root not found" sends the consultant looking
    # for the wrong problem.
    markers = [inspect_path(path / name, directory=True) for name in (PROJECTS, AGENT)]
    # `empty` still IDENTIFIES the root -- it is the right library, just not
    # finished syncing. Rejecting it would send the caller looking for another
    # one, which is the wrong fix.
    ok = {"present", "empty"}
    return {"root": str(path),
            "valid": all(m["state"] in ok for m in markers),
            "syncing": [m["path"] for m in markers if m["state"] == "empty"],
            "markers": markers}


def resolve_sources(root: str | None = None, environ=None) -> dict:
    env = os.environ if environ is None else environ
    override = root or env.get("FAST_SCAN_SOURCE_ROOT")

    if override:
        # An explicit root is never silently replaced by a discovered one: the
        # consultant said which library, and quietly reading a different one is
        # worse than failing.
        checks = [validate_root(Path(override))]
        selection = "explicit" if root else "environment_override"
    else:
        checks = [validate_root(p) for p in candidate_roots()] if candidate_roots \
            else []
        selection = "discovery"

    valid: dict[str, dict] = {}
    for c in checks:
        if c.get("valid"):
            valid.setdefault(os.path.normcase(c["root"]), c)
    result = {"status": "ambiguous" if len(valid) > 1 else "not_found",
              "selection": selection,
              "candidates": [c for c in checks if c.get("valid") or override],
              "content_read": False}
    if len(valid) == 1:
        chosen = next(iter(valid.values()))
        source_root = Path(chosen["root"])
        controls = {k: inspect_path(source_root / rel)
                    for k, rel in CONTROLS.items()}
        status = "resolved"
        hint = None
        if chosen.get("syncing") or any(c["state"] == "missing"
                                        for c in controls.values()):
            # The right library, not yet usable. A distinct status, because
            # "not_found" would have the consultant re-adding a shortcut that
            # is already there.
            status = "syncing"
            hint = ("The library is the right one but OneDrive has not finished "
                    "bringing it down. Wait, or open OneDrive > Settings > "
                    "Account > Choose folders and tick the folders below.")
        result.update(status=status, source_root=str(source_root),
                      controls=controls)
        if hint:
            result["hint"] = hint
            result["incomplete"] = ([str(Path(s).name) for s in chosen.get("syncing", [])]
                                    + [k for k, c in controls.items()
                                       if c["state"] == "missing"])
    return result


def map_document_url(source_root, url: str) -> Path:
    """Map a Registry URL to a local file by its path TAIL, not by its host.

    The Registry stores full SharePoint URLs. Everything before the library's
    own `1 - Proje Dokumanlari` segment is site addressing this script must not
    know: it differs per tenant, it is not ours to ship, and it is not needed --
    the tail after that segment is exactly the path under the resolved root.
    Matching on a bare filename is refused; two projects can hold the same one.
    """
    parts = [unquote(p) for p in urlsplit(url).path.split("/") if p]
    for i, part in enumerate(parts):
        if part in (PROJECTS, AGENT):
            relative = parts[i:]
            break
    else:
        raise ValueError(f"URL does not pass through {PROJECTS!r} or {AGENT!r}, "
                         f"so it is not a document inside this library")
    if len(relative) < 2:
        raise ValueError("URL names the library folder, not a document in it")
    for p in relative:
        if p in (".", "..") or any(c in p for c in '\\/:*?"<>|\x00') \
                or p.endswith((".", " ")):
            raise ValueError(f"invalid or escaping path segment: {p!r}")
    base = Path(source_root).resolve()
    local = base.joinpath(*relative).resolve()
    if not local.is_relative_to(base):
        raise ValueError("resolved document escapes the selected root")
    return local


def main() -> int:
    console()
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--root", help="exact local library folder, not its OneDrive parent")
    ap.add_argument("--document-url", help="a Registry document URL to map locally")
    args = ap.parse_args()
    result = resolve_sources(args.root)
    if args.document_url and result["status"] == "resolved":
        try:
            result["document"] = inspect_path(
                map_document_url(result["source_root"], args.document_url))
        except (OSError, ValueError) as exc:
            result["mapping_error"] = str(exc)
    # ASCII-escaped: the console this lands on is often cp1254 and the paths are
    # Turkish. The shim above covers the rest.
    print(json.dumps(result, ensure_ascii=True, indent=2))
    return 0 if result["status"] == "resolved" and "mapping_error" not in result else 2


if __name__ == "__main__":
    raise SystemExit(main())
