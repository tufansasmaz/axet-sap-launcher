"""ConfidenceJudge — deterministic split of patches into ship-set + review-set.

NO LLM. Three deterministic rules, applied in order:

  1. Look up the pattern by ``patch.pattern_slug``.
     If ``pattern.fix_shape == "judgment"`` -> ALWAYS route the finding to
     human review (``reason_routed="categorically-judgment"``), regardless
     of how confident the LLM said it was. The pattern shape is the source
     of truth, not the model's self-assessment.
  2. Otherwise, if ``confidence >= 0.7`` -> ship-set.
  3. Otherwise -> human review (``reason_routed="low-confidence"``).

Plus the orchestrator-side guard:

  4. Any finding in ``all_findings_in_play`` for which PatchGenerator
     produced no patch -> human review
     (``reason_routed="no-patch-produced"``).
  5. Defensively: if a patch references a ``finding_id`` not present in
     ``all_findings_in_play`` -> raise ``ValueError`` (should never happen
     given the orchestrator wiring).
"""

from __future__ import annotations

from pathlib import Path

import yaml  # type: ignore[import-untyped]

from scripts.schemas import (
    ATCFinding,
    ConfidenceJudgeResult,
    Patch,
    Pattern,
    RoutedFinding,
)

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
PATTERNS_DIR = PLUGIN_ROOT / "references" / "patterns"

SHIP_THRESHOLD = 0.7


def _load_pattern(slug: str, patterns_dir: Path) -> Pattern | None:
    path = patterns_dir / f"{slug}.yaml"
    if not path.is_file():
        return None
    body = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(body, dict):
        return None
    body.setdefault("slug", slug)
    return Pattern.model_validate(body)


class ConfidenceJudge:
    """Deterministic ship-vs-review classifier."""

    def __init__(self, patterns_dir: Path | None = None) -> None:
        self.patterns_dir = patterns_dir or PATTERNS_DIR

    def split(
        self,
        patches: list[Patch],
        all_findings_in_play: list[ATCFinding],
    ) -> ConfidenceJudgeResult:
        # Index findings by finding_id for fast lookup.
        findings_by_id: dict[str, ATCFinding] = {}
        for f in all_findings_in_play:
            if f.finding_id is None:
                continue
            findings_by_id[f.finding_id] = f

        patches_for_zip: list[Patch] = []
        routed: list[RoutedFinding] = []
        covered_finding_ids: set[str] = set()

        for patch in patches:
            fid = patch.finding_id
            # Defensive: a patch with a missing/empty finding_id back-pointer
            # cannot be matched to a finding and would crash the later
            # findings_by_id[fid] lookup. Route the orphan to the human-review
            # queue with an actionable reason rather than raising — this can
            # happen if PatchGenerator's LLM call drops the finding_id field.
            if not fid or fid not in findings_by_id:
                # We can't synthesize a RoutedFinding without an ATCFinding,
                # so create a synthetic placeholder so the audit trail shows
                # the orphan and a human can investigate.
                synthetic_finding = ATCFinding(
                    run_id="(unknown)",
                    object_type=patch.object_type,
                    object_name=patch.object_name,
                    include=patch.object_name,
                    line=0,
                    column=0,
                    check_id=f"orphan:{patch.pattern_slug}",
                    priority=3,
                    message=(
                        "Patch produced without a valid finding_id back-pointer "
                        f"(fid={fid!r}); cannot match to any ATCFinding."
                    ),
                    sap_note=None,
                    finding_id=None,
                )
                routed.append(
                    RoutedFinding(
                        finding=synthetic_finding,
                        reason_routed="no-patch-produced",
                        confidence=patch.confidence,
                        suggested_action=(
                            "patch missing finding_id back-pointer — re-run "
                            "PatchGenerator for this cluster or inspect the "
                            "LLM transcript."
                        ),
                    )
                )
                continue

            covered_finding_ids.add(fid)

            pattern = _load_pattern(patch.pattern_slug, self.patterns_dir)
            if pattern is not None and pattern.fix_shape == "judgment":
                routed.append(
                    RoutedFinding(
                        finding=findings_by_id[fid],
                        reason_routed="categorically-judgment",
                        confidence=patch.confidence,
                        suggested_action=(
                            "Pattern is categorically judgment-shaped — "
                            "review the LLM draft before applying."
                        ),
                    )
                )
                continue

            if patch.confidence >= SHIP_THRESHOLD:
                patches_for_zip.append(patch)
            else:
                routed.append(
                    RoutedFinding(
                        finding=findings_by_id[fid],
                        reason_routed="low-confidence",
                        confidence=patch.confidence,
                        suggested_action=(
                            "Confidence below 0.7 — verify the patch context "
                            "before applying."
                        ),
                    )
                )

        # Findings without a patch -> route as no-patch-produced.
        for fid, finding in findings_by_id.items():
            if fid in covered_finding_ids:
                continue
            routed.append(
                RoutedFinding(
                    finding=finding,
                    reason_routed="no-patch-produced",
                    confidence=None,
                    suggested_action=(
                        "PatchGenerator produced no patch for this finding."
                    ),
                )
            )

        return ConfidenceJudgeResult(
            patches_for_zip=patches_for_zip,
            findings_for_human_review=routed,
        )
