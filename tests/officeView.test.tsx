// @vitest-environment jsdom
// Piksel ofis bileşeni (spec 2026-10-18 ajanlar-yeniden §3, §2b). jsdom'da
// canvas yok: çizim katmanı sessizce düşüyor, HTML katmanı (masa düğmeleri,
// ad etiketi, durum çipi, alt görev satırı) her zaman var ve burada sınanıyor.
// Eski ızgara/SVG testlerinden bilinçli çevrildi: satır kutuları yerine kat
// planındaki masa konumları, SVG sınıfları yerine data-animated/data-beams.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import OfficeView, { fitOf, nightOf, replyLine } from "../src/office/OfficeView";
import { ZOOMS } from "../src/office/officeSim";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import { AGENT_ENGINE_MISSING, type AgentQuestion, type AgentState, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { Board, BoardTask, Subtask } from "../app-electron/shared/boardTypes";

let getContext: ReturnType<typeof vi.fn>;
beforeEach(() => {
  getContext = vi.fn(() => null);
  (HTMLCanvasElement.prototype as unknown as { getContext: unknown }).getContext = getContext;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

function commandsMock(): TerminalCommands {
  return {
    restore: vi.fn(),
    startFresh: vi.fn(),
    addWorkspace: vi.fn(),
    selectWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    closeWorkspace: vi.fn(),
    addPane: vi.fn(),
    addAgent: vi.fn(),
    addAgentAt: vi.fn(),
    revealPane: vi.fn(),
    setWorkspaceRoot: vi.fn(),
    setWorkspaceVerify: vi.fn(),
    setWorkspaceView: vi.fn(),
    setWorkspaceBrowserUrl: vi.fn(),
    enablePaneMemory: vi.fn(),
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn(),
    movePane: vi.fn(),
    resizeSplit: vi.fn(),
    equalizeSplit: vi.fn(),
    minimizePane: vi.fn(),
    restorePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    setPaneFontSize: vi.fn(),
    addSetupPane: vi.fn(() => null)
  };
}

const NOW = 10_000_000;
const agentPane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "coder", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`,
  ...over
});
const shellPane = (id: string): TerminalPane => ({ id, kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: `t-${id}` } });
const workspace = (panes: TerminalPane[], over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes,
  focusedPaneId: panes[0]?.id ?? null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "office",
  ...over
});
const st = (state: AgentState, source: "exact" | "estimated" = "exact", over: Partial<AgentStatus> = {}): AgentStatus => ({
  state,
  source,
  lastActivity: null,
  ...over
});
const q = (question: string): AgentQuestion => ({ callId: "c1", question, header: "", options: ["Evet", "Hayır"], multiSelect: false, askedAt: 1 });
const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: id,
  prompt: `İstem ${id}`,
  roleHint: "",
  dependsOn: [],
  state: "ready",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (id: string, subtasks: Subtask[]): BoardTask => ({ id, title: id, goal: "Hedef", state: "running", createdAt: 1, approvedAt: 2, subtasks });
const LONG_QUESTION = "Bu tabloya yeni bir alan eklensin mi, yoksa mevcut yapı mıdır korunsun, karar ver lütfen";

interface Opts {
  statuses?: Record<string, AgentStatus>;
  board?: Board;
  language?: "tr" | "en";
  visible?: boolean;
}

function setup(ws: TerminalWorkspace, opts: Opts = {}) {
  const commands = commandsMock();
  const onAddAgent = vi.fn();
  const ui = (o: Opts) => {
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: ws.id },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a",
      setupRuns: {}
    };
    const agents: AgentStatusValue = { statuses: o.statuses ?? {}, engines: [], now: NOW, answer: vi.fn(async () => ({ ok: true as const })) };
    const boards: BoardContextValue = {
      boards: o.board ? { [ws.id]: o.board } : {},
      command: vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true }))
    };
    return (
      <LanguageProvider language={o.language ?? "tr"}>
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={agents}>
            <BoardContext.Provider value={boards}>
              {o.visible === undefined ? (
                <OfficeView workspace={ws} onAddAgent={onAddAgent} />
              ) : (
                <OfficeView workspace={ws} onAddAgent={onAddAgent} visible={o.visible} />
              )}
            </BoardContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const r = render(ui(opts));
  return { commands, onAddAgent, rerender: (o: Opts) => r.rerender(ui(o)) };
}

const seat = (id: string) => document.querySelector(`[data-office-seat="${id}"]`) as HTMLButtonElement;
const stage = () => document.querySelector("[data-office-stage]") as HTMLElement;
const reduceMotion = () => {
  (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn((media: string) => ({
    matches: true,
    media,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));
};

describe("OfficeView — kat planı ve HTML katmanı", () => {
  it("5 ajan masalarda, kat planı sırasıyla; kabuk koltuk değil, köşede '1 terminal'; canvas ekran okuyucudan gizli", () => {
    setup(workspace([...["p1", "p2", "p3", "p4", "p5"].map((id) => agentPane(id)), shellPane("s1")]));
    const items = within(screen.getByRole("list", { name: "Masalar" })).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items.map((li) => li.querySelector("[data-office-seat]")?.getAttribute("data-office-seat"))).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    // Konumlar kat planından: sıra soldan sağa, sonra aşağı.
    const pos = items.map((li) => [parseFloat(li.style.top), parseFloat(li.style.left)]);
    expect(pos).toEqual([...pos].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
    expect(new Set(pos.map((p) => p.join(","))).size).toBe(5);
    expect(seat("s1")).toBeNull();
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("1 terminal");
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas.getAttribute("aria-hidden")).toBe("true");
    expect(canvas.style.imageRendering).toBe("pixelated");
  });

  it("lider rolündeki ajan lider masasında, ötekiler sırayla çalışma masalarında", () => {
    setup(workspace([agentPane("p1"), agentPane("lead", { agent: { engine: "axet-code", role: "Takım lideri", roleKind: "custom" } }), agentPane("p2")]));
    const desk = (id: string) => (seat(id).closest("li") as HTMLElement).getAttribute("data-office-desk");
    expect(desk("lead")).toBe("lead");
    expect(desk("p1")).toBe("desk0");
    expect(desk("p2")).toBe("desk1");
  });

  it("masalar dolunca (9 ajan, lider yok) taşan ajan toplantı masasının taburesinde; kimse üst üste değil", () => {
    const ids = ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9"];
    setup(workspace(ids.map((id) => agentPane(id))));
    const desks = ids.map((id) => (seat(id).closest("li") as HTMLElement).getAttribute("data-office-desk"));
    expect(desks.slice(0, 8)).toEqual(["desk0", "desk1", "desk2", "desk3", "desk4", "desk5", "desk6", "desk7"]);
    expect(desks[8]).toMatch(/^stool/);
    const pos = ids.map((id) => {
      const li = seat(id).closest("li") as HTMLElement;
      return `${li.style.left},${li.style.top}`;
    });
    expect(new Set(pos).size).toBe(9);
  });

  it("kredi satırı ekranda yok", () => {
    // Düzen rev.2 (2026-10-18): data-office-credit kaldırıldı.
    setup(workspace([agentPane("p1")]));
    expect(document.querySelector("[data-office-credit]")).toBeNull();
  });

  it("canvas yoksa (getContext null) sessizce yalnız HTML katmanı", () => {
    setup(workspace([agentPane("p1")]), { statuses: { p1: st("running") } });
    expect(getContext).toHaveBeenCalled();
    expect(seat("p1")).toBeTruthy();
  });

  it("canvas varsa sahne çiziliyor (fillRect), hata yok", () => {
    const calls: string[] = [];
    const ctx = new Proxy({} as Record<string | symbol, unknown>, {
      get(target, key) {
        if (key === "canvas") return { width: 100, height: 100 };
        if (key in target) return target[key];
        return (..._args: unknown[]) => {
          calls.push(String(key));
          return undefined;
        };
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      }
    });
    getContext.mockImplementation(() => ctx);
    setup(workspace([agentPane("p1"), agentPane("p2")]), { statuses: { p1: st("running"), p2: st("asking", "exact", { question: q("Devam?") }) } });
    expect(calls).toContain("fillRect");
    expect(calls).toContain("setTransform");
  });

  it("boş durum: 'Ofiste kimse yok' + Ajan düğmesi pencereyi istiyor; kabuk notu yine var; canvas yok", () => {
    const { onAddAgent } = setup(workspace([shellPane("s1"), shellPane("s2")]));
    const office = screen.getByRole("region", { name: "Ofis görünümü" });
    expect(within(office).getByText("Ofiste kimse yok")).toBeTruthy();
    expect(within(office).getByText("Ajan ekleyince masasına oturur; ne yaptığını buradan izlersin.")).toBeTruthy();
    fireEvent.click(within(office).getByRole("button", { name: "Ajan" }));
    expect(onAddAgent).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("2 terminal");
    expect(screen.queryByRole("list", { name: "Masalar" })).toBeNull();
    expect(document.querySelector("canvas")).toBeNull();
  });

  it("kabuk yoksa terminal notu yok", () => {
    setup(workspace([agentPane("p1")]));
    expect(document.querySelector("[data-office-shells]")).toBeNull();
  });
});

describe("OfficeView — etkileşim", () => {
  it("tıklama: revealPane; setWorkspaceView revealPane içinde", () => {
    const { commands } = setup(workspace([agentPane("p1"), agentPane("p2")]));
    fireEvent.click(seat("p1"));
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
    expect(commands.setWorkspaceView).not.toHaveBeenCalled();
    fireEvent.click(seat("p2").querySelector("[data-office-name]") as HTMLElement);
    expect(commands.revealPane).toHaveBeenLastCalledWith("p2");
  });

  it("klavye: masa sırasıyla doğal düğmeler (Enter/Space tarayıcıdan); aria-label '<ad>, <durum>'; odak halkası lime", () => {
    setup(workspace([agentPane("p1"), agentPane("p2", { agent: { engine: "claude", role: "", roleKind: "custom" } })]), {
      statuses: { p1: st("running"), p2: st("running", "estimated") }
    });
    const buttons = within(screen.getByRole("list", { name: "Masalar" })).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("data-office-seat"))).toEqual(["p1", "p2"]);
    expect(buttons.every((b) => b.tagName === "BUTTON" && b.getAttribute("type") === "button" && b.getAttribute("tabindex") === null)).toBe(true);
    expect(buttons[0].getAttribute("aria-label")).toBe("Ajan p1, Çalışıyor");
    expect(buttons[1].getAttribute("aria-label")).toBe("Ajan p2, Çalışıyor (tahmini)");
    expect(buttons[0].className).toContain("focus-visible:ring-accent-500");
    buttons[1].focus();
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("aria-label: soru metni ve alt görev başlığını ekran okuyucuya ulaştırıyor", () => {
    const title = "Siparis tablosuna alan ekle";
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      statuses: { p1: st("asking", "exact", { question: q("Devam edilsin mi?") }) },
      board: { workspaceId: "a", tasks: [task("t", [sub("x", { title, state: "running", paneId: "p2" })])] }
    });
    expect(seat("p1").getAttribute("aria-label")).toBe("Ajan p1, Soru soruyor, Devam edilsin mi?");
    expect(seat("p2").getAttribute("aria-label")).toContain(title);
  });

  it("seçim: odaktaki ajanın etiketi lime çerçeveli, ötekinde yok; kırpılan adda title", () => {
    setup(workspace([agentPane("p1", { title: "Çok Uzun Bir Ajan Adı Burada" }), agentPane("p2")], { focusedPaneId: "p2" }));
    expect(seat("p2").getAttribute("aria-pressed")).toBe("true");
    expect(seat("p2").querySelector("[data-office-name]")?.className).toContain("border-accent-500/60");
    expect(seat("p1").getAttribute("aria-pressed")).toBe("false");
    expect(seat("p1").querySelector("[data-office-name]")?.className).not.toContain("border-accent");
    expect(seat("p1").querySelector('[title="Çok Uzun Bir Ajan Adı Burada"]')).toBeTruthy();
  });
});

describe("OfficeView — durum", () => {
  it("poz ve çip: kesin/tahmini, bilinmiyor, boşta süresi, kurulu değil, hata", () => {
    setup(
      workspace([agentPane("p1"), agentPane("p2"), agentPane("p3", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), agentPane("p4"), agentPane("p5")]),
      { statuses: { p2: st("idle", "exact", { lastActivity: NOW - 3 * 60_000 }), p4: st("error"), p5: st("running", "estimated") } }
    );
    expect(seat("p1").getAttribute("data-pose")).toBe("unknown");
    expect(seat("p1").textContent).toContain("Bilinmiyor");
    expect(seat("p1").querySelector("[data-estimated]")).toBeNull();
    expect(seat("p2").getAttribute("data-pose")).toBe("resting");
    expect(seat("p2").textContent).toContain("Boşta 3 dk");
    expect(seat("p3").getAttribute("data-pose")).toBe("absent");
    expect(seat("p3").textContent).toContain("Kurulu değil");
    expect(seat("p4").getAttribute("data-pose")).toBe("error");
    expect(seat("p4").querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("danger");
    expect(seat("p5").getAttribute("data-pose")).toBe("typing");
    expect(seat("p5").querySelector("[data-estimated]")?.textContent).toBe("≈");
  });

  it("soru: kesin asking'te çipin title'ı ilk 60 karakter; tahminide metin yok", () => {
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      statuses: { p1: st("asking", "exact", { question: q(LONG_QUESTION) }), p2: st("asking", "estimated", { question: q(LONG_QUESTION) }) }
    });
    const chip = seat("p1").querySelector("[data-office-chip]") as HTMLElement;
    const title = chip.getAttribute("title") ?? "";
    expect(Array.from(title)).toHaveLength(60);
    expect(title.endsWith("…")).toBe(true);
    expect(seat("p2").getAttribute("data-pose")).toBe("asking");
    expect(seat("p2").querySelector("[data-office-chip]")?.getAttribute("title")).toBeNull();
  });

  it("alt görev: en çok 40 karakter, title tam metin; görevsiz ajanda ve pano yokken satır yok", () => {
    const title = "Sipariş tablosuna iade nedeni alanını ekle ve testleri yaz";
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      board: { workspaceId: "a", tasks: [task("t", [sub("x", { title, state: "running", paneId: "p1" })])] }
    });
    const row = seat("p1").querySelector("[data-office-task]") as HTMLElement;
    expect(Array.from(row.textContent ?? "")).toHaveLength(40);
    expect(row.getAttribute("title")).toBe(title);
    expect(seat("p2").querySelector("[data-office-task]")).toBeNull();
    cleanup();
    setup(workspace([agentPane("p1")]));
    expect(document.querySelector("[data-office-task]")).toBeNull();
  });
});

describe("OfficeView — hareket", () => {
  // Ajanlar-ux §6 (bilinçli güncelleme): tahminide tam döngü yine yok ama ofis
  // donuk da değil — ortam animasyonu (sunucu LED'leri) düşük hızda çalışıyor;
  // hareketi azaltta ve görünmezken o da yok.
  it("kesin çalışmada döngü var; tahminide yok ama ortam canlı; hareketi azaltta ve görünmezken ikisi de yok", () => {
    setup(workspace([agentPane("p1")]), { statuses: { p1: st("running") } });
    expect(stage().getAttribute("data-animated")).toBe("true");
    expect(stage().getAttribute("data-ambient")).toBe("false");
    cleanup();
    setup(workspace([agentPane("p1")]), { statuses: { p1: st("running", "estimated") } });
    expect(stage().getAttribute("data-animated")).toBe("false");
    expect(stage().getAttribute("data-ambient")).toBe("true");
    cleanup();
    setup(workspace([agentPane("p1")]), { statuses: { p1: st("running") }, visible: false });
    expect(stage().getAttribute("data-animated")).toBe("false");
    expect(stage().getAttribute("data-ambient")).toBe("false");
    cleanup();
    reduceMotion();
    setup(workspace([agentPane("p1")]), { statuses: { p1: st("running", "estimated") } });
    expect(stage().getAttribute("data-animated")).toBe("false");
    expect(stage().getAttribute("data-ambient")).toBe("false");
  });

  it("varsayılan yakınlık alanı dolduruyor (koyu şerit yok); en uzak/yakın kademede sınırlı", () => {
    // 1600×900 dünya: geniş alan yüksekliği, dar alan genişliği taşırıyor.
    expect(fitOf(1600, 450)).toBe(1);
    expect(fitOf(800, 900)).toBe(1);
    expect(fitOf(1600, 900)).toBe(1);
    expect(fitOf(10, 10)).toBe(ZOOMS[0]);
    expect(fitOf(100000, 100000)).toBe(ZOOMS[ZOOMS.length - 1]);
  });

  it("ışın: alt görev yeni atanınca ~800 ms; açılışta ve hareketi azaltta yok", () => {
    vi.useFakeTimers();
    const board = (paneId: string | null): Board => ({ workspaceId: "a", tasks: [task("t", [sub("x", { state: "running", paneId })])] });
    const panes = [agentPane("lead", { agent: { engine: "axet-code", role: "Lider", roleKind: "custom" } }), agentPane("p2")];
    const { rerender } = setup(workspace(panes), { board: board("p2") });
    expect(stage().getAttribute("data-beams")).toBe("0");
    rerender({ board: board(null) });
    expect(stage().getAttribute("data-beams")).toBe("0");
    rerender({ board: board("p2") });
    expect(stage().getAttribute("data-beams")).toBe("1");
    expect(stage().getAttribute("data-animated")).toBe("true");
    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(stage().getAttribute("data-beams")).toBe("0");
    cleanup();
    reduceMotion();
    const second = setup(workspace(panes), { board: board(null) });
    second.rerender({ board: board("p2") });
    expect(stage().getAttribute("data-beams")).toBe("0");
  });
});

describe("OfficeView — İngilizce", () => {
  it("boş durum, bölge adı, terminal notu ve tahmini eki", () => {
    setup(workspace([shellPane("s1")]), { language: "en" });
    const office = screen.getByRole("region", { name: "Office view" });
    expect(within(office).getByText("Nobody in the office")).toBeTruthy();
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("Terminals: 1");
    cleanup();
    setup(workspace([agentPane("p1")]), { language: "en", statuses: { p1: st("idle", "estimated") } });
    expect(seat("p1").getAttribute("aria-label")).toBe("Ajan p1, Idle (estimated)");
    expect(screen.getByRole("list", { name: "Desks" })).toBeTruthy();
  });
});

describe("OfficeView — ofis turu 2026-10-20: balon, bilgi kartı, üst çubuk", () => {
  it("küçük harita yok; üst çubukta alan adı ve 'N/M aktif' (çalışan + soru soran)", () => {
    setup(workspace([agentPane("p1"), agentPane("p2"), agentPane("p3")]), {
      statuses: { p1: st("running", "exact"), p2: st("asking", "exact", { question: q("Hangisi?") }), p3: st("idle", "exact") }
    });
    expect(document.querySelectorAll("[data-office-stage] canvas")).toHaveLength(1);
    expect(document.querySelector("[data-office-active]")?.textContent).toBe("2/3 aktif");
  });

  it("kesin soru HTML balonda (belirgin 'Soru' başlığı); tahminide balon yok; söz balonu başta gizli", () => {
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      statuses: { p1: st("asking", "exact", { question: q("ZF2 mi F2 mi?") }), p2: st("asking", "estimated", { question: q("ZF2 mi F2 mi?") }) }
    });
    const li1 = seat("p1").closest("li") as HTMLElement;
    const ask = li1.querySelector("[data-office-ask]") as HTMLElement;
    expect(ask.textContent).toContain("Soru");
    expect(ask.textContent).toContain("ZF2 mi F2 mi?");
    expect((seat("p2").closest("li") as HTMLElement).querySelector("[data-office-ask]")).toBeNull();
    expect((li1.querySelector("[data-office-say]") as HTMLElement).hidden).toBe(true);
  });

  it("üzerine gelince kart: ad, rol, durum, aşama, görev yoksa 'Şu an görevi yok'; ayrılınca kapanır", () => {
    setup(workspace([agentPane("p1")]), {
      statuses: { p1: st("running", "exact", { phase: { kind: "tool", tool: "read", target: "a.abap" } }) }
    });
    expect(document.querySelector("[data-office-card]")).toBeNull();
    fireEvent.mouseEnter(seat("p1"));
    const card = screen.getByRole("tooltip");
    expect(card.textContent).toContain("Ajan p1");
    expect(card.textContent).toContain("coder");
    expect(card.textContent).toContain("Çalışıyor");
    expect(card.textContent).toContain("a.abap");
    expect(card.textContent).toContain("Şu an görevi yok");
    expect(seat("p1").getAttribute("aria-describedby")).toBe(card.id);
    fireEvent.mouseLeave(seat("p1"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("kartta son cevabın özeti (boşta, kesin) ve soru metni", () => {
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      statuses: { p1: st("idle", "exact", { reply: "Alan eklendi.\nATC temiz." }), p2: st("asking", "exact", { question: q("Hangisi?") }) }
    });
    fireEvent.focus(seat("p1"));
    expect(screen.getByRole("tooltip").textContent).toContain("Alan eklendi. ATC temiz.");
    fireEvent.blur(seat("p1"));
    fireEvent.focus(seat("p2"));
    expect(screen.getByRole("tooltip").textContent).toContain("Hangisi?");
  });

  it("saat düğmesi otomatik → gündüz → gece → otomatik", () => {
    setup(workspace([agentPane("p1")]));
    const clock = () => document.querySelector("[data-office-clock]") as HTMLButtonElement;
    expect(clock().getAttribute("data-office-clock")).toBe("auto");
    fireEvent.click(clock());
    expect(clock().getAttribute("data-office-clock")).toBe("day");
    fireEvent.click(clock());
    expect(clock().textContent).toContain("Saat: gece");
    fireEvent.click(clock());
    expect(clock().getAttribute("data-office-clock")).toBe("auto");
  });

  it("replyLine: ilk anlamlı satır, markdown işaretleri atılır, 90 karakterde kırpılır; nightOf saat kipine uyar", () => {
    expect(replyLine("\n## Özet\n- ikinci")).toBe("Özet");
    expect(replyLine(undefined)).toBe("");
    expect(Array.from(replyLine("x".repeat(200)))).toHaveLength(90);
    const midnight = new Date(2026, 0, 1, 0, 0);
    expect(nightOf("day", false, midnight)).toBe(0);
    expect(nightOf("night", true, new Date(2026, 0, 1, 12, 0))).toBe(1);
    expect(nightOf("auto", true, midnight)).toBe(0);
    expect(nightOf("auto", false, midnight)).toBe(1);
  });
});
