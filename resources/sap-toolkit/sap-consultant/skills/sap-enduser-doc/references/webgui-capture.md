# WebGUI Capture Guide — Quirks and Conventions

How to drive SAP GUI for HTML with `scripts/capture.js` and get print-quality, consistent screenshots.

## Before the first run — the browser

This skill assumes Chromium is **already installed** on the machine; neither `capture.js`
nor `render.js` ever calls `playwright install` or any other installer. `scripts/browser-path.js`
resolves the executable to use, in order: `PW_EXECUTABLE` if set → Playwright's own expected
build, but only if that file actually exists on disk → a scan of the local Playwright browser
cache for any other complete, full Chromium build. Run `node scripts/precheck.js` first; it
performs exactly this resolution read-only and tells you which one (if any) it found.

On locked-down corporate machines, Playwright's *expected* revision can be missing or a partial
download (proxy/TLS failure) while a *different* revision is fully present from another tool —
`precheck.js`/`browser-path.js` handle that automatically. If both `capture.js` and `render.js`
still die with:

```
browserType.launch: Executable doesn't exist at ...\chromium_headless_shell-1194\chrome-win\headless_shell.exe
```

that means no complete full-Chromium build exists anywhere it looked. Do **not** try to fix this
by reinstalling in a loop, or by having the agent run any install command. Instead, point
**`PW_EXECUTABLE`** at any already-installed Chromium yourself:

```bash
ls ~/AppData/Local/ms-playwright/          # windows: which revisions exist
# chromium-1228/chrome-win64/chrome.exe  <- use a full chromium, not chromium_headless_shell

PW_EXECUTABLE="C:/Users/<you>/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe" \
  node scripts/capture.js work/walkthrough.json work/shots/
PW_EXECUTABLE="C:/.../chrome.exe" node scripts/render.js work/document.md work/output.pdf
```

Prefer a full `chromium-*/chrome*` build over a `chromium_headless_shell-*` one: the headless
shell cannot print PDFs with the header/footer templates `render.js` uses.

## Golden rules

1. **Keyboard first.** WebGUI element IDs are generated and unstable across releases/patches. Tab order, however, follows the dynpro field order — which you already know from the ABAP analysis. Navigate with `press: Tab` / `type` / F-keys; use `click`/`markSelector` only when keyboard cannot reach something.
2. **Fixed environment = identical documents.** Keep viewport 1440×900, deviceScaleFactor 2 (both are the script defaults), same theme, `sap-language` matching the document. Do not change these per customer without reason.
3. **Mark, then shoot.** `markFocused` records where the focus ring is *now*. Record all markers for a screen state, then take the `screenshot` — never navigate between marking and shooting.
4. **Test system only.** Confirm in the interview that the system and its data are safe to show the customer. If anything sensitive appears in a shot, re-capture with different data; do not blur (blur signals "we showed something we shouldn't have").

## Keyboard map (WebGUI honors SAP GUI keys)

| Key | Effect |
|---|---|
| `Enter` | Confirm / validate screen |
| `F8` | Execute (reports) |
| `F3` | Back |
| `F4` | Value help on focused field |
| `Tab` / `Shift+Tab` | Next / previous field |
| `F1` | Field help (avoid — opens help viewer) |

In Playwright these are `page.keyboard.press('F8')` etc. — capture.js `press` steps take the same names.

## Known quirks

- **Frames:** older ITS setups wrap the app in a frameset. capture.js's `appFrame()` picks the frame whose URL matches `webgui|its`; if selectors fail, log `page.frames().map(f => f.url())` to see where the app actually lives.
- **First paint is slow.** After login and after every F8, the dynpro renders asynchronously. The default 400ms settle after `press` is usually enough on a LAN; over VPN, raise `settleMs` per step (800–1500) rather than globally slowing everything.
- **Focus after screen change:** after `Enter`/F8, WebGUI places focus on the first input or the grid — do a defensive `Tab` and check with `markFocused` on a scratch shot if the tab order surprises you.
- **ALV in WebGUI ≠ desktop ALV.** The web rendering differs visually from SAP Logon. The template's standing note covers this; keep it in the document whenever the customer's users work on desktop GUI.
- **Value help (F4) popups** render as overlay divs. If a scenario needs to show one, screenshot with the popup open, then `press: Escape` to close before continuing.
- **Session hygiene:** one transaction per capture run. If a step fails, the run stops and saves `FAILED-step-N.png` — inspect it, fix the walkthrough, rerun from scratch once, manually. Do not script an automatic retry loop around `capture.js`; a repeated failed logon counts toward SAP's lockout threshold. Never resume mid-session; dynpro state will not match.
- **Credential hygiene:** `SAP_WEBGUI_USER`/`SAP_WEBGUI_PASS` come from environment variables only. Never hardcode them in a debug/probe script, never write them into `markers.json`, DOM dumps, walkthrough files, or screenshots, and never let them appear in console output you paste back into chat. A script with a literal username/password in it is a leaked-credential incident — delete it and rotate the password.

## Grid cells are `<input>`, not text — use `clickXY` (the variant-catalog problem)

The **variant catalog** popup (`Varyant getir…` / `Shift+F5`) and any WebGUI ALV grid render
their cells as `<input>` widgets with generated ids, **not** as text nodes. So `click` on
`text="TEST"` / a CSS selector **times out** — there is nothing matchable, and keyboard
`ArrowDown` + `Enter` moves the row highlight but often does not confirm the selection.

**Solution — `clickXY` with a double-click on the cell**, then let the popup close:

```json
{ "action": "press", "key": "Shift+F5", "settleMs": 3000 },
{ "action": "clickXY", "x": 432, "y": 385, "double": true, "settleMs": 5000 }
```

Coordinates are CSS pixels in the configured viewport. Read them off a scratch screenshot:
take one shot of the open popup, open it in an image viewer, divide the pixel position of the
target row by `deviceScaleFactor` (2) to get the CSS coordinate. The variant name column sits
near the left of the grid; the first data row is a few px below the column header.

`clickXY` is the general escape hatch for **any** widget with no matchable text and a dynamic
id — prefer keyboard, fall back to `clickXY`, never hardcode a generated id.

## Selecting an existing variant without changing its values

The default quick-trigger flow (see SKILL.md) runs against a **named, pre-existing** variant:
load it, then only navigate/execute — never `type` into a field the variant already filled in.

```json
{ "action": "press", "key": "Shift+F5", "settleMs": 3000 },
{ "action": "clickXY", "x": 432, "y": 385, "double": true, "settleMs": 5000 },
{ "action": "screenshot", "name": "step-01-selection" },
{ "action": "press", "key": "F8", "settleMs": 1500 },
{ "action": "readMessage", "name": "after-run" },
{ "action": "screenshot", "name": "step-02-output" }
```

Note there is no `type` step between loading the variant and pressing `F8` — the screenshot at
`step-01-selection` must show exactly what the variant already contains. If a behavior-changing
parameter inside the variant (test/update mode, a radio group) is unclear from its stored value
alone, say so in the document rather than changing it to "see what happens" — this skill never
mutates a variant to produce a screenshot.

If the requested variant does not exist, or the catalog popup shows no matching row, stop and
report that — do not fall back to typing values manually without telling the user you did so;
that would silently turn a "use variant X" request into an invented scenario.

## Verifying system messages technically (`readMessage`)

Screenshots are evidence for the document, not the mechanism for deciding whether a step
actually worked. After any critical action — F8, a save, a post, a status change — add a
`readMessage` step:

```json
{ "action": "press", "key": "F8", "settleMs": 1500 },
{ "action": "readMessage", "name": "after-run" }
```

`readMessage` does a best-effort read of the WebGUI status/message bar text (a handful of
common selectors; WebGUI skins vary) and appends `{ step, name, text }` to
`<outDir>/verifications.json`. `text: null` means "could not read a message bar" — treat that
as *unverified*, not as *no error occurred*; fall back to visually reading the message area in
the screenshot and note explicitly that it was a visual read, not a technical one. Use
`verifications.json` (small, structured) rather than re-opening screenshots when deciding
pass/fail on a given step, and quote a message's real captured text in the document's error
table instead of a paraphrase when one is available. For field-value verification (did the
variant really carry the values you expect?), use the existing `dumpInputs` action and read
only the specific field(s) you need from its JSON — don't paste the whole dump into the document
or the conversation.

## Scrolling a wide ALV to reach right-hand columns

A dynamic ALV can have far more columns than fit the viewport (this report builds a Değer/Miktar
pair per material-ledger category). Getting the right-hand columns into a screenshot is fiddly:

- **Mouse wheel does nothing horizontal** — the WebGUI ALV ignores `wheel` for horizontal scroll.
- **`Ctrl+ArrowRight`** pages right once, then **wraps back** to the first page — unreliable for
  a clean shot.
- **`drag` on the horizontal scrollbar thumb** works only if the scrollbar is actually on screen;
  at a normal 1440-wide viewport it often is not.

The reliable approach is to **widen the viewport** so more columns fit, capture once, then crop:

```json
"viewport": { "width": 2600, "height": 1000 }
```

Then crop the value columns out of the wide shot with `sharp` (or PyMuPDF/PIL). A 2600-wide
viewport at `deviceScaleFactor: 2` yields a 5200px-wide image; crop the right portion showing
the `Σ Değer` / `Miktar` columns for the "Sonuçların Yorumlanması" section. Keep the wide shot
as an intermediate; ship the crop.

## Walkthrough authoring pattern

For a typical report, the script skeleton looks like:

```json
{
  "baseUrl": "https://sapqas.customer.com:44300",
  "client": "300",
  "language": "TR",
  "transaction": "ZMM_STOCK_RPT",
  "steps": [
    { "action": "wait", "ms": 2000 },

    { "action": "markFocused", "label": 1, "shot": "step-01-selection" },
    { "action": "type", "text": "1000" },
    { "action": "press", "key": "Tab" },
    { "action": "markFocused", "label": 2, "shot": "step-01-selection" },
    { "action": "type", "text": "01.07.2026" },
    { "action": "screenshot", "name": "step-01-selection" },

    { "action": "press", "key": "F8", "settleMs": 1500 },
    { "action": "screenshot", "name": "step-05-output" }
  ]
}
```

Note the pattern: focus lands on a field → mark it → type the scenario value → Tab onward. The screenshot at the end of the block therefore shows a *filled* selection screen with markers on exactly the fields the document's table describes.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Login fields not found | SSO auto-login, or custom logon page | Remove/adjust the login block expectation; for custom pages add `click`/`markSelector` steps |
| Blank screenshots | Shot taken before dynpro painted | Increase preceding `wait`/`settleMs` |
| Markers misplaced on image | Scale mismatch | Ensure markers.json `scale` matches deviceScaleFactor (both 2 by default) |
| Turkish labels missing / English screens | `sap-language` ignored | User's default logon language overrides; set language on the logon screen step or fix the user default in SU01 |
| Keys like F8 do nothing | Focus stuck outside app frame | Click once into the app area (`click` on `body` of app frame) then continue with keys |
