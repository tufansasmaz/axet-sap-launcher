// SAP yazma kararlarının günlüğü: proje klasöründe `sap-yazma-gunlugu.jsonl`,
// satır başına bir JSON. Kim, hangi sistemde, hangi nesneye, hangi transport'la,
// neye karar verildi, SAP ne dedi.
//
// Günlüğe GİRMEYENLER: kaynak kodun kendisi, fark, şifre, token. Proje klasörü
// OneDrive'a eşitlenebiliyor; günlük bir kaynak kopyasına dönüşmemeli.

import { appendFileSync } from "node:fs";
import path from "node:path";
import type { WriteFact } from "../../shared/sapWriteTypes";

export const LOG_FILE = "sap-yazma-gunlugu.jsonl";

const MAX_TEXT = 500;

export function factLogFields(fact: WriteFact): Record<string, unknown> {
  return {
    arac: fact.arac,
    sinif: fact.sinif,
    transport: fact.transport,
    arg_hash: fact.arg_hash,
    nesneler: fact.nesneler.map((o) => ({
      ad: o.ad,
      tip: o.tip,
      paket: o.paket,
      yeni: o.yeni,
      ...(o.kalite ? { kalite: o.kalite } : {}),
      ...(o.kaynak_sha256 ? { kaynak_sha256: o.kaynak_sha256 } : {}),
    })),
    ...(fact.paket ? { paket: fact.paket } : {}),
    ...(fact.teslim ? { teslim: fact.teslim } : {}),
    ...(fact.abapgit ? { abapgit: fact.abapgit } : {}),
    ...(fact.ust_onay ? { ust_onay: fact.ust_onay } : {}),
    ...(fact.islem ? { islem: fact.islem } : {}),
    ...(fact.secenekler ? { secenekler: fact.secenekler } : {}),
  };
}

/** SAP sonucundan günlüğe yalnızca özet alanlar; uzun metinler kırpılır. */
export function resultLogFields(x: unknown): Record<string, unknown> {
  if (typeof x !== "object" || x === null) return {};
  const src = x as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ["ok", "success", "activated", "corrnr", "error", "error_type", "message"]) {
    const v = src[key];
    if (v === undefined) continue;
    out[key] = typeof v === "string" ? v.slice(0, MAX_TEXT) : typeof v === "boolean" || typeof v === "number" ? v : String(v).slice(0, MAX_TEXT);
  }
  return out;
}

const MAX_ATC = 10;

/** ATC özeti: en çok 10 nesne, yalnızca bilinen alanlar; metinler kırpılır, sayılar sayı kalır. */
export function atcLogFields(x: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(x)) return undefined;
  const text = (v: unknown) => String(v).slice(0, MAX_TEXT);
  return x
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null && !Array.isArray(e))
    .slice(0, MAX_ATC)
    .map((e) => {
      const out: Record<string, unknown> = {};
      if (e.nesne !== undefined) out.nesne = text(e.nesne);
      if (e.tip !== undefined) out.tip = text(e.tip);
      if (typeof e.toplam === "number" && Number.isFinite(e.toplam)) out.toplam = e.toplam;
      if (typeof e.oncelik === "object" && e.oncelik !== null && !Array.isArray(e.oncelik)) {
        const oncelik: Record<string, number> = {};
        for (const [k, v] of Object.entries(e.oncelik).slice(0, MAX_ATC)) {
          if (typeof v === "number" && Number.isFinite(v)) oncelik[k.slice(0, 20)] = v;
        }
        out.oncelik = oncelik;
      }
      if (e.hata !== undefined) out.hata = text(e.hata);
      return out;
    });
}

export function appendDecisionLog(projectDir: string, entry: Record<string, unknown>, now: number = Date.now()): void {
  const line = JSON.stringify({ zaman: new Date(now).toISOString(), ...entry });
  try {
    appendFileSync(path.join(projectDir, LOG_FILE), line + "\n", "utf8");
  } catch (err) {
    // Günlük yazılamadı (klasör silinmiş, OneDrive kilidi): karar yine geçerli.
    // Yazmayı günlük yüzünden durdurmak, kullanıcının verdiği onayı yok saymak olurdu.
    console.warn(`[sap-yazma] günlük yazılamadı: ${String(err)}`);
  }
}
