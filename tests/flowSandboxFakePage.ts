// Flow sandbox testleri için Electron'suz sahte sayfa.
//
// Gerçek sayfa (src/flowSandbox/main.ts) ile ana süreç arasında yalnızca
// yapılandırılmış klonlama var; burada her geçiş `structuredClone` ile
// taklit ediliyor. Böylece host → sayfa → host yolu, Buffer'ların Uint8Array'e
// inip geri Buffer olması dahil, Electron açmadan sınanabiliyor. Sayfadaki
// Buffer, gerçek sayfadaki gibi npm `buffer` polyfill'i.

import { createRequire } from "node:module";
import { Buffer as PolyBuffer } from "buffer/";
import * as XLSX from "xlsx";
import { createFlowRunner, type BufferLike } from "../src/flowSandbox/runner";
import type { SandboxPage, SandboxPageFactory, SandboxPageHandlers } from "../app-electron/main/flowSandboxHost";

const require = createRequire(import.meta.url);
// xlsx-populate'in Node sürümü: tarayıcı paketiyle aynı API, test Node'da koşuyor.
const XlsxPopulate: unknown = require("xlsx-populate");

export interface FakePage extends SandboxPage {
  handlers: SandboxPageHandlers;
  destroyed: boolean;
  sent: unknown[];
}

export interface FakePageOptions {
  // true: sayfa hiç "ready" demiyor (yükleme takıldı gibi).
  neverReady?: boolean;
}

export function createFakePages(options: FakePageOptions = {}): { factory: SandboxPageFactory; pages: FakePage[] } {
  const pages: FakePage[] = [];
  const factory: SandboxPageFactory = (handlers) => {
    const page: FakePage = {
      handlers,
      destroyed: false,
      sent: [],
      send: (request) => {
        if (page.destroyed) return;
        const req = structuredClone(request);
        page.sent.push(req);
        void runner.handle(req).then((reply) => {
          if (!page.destroyed) handlers.done(structuredClone(reply));
        });
      },
      destroy: () => {
        page.destroyed = true;
      }
    };
    const bridgeCall = (op: string, token: string, scope: string, key?: string, value?: unknown) =>
      page.destroyed
        ? { ok: false, error: "sayfa kapandi" }
        : structuredClone(handlers.context(op, token, scope, key, structuredClone(value)));
    const runner = createFlowRunner({
      bridge: {
        contextGet: (token, scope, key) => bridgeCall("get", token, scope, key),
        contextSet: (token, scope, key, value) => bridgeCall("set", token, scope, key, value),
        contextKeys: (token, scope) => bridgeCall("keys", token, scope),
        log: (token, level, text) => {
          if (!page.destroyed) handlers.log(token, level, text);
        }
      },
      BufferImpl: PolyBuffer as unknown as BufferLike,
      XLSX,
      XlsxPopulate
    });
    pages.push(page);
    if (!options.neverReady) void Promise.resolve().then(() => handlers.ready());
    return page;
  };
  return { factory, pages };
}
