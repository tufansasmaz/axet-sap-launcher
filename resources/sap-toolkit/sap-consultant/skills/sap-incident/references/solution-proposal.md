# Solution and code proposal

What ships is a **diff, not a push**. In a support contract the customer usually approves
the change; the ticket needs a readable before/after. The push comes after, and only ever
in DEV.

---

## Two things to check before writing a single line

**1 · Read the live source.** Every proposal is diffed against source pulled *now* via
`adt_get_source`, with real line numbers. Writing ABAP from memory produces syntactically
perfect code referencing fields this customer does not have — and because it reads
fluently, a junior will paste it.

**2 · Compare DEV against the system with the bug.** The fault was seen in PRD; the fix is
written in DEV. If the versions differ, the proposal is being written against the wrong
code. Check with `adt_revisions` on both and print the result:

```
Sürüm : DEV ve PRD aynı (rev 14, S4DK900298) ✓
Sürüm : ⚠ DEV rev 16, PRD rev 14 — DEV'de 2 taşıma daha var, önce onları incele
```

Nobody checks this by hand, and it is a common way a "fix" turns into a second incident.

## Always more than one option

A single proposal means the first idea became the design. In support the split is nearly
always the same, and juniors take the first one without knowing they chose:

| | What | Regression risk | Honest cost |
|---|---|---|---|
| **At the symptom** | guard the point where it failed | low, narrow | masks the real fault |
| **At the cause** | fix the actual broken step upstream | wider — `adt_where_used` says how wide | correct |
| **No code at all** | bad master data or wrong config | none | often the real answer |

The third is genuinely the right answer more often than support teams like to admit. Adding
a null check because one plant's address record is empty silences the symptom and leaves the
data broken for the next report.

**Regression scope is computed, not asserted.** `adt_where_used` on the changed unit gives
the caller list, and every one of those callers is a test. This is the step juniors skip.

It is a **floor, not the scope.** `adt_where_used` reads static references. It does not see
`SUBMIT (lv_prog)`, dynamic `PERFORM`, BAdI implementations selected by filter at runtime,
RFC/OData/IDoc consumers in other systems, or job variants. Say so in the proposal and
record it as a limit, or the test plan will read as exhaustive when it is a starting point:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" limit --case support/TCK-10482 \
  --what "Dinamik çağrılar ve dış sistem tüketicileri" \
  --why  "adt_where_used sadece statik referansları görür" \
  --where "SM37 iş varyantları, SM59 / SOAMANAGER, fonksiyonel ekip"
```

## The proposal block

```
ÇÖZÜM ÖNERİSİ — Seçenek B (neden noktası) · ÖNERİLEN
Kök neden güveni: Doğrulandı (E5, E7, E9)

Nesne : ZCL_SD_DELIVERY_ADDR → GET_SHIP_TO (satır 184-191)
Sürüm : DEV ve PRD aynı (rev 14, S4DK900298) ✓

- IF lt_addr IS NOT INITIAL.
-   rs_addr = lt_addr[ 1 ].
+ IF lt_addr IS NOT INITIAL.
+   rs_addr = lt_addr[ 1 ].
+ ELSEIF is_partner-adrnr IS NOT INITIAL.
+   rs_addr = read_adrc( is_partner-adrnr ).

Clean Core   : Uyumlu — Z sınıfı, released API kullanımı yok
Regresyon    : 3 çağıran (ZSD_DELIVERY_PRINT, ZSD_INVOICE_FORM, ZFI_DUNNING)
Test         : ZCL_SD_DELIVERY_ADDR_TEST'e boş-tablo senaryosu eklenmeli —
               mevcut testler bu dalı kapsamıyor
Düzeltmiyor  : 1200'ün ADRC kaydındaki boşluk duruyor. Ayrı veri düzeltme kaydı gerekir.
Efor         : ~4 saat + QA testi
Sınıflandırma: Incident (davranış 28.07'de bozuldu, geri getiriliyor)
```

### The fields that are not optional

**Clean Core** — classify it: configuration / released API / classic BAdI / modification.
Support pressure pulls hard toward the quickest hack at 18:00 on a Friday; naming the tier
in writing is the only counterweight. The `sap-consultant:clean-core` skill has the criteria.

**Test** — run `adt_unit_test` if the class has tests. If the existing tests passed while
this bug shipped, they do not cover the branch: propose the test that *would* have caught
it. That closes the loop honestly and is worth more than the fix.

**Düzeltmiyor / Does not fix** — state what remains broken. A fix that quietly masks a data
fault is how you get the same ticket again in six weeks under a different symptom.

**Sınıflandırma** — restoring lost behaviour is an **incident**; adding behaviour is a
**change request**. Get this wrong consistently and free development disappears into a
fixed-price support contract, invisibly. It is the largest and least visible commercial leak
in support work.

## The fix inherits the root cause's confidence

Hard rule. **A ŞÜPHELİ root cause cannot carry a DOĞRULANDI fix.**

When the cause is only `[CORRELATION]` grade, the proposal ships labelled *hipoteze dayalı —
önce QA'de çürütme testi*, and the marker goes **inside the ABAP**, where it survives
copy-paste into SE80:

```abap
* [DOGRULANMADI] Kök neden E5/E7 ile yalnızca korelasyon düzeyinde.
* Hipotez yanlışsa bu değişiklik hiçbir etki yaratmaz — önce QA'de doğrula.
```

Phrase it as *"this change may do nothing"*, not *"this is risky"*. Juniors discount risk
and do not discount looking foolish.

## Implementing it

**Nothing here applies until a named human has read the diff and said yes.** The proposal is
the deliverable; the write is a separate act with a separate owner. Record the approver and
the moment in the case before touching anything:

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" add --case support/TCK-10482 \
  --source human --system DEV/100 --confidence reported \
  --claim "Diff onaylandı — Beyhan Meyrali, 04.08.2026, taşıma S4DK900318"
```

Then, on **DEV only**: ~~`adt_push` → `adt_syntax_check` → `adt_atc_check` →
`adt_unit_test` → `adt_activate`~~ — **NTT Studio uyarlaması: `adt_push` ve `adt_activate`
bu dağıtımda YOK** (`404 unknown_tool`), çünkü hiçbir SAP sistemine yazılmıyor. Onaylanan
diff'i geliştirici kendi ADT'sinde uygular ve aktive eder; sen ardından
`adt_syntax_check` → `adt_atc_check` → `adt_unit_test` ile doğrular, sonra orijinal hata
senaryosunu **ve** bir negatif vakayı yeniden koşturursun. Aktivasyon doğrulama değildir.

**QA is reached by transport, not by `adt_push`.** Somebody else's test cycle is running
there. A direct write desynchronises QA from the transport that is supposed to describe it,
and the failure shows up later as a defect nobody can reproduce after the next import.

Production likewise, and more so. Confirm the request with the consultant
(`adt_list_transports`, `adt_transport_check`); release and import belong to a named human.

If you are running this skill and no human has approved anything yet, the correct output is
the diff and the sentence *"onaylarsanız DEV'e uygulayıp doğrularım — hangi taşıma isteğine?"*

Run `sap-consultant:abap-reviewer` over the change and put its findings in the proposal — as a
field someone reads, not as a gate that blocks the ticket.
