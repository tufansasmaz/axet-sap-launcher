// Kalıcı bellek: ana süreç bağlantısı ve veri güvenliği kilitleri — kaynak
// düzeyinde (bkz. browserIpcWiring.test.ts). Spec 2026-10-18 ajan-bellegi §3, §6.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");
const files = read("app-electron", "main", "memoryFiles.ts");
const notifier = read("app-electron", "main", "memoryNotifier.ts");
const service = read("app-electron", "main", "memoryService.ts");

describe("Bellek — bağlantı (§3, §6)", () => {
  it("bellek satırı pano turundan ÖNCE: hem ertelenmiş turda hem zamanlayıcıda", () => {
    expect(main).toMatch(/function queueBoardTick[\s\S]{0,300}tickMemoryNotifier\(\);[\s\S]{0,120}boardManager\.tick\(\)/);
    expect(main).toMatch(/setInterval\(\s*\(\)\s*=>\s*\{\s*tickMemoryNotifier\(\);[\s\S]{0,100}boardManager\.tick\(\)/);
    expect(main).toMatch(/function tickMemoryNotifier\(\): void \{\s*try \{\s*memoryNotifier\.tick\(\);/);
  });

  it("bildirim Görev Panosu'nun yolundan; anahtar ve kök yalnız config'ten", () => {
    expect(main).toMatch(/createMemoryNotifier\(\{[\s\S]{0,500}sendPrompt: \(paneId, text, onSettled\) => agentMonitor\.sendPrompt\(paneId, text, onSettled\)/);
    expect(main.match(/workspaces: \(\) => loadConfig\(\)\.terminalWorkspaces/g)).toHaveLength(2);
  });

  it("dört IPC yalnız ana pencereden ve yalnız kimliklerle", () => {
    for (const channel of ["memory:read", "memory:write", "memory:reveal", "memory:renotify"]) {
      expect(main, channel).toMatch(new RegExp(`"${channel}",[\\s\\S]{0,200}memoryFromMain\\(event\\.sender\\)`));
    }
    expect(main).toMatch(/function memoryFromMain\(sender: unknown\): boolean \{\s*return !!mainWindow && !mainWindow\.isDestroyed\(\) && sender === mainWindow\.webContents;/);
    expect(preload).toContain('ipcRenderer.invoke("memory:read", workspaceId, paneId)');
    expect(preload).toContain('ipcRenderer.invoke("memory:write", workspaceId, paneId, content, stamp)');
    expect(preload).toContain('ipcRenderer.invoke("memory:reveal", workspaceId, paneId)');
    expect(preload).toContain('ipcRenderer.invoke("memory:renotify", workspaceId, paneId)');
    expect(types).toMatch(/memoryRead: \(workspaceId: string, paneId: string\) => Promise<MemoryReadResult>;/);
  });
});

describe("Bellek — veri güvenliği kilitleri (§1, §2, §6)", () => {
  it("bellek dosyası hiçbir yolda silinmiyor; her yazma 'wx'", () => {
    expect(files).not.toMatch(/rmSync|rmdirSync|truncateSync|appendFileSync/);
    // Tek silme yolu: kendi geçici dosyamız (dropTemp).
    expect(files.match(/unlinkSync\(/g)).toHaveLength(1);
    expect(files).not.toMatch(/unlinkSync\((?!temp\))/);
    expect(files.match(/writeFileSync\(/g)?.length).toBe(files.match(/flag: "wx"/g)?.length);
    // Geçici dosya openSync ile açılıyor: o da yalnız "wx".
    expect(files.match(/openSync\(/g)?.length).toBe(files.match(/openSync\(temp, "wx"\)/g)?.length);
    expect(files).toMatch(/memoryStamp\(readFileSync\(file\)\) !== expectedStamp[\s\S]{0,200}renameSync\(temp, file\)/);
  });

  it("günlükte yalnız sonuç, deneme, bayt", () => {
    for (const call of notifier.match(/log\(\{[^}]*\}\)/g) ?? []) expect(call).toMatch(/^log\(\{ sonuc: [^,]+, deneme: [^}]+ \}\)$/);
    expect(service).toMatch(/"bellek\.kaydet"/);
    expect(service).not.toMatch(/log\([^)]*(content|rel|root|key)/);
  });

  it("yeni dosyalarda görünmez ya da bidi karakter yok", () => {
    const invisible = new RegExp("[" + [0x200b, 0x200f, 0x202a, 0x202e, 0x2066, 0x2069].map((n, i) => (i % 2 ? "-" : "") + String.fromCharCode(n)).join("") + String.fromCharCode(0x2028, 0x2029, 0xfeff) + "]");
    for (const [name, src] of Object.entries({ files, notifier, service, logic: read("app-electron", "shared", "memoryLogic.ts"), notice: read("app-electron", "shared", "memoryNotice.ts") })) {
      expect(invisible.test(src), name).toBe(false);
    }
  });
});
