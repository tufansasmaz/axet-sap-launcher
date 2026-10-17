// Doğrulama çalıştırıcısı (spec 2026-10-18 gorev-panosu §6, §7, §10). Sahte süreç.
import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { runVerification, tailOf, type VerifyChild, type VerifyDeps } from "../app-electron/main/boardVerify";

class FakeChild extends EventEmitter {
  pid = 77;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  out(text: string) {
    this.stdout.emit("data", Buffer.from(text, "utf-8"));
  }
  err(text: string) {
    this.stderr.emit("data", Buffer.from(text, "utf-8"));
  }
  exit(code: number | null) {
    this.emit("close", code);
  }
}

type Script = (command: string, child: FakeChild) => void;

function harness(script: Script, over: Partial<VerifyDeps> = {}) {
  const spawned: { command: string; cwd: string }[] = [];
  const killed: number[] = [];
  const deps: VerifyDeps = {
    spawn: (command, cwd) => {
      const child = new FakeChild();
      spawned.push({ command, cwd });
      setTimeout(() => script(command, child), 0);
      return child as unknown as VerifyChild;
    },
    killTree: (child) => {
      killed.push(child.pid ?? 0);
      setTimeout(() => (child as unknown as FakeChild).exit(null), 0);
    },
    dirExists: () => true,
    now: () => Date.now(),
    timeoutMs: 1_000,
    killGraceMs: 50,
    ...over
  };
  return { deps, spawned, killed };
}

describe("runVerification", () => {
  it("hepsi 0 → ok; sırayla, alan kökünde", async () => {
    const h = harness((_c, child) => {
      child.out("tamam\n");
      child.exit(0);
    });
    const proof = await runVerification(["npm run lint", "npm test"], "C:\\proje", h.deps).done;
    expect(proof.ok).toBe(true);
    expect(proof.kind).toBe("commands");
    expect(h.spawned).toEqual([
      { command: "npm run lint", cwd: "C:\\proje" },
      { command: "npm test", cwd: "C:\\proje" }
    ]);
    expect(proof.commands.map((c) => c.exitCode)).toEqual([0, 0]);
    expect(proof.commands[0].tail).toBe("tamam");
  });

  it("ilk kırmızıda duruyor; stdout ve stderr kanıtta", async () => {
    const h = harness((command, child) => {
      child.out(`${command} başladı\n`);
      child.err("HATA: 3 test kırmızı\n");
      child.exit(command === "npm run lint" ? 2 : 0);
    });
    const proof = await runVerification(["npm run lint", "npm test"], "C:\\p", h.deps).done;
    expect(proof.ok).toBe(false);
    expect(h.spawned).toHaveLength(1);
    expect(proof.commands).toHaveLength(1);
    expect(proof.commands[0].exitCode).toBe(2);
    expect(proof.commands[0].tail).toContain("HATA: 3 test kırmızı");
  });

  it("süre aşımı: ağaç kapatılıyor, timedOut, çıkış kodu null, sonraki komut çalışmıyor", async () => {
    const h = harness(() => {}, { timeoutMs: 20 });
    const proof = await runVerification(["npm test", "npm run e2e"], "C:\\p", h.deps).done;
    expect(h.killed).toEqual([77]);
    expect(proof.commands).toEqual([expect.objectContaining({ command: "npm test", exitCode: null, timedOut: true })]);
    expect(proof.ok).toBe(false);
    expect(h.spawned).toHaveLength(1);
  });

  it("ağaç kapatma süreci bitiremezse bile kanıt geliyor (killGraceMs)", async () => {
    const h = harness(() => {}, { timeoutMs: 10, killGraceMs: 20, killTree: () => {} });
    const proof = await runVerification(["npm test"], "C:\\p", h.deps).done;
    expect(proof.commands[0]).toMatchObject({ exitCode: null, timedOut: true });
  });

  it("başlatılamadı (spawn atıyor ya da 'error' olayı): exitCode null, hata metni kanıtta", async () => {
    const thrown = harness(() => {}, {
      spawn: () => {
        throw new Error("spawn EPERM");
      }
    });
    const a = await runVerification(["npm test"], "C:\\p", thrown.deps).done;
    expect(a.commands[0]).toMatchObject({ exitCode: null, error: "spawn" });
    expect(a.commands[0].tail).toContain("spawn EPERM");
    const evented = harness((_c, child) => child.emit("error", new Error("spawn cmd.exe ENOENT")));
    const b = await runVerification(["npm test"], "C:\\p", evented.deps).done;
    expect(b.commands[0]).toMatchObject({ exitCode: null, error: "spawn" });
    expect(b.ok).toBe(false);
  });

  it("klasör yoksa hiçbir komut çalışmıyor; missingDir", async () => {
    const h = harness(() => {}, { dirExists: () => false });
    const proof = await runVerification(["npm test"], "C:\\yok", h.deps).done;
    expect(h.spawned).toEqual([]);
    expect(proof.commands[0]).toMatchObject({ command: "npm test", exitCode: null, error: "missingDir" });
    expect(proof.ok).toBe(false);
  });

  it("iptal: süren komutun ağacı kapatılıyor, ok false", async () => {
    const h = harness(() => {});
    const run = runVerification(["npm test"], "C:\\p", h.deps);
    await new Promise((r) => setTimeout(r, 5));
    run.cancel();
    const proof = await run.done;
    expect(h.killed).toEqual([77]);
    expect(proof.ok).toBe(false);
  });
});

describe("tailOf", () => {
  it("son 40 satır, ANSI ve sondaki boş satırlar atılıyor", () => {
    const text = Array.from({ length: 100 }, (_, i) => `\x1b[32msatır ${i}\x1b[0m`).join("\r\n") + "\r\n\r\n";
    const tail = tailOf(text).split("\n");
    expect(tail).toHaveLength(40);
    expect(tail[0]).toBe("satır 60");
    expect(tail[39]).toBe("satır 99");
  });

  it("8 KB'ı aşmıyor, sonu korunuyor, baştaki kırık karakter atılıyor", () => {
    const long = "ğ".repeat(10_000) + "\nSON";
    const tail = tailOf(long);
    expect(Buffer.byteLength(tail, "utf-8")).toBeLessThanOrEqual(8192);
    expect(tail.endsWith("SON")).toBe(true);
    expect(tail.startsWith("\uFFFD")).toBe(false);
  });
});
