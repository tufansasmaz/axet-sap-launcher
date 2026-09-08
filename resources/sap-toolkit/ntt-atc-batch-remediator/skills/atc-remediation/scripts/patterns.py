"""Loading the pattern library off disk.

This used to sit inside judges/patch_generator.py, next to the `claude -p`
call it fed. The generator is gone -- the agent reading SKILL.md drafts the
ABAP now -- but the pattern library did not go anywhere: it is still what a
patch is judged against, and both the queue writer and the tests read it.

A pattern is the reviewable half of this skill. `references/patterns/<slug>.yaml`
carries a before/after ABAP template, the context a safe fix requires, and the
signals that argue for and against confidence. Consultants correct those files;
nobody should have to open Python to do it.
"""

from __future__ import annotations

from pathlib import Path

import yaml  # type: ignore[import-untyped]

from scripts.schemas import Pattern

SKILL_ROOT = Path(__file__).resolve().parent.parent
PATTERNS_DIR = SKILL_ROOT / "references" / "patterns"


def load_pattern(slug: str, patterns_dir: Path | None = None) -> Pattern | None:
    """Load one pattern YAML by slug. Returns None when it is not on disk.

    None is a real answer, not an error: the classifier routes an unknown
    check_id to `("unknown", "judgment")`, and a cluster with no pattern behind
    it must never be handed a template to imitate.
    """
    path = (patterns_dir or PATTERNS_DIR) / f"{slug}.yaml"
    if not path.is_file():
        return None
    body = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(body, dict):
        return None
    body.setdefault("slug", slug)
    return Pattern.model_validate(body)
