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
// Kural: PRD işaretli bir sisteme yazma yetenekli skill KURULMAZ. SAP API
// Politikası (Mayıs 2026) ADT dahili API'leri üzerinden ajanla üretim verisine
// dokunmaya izin vermiyor; kapıyı skill kurulumunda tutuyoruz çünkü kurulan bir
// skill'i ajan er ya da geç okuyor.
//
// Tablo elle türetildi: uygulamanın katalog deposuna çalışma zamanında hiçbir
// bağımlılığı yok, olmamalı da.

import type { SkillPlanEntry, SkillProfile, SystemTier } from "../shared/types";

export type { SkillProfile };

export interface SkillDef {
  /** `resources/sap-toolkit` altındaki göreli yol. */
  path: string;
  /** SAP'a yazma niyeti taşıyor mu? PRD'de kurulmaz. */
  writeCapable?: boolean;
  /**
   * Proje kopyasına ALINMAYACAK alt klasörler. `sap-adt-readonly` için
   * `scripts/` böyle: içinde 1400 satırlık tam yetkili ADT motoru var, skill'in
   * kendisi ise zaten "script'leri asla çalıştırma, HTTP sunucusuna konuş"
   * diyor. Motor `resources/` altında kalır, launcher oradan başlatır.
   */
  excludeDirs?: string[];
}

export const SKILL_CATALOG: Record<string, SkillDef> = {
  // --- SAP: inceleme ve tasarım -------------------------------------------
  "sap-adt-readonly": { path: "sap-consultant/skills/sap-adt-readonly", excludeDirs: ["scripts"] },
  "clean-core": { path: "sap-consultant/skills/clean-core" },
  "sap-docs": { path: "sap-consultant/skills/sap-docs" },
  "library-match": { path: "sap-consultant/skills/library-match" },
  "abap-code-checker": { path: "sap-consultant/skills/abap-code-checker" },
  "screen-mockup": { path: "sap-consultant/skills/screen-mockup" },

  // --- SAP: yazma yetenekli ------------------------------------------------
  "screen-gen": { path: "sap-consultant/skills/screen-gen", writeCapable: true },

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

  // --- SAP GUI ekran yakalama ----------------------------------------------
  // ADT'ye değil, çalışan SAP GUI penceresine bakıyor: PrintWindow ile ekran
  // görüntüsü alıp kullanım kılavuzu üretiyor. Tuş basabildiği için SKILL.md'ye
  // "PRD'de yalnızca görüntüleme işlemleri" uyarısı eklendi; `writeCapable`
  // DEĞİL çünkü o bayrak ADT üzerinden SAP nesnesi yazmayı işaretliyor ve
  // PRD kapısının koruduğu şey o.
  "sapgui-screenshots": { path: "sapgui-scriptter/skills/sapgui-screenshots" },

  // --- Doküman üretimi -----------------------------------------------------
  "fs-generator": { path: "sap-consultant/skills/fs-generator" },
  "sap-enduser-doc": { path: "sap-consultant/skills/sap-enduser-doc" },
  "ts-generator": { path: "sap-consultant/skills/ts-generator" },
  "spec-reviewer": { path: "sap-consultant/skills/spec-reviewer" },
  "meeting-notes-organizer": { path: "sap-consultant/skills/meeting-notes-organizer" },

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
  /** `resources/sap-toolkit` altındaki kaynak klasör. */
  path: string;
  /** `<proje>/.axet-code/` altındaki hedef klasör adı. */
  dest: string;
  /** Klasörün bizden geldiğini gösteren dosya. */
  marker: string;
  /** Bu klasöre ihtiyaç duyan skill'ler — hiçbiri kurulmadıysa kopyalanmaz. */
  requiredBy: string[];
}

export const SHARED_ASSETS: SharedAsset[] = [
  {
    path: "office-tools/lib",
    dest: "lib",
    marker: "redact.py",
    requiredBy: ["office-docx", "office-pdf", "office-pptx", "office-manual"]
  },
  {
    // case.py (vaka kaydı), quality.py (kalite tahtası), summary_check.py.
    path: "sap-consultant/scripts",
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

const DOCS = ["fs-generator", "ts-generator", "spec-reviewer", "meeting-notes-organizer"];

/**
 * Danışmanlık döngüsü: talep gelir (`sap-cr-scope`), yapılır, teslim edilir
 * (`sap-cr-handover`), sonra bir gün arızalanır (`sap-incident`). Mevcut kod
 * dokümante edilir (`as-built-doc`), test kapsamı sistemden çıkarılır
 * (`test-scenarios`), dönüşüm kapsamı dosyalardan hesaplanır
 * (`conversion-scope`), ekran görüntüsü alınır (`sapgui-screenshots`).
 *
 * Hepsi İKİ ROLDE DE var — çünkü bu adımlar rol değil, iş akışı. Bir modül
 * danışmanı da arıza bakar, bir teknik danışman da teslim dokümanı yazar.
 * Aralarında SAP'a yazan yok.
 */
const DANISMANLIK = [
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
 */
const HERKES = ["axet-flows"];

export const PROFILE_SKILLS: Record<SkillProfile, string[]> = {
  // Modül (fonksiyonel) danışmanı: sistemi okur, doküman üretir, kod yazmaz.
  // `library-match` burada — katalogda da modül danışmanına özel olarak
  // veriliyor: "bu zaten yapılmış mı?" sorusunu soracak tek rol bu.
  "module-consultant": [
    "sap-adt-readonly",
    "sap-docs",
    "clean-core",
    "library-match",
    "screen-mockup",
    // Modül danışmanının kendi ürünleri: konsept tasarım/BBP dokümanı, son
    // kullanıcı kılavuzu, süreç madenciliği modeli. Üçü de iş tarafına bakıyor.
    "bbp-creator",
    "sap-enduser-doc",
    "celonis-ocpm-builder",
    ...DANISMANLIK,
    ...DOCS,
    ...OFFICE,
    ...HERKES
  ],

  // Teknik danışman: geliştirme yapar. `library-match` yok (katalogda da
  // teknik danışmandan çıkarılmış), buna karşılık kod denetimi, ekran
  // üretimi ve abapGit var.
  "technical-consultant": [
    "sap-adt-readonly",
    "sap-docs",
    "clean-core",
    "abap-code-checker",
    "screen-mockup",
    "screen-gen",
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
 * Bir rol + sistem önem derecesi için hangi skill'lerin kurulacağını hesaplar.
 * Kurulum yapmaz — ekranda önizleme göstermek için de bu kullanılır, böylece
 * kullanıcının gördüğü liste ile diske yazılan liste aynı koddan çıkar.
 */
export function planSkills(profile: SkillProfile, tier: SystemTier | null): SkillPlanEntry[] {
  const names = PROFILE_SKILLS[profile] ?? PROFILE_SKILLS[DEFAULT_PROFILE];
  return names.map((name) => {
    const def = SKILL_CATALOG[name];
    const writeCapable = Boolean(def?.writeCapable);
    return { name, writeCapable, blockedByTier: writeCapable && tier === "PRD" };
  });
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
