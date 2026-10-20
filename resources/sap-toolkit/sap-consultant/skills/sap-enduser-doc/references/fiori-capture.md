# Fiori Capture Guide — UI5 apps in the launchpad

How to drive a Fiori app with `scripts/capture.js` (`"ui": "fiori"`). Read
`webgui-capture.md` first for what both modes share: the browser, the logon, the
lockout rule, markers, `readMessage`, the golden rules on data. This file covers only
what is different.

Proven on 2026-09-25 against a freestyle UI5 1.136 app (OData v2, SmartFields, a
value-help dialog, an editable table) on a customer QA system. Fiori elements List
Report / Object Page apps use the same controls underneath and the same steps.

## Starting the app

The consultant gives a launchpad link:

```
https://<host>:44300/sap/bc/ui2/flp?sap-client=100&sap-language=TR#konfUrun-manage
```

Split it into the walkthrough — `baseUrl` is scheme + host + port, `intent` is what
follows `#` (`Object-action`, optionally with `?params`). Nothing of it goes into the
skill's files.

```json
{ "ui": "fiori", "baseUrl": "https://<host>:44300", "client": "100", "language": "TR",
  "intent": "konfUrun-manage", "steps": [ ... ] }
```

`capture.js` logs on with the same logon form as WebGUI, re-opens the intent if the
logon redirect dropped it, and waits until the launchpad has an app open and UI5 has
nothing pending. It then prints and records (`verifications.json`, `logon-system`)
**the SID and client the launchpad itself reports**. That line is the production
check: read it before looking at anything else, and stop if the SID is a production
system — the URL alone does not tell you.

## Read the screen before you script it — `describeApp`

```json
{ "action": "describeApp", "name": "dom-fiori-start" }
```

Writes `<name>.json` with:

- `system` — SID and client;
- `app` — the app id and title from its manifest, its OData service URI(s) and
  version, and its pages (Fiori elements: `sap.fe.templates.ListReport` /
  `ObjectPage` targets with their entity sets; v2 elements: `v2pages`; a freestyle app
  shows its own view names). The title is the cover title's first candidate
  (principle 6); the service name is what to look up in ADT;
- `controls[]` — every **visible** button, field, label, title, column, section, value
  help, with its **text as the user reads it** (logon language), placeholder, tooltip,
  enabled/editable/required, the control **id**, and its position.

This is the Fiori counterpart of the ABAP analysis: field labels, column headers and
button texts come from here verbatim, so the document and the screenshot never
disagree. Values are redacted the same way the WebGUI dumps are. Read the JSON for
the ids and texts you need; do not paste it into the conversation.

Take one `describeApp` per screen state you will document (start screen, after a
search, detail, dialog open). A dialog's controls appear only while it is open.

## Finding a control — selectors, not coordinates

Every Fiori step takes a `control`: a UI5 control selector, resolved by UI5's own
test API (`sap/ui/test/RecordReplay`, the one OPA5 and wdi5 use).

| selector | when |
|---|---|
| `{ "id": "<full id from describeApp>" }` | the first choice when the id is stable — Fiori elements ids (`...::ListReport--fe::FilterBar::...`) and ids a developer gave (`...--idInputModel`) are |
| `{ "controlType": "sap.m.Button", "properties": { "text": "Git" } }` | buttons and links by their visible text |
| `{ "controlType": "sap.m.Text", "properties": { "text": "MML0000042" } }` | a table row / list item by a cell's text |
| `{ "controlType": "sap.ui.core.Icon", "ancestor": { "id": "..." } }` | an icon inside a known control (value-help icon of a field) |

**Never use a generated id** — `__button6`, `__section0`, `__toolbar1` change with
every load. `describeApp` shows them; pick a text or ancestor selector instead.

## The Fiori steps

| step | does |
|---|---|
| `waitUI5` | waits until UI5 has no pending request, timeout or rendering. Every Fiori step below already ends with it; add it by hand only after a plain `wait`. |
| `clickControl` | a real mouse click on the control. **The default for fields and rows**: focus lands where a user's would, and `type` / `press` then act on it as a keyboard does. |
| `pressControl` | a UI5 press event. For buttons — including one pushed into a toolbar overflow — and it fails loudly on a disabled one. |
| `enterText` | sets a field's value through UI5. Fast, but it bypasses the keyboard: on a SmartField with a value list the value was **not kept**, and the next Enter went to whatever had focus. Prefer `clickControl` + `type`. |
| `markControl` | records the control's box under a callout number, like `markSelector`. |
| `describeApp` | see above. |

`press`, `type`, `screenshot`, `readMessage`, `wait`, `scroll` work as in WebGUI;
in Fiori mode `press` and `type` also wait for UI5 afterwards.

## Value-help-only fields

Many Fiori fields cannot be typed into — clicking opens a "Seç: …" dialog. The user's
path, and so the walkthrough's:

```json
{ "action": "clickControl", "control": { "id": "<field>-input" } },
{ "action": "screenshot", "name": "step-01-valuehelp" },
{ "action": "pressControl", "control": { "id": "<field>-input-valueHelpDialog-smartFilterBar-btnGo" } },
{ "action": "clickControl", "control": { "controlType": "sap.m.Text", "properties": { "text": "<value>" } } },
{ "action": "screenshot", "name": "step-02-selected" }
```

A value that appears in more than one row selects the first match — check the
selected row in the next screenshot, and narrow with the dialog's filter fields when
it matters.

## Messages — `readMessage` in Fiori

Fiori reports results as a MessageToast (gone after ~3 s), a MessageBox dialog, a
MessageStrip, or the message popover. In Fiori mode `readMessage` reads those, in that
order. Put it **directly** after the step that triggers the message; anything in
between can outlive the toast. `null` still means "not verified", never "no error".

## Variants and saved views

A Fiori "variant" is a saved view in the variant management control above a filter
bar or table. Selecting one: `pressControl` on the variant management, then
`clickControl` on the view name. As in WebGUI, never type over a view's values to get
a screenshot.

## Buttons that change data

Fiori screens mix display and change on one page ("Kaydet", "Sil", "Ürün Ağacı
Güncelle", "Onayla"). Document them from `describeApp` (text, enabled, what the
analysis says they do); **press one only when the consultant has said this system may
be written to**, and verify the result with `readMessage` right after. The system
check (`logon-system`) comes before that decision, not after.

## HTTPS and client certificates

SAP's ICM asks for a client certificate by default. Chromium waits for someone to
pick one and every page load times out, while `curl` reaches the same URL at once.
`capture.js` therefore sends requests for the SAP host through Playwright's own HTTP
stack, which answers "no certificate". This applies to WebGUI runs too. If a system
needs the browser's own TLS (it really does authenticate with a certificate), set
`"browserTls": true` in the walkthrough.

The launchpad's notification WebSocket cannot be routed this way and fails to
connect; the console shows it, and nothing in a capture needs it.

## Troubleshooting

| symptom | likely cause | fix |
|---|---|---|
| `The app did not start` after logon | wrong `intent`, or the user lacks the app's catalog/role | open the link in a browser as that user; check the tile exists |
| `no control matches {...}` | a generated id, a dialog not open yet, a text in another language | take a `describeApp` at that point and copy the id or text from it |
| a field shows empty after `enterText` | value-list SmartField | `clickControl` + `type`, or the value-help pattern above |
| every `goto` times out on https | client-certificate request with `browserTls: true` | remove `browserTls` |
| `UI5 did not settle` | a request that never ends (polling tile, long-running call) | raise `timeoutMs` on that step; if it never settles, fall back to `wait` |
