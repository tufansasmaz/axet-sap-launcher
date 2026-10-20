"""ZipBundler — package ship-set patches into abapGit-compatible ZIPs.

Every patched object goes into the ZIP WHOLE: its current source, taken from
the consultant's abapGit export under ``remediation/inputs/source/``, with each
patch's ``before_text`` replaced by its ``after_text`` (``scripts.source_splice``).
An object whose patches cannot all be applied exactly -- no source, a
before_text that is not there, is there twice, or overlaps another -- is left
out, and every one of its patches is handed back in ``refused`` for the human
review queue. Nothing is ever written from the snippets alone: an abapGit
import replaces the member, so a snippet would replace the program.

One ZIP per check category (``pattern_slug``), chunked to <=25 distinct objects
(the research-abapgit-bridge cascade-safety cap). An object patched under
several categories goes ONCE, in the ZIP of the first of them: two ZIPs each
carrying the object with only their own fix would undo each other on import.
Each ZIP carries:

  - ``.abapgit.xml`` (root) with ``STARTING_FOLDER=/src/`` and
    ``FOLDER_LOGIC=PREFIX`` so abapGit picks up the layout correctly.
  - every abapGit file of each patched object as exported, the patched
    members replaced by their spliced source.
  - ``src/zatc_recheck/zatc_recheck_<batch_id>.prog.abap`` (+ .xml) — the
    rendered Z-report. Note that ``-`` is NOT a legal ABAP identifier, so
    the report-name uses ``_`` (``b-0007`` -> ``b_0007``).

Batch IDs are minted sequentially starting from ``batch_id_seed`` so that
re-runs append rather than collide (``b-0001``, ``b-0002``, ...).
"""

from __future__ import annotations

import re
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

from scripts.schemas import Patch, ZipBundleManifest
from scripts.source_splice import (
    SUPPORTED_TYPES,
    SourceIndex,
    SpliceRefused,
    build_object,
)

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = PLUGIN_ROOT / "references" / "recheck-report.abap.template"

MAX_OBJECTS_PER_ZIP = 25

# Defence-in-depth regexes — Patch.object_name / Patch.pattern_slug are
# already validated at construction, but we re-check at the path-formatting
# boundary so anyone calling _write_zip directly cannot smuggle a
# path-traversal payload through batch_id / slug.
_BATCH_ID_RE = re.compile(r"^b-\d{4,}$")
_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")

_ABAPGIT_XML = """\
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_DEVC" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <DATA>
    <MASTER_LANGUAGE>E</MASTER_LANGUAGE>
    <STARTING_FOLDER>/src/</STARTING_FOLDER>
    <FOLDER_LOGIC>PREFIX</FOLDER_LOGIC>
   </DATA>
  </asx:values>
 </asx:abap>
</abapGit>
"""

# The Z-recheck report is the one object this bundler writes from scratch, so
# it is the one XML it renders. Every patched object's XML is copied from the
# consultant's abapGit export instead: a hand-rendered CLAS or FUGR XML would
# reset its description, its category and whatever else abapGit serialises.
_RECHECK_PROG_XML = """\
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_PROG" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <PROGDIR>
    <NAME>{name_uc}</NAME>
    <SUBC>1</SUBC>
   </PROGDIR>
  </asx:values>
 </asx:abap>
</abapGit>
"""


def _ascii_batch_id_for_report(batch_id: str) -> str:
    """``b-0007`` -> ``b_0007`` so the Z-report name is a legal ABAP identifier."""
    return batch_id.replace("-", "_")


def _render_recheck_report(
    batch_id: str,
    object_list_lines: str,
    template_path: Path,
) -> str:
    body = template_path.read_text(encoding="utf-8")
    safe_id = _ascii_batch_id_for_report(batch_id)
    return body.replace("{{batch_id}}", safe_id).replace(
        "{{object_list_lines}}", object_list_lines
    )


def _build_object_list_lines(distinct_objects: list[tuple[str, str]]) -> str:
    """Build the FORM build_object_list body — one APPEND per distinct object."""
    lines: list[str] = []
    for object_type, object_name in distinct_objects:
        # The Z-report `lt_objects` is `STANDARD TABLE OF satc_ci_obj`; in real
        # ATC scenarios consultants tune this to match their SATC variant. The
        # generated template keeps the structure abstract.
        lines.append(
            f"  APPEND VALUE #( obj_type = '{object_type}' obj_name = "
            f"'{object_name.upper()}' ) TO lt_objects."
        )
    return "\n".join(lines)


@dataclass(frozen=True)
class RefusedPatch:
    """A ship-set patch that did not go into a ZIP, and why."""

    patch: Patch
    reason: str


class ZipBundler:
    """Bundle patches into abapGit ZIPs (one per category, <=25 obj each)."""

    def __init__(
        self,
        output_dir: Path,
        batch_id_seed: int = 1,
        template_path: Path | None = None,
        source: SourceIndex | None = None,
    ) -> None:
        self.output_dir = Path(output_dir)
        self.batch_id_seed = int(batch_id_seed)
        self.template_path = template_path or TEMPLATE_PATH
        self.source = source if source is not None else SourceIndex()
        # Filled by bundle(): what went into a ZIP, and what was held back.
        self.shipped_patches: list[Patch] = []
        self.refused: list[RefusedPatch] = []

    def bundle(self, patches: list[Patch]) -> list[ZipBundleManifest]:
        """Build each object whole, group by slug, chunk into <=25-object ZIPs.

        An object is refused as a unit: if one of its patches cannot be
        applied, none of them ship, because the others were drafted against a
        source that still contained that one's before_text.
        """
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.shipped_patches = []
        self.refused = []

        by_obj: dict[tuple[str, str], list[Patch]] = defaultdict(list)
        for p in patches:
            by_obj[(p.object_type.upper(), p.object_name)].append(p)

        built: dict[tuple[str, str], dict[str, bytes]] = {}
        file_owner: dict[str, tuple[str, str]] = {}
        for key in sorted(by_obj):
            obj_patches = by_obj[key]
            try:
                if key[0] not in SUPPORTED_TYPES:
                    raise SpliceRefused(
                        f"object type {key[0]} is not bundled "
                        "(only PROG, CLAS, FUGR, INTF)")
                files = build_object(obj_patches, self.source)
                # A report include patched under two main programs would ship
                # twice with different content; the second is refused.
                shared = sorted(n for n in files if n in file_owner)
                if shared:
                    raise SpliceRefused(
                        f"{', '.join(shared)} is also patched under "
                        f"{file_owner[shared[0]][1]} in this run; import that "
                        "one, re-export, and bundle again")
            except SpliceRefused as exc:
                self.refused.extend(RefusedPatch(p, str(exc)) for p in obj_patches)
                continue
            for name in files:
                file_owner[name] = key
            built[key] = files

        by_slug: dict[str, list[tuple[str, str]]] = defaultdict(list)
        for key in built:
            slug = min(p.pattern_slug or "uncategorized" for p in by_obj[key])
            by_slug[slug].append(key)

        manifests: list[ZipBundleManifest] = []
        next_id = self.batch_id_seed

        for slug in sorted(by_slug):
            keys = sorted(by_slug[slug])
            for chunk_start in range(0, len(keys), MAX_OBJECTS_PER_ZIP):
                chunk_keys = keys[chunk_start : chunk_start + MAX_OBJECTS_PER_ZIP]
                batch_id = f"b-{next_id:04d}"
                next_id += 1

                chunk_patches = [p for key in chunk_keys for p in by_obj[key]]
                zip_path = self._write_zip(
                    batch_id, slug, chunk_keys, {k: built[k] for k in chunk_keys})
                self.shipped_patches.extend(chunk_patches)
                manifests.append(
                    ZipBundleManifest(
                        batch_id=batch_id,
                        category_slug=slug,
                        object_count=len(chunk_keys),
                        zip_path=str(zip_path),
                        included_finding_ids=[
                            p.finding_id for p in chunk_patches if p.finding_id
                        ],
                    )
                )

        self.batch_id_seed = next_id
        return manifests

    def _write_zip(
        self,
        batch_id: str,
        slug: str,
        distinct_objects: list[tuple[str, str]],
        object_files: dict[tuple[str, str], dict[str, bytes]],
    ) -> Path:
        # Defence-in-depth: ZipBundler mints batch_ids internally as
        # f"b-{next_id:04d}" and slugs come from validated Patch.pattern_slug,
        # so a violation here means a programming error upstream. Refuse to
        # f-string an unvalidated value into the output path.
        if not _BATCH_ID_RE.fullmatch(batch_id):
            raise ValueError(
                f"ZipBundler: refusing to write zip with unsafe batch_id "
                f"{batch_id!r} (must match ^b-\\d{{4,}}$)."
            )
        if not _SLUG_RE.fullmatch(slug):
            raise ValueError(
                f"ZipBundler: refusing to write zip with unsafe slug {slug!r} "
                "(must match kebab-case ^[a-z0-9][a-z0-9-]{0,63}$)."
            )
        zip_path = self.output_dir / f"{slug}__{batch_id}.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(".abapgit.xml", _ABAPGIT_XML)

            # The complete abapGit files of every object, patched members
            # already spliced. SourceIndex keeps base names only, so no name
            # from the export can reach outside src/.
            for key in distinct_objects:
                for name, body in sorted(object_files[key].items()):
                    zf.writestr(f"src/{name}", body)

            # Inline the ZATC_RECHECK Z-report.
            recheck_body = _render_recheck_report(
                batch_id,
                _build_object_list_lines(distinct_objects),
                self.template_path,
            )
            safe_id = _ascii_batch_id_for_report(batch_id)
            recheck_report_member = (
                f"src/zatc_recheck/zatc_recheck_{safe_id}.prog.abap"
            )
            recheck_xml_member = (
                f"src/zatc_recheck/zatc_recheck_{safe_id}.prog.xml"
            )
            zf.writestr(recheck_report_member, recheck_body)
            zf.writestr(
                recheck_xml_member,
                _RECHECK_PROG_XML.format(name_uc=f"ZATC_RECHECK_{safe_id.upper()}"),
            )

        return zip_path
