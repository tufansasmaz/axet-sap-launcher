// @vitest-environment jsdom
// Model seçimi config'e yazılamazsa başarı bildirimi YALAN olurdu: seçim bu
// oturumda yine geçerli, ama kullanıcı kalıcı olmadığını bilmeli.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import AxetCodeHome from "../src/components/AxetCodeHome";
import { ChatStoreProvider } from "../src/stores/chatStore";

const pushToast = vi.fn();
let saveConfig: ReturnType<typeof vi.fn>;

beforeEach(() => {
  pushToast.mockClear();
  saveConfig = vi.fn(() => Promise.reject(new Error("EACCES: disk")));
  const impl: Record<string, unknown> = {
    loadChatSessions: () => Promise.resolve({ ok: true, state: { activeId: null, projects: [], sessions: [] } }),
    saveChatSessions: () => Promise.resolve({ ok: true }),
    listAxetModels: () =>
      Promise.resolve({ ok: true, models: [{ provider: "openai", model: "gpt-alfa" }, { provider: "openai", model: "gpt-beta" }] }),
    getAxetModelConfig: () => Promise.resolve({ ok: true, config: { large: { provider: "openai", model: "gpt-alfa" } } }),
    getConfig: () => Promise.resolve({}),
    saveConfig: (...a: unknown[]) => saveConfig(...a)
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

describe("model seçimi kaydedilemezse", () => {
  it("hata bildirimi çıkıyor, başarı bildirimi çıkmıyor; seçim yine uygulanıyor", async () => {
    render(
      <LanguageProvider language="tr">
        <ChatStoreProvider pushToast={() => {}}>
          <AxetCodeHome
            active
            config={null}
            pushToast={pushToast}
            recentEntries={[]}
            sapChatRequest={null}
            workDirRequest={null}
            activeSap={null}
          />
        </ChatStoreProvider>
      </LanguageProvider>
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const opener = screen.getAllByTitle("Model Seç").find((el) => !(el as HTMLButtonElement).disabled)!;
    fireEvent.click(opener);
    await act(async () => {
      fireEvent.click(screen.getByText("GPT Beta"));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(saveConfig).toHaveBeenCalledTimes(1);
    const kinds = pushToast.mock.calls.map((c) => c[0]);
    expect(kinds).toContain("error");
    expect(kinds).not.toContain("success");
    expect(String(pushToast.mock.calls.find((c) => c[0] === "error")?.[1])).toContain("EACCES: disk");
    // Seçim bu oturumda geçerli: seçici yeni modeli gösteriyor.
    expect(screen.getAllByText("GPT Beta").length).toBeGreaterThan(0);
  });
});
