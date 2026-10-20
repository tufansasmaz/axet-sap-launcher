"""The object's current source, and the patches applied to it.

A patch carries a SNIPPET: ``before_text`` is the ABAP that is there now,
``after_text`` is what replaces it. An abapGit import replaces a whole source
member, so a ZIP can only carry the complete source of every member it touches
-- the current source with the snippets spliced in. Until 2026-09-28 the bundler
wrote the joined ``after_text`` as the member itself, which would have replaced a
program with the few lines of its fix on import.

The current source comes from the consultant, the same way the findings do: an
abapGit export of the affected objects (offline repository -> Export ZIP, or the
loose files) dropped under ``remediation/inputs/source/``. It is the format the
patch ZIP goes back in, so every member of the object -- the ``.xml`` metadata
included -- is copied through untouched and only the patched members change.

Everything here REFUSES rather than guesses. A before_text that is not in the
source, is in it more than once, or overlaps another patch's, stops that whole
object: the ZIP would otherwise import a fix nobody reviewed against the code
that is really there.
"""

from __future__ import annotations

import zipfile
from dataclasses import dataclass
from itertools import pairwise
from pathlib import Path

from scripts.schemas import Patch

# Class includes whose abapGit member holds exactly that include, so the ATC
# line number means the same line in the file. Every other class include
# (CP, CU, CO, CI, CMnnn) is folded into the main `.clas.abap`, where the ATC
# line is relative to a section or a method and says nothing about the file.
_CLAS_INCLUDE_MEMBERS = {
    "CCIMP": "locals_imp",
    "CCDEF": "locals_def",
    "CCAU": "testclasses",
    "CCMAC": "macros",
}

_EXT = {"PROG": "prog", "CLAS": "clas", "FUGR": "fugr", "INTF": "intf"}

SUPPORTED_TYPES = frozenset(_EXT)


class SpliceRefused(Exception):
    """One object cannot be bundled; the message says why, for the review queue."""


def abapgit_name(name: str) -> str:
    """abapGit's file name for an object or include: lower case, ``/`` -> ``#``."""
    return name.lower().replace("/", "#")


@dataclass(frozen=True)
class Target:
    """Where one patch lands: the abapGit object that owns the member, and the member."""

    owner_type: str
    owner_name: str
    member: str
    # True when the ATC line number counts lines of this member.
    line_anchored: bool

    @property
    def prefix(self) -> str:
        return f"{abapgit_name(self.owner_name)}.{_EXT[self.owner_type]}."


def resolve_target(patch: Patch) -> Target:
    """Map a patch's object + include onto the abapGit member it edits."""
    obj_type = patch.object_type.upper()
    name = patch.object_name.upper()
    include = (patch.include or "").strip().upper()

    if obj_type == "PROG":
        # An include of a report is its own abapGit object (a PROG of type I),
        # so a finding in ZR_X_F01 edits zr_x_f01.prog.abap and nothing of ZR_X.
        owner = include or name
        return Target("PROG", owner, f"{abapgit_name(owner)}.prog.abap", True)

    if obj_type == "CLAS":
        suffix = include[len(name):].lstrip("=") if include.startswith(name) else ""
        section = _CLAS_INCLUDE_MEMBERS.get(suffix)
        if section:
            return Target("CLAS", name, f"{abapgit_name(name)}.clas.{section}.abap", True)
        return Target("CLAS", name, f"{abapgit_name(name)}.clas.abap", False)

    if obj_type == "INTF":
        return Target("INTF", name, f"{abapgit_name(name)}.intf.abap", False)

    if obj_type == "FUGR":
        if not include:
            raise SpliceRefused(
                f"FUGR {name}: the finding names no include, so there is no "
                "member to patch")
        return Target(
            "FUGR", name, f"{abapgit_name(name)}.fugr.{abapgit_name(include)}.abap", True)

    raise SpliceRefused(
        f"object type {obj_type} is not bundled (only PROG, CLAS, FUGR, INTF)")


class SourceIndex:
    """Every file under ``inputs/source/``, by abapGit file name.

    Loose files and the members of any ``.zip`` there are read alike; folders
    are ignored because abapGit's own export nests by package. The same file
    name with two different contents is remembered as a conflict and refuses
    any object that needs it -- picking one would be a guess about which export
    is current.
    """

    def __init__(self, files: dict[str, bytes] | None = None) -> None:
        self.files: dict[str, bytes] = {}
        self.conflicts: set[str] = set()
        for name, body in (files or {}).items():
            self._add(name, body)

    def _add(self, name: str, body: bytes) -> None:
        key = name.replace("\\", "/").rsplit("/", 1)[-1].lower()
        if not key or key.startswith("."):
            return
        if key in self.files and self.files[key] != body:
            self.conflicts.add(key)
        self.files[key] = body

    @classmethod
    def load(cls, root: Path) -> SourceIndex:
        index = cls()
        if not root.is_dir():
            return index
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            if path.suffix.lower() == ".zip":
                with zipfile.ZipFile(path) as zf:
                    for info in zf.infolist():
                        if not info.is_dir():
                            index._add(info.filename, zf.read(info))
            else:
                index._add(path.name, path.read_bytes())
        return index

    def __len__(self) -> int:
        return len(self.files)

    def object_files(self, target: Target) -> dict[str, bytes]:
        """Every member of the object that owns ``target``, or refuse."""
        found = {k: v for k, v in self.files.items() if k.startswith(target.prefix)}
        label = f"{target.owner_type} {target.owner_name}"
        if not found:
            raise SpliceRefused(
                f"{label}: no current source under inputs/source/ -- export it "
                "with abapGit and bundle again")
        xml = f"{target.prefix}xml"
        if xml not in found:
            raise SpliceRefused(
                f"{label}: the source export has no {xml}; a partial export "
                "cannot be imported as a whole object")
        clash = sorted(set(found) & self.conflicts)
        if clash:
            raise SpliceRefused(
                f"{label}: inputs/source/ holds two different copies of "
                f"{', '.join(clash)}; keep only the current export")
        if target.member not in found:
            raise SpliceRefused(
                f"{label}: the source export has no member {target.member} "
                "for this include")
        return found


def _locate(text: str, patch: Patch, anchored: bool) -> tuple[int, int]:
    """Return the one span of ``text`` the patch replaces, or refuse."""
    before = patch.before_text.replace("\r\n", "\n")
    fid = patch.finding_id or "<no finding_id>"
    if not before.strip():
        raise SpliceRefused(f"{fid}: before_text is empty")

    spans: list[tuple[int, int]] = []
    start = text.find(before)
    while start != -1:
        spans.append((start, start + len(before)))
        start = text.find(before, start + 1)
    if not spans:
        raise SpliceRefused(
            f"{fid}: before_text is not in the current source of the include "
            "-- the code changed, or the draft paraphrased it")

    if anchored and patch.line > 0:
        def lines(span: tuple[int, int]) -> tuple[int, int]:
            first = text.count("\n", 0, span[0]) + 1
            last = text.count("\n", 0, max(span[0], span[1] - 1)) + 1
            return first, last
        covering = [s for s in spans
                    if lines(s)[0] <= patch.line <= lines(s)[1]]
        if not covering:
            found_at = ", ".join(str(lines(s)[0]) for s in spans)
            raise SpliceRefused(
                f"{fid}: before_text does not cover line {patch.line} "
                f"(found at line {found_at})")
        spans = covering

    if len(spans) > 1:
        raise SpliceRefused(
            f"{fid}: before_text occurs {len(spans)} times"
            + (f" around line {patch.line}" if anchored and patch.line else "")
            + " -- widen it until it is unique")
    return spans[0]


def splice(source: bytes, patches: list[Patch], anchored: bool) -> bytes:
    """Apply every patch to one member's complete source, or refuse them all.

    Line endings and a UTF-8 BOM survive: the member is compared in LF and
    written back in whatever the export used, so a CRLF export does not come
    back as a diff of every line.
    """
    try:
        raw = source.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise SpliceRefused(f"source member is not UTF-8 ({exc})") from exc
    bom = raw.startswith("﻿")
    if bom:
        raw = raw[1:]
    crlf = "\r\n" in raw
    text = raw.replace("\r\n", "\n")

    located = sorted(
        ((*_locate(text, p, anchored), p) for p in patches), key=lambda t: t[0])
    for (_s1, e1, p1), (s2, _e2, p2) in pairwise(located):
        if s2 < e1:
            raise SpliceRefused(
                f"{p1.finding_id} and {p2.finding_id} edit overlapping lines; "
                "merge them into one patch")

    for start, end, patch in reversed(located):
        text = text[:start] + patch.after_text.replace("\r\n", "\n") + text[end:]

    if crlf:
        text = text.replace("\n", "\r\n")
    return (("﻿" if bom else "") + text).encode("utf-8")


def build_object(patches: list[Patch], source: SourceIndex) -> dict[str, bytes]:
    """The complete abapGit files for one ATC object with all its patches applied.

    Returns ``{file name: bytes}`` for every abapGit object a patch touched --
    usually one, more when a report's includes are patched -- each complete:
    untouched members and the ``.xml`` are copied as exported.
    """
    by_member: dict[Target, list[Patch]] = {}
    for p in patches:
        by_member.setdefault(resolve_target(p), []).append(p)

    out: dict[str, bytes] = {}
    for target in sorted(by_member, key=lambda t: t.member):
        files = source.object_files(target)
        for name, body in files.items():
            out.setdefault(name, body)
        out[target.member] = splice(
            out[target.member], by_member[target], target.line_anchored)
    return out
