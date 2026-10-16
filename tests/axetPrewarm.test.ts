// Başsız köprü ısıtma havuzu (İş 1, 2026-10-16): istem gelmeden açılmış
// `axet-code run` süreçleri. Sahte süreç, sahte zamanlayıcı.
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({ noteUpdateLine: vi.fn() }));

const { createPrewarmPool } = await import("../app-electron/main/axetPrewarm");

class FakeChild extends EventEmitter {
  pid = 4242;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  written = "";
  stdin = {
    write: (d: string) => {
      this.written += d;
      return true;
    },
    end: () => undefined,
    on: () => undefined
  };
}

function harness() {
  const children: FakeChild[] = [];
  const spawned: { args: string[]; env: NodeJS.ProcessEnv }[] = [];
  const killed: FakeChild[] = [];
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
  const logs: { chatId: string; sonuc: string; kod?: number | null }[] = [];
  const clock = { t: 0 };
  const pool = createPrewarmPool({
    spawn: (_cmd, args, opts) => {
      const c = new FakeChild();
      children.push(c);
      spawned.push({ args, env: opts.env });
      return c as never;
    },
    env: (useConnectors) => ({ BAGLAYICI: useConnectors ? "1" : "0" }),
    killTree: (c) => {
      killed.push(c as unknown as FakeChild);
    },
    setTimer: (fn, ms) => {
      const t = { fn, ms, cleared: false };
      timers.push(t);
      return t;
    },
    clearTimer: (t) => {
      (t as { cleared: boolean }).cleared = true;
    },
    now: () => clock.t,
    log: (chatId, sonuc, kod) => logs.push({ chatId, sonuc, ...(kod !== undefined ? { kod } : {}) })
  });
  return { pool, children, spawned, killed, timers, logs, clock };
}

const KEY = { chatId: "c1", cwd: "C:/p", model: "openai/gpt-5", resumeId: null, useConnectors: false };
const flush = () => new Promise((r) => setImmediate(r));

describe("axetPrewarm", () => {
  it("açılış: run argümanları ve bağlayıcı ortamı; istem yazılmıyor", () => {
    const h = harness();
    h.pool.prewarm({ ...KEY, resumeId: "S1", useConnectors: true });
    expect(h.spawned).toHaveLength(1);
    expect(h.spawned[0].args).toEqual([
      "run", "-v", "-q", "--output-format", "json", "--resume", "S1", "-c", "C:/p", "-m", "openai/gpt-5"
    ]);
    expect(h.spawned[0].env).toEqual({ BAGLAYICI: "1" });
    expect(h.children[0].written).toBe("");
    expect(h.logs).toEqual([{ chatId: "c1", sonuc: "acildi" }]);
  });

  it("aynı anahtar: ikinci spawn yok", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    h.pool.prewarm({ ...KEY });
    expect(h.spawned).toHaveLength(1);
    expect(h.killed).toHaveLength(0);
  });

  it("aynı sohbet, farklı anahtar: eski öldürülüyor (uyusmadi), yenisi açılıyor", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    h.clock.t = 6_000;
    h.pool.prewarm({ ...KEY, useConnectors: true });
    expect(h.spawned).toHaveLength(2);
    expect(h.killed).toEqual([h.children[0]]);
    expect(h.pool.size()).toBe(1);
    expect(h.logs.map((l) => l.sonuc)).toEqual(["acildi", "uyusmadi", "acildi"]);
  });

  it("bekleme: yalnız bağlayıcı kararı değiştiyse 5 sn'den genç süreç değiştirilmiyor", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    h.clock.t = 1_000;
    h.pool.prewarm({ ...KEY, useConnectors: true });
    h.clock.t = 4_000;
    h.pool.prewarm(KEY);
    h.pool.prewarm({ ...KEY, useConnectors: true });
    expect(h.spawned).toHaveLength(1);
    expect(h.killed).toHaveLength(0);
    // 5 sn dolunca değiştiriliyor
    h.clock.t = 5_000;
    h.pool.prewarm({ ...KEY, useConnectors: true });
    expect(h.spawned).toHaveLength(2);
    // yeni süreç de genç: geri dönüş bekliyor
    h.clock.t = 6_000;
    h.pool.prewarm(KEY);
    expect(h.spawned).toHaveLength(2);
  });

  it("bekleme: klasör/model/oturum değiştiyse genç süreç de hemen değiştiriliyor", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    h.pool.prewarm({ ...KEY, model: "openai/baska" });
    h.pool.prewarm({ ...KEY, model: "openai/baska", cwd: "C:/q" });
    h.pool.prewarm({ ...KEY, model: "openai/baska", cwd: "C:/q", resumeId: "S9" });
    expect(h.spawned).toHaveLength(4);
    expect(h.killed).toHaveLength(3);
  });

  it("sahiplenmeden kendiliğinden kapanan süreç çıkış koduyla günlüğe yazılıyor", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    h.children[0].emit("close", 3);
    expect(h.logs).toEqual([
      { chatId: "c1", sonuc: "acildi" },
      { chatId: "c1", sonuc: "kendiliginden-kapandi", kod: 3 }
    ]);
  });

  it("öldürülen sürecin sonradan gelen kapanışı ayrıca günlüğe yazılmıyor", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    h.pool.drop("c1");
    h.children[0].emit("close", null);
    expect(h.logs.map((l) => l.sonuc)).toEqual(["acildi"]);
  });

  it("toplam en fazla 2: üçüncü sohbet en eskiyi öldürüyor", () => {
    const h = harness();
    h.pool.prewarm({ ...KEY, chatId: "a" });
    h.pool.prewarm({ ...KEY, chatId: "b" });
    h.pool.prewarm({ ...KEY, chatId: "c" });
    expect(h.spawned).toHaveLength(3);
    expect(h.killed).toEqual([h.children[0]]);
    expect(h.pool.size()).toBe(2);
    expect(h.pool.take({ ...KEY, chatId: "a" })).toBeNull();
  });

  it("90 sn boşta: öldürülüyor, havuzdan düşüyor", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    expect(h.timers[0].ms).toBe(90_000);
    h.timers[0].fn();
    expect(h.killed).toEqual([h.children[0]]);
    expect(h.pool.size()).toBe(0);
    expect(h.logs.map((l) => l.sonuc)).toEqual(["acildi", "bosta-kapandi"]);
  });

  it("take: birebir eşleşme süreci verir ve havuzdan çıkarır; zamanlayıcı iptal", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    const child = h.pool.take({ ...KEY });
    expect(child).not.toBeNull();
    expect(child!.pid).toBe(4242);
    expect(h.pool.size()).toBe(0);
    expect(h.timers[0].cleared).toBe(true);
    expect(h.killed).toHaveLength(0);
    expect(h.logs.map((l) => l.sonuc)).toEqual(["acildi", "kullanildi"]);
    // verilen sürecin stdin'i gerçek sürecinki
    child!.stdin!.write("istem", "utf-8");
    expect(h.children[0].written).toBe("istem");
  });

  it("take: eşleşmezse o sohbetin süreci öldürülüyor, null", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    expect(h.pool.take({ ...KEY, model: "openai/baska" })).toBeNull();
    expect(h.killed).toEqual([h.children[0]]);
    expect(h.pool.size()).toBe(0);
    expect(h.logs.map((l) => l.sonuc)).toEqual(["acildi", "uyusmadi"]);
  });

  it("take: havuzda yoksa null, kimse öldürülmüyor", () => {
    const h = harness();
    expect(h.pool.take(KEY)).toBeNull();
    expect(h.killed).toHaveLength(0);
  });

  it("sahiplenmeden önce gelen stdout/stderr, sonra gelen close sırayla iletiliyor", async () => {
    const h = harness();
    h.pool.prewarm(KEY);
    const real = h.children[0];
    real.stderr.emit("data", Buffer.from("INFO satir1\n"));
    real.stdout.emit("data", Buffer.from("cikti1"));
    real.stderr.emit("data", Buffer.from("INFO satir2\n"));
    const child = h.pool.take(KEY)!;
    const seen: string[] = [];
    child.stdout!.on("data", (b: Buffer) => seen.push(`out:${b.toString()}`));
    child.stderr!.on("data", (b: Buffer) => seen.push(`err:${b.toString().trim()}`));
    child.on("close", (code) => seen.push(`close:${code}`));
    // sahiplenmeyle boşaltma arasında gelen canlı veri tampondan sonra
    real.stdout.emit("data", Buffer.from("cikti2"));
    real.emit("close", 0);
    expect(seen).toEqual([]);
    await flush();
    expect(seen).toEqual(["err:INFO satir1", "out:cikti1", "err:INFO satir2", "out:cikti2", "close:0"]);
    // boşaltmadan sonra canlı veri doğrudan
    real.stderr.emit("data", Buffer.from("INFO sonra\n"));
    expect(seen[seen.length - 1]).toBe("err:INFO sonra");
  });

  it("sahiplenmeden kapanan süreç verilmiyor (ölü süreç)", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    h.children[0].emit("close", 1);
    expect(h.pool.size()).toBe(0);
    expect(h.pool.take(KEY)).toBeNull();
    expect(h.timers[0].cleared).toBe(true);
  });

  it("sahiplenmeden 'error' olayı: yakalanıyor, süreç düşüyor; aynı anahtarla yeniden açılabiliyor", () => {
    const h = harness();
    h.pool.prewarm(KEY);
    expect(() => h.children[0].emit("error", new Error("ENOENT"))).not.toThrow();
    expect(h.pool.take(KEY)).toBeNull();
    h.pool.prewarm(KEY);
    expect(h.spawned).toHaveLength(2);
  });

  it("spawn atarsa havuz boş kalıyor, istisna dışarı kaçmıyor", () => {
    const pool = createPrewarmPool({
      spawn: () => {
        throw new Error("EPERM");
      },
      env: () => ({}),
      killTree: () => {},
      setTimer: () => 0,
      clearTimer: () => {}
    });
    expect(() => pool.prewarm(KEY)).not.toThrow();
    expect(pool.size()).toBe(0);
  });

  it("drop ve dropAll", () => {
    const h = harness();
    h.pool.prewarm({ ...KEY, chatId: "a" });
    h.pool.prewarm({ ...KEY, chatId: "b" });
    h.pool.drop("a");
    expect(h.killed).toEqual([h.children[0]]);
    expect(h.pool.size()).toBe(1);
    h.pool.drop("yok");
    h.pool.dropAll();
    expect(h.killed).toEqual([h.children[0], h.children[1]]);
    expect(h.pool.size()).toBe(0);
  });

  it("öldürme atarsa istisna dışarı kaçmıyor", () => {
    const pool = createPrewarmPool({
      spawn: () => new FakeChild() as never,
      env: () => ({}),
      killTree: () => {
        throw new Error("taskkill");
      },
      setTimer: () => 0,
      clearTimer: () => {}
    });
    pool.prewarm(KEY);
    expect(() => pool.dropAll()).not.toThrow();
    expect(pool.size()).toBe(0);
  });
});
