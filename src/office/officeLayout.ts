// Ofis görünümünün SAF yardımcıları (spec 2026-10-18 ofis-gorunumu §3, §4).
// Yeni bilgi üretmiyor: ekip şeridinin durum metni (`cardStatus`) üstüne poz
// ekliyor. Sıra: önce bölmenin hâli, sonra izleyicinin kaydı — süreci bitmiş
// bölmenin son kaydı bayattır, gösterilmez. Tahmini durumda hareket yok;
// soru metni yalnız kesin "soru soruyor"da.
import { AGENT_ENGINE_MISSING, type AgentStatus } from "../../app-electron/shared/agentTypes";
import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane } from "../stores/terminalTypes";
import { cardStatus, type StatusTone } from "../agents/agentView";

/** Alan sınırı: bir alanda en fazla bu kadar bölme, dolayısıyla ajan. */
export const OFFICE_MAX_SEATS = MAX_TERMINAL_PANES;
export const OFFICE_QUESTION_MAX = 60;
export const OFFICE_TASK_MAX = 40;

/** Boşlukları teke indirir; `max` karakteri aşarsa `max` uzunlukta "…" ile biter. Emoji bölünmez. */
export function clipText(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(flat);
  if (chars.length <= max) return flat;
  return `${chars.slice(0, Math.max(0, max - 1)).join("").trimEnd()}…`;
}

export type OfficePose = "typing" | "asking" | "resting" | "error" | "unknown" | "absent";

export interface OfficeSeatView {
  pose: OfficePose;
  /** Yalnız kesin "çalışıyor"da; tahmini durumda asla. */
  motion: boolean;
  /** Bölme çalışıyor ve kayıt tahmini (≈). Kayıt yoksa false: "bilinmiyor" ≈ ile süslenmiyor. */
  estimated: boolean;
  /** Balondaki metin: yalnız kesin "soru soruyor"da, en çok OFFICE_QUESTION_MAX. */
  question: string | null;
  tone: StatusTone;
  key: TranslationKey;
  params?: { min: number };
}

function poseOf(state: AgentStatus["state"]): OfficePose {
  switch (state) {
    case "running":
      return "typing";
    case "asking":
      return "asking";
    case "idle":
    case "finished":
      return "resting";
    case "error":
      return "error";
    default:
      return "unknown";
  }
}

export function officeSeat(pane: TerminalPane, status: AgentStatus | undefined, now: number): OfficeSeatView {
  const card = cardStatus(pane, status, now);
  const text = { tone: card.tone, key: card.key, ...(card.params ? { params: card.params } : {}) };
  const still = { motion: false, estimated: false, question: null };
  const run = pane.run;
  if (run.state === "failed" && run.message === AGENT_ENGINE_MISSING) return { ...text, ...still, pose: "absent" };
  if (run.state === "failed" || run.state === "missingDir") return { ...text, ...still, pose: "error" };
  if (run.state === "exited") return { ...text, ...still, pose: "resting" };
  if (run.state !== "running" || !status) return { ...text, ...still, pose: "unknown" };
  const estimated = status.source === "estimated";
  const pose = poseOf(status.state);
  const asked =
    pose === "asking" && !estimated && status.question
      ? clipText(status.question.question.trim() || status.question.header, OFFICE_QUESTION_MAX)
      : "";
  return { ...text, pose, motion: pose === "typing" && !estimated, estimated, question: asked || null };
}
