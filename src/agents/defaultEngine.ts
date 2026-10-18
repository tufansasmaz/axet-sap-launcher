// Varsayılan ajan motoru (Tur 3, Araçlar görünümü). Yalnız arayüz tercihi:
// "+ Ajan" penceresi bu motorla açılıyor. localStorage'da; gizli bir şey değil.
// Okunamazsa / bilinmeyen değerse yok sayılır (kurulu ilk motor kalır).
import { isAgentEngineId, type AgentEngineId } from "../../app-electron/shared/agentTypes";

const KEY = "ntt.agents.defaultEngine";
const listeners = new Set<() => void>();

export function readDefaultEngine(): AgentEngineId | null {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    return isAgentEngineId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeDefaultEngine(id: AgentEngineId | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // tercih kaydedilemedi: bu oturumda yine bildiriliyor
  }
  for (const fn of listeners) fn();
}

export function onDefaultEngineChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Pencerenin açılış motoru: tercih listede varsa o, yoksa sıranın ilki. */
export function initialEngine(order: readonly AgentEngineId[], preferred: AgentEngineId | null): AgentEngineId {
  return preferred && order.includes(preferred) ? preferred : order[0];
}
