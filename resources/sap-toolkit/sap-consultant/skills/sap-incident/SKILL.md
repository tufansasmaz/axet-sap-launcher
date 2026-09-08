---
name: sap-incident
description: >
  Use when a customer reports an SAP problem — a ticket, an incident, a bug, a short dump,
  "it worked last week", a wrong printout, a job that failed. The consultant pastes the raw
  ticket text and any screenshots; this skill investigates it over the sap-adt ADT tools,
  finds the root cause with evidence, and returns a one-page report plus a graded code
  proposal.
  Triggers on raw symptom language, not method jargon: "ticket geldi",
  "müşteri hata bildirdi", "hata alıyor", "çalışmıyor", "geçen hafta çalışıyordu",
  "kısa dump", "çıktı yanlış", "job düştü", "yetki hatası", "bakabilir misin",
  "customer reported", "production issue", "stopped working", "wrong output",
  "root cause", "RCA", "incident analysis".
  NOT for building something new, a change request, or writing a functional specification —
  that is sap-cr-scope / fs-generator.
author: "Beyhan Meyrali <beyhan.meyrali@nttdata.com>"
---

# sap-incident — analyse a reported SAP problem, end to end

**Requires a live ADT connection.** Without one, stop and say so.

> **NTT Studio uyarlaması — MCP değil, HTTP; ve YAZMA YOK.** Bu dağıtımda `sap-adt` skill'i
> ve `adt_*` MCP araçları YOK; aXet.code MCP konuşamıyor. Aynı araçlar `sap-adt-readonly`
> skill'inin anlattığı yerel HTTP sunucusundan çağrılır: aşağıda `adt_xxx` denen her yerde
> `POST http://127.0.0.1:8787/tool/adt_xxx` oku.
>
> Kapı **read-only** ve bu skill için bunun somut bir sonucu var. Araştırma tarafı eksiksiz
> çalışır: `adt_dumps`, `adt_search`, `adt_code_search`, `adt_get_source`, `adt_where_used`,
> `adt_revisions`, `adt_sql`, `adt_syntax_check`, `adt_atc_check`, `adt_unit_test`,
> `adt_inactive_objects`, `adt_badi_discovery`, `adt_list_transports`, `adt_transport_check`
> hepsi geçer. **Ama §8'de DEV için anlatılan `adt_push` → `adt_activate` adımı bu
> dağıtımda ÇALIŞMAZ** — o araçlar sunucuda hiç açılmıyor, `404 unknown_tool` döner.
> Bu bir eksiklik değil, bilinçli bir kilit: NTT Studio hiçbir SAP sistemine yazmaz.
> Teslim ettiğin şey her zaman diff'in kendisi olur; onaylanan değişikliği sisteme
> geliştirici ADT/SE80'de kendi elleriyle uygular. Bunu rapora da yaz.
>
> **`${CLAUDE_PLUGIN_ROOT}` de yok.** Aşağıda `${CLAUDE_PLUGIN_ROOT}/scripts/` geçen her
> yerde proje kökündeki **`.axet-code/scripts/`** oku — `case.py` oraya kuruluyor.

You do the investigation. The consultant pastes and reads. Every question you ask a human
is a question you failed to answer with a tool call.

**First time running this?** [`references/worked-example.md`](references/worked-example.md)
is one real ticket from pasted text to finished report — including the same ticket ending as
an Interim Findings Note, which is at least as common an outcome.

---

## 1 · Take the input (no questions)

Accept whatever arrives: Turkish or English, a pasted e-mail, a one-liner, screenshots.
Open the case immediately:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" new \
  --ticket TCK-10482 --system PRD/100 --severity P2 \
  --title "Plant 1200 irsaliye adresi yanlış"
```

**Screenshots are leads, not evidence.** Extract the machine-checkable keys — message class
and number, transaction, document number, program/include, dump title, timestamp — then
*re-verify each one through ADT*. A screenshot alone is `confidence: reported`; it becomes
`observed` only when a tool call confirms it from the named system.

Never quote a screenshot into the report. SAP screens routinely show names, addresses and
tax numbers. Raw files stay in `evidence/raw/` (gitignored); only extracted keys travel.

## 2 · First output, before any question

Print two things, unprompted:

1. **What I understood** — symptom, system/client, module, scope, first occurrence.
2. **What changed in this system recently** — transports whose objects touch the suspect
   area, config change documents, changed Z-objects with author and transport, new dumps.

This is what the consultant actually wants and it costs them nothing. You earn the right to
ask a question by producing something first.

**But it is context, not a cause.** A transport that appears in the window is a *lead* with
`confidence: correlation` at best — and the ADT tables tell you when a request was created
and released, **not when it was imported into this system**. Import history lives in the
transport logs, which are not in ADT. So the honest form is *"S4DK900312 was released on
27.07 and touches the address-read function"*, never *"S4DK900312 landed on 28.07 and broke
it"*. Most tickets are not caused by the most recent transport, and a junior who reads that
block as an answer will stop investigating at the first plausible name.

Chains, and the exact queries: [`references/investigation-loop.md`](references/investigation-loop.md).

## 3 · Investigate — a loop, not a checklist

A fixed step list breaks the moment the symptom shape changes. Run this instead:

```
current hypotheses → which single query best discriminates between them?
  → run it → append the row to the ledger → update the hypotheses → repeat
```

Every finding goes in the ledger as it is found:

```bash
py .../case.py add --case support/TCK-10482 --source adt_revisions --system PRD/100 \
  --confidence observed --claim "ZCL_SD_DELIVERY_ADDR changed 28.07 in S4DK900312" \
  --query "adt_revisions ZCL_SD_DELIVERY_ADDR" --raw .tmp/rev.txt
```

**Stop when one of three things is true**, and only then:

| Stop | Then |
|---|---|
| One hypothesis reaches mechanism grade, others have refuting evidence | write the root cause |
| N calls with no new ledger row (the trail is dry) | Interim Findings Note |
| The next discriminating query needs something ADT cannot reach | record a limit, then ask — see §4 |

Every time the third row fires, write the gap down before moving on:

```bash
py .../case.py limit --case support/TCK-10482 \
  --what "Gece işinin logu okunmadı" --why "İş logu ADT'de görünmez" \
  --where "SM37 · ZSD_PRINT_NIGHTLY · 28.07.2026"
```

That row becomes the `NELERİ KONTROL EDEMEDİM` block on page 1. Add `--blocking` when the
cause cannot be established without it — that turns the deliverable into an Interim Findings
Note, and `case.py check` will say so. The full list of what ADT cannot reach, and which
team each gap belongs to: [`references/limits-and-escalation.md`](references/limits-and-escalation.md).

Depth is set by severity: P1 ≈ 40 calls, P3 ≈ 6. When the budget is spent, stop and present
the best hypothesis with its label. Never drift on silently.

**Token discipline:** always read source filtered — `adt_get_source` with `grep=` or
`method=`. Three unfiltered class reads will end the session. Full output goes to
`evidence/raw/`, only the excerpt enters the ledger.

## 4 · The only four things you may ask a human

Anything else, get it yourself.

1. **What the correct behaviour should have been** — the system knows what it did, never
   what it should have done.
2. **What changed outside the system** — a new manual step, a new user group, a process change.
3. **Which of two plausible business intents is right**, when the code supports both.
4. **Authorisation to read a gated table on QA/PRD** — a human's name has to be on it.

Ask at most two at a time, each with a default and a legal "bilmiyorum".

**A fifth thing is not a question but a hand-off:** when the trail runs into a log, a trace,
a queue or a monitor, you cannot get there from ADT and neither can the consultant by
asking you harder. Say which transaction and which team, record it as a limit, and keep
going on everything that does not depend on it.

## 5 · Hypotheses — at least two, each with a refutation

You may not write a root cause from a single hypothesis. Maintain, and show:

| # | Hypothesis | Supports | Contradicts | Would refute it | Status |
|---|---|---|---|---|---|

A hypothesis with no refutation condition is not a hypothesis, it is a guess. Chase the
refutation, not the confirmation — that is the whole difference between analysis and a
plausible story.

**Ask the consultant what they expected *after* you present your finding**, never before.
It teaches without blocking: *"sen ne düşünmüştün? ben şunu buldum, fark şurada."*

## 6 · Root cause, then solution

Grade the claim honestly:

- `[MECHANISM]` — you can state the causal step and it rests on `observed` rows → **DOĞRULANDI**
- `[CORRELATION]` — it lines up in time, the mechanism is unproven → **MUHTEMEL**
- weaker → **ŞÜPHELİ**, or an Interim Findings Note

**Correlation is never a root cause.** "The transport landed the same week" is a lead.

Then propose solutions — always more than one, and always including the option where the
code does not change at all (bad data, wrong config). The code proposal must be diffed
against source read live via `adt_get_source`, never written from memory, and DEV/PRD
versions compared first via `adt_revisions`. Rules and the block format:
[`references/solution-proposal.md`](references/solution-proposal.md).

**The fix inherits the root cause's confidence label.** A ŞÜPHELİ cause cannot carry a
confident fix; that proposal ships with a `[DOGRULANMADI]` comment inside the ABAP, where
it survives copy-paste.

## 7 · Report

Gate first, then render:

```bash
py .../case.py check --case support/TCK-10482          # exit 1 = not report-ready
py .../case.py list  --case support/TCK-10482
```

One page, plain language, no evidence IDs on the front — format and worked example in
[`references/report-format.md`](references/report-format.md). Render with `office-pdf`
(`--redact-pii`). Detail lives on pages 2–3 for whoever wants it.

## 8 · Boundaries

- **What ships is a diff, not a push.** The deliverable of this skill is a proposal: source
  read live, change shown as a diff, named person decides. That holds on every system,
  including DEV.
- **DEV**: ~~once a named human has approved the diff, you may apply and verify it
  (`adt_push`, `adt_syntax_check`, `adt_atc_check`, `adt_unit_test`, `adt_activate`)~~
  — **NTT Studio'da bu adım yok**: `adt_push`/`adt_activate` sunucuda açılmıyor. Onaylanan
  diff'i geliştirici uygular; sen `adt_syntax_check`, `adt_atc_check`, `adt_unit_test` ile
  uygulandıktan sonra doğrularsın. Kimin onayladığını vakaya yaz. Aktivasyon doğrulama
  değildir — orijinal hata senaryosunu ve bir negatif vakayı yeniden koştur.
- **QA**: reached by transport, not by `adt_push`. QA is where somebody else's test cycle
  is running; writing into it directly desynchronises QA from the transport that is supposed
  to describe it, and the first symptom is a defect nobody can reproduce after the next
  import.
- **Production**: reached only by transport. Confirm the request with the consultant
  (`adt_list_transports`, `adt_transport_check`); a human owns release and import.
- **The approver has a name.** "The consultant said go ahead" is not an approver; a person
  and a timestamp in the case is. A junior running this skill has no standing to authorise a
  write to a customer system, and the skill must not put them in a position where it looks
  like they did.
- **Each consultant uses their own SAP user.** On a shared support ID, one stale password
  trips the sap-adt engine's auth circuit breaker and locks the whole team out mid-P1.
- **Never `SELECT *` on a gated table.** Document keys, status and control fields only —
  never name/address columns. Record the authorisation once with `case.py scope`.
- **Incident or CR?** Restoring lost behaviour is an incident. Adding behaviour is a change
  request — say so in the report and hand it to **`sap-cr-scope`**, or it gets absorbed
  unbilled into the support contract.
