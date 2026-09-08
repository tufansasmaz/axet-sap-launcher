"""Top-level orchestrator for the conversion-scope skill.

Two commands, and the split between them is the whole design:

    analyze          ingest -> graph -> deliverables, plus a JUDGMENT QUEUE
    apply-judgment   read the agent's answers back, rewrite the deliverables

Everything `analyze` does is deterministic: the same inputs produce the same
outputs on any machine, with no model in the loop. What a model is actually
needed for -- "how much does this simplification item cost THIS customer", "what
does this SAP Note mean for the project" -- is not computed here at all. It is
written out as a queue of questions, answered by the agent reading SKILL.md, and
fed back through `apply-judgment`.

This used to be a `--with-judgment` flag that shelled out to `claude -p` through
scripts/llm_client.py. That worked in Claude Code and nowhere else: on
aXet.code, where these skills are dragged in as plain files, there is no `claude`
CLI to shell out TO. The queue seam runs identically on both, and it buys two
things the subprocess never had -- the work can be interrupted and resumed, and
every judgment lands on disk where a consultant can read and overrule it.

Inputs  : ./migration/inputs/{ccmsidb,atc,susg,readiness-check,notes}/
Working : ./migration/work/judgment-queue.json, judgment-answers.json
Outputs : ./migration/output/
State   : ./migration/.s4-migrator-next-step.json
"""

import json
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import click

from scripts.deliverables.deletion_plan import write_deletion_plan
from scripts.deliverables.exec_summary import write_exec_summary
from scripts.deliverables.fix_backlog import write_fix_backlog
from scripts.deliverables.impact_table import write_impact_table, write_impact_table_md
from scripts.deliverables.notes_summaries import write_notes_summaries
from scripts.deliverables.si_check_actions import write_si_check_actions
from scripts.graph import build_graph
from scripts.guide_loader import load_guides, next_step
from scripts.ingesters.atc import ATCIngester
from scripts.ingesters.catalog import CatalogIngester
from scripts.ingesters.notes import NotesIngester
from scripts.ingesters.readiness import ReadinessIngester
from scripts.ingesters.si_check import SICheckIngester
from scripts.ingesters.usage import UsageIngester
from scripts.memory import ProjectMemory
from scripts.schemas import (
    ATCFinding,
    ImpactClassification,
    NoteText,
    ReadinessTile,
    SICheckAction,
    SICheckFinding,
    SimplificationItem,
    UsageRow,
)

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

# How much of a Note goes into the queue. The full text of an SAP Note routinely
# runs to tens of thousands of characters and the summary asks for 3-5
# sentences; shipping the whole thing would bloat the queue file without
# improving the answer. Same number the old NoteSummariser used.
MAX_NOTE_CHARS = 4000

# Resolved from this file so it survives the install: the skill folder is copied
# whole into the cache and SKILL.md is rewritten to point at it, but nothing sets
# CLAUDE_PLUGIN_ROOT on a skills-only host.
SKILL_ROOT = Path(__file__).resolve().parent.parent
GUIDES_DIR = SKILL_ROOT / "references" / "guides"


def _log(event: str) -> None:
    """Emit a journal line that the PostToolUse hook parses (Claude Code only)."""
    print(f"LOGEVENT: {event}", flush=True)


def _find_one(folder: Path, suffix: str) -> Path | None:
    if not folder.is_dir():
        return None
    candidates = sorted(folder.glob(f"*{suffix}"))
    return candidates[0] if candidates else None


def _write_next_step(
    project: Path,
    next_step_id: str,
    next_step_kind: str = "agent",
    blocked_on_human: bool = False,
    reason: str = "",
    llm_wall_seconds_so_far: float = 0.0,
    llm_wall_seconds_ceiling_arg: float = 600.0,
) -> None:
    """Write ./migration/.s4-migrator-next-step.json for the Stop hook.

    The two `llm_wall_seconds*` fields are always 0 now that nothing here spends
    subprocess wall-time. They stay in the file because hooks/stop.py reads them
    on the Claude Code side and a missing key there is a crash, not a default.
    """
    state_path = project / "migration" / ".s4-migrator-next-step.json"
    # Preserve consecutive counter if file already exists
    existing: dict[str, object] = {}
    if state_path.exists():
        try:
            existing = json.loads(state_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    state = {
        "next_step_id": next_step_id,
        "next_step_kind": next_step_kind,
        "blocked_on_human": blocked_on_human,
        "reason": reason,
        "llm_wall_seconds": llm_wall_seconds_so_far,
        "llm_wall_seconds_ceiling": llm_wall_seconds_ceiling_arg,
        "consecutive_auto_continues": existing.get("consecutive_auto_continues", 0),
        "max_consecutive": 12,
    }
    state_path.write_text(json.dumps(state, indent=2), encoding="utf-8")


def cluster_key(finding: ATCFinding) -> str:
    """The judgment unit: one check on one object, however many findings it has.

    Judging per FINDING would ask the same question hundreds of times for one
    SELECT * across a report. Judging per CHECK would average an obsolete FM in
    a dead program against the same FM in a nightly job.
    """
    return f"{finding.check_id}::{finding.object_name}"


# --------------------------------------------------------------- ingest ------

@dataclass
class Inputs:
    """Everything the deliverable writers need, read once from disk."""

    items: list[SimplificationItem]
    findings: list[ATCFinding]
    usage: list[UsageRow]
    rc_tiles: list[ReadinessTile]
    notes_text: list[NoteText]
    si_check: list[SICheckFinding]


def _ingest(project: Path, *, quiet: bool = False) -> Inputs:
    """Run every ingester. Hard-errors on the two required inputs."""
    inputs = project / "migration" / "inputs"

    ccmsidb_zip = _find_one(inputs / "ccmsidb", ".zip")
    if ccmsidb_zip is None:
        click.echo(
            f"HARD ERROR: no CCMSIDB ZIP found under {inputs / 'ccmsidb'}. "
            "Read references/guides/ccmsidb-download.md.",
            err=True,
        )
        sys.exit(2)

    atc_zip = _find_one(inputs / "atc", ".zip")
    if atc_zip is None:
        click.echo(
            f"HARD ERROR: no ATC export ZIP found under {inputs / 'atc'}. "
            "Read references/guides/atc-results-export.md.",
            err=True,
        )
        sys.exit(2)

    usage_path = _find_one(inputs / "susg", ".csv")   # None if folder/file missing
    rc_dir = inputs / "readiness-check"               # may not exist; ingester handles
    notes_dir = inputs / "notes"                      # may not exist; ingester handles
    si_dir = inputs / "si-check"                      # may not exist; ingester handles

    def say(msg: str) -> None:
        if not quiet:
            _log(msg)

    say(f"CatalogIngester: reading {ccmsidb_zip}")
    items = CatalogIngester().load(ccmsidb_zip)
    say(f"CatalogIngester: parsed {len(items)} simplification items")
    if not quiet:
        _write_next_step(project, "atc-ingest", reason="CatalogIngester complete")

    say(f"ATCIngester: reading {atc_zip}")
    findings = ATCIngester().load(atc_zip)
    say(f"ATCIngester: parsed {len(findings)} findings")
    if not quiet:
        _write_next_step(project, "optional-ingest", reason="ATCIngester complete")

    say(f"UsageIngester: reading {usage_path}")
    usage = UsageIngester().load(usage_path)
    say(f"UsageIngester: loaded {len(usage)} usage rows")

    say(f"ReadinessIngester: scanning {rc_dir}")
    rc_tiles = ReadinessIngester().load_dir(rc_dir)
    say(f"ReadinessIngester: loaded {len(rc_tiles)} tiles")

    say(f"NotesIngester: scanning {notes_dir}")
    notes_text = NotesIngester().load_dir(notes_dir)
    say(f"NotesIngester: loaded {len(notes_text)} notes")

    # The Simplification Database says what SAP simplified; this says what the
    # customer's own system does about it. An item can be catalogued and
    # irrelevant here, or catalogued and blocking, and a conversion is not scoped
    # without both. Optional because a project may not have run the check yet --
    # but a file that is THERE and unreadable raises rather than counting as
    # absent, which is why SchemaUnknown is not swallowed.
    say(f"SICheckIngester: scanning {si_dir}")
    si_check = SICheckIngester().load_dir(si_dir)
    blocking = sum(1 for f in si_check if f.status in ("error", "warning", "unknown"))
    say(f"SICheckIngester: loaded {len(si_check)} results ({blocking} need a decision)")

    return Inputs(items, findings, usage, rc_tiles, notes_text, si_check)


# ---------------------------------------------------------------- queue ------

def _queue_path(project: Path) -> Path:
    return project / "migration" / "work" / "judgment-queue.json"


def _answers_path(project: Path) -> Path:
    return project / "migration" / "work" / "judgment-answers.json"


def _write_queue(project: Path, data: Inputs) -> int:
    """Write the questions only an ABAP consultant (or an agent acting as one) can answer."""
    clusters: dict[str, list[ATCFinding]] = defaultdict(list)
    for f in data.findings:
        clusters[cluster_key(f)].append(f)

    cluster_entries: list[dict[str, Any]] = [
        {
            "cluster_id": cid,
            "check_id": rows[0].check_id,
            "object_type": rows[0].object_type,
            "object_name": rows[0].object_name,
            "finding_count": len(rows),
            "sample_message": rows[0].message,
            "sap_note": rows[0].sap_note,
            # Answer shape: see SKILL.md "Judging a cluster".
            "answer": {"impact": None, "effort": None,
                       "confidence": None, "reasoning": None},
        }
        for cid, rows in sorted(clusters.items())
    ]
    note_entries: list[dict[str, Any]] = [
        {
            "note_number": n.note_number,
            "text_excerpt": n.text[:MAX_NOTE_CHARS],
            "answer": {"summary": None},
        }
        for n in sorted(data.notes_text, key=lambda n: n.note_number)
    ]

    # Only what needs a decision. An item that came back ok or not-relevant needs
    # no team and no steps; queueing it would bury the handful that block the
    # conversion under a few hundred that do not. `unknown` IS queued: a status
    # this ingester could not map is exactly the case a human should look at.
    si_entries: list[dict[str, Any]] = [
        {
            "item_id": f.item_id,
            "title": f.title,
            "status": f.status,
            "status_raw": f.status_raw,
            "message": f.message,
            "sap_note": f.sap_note_number,
            "affected_count": f.affected_count,
            "area": f.area,
            # Answer shape: see SKILL.md "Routing an SI Check result".
            "answer": {"team": None, "severity": None,
                       "steps": None, "reasoning": None},
        }
        for f in sorted(data.si_check, key=lambda f: (f.status, f.item_id))
        if f.status in ("error", "warning", "unknown")
    ]

    queue = {"schema": 1, "clusters": cluster_entries, "notes": note_entries,
             "si_check": si_entries}
    path = _queue_path(project)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(queue, indent=2, ensure_ascii=False), encoding="utf-8")
    return len(cluster_entries) + len(note_entries) + len(si_entries)


def _read_answers(
    project: Path,
) -> tuple[dict[str, ImpactClassification], dict[int, str], dict[str, SICheckAction]]:
    """Load judgment-answers.json. Missing file is not an error -- it means no judgment yet.

    An answer that fails validation STOPS the run and names the cluster. The
    alternative -- skipping it quietly -- produces a fix-backlog that looks
    complete and is missing rows, which is the failure mode this whole seam
    exists to avoid.
    """
    path = _answers_path(project)
    if not path.exists():
        return {}, {}, {}

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        click.echo(f"HARD ERROR: {path} is not valid JSON -- {exc}", err=True)
        sys.exit(2)

    classifications: dict[str, ImpactClassification] = {}
    for entry in raw.get("clusters") or []:
        cid = entry.get("cluster_id")
        answer = entry.get("answer") or {}
        if not cid or answer.get("impact") is None:
            continue                      # left unanswered on purpose; stays blank
        try:
            classifications[cid] = ImpactClassification.model_validate(answer)
        except Exception as exc:
            click.echo(f"HARD ERROR: cluster {cid} has an invalid answer -- {exc}",
                       err=True)
            sys.exit(2)

    summaries: dict[int, str] = {}
    for entry in raw.get("notes") or []:
        summary = (entry.get("answer") or {}).get("summary")
        if entry.get("note_number") and summary:
            summaries[int(entry["note_number"])] = summary

    actions: dict[str, SICheckAction] = {}
    for entry in raw.get("si_check") or []:
        item = entry.get("item_id")
        answer = entry.get("answer") or {}
        if not item or answer.get("team") is None:
            continue                      # left unanswered on purpose
        try:
            actions[item] = SICheckAction.model_validate(answer)
        except Exception as exc:
            click.echo(f"HARD ERROR: SI Check item {item} has an invalid answer "
                       f"-- {exc}", err=True)
            sys.exit(2)

    return classifications, summaries, actions


# ---------------------------------------------------------- deliverables -----

def _write_deliverables(
    project: Path,
    data: Inputs,
    classifications: dict[str, ImpactClassification],
    summaries: dict[int, str],
    actions: dict[str, SICheckAction],
) -> Path:
    output_dir = project / "migration" / "output"

    out_xlsx = output_dir / "impact-table.xlsx"
    write_impact_table(data.items, data.findings, out_xlsx)
    _log(f"DeliverableGenerator: wrote {out_xlsx}")

    out_md = output_dir / "impact-table.md"
    write_impact_table_md(data.items, data.findings, out_md)
    _log(f"DeliverableGenerator: wrote {out_md}")

    out_exec = output_dir / "exec-summary.md"
    write_exec_summary(data.items, data.findings, list(classifications.items()), out_exec)
    _log(f"DeliverableGenerator: wrote {out_exec}")

    out_backlog = output_dir / "fix-backlog.csv"
    write_fix_backlog(data.findings, classifications, out_backlog)
    _log(f"DeliverableGenerator: wrote {out_backlog}")

    out_deletion = output_dir / "deletion-plan.md"
    write_deletion_plan(data.usage, out_deletion)
    _log(f"DeliverableGenerator: wrote {out_deletion}")

    out_notes_dir = output_dir / "notes-summaries"
    write_notes_summaries(data.notes_text, summaries, out_notes_dir)
    _log(f"DeliverableGenerator: wrote notes-summaries/ ({len(data.notes_text)} files)")

    # Written even with no SI Check input, and it says so on the page. An absent
    # document and a clean check look identical from a folder listing, and only
    # one of them means nothing blocks the conversion.
    out_si = output_dir / "si-check-actions.md"
    write_si_check_actions(data.si_check, actions, out_si)
    _log(f"DeliverableGenerator: wrote {out_si}")

    return output_dir


# ------------------------------------------------------------------ cli ------

@click.group()
def cli() -> None:
    """conversion-scope orchestrator."""


@cli.command()
@click.option("--project", type=click.Path(file_okay=False, path_type=Path), default=Path("."))
def init(project: Path) -> None:
    """Create ./migration/ with PROJECT_PLAN.md, PROGRESS.md and LESSONS.md."""
    project = project.resolve()
    ProjectMemory(project).init_files()
    click.echo(f"Memory files initialised in {project / 'migration'}")
    click.echo("Fill in PROJECT_PLAN.md (customer, source/target release, namespaces, "
               "go-live), then run: next")


@cli.command("next")
@click.option("--project", type=click.Path(file_okay=False, path_type=Path), default=Path("."))
def next_(project: Path) -> None:
    """Name the next workflow step, from PROGRESS.md and the guide dependency graph.

    The guides under references/guides/ form a DAG through their `prerequisites`
    frontmatter. This walks it rather than listing files alphabetically, because
    the order is the point -- an ATC run against a system whose check variant is
    not installed yet produces a clean report that means nothing.
    """
    project = project.resolve()
    guides = load_guides(GUIDES_DIR)
    rows = ProjectMemory(project).read_progress()
    done = {r.event.removeprefix("Completed:").strip()
            for r in rows if r.event.startswith("Completed:")}

    guide = next_step(guides, done, inputs_present={})
    if guide is None:
        click.echo(json.dumps({"step_id": None, "title": "All steps complete"}))
        return
    click.echo(json.dumps({
        "step_id": guide.step_id,
        "kind": guide.kind,
        "phase": guide.phase,
        "title": guide.title,
        "guide_file": (GUIDES_DIR / f"{guide.step_id}.md").relative_to(
            SKILL_ROOT).as_posix(),
    }, indent=2))


@cli.command()
@click.argument("step_id")
@click.option("--project", type=click.Path(file_okay=False, path_type=Path), default=Path("."))
def done(step_id: str, project: Path) -> None:
    """Record a workflow step as completed, then name the next one.

    `next` reads the done-set out of PROGRESS.md by looking for rows whose event
    starts with "Completed:". Spelling that by hand is how a step gets recorded
    as "completed atc export" and never satisfies anything's prerequisites.
    """
    project = project.resolve()
    known = {g.step_id for g in load_guides(GUIDES_DIR)}
    if step_id not in known:
        click.echo(f"No step '{step_id}'. Known steps:\n  "
                   + "\n  ".join(sorted(known)), err=True)
        sys.exit(2)
    ProjectMemory(project).append_progress("consultant", f"Completed: {step_id}")
    click.echo(f"Recorded: {step_id}")
    ctx = click.get_current_context()
    ctx.invoke(next_, project=project)


@cli.command()
@click.argument("step_id")
def guide(step_id: str) -> None:
    """Print one workflow guide by step-id."""
    # Validated rather than interpolated: step_id reaches a path join, and the
    # guides are a closed set, so membership is both the safer check and the
    # better error message.
    known = {g.step_id for g in load_guides(GUIDES_DIR)}
    if step_id not in known:
        click.echo(f"No guide '{step_id}'. Known steps:\n  "
                   + "\n  ".join(sorted(known)), err=True)
        sys.exit(2)
    click.echo((GUIDES_DIR / f"{step_id}.md").read_text(encoding="utf-8"))


@cli.command()
@click.option("--project", type=click.Path(file_okay=False, path_type=Path), default=Path("."))
def analyze(project: Path) -> None:
    """Ingest inputs, build the graph, write deliverables and the judgment queue."""
    project = project.resolve()
    data = _ingest(project)
    _write_next_step(project, "graph-build", reason="Optional ingesters complete")

    _log("GraphBuilder: building in-memory graph")
    graph = build_graph(data.items, data.findings, data.usage, data.notes_text, data.rc_tiles)
    _log(f"GraphBuilder: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges")
    _write_next_step(project, "judgment-queue", reason="GraphBuilder complete")

    pending = _write_queue(project, data)
    _log(f"JudgmentQueue: wrote {pending} open questions to {_queue_path(project)}")

    # Answers may already exist from an earlier round -- re-running analyze after
    # new inputs arrive must not silently throw away judgment already made.
    classifications, summaries, actions = _read_answers(project)
    if classifications or summaries or actions:
        _log(f"JudgmentQueue: reusing {len(classifications)} classifications, "
             f"{len(summaries)} note summaries, {len(actions)} SI Check decisions "
             f"from a previous round")

    _write_next_step(project, "deliverable-gen", reason="Judgment queue written")
    output_dir = _write_deliverables(project, data, classifications,
                                     summaries, actions)

    _write_next_step(
        project,
        "answer-judgment-queue",
        next_step_kind="agent",
        blocked_on_human=False,
        reason="deliverables written; judgment queue has open questions",
    )

    click.echo(
        f"Done. {len(data.items)} simplification items x {len(data.findings)} findings "
        f"-> {output_dir}\n"
        f"Judgment queue: {pending} open question(s) in {_queue_path(project)}\n"
        f"Answer them into {_answers_path(project)}, then run: apply-judgment"
    )


@cli.command("apply-judgment")
@click.option("--project", type=click.Path(file_okay=False, path_type=Path), default=Path("."))
def apply_judgment(project: Path) -> None:
    """Read judgment-answers.json back and rewrite the deliverables with it."""
    project = project.resolve()

    if not _answers_path(project).exists():
        click.echo(
            f"HARD ERROR: {_answers_path(project)} not found. Answer the questions in "
            f"{_queue_path(project)} first -- see SKILL.md, 'Judging a cluster'.",
            err=True,
        )
        sys.exit(2)

    # Re-ingest rather than cache: the deliverable writers need every row, and a
    # cache between two commands is a staleness bug waiting for the day someone
    # drops a corrected ATC export in and wonders why nothing changed.
    data = _ingest(project, quiet=True)
    classifications, summaries, actions = _read_answers(project)

    total = len({cluster_key(f) for f in data.findings})
    si_open = [f for f in data.si_check
               if f.status in ("error", "warning", "unknown")]
    _log(f"JudgmentQueue: {len(classifications)}/{total} clusters classified, "
         f"{len(summaries)}/{len(data.notes_text)} notes summarised, "
         f"{len(actions)}/{len(si_open)} SI Check results routed")

    output_dir = _write_deliverables(project, data, classifications,
                                     summaries, actions)

    _write_next_step(
        project,
        "review-output",
        next_step_kind="consultant",
        blocked_on_human=True,
        reason="analysis complete; review deliverables",
    )

    unanswered = total - len(classifications)
    si_unrouted = len(si_open) - len(actions)
    click.echo(
        f"Done. Deliverables rewritten with judgment -> {output_dir}\n"
        + (f"WARNING: {unanswered} cluster(s) still unanswered -- their rows in "
           f"fix-backlog.csv carry no impact/effort.\n" if unanswered else "")
        # Said here as well as on the page. An SI Check result with no owner is
        # the kind of gap that reads as "handled" once the run reports Done.
        + (f"WARNING: {si_unrouted} SI Check result(s) still unrouted -- listed "
           f"under 'Not yet decided' in si-check-actions.md.\n"
           if si_unrouted > 0 else "")
    )


if __name__ == "__main__":
    cli()
