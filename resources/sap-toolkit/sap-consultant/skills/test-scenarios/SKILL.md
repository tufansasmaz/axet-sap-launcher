---
name: test-scenarios
description: >
  Build a test plan from what the SYSTEM actually contains instead of from a
  module name: group the module's documents by type, read each type's customising
  description, and write one scenario minimum per type in use — then, after
  testing, report which document types were never covered. Use when a conversion,
  upgrade or regression needs a test scope somebody can defend. Reads SAP
  read-only and never creates a business document. Triggers: test senaryosu,
  test senaryoları, test planı, test kapsamı, regresyon testi, UAT kapsamı,
  hangi belge türleri, belge türü analizi, test scenarios, test coverage,
  regression scope.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(py:*), Bash(python:*)
---

# Test scenarios grounded in the system

> **NTT Studio uyarlaması — MCP değil, HTTP.** `adt_sql` bu dağıtımda MCP aracı olarak
> değil, `sap-adt-readonly`'nin yerel okuma kapısından çağrılır:
> `POST http://127.0.0.1:8787/tool/adt_sql`. `scripts/scan_doc_types.py` bunu kendisi
> yapıyor — yukarı akıştaki gibi tam yetkili ADT motorunu import ETMİYOR, çünkü o motor
> bu pakette bilerek yok. `ADT_RO_ALLOW_SQL=true` kapısı aynen duruyor: kapalıysa script
> hiç bağlanmadan çıkıyor. Gerekirse sunucu adresi `--server` ya da `ADT_RO_URL` ile
> değiştirilir.

A test plan written from a module name covers the document types someone
remembered. This one starts from the system: which document types exist, how
many documents each carries, what each is called in customising. The gap between
that list and the tested list is the number a test report is actually judged on.

**Reads only.** It never creates a business document. Executing a scenario —
raising the purchase order, posting the delivery — is a human action or a
technical consultant's, and deliberately outside this skill: the roles that carry
it run SAP read-only, and writing business documents is a different risk class
from anything else in the kit.

---

## The three steps

### 1. Scan — what does the system use?

```bash
py <test-scenarios>/scripts/scan_doc_types.py --module MM \
   --cwd "C:\project" --json types.json
```

Modules: `MM`, `SD`, `FI`. Language defaults to `T` (Turkish); `--language E`
for English descriptions.

Output is one row per document type with its description and record count,
ordered by count:

```
Satınalma siparişi  (EKKO.BSART)  14 document type(s) in use
   NB       Standart SAS                                2,080
   LPA      Onay blg.ile tsl.pl.                           30
   ...
```

**Needs `ADT_RO_ALLOW_SQL=true`** and refuses without it. That gate is a
per-profile decision about letting an agent read business and personal data;
`conversion-consultant` opens it, other roles do not, and a customer-production
workspace pins it shut regardless.

### 2. Write the scenarios

This half is judgement, so it is yours, not a script's. From the scan:

- **One scenario minimum per document type in use.** That is the floor the scan
  prints, not the target. A type with 2,080 documents deserves more than one; a
  type with 1 still deserves the one.
- **Order by count.** The type with the most documents is where a regression
  hurts most.
- **Use the customising description, not the code.** "NB — Standart SAS" tells a
  tester what to do; "NB" does not.
- Each scenario carries a **TC-ID**, the steps, and the expected result.

Write them where the project keeps them — a Markdown file the consultant owns.
`office-docx` or `office-pdf` turns it into a deliverable when it has to leave
the team.

Two things worth checking while you write, because the scan surfaces them and
nothing else will:

- **A type with a high count and no obvious owner** is usually a process nobody
  described in the FS. Ask before writing a scenario for it.
- **The same code under two descriptions** is not a duplicate. On NS4, MM's `RQ`
  is both an internal source request and an internal quotation — two document
  categories, two behaviours, two scenarios.

### 3. Record results, then report coverage

Append to a CSV as you test. It is a file you own; nothing writes it for you:

```
tc_id,module,doc_kind,type_code,scenario,expected,actual,status,document_no,tested_by,tested_on,note
TC-MM-001,MM,Satınalma siparişi,NB,Standart SAS oluştur,Belge kaydedilir,Kaydedildi,PASS,4500000999,DOZ,2026-09-04,
```

`status` is `PASS`, `FAIL` or `BLOCKED`. Fill `doc_kind` with the name the scan
printed ("Satınalma siparişi") — the same type code lives in more than one
document kind, and without it a scenario counts towards both.

```bash
py <test-scenarios>/scripts/coverage.py --scan types.json \
   --results sonuclar.csv --out kapsam.md
```

The report leads with the sentence that matters:

> Sistemde kullanılan **17 belge türü** var. **3** tanesi için senaryo
> çalıştırıldı (%18). **14 belge türü hiç test edilmedi.**

Coverage is over **types**, not scenarios. A hundred scenarios against one order
type is not coverage, and "34 of 41 passed" says nothing about the seven types
nobody wrote a scenario for.

It also flags a results row whose `type_code` is not in the scan — a typo, or a
row from another system. Those do not count towards the percentage, so the
number stays honest.

---

## Where it sits next to the rest of the kit

Four skills mention test scenarios and none of them produced one; all three
below assume the scenarios already exist.

| Skill | What it does with a scenario |
|---|---|
| `ts-generator` | Writes section 2.12 of the TS document |
| `spec-reviewer` | Audits that every requirement has at least one |
| `sap-cr-handover` | Assembles the UAT package |
| **this one** | Derives them from the system, and reports what was missed |

So the chain is: scan → scenarios → (ts-generator picks them up for the TS,
spec-reviewer checks the traceability) → test → coverage report.

---

## Extending it

`MODULES` in `scan_doc_types.py` holds the module map. PP, PM, QM and the rest
are not there because they were not measured — and a mapping written from memory
is exactly the failure this skill exists to avoid. `references/open-sql.md` has
the five-step probe for adding one, including the check that catches an
incomplete text-table key.

That reference is worth reading before writing any `adt_sql` query, not just for
this skill: the Open SQL dialect differs from ANSI in three ways that each stop a
query dead, and one of the error messages actively misleads.

---

## Files

- `scripts/scan_doc_types.py` — the scan. Carries the measured module map.
- `scripts/coverage.py` — scan + results → Markdown coverage report.
- `references/open-sql.md` — Open SQL dialect notes, the text-table keys, and
  how to add a module.
