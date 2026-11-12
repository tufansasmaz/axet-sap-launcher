// R6/R9 (1.9.x kullanıcı raporu): sıfırdan kuran biri sohbette mesaj gönderince
// yalnızca "EOF" görüyor; bir başkası "axet-code turu bitirdi ama hiçbir cevap
// metni üretmedi ... Yeniden üret" — yeniden üretmek hiçbir şey değiştirmiyor.
//
// Ölçülen (2026-11-12, bu makinede, axet-code 1.5.1):
//   * Temiz profil (yapılandırma yok), başsız `axet-code run -v -q
//     --output-format json`: stdout BOŞ, stderr'de çerçeveli "ERROR" ve
//     "Not authenticated, run 'axet-code login' first." Ekrana ham metin gidiyordu.
//   * axet-code ikilisinin kendi metinleri: "AXET mode: deferring agent
//     initialization to TUI onboarding" ve "agent coordinator could not be
//     initialized: %w (run `axet-code` interactively once to complete
//     onboarding ... auth ... project ... model ... then re-run)". Başsız tur
//     ilk kurulum (giriş / proje / model) yapılmadan çalışamıyor; %w'nun
//     yerine gelen alt hata kullanıcıya yalnız "EOF" olarak ulaşıyordu.
// Kullanıcıya ne yapacağını söyleyen tek metin: axet-code'u bir kez
// etkileşimli açıp ilk kurulumu bitirmek.
import { describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k)
}));

const { axetSetupHint } = await import("../app-electron/main/axetChat");

describe("axetSetupHint", () => {
  it("ilk kurulum / giriş eksikliği tanınıyor", () => {
    expect(axetSetupHint("ERROR\nNot authenticated, run 'axet-code login' first.", { modelChosen: false, configHasModel: true })).toContain("chat.axetSetupNeeded");
    expect(
      axetSetupHint("agent coordinator could not be initialized: EOF (run `axet-code` interactively once to complete onboarding)", {
        modelChosen: false,
        configHasModel: false
      })
    ).toContain("chat.axetSetupNeeded");
    expect(axetSetupHint("EOF", { modelChosen: false, configHasModel: true })).toContain("chat.axetSetupNeeded");
  });

  it("boş cevap + hiç model ayarı yok → ilk kurulum (Yeniden üret değil)", () => {
    expect(axetSetupHint("", { modelChosen: false, configHasModel: false })).toContain("chat.axetSetupNeeded");
  });

  it("sıradan hatalarda ve ayarlı kurulumda karışmıyor", () => {
    expect(axetSetupHint("", { modelChosen: false, configHasModel: true })).toBeNull();
    expect(axetSetupHint("", { modelChosen: true, configHasModel: false })).toBeNull();
    expect(axetSetupHint("status 429 Too Many Requests", { modelChosen: false, configHasModel: true })).toBeNull();
    expect(axetSetupHint("read EOF in file foo.txt line 3", { modelChosen: false, configHasModel: true })).toBeNull();
  });
});
