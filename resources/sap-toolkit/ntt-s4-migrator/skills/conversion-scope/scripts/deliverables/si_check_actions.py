"""SI Check results -> si-check-actions.md, the list somebody works through.

The export says which simplification items the customer's own system trips over.
What it does not say is whose problem each one is or what to do about it, and
that is the entire question the consultant was asked. So the document is built
around the ANSWER -- team, severity, next steps -- with the raw message
underneath for whoever disagrees.

Ordered by severity rather than by item id. A conversion is planned backwards
from the thing that stops it, and a stopper sorted alphabetically into the middle
of two hundred rows is a stopper nobody read.

Unanswered items are not dropped. They get their own section, counted and named:
a document that quietly omits what nobody has judged yet reads as complete while
the hard half is still open.

English, like the other five deliverables in this folder. The consultant localises
for the customer audience -- that is what the `exec-summary-customisation` guide
is for -- and a folder where one file is Turkish and five are not helps nobody.
"""

from __future__ import annotations

from pathlib import Path

from scripts.schemas import SICheckAction, SICheckFinding

# Worst first: the order a conversion is planned in.
_SEVERITY_ORDER = ["stopper", "high", "medium", "informational"]
_SEVERITY_LABEL = {
    "stopper": "STOPPER — the conversion cannot proceed until this is resolved",
    "high": "HIGH — must be resolved before go-live",
    "medium": "MEDIUM — must be planned",
    "informational": "INFORMATIONAL — may need no action",
}
_TEAM_LABEL = {"abap": "ABAP", "basis": "Basis", "functional": "Functional",
               "mixed": "More than one team"}


def _cell(text: str, limit: int = 0) -> str:
    """Markdown-table safe: a pipe or a newline in SAP message text breaks the row."""
    out = (text or "—").replace("|", "/").replace("\n", " ").strip()
    return out[:limit] if limit and len(out) > limit else out


def _row(f: SICheckFinding, a: SICheckAction) -> str:
    note = (f"[{f.sap_note_number}](https://me.sap.com/notes/{f.sap_note_number})"
            if f.sap_note_number else "—")
    count = str(f.affected_count) if f.affected_count is not None else "—"
    return (f"| `{f.item_id}` | {_cell(f.title)} | {_TEAM_LABEL.get(a.team, a.team)} "
            f"| {count} | {note} | {_cell(a.steps)} |")


def write_si_check_actions(
    findings: list[SICheckFinding],
    actions: dict[str, SICheckAction],
    output_path: Path,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = ["# Simplification Item Check — action list", ""]

    if not findings:
        # Said outright. An absent document and a clean check look identical from
        # a folder listing, and only one of them means nothing is blocking.
        lines += [
            "No SI Check export was read — `migration/inputs/si-check/` holds no file.",
            "",
            "**This does not mean nothing blocks the conversion.** It means the check "
            "has not been run yet, or its result has not been dropped in. Export the "
            "`/SDF/RC_START_CHECK` result to Excel and put it in that folder.",
            "",
        ]
        output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return

    needs = [f for f in findings if f.status in ("error", "warning", "unknown")]
    clean = len(findings) - len(needs)
    answered = [f for f in needs if f.item_id in actions]
    open_items = [f for f in needs if f.item_id not in actions]

    lines += [
        f"- Results read: **{len(findings)}**",
        f"- Needing a decision: **{len(needs)}** "
        f"({sum(1 for f in needs if f.status == 'error')} error, "
        f"{sum(1 for f in needs if f.status == 'warning')} warning, "
        f"{sum(1 for f in needs if f.status == 'unknown')} unclassified)",
        f"- Clean or not relevant: **{clean}**",
        "",
    ]

    by_sev: dict[str, list[SICheckFinding]] = {s: [] for s in _SEVERITY_ORDER}
    for f in answered:
        by_sev.setdefault(actions[f.item_id].severity, []).append(f)

    for sev in _SEVERITY_ORDER:
        rows = by_sev.get(sev) or []
        if not rows:
            continue
        lines += [f"## {_SEVERITY_LABEL[sev]}  ({len(rows)})", "",
                  "| Item | Title | Team | Affected | SAP Note | Steps |",
                  "|---|---|---|---|---|---|"]
        lines += [_row(f, actions[f.item_id]) for f in rows]
        lines.append("")
        # The reasoning is what a reviewer argues with, so it belongs on the page
        # rather than only in the answers file.
        for f in rows:
            reason = actions[f.item_id].reasoning.strip()
            if reason:
                lines += [f"**`{f.item_id}` — why:** {reason}", ""]
            if f.message:
                lines += [f"> {_cell(f.message)}", ""]

    if open_items:
        lines += [f"## Not yet decided  ({len(open_items)})", "",
                  "These items reported a problem, but nobody has said which team owns "
                  "them or what to do. The scope is not complete until they are "
                  "answered.", "",
                  "| Item | Title | Status | Message |", "|---|---|---|---|"]
        for f in open_items:
            status: str = f.status
            # A status this ingester could not map is worth showing as written --
            # it is the string someone needs in order to extend the table.
            if f.status == "unknown" and f.status_raw:
                status = f"unknown (`{_cell(f.status_raw)}`)"
            lines.append(f"| `{f.item_id}` | {_cell(f.title)} | {status} "
                         f"| {_cell(f.message, 120)} |")
        lines.append("")

    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
