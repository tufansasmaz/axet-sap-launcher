// Ana surecin yakalanmamis hatalari gunluge yaziliyor, pencere yagmuru yok
// (kararlilik-2 R8e).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DIALOG_THROTTLE_MS, createProcessErrorReporter } from "../app-electron/main/processErrors";

function setup() {
  let now = 1_000;
  const deps = {
    log: vi.fn(),
    showDialog: vi.fn(),
    dialogTitle: () => "Beklenmeyen hata",
    now: () => now
  };
  return { deps, reporter: createProcessErrorReporter(deps), advance: (ms: number) => (now += ms) };
}

describe("createProcessErrorReporter", () => {
  it("yakalanmamis hata gunluge tek satir yazilir ve pencere acilir", () => {
    const { deps, reporter } = setup();
    reporter.uncaught(new Error("bir\nhata"));
    expect(deps.log).toHaveBeenCalledWith("hata.yakalanmamis", { tur: "exception", ileti: "bir hata" });
    expect(deps.showDialog).toHaveBeenCalledOnce();
  });

  it("ayni hata dakikada bir kez pencere acar, gunluge her seferinde yazilir", () => {
    const { deps, reporter, advance } = setup();
    for (let i = 0; i < 5; i++) reporter.uncaught(new Error("tekrar"));
    expect(deps.showDialog).toHaveBeenCalledTimes(1);
    expect(deps.log).toHaveBeenCalledTimes(5);
    advance(DIALOG_THROTTLE_MS);
    reporter.uncaught(new Error("tekrar"));
    expect(deps.showDialog).toHaveBeenCalledTimes(2);
  });

  it("islenmemis reddetme gunluge yazilir, pencere acmaz", () => {
    const { deps, reporter } = setup();
    reporter.rejection("baglanti koptu");
    reporter.rejection({ code: 5 });
    expect(deps.log).toHaveBeenNthCalledWith(1, "hata.yakalanmamis", { tur: "rejection", ileti: "baglanti koptu" });
    expect(deps.log).toHaveBeenNthCalledWith(2, "hata.yakalanmamis", { tur: "rejection", ileti: '{"code":5}' });
    expect(deps.showDialog).not.toHaveBeenCalled();
  });

  it("gunluk yazilamasa da patlamaz", () => {
    const { deps, reporter } = setup();
    deps.log.mockImplementation(() => {
      throw new Error("disk dolu");
    });
    expect(() => reporter.uncaught(new Error("x"))).not.toThrow();
    expect(() => reporter.rejection("y")).not.toThrow();
  });

  it("ana surec bu raporlayiciyi kullaniyor", () => {
    const index = readFileSync(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8");
    expect(index).toMatch(/process\.on\("uncaughtException", \(err\) => processErrors\.uncaught\(err\)\)/);
    expect(index).toMatch(/process\.on\("unhandledRejection", \(reason\) => processErrors\.rejection\(reason\)\)/);
  });
});
