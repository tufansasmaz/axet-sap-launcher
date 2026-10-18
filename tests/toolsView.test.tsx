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
