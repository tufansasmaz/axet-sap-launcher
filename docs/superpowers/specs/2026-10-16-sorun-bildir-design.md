# Sorun bildir — destek paketi

Tarih: 2026-10-16 · Durum: kullanıcı onayladı (sohbette) · Dal: `ozellik/ajan-yetenekleri` üzerinden

## 1. Neden

Yavaşlık şikâyetinde (1.8.x) kullanıcılar günlük dosyalarını gönderemedi ("dosyayı alabilecek durumda değilim"). Kök nedeni bulmak günler sürdü, oysa `ntt-studio.log` ve `axet-code.log` gereken bilginin çoğunu zaten taşıyordu. Hedef: kullanıcı tek tıkla, ne gönderdiğini görerek, gizli değer sızdırmadan bir paket yollayabilsin.

## 2. Kullanıcı kararları (2026-10-16)

- Paket bir zip. Outlook'ta ek'i takılı bir **taslak** açılır. Açılamazsa klasör açılır ve dosya seçili gelir. Uygulama hiçbir yere kendisi veri göndermez.
- Sohbet içeriği yalnız kullanıcı pencerede işaretlerse girer (varsayılan kapalı, seçili sohbet).
- Proje klasöründeki ajan günlükleri girer, gizli değerler maskelenerek.

## 3. Arayüz

- **Ayarlar → Gelişmiş:**
  - Tek eylem satırı: "Sorun bildir…".
  - Yeni alan: "Destek e-posta adresi" (`config.supportEmail`, boş olabilir).
- **Komut paleti:** "Sorun bildir" komutu.
- **Pencere** (ortak `Modal`):
  - "Ne oldu?" çok satırlı kutu, isteğe bağlı, en fazla 4000 karakter.
  - "Seçili sohbetin mesajlarını da ekle" kutusu ve altında "müşteri verisi içerebilir" uyarısı.
  - Pakete girecek dosyaların adları (liste ana süreçten gelir).
  - **Paketi oluştur** / Vazgeç düğmeleri.
- **Sonuç:** bildirim satırı. Outlook açıldıysa "Taslak Outlook'ta açıldı". Açılamadıysa "Paket kaydedildi: <yol>" ve klasör açılır.

## 4. Paket

Konum: `Belgeler\NTT Studio Destek\ntt-studio-destek-<YYYYMMDD-HHmmss>.zip`. Kayıt klasörü yoksa oluşturulur.

| Dosya | Kaynak | Not |
|---|---|---|
| `bilgi.json` | ana süreç | Uygulama, Electron ve Chromium sürümleri; axet-code ve toolkit sürümleri; Windows sürümü; dil; rol; bağlı sistemin SID'i, client'ı ve kademesi; 8787 durumu ve araç sayısı; Doktor raporu; maskeleme sayıları |
| `ntt-studio.log`, `ntt-studio.log.1` | userData/logs | Varsa |
| `sohbet-zamanlari.json` | `chat-sessions.json` | Sohbet başına: id, başlık uzunluğu, `createdAt`/`updatedAt`, model adı. Mesaj başına: rol, `createdAt`, `error`, `interrupted`, içerik uzunluğu, ek sayısı, araç adları. **Metin yok, başlık yok.** |
| `axet-code.log` | `<bağlı projectDir>/.axet-code/logs/` | Son 2 MB, maskelenmiş |
| `adt-sunucu.log` | `<bağlı projectDir>/adt-readonly.log` | Son 2 MB, maskelenmiş |
| `sohbet.md` | seçili sohbet | Yalnız kutu işaretliyse; mesaj metinleri, maskelenmiş |
| `not.txt` | kullanıcı | Boşsa yok |

**Asla girmeyenler** (testle sabit): `.conn_adt`, `config.json` (ham), `.saml_cookies.json`, `axet-code.db`/`-wal`/`-shm`, ek dosyaları, `sap-context.md`.

Bağlantı yoksa proje günlükleri girmez; `bilgi.json` bunu söyler.

## 5. Maskeleme (`app-electron/main/support/redact.ts`)

Pakete giren her metin `redact(text, secrets)`'ten geçer.

1. **Bilinen değerler birebir** `«gizli»` olur:
   - ADT HTTP anahtarı (`getAdtHttpToken()`).
   - Etkin onay oturumu anahtarları.
   - Kayıtlı SAP şifreleri (`safeStorage` ile çözülmüş, yalnız bellekte).
   - 8 karakterden kısa değerler atlanır, yoksa yanlış eşleşme çok olur.
2. **Kalıplar:**
   - `Bearer\s+[A-Za-z0-9._~+/=-]{8,}`
   - `gh[pousr]_[A-Za-z0-9]{20,}`, `github_pat_[A-Za-z0-9_]{20,}`
   - JWT: `eyJ[\w-]+\.[\w-]+\.[\w-]+`
   - `(password|passwd|pwd|parola|şifre|token|secret|api[_-]?key|ADT_SAP_PASSWORD)\s*[=:]\s*\S+`; anahtar adı kalır, değer `«gizli»` olur.
   - `Authorization:\s*\S+(\s+\S+)?`

Dönen değer: maskelenmiş metin ve kalıp başına sayı. Sayılar `bilgi.json`'a yazılır; değerler hiçbir yere yazılmaz.

## 6. Zip (`app-electron/main/support/zipWriter.ts`)

Bağımlılık eklenmiyor. Yerel dosya başlığı, merkezi dizin ve EOCD yazılıyor. Sıkıştırma `zlib.deflateRawSync`, sağlama `zlib.crc32` ile yapılıyor. Dosya adları UTF-8 (genel amaçlı bayrağın 11. biti). Toplam boyut küçük (en fazla ~10 MB), ZIP64 yok.

## 7. Outlook taslağı (`app-electron/main/support/outlookDraft.ts`)

- `powershell.exe -NoProfile -NonInteractive -Command` ile Outlook COM üzerinden çalışır:
  - `New-Object -ComObject Outlook.Application`
  - `CreateItem(0)`
  - `To` / `Subject` / `Body` / `Attachments.Add(zip)`
  - `Display()`
- Değerler komut satırına gömülmüyor, ortam değişkenleriyle geçiyor; tırnak ve enjeksiyon sorunu olmuyor.
- Zaman aşımı 20 sn. Çıkış kodu 0 değilse ya da Outlook yoksa `shell.showItemInFolder(zip)`.

## 8. IPC

- `support:preview` → `{ files: string[] }`: neyin gireceği, sohbet kutusu kapalıyken.
- `support:create` (`{ note: string; includeChat: boolean; chatId: string | null }`) → `{ ok: true; zipPath: string; draft: "outlook" | "folder" } | { ok: false; message: string }`.

## 9. Test

- `redact`: her kalıp; bilinen değer; kısa değerin atlanması; sayılar.
- `zipWriter`: Python `zipfile` ile açılıp içerik karşılaştırılıyor. CI'da Python yoksa Node ile EOCD ve CRC denetimi yapılıyor.
- Paket kurucu: geçici bir projectDir'de `.conn_adt`, `axet-code.db`, `config.json` var ama pakette yok. Sohbet metni yalnız `includeChat` ile giriyor. `sohbet-zamanlari.json`'da `content` ve `title` yok. Günlükteki sahte anahtar `«gizli»` oluyor.
- `outlookDraft`: başarısız çıkışta klasöre düşüş (spawn sahte).
- Pencere: dosya listesi, kutu, düğme, sonuç bildirimi.

## 10. Kapsam dışı

- Otomatik yükleme ya da bilet sistemi.
- Ekran görüntüsü.
- Birden çok projenin günlükleri (yalnız bağlı olan).
