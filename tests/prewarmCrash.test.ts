// Önceden açık `axet-code run` süreci uygulama çökünce ne oluyor?
//
// Ölçüm (2026-11-12, .superpowers/olcum/axet151/bos-stdin + cokme-job):
// stdin 0 baytla kapanırsa `run` boş istemle tur başlatıyor; ama ana süreç
// ölünce axet-code aynı anda ölüyor, çünkü libuv (Node/Electron
// child_process) her çocuğu KILL_ON_JOB_CLOSE işli bir Job Object'e koyuyor.
// Gerçek Electron + gerçek axet-code ile doğrulandı: oturum açılmadı.
//
// Bu güvence YALNIZ `detached` kullanılmadığı sürece geçerli: `detached: true`
// çocuğu işten koparır ve çökmede boş istemli tur başlar (aşağıdaki karşıt
// senaryo bunu gösteriyor). Testler o kapıyı kilitliyor.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const spawned: { cmd: string; opts: Record<string, unknown> }[] = [];
vi.mock("node:child_process", async (orig) => {
  const real = await orig<typeof import("node:child_process")>();
  return {
    ...real,
    spawn: (...a: Parameters<typeof real.spawn>) => {
      if (a[0] === "kayit-axet") {
        spawned.push({ cmd: a[0], opts: (a[2] ?? {}) as Record<string, unknown> });
        return { on: () => undefined, stdin: null, stdout: null, stderr: null };
      }
      return real.spawn(...a);
    }
  };
});
vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({ noteUpdateLine: vi.fn() }));

const { spawnAxetSafely } = await import("../app-electron/main/axetHeadless");

describe("spawnAxetSafely", () => {
  it("çocuğu ayırmıyor (detached yok): ana süreçle aynı işte kalıp onunla ölmeli", () => {
    spawnAxetSafely("kayit-axet", ["run"], { cwd: ".", env: {} });
    expect(spawned).toHaveLength(1);
    expect(spawned[0].opts.detached).toBeFalsy();
    expect(spawned[0].opts.stdio).toEqual(["pipe", "pipe", "pipe"]);
  });
});

const win = process.platform === "win32";
describe.skipIf(!win)("çökme benzetimi (Windows, gerçek süreçler)", () => {
  const alive = (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function crash(detached: boolean) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "cokme-"));
    const marker = path.join(dir, "tur-basladi.txt");
    const pidFile = path.join(dir, "pid.json");
    const fakeAxet = path.join(dir, "sahte-axet.cjs");
    // Sahte axet-code: stdin kapanınca (boş istem) 1,5 sn sonra "tur" başlatıyor.
    writeFileSync(
      fakeAxet,
      `process.stdin.resume();process.stdin.on("end",()=>setTimeout(()=>require("fs").writeFileSync(${JSON.stringify(marker)},"x"),1500));setInterval(()=>{},1000);`
    );
    const fakeMain = path.join(dir, "sahte-ana.cjs");
    // spawnAxetSafely ile aynı seçenekler (windowsHide, üç boru); karşıt senaryoda + detached.
    writeFileSync(
      fakeMain,
      `const c=require("child_process").spawn(process.execPath,[${JSON.stringify(fakeAxet)}],{windowsHide:true,stdio:["pipe","pipe","pipe"]${detached ? ",detached:true" : ""}});
require("fs").writeFileSync(${JSON.stringify(pidFile)},String(c.pid));setInterval(()=>{},1000);`
    );
    const main = spawn(process.execPath, [fakeMain], { stdio: "ignore", windowsHide: true });
    for (let i = 0; i < 50 && !existsSync(pidFile); i++) await wait(100);
    const child = Number(readFileSync(pidFile, "utf-8"));
    await wait(500);
    execFileSync("taskkill", ["/PID", String(main.pid), "/F"], { stdio: "ignore" });
    // Yük altında (tam takım) sahte axet'in 1,5 sn'lik gecikmesi uzayabiliyor:
    // tur işaretini 8 sn'ye kadar bekle; işaret erken çıkarsa beklemeyi kes.
    for (let i = 0; i < 80 && !existsSync(marker); i++) await wait(100);
    const result = { childAlive: alive(child), turnStarted: existsSync(marker) };
    if (result.childAlive) execFileSync("taskkill", ["/PID", String(child), "/T", "/F"], { stdio: "ignore" });
    return result;
  }

  it("ana süreç taskkill /F ile ölünce ısıtma süreci de ölüyor, boş istemli tur başlamıyor", async () => {
    expect(await crash(false)).toEqual({ childAlive: false, turnStarted: false });
  }, 25_000);

  it("karşıt: detached çocuk çökmeden sağ çıkıyor ve boş istemle tur başlatıyor", async () => {
    expect(await crash(true)).toEqual({ childAlive: true, turnStarted: true });
  }, 25_000);
});
