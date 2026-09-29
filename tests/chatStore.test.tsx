// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import {
  ChatStoreProvider,
  MAX_PROJECTS,
  useChatCommands,
  useChatStore,
  type ChatCommands,
  type ChatStore
} from "../src/stores/chatStore";
import type { ChatSession } from "../src/stores/chatTypes";

let store: ChatStore;
let commands: ChatCommands;
function Probe() {
  store = useChatStore();
  commands = useChatCommands();
  return null;
}

const pushToast = vi.fn();
const exportChat = vi.fn(() => Promise.resolve({ ok: true }));

function renderStore() {
  return render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={pushToast}>
        <Probe />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}

function session(id: string, over: Partial<ChatSession> = {}): ChatSession {
  return {
    id, title: id, messages: [], model: null, draft: "", attachments: [], pending: false, requestId: null,
    activity: null, activitySteps: [], stalledMinutes: 0, pendingAsk: null, todos: [], contextTokens: 0,
    contextLimit: 0, editUndo: null, cancelStuck: false, createdAt: 1, updatedAt: 1, cwd: null, sapLabel: null,
    projectId: null, keepInGeneral: false, ...over
  };
}

beforeEach(() => {
  pushToast.mockClear();
  exportChat.mockClear();
  (window as unknown as { api: unknown }).api = { exportChat };
});
afterEach(cleanup);

describe("ChatStore", () => {
  it("Provider olmadan kullanılırsa açık bir hata veriyor", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ChatStoreProvider/);
    spy.mockRestore();
  });

  it("değiştiriciler useState gibi hem değer hem fonksiyon alıyor", () => {
    renderStore();
    act(() => store.setSessions([session("a")]));
    act(() => store.setSessions((prev) => [...prev, session("b")]));
    act(() => store.setActiveId("b"));
    expect(store.sessions.map((s) => s.id)).toEqual(["a", "b"]);
    expect(store.activeId).toBe("b");
  });

  it("yeniden adlandırma kırpıyor, boş adı yok sayıyor, uzun adı kısaltıyor", () => {
    renderStore();
    act(() => store.setSessions([session("a", { title: "Eski", updatedAt: 1 })]));
    act(() => store.renameSession("a", "  Yeni ad  "));
    expect(store.sessions[0].title).toBe("Yeni ad");
    expect(store.sessions[0].updatedAt).toBeGreaterThan(1);
    act(() => store.renameSession("a", "   "));
    expect(store.sessions[0].title).toBe("Yeni ad");
    act(() => store.renameSession("a", "x".repeat(60)));
    expect(store.sessions[0].title).toBe(`${"x".repeat(42)}…`);
  });

  it("taşıma updatedAt'e dokunmuyor", () => {
    renderStore();
    act(() => store.setSessions([session("a", { updatedAt: 5 })]));
    act(() => store.moveSession("a", "p1"));
    expect(store.sessions[0].projectId).toBe("p1");
    expect(store.sessions[0].updatedAt).toBe(5);
    act(() => store.moveSession("a", null));
    expect(store.sessions[0].projectId).toBeNull();
  });

  it("proje oluşturma varsayılan adla ekliyor; sınırda bildirim verip null dönüyor", () => {
    renderStore();
    let created: ReturnType<ChatStore["createProject"]> = null;
    act(() => {
      created = store.createProject();
    });
    expect(created).not.toBeNull();
    expect(store.projects.map((p) => p.name)).toEqual(["Yeni proje"]);

    const full = Array.from({ length: MAX_PROJECTS }, (_, i) => ({
      id: `p${i}`, name: `P${i}`, instructions: "", createdAt: i, updatedAt: i
    }));
    act(() => store.setProjects(full));
    act(() => {
      created = store.createProject();
    });
    expect(created).toBeNull();
    expect(store.projects).toHaveLength(MAX_PROJECTS);
    expect(pushToast).toHaveBeenCalledWith("error", `En fazla ${MAX_PROJECTS} proje oluşturabilirsin.`);
  });

  it("proje silmek sohbetleri silmiyor, yalnızca projeden çıkarıyor", () => {
    renderStore();
    act(() => {
      store.setProjects([{ id: "p1", name: "A", instructions: "", createdAt: 1, updatedAt: 1 }]);
      store.setSessions([session("a", { projectId: "p1" }), session("b")]);
    });
    act(() => store.deleteProject("p1"));
    expect(store.projects).toHaveLength(0);
    expect(store.sessions.map((s) => [s.id, s.projectId])).toEqual([["a", null], ["b", null]]);
  });

  it("dışa aktarma boş sohbette çağrılmıyor, doluda iki biçimle çağrılıyor", async () => {
    renderStore();
    act(() =>
      store.setSessions([
        session("bos"),
        session("dolu", { title: "Rapor", messages: [{ id: "m", role: "user", content: "merhaba", createdAt: 1 }] })
      ])
    );
    await act(() => store.exportSession("bos"));
    expect(exportChat).not.toHaveBeenCalled();
    await act(() => store.exportSession("dolu"));
    expect(exportChat).toHaveBeenCalledTimes(1);
    const [name, payload] = exportChat.mock.calls[0] as unknown as [string, { markdown: string; html: string }];
    expect(name.endsWith(".pdf")).toBe(true);
    expect(payload.markdown).toContain("merhaba");
    expect(payload.html).toContain("merhaba");
  });

  it("komutlar: kayıt yokken sessiz, kayıtlıyken iletiliyor, kayıt kalkınca yine sessiz", () => {
    renderStore();
    const first = commands;
    expect(() => commands.newSession()).not.toThrow();
    const newSession = vi.fn();
    const requestDelete = vi.fn();
    let unregister = () => {};
    act(() => {
      unregister = store.registerChatCommands({
        newSession, requestDelete, openProjectDialog: vi.fn(), openShortcuts: vi.fn()
      });
    });
    commands.newSession({ cwd: "C:\\x", label: "X" }, null, "p1");
    commands.requestDelete("a");
    expect(newSession).toHaveBeenCalledWith({ cwd: "C:\\x", label: "X" }, null, "p1");
    expect(requestDelete).toHaveBeenCalledWith("a");
    act(() => unregister());
    commands.newSession();
    expect(newSession).toHaveBeenCalledTimes(1);
    expect(commands).toBe(first);
  });

  it("eski kaydın iptali yeni kaydı silmiyor", () => {
    renderStore();
    const a = vi.fn();
    const b = vi.fn();
    const base = { requestDelete: vi.fn(), openProjectDialog: vi.fn(), openShortcuts: vi.fn() };
    let offA = () => {};
    act(() => {
      offA = store.registerChatCommands({ ...base, newSession: a });
      store.registerChatCommands({ ...base, newSession: b });
    });
    act(() => offA());
    commands.newSession();
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("resetSearch arama metnini boşaltıyor, açık gruplara dokunmuyor", () => {
    renderStore();
    act(() => {
      store.setSidebarQuery("fatura");
      store.setOpenGroups({ general: true });
    });
    act(() => store.resetSearch());
    expect(store.sidebarQuery).toBe("");
    expect(store.openGroups).toEqual({ general: true });
  });
});
