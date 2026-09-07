# Screen + GUI Status Generation — Deep Recipe

Internal mechanics behind `ZAI_FM_SCREEN_GEN`. Read this only when you need to modify
or debug the generator FM. For normal use, `../SKILL.md` is enough. Every value below was
proven on a live system (2026-06-03); the notes mark which were learned from failures.

---

## Why SOAP-RFC (not classrun)

`RPY_DYNPRO_INSERT` and `RS_CUA_INTERNAL_WRITE` both require a **dialog context**. The ADT
classrun channel has none → `400 "Session Timed Out"`. So the generator is an
**RFC-enabled** FM called over `/sap/bc/soap/rfc`, which runs in a dialog context.

SOAP-RFC call shape (what `generate_screen.py` sends):

```
POST /sap/bc/soap/rfc?sap-client=<c>&sap-language=<lang>
  Authorization: Basic ...            (reused from the sap-adt session)
  Content-Type: text/xml; charset=utf-8
  SOAPAction: ""
  Body: SOAP envelope, ns urn:sap-com:document:sap:rfc:functions
        <urn:ZAI_FM_SCREEN_GEN><IV_PROGRAM>..</IV_PROGRAM>...</urn:ZAI_FM_SCREEN_GEN>
Response: <EV_RC>, <EV_MESSAGE>
```

---

## Step 1 — the screen (`RPY_DYNPRO_INSERT`)

- Header (`rpy_dyhead`): `type='N'`, `nextscreen=<self>`, `language=sy-langu`,
  `descript=IV_TITLE`.
  - DOCKING: `lines=20 columns=120`, no containers.
  - CONTAINER: `lines=200 columns=255` (full size, so the control/ALV fills the window —
    20x120 was too small).
- Flow logic (`rpy_dyflow`), names derived from the screen number:
  ```
  PROCESS BEFORE OUTPUT.
    MODULE status_<dynnr>.
  PROCESS AFTER INPUT.
    MODULE user_command_<dynnr>.
  ```
- `RPY_DYNPRO_INSERT` does **not** overwrite an existing screen → returns
  `already_exists` (rc=2). To change flow/container, delete first (`IV_RECREATE='X'` →
  `RS_SCRP_DELETE`, since there is no `RPY_DYNPRO_DELETE`) then re-insert.

### CUST_CTRL (CONTAINER type) — PROVEN values (do not deviate)

| Field | Value | Why |
|---|---|---|
| `type` | `CUST_CTRL` | Custom control hosting `cl_gui_custom_container`. |
| `name` / `cu_cc_name` | `IV_CC_NAME` (e.g. `CC_ALV`) | Matches `container_name=` in ABAP. |
| `element_of` | **EMPTY** | RPY auto-binds to the screen root. Explicit `'SCREEN'` → `illegal_field_value` (rc=6); the SCREEN row isn't in the container table. |
| `line` / `column` | `1` / `1` | Top-left. |
| `height` / `length` | `200` / `255` | Full screen. |
| `c_resize_v` / `c_resize_h` | `'X'` / `'X'` | **REQUIRED** — control resizes with the window; without it the control stays fixed and the ALV doesn't fill the window. (Learned from TEMP3.) |
| `c_line_min` / `c_coln_min` | `1` / `1` | Min rows/cols for resize. |

Split screens use the **same single** CUST_CTRL (CONTAINER); the split is done in ABAP
with `cl_gui_splitter_container`. Do NOT put a second container on the screen.

---

## Step 2 — GUI status + titlebar (the CUA recipe)

The FM copies the standard donor status `SAPLKKBL` / `STANDARD`, then carefully prunes:

1. `RS_CUA_INTERNAL_FETCH` (program=`SAPLKKBL`, status=`STANDARD`, state='A') into
   `sta/fun/men/mtx/act/but/pfk/set/doc/tit/biv` + `adm`.
2. **Reduce bloat**: keep only the donor status — `DELETE sta/set WHERE code/status <> 'STANDARD'`.
3. **Re-map pfkeys** to the fcodes the program expects: pfno `03`→`BACK`, `15`→`EXIT`,
   `12`→`CANCEL` (donor uses generic `&F03/&F15/&F12`).
4. **Rename** status `STANDARD` → `STAT<dynnr>` (in `sta` and `set`).
5. **Guarantee** BACK/EXIT/CANCEL exist in `fun` + `set` (donor has BACK/EXIT, not CANCEL).
6. **Force NORMAL type** on BACK/EXIT/CANCEL (`CLEAR <fun>-type`) — donor delivers
   `EXIT type='E'`, which needs an `AT EXIT-COMMAND` module; without one the command is
   swallowed. NORMAL → `user_command_<n>` catches it. **ESC = F12 = CANCEL.**
7. **Toolbar/menu cleanup (CRITICAL distinction):**
   - ✅ `REFRESH men, mtx, but` (visible menu bar + application toolbar) + `CLEAR adm-mencode`
     + `CLEAR sta-butcode`. → clean screen, working buttons.
   - ⛔ **Do NOT clear `act` / `actcode`.** `act` = active-function list = validity. Clearing
     it makes BACK/EXIT/CANCEL invalid → runtime `00256 "select a valid function"` (buttons
     dead). This caused 3-4 dead ends. KEEP `act`/`fun`/`pfk` (they stay as harmless pools).
   - The ALV grid's own toolbar (`CL_GUI_ALV_GRID`: sort/filter/Excel) is separate, unaffected.
8. **Titlebar**: `REFRESH tit` then append only `TIT<dynnr>` (titles are status-independent →
   safe to prune; otherwise the donor's ~16 titlebars leak into the program).
9. `RS_CUA_INTERNAL_WRITE` (program=target, `tr_key`: `obj_type='PROG'`, `obj_name=prog`,
   `sub_type='CUAD'`, `sub_name=prog`, `devclass=<package>`). **`biv` is mandatory here**
   even though it's optional on FETCH — pass the fetched `biv` through (else RABAX
   `mandatory parameter BIV was not filled`).
10. **`RS_CUA_GENERATE`** (objectname=target, `without_messages='X' without_checks='X'`) —
    **REQUIRED**. WRITE only writes the definition; without GENERATE the runtime load is
    missing → `00264 "GUI status not generated"` (visible in Menu Painter but dead at runtime).

---

## ESC / exit

Navigation functions are NORMAL type + handled in `user_command_<n>`
(`CASE sy-ucomm WHEN BACK/EXIT/CANCEL → LEAVE PROGRAM`). **ESC = F12 = CANCEL** is caught
there. The `type='E'` + `AT EXIT-COMMAND` route was tried and FAILED on generated screens
(no OK command-field → type-E command not caught). NORMAL type is sufficient.

---

## Modes

- `READ` — `RPY_DYNPRO_READ` (container/size) + `RS_CUA_INTERNAL_FETCH` (CUA title/fun),
  no write. Use to learn real positions/sizes after manual SE51 fixes.
- `DELETE` — `RS_SCRP_DELETE` (`with_popup=space suppress_checks='X' corrnum=tr`).
- `WRITE` + `IV_RECREATE='X'` — `RS_SCRP_DELETE` then re-INSERT. ⚠️ If the re-INSERT fails
  (e.g. `element_of='SCREEN'` → rc=6) the screen is gone — get INSERT values right first.

---

## Result code

`EV_RC = screen_rc + status_rc + generate_rc`. `0` = clean. `2` alone = screen already
existed (idempotent OK). Higher values: read `EV_MESSAGE`, which reports each sub-rc
(`screen(...) rc=..; status(...) rc=..; generate rc=..`).

---

## Provenance

Source of truth for this recipe: the project template `playbook/adt-fugr-functions.md` §6
and `playbook/howto-dynpro-gui-status-generation.md`. The bundled FM
(`../bootstrap/ZAI_FM_SCREEN_GEN.func.abap`) is the verbatim, system-verified
implementation of everything above.
