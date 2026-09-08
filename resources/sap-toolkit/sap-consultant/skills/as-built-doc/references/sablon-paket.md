<!--
PROFILE P - one package. Copy, fill, delete this comment block.

Section 6 REPEATS: one block per development unit (entry point + the objects only it
uses). Objects used by two or more units belong to section 5, not to any unit.

Section numbers are fixed (standart.md section 5). A section that does not apply is
closed in one line with a reason and a tag, never deleted.

Sections 2.2, 2.4 and 10.2 are produced by scripts/envanter.py. Do not write them by
hand: they are arithmetic over data already on disk, and hand-written arithmetic
fails every time the document is edited.

Every << >> is a placeholder. kontrol.py fails the document while any survive.
-->

<div align="center">

# TECHNICAL DOCUMENTATION (AS-BUILT)
## <<PACKAGE>> — <<one-line title in business words>>

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
| Document title | Technical Documentation (As-Built) — <<PACKAGE>> |
| Document profile | P — package. <<23 objects, 3 development units, one OData service>> |
| Volume | <<Single volume — 23 objects>> |
| Customer | <<Customer>> |
| Project | <<Project>> |
| System / Client | <<SID>> / <<client>> (<<Development>>) — <<release>> |
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

<<Documents for packages this one depends on, or that depend on it.>>

## 0.4 Scope and Basis

This document describes package <<PACKAGE>> as it exists in <<SID>> client
<<client>> on <<DD.MM.YYYY>>. The object set was taken from TADIR; objects belonging
to other packages appear as dependencies in section 3 and are documented where they
are owned.

The content was derived by reading the active source and the dictionary definitions
through the ADT interface. Claims carry a verification tag: `[V]` read from the
source, `[I]` inferred with the reasoning given, `[S]` stated by a named person,
`[U]` not verifiable by a static read. Annex C lists what was read.

**What a static read cannot see:** values that exist only at runtime, job schedules
held in the scheduler rather than the code, the content of external systems, whether
an interface still has a live caller, and data volumes. Anything in those categories
is tagged `[U]` with the way to confirm it.

---

# 1. SUMMARY

<<What this package is for, in business terms. How many development units and what
each one does, in a sentence each. What the package integrates with. Numbers here
must equal the tables in section 2 — the mechanical check compares them.>> `[V]`

---

# 2. PACKAGE INFORMATION AND OBJECT INVENTORY

## 2.1 Package `[V]`

| Attribute | Value |
|---|---|
| Package | <<PACKAGE>> |
| Description | <<from TDEVC>> |
| Superpackage | <<parent>> |
| Software component | <<HOME>> |
| Transport layer | <<ZDEV>> |
| Original system | <<SID>> |

## 2.2 Object Inventory — Summary `[V]`

<<scripts/envanter.py output. Type × ownership × total.>>

## 2.3 Development Units `[V]`

| ID | Entry point | Type | What it does | Objects |
|---|---|---|---|---|
| DU-01 | <<ZFI_REPORT_01>> | PROG | <<one clause>> | <<7>> |

## 2.4 Object Inventory — Detail `[V]`

<<scripts/envanter.py output. One row per object: type, name, ownership, unit,
transport.>>

---

# 3. ARCHITECTURE AND DEPENDENCIES

## 3.1 Layer map `[V]`

<<How the package is put together: entry points, the logic layer, the data layer,
what is shared. A paragraph and a simple list beat a diagram nobody can update.>>

## 3.2 Outbound — other Z packages `[V]`

| Object | Type | Package | Used by | Used for |
|---|---|---|---|---|

## 3.3 SAP standard objects consumed `[V]`

| Object | Type | Used by | Used for |
|---|---|---|---|

## 3.4 Inbound — who uses this package `[V]`

<<From adt_where_used run OUTSIDE the package. Do not write "no external
dependency" without having looked: that claim is only worth what the search behind
it was.>>

---

# 4. DATA DICTIONARY

## 4.1 Tables `[V]`

<<Per table: key, fields, types from the DICTIONARY definition, delivery class,
maintenance. Not from how the code declares them.>>

## 4.2 Structures and table types `[V]`

## 4.3 Data elements and domains `[V]`

<<Fixed values are copied verbatim, never paraphrased.>>

## 4.4 CDS views `[V]`

## 4.5 Search helps, lock objects, number ranges `[V]`

<<Object types absent from this package are collapsed into one line:
"Not present in this package: search help, lock object, number range.">>

---

# 5. SHARED COMPONENTS

<<Objects used by two or more development units. Each is listed ONCE here; the units
reference it. This section is what keeps the inventory honest.>>

## 5.1 Shared classes `[V]`

## 5.2 Shared function modules `[V]`

## 5.3 Message classes `[V]`

| Class | No | Type | Text |
|---|---|:-:|---|

## 5.4 Shared tables and constants `[V]`

---

# 6. DEVELOPMENT UNIT DETAILS

<!-- REPEATS. One block per unit. Only subsections with something to say get a
heading; the rest fold into the closing paragraph. Renumber without gaps. -->

## 6.1 DU-01 — <<ZFI_REPORT_01>> · <<title>>

### 6.1.1 Purpose and owned objects `[V]`

<<What this unit does, and the objects it owns. The object count must match section
2.3.>>

### 6.1.2 Processing `[V]`

<<The flow in order, with source references: `OBJECT › block › line`.>>

### 6.1.3 Input `[V]`

| Field | Type | Mand. | Default | Notes |
|---|---|:-:|---|---|

### 6.1.4 Data read and written `[V]`

| Table / view | Read | Write | Key used | Where |
|---|:-:|:-:|---|---|

### 6.1.5 Output `[V]`

### 6.1.6 Messages `[V]`

### 6.1.7 Closing paragraph

<<Everything that would have been a "none" heading, in one paragraph.>>

## 6.2 DU-02 — <<next unit>>

<<Same shape.>>

---

# 7. INTEGRATION INVENTORY

<<RFC, proxy, OData, IDoc, file interface — per interface: direction, partner,
trigger, payload, error handling. If there are none, one line with the TADIR
evidence.>>

---

# 8. AUTHORISATION MODEL

## 8.1 Authorisation objects checked `[V]`

| Object | Fields | Checked in |
|---|---|---|

## 8.2 Custom authorisation objects `[V]`

<<Z authorisation objects owned by this package, if any.>>

---

# 9. OPERATIONS AND SUPPORT

<<Background jobs, logs, restart behaviour, housekeeping, what a support team needs
on day one.>>

---

# 10. TRANSPORT AND VERSION INFORMATION

## 10.1 Version summary `[V]`

<<When the package was first created and last changed, and by whom.>>

## 10.2 Transport Requests `[V]`

<<scripts/envanter.py output from E070/E071. Do not write by hand.>>

---

# 11. ANNEXES

## Annex A — Glossary

<<Only terms specific to this development.>>

## Annex B — Screen layouts

<<Text wireframes. Field names must match the 6.n.3 tables exactly.>>

## Annex C — Sources and Method

| What | How it was obtained |
|---|---|
| Object set | TADIR, DEVCLASS = <<PACKAGE>>, extracted <<DD.MM.YYYY>> |
| Source | adt_get_source, active version |
| Usage | adt_where_used |
| Version history | adt_revisions |
| Transports | E070/E071 via adt_sql |

<<Then the rows that were inferred rather than read: the claim, and the reasoning.>>
