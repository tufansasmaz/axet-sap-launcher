// "Ajan bu sistemde" öbeğinin ana süreç tarafı (2026-10-16). Bağlı sistem için
// 8787'ye anahtarla sorup araç listesinden satırları kuruyor. Sunucu yoksa ya
// da anahtarımızı tanımıyorsa satır yok: ✓ yalnız sunucunun söylediğinden.

import { capabilitiesFromTools, type AdtCapabilities } from "../shared/adtCapabilities";
import type { SkillProfile, SystemTier } from "../shared/types";
import { probeAdtTools } from "./adtReadonlyServerManager";

export async function readAdtCapabilities(
  port: number,
  sap: { uuid: string; tier: SystemTier | null },
  role: SkillProfile | null
): Promise<AdtCapabilities> {
  const health = await probeAdtTools(port);
  if (health.unauthorized) return { systemUuid: sap.uuid, server: "unauthorized", rows: [] };
  if (!health.alive) return { systemUuid: sap.uuid, server: "down", rows: [] };
  return { systemUuid: sap.uuid, server: "running", rows: capabilitiesFromTools(health.tools, { role, tier: sap.tier }) };
}
