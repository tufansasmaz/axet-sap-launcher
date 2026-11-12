"""Wrap ABAP source lines longer than SAP's 255-character limit before a push.

A source-based save refuses any line over 255 characters, and the agent's usual
reaction to "write exactly this source" plus that refusal was to stop (comparison
2026-11-11, scenario E3). ABAP lets a statement continue on the next line between any
two tokens, so a long line is split at a space that is outside every literal and
before any end-of-line comment. Nothing inside '...', `...` or |...| is ever touched;
a line that has no such space is left alone and reported, never cut mid-token.

    new_source, wrapped, unwrappable = wrap_long_lines(source)
"""
from __future__ import annotations

LIMIT = 255


def _break_points(line: str) -> tuple[list[int], int]:
    """Indexes of spaces where the line may be split, and where a "-comment starts (-1 if none)."""
    points: list[int] = []
    quote = ""          # "'", "`" or "|" while inside a literal / string template
    depth = 0           # { } nesting inside a string template
    i = 0
    while i < len(line):
        ch = line[i]
        if quote:
            if quote == "|" and ch == "\\" and i + 1 < len(line):
                i += 2
                continue
            if quote == "|" and ch == "{":
                depth += 1
            elif quote == "|" and ch == "}" and depth:
                depth -= 1
            elif ch == quote and depth == 0:
                # '' and `` are escaped quotes inside their literal
                if quote in "'`" and i + 1 < len(line) and line[i + 1] == quote:
                    i += 2
                    continue
                quote = ""
        elif ch in "'`|":
            quote = ch
        elif ch == '"':
            return points, i
        elif ch == " ":
            points.append(i)
        i += 1
    return points, -1


def _split_comment(prefix: str, text: str, mark: str, limit: int) -> list[str]:
    """A comment too long for one line becomes several, each starting with `mark`."""
    width = max(1, limit - len(prefix) - len(mark))
    return [prefix + mark + text[k:k + width] for k in range(0, len(text), width)] or [prefix + mark]


def _wrap_one(line: str, limit: int) -> list[str] | None:
    if line.lstrip().startswith("*"):
        return _split_comment("", line.lstrip()[1:], "*", limit)
    indent = line[: len(line) - len(line.lstrip())]
    cont = indent + "  "
    out: list[str] = []
    rest = line
    for _ in range(len(line)):           # hard bound: every pass shortens `rest`
        if len(rest) <= limit:
            out.append(rest)
            return out
        lead = len(rest) - len(rest.lstrip())
        if rest.lstrip().startswith('"'):
            out.extend(_split_comment(rest[:lead], rest.lstrip()[1:], '"', limit))
            return out
        points, comment = _break_points(rest)
        if comment > lead:
            head = rest[:comment].rstrip()
            if len(head) <= limit and head.strip():
                # Code fits: the comment moves to its own line(s).
                out.append(head)
                rest = cont + rest[comment:]
                continue
        usable = [p for p in points if lead < p <= limit]
        if not usable:
            return None
        cut = usable[-1]
        out.append(rest[:cut].rstrip())
        rest = cont + rest[cut:].lstrip()
    return None


def wrap_long_lines(source: str, limit: int = LIMIT) -> tuple[str, int, list[int]]:
    """Return (source, lines wrapped, 1-based numbers of lines that could not be wrapped)."""
    nl = "\r\n" if "\r\n" in source else "\n"
    lines = source.split(nl)
    out: list[str] = []
    wrapped = 0
    stuck: list[int] = []
    for no, line in enumerate(lines, 1):
        if len(line) <= limit:
            out.append(line)
            continue
        pieces = _wrap_one(line, limit)
        if pieces is None:
            stuck.append(no)
            out.append(line)
        else:
            wrapped += 1
            out.extend(pieces)
    return nl.join(out), wrapped, stuck
