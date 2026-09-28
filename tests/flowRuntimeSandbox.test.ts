// FlowRuntime + FlowSandboxHost + sahte sayfa: function / excel node'larının
// sandbox üzerinden uçtan uca eskisi gibi çalıştığını gösteren testler.

import { describe, expect, it } from "vitest";
import { FlowRuntime } from "../app-electron/main/flowRuntime.js";
import { FlowSandboxHost } from "../app-electron/main/flowSandboxHost";
import { createFakePages } from "./flowSandboxFakePage";

type AnyNode = Record<string, unknown>;
type DebugEvent = { nodeId: string; payload: unknown; error?: boolean };

function setup(nodes: AnyNode[], withSandbox = true) {
  const { factory, pages } = createFakePages();
  const sandbox = withSandbox ? new FlowSandboxHost(factory) : undefined;
  const debug: DebugEvent[] = [];
  const logs: Array<{ level: string; text: string }> = [];
  const rt = new FlowRuntime({
    sandbox,
    onDebug: (e: DebugEvent) => debug.push(e),
    onLog: (e: { level: string; text: string }) => logs.push(e)
  }) as unknown as {
    nodesById: Record<string, AnyNode>;
    _emit(id: string, msg: unknown, path: string[]): Promise<void>;
    _functionEnv(node: AnyNode): Record<string, unknown>;
    stop(): Promise<void>;
    globalContextStore: Record<string, unknown>;
  };
  for (const n of nodes) rt.nodesById[n.id as string] = n;
  const fire = (id: string, msg: unknown) => rt._emit(id, msg, [id]);
  return { rt, debug, logs, pages, sandbox, fire };
}

const tab = {
  id: "tab1",
  type: "tab",
  label: "Akis",
  env: [
    { name: "HEDEF", value: "dev", type: "str" },
    { name: "ADET", value: "3", type: "num" },
    { name: "GIZLI", value: "x", type: "cred" }
  ]
};
const globalConfig = { id: "gc", type: "global-config", env: [{ name: "HEDEF", value: "genel", type: "str" }, { name: "ORTAK", value: "true", type: "bool" }] };

describe("FlowRuntime — function node sandbox'ta", () => {
  it("return değeri ve node.send çıkışlara gidiyor", async () => {
    const { debug, fire } = setup([
      tab,
      {
        id: "f",
        type: "function",
        z: "tab1",
        name: "hesap",
        func: "node.send([null, { payload: 'yan' }]); msg.payload = msg.payload * 2; return [msg, null];",
        wires: [["d1"], ["d2"]]
      },
      { id: "d1", type: "debug", z: "tab1" },
      { id: "d2", type: "debug", z: "tab1" }
    ]);
    await fire("f", { payload: 21, _msgid: "m1" });
    expect(debug.map((e) => [e.nodeId, e.payload])).toEqual([
      ["d2", "yan"],
      ["d1", 42]
    ]);
  });

  it("kod hatası debug'a hata olarak düşüyor, send'ler bırakılıyor", async () => {
    const { debug, fire, rt } = setup([
      { id: "f", type: "function", func: "node.send({ payload: 1 }); throw new Error('patladi');", wires: [["d"]] },
      { id: "d", type: "debug" }
    ]);
    await fire("f", { payload: 0 });
    expect(debug).toHaveLength(1);
    expect(debug[0].error).toBe(true);
    expect((debug[0].payload as { error: string }).error).toBe("patladi");
    expect(rt.nodesById.f.__pendingSends).toBeFalsy();
  });

  it("global context flow'lar arasında ana süreçte kalıyor", async () => {
    const { fire, rt, debug } = setup([
      { id: "a", type: "function", z: "t1", func: "global.set('say', (global.get('say') || 0) + 1); flow.set('f', 1); return null;" },
      { id: "b", type: "function", z: "t2", func: "return { payload: [global.get('say'), flow.get('f')] };", wires: [["d"]] },
      { id: "d", type: "debug" }
    ]);
    await fire("a", {});
    await fire("a", {});
    await fire("b", {});
    expect(rt.globalContextStore.say).toBe(2);
    expect(debug[0].payload).toEqual([2, undefined]);
  });

  it("env: global-config < sekme < NR_*, process.env ve cred görünmüyor", async () => {
    process.env.S4_FLOW_GIZLI = "sizmamali";
    try {
      const node = { id: "f", type: "function", z: "tab1", name: "env", wires: [["d"]] };
      const { rt, fire, debug } = setup([
        tab,
        globalConfig,
        {
          ...node,
          func: "return { payload: ['HEDEF','ADET','ORTAK','GIZLI','S4_FLOW_GIZLI','PATH','NR_NODE_ID','NR_FLOW_NAME'].map((k) => env.get(k)) };"
        },
        { id: "d", type: "debug" }
      ]);
      const env = rt._functionEnv(rt.nodesById.f);
      expect(env).toEqual({
        HEDEF: "dev",
        ADET: 3,
        ORTAK: true,
        NR_NODE_ID: "f",
        NR_NODE_NAME: "env",
        NR_FLOW_ID: "tab1",
        NR_FLOW_NAME: "Akis"
      });
      await fire("f", {});
      expect(debug[0].payload).toEqual(["dev", 3, true, undefined, undefined, undefined, "f", "Akis"]);
    } finally {
      delete process.env.S4_FLOW_GIZLI;
    }
  });

  it("sandbox verilmemişse function node açık bir hatayla duruyor", async () => {
    const { fire, debug } = setup([{ id: "f", type: "function", func: "return msg;" }], false);
    await fire("f", {});
    expect((debug[0].payload as { error: string }).error).toMatch(/Flow sandbox kurulmamis/);
  });

  it("stop sandbox sayfasını atıyor", async () => {
    const { fire, rt, pages } = setup([{ id: "f", type: "function", func: "return null;" }]);
    await fire("f", {});
    expect(pages).toHaveLength(1);
    expect(pages[0].destroyed).toBe(false);
    await rt.stop();
    expect(pages[0].destroyed).toBe(true);
  });
});

describe("FlowRuntime — excel node'ları sandbox'ta", () => {
  it("json-to-excel → excel-to-json turu; çıktının şekli eskisiyle aynı", async () => {
    const { fire, debug } = setup([
      { id: "w", type: "json-to-excel", wires: [["r"]] },
      { id: "r", type: "excel-to-json", wires: [["d"]] },
      { id: "d", type: "debug" }
    ]);
    await fire("w", { payload: { data: { Liste: [{ Ad: "Ali", Tutar: 5 }] } } });
    const payload = debug[0].payload as { buffer: Buffer; checksum: string; data: unknown; config: unknown };
    expect(Buffer.isBuffer(payload.buffer)).toBe(true);
    expect(typeof payload.checksum).toBe("string");
    expect(payload.data).toEqual({ Liste: [{ Ad: "Ali", Tutar: 5 }] });
    expect(payload.config).toEqual({ offset: undefined, header: undefined });
  });

  it("doğrulama hataları eskisi gibi ana süreçte veriliyor", async () => {
    const { fire, debug } = setup([
      { id: "w", type: "json-to-excel" },
      { id: "r", type: "excel-to-json" }
    ]);
    await fire("w", { payload: {} });
    await fire("w", { payload: { data: [1, 2] } });
    await fire("r", { payload: "buffer degil" });
    expect(debug.map((e) => (e.payload as { error: string }).error)).toEqual([
      "json-to-excel: msg.payload.data does not exist",
      expect.stringMatching(/^json-to-excel: msg\.payload\.data bir obje olmali/),
      "excel-to-json: msg.payload must be a Buffer"
    ]);
  });
});
