---
name: sap-cr-handover
description: >
  Use when a development or change request is finished and has to be handed over — closure
  documentation, a UAT or acceptance test script, a go-live note, "what did we actually
  deliver", a transport about to be released to QA or production. This skill reads the
  transport itself over the sap-adt ADT tools to establish what was really built, diffs it
  against what was specified, writes the test script the customer runs to accept it, and
  records actual effort against the original estimate. Triggers on closure language, in
  Turkish or English: "geliştirme bitti", "teslim edelim", "devir dokümanı", "kapanış",
  "UAT hazırlar mısın", "test senaryosu", "taşıma isteği hazır", "canlıya alacağız",
  "ne teslim ettik", "development complete", "ready for UAT", "handover", "acceptance test",
  "closure document", "go-live note", "release notes", "what did we deliver".
  NOT for sizing a request before it is built — that is sap-cr-scope. NOT for a production
  problem — that is sap-incident.
author: "Beyhan Meyrali <beyhan.meyrali@nttdata.com>"
---

# sap-cr-handover — hand over what was actually built

**Requires a live ADT connection.** Without one, stop and say so.

> **NTT Studio uyarlaması — MCP değil, HTTP.** Bu dağıtımda `sap-adt` skill'i ve `adt_*`
> MCP araçları YOK; aXet.code MCP konuşamıyor. Aynı araçlar `sap-adt-readonly` skill'inin
> anlattığı yerel HTTP sunucusundan çağrılır: aşağıda `adt_xxx` denen her yerde
> `POST http://127.0.0.1:8787/tool/adt_xxx` oku. Bu skill'in kullandığı `adt_list_transports`,
> `adt_transport_check`, `adt_get_source`, `adt_where_used`, `adt_revisions`, `adt_sql`,
> `adt_atc_check`, `adt_unit_test`, `adt_check_scatter`, `adt_badi_discovery` araçlarının
> hepsi kapıdan geçiyor — taşıma isteğini okuyup teslim dokümanı yazmak eksiksiz çalışır.
> **Taşımayı serbest bırakmak bu skill'in işi DEĞİL** ve zaten yapamaz: taşıma yazan araçlar
> `404 unknown_tool` döner. Serbest bırakmayı geliştirici SE09/SE10'da kendisi yapar.
>
> **`${CLAUDE_PLUGIN_ROOT}` de yok.** Aşağıda `${CLAUDE_PLUGIN_ROOT}/scripts/` geçen her
> yerde proje kökündeki **`.axet-code/scripts/`** oku — `case.py` oraya kuruluyor.

Handover documents are normally written from the specification, because that is the document
that is open. So they describe what was *meant* to be built, and the gap between that and the
transport is discovered by the customer, in UAT, at the worst possible moment.

**The transport is the best record you can reach.** Read it first, write the document from
it, and put the difference on the page.

It is not *the truth*, and the distinction matters to whoever reads this document. A
transport tells you what was **collected** — not that it was imported, not that it works,
not that anyone tested it. It also routinely is not one transport: a CR normally spans
several requests and tasks, plus customising requests carrying table keys. Read all of
them, and grade each requirement by how far it actually got (§3).

**First time running this?** [`references/worked-example.md`](references/worked-example.md)
is one handover from a one-line request to both documents — including the second transport
nobody mentioned, and the estimate that came in at 36%.

---

## 1 · Find the case, or open one

If the CR was scoped with `sap-cr-scope`, keep working on the same case — the estimate is
already on it and this skill is what closes the loop:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" set --case cr/CR-2291 --phase handover
```

If there is no case (the work predates the process, or came in as a "small request"), open one
now with `--kind cr` and no estimate. A handover with no scope history is still worth writing;
it just cannot claim calibration data.

## 2 · Read the transport — this is the whole skill

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" add --case cr/CR-2291 --tag asbuilt \
  --source adt_sql --system DEV/100 --confidence observed \
  --claim "S4DK900431 contains 4 objects: 1 CLAS, 2 ENHO, 1 TABL" \
  --query "SELECT ... FROM E071 WHERE TRKORR = 'S4DK900431'"
```

`adt_sql` on **E070** (header, owner, status) and **E071** (object list) gives you the
inventory. `adt_revisions` on each object gives you who changed it and when. `adt_get_source`
with `method=` gives you what the changed unit now does.

**Three things that make this wrong if you skip them:**

1. **`E071K`, not just `E071`.** Customising entries — table keys, condition records, number
   ranges, the config half of most SD/MM changes — live in `E071K`. A request that looks
   nearly empty in `E071` can carry a hundred keys. A handover that reads only `E071` will
   report a config-heavy CR as "1 object delivered".
2. **Every request, not one.** Ask the consultant for the request numbers, then widen: tasks
   hang off the parent via `E070-STRKORR`, and a CR normally has a workbench request *and* a
   customising request, often more. `adt_check_scatter` tells you whether one object's
   includes were fragmented across several requests, which is its own problem.
3. **`E070-AS4DATE` is not an import date.** It is the last header change — creation or
   release. Whether a request reached QA or production is in the STMS import history, which
   ADT cannot read. That is what the `📦 Toplandı` state in §3 exists for.

Then, for every object in the transport, ask the two questions the specification cannot answer:

- **Is it in the spec?** If not: either it is collateral (fine — document it) or scope crept
  (say so, with the effort it consumed).
- **Is anything in the spec *not* here?** This is the line every other handover document omits,
  and it is the one that prevents the UAT ambush.

Method and the query shapes: [`references/as-built.md`](references/as-built.md).

## 3 · The spec-vs-shipped table

"Delivered" is four different claims, and only two of them are things you can see. Grade
each requirement by how far it actually got:

| State | Means | You can establish it from |
|---|---|---|
| **🔧 Yazıldı** | the code exists in DEV and does the thing | `adt_get_source` — you read it |
| **📦 Toplandı** | it is in a request | `E071` / `E071K` on the requests |
| **🚚 Aktarıldı** | it reached QA or PRD | **not visible over ADT** — STMS import history, or the consultant tells you |
| **✅ Test edildi** | somebody ran it and it passed | a person, never a tool |

| Requirement | Durum | Where it lives | Evidence |
|---|---|---|---|
| Kredi limiti aşımında uyarı | 🔧📦 yazıldı + toplandı | `ZCL_SD_ORDER_CHECK->VALIDATE` | E4 |
| Uyarı metni özelleştirilebilir | 🔧📦 yazıldı + toplandı | msg class `ZSD` no. 042 | E5 |
| Limit tanımı müşteri bazında | ⚠️ Kısmi | tek seviye; müşteri grubu yok | E6 |
| Uyarı raporu | ❌ **Teslim edilmedi** | kapsam dışı bırakıldı 22.07 | E7 |

The default ceiling for anything this skill can prove on its own is **🔧📦**. Writing
**✅ Test edildi** requires a person who says they tested it, and their name goes next to it.
Writing **🚚 Aktarıldı** requires the import history, which means either the consultant
checked STMS or it is a limit:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case cr/CR-2291 \
  --what "Taşımaların QA/PRD'ye aktarılıp aktarılmadığı" \
  --why  "İçe aktarma geçmişi ADT'de görünmez" \
  --where "STMS → içe aktarma geçmişi → S4DK900431, S4DK900432"
```

⚠️ and ❌ must be as easy to write as the rest. If ❌ is harder to produce than ✅, nobody
will ever produce it — and the document becomes decoration.

**Every row cites a ledger row.** A ✅ without evidence is a claim that the thing works
because somebody remembers writing it — which is exactly the failure this table exists to
prevent, and exactly what a four-way split makes visible.

## 4 · Write the UAT script from the requirements, not from the code

The test the customer runs must be traceable to what they asked for, one row per requirement.
Each step gets a **transaction and a complete key** — the same trust mechanism as
`NASIL DOĞRULARSIN` in the incident report. "Check that the order works" is not a test step.

Include the negative cases and at least one case that must **not** trigger the new behaviour;
that is what catches an over-broad enhancement before it reaches production.
Format, and the rule about who supplies the test data:
[`references/uat-script.md`](references/uat-script.md).

## 5 · Regression scope is computed, not asserted

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" add --case cr/CR-2291 --tag scope \
  --source adt_where_used --system DEV/100 --confidence observed \
  --claim "VALIDATE has 7 callers; 2 background jobs must be in the test scope" \
  --query "adt_where_used ZCL_SD_ORDER_CHECK"
```

Run `adt_where_used` on every changed unit at handover time, not just at scoping time — the
caller list may have moved while you were building. **That list is the minimum regression
scope.** It is static references only: it does not find `SUBMIT (lv_prog)`, dynamic
`PERFORM`, BAdI implementations selected by filter, job variants, or RFC/OData/IDoc
consumers in other systems. Record the gap, then hand it to the people who can close it:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case cr/CR-2291 \
  --what "Dinamik çağrılar ve dış sistem tüketicileri test kapsamında değil" \
  --why  "adt_where_used sadece statik referansları görür" \
  --where "SM37 iş varyantları, SM59 / SOAMANAGER, fonksiyonel ekip"
```

Anything you leave out of the test plan, you leave out explicitly, with a reason.

## 6 · Actual effort — the part everyone skips

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" set --case cr/CR-2291 --actual-days 7.0
```

`case.py check` **warns** loudly when this is missing, and does not block. That is
deliberate: a gate here just means somebody types a plausible number to get past it, and a
typed-in number is worse than a missing one because it looks like data. Ask, ask again, ship
anyway.

This is not administration: an estimate with no actual beside it teaches nobody anything, and
a team that never learns what it under-estimates will under-estimate the same shape of work
for years.

`case.py set --actual-days` prints the variance and flags it in **both** directions.

**Over-ran by 30%+** — write one sentence saying why, in the internal section, not the
customer-facing one:

> 5,5 → 7,0. BAdI beklenenden dar çıktı, sipariş kaydı yerine kalem seviyesinde tetikleniyordu;
> 1,5 gün ek analiz.

**Under-ran by half or more** — say it to the consultant on screen, plainly, and ask them to
report it back:

> 4 saat tahmin edildi, 50 dakikada bitti. Bunu bize bildirin: ticket, iş tipi, tahmin,
> gerçekleşen ve neyin hızlandırdığı. Tahmin tabanımız eski ve bu şekildeki her teklif
> düzeltilene kadar yüksek çıkacak.

This is the direction nobody reports, because nobody escalates good news. It is also the more
valuable direction right now: a four-hour estimate that finishes in under one is not luck, it
is a baseline built before ADT-driven analysis existed, and it will keep producing wrong
quotes — the customer overpays, or the capacity is booked and never used. Both are real costs
and both are invisible unless somebody sends the number back.

**The report-back loop is the point.** A variance sitting in a case folder on one laptop
changes nothing. It has to reach whoever maintains these skills, so the sizing guidance in
`sap-cr-scope` gets corrected against what the work now actually takes. Say what to send,
where, and to whom — and keep the ask to five fields, or it will not be sent.

That loop, thirty cases in, is the most valuable document your team owns.

## 7 · Render

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" check --case cr/CR-2291   # exit 1 = not ready
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" list  --case cr/CR-2291
```

Two documents from one case:

- **Customer-facing** — what was delivered, what was not, the UAT script, how to verify, and
  a `NELERİ KONTROL EDEMEDİM` block from the limits rows (import status, dynamic callers,
  anything else outside ADT). Render with `office-pdf --redact-pii`.
- **Internal** — as-built inventory, transport IDs, the effort variance, notes for whoever
  maintains it next. Never merged into the customer document; the estimate variance is not
  theirs to read.

## 8 · Boundaries

- **Do not release or import the transport.** Read it, document it, confirm the number with
  the consultant (`adt_list_transports`, `adt_transport_check`). A human owns release and
  import into QA and production, always.
- **Handover is not sign-off.** You produce the artifact; the customer's acceptance in the
  ITSM is what closes the CR. Never write "kabul edildi" on a document nobody signed.
- **If the transport does not match the spec, say so on page 1**, before the delivery table.
  A handover document that hides a gap is worse than no document, because it converts an open
  question into a false record.
- **Scope creep found at handover is a finding, not an accusation.** Document it with its
  effort and let the commercial conversation happen with facts on the table.
- **Never write ✅ Test edildi on your own authority**, and never write 🚚 Aktarıldı from
  `E070`. Both need a human or a transaction this tooling cannot reach — see §3. What ADT
  cannot see, and who owns each gap:
  [`../sap-incident/references/limits-and-escalation.md`](../sap-incident/references/limits-and-escalation.md).
