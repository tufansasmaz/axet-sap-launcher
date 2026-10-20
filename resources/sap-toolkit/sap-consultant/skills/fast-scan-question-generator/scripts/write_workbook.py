#!/usr/bin/env python3
"""Write the Fast Scan workbooks from the validated merged question set.

Two files, because the question set has two readers:

  <name>.xlsx               for the CUSTOMER: the question, why it is asked, what
                            answer is expected, and two columns to fill in
                            (answer, status). Nothing about where a question came
                            from: `Reference Project` and `Source Project` can name
                            another customer's project, and `Notes` carries NTT's
                            evidence trail. Those must not travel to the customer.
  <name> - NTT ic.xlsx      for the CONSULTANT: all 19 columns of wizard §12, the
                            same answer columns, and the Source Traceability sheet.

Both use office-tools/lib/xlsx_theme.py, so every Fast Scan looks the same and
looks like the rest of the kit's documents. The input is the merge gate's single
source of truth (`fast_scan_questions_merged.txt`, JSON Lines, wizard §11.5):
nothing is reworded here -- this is serialisation, not generation.

Usage:
  py write_workbook.py --merged <fast_scan_questions_merged.txt> --out-dir <dir>
       --name "<Musteri> - <Kapsam> Fast Scan Soru Seti" --customer "..." --project "..."
       [--lang tr|en|bilingual] [--trace <traceability.json>] [--version v1]

--trace: a JSON list of objects (one per Source Traceability row, keys are the
column headers of wizard §12 Sheet 2). Omitted: the internal file says so.
Exit codes: 0 ok, 2 usage / input invalid.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# office-tools/lib, beside this plugin in the catalog (cross_plugin_deps declares it)
sys.path.insert(0, str(HERE.parents[3] / "office-tools" / "lib"))
# NTT Studio uyarlamasi: kurulu agacta skill .axet-code/skills/<ad>/ altinda,
# office-tools/lib ise .axet-code/lib'e kuruluyor (SHARED_ASSETS); yukaridaki
# yol orada yok. Bu satir o lib'i buluyor.
sys.path.insert(0, str(Path(__file__).resolve().parent.joinpath("..", "..", "..", "lib")))
import xlsx_theme as xt  # noqa: E402

BASE = ["Question ID", "Industry", "Reference Project", "SAP Module", "Business Process Area",
        "Question Category", "Fast Scan Question", "Purpose", "Expected Customer Input",
        "Related SAP Best Practice", "Potential Config Area", "Workshop Required",
        "Workshop Topic", "Key Attention Points", "Source Type", "Source Project",
        "Source Document Link", "Priority", "Notes"]
ANSWER, STATUS = "Customer Answer", "Status"

TR = {"Question ID": "Soru No", "Industry": "Sektör", "Reference Project": "Referans Proje",
      "SAP Module": "SAP Modülü", "Business Process Area": "Süreç Alanı",
      "Question Category": "Soru Kategorisi", "Fast Scan Question": "Soru",
      "Purpose": "Amaç", "Expected Customer Input": "Beklenen Bilgi",
      "Related SAP Best Practice": "İlgili SAP Best Practice",
      "Potential Config Area": "Olası Konfigürasyon Alanı",
      "Workshop Required": "Workshop Gerekli", "Workshop Topic": "Workshop Konusu",
      "Key Attention Points": "Dikkat Noktaları", "Source Type": "Kaynak Türü",
      "Source Project": "Kaynak Proje", "Source Document Link": "Kaynak Doküman",
      "Priority": "Öncelik", "Notes": "Notlar", ANSWER: "Müşteri Cevabı", STATUS: "Durum"}
STATUS_CHOICES = {"tr": ["Açık", "Cevaplandı", "Workshop'ta ele alınacak", "Kapsam dışı"],
                  "en": ["Open", "Answered", "To be discussed in workshop", "Out of scope"]}
WIDTH = {"Question ID": 10, "Industry": 16, "Reference Project": 18, "SAP Module": 10,
         "Business Process Area": 20, "Question Category": 16, "Fast Scan Question": 58,
         "Purpose": 36, "Expected Customer Input": 34, "Related SAP Best Practice": 26,
         "Potential Config Area": 26, "Workshop Required": 11, "Workshop Topic": 20,
         "Key Attention Points": 34, "Source Type": 16, "Source Project": 18,
         "Source Document Link": 24, "Priority": 11, "Notes": 44, ANSWER: 48, STATUS: 20}
# The customer's order: what is asked, why, what to give -- then the two columns
# to fill in beside it, then the planning columns.
CUSTOMER = ["Question ID", "Business Process Area", "Question Category", "Fast Scan Question",
            "Purpose", "Expected Customer Input", ANSWER, STATUS, "Priority",
            "Workshop Required", "Workshop Topic"]
INTERNAL = ["Question ID", "Business Process Area", "Question Category", "Fast Scan Question",
            "Purpose", "Expected Customer Input", ANSWER, STATUS, "Priority",
            "Workshop Required", "Workshop Topic", "SAP Module", "Industry",
            "Key Attention Points", "Potential Config Area", "Related SAP Best Practice",
            "Source Type", "Reference Project", "Source Project", "Source Document Link", "Notes"]
TEXT = {"tr": {"cust_legend": "Sarı sütunları siz doldurun: cevabınızı yazın, durumu listeden seçin. "
                              "Başlıklardaki oklarla filtreleyip sıralayabilirsiniz.",
               "int_legend": "NTT iç kullanım — müşteriye gönderilmez. Kaynak sütunları başka projelerin "
                             "adlarını taşıyabilir.",
               "sheet": "Sorular", "trace": "Kaynak İzlenebilirlik",
               "no_trace": "Kaynak izlenebilirlik verisi verilmedi (--trace).",
               "int_suffix": " - NTT ic"},
        "en": {"cust_legend": "Fill in the yellow columns: write your answer and pick a status. "
                              "Use the arrows in the header row to filter and sort.",
               "int_legend": "NTT internal — do not send to the customer. Source columns may name "
                             "other projects.",
               "sheet": "Questions", "trace": "Source Traceability",
               "no_trace": "No source traceability data was given (--trace).",
               "int_suffix": " - NTT internal"}}


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(2)


def load(path: Path) -> list[dict]:
    rows = []
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except ValueError as exc:
            die(f"{path.name} line {n} is not JSON ({exc}); the merged file must be JSON Lines")
    if not rows:
        die(f"{path.name} has no questions")
    ids = [str(r.get("Question ID", "")).strip() for r in rows]
    if any(not i for i in ids) or len(set(ids)) != len(ids):
        die("every question needs a unique Question ID")
    return rows


def headers_for(keys: list[str], rows: list[dict], lang: str) -> list[tuple[str, str]]:
    """(data key, shown header) pairs. Bilingual data carries `<col> (EN)` and
    `<col> (TR)` keys for text columns; those expand in place."""
    out = []
    for k in keys:
        pair = [f"{k} (EN)", f"{k} (TR)"]
        if lang == "bilingual" and any(p in rows[0] for p in pair):
            for p, suffix in zip(pair, (" (EN)", " (TR)")):
                out.append((p, (k if suffix == " (EN)" else TR.get(k, k)) + suffix))
        else:
            out.append((k, TR.get(k, k) if lang == "tr" else k))
    return out


def columns(keys, rows, lang, status_lang):
    cols = []
    for key, header in headers_for(keys, rows, lang):
        base = re.sub(r" \((EN|TR)\)$", "", key)
        col = {"key": key, "header": header, "width": WIDTH.get(base, 16)}
        if base in (ANSWER, STATUS):
            col["input"] = True
        if base == STATUS:
            col["choices"] = STATUS_CHOICES[status_lang]
        if base in ("Priority", "Workshop Required"):
            vals = sorted({str(r.get(key, "")).strip() for r in rows if str(r.get(key, "")).strip()})
            if 0 < len(vals) <= 6:
                col["choices"] = vals
        cols.append(col)
    return cols


def main() -> int:
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(errors="replace") if s.isatty() else s.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass
    ap = argparse.ArgumentParser(description="Write the Fast Scan workbooks.")
    ap.add_argument("--merged", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    ap.add_argument("--name", required=True)
    ap.add_argument("--customer", default="")
    ap.add_argument("--project", default="")
    ap.add_argument("--version", default="v1")
    ap.add_argument("--lang", choices=("tr", "en", "bilingual"), default="tr")
    ap.add_argument("--trace", type=Path)
    a = ap.parse_args()
    if not a.merged.is_file():
        die(f"{a.merged} does not exist")
    rows = load(a.merged)
    for r in rows:
        r.setdefault(ANSWER, "")
        r.setdefault(STATUS, "")
    missing = [k for k in ("Fast Scan Question", "Purpose", "Expected Customer Input")
               if not any(k in r or f"{k} (EN)" in r for r in rows[:1])]
    if missing:
        die(f"the merged file lacks {missing}; it is not the §12 column set")
    tl = "en" if a.lang == "en" else "tr"
    txt = TEXT[tl]
    labels = {} if tl == "tr" else {"customer": "Customer", "project": "Project",
                                    "version": "Version", "date": "Date"}
    meta = {"title": a.name, "customer": a.customer, "project": a.project,
            "version": a.version, "labels": labels}
    a.out_dir.mkdir(parents=True, exist_ok=True)

    wb = xt.new_workbook(meta)
    xt.add_table_sheet(wb, txt["sheet"], columns(CUSTOMER, rows, a.lang, tl), rows,
                       meta=meta, legend=txt["cust_legend"], table_name="FastScan")
    cust = a.out_dir / f"{a.name}.xlsx"
    wb.save(cust)

    imeta = {**meta, "title": a.name + txt["int_suffix"]}
    wb = xt.new_workbook(imeta)
    xt.add_table_sheet(wb, txt["sheet"], columns(INTERNAL, rows, a.lang, tl), rows,
                       meta=imeta, legend=txt["int_legend"], table_name="FastScanIc")
    trace = []
    if a.trace:
        trace = json.loads(a.trace.read_text(encoding="utf-8"))
        if not isinstance(trace, list):
            die("--trace must be a JSON list of row objects")
    if trace:
        keys = list(dict.fromkeys(k for t in trace for k in t))
        tcols = [{"key": k, "header": k, "width": 28 if len(k) > 14 else 18} for k in keys]
        xt.add_table_sheet(wb, txt["trace"], tcols, trace, meta=imeta,
                           legend=txt["int_legend"], table_name="Izlenebilirlik")
    else:
        xt.add_table_sheet(wb, txt["trace"], [{"key": "n", "header": txt["no_trace"], "width": 60}],
                           [], meta=imeta, legend=txt["int_legend"], table_name="Izlenebilirlik")
    internal = a.out_dir / f"{a.name}{txt['int_suffix']}.xlsx"
    wb.save(internal)

    print(f"customer workbook: {cust.name} ({len(rows)} questions)")
    print(f"internal workbook: {internal.name} ({len(trace)} traceability rows)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
