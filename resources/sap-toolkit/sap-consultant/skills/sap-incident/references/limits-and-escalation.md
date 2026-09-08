# What ADT cannot see — and where to send it instead

Shared by `sap-incident`, `sap-cr-scope` and `sap-cr-handover`.

The `Güven` label grades what you **found**. Nothing grades what you never **looked at**.
To the consultant reading page 1 — who often cannot audit the work — a confident report
looks identical whether the analysis covered the whole system or covered three objects.
That is the failure this page exists to prevent.

So every deliverable carries a `NELERİ KONTROL EDEMEDİM` block, and it is not an apology.
A senior consultant who says *"I checked the code and the transports; I did not see the job
log, somebody has to open SM37"* is being more useful than one who says nothing, and the
junior reading it learns where the boundary of this tooling is.

---

## The list — normal causes of normal tickets that ADT does not reach

`adt_*` reads the **repository and the dictionary**. It does not read the runtime, the
logs, or the configuration behaviour of a live business process. Concretely:

| Not visible over ADT | Why it matters | Where it lives |
|---|---|---|
| **Job logs and spool** | "the job failed" is a log statement, not a source line | SM37, SP01 |
| **Application log** | most standard processes report their real error here, not as a dump | SLG1 |
| **System log** | database, memory, and shutdown-class failures | SM21 |
| **Authorisation traces** | a missing authorisation object looks like "wrong output", never like an error | SU53, STAUTHTRACE |
| **Update terminations** | the dialog succeeded and the update task died; the user sees nothing | SM13 |
| **Lock entries** | "the document is stuck" is very often just a lock | SM12 |
| **IDoc / qRFC / tRFC monitors** | interface failures dominate integration tickets | WE02, SMQ1/SMQ2, SM58 |
| **Workflow** | a step that never fired stops the whole business process | SWI1, SWIA |
| **Output determination** | "the form did not print" is condition records, not code | NACE, VF31, and the output log on the document |
| **Runtime traces and SQL plans** | performance work needs measurement; reading code guesses | ST05, SAT, ST12 |
| **SAP Notes / KBAs** | standard-code behaviour is often a known, already-fixed defect | ONE Support Launchpad |
| **Actual data in the productive client** | reads there need explicit authorisation, and often you do not have it | the customer's Basis / functional team |
| **Anything in another system** | RFC, OData and IDoc consumers of the code you are reading | SM59, SOAMANAGER, the interface list |

There is one more, and it is the biggest: **what the business actually expects.** Nothing
in ADT knows whether the number on the screen is wrong. Only a person does.

## Recording a gap

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case support/TCK-10482 \
  --what  "Gece işinin logu okunmadı" \
  --why   "İş logu ADT üzerinden görünmüyor" \
  --where "SM37 → ZSD_CREDIT_NIGHTLY → 03.08.2026 çalışması" \
  [--blocking]
```

`--what` is one line in the deliverable language. `--why` says *why not* — not in ADT, no
access, could not reproduce, out of scope. `--where` is the single most valuable field: a
transaction and enough of a key that the reader can go and look in one minute. A limits row
with an empty `--where` is a shrug; one with `SM37 → ZSD_CREDIT_NIGHTLY → 03.08.2026` is a
handover.

### `--blocking` changes the document

Use it when **the conclusion cannot be established without that gap** — not merely when it
would have been nice to have. One blocking limit means the deliverable is not a root-cause
report; it is an **Interim Findings Note** (shape in
[`report-format.md`](report-format.md)), and `case.py check` says so on the PASS line.

The distinction is the entire point. A report that says *"cause: X"* when the deciding
evidence sits in a log nobody opened is worse than no report, because somebody will act on
it.

## Rendering the block

```
NELERİ KONTROL EDEMEDİM
  · Gece işinin logu okunmadı — iş logu ADT'de görünmez
    → SM37 · ZSD_CREDIT_NIGHTLY · 03.08.2026
  · Yetki kontrolü yapılmadı — SU53 izi gerekiyor
    → Kullanıcıdan hata anında SU53 ekran görüntüsü
```

`case.py list` prints the same rows as a table (`| ID | Kontrol edilemedi | Neden | Nereye
bakılmalı |`) for the appendix. Page 1 gets the prose form above, in the deliverable
language; the appendix gets the table.

## When there is genuinely nothing to record

Rare, and it should feel rare. If the mechanism is proven from source plus a transport plus
a dump, and no log, trace or interface is involved, then say *that* rather than leaving the
block empty:

```
NELERİ KONTROL EDEMEDİM
  · Bu bulgu tamamen kaynak kod ve taşıma kaydından doğrulandı;
    log veya izleme gerekmedi.
```

`case.py check` warns when nothing is recorded. It is a warning, not a gate, because a gate
on a free-text field just produces a junk row — and a junk row is worse than a missing one,
since it looks like data.

## The escalation line

Ending a report with *"could not determine"* is a dead end. Ending it with a name, a
transaction and a key is a next step. Where a gap points at another team, say which one:

| Gap | Who |
|---|---|
| job scheduling, spool, system log, locks | Basis |
| authorisation objects and roles | authorisation team / Basis |
| IDoc, qRFC, interface partners | integration team |
| output determination, condition records, master data | the functional consultant for that module |
| standard-code defect suspected | SAP, via an incident with the Note search attached |
| "is this number right?" | the business process owner — always |
