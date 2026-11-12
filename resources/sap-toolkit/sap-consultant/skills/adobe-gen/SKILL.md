---
name: adobe-gen
description: >
  Build Adobe Forms (SFPF) and Adobe Interfaces (SFPI) WITHOUT SFP — create, activate,
  add interface parameters, upload the XDP layout, and sync the form's context tree,
  via an RFC-enabled generator FM over the SOAP-RFC channel. ADT does not know these
  object types at all: they are absent from its supported type list, so create, read
  and write all fail there. Use when a development needs a print/output form, a form
  interface, or an interface+form pair in a customer package — and when an existing
  one must be inspected, since ADT cannot show it either.
  Triggers: Adobe Form, Adobe Interface, SFP, SFPF, SFPI, PDF form, print form,
  form interface, XDP, layout, form context, çıktı formu, form arayüzü, Adobe formu,
  fatura çıktısı, PDF çıktı, form bağlamı.
allowed-tools: Bash(python:*), Bash(py:*), Bash(cd:*), Read, Write, Edit, Grep, Glob
---

# Adobe Form + Interface Generator

**ADT cannot touch these objects.** `SFPF` and `SFPI` are absent from its object-type
list, so a developer who tries gets a 404 and reasonably concludes it is impossible. It
is not — it is *not through ADT*. SAP's own workbench API (package **`SAFPAPI`**) is fully
capable and is what SFP itself drives. This skill wraps it.

**First time, or stuck on something this page does not cover?**
[`references/worked-example.md`](references/worked-example.md) is the full record of one
form built end to end on a real system — every wrong turn, how each was diagnosed, and the
source-reading that produced the answer. Its §7 generalises beyond Adobe forms.

## The rule that governs everything here

> **Never believe a success message. Read the object back.**

ADT cannot display SFPI/SFPF, so there is no second opinion available — the only real
verification is asking the same API what it actually stored. While this skill was built,
**apparent success differed from reality five times**:

| Reported | Reality | Caught by |
|---|---|---|
| "created and activated" | `state = I` (inactive) | `--mode STATUS` |
| "layout written" | layout unchanged | `--mode GET_LAYOUT` |
| "parameters added" | Context tab empty | `--mode GET_PARAMS` + user's screenshot |
| `STATUS`: "context/interface compatible" | every field twice in the context; ADS returned an EMPTY page, static text included | **rendering the form** and looking at the PDF |
| "layout uploaded" | ADS kept serving the OLD design from its template cache | a fresh uuid on every upload, then a render |

That is why the diagnostic modes ship in production instead of being deleted after the
bug. Use them. After any WRITE or SET_PARAMS, run `--mode STATUS`.

**`STATUS` reads the objects; it does not run them. A form is done when it has been rendered through
ADS and the PDF looked at** — `references/render_test.abap` makes the PDF, `scripts/render_pdf_check.py`
rebuilds it from the classrun output and says whether ADS drew anything (an empty layout is about
4600 bytes; one filled page about 11 KB) and, with `--xdp`, whether it is YOUR layout. Without that step a form is only "reported fine".

## How it works (and why SOAP-RFC, not classrun)

The `CL_FP_WB_*` APIs need a **dialog context**. Called from an ADT class run (`IF_OO_ADT_CLASSRUN`) they fail with
`400 "Session Timed Out"` — the identical trap documented in **screen-gen**. The fix is
the same: an **RFC-enabled** wrapper FM (default **`ZND_FM_ADOBE_GEN`**) called over
**`/sap/bc/soap/rfc`**, which provides that context.

```
generate_adobe.py --> POST /sap/bc/soap/rfc --> ZND_FM_ADOBE_GEN (RFC)
                                                  |
                        cl_fp_interface=>create ──┤ in memory only
                        cl_fp_wb_interface=>create│
                                        ->save( ) │ <-- WITHOUT THIS NOTHING IS WRITTEN
                        cl_fp_wb_helper=>interface_activate( )
```

> **`CREATE` does not persist.** It builds an in-memory object in `INSERT` mode, state
> INACTIVE. `SAVE( )` is what writes it — verified by reading `CL_FP_WB_INTERFACE=>CREATE`'s
> own body.

### Activation: `CL_FP_WB_HELPER`, nothing else

SOAP-RFC gives a *dialog context* but **not a window system**, so the workbench's normal
activation path dies sending a dynpro (`Sending of dynpro SAPLSEWORKINGAREA 0205 not
possible`). The tempting escape — `RS_WORKING_OBJECT_ACTIVATE` with `UI_DECOUPLED='X'`,
SAP's "dark mode" — **returns `EV_RC=0` and leaves the object inactive** (state `I`);
that is the origin of "reported active, SFP shows inactive". The real answer is
**`CL_FP_WB_HELPER=>INTERFACE_ACTIVATE` / `FORM_ACTIVATE`**: a *global friend* of both
objects with public, dialog-free wrappers calling `LOAD_INTERNAL(...)->INT_ACTIVATE()`
directly. Undocumented — found by reading the source (worked-example §1–2).

## Modes

**Production**

| Mode | Does |
|---|---|
| `WRITE` | create interface + form, activate both |
| `READ` | existence, in SAP's own words |
| `DELETE` | form then interface (dependency order) |
| `SET_LAYOUT` | upload an `.xdp` (and set its layout type) |
| `SET_LAYOUT_TYPE` | fix only the layout type, leaving the XDP alone |
| `GET_LAYOUT` | download the `.xdp` |
| `SET_PARAMS` | add up to two import parameters to the interface |
| `GET_CONTEXT` | read the context tree back (verification) |
| `SYNC_CONTEXT` | build the form's context tree — **empty context only** |

**Verification** — `STATUS` (real A/I state, layout type, context/interface comparison) ·
`GET_PARAMS` · `GET_CONTEXT` · `RTTI_DEBUG` (a DDIC type's runtime kind and row type).

> Every activation that leaves the form consistent (`SET_LAYOUT`, `SYNC_CONTEXT`) is
> followed by `CL_FP_WB_FORM=>GENERATE`, so the **callable** `/1BCDWB/…` module exists
> and matches the context. A generate failure is reported as a note, not an error —
> when in doubt, check the generated FM's signature in `FUPARAREF`.

### A form with NO layout cannot be activated

**SAP will not activate a form that has no layout**, and the error names nothing useful
(`Nesne verilerini dönüştürme sırasında hata`, from `SAVE_OBJECT`'s
`CALL TRANSFORMATION`). This one missing default produced two long-lived illusions:
"template-free create is impossible", and the habit of always copying `--template` —
which drags the template's **context** along and is where `CALL_FUNCTION_CONFLICT_TYPE`
comes from later (next sections). Diagnosis by elimination: worked-example §9.1.

**Fixed by shipping a blank page.** `bootstrap/blank.xdp` (a 653-byte A4 XFA subform) is
applied automatically on a `WRITE` with no `--template`, which sets the layout type and
activates the form. Copy a template only when you actually want its design. The FM no
longer attempts the impossible pre-layout activation; it says so and leaves the form for
the layout step.

### The layout IS writable

`IF_FP_LAYOUT` carries **both** `GET_LAYOUT_DATA` and `SET_LAYOUT_DATA` — an earlier
version of this page claimed read-only, which was wrong and cost a manual step for no
reason (worked-example §3). The chain:

```
CL_FP_WB_FORM=>LOAD(i_dark=X) -> GET_OBJECT -> downcast IF_FP_FORM
  -> GET_LAYOUT -> GET/SET_LAYOUT_DATA (xstring) -> SAVE -> FORM_ACTIVATE
```

**The XDP is not the whole layout.** `FPLAYOUT.TYPE` is a separate field and
`SET_LAYOUT_DATA` does not touch it. Left empty it means *Unknown*, and the form then
behaves perfectly — active, correct on screen, `EV_RC=0` — until a human presses Save in
SFP and gets **FPUIFB101 "Layout type 'Unknown' is no longer valid"**. Valid values:
**`S` Standard** (print forms — the default here), `Z` ZCI, `A` xACF. `SET_LAYOUT` now
writes it every time; `--mode SET_LAYOUT_TYPE` repairs a form that predates this, and
`STATUS` warns when it is empty.

An XDP is an `xstring` and will not survive raw in a SOAP body, so it travels **base64**
(`CL_HTTP_UTILITY=>ENCODE_X_BASE64` ↔ Python `base64`). Expect the round trip to grow —
SAP adds XLIFF ids; growth is normal, identical byte counts would be the suspicious
result.

### SYNC_CONTEXT — parameters alone leave the Context tab empty

Adding interface parameters and writing a layout are **independent** of the form's own
context tree. SFP builds that tree when a human presses *"Get from Interface"*; the API
chain never triggers it. Without `SYNC_CONTEXT` the form is active, the layout is there,
the parameters are there — and the Context tab is blank.

`SYNC_CONTEXT` walks the parameter types with RTTI and creates the nodes:

- structure → `CREATE_STRUCTURE` + one `CREATE_DATA` per component
- table → `CREATE_LOOP`, then **`GET_LOOP_DATA( )`**, and the fields hang off *that*

> The loop step is the trap. `CREATE_LOOP` silently inserts a `CL_FP_LOOP_DATA` child, and
> SAP's own refresh puts fields under it. Attaching them to the loop node instead raises
> *"Nesne forma tayin edilmediğinden işlev yürütülemez"* (`OBJECT_NOT_IN_A_FORM`).

#### The callable FM is generated from the CONTEXT, not from the interface

This is the sentence that explains why the context matters at all, and it is not
obvious: when SAP generates the callable function module for a form, it takes the
signature from **the form's context tree**. The interface's parameters do not decide
it. The two can drift apart, and nothing on screen shows it — the interface reads
correctly, the form is active, the layout is right.

**`--template` is the easy way to drift.** A copied form inherits the template's
context. Point it at a different interface and you now have a form whose generated FM
expects the *old* structure and the *old* parameter names, while the interface
advertises the new ones. The caller then dies with `CALL_FUNCTION_CONFLICT_TYPE`,
pointing at a type mismatch that looks impossible from the code.

`--mode STATUS` compares the two and says so:

```
context/interface uyumlu [IS_HDR][IT_ITEM].
UYARI: context ile interface UYUSMUYOR - context [IS_HDR][IT_OPS], interface [IS_HDR][IT_ITEM] …
```

Repair is the manual one below — SFP → Context → delete the nodes → *"Get from
Interface"* — because `SYNC_CONTEXT` cannot rewrite a populated context.

#### It works ONCE, on an empty context — and cannot repair a full one

A hard SAP limit, not a gap in this skill: activation re-loads the form with delayed
loading, and `SAVE_OBJECT` then writes the **raw context blob from the database**
straight back over whatever you just saved (the `m_context_raw` ELSE branch — traced
line by line in worked-example §9.2). Saving through the same in-memory instance does
carry the change, but that activation path wants a window system. Pincer. An empty
context escapes it because `m_context_raw` is initial. So the mode refuses a populated
context with `EV_RC=4` instead of pretending.

**Build the context once, at creation time. To fix an existing one, delete the nodes in
SFP's Context tab and press "Get from Interface".** Use `--mode GET_CONTEXT` first to
see what is actually there.

> **One case is automated: NEW fields on a populated context** (a field was added to a DDIC
> structure the interface uses; the layout field prints empty and nothing errors). The static
> `CL_FP_WB_FORM=>ACTIVATE` loads the inactive version without delayed loading, so it does not
> hit the pincer above. A second generator, **`ZND_FM_ADOBE_CTX`** (`bootstrap/`, same
> signature, called with `--fm-name`), refreshes the named nodes, activates only the new ones
> and activates the form. Verified on DS4. It only adds: stale, renamed or duplicated nodes
> are still the manual repair. Install, dry run and verification:
> [`references/context-new-fields.md`](references/context-new-fields.md).

> **Duplicated nodes** (`Düğüm adı AUFNR benzersiz değil`, SFP refusing to open the
> layout, ADS returning an empty page) have two causes. (1) `SYNC_CONTEXT` ran more than
> once on a populated context. (2) **A single run on an empty context also doubled a
> structure's fields** (measured on a DEV system: 11 fields written, 22 nodes read back):
> `create_structure` and `create_loop` open the DDIC components as nodes themselves, and the
> old code then added each one again with `create_data`. The generator now counts the
> children the node already holds and skips its `create_data` loop when there are any, for
> a structure, for a loop's data node, and in both parameter slots. Confirm with
> `GET_CONTEXT`. The repair of an existing duplicated context is manual, per the paragraph above.
>
> **An FM installed before this fix still has the bug.** The generator is installed only when
> it is MISSING, so a system that already has `ZND_FM_ADOBE_GEN` keeps the old one. Delete that
> function module in SE37 (not the function group: screen-gen shares it) and the next call
> installs the fixed one, or install the bundled source under another name with
> `bootstrap_fm.py --fm-name` (see Installation) and pass `--fm-name` to this tool.
> `GET_CONTEXT` still lists only two levels (a loop shows `DATA`, not its fields), and `STATUS`
> does not look for repeated names — read the tree in SFP's Context tab, or render.

## Installation: none — it installs itself

On the first call against a system that lacks it, the caller installs the generator FM
**`ZND_FM_ADOBE_GEN`** (function group **`ZND_FG_AUTO_GEN`**, shared with screen-gen)
into **`$TMP`**, already Remote-Enabled, and retries — no SE37 step, no transport,
cleanup is a SE37 delete. The install is a tool, not one of the task's objects: "every
object in package X" does not forbid it — continue and name the FM in the final report. `ZNT_*` is reserved for kit tooling and never collides with
project WRICEF naming. The mechanism (`RPY_FUNCTIONMODULE_INSERT` with `REMOTE_CALL`,
and why ADT can't do this) is documented once, in
[`../screen-gen/SKILL.md`](../screen-gen/SKILL.md) § Installation.

To install deliberately (a different name, or a transportable package):

```bash
python <screen-gen>/scripts/bootstrap_fm.py   --source-file bootstrap/ZND_FM_ADOBE_GEN.func.abap   --fm-name ZND_FM_ADOBE_GEN --fg-name ZND_FG_AUTO_GEN --cwd "C:\project"
```

## Use

Ask the developer the standard three questions first — the API takes package and transport
as parameters, so guessing them writes to the wrong place:
**which module · which package · which request.**

```bash
# 1. objects
python scripts/generate_adobe.py --interface ZPM001_IF_ORDER --form ZPM001_AF_ORDER \
  --devclass ZPM001 --transport DS4K900067 --cwd "C:\project"

# 2. interface parameters, then the context tree they feed
python scripts/generate_adobe.py --interface ZPM001_IF_ORDER --mode SET_PARAMS \
  --param1 IS_HDR:ZPM001_S_HDR --param2 IT_OPS:ZPM001_TT_OP --cwd "C:\project"
python scripts/generate_adobe.py --interface ZPM001_IF_ORDER --form ZPM001_AF_ORDER \
  --mode SYNC_CONTEXT --param1 IS_HDR:ZPM001_S_HDR --param2 IT_OPS:ZPM001_TT_OP --cwd ...

# 3. layout -- lint first: ADS renders some broken layouts without an error
python scripts/xdp_lint.py order.xdp --locale tr_TR      # exit 1 = fix before uploading
python scripts/generate_adobe.py --form ZPM001_AF_ORDER --mode SET_LAYOUT \
  --layout-file order.xdp --cwd "C:\project"

# 4. ALWAYS verify
python scripts/generate_adobe.py --interface ZPM001_IF_ORDER --form ZPM001_AF_ORDER \
  --mode STATUS --cwd "C:\project"

# 5. render it (the real test): run references/render_test.abap as a classrun, save its output
python scripts/render_pdf_check.py classrun_output.txt --out order.pdf --xdp layout.xdp
#   exit 1 = looks empty OR is ANOTHER form (a cached template of someone else's layout)
```

**Always pass `--xdp` with the layout you uploaded.** A healthy-sized PDF can still be a different
form: ADS caches a template by the root `uuid`, and a customer's quotation once came back for a
label request. `--xdp` looks for your layout's own labels in the PDF text: none found is
`WRONG DOCUMENT`, and the fix is to upload again (a fresh uuid is written on every `SET_LAYOUT`) and
render again. If it says `IDENTITY NOT CHECKED` (no `pypdf`/`pymupdf` here), open the PDF and confirm
the headings are yours before telling the developer it is done. Never report "rendered" on size alone.

Order matters: `WRITE` → `SET_PARAMS` → `SYNC_CONTEXT` → layout → lint → `SET_LAYOUT` → render → `STATUS`.
**The base XDP and SFP.** A layout written by hand has no data schema (`dataDescription`), and the
table or fields it binds to data may then render empty. `xdp_lint.py` warns when it sees bound
fields and no schema. Do NOT send the developer into SFP up front: after `SYNC_CONTEXT`, `GET_LAYOUT`
and look for `dataDescription` in the XDP; if it is there, derive from that file and SFP is not needed.
Ask for SFP only when the lint warns, the render shows the bound fields empty, and `GET_LAYOUT` has no
schema — then ask the developer to open the form in SFP once and save it, and SAY WHY (that is how SFP
writes the schema), then `GET_LAYOUT` again and derive every later version from that file, changing
only `<template>`. (Whether `GET_LAYOUT` after `SYNC_CONTEXT` already carries the schema was not
measured; the lint and the render decide, not an assumption.) Changing the layout does not need
a new form. `DELETE` always removes the interface too: to delete only the form, pass an interface
name that does not exist (the form goes, the interface step reports "does not exist").
Layout patterns that held up, and five layout traps: [`references/design-pattern.md`](references/design-pattern.md).

## Naming

From the corporate standard (`ts-generator/references/NAMING_STANDARD.md`, rows 29–30) —
both are `<Prefix1><Module><PkgNo>_<Prefix2>_<Description>`, max 30 characters:

| Object | Prefix2 | Example |
|---|---|---|
| Adobe Form | `AF` | `ZSD001_AF_INVOICE` |
| Adobe Interface | `IF` | `ZSD001_IF_INVOICE` |

> ⚠ `IF` here is **Adobe Interface**, and it sits in the middle of the name. An ABAP
> interface class is `ZIF_…` with the prefix at the front. Do not conflate them.

A TS never carries a concrete package (standard §1.2) — it writes `<ZPKG>`, resolved by the
three questions above when work starts.

## Troubleshooting

| Symptom | Meaning | Fix |
|---|---|---|
| `fm_not_found` | install ran and still failed | read the message — it carries the install error |
| HTTP 404, no fault | `/sap/bc/soap/rfc` inactive | Activate the service in SICF |
| `EV_RC=4` | Object already existed — **left untouched** | Rename, or `--mode DELETE` first |
| `EV_RC=8` | Real failure | Read `EV_MESSAGE` — it carries SAP's exception text |
| Reported active, SFP shows inactive | the dark-mode trap | already fixed; verify with `STATUS` |
| Context tab empty | parameters ≠ context | run `SYNC_CONTEXT` (once, on an empty context) |
| `Düğüm adı X benzersiz değil` / layout won't open | context nodes duplicated | `GET_CONTEXT` to confirm, then repair in SFP — the API cannot rewrite a full context |
| **FPUIFB101** on Save in SFP | layout type is empty (*Unknown*) | `--mode SET_LAYOUT_TYPE --layout-type S` |
| PDF empty (about 4600 bytes) from a program, full in SFP's F8 | the form module was called without `/1BCDWB/DOCPARAMS` | pass `VALUE sfpdocparams( langu = sy-langu country = 'TR' )` on every call |
| PDF empty although `STATUS` says compatible | duplicated context nodes | see the note under SYNC_CONTEXT; render to confirm |
| the PDF still shows the OLD design after `SET_LAYOUT` | ADS template cache keyed on the XDP root's `uuid` | `SET_LAYOUT` now refreshes it; an XDP uploaded by another route needs a new uuid and timeStamp |
| item table or some fields empty | a hand-written XDP has no data schema (`xdp_lint.py` warns `data-schema`) | `GET_LAYOUT` and look for `dataDescription`; only if absent, have the developer open and save the form in SFP once, then derive from that XDP |
| `FM lock failed` on bootstrap | **two different causes wear this label** | see below |
| `OBJECT_NOT_IN_A_FORM` | fields attached to the loop node | attach to `GET_LOOP_DATA( )` |
| `CL_ABAP_ELEMDESCR is not compatible … CL_ABAP_STRUCTDESCR` | the table type's row type is broken, not the code | `RTTI_DEBUG` it: `lineKind=E` means the DDIC row type never bound. Re-PUT the table type with a proper `rowType` |

Two SAP quirks worth keeping in mind, both cost real time:

- **Explicit `CONV` at every type boundary.** `FPNAME` vs `E071-OBJ_NAME` vs `FPFIELD` vs
  `FPNODENAME` do not resolve implicitly across SOAP-RFC parameters.
- **`<tag/>` and `<tag></tag>` are not equivalent** to SAP's ADT XML parser. A self-closing
  empty element made a table-type PUT fail with *"System expected the element …"*.

## Boundaries

- Customer namespace only (`Z`, `Y`, `/`) — enforced before the call.
- A transportable package without `--transport` warns; **never fabricate a request**.
- `SET_PARAMS` / `SYNC_CONTEXT` take two parameter slots, not an arbitrary list — enough
  for the common header-structure + item-table pair.
- Designing the layout is still human work; this skill moves an existing `.xdp` in and out.
- A **render mode inside the generator FM was not added**: a `RENDER_TEST` mode would be new, uncompiled
  ABAP in the one function module every adobe-gen call depends on. The render test is a separate
  throw-away classrun (`references/render_test.abap`) so a mistake in it cannot break the generator.
