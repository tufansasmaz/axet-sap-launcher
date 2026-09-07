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
design — settled statements of what will be configured and built — not "X explained
that Y asked whether".

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

## Step 5 — Build the note

One `.docx`, written with `python-docx`, reading as a to-be process design document:

- **No title page, no participant/date table, no headers/footers.** A bold title line
  (`<Client> – <Module> Workshop <N> – Process Design & Meeting Notes`) and a one-line
  scope sentence at the top.
- **Body = topic blocks.** Each block is one paragraph object: a **bold** short topic
  heading, `add_break()`, then one or more **non-bold** flowing sentences — third
  person, declarative, present/future tense, describing the agreed design
  ("Purchasing groups are defined in…", "Approval workflows will be managed in…").
  Strip all conversational framing into settled statements.
- **Group by topic**, never by chronology or speaker. Merge every source's
  contribution to a topic into one coherent paragraph — a question raised and answered
  purely in chat, or a caveat noted only by the consultant, is folded in exactly as if
  it had been said out loud, rewritten into the same declarative voice.
- Use `doc.add_paragraph(text, style='List Paragraph')` for enumerated
  deliverables/outputs of a process step, enumerated fields/characteristics/codes that
  surfaced in chat or notes, and the two closing sections.
- **Two closing sections, always separate, never mixed:**
  - *Development Decisions* — what was actually agreed (the summary's Decisions block,
    transcript/chat decisions, resolved action-item rows). Phrased as settled
    statements of what will be built or configured.
  - *Open Items and Next Steps* — unresolved items (Open Questions blocks, pending
    action-item rows, and any Step-4 contradictions). Phrased as forward-looking tasks
    or questions.

  Never duplicate an item in both. Classify an ambiguous action-item row by its actual
  outcome.
- Skip small talk, greetings, thank-you/bye exchanges and screen-demo narration unless
  it constitutes a decision or an open item.
- Tone: neutral, factual, no first person, no dialogue verbs (said/asked/explained/
  confirmed).

Write the file with `open(path, 'w', encoding='utf-8')` inside a script — never
`python -c "print(...)"`, which crashes on Turkish characters under a cp1252 console.

## Step 6 — Interface / custom-development tagging (project convention, opt-in)

Some projects tag every system-to-system interface in the notes with `INT00x` and
every custom development (custom screen, enhancement, custom report or form,
conversion) with `WRICEF00x`, numbered **project-wide across all modules and
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

Concise: output path, the output language used, which source roles were detected among
the input files, and — when Step 6 applied — which new INT/WRICEF IDs were assigned.
Do **not** paste the document contents into the chat.

## Gotchas learned from prior runs

- `python -c "print(...)"` piped through the shell crashes on Turkish characters
  (İ/ı/ğ/ş/ö/ü/ç) under cp1252. Always write to a file with
  `open(path, 'w', encoding='utf-8')` from inside the script.
- Don't add participant tables, dates, or headers/footers unless a source document
  contains something the user explicitly wants preserved.
- Teams recap ≠ Copilot summary. Two files, two contents, both full sources.
- Asked later for another language version of an already-generated note: regenerate the
  same structure translated. The structural rules above are language-independent.
- Customer names, system IDs and project-specific conventions belong in that customer's
  `project-kb` brief, not in this skill and not hardcoded into a run.

## Related

- **office-docx** (`office-tools`) converts Markdown → Word with heading styles. This
  skill deliberately does not use it: the note's format is bold-heading + line break +
  non-bold prose inside a *single* paragraph object, which is not a Markdown heading.
- **project-kb** carries the customer's naming standard, module scope and conventions.
