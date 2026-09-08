---
name: office-pptx
description: >
  Build a native, editable PowerPoint .pptx with real text boxes, bullet lists,
  and tables via python-pptx. Use when the user wants an editable deck ("PowerPoint",
  "pptx", "editable slides", "management deck they can edit"). Distinct from
  office-slides (Marp), which renders from Markdown — use office-pptx when the
  result must be edited in PowerPoint afterwards. Optional KVKK/PII masking.
allowed-tools: Bash(python:*), Bash(py:*), Bash(pip:*), Read, Write
---

# office-pptx — native editable PowerPoint

Produces real PowerPoint shapes (text boxes, bullet lists, tables) you can edit
afterwards — best for a polished, branded management deck. Dependency:
`python-pptx` (in requirements.txt).

> **office-pptx vs office-slides (Marp):** Marp renders Markdown to a flat-ish
> deck (fast, themeable). office-pptx builds native, fully-editable shapes. Pick
> office-pptx when execs need to tweak the deck in PowerPoint.

## Usage

Two input forms (pick one):

```bash
# 1) JSON spec — full control over slide types
py plugins/office-tools/skills/office-pptx/scripts/build_pptx.py \
  --spec deck.json --output deck.pptx --title "Q2 Review" [--redact-pii] [--force]

# 2) Markdown deck — quick: '---' separates slides, '# H' = title, '- ' = bullet
py plugins/office-tools/skills/office-pptx/scripts/build_pptx.py \
  --md deck.md --output deck.pptx
```

## JSON spec shape

```json
{
  "title": "Q2 Review",
  "slides": [
    {"type": "title",   "title": "Q2 Review", "subtitle": "Board update"},
    {"type": "bullets", "title": "Highlights",
     "bullets": ["Revenue +12%", "5 bugs fixed", ["indented sub-point", 1]]},
    {"type": "table",   "title": "Scorecard",
     "headers": ["Metric", "Value"], "rows": [["Pass", "22"], ["Fail", "0"]]}
  ]
}
```

- `bullets` items are either a string or `[text, indent_level]`.
- 16:9 widescreen (13.33×7.5 in), accent title bars + underline, wordmark bottom-right on every slide.

## Tips

- A natural management deck: (1) title + status, (2) scorecard table,
  (3) before→after table, (4) remaining items, (5) next steps.
- `--redact-pii` masks TCKN / 10-11 digit tax IDs in every string of the spec.
- Need a flat PDF instead? Use **office-pdf**. Need a Word doc? **office-docx**.
