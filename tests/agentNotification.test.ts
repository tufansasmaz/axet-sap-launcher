// Ajan bildirimi: saf karar (spec 2026-10-17 ajan-alani §9).
import { describe, expect, it } from "vitest";
import { agentNotificationFor } from "../app-electron/main/agentNotification";

describe("agentNotificationFor", () => {
  it("pencere odaktaysa ya da ayar kapalıysa bildirim yok", () => {
    expect(agentNotificationFor("asking", true, true, "Ayşe")).toBeNull();
    expect(agentNotificationFor("done", false, false, "Ayşe")).toBeNull();
  });

  it("başlık ajanın adı, gövde sabit; ad boşsa NTT Studio", () => {
    expect(agentNotificationFor("asking", false, true, "Ayşe")).toEqual({ title: "Ayşe", body: "Ajan bir soru soruyor" });
    expect(agentNotificationFor("done", false, true, "  ")).toEqual({ title: "NTT Studio", body: "Ajan işini bitirdi" });
  });

  it("İngilizce gövde", () => {
    expect(agentNotificationFor("done", false, true, "Ayşe", "en")?.body).toBe("The agent finished its work");
  });
});
