#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Entry point for the AUTH+ CLI from an installed skill copy.

`py -m authplus` resolves only when the plugin-root `scripts/` folder happens to
be on sys.path. That is true in a maintainer clone and false on every consultant
machine: `ntt_setup.materialize()` copies `<skill>/scripts` and `preamble()`
injects SCRIPTS_DIR *only* when that folder exists, so three skills holding
nothing but SKILL.md got no path pointer at all and the module was not
importable. Same shape as the ntt-s4 problem CLAUDE.md records.

The package stays at the plugin root because all three AUTH+ skills share it --
triplicating eleven modules would be three copies to keep in step. This shim is
what makes it reachable, the same way office-pdf reaches
plugins/office-tools/lib: a relative walk from __file__, which holds in the repo
and in the install cache alike, because both carry the whole plugin tree.
"""
from __future__ import annotations

import os
import sys

# A Turkish Windows console is cp1254. A role name or an output path reaches
# print() through a variable, so the source being pure ASCII proves nothing.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# <plugin>/skills/<skill>/scripts/ -> <plugin>/scripts/, which holds authplus/.
_HERE = os.path.dirname(os.path.abspath(__file__))
_PKG_PARENT = os.path.normpath(os.path.join(_HERE, "..", "..", "..", "scripts"))
if _PKG_PARENT not in sys.path:
    sys.path.insert(0, _PKG_PARENT)

try:
    from authplus.cli import main
except ImportError as exc:  # the plugin root did not travel with the skill
    sys.exit(
        "AUTH+ could not import the authplus package.\n"
        f"  looked in: {_PKG_PARENT}\n"
        f"  {exc}\n"
        "The plugin root ships alongside the skill; if that folder is missing, "
        "reinstall the catalog with ntt_setup.py install."
    )

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
