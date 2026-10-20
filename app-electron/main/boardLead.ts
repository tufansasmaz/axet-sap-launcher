// Lider çalıştırıcısı (spec 2026-10-18 gorev-panosu §3, §7). Başsız TEK
// tur, her planlamada yeni oturum; yalnız plan üretiyor. Önce axet-code'un
// kullanılabilir olduğu denetleniyor (yoksa Doktor mesajı). Alan bir Git
// deposuysa tur öncesi ve sonrası `git status --porcelain` karşılaştırılıyor:
// fark varsa "Lider planlarken dosya değiştirdi" — geri alma yok, yalnız
// dürüst bilgi. `done` hiçbir koşulda reddedilmiyor.
import { parseLeadPlan, type PlannedSubtask } from "../shared/boardPlan";
import { LEAD_DETAIL_MAX, LEAD_RAW_MAX, type LeadErrorCode } from "../shared/boardTypes";
import { classifyAgentError, cleanErrorDetail, scanTerminalError } from "../shared/agentErrors";
import { redact } from "./support/redact";

export const LEAD_TIMEOUT_MS = 3 * 60_000;
/**
 * Tur 10 (ölçüldü): istek sınırına takılan axet-code `run` başarıyla çıkıp yalnız
 * "429 Too Many Requests {...}" yazıyor; içindeki JSON plan sanılıyordu. Plan yoksa
 * ve metin geçici servis hatasıysa bir kez bu kadar bekleyip yeniden deneniyor.
 */
export const LEAD_RETRY_MS = 20_000;
const TRANSIENT = new Set(["rateLimit", "unavailable", "network"]);

/** Plan çıkmayan cevaptaki servis hatası satırı (geçici sınıflarda); yoksa null. */
export function leadServiceError(text: string): { transient: boolean; detail: string } | null {
  const line = scanTerminalError(text) ?? (/\b(?:429|5\d\d)\b.*(?:Too Many|Unavailable|Internal Server)/i.exec(text)?.[0] ?? null);
  if (!line) return null;
  const cls = classifyAgentError(line);
  if (cls === "unknown") return null;
  return { transient: TRANSIENT.has(cls), detail: cleanErrorDetail(redact(line, []).text) };
}

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
  /** Tur 10: yeniden deneme beklemesi (testte enjekte). */
  sleep?(ms: number): Promise<void>;
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
      const once = async (): Promise<LeadTurnResult> => {
        const turn = deps.startTurn(cwd, prompt);
        cancelTurn = turn.cancel;
        const r = await turn.done;
        cancelTurn = null;
        return r;
      };
      let result = await once();
      let parsed = result.ok && !result.timedOut ? parseLeadPlan(result.text) : null;
      if (parsed && !parsed.ok && !cancelled && leadServiceError(result.text)?.transient) {
        await (deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms))))(LEAD_RETRY_MS);
        if (cancelled) return failure("failed", false);
        result = await once();
        parsed = result.ok && !result.timedOut ? parseLeadPlan(result.text) : null;
      }
      const after = await safeGit();
      const changedFiles = before !== null && after !== null && before !== after;
      if (result.timedOut) return failure("timeout", changedFiles, { raw: result.text });
      if (!result.ok) return failure("failed", changedFiles, { detail: result.error, raw: result.text });
      const plan = parsed ?? parseLeadPlan(result.text);
      if (!plan.ok) {
        const service = leadServiceError(result.text);
        if (service) return failure("failed", changedFiles, { detail: service.detail, raw: result.text });
        return failure(plan.error, changedFiles, { raw: result.text });
      }
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
