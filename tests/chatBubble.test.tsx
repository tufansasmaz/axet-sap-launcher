// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChatBubble, { type ChatMessage } from "../src/components/ChatBubble";

afterEach(cleanup);

const answer = (extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({ id: "a1", role: "assistant", content: "Cevap metni", createdAt: Date.now(), ...extra }) as ChatMessage;

const renderBubble = (message: ChatMessage, onRegenerate?: () => void) =>
  render(
    <LanguageProvider language="tr">
      <ChatBubble message={message} onRegenerate={onRegenerate} />
    </LanguageProvider>
  );

describe("ChatBubble cevap satırı", () => {
  it("Yeniden üret yalnız onRegenerate verilen balonda, satır da görünür", () => {
    const onRegenerate = vi.fn();
    renderBubble(answer(), onRegenerate);
    const row = screen.getByTestId("answer-row");
    expect(row.className).not.toContain("opacity-0");
    fireEvent.click(screen.getByTitle("Son cevabı sil ve yeniden üret"));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("öteki cevaplarda satır DOM'da ama hover'a kadar gizli, Yeniden üret yok", () => {
    renderBubble(answer());
    expect(screen.getByTestId("answer-row").className).toContain("opacity-0");
    expect(screen.queryByTitle("Son cevabı sil ve yeniden üret")).toBeNull();
    expect(screen.getByTitle("Cevabı kopyala")).toBeTruthy();
  });

  it("akış sürerken satır yok", () => {
    renderBubble(answer({ streaming: true }), vi.fn());
    expect(screen.queryByTestId("answer-row")).toBeNull();
  });

  it("hata cevabında onRegenerate yoksa satır yok, varsa yalnız Yeniden üret", () => {
    renderBubble(answer({ error: true }));
    expect(screen.queryByTestId("answer-row")).toBeNull();
    cleanup();
    renderBubble(answer({ error: true }), vi.fn());
    expect(screen.getByTitle("Son cevabı sil ve yeniden üret")).toBeTruthy();
    expect(screen.queryByTitle("Cevabı kopyala")).toBeNull();
  });

  it("biten cevabın araç dökümü ChatToolRun ile çiziliyor", () => {
    renderBubble(answer({ steps: [{ phase: "tool", tool: "view", callId: "c1" }] }));
    expect(screen.getByText("1 araç işlemi")).toBeTruthy();
  });
});
