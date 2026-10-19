// Lider ajanın ekip yönetimi (Tur 7): `ntt-team spawn|assign|wait|status|close`.
// Betik (ntt-team.ps1) argümanları olduğu gibi köprüye yollar; ayrıştırma,
// yetki kuralları, görev kimliği ve sonuç satırı burada, saf ve test edilir.
//
//   ntt-team spawn --rol <Geliştirici|Analist|Test|İnceleme|…> [--ad <ad>] [--motor <motor>] [--gorev "<ilk görev>"]
//   ntt-team assign <ajan> "<görev>"      → görev kimliği (G-xxxx)
//   ntt-team wait <G-xxxx> [--sure <sn>]  → biten görevin özet cevabı
//   ntt-team status                       → üyeler, rol, durum/aşama, aktif görevler
//   ntt-team close <ajan>                 → yalnız liderin açtığı ajanı kapatır
//
// Yetki tek yönlü, yalnız AŞAĞI: açılan ajan liderle aynı alanda (aynı SAP bağı,
// aynı beceri profili; "modül danışmanları asla geliştirme yapamasınlar" kuralı
// profilde, rol etiketi yetki vermez), `ozel` motor (serbest komut) yok, axet-code'un
// kendi ajanları (`--agent`) yok, `-y` ile açılan axet-code'u yalnız axet-code lideri açabilir.
import { isAgentEngineId, type AgentEngineId } from "./agentTypes";

/** Hazır roller: anahtar → iki dildeki etiket (rolePresets.ts / i18n ile aynı). */
export const LEAD_ROLES = {
  lead: { tr: "Lider", en: "Lead" },
  developer: { tr: "Geliştirici", en: "Developer" },
  analyst: { tr: "Analist", en: "Analyst" },
  test: { tr: "Test", en: "Test" },
  review: { tr: "İnceleme", en: "Review" }
} as const;

export type LeadRoleKey = keyof typeof LEAD_ROLES;

const fold = (text: string): string =>
  text
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/i̇/g, "i");

const ROLE_ALIASES: Record<string, LeadRoleKey> = {
  lider: "lead",
  lead: "lead",
  leader: "lead",
  gelistirici: "developer",
  developer: "developer",
  dev: "developer",
  analist: "analyst",
  analyst: "analyst",
  test: "test",
  tester: "test",
  testci: "test",
  inceleme: "review",
  review: "review",
  reviewer: "review",
  incelemeci: "review"
};

/** Rol etiketi hazır rollerden biri mi (iki dilde, büyük/küçük ve Türkçe harf farkı yok). */
export function roleKeyOf(role: string): LeadRoleKey | null {
  return ROLE_ALIASES[fold(role)] ?? null;
}

/** Bölme Lider rolünde mi. */
export function isLeadRole(role: string | undefined | null): boolean {
  return typeof role === "string" && roleKeyOf(role) === "lead";
}

/**
 * İzin düzeyi: axet-code `-y` ile açılıyor (onay sormuyor) → 2; öteki motorlar
 * kendi onayını terminalde soruyor → 1; `ozel` (serbest komut) lidere kapalı → yok.
 */
export function engineRank(engine: AgentEngineId): number | null {
  if (engine === "axet-code") return 2;
  if (engine === "ozel") return null;
  return 1;
}

export type SpawnEngineResult = { ok: true; engine: AgentEngineId } | { ok: false; error: string };

/**
 * Açılacak ajanın motoru. İstenen motor açıkça verildiyse kurallara uymalı
 * (uymazsa hata); verilmediyse Araçlar'daki varsayılan, o da yetkiyi aşıyorsa
 * liderin kendi motoru.
 */
export function pickSpawnEngine(leader: AgentEngineId, requested: string | null, preferred: AgentEngineId | null): SpawnEngineResult {
  const leaderRank = engineRank(leader) ?? 0;
  const fits = (id: AgentEngineId) => {
    const rank = engineRank(id);
    return rank !== null && rank <= leaderRank;
  };
  if (requested) {
    if (!isAgentEngineId(requested)) return { ok: false, error: `Bilinmeyen motor: ${requested}. Gecerli: axet-code, claude, codex, gemini.` };
    if (requested === "ozel") return { ok: false, error: "Ozel komutlu motor lider tarafindan acilamaz." };
    if (!fits(requested)) return { ok: false, error: `${requested} senin yetkinden genis (onaysiz calisir); ${leader} liderinin acabilecegi motor degil.` };
    return { ok: true, engine: requested };
  }
  if (preferred && fits(preferred)) return { ok: true, engine: preferred };
  if (fits(leader)) return { ok: true, engine: leader };
  return { ok: false, error: "Uygun motor yok." };
}

export type LeadCommand =
  | { cmd: "spawn"; role: LeadRoleKey | null; roleText: string; name: string; engine: string | null; task: string }
  | { cmd: "assign"; to: string; text: string }
  | { cmd: "wait"; id: string; timeoutS: number }
  | { cmd: "status" }
  | { cmd: "close"; to: string };

export const LEAD_COMMANDS = ["spawn", "assign", "wait", "status", "close"] as const;
export const LEAD_TASK_MAX = 1_500;
export const LEAD_NAME_MAX = 40;
/** Ajanın kabuk aracı uzun komutu kesebiliyor (ölçüm Tur 7: ~30 sn): varsayılan kısa, tekrar çağrılır. */
export const WAIT_DEFAULT_S = 25;
export const WAIT_MAX_S = 600;

export const LEAD_USAGE = [
  "Kullanim (yalniz Lider rolundeki ajan):",
  '  ntt-team spawn --rol <Gelistirici|Analist|Test|Inceleme> [--ad <ad>] [--motor axet-code|claude|codex|gemini] [--gorev "<ilk gorev>"]',
  '  ntt-team assign <ajan> "<gorev>"      gorev kimligi doner (G-xxxx)',
  "  ntt-team wait <G-xxxx> [--sure <sn>]  biten gorevin ozet cevabi (varsayilan 25 sn; bitmediyse yeniden cagir)",
  "  ntt-team status                       ekip, durum, aktif gorevler",
  "  ntt-team close <ajan>                 yalniz senin actigin ajani kapatir"
].join("\n");

const TASK_ID = /^G-[a-z0-9]{4,8}$/;

export function isLeadTaskId(value: unknown): value is string {
  return typeof value === "string" && TASK_ID.test(value);
}

/** 4 karakterlik kimlik; `rand` 0..1 üretir (testte sabit). */
export function newLeadTaskId(rand: () => number): string {
  let out = "";
  for (let i = 0; i < 4; i++) out += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(rand() * 36) % 36];
  return `G-${out}`;
}

const clean = (text: string, max: number) => text.replace(/\s+/g, " ").trim().replace(/^"+|"+$/g, "").trim().slice(0, max);

/** CLI argümanları (betikten gelen dizi) → komut ya da kullanım hatası. */
export function parseLeadArgs(raw: unknown): LeadCommand | { error: string } {
  if (!Array.isArray(raw) || raw.some((a) => typeof a !== "string")) return { error: LEAD_USAGE };
  const args = (raw as string[]).map((a) => a.trim()).filter((a) => a !== "");
  const cmd = (args.shift() ?? "").toLowerCase();
  const flags: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = fold(a.slice(2));
      // Bayrağın değeri bir sonraki bayrağa kadar (PowerShell tırnaksız metni böler).
      const parts: string[] = [];
      while (i + 1 < args.length && !args[i + 1].startsWith("--")) parts.push(args[++i]);
      flags[key] = parts.join(" ");
    } else rest.push(a);
  }
  if (cmd === "spawn") {
    const roleText = clean(flags.rol ?? flags.role ?? "", 40);
    if (!roleText) return { error: "Rol gerekli: ntt-team spawn --rol Gelistirici [--gorev \"...\"]" };
    return {
      cmd,
      role: roleKeyOf(roleText),
      roleText,
      name: clean(flags.ad ?? flags.name ?? "", LEAD_NAME_MAX),
      engine: clean(flags.motor ?? flags.engine ?? "", 20) || null,
      task: clean(flags.gorev ?? flags.task ?? "", LEAD_TASK_MAX)
    };
  }
  if (cmd === "assign") {
    const to = rest[0] ?? "";
    const text = clean([...rest.slice(1), flags.gorev ?? ""].join(" "), LEAD_TASK_MAX);
    if (!to || !text) return { error: 'Kullanim: ntt-team assign <ajan> "<gorev>"' };
    return { cmd, to: clean(to, LEAD_NAME_MAX), text };
  }
  if (cmd === "wait") {
    const id = (rest[0] ?? "").trim();
    if (!isLeadTaskId(id)) return { error: "Kullanim: ntt-team wait <G-xxxx> [--sure <sn>]" };
    const asked = Number(flags.sure ?? flags.timeout ?? "");
    const timeoutS = Number.isFinite(asked) && asked > 0 ? Math.min(WAIT_MAX_S, Math.max(5, Math.floor(asked))) : WAIT_DEFAULT_S;
    return { cmd, id, timeoutS };
  }
  if (cmd === "status") return { cmd };
  if (cmd === "close") {
    const to = clean(rest.join(" "), LEAD_NAME_MAX);
    if (!to) return { error: "Kullanim: ntt-team close <ajan>" };
    return { cmd, to };
  }
  return { error: LEAD_USAGE };
}

/**
 * Göreve giden satır. Sonuç işareti istemde BİTİŞİK yazılmıyor: terminaldeki
 * yankı `GOREV-SONUC <id>:` desenine uymasın, yalnız ajanın yazdığı satır uysun.
 */
export function leadTaskPrompt(leaderName: string, id: string, text: string): string {
  return `${leaderName} (ekip liderin) gorev veriyor [${id}]: ${text} -- Isi bitirince cevabinin SON satiri sunun birlesimi olsun: GOREV-SONUC, bir bosluk, ${id}, iki nokta, tek satir ozet.`;
}

const ANSI = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|\u001b[@-Z\\-_]/g;

/** Metindeki SON `GOREV-SONUC <id>: …` satırının özeti; yoksa null. */
export function extractLeadResult(text: string | null | undefined, id: string): string | null {
  if (!text || !isLeadTaskId(id)) return null;
  const plain = text.replace(ANSI, "");
  const re = new RegExp(`GOREV-SONUC\\s+${id}\\s*:\\s*([^\\r\\n]*)`, "g");
  let found: string | null = null;
  for (const m of plain.matchAll(re)) {
    const summary = m[1].replace(/[│║┃|]+\s*$/u, "").trim();
    if (summary) found = summary;
  }
  return found ? found.slice(0, 2_000) : null;
}

/** Akış kartının türü (StoredFlowEvent.act). */
export type LeadAct = "spawn" | "assign" | "result" | "close" | "denied";
export const LEAD_ACTS: readonly LeadAct[] = ["spawn", "assign", "result", "close", "denied"];

export function isLeadAct(value: unknown): value is LeadAct {
  return typeof value === "string" && (LEAD_ACTS as readonly string[]).includes(value);
}

/** Liderin yeni açılan bir ajana verebileceği rol: hazır roller (Lider hariç) ya da serbest etiket. */
export function spawnRoleLabel(cmd: { role: LeadRoleKey | null; roleText: string }, lang: "tr" | "en"): { label: string; preset: boolean } | { error: string } {
  if (cmd.role === "lead") return { error: "Lider kendini cogaltamaz: Lider rolunde ajan acilamaz." };
  if (cmd.role) return { label: LEAD_ROLES[cmd.role][lang], preset: true };
  return { label: cmd.roleText, preset: false };
}

/**
 * Lider rolündeki ajana ilk Akış mesajında bir kez verilen yöneticilik rehberi
 * (tek satır; TEAM_HINT yerine). `max`: ekip başına açabileceği ajan sayısı.
 */
export function leadHint(max: number, canSpawn: boolean): string {
  const spawn = canSpawn
    ? `once \`ntt-team status\` ile bostaki uygun ajani kullan, yoksa \`ntt-team spawn --rol Gelistirici|Analist|Test|Inceleme [--ad X] [--gorev "..."]\` ile ajan ac (en cok ${max}), `
    : "";
  return ` (Sen ekip liderisin: isi parcala; ${spawn}\`ntt-team assign <ajan> "<gorev>"\` ile gorev ver (G-xxxx kimligi doner), \`ntt-team wait <G-xxxx>\` ile sonucu bekle (25 sn'de bitmezse ayni komutu yeniden calistir; ajani yeniden acma); sonuclari birlestir ve kullaniciya kisa ozet ver. Is bitince actigin ajanlari kapatma, sonraki isler icin ekipte kalsinlar; \`ntt-team close <ajan>\` yalniz kullanici isterse. Kendin Lider acamazsin; actigin ajanlar senden genis yetki almaz. \`ntt-team list|ask|feed|memory\` de var.)`;
}

/** Ayarlar → ekip başına lider açımı ajan sınırı. */
export const LEAD_MAX_DEFAULT = 4;
export const LEAD_MAX_LIMIT = 8;

export function normalizeLeadMax(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= LEAD_MAX_LIMIT ? value : LEAD_MAX_DEFAULT;
}

/** Ana süreç → renderer "team:spawn": ekibin alanında ajan bölmesi aç. */
export interface LeadSpawnRequest {
  workspaceId: string;
  paneId: string;
  name: string;
  role: string;
  roleKind: "preset" | "custom";
  leaderPaneId: string;
  leaderEngine: AgentEngineId;
  /** Açıkça istenen motor (doğrulandı); yoksa renderer Araçlar'daki varsayılanı kurala göre seçer. */
  engine: AgentEngineId | null;
}

/** Ana süreç → renderer "team:approval": Akış'ta onay kartı. */
export interface LeadApprovalRequest {
  workspaceId: string;
  leaderPaneId: string;
  leader: string;
  name: string;
  role: string;
  engine: AgentEngineId | null;
  task: string;
}

/** Ana süreç → renderer "team:close": yalnız liderin açtığı bölme. */
export interface LeadCloseRequest {
  workspaceId: string;
  paneId: string;
  leaderPaneId: string;
}

/** Renderer'a giden isteğin cevap eşlemesi (team:reply). */
export type WithRequestId<T> = T & { requestId: string };
