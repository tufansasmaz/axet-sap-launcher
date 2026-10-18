// Bellek bildiriminin zamanlaması (spec 2026-10-18 ajan-bellegi §3, §7): saf
// durum makinesi. Saat dışarıdan; zamanlayıcı yok.
//
// "Deneme" (sapma 2): ajan boşta göründüğü bir anda yapılan gönderme
// girişimi. Ajan çalışırken, soru sorarken ya da kullanıcı yazarken beklemek
// deneme saymaz; böylece uzun bir pano işi bellek satırını düşürmez.
import type { AgentStatus } from "./agentTypes";

export const MEMORY_NOTICE_TRIES = 3;
export const MEMORY_NOTICE_GAP_MS = 10_000;

export type NoticePhase = "pending" | "sending" | "sent" | "failed";

export interface NoticeState {
  /** Hangi ajan süreci: yeni pty → yeni durum (yeniden başlatmada yine bir kez). */
  ptyId: string;
  phase: NoticePhase;
  attempts: number;
  /** Bundan önce yeniden denenmez (ms). */
  nextAt: number;
}

export interface NoticeAgent {
  status: AgentStatus | null;
  inputIdle: boolean;
  engineReady: boolean;
}

export function startNotice(ptyId: string): NoticeState {
  return { ptyId, phase: "pending", attempts: 0, nextAt: 0 };
}

/** Motor hazır, istem satırı boş, iş ya da soru yok. */
export function agentAtRest(agent: NoticeAgent): boolean {
  const state = agent.status?.state;
  return agent.engineReady && agent.inputIdle && (state === "idle" || state === "unknown");
}

export function noticeDue(state: NoticeState, agent: NoticeAgent, now: number): boolean {
  return state.phase === "pending" && now >= state.nextAt && agentAtRest(agent);
}

export function noticeSending(state: NoticeState): NoticeState {
  return { ...state, phase: "sending" };
}

export function noticeDelivered(state: NoticeState): NoticeState {
  return { ...state, phase: "sent" };
}

/**
 * Deneme reddedildi (hiçbir şey yazılmadı: busy/typing/asking/notRunning/…);
 * üçüncüde vazgeçiliyor.
 */
export function noticeMissed(state: NoticeState, now: number): NoticeState {
  const attempts = state.attempts + 1;
  return { ...state, attempts, phase: attempts >= MEMORY_NOTICE_TRIES ? "failed" : "pending", nextAt: now + MEMORY_NOTICE_GAP_MS };
}

/**
 * Enter'dan önce kesildi: metin ajanın istem satırında kalmış olabilir;
 * kendiliğinden yeniden yazmak ikinci kopyayı ekler. Deneme sayılır ve
 * doğrudan vazgeçilir; yalnız "Yeniden bildir" baştan alır.
 */
export function noticeAborted(state: NoticeState): NoticeState {
  return { ...state, attempts: state.attempts + 1, phase: "failed" };
}

/** Bellek kapalı ya da kayıt henüz yazılmadı: deneme sayılmadan sonra yeniden bakılıyor. */
export function noticeLater(state: NoticeState, now: number): NoticeState {
  return { ...state, nextAt: now + MEMORY_NOTICE_GAP_MS };
}

/** Dosya yaratılamadı: denemesiz vazgeçiliyor (sapma 8). */
export function noticeBlocked(state: NoticeState): NoticeState {
  return { ...state, phase: "failed" };
}

/** "Yeniden bildir": gönderilirken yok; diğer her durumda baştan. */
export function noticeRetry(state: NoticeState): NoticeState | null {
  return state.phase === "sending" ? null : { ...state, phase: "pending", attempts: 0, nextAt: 0 };
}
