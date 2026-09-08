"""fix-backlog.csv writer.

One row per (finding cluster) grouped by ``<check_id>::<object_name>``.

Columns:
    Pattern, Object, Line, Check ID, SAP Note, Priority,
    Effort, Impact, Recommended action
"""

import csv
from pathlib import Path

from scripts.schemas import ATCFinding, ImpactClassification

_FIELDNAMES = [
    "Pattern",
    "Object",
    "Line",
    "Check ID",
    "SAP Note",
    "Priority",
    "Effort",
    "Impact",
    "Recommended action",
]


def _recommended_action(cls: ImpactClassification) -> str:
    """Derive a short recommended action string from an ImpactClassification."""
    if cls.impact == "high":
        return f"Remediate urgently ({cls.effort}-effort): {cls.reasoning}"
    if cls.impact == "medium":
        return f"Schedule remediation ({cls.effort}-effort): {cls.reasoning}"
    return f"Consider remediation ({cls.effort}-effort): {cls.reasoning}"


def write_fix_backlog(
    findings: list[ATCFinding],
    classifications_by_cluster: dict[str, ImpactClassification],
    out_path: Path,
) -> None:
    """Write output/fix-backlog.csv.

    Parameters
    ----------
    findings:
        ATC findings from the customer system.
    classifications_by_cluster:
        Mapping of ``<check_id>::<object_name>`` → ImpactClassification.
        If a cluster has no classification, Effort/Impact/Recommended action
        columns are written as empty strings.
    out_path:
        Destination path (parent dirs created automatically).
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=_FIELDNAMES)
        writer.writeheader()

        for finding in findings:
            cluster_id = f"{finding.check_id}::{finding.object_name}"
            cls = classifications_by_cluster.get(cluster_id)

            short_check = finding.check_id.split("::")[-1].lower().replace("_", "-")
            pattern = f"atc-{short_check}-{finding.object_name.lower()}"

            writer.writerow({
                "Pattern": pattern,
                "Object": finding.object_name,
                "Line": str(finding.line),
                "Check ID": finding.check_id,
                "SAP Note": str(finding.sap_note) if finding.sap_note is not None else "",
                "Priority": str(finding.priority),
                "Effort": cls.effort if cls else "",
                "Impact": cls.impact if cls else "",
                "Recommended action": _recommended_action(cls) if cls else "",
            })
