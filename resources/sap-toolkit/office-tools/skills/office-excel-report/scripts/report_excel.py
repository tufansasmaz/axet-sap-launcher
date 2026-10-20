#!/usr/bin/env python3
"""A presentation-ready Excel report in the NTT house look (lib/xlsx_theme.py).

Until 2026-09-29 this script chose its own look: a navy that is not the house
blue, Calibri, a chart titled "Chart" in Office's default blue/red/green, column
names printed with their underscores (`Devam_Eden`) and no print setup unless
asked. The Fast Scan workbook had already moved to the shared theme; a weekly
status report beside it looked like it came from another company. Now every
report gets the same header block, Excel table (filter, sort), zebra, frozen
header, A4 print setup and footer, and the chart the house palette.
"""

import argparse
import json
import os
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

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))

# Words this script writes itself, in the report's language.
WORDS = {
    "tr": {"labels": {"customer": "Müşteri", "project": "Proje", "version": "Sürüm",
                      "date": "Tarih"},
           "legend": "Her kolonda filtre ve sıralama var; başlık satırı sabit.",
           "chart": "Grafik"},
    "en": {"labels": {"customer": "Customer", "project": "Project", "version": "Version",
                      "date": "Date"},
           "legend": "Every column filters and sorts; the header row stays in view.",
           "chart": "Chart"},
}

# A share column (0.67) is shown as 67 %, not as a bare fraction.
SHARE_NAME = re.compile(r"(oran|rate|ratio|pct|percent|yüzde|share|pay)", re.I)


def load_data(args):
    import pandas as pd
    path = Path(args.input)
    if not path.exists():
        print(f"ERROR: input not found: {path}", file=sys.stderr)
        sys.exit(1)
    suffix = path.suffix.lower()
    if suffix == ".json":
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return pd.DataFrame(data if isinstance(data, list) else data.get(args.json_key, data))
    # --input-sheet controls which sheet to READ; --sheet controls the output sheet name
    in_sheet = getattr(args, "input_sheet", None) or 0
    if suffix in (".xlsx", ".xlsm"):
        return pd.read_excel(path, sheet_name=in_sheet, engine="openpyxl")
    if suffix == ".xls":
        return pd.read_excel(path, sheet_name=in_sheet, engine="xlrd")
    sep = "\t" if suffix in (".tsv", ".txt") else ","
    return pd.read_csv(path, sep=sep)


def pretty(name) -> str:
    """`Devam_Eden` -> `Devam Eden`: a header is read, not parsed."""
    return re.sub(r"\s+", " ", str(name).replace("_", " ")).strip()


def _plain(v):
    """numpy scalars -> Python values openpyxl writes as numbers."""
    try:
        import numpy as np
        if isinstance(v, np.generic):
            return v.item()
    except ImportError:
        pass
    try:
        import pandas as pd
        if pd.isna(v):
            return ""
    except (ImportError, TypeError, ValueError):
        pass
    return v


def build(df, args):
    from openpyxl.utils import get_column_letter
    from xlsx_theme import HEADER_ROW, add_table_sheet, new_workbook

    words = WORDS[args.lang]
    meta = {"title": args.title or "", "customer": args.customer, "project": args.project,
            "version": args.version, "labels": words["labels"]}
    wb = new_workbook(meta)

    keys = [str(c) for c in df.columns]
    rows = [{k: _plain(v) for k, v in zip(keys, rec)} for rec in df.itertuples(index=False)]
    columns = []
    for k in keys:
        longest = max([len(str(r[k])) for r in rows] + [len(pretty(k))])
        numeric = all(isinstance(r[k], (int, float)) or r[k] == "" for r in rows)
        columns.append({"key": k, "header": pretty(k),
                        "width": min(max(longest + 2, 10), args.max_col_width),
                        "wrap": not numeric})
    ws = add_table_sheet(wb, args.sheet, columns, rows, meta=meta,
                         legend=args.legend or words["legend"], freeze_cols=1,
                         table_name=args.sheet)

    first = HEADER_ROW + 1
    last = HEADER_ROW + max(len(rows), 1)
    col_of = {k: j for j, k in enumerate(keys, start=1)}
    col_of.update({pretty(k): j for j, k in enumerate(keys, start=1)})

    # Numbers right-aligned without the text indent; shares as percentages.
    from openpyxl.styles import Alignment
    for k in keys:
        vals = [r[k] for r in rows if r[k] != ""]
        if not vals or not all(isinstance(v, (int, float)) for v in vals):
            continue
        j = col_of[k]
        share = SHARE_NAME.search(k) and all(0 <= v <= 1 for v in vals)
        for r in range(first, last + 1):
            c = ws.cell(r, j)
            c.alignment = Alignment(horizontal="right", vertical="top")
            if share:
                c.number_format = "0%"
            elif all(float(v).is_integer() for v in vals):
                c.number_format = "#,##0"

    if args.number_format:
        for part in args.number_format.split(","):
            if "=" not in part:
                continue
            name, fmt = (x.strip() for x in part.split("=", 1))
            if name in col_of:
                for r in range(first, last + 1):
                    ws.cell(r, col_of[name]).number_format = fmt

    if args.cond_format:
        add_cond_format(ws, args.cond_format, col_of, first, last)

    if args.chart and args.chart_cols:
        add_chart(ws, args, col_of, first, last, words)
    return wb


def add_cond_format(ws, spec, col_of, first, last):
    from openpyxl.formatting.rule import CellIsRule
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter
    # Soft fills with a readable text colour, not pure red/green/yellow.
    colours = {"red": ("FDE2E1", "9B1C1C"), "green": ("E3F4E8", "1E6B34"),
               "yellow": ("FFF4CE", "7A5A00"), "orange": ("FFE8D1", "8A4B08")}
    for rule_str in spec.split(";"):
        for op_str, xl_op in (("<=", "lessThanOrEqual"), (">=", "greaterThanOrEqual"),
                              ("==", "equal"), ("<", "lessThan"), (">", "greaterThan")):
            if op_str not in rule_str:
                continue
            try:
                left, right = rule_str.split(op_str, 1)
                val, color = right.rsplit("=", 1)
                name = left.strip()
                if name not in col_of:
                    print(f"WARNING: cond-format column not found: {name}", file=sys.stderr)
                    break
                fill_hex, font_hex = colours.get(color.strip().lower(),
                                                 (color.strip().lstrip("#"), "222629"))
                letter = get_column_letter(col_of[name])
                ws.conditional_formatting.add(
                    f"{letter}{first}:{letter}{last}",
                    CellIsRule(operator=xl_op, formula=[val.strip()],
                               fill=PatternFill("solid", fgColor=fill_hex, bgColor=fill_hex),
                               font=Font(color=font_hex)))
            except ValueError as e:
                print(f"WARNING: could not parse cond-format '{rule_str}': {e}", file=sys.stderr)
            break


def add_chart(ws, args, col_of, first, last, words):
    from openpyxl.chart import BarChart, LineChart, PieChart, Reference, Series
    from openpyxl.chart.shapes import GraphicalProperties
    from openpyxl.drawing.line import LineProperties
    from theme import ACCENT_HEX, DEEP_HEX, MUTED_HEX

    names = [c.strip() for c in args.chart_cols.split(",")]
    if len(names) < 2:
        print("WARNING: --chart-cols requires at least 2 columns (label + value)", file=sys.stderr)
        return
    label_col = col_of.get(names[0])
    value_cols = [col_of[n] for n in names[1:] if n in col_of]
    if not label_col or not value_cols:
        print("WARNING: chart columns not found in sheet -- skipping chart", file=sys.stderr)
        return

    from openpyxl.utils import get_column_letter
    chart = {"bar": BarChart, "line": LineChart, "pie": PieChart}[args.chart]()
    chart.title = args.chart_title or ", ".join(pretty(n) for n in names[1:])
    # As wide as the table above it (a column-width unit is ~0.19 cm), so the
    # page prints as one piece; a 20 cm chart under a 16 cm table spilled onto
    # a second page with its legend cut off.
    table_cm = sum(ws.column_dimensions[get_column_letter(j)].width or 13
                   for j in range(1, ws.max_column + 1)) * 0.19
    chart.width, chart.height = max(12, min(24, table_cm)), 8.5
    chart.legend.position = "r"     # at the bottom it sat on the category labels
    # openpyxl writes axes marked deleted unless told otherwise: the first
    # render had bars with no values and no category names under them.
    if args.chart != "pie":
        chart.x_axis.delete = False
        chart.y_axis.delete = False
    # The house blues, then a neutral: a status chart must not borrow the
    # traffic-light meaning of red and green for "in progress" and "not started".
    palette = [ACCENT_HEX, DEEP_HEX, "6CACE4", MUTED_HEX, "A9C9E8", "2E5E8C"]
    cats = Reference(ws, min_col=label_col, min_row=first, max_row=last)
    for i, vc in enumerate(value_cols):
        s = Series(Reference(ws, min_col=vc, min_row=first - 1, max_row=last),
                   title_from_data=True)
        colour = palette[i % len(palette)]
        s.graphicalProperties = GraphicalProperties(solidFill=colour)
        s.graphicalProperties.line = LineProperties(solidFill=colour)
        chart.series.append(s)
    chart.set_categories(cats)
    if args.chart == "bar":
        chart.gapWidth = 80
        if chart.y_axis.majorGridlines is not None:
            chart.y_axis.majorGridlines.spPr = GraphicalProperties(
                ln=LineProperties(solidFill="D8E3EC"))
    ws.add_chart(chart, f"A{last + 3}")
    # The chart is part of the page: print it too.
    ws.print_area = f"A1:{get_column_letter(ws.max_column)}{last + 3 + int(chart.height / 0.5) + 1}"
    print(f"  chart ({args.chart}) added at row {last + 3}")


def main():
    ap = argparse.ArgumentParser(description="Generate a formatted Excel report")
    ap.add_argument("--input", "-i", required=True)
    ap.add_argument("--input-sheet", default=None,
                    help="Sheet to READ from input xlsx (name or index, default: first sheet)")
    ap.add_argument("--output", "-o", required=True)
    ap.add_argument("--sheet", default="Rapor", help="Output sheet name (default: Rapor)")
    ap.add_argument("--title", default=None, help="report title, in the header block and footer")
    ap.add_argument("--customer", default=None)
    ap.add_argument("--project", default=None)
    ap.add_argument("--version", default=None)
    ap.add_argument("--legend", default=None, help="one line under the title: how to read it")
    ap.add_argument("--lang", choices=sorted(WORDS), default="tr")
    ap.add_argument("--max-col-width", type=int, default=50)
    ap.add_argument("--number-format", default=None,
                    help='e.g. "Revenue=#,##0.00,Pct=0.00%%"')
    ap.add_argument("--cond-format", default=None,
                    help='e.g. "Revenue<0=red;Pct>1=green" (semicolon-separated)')
    ap.add_argument("--chart", choices=["bar", "line", "pie"], default=None)
    ap.add_argument("--chart-cols", default=None,
                    help="Columns for chart: first=labels, rest=series")
    ap.add_argument("--chart-title", default=None)
    ap.add_argument("--json-key", default=None)
    ap.add_argument("--force", action="store_true")
    # Accepted so an old command line still runs; the house theme decides these.
    for legacy in ("--header-color", "--header-font-color", "--alt-row-color"):
        ap.add_argument(legacy, default=None, help=argparse.SUPPRESS)
    for legacy in ("--freeze-header", "--auto-width", "--print-setup"):
        ap.add_argument(legacy, action="store_true", help=argparse.SUPPRESS)
    args = ap.parse_args()

    if args.input_sheet is not None:
        try:
            args.input_sheet = int(args.input_sheet)
        except ValueError:
            pass  # keep as string sheet name
    if any((args.header_color, args.header_font_color, args.alt_row_color)):
        print("  note: colour flags are ignored -- the report uses the NTT house theme",
              file=sys.stderr)

    out_path = Path(args.output)
    if out_path.exists() and not args.force:
        print(f"ERROR: {out_path} exists. Use --force to overwrite.", file=sys.stderr)
        sys.exit(1)

    df = load_data(args)
    wb = build(df, args)
    wb.save(out_path)
    size_kb = out_path.stat().st_size / 1024
    print(f"OK Report: {out_path}  ({len(df):,} rows, {size_kb:.1f} KB)")
    if args.title:
        print(f"  Title   : {args.title}")
    if args.chart:
        print(f"  Chart   : {args.chart}")


if __name__ == "__main__":
    main()
