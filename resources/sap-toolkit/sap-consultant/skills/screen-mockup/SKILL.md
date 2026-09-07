---
name: screen-mockup
description: >
  Use when a screen has to be AGREED before anyone builds it — an FS needs its
  "Girdi / Çıktı ve Ekran Tasarımı" section, a customer asks "what will it look
  like", or a developer wants the layout settled before touching SE51. Produces a
  clickable HTML mock-up in classic SAP GUI style (header, toolbar, status bar,
  bordered group boxes, ALV-like grid, bottom action buttons), plus a written note
  on which fields are editable, required or calculated and what each button does.
  Touches no SAP system; the output is one .html file.
  Triggers in Turkish or English: "ekran tasarımı", "ekran taslağı", "ekranı bir
  çizelim", "nasıl görünecek", "seçim ekranı", "ALV ekranı", "maket", "mockup",
  "screen design", "screen draft", "selection screen".
  NOT for building the real thing: a Dynpro, GUI status and titlebar on a live
  system is screen-gen. NOT for an Adobe form (adobe-gen), and NOT for writing the
  FS itself (fs-generator) — this fills one section of it.
author: "Beyhan Meyrali <beyhan.meyrali@nttdata.com>"
---

# screen-mockup — the screen, agreed on paper, before it costs anything

A screen is the cheapest thing to argue about and the most expensive thing to
rebuild. This skill produces the artefact that moves the argument earlier: a
working HTML mock-up in classic SAP GUI dress that a functional consultant, a
customer and a developer can all look at and point to.

**It connects to no system and writes no ABAP.** One `.html` file comes out.
When the layout is settled, **`screen-gen`** builds the real Dynpro.

---

## 1 · Read the description, then say what you understood

Before drawing anything, write back what you extracted — briefly, factually:

- the **workflow**: what the user is trying to finish, and in what order
- the **fields**: name, type, and for each one whether it is editable, read-only,
  **required**, calculated, or filled by the system
- the **controls**: buttons, value helps, tabs, the grid
- the **actions**: what each button does, and what Enter does

Then name what you are guessing. A requirement that says "material entry screen"
does not say whether the material is one field or a multi-line grid, and building
the wrong one wastes the review. **Ask before drawing, not after.**

## 2 · Draw it in the house style

Classic enterprise ERP, not a modern web dashboard. The style is a deliberate
choice: the mock-up has to look like the thing that will actually be built, or
the customer approves a screen they will never get.

| | |
|---|---|
| **Layout** | title header → toolbar → status/message bar → framed group boxes → ALV-like grid → action buttons at the bottom |
| **Density** | compact and operational. Aligned labels, grid-placed fields, visible borders |
| **Colours** | SAP's light blue and grey, flat, subtle borders. No large shadows, no big rounded corners, no cards |
| **Type** | Tahoma / Arial, small sizes |
| **Structure** | selection/input area first, detail/process area second. Tabs **only** when one screen genuinely cannot hold it |

**Make it clickable.** Buttons should do the visible thing — reveal the detail
section, add a grid row, show the message bar, switch a tab. A static picture
answers "how does it look"; a clickable one answers "how does it *work*", and the
second question is the one that finds the missing requirement. Plain HTML, CSS
and a little JavaScript in one file; no frameworks, no CDN.

### The grid follows ALV conventions

Header row, visible column and row borders, numbers right-aligned, editable cells
visually different from read-only ones, alternating row shading when it helps,
and a checkbox or highlight for selectable rows. If a row's behaviour depends on
what is typed into it, say so on the page.

### Annotate inside the HTML

Comments where a developer would otherwise have to guess: validation, conditional
visibility, what loads only after an action, which fields are calculated. The
mock-up is a handover document, not decoration.

## 3 · Write the file and hand over the path

```
ekran-maketi-<konu>.html
```

Write it into the project folder and give the consultant the path. **Do not print
copy-and-paste instructions** — the agent has a file system; asking a consultant
to paste HTML into Notepad is a workaround for a limitation this kit does not
have. For a customer-facing PDF, `office-pdf` renders it.

## 4 · Say what you built and what you are unsure about

After the file, four short sections:

1. **Ne anladım** — the workflow and the assumed goals, in a few lines
2. **Ekranda ne var** — the sections, and what each button does
3. **Hangi alan ne** — editable / read-only / required / calculated, as a table
4. **Neyi netleştirmemiz lazım** — the specific questions, each one naming the
   field or rule it is about

Section 4 is the one that earns the skill its place. "Bazı kurallar net değil" is
not a question; **"Miktar girildiğinde tutar otomatik hesaplanacak mı, yoksa
kullanıcı mı girecek?"** is.

## 5 · Boundaries

- **A mock-up is not a specification.** It shows the layout; the rules behind it
  live in the FS. This skill fills section 7 of `FS_TEMPLATE.md`
  (*Girdi / Çıktı ve Ekran Tasarımı*) — `fs-generator` writes the rest.
- **Nothing here reaches SAP.** No connection, no transport, no object. When the
  layout is agreed, `screen-gen` builds the Dynpro and `sap-adt` the program.
- **Do not invent business rules to fill a gap.** An unanswered rule goes in
  section 4 as a question. A screen that quietly assumes a default gets approved
  with that default in it.
- **Accessibility, in proportion.** Label every input and keep the tab order
  sensible — those survive into the real screen as field labels and screen
  sequence. Do not spend effort on aria roles and contrast ratios for the HTML
  itself: the mock-up is thrown away and SAP GUI has no aria. If the target is a
  Fiori app rather than a Dynpro, that changes and the skill is the wrong one.
- **No customer data.** Fill the mock-up with obviously fake values. It travels
  by email and lands in decks.

### Before you hand it over

- The main workflow is obvious in five seconds.
- The primary action button is easy to find.
- Editable and read-only fields look different.
- Every missing rule is a question in section 4, not a silent assumption.
