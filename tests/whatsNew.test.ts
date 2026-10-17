// Tests for İş 2 — Yenilikler penceresi

import { describe, expect, it, vi } from "vitest";
import { WHATS_NEW_DATA, shouldShowWhatsNew, buildWhatsNewCloseHandler } from "../src/lib/whatsNew";

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
  // CRITICAL #1: "" artık "gösterme" değil, "henüz gösterilmedi" sinyali.
  // defaultConfig artık app.getVersion() yazıyor; "" eski versiyondan yükseltme.

  it("ilk kurulum: seenVersion === appVersion → gösterilmez", () => {
    // defaultConfig artık app.getVersion() yazar; fresh install seenVersion === appVersion.
    expect(shouldShowWhatsNew({ seenVersion: "1.8.3", appVersion: "1.8.3" })).toBe(false);
  });

  it("yükseltme: seenVersion farklı ve veri kayıt varsa → gösterilir", () => {
    expect(shouldShowWhatsNew({ seenVersion: "1.8.0", appVersion: "1.8.3" })).toBe(true);
  });

  it("yükseltme: seenVersion '' (eski sürümden yükseltme) → gösterilir", () => {
    // Eski sürümde whatsNewSeenVersion yoktu → "" ile yüklendi; yeni veri varsa göster.
    expect(shouldShowWhatsNew({ seenVersion: "", appVersion: "1.8.3" })).toBe(true);
  });

  it("yükseltme: seenVersion '0' (alan hiç yazılmamış) → gösterilir", () => {
    // loadConfig field eksikse "0" sentinel yazar; yeni veri varsa göster.
    expect(shouldShowWhatsNew({ seenVersion: "0", appVersion: "1.8.3" })).toBe(true);
  });

  it("veri dosyasında bu sürüm için kayıt yoksa açılmaz", () => {
    expect(shouldShowWhatsNew({ seenVersion: "1.7.0", appVersion: "9.9.9" })).toBe(false);
  });
});

describe("buildWhatsNewCloseHandler", () => {
  it("çağrıldığında close() çalışır", () => {
    const close = vi.fn();
    const saveConfig = vi.fn();
    const handler = buildWhatsNewCloseHandler({ appVersion: "1.8.3", close, saveConfig });
    handler();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("kapanışta whatsNewSeenVersion kaydedilir", () => {
    const saveConfig = vi.fn();
    const handler = buildWhatsNewCloseHandler({ appVersion: "1.8.3", close: vi.fn(), saveConfig });
    handler();
    expect(saveConfig).toHaveBeenCalledWith({ whatsNewSeenVersion: "1.8.3" });
  });

  it("appVersion boşsa saveConfig çağrılmaz", () => {
    const saveConfig = vi.fn();
    const handler = buildWhatsNewCloseHandler({ appVersion: "", close: vi.fn(), saveConfig });
    handler();
    expect(saveConfig).not.toHaveBeenCalled();
  });
});
