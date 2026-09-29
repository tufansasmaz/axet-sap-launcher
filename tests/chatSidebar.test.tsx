// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import ChatSidebar from "../src/components/ChatSidebar";
import { ChatStoreProvider, useChatStore, type ChatStore } from "../src/stores/chatStore";
import type { ChatSession } from "../src/stores/chatTypes";

let store: ChatStore;
function Probe() {
  store = useChatStore();
  return null;
}

// `show` false: kenar çubuğu unmount (mod değişti ya da kenar çubuğu daraldı),
// store ise yerinde — App'teki düzen.
function tree(show = true) {
  return (
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={() => {}}>
        <Probe />
        {show && (
          <ChatSidebar
            recentEntries={[]}
            connectivity={{}}
            tierOverrides={{}}
            activeSap={null}
            onOpenSapLauncher={() => {}}
            onQuickConnectSap={() => {}}
          />
        )}
      </ChatStoreProvider>
    </LanguageProvider>
  );
}

function renderSidebar() {
  return render(tree());
}

function session(id: string, title: string): ChatSession {
  return {
    id, title, model: null, draft: "", attachments: [], pending: false, requestId: null, activity: null,
    activitySteps: [], stalledMinutes: 0, pendingAsk: null, todos: [], contextTokens: 0, contextLimit: 0,
    editUndo: null, cancelStuck: false, createdAt: 1, updatedAt: 1, cwd: null, sapLabel: null, projectId: null,
    keepInGeneral: false,
    messages: [{ id: `${id}-m`, role: "user", content: `${title} içeriği`, createdAt: 1 }]
  };
}

function registerSpies() {
  const spies = {
    newSession: vi.fn(),
    requestDelete: vi.fn(),
    openProjectDialog: vi.fn(),
    openShortcuts: vi.fn()
  };
  act(() => {
    store.registerChatCommands(spies);
  });
  return spies;
}

// Etkin sohbet seçilince yolu (burada "Sohbetler" grubu) kendiliğinden açılıyor.
function seed() {
  act(() => {
    store.setSessions([session("a", "Birinci"), session("b", "İkinci")]);
    store.setActiveId("a");
  });
}

const rowOf = (title: string) =>
  screen.getAllByTitle(title).find((el) => el.getAttribute("role") === "button")!;

afterEach(cleanup);

describe("ChatSidebar", () => {
  it("satırlar 28px ve kenarlıksız; seçili satırda sol çizgi var", () => {
    renderSidebar();
    seed();
    const active = rowOf("Birinci");
    const other = rowOf("İkinci");
    expect(active.className).toContain("h-7");
    expect(active.className).not.toContain("border");
    expect(active.getAttribute("aria-current")).toBe("true");
    expect(active.querySelector("[data-active-line]")).not.toBeNull();
    expect(other.querySelector("[data-active-line]")).toBeNull();
  });

  it("alt düğmeler dar kenar çubuğunda kesilmek yerine alt alta diziliyor", () => {
    // jsdom ölçemiyor; ölçü ChatSidebar.tsx'teki yorumda. Burada sınıf sabitleniyor.
    renderSidebar();
    const buttons = [screen.getByTitle("Yeni sohbet (Ctrl+N)"), screen.getByTitle("Yeni proje")];
    for (const button of buttons) {
      expect(button.classList.contains("min-w-28")).toBe(true);
      expect(button.classList.contains("min-w-0")).toBe(false);
    }
    expect(buttons[0].parentElement!.classList.contains("flex-wrap")).toBe(true);
  });

  it("Yeni sohbet, Sohbeti sil ve kısayollar kayıtlı komutlara gidiyor", () => {
    renderSidebar();
    seed();
    const spies = registerSpies();
    fireEvent.click(screen.getByTitle("Yeni sohbet (Ctrl+N)"));
    expect(spies.newSession).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getAllByTitle("Sohbeti sil")[0]);
    expect(spies.requestDelete).toHaveBeenCalledWith("a");
    fireEvent.click(screen.getByTitle("Klavye kısayolları"));
    expect(spies.openShortcuts).toHaveBeenCalledTimes(1);
  });

  it("Yeni proje projeyi store'da kuruyor ve pencereyi komutla açtırıyor", () => {
    renderSidebar();
    const spies = registerSpies();
    fireEvent.click(screen.getByTitle("Yeni proje"));
    expect(store.projects).toHaveLength(1);
    expect(spies.openProjectDialog).toHaveBeenCalledWith(store.projects[0].id);
  });

  it("resetSearch arama kutusunu boşaltıyor", () => {
    renderSidebar();
    const input = screen.getByPlaceholderText("Sohbetlerde ara…") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "fatura" } });
    expect(input.value).toBe("fatura");
    act(() => store.resetSearch());
    expect(input.value).toBe("");
  });

  it("arama metni ve açılan grup kenar çubuğu gidip gelince korunuyor", () => {
    const { rerender } = renderSidebar();
    act(() => store.setSessions([session("a", "Birinci"), session("b", "İkinci")]));
    const general = () => screen.getByText("Sohbetler").closest("button")!;
    expect(general().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(general());
    fireEvent.change(screen.getByPlaceholderText("Sohbetlerde ara…"), { target: { value: "Birinci" } });

    rerender(tree(false));
    rerender(tree(true));

    const input = screen.getByPlaceholderText("Sohbetlerde ara…") as HTMLInputElement;
    expect(input.value).toBe("Birinci");
    // Arama grupları zorla açıyor; açık grubun korunduğu ancak arama
    // temizlenince görünüyor.
    fireEvent.change(input, { target: { value: "" } });
    expect(general().getAttribute("aria-expanded")).toBe("true");
    expect(rowOf("İkinci")).toBeDefined();
  });

  it("kullanıcının kapattığı etkin sohbet grubu dönüşte yeniden açılmıyor", () => {
    const { rerender } = renderSidebar();
    seed();
    const general = () => screen.getByText("Sohbetler").closest("button")!;
    expect(general().getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(general());
    rerender(tree(false));
    rerender(tree(true));
    expect(general().getAttribute("aria-expanded")).toBe("false");
  });

  it("arama kutusu kısayolun bulacağı işareti taşıyor", () => {
    renderSidebar();
    expect(document.querySelector("[data-sidebar-search]")).toBe(screen.getByPlaceholderText("Sohbetlerde ara…"));
  });
});
