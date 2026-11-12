"""Decode what SAP's temporary sequential store (TemSe) holds for a list spool.

A spool request is three tables: TSP01 (the request), TST01 (its TemSe object: code
page DCHARCOD, record type DRECTYP, storage DSTOTYP) and TST03 (the content, in
blocks DPART/DROWNO, each DDATALEN bytes long, read over ADT data preview as a hex
string). A list spool -- the output of WRITE -- is records of type "VY4----": a
two-byte big-endian length covering the four-byte header and the body, two flag
bytes, then the body in the object's code page (4103 UTF-16 LE, 4102 UTF-16 BE).
The body's first character is the print control: blank for a line, P for the end of
a page. In the text, U+F8FF opens a five-character format command (COL0N, a colour)
and U+F8FC precedes one box-drawing character, which is kept.

Ported from vibing-steampunk v2.61.0 `pkg/temse/list.go` and the TST03 reading in
`pkg/adt/spool.go` (MIT, Copyright (c) 2025-2026 Alice Vinogradova and contributors).
Standard library only.
"""
from __future__ import annotations

ESC_FORMAT = 0xF8FF
ESC_LINE_ART = 0xF8FC
PAGE_END = "P"


class TemseError(ValueError):
    """The content is not a list spool this decoder can read; the message says why."""


def hex_cell(s: str) -> bytes:
    """A RAW column as data preview returns it (hex digits) -> bytes."""
    s = (s or "").strip()
    if len(s) % 2:
        raise TemseError(f"raw column has {len(s)} hex digits")
    try:
        return bytes.fromhex(s)
    except ValueError as exc:
        raise TemseError(f"raw column is not hex: {exc}") from None


def join_blocks(rows) -> bytes:
    """TST03 rows [(dpart, drowno, ddatalen, dcontent)] in order -> the object's bytes.

    Each block is cut to its DDATALEN: the column is fixed-width and the rest is padding.
    """
    data = bytearray()
    for _part, _row, length, content in rows:
        block = hex_cell(content)
        try:
            n = int(str(length).strip() or 0)
        except ValueError:
            n = 0
        data += block[:n] if 0 < n < len(block) else block
    return bytes(data)


def _strip_escapes(s: str) -> tuple[str, list[str]]:
    out, formats, i = [], [], 0
    while i < len(s):
        c = ord(s[i])
        if c == ESC_FORMAT:
            formats.append(s[i + 1:i + 6])
            i += 6
            continue
        if c != ESC_LINE_ART:
            out.append(s[i])
        i += 1
    return "".join(out).rstrip(" "), formats


def decode_list(data: bytes, charcod: str) -> dict:
    """List-spool bytes -> {pages, records, lines: [{page, text, control?, formats?}]}."""
    cp = (charcod or "").strip()
    if cp == "4103":
        enc = "utf-16-le"
    elif cp == "4102":
        enc = "utf-16-be"
    else:
        raise TemseError(f"list in code page {cp!r}; only the Unicode pages 4103 and 4102 are read")
    pages, records, lines, pos = 1, 0, [], 0
    while pos < len(data):
        if pos + 4 > len(data):
            raise TemseError(f"{len(data) - pos} bytes left at offset {pos}, not enough for a record header")
        length = int.from_bytes(data[pos:pos + 2], "big")
        if length < 4 or pos + length > len(data):
            raise TemseError(f"record at offset {pos} claims {length} bytes, {len(data) - pos} remain")
        body = data[pos + 4:pos + length]
        pos += length
        records += 1
        if len(body) % 2:
            raise TemseError(f"record {records}: {len(body)} bytes is not a whole number of UTF-16 units")
        text = body.decode(enc, errors="replace")
        if not text:
            continue
        control, rest = text[:1], text[1:]
        if control == PAGE_END:
            lines.append({"page": pages, "control": PAGE_END, "text": ""})
            pages += 1
            continue
        line_text, formats = _strip_escapes(rest)
        line = {"page": pages, "text": line_text}
        if control != " ":
            line["control"] = control
        if formats:
            line["formats"] = formats
        lines.append(line)
    if lines and lines[-1].get("control") == PAGE_END:
        pages -= 1   # a trailing page end counted a page with nothing on it
    return {"pages": pages, "records": records, "lines": lines}


def list_text(decoded: dict) -> str:
    """The decoded list as plain text: a line per line, a form feed between pages."""
    parts = []
    for line in decoded.get("lines", []):
        parts.append("\f" if line.get("control") == PAGE_END else line["text"] + "\n")
    return "".join(parts).rstrip("\f\n") + "\n"
