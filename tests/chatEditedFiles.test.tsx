// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChatEditedFiles, { countChanges, summarizeEditedFiles } from "../src/components/ChatEditedFiles";
import ChatBubble, { type ChatMessage } from "../src/components/ChatBubble";
import type { AxetChatActivity } from "../app-electron/shared/types";

afterEach(cleanup);

let seq = 0;
const step = (tool: string, extra: Partial<AxetChatActivity> = {}): AxetChatActivity => ({
  phase: "tool",
  tool,
  callId: `${tool}-${seq++}`,
  ...extra
});

const renderFiles = (steps: AxetChatActivity[]) =>
  render(
    <LanguageProvider language="tr">
      <ChatEditedFiles steps={steps} />
    </LanguageProvider>
  );

describe("countChanges", () => {
  it("eski ve yeni blokta aynen duran satırı değişiklik saymıyor", () => {
    // Fark metni eski bloğu `-`, yeni bloğu `+` ile olduğu gibi yazıyor;
    // `b` iki blokta da var, yani değişmedi.
    expect(countChanges("-a\n-b\n+b\n+c\n+d")).toEqual({ added: 2, removed: 1 });
  });

  it("kırpılmış farkın sonundaki … satırını saymıyor", () => {
    expect(countChanges("+a\n+b\n…")).toEqual({ added: 2, removed: 0 });
  });
});

describe("summarizeEditedFiles", () => {
  it("dosya başına topluyor, ilk görülme sırasıyla; okuma, hatalı ve farksız adımlar dışarıda", () => {
    const files = summarizeEditedFiles([
      step("view", { target: "src/a.ts" }),
      step("edit", { target: "src/b.ts", diff: "-x\n+y" }),
      step("write", { target: "docs/yeni.md", diff: "+1\n+2\n+3" }),
      step("edit", { target: "src/b.ts", diff: "-p\n+q\n+r" }),
      step("edit", { target: "src/c.ts", diff: "-k\n+l", failed: true }),
      step("edit", { target: "src/d.ts" }),
      step("multiedit", { target: "src/e.ts", diff: "-m\n+n" })
    ]);
    expect(files.map((f) => [f.path, f.added, f.removed, f.diffs.length])).toEqual([
      ["src/b.ts", 3, 2, 2],
      ["docs/yeni.md", 3, 0, 1],
      ["src/e.ts", 1, 1, 1]
    ]);
  });
});

describe("ChatEditedFiles", () => {
  it("değişiklik yoksa hiçbir şey çizmiyor", () => {
    const { container } = renderFiles([step("view", { target: "a.ts" })]);
    expect(container.innerHTML).toBe("");
  });

  it("başlık dosya sayısını ve toplamı veriyor; satır tıklanınca o dosyanın farkı açılıyor", () => {
    renderFiles([
      step("edit", { target: "src/components/Kart.tsx", diff: "-eski satır\n+yeni satır" }),
      step("write", { target: "notlar.md", diff: "+bir\n+iki" })
    ]);
    const header = screen.getByText("2 dosya değişti").parentElement!;
    expect(header.textContent).toContain("+3");
    expect(header.textContent).toContain("−1");

    const row = screen.getByRole("button", { name: /Kart\.tsx/ });
    expect(row.getAttribute("aria-expanded")).toBe("false");
    expect(row.textContent).toContain("src/components");
    expect(screen.queryByText("+yeni satır")).toBeNull();

    fireEvent.click(row);
    expect(row.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("+yeni satır")).toBeTruthy();
    expect(screen.getByText("-eski satır")).toBeTruthy();
    // Öteki dosyanın farkı kapalı kalıyor.
    expect(screen.queryByText("+bir")).toBeNull();
  });
});

describe("ChatBubble içinde", () => {
  const answer = (extra: Partial<ChatMessage> = {}): ChatMessage =>
    ({ id: "a1", role: "assistant", content: "Tamam", createdAt: Date.now(), ...extra }) as ChatMessage;
  const renderBubble = (message: ChatMessage) =>
    render(
      <LanguageProvider language="tr">
        <ChatBubble message={message} />
      </LanguageProvider>
    );

  it("biten cevabın altında değişen dosyalar görünüyor, akış sürerken görünmüyor", () => {
    const steps = [step("edit", { target: "a.ts", diff: "-1\n+2" })];
    renderBubble(answer({ steps }));
    expect(screen.getByText("1 dosya değişti")).toBeTruthy();
    cleanup();
    renderBubble(answer({ steps, streaming: true }));
    expect(screen.queryByText("1 dosya değişti")).toBeNull();
  });
});
