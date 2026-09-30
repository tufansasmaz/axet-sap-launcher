// Terminal modu bağlantısı — kaynak düzeyinde kilit. Logon'un alttaki eski
// TerminalPanel'i kalktı (spec §1); geri gelirse iki ayrı terminal yolu
// olurdu ve pty'ler iki yerden yönetilirdi.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
// Yorumlar eski durumu anlatabilir; kontroller yalnız koda bakıyor.
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const app = code(read("src", "App.tsx"));
const tr = read("src", "i18n", "tr.ts");
const en = read("src", "i18n", "en.ts");

describe("App — terminal modu bağlı", () => {
  it("sağlayıcı, kenar çubuğu listesi ve ekran App'te", () => {
    expect(app).toContain("<TerminalStoreProvider");
    expect(app).toMatch(/visible=\{activity === "terminal"\}/);
    expect(app).toContain("<TerminalSidebar />");
    expect(app).toContain("<TerminalMode />");
  });

  it("proje terminali Terminal moduna geçip sayacı artırıyor", () => {
    expect(app).toContain('setActivity("terminal")');
    expect(app).toContain("setProjectTerminalRequest((n) => n + 1)");
  });
});

describe("App — eski terminal paneli yok", () => {
  it("TerminalPanel dosyası silindi", () => {
    expect(existsSync(path.join(ROOT, "src", "components", "TerminalPanel.tsx"))).toBe(false);
  });

  it("App'te eski panelin durumu ve işleyicileri yok", () => {
    for (const gone of [
      "TerminalPanel",
      "terminalFullscreen",
      "terminalPanelOpen",
      "terminalSessions",
      "onTerminalReady",
      "handleNewTerminal",
      "openConnectorHelperTerminal",
      "sidebarHidden",
      "TERMINAL_HEIGHT"
    ]) {
      expect(app, gone).not.toContain(gone);
    }
  });

  it("eski panelin metinleri silindi, oturum sonu metni kaldı", () => {
    for (const dict of [tr, en]) {
      expect(dict).not.toContain('"terminalPanel.');
      expect(dict).not.toContain('"app.toggleTerminalTitle"');
      expect(dict).not.toContain('"app.terminalDefaultTitle"');
      expect(dict).not.toContain('"app.terminalCreateFailed"');
      expect(dict).not.toContain('"appConnections.projectTerminalTitle"');
      // EmbeddedTerminal süreç bitince bunu yazıyor; silinirse ekranda anahtar adı çıkar.
      expect(dict).toContain('"app.terminalSessionEnded"');
    }
  });
});
