// Derinlikli proje tarama — SAP yazma günlükleri ve axet-code db'leri
// proje klasörünün DOĞRUDAN alt klasöründe değil, müşteri/sistem
// hiyerarşisinde daha derinde olabilir (bkz. computeProjectDir).
// Maks derinlik 3; node_modules ve (axet-code dışı) nokta-klasörler atlanır.

import { describe, expect, it } from "vitest";
import type { FsAdapter } from "../app-electron/main/dataPrivacy";
import { computeSapWriteSummary, computeAxetDbSummary } from "../app-electron/main/dataPrivacy";

function n(p: string): string { return p.replace(/\\/g, "/"); }

function fakeFs(
  files: Record<string, number>,
  dirs: Record<string, string[]> = {}
): FsAdapter {
  return {
    exists: (p) => n(p) in files || n(p) in dirs,
    stat: (p) => {
      const k = n(p);
      if (k in files) return { size: files[k], isDirectory: () => false, isFile: () => true };
      if (k in dirs) return { size: 0, isDirectory: () => true, isFile: () => false };
      throw new Error(`ENOENT: ${p}`);
    },
    readdir: (p) => dirs[n(p)] ?? []
  };
}

// ─────────────────────────────────────────────────────────────
// computeSapWriteSummary — derinlik 2 (musteri/sistem)
// ─────────────────────────────────────────────────────────────

describe("computeSapWriteSummary — cok seviyeli", () => {
  it("musteri/sistem seviyesindeki (derinlik 2) gunlugu bulur", () => {
    const fs = fakeFs(
      { "/proj/Musteri/Sistem/sap-yazma-gunlugu.jsonl": 700 },
      {
        "/proj": ["Musteri"],
        "/proj/Musteri": ["Sistem"],
        "/proj/Musteri/Sistem": ["sap-yazma-gunlugu.jsonl"]
      }
    );
    const s = computeSapWriteSummary(["/proj"], fs);
    expect(s.projects).toBe(1);
    expect(s.bytes).toBe(700);
  });

  it("node_modules klasoru her derinlikte atlaniyor", () => {
    const fs = fakeFs(
      { "/proj/node_modules/pkg/sap-yazma-gunlugu.jsonl": 999 },
      {
        "/proj": ["node_modules"],
        "/proj/node_modules": ["pkg"],
        "/proj/node_modules/pkg": ["sap-yazma-gunlugu.jsonl"]
      }
    );
    const s = computeSapWriteSummary(["/proj"], fs);
    expect(s.bytes).toBe(0);
  });

  it("derinlik 3'u asan klasor taranmaz", () => {
    const fs = fakeFs(
      { "/proj/A/B/C/D/sap-yazma-gunlugu.jsonl": 500 },
      {
        "/proj": ["A"],
        "/proj/A": ["B"],
        "/proj/A/B": ["C"],
        "/proj/A/B/C": ["D"],
        "/proj/A/B/C/D": ["sap-yazma-gunlugu.jsonl"]
      }
    );
    const s = computeSapWriteSummary(["/proj"], fs);
    expect(s.bytes).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// computeAxetDbSummary — derinlik 2 (musteri/sistem)
// ─────────────────────────────────────────────────────────────

describe("computeAxetDbSummary — cok seviyeli", () => {
  it("musteri/sistem seviyesindeki (derinlik 2) db'yi bulur", () => {
    const fs = fakeFs(
      { "/proj/Musteri/Sistem/.axet-code/axet-code.db": 4096 },
      {
        "/proj": ["Musteri"],
        "/proj/Musteri": ["Sistem"],
        "/proj/Musteri/Sistem": [".axet-code"],
        "/proj/Musteri/Sistem/.axet-code": ["axet-code.db"]
      }
    );
    const s = computeAxetDbSummary(["/proj"], fs);
    expect(s.count).toBe(1);
    expect(s.bytes).toBe(4096);
  });

  it("node_modules her derinlikte atlaniyor", () => {
    const fs = fakeFs(
      { "/proj/node_modules/.axet-code/axet-code.db": 1000 },
      {
        "/proj": ["node_modules"],
        "/proj/node_modules": [".axet-code"],
        "/proj/node_modules/.axet-code": ["axet-code.db"]
      }
    );
    const s = computeAxetDbSummary(["/proj"], fs);
    expect(s.bytes).toBe(0);
  });

  it("derinlik 3'u asan klasor taranmaz", () => {
    const fs = fakeFs(
      { "/proj/A/B/C/D/.axet-code/axet-code.db": 2048 },
      {
        "/proj": ["A"],
        "/proj/A": ["B"],
        "/proj/A/B": ["C"],
        "/proj/A/B/C": ["D"],
        "/proj/A/B/C/D": [".axet-code"],
        "/proj/A/B/C/D/.axet-code": ["axet-code.db"]
      }
    );
    const s = computeAxetDbSummary(["/proj"], fs);
    expect(s.bytes).toBe(0);
  });
});
