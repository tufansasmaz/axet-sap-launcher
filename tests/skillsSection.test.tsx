// @vitest-environment jsdom
//
// "Katalogdan yetenek ekle" kutusu — ARAYÜZ tarafı.
//
// Kuralları `catalogSkills.test.ts` zaten doğruluyor. Burada doğrulanan şey
// başka: kuralın EKRANA doğru yansıması. İkisi ayrı şeyler ve aradaki fark
// sessiz — engelli bir girdiye kurulum düğmesi çizmek, ana süreç o kurulumu
// reddetse bile kullanıcıya var olmayan bir seçenek göstermek demek.
//
// Uygulamanın ilk bileşen testi. `window.api` sahte: bileşenin ana süreçle
// konuşan tek yolu o, ve tam olarak ne istediğini görmek istiyoruz (silme
// çağrısı KİMLİĞİ değil ADI göndermeli — ikisi farklı ve karışması yanlış
// klasörü silerdi).

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogSkill, CatalogSkillList, SkillStatus } from "../app-electron/shared/types";
import SkillsSection from "../src/components/SkillsSection";
import { LanguageProvider } from "../src/i18n";

/** JSX'te dize niteliği kaçış YAPMIYOR — sabit tutulmazsa çift ters bölü gider. */
const PROJECT = "C:\\proje";

const EMPTY_STATUS: SkillStatus = { skills: [], stamp: null, toolkit: null, updateAvailable: false };

function skill(overrides: Partial<CatalogSkill> = {}): CatalogSkill {
  return {
    id: "team-tools/mass-rename",
    name: "mass-rename",
    plugin: "team-tools",
    description: "Toplu yeniden adlandirma",
    riskTier: 0,
    writeCapable: false,
    path: "plugins/team-tools/skills/mass-rename",
    blocked: null,
    installed: false,
    removable: false,
    ...overrides
  };
}

function catalog(skills: CatalogSkill[], folder: string | null = "C:\\OneDrive\\NTT"): CatalogSkillList {
  return { folder, catalogVersion: "1.4.0", department: "SAP", skills };
}

function mountWith(list: CatalogSkillList) {
  const api = {
    getSkillStatus: vi.fn().mockResolvedValue(EMPTY_STATUS),
    reinstallSkills: vi.fn().mockResolvedValue(EMPTY_STATUS),
    listCatalogSkills: vi.fn().mockResolvedValue(list),
    installCatalogSkill: vi.fn().mockResolvedValue({ ok: true, error: null, list }),
    removeCatalogSkill: vi.fn().mockResolvedValue({ ok: true, error: null, list })
  };
  (window as unknown as { api: unknown }).api = api;
  render(
    <LanguageProvider language="tr">
      <SkillsSection profile="module-consultant" onProfileChange={() => {}} projectDir={PROJECT} />
    </LanguageProvider>
  );
  return api;
}

afterEach(cleanup);

describe("SkillsSection — katalog kutusu", () => {
  it("kurulabilir girdiye Kur dugmesi cizer", async () => {
    mountWith(catalog([skill()]));
    expect(await screen.findByText("team-tools/mass-rename")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Kur/ })).toBeTruthy();
  });

  it("ENGELLI girdiye kurulum dugmesi CIZMEZ, sebebini yazar", async () => {
    // Engelli bir girdiye dugme cizmek, ana surec reddetse bile kullaniciya
    // var olmayan bir secenek gostermekti.
    mountWith(catalog([skill({ blocked: "pluginRoot" })]));
    expect(await screen.findByText(/Eklentinin kokundeki|Eklentinin kökündeki/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Kur$/ })).toBeNull();
  });

  it("engelli girdi listeden GIZLENMEZ", async () => {
    // "Katalogda vardi, nerede?" sorusunu sessiz bir eksiklikle birakmak,
    // sebebini yazmaktan kotu.
    mountWith(catalog([skill({ blocked: "os" })]));
    expect(await screen.findByText("team-tools/mass-rename")).toBeTruthy();
  });

  it("kurulu ama BIZIM kurmadigimiz klasore Kaldir dugmesi cikmaz", async () => {
    mountWith(catalog([skill({ installed: true, removable: false })]));
    expect(await screen.findByText("kurulu")).toBeTruthy();
    expect(screen.queryByTitle("Kaldır")).toBeNull();
  });

  it("kaldirma cagrisi KIMLIGI degil ADI gonderir", async () => {
    // `.axet-code/skills` altindaki klasorun adi `name`; `id` eklenti onekli.
    // Karisirsa silme istegi hicbir seyi bulamaz ya da yanlisini bulur.
    const api = mountWith(catalog([skill({ installed: true, removable: true })]));
    fireEvent.click(await screen.findByTitle("Kaldır"));
    expect(api.removeCatalogSkill).toHaveBeenCalledWith(PROJECT, "mass-rename");
  });

  it("kurulum cagrisi KIMLIGI gonderir", async () => {
    const api = mountWith(catalog([skill()]));
    fireEvent.click(await screen.findByRole("button", { name: /Kur/ }));
    expect(api.installCatalogSkill).toHaveBeenCalledWith(PROJECT, "team-tools/mass-rename");
  });

  it("yazma niyetli girdide PRD uyarisi gorunur", async () => {
    mountWith(catalog([skill({ riskTier: 2, writeCapable: true })]));
    expect(await screen.findByText(/PRD isaretli|PRD işaretli/)).toBeTruthy();
  });

  it("tier 0 girdide PRD uyarisi YOK", async () => {
    mountWith(catalog([skill()]));
    await screen.findByText("team-tools/mass-rename");
    expect(screen.queryByText(/PRD/)).toBeNull();
  });

  it("katalog klasoru yoksa ne yapilacagini yazar", async () => {
    mountWith(catalog([], null));
    expect(await screen.findByText(/OneDrive'a kısayol ekle|OneDrive'a kisayol ekle/)).toBeTruthy();
  });
});
