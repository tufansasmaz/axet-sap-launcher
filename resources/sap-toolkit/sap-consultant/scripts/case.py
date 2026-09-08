#!/usr/bin/env python3
"""Case folder + append-only evidence ledger for the SAP support skills.

Shared by `sap-incident` (evidence ledger) and `sap-cr-scope` /
`sap-cr-handover` (scope ledger). One implementation, two claim types —
an estimate is an assertion about the system exactly like a root cause is,
and it deserves the same append-only treatment.

Stdlib only. The ledger is the constraining artifact: report sections are
rendered FROM it, so a claim with no row renders as an empty cell rather
than as confident prose.

    py case.py new  --ticket TCK-10482 --system PRD/100 --title "..."
    py case.py new  --ticket CR-2291 --kind cr --system DEV/100 --title "..."
    py case.py add  --case support/TCK-10482 --source adt_dumps \
                    --system PRD/100 --claim "..." --confidence observed
    py case.py add  --case cr/CR-2291 --source adt_where_used --tag scope ...
    py case.py limit --case support/TCK-10482 --what "..." --why "..." --where "..."
    py case.py set  --case cr/CR-2291 --estimate-days 4.5
    py case.py list --case support/TCK-10482
    py case.py check --case support/TCK-10482

Design rules that must not regress:
  * ledger.jsonl is APPEND-ONLY. Nothing in this file rewrites a line.
    If the agent could edit evidence to fit its conclusion, citation is theatre.
  * `--confidence observed` REQUIRES a real, non-empty --raw artifact. Without
    that rule the ledger records what the model asserted it saw, not what a
    tool returned, and the whole gate is decoration. See cmd_add.
  * limits.jsonl is the other half of the record: what could NOT be checked.
    A reader who cannot audit the analysis cannot tell "checked everything,
    still unsure" from "checked three things" unless the gaps are written down.
  * All file I/O pins encoding="utf-8". Windows defaults to cp1252 and
    silently mangles Turkish on append.
  * No .upper()/.lower() on user data — Turkish dotted/dotless i breaks it.
    Use casefold() only on ASCII-constrained enums.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

# Windows consoles default to cp1252, which cannot encode Turkish ğ/ş/İ or any of the
# claim text we print. Pin the streams before anything reaches them.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, OSError):  # pragma: no cover - non-reconfigurable stream
        pass

CONFIDENCE = ("observed", "reported", "inferred")
# observed  = an adt_* / tool call returned this from the named system
# reported  = a human said it, or it was read off a screenshot
# inferred  = derived by reasoning from other rows
#
# Only `observed` rows may support a [MECHANISM] root-cause claim.

KIND = ("incident", "cr")

# Tags a `cr` case is gated on. Free-form tags are allowed too — these are the
# ones `check` looks for, because each marks a step that is skippable in a hurry
# and expensive to skip.
TAG_REUSE = "reuse"  # standard SAP / config / an existing Z object already does it
TAG_SCOPE = "scope"  # what the change actually touches, from adt_where_used
TAG_ASBUILT = "asbuilt"  # what the transport really contains, at handover

SAFE_ID = re.compile(r"[^A-Za-z0-9._-]+")


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _slug(text: str) -> str:
    return SAFE_ID.sub("-", text).strip("-") or "case"


def _read_state(case: Path) -> dict:
    return json.loads((case / "case.json").read_text(encoding="utf-8"))


def _write_state(case: Path, state: dict) -> None:
    (case / "case.json").write_text(
        json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def _jsonl_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def _ledger_rows(case: Path) -> list[dict]:
    return _jsonl_rows(case / "evidence" / "ledger.jsonl")


def _limit_rows(case: Path) -> list[dict]:
    return _jsonl_rows(case / "evidence" / "limits.jsonl")


def cmd_new(args: argparse.Namespace) -> int:
    case = Path(args.dir) / _slug(args.ticket)
    if case.exists() and not args.force:
        print(f"refusing to overwrite existing case: {case}", file=sys.stderr)
        return 2
    (case / "evidence" / "raw").mkdir(parents=True, exist_ok=True)
    (case / "report").mkdir(parents=True, exist_ok=True)

    _write_state(
        case,
        {
            "ticket": args.ticket,
            "title": args.title,
            "kind": args.kind,  # incident | cr
            "system": args.system,
            "opened": _utcnow(),
            "consultant": args.consultant,
            "severity": args.severity,
            "language": args.language,
            "phase": "intake",
            "classification": None,  # incident | cr | user-education | duplicate
            "confidence": None,  # confirmed | probable | suspected | none
            "data_scope": None,  # set by `case.py scope` when PRD tables are needed
            "estimate_days": None,  # what we told the customer it would take
            "actual_days": None,  # what it took — the calibration loop
            "decision": None,  # cr only: build | config | reuse | reject | incident
        },
    )
    (case / "evidence" / "ledger.jsonl").touch()
    (case / "evidence" / "limits.jsonl").touch()
    (case / "JOURNAL.md").write_text(
        f"# {args.ticket} — {args.title}\n\n"
        f"| When | Actor | Event |\n|---|---|---|\n"
        f"| {_utcnow()} | {args.consultant} | Case opened on {args.system} |\n",
        encoding="utf-8",
    )
    print(case)
    return 0


def cmd_scope(args: argparse.Namespace) -> int:
    """Record a per-case data-scope authorisation.

    the sap-adt engine's guardrails gate KNA1/LFA1/ADRC/VBAK/VBAP/LIKP/LIPS/BSEG/BKPF/ACDOCA
    and friends on QA and PRD, per call. Approving fifteen times per ticket turns
    a KVKK control into a keystroke. This records ONE authorisation, with a named
    human and an enumerated table list, and prints into the report's data block —
    which makes it reviewable, which per-call approval is not.
    """
    case = Path(args.case)
    state = _read_state(case)
    state["data_scope"] = {
        "granted_by": args.granted_by,
        "at": _utcnow(),
        "tables": [t.strip() for t in args.tables.split(",") if t.strip()],
        "purpose": args.purpose,
    }
    _write_state(case, state)
    with (case / "JOURNAL.md").open("a", encoding="utf-8") as fh:
        fh.write(f"| {_utcnow()} | {args.granted_by} | Data scope granted: {args.tables} |\n")
    print(f"data scope recorded for {len(state['data_scope']['tables'])} table(s)")
    return 0


def cmd_set(args: argparse.Namespace) -> int:
    """Update scalar state fields. Never touches the ledger."""
    case = Path(args.case)
    state = _read_state(case)
    fields = {
        "phase": args.phase,
        "classification": args.classification,
        "confidence": args.confidence,
        "estimate_days": args.estimate_days,
        "actual_days": args.actual_days,
        "decision": args.decision,
    }
    changed = {k: v for k, v in fields.items() if v is not None}
    if not changed:
        print("nothing to set", file=sys.stderr)
        return 2
    state.update(changed)
    _write_state(case, state)
    for key, value in changed.items():
        print(f"{key} = {value}")
    if "actual_days" in changed:
        _print_variance(state)
    return 0


def _print_variance(state: dict) -> None:
    """Say out loud what the estimate got wrong, in either direction.

    Under-running matters as much as over-running and is almost never reported,
    because nobody escalates good news. But an estimate that lands at a quarter
    of its number is not luck — it means the baseline the estimate came from
    predates the tooling, and every future quote off that baseline is wrong the
    same way. That has to leave the machine and reach whoever maintains the
    skills, or it is learned once and forgotten.
    """
    est, act = state.get("estimate_days"), state.get("actual_days")
    if not est or act is None:
        return
    ratio = act / est
    print(f"\nestimate {est} d → actual {act} d  ({ratio:.0%} of estimate)")
    if ratio <= 0.5:
        print(
            "  ⚑ UNDER-RAN BY HALF OR MORE. Report this back — ticket, shape, estimate,\n"
            "    actual, and what made it fast. The estimating baseline is stale and\n"
            "    every future quote of this shape is too high until it is corrected."
        )
    elif ratio >= 1.3:
        print("  ⚑ Over-ran by 30%+. Write one line on why, in the internal document.")


def cmd_add(args: argparse.Namespace) -> int:
    case = Path(args.case)
    if args.confidence not in CONFIDENCE:
        print(f"--confidence must be one of {CONFIDENCE}", file=sys.stderr)
        return 2

    # `observed` is the only confidence level that can support a [MECHANISM]
    # claim, so it is the only one worth faking. Without this rule the row
    # records that the model SAID a tool returned something; with it, the row
    # cannot exist unless the output is on disk and hashed. Everything else in
    # this file is bookkeeping — this is the load-bearing line.
    if args.confidence == "observed" and not args.raw:
        print(
            "--confidence observed requires --raw <file> holding the tool output.\n"
            "  Write the adt_* result to a file, pass it here, and it is copied and hashed.\n"
            "  If you did not run a tool call, this is not `observed` — use `reported`\n"
            "  (a human or a screenshot said so) or `inferred` (you reasoned it out).",
            file=sys.stderr,
        )
        return 2

    rows = _ledger_rows(case)
    row = {
        "id": f"E{len(rows) + 1}",
        "ts": _utcnow(),
        "source": args.source,
        "system": args.system,
        "query": args.query,
        "claim": args.claim,
        "confidence": args.confidence,
        "tags": [t.strip() for t in (args.tag or "").split(",") if t.strip()],
        "excerpt": args.excerpt,
        "raw": None,
        "sha256": None,
    }

    if args.raw:
        raw = Path(args.raw)
        if not raw.exists():
            print(f"--raw not found: {raw}", file=sys.stderr)
            return 2
        blob = raw.read_bytes()
        if not blob.strip():
            print(
                f"--raw is empty: {raw}\n"
                "  An empty artifact proves nothing. If the tool returned no rows, say that\n"
                "  in --claim and keep the empty result — but write the actual response\n"
                "  (including the query and 'no rows') into the file first.",
                file=sys.stderr,
            )
            return 2
        dest = case / "evidence" / "raw" / f"{row['id']}{raw.suffix or '.txt'}"
        dest.write_bytes(blob)
        row["raw"] = str(dest.relative_to(case)).replace("\\", "/")
        row["sha256"] = hashlib.sha256(blob).hexdigest()

    # APPEND ONLY. Never seek, never rewrite.
    with (case / "evidence" / "ledger.jsonl").open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(row["id"])
    return 0


def cmd_limit(args: argparse.Namespace) -> int:
    """Record something this analysis could NOT check, and where to go instead.

    The reader of these reports is often a functional consultant who cannot
    audit the work. To them a confident page 1 looks identical whether the
    analysis covered everything or covered three things. The confidence label
    grades what WAS found; nothing grades what was never looked at.

    ADT genuinely cannot see: job logs and spool, application logs, system log,
    authorisation traces, update terminations, lock entries, IDoc / qRFC / tRFC
    monitors, workflow, output determination, runtime traces and SQL plans, and
    SAP Notes for standard behaviour. Every one of those is a normal cause of a
    normal ticket. Naming the gap is what stops the report over-claiming.
    """
    case = Path(args.case)
    rows = _limit_rows(case)
    row = {
        "id": f"L{len(rows) + 1}",
        "ts": _utcnow(),
        "what": args.what,
        "why": args.why,
        "where": args.where,
        "blocking": bool(args.blocking),
    }
    with (case / "evidence" / "limits.jsonl").open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(row["id"] + ("  (blocking)" if row["blocking"] else ""))
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    case = Path(args.case)
    rows = _ledger_rows(case)
    if not rows:
        print("(no evidence yet)")
    else:
        # Only widen the table when something actually uses tags, so an incident
        # ledger renders exactly as it always has.
        tagged = any(r.get("tags") for r in rows)
        head = "| ID | Source | System | Confidence | Claim |"
        rule = "|---|---|---|---|---|"
        if tagged:
            head = "| ID | Source | System | Confidence | Tags | Claim |"
            rule = "|---|---|---|---|---|---|"
        print(head)
        print(rule)
        for r in rows:
            claim = (r["claim"] or "").replace("|", "\\|")
            cells = [r["id"], r["source"], r["system"], r["confidence"]]
            if tagged:
                cells.append(", ".join(r.get("tags") or []))
            cells.append(claim)
            print("| " + " | ".join(cells) + " |")

    # The limits table renders into NELERİ KONTROL EDEMEDİM on page 1. It is
    # printed alongside the evidence, never in a separate appendix, because the
    # two are only meaningful together.
    limits = _limit_rows(case)
    if limits:
        print("\n| ID | Kontrol edilemedi | Neden | Nereye bakılmalı |")
        print("|---|---|---|---|")
        for r in limits:
            cells = [
                r["id"] + (" ⚠" if r.get("blocking") else ""),
                (r.get("what") or "").replace("|", "\\|"),
                (r.get("why") or "").replace("|", "\\|"),
                (r.get("where") or "").replace("|", "\\|"),
            ]
            print("| " + " | ".join(cells) + " |")
    return 0


def _check_cr(state: dict, rows: list[dict]) -> tuple[list[str], list[str]]:
    """Extra gates for a change request. Returns (problems, warnings).

    A CR fails differently from an incident. An incident report goes wrong by
    asserting a cause nobody checked; a CR goes wrong by building something the
    system could already do.
    """
    problems: list[str] = []
    warnings: list[str] = []
    tags = {t for r in rows for t in (r.get("tags") or [])}
    phase = state.get("phase") or ""

    if TAG_REUSE not in tags:
        problems.append(
            "no `reuse` row — nobody checked whether standard SAP, config, or an "
            "existing Z object already does this"
        )

    if state.get("estimate_days") is not None and TAG_SCOPE not in tags:
        problems.append(
            "effort decomposition recorded without a `scope` row — the lines were not computed"
        )

    if phase == "handover":
        if TAG_ASBUILT not in tags:
            problems.append("handover without an `asbuilt` row read from the transport")
        # NOT a gate. Actual effort is the calibration loop and it matters, but
        # blocking a handover on it just means somebody types the timesheet
        # number to get past the gate — which is worse than no number, because
        # it looks like data. Ask loudly, ship anyway.
        if state.get("actual_days") is None:
            warnings.append(
                "no actual effort recorded — `set --actual-days` when you know it; "
                "the estimate learns nothing without its pair"
            )

    return problems, warnings


def cmd_check(args: argparse.Namespace) -> int:
    """Deterministic gate. Prints findings; exit 1 if the case is not report-ready."""
    case = Path(args.case)
    state = _read_state(case)
    rows = _ledger_rows(case)
    limits = _limit_rows(case)
    kind = state.get("kind") or "incident"
    problems: list[str] = []
    warnings: list[str] = []

    if not rows:
        problems.append(
            "no scope rows — nothing about this request was checked against the system"
            if kind == "cr"
            else "no evidence rows — nothing was investigated"
        )

    observed = [r for r in rows if r["confidence"] == "observed"]
    if not observed:
        problems.append("no `observed` rows — every claim rests on hearsay or inference")

    # Backstop for ledgers written before `add` enforced this, and for anything
    # that appends to ledger.jsonl without going through this file.
    unbacked = [r["id"] for r in observed if not r.get("raw")]
    if unbacked:
        problems.append(
            f"observed row(s) with no stored tool output: {', '.join(unbacked)} — "
            "an `observed` claim with no artifact is an assertion, not an observation"
        )

    # You did not prove a PRD bug with a DEV read.
    target = (state.get("system") or "").strip()
    if target:
        off = {r["system"] for r in observed if r["system"] and r["system"] != target}
        if off and not any(r["system"] == target for r in observed):
            problems.append(
                f"no observed evidence from {target} (only from {', '.join(sorted(off))})"
            )

    if state.get("confidence") == "confirmed" and not observed:
        problems.append("root cause marked `confirmed` without a single observed row")

    if kind == "cr":
        cr_problems, cr_warnings = _check_cr(state, rows)
        problems += cr_problems
        warnings += cr_warnings

    # Not a gate — a gate here would be satisfied with a junk row. But a report
    # that names nothing it could not check is claiming total coverage of a
    # system this tooling can only partly see.
    if not limits:
        warnings.append(
            "nothing recorded in limits.jsonl — the report will imply everything was "
            "checked. `case.py limit` what ADT could not see (job logs, spool, auth "
            "traces, IDoc/qRFC, workflow, output determination, SAP Notes)"
        )
    blocking = [r["id"] for r in limits if r.get("blocking")]

    for p in problems:
        print(f"FAIL  {p}")
    for w in warnings:
        print(f"WARN  {w}")
    if not problems:
        summary = f"PASS  {len(rows)} evidence row(s), {len(observed)} observed"
        if limits:
            summary += f", {len(limits)} recorded limit(s)"
        print(summary)
        if blocking:
            print(
                f"      ⚠ {', '.join(blocking)} marked blocking — this is an Interim "
                "Findings Note, not a root-cause report"
            )
    return 1 if problems else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("new", help="create a case folder")
    p.add_argument("--ticket", required=True)
    p.add_argument("--title", required=True)
    p.add_argument("--system", required=True, help="e.g. PRD/100")
    p.add_argument("--kind", default="incident", choices=list(KIND))
    p.add_argument("--consultant", default="")
    p.add_argument("--severity", default="P3", choices=["P1", "P2", "P3", "P4"])
    p.add_argument("--language", default="tr", help="deliverable language, not input language")
    p.add_argument("--dir", default="support")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_new)

    p = sub.add_parser("scope", help="record a per-case data-scope authorisation")
    p.add_argument("--case", required=True)
    p.add_argument("--granted-by", required=True, dest="granted_by")
    p.add_argument("--tables", required=True, help="comma-separated")
    p.add_argument("--purpose", default="")
    p.set_defaults(func=cmd_scope)

    p = sub.add_parser("add", help="append an evidence row")
    p.add_argument("--case", required=True)
    p.add_argument("--source", required=True, help="tool or origin, e.g. adt_revisions")
    p.add_argument("--system", required=True)
    p.add_argument("--claim", required=True, help="what this evidence establishes, one line")
    p.add_argument("--confidence", required=True, choices=list(CONFIDENCE))
    p.add_argument("--query", default="")
    p.add_argument("--tag", default="", help=f"comma-separated, e.g. {TAG_REUSE},{TAG_SCOPE}")
    p.add_argument("--excerpt", default="")
    p.add_argument(
        "--raw", default="",
        help="file holding the tool output; copied into evidence/raw/ and hashed. "
             "REQUIRED when --confidence observed.",
    )
    p.set_defaults(func=cmd_add)

    p = sub.add_parser("limit", help="record something this analysis could NOT check")
    p.add_argument("--case", required=True)
    p.add_argument("--what", required=True, help="what could not be checked, one line")
    p.add_argument("--why", required=True, help="why not — not in ADT, no access, no repro")
    p.add_argument("--where", default="", help="transaction, log or team that can check it")
    p.add_argument(
        "--blocking", action="store_true",
        help="the root cause cannot be established without this — forces an Interim Note",
    )
    p.set_defaults(func=cmd_limit)

    p = sub.add_parser("set", help="update scalar case state (never the ledger)")
    p.add_argument("--case", required=True)
    p.add_argument("--phase", choices=["intake", "scope", "build", "handover", "closed"])
    p.add_argument("--classification")
    p.add_argument("--confidence", choices=["confirmed", "probable", "suspected", "none"])
    p.add_argument("--estimate-days", type=float, dest="estimate_days")
    p.add_argument("--actual-days", type=float, dest="actual_days")
    p.add_argument(
        "--decision", choices=["build", "config", "reuse", "reject", "incident"],
        help="cr only — what the scope study concluded",
    )
    p.set_defaults(func=cmd_set)

    p = sub.add_parser("list", help="print the ledger as a markdown table")
    p.add_argument("--case", required=True)
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("check", help="gate the case for report readiness")
    p.add_argument("--case", required=True)
    p.set_defaults(func=cmd_check)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
