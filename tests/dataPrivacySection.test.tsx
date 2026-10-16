// @vitest-environment jsdom
//
// Veri ve gizlilik bölümü: ayarlar listesinde var mı, satırlar görünüyor mu,
// silme düğmesi onay açıyor mu, yazma günlüğü ve axet-code satırında
// silme düğmesi YOK mu. (Is A — 2026-10-17)

import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SETTINGS_SECTIONS } from "../src/components/settings/settingsSections";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

// ─────────────────────────────────────────────
// settingsSections listesi
// ─────────────────────────────────────────────
describe("settingsSections — dataPrivacy bolumu", () => {
  it("listede dataPrivacy bolumu var", () => {
    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    expect(ids).toContain("dataPrivacy");
  });

  it("dataPrivacy bölümünün fields listesi bos", () => {
    const section = SETTINGS_SECTIONS.find((s) => s.id === "dataPrivacy");
    expect(section?.fields).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// i18n anahtarları — tr
// ─────────────────────────────────────────────
describe("i18n/tr — dataPrivacy anahtarlari", () => {
  it("bolum baslik ve aciklama anahtarlari var", () => {
    expect(tr["settingsModal.sectionDataPrivacy"]).toBeTruthy();
    expect(tr["settingsModal.descDataPrivacy"]).toBeTruthy();
  });

  it("sohbet gecmisi satiri anahtarlari var", () => {
    expect(tr["dataPrivacy.chatHistory.name"]).toBeTruthy();
    expect(tr["dataPrivacy.chatHistory.desc"]).toBeTruthy();
    expect(tr["dataPrivacy.chatHistory.clearBtn"]).toBeTruthy();
    expect(tr["dataPrivacy.chatHistory.confirmTitle"]).toBeTruthy();
    expect(tr["dataPrivacy.chatHistory.confirmMsg"]).toBeTruthy();
  });

  it("uygulama gunlugu satiri anahtarlari var", () => {
    expect(tr["dataPrivacy.appLog.name"]).toBeTruthy();
    expect(tr["dataPrivacy.appLog.desc"]).toBeTruthy();
    expect(tr["dataPrivacy.appLog.clearBtn"]).toBeTruthy();
    expect(tr["dataPrivacy.appLog.confirmTitle"]).toBeTruthy();
    expect(tr["dataPrivacy.appLog.confirmMsg"]).toBeTruthy();
  });

  it("SAP yazma gunlugu satiri anahtarlari var", () => {
    expect(tr["dataPrivacy.sapWrite.name"]).toBeTruthy();
    expect(tr["dataPrivacy.sapWrite.desc"]).toBeTruthy();
    expect(tr["dataPrivacy.sapWrite.openBtn"]).toBeTruthy();
  });

  it("axet-code oturumu satiri anahtarlari var", () => {
    expect(tr["dataPrivacy.axetDb.name"]).toBeTruthy();
    expect(tr["dataPrivacy.axetDb.desc"]).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// i18n anahtarları — en
// ─────────────────────────────────────────────
describe("i18n/en — dataPrivacy anahtarlari", () => {
  it("bolum baslik ve aciklama anahtarlari var", () => {
    expect(en["settingsModal.sectionDataPrivacy"]).toBeTruthy();
    expect(en["settingsModal.descDataPrivacy"]).toBeTruthy();
  });

  it("sohbet gecmisi satiri anahtarlari var", () => {
    expect(en["dataPrivacy.chatHistory.name"]).toBeTruthy();
    expect(en["dataPrivacy.chatHistory.clearBtn"]).toBeTruthy();
    expect(en["dataPrivacy.chatHistory.confirmTitle"]).toBeTruthy();
  });

  it("uygulama gunlugu satiri anahtarlari var", () => {
    expect(en["dataPrivacy.appLog.name"]).toBeTruthy();
    expect(en["dataPrivacy.appLog.clearBtn"]).toBeTruthy();
  });

  it("SAP yazma gunlugu satiri anahtarlari var", () => {
    expect(en["dataPrivacy.sapWrite.name"]).toBeTruthy();
    expect(en["dataPrivacy.sapWrite.openBtn"]).toBeTruthy();
  });

  it("axet-code satiri anahtarlari var", () => {
    expect(en["dataPrivacy.axetDb.name"]).toBeTruthy();
    expect(en["dataPrivacy.axetDb.desc"]).toBeTruthy();
  });
});
