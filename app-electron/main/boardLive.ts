// Görev panosunun CANLI bağımlılıkları (spec 2026-10-18 gorev-panosu).
// İnce ve test edilmiyor: mantık boardVerify.ts, boardLead.ts ve
// boardStore.ts'te, orada enjekte sahtelerle test ediliyor. Bu dosya
// axetHeadless.ts'i (dolayısıyla better-sqlite3'ü) çekiyor; testler bunu
// İÇE AKTARMAMALI.
import { app } from "electron";
import { execFile, spawn } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import { axetBinaryMessage, axetBinaryStatus } from "./axetCodeVersion";
import { defaultHeadlessDeps, killTreeDefault, startHeadlessTurn, type ChildLike } from "./axetHeadless";
import { LEAD_TIMEOUT_MS, type LeadDeps, type LeadTurnResult } from "./boardLead";
import { VERIFY_TIMEOUT_MS, type VerifyChild, type VerifyDeps } from "./boardVerify";

export function boardsDir(): string {
  return path.join(app.getPath("userData"), "boards");
}

function isDirectory(dir: string): boolean {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

export function liveVerifyDeps(): VerifyDeps {
  return {
    // `shell: true`: kullanıcının kendi yazdığı komut satırı (spec §6), cmd.exe /d /s /c ile.
    spawn: (command, cwd) =>
      spawn(command, { cwd, shell: true, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }) as unknown as VerifyChild,
    killTree: (child) => killTreeDefault(child as unknown as ChildLike),
    dirExists: isDirectory,
    now: () => Date.now(),
    timeoutMs: VERIFY_TIMEOUT_MS,
    killGraceMs: 5_000
  };
}

function gitStatus(cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(
        "git",
        ["status", "--porcelain"],
        { cwd, timeout: 15_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
        (err, stdout) => resolve(err ? null : String(stdout ?? ""))
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Lider: başsız `axet-code run`, yeni oturum, bağlayıcılar kapalı, 3 dk
 * (spec §3). Sürüm denetimi her planlamada tazeleniyor: arada kullanıcı
 * axet-code'u onarmış ya da güncelleyici bozmuş olabilir.
 */
export function liveLeadDeps(): LeadDeps {
  return {
    binaryMessage: async () => axetBinaryMessage(await axetBinaryStatus(true)),
    startTurn: (cwd, prompt) => {
      const turn = startHeadlessTurn(
        {
          cwd,
          model: null,
          prompt,
          resumeId: null,
          useConnectors: false,
          onSessionId: () => {},
          onChunk: () => {},
          onActivity: () => {},
          onProgress: () => {}
        },
        { ...defaultHeadlessDeps(), hardCapMs: LEAD_TIMEOUT_MS }
      );
      const done = turn.done.then(
        (r): LeadTurnResult => ({
          ok: r.ok,
          text: r.text,
          ...(r.error ? { error: r.error } : {}),
          timedOut: r.timedOut,
          spawnFailed: r.spawnFailed
        }),
        (): LeadTurnResult => ({ ok: false, text: "", timedOut: false, spawnFailed: true })
      );
      return { done, cancel: turn.cancel };
    },
    gitStatus,
    now: () => Date.now()
  };
}
