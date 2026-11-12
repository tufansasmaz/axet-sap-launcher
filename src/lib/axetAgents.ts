// Sohbet ajanı seçicisi (axet151 madde 1). axet-code `--agent` verilmezse
// yapılandırmadaki `options.default_agent`'ı kullanıyor (bu makinede
// `security`); sohbet kullanıcı fark etmeden o ajanla çalışıyordu.
import type { AxetAgentEntry } from "../../app-electron/shared/agentTypes";

/**
 * Genel amaçlı olmayan ajan: izinlerinde `deny` var (salt okur gibi) ya da
 * adı güvenlik/yetki odaklı. Varsayılan böyleyse kullanıcıya ipucu gösteriliyor.
 */
export function isRestrictedAgent(name: string | null, entry?: AxetAgentEntry | null): boolean {
  if (!name) return false;
  if (entry && /\bdeny\b/i.test(entry.permissions)) return true;
  return /secur|auth|yetki|g[uü]venlik/i.test(name);
}

/** Etkin ajan: sohbetin seçimi, yoksa axet-code varsayılanı (bilinmiyorsa null). */
export function effectiveAgent(choice: string | null | undefined, defaultAgent: string | null): string | null {
  return choice || defaultAgent || null;
}

/**
 * Ana ajan olamayan YERLEŞİK ajanlar — yalnız kipi bilinmeyenler için.
 * `agent list --json` kipi (mode) vermiyor (1.5.1, 2026-11-12 yeniden
 * ölçüldü); kullanıcı/proje ajanlarının kipi tanım dosyasından okunuyor
 * (`AxetAgentEntry.mode`), yerleşiklerin dosyası yok. Ölçüm: `run --agent
 * guide|task` → `Agent "…" cannot be used as the main agent (mode "subagent")`.
 * Burada olmayan bir ajan yine de düşerse sohbet mesaj verip seçimi
 * varsayılana döndürüyor (agentRejected).
 */
export const SUBAGENT_ONLY = new Set(["guide", "task"]);

/** Seçicide gösterilecek ajanlar: kipi `subagent` olanlar ve kipi bilinmeyen yerleşik alt ajanlar hariç. */
export function selectableAgents<T extends { name: string; mode?: string }>(agents: T[]): T[] {
  return agents.filter((a) => (a.mode ? a.mode !== "subagent" : !SUBAGENT_ONLY.has(a.name)));
}
