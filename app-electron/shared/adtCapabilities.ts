// "Ajan bu sistemde" öbeği (2026-10-16). Satırlar 8787'deki ADT sunucusunun
// `/health`'te saydığı araç adlarından kuruluyor: bir etiketten ya da rolden
// tahmin edilseydi, sunucu başka bir yüzeyle açıldığında ekran yalan söylerdi
// (öncelik sırasında yanlış bilgi cilanın çok üstünde). Rol ve kademe yalnız
// "neden yok" sorusunun cevabında kullanılıyor.

import type { SkillProfile, SystemTier } from "./types";

export type CapabilityId = "read" | "tables" | "dumps" | "checks" | "write" | "run";
/** `approval`: var ama her kullanım NTT Studio'da onaylanıyor. */
export type CapabilityState = "yes" | "approval" | "no";
/** Yalnız `no` için; bilinmiyorsa null (sebep uydurulmuyor). */
export type CapabilityReason = "role" | "tier" | "notInEngine" | null;

export interface CapabilityRow {
  id: CapabilityId;
  state: CapabilityState;
  reason: CapabilityReason;
}

/** `server`: running = araç listesi okundu; down = yanıt yok; unauthorized = anahtarımızı tanımayan bir süreç. */
export interface AdtCapabilities {
  systemUuid: string;
  server: "running" | "down" | "unauthorized";
  rows: CapabilityRow[];
}

const has = (tools: readonly string[], name: string): CapabilityState => (tools.includes(name) ? "yes" : "no");

function row(id: CapabilityId, state: CapabilityState, reason: CapabilityReason = null): CapabilityRow {
  return { id, state, reason: state === "no" ? reason : null };
}

export function capabilitiesFromTools(
  tools: readonly string[],
  ctx: { role: SkillProfile | null; tier: SystemTier | null }
): CapabilityRow[] {
  const writable = tools.includes("adt_push");
  // Yazma yoksa neden: rol önce (DEV'de de geçerli), sonra kademe.
  const writeReason: CapabilityReason =
    ctx.role === "module-consultant" ? "role" : ctx.tier && ctx.tier !== "DEV" ? "tier" : null;
  return [
    row("read", has(tools, "adt_get_source")),
    row("tables", has(tools, "adt_sql")),
    row("dumps", has(tools, "adt_dumps")),
    row("checks", has(tools, "adt_syntax_check")),
    row("write", writable ? (tools.includes("axet_teslim") ? "approval" : "yes") : "no", writeReason),
    // F8 / debug için motorda hiçbir araç yok (ne salt okunur ne yazan yüzeyde).
    row("run", "no", "notInEngine")
  ];
}
