// Kurulu motorlar ve axet-code ajan listesi (spec 2026-10-17 ajan-alani §3, §10, §14.2).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/axetSpawnEnv", () => ({ axetSpawnEnv: () => ({}) }));

const { BUILTIN_AXET_AGENTS, detectEngines, listAxetAgents, parseAxetAgentList } = await import(
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
    expect(axet).toEqual({ id: "axet-code", installed: true, blocked: false, note: "mesaj:old" });
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
