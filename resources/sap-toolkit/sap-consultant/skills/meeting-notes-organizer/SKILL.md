---
name: meeting-notes-organizer
description: >
  Turn the loose bag of files a workshop or design session leaves behind — a Teams
  transcript, a chat-panel export, an auto-generated recap or Copilot summary, the
  consultant's own scribbles — into ONE formatted meeting note in Word, written as a
  to-be process design document rather than a transcript summary. Built for
  Activate-methodology S/4HANA Explore-phase workshops (any module: MM, SD, PP, FI,
  CO, QM, PM, TRM, EWM, CM) and works for any multi-source meeting. Output language
  is always asked, never inferred. Use when the user says "toplantı notu",
  "workshop notes", "meeting note", "transkripti nota çevir", or hands over session
  files and asks for a consolidated note. Files in, file out — touches no system.
allowed-tools: Bash(python:*), Bash(py:*), Bash(pip:*), Read, Write, Glob
---

# meeting-notes-organizer — workshop sources → one process design note

The consultant leaves a workshop with between one and five files that overlap,
contradict each other in places, and are named unreliably. This produces the single
document the project actually keeps.

**What it is not:** a transcript summariser. The output reads like a to-be process
design — settled statements of what was **decided** — not "X explained that Y asked
whether". What was only floated, asked or left to be checked stays that way
(Step 4b): a note that makes the workshop sound more settled than it was is worse
than a rough one.

## Step 0 — Entry point: ask for the documents

If this skill is triggered with **no source files attached yet**, do nothing else.
Reply only with a short request for the session's documents: any of the raw
transcript, a chat export, an auto-generated recap/summary (Copilot or Teams), and/or
the consultant's own notes; **1 to 5 files is fine**; roles are auto-detected so
nothing needs labelling. Then wait. Do not ask about output language yet, and
generate nothing until at least one document has actually arrived.

## Step 1 — Extract every file

Run the bundled extractor. Do **not** hand-write a throwaway extraction script — that
is where the Turkish-character encoding bugs and the dropped bold/table information
come from.

```bash
py <skill>/scripts/extract_sources.py --out .tmp/extracted.json <file1> <file2> ...
```

Handles `.docx` (paragraphs with style + whole-paragraph bold flag, plus tables),
`.xlsx` (every sheet), and `.txt` / `.md` / `.csv`. It writes one UTF-8 JSON bundle
and prints an ASCII-only summary; the document text never goes through the console.
Read the JSON, then delete it once the note is produced.

Each entry carries a `signals` block — paragraph count, table count, bold-paragraph
count, duration-timestamp count, `bold_heading_followed_by_timestamp`, chat-timestamp
count, `recap_helpful_line`, and the section headers found. Those are inputs to Step 2,
not a verdict: the extractor never classifies.

Every `.docx` entry also carries `images`: how many pictures the file holds and the
paragraph each follows (a weighbridge slip, a screenshot, a table pasted as a picture).
**Nothing reads a picture.** Whatever they hold is missing from the note, so the note
says they exist (Step 4b, rule 6) rather than letting that loss pass unseen.

Dependencies: `python-docx`, `openpyxl` (`plugins/sap-consultant/requirements.txt`).

## Step 2 — Classify each file by CONTENT, not filename

File names lie (typos, `notlar` vs `notes` vs `chates`, mixed TR/EN). Apply these
signatures in this order of distinctiveness:

| role | what it looks like | leading signals |
|---|---|---|
| `raw_transcript` | long; a repeating 3-paragraph cadence — `Speaker Name` alone → a duration paragraph (`0 dakika 4 saniye0:04`, `2:59:04`) → the spoken sentence. Hundreds of paragraphs, filler, often bilingual mid-sentence | very high `paragraphs`, high `duration_timestamps`, low `avg_paragraph_chars` |
| `chat_export` | short-to-medium; alternates a `Person Name (Company)Dün HH:MM` / `Yesterday H:MM PM` line (sometimes `Çevir`/`Translate`) with the typed message. No seconds-level durations | `chat_timestamps` high, `duration_timestamps` ~0 |
| `teams_native_recap` | bold topic heading immediately followed by a timestamp, a "Bu notlar yararlı oldu mu?" / "Was this recap helpful?" UI artifact, and a **bulleted** `Takip görevleri` / `Follow-up tasks` section (no table) | `bold_heading_followed_by_timestamp` > 0, `recap_helpful_line` true, `tables` 0 |
| `copilot_meeting_summary` | opens with bold `Kararlar`/`Decisions`, `Açık sorular`/`Open questions`, `Ajanda`/`Agenda`, then bold topic headings with one-line bullets, closing with an actual **table** of action items | `section_headers` includes Decisions/Open questions, `tables` ≥ 1 |
| `consultant_freeform_note` | matches none of the above — free prose, bullets, or a sheet with topic/decision/comment columns | the safe default |

If one file plausibly matches two, prefer the more specific signal (**table → copilot**;
**timestamp + helpful-line → teams recap**) over the generic fallback. Ask the user
about a file **only** if it is empty, corrupted or unreadable — never merely because
classification is ambiguous. Make the call and proceed.

**A Teams-native recap and a Copilot summary are two different files with different
content.** Never discard the second one found as a duplicate of the first.

## Step 3 — Ask the output language, every single time

Whatever language the sources are in, explicitly ask which language the note should be
written in (phrase the question in the language the user is currently chatting in).
Wait for the answer, then produce the **entire** document — headings, prose, bullets,
section titles — in exactly that language. Never default, never infer from the
transcript.

## Step 4 — Weight every source equally

Do not rank transcript above summary above consultant note, or the reverse. When
building each topic paragraph, pull corroborating and complementary detail from every
source that touched that topic — spoken content, chat exchanges, recap bullets,
Copilot bullets, the consultant's own remarks.

If two sources genuinely **contradict** each other on a fact (not merely differ in
detail), do not silently pick a winner. Surface it as its own line under *Open Items
and Next Steps* — "Conflicting information on \<topic>: \<source A> states X while
\<source B> states Y — needs clarification" — and do not also assert either version as
settled fact in the topic paragraph.

## Step 4b — Fidelity to the sources (read before writing any statement)

Run on a real workshop (2026-10-26): a decisions table full of standard SAP choices
labelled as developments, a customer name "corrected" to a common word in every
paragraph, "may be done" turned into "will be done", a vendor-warehouse remark turned
into a technical term the speaker never used. Every rule below answers one of those.

1. **Keep the statement's type.** Each thing a source says is one of: *current state*
   ("today the weighbridge posts nothing to the system"), *decision*, *proposal or
   tentative* ("could be done", "to be evaluated", "to be confirmed"), *open question*,
   *information*. Write it in the voice of its type. Current state stays about today
   and is never turned into a decision; a tentative statement keeps its modality
   ("yapılabilir", "değerlendirilecek", "teyit edilecek") and goes to *Açık Konular*,
   never to the decisions table; only what a source states as agreed — or what a
   `Karar`/`Decision` block, a resolved action item or explicit agreement shows — is a
   decision. Words like *should*, *must*, *we are not going to* are decisions;
   *can*, *may*, *might*, *consider* are not. A customizing or master-data value someone
   mentions is *information*, not an open item, unless a source says it must change.
2. **Names are copied, not corrected.** Customer, project, company, person, product and
   system names keep the spelling, case and diacritics the sources use — even when the
   spelling looks like a typo or is also a common word ("Güres" never becomes
   "Güreş"). When the sources spell one name two ways, use the more frequent one and say
   so in *Açık Konular*.
3. **No term the sources did not use.** Add no SAP term, transaction, movement type,
   abbreviation or technical interpretation a source does not state. Use the speaker's
   own words ("satıcı deposu", not a guessed SAP concept — a subcontractor's stock and a
   consignment stock are opposites). An abbreviation you cannot read ("MGFG") is copied as
   written and listed in *Açık Konular* as "Kısaltma teyit edilecek: MGFG", never expanded.
4. **No invented commitments or sequence.** Do not write that something "will be
   redesigned", "is in scope", or happens "before"/"after" another step unless a source
   says so.
5. **Cite the source.** Every decision, development need and open item ends with where it
   came from: the file and, where the file has one, the heading or section it sits under,
   as written there ("Kaynak: 15.10 Toplantı Notları · Mal giriş hareketleri"). A transcript
   or chat without sections is cited by file name alone.
6. **Say what you could not read.** For every source with `images`, the note's *Kaynaklar*
   line (or, when there is no künye, an *Açık Konular* row) states that the file holds
   N pictures that were not read and, from `images.items[].after`, which part of the file
   they follow.

## Step 5 — Build the note

Write the note as **Markdown**, then render it with **office-docx** — the kit's
house look (NTT mark in the header, A4, Segoe UI, real heading styles, page
numbers), the same as every FS, TS and BBP. The note must read calm: airy, easy on
the eye, nothing that fills the page for its own sake.

```bash
py <office-tools>/skills/office-docx/scripts/build_docx.py --input note.md --output "<name>.docx" \
   --eyebrow "TOPLANTI NOTU" --title "<Client> – <Module> Atölye <N> – <Konu>" --toc off
```

In an English note use `--eyebrow "MEETING NOTE"` and `--lang en` (the footer's page word
then reads `Page`, not `Sayfa`).

Do not put a `#` title line in the Markdown: `--title` sets it (a second one
would print twice).

Shape, in this order:

1. **Künye** — one callout (`>` lines), only lines whose value a source gives:
   `**Tarih:**`, `**Katılımcılar:**` (names; a role or company only where a source
   states it), `**Kaynaklar:**` (the kinds of input, e.g. "Teams transkripti,
   sohbet dökümü"; plus "N görsel okunamadı" per file that holds pictures, Step 4b
   rule 6). Never invent a date or a role; a line with no source is left out, not filled
   with "—".
2. **Scope** — one plain sentence: what the meeting covered.
3. **Topic blocks** — `## <short topic>` then one or more flowing paragraphs —
   third person, declarative, describing the design as the sources settled it
   ("Satınalma grupları … tanımlanır", "Onay iş akışı … yönetilecek"). Strip the
   conversational framing, **not the statement's type**: a current-state remark stays
   about today, a tentative one stays tentative (Step 4b, rule 1).
   - **Group by topic**, never by chronology or speaker. Merge every source's
     contribution to a topic into one coherent paragraph — a question raised and
     answered purely in chat, or a caveat noted only by the consultant, is folded
     in exactly as if it had been said out loud.
   - Use `- ` bullets for enumerations inside a topic (fields, outputs,
     report contents) — short items, no full sentences where a noun will do.
   - Keep paragraphs short (3–5 sentences); split a long one at its natural seam
     rather than letting a block run half a page.
4. **`## Tasarım Kararları`** (English *Design Decisions*) — a table, one decision per
   row: `| No | Karar | İlgili | Kaynak |` — `K1, K2…`; the decision as one sentence
   in the voice the source used (Step 4b). Only what a source settled belongs here:
   standard-SAP process choices, configuration, organisation and master-data rules are
   *design* decisions. They are **not** developments — the old heading
   "Geliştirme Kararları" made a reader think so. `İlgili` names the topic or the
   development it belongs to.
   - **`## Geliştirme İhtiyaçları`** (English *Development Needs*) — a second table, **only
     when a source names a custom development** (a custom report, enhancement, form,
     interface, conversion or workflow, or says "geliştirme"): `| No | İhtiyaç | İlgili | Kaynak |` —
     `G1, G2…`. A development the sources only consider ("geliştirme olabilir") is
     written as a candidate in the *İhtiyaç* cell ("… geliştirmesi değerlendirilecek") —
     never as settled. With no such item the table and its heading are left out.
5. **`## Açık Konular ve Sonraki Adımlar`** — a table:
   `| No | Konu | Sorumlu | Kaynak |` — `A1, A2…`; the item as a forward-looking task or
   question; the owner as the sources name them (blank when none does — never guessed);
   everything tentative from Step 4b lands here. Add a `Hedef` column **only when
   at least one item has a date in the sources**; an all-empty column is noise.
   A contradiction from Step 4 starts with **Çelişki:** in the Konu cell —
   "Çelişki – <konu>: <kaynak A> X derken <kaynak B> Y diyor; netleştirilmeli".
   - Decisions, development needs and open items are **never duplicated** across the
     tables. Classify an ambiguous action-item row by its actual outcome.

Skip small talk, greetings, thank-you/bye exchanges and screen-demo narration
unless it constitutes a decision or an open item. Tone: neutral, factual, no first
person, no dialogue verbs (said/asked/explained/confirmed).

Write the Markdown with `open(path, 'w', encoding='utf-8')` inside a script —
never `python -c "print(...)"`, which crashes on Turkish characters under a cp1252
console. The Markdown is an intermediate: keep it beside the sources only if the
project keeps sources that way, otherwise delete it after rendering.

## Step 5b — Check the note against the sources

Before rendering, run the checker on the Markdown you wrote. It does what a prompt rule
cannot promise: puts a name back to the source's spelling when the draft changed it only by
diacritics ("Güreş" → "Güres"), and lists the abbreviations and SAP words the note uses that
no source contains.

```bash
py <skill>/scripts/note_fidelity.py --extracted .tmp/extracted.json --note note.md --fix
```

Read its list: each *term not in the sources* is removed or replaced by the source's own
words (Step 4b, rule 3) — unless a source does contain it in another spelling. Then render.

## Step 6 — Interface / custom-development tagging (project convention, opt-in)

Some projects tag every system-to-system interface in the notes with `INT00x` and
every custom development (custom screen, enhancement, custom report or form,
conversion — the rows of *Geliştirme İhtiyaçları*, not the design decisions) with `WRICEF00x`, numbered **project-wide across all modules and
workshops**. This skill never invents that convention and never hardcodes a customer's
numbering.

Adopt it only when one of these is true:

1. A registry file already exists in the project's notes folder —
   `_Integration_WRICEF_Registry.md` (or the equivalent the project already uses).
   Search the folder and its parent before deciding.
2. The project's brief says so. If a `project-kb` skill is installed for this customer,
   its `SKILL.md` is where the customer's own naming and tagging convention lives —
   read it rather than guessing.
3. The user explicitly asks to start the convention here.

When it applies:

- Create the registry if missing — a markdown table `ID | Type | Short Description |
  Module | Workshop | Date` — and start at `INT001` / `WRICEF001`.
- **Before minting a new ID, search the registry** for an existing entry describing the
  same interface or development; the same one resurfaces in later workshops and must
  reuse its ID.
- After generating the note, append every newly tagged item so the next run continues
  the sequence.
- Notes written before the convention started are untagged. Do not retroactively edit
  them unless asked.

Otherwise just name the artifact in plain text.

## Step 7 — Output naming and location

**Follow the project folder's own precedent when one exists** — look at the sibling
`.docx` files next to the sources and keep their pattern, including the subfolder
layout. With no precedent, default to:

```
<Client> <Module> Workshop <N> - Meeting Notes.docx
```

saved next to the source files, and adopt whatever pattern the user confirms for
later runs on that project.

## Step 8 — Report back

Concise; the document contents are **not** pasted into the chat. Say: the output path,
the output language used, which source roles were detected, and — when Step 6 applied —
which new INT/WRICEF IDs were assigned. Then the **fidelity report**, short, because it is
what the consultant checks before sending the note on:

- how many design decisions, development needs and open items the note holds;
- statements the sources left tentative, and that were therefore put under *Açık Konular*
  instead of the decisions table (count, and the first two as examples);
- what `note_fidelity.py` changed (names put back) and what it listed (terms not in the
  sources) and how each was handled;
- pictures that were not read: file, how many, which part they follow;
- abbreviations copied as written and awaiting confirmation;
- open items with no owner (count).

## Gotchas learned from prior runs

- `python -c "print(...)"` piped through the shell crashes on Turkish characters
  (İ/ı/ğ/ş/ö/ü/ç) under cp1252. Always write to a file with
  `open(path, 'w', encoding='utf-8')` from inside the script.
- The künye carries only what a source states. A missing date or role is left
  out, never guessed — a wrong date on minutes is worse than none.
- 2026-10-26, first real consultant review of a Turkish MM workshop: a decisions table headed
  "Geliştirme Kararları" held only standard SAP and organisational choices; the customer
  "Güres" became "Güreş" everywhere; "kalem çoklaması yapılabilir" became "yapılacak";
  "satıcı deposu" became "konsinyasyon". Step 4b, the new table headings and
  `note_fidelity.py` came out of it. A prompt rule alone would not have stopped the name
  change, which is why the checker is code.
- Teams recap ≠ Copilot summary. Two files, two contents, both full sources.
- Asked later for another language version of an already-generated note: regenerate the
  same structure translated. The structural rules above are language-independent.
- Customer names, system IDs and project-specific conventions belong in that customer's
  `project-kb` brief, not in this skill and not hardcoded into a run.

## Related

- **office-docx** (`office-tools`) renders the note: Markdown → Word in the house
  theme. The same Markdown can go through **office-pdf** for a PDF edition.
- **project-kb** carries the customer's naming standard, module scope and conventions.
