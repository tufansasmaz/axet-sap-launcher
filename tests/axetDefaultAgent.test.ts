// Sohbet ajanı (axet151 madde 1): `--agent` verilmezse axet-code
// `options.default_agent`'ı kullanıyor. Ad yapılandırmadan YALNIZ OKUNUYOR.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));

const { getAxetDefaultAgent } = await import("../app-electron/main/axetModels");

let base = "";
const prev = process.env.LOCALAPPDATA;
const cfg = () => path.join(base, "axet-code", "axet-code.json");
beforeEach(() => {
  base = mkdtempSync(path.join(os.tmpdir(), "ajan-"));
  mkdirSync(path.join(base, "axet-code"));
  process.env.LOCALAPPDATA = base;
});
afterEach(() => {
  process.env.LOCALAPPDATA = prev;
});

describe("getAxetDefaultAgent", () => {
  it("options.default_agent okunuyor, dosya değişmiyor", () => {
    const body = JSON.stringify({ models: {}, options: { default_agent: "security" } });
    writeFileSync(cfg(), body);
    expect(getAxetDefaultAgent()).toBe("security");
    expect(readFileSync(cfg(), "utf-8")).toBe(body);
  });
  it("yok / bozuk / güvensiz ad → null", () => {
    expect(getAxetDefaultAgent()).toBeNull();
    writeFileSync(cfg(), "{bozuk");
    expect(getAxetDefaultAgent()).toBeNull();
    writeFileSync(cfg(), JSON.stringify({ options: { default_agent: "a b;calc" } }));
    expect(getAxetDefaultAgent()).toBeNull();
    writeFileSync(cfg(), JSON.stringify({ options: { default_agent: 5 } }));
    expect(getAxetDefaultAgent()).toBeNull();
  });
});
