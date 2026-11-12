// "Baglantiyi kes" gercekten keser (kararlilik-2, R8a).
//
// Eskiden `context:clearSap` yalniz rozeti temizliyordu; kopru, 8787 ve onay
// oturumu ayakta kaliyordu ("baglantiyi kessem de fark etmiyor").

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { disconnectActiveSap } from "../app-electron/main/sapDisconnect";
import type { ActiveSapContext } from "../app-electron/shared/types";

const SAP: ActiveSapContext = {
  uuid: "u1",
  systemId: "SID",
  systemName: "Sistem",
  customerPath: ["Musteri"],
  host: "h",
  client: "100",
  username: "U",
  tier: "QA",
  projectDir: "C:\\proj\\Musteri\\SID",
  connectedAt: "2026-11-12T00:00:00Z",
  verified: true
};

function deps(sap: ActiveSapContext | null) {
  return {
    getSap: vi.fn(() => sap),
    clearSap: vi.fn(),
    stopRfcBridge: vi.fn(),
    stopAdtServer: vi.fn(),
    closeWriteSession: vi.fn()
  };
}

describe("disconnectActiveSap", () => {
  it("baglami temizler ve o klasorun kopru/ADT/onay oturumunu kapatir", () => {
    const d = deps(SAP);
    expect(disconnectActiveSap(d)).toEqual({ projectDir: SAP.projectDir });
    expect(d.clearSap).toHaveBeenCalledOnce();
    expect(d.stopRfcBridge).toHaveBeenCalledWith(SAP.projectDir);
    expect(d.stopAdtServer).toHaveBeenCalledWith(SAP.projectDir);
    expect(d.closeWriteSession).toHaveBeenCalledWith(SAP.projectDir);
  });

  it("bagli sistem yoksa hicbir surece dokunmaz", () => {
    const d = deps(null);
    expect(disconnectActiveSap(d)).toEqual({ projectDir: null });
    expect(d.clearSap).not.toHaveBeenCalled();
    expect(d.stopRfcBridge).not.toHaveBeenCalled();
    expect(d.stopAdtServer).not.toHaveBeenCalled();
  });

  it("bir adim patlasa da baglam temizlenir ve kalan adimlar calisir", () => {
    const d = deps(SAP);
    d.closeWriteSession.mockImplementation(() => {
      throw new Error("x");
    });
    disconnectActiveSap(d);
    expect(d.clearSap).toHaveBeenCalledOnce();
    expect(d.stopAdtServer).toHaveBeenCalled();
    expect(d.stopRfcBridge).toHaveBeenCalled();
  });

  it("context:clearSap kanali bu yolu kullanir", () => {
    const index = readFileSync(path.join(__dirname, "..", "app-electron", "main", "index.ts"), "utf8");
    const handler = index.slice(index.indexOf('ipcMain.handle("context:clearSap"'));
    // Çoklu sistem: kanal yalnız seçilen sistemi kesen yardımcıyı çağırıyor, o da bu yolu.
    expect(handler.slice(0, 600)).toContain("disconnectSystem(");
    const helper = index.slice(index.indexOf("function disconnectSystem("));
    expect(helper.slice(0, 800)).toContain("disconnectActiveSap(");
  });
});
