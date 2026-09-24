# SAP DEV yazma onayı — tasarım

- **Tarih:** 2026-09-24
- **Durum:** Tasarım onaylandı (sohbette, bölüm bölüm), spec incelemesi bekliyor
- **Kapsam:** Yalnızca SAP DEV sistemine yazma. Yerel dosya/komut işleri (`-y`) değişmiyor.

## 1. Amaç

Kullanıcının sözleriyle: "deve yazma işleminde kontrollü gidilmesi lazım … risk nerdeyse
sıfıra insin, başımız ağrımasın, yanlışlıklar yapılmasın" ve "kod yazma geliştirme
işlemlerinde abap_code_review gibi skiller kesinlikle çalışmalı".

Başarı ölçütleri:

1. Ajan DEV'e, NTT Studio'da kullanıcının gördüğü ve onayladığı bir pencere olmadan
   **yanlışlıkla** yazamaz.
2. Yanlış sisteme, yanlış pakete, yanlış transport'a yazma pencerede ilk bakışta görünür;
   onaylanandan farklı bir şey gönderilemez.
3. İncelenmemiş kod ya da kritik bulgusu olan kod SAP'a gitmez.
4. Her karar ve sonuç izlenebilir bir günlükte durur.

### Hedef olmayanlar

- **Güvenlik sınırı değil.** Ajan kabuk erişimine ve `.conn_adt`'deki düz şifreye sahip;
  kasıtlı atlatmayı bu tasarım durdurmaz. Hedef yanlışlığı önlemek.
- Bugünkü yapı KALIYOR: 8787 portu, Bearer token, ajanın `POST /tool/<ad>` çağırma
  biçimi, `.conn_adt` ve içindeki şifre (bilinçli borç). Proxy yok, şifre taşıma yok.
- Statik incelemedeki (issue, 894379e) 8 madde ayrı işler. SAP GUI scripting köprüsü
  (madde 3) dahil.
- QA/PRD davranışı değişmiyor (orada zaten `adt_readonly_server.py` açılıyor).

## 2. Bugünkü durum (ölçülen/okunan)

- Launcher DEV'de `sap-adt/scripts/adt_mcp_server.py`'yi (33 araç), QA/PRD'de onu saran
  `sap-adt-readonly/scripts/adt_readonly_server.py`'yi (17 araç) `--http --port 8787` ile
  başlatıyor; token `ABAP_HTTP_TOKEN` hem sunucuya hem ajanın ortamına veriliyor.
- Motorun transport zinciri: nesnenin sahibi olan transport (sorulmadan) → oturuma
  sabitlenmiş transport → `NoTransportResolved` reddi. "Transport'u sor, paketi sor,
  transport'u kendin açma" kuralları yalnızca SKILL.md/`sap-context.md` talimatında.
- `abapgit-deploy`'un 9 yazma script'i SAP GUI scripting ile yazıyor, 8787'yi hiç
  görmüyor; tek kapıları `tier_gate.py` (yalnızca DEV mi diye bakıyor).
- Motorun HTTP taşıması tek oturumlu ve **kuyruksuz**: bir çağrı sürerken gelen ikinci
  çağrı beklemeden 503 `sap_session_busy` alıyor (`adt_mcp_server.py` ~l.3195). Onayı
  çağrının içinde beklemek bu yüzden olanaksız (bkz. 5.1).
- Bugün iki çalışma yolu var ve hangisinin seçileceği sabit değil: ADT ile doğrudan
  (`adt_push` her çağrıda DEV'de aktive eder) ve abapGit (`src/` → ZIP → GUI import →
  aktivasyon hatası → düzelt → yeniden). İkisi de çalışma sırasında DEV'e yazıyor.

## 3. Mimari

```
ajan (axet-code, -y)
  │  POST /tool/<ad>, Bearer ABAP_HTTP_TOKEN        (değişmedi)
  ▼
adt_gated_server.py  :8787   ── YENİ, bizim dosyamız (salt-okunur ikizinin kalıbı)
  │  motoru import eder, araçları sınıflar, bilgi toplar, kararı UYGULAR
  │
  ├──► motor (adt_mcp_server.py araç fonksiyonları)   (değişmedi, yukarı akış)
  │
  └──► launcher onay ucu  127.0.0.1:<rastgele>        ── YENİ (Electron main)
         ayrı sır: ADT_APPROVAL_URL / ADT_APPROVAL_TOKEN yalnızca katmanın ortamında
         karar mantığı, modlar, oturum izinleri, pencere, günlük

tier_gate.py (abapgit-deploy)  ──►  POST :8787/tool/axet_abapgit_onay  (aynı akış)
```

- Launcher DEV'de artık `adt_mcp_server.py` yerine `adt_gated_server.py`'yi başlatır.
  Port, token, sağlık kontrolü aynı.
- **İşbölümü:** karar mantığı tek yerde, launcher'da (TypeScript, vitest). Python katmanı
  yalnızca bilgi toplar ve kararı uygular; kendi başına izin vermez.
- Yukarı akış motor dosyalarına dokunulmaz. Katman `sap-adt` klasöründeki motoru import
  eder (ikinci kopya yok) — `adt_readonly_server.py`'deki gibi.

## 4. Araç sınıfları

Motorun kaydettiği her araç tam olarak bir sınıfta olmalı. Sınıflanmamış bir araç
katmanın **başlamasını engeller** ve adını söyler (salt-okunur ikizindeki drift kontrolü).

| Sınıf | Araçlar |
|---|---|
| `SERBEST` | `ping`, `adt_doctor`, `adt_logon`, `adt_capabilities`, `adt_get_source`, `adt_list_package`, `adt_search`, `adt_code_search`, `adt_revisions`, `adt_inactive_objects`, `adt_badi_discovery`, `adt_where_used`, `adt_service_binding_status`, `adt_syntax_check`, `adt_atc_check`, `adt_list_transports`, `adt_transport_status`, `adt_transport_check`, `adt_check_scatter`, `adt_unit_test`, `adt_sql`, `adt_dumps` |
| `TRANSPORT_ONAYLI` | `adt_push`, `adt_activate`, `adt_create`, `adt_create_ddic_shell`, `adt_create_domain`, `adt_create_data_element`, `adt_create_table_type`, `adt_create_function_group`, `adt_write_function_module`, `adt_create_service_binding`, `adt_create_cds_view`, `adt_create_metadata_extension`, `adt_create_behavior_definition`, `adt_create_access_control`, `adt_create_type_group`, `adt_create_lock_object`, `adt_set_transport` |
| `HER_SEFER` | `adt_delete_object`, `adt_delete_transport`, `adt_remove_from_transport`, `adt_create_transport`, `adt_create_package`, `adt_publish_service_binding`, `adt_unpublish_service_binding`, `adt_clear_lock` |
| `KARMA` (moda göre) | `adt_generate_screen` (READ → serbest; WRITE → transport onaylı; DELETE → her sefer), `adt_generate_adobe` (READ/STATUS/GET_* → serbest; WRITE/SET_*/SYNC_CONTEXT → transport onaylı; DELETE → her sefer), `adt_message_class` (read → serbest; create/write → transport onaylı) |

Kurallar:

- Katmanın kendi eklediği iki araç (`axet_teslim`, `axet_abapgit_onay`) motorda yok, drift
  karşılaştırmasının dışında; kendileri SAP'a yazmaz, yalnızca onay ister.
- `KARMA` araçta tanınmayan mod ya da eksik/boş mod → `HER_SEFER`. Belirsizlik onaysız
  geçmez.
- Bu tablo yazıldığı gün motorun 33 aracını kapsar; kesin liste koddaki sabittir ve drift
  testi onu motorla karşılaştırır.
- `abapgit-deploy` script'lerinin hepsi (`abapgit_bootstrap.py`, `abapgit_deploy.py`,
  `gui_activate_package.py`, `gui_import_zip.py`, `gui_run_zabapgit_auto.py`,
  `gui_run_zabapgit_bootstrap.py`, `gui_run_zabapgit_bootstrap_multi.py`,
  `gui_run_zabapgit_deploy_multi.py`, `gui_stage_commit.py`) `TRANSPORT_ONAYLI` sayılır.

### Politika (launcher)

- `TRANSPORT_ONAYLI`: pencere; "Bu seferlik onayla" ya da (yalnızca Doğrudan modda)
  "Bu oturumda <TR>'ye izin ver". Oturum izni **(transport, paket)** çiftine bağlıdır.
- `HER_SEFER`: her çağrıda pencere; oturum izni hiçbir zaman kapsamaz.
- Oturum izni olan bir transport'tan **farklı** transport ya da **farklı** paket → yeniden
  pencere.
- Mod seçilmemişse her yazma reddedilir (`mod_secilmedi`).

## 5. Akış

### 5.1 Tek bir yazma çağrısı

1. Ajan `POST /tool/<yazma-aracı>` gönderir.
2. Katman bilgileri toplar: araç, sınıf, nesne adı/tipi, **paket (SAP'tan okunur, ajanın
   beyanından değil;** yeni nesnede `package` argümanı), transport (argüman ya da motorun
   çözeceği transport), argüman hash'i (kanonik JSON'un SHA-256'sı), kaynak hash'i ve
   SAP'taki aktif sürüm (push için, fark göstermek üzere).
3. **Kalite kapısı** (kaynak taşıyan yazmalarda: `adt_push`, `adt_write_function_module`,
   kaynaklı `adt_create_*`): bkz. §6. Geçmezse ret; launcher'a hiç sorulmaz.
4. Katman launcher'a sorar (`POST /approvals`, bilgilerle). Cevap:
   - `izinli` → motor çağrılır.
   - `bekliyor` → NTT Studio'da pencere açılır; ajana hemen döner:
     `{"ok": false, "error": "approval_pending", "approval_id": "...", "message": "..."}`.
     SAP oturum kilidi serbest; okumalar devam eder.
   - `reddedildi` / `sure_doldu` → `{"ok": false, "error": "approval_denied", ...}`,
     mesajı: "Kullanıcı reddetti. Tekrar deneme, başka yoldan da deneme."
5. Ajan **aynı çağrıyı aynı argümanlarla** tekrar gönderir. Launcher, argüman hash'i
   onaylanan istekle aynıysa `izinli` der; tek bir argüman farklıysa bu yeni bir istektir.
6. Başarılı push/aktivasyon sonrasında katman o nesnede `adt_atc_check` çalıştırır; özeti
   sonuca ekler ve günlüğe yazar.

Onay bekleyen istek 10 dakika sonra `sure_doldu` olur. Launcher'a ulaşılamazsa, launcher
yeniden başlamışsa (izinler bellekte) ya da cevap anlaşılmazsa sonuç **onay yok**.

### 5.2 Modlar

DEV'e bağlanınca NTT Studio sorar: "Bu oturumda nasıl çalışılsın?" Seçim oturum
boyunca geçerli, launcher belleğinde tutulur.

- **Doğrudan DEV'de çalış:** 5.1 çağrı çağrı işler.
- **Önce yerelde çalış, sonra teslim et:**
  - Çalışma sırasında her `TRANSPORT_ONAYLI`/`HER_SEFER` çağrı `yerel_mod` ile reddedilir.
  - İş bitince ajan katmanın eklediği `axet_teslim` aracını çağırır:
    `{"nesneler": [{"ad", "tip", "kaynak_dosyasi"}], "paket", "transport",
    "yontem": "adt" | "abapgit", "zip_dosyasi"?}`.
  - Katman her nesne için kalite kapısını çalıştırır, farkları toplar; launcher **tek
    pencere** açar (tüm nesneler, farklar, kalite özetleri).
  - Onaylanırsa launcher bir **teslim izni** verir: tam olarak (nesne, kaynak hash'i,
    transport) üçlüleri; abapGit'te (ZIP hash'i, paket, transport). Sonraki çağrılar bu
    izinle geçer; listede olmayan nesne ya da değişmiş kaynak reddedilir.
  - İzin liste tükenince ya da oturum kapanınca düşer.

### 5.3 abapGit yolu

`tier_gate.py`, DEV kontrolünden sonra 8787'deki `axet_abapgit_onay` aracını çağırır:
`{"script", "paket", "transport", "zip_sha256"}`. Aynı `izinli` / `bekliyor` / `ret`
akışı. Kalite kapısı ZIP'teki her ABAP kaynak dosyası için çalışır. Token ajanın
ortamındaki `ABAP_HTTP_TOKEN`; launcher onay ucuna doğrudan gidilmez.

`bekliyor` gelirse script `approval_pending` mesajını basıp 3 koduyla çıkar; ajan aynı
komutu tekrar çalıştırır.

## 6. Kalite kapısı

**Gönderimden önce — `abap-code-review` (yerel kaynak):**

- Ajan incelemeyi yaptıktan sonra `.sap-review/<TIP>_<NESNE>.json` yazar:
  ```json
  {"nesne": "ZCL_X", "tip": "class", "kaynak_sha256": "...",
   "skill": "abap-code-review", "tarih": "...",
   "bulgular": {"kritik": 0, "yuksek": 1, "orta": 3, "dusuk": 2},
   "rapor": ".sap-review/ZCL_X.md"}
  ```
- Katman push'tan önce:
  - kayıt yok → ret `inceleme_yok` ("önce abap-code-review çalıştır");
  - `kaynak_sha256` gönderilecek kaynağın hash'ine eşit değil → ret `inceleme_eski`;
  - `bulgular.kritik > 0` → ret `kritik_bulgu` (**kesin engel**, kullanıcı kararı; pencere
    hiç açılmaz, aşma seçeneği yok).
- Kalite özeti onay penceresinde görünür.

**Gönderimden sonra — deterministik:**

- Her başarılı push/aktivasyon sonrası `adt_atc_check` (katman çalıştırır).
- Teslim sonunda ya da oturum kapanırken `abap-code-checker` skorbordu (sistemdeki gerçek
  nesneye bakar, bu yüzden ancak gönderimden sonra).

## 7. Onay penceresi (NTT Studio)

- **Üstte:** SID, client, kullanıcı, DEV rozeti.
- **İşlem:** Türkçe açıklama ("Kaynağı yükle ve aktive et"), araç adı küçük yazıyla.
- **Nesne(ler):** tip, ad, paket.
- **Transport:** numara, açıklama, sahibi, durumu.
- **Fark:** SAP'taki aktif sürüm ↔ gönderilecek; yeni nesnede "yeni nesne".
- **Kalite:** kritik/yüksek/orta sayıları, "inceleme bu kaynağa ait ✓".
- **Düğmeler:** Reddet (varsayılan odak), Bu seferlik onayla, Bu oturumda <TR>'ye izin
  ver (yalnızca Doğrudan mod + `TRANSPORT_ONAYLI`).
- Uyarı renkleri `--status-warning-*`; lime yalnızca seçim için.
- Aynı anda birden çok bekleyen istek sıraya girer, tek tek gösterilir.

## 8. Günlük

- Proje klasöründe `sap-yazma-gunlugu.jsonl`, satır başına bir olay, yalnızca sona ekleme.
- Alanlar: zaman, SID/client/kullanıcı, mod, araç, sınıf, nesne, paket, transport,
  argüman hash'i, kaynak hash'i, kalite özeti, karar (`izinli`/`bekliyor`/`onaylandi`/
  `reddedildi`/`sure_doldu`/`kalite_reddi`/`yerel_mod`/`mod_secilmedi`), karar kaynağı
  (`pencere`/`oturum_izni`/`teslim_izni`), SAP sonucu, ATC özeti.
- Şifre, token, kaynak kodun kendisi YOK.

## 9. Testler

**Launcher politikası (vitest):** her sınıf × her mod karar tablosu; oturum izni başka
transport/pakete geçmiyor; `HER_SEFER`'de oturum izni işlemiyor; süre dolması ve yeniden
başlama → onay yok; teslim izni yalnızca aynı üçlü; mod seçilmeden yazma reddi; argüman
hash'i farklıysa yeni istek.

**Python katmanı (pytest, SAP'sız — motor sahte nesneyle):** drift (her motor aracı tam bir
sınıfta, sınıfsız araç → başlamıyor); `KARMA`'da bilinmeyen mod → `HER_SEFER`; kalite
kapısının üç reddi ve bunlarda launcher'a sorulmaması; argüman hash'inin tek argüman
değişince değişmesi; launcher'a ulaşılamayınca ret; `approval_pending` sırasında motor
çağrılmıyor.

**Sözleşme testi (vitest, `rfcBridgeContract.test.ts` kalıbı):** launcher DEV'de
`adt_gated_server.py`'yi başlatıyor; `ADT_APPROVAL_URL`/`ADT_APPROVAL_TOKEN` adları iki
tarafta aynı; `tier_gate.py` `axet_abapgit_onay`'ı çağırıyor; SKILL.md başlarındaki NTT
blokları yerinde.

**Uçtan uca:** yalnızca iç test sisteminde (DS4), kullanıcının gözü önünde, kullanıcının
vereceği test paketi ve transport'la. Müşteri sistemlerine çağrı yok.

## 10. Talimat değişiklikleri

- `sap-context.md` (launcher üretiyor), DEV blokları: modlar; `approval_pending` → kullanıcıya
  pencereyi söyle, aynı çağrıyı aynı argümanlarla tekrarla; ret → dur, başka yol arama;
  kod yazan her işte önce `abap-code-review` ve `.sap-review` kaydı.
- `sap-adt/SKILL.md` ve `abapgit-deploy/SKILL.md` başı: "NTT Studio uyarlaması" bloğu —
  onay akışı ve "yazmayı kabuktan ya da SAP GUI'den dolanarak yapma".
- `abap-code-review/SKILL.md`: inceleme sonunda `.sap-review` kaydını yazma adımı.
- `resources/sap-toolkit/CLAUDE.md` tablosu: yeni/uyarlanmış dosyalar için satırlar
  (senkronda üzerine yazılmasın).
- `-y` ve yerel iş akışı değişmiyor.

## 11. Koda geçmeden önce ölçülecekler

1. axet-code'un kabuk komutu zaman aşımı; ajan `approval_pending` sonrası aynı çağrıyı
   güvenilir biçimde tekrar ediyor mu (yerel, SAP'sız: sahte bir 8787 ile).
2. Katmanın push öncesi paketi ve aktif kaynağı motorun kendi okumalarıyla alabilmesi ve
   bunun eklediği süre (iç test sistemi).
3. Motorun `adt_push`'ta transport'u çağrı anında nasıl çözdüğü: argümanda transport yoksa
   katman pencereye hangi transport'u yazacak (sahip transport / sabitlenmiş transport) —
   motorun kendi çözümleme fonksiyonu yan etkisiz çağrılabiliyor mu.

Ölçüm sonucu tasarımla çelişirse koda geçilmeden kullanıcıya dönülür.
