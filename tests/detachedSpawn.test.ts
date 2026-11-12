// Ayrik surec baslatma hatasi yakalanir (kararlilik-2 R8e).
// Olcum: dinleyicisiz `spawn` hatasi eszamansiz `error` olayi -> uncaughtException.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { spawnDetached } from "../app-electron/main/detachedSpawn";

describe("spawnDetached", () => {
  it("olmayan program: hata bildirilir, surec dusmez", async () => {
    const uncaught = vi.fn();
    process.on("uncaughtException", uncaught);
    try {
      const onError = vi.fn();
      const started = spawnDetached("kesinlikle-olmayan-program-xyz-123", [], { stdio: "ignore", windowsHide: true }, onError);
      expect(started).toBe(true);
      const deadline = Date.now() + 5000;
      while (onError.mock.calls.length === 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
      expect(onError).toHaveBeenCalledOnce();
      expect((onError.mock.calls[0][0] as NodeJS.ErrnoException).code).toBe("ENOENT");
      expect(uncaught).not.toHaveBeenCalled();
    } finally {
      process.off("uncaughtException", uncaught);
    }
  });

  it("SAP Logon'da Ac bu yolu kullaniyor (ciplak spawn yok)", () => {
    const code = readFileSync(path.join(__dirname, "..", "app-electron", "main", "sapLogon.ts"), "utf8")
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toMatch(/\bspawn\(/);
    expect(code.match(/spawnDetached\(/g)?.length).toBe(2);
  });
});
