#!/usr/bin/env python3
"""Best-effort version check for the SessionStart hook.

Surfaces a stale sap-consultant install BEFORE it causes ghost-transport / behavior drift
(e.g. the MCP process still running an old version, or an agent globbing the
plugin cache and loading an old one). Two signals:

  1. OFFLINE (authoritative): the newest version folder in the plugin cache vs the
     version this hook fired from. No network/auth needed.
  2. BEST-EFFORT network: latest published on GitHub - `gh api` (private-repo
     capable, if authenticated) then unauthenticated raw (public only).

Never fails the session: any error -> prints a plain ready line.
Disable the network probe with ABAP_VERSION_CHECK=off.
"""
import os
import json
from pathlib import Path

import sys

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

GITHUB_RAW = (
    "https://raw.githubusercontent.com/global-innovation-lab/"
    "ntt-claude-marketplace/main/plugins/sap-consultant/.claude-plugin/plugin.json"
)
GH_API_PATH = ("repos/global-innovation-lab/ntt-claude-marketplace/contents/"
               "plugins/sap-consultant/.claude-plugin/plugin.json")


def _vtuple(v):
    try:
        return tuple(int(x) for x in str(v).strip().split("."))
    except Exception:
        return ()


def _local_version():
    # parents: [0]=scripts [1]=sap-adt [2]=skills [3]=sap-consultant
    try:
        pj = Path(__file__).resolve().parents[3] / ".claude-plugin" / "plugin.json"
        return json.loads(pj.read_text(encoding="utf-8")).get("version")
    except Exception:
        return None


def _newest_installed():
    """Newest sap-consultant version folder in the cache (this file's grandparent-of-version
    dir). Returns (str, vtuple) or (None, ())."""
    try:
        vroot = Path(__file__).resolve().parents[3].parent  # .../sap-consultant
        best, best_t = None, ()
        for c in vroot.iterdir():
            if c.is_dir():
                t = _vtuple(c.name)
                if t and t > best_t:
                    best, best_t = c.name, t
        return best, best_t
    except Exception:
        return None, ()


def _github_version(timeout=3):
    if os.getenv("ABAP_VERSION_CHECK", "").lower() in ("off", "0", "false", "no"):
        return None
    try:
        import subprocess as sp
        out = sp.run(["gh", "api", "-H", "Accept: application/vnd.github.raw", GH_API_PATH],
                     capture_output=True, text=True, timeout=timeout)
        if out.returncode == 0 and out.stdout.strip().startswith("{"):
            return json.loads(out.stdout).get("version")
    except Exception:
        pass
    try:
        import urllib.request as u
        req = u.Request(GITHUB_RAW, headers={"User-Agent": "adt-version-check"})
        with u.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8")).get("version")
    except Exception:
        return None


def main():
    local = _local_version()
    newest, newest_t = _newest_installed()
    local_t = _vtuple(local)

    # (1) offline stale-process / stale-glob warning
    if local_t and newest_t and newest_t > local_t:
        print(f"sap-consultant plugin ready - STALE: running v{local} but v{newest} is installed. "
              f"Restart the MCP/Claude Code, and resolve the scripts dir from `ping` "
              f"install_path (never glob the cache).")
        return

    # (2) best-effort upstream check
    latest = _github_version()
    base = newest or local
    if latest and _vtuple(latest) > _vtuple(base or "0"):
        print(f"sap-consultant plugin ready - UPDATE AVAILABLE: installed {base}, GitHub {latest}. "
              f"Run /plugin update sap-consultant@ntt-abap-marketplace, then restart the MCP.")
        return

    print(f"sap-consultant plugin ready (v{local or '?'})")


if __name__ == "__main__":
    main()
