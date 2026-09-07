// Katalogdan yetenek kurulumu.
//
// Testin ağırlığı REDDETME kurallarında. Bu makinede eşitlenmiş bir katalog
// klasörü yok (OneDrive kökleri tarandı, `catalog.json` bulunamadı), yani
// kuralların doğrulanabileceği tek yer burası — ve yanlış tarafa düşen bir
// kural, çalışmayacak bir skill'i projeye kurup ajana okutmak demek.
//
// PRD kapısı ise gerçek dosya sistemine karşı koşuluyor: kapının işi silmek,
// ve silmeyi taklit eden bir test kapının çalıştığını göstermez.

import { mkdtempSync, mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCatalogSkills,
  enforceTierOnCatalog,
  isSafeRelPath,
  readCatalogRecord
} from "../app-electron/main/catalogSkills";

const ctx = {
  installed: [] as string[],
  recorded: [] as string[],
  hasPath: () => true,
  os: "windows"
};

function catalog(...skills: Record<string, unknown>[]): string {
  return JSON.stringify({ catalog_version: "1.4.0", skills });
}

const PLAIN = {
  id: "team-tools/mass-rename",
  plugin: "team-tools",
  path: "plugins/team-tools/skills/mass-rename",
  description: "Toplu yeniden adlandirma",
  risk_tier: 0,
  os: ["windows", "macos", "linux"]
};

describe("buildCatalogSkills", () => {
  it("duz bir girdiyi kurulabilir okur", () => {
    const [skill] = buildCatalogSkills(catalog(PLAIN), ctx);
    expect(skill.name).toBe("mass-rename");
    expect(skill.plugin).toBe("team-tools");
    expect(skill.blocked).toBeNull();
    expect(skill.writeCapable).toBe(false);
  });

  it("eklenti kokune dayanan girdiyi REDDEDER", () => {
    // Hedefimiz `<proje>/.axet-code/skills/<ad>`; orada eklenti koku yok.
    // Kopyalamak, calismayacak bir skill'i calisiyormus gibi gostermekti.
    const [skill] = buildCatalogSkills(catalog({ ...PLAIN, plugin_root_required: true }), ctx);
    expect(skill.blocked).toBe("pluginRoot");
  });

  it("kardes eklentiye bagimli girdiyi REDDEDER", () => {
    const [skill] = buildCatalogSkills(catalog({ ...PLAIN, cross_plugin_deps: ["office-tools"] }), ctx);
    expect(skill.blocked).toBe("pluginRoot");
  });

  it("bos cross_plugin_deps engel degildir", () => {
    const [skill] = buildCatalogSkills(catalog({ ...PLAIN, cross_plugin_deps: [] }), ctx);
    expect(skill.blocked).toBeNull();
  });

  it("Windows icin yayinlanmamis girdiyi REDDEDER", () => {
    const [skill] = buildCatalogSkills(catalog({ ...PLAIN, os: ["macos"] }), ctx);
    expect(skill.blocked).toBe("os");
  });

  it("diskte olmayan yolu REDDEDER ve sebebi 'missing' kalir", () => {
    // Sira onemli: olmayan bir girdi icin "eklenti koku gerekiyor" demek,
    // kullaniciyi yanlis yere bakmaya yollardi.
    const [skill] = buildCatalogSkills(catalog({ ...PLAIN, plugin_root_required: true }), {
      ...ctx,
      hasPath: () => false
    });
    expect(skill.blocked).toBe("missing");
  });

  it("paketle gelen ayni adli skill REDDEDILIR", () => {
    // Rol kurulumu o klasoru silip paketten yeniden yaziyor; katalog kopyasi
    // bir sonraki baglanmada sessizce geri alinirdi.
    const [skill] = buildCatalogSkills(catalog({ ...PLAIN, id: "sap-consultant/clean-core", path: "plugins/sap-consultant/skills/clean-core" }), ctx);
    expect(skill.blocked).toBe("bundled");
  });

  it("proje disina cikan yollari REDDEDER", () => {
    expect(isSafeRelPath("plugins/x/skills/y")).toBe(true);
    expect(isSafeRelPath("../../Windows/System32")).toBe(false);
    expect(isSafeRelPath("C:/Windows")).toBe(false);
    expect(isSafeRelPath("/etc/passwd")).toBe(false);
    const [skill] = buildCatalogSkills(catalog({ ...PLAIN, path: "../../evil" }), ctx);
    expect(skill.blocked).toBe("missing");
  });

  it("risk seviyesi 1 ve ustu yazma yetenegi sayilir", () => {
    // Katalogda tier 0 "yalnizca dosyalara dokunur"; ustu PRD kapisina tabi.
    expect(buildCatalogSkills(catalog({ ...PLAIN, risk_tier: 1 }), ctx)[0].writeCapable).toBe(true);
    expect(buildCatalogSkills(catalog({ ...PLAIN, risk_tier: 3 }), ctx)[0].writeCapable).toBe(true);
  });

  it("kurulu olmak ile KALDIRILABILIR olmak ayri seyler", () => {
    // `.axet-code/skills` altindaki her klasoru biz kurmadik; yabanci bir
    // klasoru silme dugmesi gostermek, baskasinin isini silmekti.
    const foreign = buildCatalogSkills(catalog(PLAIN), { ...ctx, installed: ["mass-rename"] })[0];
    expect(foreign.installed).toBe(true);
    expect(foreign.removable).toBe(false);

    const ours = buildCatalogSkills(catalog(PLAIN), {
      ...ctx,
      installed: ["mass-rename"],
      recorded: ["mass-rename"]
    })[0];
    expect(ours.removable).toBe(true);
  });

  it("bozuk katalog cokmez, bos liste doner", () => {
    expect(buildCatalogSkills("{ bozuk", ctx)).toEqual([]);
    expect(buildCatalogSkills("{}", ctx)).toEqual([]);
  });

  it("yolu ya da kimligi olmayan girdi atlanir", () => {
    expect(buildCatalogSkills(catalog({ id: "a/b" }, { path: "" }, PLAIN), ctx)).toHaveLength(1);
  });
});

// --- PRD kapisi (gercek dosya sistemi) -------------------------------------

const temps: string[] = [];

function project(records: { name: string; riskTier: number }[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), "axet-catalog-"));
  temps.push(dir);
  const root = path.join(dir, ".axet-code", "skills");
  mkdirSync(root, { recursive: true });
  for (const record of records) {
    mkdirSync(path.join(root, record.name), { recursive: true });
    writeFileSync(path.join(root, record.name, "SKILL.md"), "# skill", "utf8");
  }
  writeFileSync(
    path.join(root, ".catalog.json"),
    JSON.stringify({
      installed: records.map((r) => ({
        id: `team-tools/${r.name}`,
        name: r.name,
        plugin: "team-tools",
        riskTier: r.riskTier,
        catalogVersion: "1.4.0",
        installed: "2026-09-08T00:00:00.000Z"
      }))
    }),
    "utf8"
  );
  return dir;
}

afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

describe("enforceTierOnCatalog", () => {
  it("PRD'de yazma niyetli katalog skill'ini SILER", () => {
    const dir = project([{ name: "mass-rename", riskTier: 2 }]);
    expect(enforceTierOnCatalog(dir, "PRD")).toEqual(["mass-rename"]);
    expect(existsSync(path.join(dir, ".axet-code", "skills", "mass-rename"))).toBe(false);
    expect(readCatalogRecord(dir)).toEqual([]);
  });

  it("PRD'de tier 0 skill'e DOKUNMAZ", () => {
    const dir = project([{ name: "reader", riskTier: 0 }]);
    expect(enforceTierOnCatalog(dir, "PRD")).toEqual([]);
    expect(existsSync(path.join(dir, ".axet-code", "skills", "reader"))).toBe(true);
    expect(readCatalogRecord(dir)).toHaveLength(1);
  });

  it("DEV/QA/isaretsiz sistemde hicbir sey silinmez", () => {
    for (const tier of ["DEV", "QA", null] as const) {
      const dir = project([{ name: "mass-rename", riskTier: 3 }]);
      expect(enforceTierOnCatalog(dir, tier)).toEqual([]);
      expect(existsSync(path.join(dir, ".axet-code", "skills", "mass-rename"))).toBe(true);
    }
  });

  it("kayit dosyasi yoksa sessizce gecer", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "axet-catalog-"));
    temps.push(dir);
    expect(enforceTierOnCatalog(dir, "PRD")).toEqual([]);
  });

  it("silinen kayit dosyadan dusuyor, kalan duruyor", () => {
    const dir = project([
      { name: "reader", riskTier: 0 },
      { name: "writer", riskTier: 3 }
    ]);
    enforceTierOnCatalog(dir, "PRD");
    expect(readCatalogRecord(dir).map((r) => r.name)).toEqual(["reader"]);
  });
});
