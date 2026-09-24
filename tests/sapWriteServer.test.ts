// Onay ucu: launcher'ın içindeki yerel HTTP sunucusu. Python katmanı (adt_gated_server.py)
// her yazmadan önce buraya sorar. Burada ölçülenler: token oturumu seçiyor, kapanan
// oturumun token'ı ölü, günlük kaynak kodu/farkı/token'ı İÇERMİYOR.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WriteFact } from "../app-electron/shared/sapWriteTypes";
import {
  closeWriteSession,
  listWriteState,
  openWriteSession,
  respondToApproval,
  setWriteMode,
  setWriteNotifier,
  stopApprovalServer,
  sweepNow,
} from "../app-electron/main/sapWrite/server";
import { LOG_FILE } from "../app-electron/main/sapWrite/log";

const H = (c: string) => c.repeat(64);
const ID = { sid: "DS4", client: "100", user: "DEV1" };

function fact(over: Partial<WriteFact> = {}): WriteFact {
  return {
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false, kaynak_sha256: [H("1")], fark: "+GIZLI_KAYNAK_SATIRI" }],
    transport: "DS4K900001",
    transport_bilgi: { aciklama: "Test", sahip: "DEV1", durum: "D" },
    arg_hash: H("a"),
    ...over,
  };
}

let dir: string;

async function call(url: string, token: string | null, method: string, p: string, body?: unknown) {
  const res = await fetch(url + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function logLines(): Record<string, unknown>[] {
  return readFileSync(path.join(dir, LOG_FILE), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sapwrite-"));
});

afterEach(async () => {
  setWriteNotifier(null);
  await stopApprovalServer();
  rmSync(dir, { recursive: true, force: true });
});

describe("onay ucu", () => {
  it("health token ister; yanlış ya da eksik token 401", async () => {
    const s = await openWriteSession(dir, ID);
    expect((await call(s.url, s.token, "GET", "/health")).status).toBe(200);
    expect((await call(s.url, null, "GET", "/health")).status).toBe(401);
    expect((await call(s.url, "x".repeat(64), "GET", "/health")).status).toBe(401);
    expect(s.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it("mod seçilmeden mod_secilmedi; seçildikten sonra bekliyor ve bildirim", async () => {
    const s = await openWriteSession(dir, ID);
    const notify = vi.fn();
    setWriteNotifier(notify);
    expect((await call(s.url, s.token, "POST", "/approvals", fact())).json.karar).toBe("mod_secilmedi");
    expect(setWriteMode(s.sessionId, "dogrudan")).toBe(true);
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    expect(r.status).toBe(200);
    expect(r.json.karar).toBe("bekliyor");
    expect(r.json.mesaj).toContain("AYNI çağrıyı AYNI argümanlarla");
    expect(notify).toHaveBeenCalled();
    const st = listWriteState();
    expect(st.sessions).toEqual([{ id: s.sessionId, sid: "DS4", client: "100", user: "DEV1", mode: "dogrudan" }]);
    expect(st.pending).toHaveLength(1);
    expect(st.pending[0]).toMatchObject({ id: r.json.id, canSession: true, sid: "DS4" });
  });

  it("pencereden onay → aynı çağrı izinli; sonuç kaydı 200, bilinmeyen id 404", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    expect(respondToApproval(r.json.id, "bu_seferlik")).toEqual({ ok: true });
    const again = await call(s.url, s.token, "POST", "/approvals", fact());
    expect(again.json).toMatchObject({ karar: "izinli", id: r.json.id });
    expect(listWriteState().pending).toHaveLength(0);
    const ok = await call(s.url, s.token, "POST", "/results", { id: r.json.id, sap_sonucu: { success: true, corrnr: "DS4K900001" } });
    expect(ok.status).toBe(200);
    expect((await call(s.url, s.token, "POST", "/results", { id: "yok", sap_sonucu: {} })).status).toBe(404);
  });

  it("bozuk bilgi 400, büyük gövde 413, bilinmeyen yol 404", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const bad = await call(s.url, s.token, "POST", "/approvals", { ...fact(), arg_hash: "x" });
    expect(bad).toEqual({ status: 400, json: { hata: "gecersiz_bilgi" } });
    expect((await call(s.url, s.token, "POST", "/approvals", "{bozuk")).status).toBe(400);
    const big = await call(s.url, s.token, "POST", "/approvals", JSON.stringify({ x: "a".repeat(4 * 1024 * 1024 + 10) }));
    expect(big.status).toBe(413);
    expect((await call(s.url, s.token, "GET", "/yok")).status).toBe(404);
  });

  it("kapanan oturumun token'ı ölü; yeni oturum eski onayları görmüyor", async () => {
    const a = await openWriteSession(dir, ID);
    setWriteMode(a.sessionId, "dogrudan");
    await call(a.url, a.token, "POST", "/approvals", fact());
    closeWriteSession(dir);
    expect((await call(a.url, a.token, "GET", "/health")).status).toBe(401);
    expect(listWriteState()).toEqual({ sessions: [], pending: [] });
    const b = await openWriteSession(dir, ID);
    expect(b.token).not.toBe(a.token);
    expect((await call(b.url, b.token, "POST", "/approvals", fact())).json.karar).toBe("mod_secilmedi");
  });

  it("aynı proje için ikinci açılış öncekini kapatıyor", async () => {
    const a = await openWriteSession(dir, ID);
    const b = await openWriteSession(dir, ID);
    expect((await call(a.url, a.token, "GET", "/health")).status).toBe(401);
    expect((await call(b.url, b.token, "GET", "/health")).status).toBe(200);
    expect(listWriteState().sessions).toHaveLength(1);
  });

  it("iki projenin token'ı birbirinin oturumuna girmiyor", async () => {
    const other = mkdtempSync(path.join(tmpdir(), "sapwrite-b-"));
    try {
      const a = await openWriteSession(dir, ID);
      const b = await openWriteSession(other, { ...ID, sid: "DS5" });
      setWriteMode(a.sessionId, "dogrudan");
      const r = await call(b.url, b.token, "POST", "/approvals", fact());
      expect(r.json.karar).toBe("mod_secilmedi");
      expect(a.url).toBe(b.url);
    } finally {
      closeWriteSession(other);
      rmSync(other, { recursive: true, force: true });
    }
  });

  it("süpürme: cevapsız istek 10 dk sonra sure_doldu olur ve günlüğe yazılır", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    await call(s.url, s.token, "POST", "/approvals", fact());
    const notify = vi.fn();
    setWriteNotifier(notify);
    sweepNow(Date.now() + 10 * 60_000 + 1);
    expect(listWriteState().pending).toHaveLength(0);
    expect(notify).toHaveBeenCalled();
    expect(logLines().some((l) => l.tur === "karar" && l.karar === "sure_doldu")).toBe(true);
  });

  it("kalite reddi olayı günlüğe yazılır; başka olay 400", async () => {
    const s = await openWriteSession(dir, ID);
    const ok = await call(s.url, s.token, "POST", "/events", {
      tur: "kalite_reddi",
      arac: "adt_push",
      nesneler: [{ ad: "ZCL_A", tip: "CLAS" }],
      sebep: "kritik_bulgu",
    });
    expect(ok.status).toBe(200);
    expect((await call(s.url, s.token, "POST", "/events", { tur: "baska" })).status).toBe(400);
    expect(logLines().find((l) => l.tur === "kalite_reddi")).toMatchObject({ arac: "adt_push", sebep: "kritik_bulgu" });
  });

  it("günlük: kimlik ve karar var; kaynak farkı ve token YOK", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    respondToApproval(r.json.id, "bu_seferlik");
    await call(s.url, s.token, "POST", "/approvals", fact());
    await call(s.url, s.token, "POST", "/results", { id: r.json.id, sap_sonucu: { success: false, error: "e".repeat(2000) } });
    const raw = readFileSync(path.join(dir, LOG_FILE), "utf8");
    expect(raw).not.toContain("GIZLI_KAYNAK_SATIRI");
    expect(raw).not.toContain(s.token);
    const lines = logLines();
    expect(lines.map((l) => l.tur)).toEqual(["mod", "karar", "cevap", "karar", "sonuc"]);
    expect(lines[1]).toMatchObject({ sid: "DS4", client: "100", kullanici: "DEV1", mod: "dogrudan", karar: "bekliyor" });
    expect(lines[2]).toMatchObject({ secim: "bu_seferlik" });
    expect(String((lines[4].sap_sonucu as Record<string, unknown>).error).length).toBeLessThanOrEqual(500);
    for (const l of lines) expect(typeof l.zaman).toBe("string");
  });

  it("günlük: /results'taki atc de kırpılıyor (en çok 10 nesne, bilinen alanlar, 500 karakter)", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    respondToApproval(r.json.id, "bu_seferlik");
    await call(s.url, s.token, "POST", "/approvals", fact());
    const atc = Array.from({ length: 30 }, (_, i) => ({
      nesne: `ZCL_${i}`,
      tip: "class",
      toplam: 2,
      oncelik: { "1": 1, "2": 1 },
      hata: "h".repeat(2000),
      kaynak: "GIZLI_KAYNAK_SATIRI",
    }));
    await call(s.url, s.token, "POST", "/results", { id: r.json.id, sap_sonucu: { success: true }, atc });
    const raw = readFileSync(path.join(dir, LOG_FILE), "utf8");
    expect(raw).not.toContain("GIZLI_KAYNAK_SATIRI");
    const sonuc = logLines().find((l) => l.tur === "sonuc") as Record<string, unknown>;
    const logged = sonuc.atc as Record<string, unknown>[];
    expect(logged).toHaveLength(10);
    expect(logged[0]).toEqual({ nesne: "ZCL_0", tip: "class", toplam: 2, oncelik: { "1": 1, "2": 1 }, hata: "h".repeat(500) });
    await call(s.url, s.token, "POST", "/results", { id: r.json.id, sap_sonucu: {}, atc: "x".repeat(5000) });
    const son = logLines().filter((l) => l.tur === "sonuc").pop() as Record<string, unknown>;
    expect(son.atc).toBeUndefined();
  });

  it("aynı istek tekrar geldikçe günlüğe yeni 'bekliyor' satırı yazılmıyor", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    await call(s.url, s.token, "POST", "/approvals", fact());
    await call(s.url, s.token, "POST", "/approvals", fact());
    await call(s.url, s.token, "POST", "/approvals", fact());
    expect(logLines().filter((l) => l.tur === "karar")).toHaveLength(1);
  });

  it("günlük: arg_hash ve kaynak_sha256 var; fark ve kaynak YOK", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const f = fact();
    await call(s.url, s.token, "POST", "/approvals", f);
    const raw = readFileSync(path.join(dir, LOG_FILE), "utf8");
    expect(raw).not.toContain("GIZLI_KAYNAK_SATIRI");
    const lines = logLines();
    const karar = lines.find((l) => l.tur === "karar");
    expect(karar).toBeDefined();
    expect(karar?.arg_hash).toBe(f.arg_hash);
    const nesneler = karar?.nesneler as Array<Record<string, unknown>> | undefined;
    expect(nesneler?.[0]?.kaynak_sha256).toBeDefined();
    expect(nesneler?.[0]?.kaynak_sha256).toEqual(f.nesneler[0].kaynak_sha256);
  });

  it("sure_doldu handler'da yakalanırsa günlüğe yazılır ve bildirim gönderilir", async () => {
    const s = await openWriteSession(dir, ID);
    setWriteMode(s.sessionId, "dogrudan");
    const r = await call(s.url, s.token, "POST", "/approvals", fact());
    const id = r.json.id;

    // Sweep aralığını atla, ama handler'ı tetikle
    const now = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now + 10 * 60_000 + 1);
    try {
      const notify = vi.fn();
      setWriteNotifier(notify);
      await call(s.url, s.token, "POST", "/approvals", fact());
      expect(notify).toHaveBeenCalled();
      const lines = logLines();
      const expired = lines.find((l) => l.tur === "karar" && l.karar === "sure_doldu" && l.id === id);
      expect(expired).toBeDefined();
    } finally {
      nowSpy.mockRestore();
    }
  });
});
