// Kalıcı bellek: terminal kaydı (spec 2026-10-18 ajan-bellegi §2, §4, §5).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentSpec } from "../app-electron/shared/agentTypes";

const spec: AgentSpec = { engine: "claude", role: "", roleKind: "custom" };
const empty = (id: string): TerminalWorkspace => ({ id, name: id, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false });
const ready = (): TerminalState => ({ ...initialTerminalState, phase: "ready", workspaces: [empty("w1"), empty("w2")], activeWorkspaceId: "w1" });
const addAgent = (s: TerminalState, workspaceId: string, paneId: string, title: string, memory?: boolean) =>
  terminalReducer(s, { type: "addPane", workspaceId, paneId, kind: "agent", cwd: "C:\\a", agent: spec, title, ...(memory === undefined ? {} : { memory }) });
const agentOf = (s: TerminalState, paneId: string) => s.workspaces.flatMap((w) => w.panes).find((p) => p.id === paneId)?.agent;

describe("addPane — memory (§2)", () => {
  it("işaretliyse anahtar addan türetiliyor ve kayda giriyor; işaretsizse yok", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe", true);
    s = addAgent(s, "w1", "p2", "Mehmet");
    s = addAgent(s, "w1", "p3", "Zeynep", false);
    expect(agentOf(s, "p1")).toEqual({ ...spec, memory: "ayse" });
    expect(agentOf(s, "p2")).toEqual(spec);
    expect(agentOf(s, "p3")).toEqual(spec);
    expect(toSaved(s).workspaces[0].panes[0].agent).toEqual({ ...spec, memory: "ayse" });
  });

  it("iki alanda aynı ad: anahtarlar ayrışıyor (sapma 4)", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe", true);
    s = addAgent(s, "w1", "p2", "Ayşe", true);
    s = addAgent(s, "w2", "p3", "AYŞE", true);
    expect([agentOf(s, "p1")?.memory, agentOf(s, "p2")?.memory, agentOf(s, "p3")?.memory]).toEqual(["ayse", "ayse-2", "ayse-3"]);
  });

  it("kabuk bölmesine bellek eklenmiyor", () => {
    const s = terminalReducer(ready(), { type: "addPane", workspaceId: "w1", paneId: "p1", kind: "cmd", cwd: "C:\\a", memory: true });
    expect(s.workspaces[0].panes[0].agent).toBeUndefined();
  });
});

describe("enablePaneMemory (§4)", () => {
  it("anahtarı addan türetip ekliyor; adı yoksa motor", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe");
    s = terminalReducer(s, { type: "addPane", workspaceId: "w1", paneId: "p2", kind: "agent", cwd: "C:\\a", agent: spec });
    s = terminalReducer(s, { type: "enablePaneMemory", paneId: "p1" });
    s = terminalReducer(s, { type: "enablePaneMemory", paneId: "p2" });
    expect(agentOf(s, "p1")?.memory).toBe("ayse");
    expect(agentOf(s, "p2")?.memory).toBe("claude");
  });

  it("zaten açıksa, kabuksa ya da bölme yoksa aynı durum (anahtar asla değişmiyor)", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe", true);
    s = terminalReducer(s, { type: "renamePane", paneId: "p1", title: "Fatma" });
    s = terminalReducer(s, { type: "addPane", workspaceId: "w1", paneId: "k1", kind: "cmd", cwd: "C:\\a" });
    for (const paneId of ["p1", "k1", "yok"]) {
      expect(terminalReducer(s, { type: "enablePaneMemory", paneId }), paneId).toBe(s);
    }
    expect(agentOf(s, "p1")?.memory).toBe("ayse");
  });
});

describe("sağlayıcı bağlantısı", () => {
  it("addAgent memory'yi eyleme, enablePaneMemory eylemi gönderiyor", () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "stores", "terminalStore.tsx"), "utf8");
    expect(src).toMatch(/addAgent: \(input, split\) => \{[\s\S]{0,700}memory: input\.memory === true/);
    expect(src).toContain('enablePaneMemory: (paneId) => dispatch({ type: "enablePaneMemory", paneId }),');
  });
});
