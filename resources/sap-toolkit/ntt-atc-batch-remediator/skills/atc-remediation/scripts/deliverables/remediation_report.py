"""Write the consultant-facing remediation report (markdown).

Sections:
  - Summary (counts: findings analysed / patches in ZIPs / queued for review)
  - "What was fixed" — one row per ZIP manifest with object_count + link
  - "What was queued" — count by reason_routed + top-10 distinct check_ids
  - Per-category narrative — slug, object_count, batch_id, ZIP path
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path

from scripts.schemas import RoutedFinding, ZipBundleManifest


def write_remediation_report(
    *,
    output_path: Path,
    total_findings: int,
    manifests: list[ZipBundleManifest],
    routed_findings: list[RoutedFinding],
    patches_drafted: bool,
) -> None:
    """Write the remediation report to ``output_path``.

    The Verifier appends to this file later — so we end with a stable marker
    line to make the append boundary unambiguous.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)

    patches_in_zips = sum(len(m.included_finding_ids) for m in manifests)
    queued = len(routed_findings)

    lines: list[str] = []
    lines.append("# ATC Remediation Report\n")
    lines.append("## Summary\n")
    lines.append(f"- Findings analysed: **{total_findings}**")
    lines.append(f"- Patches packaged into ZIPs: **{patches_in_zips}**")
    lines.append(f"- Findings queued for human review: **{queued}**")
    lines.append(f"- ZIPs produced: **{len(manifests)}**")
    if not patches_drafted:
        # Said plainly, because the numbers above are all zero and a reader
        # deserves to know whether that means "nothing to fix" or "nobody has
        # fixed anything yet". It is the second.
        lines.append(
            "- _No patches drafted yet — every finding was routed to the "
            "human-review queue. The patch queue is open; once patches are "
            "drafted, re-run `bundle` and this report is rewritten._"
        )
    lines.append("")

    lines.append("## What was fixed\n")
    if not manifests:
        lines.append("_No patches were packaged in this run._\n")
    else:
        lines.append("| Category | Batch ID | Objects | ZIP |")
        lines.append("|---|---|---:|---|")
        for m in manifests:
            zip_name = Path(m.zip_path).name
            lines.append(
                f"| {m.category_slug} | {m.batch_id} | {m.object_count} | "
                f"`{zip_name}` ([file]({m.zip_path})) |"
            )
        lines.append("")

    lines.append("## What was queued\n")
    if not routed_findings:
        lines.append("_Nothing queued — every finding was packaged._\n")
    else:
        by_reason = Counter(r.reason_routed for r in routed_findings)
        lines.append("| Reason routed | Count |")
        lines.append("|---|---:|")
        for reason, count in sorted(by_reason.items()):
            lines.append(f"| {reason} | {count} |")
        lines.append("")
        top_checks = Counter(r.finding.check_id for r in routed_findings).most_common(10)
        lines.append("### Top 10 check_ids in the review queue")
        lines.append("")
        for check_id, count in top_checks:
            lines.append(f"- `{check_id}` — {count}")
        lines.append("")

    lines.append("## Per-category narrative\n")
    if not manifests:
        lines.append("_No categories shipped in this run._\n")
    else:
        for m in manifests:
            lines.append(f"### {m.category_slug} — {m.batch_id}")
            lines.append(
                f"Packaged {m.object_count} object(s) covering "
                f"{len(m.included_finding_ids)} finding(s)."
            )
            lines.append(f"- ZIP path: `{m.zip_path}`")
            lines.append("")

    lines.append("<!-- end:remediation-report -->")
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
