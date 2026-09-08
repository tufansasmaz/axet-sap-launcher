#!/usr/bin/env python3
"""Generate a professionally formatted Excel report using OpenPyXL."""

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


HEADER_COLOR_DEFAULT = "1F4E79"
HEADER_FONT_DEFAULT = "FFFFFF"
ALT_ROW_DEFAULT = "DCE6F1"


def load_data(args):
    import pandas as pd
    path = Path(args.input)
    if not path.exists():
        print(f"ERROR: input not found: {path}", file=sys.stderr)
        sys.exit(1)
    suffix = path.suffix.lower()
    if suffix == ".json":
        with open(path) as f:
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


def write_base_xlsx(df, out_path: Path, sheet_name: str):
    df.to_excel(out_path, sheet_name=sheet_name, index=False, engine="openpyxl")


def style_worksheet(ws, args, num_data_rows: int, num_cols: int):
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, numbers
    from openpyxl.utils import get_column_letter

    header_fill = PatternFill("solid", fgColor=args.header_color.lstrip("#"))
    header_font = Font(bold=True, color=args.header_font_color.lstrip("#"), size=11)
    alt_fill = PatternFill("solid", fgColor=args.alt_row_color.lstrip("#"))
    thin = Side(style="thin", color="CCCCCC")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    data_start_row = 1  # header is row 1

    # title row
    if args.title:
        ws.insert_rows(1)
        title_cell = ws.cell(row=1, column=1, value=args.title)
        title_cell.font = Font(bold=True, size=14, color="1F4E79")
        title_cell.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[1].height = 24
        if num_cols > 1:
            ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=num_cols)
        data_start_row = 2

    # header row
    for cell in ws[data_start_row]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = border
    ws.row_dimensions[data_start_row].height = 20

    # data rows
    for row_idx in range(data_start_row + 1, data_start_row + num_data_rows + 1):
        use_alt = (row_idx - data_start_row) % 2 == 0
        for col_idx in range(1, num_cols + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            if use_alt:
                cell.fill = alt_fill
            cell.border = border
            cell.alignment = Alignment(vertical="center")

    # freeze header
    if args.freeze_header:
        ws.freeze_panes = ws.cell(row=data_start_row + 1, column=1)

    # number formats
    if args.number_format:
        headers = {ws.cell(row=data_start_row, column=c).value: c
                   for c in range(1, num_cols + 1)}
        for part in args.number_format.split(","):
            if "=" not in part:
                continue
            col_name, fmt = part.split("=", 1)
            col_name, fmt = col_name.strip(), fmt.strip()
            if col_name in headers:
                col_idx = headers[col_name]
                for row_idx in range(data_start_row + 1, data_start_row + num_data_rows + 1):
                    ws.cell(row=row_idx, column=col_idx).number_format = fmt

    # conditional format (basic: col<value=color)
    if args.cond_format:
        from openpyxl.formatting.rule import ColorScaleRule, CellIsRule
        headers = {ws.cell(row=data_start_row, column=c).value: c
                   for c in range(1, num_cols + 1)}
        for rule_str in args.cond_format.split(";"):
            try:
                # format: "ColName<0=red" or "ColName>100=green"
                for op_str, xl_op in [("<", "lessThan"), (">", "greaterThan"),
                                       ("<=", "lessThanOrEqual"), (">=", "greaterThanOrEqual"),
                                       ("==", "equal")]:
                    if op_str in rule_str:
                        left, right = rule_str.split(op_str, 1)
                        col_name = left.strip()
                        val_color = right.strip()
                        val, color = val_color.rsplit("=", 1)
                        color_map = {"red": "FF0000", "green": "00B050",
                                     "yellow": "FFFF00", "orange": "FFA500"}
                        hex_color = color_map.get(color.strip().lower(), color.strip().lstrip("#"))
                        if col_name in headers:
                            col_idx = headers[col_name]
                            col_letter = get_column_letter(col_idx)
                            data_range = f"{col_letter}{data_start_row+1}:{col_letter}{data_start_row+num_data_rows}"
                            fill = PatternFill("solid", fgColor=hex_color)
                            ws.conditional_formatting.add(
                                data_range,
                                CellIsRule(operator=xl_op, formula=[val.strip()],
                                           fill=fill)
                            )
                        break
            except Exception as e:
                print(f"WARNING: could not parse cond-format '{rule_str}': {e}", file=sys.stderr)

    # auto column widths
    if args.auto_width:
        from openpyxl.cell import MergedCell
        from openpyxl.utils import get_column_letter as _gcl
        for col in ws.columns:
            max_len = 0
            col_letter = _gcl(col[0].column)
            for cell in col:
                if isinstance(cell, MergedCell):
                    continue
                try:
                    if cell.value:
                        max_len = max(max_len, len(str(cell.value)))
                except Exception:
                    pass
            ws.column_dimensions[col_letter].width = min(max_len + 4, args.max_col_width)


def add_chart(ws, chart_type: str, chart_cols_str: str,
              data_start_row: int, num_data_rows: int):
    from openpyxl.chart import BarChart, LineChart, PieChart, Reference, Series
    from openpyxl.utils import get_column_letter

    # map header name → column index
    headers = {}
    for cell in ws[data_start_row]:
        if cell.value:
            headers[str(cell.value)] = cell.column

    col_names = [c.strip() for c in chart_cols_str.split(",")]
    if len(col_names) < 2:
        print("WARNING: --chart-cols requires at least 2 columns (label + value)", file=sys.stderr)
        return

    label_col = headers.get(col_names[0])
    value_cols = [headers.get(n) for n in col_names[1:] if n in headers]

    if not label_col or not value_cols:
        print(f"WARNING: chart columns not found in sheet — skipping chart", file=sys.stderr)
        return

    chart_classes = {"bar": BarChart, "line": LineChart, "pie": PieChart}
    ChartClass = chart_classes.get(chart_type, BarChart)
    chart = ChartClass()
    chart.title = "Chart"
    chart.style = 10
    chart.width = 20
    chart.height = 12

    cats = Reference(ws, min_col=label_col, min_row=data_start_row + 1,
                     max_row=data_start_row + num_data_rows)

    for vc in value_cols:
        data_ref = Reference(ws, min_col=vc, min_row=data_start_row,
                             max_row=data_start_row + num_data_rows)
        series = Series(data_ref, title_from_data=True)
        chart.series.append(series)

    chart.set_categories(cats)

    # place chart below data
    anchor_row = data_start_row + num_data_rows + 3
    anchor_col = get_column_letter(1)
    ws.add_chart(chart, f"{anchor_col}{anchor_row}")
    print(f"  chart ({chart_type}) added at row {anchor_row}")


def main():
    ap = argparse.ArgumentParser(description="Generate a formatted Excel report")
    ap.add_argument("--input", "-i", required=True)
    ap.add_argument("--input-sheet", default=None,
                    help="Sheet to READ from input xlsx (name or index, default: first sheet)")
    ap.add_argument("--output", "-o", required=True)
    ap.add_argument("--sheet", default="Report", help="Output sheet name (default: Report)")
    ap.add_argument("--title", default=None)
    ap.add_argument("--header-color", default=HEADER_COLOR_DEFAULT)
    ap.add_argument("--header-font-color", default=HEADER_FONT_DEFAULT)
    ap.add_argument("--alt-row-color", default=ALT_ROW_DEFAULT)
    ap.add_argument("--freeze-header", action="store_true", default=True)
    ap.add_argument("--auto-width", action="store_true", default=True)
    ap.add_argument("--max-col-width", type=int, default=50)
    ap.add_argument("--number-format", default=None,
                    help='e.g. "Revenue=#,##0.00,Pct=0.00%%"')
    ap.add_argument("--cond-format", default=None,
                    help='e.g. "Revenue<0=red;Pct>1=green" (semicolon-separated)')
    ap.add_argument("--chart", choices=["bar", "line", "pie"], default=None)
    ap.add_argument("--chart-cols", default=None,
                    help="Columns for chart: first=labels, rest=series")
    ap.add_argument("--print-setup", action="store_true",
                    help="Configure print settings: A4 landscape, fit to 1 page wide, "
                         "repeat header row on every printed page")
    ap.add_argument("--json-key", default=None)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    # allow --input-sheet as int index
    if args.input_sheet is not None:
        try:
            args.input_sheet = int(args.input_sheet)
        except ValueError:
            pass  # keep as string sheet name

    out_path = Path(args.output)
    if out_path.exists() and not args.force:
        print(f"ERROR: {out_path} exists. Use --force to overwrite.", file=sys.stderr)
        sys.exit(1)

    df = load_data(args)
    num_data_rows = len(df)
    num_cols = len(df.columns)
    sheet_name = args.sheet[:31]

    write_base_xlsx(df, out_path, sheet_name)

    from openpyxl import load_workbook
    from openpyxl.worksheet.page import PageMargins
    wb = load_workbook(out_path)
    ws = wb[sheet_name]

    style_worksheet(ws, args, num_data_rows, num_cols)
    data_start_row = 2 if args.title else 1

    if args.print_setup:
        from openpyxl.worksheet.page import PrintPageSetup
        ws.page_setup.orientation = "landscape"
        ws.page_setup.paperSize = ws.PAPERSIZE_A4
        ws.page_setup.fitToWidth = 1
        ws.page_setup.fitToHeight = 0
        ws.page_setup.fitToPage = True
        ws.print_title_rows = f"{data_start_row}:{data_start_row}"
        ws.page_margins = PageMargins(left=0.5, right=0.5, top=0.75, bottom=0.75,
                                      header=0.3, footer=0.3)
        print("  Print setup: A4 landscape, fit to width, header row repeats")

    if args.chart and args.chart_cols:
        add_chart(ws, args.chart, args.chart_cols, data_start_row, num_data_rows)

    wb.save(out_path)
    size_kb = out_path.stat().st_size / 1024
    print(f"✓ Report: {out_path}  ({num_data_rows:,} rows, {size_kb:.1f} KB)")
    if args.title:
        print(f"  Title   : {args.title}")
    if args.chart:
        print(f"  Chart   : {args.chart}")


if __name__ == "__main__":
    main()
