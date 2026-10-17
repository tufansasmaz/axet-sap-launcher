// Görev panosunun CANLI bağımlılıkları (spec 2026-10-18 gorev-panosu).
// İnce ve test edilmiyor: mantık boardVerify.ts, boardLead.ts ve
// boardStore.ts'te, orada enjekte sahtelerle test ediliyor. Bu dosya
// axetHeadless.ts'i (dolayısıyla better-sqlite3'ü) çekiyor; testler bunu
// İÇE AKTARMAMALI.
import { app } from "electron";
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import { killTreeDefault, type ChildLike } from "./axetHeadless";
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
