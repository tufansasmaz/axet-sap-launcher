# Worked example — "S4DK900431'i release edebilir miyim?"

One transport, from a one-line question to a board. The same CR the `sap-cr-scope` and
`sap-cr-handover` examples follow (CR-2291), at the moment just before release.

Two things in here are the reason the skill exists: an ATC priority-1 that everybody on the
call was sure was a false positive, and a unit-test result that looked green.

---

## What arrived

> **Kaan** (developer, 8 aydır ABAP yazıyor):
> "CR-2291'i bitirdim, S4DK900431. Release edebilir miyim? ATC'ye baktım, temiz."

"ATC'ye baktım, temiz" is the sentence this skill exists to check. Not because Kaan is
careless — because ATC's answer depends entirely on which variant ran, and nobody told him
there was more than one.

---

## 1 · Scope: a transport is not one request

```
adt_sql("SELECT obj_name, object, pgmid FROM e071 WHERE trkorr = 'S4DK900431'")
```

```
ZCL_SD_DELIVERY_ADDR   CLAS  R3TR
ZSD_TOLERANCE_CHECK    PROG  R3TR
```

Then the sibling check, because a change is rarely one request:

```
adt_sql("SELECT trkorr, trfunction, as4text, strkorr FROM e070
         WHERE strkorr = 'S4DK900431' OR trkorr = 'S4DK900431'")
```

```
S4DK900431  K  CR-2291 teslimat adresi + tolerans     (üst istek)
S4DK900432  W  CR-2291 tolerans customizing           (ayrı istek)
```

`S4DK900432` is a customizing request Kaan did not mention — he did not create it. Its
content:

```
adt_sql("SELECT objname, tabkey FROM e071k WHERE trkorr = 'S4DK900432'")
→ T691A: 8 keys · T691B: 6 keys
```

> Two objects to review, and a second request that carries the config the code reads.
> The code can pass every gate and still do nothing in production if `S4DK900432` is left
> behind. That goes on the board as a limit, not as a gate — no static check can tell you
> whether the two requests will be imported together.

```bash
py .../quality.py new --object ZCL_SD_DELIVERY_ADDR --type class \
  --system DEV/100 --scope transport --transport S4DK900431 --reviewer "Kaan Demir"
```

`ZSD_TOLERANCE_CHECK` gets its own run. One board per object — a board that averages two
objects hides the one that fails.

---

## 2 · G1 · Sözdizimi

```
adt_syntax_check("ZCL_SD_DELIVERY_ADDR", "class")
→ {valid: true, errors: 0, warnings: 2}
```

```bash
py .../quality.py gate --run quality/ZCL_SD_DELIVERY_ADDR --gate syntax \
  --status pass --detail "0 hata, 2 uyarı (obsolete statement)" --raw .tmp/syn.txt
```

Both warnings name obsolete statements. They come back as G4 findings — a syntax warning
that ATC ignores is still a Clean Core problem.

---

## 3 · G2 · ATC — the variant question, then the priority-1

The first run, the way Kaan ran it:

```
adt_atc_check("ZCL_SD_DELIVERY_ADDR", "class", variant="DEFAULT")
→ {findings: []}
```

```bash
py .../quality.py gate --run quality/... --gate atc --status pass \
  --variant DEFAULT --detail "0 bulgu" --raw .tmp/atc-default.txt
```
```
atc: warn  (pass → warn)
  ⚑ ATC varyantı DEFAULT — müşterinin kendi varyantı değil. Temiz sonuç,
    müşteri kurallarına uygunluğu kanıtlamaz.
```

That downgrade is the skill earning its place. Two minutes with the lead produces the
project's actual variant, `ZNTT_S4`, and it is a project constant from then on:

```
adt_atc_check("ZCL_SD_DELIVERY_ADDR", "class", variant="ZNTT_S4")
→ findings:
   prio 1  SEC_AUTH   GET_SHIP_TO:184   "Authority check missing before data selection"
   prio 2  PERF_LOOP  READ_ADRC:212     "SELECT inside LOOP"
   prio 3  DOC_ABAP   (class)           "No ABAP Doc on public methods"
```

Zero findings became three, one of them priority 1, purely by naming the right variant.

### The false positive that was not

Kaan's reaction, and it is a reasonable one:

> "O yanlış pozitif. Bu metodu sadece `ZSD_DELIVERY_PRINT` çağırıyor, o da zaten
> başında yetki kontrolü yapıyor."

The script does not accept a downgrade:

```bash
py .../quality.py finding --run quality/... --gate atc --severity minor --atc-priority 1 ...
```
```
ATC priority 1 maps to `blocker`, not `minor`.
  Record the mapped severity. If you disagree, say why in --what — do not change the number.
```

So the claim gets checked instead of typed:

```
adt_where_used("ZCL_SD_DELIVERY_ADDR", "class")
→ ZSD_DELIVERY_PRINT · ZSD_INVOICE_FORM · ZFI_DUNNING
```

Three callers, not one. Reading each for the guard:

```
adt_get_source("ZSD_DELIVERY_PRINT", grep="AUTHORITY-CHECK")  → satır 44  ✓
adt_get_source("ZSD_INVOICE_FORM",   grep="AUTHORITY-CHECK")  → satır 61  ✓
adt_get_source("ZFI_DUNNING",        grep="AUTHORITY-CHECK")  → (eşleşme yok)
```

> `ZFI_DUNNING` — the dunning run, which reads every customer in the company code — calls
> this method with no authority check anywhere in its call path. The priority-1 was real.
> Kaan's mental model was right about the caller he had in mind and wrong about the two he
> did not know existed.

This is the whole design in one paragraph. If the tool had let a confident developer type
`minor`, the board would have been green and the finding would have shipped.

```bash
py .../quality.py gate --run quality/... --gate atc --status fail \
  --variant ZNTT_S4 --detail "1 öncelik-1, 1 öncelik-2, 1 öncelik-3" --raw .tmp/atc-zntt.txt

py .../quality.py finding --run quality/... --gate atc --severity blocker \
  --atc-priority 1 --rule SEC_AUTH --where "ZCL_SD_DELIVERY_ADDR→GET_SHIP_TO:184" \
  --what "Veri okumadan önce yetki kontrolü yok. 3 çağırandan ZFI_DUNNING'in çağrı yolunda hiç AUTHORITY-CHECK yok — şirket kodundaki tüm müşterileri okuyor." \
  --fix "M_MATE_WRK / ACTVT 03 kontrolü metodun başına · diff s.2"

py .../quality.py finding --run quality/... --gate atc --severity major \
  --atc-priority 2 --rule PERF_LOOP --where "READ_ADRC:212" \
  --what "LOOP içinde SELECT — 400 kalemlik teslimat listesinde 400 ayrı sorgu" \
  --fix "FOR ALL ENTRIES, tek okuma · diff s.2"
```

---

## 4 · G3 · Birim testi — the green that means nothing

```
adt_unit_test("ZCL_SD_DELIVERY_ADDR", "class")
→ {ok: true, passed: 0, failed: 0, errors: 0, duration: 0.02}
```

`ok: true`, `failed: 0`. On a dashboard this is a green tick.

```bash
py .../quality.py gate --run quality/... --gate unit --status pass \
  --tests 0 --detail "test sınıfı yok" --raw .tmp/unit.txt
```
```
unit: warn  (pass → warn)
  ⚑ 0 test çalıştı — bu bir GEÇTİ değil. Nesnenin birim testi yok.
```

The class has no test class at all. The board now says ⚠️ with that sentence in the cell,
which is the only form in which a reader who was not here will understand it.

Not a `fail`: most legacy ABAP has no tests, and a gate that fails every run gets ignored
within a week. It is a warning with a name attached at release time — and after the F1 fix
lands, a test for the empty-address branch is the natural thing to add.

---

## 5 · G4 · Clean Core

The two syntax warnings, plus a source scan:

```
adt_get_source("ZCL_SD_DELIVERY_ADDR", grep="SELECT \*|CALL METHOD|CREATE OBJECT|MOVE ")
→ 141: CREATE OBJECT lo_reader TYPE zcl_adrc_reader
→ 207: SELECT * FROM likp INTO TABLE lt_likp WHERE vbeln = ...
```

`clean-core` on `LIKP`: not released for ABAP Cloud, successor is the delivery API. This
customer is on a classic stack with a conversion in the roadmap, so it is a `major` with
the target release named, not a `blocker`:

```bash
py .../quality.py gate --run quality/... --gate cleancore --status warn \
  --detail "LIKP doğrudan okuma (Cloud'da serbest değil) + 2 obsolete statement"

py .../quality.py finding --run quality/... --gate cleancore --severity major \
  --where "READ_ADRC:207" \
  --what "SELECT * FROM LIKP — ABAP Cloud'da serbest değil, S/4 dönüşümünde kalır" \
  --fix "4 alan adıyla sınırla; dönüşümde teslimat API'sine geç"

py .../quality.py finding --run quality/... --gate cleancore --severity minor \
  --where "141" --what "CREATE OBJECT" --fix "lo_reader = NEW zcl_adrc_reader( )"
```

---

## 6 · G5 · Standartlar

```
adt_get_source("ZCL_SD_DELIVERY_ADDR", method="GET_SHIP_TO")
```

Three findings, each with a line and a replacement:

```bash
py .../quality.py finding --run quality/... --gate conventions --severity major \
  --where "GET_SHIP_TO:198" \
  --what "Plant '1200' koda gömülü — ikinci depo açıldığında yanlış çalışır" \
  --fix "T001W üzerinden parametre; ya da metoda IMPORTING iv_werks"

py .../quality.py finding --run quality/... --gate conventions --severity minor \
  --where "GET_SHIP_TO:184-395" \
  --what "212 satırlık metot" --fix "184-207 arası ADRC okumasını READ_ADRC( ) olarak ayır"

py .../quality.py finding --run quality/... --gate conventions --severity minor \
  --where "GET_SHIP_TO:186" --what "lv_a, lv_b" --fix "lv_addr, lv_partner"

py .../quality.py gate --run quality/... --gate conventions --status warn \
  --detail "1 major (hardcode), 2 minor"
```

The hardcoded `'1200'` is a `major`, not a `minor`. It is the same plant from the original
incident, and it works perfectly until the customer opens a second warehouse.

---

## 7 · G6 · Etki alanı

```
adt_where_used(...)  → 3 statik çağıran
adt_check_scatter("ZCL_SD_DELIVERY_ADDR")
→ {scattered: true, modifiable_requests: ["S4DK900431", "S4DK900418"]}
```

```bash
py .../quality.py gate --run quality/... --gate impact --status warn \
  --detail "3 statik çağıran (asgari) · sınıf 2 açık istek arasında dağılmış"

py .../quality.py finding --run quality/... --gate impact --severity major \
  --where "S4DK900418" \
  --what "Sınıfın include'ları iki değiştirilebilir istek arasında dağılmış — sadece S4DK900431 release edilirse sınıf QA'ya yarım gider" \
  --fix "SE09'da S4DK900418'deki parçaları S4DK900431'e taşı, sonra release et"
```

> `adt_check_scatter` is the finding nobody looks for and everybody has hit: the class
> reaches QA missing the half that lives in the other request, and the defect that follows
> is not reproducible in DEV.

Three static callers, written as **asgari** — `ZFI_DUNNING` was already a surprise once in
this same review.

---

## 8 · Verdict

```bash
py .../quality.py check --run quality/ZCL_SD_DELIVERY_ADDR
```
```
WARN  nothing in limits.jsonl — the board will imply the review saw everything.

RELEASE EDİLEMEZ  — ZCL_SD_DELIVERY_ADDR on DEV/100
      1 kapı KALDI: atc
      1 blocker bulgu: F1
```

Limits first, then the board:

```bash
py .../quality.py limit --run quality/... \
  --what "S4DK900432'nin (customizing) S4DK900431 ile birlikte aktarılıp aktarılmayacağı" \
  --why "İçe aktarma sırası ADT'de görünmez" --where "STMS · taşıma sorumlusu"

py .../quality.py limit --run quality/... \
  --what "400 kalemlik teslimatta gerçek çalışma süresi" \
  --why "Statik inceleme çalışma zamanını görmez" --where "ST05 / SAT · DEV"

py .../quality.py limit --run quality/... \
  --what "ZFI_DUNNING'in dinamik çağrı yolları" \
  --why "adt_where_used yalnızca statik referansları görür" --where "SM37 iş varyantları"
```

Final board after the F1 and F5 fixes are approved by a named human, applied to DEV and
the gates re-run:

```
| # | Kapı        | Sonuç     | Not |
|---|---|---|---|
| G1 | Sözdizimi   | ✅ GEÇTİ  | 0 hata, 0 uyarı |
| G2 | ATC         | ✅ GEÇTİ  | varyant ZNTT_S4 · 0 bulgu |
| G3 | Birim testi | ✅ GEÇTİ  | 2 test — boş adres ve yetki reddi |
| G4 | Clean Core  | ⚠️ UYARI  | LIKP doğrudan okuma — dönüşüm kapsamına alındı |
| G5 | Standartlar | ⚠️ UYARI  | 2 minor · hardcode giderildi |
| G6 | Etki alanı  | ✅ GEÇTİ  | dağılma giderildi · 3 statik çağıran (asgari) |

**SONUÇ: ŞARTLI — UYARILAR OKUNMALI**
```

`ŞARTLI`, not `RELEASE EDİLEBİLİR`. Two warnings survive on purpose: the `LIKP` read is a
real Clean Core debt that was consciously deferred, and two naming findings were not worth
a re-test cycle. Both now have a name against them on page 2.

---

## What this run cost, and what it caught

Eleven tool calls, about twenty minutes.

| Caught | Would have surfaced as |
|---|---|
| Missing authority check reachable from the dunning run | an audit finding, or a data-protection incident |
| ATC run on the wrong variant | "ATC temiz" in a status report, indefinitely |
| No unit tests, behind a green result | a regression on the next change to this class |
| Class scattered across two open requests | a defect in QA that nobody can reproduce in DEV |
| Hardcoded plant `'1200'` | the day the second warehouse opens |
| A customizing request nobody mentioned | the feature silently not working in production |

None of the six needed judgment Kaan lacks. They needed somebody to run the same six checks
the same way every time, and to refuse to write "pass" for a check that did not run.
