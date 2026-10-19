// @vitest-environment jsdom
// Akış kenar çubuğu (spec 2026-10-18 ajanlar-yeniden §2): SAP satırı, Ekip
// (ajan satırları), olaylar ve soru kartları (eski Kararlar paneli, spec
// 2026-10-17 ajan-alani §4.3, §7), en altta `@ajan` mesaj kutusu.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import FlowSidebar from "../src/agents/FlowSidebar";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext, type QueuedSend } from "../src/agents/flowContext";
import type { FlowEvent } from "../src/agents/flowEvents";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentAnswerResult, AgentQuestion, AgentStatus } from "../app-electron/shared/agentTypes";
import type { AgentSendResult } from "../app-electron/shared/agentMessage";
import { LIST_ANSWER_ENABLED } from "../app-electron/shared/agentDecisions";
import { AGENT_ENGINE_MISSING } from "../app-electron/shared/agentTypes";

let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  send = vi.fn(async (): Promise<AgentSendResult> => ({ ok: true }));
  (window as unknown as { api: unknown }).api = { agentSend: send, memoryRead: vi.fn(async () => ({ ok: false, reason: "invalid" })) };
});
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
const ws = (id: string, panes: TerminalPane[], over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id,
  name: id,
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  ...over
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
const status = (state: AgentStatus["state"]): AgentStatus => ({ state, source: "exact", lastActivity: 1 });

function setup(
  workspaces: TerminalWorkspace[],
  statuses: Record<string, AgentStatus> = {},
  extra: { answer?: AgentAnswerResult; events?: FlowEvent[]; queued?: QueuedSend[] } = {}
) {
  const commands = { revealPane: vi.fn(), restartPane: vi.fn(), enablePaneMemory: vi.fn(), setWorkspaceView: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces, activeWorkspaceId: workspaces[0]?.id ?? null },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  const answer = vi.fn(async () => extra.answer ?? { ok: true as const });
  const agents: AgentStatusValue = { statuses, engines: [], now: 1, answer };
  const record = vi.fn();
  const queue = vi.fn();
  const clear = vi.fn();
  const cancelQueued = vi.fn();
  const retryQueued = vi.fn();
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <FlowContext.Provider value={{ ...EMPTY_FLOW, events: extra.events ?? [], record, queued: extra.queued ?? [], queue, clear, cancelQueued, retryQueued }}>
            <FlowSidebar />
          </FlowContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, answer, record, queue, clear, cancelQueued, retryQueued };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

const box = () => screen.getByRole("combobox", { name: "Ajana mesaj" }) as HTMLTextAreaElement;

describe("Akış — soru kartları (eski Kararlar)", () => {
  it("seçenek düğmesi cevabı doğru dizinle gönderiyor", async () => {
    const { answer } = setup([ws("w1", [pane("a")])], { a: asking(question("c1")) });
    expect(screen.getByText("Hangi renk?")).toBeTruthy();
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

  it("dokunulmuş soru: 'terminalden cevaplayın' ve 'Terminale git'", async () => {
    if (!LIST_ANSWER_ENABLED) return;
    const { commands } = setup([ws("w1", [pane("a")])], { a: asking(question("c1")) }, { answer: { ok: false, reason: "typing" } });
    fireEvent.click(screen.getByRole("button", { name: "Kırmızı" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toBe("Bu soruya terminalde dokunuldu; cevabı terminalden verin.");
    fireEvent.click(screen.getByRole("button", { name: "Terminale git" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("yalnız seçili ekibin soruları; eskisi önce; kapanmış bölmenin sorusu yok; callId çakışması sorun değil", () => {
    setup([ws("w1", [pane("a"), pane("c"), pane("z", { run: { state: "exited", ptyId: "t", code: 0 } })]), ws("w2", [pane("b")])], {
      a: asking(question("same", { askedAt: 50, question: "İkinci soru" })),
      c: asking(question("same", { askedAt: 10, question: "Birinci soru" })),
      b: asking(question("cb", { question: "Öbür ekip" })),
      z: asking(question("cz", { question: "Bayat soru" }))
    });
    const texts = Array.from(document.querySelectorAll("[data-decision] p")).map((p) => p.textContent);
    expect(texts).toEqual(["Birinci soru", "İkinci soru"]);
    expect(screen.queryByText("Öbür ekip")).toBeNull();
    expect(screen.queryByText("Bayat soru")).toBeNull();
  });
});

describe("Akış — ekip ve olaylar", () => {
  it("SAP satırı ekibin bağını söylüyor", () => {
    setup([ws("w1", [], { sap: { uuid: "u", label: "D01" } })]);
    expect(screen.getByText("SAP: D01")).toBeTruthy();
    cleanup();
    setup([ws("w1", [])]);
    expect(screen.getByText("SAP bağlı değil")).toBeTruthy();
  });

  it("ajan satırı: ad, rol, durum; tık bölmeyi Terminal'de öne getiriyor; kabuk bölmesi yok", () => {
    const { commands } = setup(
      [ws("w1", [pane("a", { title: "Ayşe", agent: { engine: "axet-code", role: "Test", roleKind: "preset" } }), { ...pane("s"), kind: "cmd", agent: undefined }])],
      { a: status("running") }
    );
    const row = document.querySelector('[data-agent-row="a"]') as HTMLElement;
    expect(row.textContent).toContain("Ayşe");
    expect(row.textContent).toContain("Test");
    expect(row.textContent).toContain("Çalışıyor");
    expect(document.querySelector('[data-agent-row="s"]')).toBeNull();
    fireEvent.click(row);
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("bellek kapalı ajanda 'Belleği etkinleştir'; bitmiş ajanda 'Yeniden başlat'", () => {
    const { commands } = setup([ws("w1", [pane("a", { run: { state: "exited", ptyId: "t", code: 0 } })])]);
    fireEvent.click(screen.getByRole("button", { name: "Belleği etkinleştir" }));
    expect(commands.enablePaneMemory).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByRole("button", { name: "Yeniden başlat" }));
    expect(commands.restartPane).toHaveBeenCalledWith("a");
  });

  it("olaylar: yalnız seçili ekibinkiler, metinleriyle; boşsa 'Henüz olay yok'", () => {
    const ev = (id: number, workspaceId: string, kind: FlowEvent["kind"], detail = ""): FlowEvent => ({ id, at: 0, workspaceId, kind, paneId: "a", name: "Ayşe", detail });
    setup([ws("w1", [pane("a")]), ws("w2", [])], {}, {
      events: [ev(1, "w1", "started"), ev(2, "w2", "finished"), ev(3, "w1", "assigned", "Derle"), ev(4, "w1", "checkpoint", "istem"), ev(5, "w1", "message", "selam")]
    });
    const items = Array.from(document.querySelectorAll("[data-flow-event]")).map((e) => e.textContent ?? "");
    expect(items).toHaveLength(4);
    // Ajanlar-ux §2: başlıkta kim + çip, altında gövde.
    expect(items[0]).toContain("Ayşe");
    expect(items[0]).toContain("başladı");
    expect(items[0]).toContain("Çalışmaya başladı.");
    expect(items[1]).toContain("İş aldı: Derle");
    expect(items[2]).toContain("Değişiklik kaydı: istem");
    expect(items[3]).toContain("Sen → Ayşe");
    expect(items[3]).toContain("selam");
    cleanup();
    setup([ws("w1", [])]);
    expect(screen.getByText("Henüz olay yok")).toBeTruthy();
  });
});

describe("Akış — mesaj kutusu", () => {
  it("ajan seçilmeden Enter: 'Bir ajan seç (@)', hiçbir şey gönderilmiyor", () => {
    setup([ws("w1", [pane("a", { title: "Ayşe" })])]);
    fireEvent.change(box(), { target: { value: "derle" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(screen.getByRole("status").textContent).toBe("Bir ajan seç (@)");
    expect(send).not.toHaveBeenCalled();
  });

  it("@ listesi klavyeyle: ok + Enter ajanı seçiyor, @sözcük metinden çıkıyor; Enter tek satırı gönderiyor", async () => {
    const { record } = setup([ws("w1", [pane("a", { title: "Ayşe" }), pane("b", { title: "Ali" })])]);
    fireEvent.change(box(), { target: { value: "@a", selectionStart: 2 } });
    const list = screen.getByRole("listbox", { name: "Ajanlar" });
    expect(Array.from(list.querySelectorAll("[role=option]")).map((o) => o.textContent)).toEqual(["Ayşe", "Ali"]);
    fireEvent.keyDown(box(), { key: "ArrowDown" });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    // Tur 3: hedef çipi @ simgesi + ad; aria etiketi "Kime: Ali — değiştir".
    expect(screen.getByRole("button", { name: "Kime: Ali — değiştir" })).toBeTruthy();
    expect(box().value).toBe("");
    fireEvent.change(box(), { target: { value: "testleri çalıştır" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send).toHaveBeenCalledWith("w1", "b", "testleri çalıştır");
    expect(box().value).toBe("");
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ kind: "message", workspaceId: "w1", paneId: "b", name: "Ali", detail: "testleri çalıştır" }));
  });

  it("ret sebebi yazılıyor, metin duruyor, yeniden denenmiyor", async () => {
    send.mockResolvedValueOnce({ ok: false, reason: "busy" });
    const { record } = setup([ws("w1", [pane("a", { title: "Ayşe" })])]);
    fireEvent.change(box(), { target: { value: "@ay", selectionStart: 3 } });
    fireEvent.keyDown(box(), { key: "Enter" });
    fireEvent.change(box(), { target: { value: "derle" } });
    fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Ajan şu an meşgul; işi bitince yeniden gönder.");
    expect(box().value).toBe("derle");
    expect(record).not.toHaveBeenCalled();
  });

  it("@ekip: listede ilk seçenek (2+ ajan); tek satır tüm ekibe sırayla gidiyor, her başarı akışa yazılıyor", async () => {
    const { record } = setup([ws("w1", [pane("a", { title: "Ayşe" }), pane("b", { title: "Ali" })])]);
    fireEvent.change(box(), { target: { value: "@ek", selectionStart: 3 } });
    const options = Array.from(screen.getByRole("listbox").querySelectorAll("[role=option]")).map((o) => o.getAttribute("aria-label") ?? o.textContent);
    expect(options[0]).toBe("ekip — tüm ajanlar (2)");
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(screen.getByRole("button", { name: "Kime: ekip — değiştir" })).toBeTruthy();
    fireEvent.change(box(), { target: { value: "durumu yaz" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send.mock.calls).toEqual([["w1", "a", "durumu yaz"], ["w1", "b", "durumu yaz"]]);
    expect(record).toHaveBeenCalledTimes(2);
    expect(box().value).toBe("");
    expect(screen.getByRole("status").textContent).toBe("Ekibe gönderildi: 2/2 ajan.");
  });

  it("@ekip: meşgul ajan için sebep yazılıyor, yeniden denenmiyor; metin duruyor", async () => {
    send.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, reason: "busy" });
    const { record } = setup([ws("w1", [pane("a", { title: "Ayşe" }), pane("b", { title: "Ali" })])]);
    fireEvent.change(box(), { target: { value: "@", selectionStart: 1 } });
    fireEvent.keyDown(box(), { key: "Enter" });
    fireEvent.change(box(), { target: { value: "derle" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status").textContent).toBe("Ekibe gönderildi: 1/2 ajan. Gitmedi — Ali: meşgul.");
    expect(box().value).toBe("derle");
  });

  it("tek ajanda @ekip seçeneği yok", () => {
    setup([ws("w1", [pane("a", { title: "Ayşe" })])]);
    fireEvent.change(box(), { target: { value: "@", selectionStart: 1 } });
    expect(Array.from(screen.getByRole("listbox").querySelectorAll("[role=option]")).map((o) => o.textContent)).toEqual(["Ayşe"]);
  });

  it("Escape listeyi kapatıyor; seçili ajan çarpıyla kaldırılıyor", () => {
    setup([ws("w1", [pane("a", { title: "Ayşe" })])]);
    fireEvent.change(box(), { target: { value: "@", selectionStart: 1 } });
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.change(box(), { target: { value: "" } });
    fireEvent.change(box(), { target: { value: "@", selectionStart: 1 } });
    fireEvent.mouseDown(screen.getByRole("option", { name: "Ayşe" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajanı kaldır" }));
    expect(screen.queryByText("@Ayşe")).toBeNull();
  });
});

// Eski ekip şeridi kartlarının davranışları (spec 2026-10-17 ajan-alani §4;
// ajan-bellegi §4): Akış'ın ajan satırlarına taşındı.
describe("Akış — ajan satırı (eski ekip kartı)", () => {
  const row = (id: string) => document.querySelector(`[data-agent-row="${id}"]`) as HTMLElement;

  function setupRow(panes: TerminalPane[], over: Partial<AgentStatusValue> = {}) {
    const commands = { revealPane: vi.fn(), restartPane: vi.fn(), enablePaneMemory: vi.fn(), setWorkspaceView: vi.fn() } as unknown as TerminalCommands;
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws("w1", panes, { focusedPaneId: panes[0]?.id ?? null })], activeWorkspaceId: "w1" },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\a",
      agentCwd: "C:\axet"
    };
    const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1_000_000, answer: vi.fn(async () => ({ ok: true as const })), ...over };
    render(
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={agents}>
            <FlowSidebar />
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
    return commands;
  }

  it("kırpılan ad ve rolde tam metin title; motor adı; seçili satır aria-pressed", () => {
    setupRow([pane("x", { title: "Uzun Ajan Adı", agent: { engine: "claude", role: "Uzun Rol Metni", roleKind: "custom" } })]);
    expect((row("x").querySelector("span.truncate.font-medium") as HTMLElement).getAttribute("title")).toBe("Uzun Ajan Adı");
    expect(row("x").querySelector('[title="Uzun Rol Metni"]')).toBeTruthy();
    expect(row("x").textContent).toContain("Claude Code");
    expect(row("x").getAttribute("aria-pressed")).toBe("true");
  });

  it("tahmini durumda ≈ ve ipucu; boşta süresi", () => {
    setupRow([pane("x")], { now: 1_000_000 + 3 * 60_000, statuses: { x: { state: "idle", source: "estimated", lastActivity: 1_000_000 } } });
    expect(row("x").textContent).toContain("Boşta 3 dk");
    const mark = row("x").querySelector("[data-estimated]") as HTMLElement;
    expect(mark.textContent).toBe("≈");
    expect(mark.getAttribute("title")).toBe("Bu motorun durumu terminal hareketinden tahmin ediliyor.");
  });

  it("axet-code sürüm uyarısı motor adının ipucunda", () => {
    setupRow([pane("x")], { engines: [{ id: "axet-code", installed: true, blocked: false, note: "axet-code eski" }] });
    const note = row("x").querySelector("[data-engine-note]") as HTMLElement;
    expect(note.textContent).toBe("axet-code");
    expect(note.getAttribute("title")).toBe("axet-code eski");
  });

  it("motoru kurulu olmayan ajan 'Kurulu değil'; bitmiş ajan 'Yeniden başlat'", () => {
    const commands = setupRow([pane("x", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), pane("y", { title: "Mehmet" })], {
      statuses: { y: { state: "finished", source: "exact", lastActivity: 1 } }
    });
    expect(row("x").textContent).toContain("Kurulu değil");
    const restarts = screen.getAllByRole("button", { name: "Yeniden başlat" });
    fireEvent.click(restarts[restarts.length - 1]);
    expect(commands.restartPane).toHaveBeenCalledWith("y");
  });

  it("bellek kapalı: 'Belleği etkinleştir' komutu, pencere yok, bölme öne gelmiyor", () => {
    const commands = setupRow([pane("x")]);
    fireEvent.click(screen.getByRole("button", { name: "Belleği etkinleştir" }));
    expect(commands.enablePaneMemory).toHaveBeenCalledWith("x");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(commands.revealPane).not.toHaveBeenCalled();
  });

  it("bellek açık: 'Belleği aç' bellek penceresini açıyor", async () => {
    const memoryRead = vi.fn(async () => ({ ok: true, rel: ".ntt-studio/bellek/ayse.md", content: "# Ayşe", stamp: "a".repeat(64), notice: "sent" }));
    (window as unknown as { api: Record<string, unknown> }).api.memoryRead = memoryRead;
    setupRow([pane("x", { title: "Ayşe", agent: { engine: "claude", role: "Test", roleKind: "preset", memory: "ayse" } })]);
    fireEvent.click(screen.getByRole("button", { name: "Belleği aç" }));
    await flush();
    expect(memoryRead).toHaveBeenCalledWith("w1", "x");
    expect(screen.getByRole("dialog", { name: "Ayşe — kalıcı bellek" })).toBeTruthy();
  });
});

describe("Akış — görünüm seçimi", () => {
  it("Akış'ta görünüm sekme grubu yok (içerik alanının dikey rayına taşındı; ajanlar-ux §4)", () => {
    setup([ws("w1", [pane("a")])]);
    expect(screen.queryByRole("tablist", { name: "Görünüm" })).toBeNull();
    expect(document.querySelector("[data-view-tabbar]")).toBeNull();
  });
});

// Ajanlar-ux §2, §3, §6: tek satırlık ajan satırı, ekip başlığı, akışta ajanın cevabı, boş durum.
describe("Akış — ajanın cevabı ve düzen", () => {
  const fin = (id: number, over: Partial<FlowEvent> = {}): FlowEvent => ({ id, at: 0, workspaceId: "w1", kind: "finished", paneId: "a", name: "Ayşe", detail: "", ...over });

  it("bitti olayında son cevap kartta; kısa cevapta 'Devamını göster' yok; 'Terminalde aç' bölmeyi öne getiriyor", () => {
    const { commands } = setup([ws("w1", [pane("a", { title: "Ayşe" })])], {}, { events: [fin(1, { exact: true, reply: "Rapor hazır: 3 tablo eklendi." })] });
    const card = document.querySelector("[data-flow-reply]") as HTMLElement;
    expect(card.textContent).toContain("Rapor hazır: 3 tablo eklendi.");
    expect(document.querySelector('[data-flow-event="finished"]')?.textContent).toContain("cevap");
    expect(screen.queryByRole("button", { name: "Devamını göster" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Terminalde aç" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("Tur 5: 'Belleğe ekle' cevabı ekip belleğine olgu notu olarak ekliyor, sonra 'Belleğe eklendi'", async () => {
    const notesAdd = vi.fn(async (_w: string, input: { title: string }) => ({ ok: true, note: { id: "n-abcd1", ...input } }));
    (window as unknown as { api: Record<string, unknown> }).api.notesAdd = notesAdd;
    setup([ws("w1", [pane("a", { title: "Ayşe" })])], {}, { events: [fin(1, { exact: true, reply: "Fiyat kuruş olarak saklanır.\nAyrıntı" })] });
    fireEvent.click(screen.getByRole("button", { name: "Belleğe ekle" }));
    await flush();
    expect(notesAdd).toHaveBeenCalledWith("w1", expect.objectContaining({ title: "Fiyat kuruş olarak saklanır.", kind: "olgu", owner: "", source: { type: "flow", name: "Ayşe", ref: "1" } }));
    expect(screen.getByRole("status").textContent).toBe("Belleğe eklendi");
    delete (window as unknown as { api: Record<string, unknown> }).api.notesAdd;
  });

  it("uzun cevap dört satıra kırpılı; 'Devamını göster' açıyor, 'Daha az göster' kapatıyor", () => {
    const reply = Array.from({ length: 8 }, (_, i) => `Satır ${i + 1}`).join("\n");
    setup([ws("w1", [pane("a")])], {}, { events: [fin(1, { exact: true, reply })] });
    const text = document.querySelector("[data-flow-reply] p") as HTMLElement;
    expect(text.className).toContain("line-clamp-4");
    const more = screen.getByRole("button", { name: "Devamını göster" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(more);
    expect(text.className).not.toContain("line-clamp-4");
    fireEvent.click(screen.getByRole("button", { name: "Daha az göster" }));
    expect(text.className).toContain("line-clamp-4");
  });

  it("tahmini kaynakta cevap yok: 'İşini bitirdi.' ve terminale yönlendiren bağ", () => {
    const { commands } = setup([ws("w1", [pane("a")])], {}, { events: [fin(1, { exact: false })] });
    expect(document.querySelector("[data-flow-reply]")).toBeNull();
    expect(document.querySelector('[data-flow-event="finished"]')?.textContent).toContain("İşini bitirdi.");
    const link = document.querySelector("[data-reply-terminal]") as HTMLElement;
    expect(link.getAttribute("title")).toBe("Cevabı terminalde; bu motorun cevabı okunamıyor.");
    fireEvent.click(link);
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("ajan satırı TEK satır: ad, rol, durum çipi aynı satırda; motor adı yalnız uyarıda görünür", () => {
    setup([ws("w1", [pane("a", { title: "Ayşe", agent: { engine: "axet-code", role: "Test", roleKind: "preset" } })])], { a: status("running") });
    const row = document.querySelector('[data-agent-row="a"]') as HTMLElement;
    expect(row.className.split(" ")).toEqual(expect.arrayContaining(["flex", "h-8", "items-center"]));
    expect(row.className).not.toContain("flex-col");
    expect(row.querySelector("[data-chip]")?.textContent).toContain("Çalışıyor");
    expect((row.querySelector("[data-engine-note]") ?? row.querySelector(".sr-only"))?.className).toContain("sr-only");
  });

  it("bellek düğmesi satırın üstüne gelince/odakta beliriyor (gizli ama erişilebilir)", () => {
    setup([ws("w1", [pane("a")])]);
    const memory = screen.getByRole("button", { name: "Belleği etkinleştir" });
    expect(memory.className).toContain("opacity-0");
    expect(memory.className).toContain("group-hover:opacity-100");
    expect(memory.className).toContain("focus-visible:opacity-100");
  });

  it("ekip başlığı: ad, kaç ajan çalışıyor ve soru soruyor", () => {
    setup([ws("w1", [pane("a"), pane("b"), pane("c")], { name: "Satış" })], { a: status("running"), b: status("running"), c: asking(question("q1")) });
    const header = document.querySelector("[data-flow-header]") as HTMLElement;
    expect(header.textContent).toContain("Satış");
    expect(header.textContent).toContain("2 çalışıyor");
    expect(header.textContent).toContain("1 soru");
  });

  it("hiç ajan yokken net çağrı: 'İlk ajanını ekle' ekle isteğini yayınlıyor", () => {
    const heard = vi.fn();
    window.addEventListener("ntt:add-agent", heard);
    setup([ws("w1", [])]);
    expect(document.querySelector("[data-flow-empty]")?.textContent).toContain("Ekipte henüz ajan yok");
    fireEvent.click(screen.getByRole("button", { name: "İlk ajanını ekle" }));
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener("ntt:add-agent", heard);
  });

  it("mesaj kutusu demodaki gibi ekibe yazıyor: ipucu metni", () => {
    setup([ws("w1", [pane("a")])]);
    expect(box().getAttribute("placeholder")).toBe("Ekibe yaz… @ ile ajan seç");
  });
});

// Tur 3: çok satırlı mesaj kutusu, hedef çipi seçicisi, belleğe bağlantı.
describe("Akış — mesaj kutusu (Tur 3)", () => {
  it("çok satırlı alan: Shift+Enter göndermiyor; Enter satırları tek satır olarak gönderiyor", async () => {
    setup([ws("w1", [pane("a", { title: "Ayşe" })])]);
    expect(box().tagName).toBe("TEXTAREA");
    fireEvent.change(box(), { target: { value: "@ay", selectionStart: 3 } });
    fireEvent.keyDown(box(), { key: "Enter" });
    fireEvent.change(box(), { target: { value: "birinci satır" } });
    fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
    expect(send).not.toHaveBeenCalled();
    fireEvent.change(box(), { target: { value: "birinci satır\nikinci   satır" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send).toHaveBeenCalledWith("w1", "a", "birinci satır ikinci satır");
  });

  it("hedef çipi: tıkla listeyi açıyor, seçince çip ajanın adı; gönder simge düğmesi etiketli", () => {
    setup([ws("w1", [pane("a", { title: "Ayşe" }), pane("b", { title: "Ali" })])]);
    const chip = screen.getByRole("button", { name: "Kime: ajan seç" });
    expect(chip.getAttribute("aria-haspopup")).toBe("listbox");
    fireEvent.click(chip);
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["ekip", "Ayşe", "Ali"]);
    fireEvent.mouseDown(options[2]);
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Kime: Ali — değiştir" })).toBeTruthy();
    expect(box().getAttribute("placeholder")).toContain("Ali");
    expect(screen.getByRole("button", { name: "Gönder" }).textContent).toBe("");
  });

  it("başlıktaki bellek düğmesi Bellek görünümünü açıyor", () => {
    const { commands } = setup([ws("w1", [pane("a", { title: "Ayşe" })])]);
    fireEvent.click(screen.getByRole("button", { name: "Kalıcı bellek" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("w1", "memory");
  });
});

// Tur 4: ajandan ajana kart, kuyruk kartı, açılış seçimindeki ajana mesaj, geçmişi temizle.
describe("Akış — Tur 4", () => {
  it("ekip köprüsü mesajı 'A → B' kartı olarak", () => {
    setup([ws("w1", [pane("a", { title: "Ayşe" }), pane("b", { title: "Ali" })])], {}, {
      events: [{ id: 1, at: 1, workspaceId: "w1", kind: "relay", paneId: "a", name: "Ayşe → Ali", detail: "Raporun durumu ne?" }]
    });
    const card = document.querySelector('[data-flow-event="relay"]') as HTMLElement;
    expect(card.textContent).toContain("Ayşe → Ali");
    expect(card.textContent).toContain("Raporun durumu ne?");
  });

  it("açılış seçimindeki ajana mesaj gönderilmiyor, kuyruğa alınıyor", async () => {
    const statuses = { a: { state: "idle" as const, source: "estimated" as const, lastActivity: null, detail: "setup" } };
    const { queue } = setup([ws("w1", [pane("a", { title: "Ayşe" })])], statuses);
    fireEvent.change(box(), { target: { value: "@ay", selectionStart: 3 } });
    fireEvent.keyDown(box(), { key: "Enter" });
    fireEvent.change(box(), { target: { value: "derle" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send).not.toHaveBeenCalled();
    expect(queue).toHaveBeenCalledWith({ workspaceId: "w1", paneId: "a", name: "Ayşe", body: "derle" });
    expect(box().value).toBe("");
  });

  it("kuyruk kartı: bekliyor / başarısız (Yeniden gönder, Vazgeç, Terminalde aç)", () => {
    const { retryQueued, cancelQueued, commands } = setup([ws("w1", [pane("a", { title: "Ayşe" })])], {}, {
      queued: [{ workspaceId: "w1", paneId: "a", name: "Ayşe", body: "derle", state: "failed", reason: "busy" }]
    });
    const card = document.querySelector("[data-flow-queued]") as HTMLElement;
    expect(card.getAttribute("data-flow-queued")).toBe("failed");
    expect(card.textContent).toContain("gönderilemedi");
    fireEvent.click(screen.getByRole("button", { name: "Yeniden gönder" }));
    expect(retryQueued).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(cancelQueued).toHaveBeenCalledWith("a");
    fireEvent.click(within(card).getByRole("button", { name: "Terminalde aç" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("geçmişi temizle onay istiyor", () => {
    const { clear } = setup([ws("w1", [pane("a", { title: "Ayşe" })])], {}, {
      events: [{ id: 1, at: 1, workspaceId: "w1", kind: "started", paneId: "a", name: "Ayşe", detail: "" }]
    });
    fireEvent.click(screen.getByRole("button", { name: "Akış geçmişini temizle" }));
    expect(clear).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Temizle" }));
    expect(clear).toHaveBeenCalledWith("w1");
  });
});
