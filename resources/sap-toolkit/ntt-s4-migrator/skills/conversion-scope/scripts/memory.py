"""Read/write PROJECT_PLAN.md, PROGRESS.md, LESSONS.md project-local memory."""

import json
import re
from dataclasses import dataclass

# timezone.utc rather than datetime.UTC: the latter is 3.11+, and the catalog
# declares this skill runs on 3.10. A consultant machine has whatever Python the
# company portal installed, so the floor is not hypothetical.
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


@dataclass
class ProgressRow:
    when: str
    actor: str  # consultant | agent | hook
    event: str


class ProjectMemory:
    def __init__(self, project_root: Path) -> None:
        self.root = project_root
        self.migration = project_root / "migration"

    @property
    def progress_path(self) -> Path:
        return self.migration / "PROGRESS.md"

    @property
    def lessons_path(self) -> Path:
        return self.migration / "LESSONS.md"

    @property
    def plan_path(self) -> Path:
        return self.migration / "PROJECT_PLAN.md"

    # Every read/write here pins UTF-8. The default is the locale codec, which is cp1252
    # on a Windows consultant laptop — and these files carry em-dashes and arrows from
    # our own hook labels, so the default silently raises UnicodeEncodeError mid-append.
    # CI never saw it: the workflows run ubuntu-latest, where the default is already UTF-8.
    def init_files(self) -> None:
        """Scaffold the 3 memory files from templates if they don't already exist."""
        self.migration.mkdir(parents=True, exist_ok=True)
        plugin_root = Path(__file__).parent.parent
        templates = plugin_root / "references" / "templates"
        if not self.plan_path.exists():
            self.plan_path.write_text(
                (templates / "project-plan.md.j2").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
        if not self.progress_path.exists():
            self.progress_path.write_text(
                (templates / "progress-init.md").read_text(encoding="utf-8"),
                encoding="utf-8",
            )
            self.append_progress("hook", "Initialised project memory")
        if not self.lessons_path.exists():
            self.lessons_path.write_text(
                (templates / "lessons-init.md").read_text(encoding="utf-8"),
                encoding="utf-8",
            )

    def append_progress(self, actor: str, event: str) -> None:
        self.migration.mkdir(parents=True, exist_ok=True)
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        if not self.progress_path.exists():
            self.progress_path.write_text(
                "# Progress log\n\n| When | Actor | Event |\n|---|---|---|\n",
                encoding="utf-8",
            )
        # Escape pipes in event text to keep table valid
        safe_event = event.replace("|", "\\|")
        with self.progress_path.open("a", encoding="utf-8") as f:
            f.write(f"| {now} | {actor} | {safe_event} |\n")

    def read_progress(self) -> list[ProgressRow]:
        if not self.progress_path.exists():
            return []
        rows: list[ProgressRow] = []
        for line in self.progress_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped.startswith("|"):
                continue
            if "---" in stripped or "When" in stripped:
                continue
            parts = [p.strip() for p in stripped.strip("|").split("|")]
            if len(parts) == 3:
                rows.append(ProgressRow(when=parts[0], actor=parts[1], event=parts[2]))
        return rows

    def append_lesson(self, lesson: dict[str, Any]) -> None:
        self.migration.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).isoformat()
        block = "\n---\n\n## Lesson — " + ts + "\n\n"
        block += "```yaml\n"
        for key, val in lesson.items():
            block += f"{key}: {json.dumps(val) if isinstance(val, (str, bool)) else val}\n"
        block += "```\n"
        # Ensure file exists with header
        if not self.lessons_path.exists():
            self.lessons_path.write_text("# Lessons learned\n", encoding="utf-8")
        with self.lessons_path.open("a", encoding="utf-8") as f:
            f.write(block)

    def read_lessons(self) -> list[dict[str, Any]]:
        if not self.lessons_path.exists():
            return []
        text = self.lessons_path.read_text(encoding="utf-8")
        return [
            yaml.safe_load(m.group(1))
            for m in re.finditer(r"```yaml\n(.*?)```", text, re.DOTALL)
        ]
