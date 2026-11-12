# Çoklu sistem bağlantısı — tasarım (2026-11-12)

Hedef: kullanıcı aynı anda birden fazla SAP sistemine bağlı kalabilsin; her
sohbet ve ajan bölmesi KENDİ sistemiyle çalışsın; bir sisteme bağlanmak
ötekini düşürmesin. Tek sistem kullanımı bugünkü gibi çalışır.

## Bugün (ölçüldü, `duzeltme/kararlilik` d8d4cfe)

| Parça | Bugün | Sorun |
|---|---|---|
| ADT sunucusu (`adtReadonlyServerManager.ts`) | sabit 8787; kayıt `projectDir` anahtarlı, ama "port tek, sahibi tek proje" döngüsü başka projeninkini durduruyor | ikinci bağlantı birinciyi düşürüyor |
| RFC köprüsü (`rfcBridgeManager.ts`) | sabit 8788; `connectToSystem` `stopRfcBridgesExcept(projectDir)` çağırıyor | aynı |
| Jeton (`adtHttpToken.ts`) | süreç başına TEK jeton, `process.env.ABAP_HTTP_TOKEN`'a yazılıyor, her alt süreç kalıtımla alıyor | bütün süreçler aynı jetonu taşıyor; sistem ayrımı yok |
| Onay oturumu (`sapWrite/server.ts`) | zaten `projectDir` + kimlik (SID/client/user) başına; ama bağlanırken `closeAllWriteSessions()` | ötekinin onay oturumu kapanıyor |
| Bağlam (`activeContext.ts`) | tek `sap` | tek sistem |
| Sohbet/ajan | `cwd` = sistemin proje klasörü; bağlam bloğu zaten `cwd` eşleşmesiyle giriyor | port/jeton `cwd`'den değil global ortamdan |

Port ve jetonu kim nereden okuyor:

- **Sunucular** (`adt_gated_server.py`, `adt_readonly_server.py`, motor
  `adt_mcp_server.py`, `adt_rfc_bridge.py`): portu `--port` argümanından,
  jetonu `ABAP_HTTP_TOKEN` ortam değişkeninden. İkisini de biz veriyoruz →
  motora dokunmaya gerek yok.
- **Ajan (axet-code) ve becerileri**: SKILL.md'lerdeki NTT Studio uyarlama
  blokları ve `sap-context.md` `http://127.0.0.1:8787` yazıyor (sabit metin);
  jetonu `os.environ['ABAP_HTTP_TOKEN']`'dan okuyor.
- **`tier_gate.py`** (abapgit-deploy, bizim dosyamız): `ADT_HTTP_URL` sabit
  8787, jeton ortamdan.
- **`.conn_adt`**: RFC modunda `ADT_SAP_URL=http://127.0.0.1:<köprü>` ve
  `ADT_RFC_BRIDGE_PORT` — bağlanırken biz yazıyoruz.

## Beş karar

1. **Sistem = proje klasörü.** Kayıt anahtarı `projectDir` (normalize). Her
   landscape girdisinin klasörü zaten ayrı (`computeProjectDir`); `.conn_adt`,
   onay oturumu, sohbet bağlaması zaten klasör başına. SID+client+kullanıcı
   kaydın kimliği (ekranda, onay penceresinde); aynı klasöre başka
   client/kullanıcıyla yeniden bağlanmak o kaydı değiştirir (bugünkü gibi —
   `.conn_adt` tek).
2. **Sistem başına süreç, dinamik port.** Her sistemin kendi ADT sunucusu ve
   (gerekirse) RFC köprüsü. İlk sistem 8787/8788'i alır (geriye uyum); 8787
   başka bir sistemdeyse ya da yabancı bir süreçteyse 8800–8899 aralığında boş
   port (TCP bind ile denenir, kayıttakiler atlanır). Kararlılık dalındaki
   sahiplik kanıtı (`staleOwnServer`) 8787'de aynen; yabancı süreç 8787'yi
   tutuyorsa artık bağlantı düşmüyor, dinamik porta geçiliyor.
3. **Sistem başına jeton, ortamdan değil kayıttan.** Jeton sistem kaydında,
   yalnız bellekte; `process.env`'e yazılmıyor (global jeton kaldırıldı).
   Ajan/sohbet/terminal süreci açılırken `cwd`'sinin ait olduğu sistemin
   `ABAP_HTTP_TOKEN` + `ABAP_HTTP_URL` + `ABAP_HTTP_PORT` değerleri o sürecin
   ortamına konur (`adtEnvForCwd`). `cwd` hiçbir sisteme ait değilse
   **odaktaki** sistem kullanılır (tek sistemde bugünkü davranışın aynısı).
4. **Kurallar sistem başına.** Onay oturumu zaten `projectDir` + kimlik;
   bağlanırken yalnız o klasörün oturumu yenileniyor. QA/PRD salt okunur kuralı
   sunucu ortamına (`NTT_STUDIO_SAP_TIER`) sistem başına veriliyor — DEV'in
   yazan sunucusu ile PRD'nin salt okunur sunucusu ayrı süreç, ayrı jeton; PRD
   bölmesinin jetonu DEV sunucusunu açmıyor. Transport onayı aynen.
5. **Kaynak sınırı ve yaşam döngüsü.** En çok 4 eşzamanlı sistem. Beşinciye
   bağlanınca en uzun süredir kullanılmayan (LRU: bağlanma, odak, o sisteme
   süreç açılması "kullanım") sistem kesilir ve kullanıcıya adıyla söylenir.
   Kesme sistem başına (onay → ADT → köprü). Uygulama kapanınca hepsi kapanır
   (mevcut `stopAll*`).

## Port/jetonun ajana iletimi

Vendored motor ve beceri betikleri DÜZENLENMİYOR. Çözüm bizim katmanımızda:

- Sunucuya `--port` + `ABAP_HTTP_TOKEN` (zaten vardı, artık sistem başına).
- Ajan sürecine `ABAP_HTTP_URL`/`ABAP_HTTP_PORT`/`ABAP_HTTP_TOKEN`
  (`axetSpawnEnv(useConnectors, cwd)`, terminal, axet-flows/GUI ajanları).
- `sap-context.md` ve bağlam bloğu sistemin GERÇEK portunu yazıyor; komut
  örnekleri `os.environ.get('ABAP_HTTP_URL', ...)` kullanıyor.
- SKILL.md'lerdeki NTT Studio uyarlama blokları (bizim metnimiz) "`$ABAP_HTTP_URL`
  (varsayılan 8787)" diyor; `tier_gate.py` adresi `ABAP_HTTP_URL`'den okuyor.
  `toolkit-version.json` resmi betikle yeniden üretiliyor.

## Arayüz

- Üst şerit: bağlı sistemler çip olarak (SID, client/kullanıcı, kademe,
  durum noktası); çipe tık = odak (+ sistemi göster), çarpı = yalnız o sistemi kes.
- Sohbet başlığı: sohbetin `cwd`'si bir sisteme aitse o sistemin SID'i.
  Ajan çalışma alanları zaten `sap` etiketi taşıyor.
- Logon listesi: her bağlı sistem için "bağlı" işareti (yalnız odaktaki değil).
- Sistem seçimi: sohbet/bölme sistemin klasöründe açılır (bugünkü gibi);
  hangi sistemin açılacağını odak belirler, odak çiplerden değişir.

## Geriye uyumluluk

`ActiveContext.sap` = odaktaki sistem (eski tüketiciler değişmeden çalışır);
yeni alan `systems`. Tek sistemde port 8787/8788, metinler aynı.

## Bilinen sınırlar (bilinçli)

- Boşta kalma için zamanlı kapatma yok; yalnız sınırda LRU.
- Aynı SID'in iki client'ı için iki ayrı landscape girdisi gerekir (klasör anahtarı).
- Bağlantı ÖNCESİ açılmış bir terminal, sonradan bağlanan sistemin jetonunu
  göremez (ortam açılışta verilir — bugün de böyle).
