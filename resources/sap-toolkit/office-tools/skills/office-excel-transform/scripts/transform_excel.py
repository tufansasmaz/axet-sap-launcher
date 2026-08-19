#!/usr/bin/env python3
"""Transform, clean, and reshape Excel/CSV data using Pandas."""

import argparse
import sys
from pathlib import Path


def load_df(path: Path, sheet, parse_dates):
    import pandas as pd
    suffix = path.suffix.lower()
    dates = [c.strip() for c in parse_dates.split(",")] if parse_dates else False
    if suffix in (".csv", ".tsv", ".txt"):
        sep = "\t" if suffix in (".tsv", ".txt") else ","
        return pd.read_csv(path, sep=sep, parse_dates=dates or False)
    return pd.read_excel(path, sheet_name=sheet or 0, parse_dates=dates or False,
                         engine="openpyxl")


def save_df(df, out_path: Path, sheet: str, no_preview: bool, original_shape):
    import pandas as pd
    sheet = sheet[:31]
    print(f"\nShape before: {original_shape[0]:,} rows × {original_shape[1]} cols")
    print(f"Shape after : {df.shape[0]:,} rows × {df.shape[1]} cols")
    if not no_preview:
        print(f"\nPreview (first 5 rows):")
        print(df.head(5).to_string(index=False))
    if out_path.suffix.lower() in (".csv", ".tsv"):
        df.to_csv(out_path, index=False)
    else:
        df.to_excel(out_path, sheet_name=sheet, index=False, engine="openpyxl")
    size_kb = out_path.stat().st_size / 1024
    print(f"\n✓ Saved: {out_path}  ({size_kb:.1f} KB)")


def apply_filter(df, expr: str):
    """Supports: 'Col op value' where op is >, <, >=, <=, ==, !=, contains, startswith"""
    import pandas as pd
    try:
        result = df.query(expr)
        print(f"  filter '{expr}': {len(df):,} → {len(result):,} rows")
        return result
    except Exception:
        pass
    # fallback: contains / startswith
    for op in ("contains", "startswith", "endswith"):
        if op in expr:
            col, val = [x.strip() for x in expr.split(op, 1)]
            col = col.strip("'\"")
            val = val.strip().strip("'\"")
            mask = getattr(df[col].astype(str).str, op)(val, na=False)
            result = df[mask]
            print(f"  filter '{expr}': {len(df):,} → {len(result):,} rows")
            return result
    print(f"WARNING: could not parse filter '{expr}' — skipping", file=sys.stderr)
    return df


def apply_sort(df, sort_expr: str):
    parts = [p.strip() for p in sort_expr.split(",")]
    cols, ascending = [], []
    for part in parts:
        tokens = part.rsplit(None, 1)
        col = tokens[0].strip("'\"")
        asc = True if len(tokens) < 2 or tokens[1].lower() != "desc" else False
        cols.append(col)
        ascending.append(asc)
    result = df.sort_values(by=cols, ascending=ascending)
    print(f"  sort by {cols} {['asc' if a else 'desc' for a in ascending]}")
    return result


def apply_groupby(df, groupby: str, agg_expr: str):
    """agg_expr: 'NewCol=sum(SrcCol),Count=count(SrcCol)'"""
    import pandas as pd
    group_cols = [c.strip() for c in groupby.split(",")]
    agg_map = {}
    rename_map = {}
    for part in agg_expr.split(","):
        part = part.strip()
        if "=" not in part:
            continue
        new_name, func_expr = part.split("=", 1)
        new_name = new_name.strip()
        func_expr = func_expr.strip()
        func = func_expr[:func_expr.index("(")]
        src_col = func_expr[func_expr.index("(")+1:func_expr.index(")")]
        if src_col not in agg_map:
            agg_map[src_col] = []
        agg_map[src_col].append(func)
        rename_map[f"{src_col}_{func}"] = new_name
    result = df.groupby(group_cols).agg(agg_map)
    result.columns = ["_".join(c).strip() for c in result.columns]
    result = result.rename(columns=rename_map).reset_index()
    print(f"  groupby {group_cols}: {len(df):,} → {len(result):,} groups")
    return result


def apply_pivot(df, index: str, columns: str, values: str, aggfunc: str):
    import pandas as pd
    result = df.pivot_table(
        index=index.split(","),
        columns=columns,
        values=values,
        aggfunc=aggfunc or "sum",
        fill_value=0,
    ).reset_index()
    result.columns = [str(c) for c in result.columns]
    print(f"  pivot: {result.shape[0]:,} rows × {result.shape[1]} cols")
    return result


def apply_melt(df, id_vars: str, value_name: str, var_name: str):
    id_cols = [c.strip() for c in id_vars.split(",")]
    result = df.melt(id_vars=id_cols,
                     var_name=var_name or "variable",
                     value_name=value_name or "value")
    print(f"  melt: {len(df):,} → {len(result):,} rows")
    return result


def main():
    ap = argparse.ArgumentParser(description="Transform Excel/CSV data with Pandas")
    ap.add_argument("--input", "-i", required=True)
    ap.add_argument("--output", "-o", default=None)
    ap.add_argument("--sheet", default=None)
    ap.add_argument("--parse-dates", default=None, help="Comma-separated date columns")

    ap.add_argument("--filter", dest="filter_expr", default=None,
                    help="Filter expression e.g. \"Revenue > 1000\" or \"Status == 'Active'\"")
    ap.add_argument("--sort", default=None,
                    help="Sort expression e.g. \"Date desc,Name asc\"")
    ap.add_argument("--rename", default=None, help="Rename columns: \"OldA=NewA,OldB=NewB\"")
    ap.add_argument("--drop", default=None, help="Comma-separated columns to drop")
    ap.add_argument("--keep", default=None, help="Comma-separated columns to keep")
    ap.add_argument("--dedupe", action="store_true", help="Remove duplicate rows")
    ap.add_argument("--dedupe-cols", default=None, help="Columns to dedupe on (default: all)")
    ap.add_argument("--fillna", default=None, help="Fill nulls: \"Col=value,Col2=0\"")
    ap.add_argument("--groupby", default=None, help="Group-by column(s)")
    ap.add_argument("--agg", default=None, help="Aggregation: \"Total=sum(Revenue),N=count(Revenue)\"")
    ap.add_argument("--pivot-index", default=None)
    ap.add_argument("--pivot-cols", default=None)
    ap.add_argument("--pivot-values", default=None)
    ap.add_argument("--pivot-aggfunc", default="sum")
    ap.add_argument("--melt-id", default=None, help="ID columns for melt/unpivot")
    ap.add_argument("--melt-value-name", default="value")
    ap.add_argument("--melt-var-name", default="variable")
    ap.add_argument("--add-col", default=None,
                    help="Add column: \"NewCol=ColA * ColB\" (simple Pandas eval expressions)")
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"ERROR: input not found: {in_path}", file=sys.stderr)
        sys.exit(1)

    if not args.output:
        args.output = str(in_path.with_name(in_path.stem + "_transformed.xlsx"))
    out_path = Path(args.output)

    df = load_df(in_path, args.sheet, args.parse_dates)
    original_shape = df.shape

    # --- operations in order: reshape first, sort + keep last ---
    if args.filter_expr:
        df = apply_filter(df, args.filter_expr)

    if args.rename:
        rename_map = {}
        for part in args.rename.split(","):
            old, new = part.split("=", 1)
            rename_map[old.strip()] = new.strip()
        df = df.rename(columns=rename_map)
        print(f"  renamed {rename_map}")

    if args.drop:
        cols = [c.strip() for c in args.drop.split(",")]
        df = df.drop(columns=[c for c in cols if c in df.columns])
        print(f"  dropped columns: {cols}")

    if args.dedupe:
        subset = [c.strip() for c in args.dedupe_cols.split(",")] if args.dedupe_cols else None
        before = len(df)
        df = df.drop_duplicates(subset=subset)
        print(f"  dedupe: {before:,} → {len(df):,} rows (removed {before - len(df):,})")

    if args.fillna:
        for part in args.fillna.split(","):
            col, val = part.split("=", 1)
            col, val = col.strip(), val.strip()
            if col in df.columns:
                try:
                    val = float(val) if "." in val else int(val)
                except ValueError:
                    pass
                df[col] = df[col].fillna(val)
        print(f"  fillna applied")

    if args.groupby and args.agg:
        df = apply_groupby(df, args.groupby, args.agg)

    if args.pivot_index and args.pivot_cols and args.pivot_values:
        df = apply_pivot(df, args.pivot_index, args.pivot_cols,
                         args.pivot_values, args.pivot_aggfunc)

    if args.melt_id:
        df = apply_melt(df, args.melt_id, args.melt_value_name, args.melt_var_name)

    if args.add_col:
        col_name, expr = args.add_col.split("=", 1)
        # quote column names with spaces for pandas eval
        safe_expr = expr.strip()
        df[col_name.strip()] = df.eval(safe_expr)
        print(f"  added column '{col_name.strip()}'")

    # sort and keep run last — after all reshaping — so new column names exist
    if args.sort:
        df = apply_sort(df, args.sort)

    if args.keep:
        cols = [c.strip() for c in args.keep.split(",")]
        df = df[[c for c in cols if c in df.columns]]
        print(f"  kept columns: {cols}")

    save_df(df, out_path, args.sheet or "Sheet1", args.no_preview, original_shape)


if __name__ == "__main__":
    main()
