import { describe, expect, it } from "vitest";
import {
  cleanTopic,
  countLearnNotes,
  createLearnTask,
  engineHasWeb,
  isLearnTaskId,
  learnPrompt,
  LEARN_TIMEOUT_MS,
  LEARN_TOPIC_MAX,
  newLearnTaskId,
  parseLearnReply,
  sanitizeLearnTasks,
  stepLearnTask,
  type LearnTask
} from "../app-electron/shared/learnTasks";
import { agentMessagePrompt, AGENT_MESSAGE_MAX } from "../app-electron/shared/agentMessage";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { MemoryNote } from "../app-electron/shared/memoryNotes";

const base = (over: Partial<LearnTask> = {}): LearnTask => ({
  ...createLearnTask({ workspaceId: "w1", paneId: "p1", agentName: "Ali", topic: "Kur farkı", scopes: ["project"], target: "team" }, 1_000, "og-test01")!,
  ...over
});

const st = (state: AgentStatus["state"], lastActivity: number | null, reply?: string): AgentStatus => ({
  state,
  source: "exact",
  lastActivity,
  ...(reply ? { reply } : {})
});

const note = (id: string, over: Partial<MemoryNote> = {}): MemoryNote => ({
  id,
  title: id,
  body: "",
  kind: "olgu",
  tags: [],
  owner: "",
  created: 0,
  updated: 0,
  ...over
});

describe("öğrenme görevi — kimlik ve konu", () => {
  it("kimlik og- + küçük harf/rakam", () => {
    const id = newLearnTaskId(() => 0.5);
    expect(isLearnTaskId(id)).toBe(true);
    expect(isLearnTaskId("og-AB")).toBe(false);
    expect(isLearnTaskId("../x")).toBe(false);
  });

  it("konu tek satıra iner, sınırda kesilir, boşsa görev kurulmaz", () => {
    expect(cleanTopic("  a\nb\tc  ")).toBe("a b c");
    expect(cleanTopic("x".repeat(500))).toHaveLength(LEARN_TOPIC_MAX);
    expect(createLearnTask({ workspaceId: "w1", paneId: "p1", agentName: "A", topic: "  ", scopes: ["project"], target: "team" }, 1, "og-test01")).toBeNull();
  });

  it("kapsamsız görev kurulmaz; bilinmeyen kapsam atılır", () => {
    expect(createLearnTask({ workspaceId: "w1", paneId: "p1", agentName: "A", topic: "x", scopes: [], target: "team" }, 1, "og-test01")).toBeNull();
    const t = createLearnTask({ workspaceId: "w1", paneId: "p1", agentName: "A", topic: "x", scopes: ["web", "sap" as never], target: "team" }, 1, "og-test01");
    expect(t?.scopes).toEqual(["web"]);
    expect(t?.state).toBe("waiting");
  });
});

describe("öğrenme istemi", () => {
  it("tek satır, mesaj kapısından geçer, sınırın altında (en uzun konu ve bütün kapsamlarla)", () => {
    const p = learnPrompt({ id: "og-test01", topic: "ğ".repeat(LEARN_TOPIC_MAX), scopes: ["project", "web", "team"], target: "self" });
    expect(p).not.toMatch(/[\n\r]/);
    expect(p.length).toBeLessThanOrEqual(AGENT_MESSAGE_MAX);
    expect(agentMessagePrompt(p)).not.toBeNull();
  });

  it("görev kimliği, komutlar, tür listesi ve son satır kalıbı", () => {
    const p = learnPrompt({ id: "og-test01", topic: "Kur farkı", scopes: ["project"], target: "team" });
    expect(p).toContain("og-test01");
    expect(p).toContain("Kur farkı");
    expect(p).toContain("ntt-team memory search");
    expect(p).toContain("ntt-team memory add");
    expect(p).toContain("ntt-team memory update");
    expect(p).toContain("--gorev og-test01");
    expect(p).toMatch(/olgu.*ogrenim.*karar.*kisi/);
    expect(p).toContain("Kaynak:");
    expect(p).toContain("[[");
    expect(p).toContain("OGRENME-OZET:");
    expect(p).not.toContain("--ben");
  });

  it("yasaklar: SAP yok, gizli bilgi yok, dosya değiştirme yok", () => {
    const p = learnPrompt({ id: "og-test01", topic: "x", scopes: ["project"], target: "team" });
    expect(p).toMatch(/SAP/);
    expect(p).toMatch(/şifre/);
    expect(p).toMatch(/token/);
    expect(p).toMatch(/kişisel veri/);
    expect(p).toMatch(/değiştirme/);
  });

  it("kapsam: web seçilmediyse web'e çıkma; seçildiyse URL kaynak", () => {
    expect(learnPrompt({ id: "og-test01", topic: "x", scopes: ["project"], target: "team" })).toMatch(/Web'e çıkma/);
    const web = learnPrompt({ id: "og-test01", topic: "x", scopes: ["web"], target: "team" });
    expect(web).toMatch(/URL/);
    expect(web).not.toMatch(/proje klasörü/);
    expect(learnPrompt({ id: "og-test01", topic: "x", scopes: ["team"], target: "team" })).toContain("ntt-team feed");
  });

  it("kendi belleği hedefse add --ben alır", () => {
    expect(learnPrompt({ id: "og-test01", topic: "x", scopes: ["project"], target: "self" })).toContain("--gorev og-test01 --ben");
  });

  it("konudaki tırnak ve köşeli parantez istemi bozmaz", () => {
    const p = learnPrompt({ id: "og-test01", topic: 'a "b" [[c]] !d', scopes: ["project"], target: "team" });
    expect(p).not.toContain('"b"');
    expect(p).not.toContain("[[c]]");
  });
});

describe("web aracı", () => {
  it("ölçülen motorlar", () => {
    expect(engineHasWeb("axet-code")).toBe(true);
    expect(engineHasWeb("claude")).toBe(true);
    expect(engineHasWeb("gemini")).toBe(true);
    expect(engineHasWeb("codex")).toBe(false);
    expect(engineHasWeb("ozel")).toBe(false);
  });
});

describe("görev durum makinesi", () => {
  it("gönderildi → çalışıyor (taban anlık görüntüsüyle)", () => {
    const t = stepLearnTask(base(), { type: "sent", at: 2_000, baseline: { "n-a": 5 } });
    expect(t).toMatchObject({ state: "running", startedAt: 2_000, baseline: { "n-a": 5 } });
  });

  it("meşgul/soru/yazıyor → bekliyor (sebepli); ajan yok → hata", () => {
    expect(stepLearnTask(base(), { type: "sendFailed", reason: "busy", at: 2 })).toMatchObject({ state: "waiting", reason: "busy" });
    expect(stepLearnTask(base(), { type: "sendFailed", reason: "asking", at: 2 })).toMatchObject({ state: "waiting", reason: "asking" });
    expect(stepLearnTask(base(), { type: "sendFailed", reason: "notRunning", at: 2 })).toMatchObject({ state: "error", reason: "notRunning", endedAt: 2 });
  });

  it("çalışıyor → meşgul görüldükten sonra boşta = bitti (özet ve öneriler)", () => {
    let t = stepLearnTask(base(), { type: "sent", at: 2_000, baseline: {} });
    t = stepLearnTask(t, { type: "status", status: st("idle", 1_500), at: 2_100 });
    expect(t.state).toBe("running");
    t = stepLearnTask(t, { type: "status", status: st("running", 2_200), at: 2_200 });
    t = stepLearnTask(t, { type: "status", status: st("idle", 9_000, "OGRENME-OZET: Kur farkı ayda bir. | SONRAKI: Kapanış; Değerleme"), at: 9_000 });
    expect(t).toMatchObject({ state: "done", endedAt: 9_000, summary: "Kur farkı ayda bir.", suggestions: ["Kapanış", "Değerleme"] });
  });

  it("meşgul anı kaçsa da gönderimden sonraki etkinlikle boşta = bitti", () => {
    let t = stepLearnTask(base(), { type: "sent", at: 2_000, baseline: {} });
    t = stepLearnTask(t, { type: "status", status: st("idle", 5_000, "tamam"), at: 5_000 });
    expect(t.state).toBe("done");
    expect(t.summary).toBe("tamam");
  });

  it("ajan hata verir ya da kapanırsa hata", () => {
    const run = stepLearnTask(base(), { type: "sent", at: 2_000, baseline: {} });
    expect(stepLearnTask(run, { type: "status", status: st("error", 3_000), at: 3_000 })).toMatchObject({ state: "error", reason: "agentError" });
    expect(stepLearnTask(run, { type: "status", status: st("finished", 3_000), at: 3_000 })).toMatchObject({ state: "error", reason: "agentClosed" });
  });

  it("süre sınırı: çalışıyor görev LEARN_TIMEOUT_MS dolunca zaman aşımı; dolmadan değişmez", () => {
    expect(LEARN_TIMEOUT_MS).toBe(30 * 60_000);
    const run = stepLearnTask(base(), { type: "sent", at: 2_000, baseline: {} });
    expect(stepLearnTask(run, { type: "tick", at: 2_000 + LEARN_TIMEOUT_MS - 1 })).toBe(run);
    expect(stepLearnTask(run, { type: "tick", at: 2_000 + LEARN_TIMEOUT_MS })).toMatchObject({ state: "timeout", endedAt: 2_000 + LEARN_TIMEOUT_MS });
    expect(stepLearnTask(base(), { type: "tick", at: 9e12 }).state).toBe("waiting");
  });

  it("zaman aşımı/hata görevi yeniden denenir: bekliyor, süre ve sebep sıfır", () => {
    const run = stepLearnTask(base(), { type: "sent", at: 2_000, baseline: {} });
    const late = stepLearnTask(run, { type: "tick", at: 2_000 + LEARN_TIMEOUT_MS });
    const again = stepLearnTask(late, { type: "retry" });
    expect(again.state).toBe("waiting");
    expect(again.startedAt).toBeUndefined();
    expect(again.endedAt).toBeUndefined();
    expect(again.reason).toBeUndefined();
    expect(stepLearnTask(run, { type: "retry" })).toBe(run);
    expect(sanitizeLearnTasks([late])[0].state).toBe("timeout");
  });

  it("bitmiş görev durum olayıyla değişmez", () => {
    let t = stepLearnTask(base(), { type: "sent", at: 2_000, baseline: {} });
    t = stepLearnTask(t, { type: "status", status: st("idle", 5_000), at: 5_000 });
    expect(stepLearnTask(t, { type: "status", status: st("error", 6_000), at: 6_000 })).toBe(t);
  });
});

describe("not sayımı", () => {
  it("eklenen = göreve işaretli ya da görev penceresinde bu ajanın yazdığı yeni not; güncellenen = tabanda olup değişen", () => {
    const t = { ...base(), state: "running" as const, startedAt: 2_000, baseline: { "n-old1": 100, "n-old2": 100 } };
    const notes = [
      note("n-old1", { updated: 100 }),
      note("n-old2", { updated: 3_000 }),
      note("n-new1", { created: 2_500, updated: 2_500, source: { type: "task", name: "Ali", ref: "og-test01" } }),
      note("n-new2", { created: 2_600, updated: 2_600, source: { type: "agent", name: "Ali" } }),
      note("n-oth", { created: 2_700, updated: 2_700, source: { type: "agent", name: "Veli" } }),
      note("n-user", { created: 2_800, updated: 2_800, source: { type: "user" } })
    ];
    expect(countLearnNotes(t, notes)).toEqual({ added: ["n-new1", "n-new2"], updated: ["n-old2"] });
  });

  it("başlamamış görevde sayım boş", () => {
    expect(countLearnNotes(base(), [note("n-x", { created: 5_000, source: { type: "task", ref: "og-test01" } })])).toEqual({ added: [], updated: [] });
  });
});

describe("özet ayrıştırma", () => {
  it("işaretsiz cevap olduğu gibi özet; öneri yok", () => {
    expect(parseLearnReply("Bitti, 3 not yazdım.")).toEqual({ summary: "Bitti, 3 not yazdım.", suggestions: [] });
  });
  it("Türkçe harfli işaret de tutar, en çok 3 öneri, tekrar yok", () => {
    expect(parseLearnReply("ön söz\nÖĞRENME-ÖZET: x | SONRAKİ: a; b; a; c; d")).toEqual({ summary: "x", suggestions: ["a", "b", "c"] });
  });
  it("boş cevap", () => {
    expect(parseLearnReply(undefined)).toEqual({ suggestions: [] });
  });
});

describe("kalıcılık süzgeci", () => {
  it("bozuk kayıtlar atılır, çalışıyor olan yeniden açılışta korunur, sınır", () => {
    const ok = base();
    const list = sanitizeLearnTasks([ok, { id: "x" }, null, { ...ok, id: "og-test02", state: "zzz" }]);
    expect(list.map((t) => t.id)).toEqual(["og-test01"]);
    const many = Array.from({ length: 80 }, (_, i) => ({ ...ok, id: `og-t${String(i).padStart(4, "0")}` }));
    expect(sanitizeLearnTasks(many)).toHaveLength(50);
  });
});
