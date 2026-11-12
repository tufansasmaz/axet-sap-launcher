// @vitest-environment jsdom
// Ajanlar > Dosyalar ve "Gezgin'de ac" (kararlilik-2 R7).
// Kullanici: "Ajanlarda dosya goruntuleme yok. Dosya goruntuleme kisminda dosya
// dizinini acacak bir buton yok."
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import FilesView from "../src/agents/FilesView";
import ChatFilesPanel from "../src/components/ChatFilesPanel";
import { VIEW_TABS } from "../src/agents/ViewRail";
import { readWorkspaceView } from "../app-electron/shared/terminalLayout";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";

const win = window as unknown as { api: unknown };
const originalApi = win.api;

function fakeApi(impl: Record<string, unknown>) {
  return new Proxy(
    {},
    {
      get: (_t, k) => {
        if (typeof k !== "string") return undefined;
        if (k in impl) return impl[k];
        return k.startsWith("on") ? () => () => {} : () => new Promise(() => {});
      }
    }
  );
}

const ws: TerminalWorkspace = {
  id: "w1",
  name: "Ekip",
  panes: [],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "files"
};

let changesOpenRoot: ReturnType<typeof vi.fn>;
let openExternal: ReturnType<typeof vi.fn>;
let agentsFilesRoot: ReturnType<typeof vi.fn>;

beforeEach(() => {
  changesOpenRoot = vi.fn(() => Promise.resolve(true));
  openExternal = vi.fn(() => Promise.resolve());
  agentsFilesRoot = vi.fn(() => Promise.resolve("C:\\proje\\ekip"));
  win.api = fakeApi({
    changesOpenRoot,
    openExternal,
    agentsFilesRoot,
    listDir: () => Promise.resolve({ ok: true, entries: [] }),
    listExplorerRoots: () => Promise.resolve(["C:\\proje"])
  });
});
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

describe("Ajanlar > Dosyalar", () => {
  it("koku ana surecten ister, yolu gosterir; Gezgin'de ac alanin kaydindan acar", async () => {
    render(
      <LanguageProvider language="tr">
        <FilesView workspace={ws} />
      </LanguageProvider>
    );
    expect(agentsFilesRoot).toHaveBeenCalledWith("w1");
    expect((await screen.findAllByTitle("C:\\proje\\ekip")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Gezgin'de aç" }));
    expect(changesOpenRoot).toHaveBeenCalledWith("w1");
  });

  it("kok yoksa aciklama gosterir, Gezgin dugmesi cikmaz", async () => {
    agentsFilesRoot.mockImplementation(() => Promise.resolve(null));
    render(
      <LanguageProvider language="tr">
        <FilesView workspace={ws} />
      </LanguageProvider>
    );
    expect(await screen.findByText(/proje klasörü bulunamadı/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gezgin'de aç" })).toBeNull();
  });

  it("onizleme salt okunur: FileViewer'a editable verilmiyor", () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "agents", "FilesView.tsx"), "utf8");
    expect(src).toMatch(/<FileViewer [^>]*\/>/);
    expect(src).not.toMatch(/<FileViewer [^>]*editable/);
  });

  it("gorunum rayinda ve kayitta 'files' var", () => {
    expect(VIEW_TABS).toContain("files");
    expect(readWorkspaceView("files")).toBe("files");
  });

  it("agents:filesRoot koku config'ten okur, renderer yol veremez", () => {
    const index = readFileSync(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8");
    const handler = index.slice(index.indexOf('ipcMain.handle("agents:filesRoot"'));
    const body = handler.slice(0, handler.indexOf("});"));
    expect(body).toContain("fromMain(event)");
    expect(body).toContain("boardWorkspaceInfo(");
    expect(body).toContain("grantUserRoot(info.cwd)");
  });
});

describe("Sohbet > Dosyalar paneli", () => {
  it("Klasoru Gezgin'de ac dugmesi sohbetin klasorunu acar", () => {
    render(
      <LanguageProvider language="tr">
        <ChatFilesPanel rootDir={"C:\\proje\\sohbet"} rootLabel="Sohbet" onClose={() => {}} active={false} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "Klasörü Gezgin'de aç" }));
    expect(openExternal).toHaveBeenCalledWith("C:\\proje\\sohbet");
  });
});
