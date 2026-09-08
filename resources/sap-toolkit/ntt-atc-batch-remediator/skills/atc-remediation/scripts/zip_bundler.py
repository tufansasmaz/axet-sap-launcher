"""ZipBundler — package ship-set patches into abapGit-compatible ZIPs.

One ZIP per check category (`pattern_slug`). Within each category, distinct
ABAP objects are chunked into batches of <=25 (the research-abapgit-bridge
cascade-safety cap). Each ZIP carries:

  - ``.abapgit.xml`` (root) with ``STARTING_FOLDER=/src/`` and
    ``FOLDER_LOGIC=PREFIX`` so abapGit picks up the layout correctly.
  - ``src/<name>.<ext>.abap`` + ``src/<name>.<ext>.xml`` per distinct
    object (lowercase filenames — abapGit folder-layout requirement).
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
from pathlib import Path

from scripts.schemas import Patch, ZipBundleManifest

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

# Per-type abapGit object XML. abapGit refuses CLAS/FUGR/INTF members
# carrying PROGDIR metadata (that block is PROG-only). v0.1 supports the
# four most common ABAP types in this plugin's pattern catalogue; the rest
# (TABL/DTEL/DOMA) fall through to NotImplementedError so the patches get
# routed to human review explicitly rather than producing a broken ZIP.
_PROG_XML_TEMPLATE = """\
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

_CLAS_XML_TEMPLATE = """\
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_CLAS" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <VSEOCLASS>
    <CLSNAME>{name_uc}</CLSNAME>
    <LANGU>E</LANGU>
   </VSEOCLASS>
  </asx:values>
 </asx:abap>
</abapGit>
"""

_FUGR_XML_TEMPLATE = """\
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_FUGR" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <AREAT>{name_uc}</AREAT>
  </asx:values>
 </asx:abap>
</abapGit>
"""

_INTF_XML_TEMPLATE = """\
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_INTF" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <VSEOINTERF>
    <CLSNAME>{name_uc}</CLSNAME>
   </VSEOINTERF>
  </asx:values>
 </asx:abap>
</abapGit>
"""

_OBJECT_XML_TEMPLATES: dict[str, str] = {
    "PROG": _PROG_XML_TEMPLATE,
    "CLAS": _CLAS_XML_TEMPLATE,
    "FUGR": _FUGR_XML_TEMPLATE,
    "INTF": _INTF_XML_TEMPLATE,
}


def _render_object_xml(object_type: str, object_name: str) -> str:
    """Render the abapGit per-object XML, choosing the serializer + metadata
    block by object type. Raises NotImplementedError on unsupported types
    so the caller can route the affected patches to human-review instead of
    producing a malformed ZIP.
    """
    tmpl = _OBJECT_XML_TEMPLATES.get(object_type.upper())
    if tmpl is None:
        raise NotImplementedError(
            f"ZipBundler v0.1: unsupported object_type={object_type!r}; "
            "route to human review (only PROG/CLAS/FUGR/INTF are supported). "
            "See SPEC §2 v0.2 backlog for the broader-type catalogue."
        )
    return tmpl.format(name_uc=object_name.upper())


def _ext_for_object_type(object_type: str) -> str:
    """Map ATC object-type codes to abapGit file extensions."""
    return {
        "PROG": "prog",
        "CLAS": "clas",
        "FUGR": "fugr",
        "INTF": "intf",
        "TABL": "tabl",
        "DTEL": "dtel",
        "DOMA": "doma",
    }.get(object_type.upper(), object_type.lower())


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


class ZipBundler:
    """Bundle patches into abapGit ZIPs (one per category, <=25 obj each)."""

    def __init__(
        self,
        output_dir: Path,
        batch_id_seed: int = 1,
        template_path: Path | None = None,
    ) -> None:
        self.output_dir = Path(output_dir)
        self.batch_id_seed = int(batch_id_seed)
        self.template_path = template_path or TEMPLATE_PATH
        # Multi-patch-per-object patches are pulled out of the ship-set and
        # surfaced here for the orchestrator to route to human-review. v0.1
        # cannot safely merge two diffs against the same object without
        # source-aware splicing; v0.2 adds SourceIngester and a real merge.
        self.routed_patches: list[Patch] = []

    def bundle(self, patches: list[Patch]) -> list[ZipBundleManifest]:
        """Group patches by slug, chunk into <=25-object ZIPs, write to disk.

        Patches landing on the same (object_type, object_name) as another
        patch in the same slug are PULLED OUT of the ship-set and recorded
        in ``self.routed_patches`` — concatenating two diffs against the
        same object produces broken ABAP. The orchestrator surfaces the
        routed patches as ``no-patch-produced`` with reason
        ``"multi-patch-per-object — needs manual merge"`` (v0.2 backlog:
        source-aware splicing).
        """
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.routed_patches = []  # reset on each bundle() call

        # Group by pattern_slug (one ZIP per check category, possibly chunked).
        by_slug: dict[str, list[Patch]] = defaultdict(list)
        for p in patches:
            slug = p.pattern_slug or "uncategorized"
            by_slug[slug].append(p)

        manifests: list[ZipBundleManifest] = []
        next_id = self.batch_id_seed

        for slug in sorted(by_slug.keys()):
            slug_patches = by_slug[slug]

            # Sub-group by distinct (object_type, object_name).
            by_obj: dict[tuple[str, str], list[Patch]] = defaultdict(list)
            for p in slug_patches:
                by_obj[(p.object_type, p.object_name)].append(p)

            # Filter to safe-to-bundle keys:
            #   - Multi-patch-per-object → routed; not safe to merge in v0.1.
            #   - Unsupported object_type (not in _OBJECT_XML_TEMPLATES) → routed
            #     instead of crashing the run. v0.1 ships PROG/CLAS/FUGR/INTF;
            #     TABL/DTEL/DOMA/etc. land here and go to human review.
            safe_keys: list[tuple[str, str]] = []
            for key, obj_patches in by_obj.items():
                obj_type = key[0].upper()
                if obj_type not in _OBJECT_XML_TEMPLATES:
                    self.routed_patches.extend(obj_patches)
                elif len(obj_patches) > 1:
                    self.routed_patches.extend(obj_patches)
                else:
                    safe_keys.append(key)
            safe_keys.sort()

            # Chunk into <=MAX_OBJECTS_PER_ZIP-object pieces.
            for chunk_start in range(0, len(safe_keys), MAX_OBJECTS_PER_ZIP):
                chunk_keys = safe_keys[chunk_start : chunk_start + MAX_OBJECTS_PER_ZIP]
                if not chunk_keys:
                    continue
                batch_id = f"b-{next_id:04d}"
                next_id += 1

                chunk_patches: list[Patch] = []
                for key in chunk_keys:
                    chunk_patches.extend(by_obj[key])

                zip_path = self._write_zip(batch_id, slug, chunk_keys, chunk_patches)
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
        patches: list[Patch],
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

            # One pair of files per distinct object — collapse multiple patches
            # against the same object into a single abapgit member containing
            # `after_text` (post-fix source). before/after are preserved per
            # patch in the audit trail.
            objects_index: dict[tuple[str, str], list[Patch]] = defaultdict(list)
            for p in patches:
                objects_index[(p.object_type, p.object_name)].append(p)

            for (obj_type, obj_name), obj_patches in objects_index.items():
                ext = _ext_for_object_type(obj_type)
                name_lc = obj_name.lower()
                source_member = f"src/{name_lc}.{ext}.abap"
                xml_member = f"src/{name_lc}.{ext}.xml"

                # Concatenate after_text from every patch targeting this object.
                source_body = "\n\n".join(p.after_text for p in obj_patches)
                zf.writestr(source_member, source_body)
                zf.writestr(xml_member, _render_object_xml(obj_type, obj_name))

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
            # The Z-recheck report is always type PROG, so use the PROG
            # template explicitly (it ships PROGDIR which abapGit requires).
            zf.writestr(
                recheck_xml_member,
                _render_object_xml("PROG", f"ZATC_RECHECK_{safe_id.upper()}"),
            )

        return zip_path
