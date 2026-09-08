"""Write the audit-trail JSON-Lines file — one record per generated patch.

Record shape:
  {timestamp, batch_id, check_id, object, include, line,
   before_hash (sha256 hex), after_hash (sha256 hex),
   confidence, reasoning, pattern_slug, finding_id}

Hashes (rather than raw before/after text) keep the audit log small while
still providing forensic certainty: a later /verify can re-hash a patched
object and confirm it matches what was shipped.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Iterable

# timezone.utc rather than datetime.UTC: the latter is 3.11+, and the catalog
# declares this skill runs on 3.10. A consultant machine has whatever Python the
# company portal installed, so the floor is not hypothetical.
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from scripts.schemas import Patch, ZipBundleManifest


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _batch_id_for_patch(patch: Patch, manifests: Iterable[ZipBundleManifest]) -> str:
    """Return the batch_id of the ZIP this patch landed in (empty if none)."""
    fid = patch.finding_id
    for m in manifests:
        if fid in m.included_finding_ids:
            return m.batch_id
    return ""


def write_audit_trail(
    *,
    output_path: Path,
    patches: list[Patch],
    manifests: list[ZipBundleManifest],
    check_id_by_finding_id: dict[str, str] | None = None,
    now_fn: Any = None,
) -> None:
    """Write one JSON object per patch to ``output_path``."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    check_map = check_id_by_finding_id or {}
    stamp = (now_fn or _now_iso)()

    with output_path.open("w", encoding="utf-8") as fh:
        for p in patches:
            record = {
                "timestamp": stamp,
                "batch_id": _batch_id_for_patch(p, manifests),
                "check_id": check_map.get(p.finding_id, ""),
                "object": f"{p.object_type}:{p.object_name}",
                "include": p.include,
                "line": p.line,
                "before_hash": _sha256(p.before_text),
                "after_hash": _sha256(p.after_text),
                "confidence": p.confidence,
                "reasoning": p.reasoning,
                "pattern_slug": p.pattern_slug,
                "finding_id": p.finding_id,
            }
            fh.write(json.dumps(record, sort_keys=True))
            fh.write("\n")
