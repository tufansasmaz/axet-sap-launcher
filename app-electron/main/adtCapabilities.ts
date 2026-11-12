// "Ajan bu sistemde" öbeğinin ana süreç tarafı (2026-10-16). Bağlı sistem için
// 8787'ye anahtarla sorup araç listesinden satırları kuruyor. Sunucu yoksa ya
// da anahtarımızı tanımıyorsa satır yok: ✓ yalnız sunucunun söylediğinden.

import { capabilitiesFromTools, type AdtCapabilities } from "../shared/adtCapabilities";
import type { SkillProfile, SystemTier } from "../shared/types";
import { lastAdtServerFailure, probeAdtTools } from "./adtReadonlyServerManager";

export async function readAdtCapabilities(
  port: number,
  sap: { uuid: string; tier: SystemTier | null },
  role: SkillProfile | null,
  token?: string,
  projectDir?: string
): Promise<AdtCapabilities> {
  const health = await probeAdtTools(port, 1500, token);
  // Açılamadıysa NEDENİ de (R5, 2026-11-12): "çalışmıyor; yeniden bağlan"
  // tek başına kullanıcıyı aynı duvara geri gönderiyordu.
  const failure = lastAdtServerFailure(projectDir)?.message;
  const why = failure ? { failure: failure.slice(0, 900) } : {};
  if (health.unauthorized) return { systemUuid: sap.uuid, server: "unauthorized", rows: [], ...why };
  if (!health.alive) return { systemUuid: sap.uuid, server: "down", rows: [], ...why };
  return { systemUuid: sap.uuid, server: "running", rows: capabilitiesFromTools(health.tools, { role, tier: sap.tier }) };
}
