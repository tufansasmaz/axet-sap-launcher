// Tests for İş 2 — Yenilikler penceresi

import { describe, expect, it } from "vitest";
import { WHATS_NEW_DATA, shouldShowWhatsNew } from "../src/lib/whatsNew";

describe("whatsNew veri bütünlüğü", () => {
  it("her sürüm kaydında tr ve en madde sayısı eşit", () => {
    for (const entry of WHATS_NEW_DATA) {
      expect(entry.items.tr.length, `${entry.version} tr/en eşit olmalı`).toBe(entry.items.en.length);
    }
  });

  it("1.8.3 kaydı altı madde içeriyor", () => {
    const v = WHATS_NEW_DATA.find((e) => e.version === "1.8.3");
    expect(v).toBeTruthy();
    expect(v!.items.tr).toHaveLength(6);
  });
});

describe("shouldShowWhatsNew", () => {
  it("sürüm görülmediyse (seenVersion farklı) açılır", () => {
    expect(shouldShowWhatsNew({ seenVersion: "1.8.0", appVersion: "1.8.3" })).toBe(true);
  });

  it("sürüm görüldüyse açılmaz", () => {
    expect(shouldShowWhatsNew({ seenVersion: "1.8.3", appVersion: "1.8.3" })).toBe(false);
  });

  it("seenVersion boşsa (ilk kurulum veya eski sürüm) açılmaz ama yaz sinyali verilir", () => {
    const result = shouldShowWhatsNew({ seenVersion: "", appVersion: "1.8.3" });
    expect(result).toBe(false);
  });

  it("veri dosyasında bu sürüm için kayıt yoksa açılmaz", () => {
    expect(shouldShowWhatsNew({ seenVersion: "1.7.0", appVersion: "9.9.9" })).toBe(false);
  });
});
