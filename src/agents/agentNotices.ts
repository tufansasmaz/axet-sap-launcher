// Tur 6: uygulama içi ajan bildirimi — SAF karar. Kaynak Akış'ın CANLI
// olayları (diskten yüklenen geçmiş değil): soru, bitti, hata. Aynı olay
// (ajan + tür + an) için tek bildirim.
import type { TranslateFn } from "../i18n";
import type { FlowInput } from "./flowEvents";
import { errorCard } from "./flowText";

export type NoticeKind = "asked" | "finished" | "error";

export interface AgentNotice {
  key: string;
  kind: NoticeKind;
  workspaceId: string;
  paneId: string;
  name: string;
  /** "finished": kesin kaynaktan mı (değilse tahmini işaretli). */
  exact: boolean;
  /** Tur 9: hata kartının "err|…" ayrıntısı. */
  detail?: string;
}

const KINDS: ReadonlySet<string> = new Set<NoticeKind>(["asked", "finished", "error"]);
const SEEN_MAX = 500;

export function pickNotices(inputs: readonly FlowInput[], seen: Set<string>): AgentNotice[] {
  const out: AgentNotice[] = [];
  for (const e of inputs) {
    if (!KINDS.has(e.kind) || !e.paneId) continue;
    // Tur 9: otomatik deneme bekleyen hata bildirilmez; kesinleşen hata tek bildirim.
    if (e.kind === "error" && e.retrying) continue;
    const key = `${e.workspaceId}|${e.paneId}|${e.kind}|${e.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, kind: e.kind as NoticeKind, workspaceId: e.workspaceId, paneId: e.paneId, name: e.name, exact: e.exact !== false, ...(e.kind === "error" ? { detail: e.detail } : {}) });
  }
  // Sınırsız büyümesin: en eski anahtarlar düşer (Set ekleme sırasını korur).
  while (seen.size > SEEN_MAX) {
    const first = seen.values().next().value;
    if (first === undefined) break;
    seen.delete(first);
  }
  return out;
}

export interface NoticeContext {
  enabled: boolean;
  /** Ajanlar ekranı açık. */
  agentsVisible: boolean;
  activeWorkspaceId: string | null;
}

export interface NoticePlan {
  toast: boolean;
  /** O ekip zaten görünür: kısa toast, okunmamış sayılmaz. */
  short: boolean;
  unread: boolean;
}

export function noticePlan(notice: AgentNotice, ctx: NoticeContext): NoticePlan {
  if (!ctx.enabled) return { toast: false, short: false, unread: false };
  const visible = ctx.agentsVisible && ctx.activeWorkspaceId === notice.workspaceId;
  return { toast: true, short: visible, unread: !visible };
}

export function noticeText(notice: AgentNotice, t: TranslateFn): string {
  const name = notice.name.trim() || t("agents.notice.someone");
  if (notice.kind === "asked") return t("agents.notice.asked", { name });
  if (notice.kind === "error") {
    const card = errorCard(notice.detail ?? "");
    if (!card) return t("agents.notice.error", { name });
    const tries = card.attempts > 0 && card.max > 0 ? t("agents.errorTries", { n: card.attempts, max: card.max }) : "";
    return t("agents.notice.errorClass", { name, cls: t(`agents.errorClass.${card.cls}`), tries });
  }
  return t(notice.exact ? "agents.notice.finished" : "agents.notice.finishedEstimated", { name });
}

export function noticeTone(kind: NoticeKind): "success" | "warning" | "error" {
  return kind === "asked" ? "warning" : kind === "error" ? "error" : "success";
}
