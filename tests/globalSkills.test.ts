// Global/proje ayrimi.
//
// Buradaki asil guvence iki kural, ikisi de kullanicinin acik istegi:
//
//   1. SAP'a YAZAN yetenek global'e KACMAYACAK. Kacarsa PRD kapisi
//      (`planSkills`) anlamini yitirir: kapi sistem basina veriliyor, global
//      klasorun sistemi yok. Bu, projedeki en pahali hata sinifi.
//   2. Rol disindaki yetenek ACILAMAYACAK ("o rol disindaki skiller aktif
//      edilemeyecek"). Ekranda gorunur ama kilitli.
//
// Ikisi de tek satirlik kapilar; tek satirlik kapilar sessizce kaybolur.

import { describe, expect, it } from "vitest";
import {
  PROFILE_SKILLS,
  SKILL_CATALOG,
  skillScope,
  skillSet
} from "../app-electron/main/skillProfiles";
import { globalSkillCandidates, listGlobalSkills, planGlobalSkills } from "../app-electron/main/sapToolkit";

describe("skillScope", () => {
  it("SAP'a yazan her yetenek PROJE kapsaminda kalir", () => {
    for (const [name, def] of Object.entries(SKILL_CATALOG)) {
      if (def.writeCapable) expect(skillScope(name)).toBe("project");
    }
  });

  it("yazmayan yetenekler global", () => {
    expect(skillScope("sap-adt-readonly")).toBe("global");
    expect(skillScope("abapgit-workflow")).toBe("project");
  });

  it("katalogda olmayan ad global sayilir (kurulmaz, yalnizca siniflandirma)", () => {
    expect(skillScope("olmayan-yetenek")).toBe("global");
  });
});

describe("skillSet", () => {
  it("iki rolde de olan yetenek kesisimde", () => {
    const shared = PROFILE_SKILLS["module-consultant"].find((name) =>
      PROFILE_SKILLS["technical-consultant"].includes(name)
    );
    expect(shared).toBeTruthy();
    expect(skillSet(shared as string)).toBe("shared");
  });

  it("yalnizca teknik rolde olan yetenek sag kumede", () => {
    const only = PROFILE_SKILLS["technical-consultant"].find(
      (name) => !PROFILE_SKILLS["module-consultant"].includes(name)
    );
    expect(only).toBeTruthy();
    expect(skillSet(only as string)).toBe("technical");
  });

  it("hicbir danisman rolunde olmayan yetenek sandbox kumesinde", () => {
    const outside = Object.keys(SKILL_CATALOG).find(
      (name) =>
        !PROFILE_SKILLS["module-consultant"].includes(name) &&
        !PROFILE_SKILLS["technical-consultant"].includes(name)
    );
    if (!outside) return; // boyle bir yetenek yoksa kural zaten bos gecerli
    expect(skillSet(outside)).toBe("sandbox");
  });
});

describe("globalSkillCandidates", () => {
  it("ROLUN listesinin disina cikmaz", () => {
    for (const profile of ["module-consultant", "technical-consultant"] as const) {
      for (const name of globalSkillCandidates(profile)) {
        expect(PROFILE_SKILLS[profile]).toContain(name);
      }
    }
  });

  it("yazma yetenekli hicbir yetenek icermez", () => {
    for (const name of globalSkillCandidates("sandbox")) {
      expect(SKILL_CATALOG[name]?.writeCapable ?? false).toBe(false);
    }
  });
});

describe("planGlobalSkills", () => {
  it("varsayilan ACIK", () => {
    const plan = planGlobalSkills("technical-consultant");
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((entry) => entry.enabled)).toBe(true);
  });

  it("kullanicinin kapattigi yetenek plana girmez", () => {
    const name = globalSkillCandidates("technical-consultant")[0];
    const plan = planGlobalSkills("technical-consultant", { [name]: false });
    expect(plan.find((entry) => entry.name === name)?.enabled).toBe(false);
  });
});

describe("listGlobalSkills", () => {
  it("rol disindaki satir HER ZAMAN kapali gelir (override 'true' olsa bile)", () => {
    const rows = listGlobalSkills("module-consultant");
    const outside = rows.filter((row) => !row.inRole);
    expect(outside.length).toBeGreaterThan(0);
    for (const row of outside) expect(row.enabled).toBe(false);

    // Ayarlara elle `true` yazilsa bile acilmiyor: kapi listede, saklamada degil.
    const forced = Object.fromEntries(outside.map((row) => [row.name, true]));
    for (const row of listGlobalSkills("module-consultant", forced)) {
      if (!row.inRole) expect(row.enabled).toBe(false);
    }
  });

  it("SAP'a yazan yetenekleri hic listelemez", () => {
    for (const row of listGlobalSkills("sandbox")) {
      expect(SKILL_CATALOG[row.name]?.writeCapable ?? false).toBe(false);
    }
  });

  it("once kesisim, sonra modul, sonra teknik siralanir", () => {
    const order = { shared: 0, module: 1, technical: 2, sandbox: 3 } as const;
    const rows = listGlobalSkills("technical-consultant");
    for (let i = 1; i < rows.length; i += 1) {
      expect(order[rows[i].set]).toBeGreaterThanOrEqual(order[rows[i - 1].set]);
    }
  });
});
