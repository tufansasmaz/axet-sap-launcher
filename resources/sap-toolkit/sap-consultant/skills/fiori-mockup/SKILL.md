---
name: fiori-mockup
description: >
  Use when a FIORI screen has to be AGREED before anyone builds it: an FS needs its screen section for a
  Fiori elements app (List Report, Object Page), a customer asks what the app will look like, or a RAP
  developer wants layout and annotations settled before the CDS. Produces a clickable HTML mock-up in a
  Horizon-like style at desktop AND phone width, plus a hand-over: which fields are editable, required or
  calculated, and which @UI / RAP annotation drives each part. No SAP connection; one .html file plus
  pictures (desktop, phone, annotated) for the FS.
  Triggers (TR/EN): "fiori maketi", "fiori ekran tasarimi", "list report", "object page", "fiori elements",
  "fiori mockup", "fiori screen design", "fiori app layout".
  NOT for a Dynpro or selection screen (screen-mockup draws SAP GUI), NOT for building the app (UI5, RAP:
  sap-adt), NOT for the FS itself (fs-generator).
author: "NTT DATA"
---

# fiori-mockup — the Fiori screen, agreed on paper, before it costs anything

A screen is the cheapest thing to argue about and the most expensive thing to rebuild. On S/4HANA Public
Cloud and strict Clean Core projects there is no Dynpro: the screen **is** a Fiori app, and a Fiori elements
app is generated from annotations. So this skill hands over two things: a picture the customer can point at,
and the list of annotations a RAP developer needs to make that picture real.

**It connects to no system and writes no code.** One `.html` file comes out, and pictures of every screen and
dialog (desktop, phone and annotated) for the FS. The sibling **`screen-mockup`** does the same for classic
SAP GUI; pick by the target, not by habit.

---

## 1 · Read the description, then say what you understood

Before drawing anything, write back what you extracted, briefly and factually:

- the **app pattern**: List Report (a searchable list that opens an object), Object Page (one object with
  header, sections and edit), a dialog, or a combination — and which entity each screen shows
- the **workflow**: what the user is trying to finish, and in what order
- the **fields**: name, type, and for each one whether it is editable, read-only, **required**, calculated,
  or filled by the system
- the **actions**: on the list (Create, Delete, custom), in the header, in the footer — and what each does
- **phone**: which columns and sections matter on a phone (the rest are marked low priority)

Then name what you are guessing. "Manage requisitions" does not say whether items are a table on the object
page or a second app. **Ask before drawing, not after.** Do not invent a business rule to fill a gap: an
unanswered rule becomes a question in section 5 of the hand-over.

## 2 · Draw it in the kit's style

**Start from `assets/skeleton.html`, never from an empty file.** The look lives in `assets/fiori.css`, the
shared behaviour in `assets/fiori.js`; the page carries the markers `<!-- @fiori:css -->` and
`<!-- @fiori:js -->` and `scripts/mockup.py` puts them in. Write only content: the screens, the fields, the
rows, the rules. **Do not write a `<style>` block, do not restyle the kit's classes, do not load UI5 or any CDN.**
The mock-up says in its header that it is Fiori-style and not the rendered app; do not claim more.

What the markup must carry:

- every screen `<div class="app" data-state="1" data-label="List Report">`, every dialog
  `<div class="dlg" data-state="2a" data-label="Value help" data-base="2" id="dlgVH">` — the screen list and the
  pictures are built from these;
- `window.MOCKUP_PREPARE` — how each state is reached the way a user would (`'2': () => openObj('1')`), so the
  picture of the object page shows a real object and the picture of a dialog shows it over a filled page;
- `data-ann="@UI.lineItem"` and friends on the part each annotation drives (section 4);
- the columns and sections that are **not** needed on a phone marked `class="low"`;
- fields that become editable in edit mode: `data-editable readonly`; edit-only parts `class="edit-only"`.

Helpers from the kit: `goScreen(id)`, `openDlg(id)`, `closeDlg()`, `msg(barId, 's'|'w'|'e'|'i', text)`,
`toast(text)`, `setEdit(appId, bool)`, `showSection(appId, sectionId)`, `selectRow(tr)`.

| | |
|---|---|
| **Look** | Horizon-like: light grey page, white cards with soft borders and rounded corners, blue emphasised button, status as a coloured dot plus word |
| **List Report** | page title and variant, filter bar (fields, Adapt Filters, **Go**), table card with a title and its count, toolbar actions, status column, row arrow |
| **Object Page** | header (title, subtitle, status, key facts, actions), anchor bar, sections as cards, footer toolbar with **Save / Cancel** in edit mode |
| **Messages** | message strip on the page (success, warning, error, information), toast for a quick confirmation, dialog for a decision |
| **Phone** | the same markup narrower: filter fields stack, `.low` columns disappear, form groups stack, dialogs go nearly full width |

### The controls, as a checklist

Go through this list against the description rather than reaching for whatever comes to mind.

| | |
|---|---|
| Entry | text, numeric (right-aligned, unit beside it), date, **read-only** |
| Choice | select, checkbox, radio group, switch |
| Lookup | **value help** (button on the field; a dialog with a table) |
| Action | toolbar buttons (Create, Delete, custom), header actions, footer Save / Cancel, one emphasised button per area |
| Data | table with a status column, number with unit, link |
| Structure | anchor bar with sections — only when the object page genuinely has several |

For every field say which kind it is: editable, read-only, required, calculated, or filled by the system. That
list is section 3 of the hand-over, so collect it as you draw.

### One screen or several

Draw **all the screens of the process, in order, in the same file**: the list, the object page it opens, the
dialogs. Make the navigation work where it is cheap (the row opens the object page, Edit shows the footer). A
flow whose steps only exist as separate pictures hides the question worth asking — what the user carries from
one screen to the next.

## 3 · Finish it, photograph it, hand over the paths

Write `fiori-maketi-<subject>.src.html` into the project folder, then:

```bash
py <SCRIPTS>/mockup.py fiori-maketi-<subject>.src.html
```

It writes `fiori-maketi-<subject>.html` — one self-contained file — and three pictures per screen and dialog:
`-desktop.png`, `-phone.png` (the same screen at phone width, which is what a Fiori review is about) and
`-annot.png` (desktop with the annotation badges). It prints the Markdown image lines for the FS.

**The pictures belong in the FS, and in the TS.** Hand `fs-generator` the image lines for the screen section,
the desktop picture of each screen first, the phone and annotated ones beside it, each followed by a sentence
on what the screen is for; keep the `.html` path beside them for the clickable version. `ts-generator` reuses
them (`--fs-dir` pointed at its output folder).

Screenshots use Playwright with Playwright's Chromium, or the Chrome or Edge already on the machine. Without
any of them the `.html` is still written and the script prints the install line; say so rather than leaving
the FS without pictures silently.

**Do not print copy-and-paste instructions** — the agent has a file system.

## 4 · The annotation hand-over

Fiori elements builds the screen from annotations, so the useful hand-over is *which annotation produces which
part of the picture*. Put `data-ann` on the part (keep it short — it is printed on the picture) and write the
table in the hand-over, filled with the field names **from the FS** (a name that is not in the FS is a
question, not a guess):

| Part of the picture | Annotation / RAP behaviour |
|---|---|
| Filter bar field | `@UI.selectionField: [{position: n}]` |
| Table column | `@UI.lineItem: [{position: n, importance: #HIGH \| #MEDIUM \| #LOW}]` — `#LOW` is what hides on a phone (`class="low"`) |
| Status colour in a column | `criticality` in `@UI.lineItem` / `@UI.dataPoint` |
| Action button on the list or header | `@UI.lineItem` / `@UI.identification: [{type: #FOR_ACTION, dataAction: '…', label: '…'}]` + the action in the behaviour definition |
| Header title and subtitle | `@UI.headerInfo: {typeName, typeNamePlural, title, description}` |
| Header key facts | `@UI.dataPoint` + a header facet |
| Anchor bar section | `@UI.facet: [{type: #COLLECTION \| #IDENTIFICATION_REFERENCE \| #LINEITEM_REFERENCE, label, position}]` |
| Field group in a section | `@UI.fieldGroup: [{qualifier, position}]` |
| Required / read-only field | behaviour definition `field ( mandatory )` / `field ( readonly )`; `@Common.FieldControl` for a static case |
| Value help | `@Consumption.valueHelpDefinition: [{entity: {name, element}}]` |
| Edit / display, Save / Cancel | draft-enabled BO (`with draft`) |
| Create / Delete on the list | behaviour definition `create; delete;` |

**These names come from general Fiori elements and RAP knowledge, not from the customer's system.** Say so in
the hand-over, and check them against the release the customer runs before a developer relies on them.

## 5 · Say what you built and what you are unsure about

After the file, five short sections, **headings in the document's language** (the FS's; else the person's):

| English | Turkish |
|---|---|
| What I understood | Ne anladım |
| What is on the screen | Ekranda ne var |
| Which field is what | Hangi alan ne |
| Annotations | Anotasyonlar |
| What we need to clarify | Neyi netleştirmemiz lazım |

1. **What I understood** — the pattern, the workflow, the assumed goals, in a few lines
2. **What is on the screen** — the sections, what each action does, and for several screens the order
3. **Which field is what** — editable / read-only / required / calculated, as a table
4. **Annotations** — the table of section 4
5. **What we need to clarify** — the specific questions, each naming the field or rule it is about

The last one earns the skill its place. "Some rules are unclear" is not a question; **"When the quantity
changes, is the amount calculated, or does the user enter it?"** is.

## 6 · Boundaries

- **A mock-up is not a specification.** It shows the layout; the rules behind it live in the FS.
- **Nothing here reaches SAP.** No connection, no transport, no object. When the layout is agreed, the Fiori
  elements app comes from the CDS annotations and the RAP BO (`sap-adt`, and the UI5 and CAP packs listed in
  `sap-ecosystem`).
- **Fiori-style, not pixel-exact Horizon.** The kit approximates the look for agreement. Do not use it to
  argue about a pixel.
- **Patterns outside this version:** Worklist, Overview Page, Analytical List Page, Flexible Column Layout,
  charts, Launchpad design. Say that it is not covered and draw the nearest pattern as a *sketch* if the person
  agrees; never present it as the real thing.
- **Do not invent business rules** to fill a gap; it goes in section 5 as a question.
- **No customer data.** Fill the mock-up with obviously fake values. It travels by e-mail and lands in decks.
- **The language of the mock-up's own texts** (buttons, labels, messages) is the document's language; the
  frame (Desktop / Phone / Annotations) is English.

### Before you hand it over

- The main workflow is obvious in five seconds, on desktop **and** on the phone picture.
- The emphasised button is the primary action, and there is only one per area.
- Editable, read-only and required fields look different.
- Every part that carries an annotation is in the table; every missing rule is a question.
