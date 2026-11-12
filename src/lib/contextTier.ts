import type { ActiveSapContext, SystemTier } from "../../app-electron/shared/types";

// Yol karşılaştırması Windows'a göre: ters/düz eğik çizgi ve büyük/küçük harf
// fark etmiyor, sondaki ayraç yok sayılıyor.
const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

/**
 * Sohbetin sekmesinde gösterilecek seviye rozeti.
 *
 * Rozet YALNIZCA sohbetin klasörü şu an bağlı sistemin klasörüyse çıkıyor.
 * B sistemine bağlıyken A'nın eski sohbeti açılırsa rozet hiç çıkmıyor —
 * yanlış bir "DEV" rozeti, olmayan bir rozetten çok daha tehlikeli.
 */
export function contextTierFor(
  cwd: string | null | undefined,
  activeSap: ActiveSapContext | ActiveSapContext[] | null
): SystemTier | null {
  // Çoklu sistem (2026-11-12): sohbet hangi bağlı sistemin klasöründeyse onun
  // kademesi; odaktaki olması gerekmiyor.
  return contextSystemFor(cwd, activeSap)?.tier ?? null;
}

/** Sohbetin klasörü hangi bağlı sistemin klasörü; yoksa null. */
export function contextSystemFor(
  cwd: string | null | undefined,
  systems: ActiveSapContext | ActiveSapContext[] | null
): ActiveSapContext | null {
  if (!cwd || !systems) return null;
  const list = Array.isArray(systems) ? systems : [systems];
  return list.find((s) => s.projectDir && norm(cwd) === norm(s.projectDir)) ?? null;
}
