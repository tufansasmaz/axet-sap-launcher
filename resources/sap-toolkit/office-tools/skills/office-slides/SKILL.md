---
name: office-slides
description: >
  Convert aggregated Excel/CSV/JSON data into a Marp presentation (PPTX, PDF,
  or HTML). Reads a source file (ideally the output of office-excel-transform or
  office-excel-report), generates a slide-per-section Marp Markdown file, and renders
  it via @marp/cli. Typical use: weekly SE report → pivot tables → slide deck.
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
trust-level: internal
---

# office-slides

Generate a presentation from tabular data using [Marp](https://marp.app/).

## Prerequisites

Install `@marp/cli` once (requires Node.js ≥ 18):

```bash
npm install -g @marp-team/marp-cli
# verify
marp --version
```

The Python helper also needs the project venv active (pandas, openpyxl).

---

## Usage

```
python plugins/office-tools/skills/office-slides/scripts/generate_slides.py \
  --input  <data.xlsx|csv|json>  \
  --output <deck.md>             \
  --render <pptx|pdf|html>       \   # optional, requires marp CLI
  --title  "SE Weekly Report"    \
  --theme  default               \
  --logo   /path/to/logo.png     \   # optional — embedded as base64
  --sheet  Data                  \   # xlsx sheet name (default: first)
  --max-rows 20                  \   # truncate long tables (default: 20)
  --key-col  Team                \   # group slides by this column
  --value-cols "Executions,Avg_Duration"  # which columns to show per slide
```

### Minimal example (data from office-excel-transform output)

```bash
# 1. Build pivot
python plugins/office-tools/skills/office-excel-transform/scripts/transform_excel.py \
  --input Daily_SE_Report.xlsx --sheet Data \
  --output /tmp/by_team.xlsx \
  --groupby Team \
  --agg "Executions=count(Ticket ID),Avg_Deviation=mean(Total Duration Deviation)"

# 2. Generate slide deck
python plugins/office-tools/skills/office-slides/scripts/generate_slides.py \
  --input /tmp/by_team.xlsx \
  --output /tmp/se_weekly.md \
  --title "SE Weekly Report — CW17" \
  --render pptx
```

---

## Workflow

```
Excel / CSV / JSON
       │
       ▼
office-excel-transform  (groupby / pivot / filter)
       │
       ▼
office-excel-report     (styled .xlsx, optional)
       │
       ▼
office-slides       (.md → PPTX / PDF / HTML)
```

---

## Slide structure generated

| Slide | Content |
|-------|---------|
| 1 | Title + subtitle (--title, current date) |
| 2 | Executive summary — key metrics table |
| 3…N | One slide per group (--key-col), table + bullet highlights |
| N+1 | Appendix: full data table (if --appendix) |

---

## Arguments

| Argument | Default | Purpose |
|----------|---------|---------|
| `--input` | required | Source data (xlsx, csv, json) |
| `--output` | required | Output `.md` path |
| `--render` | none | If set: `pptx`, `pdf`, or `html` (calls marp CLI) |
| `--title` | "Report" | Deck title |
| `--subtitle` | auto | Generated from current date |
| `--theme` | `default` | Marp theme: `default`, `gaia`, `uncover` |
| `--logo` | none | Path to logo image (embedded as base64) |
| `--sheet` | first | Sheet to read from xlsx |
| `--max-rows` | 20 | Max rows per data slide |
| `--key-col` | none | Column to group slides by |
| `--value-cols` | all | Comma-separated columns to show |
| `--highlight` | none | `col>val=text` rules for bullet callouts |
| `--appendix` | false | Add full data table as last slide |
| `--force` | false | Overwrite output if exists |

---

## Tips

- Feed the output of `office-excel-transform --groupby` for best results — slides are
  most readable with 3–10 rows of aggregated data.
- Use `--key-col Team` with SE reports to get one slide per support team.
- For branded decks add `--theme gaia` and provide a `--logo` with the NTT logo.
- PPTX output is editable in PowerPoint for last-mile adjustments.
