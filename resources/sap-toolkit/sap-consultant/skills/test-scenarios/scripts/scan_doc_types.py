#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""What document types does this system ACTUALLY use, and how often?

    py scan_doc_types.py --module MM --cwd "C:\\project"
    py scan_doc_types.py --module SD --language T --json types.json

The evidence a test plan is built on. Test scenarios written from a module name
alone cover the document types someone remembered; scenarios written from this
cover the ones the system has. The difference shows up as the order type nobody
tested because nobody knew it was in use.

One row per document type, with its customising description and its record
count, ordered by count. The agent turns those rows into scenarios -- see the
skill's SKILL.md; that half is judgement and does not belong in a script.

REQUIRES ADT_RO_ALLOW_SQL=true. That gate is a per-profile decision about
letting an agent read business and personal data out of any table the SAP user
can see, and a CLI script that quietly ignored it would make the decision
meaningless wherever it was taken. conversion-consultant opens it (2026-09-04,
the team's own request); a customer-production workspace pins it shut and
nothing here can override that.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# Measured against NS4 on 2026-09-04, not recalled. Every table, field, text
# table and join key below was probed before it was written down.
#
# The join key is the part that bites. A description table is keyed by LANGUAGE
# plus the type code -- and for MM, plus the document CATEGORY (BSTYP) as well.
# Joining T161T on BSART alone turned 13 purchase-order types into 18 rows on
# NS4, because one code carries a different description per category. With the
# full key it is 14, and that fourteenth row is real: RQ appears as an internal
# source request (13 documents) and an internal quotation (14), which are
# different things to test. The raw GROUP BY hides that distinction; the wrong
# join invents rows that are not there.
MODULES = {
    "MM": [
        {"what": "Satınalma talebi", "table": "EBAN", "code": "BSART",
         "text_table": "T161T", "text": "BATXT", "extra_key": "BSTYP"},
        {"what": "Satınalma siparişi", "table": "EKKO", "code": "BSART",
         "text_table": "T161T", "text": "BATXT", "extra_key": "BSTYP"},
    ],
    "SD": [
        {"what": "Satış belgesi", "table": "VBAK", "code": "AUART",
         "text_table": "TVAKT", "text": "BEZEI", "extra_key": None},
        {"what": "Teslimat", "table": "LIKP", "code": "LFART",
         "text_table": "TVLKT", "text": "VTEXT", "extra_key": None},
        {"what": "Fatura", "table": "VBRK", "code": "FKART",
         "text_table": "TVFKT", "text": "VTEXT", "extra_key": None},
    ],
    "FI": [
        {"what": "Muhasebe belgesi", "table": "BKPF", "code": "BLART",
         "text_table": "T003T", "text": "LTEXT", "extra_key": None},
    ],
}


def build_query(spec: dict, language: str) -> str:
    """ABAP Open SQL, not ANSI. Two differences that cost a round trip each.

    ORDER BY takes DESCENDING, not DESC ('"DESC" is not allowed here'), and a
    join uses the tilde form `a~field`; `a.field` with an alias answers "Only
    one SELECT statement is allowed", which reads like a parser giving up rather
    than the syntax note it is.
    """
    d, t = spec["table"], spec["text_table"]
    on = f"d~{spec['code']} = t~{spec['code']}"
    if spec["extra_key"]:
        on += f" AND d~{spec['extra_key']} = t~{spec['extra_key']}"
    return (f"SELECT d~{spec['code']}, t~{spec['text']}, COUNT(*) AS cnt "
            f"FROM {d} AS d INNER JOIN {t} AS t ON {on} "
            f"WHERE t~spras = '{language}' "
            f"GROUP BY d~{spec['code']}, t~{spec['text']} "
            f"ORDER BY cnt DESCENDING")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--module", required=True, choices=sorted(MODULES),
                    help="SAP module to scan")
    ap.add_argument("--language", default="T",
                    help="description language key (default T = Turkish; E for English)")
    ap.add_argument("--max-types", type=int, default=200,
                    help="row cap per document kind (default 200)")
    ap.add_argument("--json", help="also write the result to this JSON file")
    ap.add_argument("--cwd", help="project directory holding .conn_adt")
    args = ap.parse_args()

    import os
    if (os.getenv("ADT_RO_ALLOW_SQL", "").strip().lower() != "true"):
        print("[FAIL] ADT_RO_ALLOW_SQL is not 'true'.")
        print("[INFO] This scan reads business tables. The gate is a decision your")
        print("       profile takes, not one this script may take for it.")
        print("       conversion-consultant sets it; other roles do not.")
        return 2

    engine = Path(__file__).resolve().parents[2] / "sap-adt" / "scripts"
    if engine.is_dir():
        sys.path.insert(0, str(engine))
    try:
        from sap_adt_lib import set_explicit_working_dir
        from sap_client import SAPClient
    except ImportError as exc:
        print("[FAIL] Could not import the sap-adt engine.")
        print(f"[ERROR] {type(exc).__name__}: {exc}")
        print(f"[INFO] Expected it at: {engine}")
        return 1

    if args.cwd:
        set_explicit_working_dir(args.cwd)
    try:
        client = SAPClient()
    except Exception as exc:
        print("[FAIL] Could not establish the SAP connection.")
        print(f"[ERROR] {type(exc).__name__}: {exc}")
        return 1

    out = {"module": args.module, "language": args.language, "kinds": []}
    for spec in MODULES[args.module]:
        query = build_query(spec, args.language)
        try:
            res = client.run_sql_query(query, args.max_types)
        except Exception as exc:
            print(f"[WARN] {spec['what']} ({spec['table']}): {exc}")
            out["kinds"].append({**spec, "error": str(exc)[:300], "types": []})
            continue
        rows = (res or {}).get("data") or []
        types = [{"code": str(r[0]).strip(),
                  "text": str(r[1]).strip(),
                  "count": int(str(r[2]).strip() or 0)} for r in rows if len(r) >= 3]
        out["kinds"].append({"what": spec["what"], "table": spec["table"],
                             "code_field": spec["code"], "types": types})
        print(f"\n{spec['what']}  ({spec['table']}.{spec['code']})  "
              f"{len(types)} document type(s) in use")
        for t in types:
            print(f"   {t['code']:<8} {t['text'][:38]:<40} {t['count']:>8,}")

    total = sum(len(k.get("types") or []) for k in out["kinds"])
    print(f"\n{total} document type(s) across {len(out['kinds'])} document kind(s).")
    print("That number is the FLOOR for scenario count: one scenario per type, "
          "at minimum.")

    if args.json:
        Path(args.json).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n",
                                   encoding="utf-8")
        print(f"written: {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
