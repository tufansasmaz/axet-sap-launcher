// Rol + sistem önem derecesi -> kurulacak yetenekler.
//
// Buradaki asıl güvence PRD kapısı: bir üretim sistemine bağlanırken yazma
// yetkili bir skill'in listeye sızması, bu projedeki en pahalı hata sınıfı.
// Kapı `planSkills` içinde tek bir satır — ve tek satırlık kapılar sessizce
// kaybolur, çünkü kaybolduklarında hiçbir şey bozulmuş GÖRÜNMEZ.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  PROFILE_SKILLS,
  SKILL_CATALOG,
  isSkillProfile,
  orphanedProfileSkills,
  planSkills
} from "../app-electron/main/skillProfiles";

describe("isSkillProfile", () => {
  it("yalnizca bilinen uc rolu kabul eder", () => {
    expect(isSkillProfile("module-consultant")).toBe(true);
    expect(isSkillProfile("technical-consultant")).toBe(true);
    expect(isSkillProfile("sandbox")).toBe(true);
    expect(isSkillProfile("admin")).toBe(false);
    expect(isSkillProfile(null)).toBe(false);
    expect(isSkillProfile(undefined)).toBe(false);
  });
});

describe("PROFILE_SKILLS", () => {
  it("her rolun her skill'i katalogda var", () => {
    // Katalogda olmayan bir ad, kurulumda sessizce atlanan bir skill demek:
    // kullanici listede gorur, diske hicbir sey yazilmaz.
    for (const [profile, names] of Object.entries(PROFILE_SKILLS)) {
      for (const name of names) {
        expect(SKILL_CATALOG[name], `${profile} -> ${name}`).toBeDefined();
      }
    }
  });

  it("ayni skill bir rolde iki kez gecmez", () => {
    for (const [profile, names] of Object.entries(PROFILE_SKILLS)) {
      expect(new Set(names).size, profile).toBe(names.length);
    }
  });

  it("modul danismaninin hicbir yazma yetkili skill'i yok", () => {
    // Rolun tanimi bu: sistemi okur, dokuman uretir, kod yazmaz.
    const writers = PROFILE_SKILLS["module-consultant"].filter((name) => SKILL_CATALOG[name]?.writeCapable);
    expect(writers).toEqual([]);
  });
});

describe("planSkills — PRD kapisi", () => {
  it("PRD'de yazma yetkili her skill engellenir", () => {
    for (const entry of planSkills("sandbox", "PRD")) {
      expect(entry.blockedByTier, entry.name).toBe(entry.writeCapable);
    }
  });

  it("PRD'de en az bir skill GERCEKTEN engelleniyor", () => {
    // Yukaridaki test, katalogda hic yazma yetkili skill kalmasa da gecerdi.
    expect(planSkills("sandbox", "PRD").some((entry) => entry.blockedByTier)).toBe(true);
  });

  it("DEV/QA/bilinmeyen sistemde hicbir sey engellenmez", () => {
    for (const tier of ["DEV", "QA", null] as const) {
      expect(planSkills("sandbox", tier).some((entry) => entry.blockedByTier), String(tier)).toBe(false);
    }
  });

  it("bilinmeyen rol varsayilana duser, cokmez", () => {
    const plan = planSkills("yok-boyle-bir-rol" as never, null);
    expect(plan.map((entry) => entry.name)).toEqual(PROFILE_SKILLS[DEFAULT_PROFILE]);
  });
});

describe("orphanedProfileSkills — rol degisince temizlik", () => {
  const namesOf = (profile: Parameters<typeof planSkills>[0]) => planSkills(profile, null).map((entry) => entry.name);

  it("teknik danismandan modul danismanina gecince kod/ekran yetenekleri KALDIRILIR", () => {
    // Kullanicinin bildirdigi hatanin ta kendisi: iki rol birbirinin ustune
    // birikiyor, "kod yazmaz" diye secilen rolde ekran ureten skill duruyordu.
    const orphans = orphanedProfileSkills(namesOf("technical-consultant"), namesOf("module-consultant"));
    expect(orphans).toContain("abap-code-checker");
    expect(orphans).toContain("screen-gen");
    expect(orphans).not.toContain("sap-docs");
  });

  it("ayni rol iki kez kurulunca hicbir sey kaldirilmaz", () => {
    expect(orphanedProfileSkills(namesOf("sandbox"), namesOf("sandbox"))).toEqual([]);
  });

  it("bizim paketimizden GELMEYEN klasore dokunmaz", () => {
    // `.axet-code/skills` altindaki her klasor bizden gelmiyor; kullanicinin
    // elle koydugu bir skill bizim isimiz degil.
    expect(orphanedProfileSkills(["kendi-yetenegim"], namesOf("module-consultant"))).toEqual([]);
  });

  it("katalogdan kurulmus kayit korunur", () => {
    const orphans = orphanedProfileSkills(namesOf("technical-consultant"), namesOf("module-consultant"), [
      "screen-gen"
    ]);
    expect(orphans).not.toContain("screen-gen");
  });

  it("okunamayan klasor listesi hicbir seyi SILDIRMEZ", () => {
    expect(orphanedProfileSkills([], namesOf("module-consultant"))).toEqual([]);
  });
});
