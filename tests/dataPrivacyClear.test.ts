// Sohbet ve günlük temizleme mantığı — INCELEME DÜZELTMELERİ (2026-10-17)
// TDD: önce kırmızı.
//
// Kapsam:
// - Bozuk/okunamaz dosya → abort, ok:false, YAN ETKİ YOK (cancelAll vb. çağrılmaz)
// - Geçerli JSON ama nesne değil (null, []) → abort, ok:false, yan etki yok
// - Normal temizleme → projeler korunur, sessions boş, cancelAll + dropPool + clearBindings çağrılır
// - Günlük temizleme → .log ve .log.1 ikisi de silinir
// - Hata kodu yol barındırmaz (err.message değil sabit token)

import { describe, expect, it, vi } from "vitest";
import type { FsAdapter } from "../app-electron/main/dataPrivacy";
import type { ChatSessionsState } from "../app-electron/shared/types";
import {
  clearChatHistoryCore,
  clearAppLogCore
} from "../app-electron/main/dataPrivacy";

// ─────────────────────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────────────────────

function fakeFs(
  files: Record<string, number>,
  dirs: Record<string, string[]> = {}
): FsAdapter {
  function n(p: string): string { return p.replace(/\\/g, "/"); }
  return {
    exists: (p) => n(p) in files || n(p) in dirs,
    stat: (p) => {
      const k = n(p);
      if (k in files) return { size: files[k], isDirectory: () => false, isFile: () => true };
      if (k in dirs) return { size: 0, isDirectory: () => true, isFile: () => false };
      throw new Error(`ENOENT: ${p}`);
    },
    readdir: (p) => dirs[n(p)] ?? []
  };
}

// ─────────────────────────────────────────────────────────────
// clearChatHistoryCore
// ─────────────────────────────────────────────────────────────

describe("clearChatHistoryCore", () => {
  const CHAT_PATH = "/data/chat-sessions.json";

  function makeDeps(overrides: {
    fileExists?: boolean;
    readable?: boolean;
    rawContent?: string;
    rawProjects?: unknown[];
    saveResult?: { ok: boolean; error?: string };
  } = {}) {
    const {
      fileExists = true,
      readable = true,
      rawContent,
      rawProjects = [{ id: "p1", name: "Proje" }],
      saveResult = { ok: true }
    } = overrides;

    const cancelAll = vi.fn();
    const dropPool = vi.fn();
    const clearBindings = vi.fn();
    // Mock tiplendirilmiş: save.mock.calls[0][0] ChatSessionsState olarak okunabilir
    const save = vi.fn((_state: ChatSessionsState) => saveResult);

    function readFile(_p: string): string {
      if (!readable) throw new Error("EPERM: C:\\Users\\tufan\\data\\chat-sessions.json");
      if (rawContent !== undefined) return rawContent;
      return JSON.stringify({ sessions: [{ id: "s1" }, { id: "s2" }], projects: rawProjects });
    }

    const fs = fakeFs(fileExists ? { [CHAT_PATH]: 1000 } : {});

    return { cancelAll, dropPool, clearBindings, save, readFile, fs };
  }

  it("bozuk/okunamaz dosya varsa → ok:false, save ÇAĞRILMAZ, yan etki YOK", () => {
    const { cancelAll, dropPool, clearBindings, save, readFile, fs } = makeDeps({ readable: false });
    const result = clearChatHistoryCore(CHAT_PATH, readFile, save, cancelAll, dropPool, clearBindings, fs);
    expect(result.ok).toBe(false);
    // Hata kodu yol barındırmamalı
    expect(result.error).not.toContain("\\");
    expect(result.error).not.toContain("tufan");
    expect(result.error).not.toContain("Users");
    expect(save).not.toHaveBeenCalled();
    // Yan etki olmadan abort: cancelAll vb. çağrılmamalı
    expect(cancelAll).not.toHaveBeenCalled();
    expect(dropPool).not.toHaveBeenCalled();
    expect(clearBindings).not.toHaveBeenCalled();
  });

  it("geçerli JSON ama nesne değil (null) → ok:false, yan etki YOK", () => {
    const { cancelAll, dropPool, clearBindings, save, readFile, fs } = makeDeps({ rawContent: "null" });
    const result = clearChatHistoryCore(CHAT_PATH, readFile, save, cancelAll, dropPool, clearBindings, fs);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("veri.chat.oku-hatasi");
    expect(save).not.toHaveBeenCalled();
    expect(cancelAll).not.toHaveBeenCalled();
  });

  it("geçerli JSON ama dizi ([]) → ok:false, yan etki YOK", () => {
    const { cancelAll, dropPool, clearBindings, save, readFile, fs } = makeDeps({ rawContent: "[]" });
    const result = clearChatHistoryCore(CHAT_PATH, readFile, save, cancelAll, dropPool, clearBindings, fs);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("veri.chat.oku-hatasi");
    expect(save).not.toHaveBeenCalled();
    expect(cancelAll).not.toHaveBeenCalled();
  });

  it("dosya yoksa → sessions boş, projeler [], save çağrılır", () => {
    const { cancelAll, dropPool, clearBindings, save, readFile, fs } = makeDeps({ fileExists: false });
    const result = clearChatHistoryCore(CHAT_PATH, readFile, save, cancelAll, dropPool, clearBindings, fs);
    expect(result.ok).toBe(true);
    const savedState = save.mock.calls[0][0];
    expect(savedState.sessions).toEqual([]);
    expect(savedState.activeId).toBeNull();
  });

  it("normal dosya → projeler korunur, sessions boş", () => {
    const projs = [{ id: "p1", name: "Proje" }];
    const { cancelAll, dropPool, clearBindings, save, readFile, fs } = makeDeps({ rawProjects: projs });
    const result = clearChatHistoryCore(CHAT_PATH, readFile, save, cancelAll, dropPool, clearBindings, fs);
    expect(result.ok).toBe(true);
    const savedState = save.mock.calls[0][0];
    expect(savedState.sessions).toEqual([]);
    expect(savedState.activeId).toBeNull();
    expect(savedState.projects).toEqual(projs);
  });

  it("cancelAll + dropPool + clearBindings çağrılır (başarılı akış)", () => {
    const { cancelAll, dropPool, clearBindings, save, readFile, fs } = makeDeps();
    clearChatHistoryCore(CHAT_PATH, readFile, save, cancelAll, dropPool, clearBindings, fs);
    expect(cancelAll).toHaveBeenCalledOnce();
    expect(dropPool).toHaveBeenCalledOnce();
    expect(clearBindings).toHaveBeenCalledOnce();
  });

  it("save başarısız → ok:false doner, hata kodu yok içermez", () => {
    const { cancelAll, dropPool, clearBindings, save, readFile, fs } = makeDeps({
      saveResult: { ok: false, error: "disk dolu" }
    });
    const result = clearChatHistoryCore(CHAT_PATH, readFile, save, cancelAll, dropPool, clearBindings, fs);
    expect(result.ok).toBe(false);
    // hata kodu belirsizleştirilmiş olmalı (ham hata gönderilmemeli)
    expect(result.error).toBe("veri.chat.kaydet-hatasi");
  });
});

// ─────────────────────────────────────────────────────────────
// clearAppLogCore
// ─────────────────────────────────────────────────────────────

describe("clearAppLogCore", () => {
  const LOG_PATH = "/logs/ntt-studio.log";

  it("her iki dosya silinir", () => {
    const deleted: string[] = [];
    const result = clearAppLogCore(LOG_PATH, {
      exists: (p) => [LOG_PATH, `${LOG_PATH}.1`].includes(p),
      unlink: (p) => { deleted.push(p); }
    });
    expect(result.ok).toBe(true);
    expect(deleted).toContain(LOG_PATH);
    expect(deleted).toContain(`${LOG_PATH}.1`);
  });

  it("sadece ana dosya varsa yalnız o silinir", () => {
    const deleted: string[] = [];
    const result = clearAppLogCore(LOG_PATH, {
      exists: (p) => p === LOG_PATH,
      unlink: (p) => { deleted.push(p); }
    });
    expect(result.ok).toBe(true);
    expect(deleted).toEqual([LOG_PATH]);
  });

  it("silme hatası → ok:false, hata kodu yol barındırmaz", () => {
    const result = clearAppLogCore(LOG_PATH, {
      exists: () => true,
      unlink: (_p) => { throw new Error(`EPERM: C:\\Users\\tufan\\logs\\ntt-studio.log`); }
    });
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain("tufan");
    expect(result.error).not.toContain("C:\\");
    // sabit hata kodu
    expect(result.error).toBe("veri.gunluk.sil-hatasi");
  });
});
