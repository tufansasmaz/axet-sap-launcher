---
name: screen-gen
description: >
  Generate classic Dynpro screens + GUI status + titlebar for SAP ABAP programs
  WITHOUT SE51/SE41 - via an RFC-enabled generator FM called over the SOAP-RFC
  channel. ADT cannot create screens or GUI statuses directly; this skill is the
  proven workaround. Use when a classic dialog/report program needs CALL SCREEN +
  PF-STATUS + TITLEBAR, an ALV docking/custom-control container, or a master-detail
  (split) screen, or a label+value detail popup in the Screen Painter shape.
  Triggers: Dynpro, screen, dynpro, CALL SCREEN, GUI status, PF-STATUS,
  SET TITLEBAR, SE51, SE41, classic dialog, ALV container, docking, detail
  screen, alan etiketi, ekran alani, cl_gui_custom_container,
  cl_gui_splitter_container, screen painter.
allowed-tools: Bash(python:*), Bash(py:*), Bash(cd:*), Read, Write, Edit, Grep, Glob
---

# Classic Dynpro Screen + GUI Status Generator

Generate a classic Dynpro **screen** + **GUI status (PF-STATUS)** + **titlebar** for a
classic ABAP program (report / module pool) **without SE51/SE41** — entirely through
the API. This fills a real gap: **ADT cannot create Dynpro screens or GUI statuses.**

This skill is a companion to the **`sap-adt`** skill and reuses its engine
(`sap_client.py` -> `sap_adt_lib.py`) for connection, auth, SSL, and `sap-client`.

---

## When to use

You are writing a classic dialog program (ALV list, master-detail, header+list) that
needs `CALL SCREEN` + a GUI status + a titlebar. **Not** for RAP/Fiori — this is the
classic SE80-style path. The ALV is bound to a docking or custom-control container on
the generated screen.

---

## How it works (and why SOAP-RFC, not classrun)

`RPY_DYNPRO_INSERT` (the screen) and `RS_CUA_INTERNAL_WRITE` (the GUI status) require a
**dialog context**. Call them from `adt_classrun` and you get `400 "Session Timed Out"`.

The fix: a small **RFC-enabled** wrapper FM (default name **`ZND_FM_SCREEN_GEN`**), called
over the **SOAP-RFC** channel `/sap/bc/soap/rfc` (which provides a dialog context). One
call generates both the screen and the status. `scripts/generate_screen.py` builds the
SOAP envelope and reuses the `sap-adt` session for auth/SSL/client.

```
generate_screen.py --> POST /sap/bc/soap/rfc  --> <generator FM> (RFC)
                       (dialog context)             |-- RPY_DYNPRO_INSERT  (screen + container + PBO/PAI)
                                                     |-- RS_CUA_INTERNAL_FETCH/WRITE/GENERATE (GUI status + title)
```

> The caller targets the standard name **`ZND_FM_SCREEN_GEN`** (auto-installed — see
> Installation below) and accepts `--fm-name` / `fm_name` / env `ABAP_SCREEN_GEN_FM`
> to override. The FM derives the target program's package from TADIR, so no package
> name is hardcoded inside it.

> ⚠️ Donor GUI texts (status function texts) come from the SAP system language of the
> call. The example programs are Turkish and call with `--language TR`. The titlebar
> text itself is always whatever you pass in `--title`, independent of language.

---

## Installation: none — it installs itself

The generator FM is a per-system developer tool. On the first call against a system that
does not have it, the caller installs it into **`$TMP`** and retries; the install is
announced in the output. Nothing goes into a transportable package, so nothing has to be
transported or cleaned up beyond a `SE37` delete.

| Object | Name |
|---|---|
| Function group (shared by all generators) | `ZND_FG_AUTO_GEN` |
| Adobe generator | `ZND_FM_ADOBE_GEN` |
| Dynpro generator (screen + GUI status) | `ZND_FM_SCREEN_GEN` |
| Field-pair generator (`FIELDS` type) | `ZND_FM_SCREEN_FIELDS` |
| Toolbar button adder (`--add-button`) | `ZND_FM_ADD_CUA_BUTTON` |

`ZNT_*` is reserved for kit tooling — it never collides with project WRICEF naming
(`Z<Module><PkgNo>_…`), and anyone finding it in a system can tell it is a tool, not a
development.

**There is no SE37 step.** ADT cannot set the Remote-Enabled flag — it rejects
`processingType` as a create attribute — which is why this used to cost one manual click
per system. SAP's own **`RPY_FUNCTIONMODULE_INSERT`** ships remote-enabled everywhere and
takes a `REMOTE_CALL` flag, so the generator installs itself over the same SOAP-RFC channel
it will then be called on. No bootstrap paradox: the FM doing the bootstrapping is SAP's.
Measured on DS4: `TFDIR-FMODE = R` immediately after the call.

To install deliberately (a different name, or a transportable package):

```bash
python <screen-gen>/scripts/bootstrap_fm.py   --source-file bootstrap/ZND_FM_SCREEN_GEN.func.abap   --fm-name ZND_FM_SCREEN_GEN --fg-name ZND_FG_AUTO_GEN --cwd "C:\project"
```

## Usage (after bootstrap)

Two front-ends, one core (same split as `sap-adt`):

- **MCP tool `adt_generate_screen`** (default) — exposed by the `sap-adt` MCP server,
  reusing its persistent session. Same params as the CLI; returns a structured
  `{ok, rc, ev_rc, ev_message, message, ...}`. Prefer this in an MCP-capable agent.
- **CLI `generate_screen.py`** (fallback / scripting) — for ad-hoc work, piping, CI, or
  when the MCP server isn't running. Auto-resolves the sibling `sap-adt` engine.

### MCP tool

```
adt_generate_screen(program="ZAI_P_LIST", dynpro="0100", title="Sales List",
                    screen_type="DOCKING", transport="TRXXXXXX")
```

### CLI

Run it from `screen-gen/scripts` (it auto-resolves the `sap-adt` engine):

```bash
# Docking ALV (full-screen single list) on screen 0100
python generate_screen.py --program ZAI_P_LIST --dynpro 0100 \
  --title "Sales List" --screen-type DOCKING --transport TRXXXXXX --cwd "C:\project"

# Custom-control container (header + ALV, positioned control = CC_ALV)
python generate_screen.py --program ZAI_P_DETAIL --dynpro 0100 \
  --title "Detail" --screen-type CONTAINER --cc-name CC_ALV --transport TRXXXXXX --cwd "C:\project"

# Split / master-detail: generate a CONTAINER screen; do the split IN ABAP
#   (cl_gui_splitter_container). The FM has NO separate SPLIT type.
python generate_screen.py --program ZAI_P_MD --dynpro 0200 \
  --title "Master-Detail" --screen-type CONTAINER --transport TRXXXXXX --cwd "C:\project"

# Inspect an existing screen (no write) / delete / re-create
python generate_screen.py --program ZAI_P_LIST --dynpro 0100 --mode READ   --cwd "C:\project"
python generate_screen.py --program ZAI_P_LIST --dynpro 0100 --mode DELETE --transport TRXXXXXX --cwd "C:\project"
python generate_screen.py --program ZAI_P_LIST --dynpro 0100 --recreate    --transport TRXXXXXX --cwd "C:\project"
```

**Then:** `adt_syntax_check` the program and activate it (`adt_activate` — `sap-adt` skill).

### Arguments

| Arg | Default | Meaning |
|---|---|---|
| `--program` | (required) | Target program. Must be customer (Z/Y) namespace. |
| `--dynpro` | `0100` | Screen number (4 digits). **Everything is named after this.** The number is not free: it encodes the screen tree — see the numbering rule below. |
| `--title` | `Liste` | Titlebar + dynpro description. |
| `--screen-type` | `DOCKING` | `DOCKING` (no container) / `CONTAINER` (one custom control) / `FIELDS` (label+value detail screen). |
| `--cc-name` | `CC_ALV` | Custom control name (CONTAINER type). |
| `--fields` | — | **FIELDS type.** `label;FIELDNAME;length`, repeatable or `\|`-joined. `FIELDNAME` must be a GLOBAL variable/structure component of the program. |
| `--lines` / `--columns` | `20` / `100` | FIELDS type: screen height and width. |
| `--no-verify` | off | FIELDS type: skip the read-back check. Don't — `rc=0` is not proof the fields landed. |
| `--fields-fm-name` | `ZND_FM_SCREEN_FIELDS` | Installed field-pair FM name (or env `ABAP_SCREEN_FIELDS_FM`). |
| `--mode` | `WRITE` | `WRITE` (generate) / `READ` (inspect) / `DELETE`. |
| `--recreate` | off | Delete + re-insert (apply flow/container/status changes). |
| `--transport` | — | Program's transport. **Never fabricate — ASK the user** (see `sap-adt` Critical Rule #2). |
| `--language` | conn language | `sap-language` for the call. Use `TR` if donor GUI texts must be Turkish. |
| `--fm-name` | `ZND_FM_SCREEN_GEN` | Installed generator FM name (or env `ABAP_SCREEN_GEN_FM`). |

`EV_RC=0` OK · `EV_RC=2` screen already existed (idempotent success) · other rc → see Troubleshooting.

---

## Which number? (corporate rule — do not pick freely)

The dynpro number carries the screen tree: **`0RCG`** — `R` = root screen (1-9),
`C` = its child (0 = the root itself), `G` = that child's child. So the main screen
is `0100`, an unrelated second screen is `0200`, a child of `0100` is `0110`, and a
child of `0110` is `0111`. A screen's parent is found by zeroing its rightmost
non-zero digit (`0121` → `0120` → `0100`). Popups and subscreens are children of the
screen that opens/hosts them. `1000` is reserved by SAP for the selection screen.

Binding definition with the limits (9 per level, 3 levels) and the exception rule:
**§3.2 in `NAMING_STANDARD.md`**, shipped with the sap-specs `ts-generator` skill.

## Dynamic naming contract (program MUST match)

`--dynpro <n>` drives **everything** — the FM body never changes per screen:

| Generated | Name |
|---|---|
| Screen | `<n>` |
| Flow modules | `MODULE status_<n>` (PBO) / `MODULE user_command_<n>` (PAI) |
| GUI status | `STAT<n>` |
| Titlebar | `TIT<n>` |

Your program must therefore contain:

```abap
CALL SCREEN 0100.

MODULE status_0100 OUTPUT.
  SET PF-STATUS 'STAT0100'.
  SET TITLEBAR  'TIT0100'.
  " ... bind ALV to docking or CC_ALV ...
ENDMODULE.

MODULE user_command_0100 INPUT.
  CASE sy-ucomm.
    WHEN 'BACK' OR 'EXIT' OR 'CANCEL'. LEAVE PROGRAM.   " ESC = F12 = CANCEL
  ENDCASE.
ENDMODULE.
```

See `bootstrap/ZAI_P_ALV_TEMP1/2/3.prog.abap` for full, working patterns
(docking / custom-control / split). Deep mechanics: `references/SCREEN_GEN_RECIPE.md`.

---

## Layout types

| Type | When | How |
|---|---|---|
| **DOCKING** (default) | Full-screen single ALV | `--screen-type DOCKING`; program uses `cl_gui_docking_container`. |
| **CONTAINER** | ALV at a fixed position/size, header+list, multiple controls | `--screen-type CONTAINER`; program uses `cl_gui_custom_container( container_name = 'CC_ALV' )`. |
| **FIELDS** | Label + value detail popup — the SE51 shape | `--screen-type FIELDS --fields "..."`; see below. |
| **SPLIT** | Master-detail (top/bottom) | **Not a separate type** → generate `CONTAINER`, then split in ABAP with `cl_gui_splitter_container`. |

For CONTAINER the FM uses proven values (screen 200x255, custom control `c_resize_v/h='X'`,
`element_of` empty). Don't override these manually — see the recipe for why.

### FIELDS — label/value pairs (SE51 detail screen)

The shape a consultant means by "Screen Painter": a fixed caption on the left, the
field's value on the right, one pair per line. Typical use is the popup behind a
double-click on an ALV row.

```bash
py <screen-gen>/scripts/generate_screen.py \
  --program ZOO031_P_PURCHASE_ORDER --dynpro 0100 --screen-type FIELDS \
  --title "Satinalma Siparisi Detayi" --recreate \
  --fields "Satinalma Siparisi;GS_DETAIL-EBELN;12" \
  --fields "Kalem;GS_DETAIL-EBELP;6" \
  --fields "Tedarikci;GS_DETAIL-LIFNR;12" \
  --transport NS4K900241 --cwd "C:\project"
```

Each row is `label;FIELDNAME;length`. `--fields` repeats, or pass one string with
rows joined by `|`.

**Three constraints, each of which cost a debugging round on NS4 (2026-09-03):**

1. **`FIELDNAME` must be a GLOBAL variable or structure component of the target
   program** (`GS_DETAIL-EBELN`). A local variable or a class attribute cannot be
   bound to a screen. The generator cannot check this — SAP accepts the name and
   the field is simply empty at runtime.
2. **`CALL SCREEN` is illegal in a class pool.** Activation answers *"Dynpros
   cannot be defined for a class pool"*. The screen logic (`CALL SCREEN`, the
   PBO/PAI modules, the event handler) belongs in the **program**; the class stays
   data/business logic. A local `lcl_event_handler` in the program is the usual
   place for the double-click handler.
3. **This type does not create the GUI status or titlebar.** It only builds the
   field layout, on purpose: a detail screen gets its layout re-generated many
   times while it is tuned, and rewriting `STAT`/`TIT` each time is churn. Run
   `--screen-type DOCKING` (or `CONTAINER`) **once** for the same dynpro number
   first, then use `FIELDS` as often as you like.

**Do not reach for `SELECTION-SCREEN BEGIN OF SCREEN 100` instead.** It looks like a
shortcut and collides with the program's existing `PARAMETERS`/`SELECT-OPTIONS`
(*"CMT1 was already declared"*), and it is not a Dynpro — the customer asking for a
Screen Painter screen will not accept it.

#### Why the result is read back

`RPY_DYNPRO_INSERT` can answer **rc=0 for a screen it wrote nothing to.** Its
converter binds every elementary field to an entry in the `CONTAINERS` table, and
without the root `type='SCREEN' name='SCREEN'` row it skips them all — no exception,
no message. On NS4, 24 fields went in, rc was 0, and the dynpro held only `OKCODE`.

So after a successful write the generator re-reads the screen with
`RPY_DYNPRO_READ` and compares SAP's **native** field list (`fields_list`, `d021s`
— what the converter actually wrote to disk) against what was sent. Fewer fields
than expected fails with `fields_dropped`. `--no-verify` turns the check off; there
is no good reason to use it.

To inspect an existing screen without writing:

```bash
py <screen-gen>/scripts/generate_screen.py --program ZOO031_P_PURCHASE_ORDER \
  --dynpro 0100 --screen-type FIELDS --mode READ --cwd "C:\project"
```

---

## Toolbar buttons (`--add-button`) — DOES NOT WORK, do not reach for it

> **Verified not working on NS4, 2026-09-04.** `--add-button` writes the CUA
> tables and reports success, and the button never appears. Use the ALV grid's
> own toolbar instead (see below). The flag and its FM are kept only because the
> diagnostic modes (`--button-mode READ`) are useful for looking at a CUA.
>
> What was ruled out, each measured: `FUN`, `BUT`, `ACT`, `SET`, the status's
> `BUTCODE` group, `MODAL='D'`, a stale generated status, the 4-character code
> limit, `PFKCODE` as the group key, and a docking container covering the row.
> With every one of them correct, SE41 showed an **empty application toolbar**.
>
> Then the same function was typed into SE41's toolbar grid by hand. SAP
> answered *"TEST is not assigned to a function key. Select a function key."* —
> and after choosing one and activating, `RS_CUA_INTERNAL_FETCH` showed the BUT
> rows we had written **deleted**, the function still in `FUN`, and `RSMPE_PFK`
> grown from 35 rows to **866**. Appending a single PFK row by hand did not
> reproduce it either.
>
> So SE41 does structurally more than appending rows, and driving the
> application toolbar through `RS_CUA_INTERNAL_WRITE` is not a route this skill
> can take. `ZND_FM_SCREEN_GEN` still creates the status and titlebar correctly
> — that part is measured, the titlebars render.
>
> **One thing is NOT established, and it matters:** the program was then run,
> and the button SAP itself had added through SE41 **did not render either**.
> The application-toolbar row is there and empty on both screens, with and
> without a docking container. So "our write is wrong and SAP's is right" is too
> simple an explanation — at least one unknown remains, and the test that would
> separate them (a hand-added button on the container-less screen) was not
> finished. Do not treat the cause as fully understood.
>
> Full trail, including what is and is not established:
> `docs/specs/2026-09-04-cua-buton-parked/`.

### What to do instead

For a button on an ALV list, use `cl_gui_alv_grid`'s own toolbar. Pure ABAP,
no CUA, no generator FM, no SOAP-RFC:

```abap
CLASS lcl_handler DEFINITION.
  PUBLIC SECTION.
    METHODS on_toolbar FOR EVENT toolbar OF cl_gui_alv_grid
      IMPORTING e_object e_interactive.
    METHODS on_user_command FOR EVENT user_command OF cl_gui_alv_grid
      IMPORTING e_ucomm.
ENDCLASS.

METHOD on_toolbar.
  APPEND VALUE #( function = 'ITEM' icon = '@1F@'
                  quickinfo = 'Kalemler' text = 'Kalemler'
                  butn_type = 0 ) TO e_object->mt_toolbar.
ENDMETHOD.

" after set_table_for_first_display:
go_grid->set_toolbar_interactive( ).
SET HANDLER lo_h->on_toolbar lo_h->on_user_command FOR go_grid.
```

Ask which toolbar is meant before anything else — the two are unrelated, and
this one is the one that works.

---

## ~~Toolbar buttons (`--add-button`)~~ — reference for the diagnostic modes

Adds one application-toolbar push button to an **existing** GUI status. Not a
screen type — a separate operation on a status `generate_screen` already made.

```bash
py <screen-gen>/scripts/generate_screen.py --program ZOO031_P_PURCHASE_ORDER \
  --dynpro 0100 --add-button ITEM --button-text "Kalemler" --cwd "C:\project"
```

The program then branches on it: `CASE sy-ucomm. WHEN 'ITEM'. ...`. A button SAP
renders and the program ignores looks exactly like a broken one.

### Five ways a button silently does not appear

All five were live on NS4 on 2026-09-03, none produced an error, and four of them
leave every table you would think to check looking correct.

| Cause | What you see | Handled by |
|---|---|---|
| Function code longer than 4 chars | Nothing. `RSMPE_BUT-CODE` is `GUI_BCODE`, CHAR 4 — menu/pfkey codes are `GUI_FUNC` and go to 20, so a 7-char code looks fine everywhere else and only the toolbar drops it. | Refused before the call, naming a 4-char alternative. |
| **Status is `MODAL='D'`** | **No application toolbar row at all.** A dialog-box status draws its buttons in the popup frame; the toolbar is never rendered, however correct FUN/BUT/ACT/SET are. | `--modal N`. Not automatic: a status whose screen really is a popup (`CALL SCREEN n STARTING AT`) must stay `D`. |
| `RSMPE_STA-BUTCODE` empty | Nothing. That field is the toolbar group a status points at, and `ZND_FM_SCREEN_GEN`'s clean-toolbar pass deliberately clears it — so a screen from this very skill starts with no group. | Assigned automatically when the status has none. |
| Code missing from `ACT` | Nothing, or runtime `00256 "select a valid function"` if triggered anyway. `ACT` is the active-function list; the kernel treats a missing entry as invalid. | Registered under the status's own actcode. |
| Generated status is stale | Nothing, and every table checks out. The kernel renders the GENERATED status, not the CUA tables. If an earlier run wrote the tables and its generate failed, the two disagree forever. | Regenerated on every path, including the idempotent one. |

The last two are why `--button-mode READ` exists — it dumps `MODAL`, `BUTCODE`,
`FUN`, `BUT`, `ACT` and `SET` in one line so you can see which of the five is
missing instead of guessing. `--button-mode GENERATE` re-runs `RS_CUA_GENERATE`
alone.

**"Already there" means wired, not present.** The idempotency check tests all
five conditions, not just `FUN`. Testing only `FUN` is what made this
unrepairable on NS4: regenerating the screen cleared `BUTCODE`, every later call
answered "already in CUA" and returned without putting it back.

### Before reaching for any of this: which toolbar?

A screen carries two, and they have nothing to do with each other.

- The **application toolbar** comes from the screen's PF-STATUS. That is what
  this section is about, and what fires `sy-ucomm` in `user_command_<dynpro>`.
- An **ALV grid's own toolbar** (Sort / Filter / Export) belongs to
  `cl_gui_alv_grid`. A button there is pure ABAP — handle the `toolbar` event,
  append to `e_object->mt_toolbar`, call `set_toolbar_interactive( )`, and handle
  `user_command`. No CUA, no generator FM, no SOAP-RFC, and unaffected by
  whatever a docking container is covering.

Ask which one is wanted first. On NS4 (2026-09-04) every CUA table was made
correct, `MODAL` fixed, the status regenerated — and the application toolbar row
still did not render on a screen whose docking container takes 95% from the top.
That case is parked in `docs/specs/2026-09-04-cua-buton-parked/`; the grid's own
toolbar is the route that does not depend on any of it.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| SOAP Fault "FM not found" / HTTP 404 | FM missing or **not Remote-Enabled**. SE37 -> Processing Type = Remote-Enabled Module. |
| `400 Session Timed Out` | You called via classrun, not SOAP-RFC. This skill uses SOAP-RFC — don't bypass it. |
| Runtime `00256 "select a valid function"` | Donor `act` (active-function list) was pruned. The FM intentionally KEEPS `act`; don't edit that out. |
| Runtime `00264 "GUI status not generated"` | `RS_CUA_GENERATE` not called. The FM calls it after WRITE — if you reimplement, keep it. |
| Buttons unresponsive | `fun-type='E'` left as-is. The FM forces BACK/EXIT/CANCEL to NORMAL type. |
| ALV doesn't fill the window | Custom control `c_resize_v/h='X'` not set. The FM sets it for CONTAINER. |
| INSERT `illegal_field_value` (rc=6) | CUST_CTRL `element_of='SCREEN'`. Must be EMPTY (FM leaves it empty). |
| GUI texts in German/blank | Call with `--language TR` (or your target language). |
| `mandatory parameter BIV` (RABAX) | `biv` from FETCH must be passed to WRITE. The FM does this. |
| **FIELDS:** `fields_dropped` — rc=0 but the screen holds fewer fields | The root container row is missing from the FM. `RPY_DYNPRO_INSERT` binds every elementary field to an entry in `CONTAINERS`; without `type='SCREEN' name='SCREEN'` it skips them all silently. Check that `APPEND VALUE #( type = 'SCREEN' name = 'SCREEN' )` is still in `ZND_FM_SCREEN_FIELDS`. |
| **FIELDS:** value fields render empty at runtime | The bound name is not a GLOBAL variable of the program. A local variable or class attribute cannot bind to a screen — move it to a program-level `DATA`. |
| **FIELDS:** activation says *"Dynpros cannot be defined for a class pool"* | `CALL SCREEN` sits in a class. Move the screen logic (CALL SCREEN, PBO/PAI modules, the event handler) into the **program**; leave the class as data/business logic. |
| **FIELDS:** `"CMT1" was already declared` / `Parameter already defined` | You reached for `SELECTION-SCREEN BEGIN OF SCREEN 100`, which collides with the program's existing PARAMETERS. Use a real Dynpro — that is what this type generates. |
| **FIELDS:** `SET PF-STATUS 'STAT0100'` fails / no titlebar | This type does not create the GUI status. Run `--screen-type DOCKING` once for the same dynpro number first. |

---

## Safety / scope notes

- **Customer namespace only** — `generate_screen.py` refuses non-Z/Y target programs.
- **Transports** — never fabricate. Run `adt_list_transports` (`sap-adt`) and ask the
  user, exactly as for every other write operation.
- **SAP API Policy** — this plugin already carries a policy notice; the SOAP-RFC channel
  is within that same already-warned posture. Personal sandbox / R&D use only.

---

## References

- `scripts/bootstrap_fm.py` — one-time installer (FG + FM + source push + activate; $TMP by default).
- `scripts/generate_screen.py` — the SOAP-RFC caller (CLI + importable core).
- `references/SCREEN_GEN_RECIPE.md` — deep mechanics (RPY_DYNPRO_INSERT, the CUA
  fetch/prune/rename/generate sequence, proven CUST_CTRL values, ESC/exit).
- `bootstrap/ZND_FM_SCREEN_GEN.func.abap` — the screen + GUI status FM (install once).
- `bootstrap/ZND_FM_ADD_CUA_BUTTON.func.abap` — the toolbar button FM
  (`--add-button`; install once). Proven on NS4 2026-09-03.
- `bootstrap/ZND_FM_SCREEN_FIELDS.func.abap` — the label/value field-pair FM
  (`FIELDS` type; install once). Proven on NS4 2026-09-03 against
  `ZOO031_P_PURCHASE_ORDER`/0100, 12 pairs.
- `bootstrap/ZAI_P_ALV_TEMP1.prog.abap` — docking ALV reference.
- `bootstrap/ZAI_P_ALV_TEMP2.prog.abap` — custom-control container reference.
- `bootstrap/ZAI_P_ALV_TEMP3.prog.abap` — split / master-detail reference.
- Companion skill: `../sap-adt/SKILL.md` (connection, transports, push, activate).
