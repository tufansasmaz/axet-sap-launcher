# Classic dialog — what "correct" means

Report, module pool, Dynpro, ALV. The SAP GUI side, not RAP + freestyle UI5.

**When classic?** A Z transactional document that fits RAP goes to RAP
([`RAP_STANDARD.md`](RAP_STANDARD.md) §1). Lists and reports, a classic GUI screen, an
Adobe output, or parity with an inherited program stay classic.

---

## 1 · Structure

A classic program is **not** one REPORT body. The main program holds `INCLUDE` statements
and event blocks (`INITIALIZATION`, `START-OF-SELECTION`, …); everything else lives in
includes named by role.

The five role suffixes — `_TOP`, `_SSC`, `_MDL`, `_CLS`, `_FRM` — and the rule that `_FRM`
is not produced for new work are already specified in
[`NAMING_STANDARD.md`](../../ts-generator/references/NAMING_STANDARD.md) §3.1. Read them
there; do not restate them.

Two consequences worth checking in review:

- A program with no `_FRM` include is **correct**, not incomplete. Business logic belongs
  in a global class plus `LCL_*` in `_CLS`.
- A SALV/ALV report with no screen has no `_MDL`, and that is also correct.

Includes are created as include objects (PROG/I), not as standalone programs.

---

## 2 · Object model

| Class | Holds |
|---|---|
| `LCL_DATA` (or `LCL_MODEL`) | reading and computing — `SELECT`, business rules |
| `LCL_ALV` | grid setup: field catalogue, layout, toolbar |
| `LCL_EVENT` | ALV events: `double_click`, `user_command`, toolbar |
| `LCL_APP` | flow orchestration (main-controller, usually a singleton) |

**Template-first, and this is deliberate.** The ALV setup — field catalogue with Turkish
titles and hotspots, layout, event registration — is written **inline in the program**. Do
not build a reusable `Z*_CL_ALV_*` wrapper: the title, hotspot and event behaviour are
program-specific, and parameterising them from outside is what turns a wrapper into a
liability. Copy a working ALV program and specialise it.

---

## 3 · Which ALV

| Situation | Tool |
|---|---|
| read-only list, simple | **SALV** (`CL_SALV_TABLE`) — less code |
| editable, toolbar, cell events, column personalisation | **`CL_GUI_ALV_GRID`** + `CL_GUI_DOCKING_CONTAINER` |

**List parity is not optional.** Every list screen offers column sort and filter, a filter
bar, show/hide columns, and Excel export. In classic ALV these come from
`set_table_for_first_display( i_save = 'A' )` — they are built in, so a wrapper is not the
way to get them.

---

## 4 · Dynpro and GUI status

**ADT has no Dynpro API.** Screens and GUI statuses cannot be created through the `adt_*`
tools. Use the **`screen-gen`** skill, which drives an RFC-enabled generator FM over the
SOAP-RFC channel and produces the screen, the PF-STATUS and the titlebar.

Whichever way the screen arrives, the program side is reviewed the same:

- PBO `MODULE status_xxxx OUTPUT` sets PF-STATUS and titlebar; PAI
  `MODULE user_command_xxxx INPUT` dispatches `OK_CODE`/`SY-UCOMM` through a `CASE`.
- **`CLEAR ok_code` after the `CASE` is mandatory.** Leave it out and the previous command
  fires again on the next PAI — the sticky-command trap. This one is mechanically
  checkable: a PAI module that reads `ok_code` without a `CLEAR` is a violation.
- **Navigation targets are fixed.** BACK (F3) and CANCEL (F12) → `LEAVE TO SCREEN 0`,
  returning to the selection screen. EXIT (Shift+F3) → `LEAVE PROGRAM`. Using
  `LEAVE PROGRAM` on BACK or CANCEL throws the user out to the main menu and is wrong.

---

## 5 · Texts

Every literal is a text element or a selection text — no strings embedded in code, same
rule as constants (§6). Titles, statuses and selection texts are complete and in the
master language; if a create lands in English, sync it to the master language afterwards.

> **Known limit.** The `adt_*` engine writes `source/main` only. Text elements and
> selection texts sit behind a different endpoint and **the engine has no tool for them
> today** — pushing the source does not carry them, and reading the source back will not
> reveal that they are missing. For a program with `TEXT-xxx` or selection texts, the text
> pool is currently a manual step, and reviewing one means checking it in the system
> rather than in the source.

---

## 6 · Constants and prefixes

No magic numbers or strings: a `CONSTANTS` entry or a text element. Prefixes `c_`
(constant), `gv_`/`lv_`, `gt_`/`lt_`, `gs_`/`ls_`, `go_`/`lo_`.

---

**Provenance.** Adapted 2026-08-19 from the ARC-1 kit's
`standards/06-coding-classic-dialog.md`. The include-naming section was dropped as a
duplicate of `NAMING_STANDARD.md` §3.1; the "build yourself a screen generator" recipe was
replaced by the `screen-gen` skill, which is that recipe productised; the standard-object
section was dropped as a duplicate of `review-checklist.md`; and the text-pool note was
rewritten — ARC-1 had a text-symbol action, our engine does not, so what was an instruction
there is a stated gap here.
