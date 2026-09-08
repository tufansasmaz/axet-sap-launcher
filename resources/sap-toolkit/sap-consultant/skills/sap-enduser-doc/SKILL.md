---
name: sap-enduser-doc
description: Generate polished, end-user-facing PDF documentation for existing SAP classic GUI (dynpro/ALV) programs. Use this skill whenever the user wants to create user documentation, a user manual, "kullanıcı dokümanı", "son kullanıcı dokümantasyonu", a training guide, or a how-to PDF for a custom SAP report or transaction — even if they only say "document this program" or mention a Z-program/tcode and end users. The skill analyzes ABAP source, interviews the consultant for business context, captures annotated screenshots from SAP GUI for HTML (WebGUI) via Playwright, and renders a branded PDF.
---

# SAP End-User Documentation Generator

> **NTT Studio uyarlaması — MCP değil, HTTP; ve kurulum gerektiriyor.**
> Aşağıda `sap-adt` skill'i geçen her yerde `sap-adt-readonly` oku: bu dağıtımda `sap-adt`
> yok ve `adt_*` araçları MCP'den değil yerel okuma kapısından çağrılır —
> `POST http://127.0.0.1:8787/tool/adt_search`, `.../adt_get_source`. İhtiyaç duyduğun her
> iki araç da kapıdan geçiyor.
>
> Ayrıca bu skill **tek başına çalışmaz**: Node 18+, `npm install` (playwright, marked,
> sharp, mermaid) ve makinede kurulu bir Chromium ister. Bunlar paketle GELMİYOR ve
> otomatik kurulmuyor; kullanıcı onaylı, tek seferlik bir adım. İşe başlamadan önce
> `node scripts/precheck.js` çalıştır ve eksikse dokümana değil kullanıcıya dön.

This skill produces professional, business-language PDF documentation for existing SAP classic GUI programs (reports, ALV lists, dynpro transactions). The audience is **SAP end users at the customer** — not developers, not consultants. The output must explain what the program does and how to use it, with zero technical jargon.

The final deliverable is a PDF generated from a Markdown source, with Mermaid process diagrams and annotated WebGUI screenshots.

## Non-negotiable principles

1. **Task-oriented, not screen-oriented.** Structure the document around what the user is trying to accomplish ("Aylık stok raporunu nasıl alırım?"), never around the program's menu/feature structure.
2. **Scenario drives everything.** The data shown in screenshots and text comes from exactly one of two sources: (a) a scenario confirmed in the Phase 3 interview, or (b) the field values already stored in the SAP variant the user named. Never invent, blend, or partially overwrite either — do not type new values into an existing variant's fields, and do not caption a screenshot with numbers that were not actually on screen.
3. **Code tells you *what*, a confirmed source tells you *why*.** ABAP analysis produces skeletons (field tables, message lists). Business meaning comes from the consultant interview when one happens, and otherwise only from what the code and the actual captured run demonstrably show. Never write a business explanation nobody confirmed — if the "why" is not in the code, not on screen, and no consultant is available to ask, **omit the sentence/field/row entirely**. Never write a placeholder or disclaimer in its place (see principle 7).
4. **No production data.** Screenshots come from a test/quality system with representative, non-sensitive data. Confirm this explicitly in the interview, or — in the default quick-trigger flow — verify it from the connection configuration/system id (see "Default trigger" below) and hard-stop if the target looks like production.
5. **One language throughout.** Default is Turkish (`sap-language=TR` in WebGUI so screen labels match the text). If the user asks for another language, switch both the document language and the WebGUI logon language together.
6. **The cover title is always dynamic.** It is never the fixed string "SAP Kullanıcı Dokümanı", and it does not repeat "Kullanıcı Dokümanı" (the subtitle already carries that). The main title is the **real functional business/program name** found through the analysis or metadata (e.g. "Ertelenmiş Vergi Raporu"); if no real business name can be found in any source, the transaction code becomes the title. `render.js` enforces this in code as well (see `resolveCoverTitle`) — follow the same rule when writing `document.md`. The YAML front-matter fields (`title`/`subtitle`/`customer`/`version`/`date`/`system`/`transaction`/`variant`/`author`) appear only in the two-column corporate info table on the cover and in the header/footer template; they are never written raw into the body and never enter the table of contents — `render.js`'s front-matter parser does that separation automatically, so do not repeat the metadata inside `document.md`.
7. **Unverifiable information never goes into the document.** Department, usage frequency, exact business purpose, support contact, business rules and the like: write them naturally when they can be reliably obtained from the ABAP analysis, the SAP screens, existing metadata, or verified project content. When they cannot, write **no explanation, warning, note or placeholder** — nothing along the lines of "could not be verified", "should be confirmed", "check with the responsible consultant", "not provided". Remove the sentence, row or field from the document entirely. Missing or unverifiable topics are reported to the user only in the end-of-task report (in chat) or on the "Kalan işler" line of `SESSION_HANDOFF.md` — never inside `document.md` or the PDF.

## When this skill is not the right tool

It documents **an existing SAP classic GUI program for the people who will use it**. Reach for something else when:

- The audience is technical. An as-built/handover record of what was built is [`../as-built-doc/SKILL.md`](../as-built-doc/SKILL.md); a specification of what is to be built is `fs-generator` / `ts-generator`.
- Nothing has been built yet. There is no program to read and no screen to capture — this skill has no way to document an intention.
- The target is a Fiori/UI5 app, a web front end, or anything that is not classic dynpro/ALV in WebGUI. `capture.js` drives the WebGUI ITS frame specifically; another UI will not produce usable screenshots.
- The system is customer **production**. That is refused twice over: principle 4 stops the capture, and the tier-3 install gate keeps the skill out of a customer-production workspace in the first place.
- The consultant only wants a quick screenshot or a one-off note. The full flow logs into SAP, replays a walkthrough and renders a PDF; for one picture it is far more machinery than the job needs.

## Default trigger — one sentence is enough

The consultant writes Turkish, so the trigger sentence below is quoted verbatim rather than translated — it is the literal input, not an instruction:

**"`<İŞLEM_KODU>` işlem kodunda `<VARYANT>` varyantı için son kullanıcı dokümanı oluştur"** (or an equivalent: tcode only, variant optional). That one sentence is enough to start the fully automatic flow below without asking anything further at runtime. This is the skill's **default behaviour**; no separate instruction is needed.

0. **PRECHECK** (`node scripts/precheck.js`) — stop on failure and report why.
1. Check whether `work/<TCODE>__<VARIANT>/SESSION_HANDOFF.md` exists (see "Continuity across sessions"). If it does, resume from it and do not repeat completed steps.
2. **Program discovery:** resolve the program name and ABAP source from the transaction code. This skill has no ADT client of its own — use the existing **`sap-adt`** skill ([`../sap-adt/SKILL.md`](../sap-adt/SKILL.md)), or `sap-adt-readonly` where that is the installed surface: `adt_search` (tcode/program) → `adt_get_source` (main program). `adt_sql` with `SELECT tcode, pgmna, dypno FROM tstc WHERE tcode = '<TCODE>'` gives the same answer where it is enabled — on the read-only surface it is gated behind `ADT_RO_ALLOW_SQL`, so prefer `adt_search`. Write the result to `work/<TCODE>__<VARIANT>/analysis.md`.
3. Analyze the source per `references/abap-analysis.md` (Phase 2).
4. Open the program in WebGUI with the transaction code and variant, **select the variant without altering any of its field values**, run the normal user flow (F8/Enter), screenshot the critical steps and verify the system message technically with `readMessage` (Phase 4). Ask the user only on a genuine ambiguity or safety condition (the system looks like production, the variant was not found, an unexpected confirm/delete dialog appeared) — otherwise proceed without stopping.
5. Write the document (Phase 5) — derive the business logic from the ABAP analysis and from screens and messages actually observed. If no consultant interview took place, invent nothing for the overview or for unknown fields: drop the unverifiable sentence or field from the document entirely (see Non-negotiable principle 7) and tell the user in the end-of-task report which topics still need filling in — never write a placeholder or a warning into the document itself. Use the real functional business name found in the analysis/metadata for the cover title; fall back to the transaction code if there is none (see principle 6) — never a fixed "SAP Kullanıcı Dokümanı".
6. Render the PDF and check it statically (Phase 6).
7. Update `SESSION_HANDOFF.md`, then give the **end-of-task report** (see below).

This shortcut **never hardcodes** the transaction code, program name or variant into the skill files — all three are runtime inputs (see Operating rule 7).

## Operating rules (apply to every phase)

1. **Never install anything at runtime.** Chromium/Playwright/Node packages are assumed already installed on the machine. Never run `npx playwright install`, `playwright install chromium`, any `npm install` triggered automatically mid-task, or delete/clear a Playwright lock file to "fix" a launch failure. If the browser or a dependency is missing, PRECHECK (below) reports it — stop and tell the user, do not try to install it yourself.
2. **One tool call at a time.** Run `precheck.js` → `capture.js` → `annotate.js` → `render.js` strictly in sequence. Never fire the next tool call before the previous one's result (exit code + output) has come back. Do not parallelize steps that touch the same SAP session, the same output folder, or the same PDF.
3. **No silent retries.** If a tool call times out, or a script exits non-zero, or SAP/WebGUI returns 403/400, or the connection drops, or the result is empty: stop, surface the exact error to the user, and wait. Do not re-run the same command hoping it works the second time, do not loop, do not "fix" it by reinstalling or clearing caches. `capture.js` itself already stops (does not loop) on a failed step or a still-on-logon-page state — respect that and do not wrap it in a shell retry loop.
4. **Scope file access to the current task.** Read only the ABAP source / walkthrough / template files this specific documentation task needs. Do not recursively scan the whole workspace. Never open, grep, or load into context: `node_modules/`, `.git/`, `build/`, `dist/`, `output/`, `logs/`, any `work/*/shots/` beyond the screenshots you must visually QC, recordings, browser profile/cache dirs, or other tasks' `work/<other-task>/` folders. Use one dedicated folder per task named `work/<TCODE>__<VARIANT>/` (or `work/<TCODE>/` if there is no variant), and stay inside it — never write into, overwrite, or read from another transaction's folder. Large tool outputs (full ABAP source dumps, full `dumpDom`/`dumpInputs` JSON, raw script logs) are read for the specific fields needed and summarized — never pasted into the conversation or into `analysis.md`/`document.md` in full.
5. **Keep tool output small.** Don't dump full script stdout/stderr or full DOM/JSON dumps into the conversation — read the exit code and the last few relevant lines, summarize the rest. Never view a screenshot's raw bytes into context beyond what's needed for visual QC; describe/inspect it, don't paste binary or base64 content.
6. **Credentials never touch text you produce.** `SAP_WEBGUI_USER`/`SAP_WEBGUI_PASS` come from environment variables, auto-loaded if needed from the project's existing `.conn_adt` secret file (`scripts/env.js`) — never a value you type or infer. Never echo them, never write them into `work/*/analysis.md`, `work/*/walkthrough.json`, `SESSION_HANDOFF.md`, screenshots, screenshot metadata, log files, or chat output — not even partially. If you ever find a script or file with a literal username/password in it, treat it as a leaked-credential incident: delete the literal value, and tell the user to rotate that SAP password immediately.
7. **No hardcoded transaction/program/variant.** Nothing in `scripts/`, `assets/`, or `references/` may hardcode a specific tcode, program name, variant name, client, or hostname — those are always runtime inputs (user message, `walkthrough.json`, CLI args) so the same skill serves every SAP development, not just one.
8. **Background jobs are a last resort.** Prefer running `capture.js`/`render.js` in the foreground and waiting for completion. If a step genuinely must run in the background (e.g. a long batch capture), do not start another SAP/browser action until that job has finished and its result has been read.
9. **Pass/fail is a technical decision, not a visual impression.** After a critical SAP step (run, save, post, status change), confirm it with the actual evidence: the `readMessage` result in `verifications.json`, the field values in a `dumpInputs`/`dumpDom` snapshot, and/or an explicit on-screen state change — not just "the screenshot looks fine". A screenshot is evidence to attach to the document, never the sole basis for the verification itself.

### Phase 0 — Precheck (mandatory, read-only)

Before touching SAP or generating anything, run:

```bash
node scripts/precheck.js
```

This only *checks*: Node version, that `playwright`/`marked`/`sharp` are resolvable, that a Chromium executable can actually be found on disk (via `scripts/browser-path.js` — Playwright's own build if it truly exists on disk, otherwise a scan of the local Playwright browser cache; it never downloads or installs), and that `SAP_WEBGUI_USER`/`SAP_WEBGUI_PASS` are set (presence only, values are never printed). It performs no installation and no SAP connection. If it exits non-zero, report exactly which check failed and stop — do not attempt to remediate by installing packages/browsers yourself unless the user explicitly asks you to run `npm install` (a manual, one-time, user-approved step, not part of the automated flow).

## Workflow

Follow these phases in order. Do not skip the interview phase.

### Phase 1 — Gather inputs

Minimum required input: **transaction code** (and, if the flow involves a saved selection, the **variant name**). Everything else has a sensible default — ask only for what's genuinely missing or ambiguous:

- ABAP source: resolved automatically from the transaction code via the `sap-adt` skill (Phase 2) — only ask the user to paste/point to source if that resolution fails.
- Program name: derived from the transaction code (Phase 2); ask only if discovery fails.
- WebGUI base URL / system / client: from the project's existing connection configuration (`.conn_adt`) if present; ask only if missing or if the system looks like production (see Phase 3).
- Credentials: `SAP_WEBGUI_USER`/`SAP_WEBGUI_PASS`, auto-loaded from `.conn_adt` if not already in the environment (`scripts/env.js`). Never ask the user to paste a password into chat.
- Customer name + logo file (optional; a `--logo` file wins, otherwise the bundled NTT DATA logo in `assets/ntt-data-logo.png` is used on both the cover and the running page header) and brand accent color (optional; defaults defined in `assets/style.css`).

### Phase 2 — Discover the program and analyze the ABAP source

**Discovery (only needed when the user gave a transaction code, not a program name):** this skill has no ADT client of its own — use the existing **`sap-adt`** skill ([`../sap-adt/SKILL.md`](../sap-adt/SKILL.md)), or `sap-adt-readonly` where that is the installed surface: `adt_search` on the transaction code (or `adt_sql` with `SELECT tcode, pgmna, dypno FROM tstc WHERE tcode = '<TCODE>'`) to get the program name, then `adt_get_source` to fetch its ABAP source. Do this once per task; don't re-resolve a program you already resolved in this session (check `SESSION_HANDOFF.md` first).

Read `references/abap-analysis.md`, then extract from the source:

- Selection screen inventory (PARAMETERS, SELECT-OPTIONS, checkboxes, radio buttons) with technical names, types, obligatory flags, and selection texts → seed for the field table.
- All MESSAGE statements (and message class/numbers) → seed for the error table.
- AUTHORITY-CHECK objects → seed for the prerequisites/roles section.
- ALV field catalog or output structure → seed for the output-interpretation section.
- Main flow (events, top-level forms/methods) → seed for the Mermaid flowchart.

Write the analysis to `work/<TCODE>__<VARIANT>/analysis.md` in the project folder. Mark every item as `[from-code]` — these are drafts, not final content. Keep it to business-relevant seeds (field meaning, message text, output columns, flow) — do not paste raw ABAP source blocks, internal FORM/method names, table technical names, or full field catalogs into this file; extract the meaning, cite the source only as "koddan" if needed for traceability.

### Phase 3 — Interview the consultant (skip only via the default quick trigger with an existing variant)

Ask the consultant (the person running this skill) focused questions. Batch them; do not interrogate one by one. Required topics:

1. What business problem does this program solve, in one or two sentences a department user would say?
2. Who uses it (roles/departments) and how often?
3. **Scenario data**: concrete values for a realistic happy-path run (company code, dates, materials, etc.). These exact values will be typed into WebGUI and shown in screenshots.
4. Optionally a second scenario: the most common error/edge case users hit.
5. For each selection field flagged ambiguous in Phase 2: what should the user actually enter and why?
6. Which system will screenshots come from, and is its data safe to publish to the customer? (Hard stop if production or sensitive.)
7. Support channel: where do users report problems, and what should they attach to a ticket?

Do not proceed to capture until the scenario data is confirmed.

**When the default quick trigger is used** ("`<TCODE>` işlem kodunda `<VARYANT>` varyantı için ... oluştur") **and a real, existing variant is given**, skip this interview: the variant's own stored field values are the scenario (principle 2), so there is nothing to ask about scenario data. Still auto-check system safety (topic 6) from the connection configuration — if the system id/URL looks like production (`PRD`/`PRO`/`P01`-style patterns, or anything the user flags as such), stop and ask before capturing anything. If the program turns out to have no variant, has ambiguous behavior-changing parameters not covered by the variant, or the consultant's business-purpose sentence (topic 1) cannot be derived from the code at all, ask just that one missing thing — never invent it.

### Phase 4 — Capture and annotate screenshots

Read `references/webgui-capture.md` first — WebGUI has quirks (frames, dynamic IDs, keyboard-first navigation), including a dedicated section on selecting an existing variant without altering its values and on the `readMessage` technical-verification step.

1. From the confirmed scenario **or** the named variant, write a walkthrough script as JSON (`work/<TCODE>__<VARIANT>/walkthrough.json`) using the step schema documented in `scripts/capture.js`. When working from a variant: select it (see the variant-catalog steps in `references/webgui-capture.md`) and then only navigate/execute (`press: F8`, `Enter`, etc.) — never add `type` steps that overwrite the variant's own field values. Add a `readMessage` step right after every critical action (run, save, post) so the result is verified from the actual SAP message text, not guessed from the screenshot.
2. Run `node scripts/capture.js work/<TCODE>__<VARIANT>/walkthrough.json work/<TCODE>__<VARIANT>/shots/`. It logs into WebGUI, replays the steps, saves screenshots, `markers.json` (element bounding boxes for annotation), and `verifications.json` (`readMessage` results).
3. Run `node scripts/annotate.js work/<TCODE>__<VARIANT>/shots/` to draw numbered callouts onto the screenshots. The callout numbers must correspond to the numbered steps in the document text — keep them in sync.
4. Review each captured image yourself (view the files) **and** read `verifications.json`. Check: correct screen, correct data (matches the variant/scenario exactly, nothing typed over it), correct language, no sensitive values, no cut-off dialogs, and that any expected system message is actually present in `verifications.json` — not just "the screen looks like it worked". Re-capture anything that is wrong. Never ship a screenshot you have not looked at, and never mark a step Pass based on the screenshot alone.

### Phase 5 — Write the document

1. Read `references/writing-guide.md` for language and tone rules (it is in Turkish because the default output is Turkish).
2. Copy `assets/template.md` to `work/<TCODE>__<VARIANT>/document.md` and fill every placeholder. The template is the contract: keep its section order and its metadata block (now including `variant`). The `title` field is the real functional/business name of the program (from analysis/metadata) — never the literal string "SAP Kullanıcı Dokümanı" and never repeating "Kullanıcı Dokümanı" inside the title itself (the `subtitle` already carries that); if no business name can be established, use the transaction code as `title`. Two sections are conditional: "Hangi Kayıtlar Bu Ekranda Görünür?" and "Ekrandaki İşlemler" are mandatory for interactive transactions / worklist screens (list → detail → action buttons, status transitions) and are deleted for plain display-only reports. Classify every selection field as filter vs. behavior (see `references/abap-analysis.md`); behavior parameters get their own DIKKAT box, never just a table row.
3. **Extract business logic, leave code out.** Everything in `analysis.md` is a `[from-code]` draft: translate it into plain business language for the document. Never carry ABAP-technical detail into `document.md` — no FORM/method names, no internal table/structure names, no message class+number pairs (use the message *text* only), no variable names, no line numbers. If a technical detail has no end-user-relevant translation, drop it rather than including it verbatim.
4. Build the Mermaid flowchart from the user's point of view (enter data → run → check output → handle errors), max ~10 nodes. It describes the business flow, not the code flow.
5. Convert the `[from-code]` message list into the error table: for each message the user can realistically hit, write what it means in business terms and what the user should do. Drop purely internal/technical messages. Cross-check against `verifications.json` — if a message was actually observed during capture, prefer its exact captured text over a guessed one.
6. Present the draft Markdown to the consultant for review before rendering (skip only when the default quick-trigger flow ran without a consultant available — in that case, do not leave any unconfirmed-info placeholder inside document.md; instead omit the statement and list it as still-needs-confirmation in the görev sonu raporu / SESSION_HANDOFF.md "Kalan işler" line).

### Phase 6 — Render the PDF

1. Run `node scripts/render.js work/<TCODE>__<VARIANT>/document.md work/<TCODE>__<VARIANT>/output.pdf --logo <path> --accent <hex>` (logo/accent optional; without `--logo` the bundled NTT DATA logo is used automatically on the cover and every page header). The script locates Chromium the same way `precheck.js` verified (see `scripts/browser-path.js`) — it never installs one. If no usable Chromium is found, or Playwright's expected build revision is present but a different one is actually valid on disk, it fails with a clear message; set `PW_EXECUTABLE=/abs/path/to/chrome` to override (both `render.js` and `capture.js` honor it — see `references/webgui-capture.md`). Do not react to a launch failure by installing or reinstalling — report it.
2. The script converts Markdown to HTML, renders Mermaid diagrams in the page, applies `assets/style.css` (cover page, headers/footers with page numbers, print typography), and prints to PDF via Playwright, using the Chromium build found by `scripts/browser-path.js` (see step 1 — never auto-installed).
3. Open/inspect the PDF **by rendering the pages to images and looking at them** (PyMuPDF: `fitz.open(pdf)[i].get_pixmap(dpi=90)` — no poppler needed), not just extracting text. Check: cover page with logo present, logo in the running header on every page, TOC links valid, diagrams rendered as vector (not blank), Turkish characters correct, images sharp, and no large blank gaps or orphaned headings at page bottoms (screenshots are height-capped in `style.css` to prevent the gaps). Fix and re-render as needed.
4. Deliver the PDF plus the Markdown source (the customer-maintainable master), then update `SESSION_HANDOFF.md` and give the **görev sonu raporu** (see below) — both are mandatory closing steps, not optional.

## Quality checklist (verify before delivering)

- [ ] Every numbered step in the text has a matching numbered callout in a screenshot, and vice versa.
- [ ] Screenshot data matches the documented scenario/variant exactly — nothing was typed over an existing variant's values.
- [ ] Critical steps were verified technically (`verifications.json` message text and/or `dumpInputs`/`dumpDom` field values), not judged from the screenshot alone.
- [ ] Zero technical jargon: no table names, no ABAP terms, no internal FORM/method/message-class-number references, no "dynpro/BAPI/spool" without plain-language substitution (writing guide has the substitution table).
- [ ] Error table covers the messages a user can actually trigger, each with a concrete action; message text matches what was actually observed when available.
- [ ] For interactive transactions: every visible button is documented with its precondition and reversibility, and the implicit visibility rules ("hangi kayıtlar görünür") are stated.
- [ ] Behavior-changing parameters (test/update mode etc.) are called out in DIKKAT boxes, not buried in the field table.
- [ ] Document control block filled: version, date, system, transaction, variant, prepared-by — all dynamic from this run's metadata, and shown only in the cover's two-column corporate info table (and running header/footer), never as raw text in the body or in the İçindekiler/TOC.
- [ ] Cover title is the program's real functional/business name (or the transaction code if none was found) — never the literal string "SAP Kullanıcı Dokümanı", and it does not repeat "Kullanıcı Dokümanı" inside itself.
- [ ] No invented business explanation, support contact, or field meaning — anything unconfirmed is silently omitted from the document (no placeholder/disclaimer sentence of any kind, e.g. no "doğrulanamadı" / "teyit edilmesi önerilir" / "danışmanla kontrol edilmelidir" / "bilgi paylaşılmamıştır"), never guessed; unconfirmed items are reported to the user only outside the document (görev sonu raporu / SESSION_HANDOFF.md).
- [ ] The "images are from the web interface" disclaimer is present if customer users work on desktop SAP GUI.
- [ ] Corporate logo appears on the cover and in the running header of every page.
- [ ] No standalone "Destek" section (see template): destek yönlendirmesi, gerekiyorsa tek cümle olarak ilgili yere gömülür — genel bir dokümana uydurma bir destek kanalı yazma.
- [ ] `SESSION_HANDOFF.md` in `work/<TCODE>__<VARIANT>/` reflects the final state (status = completed, NEXT_ACTION cleared or set to a real follow-up).
- [ ] The end-of-task report (below) was actually given to the user with real paths.

## End-of-task report (mandatory, every task)

At the end of every task — success or a controlled stop — report the exact file paths produced, e.g.:

```
- Analiz: work/ZFI0460__TEST11/analysis.md
- Screenshot klasörü: work/ZFI0460__TEST11/shots/
- Doküman (Markdown): work/ZFI0460__TEST11/document.md
- PDF: work/ZFI0460__TEST11/output.pdf
```

Keep this short (paths only, no content dump). If a phase did not run (e.g. stopped at PRECHECK), report only what actually exists and state clearly which phase it stopped at.

## Continuity across sessions — SESSION_HANDOFF.md

Every task folder `work/<TCODE>__<VARIANT>/` keeps a small `SESSION_HANDOFF.md` — the only mechanism for resuming work across sessions. Never store large logs or tool output here; it is a pointer file, not a journal.

**Format (keep it this short).** The field labels stay Turkish: this file is written next to a Turkish document and read by the consultant, so it is content rather than instruction.

```markdown
# SESSION_HANDOFF — <TCODE> / <VARIANT>

- İşlem kodu: <TCODE>
- Program: <PROGRAM_NAME veya "bilinmiyor">
- Varyant: <VARIANT veya "yok">
- Durum: in-progress | completed | blocked
- Son başarıyla tamamlanan adım: <örn. "Phase 4 — screenshots captured and reviewed">
- NEXT_ACTION: <tek cümle, örn. "Phase 5: document.md yaz">
- Tamamlanan dosyalar: analysis.md, walkthrough.json, shots/ (12 screenshot), document.md
- Kalan işler: <varsa>
- Son hata (varsa): <kısa, tek satır — tam stack trace/log YAZMA>
```

**Rules:**

- **Read it first.** At the start of any task on a `work/<TCODE>__<VARIANT>/` folder that already exists, read `SESSION_HANDOFF.md` before doing anything else. If `Durum: completed`, don't redo the work — ask the user what they want next (a fresh scenario? re-render? nothing to do). If `in-progress`, resume from `NEXT_ACTION` — do not repeat already-completed phases.
- **Write it after every phase**, not just at the end — a phase boundary is the natural place to persist progress in case the session ends here.
- **Never write credentials, full logs, full ABAP source, or full tool output into it** — only the short pointers listed above.
- **One handoff file per task folder** — never merge two transactions' progress into the same file.

## Dependencies

Node 18+, with `playwright`, `marked`, `sharp` already installed (`npm install` in the skill root — a manual, one-time, user-approved step; not something to run automatically as part of a documentation task) and a Chromium build already present on the machine. This skill assumes both are already in place and never installs either at runtime — run `node scripts/precheck.js` to verify before doing anything else. `SAP_WEBGUI_USER` / `SAP_WEBGUI_PASS` come from environment variables, auto-loaded from the project's existing `.conn_adt` secret file if not already set (`scripts/env.js`) — never pasted into chat or written to any file. If precheck reports no usable Chromium, or a mismatched/corrupted build revision is present, point both `capture.js` and `render.js` at an existing binary with `PW_EXECUTABLE=/abs/path/to/chrome-win64/chrome.exe` (prefer a full `chrome`/`chromium` build over a `chromium_headless_shell` — the headless shell cannot print the header/footer templates). Never resolve a missing/broken browser by running an install command. Program/source discovery from a transaction code depends on the `sap-adt` skill (or `sap-adt-readonly`) being available; this skill does not duplicate an ADT client.

**One-time machine setup.** `npm install` (in this skill folder) and a Chromium build are a per-machine prerequisite, declared in `profiles/catalog-meta.yaml` under `needs_machine_bootstrap` so the installer prints the command rather than leaving it to be discovered from a failed run. It is never run automatically, and never mid-task.

## Bundled resources

- `assets/template.md` — document skeleton with placeholders (Turkish), including a `variant` metadata field and explicit guidance on deriving a dynamic cover title.
- `assets/style.css` — print stylesheet: cover, header/footer, typography, tables, callouts. Screenshots are height-capped here to avoid large blank gaps.
- `assets/ntt-data-logo.png` — corporate logo, default for the cover and running header.
- `scripts/precheck.js` — Phase 0 read-only diagnostic (skill files/Node/deps/browser/connection presence); installs nothing.
- `scripts/browser-path.js` — locates an already-installed Chromium executable; never installs one.
- `scripts/env.js` — loads `SAP_WEBGUI_USER`/`SAP_WEBGUI_PASS` from the project's existing `.conn_adt` if not already set; never logs values.
- `scripts/capture.js` — WebGUI walkthrough runner (Playwright); produces screenshots, `markers.json`, and `verifications.json` (technical message-bar checks via `readMessage`).
- `scripts/annotate.js` — draws numbered callouts on screenshots (sharp + SVG overlay).
- `scripts/render.js` — Markdown → HTML → PDF pipeline (marked + Mermaid + Playwright); strips YAML front-matter out of the body/TOC and resolves the cover title dynamically (real business name → transaction code fallback, never a hardcoded generic title).
- `references/writing-guide.md` — Turkish end-user language rules and jargon substitution table.
- `references/abap-analysis.md` — what to extract from the source and how to turn it into doc seeds (business logic only, no raw code into the final document).
- `references/webgui-capture.md` — WebGUI navigation quirks, keyboard map, variant selection, `readMessage` verification, troubleshooting.
