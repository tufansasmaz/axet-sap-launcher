import { configure } from "@testing-library/react";
import { vi } from "vitest";
import type {
  GuiScriptBridgeStatus,
  GuiScriptComponentDetail,
  GuiScriptComponentSummary,
  GuiScriptConnectionInfo,
  GuiScriptScreenState,
  GuiScriptSessionInfo
} from "../app-electron/shared/types";

// Script ekranı testlerinin sahte köprüsü. Bir bağlantı, içinde SE38'de
// duran bir oturum ve üç katlı bir ekran ağacı var. `window.api`'de burada
// tanımlanmayan her işlev hiç dönmeyen bir söz veriyor; `on…` abonelikleri
// boş bir iptal döndürüyor.

// Script ekranı ağır bir bileşen: ilk bağlantı düğmesi birkaç çizim turundan
// sonra çıkıyor. `npm test` bütün dosyaları paralel koşturunca bu, `findBy…`
// sorgularının varsayılan 1 saniyesini aşabiliyordu. Tek başına koşan dosya
// hep geçiyordu, yani sebep davranış değil zamanlama. Bu dosyayı import eden
// her test dosyası daha uzun bekliyor. Birkaç bekleme art arda gelen testler
// vitest'in 5 saniyelik test süresini de aşabildiği için o da uzatılıyor.
configure({ asyncUtilTimeout: 3000 });
vi.setConfig({ testTimeout: 15000 });

export const CONNECTION: GuiScriptConnectionInfo = { index: 0, description: "S4D Geliştirme", sessionCount: 1 };

export const SESSION: GuiScriptSessionInfo = {
  index: 0,
  id: "/app/con[0]/ses[0]",
  busy: false,
  info: { Transaction: "SE38", Program: "SAPLWBABAP", SystemName: "S4D", Client: "100", User: "TESTUSER" }
};

const SCREEN: GuiScriptScreenState = {
  systemName: "S4D",
  client: "100",
  user: "TESTUSER",
  transaction: "SE38",
  program: "SAPLWBABAP",
  title: "ABAP Editörü"
};

const USR: GuiScriptComponentSummary = { id: "wnd[0]/usr", type: "GuiUserArea", name: "usr", hasChildren: true };
const FIELD: GuiScriptComponentSummary = {
  id: "wnd[0]/usr/ctxtRS38M-PROGRAMM",
  type: "GuiCTextField",
  name: "RS38M-PROGRAMM",
  hasChildren: false
};

function detail(id: string, type: string, name: string, children: GuiScriptComponentSummary[]): GuiScriptComponentDetail {
  return { id, type, name, tooltip: "", changeable: false, subType: "", children };
}

// Anahtar, `getGuiScriptNode`'a giden öğe kimliği; kök `null` ile isteniyor.
const NODES: Record<string, GuiScriptComponentDetail> = {
  "": detail("wnd[0]", "GuiMainWindow", "wnd[0]", [USR]),
  "wnd[0]": detail("wnd[0]", "GuiMainWindow", "wnd[0]", [USR]),
  "wnd[0]/usr": detail("wnd[0]/usr", "GuiUserArea", "usr", [FIELD])
};

function createFake() {
  return {
    getGuiScriptBridgeStatus: vi.fn(
      (): Promise<GuiScriptBridgeStatus> => Promise.resolve({ running: true, port: 8790, external: false })
    ),
    listGuiScriptConnections: vi.fn(
      (): Promise<{ ok: boolean; connections?: GuiScriptConnectionInfo[]; error?: string }> =>
        Promise.resolve({ ok: true, connections: [CONNECTION] })
    ),
    listGuiScriptSessions: vi.fn(
      (_connIdx: number): Promise<{ ok: boolean; sessions?: GuiScriptSessionInfo[]; error?: string }> =>
        Promise.resolve({ ok: true, sessions: [SESSION] })
    ),
    getGuiScriptNode: vi.fn(
      (
        _connIdx: number,
        _sessIdx: number,
        elementId: string | null,
        _window?: { rows?: number; rowOffset?: number }
      ): Promise<{ ok: boolean; node?: GuiScriptComponentDetail; error?: string }> => {
        const node = NODES[elementId ?? ""];
        return Promise.resolve(node ? { ok: true, node } : { ok: false, error: "yok" });
      }
    ),
    getGuiScriptScreen: vi.fn(
      (_connIdx: number, _sessIdx: number): Promise<{ ok: boolean; screen?: GuiScriptScreenState; error?: string }> =>
        Promise.resolve({ ok: true, screen: SCREEN })
    ),
    // Görüntü hiç gelmiyor: ekran görüntüsü alanı bu testlerin konusu değil.
    captureGuiScriptScreenshot: vi.fn(
      (_connIdx: number | null, _sessIdx: number | null, _method: string): Promise<unknown> => new Promise(() => {})
    ),
    setActiveGuiContext: vi.fn((_gui: unknown): Promise<unknown> => Promise.resolve({}))
  };
}

export type ScriptApiFake = ReturnType<typeof createFake>;

export function installScriptApi(): ScriptApiFake {
  const fake = createFake();
  const impl: Record<string, unknown> = fake;
  (window as unknown as { api: unknown }).api = new Proxy(
    {},
    {
      get: (_t, k: string) => {
        if (k in impl) return impl[k];
        if (k.startsWith("on")) return () => () => {};
        return () => new Promise(() => {});
      }
    }
  );
  // jsdom'da yok; canlı ekran alanı (`ScreenViewer`) boyut izlemek için kuruyor.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  return fake;
}
