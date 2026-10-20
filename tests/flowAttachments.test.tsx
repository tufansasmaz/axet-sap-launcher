// @vitest-environment jsdom
// Tur 10, madde 4: "Akışa dosya ekleyemiyoruz". Akış mesaj kutusu: ataş düğmesi ve
// sürükle-bırak; dosyaların YOLLARI mesaja eklenir (ajanın klasöründeyse göreli),
// içerik yapıştırılmaz. Ctrl+V/sağ tık elle yakalanmaz.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import FlowSidebar from "../src/agents/FlowSidebar";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { EMPTY_FLOW, FlowContext } from "../src/agents/flowContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { addAttachmentPaths, attachmentRef, withAttachments, FLOW_ATTACH_MAX } from "../src/agents/flowAttachments";

describe("flowAttachments (saf)", () => {
  it("ajanın klasöründeki dosya göreli, dışındaki mutlak; boşluklu yol tırnaklı", () => {
    expect(attachmentRef("C:\\proje\\src\\a.ts", "C:\\proje")).toBe("src\\a.ts");
    expect(attachmentRef("c:\\PROJE\\b.md", "C:\\proje\\\\")).toBe("b.md");
    expect(attachmentRef("C:\\projeX\\c.md", "C:\\proje")).toBe("C:\\projeX\\c.md");
    expect(attachmentRef("D:\\Belgeler\\rapor son.pdf", "C:\\proje")).toBe('"D:\\Belgeler\\rapor son.pdf"');
    expect(attachmentRef("C:\\proje\\alt klasor\\x.txt", "")).toBe('"C:\\proje\\alt klasor\\x.txt"');
  });

  it("mesaj: metin + tek satır ek listesi; metin yoksa yalnız ekler", () => {
    expect(withAttachments("bunu incele", ["C:\\p\\a.ts"], "C:\\p", "Ekli dosyalar")).toBe("bunu incele (Ekli dosyalar: a.ts)");
    expect(withAttachments("", ["C:\\p\\a.ts", "D:\\b c.md"], "C:\\p", "Ekli dosyalar")).toBe('Ekli dosyalar: a.ts, "D:\\b c.md"');
    expect(withAttachments("x", [], "C:\\p", "Ekli dosyalar")).toBe("x");
  });

  it("ekleme: tekrar yok, en çok FLOW_ATTACH_MAX, yalnız mutlak Windows yolu", () => {
    const many = Array.from({ length: 15 }, (_, i) => `C:\\f${i}.txt`);
    expect(addAttachmentPaths([], many)).toHaveLength(FLOW_ATTACH_MAX);
    expect(addAttachmentPaths(["C:\\a.txt"], ["c:\\A.txt", "C:\\b.txt", "goreli.txt", "", "\\\\sunucu\\pay\\x"])).toEqual(["C:\\a.txt", "C:\\b.txt", "\\\\sunucu\\pay\\x"]);
  });
});

let send: ReturnType<typeof vi.fn>;
let pickFiles: ReturnType<typeof vi.fn>;
beforeEach(() => {
  send = vi.fn(async () => ({ ok: true }));
  pickFiles = vi.fn(async () => ["C:\\proje\\src\\a.ts", "D:\\Belgeler\\rapor son.pdf"]);
  (window as unknown as { api: unknown }).api = {
    agentSend: send,
    pickFiles,
    getPathForFile: (f: File) => `C:\\proje\\${f.name}`,
    memoryRead: vi.fn(async () => ({ ok: false, reason: "invalid" }))
  };
});
afterEach(cleanup);

const pane: TerminalPane = { id: "a", kind: "agent", agent: { engine: "claude", role: "", roleKind: "custom" }, cwd: "C:\\proje", run: { state: "running", ptyId: "t-a" }, title: "Ayşe" };
const ws: TerminalWorkspace = { id: "w1", name: "w1", panes: [pane], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false };

function setup() {
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "w1" },
    commands: { revealPane: vi.fn() } as unknown as TerminalCommands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet",
    setupRuns: {}
  };
  const agents: AgentStatusValue = { statuses: { a: { state: "idle", source: "exact", lastActivity: 1 } }, engines: [], now: 1, answer: vi.fn() };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <FlowContext.Provider value={{ ...EMPTY_FLOW, record: vi.fn(), queue: vi.fn() }}>
            <FlowSidebar />
          </FlowContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
}

const flush = () => act(async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
});
const box = () => screen.getByRole("combobox", { name: "Ajana mesaj" }) as HTMLTextAreaElement;
const pickAgent = () => {
  fireEvent.change(box(), { target: { value: "@A", selectionStart: 2 } });
  fireEvent.keyDown(box(), { key: "Enter" });
};

describe("Akış mesaj kutusu — dosya ekleme", () => {
  it("ataş: seçilen dosyalar çip olarak; gönderince yolları mesajda, çipler temizleniyor", async () => {
    setup();
    pickAgent();
    fireEvent.click(screen.getByRole("button", { name: "Dosya ekle" }));
    await flush();
    expect(screen.getByText("a.ts")).toBeTruthy();
    expect(screen.getByText("rapor son.pdf")).toBeTruthy();
    fireEvent.change(box(), { target: { value: "bunlara bak" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await flush();
    expect(send).toHaveBeenCalledWith("w1", "a", 'bunlara bak (Ekli dosyalar: src\\a.ts, "D:\\Belgeler\\rapor son.pdf")');
    expect(screen.queryByText("a.ts")).toBeNull();
  });

  it("çip kaldırılabiliyor; yalnız ek varken de gönderilebiliyor", async () => {
    setup();
    pickAgent();
    fireEvent.click(screen.getByRole("button", { name: "Dosya ekle" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Kaldır: rapor son.pdf" }));
    fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    await flush();
    expect(send).toHaveBeenCalledWith("w1", "a", "Ekli dosyalar: src\\a.ts");
  });

  it("sürükle-bırak: dosyanın yolu eklenir (içerik okunmaz)", async () => {
    setup();
    pickAgent();
    const file = new File(["ICERIK"], "not.md");
    const composer = document.querySelector("[data-flow-composer]") as HTMLElement;
    fireEvent.drop(composer, { dataTransfer: { files: [file], getData: () => "", types: ["Files"] } });
    await flush();
    expect(screen.getByText("not.md")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gönder" }));
    await flush();
    expect(send).toHaveBeenCalledWith("w1", "a", "Ekli dosyalar: not.md");
    expect(String(send.mock.calls[0][2])).not.toContain("ICERIK");
  });
});
