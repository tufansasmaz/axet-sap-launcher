---
name: abap-code-checker
description: >
  Use before ABAP code is released — a developer wants an object, transport or package
  reviewed; a lead wants to know whether a transport is safe to release. Runs six quality
  gates over the sap-adt ADT tools (syntax, ATC, unit tests, Clean Core, naming/structure
  standards, impact surface) against a real system and returns one scoreboard — pass or
  fail per gate — plus a prioritised finding list and a fix diff for a named human.
  Triggers on release-readiness language, not method jargon: "kod kalitesi", "kodu incele",
  "kontrol eder misin", "standartlara uygun mu", "ATC çalıştır", "release öncesi kontrol",
  "taşımayı release edebilir miyim", "code review", "check my code", "quality check",
  "is this ready to release", "can I transport this", "clean core uyumlu mu".
  NOT for finding why something broke (sap-incident), sizing a change request
  (sap-cr-scope), or documenting what shipped (sap-cr-handover). For "is object X allowed
  in ABAP Cloud" as a lookup, that is clean-core.
author: "Beyhan Meyrali <beyhan.meyrali@nttdata.com>"
---

# abap-code-checker — six gates, one scoreboard, no green by omission

**Requires a live ADT connection.** This skill reviews code **on a system**, not files in a
folder — a review of a local file tells you nothing about what is actually active in the
client. Without a connection, stop and say so.

> **NTT Studio uyarlaması — MCP değil, HTTP.** Bu dağıtımda `adt_*` araçları MCP üzerinden
> değil, `sap-adt-readonly` skill'inin anlattığı yerel HTTP sunucusundan (`http://127.0.0.1:8787`)
> çağrılır; aXet.code MCP kullanamaz. Aşağıda `adt_xxx` MCP aracı denen her yerde
> `POST http://127.0.0.1:8787/tool/adt_xxx` oku. Kapı **read-only**: `adt_syntax_check`,
> `adt_atc_check`, `adt_unit_test`, `adt_get_source`, `adt_where_used`, `adt_revisions`
> geçer; yazma araçları `404 unknown_tool` döner. Yani bulguları raporlarsın, düzeltmeyi
> sistemde sen yapmazsın.

You run the checks. The developer reads the board and decides. Every gate you skip shows
up as ⬜, never as a pass.

**First time running this?** [`references/worked-example.md`](references/worked-example.md)
runs one transport from `"bunu release edebilir miyim?"` to a finished board — including
the priority-1 ATC finding that turns out to be a false positive, and the green unit-test
result that means there are no tests.

---

## 1 · Open the run and fix the scope

Three scopes, and the middle one is the reason this skill exists:

| Scope | When | How the object list is built |
|---|---|---|
| **object** | one class/program under development | as given |
| **transport** | **before release** — the flagship case | `adt_sql` on `E071` for the request **and every task under it** (`E070-STRKORR`) |
| **package** | periodic health check, handover | `adt_list_package` |

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/quality.py" new \
  --object ZCL_SD_DELIVERY_ADDR --type class --system DEV/100 \
  --scope transport --transport S4DK900431 --reviewer "B. Meyrali"
```

**A transport scope is not one request.** One change routinely spans a workbench request
and a customizing request; read `E071` *and* `E071K`. Reviewing only the number you were
handed is how the code passes and the config that drives it is never looked at.

One run per object. A board that averages six objects hides the one that fails.

## 2 · Run the six gates

Full tool calls, and what each gate does and does not prove:
[`references/gates.md`](references/gates.md).

| # | Gate | Tool | Proves |
|---|---|---|---|
| G1 | Sözdizimi | `adt_syntax_check` | it compiles |
| G2 | ATC | `adt_atc_check` | it passes the rules **of the variant you named** |
| G3 | Birim testi | `adt_unit_test` | the tests that exist, pass |
| G4 | Clean Core | `adt_get_source` + `clean-core` | no forbidden objects or deprecated statements |
| G5 | Standartlar | `adt_get_source` | naming, method size, structure |
| G6 | Etki alanı | `adt_where_used` | the **minimum** set of callers a change can break |

Record each one as it finishes. Machine gates (G1–G3) cannot be passed without the tool
output on disk — the same rule as the incident ledger, for the same reason:

```bash
py .../quality.py gate --run quality/ZCL_SD_DELIVERY_ADDR \
  --gate atc --status pass --variant ZZNDBS_ATC --raw .tmp/atc.txt
```

> **`ZZNDBS_ATC` is NTT DATA's own variant** (corporate guideline v2.0 §7): SAP's
> standard check set, plus checks NTT raised out of SAP's priority 2/3 into the
> priorities that matter. It is centrally managed — a change to the variant or to a
> message priority goes through the technical team, not through the project.
>
> **It can block a release.** The variant runs against development requests during the
> release process and its results produce warnings or an outright release block. So an
> ATC finding here is not advisory the way a lint hint is: the transport does not move.
> Say that when you report one.
>
> Confirm the name per customer before the first run — a customer with its own variant
> uses theirs, and this is the NTT default rather than a universal truth. The variant
> must exist on the system; a call against a name that is not there errors, and an
> errored call is `not-run`, never `pass`.

### Three greens that are not greens

These are the whole point of the skill. Each one is a result a junior reads as a pass:

1. **ATC returned no findings.** On variant `DEFAULT` that is SAP's ruleset, not the
   customer's — and NTT's own variant exists precisely because SAP's default files
   several high-severity checks under priority 2/3. The script downgrades a `DEFAULT`
   pass to ⚠️ automatically — do not argue with it, go and get the right variant name
   (`ZZNDBS_ATC` unless the customer has its own).
2. **`adt_unit_test` says passed 0, failed 0.** There are no tests. `--tests 0` can never
   be recorded as a pass.
3. **`adt_where_used` returned three callers.** That is the *floor*. It is a static
   reference list: it misses `SUBMIT (lv_prog)`, dynamic `PERFORM`/`CALL METHOD`,
   filter-selected BAdIs, and every RFC, OData, IDoc or job-variant consumer. Never write
   "3 callers" without the word **asgari**.

An ATC call that errored is `--status not-run`, never `pass`. A check that did not run is
the one thing this format refuses to let you hide.

## 3 · Findings — severity is mapped, not chosen

```bash
py .../quality.py finding --run quality/... --gate atc --severity blocker \
  --atc-priority 1 --rule SEC_AUTH_CHECK \
  --where "ZCL_SD_DELIVERY_ADDR→GET_SHIP_TO:184" \
  --what "Yetki kontrolü yok — her kullanıcı her plant'ı okuyabiliyor" \
  --fix "AUTHORITY-CHECK OBJECT 'M_MATE_WRK' · diff s.2"
```

ATC priority 1 → `blocker`, 2 → `major`, 3/4 → `minor`. Pass `--atc-priority` and the
script refuses a severity that contradicts it. **If you think a priority-1 is a false
positive, say so in `--what` and leave it a blocker** — the board is where a human
overrules it, with their name on the override. Silently downgrading it is the failure this
guard exists to prevent.

Findings G4–G6 come from reading source, so they are judgment. Judgment findings need a
line number and a concrete replacement, or they are opinions:
[`references/review-checklist.md`](references/review-checklist.md).

**Judgment against what, though.** For ABAP as ABAP, that checklist is the standard. For an
object type with a defined shape, read the one that applies instead of deciding from
memory: [`OBJECT_GATES.md`](references/OBJECT_GATES.md) (DDIC, CDS and RAP objects, as
pass/fail rows), [`RAP_STANDARD.md`](references/RAP_STANDARD.md),
[`CLASSIC_DIALOG_STANDARD.md`](references/CLASSIC_DIALOG_STANDARD.md), and
[`ABAP_TRAPS.md`](references/ABAP_TRAPS.md) for the code that passes every gate and is
still wrong. Names are judged only against
[`NAMING_STANDARD.md`](../ts-generator/references/NAMING_STANDARD.md).

**Token discipline:** read source filtered — `adt_get_source` with `grep=` or `method=`.
Three unfiltered class reads will end the session.

## 4 · Record what static review cannot see

```bash
py .../quality.py limit --run quality/... \
  --what "Gerçek veri hacminde çalışma süresi" \
  --why "Statik inceleme çalışma zamanını görmez" \
  --where "ST05 / SAT · DEV'de 1000 satırlık set"
```

A passing board says "these six checks found nothing". It does not say "this code is
correct", and a reader who cannot audit the review cannot tell the difference unless the
gaps are written down. The standing list — runtime cost at real volume, whether a green
test asserts anything, the authorisation *concept* as opposed to its syntax, dynamic
callers, config that the code depends on — is in
[`references/gates.md`](references/gates.md) §7.

## 5 · Verdict and deliverable

```bash
py .../quality.py check --run quality/...     # exit 1 = do not release
py .../quality.py board --run quality/...     # the scoreboard, markdown
```

Four verdicts, computed — never typed:

| Verdict | When |
|---|---|
| **RELEASE EDİLEBİLİR** | all six pass |
| **ŞARTLI — UYARILAR OKUNMALI** | no fail, no blocker, at least one ⚠️ |
| **EKSİK — KARAR VERİLEMEZ** | a gate never ran |
| **RELEASE EDİLEMEZ** | a gate failed, or any blocker finding |

Scoreboard first, findings second, `NELERİ KONTROL EDEMEDİM` last — the order is fixed so
that two consultants produce the same document. Format and the customer-facing wording:
[`references/report-format.md`](references/report-format.md). Render with `office-pdf`
when it leaves the team.

**Do not pass `--redact-pii` on these boards.** The masker treats any 10-digit number as a
tax ID and eats SAP object and document keys, which is exactly what makes a finding
verifiable. These boards carry keys and line numbers, not names.

## 6 · Boundaries

- **What ships is a diff, not a push.** This skill proposes; a named human approves. That
  holds on DEV too. The board records who overruled a finding, and when.
- **Never auto-fix a batch.** Fixing forty ATC findings across a package in one pass is how
  a review becomes an incident. One object, one diff, one approval, re-run the gates.
- **DEV**: after a named human approves the diff — `adt_push` → `adt_syntax_check` →
  `adt_atc_check` → `adt_unit_test` → `adt_activate`, against a transport they confirmed.
  **Then re-run this skill.** Activation is not quality.
- **QA / PRD**: read-only. Reached by transport, never by `adt_push`. Reviewing PRD source
  is legitimate and often the right move — writing to it is not.
- **A failing board is not a failing developer.** Most blockers in legacy ABAP predate the
  person who touched it last. Report the object, not the author; `adt_revisions` tells you
  who, and that belongs in an internal note if anywhere.
- **Each consultant uses their own SAP user.** On a shared support ID, one stale password
  trips the sap-adt engine's auth circuit breaker and locks the whole team out.
- **Refuse the review you cannot ground.** No system connection, no board. Write the
  checklist by hand and say it is unverified — do not render it in this format, because
  the format's whole claim is that a tool call stands behind every row.
