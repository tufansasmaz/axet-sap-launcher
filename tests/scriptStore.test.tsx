// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SapGuiScriptingHome from "../src/components/SapGuiScriptingHome";
import ScriptSidebar from "../src/components/ScriptSidebar";
import {
  ScriptStoreProvider,
  useScriptCommands,
  useScriptStore,
  type ScriptCommands,
  type ScriptStore
} from "../src/stores/scriptStore";
import { SESSION, installScriptApi, type ScriptApiFake } from "./scriptApiFake";
import type { GuiScriptScreenState, GuiScriptSessionInfo } from "../app-electron/shared/types";

let store: ScriptStore;
let commands: ScriptCommands;
function Probe() {
  store = useScriptStore();
  commands = useScriptCommands();
  return null;
}

// `show` false iken ekran ve kenar çubuğu unmount oluyor: kullanıcının başka
// bir moda geçmesi. Store yerinde kalıyor, `App`'teki gibi.
function Harness({ show }: { show: boolean }) {
  return (
    <LanguageProvider language="tr">
      <ScriptStoreProvider>
        <Probe />
        {show && (
          <>
            <ScriptSidebar />
            <SapGuiScriptingHome activeSap={null} />
          </>
        )}
      </ScriptStoreProvider>
    </LanguageProvider>
  );
}

let api: ScriptApiFake;
beforeEach(() => {
  api = installScriptApi();
});
afterEach(cleanup);

async function openSession() {
  fireEvent.click(await screen.findByRole("button", { name: "S4D Geliştirme" }));
  fireEvent.click(await screen.findByRole("button", { name: /^SE38 S4D/ }));
  await screen.findAllByText("wnd[0]");
}

const noop: ScriptCommands = {
  selectSession() {},
  toggleConn() {},
  toggleNode() {},
  selectElement() {}
};

describe("ScriptStore", () => {
  it("Provider olmadan kullanılırsa açık bir hata veriyor", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ScriptStoreProvider/);
    spy.mockRestore();
  });

  it("komutlar kayıttan önce sessiz, sonra kayda gidiyor; aracının kimliği değişmiyor", () => {
    render(<Harness show={false} />);
    const first = commands;
    expect(() => commands.selectSession(0, 0)).not.toThrow();
    const selectSession = vi.fn();
    let off = () => {};
    act(() => {
      off = store.registerScriptCommands({ ...noop, selectSession });
    });
    commands.selectSession(1, 2);
    expect(selectSession).toHaveBeenCalledWith(1, 2);
    act(() => off());
    commands.selectSession(3, 4);
    expect(selectSession).toHaveBeenCalledTimes(1);
    expect(commands).toBe(first);
  });

  it("eski kaydın iptali yeni kaydı silmiyor", () => {
    render(<Harness show={false} />);
    const a = vi.fn();
    const b = vi.fn();
    let offA = () => {};
    act(() => {
      offA = store.registerScriptCommands({ ...noop, toggleNode: a });
      store.registerScriptCommands({ ...noop, toggleNode: b });
    });
    act(() => offA());
    commands.toggleNode("x");
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith("x");
  });

  it("clearSelection seçimi, düğümleri ve seçili öğeyi temizliyor", () => {
    render(<Harness show={false} />);
    act(() => {
      store.setActiveSession({ connIdx: 0, sessIdx: 0 });
      store.setNodesByKey({ "0:0:__root__": "loading" });
      store.setExpandedNodes({ "0:0:__root__": true });
      store.setSelectedElementId("wnd[0]");
    });
    act(() => store.clearSelection());
    expect(store.activeSession).toBeNull();
    expect(store.nodesByKey).toEqual({});
    expect(store.expandedNodes).toEqual({});
    expect(store.selectedElementId).toBe("");
  });
});

describe("Script'ten çıkıp dönmek", () => {
  it("seçim ve ağaç korunuyor, oturum hâlâ açıksa bağlam yeniden yayımlanıyor", async () => {
    const view = render(<Harness show />);
    await openSession();
    view.rerender(<Harness show={false} />);
    expect(store.activeSession).toEqual({ connIdx: 0, sessIdx: 0 });

    api.getGuiScriptNode.mockClear();
    api.getGuiScriptScreen.mockClear();
    api.setActiveGuiContext.mockClear();
    view.rerender(<Harness show />);

    // Eski ağaç istek beklemeden görünüyor. Denetçi de kökün adını yazdığı
    // için metnin varlığı yetmiyor: ilk eşleşme, açma oku olan ağaç satırı.
    expect(screen.getAllByText("wnd[0]")[0].parentElement!.querySelector("button")).toBeTruthy();
    await waitFor(() => expect(api.getGuiScriptScreen).toHaveBeenCalledWith(0, 0));
    await waitFor(() =>
      expect(api.setActiveGuiContext).toHaveBeenCalledWith(
        expect.objectContaining({ connectionIndex: 0, sessionIndex: 0, transaction: "SE38" })
      )
    );
    expect(screen.getByRole("button", { name: /^SE38 S4D/ }).getAttribute("aria-current")).toBe("true");
    // Düğümler önbellekten geliyor.
    expect(api.getGuiScriptNode).not.toHaveBeenCalled();
  });

  it("seçili oturum arada kapandıysa seçim temizleniyor ve eski oturuma istek gitmiyor", async () => {
    const view = render(<Harness show />);
    await openSession();
    fireEvent.click(screen.getAllByText("wnd[0]")[0]);
    await waitFor(() => expect(store.selectedElementId).toBe("wnd[0]"));
    view.rerender(<Harness show={false} />);

    api.listGuiScriptSessions.mockResolvedValue({ ok: true, sessions: [] });
    api.getGuiScriptNode.mockClear();
    api.getGuiScriptScreen.mockClear();
    api.captureGuiScriptScreenshot.mockClear();
    view.rerender(<Harness show />);

    await waitFor(() => expect(store.activeSession).toBeNull());
    expect(store.nodesByKey).toEqual({});
    expect(store.expandedNodes).toEqual({});
    expect(store.selectedElementId).toBe("");
    expect(screen.getByText("Ekran ağacını görmek için sol taraftan bir oturum seç.")).toBeTruthy();
    expect(api.getGuiScriptNode).not.toHaveBeenCalled();
    expect(api.getGuiScriptScreen).not.toHaveBeenCalled();
    // Oturumsuz `window` yakalaması (ilk iki argüman null) serbest; oturuma giden yok.
    expect(api.captureGuiScriptScreenshot.mock.calls.filter((call) => call[0] !== null)).toEqual([]);
  });

  it("köprü arada kapandıysa ağaç temizleniyor ve kenar çubuğu 'Köprü kapalı' diyor", async () => {
    const view = render(<Harness show />);
    await openSession();
    view.rerender(<Harness show={false} />);

    api.getGuiScriptBridgeStatus.mockResolvedValue({ running: false, port: null, external: false });
    view.rerender(<Harness show />);

    await waitFor(() => expect(store.connections).toBeNull());
    expect(store.activeSession).toBeNull();
    expect(await screen.findByText("Köprü kapalı")).toBeTruthy();
  });
});

// Dönüş doğrulaması sürerken kenar çubuğu tıklanabilir. Kullanıcı o arada
// başka bir oturum seçerse, doğrulamanın cevabı bu yeni seçimi ne silmeli ne
// de eski oturumun ekran bilgisini yeni oturumun adına yayımlamalı.
describe("Dönüş doğrulaması sürerken başka oturum seçmek", () => {
  const SESSION_B: GuiScriptSessionInfo = {
    index: 1,
    id: "/app/con[0]/ses[1]",
    busy: false,
    info: { Transaction: "VA01", Program: "SAPMV45A", SystemName: "S4D", Client: "100", User: "TESTUSER" }
  };
  const screenOf = (sessIdx: number): GuiScriptScreenState =>
    sessIdx === 1
      ? { systemName: "S4D", client: "100", user: "TESTUSER", transaction: "VA01", program: "SAPMV45A", title: "Satış" }
      : { systemName: "S4D", client: "100", user: "TESTUSER", transaction: "SE38", program: "SAPLWBABAP", title: "ABAP Editörü" };

  for (const [label, sessionsAfter] of [
    ["eski oturum hâlâ açık", [SESSION, SESSION_B]],
    ["eski oturum arada kapanmış", [SESSION_B]]
  ] as const) {
    it(`yeni seçim korunuyor, bağlam yeni oturumun (${label})`, async () => {
      api.listGuiScriptSessions.mockResolvedValue({ ok: true, sessions: [SESSION, SESSION_B] });
      api.getGuiScriptScreen.mockImplementation((_connIdx: number, sessIdx: number) =>
        Promise.resolve({ ok: true, screen: screenOf(sessIdx) })
      );
      const view = render(<Harness show />);
      await openSession();
      view.rerender(<Harness show={false} />);

      // Doğrulamanın oturum listesi okuması kullanıcı tıklayana kadar bekliyor.
      let release = () => {};
      api.listGuiScriptSessions.mockImplementation(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ ok: true, sessions: [...sessionsAfter] });
          })
      );
      api.listGuiScriptSessions.mockClear();
      view.rerender(<Harness show />);
      await waitFor(() => expect(api.listGuiScriptSessions).toHaveBeenCalled());

      api.getGuiScriptScreen.mockClear();
      api.setActiveGuiContext.mockClear();
      fireEvent.click(screen.getByRole("button", { name: /^VA01 S4D/ }));
      await waitFor(() =>
        expect(api.setActiveGuiContext).toHaveBeenCalledWith(
          expect.objectContaining({ sessionIndex: 1, transaction: "VA01" })
        )
      );

      await act(async () => {
        release();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(store.activeSession).toEqual({ connIdx: 0, sessIdx: 1 });
      expect(screen.getByRole("button", { name: /^VA01 S4D/ }).getAttribute("aria-current")).toBe("true");
      // Eski oturumun ekranı hiç istenmiyor; yayımlanan her bağlam yeni oturumun.
      expect(api.getGuiScriptScreen).not.toHaveBeenCalledWith(0, 0);
      const published = api.setActiveGuiContext.mock.calls.map((call) => call[0]).filter(Boolean);
      expect(published.length).toBeGreaterThan(0);
      for (const gui of published) {
        expect(gui).toEqual(expect.objectContaining({ sessionIndex: 1, transaction: "VA01" }));
      }
    });
  }
});
