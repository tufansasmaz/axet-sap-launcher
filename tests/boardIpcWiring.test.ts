// Görev Panosu IPC bağlantıları — kaynak düzeyinde kilit (bkz. agentIpcWiring.test.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");

describe("Görev Panosu — IPC bağlantısı", () => {
  it("kanallar ana süreçte, preload'da ve tiplerde", () => {
    for (const channel of ["board:get", "board:command", "board:changed", "board:open"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["boardGet:", "boardCommand:", "onBoardChanged:", "onBoardOpen:"]) expect(types, name).toContain(name);
  });

  it("renderer'ın komutu doğrulanarak geçiyor", () => {
    expect(main).toMatch(/"board:command"[\s\S]{0,300}readBoardCommand\(/);
  });

  it("doğrulama komutu ve klasör yalnız config'teki alan kaydından", () => {
    expect(main).toMatch(/workspace:\s*\(id\)\s*=>[\s\S]{0,200}boardWorkspaceInfo\(/);
  });

  it("zamanlayıcı kuruluyor ve kapanışta iki yerde de durduruluyor", () => {
    expect(main).toMatch(/setInterval\(\s*\(\)\s*=>\s*boardManager\.tick\(\)/);
    expect(main.match(/stopBoardManager\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("ajan durum olayı panoyu da tetikliyor (ertelenmiş, tek seferde)", () => {
    expect(main).toMatch(/"agents:status", event\);[\s\S]{0,200}queueBoardTick\(\)/);
    expect(main).toMatch(/function queueBoardTick[\s\S]{0,300}setImmediate\(/);
  });

  it("alan silinince pano config:save'de budanıyor", () => {
    expect(main).toMatch(/"config:save"[\s\S]{0,1200}boardManager\.prune\(/);
  });

  it("bildirim tıklaması board:open; ayar chatNotifications", () => {
    expect(main).toMatch(/function showBoardNotification[\s\S]*chatNotifications !== false[\s\S]*"board:open"/);
  });
});
