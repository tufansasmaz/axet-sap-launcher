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
  activeSap: ActiveSapContext | null
): SystemTier | null {
  if (!cwd || !activeSap?.projectDir || !activeSap.tier) return null;
  return norm(cwd) === norm(activeSap.projectDir) ? activeSap.tier : null;
}
