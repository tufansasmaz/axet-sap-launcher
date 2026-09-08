#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Join the scan to the results and answer: which document types went untested?

    py coverage.py --scan types.json --results sonuclar.csv --out kapsam.md

Deliberately narrow. The kit already turns a table into a document -- office-docx,
office-pdf, office-excel-report all take it from here -- so this writes Markdown
and stops. What none of them can do is the join: the scan knows which document
types the system USES, the results file knows which ones were TESTED, and the
gap between the two is the only number in a test report that is hard to argue
with. "34 of 41 scenarios passed" says nothing about the seven order types
nobody wrote a scenario for.

RESULTS FILE (CSV, UTF-8, header row required). Append to it as you test; it is
a file the consultant owns, not a tool's private state:

    tc_id,module,doc_kind,type_code,scenario,expected,actual,status,document_no,tested_by,tested_on,note

`status` is PASS, FAIL or BLOCKED. `type_code` must match the code the scan
reported (NB, TA, LF...) -- that is the join key, and a scenario with an empty
one counts as tested-nothing.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

STATUSES = ("PASS", "FAIL", "BLOCKED")


def read_results(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    missing = [c for c in ("type_code", "status") if rows and c not in rows[0]]
    if missing:
        raise SystemExit(
            f"ERROR: {path} has no {', '.join(missing)} column.\n"
            f"       Header must be: tc_id,module,doc_kind,type_code,scenario,"
            f"expected,actual,status,document_no,tested_by,tested_on,note")
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--scan", required=True, help="JSON from scan_doc_types.py --json")
    ap.add_argument("--results", help="results CSV; omit to report scope only")
    ap.add_argument("--out", help="write Markdown here (default: stdout)")
    args = ap.parse_args()

    scan = json.loads(Path(args.scan).read_text(encoding="utf-8"))
    results = read_results(Path(args.results)) if args.results else []

    # Keyed by (doc_kind, type_code), not by code alone. The same code lives in
    # more than one document kind -- on NS4, MM's `NB` is both a purchase
    # requisition type and a purchase order type -- so a code-only join credited
    # one scenario to both and reported coverage that was not there.
    #
    # doc_kind is free text a human fills in, so a blank or unrecognised one
    # falls back to the code alone rather than silently counting as untested.
    # The fallback is reported at the end: a percentage computed two different
    # ways in the same file would be worse than the bug.
    kind_names = {k["what"] for k in scan.get("kinds", [])}
    by_key: dict[tuple[str, str], Counter] = defaultdict(Counter)
    loose: dict[str, Counter] = defaultdict(Counter)
    loose_rows = 0
    for r in results:
        code = (r.get("type_code") or "").strip()
        kind = (r.get("doc_kind") or "").strip()
        st = (r.get("status") or "").strip().upper()
        if not code:
            continue
        st = st if st in STATUSES else "?"
        if kind in kind_names:
            by_key[(kind, code)][st] += 1
        else:
            loose[code][st] += 1
            loose_rows += 1

    def counter_for(kind: str, code: str) -> Counter | None:
        c = Counter(by_key.get((kind, code)) or {})
        c.update(loose.get(code) or {})
        return c or None

    by_code = {code: Counter() for code in
               {k for _, k in by_key} | set(loose)}
    for (_, code), c in by_key.items():
        by_code[code].update(c)
    for code, c in loose.items():
        by_code[code].update(c)

    lines = [f"# Test kapsamı — {scan['module']} modülü", ""]
    total_types = tested_types = 0

    for kind in scan.get("kinds", []):
        types = kind.get("types") or []
        if not types:
            continue
        lines += [f"## {kind['what']} ({kind['table']}.{kind['code_field']})", "",
                  "| Belge türü | Açıklama | Kayıt | Test | Sonuç |",
                  "|---|---|---:|---|---|"]
        for t in types:
            total_types += 1
            c = counter_for(kind["what"], t["code"])
            if c:
                tested_types += 1
                verdict = ("FAIL" if c["FAIL"] else
                           "BLOCKED" if c["BLOCKED"] and not c["PASS"] else "PASS")
                cell = f"{sum(c.values())} senaryo"
            else:
                verdict, cell = "**TEST EDİLMEDİ**", "—"
            lines.append(f"| `{t['code']}` | {t['text']} | {t['count']:,} | {cell} | {verdict} |")
        lines.append("")

    # The headline, and the reason this script exists. Coverage over TYPES, not
    # over scenarios: a hundred scenarios against one order type is not coverage.
    pct = (100 * tested_types / total_types) if total_types else 0
    untested = total_types - tested_types
    lines[1:1] = [
        f"Sistemde kullanılan **{total_types} belge türü** var. "
        f"**{tested_types}** tanesi için senaryo çalıştırıldı (%{pct:.0f}).",
        "",
        (f"**{untested} belge türü hiç test edilmedi** — aşağıda "
         f"\"TEST EDİLMEDİ\" satırları." if untested else
         "Her belge türü en az bir senaryoyla karşılandı."),
        "",
        f"Kaynak: `{args.scan}`" + (f" + `{args.results}`" if args.results else
                                    " (henüz sonuç dosyası yok — yalnızca kapsam)"),
        "",
    ]

    if results:
        st = Counter((r.get("status") or "?").strip().upper() for r in results)
        lines += ["## Senaryo sonuçları", "",
                  f"- PASS: {st['PASS']}", f"- FAIL: {st['FAIL']}",
                  f"- BLOCKED: {st['BLOCKED']}", ""]
        unknown = {k: v for k, v in st.items() if k not in STATUSES}
        if unknown:
            lines += [f"- Tanınmayan durum: {unknown} — PASS/FAIL/BLOCKED bekleniyor",
                      ""]
        if loose_rows:
            lines += [f"> {loose_rows} satırda `doc_kind` boş ya da taramadaki bir "
                      f"belge türüyle eşleşmiyor. O satırlar yalnızca `type_code` "
                      f"ile eşleştirildi, yani aynı kod birden fazla belge türünde "
                      f"varsa hepsine sayıldı. `doc_kind` sütununu taramanın "
                      f"yazdığı adla doldurmak bunu keser: "
                      f"{', '.join(sorted(kind_names))}.", ""]
        orphan = sorted(set(by_code) - {t["code"] for k in scan.get("kinds", [])
                                        for t in (k.get("types") or [])})
        if orphan:
            # Not a formatting complaint: it means the results claim coverage of a
            # type the system does not use, so the percentage above is optimistic.
            lines += [f"> Sonuç dosyasında taramada olmayan belge türü var: "
                      f"{', '.join('`'+o+'`' for o in orphan)}. Yazım hatası ya da "
                      f"başka bir sistemden gelmiş olabilir; kapsam yüzdesi bunları "
                      f"saymıyor.", ""]

    text = "\n".join(lines)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"written: {args.out}")
        print(f"{tested_types}/{total_types} document type(s) covered ({pct:.0f}%)")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
