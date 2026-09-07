#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pure-Python source-slicing helpers for adt_get_source's optional `grep` and
`method` read filters.

Text in, text out — no SAP/network/third-party imports here (stdlib `re` only),
so this module is trivially unit-testable in isolation and safe to import from
adt_mcp_server without touching the live session or the source-drift baseline.
"""
from __future__ import annotations

import re
from typing import Optional


def grep_source(text: str, pattern: str, context: int = 3) -> str:
    """Return only the lines of `text` matching regex `pattern`, plus `context`
    lines of surrounding context per match, each prefixed with its 1-based line
    number ("<n>: <line>"). Overlapping/adjacent context windows are merged so
    no source line is duplicated in the output.

    Returns "" if `text`/`pattern` is empty or there are no matches.
    Raises re.error if `pattern` is not a valid regex (caller's job to report
    that cleanly — this function stays pure).
    """
    if not text or not pattern:
        return ""
    lines = text.splitlines()
    n = len(lines)
    rx = re.compile(pattern)
    match_idxs = [i for i, line in enumerate(lines) if rx.search(line)]
    if not match_idxs:
        return ""

    windows: list[list[int]] = []
    for i in match_idxs:
        start = max(0, i - context)
        end = min(n - 1, i + context)
        if windows and start <= windows[-1][1] + 1:
            windows[-1][1] = max(windows[-1][1], end)
        else:
            windows.append([start, end])

    out_lines = []
    for start, end in windows:
        for i in range(start, end + 1):
            out_lines.append(f"{i + 1}: {lines[i]}")
    return "\n".join(out_lines)


def extract_method(text: str, name: str) -> Optional[str]:
    """Extract a single unit's source from `text` by name.

    - Class method: the `METHODS`/`CLASS-METHODS <name> ...` declaration
      line(s) (best-effort, up to its terminating period), if found, followed
      by the full `METHOD <name>. ... ENDMETHOD.` implementation block.
    - Report subroutine: the `FORM <name> ... ENDFORM.` block.

    Each returned line is prefixed with its 1-based line number, matching
    `grep_source`'s convention. Matching is case-insensitive (ABAP keywords
    and identifiers are case-insensitive). Returns None if no matching unit
    (METHOD...ENDMETHOD or FORM...ENDFORM) is found for `name`.
    """
    if not text or not name:
        return None
    lines = text.splitlines()
    name_esc = re.escape(name)

    method_start_re = re.compile(rf'^\s*METHOD\s+{name_esc}\s*\.', re.IGNORECASE)
    method_end_re = re.compile(r'^\s*ENDMETHOD\s*\.', re.IGNORECASE)
    method_block = _extract_block(lines, method_start_re, method_end_re)
    if method_block is not None:
        decl = _find_methods_declaration(lines, name)
        return f"{decl}\n\n{method_block}" if decl else method_block

    form_start_re = re.compile(rf'^\s*FORM\s+{name_esc}\b', re.IGNORECASE)
    form_end_re = re.compile(r'^\s*ENDFORM\s*\.', re.IGNORECASE)
    form_block = _extract_block(lines, form_start_re, form_end_re)
    if form_block is not None:
        return form_block

    return None


def _extract_block(lines: list[str], start_re: "re.Pattern[str]", end_re: "re.Pattern[str]") -> Optional[str]:
    """Find the first line matching `start_re`, then the next line at/after it
    matching `end_re`; return the numbered lines in between (inclusive). If no
    terminator is found before EOF, take through EOF rather than fail hard.
    Returns None if `start_re` never matches.
    """
    start_idx = None
    for i, line in enumerate(lines):
        if start_re.search(line):
            start_idx = i
            break
    if start_idx is None:
        return None

    end_idx = len(lines) - 1
    for j in range(start_idx, len(lines)):
        if end_re.search(lines[j]):
            end_idx = j
            break

    return "\n".join(f"{i + 1}: {lines[i]}" for i in range(start_idx, end_idx + 1))


def _find_methods_declaration(lines: list[str], name: str) -> Optional[str]:
    """Best-effort lookup of a `METHODS`/`CLASS-METHODS <name>` declaration,
    which may span multiple lines (multi-line signature) up to its
    terminating period. Returns numbered declaration text, or None if not
    found within a reasonable scan window.
    """
    name_esc = re.escape(name)
    decl_start_re = re.compile(rf'^\s*(CLASS-)?METHODS\s+{name_esc}\b', re.IGNORECASE)
    for i, line in enumerate(lines):
        if decl_start_re.search(line):
            end_idx = i
            for j in range(i, min(i + 40, len(lines))):
                end_idx = j
                if '.' in lines[j]:
                    break
            return "\n".join(f"{k + 1}: {lines[k]}" for k in range(i, end_idx + 1))
    return None
