// Flow sandbox'ın ana süreç tarafı — Electron'dan bağımsız, saf mantık.
//
// axet.flows function node kodu eskiden ana süreçte `node:vm` ile koşuyordu.
// vm bir güvenlik sınırı değil: `msg.constructor.constructor('return
// process')()` tek satırda tam Node yetkisi veriyordu (dosya sistemi, alt
// süreç, kullanıcının SAP oturum bilgileri). Kod artık Chromium sandbox'lı,
// Node'suz gizli bir pencerede koşuyor (flowSandbox.ts pencereyi kuruyor);
// bu sınıf o pencereyle konuşan tarafı tutuyor: istek kuyruğu, zaman aşımı,
// sayfa ölünce yeniden kurma ve sayfadan gelen HER girdinin doğrulanması.
//
// Pencere burada bir arayüz (`SandboxPage`) — Electron'u açmadan testte
// sahte bir sayfayla sınanabilsin diye (tests/flowSandboxHost.test.ts).
//
// Sayfa güvenilmez kabul ediliyor: içinde kullanıcı kodu koşuyor ve o kod
// sayfanın köprüsünü kendi amacına göre çağırabilir. O yüzden gelen hiçbir
// değer "sayfa zaten doğru gönderir" varsayımıyla kullanılmıyor.

import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fromWire, toWire, type BufferLike } from "../../src/flowSandbox/wire";

export const FUNCTION_TIMEOUT_MS = 10_000;
// xlsx işleri kullanıcı kodu değil, ama büyük bir çalışma kitabı saniyeler
// sürebilir; function node'un 10 sn'si burada gereksiz yere dosya reddederdi.
export const XLSX_TIMEOUT_MS = 60_000;

// ASCII: bu metin debug paneline ve flowDiagnostics'in kalıplarına gidiyor,
// diğer runtime iletileriyle aynı yazımda kalsın.
export const FUNCTION_TIMEOUT_MESSAGE =
  "Function node zaman asimina ugradi (10s) - sonsuz dongu ya da hic cozulmeyen bir Promise/await olabilir.";
export const SANDBOX_RESTART_MESSAGE = "Flow sandbox yeniden baslatildi; bu calisma yarida kaldi.";

const MAX_RUN_ID = 100;
const MAX_LOG_TEXT = 10_000;
const MAX_KEY = 1024;
const MAX_ERROR_TEXT = 20_000;
const MAX_SENDS = 10_000;
const MAX_TOKENS = 5_000;
const LOG_LEVELS = new Set(["info", "warn", "error"]);
const SCOPES = new Set(["node", "flow", "global"]);
// Bağlam depoları düz nesne; bu adlar yazılırsa depo nesnesinin kendisini ya
// da prototipini bozabilirdi.
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const NodeBuffer = Buffer as unknown as BufferLike;

type Store = Record<string, unknown>;

export interface ContextStores {
  node: Store;
  flow: Store;
  global: Store;
}

export type LogLevel = "info" | "warn" | "error";

export interface RunFunctionOptions {
  code: string;
  msg: unknown;
  node: { id: string; name: string };
  env: Record<string, unknown>;
  stores: ContextStores;
  log: (level: LogLevel, text: string) => void;
}

export interface XlsxReadOptions {
  offset?: unknown;
  header?: unknown;
}

export interface XlsxWriteOptions {
  data: unknown;
  config: unknown;
  blank: boolean;
  templateBuffer: unknown;
}

export interface ContextReply {
  ok: boolean;
  value?: unknown;
  error?: string;
}

// Sayfadan gelen olaylar. Argümanlar bilerek `unknown`: IPC'den ne gelirse
// gelsin buradan geçiyor ve burada doğrulanıyor.
export interface SandboxPageHandlers {
  ready(): void;
  done(reply: unknown): void;
  log(token: unknown, level: unknown, text: unknown): void;
  context(op: unknown, token: unknown, scope: unknown, key: unknown, value: unknown): ContextReply;
  gone(reason: string): void;
}

export interface SandboxPage {
  send(request: unknown): void;
  destroy(): void;
}

export type SandboxPageFactory = (handlers: SandboxPageHandlers) => SandboxPage;

type Kind = "function" | "xlsxRead" | "xlsxWrite";

interface Pending {
  kind: Kind;
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface TokenEntry {
  stores: ContextStores;
  log: (level: LogLevel, text: string) => void;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// Sayfanın gönderdiği hata nesnesinden yerel bir Error kuruluyor. Yığın izi
// korunuyor, çünkü kullanıcının kendi kodundaki satırı gösteren tek şey o.
function errorFromReply(raw: unknown): Error {
  const e = (raw && typeof raw === "object" ? raw : {}) as { name?: unknown; message?: unknown; stack?: unknown };
  const err = new Error(typeof e.message === "string" ? truncate(e.message, MAX_ERROR_TEXT) : "Flow sandbox hatasi");
  if (typeof e.name === "string" && e.name.length <= 100) err.name = e.name;
  err.stack = typeof e.stack === "string" ? truncate(e.stack, MAX_ERROR_TEXT) : `${err.name}: ${err.message}`;
  return err;
}

export class FlowSandboxHost {
  private readonly factory: SandboxPageFactory;
  private page: SandboxPage | null = null;
  private ready = false;
  private generation = 0;
  private queue: unknown[] = [];
  private readonly pending = new Map<string, Pending>();
  private readonly tokens = new Map<string, TokenEntry>();
  private readonly tokenByNode = new Map<string, string>();
  private disposed = false;

  constructor(factory: SandboxPageFactory) {
    this.factory = factory;
  }

  async runFunction(opts: RunFunctionOptions): Promise<{ result: unknown; sends: unknown[] }> {
    const token = this.tokenFor(opts.node.id, { stores: opts.stores, log: opts.log });
    const reply = (await this.submit(
      "function",
      {
        token,
        code: opts.code,
        msg: toWire(opts.msg),
        env: toWire(opts.env),
        nodeId: opts.node.id,
        nodeName: opts.node.name
      },
      FUNCTION_TIMEOUT_MS
    )) as { result: unknown; sends: unknown[] };
    return reply;
  }

  async xlsxRead(buffer: Buffer, opts: XlsxReadOptions): Promise<unknown> {
    return this.submit(
      "xlsxRead",
      { buffer: new Uint8Array(buffer), opts: toWire({ offset: opts.offset, header: opts.header }) },
      XLSX_TIMEOUT_MS
    );
  }

  async xlsxWrite(opts: XlsxWriteOptions): Promise<Buffer> {
    const out = await this.submit(
      "xlsxWrite",
      {
        data: toWire(opts.data),
        config: toWire(opts.config),
        blank: opts.blank === true,
        templateBuffer: opts.templateBuffer == null ? opts.templateBuffer : toWire(opts.templateBuffer)
      },
      XLSX_TIMEOUT_MS
    );
    if (!Buffer.isBuffer(out)) throw new Error("json-to-excel: flow sandbox beklenmeyen bir cikti dondurdu");
    return out;
  }

  // Flow durdurulduğunda/yeniden deploy edildiğinde çağrılıyor: sayfa (ve
  // içindeki bütün zamanlayıcılar, kullanıcı kodunun bıraktığı globaller)
  // atılıyor. Sonraki çalışma temiz bir realm'de başlıyor.
  reset(reason: string = SANDBOX_RESTART_MESSAGE): void {
    this.generation++;
    const page = this.page;
    this.page = null;
    this.ready = false;
    this.queue = [];
    this.tokens.clear();
    this.tokenByNode.clear();
    const pending = Array.from(this.pending.values());
    this.pending.clear();
    if (page) {
      try {
        page.destroy();
      } catch {
        // pencere zaten gitmişse yapılacak bir şey yok
      }
    }
    for (const p of pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
  }

  // Ana pencere kapanırken çağrılıyor. Gizli pencere de bir BrowserWindow;
  // açık kalırsa "window-all-closed" hiç gelmez ve uygulama kapanmaz. `reset`
  // yetmiyor: yarıda kalan bir zincir (catch node → function node) aradaki
  // anda sayfayı yeniden kurabilirdi — `disposed` bunu engelliyor.
  dispose(): void {
    this.disposed = true;
    this.reset("Flow sandbox kapatildi.");
  }

  // macOS'ta uygulama pencere kapansa da yaşıyor; ana pencere yeniden
  // açılınca sandbox da yeniden kullanılabilir olmalı.
  resume(): void {
    this.disposed = false;
  }

  // Aynı node aynı sayfa ömrü boyunca aynı jetonu kullanıyor: sayfada
  // bırakılmış bir zamanlayıcı (setTimeout içinden node.warn/context.set)
  // çalışma bittikten sonra da kendi node'unun deposuna ulaşsın — eski vm
  // motorundaki davranış buydu. Jeton sayfa atılınca geçersizleşiyor.
  private tokenFor(nodeId: string, entry: TokenEntry): string {
    const existing = this.tokenByNode.get(nodeId);
    if (existing && this.tokens.has(existing)) {
      this.tokens.set(existing, entry);
      return existing;
    }
    if (this.tokens.size >= MAX_TOKENS) {
      const oldest = this.tokens.keys().next().value;
      if (oldest !== undefined) this.tokens.delete(oldest);
    }
    const token = randomUUID();
    this.tokens.set(token, entry);
    this.tokenByNode.set(nodeId, token);
    return token;
  }

  private submit(kind: Kind, body: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    if (this.disposed) return Promise.reject(new Error("Flow sandbox kapatildi."));
    const runId = randomUUID();
    const request = { ...body, kind, runId };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.onTimeout(runId), timeoutMs);
      this.pending.set(runId, { kind, resolve, reject, timer });
      try {
        this.ensurePage();
      } catch (err) {
        this.pending.delete(runId);
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
        return;
      }
      if (this.ready) this.page?.send(request);
      else this.queue.push(request);
    });
  }

  // Sonsuz döngüdeki bir sayfa kendi başına durmaz ve JS iş parçacığı dolu
  // olduğu için ona "dur" mesajı da ulaşmaz; tek çare sayfayı öldürmek. Ana
  // süreç bu arada hiç bloklanmıyor — beklenen şey yalnızca bir IPC yanıtı.
  private onTimeout(runId: string): void {
    const p = this.pending.get(runId);
    if (!p) return;
    this.pending.delete(runId);
    p.reject(
      new Error(
        p.kind === "function"
          ? FUNCTION_TIMEOUT_MESSAGE
          : `Excel islemi zaman asimina ugradi (${XLSX_TIMEOUT_MS / 1000}s).`
      )
    );
    this.reset(SANDBOX_RESTART_MESSAGE);
  }

  private ensurePage(): void {
    if (this.page) return;
    const gen = this.generation;
    const live = () => gen === this.generation;
    this.ready = false;
    this.page = this.factory({
      ready: () => {
        if (!live() || this.ready) return;
        this.ready = true;
        const queued = this.queue;
        this.queue = [];
        for (const req of queued) this.page?.send(req);
      },
      done: (reply) => {
        if (live()) this.onDone(reply);
      },
      log: (token, level, text) => {
        if (live()) this.onLog(token, level, text);
      },
      context: (op, token, scope, key, value) =>
        live() ? this.onContext(op, token, scope, key, value) : { ok: false, error: "flow sandbox yeniden baslatildi" },
      gone: (reason) => {
        if (live()) this.reset(`Flow sandbox beklenmedik sekilde kapandi (${truncate(String(reason), 200)}).`);
      }
    });
  }

  private onDone(raw: unknown): void {
    if (!raw || typeof raw !== "object") return;
    const reply = raw as { runId?: unknown; ok?: unknown; result?: unknown; sends?: unknown; error?: unknown };
    if (typeof reply.runId !== "string" || reply.runId.length > MAX_RUN_ID) return;
    const p = this.pending.get(reply.runId);
    if (!p) return;
    this.pending.delete(reply.runId);
    clearTimeout(p.timer);
    if (reply.ok !== true) {
      p.reject(errorFromReply(reply.error));
      return;
    }
    try {
      p.resolve(this.acceptResult(p.kind, reply.result, reply.sends));
    } catch (err) {
      p.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private acceptResult(kind: Kind, result: unknown, sends: unknown): unknown {
    if (kind === "function") {
      const list = sends === undefined ? [] : sends;
      if (!Array.isArray(list)) throw new Error("flow sandbox: gecersiz node.send listesi");
      if (list.length > MAX_SENDS) throw new Error(`flow sandbox: bir calismada en fazla ${MAX_SENDS} node.send`);
      return {
        result: fromWire(result, NodeBuffer),
        sends: list.map((m) => fromWire(m, NodeBuffer))
      };
    }
    if (kind === "xlsxWrite") {
      if (!(result instanceof Uint8Array)) throw new Error("json-to-excel: flow sandbox gecersiz cikti dondurdu");
      return Buffer.from(result.buffer, result.byteOffset, result.byteLength);
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      throw new Error("excel-to-json: flow sandbox gecersiz cikti dondurdu");
    }
    return fromWire(result, NodeBuffer);
  }

  private onLog(token: unknown, level: unknown, text: unknown): void {
    const entry = typeof token === "string" ? this.tokens.get(token) : undefined;
    if (!entry || typeof level !== "string" || !LOG_LEVELS.has(level)) return;
    const line = typeof text === "string" ? text : String(text);
    try {
      entry.log(level as LogLevel, truncate(line, MAX_LOG_TEXT));
    } catch {
      // log tüketicisinin hatası sayfaya taşınmasın
    }
  }

  private onContext(op: unknown, token: unknown, scope: unknown, key: unknown, value: unknown): ContextReply {
    try {
      const entry = typeof token === "string" ? this.tokens.get(token) : undefined;
      if (!entry) return { ok: false, error: "context: gecersiz jeton" };
      if (typeof scope !== "string" || !SCOPES.has(scope)) return { ok: false, error: "context: gecersiz kapsam" };
      const store = entry.stores[scope as keyof ContextStores];
      if (op === "keys") return { ok: true, value: Object.keys(store) };
      if (typeof key !== "string" || key.length > MAX_KEY) return { ok: false, error: "context: gecersiz anahtar" };
      if (FORBIDDEN_KEYS.has(key)) return { ok: false, error: `context: "${key}" anahtari kullanilamaz` };
      if (op === "get") {
        return { ok: true, value: Object.prototype.hasOwnProperty.call(store, key) ? toWire(store[key]) : undefined };
      }
      if (op === "set") {
        store[key] = fromWire(value, NodeBuffer);
        return { ok: true };
      }
      return { ok: false, error: "context: gecersiz islem" };
    } catch (err) {
      return { ok: false, error: `context: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
}

// Sandbox oturumunun izin verdiği tek adresler: paketin kendi dosyaları
// (dist/ altı) ve geliştirmede Vite sunucusu. Geri kalan her şey — http(s),
// ws, data:, blob:, dist dışındaki file:// — reddediliyor. `path.relative`
// kontrolü `..` ile dist'ten dışarı çıkan yolları da yakalıyor.
export function isAllowedSandboxUrl(rawUrl: string, opts: { distDir: string; devOrigin?: string | null }): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol === "file:") {
    let filePath: string;
    try {
      filePath = fileURLToPath(url);
    } catch {
      return false;
    }
    const rel = path.relative(path.resolve(opts.distDir), path.resolve(filePath));
    return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
  }
  if (opts.devOrigin && (url.protocol === "http:" || url.protocol === "https:")) {
    try {
      return url.origin === new URL(opts.devOrigin).origin;
    } catch {
      return false;
    }
  }
  return false;
}
