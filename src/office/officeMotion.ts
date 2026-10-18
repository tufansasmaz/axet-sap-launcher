// Piksel ofisin zamanlaması (spec 2026-10-18 ajanlar-yeniden §2b, §3). SAF:
// ~4 fps kare saati, pano dağıtımında liderden ajana ışın, liderin kısa
// "konuşma" balonu, panonun lideri ofiste mi.
import type { Board } from "../../app-electron/shared/boardTypes";
import type { TerminalPane } from "../stores/terminalTypes";

export const FRAME_MS = 250;
export const BEAM_MS = 800;
export const TALK_MS = 1500;
/** Işının ucu sürenin bu kesrinde hedefe varıyor, kalanında sönüyor. */
const BEAM_TRAVEL = 0.5;

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

/** Lider iş dağıtırken konuşuyor: son ışından sonra TALK_MS boyunca. */
export function talking(beamStarts: readonly number[], now: number): boolean {
  return beamStarts.some((s) => now >= s && now - s < TALK_MS);
}

const LEADER = /(^|[^\p{L}])(lider|lideri|leader|lead)([^\p{L}]|$)/iu;

/** Rolü lider olan ilk ajan; yoksa null. */
export function leaderPane(panes: readonly TerminalPane[]): string | null {
  return panes.find((p) => LEADER.test(p.agent?.role ?? ""))?.id ?? null;
}

/** Panonun lideri iş başında mı: planlıyor, onay bekliyor ya da görev yürüyor. */
export function boardLeadActive(board: Board | undefined): boolean {
  return !!board?.tasks.some((t) => t.planning || t.state === "running" || t.state === "awaitingApproval");
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
