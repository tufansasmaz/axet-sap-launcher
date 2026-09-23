---
name: abap-code-review
description: >
  Perform a comprehensive ABAP code review / code quality audit against NTT's
  corporate ABAP development standard (abap_core v2.0): include architecture
  (_TOP/_DEF/_IMP/_PBO/_PAI), naming conventions (g_/l_/m_ scope prefixes, DDIC
  suffixes), modern ABAP 7.40+ syntax, SQL performance rules, exception design
  (CX_STATIC_CHECK, TEXTID, GET_TEXT conversion trap), class design (SRP,
  interfaces, DI, static-vs-instance), authorization/locking/LUW, Clean Core
  compliance, data element/domain reuse, parallel processing (aRFC/bgRFC), unit
  test coverage, and the forbidden/obsolete keyword list. Use whenever the
  user asks to review, audit, check, or grade ABAP code/objects, invokes
  %abap-code-review, or asks "is this ABAP code compliant / clean / following our
  standards".
---

# ABAP Code Review (abap_core v2.0)

Audits ABAP source (report, class, function module, include, CDS, RAP object)
against NTT's ABAP Development & Code Review Guidelines. Read-only / advisory —
this skill never edits or pushes code, it only produces a review report.

## When to use this skill

- User asks to review/audit/check ABAP code they pasted, attached, or that
  lives in `src/` (abapGit layout) or was read via `sap-adt-readonly`.
- User explicitly types `%abap-code-review`.
- User asks whether code follows naming conventions, modern syntax, Clean Core,
  or is safe to release (SY-SUBRC checks, authorization, locking, SQL perf).

## How to use this skill

1. **Load the full standard** — read
   [references/ABAP_DEV_GUIDELINES.md](references/ABAP_DEV_GUIDELINES.md) in
   full before reviewing; it is the single source of truth for every rule
   below. Do not rely on the summary tables in this file alone for edge cases.
2. **Get the code** — if the user didn't paste it, locate it: local `src/*.abap`
   files (abapGit layout), or via `sap-adt-readonly`'s `adt_get_source` if the
   user wants a live SAP object read (read-only, never modify it there).
3. **Run the 15-point audit checklist** (guideline §12, extended with the header and pretty-printer checks) against the code:
   1. Include architecture (`_TOP`/`_DEF`/`_IMP`/`_PBO`/`_PAI` separation)
   2. Naming & scope prefixes (`g_`/`l_`/`m_`, DDIC suffixes `_S_`/`_TT_`/`_DE_`/`_DD_`/`_CV`)
   3. Performance (`SELECT *`, SQL in loops, missing `FOR ALL ENTRIES` guard, DB-side aggregation)
   4. Modern syntax (obsolete `MOVE`/`CONCATENATE`/`READ TABLE` → 7.40+ equivalents, `EXPORTING`+`CHANGING` rule §3.1.1)
   5. Error handling (unchecked `SY-SUBRC`, missing `ZCX_*` exceptions, `MESSAGE` inside classes, missing application log)
   6. Security (missing `AUTHORITY-CHECK`, missing locks, dynamic SQL/WHERE from user input)
   7. Clean Core (unreleased standard table/API access, standard object modification)
   8. Test coverage (presence/quality of `LTCL_*` ABAP Unit classes)
   9. Forbidden/obsolete keywords (guideline §10)
   10. **Program header / künye** (see below) — check it is present, at the very top of the main program, and complete
   11. **Indentation / Pretty Printer formatting** (see below) — check the code matches the mandatory formatting profile
   12. **Exception design** (guideline §15) — hierarchy choice (`CX_STATIC_CHECK`/`CX_DYNAMIC_CHECK`/`CX_NO_CHECK`), `TEXTID` usage, and the `GET_TEXT( )`/functional-call conversion trap
   13. **Class design** (guideline §16) — single responsibility, interface/DI usage, static-vs-instance method fit
   14. **DE/Domain reuse** (guideline §17) — new data elements/domains checked against existing ones before creation
   15. **Parallel processing** (guideline §18) — aRFC/bgRFC task limits, mandatory result collection, lock-partitioning, LUW discipline per task
4. **Report in this exact format** (guideline §12.9):
   - **Executive Summary** — overall verdict, risk level
   - **Critical Issues** — blockers (syntax-breaking, security, Clean Core violations)
   - **Clean Code Improvements** — style/naming/modern-syntax suggestions
   - **Refactored Code** — the corrected, complete code block
5. **If the user asks you to fix/change SAP objects directly** — this skill is
   advisory only. Point them at the `abapgit-workflow` skill (edit `src/` →
   export ZIP → SAPGUI import) for the compliant delivery path; never claim to
   have written to SAP.
6. When generating or modifying any object as part of a fix, prepend the
   **program header / künye** (see below) at the very top of the main program,
   filling in every mandatory field — never leave a placeholder unfilled.
7. **When a syntax/release rule is uncertain** — determine the connected
   system's real ABAP release (`SAP_BASIS` via `CVERS`, see
   [references/SAP_HELP_VERSION_LOOKUP.md](references/SAP_HELP_VERSION_LOOKUP.md))
   and verify against the release-matched SAP ABAP Keyword Documentation
   instead of assuming or using the "latest" docs blindly.

## Program header / künye (mandatory, top of main program)

Every main program MUST start with a header block following
[references/ABAP_PRG_DETAILS_TMP.md](references/ABAP_PRG_DETAILS_TMP.md). Use
that file as the exact template/format when generating or validating the
header — always check the header against it during a review.

The following fields are **mandatory** and must never be missing or left as a
placeholder — flag as a **Critical Issue** if any is absent, empty, or still
reads like a template placeholder (e.g. "Modül Adı", "Tarih Bilgisi"):

- **Modül Adı** (module name)
- **Tanım** (short program description)
- **Geliştirme/Modül Danışmanı** (functional/module consultant)
- **Uygulama Danışmanı** (ABAP/technical consultant)
- **Tarih** (date)

The other fields in the template (Süreç Kodu-Adı, Alt Süreç Kodu-Adı, FS
Doküman Nosu-Adı, Geliştirme No, Değişiklik Günlüğü block) should be present
following the template's structure, but fill them with best-effort information
(or leave the template's own placeholder) only when the mandatory fields above
are already complete. When generating new programs, always emit this header
before any other statement (`REPORT`/`PROGRAM` line included).

## Indentation / Pretty Printer formatting (mandatory)

All reviewed and generated ABAP code MUST conform to the following formatting
profile — equivalent to ADT's **Pretty Printer** with this exact settings
combination. Treat any violation as a **Clean Code Improvement** finding (or a
**Critical Issue** if the code is visibly unformatted/inconsistent enough to
hurt readability):

- **Indent** — statements must be properly indented per nesting level (one
  consistent indent step per `IF`/`LOOP`/`CASE`/`METHOD`/`TRY` block etc.);
  never flush-left nested logic.
- **Format functional method calls** — multi-parameter functional calls
  (`obj->meth( ... )`, `func( ... )`) must have each parameter assignment
  aligned/broken onto its own indented line when the call doesn't fit on one
  line, not crammed as a single unreadable line.
- **Compress one-line method calls** — a method call whose full parameter
  list fits on one line must stay compact on a single line (don't force a
  line break per parameter when unnecessary).
- **Format "VALUE"** — `VALUE #( ... )` constructor expressions must be
  formatted with proper line breaks/indentation for their component list,
  mirroring how ADT's Pretty Printer lays out `VALUE`.
- **Keyword case: uppercase** — all ABAP keywords (`IF`, `ENDIF`, `LOOP`,
  `DATA`, `METHOD`, `EXPORTING`, `CHANGING`, `SELECT`, etc.) must be
  **UPPERCASE**. Never lowercase or mixed-case keywords.
- **Do Not Convert Names** — identifiers (variable names, method names, class
  names, field names, literals) must be left **exactly as written** — never
  auto-uppercased or auto-lowercased by the reviewer/generator.

When producing **Refactored Code**, always apply this exact profile before
returning it. When reviewing existing code, flag any line/block that departs
from it (wrong keyword case, cramped functional calls that should wrap, wrapped
calls that should be compact, unindented `VALUE #( )`, renamed identifiers).

## Exception design, class design, DE/domain reuse & parallel processing (guideline §§15–18)

- **Exception hierarchy:** new `ZCX_*` classes default to `CX_STATIC_CHECK`;
  `CX_DYNAMIC_CHECK`/`CX_NO_CHECK` need a documented reason. Use `TEXTID`
  (`t100key`), never hardcoded exception text.
- **`GET_TEXT( )` conversion trap:** `lo_exception->get_text( )` /
  `IF_MESSAGE~GET_TEXT` return `TYPE string`. Never nest that call directly
  into a fixed-length formal parameter (e.g. `SYST_MSGV`) — wrap it in
  `CONV syst_msgv( ... )` or assign it to an intermediate variable first.
  Flag a violation as a **Critical Issue** (syntax-check-breaking).
- **Class design:** one responsibility per class (split data-access,
  business-logic, and presentation instead of building a single class that
  does everything); expose public APIs via `ZIF_*` interfaces; inject
  dependencies (constructor/setter) rather than instantiating them with `NEW`
  inside business logic; methods that never touch `m_*`/`me->` should be
  `CLASS-METHODS`.
- **DE/Domain reuse:** before creating `Z<MODULE>_DE_*`/`Z<MODULE>_DD_*`,
  search for an existing SAP standard or project data element/domain with the
  same meaning or value range (e.g. via `sap-adt-readonly`'s `adt_search`
  with `obj_type` `DTEL`/`DOMA`) — flag unchecked new DE/domain creation.
- **Parallel processing:** for large independent batch workloads, consider
  aRFC/bgRFC (`CALL FUNCTION ... STARTING NEW TASK`) with a bounded task
  count; every task's result MUST be collected via
  `RECEIVE RESULTS FROM FUNCTION` (never fire-and-forget); each task commits
  its own LUW; partition work by disjoint key ranges to avoid
  `ENQUEUE_EZ*` deadlocks; prefer DB-side (AMDP/CDS) parallelism when feasible.

## Quick reference (see the full guideline for exact rules/examples)

| Area | Key rule |
|---|---|
| Includes | `_TOP` globals/selscreen, `_DEF` class defs, `_IMP` class impl, `_PBO`/`_PAI` only for existing Dynpro |
| Scope prefix | `g_` global, `l_` local, `m_` class attribute |
| Type prefix | `v` value, `s` structure, `t` table, `o` object, `c` constant, `fs` field-symbol |
| Params | `i_`/`e_`/`c_`/`r_` + type letter (e.g. `iv_`, `it_`, `eo_`) |
| Declarations | `DATA(...)`, `NEW zcl_x( )`, `VALUE #( )`, `CORRESPONDING #( )`, `COND`/`SWITCH`/`FILTER`/`REDUCE` |
| `EXPORTING` | Mandatory explicit keyword the moment `CHANGING`/`RECEIVING` is also present in the same call |
| SQL | No `SELECT *`, no SQL in loops, guard `FOR ALL ENTRIES` with `IS NOT INITIAL`, push aggregation to DB |
| Errors | `ZCX_*` exceptions (`CX_STATIC_CHECK`), no `MESSAGE` in classes, BAL/SLG1 for background logging |
| Auth/Lock/LUW | `AUTHORITY-CHECK` everywhere, `ENQUEUE_EZ*`/`DEQUEUE_EZ*` pairs, `COMMIT WORK` only in top-level controller |
| Clean Core | Released APIs/CDS only, no standard object modification, no `$TMP` |
| Forbidden | `MOVE`, `COMPUTE`, `ADD`/`SUBTRACT`/`MULTIPLY`/`DIVIDE`, `CONCATENATE`, `TRANSLATE`, `SEARCH`, `CREATE OBJECT`, header-line tables, `EXEC SQL`, `FORM`/`PERFORM`, `WRITE` |
| Exceptions | `CX_STATIC_CHECK` default, `TEXTID` mandatory, never nest `GET_TEXT( )` into a fixed-length param |
| Class design | Single responsibility, `ZIF_*` interfaces, constructor/setter DI, static methods when no `m_*` access |
| DE/Domain | Search existing SAP/`Z*` data element or domain before creating a new one |
| Parallel processing | Bounded aRFC/bgRFC tasks, mandatory `RECEIVE RESULTS`, per-task LUW, disjoint key ranges |

## AI guardrails (guideline §11 — non-negotiable)

Write operations only in whitelisted DEV systems, only in `Z*` namespace, never
modify SAP standard objects, no DML without `WHERE`, no cross-client changes.
Human approval required for: DDIC changes on populated tables, object deletion,
transport release, changing another team's object. Never silently overwrite
existing code — report the diff before applying it.

## Reference documentation

| Topic | Reference |
|---|---|
| **Full ABAP development & review standard (18 sections)** | [references/ABAP_DEV_GUIDELINES.md](references/ABAP_DEV_GUIDELINES.md) |
| **Program header / künye template (mandatory)** | [references/ABAP_PRG_DETAILS_TMP.md](references/ABAP_PRG_DETAILS_TMP.md) |
| **Indentation / Pretty Printer profile (mandatory)** | See "Indentation / Pretty Printer formatting" section above |
| **Version-aware SAP Help / ABAP Keyword Documentation lookup** | [references/SAP_HELP_VERSION_LOOKUP.md](references/SAP_HELP_VERSION_LOOKUP.md) |
