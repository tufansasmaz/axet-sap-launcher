// Başsız köprü: TEK bir sohbet turunu `axet-code run` ile çalıştırır
// (spec 2026-10-16 basiz-kopru). Görünmez terminal yok: istem stdin'den
// gidiyor, oturum kimliği `-v` satırından ya da `--resume`'dan geliyor,
// canlı metin ve araçlar axet-code'un veritabanından YALNIZCA bu oturum için
// okunuyor, sonuç stdout'taki JSON belgesinden alınıyor. Süreç tur bitince
// kapanıyor; ayakta bekleyen axet-code yok.
//
// Ölçümler (axet-code 1.4.1, 2026-10-16): `-v` ~3,3 sn'de "Created session
// for non-interactive run session_id=…" basıyor; izinler sorulmadan kabul
// ediliyor; `ask_user` "No interactive user…" dönüyor; süreç ağacını
// öldürmek oturumu bozmuyor; veritabanı tur sürerken parça parça yazılıyor.

import { spawn } from "node:child_process";
import type { AxetChatActivity, AxetChatProgress, AxetModelEntry } from "../shared/types";
import { noteUpdateLine } from "./axetCodeVersion";
import { axetSpawnEnv } from "./axetSpawnEnv";
import {
  finishAuthFailure,
  finishPoisonsHistory,
  finishPolicyBlock,
  readMessagesSince,
  resolveSessionDb,
  sessionTodos,
  sessionTokens,
  type AxetDbMessage
} from "./axetSessionDb";
import {
  ASK_USER_TOOL,
  buildDiff,
  normalizeToolName,
  parseAskUser,
  summarizeToolInput,
  summarizeToolResult,
  type AskUserRequest
} from "./axetToolEvents";
import { toolInputComplete } from "./toolCallInput";

export interface ChildLike {
  pid?: number;
  stdin: { write(data: string, enc: "utf-8"): unknown; end(): unknown; on(ev: "error", cb: () => void): unknown } | null;
  stdout: NodeJS.EventEmitter | null;
  stderr: NodeJS.EventEmitter | null;
  on(ev: "close", cb: (code: number | null) => void): unknown;
  on(ev: "error", cb: (err: Error & { code?: string }) => void): unknown;
}

export type HeadlessFailure = "auth" | "context" | "provider" | "blocked" | "poisoned";

export interface HeadlessTurnArgs {
  cwd: string;
  model: AxetModelEntry | null;
  prompt: string;
  resumeId: string | null;
  useConnectors: boolean;
  onSessionId(id: string): void;
  onChunk(text: string): void;
  onActivity(activity: AxetChatActivity): void;
  onProgress(progress: AxetChatProgress): void;
}

export interface HeadlessTurnResult {
  ok: boolean;
  text: string;
  error?: string;
  sessionId: string | null;
  cancelled: boolean;
  timedOut: boolean;
  spawnFailed: boolean;
  toolCount: number;
  ask: AskUserRequest | null;
  failure: HeadlessFailure | null;
}

export interface HeadlessDeps {
  spawn(cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }): ChildLike;
  env(useConnectors: boolean): NodeJS.ProcessEnv;
  dbPath(cwd: string): string | null;
  readMessages(dbPath: string, sessionId: string, sinceSec: number): AxetDbMessage[];
  readProgress(dbPath: string, sessionId: string): AxetChatProgress;
  killTree(child: ChildLike): void;
  now(): number;
  pollMs: number;
  progressMs: number;
  silenceMs: number;
  hardCapMs: number;
}

export interface HeadlessTurn {
  done: Promise<HeadlessTurnResult>;
  cancel(): void;
}

const CONTEXT_LIMIT_TOKENS = 1_000_000;
const RE_CREATED = /Created session for non-interactive run session_id=([0-9a-f-]{36})/i;

export function buildRunArgs(args: Pick<HeadlessTurnArgs, "cwd" | "model" | "resumeId">): string[] {
  const out = ["run", "-v", "-q", "--output-format", "json"];
  if (args.resumeId) out.push("--resume", args.resumeId);
  out.push("-c", args.cwd);
  if (args.model) out.push("-m", `${args.model.provider}/${args.model.model}`);
  return out;
}

// stderr'deki `-v` satırları düz metin ("ERROR … 403 Forbidden"). Bağlayıcı
// uyarıları (connector.sync) yetki arızası SAYILMIYOR: bugün her açılışta
// düşüyorlar ve turu öldürmemeliler (analiz 2026-10-16, bulgu 10).
const RE_IGNORED = /connector\.sync|MCP client/i;
const RE_AUTH = /\b(401|403)\b|unauthori[sz]ed|forbidden|invalid[_ ]?token|token (has )?expired/i;
const RE_CONTEXT = /context (length|window)|too many tokens|prompt is too long|maximum context/i;
const RE_PROVIDER = /\b(429|5\d\d)\b|overloaded|rate.?limit|service unavailable/i;

export function classifyStderr(lines: string[]): HeadlessFailure | null {
  for (const line of lines) {
    if (!/^\s*(\S+\s+\S+\s+)?(ERROR|WARN)\b/.test(line) && !/\b(ERROR|WARN)\b/.test(line)) continue;
    if (RE_IGNORED.test(line)) continue;
    if (RE_CONTEXT.test(line)) return "context";
    if (RE_AUTH.test(line)) return "auth";
    if (RE_PROVIDER.test(line)) return "provider";
  }
  return null;
}

/** Kullanıcıya gösterilecek stderr: INFO/DEBUG gürültüsü atılmış, kısaltılmış. */
export function cleanStderr(stderr: string): string {
  return stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^(\S+\s+\S+\s+)?(INFO|DEBU|DEBUG)\b/.test(l))
    .join("\n")
    .slice(0, 1500)
    .trim();
}

function classifyText(text: string): HeadlessFailure | null {
  if (RE_CONTEXT.test(text)) return "context";
  if (RE_AUTH.test(text)) return "auth";
  if (RE_PROVIDER.test(text)) return "provider";
  return null;
}

function killTreeDefault(child: ChildLike): void {
  const pid = child.pid;
  // `kill()` Windows'ta yalnız o süreci öldürüyor; axet-code'un MCP torunları
  // hayatta kalıyordu. `taskkill /T` ağacın tamamını alıyor.
  if (pid && process.platform === "win32") {
    try {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      return;
    } catch {
      // aşağıdaki kill'e düş
    }
  }
  try {
    (child as unknown as { kill(): void }).kill();
  } catch {
    // zaten kapanmış
  }
}

export function defaultHeadlessDeps(): HeadlessDeps {
  return {
    spawn: (cmd, args, opts) =>
      spawn(cmd, args, { cwd: opts.cwd, env: opts.env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }) as unknown as ChildLike,
    env: (useConnectors) => axetSpawnEnv(useConnectors),
    dbPath: (cwd) => resolveSessionDb(cwd),
    readMessages: (dbPath, sessionId, sinceSec) => readMessagesSince(dbPath, sessionId, sinceSec),
    readProgress: (dbPath, sessionId) => ({
      todos: sessionTodos(dbPath, sessionId),
      contextTokens: sessionTokens(dbPath, sessionId),
      contextLimit: CONTEXT_LIMIT_TOKENS
    }),
    killTree: killTreeDefault,
    now: () => Date.now(),
    pollMs: 150,
    progressMs: 1_000,
    silenceMs: 5 * 60_000,
    hardCapMs: 6 * 60 * 60_000
  };
}

export function startHeadlessTurn(args: HeadlessTurnArgs, deps: HeadlessDeps = defaultHeadlessDeps()): HeadlessTurn {
  const startedAt = deps.now();
  // Saat kayması payı: axet-code'un yazdığı `created_at` saniye çözünürlüklü.
  const sinceSec = Math.floor(startedAt / 1000) - 2;
  const dbPath = deps.dbPath(args.cwd);

  let sessionId: string | null = args.resumeId;
  // Devam turunda oturumun ESKİ mesajları bu tura ait değil.
  const preexisting = new Set<string>(
    args.resumeId && dbPath ? deps.readMessages(dbPath, args.resumeId, 0).map((m) => m.id) : []
  );

  const emitted = new Map<string, number>();
  const seenTools = new Set<string>();
  const pendingInputs = new Set<string>();
  const seenResults = new Set<string>();
  let answer = "";
  let toolCount = 0;
  let ask: AskUserRequest | null = null;
  let askKilled = false;
  let cancelled = false;
  let timedOut = false;
  let spawnFailed = false;
  let spawnError = "";
  let stdout = "";
  let stderr = "";
  let stderrTail = "";
  const stderrLines: string[] = [];
  let lastSignalAt = startedAt;
  let lastStalledAt = startedAt;
  let lastProgressAt = 0;
  let lastProgressKey = "";
  let lastFinish: AxetDbMessage["parts"][number] | undefined;
  let finished = false;

  const child = deps.spawn("axet-code", buildRunArgs(args), { cwd: args.cwd, env: deps.env(args.useConnectors) });

  const signal = () => {
    lastSignalAt = deps.now();
    lastStalledAt = lastSignalAt;
  };

  const kill = () => {
    try {
      deps.killTree(child);
    } catch {
      // zaten kapanmış olabilir
    }
  };

  function poll(): void {
    if (!sessionId || !dbPath) return;
    const messages = deps.readMessages(dbPath, sessionId, sinceSec).filter((m) => !preexisting.has(m.id));
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      const body = message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.data?.text ?? "")
        .join("");
      const already = emitted.get(message.id) ?? 0;
      if (body.length > already) {
        // Ardışık asistan mesajları (araç zincirinde her adım ayrı mesaj)
        // yapışmasın: "…ediyorum.Dosyada…" (analiz bulgu 6).
        const gap = already === 0 && answer ? "\n\n" : "";
        const piece = gap + body.slice(already);
        args.onChunk(piece);
        answer += piece;
        emitted.set(message.id, body.length);
        signal();
      }
      const fin = message.parts.find((p) => p.type === "finish");
      if (fin) lastFinish = fin;
      for (const part of message.parts) {
        if (part.type !== "tool_call") continue;
        const name = normalizeToolName(part.data?.name ?? "");
        const callId = part.data?.id ?? `${message.id}:${name}`;
        if (!name) continue;
        if (name === ASK_USER_TOOL) {
          if (ask || part.data?.finished !== true) continue;
          ask = parseAskUser(callId, part.data?.input);
          seenTools.add(callId);
          continue;
        }
        if (seenTools.has(callId)) {
          if (pendingInputs.has(callId) && toolInputComplete(part.data?.input, part.data?.finished)) {
            pendingInputs.delete(callId);
            const diff = buildDiff(name, part.data?.input);
            const target = summarizeToolInput(part.data?.input);
            if (target || diff) args.onActivity({ phase: "tool", callId, tool: name, target, ...(diff ? { diff } : {}) } as AxetChatActivity);
          }
          continue;
        }
        seenTools.add(callId);
        if (!toolInputComplete(part.data?.input, part.data?.finished)) pendingInputs.add(callId);
        toolCount += 1;
        signal();
        const diff = buildDiff(name, part.data?.input);
        args.onActivity({
          phase: "tool",
          callId,
          tool: name,
          target: pendingInputs.has(callId) ? "" : summarizeToolInput(part.data?.input),
          ...(diff ? { diff } : {})
        } as AxetChatActivity);
      }
    }
    for (const message of messages) {
      if (message.role !== "tool") continue;
      for (const part of message.parts) {
        if (part.type !== "tool_result") continue;
        const callId = part.data?.tool_call_id ?? "";
        if (!callId || !seenTools.has(callId) || seenResults.has(callId)) continue;
        seenResults.add(callId);
        if (ask && callId === ask.callId) {
          // Soru aracının sonucu ("No interactive user…") düştü: ajan şimdi
          // KENDİ seçmek üzere. Süreç burada öldürülüyor; sonuç yazılmadan
          // öldürmek oturumda sonuçsuz bir çağrı bırakırdı (400, bkz. 32d4952).
          if (!askKilled) {
            askKilled = true;
            kill();
          }
          continue;
        }
        signal();
        args.onActivity({ phase: "toolResult", callId, ...summarizeToolResult(part.data?.content, part.data?.is_error) } as AxetChatActivity);
      }
    }
    const now = deps.now();
    if (now - lastProgressAt >= deps.progressMs) {
      lastProgressAt = now;
      const progress = deps.readProgress(dbPath, sessionId);
      const key = JSON.stringify(progress);
      if (key !== lastProgressKey) {
        lastProgressKey = key;
        args.onProgress(progress);
      }
    }
  }

  const timer = setInterval(() => {
    if (finished) return;
    poll();
    const now = deps.now();
    if (now - startedAt >= deps.hardCapMs) {
      timedOut = true;
      kill();
      return;
    }
    if (now - lastStalledAt >= deps.silenceMs) {
      lastStalledAt = now;
      args.onActivity({ phase: "stalled", minutes: Math.max(1, Math.round((now - lastSignalAt) / 60_000)) } as AxetChatActivity);
    }
  }, deps.pollMs);

  child.stdin?.on("error", () => {});
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf-8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8");
    stderr += text;
    const parts = (stderrTail + text).split(/\r?\n/);
    stderrTail = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.trim()) continue;
      stderrLines.push(line);
      signal();
      noteUpdateLine(line);
      const m = RE_CREATED.exec(line);
      if (m && !sessionId) {
        sessionId = m[1];
        args.onSessionId(sessionId);
      }
    }
  });

  const done = new Promise<HeadlessTurnResult>((resolve) => {
    const finish = (code: number | null) => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      if (stderrTail.trim()) stderrLines.push(stderrTail);
      // Son okuma: süreç kapanırken yazılan metin kaçmasın.
      try {
        poll();
      } catch {
        // okuma hatası sonucu bozmamalı
      }
      const base = { sessionId, cancelled, timedOut, spawnFailed, toolCount, ask: null as AskUserRequest | null };
      if (spawnFailed) {
        resolve({ ...base, ok: false, text: "", error: spawnError, failure: null });
        return;
      }
      if (cancelled) {
        resolve({ ...base, ok: false, text: answer, failure: null });
        return;
      }
      if (askKilled && ask) {
        resolve({ ...base, ok: true, text: answer, ask, failure: null });
        return;
      }
      const jsonLine = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("{"))
        .pop();
      let doc: { session_id?: string; result?: unknown; is_error?: boolean } | null = null;
      try {
        doc = jsonLine ? JSON.parse(jsonLine) : null;
      } catch {
        doc = null;
      }
      if (doc?.session_id && !sessionId) sessionId = doc.session_id;
      const resultText = typeof doc?.result === "string" ? doc.result : "";
      if (doc && doc.is_error !== true && !timedOut) {
        resolve({ ...base, sessionId, ok: true, text: answer || resultText, failure: null });
        return;
      }
      // Hata: sınıf ve metin. Önce veritabanının `finish` hatası (sağlayıcının
      // kendi cümlesi), sonra JSON'un metni, en son stderr.
      let failure: HeadlessFailure | null = null;
      if (finishPolicyBlock(lastFinish)) failure = "blocked";
      else if (finishAuthFailure(lastFinish)) failure = "auth";
      else if (finishPoisonsHistory(lastFinish)) failure = "poisoned";
      const finishMsg = lastFinish?.data?.reason === "error" ? String(lastFinish.data?.message ?? "") : "";
      const errorText =
        finishMsg ||
        (doc?.is_error ? resultText : "") ||
        cleanStderr(stderr) ||
        `axet-code çıkış kodu ${code ?? "?"}`;
      failure = failure ?? classifyText(errorText) ?? classifyStderr(stderrLines);
      resolve({ ...base, sessionId, ok: false, text: answer, error: errorText, failure });
    };
    child.on("close", (code) => finish(code));
    child.on("error", (err) => {
      spawnFailed = true;
      spawnError = err.message;
      finish(null);
    });
  });

  try {
    child.stdin?.write(args.prompt, "utf-8");
    child.stdin?.end();
  } catch {
    // süreç hemen öldüyse 'close'/'error' yolu sonucu veriyor
  }

  return {
    done,
    cancel: () => {
      if (finished || cancelled) return;
      cancelled = true;
      kill();
    }
  };
}
