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

  it("axet-flows HER ROLDE var", () => {
    // "herkes kullanabilsin" (kullanici, 2026-09-08). SAP disi bir yetenek
    // oldugu icin rol ayriminin disinda kaliyor; bir role eklenip digerinde
    // unutulmasin diye kural burada kilitli.
    for (const profile of Object.keys(PROFILE_SKILLS) as (keyof typeof PROFILE_SKILLS)[]) {
      expect(PROFILE_SKILLS[profile], profile).toContain("axet-flows");
    }
  });

  it("axet-flows PRD'de kilitli degil — SAP'a yazmiyor", () => {
    // `writeCapable` "SAP'a yazar" demek. Akis JSON'u uretmek SAP'i degil
    // aXet.flows tasarimcisini ilgilendiriyor; DEV kilidi bunu tutmamali.
    const entry = planSkills("technical-consultant", "PRD").find((e) => e.name === "axet-flows");
    expect(entry?.writeLocked).toBe(false);
  });

  it("modul danismaninin hicbir yazma yetkili skill'i yok", () => {
    // Rolun tanimi bu: sistemi okur, dokuman uretir, kod yazmaz.
    const writers = PROFILE_SKILLS["module-consultant"].filter((name) => SKILL_CATALOG[name]?.writeCapable);
    expect(writers).toEqual([]);
  });
});

describe("planSkills — yazma skill'leri her sistemde kurulur, DEV disinda kilitli", () => {
  // Kullanici karari (2026-09-23): "dev olsada olmasada o skiller yuklensin
  // ama sisteme yazilacagi deploy edilecegi kisimda dev tagi yada onayi
  // istesin". Kurulum tier'a bakmiyor; DEV kapisi yazma aninda, skill'in kendi
  // kodunda (bkz. tierWriteGates.test.ts). Burada kilitlenen: hicbir tier bir
  // skill'i listeden dusurmuyor, `writeLocked` ise yalnizca DEV'de kalkiyor.

  it("teknik danisman PRD/QA/isaretsiz sistemde de ekran, Adobe ve abapGit skill'lerini alir", () => {
    for (const tier of ["PRD", "QA", null] as const) {
      const names = planSkills("technical-consultant", tier).map((entry) => entry.name);
      for (const name of ["screen-gen", "adobe-gen", "abapgit-deploy"]) {
        expect(names, `${tier}/${name}`).toContain(name);
      }
    }
  });

  it("DEV disinda yazma yetkili her skill kilitli, digerleri degil", () => {
    for (const tier of ["PRD", "QA", null] as const) {
      const plan = planSkills("sandbox", tier);
      expect(plan.some((entry) => entry.writeLocked), String(tier)).toBe(true);
      for (const entry of plan) expect(entry.writeLocked, `${tier}/${entry.name}`).toBe(entry.writeCapable);
    }
  });

  it("YALNIZCA DEV'de hicbir sey kilitli degil", () => {
    expect(planSkills("sandbox", "DEV").some((entry) => entry.writeLocked)).toBe(false);
  });

  it("tier listeyi degistirmiyor — tek fark ADT motorunun takasi", () => {
    const swap = (name: string) => (name === "sap-adt" ? "sap-adt-readonly" : name);
    const dev = planSkills("technical-consultant", "DEV").map((entry) => swap(entry.name));
    for (const tier of ["PRD", "QA", null] as const) {
      expect(planSkills("technical-consultant", tier).map((entry) => entry.name), String(tier)).toEqual(dev);
    }
  });

  it("yazan ADT motoru yalnizca DEV'de, digerlerinde salt okur sarmalayici", () => {
    expect(planSkills("technical-consultant", "DEV").map((e) => e.name)).toContain("sap-adt");
    for (const tier of ["PRD", "QA", null] as const) {
      const names = planSkills("technical-consultant", tier).map((e) => e.name);
      expect(names, String(tier)).toContain("sap-adt-readonly");
      expect(names, String(tier)).not.toContain("sap-adt");
    }
  });

  it("modul danismani DEV'de bile hicbir yazma skill'i almaz", () => {
    // Rol kapisi yerinde duruyor: "modul danismanlari asla gelistirme yapamasinlar".
    for (const tier of ["DEV", "QA", "PRD", null] as const) {
      expect(planSkills("module-consultant", tier).filter((e) => e.writeCapable), String(tier)).toEqual([]);
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
