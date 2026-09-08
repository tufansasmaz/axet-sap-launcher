#!/usr/bin/env python3
"""Quality-gate run + scoreboard for `abap-code-checker`.

Sibling of case.py. Same doctrine, different shape: a code review is not an
open-ended investigation, it is a FIXED set of gates that each end in a
verdict. So the ledger here is keyed by gate, and the primary output is a
scoreboard — because "standardise code quality" fails the moment two
consultants render the result two different ways.

    py quality.py new    --object ZCL_SD_DELIVERY_ADDR --type class --system DEV/100
    py quality.py gate   --run quality/ZCL_... --gate atc --status pass --raw .tmp/atc.txt
    py quality.py finding --run quality/ZCL_... --severity major --gate atc --where "..." --what "..."
    py quality.py limit  --run quality/ZCL_... --what "..." --why "..." --where "..."
    py quality.py board  --run quality/ZCL_...      # the deliverable table
    py quality.py check  --run quality/ZCL_...      # exit 1 = do not release

Design rules that must not regress:

  * A gate that was never run is NOT a pass. `not-run` is a distinct status and
    it renders in the scoreboard as its own row. The failure mode this exists to
    stop is a green board produced by skipping four of six checks.

  * `--status pass` on a MACHINE gate (syntax / atc / unit) REQUIRES --raw. The
    same load-bearing rule as case.py's `observed`: without it the row records
    that the model said a check passed, not that a check ran.

  * `--gate unit --tests 0` can never be `pass`. It is coerced to `warn`.
    "passed 0, failed 0" is the most dangerous green in the ABAP toolchain — it
    reads as a pass to every junior who has ever seen it, and it means there are
    no tests at all.

  * An ATC run on variant DEFAULT is flagged. DEFAULT is SAP's variant, not the
    customer's; a clean DEFAULT run says nothing about the customer's rules.

  * Append-only. Nothing here rewrites a line.
  * All I/O pins encoding="utf-8" — Windows cp1252 mangles Turkish silently.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")  # type: ignore[union-attr]
    except (AttributeError, OSError):  # pragma: no cover
        pass

# The six gates, in board order. Three are machine-run and reproducible; three
# are judgment, read off source that a tool returned. Both kinds are recorded
# the same way — the difference is that the machine ones cannot be passed
# without an artifact.
GATES = {
    "syntax": ("Sözdizimi", "adt_syntax_check", True),
    "atc": ("ATC", "adt_atc_check", True),
    "unit": ("Birim testi", "adt_unit_test", True),
    "cleancore": ("Clean Core", "adt_get_source + clean-core", False),
    "conventions": ("Standartlar", "adt_get_source", False),
    "impact": ("Etki alanı", "adt_where_used", False),
}
MACHINE_GATES = {k for k, v in GATES.items() if v[2]}

STATUS = ("pass", "warn", "fail", "not-run")
SEVERITY = ("blocker", "major", "minor")

# ATC priority → our severity. Recorded explicitly so nobody quietly downgrades
# a priority-1 finding into a "minor" to get a green board.
ATC_PRIORITY = {1: "blocker", 2: "major", 3: "minor", 4: "minor"}

MARK = {"pass": "✅ GEÇTİ", "warn": "⚠️ UYARI", "fail": "❌ KALDI", "not-run": "⬜ ÇALIŞMADI"}

SAFE_ID = re.compile(r"[^A-Za-z0-9._-]+")


def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _slug(text: str) -> str:
    return SAFE_ID.sub("-", text).strip("-") or "run"


def _read_state(run: Path) -> dict:
    return json.loads((run / "run.json").read_text(encoding="utf-8"))


def _write_state(run: Path, state: dict) -> None:
    (run / "run.json").write_text(
        json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def _rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def _append(path: Path, row: dict) -> None:
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def _store_raw(run: Path, raw: str, name: str) -> tuple[str | None, str | None]:
    """Copy a tool artifact into the run and hash it. Returns (relpath, sha256)."""
    if not raw:
        return None, None
    src = Path(raw)
    if not src.exists():
        print(f"--raw not found: {src}", file=sys.stderr)
        raise SystemExit(2)
    blob = src.read_bytes()
    if not blob.strip():
        print(
            f"--raw is empty: {src}\n"
            "  An empty artifact proves nothing. If the check returned no findings, write\n"
            "  the actual response — including the query and 'no findings' — into the file.",
            file=sys.stderr,
        )
        raise SystemExit(2)
    dest = run / "raw" / f"{name}{src.suffix or '.txt'}"
    dest.write_bytes(blob)
    return str(dest.relative_to(run)).replace("\\", "/"), hashlib.sha256(blob).hexdigest()


def cmd_new(args: argparse.Namespace) -> int:
    run = Path(args.dir) / _slug(args.object)
    if run.exists() and not args.force:
        print(f"refusing to overwrite existing run: {run}", file=sys.stderr)
        return 2
    (run / "raw").mkdir(parents=True, exist_ok=True)
    _write_state(
        run,
        {
            "object": args.object,
            "object_type": args.type,
            "system": args.system,
            "transport": args.transport,
            "package": args.package,
            "scope": args.scope,  # object | transport | package
            "reviewer": args.reviewer,
            "opened": _utcnow(),
            "verdict": None,  # set by `check`
        },
    )
    for f in ("gates.jsonl", "findings.jsonl", "limits.jsonl"):
        (run / f).touch()
    print(run)
    return 0


def cmd_gate(args: argparse.Namespace) -> int:
    run = Path(args.run)
    if args.gate not in GATES:
        print(f"--gate must be one of {tuple(GATES)}", file=sys.stderr)
        return 2
    if args.status not in STATUS:
        print(f"--status must be one of {STATUS}", file=sys.stderr)
        return 2

    status, notes = args.status, []

    # "passed 0, failed 0" is a pass-shaped result that means no tests exist.
    # Coerce it before it ever reaches a board a human will read as green.
    if args.gate == "unit" and args.tests is not None and args.tests == 0:
        if status == "pass":
            notes.append(
                "0 test çalıştı — bu bir GEÇTİ değil. Nesnenin birim testi yok."
            )
            status = "warn"

    # A machine gate cannot be passed on the model's word.
    if args.gate in MACHINE_GATES and status == "pass" and not args.raw:
        print(
            f"--gate {args.gate} --status pass requires --raw <file> holding the tool output.\n"
            "  Write the adt_* result to a file and pass it here; it is copied and hashed.\n"
            "  If you did not run the check, the status is `not-run`, not `pass`.",
            file=sys.stderr,
        )
        return 2

    # SAP's DEFAULT variant is not the customer's variant. A clean DEFAULT run
    # is evidence about SAP's rules, not about the ones this customer agreed to.
    if args.gate == "atc":
        variant = (args.variant or "").strip()
        if not variant or variant.casefold() == "default":
            notes.append(
                "ATC varyantı DEFAULT — müşterinin kendi varyantı değil. "
                "Temiz sonuç, müşteri kurallarına uygunluğu kanıtlamaz."
            )
            if status == "pass":
                status = "warn"

    rel, sha = _store_raw(run, args.raw, f"gate-{args.gate}")
    _append(
        run / "gates.jsonl",
        {
            "ts": _utcnow(),
            "gate": args.gate,
            "status": status,
            "detail": args.detail,
            "variant": args.variant,
            "tests": args.tests,
            "notes": notes,
            "raw": rel,
            "sha256": sha,
        },
    )
    print(f"{args.gate}: {status}" + (f"  ({args.status} → {status})" if status != args.status else ""))
    for n in notes:
        print(f"  ⚑ {n}")
    return 0


def cmd_finding(args: argparse.Namespace) -> int:
    run = Path(args.run)
    if args.severity not in SEVERITY:
        print(f"--severity must be one of {SEVERITY}", file=sys.stderr)
        return 2
    rows = _rows(run / "findings.jsonl")
    row = {
        "id": f"F{len(rows) + 1}",
        "ts": _utcnow(),
        "gate": args.gate,
        "severity": args.severity,
        "rule": args.rule,
        "where": args.where,
        "what": args.what,
        "fix": args.fix,
        "atc_priority": args.atc_priority,
    }
    # If it came from ATC with a priority, the mapping is fixed. Silently
    # accepting a hand-typed severity that contradicts it is how a priority-1
    # becomes a "minor" on the way to a green board.
    if args.atc_priority is not None:
        expected = ATC_PRIORITY.get(args.atc_priority)
        if expected and expected != args.severity:
            print(
                f"ATC priority {args.atc_priority} maps to `{expected}`, not `{args.severity}`.\n"
                "  Record the mapped severity. If you disagree, say why in --what — do not\n"
                "  change the number.",
                file=sys.stderr,
            )
            return 2
    _append(run / "findings.jsonl", row)
    print(row["id"])
    return 0


def cmd_limit(args: argparse.Namespace) -> int:
    """What this review could NOT check. Same role as case.py's limits.

    A code review reads static text. It cannot see runtime behaviour at real
    data volume, whether a green test actually asserts anything, whether the
    authorisation concept is right for this customer, or what a dynamic call
    does. Naming those is what stops a passing board being read as "safe".
    """
    run = Path(args.run)
    rows = _rows(run / "limits.jsonl")
    row = {
        "id": f"L{len(rows) + 1}",
        "ts": _utcnow(),
        "what": args.what,
        "why": args.why,
        "where": args.where,
    }
    _append(run / "limits.jsonl", row)
    print(row["id"])
    return 0


def _gate_state(run: Path) -> dict[str, dict]:
    """Last recorded row per gate; gates never run are `not-run`."""
    latest: dict[str, dict] = {}
    for r in _rows(run / "gates.jsonl"):
        latest[r["gate"]] = r
    return {
        g: latest.get(g, {"gate": g, "status": "not-run", "detail": "", "notes": []})
        for g in GATES
    }


def _verdict(gates: dict[str, dict], findings: list[dict]) -> tuple[str, list[str]]:
    reasons = []
    failed = [g for g, r in gates.items() if r["status"] == "fail"]
    blockers = [f for f in findings if f["severity"] == "blocker"]
    notrun = [g for g, r in gates.items() if r["status"] == "not-run"]
    if failed:
        reasons.append(f"{len(failed)} kapı KALDI: {', '.join(failed)}")
    if blockers:
        reasons.append(f"{len(blockers)} blocker bulgu: {', '.join(f['id'] for f in blockers)}")
    if failed or blockers:
        return "RELEASE EDİLEMEZ", reasons
    if notrun:
        reasons.append(f"{len(notrun)} kapı çalışmadı: {', '.join(notrun)}")
        return "EKSİK — KARAR VERİLEMEZ", reasons
    warns = [g for g, r in gates.items() if r["status"] == "warn"]
    if warns:
        reasons.append(f"{len(warns)} kapı uyarı verdi: {', '.join(warns)}")
        return "ŞARTLI — UYARILAR OKUNMALI", reasons
    return "RELEASE EDİLEBİLİR", reasons


def cmd_board(args: argparse.Namespace) -> int:
    """The deliverable. Scoreboard FIRST, always — findings are detail."""
    run = Path(args.run)
    state = _read_state(run)
    gates = _gate_state(run)
    findings = _rows(run / "findings.jsonl")
    limits = _rows(run / "limits.jsonl")
    verdict, reasons = _verdict(gates, findings)

    print(f"## KOD KALİTE KARNESİ — {state['object']}\n")
    print(
        f"{state['system']} · {state.get('object_type') or ''} · "
        f"{(state.get('transport') or state.get('package') or '')} · {state.get('reviewer') or ''}\n"
    )
    print("| # | Kapı | Sonuç | Kaynak | Not |")
    print("|---|---|---|---|---|")
    for i, (key, (label, source, _)) in enumerate(GATES.items(), start=1):
        row = gates[key]
        note = (row.get("detail") or "").replace("|", "\\|")
        for n in row.get("notes") or []:
            note = (note + " · " if note else "") + n.replace("|", "\\|")
        print(f"| G{i} | {label} | {MARK[row['status']]} | `{source}` | {note} |")

    print(f"\n**SONUÇ: {verdict}**")
    for r in reasons:
        print(f"- {r}")

    if findings:
        print("\n### Bulgular\n")
        print("| ID | Önem | Nerede | Ne | Öneri |")
        print("|---|---|---|---|---|")
        order = {"blocker": 0, "major": 1, "minor": 2}
        for f in sorted(findings, key=lambda x: order[x["severity"]]):
            cells = [
                f["id"],
                {"blocker": "🔴 blocker", "major": "🟠 major", "minor": "🟡 minor"}[f["severity"]],
                (f.get("where") or "").replace("|", "\\|"),
                (f.get("what") or "").replace("|", "\\|"),
                (f.get("fix") or "").replace("|", "\\|"),
            ]
            print("| " + " | ".join(cells) + " |")

    print("\n### NELERİ KONTROL EDEMEDİM\n")
    if limits:
        print("| ID | Kontrol edilemedi | Neden | Nereye bakılmalı |")
        print("|---|---|---|---|")
        for r in limits:
            cells = [
                r["id"],
                (r.get("what") or "").replace("|", "\\|"),
                (r.get("why") or "").replace("|", "\\|"),
                (r.get("where") or "").replace("|", "\\|"),
            ]
            print("| " + " | ".join(cells) + " |")
    else:
        print("_(hiçbir sınır kaydedilmedi — bu, her şeyin kontrol edildiği anlamına gelmez)_")
    return 0


def cmd_check(args: argparse.Namespace) -> int:
    run = Path(args.run)
    state = _read_state(run)
    gates = _gate_state(run)
    findings = _rows(run / "findings.jsonl")
    limits = _rows(run / "limits.jsonl")
    verdict, reasons = _verdict(gates, findings)

    problems, warnings = [], []

    # A machine gate marked pass with no artifact — backstop for anything that
    # appends to gates.jsonl without going through `gate`.
    for g in MACHINE_GATES:
        row = gates[g]
        if row["status"] == "pass" and not row.get("raw"):
            problems.append(f"gate `{g}` passed with no stored tool output")

    if not limits:
        warnings.append(
            "nothing in limits.jsonl — the board will imply the review saw everything. "
            "`quality.py limit` what static review cannot reach (runtime volume, whether "
            "the green test asserts anything, dynamic calls, the authorisation concept)"
        )

    for g, r in gates.items():
        if r["status"] == "not-run":
            warnings.append(f"gate `{g}` never ran — it renders as ⬜, never as a pass")

    state["verdict"] = verdict
    _write_state(run, state)

    for p in problems:
        print(f"FAIL  {p}")
    for w in warnings:
        print(f"WARN  {w}")
    print(f"\n{verdict}  — {state['object']} on {state['system']}")
    for r in reasons:
        print(f"      {r}")

    blocked = verdict in ("RELEASE EDİLEMEZ", "EKSİK — KARAR VERİLEMEZ")
    return 1 if (problems or blocked) else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("new", help="open a quality run")
    p.add_argument("--object", required=True)
    p.add_argument("--type", default="class", help="class, program, interface, table, ...")
    p.add_argument("--system", required=True, help="e.g. DEV/100")
    p.add_argument("--scope", default="object", choices=["object", "transport", "package"])
    p.add_argument("--transport", default="")
    p.add_argument("--package", default="")
    p.add_argument("--reviewer", default="")
    p.add_argument("--dir", default="quality")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_new)

    p = sub.add_parser("gate", help="record a gate result")
    p.add_argument("--run", required=True)
    p.add_argument("--gate", required=True, choices=list(GATES))
    p.add_argument("--status", required=True, choices=list(STATUS))
    p.add_argument("--detail", default="", help="one line, renders in the board")
    p.add_argument("--variant", default="", help="atc only — the ATC variant actually used")
    p.add_argument("--tests", type=int, default=None, help="unit only — how many tests RAN")
    p.add_argument("--raw", default="", help="file holding the tool output; REQUIRED to pass a machine gate")
    p.set_defaults(func=cmd_gate)

    p = sub.add_parser("finding", help="record one finding")
    p.add_argument("--run", required=True)
    p.add_argument("--gate", required=True, choices=list(GATES))
    p.add_argument("--severity", required=True, choices=list(SEVERITY))
    p.add_argument("--where", required=True, help="object → method : line")
    p.add_argument("--what", required=True, help="what is wrong, one line")
    p.add_argument("--fix", default="", help="the concrete change, or a diff reference")
    p.add_argument("--rule", default="", help="ATC check id or NTT rule name")
    p.add_argument("--atc-priority", type=int, default=None, dest="atc_priority")
    p.set_defaults(func=cmd_finding)

    p = sub.add_parser("limit", help="record something this review could NOT check")
    p.add_argument("--run", required=True)
    p.add_argument("--what", required=True)
    p.add_argument("--why", required=True)
    p.add_argument("--where", default="")
    p.set_defaults(func=cmd_limit)

    p = sub.add_parser("board", help="print the scoreboard deliverable")
    p.add_argument("--run", required=True)
    p.set_defaults(func=cmd_board)

    p = sub.add_parser("check", help="gate the run; exit 1 = do not release")
    p.add_argument("--run", required=True)
    p.set_defaults(func=cmd_check)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
