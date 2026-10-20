"""impact-table.xlsx writer.

Plan 1 minimal: joins ATCFinding x SimplificationItem on SAP Note number
and writes one row per finding. Items without matching findings are NOT
listed (they're not impacting code). Findings without matching items are
listed with blank item fields.
"""

import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Font

# office-tools/lib, beside this plugin in the catalog (cross_plugin_deps declares
# it): the house workbook theme. Without it the table is still written, plain.
sys.path.insert(0, str(Path(__file__).resolve().parents[5] / "office-tools" / "lib"))
_xt: Any
try:
    import xlsx_theme as _xt  # type: ignore[import-not-found,no-redef]
except ImportError:                                    # office-tools not installed
    _xt = None

_WIDTHS = [30, 26, 9, 11, 24, 24, 7, 40, 40, 16, 18]

from scripts.schemas import ATCFinding, SimplificationItem

_HEADERS = [
    "Pattern", "ATC Check ID", "Priority", "SAP Note", "Object", "Include", "Line",
    "Message", "Simplification Item Title", "Category", "Target Releases",
]


def write_impact_table(
    items: list[SimplificationItem],
    findings: list[ATCFinding],
    out_path: Path,
) -> None:
    """Generate ./migration/output/impact-table.xlsx from joined data."""

    # Index items by note number (1:N relationship)
    items_by_note: dict[int, list[SimplificationItem]] = defaultdict(list)
    for it in items:
        items_by_note[it.sap_note_number].append(it)

    rows: list[list[Any]] = []
    for f in findings:
        # Find matching items by note number (best-effort join)
        matches: list[SimplificationItem] = (
            items_by_note.get(f.sap_note, []) if f.sap_note else []
        )

        # If we got matches, write one row per match.
        # If no matches, still write one row with blank item fields.
        item_rows: list[SimplificationItem | None] = list(matches) or [None]
        for item in item_rows:
            rows.append([
                _pattern_label(f, item),
                f.check_id,
                f.priority,
                f.sap_note,
                f.object_name,
                f.include,
                f.line,
                f.message,
                item.sap_note_title if item else "",
                item.simplification_category if item else "",
                ", ".join(item.target_releases) if item else "",
            ])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    if _xt is not None:
        # The house look (2026-09-29): until then a bold header row and nothing
        # else -- no widths, text cut at eight characters, no print setup.
        meta = {"title": "Impact Table — ATC findings × Simplification Items",
                "labels": {"customer": "Customer", "project": "Project",
                           "version": "Version", "date": "Date"}}
        wb = _xt.new_workbook(meta)
        cols = [{"key": str(i), "header": h, "width": _WIDTHS[i]}
                for i, h in enumerate(_HEADERS)]
        _xt.add_table_sheet(
            wb, "Impact", cols, [{str(i): ("" if v is None else v) for i, v in enumerate(r)}
                                 for r in rows],
            meta=meta, freeze_cols=1, table_name="Impact",
            legend="One row per ATC finding and matching Simplification Item "
                   "(joined on the SAP Note). Findings with no item keep blank item columns.")
        wb.save(out_path)
        return
    wb = Workbook()
    ws = wb.active
    if ws is None:
        raise RuntimeError("openpyxl returned a workbook with no active sheet")
    ws.title = "Impact"
    ws.append(_HEADERS)
    for c in ws[1]:
        c.font = Font(bold=True)
    for row in rows:
        ws.append(row)
    wb.save(out_path)


def header_row(ws: Any) -> int:
    """Row number of the column headers: 1 in a plain table, below the header
    block in a themed one."""
    for row in ws.iter_rows(min_row=1, max_row=12):
        if row and row[0].value == _HEADERS[0]:
            return int(row[0].row)
    return 1


def write_impact_table_md(
    items: list[SimplificationItem],
    findings: list[ATCFinding],
    out_path: Path,
) -> None:
    """Generate impact-table.md — same data as .xlsx but as a markdown table.

    Parameters
    ----------
    items:
        Simplification catalogue rows.
    findings:
        ATC findings from the customer system.
    out_path:
        Destination path (parent dirs created automatically).
    """
    # Index items by note number (1:N relationship)
    items_by_note: dict[int, list[SimplificationItem]] = defaultdict(list)
    for it in items:
        items_by_note[it.sap_note_number].append(it)

    # Header row
    header = "| " + " | ".join(_HEADERS) + " |"
    separator = "| " + " | ".join("---" for _ in _HEADERS) + " |"
    rows = [header, separator]

    for f in findings:
        matches: list[SimplificationItem] = (
            items_by_note.get(f.sap_note, []) if f.sap_note else []
        )
        item_rows: list[SimplificationItem | None] = list(matches) or [None]
        for item in item_rows:
            cells = [
                _pattern_label(f, item),
                f.check_id,
                str(f.priority),
                str(f.sap_note) if f.sap_note is not None else "",
                f.object_name,
                f.include,
                str(f.line),
                f.message,
                item.sap_note_title if item else "",
                item.simplification_category if item else "",
                ", ".join(item.target_releases) if item else "",
            ]
            # Escape pipe characters inside cell values
            escaped = [c.replace("|", "\\|") for c in cells]
            rows.append("| " + " | ".join(escaped) + " |")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(rows) + "\n", encoding="utf-8")


def _pattern_label(finding: ATCFinding, item: SimplificationItem | None) -> str:
    """Short stable label combining check_id + object — used to group rows visually."""
    short_check = finding.check_id.split("::")[-1].lower().replace("_", "-")
    return f"atc-{short_check}-{finding.object_name.lower()}"
