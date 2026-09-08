# As-built documentation standard

The authority for `as-built-doc`. Read it before the first document of a project.
Everything here was paid for by a document that had to be rewritten.

---

## 1. What this delivery is, and what it is not

| | |
|---|---|
| **Is** | Descriptive technical documentation of custom development that already exists, derived from the code. What it is, what it does, what it is made of. |
| **Is not — 1** | A design document for something about to be built. That one is forward-looking and reads a functional spec; this one reads a system. `ts-generator` writes it. |
| **Is not — 2** | A code review, quality report or risk analysis. The customer bought knowledge transfer. `abap-code-checker` is the tool that judges. |
| **Purpose** | Knowledge transfer, a support team taking the system over, and a delivery that can be signed against at project close. |
| **Primary reader** | The ABAP developer who will inherit this, and the technical architect. |
| **Secondary reader** | The customer's IT manager, who accepts it. |

**This is an acceptance document.** It gets signed, counted and questioned. Content
that *looks* right is not the standard; content that is *verified* is.

---

## 2. Profiles

The unit is what the consultant named, so the profile follows the shape of the
thing, not a page count.

| Profile | When | Sections |
|---|---|---|
| **N — Object** | One program, transaction, class, function module, interface, table, structure, data element or CDS view | 0, 1, 2 (short), 3, 4 (if it has DDIC of its own), 6, 7 (conditional), 8, 9 (conditional), 10, 11 |
| **P — Package** | A package: several entry points, shared components, an inventory worth tabulating | all |

Write the profile and the reason for it in section 0.1:

```
Document profile | N - object. Executable program with two includes, one selection screen.
Document profile | P - package. 23 objects, 3 development units, one OData service.
```

**A package with 50 or more narrative objects, or 8 or more development units, is
split into volumes** — section 6 is the part that grows, so the threshold counts
objects that carry logic and ignores data elements, domains and table types. Every
volume repeats section 0 so it can be signed on its own.

---

## 3. Development unit and ownership

A **development unit** is one entry point plus the objects **only it** uses.

Entry points: transaction code · executable program · background job program ·
RFC-enabled function module · OData service · UI5/BSP application · enhancement or
BAdI implementation · proxy service · form.

Every object row carries an ownership code. Delivery is often English, so the
letters are English everywhere, in every language of document:

| Code | Meaning | Counted where |
|---|---|---|
| `O` | **Owned** — created for this unit, no other unit uses it | in this unit's inventory |
| `S` | **Shared** — two or more units in the package use it | in shared components; the unit only references it |
| `E` | **External Z** — a Z object of another package, consumed | in dependencies; not in the inventory |
| `X` | **SAP standard** — read or called | in dependencies; not in the inventory |

> `O` is Owned, not Shared. Writing them the other way round is the most common
> single-character error in this document type; the mechanical check looks for it.

**An object is an inventory row in exactly one place.** A unit that lists another
package's objects as its own inflates the delivery and collapses the first time a
customer cross-checks two documents.

---

## 4. The document introduces, it does not evaluate

Not in the document, in any form:

- risk register, defect list, open points
- recommendations, "could be improved", "should be refactored"
- Clean Core assessment, technical debt
- test scenarios
- quality scoring

The customer bought a description of what exists. A finding smuggled into a
handover document is read as an admission by the party that wrote the code, and it
is read by people who did not ask for it.

**Where the findings go:** a separate internal file that is not delivered. If the
customer wants an assessment, that is a different engagement and
`abap-code-checker` is the tool for it.

**Neutral is not incomplete.** "The report has no authorisation check" is a fact
and belongs in section 8. "The report is missing an authorisation check" is a
judgement and does not. The difference is a verb, and it is the whole rule.

---

## 5. Fixed section map

Numbers are the same in every document whether or not the section has content.

| No | Section | N | P |
|---|---|:-:|:-:|
| 0 | Document control (0.1 information · 0.2 version history · 0.3 related documents · 0.4 scope and basis) | ● | ● |
| 1 | Summary | ● | ● |
| 2 | Scope and object inventory | ○ short | ● |
| 3 | Architecture and dependencies | ● | ● |
| 4 | Data dictionary | ◐ | ● |
| 5 | Shared components | ○ closed | ● |
| 6 | Development unit detail *(repeats per unit in P)* | ● | ● |
| 7 | Integration inventory | ◐ | ◐ |
| 8 | Authorisation model | ● | ● |
| 9 | Operations and support | ◐ | ◐ |
| 10 | Transport and version information | ● | ● |
| 11 | Annexes (glossary, screen layout, source index and method) | ● | ● |

● mandatory · ◐ mandatory if the relevant objects exist · ○ shortened or closed with a reason

**Both profiles carry all twelve sections.** The map says how much each one holds, not
whether it exists: a document that jumps from 4 to 6 reads as one with a section
missing, and the reader cannot tell which.

**A section that does not apply is closed, not deleted**, in one line carrying the
reason and the evidence tag. A deleted section reads as a forgotten one.

**Only a subsection with something to say is written.** A heading whose content
would be "none" is not given a heading; what it carries is folded into one closing
paragraph at the end of the unit:

> Nothing further to report for this unit. The report has no screen, so there are
> no UI events or function codes; it reaches nothing beyond the interface described
> above; it implements no enhancement or BAdI, and it writes no list or form.

Remaining subsections are renumbered without gaps. A gap in the numbering looks
like an omission.

**The glossary carries only terms specific to this development.** The reader knows
what OData, RFC, BAPI, PFCG and ICF are. Business terms, project-specific concepts
and local usages go in; general SAP vocabulary does not.

---

## 6. Evidence discipline

### 6.1 Verification tag

Every table and every paragraph containing a claim carries one:

| Tag | Meaning | Requires |
|---|---|---|
| `[V]` | **Verified** — read directly from the source or the dictionary | a source reference |
| `[I]` | **Inferred** — derived by reasoning, not stated anywhere | the reasoning, in a sentence |
| `[S]` | **Stated** — from a consultant or the customer | who said it and when |
| `[U]` | **Unverified** — a static read cannot see it | why not, and how it would be verified |

> The report reads only sales order items that have no rejection reason. `[V]` —
> `ZSD_ORDER_CLS` › `get_data` › line 214.

> The report is intended to run as an overnight batch job. `[I]` — it produces no
> screen output, uses the `SUBMIT ... VIA JOB` pattern, and checks `sy-batch`.

> The job runs nightly at 02:00. `[S]` — stated by the module consultant,
> 2026-08-20; not visible in the code.

> Whether the interface is still called by the external system could not be
> confirmed. `[U]` — the caller is outside this system; SM59 destination usage or
> the interface log would show it.

`[U]` is a legitimate answer. Guessing in order to avoid an empty cell is how a
handover document becomes a liability.

### 6.2 Source reference

`OBJECT_NAME` › `method/form/block` › `line`. **The code is referenced, not dumped.**
Where a quotation is unavoidable: at most ten lines, in a code block, with a
sentence saying what it is there to show.

### 6.3 Forbidden phrasing

*probably* · *apparently* · *presumably* · *it seems* · *may* / *might* without a
tag · "standard SAP behaviour" without a reference · any number (`~2 seconds`,
`about 50,000 rows`) without a measurement behind it.

Constant values and message texts are **copied, not paraphrased**. An invented
message text is found in five minutes.

### 6.4 Where the object set comes from

`TADIR` or the package reader. **Never a name prefix.** A prefix query finds
objects belonging to other packages and misses objects in this one that were named
differently — and the resulting inventory looks complete, which is what makes the
error expensive.

---

## 7. Voice

The document reads as though a person wrote it, because a person signs it.

- No trace of automation: no "generated on", no ISO timestamps in prose, no
  formulaic praise, no sentence that exists to fill a heading.
- Plain language without losing precision. The reader is an ABAP developer, not a
  layman; explaining what a BAPI is wastes their time. Piling on terminology to
  sound thorough wastes it differently.
- Ordinary sentences. A three-item list is not more true for having three items.
- Present tense for what the system does now. This document describes a state, not
  a project history.

---

## 8. Numbering and file name

```
<PREFIX>-TS-<MODULE>-<NNN>_<TARGET>_v<major>.<minor>.md
ALM-TS-FI-007_ZFI000_v1.0.md
```

`PREFIX` is the project's document prefix, from the brief. `MODULE` is the SAP
module or a functional grouping. `NNN` runs within the module and **is never
reused**: a document number that once meant something else is a document number
nobody trusts.

---

## 9. Before delivery

The mechanical items are the script's job (`scripts/kontrol.py`); the rest is the
auditor's. This list is what the two of them together must have covered.

1. Section numbers match the map; nothing deleted, nothing shifted.
2. No template residue: `<<`, `FILL:`, `TODO`, comment blocks, unfilled cells.
3. Every table and claim carries a tag; every `[V]` a source; every `[I]` a reason;
   every `[S]` a person and date; every `[U]` a why and a how.
4. Section 2 totals equal the detail rows equal the number in section 1.
5. Ownership codes correct; no object counted as an inventory row twice.
6. Message and constant texts are the real ones.
7. No risk, defect, recommendation, test scenario or quality judgement.
8. No forbidden phrasing; no number without a measurement.
9. Glossary carries only terms specific to this development.
10. The scope stated in 0.4 is the scope the document actually covers.
