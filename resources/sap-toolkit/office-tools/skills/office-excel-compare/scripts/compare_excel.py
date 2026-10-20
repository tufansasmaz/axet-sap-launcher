#!/usr/bin/env python3
"""Compare two Excel/CSV files and produce a colour-coded delta report."""

import argparse
import sys
from pathlib import Path

# The console on a Turkish Windows machine is cp1254. Anything printed that is
# not plain ASCII kills the process there -- including text this file never sees
# in its own source, because a Turkish path or object name arrives through a
# variable. The work is finished by then, so the output lands on disk and the
# consultant still reads a traceback and reports the tool as broken.
# See scripts/test_skill_scripts.py for the three times this was found and
# locally fixed before it was made an invariant.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass


def load(path: Path, sheet, parse_dates, engine: str):
    suffix = path.suffix.lower()
    if engine == "polars":
        import polars as pl
        if suffix in (".csv", ".tsv"):
            sep = "\t" if suffix == ".tsv" else ","
            return pl.read_csv(path, separator=sep)
        return pl.read_excel(path, sheet_name=sheet or 0)
    else:
        import pandas as pd
        dates = [c.strip() for c in parse_dates.split(",")] if parse_dates else False
        if suffix in (".csv", ".tsv", ".txt"):
            sep = "\t" if suffix in (".tsv", ".txt") else ","
            return pd.read_csv(path, sep=sep, parse_dates=dates or False)
        return pd.read_excel(path, sheet_name=sheet or 0,
                             parse_dates=dates or False, engine="openpyxl")


def compare_pandas(df1, df2, key: str, normalize: bool):
    import pandas as pd

    # normalize keys
    if normalize:
        df1[key] = df1[key].astype(str).str.strip().str.lower()
        df2[key] = df2[key].astype(str).str.strip().str.lower()

    # check for duplicate keys
    dup1 = df1[df1.duplicated(subset=[key], keep=False)]
    dup2 = df2[df2.duplicated(subset=[key], keep=False)]

    # common columns only for value comparison
    cols1 = set(df1.columns) - {key}
    cols2 = set(df2.columns) - {key}
    added_cols = cols2 - cols1
    removed_cols = cols1 - cols2
    common_cols = cols1 & cols2

    keys1 = set(df1[key].astype(str))
    keys2 = set(df2[key].astype(str))

    added_keys = keys2 - keys1
    removed_keys = keys1 - keys2
    common_keys = keys1 & keys2

    # rows added in file2
    added_rows = df2[df2[key].astype(str).isin(added_keys)].copy()
    added_rows["_status"] = "ADDED"

    # rows removed from file1
    removed_rows = df1[df1[key].astype(str).isin(removed_keys)].copy()
    removed_rows["_status"] = "REMOVED"

    # changed rows — compare common keys on common columns
    changed_rows = []
    changed_detail = []
    if common_cols:
        m1 = df1[df1[key].astype(str).isin(common_keys)].set_index(key)[list(common_cols)]
        m2 = df2[df2[key].astype(str).isin(common_keys)].set_index(key)[list(common_cols)]
        # align
        m1, m2 = m1.align(m2, join="inner")
        diff_mask = (m1 != m2) & ~(m1.isna() & m2.isna())
        changed_idx = diff_mask.any(axis=1)
        for idx in m1[changed_idx].index:
            row = {key: idx, "_status": "CHANGED"}
            for col in common_cols:
                old_val = m1.loc[idx, col]
                new_val = m2.loc[idx, col]
                if old_val != new_val and not (pd.isna(old_val) and pd.isna(new_val)):
                    row[f"{col}_OLD"] = old_val
                    row[f"{col}_NEW"] = new_val
            changed_rows.append(row)

    changed_df = pd.DataFrame(changed_rows) if changed_rows else pd.DataFrame()

    summary = {
        "file1_rows": len(df1),
        "file2_rows": len(df2),
        "added_rows": len(added_rows),
        "removed_rows": len(removed_rows),
        "changed_rows": len(changed_df),
        "unchanged_rows": len(common_keys) - len(changed_df),
        "added_columns": sorted(added_cols),
        "removed_columns": sorted(removed_cols),
        "duplicate_keys_file1": len(dup1),
        "duplicate_keys_file2": len(dup2),
    }

    return summary, added_rows, removed_rows, changed_df, dup1, dup2


# Words the report writes itself, in its language. It was English only
# ("Delta Report Summary", "_status", "ADDED") inside Turkish projects.
WORDS = {
    "tr": {
        "title": "Karşılaştırma Raporu", "summary": "Özet", "added": "Eklenen",
        "removed": "Silinen", "changed": "Değişen", "item": "Kalem", "count": "Değer",
        "old": "eski", "new": "yeni",
        "rows1": "Önceki dosyadaki satır", "rows2": "Sonraki dosyadaki satır",
        "r_added": "Eklenen satır (yalnız sonrakinde)",
        "r_removed": "Silinen satır (yalnız öncekinde)",
        "r_changed": "Değişen satır (aynı anahtar, farklı değer)",
        "r_same": "Değişmeyen satır",
        "c_added": "Eklenen kolon", "c_removed": "Silinen kolon",
        "d1": "Önceki dosyada tekrarlanan anahtar", "d2": "Sonraki dosyada tekrarlanan anahtar",
        "none": "yok",
        "leg_sum": "Önceki: {f1} · Sonraki: {f2} · Anahtar kolon: {key}",
        "leg_add": "Sonraki dosyada olup öncekinde olmayan satırlar.",
        "leg_rem": "Önceki dosyada olup sonrakinde olmayan satırlar.",
        "leg_chg": "Aynı anahtarlı satırlarda yalnız değişen kolonlar: eski ve yeni değer yan yana.",
        "empty": "Bu grupta satır yok.",
        "labels": {"customer": "Müşteri", "project": "Proje", "version": "Sürüm", "date": "Tarih"},
    },
    "en": {
        "title": "Comparison Report", "summary": "Summary", "added": "Added",
        "removed": "Removed", "changed": "Changed", "item": "Item", "count": "Value",
        "old": "old", "new": "new",
        "rows1": "Rows in the earlier file", "rows2": "Rows in the later file",
        "r_added": "Added rows (later file only)",
        "r_removed": "Removed rows (earlier file only)",
        "r_changed": "Changed rows (same key, different values)",
        "r_same": "Unchanged rows",
        "c_added": "Added columns", "c_removed": "Removed columns",
        "d1": "Duplicate keys in the earlier file", "d2": "Duplicate keys in the later file",
        "none": "none",
        "leg_sum": "Earlier: {f1} · Later: {f2} · Key column: {key}",
        "leg_add": "Rows in the later file that the earlier one does not have.",
        "leg_rem": "Rows in the earlier file that the later one does not have.",
        "leg_chg": "Rows with the same key: only the columns that changed, old and new side by side.",
        "empty": "No rows in this group.",
        "labels": {"customer": "Customer", "project": "Project", "version": "Version", "date": "Date"},
    },
}


def _pretty(name) -> str:
    return " ".join(str(name).replace("_", " ").split())


def _cell(v):
    try:
        import numpy as np
        if isinstance(v, np.generic):
            v = v.item()
    except ImportError:
        pass
    try:
        import pandas as pd
        if isinstance(v, pd.Timestamp):
            return v.to_pydatetime()
        if not isinstance(v, (list, dict)) and pd.isna(v):
            return ""
    except (ImportError, TypeError, ValueError):
        pass
    return v


def write_delta_report(out_path: Path, summary: dict, added, removed, changed, key: str,
                       lang: str = "tr", title: str = "", meta_extra=None,
                       names: tuple = ("", "")):
    """The delta in the NTT house look (lib/xlsx_theme.py): a header block,
    an Excel table per group (filter, sort, frozen header), A4 print setup.
    Which group a row is in is said by its sheet, not by a traffic-light fill
    over the whole row."""
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
    from xlsx_theme import add_table_sheet, new_workbook

    w = WORDS[lang]
    meta = {"title": title or w["title"], "labels": w["labels"], **(meta_extra or {})}
    wb = new_workbook(meta)
    f1, f2 = names
    rows = [
        (w["rows1"], summary["file1_rows"]),
        (w["rows2"], summary["file2_rows"]),
        (w["r_added"], summary["added_rows"]),
        (w["r_removed"], summary["removed_rows"]),
        (w["r_changed"], summary["changed_rows"]),
        (w["r_same"], summary["unchanged_rows"]),
        (w["c_added"], ", ".join(summary["added_columns"]) or w["none"]),
        (w["c_removed"], ", ".join(summary["removed_columns"]) or w["none"]),
        (w["d1"], summary["duplicate_keys_file1"]),
        (w["d2"], summary["duplicate_keys_file2"]),
    ]
    add_table_sheet(wb, w["summary"],
                    [{"key": "k", "header": w["item"], "width": 44},
                     {"key": "v", "header": w["count"], "width": 18}],
                    [{"k": a, "v": b} for a, b in rows], meta=meta,
                    legend=w["leg_sum"].format(f1=f1, f2=f2, key=key), freeze_cols=0,
                    table_name="Ozet")

    def sheet(name, df, legend, cols=None):
        import pandas as pd
        df = df if df is not None and len(df) else pd.DataFrame()
        keys = [c for c in (cols or list(df.columns)) if c != "_status"]
        if not keys:
            keys = [key]
        recs = [{k: _cell(r.get(k, "")) for k in keys} for r in df.to_dict("records")]
        spec = []
        for k in keys:
            label = _pretty(k)
            for suffix, word in (("_OLD", w["old"]), ("_NEW", w["new"])):
                if str(k).endswith(suffix):
                    label = f"{_pretty(str(k)[:-len(suffix)])} ({word})"
            longest = max([len(str(r[k])) for r in recs] + [len(label)])
            spec.append({"key": k, "header": label, "width": min(max(longest + 2, 10), 45)})
        add_table_sheet(wb, name, spec, recs, meta=meta,
                        legend=legend if recs else f"{legend} {w['empty']}",
                        freeze_cols=1, table_name=name)

    sheet(w["added"], added, w["leg_add"])
    sheet(w["removed"], removed, w["leg_rem"])
    cols = None
    if changed is not None and len(changed):
        # the key first, then each changed column's old/new pair side by side
        pairs = sorted({c[:-4] for c in changed.columns if c.endswith(("_OLD", "_NEW"))})
        cols = [key] + [x for p in pairs for x in (f"{p}_OLD", f"{p}_NEW")
                        if x in changed.columns]
    sheet(w["changed"], changed, w["leg_chg"], cols)
    wb.save(out_path)


def print_summary(summary: dict, path1, path2):
    print(f"\n{'─'*55}")
    print(f"  Delta Summary")
    print(f"{'─'*55}")
    print(f"  File 1 : {path1}  ({summary['file1_rows']:,} rows)")
    print(f"  File 2 : {path2}  ({summary['file2_rows']:,} rows)")
    print(f"{'─'*55}")
    print(f"  Added   (in File 2, not File 1) : {summary['added_rows']:>6,}")
    print(f"  Removed (in File 1, not File 2) : {summary['removed_rows']:>6,}")
    print(f"  Changed (same key, diff values) : {summary['changed_rows']:>6,}")
    print(f"  Unchanged                       : {summary['unchanged_rows']:>6,}")
    if summary["added_columns"]:
        print(f"\n  Columns added  : {summary['added_columns']}")
    if summary["removed_columns"]:
        print(f"  Columns removed: {summary['removed_columns']}")
    if summary["duplicate_keys_file1"] or summary["duplicate_keys_file2"]:
        print(f"\n  ⚠ Duplicate keys — File 1: {summary['duplicate_keys_file1']}, "
              f"File 2: {summary['duplicate_keys_file2']}")
        print(f"    Key column may not uniquely identify rows — results may be inaccurate")
    print(f"{'─'*55}\n")


def main():
    ap = argparse.ArgumentParser(description="Compare two Excel/CSV files and produce a delta report")
    ap.add_argument("--file1", required=True, help="Before file (.xlsx or .csv)")
    ap.add_argument("--file2", required=True, help="After file (.xlsx or .csv)")
    ap.add_argument("--key", required=True, help="Column that uniquely identifies each row")
    ap.add_argument("--sheet1", default=None, help="Sheet in file1 (default: first)")
    ap.add_argument("--sheet2", default=None, help="Sheet in file2 (default: first)")
    ap.add_argument("--output", "-o", default="delta_report.xlsx")
    ap.add_argument("--summary-only", action="store_true",
                    help="Print summary only — do not write row data to output")
    ap.add_argument("--normalize-keys", action="store_true",
                    help="Strip whitespace and lowercase keys before comparing")
    ap.add_argument("--parse-dates", default=None)
    ap.add_argument("--engine", choices=["pandas", "polars"], default="pandas")
    ap.add_argument("--lang", choices=sorted(WORDS), default="tr")
    ap.add_argument("--title", default="", help="report title (default: Karşılaştırma Raporu)")
    ap.add_argument("--customer", default=None)
    ap.add_argument("--project", default=None)
    args = ap.parse_args()

    p1 = Path(args.file1)
    p2 = Path(args.file2)
    for p in (p1, p2):
        if not p.exists():
            print(f"ERROR: file not found: {p}", file=sys.stderr)
            sys.exit(1)

    df1 = load(p1, args.sheet1, args.parse_dates, args.engine)
    df2 = load(p2, args.sheet2, args.parse_dates, args.engine)

    # convert polars to pandas for comparison logic
    if args.engine == "polars":
        df1 = df1.to_pandas()
        df2 = df2.to_pandas()

    if args.key not in df1.columns:
        print(f"ERROR: key column '{args.key}' not found in File 1.\n"
              f"Available: {list(df1.columns)}", file=sys.stderr)
        sys.exit(1)
    if args.key not in df2.columns:
        print(f"ERROR: key column '{args.key}' not found in File 2.\n"
              f"Available: {list(df2.columns)}", file=sys.stderr)
        sys.exit(1)

    summary, added, removed, changed, dup1, dup2 = compare_pandas(
        df1, df2, args.key, args.normalize_keys
    )

    print_summary(summary, p1.name, p2.name)

    if not args.summary_only:
        out_path = Path(args.output)
        write_delta_report(out_path, summary, added, removed, changed, args.key,
                           lang=args.lang, title=args.title,
                           meta_extra={"customer": args.customer, "project": args.project},
                           names=(p1.name, p2.name))
        size_kb = out_path.stat().st_size / 1024
        w = WORDS[args.lang]
        print(f"OK Delta report: {out_path}  ({size_kb:.1f} KB)")
        print(f"  Sheets: {w['summary']} | {w['added']} | {w['removed']} | {w['changed']}")


if __name__ == "__main__":
    main()
