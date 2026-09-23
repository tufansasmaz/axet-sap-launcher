#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Naming-standard check at CREATE time, beside the guardrails that already run.

WHY THIS IS NOT A GUARDRAIL

Everything in `guardrails.py` RAISES, because each guard prevents damage: a
standard object modified, a write on PRD, a session pointed at the wrong host.
A non-conforming name is a convention breach, not damage -- the object is
created and the verdict rides back in the result payload. Blocking is opt-in
per system with `ADT_NAMING=block` in `.conn_adt`, read through the same
`_conn_value` helper as `ADT_SAP_TIER` and `ADT_READONLY`.

That this works at all is recent. Before the 2026-08-18 failure-honesty work a
warning in the payload was a warning nobody saw; this rides on that fix.

WHY IT RUNS ON CREATE AND NOT ON PUSH

A push re-warns on every call about a name that was settled long ago, often
before the standard existed. `ntt-sap-ai-kit` sets abaplint's `object_naming` to
Warning globally for exactly this reason and then lives with the noise. The
engine's create and push paths are different functions, so it does not have to.

WHAT IT CHECKS, IN THE ORDER THE PROPOSAL SET

1. Equality rules -- a BDEF carries the SAME name as its root view, a metadata
   extension the same name as the view it extends (corporate guideline v2.0,
   replacing `_I_` and `_MX_`, both still in the field so people actively get
   this wrong). This is the check abaplint structurally cannot express, and the
   engine gets it for free because it is holding both names at create time.
2. The per-type formula from NAMING_STANDARD.md tables 3, 4.1 and 4.2.
3. MaxLen, and a NOTE (never a breach) when the package number is the reserved
   module-general `000`.

Source of truth is `ts-generator/references/NAMING_STANDARD.md`. `STANDARD_SHA`
below is the sha of the body these patterns were derived from, and
`scripts/test_adt_engine.py` fails when the standard moves and this file does
not -- the same trick `sync_kit_standard.py` plays on the kit copy, for the same
reason: two files that must agree, and nothing noticing when they stop.
"""
from __future__ import annotations

import re

# sha256[:12] of NAMING_STANDARD.md with newlines normalised to \n. Normalised
# rather than raw because this repo converts line endings on checkout, so a raw
# hash would differ between a Windows and a Linux CI leg for identical content.
STANDARD_SHA = "33702c9469b8"

# ---------------------------------------------------------------- tokens ----
# `<Module>` is [A-Z]{2,4} and NOT an enum of SAP module codes. The kit already
# paid for that mistake: its first pattern was (SD|MM|FI|CO|PP|HR), existing
# ZEWM003/ZEWM004 objects failed it, and it was widened. Inherited, not
# re-derived.
_M = r"[A-Z]{2,4}"          # module
_N = r"\d{3}"               # package number
_D = r"[A-Z0-9][A-Z0-9_]*"  # description, UPPER_SNAKE

_NAMESPACE = re.compile(r"^/[A-Z0-9_]+/", re.IGNORECASE)

# Objects the kit installs into $TMP to do its own work. They deliberately do
# not follow Z<Module><PkgNo>_... (NAMING_STANDARD.md §3 note), so without this
# the engine would warn about the helpers it generates itself. `ZND_` also
# covers the shared-component family of §6.
_EXEMPT_PREFIX = ("ZND_",)

# The ZZ family is a different shape entirely and none of it is freely chosen:
# append structures (ZZMARA) take the standard table's name, custom fields and
# cloud custom logic (ZZ1_DESC, ZZ1_LE_SHIP_MODIFY_ITEM) derive from SAP's own
# field or enhancement-spot name, customizing includes are ZZ_DESC. Recognised
# and passed rather than forced into the module formula.
#
# Tried only AFTER the type's own formula fails, because the two overlap:
# ZZZ001_P_FOO is a perfectly good Z<Module=ZZ><PkgNo=001>_P_<D> and this
# pattern would otherwise swallow it as "not chosen here".
_ZZ_FAMILY = re.compile(r"^ZZ(1_|_)?[A-Z0-9_]+$")


def _formula(pattern: str, expected: str, rule: str, maxlen: int = 30) -> dict:
    return {"re": re.compile("^" + pattern + "$"), "expected": expected,
            "rule": rule, "maxlen": maxlen}


# Keys are the engine's own object_types.py keys, so a type the engine can
# create either has a rule here or is honestly reported as unchecked.
RULES = {
    "package":        _formula(rf"[ZY]{_M}{_N}",
                               "Z<Module><PkgNo>", "§3 #1"),
    "program":        _formula(rf"[ZY]{_M}{_N}_P_{_D}",
                               "Z<Module><PkgNo>_P_<Description>", "§3 #2"),
    # §3.1 adds an optional role suffix (F01, TOP, ...) that the corporate
    # guideline does not have; it is ours, so the pattern allows it rather than
    # requiring it.
    "include":        _formula(rf"[ZY]{_M}{_N}_I_{_D}",
                               "Z<Module><PkgNo>_I_<Description>[_<Suffix>]",
                               "§3 #3"),
    "functiongroup":  _formula(rf"[ZY]{_M}{_N}_FG_{_D}",
                               "Z<Module><PkgNo>_FG_<Description>", "§3 #5", 26),
    "function":       _formula(rf"[ZY]{_M}{_N}_FM_{_D}",
                               "Z<Module><PkgNo>_FM_<Description>", "§3 #6"),
    # CL and CX share the key: the engine creates an exception class through the
    # same path as an ordinary one. Behaviour pools (ZCL_..._BP_/_BPC_) and test
    # classes (ZCL_..._TC_) fall out of <Description> and need no separate rule.
    "class":          _formula(rf"[ZY](CL|CX)_{_M}{_N}_{_D}",
                               "ZCL_<Module><PkgNo>_<Description> "
                               "(exception: ZCX_...)", "§3 #7, #9"),
    "interface":      _formula(rf"[ZY]IF_{_M}{_N}_{_D}",
                               "ZIF_<Module><PkgNo>_<Description>", "§3 #8"),
    "table":          _formula(rf"[ZY]{_M}{_N}_T_{_D}",
                               "Z<Module><PkgNo>_T_<Description>", "§3 #11", 16),
    "tabletype":      _formula(rf"[ZY]{_M}{_N}_TT_{_D}",
                               "Z<Module><PkgNo>_TT_<Description>", "§3 #12"),
    "structure":      _formula(rf"[ZY]{_M}{_N}_S_{_D}",
                               "Z<Module><PkgNo>_S_<Description>", "§3 #13"),
    "dataelement":    _formula(rf"[ZY]{_M}{_N}_E_{_D}",
                               "Z<Module><PkgNo>_E_<Description>", "§3 #15"),
    "domain":         _formula(rf"[ZY]{_M}{_N}_D_{_D}",
                               "Z<Module><PkgNo>_D_<Description>", "§3 #16"),
    "messageclass":   _formula(rf"[ZY]{_M}{_N}_MC",
                               "Z<Module><PkgNo>_MC", "§3 #18", 20),
    # §4.1: R root, C projection, I reusable VDM layer, E extension. `V` is the
    # classic DB view's letter and never a CDS view's (§3 #31).
    "cds":            _formula(rf"[ZY]{_M}{_N}_(R|C|I|E)_{_D}",
                               "Z<Module><PkgNo>_(R|C|I|E)_<Description>", "§4.1"),
    "accesscontrol":  _formula(rf"[ZY]{_M}{_N}_AC_{_D}",
                               "Z<Module><PkgNo>_AC_<Description>", "§4.2 #12"),
    "servicedefinition": _formula(rf"[ZY]{_M}{_N}_(UI|API)_{_D}",
                                  "Z<Module><PkgNo>_(UI|API)_<Description>",
                                  "§4.2 #9"),
    "servicebinding": _formula(rf"[ZY]{_M}{_N}_(UI|API)_{_D}_(O2|O4)",
                               "Z<Module><PkgNo>_(UI|API)_<Description>_(O2|O4)",
                               "§4.2 #10"),
    # behaviordefinition and metadataextension are equality rules, not formulas
    # -- see check(). lockobject and typegroup have no row in the standard and
    # are reported unchecked rather than guessed at.
}

_PKGNO = re.compile(rf"^[ZY]({_M})({_N})_")

# The engine spells some types more than one way -- the MCP tools use the short
# ADT-ish forms, object_types.py uses the long ones. Normalised here so a rule
# is not silently missed because the caller said "ddls" and RULES says "cds".
_ALIASES = {
    "bdef": "behaviordefinition", "ddlx": "metadataextension",
    "dcls": "accesscontrol", "ddls": "cds", "ddl": "cds",
    "srvd": "servicedefinition", "srvb": "servicebinding",
    "dtel": "dataelement", "doma": "domain", "tabl": "table",
    "ttyp": "tabletype", "clas": "class", "intf": "interface",
    "prog": "program", "fugr": "functiongroup", "func": "function",
    "msag": "messageclass", "devc": "package",
}

# `annotate view ZSD001_C_ORDER with` -- the view a DDLX extends, lifted from
# the source the caller is already passing. `view entity` is the newer spelling
# and both are in the field.
_ANNOTATE = re.compile(
    r"\bannotate\s+(?:view\s+entity|view)\s+([A-Za-z0-9_/]+)", re.IGNORECASE)


def extended_view(source: str):
    """The view a metadata extension annotates, or None if the source does not say."""
    m = _ANNOTATE.search(source or "")
    return m.group(1).upper() if m else None


def _bare(name: str) -> str:
    """Name without a customer namespace wrapper.

    `require_customer_namespace` already accepts /ACME/ZFOO, so this has to as
    well or it would report every valid name in a namespaced customer as a breach.
    """
    return _NAMESPACE.sub("", (name or "").strip()).upper()


# A project may replace the leading Z of every formula with its own prefix.
# NAMING_STANDARD.md:18 already grants the brief that authority ("<Prefix1> ...
# proje bazinda belirler; celiskide recete kazanir") -- this is the code side of
# a rule the standard had only stated.
#
# Declared in the brief's frontmatter, NOT in .conn_adt: the brief is
# distributed (ntt_setup installs it as the workspace CLAUDE.md), .conn_adt is
# hand-made per consultant. A project-wide convention that has to be re-typed on
# every machine is one machine away from being wrong, and nobody would find out
# -- the symptom is a warning, and warnings are what people learn to ignore.
_PREFIX_KEY = "naming_prefix"
_PREFIX_OK = re.compile(r"^[ZY][A-Z0-9_]{0,3}$")


def project_prefix() -> str:
    """The brief's <Prefix1>, or "" when it declares none (then Z/Y as before).

    Re-read per call rather than cached, for the reason `_conn_value` gives:
    a stale value survives a project switch inside one session.
    """
    try:
        from sap_adt_lib import find_conn_file   # local: avoid a load-time cycle
        p = find_conn_file()
        if not p:
            return ""
        brief = p.parent / "CLAUDE.md"
        if not brief.exists():
            return ""
        head = brief.read_text(encoding="utf-8", errors="replace")[:4096]
        m = re.match(r"\A---\s*\n(.*?)\n---\s*\n", head, re.DOTALL)
        if not m:
            return ""
        for line in m.group(1).splitlines():
            if line.lstrip().startswith("#") or ":" not in line:
                continue
            k, v = line.split(":", 1)
            if k.strip() != _PREFIX_KEY:
                continue
            v = v.strip().strip('"').strip("'").upper()
            # A typo must not silently disable the check, and a prefix outside
            # the customer namespace would let standard names through.
            return v if _PREFIX_OK.match(v) and v not in ("Z", "Y") else ""
    except Exception:
        pass
    return ""


def _std_form(bare: str, prefix: str) -> str:
    """`bare` rewritten to the corporate spelling, so one set of patterns serves.

    The project rule is a substitution -- the leading Z becomes ZJK and nothing
    else moves -- so undoing it mechanically is exact, and every formula in
    RULES keeps working untouched. Parameterising twenty regexes instead would
    put the prefix in twenty places for one rule.

    Used ONLY for pattern matching. The reported name and the MaxLen check keep
    the real name: `ZJKCL_SD001_SALES` is seventeen characters to SAP whatever
    this function returns, and a verdict that renamed the object in its own
    output would be worse than no verdict.
    """
    if prefix and bare.startswith(prefix):
        return "Z" + bare[len(prefix):]
    return bare


# The Z that opens a formula, and the one inside "(exception: ZCX_...)".
# A Z in the middle of a word is left alone.
_EXPECTED_Z = re.compile(r"(?<![A-Z0-9_])Z(?=[A-Z<])")

def _expected(rule: dict, prefix: str) -> str:
    """The wanted form, spelled the way THIS project spells it.

    Showing `Z<Module><PkgNo>_...` to someone whose every object starts with ZJK
    tells them to rename a correct object. Both failure branches -- pattern and
    MaxLen -- go through here so they cannot drift apart.
    """
    if not prefix:
        return rule["expected"]
    return _EXPECTED_Z.sub(prefix, rule["expected"])


def check(name: str, object_type: str, *, root_entity: str = "",
          extends: str = "") -> dict:
    """The naming verdict for one object about to be created.

    Always returns a dict, and `conforms` is deliberately three-valued:

        True   checked against the standard and conforming
        False  checked and in breach -- `expected` says what was wanted
        None   not checked (no rule for this type, or an exempt name)

    True and None are different answers and the payload says which. Collapsing
    them would repeat the failure this whole engine repair was about: a verdict
    that cannot be told apart from the absence of one.
    """
    bare = _bare(name)
    kind = (object_type or "").strip().lower()
    kind = _ALIASES.get(kind, kind)
    out = {"name": bare, "type": kind}

    # The project's own <Prefix1>, if the brief declares one. `std` is `bare`
    # rewritten to the corporate spelling and is used for PATTERN MATCHING ONLY
    # -- see _std_form. The equality rules below are deliberately left on `bare`:
    # both sides are project names, so they already agree.
    prefix = project_prefix()
    std = _std_form(bare, prefix)
    if prefix:
        out["prefix"] = prefix

    if not bare:
        return dict(out, conforms=None, reason="empty name")

    if bare.startswith(_EXEMPT_PREFIX):
        return dict(out, conforms=None,
                    reason="ZND_ is the kit's own tooling / shared-component "
                           "family (§3 note, §6) and does not take the module formula")

    # 1. Equality rules. These come first because they are the ones abaplint
    #    cannot express and the ones the corporate v2.0 change made people get
    #    wrong -- a BDEF still named _I_ looks right to a reviewer.
    if kind == "behaviordefinition":
        want = _bare(root_entity)
        if not want:
            return dict(out, conforms=None, reason="root entity not given")
        ok = bare == want
        return dict(out, conforms=ok, expected=want, rule="§4.2 #5",
                    detail=("a behaviour definition carries the SAME name as its "
                            "root view (v2.0; the older _I_ form was dropped)")
                    if not ok else None)

    if kind == "metadataextension":
        want = _bare(extends)
        if not want:
            return dict(out, conforms=None,
                        reason="no `annotate view <X>` found in the source")
        ok = bare == want
        return dict(out, conforms=ok, expected=want, rule="§4.2 #4",
                    detail=("a metadata extension carries the SAME name as the "
                            "view it extends (v2.0; the older _MX_ form was dropped)")
                    if not ok else None)

    # 2. Per-type formula.
    rule = RULES.get(kind)
    if rule is None:
        return dict(out, conforms=None,
                    reason=f"no rule in NAMING_STANDARD.md for type '{kind}'")

    out["rule"] = f"NAMING_STANDARD.md {rule['rule']}"
    if not rule["re"].match(std):
        if _ZZ_FAMILY.match(bare):
            return dict(out, conforms=None,
                        reason="ZZ family (append structure, custom field, "
                               "customizing include, cloud custom logic) -- the "
                               "name derives from SAP's own object and is not "
                               "chosen here (§3 #14, #22, #23, #33)")
        return dict(out, conforms=False, expected=_expected(rule, prefix))

    # 3. MaxLen, then the reserved package number.
    if len(bare) > rule["maxlen"]:
        return dict(out, conforms=False, expected=_expected(rule, prefix),
                    detail=f"over MaxLen: {len(bare)} > {rule['maxlen']}")

    m = _PKGNO.match(std)
    if m and m.group(2) == "000":
        # A NOTE, never a breach. `000` is the module-general package and is
        # correct for an enhancement or a BAdI implementation -- and a BAdI
        # implementation is an ordinary class here, so the type cannot tell the
        # engine which one this is. Flagging it as wrong would be a false
        # positive on exactly the legitimate case.
        return dict(out, conforms=True,
                    note="package number 000 is the module-general package (§2): "
                         "enhancement and BAdI implementations only, never item "
                         "development")
    return dict(out, conforms=True)


def blocking() -> bool:
    """True when this system opted into refusing a non-conforming name.

    Default is warn. Opt in with `ADT_NAMING=block` in .conn_adt -- same file,
    same reader and same shape as ADT_SAP_TIER and ADT_READONLY, so it is
    configuration the consultant already understands.
    """
    from guardrails import _conn_value
    return str(_conn_value("ADT_NAMING") or "").strip().lower() == "block"


def enforce(name: str, object_type: str, *, root_entity: str = "",
            extends: str = "") -> dict:
    """check(), plus the raise when this system asked for one.

    Returns the verdict for the caller to attach to its result payload. Raises
    GuardrailViolation only under ADT_NAMING=block, so the default path cannot
    turn a convention breach into a failed create.
    """
    verdict = check(name, object_type, root_entity=root_entity, extends=extends)
    if verdict.get("conforms") is False and blocking():
        from guardrails import GuardrailViolation
        raise GuardrailViolation(
            "GR_NAMING",
            f"Name '{verdict['name']}' does not follow the naming standard "
            f"({verdict.get('rule', verdict.get('expected'))}). "
            f"Expected: {verdict.get('expected')}. "
            f"This system sets ADT_NAMING=block.",
            **{k: v for k, v in verdict.items() if v is not None})
    return verdict
