// Flow sandbox çalıştırıcısı — function node kodunu ve xlsx işlerini yürüten
// saf mantık.
//
// Bu modül sandbox sayfasının (flow-sandbox.html → main.ts) beynidir ama
// bilerek ne DOM'a ne Node'a dokunuyor: köprü, Buffer ve xlsx kütüphaneleri
// dışarıdan veriliyor. Nedeni test edilebilirlik — Electron'u açmadan bu
// mantığı Node'da sınayabilmek (tests/flowSandboxHost.test.ts). Güvenlik
// sınırı BU MODÜL DEĞİL: sınır, kodun Chromium sandbox'lı, Node'suz, ağı
// kesilmiş bir süreçte koşması ve ana sürecin gelen her şeyi doğrulaması
// (app-electron/main/flowSandboxHost.ts). Burada kullanıcı kodu aynı realm'de
// çalışıyor; sayfadaki her şeye erişebilir ve bu kabul ediliyor.

import { SHEET_TBD_MARK, xlsxRead, xlsxWrite } from "./xlsxOps.js";
import {
  fromWire,
  previewValue,
  serializeError,
  toWire,
  type AnyRecord,
  type BufferLike,
  type SerializedError
} from "./wire";

export { SHEET_TBD_MARK, fromWire, previewValue, serializeError, toWire };
export type { BufferLike, SerializedError };

// Ana sürece giden dar köprü. Preload (app-electron/preload/flowSandbox.cjs)
// bu fonksiyonları contextBridge ile veriyor; testlerde sahte bir nesne.
export interface FlowSandboxBridge {
  contextGet(token: string, scope: string, key: string): unknown;
  contextSet(token: string, scope: string, key: string, value: unknown): unknown;
  contextKeys(token: string, scope: string): unknown;
  log(token: string, level: string, text: string): void;
}

export interface FlowRunnerDeps {
  bridge: FlowSandboxBridge;
  BufferImpl: BufferLike;
  XLSX?: unknown;
  XlsxPopulate?: unknown;
}

export type RunReply =
  | { runId: string; ok: true; result: unknown; sends?: unknown[] }
  | { runId: string; ok: false; error: SerializedError };

// Hata iletisinde görünen dosya adı. Node adı kullanıcıdan geliyor; yorum
// satırını bitirip koda bir şey eklemesin diye yalnızca güvenli karakterler.
function sourceName(name: unknown, id: unknown): string {
  const raw = typeof name === "string" && name ? name : typeof id === "string" ? id : "function";
  return `${raw.replace(/[^\w.-]/g, "_").slice(0, 100)}.function.js`;
}

type ContextReply = { ok?: unknown; value?: unknown; error?: unknown };

function unwrapContext(reply: unknown): unknown {
  const r = (reply && typeof reply === "object" ? reply : {}) as ContextReply;
  if (r.ok !== true) {
    throw new Error(typeof r.error === "string" ? r.error : "context erisimi reddedildi");
  }
  return r.value;
}

// Kullanıcı kodunun gördüğü adlar — eski vm sandbox'ındaki nesnelerin
// flow'a ait olanları. Tarayıcı yerleşikleri (Date, JSON, Math, Promise,
// setTimeout…) sayfanın kendi globalleri olarak zaten var.
const SCOPE_NAMES = ["node", "context", "flow", "global", "env", "console", "Buffer"];

// Kod eski motordaki sarmalayıcıyla aynı biçimde derleniyor: dış bir
// fonksiyonun kapsamındaki adlar + içte `async function(msg){ kod }`. Adları
// doğrudan AsyncFunction parametresi yapmak daha kısa olurdu, ama o zaman
// `const node = …` ya da `let context = …` gibi eskiden geçerli kod
// "already been declared" SyntaxError'u verirdi (parametre ile aynı adda
// let/const). Sayfada CSP 'unsafe-eval' yalnızca bu derleme için açık.
function compileFunction(code: string, fileName: string): (...scope: unknown[]) => (msg: unknown) => Promise<unknown> {
  return new Function(...SCOPE_NAMES, `return async function (msg) {\n${code}\n};\n//# sourceURL=${fileName}`) as (
    ...scope: unknown[]
  ) => (msg: unknown) => Promise<unknown>;
}

export function createFlowRunner(deps: FlowRunnerDeps) {
  const { bridge, BufferImpl } = deps;

  function contextApi(token: string, scope: string) {
    return Object.freeze({
      get: (key: unknown) => fromWire(unwrapContext(bridge.contextGet(token, scope, String(key))), BufferImpl),
      set: (key: unknown, value: unknown) => {
        unwrapContext(bridge.contextSet(token, scope, String(key), toWire(value)));
      },
      keys: () => {
        const keys = unwrapContext(bridge.contextKeys(token, scope));
        return Array.isArray(keys) ? keys : [];
      }
    });
  }

  async function runFunction(req: AnyRecord): Promise<{ result: unknown; sends: unknown[] }> {
    const token = typeof req.token === "string" ? req.token : "";
    const code = typeof req.code === "string" && req.code ? req.code : "return msg;";
    const envMap = (req.env && typeof req.env === "object" ? req.env : {}) as AnyRecord;
    const log = (level: string, text: string) => bridge.log(token, level, text);
    const fmt = (m: unknown) => (typeof m === "string" ? m : previewValue(m));
    const joinArgs = (args: unknown[]) => args.map(String).join(" ");

    // `node.send()` eskisi gibi biriktiriliyor, gerçek sevkiyat çalışma
    // bittikten sonra ana süreçte (`_emit`) yapılıyor — `node.send(m);
    // return null;` ile `return m;` desenlerinin ikisi de çalışsın diye.
    // Çalışma bittikten SONRA gelen send'ler (ör. setTimeout içinden) eski
    // motorda da hiçbir yere ulaşmıyordu; burada da bırakılıyor.
    const sends: unknown[] = [];
    let finished = false;
    const nodeApi = Object.freeze({
      id: req.nodeId,
      name: req.nodeName,
      send: (sendMsg: unknown) => {
        if (sendMsg == null || finished) return;
        sends.push(toWire(sendMsg));
      },
      warn: (m: unknown) => log("warn", fmt(m)),
      error: (m: unknown) => log("error", fmt(m)),
      log: (m: unknown) => log("info", fmt(m)),
      done: () => {},
      status: () => {}
    });
    const consoleApi = Object.freeze({
      log: (...args: unknown[]) => log("info", joinArgs(args)),
      warn: (...args: unknown[]) => log("warn", joinArgs(args)),
      error: (...args: unknown[]) => log("error", joinArgs(args))
    });
    // Eskiden `env.get` bütün process.env'i veriyordu. Artık ana sürecin
    // seçip gönderdiği küçük harita dışında hiçbir şey yok; öz özellik
    // kontrolü "toString" gibi prototip adlarının fonksiyon döndürmesini
    // engelliyor.
    const envApi = Object.freeze({
      get: (name: unknown) =>
        typeof name === "string" && Object.prototype.hasOwnProperty.call(envMap, name) ? envMap[name] : undefined
    });

    const msg = fromWire(req.msg, BufferImpl);
    try {
      const fn = compileFunction(code, sourceName(req.nodeName, req.nodeId))(
        nodeApi,
        contextApi(token, "node"),
        contextApi(token, "flow"),
        contextApi(token, "global"),
        envApi,
        consoleApi,
        BufferImpl
      );
      const result = await fn(msg);
      return { result: result === undefined ? null : toWire(result), sends };
    } finally {
      finished = true;
    }
  }

  async function handle(request: unknown): Promise<RunReply> {
    const req = (request && typeof request === "object" ? request : {}) as AnyRecord;
    const runId = typeof req.runId === "string" ? req.runId : "";
    try {
      if (req.kind === "function") {
        const { result, sends } = await runFunction(req);
        return { runId, ok: true, result, sends };
      }
      if (req.kind === "xlsxRead") {
        if (!(req.buffer instanceof Uint8Array)) throw new Error("excel-to-json: msg.payload must be a Buffer");
        const opts = (req.opts && typeof req.opts === "object" ? req.opts : {}) as AnyRecord;
        const data = xlsxRead({ XLSX: deps.XLSX }, req.buffer, { offset: opts.offset, header: opts.header });
        return { runId, ok: true, result: toWire(data) };
      }
      if (req.kind === "xlsxWrite") {
        const out = await xlsxWrite(
          { XlsxPopulate: deps.XlsxPopulate },
          {
            data: fromWire(req.data, BufferImpl),
            config: fromWire(req.config, BufferImpl),
            blank: req.blank === true,
            templateBuffer: fromWire(req.templateBuffer, BufferImpl)
          }
        );
        return { runId, ok: true, result: new Uint8Array(out as Uint8Array) };
      }
      throw new Error(`flow sandbox: bilinmeyen istek turu: ${String(req.kind)}`);
    } catch (err) {
      return { runId, ok: false, error: serializeError(err) };
    }
  }

  return { handle };
}
