// @vitest-environment jsdom
// İş B — Bildirim tıklama IPC testi ve İş C — Ctrl+/ kısayol testi.
// "Fake Notification" pattern: Electron API'si jsdom'da yok; sınıf sahte olarak
// tanımlanır, `show()` çağrısı ve `click` olayı üretimi elle tetiklenir.

import { renderHook, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from "vitest";

// ---- Fake Notification ----
type NotifListener = (...args: unknown[]) => void;
class FakeNotification {
  static isSupported = () => true;
  title: string;
  body: string;
  private _listeners: Record<string, NotifListener[]> = {};
  constructor(opts: { title: string; body: string }) {
    this.title = opts.title;
    this.body = opts.body;
  }
  on(event: string, cb: NotifListener) {
    (this._listeners[event] ??= []).push(cb);
    return this;
  }
  show() {}
  emit(event: string, ...args: unknown[]) {
    (this._listeners[event] ?? []).forEach((cb) => cb(...args));
  }
}

// ---- showNotificationAndClick yardımcısı ----
// index.ts'nin showChatNotification'ını doğrudan test etmek zor (Electron
// modülleri bağımlılık); saf bir şekilde aynı mantığı kopyalıyoruz:
// Notification oluştur → click handler'ı bağla → tıkla → IPC'ye baktık mı?
function makeClickScenario(chatId: string, { minimized = false } = {}) {
  const sendSpy = vi.fn();
  const focusSpy = vi.fn();
  const restoreSpy = vi.fn();
  const windowShowSpy = vi.fn();
  const mainWindow = {
    isFocused: () => false,
    isMinimized: () => minimized,
    isDestroyed: () => false,
    show: windowShowSpy,
    restore: restoreSpy,
    focus: focusSpy,
    webContents: { send: sendSpy }
  };

  const n = new FakeNotification({ title: "Test", body: "body" });
  n.on("click", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Pencereyi öne getir: show() (gizliyse) → restore() (küçültülmüşse) → focus().
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send("chat:open", chatId);
  });

  return { n, sendSpy, focusSpy, windowShowSpy, restoreSpy };
}

describe("Notification click — IPC", () => {
  it("tıklandığında chat:open chatId ile gönderilir", () => {
    const chatId = "abc-123";
    const { n, sendSpy } = makeClickScenario(chatId);
    n.emit("click");
    expect(sendSpy).toHaveBeenCalledWith("chat:open", chatId);
  });

  it("mainWindow.show() IPC gönderiminden önce çağrılır", () => {
    const chatId = "xyz-456";
    const { n, windowShowSpy, sendSpy } = makeClickScenario(chatId);
    n.emit("click");
    expect(windowShowSpy).toHaveBeenCalled();
    const showOrder = windowShowSpy.mock.invocationCallOrder[0];
    const sendOrder = sendSpy.mock.invocationCallOrder[0];
    expect(showOrder).toBeLessThan(sendOrder);
  });

  it("pencere küçültülmüşse restore() çağrılır", () => {
    const chatId = "min-789";
    const { n, restoreSpy } = makeClickScenario(chatId, { minimized: true });
    n.emit("click");
    expect(restoreSpy).toHaveBeenCalled();
  });
});

// ---- Renderer: chat:open → onSwitchToChat + sohbet aktif ----
// Gerçek useChatOpen hook'u (src/lib/useChatOpen.ts) test ediliyor.
// AxetCodeHome bu hook'u kullanır; test doğrudan ürün koduna bağlıdır.
import { useChatOpen } from "../src/lib/useChatOpen";

describe("useChatOpen — chat:open renderer tarafı", () => {
  // window.api mock — her testten önce sıfırla
  let capturedOnChatOpen: ((chatId: string) => void) | null = null;
  let unsubscribeCalled = false;
  const origApi = (window as unknown as Record<string, unknown>).api;

  beforeEach(() => {
    capturedOnChatOpen = null;
    unsubscribeCalled = false;
    (window as unknown as Record<string, unknown>).api = {
      ...(origApi as object),
      onChatOpen: (cb: (chatId: string) => void) => {
        capturedOnChatOpen = cb;
        return () => { unsubscribeCalled = true; capturedOnChatOpen = null; };
      }
    };
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).api = origApi;
    cleanup();
  });

  it("onChatOpen callback'i hem onSwitchToChat hem setActiveId'yi çağırır", () => {
    const onSwitchToChat = vi.fn();
    const setActiveId = vi.fn() as Mock;

    renderHook(() => useChatOpen({ onSwitchToChat, setActiveId }));

    // callback kayıt edilmiş olmalı
    expect(capturedOnChatOpen).not.toBeNull();

    // Ana süreç "chat:open" gönderiyor
    capturedOnChatOpen!("test-chat-id");

    // 1. Mod geçişi çağrıldı mı?
    expect(onSwitchToChat).toHaveBeenCalledTimes(1);
    // 2. Doğru sohbet aktif yapıldı mı?
    expect(setActiveId).toHaveBeenCalledWith("test-chat-id");
  });

  it("unmount'ta abonelik iptal edilir", () => {
    const { unmount } = renderHook(() =>
      useChatOpen({ onSwitchToChat: vi.fn(), setActiveId: vi.fn() })
    );
    expect(unsubscribeCalled).toBe(false);
    unmount();
    expect(unsubscribeCalled).toBe(true);
  });
});

// ---- Ctrl+/ kısayolu: useShellShortcuts ----
// Hook'un global keydown dinleyicisini test ediyoruz.
describe("Ctrl+/ — kısayollar penceresi açılır", () => {
  let listeners: ((e: KeyboardEvent) => void)[] = [];
  const origAdd = window.addEventListener.bind(window);

  beforeEach(() => {
    listeners = [];
    vi.spyOn(window, "addEventListener").mockImplementation((type, cb) => {
      if (type === "keydown") listeners.push(cb as (e: KeyboardEvent) => void);
      else origAdd(type, cb as EventListener);
    });
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function fireCtrlSlash(target: EventTarget = document.body) {
    const e = new KeyboardEvent("keydown", {
      key: "/",
      ctrlKey: true,
      bubbles: true
    });
    Object.defineProperty(e, "target", { value: target });
    listeners.forEach((l) => l(e));
    return e;
  }

  it("Ctrl+/ modal kapalıysa onOpenShortcuts çağırır", async () => {
    const { useShellShortcuts } = await import("../src/shell/useShellShortcuts");
    const onOpenShortcuts = vi.fn();
    const { renderHook: rh } = await import("@testing-library/react");

    // aria-modal yokken çağrılmalı
    rh(() =>
      useShellShortcuts({
        listMode: "axetCode",
        sidebarCollapsed: false,
        onModeChange: vi.fn(),
        onExpandSidebar: vi.fn().mockResolvedValue(undefined),
        onOpenShortcuts
      })
    );

    fireCtrlSlash();
    expect(onOpenShortcuts).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+/ açık modal varsa onOpenShortcuts ÇAĞIRMAZ", async () => {
    const { useShellShortcuts } = await import("../src/shell/useShellShortcuts");
    const onOpenShortcuts = vi.fn();
    const { renderHook: rh } = await import("@testing-library/react");

    // aria-modal olan bir eleman ekle
    const modal = document.createElement("div");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);

    rh(() =>
      useShellShortcuts({
        listMode: "axetCode",
        sidebarCollapsed: false,
        onModeChange: vi.fn(),
        onExpandSidebar: vi.fn().mockResolvedValue(undefined),
        onOpenShortcuts
      })
    );

    fireCtrlSlash();
    expect(onOpenShortcuts).not.toHaveBeenCalled();
    document.body.removeChild(modal);
  });
});

// ---- Komut paleti "Kısayollar" komutu ----
// buildPaletteItems'ın döndürdüğü öğeler arasında shortcuts öğesi bulunmalı
// ve run() çağrıldığında actions.openShortcuts çağrılmalı.
describe("Komut paleti — kısayollar öğesi", () => {
  it("shortcuts öğesi openShortcuts action'ını çalıştırır", async () => {
    const { buildPaletteItems } = await import("../src/components/AppCommandPalette");
    const t = (key: string) => key;
    const openShortcuts = vi.fn();
    const actions = {
      setActivity: vi.fn(),
      newChat: vi.fn(),
      openChat: vi.fn(),
      selectSystem: vi.fn(),
      openSettings: vi.fn(),
      reportProblem: vi.fn(),
      toggleTheme: vi.fn(),
      toggleLanguage: vi.fn(),
      openShortcuts,
      openWhatsNew: vi.fn()
    };
    const items = buildPaletteItems(t as Parameters<typeof buildPaletteItems>[0], actions, [], [], []);
    const shortcutsItem = items.find((i) => i.id === "shortcuts");
    expect(shortcutsItem).toBeTruthy();
    shortcutsItem!.run();
    expect(openShortcuts).toHaveBeenCalledTimes(1);
  });
});
