// Lider çalıştırıcısı (spec 2026-10-18 gorev-panosu §3, §7, §10). axet-code
// ÇALIŞTIRILMIYOR: tur, sürüm denetimi ve git status enjekte.
import { describe, expect, it, vi } from "vitest";
import { runLead, type LeadDeps, type LeadTurnResult } from "../app-electron/main/boardLead";

const PLAN = '```json\n{"subtasks":[{"title":"Model","prompt":"Tabloyu ekle.","role":"coder","dependsOn":[]}]}\n```';

function harness(turn: Partial<LeadTurnResult> | "hang", over: Partial<LeadDeps> = {}, git: (string | null)[] = ["", ""]) {
  const calls: { cwd: string; prompt: string }[] = [];
  const cancel = vi.fn();
  const gitQueue = [...git];
  const deps: LeadDeps = {
    binaryMessage: async () => null,
    startTurn: (cwd, prompt) => {
      calls.push({ cwd, prompt });
      const done =
        turn === "hang"
          ? new Promise<LeadTurnResult>(() => {})
          : Promise.resolve({ ok: true, text: PLAN, timedOut: false, spawnFailed: false, ...turn });
      return { done, cancel };
    },
    gitStatus: async () => (gitQueue.length ? gitQueue.shift()! : null),
    now: () => 1_000,
    ...over
  };
  return { deps, calls, cancel };
}

describe("runLead", () => {
  it("başarı: plan, alan kökünde tek tur, istem aynen gidiyor", async () => {
    const h = harness({});
    const outcome = await runLead("C:\\proje", "İSTEM", h.deps).done;
    expect(h.calls).toEqual([{ cwd: "C:\\proje", prompt: "İSTEM" }]);
    expect(outcome).toMatchObject({ ok: true, changedFiles: false });
    if (outcome.ok) expect(outcome.subtasks[0]).toEqual({ title: "Model", prompt: "Tabloyu ekle.", roleHint: "coder", dependsOn: [] });
  });

  it("axet-code yok/eski/bozuk: tur başlamıyor, Doktor mesajı detayda", async () => {
    const h = harness({}, { binaryMessage: async () => "axet-code 1.3.9 çok eski; en az 1.4.0 gerekli." });
    const outcome = await runLead("C:\\p", "x", h.deps).done;
    expect(h.calls).toEqual([]);
    expect(outcome).toMatchObject({ ok: false, error: "binary", detail: "axet-code 1.3.9 çok eski; en az 1.4.0 gerekli." });
  });

  it("JSON dışı cevap: noJson ve ham cevap (≤ 8 KB)", async () => {
    const h = harness({ text: "Üzgünüm, " + "uzun ".repeat(3000) });
    const outcome = await runLead("C:\\p", "x", h.deps).done;
    expect(outcome).toMatchObject({ ok: false, error: "noJson" });
    if (!outcome.ok) expect(outcome.raw!.length).toBe(8192);
  });

  it("süre aşımı: timeout (ağacı startHeadlessTurn kapatıyor)", async () => {
    const h = harness({ ok: false, text: "", timedOut: true });
    expect(await runLead("C:\\p", "x", h.deps).done).toMatchObject({ ok: false, error: "timeout" });
  });

  it("tur hatası: failed ve hata metni", async () => {
    const h = harness({ ok: false, text: "", error: "403 Forbidden" });
    expect(await runLead("C:\\p", "x", h.deps).done).toMatchObject({ ok: false, error: "failed", detail: "403 Forbidden" });
  });

  it("git status farkı: lider planlarken dosya değiştirdi (başarıda da hatada da)", async () => {
    const ok = await runLead("C:\\p", "x", harness({}, {}, ["", " M src/a.ts\n"]).deps).done;
    expect(ok.changedFiles).toBe(true);
    const bad = await runLead("C:\\p", "x", harness({ text: "yok" }, {}, ["", "?? yeni.txt\n"]).deps).done;
    expect(bad).toMatchObject({ ok: false, error: "noJson", changedFiles: true });
  });

  it("Git deposu değil (null): fark yok sayılmıyor, changedFiles false", async () => {
    const outcome = await runLead("C:\\p", "x", harness({}, {}, [null, null]).deps).done;
    expect(outcome.changedFiles).toBe(false);
  });

  it("iptal turu durduruyor", async () => {
    const h = harness("hang");
    const run = runLead("C:\\p", "x", h.deps);
    await new Promise((r) => setTimeout(r, 0));
    run.cancel();
    expect(h.cancel).toHaveBeenCalledTimes(1);
  });

  it("bağımlılık atarsa söz reddedilmiyor: failed", async () => {
    const h = harness({}, {
      startTurn: () => {
        throw new Error("spawn");
      }
    });
    expect(await runLead("C:\\p", "x", h.deps).done).toMatchObject({ ok: false, error: "failed" });
  });
});
