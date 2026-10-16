// axet-code sürüm/bozuk denetimi (spec 2026-10-16 basiz-kopru §8). Gerçek
// olay: güncelleyici exe'yi 0 bayta indirdi (2026-10-15 ve 2026-10-16),
// sohbet sessizce cevapsız kaldı.
import { describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k)
}));

const { axetBinaryMessage, axetUpdateAvailable, compareVersions, noteUpdateLine, statusFromProbe } = await import(
  "../app-electron/main/axetCodeVersion"
);

describe("compareVersions", () => {
  it("sayısal karşılaştırıyor", () => {
    expect(compareVersions("1.4.0", "1.4.0")).toBe(0);
    expect(compareVersions("1.3.9", "1.4.0")).toBe(-1);
    expect(compareVersions("1.10.0", "1.4.0")).toBe(1);
    expect(compareVersions("1.4", "1.4.0")).toBe(0);
  });
});

describe("statusFromProbe", () => {
  it("1.4.1 tamam, 1.3.0 eski", () => {
    expect(statusFromProbe({ errorCode: null, errorMessage: "", stdout: "axet-code version 1.4.1\n" })).toEqual({
      kind: "ok",
      version: "1.4.1"
    });
    expect(statusFromProbe({ errorCode: null, errorMessage: "", stdout: "axet-code version 1.3.0" })).toEqual({
      kind: "old",
      version: "1.3.0"
    });
  });

  it("bulunamadı: ENOENT", () => {
    expect(statusFromProbe({ errorCode: "ENOENT", errorMessage: "spawn axet-code.exe ENOENT", stdout: "" })).toEqual({
      kind: "missing"
    });
  });

  it("0 baytlık exe: Win32 hatası ya da boş çıktı bozuk sayılıyor", () => {
    expect(
      statusFromProbe({ errorCode: "UNKNOWN", errorMessage: "spawn UNKNOWN", stdout: "" }).kind
    ).toBe("broken");
    expect(statusFromProbe({ errorCode: null, errorMessage: "", stdout: "" }).kind).toBe("broken");
  });
});

describe("axetBinaryMessage", () => {
  it("tamamsa mesaj yok, diğerlerinde ilgili anahtar", () => {
    expect(axetBinaryMessage({ kind: "ok", version: "1.4.1" })).toBeNull();
    expect(axetBinaryMessage({ kind: "old", version: "1.3.0" })).toContain("chat.axetTooOld");
    expect(axetBinaryMessage({ kind: "old", version: "1.3.0" })).toContain("1.3.0");
    expect(axetBinaryMessage({ kind: "missing" })).toContain("chat.axetMissing");
    expect(axetBinaryMessage({ kind: "broken", detail: "x" })).toContain("chat.axetBroken");
  });
});

describe("güncelleme satırı", () => {
  it("latest > current ise duyuru; eşitse yok", () => {
    noteUpdateLine("INFO Update check done component=bgjob job=auto-update current=1.4.1 latest=1.4.1 minimum=1.3.0");
    expect(axetUpdateAvailable()).toBeNull();
    noteUpdateLine("2026/10/16 15:58:46 INFO Update check done component=bgjob job=auto-update current=1.4.1 latest=1.4.2 minimum=1.3.0");
    expect(axetUpdateAvailable()).toEqual({ installed: "1.4.1", latest: "1.4.2" });
    noteUpdateLine("INFO başka bir satır");
    expect(axetUpdateAvailable()).toEqual({ installed: "1.4.1", latest: "1.4.2" });
  });
});
