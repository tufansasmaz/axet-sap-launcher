"""Verifier — compute before/after finding-count delta for a batch.

Inputs:
  - ``before`` and ``after`` lists of ATCFindings (one from the original ATC
    export, one from the post-import recheck XML).
  - ``batch_id``, ``report_path``.

The "fingerprint" of a finding is
``(object_type, object_name.upper(), line, check_id)``. Findings present
in both before and after are "remaining"; only in before -> "resolved";
only in after -> "new" (regression).

The result dict (also stdout-friendly) gets appended to the remediation
report under a fresh ``## Verification — batch <id>`` section.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

from scripts.schemas import ATCFinding


def _fingerprint(f: ATCFinding) -> tuple[str, str, int, str]:
    return (f.object_type.upper(), f.object_name.upper(), f.line, f.check_id)


def verify(
    *,
    before: list[ATCFinding],
    after: list[ATCFinding],
    batch_id: str,
    report_path: Path,
) -> dict[str, Any]:
    """Compute the delta and append a Verification section to ``report_path``.

    Returns a dict with: resolved_count, remaining_count, new_count,
    delta_per_category. Resolution semantics:

      resolved  = before  - after
      remaining = before  & after
      new       = after   - before
    """
    before_set = {_fingerprint(f) for f in before}
    after_set = {_fingerprint(f) for f in after}

    resolved = before_set - after_set
    remaining = before_set & after_set
    new = after_set - before_set

    # delta_per_category[check_id] = after.count(check_id) - before.count(check_id)
    before_counter = Counter(f.check_id for f in before)
    after_counter = Counter(f.check_id for f in after)
    all_check_ids = set(before_counter) | set(after_counter)
    delta_per_category = {
        cid: after_counter.get(cid, 0) - before_counter.get(cid, 0)
        for cid in sorted(all_check_ids)
    }

    summary: dict[str, Any] = {
        "batch_id": batch_id,
        "before_total": len(before),
        "after_total": len(after),
        "resolved_count": len(resolved),
        "remaining_count": len(remaining),
        "new_count": len(new),
        "delta_per_category": delta_per_category,
    }

    _append_section(report_path, batch_id, summary)
    return summary


def _append_section(report_path: Path, batch_id: str, summary: dict[str, Any]) -> None:
    report_path.parent.mkdir(parents=True, exist_ok=True)
    existing = report_path.read_text(encoding="utf-8") if report_path.is_file() else ""

    lines: list[str] = []
    lines.append("")
    lines.append(f"## Verification — batch {batch_id}")
    lines.append("")
    lines.append(f"- Before total: **{summary['before_total']}**")
    lines.append(f"- After total: **{summary['after_total']}**")
    lines.append(f"- Resolved: **{summary['resolved_count']}**")
    lines.append(f"- Remaining: **{summary['remaining_count']}**")
    lines.append(f"- New (regressions): **{summary['new_count']}**")
    lines.append("")
    if summary["delta_per_category"]:
        lines.append("| check_id | delta (after - before) |")
        lines.append("|---|---:|")
        for cid, delta in summary["delta_per_category"].items():
            lines.append(f"| `{cid}` | {delta:+d} |")
    lines.append("")

    new_body = existing.rstrip("\n") + "\n" + "\n".join(lines) + "\n"
    report_path.write_text(new_body, encoding="utf-8")
