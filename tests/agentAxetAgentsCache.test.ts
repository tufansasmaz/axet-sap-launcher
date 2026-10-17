// axetAgents IPC önbelleği — 10 dk; hata ve boş liste alınmıyor (spec §14.2).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/axetSpawnEnv", () => ({ axetSpawnEnv: () => ({}) }));

const { AXET_AGENTS_CACHE_MS, createAxetAgentsCache } = await import("../app-electron/main/agentEngineProbe");

const ENTRY = [{ name: "coder", scope: "builtin", permissions: "ask (default)", description: "Kod" }];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("axetAgents önbelleği", () => {
  it("10 dk içinde ikinci çağrı axet-code çalıştırmıyor", async () => {
    const list = vi.fn(async () => ENTRY);
    const cached = createAxetAgentsCache(list);
    const run = vi.fn(async () => "[]");

    await cached("C:\\p", run);
    vi.advanceTimersByTime(AXET_AGENTS_CACHE_MS - 1);
    await cached("C:\\p", run);

    expect(list).toHaveBeenCalledTimes(1);
  });

  it("10 dk sonra yeniden çalıştırıyor", async () => {
    const list = vi.fn(async () => ENTRY);
    const cached = createAxetAgentsCache(list);
    const run = vi.fn(async () => "[]");

    await cached("C:\\p", run);
    vi.advanceTimersByTime(AXET_AGENTS_CACHE_MS);
    await cached("C:\\p", run);

    expect(list).toHaveBeenCalledTimes(2);
  });

  it("hata fırlarsa önbelleğe alınmıyor", async () => {
    const list = vi.fn(async () => {
      throw new Error("çöktü");
    });
    const cached = createAxetAgentsCache(list);
    const run = vi.fn(async () => "[]");

    await cached("C:\\p", run);
    vi.advanceTimersByTime(AXET_AGENTS_CACHE_MS - 1);
    await cached("C:\\p", run);

    expect(list).toHaveBeenCalledTimes(2);
  });

  it("farklı cwd bağımsız önbellek", async () => {
    const list = vi.fn(async () => ENTRY);
    const cached = createAxetAgentsCache(list);
    const run = vi.fn(async () => "[]");

    await cached("C:\\a", run);
    await cached("C:\\b", run);
    vi.advanceTimersByTime(AXET_AGENTS_CACHE_MS - 1);
    await cached("C:\\a", run);
    await cached("C:\\b", run);

    expect(list).toHaveBeenCalledTimes(2);
  });

  it("AXET_AGENTS_CACHE_MS 10 dakika", () => {
    expect(AXET_AGENTS_CACHE_MS).toBe(10 * 60_000);
  });
});
