#!/usr/bin/env python3
"""Read and profile an Excel or CSV file. Outputs a human-readable summary."""

import argparse
import json
import sys
from pathlib import Path


def _detect_format(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in (".xlsx", ".xlsm", ".xlsb"):
        return "xlsx"
    if suffix == ".xls":
        return "xls"
    if suffix in (".csv", ".tsv", ".txt"):
        return "csv"
    return "xlsx"


def read_pandas(path: Path, sheet, nrows):
    import pandas as pd
    fmt = _detect_format(path)
    if fmt == "csv":
        sep = "\t" if path.suffix.lower() in (".tsv", ".txt") else ","
        df = pd.read_csv(path, sep=sep, nrows=nrows)
        return df, [path.name], path.name
    xf = pd.ExcelFile(path, engine="openpyxl" if fmt == "xlsx" else "xlrd")
    sheets = xf.sheet_names
    target = sheet if sheet is not None else sheets[0]
    df = pd.read_excel(xf, sheet_name=target, nrows=nrows)
    return df, sheets, target


def read_polars(path: Path, sheet, nrows):
    import polars as pl
    fmt = _detect_format(path)
    if fmt == "csv":
        df = pl.read_csv(path, n_rows=nrows)
    else:
        df = pl.read_excel(path, sheet_name=sheet or 0)
        if nrows:
            df = df.head(nrows)
    return df, [], str(sheet or 0)


def summarise_pandas(df, sheets, target, sample_rows, path):
    import pandas as pd
    lines = []
    lines.append(f"=== File: {path} ===")
    lines.append(f"Sheet loaded : {target}")
    if len(sheets) > 1:
        lines.append(f"All sheets   : {sheets}")
    lines.append(f"Shape        : {df.shape[0]:,} rows × {df.shape[1]} columns")
    lines.append("")

    # column profile
    lines.append("── Column profile ──────────────────────────────────────────")
    header = f"{'Column':<35} {'Dtype':<15} {'Nulls':>7} {'Unique':>8}  Sample values"
    lines.append(header)
    lines.append("─" * 90)
    for col in df.columns:
        dtype = str(df[col].dtype)
        nulls = int(df[col].isna().sum())
        unique = int(df[col].nunique(dropna=True))
        sample = df[col].dropna().head(3).tolist()
        sample_str = ", ".join(str(v) for v in sample)[:40]
        lines.append(f"{str(col):<35} {dtype:<15} {nulls:>7,} {unique:>8,}  {sample_str}")

    # numeric stats
    num_df = df.select_dtypes(include="number")
    if not num_df.empty:
        lines.append("")
        lines.append("── Numeric statistics ──────────────────────────────────────")
        stats = num_df.describe().round(2)
        lines.append(stats.to_string())

    # data quality flags
    flags = []
    for col in df.columns:
        null_pct = df[col].isna().mean() * 100
        if null_pct > 50:
            flags.append(f"  ⚠  '{col}': {null_pct:.0f}% nulls — likely sparse or wrong column")
        if df[col].dtype == object:
            try:
                as_num = pd.to_numeric(df[col], errors="coerce")
                if as_num.notna().mean() > 0.8:
                    flags.append(f"  ℹ  '{col}': dtype=object but looks numeric — consider casting")
            except Exception:
                pass
    if flags:
        lines.append("")
        lines.append("── Data quality flags ──────────────────────────────────────")
        lines.extend(flags)

    # sample rows
    lines.append("")
    lines.append(f"── Sample ({min(sample_rows, len(df))} rows) ─────────────────────────────────────")
    lines.append(df.head(sample_rows).to_string(index=False))

    return "\n".join(lines)


def summarise_polars(df, sheets, target, sample_rows, path):
    lines = []
    lines.append(f"=== File: {path} ===")
    lines.append(f"Sheet loaded : {target}")
    lines.append(f"Shape        : {df.shape[0]:,} rows × {df.shape[1]} columns")
    lines.append("")
    lines.append("── Column profile (Polars) ─────────────────────────────────")
    lines.append(str(df.schema))
    lines.append("")
    lines.append(f"── Sample ({min(sample_rows, df.height)} rows) ──────────────────────────────────")
    lines.append(str(df.head(sample_rows)))
    return "\n".join(lines)


def to_json(df, engine: str) -> str:
    if engine == "polars":
        return df.write_json()
    return df.to_json(orient="records", date_format="iso", indent=2)


def to_csv(df, engine: str) -> str:
    if engine == "polars":
        import io
        buf = io.StringIO()
        df.write_csv(buf)
        return buf.getvalue()
    return df.to_csv(index=False)


def main():
    ap = argparse.ArgumentParser(description="Read and profile an Excel/CSV file")
    ap.add_argument("file", help="Path to .xlsx, .xls, .xlsm, or .csv")
    ap.add_argument("--sheet", default=None, help="Sheet name or index (default: first sheet)")
    ap.add_argument("--rows", type=int, default=5, help="Sample rows to show (default: 5)")
    ap.add_argument("--engine", choices=["pandas", "polars"], default="pandas")
    ap.add_argument("--output", choices=["summary", "json", "csv"], default="summary",
                    help="Output format (default: summary)")
    ap.add_argument("--nrows", type=int, default=None,
                    help="Max rows to load (default: all). Use for large files.")
    args = ap.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        sys.exit(1)

    try:
        if args.engine == "polars":
            df, sheets, target = read_polars(path, args.sheet, args.nrows)
        else:
            df, sheets, target = read_pandas(path, args.sheet, args.nrows)
    except Exception as exc:
        print(f"ERROR reading file: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.output == "json":
        print(to_json(df, args.engine))
    elif args.output == "csv":
        print(to_csv(df, args.engine))
    else:
        if args.engine == "polars":
            print(summarise_polars(df, sheets, target, args.rows, path))
        else:
            print(summarise_pandas(df, sheets, target, args.rows, path))


if __name__ == "__main__":
    main()
