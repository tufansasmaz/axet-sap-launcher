// R1 (1.9.x kullanıcı raporu): açılışta Windows "This app can't run on your PC"
// penceresi, model seçici "Yükleniyor..." kalıyor.
//
// Ölçüldü (2026-11-12, bu makinede, PATH başına 0 baytlık bir axet-code.exe
// konarak):
//   * `exec("axet-code models")` (cmd.exe üzerinden) → pencereyi cmd.exe
//     açıyor; exec zaman aşımında cmd öldürülünce pencere kapanıyor.
//   * `execFile`/`spawn` → EFTYPE'ı SENKRON fırlatıyor ('error' olayı değil):
//     `axetBinaryStatus` "bozuk" demek yerine reddediliyordu, Doktor/Hazırlık
//     raporu da onunla düşüyordu.
// Bozuk exe artık HİÇ çalıştırılmıyor; diskte okunarak (boyut + MZ/PE) tanınıyor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const execSpy = vi.fn();
const execFileSpy = vi.fn();
vi.mock("node:child_process", async (orig) => {
  const real = (await orig()) as typeof import("node:child_process");
  return {
    ...real,
    exec: (...a: unknown[]) => {
      execSpy(...a);
      return (real.exec as (...x: unknown[]) => unknown)(...a);
    },
    execFile: (...a: unknown[]) => {
      execFileSpy(...a);
      return (real.execFile as (...x: unknown[]) => unknown)(...a);
    }
  };
});
vi.mock("../app-electron/main/i18n", () => ({
  mt: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k)
}));

const { inspectExe, findOnPath } = await import("../app-electron/main/axetExe");
const { axetBinaryStatus } = await import("../app-electron/main/axetCodeVersion");
const { listAxetModels } = await import("../app-electron/main/axetModels");
const { defaultHeadlessDeps } = await import("../app-electron/main/axetHeadless");

/** En küçük geçerli PE başlığı: "MZ", e_lfanew=0x40, "PE\0\0". */
function tinyPe(): Buffer {
  const b = Buffer.alloc(0x80);
  b.write("MZ", 0, "latin1");
  b.writeUInt32LE(0x40, 0x3c);
  b.write("PE\0\0", 0x40, "latin1");
  return b;
}

let dir = "";
let savedPath: string | undefined;
let pathKey = "PATH";

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "axet-exe-"));
  pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === "path") ?? "PATH";
  savedPath = process.env[pathKey];
  execSpy.mockClear();
  execFileSpy.mockClear();
});

afterEach(() => {
  process.env[pathKey] = savedPath;
});

describe("inspectExe", () => {
  it("0 bayt → bozuk (empty)", () => {
    const f = path.join(dir, "a.exe");
    writeFileSync(f, "");
    expect(inspectExe(f)).toEqual({ kind: "broken", path: f, reason: "empty" });
  });

  it("MZ yok ya da PE imzası yok → bozuk (notPe)", () => {
    const f = path.join(dir, "b.exe");
    writeFileSync(f, Buffer.alloc(4096));
    expect(inspectExe(f)).toMatchObject({ kind: "broken", reason: "notPe" });
    const g = path.join(dir, "c.exe");
    const head = tinyPe();
    head.write("XX", 0x40, "latin1");
    writeFileSync(g, head);
    expect(inspectExe(g)).toMatchObject({ kind: "broken", reason: "notPe" });
  });

  it("geçerli PE başlığı → ok", () => {
    const f = path.join(dir, "d.exe");
    writeFileSync(f, tinyPe());
    expect(inspectExe(f)).toEqual({ kind: "ok", path: f });
  });
});

describe("findOnPath", () => {
  it("PATH sırasıyla ve PATHEXT ile buluyor, çalıştırmadan", () => {
    const a = path.join(dir, "a");
    const b = path.join(dir, "b");
    const files = new Set([path.join(b, "axet-code.exe"), path.join(a, "axet-code.cmd")]);
    const found = findOnPath("axet-code", { PATH: `${a};${b}`, PATHEXT: ".EXE;.CMD" }, (p) => files.has(p));
    // PATH'te önce gelen klasör kazanır (cmd.exe'nin sırası); klasör içinde PATHEXT sırası.
    expect(found).toBe(path.join(a, "axet-code.cmd"));
  });
});

describe("bozuk axet-code.exe hiç çalıştırılmıyor", () => {
  beforeEach(() => {
    writeFileSync(path.join(dir, "axet-code.exe"), "");
    process.env[pathKey] = `${dir};${savedPath ?? ""}`;
  });

  it("axetBinaryStatus reddedilmiyor, 'broken' dönüyor; exe çalıştırılmıyor", async () => {
    const status = await axetBinaryStatus(true);
    expect(status.kind).toBe("broken");
    expect(execFileSpy).not.toHaveBeenCalled();
  });

  it("model listesi cmd.exe'yi hiç açmıyor (pencere yok), kurtarma metni dönüyor", async () => {
    const r = await listAxetModels();
    expect(r.ok).toBe(false);
    expect(r.error).toContain("chat.axetBroken");
    expect(execSpy).not.toHaveBeenCalled();
  });

  it("başsız tur / ısıtma spawn'ı fırlatmıyor, 'error' olayı veriyor", async () => {
    const child = defaultHeadlessDeps().spawn("axet-code", ["run"], { cwd: dir, env: process.env });
    const err = await new Promise<Error>((resolve) => (child as unknown as NodeJS.EventEmitter).once("error", resolve));
    expect(String(err.message)).toContain("chat.axetBroken");
  });
});
