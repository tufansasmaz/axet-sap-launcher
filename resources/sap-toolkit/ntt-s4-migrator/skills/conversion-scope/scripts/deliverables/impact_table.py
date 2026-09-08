"""impact-table.xlsx writer.

Plan 1 minimal: joins ATCFinding x SimplificationItem on SAP Note number
and writes one row per finding. Items without matching findings are NOT
listed (they're not impacting code). Findings without matching items are
listed with blank item fields.
"""

from collections import defaultdict
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font

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

    wb = Workbook()
    ws = wb.active
    if ws is None:
        raise RuntimeError("openpyxl returned a workbook with no active sheet")
    ws.title = "Impact"

    ws.append(_HEADERS)
    for c in ws[1]:
        c.font = Font(bold=True)

    for f in findings:
        # Find matching items by note number (best-effort join)
        matches: list[SimplificationItem] = (
            items_by_note.get(f.sap_note, []) if f.sap_note else []
        )

        # If we got matches, write one row per match.
        # If no matches, still write one row with blank item fields.
        item_rows: list[SimplificationItem | None] = list(matches) or [None]
        for item in item_rows:
            ws.append([
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
    wb.save(out_path)


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
