// Kurulu motorlar ve axet-code ajan listesi (spec 2026-10-17 ajan-alani §3, §10, §14.2).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/axetSpawnEnv", () => ({ axetSpawnEnv: () => ({}) }));

const { BUILTIN_AXET_AGENTS, detectEngines, listAxetAgents, parseAxetAgentList, parseVersion, pickBinary, shimPackageVersion } = await import(
  "../app-electron/main/agentEngineProbe"
);

const FIXTURE = readFileSync(path.join(__dirname, "fixtures", "axet-agent-list.json"), "utf8");

function deps(found: string[], axet: { kind: "ok"; version: string } | { kind: "missing" } | { kind: "broken"; detail: string } | { kind: "old"; version: string }) {
  return {
    where: vi.fn(async (binary: string) => found.includes(binary)),
    axetStatus: vi.fn(async () => axet),
    axetMessage: vi.fn((s: { kind: string }) => (s.kind === "ok" ? null : `mesaj:${s.kind}`))
  };
}

describe("detectEngines", () => {
  it("PATH'te bulunan kurulu; bulunmayan kurulu değil ve engelli", async () => {
    const d = deps(["claude"], { kind: "ok", version: "1.4.1" });
    const list = await detectEngines(d);
    expect(list.map((e) => [e.id, e.installed, e.blocked])).toEqual([
      ["axet-code", true, false],
      ["claude", true, false],
      ["codex", false, true],
      ["gemini", false, true],
      ["ozel", true, false]
    ]);
    expect(d.where).toHaveBeenCalledWith("codex");
    expect(d.where).not.toHaveBeenCalledWith("axet-code");
  });

  it("axet-code eski: kurulu, engelsiz, uyarı notu var", async () => {
    const [axet] = await detectEngines(deps([], { kind: "old", version: "1.3.0" }));
    expect(axet).toEqual({ id: "axet-code", installed: true, blocked: false, note: "mesaj:old", version: "1.3.0" });
  });

  it("axet-code bozuk: kurulu ama engelli; yoksa kurulu değil", async () => {
    expect((await detectEngines(deps([], { kind: "broken", detail: "0 bayt" })))[0]).toMatchObject({ installed: true, blocked: true });
    expect((await detectEngines(deps([], { kind: "missing" })))[0]).toMatchObject({ installed: false, blocked: true });
  });

  it("sondaj hata fırlatsa da liste dönüyor", async () => {
    const d = {
      where: vi.fn(async () => {
        throw new Error("where yok");
      }),
      axetStatus: vi.fn(async () => {
        throw new Error("exec patladı");
      }),
      axetMessage: vi.fn(() => null)
    };
    const list = await detectEngines(d);
    expect(list).toHaveLength(5);
    expect(list[0]).toMatchObject({ id: "axet-code", installed: false, blocked: true });
    expect(list[1]).toMatchObject({ id: "claude", installed: false });
  });
});

describe("axet-code ajan listesi", () => {
  it("ölçülmüş JSON ayrıştırılıyor", () => {
    const list = parseAxetAgentList(FIXTURE);
    expect(list.map((a) => a.name)).toEqual(["agent-builder", "coder", "guide", "security", "task"]);
    expect(list[1]).toEqual({
      name: "coder",
      scope: "builtin",
      permissions: "ask (default)",
      description: "An agent that helps with executing coding tasks."
    });
  });

  it("bozuk JSON, dizi olmayan değer, geçersiz ad ve tekrar atılıyor", () => {
    expect(parseAxetAgentList("{")).toEqual([]);
    expect(parseAxetAgentList('{"name":"x"}')).toEqual([]);
    expect(parseAxetAgentList('[{"name":"a b"},{"name":"-x"},{"name":"ok"},{"name":"ok"},null]').map((a) => a.name)).toEqual(["ok"]);
  });

  it("komut -c ile klasörde çalışıyor; okunamazsa yerleşik beş ajan", async () => {
    const run = vi.fn(async () => FIXTURE);
    expect((await listAxetAgents("C:\\proje", run)).length).toBe(5);
    expect(run).toHaveBeenCalledWith(["agent", "list", "--json", "-c", "C:\\proje"]);
    expect(await listAxetAgents("", vi.fn(async () => null))).toEqual(BUILTIN_AXET_AGENTS);
    const failing = vi.fn(async () => {
      throw new Error("x");
    });
    expect(await listAxetAgents("C:\\p", failing)).toEqual(BUILTIN_AXET_AGENTS);
    expect(BUILTIN_AXET_AGENTS.map((a) => a.name)).toEqual(["coder", "task", "guide", "security", "agent-builder"]);
  });

  it("klasör boşsa -c verilmiyor", async () => {
    const run = vi.fn(async () => "[]");
    await listAxetAgents("  ", run);
    expect(run).toHaveBeenCalledWith(["agent", "list", "--json"]);
  });
});

// Araçlar ekranı (Tur 3): yol ve sürüm; program kabuksuz, npm kabuğu çalıştırılmıyor.
describe("motor ayrıntısı", () => {
  it("kurulu motorlara yol ve sürüm ekleniyor; axet-code sürümü kendi sondajından", async () => {
    const d = {
      ...deps(["claude"], { kind: "ok", version: "1.4.1" }),
      details: vi.fn(async (binary: string) => ({ path: `C:\\bin\\${binary}.exe`, version: "9.9.9" }))
    };
    const list = await detectEngines(d);
    expect(list[0]).toMatchObject({ id: "axet-code", path: "C:\\bin\\axet-code.exe", version: "1.4.1" });
    expect(list[1]).toMatchObject({ id: "claude", path: "C:\\bin\\claude.exe", version: "9.9.9" });
    expect(list[2]).not.toHaveProperty("path");
    expect(d.details).not.toHaveBeenCalledWith("codex");
  });

  it("ayrıntı fırlatırsa motor yine kurulu, yalnız yol/sürüm yok", async () => {
    const d = { ...deps(["gemini"], { kind: "missing" }), details: vi.fn(async () => Promise.reject(new Error("x"))) };
    const gemini = (await detectEngines(d)).find((e) => e.id === "gemini");
    expect(gemini).toEqual({ id: "gemini", installed: true, blocked: false });
  });

  it("parseVersion ve pickBinary", () => {
    expect(parseVersion("2.0.14 (Claude Code)")).toBe("2.0.14");
    expect(parseVersion("codex-cli 0.46.0-beta.2")).toBe("0.46.0-beta.2");
    expect(parseVersion("yok")).toBeNull();
    expect(pickBinary(["C:\\npm\\claude", "C:\\npm\\claude.cmd", ""])).toBe("C:\\npm\\claude.cmd");
    expect(pickBinary(["C:\\a\\x.cmd", "C:\\b\\x.exe"])).toBe("C:\\b\\x.exe");
    expect(pickBinary([])).toBeNull();
  });

  it("npm kabuğundan paket sürümü; paket yolu dışarı çıkamaz", () => {
    const files: Record<string, string> = {
      "C:\\npm\\gemini.cmd": '"%_prog%"  "%dp0%\\node_modules\\@google\\gemini-cli\\dist\\index.js" %*',
      [path.join("C:\\npm", "node_modules", "@google", "gemini-cli", "package.json")]: '{"version":"0.9.0"}'
    };
    const read = (f: string) => {
      if (!(f in files)) throw new Error("yok");
      return files[f];
    };
    expect(shimPackageVersion("C:\\npm\\gemini.cmd", read)).toBe("0.9.0");
    expect(shimPackageVersion("C:\\npm\\kotu.cmd", () => '"%dp0%\\node_modules\\..\\..\\x"')).toBeNull();
    expect(shimPackageVersion("C:\\npm\\yok.cmd", read)).toBeNull();
  });
});


describe("Tur 10: Claude kurumsal başlatıcısı", () => {
  const launcher = { name: "azure", path: "C:\\NTT\\azure.bat", provider: "foundry" as const };
  it("claude PATH'te yokken başlatıcı varsa kurulu, engelsiz, notlu; 'Kur' gerekmez", async () => {
    const d = { ...deps([], { kind: "ok", version: "1.4.1" }), claudeLauncher: () => launcher, launcherNote: () => "not" };
    const claude = (await detectEngines(d)).find((e) => e.id === "claude")!;
    expect(claude).toMatchObject({ installed: true, blocked: false, path: "C:\\NTT\\azure.bat", launcher, note: "not" });
  });

  it("başlatıcı yoksa eskisi gibi; sondaj patlarsa yok sayılır", async () => {
    const d = { ...deps([], { kind: "ok", version: "1.4.1" }), claudeLauncher: () => { throw new Error("x"); } };
    expect((await detectEngines(d)).find((e) => e.id === "claude")).toMatchObject({ installed: false, blocked: true });
    expect((await detectEngines(d)).find((e) => e.id === "claude")?.launcher).toBeUndefined();
  });
});
