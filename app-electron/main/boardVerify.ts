// Doğrulama çalıştırıcısı (spec 2026-10-18 gorev-panosu §6). Alanın
// doğrulama komutları — YALNIZ kullanıcının alan menüsünde yazdığı metin —
// terminalden bağımsız gizli bir çocuk süreçte, alan kökünde, sırayla
// çalışıyor; ilk kırmızıda duruyor. Komut başına süre sınırı var; aşılırsa
// süreç ağacı kapatılıyor. Çıktının son 40 satırı (≤ 8 KB) kanıta yazılıyor.
// `done` hiçbir koşulda reddedilmiyor: ana süreçte yakalanmamış söz yok.
import type { Proof, ProofCommand } from "../shared/boardTypes";
import { stripAnsi } from "./agentGenericReader";

export const VERIFY_TIMEOUT_MS = 10 * 60_000;
export const TAIL_LINES = 40;
export const TAIL_BYTES = 8 * 1024;
/** Süre boyunca tutulan çıktı (sonu); kuyruk bundan kesiliyor. */
const BUFFER_MAX = 64 * 1024;

export interface VerifyChild {
  pid?: number;
  stdout: NodeJS.EventEmitter | null;
  stderr: NodeJS.EventEmitter | null;
  on(ev: "close", cb: (code: number | null) => void): unknown;
  on(ev: "error", cb: (err: Error) => void): unknown;
}

export interface VerifyDeps {
  spawn(command: string, cwd: string): VerifyChild;
  killTree(child: VerifyChild): void;
  dirExists(dir: string): boolean;
  now(): number;
  timeoutMs: number;
  /** Ağaç kapatıldıktan sonra `close` gelmezse bu kadar bekleyip kanıtı yine de veriyor. */
  killGraceMs: number;
}

export interface VerifyRun {
  done: Promise<Proof>;
  cancel(): void;
}

/** Son 40 satır, ANSI'siz, ≤ 8 KB (baştan kesiliyor; kırık ilk karakter atılıyor). */
export function tailOf(text: string): string {
  const lines = stripAnsi(text).replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  let tail = lines.slice(-TAIL_LINES).join("\n");
  const bytes = Buffer.from(tail, "utf-8");
  if (bytes.length > TAIL_BYTES) {
    tail = bytes.subarray(bytes.length - TAIL_BYTES).toString("utf-8").replace(/^�+/, "");
  }
  return tail;
}

export function runVerification(commands: readonly string[], cwd: string, deps: VerifyDeps): VerifyRun {
  let cancelled = false;
  let current: VerifyChild | null = null;

  const kill = (child: VerifyChild) => {
    try {
      deps.killTree(child);
    } catch {
      // zaten kapanmış olabilir
    }
  };

  const runOne = (command: string): Promise<ProofCommand> =>
    new Promise((resolve) => {
      const started = deps.now();
      let out = "";
      let timedOut = false;
      let settled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const finish = (entry: Omit<ProofCommand, "command" | "durationMs">) => {
        if (settled) return;
        settled = true;
        for (const t of timers) clearTimeout(t);
        current = null;
        resolve({ command, durationMs: Math.max(0, deps.now() - started), ...entry });
      };
      let child: VerifyChild;
      try {
        child = deps.spawn(command, cwd);
      } catch (err) {
        finish({ exitCode: null, tail: tailOf(err instanceof Error ? err.message : String(err)), error: "spawn" });
        return;
      }
      current = child;
      const collect = (chunk: Buffer | string) => {
        out = (out + chunk.toString()).slice(-BUFFER_MAX);
      };
      child.stdout?.on("data", collect);
      child.stderr?.on("data", collect);
      child.on("error", (err) => finish({ exitCode: null, tail: tailOf(`${out}\n${err.message}`), error: "spawn" }));
      child.on("close", (code) =>
        finish(timedOut ? { exitCode: null, tail: tailOf(out), timedOut: true } : { exitCode: code, tail: tailOf(out) })
      );
      timers.push(
        setTimeout(() => {
          timedOut = true;
          kill(child);
          // taskkill süreci bitiremezse kanıt yine gelsin.
          timers.push(setTimeout(() => finish({ exitCode: null, tail: tailOf(out), timedOut: true }), deps.killGraceMs));
        }, deps.timeoutMs)
      );
    });

  const done = (async (): Promise<Proof> => {
    const results: ProofCommand[] = [];
    try {
      let dirOk = false;
      try {
        dirOk = deps.dirExists(cwd);
      } catch {
        dirOk = false;
      }
      if (!dirOk) {
        results.push({ command: commands[0] ?? "", exitCode: null, durationMs: 0, tail: "", error: "missingDir" });
        return { kind: "commands", commands: results, ok: false, at: deps.now() };
      }
      for (const command of commands) {
        if (cancelled) break;
        const result = await runOne(command);
        results.push(result);
        if (result.exitCode !== 0 || result.timedOut || result.error) break;
      }
    } catch {
      // beklenmedik: kanıt kırmızı
      return { kind: "commands", commands: results, ok: false, at: Date.now() };
    }
    const ok =
      !cancelled &&
      commands.length > 0 &&
      results.length === commands.length &&
      results.every((r) => r.exitCode === 0 && !r.timedOut && !r.error);
    return { kind: "commands", commands: results, ok, at: deps.now() };
  })();

  return {
    done,
    cancel: () => {
      cancelled = true;
      if (current) kill(current);
    }
  };
}
