// Katalog ile DİSKTEKİ paket arasındaki sözleşme.
//
// `skillProfiles.ts` elle yazılmış bir tablo ve paketin kendisi 40+ klasör.
// İkisi birbirinden habersiz kaydığında hiçbir şey patlamıyor: kurulum
// `SKILL.md` yoksa adı sessizce `skipped`'e atıyor, kullanıcı listede görüyor,
// diske hiçbir şey yazılmıyor. Bu dosyadaki testler o sessizliği bozuyor.
//
// Paylaşılan dosyalar (`SHARED_ASSETS`) ayrıca test ediliyor, çünkü oradaki
// hata daha da sessiz: `redact.py` bulunamayınca `--redact-pii` (TCKN/vergi no
// maskeleme) devre dışı kalıyor ve doküman maskesiz ÜRETİLİYOR — yani hata
// "çalışmadı" diye değil, "yanlış çalıştı" diye ortaya çıkıyor.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SHARED_ASSETS, SKILL_CATALOG } from "../app-electron/main/skillProfiles";

const TOOLKIT = path.join(__dirname, "..", "resources", "sap-toolkit");
const abs = (rel: string) => path.join(TOOLKIT, ...rel.split("/"));

/** Bir klasör altındaki tüm dosyalar (paket 12 MB, `__pycache__` hariç). */
function walk(dir: string, out: string[] = []): string[] {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.name === "__pycache__" || item.name === "node_modules") continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe("SKILL_CATALOG — diskte gerçekten var mı", () => {
  it("her girdinin klasörü ve SKILL.md'si var", () => {
    for (const [name, def] of Object.entries(SKILL_CATALOG)) {
      const dir = abs(def.path);
      expect(existsSync(dir), `${name}: klasör yok (${def.path})`).toBe(true);
      expect(existsSync(path.join(dir, "SKILL.md")), `${name}: SKILL.md yok`).toBe(true);
    }
  });

  it("iki skill aynı klasörü göstermiyor", () => {
    // Aynı yolu iki ada bağlamak, rol değişince birinin diğerini silmesi demek.
    const seen = new Map<string, string>();
    for (const [name, def] of Object.entries(SKILL_CATALOG)) {
      const clash = seen.get(def.path);
      expect(clash, `${name} ile ${clash} ayni yolu gosteriyor: ${def.path}`).toBeUndefined();
      seen.set(def.path, name);
    }
  });

  it("excludeDirs gerçekten var olan bir klasörü gösteriyor", () => {
    // Yanlış yazılmış bir `excludeDirs`, dışarıda kalması gereken klasörün
    // sessizce projeye kopyalanması demek. `sap-adt-readonly/scripts` için bu,
    // 1400 satırlık tam yetkili ADT motorunun ajanın çalışma ağacına düşmesi.
    for (const [name, def] of Object.entries(SKILL_CATALOG)) {
      for (const dir of def.excludeDirs ?? []) {
        expect(existsSync(path.join(abs(def.path), dir)), `${name}: excludeDirs "${dir}" yok`).toBe(
          true
        );
      }
    }
  });

  it("SAP'a YAZAN paketler pakete hiç girmemiş", () => {
    // Toolkit CLAUDE.md: "Non-negotiable: SAP is READ-ONLY." Bunlar marketplace'te
    // duruyor ve bilerek alınmadı: `sap-adt` tam yetkili yazma motoru,
    // `sap-object-transfer`/`adobe-gen`/`abapgit-deploy` sisteme yazıyor.
    for (const forbidden of ["sap-adt", "sap-object-transfer", "adobe-gen", "abapgit-deploy"]) {
      const hits = readdirSync(TOOLKIT, { withFileTypes: true })
        .filter((item) => item.isDirectory())
        .map((item) => path.join(TOOLKIT, item.name, "skills", forbidden))
        .filter((candidate) => existsSync(candidate));
      expect(hits, `${forbidden} pakete girmis`).toEqual([]);
      expect(SKILL_CATALOG[forbidden], `${forbidden} katalogda`).toBeUndefined();
    }
  });

  it("müşteriye ait project-kb verisi pakette YOK", () => {
    // Marketplace'in kendi uyarısı: her project-kb skill'i bir müşterinin
    // gerçek sistem verisini (SID, kullanıcı adı, iç ağ adresi) taşıyor.
    // Bu depo PUBLIC.
    expect(existsSync(path.join(TOOLKIT, "project-kb"))).toBe(false);
  });
});

describe("SHARED_ASSETS — skill klasörünün dışındaki dosyalar", () => {
  it("kaynak klasör ve marker dosyası diskte var", () => {
    for (const asset of SHARED_ASSETS) {
      const dir = abs(asset.path);
      expect(existsSync(dir), `${asset.path} yok`).toBe(true);
      expect(statSync(dir).isDirectory(), `${asset.path} klasör değil`).toBe(true);
      // Marker sadece "bu bizim kopyamız" işareti değil, aynı zamanda silme
      // kararının dayanağı: kaynakta yoksa hedefte de hiç oluşmaz ve kurulum
      // bıraktığı klasörü bir daha asla temizleyemez.
      expect(existsSync(path.join(dir, asset.marker)), `${asset.path}/${asset.marker} yok`).toBe(
        true
      );
    }
  });

  it("requiredBy'daki her ad katalogda", () => {
    for (const asset of SHARED_ASSETS) {
      for (const name of asset.requiredBy) {
        expect(SKILL_CATALOG[name], `${asset.dest} -> ${name}`).toBeDefined();
      }
    }
  });

  it("iki asset aynı hedefe yazmıyor", () => {
    const dests = SHARED_ASSETS.map((asset) => asset.dest);
    expect(new Set(dests).size).toBe(dests.length);
  });
});

describe("paylaşılan dosyaya İHTİYACI olan her skill listede", () => {
  // Bu iki test, kataloğa yeni bir skill eklendiğinde bağımlılığın
  // unutulmasını yakalıyor — bugüne kadarki iki sessiz arıza da tam olarak
  // buydu: `quality.py` ve `redact.py` hiç kopyalanmıyordu, kimse fark
  // etmemişti çünkü skill'in kendisi kuruluyordu.

  const requiredBy = (dest: string) =>
    new Set(SHARED_ASSETS.find((asset) => asset.dest === dest)?.requiredBy ?? []);

  it("`.axet-code/scripts` kullanan her skill scripts asset'inde", () => {
    const needed = requiredBy("scripts");
    for (const [name, def] of Object.entries(SKILL_CATALOG)) {
      const uses = walk(abs(def.path)).some((file) =>
        /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\//.test(readFileSync(file, "latin1"))
      );
      if (uses) expect(needed.has(name), `${name} paylasilan scripts'e ihtiyac duyuyor`).toBe(true);
    }
  });

  it("`.axet-code/lib` import eden her skill lib asset'inde", () => {
    const needed = requiredBy("lib");
    for (const [name, def] of Object.entries(SKILL_CATALOG)) {
      const uses = walk(abs(def.path)).some((file) => {
        if (!file.endsWith(".py")) return false;
        const text = readFileSync(file, "latin1");
        return /"\.\.",\s*"\.\.",\s*"\.\.",\s*"lib"/.test(text);
      });
      if (uses) expect(needed.has(name), `${name} paylasilan lib'e ihtiyac duyuyor`).toBe(true);
    }
  });
});
