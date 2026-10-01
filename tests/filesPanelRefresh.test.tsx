// @vitest-environment jsdom
//
// Dosyalar paneli ajan çalışırken durmadan yenileniyordu (2026-10-01, ölçüldü):
// axet-code'un kendi veritabanı (`.axet-code/axet-code.db-wal`) izlenen klasörün
// İÇİNDE ve ajan her adımda oraya yazıyor. Üstüne her yenileme açık klasörleri
// bir anlığına "Yükleniyor…"a düşürdüğü için ağaç yanıp sönüyordu.
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ shell: {} }));

import { watchIgnored } from "../app-electron/main/fsExplorer";
import FileExplorer from "../src/components/FileExplorer";
import { LanguageProvider } from "../src/i18n";

afterEach(cleanup);

describe("watchIgnored", () => {
  it("ajanın kendi klasörü ve bilinen gürültü yok sayılıyor", () => {
    expect(watchIgnored(".axet-code\\axet-code.db-wal")).toBe(true);
    expect(watchIgnored(".axet-code")).toBe(true);
    expect(watchIgnored("src\\.git\\index")).toBe(true);
    expect(watchIgnored("node_modules/x/y.js")).toBe(true);
  });

  it("kullanıcının dosyaları yok sayılmıyor", () => {
    expect(watchIgnored("deneme.txt")).toBe(false);
    expect(watchIgnored("src\\axet-code.ts")).toBe(false);
    expect(watchIgnored("")).toBe(false);
  });
});

describe("FileExplorer canlı yenileme", () => {
  it("yüklenmiş ağaç yenilenirken 'Yükleniyor'a düşmüyor", async () => {
    let fire: ((id: string) => void) | null = null;
    let watchId = "";
    const entries = [{ name: "deneme.txt", path: "C:\\p\\deneme.txt", isDirectory: false }];
    const listDir = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, entries })
      .mockReturnValueOnce(new Promise(() => {}));
    (window as unknown as { api: unknown }).api = {
      getAllowedRoots: vi.fn(() => Promise.resolve([])),
      listDir,
      watchDir: vi.fn((id: string) => {
        watchId = id;
        return Promise.resolve();
      }),
      unwatchDir: vi.fn(() => Promise.resolve()),
      onFsChanged: vi.fn((cb: (id: string) => void) => {
        fire = cb;
        return () => {};
      })
    };
    render(
      <LanguageProvider language="tr">
        <FileExplorer rootDir="C:\\p" rootLabel="p" selectedPath={null} onSelectFile={() => {}} autoRefresh />
      </LanguageProvider>
    );
    expect(await screen.findByText("deneme.txt")).toBeTruthy();

    act(() => fire!(watchId));

    expect(listDir).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Yükleniyor…")).toBeNull();
    expect(screen.getByText("deneme.txt")).toBeTruthy();
  });
});
