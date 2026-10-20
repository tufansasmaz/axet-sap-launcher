// Onay ucunda uzun yoklama (madde 3): gated sunucu `X-Axet-Bekle` ile kararı
// aynı araç çağrısı içinde bekliyor. Ölçülenler: onay gelince aynı istek izinli
// döner ve onayı TÜKETİR (tekrar gönderim yeni pencere açar, ikinci yazma yok);
// süre dolarsa bekliyor döner ve eski yol (tekrar gönder) onayı bir kez kullanır;
// çağıran koparsa hiçbir şey tüketilmez.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WriteFact } from "../app-electron/shared/sapWriteTypes";
import {
  MAX_WAIT_MS,
  openWriteSession,
  parseWaitMs,
  respondToApproval,
  setWriteMode,
  stopApprovalServer,
} from "../app-electron/main/sapWrite/server";
import { onApprovalEvent, type ApprovalEvent } from "../app-electron/main/sapWrite/approvalEvents";

const H = (c: string) => c.repeat(64);
const fact = (): WriteFact => ({
  arac: "adt_push",
  sinif: "TRANSPORT_ONAYLI",
  nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false }],
  transport: "DS4K900001",
  transport_bilgi: null,
  arg_hash: H("a"),
});

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "sapwrite-lp-"));
});
afterEach(async () => {
  await stopApprovalServer();
  rmSync(dir, { recursive: true, force: true });
});

async function session() {
  const s = await openWriteSession(dir, { sid: "DS4", client: "100", user: "DEV1" });
  setWriteMode(s.sessionId, "dogrudan");
  const post = (wait?: number, signal?: AbortSignal) =>
    fetch(`${s.url}/approvals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.token}`,
        ...(wait !== undefined ? { "X-Axet-Bekle": String(wait) } : {}),
      },
      body: JSON.stringify(fact()),
      signal,
    }).then(async (r) => ({ status: r.status, json: (await r.json()) as { karar: string; id: string } }));
  return { s, post };
}

/** İlk "soruldu" olayını bekle: istek sunucuya ulaştı ve kayıt açıldı. */
function nextAsked(): Promise<string> {
  return new Promise((resolve) => {
    const off = onApprovalEvent((e) => {
      if (e.tur === "soruldu") {
        off();
        resolve(e.id);
      }
    });
  });
}

describe("uzun yoklama", () => {
  it("başlık: saniye → ms, en çok 10 dk; bozuk/yoksa 0", () => {
    expect(parseWaitMs("45")).toBe(45_000);
    expect(parseWaitMs(["3"])).toBe(3_000);
    expect(parseWaitMs("9999")).toBe(MAX_WAIT_MS);
    expect(parseWaitMs("-1")).toBe(0);
    expect(parseWaitMs("1e3")).toBe(0);
    expect(parseWaitMs(undefined)).toBe(0);
  });

  it("onay aynı çağrıda gelir: izinli döner, onay tüketilir; tekrar gönderim yeni pencere", async () => {
    const { post } = await session();
    const got: ApprovalEvent[] = [];
    const off = onApprovalEvent((e) => got.push(e));
    try {
      const asked = nextAsked();
      const first = post(30);
      const id = await asked;
      expect(respondToApproval(id, "bu_seferlik").ok).toBe(true);
      const r = await first;
      expect(r.json).toMatchObject({ karar: "izinli", id });
      expect(got.map((e) => e.tur)).toEqual(["soruldu", "sonuclandi", "kullanildi"]);
      const again = await post();
      expect(again.json.karar).toBe("bekliyor");
      expect(again.json.id).not.toBe(id);
    } finally {
      off();
    }
  });

  it("ret aynı çağrıda: reddedildi döner", async () => {
    const { post } = await session();
    const asked = nextAsked();
    const first = post(30);
    respondToApproval(await asked, "reddet");
    expect((await first).json.karar).toBe("reddedildi");
  });

  it("süre dolar: bekliyor döner; sonra verilen onayı tekrar gönderim BİR kez kullanır", async () => {
    const { post } = await session();
    const r = await post(1);
    expect(r.json.karar).toBe("bekliyor");
    respondToApproval(r.json.id, "bu_seferlik");
    expect((await post()).json).toMatchObject({ karar: "izinli", id: r.json.id });
    const third = await post();
    expect(third.json.karar).toBe("bekliyor");
    expect(third.json.id).not.toBe(r.json.id);
  });

  it("çağıran koparsa onay tüketilmez; ajanın tekrar gönderdiği çağrı kullanır", async () => {
    const { post } = await session();
    const ac = new AbortController();
    const asked = nextAsked();
    const first = post(30, ac.signal).catch(() => null);
    const id = await asked;
    ac.abort();
    await first;
    await new Promise((r) => setTimeout(r, 50));
    respondToApproval(id, "bu_seferlik");
    await new Promise((r) => setTimeout(r, 50));
    expect((await post()).json).toMatchObject({ karar: "izinli", id });
  });
});
