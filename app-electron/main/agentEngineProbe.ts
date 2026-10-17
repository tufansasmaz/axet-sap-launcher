// Ajan motorlarının kurulu olup olmadığı ve axet-code'un kendi ajan listesi
// (spec 2026-10-17 ajan-alani §3, §10, §14.2).
//
// Süreç çağrıları enjekte ediliyor: testte gerçek `where` ya da axet-code
// çalışmıyor. Hiçbir yol hata fırlatmıyor; sondaj patlarsa motor "kurulu
// değil" sayılıyor ve ajan listesi yerleşik beşe düşüyor.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { AGENT_ENGINES } from "../shared/agentEngines";
import { AGENT_ENGINE_IDS, type AgentEngineInfo, type AxetAgentEntry } from "../shared/agentTypes";
import { axetSpawnEnv } from "./axetSpawnEnv";
import type { AxetBinaryStatus } from "./axetCodeVersion";

export interface EngineProbeDeps {
  where(binary: string): Promise<boolean>;
  axetStatus(): Promise<AxetBinaryStatus>;
  axetMessage(status: AxetBinaryStatus): string | null;
}

export async function detectEngines(deps: EngineProbeDeps): Promise<AgentEngineInfo[]> {
  const out: AgentEngineInfo[] = [];
  for (const id of AGENT_ENGINE_IDS) {
    // Özel komut ajan başına farklı: başlatırken komutun ilk parçası aranıyor.
    if (id === "ozel") {
      out.push({ id, installed: true, blocked: false });
      continue;
    }
    if (id === "axet-code") {
      let status: AxetBinaryStatus;
      try {
        status = await deps.axetStatus();
      } catch {
        status = { kind: "missing" };
      }
      const note = deps.axetMessage(status);
      out.push({
        id,
        installed: status.kind !== "missing",
        blocked: status.kind === "missing" || status.kind === "broken",
        ...(note ? { note } : {})
      });
      continue;
    }
    let installed = false;
    try {
      installed = await deps.where(AGENT_ENGINES[id].binary ?? id);
    } catch {
      installed = false;
    }
    out.push({ id, installed, blocked: !installed });
  }
  return out;
}

const SAFE_BINARY = /^[\w.-]+$/;

/** Program PATH'te mi (`where`). Yol verilmişse dosyanın varlığı. */
export function whereOnPath(binary: string): Promise<boolean> {
  const name = binary.trim();
  if (!name) return Promise.resolve(false);
  if (/[\\/]/.test(name)) return Promise.resolve(existsSync(name));
  if (!SAFE_BINARY.test(name)) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      execFile("where", [name], { timeout: 5_000, windowsHide: true }, (error) => resolve(!error));
    } catch {
      resolve(false);
    }
  });
}

/** Liste okunamazsa gösterilen yerleşik ajanlar (spec §14.2). */
export const BUILTIN_AXET_AGENTS: AxetAgentEntry[] = ["coder", "task", "guide", "security", "agent-builder"].map((name) => ({
  name,
  scope: "builtin",
  permissions: "ask (default)",
  description: ""
}));

const AGENT_NAME = /^[A-Za-z0-9][\w.-]*$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseAxetAgentList(raw: string): AxetAgentEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: AxetAgentEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = text(record.name, 60);
    if (!AGENT_NAME.test(name) || seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      scope: text(record.scope, 40),
      permissions: text(record.permissions, 60),
      description: text(record.description, 200)
    });
  }
  return out;
}

export async function listAxetAgents(cwd: string, run: (args: string[]) => Promise<string | null>): Promise<AxetAgentEntry[]> {
  const args = cwd.trim() ? ["agent", "list", "--json", "-c", cwd] : ["agent", "list", "--json"];
  let raw: string | null = null;
  try {
    raw = await run(args);
  } catch {
    raw = null;
  }
  const list = raw ? parseAxetAgentList(raw) : [];
  return list.length > 0 ? list : BUILTIN_AXET_AGENTS;
}

/** axetAgents IPC önbelleği — 10 dk; hata ve boş liste alınmıyor (spec §14.2). */
export const AXET_AGENTS_CACHE_MS = 10 * 60_000;

type RunFn = (args: string[]) => Promise<string | null>;

/**
 * `listAxetAgents` çevresinde cwd başına önbellek. Aynı cwd için eşzamanlı
 * çağrılar `engineCache.get(cwd)` yokken birinin bitmesini bekleyip
 * önbellekten okuyamaz — mevcut engines kalıbı da bu kadar yapıyor.
 * Hata fırlarsa (listAxetAgents içten yakalar, dışarıya boş dönmez;
 * yine de guard var) ve boş liste dönerse önbelleğe alınmıyor.
 */
export function createAxetAgentsCache(
  listFn: (cwd: string, run: RunFn) => Promise<AxetAgentEntry[]> = listAxetAgents
): (cwd: string, run: RunFn) => Promise<AxetAgentEntry[]> {
  const cache = new Map<string, { at: number; value: AxetAgentEntry[] }>();
  return async (cwd: string, run: RunFn): Promise<AxetAgentEntry[]> => {
    const entry = cache.get(cwd);
    if (entry && Date.now() - entry.at < AXET_AGENTS_CACHE_MS) return entry.value;
    try {
      const value = await listFn(cwd, run);
      if (value.length > 0) cache.set(cwd, { at: Date.now(), value });
      return value;
    } catch {
      return [];
    }
  };
}

/** `axet-code <args>`; bağlayıcılar kapalı (liste okumak MCP gerektirmiyor). */
export function runAxetCode(args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(
        "axet-code.exe",
        args,
        { timeout: 15_000, windowsHide: true, env: axetSpawnEnv(false), maxBuffer: 1024 * 1024 },
        (error, stdout) => resolve(error ? null : String(stdout))
      );
    } catch {
      resolve(null);
    }
  });
}
