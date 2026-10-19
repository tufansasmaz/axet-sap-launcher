// Lider ajanın ekip kurması ve yönetmesi (Tur 7). Köprü (teamBridge.ts) POST
// /lead isteğini buraya verir; Electron'a dokunmuyor, her şey bağımlılık:
//   - bölme açma/kapama renderer'da (terminal deposunun addPane/closePane yolu),
//   - göreve yazım Akış mesaj kutusunun kapılarından (agentSender),
//   - durum ajan izleyiciden (Tur 6: kesin/tahmini, aşama, tur).
// Görevler bellekte (uygulama kapanınca biter); kalıcı iz Akış geçmişinde.
// Yetki kuralları leadCommands.ts'te (saf); burada yalnız uygulanıyor.
import type { AgentEngineId, AgentStatus } from "../shared/agentTypes";
import { AXET_SETUP_DETAIL } from "../shared/agentTypes";
import {
  extractLeadResult,
  isLeadRole,
  leadTaskPrompt,
  parseLeadArgs,
  pickSpawnEngine,
  spawnRoleLabel,
  type LeadAct,
  type LeadApprovalRequest,
  type LeadSpawnRequest
} from "../shared/leadCommands";

export type { LeadApprovalRequest, LeadSpawnRequest };
import { MAX_TERMINAL_PANES } from "../shared/terminalLayout";

export interface LeadMember {
  paneId: string;
  name: string;
  role: string;
  engine: AgentEngineId;
  /** Bu ajanı açan liderin bölmesi (yalnız lider açtıysa). */
  spawnedBy?: string;
}

export interface LeadCaller {
  workspaceId: string;
  paneId: string;
  name: string;
}

export interface LeadSettings {
  /** Ayarlar → "Lider ajan ekip kurabilsin". */
  enabled: boolean;
  /** Ayarlar → "Lider açılışlarını onayla". */
  approval: boolean;
  /** Ekip başına lider açımı ajan sınırı. */
  max: number;
  lang: "tr" | "en";
}

export interface LeadRelay {
  workspaceId: string;
  paneId: string;
  name: string;
  detail: string;
  act: LeadAct;
  toPaneId?: string;
}

export interface TeamLeadDeps {
  members(workspaceId: string): LeadMember[];
  /** Alandaki bütün bölmeler (kabuklar dahil). */
  paneCount(workspaceId: string): number;
  settings(): LeadSettings;
  status(paneId: string): AgentStatus | null;
  send(workspaceId: string, paneId: string, text: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  /** Bölmenin terminal çıktısının sonu (sonuç satırı için). */
  output(paneId: string): string;
  openPane(req: LeadSpawnRequest): Promise<{ ok: true; engine: AgentEngineId } | { ok: false; reason: string }>;
  closePane(workspaceId: string, paneId: string, leaderPaneId: string): Promise<boolean>;
  approve(req: LeadApprovalRequest): Promise<boolean>;
  relay(event: LeadRelay): void;
  newPaneId(): string;
  newTaskId(): string;
  now(): number;
  sleep(ms: number): Promise<void>;
  log(tag: string, fields: Record<string, string | number | boolean>): void;
}

export type LeadTaskState = "queued" | "sending" | "sent" | "done" | "failed";

export interface LeadTask {
  id: string;
  workspaceId: string;
  leaderPaneId: string;
  leaderName: string;
  targetPaneId: string;
  targetName: string;
  text: string;
  state: LeadTaskState;
  createdAt: number;
  sentAt?: number;
  sawRunning?: boolean;
  /** Ajanın özet satırı ya da cevabı. */
  result?: string;
  /** Sonuç görev kimliğiyle eşleşti mi (GOREV-SONUC satırı). */
  matched?: boolean;
  note?: string;
  asking?: string;
}

export interface LeadResponse {
  status: number;
  body: Record<string, unknown>;
}

/** Açılan ajanın kaydolmasının en çok bekleneceği süre. */
export const SPAWN_REGISTER_MS = 60_000;
/** Aynı ekipte aynı anda sürebilecek açılış. */
export const SPAWN_CONCURRENT_MAX = 2;
/** Kuyruktaki görev (ajan meşgul / araç seçimi) en çok bu kadar bekler. */
export const QUEUE_MAX_MS = 15 * 60_000;
/** Gönderilmiş görevin sonucu en çok bu kadar beklenir. */
export const TASK_MAX_MS = 60 * 60_000;
/** Bellekte tutulan görev sayısı (bitenler eskiden atılır). */
const TASKS_KEEP = 200;
const POLL_MS = 1_000;
const RETRYABLE = new Set(["busy", "typing", "asking", "notRunning", "notSubmitted"]);

const json = (status: number, body: Record<string, unknown>): LeadResponse => ({ status, body });
const err = (status: number, error: string): LeadResponse => json(status, { ok: false, error });
const lower = (s: string) => s.toLocaleLowerCase("tr");

export interface TeamLead {
  handle(caller: LeadCaller, args: unknown): Promise<LeadResponse>;
  /** Saniyede bir: kuyruktaki görevleri gönderir, gönderilenlerin sonucunu toplar. */
  tick(): void;
  tasks(): LeadTask[];
}

export function createTeamLead(deps: TeamLeadDeps): TeamLead {
  const tasks = new Map<string, LeadTask>();
  const pending = new Map<string, number>();
  /** Bu oturumda açılan bölmeler → açan lider (config yazılmadan önce de bilinsin). */
  const spawned = new Map<string, string>();

  const findMember = (members: LeadMember[], to: string) => {
    const key = lower(to.trim());
    return members.find((m) => m.paneId === to || lower(m.name) === key) ?? null;
  };
  const spawnedBy = (m: LeadMember) => m.spawnedBy ?? spawned.get(m.paneId);

  function relayResult(task: LeadTask) {
    deps.relay({
      workspaceId: task.workspaceId,
      paneId: task.targetPaneId,
      name: `${task.targetName} → ${task.leaderName}`,
      detail: `[${task.id}] ${task.state === "done" ? (task.result ?? task.note ?? "") : (task.note ?? "")}`.trim(),
      act: "result",
      toPaneId: task.leaderPaneId
    });
  }

  function finish(task: LeadTask, state: "done" | "failed", fields: Partial<LeadTask>) {
    Object.assign(task, fields, { state });
    deps.log("ekip.lider.gorev", { sonuc: state, eslesti: task.matched === true });
    relayResult(task);
  }

  function trim() {
    if (tasks.size <= TASKS_KEEP) return;
    for (const [id, t] of tasks) {
      if (tasks.size <= TASKS_KEEP) break;
      if (t.state === "done" || t.state === "failed") tasks.delete(id);
    }
  }

  function queueTask(caller: LeadCaller, target: LeadMember, text: string): LeadTask {
    let id = deps.newTaskId();
    while (tasks.has(id)) id = deps.newTaskId();
    const task: LeadTask = {
      id,
      workspaceId: caller.workspaceId,
      leaderPaneId: caller.paneId,
      leaderName: caller.name,
      targetPaneId: target.paneId,
      targetName: target.name,
      text,
      state: "queued",
      createdAt: deps.now()
    };
    tasks.set(id, task);
    trim();
    return task;
  }

  async function sendTask(task: LeadTask) {
    task.state = "sending";
    let result: { ok: true } | { ok: false; reason: string };
    try {
      result = await deps.send(task.workspaceId, task.targetPaneId, leadTaskPrompt(task.leaderName, task.id, task.text));
    } catch {
      result = { ok: false, reason: "writeFailed" };
    }
    if (task.state !== "sending") return;
    if (result.ok) {
      task.state = "sent";
      task.sentAt = deps.now();
      deps.relay({
        workspaceId: task.workspaceId,
        paneId: task.leaderPaneId,
        name: `${task.leaderName} → ${task.targetName}`,
        detail: `[${task.id}] ${task.text}`,
        act: "assign",
        toPaneId: task.targetPaneId
      });
      deps.log("ekip.lider.gorev", { sonuc: "gonderildi" });
      return;
    }
    if (RETRYABLE.has(result.reason)) {
      task.state = "queued";
      return;
    }
    finish(task, "failed", { note: `Gorev gonderilemedi (${result.reason}).` });
  }

  function checkSent(task: LeadTask, status: AgentStatus | null, now: number) {
    const sentAt = task.sentAt ?? now;
    const marked = extractLeadResult(status?.reply, task.id) ?? extractLeadResult(deps.output(task.targetPaneId), task.id);
    if (marked) return finish(task, "done", { result: marked, matched: true, asking: undefined });
    if (!status) return finish(task, "failed", { note: `${task.targetName} kapandi.` });
    if (status.state === "running") {
      task.sawRunning = true;
      task.asking = undefined;
      return;
    }
    if (status.state === "asking") {
      task.asking = status.question?.question ?? "";
      return;
    }
    if (status.state === "error" && task.sawRunning) return finish(task, "failed", { note: `${task.targetName} hata verdi.` });
    if (status.source === "exact") {
      const fresh = status.lastActivity !== null && status.lastActivity >= sentAt;
      if ((status.state === "idle" || status.state === "finished") && (task.sawRunning || fresh)) {
        return finish(task, "done", {
          result: status.reply ?? undefined,
          matched: false,
          note: status.reply ? "Ozet satiri yok; ajanin son cevabi." : "Cevap metni okunamadi; cevap terminalinde."
        });
      }
    } else if (status.turn && status.turn.at >= sentAt && status.turn.done) {
      return finish(task, "done", { matched: false, note: `${task.targetName} bitirmis gorunuyor (tahmini); ozet satiri yok, cevap terminalinde.` });
    }
    if (now - sentAt > TASK_MAX_MS) finish(task, "failed", { note: "Sonuc 60 dk icinde gelmedi." });
  }

  function tick() {
    const now = deps.now();
    const busyTargets = new Set<string>();
    for (const t of tasks.values()) if (t.state === "sent" || t.state === "sending") busyTargets.add(t.targetPaneId);
    for (const task of [...tasks.values()].sort((a, b) => a.createdAt - b.createdAt)) {
      try {
        if (task.state === "sent") checkSent(task, deps.status(task.targetPaneId), now);
        else if (task.state === "queued") {
          if (busyTargets.has(task.targetPaneId)) continue;
          const status = deps.status(task.targetPaneId);
          if (now - task.createdAt > QUEUE_MAX_MS) {
            finish(task, "failed", { note: status?.detail === AXET_SETUP_DETAIL ? "Arac secimi yapilmadi (terminalde secilmeli)." : "Ajan gorevi alacak duruma gelmedi." });
            continue;
          }
          if (!status || status.detail === AXET_SETUP_DETAIL || status.state === "running" || status.state === "asking") continue;
          busyTargets.add(task.targetPaneId);
          void sendTask(task);
        }
      } catch {
        // tek görevin hatası öbürlerini durdurmasın
      }
    }
  }

  function isLeader(caller: LeadCaller, members: LeadMember[]): LeadMember | null {
    const me = members.find((m) => m.paneId === caller.paneId);
    return me && isLeadRole(me.role) && !spawnedBy(me) ? me : null;
  }

  async function spawn(caller: LeadCaller, me: LeadMember, cmd: Extract<ReturnType<typeof parseLeadArgs>, { cmd: "spawn" }>): Promise<LeadResponse> {
    const settings = deps.settings();
    if (!settings.enabled) return err(403, "Ayarlar'da \"Lider ajan ekip kurabilsin\" kapali; ekipteki ajanlara assign ile gorev verebilirsin.");
    const role = spawnRoleLabel(cmd, settings.lang);
    if ("error" in role) return err(403, role.error);
    if (cmd.engine) {
      const picked = pickSpawnEngine(me.engine, cmd.engine, null);
      if (!picked.ok) return err(403, picked.error);
    } else if (!pickSpawnEngine(me.engine, null, null).ok) return err(403, "Senin motorunla ajan acilamaz.");
    const ws = caller.workspaceId;
    const members = deps.members(ws);
    // Tekrar koruması (ölçüm Tur 7): lider aynı açılışı yeniden isterse (kabuk aracı
    // zaman aşımı, model yeniden denemesi) yeni bölme açılmıyor, var olan söyleniyor.
    const twin = cmd.task
      ? [...tasks.values()].find((t) => t.leaderPaneId === caller.paneId && t.text === cmd.task && t.state !== "failed" && members.some((m) => m.paneId === t.targetPaneId))
      : undefined;
    if (twin) {
      deps.log("ekip.lider.ac", { sonuc: "tekrar" });
      return json(200, { ok: true, text: `Bu gorevle zaten acildi: ${twin.targetName}, gorev ${twin.id} (${twin.state === "done" ? "bitti" : "suruyor"}). Yeni ajan acilmadi. Sonuc: ntt-team wait ${twin.id}`, name: twin.targetName });
    }
    const inFlight = pending.get(ws) ?? 0;
    const mine = members.filter((m) => spawnedBy(m)).length;
    if (mine + inFlight >= settings.max) return err(429, `Ekip basina en cok ${settings.max} lider-acimi ajan; once birini kapat (ntt-team close <ajan>).`);
    if (deps.paneCount(ws) + inFlight >= MAX_TERMINAL_PANES) return err(429, `Ekip dolu (en cok ${MAX_TERMINAL_PANES} bolme).`);
    if (inFlight >= SPAWN_CONCURRENT_MAX) return err(429, "Baska acilislar suruyor; biraz sonra yeniden dene.");
    // Ad: verilen ya da rol + sıra; ekipte aynı ad varsa sayı eklenir.
    const taken = new Set(members.map((m) => lower(m.name)));
    const base = cmd.name || role.label;
    let name = base;
    for (let n = 2; taken.has(lower(name)); n++) name = `${base} ${n}`;
    pending.set(ws, inFlight + 1);
    try {
      if (settings.approval) {
        const ok = await deps.approve({ workspaceId: ws, leaderPaneId: caller.paneId, leader: caller.name, name, role: role.label, engine: (cmd.engine as AgentEngineId | null) ?? null, task: cmd.task });
        if (!ok) {
          deps.relay({ workspaceId: ws, paneId: caller.paneId, name: caller.name, detail: `${name} (${role.label})`, act: "denied" });
          deps.log("ekip.lider.ac", { sonuc: "reddedildi" });
          return err(403, `Kullanici ${name} acilisini onaylamadi.`);
        }
      }
      const paneId = deps.newPaneId();
      const opened = await deps.openPane({
        workspaceId: ws,
        paneId,
        name,
        role: role.label,
        roleKind: role.preset ? "preset" : "custom",
        leaderPaneId: caller.paneId,
        leaderEngine: me.engine,
        engine: (cmd.engine as AgentEngineId | null) ?? null
      });
      if (!opened.ok) {
        deps.log("ekip.lider.ac", { sonuc: opened.reason });
        return err(409, `Ajan acilamadi (${opened.reason}).`);
      }
      spawned.set(paneId, caller.paneId);
      deps.relay({ workspaceId: ws, paneId: caller.paneId, name: caller.name, detail: `${name} (${role.label})`, act: "spawn", toPaneId: paneId });
      deps.log("ekip.lider.ac", { sonuc: "tamam", motor: opened.engine });
      // Kayıt (terminal açıldı, izleyici tanıdı) beklenir; gelmezse görev yine kuyrukta.
      const until = deps.now() + SPAWN_REGISTER_MS;
      while (deps.now() < until && !deps.status(paneId)) await deps.sleep(500);
      const ready = deps.status(paneId);
      let taskLine = "";
      if (cmd.task) {
        const task = queueTask(caller, { paneId, name, role: role.label, engine: opened.engine, spawnedBy: caller.paneId }, cmd.task);
        taskLine = ` Gorev ${task.id} kuyrukta; ajan hazir olunca gidecek. Sonuc icin: ntt-team wait ${task.id}`;
      }
      const setup = ready?.detail === AXET_SETUP_DETAIL ? " Ajan acilista arac secimi bekliyor: kullanici terminalde secmeli." : "";
      const late = ready ? "" : " Ajan henuz hazir degil (terminal aciliyor).";
      return json(200, { ok: true, text: `Ajan acildi: ${name} (${role.label}, ${opened.engine}).${late}${setup}${taskLine}`, name, engine: opened.engine });
    } finally {
      const left = (pending.get(ws) ?? 1) - 1;
      if (left > 0) pending.set(ws, left);
      else pending.delete(ws);
    }
  }

  async function wait(caller: LeadCaller, id: string, timeoutS: number): Promise<LeadResponse> {
    const task = tasks.get(id);
    if (!task || task.leaderPaneId !== caller.paneId) return err(404, `${id} senin gorevin degil ya da yok.`);
    const until = deps.now() + timeoutS * 1000;
    for (;;) {
      if (task.state === "done") {
        const text = task.result
          ? `${task.targetName} [${id}]${task.matched ? "" : " (ozet satiri yok)"}:\n${task.result}`
          : `${task.targetName} [${id}]: ${task.note ?? "bitti"}`;
        return json(200, { ok: true, id, state: "done", matched: task.matched === true, text });
      }
      if (task.state === "failed") return json(200, { ok: false, id, state: "failed", error: `${task.targetName} [${id}]: ${task.note ?? "basarisiz"}` });
      if (task.asking !== undefined) {
        return json(202, { ok: true, id, state: "asking", text: `${task.targetName} [${id}] soru soruyor: ${task.asking} -- kullanici ya da sen cevapla (ntt-team ask), sonra yeniden wait.` });
      }
      if (deps.now() >= until) {
        const where = task.state === "queued" ? "kuyrukta (ajan henuz alamadi)" : "suruyor";
        return json(202, { ok: true, id, state: task.state, text: `${task.targetName} [${id}] ${where}; ${timeoutS} sn doldu. Yeniden: ntt-team wait ${id}` });
      }
      await deps.sleep(POLL_MS);
    }
  }

  function status(caller: LeadCaller, members: LeadMember[]): LeadResponse {
    const settings = deps.settings();
    const lines = members.map((m) => {
      const s = deps.status(m.paneId);
      const state = !s ? "kapali" : s.detail === AXET_SETUP_DETAIL ? "arac secimi" : s.state;
      const phase = s?.phase ? ` (${s.phase.kind}${s.phase.tool ? `: ${s.phase.tool}` : ""})` : "";
      const by = spawnedBy(m);
      const tag = m.paneId === caller.paneId ? " (sen)" : by === caller.paneId ? " [senin actigin]" : by ? " [lider acti]" : "";
      return `${m.name}${tag} | rol: ${m.role || "-"} | motor: ${m.engine} | durum: ${state}${phase}`;
    });
    const active = [...tasks.values()].filter((t) => t.leaderPaneId === caller.paneId && t.state !== "done" && t.state !== "failed");
    const mine = members.filter((m) => spawnedBy(m)).length;
    const out = [
      ...lines,
      active.length ? "Aktif gorevler:" : "Aktif gorev yok.",
      ...active.map((t) => `  ${t.id} → ${t.targetName}: ${t.state === "queued" || t.state === "sending" ? "kuyrukta" : t.asking !== undefined ? "soru soruyor" : "suruyor"} | ${t.text.slice(0, 80)}`),
      settings.enabled ? `Acilabilecek ajan: ${Math.max(0, settings.max - mine)} (sinir ${settings.max})` : "Ajan acma kapali (Ayarlar)."
    ];
    return json(200, { ok: true, text: out.join("\n") });
  }

  async function close(caller: LeadCaller, members: LeadMember[], to: string): Promise<LeadResponse> {
    const target = findMember(members, to);
    if (!target) return err(404, `Ekipte "${to}" yok.`);
    if (spawnedBy(target) !== caller.paneId) return err(403, `${target.name} senin actigin bir ajan degil; yalniz kendi actiklarini kapatabilirsin.`);
    for (const t of tasks.values()) {
      if (t.targetPaneId === target.paneId && t.state !== "done" && t.state !== "failed") finish(t, "failed", { note: `${target.name} kapatildi.` });
    }
    const ok = await deps.closePane(caller.workspaceId, target.paneId, caller.paneId);
    if (!ok) return err(409, `${target.name} kapatilamadi.`);
    spawned.delete(target.paneId);
    deps.relay({ workspaceId: caller.workspaceId, paneId: caller.paneId, name: caller.name, detail: target.name, act: "close", toPaneId: target.paneId });
    deps.log("ekip.lider.kapat", { sonuc: "tamam" });
    return json(200, { ok: true, text: `${target.name} kapatildi.` });
  }

  return {
    tasks: () => [...tasks.values()],
    tick,
    async handle(caller, args) {
      const cmd = parseLeadArgs(args);
      if ("error" in cmd) return err(400, cmd.error);
      const members = deps.members(caller.workspaceId);
      const me = isLeader(caller, members);
      if (!me) return err(403, "Bu komutlar yalniz ekibin Lider rolundeki ajanina acik (lider acimi ajanlar ekip kuramaz).");
      if (cmd.cmd === "spawn") return spawn(caller, me, cmd);
      if (cmd.cmd === "status") return status(caller, members);
      if (cmd.cmd === "wait") return wait(caller, cmd.id, cmd.timeoutS);
      if (cmd.cmd === "close") return close(caller, members, cmd.to);
      const target = findMember(members, cmd.to);
      if (!target) return err(404, `Ekipte "${cmd.to}" yok. Uyeler: ${members.map((m) => m.name).join(", ")}`);
      if (target.paneId === caller.paneId) return err(400, "Kendine gorev veremezsin.");
      const task = queueTask(caller, target, cmd.text);
      deps.log("ekip.lider.gorev", { sonuc: "kuyruk" });
      return json(200, { ok: true, id: task.id, text: `Gorev ${task.id} → ${target.name} (ajan hazir olunca gider). Sonuc: ntt-team wait ${task.id}` });
    }
  };
}

