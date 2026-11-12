// @vitest-environment jsdom
// Sohbet ajanı (axet151 madde 1): seçici etkin varsayılanı adıyla gösteriyor,
// seçim sohbete yazılıyor ve tura/ısıtmaya `agent` olarak gidiyor.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import AxetCodeHome from "../src/components/AxetCodeHome";
import { ChatStoreProvider } from "../src/stores/chatStore";

let send: ReturnType<typeof vi.fn>;
let prewarm: ReturnType<typeof vi.fn>;
let saved: { sessions: { agent?: string }[] }[];

beforeEach(() => {
  send = vi.fn(() => Promise.resolve({ ok: true, text: "cevap" }));
  prewarm = vi.fn(() => Promise.resolve());
  saved = [];
  const impl: Record<string, unknown> = {
    loadChatSessions: () => Promise.resolve({ ok: true, state: { activeId: null, projects: [], sessions: [] } }),
    saveChatSessions: (state: never) => {
      saved.push(state);
      return Promise.resolve({ ok: true });
    },
    listAxetModels: () => Promise.resolve({ ok: true, models: [{ provider: "openai", model: "gpt-alfa" }] }),
    getAxetModelConfig: () => Promise.resolve({ ok: true, config: { large: { provider: "openai", model: "gpt-alfa" } } }),
    getConfig: () => Promise.resolve({}),
    axetAgents: () =>
      Promise.resolve([
        { name: "coder", scope: "builtin", permissions: "ask (default)", description: "kodlama" },
        { name: "security", scope: "builtin", permissions: "ask (default)", description: "güvenlik" }
      ]),
    axetDefaultAgent: () => Promise.resolve("security"),
    sendChatMessage: (...a: unknown[]) => send(...a),
    prewarmChat: (...a: unknown[]) => prewarm(...a)
  };
  (window as unknown as { api: unknown }).api = new Proxy({}, {
    get: (_t, k: string) => {
      if (k in impl) return impl[k];
      if (k.startsWith("on")) return () => () => {};
      return () => new Promise(() => {});
    }
  });
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.scrollTo = () => {};
});
afterEach(cleanup);

const wait = (ms = 0) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });

describe("sohbet ajanı seçici", () => {
  it("varsayılan adıyla görünüyor; coder seçilince ısıtma ve tur --agent coder ile, sohbete kaydediliyor", async () => {
    render(
      <LanguageProvider language="tr">
        <ChatStoreProvider pushToast={() => {}}>
          <AxetCodeHome active config={{ axetWorkspaceDir: "C:/is" } as never} pushToast={() => {}} recentEntries={[]} sapChatRequest={null} workDirRequest={null} activeSap={{ projectDir: "C:/sap", systemId: "DEV", client: "100" } as never} />
        </ChatStoreProvider>
      </LanguageProvider>
    );
    await wait();
    const selector = screen.getAllByTestId("agent-selector").at(-1)!;
    expect(selector.textContent).toContain("axet varsayılanı (security)");
    expect(selector.getAttribute("title")).toContain("genel amaçlı değil");

    fireEvent.click(selector);
    fireEvent.click(screen.getByText("coder"));
    await wait(700);
    expect(screen.getAllByTestId("agent-selector").at(-1)!.textContent).toContain("coder");
    expect(prewarm.mock.calls.at(-1)?.[5]).toBe("coder");

    const box = screen.getAllByPlaceholderText("axet.code'a bir şey sor…").at(-1) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "merhaba" } });
    fireEvent.keyDown(box, { key: "Enter" });
    await wait(700);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][6]).toBe("coder");
    expect(saved.at(-1)?.sessions[0]?.agent).toBe("coder");
  });
});
