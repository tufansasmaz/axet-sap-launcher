import { describe, expect, it } from "vitest";
import { ERROR_CLASS_TEXT, agentNotificationFor } from "../app-electron/main/agentNotification";
import { AGENT_ERROR_CLASSES } from "../app-electron/shared/agentErrors";

describe("Tur 9: masaüstü hata bildirimi", () => {
  it("sınıf ve deneme sayısı; ham ileti yok", () => {
    expect(agentNotificationFor("error", false, true, "Ali", "tr", { cls: "rateLimit", attempts: 3, max: 3 })?.body).toBe("Ajan hata verdi: istek sınırı (3/3 deneme)");
    expect(agentNotificationFor("error", false, true, "Ali", "en", { cls: "model", attempts: 0, max: 3 })?.body).toBe("The agent hit an error: model not found");
    expect(agentNotificationFor("error", false, true, "Ali", "tr")?.body).toBe("Ajan hata verdi");
  });
  it("tr/en her sınıf için metin", () => {
    for (const cls of AGENT_ERROR_CLASSES) {
      expect(ERROR_CLASS_TEXT.tr[cls]).toBeTruthy();
      expect(ERROR_CLASS_TEXT.en[cls]).toBeTruthy();
    }
  });
});
