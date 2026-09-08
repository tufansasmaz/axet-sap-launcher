// @vitest-environment jsdom
//
// Genel yetenekler penceresi — ARAYUZ tarafi.
//
// Kural ana surecte de var (`skills:global:set` rol disini reddediyor), ama
// ekranda ACILABILIR GORUNEN bir anahtar, reddedilse bile kullaniciya var
// olmayan bir secenek gostermek demek. Bu dosya tam olarak onu koruyor:
// rol disi satir GORUNUR ama anahtari YOK.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GlobalSkillList, GlobalSkillRow } from "../app-electron/shared/types";
import GlobalSkillsModal from "../src/components/GlobalSkillsModal";
import { LanguageProvider } from "../src/i18n";

function row(overrides: Partial<GlobalSkillRow> = {}): GlobalSkillRow {
  return { name: "sap-adt-readonly", set: "shared", inRole: true, enabled: true, installed: true, ...overrides };
}

function list(rows: GlobalSkillRow[]): GlobalSkillList {
  return { profile: "module-consultant", root: "C:\\Users\\x\\AppData\\Local\\axet-code", rows };
}

function mountWith(value: GlobalSkillList) {
  const api = {
    listGlobalSkills: vi.fn().mockResolvedValue(value),
    setGlobalSkill: vi.fn().mockResolvedValue(value)
  };
  (window as unknown as { api: unknown }).api = api;
  render(
    <LanguageProvider language="tr">
      <GlobalSkillsModal open onClose={() => {}} />
    </LanguageProvider>
  );
  return api;
}

afterEach(cleanup);

describe("GlobalSkillsModal", () => {
  it("rol icindeki yetenege anahtar cizer", async () => {
    mountWith(list([row()]));
    expect(await screen.findByRole("switch", { name: "sap-adt-readonly" })).toBeTruthy();
  });

  it("rol DISINDAKI yetenegi gosterir ama anahtar CIZMEZ", async () => {
    mountWith(list([row({ name: "abap-unit", set: "technical", inRole: false, enabled: false })]));
    expect(await screen.findByText("abap-unit")).toBeTruthy();
    expect(screen.queryByRole("switch", { name: "abap-unit" })).toBeNull();
    expect(screen.getByText("Rol dışı")).toBeTruthy();
  });

  it("anahtar cevirmek ana surece TERS degeri gonderir", async () => {
    const api = mountWith(list([row({ enabled: true })]));
    fireEvent.click(await screen.findByRole("switch", { name: "sap-adt-readonly" }));
    expect(api.setGlobalSkill).toHaveBeenCalledWith("sap-adt-readonly", false);
  });

  it("kume basliklari ayri ayri cizilir", async () => {
    mountWith(
      list([
        row({ name: "a", set: "shared" }),
        row({ name: "b", set: "module" }),
        row({ name: "c", set: "technical", inRole: false, enabled: false })
      ])
    );
    expect(await screen.findByText("Ortak")).toBeTruthy();
    expect(screen.getByText("Modül danışmanı")).toBeTruthy();
    expect(screen.getByText("Teknik danışman")).toBeTruthy();
  });

  it("rol secilmemisse liste yerine sebebini yazar", async () => {
    mountWith({ profile: null, root: "C:\\x", rows: [row()] });
    expect(await screen.findByText(/rolünüzü seçin/)).toBeTruthy();
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
