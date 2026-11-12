// Baglanti kesilince taslak sohbet o sistemin klasorunde kalmaz (kararlilik-2 R8a).

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { draftBindingAfterSapChange } from "../src/lib/sapDraftBinding";

const A = "C:\\proj\\Musteri\\A";
const B = "C:\\proj\\Musteri\\B";

describe("draftBindingAfterSapChange", () => {
  it("kesilen sistemin klasorune bagli taslak duser", () => {
    expect(draftBindingAfterSapChange(A, null, { cwd: A, label: "A" })).toBeNull();
  });

  it("baska sisteme gecince eski sistemin taslak bagi duser", () => {
    expect(draftBindingAfterSapChange(A, B, { cwd: `${A}\\`, label: "A" })).toBeNull();
  });

  it("ayni sisteme yeniden baglanmak taslagi korur", () => {
    const binding = { cwd: A, label: "A" };
    expect(draftBindingAfterSapChange(A, A.toLowerCase(), binding)).toBe(binding);
  });

  it("elle secilmis baska bir klasor korunur", () => {
    const binding = { cwd: "C:\\baska", label: "x" };
    expect(draftBindingAfterSapChange(A, null, binding)).toBe(binding);
  });

  it("onceden bagli sistem yoksa dokunmaz", () => {
    const binding = { cwd: A, label: "A" };
    expect(draftBindingAfterSapChange(null, B, binding)).toBe(binding);
  });

  it("sohbet ekrani bu kurali aktif baglam degisiminde uyguluyor", () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "components", "AxetCodeHome.tsx"), "utf8");
    expect(src).toContain("draftBindingAfterSapChange(");
  });
});
