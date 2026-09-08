"""The NTT DATA house palette — one definition, every renderer.

WHY THIS FILE EXISTS

Until 2026-08-21 each Office renderer carried its own `GREEN = (0x0A, 0x7D, 0x3C)`:
build_docx, build_manual, build_pptx and md_to_pdf, four copies of one decision.
They did not even stay consistent with themselves — build_docx themed headings
green while its tables used Word's `Light Grid Accent 1`, which follows the
template's BLUE accent, so a single document carried two unrelated colour
systems. Four copies is how that happens: nothing is wrong in any one file.

So the palette moved here. `lib/` is a plugin-ROOT directory, which means two
things that both matter: every Office skill can import it (they already do, for
`redact.py`), and `plugin_root_hash()` in gen_catalog.py covers it, so changing
a colour moves the catalog version and actually reaches consultants.

WHY THESE VALUES

`ACCENT` is sampled from the wordmark in `assets/`, not typed from memory.
`DEEP` is that same hue darkened — a second RANK, not a second brand colour.
Titles have to outrank headings, and the obvious source for a deep navy was the
customer navy in the reference documents; using it would have put one account's
brand on every deliverable this kit produces.

Deliberately no python-docx / python-pptx import here: md_to_pdf.py builds CSS
and must be able to read the palette without either library installed.
"""
from pathlib import Path


def _hex(rgb: tuple) -> str:
    return "%02X%02X%02X" % rgb


def parse_hex(value) -> tuple:
    """`#0072BC` / `0072bc` -> (0, 114, 188). Raises on anything else."""
    s = str(value or "").strip().lstrip("#")
    if len(s) != 6:
        raise ValueError(f"expected a 6-digit hex colour, got {value!r}")
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def darken(rgb: tuple, factor: float = 0.5) -> tuple:
    """A deeper shade of the SAME hue -- the rank below an accent.

    Titles have to outrank headings, and the way to do that without inventing a
    second brand colour is to stay on one hue and move down it. Applied to the
    NTT blue this reproduces DEEP exactly, which is where the number came from;
    a surface that overrides the accent gets its own deep by the same rule
    instead of needing a second flag nobody would keep in step.
    """
    return tuple(max(0, min(255, int(round(c * factor)))) for c in rgb)


ACCENT = (0x00, 0x72, 0xBC)      # NTT DATA blue
DEEP = darken(ACCENT)            # == (0x00, 0x39, 0x5E); titles, H3
INK = (0x22, 0x26, 0x2A)         # body; pure black glares on a lit screen
MUTED = (0x62, 0x6C, 0x76)       # captions, footers, callout text
RULE = (0xD8, 0xE3, 0xEC)        # hairline
BAND = (0xF5, 0xF9, 0xFC)        # table zebra, code ground
TINT = (0xEA, 0xF4, 0xFB)        # diagram fills — lighter than BAND, still blue

ACCENT_HEX = _hex(ACCENT)
DEEP_HEX = _hex(DEEP)
INK_HEX = _hex(INK)
MUTED_HEX = _hex(MUTED)
RULE_HEX = _hex(RULE)
BAND_HEX = _hex(BAND)
TINT_HEX = _hex(TINT)

# Both ship with Windows AND with Word, so the printed page, the .docx and the
# showcase HTML are set in the same faces without embedding a font or reaching
# for a CDN — which a SharePoint-hosted file could not do anyway.
BODY_FONT = "Segoe UI"
LIGHT_FONT = "Segoe UI Light"
SEMI_FONT = "Segoe UI Semibold"
MONO_FONT = "Consolas"

# The mark itself. Beside the palette rather than inside one skill, because the
# .docx, the manual and the deck all place it and there must be one file to
# replace when the brand does.
LOGO = Path(__file__).resolve().parent / "assets" / "ntt-data-logo.png"


def logo_path():
    """The logo, or None when the asset is missing.

    Callers fall back to a text wordmark. A document that loses its logo file
    should come out plainer, never broken.
    """
    return LOGO if LOGO.is_file() else None
