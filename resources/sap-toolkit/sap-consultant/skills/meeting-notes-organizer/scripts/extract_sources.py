#!/usr/bin/env python3
"""Extract every workshop source file into one JSON bundle, with classification signals.

This is the mechanical half of the meeting-notes-organizer skill. It exists so the agent does
not hand-write a throwaway extraction script per run -- that is where the encoding
bugs live (Turkish characters through a cp1252 console) and where bold-run and table
information quietly gets dropped, which is exactly the information the classifier
needs.

Reads .docx (paragraphs with style + bold info, and tables), .xlsx (all sheets),
and .txt/.md (lines). Writes ONE utf-8 JSON file. Nothing is classified here and
nothing is summarised -- the judgment stays with the agent; this only makes sure it
sees the whole document.

Usage:
  py extract_sources.py --out extracted.json <file> [<file> ...]

Console output is deliberately ASCII-only (the Windows console is cp1252); the
document text itself never goes to stdout, only to the JSON file.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
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

# Signature probes -- reported as counts, never as a verdict.
DUR_RE = re.compile(r"^\s*(\d{1,2}:\d{2}(:\d{2})?|\d+\s*dakika\s*\d+\s*saniye)", re.I)
CHAT_RE = re.compile(r"(D[uü]n|Yesterday|\d{1,2}\.\d{1,2}\.\d{2,4})\s*\d{1,2}[:.]\d{2}", re.I)
HELPFUL_RE = re.compile(r"(Bu notlar yararl[ıi] oldu mu|Was this recap helpful)", re.I)
HEADER_RE = re.compile(
    r"^\s*(Kararlar|Decisions|A[çc][ıi]k sorular|Open questions|Ajanda|Agenda|"
    r"Takip g[öo]revleri|Follow-up tasks)\s*:?\s*$", re.I)


def die(msg: str) -> None:
    sys.exit(f"ERROR: {msg}")


def read_docx(path: Path) -> dict:
    try:
        from docx import Document
    except ImportError:
        die("python-docx is not installed: py -m pip install python-docx")
    doc = Document(str(path))
    paragraphs = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        runs = [r for r in p.runs if r.text.strip()]
        paragraphs.append({
            "text": text,
            "style": p.style.name if p.style is not None else "",
            # "bold" means the whole paragraph is bold -- the heading signal in
            # both recap flavours. A partially bold paragraph is body text.
            "bold": bool(runs) and all(r.bold for r in runs),
        })
    tables = [[[c.text.strip() for c in row.cells] for row in t.rows] for t in doc.tables]
    return {"paragraphs": paragraphs, "tables": tables}


def read_xlsx(path: Path) -> dict:
    try:
        import openpyxl
    except ImportError:
        die("openpyxl is not installed: py -m pip install openpyxl")
    wb = openpyxl.load_workbook(str(path), data_only=True, read_only=True)
    sheets = {}
    for ws in wb.worksheets:
        rows = []
        for row in ws.iter_rows(values_only=True):
            cells = ["" if v is None else str(v).strip() for v in row]
            if any(cells):
                rows.append(cells)
        sheets[ws.title] = rows
    wb.close()
    # A sheet reads like prose to the classifier: every non-empty cell, in order.
    paragraphs = [{"text": c, "style": f"xlsx:{name}", "bold": False}
                  for name, rows in sheets.items() for r in rows for c in r if c]
    return {"paragraphs": paragraphs, "tables": list(sheets.values()), "sheets": sheets}


def read_text(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    paragraphs = [{"text": ln.strip(), "style": "", "bold": False}
                  for ln in text.splitlines() if ln.strip()]
    return {"paragraphs": paragraphs, "tables": []}


def signals(doc: dict) -> dict:
    """Structural counts the agent classifies on. Deliberately not a decision."""
    paras = doc["paragraphs"]
    texts = [p["text"] for p in paras]
    bold_then_duration = sum(
        1 for i, p in enumerate(paras[:-1])
        if p["bold"] and DUR_RE.match(paras[i + 1]["text"]))
    return {
        "paragraphs": len(paras),
        "tables": len(doc["tables"]),
        "bold_paragraphs": sum(1 for p in paras if p["bold"]),
        "duration_timestamps": sum(1 for t in texts if DUR_RE.match(t)),
        "bold_heading_followed_by_timestamp": bold_then_duration,
        "chat_timestamps": sum(1 for t in texts if CHAT_RE.search(t)),
        "recap_helpful_line": any(HELPFUL_RE.search(t) for t in texts),
        "section_headers": sorted({t.strip(": ") for t in texts if HEADER_RE.match(t)}),
        "avg_paragraph_chars": (
            round(sum(len(t) for t in texts) / len(texts)) if texts else 0),
    }


READERS = {".docx": read_docx, ".xlsx": read_xlsx, ".xlsm": read_xlsx,
           ".txt": read_text, ".md": read_text, ".csv": read_text}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, required=True, help="JSON bundle to write")
    args = ap.parse_args()

    bundle = []
    for f in args.files:
        if not f.is_file():
            die(f"not a file: {f}")
        reader = READERS.get(f.suffix.lower())
        if reader is None:
            die(f"unsupported file type {f.suffix} ({f.name}); "
                f"supported: {', '.join(sorted(READERS))}")
        doc = reader(f)
        if not doc["paragraphs"] and not doc["tables"]:
            die(f"{f.name} is empty or unreadable -- ask the user for another copy")
        bundle.append({"file": f.name, "path": str(f.resolve()),
                       "signals": signals(doc), **doc})

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(bundle, indent=1, ensure_ascii=False) + "\n",
                        encoding="utf-8")

    print(f"extracted {len(bundle)} file(s) -> {args.out}")
    for d in bundle:
        s = d["signals"]
        print(f"  {d['file']}: {s['paragraphs']} paragraphs, {s['tables']} table(s), "
              f"{s['bold_paragraphs']} bold, {s['duration_timestamps']} durations, "
              f"{s['chat_timestamps']} chat stamps, "
              f"recap_line={s['recap_helpful_line']}, "
              f"headers={len(s['section_headers'])}")


if __name__ == "__main__":
    main()
