# Adding new interface fields to an existing (populated) form context

Verified on DS4 with `ZSD_AF_BILLING_OUTPUT2`, 10.11.2026: fields `IS_HEADER-TERMS_EN` and
`IS_HEADER-TERMS_AR` added without SFP. Generator source: `bootstrap/ZND_FM_ADOBE_CTX.func.abap`.

## Problem

An SFP form context lists its fields one by one. When a field is added to a DDIC structure that
the interface uses, the **interface** picks it up but the **context** does not. The layout field
bound to `$record.IS_HEADER.TERMS_EN` then prints empty, and no error is raised.

`ZND_FM_ADOBE_GEN` cannot fix this: its `SYNC_CONTEXT` refuses a populated context, and
`SET_LAYOUT` writes only the XDP.

## Root cause (read in `CL_FP_WB_FORM` / `CL_FP_WB_HELPER` on DS4)

- `CL_FP_WB_FORM=>SAVE_OBJECT` serializes the context only when the form was loaded **without**
  delayed loading. Otherwise it writes back `m_context_raw`, the blob that was read from the DB.
- `CL_FP_WB_HELPER=>FORM_ACTIVATE` loads with `i_delayed_loading = 'X'`, in read mode, and so in
  practice the **active** version. It then re-writes that old blob, so the change is lost.
- `CL_FP_WB_FORM=>ACTIVATE` (static) loads the **inactive** version **without** delayed loading.
  The saved context therefore survives activation.

## The generator: `ZND_FM_ADOBE_CTX` (`$TMP`, function group `ZND_FG_AUTO_GEN`, RFC)

Same signature as `ZND_FM_ADOBE_GEN`, so `generate_adobe.py` calls it through `--fm-name`.
Only the modes `STATUS` (dry run) and `SYNC_CONTEXT` exist; the default is `STATUS`.

1. `CL_FP_WB_FORM=>LOAD` in write mode (no delayed loading).
2. For each node named in `param1` / `param2` (a structure or a loop) it calls `REFRESH`
   (`IF_FP_STRUCTURE~REFRESH` / `IF_FP_LOOP~REFRESH`), the API behind the refresh in SFP. That adds
   the missing DDIC components. Only the **new** nodes are set active; fields that were
   deactivated on purpose stay deactivated.
3. `SAVE`, `COMMIT`, then `CL_FP_WB_FORM=>ACTIVATE` (inactive version), then `GENERATE`.

## Install (once per system; say it writes to `$TMP`; never on PRD/QA)

The default FM is installed automatically, this one is not:

```
python <skills>/screen-gen/scripts/bootstrap_fm.py \
  --source-file bootstrap/ZND_FM_ADOBE_CTX.func.abap --fm-name ZND_FM_ADOBE_CTX \
  --fg-name ZND_FG_AUTO_GEN --description "Adobe form context refresh (RFC)" --cwd <project>
```

## Use

`--param1` / `--param2` name the context nodes to refresh. The CLI wants `NAME:DDIC_TYPE`; this
FM uses only the name, so the type after the colon is not read.

```
# 1) dry run - lists the new fields, saves nothing
python scripts/generate_adobe.py --form <FORM> --mode STATUS --fm-name ZND_FM_ADOBE_CTX \
    --param1 IS_HEADER:<TYPE> --param2 IT_ITEMS:<TYPE> --cwd <project>
# 2) real run - the form must NOT be open in SFP
python scripts/generate_adobe.py --form <FORM> --mode SYNC_CONTEXT --fm-name ZND_FM_ADOBE_CTX \
    --param1 IS_HEADER:<TYPE> --param2 IT_ITEMS:<TYPE> --transport <REQUEST> --cwd <project>
# 3) verify
python scripts/generate_adobe.py --form <FORM> --mode GET_CONTEXT --cwd <project>   # new fields listed
python scripts/generate_adobe.py --form <FORM> --mode STATUS --cwd <project>        # state A
python scripts/generate_adobe.py --form <FORM> --mode GET_LAYOUT --layout-file out.xdp --cwd <project>  # layout unchanged
```

Order: push the DDIC change, activate the structure, refresh the context, then upload the layout
that uses the field. Ask the user for the transport request; never invent one.

## Limits and notes

- At most two nodes per call; call it again for more.
- It only **adds**: a field removed or renamed in the DDIC structure does not leave the context.
  A duplicated or stale context is still repaired by hand (SFP, Context tab, delete the nodes,
  "Get from Interface").
- `GET_CONTEXT` shows two levels only. A loop shows `DATA`, not its columns. The dry run does
  list new loop columns, so use it to check tables.
- The form keeps its transport (the context goes into the same `R3TR SFPF` entry).
- If `SAVE` succeeds and `ACTIVATE` fails, the form is left in its inactive version with the lock
  released: read the message (it names the step), then run again or activate in SFP.
- `ZND_FM_ADOBE_CTX` is a local DEV tool in `$TMP`. It does not travel and is not needed in QA/PRD.
- Manual fallback: SFP, Context tab, drag the field from the interface pane to the context node,
  then save, activate and exit SFP.
