# NTT Studio — Kullanım Rehberi

Bu uygulama, SAP Logon'da tanımlı müşteri/sistem listeni okuyup seçtiğin
sisteme bir tık ile bağlanmanı, ardından o sistem üzerinde **axet.code ile
sohbet ederek** çalışmanı sağlar. Amaç: her SAP sistemine bağlanırken
host/port/ADT URL keşfi, kimlik doğrulama, sertifika güveni gibi işleri
elle tekrar tekrar yapmak zorunda kalmamak.

> Uygulamanın adı **NTT Studio**. Depo ve eski belgelerde geçen "aXet SAP
> Launcher" aynı uygulamanın önceki adı; SAP Launcher artık uygulamanın
> içindeki modüllerden biri.

## Soldaki Ray — Dört Modül

En soldaki ince dikey şeritten modüller arasında geçersin:

- **Axet Chat** (kıvılcım ikonu) — Asıl çalışma ekranı. Bağlandığın sistem
  bağlamında sohbet edersin. (Arkada çalışan komut satırı aracının adı hâlâ
  `axet-code`; ekranın adı Axet Chat.)
- **SAP Launcher** (sunucu ikonu) — Müşteri/sistem ağacı, bağlanma, proje
  klasörü. Bu rehberin büyük kısmı bu modülü anlatıyor.
- **SAP GUI Scripting** (fare ikonu) — SAP GUI ekranlarını gezme, işlem
  kaydedip tekrar oynatma, doğal dille otomasyon.
- **Ajanlar** (robot ikonu, **Ctrl+3**) — Eski Terminal ekranının yerini aldı.
  Birden çok yapay zekâ ajanını kendi terminallerinde yan yana çalıştırırsın.
  Axet Chat ile aynı ekrandır (Sohbet onun bir sekmesi); ayrıntı aşağıda,
  "Ajanlar Ekranı" bölümünde.

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
- Sayılarla: modül danışmanı 31, teknik danışman 41 yetenek alır; katalogda
  toplam 45 var. İkisinin de aldığı **danışmanlık döngüsü** paketi şunları
  kapsıyor: talep kapsamı çıkarma (`sap-cr-scope`), devir dosyası
  (`sap-cr-handover`), arıza analizi (`sap-incident`), mevcut durum
  dokümanı (`as-built-doc`), test senaryoları (`test-scenarios`), S/4HANA
  dönüşüm kapsamı (`conversion-scope`) ve SAP GUI ekran yakalama
  (`sapgui-screenshots`). Teknik danışman ayrıca ATC toplu düzeltme,
  Datasphere ve UI5/CAP/Basis/otomasyon paketlerini alır; modül danışmanı
  iş süreç dokümanı (`bbp-creator`), son kullanıcı kılavuzu
  (`sap-enduser-doc`) ve Celonis modelleyicisini alır.
- Onaylamadan önce pencerede, seçtiğin rolle hangi yeteneklerin kurulacağı
  ad ad listelenir. Kararı listeye bakarak ver.
- Katalogdan elle kurduğun yetenekler role bağlı değildir; onlar her iki
  rolde de kurulabilir ve kaldırılabilir.
- **aXet.flows yeteneği her iki rolde de kurulur.** SAP'a hiç dokunmadığı
  için rol ayrımının dışında: akış JSON'unu okur, doğrular, üretir ve
  tasarımcıya aktarılacak hâle getirir. Sohbette "şu akışı incele",
  "bana bir CRUD uygulaması akışı çıkar", "bu akış deploy oluyor ama
  çalışmıyor" gibi bir şey dediğinde ajan bunu kendisi kullanır.
- **`sapgui-screenshots` canlı sistemde dikkat ister.** Bu yetenek ADT'ye
  değil, açık duran SAP GUI penceresine bakar ve gezinmek için gerçek
  tuşlara basar (Enter, F8, alan doldurma). Yani salt-okunur kapının
  dışındadır. Kural: PRD'de yalnızca görüntüleme işlemleri (SE16 display,
  ST22, SE09 görüntüleme) yakalanır; kılavuz için işlem adımı gerekiyorsa
  DEV/QA'da yakalanır. Yanlışlıkla basılan bir Kaydet geri alınamaz.
- **`sap-enduser-doc` ek kurulum ister.** HTML/PDF kılavuz üretmek için
  Node 18+, skill klasöründe bir `npm install` (playwright, marked, sharp,
  mermaid) ve yerel bir Chromium gerekir. Bunların hiçbiri uygulamayla
  gelmiyor ve otomatik kurulmuyor. Kullanmadan önce skill klasöründe
  `node scripts/precheck.js` çalıştır; eksikleri o söyler.
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
  **Terminal bölmeleri**: her terminal başlık çubuğundaki "Sağa böl" / "Alta
  böl" düğmesiyle bölünebilir; bölmeleri başlıktan sürükleyip kenara bırakarak
  yeniden düzenleyebilirsin. Her bölmeye ayrı **ad ve renk** verilebilir.
  **Yazı boyutu**: Ctrl+Tekerlek ya da Ctrl+= / Ctrl+- / Ctrl+0 ile bölme
  başına ayarlanır, diğer bölmeler etkilenmez. Küçültülen bölmeler altta
  şerit hâlinde görünür.
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
- **`adt-tool.ps1`**: PowerShell ile SAP'tan ADT üzerinden OKUMAK için basit bir
  yardımcı script (fallback). Salt okunur: yalnızca GET/HEAD gönderir.
- **`sap-context.md`**: axet.code'un session başında okuyacağı, sistemle
  ilgili tüm bilgiyi (müşteri, sistem, doğrulama notları, kullanılabilir
  skill'ler) içeren dosya. Sen bu dosyanın en altındaki "Notlar" bölümüne
  serbestçe not ekleyebilirsin — yeniden bağlanınca silinmez, korunur.
- **`.axet-code/skills/`**: SAP sistemine **yazan** yetenekler (abapGit
  teslim akışı, ekran üretimi) buraya, yani sistem başına kurulur — PRD
  sistemlerde bu yetenekler hiç kurulmaz, kapı burada. Diğer yetenekler
  genel klasörde durur (aşağıya bakın). Hepsi terminalde `%skill-adı`
  yazarak çağrılır.
- **`.axet-code/lib/` ve `.axet-code/scripts/`**: Skill'lerin ortak
  kullandığı Python dosyaları. Bunlar tek bir skill'e ait olmadığı için
  `skills/` klasörünün *dışında* durur ve ihtiyaç duyan bir yetenek
  kuruluysa birlikte kopyalanır. `lib/redact.py` doküman üretiminde
  TCKN/vergi numarası maskelemesini (`--redact-pii`) yapan dosyadır; bu
  klasörü elle silme, maskeleme sessizce devre dışı kalır. Rol değişip
  ihtiyaç duyan yetenekler kaldırıldığında uygulama bunları da temizler
  (yalnızca kendi bıraktığı kopyayı — senin koyduğun aynı adlı bir klasöre
  dokunmaz).

### Genel yetenekler (`%LOCALAPPDATA%\axet-code\skills`)

SAP sisteminde **hiçbir değişiklik yapmayan** yetenekler proje klasörüne
değil, axet.code'un genel klasörüne kurulur. Sebebi basit: bir SAP sistemine
bağlı olmayan düz sohbetler hiçbir proje klasöründe çalışmaz, dolayısıyla
eski kurguda o sohbetler **tek bir yetenek bile göremiyordu**.

- Kurulum **rolü seçtiğiniz anda** olur; sisteme bağlanmayı beklemez.
- Uygulama güncellenince (yeni toolkit sürümü) ya da klasör elle silinince
  açılışta kendiliğinden tazelenir.
- **Ayarlar → Yapay zekâ yetenekleri → Genel yetenekler → Yönet** ile listeyi
  görebilir, istemediğiniz yeteneği kapatabilirsiniz. Kapatılan yetenek
  diskten kaldırılır.
- Liste üç kümede gösterilir: **Ortak** (iki rolün de kullandıkları), **Modül
  danışmanı** ve **Teknik danışman**. Rolünüzün dışındaki yetenekler
  görünür ama **kilitlidir** — açılamazlar. Rol seçimi kalıcıdır ve bu ekran
  rolün verdiğini kısabilir, genişletemez.
- Bir anahtarı çevirdiğinizde açık sohbet oturumları kapatılır: axet.code
  yetenek listesini yalnızca süreç açılışında okur, kapatılmasa değişiklik
  aynı sohbette hiçbir şeyi değiştirmezdi.

## Axet Chat Sohbet Ekranı

Bir sisteme bağlandıktan sonra asıl çalışma burada yapılır. Sol kenar
çubuğunda **Yeni sohbet** ve **Yeni proje** düğmeleri, altında sohbet
listesi ve bağlanılan sistemler var.

- **Her mesaj kısa ömürlü bir `axet-code run` süreciyle çalışır** (görünmez,
  TUI/PTY yok). **axet-code 1.4.0 veya üstü** gereklidir; eski, eksik ya da
  bozuk sürüm açık hata gösterir.
- **İlk mesaj ~1 saniye içinde başlar.** Yazmaya başlayınca süreç arka planda
  önceden hazırlanır; bağlayıcı gerektiren sistemlerde bağlayıcı yüklemesi ek
  ~4 saniye alır. Süreç her turda ayrı başladığı için "oturum ısınması"
  beklenmez.
- **Araç çalıştıktan sonra düşen tur yeniden gönderilmez** — ekranda "Devam
  et" butonu çıkar, tıklayınca ajan kaldığı yerden devam eder.
- **Soru kartı**: Ajan seçenek sunduğunda (ask_user) ekranda seçenek butonları
  görünür; tıklayarak ya da yazarak yanıt verebilirsin.
- **Hazır istemler**: Sistem bağlandığında rolüne göre önerilen başlangıç
  sorularını gösteren bir kart açılır.
- **Windows bildirimi**: Uygulama arka plandayken ajan cevabını bitirince
  bildirim gelir. Ayarlar'dan kapatılabilir.
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
- **Bildirimler**: Uygulama arka plandayken ajan cevabını bitirince Windows
  bildirimi gönderilir; bu anahtarla kapatılabilir.
- **Veri ve gizlilik**: Yerel sohbet geçmişini ve önbellek dosyalarını
  temizleme seçenekleri bu bölümde yer alır.

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
- **Güncellendikten sonra Yenilikler penceresi** bir kez otomatik açılır ve
  yeni sürümde neler değiştiğini özetler.

## Ajanlar Ekranı

Birden çok yapay zekâ ajanının yan yana çalıştığı ekran. SAP'ye bağlı değil:
herhangi bir klasörde ya da Git deposunda kullanılabilir. **Sohbet de bu
ekranın parçası**: soldaki rayda **Axet Chat** ve **Ajanlar** aynı ekranı açar
(Sohbet sekmesi ya da ekibin son açık sekmesi). Sekme değiştirmek hiçbir şeyi
kapatmaz; akan cevap, taslak ve terminaller yerinde kalır.

- **Ekip sekmeleri** (en üst): her ekip bir çalışma alanıdır. Sekmede ad,
  ajan sayısı ve gerekiyorsa kehribar (soru bekleyen ajan) ya da kırmızı
  (başarısız alt görev) bir sayı görünür. Tıkla ya da ok tuşlarıyla seç; çift
  tık ya da **F2** ile yeniden adlandır. Sağ tık ya da seçili sekmenin **…**
  düğmesi: Yeniden adlandır, **Kök klasör…**, **Doğrulama komutları…**, SAP
  bağla/çöz, Kapat (canlı terminal ya da görev varsa sorar). En fazla 6 ekip.
- **+ Ekip**: boş bir ekip ya da hazır şablon. **SAP geliştirme** (lider,
  geliştirici, test), **Analiz** (lider, analist), **Destek** (tek ajan).
  Şablon ajanları axet-code ile, ekibin varsayılan klasöründe açar; rol yalnız
  bir etikettir, rol kapısı ve SAP kuralları aynen geçerlidir.
- **Görünüm sekme grubu** (Akış'ın alt kenarı): **Terminal | Görevler | Ofis |
  Değişiklikler | Tarayıcı**. Sohbet bu gruptan kaldırıldı; Sohbet'e sol
  menüdeki **Axet Chat** düğmesiyle dönülür. Seçim ekip başına hatırlanır;
  yeni ekip **Ofis**'te açılır. Terminal bölme düzenidir (değişmedi). Sağdaki
  **Kabuk** cmd/PowerShell bölmesi, **Ajan** yeni ajan açar: ad, motor
  (axet-code, Claude Code, Codex, Gemini CLI ya da kendi komutun), rol,
  klasör, renk. axet-code'da rol listesi axet-code'un kendi ajanlarından
  gelir; kurulu olmayan motorun satırında "Kurulu değil" yazar ve başlamaz.
- **Akış** (sol sütun; Sohbet sekmesinde yerini sohbet listesi alır):
  - Üstte ekibin SAP bağı.
  - **Ekip**: her ajan bir satır — ad, rol, durum (Çalışıyor, Soru soruyor,
    Boşta 3 dk, Bitti, Hata), motor ve panodan aldığı iş. Tıklayınca Terminal
    sekmesinde o ajanın terminali öne gelir. **≈** durumun tahmini olduğunu
    söyler (motorun kendi kaydı okunamıyor). Satırdaki kitap simgesi kalıcı
    belleği, ok simgesi yeniden başlatmayı açar.
  - **Olaylar**: çalışmaya başladı, bitirdi, hata, soru sordu, iş aldı,
    doğrulandı, başarısız, değişiklik kaydı ve gönderdiğin mesajlar; en yenisi
    altta. Yalnız bu oturum için, en çok 200 olay; kalıcı kayıt yok.
  - **Soru kartları**: ekibin cevap bekleyen soruları. axet-code'un seçenekli
    sorusunu tek tıkla cevaplarsın; terminalde dokunduysan ya da serbest/çok
    seçimli bir soruysa **Terminale git**.
  - **Mesaj kutusu** (en alt): **@** yaz, listeden ajanı seç (ok tuşları +
    Enter), mesajı yaz, Enter. Mesaj tek satır olarak ajana gider (en çok 2000
    karakter, `!` ile başlayamaz). Ajan çalışıyor, soru bekliyor ya da
    terminalinde yarım bir satır varsa gönderilmez, sebebi yazılır; kendiliğinden
    yeniden denenmez. Ajan seçmeden Enter: "Bir ajan seç (@)".
- **Bildirim**: pencere arka plandayken bir ajan soru sorarsa ya da işini
  bitirirse Windows bildirimi gelir (sohbet bildirimi ayarı); yalnız durumu
  kesin bilinen ajanlar için.
- SAP yazma onayı ve QA/PRD salt okunur kuralları ajanlar için de aynen
  geçerlidir. Bir ekipte en fazla 9 bölme (ajanlar dahil). Eski Terminal
  düzenin kaybolmaz; eski axet-code bölmeleri axet-code ajanı olarak açılır.
  Bu dönüşüm tek yönlüdür: daha eski bir sürüme (1.8.x) dönersen ajan
  bölmeleri o sürümde açılmaz.

### Görev Panosu

**Görevler** sekmesi ekibin görev panosudur (seçim ekip başına hatırlanır). Bir hedef yazarsın; **lider** onu alt
görevlere böler, sen onaylarsın, NTT Studio alt görevleri alandaki ajanlara
dağıtır ve her alt görev ancak **kanıtla** kapanır. Ajanın "bitti" demesi
hiçbir kartı kapatmaz. Akış'taki ajan satırına, soru kartındaki "Terminale git" bağlantısına ya da ajan bildirimine tıklarsan Terminal sekmesine geçilir.

- **Görev**: başlık ve hedef yazarsın. **Böl** lideri çalıştırır: axet-code
  alanın kökünde (yoksa ajanların varsayılan klasöründe) tek seferlik,
  Outlook gibi bağlayıcıları kapalı bir oturum açar, dosya değiştirmeden en fazla 8 alt
  görevlik bir plan üretir (3 dakika sınırı). Lider planlarken dosya
  değiştirdiyse taslağın üstünde uyarı çıkar. Lider kullanılamıyorsa ya da
  geçerli bir plan dönmezse görev "Takıldı" olur, sebebi açıkça yazar;
  **Yeniden dene** ya da alt görevleri elle ekle.
- **Taslak**: alt görevlerin başlığını, istemini, rol ipucunu ve
  bağımlılıklarını düzenler, ekler, siler, sıralarsın. **Onayla** demeden
  hiçbir şey ajana gitmez.
- **Dağıtım**: bağımlılığı bitmiş alt görev, aynı alandaki boşta bir ajana
  gider (rol ipucu eşleşen ajan önce). Ajanın motoru kapalıysa (terminalde
  kabuk istemi görünüyorsa) ya da sen o terminalde yazıyorsan hiçbir şey
  yazılmaz; alt görev "Uygun ajan bekleniyor" olarak bekler. Durumu tahmini
  (≈) olan ajanlara (Claude Code, Codex, Gemini, özel komut) iş kendiliğinden
  gitmez: **Ajana ver** ile sen verirsin.
  Kabuk istemi yalnız standart biçimde (`C:\proje>`, `PS C:\proje>`) tanınır;
  özel istem kullanıyorsan (oh-my-posh, `PROMPT` ayarı) motorun kapandığı
  anlaşılamaz, istem vermeden önce ajanın terminalde açık olduğundan emin ol.
  Tahmini durumlu ajana **Ajana ver** ya da **Düzeltmeye geri gönder** önce
  onay sorar: terminalinde açık bir izin menüsü varsa Enter onu onaylardı.
- **Kanıt**: ekip sekmesine sağ tıklayıp **Doğrulama komutları…** ile satır başına
  bir komut yazarsın (en fazla 5; ör. `npm run lint`, `npm test`). axet-code
  ajanı işini bitirince komutlar alanın kökünde, gizli bir pencerede sırayla
  çalışır; hepsi başarılıysa alt görev **Bitti**, biri başarısızsa
  **Başarısız** olur (komut başına 10 dakika sınırı; çıktının sonu kartta).
  Tahmini durumlu ajanlarda **Doğrula**'ya sen basarsın. Komut yazmadıysan
  alt görevi **Onayla** ile elle kapatırsın; kartta "Elle onaylandı" yazar,
  yeşil onay işareti çıkmaz. Yalnız buraya senin yazdığın komutlar çalışır;
  lider ya da ajan komut çalıştıramaz.
- **Başarısız alt görev**: **Düzeltmeye geri gönder** aynı ajana hata
  çıktısının sonunu yazar; **Yeniden sıraya al** alt görevi boşa çıkarır.
  Kendiliğinden geri gönderme yoktur.
- **Ajan kapandıysa ya da uygulama yeniden açıldıysa** yarıda kalan alt
  görevler "Beklemede" olur ve kendiliğinden yeniden gönderilmez; **Yeniden
  sıraya al** dersin. İstem ajana gönderilemediyse (motor o anda kapandı ya da
  sen araya yazdın) alt görev "Beklemede · İstem gönderilemedi" olur.
- **Raporlar** (panonun altında): biten, doğrulanan ve başarısız alt
  görevler; başlık, ajan, sonuç, kaç doğrulama komutunun geçtiği ve zaman.
  Satıra tıklayınca ayrıntısı açılır.
- Akış'ta görevli ajanın satırında alt görevin başlığı, ekip sekmesinde
  başarısız alt görev sayısı kırmızı görünür. Pencere arka plandayken "Görev bitti" ve "Alt görev başarısız"
  bildirimleri gelir (sohbet bildirimi ayarı).
- Pano uygulamanın veri klasöründe tutulur; proje klasörüne ya da depoya
  dosya yazılmaz. Alanı kapatınca panosu da silinir (görev varsa sorulur).
  Pano dosyası bozulursa kenara alınır ve boş pano açılır; veri sessizce
  silinmez.
- SAP yazma onayı, QA/PRD salt okunur kuralı ve rol kapısı aynen geçerlidir:
  modül danışmanı rolünde pano görev çalıştırabilir ama ajan SAP'ye
  geliştirme yazamaz.

### Ofis görünümü

**Ofis** sekmesi (yeni ekiplerde varsayılan) ekipteki ajanları kuşbakışı,
piksel çizimli bir ofiste gösterir: üstte açık ofis (masalar, ortada lider
masası, toplantı masası, köşelerde dinlenme alanı), altta **Mutfak**,
**Lider**, **Sunucu** ve **Dinlenme** odaları. Yeni bir bilgi üretmez;
Akış'taki durumu ve panodaki alt görevi tek bakışta özetler. Ofis sağdaki
alanı tam kaplar.

- **Yerleşim**: lider rolündeki ajan ortadaki lider masasında, ötekiler
  soldan sağa çalışma masalarında oturur. Masalar dolarsa (sekizden fazla
  çalışan) taşanlar toplantı masasının taburelerinde çalışır.
- **Çalışıyor**: ekran akar, eller yazar. Durumu tahmini (≈) olan
  ajanlarda (Claude Code, Codex, Gemini, özel komut) aynı poz durağandır;
  hareket yalnız kesin durumda olur.
- **Soru soruyor**: ekran sarı yanıp söner; axet-code ajanında sorunun ilk
  60 karakteri başın üstündeki balonda yazar, tahmini durumda sarı bir "?"
  çıkar. Cevabı Akış'taki soru kartından ya da terminalden verirsin.
- **Boşta / Bitti**: karakter masasından kalkıp mutfağa, kanepeye, koşu
  bandına ya da toplantı masasına yürür, bir süre oyalanıp başka yere geçer;
  kahve alırsa masasına kupayla döner. İş gelince masasına yürür. "Boşta
  3 dk" gibi süre yazar. **Hata**: ekranda ve başın üstünde kırmızı "!".
  **Bilinmiyor**: durum henüz gelmediyse karakter soluktur.
  **Kurulu değil**: motor bu bilgisayarda yoksa masa boştur.
- Panodan bir alt görev atanınca liderden (lider yoksa koridordan) o ajana
  bir ışın gider ve lider kısa bir balonla kime verdiğini söyler.
- Karakterin altında adı ve durum çipi; ajan panodan bir alt görev
  yürütüyorsa başlığı (uzunsa kısaltılır, üstüne gelince tamamı görünür).
- Karaktere tıklayınca (ya da Tab ile gelip Enter/Space) **Terminal**
  sekmesine geçilir ve o ajanın terminali öne gelir; küçültülmüşse geri
  açılır. Seçili/odaktaki ajanın adı ve ayağının altındaki halka vurgu
  rengindedir.
- **Kamera**: sürükleyerek kaydırılır, fare tekerleği ya da sağ üstteki
  **−** / **+** ile yakınlaşır; ortadaki değer düğmesi bütün ofisi sığdırır.
  Yakınlaşınca sağ altta küçük bir harita çıkar; tıklanan yere gidilir.
- **Gündüz / gece**: ofis bilgisayarın saatini izler; akşam kararır, masa
  ekranları ve tavan lambaları yanar, gündüz pencerelerden güneş düşer.
- Düz terminaller ofiste görünmez; sol alt köşede sayıları yazar. Ajan
  yoksa "Ofiste kimse yok" ve **Ajan** düğmesi çıkar.
- Ofisteyken terminaller kapanmaz, yalnız gizlenir. Ofis ekranda değilken
  çizim durur. Windows'ta "Animasyon efektlerini göster" kapalıysa (hareketi
  azalt) ofiste hiçbir şey kıpırdamaz ve ofis gündüz kalır.
- **Çizimler**: karakterler, eşya ve zeminler uygulamanın kendi kodla
  çizilmiş piksel çizimleridir; dış görsel paketi kullanılmaz.

### Değişiklikler

**Değişiklikler** sekmesi ajanların bu alanın klasöründe dosyalarda yaptığı
değişiklikleri gösterir ve beğenmediğini geri almanı sağlar. Yalnız **Git
deposu** olan klasörlerde çalışır (alanın kökü, yoksa ajanların varsayılan
klasörü); depo değilse ya da Git kurulu değilse bunu açıkça söyler. Klasörü
kendisi depoya çevirmez.

- **Geri alma noktası** kendiliğinden alınır: bir ajana istem gönderdiğinde
  (aynı ajan için en çok 30 saniyede bir), Görev Panosu bir alt görevi bir
  ajana verdiğinde ve her geri almadan hemen önce. **Geri alma noktası
  oluştur** ile elle de alabilirsin. Alan başına en yeni 200 nokta saklanır.
- Solda noktalar yeniden eskiye sıralıdır: saat, ajan, istemin başı (ya da alt
  görev başlığı), değişen dosya sayısı ve +/− satırlar, inceleme durumu. En
  üstteki **Canlı** satırı son noktadan bu yana çalışma klasöründe ne
  değiştiğini gösterir; görünüm açıkken birkaç saniyede bir tazelenir.
- Bir noktayı seçince sağda o noktadan bir sonraki noktaya kadar (en
  sonuncusunda: şu ana kadar) değişen dosyalar çıkar; dosyaya tıklayınca
  satır numaralı fark görünür. İkili ve 200 KB'tan büyük dosyalarda yalnız
  "değişti" yazar.
- **Kabul et** yalnız bir işarettir, dosyalara dokunmaz. Başlıktaki "N
  bekliyor" henüz incelemediğin noktaları sayar.
- **Geri al**, o noktanın değişikliklerini geri alır: önce etkilenecek
  dosyaları ve uyarıları gösterir (sonraki noktalar da bu dosyalara
  dokunduysa adlarıyla; o sırada çalışan ajanlar varsa adlarıyla). Onaylarsan
  önce şimdiki hâlin geri alma noktası alınır, sonra dosyalar eski hâline
  döner; sonradan eklenmiş dosyalar **çöp kutusuna** taşınır, kalıcı
  silinmez. Geri almayı geri almak için listedeki **Geri almadan önce**
  noktasını seçip **Geri al**'a bas. Dikkat: noktadan sonra bu dosyalarda
  yapılan bütün değişiklikler geri alınır — hangi ajan yaptıysa; satırdaki
  ajan adı yalnız noktayı tetikleyeni gösterir.
- Geri alınacak bir dosyanın yerinde artık başka bir şey varsa (klasör,
  kısayol/bağ ya da sonradan konmuş bir dosya) geri alma onun üstüne yazmaz:
  bunu başlamadan görürse hiçbir dosyaya dokunmadan durur; ancak geri alma
  sürerken ortaya çıkarsa durur ve o ana kadar ne yaptığını söyler.
- Git alt modülleri ve alanda commit'i olmayan iç içe depolar (ör. bir
  ajanın `git init` yaptığı klasör) izlenmez ve geri alınmaz; pencere kaç alt
  modülün atlanacağını söyler. 5000'den fazla dosya değişen bir aralık tek
  seferde geri alınamaz.
- Senin Git durumuna dokunulmaz: dalın, son commit'in, `git add` ile
  hazırladıkların ve stash'lerin aynen kalır. `.gitignore`'daki dosyalar
  izlenmez. Git eski nesneleri temizlediyse (yaklaşık iki hafta sonra) nokta
  "Süresi doldu" der; farkı ve geri alması kapanır.
- Görev Panosu'nda bir alt görevin satırındaki **Değişiklikler** bağlantısı
  bu görünümü o alt görevin noktası seçili açar. **Terminale git** noktayı
  oluşturan ajanın terminalini öne getirir.
- SAP nesnelerindeki değişiklikler burada değil, **SAP yazma geçmişi**
  panelindedir.

### Tarayıcı

**Tarayıcı** sekmesi ajanların yanında bir
web sayfası açar: ajanın ayağa kaldırdığı yerel sunucu (`localhost:5173`),
bir dokümantasyon sayfası ya da bir Fiori uygulaması. Gördüğünü **Ajana
gönder** ile tek adımda bir ajana verebilirsin.

- Adres alanına yazıp Enter'a bas. `http://` ya da `https://` yazmazsan
  eklenir (`localhost` ve `127.0.0.1` için `http://`, diğerleri için
  `https://`). Yalnız http ve https adresleri açılır; yazdığın şey bir arama
  motoruna gönderilmez. **Esc** yazdığını bırakıp sayfanın adresine döner.
- **Geri**, **İleri**, **Yenile/Durdur** ve **Sistem tarayıcısında aç** üst
  satırdadır. **Ctrl+L** adres alanına, **Alt+Sol/Sağ** geri/ileri götürür
  (sayfanın içindeyken de).
- Adresteki erişim anahtarı, giriş kodu, parola ve imza parametreleri
  (`access_token`, `code`, `sap-password` gibi) ne saklanır ne ajana gider;
  Fiori rotası (`#SalesOrder-display?…`) korunur.
- Alan başına son açılan adres saklanır; görünüm açılınca kendiliğinden
  yüklenmez, boş sayfadaki düğmeyle tek tıkla açarsın. Başka görünüme geçip
  dönünce sayfa ve geri/ileri geçmişi yerinde durur; uygulama kapanınca
  geçmiş silinir.
- Yeni pencere açan bağlantılar aynı yerde açılır. İndirmeler kapalıdır;
  indirmek için **Sistem tarayıcısında aç**'ı kullan. Kamera, mikrofon,
  konum, bildirim, pano okuma gibi izinler her zaman reddedilir; sayfaların
  **Kopyala** düğmeleri ise çalışır (sayfa panoya yazabilir, panodan okuyamaz).
- Sunucu bulunamaz, bağlantı kurulamaz ya da sitenin sertifikası geçersizse
  sayfanın yerinde sebebi, adresi ve **Yeniden dene** görünür. Sertifika
  hatası için "yine de devam et" yoktur. Sayfa çökerse **Yeniden yükle**.
- Bu tarayıcının oturumu uygulamanın geri kalanından ayrıdır: burada SAP'ye
  ya da portala giriş yaparsan çerezler yalnız bu tarayıcıda kalır. Sayfa
  uygulamanın dosyalarına, terminallerine ve SAP bağlantılarına erişemez.
- İstemci sertifikasıyla (X.509) ya da tarayıcının kendi kullanıcı adı/parola
  penceresiyle (HTTP Basic) giriş isteyen sayfalar burada açılmaz; bunlar
  için **Sistem tarayıcısında aç**'ı kullan.
- Tarayıcıyı açtığın her alan, uygulama açık kaldıkça kendi sayfasını
  bellekte tutar; çok sayıda alanda sayfa açıksa bellek kullanımı artar.

**Ajana gönder** alandaki ajanları adı, rolü ve durumuyla listeler; birini
seçince hemen gönderilir (ayrıca onay sorulmaz):

- Ajanın istem satırına tek satır yazılır ve Enter'a basılır:
  `[Tarayici] <sayfa başlığı> <adres>`; sayfada seçili metin varsa sonuna
  `Secili metin: "…"` (en çok 2000 karakter, satır sonları boşluğa döner).
  Başlıkta ve seçili metinde geçen `"` ve `\` karakterlerinin önüne `\`
  eklenir (`Secili metin: "a \"b\" c"`), böylece tırnak çerçevesi bozulmaz.
  Adresteki kullanıcı adı ya da parola gönderilmez.
- Gönderdiğin sayfa metni ajana olduğu gibi gider; güvenmediğin sayfalardan
  metin gönderirken dikkatli ol.
- Menüdeki **Ekran görüntüsü ekle** işaretliyse sayfanın görünen kısmı alanın
  kök klasörünün altında `.ntt-studio/tarayici/<tarih-saat>.png` olarak
  kaydedilir ve yolu metne eklenir. Alanın kök klasörü yoksa bu seçenek
  kapalıdır. Görüntüler kendiliğinden silinmez, klasörü sen temizlersin. Alan
  bir Git deposuysa görüntüler Değişiklikler görünümünde de çıkar;
  istemiyorsan `.gitignore`'a `.ntt-studio/` satırını ekle.
- Ajan çalışıyorsa, bir soru bekliyorsa ya da terminalinde gönderilmemiş bir
  satır varsa hiçbir şey gönderilmez ve sebebi yazar; sonra kendiliğinden
  yeniden denenmez. Ekran görüntüsü alınamazsa metin de gitmez. Metin yazılıp
  Enter'a basılmadan sen terminale yazarsan Enter basılmaz: metin ajanın
  satırında kalır (ekran görüntüsü de silinmez); kontrol edip Enter'a sen bas.
- Ajan bu tarayıcıyı kendisi süremez (açma, okuma, tıklama yok); sayfayı sen
  açar, sen gönderirsin.

### Kalıcı bellek

Bir ajan kapanıp yeniden açıldığında (ya da ertesi gün) "nerede kalmıştık,
neye karar vermiştik" bilgisi kaybolmasın diye her ajanın kendi **bellek
dosyası** olabilir. Ajan her açılışta onu okur ve önemli şeyleri oraya
yazar; sen de dosyayı uygulamadan açıp düzeltebilirsin.

- **Ajan ekle** penceresinde **Kalıcı bellek** kutusunu işaretle (varsayılan
  kapalı). Var olan bir ajanda Akış'taki satırının sağındaki kitap
  simgesine bas (**Belleği etkinleştir**); simge **Belleği aç**'a döner.
- Dosya alanın kök klasörü altında `.ntt-studio/bellek/<ad>.md` olarak durur
  (alanın kökü yoksa ajanın klasöründe). `<ad>` ajanın adından türetilir
  (ör. "Ayşe Çağrı" → `ayse-cagri`); ajanın adını sonradan değiştirsen de
  dosya aynı kalır. Aynı adlı ikinci ajan `-2`, `-3` eki alır. Bir ajanı
  silip aynı adla yenisini eklersen yenisi eski ajanın bellek dosyasını
  devralır (dosya silinmez).
- Dosya yoksa ilk açılışta tek satırlık bir başlıkla yaratılır. Var olan
  dosyaya uygulama asla kendiliğinden yazmaz, onu hiçbir zaman silmez.
- Ajanın motoru hazır olup boşta beklediği ilk anda istem satırına bir kez
  şu satır yazılıp Enter'a basılır: `[Bellek] Kalici bellegin:
  .ntt-studio/bellek/<ad>.md …`. Ajan çalışıyorsa, soru soruyorsa ya da sen
  terminale yazıyorsan beklenir. Görev Panosu'ndan iş bekleniyorsa bellek
  satırı önce gider, pano işi bir sonraki turda. Ajanı yeniden başlatınca
  bir kez daha gider. Ajan boşta göründüğü halde üç kez (10 sn arayla)
  gönderilemezse vazgeçilir; pencerede "Bellek ajana bildirilemedi" ve
  **Yeniden bildir** görünür. Satır yazıldığı halde Enter'a basılamadıysa
  (o anda sen yazmaya başladıysan) satır ajanın istem satırında kalır ve
  kendiliğinden yeniden denenmez: kontrol edip Enter'a sen bas ya da
  **Yeniden bildir**'i kullan.
- **Belleği aç** dosyayı bir pencerede gösterir; düzeltip **Kaydet**.
  Pencere açıkken ajan dosyaya yazdıysa üzerine yazılmaz: "Dosya bu arada
  değişti" uyarısı çıkar, senin metnin pencerede kalır. Gerekirse kopyala,
  sonra **Yeniden yükle** (yüklenince pencerede yazdığın gider).
- Kaydetmeden pencereyi kapatmak zorunda kalırsan (ör. Ajanlar ekranından
  çıkarsan) yazdığın uygulama açık kaldıkça saklanır; aynı ajanın belleğini
  yeniden açınca "Kaydedilmemiş taslağın geri getirildi" der. Uygulamayı
  kapatırsan taslak gider.
- Dosya 256 KB'tan büyükse ya da UTF-8 değilse pencerede düzenlenmez;
  **Klasörde göster** ile bir düzenleyicide aç. Satır sonları (CRLF) ve
  dosya başındaki BOM kaydederken korunur.
- Alan bir Git deposuysa bellek dosyaları Değişiklikler görünümünde çıkar ve
  Git ile taşınır; istemiyorsan `.gitignore`'a `.ntt-studio/` satırını ekle.
  Değişiklikler'de bir ajan turunu geri alırsan o turda belleğe yazılanlar da
  geri alınır.
- Ajana belleğe şifre ya da token yazmaması söylenir, ama bu denetlenemez:
  dosyaya ara sıra göz at. Uygulama dosyanın içeriğini günlüğe yazmaz.

## Klavye Kısayolları

**Ctrl+/** (veya **F1**) tuşlarına basarak Klavye Kısayolları penceresini
açabilirsin. Pencere uygulamadaki tüm kısayolları listeler.

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
