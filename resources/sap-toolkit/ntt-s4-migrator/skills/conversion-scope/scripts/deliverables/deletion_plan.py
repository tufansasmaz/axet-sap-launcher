"""deletion-plan.md writer.

Lists custom objects with calls_12mo=0 (dead code) and includes SE38 / SE80
commands to delete each object.

Edge cases:
- Empty usage list → guidance note referencing the susg-aggregation guide.
- No zero-call rows → "No dead-code candidates detected." message.
"""

from pathlib import Path

from scripts.schemas import UsageRow

# Object types deletable via SE38 (programs/reports)
_SE38_TYPES = {"PROG", "REPS", "REPT", "FUNC"}


def _delete_command(row: UsageRow) -> str:
    """Return the SAP transaction command appropriate for the object type."""
    if row.object_type in _SE38_TYPES:
        return f"SE38 → open `{row.object_name}` → Menu: Program > Delete"
    return f"SE80 → Repository Browser → open `{row.object_name}` → right-click > Delete"


def write_deletion_plan(usage: list[UsageRow], out_path: Path) -> None:
    """Write output/deletion-plan.md.

    Parameters
    ----------
    usage:
        Rows from the SUSG / CCM Fiori app usage export.  An empty list means
        no usage data was provided.
    out_path:
        Destination path (parent dirs created automatically).
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if not usage:
        out_path.write_text(
            "# Deletion Plan\n\n"
            "No SUSG usage data provided; deletion plan cannot be generated.\n"
            "See guide **susg-aggregation** for instructions on exporting usage data.\n",
            encoding="utf-8",
        )
        return

    dead = [row for row in usage if row.calls_12mo == 0]

    if not dead:
        out_path.write_text(
            "# Deletion Plan\n\n"
            "No dead-code candidates detected.\n\n"
            "All custom objects in the SUSG export had at least one call in the last 12 months.\n",
            encoding="utf-8",
        )
        return

    lines = [
        "# Deletion Plan",
        "",
        f"The following **{len(dead)}** custom object(s) recorded **0 calls** in the last 12"
        " months and are candidates for deletion.",
        "",
        "> **Before deleting:** confirm with the business owner that the object is truly unused.",
        "> Transport the deletion to all affected systems.",
        "",
        "## Dead-code candidates",
        "",
        "| # | Type | Object | Package | Last Call | Delete command |",
        "|---|------|--------|---------|-----------|----------------|",
    ]

    for idx, row in enumerate(dead, start=1):
        cmd = _delete_command(row)
        lines.append(
            f"| {idx} | {row.object_type} | `{row.object_name}` | {row.package}"
            f" | {row.last_call or '—'} | {cmd} |"
        )

    lines += [
        "",
        "## Step-by-step deletion procedure",
        "",
        "For each object above:",
        "",
        "1. **SE38** (programs) or **SE80** (other types): open the object.",
        "2. Execute the delete action from the menu.",
        "3. Create a transport request; add to the relevant CTS project.",
        "4. Import to QA for regression test, then to PRD.",
        "",
    ]

    out_path.write_text("\n".join(lines), encoding="utf-8")
