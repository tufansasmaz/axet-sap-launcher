import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// O3: ajanın Python'una TLS kuralı PYTHONPATH'le gidiyor. Kuralın kendisi
// Python tarafında, yerel sahte TLS sunucusuyla test ediliyor
// (resources/sap-toolkit/sap-consultant/skills/sap-adt/scripts/test_ntt_tls_global.py);
// burada ortamın gerçekten o klasörü taşıdığı ölçülüyor.

const repoRoot = path.resolve(__dirname, "..");
vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => repoRoot, getPath: () => "", getLocale: () => "tr" }
}));

const { withPythonSite, nttPythonSiteDir, withNttPythonSite } = await import("../app-electron/main/pythonSiteEnv");
const { axetSpawnEnv } = await import("../app-electron/main/axetSpawnEnv");

const SITE = path.join(repoRoot, "resources", "sap-toolkit", "python-site");

describe("withPythonSite", () => {
  it("python-site PYTHONPATH'in başında, kullanıcınınki arkada", () => {
    const env = withPythonSite({ PYTHONPATH: ["C:\\a", "C:\\b"].join(path.delimiter), X: "1" }, "C:\\site");
    expect(env.PYTHONPATH).toBe(["C:\\site", "C:\\a", "C:\\b"].join(path.delimiter));
    expect(env.X).toBe("1");
  });

  it("farklı yazımlı anahtarlar tek PYTHONPATH'te birleşiyor, site tekrar etmiyor", () => {
    const env = withPythonSite({ PythonPath: "C:\\a", pythonpath: `C:\\SITE${path.delimiter}C:\\b` }, "C:\\site");
    expect(Object.keys(env).filter((k) => k.toUpperCase() === "PYTHONPATH")).toEqual(["PYTHONPATH"]);
    expect(env.PYTHONPATH).toBe(["C:\\site", "C:\\a", "C:\\b"].join(path.delimiter));
  });

  it("site yoksa ortam olduğu gibi, girdi değiştirilmiyor", () => {
    const input = { PYTHONPATH: "C:\\a" };
    expect(withPythonSite(input, null)).toBe(input);
    withPythonSite(input, "C:\\site");
    expect(input).toEqual({ PYTHONPATH: "C:\\a" });
  });
});

describe("ajan ortamı", () => {
  it("toolkit'teki python-site bulunuyor ve sitecustomize ntt_tls_pin'i kuruyor", () => {
    expect(nttPythonSiteDir()).toBe(SITE);
    const src = readFileSync(path.join(SITE, "sitecustomize.py"), "utf8");
    expect(src).toContain("NTT Studio");
    expect(src).toContain("install_global()");
    // sitecustomize ntt_tls_pin'i bu göreli yoldan yüklüyor.
    expect(existsSync(path.join(SITE, "..", "sap-consultant", "skills", "sap-adt", "scripts", "ntt_tls_pin.py"))).toBe(true);
  });

  it("axetSpawnEnv (sohbet, TUI, flows, GUI script ajanı) PYTHONPATH'i taşıyor", () => {
    for (const useConnectors of [true, false]) {
      const env = axetSpawnEnv(useConnectors);
      expect(env.PYTHONPATH?.split(path.delimiter)[0]).toBe(SITE);
    }
  });

  it("withNttPythonSite: terminal ve 8787 sunucusunun kullandığı yardımcı", () => {
    expect(withNttPythonSite({}).PYTHONPATH).toBe(SITE);
  });

  it("terminal ve 8787 sunucusu yardımcıyı kullanıyor", () => {
    const read = (f: string) => readFileSync(path.join(repoRoot, "app-electron", "main", f), "utf8");
    expect(read("terminalManager.ts")).toMatch(/env: withNttPythonSite\(/);
    expect(read("adtReadonlyServerManager.ts")).toMatch(/const env: NodeJS\.ProcessEnv = withNttPythonSite\(/);
  });

  it("paketleme python-site'ı dışlamıyor (sap-toolkit bütün olarak gidiyor)", () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    const entry = pkg.build.extraResources.find((e: { from: string }) => e.from === "resources/sap-toolkit");
    expect(entry.to).toBe("sap-toolkit");
    expect((entry.filter ?? []).some((f: string) => f.includes("python-site"))).toBe(false);
  });
});
