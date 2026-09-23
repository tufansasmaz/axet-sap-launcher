import { app } from "electron";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { enforceTierOnCatalog, readCatalogRecord } from "./catalogSkills";
import {
  DEFAULT_PROFILE,
  PROFILE_SKILLS,
  SHARED_ASSETS,
  SKILL_CATALOG,
  orphanedProfileSkills,
  planSkills,
  skillScope,
  skillSet,
  type SkillProfile,
  type SkillSet
} from "./skillProfiles";
import type { GlobalSkillRow, InstalledSkillInfo, SkillVersionStamp, SystemTier, ToolkitVersion } from "../shared/types";

export function getToolkitRoot(): string | null {
  const candidate = app.isPackaged
    ? path.join(process.resourcesPath, "sap-toolkit")
    : path.join(app.getAppPath(), "resources", "sap-toolkit");
  return existsSync(candidate) ? candidate : null;
}

/** `resources/sap-toolkit/toolkit-version.json` — yoksa null. */
export function readToolkitVersion(): ToolkitVersion | null {
  const root = getToolkitRoot();
  if (!root) return null;
  try {
    const raw = readFileSync(path.join(root, "toolkit-version.json"), "utf8");
    const parsed = JSON.parse(raw) as ToolkitVersion;
    return typeof parsed?.version === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Projeye en son hangi sürümün kurulduğu (`.axet-code/skills/.version`). */
export function readSkillVersionStamp(projectDir: string): SkillVersionStamp | null {
  try {
    const raw = readFileSync(
      path.join(projectDir, ".axet-code", "skills", ".version"),
      "utf8"
    );
    const parsed = JSON.parse(raw) as SkillVersionStamp;
    return typeof parsed?.version === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Projedeki kurulum tazelenmeli mi?
 *
 * İki sebep var ve ikisi de "güncelle" düğmesini yakmalı: paket yeni bir
 * toolkit sürümü getirmiş olabilir, ya da kullanıcı rolünü değiştirmiş
 * olabilir. İkincisi ilk yazımda atlanmıştı — rol değişince diskteki liste
 * eskisi kalıyor ve hiçbir yerde bunu söyleyen bir işaret olmuyordu.
 */
export function isSkillUpdateAvailable(projectDir: string, profile?: SkillProfile | null): boolean {
  const toolkit = readToolkitVersion();
  if (!toolkit) return false;
  const stamp = readSkillVersionStamp(projectDir);
  if (!stamp) return true;
  if (stamp.version !== toolkit.version) return true;
  return Boolean(profile) && stamp.profile !== profile;
}

export interface SkillInstallResult {
  installed: string[];
  skipped: string[];
  /** Rol değiştiği için KALDIRILAN paket yetenekleri. */
  removed: string[];
  /**
   * Kapı yüzünden kaldırılan KATALOG yetenekleri (PRD ya da rol). Paket
   * yetenekleri artık buraya düşmüyor: tier'a bakmadan kuruluyorlar.
   */
  blockedByTier: string[];
  /**
   * Bu rol + bu sistem için YAZAN ADT motoru mu açılacak (`sap-adt`, 33 araç),
   * yoksa sarmalayıcı mı (`sap-adt-readonly`, 17 araç)?
   *
   * Sunucuyu launcher başlatıyor ve gerçek yüzey O. Skill listesi ajana neyin
   * var olduğunu ANLATIYOR, ama 8787'de ne dinlediğini belirlemiyor — ikisi
   * ayrı hesaplansaydı bir modül danışmanı DEV'e bağlandığında listesinde
   * `sap-adt-readonly` yazarken portta `adt_push` servis edilirdi. O yüzden
   * karar burada, planın kendisinden çıkıyor ve launcher onu okuyor.
   */
  adtWriteSurface: boolean;
  /**
   * Global kurulum sağlam mı? `false` ise SAP'a yazmayan yetenekler de bu
   * projeye kuruldu (yedek davranış, bkz. `installSkillsIntoProject`).
   */
  globalReady: boolean;
  toolkitRoot: string | null;
  profile: SkillProfile;
  tier: SystemTier | null;
  version: string | null;
}

export interface SkillInstallOptions {
  profile?: SkillProfile;
  tier?: SystemTier | null;
}

export function installSkillsIntoProject(
  projectDir: string,
  options: SkillInstallOptions = {}
): SkillInstallResult {
  const toolkitRoot = getToolkitRoot();
  const profile: SkillProfile = options.profile ?? DEFAULT_PROFILE;
  const tier = options.tier ?? null;
  const toolkitVersion = readToolkitVersion();

  const result: SkillInstallResult = {
    installed: [],
    skipped: [],
    removed: [],
    blockedByTier: [],
    adtWriteSurface: false,
    globalReady: false,
    toolkitRoot,
    profile,
    tier,
    version: toolkitVersion?.version ?? null
  };
  if (!toolkitRoot) return result;

  const destRoot = path.join(projectDir, ".axet-code", "skills");
  mkdirSync(destRoot, { recursive: true });

  // SAP'a YAZMAYAN yetenekler artık global klasöre kuruluyor (bkz.
  // `skillScope`), buraya yalnızca `writeCapable` olanlar iniyor — PRD kapısı
  // sistem başına verildiği için onların yeri burası.
  //
  // Ama global kurulum sağlam değilse (ilk açılış, silinmiş klasör, yazma
  // izni yok) HEPSİ buraya kuruluyor: eski davranış. Yarım kalmış bir global
  // kurulum yüzünden kullanıcıyı yeteneksiz bırakmak, iki yerde birden
  // durmasından çok daha kötü bir sonuç.
  const globalReady = isGlobalInstallHealthy(profile);
  const fullPlan = planSkills(profile, tier);
  // Süzgeçten ÖNCEKİ plandan okunuyor: yüzey kararı rol + tier'ın kararı,
  // global kurulumun sağlığının ona söyleyecek bir sözü yok.
  result.adtWriteSurface = fullPlan.some((entry) => entry.name === "sap-adt");
  const plan = fullPlan.filter((entry) => !globalReady || skillScope(entry.name) === "project");
  result.globalReady = globalReady;

  // ÖNCE TEMİZLİK, sonra kurulum. Rol değişince eski rolün yetenekleri diskte
  // kalıyordu ve iki rol birbirinin üstüne birikiyordu (bkz.
  // orphanedProfileSkills). Kurulumdan ÖNCE yapılıyor ki yarıda kalan bir
  // kurulum bile en azından yanlış olanları kaldırmış olsun.
  for (const name of orphanedProfileSkills(
    listSkillDirs(destRoot),
    plan.map((entry) => entry.name),
    readCatalogRecord(projectDir).map((record) => record.name)
  )) {
    try {
      rmSync(path.join(destRoot, name), { recursive: true, force: true });
      result.removed.push(name);
    } catch {
      /* silinemeyen klasör kurulumu geçersiz kılmıyor; damgada görünür */
    }
  }

  for (const entry of plan) {
    const dest = path.join(destRoot, entry.name);

    // Tier yüzünden kurmama YOK (kullanıcı kararı, 2026-09-23): yazma skill'i
    // her sistemde kurulur, DEV dışında yazmayı kendi kodu reddeder. Bkz.
    // `planSkills`. Kurulumu süzen tek şey rol — o da `plan`ın içinde.
    if (copySkill(toolkitRoot, entry.name, dest)) result.installed.push(entry.name);
    else result.skipped.push(entry.name);
  }

  installSharedAssets(toolkitRoot, path.join(projectDir, ".axet-code"), result.installed);

  // Katalogdan kurulmuş yazma yetenekleri PRD'de HÂLÂ kaldırılıyor. Paket
  // yeteneklerinden farkı: onların yazma anındaki DEV kapısını biz yazdık ve
  // bir test koruyor; katalog yeteneği ise üçüncü kişinin kodu, içinde kapı
  // olduğunu bilemeyiz. Kapısı bilinmeyen bir yazıcı için kurulum kapısı tek
  // güvence.
  //
  // `profile` de veriliyor: modül danışmanı için bu temizlik SİSTEMDEN bağımsız
  // çalışıyor, çünkü rol kapısının DEV'i de QA'si de yok. Rol kapısı katalog
  // tarafına 2026-09-23'te eklendi; o tarihten önce kurulmuş yazma niyetli bir
  // katalog yeteneği hâlâ diskte duruyor olabilir ve ajan diskte duranı okur.
  result.blockedByTier.push(...enforceTierOnCatalog(projectDir, tier, profile));

  // Sürüm damgası. Bunsuz "bu projedeki skill'ler güncel mi?" sorusunun cevabı
  // yok — bugüne kadar da yoktu.
  if (toolkitVersion) {
    const stamp: SkillVersionStamp = {
      version: toolkitVersion.version,
      installed: new Date().toISOString(),
      profile,
      tier,
      skills: result.installed
    };
    try {
      writeFileSync(path.join(destRoot, ".version"), JSON.stringify(stamp, null, 2), "utf8");
    } catch {
      /* damga yazılamadıysa kurulum yine de geçerli */
    }
  }

  return result;
}

/**
 * axet-code'un global veri dizini: `%LOCALAPPDATA%\axet-code`.
 *
 * Bu makinede canlı doğrulandı — `axet-code.exe` içinde `.axet-code/skills/`
 * dizesi geçiyor (proje kapsamı) ve global kapsam bu klasörün altında
 * duruyor: `auth.enc`, `connector_state.json`, `projects.json` ile aynı yerde.
 * `axetModels.ts` de aynı kökü aynı gerekçeyle hesaplıyor.
 */
export function getGlobalAxetRoot(): string {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(base, "axet-code");
}

/**
 * Global listede GÖRÜNEBİLECEK yetenekler: rolün kendi listesi, SAP'a
 * yazmayanlarla sınırlı.
 *
 * Kullanıcı kararı (2026-09-08): *"rolüne göre olan skiller ayrı olucak ve o
 * rol dışındaki skiller aktif edilemeyecek orda"*. Yani bu liste rolün
 * DIŞINA çıkmaz — ekrandaki anahtarlar rolün verdiğini kapatabilir, rolün
 * vermediğini açamaz. Rolün kalıcı olmasının anlamı da bu.
 */
export function globalSkillCandidates(profile: SkillProfile): string[] {
  const names = PROFILE_SKILLS[profile] ?? PROFILE_SKILLS[DEFAULT_PROFILE];
  return names.filter((name) => skillScope(name) === "global");
}

export interface GlobalSkillState {
  name: string;
  /** Kullanıcı kapatmadıysa açık — varsayılan rolün verdiği liste. */
  enabled: boolean;
}

/** Rolün global yetenekleri + kullanıcının elle kapattıkları. */
export function planGlobalSkills(
  profile: SkillProfile,
  overrides: Record<string, boolean> = {}
): GlobalSkillState[] {
  return globalSkillCandidates(profile).map((name) => ({
    name,
    enabled: overrides[name] !== false
  }));
}

const SET_ORDER: Record<SkillSet, number> = { shared: 0, module: 1, technical: 2, sandbox: 3 };

/**
 * Global yetenek yönetim ekranının satırları: kataloğun SAP'a yazmayan her
 * yeteneği, kümesiyle birlikte.
 *
 * Rol dışındakiler de LİSTELENİYOR ama açılamıyor. Gizlemek yerine göstermek
 * bilinçli: kullanıcı "modül danışmanıyken teknik yetenekler neden bende yok"
 * sorusunu listeye bakarak cevaplıyor. Rol kalıcı olduğu için bu bilgi
 * bir daha hiçbir yerde karşısına çıkmıyor.
 */
export function listGlobalSkills(
  profile: SkillProfile,
  overrides: Record<string, boolean> = {}
): GlobalSkillRow[] {
  const destRoot = path.join(getGlobalAxetRoot(), "skills");
  const inRole = new Set(globalSkillCandidates(profile));
  return Object.keys(SKILL_CATALOG)
    .filter((name) => skillScope(name) === "global")
    .map((name) => ({
      name,
      set: skillSet(name),
      inRole: inRole.has(name),
      enabled: inRole.has(name) && overrides[name] !== false,
      installed: existsSync(path.join(destRoot, name, "SKILL.md"))
    }))
    .sort((a, b) => SET_ORDER[a.set] - SET_ORDER[b.set] || a.name.localeCompare(b.name, "tr"));
}

export interface GlobalSkillInstallResult {
  installed: string[];
  removed: string[];
  skipped: string[];
  root: string;
  profile: SkillProfile;
  version: string | null;
}

/**
 * Rolün SAP'a yazmayan yeteneklerini axet-code'un GLOBAL klasörüne kurar.
 *
 * Buradan sonra ajan hangi klasörde açılırsa açılsın — bir SAP sistemine
 * bağlanmadan açılan düz sohbette bile — bu yetenekler elinde oluyor. Bugüne
 * kadarki asıl arıza buydu: kurulum yalnızca sistem klasörlerine yapılıyordu,
 * `Documents\aXet Code Sessions` bomboş kalıyordu.
 *
 * Kapalı yetenekler yalnızca SİLİNMEZ, aktif olarak kaldırılır: kullanıcı
 * anahtarı kapattığında diskte duran bir skill'i ajan yine okur.
 */
export function installGlobalSkills(
  profile: SkillProfile,
  overrides: Record<string, boolean> = {}
): GlobalSkillInstallResult {
  const toolkitRoot = getToolkitRoot();
  const root = getGlobalAxetRoot();
  const toolkitVersion = readToolkitVersion();
  const result: GlobalSkillInstallResult = {
    installed: [],
    removed: [],
    skipped: [],
    root,
    profile,
    version: toolkitVersion?.version ?? null
  };
  if (!toolkitRoot) return result;

  const destRoot = path.join(root, "skills");
  try {
    mkdirSync(destRoot, { recursive: true });
  } catch {
    return result; // yazamıyorsak proje kurulumu yedeğe düşer
  }

  const plan = planGlobalSkills(profile, overrides);
  const wanted = plan.filter((entry) => entry.enabled).map((entry) => entry.name);

  // Temizlik önce: rol değişmiş, kullanıcı kapatmış ya da paketten çıkmış
  // olabilir. `orphanedProfileSkills` yalnızca KATALOGDA adı geçen klasörleri
  // siliyor — kullanıcının elle koyduğu bir skill bizim işimiz değil.
  for (const name of orphanedProfileSkills(listSkillDirs(destRoot), wanted)) {
    try {
      rmSync(path.join(destRoot, name), { recursive: true, force: true });
      result.removed.push(name);
    } catch {
      /* silinemeyen klasör kurulumu geçersiz kılmıyor */
    }
  }

  for (const name of wanted) {
    if (copySkill(toolkitRoot, name, path.join(destRoot, name))) result.installed.push(name);
    else result.skipped.push(name);
  }

  installSharedAssets(toolkitRoot, root, result.installed);

  if (toolkitVersion) {
    const stamp: SkillVersionStamp = {
      version: toolkitVersion.version,
      installed: new Date().toISOString(),
      profile,
      tier: null,
      skills: result.installed
    };
    try {
      writeFileSync(path.join(destRoot, ".version"), JSON.stringify(stamp, null, 2), "utf8");
    } catch {
      /* damga yazılamadıysa kurulum yine de geçerli */
    }
  }

  return result;
}

/**
 * Global kurulum güncel ve yerinde mi?
 *
 * Proje kurulumu buna bakarak SAP'a yazmayan yetenekleri atlıyor. Damgaya
 * GÜVENMEK yetmez: klasör elle silinmiş olabilir, bu yüzden damgadaki her ad
 * için klasör de kontrol ediliyor. Tek bir eksik varsa "sağlam değil" denip
 * proje kurulumu eski davranışa dönüyor — kullanıcıyı yeteneksiz bırakmaktansa
 * fazladan kopya.
 */
export function isGlobalInstallHealthy(profile: SkillProfile): boolean {
  const toolkit = readToolkitVersion();
  if (!toolkit) return false;
  const destRoot = path.join(getGlobalAxetRoot(), "skills");
  let stamp: SkillVersionStamp | null = null;
  try {
    stamp = JSON.parse(readFileSync(path.join(destRoot, ".version"), "utf8")) as SkillVersionStamp;
  } catch {
    return false;
  }
  if (stamp?.version !== toolkit.version || stamp.profile !== profile) return false;
  const names = stamp.skills ?? [];
  if (names.length === 0) return false;
  if (!names.every((name) => existsSync(path.join(destRoot, name, "SKILL.md")))) return false;

  // Paylaşılan klasörler de kurulumun parçası ve aynı elle-silinme riskini
  // taşıyor. Damga bunları saymıyor, o yüzden ihtiyaç duyulanlar kaynaktan
  // türetiliyor: kurulu skill'lerden biri bir asset'i istiyorsa marker'ı
  // yerinde olmalı. Yoksa `redact.py` bulunamıyor ve maskeleme SESSİZCE
  // kapanıyor — tam da bu kontrolün var olma sebebi.
  const root = path.dirname(destRoot);
  return SHARED_ASSETS.every(
    (asset) =>
      !asset.requiredBy.some((name) => names.includes(name)) ||
      existsSync(path.join(root, asset.dest, asset.marker))
  );
}

/**
 * Tek bir skill'i pakete göre hedef klasöre kopyalar. Başarılıysa `true`.
 *
 * `excludeDirs` burada uygulanıyor — ADT üçlüsünün (`sap-adt`,
 * `sap-adt-readonly`, `sap-adt-router-bridge`) `scripts/` klasörleri ajanın
 * çalışma ağacına bu filtre sayesinde düşmüyor. Motor her zaman
 * `resources/sap-toolkit` içinden, üçü yan yanayken çalıştırılıyor:
 * sarmalayıcı motoru `../../sap-adt/scripts` diye arıyor, kopyalanan bir
 * `scripts/` o komşuyu bulamaz ve sessizce başlamaz.
 */
function copySkill(toolkitRoot: string, name: string, dest: string): boolean {
  const def = SKILL_CATALOG[name];
  if (!def) return false;
  const src = path.join(toolkitRoot, ...def.path.split("/"));
  if (!existsSync(path.join(src, "SKILL.md"))) return false;

  const exclude = new Set(def.excludeDirs ?? []);
  try {
    // Eski kurulumdan kalan dosya bırakmamak için önce temizle: `force: true`
    // üzerine yazar ama silinen bir dosyayı kaldırmaz, kaldırdığımız
    // `scripts/` klasörü de tam olarak öyle bir şey.
    rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, {
      recursive: true,
      force: true,
      filter: (from) => {
        const rel = path.relative(src, from);
        if (!rel) return true;
        const top = rel.split(path.sep)[0];
        if (exclude.has(top)) return false;
        return !rel.split(path.sep).includes("__pycache__");
      }
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Skill klasörünün DIŞINDA duran paylaşılan dosyalar (bkz. `SHARED_ASSETS`).
 *
 * Kendilerine ihtiyaç duyan bir skill kurulduysa kopyalanır, kurulmadıysa —
 * rol değişmiş ya da PRD kapısı kapatmış olabilir — bizim bıraktığımız kopya
 * kaldırılır. Silme kararı `marker` dosyasına bakıyor: `.axet-code/lib` ya da
 * `.axet-code/scripts` kullanıcının kendi koyduğu bir klasör de olabilir ve o
 * bizim işimiz değil.
 *
 * `root`, `skills/` klasörünün BABASI — projede `<proje>/.axet-code`, global
 * kurulumda `%LOCALAPPDATA%\axet-code`. Script'ler bu klasöre `../../../lib`
 * diye ulaştığı için iki düzende de aynı derinlikte durmak zorunda.
 */
function installSharedAssets(toolkitRoot: string, root: string, installed: string[]): void {
  for (const asset of SHARED_ASSETS) {
    const dest = path.join(root, asset.dest);
    const ours = existsSync(path.join(dest, asset.marker));
    if (!asset.requiredBy.some((name) => installed.includes(name))) {
      if (ours) rmSync(dest, { recursive: true, force: true });
      continue;
    }
    // Temizlik döngünün DIŞINDA, bir kez: `paths` birden çok kaynağı aynı
    // hedefte birleştiriyor (bkz. `SharedAsset.paths`) ve her kaynaktan önce
    // silmek, bir öncekinin dosyalarını götürürdü. Taşınabilir bir hata değil —
    // sonuç yine sessiz olurdu: klasör var, içindekilerin yarısı yok.
    let cleaned = !ours;
    for (const rel of asset.paths) {
      const src = path.join(toolkitRoot, ...rel.split("/"));
      if (!existsSync(src)) continue;
      try {
        if (!cleaned) {
          rmSync(dest, { recursive: true, force: true });
          cleaned = true;
        }
        cpSync(src, dest, {
          recursive: true,
          force: true,
          filter: (from) => !path.relative(src, from).split(path.sep).includes("__pycache__")
        });
      } catch {
        /* kopyalanamadıysa skill'ler yine kurulu; script çalıştığında söyler */
      }
    }
  }
}

/** `<kök>` altındaki skill klasörleri — okunamıyorsa boş, çünkü boş liste hiçbir
 *  şey SİLDİRMEZ (bkz. orphanedProfileSkills'in çağrıldığı yer). */
function listSkillDirs(destRoot: string): string[] {
  try {
    return readdirSync(destRoot, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name);
  } catch {
    return [];
  }
}

export function listInstalledSkills(projectDir: string): InstalledSkillInfo[] {
  const destRoot = path.join(projectDir, ".axet-code", "skills");
  if (!existsSync(destRoot)) return [];
  try {
    return readdirSync(destRoot)
      .filter((entry) => {
        const full = path.join(destRoot, entry);
        try {
          return statSync(full).isDirectory() && existsSync(path.join(full, "SKILL.md"));
        } catch {
          return false;
        }
      })
      .sort()
      .map((name) => ({
        name,
        writeCapable: Boolean(SKILL_CATALOG[name]?.writeCapable),
        unknown: !SKILL_CATALOG[name]
      }));
  } catch {
    return [];
  }
}

export function countInstalledSkills(projectDir: string): number {
  return listInstalledSkills(projectDir).length;
}
