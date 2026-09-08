#!/usr/bin/env python3
"""Write CSV or JSON data to a formatted Excel file using OpenPyXL."""

import argparse
import json
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


HEADER_FILL_DEFAULT = "1F4E79"
HEADER_FONT_DEFAULT = "FFFFFF"


def load_input(args) -> "pd.DataFrame":
    import pandas as pd

    if args.stdin:
        raw = sys.stdin.read()
        try:
            data = json.loads(raw)
            if isinstance(data, dict) and args.json_key:
                data = data[args.json_key]
            return pd.DataFrame(data)
        except json.JSONDecodeError:
            from io import StringIO
            return pd.read_csv(StringIO(raw))

    path = Path(args.input)
    if not path.exists():
        print(f"ERROR: input file not found: {path}", file=sys.stderr)
        sys.exit(1)

    suffix = path.suffix.lower()
    if suffix == ".json":
        with open(path) as f:
            data = json.load(f)
        if isinstance(data, dict) and args.json_key:
            data = data[args.json_key]
        return pd.DataFrame(data)
    if suffix in (".xlsx", ".xls", ".xlsm"):
        sheet = args.sheet or 0
        return pd.read_excel(path, sheet_name=sheet)
    # CSV / TSV
    sep = "\t" if suffix in (".tsv", ".txt") else ","
    parse_dates = [c.strip() for c in args.parse_dates.split(",")] if args.parse_dates else False
    return pd.read_csv(path, sep=sep, parse_dates=parse_dates or False)


def hex_to_rgb(hex_color: str):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def apply_header_style(ws, header_color: str, font_color: str):
    from openpyxl.styles import Font, PatternFill, Alignment
    fill = PatternFill("solid", fgColor=header_color.lstrip("#"))
    font = Font(bold=True, color=font_color.lstrip("#"))
    for cell in ws[1]:
        cell.fill = fill
        cell.font = font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def auto_col_widths(ws, max_width: int = 60):
    from openpyxl.cell import MergedCell
    from openpyxl.utils import get_column_letter
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            if isinstance(cell, MergedCell):
                continue
            try:
                val = str(cell.value) if cell.value is not None else ""
                max_len = max(max_len, len(val))
            except Exception:
                pass
        ws.column_dimensions[col_letter].width = min(max_len + 4, max_width)


def apply_number_formats(ws, fmt_map: dict):
    """fmt_map: {col_name: format_string}"""
    # build header → column index map
    headers = {cell.value: cell.column for cell in ws[1]}
    for col_name, fmt in fmt_map.items():
        if col_name not in headers:
            continue
        col_idx = headers[col_name]
        for row in ws.iter_rows(min_row=2, min_col=col_idx, max_col=col_idx):
            for cell in row:
                cell.number_format = fmt


def write_title_row(ws, title: str, num_cols: int):
    from openpyxl.styles import Font, Alignment
    ws.insert_rows(1)
    title_cell = ws.cell(row=1, column=1, value=title)
    title_cell.font = Font(bold=True, size=14)
    title_cell.alignment = Alignment(horizontal="left")
    if num_cols > 1:
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=num_cols)


def main():
    ap = argparse.ArgumentParser(description="Write data to a formatted Excel file")
    ap.add_argument("--input", "-i", default=None, help="Input file (CSV, TSV, JSON, XLSX)")
    ap.add_argument("--stdin", action="store_true", help="Read data from stdin (CSV or JSON)")
    ap.add_argument("--output", "-o", required=True, help="Output .xlsx path")
    ap.add_argument("--sheet", default="Sheet1", help="Sheet name (default: Sheet1)")
    ap.add_argument("--title", default=None, help="Optional title row above the header")
    ap.add_argument("--header-color", default=HEADER_FILL_DEFAULT, help="Header fill hex (default: 1F4E79)")
    ap.add_argument("--header-font-color", default=HEADER_FONT_DEFAULT, help="Header font hex (default: FFFFFF)")
    ap.add_argument("--no-header-style", action="store_true", help="Skip header styling")
    ap.add_argument("--auto-width", action="store_true", default=True, help="Auto-fit column widths")
    ap.add_argument("--max-col-width", type=int, default=60)
    ap.add_argument("--number-format", default=None,
                    help='Column number formats: "Revenue=#,##0.00,Pct=0.00%%"')
    ap.add_argument("--parse-dates", default=None, help="Comma-separated columns to parse as dates")
    ap.add_argument("--json-key", default=None, help="Key to extract array from JSON dict")
    ap.add_argument("--force", action="store_true", help="Overwrite output if exists")
    args = ap.parse_args()

    if not args.input and not args.stdin:
        print("ERROR: provide --input <file> or --stdin", file=sys.stderr)
        sys.exit(1)

    out_path = Path(args.output)
    if out_path.exists() and not args.force:
        print(f"ERROR: output file already exists: {out_path}\n"
              f"Use --force to overwrite.", file=sys.stderr)
        sys.exit(1)

    import pandas as pd
    df = load_input(args)

    # write via pandas first (handles dtypes cleanly)
    sheet_name = args.sheet[:31]  # Excel sheet name limit
    df.to_excel(out_path, sheet_name=sheet_name, index=False, engine="openpyxl")

    # reopen with openpyxl for formatting
    from openpyxl import load_workbook
    wb = load_workbook(out_path)
    ws = wb[sheet_name]

    num_cols = ws.max_column

    if args.title:
        write_title_row(ws, args.title, num_cols)

    if not args.no_header_style:
        # header row is row 1 after optional title insert (title moves it to row 2)
        header_row = 2 if args.title else 1
        from openpyxl.styles import Font, PatternFill, Alignment
        fill = PatternFill("solid", fgColor=args.header_color.lstrip("#"))
        font = Font(bold=True, color=args.header_font_color.lstrip("#"))
        for cell in ws[header_row]:
            cell.fill = fill
            cell.font = font
            cell.alignment = Alignment(horizontal="center", vertical="center")

    if args.number_format:
        fmt_map = {}
        for part in args.number_format.split(","):
            if "=" in part:
                col, fmt = part.split("=", 1)
                fmt_map[col.strip()] = fmt.strip()
        apply_number_formats(ws, fmt_map)

    if args.auto_width:
        auto_col_widths(ws, args.max_col_width)

    wb.save(out_path)
    size_kb = out_path.stat().st_size / 1024
    print(f"✓ Written: {out_path}  ({df.shape[0]:,} rows × {df.shape[1]} cols, {size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
