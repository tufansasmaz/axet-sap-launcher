#!/usr/bin/env python3
"""Object-type knowledge for cross-system transfer: what a type is called, when
it deploys, and how its payload is read.

Split out of the extract/deploy scripts because all three need the same three
answers and a second copy of this table is a second place for it to drift.

DEPLOY_ORDER is the tier a type deploys in. It is not a preference -- it is the
DDIC dependency chain: a data element cannot activate before its domain, a table
cannot activate before the structure it includes, a service binding cannot exist
before its service definition. Tiers were carried over from the cross-migration
module of the internal ADT app, which earned them against real systems.

Ordering INSIDE a tier is not covered here; same-tier objects can still depend on
each other (STRU .INCLUDE STRU is the common one) and that needs a topological
sort over discovered edges. See transfer_extract.py.
"""
from __future__ import annotations

# ADT's own type strings (as returned by the package listing) -> our short code.
# The listing reports TABL twice with different second segments: /DT is a
# transparent table, /DS a structure. They share a tier but not a payload shape,
# so collapsing them would silently write a structure as a table.
ADT_TYPE_MAP = {
    "DOMA/DD": "DOMA",
    "DTEL/DE": "DTEL",
    "TABL/DT": "TABL",
    "TABL/DS": "STRU",
    "TTYP/DA": "TTYP",
    "MSAG/N": "MSAG",
    "INTF/OI": "INTF",
    "CLAS/OC": "CLAS",
    "FUGR/F": "FUGR",
    "FUGR/FF": "FUNC",
    "DDLS/DF": "DDLS",
    "DCLS/DL": "DCLS",
    "DDLX/EX": "DDLX",
    "BDEF/BDO": "BDEF",
    "SRVD/SRV": "SRVD",
    "SRVB/SVB": "SRVB",
    "PROG/P": "PROG",
    "PROG/I": "INCL",
}

DEPLOY_ORDER = {
    "DOMA": 1,
    "DTEL": 2,
    "TABL": 3,
    "STRU": 3,
    "TTYP": 4,
    "MSAG": 5,
    "INTF": 6,
    "CLAS": 7,
    "FUGR": 8,
    # A user-managed function-group include sits between its parent FG (which must
    # exist to host it) and the function modules (whose PERFORMs may land in it).
    "INCL_FUGR": 8.5,
    "FUNC": 9,
    "DDLS": 10,
    "DCLS": 11,
    "DDLX": 12,
    "BDEF": 13,
    # A RAP behaviour pool is a CLAS, but it cannot deploy with ordinary classes.
    # SAP refuses it until the behaviour definition and its root entity exist:
    #   "The type ZKIB_I_CC_CALL is not a root entity or is not released for
    #    BEHAVIOR implementations."
    # Measured on NS4 2026-08-11. The dependency also runs the "wrong" way -- the
    # BDEF names the class, so a naive topological sort puts the class FIRST --
    # which is why this is a tier and not an edge.
    "CLAS_BEHAVIOR_POOL": 13.5,
    "SRVD": 14,
    "SRVB": 15,
    "PROG": 20,
    "INCL": 20,
}

# Types whose content is TEXT. These are read at <uri>/source/main, renamed as
# text, and written back as source -- which is why a table keeps its keys, its
# foreign keys and its .INCLUDEs instead of being reduced to parsed parameters.
SOURCE_BEARING = {"TABL", "STRU", "CLAS", "INTF", "PROG", "INCL",
                  "FUGR", "FUNC", "DDLS", "DCLS", "DDLX", "BDEF", "SRVD"}

# Types whose content is XML at <uri>. The object IS its metadata.
XML_BEARING = {"DOMA", "DTEL", "TTYP", "MSAG", "SRVB"}

# Package entries. The listing returns the package under five DEVC subtypes
# (K/P/I/DV/DF/F); none of them is a transferable object.
PACKAGE_PREFIX = "DEVC/"

# ── TADIR, because the ADT package listing is not an inventory ────────────────
# Measured 2026-08-11 on ZREA_DENEME (NR4): TADIR held 60 rows, the ADT listing
# returned 32, and one of the missing 28 was ZREA_GDP_LOG -- a live, readable
# table that three of the transferred programs reference. Building the inventory
# from the listing alone would have shipped code pointing at a table that does not
# exist on the target.
#
# The other 27 were all generated: Gateway/OData artifacts and authorization
# defaults that appear when a service is published. Those must NOT travel, which
# is why the filter is by type rather than by name pattern -- a name filter would
# have to guess, and these types are unambiguous.
GENERATED_TADIR = {
    "SUSH",   # authorization default values
    "SICF",   # ICF service nodes (created by Gateway registration)
    "IWMO", "IWSV", "IWVB", "IWOM", "IWSG", "IWPR", "IWMV",  # Gateway/OData
    "DEVC",   # the package itself
}

# TADIR OBJECT -> our short code, for rows the ADT listing did not return.
# TABL is deliberately absent: TADIR says TABL for a transparent table AND for a
# structure, and the two do not share a payload shape. Resolve it by asking which
# ADT endpoint answers (see resolve_tabl in transfer_extract.py).
TADIR_TYPE_MAP = {
    "DOMA": "DOMA", "DTEL": "DTEL", "TTYP": "TTYP", "MSAG": "MSAG",
    "INTF": "INTF", "CLAS": "CLAS", "FUGR": "FUGR", "PROG": "PROG",
    "DDLS": "DDLS", "DCLS": "DCLS", "DDLX": "DDLX", "BDEF": "BDEF",
    "SRVD": "SRVD", "SRVB": "SRVB",
}

# Types ADT cannot carry at all. Not a limitation of this tool -- ADT has no
# endpoint for them. They belong in the plan (so the inventory stays complete)
# routed to `via: request`, never dropped.
NOT_VIA_ADT = {
    "DYNP": "screen / dynpro - travels in the transport, or screen-gen",
    "TABU": "table CONTENTS - neither ADT nor abapGit moves rows",
    "SFPF": "Adobe form - use adobe-gen",
    "SFPI": "Adobe interface - use adobe-gen",
    "TRAN": "transaction code",
    "ENHO": "enhancement implementation",
    # Added 2026-08-13 from a live extract of ZGNL_PP_001. It was the first type
    # to reach the plan as "not classified", and the answer was already half in
    # this repo: function_modules() drops TABLEFRAME_<grp>/TABLEPROC_<grp>
    # because "those are regenerated on the target by SE54, not copied". True --
    # BY SOMEBODY. Regeneration is a person opening SE54 on the target, and until
    # this line existed nothing in the delivery said so, which is how a table
    # arrives complete and unmaintainable.
    "TOBJ": "table maintenance (SE54) - regenerate it on the TARGET; the "
            "TABLEFRAME_/TABLEPROC_ modules are not copied either",
}


# ── Object URIs ───────────────────────────────────────────────────────────────
# The package listing hands back SEARCH uris (/sap/bc/adt/tabl/dts/<name>) which
# do NOT serve content -- reading one returns nothing, and "nothing" looks exactly
# like "this object has no dependencies". Measured 2026-08-11: every object in a
# real package came back with zero edges before this was fixed.
#
# The real paths come from the ENGINE's own table rather than a copy, so a path
# corrected in sap-adt reaches this skill without anyone remembering to mirror it.
# Only the types the engine does not know are listed here, and all four were read
# live before being written down.
URL_PATH_EXTRA = {
    "BDEF": "bo/behaviordefinitions",
    "SRVD": "ddic/srvd/sources",
    "SRVB": "businessservices/bindings",
    "MSAG": "messageclass",
}

# ADT is case-sensitive about object names in URLs and not consistently: message
# classes answer on the upper-case form, everything else on the lower-case one.
UPPERCASE_IN_URL = {"MSAG"}


def _engine_url_paths() -> dict:
    """ADT type string -> url_path, read out of the sap-adt engine's own table."""
    try:
        from object_types import OBJECT_TYPES
    except ImportError:
        return {}
    out = {}
    for meta in OBJECT_TYPES.values():
        adt_type, path = meta.get("adt_type"), meta.get("url_path")
        if adt_type and path:
            out[adt_type.upper()] = path
    return out


def url_path_for(code: str) -> str | None:
    """ADT url path segment for a short code."""
    if code in URL_PATH_EXTRA:
        return URL_PATH_EXTRA[code]
    engine = _engine_url_paths()
    for adt_type, short in ADT_TYPE_MAP.items():
        if short == code:
            path = engine.get(adt_type)
            if path:
                return path
    return None


def object_uri(code: str, name: str) -> str | None:
    """Content-serving ADT path for an object, or None if the type is unknown."""
    path = url_path_for(code)
    if not path:
        return None
    n = name.upper() if code in UPPERCASE_IN_URL else name.lower()
    return "/sap/bc/adt/%s/%s" % (path, n)


def kit_type_for(code: str) -> str | None:
    """Our short code -> the object_type string the sap-adt tools expect.

    Derived from the engine's own table rather than written out again, so the two
    cannot drift. None means the engine has no create path for this type yet --
    today that is MSAG, BDEF, SRVD and SRVB.
    """
    try:
        from object_types import OBJECT_TYPES
    except ImportError:
        return None
    wanted = None
    for adt_type, short in ADT_TYPE_MAP.items():
        if short == code:
            wanted = adt_type.upper()
            break
    if not wanted:
        return None
    for key, meta in OBJECT_TYPES.items():
        if (meta.get("adt_type") or "").upper() == wanted:
            return key
    return None


def code_for(adt_type: str) -> str | None:
    """Short code for an ADT type string, or None if it is not transferable."""
    if not adt_type:
        return None
    if adt_type.startswith(PACKAGE_PREFIX):
        return None
    return ADT_TYPE_MAP.get(adt_type.upper())


def order_of(code: str, parent_fugr: str | None = None,
             behavior_pool: bool = False) -> float:
    """Deploy tier. Two types take a slot their code alone does not imply:
    a function-group include (8.5) and a RAP behaviour pool class (13.5).
    """
    if code == "INCL" and parent_fugr:
        return DEPLOY_ORDER["INCL_FUGR"]
    if code == "CLAS" and behavior_pool:
        return DEPLOY_ORDER["CLAS_BEHAVIOR_POOL"]
    return DEPLOY_ORDER.get(code, 50)
