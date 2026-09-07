// ---------------------------------------------------------------------------
// Eşitlenmiş NTT kataloğundan yetenek kurma
// ---------------------------------------------------------------------------
// Uygulama bugüne kadar yalnızca KENDİ paketiyle gelen skill'leri kurabiliyordu
// (`resources/sap-toolkit`, bkz. sapToolkit.ts). Kataloğun kendisi ise çoğu
// makinede zaten diskte: SharePoint kitaplığı OneDrive'a eşitleniyor ve
// `catalogFolder.ts` onu `catalog.json` işaretinden buluyor. Yani "katalogda
// var ama uygulamada yok" durumu, bir indirme sorunu değil, sadece kurulum
// yolunun olmamasıydı.
//
// NE KURULMUYOR, NEDEN:
//
//   - `plugin_root_required` / `cross_plugin_deps` taşıyan girdiler. Bunlar
//     eklentinin KÖKÜNDEKİ kitaplıklara ya da kardeş eklentilere dayanıyor;
//     bizim hedefimiz `<proje>/.axet-code/skills/<ad>` ve orada eklenti kökü
//     diye bir şey yok. Kopyalamak, çalışmayacak bir skill'i çalışıyormuş gibi
//     göstermek olurdu — o yüzden sebebi ekranda yazılı olarak reddediliyor.
//   - Uygulamanın kendi paketinde AYNI ADLA gelen skill'ler. Rol profili
//     kurulumu (`installSkillsIntoProject`) o klasörü siliyor ve paketten
//     yeniden yazıyor; katalog kopyası bir sonraki bağlanmada sessizce geri
//     alınırdı.
//   - `os` listesi Windows içermeyenler ve diskte gerçekten bulunmayan yollar.
//
// RİSK SEVİYESİ: katalogda tier 0 "yalnızca dosyalara dokunur" demek, tier >= 3
// müşteri-üretim kapısı. Bu uygulamadaki karşılığı `writeCapable` ve kural
// aynı: PRD işaretli bir sisteme bağlanılınca yazma niyetli skill projede
// DURMAZ. Katalogdan kurulanlar da bu kapıya tabi (`enforceTierOnCatalog`),
// aksi hâlde profil kurulumunun temizlediği kapıdan katalog kopyası sızardı.
// Sınır tier >= 1'de: "yalnızca dosya" olmayan her şey.
//
// Kayıt dosyası (`.axet-code/skills/.catalog.json`) iki iş yapıyor: hangi
// klasörün BİZİM kurduğumuz olduğunu bilmek (yabancı bir klasörü asla
// silmiyoruz) ve katalog klasörü o an erişilemese bile PRD kapısını
// uygulayabilmek.
// ---------------------------------------------------------------------------

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { findCatalogFolders } from "./catalogFolder";
import { SKILL_CATALOG } from "./skillProfiles";
import type {
  CatalogInstallOutcome,
  CatalogSkill,
  CatalogSkillList,
  CatalogSkillRecord,
  SystemTier
} from "../shared/types";

/** Tier 0 = "yalnızca dosyalara dokunur". Üstü yazma niyeti sayılıyor. */
const WRITE_TIER = 1;

const RECORD_FILE = ".catalog.json";

function skillsRoot(projectDir: string): string {
  return path.join(projectDir, ".axet-code", "skills");
}

/**
 * Katalogdaki göreli yol güvenli mi?
 *
 * `catalog.json` eşitlenmiş bir paylaşımdan geliyor; içeriğini biz üretmiyoruz.
 * Mutlak bir yol ya da `..` içeren bir girdi, kopyalamayı proje klasörünün
 * dışına taşırdı.
 */
export function isSafeRelPath(rel: string): boolean {
  if (!rel || path.isAbsolute(rel)) return false;
  if (/^[a-zA-Z]:/.test(rel)) return false;
  return !rel
    .split(/[\\/]/)
    .some((part) => part === ".." || part === "");
}

/** Katalog girdisinin diskteki klasör adı — yolun son parçası. */
function skillName(entry: Record<string, unknown>): string {
  const id = typeof entry.id === "string" ? entry.id : "";
  const fromId = id.includes("/") ? id.slice(id.lastIndexOf("/") + 1) : id;
  if (fromId) return fromId;
  const rel = typeof entry.path === "string" ? entry.path : "";
  const parts = rel.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

export interface CatalogSkillContext {
  /** `<proje>/.axet-code/skills` altında klasörü olan adlar. */
  installed: readonly string[];
  /** Bizim kurduğumuz (kayıt dosyasındaki) adlar. */
  recorded: readonly string[];
  /** Katalog klasörüne göreli bir yol diskte var mı. */
  hasPath: (rel: string) => boolean;
  /** `windows` | `macos` | `linux` */
  os: string;
}

/**
 * `catalog.json` metnini kurulabilir yetenek listesine çevirir.
 *
 * Diskten AYRI duruyor ki test edilebilsin: bu makinede eşitlenmiş bir katalog
 * klasörü yok (2026-09-07'de OneDrive kökleri tarandı), dolayısıyla kuralların
 * doğrulanabileceği tek yer burası.
 */
export function buildCatalogSkills(raw: string, ctx: CatalogSkillContext): CatalogSkill[] {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [];
  }
  const list = Array.isArray(data.skills) ? data.skills : [];
  const installed = new Set(ctx.installed);
  const recorded = new Set(ctx.recorded);

  const skills: CatalogSkill[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const name = skillName(entry);
    const rel = typeof entry.path === "string" ? entry.path : "";
    if (!name || !rel) continue;

    const riskTier = typeof entry.risk_tier === "number" ? entry.risk_tier : 0;
    const osList = Array.isArray(entry.os) ? entry.os.filter((x): x is string => typeof x === "string") : [];

    // Sıra önemli: en "kesin" engel önce. Diskte olmayan bir girdi için
    // "eklenti kökü gerekiyor" demek, kullanıcıyı yanlış yere bakmaya yollardı.
    let blocked: CatalogSkill["blocked"] = null;
    if (!isSafeRelPath(rel) || !ctx.hasPath(rel)) blocked = "missing";
    else if (osList.length > 0 && !osList.includes(ctx.os)) blocked = "os";
    else if (entry.plugin_root_required === true) blocked = "pluginRoot";
    else if (Array.isArray(entry.cross_plugin_deps) && entry.cross_plugin_deps.length > 0) blocked = "pluginRoot";
    else if (SKILL_CATALOG[name]) blocked = "bundled";

    skills.push({
      id: typeof entry.id === "string" && entry.id ? entry.id : name,
      name,
      plugin: typeof entry.plugin === "string" ? entry.plugin : "",
      description: typeof entry.description === "string" ? entry.description : "",
      riskTier,
      writeCapable: riskTier >= WRITE_TIER,
      path: rel,
      blocked,
      installed: installed.has(name),
      // Yalnızca bizim kurduğumuz klasör silinebilir: `.axet-code/skills`
      // altındaki her klasör bizden gelmiyor.
      removable: recorded.has(name)
    });
  }
  skills.sort((a, b) => a.id.localeCompare(b.id));
  return skills;
}

// --- kayıt dosyası ---------------------------------------------------------

export function readCatalogRecord(projectDir: string): CatalogSkillRecord[] {
  try {
    const raw = readFileSync(path.join(skillsRoot(projectDir), RECORD_FILE), "utf8");
    const parsed = JSON.parse(raw) as { installed?: unknown };
    if (!Array.isArray(parsed?.installed)) return [];
    return parsed.installed.filter(
      (x): x is CatalogSkillRecord =>
        Boolean(x) && typeof (x as CatalogSkillRecord).name === "string"
    );
  } catch {
    return [];
  }
}

function writeCatalogRecord(projectDir: string, records: CatalogSkillRecord[]): void {
  const root = skillsRoot(projectDir);
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, RECORD_FILE), JSON.stringify({ installed: records }, null, 2), "utf8");
  } catch {
    /* kayıt yazılamadıysa kurulumun kendisi yine de geçerli */
  }
}

/**
 * PRD kapısı — katalogdan kurulmuş yazma niyetli yetenekleri kaldırır.
 *
 * Katalog klasörüne İHTİYAÇ DUYMUYOR: risk seviyesi kurulum anında kayda
 * yazılıyor. Kapının, kitaplık o an eşitlenmemiş olsa bile çalışması gerekiyor.
 */
export function enforceTierOnCatalog(projectDir: string, tier: SystemTier | null): string[] {
  if (tier !== "PRD") return [];
  const records = readCatalogRecord(projectDir);
  const keep: CatalogSkillRecord[] = [];
  const removed: string[] = [];
  for (const record of records) {
    if ((record.riskTier ?? 0) < WRITE_TIER) {
      keep.push(record);
      continue;
    }
    try {
      rmSync(path.join(skillsRoot(projectDir), record.name), { recursive: true, force: true });
      removed.push(record.name);
    } catch {
      keep.push(record);
    }
  }
  if (removed.length > 0) writeCatalogRecord(projectDir, keep);
  return removed;
}

// --- diskle konuşan katman -------------------------------------------------

let cachedFolder: { path: string } | null | undefined;

/** Katalog klasörü oturum boyunca bir kez aranıyor; tarama OneDrive ağacını geziyor. */
async function resolveFolder(): Promise<string | null> {
  if (cachedFolder !== undefined) return cachedFolder?.path ?? null;
  const folders = await findCatalogFolders();
  cachedFolder = folders.length > 0 ? { path: folders[0].path } : null;
  return cachedFolder?.path ?? null;
}

function installedDirNames(projectDir: string): string[] {
  const root = skillsRoot(projectDir);
  if (!existsSync(root)) return [];
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .map((item) => item.name);
  } catch {
    return [];
  }
}

export async function listCatalogSkills(projectDir: string): Promise<CatalogSkillList> {
  const folder = await resolveFolder();
  const empty: CatalogSkillList = { folder: null, catalogVersion: null, department: null, skills: [] };
  if (!folder) return empty;

  let raw: string;
  try {
    raw = readFileSync(path.join(folder, "catalog.json"), "utf8");
  } catch {
    return empty;
  }

  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    /* buildCatalogSkills de aynı metni ayrıştırıp boş liste dönecek */
  }

  return {
    folder,
    catalogVersion: typeof meta.catalog_version === "string" ? meta.catalog_version : null,
    department: typeof meta.department === "string" ? meta.department : null,
    skills: projectDir
      ? buildCatalogSkills(raw, {
          installed: installedDirNames(projectDir),
          recorded: readCatalogRecord(projectDir).map((r) => r.name),
          hasPath: (rel) => existsSync(path.join(folder, ...rel.split(/[\\/]/))),
          os: process.platform === "win32" ? "windows" : process.platform === "darwin" ? "macos" : "linux"
        })
      : []
  };
}

/** Ana süreçle arayüzün aynı şeyi konuşması için tip paylaşımda duruyor. */
export type CatalogInstallResult = CatalogInstallOutcome;

export async function installCatalogSkill(projectDir: string, id: string): Promise<CatalogInstallResult> {
  const list = await listCatalogSkills(projectDir);
  const fail = (error: CatalogInstallResult["error"]) => ({ ok: false, error, list });
  if (!list.folder) return fail("noFolder");

  const entry = list.skills.find((skill) => skill.id === id);
  if (!entry) return fail("notFound");
  // Engelli bir girdiyi arayüz zaten kurdurmuyor; burada da reddediliyor çünkü
  // IPC'ye gelen kimliği gönderen taraf değil, bu taraf doğrulamalı.
  if (entry.blocked) return fail("blocked");
  if (entry.installed && !entry.removable) return fail("blocked");

  const src = path.join(list.folder, ...entry.path.split(/[\\/]/));
  const dest = path.join(skillsRoot(projectDir), entry.name);
  try {
    mkdirSync(skillsRoot(projectDir), { recursive: true });
    // Önce temizle: `force` üzerine yazar ama katalogdan SİLİNMİŞ bir dosyayı
    // eski kurulumdan bırakırdı (bkz. sapToolkit.installSkillsIntoProject).
    rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, {
      recursive: true,
      force: true,
      filter: (from) => !path.relative(src, from).split(path.sep).includes("__pycache__")
    });
  } catch {
    return fail("copy");
  }

  const records = readCatalogRecord(projectDir).filter((record) => record.name !== entry.name);
  records.push({
    id: entry.id,
    name: entry.name,
    plugin: entry.plugin,
    riskTier: entry.riskTier,
    catalogVersion: list.catalogVersion,
    installed: new Date().toISOString()
  });
  writeCatalogRecord(projectDir, records);

  return { ok: true, error: null, list: await listCatalogSkills(projectDir) };
}

/** Yalnızca KAYITTA olan bir klasör siliniyor — paketten gelenlere dokunulmuyor. */
export async function removeCatalogSkill(projectDir: string, name: string): Promise<CatalogInstallResult> {
  const records = readCatalogRecord(projectDir);
  if (!records.some((record) => record.name === name)) {
    return { ok: false, error: "notFound", list: await listCatalogSkills(projectDir) };
  }
  try {
    rmSync(path.join(skillsRoot(projectDir), name), { recursive: true, force: true });
  } catch {
    return { ok: false, error: "copy", list: await listCatalogSkills(projectDir) };
  }
  writeCatalogRecord(
    projectDir,
    records.filter((record) => record.name !== name)
  );
  return { ok: true, error: null, list: await listCatalogSkills(projectDir) };
}
