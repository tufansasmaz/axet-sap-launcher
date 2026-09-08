"""exec-summary.md writer.

Produces a 1-page markdown executive summary with:
  - Scope summary
  - Top 10 impacts (sorted high → low impact, then S/M/L effort)
  - Effort estimate
  - Recommended next steps
"""

from pathlib import Path

from scripts.schemas import ATCFinding, ImpactClassification, SimplificationItem

_IMPACT_ORDER = {"high": 0, "medium": 1, "low": 2}
_EFFORT_ORDER = {"S": 0, "M": 1, "L": 2}


def write_exec_summary(
    items: list[SimplificationItem],
    findings: list[ATCFinding],
    impact_classifications: list[tuple[str, ImpactClassification]],
    out_path: Path,
) -> None:
    """Write output/exec-summary.md.

    Parameters
    ----------
    items:
        Simplification catalogue rows.
    findings:
        ATC findings from the customer system.
    impact_classifications:
        Sequence of (cluster_id, ImpactClassification) pairs.  cluster_id is
        ``<check_id>::<object_name>`` by convention.
    out_path:
        Destination path (parent dirs created automatically).
    """
    # Build a lookup: cluster_id → (classification, finding)
    cls_map: dict[str, ImpactClassification] = {cid: cls for cid, cls in impact_classifications}

    # Attach classification to each finding where available
    enriched: list[tuple[ATCFinding, ImpactClassification | None]] = []
    for f in findings:
        cluster_id = f"{f.check_id}::{f.object_name}"
        enriched.append((f, cls_map.get(cluster_id)))

    # Sort: classified first (high→low impact, S→L effort), unclassified at end
    def _sort_key(pair: tuple[ATCFinding, ImpactClassification | None]) -> tuple[int, int, int]:
        _, cls = pair
        if cls is None:
            return (99, 99, 99)
        return (
            _IMPACT_ORDER.get(cls.impact, 99),
            _EFFORT_ORDER.get(cls.effort, 99),
            pair[0].priority,
        )

    enriched.sort(key=_sort_key)
    top10 = enriched[:10]

    # ── Scope summary ────────────────────────────────────────────────────────
    unique_objects = {f.object_name for f in findings}
    unique_checks = {f.check_id for f in findings}
    note_count = len({f.sap_note for f in findings if f.sap_note})
    item_count = len(items)

    scope_lines = [
        f"- **Simplification catalogue items loaded:** {item_count}",
        f"- **ATC findings:** {len(findings)} across {len(unique_objects)} custom object(s)",
        f"- **Distinct ATC checks triggered:** {len(unique_checks)}",
        f"- **SAP Notes referenced:** {note_count}",
    ]

    # ── Top 10 impacts table ─────────────────────────────────────────────────
    top10_rows: list[str] = []
    if top10:
        top10_rows.append("| # | Object | Check ID | Impact | Effort | Priority |")
        top10_rows.append("|---|--------|----------|--------|--------|----------|")
        for idx, (f, cls) in enumerate(top10, start=1):
            impact = cls.impact if cls else "—"
            effort = cls.effort if cls else "—"
            top10_rows.append(
                f"| {idx} | {f.object_name} | {f.check_id} | {impact} | {effort} | {f.priority} |"
            )
    else:
        top10_rows.append("*No classified findings available.*")

    # ── Effort estimate ───────────────────────────────────────────────────────
    s_count = sum(1 for _, cls in enriched if cls and cls.effort == "S")
    m_count = sum(1 for _, cls in enriched if cls and cls.effort == "M")
    l_count = sum(1 for _, cls in enriched if cls and cls.effort == "L")
    unclassified = sum(1 for _, cls in enriched if cls is None)

    effort_lines = [
        "| Effort | Count |",
        "|--------|-------|",
        f"| S (small, < 1d) | {s_count} |",
        f"| M (medium, 1-3d) | {m_count} |",
        f"| L (large, > 3d) | {l_count} |",
        f"| Unclassified | {unclassified} |",
    ]

    # ── Next steps ────────────────────────────────────────────────────────────
    next_steps = [
        "1. Review the **fix-backlog.csv** and assign owners for high-impact, S-effort items"
        " first.",
        "2. Validate dead-code candidates from **deletion-plan.md** with business owners"
        " before removal.",
        "3. Read per-note summaries in **notes-summaries/** to understand SAP-mandated changes.",
        "4. Re-run ATC after remediation cycles to track progress.",
        "5. Schedule a stakeholder review once all high-impact items are remediated or exempted.",
    ]

    # ── Assemble document ────────────────────────────────────────────────────
    md = "\n".join([
        "# S/4HANA Migration — Executive Summary",
        "",
        "## Scope summary",
        "",
        *scope_lines,
        "",
        "## Top 10 impacts",
        "",
        *top10_rows,
        "",
        "## Effort estimate",
        "",
        *effort_lines,
        "",
        "## Recommended next steps",
        "",
        *next_steps,
        "",
    ])

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(md, encoding="utf-8")
