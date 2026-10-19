// Tur 8: açılış seçimi notlarının metni (tr/en).
import { describe, expect, it } from "vitest";
import { autoSetupDetail, flowBody } from "../src/agents/flowText";
import { translate } from "../src/i18n";
import type { FlowEvent } from "../src/agents/flowEvents";

const note = (detail: string): FlowEvent => ({ id: 1, at: 1, workspaceId: "w", kind: "note", paneId: "a", name: "Ayşe", detail });

describe("flowBody — açılış seçimi", () => {
  it("başarı: araç ve model", () => {
    const tr = (k: string, p?: Record<string, string | number>) => translate("tr", k as never, p);
    expect(flowBody(note(autoSetupDetail("aXet.Code", "Claude Sonnet 5")), tr as never)).toBe("axet-code aracı otomatik seçildi (aXet.Code / model Claude Sonnet 5)");
    expect(flowBody(note(autoSetupDetail("aXet.Code", "")), tr as never)).toBe("axet-code aracı otomatik seçildi (aXet.Code / model son kullanılan)");
    expect(flowBody(note(autoSetupDetail("", "GPT-6 Luna")), tr as never)).toBe("axet-code aracı otomatik seçildi (— / model GPT-6 Luna)");
  });
  it("başarısızlık", () => {
    const en = (k: string, p?: Record<string, string | number>) => translate("en", k as never, p);
    expect(flowBody(note("autoSetupFailed"), en as never)).toBe("Tool selection could not be made automatically — choose it in the terminal.");
  });
  it("ayırıcı karakter adda temizleniyor", () => {
    expect(autoSetupDetail("a|b", "c|d")).toBe("autoSetup|a b|c d");
  });
});
