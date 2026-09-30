// @vitest-environment jsdom
// Terminal modu sağlayıcısı (spec §5): temizlik, başlatma sırası, olaylar,
// kalıcılık. `window.api` sahte; `createTerminal` elle çözülüyor.
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import { STARTUP_GRACE_MS, TerminalStoreProvider } from "../src/stores/terminalStore";
import { useTerminalStore, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { TERMINAL_MISSING_DIR } from "../app-electron/shared/terminalLayout";
import type { AppConfig } from "../app-electron/shared/types";

interface PendingCreate {
  cwd: string;
  shell: string;
  initialCommand: string | undefined;
  options: unknown;
  resolve: (id: string) => void;
  reject: (error: Error) => void;
}

let creates: PendingCreate[];
let finishDisposeAll: () => void;
let dataListeners: Set<(id: string, data: string) => void>;
let exitListeners: Set<(id: string, code: number) => void>;
let readyListeners: Set<(id: string) => void>;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let store: TerminalStoreValue;

const baseConfig = {
  terminal: "cmd",
  axetCommand: "",
  projectsBaseDir: "C:\\proj",
  axetWorkspaceDir: "C:\\axet",
  terminalWorkspaces: [],
  terminalActiveWorkspaceId: null
} as unknown as AppConfig;

beforeEach(() => {
  creates = [];
  dataListeners = new Set();
  exitListeners = new Set();
  readyListeners = new Set();
  api = {
    createTerminal: vi.fn(
      (cwd: string, _cols: number, _rows: number, shell: string, initialCommand?: string, options?: unknown) =>
        new Promise<string>((resolve, reject) => creates.push({ cwd, shell, initialCommand, options, resolve, reject }))
    ),
    disposeTerminal: vi.fn(() => Promise.resolve()),
    disposeAllTerminals: vi.fn(() => new Promise<void>((resolve) => { finishDisposeAll = resolve; })),
    onTerminalData: vi.fn((cb: (id: string, data: string) => void) => {
      dataListeners.add(cb);
      return () => dataListeners.delete(cb);
    }),
    onTerminalExit: vi.fn((cb: (id: string, code: number) => void) => {
      exitListeners.add(cb);
      return () => exitListeners.delete(cb);
    }),
    onTerminalReady: vi.fn((cb: (id: string) => void) => {
      readyListeners.add(cb);
      return () => readyListeners.delete(cb);
    }),
    saveConfig: vi.fn(async (partial: Partial<AppConfig>) => ({ ...baseConfig, ...partial }))
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

function Probe() {
  store = useTerminalStore();
  return null;
}

function Harness(props: { config?: AppConfig; projectRequest?: number; toasts?: string[] }) {
  return (
    <StrictMode>
      <LanguageProvider language="tr">
        <TerminalStoreProvider
          config={props.config ?? baseConfig}
          visible
          projectRequest={props.projectRequest ?? 0}
          pushToast={(_kind, text) => props.toasts?.push(text)}
          onConfigSaved={() => {}}
        >
          <Probe />
        </TerminalStoreProvider>
      </LanguageProvider>
    </StrictMode>
  );
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

/** Sağlayıcıyı kurar, temizliği bitirir: mod hazır, tek boş alan açık. */
async function ready(props: Parameters<typeof Harness>[0] = {}) {
  const utils = render(<Harness {...props} />);
  await flush();
  finishDisposeAll();
  await flush();
  return utils;
}

const panes = () => store.state.workspaces.flatMap((w) => w.panes);
const emitData = (id: string) => act(() => dataListeners.forEach((cb) => cb(id, "x")));
const emitExit = (id: string, code: number) => act(() => exitListeners.forEach((cb) => cb(id, code)));
const emitReady = (id: string) => act(() => readyListeners.forEach((cb) => cb(id)));

describe("açılış temizliği", () => {
  it("StrictMode'da bir kez çalışıyor ve bitmeden bölme başlamıyor", async () => {
    render(<Harness />);
    await flush();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    expect(api.disposeAllTerminals).toHaveBeenCalledTimes(1);
    expect(api.createTerminal).not.toHaveBeenCalled();

    finishDisposeAll();
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(1);
  });
});

describe("başlatma", () => {
  it("aynı anda en çok iki bölme başlıyor", async () => {
    await ready();
    act(() => {
      store.commands.addPane("cmd", "C:\\a");
      store.commands.addPane("cmd", "C:\\b");
      store.commands.addPane("cmd", "C:\\c");
    });
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(2);

    await act(async () => creates[0].resolve("pty-1"));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(3);
    expect(panes()[0].run).toEqual({ state: "running", ptyId: "pty-1" });
  });

  it("AXET bölmesi seçili kabukla ve komutla, klasör açmadan başlıyor", async () => {
    await ready({ config: { ...baseConfig, terminal: "powershell" } as AppConfig });
    act(() => store.commands.addPane("axet", "C:\\w"));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledWith("C:\\w", 120, 30, "powershell", "axet-code -y", { createDir: false });
  });

  it("düz kabuk komutsuz başlıyor", async () => {
    await ready();
    act(() => store.commands.addPane("powershell", "C:\\w"));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledWith("C:\\w", 120, 30, "powershell", undefined, { createDir: false });
  });

  it("başlarken kapatılan bölmenin geç gelen pty'si kapatılıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    act(() => store.commands.closePane(panes()[0].id));
    await act(async () => creates[0].resolve("pty-geç"));
    await flush();
    expect(api.disposeTerminal).toHaveBeenCalledWith("pty-geç");
    expect(panes()).toEqual([]);
  });

  it("başlarken yeniden başlatılan bölmede eski sonuç kapatılıyor, yenisi kalıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    const id = panes()[0].id;
    act(() => store.commands.restartPane(id));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(2);

    await act(async () => creates[0].resolve("pty-eski"));
    await act(async () => creates[1].resolve("pty-yeni"));
    await flush();
    expect(api.disposeTerminal).toHaveBeenCalledWith("pty-eski");
    expect(panes()[0].run).toEqual({ state: "running", ptyId: "pty-yeni" });
  });

  it("axet bölmelerde yuva terminal:ready gelene kadar tutulur, üçüncü önce başlamaz", async () => {
    await ready();
    act(() => {
      store.commands.addPane("axet", "C:\\a");
      store.commands.addPane("axet", "C:\\b");
      store.commands.addPane("axet", "C:\\c");
    });
    await flush();
    // İlk iki bölme başladı; üçüncü createTerminal bekliyor.
    expect(api.createTerminal).toHaveBeenCalledTimes(2);

    // İki pty çözüldü — ama terminal:ready gelmeden yuva serbest bırakılmamalı.
    await act(async () => { creates[0].resolve("pty-1"); });
    await flush();
    await act(async () => { creates[1].resolve("pty-2"); });
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(2);

    // terminal:ready pty-1 için gelince yuva açılıyor ve üçüncü başlıyor.
    await emitReady("pty-1");
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(3);
  });

  it("createTerminal dönmeden gelen ready ya da çıkış axet yuvasını kilitli bırakmıyor", async () => {
    await ready();
    act(() => {
      store.commands.addPane("axet", "C:\\a");
      store.commands.addPane("axet", "C:\\b");
      store.commands.addPane("axet", "C:\\c");
      store.commands.addPane("axet", "C:\\d");
    });
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(2);

    // pty-1'in ready'si, pty-2'nin çıkışı kimlikler sahiplenilmeden geliyor.
    await emitReady("pty-1");
    emitExit("pty-2", 0);
    await act(async () => { creates[0].resolve("pty-1"); });
    await flush();
    await act(async () => { creates[1].resolve("pty-2"); });
    await flush();
    // İki yuva da boşalmış olmalı: üçüncü ve dördüncü başlıyor.
    expect(api.createTerminal).toHaveBeenCalledTimes(4);
  });

  it("klasör yoksa bölme missingDir oluyor, başka hata mesajıyla failed", async () => {
    await ready();
    act(() => {
      store.commands.addPane("cmd", "C:\\yok");
      store.commands.addPane("cmd", "C:\\a");
    });
    await flush();
    await act(async () =>
      creates[0].reject(new Error(`Error invoking remote method 'terminal:create': Error: ${TERMINAL_MISSING_DIR}`))
    );
    await act(async () => creates[1].reject(new Error("Error invoking remote method 'terminal:create': Error: spawn EPERM")));
    await flush();
    expect(panes()[0].run).toEqual({ state: "missingDir" });
    expect(panes()[1].run).toEqual({ state: "failed", message: "spawn EPERM" });
    expect(store.state.workspaces[0].error).toBe(false); // görünen alana nokta konmaz
  });
});

describe("olaylar", () => {
  it("görünmeyen alandaki çıktı okunmadı işareti koyuyor, alana geçince siliniyor", async () => {
    // cmd bölmesi başlangıç süresinden sonra çıktı alınca okunmadı işareti koymalı.
    vi.useFakeTimers();
    try {
      await ready();
      act(() => store.commands.addPane("cmd", "C:\\a"));
      await flush();
      await act(async () => creates[0].resolve("pty-1"));
      await flush();
      const first = store.state.workspaces[0].id;

      emitData("pty-1");
      expect(store.state.workspaces[0].unread).toBe(false); // görünürken işaret yok

      act(() => store.commands.addWorkspace());

      // Başlangıç süresi bitmeden: işaret konmaz.
      emitData("pty-1");
      expect(store.state.workspaces[0].unread).toBe(false);

      // Başlangıç süresi geçince: işaret konuyor.
      act(() => vi.advanceTimersByTime(STARTUP_GRACE_MS));
      emitData("pty-1");
      expect(store.state.workspaces[0].unread).toBe(true);

      act(() => store.commands.selectWorkspace(first));
      expect(store.state.workspaces[0].unread).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("createTerminal dönmeden gelen çıkış kaybolmuyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    emitExit("pty-1", 3);
    await act(async () => creates[0].resolve("pty-1"));
    await flush();
    expect(panes()[0].run).toEqual({ state: "exited", ptyId: "pty-1", code: 3 });
  });
});

describe("kalıcılık", () => {
  it("düzen değişince yazıyor, çıktı gelince yazmıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    const calls = api.saveConfig.mock.calls.length;
    expect(api.saveConfig).toHaveBeenLastCalledWith({
      terminalWorkspaces: [
        { id: store.state.workspaces[0].id, name: "Çalışma alanı 1", panes: [{ id: panes()[0].id, kind: "cmd", cwd: "C:\\a" }] }
      ],
      terminalActiveWorkspaceId: store.state.workspaces[0].id
    });

    await act(async () => creates[0].resolve("pty-1"));
    emitData("pty-1");
    await flush();
    expect(api.saveConfig.mock.calls.length).toBe(calls);
  });

  it("kayıtlı düzen geri getirilince aynısını yeniden yazmıyor", async () => {
    const saved = [{ id: "w1", name: "SAP", panes: [{ id: "p1", kind: "cmd" as const, cwd: "C:\\a" }] }];
    await ready({ config: { ...baseConfig, terminalWorkspaces: saved, terminalActiveWorkspaceId: "w1" } as AppConfig });
    expect(store.state.phase).toBe("restorePrompt");
    act(() => store.commands.restore());
    await flush();
    expect(store.state.workspaces[0].name).toBe("SAP");
    expect(api.saveConfig).not.toHaveBeenCalled();
  });
});

describe("proje bölmesi", () => {
  it("sayaç artınca AXET bölmesi AXET klasöründe açılıyor", async () => {
    const utils = await ready();
    utils.rerender(<Harness projectRequest={1} />);
    await flush();
    expect(panes()).toHaveLength(1);
    expect(panes()[0]).toMatchObject({ kind: "axet", cwd: "C:\\axet" });
  });

  it("6 alan × 9 bölme doluyken bildirim çıkıyor", async () => {
    const toasts: string[] = [];
    const utils = await ready({ toasts });
    act(() => {
      for (let w = 0; w < 6; w += 1) {
        if (w > 0) store.commands.addWorkspace();
      }
    });
    for (const workspace of store.state.workspaces) {
      act(() => store.commands.selectWorkspace(workspace.id));
      act(() => {
        for (let p = 0; p < 9; p += 1) store.commands.addPane("cmd", "C:\\a");
      });
    }
    expect(panes()).toHaveLength(54);

    utils.rerender(<Harness projectRequest={1} toasts={toasts} />);
    await flush();
    expect(toasts).toEqual(["Yer kalmadı: 6 çalışma alanının hepsi dolu (her birinde 9 terminal). Bir bölme kapatıp yeniden deneyin."]);
  });
});

describe("başlangıç çıktısı: okunmadı nokta basılmaz", () => {
  /** axet bölmesi olan, aktif olmayan bir alan kurar; bölme running durumuna geçer. */
  async function hiddenAxetPane() {
    await ready();
    act(() => store.commands.addPane("axet", "C:\\a"));
    await flush();
    // İkinci alan seçilince axet bölmesinin alanı gizli olur.
    act(() => store.commands.addWorkspace());
    await act(async () => { creates[0].resolve("pty-axet"); });
    await flush();
  }

  it("axet bölmesi terminal:ready gelmeden gelen çıktı okunmadı yapmaz", async () => {
    await hiddenAxetPane();
    // terminal:ready henüz gelmedi; başlangıç kipi devam ediyor.
    await emitData("pty-axet");
    expect(store.state.workspaces[0].unread).toBe(false);
  });

  it("axet bölmesi terminal:ready sonrası gelen çıktı okunmadı yapar", async () => {
    await hiddenAxetPane();
    // terminal:ready ile başlangıç kipi bitiyor.
    await emitReady("pty-axet");
    await flush();
    await emitData("pty-axet");
    expect(store.state.workspaces[0].unread).toBe(true);
  });

  it("cmd bölmesi STARTUP_GRACE_MS içinde gelen çıktı okunmadı yapmaz", async () => {
    vi.useFakeTimers();
    try {
      await ready();
      act(() => store.commands.addPane("cmd", "C:\\a"));
      await flush();
      act(() => store.commands.addWorkspace());
      await act(async () => { creates[0].resolve("pty-cmd"); });
      await flush();
      // Başlangıç süresi içinde.
      await emitData("pty-cmd");
      expect(store.state.workspaces[0].unread).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cmd bölmesi STARTUP_GRACE_MS sonra gelen çıktı okunmadı yapar", async () => {
    vi.useFakeTimers();
    try {
      await ready();
      act(() => store.commands.addPane("cmd", "C:\\a"));
      await flush();
      act(() => store.commands.addWorkspace());
      await act(async () => { creates[0].resolve("pty-cmd"); });
      await flush();
      // Süre doluyor.
      act(() => vi.advanceTimersByTime(STARTUP_GRACE_MS));
      await emitData("pty-cmd");
      expect(store.state.workspaces[0].unread).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
