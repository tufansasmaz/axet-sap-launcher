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
    // Zamanlayıcı try/catch sarmalıdır (queueBoardTick ile tutarlı).
    expect(main).toMatch(/setInterval\(\s*\(\)\s*=>\s*\{[\s\S]{0,100}boardManager\.tick\(\)[\s\S]{0,100}\}/);
    // Tanım satırı dışında en az iki çağrı yeri (window-all-closed + before-quit).
    expect(main.match(/stopBoardManager\(\);/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("ajan durum olayı panoyu da tetikliyor (ertelenmiş, tek seferde)", () => {
    expect(main).toMatch(/"agents:status", event\);[\s\S]{0,200}queueBoardTick\(\)/);
    expect(main).toMatch(/function queueBoardTick[\s\S]{0,300}setImmediate\(/);
  });

  it("config:save hiçbir panoyu silmiyor (Boş başla / geri yükleme şeridi görev silmez)", () => {
    const save = main.slice(main.indexOf('ipcMain.handle("config:save"'));
    const body = save.slice(0, save.indexOf("ipcMain.handle(", 10));
    expect(body).not.toMatch(/boardManager\.(prune|drop)/);
    expect(main).not.toMatch(/boardManager\.prune\(/);
  });

  it("pano yalnız açık alan kapatmada ayrı kanaldan siliniyor; kimlik deseni denetleniyor", () => {
    expect(main).toMatch(/"board:dropWorkspace"[\s\S]{0,300}isBoardId\([\s\S]{0,300}boardManager\.drop\(/);
    expect(preload).toMatch(/boardDropWorkspace:[\s\S]{0,120}"board:dropWorkspace"/);
    expect(types).toContain("boardDropWorkspace:");
  });

  it("bildirim tıklaması board:open; ayar chatNotifications", () => {
    expect(main).toMatch(/function showBoardNotification[\s\S]{0,600}chatNotifications !== false[\s\S]{0,700}"board:open"/);
  });

  it("board:get ve board:command kayıtlı olmayan alan workspaceId denetimi", () => {
    // board:get: boardWorkspaceInfo kontrolü, yöneticiye gitmeden önce
    expect(main).toMatch(/"board:get"[\s\S]{0,400}boardWorkspaceInfo\([\s\S]{0,200}boardManager\.get\(/);
    // board:command: boardWorkspaceInfo kontrolü, yöneticiye gitmeden önce
    expect(main).toMatch(/"board:command"[\s\S]{0,500}boardWorkspaceInfo\([\s\S]{0,300}boardManager\.command\(/);
  });
});
