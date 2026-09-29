// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChatToolRun, { summarizeKinds } from "../src/components/ChatToolRun";
import type { AxetChatActivity } from "../app-electron/shared/types";

afterEach(cleanup);

let seq = 0;
const step = (tool: string, extra: Partial<AxetChatActivity> = {}, id = `${tool}-${seq++}`): AxetChatActivity => ({
  phase: "tool",
  tool,
  callId: id,
  ...extra
});

const renderRun = (steps: AxetChatActivity[], status: "running" | "done" = "done") =>
  render(
    <LanguageProvider language="tr">
      <ChatToolRun steps={steps} status={status} />
    </LanguageProvider>
  );

const header = () => screen.getByRole("button", { expanded: false }) as HTMLButtonElement;

describe("ChatToolRun", () => {
  it("başlık adımları sayıp türleri ilk görülme sırasıyla özetliyor", () => {
    renderRun([step("view", { target: "a.ts" }), step("edit"), step("read"), step("grep")]);
    expect(screen.getByText("4 araç işlemi")).toBeTruthy();
    expect(screen.getByText("2× Okuma · 1× Düzenleme · 1× İçerik arama")).toBeTruthy();
  });

  it("summarizeKinds read ile view'ı aynı türde topluyor", () => {
    const kinds = summarizeKinds([step("view"), step("read"), step("bash")]);
    expect(kinds.map((k) => [k.kind, k.count])).toEqual([
      ["view", 2],
      ["bash", 1]
    ]);
  });

  it("MCP araç adı ön eksiz ve alt çizgisiz yazılıyor", () => {
    renderRun([step("mcp:outlook_list_emails")]);
    expect(screen.getByText("1× outlook list emails")).toBeTruthy();
  });

  it("durum: hata varsa failed, tur sürüyorsa running, yoksa done", () => {
    renderRun([step("view"), step("bash", { failed: true })], "running");
    expect(header().dataset.status).toBe("failed");
    cleanup();
    renderRun([step("view")], "running");
    expect(header().dataset.status).toBe("running");
    cleanup();
    renderRun([step("view")], "done");
    expect(header().dataset.status).toBe("done");
  });

  it("kapalı başlıyor, tıklayınca liste açılıyor", () => {
    renderRun([step("view")]);
    expect(screen.queryByTestId("tool-run-list")).toBeNull();
    fireEvent.click(header());
    expect(screen.getByTestId("tool-run-list")).toBeTruthy();
    expect(screen.getByRole("button", { expanded: true })).toBeTruthy();
  });

  it("yalnız ayrıntısı olan adım tıklanabilir ve iki ayrıntı aynı anda açık kalabiliyor", () => {
    renderRun([
      step("edit", { diff: "-a\n+b" }, "c1"),
      step("view", {}, "c2"),
      step("bash", { output: "tamam çıktı" }, "c3")
    ]);
    fireEvent.click(header());
    const list = screen.getByTestId("tool-run-list");
    const clickable = list.querySelectorAll('[role="button"]');
    expect(clickable.length).toBe(2);
    fireEvent.click(clickable[0]);
    fireEvent.click(clickable[1]);
    expect(screen.getByText("+b")).toBeTruthy();
    expect(screen.getByText("tamam çıktı")).toBeTruthy();
  });

  // Review Focus 4
  it("30+ adımda açık liste sınırlı yükseklikte kendi içinde kayıyor", () => {
    renderRun(Array.from({ length: 34 }, (_, i) => step("view", { target: `f${i}.ts` }, `c${i}`)));
    fireEvent.click(header());
    const list = screen.getByTestId("tool-run-list");
    expect(list.className).toContain("max-h-[320px]");
    expect(list.className).toContain("overflow-auto");
    expect(screen.getByText("34 araç işlemi")).toBeTruthy();
  });

  // jsdom yerleşim yapmıyor: ölçüler ve kaydırma konumu elle veriliyor.
  const fakeScroll = (el: HTMLElement, top: number) => {
    Object.defineProperty(el, "scrollHeight", { configurable: true, value: 1000 });
    Object.defineProperty(el, "clientHeight", { configurable: true, value: 320 });
    Object.defineProperty(el, "scrollTop", { configurable: true, writable: true, value: top });
    fireEvent.scroll(el);
  };
  const liveSteps = (n: number) => Array.from({ length: n }, (_, i) => step("view", { target: `f${i}.ts` }, `c${i}`));
  const rerenderLive = (rerender: (ui: React.ReactElement) => void, n: number) =>
    rerender(
      <LanguageProvider language="tr">
        <ChatToolRun steps={liveSteps(n)} status="running" />
      </LanguageProvider>
    );

  it("canlı turda liste dipteyken yeni adım gelince dipte kalıyor", () => {
    const { rerender } = renderRun(liveSteps(30), "running");
    fireEvent.click(header());
    const list = screen.getByTestId("tool-run-list");
    fakeScroll(list, 680);
    rerenderLive(rerender, 31);
    expect(list.scrollTop).toBe(1000);
  });

  it("canlı turda kullanıcı listeyi yukarı kaydırdıysa yeni adım onu çekmiyor", () => {
    const { rerender } = renderRun(liveSteps(30), "running");
    fireEvent.click(header());
    const list = screen.getByTestId("tool-run-list");
    fakeScroll(list, 100);
    rerenderLive(rerender, 31);
    expect(list.scrollTop).toBe(100);
  });

  it("canlı turda kullanıcı bir ayrıntı açtıysa yeni son adımın ayrıntısı da açılıyor", () => {
    const first = [step("bash", { output: "birinci" }, "c1")];
    const { rerender } = renderRun(first, "running");
    fireEvent.click(header());
    fireEvent.click(screen.getByTestId("tool-run-list").querySelector('[role="button"]')!);
    expect(screen.getByText("birinci")).toBeTruthy();
    rerender(
      <LanguageProvider language="tr">
        <ChatToolRun steps={[...first, step("bash", { output: "ikinci" }, "c2")]} status="running" />
      </LanguageProvider>
    );
    expect(screen.getByText("ikinci")).toBeTruthy();
  });
});
