// @vitest-environment jsdom
// Kararlar paneli (spec 2026-10-17 ajan-alani §4.3, §7).
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import DecisionsPanel from "../src/agents/DecisionsPanel";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentAnswerResult, AgentQuestion, AgentStatus } from "../app-electron/shared/agentTypes";
import { LIST_ANSWER_ENABLED } from "../app-electron/shared/agentDecisions";

afterEach(cleanup);

const pane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`,
  ...over
});
const ws = (id: string, panes: TerminalPane[]): TerminalWorkspace => ({
  id,
  name: id,
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
});
const question = (callId: string, over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId,
  question: "Hangi renk?",
  header: "",
  options: ["Kırmızı", "Mavi"],
  multiSelect: false,
  askedAt: 1,
  ...over
});
const asking = (q: AgentQuestion): AgentStatus => ({ state: "asking", source: "exact", lastActivity: 1, question: q });

function setup(workspaces: TerminalWorkspace[], statuses: Record<string, AgentStatus>, answerResult: AgentAnswerResult = { ok: true }) {
  const commands = { revealPane: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces, activeWorkspaceId: workspaces[0]?.id ?? null },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  const answer = vi.fn(async () => answerResult);
  const agents: AgentStatusValue = { statuses, engines: [], now: 1, answer };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <DecisionsPanel />
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, answer };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("DecisionsPanel", () => {
  it("bekleyen karar yoksa dar ve 'Bekleyen karar yok' diyor", () => {
    setup([ws("w1", [pane("a")])], {});
    const button = screen.getByRole("button", { name: "Bekleyen karar yok" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.queryByText("Hangi renk?")).toBeNull();
  });

  it("seçenek düğmesi cevabı doğru dizinle gönderiyor", async () => {
    const { answer } = setup([ws("w1", [pane("a")])], { a: asking(question("c1")) });
    expect(screen.getByText("Hangi renk?")).toBeTruthy();
    expect(screen.getByText("Ajan a")).toBeTruthy();
    if (!LIST_ANSWER_ENABLED) {
      expect(screen.queryByRole("button", { name: "Mavi" })).toBeNull();
      return;
    }
    fireEvent.click(screen.getByRole("button", { name: "Mavi" }));
    await flush();
    expect(answer).toHaveBeenCalledWith("a", "c1", 1);
  });

  it("çok seçimli soru: seçenek yok, 'Terminale git' bölmeyi öne getiriyor", () => {
    const { commands } = setup([ws("w1", [pane("a")])], { a: asking(question("c1", { multiSelect: true })) });
    expect(screen.queryByRole("button", { name: "Kırmızı" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Terminale git" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("dokunulmuş soru: tuş gönderilmedi, 'terminalden cevaplayın' ve 'Terminale git' görünüyor", async () => {
    if (!LIST_ANSWER_ENABLED) return;
    const { commands } = setup([ws("w1", [pane("a")])], { a: asking(question("c1")) }, { ok: false, reason: "typing" });
    fireEvent.click(screen.getByRole("button", { name: "Kırmızı" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toBe("Bu soruya terminalde dokunuldu; cevabı terminalden verin.");
    fireEvent.click(screen.getByRole("button", { name: "Terminale git" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("bütün alanların soruları eskisi önce; kapanmış bölmenin eski sorusu yok", () => {
    setup([ws("w1", [pane("a"), pane("z", { run: { state: "exited", ptyId: "t", code: 0 } })]), ws("w2", [pane("b")])], {
      a: asking(question("ca", { askedAt: 50, question: "İkinci soru" })),
      b: asking(question("cb", { askedAt: 10, question: "Birinci soru" })),
      z: asking(question("cz", { question: "Bayat soru" }))
    });
    const texts = Array.from(document.querySelectorAll("[data-decision] p")).map((p) => p.textContent);
    expect(texts).toEqual(["Birinci soru", "İkinci soru"]);
    expect(screen.queryByText("Bayat soru")).toBeNull();
  });

  it("katlanıyor ve sayaçla açılıyor", () => {
    setup([ws("w1", [pane("a")])], { a: asking(question("c1")) });
    fireEvent.click(screen.getByRole("button", { name: "Kararları gizle" }));
    expect(screen.queryByText("Hangi renk?")).toBeNull();
    expect(screen.getByText("1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kararları göster" }));
    expect(screen.getByText("Hangi renk?")).toBeTruthy();
  });

  it("katlama düğmesi aria-expanded ve aria-controls taşıyor", () => {
    setup([ws("w1", [pane("a")])], { a: asking(question("c1")) });
    const hideBtn = screen.getByRole("button", { name: "Kararları gizle" });
    expect(hideBtn.getAttribute("aria-expanded")).toBe("true");
    expect(hideBtn.getAttribute("aria-controls")).toBe("decisions-panel-body");
    fireEvent.click(hideBtn);
    const showBtn = screen.getByRole("button", { name: "Kararları göster" });
    expect(showBtn.getAttribute("aria-expanded")).toBe("false");
    expect(showBtn.getAttribute("aria-controls")).toBe("decisions-panel-body");
  });

  it("iki ajanın callId çakışması durumunda satır key'i paneId:callId ile tekil", () => {
    setup(
      [ws("w1", [pane("a"), pane("b")])],
      {
        a: asking(question("same-id", { question: "A sorusu" })),
        b: asking(question("same-id", { question: "B sorusu" }))
      }
    );
    expect(screen.getByText("A sorusu")).toBeTruthy();
    expect(screen.getByText("B sorusu")).toBeTruthy();
  });
});
