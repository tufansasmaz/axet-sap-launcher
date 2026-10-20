#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ABAP Cloud Clean Core Checker

Answers "may this SAP object be used at this Clean Core level, on this SAP
product and release?" for a list of standard SAP objects.

Data source: ROSA -- Released Objects Search Assistant
(https://github.com/ClementRingot/ROSA, MIT), which wraps SAP's official
Cloudification Repository (github.com/SAP/abap-atc-cr-cv-s4hc). The default
endpoint is ROSA's public hosted instance; set ROSA_BASE_URL to a self-hosted
instance (`npx -y @rosa-mcp/server`, Docker, or a BTP deployment -- the ROSA
repo ships mta.yaml) when the public host is unreachable or an NTT-controlled
endpoint is preferred. Only STANDARD SAP object names are ever sent -- never
customer Z/Y names or business data.

Every answer is one of three verdicts, and only one of them can come from
anywhere but the repository itself:

    allowed       the repository puts the object at or below the target level
    not_allowed   the repository puts it above the target level
    not_verified  nobody answered for this object on this target

`verified` is True only for an answer the repository gave ONLINE for exactly
the requested target. Offline, the bundled snapshot below can still say "not
allowed" for the objects it holds (dated, and marked unverified); it never says
"allowed", and an object it does not hold is "not verified". Until 2026-09-28 the
offline path called every object outside a short forbidden list "ALLOWED (Level
A)" -- EKKO and SAP_WAPI_* included -- and never said it had run offline.

Exit code: 0 every object verified online, 3 at least one not verified (the
report is still complete), 2 the request itself is wrong (target, usage).

    py clean_core_checker.py MARA BSEG CL_GUI_ALV_GRID
    py clean_core_checker.py MARA,EKKO --system-type private_cloud --s4core 108 --sp 3
    py clean_core_checker.py MARA --system-type private_cloud --version 2023_3 --level B --json
    py clean_core_checker.py MARA,EKKO --profile s4-balanced --s4core 109 --sp 1 --json

A project's Clean Core PROFILE (the brief's `clean_core:` line; the table is
references/PROFILES.md and PROFILES below, held equal by the tests) turns the
object's level into what the project does with it: `decision` is free, reason,
approval, note, forbidden, no_new, blocked or not_measured. With --profile the
endpoint is asked once, for the object's own level, and the decision is made
here -- so a profile that accepts level C can be answered at all (the endpoint
answers for level A when asked for C or D).
"""

import argparse
import datetime
import json
import os
import re
import sys
from typing import Any, Dict, List, Optional, Tuple

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because an error message from the endpoint arrives through a
# variable. See scripts/test_skill_scripts.py for why this is an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

try:
    import requests
    from urllib3.exceptions import InsecureRequestWarning
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

# ROSA public instance by default; override with ROSA_BASE_URL (base URL
# without /api) to use a self-hosted / NTT-hosted instance.
API_BASE = os.environ.get(
    "ROSA_BASE_URL",
    "https://sap-released-objects-server-production.up.railway.app",
).rstrip("/") + "/api"

EXIT_ALL_VERIFIED = 0
EXIT_USAGE = 2
EXIT_NOT_VERIFIED = 3

SYSTEM_TYPES = ("public_cloud", "btp", "private_cloud", "on_premise")
LEVELS = ("A", "B", "C", "D")
DEFAULT_TARGET = {"system_type": "public_cloud", "version": "latest", "level": "A"}

# S4CORE software component release -> the S/4HANA release year the
# Cloudification Repository files its PCE lists under. There is no 2024.
S4CORE_RELEASES = {"107": "2022", "108": "2023", "109": "2025"}

# Offline fallback: what ROSA answered on the day below, for the target below,
# for a handful of classic objects that turn up in almost every spec. Only
# objects the repository CLASSIFIES are here, and only ones above level A: an
# offline answer may warn, it may never clear. The table this replaced invented
# data (CL_GUI_ALV_GRID as "Level D, use CL_SALV_TABLE" -- the repository has no
# public-cloud entry for either; on private cloud 2023 the grid is level B).
BUNDLED = {
    "taken": "2026-09-28",
    "target": {"system_type": "public_cloud", "version": "latest", "level": "A"},
    "origin": "ROSA /api/compliance over SAP's objectReleaseInfoLatest.json",
    # name: (object type, level, state, successors)
    "objects": {
        "MARA": ("TABL", "C", "notToBeReleased", ["I_PRODUCT", "I_PRODUCTPROCUREMENT", "I_PRODUCTQM", "I_PRODUCTSALES", "I_PRODUCTSTORAGE_2"]),
        "MARC": ("TABL", "C", "notToBeReleased", ["I_PRODUCTPLANTBASIC", "I_PRODUCTPLANTCOSTING", "I_PRODUCTPLANTFORECAST", "I_PRODUCTPLANTINTLTRD", "I_PRODUCTPLANTPROCUREMENT", "I_PRODUCTPLANTQTMANAGEMENT", "I_PRODUCTPLANTSALES", "I_PRODUCTSUPPLYPLANNING", "I_PRODUCTWORKSCHEDULING"]),
        "BSEG": ("TABL", "C", "notToBeReleased", ["I_OPERATIONALACCTGDOCITEM"]),
        "BKPF": ("TABL", "C", "notToBeReleased", ["I_JOURNALENTRY"]),
        "ACDOCA": ("TABL", "C", "notToBeReleased", ["I_GLACCOUNTLINEITEM", "I_GLACCOUNTLINEITEMRAWDATA", "I_JOURNALENTRYITEM"]),
        "VBAK": ("TABL", "C", "notToBeReleased", ["I_SALESDOCUMENT"]),
        "VBAP": ("TABL", "C", "notToBeReleased", ["I_SALESDOCUMENTITEM"]),
        "LIKP": ("TABL", "C", "notToBeReleased", ["I_DELIVERYDOCUMENT"]),
        "LIPS": ("TABL", "C", "notToBeReleased", ["I_DELIVERYDOCUMENTITEM"]),
        "EKKO": ("TABL", "C", "notToBeReleased", ["I_PURCHASEORDERAPI01"]),
        "EKPO": ("TABL", "C", "notToBeReleased", ["I_PURCHASEORDERITEMAPI01"]),
        "KNA1": ("TABL", "C", "notToBeReleased", ["I_CUSTOMER"]),
        "LFA1": ("TABL", "C", "notToBeReleased", ["I_SUPPLIER"]),
        "T001": ("TABL", "C", "notToBeReleased", ["I_COMPANYCODE"]),
        "T002": ("TABL", "C", "notToBeReleased", ["I_LANGUAGE"]),
        "BUT000": ("TABL", "C", "notToBeReleased", ["I_BUSINESSPARTNER"]),
        "BAPI_PO_CREATE1": ("FUNC", "C", "notToBeReleased", ["I_PURCHASEORDERTP_2"]),
    },
}


# What a project does with an object at each level -- the machine form of
# references/PROFILES.md (the tests hold the two equal). One profile per brief,
# on its `clean_core:` line. Decisions:
#   free        use it
#   reason      use it, with a written reason in the document
#   approval    an exception: written reason AND the project lead's approval
#   note        use it; it is listed (with its successor when SAP names one)
#   forbidden   do not use
#   no_new      no new use; what already exists is carried and listed
#   blocked     nobody answered for this object: do not use until verified
#   unverified  nobody answered for this object: may be used, listed as unverified
# `C+` is a level C object SAP names a successor for, `C` one without.
# `unknown` is an object SAP's repository has no entry for on this target.
# `classic_ext` (BAdI, user exit, explicit enhancement) and `modification`
# (incl. implicit enhancement) are techniques, not objects: nothing here can
# measure them, the documents apply them.
PROFILES = {
    "public": {
        "title": "S/4HANA Cloud Public Edition", "systems": ("public_cloud", "btp"),
        "A": "free", "B": "forbidden", "C+": "forbidden", "C": "forbidden", "D": "forbidden",
        "unknown": "blocked", "classic_ext": "forbidden", "modification": "forbidden",
    },
    "s4-strict": {
        "title": "S/4HANA Private Cloud / on-premise, cloud-ready", "systems": ("private_cloud", "on_premise"),
        "A": "free", "B": "reason", "C+": "forbidden", "C": "approval", "D": "forbidden",
        "unknown": "blocked", "classic_ext": "reason", "modification": "forbidden",
    },
    "s4-balanced": {
        "title": "S/4HANA Private Cloud / on-premise, classic APIs accepted", "systems": ("private_cloud", "on_premise"),
        "A": "free", "B": "free", "C+": "reason", "C": "note", "D": "forbidden",
        "unknown": "unverified", "classic_ext": "free", "modification": "forbidden",
    },
    "s4-legacy": {
        "title": "S/4HANA Private Cloud / on-premise, converted or brownfield", "systems": ("private_cloud", "on_premise"),
        "A": "free", "B": "free", "C+": "note", "C": "note", "D": "no_new",
        "unknown": "unverified", "classic_ext": "free", "modification": "no_new",
    },
    "ecc": {
        "title": "SAP ECC (no release list exists; nothing is measured)", "systems": (),
        "A": "not_measured", "B": "not_measured", "C+": "not_measured", "C": "not_measured",
        "D": "not_measured", "unknown": "not_measured", "classic_ext": "free",
        "modification": "forbidden",
    },
}
DECISIONS = ("free", "reason", "approval", "note", "forbidden", "no_new", "blocked",
             "unverified", "not_measured")
# The three-valued verdict every caller already reads, from the decision.
_VERDICT_OF = {"free": "allowed", "reason": "allowed", "approval": "allowed", "note": "allowed",
               "forbidden": "not_allowed", "no_new": "not_allowed",
               "blocked": "not_verified", "unverified": "not_verified",
               "not_measured": "not_verified"}
DECISION_LABEL = {
    "free": "ALLOWED", "reason": "ALLOWED WITH A WRITTEN REASON",
    "approval": "EXCEPTION -- reason and project lead approval", "note": "ALLOWED, LISTED",
    "forbidden": "NOT ALLOWED", "no_new": "NOT ALLOWED IN NEW CODE (existing use is carried and listed)",
    "blocked": "NOT VERIFIED -- do not use until verified",
    "unverified": "NOT VERIFIED -- may be used, listed as unverified",
    "not_measured": "NOT MEASURED",
}


def profile_decision(profile: str, level: str, has_successor: bool) -> str:
    """What `profile` does with an object SAP puts at `level` ('' = no entry)."""
    p = PROFILES[profile]
    if level not in LEVELS:
        return p["unknown"]
    if level == "C":
        return p["C+"] if has_successor else p["C"]
    return p[level]


class TargetError(ValueError):
    """The request names a target (or objects) that cannot be answered as asked."""


class Offline(Exception):
    """The endpoint could not be reached or did not answer usefully."""


# --------------------------------------------------------------------- target
def resolve_target(system_type: Optional[str] = None, version: Optional[str] = None,
                   level: Optional[str] = None, s4core: Optional[str] = None,
                   sp: Optional[str] = None, profile: Optional[str] = None) -> Dict[str, Any]:
    """Validate and complete a target. ROSA itself silently answers for public
    cloud when handed a system type or level it does not know, so nothing
    unknown is allowed through to it."""
    explicit = any(v is not None for v in (system_type, version, level, s4core, sp, profile))
    prof = None
    if profile is not None:
        prof = str(profile).strip().lower()
        if prof not in PROFILES:
            raise TargetError(f"unknown Clean Core profile '{profile}'; use one of: {', '.join(PROFILES)}")
        if level is not None:
            raise TargetError("give either --profile or --level, not both: the profile decides "
                              "what each level means for the project")
        systems = PROFILES[prof]["systems"]
        if not systems:                                   # ecc: nothing to ask anyone
            if any(v is not None for v in (system_type, version, s4core, sp)):
                raise TargetError(f"profile '{prof}' is not measured against a release list; "
                                  "give no --system-type / --version / --s4core with it")
            return {"system_type": "ecc", "version": "-", "level": "-", "is_default": False,
                    "profile": prof}
        if system_type is None:
            system_type = systems[0]
        elif system_type.strip().lower() not in systems:
            raise TargetError(f"profile '{prof}' is for {' / '.join(systems)}, not for "
                              f"'{system_type}'; the brief's product and its clean_core line disagree")
        # The highest level the profile does anything but forbid: what the run is "at".
        level = max((lv for lv in LEVELS
                     if any(PROFILES[prof][k] not in ("forbidden", "no_new")
                            for k in ((lv, "C+") if lv == "C" else (lv,)))), default="A")
    st = (system_type or DEFAULT_TARGET["system_type"]).strip().lower()
    if st not in SYSTEM_TYPES:
        raise TargetError(f"unknown system type '{system_type}'; use one of: {', '.join(SYSTEM_TYPES)}")
    lv = (level or DEFAULT_TARGET["level"]).strip().upper()
    if lv not in LEVELS:
        raise TargetError(f"unknown Clean Core level '{level}'; use one of: {', '.join(LEVELS)}")

    if s4core is not None or sp is not None:
        if version is not None:
            raise TargetError("give either --version or --s4core/--sp, not both")
        if s4core is None or sp is None:
            raise TargetError("--s4core needs --sp (the system's S4CORE support package, "
                              "System > Status); the release lists differ per feature pack")
        year = S4CORE_RELEASES.get(str(s4core).strip())
        if not year:
            raise TargetError(f"S4CORE {s4core} has no release list in SAP's repository; "
                              f"known: {', '.join(f'{k} (S/4HANA {v})' for k, v in S4CORE_RELEASES.items())}")
        if not str(sp).strip().isdigit():
            raise TargetError(f"--sp must be a number, got '{sp}'")
        n = int(str(sp).strip())
        version = year if (year == "2022" and n == 0) else f"{year}_{n}"

    ver = (version or DEFAULT_TARGET["version"]).strip()
    if ver != "latest":
        if st in ("public_cloud", "btp"):
            raise TargetError(f"{st} has one current release list; --version / --s4core apply "
                              "to private_cloud and on_premise only")
        if not re.fullmatch(r"\d{4}(_\d+)?", ver):
            raise TargetError(f"version '{ver}' is not a release the repository files lists under; "
                              "use 'latest' or a form like 2023_3 (S/4HANA 2023 FPS03)")
    return {"system_type": st, "version": ver, "level": lv, "is_default": not explicit,
            "profile": prof}


def describe_target(t: Dict[str, Any]) -> str:
    if t.get("profile"):
        if t["system_type"] == "ecc":
            return f"profile {t['profile']} (not measured)"
        return f"{t['system_type']} / {t['version']} / profile {t['profile']}"
    return f"{t['system_type']} / {t['version']} / level {t['level']}"


def _same_target(a: Dict[str, Any], b: Dict[str, Any]) -> bool:
    return all(a[k] == b[k] for k in ("system_type", "version", "level"))


# -------------------------------------------------------------------- network
def _get(path: str, params: Dict[str, str]) -> Tuple[int, Any]:
    """One GET against ROSA. Returns (HTTP status, parsed JSON or None); raises
    Offline when nothing answered. The single seam the tests replace."""
    if not HAS_REQUESTS:
        raise Offline("the 'requests' package is not installed (pip install requests)")
    try:
        response = requests.get(f"{API_BASE}{path}", params=params, timeout=15, verify=False)
    except Exception as e:  # connection refused, DNS, timeout, TLS...
        # The class name only: the message carries the query string and, on a
        # Turkish Windows, an OS error text the cp1252 transcript cannot hold.
        raise Offline(f"{type(e).__name__} reaching {API_BASE}")
    try:
        body = response.json()
    except ValueError:
        body = None
    return response.status_code, body


def _known_versions() -> Optional[List[str]]:
    status, body = _get("/versions", {})
    if status != 200 or not isinstance(body, dict):
        return None
    return [str(v.get("version")) for v in body.get("versions", []) if v.get("version")]


# ------------------------------------------------------------------- the check
def split_names(object_names: List[str]) -> List[str]:
    """Commas and spaces both separate names; order kept, duplicates dropped."""
    names: List[str] = []
    for chunk in object_names:
        for part in re.split(r"[,\s]+", str(chunk)):
            part = part.strip().upper()
            if part and part not in names:
                names.append(part)
    return names


def _entry(name: str, verdict: str, verified: bool, source: str, *, object_type: str = "",
           level: str = "", state: str = "", successors: Optional[List[Dict[str, str]]] = None,
           note: str = "", decision: str = "") -> Dict[str, Any]:
    e = {
        "object": name, "verdict": verdict, "verified": verified, "source": source,
        "object_type": object_type, "level": level, "state": state,
        "successors": successors or [], "note": note,
    }
    if decision:                       # only a run with --profile carries one
        e["decision"] = decision
    return e


def _asked_level(target: Dict[str, Any]) -> str:
    """The level the endpoint is asked for. It answers A and B as asked and
    falls back to A for C and D, so anything else is asked at A and compared
    here: every row it returns names the object's own level."""
    if target.get("profile") or target["level"] not in ("A", "B"):
        return "A"
    return target["level"]


def _online(names: List[str], target: Dict[str, Any]) -> List[Dict[str, Any]]:
    if target["version"] != "latest":
        known = _known_versions()
        if known is not None and target["version"] not in known:
            raise TargetError(f"the repository has no {target['system_type']} list for version "
                              f"'{target['version']}'; available: {', '.join(known)}. Pick the "
                              "highest one not above the system's support package.")
    asked = _asked_level(target)
    profile = target.get("profile")
    status, body = _get("/compliance", {
        "object_names": ",".join(names),
        "system_type": target["system_type"],
        "version": target["version"],
        "target_level": asked,
    })
    if status != 200 or not isinstance(body, dict) or not isinstance(body.get("results"), list):
        detail = body.get("message") or body.get("error") if isinstance(body, dict) else None
        raise Offline(f"endpoint answered HTTP {status}" + (f": {detail}" if detail else ""))
    echoed = {"system_type": body.get("system_type"), "version": body.get("version"),
              "level": body.get("targetLevel")}
    if not _same_target(echoed, dict(target, level=asked)):
        raise Offline(f"endpoint answered for {describe_target(echoed)} instead of "
                      f"{describe_target(dict(target, level=asked, profile=None))}")

    by_input = {str(r.get("input", "")).upper(): r for r in body["results"]}
    out = []
    for name in names:
        r = by_input.get(name)
        unknown = PROFILES[profile]["unknown"] if profile else ""
        if r is None:
            out.append(_entry(name, "not_verified", False, "online", decision=unknown,
                              note="the endpoint returned no row for this object"))
            continue
        st = r.get("status")
        successors = [{"object": s.get("objectName", ""), "object_type": s.get("objectType", "")}
                      for s in (r.get("successor") or {}).get("objects", [])]
        common = dict(object_type=r.get("objectType", ""), level=r.get("cleanCoreLevel", ""),
                      state=r.get("state", ""), successors=successors)
        lvl = common["level"]
        if st not in ("compliant", "non_compliant"):
            out.append(_entry(name, "not_verified", False, "online", decision=unknown,
                              note="SAP's repository has no entry for this object on this target"))
        elif profile:
            if lvl not in LEVELS:
                out.append(_entry(name, "not_verified", False, "online", decision=unknown,
                                  note="the repository answered without a Clean Core level", **common))
            else:
                d = profile_decision(profile, lvl, bool(successors))
                out.append(_entry(name, _VERDICT_OF[d], True, "online", decision=d, **common))
        elif asked != target["level"]:
            if lvl not in LEVELS:
                out.append(_entry(name, "not_verified", False, "online",
                                  note="the repository answered without a Clean Core level", **common))
            else:
                out.append(_entry(name, "allowed" if lvl <= target["level"] else "not_allowed",
                                  True, "online", **common))
        elif st == "compliant":
            out.append(_entry(name, "allowed", True, "online", **common))
        else:
            out.append(_entry(name, "not_allowed", True, "online", **common))
    return out


def _offline(names: List[str], target: Dict[str, Any]) -> List[Dict[str, Any]]:
    same = _same_target(BUNDLED["target"], target)
    profile = target.get("profile")
    unknown = PROFILES[profile]["unknown"] if profile else ""
    out = []
    for name in names:
        hit = BUNDLED["objects"].get(name)
        if hit is None:
            out.append(_entry(name, "not_verified", False, "none", decision=unknown,
                              note="endpoint unreachable and not in the bundled snapshot"))
            continue
        otype, level, state, succ = hit
        successors = [{"object": s, "object_type": ""} for s in succ]
        if same and level > target["level"]:
            out.append(_entry(name, "not_allowed", False, "bundled", object_type=otype,
                              level=level, state=state, successors=successors,
                              decision="forbidden" if profile else "",
                              note=f"bundled snapshot {BUNDLED['taken']}, not re-checked online"))
        else:
            out.append(_entry(name, "not_verified", False, "bundled", object_type=otype,
                              successors=successors, decision=unknown,
                              note=(f"bundled snapshot {BUNDLED['taken']} is for "
                                    f"{describe_target(BUNDLED['target'])} (level {level}, {state}); "
                                    f"not evidence for {describe_target(target)}")))
    return out


def check_compliance(object_names: List[str], system_type: Optional[str] = None,
                     version: Optional[str] = None, level: Optional[str] = None,
                     s4core: Optional[str] = None, sp: Optional[str] = None,
                     profile: Optional[str] = None) -> Dict[str, Any]:
    """Check a list of standard SAP objects against one target.

    Raises TargetError for a request that cannot be answered as asked. Every
    requested object appears in `results`, in the order given. With `profile`
    each result also carries `decision` (see PROFILES)."""
    names = split_names(object_names)
    if not names:
        raise TargetError("no object names given")
    target = resolve_target(system_type, version, level, s4core, sp, profile)
    today = datetime.date.today().isoformat()
    if target["system_type"] == "ecc":
        # No release list exists for ECC, so nobody is asked and nothing is claimed.
        results = [_entry(n, "not_verified", False, "none", decision="not_measured",
                          note="Clean Core release status is not measured on ECC") for n in names]
        return {
            "source": {"mode": "none", "endpoint": "", "date": today,
                       "text": "none -- SAP publishes no release list for ECC; nothing was asked"},
            "target": {"system_type": "ecc", "version": "-", "level": "-", "profile": target["profile"]},
            "target_is_default": False, "all_verified": False, "exit_code": EXIT_ALL_VERIFIED,
            "profile": _profile_block(target["profile"]),
            "counts": {"allowed": 0, "not_allowed": 0, "not_verified": len(names),
                       "total": len(names), "verified": 0},
            "warnings": [], "results": results,
        }
    try:
        results = _online(names, target)
        source = {"mode": "online", "endpoint": API_BASE, "date": today,
                  "text": f"online -- ROSA {API_BASE} (SAP Cloudification Repository), {today}"}
    except Offline as e:
        results = _offline(names, target)
        source = {"mode": "offline", "endpoint": API_BASE, "date": BUNDLED["taken"],
                  "offline_reason": str(e),
                  "text": (f"OFFLINE -- endpoint not usable ({e}); bundled snapshot taken "
                           f"{BUNDLED['taken']} for {describe_target(BUNDLED['target'])}")}

    counts = {k: sum(1 for r in results if r["verdict"] == k)
              for k in ("allowed", "not_allowed", "not_verified")}
    counts["total"] = len(results)
    counts["verified"] = sum(1 for r in results if r["verified"])
    warnings = []
    if target["is_default"]:
        warnings.append(
            "No target given: answered for S/4HANA Cloud Public Edition (public_cloud / latest / "
            "level A). This does NOT hold for a Private Cloud or on-premise project -- pass its "
            "product and release, e.g. --system-type private_cloud --s4core 108 --sp 3.")
    all_verified = counts["verified"] == counts["total"]
    shown = {k: target[k] for k in ("system_type", "version", "level")}
    extra = {}
    if target.get("profile"):
        shown["profile"] = target["profile"]
        extra["profile"] = _profile_block(target["profile"])
        if any(r.get("decision") == "blocked" for r in results):
            warnings.append(f"Profile {target['profile']}: an object nobody answered for is not "
                            "used until it is verified (in the system's released-objects list, "
                            "or online).")
    return {
        **extra,
        "source": source,
        "target": shown,
        "target_is_default": target["is_default"],
        "all_verified": all_verified,
        "exit_code": EXIT_ALL_VERIFIED if all_verified else EXIT_NOT_VERIFIED,
        "counts": counts,
        "warnings": warnings,
        "results": results,
    }


def _profile_block(name: str) -> Dict[str, Any]:
    p = PROFILES[name]
    return {"name": name, "title": p["title"],
            "rules": {k: p[k] for k in ("A", "B", "C+", "C", "D", "unknown", "classic_ext", "modification")}}


def get_object_details(object_name: str, **target: Any) -> Dict[str, Any]:
    """One object's entry (see check_compliance), with the run's source and target."""
    run = check_compliance([object_name], **target)
    return dict(run["results"][0], source_text=run["source"]["text"], target=run["target"])


def get_successor(object_name: str, **target: Any) -> Optional[Dict[str, Any]]:
    """The first successor the repository (or the bundled snapshot) names, with
    whether that came from a verified answer. None when there is none."""
    entry = get_object_details(object_name, **target)
    if not entry["successors"]:
        return None
    return dict(entry["successors"][0], verified=entry["verified"], source=entry["source"])


# ------------------------------------------------------------------------ CLI
LABEL = {"allowed": "ALLOWED", "not_allowed": "NOT ALLOWED", "not_verified": "NOT VERIFIED"}


def render_text(run: Dict[str, Any]) -> str:
    lines = ["Clean Core check", "=" * 60,
             f"Source: {run['source']['text']}",
             f"Target: {describe_target(run['target'])}"]
    for w in run["warnings"]:
        lines.append(f"WARNING: {w}")
    c = run["counts"]
    lines.append(f"Objects: {c['total']} -- allowed {c['allowed']}, not allowed {c['not_allowed']}, "
                 f"not verified {c['not_verified']}; verified online {c['verified']}/{c['total']}")
    if run["source"]["mode"] == "offline":
        lines.append("Nothing below is verified. Re-run online before any of it goes into a document.")
    lines.append("")
    if run.get("profile"):
        ru = run["profile"]["rules"]
        lines.insert(4, f"Profile: {run['profile']['name']} -- {run['profile']['title']}")
        lines.insert(5, "  objects: " + ", ".join(f"{k} {ru[k]}" for k in ("A", "B", "C+", "C", "D", "unknown"))
                     + f"; classic enhancement {ru['classic_ext']}, modification {ru['modification']}")
    for r in run["results"]:
        label = DECISION_LABEL[r["decision"]] if r.get("decision") else LABEL[r["verdict"]]
        if r["verdict"] != "not_verified" and not r["verified"]:
            label += ", unverified"
        facts = ", ".join(x for x in (r["object_type"], f"level {r['level']}" if r["level"] else "",
                                       r["state"]) if x)
        lines.append(f"  {r['object']}: {label}" + (f" ({facts})" if facts else "") + f" [{r['source']}]")
        if r["note"]:
            lines.append(f"    {r['note']}")
        if r["successors"]:
            names = [s["object"] for s in r["successors"]]
            shown = names if len(run["results"]) == 1 else names[:3]
            more = f" ... and {len(names) - len(shown)} more" if len(names) > len(shown) else ""
            lines.append(f"    Successors: {', '.join(shown)}{more}")
    lines.append("")
    if run["source"]["mode"] == "none":
        lines.append("Exit code: 0 = nothing to verify on this profile.")
    else:
        lines.append("Exit code: 0 = all verified online, 3 = at least one NOT verified.")
    return "\n".join(lines)


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(
        prog="clean_core_checker.py",
        description="Is this standard SAP object allowed at this Clean Core level, on this "
                    "product and release? Every object asked for is answered: allowed, not "
                    "allowed, or not verified.")
    p.add_argument("objects", nargs="*", help="standard SAP object names; commas also separate")
    p.add_argument("--system-type", choices=SYSTEM_TYPES,
                   help="target product (default public_cloud)")
    p.add_argument("--version", help="release list for private_cloud / on_premise, e.g. 2023_3 "
                                     "(S/4HANA 2023 FPS03); default latest")
    p.add_argument("--s4core", help="S4CORE release instead of --version (107, 108, 109)")
    p.add_argument("--sp", help="S4CORE support package, with --s4core")
    p.add_argument("--level", choices=LEVELS, help="highest acceptable Clean Core level (default A)")
    p.add_argument("--profile", choices=tuple(PROFILES),
                   help="the project's Clean Core profile (the brief's clean_core line); "
                        "decides what each level means, instead of --level")
    p.add_argument("--list-profiles", action="store_true",
                   help="print the profile table as JSON and exit")
    p.add_argument("--json", action="store_true", help="print the whole result as JSON")
    args = p.parse_args(argv)

    if args.list_profiles:
        print(json.dumps({n: _profile_block(n) for n in PROFILES}, indent=1))
        return EXIT_ALL_VERIFIED

    objects = list(args.objects)
    # `compliance MARA,BSEG` is how ts-generator spelled a batch call; the word
    # was never a subcommand and used to be checked as an object name.
    if objects and objects[0].lower() == "compliance":
        objects = objects[1:]
    if not objects:
        p.print_usage()
        print("error: give at least one object name", file=sys.stderr)
        return EXIT_USAGE

    try:
        run = check_compliance(objects, args.system_type, args.version, args.level,
                               args.s4core, args.sp, args.profile)
    except TargetError as e:
        if args.json:
            print(json.dumps({"error": str(e), "exit_code": EXIT_USAGE}, indent=1))
        else:
            print(f"error: {e}", file=sys.stderr)
        return EXIT_USAGE

    print(json.dumps(run, indent=1) if args.json else render_text(run))
    return run["exit_code"]


if __name__ == "__main__":
    sys.exit(main())
