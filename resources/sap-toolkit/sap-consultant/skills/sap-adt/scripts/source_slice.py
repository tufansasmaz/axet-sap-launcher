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


def has_implementation_body(text: str) -> bool:
    """Does this source actually implement anything, or is it just a shell?

    Used to decide whether returning `source/main` alone is an honest answer for
    a class. It is a measurement of the bytes SAP returned, not a guess about the
    object: a RAP behaviour pool's main is a generated shell whose every handler
    lives in the `implementations` include, and answering "here is the source"
    with that shell is how a reader concludes the class is empty.

    Comments are stripped first so that a commented-out METHOD does not count.
    """
    stripped = re.sub(r'^\s*\*.*$', '', text, flags=re.M)      # full-line comments
    stripped = re.sub(r'".*$', '', stripped, flags=re.M)       # trailing comments
    return bool(re.search(r'^\s*(METHOD|FORM)\s+[\w~/]', stripped,
                          re.IGNORECASE | re.MULTILINE))


_UNIT_RES = {
    'method': (r'METHOD\s+{n}\s*\.', r'ENDMETHOD\s*\.'),
    'form': (r'FORM\s+{n}\b', r'ENDFORM\s*\.'),
    'module': (r'MODULE\s+{n}\b', r'ENDMODULE\s*\.'),
}


def find_units(text: str, name: str, kind: str = 'method',
               class_name: str = '') -> list[tuple[int, int, str]]:
    """Every `METHOD name.`...`ENDMETHOD.` (or FORM / MODULE) block in `text`.

    Returns [(start_line, end_line, owning_class)] as 0-based indexes into
    text.splitlines(), so a caller can tell one block from another when local
    classes repeat a method name; class_name= keeps only the blocks inside
    `CLASS class_name IMPLEMENTATION`. Comment lines never match (the keyword
    must open the line). A block with no terminator is not returned.
    """
    start_t, end_t = _UNIT_RES[kind]
    start_re = re.compile(r'^\s*' + start_t.format(n=re.escape(name)), re.IGNORECASE)
    end_re = re.compile(r'^\s*' + end_t, re.IGNORECASE)
    impl_re = re.compile(r'^\s*CLASS\s+([\w/]+)\s+IMPLEMENTATION\b', re.IGNORECASE)
    endclass_re = re.compile(r'^\s*ENDCLASS\s*\.', re.IGNORECASE)
    lines = text.splitlines()
    out, current_class, i = [], '', 0
    while i < len(lines):
        m = impl_re.search(lines[i])
        if m:
            current_class = m.group(1).upper()
        elif endclass_re.search(lines[i]):
            current_class = ''
        elif start_re.search(lines[i]):
            end = next((j for j in range(i + 1, len(lines)) if end_re.search(lines[j])), None)
            if end is None:
                break
            if not class_name or current_class == class_name.upper():
                out.append((i, end, current_class))
            i = end
        i += 1
    return out


def replace_lines(text: str, start: int, end: int, new_block: str) -> str:
    """Replace lines start..end (0-based, inclusive) with new_block, keeping the
    text's own line ending (CRLF stays CRLF)."""
    nl = '\r\n' if '\r\n' in text else '\n'
    lines = text.splitlines(keepends=True)
    tail = lines[end][len(lines[end].rstrip('\r\n')):] or nl
    block = nl.join(new_block.replace('\r\n', '\n').rstrip('\n').split('\n')) + tail
    return ''.join(lines[:start]) + block + ''.join(lines[end + 1:])


def _layout_key(line: str) -> str:
    """A line as compared when layout is ignored: no trailing space, and case folded
    unless it holds a literal or a string template (where case is content)."""
    s = line.rstrip()
    return s.strip() if any(q in s for q in ("'", "`", "|")) else s.strip().casefold()


def source_diff(old: str, new: str, context: int = 3, ignore_layout: bool = True,
                labels: tuple = ("before", "after")) -> tuple[list[str], int, int]:
    """Unified diff of two ABAP sources -> (lines, added, removed).

    ignore_layout drops blank lines and compares lines by _layout_key, so what SAP's
    templates and the pretty printer change (empty lines, keyword case, indentation)
    is not reported as a change; the lines shown are the real ones.
    """
    import difflib
    a, b = old.splitlines(), new.splitlines()
    if ignore_layout:
        a = [x for x in a if x.strip()]
        b = [x for x in b if x.strip()]
        ka, kb = [_layout_key(x) for x in a], [_layout_key(x) for x in b]
    else:
        ka, kb = a, b
    out, added, removed = [], 0, 0
    for group in difflib.SequenceMatcher(None, ka, kb, autojunk=False).get_grouped_opcodes(context):
        if not out:
            out += [f"--- {labels[0]}", f"+++ {labels[1]}"]
        i1, i2, j1, j2 = group[0][1], group[-1][2], group[0][3], group[-1][4]
        out.append(f"@@ -{i1 + 1},{i2 - i1} +{j1 + 1},{j2 - j1} @@")
        for tag, x1, x2, y1, y2 in group:
            if tag == "equal":
                out += [" " + ln for ln in b[y1:y2]]
                continue
            out += ["-" + ln for ln in a[x1:x2]]
            out += ["+" + ln for ln in b[y1:y2]]
            removed += x2 - x1
            added += y2 - y1
    return out, added, removed
