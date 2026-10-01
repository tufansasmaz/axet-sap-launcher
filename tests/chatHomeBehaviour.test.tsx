// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import AxetCodeHome from "../src/components/AxetCodeHome";
import ChatSidebar from "../src/components/ChatSidebar";
import { ChatStoreProvider } from "../src/stores/chatStore";

// Görev 10 ve 11 YALNIZCA bu yardımcıyı değiştiriyor; aşağıdaki `it`
// gövdeleri taşımadan önce ve sonra aynı kalmalı (spec §5.4).
function renderChatHome() {
  return render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={() => {}}>
        <ChatSidebar
          recentEntries={[]}
          connectivity={{}}
          tierOverrides={{}}
          activeSap={null}
          onOpenSapLauncher={() => {}}
          onQuickConnectSap={() => {}}
        />
        <AxetCodeHome
          active
          config={null}
          pushToast={() => {}}
          recentEntries={[]}
          sapChatRequest={null}
          workDirRequest={null}
          activeSap={null}
        />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}

const saveChatSessions = vi.fn(() => Promise.resolve({ ok: true }));
let loadResolve: ((v: unknown) => void) | null = null;

beforeEach(() => {
  saveChatSessions.mockClear();
  loadResolve = null;
  const impl: Record<string, unknown> = {
    loadChatSessions: () => new Promise((r) => { loadResolve = r; }),
    saveChatSessions
  };
  // Tanımlanmayan her `window.api` işlevi hiç dönmeyen bir söz veriyor;
  // `on…` abonelikleri boş bir abonelik iptali.
  (window as unknown as { api: unknown }).api = new Proxy({}, {
    get: (_t, k: string) => {
      if (k in impl) return impl[k];
      if (k.startsWith("on")) return () => () => {};
      return () => new Promise(() => {});
    }
  });
  // jsdom'da ikisi de yok; sohbet paneli seçilen sohbeti açarken çağırıyor.
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.scrollTo = () => {};
});
afterEach(cleanup);

const T0 = 1_700_000_000_000;
function session(id: string, title: string, over: Record<string, unknown> = {}) {
  return {
    id, title, model: null, draft: "", createdAt: T0, updatedAt: T0,
    messages: [{ id: `${id}-m`, role: "user", content: `${title} içeriği`, createdAt: T0 }],
    ...over
  };
}
const PROJECT = { id: "p1", name: "Proje A", instructions: "", createdAt: T0, updatedAt: T0 };

async function load(state: Record<string, unknown>) {
  await act(async () => {
    loadResolve?.({ ok: true, state });
  });
}
async function wait(ms: number) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}
const rowOf = (title: string) => screen.getAllByTitle(title).find((el) => el.getAttribute("role") === "button")!;

describe("sohbet listesi (taşıma öncesi davranış)", () => {
  it("proje, SAP ve genel gruplarının başlıkları sayılarıyla görünüyor", async () => {
    renderChatHome();
    await load({
      activeId: null,
      projects: [PROJECT],
      sessions: [
        session("a", "Proje sohbeti", { projectId: "p1" }),
        session("b", "SAP sohbeti", { cwd: "C:\\sap\\S4D", sapLabel: "S4D · 100" }),
        session("c", "Genel bir", {}),
        session("d", "Genel iki", {})
      ]
    });
    expect(screen.getByRole("button", { name: /^Projeler\s*1$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^SAP sohbetleri\s*1$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Sohbetler\s*2$/ })).toBeTruthy();
  });

  it("arama grupları açıp yalnızca eşleşeni gösteriyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [], sessions: [session("c", "Fatura listesi"), session("d", "Stok raporu")] });
    fireEvent.change(screen.getByPlaceholderText("Sohbetlerde ara…"), { target: { value: "fatura" } });
    expect(rowOf("Fatura listesi")).toBeTruthy();
    expect(screen.queryByTitle("Stok raporu")).toBeNull();
  });

  it("yeniden adlandırma: Enter kaydediyor, Escape vazgeçiyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [], sessions: [session("c", "Eski ad")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(screen.getAllByTitle("Yeniden adlandır")[0]);
    const input = screen.getByDisplayValue("Eski ad");
    fireEvent.change(input, { target: { value: "Yeni ad" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(rowOf("Yeni ad")).toBeTruthy();

    fireEvent.click(screen.getAllByTitle("Yeniden adlandır")[0]);
    const again = screen.getByDisplayValue("Yeni ad");
    fireEvent.change(again, { target: { value: "Vazgeçilen" } });
    fireEvent.keyDown(again, { key: "Escape" });
    expect(rowOf("Yeni ad")).toBeTruthy();
    expect(screen.queryByTitle("Vazgeçilen")).toBeNull();
  });

  it("silme onay istiyor, onaylayınca satır gidiyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [], sessions: [session("c", "Silinecek")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(screen.getAllByTitle("Sohbeti sil")[0]);
    expect(rowOf("Silinecek")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(screen.queryByTitle("Silinecek")).toBeNull();
  });

  it("projeye taşıma sohbeti proje grubuna alıyor", async () => {
    renderChatHome();
    await load({ activeId: null, projects: [PROJECT], sessions: [session("c", "Taşınacak")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(screen.getAllByTitle("Projeye taşı")[0]);
    const menuItems = screen.getAllByTitle("Proje A");
    fireEvent.click(menuItems[menuItems.length - 1]);
    // Genel grup boşaldığı için başlığı kalktı; sohbet kapalı proje grubunda.
    expect(screen.queryByRole("button", { name: /^Sohbetler\s*\d+$/ })).toBeNull();
    expect(screen.queryByTitle("Taşınacak")).toBeNull();
    fireEvent.click(rowOf("Proje A"));
    expect(rowOf("Taşınacak")).toBeTruthy();
  });

  it("seçili satır aria-current taşıyor; Yeni sohbet seçimi kaldırıyor", async () => {
    renderChatHome();
    // Diskteki `activeId` yüklemede bilerek yok sayılıyor (her açılış boş
    // sohbetle başlıyor); seçim tıklayarak kuruluyor.
    await load({ activeId: null, projects: [], sessions: [session("c", "Seçili"), session("d", "Diğer")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(rowOf("Seçili"));
    expect(rowOf("Seçili").getAttribute("aria-current")).toBe("true");
    expect(rowOf("Diğer").getAttribute("aria-current")).toBeNull();
    fireEvent.click(screen.getByTitle("Yeni sohbet (Ctrl+N)"));
    expect(rowOf("Seçili").getAttribute("aria-current")).toBeNull();
  });

  it("yükleme bitmeden kayıt çağrılmıyor, bittikten sonra çağrılıyor", async () => {
    renderChatHome();
    fireEvent.click(screen.getByTitle("Yeni proje"));
    await wait(700);
    expect(saveChatSessions).not.toHaveBeenCalled();
    await load({ activeId: null, projects: [], sessions: [session("c", "Var olan")] });
    fireEvent.click(screen.getByTitle("Yeni proje"));
    await wait(700);
    expect(saveChatSessions).toHaveBeenCalled();
  });
});

describe("mesaj kuyruğu", () => {
  // Her çağrı ayrı bir söz; testi bitirmek testin elinde.
  function setupSend() {
    const calls: { prompt: string; resolve: (v: unknown) => void }[] = [];
    const api = (window as unknown as { api: Record<string, unknown> }).api;
    const send = vi.fn(
      (_r: string, _s: string, _c: string, _m: unknown, _h: unknown, prompt: string) =>
        new Promise((resolve) => calls.push({ prompt, resolve }))
    );
    (window as unknown as { api: unknown }).api = new Proxy(api, {
      get: (target, k: string) => (k === "sendChatMessage" ? send : (target as Record<string, unknown>)[k])
    });
    return { calls, send };
  }

  async function openChat() {
    renderChatHome();
    await load({ activeId: null, projects: [], sessions: [session("c", "Sohbetim")] });
    fireEvent.click(screen.getByText("Sohbetler"));
    fireEvent.click(rowOf("Sohbetim"));
    // Sohbet panelleri önce, gizli "yeni sohbet" paneli en sonda çiziliyor.
    const boxes = screen.getAllByPlaceholderText("axet.code'a bir şey sor…") as HTMLTextAreaElement[];
    return boxes[0];
  }

  function type(box: HTMLTextAreaElement, text: string) {
    fireEvent.change(box, { target: { value: text } });
    fireEvent.keyDown(box, { key: "Enter" });
  }

  it("cevap sürerken yazılan sıraya giriyor, tur bitince kendiliğinden gidiyor", async () => {
    const { calls, send } = setupSend();
    const box = await openChat();
    type(box, "birinci");
    await wait(0);
    expect(send).toHaveBeenCalledTimes(1);

    type(box, "ikinci");
    type(box, "üçüncü");
    expect(box.value).toBe("");
    expect(screen.getByTestId("chat-queued").textContent).toContain("ikinci");
    expect(send).toHaveBeenCalledTimes(1);

    await act(async () => calls[0].resolve({ ok: true, text: "cevap" }));
    await wait(0);
    expect(send).toHaveBeenCalledTimes(2);
    expect(calls[1].prompt).toContain("ikinci\n\nüçüncü");
    expect(screen.queryByTestId("chat-queued")).toBeNull();
  });

  it("tur durdurulursa sıradaki gönderilmiyor, kutuya geri dönüyor", async () => {
    const { calls, send } = setupSend();
    const box = await openChat();
    type(box, "birinci");
    await wait(0);
    type(box, "ikinci");

    await act(async () => calls[0].resolve({ ok: false, cancelled: true, text: "" }));
    await wait(0);
    expect(send).toHaveBeenCalledTimes(1);
    expect(box.value).toBe("ikinci");
    expect(screen.queryByTestId("chat-queued")).toBeNull();
  });

  it("tur hatayla biterse de sıradaki gönderilmiyor, kutuya geri dönüyor", async () => {
    const { calls, send } = setupSend();
    const box = await openChat();
    type(box, "birinci");
    await wait(0);
    type(box, "ikinci");

    await act(async () => calls[0].resolve({ ok: false, error: "bağlantı koptu", text: "" }));
    await wait(0);
    expect(send).toHaveBeenCalledTimes(1);
    expect(box.value).toBe("ikinci");
  });

  it("şeritten silinebiliyor ya da kutuya geri alınabiliyor", async () => {
    setupSend();
    const box = await openChat();
    type(box, "birinci");
    await wait(0);
    type(box, "ikinci");
    fireEvent.click(screen.getByTitle("Kutuya geri al"));
    expect(box.value).toBe("ikinci");
    expect(screen.queryByTestId("chat-queued")).toBeNull();

    type(box, "ikinci");
    fireEvent.click(screen.getByTitle("Sıradan çıkar"));
    expect(screen.queryByTestId("chat-queued")).toBeNull();
    expect(box.value).toBe("");
  });

  it("diske yazılırken sıradaki taslağa katılıyor", async () => {
    setupSend();
    const box = await openChat();
    type(box, "birinci");
    await wait(0);
    type(box, "ikinci");
    await wait(700);
    const saved = saveChatSessions.mock.calls.at(-1) as unknown as [{ sessions: { id: string; draft: string }[] }];
    expect(saved[0].sessions.find((s) => s.id === "c")?.draft).toBe("ikinci");
  });

  // Kenar çubuğundaki satır noktası: çalışıyor / bitti ama bakılmadı.
  describe("dikkat noktası", () => {
    async function openTwo() {
      renderChatHome();
      await load({ activeId: null, projects: [], sessions: [session("a", "Birinci"), session("b", "İkinci")] });
      fireEvent.click(screen.getByText("Sohbetler"));
      fireEvent.click(rowOf("Birinci"));
      // Gönderim etkin sohbete gidiyor; hangi panelin kutusu olduğu önemsiz.
      return (screen.getAllByPlaceholderText("axet.code'a bir şey sor…") as HTMLTextAreaElement[])[0];
    }
    const dot = (title: string) => rowOf(title).querySelector("[data-attention]")?.getAttribute("data-attention") ?? null;

    it("başka sohbetteyken biten tur 'bakılmadı' bırakıyor, açınca kalkıyor", async () => {
      const { calls } = setupSend();
      const box = await openTwo();
      type(box, "soru");
      await wait(0);
      expect(dot("Birinci")).toBe("working");

      fireEvent.click(rowOf("İkinci"));
      await act(async () => calls[0].resolve({ ok: true, text: "cevap" }));
      await wait(0);
      expect(dot("Birinci")).toBe("unseen");

      fireEvent.click(rowOf("Birinci"));
      await wait(0);
      expect(dot("Birinci")).toBeNull();
    });

    it("açık sohbette biten tur nokta bırakmıyor", async () => {
      const { calls } = setupSend();
      const box = await openTwo();
      type(box, "soru");
      await wait(0);
      await act(async () => calls[0].resolve({ ok: true, text: "cevap" }));
      await wait(0);
      expect(dot("Birinci")).toBeNull();
    });
  });
});
