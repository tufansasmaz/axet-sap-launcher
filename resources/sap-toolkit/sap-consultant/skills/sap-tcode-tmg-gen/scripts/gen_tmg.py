#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_tmg.py - generate a table maintenance dialog (SE11/SE54 TMG) via ZND_FM_TMG_GEN.

    python gen_tmg.py --cwd . --table ZPM_T_MP_DEF --fugr ZFG_PM_MP_SET --package ZPM \
        --transport XXXK926117 --liste 0002

Rules the generator cannot guess (ask the user):
  * the function group must already exist (adt_create_function_group, same package)
  * --liste is the list screen number; a second table in the SAME group needs the next free
    number (0002), otherwise the first table's screen is overwritten
  * a transportable package needs --transport. The popups of a transportable run (request
    selection) were NOT verified on this system: pass --pre/--post steps if the result names
    a screen it stopped at (format PROG;DYNPRO;FIELD=VALUE;...;OKCODE|...)
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from soap_rfc import call_rfc  # noqa: E402

FM = "ZND_FM_TMG_GEN"
CONFIRM_POPUP = "SAPLSPO1;0300;YES"
ODIR_POPUP = "SAPLSTRD;0100;KO007-L_DEVCLASS={pkg};/00"
REQUEST_POPUP = "SAPLSTRD;0300;KO008-TRKORR={tr};/00"
ODIR_REPEATS = 8
# One package popup + one request popup per generated object (TOBJ, SVIM, ...).
# Extra pairs are harmless: the batch input ends after the save.
TRANSPORT_PAIRS = 3


def build_post(package: str, extra: str, transport: str = "") -> str:
    """Popup answers after GENE.

    Local ($TMP): the package popup, repeated. Transportable: the package is NOT put on
    SE54's own screen. `TVDIR-DEVCLASS` is not an input field on every release (NS4,
    2026-11-11: "TVDIR-DEVCLASS is not an input field", the run stops before anything
    is generated). The package and the request are given in the object-directory and
    request popups instead, one pair per object. This was measured to work on NS4.
    """
    if transport and package.upper() != "$TMP":
        # Measured on NS4: three package popups come before the first request popup on
        # a fresh table, then package/request pairs. The order shifts once SE54 has
        # created the TOBJ entry, which is why main() retries a mismatching run.
        odir, req = ODIR_POPUP.format(pkg=package), REQUEST_POPUP.format(tr=transport)
        steps = [odir, odir, odir] + [req, odir] * TRANSPORT_PAIRS + [req]
    else:
        steps = [ODIR_POPUP.format(pkg=package)] * ODIR_REPEATS
    return "|".join(steps + ([extra] if extra else []))


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--cwd", default=".")
    ap.add_argument("--table", required=True)
    ap.add_argument("--fugr", required=True)
    ap.add_argument("--package", default="$TMP")
    ap.add_argument("--transport", default="")
    ap.add_argument("--authgrp", default="&NC&")
    ap.add_argument("--liste", default="0001")
    ap.add_argument("--two-step", action="store_true")
    ap.add_argument(
        "--pre", default="", help="extra popup steps before the detail screen"
    )
    ap.add_argument("--post", default="", help="extra popup steps after GENE")
    ap.add_argument(
        "--reset",
        action="store_true",
        help="existing TMG: regenerate the overview screen after a table field change",
    )
    args = ap.parse_args()

    if args.package.upper() != "$TMP" and not args.transport:
        print(
            f"[FAIL] package {args.package} is transportable: pass --transport (ask the user)."
        )
        return 1
    package = args.package.upper()
    transport = args.transport.upper()
    params = {
        "IV_TABLE": args.table.upper(),
        "IV_FUGR": args.fugr.upper(),
        # Always '$TMP' towards the FM: a real package there makes it type into
        # TVDIR-DEVCLASS, which some releases do not offer. The real package and
        # request travel in the popups (build_post).
        "IV_DEVCLASS": "$TMP",
        "IV_AUTHGRP": args.authgrp,
        "IV_MTYPE": "2" if args.two_step else "1",
        "IV_LISTE": args.liste,
        "IV_PRE": "|".join(filter(None, [CONFIRM_POPUP, args.pre])),
        "IV_POST": build_post(package, args.post, transport),
    }
    if args.reset:
        # verified flow: 0120 =RESE > 1240 RES_DYNPRO > 1243 LISTSCR, no confirm/corr popups
        params.update({"IV_ACTION": "RESET", "IV_PRE": args.pre, "IV_POST": args.post})
    # SE54's popup order depends on what earlier runs already created (the TOBJ entry
    # appears after a first, partly failed run), and batch input cannot branch. A run
    # that stopped on a popup mismatch is retried with the same answers; measured on
    # NS4 2026-11-11, the second run then generates. Anything else is not retried.
    for attempt in range(1, MAX_ATTEMPTS + 1):
        res = call_rfc(args.cwd, FM, params, timeout=300)
        if not res["ok"]:
            print(f"[FAIL] HTTP {res['http']}: {res['fault'] or 'no response'}")
            return 1
        ok = res["out"].get("EV_OK") == "X"
        message = res["out"].get("EV_MESSAGE") or ""
        if ok or not popup_mismatch(message) or attempt == MAX_ATTEMPTS:
            break
        print(f"[INFO] attempt {attempt}: SE54 asked the popups in another order, retrying")
    print(f"[{'OK' if ok else 'FAIL'}] {message}")
    return 0 if ok else 1


MAX_ATTEMPTS = 3


def popup_mismatch(message: str) -> bool:
    """True when the batch input stopped on a request/package popup it had no answer for."""
    return "No batch input data found for dynpro SAPLSTRD" in message


if __name__ == "__main__":
    raise SystemExit(main())
