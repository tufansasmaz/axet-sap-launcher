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
