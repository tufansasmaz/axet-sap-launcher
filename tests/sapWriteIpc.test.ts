// Onay penceresinin main tarafı: renderer'ın gönderdiği mod/cevap biçimce
// doğrulanıyor, her değişiklik pencereye yayılıyor, yeni istek gelince arka
// plandaki pencere yanıp sönüyor ama öne fırlatılmıyor.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SapWriteState, WriteFact } from "../app-electron/shared/sapWriteTypes";
import { registerSapWriteIpc, type WindowLike } from "../app-electron/main/sapWrite/ipc";
import { listWriteState, openWriteSession, setWriteNotifier, stopApprovalServer } from "../app-electron/main/sapWrite/server";

const H = (c: string) => c.repeat(64);
const ID = { sid: "DS4", client: "100", user: "DEV1" };

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")] }],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Test", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

async function ask(url: string, token: string, body: unknown): Promise<{ id: string; karar: string }> {
  const res = await fetch(url + "/approvals", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { id: string; karar: string };
}

type Listener = (event: unknown, ...args: unknown[]) => unknown;

function fakeIpc() {
  const handlers = new Map<string, Listener>();
  return {
    ipc: { handle: (channel: string, fn: Listener) => void handlers.set(channel, fn) },
    invoke: (channel: string, ...args: unknown[]) => {
      const fn = handlers.get(channel);
      if (!fn) throw new Error(`kayıtsız kanal: ${channel}`);
      return fn({}, ...args);
    },
  };
}

function fakeWindow(focused: boolean) {
  const sent: SapWriteState[] = [];
  const win: WindowLike & { flashFrame: ReturnType<typeof vi.fn> } = {
    isDestroyed: () => false,
    isFocused: () => focused,
    flashFrame: vi.fn(),
    webContents: {
      send: (channel: string, state: unknown) => {
        if (channel === "sap-write:changed") sent.push(state as SapWriteState);
      },
    },
  };
  return { win, sent };
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sapwrite-ipc-"));
});

afterEach(async () => {
  setWriteNotifier(null);
  await stopApprovalServer();
  rmSync(dir, { recursive: true, force: true });
});

describe("sap-write IPC", () => {
  it("durum okunuyor, mod seçiliyor, geçersiz mod reddediliyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    expect((invoke("sap-write:state") as SapWriteState).sessions[0]).toMatchObject({ id: s.sessionId, mode: null });
    expect(invoke("sap-write:set-mode", s.sessionId, "hepsi")).toBe(false);
    expect(invoke("sap-write:set-mode", 42, "dogrudan")).toBe(false);
    expect(listWriteState().sessions[0].mode).toBeNull();
    expect(invoke("sap-write:set-mode", s.sessionId, "dogrudan")).toBe(true);
    // Mod oturum başına bir kez: değiştirmek yeniden bağlanmak demek.
    expect(invoke("sap-write:set-mode", s.sessionId, "yerel")).toBe(false);
    expect(listWriteState().sessions[0].mode).toBe("dogrudan");
  });

  it("cevap: geçersiz seçim reddediliyor, geçerli seçim isteği kapatıyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    const r = await ask(s.url, s.token, fact());
    expect(r.karar).toBe("bekliyor");
    expect(invoke("sap-write:respond", r.id, "hepsine_izin")).toEqual({ ok: false, error: "gecersiz_istek" });
    expect(invoke("sap-write:respond", null, "reddet")).toEqual({ ok: false, error: "gecersiz_istek" });
    expect(listWriteState().pending).toHaveLength(1);
    expect(invoke("sap-write:respond", r.id, "reddet")).toEqual({ ok: true });
    expect(listWriteState().pending).toHaveLength(0);
  });

  it("HER_SEFER isteğine oturum izni pencereden de verilemiyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    const r = await ask(s.url, s.token, fact({ arac: "adt_delete_object", sinif: "HER_SEFER" }));
    expect(invoke("sap-write:respond", r.id, "oturum")).toMatchObject({ ok: false, error: "oturum_izni_verilemez" });
    expect(listWriteState().pending).toHaveLength(1);
  });

  it("her değişiklik pencereye gidiyor; yeni istek arka plandaki pencereyi yanıp söndürüyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win, sent } = fakeWindow(false);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    expect(sent.at(-1)?.sessions).toHaveLength(1);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    expect(win.flashFrame).not.toHaveBeenCalled();
    const r = await ask(s.url, s.token, fact());
    expect(sent.at(-1)?.pending.map((p) => p.id)).toEqual([r.id]);
    expect(win.flashFrame).toHaveBeenCalledTimes(1);
    expect(win.flashFrame).toHaveBeenCalledWith(true);
    // Aynı istek için ikinci bildirim (ör. cevap) yeniden yanıp söndürmüyor.
    invoke("sap-write:respond", r.id, "reddet");
    expect(sent.at(-1)?.pending).toEqual([]);
    expect(win.flashFrame).toHaveBeenCalledTimes(1);
  });

  it("öndeki pencere yanıp sönmüyor; pencere yoksa bildirim sessizce düşüyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win } = fakeWindow(true);
    let current: WindowLike | null = win;
    registerSapWriteIpc(ipc, () => current);
    const s = await openWriteSession(dir, ID);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    await ask(s.url, s.token, fact());
    expect(win.flashFrame).not.toHaveBeenCalled();
    current = null;
    const r = await ask(s.url, s.token, fact({ arg_hash: H("b") }));
    expect(r.karar).toBe("bekliyor");
  });

  it("sap-write:changed taşıyıcı payload'ı token içermiyor", async () => {
    const { ipc, invoke } = fakeIpc();
    const { win, sent } = fakeWindow(false);
    registerSapWriteIpc(ipc, () => win);
    const s = await openWriteSession(dir, ID);
    invoke("sap-write:set-mode", s.sessionId, "dogrudan");
    await ask(s.url, s.token, fact());
    expect(JSON.stringify(sent.at(-1))).not.toContain("token");
  });
});
