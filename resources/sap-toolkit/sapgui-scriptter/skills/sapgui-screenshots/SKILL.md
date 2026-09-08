---
name: sapgui-screenshots
description: >
  Capture classic Windows SAP GUI screens and turn a transaction walkthrough into a
  step-by-step user manual. Use when the user wants screenshots of SAP GUI (SE16, SE09,
  ST22, any tcode) or a "how-to" guide / manual from SAP screens. Preflight detects whether
  SAP GUI Scripting is usable and GUIDES toward the best capture path (clean scripting →
  enable temporarily → WebGUI+Playwright). Batched driver navigates a transaction and captures
  each step in ONE run, emitting a manifest for office-tools' office-manual (docx/pptx/pdf).
  Triggers: "screenshot SAP GUI", "capture SE16/ST22", "make a user manual / guide from SAP",
  "document this transaction", "table contents manual".
---

# sapgui-screenshots — capture SAP GUI screens → user manuals

> **NTT Studio kuralı — CANLI SİSTEMDE SADECE GÖRÜNTÜLEME.** Bu skill ADT'ye değil,
> çalışan SAP GUI penceresine bakıyor ve gezinmek için gerçek tuşlara basıyor (Enter, F8,
> alan doldurma). Yani okuma aracı gibi görünür ama teknik olarak SAP'ta işlem
> yapabilecek tek yetenektir. Kural:
>
> - **PRD/canlı sistemde** yalnızca görüntüleme işlemleri (SE16 display, ST22, SE09
>   görüntüleme) yakalanır. Kaydeden, kitleyen, belge yaratan hiçbir ekrana girilmez.
> - Kılavuz için işlem adımı gerekiyorsa DEV/QA'da yakala; ekrandaki veri temsilî olmalı.
> - Emin değilsen dur ve danışmana sor. Yanlışlıkla basılan bir Kaydet, geri alınamaz.

Produces real classic **Windows SAP GUI** screenshots and assembles them into a
user manual (Word/PPTX/PDF) via the **office-tools `office-manual`** skill.
Windows-only; needs `pywin32` + `Pillow`.

## ALWAYS preflight first (don't probe-loop)

```bash
py plugins/sapgui-scriptter/skills/sapgui-screenshots/scripts/gui_navigate_capture.py --preflight
```

Returns JSON with a **`recommendation`** and human **`guidance`**. Branch on it —
do **not** sit in retry loops waiting for scripting to attach:

| `recommendation` | Meaning | Do this |
|---|---|---|
| `scripting` | A scriptable session is attached (`sessions ≥ classic_windows`) | Capture cleanly with `take_screenshot.py --method hardcopy` (sibling `abapgit-deploy` skill) |
| `enable_scripting` | Classic GUI open but **0 sessions** → scripting disabled server-side | Guide the user to enable it (below); else WebGUI |
| `webgui_playwright` | No classic SAP GUI running | Drive the WebGUI in a browser via Playwright/chrome-devtools |

### If scripting is disabled — guide the user to enable it (preferred)

- **Server (basis, dynamic, no restart):** tx **`RZ11`** → parameter
  `sapgui/user_scripting` → Change Value → **TRUE** (revert to FALSE after; needs `S_RZL_ADM`).
- **Client:** SAP Logon → **Options (Alt+F12)** → **Accessibility & Scripting → Scripting** →
  tick **Enable scripting**, untick both **Notify** boxes.
- **Log off and back on** (the change applies to NEW sessions), then `--preflight` again →
  expect `sessions > 0`, and use the clean `hardcopy` capture.

### If scripting can't be enabled — WebGUI + Playwright (reliable fallback)

Open the system's WebGUI (`https://<host>/sap/bc/gui/sap/its/webgui`) in a browser,
drive it with the chrome-devtools/Playwright tools, capture each screen, and feed the
PNGs to `build_manual.py`. Same manifest, fully reliable. (This is what works for
WebGUI-only systems with no classic dispatcher.)

## Batched capture (the fast path) — one run, then build

When scripting is off but you must use classic GUI, this driver navigates a transaction
and captures every step in a **single invocation** via OS-level automation (Win32
`SendInput` + `PrintWindow`), then emits a manifest:

```bash
# 1) drive + capture (ONE call)
py plugins/sapgui-scriptter/skills/sapgui-screenshots/scripts/gui_navigate_capture.py \
  --steps steps.json --shot-dir screenshots --emit-manifest steps.manifest.json

# 2) build the manual (ONE call)
py plugins/office-tools/skills/office-manual/scripts/build_manual.py \
  --manifest steps.manifest.json --output guide.pdf
```

### steps.json

```json
{
  "title": "How to View Table Contents in SE16 - ZAI_T_AI_CONFIG",
  "author": "NTT DATA",
  "window": "optional title substring to target (else the active SAP session)",
  "steps": [
    {"action": "okcode", "value": "/nSE16", "title": "Open SE16", "description": "...", "shot": true},
    {"action": "type",   "value": "ZAI_T_AI_CONFIG", "title": "Enter table", "description": "...", "shot": true},
    {"action": "key",    "value": "Enter", "title": "Selection screen", "description": "...", "shot": true},
    {"action": "key",    "value": "F8", "title": "Results", "description": "...", "shot": true}
  ]
}
```

**Actions:** `okcode` (click the OK-code field, type, Enter) · `type` (type into the focused
field; optional `"click":[x,y]` to focus first) · `key` (Enter, F1–F12, Escape, Tab, F3…) ·
`click` (`"value":[x,y]`, window-relative). Add `"shot": true` to capture **after** the action;
shot steps with a title become manifest entries. Optional per-step `"wait"` overrides `--settle`.

**Flags:** `--okcode-xy x,y` (OK-code field location, default `110,51`) · `--settle SECONDS`
(per-action wait, default `2.2`) · `--list` (list SAP GUI windows).

## Hard rule: agent prints, developer runs

Like the rest of this plugin (SAP API policy, April 2026), the agent does **not** drive
SAPGUI itself by default — it prepares `steps.json` and prints the `!python …` command for
the developer to run, then reads the emitted screenshots/manifest and builds the manual.
(Capturing/reading PNGs and running `build_manual.py` are local-only — the agent may do those.)

## Notes / gotchas (baked into the driver)

- **Single-click** the OK-code field — a double-click opens the combo dropdown and eats keystrokes.
- **Foreground** is forced past Windows' focus-steal lock (AttachThreadInput); the script is DPI-aware.
- Stale window handle mid-run is re-resolved once (SAP GUI reuses the session window for `/n`).
- For a **WebGUI** system there is no classic window to grab — use the Playwright fallback.

## See also

- `take_screenshot.py` (sibling `abapgit-deploy` skill) — single-shot capture; `--method hardcopy`
  (clean, needs scripting) or `--method window` (Win32 grab).
- `office-manual` skill (office-tools plugin) — turns the emitted manifest into docx/pptx/pdf.
