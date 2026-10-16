// Saf araç olayları ve `secenekler` bloğu (spec 2026-10-16 basiz-kopru §5).
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));

const { parseAskUser, splitOptionsBlock, summarizeToolInput, normalizeToolName } = await import(
  "../app-electron/main/axetToolEvents"
);

const FENCE = "```";

describe("splitOptionsBlock", () => {
  it("sondaki secenekler bloğunu ayırıp soruya çeviriyor", () => {
    const raw = `Hangi transport'a yazayım?\n\n${FENCE}secenekler\n- D01K900123\n- D01K900130 (yeni)\n${FENCE}\n`;
    const { text, ask } = splitOptionsBlock(raw);
    expect(text).toBe("Hangi transport'a yazayım?");
    expect(ask).toEqual({
      callId: "secenekler",
      question: "Hangi transport'a yazayım?",
      header: "",
      options: ["D01K900123", "D01K900130 (yeni)"],
      multiSelect: false
    });
  });

  it("blok yoksa metin aynen, ask null", () => {
    expect(splitOptionsBlock("Bitti.")).toEqual({ text: "Bitti.", ask: null });
  });

  it("tek seçenekli ya da boş blok soru sayılmıyor ama metinden atılıyor", () => {
    const { text, ask } = splitOptionsBlock(`Tamam.\n${FENCE}secenekler\n- Evet\n${FENCE}`);
    expect(text).toBe("Tamam.");
    expect(ask).toBeNull();
  });

  it("blok sonda değilse (arkasından metin geliyorsa) dokunulmuyor", () => {
    const raw = `${FENCE}secenekler\n- A\n- B\n${FENCE}\nDevamı var.`;
    expect(splitOptionsBlock(raw)).toEqual({ text: raw, ask: null });
  });

  it("soru metni boşsa blok yine soru; soru alanı boş", () => {
    const { text, ask } = splitOptionsBlock(`${FENCE}secenekler\n- A\n- B\n${FENCE}`);
    expect(text).toBe("");
    expect(ask?.options).toEqual(["A", "B"]);
    expect(ask?.question).toBe("");
  });
});

describe("taşınan yardımcılar", () => {
  it("ask_user girdisi", () => {
    expect(parseAskUser("c1", '{"question":"Renk?","options":[{"label":"Kırmızı"},{"label":"Mavi"}]}')).toEqual({
      callId: "c1",
      question: "Renk?",
      header: "",
      options: ["Kırmızı", "Mavi"],
      multiSelect: false
    });
    expect(parseAskUser("c1", '{"question": "Yar')).toBeNull();
  });

  it("araç adı ve hedef", () => {
    expect(normalizeToolName("view")).toBe("view");
    expect(summarizeToolInput('{"file_path":"C:/p/a.abap"}')).toContain("a.abap");
  });
});
