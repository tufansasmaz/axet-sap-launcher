---
name: sap-cr-scope
description: >
  Use when a customer asks for something the system does not do yet — a change request, a new
  development, a new report or field or check, an enhancement to standard SAP. Decides first
  whether it should be built at all (standard SAP already does it, config is enough, an
  existing Z object covers it, or it is actually an unfixed bug), then computes the real scope
  over the sap-adt ADT tools and returns a signable scope-and-effort document.
  Triggers on request language, not method jargon: "yeni talep", "değişiklik talebi",
  "CR geldi", "şunu da ekleyebilir miyiz", "alan eklenecek", "geliştirme talebi",
  "efor verir misin", "kaç günlük iş", "yapılabilir mi", "change request",
  "new development", "can you also add", "estimate", "sizing", "is this possible".
  NOT for something that used to work and stopped (sap-incident), or for writing the
  functional spec once the CR is approved (fs-generator).
author: "Beyhan Meyrali <beyhan.meyrali@nttdata.com>"
---

# sap-cr-scope — decide whether to build it, then size it honestly

**Requires a live ADT connection.** Without one, stop and say so.

> **NTT Studio uyarlaması — MCP değil, HTTP.** Bu dağıtımda `sap-adt` skill'i ve `adt_*`
> MCP araçları YOK; aXet.code MCP konuşamıyor. Aynı araçlar `sap-adt-readonly` skill'inin
> anlattığı yerel HTTP sunucusundan çağrılır: aşağıda `adt_xxx` denen her yerde
> `POST http://127.0.0.1:8787/tool/adt_xxx` oku. Bu skill'in kullandığı `adt_search`,
> `adt_code_search`, `adt_get_source`, `adt_where_used`, `adt_revisions`, `adt_sql`,
> `adt_atc_check`, `adt_unit_test`, `adt_badi_discovery` araçlarının hepsi kapıdan geçiyor —
> kapsam ve efor çıkarımı eksiksiz çalışır. Yazma araçları `404 unknown_tool` döner; bu
> skill zaten hiçbirini kullanmıyor: çıktısı imzalanacak bir doküman, sisteme dokunuş değil.
>
> **`${CLAUDE_PLUGIN_ROOT}` de yok.** Aşağıda `${CLAUDE_PLUGIN_ROOT}/scripts/` geçen her
> yerde proje kökündeki **`.axet-code/scripts/`** oku — `case.py` oraya kuruluyor.

The most valuable output of this skill is often **"do not build this."** A CR you talk the
customer out of costs you an hour and saves them a maintained object forever. Rank that
outcome as a success, out loud, or nobody will ever produce it.

The second most valuable output is a **decomposition** a human can price in five minutes:
which objects move, who calls them, what is missing, what you could not check. You produce
that. You do **not** produce the day number — days depend on who builds it and what else
they are carrying, and none of that is in ADT. See §4.

**First time running this?** [`references/worked-example.md`](references/worked-example.md)
runs two CRs end to end — one that survives the kill checks into a decomposition sheet, and
one that a single search ends with *"do not build this"*.

---

## 1 · Take the request (no questions)

Accept whatever arrives — an e-mail, a meeting note, a screenshot with an arrow drawn on it,
one sentence in Turkish. Open the case immediately:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" new --kind cr \
  --ticket CR-2291 --system DEV/100 \
  --title "Sipariş girişinde kredi limiti uyarısı"
```

Restate the request as a **behaviour**, not as a solution: *"the system must warn the user
when …"*, never *"add a field to VA01"*. Customers arrive with a solution because they are
being helpful; sizing their solution instead of their need is how you build the wrong thing
accurately.

Write the restatement down and show it. If it is wrong, this is the cheapest possible moment
to find out.

## 2 · Try to kill it first

Before any sizing, run the four checks that can end the CR. Each gets a ledger row tagged
`reuse` — the gate will not let you produce a scope document without one.

| Check | How | If it hits |
|---|---|---|
| **Standard SAP already does it** | `adt_code_search` the standard message/behaviour, `adt_badi_discovery` for the intended extension point | close it: point at the transaction and the setting |
| **Config, not code** | find the customising table behind the behaviour and read it (`adt_sql`) | route to the functional consultant — no development |
| **An existing Z object covers it** | `adt_search` the Z namespace by name and by `adt_code_search` on the domain terms | extend or reuse; a near-duplicate is worse than either |
| **It is actually a bug** | did this ever work? `adt_revisions` on the suspect object, transports in the window | hand to `sap-incident` — and it is billed differently |

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" add --case cr/CR-2291 --tag reuse \
  --source adt_search --system DEV/100 --confidence observed \
  --claim "ZSD_CREDIT_CHECK exists and already reads KNKK — 80% overlap" \
  --query "adt_search ZSD_CREDIT*"
```

**A negative result is still a row.** "Searched the Z namespace for credit-limit logic, found
nothing" is evidence that the build is justified, and it is exactly what a reviewer will want
six months later when a second object shows up.

Record the outcome:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" set --case cr/CR-2291 --decision build
```

`build` / `config` / `reuse` / `reject` / `incident`. Four of the five save money.

## 3 · Classify the work — it changes everything downstream

Full criteria in [`references/classification.md`](references/classification.md).

| Shape | What it means | Sizing driver |
|---|---|---|
| **A · addition to an existing Z object** | you own the code | callers, not lines |
| **B · changing standard SAP behaviour** | BAdI, enhancement, or modification | which extension point exists, and Clean Core tier |
| **C · greenfield** | a new object, report, app or interface | the technology decision in §6 |
| **D · "small request"** | one field, one text, one column | the process it bypasses, not the effort |

**Shape D is where money leaks.** Ten of them arrive per month, each genuinely twenty minutes,
none transported, none documented, none tested — and eighteen months later nobody knows why
the field is there. Size it in minutes if that is the truth, but give it a number and a
transport like everything else.

## 4 · Compute the scope — never assert it, and never price it

The impact surface is something ADT knows and you do not. The *price* of that surface is
something a human knows and ADT does not. Compute the first; hand over the second.

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" add --case cr/CR-2291 --tag scope \
  --source adt_where_used --system DEV/100 --confidence observed \
  --claim "ZCL_SD_ORDER_CHECK->VALIDATE has 7 callers, 2 of them in background jobs" \
  --query "adt_where_used ZCL_SD_ORDER_CHECK"
```

For every object the change touches, capture: the callers (`adt_where_used`), the current
source of the units that change (`adt_get_source` with `method=` or `grep=` — never
unfiltered), the ATC baseline (`adt_atc_check`, so you do not inherit somebody else's
findings as your own), and whether tests exist (`adt_unit_test`).

`adt_where_used` finds **static** references only. It misses `SUBMIT (lv_prog)`, dynamic
`PERFORM`, BAdI implementations reached by filter, RFC/OData/IDoc consumers in other
systems, and job variants. So the caller count is a **floor**, and the gap is recorded, not
glossed:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case cr/CR-2291 \
  --what "Dinamik çağrılar ve dış sistem tüketicileri" \
  --why  "adt_where_used sadece statik referansları görür" \
  --where "SM37 iş varyantları, SM59 / SOAMANAGER, fonksiyonel ekip"
```

**An empty scope ledger means the number was fabricated.** `case.py check` enforces exactly
that: `--estimate-days` set with no `scope` row fails the gate. And set
`--estimate-days` only once a **named human has filled in the sheet and told you the
figure** — it records their number so the handover can compare it against the actual. It is
never yours.

The decomposition sheet, what each driver means for the estimator, and how to write down the
unknowns: [`references/scope-and-estimate.md`](references/scope-and-estimate.md).

## 5 · Clean Core tier — say it before you build, not at audit

| Tier | Meaning | Say this |
|---|---|---|
| **Green** | released API, BAdI, CDS extension, own Z object | upgrade-safe |
| **Amber** | classic enhancement, implicit enhancement point, unreleased API | works, needs a regression check per upgrade |
| **Red** | modification, core data element change, access key | name the cost in the document, in effort per upgrade |

Red is sometimes the right answer. It is never the right *silent* answer — the customer is
buying a recurring cost and has to see the invoice.

## 6 · Technology choice (shape C only)

Choose for **the team that will maintain it**, not for the newest thing that works. A RAP
service is the correct answer only if somebody at the customer can debug one at 02:00. Where
the maintaining team knows classic ABAP and nothing else, a well-built report beats an
elegant Fiori app that becomes unmaintainable the day your consultant rolls off.

Ask it plainly, once: *"bunu sizin ekip mi bakacak, biz mi?"* — the answer changes the design,
and it is one of the few questions ADT genuinely cannot answer.

## 7 · The four things you may ask a human

Everything else, get it yourself.

1. **What the business outcome is** — the "why", not the "what". Half of all CRs change shape
   once this is on paper.
2. **Which of two readings of the request is right**, when both are buildable.
3. **Who maintains it afterwards** (§6).
4. **Priority against what is already in the pipeline** — you know the effort, they own the queue.

## 8 · The document

Gate first, then render:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" check --case cr/CR-2291   # exit 1 = not ready
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" list  --case cr/CR-2291
```

One page for the person who signs, detail behind it — format and worked example in
[`references/cr-report-format.md`](references/cr-report-format.md). Render with `office-pdf`
(`--redact-pii`).

**Scale shrinks the document, not the standard.** A two-hour CR gets five lines; it still
gets the reuse check, the Clean Core tier, the `NELERİ KONTROL EDEMEDİM` block, and an
effort column somebody signed.

## 9 · Boundaries

- **Scope study is read-only.** Do not build the thing while sizing it. If a prototype is
  genuinely needed to size it, say so and size the prototype.
- **Say what you could not check.** Every scope sheet carries a `NELERİ KONTROL EDEMEDİM`
  block from `case.py limit` — at minimum the callers `adt_where_used` cannot see. What ADT
  cannot reach, and who owns each gap:
  [`../sap-incident/references/limits-and-escalation.md`](../sap-incident/references/limits-and-escalation.md).
- **DEV is where you look.** Read PRD only to confirm the current behaviour actually differs
  from what is wanted, and record the data-scope authorisation with `case.py scope`.
- **Never emit a day figure of your own**, even under pressure in a meeting, even when asked
  directly twice. Give the shape ("A, small, one object, seven callers, no tests") and the
  decomposition sheet; the days come back from a person with a name. If a consultant insists,
  the honest answer is: *"kalemleri çıkardım, günü siz koyacaksınız — çünkü kimin yapacağını
  ve o hafta ne taşıdığını sistem bilmiyor."*
- **The estimate is not the commitment.** It goes into the document with its assumptions and
  its unknowns visible; the ITSM or the contract is what turns it into a promise.
- Once approved, the build goes through the normal path, and closure through
  **`sap-cr-handover`** — which reads what was actually shipped out of the transport and
  writes the actual effort back onto this case.
