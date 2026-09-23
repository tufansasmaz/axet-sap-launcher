---
name: project-store
description: >
  Save an approved project document (FS, TS, BBP) into the shared "Projects" store
  on SharePoint, with a record of who approved which exact bytes and when. Use
  right after fs-generator, ts-generator or bbp-creator renders a Word document,
  and whenever the user says "onayla", "onaylıyorum", "kaydet", "SharePoint'e
  kaydet", "Projects'e kaydet", "FS'i onayla", "TS'i onayla", "approve this FS",
  "save to the project store", "onaylı mı", "değişmiş mi", "verify the approval".
  The approval is a RECORD, not a formality: ask the person explicitly, show what
  will be saved and where, and save only on a clear yes. Also verifies that a
  saved document has not been edited since it was approved.
---

# project-store — approved documents, in one place, with a record

A generated FS or TS used to stay in `./fs-output/` on one consultant's disk. This
skill puts the approved version into the shared **Projects** folder — synced from
SharePoint — and writes a record beside it: who approved it, when, and the hash of
every file, so a later edit is detectable.

```
Projects/
└── beta-enerji/                 <- the project code, from the workspace pin
    ├── _liste.json              <- the development list (Orbit export)
    ├── SD007/                   <- one folder per development ITEM
    │   ├── FS/
    │   │   ├── SD007-Commercial-Invoice.docx
    │   │   ├── SD007-Commercial-Invoice.md
    │   │   └── SD007-Commercial-Invoice.onay.json    <- the record
    │   └── TS/
    └── _Listesiz/               <- no list loaded, or no item given
        └── FS/
```

One folder per development item, and a kind folder **always** inside it. The
work ships per item — Beta Enerji carries six deliverables for a single
development — so a kind-first layout filed one job in six places.

The item folder is the item **id**, never its title. The store already sits
~120 characters deep inside a synced OneDrive root that is longer on some
machines, and Windows still refuses 260: measured on 2026-09-20, `<id> - <title>`
folders reach 275 on a plausible root, and OneDrive then stops syncing the file
without saying anything a consultant can read.

## The approval question — non-negotiable

The record says a person approved these bytes. It can prove **which account**
saved them (the OneDrive business account, which SharePoint also stamps as
"Modified By"), but **not that a human read them**. That part rests entirely on
you asking.

1. **Show before you ask.** Name the file(s), the project code, and where they
   will land (`Projects/<code>/<KIND>/`).
2. **Ask once, plainly:** *"Bu FS'i onaylıyor musunuz? Onaylarsanız proje deposuna
   kaydedilecek ve kimin, ne zaman onayladığı kayda geçecek."*
3. **Save only on a clear yes.** Silence, "sonra", "bakayım", a question back, or
   an edit request is NOT a yes. Pass `--approved` only after an explicit one —
   never on your own initiative, never to "save time". It is the same gate as the
   installer's `--yes-notice`.

If they want changes first, make them, re-render, and ask again. An approval
covers the exact bytes that were saved.

## Commands

`<SCRIPTS>` is this skill's `scripts/` folder.

```bash
py <SCRIPTS>/project_store.py where          # is the store synced here?
py <SCRIPTS>/project_store.py whoami         # the identity a record would carry
py <SCRIPTS>/project_store.py items          # the development list
py <SCRIPTS>/project_store.py save --kind FS --item SD007 \
    --file <fs.docx> --file <fs.md> --skill fs-generator --approved
py <SCRIPTS>/project_store.py assign --record <X.onay.json> --item SD007
py <SCRIPTS>/project_store.py reconcile          # plan only
py <SCRIPTS>/project_store.py reconcile --apply  # move _Listesiz into item folders
py <SCRIPTS>/project_store.py verify --record <path/to/X.onay.json>
```

## Which development is this? — run `items` first

Before saving, run `items` and **show the person the list**. They pick; you
never guess. Title similarity would file a document under the wrong development
quietly, which is the same failure the project code was tightened against.

- **They pick an id** → `--item <id>`. It lands in that item's folder.
- **The work is not in the list** → omit `--item`. It lands in `_Listesiz/`.
- **No list is loaded yet** → everything lands in `_Listesiz/`. Still pass
  `--item` if they can name the id: it is written into the record, and that is
  the only thing that lets `reconcile` move the document later without guessing.
- **An id that is not in the list is refused** (exit 6). Do not retry by
  dropping `--item` unless the person confirms the work really is unlisted.

The kind vocabulary comes from the list too. `--kind` outside it is refused,
so `Test`, `Testler` and `test-dokumani` cannot become three folders.

## When the list arrives later — `reconcile`

`reconcile` prints a plan; `--apply` performs it. It moves a set out of
`_Listesiz` only when the record names an item the list now contains. This is
safe because a record names **files, never paths**, and travels beside them —
a moved set still verifies.

An item folder whose id is no longer in the list is **reported and left alone**.
A renamed or deleted Orbit item must not take approved documents with it.

A set saved before any list existed has no item recorded, so `reconcile` cannot
place it and says so. Name it once with `assign`, then reconcile. `assign`
writes filing metadata only — it never touches who approved which bytes when —
and it refuses a record that already names an item, because re-filing an
approved document under a different development is not a correction.

Run `save` from the **project folder**. The project code comes from that folder's
`.ntt-profile.yaml` and from nowhere else — the installer writes it from the
central brief, so it cannot be a typo or an invention. There is no way to pass a
code by hand; `--code` is refused. **A folder that was not installed for a
central project cannot be saved to** (exit 4), and that is deliberate: the store
holds the documents of projects that have a recipe. If the work belongs to a real
project, install the folder for it and retry.

Save the Word file **and** its Markdown source together, in one `save`.

### What the exit codes mean — relay them, do not work around them

| code | meaning | what to tell the person |
|---|---|---|
| 0 | saved / verified | where it landed, and who it names as approver |
| 1 | verify: a file changed after approval | which file; it is no longer the approved version. A "SharePoint metadata added" line is NOT this — that exits 0 |
| 3 | the store is not synced on this machine | it was NOT saved; the setup document has the one-click sync link |
| 4 | the folder is not installed for a central project | it was NOT saved; the store is for projects with a brief. Install the folder for its project, then retry |
| 5 | refused (no `--approved`, or a hand-passed `--code`) | do not retry with the flag unless they said yes; never try to supply a code |
| 6 | `--item` is not in the development list | it was NOT saved; show `items` and let them pick, or confirm the work is unlisted |

**Nothing is saved on 3.** Say so — do not report success because a local file
exists. The local copy in `./fs-output/` is still there.

## Never overwritten

Re-approving the same document writes `<name>-v2`, `-v3` beside the first. An
approved version is never replaced, so "which version did the customer see" always
has an answer.

## Things that bite

- **Identity warning.** If OneDrive and Windows name different accounts, the save
  still happens but prints a warning — SharePoint will stamp the OneDrive account.
  Tell the person.
- **SharePoint rewrites Word files, and that is not an edit.** Within seconds
  of a save the server injects its own Document ID and content-type metadata
  into the package — measured 2026-09-20: 60327 bytes became 70250 while the
  document itself stayed byte-identical. `verify` knows this and prints
  *"SharePoint metadata added; document unchanged"*, which is still **ok**.
  `CHANGED` means the document inside really was edited. Relay the difference;
  do not report the metadata note as tampering.
- **Who can see it.** Everyone with access to the Projects folder can read every
  project's documents. Do not put anything there the department should not read.
- **It is not a customer sign-off.** This records an internal approval. A
  customer's approval is a separate process and a separate document.
