// SAP yazma onayının sahibi (madde 2): onay isteğinde sohbet/bölme kimliği YOK
// (ölçüldü: yalnız oturum token'ı = proje klasörü + SID/istemci/kullanıcı, ve
// yazma bilgisi). Gated sunucu çağıranın süreç zincirini `X-Axet-Istemci`
// başlığıyla veriyor; eşleme önce süreçle, yoksa klasörle, birden çok adayda
// belirsiz (otomatik devam yok).
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApprovalTracker,
  dirKey,
  emitApprovalEvent,
  onApprovalEvent,
  registerApprovalCandidate,
  relatedProjectDirs,
  resolveOwnership,
  setApprovalCandidateProvider,
  type ApprovalCandidate,
  type ApprovalEvent,
} from "../app-electron/main/sapWrite/approvalEvents";
import {
  closeWriteSession,
  openWriteSession,
  parseCallerPids,
  respondToApproval,
  setWriteMode,
  stopApprovalServer,
} from "../app-electron/main/sapWrite/server";
import type { WriteFact } from "../app-electron/shared/sapWriteTypes";

const sohbet = (id: string, pids: number[], dir: string, active = true): ApprovalCandidate => ({
  ref: { tur: "sohbet", id },
  pids,
  dir,
  active,
});
const bolme = (id: string, pids: number[], dir: string, active = true): ApprovalCandidate => ({
  ref: { tur: "bolme", id, workspaceId: "w1", name: id },
  pids,
  dir,
  active,
});

describe("resolveOwnership", () => {
  it("süreç zinciri: en yakın ata kimin süreciyse onun; klasöre bakılmaz", () => {
    const c = [sohbet("r1", [100], "C:/p"), bolme("b1", [200], "C:/p")];
    expect(resolveOwnership([999, 200, 50], "C:/p", c)).toEqual({ tur: "tam", sahip: c[1].ref });
    expect(resolveOwnership([999, 100], "C:/baska", c)).toEqual({ tur: "tam", sahip: c[0].ref });
  });

  it("zincir var ama kimseye uymuyor: yok (Studio dışı süreç); klasör yedeğine düşmüyor", () => {
    expect(resolveOwnership([1, 2, 3], "C:/p", [sohbet("r1", [100], "C:/p")])).toEqual({ tur: "yok" });
  });

  it("zincir yoksa klasör: tek etkin aday; ikisi varsa belirsiz; boşta olan sayılmaz", () => {
    const s = sohbet("r1", [100], "C:/p/alt");
    const b = bolme("b1", [200], "C:/p");
    expect(resolveOwnership(null, "C:/p", [s])).toEqual({ tur: "klasor", sahip: s.ref });
    expect(resolveOwnership(null, "C:/p", [s, b])).toEqual({ tur: "belirsiz", adaylar: [s.ref, b.ref] });
    expect(resolveOwnership(null, "C:/p", [s, bolme("b2", [], "C:/p", false)])).toEqual({ tur: "klasor", sahip: s.ref });
    expect(resolveOwnership([], "C:/q", [s, b])).toEqual({ tur: "yok" });
  });
});

describe("klasör anahtarı", () => {
  let tmp = "";
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = "";
  });

  it("gerçek yol: büyük/küçük harf, ayraç, sondaki ayraç aynı; iç içe ilişkili", () => {
    tmp = mkdtempSync(path.join(tmpdir(), "onay-sahip-"));
    const alt = path.join(tmp, "Proje", "Alt");
    mkdirSync(alt, { recursive: true });
    const proje = path.join(tmp, "Proje");
    const variant = process.platform === "win32" ? `${proje.toUpperCase().replace(/\\/g, "/")}/` : `${proje}/`;
    expect(dirKey(variant)).toBe(dirKey(proje));
    expect(relatedProjectDirs(alt, variant)).toBe(true);
    expect(relatedProjectDirs(path.join(tmp, "Proje2"), proje)).toBe(false);
  });

  it("8.3 kısa ad (Windows): PROGRA~1 ile uzun adı aynı klasör", () => {
    if (process.platform !== "win32") return;
    const pf = process.env.ProgramFiles ?? "C:\\Program Files";
    if (!/^c:\\program files$/i.test(pf)) return;
    expect(dirKey("C:\\PROGRA~1")).toBe(dirKey(pf));
  });
});

describe("ApprovalTracker sahibe göre", () => {
  const asked = (id: string, sahiplik?: Extract<ApprovalEvent, { tur: "soruldu" }>["sahiplik"]) =>
    emitApprovalEvent({ tur: "soruldu", id, projectDir: "C:/p", ...(sahiplik ? { sahiplik } : {}) });

  it("aynı klasördeki bölmenin isteği sohbet turunu uyandırmıyor; kendi isteği sayılıyor", () => {
    const t = new ApprovalTracker("C:/p", { tur: "sohbet", id: "r1" });
    asked("X1", { tur: "tam", sahip: { tur: "bolme", id: "b1", workspaceId: "w1", name: "b1" } });
    asked("X2", { tur: "tam", sahip: { tur: "sohbet", id: "r1" } });
    asked("X3", { tur: "yok" });
    expect(t.summary().pending).toEqual(["X2"]);
    t.dispose();
  });

  it("belirsiz: bekleyen sayılmıyor (otomatik devam yok), 'hangi oturum' için ayrı listede", () => {
    const t = new ApprovalTracker("C:/p", { tur: "sohbet", id: "r1" });
    asked("Y1", { tur: "belirsiz", adaylar: [{ tur: "sohbet", id: "r1" }, { tur: "bolme", id: "b1", workspaceId: "w1", name: "b1" }] });
    emitApprovalEvent({ tur: "sonuclandi", id: "Y1", projectDir: "C:/p", durum: "onaylandi" });
    expect(t.summary()).toMatchObject({ pending: [], approved: [], ambiguous: ["Y1"] });
    t.dispose();
  });

  it("sahipliksiz olay (eski gated sunucu): klasör kuralı sürüyor", () => {
    const t = new ApprovalTracker("C:/p", { tur: "sohbet", id: "r1" });
    asked("Z1");
    expect(t.summary().pending).toEqual(["Z1"]);
    t.dispose();
  });
});

describe("onay ucu sahipliği", () => {
  const H = (c: string) => c.repeat(64);
  const fact = (): WriteFact => ({
    arac: "adt_push",
    sinif: "TRANSPORT_ONAYLI",
    nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZP", yeni: false }],
    transport: "DS4K900111",
    transport_bilgi: null,
    arg_hash: H("a"),
  });
  let tmp = "";
  afterEach(async () => {
    setApprovalCandidateProvider(null);
    if (tmp) closeWriteSession(tmp);
    await stopApprovalServer();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = "";
  });

  it("başlık: boşlukla ayrılmış PID'ler; bozuk ya da boşsa null", () => {
    expect(parseCallerPids("12 34  56")).toEqual([12, 34, 56]);
    expect(parseCallerPids(["7"])).toEqual([7]);
    expect(parseCallerPids("")).toBeNull();
    expect(parseCallerPids(undefined)).toBeNull();
    expect(parseCallerPids("12 abc")).toBeNull();
    expect(parseCallerPids("0")).toBeNull();
  });

  it("soruldu olayı sahipliği taşıyor: başlıktaki zincir bölmenin sürecinden geçiyor", async () => {
    tmp = mkdtempSync(path.join(tmpdir(), "onay-uc-"));
    const off2 = registerApprovalCandidate(sohbet("r1", [100], tmp));
    setApprovalCandidateProvider(() => [bolme("b1", [200], tmp)]);
    const got: ApprovalEvent[] = [];
    const off = onApprovalEvent((e) => got.push(e));
    try {
      const s = await openWriteSession(tmp, { sid: "DS4", client: "100", user: "DEV1" });
      setWriteMode(s.sessionId, "dogrudan");
      const post = (headers: Record<string, string>, body: WriteFact) =>
        fetch(`${s.url}/approvals`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}`, ...headers },
          body: JSON.stringify(body),
        }).then((r) => r.json() as Promise<{ id: string }>);
      const a = await post({ "X-Axet-Istemci": "999 200 4" }, fact());
      const b = await post({}, { ...fact(), arg_hash: H("b") });
      const asked = got.filter((e): e is Extract<ApprovalEvent, { tur: "soruldu" }> => e.tur === "soruldu");
      expect(asked.find((e) => e.id === a.id)?.sahiplik).toEqual({ tur: "tam", sahip: { tur: "bolme", id: "b1", workspaceId: "w1", name: "b1" } });
      expect(asked.find((e) => e.id === b.id)?.sahiplik?.tur).toBe("belirsiz");
      respondToApproval(a.id, "reddet");
    } finally {
      off();
      off2();
    }
  });
});
