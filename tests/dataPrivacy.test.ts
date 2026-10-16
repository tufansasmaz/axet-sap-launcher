// Veri ve gizlilik: özet hesabı ve temizleme mantığı (Is A — 2026-10-17).
// Saf birim testleri: dosya sistemi enjeksiyon yoluyla sahte.

import { describe, expect, it } from "vitest";
import {
  computeChatSummary,
  computeLogSummary,
  computeSapWriteSummary,
  computeAxetDbSummary,
  type FsAdapter
} from "../app-electron/main/dataPrivacy";

// Yolları normalleştir: Windows'ta path.join ters bölü üretiyor; testlerde
// ileri eğik çizgi kullanıldığı için her iki yönü de eşleştiriyoruz.
function norm(p: string): string {
  return p.replace(/\\/g, "/");
}

// Sahte bir FsAdapter fabrikası: verilecek dosya→boyut haritasından oluşturuluyor.
function fakeFs(
  files: Record<string, number>,      // yol → boyut (byte)
  dirs: Record<string, string[]> = {} // yol → alt öğe isimleri
): FsAdapter {
  return {
    exists: (p) => norm(p) in files || norm(p) in dirs,
    stat: (p) => {
      const n = norm(p);
      if (n in files) return { size: files[n], isDirectory: () => false, isFile: () => true };
      if (n in dirs) return { size: 0, isDirectory: () => true, isFile: () => false };
      throw new Error(`ENOENT: ${p}`);
    },
    readdir: (p) => dirs[norm(p)] ?? []
  };
}

// ─────────────────────────────────────────────
// Chat özeti
// ─────────────────────────────────────────────
describe("computeChatSummary", () => {
  it("dosya varsa boyut ve oturum sayisi dondurur", () => {
    const fs = fakeFs({ "/data/chat-sessions.json": 2048 });
    const content = JSON.stringify({ sessions: [{}, {}, {}] });
    const summary = computeChatSummary("/data/chat-sessions.json", () => content, fs);
    expect(summary.bytes).toBe(2048);
    expect(summary.count).toBe(3);
  });

  it("dosya yoksa 0 dondurur", () => {
    const fs = fakeFs({});
    const summary = computeChatSummary("/data/chat-sessions.json", () => "", fs);
    expect(summary.bytes).toBe(0);
    expect(summary.count).toBe(0);
  });

  it("bozuk JSON oturum sayisini 0 yapar, boyut korunur", () => {
    const fs = fakeFs({ "/data/chat-sessions.json": 500 });
    const summary = computeChatSummary("/data/chat-sessions.json", () => "bozuk{{{", fs);
    expect(summary.bytes).toBe(500);
    expect(summary.count).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Log özeti
// ─────────────────────────────────────────────
describe("computeLogSummary", () => {
  it("iki dosyanin boyutunu toplar", () => {
    const fs = fakeFs({
      "/logs/ntt-studio.log": 1000,
      "/logs/ntt-studio.log.1": 3000
    });
    const s = computeLogSummary("/logs/ntt-studio.log", fs);
    expect(s.bytes).toBe(4000);
  });

  it("yalnizca ana dosya varsa dogru toplami hesaplar", () => {
    const fs = fakeFs({ "/logs/ntt-studio.log": 2000 });
    const s = computeLogSummary("/logs/ntt-studio.log", fs);
    expect(s.bytes).toBe(2000);
  });

  it("ikisi de yoksa 0 dondurur", () => {
    const fs = fakeFs({});
    const s = computeLogSummary("/logs/ntt-studio.log", fs);
    expect(s.bytes).toBe(0);
  });
});

// ─────────────────────────────────────────────
// SAP yazma günlükleri
// ─────────────────────────────────────────────
describe("computeSapWriteSummary", () => {
  it("proje klasorlerindeki gunluk dosyalarini bulur", () => {
    const fs = fakeFs(
      {
        "/proj/A/sap-yazma-gunlugu.jsonl": 500,
        "/proj/B/sap-yazma-gunlugu.jsonl": 300
      },
      {
        "/proj": ["A", "B"],
        "/proj/A": ["sap-yazma-gunlugu.jsonl"],
        "/proj/B": ["sap-yazma-gunlugu.jsonl"]
      }
    );
    const s = computeSapWriteSummary(["/proj"], fs);
    expect(s.projects).toBe(2);
    expect(s.bytes).toBe(800);
  });

  it("gunluk yoksa 0 dondurur", () => {
    const fs = fakeFs({}, { "/proj": ["A"], "/proj/A": [] });
    const s = computeSapWriteSummary(["/proj"], fs);
    expect(s.projects).toBe(0);
    expect(s.bytes).toBe(0);
  });

  it("birden fazla base dir toplanir, tekrar eden yollar sayilmaz", () => {
    const fs = fakeFs(
      { "/proj/A/sap-yazma-gunlugu.jsonl": 100 },
      { "/proj": ["A"], "/proj/A": ["sap-yazma-gunlugu.jsonl"] }
    );
    // Aynı base dir iki kez verilirse proje sayısı hâlâ 1 olmalı.
    const s = computeSapWriteSummary(["/proj", "/proj"], fs);
    expect(s.projects).toBe(1);
    expect(s.bytes).toBe(100);
  });

  it("derinlik siniri: node_modules atlaniyor", () => {
    const fs = fakeFs(
      { "/proj/node_modules/pkg/sap-yazma-gunlugu.jsonl": 9999 },
      {
        "/proj": ["node_modules"],
        "/proj/node_modules": ["pkg"],
        "/proj/node_modules/pkg": ["sap-yazma-gunlugu.jsonl"]
      }
    );
    const s = computeSapWriteSummary(["/proj"], fs);
    expect(s.bytes).toBe(0);
  });
});

// ─────────────────────────────────────────────
// axet-code veritabanları
// ─────────────────────────────────────────────
describe("computeAxetDbSummary", () => {
  it("axet-code.db dosyalarini bulur", () => {
    const fs = fakeFs(
      {
        "/proj/A/.axet-code/axet-code.db": 8192,
        "/proj/B/.axet-code/axet-code.db": 4096
      },
      {
        "/proj": ["A", "B"],
        "/proj/A": [".axet-code"],
        "/proj/A/.axet-code": ["axet-code.db"],
        "/proj/B": [".axet-code"],
        "/proj/B/.axet-code": ["axet-code.db"]
      }
    );
    const s = computeAxetDbSummary(["/proj"], fs);
    expect(s.count).toBe(2);
    expect(s.bytes).toBe(12288);
  });

  it("db yoksa 0 dondurur", () => {
    const fs = fakeFs({}, { "/proj": [] });
    const s = computeAxetDbSummary(["/proj"], fs);
    expect(s.count).toBe(0);
    expect(s.bytes).toBe(0);
  });

  it("node_modules atlaniyor", () => {
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
});
