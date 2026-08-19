---
name: office-manual
description: >
  Build a step-by-step user manual (Word .docx or PowerPoint .pptx) from a JSON manifest of
  numbered steps, each with a title, description, and optional screenshot path. Use when the
  user wants to document a workflow with annotated screenshots — "create a user guide from these
  SAP screenshots", "make a Word manual with screenshots", "turn these steps into a PowerPoint
  tutorial", "document this process". Pairs naturally with sapgui-scriptter's take_screenshot.py
  to capture SAPGUI screens, then assembles them into a professional, editable document.
allowed-tools: Bash(python:*), Bash(py:*), Bash(pip:*), Read, Write
---

# office-manual — screenshot-annotated user manuals

Turns a JSON manifest of steps (title + description + optional screenshot) into a
polished, editable Word document or PowerPoint deck. Screenshots are embedded
natively — not linked — so the file is self-contained.

Dependencies: `python-docx` (for .docx) and/or `python-pptx` (for .pptx) —
both are in `requirements.txt`.

## Manifest format

Create a `steps.json` file (path-relative screenshots are resolved from the
manifest's directory):

```json
{
  "title":  "How to Import ABAP via abapGit",
  "author": "NTT DATA — your name",
  "steps": [
    {
      "step": 1,
      "title": "Open Transaction",
      "description": "Type ZABAPGIT_STANDALONE in the command bar and press Enter.",
      "screenshot": "screenshots/step_001.png"
    },
    {
      "step": 2,
      "title": "Select Offline Repository",
      "description": "Choose your offline repo from the list and click Import ZIP.",
      "screenshot": "screenshots/step_002.png"
    },
    {
      "step": 3,
      "title": "Confirm Activation",
      "description": "Review the activation log. Green = success.",
      "screenshot": "screenshots/step_003.png"
    }
  ]
}
```

`"screenshot"` is optional per step — text-only steps render cleanly without one.

## Usage

```bash
# Word document (docx)
py plugins/office-tools/skills/office-manual/scripts/build_manual.py \
  --manifest steps.json --output manual.docx

# PowerPoint deck (pptx)
py plugins/office-tools/skills/office-manual/scripts/build_manual.py \
  --manifest steps.json --output manual.pptx --format pptx

# Auto-discover step*.png files (no manifest needed — good for a quick draft)
py plugins/office-tools/skills/office-manual/scripts/build_manual.py \
  --screenshot-dir screenshots/ --title "My SAP Guide" --output guide.docx

# Override title / author at CLI
py plugins/office-tools/skills/office-manual/scripts/build_manual.py \
  --manifest steps.json --output manual.docx \
  --title "SAP Delivery Process" --author "NTT DATA Solutions" --force
```

## Layout

**docx:** title page → numbered Heading 2 steps → body text → centered screenshot (6" wide, auto-height). One blank paragraph between steps. All headings in NTT green.

**pptx:** title slide → one slide per step. Green title bar ("Step N: Title") with accent underline. If the step has a screenshot, the image fills the content area (full-width, aspect-ratio preserved) and the description appears as a caption strip at the bottom. Text-only steps use the full slide area for the description.

## End-to-end with sapgui-scriptter

Capture screenshots during a SAPGUI workflow, then build the manual:

1. **Capture** each SAP screen (developer runs these; agent prints the command):
   ```
   !python plugins/sapgui-scriptter/skills/abapgit-deploy/scripts/take_screenshot.py \
     --output screenshots/step_001.png
   ```

2. **Write the manifest** — Claude drafts `steps.json` based on the workflow steps
   and the screenshot filenames.

3. **Build the manual** — Claude runs this directly (no SAP contact):
   ```bash
   py plugins/office-tools/skills/office-manual/scripts/build_manual.py \
     --manifest steps.json --output manual.docx
   ```

The output `.docx` or `.pptx` lands in the current directory, ready to share or
upload to SharePoint/Teams.

## Tips

- For a SAP workflow: capture a screenshot after every key action (transaction
  open, dialog filled in, result screen). One step = one screenshot.
- If you already have a folder of `step001.png`, `step002.png`, … files, use
  `--screenshot-dir` to skip writing the manifest — Claude can add descriptions
  afterwards from the file names or by asking you.
- Use `--force` to overwrite when iterating on the manual.
- Need a PDF instead of Word? Run `office-pdf` on the same Markdown source.
- Need an Excel attachment? Use `office-excel-report` alongside this skill.
