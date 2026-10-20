// Claude Code kurulumu ve kurumsal başlatıcısı (Tur 10, madde 6).
//
// Ölçüm (bu makine, değerler YAZILMADAN): kullanıcı Claude'u PATH'teki kendi
// başlatıcısıyla açıyor (`azure.bat`: CLAUDE_CODE_USE_FOUNDRY ve ANTHROPIC_FOUNDRY_*
// ortamını kurup %APPDATA%\npm\claude.cmd'yi çağırıyor). Sağlayıcı ayarı ne sistem
// ortamında ne ~/.claude/settings.json env'de var; uygulamanın `claude` komutu bu
// ortamı almadığı için Claude giriş istiyordu. Başlatıcı bulunursa Claude ajanı onunla
// açılır. Betik yalnız OKUNUR (değişmez); içeriği hiçbir yere yazılmaz, yalnız
// sağlayıcı türü ve dosya adı döner.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export type ClaudeProvider = "foundry" | "bedrock" | "vertex";

export interface ClaudeLauncher {
  /** Komut adı (uzantısız), ör. "azure". */
  name: string;
  path: string;
  provider: ClaudeProvider;
}

const PROVIDER = /\bCLAUDE_CODE_USE_(FOUNDRY|BEDROCK|VERTEX)\s*=\s*1\b/i;
// "claude" kelimesi tek başına (claude, claude.cmd, claude.exe); CLAUDE_CODE_*/CLAUDE_CMD değil.
const CALLS_CLAUDE = /(?:^|[\s"'\\/])claude(?:\.cmd|\.exe|\.ps1)?(?=["'\s]|$)|%CLAUDE_CMD%|\bclaude-code\b/im;
const SCRIPT_MAX = 16 * 1024;
const SAFE_NAME = /^[A-Za-z0-9][\w.-]*$/;

/** Betik bir Claude başlatıcısı mı: sağlayıcı ortamını kuruyor ve claude'u çağırıyor. */
export function isClaudeLauncherScript(text: string): ClaudeProvider | null {
  const m = PROVIDER.exec(text);
  if (!m || !CALLS_CLAUDE.test(text)) return null;
  return m[1].toLowerCase() as ClaudeProvider;
}

export interface LauncherScanPort {
  list(dir: string): { path: string; size: number }[] | null;
  read(file: string): string | null;
}

/** PATH klasörlerindeki .bat/.cmd betiklerinden TEK başlatıcı; yoksa ya da birden çoksa null. */
export function findClaudeLauncher(dirs: readonly string[], port: LauncherScanPort): ClaudeLauncher | null {
  const found: ClaudeLauncher[] = [];
  const seen = new Set<string>();
  for (const dir of dirs) {
    const key = dir.trim().replace(/[\\/]+$/, "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let entries: { path: string; size: number }[] | null = null;
    try {
      entries = port.list(dir);
    } catch {
      entries = null;
    }
    for (const entry of entries ?? []) {
      if (!/\.(bat|cmd)$/i.test(entry.path) || entry.size > SCRIPT_MAX) continue;
      const name = path.win32.basename(entry.path).replace(/\.(bat|cmd)$/i, "");
      if (!SAFE_NAME.test(name) || /^claude$/i.test(name)) continue;
      let text: string | null = null;
      try {
        text = port.read(entry.path);
      } catch {
        text = null;
      }
      const provider = text ? isClaudeLauncherScript(text) : null;
      if (provider) found.push({ name, path: entry.path, provider });
    }
  }
  return found.length === 1 ? found[0] : null;
}

const PROVIDER_KEYS = ["CLAUDE_CODE_USE_FOUNDRY", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_FOUNDRY_API_KEY"];

/** Sağlayıcı/kimlik ayarı ortamda ya da settings.json env'de var mı (YALNIZ adlara bakılır). */
export function claudeProviderConfigured(env: Record<string, string | undefined>, settings: unknown): boolean {
  const has = (record: Record<string, unknown> | undefined) => PROVIDER_KEYS.some((k) => typeof record?.[k] === "string" && String(record[k]).trim() !== "");
  const settingsEnv = settings && typeof settings === "object" ? ((settings as { env?: unknown }).env as Record<string, unknown> | undefined) : undefined;
  return has(env) || has(settingsEnv && typeof settingsEnv === "object" ? settingsEnv : undefined);
}

/** Gerçek tarama: PATH klasörleri + settings.json (salt okuma). */
export function detectClaudeLauncher(env: Record<string, string | undefined> = process.env): ClaudeLauncher | null {
  try {
    const home = env.USERPROFILE ?? "";
    const configDir = env.CLAUDE_CONFIG_DIR?.trim() || (home ? path.win32.join(home, ".claude") : "");
    let settings: unknown = null;
    try {
      settings = configDir ? JSON.parse(readFileSync(path.win32.join(configDir, "settings.json"), "utf8")) : null;
    } catch {
      settings = null;
    }
    if (claudeProviderConfigured(env, settings)) return null;
    const key = Object.keys(env).find((k) => k.toLowerCase() === "path") ?? "Path";
    const dirs = (env[key] ?? "").split(";").filter((d) => d.trim() && !/\\Windows\\|\\System32/i.test(d));
    return findClaudeLauncher(dirs, {
      list: (dir) => readdirSync(dir).map((name) => {
        const file = path.win32.join(dir, name);
        try {
          return { path: file, size: statSync(file).size };
        } catch {
          return { path: file, size: Number.MAX_SAFE_INTEGER };
        }
      }),
      read: (file) => readFileSync(file, "utf8")
    });
  } catch {
    return null;
  }
}
