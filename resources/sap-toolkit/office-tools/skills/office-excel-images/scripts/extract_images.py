#!/usr/bin/env python3
"""Extract embedded images from an Excel workbook (.xlsx / .xlsm).

Two extraction passes, combined for completeness:

  1. openpyxl pass — walks every worksheet's drawing anchors so each image
     can be named by the sheet and cell it sits on (Sheet1_B2_1.png). This is
     the friendly, located output.
  2. zip pass — an .xlsx is a zip; every embedded picture lives under
     xl/media/. openpyxl can miss images anchored in headers/footers or inside
     grouped shapes, so we also scan the archive directly and rescue anything
     the first pass did not save (hashed by content to avoid duplicates).

Writes the images to an output folder and prints a summary (or a JSON manifest
with --output json). Legacy .xls is not a zip and stores pictures in an OLE
stream — not supported here; the script says so explicitly.
"""

import argparse
import hashlib
import json
import sys
import zipfile
from pathlib import Path

# Turkish/Unicode sheet names (ı, ş, ğ …) break the default Windows cp1252
# console. Force UTF-8 on stdout/stderr so summaries never crash.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


# ── openpyxl pass ────────────────────────────────────────────────────────────

def _anchor_cell(image) -> str:
    """Best-effort 'B2'-style cell for an openpyxl image anchor."""
    from openpyxl.utils import get_column_letter
    anchor = getattr(image, "anchor", None)
    marker = getattr(anchor, "_from", None) or getattr(anchor, "from_", None)
    if marker is not None and hasattr(marker, "col") and hasattr(marker, "row"):
        try:
            return f"{get_column_letter(int(marker.col) + 1)}{int(marker.row) + 1}"
        except Exception:
            return "cell"
    if isinstance(anchor, str):          # OneCellAnchor stored as a plain ref
        return anchor
    return "cell"


def _safe(name: str) -> str:
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in str(name))


def extract_openpyxl(path: Path, out_dir: Path):
    """Return list of manifest dicts for images openpyxl can locate."""
    from openpyxl import load_workbook

    saved, seen_hashes = [], set()
    wb = load_workbook(path)
    for ws in wb.worksheets:
        images = getattr(ws, "_images", []) or []
        for i, img in enumerate(images, start=1):
            try:
                data = img._data()
            except Exception:
                # Some anchors reference the ref by path, not inline bytes
                ref = getattr(img, "ref", None)
                if ref is None:
                    continue
                data = ref.read() if hasattr(ref, "read") else bytes(ref)

            h = hashlib.md5(data).hexdigest()
            ext = (getattr(img, "format", None) or "png").lower().lstrip(".")
            cell = _anchor_cell(img)
            fname = f"{_safe(ws.title)}_{cell}_{i}.{ext}"
            fpath = out_dir / fname
            fpath.write_bytes(data)
            saved.append({
                "file": fname,
                "sheet": ws.title,
                "cell": cell,
                "bytes": len(data),
                "format": ext,
                "md5": h,
                "source": "openpyxl",
            })
            seen_hashes.add(h)
    return saved, seen_hashes


# ── zip pass (rescue anything openpyxl missed) ───────────────────────────────

def extract_zip(path: Path, out_dir: Path, seen_hashes: set):
    saved = []
    with zipfile.ZipFile(path) as z:
        media = [n for n in z.namelist() if n.startswith("xl/media/")]
        for n in media:
            data = z.read(n)
            if not data:
                continue
            h = hashlib.md5(data).hexdigest()
            if h in seen_hashes:
                continue                       # already saved by openpyxl pass
            seen_hashes.add(h)
            orig = Path(n).name                # e.g. image3.png
            ext = Path(orig).suffix.lstrip(".").lower() or "png"
            fname = f"unplaced_{Path(orig).stem}.{ext}"
            (out_dir / fname).write_bytes(data)
            saved.append({
                "file": fname,
                "sheet": None,
                "cell": None,
                "bytes": len(data),
                "format": ext,
                "md5": h,
                "source": "zip/xl-media",
            })
    return saved


def main():
    ap = argparse.ArgumentParser(description="Extract embedded images from an .xlsx/.xlsm workbook")
    ap.add_argument("file", help="Path to .xlsx or .xlsm")
    ap.add_argument("--out", default=None,
                    help="Output folder (default: <file-stem>_images next to the file)")
    ap.add_argument("--output", choices=["summary", "json"], default="summary",
                    help="Report format (default: summary)")
    args = ap.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        sys.exit(1)

    suffix = path.suffix.lower()
    if suffix == ".xls":
        print("ERROR: legacy .xls is not supported (images live in an OLE stream, "
              "not xl/media/). Re-save as .xlsx and retry.", file=sys.stderr)
        sys.exit(2)
    if suffix not in (".xlsx", ".xlsm", ".xlsb"):
        print(f"ERROR: unsupported extension '{suffix}'. Expected .xlsx or .xlsm.",
              file=sys.stderr)
        sys.exit(2)
    if not zipfile.is_zipfile(path):
        print("ERROR: file is not a valid Office Open XML (zip) container.", file=sys.stderr)
        sys.exit(2)

    out_dir = Path(args.out) if args.out else path.with_name(f"{path.stem}_images")
    out_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    seen = set()
    try:
        placed, seen = extract_openpyxl(path, out_dir)
        saved.extend(placed)
    except ImportError:
        print("WARN: openpyxl not installed — falling back to zip-only extraction "
              "(images will not be mapped to sheet/cell).", file=sys.stderr)
    except Exception as exc:
        print(f"WARN: openpyxl pass failed ({exc}); continuing with zip pass.",
              file=sys.stderr)

    saved.extend(extract_zip(path, out_dir, seen))

    if args.output == "json":
        print(json.dumps({
            "file": str(path),
            "out_dir": str(out_dir),
            "count": len(saved),
            "images": saved,
        }, indent=2, ensure_ascii=False))
        return

    if not saved:
        print(f"No embedded images found in {path.name}.")
        print("(Charts and cell backgrounds are not embedded pictures — only "
              "inserted images live in xl/media/.)")
        return

    print(f"=== {len(saved)} image(s) extracted from {path.name} ===")
    print(f"Output folder: {out_dir}")
    print()
    print(f"{'File':<32} {'Sheet':<18} {'Cell':<7} {'Size':>10}  Source")
    print("-" * 82)
    for s in saved:
        size_kb = f"{s['bytes'] / 1024:.1f} KB"
        sheet = s["sheet"] or "—"
        cell = s["cell"] or "—"
        print(f"{s['file']:<32} {sheet:<18} {cell:<7} {size_kb:>10}  {s['source']}")

    unplaced = [s for s in saved if s["source"] != "openpyxl"]
    if unplaced:
        print()
        print(f"ℹ  {len(unplaced)} image(s) rescued from xl/media/ that openpyxl "
              "could not anchor to a cell (header/footer or grouped shapes).")


if __name__ == "__main__":
    main()
