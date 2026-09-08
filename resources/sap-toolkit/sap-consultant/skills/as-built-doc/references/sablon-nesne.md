<!--
PROFILE N - one object. Copy, fill, delete this comment block.

Section numbers are fixed (standart.md section 5). A section that does not apply is
closed in one line with a reason and a tag, never deleted. A subsection whose content
would be "none" is not written as a heading; fold it into the closing paragraph of
section 6.

Every << >> is a placeholder. kontrol.py fails the document while any survive.
Written in English here because delivery usually is; if the project's delivery
language is Turkish, translate the headings and keep the numbering and the tags.
-->

<div align="center">

# TECHNICAL DOCUMENTATION (AS-BUILT)
## <<OBJECT>> — <<one-line title in business words>>

**NTT DATA Business Solutions** · **<<Customer>>**
Project: <<Project>>
System: **<<SID>> / <<client>>** · <<SAP release>>

<<DOCNO>> · v<<1.0>> · <<DD.MM.YYYY>> · **Confidential — Customer Restricted**

</div>

---

# 0. DOCUMENT CONTROL

## 0.1 Document Information `[V]`

| Attribute | Value |
|---|---|
| Document number | <<DOCNO>> |
| Document title | Technical Documentation (As-Built) — <<OBJECT>> |
| Document profile | N — object. <<what it is, in one clause>> |
| Customer | <<Customer>> |
| Project | <<Project>> |
| System / Client | <<SID>> / <<client>> (<<Development>>) — <<release>> |
| Object | <<OBJECT>> (<<TYPE>>) |
| Package (DEVCLASS) | <<PACKAGE>> |
| SAP module | <<MM — Materials Management>> |
| Version | <<1.0>> |
| Status | <<Draft>> |
| Classification | Confidential — Customer Restricted |
| Author | <<To be completed on release>> |
| Date | <<DD.MM.YYYY>> |
| Source baseline | <<SID>> active version, extracted on <<DD.MM.YYYY>> |

## 0.2 Version History

| Ver. | Date | Author | Change summary | Status |
|---|---|---|---|---|
| 1.0 | <<DD.MM.YYYY>> | <<To be completed on release>> | Initial release — as-built analysis | Current |

## 0.3 Related Documents

<<Documents covering the package this object belongs to, or the units that call it.
If there are none, say so in one line.>>

## 0.4 Scope and Basis

This document describes <<OBJECT>> as it exists in <<SID>> client <<client>> on
<<DD.MM.YYYY>>. It covers <<the object and the includes/screens only it uses>>.
Objects shared with other developments are named as dependencies in section 3 and
documented where they are owned.

The content was derived by reading the active source and the dictionary definitions
through the ADT interface. Claims carry a verification tag: `[V]` read from the
source, `[I]` inferred with the reasoning given, `[S]` stated by a named person,
`[U]` not verifiable by a static read. Section 11 lists what was read.

**What a static read cannot see** — carried into every document of this kind so the
reader knows the boundary: values that exist only at runtime, job schedules held in
the scheduler rather than the code, the actual content of external systems, whether
an interface still has a live caller, and data volumes. Anything in those categories
is tagged `[U]` with the way to confirm it.

---

# 1. SUMMARY

<<Three to six sentences. What this object is, what business job it does, what it
touches, and who calls it. No adjectives about quality. A reader who stops here
should be able to say what the thing is for.>> `[V]`

---

# 2. OBJECT INFORMATION

## 2.1 Object `[V]`

| Attribute | Value |
|---|---|
| Name | <<OBJECT>> |
| Type | <<PROG — executable program>> |
| Package | <<PACKAGE>> |
| Original system | <<SID>> |
| Created | <<date>> · <<user>> |
| Last changed | <<date>> · <<user>> |
| Transaction code | <<ZFI01 / none>> |

## 2.2 Parts of this unit `[V]`

<<Includes, screens, GUI statuses, local classes, the selection screen - the objects
that belong to this unit and nothing else. Ownership column per standart.md section 3.
Produced by scripts/envanter.py; do not write by hand.

envanter.py emits the summary and the detail as TWO tables under their own headings.
Profile N puts both under 2.2, so the detail table loses the heading that carried its
tag - give it a tagged lead-in line of its own, as below. A table with no tag is a
blocker in kontrol.py, and it was the one finding left on the first real document.>>

| Type | O | S | E | X | Total |
|---|:-:|:-:|:-:|:-:|---:|
| <<PROG>> | 1 | - | - | - | 1 |
| **TOTAL** | **1** | - | - | - | **1** |

Detail, one row per object `[V]`:

| Type | Name | Own. | Unit | Description | Request |
|---|---|:-:|:-:|---|---|
| <<PROG>> | `<<ZFI_REPORT_01>>` | O | DU-01 | <<what it is>> | <<NS4K900123>> |

---

# 3. ARCHITECTURE AND DEPENDENCIES

## 3.1 How it fits `[V]`

<<Where the object sits: called from what, calling what, reading and writing which
data. A short paragraph, or a simple layer list. No boxes-and-arrows for their own
sake.>>

## 3.2 Outbound — Z objects `[V]`

| Object | Type | Package | Used for |
|---|---|---|---|

## 3.3 Outbound — SAP standard `[V]`

| Object | Type | Used for |
|---|---|---|

## 3.4 Inbound — who calls this `[V]`

<<From adt_where_used. If nothing calls it, that is a finding of fact and is written
as such — with how it is started instead (transaction, job, menu).>>

---

# 4. DATA DICTIONARY

<<Only the DDIC objects this unit owns. A report that owns none closes the section in
one line. Types come from the dictionary definition, not from how the code declares
them — a field read as CHAR in code may be a domain-bound type.>>

| Object | Type | Key / length | Description |
|---|---|---|---|

---

# 5. SHARED COMPONENTS

Not applicable — this document covers a single object. Objects used by more than one
development unit are named as dependencies in section 3 and documented where they are
owned. `[V]`

---

# 6. DETAIL

## 6.1 What it does `[V]`

<<The processing, in order. Selection, checks, the main loop, what is written or
output. Reference the source per step: `OBJECT › block › line`. Not a line-by-line
transcription — the sequence a maintainer needs in order to find their way.>>

## 6.2 Input `[V]`

<<Selection screen fields or interface parameters: name, type, mandatory, default,
value help, validation. One table.>>

| Field | Type | Mand. | Default | Notes |
|---|---|:-:|---|---|

## 6.3 Data read and written `[V]`

| Table / view | Read | Write | Key used | Where |
|---|:-:|:-:|---|---|

## 6.4 Output `[V]`

<<ALV, list, file, form, IDoc, update to a table — whatever comes out, and its shape.>>

## 6.5 Messages `[V]`

<<Message class, number and the REAL text. Copied, never paraphrased.>>

| Class | No | Type | Text |
|---|---|:-:|---|

## 6.6 Closing paragraph

<<Everything that would have been a "none" heading, in one paragraph. Example:
"Nothing further to report for this unit. It has no enhancement or BAdI
implementation, reaches no external system, and writes no form.">>

---

# 7. INTEGRATION INVENTORY

<<RFC, proxy, OData, IDoc, file interface. If there are none, one line with the
evidence: "Not applicable — TADIR scan: SPRX 0, IWSV 0, SRVB 0; no OPEN DATASET
and no CALL FUNCTION ... DESTINATION." `[V]`>>

---

# 8. AUTHORISATION MODEL

## 8.1 Authorisation checks `[V]`

| Object | Fields checked | Where |
|---|---|---|

<<If the code performs no AUTHORITY-CHECK, that is stated as a fact — "The program
performs no explicit authorisation check; access is governed by the transaction
code's S_TCODE entry. `[V]`" — and not as a shortcoming. See standart.md §4.>>

---

# 9. OPERATIONS AND SUPPORT

<<Background job, log, restart behaviour, what an operator would need to know.
Job schedules held in the scheduler rather than the code are `[U]`.>>

---

# 10. TRANSPORT AND VERSION INFORMATION

## 10.1 Version history `[V]`

<<From adt_revisions: who changed it, when, in which request.>>

| Date | User | Request | Change |
|---|---|---|---|

## 10.2 Transport requests `[V]`

<<Produced by scripts/envanter.py from E070/E071. Do not write by hand.>>

| Request | Type | Date | Owner | Description | Status |
|---|---|---|---|---|---|

---

# 11. ANNEXES

## Annex A — Glossary

<<Only terms specific to this development. General SAP vocabulary is not listed.>>

## Annex B — Screen layout

<<Text wireframe of the selection screen or dialog, if there is one. Field names must
match section 6.2 exactly.>>

## Annex C — Sources and Method

| What | How it was obtained |
|---|---|
| Object set | <<adt_list_package / TADIR via adt_sql>> |
| Source | <<adt_get_source, active version, DD.MM.YYYY>> |
| Usage | <<adt_where_used>> |
| Version history | <<adt_revisions>> |
| Transports | <<E070/E071 via adt_sql>> |

<<Then the rows that were inferred rather than read: the claim, and the reasoning.>>
