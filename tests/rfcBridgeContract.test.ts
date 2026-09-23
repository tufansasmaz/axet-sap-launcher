// Launcher ile adt_rfc_bridge.py arasındaki sözleşme — senkron script'i değiştirirse bu test kırılsın.
//
// Ölçülen olay (2026-09-24, LED, router'lı sistem): bağlanınca "RFC bridge 8788
// portunda ayağa kalkmadı. ERROR: RFC_ASHOST is not set." Yukarı akışın d2cb667
// senkronu köprüyü başka bir script'le değiştirmişti: ayarları `.env`'den
// `RFC_ASHOST` adıyla okuyor, router'ı zorunlu tutuyor, portu BRIDGE_PORT'tan
// (8410) alıyor, `--port`'u yok sayıyor ve `/health` ucu yok. Launcher'ın dört
// varsayımının dördü de kırıldı; v1.6.8 bu hâliyle yayınlandı.
//
// Sözleşmenin iki ucu: launcher `.conn_adt`'e ADT_RFC_* yazıp script'i
// `--port <n>` ile başlatıyor ve `GET /health` 2xx bekliyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...p: string[]) => readFileSync(path.join(ROOT, ...p), "utf8").replace(/\r\n/g, "\n");

const BRIDGE_DIR = ["resources", "sap-toolkit", "sap-consultant", "skills", "sap-adt-router-bridge"];
const bridge = read(...BRIDGE_DIR, "scripts", "adt_rfc_bridge.py");
const launcher = read("app-electron", "main", "launcher.ts");
const manager = read("app-electron", "main", "rfcBridgeManager.ts");

describe("launcher → adt_rfc_bridge.py sözleşmesi", () => {
  it("launcher'ın .conn_adt'e yazdığı RFC anahtarlarını script aynı adla okuyor", () => {
    for (const key of ["ADT_RFC_ASHOST", "ADT_RFC_SYSNR", "ADT_RFC_SAPROUTER", "ADT_RFC_BRIDGE_PORT"]) {
      expect(launcher).toContain(`${key}=`);
      expect(bridge).toContain(`"${key}"`);
    }
  });

  it("script .conn_adt'i kendisi buluyor, .env'e muhtaç değil", () => {
    expect(bridge).toContain('".conn_adt"');
    expect(bridge).not.toMatch(/_need\(\s*"RFC_ASHOST"/);
  });

  it("router'sız (doğrudan RFC) mod çalışıyor: SAPROUTER zorunlu değil", () => {
    expect(bridge).not.toMatch(/_need\(\s*"RFC_SAPROUTER"/);
    expect(bridge).toMatch(/ADT_RFC_SAPROUTER", ""\)\.strip\(\) or None/);
  });

  it("launcher --port veriyor, script --port'u dinliyor", () => {
    expect(manager).toMatch(/\[opts\.scriptPath, "--port", String\(opts\.bridgePort\)\]/);
    expect(bridge).toMatch(/add_argument\("--port"/);
  });

  it("launcher /health yokluyor, script /health'e kendisi 200 dönüyor", () => {
    expect(manager).toContain('path: "/health"');
    expect(bridge).toMatch(/self\.path in \([^)]*"\/health"[^)]*\)/);
  });

  it("SKILL.md ajanı .env/8410/selftest tarifinden uzak tutuyor", () => {
    const skill = read(...BRIDGE_DIR, "SKILL.md");
    const end = skill.indexOf("\n---\n", 4);
    const head = skill.slice(end, end + 2500);
    expect(head).toContain("NTT Studio uyarlaması — köprüyü launcher başlatıyor, sen başlatma.");
    expect(head).toContain("**8788**");
    expect(head).toContain("`adt_rfc_bridge.py selftest`");
  });
});
