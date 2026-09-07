# The six gates — exact calls, and what each one does not prove

Every gate answers a narrow question. The value of the board comes from the gates being
narrow and honest, not from them being reassuring. Read the "does not prove" column of
each section before you write a summary sentence.

---

## G1 · Sözdizimi — `adt_syntax_check`

```
adt_syntax_check(name="ZCL_SD_DELIVERY_ADDR", object_type="class")
→ {ok, valid, errors, warnings}
```

Checks the object **as it exists on the system**, including its inactive version. To check
source you have not pushed yet, you have to push it first — which is a write, which needs
an approval and a transport. So on a review of un-pushed source, this gate is `not-run`,
and you say so.

**Proves:** it compiles against this system's dictionary and this system's releases.

**Does not prove:** anything about behaviour. A method that returns the wrong value
compiles perfectly. Do not let a green G1 anywhere near the summary sentence.

Record: `--status pass|fail --detail "0 hata, 2 uyarı" --raw .tmp/syn.txt`

Syntax *warnings* are not nothing — `--detail` carries the count, and a warning that names
an obsolete statement usually becomes a G4 finding.

---

## G2 · ATC — `adt_atc_check`

```
adt_atc_check(name="ZCL_SD_DELIVERY_ADDR", object_type="class", variant="ZNTT_DEFAULT")
→ {ok, findings:[{priority, check, message, location}...]}
```

**Find the customer's variant before you run this.** `DEFAULT` is SAP's variant. Most
NTT customers maintain their own (`ZNTT_*`, `Z<CUST>_*`, or the SAP `S4HANA_READINESS`
variant during a conversion). Ask the lead once, then it is a project constant.

`quality.py` downgrades a `DEFAULT` pass to ⚠️ automatically. That is not pedantry: a clean
run on the wrong ruleset is the single most common way a review produces a false green.

**Priority mapping is fixed:**

| ATC priority | Severity | Meaning |
|---|---|---|
| 1 | `blocker` | must not be released |
| 2 | `major` | fix now unless there is a written reason |
| 3–4 | `minor` | fix when the file is open anyway |

Pass `--atc-priority` on every ATC finding. The script refuses a severity that contradicts
the priority — which is the point. A false positive stays a blocker and gets **overruled by
a named human on the board**, rather than quietly becoming a minor.

**Proves:** the object satisfies the rules in the named variant, at this moment.

**Does not prove:** correctness, performance at volume, or that the variant contains the
right rules. ATC checks what someone configured it to check. An empty finding list from a
variant with four checks in it is worth nothing.

**If the call errors** — no ATC configured, variant missing, run not permitted — the status
is `not-run`. An errored check is not a passed check.

---

## G3 · Birim testi — `adt_unit_test`

```
adt_unit_test(name="ZCL_SD_DELIVERY_ADDR", object_type="class")
→ {ok, passed, failed, errors, alerts:[...], duration}
```

**This gate EXECUTES ABAP on the system.** It writes nothing to the transport system, but
it runs the object's test classes, and a badly isolated test can have side effects — that
risk belongs to the test, not to this tool. On QA and PRD, do not run it; record `not-run`
with the reason.

Always pass `--tests <passed+failed>`. When that is 0:

> `passed=0, failed=0` is not a pass. It means the object has no unit tests.

The script coerces it to ⚠️ and prints that sentence. This is the second most common false
green in the toolchain and it is invisible unless someone names it.

**Proves:** the tests that exist, pass.

**Does not prove:** that they assert anything. `cl_abap_unit_assert` calls can be absent,
commented out, or asserting on a hard-coded constant. If the gate matters to the decision,
read the test class with `adt_get_source --method` and say in `--detail` how many assertions
you actually saw.

---

## G4 · Clean Core — `adt_get_source` + the `clean-core` skill

Read the source filtered, then check two things:

1. **Forbidden / not-released objects** — hand the referenced tables and classes to the
   `clean-core` skill (`MARA`, `BSEG`, `CL_GUI_ALV_GRID` and friends). Level D is a
   `blocker` on an ABAP Cloud project and a `major` on a classic stack heading there.
2. **Deprecated statements** — `MOVE a TO b`, `CALL METHOD obj->m`, `CREATE OBJECT`,
   `TABLES`, `WRITE` for output, `SELECT *` on a standard table. Full table in
   [`review-checklist.md`](review-checklist.md).

Also: any modification to a non-Z/Y object, any enhancement of SAP-delivered code, and any
object outside the customer namespace is a `blocker` on sight. the sap-adt engine's guardrails refuse
to *write* those; this gate is what catches them when they are already there.

**Proves:** the static text of this object does not name a forbidden thing.

**Does not prove:** that the object is reachable in ABAP Cloud, or that a dynamic call
(`CALL FUNCTION lv_name`) does not reach one at runtime.

---

## G5 · Standartlar — `adt_get_source`

The judgment gate. Full checklist in [`review-checklist.md`](review-checklist.md); the
short form is naming, method size, structure, error handling, and hardcoding.

**Which standard applies depends on what the object is.** The checklist above covers ABAP
code as code; these four cover the object types where "correct" has a specific definition:

| Reviewing | Read |
|---|---|
| a name, of anything | [`NAMING_STANDARD.md`](../../ts-generator/references/NAMING_STANDARD.md) — the authority, no copies |
| a DDIC object, a CDS view, or a RAP stack | [`OBJECT_GATES.md`](OBJECT_GATES.md) — pass/fail rows, run before the write and after activation |
| RAP layering, BDEF, publish | [`RAP_STANDARD.md`](RAP_STANDARD.md) |
| a report, module pool, Dynpro or ALV | [`CLASSIC_DIALOG_STANDARD.md`](CLASSIC_DIALOG_STANDARD.md) |
| ABAP that passes every gate and is still wrong | [`ABAP_TRAPS.md`](ABAP_TRAPS.md) |

Every finding here needs **a line number and a concrete replacement**. "Method too long" is
an opinion; "`GET_SHIP_TO` is 212 lines — extract the ADRC read at 184–207 into
`READ_ADRC( )`" is a finding. If you cannot name the replacement, it is not ready to be on
the board.

**Proves:** the code follows conventions a human agreed on.

**Does not prove:** anything a customer pays for. Never let G5 findings outrank a G2
blocker in the summary — a well-named unauthorised database read is still an unauthorised
database read.

---

## G6 · Etki alanı — `adt_where_used`

```
adt_where_used(name="ZCL_SD_DELIVERY_ADDR", object_type="class")
→ {ok, usages}
```

**The result is a floor, not a scope.** `adt_where_used` is a static reference list. It
does not see:

- `SUBMIT (lv_prog)` and any other dynamic program call
- dynamic `PERFORM` / `CALL METHOD` / `CALL FUNCTION` built from a variable
- BAdI implementations selected by filter at runtime
- RFC, OData, SOAP and IDoc consumers outside this system
- job variants, output determination, and workflow steps

Write the number as **asgari** every time. The phrasing that fails a review of the review:
*"3 çağıran — regresyon kapsamı"*. The phrasing that survives: *"3 statik çağıran —
**asgari** regresyon kapsamı; dinamik ve dış tüketiciler bu listede yok"*.

`--status fail` here is rare. What makes G6 useful is the finding it produces: a caller in
a different module that nobody planned to test.

**Also run `adt_check_scatter`** when the scope is a transport. A class whose includes are
spread across several modifiable requests will fragment further on the next push, and half
of it will reach QA without the other half.

---

## 7 · The standing limits — what no gate reaches

Record the ones that apply with `quality.py limit`. These are not excuses; they are the
difference between "six checks found nothing" and "this code is fine".

| Limit | Why static review cannot reach it | Where it does get checked |
|---|---|---|
| Runtime cost at real data volume | Static text has no row counts | ST05 / SAT / SQLM on a realistic set |
| Whether a green test asserts anything | The runner reports pass/fail, not assertions | read the test class |
| The authorisation **concept** | `AUTHORITY-CHECK` syntax ≠ the right object and fields | the security team, SU24 |
| Dynamic and external callers | Not in the static reference list | SM37 variants, SM59, SOAMANAGER, WE20 |
| Config the code depends on | Lives in customizing tables, not in the class | the functional consultant; `E071K` on the CR |
| Whether it does what the business asked | No tool has the requirement | the functional spec and UAT |
| Behaviour after import into QA/PRD | Import history is not in ADT | STMS import history |
| Text elements and selection texts | The engine reads and writes `source/main` only; the text pool sits behind an endpoint it has no tool for, so reading the source back cannot show a missing text | SE38 → Goto → Text elements, in the system |

The last row matters more than it looks. A gate result is true **for the system you ran it
on**. A green board from DEV says nothing about PRD until the transport has actually landed
there, and ADT cannot tell you whether it has.
