"""Write the human-review-queue CSV.

Column order is FROZEN by SPEC §4 — do not reorder, do not insert:

    finding_id, check_id, category, reason_routed, object_type,
    object_name, include, line, message, confidence, suggested_action,
    sap_note, context_url

Empty ``confidence`` renders as a blank between commas (NOT ``None`` / the
string ``"None"`` / ``""``-quoted). ``csv.DictWriter`` handles quoting
correctly for messages that may contain commas / newlines / quotes.
"""

from __future__ import annotations

import csv
from pathlib import Path

from scripts.schemas import RoutedFinding

CSV_COLUMNS: tuple[str, ...] = (
    "finding_id",
    "check_id",
    "category",
    "reason_routed",
    "object_type",
    "object_name",
    "include",
    "line",
    "message",
    "confidence",
    "suggested_action",
    "sap_note",
    "context_url",
)


def write_human_review_queue(
    *,
    output_path: Path,
    routed_findings: list[RoutedFinding],
    category_by_check_id: dict[str, str] | None = None,
) -> None:
    """Write the CSV. ``category_by_check_id`` lets the orchestrator override
    the per-row ``category`` column (we don't carry check_id->category on the
    RoutedFinding itself)."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cat_map = category_by_check_id or {}

    with output_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(CSV_COLUMNS))
        writer.writeheader()
        for r in routed_findings:
            f = r.finding
            writer.writerow(
                {
                    "finding_id": f.finding_id or "",
                    "check_id": f.check_id,
                    "category": cat_map.get(f.check_id, ""),
                    "reason_routed": r.reason_routed,
                    "object_type": f.object_type,
                    "object_name": f.object_name,
                    "include": f.include,
                    "line": f.line,
                    "message": f.message,
                    # Empty confidence renders as the empty string between commas.
                    "confidence": "" if r.confidence is None else f"{r.confidence:.2f}",
                    "suggested_action": r.suggested_action,
                    "sap_note": "" if f.sap_note is None else f.sap_note,
                    "context_url": "",
                }
            )
