# SKILL: Comprehensive SAP ABAP Development & Code Review Guidelines

**Version:** 2.0
**Owner:** ABAP Development Team
**Target Release:** ABAP 7.52+ / S/4HANA 2023
**Scope:** ABAP development performed via the AI development tool (DEV systems only)

---

## 1. Program Structure & Include Architecture

For Executable Reports and Dynpro-based applications, you must NEVER write all logic in a single file. Modularize the application using standard Includes as defined below:

- **Main Program:** `Z<MODULE>_<TOPIC>` (e.g., `ZSD_ORDER_MONITOR`)
  - **`_TOP` Include (`Z<MODULE>_<TOPIC>_TOP`):** Global variable declarations, Selection Screen definitions (`PARAMETERS`, `SELECT-OPTIONS`), and global constants.
  - **`_DEF` Include (`Z<MODULE>_<TOPIC>_DEF`):** Local Class Definitions (`CLASS lcl_<topic> DEFINITION...`), interface definitions, and method signature declarations.
  - **`_IMP` Include (`Z<MODULE>_<TOPIC>_IMP`):** Local Class Implementations (`CLASS lcl_<topic> IMPLEMENTATION...`), business logic, method execution, and internal algorithms.
  - **`_PBO` Include (`Z<MODULE>_<TOPIC>_PBO`):** Process Before Output modules for Dynpro screens (e.g., screen initialization, status setting, ALV display logic).
  - **`_PAI` Include (`Z<MODULE>_<TOPIC>_PAI`):** Process After Input modules for Dynpro screens (e.g., button clicks, user commands `sy-ucomm`, exit commands).

> **NOTE:** `_PBO` / `_PAI` Dynpro modules are allowed **only** when maintaining existing Dynpro-based programs. For **new** developments, use Fiori/UI5 (RAP or OData) or an ALV report; do not create new Dynpro screens.

---

## 2. Comprehensive Naming Conventions

### 2.1 ABAP Dictionary (SE11) & Core Data Services (CDS)
- **Database Tables:** `Z<MODULE>_T_<TOPIC>` (e.g., `ZSD_T_ORDERS`)
- **Structures:** `Z<MODULE>_S_<TOPIC>` (e.g., `ZSD_S_ORDER_HEADER`)
- **Table Types:** `Z<MODULE>_TT_<TOPIC>` (e.g., `ZSD_TT_ORDER_HEADER`)
- **Data Elements:** `Z<MODULE>_DE_<TOPIC>` (e.g., `ZSD_DE_ORDER_ID`)
- **Domains:** `Z<MODULE>_DD_<TOPIC>` (e.g., `ZSD_DD_ORDER_ID`)
- **CDS Data Definitions:** `Z<MODULE>_<TOPIC>_DD` (e.g., `ZSD_ORDER_INFO_DD`)
- **CDS Views:** `Z<MODULE>_<TOPIC>_CV` (e.g., `ZSD_ORDER_INFO_CV`)
- **Search Helps:** `Z<MODULE>_SH_<TOPIC>` (e.g., `ZSD_SH_ORDER_ID`)
- **Lock Objects:** `EZ<MODULE>_<TOPIC>` (e.g., `EZSD_ORDERS`)
- **Append Structures:** `Z<MODULE>_A_<TOPIC>`

### 2.2 Repository Objects
- **Executable Programs:** `Z<MODULE>_<TOPIC>` (e.g., `ZSD_ORDER_MONITOR`)
- **Global Classes:** `ZCL_<MODULE>_<TOPIC>`
- **Global Interfaces:** `ZIF_<MODULE>_<TOPIC>`
- **Exception Classes:** `ZCX_<MODULE>_<TOPIC>`
- **Function Groups:** `ZFG_<MODULE>_<TOPIC>`
- **Function Modules:** `Z_<MODULE>_<TOPIC>_<ACTION>`
- **Message Classes:** `Z<MODULE>_<TOPIC>`
- **Transaction Codes:** `Z<MODULE>_<TOPIC>`
- **Packages:** `Z<MODULE>_<TOPIC>` (never `$TMP`)
- **Number Range Objects:** `Z<MODULE>_<TOPIC>`
- **AMDP Classes:** `ZCL_<MODULE>_<TOPIC>_AMDP`
- **Enhancement Implementations:** `Z<MODULE>_<TOPIC>_EI`
- **BAdI Implementations:** `Z<MODULE>_<TOPIC>_BADI`

### 2.3 RAP Objects
- **Interface CDS View:** `ZR_<TOPIC>` (base/interface layer)
- **Projection View:** `ZC_<TOPIC>` (consumption layer)
- **Behavior Definition / Implementation:** same name as the CDS entity / `ZBP_R_<TOPIC>`
- **Service Definition:** `ZSD_<TOPIC>` / **Service Binding:** `ZSB_<TOPIC>`

### 2.4 Variable Naming & Scope Rules (STRICT PREFIX RULES)

Variables MUST be prefixed based on their **Scope + Type**:

#### A. Scope Prefixes
- **`g` (Global Scope):** Program-level and Function Group-level global variables (Declared in `_TOP` or Function Group TOP).
- **`l` (Local Scope):** Local variables inside Subroutines, Function Modules, or Class Methods.
- **`m` (Member / Attribute Scope):** Class instance/static attributes (Declared inside Class Definitions).

#### B. Type Prefixes (Appended to Scope)
- **`v`**: Primitive Values / Variables (e.g., `gv_vbeln`, `lv_kunnr`, `mv_status`)
- **`s`**: Structures / Work Areas (e.g., `gs_header`, `ls_item`, `ms_config`)
- **`t`**: Internal Tables (e.g., `gt_orders`, `lt_items`, `mt_data`)
- **`o`**: Object / Instance References (e.g., `go_alv`, `lo_handler`, `mo_service`)
- **`c`**: Constants (e.g., `gc_status_active`, `lc_max_rows`, `mc_default_lang`)
- **`fs`**: Field Symbols (e.g., `<fs_order>`, `<lfs_item>`)

#### C. Method / Function Parameters
- **Importing:** `iv_<name>`, `is_<name>`, `it_<name>`, `io_<name>`
- **Exporting:** `ev_<name>`, `es_<name>`, `et_<name>`, `eo_<name>`
- **Changing:** `cv_<name>`, `cs_<name>`, `ct_<name>`, `co_<name>`
- **Returning:** `rv_<name>`, `rs_<name>`, `rt_<name>`, `ro_<name>`

---

## 3. Modern ABAP (7.40+) Coding Rules Matrix

### 3.1 Declarations & Constructor Operators
- **Inline Declarations:** Always use inline declarations (`DATA(...)`, `FIELD-SYMBOL(...)`) for local variables.
- **Instance Creation:** Always use `NEW zcl_class( ... )` instead of `CREATE OBJECT`.
- **`VALUE` Operator:** Use `VALUE #( ... )` for populating structures and internal tables.
  - *Example:* `lt_data = VALUE #( ( col1 = 'A' col2 = '1' ) ( col1 = 'B' col2 = '2' ) ).`
- **`CORRESPONDING` Operator:** Use `CORRESPONDING #( ... )` or `CORRESPONDING #( BASE ( ... ) ... )` instead of `MOVE-CORRESPONDING`.
- **`CONV` & `EXACT`:** Use `CONV type( ... )` for explicit inline type conversions.

### 3.1.1 `EXPORTING` is MANDATORY when combined with `CHANGING` / `RECEIVING` (NON-NEGOTIABLE)

In a functional/operator-position method call `obj->meth( ... )` or `func( ... )`, the
`EXPORTING` keyword may be **omitted only** when the parenthesis contains **exclusively**
unnamed `IMPORTING`-parameter assignments and no other addition follows.

The moment the same call also carries a `CHANGING` or `RECEIVING` addition, `EXPORTING`
**MUST be written explicitly** in front of the importing-parameter assignments. Without it,
the ABAP parser cannot disambiguate where the importing list ends and `CHANGING` begins,
and the statement fails syntax check.

- ❌ **WRONG — missing `EXPORTING`, will NOT activate:**
  ```abap
  me->add_message( iv_msg_type = 'E' iv_msg_id = 'ZQM009' iv_msg_numb = '002'
                    iv_par1 = 'X' iv_par2 = space iv_par3 = space iv_par4 = space
                    CHANGING ct_return = mt_return ).
  ```
- ✅ **CORRECT — `EXPORTING` explicit because `CHANGING` is also present:**
  ```abap
  me->add_message( EXPORTING iv_msg_type = 'E' iv_msg_id = 'ZQM009' iv_msg_numb = '002'
                              iv_par1 = 'X' iv_par2 = space iv_par3 = space iv_par4 = space
                    CHANGING  ct_return = mt_return ).
  ```
- ✅ **CORRECT — `EXPORTING` may stay omitted only when NO `CHANGING`/`RECEIVING` follows:**
  ```abap
  lv_result = calculate( iv_a = 1 iv_b = 2 ).
  ```

**Before generating or reviewing any method call:** check the method's signature. If it
declares both `IMPORTING` and `CHANGING` (or `RECEIVING`) parameters and the call site
assigns any of the `IMPORTING` parameters, the call MUST spell out `EXPORTING`. Treat a
missing `EXPORTING` in this situation as a syntax-check-breaking defect, not a style
preference — verify every generated/refactored method call against this rule before
declaring the code complete.

### 3.2 Conditional Expressions & Reduction
- **`COND`:** Use `COND #( WHEN ... THEN ... ELSE ... )` instead of `IF...ELSEIF` in assignments.
- **`SWITCH`:** Use `SWITCH #( iv_code WHEN 'A' THEN 'Alpha' ELSE 'N/A' )` instead of `CASE...ENDCASE`.
- **`FILTER`:** Use `FILTER #( lt_table WHERE status = 'A' )` to filter internal tables.
- **`REDUCE`:** Use `REDUCE #( ... )` for aggregations or string concatenations over internal tables.

### 3.3 Table Expressions & Searching
- **Single Line Read:** Use `lt_table[ key = val ]` instead of `READ TABLE ... WITH KEY ...`.
- **Line Existence:** Use `IF line_exists( lt_table[ key = val ] ).`
- **Index Identification:** Use `line_index( lt_table[ key = val ] )`.
- **Safe Read:** Use `VALUE #( lt_table[ key = val ] OPTIONAL )` to prevent `CX_SY_ITAB_LINE_NOT_FOUND`.

### 3.4 String Processing
- **String Templates:** Always use `|Text { lv_var }|` instead of `CONCATENATE`.
- **Built-in Functions:** Prefer `to_upper()`, `to_lower()`, `trim()`, `condense()`, `contains()` over obsolete keywords.

---

## 4. ABAP SQL & Database Performance Rules

1. **Syntax Formatting:**
   - Use comma-separated field lists: `SELECT vbeln, posnr, matnr`
   - Escape host variables with `@`: `WHERE kunnr = @iv_kunnr`
   - Direct target inline table: `INTO TABLE @DATA(lt_result)`
2. **SQL Best Practices:**
   - **No `SELECT *`:** Always select explicit fields.
   - **No SQL in `LOOP`:** Never put database queries inside loops.
   - **`FOR ALL ENTRIES` Safeguard:** ALWAYS wrap `FOR ALL ENTRIES IN @lt_tab` with `IF lt_tab IS NOT INITIAL.`
   - **Database JOINs:** Prefer database `JOIN` statements over `FOR ALL ENTRIES` when possible.
   - **Aggregation in DB:** Push `SUM`, `COUNT`, `MAX`, `GROUP BY` down to the database instead of looping in ABAP.
   - **Sorted Access:** Use `SORTED`/`HASHED` internal tables or secondary keys for repeated key access.

---

## 5. Error Handling, Messages & Logging

- **Exception Classes:** Raise typed exceptions (`ZCX_<MODULE>_<TOPIC>`) inheriting from `CX_STATIC_CHECK`. Never use `SY-SUBRC` silently — always evaluate it.
- **No `MESSAGE` in Classes:** Global class methods must not issue `MESSAGE` statements. Return/raise the message and let the calling UI layer display it.
- **Message Classes:** All user-facing texts come from a message class (`T100`), never hardcoded strings.
- **Application Log:** For background jobs, interfaces, and mass processing, write to the Application Log (BAL / SLG1) with a dedicated log object/sub-object. `WRITE` is not a logging mechanism.
- **No Debug Leftovers:** `BREAK-POINT`, `BREAK <user>`, and hardcoded test values must never reach the transport.

---

## 6. Authorization, Locking & LUW Rules

- **Authorization:** Every report, service, and API entry point must perform an `AUTHORITY-CHECK` (or RAP authorization) before returning or changing data. Never rely on the transaction code alone.
- **Table Authorization:** Custom tables must be assigned an authorization group; generic table maintenance without a check is not allowed.
- **Locking:** Use `ENQUEUE_EZ*` / `DEQUEUE_EZ*` for any update logic. Every lock must have a matching unlock.
- **LUW Discipline:** No `COMMIT WORK` inside a FORM/METHOD called in update task, inside a loop over business objects, or inside a BAdI/exit. Commit only at the top-level controller.
- **BAPI Usage:** After a BAPI call, always evaluate the return table and call `BAPI_TRANSACTION_COMMIT` / `ROLLBACK` explicitly.

---

## 7. Texts, Translation & Output

- **No Hardcoded Literals:** Use text elements, text symbols, or OTR for all screen and list texts.
- **Language:** Code, comments, and object descriptions in English; end-user texts maintained in TR and EN.
- **ALV:** Use `CL_SALV_TABLE` / `CL_GUI_ALV_GRID`. `REUSE_ALV_GRID_DISPLAY` and `REUSE_ALV_LIST_DISPLAY` are obsolete for new development.
- **Units & Amounts:** Always carry currency/unit fields with amount/quantity fields and use `CURRENCY`/`QUANTITY` reference fields in DDIC.

---

## 8. Clean Core, Packages & Transport

- **Released APIs Only:** Consume only released SAP objects (C1 contract / released APIs). Do not read or write SAP standard tables directly when a released CDS view or API exists.
- **Reference:** Check object release status and available APIs on the SAP Business Accelerator Hub — https://api.sap.com — and via the release contract in ADT (Properties > API State). Prefer objects with API state *Released for Cloud Development* or *Use System-Internally (C1)*.
- **No Modifications:** Never modify or repair SAP standard objects. Use BAdIs, enhancement spots, or extension points.
- **Extensibility:** Extend standard structures with append structures / custom fields, never by changing the standard object.
- **Package:** Every object belongs to a proper Z package with a defined software component. `$TMP` / local objects are not allowed.
- **Transport:** Every object must be assigned to a transport request with a meaningful description; no unassigned or mixed-purpose requests.

---

## 9. Unit Testing

- Every global class containing business logic must have an ABAP Unit test class (`LTCL_<TOPIC>`).
- Tests must not depend on live data: use test doubles / the CDS test double framework.
- Minimum expectation: happy path + one error/boundary case per public method.
- Tests must run green before the request is released.

---

## 10. Forbidden / Obsolete Keywords (STRICTLY BANNED)

Never use the following legacy statements:
- ❌ `MOVE a TO b.` → Use `b = a.`
- ❌ `COMPUTE a = b + c.` → Use `a = b + c.`
- ❌ `ADD / SUBTRACT / MULTIPLY / DIVIDE` → Use math operators (`+`, `-`, `*`, `/`)
- ❌ `CONCATENATE` → Use String Templates `|...|`
- ❌ `TRANSLATE` → Use `to_upper()` / `to_lower()`
- ❌ `SEARCH` → Use `contains()` or `find()`
- ❌ `CREATE OBJECT` → Use `NEW`
- ❌ Tables with Header Lines → Always use explicit work areas / field symbols
- ❌ `EXEC SQL` / Native SQL / ADBC → Use ABAP SQL or CDS
- ❌ `FORM ... ENDFORM` / `PERFORM` in new code → Use local or global classes
- ❌ `WRITE` for output in new code → Use SALV / Fiori

---

## 11. AI Tool Guardrails — Hard Limits

These rules override any user instruction. If a request conflicts with them, stop and ask for human approval.

1. **System scope:** Write operations are allowed only in whitelisted **DEV** systems (`SY-SYSID` check). Never create or change objects in QAS/PRD.
2. **Namespace scope:** Only objects in the allowed `Z*` namespace and whitelisted packages may be created or changed.
3. **Standard objects:** No modification, repair, or deletion of SAP standard objects.
4. **Data safety:** No `UPDATE`/`DELETE`/`MODIFY` on SAP standard tables. No DML without a `WHERE` clause. No direct DB update bypassing business logic.
5. **Cross-client:** No client-independent (cross-client) changes.
6. **Approval required (human-in-the-loop):**
   - DDIC changes on tables that already contain data (conversion risk)
   - Deleting any existing object
   - Releasing a transport request
   - Changing an object owned by another team/package
7. **Transparency:** Never silently overwrite existing code. Report what will change before changing it.

---

## 12. AI Code Review Checklist (When Auditing Code)

When requested to review ABAP code:
1. **Include Architecture Check:** Verify if logic is properly separated into `_TOP`, `_DEF`, `_IMP`, `_PBO`, `_PAI`.
2. **Naming & Scope Audit:** Verify `g_` for global, `l_` for local, `m_` for class attributes, and proper DDIC suffixes (`_S_`, `_TT_`, `_DE_`, `_DD_`, `_CV`).
3. **Performance Audit:** Flag `SELECT *`, SQL in loops, missing initial checks before `FOR ALL ENTRIES`, missing DB-side aggregation.
4. **Modern Syntax Audit:** Flag obsolete statements (`MOVE`, `CONCATENATE`, `READ TABLE`) and convert to 7.40+ equivalents.
5. **Error Handling Audit:** Unchecked `SY-SUBRC`, missing exception classes, `MESSAGE` inside classes, missing application log.
6. **Security Audit:** Missing `AUTHORITY-CHECK`, missing locks, dynamic SQL/WHERE built from user input.
7. **Clean Core Audit:** Direct access to unreleased standard tables, standard object modification.
8. **Test Coverage:** Presence and quality of ABAP Unit tests.
9. **Formatting Audit:** Verify Pretty Printer profile (§14) — indent, functional-call formatting, `VALUE` formatting, uppercase keywords, names left unconverted.
10. **Exception Design Audit:** Verify exception hierarchy choice, `TEXTID` usage, and check for the `GET_TEXT( )`/functional-call conversion trap (§15).
11. **Class Design Audit:** Flag single-responsibility violations, missing interface/DI usage, and static/instance method mismatches (§16).
12. **DE/Domain Reuse Audit:** Confirm new data elements/domains were checked against existing ones before creation (§17).
13. **Parallel Processing Audit:** If mass/batch processing is present, verify aRFC/bgRFC task limits, result collection, and lock-partitioning (§18).
14. **Output Format:** Provide an Executive Summary, Critical Issues, Clean Code Improvements, and the complete Refactored Code.

---

## 13. Traceability Header

Every object created or changed by the AI tool must carry this header, so generated code can be found and audited later:

```abap
*&---------------------------------------------------------------------*
*& AI-GENERATED
*& Skill    : abap_core v2.0
*& User     : <SY-UNAME>
*& Date     : <YYYY-MM-DD>
*& Request  : <TRANSPORT>
*& Gates    : SYNTAX=? ATC=? AUNIT=? PERF=?
*&---------------------------------------------------------------------*
```

---

## 14. Indentation / Pretty Printer Formatting (MANDATORY)

All code generated or reviewed by the AI tool must conform to the following
formatting profile, equivalent to ADT's Pretty Printer with this exact
combination of settings:

- **Indent:** Statements must be properly indented per nesting level (one
  consistent indent step per `IF`/`LOOP`/`CASE`/`METHOD`/`TRY` block, etc.).
  Never leave nested logic flush-left.
- **Format functional method calls:** Multi-parameter functional calls
  (`obj->meth( ... )`, `func( ... )`) must have their parameter assignments
  aligned/broken onto separate indented lines when the call does not fit on
  one line.
- **Compress one-line method calls:** A method call whose full parameter list
  fits on one line must remain compact on a single line — do not force a line
  break per parameter when it is unnecessary.
- **Format `VALUE`:** `VALUE #( ... )` constructor expressions must be
  formatted with proper line breaks and indentation for their component list.
- **Keyword case — Uppercase Keyword:** All ABAP keywords (`IF`, `ENDIF`,
  `LOOP`, `DATA`, `METHOD`, `EXPORTING`, `CHANGING`, `SELECT`, etc.) must be
  written in **UPPERCASE**. Lowercase or mixed-case keywords are not allowed.
- **Do Not Convert Names:** Identifiers — variable names, method names, class
  names, field names, literals — must be left exactly as written. The
  formatter/reviewer must never auto-uppercase or auto-lowercase names.

This profile is non-negotiable for both AI-generated code and code review
findings: flag any deviation as a Clean Code Improvement (or a Critical Issue
when the inconsistency materially hurts readability), and always apply this
profile before returning any Refactored Code.

---

## 15. Exception Handling — Detailed Rules

### 15.1 Exception Class Hierarchy Choice
- **`CX_STATIC_CHECK`** — default choice for new `ZCX_<MODULE>_<TOPIC>` exception
  classes. The compiler forces every caller to either `CATCH` or declare
  `RAISING`, which is what business/validation errors need (the caller must
  not be able to silently ignore them).
- **`CX_DYNAMIC_CHECK`** — only for exceptional cases where catching must stay
  optional at compile time. Use sparingly and justify the choice in a comment;
  it is easy to accidentally swallow the error.
- **`CX_NO_CHECK`** — reserved for technical/system-level failures the caller
  genuinely cannot react to (mirrors how SAP standard exceptions like
  `CX_SY_*` are typically raised). Do not use it for business logic errors.
- **Rule:** Any new `ZCX_*` class MUST derive from `CX_STATIC_CHECK` unless
  there is a documented reason to pick `CX_DYNAMIC_CHECK` or `CX_NO_CHECK`.

### 15.2 Text ID / Message Text
- Exceptions must carry a `TEXTID` (`t100key`) linked to the message class —
  never a hardcoded string passed to the constructor.
- Constructor pattern:
  ```abap
  METHOD constructor.
    super->constructor( textid = textid ).
    CLEAR me->textid.
    IF textid IS INITIAL.
      me->textid = zcx_zqm009_error.
    ELSE.
      me->textid = textid.
    ENDIF.
  ENDMETHOD.
  ```

### 15.3 The `GET_TEXT( )` / Functional-Call Conversion Trap
- `lo_exception->get_text( )` and any `IF_MESSAGE~GET_TEXT` call return
  **`TYPE string`** (unlimited length).
- ABAP **cannot** pass that functional-method result directly into a formal
  parameter of a fixed-length type (`SYST_MSGV`, `SY-MSGV1..4`, `CHAR n`,
  etc.) when nested inside another call's parameter list — this fails the
  syntax check with *"Result type of the functional method ... cannot be
  converted into the type of formal parameter ..."*.
- **Mandatory fix pattern** — never nest the call; convert or pre-assign it:
  ```abap
  " ❌ WRONG — nested functional call into a fixed-length formal parameter
  me->add_message( EXPORTING iv_par1 = lo_root->get_text( ) ... ).

  " ✅ CORRECT — explicit CONV
  me->add_message( EXPORTING iv_par1 = CONV syst_msgv( lo_root->get_text( ) ) ... ).

  " ✅ CORRECT — intermediate variable (also lets you handle truncation)
  DATA(lv_text) = lo_root->get_text( ).
  me->add_message( EXPORTING iv_par1 = lv_text ... ).
  ```
- **Review checklist item:** flag any nested `get_text( )` (or other
  `string`-returning functional call) passed directly into a fixed-length
  formal parameter as a **Critical Issue** — it is syntax-check-breaking, not
  a style preference.

### 15.4 Centralized Handling
- Use a single `TRY ... CATCH cx_root INTO DATA(lo_error)` at the
  controller/entry-point level; never leave an empty `CATCH` block (silent
  swallow) — at minimum, write the error to the Application Log (§5).
- Lower-level methods should propagate failures via `RAISING`/
  `RAISE EXCEPTION TYPE`, not by nesting `TRY` blocks inside business logic.

---

## 16. Class Design

### 16.1 Single Responsibility
- A class must not simultaneously own data access, business logic, and
  UI/ALV presentation. Split responsibilities into distinct
  classes/local classes (e.g. a DAO layer, a business-logic layer, and a
  presentation layer), even inside a single main program's includes.
- Flag "god classes" that mix `get_data`, `screen_output`/ALV handling, and
  message building in one class as a Clean Code Improvement — recommend
  splitting into at least a data-access class, a business-logic class, and a
  presentation/ALV class.

### 16.2 Interface-First Design
- Public APIs consumed by other objects (or that need test doubles) should be
  exposed behind a `ZIF_<MODULE>_<TOPIC>` interface, not a concrete class
  reference.

### 16.3 Dependency Injection
- Global classes must receive their dependencies (DB access, external
  services, other collaborators) via constructor or setter injection using
  interface references — not by instantiating concrete dependencies with
  `NEW zcl_x( )` directly inside business logic. Tight coupling like this
  blocks unit testing (§9) because no test double can be injected.

### 16.4 Static vs. Instance Methods
- A method that does not read or write any instance attribute (`m_*`) should
  be `CLASS-METHODS` (static).
- A method that participates in the object's state/business flow (reads or
  mutates `m_*` attributes) must stay an instance method.
- **Review rule:** if a method body never references `m_*`/`me->`, flag it as
  a candidate for `CLASS-METHODS`.

### 16.5 Encapsulation
- Attributes default to `PRIVATE` or `PROTECTED`. Expose `PUBLIC` attributes
  only when there is no meaningful getter/setter boundary to enforce.
- Prefer constructor injection over public setters to keep objects immutable
  once built, where practical.

### 16.6 Report-Controller Pattern (Legacy Note)
- The single "do everything" report-controller class pattern (one class
  handling data retrieval, business rules, and ALV/screen logic together) is
  not recommended for new development. When reviewing or refactoring such a
  class, propose splitting it into at minimum: a data-access class, a
  business-logic class, and a presentation/ALV class.

---

## 17. Data Element & Domain Reuse

- **Mandatory pre-check:** Before creating a new `Z<MODULE>_DE_<TOPIC>` data
  element or `Z<MODULE>_DD_<TOPIC>` domain, search for an existing SAP
  standard or project `Z*` data element/domain that already covers the same
  business meaning (e.g. `KUNNR`, `MATNR`, `VBELN` and their standard data
  elements) — do not recreate what already exists.
- **Domain value range check:** Do not create a new domain with a fixed-value
  list that duplicates an existing domain's value range (e.g. status codes).
  Either reuse/extend the existing domain's fixed values or reference it.
- **How to check (via the `sap-adt-readonly` skill):** search for existing
  data elements/domains before creating new ones, e.g.
  `adt_search` with `{"query":"Z*","obj_type":"DTEL"}` (data elements) or
  `{"obj_type":"DOMA"}` (domains), scoped to the relevant module prefix.
- **Review checklist item:** whenever new code introduces a new DE/domain,
  confirm a reuse search was performed and documented; if not, flag it as a
  Clean Code Improvement.

---

## 18. Parallel Processing

- **When to use:** For large-volume, independent (mass/batch) units of work
  (e.g. per-material or per-order bulk updates), evaluate asynchronous RFC
  (aRFC) or background RFC (bgRFC) instead of a single sequential `LOOP`.
- **Task submission:** When using `CALL FUNCTION ... STARTING NEW TASK`, cap
  the number of concurrently submitted tasks (e.g. via a counter/`SY-INDEX`
  against a configured limit) — never submit an unbounded number of tasks.
- **Result collection is mandatory:** Every asynchronous task must be
  collected via `RECEIVE RESULTS FROM FUNCTION`. "Fire and forget" without
  collecting results is forbidden — it risks losing errors silently.
- **LUW discipline:** Each parallel task manages its own LUW and commits
  independently; a parallel task must never assume or share the calling
  program's `COMMIT WORK` (see §6 LUW Discipline).
- **Lock/deadlock safety:** Partition work across tasks by disjoint key
  ranges so that no two parallel tasks contend for the same
  `ENQUEUE_EZ*` lock. Review any parallelized loop for potential deadlocks
  between tasks.
- **Prefer DB-side parallelism when possible:** If the workload can be
  pushed to the database (AMDP, CDS with aggregation), prefer that over
  ABAP-level parallel processing.
