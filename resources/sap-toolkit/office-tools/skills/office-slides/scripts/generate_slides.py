#!/usr/bin/env python3
"""Generate a Marp slide deck from tabular data (xlsx / csv / json)."""

import argparse
import base64
import json
import subprocess
import sys
from datetime import date
from pathlib import Path


# ── data loading ──────────────────────────────────────────────────────────────

def load_data(args) -> "pd.DataFrame":
    import pandas as pd
    path = Path(args.input)
    if not path.exists():
        print(f"ERROR: input not found: {path}", file=sys.stderr)
        sys.exit(1)
    suffix = path.suffix.lower()
    if suffix == ".json":
        with open(path) as f:
            data = json.load(f)
        return pd.DataFrame(data if isinstance(data, list) else list(data.values())[0])
    if suffix in (".xlsx", ".xlsm"):
        sheet = args.sheet or 0
        return pd.read_excel(path, sheet_name=sheet, engine="openpyxl")
    if suffix == ".xls":
        sheet = args.sheet or 0
        return pd.read_excel(path, sheet_name=sheet, engine="xlrd")
    sep = "\t" if suffix in (".tsv", ".txt") else ","
    return pd.read_csv(path, sep=sep)


# ── logo embedding ────────────────────────────────────────────────────────────

def embed_logo(logo_path: str) -> str:
    """Return a base64 data URI for the logo image."""
    p = Path(logo_path)
    if not p.exists():
        print(f"WARNING: logo not found: {p} — skipping", file=sys.stderr)
        return ""
    ext = p.suffix.lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "svg": "image/svg+xml", "gif": "image/gif"}.get(ext, "image/png")
    b64 = base64.b64encode(p.read_bytes()).decode()
    return f"data:{mime};base64,{b64}"


# ── markdown helpers ──────────────────────────────────────────────────────────

def df_to_md_table(df, max_rows: int = 20) -> str:
    """Render a DataFrame as a Markdown table (truncated to max_rows)."""
    if len(df) > max_rows:
        df = df.head(max_rows)
        truncated = True
    else:
        truncated = False

    cols = list(df.columns)
    header = "| " + " | ".join(str(c) for c in cols) + " |"
    sep    = "| " + " | ".join("---" for _ in cols) + " |"
    rows = []
    for _, row in df.iterrows():
        cells = []
        for v in row:
            if isinstance(v, float):
                cells.append(f"{v:,.1f}")
            elif isinstance(v, int):
                cells.append(f"{v:,}")
            else:
                s = str(v)
                cells.append(s[:40] + "…" if len(s) > 40 else s)
        rows.append("| " + " | ".join(cells) + " |")

    result = "\n".join([header, sep] + rows)
    if truncated:
        result += f"\n\n*…and {len(df) - max_rows} more rows*"
    return result


def parse_highlight_rules(rules_str: str) -> list[tuple]:
    """Parse 'Col>val=text;Col<val=text' into [(col, op, val, text), ...]."""
    rules = []
    if not rules_str:
        return rules
    for rule in rules_str.split(";"):
        for op in [">=", "<=", ">", "<", "=="]:
            if op in rule:
                left, right = rule.split(op, 1)
                col = left.strip()
                val_text = right.strip()
                if "=" in val_text:
                    val, text = val_text.rsplit("=", 1)
                    try:
                        rules.append((col, op, float(val.strip()), text.strip()))
                    except ValueError:
                        pass
                break
    return rules


def apply_highlights(df, rules: list[tuple], label_col: str | None = None) -> list[str]:
    """Return a list of bullet strings for values that match highlight rules."""
    import operator as op_mod
    ops = {">": op_mod.gt, "<": op_mod.lt, ">=": op_mod.ge,
           "<=": op_mod.le, "==": op_mod.eq}
    bullets = []
    effective_label_col = label_col if (label_col and label_col in df.columns) else df.columns[0]
    for col, op_str, val, text in rules:
        if col not in df.columns:
            continue
        op_fn = ops.get(op_str)
        if op_fn is None:
            continue
        matched = df[op_fn(df[col], val)]
        if matched.empty:
            continue
        for _, row in matched.iterrows():
            label = row.get(effective_label_col, "")
            metric = row.get(col, "")
            if isinstance(metric, float):
                metric_str = f"{metric:,.1f}"
            elif isinstance(metric, int):
                metric_str = f"{metric:,}"
            else:
                metric_str = str(metric)
            bullets.append(f"- **{label}**: {col} = {metric_str} — {text}")
    return bullets


# ── slide generation ──────────────────────────────────────────────────────────

def build_deck(df, args) -> str:
    today = date.today().strftime("%d %b %Y")
    subtitle = args.subtitle or today
    logo_uri = embed_logo(args.logo) if args.logo else ""
    highlight_rules = parse_highlight_rules(args.highlight or "")

    # filter columns
    if args.value_cols:
        show_cols = [c.strip() for c in args.value_cols.split(",")]
        show_cols = [c for c in show_cols if c in df.columns]
        if show_cols:
            key_col_list = [args.key_col] if args.key_col and args.key_col not in show_cols else []
            df = df[key_col_list + show_cols]

    slides: list[str] = []

    # ── global frontmatter ────────────────────────────────────────────────────
    logo_style = ""
    if logo_uri:
        logo_style = f"""
<style>
header {{
  background-image: url("{logo_uri}");
  background-repeat: no-repeat;
  background-size: contain;
  background-position: right center;
  height: 60px;
}}
</style>"""

    frontmatter = f"""---
marp: true
theme: {args.theme}
paginate: true
header: "{args.title}"
footer: "NTT DATA Business Solutions | {today}"
---
{logo_style}"""
    slides.append(frontmatter.strip())

    # ── slide 1: title ────────────────────────────────────────────────────────
    slides.append(f"""---

# {args.title}

**{subtitle}**

---""")

    # ── slide 2: executive summary ────────────────────────────────────────────
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        summary_lines = []
        for col in numeric_cols[:6]:
            total = df[col].sum()
            avg = df[col].mean()
            if isinstance(total, float):
                summary_lines.append(f"| {col} | {total:,.1f} | {avg:,.1f} |")
            else:
                summary_lines.append(f"| {col} | {total:,} | {avg:,.1f} |")

        summary_table = (
            "| Metric | Total | Average |\n"
            "| --- | --- | --- |\n"
            + "\n".join(summary_lines)
        )
        slides.append(f"""---

## Executive Summary

{summary_table}

---""")

    # ── slides 3…N: per-group or full table ───────────────────────────────────
    if args.key_col and args.key_col in df.columns:
        groups = df[args.key_col].unique()
        for group in groups:
            subset_full = df[df[args.key_col] == group]
            subset = subset_full.drop(columns=[args.key_col])
            table_md = df_to_md_table(subset, args.max_rows)
            bullets = apply_highlights(subset_full, highlight_rules, label_col=args.key_col)
            bullet_block = ("\n\n" + "\n".join(bullets)) if bullets else ""
            slides.append(f"""---

## {group}

{table_md}{bullet_block}

---""")
    else:
        # single data slide (or chunked if large)
        chunk_size = args.max_rows
        for start in range(0, len(df), chunk_size):
            chunk = df.iloc[start:start + chunk_size]
            label = f" (rows {start+1}–{min(start+chunk_size, len(df))})" if len(df) > chunk_size else ""
            table_md = df_to_md_table(chunk, chunk_size)
            bullets = apply_highlights(chunk, highlight_rules)
            bullet_block = ("\n\n" + "\n".join(bullets)) if bullets else ""
            slides.append(f"""---

## Data{label}

{table_md}{bullet_block}

---""")

    # ── appendix ──────────────────────────────────────────────────────────────
    if args.appendix:
        slides.append(f"""---

## Appendix — Full Data

{df_to_md_table(df, max_rows=200)}

---""")

    return "\n\n".join(slides)


# ── rendering via marp CLI ────────────────────────────────────────────────────

def render(md_path: Path, output_format: str):
    ext_map = {"pptx": ".pptx", "pdf": ".pdf", "html": ".html"}
    ext = ext_map.get(output_format, ".html")
    out_path = md_path.with_suffix(ext)

    cmd = ["marp", str(md_path), f"--{output_format}", "--output", str(out_path)]
    print(f"  Rendering {output_format.upper()} via marp CLI…")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            print(f"ERROR: marp exited {result.returncode}:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            sys.exit(1)
        size_kb = out_path.stat().st_size / 1024
        print(f"✓ Rendered : {out_path}  ({size_kb:.1f} KB)")
    except FileNotFoundError:
        print("ERROR: marp CLI not found. Install with:", file=sys.stderr)
        print("  npm install -g @marp-team/marp-cli", file=sys.stderr)
        sys.exit(1)


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Generate a Marp slide deck from tabular data")
    ap.add_argument("--input",  "-i", required=True, help="Source data file (xlsx/csv/json)")
    ap.add_argument("--output", "-o", required=True, help="Output .md path")
    ap.add_argument("--render", choices=["pptx", "pdf", "html"], default=None,
                    help="Also render to this format via @marp/cli")
    ap.add_argument("--title",    default="Report")
    ap.add_argument("--subtitle", default=None, help="Subtitle (default: today's date)")
    ap.add_argument("--theme",    default="default",
                    choices=["default", "gaia", "uncover"])
    ap.add_argument("--logo",     default=None, help="Logo image path (embedded as base64)")
    ap.add_argument("--sheet",    default=None, help="Sheet name for xlsx input")
    ap.add_argument("--max-rows", type=int, default=20, help="Max rows per data slide")
    ap.add_argument("--key-col",  default=None, help="Column to create one slide per value")
    ap.add_argument("--value-cols", default=None,
                    help="Comma-separated columns to show (default: all)")
    ap.add_argument("--highlight", default=None,
                    help='Callout rules e.g. "Executions>200=high volume;Avg_Deviation<0=on track"')
    ap.add_argument("--appendix", action="store_true",
                    help="Add full data table as final slide")
    ap.add_argument("--force", action="store_true", help="Overwrite output if exists")
    args = ap.parse_args()

    out_path = Path(args.output)
    if out_path.exists() and not args.force:
        print(f"ERROR: {out_path} exists. Use --force to overwrite.", file=sys.stderr)
        sys.exit(1)

    import pandas as pd  # noqa: F401 — import here so top-level stays fast
    df = load_data(args)
    print(f"  Loaded: {args.input}  ({len(df):,} rows × {len(df.columns)} cols)")

    deck = build_deck(df, args)
    out_path.write_text(deck, encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"✓ Slides  : {out_path}  ({size_kb:.1f} KB)")

    if args.render:
        render(out_path, args.render)


if __name__ == "__main__":
    main()
