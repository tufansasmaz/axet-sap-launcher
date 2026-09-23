"""AXET-TIER-GATE: refuse SAP writes unless .conn_adt says ADT_SAP_TIER=DEV.

aXet launcher adaptation (2026-09-23). The abapgit-deploy skill is installed on
every system the technical consultant opens, QA and PRD included; the decision
is that the SKILL is always present and the WRITE is gated at the moment it
happens. These scripts drive SAP GUI directly, so none of the sap-adt engine's
guardrails sit in their path. This module is that gate.

Fails CLOSED, unlike the engine's get_active_tier (which defaults to DEV): no
.conn_adt, or no ADT_SAP_TIER line in it, means the tier is unknown and the
write is refused. The aXet launcher always writes ADT_SAP_TIER when it opens a
system, so a missing line means the folder was not opened through it.

Usage, at the top of a writing script's main():
    from tier_gate import require_dev_tier
    refused = require_dev_tier(cwd)        # cwd: the project folder
    if refused:
        print(refused, file=sys.stderr)
        return 2
"""
from __future__ import annotations

import os
from pathlib import Path

# Same aliases as sap-adt/scripts/guardrails.py _TIER_ALIASES.
_TIER_ALIASES = {
    "DEVELOPMENT": "DEV", "DEV": "DEV", "SANDBOX": "DEV", "SBX": "DEV",
    "QUALITY": "QA", "QA": "QA", "QAS": "QA", "TEST": "QA",
    "INTEGRATION": "QA", "STAGING": "QA", "TRAINING": "QA",
    "PRODUCTION": "PRD", "PRD": "PRD", "PROD": "PRD", "P": "PRD",
}


def find_conn_adt(start: Path | str | None = None) -> Path | None:
    """The nearest .conn_adt at or above `start` (default: the current directory)."""
    here = Path(start or os.getcwd()).resolve()
    for d in (here, *here.parents):
        f = d / ".conn_adt"
        if f.is_file():
            return f
    return None


def read_tier(conn_file: Path) -> str | None:
    """Canonical DEV/QA/PRD from ADT_SAP_TIER, or None when the line is absent."""
    for line in conn_file.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if s.startswith("#") or "=" not in s:
            continue
        k, _, v = s.partition("=")
        if k.strip() == "ADT_SAP_TIER" and v.strip():
            raw = v.strip().upper()
            return _TIER_ALIASES.get(raw, raw)
    return None


def require_dev_tier(start: Path | str | None = None) -> str | None:
    """None when writing is allowed, else the refusal message to print."""
    conn = find_conn_adt(start)
    if conn is None:
        return ("REFUSED [GR_TIER]: no .conn_adt found, so the system tier cannot be "
                "verified. SAP writes are allowed only on a DEV system.")
    try:
        tier = read_tier(conn)
    except Exception as exc:  # unreadable file = unknown tier = refuse
        return (f"REFUSED [GR_TIER]: could not read {conn} ({type(exc).__name__}: {exc}). "
                "SAP writes are allowed only on a DEV system.")
    if tier is None:
        return (f"REFUSED [GR_TIER]: {conn} has no ADT_SAP_TIER line, so the system tier "
                "is unknown. SAP writes are allowed only on a DEV system; open the system "
                "through the aXet launcher and mark it DEV if it is one.")
    if tier != "DEV":
        return (f"REFUSED [GR_TIER]: this system is marked {tier} (read-only). abapGit "
                "deploy/import/activate is allowed only on a DEV system. This is the "
                "intended behaviour, not a fault — deploy on the development system and "
                "let the transport carry it onward.")
    return None
