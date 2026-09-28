import path from "node:path";
import { describe, expect, it } from "vitest";
import { pickServerScript } from "../app-electron/main/serverScriptPath";

const PROJECT = path.join("C:", "proje");
const TOOLKIT = path.join("C:", "app", "resources", "sap-toolkit");
const REL = ["sap-adt", "scripts", "adt_gated_server.py"] as const;
const projectCopy = path.join(PROJECT, ".axet-code", "skills", ...REL);
const toolkitCopy = path.join(TOOLKIT, "sap-consultant", "skills", ...REL);

const existing = (...paths: string[]) => (p: string) => paths.includes(p);

describe("pickServerScript", () => {
  it("proje klasöründe kopya olsa da toolkit'inkini seçiyor (R2 O-1)", () => {
    expect(pickServerScript(PROJECT, TOOLKIT, REL, existing(projectCopy, toolkitCopy))).toBe(toolkitCopy);
  });

  it("toolkit var ama betik eksikse proje kopyasına düşmüyor", () => {
    expect(pickServerScript(PROJECT, TOOLKIT, REL, existing(projectCopy))).toBeNull();
  });

  it("toolkit hiç yoksa proje kopyası kullanılıyor", () => {
    expect(pickServerScript(PROJECT, null, REL, existing(projectCopy))).toBe(projectCopy);
    expect(pickServerScript(PROJECT, undefined, REL, existing())).toBeNull();
  });
});
