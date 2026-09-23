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
**apparent success differed from reality three times**:

| Reported | Reality | Caught by |
|---|---|---|
| "created and activated" | `state = I` (inactive) | `--mode STATUS` |
| "layout written" | layout unchanged | `--mode GET_LAYOUT` |
| "parameters added" | Context tab empty | `--mode GET_PARAMS` + user's screenshot |

That is why the diagnostic modes ship in production instead of being deleted after the
bug. Use them. After any WRITE or SET_PARAMS, run `--mode STATUS`.

## How it works (and why SOAP-RFC, not classrun)

The `CL_FP_WB_*` APIs need a **dialog context**. Called from `adt_classrun` they fail with
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

> **Duplicated nodes** (`Düğüm adı AUFNR benzersiz değil`, and SFP refusing to open the
> layout) mean `SYNC_CONTEXT` ran more than once while it still appended blindly. Confirm
> with `GET_CONTEXT`: each field will appear twice under its parent. The repair is manual,
> per the paragraph above.

## Installation: none — it installs itself

On the first call against a system that lacks it, the caller installs the generator FM
**`ZND_FM_ADOBE_GEN`** (function group **`ZND_FG_AUTO_GEN`**, shared with screen-gen)
into **`$TMP`**, already Remote-Enabled, and retries — no SE37 step, no transport,
cleanup is a SE37 delete. `ZNT_*` is reserved for kit tooling and never collides with
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

# 3. layout
python scripts/generate_adobe.py --form ZPM001_AF_ORDER --mode SET_LAYOUT \
  --layout-file order.xdp --cwd "C:\project"

# 4. ALWAYS verify
python scripts/generate_adobe.py --interface ZPM001_IF_ORDER --form ZPM001_AF_ORDER \
  --mode STATUS --cwd "C:\project"
```

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
