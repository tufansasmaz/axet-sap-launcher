"""Orchestrator: full autonomous deploy of a Git commit to SAP via SAPGUI.

Composes:
  1. abapgit-bridge plugin's abapgit_export_zip.py - commit + ZIP (audit)
  2. gui_login.py - ensure a SAPGUI session is open
  3. gui_run_zabapgit_auto.py - drive ZABAPGIT_STANDALONE directly via its
     hidden selection-screen parameters (P_AGENT='X' triggers run_auto_deploy)
  4. on FAIL: capture the standalone's LIST output into
     .abapgit-status/<UTC>-deploy-<sha>.txt for Claude to read

Returns:
  exit 0 -> all green
  exit 1 -> deploy reported FAIL/EXCEPTION/REPO_NOT_FOUND/ACTIVATION_FAIL
  exit 2 -> setup failure (.conn_adt missing, plugin missing, ZIP missing)
  exit 3 -> SAPGUI scripting failure (login, navigation, etc.)
  exit 4 -> ZABAPGIT_STANDALONE not patched (run_auto_deploy block missing)

Claude wraps this in an iteration loop: on exit 1 read .abapgit-status/<latest>,
propose a fix in src/, re-run.

Usage:
    python abapgit_deploy.py --offline-repo ZGIT_TEST --package ZGIT_TEST \
        --transport NPLK900081 -m "feat(zcl_foo): add greet method"
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
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


def find_export_zip_script() -> Path | None:
    repo_root = _git_root_or_none(THIS_DIR)
    if repo_root is not None:
        candidate = repo_root / "plugins" / "abapgit-bridge" / "scripts" / "abapgit_export_zip.py"
        if candidate.exists():
            return candidate
    base = Path.home() / ".claude" / "plugins" / "cache" / "ntt-abap-marketplace" / "abapgit-bridge"
    if base.is_dir():
        versions = sorted([p for p in base.iterdir() if p.is_dir()], reverse=True)
        for v in versions:
            candidate = v / "scripts" / "abapgit_export_zip.py"
            if candidate.exists():
                return candidate
    return None


def _git_root_or_none(start: Path) -> Path | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return Path(out) if out else None
    except Exception:
        return None


def _run_step(label: str, cmd: list[str], cwd: str | None = None,
              capture: bool = True) -> tuple[int, str]:
    """Run a child process; return (returncode, combined_output)."""
    print(label, flush=True)
    if capture:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
        out = (r.stdout or "") + (r.stderr or "")
        # Echo a compact view to our stdout
        for line in out.rstrip().splitlines():
            print(f"  | {line}", flush=True)
        return r.returncode, out
    else:
        r = subprocess.run(cmd, cwd=cwd)
        return r.returncode, ""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline-repo", required=True,
                        help="abapGit offline repo name on SAP")
    parser.add_argument("--package", required=True,
                        help="Target SAP package (currently informational - "
                             "the offline repo is already bound to a package)")
    parser.add_argument("--transport", required=True,
                        help="Modifiable transport request (e.g., NPLK900081)")
    parser.add_argument("-m", "--message",
                        help="Commit message for the export step "
                             "(Conventional Commits format recommended)")
    parser.add_argument("--zip", help="Path to a pre-built ZIP "
                                      "(use with --no-export)")
    parser.add_argument("--no-export", action="store_true",
                        help="Skip /abapgit-export-zip; assumes ZIP exists")
    parser.add_argument("--system", default=os.getenv("SAP_GUI_SYSTEM", "Local"),
                        help="SAP Logon entry name (default 'Local' or "
                             "$SAP_GUI_SYSTEM)")
    parser.add_argument("--no-login", action="store_true",
                        help="Skip the gui_login step; assumes a session is "
                             "already open")
    parser.add_argument("--no-activate", action="store_true",
                        help="Deserialise only; skip activation")
    parser.add_argument("--no-capture", action="store_true",
                        help="Skip writing failure log to .abapgit-status/")
    parser.add_argument("--connection-index", type=int, default=0)
    parser.add_argument("--session-index", type=int, default=0)
    parser.add_argument("--timeout", type=int, default=180,
                        help="Seconds to wait for the SAP-side auto-deploy "
                             "to complete (default 180)")
    args = parser.parse_args()

    try:
        repo_root = Path(subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip())
    except Exception:
        print("FAIL: not in a git repo", file=sys.stderr)
        return 2

    # ---- 1/4: export ZIP ----
    if not args.no_export:
        export_script = find_export_zip_script()
        if export_script is None:
            print("FAIL: abapgit-bridge plugin not found - install it for the "
                  "export-zip step.", file=sys.stderr)
            return 2
        export_cmd = [sys.executable, str(export_script)]
        if args.message:
            export_cmd += ["-m", args.message]
        rc, _ = _run_step("[1/4] /abapgit-export-zip", export_cmd, capture=False)
        if rc not in (0, 1):
            print(f"FAIL: export-zip exited {rc}", file=sys.stderr)
            return 3
    else:
        print("[1/4] skip export (--no-export)")

    zip_path = args.zip
    if not zip_path:
        dist = repo_root / "dist"
        zips = sorted(dist.glob("*.zip"), key=lambda p: p.stat().st_mtime,
                      reverse=True)
        if not zips:
            print(f"FAIL: no ZIPs found under {dist}", file=sys.stderr)
            return 2
        zip_path = str(zips[0])
    print(f"      ZIP: {zip_path}")

    # ---- 2/4: ensure SAPGUI session ----
    if not args.no_login:
        rc, _ = _run_step(f"[2/4] gui_login.py --system {args.system!r}",
                          [sys.executable, str(THIS_DIR / "gui_login.py"),
                           "--system", args.system,
                           "--cwd", str(repo_root)])
        if rc != 0:
            print(f"FAIL: gui_login (exit {rc})", file=sys.stderr)
            return 3
    else:
        print("[2/4] skip login (--no-login)")

    # ---- 3/4: drive ZABAPGIT_STANDALONE via SAPGUI scripting ----
    deploy_cmd = [
        sys.executable, str(THIS_DIR / "gui_run_zabapgit_auto.py"),
        "--offline-repo", args.offline_repo,
        "--zip", str(zip_path),
        "--transport", args.transport,
        "--connection-index", str(args.connection_index),
        "--session-index", str(args.session_index),
        "--timeout", str(args.timeout),
    ]
    if args.message:
        deploy_cmd += ["-m", args.message]
    if args.no_activate:
        deploy_cmd += ["--no-activate"]

    rc, deploy_out = _run_step(f"[3/4] gui_run_zabapgit_auto.py "
                               f"--offline-repo {args.offline_repo}",
                               deploy_cmd)

    # ---- 4/4: report + capture on failure ----
    if rc == 0:
        print()
        print(f"[4/4] SUCCESS - all objects deployed cleanly to "
              f"{args.offline_repo}.")
        return 0

    print()
    print(f"[4/4] FAIL - deploy script exited {rc}")

    if not args.no_capture:
        status_dir = repo_root / ".abapgit-status"
        status_dir.mkdir(exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        try:
            sha = subprocess.run(
                ["git", "-C", str(repo_root), "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True, check=True,
            ).stdout.strip()
        except Exception:
            sha = "nogit"
        status_file = status_dir / f"{ts}-deploy-{sha}-FAIL.txt"
        with status_file.open("w", encoding="utf-8") as f:
            f.write(f"# abapgit-deploy via SAPGUI/abapGit Standalone\n")
            f.write(f"# captured {ts} UTC\n")
            f.write(f"# commit:        {sha}\n")
            f.write(f"# offline-repo:  {args.offline_repo}\n")
            f.write(f"# package:       {args.package}\n")
            f.write(f"# transport:     {args.transport}\n")
            f.write(f"# zip:           {zip_path}\n")
            f.write(f"# script-exit:   {rc}\n")
            f.write(f"\n")
            f.write(f"# --- gui_run_zabapgit_auto.py output ---\n")
            f.write(deploy_out or "(no output)")
        print(f"      captured to {status_file.relative_to(repo_root)}")
        print(f"      ask Claude: 'read .abapgit-status/{status_file.name} "
              f"and propose a fix'")

    return 1


if __name__ == "__main__":
    sys.exit(main())
