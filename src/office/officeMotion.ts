// Piksel ofisin zamanlaması (spec 2026-10-18 ajanlar-yeniden §2b, §3). SAF:
// poz -> çizilecek kare, ~4 fps yazma, pano dağıtımında liderden ajana ışın.
// Hareket yalnız kesin "çalışıyor"da ve hareketi azalt kapalıyken.
import type { TerminalPane } from "../stores/terminalTypes";
import type { OfficePose } from "./officeLayout";
import type { CharacterFrame } from "./officeSprites";

export const FRAME_MS = 250;
export const BEAM_MS = 800;
/** Işının ucu sürenin bu kesrinde hedefe varıyor, kalanında sönüyor. */
const BEAM_TRAVEL = 0.5;

export interface SeatFrame {
  /** null: motor yok, masa boş. */
  body: CharacterFrame | null;
  monitor: "on" | "off" | "error" | "none";
  mark: "question" | "error" | null;
  dim: boolean;
  animated: boolean;
}

export function seatFrame(pose: OfficePose, motion: boolean, reduced: boolean, now: number): SeatFrame {
  const still = { mark: null, dim: false, animated: false };
  switch (pose) {
    case "typing": {
      const animated = motion && !reduced;
      const odd = animated && Math.floor(now / FRAME_MS) % 2 === 1;
      return { ...still, body: odd ? "typeB" : "typeA", monitor: "on", animated };
    }
    case "asking":
      return { ...still, body: "typeA", monitor: "on", mark: "question" };
    case "error":
      return { ...still, body: "sit", monitor: "error", mark: "error" };
    case "resting":
      return { ...still, body: "rest", monitor: "off" };
    case "absent":
      return { ...still, body: null, monitor: "none" };
    default:
      return { ...still, body: "sit", monitor: "off", dim: true };
  }
}

/** Çizim döngüsü gerekiyor mu: görünür, hareketi azalt kapalı ve (yazan ya da ışın) var. */
export function needsAnimation(frames: readonly SeatFrame[], beams: number, visible: boolean, reduced: boolean): boolean {
  if (!visible || reduced) return false;
  return beams > 0 || frames.some((f) => f.animated);
}

/**
 * Pano olayı: bir bölmenin aktif alt görevi değişti ve yeni değer boş değil.
 * İlk görüntüde (prev null) ışın yok — açılışta bütün ofis yanıp sönmesin.
 */
export function newAssignments(prev: Readonly<Record<string, string | null>> | null, next: Readonly<Record<string, string | null>>): string[] {
  if (!prev) return [];
  return Object.keys(next).filter((id) => next[id] !== null && next[id] !== (prev[id] ?? null));
}

/** Işının o anki biçimi: uç 0-1 arası ilerliyor, sonra alfa 1'den 0'a. Süre dışında null. */
export function beamShape(start: number, now: number): { head: number; alpha: number } | null {
  const t = (now - start) / BEAM_MS;
  if (t < 0 || t >= 1) return null;
  if (t <= BEAM_TRAVEL) return { head: t / BEAM_TRAVEL, alpha: 1 };
  return { head: 1, alpha: 1 - (t - BEAM_TRAVEL) / (1 - BEAM_TRAVEL) };
}

const LEADER = /(^|[^\p{L}])(lider|lideri|leader|lead)([^\p{L}]|$)/iu;

/** Rolü lider olan ilk ajan; yoksa null (ışın kapıdan çıkar). */
export function leaderPane(panes: readonly TerminalPane[]): string | null {
  return panes.find((p) => LEADER.test(p.agent?.role ?? ""))?.id ?? null;
}

/** Bresenham: uçlar dahil, aralıksız piksel dizisi. */
export function linePixels(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const tx = Math.round(x1);
  const ty = Math.round(y1);
  const dx = Math.abs(tx - x);
  const dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1;
  const sy = y < ty ? 1 : -1;
  let err = dx + dy;
  const out: Array<[number, number]> = [];
  for (;;) {
    out.push([x, y]);
    if (x === tx && y === ty) return out;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
