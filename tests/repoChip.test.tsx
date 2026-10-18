// @vitest-environment jsdom
// Üst şeritteki depo çipi (Tur 3): ekibin kökü = ajanların/kabukların klasörü
// ve Değişiklikler'in deposu. Bağlı değilse "Depo bağla"; git deposu değilse açık uyarı.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import RepoChip from "../src/agents/RepoChip";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";

let repo = "ok";
beforeEach(() => {
  repo = "ok";
  (window as unknown as { api: unknown }).api = {
    pickFolder: vi.fn(async () => "C:\\proje\\satis"),
    changesState: vi.fn(async (id: string) => ({ workspaceId: id, repo, checkpoints: [], expired: [] })),
    onChangesChanged: vi.fn(() => () => {})
  };
});
afterEach(cleanup);

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

function setup(root?: string) {
  const ws: TerminalWorkspace = { id: "w1", name: "Satış", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, ...(root ? { root } : {}) };
  const commands = { setWorkspaceRoot: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <RepoChip workspace={ws} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

describe("RepoChip", () => {
  it("bağlı değil: 'Depo bağla' → klasör seç → ekibin kökü olur (SAP bağı düşer)", async () => {
    const commands = setup();
    const button = screen.getByRole("button", { name: "Depo bağla" });
    expect(button.getAttribute("title")).toContain("C:\\axet");
    fireEvent.click(button);
    await flush();
    expect(commands.setWorkspaceRoot).toHaveBeenCalledWith("w1", "C:\\proje\\satis", null);
  });

  it("bağlı ve git deposu: klasör adı çipi; × bağı kaldırır", async () => {
    const commands = setup("C:\\proje\\satis");
    await flush();
    const chip = document.querySelector("[data-repo-chip]") as HTMLElement;
    expect(chip.getAttribute("data-repo-chip")).toBe("ok");
    expect(screen.getByRole("button", { name: "Depo: satis — değiştir" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Depo bağını kaldır" }));
    expect(commands.setWorkspaceRoot).toHaveBeenCalledWith("w1", null, null);
  });

  it("git deposu değilse açık uyarı", async () => {
    repo = "notRepo";
    setup("C:\\belgeler");
    await flush();
    expect(document.querySelector("[data-repo-chip]")?.getAttribute("data-repo-chip")).toBe("warning");
    expect(screen.getByText("Git deposu değil")).toBeTruthy();
  });
});
