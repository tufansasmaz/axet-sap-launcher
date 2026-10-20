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
ekranda toplar.

En üstte **Hazır mısın?** listesi durur: dört adım (dil ve rol, proje
klasörü, axet.code, en az bir SAP bağlantısı) tek sütunda, her satırda kısa
bir açıklama ve tek bir **Şimdi yap** düğmesi. Eksik adımlar listenin
başına çıkar ve vurgulanır, tamamlananlar sade kalır. Ortam teşhisi
sürerken axet.code satırında "Denetleniyor…" yazar; dört adım da tamamsa
liste tek satırlık "Her şey hazır" özetine iner.

Altındaki **Ayrıntılar** geniş ekranda iki sütundur — solda makine (ortam
teşhisi, ajanın gördüğü dosya), sağda senin verdiklerin (reçete,
yetenekler); dar ekranda tek sütun:

- **Proje reçetesi** — Ajanın bu projede neyi bileceği. Müşteri, kapsam,
  kısıtlar; sen yazarsın, ajan her turda okur.
- **Yapay zekâ yetenekleri** — Danışman rolü ve o role ait yetenekler
  (aşağıda ayrıntılı).
- **Ortam teşhisi** — Makine bu işi taşıyabiliyor mu (axet-code sürümü,
  Python, RFC bileşenleri, disk). Sorunlu satırlar listenin başındadır ve
  kartın başlığında sorun sayısı yazar. Bir arıza varsa raydaki stetoskop
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

### Uygulama Bağlantıları

Fiş ikonundaki pencerede Outlook ve SharePoint tek sütunlu bir liste olarak
durur: her satırda durum rozeti (Bağlı / Bağlı değil / Başarısız /
Bağlanıyor), son doğrulamanın sonucu ve tarihi, sağda tek eylem
(**Bağlan** ya da **Bağlantıyı Kes** + yeniden doğrula). Doğrulama
başlatılamazsa (ör. axet-code süreci açılamadı) hata satırda yazar ve rozet
"Başarısız" olur; "Bağlantıyı Kes" kaydedilemezse satır yeniden "Bağlı"
gösterir — ekran diskteki hâlden farklı bir şey söylemez.

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
  hata mesajı gösterilir, hiçbir şey açılmaz.
- **Nerede açılacağı**: **Bağlan** bağlantıyı Ayarlar > Genel > "SAP
  sistemine bağlanınca" seçimine göre açar (varsayılan Sohbet; düğmenin
  solunda "Sohbette açılır" / "Ajan terminalinde açılır" yazar). Yanındaki
  ok tek seferlik başka bir yer seçtirir:
  - **Sohbette aç** — bağlantının klasörüne bağlı yeni bir sohbet (eski
    davranış).
  - **Terminalde aç (ajan)** — Ajanlar ekranına geçer, o sisteme bağlı
    alanda (yoksa boş seçili alanı bağlar, o da yoksa yeni alan açar)
    bağlantının klasöründe bir axet-code ajan bölmesi açar ve odaklar.
  - **Kabukta aç** — aynı yerde, Ayarlar'daki kabukla (cmd/PowerShell)
    düz bir kabuk bölmesi.
  Üçünde de çalışma klasörü bağlantının klasörüdür; `.conn_adt`,
  `sap-context.md` ve QA/PRD salt okunur kuralı sohbettekiyle aynıdır.
  Ayar "Her seferinde sor" ise düğme **Bağlan…** olur ve menüyü açar.

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
  bildirim gelir. Ayarlar > Genel > Masaüstü bildirimleri'nden kapatılabilir.
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

Sol sütunun üstündeki **Ayar ara** kutusu ayarın adıyla arar (bölümün adını
bilmen gerekmez); eşleşmeyen bölümler listeden çekilir.

- **Genel**
  - **Proje klasörü**: Her müşteri/sistem için alt klasörlerin
    oluşturulacağı kök dizin (varsayılan: Belgelerim\aXet SAP Projects).
  - **SAP sistemine bağlanınca**: Sohbette aç (varsayılan) / Ajan
    terminalinde aç / Her seferinde sor. Bkz. "Sisteme Bağlanma".
  - **Masaüstü bildirimleri**: Sohbet turu bitince, ajan seni beklerken ya
    da panoda görev değişince — yalnız pencere odak dışındayken.
- **Görünüm**: Vurgu rengi, tema, sohbet yazı boyutu ve satır sıklığı (eski
  "Sohbet görünümü" bölümü buraya katıldı).
- **axet.code**: Çalışma klasörü — yeni sohbetler ve kökü seçilmemiş
  alanlardaki ajanlar burada açılır.
- **Ajanlar ve terminal**
  - **axet.code çalıştırma komutu**: Ajan bölmesinde çalıştırılan komut
    (varsayılan: `axet-code -y`).
  - **Gömülü terminal kabuğu**: cmd.exe veya PowerShell — Ajanlar ekranındaki
    kabuk ve ajan bölmeleri bu kabukla açılır, harici pencere açılmaz.
  - **Ajan başlarken ekip belleği özeti**: Belleği açık ajanın ilk satırına
    ekibin önemli notlarının kısa özeti eklenir (varsayılan açık).
  - **Lider ajan ekip kurabilsin** (varsayılan açık), **Lider açılışlarını
    onayla** (varsayılan kapalı) ve **Ekip başına lider açımı ajan** (varsayılan
    4): bkz. Ajanlar Ekranı → Lider ve otomatik ekip.
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

Ayarlar penceresinde "Sürüm ve destek" bölümünden (destek e-posta adresi ve
**Sorun bildir…** de burada):

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

- **Üst şerit** tek, alçak bir satırdır: solda ekip sekmeleri ve **+ Ekip**
  (sekme çoksa satır yatay kayar), yanında ekibin **proje klasörü**, sağda bölme
  sayısı, **+ Kabuk** ve **+ Ajan**. Sohbet ekranındayken bu şerit görünmez
  (çalışma alanı yalnız Ajanlar'da).
- **Proje klasörü**: ekibin çalıştığı klasör. Yeni ajanlar ve kabuklar bu
  klasörde açılır; **Değişiklikler** ve **Görev Panosu** doğrulamaları da
  bu klasörü kullanır (menüdeki **Kök klasör…** ile aynı ayardır; elle
  seçilen klasör SAP bağını kaldırır). Seçili değilse şeritte **Proje
  klasörü seç** düğmesi vardır (ipucunda şu an kullanılan varsayılan klasör
  yazar). Seçiliyse klasörün adı bir çip olarak görünür; tıklayınca küçük
  bir panel açılır: klasörün tam yolu, durumu ve **Başka klasör seç**,
  **Klasörü Gezgin'de aç**, **Bağı kaldır** düğmeleri (Esc ya da dışarı
  tıklamak kapatır). Klasör seçince çip hemen yeni adı gösterir ve kısa bir
  süre "Kontrol ediliyor…" yazar.
  - **Git nedir, ne zaman gerekir?** Git, bir klasördeki dosyaların
    değişiklik geçmişini tutan araçtır. Ajanlar ve kabuklar git olmadan da
    çalışır; git yalnız **Değişiklikler** sekmesi (ajanın neyi değiştirdiğini
    görmek ve geri almak) için gerekir.
  - Panel klasör git deposu değilse bunu söyler ve **Git deposu başlat**
    düğmesi sunar (klasörde `git init` çalışır; dosyalarına dokunulmaz).
    Bilgisayarda git kurulu değilse kurulum komutunu (`winget install
    Git.Git`) kopyalayabilirsin; kurduktan sonra NTT Studio'yu yeniden
    başlat. Klasör silinmiş ya da taşınmışsa **Başka klasör seç** ile yenisini
    seçersin. Bu durumlarda çip kehribar olur ve sebebi yazar.
- **Ekip sekmeleri**: her ekip bir çalışma alanıdır. Sekmede ad,
  ajan sayısı ve gerekiyorsa kehribar (soru bekleyen ajan) ya da kırmızı
  (başarısız alt görev) bir sayı görünür. Tıkla ya da ok tuşlarıyla seç; çift
  tık ya da **F2** ile yeniden adlandır. Sağ tık ya da seçili sekmenin **…**
  düğmesi: Yeniden adlandır, **Kök klasör…**, **Doğrulama komutları…**, SAP
  bağla/çöz, Kapat (canlı terminal ya da görev varsa sorar). En fazla 6 ekip.
- **+ Ekip**: boş bir ekip ya da hazır şablon. **SAP geliştirme** (lider,
  geliştirici, test), **Analiz** (lider, analist), **Destek** (tek ajan).
  Şablon ajanları axet-code ile, ekibin varsayılan klasöründe açar; rol yalnız
  bir etikettir, rol kapısı ve SAP kuralları aynen geçerlidir.
- **Görünüm rayı** (içerik alanının sol kenarı, alt alta simgeler):
  **Pano, Raporlar, Terminal, Ofis, Ajan yönetimi, Görevler, Değişiklikler, Tarayıcı, Bellek, Araçlar** (Ofis Terminal'in hemen altında). Simgenin
  üstüne gelince adı görünür; seçili olanın solunda vurgu çizgisi vardır.
  Klavyeyle yukarı/aşağı ok, Home/End. Sohbet'e sol menüdeki **Axet Chat**
  düğmesiyle dönülür. Seçim ekip başına hatırlanır; yeni ekip **Ofis**'te
  açılır. Simgenin köşesindeki küçük sayı bekleyen işi gösterir: **Görevler**
  açık alt görev, **Değişiklikler** incelenmeyi bekleyen kayıt, **Ofis** soru
  soran ajan sayısı (sıfırsa sayı çıkmaz). Terminal bölme düzenidir (değişmedi). Üst şeritteki **Kabuk**
  cmd/PowerShell bölmesi, **Ajan** yeni ajan açar: ad, motor
  (axet-code, Claude Code, Codex, Gemini CLI ya da kendi komutun), rol,
  klasör, renk. Pencere **Araçlar**'da seçtiğin varsayılan motorla açılır.
  **Rol** açılır bir seçicidir (ok tuşları, Enter, Esc): axet-code'da
  axet-code'un kendi ajanları (adı ve kısa açıklaması), öteki motorlarda hazır
  roller (Geliştirici, Analist, Test, İnceleme) ya da **Kendin yaz…** ile
  serbest bir rol adı. Kurulu olmayan motorun satırında "Kurulu değil" yazar
  ve başlamaz.
- **Pano** (raydaki ilk simge): ekibin kontrol paneli. Sağ üstteki **1 saat /
  24 saat / 7 gün** seçicisi bütün grafiklerin aralığını değiştirir.
  - **Göstergeler** (üstteki sekiz kutu): aktif ajan, çalışan, soru bekleyen,
    hatalı, açık görev, biten görev, inceleme bekleyen değişiklik ve bugünkü
    olay. Büyük sayı ŞU ANKİ değerdir; yanındaki küçük çizgi seçili aralıkta
    kova başına ne olduğunu gösterir (üzerine gelince ne ölçtüğü yazar). Kutuya
    tıklayınca Ofis, Görevler ya da Değişiklikler açılır.
  - **Etkinlik yoğunluğu**: Akış olaylarının zamana dağılımı, türe göre
    yığılmış sütunlar (iş başladı, değişiklik kaydı, bitti/doğrulandı, soru,
    hata). Üzerine gel ya da grafiğe Tab ile gelip ←/→ ile gez: o kovanın
    sayıları görünür. **Tablo** düğmesi aynı veriyi tablo olarak gösterir.
  - **Ajan durum şeridi**: her ajanın aralık boyunca ne zaman çalıştığı, soru
    sorduğu, hata verdiği (dolu bantlar) ya da boşta kaldığı (ince çizgi).
    Ajanın adına tıklayınca terminali açılır; **Tablo** aralıkları listeler.
  - **Görev ilerlemesi**: onaylanmış görevlerin alt görevleri duruma göre ve
    **doğrulama başarısı** (yalnız komutla doğrulananlar; elle onay ayrı sayılır).
  - **Ajan karşılaştırma**: ajan, rol, motor, durum, son etkinlik, biten iş
    (aralıkta biten tur · panoda biten alt görev) ve soru sayısı.
  - **Değişiklikler**: aralıktaki kayıtlar, dosya ve +/− satır özeti, inceleme
    durumu ve en çok değişen dosyalar (aralıktaki son 8 kaydın dosyaları).
  - **Sağlık**: depo, motorlar, bellek ve Akış geçmişinin doluluğu; **Son
    olaylar**: Akış'ın kısa kopyası.
  - Veri yalnız uygulamada olanlardan gelir: geçmiş Akış kaydıdır ve ekip başına
    en çok 500 olay tutulur. Yoğun bir ekipte 7 günlük görünümün başı boş
    kalabilir; o zaman göstergelerin altında en eski kaydın tarihi yazar.
- **Raporlar** (raydaki ikinci simge): biten ve başarısız her alt görevin
  raporu, en yeni önce. Kartta sonuç (Doğrulandı / Elle onaylandı / Bitti /
  Başarısız), görev, ajan, süre (ilk atamadan doğrulamaya), geçen komut sayısı,
  değişen dosyalar ve ajanın son cevabının özeti görünür.
  - Üstteki arama başlık, görev, ajan ve özette arar; **Ajan**, **Sonuç** ve
    **Tarih** seçicileri listeyi daraltır, **Süzgeçleri temizle** geri getirir.
    Listede ↑/↓ ile gezilir.
  - Bir rapora tıklayınca sağda ayrıntısı açılır: özet, doğrulama komutları ve
    çıkış kodları, **Adımlar** (o işe ait Akış olayları), değişiklik özeti ve
    **Değişikliklerde aç** (o alt görevin kaydı seçili açılır), **Görevde aç**,
    **Terminali aç** ve **Sonraki iş** önerileri (başarısızsa nedenine bak,
    komutla doğrulanmadıysa doğrulama ekle, kayıt incelenmediyse incele).
  - **Markdown olarak kaydet** seçili raporu, **Listeyi kaydet** süzülmüş
    listenin tamamını tek `.md` dosyası olarak kaydet penceresiyle yazar.
  - Raporlar yeni veri üretmez: pano, Akış geçmişi ve Değişiklikler kaydından
    derlenir. Cevap özeti yalnız kesin kaynaklı motorlarda kaydedilir; Akış
    geçmişi ekip başına 500 olayla sınırlı olduğundan eski raporların adımları
    boş kalabilir. Görevler sekmesinin altındaki küçük Raporlar bölümü son
    üçünü gösterir; **Tümünü Raporlar ekranında aç** bu ekrana getirir.
- **Araçlar** (raydaki son simge, anahtar): ajan motorlarının listesi. Her
  motorun yanında kurulu olup olmadığı ve sürümü, altında programın yolu
  yazar. Kurulu değilse tek satırlık kurulum komutu (ör. `npm install -g
  @google/gemini-cli`) ve **kopyala** düğmesi çıkar.
  - **Kur** (kurulu motorda **Güncelle**): kısa bir onay penceresi
    çalışacak komutu aynen gösterir (**Kur** / **Vazgeç**). Onaylayınca
    etkin alanda "Kurulum: <motor>" adlı bir cmd bölmesi açılır ve komut
    orada, gözünün önünde çalışır; gizli arka plan kurulumu yok. İstenirse
    kimlik doğrulamayı o bölmede yap. Başarıyla biterse bölmenin kabuğu
    kapanır ve satır kendiliğinden yenilenir ("Kurulu · sürüm"); hata olursa
    çıktı bölmede kalır. İstediğin an **Yeniden denetle** de olur.
  - Komutlar sabittir: Claude Code `npm install -g @anthropic-ai/claude-code`,
    Codex `npm install -g @openai/codex`, Gemini CLI `npm install -g
    @google/gemini-cli`. npm bulunamazsa düğme **Önce Node.js kur** olur
    (`winget install OpenJS.NodeJS.LTS`); Node kurulduktan sonra yeni PATH
    için uygulamayı yeniden başlatman gerekebilir.
  - Aynı motorun kurulumu sürerken düğme **Kuruluyor…** olarak kilitlidir.
    Bölme açılamazsa (etkin alan yok, bölme sınırı dolu) satırda nedenini
    söyleyen bir uyarı çıkar.
  - axet-code kurum içi yükleyiciyle (MSI) kurulur; burada Kur düğmesi yok.
  Soldaki yuvarlak düğme **varsayılan motoru** seçer. Oturum açma ve
  API anahtarları motorun kendi terminalinde yapılır; uygulama bunları
  görmez, saklamaz.
- **Akış** (sol sütun; Sohbet sekmesinde yerini sohbet listesi alır):
  - Üstte ekibin adı, kaç ajanın çalıştığı ve kaçının soru beklediği, SAP
    bağı; sağdaki kitap simgesi **Bellek** görünümünü açar.
  - **Ekip**: her ajan TEK satır — renk çizgisi, ad, rol, panodan aldığı iş
    ve sağda durum çipi (Çalışıyor, Soru soruyor, Boşta 3 dk, Bitti, Hata).
    Tıklayınca Terminal'de o ajanın terminali öne gelir. **≈** durumun tahmini
    olduğunu söyler (motorun kendi kaydı okunamıyor). axet-code açılışta
    "Choose your development tool" (yeni klasörde model) seçimi gösterir.
    **Ayarlar → Ajanlar ve terminal → "axet-code açılış seçimini otomatik
    yap"** (varsayılan açık) bu pencereyi senin yerine seçer: **Geliştirme
    aracı** (aXet.Code — axet-code'un kendi vurguladığı — ya da Codex) ve
    isteğe bağlı **Model** (boşsa axet-code'un son kullandığı; doluysa model
    penceresinin arama kutusuna yazılıp ilk eşleşme seçilir). Sen o an
    terminale yazıyorsan beklenir, pencereye kendin dokunduysan karışılmaz.
    Akış'ta ajan başına bir kez sessiz bir not düşer: "axet-code aracı
    otomatik seçildi (aXet.Code / model …)". İki denemede olmazsa "Araç
    seçimi otomatik yapılamadı — terminalde seç" yazar. Lider'in açtığı
    ajanlar da bundan yararlanır; Sohbet ekranı etkilenmez. Ayar kapalıysa
    (ya da seçim olmadıysa) seçim terminalde yapılmadan ajan hazır sayılmaz: pano işi gönderilmez
    (gönderilseydi seçim penceresinde kaybolurdu). Akış'tan yazdığın mesaj ise
    **kuyruğa** girer: Akış'ta "araç seçimi bekleniyor" kartı çıkar
    (**Terminalde aç**, **Vazgeç**); seçimi terminalde yapınca mesaj
    kendiliğinden ve bir kez gider. O an gidemezse kart sebebini yazar,
    **Yeniden gönder** senin tıklamanla bir kez daha dener. (axet-code'da bu
    pencereyi atlatan bir bayrak ya da ayar yok; model bayrağı da yalnız
    `axet-code run`'da var, bu yüzden seçim tuşla yapılıyor.) Seçimi yapıp
    ilk mesajı gönderince durum kesinleşir. Satırın üstüne gelince
    kitap simgesi (kalıcı bellek) belirir; yeniden başlatma gerektiğinde ok
    simgesi hep görünür. Motor adı ipucundadır; axet-code sürüm uyarısı varsa
    satırda görünür. Ekipte hiç ajan yoksa burada **İlk ajanını ekle** çıkar.
    Durum kesin bilinen (axet-code kaydına bağlı) ajan çalışırken çipte
    **aşaması** yazar: düşünüyor, dosya okuyor, dosya düzenliyor, komut
    çalıştırıyor, arıyor, cevap yazıyor; üstüne gelince hedefi de görünür
    (ör. "dosya okuyor: rapor.ts"; şifre/jeton benzeri değerler maskelenir).
  - **Olaylar**: her satırda kim (renk, ad, rol), ne (başladı, cevap, hata,
    soru, iş, doğrulandı, başarısız, kayıt, bilgi çipi) ve saat; altında kısa
    açıklama. Her görev **tek kart**: "başladı" kartının altındaki aşama satırı
    canlı güncellenir; ajan işini bitirince (ya da hata verince) aynı kart
    cevap kartına dönüşüp en alta iner. **Son cevap** kartta görünür (en çok
    dört satır; **Devamını göster** ile tamamı, **Terminalde aç** ile
    terminali). Cevap yalnız durumu kesin bilinen ajanlarda (axet-code'un kendi
    kaydı) okunur; şifre/jeton benzeri değerler «gizli» diye maskelenir, en çok
    2000 karakter tutulur.
    Durumu **tahmini** olan ajanda (≈) terminaldeki hareket tek başına olay
    sayılmaz: açılış ekranı, tuş yankısı ya da ekran yenilemesi "başladı/bitti"
    yazdırmaz. Ancak ajana bir istem gönderilip ardından çıktı gelirse
    "Çalışıyor (tahmini)", çıktı 20 sn durunca "Bitirmiş görünüyor (tahmini)"
    kartı çıkar; ikisi de ≈ işaretlidir, cevap terminaldedir. Kesin bağ
    kurulamadığında Akış sebebini bir kez **bilgi** kartıyla söyler: istem
    birden çok oturumda bulundu, oturum kaydı okunamadı, istem 60 sn içinde
    kayda düşmedi ya da motorun (Claude Code, Codex, Gemini, özel komut) kesin
    kaynağı yok. Gönderdiğin mesajlar "Sen → ajan" balonu olarak görünür. En yenisi
    altta. Geçmiş **kalıcıdır**: ekip başına son 500 olay uygulama verisinde
    saklanır (şifre/jeton benzeri değerler maskelenerek), uygulama yeniden
    açılınca geri gelir. "Akış" başlığının yanındaki çöp kutusu, onay
    sorduktan sonra o ekibin geçmişini siler; ekibi kapatınca geçmişi de
    silinir.
  - **Ajanlar birbirine soru sorabilir**: her ajanın terminalinde `ntt-team`
    aracı vardır. `ntt-team list` ekip üyelerini (ad, rol, durum),
    `ntt-team ask <ajan> "<soru>"` soruyu o ajana Akış yoluyla iletip
    cevabını bekler ve döndürür (en çok 3 dk), `ntt-team feed` ekibin son
    olaylarını gösterir. Ekipte iki ya da daha çok ajan varsa Akış'tan bir
    ajana yazdığın ilk mesajın sonuna bu araç kısaca tanıtılır; yani "Ali'ye
    raporun durumunu sor" demen yeter. Ajanlar arasındaki soru ve cevaplar
    Akış'ta "Ayşe → Ali" kartı olarak görünür. Hedef ajan meşgulse, soru
    bekliyorsa ya da açılış seçimindeyse soru gitmez ve soran ajana sebebi
    söylenir. Araç yalnız bu bilgisayarda (127.0.0.1) ve yalnız o ajanın
    terminaline özel, uygulama kapanınca geçersiz olan bir anahtarla çalışır;
    anahtar diske yazılmaz.
  - **Soru kartları**: ekibin cevap bekleyen soruları. axet-code'un seçenekli
    sorusunu tek tıkla cevaplarsın. Seçeneklerin hiçbiri uymuyorsa altındaki
    **Kendi cevabını yaz** kutusuna yazıp **Gönder**'e bas: cevap axet-code'un
    soru kutusundaki "Other" satırından ajana gider (ajan bunu "kullanıcı kendi
    cevabını yazdı" olarak görür). Metin tek satıra indirilir, en çok 500
    karakter; parola/anahtar gibi görünen parçalar «gizli» olarak gider. Her
    soruya bir kez gönderilir. Terminalde o soruya dokunduysan, çok seçimli
    bir soruysa ya da ajan axet-code değilse **Terminale git**.
  - **Mesaj kutusu** (en alt): kutunun altındaki **@ kime?** çipine tıkla ya
    da **@** yaz, listeden ajanı seç (ok tuşları + Enter); seçilen ajan çipte
    görünür, **×** kaldırır. Mesajı yaz, **Enter** gönderir, **Shift+Enter**
    yeni satır açar (kutu yazdıkça büyür); sağdaki ok düğmesi de gönderir.
    Satırlar ajana tek satır olarak birleşip gider (en çok 2000
    karakter, `!` ile başlayamaz). Ajan çalışıyor, soru bekliyor ya da
    terminalinde yarım bir satır varsa gönderilmez, sebebi yazılır; kendiliğinden
    yeniden denenmez. Ajan seçmeden Enter: "Bir ajan seç (@)". Ekipte iki ya da
    daha çok ajan varsa listenin başında **@ekip** vardır: aynı tek satır
    sırayla bütün ajanlara gider. Sonuçta kaçına gittiği ve gitmeyenlerin
    sebebi (meşgul, soru bekliyor, çalışmıyor…) yazılır; gitmeyenler için
    yeniden denenmez, hepsi gitmediyse metin kutuda kalır.
- **Bellek** (raydaki kitap simgesi ya da Akış başlığındaki kitap): solda
  bütün ekiplerin ajanları (ekip adıyla gruplu; satırda belleğin boyutu ve
  son değişikliği), sağda seçili ajanın kalıcı belleği. Düzenle, **Kaydet** ya da **Değişiklikleri at**.
  Kaydedilmemiş bir metinle başka ajana geçersen metin taslak olarak saklanır
  (listede "kaydedilmedi"), geri dönünce "geri getirildi" notuyla gelir.
  Ajan bu arada dosyayı değiştirdiyse hiçbir şey ezilmez; **Yeniden yükle**
  diskteki hâli getirir. Üstteki **Bellekte ara** kutusu bütün ajanların
  belleğinde arar; sonuca tıklayınca o ajan açılır. Belleği kapalı ajanda
  **Belleği etkinleştir** düğmesi vardır. Bellek dosyasına şifre ya da jeton
  yazma.
- **Ofis**: varsayılan yakınlık alanı doldurur; taşan kısmı sürükleyerek
  kaydırırsın (küçük harita yok), **−/+** ya da tekerlekle yumuşakça yakınlaşır,
  ortadaki değere tıklayınca varsayılana dönersin. Ajanların durumu tahmini
  olsa da sunucu ışıkları ve ekranlar yavaşça çalışır (Windows'ta "animasyon
  efektleri" kapalıysa hareket yoktur).
- **Bildirim**: bir ajan soru sorunca, işini bitirince ya da hata verince
  uygulamanın içinde kısa bir bildirim çıkar (soru kehribar, bitti yeşil,
  hata kırmızı); tıklarsan Ajanlar ekranı ve o ajan açılır, Akış'taki kartı en
  altta durur. Aynı olay için tek bildirim. O ekibi zaten görüyorsan bildirim
  kısa kalır; başka ekrandaysan daha uzun kalır ve soldaki **Ajanlar**
  düğmesinde okunmamış sayısı çıkar (Ajanlar'ı açınca sıfırlanır). Tahmini
  ajanın bitişi "bitirmiş görünüyor (tahmini)" diye yazılır. Pencere arka
  plandayken ayrıca Windows bildirimi gelir (yalnız durumu kesin bilinen
  ajanlar için). Ayarlar → Genel: **Ajan bildirimleri** bunların hepsini
  açıp kapatır (varsayılan açık); Windows bildirimi için **Masaüstü
  bildirimleri** de açık olmalı.
- SAP yazma onayı ve QA/PRD salt okunur kuralları ajanlar için de aynen
  geçerlidir. Bir ekipte en fazla 9 bölme (ajanlar dahil). Eski Terminal
  düzenin kaybolmaz; eski axet-code bölmeleri axet-code ajanı olarak açılır.
  Bu dönüşüm tek yönlüdür: daha eski bir sürüme (1.8.x) dönersen ajan
  bölmeleri o sürümde açılmaz.

### Lider ve otomatik ekip

Ekibe **Lider** rolünde bir ajan eklersen (+ Ajan → Rol: Lider) iş vermenin en
kısa yolu ona iş vermektir: lider işi parçalar, önce ekipteki boştaki uygun
ajanı kullanır, yoksa uygun rolde yeni ajan açar, görev verir, sonuçları toplar
ve sana kısa bir özet verir. Açtığı ajanları iş bitince kapatmaz — sonraki işler
için ekipte kalırlar; kapatmasını istersen söyle ya da Ajan yönetimi'nden kapat.

- **Nasıl başlar**: Akış'ta lidere ya da **@ekip**'e yaz. Ekipte Lider varsa
  @ekip mesajı yalnız lidere gider ("İş Lider … ajanına gitti"); ekibi o
  dağıtır. Lider yoksa mesaj eskisi gibi her ajana ayrı gider ve altında
  **Lider ekle** önerisi çıkar (tıklayınca ekleme penceresi Lider rolüyle
  açılır). Lidere Akış'tan giden ilk mesajın sonuna kısa bir yöneticilik
  rehberi eklenir (ekip tek kişiyse de).
- **Liderin araçları** (yalnız Lider rolündeki, senin açtığın ajanda çalışır):
  `ntt-team spawn --rol Geliştirici|Analist|Test|İnceleme [--ad <ad>] [--motor <motor>] [--gorev "<ilk görev>"]`
  ekibin alanında (ekibin depo kökünde, yoksa liderin klasöründe) yeni ajan
  bölmesi açar; ilk görev, ajan hazır olunca (axet-code'un açılış araç
  seçimi kapanınca) kendiliğinden gider.
  `ntt-team assign <ajan> "<görev>"` görev verir ve **G-xxxx** takip kimliği
  döndürür; `ntt-team wait <G-xxxx>` görevin sonucunu bekler (varsayılan 25 sn, bitmediyse yeniden çağrılır;
  `--sure` ile en çok 10 dk). Ajandan cevabının son satırını `GOREV-SONUC <kimlik>: <özet>`
  yazması istenir; sonuç bu kimlikle eşleştirilir, başka bir işin cevabı bu
  görevin sonucu sayılmaz. Claude/Codex/Gemini gibi kesin okuyucusu olmayan
  motorlarda da bu satır terminal çıktısından okunur; satır yoksa "cevap
  terminalinde" denir. `ntt-team status` ekip üyelerini, durum/aşamayı ve
  aktif görevleri gösterir; `ntt-team close <ajan>` yalnız liderin kendi
  açtığı ajanı kapatır — senin açtığın ajanlara dokunamaz.
- **Akış'ta görünür**: "Ayşe → yeni ajan açtı: Test (Test)", "Ayşe → Test"
  (görev), "Test → Ayşe" (sonuç), "Ayşe → ajanı kapattı" kartları. Ofiste
  liderden göreve giden ajana ışın çizilir. Liderin açtığı ajanların ekip
  satırında küçük bir dal işareti vardır. Bu görevler Görev Panosu'na alt
  görev olarak yazılmaz (pano kendi dağıtıcısıyla çalışıyor); izleri Akış
  geçmişindedir.
- **Sınırlar ve güvenlik**: ekip başına en çok 4 lider-açımı ajan (Ayarlar →
  Ajanlar ve terminal → "Ekip başına lider açımı ajan"), toplam 9 bölme, aynı anda en
  çok 2 açılış. Lider kendini çoğaltamaz (Lider rolünde ajan açamaz), açtığı
  ajanlar ekip kuramaz. Açılan ajan liderle aynı alanda çalışır: aynı SAP
  bağı, aynı beceri profili (modül danışmanı profilinde geliştirme yetkisi
  yine yoktur; rol etiketi yetki vermez). Motor yetkisi yalnız aşağı iner:
  onaysız çalışan axet-code'u (`-y`) yalnız axet-code lideri açabilir, serbest
  komutlu "özel" motor hiç açılamaz. Şifre ya da jeton aktarılmaz.
- **Ayarlar** (Ajanlar ve terminal): **Lider ajan ekip kurabilsin** (varsayılan
  açık; kapalıyken lider yalnız var olan ajanlara görev verebilir) ve **Lider
  açılışlarını onayla** (varsayılan kapalı; açıkken her açılış Akış'ta **Aç /
  Reddet** kartıyla bekler, 5 dk cevapsız kalırsa reddedilir).
- Görev takibi uygulama açıkken bellekte tutulur; uygulama kapanınca bekleyen
  görevler biter (Akış geçmişi kalır).
- **Hata ve takılma liderin sorumluluğunda**: liderin verdiği görevde ajan hata
  verirse görev hemen düşmez; geçici hatada uygulama önce kendisi yeniden dener
  (aşağıya bak). Denemeler tükenince ya da hata kalıcıysa (model, yetki) görev
  hata sınıfı ve deneme sayısıyla düşer, Akış'ta **"Ali → Ayşe · hata"** kartı
  çıkar ve lidere kendiliğinden bir satır gider (lider meşgulse boşalınca):
  "G-xxxx Ali: istek sınırı (429), deneme 3/3 tükendi. Öneri: …". `ntt-team wait`
  de sınıfı, deneme sayısını ve öneriyi döndürür. Lider görevi boştaki başka
  ajana verirse **"yeniden atadı"**, yeni ajan açarsa "yeni ajan açtı · G-xxxx
  yerine" kartı görünür. Aynı görev en çok 2 kez yeniden atanır; sonra lider
  sana bildirir. Atanmış görev uzun süre aşama değiştirmezse (varsayılan 10 dk)
  lidere **"takıldı"** satırı gider; lider `ntt-team ask` ile durumu sorabilir.
  Senin kendi verdiğin işte hata olursa lider yalnız bilgilendirilir, işine
  karışmaz. Aynı olay için lidere tek satır gider.

### Ajan hata verince

Ajan bir model ya da servis hatası alınca Akış'taki kartı hatanın kısa nedenini
gösterir: **servis geçici olarak kapalı** (5xx), **istek sınırı** (429),
**ağ / zaman aşımı**, **kimlik / yetki** (401/403), **model bulunamadı**,
**bağlam doldu**, **oturum geçmişi bozuk**, **güvenlik politikası engeli** ya da
**bilinmeyen hata**. Altında **Ayrıntı** satırında ham iletinin kısa, gizlisi
süzülmüş hali durur. axet-code'da neden oturum kaydından (kesin) okunur;
Claude Code/Codex/Gemini'de terminalin son hata satırından tahmin edilir (≈).

- **Otomatik yeniden deneme** (Ayarlar → Ajanlar ve terminal → "Ajan
  hatalarında otomatik yeniden dene", varsayılan açık; "En çok deneme" 1–5,
  varsayılan 3): yalnız geçici sınıflarda (servis, istek sınırı, ağ). 10 sn,
  30 sn, 90 sn bekler (biraz sapmalı); kartta geri sayım ve **İptal** vardır.
  axet-code'da oturum korunur, ajana "kaldığın yerden devam et" gider; öbür
  motorlarda son istem yinelenir. Sen o arada terminalde yazarsan ya da ajan
  başka işe geçerse deneme yapılmaz. Bildirim yalnız hata kesinleşince (deneme
  yok ya da bitti) ve bir kez gelir.
- **Kalıcı hatada** otomatik deneme yoktur; kart ne yapacağını söyler (ör.
  model bulunamadıysa Ayarlar → axet-code modeli'nden geçerli model seç).
- **Yeniden dene**: ajanın en son hata kartındaki düğme isteği hemen yeniden
  gönderir (sayaç sıfırlanır).
- **Aynı anda çalışan ajan (axet-code)** (varsayılan 2, "Sınırsız" seçilebilir):
  aynı hesaptan çok ajan aynı anda istek atınca 429 geliyor (ölçüm: 429 anlarında
  2–4 ajan çalışıyordu). Lider görevleri, pano dağıtımı ve otomatik denemeler
  bu sınırı aşmaz; fazlası sırada bekler (Akış'ta **"sırada"** kartı). Lider
  sınırdan muaftır. Bir ajan 429 alınca aynı motorun otomatik gönderimleri
  ekipçe kısa süre (20 sn'den başlayıp artan) bekler. Senin terminalde ya da
  Akış'tan yazdığın mesaj bu kapıya takılmaz.
- **Lider görevinde takılma uyarısı** (varsayılan 10 dk; Kapalı/5/10/20/30).

### Ajan yönetimi

Raydaki **Ajan yönetimi** (Ofis'in altında) TÜM ekiplerdeki ajanları tek
tabloda gösterir: baş harfli renkli kare, kalın ad ve altında rol, ekip,
motor/model, durum hapı ve şu anki aşama, son etkinlik, açılış saati (bu
uygulama oturumunda), bellek boyutu. Arama ve Ekip/Durum/Motor süzgeçleri
tek satırdadır. Lider ajanın ekip köprüsüyle açtığı ajanlarda "lider açtı"
etiketi vardır.

- Üstte arama (ad, rol, ekip, motor, model) ve **Ekip**, **Durum**, **Motor**
  süzgeçleri. Soru soran ve hata veren ajanlar en üstte.
- Satır eylemleri: **Terminalde göster**, **Mesaj gönder** (Akış mesaj
  kutusuyla aynı kurallar), **Yeniden adlandır**, renk, **Belleği aç**
  (kapalıysa açar), **Yeniden başlat** ve **Kapat** (ikisi de onay ister).
- Kutucuklarla birden çok ajan seç (başlıktaki kutucuk görünenlerin hepsini
  seçer): **Yeniden başlat** ya da **Kapat** toplu yapılır; onay penceresi kaç
  ajanın şu an çalıştığını ve işinin yarıda kalacağını söyler.
- **+ Ajan** seçili ekibe ekler; **+ Ekip** boş ekip ya da hazır şablon açar.
- Ajanı başka ekibe taşımak ve rolünü değiştirmek burada yok: rol ajanın
  açılış ayarıdır, farklı rol için yeni ajan ekle.

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
- **Görünüm**: her sütun renkli noktalı başlık ve sayı hapıyla ayrı bir
  şerittir; boş sütunda kesikli "Boş" kutusu durur. Alt görev kartında
  atanan ajanın baş harfi ve adı, ana görev kartında ilerleme çubuğu
  vardır; sağ üstte onaylı görevlerin "3/7 alt görev bitti" özeti.
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
  60 karakteri başın üstündeki sarı piksel balonda ("?" rozeti ve **SORU**
  başlığıyla, en çok üç satıra sarılarak) yazar; balon yakınlıktan bağımsız
  keskin okunur. Tahmini durumda sarı bir "?" çıkar. Cevabı Akış'taki soru
  kartından ya da terminalden verirsin.
- **Konuşma balonu**: ajan bir şey deyince başının üstünde beyaz piksel
  balon birkaç saniye görünür: işini bitirince cevabının ilk satırı (cevap
  terminaldeyse "Bitti!"), kesin durumda aşaması değişince "dosya okuyor…"
  gibi kısa bir söz (ajan başına seyrek), panodan iş alınca "Tamam,
  başlıyorum". Balon açıkken soru balonu geri çekilir.
- **Bilgi kartı**: karakterin üstüne gelince (ya da Tab ile odaklanınca)
  yanında küçük bir kart açılır: ad, rol, durum, şu anki aşama, panodaki
  görev (yoksa "Şu an görevi yok"), soru ve son cevabın özeti.
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
- **Üst çubuk** (sağ üst): ekip adı ve "2/4 aktif" (çalışan + soru soran
  ajan / toplam), saat düğmesi ve yakınlık.
- **Kamera**: sürükleyerek kaydırılır, fare tekerleği ya da sağ üstteki
  **−** / **+** ile yumuşakça yakınlaşır (tekerlekte imlecin altındaki yer
  sabit kalır); ortadaki değer düğmesi varsayılana döner. İlk açılışta
  kamera masaların olduğu üst kısımdadır. Küçük harita yoktur.
- **Gündüz / gece**: **Saat** düğmesi otomatik → gündüz → gece arasında
  döner (seçim kaydedilmez). Otomatikte ofis bilgisayarın saatini izler;
  akşam kararır, masa ekranları ve tavan lambaları yanar, gündüz
  pencerelerden güneş düşer.
- Düz terminaller ofiste görünmez; sol alt köşede sayıları yazar. Ajan
  yoksa "Ofiste kimse yok" ve **Ajan** düğmesi çıkar.
- Ofisteyken terminaller kapanmaz, yalnız gizlenir. Ofis ekranda değilken
  çizim durur. Windows'ta "Animasyon efektlerini göster" kapalıysa (hareketi
  azalt) ofiste hiçbir şey kıpırdamaz ve ofis (Saat otomatikteyken) gündüz kalır.
- **Çizimler**: karakterler, eşya ve zeminler uygulamanın kendi kodla
  çizilmiş piksel çizimleridir; dış görsel paketi kullanılmaz.

### Değişiklikler

**Değişiklikler** sekmesi ajanların bu alanın klasöründe dosyalarda yaptığı
değişiklikleri gösterir ve beğenmediğini geri almanı sağlar. Yalnız **Git
deposu** olan klasörlerde çalışır (alanın kökü, yoksa ajanların varsayılan
klasörü); depo değilse ya da Git kurulu değilse bunu açıkça söyler. Klasörü
kendisi depoya çevirmez; bunun için üst şeritteki **proje klasörü** çipinin
panelinde **Git deposu başlat** düğmesi vardır.

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
- **Otomatik açma**: ajan çalışırken `http://localhost:3000` gibi bir yerel
  adres verirse (terminal çıktısında ya da son cevabında; `localhost`,
  `127.0.0.1`, `[::1]`, `0.0.0.0` → `localhost`) adres ekibin Tarayıcı
  görünümünde kendiliğinden açılır ve Akış'ta "Tarayıcıda açıldı" kartı
  çıkar. Aynı adres aynı ajan oturumunda bir kez açılır. O an başka bir
  yerde yazıyorsan ya da ekip seçili değilse görünüm değiştirilmez: sayfa
  arkada yüklenir, raydaki Tarayıcı düğmesinde rozet görünür. Sunucu henüz
  ayağa kalkmadıysa birkaç saniye arayla üç kez yeniden denenir. Uzak
  adresler hiçbir zaman kendiliğinden açılmaz: ajanın cevabındaki uzak adres
  Akış'ta **Tarayıcıda aç** düğmeli kart olarak görünür. Kapatmak için
  Ayarlar → Genel → **Yerel adresleri tarayıcıda otomatik aç**.
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

### Bellek (ikinci beyin)

Ajan başına markdown belleğinin üstünde, ekibin **ortak hafızası**: kararlar,
olgular, kişi/sistem bilgileri, görevler ve öğrenilenler küçük **notlar**
olarak birikir ve birbirine bağlanır. Rayda **Bellek** açılınca ilk görünen
budur.

- **Not** = başlık, gövde (markdown), tür (Karar · Olgu · Kişi / sistem ·
  Görev · Öğrenim · Not), etiketler, kaynak (sen, ajan, Akış ya da görev),
  tarih. Gövdede `[[Başka notun başlığı]]` yazınca iki not bağlanır
  (`[[Başlık|görünen metin]]` da olur). Not ya **ekip belleğinde** ya da bir
  **ajanın belleğindedir**.
- **Harita**: her not bir nokta; ajanlar, "Ekip" ve en az iki notta geçen
  etiketler büyük düğümler. Çizgiler: kimin belleği (ince), `[[bağlantı]]`
  (açık renk), ortak etiket (kesik). Renk = kimin belleği (sol alttaki
  liste); bir satıra tıklayınca yalnız o ajanın bildikleri parlak kalır.
  Fareyle sürükle-kaydır, tekerlekle ya da sağ alttaki **+ / − / Sığdır** ile
  yakınlaştır. Bir düğüme tıkla: sağda ayrıntı açılır.
- **Ayrıntı paneli**: notun türü, kimin belleği, tarihi, kaynağı, etiketleri
  (tıkla → o etikete süz), gövdesi (`[[bağlantı]]`lar tıklanır; olmayan nota
  bağlantı soluk görünür, tıklarsan o başlıkla yeni not açılır),
  **Bağlantılar** ve **Geri bağlantılar** (bu nota bağlanan notlar).
  **Düzenle** başlık, tür, sahip, etiket ve gövdeyi değiştirir (Ctrl+Enter
  kaydeder, Esc vazgeçer); **Sil** onay ister. Ajan düğümü seçilince onun
  notları listelenir, **Markdown belleğini aç** eski dosya düzenleyicisine
  götürür.
- **Arama** başlıkta, etiketlerde ve gövdede arar (çok sözcükte hepsi
  geçmeli; i/ı/İ/I ayrımı yapılmaz); eşleşmeyen düğümler solar, sonuç kutusu
  başlık, sahip ve eşleşen parçayı gösterir. **Süzgeç** tür, kimin ve etiket
  çipleri açar.
- **Liste** aynı notları satır satır gösterir (son değişen önce): grafın
  klavye karşılığı. ↑/↓/Home/End gezinir, Enter açar. Haritada da klavye
  çalışır: Tab ile haritaya gir, ok tuşları o yöndeki en yakın düğüme gider,
  Enter açar, Esc seçimi bırakır, + / − / 0 yakınlaştırır.
- **Dosyalar** ajan başına markdown belleğidir (yukarıdaki "Kalıcı bellek");
  olduğu gibi duruyor.
- **Belleğin dolması**:
  - Akış'ta ajanın cevap kartının, ajandan ajana mesajın, sorunun ve
    doğrulanan görevin altında **Belleğe ekle**: tek tıkla ekip belleğine
    not (cevap → Olgu, soru → Karar, görev → Görev).
  - Ajanlar terminallerinden `ntt-team` aracıyla yazar ve okur:
    `ntt-team memory add "<başlık>" "<gövde>" [--tur karar] [--etiket a,b] [--ben]`,
    `ntt-team memory search "<sorgu>"`, `ntt-team memory get "<başlık>"`,
    `ntt-team memory link "<A>" "<B>"`, `ntt-team memory list`. Varsayılan
    ekip belleği; `--ben` ajanın kendi belleği. Bir ajan başka ajanın kendi
    notlarını göremez, ekip notlarını herkes görür. Ajan yazınca harita
    kendiliğinden yenilenir.
  - Belleği açık ajan yeni oturum açınca giden `[Bellek]` satırının sonuna
    ekip belleğinin kısa özeti eklenir (önce kararlar, yalnız başlıklar, en
    çok ~700 karakter) ve ayrıntı için `ntt-team memory search` hatırlatılır.
- **Nerede durur**: `%APPDATA%\<uygulama>\memory-notes\<ekip>.json`, ekip
  başına tek dosya (ekip + ajan notları). Yazım atomik (yarım dosya kalmaz).
  Ekibi kapatmak notları **silmez**. Sınırlar: başlık 120, gövde 8000
  karakter, not başına 12 etiket, ekip başına 2000 not, dosya 4 MB; dolunca
  yeni not reddedilir, eskiler silinmez.
- **Gizli bilgi**: başlık, gövde ve etiketler yazılırken ve okunurken token,
  anahtar ve JWT desenlerine karşı süzülür. Yine de şifre yazma.
- Not o arada bir ajan tarafından değiştirildiyse düzenlemen üzerine
  yazılmaz: "Not bu arada değişti" uyarısı çıkar, metnin formda kalır.

#### Kendi kendine öğrenme

Bellek ekranının altındaki **Öğren** kutusuyla bir ajana "şunu araştır,
öğren" dersin; ajan araştırır ve öğrendiklerini belleğe not olarak yazar.

- **Kutu**: öğrenecek ajan (haritada bir ajan seçiliyse o gelir), konu,
  **Kaynaklar** ve **Nereye yazsın** (ekip belleği ya da ajanın kendi
  belleği). Konuyu yazıp Enter'a ya da **Öğren**'e bas.
  - *Proje klasörü*: ajanın çalışma dizinindeki kod ve dokümanlar (yalnız okur).
  - *Web*: yalnız motorunda web aracı olan ajanlarda görünür (axet-code
    `fetch`, Claude Code, Gemini). Codex ve özel komutta gizli; ipucu nedenini
    yazar.
  - *Ekip belleği ve Akış*: var olan notlar ve son olaylar.
  - **SAP yok**: öğrenme görevi SAP sistemlerine bağlanmaz, SAP araçlarını
    çağırmaz, dosya değiştirmez; şifre, token ve kişisel veri yazmaz.
- **Ajana giden görev**: araştır, en önemli en çok 8 bulguyu seç; her bulgu
  tek fikirlik bir not (Olgu, Öğrenim, Karar ya da Kişi/sistem), gövdesinde
  `Kaynak:` (dosya yolu ya da URL) ve ilgili notlara `[[bağlantı]]`. Ajan
  yazmadan önce `ntt-team memory search` ile benzerini arar; varsa
  `ntt-team memory update "<başlık>" "<ek>"` ile mevcut nota ekler, yoksa
  `ntt-team memory add … --gorev <kimlik>` ile yeni not açar. Sonunda tek
  satır özet ve önerdiği sonraki konular.
- **Öğrenme görevleri** listesi: konu, ajan, durum (bekliyor / çalışıyor /
  bitti / hata), eklenen ve güncellenen not sayısı, süre. Ajan meşgulse ya da
  soru bekliyorsa görev **bekliyor**da kalır ve ajan boşalınca kendiliğinden
  gönderilir (İptal edebilirsin). Liste bu bilgisayarda saklanır (en çok 50).
- **Bitince**: yeni ve güncellenen notlar haritada birkaç saniye kesik bir
  halkayla, listede "yeni" etiketiyle gösterilir (hareketi azalt açıksa
  halka yanıp sönmez). Akış'ta "öğrenme" kartı çıkar. Notun ayrıntısında
  kaynak "öğrenme görevi «konu»" yazar.
- **Bunu da öğren**: ajanın önerdiği konular görev satırında düğme olur; tek
  tıkla aynı ajan ve kaynaklarla yeni görev başlar.
- **Geri al**: görevin eklediği notları siler (satır içi onay; Esc vazgeçer).
  Güncellenen eski notlara dokunmaz.

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
