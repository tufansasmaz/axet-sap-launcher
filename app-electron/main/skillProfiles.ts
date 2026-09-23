// Rol profilleri ve skill kataloğu.
//
// NTT skill kataloğu her skill'i üç eksende süzüyor: risk seviyesi (tier 0-3),
// çalışma alanının riski (sandbox / internal-dev / customer-dev /
// customer-production) ve takım. Bu dosya o modelin bu uygulamaya düşen
// sadeleştirilmiş hâli:
//
//   - `writeCapable`  -> skill SAP'a yazma niyeti taşıyor mu (tier >= 1 karşılığı)
//   - `SystemTier`    -> bağlanılan sistemin önemi (DEV/QA/PRD)
//   - `SkillProfile`  -> danışmanın rolü
//
// Kural: yalnızca DEV işaretli sisteme YAZILIR. SAP API Politikası (Mayıs 2026)
// ADT dahili API'leri üzerinden ajanla üretim verisine dokunmaya izin vermiyor.
// Kapı 2026-09-23'e kadar kurulumdaydı (PRD'de yazma skill'i kurulmuyordu);
// kullanıcı kararıyla artık YAZMA ANINDA, skill'in kendi kodunda — bkz.
// `planSkills`. Kurulumdaki tek kapı ROL kapısı.
//
// Tablo elle türetildi: uygulamanın katalog deposuna çalışma zamanında hiçbir
// bağımlılığı yok, olmamalı da.

import type { SkillPlanEntry, SkillProfile, SkillSet, SystemTier } from "../shared/types";

export type { SkillProfile };

export interface SkillDef {
  /** `resources/sap-toolkit` altındaki göreli yol. */
  path: string;
  /** SAP'a yazma niyeti taşıyor mu? Modül danışmanına kurulmaz; DEV dışında yazmayı reddeder. */
  writeCapable?: boolean;
  /**
   * Proje kopyasına ALINMAYACAK alt klasörler. ADT üçlüsü (`sap-adt`,
   * `sap-adt-readonly`, `sap-adt-router-bridge`) için `scripts/` böyle: içinde
   * tam yetkili ADT motoru var, skill'in kendisi ise zaten "script'leri asla
   * çalıştırma, HTTP sunucusuna konuş" diyor. Motor `resources/` altında
   * kalır, launcher oradan başlatır.
   */
  excludeDirs?: string[];
  /**
   * `skillScope()`'un `writeCapable`'dan türettiği yeri EZER. Tek kullanıcısı
   * ADT üçlüsü: hangi ADT yüzeyinin doğru olduğu sisteme bağlı (DEV'de yazan
   * motor, QA/PRD'de sarmalayıcı), global klasörün ise bir sistemi yok. Global
   * bir kopya bırakılsaydı DEV projesinde iki ADT skill'i yan yana durur,
   * ajana cevabı olmayan bir soru sorulurdu.
   */
  scope?: "global" | "project";
}

export const SKILL_CATALOG: Record<string, SkillDef> = {
  // --- SAP: ADT motoru ------------------------------------------------------
  // Yukarı akış 2026-09'da tek parça `sap-adt-readonly`'yi ÜÇE BÖLDÜ; biz de
  // aynısını yapıyoruz çünkü bölünmenin sebebi doğru:
  //
  //   sap-adt              motorun kendisi, 33 araç, yazma dahil
  //   sap-adt-readonly     4 dosyalık sarmalayıcı — motoru YANDAN import edip
  //                        13 yazan aracı MCP kaydından siliyor (17 araç kalır)
  //   sap-adt-router-bridge  ADT'yi RFC'ye çeviren shim (adt_rfc_bridge.py);
  //                        router arkasındaki, HTTP portu kapalı sistemler için
  //
  // Sarmalayıcı motoru `../sap-adt/scripts`'ten import ediyor ve bulamazsa
  // açılışta reddediyor — yani ikisi KARDEŞ klasör olmak zorunda. Üçünde de
  // `excludeDirs: ["scripts"]` olması bunu garantiliyor: hiçbir script proje
  // kopyasına gitmiyor, sunucu her zaman `resources/sap-toolkit` altından
  // başlıyor ve orada üçü de yan yana duruyor. `scripts` dışlaması kalkarsa
  // bu kardeşlik bozulur.
  "sap-adt": {
    path: "sap-consultant/skills/sap-adt",
    writeCapable: true,
    excludeDirs: ["scripts"],
    scope: "project"
  },
  "sap-adt-readonly": {
    path: "sap-consultant/skills/sap-adt-readonly",
    excludeDirs: ["scripts"],
    scope: "project"
  },
  "sap-adt-router-bridge": {
    path: "sap-consultant/skills/sap-adt-router-bridge",
    excludeDirs: ["scripts"],
    scope: "project"
  },

  // --- SAP: inceleme ve tasarım -------------------------------------------
  "clean-core": { path: "sap-consultant/skills/clean-core" },
  "sap-docs": { path: "sap-consultant/skills/sap-docs" },
  "library-match": { path: "sap-consultant/skills/library-match" },
  "abap-code-checker": { path: "sap-consultant/skills/abap-code-checker" },
  // `abap-code-checker` tek bir nesneye bakıyor; bu, NTT'nin kurumsal ABAP
  // standardının (abap_core v2.0) tamamına karşı denetim yapıyor. İkisi de
  // yalnızca OKUYOR — düzeltmeyi öneriyor, uygulamıyor.
  "abap-code-review": { path: "sap-consultant/skills/abap-code-review" },
  "screen-mockup": { path: "sap-consultant/skills/screen-mockup" },

  // --- SAP: yazma yetenekli ------------------------------------------------
  "screen-gen": { path: "sap-consultant/skills/screen-gen", writeCapable: true },
  // SFPF/SFPI yaratıp aktive ediyor — ADT üzerinden değil, RFC'li bir üretici
  // FM ile. Kapı yine aynı kapı: bu bayrak "SAP'ta nesne oluşur" demek,
  // hangi kanaldan oluştuğu değil.
  "adobe-gen": { path: "sap-consultant/skills/adobe-gen", writeCapable: true },
  // Kaynak sistemden okuyup HEDEF sisteme ADT ile yazıyor (paket taşıma,
  // yeniden adlandırma). İki sistemli olması kapıyı yumuşatmıyor.
  "sap-object-transfer": { path: "sap-consultant/skills/sap-object-transfer", writeCapable: true },

  // --- SAP: danışmanlık döngüsü (talep → geliştirme → teslim → arıza) -------
  // Dördü de canlı sistemi OKUYOR, hiçbiri yazmıyor: kullandıkları `adt_*`
  // araçlarının hepsi read-only kapının 20 adlık izin listesinde. Paket
  // kopyalarında MCP→HTTP uyarlama notu var (`POST 127.0.0.1:8787/tool/...`).
  "as-built-doc": { path: "sap-consultant/skills/as-built-doc" },
  "sap-cr-scope": { path: "sap-consultant/skills/sap-cr-scope" },
  "sap-cr-handover": { path: "sap-consultant/skills/sap-cr-handover" },
  // `sap-incident` yukarı akışta DEV'e `adt_push`/`adt_activate` ile yazmayı
  // öneriyordu; o iki araç sunucuda hiç açılmıyor ve SKILL.md'de bu bilerek
  // üstü çizilerek yazıldı. Yani skill "diff öner, uygulamayı geliştiriciye
  // bırak" hâline geldi — SAP'a yazma niyeti kalmadı.
  "sap-incident": { path: "sap-consultant/skills/sap-incident" },
  "test-scenarios": { path: "sap-consultant/skills/test-scenarios" },

  // --- SAP dışı analiz/tasarım (sisteme hiç bağlanmıyor) -------------------
  // conversion-scope ve atc-remediation kendi tanımlarında "FILES ONLY —
  // never connects to SAP" diyor: danışman kanıtı dışa aktarıyor, skill
  // dosyaları okuyor. atc-remediation düzeltmeyi abapGit ZIP'i olarak
  // paketliyor; teslim yolu yine geliştirici, yani SAP'a yazan taraf değil.
  "conversion-scope": { path: "ntt-s4-migrator/skills/conversion-scope" },
  "atc-remediation": { path: "ntt-atc-batch-remediator/skills/atc-remediation" },
  "bbp-creator": { path: "sap-consultant/skills/bbp-creator" },
  "designer-ai": { path: "sap-consultant/skills/designer-ai" },
  // Celonis'e REST ile obje yaratıyor — ama `writeCapable` bayrağı "SAP'a
  // yazar" demek ve PRD kapısı SAP sistemini koruyor. Celonis ayrı bir ürün,
  // ayrı bir yetki; bu kapı onun kapısı değil.
  "celonis-ocpm-builder": { path: "celonis/skills/celonis-ocpm-builder" },
  "datasphere": { path: "sap-datasphere/skills/datasphere" },
  "datasphere-skill-pack": { path: "sap-datasphere/skills/datasphere-skill-pack" },
  "ui5-dev-pack": { path: "sap-ecosystem/skills/ui5-dev-pack" },
  "cap-dev-pack": { path: "sap-ecosystem/skills/cap-dev-pack" },
  "basis-ops-pack": { path: "sap-ecosystem/skills/basis-ops-pack" },
  "automation-pilot-pack": { path: "sap-ecosystem/skills/automation-pilot-pack" },

  // --- AUTH+ : yetki taşıma (ECC → S/4) üç aşaması -------------------------
  // Üçü de `writeCapable` DEĞİL ve bu bir tercih değil, bir olgu: PFCG rolü
  // bir ADT nesnesi değil, dolayısıyla buradaki hiçbir araç bir SAP sisteminde
  // rol yaratamaz. İlk ikisi AGR_*/TSTC/TOBJ tablolarını OKUYOR, üçüncüsü
  // yalnızca dosya üretiyor — insanın PFCG'de yapacağı işin hazırlığı.
  "auth-discovery": { path: "auth-plus/skills/auth-discovery" },
  "auth-gap-analysis": { path: "auth-plus/skills/auth-gap-analysis" },
  "auth-build": { path: "auth-plus/skills/auth-build" },

  // --- SAP GUI ekran yakalama ----------------------------------------------
  // ADT'ye değil, çalışan SAP GUI penceresine bakıyor: PrintWindow ile ekran
  // görüntüsü alıp kullanım kılavuzu üretiyor. Tuş basabildiği için SKILL.md'ye
  // "PRD'de yalnızca görüntüleme işlemleri" uyarısı eklendi; `writeCapable`
  // DEĞİL çünkü o bayrak ADT üzerinden SAP nesnesi yazmayı işaretliyor ve
  // PRD kapısının koruduğu şey o.
  "sapgui-screenshots": { path: "sapgui-scriptter/skills/sapgui-screenshots" },
  // Bu, ekran yakalamanın aksine SAPGUI'yi SÜRÜYOR: ZABAPGIT_STANDALONE'a
  // ZIP import ettirip aktive ediyor, yeşil olana kadar döngüde. Sisteme
  // nesne inmesi ADT'den geçmiyor diye kapının dışında kalamaz.
  "abapgit-deploy": { path: "sapgui-scriptter/skills/abapgit-deploy", writeCapable: true },

  // --- Doküman üretimi -----------------------------------------------------
  "fs-generator": { path: "sap-consultant/skills/fs-generator" },
  "sap-enduser-doc": { path: "sap-consultant/skills/sap-enduser-doc" },
  "ts-generator": { path: "sap-consultant/skills/ts-generator" },
  // `fs2ts` BURAYA GERİ EKLENMEYECEK. `ts-generator`'ın 2026-08-02 öncesi adı ve
  // marketplace'te hâlâ ayrı bir klasör olarak duruyor; `description`'ları aynı
  // ifadelerle tetikleniyor, yani ikisi birden kuruluysa ajan neredeyse özdeş iki
  // skill arasında rastgele seçiyor. Toptan bir senkron onu geri getirirse sil.
  "spec-reviewer": { path: "sap-consultant/skills/spec-reviewer" },
  "meeting-notes-organizer": { path: "sap-consultant/skills/meeting-notes-organizer" },
  "fast-scan-question-generator": { path: "sap-consultant/skills/fast-scan-question-generator" },
  // Onaylanan dokümanı SharePoint'teki ortak depoya, kimin hangi baytları
  // onayladığı kaydıyla birlikte koyuyor. SAP'a hiç dokunmuyor.
  "project-store": { path: "sap-consultant/skills/project-store" },

  // --- abapGit köprüsü -----------------------------------------------------
  "abapgit-howto": { path: "abapgit-bridge/skills/abapgit-howto" },
  "abapgit-workflow": { path: "abapgit-bridge/skills/abapgit-workflow", writeCapable: true },
  "abapgit-export-zip": { path: "abapgit-bridge/skills/abapgit-export-zip", writeCapable: true },
  "abapgit-import-status-zip": {
    path: "abapgit-bridge/skills/abapgit-import-status-zip",
    writeCapable: true
  },

  // --- aXet.flows ----------------------------------------------------------
  // SAP'a hiç dokunmuyor: akış JSON'u okuyor, doğruluyor, üretiyor. Bu yüzden
  // `writeCapable` DEĞİL — o bayrak "SAP'a yazar" demek ve PRD kapısını açar.
  // Script'leri yalnızca Python standart kütüphanesini kullanıyor, kurulacak
  // bir bağımlılık yok.
  "axet-flows": { path: "axet-flows/skills/axet-flows" },
  // Bozuk bir aXet.code oturumunun geçmişini yerinde onarıyor (tool_use /
  // tool_result eşleşmesi kopunca oturum 400 dönüyor). SAP'la ilgisi yok,
  // herkese lazım olabilir — ve BAŞKA bir oturumdan çalıştırılması gerekiyor,
  // bozuk olan hiçbir şey çalıştıramaz.
  "session-recovery": { path: "axet-code/skills/session-recovery" },

  // --- Office --------------------------------------------------------------
  "office-excel-read": { path: "office-tools/skills/office-excel-read" },
  "office-excel-write": { path: "office-tools/skills/office-excel-write" },
  "office-excel-transform": { path: "office-tools/skills/office-excel-transform" },
  "office-excel-report": { path: "office-tools/skills/office-excel-report" },
  "office-excel-compare": { path: "office-tools/skills/office-excel-compare" },
  "office-excel-images": { path: "office-tools/skills/office-excel-images" },
  "office-slides": { path: "office-tools/skills/office-slides" },
  "office-pdf": { path: "office-tools/skills/office-pdf" },
  "office-pptx": { path: "office-tools/skills/office-pptx" },
  "office-docx": { path: "office-tools/skills/office-docx" },
  "office-manual": { path: "office-tools/skills/office-manual" }
};

/**
 * Skill KLASÖRÜNÜN DIŞINDA duran, birden çok skill'in paylaştığı dosyalar.
 *
 * NEDEN VAR: yukarıdaki katalog yalnızca skill klasörlerini kopyalıyor, ama
 * bazı script'ler bilerek bir üst dizine bakıyor:
 *
 *   - Office script'leri: `sys.path.insert(0, .../scripts/../../../lib)`
 *   - Danışmanlık script'leri: `py "${CLAUDE_PLUGIN_ROOT}/scripts/case.py" ...`
 *
 * İkisi de kurulu düzende `<proje>/.axet-code/` altına, skill'in yanına düşüyor.
 * Bugüne kadar bu klasörler hiç oluşturulmuyordu ve sonuç GÖRÜNMEZ bir arızaydı:
 * `redact.py` bulunamayınca `--redact-pii` (TCKN/vergi no maskeleme) sessizce
 * devre dışı kalıyor, doküman maskesiz üretiliyordu.
 *
 * `marker`, "bu klasörü BİZ koyduk" demenin tek yolu: kullanıcının kendi
 * bıraktığı bir klasörü silmemek için silme kararı ona bakıyor.
 */
export interface SharedAsset {
  /**
   * `resources/sap-toolkit` altındaki kaynak klasörler — hepsi TEK hedefe
   * birleştiriliyor.
   *
   * Çoğul olması bir esneklik değil, kurulu düzenin zorunlu sonucu. Yukarı
   * akışta her eklentinin KENDİ `lib`'i var (`office-tools/lib`,
   * `sap-consultant/lib`) ve script'ler oraya `<eklenti>/skills/<ad>/scripts`
   * içinden `../../../lib` diye ulaşıyor. Bizim kurulumumuzda eklenti katmanı
   * yok — her skill `.axet-code/skills/<ad>` altında, yani aynı `../../../lib`
   * ifadesi ikisi için de TEK bir `.axet-code/lib` klasörünü gösteriyor.
   * Ayrı hedefler vermek mümkün değil; sıralı kopyalamak zorunlu.
   *
   * Dosya adları çakışmıyor (`redact.py`/`theme.py`/`assets` ile `onedrive.py`)
   * ve çakışsaydı sessizce sonuncusu kazanırdı — bu yüzden aşağıda ayrıca
   * test ediliyor.
   */
  paths: string[];
  /** `<proje>/.axet-code/` altındaki hedef klasör adı. */
  dest: string;
  /** Klasörün bizden geldiğini gösteren dosya. */
  marker: string;
  /** Bu klasöre ihtiyaç duyan skill'ler — hiçbiri kurulmadıysa kopyalanmaz. */
  requiredBy: string[];
}

export const SHARED_ASSETS: SharedAsset[] = [
  {
    // `onedrive.py` 2026-09-23'e kadar HİÇ paketlenmemişti ve arıza sessizdi:
    // `candidate_roots` `None` kalıyor, `fast-scan-question-generator`
    // eşitlenmiş kütüphaneyi hiç bulamıyor (`checks = []` -> `not_found`) ve
    // yalnızca elle verilen `FAST_SCAN_SOURCE_ROOT` ile çalışıyordu.
    paths: ["office-tools/lib", "sap-consultant/lib"],
    dest: "lib",
    marker: "redact.py",
    requiredBy: [
      "office-docx",
      "office-pdf",
      "office-pptx",
      "office-manual",
      "fast-scan-question-generator",
      "project-store"
    ]
  },
  {
    // case.py (vaka kaydı), quality.py (kalite tahtası), summary_check.py.
    paths: ["sap-consultant/scripts"],
    dest: "scripts",
    marker: "case.py",
    requiredBy: [
      "abap-code-checker",
      "fs-generator",
      "ts-generator",
      "sap-cr-scope",
      "sap-cr-handover",
      "sap-incident"
    ]
  }
];

const OFFICE = Object.keys(SKILL_CATALOG).filter((n) => n.startsWith("office-"));
const ABAPGIT = Object.keys(SKILL_CATALOG).filter((n) => n.startsWith("abapgit-"));

/**
 * Doküman üretim zinciri: gereksinimden FS, FS'ten TS, TS'ten inceleme.
 * `project-store` zincirin sonu — onaylanan dokümanı SharePoint'teki ortak
 * depoya koyuyor. Hiçbiri SAP'a dokunmuyor, o yüzden hepsi her rolde.
 *
 * Zincirde `fs-generator` ile `ts-generator` arasında bir üçüncü adım YOK; ikisi
 * doğrudan birbirine bağlanıyor. Marketplace'teki `fs2ts`, `ts-generator`'ın eski
 * adıdır (bkz. SKILL_CATALOG'daki not) ve buraya girmez.
 */
const DOCS = [
  "fs-generator",
  "ts-generator",
  "spec-reviewer",
  "meeting-notes-organizer",
  "project-store"
];

/**
 * Yetki taşıma (ECC → S/4) üç aşaması. İKİ ROLDE DE var ve bu bir cömertlik
 * değil bir olgu: PFCG rolü bir ADT nesnesi değil, bu üç skill'in hiçbiri bir
 * SAP sisteminde rol yaratamıyor. İlk ikisi AGR_, TSTC ve TOBJ tablolarını
 * OKUYOR, üçüncüsü yalnızca dosya üretiyor — insanın PFCG'de yapacağı işin
 * hazırlığı. Yetki analizi de zaten çoğunlukla modül tarafının işi.
 */
const AUTH = ["auth-discovery", "auth-gap-analysis", "auth-build"];

/**
 * Danışmanlık döngüsü: talep gelir (`sap-cr-scope`), yapılır, teslim edilir
 * (`sap-cr-handover`), sonra bir gün arızalanır (`sap-incident`). Mevcut kod
 * dokümante edilir (`as-built-doc`), test kapsamı sistemden çıkarılır
 * (`test-scenarios`), dönüşüm kapsamı dosyalardan hesaplanır
 * (`conversion-scope`), ekran görüntüsü alınır (`sapgui-screenshots`).
 * Hepsinden önce de keşif toplantısının soruları hazırlanır
 * (`fast-scan-question-generator`).
 *
 * Hepsi İKİ ROLDE DE var — çünkü bu adımlar rol değil, iş akışı. Bir modül
 * danışmanı da arıza bakar, bir teknik danışman da teslim dokümanı yazar.
 * Aralarında SAP'a yazan yok.
 */
const DANISMANLIK = [
  "fast-scan-question-generator",
  "sap-cr-scope",
  "sap-cr-handover",
  "sap-incident",
  "as-built-doc",
  "test-scenarios",
  "conversion-scope",
  "sapgui-screenshots"
];

/**
 * Role bakmadan HERKESE kurulan yetenekler (kullanıcı, 2026-09-08:
 * *"bunu da entegre et herkes kullanabilsin"*).
 *
 * `axet-flows` bir SAP yeteneği değil — aXet.flows akışlarını okuyor, doğruluyor
 * ve üretiyor. Rol ayrımı SAP'ta kim ne yapar sorusunu bölüyor; bu skill o
 * sorunun dışında kaldığı için iki listeye de giriyor. Ayrı bir sabit olarak
 * duruyor ki bir role eklenip diğerinde unutulması mümkün olmasın.
 *
 * `session-recovery` aynı gerekçeyle burada: bozuk bir aXet.code oturumunun
 * geçmişini onarıyor (tool_use / tool_result eşleşmesi kopunca oturum 400
 * dönüyor). Kimin başına geleceği role bağlı değil.
 */
const HERKES = ["axet-flows", "session-recovery"];

export const PROFILE_SKILLS: Record<SkillProfile, string[]> = {
  // Modül (fonksiyonel) danışmanı: sistemi okur, doküman üretir, kod yazmaz.
  // `library-match` burada — katalogda da modül danışmanına özel olarak
  // veriliyor: "bu zaten yapılmış mı?" sorusunu soracak tek rol bu.
  "module-consultant": [
    // Modül danışmanı SADECE sarmalayıcıyı görür. Bu, bir bayrak değil bir
    // yüzey: yazan 13 araç MCP kaydına hiç girmiyor, yani ajan bir push
    // planlayıp reddedilmiyor — böyle bir araç onun dünyasında yok.
    "sap-adt-readonly",
    "sap-adt-router-bridge",
    "sap-docs",
    "clean-core",
    "library-match",
    "screen-mockup",
    // Modül danışmanının kendi ürünleri: konsept tasarım/BBP dokümanı, son
    // kullanıcı kılavuzu, süreç madenciliği modeli. Üçü de iş tarafına bakıyor.
    "bbp-creator",
    "sap-enduser-doc",
    "celonis-ocpm-builder",
    ...AUTH,
    ...DANISMANLIK,
    ...DOCS,
    ...OFFICE,
    ...HERKES
  ],

  // Teknik danışman: geliştirme yapar. `library-match` yok (katalogda da
  // teknik danışmandan çıkarılmış), buna karşılık kod denetimi, ekran
  // üretimi ve abapGit var.
  "technical-consultant": [
    // Teknik danışman motorun TAMAMINI alır — 33 araç, push/activate/transport
    // dahil (kullanıcı, 2026-09-23: *"artık sap sistemlerindeki readonly modu
    // kaldırabiliriz dev sistemde geliştirme, deploy gibi işlemleri
    // yapabiliriz"*). Kapı kalkmadı, YER DEĞİŞTİRDİ: artık rolde değil
    // sistemde. `.conn_adt`'taki `ADT_SAP_TIER` DEV değilse motorun kendi
    // `require_writable()` kapısı her yazmayı reddediyor (guardrails.py,
    // `_WRITABLE_TIERS = {"DEV"}`), ve launcher tier'ı bilmediği sisteme QA
    // yazıyor — yani "işaretlenmemiş sistem" yazılabilir değil.
    "sap-adt",
    "sap-adt-router-bridge",
    "sap-docs",
    "clean-core",
    "abap-code-checker",
    // `abap-code-checker` tek bir nesneye bakıyor, bu NTT'nin kurumsal ABAP
    // standardının (abap_core v2.0) tamamına karşı denetim yapıyor. İkisi de
    // yalnızca okuyor; teknik tarafta çünkü denetlenen şey kod.
    "abap-code-review",
    "screen-mockup",
    "screen-gen",
    // SAP'ta nesne YARATAN ikisi burada, yalnızca burada: Adobe form/arayüzü
    // üreten `adobe-gen` ve kaynak sistemden okuyup hedefe yazan
    // `sap-object-transfer`. Modül danışmanı listesinde yoklar ve olmayacaklar
    // (kullanıcı, 2026-09-23: *"modül danışmanları asla geliştirme
    // yapamasınlar"*). `abapgit-deploy` de yazıyor ama adı `abapgit-` ile
    // başladığı için ABAPGIT grubundan zaten sadece bu role giriyor.
    "adobe-gen",
    "sap-object-transfer",
    // Teknik tarafın kendi işleri: ATC bulgularını toplu düzeltme, çıktı/form
    // tasarımı (XSLT, Smartform) ve SAP ekosistemi geliştirme paketleri.
    "atc-remediation",
    "designer-ai",
    "datasphere",
    "datasphere-skill-pack",
    "ui5-dev-pack",
    "cap-dev-pack",
    "basis-ops-pack",
    "automation-pilot-pack",
    ...AUTH,
    ...DANISMANLIK,
    ...ABAPGIT,
    ...DOCS,
    ...OFFICE,
    ...HERKES
  ],

  // Sandbox: kendi test sistemi. Her şey.
  sandbox: Object.keys(SKILL_CATALOG)
};

export const DEFAULT_PROFILE: SkillProfile = "module-consultant";

export function isSkillProfile(value: unknown): value is SkillProfile {
  return value === "module-consultant" || value === "technical-consultant" || value === "sandbox";
}

/**
 * Sistem yazılabilir mi? Tek cümlelik kural, iki yerde birden geçerli:
 * **yalnızca DEV**.
 *
 * `null` (kullanıcı sistemi henüz işaretlememiş) yazılabilir SAYILMAZ. Motorun
 * kendi varsayılanı bunun tersi — `guardrails.py` `.conn_adt`'ta `ADT_SAP_TIER`
 * yoksa DEV varsayıyor, yani "bilinmiyor" sessizce "yaz" demek oluyor.
 * Kullanıcı kararı (2026-09-23): bilinmeyen sisteme QA yazılıyor ve burada da
 * aynı yön tutuluyor, iki taraf aynı şeyi söylesin diye.
 */
function tierAllowsWrite(tier: SystemTier | null): boolean {
  return tier === "DEV";
}

/**
 * Bu rol, SAP'a YAZMA niyetli bir yetenek taşıyabilir mi?
 *
 * Sabit listeyle değil, rolün kendi listesinden TÜRETİLİYOR: rolün aldığı
 * skill'lerden en az biri `writeCapable` ise o rol yazma taşıyabiliyor demektir.
 * Böylece `PROFILE_SKILLS` değiştiğinde bu cevap kendiliğinden değişiyor;
 * ikinci bir "yazabilen roller" listesi tutulsaydı, ikisinin ayrışması an
 * meselesiydi ve ayrışma sessiz olurdu.
 *
 * NEREDE KULLANILIYOR: eşitlenmiş NTT kataloğu (`catalogSkills.ts`). Orası bu
 * uygulamanın paketinden bağımsız bir kaynak — modül danışmanı, rol kapısının
 * hiç bakmadığı o kapıdan `risk_tier >= 1` bir yeteneği projesine kurabiliyordu.
 * Kullanıcı kuralı (2026-09-23): *"modül danışmanı teknik danışmanın skillerini
 * kullanamaz kod falan yazıp deploy falan alamaz asla"* — kapı yalnızca kendi
 * kataloğumuzda değil, her katalogda geçerli.
 */
export function profileAllowsWriteCapable(profile: SkillProfile): boolean {
  const names = PROFILE_SKILLS[profile] ?? PROFILE_SKILLS[DEFAULT_PROFILE];
  return names.some((name) => Boolean(SKILL_CATALOG[name]?.writeCapable));
}

/**
 * Bir rol + sistem önem derecesi için hangi skill'lerin kurulacağını hesaplar.
 * Kurulum yapmaz — ekranda önizleme göstermek için de bu kullanılır, böylece
 * kullanıcının gördüğü liste ile diske yazılan liste aynı koddan çıkar.
 *
 * ADT motoru burada TAKAS ediliyor, engellenmiyor: yazma yüzeyi isteyen bir rol
 * DEV dışı bir sistemde `sap-adt-readonly`'ye düşer (17 araç). Engelleseydik
 * PRD'ye bağlanan bir teknik danışmanın elinde hiç ADT kalmazdı — yazamamak
 * okuyamamak demek değil. İkisi aynı anda kurulmuyor: aynı klasörde iki ADT
 * skill'i, ajana "hangi sunucu" diye cevabı olmayan bir soru sordurur.
 *
 * TAKAS TEK YÖNLÜ — yalnızca AŞAĞI. Rolün listesinde `sap-adt-readonly`
 * yazıyorsa orada kalır, sistem DEV olsa bile yükseltilmez. Bu tek satır,
 * modül danışmanının ADT yüzeyini tutan şey: liste iki yönlü eşleşseydi bir
 * modül danışmanı DEV'e bağlandığı anda 33 araçlık yazan motoru alırdı
 * (kullanıcı, 2026-09-23: *"modül danışmanları asla geliştirme
 * yapamasınlar"*). Rol yükseltmesi rolün listesinden geçer, tier'dan değil.
 *
 * YAZMA SKILL'LERİ TIER'A BAKILMADAN KURULUYOR (kullanıcı kararı, 2026-09-23:
 * *"dev olsada olmasada o skiller yüklensin ama sisteme yazılacağı deploy
 * edileceği kısımda dev tagı yada onayı istesin"* ve *"sadece dev sisteminde
 * yazma olarak açılsın diğer sistemlerde readonly modda açılsın"*). Eskiden
 * DEV dışında `screen-gen`, `adobe-gen`, `abapgit-*` hiç kurulmuyordu; ajan
 * QA'da bir ekranın nasıl üretildiğini bile anlatamıyordu. Artık kurulum rol
 * kapısından geçiyor, tier kapısı YAZMA ANINDA skill'in kendi kodunda:
 * `_tier_refusal` (screen-gen/adobe-gen), `tier_gate.py` (abapgit-deploy) ve
 * motorun `require_writable`'ı — hepsi `.conn_adt`'taki `ADT_SAP_TIER=DEV`'i
 * arıyor. Senkron o kapıları silerse `tests/tierWriteGates.test.ts` kırılır.
 *
 * ADT takası yine duruyor: yazan motor DEV dışında hiç başlatılmıyor, çünkü
 * onun 33 aracının her birine ayrı kapı koymak yerine sunucunun kendisini
 * değiştirmek tek hamlede kapatıyor.
 */
export function planSkills(profile: SkillProfile, tier: SystemTier | null): SkillPlanEntry[] {
  const source = PROFILE_SKILLS[profile] ?? PROFILE_SKILLS[DEFAULT_PROFILE];
  const names: string[] = [];
  for (const name of source) {
    const mapped = name === "sap-adt" && !tierAllowsWrite(tier) ? "sap-adt-readonly" : name;
    if (!names.includes(mapped)) names.push(mapped);
  }

  return names.map((name) => {
    const def = SKILL_CATALOG[name];
    const writeCapable = Boolean(def?.writeCapable);
    return { name, writeCapable, writeLocked: writeCapable && !tierAllowsWrite(tier) };
  });
}

/**
 * Bu yetenek axet-code'un GLOBAL klasörüne mi kurulur, sistem klasörüne mi?
 *
 * NEDEN BÖLÜNDÜ (kullanıcı, 2026-09-08: *"o kadar skill yükledik
 * kullanamıyorum"*): kurulum bugüne kadar yalnızca SAP sistem klasörlerine
 * yapılıyordu. Bir sisteme bağlanmadan açılan düz sohbet ise
 * `Documents\aXet Code Sessions` klasöründe çalışıyor (bkz. `store.ts`
 * `axetWorkspaceDir`) ve oraya hiçbir zaman yetenek kurulmuyordu — ajanın
 * dünyasında hiçbir skill yoktu. Ölçüldü: IED projesinde 26, PRD'de 21,
 * sohbet klasöründe 0.
 *
 * Hepsini global'e koymak kolay olurdu ama PRD kapısını işlevsiz bırakırdı:
 * `screen-gen` ve `abapgit-*` canlı sisteme bağlıyken de masada olurdu. O
 * yüzden bölünüyor:
 *
 *   - **global** — SAP'a yazmayan her şey. Rol seçilir seçilmez kurulur, her
 *     klasörde, sistem bağlamadan geçerli.
 *   - **project** — `writeCapable` olanlar. Sistem klasöründe kalır, çünkü
 *     yazma kapısı `.conn_adt`'taki tier'ı okuyor ve global'de "hangi sistem"
 *     diye bir şey yok (orada kapılar zaten her yazmayı reddederdi).
 *
 * Aynı yetenek iki yerde birden durmuyor: axet-code'un çakışmayı nasıl
 * çözdüğü bilinmiyor ve bunu denemeye girmenin bir sebebi yok.
 */
export function skillScope(name: string): "global" | "project" {
  const def = SKILL_CATALOG[name];
  if (def?.scope) return def.scope;
  return def?.writeCapable ? "project" : "global";
}

/**
 * Yetenek hangi kümede? (Kullanıcının modeli, 2026-09-08: *"kümeleme gibi
 * düşünebilirsin, kesiştiği noktada iki rolün de kullandığı skiller, sol küme
 * modül, sağ küme teknik"*.)
 *
 *   - `shared`    — kesişim: iki rolde de var
 *   - `module`    — yalnızca modül danışmanında
 *   - `technical` — yalnızca teknik danışmanda
 *   - `sandbox`   — hiçbirinde yok, sadece sandbox rolünde
 *
 * Ekranda bu üç kümeyi ayrı ayrı göstermek, "neden bu yetenek bende yok"
 * sorusunun cevabını listenin kendisine yazıyor.
 */
export type { SkillSet };

export function skillSet(name: string): SkillSet {
  const inModule = PROFILE_SKILLS["module-consultant"].includes(name);
  const inTechnical = PROFILE_SKILLS["technical-consultant"].includes(name);
  if (inModule && inTechnical) return "shared";
  if (inModule) return "module";
  if (inTechnical) return "technical";
  return "sandbox";
}

/**
 * Diskte duran ama ARTIK BU PROFİLE AİT OLMAYAN paket yetenekleri.
 *
 * NEDEN VAR (kullanıcı, 2026-09-08: *"iki danışmanda da aynı skiller yüklenir,
 * danışman değişince skiller değişmiyor"*): kurulum bugüne kadar yalnızca
 * profilin İSTEDİĞİ adlar üzerinde dönüyordu. Teknik danışmanla kurup modül
 * danışmanına geçince `abap-code-checker`, `screen-gen` ve `abapgit-*` diskte
 * kalıyor, üstüne `library-match` ekleniyordu — yani rol değiştirmek yetenek
 * SETİNİ değiştirmiyor, sadece BÜYÜTÜYORDU. İki rolün farkı, bir kere ikisini
 * de denemiş bir projede tamamen kayboluyor.
 *
 * Bu, kozmetik bir hata değil: kurulan bir skill'i ajan okuyor. "Kod yazmaz"
 * diye seçilen modül danışmanının elinde ekran üreten bir skill duruyordu.
 *
 * ÜÇ KAPI, üçü de yanlış klasörü silmemek için:
 *   1. Yalnızca `SKILL_CATALOG`'da adı geçenler — yani BİZİM paketimizden
 *      çıkanlar. `.axet-code/skills` altındaki her klasör bizden gelmiyor;
 *      kullanıcının elle koyduğu bir skill bizim işimiz değil.
 *   2. Yalnızca yeni planda OLMAYANLAR.
 *   3. Katalogdan kurulmuş kayıtlar hariç. Katalog, paketle aynı adı taşıyan
 *      girdileri zaten `bundled` diye engelliyor (bkz. catalogSkills.ts), yani
 *      bu kesişim normalde boş — ama kayıt dosyası "bu klasörü BİZ kurduk"
 *      demenin tek yolu ve silme kararı ona rağmen verilmemeli.
 */
export function orphanedProfileSkills(
  installedDirs: readonly string[],
  plannedNames: readonly string[],
  catalogNames: readonly string[] = []
): string[] {
  const planned = new Set(plannedNames);
  const fromCatalog = new Set(catalogNames);
  return installedDirs.filter(
    (name) => Boolean(SKILL_CATALOG[name]) && !planned.has(name) && !fromCatalog.has(name)
  );
}
