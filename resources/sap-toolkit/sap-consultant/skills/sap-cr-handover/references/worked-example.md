# Worked example — one handover, start to finish

Continues `CR-2291` from
[`../../sap-cr-scope/references/worked-example.md`](../../sap-cr-scope/references/worked-example.md).
The estimate is already on the case; this run closes the loop.

The example is deliberately imperfect: one requirement partial, one not delivered, one
thing in the transport that nobody asked for, and an actual that came in well under the
estimate. That is what a real handover looks like, and every one of those four is a line
somebody would otherwise leave out.

---

## What the consultant pasted

```
CR-2291 bitti, devir dokümanı ve UAT lazım. taşıma S4DK900431 hazır,
salı canlıya alacağız
```

One transport number. That is the first thing to distrust.

## What the skill did

```bash
py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" set --case cr/CR-2291 --phase handover
```

### Read the transports — plural

```bash
py .../case.py add --case cr/CR-2291 --tag asbuilt --source adt_sql --system DEV/100 \
  --confidence observed --claim "S4DK900431 (workbench): 4 objects — 1 CLAS, 2 ENHO, 1 MSAG" \
  --query "SELECT trkorr, pgmid, object, obj_name FROM e071 WHERE trkorr = 'S4DK900431'" \
  --raw .tmp/e071.txt
```

Then the question the consultant did not answer: *is that all of them?* `E070` on
`STRKORR` found two tasks under the request (two developers), and asking directly produced a
second request nobody had mentioned:

```bash
py .../case.py add --case cr/CR-2291 --tag asbuilt --source adt_sql --system DEV/100 \
  --confidence observed --claim "S4DK900432 (customising): 14 table keys in T691A/T691B — \
credit limit tolerance config, not mentioned in the handover request" \
  --query "SELECT trkorr, objname, tabkey FROM e071k WHERE trkorr = 'S4DK900432'" \
  --raw .tmp/e071k.txt
```

**This is the whole reason `E071K` is in the method.** Read only `E071` on only the
transport you were handed, and the document says "4 objects delivered" while fourteen
configuration keys sit in a request that may not be imported on Tuesday. The code lands, the
tolerance config does not, and the feature is silently dead in production.

### Per object

`adt_revisions` for the audit line, `adt_get_source method=` for what the unit now does,
`adt_atc_check` for findings this delivery introduced versus inherited, `adt_unit_test` for
whether the tests pass. Each one an `asbuilt` row with `--raw`.

`adt_where_used` at handover time, not scoping time — the caller list moved: 7 at scoping,
8 now. Somebody added a caller during the build. That is exactly the failure this re-run
exists to catch, and it is one more UAT step.

### What could not be established

```bash
py .../case.py limit --case cr/CR-2291 \
  --what  "Taşımaların QA/PRD'ye aktarılıp aktarılmadığı" \
  --why   "İçe aktarma geçmişi ADT'de görünmez; E070-AS4DATE serbest bırakma tarihidir" \
  --where "STMS → içe aktarma geçmişi → S4DK900431 ve S4DK900432"

py .../case.py limit --case cr/CR-2291 \
  --what  "Dinamik çağrılar ve dış sistem tüketicileri" \
  --why   "adt_where_used sadece statik referansları görür" \
  --where "SM37 iş varyantları, SM59 / SOAMANAGER, fonksiyonel ekip"

py .../case.py limit --case cr/CR-2291 \
  --what  "Taşımaya girmeyen elle yapılmış ayarlar" \
  --why   "Varyant, iş tanımı ve rol hiçbir istekte görünmez" \
  --where "Geliştirici + fonksiyonel danışman, hedef sistemde tek tek"
```

### Actual effort

```bash
py .../case.py set --case cr/CR-2291 --actual-days 2.0
```

```
estimate 5.5 d → actual 2.0 d  (36% of estimate)
  ⚑ UNDER-RAN BY HALF OR MORE. Report this back — ticket, shape, estimate,
    actual, and what made it fast. The estimating baseline is stale and
    every future quote of this shape is too high until it is corrected.
```

This is the direction nobody escalates, because nobody escalates good news. The BAdI search
that used to be an afternoon in SE84 was one `adt_badi_discovery` call. Five fields go back
to whoever maintains these skills, or the next CR of this shape is quoted at 5.5 days again
and the customer overpays for tooling they are already being sold.

### The gate

```bash
py .../case.py check --case cr/CR-2291
```

```
PASS  11 evidence row(s), 9 observed, 3 recorded limit(s)
```

Had `--actual-days` been skipped, this would still have passed — with a `WARN`. A gate there
just produces a timesheet number typed to get past it, and a typed-in number is worse than a
missing one because it looks like data.

## The deliverable — customer-facing

```
DEVİR DOKÜMANI — CR-2291
DEV/100 → PRD · SD · 04.08.2026 · Beyhan Meyrali

Spesifikasyon ile teslim edilen arasında iki fark var: uyarı raporu
teslim edilmedi (22.07'de kapsam dışı bırakıldı), limit tanımı tek
seviyede çalışıyor.

NE TESLİM EDİLDİ
  Gereksinim                    Durum              Nerede
  Kredi limiti aşımında uyarı   🔧📦 yazıldı+topl.  ZCL_SD_CREDIT->CHECK
  Uyarı metni özelleştirilebilir 🔧📦 yazıldı+topl. msg class ZSD no. 042
  Tolerans oranı ayarlanabilir  🔧📦 yazıldı+topl.  T691A/T691B, 14 kayıt
  Limit tanımı müşteri bazında  ⚠️ Kısmi           tek seviye; müşteri
                                                    grubu bazında değil
  Uyarı raporu                  ❌ Teslim edilmedi  22.07'de kapsam dışı
  (istenmemişti) Hata mesajı    ➕ Ek               ZSD 043, yan ürün
  metni düzeltmesi

  🔧 yazıldı · 📦 taşımaya alındı · 🚚 aktarıldı · ✅ test edildi
  Bu doküman 🔧 ve 📦 aşamalarını doğrular. Aktarım ve test ayrı adımlar.

TAŞIMA SIRASI
  1. S4DK900431  (workbench — kod)
  2. S4DK900432  (customising — tolerans ayarları)
  İkisi birlikte aktarılmalı. Sadece kod aktarılırsa özellik
  sessizce çalışmaz.

NELERİ KONTROL EDEMEDİM
  · Taşımaların QA/PRD'ye aktarılıp aktarılmadığı — ADT'de görünmez
    → STMS · içe aktarma geçmişi · S4DK900431, S4DK900432
  · Dinamik çağrılar ve dış sistem tüketicileri
    → SM37 iş varyantları, SM59 / SOAMANAGER
  · Taşımaya girmeyen elle ayarlar (varyant, iş tanımı, rol)
    → geliştirici + fonksiyonel danışman

UAT — 8 adım, ekte. Her adımda işlem kodu ve tam anahtar var.
```

The line that would be missing from a conventional handover is the transport **order**. It
is there because `E071K` was read, and it is the difference between a working go-live and a
Tuesday-evening incident.

`✅ Test edildi` appears nowhere. Nothing in this run established that anybody ran it. When
UAT passes, a person's name goes next to that column — not yours.

## The deliverable — internal

Never merged into the customer document. The estimate variance is not theirs to read.

```
İÇ NOT — CR-2291

Taşımalar     S4DK900431 (K), S4DK900432 (W), görevler: 2
As-built      4 nesne + 14 özelleştirme anahtarı
ATC           2 yeni bulgu (öncelik 3), 5 mevcut — ayrımı ekte
Birim testi   yeni yazıldı, 2 metot, geçiyor
Çağıranlar    kapsamda 7 idi, devirde 8 — build sırasında bir
              çağıran eklenmiş, UAT adımı eklendi

EFOR          tahmin 5,5 → gerçekleşen 2,0  (%36)
              ⚑ YARIDAN FAZLA DÜŞÜK. Bildirilecek.
              Hızlandıran: BADI_SD_SALES_ITEM'ı bulmak
              adt_badi_discovery ile tek çağrı sürdü; eski
              tabanda bu yarım günlük SE84 araştırmasıydı.
              → Şekil B tahminlerinde analiz kalemi güncellenmeli.
```

That last block, thirty cases in, is the most valuable document the team owns. It is also
the one that only exists if somebody sends it back rather than enjoying the easy afternoon.
