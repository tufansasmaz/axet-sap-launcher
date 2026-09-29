// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { LanguageProvider } from "../src/i18n";
import ChatComposer, { type ChatComposerProps } from "../src/components/ChatComposer";

const impl: Record<string, (...args: unknown[]) => unknown> = {};
let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = new Proxy(
    {},
    { get: (_t, key: string) => impl[key] ?? (key.startsWith("on") ? () => () => {} : () => new Promise(() => {})) }
  );
});
afterEach(() => {
  cleanup();
  for (const k of Object.keys(impl)) delete impl[k];
  (window as unknown as { api: unknown }).api = prevApi;
});

const base = (): ChatComposerProps => ({
  active: true,
  draft: "",
  attachments: [],
  pending: false,
  recallText: "",
  models: [],
  model: null,
  modelsLoading: false,
  modelsError: null,
  onSelectModel: vi.fn(),
  attaching: false,
  onAttachFiles: vi.fn(),
  onRemoveAttachment: vi.fn(),
  onFilesResolved: vi.fn(),
  registerTextarea: vi.fn(),
  onDraftChange: vi.fn(),
  onSend: vi.fn(),
  onCancel: vi.fn(),
  contextPath: "C:/p",
  contextTokens: 0,
  contextLimit: 0
});

const renderComposer = (over: Partial<ChatComposerProps> = {}) => {
  const props = { ...base(), ...over };
  render(
    <LanguageProvider language="tr">
      <ChatComposer {...props} />
    </LanguageProvider>
  );
  return props;
};

// Taslağı gerçekten tutan sarmalayıcı — bahis menüsü taslağın değişmesine bakıyor.
function Stateful(over: Partial<ChatComposerProps>) {
  const [draft, setDraft] = useState("");
  return <ChatComposer {...base()} {...over} draft={draft} onDraftChange={setDraft} />;
}

describe("ChatComposer", () => {
  it("3 satırla başlıyor", () => {
    renderComposer();
    expect(screen.getByRole("textbox").getAttribute("rows")).toBe("3");
  });

  it("Enter gönderir, Shift+Enter göndermez", () => {
    const props = renderComposer({ draft: "merhaba" });
    const box = screen.getByRole("textbox");
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it("boş kutuda ↑ son istemi geri çağırıyor", () => {
    const props = renderComposer({ recallText: "önceki soru" });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "ArrowUp" });
    expect(props.onDraftChange).toHaveBeenCalledWith("önceki soru");
  });

  it("bahis menüsü açıkken Enter göndermiyor, seçimi uyguluyor", async () => {
    impl.searchFiles = async () => ({ ok: true, entries: [{ path: "C:/p/a.txt", rel: "a.txt" }] });
    Element.prototype.scrollIntoView = vi.fn();
    const onSend = vi.fn();
    render(
      <LanguageProvider language="tr">
        <Stateful onSend={onSend} />
      </LanguageProvider>
    );
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "@a", selectionStart: 2, selectionEnd: 2 } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByText("a.txt")).toBeTruthy();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
    expect(box.value).toBe("@a.txt ");
  });

  it("gönder ve durdur geçişi", () => {
    const props = renderComposer({ pending: true });
    fireEvent.click(screen.getByTitle("Durdur"));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    cleanup();
    renderComposer({ draft: "" });
    expect((screen.getByTitle("Gönder") as HTMLButtonElement).disabled).toBe(true);
  });

  it("bağlam halkası: ölçüm yokken yok, %60 uyarı, %80 tehlike", () => {
    renderComposer();
    expect(screen.queryByTestId("context-ring")).toBeNull();
    cleanup();
    renderComposer({ contextTokens: 50, contextLimit: 100 });
    expect(screen.getByTestId("context-ring").dataset.tone).toBe("normal");
    cleanup();
    renderComposer({ contextTokens: 60, contextLimit: 100 });
    expect(screen.getByTestId("context-ring").dataset.tone).toBe("warning");
    cleanup();
    renderComposer({ contextTokens: 80, contextLimit: 100 });
    expect(screen.getByTestId("context-ring").dataset.tone).toBe("danger");
  });

  // Review Focus 3
  it("boyama katmanı ile yazı alanı aynı ölçüleri taşıyor, yatay dolgu yok", () => {
    renderComposer({ draft: "@a.txt merhaba" });
    const box = screen.getByRole("textbox");
    const overlay = box.previousElementSibling as HTMLElement;
    const pick = (cls: string) =>
      cls.split(/\s+/).filter((c) => /^(py-|pt-|pb-|leading-|text-\[length)/.test(c)).sort();
    expect(pick(overlay.className)).toEqual(pick(box.className));
    for (const el of [overlay, box]) expect(el.className).not.toMatch(/(^|\s)(px|pl)-/);
    // Katman `absolute inset-0` ile ORTAK EBEVEYNİN dolgu kutusuna oturuyor;
    // ebeveynde yatay dolgu olursa katman yazı alanından geniş kalır ve kayar.
    expect(box.parentElement!.className).not.toMatch(/(^|\s)(px|pl|pr)-/);
  });
});

describe("sistem sekmesi", () => {
  // TierBadge'in kökünde işaret özniteliği yok; rozet metniyle aranıyor.
  it("rozet yalnız contextTier varken; klasör adı son parça, tam yol title'da", () => {
    renderComposer({ contextPath: "C:/Proj/P01", contextLabel: "P01 Üretim" });
    const tab = screen.getByTestId("system-tab");
    expect(tab.textContent).toContain("P01 Üretim");
    expect(screen.getByTitle("C:/Proj/P01").textContent).toBe("P01");
    expect(screen.queryByText("PRD")).toBeNull();
    cleanup();
    renderComposer({ contextPath: "C:/Proj/P01", contextLabel: "P01 Üretim", contextTier: "PRD" });
    expect(screen.getByTestId("system-tab").contains(screen.getByText("PRD"))).toBe(true);
  });

  it("Dosyalar ve Talimatlar geri çağrıları", () => {
    const onToggleFilesPanel = vi.fn();
    const onOpenInstructions = vi.fn();
    renderComposer({ contextPath: "C:/p", onToggleFilesPanel, onOpenInstructions });
    fireEvent.click(screen.getByText("Dosyalar"));
    fireEvent.click(screen.getByText("Yönergeler"));
    expect(onToggleFilesPanel).toHaveBeenCalledTimes(1);
    expect(onOpenInstructions).toHaveBeenCalledTimes(1);
  });

  it("klasör yoksa sekme yok", () => {
    renderComposer({ contextPath: null });
    expect(screen.queryByTestId("system-tab")).toBeNull();
  });

  // Review Focus 2
  it("uzun adlar kırpılıyor, sekme kutudan geniş olmuyor, düğmeler küçülmüyor", () => {
    renderComposer({
      contextPath: "C:/" + "cok-uzun-klasor-".repeat(10),
      contextLabel: "Çok uzun bir sistem adı ".repeat(5),
      onToggleFilesPanel: vi.fn(),
      onOpenInstructions: vi.fn()
    });
    const tab = screen.getByTestId("system-tab");
    expect(tab.className).toContain("max-w-full");
    expect(tab.className).toContain("min-w-0");
    const label = screen.getByTestId("system-tab-label");
    const folder = screen.getByTestId("system-tab-folder");
    for (const el of [label, folder]) {
      expect(el.className).toContain("truncate");
      expect(el.className).toContain("min-w-0");
    }
    for (const text of ["Dosyalar", "Yönergeler"])
      expect(screen.getByText(text).closest("button")!.className).toContain("shrink-0");
  });
});
