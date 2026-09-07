---
name: screen-gen
description: >
  Generate classic Dynpro screens + GUI status + titlebar for SAP ABAP programs
  WITHOUT SE51/SE41 - via an RFC-enabled generator FM called over the SOAP-RFC
  channel. ADT cannot create screens or GUI statuses directly; this skill is the
  proven workaround. Use when a classic dialog/report program needs CALL SCREEN +
  PF-STATUS + TITLEBAR, an ALV docking/custom-control container, or a master-detail
  (split) screen. Triggers: Dynpro, screen, dynpro, CALL SCREEN, GUI status,
  PF-STATUS, SET TITLEBAR, SE51, SE41, classic dialog, ALV container, docking,
  cl_gui_custom_container, cl_gui_splitter_container, screen painter.
allowed-tools: Bash(python:*), Bash(py:*), Bash(cd:*), Read, Write, Edit, Grep, Glob
---

# Classic Dynpro Screen + GUI Status Generator

> ## ⚠️ READ-ONLY TOOLKIT — generation is DISABLED here
>
> This is the **read-only** SAP toolkit for aXet.code. Generating a screen *creates
> SAP objects* (a write), so the `adt_generate_screen` tool is **not exposed** by the
> read-only HTTP gate — a call returns `404 unknown_tool`, and the engine refuses it
> anyway (`ADT_READONLY=true`).
>
> This skill is included for **reference and inspection only**: use it to understand
> how classic Dynpro screens, GUI statuses, and titlebars are structured, and to read
> the mechanics below. To actually *generate* a screen you need a writable SAP toolkit,
> which is out of scope for these new-user, read-only credentials. For delivering ABAP
> changes to SAP the compliant path is the **abapgit-workflow** skill (manual abapGit
> ZIP cycle, developer-in-the-loop).

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

The fix: a small **RFC-enabled** wrapper FM (default name **`ZAI_FM_SCREEN_GEN`**), called
over the **SOAP-RFC** channel `/sap/bc/soap/rfc` (which provides a dialog context). One
call generates both the screen and the status. `scripts/generate_screen.py` builds the
SOAP envelope and reuses the `sap-adt` session for auth/SSL/client.

```
generate_screen.py --> POST /sap/bc/soap/rfc  --> <generator FM> (RFC)
                       (dialog context)             |-- RPY_DYNPRO_INSERT  (screen + container + PBO/PAI)
                                                     |-- RS_CUA_INTERNAL_FETCH/WRITE/GENERATE (GUI status + title)
```

> The bundled ABAP in `bootstrap/` is a **reference template**, not a fixed-name object.
> Install it under whatever name/package your project uses; the caller targets
> `ZAI_FM_SCREEN_GEN` by default but accepts `--fm-name` / `fm_name` / env
> `ABAP_SCREEN_GEN_FM` to override. The FM derives the target program's package from
> TADIR, so no package name is hardcoded inside it.

> ⚠️ Donor GUI texts (status function texts) come from the SAP system language of the
> call. The example programs are Turkish and call with `--language TR`. The titlebar
> text itself is always whatever you pass in `--title`, independent of language.

---

## ONE-TIME bootstrap (per system) — required before first use

The generator FM is installed by one script, **`scripts/bootstrap_fm.py`**, which creates
the function group + function module, pushes the body (inline signature included), and
activates it. Then a **single manual SE37 click** RFC-enables it. You do this **once per
system**, then reuse for every classic program.

```bash
# Default: install into $TMP (LOCAL, no transport) — a generator is a per-system dev tool
python bootstrap_fm.py --cwd "C:\project"

# Or into a transportable Z package (then a transport is required)
python bootstrap_fm.py --package ZAI --transport TRXXXXXX --cwd "C:\project"
```

What it does (all automated): create `ZAI_FG_SCREEN_GEN` → create `ZAI_FM_SCREEN_GEN`
(local for `$TMP`) → push `bootstrap/ZAI_FM_SCREEN_GEN.func.abap` → activate. The FM
signature is set from the **inline** ABAP clauses in the source (no SE37 signature step).

Then the **one unavoidable manual step**:

> **RFC-enable (MANUAL, REQUIRED):** SE37 → `ZAI_FM_SCREEN_GEN` → Attributes →
> **Processing Type = Remote-Enabled Module** → Save + Activate. ADT rejects
> `processingType` as a create attribute (`400 "Unexpected Case in Branch"`), so this
> can't be automated. Until it's done, SOAP-RFC faults with "Function module … not found".

**Names/package are yours to pick.** The FM has no hardcoded package (it reads the target
program's package from TADIR). Override with `--fm-name` / `--fg-name` / `--package`;
`bootstrap_fm.py` rewrites the `FUNCTION` line to match `--fm-name`. If you install under a
non-default FM name, point the caller at it via `--fm-name <NAME>` (CLI) / `fm_name="<NAME>"`
(MCP) / env `ABAP_SCREEN_GEN_FM`. Keep the `IV_*` parameter names and the body as-is.

**(Optional) example programs** — push `bootstrap/ZAI_P_ALV_TEMP1/2/3.prog.abap` as living
references (docking / custom-control / split); for each, run `generate_screen.py` to create
its screen, then activate.

> Note: a `$TMP` install is local to one system and cannot be transported — install it
> per system (each is one `bootstrap_fm.py` run + one SE37 click).

---

## Usage (after bootstrap)

> **DISABLED in this read-only toolkit.** Everything from here down describes the
> *write* workflow from the original plugin and is kept **for reference only**. The
> `adt_generate_screen` tool is not served by the read-only HTTP gate (it returns
> `404 unknown_tool`) and the engine refuses it (`ADT_READONLY=true`). Do not attempt
> these steps here — to deliver screen changes to SAP, use `%abapgit-workflow`.

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

**Then:** `syntax_check.py` the program and **activate** it (`sap-adt` skill).

### Arguments

| Arg | Default | Meaning |
|---|---|---|
| `--program` | (required) | Target program. Must be customer (Z/Y) namespace. |
| `--dynpro` | `0100` | Screen number (4 digits). **Everything is named after this.** |
| `--title` | `Liste` | Titlebar + dynpro description. |
| `--screen-type` | `DOCKING` | `DOCKING` (no container) / `CONTAINER` (one custom control). |
| `--cc-name` | `CC_ALV` | Custom control name (CONTAINER type). |
| `--mode` | `WRITE` | `WRITE` (generate) / `READ` (inspect) / `DELETE`. |
| `--recreate` | off | Delete + re-insert (apply flow/container/status changes). |
| `--transport` | — | Program's transport. **Never fabricate — ASK the user** (see `sap-adt` Critical Rule #2). |
| `--language` | conn language | `sap-language` for the call. Use `TR` if donor GUI texts must be Turkish. |
| `--fm-name` | `ZAI_FM_SCREEN_GEN` | Installed generator FM name (or env `ABAP_SCREEN_GEN_FM`). |

`EV_RC=0` OK · `EV_RC=2` screen already existed (idempotent success) · other rc → see Troubleshooting.

---

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
| **SPLIT** | Master-detail (top/bottom) | **Not a separate type** → generate `CONTAINER`, then split in ABAP with `cl_gui_splitter_container`. |

For CONTAINER the FM uses proven values (screen 200x255, custom control `c_resize_v/h='X'`,
`element_of` empty). Don't override these manually — see the recipe for why.

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

---

## Safety / scope notes

- **Customer namespace only** — `generate_screen.py` refuses non-Z/Y target programs.
- **Transports** — never fabricate. Run `list_transports.py --modifiable-only`
  (`sap-adt`) and ask the user, exactly as for every other write operation.
- **SAP API Policy** — this plugin already carries a policy notice; the SOAP-RFC channel
  is within that same already-warned posture. Personal sandbox / R&D use only.

---

## References

- `scripts/bootstrap_fm.py` — one-time installer (FG + FM + source push + activate; $TMP by default).
- `scripts/generate_screen.py` — the SOAP-RFC caller (CLI + importable core).
- `references/SCREEN_GEN_RECIPE.md` — deep mechanics (RPY_DYNPRO_INSERT, the CUA
  fetch/prune/rename/generate sequence, proven CUST_CTRL values, ESC/exit).
- `bootstrap/ZAI_FM_SCREEN_GEN.func.abap` — the generator FM (install once).
- `bootstrap/ZAI_P_ALV_TEMP1.prog.abap` — docking ALV reference.
- `bootstrap/ZAI_P_ALV_TEMP2.prog.abap` — custom-control container reference.
- `bootstrap/ZAI_P_ALV_TEMP3.prog.abap` — split / master-detail reference.
- Companion skill: `../sap-adt/SKILL.md` (connection, transports, push, activate).
