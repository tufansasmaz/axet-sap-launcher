// Lider çalıştırıcısı (spec 2026-10-18 gorev-panosu §3, §7). Başsız TEK
// tur, her planlamada yeni oturum; yalnız plan üretiyor. Önce axet-code'un
// kullanılabilir olduğu denetleniyor (yoksa Doktor mesajı). Alan bir Git
// deposuysa tur öncesi ve sonrası `git status --porcelain` karşılaştırılıyor:
// fark varsa "Lider planlarken dosya değiştirdi" — geri alma yok, yalnız
// dürüst bilgi. `done` hiçbir koşulda reddedilmiyor.
import { parseLeadPlan, type PlannedSubtask } from "../shared/boardPlan";
import { LEAD_DETAIL_MAX, LEAD_RAW_MAX, type LeadErrorCode } from "../shared/boardTypes";

export const LEAD_TIMEOUT_MS = 3 * 60_000;

export interface LeadTurnResult {
  ok: boolean;
  text: string;
  error?: string;
  timedOut: boolean;
  spawnFailed: boolean;
}

export interface LeadDeps {
  /** axet-code kullanılabilir mi; değilse kullanıcıya gösterilecek mesaj. */
  binaryMessage(): Promise<string | null>;
  startTurn(cwd: string, prompt: string): { done: Promise<LeadTurnResult>; cancel(): void };
  /** `git status --porcelain`; Git deposu değilse ya da okunamazsa null. */
  gitStatus(cwd: string): Promise<string | null>;
  now(): number;
}

export type LeadOutcome =
  | { ok: true; subtasks: PlannedSubtask[]; changedFiles: boolean; durationMs: number }
  | { ok: false; error: LeadErrorCode; detail?: string; raw?: string; changedFiles: boolean; durationMs: number };

export interface LeadRun {
  done: Promise<LeadOutcome>;
  cancel(): void;
}

export function runLead(cwd: string, prompt: string, deps: LeadDeps): LeadRun {
  let cancelled = false;
  let cancelTurn: (() => void) | null = null;
  const started = deps.now();
  const elapsed = () => Math.max(0, deps.now() - started);
  const safeGit = async (): Promise<string | null> => {
    try {
      return await deps.gitStatus(cwd);
    } catch {
      return null;
    }
  };
  const failure = (error: LeadErrorCode, changedFiles: boolean, extra: { detail?: string; raw?: string } = {}): LeadOutcome => {
    const out: Extract<LeadOutcome, { ok: false }> = { ok: false, error, changedFiles, durationMs: elapsed() };
    const detail = extra.detail?.trim().slice(0, LEAD_DETAIL_MAX);
    if (detail) out.detail = detail;
    const raw = extra.raw?.slice(0, LEAD_RAW_MAX);
    if (raw) out.raw = raw;
    return out;
  };

  const done = (async (): Promise<LeadOutcome> => {
    try {
      const message = await deps.binaryMessage();
      if (message) return failure("binary", false, { detail: message });
      if (cancelled) return failure("failed", false);
      const before = await safeGit();
      if (cancelled) return failure("failed", false);
      const turn = deps.startTurn(cwd, prompt);
      cancelTurn = turn.cancel;
      const result = await turn.done;
      cancelTurn = null;
      const after = await safeGit();
      const changedFiles = before !== null && after !== null && before !== after;
      if (result.timedOut) return failure("timeout", changedFiles, { raw: result.text });
      if (!result.ok) return failure("failed", changedFiles, { detail: result.error, raw: result.text });
      const plan = parseLeadPlan(result.text);
      if (!plan.ok) return failure(plan.error, changedFiles, { raw: result.text });
      return { ok: true, subtasks: plan.subtasks, changedFiles, durationMs: elapsed() };
    } catch {
      return failure("failed", false);
    }
  })();

  return {
    done,
    cancel: () => {
      cancelled = true;
      try {
        cancelTurn?.();
      } catch {
        // tur zaten bitmiş olabilir
      }
    }
  };
}
