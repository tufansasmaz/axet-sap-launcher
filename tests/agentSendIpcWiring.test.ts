// Akış mesaj kutusu: ana süreç bağlantısı kilitleri — kaynak düzeyinde
// (bkz. memoryIpcWiring.test.ts). Spec 2026-10-18 ajanlar-yeniden §2.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");

describe("agents:send", () => {
  it("yalnız ana pencereden; yalnız kimlikler ve metin", () => {
    expect(main).toMatch(/ipcMain\.handle\(\s*"agents:send",\s*async \(event, workspaceId: unknown, paneId: unknown, text: unknown\) => \{\s*if \(!mainWindow \|\| mainWindow\.isDestroyed\(\) \|\| event\.sender !== mainWindow\.webContents\) \{\s*return \{ ok: false, reason: "invalid" \};/);
    expect(main).toMatch(/return await agentSender\.send\(workspaceId, paneId, text\);/);
    expect(preload).toContain('ipcRenderer.invoke("agents:send", workspaceId, paneId, text)');
    expect(types).toMatch(/agentSend: \(workspaceId: string, paneId: string, text: string\) => Promise<AgentSendResult>;/);
  });

  it("istem Görev Panosu'nun yolundan; alan yalnız config'ten; ajan izleyiciden", () => {
    expect(main).toMatch(/createAgentSender\(\{[\s\S]{0,600}sendPrompt: \(paneId, text, onSettled\) => agentMonitor\.sendPrompt\(paneId, text, onSettled\)/);
    expect(main).toMatch(/createAgentSender\(\{\s*workspace: \(id\) => loadConfig\(\)\.terminalWorkspaces\.some\(\(w\) => w\.id === id\)/);
    expect(main).toMatch(/createAgentSender\(\{[\s\S]{0,300}a\.reg\.paneId === paneId && a\.reg\.workspaceId === workspaceId/);
  });
});
