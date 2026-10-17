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
  /**
   * Önceden açılmış süreç (axetPrewarm.ts): verilirse `deps.spawn` çağrılmıyor.
   * Argümanları ve ortamı bu turunkilerle aynı olmalı; havuz anahtarı bunu
   * garanti ediyor. İlk `-v` satırları havuzun tamponundan normal yoldan geliyor.
   */
  prewarmed?: ChildLike | null;
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
  /**
   * Oturum kimliği belli ama veritabanı tur boyunca hiç bulunamadı: `toolCount`
   * 0 görünse de araç çalışmış olabilir. Çağıran bunu "araç çalıştı" sayar
   * (otomatik yeniden gönderme yok).
   */
  toolsUnknown?: boolean;
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
// HTTP durum kodu YALNIZ HTTP bağlamında sayılıyor: "status 403", "status
// code: 401", "HTTP/1.1 502", "…/messages: 529 {…}", `"code":403}`,
// "403 Forbidden". Çıplak
// sayı ("line 403", "took 503 ms") başka bir şey olabilir; turu yanlış
// sınıflamak boşuna bir bekleme ya da yeniden deneme demek.
const RE_AUTH =
  /\b(?:status(?:[ _]?code)?|http(?:\/[\d.]+)?)\s*[:=]?\s*(?:401|403)\b|:\s*(?:401|403)(?=[\s"'{}()[\],.;]|$)|unauthori[sz]ed|forbidden|invalid[_ ]?token|token (has )?expired/i;
const RE_CONTEXT = /context (length|window)|too many tokens|prompt is too long|maximum context/i;
const RE_PROVIDER =
  /\b(?:status(?:[ _]?code)?|http(?:\/[\d.]+)?)\s*[:=]?\s*(?:429|5\d\d)\b|:\s*(?:429|5\d\d)(?=[\s"'{}()[\],.;]|$)|\b(?:429|5\d\d)\s+(?:too many requests|internal server error|bad gateway|service unavailable|gateway time-?out)|overloaded|rate.?limit|service unavailable/i;

export function classifyStderr(lines: string[]): HeadlessFailure | null {
  for (const line of lines) {
    if (!/\b(ERROR|WARN)\b/.test(line)) continue;
    if (RE_IGNORED.test(line)) continue;
    if (RE_CONTEXT.test(line)) return "context";
    if (RE_AUTH.test(line)) return "auth";
    if (RE_PROVIDER.test(line)) return "provider";
  }
  return null;
}

const SHOWN_ERROR_MAX = 1500;

/**
 * Kullanıcıya gösterilecek stderr: INFO/DEBUG ve bağlayıcı uyarısı gürültüsü
 * atılmış, kısaltılmış. SONU tutuluyor: asıl hata en son basılıyor.
 */
export function cleanStderr(stderr: string): string {
  return stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^(\S+\s+\S+\s+)?(INFO|DEBU|DEBUG)\b/.test(l) && !RE_IGNORED.test(l))
    .join("\n")
    .slice(-SHOWN_ERROR_MAX)
    .trim();
}

/**
 * stdout'un JSON olmayan satırları. axet-code ölümcül bir mesajı (ör. zorunlu
 * güncelleme) stdout'a basabilir; eski run yolu stdout + stderr'de arıyordu.
 */
function plainStdout(stdout: string): string {
  return stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("{"))
    .join("\n")
    .slice(-SHOWN_ERROR_MAX)
    .trim();
}

function classifyText(text: string): HeadlessFailure | null {
  if (RE_CONTEXT.test(text)) return "context";
  if (RE_AUTH.test(text)) return "auth";
  if (RE_PROVIDER.test(text)) return "provider";
  return null;
}

export function killTreeDefault(child: ChildLike): void {
  const pid = child.pid;
  // `kill()` Windows'ta yalnız o süreci öldürüyor; axet-code'un MCP torunları
  // hayatta kalıyordu. `taskkill /T` ağacın tamamını alıyor.
  if (pid && process.platform === "win32") {
    try {
      // İşlenmemiş 'error' olayı Electron ana sürecini çökertir; dinleyici ekliyoruz.
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }).on("error", () => {});
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
  // Yeni bir klasördeki ilk turda `.axet-code` henüz yok: axet-code açılınca
  // kuruluyor. Bulunana kadar her yoklamada yeniden aranıyor (`dbFor`);
  // bulunmazsa metin akışı, `ask_user` ağı ve araç sayımı kör kalırdı.
  //
  // Veritabanı okumaları ATMAMALI: zamanlayıcıdan ya da akış olayından kaçan
  // bir istisna Electron ana sürecinde yakalanmamış hata olur. Okunamayan
  // yoklama atlanıyor (bir sonraki yeniden deniyor). Bir okuma tur içinde
  // BİR KEZ bile başarısız olduysa araç sayısı tur sonuna kadar güvenilmez
  // sayılıyor (`toolsUnknown`): sonraki başarılı okuma bu işareti silmiyor.
  let dbReadFailed = false;
  const findDb = (): string | null => {
    try {
      return deps.dbPath(args.cwd);
    } catch {
      return null;
    }
  };
  const readSafe = (db: string, sid: string, since: number): AxetDbMessage[] | null => {
    try {
      return deps.readMessages(db, sid, since);
    } catch {
      dbReadFailed = true;
      return null;
    }
  };
  let dbPath = findDb();

  let sessionId: string | null = args.resumeId;
  // Devam turunda oturumun ESKİ mesajları bu tura ait değil. Okunamadıkça
  // bu turun mesajları da okunmuyor: yoksa eski cevaplar yeni gibi akardı.
  const preexisting = new Set<string>();
  let preexistingPending = !!args.resumeId;
  const loadPreexisting = (db: string, early: boolean): void => {
    if (!preexistingPending || !args.resumeId) return;
    const old = readSafe(db, args.resumeId, 0);
    if (!old) return;
    preexistingPending = false;
    // İlk anda her şey eski; geç bulunduysa tur başından öncekiler zamanla ayrılıyor.
    // Geç yolda kesim saniye çözünürlüklü (−2 sn payıyla): tur başına çok yakın eski bir mesaj yeni sayılabilir; bilinen ve kabul edilen sınır.
    for (const m of old) if (early || m.createdAt < sinceSec) preexisting.add(m.id);
  };
  if (dbPath) loadPreexisting(dbPath, true);

  const dbFor = (): string | null => {
    if (!dbPath) dbPath = findDb();
    if (dbPath) loadPreexisting(dbPath, false);
    return dbPath;
  };

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

  const child =
    args.prewarmed ?? deps.spawn("axet-code", buildRunArgs(args), { cwd: args.cwd, env: deps.env(args.useConnectors) });

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
    if (!sessionId) return;
    const db = dbFor();
    if (!db || preexistingPending) return;
    const read = readSafe(db, sessionId, sinceSec);
    if (!read) return;
    const messages = read.filter((m) => !preexisting.has(m.id));
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
          if (ask || seenTools.has(callId) || part.data?.finished !== true) continue;
          // Bir kez ayrıştırılıyor; sonuç ne olursa olsun çağrı işlenmiş sayılıyor.
          seenTools.add(callId);
          ask = parseAskUser(callId, part.data?.input);
          if (!ask) {
            // Girdi ayrıştırılamadı: soru kartı çıkamaz, ajan kendi seçecek.
            // Sıradan bir araç satırı olarak gösteriliyor; yoksa sonucu satırsız
            // (yetim) bir `toolResult` olurdu. Sayılmıyor: dışarıda iz bırakmıyor.
            signal();
            args.onActivity({ phase: "tool", callId, tool: name, target: "" });
          }
          continue;
        }
        if (seenTools.has(callId)) {
          if (pendingInputs.has(callId) && toolInputComplete(part.data?.input, part.data?.finished)) {
            pendingInputs.delete(callId);
            const diff = buildDiff(name, part.data?.input);
            const target = summarizeToolInput(part.data?.input);
            if (target || diff) args.onActivity({ phase: "tool", callId, tool: name, target, ...(diff ? { diff } : {}) });
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
        });
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
        args.onActivity({ phase: "toolResult", callId, ...summarizeToolResult(part.data?.content, part.data?.is_error) });
      }
    }
    const now = deps.now();
    if (now - lastProgressAt >= deps.progressMs) {
      lastProgressAt = now;
      let progress: AxetChatProgress;
      try {
        progress = deps.readProgress(db, sessionId);
      } catch {
        return; // yapılacaklar/jeton göstergesi bir sonraki sefere
      }
      const key = JSON.stringify(progress);
      if (key !== lastProgressKey) {
        lastProgressKey = key;
        args.onProgress(progress);
      }
    }
  }

  const timer = setInterval(() => {
    if (finished) return;
    try {
      poll();
    } catch {
      // Beklenmedik bir yoklama hatası bu turu bırakır, zamanlayıcıyı değil;
      // sayım bu yüzden güvenilmez.
      dbReadFailed = true;
    }
    const now = deps.now();
    if (!timedOut && now - startedAt >= deps.hardCapMs) {
      timedOut = true;
      kill();
      return;
    }
    if (now - lastStalledAt >= deps.silenceMs) {
      lastStalledAt = now;
      args.onActivity({ phase: "stalled", minutes: Math.max(1, Math.round((now - lastSignalAt) / 60_000)) });
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
      const m = RE_CREATED.exec(line);
      const fresh = m && !sessionId ? m[1] : null;
      if (fresh) sessionId = fresh;
      // Akış olayından kaçan bir istisna (config/bağ dosyası yazılamadı) ana
      // süreçte yakalanmamış hata olurdu.
      try {
        noteUpdateLine(line);
        if (fresh) {
          args.onSessionId(fresh);
          // "Başlatılıyor" göstergesi aşılıyor: oturum kimliği gelir gelmez
          // ajan düşünüyor sayılıyor. Ön ısıtmada tampondan gelen satır da
          // bu yoldan geçiyor (startHeadlessTurn dinleyiciyi bağladıktan
          // sonra buffer boşaltılıyor; sıra garantilidir).
          args.onActivity({ phase: "thinking" });
        }
      } catch {
        // bağ bir sonraki fırsatta (tur sonunda) yeniden yazılıyor
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
        dbReadFailed = true;
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
      if (doc?.session_id && !sessionId) {
        // Kimlik yalnız JSON'da geldi (`-v` satırı kaçtı): bağlamaya yazılıyor
        // ve bu turun mesajları şimdi okunuyor — yoksa araçlar sayılmazdı.
        sessionId = doc.session_id;
        try {
          args.onSessionId(sessionId);
          poll();
        } catch {
          // okuma hatası sonucu bozmamalı
          dbReadFailed = true;
        }
      }
      // Araç sayısı güvenilmez: veritabanı hiç bulunamadı, tur içinde bir
      // okuma başarısız oldu, ya da süreç ne `-v` satırını ne JSON'u ne de
      // herhangi bir hata metni bırakıp düştü (sessiz çöküş, biçim değişikliği).
      // Oturum yok ama süreç düz bir hata bastıysa (zorunlu güncelleme, açılış/
      // ayar hatası) oturum hiç kurulmadı: araç da çalışmadı, temiz hata gösterilsin.
      const saidSomething = !!plainStdout(stdout) || !!cleanStderr(stderr);
      const toolsUnknown =
        (sessionId !== null && !dbPath) ||
        dbReadFailed ||
        (sessionId === null && !doc && !spawnFailed && !saidSomething);
      const base = {
        sessionId,
        cancelled,
        timedOut,
        spawnFailed,
        toolCount,
        ask: null as AskUserRequest | null,
        ...(toolsUnknown ? { toolsUnknown: true } : {})
      };
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
      const resultText = typeof doc?.result === "string" ? doc.result : "";
      if (doc && doc.is_error !== true && !timedOut) {
        resolve({ ...base, ok: true, text: answer || resultText, failure: null });
        return;
      }
      // Hata: sınıf ve metin. Önce veritabanının `finish` hatası (sağlayıcının
      // kendi cümlesi), sonra JSON'un metni, en son stderr.
      let failure: HeadlessFailure | null = null;
      if (finishPolicyBlock(lastFinish)) failure = "blocked";
      else if (finishAuthFailure(lastFinish)) failure = "auth";
      else if (finishPoisonsHistory(lastFinish)) failure = "poisoned";
      const finishMsg = lastFinish?.data?.reason === "error" ? String(lastFinish.data?.message ?? "") : "";
      const primary = finishMsg || (doc?.is_error ? resultText : "");
      const plainOut = plainStdout(stdout);
      const errorText =
        primary ||
        [plainOut, cleanStderr(stderr)].filter(Boolean).join("\n") ||
        `axet-code çıkış kodu ${code ?? "?"}`;
      // Sağlayıcının kendi cümlesi yoksa stderr YALNIZ satır satır
      // sınıflanıyor: bağlayıcı uyarısındaki "unauthorized" turu yetki
      // arızası yapmamalı (15 sn bekleme + yanlış "kalıcı 403").
      failure =
        failure ??
        (primary ? classifyText(primary) : null) ??
        classifyStderr(stderrLines) ??
        (plainOut ? classifyText(plainOut) : null);
      resolve({ ...base, ok: false, text: answer, error: errorText, failure });
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
    // Devam turunda (`--resume`) "Created session" satırı GELMIYOR: oturum
    // zaten açık. Kimlik zaten biliniyor → en erken güvenilir sinyal
    // stdin'e yazılması; hemen "thinking" yayımlıyoruz.
    if (args.resumeId) args.onActivity({ phase: "thinking" });
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
