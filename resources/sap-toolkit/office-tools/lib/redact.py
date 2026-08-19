"""Shared KVKK / PII redaction for office-tools document generators.

Masks Turkish personal/tax identifiers before a document is persisted:
  - TCKN  (11 digits)
  - Vergi no / tax ID (10 digits)

Deliberately conservative: only standalone 10-11 digit runs are masked, so
18-digit SAP material numbers (MATNR), <=9-digit document numbers, phone
numbers with separators, and amounts are left untouched.

Use as a library:
    from redact import redact_text
    safe = redact_text(content)

or as a CLI:
    py redact.py --in report.md --out report.masked.md
    echo "TCKN 12345678901" | py redact.py        # reads stdin -> stdout
"""
from __future__ import annotations

import argparse
import re
import sys

# 10 or 11 consecutive digits, not part of a longer digit run (so MATNR/IBAN
# fragments and 18-digit IDs are skipped). \b would break on the leading digit
# boundary inconsistently, so we use explicit non-digit lookarounds.
_ID_RE = re.compile(r"(?<!\d)\d{10,11}(?!\d)")

DEFAULT_MASK = "**********"


def redact_text(text: str, mask: str = DEFAULT_MASK) -> str:
    """Return *text* with every standalone 10-11 digit ID replaced by *mask*."""
    if not text:
        return text
    return _ID_RE.sub(mask, text)


def count_matches(text: str) -> int:
    """How many IDs would be masked (for logging / verification)."""
    return len(_ID_RE.findall(text or ""))


def _main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Mask TCKN / tax IDs (KVKK).")
    ap.add_argument("--in", dest="inp", help="input file (default: stdin)")
    ap.add_argument("--out", dest="out", help="output file (default: stdout)")
    ap.add_argument("--mask", default=DEFAULT_MASK, help="replacement string")
    ap.add_argument("--count-only", action="store_true",
                    help="print the number of IDs found, change nothing")
    args = ap.parse_args(argv)

    text = open(args.inp, encoding="utf-8").read() if args.inp else sys.stdin.read()

    if args.count_only:
        print(count_matches(text))
        return 0

    masked = redact_text(text, args.mask)
    n = count_matches(text)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(masked)
        print(f"[redact] masked {n} ID(s) -> {args.out}", file=sys.stderr)
    else:
        sys.stdout.write(masked)
    return 0


if __name__ == "__main__":
    raise SystemExit(_main())
