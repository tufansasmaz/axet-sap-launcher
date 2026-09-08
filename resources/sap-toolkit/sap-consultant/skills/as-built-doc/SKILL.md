---
name: as-built-doc
description: >
  Use when existing SAP code has to be DOCUMENTED — a project is closing, a support
  team is taking a system over, or someone asks what a program, class, function
  module, table or package does and what it is made of. Reads the live system with
  the sap-adt tools, saves the evidence to disk, and writes an as-built technical
  document where every table and claim carries a verification tag and a source
  reference. The unit is whatever the consultant names: one object or a package.
  Triggers: "kodun dokümanını çıkar", "bu programı dokümante et", "devir teslim
  dokümanı", "mevcut geliştirmelerin dokümanı", "paketin dokümanı", "as-built",
  "document this program", "document the package", "handover document",
  "technical documentation of existing code". NOT the forward-looking TS written
  before development (ts-generator, which reads an FS). NOT a code review: this
  document introduces, it does not evaluate (abap-code-checker). NOT a user
  manual (office-manual).
author: "Beyhan Meyrali <beyhan.meyrali@nttdata.com>"
---

# as-built-doc — what the code IS, proved line by line

> **NTT Studio uyarlaması — MCP değil, HTTP.** Bu dağıtımda `sap-adt` skill'i ve `adt_*`
> MCP araçları YOK; aXet.code MCP konuşamıyor. Aynı araçlar `sap-adt-readonly` skill'inin
> anlattığı yerel HTTP sunucusundan çağrılır: aşağıda `adt_xxx` denen her yerde
> `POST http://127.0.0.1:8787/tool/adt_xxx` oku. Bu skill'in ihtiyacı olan
> `adt_search`, `adt_get_source`, `adt_list_package`, `adt_where_used`, `adt_revisions`,
> `adt_sql` araçlarının hepsi kapıdan geçiyor — yani belge üretimi eksiksiz çalışır.
> Yazma araçları `404 unknown_tool` döner; bu skill zaten hiçbirini kullanmıyor.

A project ends and the customer buys the knowledge, not the opinion. This skill
produces the document that hands it over: what a development is, what it does, what
it is made of, and where every sentence of that came from.

**Requires the `sap-adt` skill** (the `adt_*` MCP tools). Without it, stop and say
so — this reads a live system, and a document written from a folder of files says
nothing about what is actually active in the client.

Two things make this different from a summary an agent could improvise:

- **Every claim carries a tag and a source.** `[V]` verified from code, `[I]`
  inferred with the reasoning stated, `[S]` stated by a person, `[U]` not
  verifiable and why. A document that will be signed and paid against cannot
  contain a sentence nobody can trace.
- **The document introduces, it does not evaluate.** No risk, no defect, no
  recommendation, no test scenario. Full reasoning in
  [`references/standart.md`](references/standart.md) section 4 — this is the rule
  most often broken by accident, because judging is what a model does by reflex.

The authority for everything below is [`references/standart.md`](references/standart.md).
Read it before the first document of a project, not for every object.

---

## 1 · Resolve the scope before anything else

The consultant names a thing. Find out what it is and how far the document reaches.

```
adt_search <ad>            -> tip ve paket
adt_list_package <paket>   -> paket ise icerik
```

| what was named | what the document covers | profile |
|---|---|---|
| program, transaction, report | that entry point and the objects only it uses | **N** |
| class, function module, interface | the object, its interface, its callers | **N** |
| table, structure, data element, CDS view | the definition, and who writes and reads it | **N** |
| package | every entry point in it, plus the shared components | **P** |

An entry point plus the objects **only it** uses is a **development unit**. That
boundary is what keeps an inventory honest: an object used by two units is shared
and is counted once, in the shared section, not twice as if each unit owned it.
The ownership codes (`O` `S` `E` `X`) are in the standard, section 3.

State the resolved scope back to the consultant in one line and let them correct it
before you spend a system read on the wrong thing:

> `ZFI_REPORT_01` — executable program in package `ZFI000`. Profile N. Covers the
> program, its two includes and the selection screen; the class it calls is used by
> three other programs, so it will appear as a dependency, not as part of this unit.

## 2 · Read the project brief, do not ask what it already says

Delivery language, customer, system, namespace and document prefix come from the
project's own `CLAUDE.md` or brief. Ask **once**, only for what is genuinely
missing, and write the answers into the brief so the next document does not ask
again. Working language and delivery language are separate: a Turkish team
routinely ships an English document.

## 3 · Collect the evidence to disk, then write from disk

```
as-built/<HEDEF>/veri/       ham JSON — SAP'den ne okunduysa
as-built/<HEDEF>/uretilen/   script ciktisi
as-built/<DOKNO>_<HEDEF>_v1.0.md
```

Pull with the ADT tools and **save what comes back**:

| file | from | holds |
|---|---|---|
| `kapsam.json` | step 1 | resolved type, package, profile, the unit boundary |
| `nesneler.json` | `adt_list_package`, `adt_sql` on `TADIR` | the object set |
| `kaynak/` | `adt_get_source` | the sources actually read |
| `kullanim.json` | `adt_where_used` | who calls this, inside and outside the package |
| `transport.json` | `adt_sql` on `E070`/`E071` | requests, dates, owners |
| `surumler.json` | `adt_revisions` | version history |

**The document is generated from these files, not from the conversation.** Two
reasons, and the second is the one that bites: a second run must produce the same
document, and a reviewer asking "where does this number come from" has to be able
to open a file rather than trust a transcript.

> The object set comes from **`TADIR` / the package reader, never from a name
> prefix**. `ZFI*` finds objects that live in other packages and misses objects in
> this one that were named differently. This is the single most expensive mistake
> available here, because the resulting inventory looks complete.

Everything above reads. On the `sap-adt-readonly` surface, though, `adt_sql` is
pinned shut and cannot be opened — so `E070`/`E071` are out of reach and section
10.2 is closed with that as its reason rather than filled from a guess. Every other
step works unchanged.

## 4 · Let the script write the counting tables

```bash
py scripts/envanter.py as-built/<HEDEF>
```

It emits the inventory summary, the inventory detail and the transport table into
`uretilen/envanter.md`, ready to paste into sections 2 and 10.

**Do not write these tables by hand.** They are arithmetic over data already on
disk, and hand-written arithmetic fails every time it is edited — in the project
this discipline came from, four consecutive audit rounds were spent entirely on
totals that did not add up.

Paths above are written `scripts/…`. On an **installed** copy the managed block at
the top of this file carries a `SCRIPTS_DIR` line — run `<SCRIPTS_DIR>/…` instead.
In this repo they are `plugins/sap-consultant/skills/as-built-doc/scripts/`.

## 5 · Write the document

Copy the template and fill it:

- Profile N → [`references/sablon-nesne.md`](references/sablon-nesne.md)
- Profile P → [`references/sablon-paket.md`](references/sablon-paket.md)

Section numbers are **fixed**. A section that does not apply is not deleted — it is
closed in one line with the reason and the evidence:

```
7. INTEGRATION INVENTORY
   Not applicable - the unit has no RFC, proxy, OData, IDoc or file interface
   (TADIR scan: SPRX 0, IWSV 0, SRVB 0; no OPEN DATASET). [V]
```

A deleted section reads as a forgotten one. A page of empty "None" tables reads as
padding. One line does neither.

Two rules that are easier to break than to notice:

- **Reference the code, do not dump it.** `OBJECT › method/form › line`. A quotation
  only when the sentence cannot be written without it, at most ten lines, with a
  sentence saying why it is there.
- **Constant and message texts are copied, not paraphrased.** An invented message
  text ("general warning") is the kind of error a customer finds in five minutes.

## 6 · Mechanical check — before any human or agent reads it

```bash
py scripts/kontrol.py as-built/<DOKNO>_<HEDEF>_v1.0.md
```

Section map, template residue, missing evidence tags, counts that disagree with each
other, forbidden hedging, and sections that were removed from the standard but crept
back. Exit 0 is clean, 1 is a blocker, 2 is warnings only.

**Do not send a document to review before this passes.** A reviewer's attention is
the scarcest thing in this process, and spending it on arithmetic a script can do is
how real findings get missed.

## 7 · Independent audit — a reader who has not seen you write it

Start a **fresh subagent** and give it
[`references/denetci.md`](references/denetci.md) as its instructions plus the path to
the document. Not a re-read in this conversation: the author of a document carries
confirmation bias about it, and the whole value of this step is a reader who does
not already believe the document is right.

Verdict is `PASS`, `REVIZE` or `BLOCKER`. **Verify a finding before you act on it** —
an auditor can be wrong too, and a correct document edited to satisfy an incorrect
finding is worse than either.

## 8 · Render last

Markdown is the working format. When the text is settled, `office-docx` produces the
editable Word file and `office-pdf` the branded PDF. Convert at the end, in one go:
every conversion has to be re-checked for page layout, and doing it per revision
spends that check over and over.

## 9 · Boundaries

- **This document introduces, it does not evaluate.** If the consultant wants to
  know whether the code is any good, that is `abap-code-checker` — say so and offer
  it, rather than adding a risk section here. Anything you notice while reading goes
  in a **separate internal file**, never into the delivered document.
- **Nothing is written to SAP.** Every tool used here reads. If a document needs a
  system change to be true, that is a different job.
- **No number without a measurement.** "Runs in about two seconds" is a claim, and
  a static reading of code cannot support it.
- **`[U]` is an allowed answer.** Something a static read cannot see — a job
  schedule, a value that only exists at runtime — is written down as unverified,
  with what it would take to verify it. Guessing to avoid an empty cell is how a
  handover document becomes a liability.
- **A small object still gets a document.** "This package holds generated objects
  only" is itself a delivery. Skipping it is how a customer ends up asking why 248
  packages produced 140 documents.
