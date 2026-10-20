#!/usr/bin/env python3
"""Generate a Marp slide deck from tabular data (xlsx / csv / json)."""

import argparse
import base64
import json
import math
import numbers
import os
import re
import shutil
import subprocess
import sys
from datetime import date
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

# The house palette and the mark, shared with every Office renderer.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "lib"))
try:
    from theme import (ACCENT_HEX, DEEP_HEX, INK_HEX, MUTED_HEX, RULE_HEX,  # noqa: E402
                       TINT_HEX, logo_path)
except ImportError:                                    # a loose copy without lib/
    ACCENT_HEX, DEEP_HEX, INK_HEX, MUTED_HEX = "0072BC", "00395E", "22262A", "626C76"
    RULE_HEX, TINT_HEX = "D8E3EC", "EAF4FB"

    def logo_path():
        return None


# ── deck language ─────────────────────────────────────────────────────────────
# The kit's content is Turkish, so the deck's own words are too unless asked
# otherwise. Until 2026-09-28 they were English only: a Turkish status deck came
# out with "Executive Summary", "Metric / Total / Average" and "28 Sep 2026"
# around Turkish data.

STRINGS = {
    "tr": {
        "summary": "Özet",
        "metric": "Metrik",
        "total": "Toplam",
        "average": "Ortalama",
        "data": "Veri",
        "rows": "satır",
        "more_rows": "…ve {n} satır daha",
        "appendix": "Ek — Tüm Veri",
        "title": "Rapor",
        "by": "{col} bazında durum",
        "chart": "{col} bazında karşılaştırma",
    },
    "en": {
        "summary": "Executive Summary",
        "metric": "Metric",
        "total": "Total",
        "average": "Average",
        "data": "Data",
        "rows": "rows",
        "more_rows": "…and {n} more rows",
        "appendix": "Appendix — Full Data",
        "title": "Report",
        "by": "By {col}",
        "chart": "{col} compared",
    },
}

TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
             "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]


def format_date(d: date, lang: str) -> str:
    if lang == "tr":
        return f"{d.day} {TR_MONTHS[d.month - 1]} {d.year}"
    return d.strftime("%d %b %Y")


# ── numbers ───────────────────────────────────────────────────────────────────

def _tokens(name) -> list:
    """'Tamamlanma_Orani' -> ['tamamlanma', 'orani']; 'avgDuration' -> ['avg', 'duration']."""
    s = re.sub(r"([a-z])([A-Z])", r"\1 \2", str(name))
    return [t for t in re.split(r"[^0-9a-zçğıöşü%]+", s.lower()) if t]


_RATE_WORDS = {"ratio", "rate", "pct", "percent", "percentage", "%"}
_AVG_WORDS = {"avg", "mean", "average", "ort"}


def is_rate_col(name) -> bool:
    toks = _tokens(name)
    return "%" in str(name) or any(
        t in _RATE_WORDS or t.startswith(("oran", "yuzde", "yüzde")) for t in toks)


def is_avg_col(name) -> bool:
    return any(t in _AVG_WORDS or t.startswith("ortalama") for t in _tokens(name))


def is_fraction_col(name, series) -> bool:
    """A rate column whose values are 0..1 -- shown as a percentage."""
    if not is_rate_col(name):
        return False
    vals = series.dropna()
    return len(vals) > 0 and bool(((vals >= 0) & (vals <= 1)).all())


def _is_missing(v) -> bool:
    return v is None or (isinstance(v, float) and math.isnan(v))


def fmt_num(v, lang: str, pct: bool = False) -> str:
    """Whole numbers without '.0', thousands grouped, Turkish separators for tr.

    Row values used to come from DataFrame.iterrows(), which upcasts an
    all-numeric row to float, so a count of 22 printed as '22.0'.
    """
    if _is_missing(v):
        return "-"
    if isinstance(v, bool) or not isinstance(v, numbers.Real):
        return str(v)
    if pct:
        p = float(v) * 100
        body = f"{p:,.0f}" if abs(p - round(p)) < 0.05 else f"{p:,.1f}"
    elif isinstance(v, numbers.Integral) or float(v).is_integer():
        body = f"{int(v):,}"
    else:
        body = f"{float(v):,.2f}".rstrip("0").rstrip(".")
    if lang == "tr":
        body = body.replace(",", "\0").replace(".", ",").replace("\0", ".")
        return f"%{body}" if pct else body
    return f"{body}%" if pct else body


def fmt_cell(v, lang: str, pct: bool = False) -> str:
    if isinstance(v, numbers.Real) and not isinstance(v, bool):
        return fmt_num(v, lang, pct)
    if _is_missing(v):
        return ""
    s = str(v).replace("|", "\\|").replace("\n", " ")
    return s[:40] + "…" if len(s) > 40 else s


def label(col) -> str:
    """Column name as a reader sees it: 'Devam_Eden' -> 'Devam Eden'."""
    return str(col).replace("_", " ")


# ── data loading ──────────────────────────────────────────────────────────────

def _read_text_table(pd, path: Path, sep):
    # Excel on a Turkish machine saves CSV as cp1254 with ';'. Sniff the
    # separator for .csv and fall back to cp1254 when the file is not UTF-8.
    kw = {"sep": sep} if sep else {"sep": None, "engine": "python"}
    try:
        return pd.read_csv(path, encoding="utf-8-sig", **kw)
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding="cp1254", **kw)


def load_data(args) -> "pd.DataFrame":
    import pandas as pd
    path = Path(args.input)
    if not path.exists():
        print(f"ERROR: input not found: {path}", file=sys.stderr)
        sys.exit(1)
    suffix = path.suffix.lower()
    if suffix == ".json":
        with open(path, encoding="utf-8-sig") as f:
            data = json.load(f)
        return pd.DataFrame(data if isinstance(data, list) else list(data.values())[0])
    if suffix in (".xlsx", ".xlsm"):
        sheet = args.sheet or 0
        return pd.read_excel(path, sheet_name=sheet, engine="openpyxl")
    if suffix == ".xls":
        sheet = args.sheet or 0
        return pd.read_excel(path, sheet_name=sheet, engine="xlrd")
    if suffix in (".tsv", ".txt"):
        return _read_text_table(pd, path, "\t")
    if suffix == ".csv":
        return _read_text_table(pd, path, None)
    # Anything else used to fall through to the CSV reader, so handing this tool
    # a .md -- a natural mistake, since the sibling office-pptx takes --md --
    # answered with a raw pandas ParserError about tokenizing data. Name the
    # mismatch instead, and name the tool that does take it.
    hint = ("       For a Markdown deck use office-pptx --md.\n"
            if suffix in (".md", ".markdown") else "")
    print(f"ERROR: {path.name} is not tabular data. This tool reads "
          f".xlsx/.xlsm/.xls/.csv/.tsv/.json.\n{hint}"
          f"       Got: {suffix or '(no extension)'}", file=sys.stderr)
    sys.exit(1)


# ── logo embedding ────────────────────────────────────────────────────────────

def embed_logo(logo_path: str) -> str:
    """Return a base64 data URI for the logo image."""
    p = Path(logo_path)
    if not p.exists():
        print(f"WARNING: logo not found: {p} -- skipping", file=sys.stderr)
        return ""
    ext = p.suffix.lower().lstrip(".")
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "svg": "image/svg+xml", "gif": "image/gif"}.get(ext, "image/png")
    b64 = base64.b64encode(p.read_bytes()).decode()
    return f"data:{mime};base64,{b64}"


# ── markdown helpers ──────────────────────────────────────────────────────────

def df_to_md_table(df, lang: str, pct_cols=frozenset(), max_rows: int = 20) -> str:
    """Render a DataFrame as a Markdown table (truncated to max_rows)."""
    total = len(df)
    shown = df.head(max_rows)
    cols = list(shown.columns)
    header = "| " + " | ".join(label(c) for c in cols) + " |"
    # Numbers right-aligned, so a column of counts reads down its digits.
    numeric = set(shown.select_dtypes(include="number").columns)
    sep = "| " + " | ".join("---:" if c in numeric else "---" for c in cols) + " |"
    rows = []
    # itertuples keeps each column's own type; iterrows upcast ints to float.
    for values in shown.itertuples(index=False, name=None):
        cells = [fmt_cell(v, lang, c in pct_cols) for c, v in zip(cols, values)]
        rows.append("| " + " | ".join(cells) + " |")

    result = "\n".join([header, sep] + rows)
    if total > max_rows:
        result += "\n\n*" + STRINGS[lang]["more_rows"].format(n=total - max_rows) + "*"
    return result


def parse_highlight_rules(rules_str: str) -> list:
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


def apply_highlights(df, rules: list, lang: str, pct_cols=frozenset(),
                     label_col=None) -> list:
    """Return a list of bullet strings for values that match highlight rules."""
    import operator as op_mod
    ops = {">": op_mod.gt, "<": op_mod.lt, ">=": op_mod.ge,
           "<=": op_mod.le, "==": op_mod.eq}
    bullets = []
    eff_label = label_col if (label_col and label_col in df.columns) else df.columns[0]
    for col, op_str, val, text in rules:
        if col not in df.columns:
            continue
        op_fn = ops.get(op_str)
        if op_fn is None:
            continue
        matched = df[op_fn(df[col], val)]
        for name, metric in zip(matched[eff_label], matched[col]):
            bullets.append(f"- **{fmt_cell(name, lang)}**: {label(col)} = "
                           f"{fmt_cell(metric, lang, col in pct_cols)} — {text}")
    return bullets


def _yaml_str(s: str) -> str:
    # JSON strings are valid YAML double-quoted scalars; a '"' in a title used
    # to break the front matter.
    return json.dumps(s, ensure_ascii=False)


# ── the house look ────────────────────────────────────────────────────────────
# Until 2026-09-29 the deck was Marp's default theme: Marp's own blue and grey,
# no NTT mark, the title repeated as a header on every slide. Now it is the look
# of the Word and PDF editions -- the mark top right, Segoe UI, house-blue
# headings and table header, tinted zebra, the title in the footer.

def house_style(logo_uri: str) -> str:
    mark = (f"background-image:url('{logo_uri}');background-repeat:no-repeat;"
            "background-position:right 48px top 34px;background-size:150px auto;"
            if logo_uri else "")
    return f"""<style>
section {{ font-family:'Segoe UI',sans-serif; color:#{INK_HEX}; background-color:#fff;
  padding:70px 64px 56px; font-size:24px; {mark} }}
h1, h2 {{ font-family:'Segoe UI Semibold','Segoe UI',sans-serif; font-weight:600; }}
h1 {{ color:#{DEEP_HEX}; font-size:44px; line-height:1.15; }}
h2 {{ color:#{ACCENT_HEX}; font-size:32px; margin-bottom:22px; }}
section.lead {{ justify-content:center; }}
section.lead h1 {{ border-bottom:3px solid #{ACCENT_HEX}; padding-bottom:14px; font-weight:300;
  font-family:'Segoe UI Light','Segoe UI',sans-serif; }}
section.lead p {{ color:#{MUTED_HEX}; font-size:24px; }}
table {{ border-collapse:collapse; font-size:20px; margin:0; }}
th {{ background:#{ACCENT_HEX}; color:#fff; font-weight:600; border:none; padding:8px 14px; text-align:left; }}
td {{ border:none; border-bottom:1px solid #{RULE_HEX}; padding:7px 14px; }}
tr:nth-child(even) td {{ background:#{TINT_HEX}; }}
tr:nth-child(odd) td {{ background:#fff; }}
ul {{ margin-top:18px; font-size:21px; }}
footer {{ color:#{MUTED_HEX}; font-size:14px; }}
section::after {{ color:#{MUTED_HEX}; font-size:14px; }}
img[alt="chart"] {{ display:block; margin:0 auto; }}
</style>"""


def chart_series(df, counts) -> list:
    """Which columns the chart compares. When a total column exists, the parts
    that add up to it on every row (Tamamlanan + Devam Eden + Başlamadı =
    Toplam) -- one unit, one question. The first render also drew "Açık Hata"
    beside them: bugs against work items on one axis."""
    from itertools import combinations
    totals = [c for c in counts if {"toplam", "total"} & set(_tokens(c))]
    others = [c for c in counts if c not in totals]
    for tot in totals:
        for n in range(min(4, len(others)), 1, -1):
            for combo in combinations(others, n):
                if all(abs(sum(float(df[c].iloc[i]) for c in combo) - float(df[tot].iloc[i])) < 1e-9
                       for i in range(len(df))):
                    return list(combo)
    return (others or counts)[:4]


def bar_chart_svg(df, key_col, series, lang: str) -> str:
    """Grouped bars as SVG text: Marp draws no charts of its own, and a status
    deck of tables alone made the reader do the comparing. Written to a file
    beside the deck -- Marp's Markdown refuses an SVG data URI and prints it as
    text (first render, 2026-09-29)."""
    palette = [ACCENT_HEX, DEEP_HEX, "6CACE4", MUTED_HEX]
    cats = [fmt_cell(v, lang) for v in df[key_col]]
    vals = [[float(x) if not _is_missing(x) else 0.0 for x in df[c]] for c in series]
    top = max([max(v) for v in vals] + [1])
    step = 10 ** max(0, len(str(int(top))) - 1)
    top = math.ceil(top / step) * step
    W, H, L, B, T = 1040, 430, 60, 50, 50
    pw, ph = W - L - 20, H - B - T
    gw = pw / len(cats)
    bw = min(46, (gw * 0.72) / len(series))
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
           f'font-family="Segoe UI, sans-serif" font-size="16">']
    for k in range(5):
        y = T + ph - ph * k / 4
        out.append(f'<line x1="{L}" y1="{y:.1f}" x2="{W - 20}" y2="{y:.1f}" stroke="#{RULE_HEX}"/>')
        out.append(f'<text x="{L - 10}" y="{y + 5:.1f}" text-anchor="end" fill="#{MUTED_HEX}">'
                   f'{fmt_num(top * k / 4, lang)}</text>')
    for i, cat in enumerate(cats):
        x0 = L + gw * i + (gw - bw * len(series)) / 2
        for j, v in enumerate(vals):
            h = ph * v[i] / top
            out.append(f'<rect x="{x0 + bw * j:.1f}" y="{T + ph - h:.1f}" width="{bw - 3:.1f}" '
                       f'height="{h:.1f}" fill="#{palette[j % len(palette)]}"/>')
        out.append(f'<text x="{L + gw * i + gw / 2:.1f}" y="{H - B + 26}" text-anchor="middle" '
                   f'fill="#{INK_HEX}">{cat}</text>')
    lx = L
    for j, c in enumerate(series):
        out.append(f'<rect x="{lx}" y="12" width="14" height="14" fill="#{palette[j % len(palette)]}"/>')
        out.append(f'<text x="{lx + 20}" y="25" fill="#{INK_HEX}">{label(c)}</text>')
        lx += 40 + 9 * len(label(c))
    out.append("</svg>")
    return "".join(out)


# ── slide generation ──────────────────────────────────────────────────────────

def build_deck(df, args, today: date = None, chart_path: Path = None) -> str:
    """The deck's Markdown. A chart, when there is one, is written to
    `chart_path` (beside the deck) and referenced by its file name."""
    lang = args.lang
    t = STRINGS[lang]
    title = args.title or t["title"]
    today_str = format_date(today or date.today(), lang)
    subtitle = args.subtitle or today_str
    if args.logo:
        logo_uri = embed_logo(args.logo)
    elif not getattr(args, "no_logo", False) and logo_path():
        logo_uri = embed_logo(str(logo_path()))
    else:
        logo_uri = ""
    highlight_rules = parse_highlight_rules(args.highlight or "")

    # filter columns
    if args.value_cols:
        show_cols = [c.strip() for c in args.value_cols.split(",")]
        show_cols = [c for c in show_cols if c in df.columns]
        if show_cols:
            key_col_list = [args.key_col] if args.key_col and args.key_col not in show_cols else []
            df = df[key_col_list + show_cols]

    numeric_cols = [c for c in df.select_dtypes(include="number").columns
                    if c != args.key_col]
    pct_cols = frozenset(c for c in numeric_cols if is_fraction_col(c, df[c]))

    # ── global front matter ───────────────────────────────────────────────────
    # No company name by default: the deck is the consultant's, and the footer
    # used to say "NTT DATA Business Solutions" on every slide whatever it was for.
    # The title goes in the footer, as in the Word edition; repeating it as a
    # header on every slide was furniture beside the mark.
    footer = " · ".join(p for p in (title, args.footer, today_str) if p)
    frontmatter = "\n".join([
        "---",
        "marp: true",
        f"theme: {args.theme}",
        "paginate: true",
        f"footer: {_yaml_str(footer)}",
        "---",
    ]) + "\n\n" + house_style(logo_uri)

    # Slide BODIES only; the separators are added once, below. Each body used
    # to carry its own leading and trailing '---', so every pair met as
    # '---\n\n---' and Marp drew an empty slide between every two real ones.
    slides: list = []

    # ── title ─────────────────────────────────────────────────────────────────
    slides.append(f"<!-- _class: lead -->\n<!-- _paginate: false -->\n\n# {title}\n\n{subtitle}")

    # ── summary ───────────────────────────────────────────────────────────────
    if numeric_cols:
        lines = []
        for col in numeric_cols[:6]:
            pct = col in pct_cols
            avg = fmt_num(df[col].mean(), lang, pct)
            # A rate or an average does not add up: summing four completion
            # rates gave "2.4". Those get an average only.
            no_sum = pct or is_rate_col(col) or is_avg_col(col)
            total = "-" if no_sum else fmt_num(df[col].sum(), lang)
            lines.append(f"| {label(col)} | {total} | {avg} |")
        slides.append(
            f"## {t['summary']}\n\n"
            f"| {t['metric']} | {t['total']} | {t['average']} |\n"
            "| --- | --- | --- |\n" + "\n".join(lines))

    # ── per-group or full table ───────────────────────────────────────────────
    # One row per group (a weekly status: one line per module) is ONE table and
    # a chart. It used to be one slide per group, each a single-row table on an
    # empty page: six slides to say what one says.
    one_row_each = bool(args.key_col and args.key_col in df.columns
                        and df[args.key_col].is_unique)
    if one_row_each:
        table_md = df_to_md_table(df, lang, pct_cols, args.max_rows)
        bullets = apply_highlights(df, highlight_rules, lang, pct_cols,
                                   label_col=args.key_col)
        bullet_block = ("\n\n" + "\n".join(bullets)) if bullets else ""
        slides.append(f"## {t['by'].format(col=label(args.key_col))}\n\n{table_md}{bullet_block}")
        counts = [c for c in numeric_cols if c not in pct_cols
                  and not is_rate_col(c) and not is_avg_col(c)]
        series = chart_series(df, counts)
        if series and 2 <= len(df) <= 12 and chart_path is not None:
            chart_path.write_text(bar_chart_svg(df, args.key_col, series, lang),
                                  encoding="utf-8")
            slides.append(f"## {t['chart'].format(col=label(args.key_col))}\n\n"
                          f"![chart]({chart_path.name})")
    elif args.key_col and args.key_col in df.columns:
        for group in df[args.key_col].unique():
            subset_full = df[df[args.key_col] == group]
            subset = subset_full.drop(columns=[args.key_col])
            table_md = df_to_md_table(subset, lang, pct_cols, args.max_rows)
            bullets = apply_highlights(subset_full, highlight_rules, lang, pct_cols,
                                       label_col=args.key_col)
            bullet_block = ("\n\n" + "\n".join(bullets)) if bullets else ""
            slides.append(f"## {fmt_cell(group, lang)}\n\n{table_md}{bullet_block}")
    else:
        chunk_size = args.max_rows
        for start in range(0, len(df), chunk_size):
            chunk = df.iloc[start:start + chunk_size]
            rng = (f" ({t['rows']} {start + 1}–{min(start + chunk_size, len(df))})"
                   if len(df) > chunk_size else "")
            table_md = df_to_md_table(chunk, lang, pct_cols, chunk_size)
            bullets = apply_highlights(chunk, highlight_rules, lang, pct_cols)
            bullet_block = ("\n\n" + "\n".join(bullets)) if bullets else ""
            slides.append(f"## {t['data']}{rng}\n\n{table_md}{bullet_block}")

    # ── appendix ──────────────────────────────────────────────────────────────
    if args.appendix:
        slides.append(f"## {t['appendix']}\n\n"
                      f"{df_to_md_table(df, lang, pct_cols, max_rows=200)}")

    return frontmatter + "\n\n" + "\n\n---\n\n".join(slides) + "\n"


# ── rendering via marp CLI ────────────────────────────────────────────────────

def find_marp() -> list:
    """The command that runs marp-cli, or [] when there is none.

    `npm install -g` puts marp.cmd (and an extensionless sh shim) on Windows.
    subprocess.run(["marp", ...]) resolves neither, so an installed marp-cli was
    reported as "not found". Ask for the .cmd by name first, then fall back to a
    locally installed copy through npx -- never one npx would download.
    """
    names = ("marp.cmd", "marp.exe", "marp") if os.name == "nt" else ("marp",)
    for name in names:
        found = shutil.which(name)
        if found:
            return [found]
    npx_names = ("npx.cmd", "npx") if os.name == "nt" else ("npx",)
    for name in npx_names:
        found = shutil.which(name)
        if found:
            return [found, "--no-install", "@marp-team/marp-cli"]
    return []


def render(md_path: Path, output_format: str, editable: bool = False):
    ext = {"pptx": ".pptx", "pdf": ".pdf", "html": ".html"}.get(output_format, ".html")
    out_path = md_path.with_suffix(ext)

    marp = find_marp()
    if not marp:
        print("ERROR: marp CLI not found on PATH. Install with:", file=sys.stderr)
        print("  npm install -g @marp-team/marp-cli", file=sys.stderr)
        sys.exit(1)

    # --allow-local-files: the chart is an .svg beside the deck.
    cmd = marp + [str(md_path), f"--{output_format}", "--output", str(out_path),
                  "--allow-local-files"]
    if editable and output_format == "pptx":
        cmd.append("--pptx-editable")
    print(f"  Rendering {output_format.upper()} via marp CLI...")
    try:
        # marp-cli also reads Markdown from stdin whenever stdin is not a TTY,
        # so an agent's inherited pipe left it waiting forever. Close it.
        result = subprocess.run(cmd, stdin=subprocess.DEVNULL, capture_output=True, text=True,
                                encoding="utf-8", errors="replace", timeout=180)
    except subprocess.TimeoutExpired:
        print("ERROR: marp did not finish in 180 s.", file=sys.stderr)
        sys.exit(1)
    if result.returncode != 0 or not out_path.exists():
        print(f"ERROR: marp exited {result.returncode}:", file=sys.stderr)
        print(result.stderr.encode("ascii", "replace").decode("ascii"), file=sys.stderr)
        if editable and "soffice" in result.stderr.lower():
            print("  --editable needs LibreOffice. For an editable deck without it,\n"
                  "  build the slides with office-pptx instead.", file=sys.stderr)
        sys.exit(1)
    size_kb = out_path.stat().st_size / 1024
    print(f"OK Rendered: {out_path}  ({size_kb:.1f} KB)")
    if output_format == "pptx" and not editable:
        # Marp's PPTX is one picture per slide. It opens in PowerPoint and
        # presents fine; its text cannot be edited there.
        print("  Note: each slide is an image; text is not editable in PowerPoint.\n"
              "  For an editable deck use office-pptx.")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Generate a Marp slide deck from tabular data")
    ap.add_argument("--input",  "-i", required=True, help="Source data file (xlsx/csv/json)")
    ap.add_argument("--output", "-o", required=True, help="Output .md path")
    ap.add_argument("--render", choices=["pptx", "pdf", "html"], default=None,
                    help="Also render to this format via @marp/cli")
    ap.add_argument("--editable", action="store_true",
                    help="With --render pptx: pass marp's experimental --pptx-editable "
                         "(needs LibreOffice)")
    ap.add_argument("--title",    default=None, help="Deck title (default: Rapor / Report)")
    ap.add_argument("--subtitle", default=None, help="Subtitle (default: today's date)")
    ap.add_argument("--footer",   default="",
                    help="Footer text before the date (default: date only)")
    ap.add_argument("--lang",     default="tr", choices=sorted(STRINGS),
                    help="Language of the deck's own headings and date (default: tr)")
    ap.add_argument("--theme",    default="default",
                    choices=["default", "gaia", "uncover"])
    ap.add_argument("--logo",     default=None,
                    help="Logo image path (embedded as base64); default: the NTT mark")
    ap.add_argument("--no-logo",  action="store_true",
                    help="omit the NTT mark (a deck that is not ours)")
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
    print(f"  Loaded: {args.input}  ({len(df):,} rows x {len(df.columns)} cols)")

    deck = build_deck(df, args, chart_path=out_path.with_name(out_path.stem + "-grafik.svg"))
    out_path.write_text(deck, encoding="utf-8")
    size_kb = out_path.stat().st_size / 1024
    print(f"OK Slides: {out_path}  ({size_kb:.1f} KB)")

    if args.render:
        render(out_path, args.render, args.editable)


if __name__ == "__main__":
    main()
