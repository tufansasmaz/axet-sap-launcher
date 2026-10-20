"""How deep a contents list goes -- one rule for the Word and the PDF edition.

A contents list names the places a reader jumps to. When the deepest level is a
run of short entries -- twenty-one test cases of three lines each -- listing
them one by one fills a page of a seven-page document and says less than the
section headings above them (2026-09-29). So the deepest level is left out when
it has many entries and little under each; a TS whose sub-sections run to a page
apiece keeps them.
"""
from __future__ import annotations

MANY = 12          # entries at the deepest level before it may be dropped
SHORT = 800        # average characters under each of them, below which it is


def toc_depth(entries: list[tuple[int, int]]) -> int:
    """entries: (heading level, characters of text under it) for h1-h3, in
    order. Returns the deepest level to list."""
    levels = sorted({lvl for lvl, _ in entries})
    if not levels:
        return 3
    if len(levels) < 2:
        return levels[-1]
    deep = [chars for lvl, chars in entries if lvl == levels[-1]]
    if len(deep) > MANY and sum(deep) / len(deep) < SHORT:
        return levels[-2]
    return levels[-1]
