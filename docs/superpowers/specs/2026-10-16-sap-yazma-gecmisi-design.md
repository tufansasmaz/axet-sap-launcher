# SAP'ye yazılanlar — geçmiş ve CSV

Tarih: 2026-10-16 · Durum: kullanıcı onayladı (sohbette) · Dal: `ozellik/ajan-yetenekleri`

## 1. Neden

Müşteri ya da denetçi "yapay zekâ sistemimizde neyi değiştirdi, kim onayladı?" diye sorduğunda cevap tek tıkla verilebilsin. Bugün bunun için `sap-yazma-gunlugu.jsonl` dosyasını elle açmak gerekiyor. Yeni veri toplanmıyor; var olan kayıt okunuyor.

## 2. Kullanıcı kararları (2026-10-16)

- **Yer:** sistem panelinde, seçili sistemin detay kartında. Ayrı ekran yok.
- **Dışa aktarma:** CSV; işlem başına bir satır.
- **Tasarım (sohbette onaylandı):**
  - satırlar işlem başına birleştirilir;
  - en yeni 10 satır görünür, kalanı "Tümünü göster";
  - süzgeç yok.

## 3. Kaynak

Dosya: `<projectDir>/sap-yazma-gunlugu.jsonl`.

- `projectDir`, `computeProjectDir(config, customerPath, service)` ile hesaplanır. Bağlı olmak gerekmez.
- Her satır şu alanlarla başlar: `{zaman, tur, …}` ve kimlik alanları `sid`, `client`, `kullanici`, `mod`.

| `tur` | Ne zaman | Önemli alanlar |
|---|---|---|
| `karar` | Ajan yazmak istedi | `id` (yoksa null), `karar`, `kaynak`, `arac`, `sinif`, `transport`, `nesneler[{ad,tip,paket,yeni}]`, `paket?` |
| `cevap` | Kullanıcı pencerede seçti | `id`, `secim`: `reddet` \| `bu_seferlik` \| `oturum`, olgu alanları |
| `sonuc` | SAP'den dönen | `id`, `arac`, `transport`, `sap_sonucu{ok,success,activated,corrnr,error,error_type,message}`, `atc?` |
| `kalite_reddi` | ATC/kalite reddi (kimliksiz) | `arac`, `nesneler`, `sebep` |
| `mod`, `baglanti_uyusmazligi` | Oturum olayları | İşlem satırı değil, listelenmez |

`karar` değerleri:
- kimlikli: `izinli` (`kaynak`: `pencere` \| `oturum_izni` \| `ust_onay` \| `teslim_izni`), `bekliyor`, `reddedildi`, `sure_doldu`;
- kimliksiz: `mod_secilmedi`, `yerel_mod`.

## 4. İşlem satırı (`app-electron/shared/sapWriteHistory.ts`, saf)

`buildWriteHistory(lines: string[]): { ops: WriteOp[]; skipped: number }`

- **Birleştirme:**
  - Kimlikli satırlar `id` ile tek işlemde birleşir. Sıra fark etmez: önce `sonuc` gelse de olur.
  - Olgu alanları ilk dolu satırdan alınır: `arac`, `transport`, `nesneler`, `paket`, kimlik.
  - Kimliksiz `karar` ve `kalite_reddi` satırlarının her biri ayrı bir işlemdir.
  - `karar: "bekliyor"` tekrarları yeni işlem açmaz.
- **İşlemin zamanı** ilk satırının `zaman`'ıdır. Liste en yeniden eskiye sıralanır.
- **Onay** (`approval`):

  | Kaynak | Değer |
  |---|---|
  | `cevap.secim` = `bu_seferlik` | `onaylandi` |
  | `cevap.secim` = `oturum` | `oturum` |
  | `cevap.secim` = `reddet` | `reddedildi` |
  | `karar.kaynak` = `oturum_izni` | `oturum` |
  | `karar.kaynak` = `ust_onay` | `ust_onay` |
  | `karar.kaynak` = `teslim_izni` | `teslim` |
  | `karar` = `sure_doldu` | `sure_doldu` |
  | `karar` = `yerel_mod` | `engellendi` |
  | `karar` = `mod_secilmedi` | `engellendi` |
  | `kalite_reddi` | `kalite_reddi` |
  | yalnız `bekliyor` var | `yanitsiz` |

- **Sonuç** (`result`):

  | Durum | Değer |
  |---|---|
  | `sonuc` var ve `ok`/`success` doğru | `basarili` |
  | `sonuc` var ve `ok`/`success` doğru değil | `hata` |
  | `sonuc` yok | `yok` |

  `message`/`error` metni `sapMessage`'a yazılır (kırpılmış hâliyle).
- **Bozuk satırlar** (JSON değil ya da `tur` yok) atlanır ve `skipped` ile sayılır.

## 5. Ana süreç (`app-electron/main/sapWrite/history.ts`)

- **`sapWrite:history`** `(customerPath, service)` → `{ ok: true; ops; skipped; truncated } | { ok: false; reason: "okunamadi" }`.
  - Dosya yoksa `{ok:true, ops:[]}` döner.
  - Yalnız son 5 MB okunur; kesilmişse yarım ilk satır atılır ve `truncated: true` döner.
- **`sapWrite:exportCsv`** `(customerPath, service)`:
  - kaydetme penceresini açar; önerilen ad `sap-yazma-<SID>-<YYYYMMDD>.csv`;
  - dosyayı UTF-8 BOM ve CRLF ile yazar;
  - `{ ok: true; path; count } | { ok: false; canceled?: true; message? }` döner.
- **CSV** (`toCsv(ops)`, saf, `shared/sapWriteHistory.ts` içinde):
  - Ayraç `;`: Türkçe Excel'de virgül ondalık ayracıdır. Sütunlar: zaman (yerel, `YYYY-MM-DD HH:mm:ss`) · kullanıcı · SID · client · mod · araç · nesneler (`AD (TİP)` öğeleri `, ` ile) · paket · transport · onay · sonuç · SAP mesajı.
  - Kaçış: `;`, `"` ya da satır sonu içeren hücre tırnağa alınır ve `"` iki kez yazılır.
  - `=`, `+`, `-`, `@`, sekme ya da CR ile başlayan hücrenin başına `'` eklenir. Excel hücreyi formül diye çalıştırmasın.

## 6. Arayüz (`src/components/WriteHistory.tsx`)

- **Yer ve görünürlük:**
  - `SystemPanel` detay kartında, `AgentCapabilities`'ten sonra.
  - Seçili sistem değişince ve panel açılınca bir kez okunur. Sürekli yoklama yok.
  - `ops` boşsa ve hata yoksa bölüm hiç çizilmez.
- **Başlık:** "SAP'ye yazılanlar (N)". Sağında hayalet düğme "CSV olarak kaydet".
- **Satır** (bağlantı bilgileriyle aynı düzen):
  - tarih `16.10 14:32`;
  - nesneler `ZCL_X +2`;
  - transport;
  - durum metni ve küçük nokta. Nokta renkleri: başarılı = success, hata = danger, reddedildi/engellendi/kalite reddi/süresi doldu = warning, öteki = nötr. Lime yok.
- **Ayrıntı:** satıra tıklayınca altında açılır: kullanıcı, client, mod, araç, paket, nesnelerin tamamı, onay, SAP mesajı.
- **Liste uzunluğu:** ilk 10 satır görünür; "Tümünü göster (N)" listeyi açar.
- **Durumlar:**
  - `skipped > 0` ya da `truncated`: başlığın altında tek satır soluk not;
  - `ok:false`: "Kayıt okunamadı";
  - CSV sonucu bildirim olarak gösterilir.

## 7. Test

- `buildWriteHistory`:
  - üç satırın birleşmesi, sıra karışık;
  - `bu_seferlik` + başarılı;
  - `reddet`;
  - `sure_doldu`;
  - `oturum_izni` (cevapsız);
  - `yerel_mod` (kimliksiz);
  - `kalite_reddi`;
  - yalnız `bekliyor`;
  - hata sonucu ve mesaj;
  - bozuk satır sayımı;
  - en yeniden eskiye sıra.
- `toCsv`: BOM yok (BOM'u yazan ekler), başlık satırı, `;`/`"`/satır sonu kaçışı, `=`/`+`/`-`/`@` koruması.
- `history.ts`:
  - dosya yok → boş;
  - 5 MB üstü → `truncated`;
  - CSV yazımı: BOM ve CRLF, iptal.
- `WriteHistory`:
  - boşta görünmüyor;
  - 10 satır ve "Tümünü göster";
  - ayrıntı açılıyor;
  - CSV düğmesi çağrıyı yapıyor;
  - okunamadı durumu.

## 8. Kapsam dışı

- Süzgeç ve arama.
- Tüm sistemleri tek listede gösteren ekran.
- Kaydı silme ya da düzenleme.
- Kaynak kod farkı. Kayıtta zaten yok, bilerek.
