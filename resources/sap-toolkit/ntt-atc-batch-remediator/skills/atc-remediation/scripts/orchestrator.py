"""Top-level orchestrator for the atc-remediation skill.

Subcommands:
  - ``run``    — ingest -> classify -> cluster -> write the PATCH QUEUE ->
                 ConfidenceJudge -> ZipBundler -> deliverables.
  - ``bundle`` — read the agent's drafted patches back and redo the second half.
  - ``verify`` — ingest the post-import recheck XML from
                 ``inputs/recheck-results/<batch_id>*`` and compare to the
                 original findings, appending a Verification section to the
                 remediation report.

Where the ABAP comes from
-------------------------
It used to come from ``judges/patch_generator.py``, which ran one ``claude -p``
subprocess per cluster. That worked in Claude Code and nowhere else: on
aXet.code, where these skills arrive as plain files dragged into an agent,
there is no ``claude`` CLI to shell out TO -- so the plugin's whole reason for
existing was unreachable for half its audience.

Now ``run`` writes ``remediation/work/patch-queue.json``: one entry per
cluster, carrying the findings and the pattern they must be fixed against. The
agent drafts the ABAP into ``patch-answers.json`` and ``bundle`` picks it up.
Everything downstream -- the 0.70 confidence threshold, the 25-object ZIP cap,
the human-review routing -- is unchanged and still deterministic.

The ``llm_wall_seconds`` / ``llm_wall_seconds_ceiling`` fields stay in the state
file at zero. Nothing spends subprocess wall-time any more, but hooks/stop.py
reads both keys on the Claude Code side and a missing key there is a crash.

Hooks (Plan 3) parse stdout LOGEVENT lines.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import click
from pydantic import ValidationError

from scripts.classifier import Classifier
from scripts.cluster_analyzer import ClusterAnalyzer
from scripts.confidence_judge import ConfidenceJudge
from scripts.deliverables.audit_trail import write_audit_trail
from scripts.deliverables.human_review_queue import write_human_review_queue
from scripts.deliverables.remediation_report import write_remediation_report
from scripts.ingesters.findings import FindingsIngester
from scripts.memory import ProjectMemory
from scripts.patterns import load_pattern
from scripts.schemas import (
    ATCFinding,
    Cluster,
    Patch,
    RoutedFinding,
)
from scripts.verifier import verify as verifier_verify
from scripts.zip_bundler import ZipBundler

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# Batch-id format minted by ZipBundler (b- prefix + 4+ digits). We re-validate
# at every entry point that interpolates a batch-id into a path glob or
# filename, because the regex in commands/verify.md is advisory — a caller
# bypassing the slash-command (direct python invocation) would skip it.
_BATCH_ID_RE = re.compile(r"^b-\d{4,}$")


def _log(event: str) -> None:
    print(f"LOGEVENT: {event}", flush=True)


def _find_one(folder: Path, suffix: str) -> Path | None:
    if not folder.is_dir():
        return None
    candidates = sorted(folder.glob(f"*{suffix}"))
    return candidates[0] if candidates else None


def _read_state(state_path: Path) -> dict[str, Any]:
    if state_path.is_file():
        try:
            parsed: dict[str, Any] = json.loads(state_path.read_text(encoding="utf-8"))
            return parsed
        except json.JSONDecodeError:
            pass
    return {
        "schema_version": 1,
        "llm_wall_seconds": 0.0,
        "llm_wall_seconds_ceiling": 900.0,
        "last_stage": None,
        "clusters_count": 0,
        "next_batch_id": 1,
    }


def _write_state(state_path: Path, state: dict[str, Any]) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")


def _persist_next_step(
    state_path: Path,
    state: dict[str, Any],
    *,
    step_id: str,
    kind: str,
    blocked: bool,
    reason: str = "",
) -> None:
    """Augment the persisted state with the Stop-hook contract fields.

    Stop hook reads: next_step_id, next_step_kind, blocked_on_human,
    llm_wall_seconds, llm_wall_seconds_ceiling, consecutive_auto_continues,
    max_consecutive. We layer those on top of the existing schema so the
    Plan 1/2 tests (which read last_stage, clusters_count, etc.) keep working.
    """
    state.setdefault("llm_wall_seconds", 0.0)
    state.setdefault("llm_wall_seconds_ceiling", 900.0)
    state.setdefault("consecutive_auto_continues", 0)
    state.setdefault("max_consecutive", 12)
    state["next_step_id"] = step_id
    state["next_step_kind"] = kind
    state["blocked_on_human"] = blocked
    if reason:
        state["next_step_reason"] = reason
    _write_state(state_path, state)


def _clusters_to_json(clusters: list[Cluster]) -> str:
    payload = {
        "schema_version": 1,
        "cluster_count": len(clusters),
        "clusters": [c.model_dump(mode="json") for c in clusters],
    }
    return json.dumps(payload, indent=2, sort_keys=True)


# ---------------------------------------------------------------- queue ------

def _queue_path(project: Path) -> Path:
    return project / "remediation" / "work" / "patch-queue.json"


def _answers_path(project: Path) -> Path:
    return project / "remediation" / "work" / "patch-answers.json"


def _write_patch_queue(project: Path, clusters: list[Cluster]) -> int:
    """Write one drafting request per fixable cluster.

    Judgment-shaped clusters are deliberately absent. The old PatchGenerator
    skipped them before spending a single LLM call, for the reason its own
    prompt gave: 'never speculate'. Putting them in the queue would invite
    exactly that -- an agent handed a request tends to answer it.

    Each entry carries the pattern INLINE rather than a slug to look up. The
    agent should not have to go find the file, and a queue that is complete on
    its own is one a consultant can read to see what was asked.
    """
    entries: list[dict[str, Any]] = []
    skipped_judgment = 0
    skipped_no_pattern = 0

    for cluster in clusters:
        if cluster.fix_shape == "judgment":
            skipped_judgment += 1
            continue
        pattern = load_pattern(cluster.category)
        if pattern is None:
            # Unknown category: no template to fix against, so no request.
            skipped_no_pattern += 1
            continue
        entries.append({
            "cluster_id": cluster.cluster_id,
            "check_id": cluster.check_id,
            "category": cluster.category,
            "fix_shape": cluster.fix_shape,
            "pattern": {
                "slug": pattern.slug,
                "priority": pattern.priority,
                "template_before": pattern.template.before,
                "template_after": pattern.template.after,
                "context_required": list(pattern.context_required),
                "confidence_high": list(pattern.confidence_signals.high),
                "confidence_low": list(pattern.confidence_signals.low),
            },
            "findings": [
                {
                    "finding_id": f.finding_id,
                    "object_type": f.object_type,
                    "object_name": f.object_name,
                    "include": f.include,
                    "line": f.line,
                    "message": f.message,
                }
                for f in cluster.findings
            ],
            # Answer shape: see SKILL.md, "Drafting a patch".
            "patches": [],
        })

    payload = {
        "schema": 1,
        "clusters": entries,
        "skipped": {
            "judgment_shape": skipped_judgment,
            "no_pattern_for_category": skipped_no_pattern,
        },
    }
    path = _queue_path(project)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    if skipped_judgment or skipped_no_pattern:
        _log(f"PatchQueue: skipped {skipped_judgment} judgment-shape and "
             f"{skipped_no_pattern} unknown-category cluster(s) — human review")
    return len(entries)


def _read_patch_answers(project: Path) -> list[Patch]:
    """Load the agent's drafted patches. A missing file means none yet, not an error.

    A malformed patch STOPS the run and names its cluster. Skipping it quietly
    would produce a ZIP that looks like a complete batch and is missing objects
    — and the consultant only finds out after importing it into a real system.
    """
    path = _answers_path(project)
    if not path.exists():
        return []

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        click.echo(f"HARD ERROR: {path} is not valid JSON — {exc}", err=True)
        sys.exit(2)

    patches: list[Patch] = []
    for entry in raw.get("clusters") or []:
        cluster_id = entry.get("cluster_id", "<unnamed>")
        for item in entry.get("patches") or []:
            data = dict(item)
            data.setdefault("cluster_id", cluster_id)
            data.setdefault("pattern_slug", entry.get("category", ""))
            try:
                patches.append(Patch.model_validate(data))
            except ValidationError as exc:
                click.echo(
                    f"HARD ERROR: cluster {cluster_id} has an invalid patch — {exc}",
                    err=True,
                )
                sys.exit(2)
    return patches


# Resolved from this file so it survives the install: the skill folder is copied
# whole into the cache and SKILL.md is rewritten to point at it, but nothing sets
# CLAUDE_PLUGIN_ROOT on a skills-only host.
SKILL_ROOT = Path(__file__).resolve().parent.parent
GUIDES_DIR = SKILL_ROOT / "references" / "guides"


@click.group()
def cli() -> None:
    """atc-remediation orchestrator."""


@cli.command()
@click.option(
    "--project",
    type=click.Path(file_okay=False, path_type=Path),
    default=Path("."),
    help="Project root.",
)
def init(project: Path) -> None:
    """Create ./remediation/ with PROJECT_PLAN.md, PROGRESS.md and LESSONS.md."""
    project = project.resolve()
    ProjectMemory(project).init_files()
    click.echo(f"Memory files initialised in {project / 'remediation'}")
    click.echo("Drop the ATC findings export at "
               "./remediation/inputs/findings/<name>.zip, then run: run")


@cli.command()
@click.argument("step_id", required=False)
def guide(step_id: str | None) -> None:
    """Print one workflow guide by step-id, or list them all."""
    # Membership-checked rather than interpolated: step_id reaches a path join,
    # and the guides are a closed set, so the check is both the safer one and
    # the better error message. commands/guide.md carried a regex for this; a
    # closed set beats a pattern.
    known = sorted(p.stem for p in GUIDES_DIR.glob("*.md"))
    if step_id is None:
        click.echo("Guides in this skill:\n  " + "\n  ".join(known))
        click.echo("\nUpstream data-collection steps (central ATC setup, basis "
                   "buy-in, CCMSIDB) live in the conversion-scope skill.")
        return
    if step_id not in known:
        click.echo(f"No guide '{step_id}'. Known steps:\n  " + "\n  ".join(known),
                   err=True)
        sys.exit(2)
    click.echo((GUIDES_DIR / f"{step_id}.md").read_text(encoding="utf-8"))


@cli.command()
@click.option(
    "--project",
    type=click.Path(file_okay=False, path_type=Path),
    default=Path("."),
    help="Project root containing ./remediation/inputs/findings/*.zip",
)
def run(project: Path) -> None:
    """Ingest findings, cluster them, write the patch queue, then bundle and
    report whatever patches have already been drafted."""
    project = project.resolve()
    inputs_dir = project / "remediation" / "inputs"
    output_dir = project / "remediation" / "output"
    state_path = project / "remediation" / ".atc-remediator-next-step.json"

    findings_zip = _find_one(inputs_dir / "findings", ".zip")
    if findings_zip is None:
        click.echo(
            f"HARD ERROR: no ATC findings ZIP found under {inputs_dir / 'findings'}. "
            "Drop the export from Tx ATC -> Manage Results -> Export to -> "
            "File for SAP Readiness Check there. See "
            "references/guides/atc-findings-export.md.",
            err=True,
        )
        sys.exit(2)

    state = _read_state(state_path)
    state["last_stage"] = "ingest"
    _persist_next_step(
        state_path, state,
        step_id="ingest", kind="agent", blocked=False,
    )

    _log(f"FindingsIngester: reading {findings_zip}")
    findings = FindingsIngester().load(findings_zip)
    _log(f"FindingsIngester: parsed {len(findings)} findings")

    state["last_stage"] = "classify"
    _write_state(state_path, state)
    _log("Classifier: bucketing by check_id")
    initial_clusters = Classifier().classify(findings)
    _log(f"Classifier: produced {len(initial_clusters)} initial clusters")

    state["last_stage"] = "cluster"
    _write_state(state_path, state)
    _log("ClusterAnalyzer: refining + applying 25-finding cap")
    clusters = ClusterAnalyzer().refine(initial_clusters)
    _log(f"ClusterAnalyzer: produced {len(clusters)} refined clusters")

    # Persist clusters.json as a debug artefact (Plan 1 smoke test depends on it).
    clusters_path = output_dir / "clusters.json"
    clusters_path.parent.mkdir(parents=True, exist_ok=True)
    clusters_path.write_text(_clusters_to_json(clusters), encoding="utf-8")
    _log(f"Orchestrator: wrote {clusters_path}")

    state["last_stage"] = "patch-queue"
    _write_state(state_path, state)
    open_clusters = _write_patch_queue(project, clusters)
    _log(f"PatchQueue: wrote {open_clusters} drafting request(s) to {_queue_path(project)}")

    # Answers may already exist from an earlier round. Re-running `run` after a
    # corrected export must not throw away drafting work already done.
    all_patches: list[Patch] = _read_patch_answers(project)
    if all_patches:
        _log(f"PatchQueue: reusing {len(all_patches)} drafted patch(es) from a previous round")

    _finish(project, state_path, state, findings, clusters, all_patches,
            open_clusters=open_clusters)


def _finish(
    project: Path,
    state_path: Path,
    state: dict[str, Any],
    findings: list[ATCFinding],
    clusters: list[Cluster],
    all_patches: list[Patch],
    *,
    open_clusters: int,
) -> None:
    """Second half of the pipeline: judge, bundle, report.

    Shared by `run` and `bundle` so the two entry points cannot drift. Every
    step below is deterministic -- the only thing that varies between the two
    is how many patches arrived.
    """
    output_dir = project / "remediation" / "output"
    patches_dir = output_dir / "patches"

    # ConfidenceJudge — deterministic split.
    state["last_stage"] = "confidence-judge"
    _write_state(state_path, state)
    judge = ConfidenceJudge()
    judge_result = judge.split(all_patches, findings)

    # ZipBundler — only on ship-set patches.
    state["last_stage"] = "zip-bundle"
    _write_state(state_path, state)
    bundler = ZipBundler(
        output_dir=patches_dir,
        batch_id_seed=int(state.get("next_batch_id", 1)),
    )
    manifests = bundler.bundle(judge_result.patches_for_zip)
    state["next_batch_id"] = bundler.batch_id_seed
    _write_state(state_path, state)
    _log(f"ZipBundler: produced {len(manifests)} ZIP(s)")
    if bundler.routed_patches:
        _log(
            f"ZipBundler: routed {len(bundler.routed_patches)} patch(es) to "
            "human review (multi-patch-per-object — needs manual merge)"
        )

    # No patches drafted yet: every finding belongs in the human-review queue.
    # This is the honest state of a first `run`, not a degraded mode — the
    # deliverables are complete and say plainly that nothing was fixed.
    routed: list[RoutedFinding] = list(judge_result.findings_for_human_review)
    if not all_patches:
        routed = [
            RoutedFinding(
                finding=f,
                reason_routed="no-patch-produced",
                suggested_action=(
                    "Draft a patch into remediation/work/patch-answers.json "
                    "(see SKILL.md), then run: bundle"
                ),
            )
            for f in findings
        ]

    # Multi-patch-per-object patches: surface as no-patch-produced rows so
    # the consultant sees them in human-review-queue.csv. v0.1 can't safely
    # merge two diffs against the same object; v0.2 backlog.
    findings_by_id = {f.finding_id: f for f in findings if f.finding_id}
    for orphan_patch in bundler.routed_patches:
        finding = findings_by_id.get(orphan_patch.finding_id)
        if finding is None:
            continue
        routed.append(
            RoutedFinding(
                finding=finding,
                reason_routed="no-patch-produced",
                confidence=orphan_patch.confidence,
                suggested_action=(
                    "multi-patch-per-object — needs manual merge "
                    "(v0.2 will splice via SourceIngester)"
                ),
            )
        )

    # Deliverables.
    state["last_stage"] = "deliverables"
    _write_state(state_path, state)

    write_remediation_report(
        output_path=output_dir / "remediation-report.md",
        total_findings=len(findings),
        manifests=manifests,
        routed_findings=routed,
        patches_drafted=bool(all_patches),
    )

    category_by_check_id = {c.check_id: c.category for c in clusters}
    write_human_review_queue(
        output_path=output_dir / "human-review-queue.csv",
        routed_findings=routed,
        category_by_check_id=category_by_check_id,
    )

    check_id_by_finding_id = {
        f.finding_id: f.check_id for f in findings if f.finding_id is not None
    }
    write_audit_trail(
        output_path=output_dir / "audit-trail.jsonl",
        patches=judge_result.patches_for_zip,
        manifests=manifests,
        check_id_by_finding_id=check_id_by_finding_id,
    )

    state["last_stage"] = "done"
    state["clusters_count"] = len(clusters)
    # Pipeline reached a natural pause point. Reset the auto-continue counter so
    # the next session does not start one step away from the cap.
    state["consecutive_auto_continues"] = 0
    if all_patches:
        # Patches exist and are bundled → the next move is the consultant's:
        # import the ZIPs via abapGit and re-run ATC.
        _persist_next_step(
            state_path, state,
            step_id="consultant-import-zip", kind="consultant",
            blocked=True, reason="pipeline complete; consultant action required",
        )
    else:
        # The queue is open and nothing is drafted: the next actor is the agent.
        # Saying "consultant" here would tell the Stop hook to halt while the
        # work it was asked to do has not started.
        _persist_next_step(
            state_path, state,
            step_id="draft-patch-queue", kind="agent",
            blocked=False, reason="patch queue written; no patches drafted yet",
        )

    click.echo(
        f"Done. {len(findings)} findings -> {len(clusters)} clusters -> "
        f"{len(judge_result.patches_for_zip)} patches in {len(manifests)} ZIP(s); "
        f"{len(routed)} routed to human review."
        + (f"\nPatch queue: {open_clusters} cluster(s) awaiting a draft in "
           f"{_queue_path(project)}\nDraft them into {_answers_path(project)}, "
           f"then run: bundle" if not all_patches and open_clusters else "")
    )


@cli.command()
@click.option(
    "--project",
    type=click.Path(file_okay=False, path_type=Path),
    default=Path("."),
    help="Project root.",
)
def bundle(project: Path) -> None:
    """Read the drafted patches back, then judge, bundle and report."""
    project = project.resolve()
    inputs_dir = project / "remediation" / "inputs"
    state_path = project / "remediation" / ".atc-remediator-next-step.json"

    if not _answers_path(project).exists():
        click.echo(
            f"HARD ERROR: {_answers_path(project)} not found. Draft the clusters in "
            f"{_queue_path(project)} first — see SKILL.md, 'Drafting a patch'.",
            err=True,
        )
        sys.exit(2)

    findings_zip = _find_one(inputs_dir / "findings", ".zip")
    if findings_zip is None:
        click.echo(
            f"HARD ERROR: no ATC findings ZIP found under {inputs_dir / 'findings'}.",
            err=True,
        )
        sys.exit(2)

    # Re-ingest rather than trust a cache between two commands: the day someone
    # drops a corrected export in and re-drafts, a stale cluster list would
    # bundle patches against findings that no longer exist.
    findings = FindingsIngester().load(findings_zip)
    clusters = ClusterAnalyzer().refine(Classifier().classify(findings))
    _log(f"Bundle: {len(findings)} findings -> {len(clusters)} clusters")

    patches = _read_patch_answers(project)
    _log(f"Bundle: {len(patches)} drafted patch(es) read back")

    state = _read_state(state_path)
    _finish(project, state_path, state, findings, clusters, patches,
            open_clusters=0)


@cli.command()
@click.option(
    "--project",
    type=click.Path(file_okay=False, path_type=Path),
    default=Path("."),
    help="Project root.",
)
@click.option(
    "--batch-id",
    required=True,
    help="Batch identifier (e.g. b-0001) — used to locate the recheck XML.",
)
def verify(project: Path, batch_id: str) -> None:
    """Compute the before/after finding-count delta for a batch and append a
    Verification section to remediation-report.md."""
    if not _BATCH_ID_RE.fullmatch(batch_id):
        click.echo(
            f"Invalid batch-id {batch_id!r}: must match ^b-\\d{{4,}}$ "
            "(e.g. b-0007). Refusing to glob with an unvalidated value.",
            err=True,
        )
        sys.exit(2)

    project = project.resolve()
    inputs_dir = project / "remediation" / "inputs"
    output_dir = project / "remediation" / "output"
    report_path = output_dir / "remediation-report.md"

    before_zip = _find_one(inputs_dir / "findings", ".zip")
    if before_zip is None:
        click.echo(
            f"HARD ERROR: no original findings ZIP under {inputs_dir / 'findings'}.",
            err=True,
        )
        sys.exit(2)

    after_dir = inputs_dir / "recheck-results"
    # Match either `<batch_id>*.xml` or `<batch_id>*.zip` (consultants drop
    # either format, depending on whether SAP wraps the recheck output).
    after_candidates: list[Path] = []
    if after_dir.is_dir():
        after_candidates.extend(sorted(after_dir.glob(f"{batch_id}*.zip")))
        after_candidates.extend(sorted(after_dir.glob(f"{batch_id}*.xml")))
    if not after_candidates:
        click.echo(
            f"HARD ERROR: no recheck file matching {batch_id}* under {after_dir}.",
            err=True,
        )
        sys.exit(2)
    after_path = after_candidates[0]

    before = FindingsIngester().load(before_zip)
    after: list[ATCFinding]
    if after_path.suffix == ".zip":
        after = FindingsIngester().load(after_path)
    else:
        # Raw XML — wrap as a one-member ZIP-equivalent via FindingsIngester._parse_xml
        xml_bytes = after_path.read_bytes()
        after = FindingsIngester()._parse_xml(xml_bytes)

    summary = verifier_verify(
        before=before,
        after=after,
        batch_id=batch_id,
        report_path=report_path,
    )
    click.echo(json.dumps(summary, indent=2, sort_keys=True))


if __name__ == "__main__":
    cli()
