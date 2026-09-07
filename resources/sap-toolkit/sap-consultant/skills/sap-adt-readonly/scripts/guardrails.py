#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bypass-free safety guardrails for SAP ADT write operations.

These turn skill *instructions* ("only work in Z/Y namespace", "never delete
standard objects", "transport required") into actual CODE checks the agent
cannot skip. Each guard raises GuardrailViolation; callers run them BEFORE any
HTTP request.

Adapted from the TRAKYA_DOKUM MCP server's ADR-0005/0010 guardrails, simplified
for abaper's single-.conn_adt model: there is no tier file, so the read-only
guard is opt-in via the ADT_READONLY environment variable.
"""
from __future__ import annotations

import os
import re


class GuardrailViolation(Exception):
    """Raised when a write/safety rule is violated, before any HTTP call."""

    def __init__(self, code: str, message: str, **context):
        self.code = code
        self.context = context
        super().__init__(f"[{code}] {message}")

    def as_dict(self) -> dict:
        return {
            "ok": False,
            "error": "guardrail_violation",
            "code": self.code,
            "message": str(self),
            "context": self.context,
        }


# Customer namespace: Z / Y prefix, optionally inside a /NAMESPACE/ wrapper
# (e.g. ZAI_CL_FOO, YBAR, /ACME/ZBAZ).
_CUSTOMER_PREFIX = re.compile(r"^(/[A-Za-z0-9_]+/)?[ZY][A-Za-z0-9_]*$", re.IGNORECASE)


def is_customer_object(name: str) -> bool:
    """True if name is in the customer namespace (Z/Y, optionally /NSP/-wrapped)."""
    return bool(name and _CUSTOMER_PREFIX.match(name))


def require_customer_namespace(name: str, *, what: str = "object") -> None:
    """Reject create/modify of SAP standard objects — customer (Z/Y) namespace only."""
    if not name:
        raise GuardrailViolation("GR_NAMESPACE", f"{what} name must not be empty")
    if not is_customer_object(name):
        raise GuardrailViolation(
            "GR_NAMESPACE",
            f"Refusing to create/modify a standard object: {what} '{name}' must start "
            f"with Z or Y (customer namespace).",
            name=name,
        )


def reject_standard_delete(name: str) -> None:
    """Reject deletion of any object not in the customer (Z/Y) namespace."""
    if not is_customer_object(name):
        raise GuardrailViolation(
            "GR_NAMESPACE",
            f"Refusing to DELETE a standard object: '{name}' is not in the Z/Y "
            f"customer namespace.",
            name=name,
        )


def require_transport(transport, *, what: str = "operation") -> None:
    """Require a non-empty transport. Never assume one."""
    if not transport or not str(transport).strip():
        raise GuardrailViolation(
            "GR_TRANSPORT",
            f"A transport is required for {what} — run list_transports.py "
            f"--modifiable-only and confirm the transport with the user.",
        )


def is_readonly() -> bool:
    """Read-only mode is opt-in via ADT_READONLY=true|1|yes (default: writable)."""
    return os.getenv("ADT_READONLY", "").strip().lower() in ("true", "1", "yes")


# --- Tier-based write guard (ported from TRAKYA_DOKUM ADR-0010, v1.4.7) ----------
# Landscape tier names → canonical DEV/QA/PRD. Only DEV permits mutations.
_TIER_ALIASES = {
    "DEVELOPMENT": "DEV", "DEV": "DEV", "SANDBOX": "DEV", "SBX": "DEV",
    "QUALITY": "QA", "QA": "QA", "QAS": "QA", "TEST": "QA",
    "INTEGRATION": "QA", "STAGING": "QA", "TRAINING": "QA",
    "PRODUCTION": "PRD", "PRD": "PRD", "PROD": "PRD", "P": "PRD",
}
_WRITABLE_TIERS = frozenset({"DEV"})


def _conn_value(key: str):
    """Read a single KEY=value line from .conn_adt (authoritative), else env, else None.

    .conn_adt is the source of truth: an env var can be stale (a prior dotenv load),
    so a fresh read of the file each call lets a tier switch take effect mid-session.
    """
    try:
        from sap_adt_lib import find_conn_file  # local import: avoid load-time cycle
        p = find_conn_file()
        if p and p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                s = line.strip()
                if s.startswith(key) and "=" in s:
                    v = s.split("=", 1)[1].strip()
                    if v:
                        return v
    except Exception:
        pass
    return os.getenv(key)


def get_active_tier() -> str:
    """Active system tier (DEV/QA/PRD) from .conn_adt ADT_SAP_TIER. Fail-safe: DEV.

    Fail-safe to DEV (writable) so existing single-system .conn_adt files that predate
    ADT_SAP_TIER keep working unchanged — you opt INTO QA/PRD protection by adding the
    line. Pair with require_writable_tier in the write path.
    """
    raw = _conn_value("ADT_SAP_TIER")
    if raw:
        return _TIER_ALIASES.get(raw.strip().upper(), raw.strip().upper())
    return "DEV"


def require_writable_tier(*, what: str = "mutation") -> None:
    """Refuse create/push/activate/delete unless the active tier is DEV.
    "Safety is not memory, it is code" — tier is read from .conn_adt, not remembered.
    """
    t = get_active_tier()
    if t not in _WRITABLE_TIERS:
        raise GuardrailViolation(
            "GR_TIER",
            f"{what} refused — active system tier={t} (read-only). Mutations "
            f"(create/push/activate/delete) are allowed only on DEV. Set "
            f"ADT_SAP_TIER=DEV in .conn_adt for a dev system, or switch connection.",
            tier=t,
        )


def require_writable(*, what: str = "mutation") -> None:
    """Block mutations when the system is read-only — both the explicit ADT_READONLY
    flag AND the graded tier guard (QA/PRD from .conn_adt). Called by every write
    path (push/create/delete/...), so both apply everywhere automatically.
    """
    if is_readonly():
        raise GuardrailViolation(
            "GR_READONLY",
            f"{what} refused — ADT_READONLY is set (system marked read-only). "
            f"Unset ADT_READONLY to allow writes, or switch to a DEV .conn_adt.",
        )
    require_writable_tier(what=what)


def require_binding_current(client, *, what: str = "operation") -> None:
    """Refuse if the live persistent session is bound to a DIFFERENT host than
    .conn_adt now points to (TRAKYA binding-drift backstop).

    abaper's session is long-lived: if the user edits .conn_adt to a new system
    without restarting the MCP, the cached client is still bound to the OLD host —
    so a "DEV" write would actually hit the previous system. Best-effort: never
    blocks when either side is unknown.
    """
    try:
        bound = (getattr(getattr(client, "adt_client", None), "url", "") or "").rstrip("/").lower()
        configured = (_conn_value("ADT_SAP_URL") or "").rstrip("/").lower()
    except Exception:
        return
    if bound and configured and bound != configured:
        raise GuardrailViolation(
            "GR_BINDING_DRIFT",
            f"{what} refused — the running session is bound to {bound} but .conn_adt now "
            f"points to {configured}. Reload the MCP so it rebinds before writing — "
            f"otherwise this write would hit the old host.",
            bound=bound, configured=configured,
        )


# --- PII / KVKK data guard (ported from TRAKYA_DOKUM ADR-0011, v1.4.7) -----------
# Active ONLY on QA/PRD; DEV is exempt. Gates reads of personal/sensitive tables.
_AFFIRMATIVE = {"yes", "approve", "approved", "proceed", "confirm", "confirmed",
                "onay", "onaylıyorum", "evet", "kabul"}
_SENSITIVE_TABLE = re.compile(
    r"^(KNA1|KNB1|KNVK|LFA1|LFB1|ADRC|ADR6|ADCP|"
    r"BUT0\w*|BUT1\w*|BP\w*|"
    r"PA\d{4}|HRP\d+|PB\w*|T5\w*|"
    r"PAYR|REGUH|REGUP|BNKA|TIBAN|"
    r"BSEG|BKPF|ACDOCA|VBAK|VBAP|LIKP|LIPS|VBRK|VBRP|"
    r"DFKKBPTAXNUM|.*TAXNUM.*|.*STCD\d*.*|.*TCKN.*|.*VKN.*"
    r")$",
    re.IGNORECASE,
)


def is_sensitive_table(table) -> bool:
    return bool(table and _SENSITIVE_TABLE.match(str(table).strip()))


def require_data_access(table, *, acknowledge_risk: bool = False,
                        approval_text=None, what: str = "table read") -> None:
    """Gate sensitive-table reads on QA/PRD behind an explicit affirmative ack.
    DEV is exempt. Vague text ("try", "fetch") is NOT affirmative.
    """
    if get_active_tier() == "DEV":
        return
    if not is_sensitive_table(table):
        return
    if acknowledge_risk and approval_text and str(approval_text).strip().lower() in _AFFIRMATIVE:
        return
    raise GuardrailViolation(
        "GR_PII",
        f"{what} refused — '{table}' is a sensitive/PII table and this is a non-DEV "
        f"system. To proceed (KVKK): pass acknowledge_risk=true AND approval_text with an "
        f"affirmative word ('approve'/'proceed'/'onay'). Vague intent is not enough.",
        table=str(table),
    )


# --- Pre-push deterministic validators (ported from TRAKYA validators, v1.4.7) ---
_METHODS_START = re.compile(r"^\s*(CLASS-METHODS|METHODS)\b", re.IGNORECASE)
_TYPE_C_LEN = re.compile(r"\bTYPE\s+c\s+LENGTH\s+\d+", re.IGNORECASE)
_METHOD_IMPL = re.compile(r"^\s*METHOD\s+\w", re.IGNORECASE)


def scan_method_param_type_c(source: str):
    """Find `TYPE c LENGTH n` inside METHODS declarations (not bodies/TYPES).

    In a source-based class this makes the save fail with a LINE-NUMBER-LESS HTTP 400
    (ResourceScanDuringSaveFailure) — hours of blind bisecting. Catch it pre-PUT.
    Returns list of (line_no, text). `TYPE string` or a DDIC element is the fix.
    """
    hits, in_decl = [], False
    for i, raw in enumerate((source or "").splitlines(), 1):
        line = raw.split('"', 1)[0]  # strip line comment
        if _METHOD_IMPL.match(line):
            in_decl = False
            continue
        if _METHODS_START.match(line):
            in_decl = True
        if in_decl and _TYPE_C_LEN.search(line):
            hits.append((i, raw.strip()))
        if in_decl and line.rstrip().endswith("."):
            in_decl = False
    return hits


_DDIC_FIELD_RE = re.compile(
    # field name : FULL type spec up to ; or end-of-line. Capturing the whole spec
    # (not just the leading token) lets us detect inline-builtin retypes like
    # abap.char(50) -> abap.char(80), not only DTEL-named retypes.
    r"^\s*(?:key\s+)?([a-z][a-z0-9_]*)\s*:\s*([^;\n{}]+)",
    re.IGNORECASE | re.MULTILINE)
_DDIC_TABLE_RE = re.compile(r"define\s+table\s+([a-z][a-z0-9_]*)", re.IGNORECASE)
_DDIC_NON_FIELD = {"define", "table", "with", "include"}


def parse_ddic_fields(text: str) -> dict:
    """{field_lower: dtel_lower} from a DDIC table DDL source."""
    out = {}
    for fld, dtel in _DDIC_FIELD_RE.findall(text or ""):
        if fld.lower() in _DDIC_NON_FIELD:
            continue
        # normalize the type spec: lowercase, collapse inner whitespace
        out[fld.lower()] = " ".join(dtel.split()).lower()
    return out


def diff_ddic_fields(live_text: str, new_text: str):
    """Compare live vs new DDIC source → (dropped, type_changed, added).
    dropped:[field]; type_changed:[(field,old_dtel,new_dtel)]; added:[field]."""
    live, new = parse_ddic_fields(live_text), parse_ddic_fields(new_text)
    dropped = [f for f in live if f not in new]
    type_changed = [(f, live[f], new[f]) for f in live if f in new and live[f] != new[f]]
    added = [f for f in new if f not in live]
    return dropped, type_changed, added
