#!/usr/bin/env python3
r"""gen_badi_impl.py - create a BAdI implementation (SE19) through ZND_FM_BADI_IMPL_GEN.

    # new (kernel) BAdI: enhancement implementation + BAdI implementation, class must exist
    python gen_badi_impl.py --cwd . --kind NEW --spot <SPOT> --badi <BADI> \
        --enhname ZEI_<NAME> --impl ZEI_<NAME> --class ZCL_IM_EI_<NAME> \
        --text "<text>" --package <PKG> --transport <REQUEST>

    # source code enhancement at an explicit enhancement point (or implicit FORM begin/end)
    python gen_badi_impl.py --cwd . --kind HOOK --enhname ZEI_<NAME> --program SAPMV45A \
        --full-name '\PR:SAPMV45A\EX:BELEG_SICHERN_14\EI' --spot ES_SAPMV45A \
        --source-file plugin.abap --text "<text>" --package <PKG> --transport <REQUEST>

    # classic BAdI (SXCI): NOT possible without SAP GUI - the FM only returns the SE19 hint

A transportable package needs --transport (ask the user; never invent one).
"""

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
# soap_rfc.py sits next to this script (a copy of sap-tcode-tmg-gen's): each skill reaches
# aXet.code as loose files, so it cannot rely on a sibling skill being installed.
from soap_rfc import call_rfc

FM = "ZND_FM_BADI_IMPL_GEN"


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--cwd", default=".")
    ap.add_argument("--kind", choices=["NEW", "CLASSIC", "HOOK"], required=True)
    ap.add_argument("--spot", default="", help="enhancement spot (NEW only)")
    ap.add_argument("--badi", default="", help="BAdI definition name (NEW/CLASSIC)")
    ap.add_argument(
        "--enhname", default="", help="enhancement implementation (NEW only)"
    )
    ap.add_argument("--impl", default="", help="BAdI implementation name (NEW/CLASSIC)")
    ap.add_argument(
        "--class", dest="cls", default="", help="implementing class (NEW/CLASSIC)"
    )
    ap.add_argument(
        "--program", default="", help="main program of the enhancement point (HOOK)"
    )
    ap.add_argument(
        "--full-name",
        default="",
        help=r"point, e.g. \PR:SAPMV45A\EX:BELEG_SICHERN_14\EI (HOOK)",
    )
    ap.add_argument("--source-file", default="", help="ABAP code of the plug-in (HOOK)")
    ap.add_argument(
        "--enhmode",
        default="",
        help="D = explicit point (default), S = implicit (HOOK)",
    )
    ap.add_argument("--text", default="")
    ap.add_argument("--inactive", action="store_true")
    ap.add_argument("--package", default="$TMP")
    ap.add_argument("--transport", default="")
    a = ap.parse_args()

    if a.package.upper() != "$TMP" and not a.transport:
        print(
            f"[FAIL] package {a.package} is transportable: pass --transport (ask the user)."
        )
        return 1
    if a.kind == "NEW" and not (a.spot and a.enhname and a.badi and a.impl and a.cls):
        print("[FAIL] --kind NEW needs --spot, --badi, --enhname, --impl and --class.")
        return 1
    source = ""
    if a.kind == "HOOK":
        if not (a.enhname and a.program and a.full_name and a.source_file):
            print(
                "[FAIL] --kind HOOK needs --enhname, --program, --full-name and --source-file."
            )
            return 1
        source = (
            Path(a.source_file)
            .read_text(encoding="utf-8")
            .replace("\r\n", "\n")
            .rstrip("\n")
        )

    params = {
        "IV_KIND": a.kind,
        "IV_SPOT": a.spot.upper(),
        "IV_BADI": a.badi.upper(),
        "IV_ENHNAME": a.enhname.upper(),
        "IV_IMPL": a.impl.upper(),
        "IV_CLASS": a.cls.upper(),
        "IV_TEXT": a.text,
        # call_rfc drops empty values, and the FM's IV_ACTIVE defaults to 'X' -- so an
        # empty string here silently meant ACTIVE. A single space is sent instead: it is
        # a non-empty element and an initial CHAR1 on the SAP side.
        "IV_ACTIVE": " " if a.inactive else "X",
        "IV_DEVCLASS": a.package.upper(),
        "IV_TRANSPORT": a.transport.upper(),
        "IV_PROGRAM": a.program.upper(),
        "IV_FULL_NAME": a.full_name,
        "IV_SOURCE": source,
        "IV_ENHMODE": a.enhmode.upper(),
    }
    if a.kind == "NEW" and a.text:
        # Measured on NS4 2026-11-12: a short text makes SAVE store it through the text
        # repository, whose TADIR insert (RS_CORR_INSERT) asks for a request in a DIALOG
        # -- over RFC that is DYNPRO_SEND_IN_BACKGROUND and nothing is created. Without
        # the text the same call creates the implementation in the given request.
        print("[WARN] --text is not sent for a NEW BAdI implementation: SAP asks for its "
              "request in a dialog, which dumps over RFC. Add the text in SE19 afterwards.")
        params["IV_TEXT"] = ""
    if a.kind == "HOOK":
        params["IV_IMPL"] = params["IV_CLASS"] = params["IV_BADI"] = params[
            "IV_ENHNAME"
        ]
    # NTT Studio: kaynak dosyası da gider; onaylı sunucu IV_SOURCE'u dosyayla karşılaştırır
    # ve inceleme kaydını (ENHO) o dosyanın hash'iyle arar.
    res = call_rfc(a.cwd, FM, params, timeout=300,
                   source_file=a.source_file if a.kind == "HOOK" else "")
    if not res["ok"]:
        print(f"[FAIL] HTTP {res['http']}: {res['fault'] or 'no response'}")
        return 1
    ok = res["out"].get("EV_OK") == "X"
    print(f"[{'OK' if ok else 'FAIL'}] {res['out'].get('EV_MESSAGE')}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
