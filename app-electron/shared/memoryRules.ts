// Tur 13: "Kimlik ve kurallar" (demodaki Identity & Rules). Kullanıcının
// yazdığı ekip kuralları ve isteğe bağlı ajan başına kurallar. Ajan
// açılışında (bellek bildirimi) ve ilk Akış mesajında (lider rehberiyle
// birlikte) tek satır, sınırlı özet olarak gidiyor. Saf; disk ana süreçte.

export interface MemoryRules {
  team: string;
  /** Bölme kimliği → o ajana özel kurallar. */
  agents: Record<string, string>;
}

export const RULES_TEXT_MAX = 4_000;
export const RULES_AGENTS_MAX = 60;
export const RULES_DIGEST_MAX = 600;
export const EMPTY_RULES: MemoryRules = { team: "", agents: {} };

const PANE_REF = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/;
type Scrub = (text: string) => string;
const identity: Scrub = (t) => t;

const text = (raw: unknown, scrub: Scrub): string =>
  typeof raw === "string" ? scrub(raw.replace(/\r\n?/g, "\n").trim()).slice(0, RULES_TEXT_MAX) : "";

/** Kayıttan/IPC'den gelen kurallar; bozuk alanlar atılıyor, hiç fırlatmıyor. */
export function sanitizeRules(raw: unknown, scrub: Scrub = identity): MemoryRules {
  if (!raw || typeof raw !== "object") return { team: "", agents: {} };
  const r = raw as Record<string, unknown>;
  const agents: Record<string, string> = {};
  if (r.agents && typeof r.agents === "object") {
    for (const [paneId, value] of Object.entries(r.agents as Record<string, unknown>)) {
      if (Object.keys(agents).length >= RULES_AGENTS_MAX) break;
      if (!PANE_REF.test(paneId)) continue;
      const body = text(value, scrub);
      if (body) agents[paneId] = body;
    }
  }
  return { team: text(r.team, scrub), agents };
}

const flat = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();

/** Başlangıç bağlamına giden tek satır: ekip + bu ajana özel; yoksa "". */
export function rulesDigest(rules: MemoryRules, paneId: string, max = RULES_DIGEST_MAX): string {
  const team = flat(rules.team);
  const own = flat(rules.agents[paneId] ?? "");
  if (!team && !own) return "";
  const parts = [team ? `Ekip: ${team}` : "", own ? `Sana ozel: ${own}` : ""].filter(Boolean);
  const line = `[Kimlik ve kurallar] ${parts.join(" | ")}`;
  return line.length <= max ? line : `${line.slice(0, max - 1)}…`;
}
