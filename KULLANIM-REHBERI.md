# aXet SAP Launcher — Kullanım Rehberi

Bu uygulama, SAP Logon'da tanımlı müşteri/sistem listeni okuyup, seçtiğin
sisteme bir tık ile bağlanmanı ve o sistem için hazırlanmış bir
**axet.code terminali** açmanı sağlar. Amaç: her SAP sistemine bağlanırken
host/port/ADT URL keşfi, kimlik doğrulama, sertifika güveni gibi işleri
elle tekrar tekrar yapmak zorunda kalmamak.

## Uygulama Ne Yapar (özet)

1. Bilgisayarındaki **SAP Logon** (SAPUILandscape.xml) dosyasını okur,
   müşteri/sistem ağacını sol panelde gösterir.
2. Bir sisteme tıklayıp "axet.code'da Aç" dediğinde:
   - Sistemin gerçek ADT (REST API) adresini otomatik bulur (SAPGUI dispatcher
     portundan HTTPS/ICM portunu hesaplar, doğru host'u DNS/redirect ile
     doğrular).
   - Girdiğin kullanıcı adı/şifreyle SAP'a gerçek bir istek atıp kimlik
     bilgilerini **doğrular** (başarısızsa terminal açmaz, hatayı gösterir).
   - Sertifika güvenilir değilse Windows sertifika deposuna otomatik ekler.
   - Belgelerim klasöründe (ayarlardan değiştirilebilir) müşteri/sistem
     adına göre bir alt klasör açar, içine bağlantı bilgilerini ve SAP
     araçlarını (skill'ler) yerleştirir.
   - `axet.code`'u çalıştıran bir terminal **uygulamanın kendi içinde, alt
     panelde gömülü olarak** açılır — harici bir pencere açılmaz, her
     bağlantı kendi sekmesinde birikir.

## Ekranın Bölümleri

- **Üst arama çubuğu**: Müşteri/sistem adına göre anlık filtre.
  **Ctrl+F** (veya Cmd+F) her an arama kutusuna atlar; kutudayken **Esc**
  veya yanındaki **X** ile aramayı tek tıkla temizlersin.
- **Sistem Ekle**: SAP Logon'da olmayan bir sistemi (örn. bir BTP/Cloud
  sistemi veya farklı bir on-premise sistemi) elle eklemek için.
- **SAP Logon'dan Getir**: SAP Logon dosyanda yaptığın değişiklikleri (yeni
  eklenen sistemler vb.) yeniden okur.
- **Güneş/Ay ikonu**: Açık/koyu tema.
- **Ayarlar**: Proje klasörü, axet.code komutu, terminal tipi,
  SAP Logon dosya yolu gibi ayarlar.
- **Alt panel — Gömülü Terminal**: Bir sisteme bağlandığında burada yeni
  bir sekme açılır; birden fazla sisteme bağlanırsan hepsi burada sekme
  sekme birikir. Sekmeye tıklayınca o terminale geçersin, X ile kapatırsın,
  panelin üstündeki oku tıklayarak paneli tamamen kapatıp açabilirsin,
  panelin üst kenarından sürükleyerek yüksekliğini ayarlayabilirsin.
- **Sol panel — Son Bağlanılanlar**: Arama kutusu boşken sol panelin en
  üstünde en son bağlandığın (en fazla 5) sistem, en yeniden en eskiye
  görünür. Tıklayınca doğrudan o sisteme geçer.
- **Sol panel — Müşteri/sistem ağacı**: Yanındaki renkli nokta erişilebilirlik
  durumunu gösterir (gri=bilinmiyor, sarı=kontrol ediliyor, yeşil=erişilebilir,
  kırmızı=erişilemiyor/VPN sorunu). Uygulama açılışta/listeyi yeniden
  yüklediğinde **tüm sistemleri otomatik ve paralel olarak** tarar — noktalar
  kendiliğinden dolar, tek tek tıklayıp kontrol etmen gerekmez.
  **Klavye ile gezinebilirsin**: ağaca tıkladıktan/Tab ile geçtikten sonra
  **↑/↓** satırlar arasında gezinir, **→/←** bir klasörü açar/kapatır,
  **Enter** (veya Space) odaktaki klasörü açar-kapatır ya da odaktaki
  sisteme geçer. Fare ile tıklamak da klavye odağını o satıra taşır —
  ikisini birbirine geçişli kullanabilirsin.
- **Sağ panel**: Seçili sistemin detayları, en son ne zaman bağlandığın
  ("Son bağlantı: 3 saat önce" gibi, hiç bağlanılmadıysa "Henüz
  bağlanılmadı") ve "axet.code'da Aç" butonu. ADT adresi/host:port ve
  UUID satırlarının yanındaki kopyala ikonuyla bu değerleri tek tıkla
  panoya alabilirsin.

## Manuel Sistem Ekleme/Düzenleme/Silme

SAP Logon'da olmayan sistemler (örn. bir müşterinin BTP ABAP Environment'ı)
"Sistem Ekle" ile eklenebilir:

- **On-Premise**: Host (IP/hostname) ve SAPGUI DIAG portu ver — ADT adresi
  otomatik keşfedilir (SAP Logon sistemleri gibi).
- **BTP / Cloud**: Doğrudan ADT/sistem URL'ini yapıştır. Keşif yapılmaz,
  URL'e direkt bağlanılır.

Manuel eklenen sistemler sol panelde **"Manuel Eklenen Sistemler"** grubunda,
her zaman listenin en üstünde görünür. Bir manuel sistemi seçtiğinde sağ
panelde başlığın yanında **Düzenle** ve **Sil** butonları çıkar:

- **Düzenle**: Aynı formu, mevcut bilgilerle dolu şekilde açar; bilgileri
  güncelleyip kaydedebilirsin.
- **Sil**: Sistemi listeden kalıcı olarak kaldırır — geri alınamayacağı için
  önce bir onay penceresi çıkar.

Manuel sistem listeni bir JSON dosyasına **dışa aktarıp** başka bir
bilgisayara/kullanıcıya **içe aktarabilirsin** — Ayarlar penceresindeki
"Manuel Sistemler" bölümünden (bkz. aşağıdaki Ayarlar bölümü).

## Sistem Önem Derecesi (DEV / QA / PRD)

Sağ panelde her sistemin üstünde bir **önem derecesi** rozeti (DEV/QA/PRD)
görebilirsin:

- Sistem adında/ID'sinde "PRD", "PROD", "QA", "TEST", "DEV" gibi kalıplar
  varsa uygulama otomatik bir tahminde bulunur (rozetin yanında
  "(otomatik tahmin)" yazar).
- Sağ paneldeki **DEV / QA / PRD** butonlarına tıklayarak bu tahmini
  değiştirebilir veya elle atayabilirsin — bu tercih kalıcıdır (bilgisayarda
  saklanır), tekrar seçmen gerekmez. "Temizle" ile elle atanmış etiketi
  kaldırıp otomatik tahmine dönebilirsin.
- Bir sistem **PRD** olarak işaretliyse, "axet.code'da Aç" butonunun
  üzerinde belirgin bir **uyarı** görünür — yanlışlıkla production'a
  bağlanma riskini azaltmak için.
- Bu etiketler sadece görsel bir hatırlatmadır; bağlantı davranışını
  değiştirmez.

## Sisteme Bağlanma (Kimlik Bilgileri)

"axet.code'da Aç" dediğinde bir kimlik bilgisi penceresi açılır:

- **Kullanıcı Adı / Şifre / Client**: Bu alanlara normal şekilde
  **yapıştırma (Ctrl+V) yapabilirsin** — kopyala/yapıştır tüm alanlarda
  çalışır. Şifre alanının yanındaki göz ikonuyla yazdığını görünür/gizli
  yapabilirsin (yanlış girip girmediğini kontrol etmek için).
- Daha önce bu sisteme bağlandıysan kullanıcı adı ve client otomatik
  doldurulur (şifre SAP Logon'daki Memo alanında saklıysa o da gelir).
- **Cloud/BTP sistemlerde Client alanı boş bırakılabilir** — boş
  bırakılırsa uygulama otomatik olarak varsayılan bir client (100) atar,
  tekrar sormaz. Bu, bazı ADT uçlarının client parametresi istemesinden
  kaynaklanan hataları önler; sistemin "gerçek" client'ı olduğu anlamına
  gelmez.
- Kimlik bilgileri yanlışsa (401) veya sistem ağdan erişilemezse net bir
  hata mesajı gösterilir, terminal açılmaz.

## Bağlandıktan Sonra Açılan Klasörde Ne Var

Her sistem için oluşturulan proje klasöründe:

- **`.conn_adt`**: Doğrulanmış bağlantı bilgileri (ADT URL, kullanıcı,
  şifre, client). **Asla paylaşma / commit etme** — otomatik `.gitignore`'a
  eklenir.
- **`adt-tool.ps1`**: PowerShell ile SAP'a ADT isteği atmak için basit bir
  yardımcı script (fallback).
- **`sap-context.md`**: axet.code'un session başında okuyacağı, sistemle
  ilgili tüm bilgiyi (müşteri, sistem, doğrulama notları, kullanılabilir
  skill'ler) içeren dosya. Sen bu dosyanın en altındaki "Notlar" bölümüne
  serbestçe not ekleyebilirsin — yeniden bağlanınca silinmez, korunur.
- **`.axet-code/skills/`**: SAP'a ADT üzerinden salt-okunur erişim, abapGit
  teslim akışı, Office doküman araçları gibi hazır skill'ler otomatik
  kopyalanır; terminalde `%skill-adı` yazarak çağrılabilir.

## Ayarlar

- **Proje klasörü**: Her müşteri/sistem için alt klasörlerin oluşturulacağı
  kök dizin (varsayılan: Belgelerim\aXet SAP Projects).
- **axet.code çalıştırma komutu**: Terminal açıldığında otomatik çalıştırılan
  komut (varsayılan: `axet-code -y`).
- **Gömülü terminal kabuğu**: cmd.exe veya PowerShell — bağlandığında
  uygulamanın altındaki panelde bu kabukla bir terminal sekmesi açılır,
  harici pencere açılmaz.
- **SAPUILandscape.xml yolu**: Normalde otomatik bulunur
  (`%APPDATA%\SAP\Common\SAPUILandscape.xml`). SAP Logon'un dosyası farklı
  bir yerde tutuluyorsa burada elle belirtilir.
- **Manuel Sistemler — Dışa Aktar / İçe Aktar**: "Dışa Aktar" tüm manuel
  eklediğin sistemleri bir JSON dosyasına yazar (dosya konumunu sen
  seçersin). "İçe Aktar" bir JSON dosyasından sistemleri okuyup mevcut
  listene ekler — aynı ad+sistem ID+host/URL'e sahip kayıtlar tekrar
  eklenmez (otomatik atlanır), sonunda kaç kayıt eklendiği/atlandığı
  bildirilir. Bu, manuel sistem tanımlarını takım arkadaşlarınla veya
  başka bir bilgisayarınla paylaşmak için kullanılır.

## Dosya Gezgini ve Dosya Önizleme

Sağ paneldeki sistem detayının yanında, VS Code'a benzer bir **Dosya
Gezgini** paneli açılır — bu, o sistem için oluşturulan proje klasörünün
(`.conn_adt`, `sap-context.md`, `.axet-code/skills/` vb.) canlı bir ağacıdır:

- Klasörler tıklanınca açılır/kapanır (VS Code gibi tembel/lazy yüklenir).
- Bir dosyaya tıklayınca üstte bir **sekme** açılır ve içeriği ana panelde
  gösterilir — birden fazla dosya açıp sekmeler arasında geçebilirsin,
  "Sistem Detayı" sekmesiyle sistem bilgisi paneline geri dönebilirsin.
- **Metin dosyaları** (`.txt`, `.md`, `.json`, `.xml`, `.ps1`, `.log`, kaynak
  kodu dosyaları vb.) doğrudan okunabilir biçimde gösterilir.
- **Word (.docx)** dosyaları biçimlendirilmiş (başlık, paragraf, tablo)
  olarak gösterilir.
- **Resimler** (`.png`, `.jpg`, `.gif`, `.svg` vb.) doğrudan görüntülenir.
- Uygulama içinde gösterilemeyen dosya türleri (PDF, Excel, PowerPoint,
  zip vb.) için "Harici Programda Aç" veya "Klasörde Göster" butonları
  çıkar — sistemin varsayılan programıyla açılır.
- Bu panel henüz bağlanılmamış bir sistem için "Bu sistem için proje
  klasörü henüz yok" mesajı gösterir; "axet.code'da Aç" ile bir kere
  bağlanınca klasör oluşur ve içerik burada görünür. Panelin sağ kenarını
  sürükleyerek genişliğini ayarlayabilirsin.

## Diğer Bilgisayara Taşıma / Kurulum

Uygulama **portable**'dır, kurulum gerektirmez:

- `release/win-unpacked/` klasörünü olduğu gibi kopyala, içindeki
  `aXet SAP Launcher.exe`'yi çalıştır. Ya da
- `release/aXet SAP Launcher 1.2.0.exe` tek dosyasını çalıştır.

Her bilgisayarda SAP Logon'un landscape dosyası kendi standart konumundan
otomatik okunur — farklı bilgisayarlarda farklı SAP sistemleri tanımlıysa,
uygulama o bilgisayardaki listeyi gösterir. Eğer SAP Logon'un dosyası
standart olmayan bir yoldaysa, Ayarlar'dan bir kere elle yol belirtilir.

## Sık Sorulan Sorunlar

- **"Bu sisteme ağ üzerinden erişilemiyor"**: VPN bağlı değil veya sistem
  şu an kapalı/erişilemez olabilir.
- **401 Unauthorized**: Kullanıcı adı/şifre yanlış veya hesap kilitli.
- **SAML SSO hatası (Cloud sistemlerde)**: Bazı BTP/Cloud sistemleri SAML
  ile giriş ister; `sap-context.md` dosyasında bu durum için adım adım
  çözüm (tarayıcı ile giriş, cookie kaydetme) otomatik yazılır.
- **Sertifika hatası**: Uygulama kendisi sertifikayı güvenilir listeye
  eklemeye çalışır; başarısız olursa not olarak `sap-context.md`'ye yazılır.
- **"Route permission denied" / -94 (SAProuter'lı sistemler)**: Bazı
  müşterilerin SAProuter'ı SAP Logon'un kullandığı native bağlantıya izin
  verirken ADT'nin düz HTTPS'ini engeller. Bu durumda uygulama terminali
  yine de açar ve `.conn_adt` + `sap-context.md`'ye bir **RFC bridge** modu
  yazar (`ADT_RFC_MODE=true`) — terminaldeki asistana `%sap-adt-readonly`
  skill'inin "Router-only sistemler (RFC bridge)" bölümünü okumasını söyle;
  orada SAP NW RFC SDK kurulumu (kendi SAP kullanıcı hesabınla indirilir)
  ve bridge'i başlatma adımları var. Kalıcı çözüm Basis ekibinin
  `saprouttab`'a bir izin satırı eklemesidir, ama bridge bunu beklemeden
  çalışır.
- **Uygulama açılırken yavaş/donuk hissediliyor**: Genellikle SAP Logon'un
  landscape dosyasındaki **network Include** (merkezi/paylaşılan landscape)
  dosyalarından biri VPN kapalıyken/ağ yavaşken okunmaya çalışıldığı için
  olur. Uygulama artık bu okumaları paralel ve zaman sınırlı (4 saniye)
  yapıyor, tek bir ulaşılamayan ağ yolu tüm açılışı kilitlemiyor — ama VPN
  bağlıysa ve ağ hâlâ yavaşsa ilk açılış birkaç saniye sürebilir, bu
  normaldir. Bildirimler (toast) art arda aynı mesajı gösteriyorsa
  yığılmaz, "×3" gibi bir sayaçla tek toast'ta birleşir; bir toast'a
  tıklayarak hemen kapatabilirsin.
