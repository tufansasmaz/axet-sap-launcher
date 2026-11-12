#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lint an XDP layout as text, before SET_LAYOUT uploads it. Renders nothing.

    py xdp_lint.py form.xdp [--locale tr_TR] [--grid ROW_SUBFORM ...]

ADS renders several broken layouts without an error, so these only show up when a
person opens the PDF. Rules:

  ERROR  ready-event   <event activity="layout:ready"> is not an XFA value; ADS renders
                       without complaint and the script never runs. Write
                       activity="ready" ref="$layout".
  WARN   row-width     an lr-tb row whose children's w add up to within 1 mm of the
                       container (equal included) with 5 or more children: the last column
                       was seen to drop to the next line. Make the sum 1 mm smaller.
  WARN   multiline-h   a multiLine text field with a fixed h cuts long text; use minH.
  WARN   data-schema   fields are bound to data (`bind ref=...`) but the XDP carries no
                       `dataDescription`: an XDP written by hand has none, and the bound
                       table or fields were seen to come out EMPTY. Not proof -- render it.
  WARN   locale        no locale on the root subform (or not the one --locale names).
  WARN   font          a text-bearing draw or a non-barcode field with no <font>.
  INFO   everything that was looked at and could not be judged (no w, a repeating row,
         a row named with --grid, a non-Arial typeface whose embedding was not checked).

Exit: 0 no ERROR · 1 at least one ERROR · 2 the file is not readable XML or has no XFA
template. "0 findings" means these rules only: page breaks, page count, barcodes, fonts
in the PDF and the data binding are never checked here -- open the PDF.

Adapted from Ozgur Yilmaz's axet-template (MIT): sap-pdf-output/scripts/xdp_denetle.py
and _xdp_ortak.py. Copyright (c) 2026 Ozgur Yilmaz, MIT licence -- full text in
THIRD_PARTY_NOTICES.txt beside this file.
"""
from __future__ import annotations

import argparse
import sys
import xml.parsers.expat

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

TEMPLATE_NS = "http://www.xfa.org/schema/xfa-template/"
LAYOUT_CHILDREN = ("field", "draw", "subform", "exclGroup", "subformSet")
TO_MM = {"mm": 1.0, "cm": 10.0, "in": 25.4, "pt": 25.4 / 72.0}
EPS = 0.001


class Node:
    __slots__ = ("name", "ns", "attrs", "children", "text", "line", "parent")

    def __init__(self, name, ns, attrs, line, parent):
        self.name, self.ns, self.attrs = name, ns, attrs
        self.children, self.text, self.line, self.parent = [], "", line, parent

    def first(self, name):
        return next((c for c in self.children if c.name == name), None)

    def descendants(self):
        for c in self.children:
            yield c
            yield from c.descendants()


def parse(data: bytes) -> Node:
    """A small line-numbered tree (xml.etree carries no line numbers); local names only."""
    p = xml.parsers.expat.ParserCreate(namespace_separator=" ")
    stack: list[Node] = []
    root: list[Node] = []

    def start(name, attrs):
        ns, local = name.split(" ", 1) if " " in name else ("", name)
        clean = {(k.split(" ", 1)[1] if " " in k else k): v for k, v in attrs.items()}
        parent = stack[-1] if stack else None
        node = Node(local, ns, clean, p.CurrentLineNumber, parent)
        (parent.children if parent else root).append(node)
        stack.append(node)

    p.StartElementHandler = start
    p.EndElementHandler = lambda _n: stack.pop()
    p.CharacterDataHandler = lambda t: setattr(stack[-1], "text", stack[-1].text + t) if stack else None
    p.Parse(data, True)
    if not root:
        raise ValueError("empty XML")
    return root[0]


def find_template(root: Node) -> Node | None:
    for n in [root, *root.descendants()]:
        if n.name == "template" and n.ns.startswith(TEMPLATE_NS):
            return n
    return None


def path_of(n: Node) -> str:
    parts = []
    while n is not None and n.name != "template":
        if n.name in ("subform", "field", "draw", "exclGroup", "subformSet", "area",
                      "pageArea", "pageSet"):
            parts.append(n.attrs.get("name") or f"(unnamed {n.name})")
        n = n.parent
    return "/".join(reversed(parts))


def mm(value: str | None) -> float | None:
    """An XFA length in mm; a value without a unit is NOT given XFA's default unit here."""
    if not value:
        return None
    s = value.strip()
    for unit, factor in TO_MM.items():
        if s.endswith(unit):
            try:
                return float(s[: -len(unit)]) * factor
            except ValueError:
                return None
    return None


def repeats(n: Node) -> bool:
    if n.name == "subformSet":
        return True
    occur = n.first("occur")
    return occur is not None and occur.attrs.get("max", "1").strip() != "1"


def ui_kind(field: Node) -> str | None:
    ui = field.first("ui")
    return ui.children[0].name if ui is not None and ui.children else None


def lint(root: Node, locale: str | None = None, grid: tuple = ()) -> list[tuple[str, str, int, str]]:
    template = find_template(root)
    if template is None:
        raise ValueError("no XFA <template> element")
    out: list[tuple[str, str, int, str]] = []

    def add(level, rule, n, message):
        out.append((level, rule, n.line, f"{path_of(n) or n.name}: {message}"))

    top = template.first("subform")
    if top is not None:
        loc = top.attrs.get("locale")
        if not loc:
            add("WARN", "locale", top, "no locale on the root subform (tr_TR for a Turkish form)")
        elif locale and loc != locale:
            add("WARN", "locale", top, f"locale {loc!r}, expected {locale!r}")

    binds = [n for n in template.descendants() if n.name == "bind" and n.attrs.get("ref")]
    if binds and not any(n.name == "dataDescription" for n in root.descendants()):
        add("WARN", "data-schema", binds[0], f"{len(binds)} bound field(s) and no dataDescription in the XDP: a "
                                             "layout written by hand has no data schema and the bound table or "
                                             "fields may render EMPTY. Render it; if they are empty, start from the XDP "
                                             "SFP saved (GET_LAYOUT after the form was opened and saved once)")

    for n in template.descendants():
        if n.name == "subform" and n.attrs.get("layout") == "lr-tb":
            kids = [c for c in n.children if c.name in LAYOUT_CHILDREN
                    and c.attrs.get("presence") not in ("hidden", "inactive")]
            if len(kids) < 2:
                continue
            if n.attrs.get("name") in grid:
                add("INFO", "row-width", n, "named with --grid: column sum not checked")
                continue
            if any(repeats(c) for c in kids):
                add("INFO", "row-width", n, "a repeating child (a card grid?): a static sum is "
                                            "not the row width, not checked")
                continue
            box, widths = mm(n.attrs.get("w")), [mm(c.attrs.get("w")) for c in kids]
            if box is None or any(w is None for w in widths):
                add("INFO", "row-width", n, "not measurable: the row or a child has no w with a unit")
                continue
            total, count = sum(widths), len(kids)
            margin = n.first("margin")
            note = (" (the row has a margin; its inner width is narrower, not counted)"
                    if margin is not None and (margin.attrs.get("leftInset")
                                               or margin.attrs.get("rightInset")) else "")
            summary = f"{count} children, {total:.2f} mm in a {box:.2f} mm row{note}"
            if total > box + EPS:
                add("INFO", "row-width", n, f"wider than the row, so it wraps; fine if meant "
                                            f"(a card grid), else fix: {summary}")
            elif total > box - 1 + EPS:
                if count >= 5:
                    add("WARN", "row-width", n, f"make the columns 1 mm narrower than the row: "
                                                f"{summary}")
                else:
                    add("INFO", "row-width", n, f"columns fill the row exactly; rows of 2-4 were "
                                                f"seen to hold: {summary}")
        elif n.name == "font":
            face = n.attrs.get("typeface")
            if face is None:
                add("WARN", "font", n, "<font> without a typeface")
            elif face != "Arial":
                add("INFO", "font", n, f"typeface {face!r}: embedding and Turkish glyphs in ADS "
                                       f"not checked")
        elif n.name in ("field", "draw"):
            if n.name == "draw" and not any(x.name == "text" for x in n.descendants()):
                continue
            if n.name == "field" and ui_kind(n) == "barcode":
                continue
            if n.first("font") is None:
                add("WARN", "font", n, "no <font>: the effective font is not set here")
            if n.name == "field":
                ui = n.first("ui")
                edit = ui.first("textEdit") if ui is not None else None
                if edit is not None and edit.attrs.get("multiLine") == "1" and n.attrs.get("h"):
                    add("WARN", "multiline-h", n, f"multiLine field with a fixed h=\"{n.attrs['h']}\" "
                                                  f"cuts long text; use minH")
        elif n.name == "event":
            activity = n.attrs.get("activity", "")
            if activity == "layout:ready":
                add("ERROR", "ready-event", n, 'activity="layout:ready" is not XFA; ADS renders without '
                                               'an error and the script never runs. Use '
                                               'activity="ready" ref="$layout"')
            elif ":" in activity:
                add("WARN", "ready-event", n, f"activity={activity!r}: a value with ':' was not "
                                              f"confirmed as valid XFA")
    out.sort(key=lambda r: r[2])
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Lint an XDP layout as text (renders nothing).")
    ap.add_argument("xdp")
    ap.add_argument("--locale", help="the locale the root subform must carry, e.g. tr_TR")
    ap.add_argument("--grid", action="append", default=[],
                    help="name of a row subform that wraps on purpose (repeatable)")
    args = ap.parse_args(argv)
    try:
        with open(args.xdp, "rb") as fh:
            findings = lint(parse(fh.read()), args.locale, tuple(args.grid))
    except (OSError, xml.parsers.expat.ExpatError, ValueError) as exc:
        print(f"NOT CHECKED: {args.xdp}: {exc}")
        return 2
    for level, rule, line, message in findings:
        print(f"{level:5} {rule:13} line {line}: {message}")
    counts = {lv: sum(1 for f in findings if f[0] == lv) for lv in ("ERROR", "WARN", "INFO")}
    print(f"\n{counts['ERROR']} error(s), {counts['WARN']} warning(s), {counts['INFO']} note(s). "
          f"Not checked here: rendering, page breaks and count, barcodes, fonts in the PDF, "
          f"data binding -- open the PDF.")
    return 1 if counts["ERROR"] else 0


if __name__ == "__main__":
    sys.exit(main())
