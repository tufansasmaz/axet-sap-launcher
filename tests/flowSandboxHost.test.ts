import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FUNCTION_TIMEOUT_MESSAGE,
  FUNCTION_TIMEOUT_MS,
  FlowSandboxHost,
  isAllowedSandboxUrl,
  type ContextStores,
  type RunFunctionOptions
} from "../app-electron/main/flowSandboxHost";
import { createFakePages } from "./flowSandboxFakePage";

// Host (ana süreç tarafı) + saf çalıştırıcı (sayfa tarafı), aralarında
// structuredClone. Gerçek Electron penceresi yerine sahte sayfa.

function stores(): ContextStores {
  return { node: {}, flow: {}, global: {} };
}

function runOpts(code: string, extra: Partial<RunFunctionOptions> = {}): RunFunctionOptions {
  return {
    code,
    msg: { payload: 1 },
    node: { id: "n1", name: "fn" },
    env: {},
    stores: stores(),
    log: () => {},
    ...extra
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("FlowSandboxHost — function node", () => {
  it("kodu sayfada çalıştırıp sonucu döndürüyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const { result, sends } = await host.runFunction(runOpts("msg.payload = msg.payload + 41; return msg;"));
    expect(result).toEqual({ payload: 42 });
    expect(sends).toEqual([]);
  });

  it("çoklu çıkış ve node.send eski sözleşmeyle geliyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const { result, sends } = await host.runFunction(
      runOpts("node.send({ payload: 'a' }); node.send([null, { payload: 'b' }]); return [msg, null, { payload: 'c' }];")
    );
    expect(sends).toEqual([{ payload: "a" }, [null, { payload: "b" }]]);
    expect(result).toEqual([{ payload: 1 }, null, { payload: "c" }]);
  });

  it("undefined dönüşü null oluyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const { result } = await host.runFunction(runOpts("node.send(msg);"));
    expect(result).toBeNull();
  });

  it("Buffer sınırı iki yönde de Buffer olarak geçiyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const { result } = await host.runFunction(
      runOpts(
        "if (!Buffer.isBuffer(msg.payload)) throw new Error('buffer degil');" +
          "return { payload: Buffer.concat([msg.payload, Buffer.from('!')]), text: msg.payload.toString('utf8') };",
        { msg: { payload: Buffer.from("merhaba", "utf8") } }
      )
    );
    const r = result as { payload: Buffer; text: string };
    expect(Buffer.isBuffer(r.payload)).toBe(true);
    expect(r.payload.toString("utf8")).toBe("merhaba!");
    expect(r.text).toBe("merhaba");
  });

  it("context/flow/global kendi depolarına yazıyor ve oradan okuyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const s = stores();
    s.global.onceden = { a: 1 };
    await host.runFunction(
      runOpts(
        "context.set('sayac', (context.get('sayac') || 0) + 1);" +
          "flow.set('f', 'x'); global.set('g', Buffer.from('ab'));" +
          "return { payload: [global.get('onceden'), context.keys()] };",
        { stores: s }
      )
    );
    const { result } = await host.runFunction(runOpts("return { payload: context.get('sayac') };", { stores: s }));
    expect((result as { payload: unknown }).payload).toBe(1);
    expect(s.node.sayac).toBe(1);
    expect(s.flow.f).toBe("x");
    // Ana sürecin deposuna konan değer Node Buffer'ı, polyfill değil.
    expect(Buffer.isBuffer(s.global.g)).toBe(true);
    expect((s.global.g as Buffer).toString()).toBe("ab");
  });

  it("node.warn/error/log ve console ana sürecin loguna gidiyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const log = vi.fn();
    await host.runFunction(runOpts("node.warn('dikkat'); node.error({ a: 1 }); console.log('x', 2); return null;", { log }));
    expect(log.mock.calls).toEqual([
      ["warn", "dikkat"],
      ["error", '{"a":1}'],
      ["info", "x 2"]
    ]);
  });

  it("kodda eskiden geçerli olan `const node` / `let context` hâlâ derleniyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const { result } = await host.runFunction(runOpts("const node = 5; let context = 6; return { payload: node + context };"));
    expect(result).toEqual({ payload: 11 });
  });

  it("kod hatası hata olarak dönüyor, bekleyen send'ler bırakılıyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    await expect(host.runFunction(runOpts("node.send({ payload: 1 }); tanimsiz();"))).rejects.toThrow(/tanimsiz is not defined/);
  });

  it("env.get yalnızca verilen haritayı görüyor, process.env'i görmüyor", async () => {
    process.env.S4_GIZLI_TEST = "sizmamali";
    try {
      const { factory } = createFakePages();
      const host = new FlowSandboxHost(factory);
      const { result } = await host.runFunction(
        runOpts(
          "return { payload: [env.get('S4_GIZLI_TEST'), env.get('PATH'), env.get('toString'), env.get('BENIM')] };",
          { env: { BENIM: "deger" } }
        )
      );
      expect((result as { payload: unknown[] }).payload).toEqual([undefined, undefined, undefined, "deger"]);
    } finally {
      delete process.env.S4_GIZLI_TEST;
    }
  });
});

describe("FlowSandboxHost — zaman aşımı ve yeniden kurma", () => {
  it("10 sn'de bitmeyen çalışma reddediliyor, sayfa atılıyor, bir sonraki çalışma yeni sayfada", async () => {
    vi.useFakeTimers();
    const { factory, pages } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const hung = host.runFunction(runOpts("await new Promise(() => {});"));
    const other = host.runFunction(runOpts("await new Promise(() => {});", { node: { id: "n2", name: "b" } }));
    const hungResult = expect(hung).rejects.toThrow(FUNCTION_TIMEOUT_MESSAGE);
    const otherResult = expect(other).rejects.toThrow(/yeniden baslatildi/);
    await vi.advanceTimersByTimeAsync(FUNCTION_TIMEOUT_MS);
    await hungResult;
    await otherResult;
    expect(pages).toHaveLength(1);
    expect(pages[0].destroyed).toBe(true);
    vi.useRealTimers();
    const { result } = await host.runFunction(runOpts("return msg;"));
    expect(result).toEqual({ payload: 1 });
    expect(pages).toHaveLength(2);
  });

  it("hiç hazır olmayan sayfa da zaman aşımına düşüyor", async () => {
    vi.useFakeTimers();
    const { factory, pages } = createFakePages({ neverReady: true });
    const host = new FlowSandboxHost(factory);
    const run = expect(host.runFunction(runOpts("return msg;"))).rejects.toThrow(FUNCTION_TIMEOUT_MESSAGE);
    await vi.advanceTimersByTimeAsync(FUNCTION_TIMEOUT_MS);
    await run;
    expect(pages[0].destroyed).toBe(true);
  });

  it("reset (flow durdurma) bekleyenleri reddediyor ve sayfayı atıyor", async () => {
    const { factory, pages } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const run = host.runFunction(runOpts("await new Promise(() => {});"));
    await Promise.resolve();
    host.reset("Flow durduruldu.");
    await expect(run).rejects.toThrow("Flow durduruldu.");
    expect(pages[0].destroyed).toBe(true);
  });

  it("sayfa kendiliğinden ölürse (gone) bekleyenler reddediliyor", async () => {
    const { factory, pages } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const run = host.runFunction(runOpts("await new Promise(() => {});"));
    await Promise.resolve();
    pages[0].handlers.gone("render-process-gone: crashed");
    await expect(run).rejects.toThrow(/beklenmedik sekilde kapandi/);
  });

  it("dispose sonrası yeni sayfa kurulmuyor, resume ile yeniden açılıyor", async () => {
    const { factory, pages } = createFakePages();
    const host = new FlowSandboxHost(factory);
    host.dispose();
    await expect(host.runFunction(runOpts("return msg;"))).rejects.toThrow(/kapatildi/);
    expect(pages).toHaveLength(0);
    host.resume();
    await expect(host.runFunction(runOpts("return msg;"))).resolves.toEqual({ result: { payload: 1 }, sends: [] });
  });

  it("eski sayfanın geç gelen olayları yok sayılıyor", async () => {
    const { factory, pages } = createFakePages();
    const host = new FlowSandboxHost(factory);
    await host.runFunction(runOpts("return msg;"));
    const old = pages[0];
    host.reset();
    expect(old.handlers.context("keys", "x", "node", undefined, undefined)).toEqual({
      ok: false,
      error: "flow sandbox yeniden baslatildi"
    });
  });
});

describe("FlowSandboxHost — sayfadan gelen girdinin doğrulanması", () => {
  async function hostWithToken() {
    const { factory, pages } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const s = stores();
    const log = vi.fn();
    await host.runFunction(runOpts("return null;", { stores: s, log }));
    const page = pages[0];
    const token = (page.sent[0] as { token: string }).token;
    return { host, page, token, s, log };
  }

  it("bilinmeyen jeton, kapsam ve işlem reddediliyor", async () => {
    const { page, token } = await hostWithToken();
    expect(page.handlers.context("get", "uydurma", "node", "a", undefined).ok).toBe(false);
    expect(page.handlers.context("get", token, "process", "a", undefined).ok).toBe(false);
    expect(page.handlers.context("delete", token, "node", "a", undefined).ok).toBe(false);
    expect(page.handlers.context("get", 42, "node", "a", undefined).ok).toBe(false);
  });

  it("__proto__/constructor/prototype anahtarları ve aşırı uzun anahtarlar reddediliyor", async () => {
    const { page, token, s } = await hostWithToken();
    for (const key of ["__proto__", "constructor", "prototype", "x".repeat(1025), 7]) {
      expect(page.handlers.context("set", token, "global", key, { kirli: true }).ok).toBe(false);
    }
    expect(Object.getPrototypeOf(s.global)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).kirli).toBeUndefined();
  });

  it("get yalnızca öz özellikleri döndürüyor", async () => {
    const { page, token } = await hostWithToken();
    expect(page.handlers.context("get", token, "node", "toString", undefined)).toEqual({ ok: true, value: undefined });
    expect(page.handlers.context("get", token, "node", "hasOwnProperty", undefined)).toEqual({ ok: true, value: undefined });
  });

  it("log: geçersiz seviye düşürülüyor, metin kısaltılıyor", async () => {
    const { page, token, log } = await hostWithToken();
    page.handlers.log(token, "debug", "x");
    page.handlers.log("uydurma", "info", "x");
    page.handlers.log(token, "info", "y".repeat(20_000));
    expect(log).toHaveBeenCalledTimes(1);
    expect((log.mock.calls[0][1] as string).length).toBeLessThanOrEqual(10_001);
  });

  it("bilinmeyen runId'li ya da bozuk yanıtlar hiçbir şeyi çözmüyor", async () => {
    const { page } = await hostWithToken();
    expect(() => page.handlers.done(null)).not.toThrow();
    expect(() => page.handlers.done({ runId: "yok", ok: true, result: 1 })).not.toThrow();
    expect(() => page.handlers.done({ runId: 5 })).not.toThrow();
  });

  it("node.send listesi dizi değilse çalışma hata veriyor", async () => {
    const { factory, pages } = createFakePages({ neverReady: true });
    const host = new FlowSandboxHost(factory);
    const run = host.runFunction(runOpts("return msg;"));
    pages[0].handlers.ready();
    const runId = (pages[0].sent[0] as { runId: string }).runId;
    pages[0].destroyed = true; // gerçek yanıtı sahte sayfa göndermesin
    pages[0].handlers.done({ runId, ok: true, result: null, sends: "dizi-degil" });
    await expect(run).rejects.toThrow(/gecersiz node.send/);
  });
});

describe("FlowSandboxHost — xlsx", () => {
  it("json-to-excel yazıp excel-to-json ile geri okuyor (Buffer ana süreçte Buffer)", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    const when = new Date(2024, 0, 15, 10, 30);
    const out = await host.xlsxWrite({
      data: { Liste: [{ Ad: "Ali", Tarih: when, Tutar: 12.5 }] },
      config: {},
      blank: true,
      templateBuffer: null
    });
    expect(Buffer.isBuffer(out)).toBe(true);
    const data = (await host.xlsxRead(out, {})) as Record<string, Array<Record<string, unknown>>>;
    expect(Object.keys(data)).toEqual(["Liste"]);
    expect(data.Liste[0].Ad).toBe("Ali");
    expect(data.Liste[0].Tutar).toBe(12.5);
    expect(data.Liste[0].Tarih).toBeInstanceOf(Date);
  });

  it("bozuk dosya sayfada hata veriyor, ana süreç çökmüyor", async () => {
    const { factory } = createFakePages();
    const host = new FlowSandboxHost(factory);
    await expect(
      host.xlsxWrite({ data: { A: [] }, config: {}, blank: false, templateBuffer: Buffer.from("zip degil") })
    ).rejects.toThrow();
  });
});

describe("isAllowedSandboxUrl", () => {
  const distDir = process.platform === "win32" ? "C:\\app\\resources\\app.asar\\dist" : "/app/resources/app.asar/dist";
  const base = process.platform === "win32" ? "file:///C:/app/resources/app.asar" : "file:///app/resources/app.asar";

  it("yalnızca dist altındaki dosyalara izin veriyor", () => {
    expect(isAllowedSandboxUrl(`${base}/dist/flow-sandbox.html`, { distDir })).toBe(true);
    expect(isAllowedSandboxUrl(`${base}/dist/assets/flowSandbox-x.js`, { distDir })).toBe(true);
    expect(isAllowedSandboxUrl(`${base}/dist/../package.json`, { distDir })).toBe(false);
    expect(isAllowedSandboxUrl(`${base}/dist-electron/main/index.js`, { distDir })).toBe(false);
    expect(isAllowedSandboxUrl(`${base}/dist`, { distDir })).toBe(false);
  });

  it("ağ, data:, blob: ve bozuk adresleri reddediyor", () => {
    for (const url of [
      "https://example.com/x",
      "http://127.0.0.1:17880/",
      "ws://localhost:5173/",
      "data:text/html,hi",
      "blob:file:///abc",
      "not a url"
    ]) {
      expect(isAllowedSandboxUrl(url, { distDir })).toBe(false);
    }
  });

  it("geliştirmede yalnızca Vite sunucusunun kökenine izin veriyor", () => {
    const devOrigin = "http://localhost:5173";
    expect(isAllowedSandboxUrl("http://localhost:5173/src/flowSandbox/main.ts", { distDir, devOrigin })).toBe(true);
    expect(isAllowedSandboxUrl("http://localhost:5174/x", { distDir, devOrigin })).toBe(false);
    expect(isAllowedSandboxUrl("http://evil.localhost:5173/x", { distDir, devOrigin })).toBe(false);
  });
});
