// Ajan Alanı IPC bağlantıları — kaynak düzeyinde kilit (bkz. appTerminalWiring.test.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");

describe("Ajan Alanı — motor sondajı IPC", () => {
  it("üç kanal ana süreçte, preload'da ve tiplerde", () => {
    for (const channel of ["agents:engines", "agents:axetAgents", "agents:which"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["agentEngines:", "axetAgents:", "agentWhich:"]) expect(types, name).toContain(name);
  });
});

describe("Ajan Alanı — izleyici bağlantısı", () => {
  it("izleyici kanalları ana süreçte, preload'da ve tiplerde", () => {
    for (const channel of ["agents:register", "agents:unregister", "agents:answer", "agents:snapshot", "agents:status", "agents:open"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["agentRegister:", "agentUnregister:", "agentAnswer:", "agentSnapshot:", "onAgentStatus:", "onAgentOpen:"]) {
      expect(types, name).toContain(name);
    }
  });

  it("terminal dinleyicisi kuruluyor; kullanıcı girdisi terminal:write'tan izleyiciye gidiyor", () => {
    expect(main).toContain("setTerminalTap(");
    expect(main).toMatch(/"terminal:write"[\s\S]{0,400}agentMonitor\.onInput\(/);
  });

  it("zamanlayıcı kuruluyor ve kapanışta iki yerde de durduruluyor", () => {
    expect(main).toMatch(/setInterval\(\s*\(\)\s*=>\s*agentMonitor\.tick\(\)/);
    // Tanım + window-all-closed + before-quit.
    expect(main.match(/stopAgentMonitor\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("bildirim tıklaması ajan bölmesini açıyor, ayar chatNotifications", () => {
    expect(main).toMatch(/function showAgentNotification[\s\S]*chatNotifications !== false[\s\S]*"agents:open"/);
  });
});
