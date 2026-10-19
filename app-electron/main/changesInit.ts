// Proje klasörü çipinin "Git deposu başlat"ı. Değişiklikler'in git katmanı
// (changesGit.ts) kullanıcının deposunu DEĞİŞTİREN komut çalıştırmıyor; `git
// init` bilerek ayrı dosyada ve yalnız kullanıcının açık düğmesiyle, yalnız
// kayıtlı kökte (yönetici denetliyor) çalışıyor. Çalıştırıcı ortak: execFile,
// kabuksuz, temiz ortam, süre sınırı.
import { runGitDefault, type GitRun } from "./changesGit";

export type InitOutcome = { ok: true } | { ok: false; reason: "noGit" | "timeout" | "git" };

export const GIT_INIT_TIMEOUT_MS = 15_000;

export function createGitInit(run: GitRun = runGitDefault): (cwd: string) => Promise<InitOutcome> {
  return async (cwd) => {
    try {
      const r = await run(["init"], { cwd, timeoutMs: GIT_INIT_TIMEOUT_MS });
      if (r.ok) return { ok: true };
      if (r.missing) return { ok: false, reason: "noGit" };
      if (r.timedOut) return { ok: false, reason: "timeout" };
      return { ok: false, reason: "git" };
    } catch {
      return { ok: false, reason: "git" };
    }
  };
}
