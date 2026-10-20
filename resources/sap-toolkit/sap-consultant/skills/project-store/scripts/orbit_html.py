#!/usr/bin/env python3
"""Markdown -> the HTML Orbit's page editor stores.

Written against pages the Customer K team made by hand (read 2026-09-28):
headings are `<h2 class="editor-heading-block">`, paragraphs and list items carry
`editor-paragraph-block`, tables are `<table><tbody>` with a `background` on
header cells. orbit-mcp 0.1.0 ships a converter too, and it lost two things a TS
cannot do without: a fenced code block came out as one line with its backticks
still in it, and a heading became a bold paragraph. Both are handled here.

Mermaid has no renderer in Orbit's editor, so a diagram is kept as a code block
labelled `mermaid` -- readable source, and the Word attachment carries the
drawing.

Standard library only: this script ships to consultants.
"""
from __future__ import annotations

import html
import re

P = 'class="editor-paragraph-block"'
H = 'class="editor-heading-block"'
HEAD_BG = "#1F3864"
LABEL_BG = "#D9E1F2"
TABLE_WIDTH = 940

_LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
_CODE = re.compile(r"`([^`]+)`")
_BOLD = re.compile(r"\*\*(.+?)\*\*")
_ITAL = re.compile(r"(?<![*\w])\*(?!\s)([^*\n]+?)\*(?![*\w])")
_FENCE = re.compile(r"^(`{3,}|~{3,})\s*([\w+-]*)\s*$")
_HEAD = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
_BULLET = re.compile(r"^(\s*)[-*+]\s+(.*)$")
_NUMBER = re.compile(r"^(\s*)\d+[.)]\s+(.*)$")
_RULE = re.compile(r"^([-*_])(\s*\1){2,}\s*$")
_TABLE_SEP = re.compile(r"^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$")


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def inline(raw: str) -> str:
    """Bold, italic, inline code and links; everything else escaped."""
    keep: list[str] = []

    def hold(frag: str) -> str:
        keep.append(frag)
        return f"\x00{len(keep) - 1}\x00"

    # Code first: nothing inside backticks is formatting.
    s = _CODE.sub(lambda m: hold(f"<code>{esc(m.group(1))}</code>"), raw)
    s = _LINK.sub(lambda m: hold(
        f'<a target="_blank" rel="noopener noreferrer" href="{esc(m.group(2))}">'
        f"{esc(m.group(1))}</a>"), s)
    s = esc(s)
    s = _BOLD.sub(r"<strong>\1</strong>", s)
    s = _ITAL.sub(r"<em>\1</em>", s)
    return re.sub(r"\x00(\d+)\x00", lambda m: keep[int(m.group(1))], s)


def para(inner: str) -> str:
    return f"<p {P}>{inner}</p>"


def _cells(line: str) -> list[str]:
    t = line.strip()
    t = t[1:] if t.startswith("|") else t
    t = t[:-1] if t.endswith("|") and not t.endswith("\\|") else t
    parts = re.split(r"(?<!\\)\|", t)
    return [c.strip().replace("\\|", "|") for c in parts]


def table(lines: list[str]) -> str:
    head = _cells(lines[0])
    body = [_cells(l) for l in lines[2:]]
    cols = max([len(head)] + [len(r) for r in body] + [1])
    width = max(80, TABLE_WIDTH // cols)
    label_table = all(h == "" for h in head)

    def cell(text: str, bg: str | None) -> str:
        inner = inline(text)
        if bg == HEAD_BG:
            inner = f"<strong>{inner}</strong>"
        elif bg == LABEL_BG:
            inner = f"<strong>{inner}</strong>"
        attr = f' background="{bg}"' if bg else ""
        return f'<td colspan="1" rowspan="1" colwidth="{width}"{attr}>{para(inner)}</td>'

    rows = []
    if not label_table:
        rows.append("<tr>" + "".join(cell(h, HEAD_BG) for h in head + [""] * (cols - len(head))) + "</tr>")
    for r in body:
        r = r + [""] * (cols - len(r))
        rows.append("<tr>" + "".join(cell(v, LABEL_BG if label_table and i == 0 else None)
                                     for i, v in enumerate(r)) + "</tr>")
    return "<table><tbody>" + "".join(rows) + "</tbody></table>"


def _list(items: list[tuple[int, bool, str]]) -> str:
    """items: (indent, ordered, text). Deeper indent nests under the previous item."""
    out: list[str] = []
    stack: list[tuple[int, str]] = []          # (indent, tag)
    for indent, ordered, text in items:
        tag = "ol" if ordered else "ul"
        cls = "list-decimal" if ordered else "list-disc"
        while stack and indent < stack[-1][0]:
            out.append(f"</li></{stack.pop()[1]}>")
        if not stack or indent > stack[-1][0]:
            out.append(f'<{tag} class="{cls} pl-7 space-y-(--list-spacing-y)">')
            stack.append((indent, tag))
        else:
            out.append("</li>")
        out.append(f'<li class="not-prose space-y-2">{para(inline(text))}')
    while stack:
        out.append(f"</li></{stack.pop()[1]}>")
    return "".join(out)


def markdown_to_orbit(md: str) -> str:
    lines = md.replace("\r\n", "\n").split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1
            continue
        m = _FENCE.match(s)
        if m:
            fence, lang = m.group(1), m.group(2).lower()
            body = []
            i += 1
            while i < n and not lines[i].strip().startswith(fence[0] * len(fence)):
                body.append(lines[i])
                i += 1
            i += 1
            cls = f' class="language-{esc(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{esc(chr(10).join(body))}</code></pre>")
            continue
        if s.startswith("|") and i + 1 < n and _TABLE_SEP.match(lines[i + 1].strip()):
            block = []
            while i < n and lines[i].strip().startswith("|"):
                block.append(lines[i])
                i += 1
            out.append(table(block))
            continue
        m = _HEAD.match(s)
        if m:
            level = min(len(m.group(1)), 3)
            out.append(f"<h{level} {H}>{inline(m.group(2))}</h{level}>")
            i += 1
            continue
        if _RULE.match(s):
            out.append("<hr>")
            i += 1
            continue
        if s.startswith(">"):
            quote = []
            while i < n and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip()[1:].strip())
                i += 1
            paras = " ".join(quote).split("  ")
            out.append("<blockquote>" + "".join(para(inline(p)) for p in paras if p) + "</blockquote>")
            continue
        if _BULLET.match(line) or _NUMBER.match(line):
            items = []
            while i < n:
                b, num = _BULLET.match(lines[i]), _NUMBER.match(lines[i])
                mm = b or num
                if not mm:
                    if lines[i].strip() and lines[i].startswith("  ") and items:
                        ind, o, t = items[-1]
                        items[-1] = (ind, o, t + " " + lines[i].strip())
                        i += 1
                        continue
                    break
                items.append((len(mm.group(1).expandtabs(4)), bool(num) and not b, mm.group(2)))
                i += 1
            out.append(_list(items))
            continue
        chunk = []
        while i < n:
            t = lines[i].strip()
            if (not t or _FENCE.match(t) or _HEAD.match(t) or t.startswith("|") or t.startswith(">")
                    or _BULLET.match(lines[i]) or _NUMBER.match(lines[i]) or _RULE.match(t)):
                break
            chunk.append(t)
            i += 1
        out.append(para(inline(" ".join(chunk))))
    return "".join(out)
