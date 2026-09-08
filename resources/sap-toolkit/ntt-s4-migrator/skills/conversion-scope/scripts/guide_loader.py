"""Parse YAML frontmatter from references/guides/*.md and walk the dependency graph."""

import re
from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass
class Guide:
    step_id: str
    phase: str
    order: int
    kind: str  # "consultant" | "agent"
    title: str
    prerequisites: list[str]
    blocks: list[str]
    next_steps: list[str]
    sap_notes: list[int]
    estimated_time: str
    body: str


_FRONTMATTER = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def load_guides(guides_dir: Path) -> list[Guide]:
    """Parse every *.md in guides_dir; files without YAML frontmatter are skipped."""
    guides: list[Guide] = []
    for md in sorted(guides_dir.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        m = _FRONTMATTER.match(text)
        if not m:
            continue
        fm = yaml.safe_load(m.group(1))
        if not fm or "step_id" not in fm:
            continue
        guides.append(
            Guide(
                step_id=fm["step_id"],
                phase=fm["phase"],
                order=fm.get("order", 0),
                kind=fm.get("kind", "consultant"),
                title=fm.get("title", ""),
                prerequisites=fm.get("prerequisites", []) or [],
                blocks=fm.get("blocks", []) or [],
                next_steps=fm.get("next", []) or [],
                sap_notes=fm.get("sap_notes", []) or [],
                estimated_time=fm.get("estimated_time", ""),
                body=m.group(2),
            )
        )
    return guides


def next_step(
    guides: list[Guide],
    done: set[str],
    inputs_present: dict[str, bool],
) -> Guide | None:
    """Walk the dependency graph and return the first guide whose prerequisites are met.

    Guides are evaluated in ascending order.  Returns None when every remaining
    guide has at least one prerequisite that is not yet in *done*.
    """
    for g in sorted(guides, key=lambda g: g.order):
        if g.step_id in done:
            continue
        if all(p in done for p in g.prerequisites):
            return g
    return None
