// @vitest-environment jsdom
// Araçlar görünümü (Tur 3): motor kurulu mu (sürüm, yol), kurulu değilse tek
// satır kurulum komutu, varsayılan motor seçimi, yeniden denetle.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ToolsView from "../src/agents/ToolsView";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import type { AgentEngineInfo } from "../app-electron/shared/agentTypes";

// Node 26 kendi localStorage'ını (dosyasız undefined) jsdom'unkinin üstüne koyuyor; bellekte basit depo.
const lsStore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => lsStore.get(k) ?? null,
  setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
  removeItem: (k: string) => void lsStore.delete(k),
  clear: () => lsStore.clear()
});


const ENGINES: AgentEngineInfo[] = [
  { id: "axet-code", installed: true, blocked: false, version: "1.4.1", path: "C:\\axet\\axet-code.exe" },
  { id: "claude", installed: true, blocked: false, version: "2.0.14", path: "C:\\npm\\claude.cmd" },
  { id: "codex", installed: false, blocked: true },
  { id: "gemini", installed: false, blocked: true },
  { id: "ozel", installed: true, blocked: false }
];

let agentEngines: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  agentEngines = vi.fn(async () => ENGINES.map((e) => (e.id === "codex" ? { ...e, installed: true, blocked: false, version: "0.46.0" } : e)));
  (window as unknown as { api: unknown }).api = { agentEngines, writeClipboard: vi.fn(async () => ({ ok: true })) };
});
afterEach(cleanup);

function setup() {
  const value: AgentStatusValue = { statuses: {}, engines: ENGINES, now: 0, answer: async () => ({ ok: false, reason: "noAgent" }) };
  render(
    <LanguageProvider language="tr">
      <AgentStatusContext.Provider value={value}>
        <ToolsView />
      </AgentStatusContext.Provider>
    </LanguageProvider>
  );
}

const row = (id: string) => document.querySelector(`[data-engine="${id}"]`) as HTMLElement;

describe("ToolsView", () => {
  it("kurulu motorda sürüm ve yol; kurulu olmayanda kopyalanabilir kurulum komutu", () => {
    setup();
    expect(within(row("axet-code")).getByText("Kurulu · 1.4.1")).toBeTruthy();
    expect(within(row("claude")).getByText("C:\\npm\\claude.cmd")).toBeTruthy();
    expect(within(row("codex")).getByText("Kurulu değil")).toBeTruthy();
    expect(row("codex").querySelector("[data-install]")?.textContent).toBe("npm install -g @openai/codex");
    expect(row("gemini").querySelector("[data-install]")?.textContent).toBe("npm install -g @google/gemini-cli");
    expect(within(row("codex")).getByTitle("Kurulum komutunu kopyala")).toBeTruthy();
    // Kurulu motorda komut yok.
    expect(row("claude").querySelector("[data-install]")).toBeNull();
  });

  it("varsayılan motor seçimi kaydediliyor (radio)", () => {
    setup();
    const group = screen.getByRole("radiogroup", { name: "Varsayılan motor" });
    const radio = within(group).getByRole("radio", { name: "Claude Code varsayılan olsun" });
    expect(radio.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(radio);
    expect(radio.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("ntt.agents.defaultEngine")).toBe("claude");
  });

  it("Yeniden denetle taze bilgi istiyor ve gösteriyor", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden denetle" }));
    await act(async () => {
      for (let i = 0; i < 4; i++) await Promise.resolve();
    });
    expect(agentEngines).toHaveBeenCalledWith(true);
    expect(within(row("codex")).getByText("Kurulu · 0.46.0")).toBeTruthy();
  });
});

// --- Kur düğmesi (görünür kurulum bölmesi) ---
import { TerminalStoreContext, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import type { TerminalState } from "../src/stores/terminalTypes";

function storeState(panes: { id: string; run: unknown }[]): TerminalState {
  return {
    phase: "ready",
    visible: true,
    activeWorkspaceId: "w1",
    workspaces: [{ id: "w1", name: "1", panes: panes.map((p) => ({ ...p, kind: "cmd", cwd: "C:\a" })), focusedPaneId: null, maximizedPaneId: null, unread: false, error: false }]
  } as unknown as TerminalState;
}

function setupStore(opts: { setupRuns?: TerminalStoreValue["setupRuns"]; panes?: { id: string; run: unknown }[]; addResult?: string | null; npm?: boolean } = {}) {
  const addSetupPane = vi.fn(() => (opts.addResult === undefined ? "pane-kur" : opts.addResult));
  const revealPane = vi.fn();
  (window as unknown as { api: Record<string, unknown> }).api.agentWhich = vi.fn(async () => opts.npm ?? true);
  const make = (setupRuns: TerminalStoreValue["setupRuns"], panes: { id: string; run: unknown }[]): TerminalStoreValue =>
    ({
      state: storeState(panes),
      commands: { addSetupPane, revealPane },
      defaultKind: "cmd",
      defaultCwd: "C:\a",
      agentCwd: "C:\a",
      setupRuns
    }) as unknown as TerminalStoreValue;
  const value: AgentStatusValue = { statuses: {}, engines: ENGINES, now: 0, answer: async () => ({ ok: false, reason: "noAgent" }) };
  const tree = (store: TerminalStoreValue) => (
    <LanguageProvider language="tr">
      <AgentStatusContext.Provider value={value}>
        <TerminalStoreContext.Provider value={store}>
          <ToolsView />
        </TerminalStoreContext.Provider>
      </AgentStatusContext.Provider>
    </LanguageProvider>
  );
  const utils = render(tree(make(opts.setupRuns ?? {}, opts.panes ?? [])));
  const rerender = (setupRuns: TerminalStoreValue["setupRuns"], panes: { id: string; run: unknown }[]) => utils.rerender(tree(make(setupRuns, panes)));
  return { addSetupPane, revealPane, rerender };
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

describe("ToolsView — Kur", () => {
  it("kurulu olmayan motorda Kur; onay penceresi komutu aynen gösteriyor, Vazgeç hiçbir şey açmıyor", async () => {
    const { addSetupPane } = setupStore();
    await settle();
    fireEvent.click(within(row("codex")).getByRole("button", { name: "Kur" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("npm install -g @openai/codex && exit")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(addSetupPane).not.toHaveBeenCalled();
  });

  it("onaylayınca kurulum bölmesi açılıyor ve öne geliyor", async () => {
    const { addSetupPane, revealPane } = setupStore();
    await settle();
    fireEvent.click(within(row("gemini")).getByRole("button", { name: "Kur" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kur" }));
    expect(addSetupPane).toHaveBeenCalledWith("gemini", "Kurulum: Gemini CLI");
    expect(revealPane).toHaveBeenCalledWith("pane-kur");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("bölme açılamazsa anlaşılır hata", async () => {
    setupStore({ addResult: null });
    await settle();
    fireEvent.click(within(row("codex")).getByRole("button", { name: "Kur" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kur" }));
    expect(within(row("codex")).getByRole("alert").textContent).toContain("Kurulum bölmesi açılamadı");
  });

  it("kurulum sürerken düğme kilitli; bölme kapanınca tespit yenileniyor", async () => {
    const { rerender } = setupStore({ setupRuns: { codex: "p1" }, panes: [{ id: "p1", run: { state: "running", ptyId: "x" } }] });
    await settle();
    const busy = within(row("codex")).getByRole("button", { name: "Kuruluyor…" }) as HTMLButtonElement;
    expect(busy.disabled).toBe(true);
    expect(agentEngines).not.toHaveBeenCalled();
    rerender({ codex: "p1" }, [{ id: "p1", run: { state: "exited", ptyId: "x", code: 0 } }]);
    await settle();
    expect(agentEngines).toHaveBeenCalledWith(true);
    expect(within(row("codex")).getByText("Kurulu · 0.46.0")).toBeTruthy();
  });

  it("kurulu npm motorunda Güncelle aynı yoldan", async () => {
    const { addSetupPane } = setupStore();
    await settle();
    fireEvent.click(within(row("claude")).getByRole("button", { name: "Güncelle" }));
    expect(within(screen.getByRole("dialog")).getByText("npm install -g @anthropic-ai/claude-code && exit")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kur" }));
    expect(addSetupPane).toHaveBeenCalledWith("claude", "Kurulum: Claude Code");
  });

  it("npm yoksa Kur yerine Önce Node.js kur (winget)", async () => {
    const { addSetupPane } = setupStore({ npm: false });
    await settle();
    expect(within(row("codex")).queryByRole("button", { name: "Kur" })).toBeNull();
    fireEvent.click(within(row("codex")).getByRole("button", { name: "Önce Node.js kur" }));
    expect(within(screen.getByRole("dialog")).getByText("winget install OpenJS.NodeJS.LTS && exit")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kur" }));
    expect(addSetupPane).toHaveBeenCalledWith("node", "Kurulum: Node.js");
  });

  it("axet-code ve özel komutta Kur yok", async () => {
    setupStore();
    await settle();
    expect(within(row("ozel")).queryByRole("button", { name: "Kur" })).toBeNull();
    expect(within(row("axet-code")).queryByRole("button", { name: /Kur|Güncelle/ })).toBeNull();
  });
});
