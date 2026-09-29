// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChatSessionPane, { type ChatSessionData } from "../src/components/ChatSessionPane";
import type { ChatMessage } from "../src/components/ChatBubble";
import type { ComponentProps } from "react";

type PaneProps = ComponentProps<typeof ChatSessionPane>;

// window.api — tests/chatHomeBehaviour.test.tsx'teki Proxy deseni.
const impl: Record<string, (...args: unknown[]) => unknown> = {};
let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = new Proxy(
    {},
    {
      get: (_t, key: string) =>
        impl[key] ?? (key.startsWith("on") ? () => () => {} : () => new Promise(() => {}))
    }
  );
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const k of Object.keys(impl)) delete impl[k];
  (window as unknown as { api: unknown }).api = prevApi;
});

export const msg = (id: string, role: "user" | "assistant", content = id): ChatMessage =>
  ({ id, role, content, createdAt: Date.now() }) as ChatMessage;

const baseSession = (): ChatSessionData => ({
  id: "s1",
  messages: [],
  model: null,
  draft: "",
  attachments: [],
  pending: false,
  activity: null,
  activitySteps: [],
  stalledMinutes: 0,
  pendingAsk: null,
  todos: [],
  contextTokens: 0,
  contextLimit: 0,
  editUndo: null,
  cancelStuck: false
});

const baseProps = () => ({
  active: true,
  models: [],
  modelsLoading: false,
  modelsError: null,
  attaching: false,
  axetUpdate: null,
  registerTextarea: vi.fn(),
  onDraftChange: vi.fn(),
  onSend: vi.fn(),
  onCancel: vi.fn(),
  onAnswerQuestion: vi.fn(),
  onSelectModel: vi.fn(),
  onRegenerate: vi.fn(),
  onContinue: vi.fn(),
  onEditMessage: vi.fn(),
  onUndoEdit: vi.fn(),
  onDismissCancelStuck: vi.fn(),
  onAttachFiles: vi.fn(),
  onFilesResolved: vi.fn(),
  onRemoveAttachment: vi.fn(),
  suggestionKeys: [] as string[],
  onSuggestionClick: vi.fn()
});

export function renderPane(overrides: Record<string, unknown> = {}, session: Partial<ChatSessionData> = {}) {
  const fullSession: ChatSessionData = { ...baseSession(), ...session };
  const props = { ...baseProps(), ...overrides, session: fullSession };
  const utils = render(
    <LanguageProvider language="tr">
      <ChatSessionPane {...(props as unknown as PaneProps)} />
    </LanguageProvider>
  );
  const rerenderWith = (next: Partial<ChatSessionData>) =>
    utils.rerender(
      <LanguageProvider language="tr">
        <ChatSessionPane {...(props as unknown as PaneProps)} session={{ ...fullSession, ...next }} />
      </LanguageProvider>
    );
  return { ...utils, props, rerenderWith };
}

describe("ChatSessionPane liste", () => {
  it("canlı tur listenin SON öğesi ve yapışık değil", () => {
    renderPane(
      {},
      {
        messages: [msg("u1", "user"), msg("a1", "assistant")],
        pending: true,
        activity: "tool",
        activitySteps: [{ phase: "tool", tool: "view", callId: "c1" }]
      }
    );
    const list = screen.getByTestId("chat-messages");
    const live = screen.getByTestId("turn-live");
    expect(list.contains(live)).toBe(true);
    expect(live.className).not.toContain("sticky");
    expect(live.parentElement?.lastElementChild).toBe(live);
    expect(screen.getByText("1 araç işlemi")).toBeTruthy();
  });

  it("Yeniden üret yalnız son cevapta", () => {
    renderPane(
      { onRegenerate: vi.fn() },
      { messages: [msg("u1", "user"), msg("a1", "assistant"), msg("u2", "user"), msg("a2", "assistant")] }
    );
    expect(screen.getAllByTitle("Son cevabı sil ve yeniden üret").length).toBe(1);
  });

  // Review Focus 1
  it("dipteyken yeni adım görünümü aşağı taşıyor, yukarıdayken taşımıyor", () => {
    const steps = [{ phase: "tool" as const, tool: "view", callId: "c1" }];
    const { rerenderWith } = renderPane({}, { messages: [msg("u1", "user")], pending: true, activitySteps: steps });
    const list = screen.getByTestId("chat-messages");
    // jsdom yerleşim yapmıyor: kaydırma ölçüleri elle veriliyor, `scrollTop`
    // da yazılabilir bir değere bağlanıyor.
    let top = 0;
    Object.defineProperty(list, "scrollHeight", { configurable: true, value: 2000 });
    Object.defineProperty(list, "clientHeight", { configurable: true, value: 500 });
    Object.defineProperty(list, "scrollTop", {
      configurable: true,
      get: () => top,
      set: (v: number) => {
        top = v;
      }
    });
    const scrollTo = (scrollTop: number) => {
      top = scrollTop;
      act(() => {
        list.dispatchEvent(new Event("scroll"));
      });
    };

    scrollTo(1500); // dipte
    rerenderWith({ activitySteps: [...steps, { phase: "tool", tool: "bash", callId: "c2" }] });
    expect(list.scrollTop).toBe(2000);

    scrollTo(200); // yukarıda
    rerenderWith({
      activitySteps: [
        ...steps,
        { phase: "tool", tool: "bash", callId: "c2" },
        { phase: "tool", tool: "grep", callId: "c3" }
      ]
    });
    expect(list.scrollTop).toBe(200);
  });

  it("bağlam şeridi yok, arama katmanı top-2", () => {
    renderPane({ contextPath: "C:/p", contextLabel: "P01" });
    expect(document.querySelector(".top-9")).toBeNull();
    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    expect(screen.getByPlaceholderText(/Sohbette ara/).closest(".top-2")).toBeTruthy();
  });
});

describe("boş ekran", () => {
  it("selamlama ve Hızlı başlangıç yok, soru başlığı var", () => {
    renderPane({ suggestionKeys: ["sgArchitecture", "sgTests", "sgDebug"] });
    expect(screen.queryByText("Hızlı başlangıç")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bugün ne yapalım?");
  });

  it("karta tıklamak metni kutuya koyuyor, göndermiyor", () => {
    const { props } = renderPane({ suggestionKeys: ["sgArchitecture", "sgTests", "sgDebug"] });
    const card = screen.getAllByRole("button").find((b) => b.dataset.suggestion === "sgArchitecture")!;
    fireEvent.click(card);
    expect(props.onSuggestionClick).toHaveBeenCalledTimes(1);
    expect(props.onSend).not.toHaveBeenCalled();
  });
});
