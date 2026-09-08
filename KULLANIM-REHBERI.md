# NTT Studio — Kullanım Rehberi

Bu uygulama, SAP Logon'da tanımlı müşteri/sistem listeni okuyup seçtiğin
sisteme bir tık ile bağlanmanı, ardından o sistem üzerinde **axet.code ile
sohbet ederek** çalışmanı sağlar. Amaç: her SAP sistemine bağlanırken
host/port/ADT URL keşfi, kimlik doğrulama, sertifika güveni gibi işleri
elle tekrar tekrar yapmak zorunda kalmamak.

> Uygulamanın adı **NTT Studio**. Depo ve eski belgelerde geçen "aXet SAP
> Launcher" aynı uygulamanın önceki adı; SAP Launcher artık uygulamanın
> içindeki modüllerden biri.

## Soldaki Ray — Üç Modül

En soldaki ince dikey şeritten modüller arasında geçersin:

- **Axet Chat** (kıvılcım ikonu) — Asıl çalışma ekranı. Bağlandığın sistem
  bağlamında sohbet edersin. (Arkada çalışan komut satırı aracının adı hâlâ
  `axet-code`; ekranın adı Axet Chat.)
- **SAP Launcher** (sunucu ikonu) — Müşteri/sistem ağacı, bağlanma, proje
  klasörü. Bu rehberin büyük kısmı bu modülü anlatıyor.
- **SAP GUI Scripting** (fare ikonu) — SAP GUI ekranlarını gezme, işlem
  kaydedip tekrar oynatma, doğal dille otomasyon.

Rayın altında **Hazırlık** (stetoskop ikonu), hemen altında **Uygulama
Bağlantıları** (fiş ikonu — Outlook/SharePoint gibi aXet bağlayıcıları),
açık/koyu tema, dil (TR/EN) ve **Ayarlar** var. Bağlayıcılardan en az biri
bağlıysa fiş ikonunun üstünde küçük bir nokta belirir. Bu pencere **Esc**
ile kapanır.

## Hazırlık Ekranı

Stetoskop ikonu, bir tur başlamadan önce doğru olması gereken her şeyi tek
ekranda toplar. Ekran genişliğine göre bir, iki ya da üç sütuna açılır:

- **Proje reçetesi** — Ajanın bu projede neyi bileceği. Müşteri, kapsam,
  kısıtlar; sen yazarsın, ajan her turda okur.
- **Yapay zekâ yetenekleri** — Danışman rolü ve o role ait yetenekler
  (aşağıda ayrıntılı).
- **Ortam teşhisi** — Makine bu işi taşıyabiliyor mu (axet-code sürümü,
  Python, RFC bileşenleri, disk). Bir arıza varsa raydaki stetoskop
  ikonunun üstünde nokta belirir.
- **Ajan ne görüyor** — `sap-context.md` dosyasının kendisi. Ajana giden
  bağlamı doğrulamak için okunur.

### Danışman rolü ve yetenekler

**Uygulamayı ilk açtığında** karşına çıkan ilk pencere bunu sorar: modül
danışmanı mısın, teknik danışman mı? İki seçenek var, üçüncüsü yok.

Bu pencerenin üç kuralı var ve bilerek böyle:

- **Zorunludur.** İptal düğmesi yoktur, önceden seçili bir rol gelmez.
  Bir rol seçmeden onay düğmesi açılmaz.
- **Bir kere sorulur.** Daha önce rol seçilmişse bir daha çıkmaz.
- **Kalıcıdır.** Seçtiğin rol sonradan değiştirilemez — ne Hazırlık
  ekranından ne başka bir yerden. Hazırlık ekranında rolün yalnızca
  kilit ikonuyla **yazar**.

Rol yalnızca bir etiket değil — ajanın müşteri sisteminde
**yapabileceklerini** belirler, çünkü ajan sadece kurulu yetenekleri
kullanabilir. Seçimin **bağlandığın bütün SAP sistemleri** için geçerlidir;
sistem başına ayrı bir rol yoktur.

- **Modül danışmanı** seçersen sisteme yazan hiçbir yetenek kurulmaz.
  **Teknik danışman** seçersen kod denetimi, ekran üretimi ve abapGit de
  kurulur.
- Onaylamadan önce pencerede, seçtiğin rolle hangi yeteneklerin kurulacağı
  ad ad listelenir. Kararı listeye bakarak ver.
- Katalogdan elle kurduğun yetenekler role bağlı değildir; onlar her iki
  rolde de kurulabilir ve kaldırılabilir.
- Doğru seçmek önemli: dar rol ajanı iş yapamaz hâle getirir, geniş rol ise
  müşteri sisteminde istemediğin bir yeteneği masaya koyar. Değiştirme
  şansın olmadığı için uyarı da o pencerededir.

### Tur başına bedel (Uygulama Bağlantıları)

Fiş ikonundaki pencerede, açık bağlayıcıların bir tura ne kadar bağlam
maliyeti getirdiği yazar. Sayı artık kayıt başına sabit değil, **bağlayıcı
türüne göre**: ölçülen değerler Outlook 25, SharePoint 17 araç
(2026-09-08'de bağlayıcı penceresinden okundu). Toplam, açık kayıtların
kendi sayılarının toplamıdır; kapalı kayıtlar sayıya girmez. Henüz
ölçülmemiş türde bir bağlayıcı varsa ölçülenlerin ortalaması kullanılır ve
ekranda **bunun bir tahmin olduğu açıkça yazar**.

## SAP Launcher Ne Yapar (özet)

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
   - Uygulama **axet.code modülüne geçip bu sistem için bir sohbet açar**
     — harici bir pencere açılmaz. Doğrudan yazmaya başlayabilirsin.
   - Gömülü terminale hâlâ ihtiyacın olursa alt panelden ulaşırsın; her
     bağlantı orada kendi sekmesinde birikir.

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

## Axet Chat Sohbet Ekranı

Bir sisteme bağlandıktan sonra asıl çalışma burada yapılır. Sol kenar
çubuğunda **Yeni sohbet** ve **Yeni proje** düğmeleri, altında sohbet
listesi ve bağlanılan sistemler var.

- **Her sohbetin kendi oturumu var.** Sohbete yazdığında o sohbete ait bir
  axet-code oturumu açılır ve açık kalır. Aynı anda en fazla **5 oturum**
  sıcak tutulur, **60 dakika** dokunulmayan oturum kapanır. Kapanmış bir
  sohbete geri döndüğünde oturum yeniden kurulur — sohbet kaybolmaz.
- **İlk mesaj sonrakilerden yavaştır.** İlk turda süreç başlar, uygulama
  bağlayıcıları yüklenir ve ajan işi baştan kavrar; bu birkaç on saniye
  sürebilir. Aynı sohbetteki sonraki mesajlar belirgin biçimde hızlıdır.
  Bir sisteme bağlandığında oturum arka planda önceden ısıtılır, yani ilk
  mesajın beklemesi kısalır.
- **Arkada ne olduğunu görürsün.** Cevap beklenirken gösterge ajanın hangi
  aracı çalıştırdığını, hedefini, kaçıncı adımda olduğunu ve geçen süreyi
  yazar. Satıra tıklayarak aracın çıktısını açabilirsin.
- **Sohbetler sisteme göre gruplanır** ve projelere ayrılabilir. Bir sohbet
  hangi bağlantıdan doğduysa o grupta kalır.
- **Sohbeti PDF olarak dışa aktarabilirsin.**
- **Sohbetin yanında dosya paneli** açılır; ajanın dokunduğu dosyaları
  anında görür, istersen müdahale edersin.
- **Geçmiş her mesajda baştan gönderilmez.** Oturum kurulurken sohbetin son
  24 mesajı (en fazla 12.000 karakter) ajana bir kere aktarılır, sonrası
  yalnızca yazdığın mesajdır. Sohbet çok uzunsa en eski mesajlar düşer ve
  ajana kaç mesajın kısaltıldığı açıkça söylenir — yani "sana daha önce
  söylemiştim" dediğinde ajan neyi görmediğini bilir.
- **axet-code sürümü eskiyse** sohbet açılışında uyarı çıkar. Güncelleme
  Intune Company Portal üzerinden yapılır; uygulama kendi başına axet-code
  güncelleyemez.

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

Üç yol var (`X.Y.Z` yerine güncel sürüm numarası gelir):

- **`NTT-Studio-Setup-X.Y.Z.exe`** kurulum dosyasını çalıştır — masaüstü/
  başlat menüsü kısayolu oluşturur. **Otomatik güncelleme sadece bu yolla
  kurulan sürümlerde çalışır.** Önerilen yol. Ya da
- **`aXet-Studio-X.Y.Z-portable.exe`** tek dosyasını çalıştır (kurulum yok,
  güncelleme de yok). Ya da
- `release/win-unpacked/` klasörünü olduğu gibi kopyala, içindeki
  `NTT Studio.exe`'yi çalıştır.

Dosyalar [Releases](https://github.com/tufansasmaz/axet-sap-launcher/releases)
sayfasında. İmzalanmadıkları için Windows SmartScreen ilk çalıştırmada uyarı
gösterebilir — "Daha fazla bilgi" → "Yine de çalıştır".

Her bilgisayarda SAP Logon'un landscape dosyası kendi standart konumundan
otomatik okunur — farklı bilgisayarlarda farklı SAP sistemleri tanımlıysa,
uygulama o bilgisayardaki listeyi gösterir. Eğer SAP Logon'un dosyası
standart olmayan bir yoldaysa, Ayarlar'dan bir kere elle yol belirtilir.

## Güncellemeler

Ayarlar penceresinde "Güncellemeler" bölümünden:

- **Token gerekmiyor.** Depo public olduğu için güncelleme kontrolü ve
  indirme kimlik doğrulaması olmadan çalışır. (Eski sürümlerde bir GitHub
  erişim anahtarı istenirdi; o alan tamamen kaldırıldı.)
- **Açılışta otomatik kontrol et**: Açıkken uygulama her açılışta sessizce
  yeni sürüm olup olmadığına bakar.
- **Şimdi Kontrol Et**: Elle tetiklemek için.
- Yeni bir sürüm bulunursa indirme ilerlemesi gösterilir; indirme
  tamamlanınca **"Şimdi Yeniden Başlat ve Kur"** butonuna basman yeterli —
  uygulama kapanıp yeni sürümle yeniden açılır.
- **Sadece Setup.exe ile kurulan sürümler güncelleme alabilir** — portable
  `.exe`'yi kullanıyorsan yeni sürümü elle indirip değiştirmen gerekir.

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
  verirken ADT'nin düz HTTPS'ini engeller. Bu durumda uygulama artık bir
  **RFC bridge**'i kendisi otomatik başlatır ve kimlik bilgilerini RFC
  üzerinden doğrular — gereken Python + pyrfc + SAP NW RFC SDK uygulamaya
  gömülü geldiği için **hiçbir şey kurman gerekmez**; terminal açılır ve
  `%sap-adt-readonly` doğrudan çalışır. Çok nadir bir durumda (uygulama
  kurulumu bozuksa) otomatik başlatma başarısız olabilir; bu durumda
  `sap-context.md`'deki "RFC Bridge Modu" bölümü ne yapman gerektiğini
  yazar.
- **VPN açık ama "Zaman aşımı" veriyor, hâlbuki Eclipse/SAP GUI aynı VPN'den
  bağlanabiliyor (SAProuter'ı OLMAYAN sistemler)**: Bazı kurumsal ağlarda
  firewall, SAP'ın native protokollerine (SAP GUI DIAG, RFC/gateway
  portuna) izin verirken ADT'nin kullandığı düz HTTPS'i tamamen engeller —
  bu durumda Eclipse ADT da (fark etmeden) RFC üzerinden bağlanıyor
  olabilir. Uygulama bunu artık kendisi tespit eder: SAP'ın native gateway
  portu (DIAG portu + 100) erişilebilirse otomatik olarak **doğrudan RFC
  bridge** moduna geçer (SAProuter gerekmez), terminal normal şekilde
  açılır. Bu da başarısız olursa, port kesinlikle firewall/VPN tarafında
  engelli demektir — IT/network ekibine bu makineden ilgili sisteme
  HTTPS erişimi açtırman gerekir.
- **Uygulama açılırken yavaş/donuk hissediliyor**: Genellikle SAP Logon'un
  landscape dosyasındaki **network Include** (merkezi/paylaşılan landscape)
  dosyalarından biri VPN kapalıyken/ağ yavaşken okunmaya çalışıldığı için
  olur. Uygulama artık bu okumaları paralel ve zaman sınırlı (4 saniye)
  yapıyor, tek bir ulaşılamayan ağ yolu tüm açılışı kilitlemiyor — ama VPN
  bağlıysa ve ağ hâlâ yavaşsa ilk açılış birkaç saniye sürebilir, bu
  normaldir. Bildirimler (toast) art arda aynı mesajı gösteriyorsa
  yığılmaz, "×3" gibi bir sayaçla tek toast'ta birleşir; bir toast'a
  tıklayarak hemen kapatabilirsin.
- **Dışarıdan (Notepad, tarayıcı vb.) kopyaladığım hiçbir şeyi yapıştıramıyorum
  (uygulama içinde kopyaladığım bir şeyi yapıştırabiliyorum)**: Bu bir
  uygulama hatası değil — bilgisayarın şirketin **Windows Information
  Protection (WIP)** güvenlik politikası altındaysa, Windows bilinçli olarak
  izin listesine eklenmemiş uygulamaların (bu uygulama dahil) panodaki gerçek
  veriyi okumasını engeller; uygulama sadece panoda bir şey olduğunu görebilir,
  içeriği asla alamaz. **Çözüm**: BT/güvenlik ekibine bu uygulamayı
  (`NTT Studio.exe`) WIP'in "İzin Verilen Uygulamalar" listesine
  ekletmeni iste — bu tek gerçek çözüm, uygulama kendi başına bu engeli
  aşamaz. Uygulama İÇİNDE kopyala-yapıştır (bir sistem adını başka bir alana,
  vb.) bu kısıtlamadan etkilenmez, normal çalışır.

- **Sohbette cevap balonu BOŞ geliyor**: Bu artık sessizce olmuyor — uygulama
  metinsiz bir turu başarılı saymıyor, balonu hata olarak işaretleyip ne
  olduğunu yazıyor. Mesaj "yedek kipte çalıştı" diyorsa sol alttaki
  **Hazırlık** ekranından bir proje klasörü seç: kalıcı kip ancak o zaman
  açılıyor. Aynı mesajı "Yeniden üret" ile bir kez daha denemek de çoğu
  durumda yeter; tekrarlıyorsa axet-code sürümünü Company Portal'dan güncelle.
- **Bir arıza tekrar ediyor, destek istiyorsun**: Uygulama kendi günlüğünü
  `%APPDATA%\axet-sap-launcher\logs\ntt-studio.log` dosyasına yazıyor. Bu
  dosyayı gönül rahatlığıyla gönderebilirsin: içinde **yalnızca sayaçlar ve
  durumlar** var (hangi kip, kaç mesaj, kaç araç, sürüm). Yazdığın mesajlar,
  ajanın cevapları, dosya içerikleri ve şifreler bu dosyaya **hiçbir zaman**
  yazılmaz.
