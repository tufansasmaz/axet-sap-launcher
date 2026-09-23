"""Orchestrator: pull a SAP package's contents into the local workspace.

For starting work on existing SAP code. Composes:
  1. gui_login.py - ensure a SAPGUI session is open
  2. gui_run_zabapgit_bootstrap.py - drive ZABAPGIT_STANDALONE in P_BOOT='X'
     mode so it serializes the package, writes a ZIP to the workstation
  3. unpack the ZIP into <cwd>/.abapgit-tmp/<package>-<UTC>/ first (audit),
     then promote files into <cwd>/src/ for editing
  4. seed a git commit if cwd is a git repo

Returns:
  exit 0 -> source landed in src/, ready to edit
  exit 1 -> bootstrap reported FAIL/EXCEPTION
  exit 2 -> setup failure (.conn_adt missing, package unspecified)
  exit 3 -> SAPGUI scripting failure

Usage:
    python abapgit_bootstrap.py --package ZGIT
    python abapgit_bootstrap.py --package ZGIT --no-login
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

THIS_DIR = Path(__file__).parent.resolve()


def _run_step(label: str, cmd: list[str], cwd: str | None = None,
              capture: bool = True) -> tuple[int, str]:
    print(label, flush=True)
    if capture:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        out = (r.stdout or "") + (r.stderr or "")
        for line in out.rstrip().splitlines():
            print(f"  | {line}", flush=True)
        return r.returncode, out
    r = subprocess.run(cmd, cwd=cwd)
    return r.returncode, ""


def _git_root(start: Path) -> Path | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return Path(out) if out else None
    except Exception:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", required=True,
                        help="SAP package to pull (must exist on SAP)")
    parser.add_argument("--cwd", default=os.getcwd(),
                        help="Workspace directory (default: current dir)")
    parser.add_argument("--system", default=os.getenv("SAP_GUI_SYSTEM", "Local"),
                        help="SAP Logon entry name")
    parser.add_argument("--no-login", action="store_true",
                        help="Skip gui_login; assume session is open")
    parser.add_argument("--connection-index", type=int, default=0)
    parser.add_argument("--session-index", type=int, default=0)
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--keep-tmp", action="store_true",
                        help="Keep .abapgit-tmp/<package>-<UTC>/ after promote")
    args = parser.parse_args()

    cwd = Path(args.cwd).resolve()
    cwd.mkdir(parents=True, exist_ok=True)
    package = args.package.upper()

    # ---- 1/3: ensure SAPGUI session ----
    if not args.no_login:
        rc, _ = _run_step(f"[1/3] gui_login.py --system {args.system!r}",
                          [sys.executable, str(THIS_DIR / "gui_login.py"),
                           "--system", args.system, "--cwd", str(cwd)])
        if rc != 0:
            print(f"FAIL: gui_login (exit {rc})", file=sys.stderr)
            return 3
    else:
        print("[1/3] skip login (--no-login)")

    # ---- 2/3: bootstrap (package -> ZIP) ----
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    tmp_dir = cwd / ".abapgit-tmp" / f"{package}-{ts}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    zip_path = tmp_dir / f"{package}.zip"

    rc, _ = _run_step(f"[2/3] gui_run_zabapgit_bootstrap.py --package {package}",
                      [sys.executable,
                       str(THIS_DIR / "gui_run_zabapgit_bootstrap.py"),
                       "--package", package,
                       "--out", str(zip_path),
                       "--connection-index", str(args.connection_index),
                       "--session-index", str(args.session_index),
                       "--timeout", str(args.timeout)])
    if rc != 0:
        print(f"FAIL: bootstrap (exit {rc})", file=sys.stderr)
        return 1

    if not zip_path.exists():
        print(f"FAIL: bootstrap reported success but ZIP missing at {zip_path}",
              file=sys.stderr)
        return 1

    # ---- 3/3: unpack + promote to src/ ----
    print(f"[3/3] unpacking {zip_path} -> {tmp_dir}")
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(tmp_dir)
    extracted = [p for p in tmp_dir.rglob("*") if p.is_file() and p != zip_path]
    print(f"      {len(extracted)} file(s) extracted")

    src_dir = cwd / "src"
    src_dir.mkdir(parents=True, exist_ok=True)
    promoted = 0
    for p in extracted:
        if p.suffix == ".zip":
            continue
        rel = p.relative_to(tmp_dir)
        # Flatten: drop any package-prefix folders abapGit produced; we
        # want everything directly under src/ for an easy edit-loop layout.
        target = src_dir / rel.name
        shutil.copy2(p, target)
        promoted += 1
    print(f"      promoted {promoted} file(s) to {src_dir}")

    if not args.keep_tmp:
        # Keep the ZIP for audit, drop the unpacked tree
        for p in tmp_dir.iterdir():
            if p == zip_path:
                continue
            if p.is_dir():
                shutil.rmtree(p)
            else:
                p.unlink()

    git_root = _git_root(cwd)
    if git_root is not None:
        print(f"      (cwd is inside git repo {git_root}; "
              f"review with `git status` and commit when ready)")

    print()
    print(f"OK: bootstrap complete - {promoted} file(s) in {src_dir}")
    print(f"    audit ZIP: {zip_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
