---
name: office-slides
description: >
  Convert aggregated Excel/CSV/JSON data into a Marp presentation (PPTX, PDF,
  or HTML). Reads a source file (ideally the output of office-excel-transform or
  office-excel-report), generates a slide-per-section Marp Markdown file, and renders
  it via @marp/cli. Typical use: weekly SE report → pivot tables → slide deck.
version: 1.1.0
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

On Windows npm installs it as `marp.cmd`; the script finds that (or a local copy
through `npx`) on its own.

The Python helper also needs the project venv active (pandas, openpyxl).

---

## Usage

```
python plugins/office-tools/skills/office-slides/scripts/generate_slides.py \
  --input  <data.xlsx|csv|json>  \
  --output <deck.md>             \
  --render <pptx|pdf|html>       \   # optional, requires marp CLI
  --title  "SE Weekly Report"    \
  --lang   tr                    \   # deck's own headings and date: tr (default) or en
  --footer "Proje X"             \   # optional footer text before the date
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
| 1 | Title + subtitle (--title, current date in --lang) |
| 2 | Summary (`Özet` / `Executive Summary`) — total and average per numeric column; rate and average columns get an average only |
| 3 | **One row per group** (a weekly status: one line per module): every group in ONE table (`Modul bazında durum`) + bullet highlights |
| 4 | …and a **bar chart** of the parts that add up to the total column (`Tamamlanan + Devam Eden + Başlamadı = Toplam`), written beside the deck as `<deck>-grafik.svg` |
| 3…N | **Several rows per group**: one slide per group, table + bullet highlights |
| N+1 | Appendix: full data table (if --appendix) |

**The look is the house look** (since 2026-09-29): the NTT mark top right on every
slide, Segoe UI, house-blue headings and table header, tinted zebra, numbers
right-aligned, the deck's title in the footer with the date and page number.
Before that the deck was Marp's default theme with the title repeated as a header,
and a four-module status came out as four slides of a single-row table each.

---

## Arguments

| Argument | Default | Purpose |
|----------|---------|---------|
| `--input` | required | Source data (xlsx, csv, json) |
| `--output` | required | Output `.md` path |
| `--render` | none | If set: `pptx`, `pdf`, or `html` (calls marp CLI) |
| `--editable` | false | With `--render pptx`: marp's experimental `--pptx-editable`. **Needs LibreOffice** |
| `--title` | `Rapor` / `Report` | Deck title |
| `--subtitle` | auto | Generated from current date |
| `--lang` | `tr` | Language of the deck's own words and date: `tr` or `en` |
| `--footer` | none | Footer text after the title; the date always follows |
| `--theme` | `default` | Marp theme: `default`, `gaia`, `uncover` |
| `--logo` | the NTT mark | Another logo image (embedded as base64) |
| `--no-logo` | false | No mark (a deck that is not ours) |
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
- Use `--key-col Team` with SE reports: one row per team gives one table and a
  chart; several rows per team give one slide per team.
- Keep `--theme default`: the house style is laid over it. The `.svg` chart must
  stay beside the `.md` — rendering passes `--allow-local-files` for it.
- Numbers: whole numbers print without `.0`; a column named like a rate
  (`Oran`, `ratio`, `rate`, `%`) with values 0..1 prints as a percentage
  (`%50` in tr, `50%` in en) and is never summed.
- **The PPTX is not editable.** Marp's `--pptx` puts one picture per slide: it opens
  and presents in PowerPoint, but its text cannot be changed there. `--editable`
  asks marp for real text boxes, which is experimental and needs LibreOffice
  (`soffice`) on the machine. When the deck has to be edited afterwards, build it
  with **office-pptx** instead.
