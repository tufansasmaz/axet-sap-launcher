// Bağlantı sonucunu 8787'nin (ajanın SAP'ye eriştiği ADT sunucusu) durumuna
// bağlar. Kararlılık 3 (2026-11-12): sunucu açılmasa da bağlantı "doğrulandı"
// dönüyordu; rozet yeşil, sohbetin ilk balonu "bağlıyım" diyordu, ajan ise
// hiçbir SAP aracına ulaşamıyordu. SAP'ye ulaşıldı (`verified` olduğu gibi
// kalıyor) ama ajan ulaşamıyor: ayrı bir hâl, uyarı tonunda.
import type { ConnectResult } from "../shared/types";

export interface AgentServerOutcome {
  started: boolean;
  /** Başlatılamadıysa sebebin kullanıcıya gösterilecek metni. */
  failure?: string;
}

export function withAgentAccess<T extends Pick<ConnectResult, "ok" | "message"> & { agentAccess?: ConnectResult["agentAccess"] }>(
  result: T,
  outcome: AgentServerOutcome | null,
  language: "tr" | "en"
): T {
  if (!result.ok || !outcome) return result;
  if (outcome.started) return { ...result, agentAccess: { ok: true } };
  const reason = (outcome.failure ?? "").trim() || (language === "en" ? "unknown reason" : "sebep bilinmiyor");
  const message =
    language === "en"
      ? `Connected to SAP, but the agent cannot reach SAP: ${reason}`
      : `SAP'ye bağlanıldı, ama ajan SAP'ye erişemiyor: ${reason}`;
  return { ...result, message, agentAccess: { ok: false, reason } };
}
