// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import AxetCodeHome from "../src/components/AxetCodeHome";

// Görev 10 ve 11 YALNIZCA bu yardımcıyı değiştiriyor; aşağıdaki `it`
// gövdeleri taşımadan önce ve sonra aynı kalmalı (spec §5.4).
function renderChatHome() {
  return render(
    <LanguageProvider language="tr">
      <AxetCodeHome
        active
        config={null}
        pushToast={() => {}}
        recentEntries={[]}
        connectivity={{}}
        tierOverrides={{}}
        onOpenSapLauncher={() => {}}
        onQuickConnectSap={() => {}}
        sapChatRequest={null}
        workDirRequest={null}
        activeSap={null}
      />
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
