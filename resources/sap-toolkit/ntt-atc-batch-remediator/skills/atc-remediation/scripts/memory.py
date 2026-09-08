"""ProjectMemory — append-only project memory under ``./remediation/``.

Three on-disk files:

- ``remediation/PROJECT_PLAN.md`` — initialized from template, hand-edited by consultant.
- ``remediation/PROGRESS.md``    — append-only Markdown table; one row per event.
- ``remediation/LESSONS.md``     — append-only YAML-fenced blocks; auto-captured by hooks.

The API is intentionally tiny and synchronous; the hooks rely on this being
crash-safe under concurrent Claude Code sessions.

Run ``python -m scripts.memory --init`` (or ``python scripts/memory.py --init``)
to scaffold the three files inside the current working directory's
``./remediation/`` folder.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass

# timezone.utc rather than datetime.UTC: the latter is 3.11+, and the catalog
# declares this skill runs on 3.10. A consultant machine has whatever Python the
# company portal installed, so the floor is not hypothetical.
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]

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

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "references" / "templates"

PROGRESS_HEADER = "| When | Actor | Event |\n|---|---|---|\n"


@dataclass(frozen=True)
class ProgressRow:
    when: str
    actor: str
    event: str


class ProjectMemory:
    """Read/write helpers for ``./remediation/`` memory files."""

    def __init__(self, project_root: Path) -> None:
        self.project_root = Path(project_root).resolve()
        self.remediation = self.project_root / "remediation"
        self.plan_path = self.remediation / "PROJECT_PLAN.md"
        self.progress_path = self.remediation / "PROGRESS.md"
        self.lessons_path = self.remediation / "LESSONS.md"

    # ----- scaffolding ----------------------------------------------------
    def init_files(self) -> None:
        """Create the three memory files from templates (idempotent)."""
        self.remediation.mkdir(parents=True, exist_ok=True)

        if not self.plan_path.exists():
            plan_template = (TEMPLATES_DIR / "project-plan.md.j2").read_text(
                encoding="utf-8"
            )
            self.plan_path.write_text(plan_template, encoding="utf-8")

        if not self.progress_path.exists():
            progress_template = (TEMPLATES_DIR / "progress-init.md").read_text(
                encoding="utf-8"
            )
            self.progress_path.write_text(progress_template, encoding="utf-8")

        if not self.lessons_path.exists():
            lessons_template = (TEMPLATES_DIR / "lessons-init.md").read_text(
                encoding="utf-8"
            )
            self.lessons_path.write_text(lessons_template, encoding="utf-8")

    # ----- progress -------------------------------------------------------
    def append_progress(self, actor: str, event: str) -> None:
        """Append a row to PROGRESS.md. Writes the header on first call."""
        self.remediation.mkdir(parents=True, exist_ok=True)
        when = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        # Strip pipes so we don't break the Markdown table.
        actor_cell = actor.replace("|", "/")
        event_cell = event.replace("|", "/")
        row = f"| {when} | {actor_cell} | {event_cell} |\n"

        if not self.progress_path.exists():
            self.progress_path.write_text(PROGRESS_HEADER + row, encoding="utf-8")
            return

        existing = self.progress_path.read_text(encoding="utf-8")
        if "| When | Actor | Event |" not in existing:
            # Pre-existing file without our header — ensure header is present.
            self.progress_path.write_text(
                PROGRESS_HEADER + existing + row, encoding="utf-8"
            )
            return

        with self.progress_path.open("a", encoding="utf-8") as fp:
            fp.write(row)

    def read_progress(self) -> list[ProgressRow]:
        """Read PROGRESS.md and return data rows (header + separator skipped)."""
        if not self.progress_path.exists():
            return []
        rows: list[ProgressRow] = []
        for line in self.progress_path.read_text(encoding="utf-8").splitlines():
            if not line.startswith("|"):
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) < 3:
                continue
            when, actor, event = cells[0], cells[1], cells[2]
            if actor == "Actor" or "---" in when or "---" in actor or "---" in event:
                continue
            rows.append(ProgressRow(when=when, actor=actor, event=event))
        return rows

    # ----- lessons --------------------------------------------------------
    def append_lesson(self, lesson: dict[str, Any]) -> None:
        """Append a YAML-fenced lesson block to LESSONS.md."""
        self.remediation.mkdir(parents=True, exist_ok=True)
        if not self.lessons_path.exists():
            lessons_template = (TEMPLATES_DIR / "lessons-init.md").read_text(
                encoding="utf-8"
            )
            self.lessons_path.write_text(lessons_template, encoding="utf-8")

        record = dict(lesson)
        record.setdefault(
            "recorded_at",
            datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        )
        block = (
            "\n```yaml\n"
            + yaml.safe_dump(record, sort_keys=True, default_flow_style=False)
            + "```\n"
        )
        with self.lessons_path.open("a", encoding="utf-8") as fp:
            fp.write(block)

    def read_lessons(self) -> list[dict[str, Any]]:
        """Parse YAML-fenced blocks from LESSONS.md and return them."""
        if not self.lessons_path.exists():
            return []
        text = self.lessons_path.read_text(encoding="utf-8")
        lessons: list[dict[str, Any]] = []
        in_block = False
        buf: list[str] = []
        for line in text.splitlines():
            stripped = line.strip()
            if stripped == "```yaml":
                in_block = True
                buf = []
                continue
            if stripped == "```" and in_block:
                in_block = False
                try:
                    parsed = yaml.safe_load("\n".join(buf))
                except yaml.YAMLError:
                    parsed = None
                if isinstance(parsed, dict):
                    lessons.append(parsed)
                continue
            if in_block:
                buf.append(line)
        return lessons


def _main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="memory",
        description="ntt-atc-batch-remediator memory layer scaffolding.",
    )
    parser.add_argument(
        "--init",
        action="store_true",
        help="Create remediation/{PROJECT_PLAN.md, PROGRESS.md, LESSONS.md} in CWD.",
    )
    parser.add_argument(
        "--project",
        type=Path,
        default=Path.cwd(),
        help="Project root containing ./remediation/ (default: CWD).",
    )
    args = parser.parse_args(argv)
    mem = ProjectMemory(args.project)
    if args.init:
        mem.init_files()
        print(f"Initialized memory under {mem.remediation}")
        return 0
    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(_main())
