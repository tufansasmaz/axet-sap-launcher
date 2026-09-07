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
import path from "node:path";
import { enforceTierOnCatalog, readCatalogRecord } from "./catalogSkills";
import {
  DEFAULT_PROFILE,
  SKILL_CATALOG,
  orphanedProfileSkills,
  planSkills,
  type SkillProfile
} from "./skillProfiles";
import type { InstalledSkillInfo, SkillVersionStamp, SystemTier, ToolkitVersion } from "../shared/types";

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
  /** PRD kapısı yüzünden bilerek kurulmayanlar. */
  blockedByTier: string[];
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
    toolkitRoot,
    profile,
    tier,
    version: toolkitVersion?.version ?? null
  };
  if (!toolkitRoot) return result;

  const destRoot = path.join(projectDir, ".axet-code", "skills");
  mkdirSync(destRoot, { recursive: true });

  const plan = planSkills(profile, tier);

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

    if (entry.blockedByTier) {
      // Kapı sadece kurmamak değil, KALDIRMAK zorunda: sistem DEV iken kurulmuş
      // olabilir, sonra PRD işaretlenmiş olabilir. Duran bir skill'i ajan okur.
      rmSync(dest, { recursive: true, force: true });
      result.blockedByTier.push(entry.name);
      continue;
    }

    const def = SKILL_CATALOG[entry.name];
    const src = path.join(toolkitRoot, ...def.path.split("/"));
    if (!existsSync(path.join(src, "SKILL.md"))) {
      result.skipped.push(entry.name);
      continue;
    }

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
      result.installed.push(entry.name);
    } catch {
      result.skipped.push(entry.name);
    }
  }

  // Katalogdan kurulmuş yetenekler de aynı PRD kapısına tabi. Yukarıdaki döngü
  // yalnızca profildeki adlara bakıyor; katalogdan gelen bir yazma yeteneği o
  // listede olmadığı için kapıdan sessizce sızardı.
  result.blockedByTier.push(...enforceTierOnCatalog(projectDir, tier));

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
