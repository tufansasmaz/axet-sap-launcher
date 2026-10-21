// Lider ajanın ekip kurması ve yönetmesi (Tur 7). Köprü (teamBridge.ts) POST
// /lead isteğini buraya verir; Electron'a dokunmuyor, her şey bağımlılık:
//   - bölme açma/kapama renderer'da (terminal deposunun addPane/closePane yolu),
//   - göreve yazım Akış mesaj kutusunun kapılarından (agentSender),
//   - durum ajan izleyiciden (Tur 6: kesin/tahmini, aşama, tur).
// Görevler bellekte; Tur 13'ten beri ekip başına diske de yazılıyor (deps.store,
// leadTaskStore.ts). Açılışta bitmemiş görev "uygulama yeniden başladı — durum
// bilinmiyor" diye düşüyor; lidere tek satır, Akış'ta kart (lider kaydolunca).
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
import { LEAD_ERROR_LABEL, leadErrorAdvice, type AgentErrorClass } from "../shared/agentErrors";
import type { GateResult } from "./agentGate";

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
  /** Tur 9: atanmış görev bu kadar süre aşama değiştirmezse lidere "takıldı" (0 kapalı). */
  stallMs?: number;
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
  /** Tur 9: eşzamanlılık / 429 kapısı; lider (bildirim) sınırdan muaf. Yoksa açık. */
  gate?(paneId: string, engine: AgentEngineId, lead: boolean): GateResult;
  /** Tur 13: kalıcı kayıt (ekip başına). Yoksa görevler yalnız bellekte. */
  store?: { load(): LeadTask[]; save(workspaceId: string, tasks: LeadTask[]): void };
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
  /** Tur 9: hedefin motoru (kapı için). */
  targetEngine?: AgentEngineId;
  /** Tur 9: düşen görevin hata sınıfı ve deneme sayısı. */
  errorClass?: AgentErrorClass;
  attempts?: number;
  maxAttempts?: number;
  /** Tur 9: otomatik deneme sürüyor. */
  retrying?: { cls: AgentErrorClass; attempt: number; max: number };
  /** Tur 9: takılma izi. */
  stallKey?: string;
  stallSince?: number;
  stallNotified?: boolean;
  /** Tur 9: kapıda bekledi ("sırada" kartı bir kez). */
  queuedNoted?: boolean;
  /** Tur 9: yeniden atama zinciri. */
  reassignOf?: string;
  reassigns?: number;
  reassignedTo?: string;
  /** Tur 13: uygulama yeniden başladığında bitmemişti; durumu bilinmiyor. */
  restarted?: boolean;
}

/** Tur 13: yeniden başlatmada düşen görevin notu (lider wait/status'ta görür). */
export const LEAD_RESTART_NOTE = "Uygulama yeniden basladi; gorevin durumu bilinmiyor (ajan bitirmis ya da yarida birakmis olabilir; cevap terminalinde olabilir). Gerekirse yeniden ata.";
/** Lider bu süre içinde kaydolmazsa yeniden başlatma bildirimi bırakılıyor (görev kayıtta kalır). */
export const RESTART_NOTICE_MS = 30 * 60_000;

/** Aynı görev en çok bu kadar yeniden atanır (döngü olmasın). */
export const LEAD_REASSIGN_MAX = 2;

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
  /** Tur 9: ajanın açık lider görevi varsa yeniden denemede gidecek görev satırı. */
  retryText(paneId: string): string | null;
  /** Tur 9: hata kesinleşti; lider görevi değilse (kullanıcının işi) lidere yalnız bilgi. */
  onAgentError(workspaceId: string | undefined, paneId: string, status: AgentStatus): void;
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

  // Tur 13: kalıcı kayıt. İlk kullanımda yükleniyor (userData hazır olsun diye).
  let restored = false;
  const restartNotices: Array<{ workspaceId: string; leaderPaneId: string; leaderName: string; ids: string[]; since: number }> = [];
  const savedSig = new Map<string, string>();

  function ensureRestored() {
    if (restored) return;
    restored = true;
    let loaded: LeadTask[] = [];
    try {
      loaded = deps.store?.load() ?? [];
    } catch {
      loaded = [];
    }
    const since = deps.now();
    for (const t of loaded) {
      if (tasks.has(t.id)) continue;
      if (t.state !== "done" && t.state !== "failed") {
        Object.assign(t, { state: "failed" as const, restarted: true, note: LEAD_RESTART_NOTE });
        let notice = restartNotices.find((n) => n.workspaceId === t.workspaceId && n.leaderPaneId === t.leaderPaneId);
        if (!notice) {
          notice = { workspaceId: t.workspaceId, leaderPaneId: t.leaderPaneId, leaderName: t.leaderName, ids: [], since };
          restartNotices.push(notice);
        }
        notice.ids.push(t.id);
      }
      tasks.set(t.id, t);
    }
    if (loaded.length) deps.log("ekip.lider.yukle", { gorev: loaded.length, kesilen: restartNotices.reduce((n, x) => n + x.ids.length, 0) });
  }

  /** Değişen ekiplerin görevlerini yazar (imza aynıysa yazmaz). */
  function persist() {
    if (!deps.store) return;
    const byWs = new Map<string, LeadTask[]>();
    for (const ws of savedSig.keys()) byWs.set(ws, []);
    for (const t of tasks.values()) byWs.set(t.workspaceId, [...(byWs.get(t.workspaceId) ?? []), t]);
    for (const [ws, list] of byWs) {
      const sig = JSON.stringify(list.map((t) => [t.id, t.state, t.result ?? "", t.note ?? "", t.reassignedTo ?? "", t.sentAt ?? 0, t.matched === true]));
      if (savedSig.get(ws) === sig) continue;
      savedSig.set(ws, sig);
      try {
        deps.store.save(ws, list);
      } catch {
        // yazılamadı: görevler bellekte sürüyor
      }
    }
  }

  function flushRestartNotices(now: number) {
    for (const n of [...restartNotices]) {
      if (!deps.status(n.leaderPaneId)) {
        if (now - n.since > RESTART_NOTICE_MS) restartNotices.splice(restartNotices.indexOf(n), 1);
        continue;
      }
      restartNotices.splice(restartNotices.indexOf(n), 1);
      const list = n.ids
        .map((id) => {
          const t = tasks.get(id);
          return t ? `${id} (${t.targetName})` : id;
        })
        .join(", ");
      deps.relay({ workspaceId: n.workspaceId, paneId: n.leaderPaneId, name: n.leaderName, detail: list, act: "restart" });
      notifyLeader(
        n.workspaceId,
        n.leaderPaneId,
        `restart:${n.leaderPaneId}:${n.ids.join(",")}`,
        `Uygulama yeniden basladi; su gorevlerin durumu bilinmiyor: ${list}. Gerekirse yeniden ata. Ayrinti: ntt-team status / ntt-team wait <G-xxxx>`
      );
    }
  }

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

  function finish(task: LeadTask, state: "done" | "failed", fields: Partial<LeadTask>, relay = true) {
    Object.assign(task, fields, { state });
    deps.log("ekip.lider.gorev", { sonuc: state, eslesti: task.matched === true });
    if (relay) relayResult(task);
  }

  // Tur 9: lidere kendiliğinden giden satırlar. Lider meşgulse kuyrukta bekler;
  // aynı olay (anahtar) için tek satır.
  const outbox: Array<{ workspaceId: string; leaderPaneId: string; text: string }> = [];
  const outboxKeys = new Set<string>();
  const outboxBusy = new Set<string>();

  function notifyLeader(workspaceId: string, leaderPaneId: string, key: string, text: string) {
    if (outboxKeys.has(key)) return;
    outboxKeys.add(key);
    if (outboxKeys.size > 500) outboxKeys.delete(outboxKeys.values().next().value as string);
    outbox.push({ workspaceId, leaderPaneId, text: `[NTT Studio] ${text}` });
  }

  function flushOutbox() {
    for (const item of [...outbox]) {
      if (outboxBusy.has(item.leaderPaneId)) continue;
      const status = deps.status(item.leaderPaneId);
      const leader = deps.members(item.workspaceId).find((m) => m.paneId === item.leaderPaneId);
      if (!leader || !status) {
        outbox.splice(outbox.indexOf(item), 1);
        continue;
      }
      if (status.state === "running" || status.state === "asking" || status.state === "finished" || status.detail === AXET_SETUP_DETAIL) continue;
      if ((deps.gate?.(item.leaderPaneId, leader.engine, true) ?? "ok") !== "ok") continue;
      outboxBusy.add(item.leaderPaneId);
      const done = (keep: boolean) => {
        outboxBusy.delete(item.leaderPaneId);
        if (!keep) {
          const i = outbox.indexOf(item);
          if (i >= 0) outbox.splice(i, 1);
        }
      };
      deps
        .send(item.workspaceId, item.leaderPaneId, item.text)
        .then((r) => {
          done(!r.ok && RETRYABLE.has(r.reason));
          deps.log("ekip.lider.bildirim", { sonuc: r.ok ? "tamam" : r.reason });
        })
        .catch(() => done(false));
    }
  }

  const tries = (a?: number, m?: number) => (a && m ? `, deneme ${a}/${m}${a >= m ? " tukendi" : ""}` : "");

  function failWithError(task: LeadTask, status: AgentStatus) {
    const cls = status.error?.cls ?? "unknown";
    const label = LEAD_ERROR_LABEL[cls];
    finish(task, "failed", { note: `${task.targetName} hata verdi: ${label}${tries(status.attempts, status.maxAttempts)}.`, errorClass: cls, attempts: status.attempts, maxAttempts: status.maxAttempts, retrying: undefined }, false);
    deps.relay({
      workspaceId: task.workspaceId,
      paneId: task.targetPaneId,
      name: `${task.targetName} → ${task.leaderName}`,
      detail: `[${task.id}] ${label}${tries(status.attempts, status.maxAttempts)}`,
      act: "error",
      toPaneId: task.leaderPaneId
    });
    notifyLeader(task.workspaceId, task.leaderPaneId, `error:${task.id}`, `${task.id} ${task.targetName}: ${label}${tries(status.attempts, status.maxAttempts)}. ${leadErrorAdvice(cls)} Ayrinti: ntt-team wait ${task.id}`);
  }

  function watchStall(task: LeadTask, status: AgentStatus, now: number) {
    // Yalnız kesin kaynak: tahmini "çalışıyor" çıktı hareketi, aşaması yok.
    if (status.source !== "exact") return;
    const key = `${status.state}|${status.phase?.kind ?? ""}|${status.phase?.tool ?? ""}|${status.phase?.target ?? ""}`;
    if (task.stallKey !== key) {
      task.stallKey = key;
      task.stallSince = now;
      return;
    }
    const stallMs = deps.settings().stallMs ?? 0;
    if (!(stallMs > 0) || task.stallNotified || now - (task.stallSince ?? now) < stallMs) return;
    task.stallNotified = true;
    const min = Math.round(stallMs / 60_000);
    deps.relay({ workspaceId: task.workspaceId, paneId: task.targetPaneId, name: `${task.targetName} → ${task.leaderName}`, detail: `[${task.id}] ${min} dk`, act: "stall", toPaneId: task.leaderPaneId });
    notifyLeader(task.workspaceId, task.leaderPaneId, `stall:${task.id}`, `${task.id} ${task.targetName}: ${min} dk ilerleme yok (takilmis olabilir). Oneri: ntt-team ask ${task.targetName} "Durum ne?" ile sor ya da gorevi bostaki baska ajana ver.`);
    deps.log("ekip.lider.takildi", { dk: min });
  }

  /** Bu liderin aynı metinli, düşmüş ve henüz yeniden atanmamış son görevi. */
  function failedTwin(leaderPaneId: string, text: string): LeadTask | null {
    let found: LeadTask | null = null;
    for (const t of tasks.values()) {
      if (t.leaderPaneId === leaderPaneId && t.state === "failed" && !t.reassignedTo && t.text.trim() === text.trim()) found = t;
    }
    return found;
  }

  const reassignLimit = () => err(429, `Bu gorev ${LEAD_REASSIGN_MAX} kez yeniden atandi; yeniden atama yok; kullaniciya bildir.`);

  function linkReassign(prev: LeadTask | null, task: LeadTask) {
    if (!prev) return;
    prev.reassignedTo = task.id;
    task.reassignOf = prev.id;
    task.reassigns = (prev.reassigns ?? 0) + 1;
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
      createdAt: deps.now(),
      targetEngine: target.engine
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
      task.retrying = undefined;
      watchStall(task, status, now);
      return;
    }
    if (status.state === "asking") {
      task.asking = status.question?.question ?? "";
      task.stallKey = undefined;
      return;
    }
    // Tur 9: hata. Otomatik deneme sürüyorsa görev düşmüyor; kesinleşince sınıf + deneme ile düşüyor.
    if (status.state === "error" || (status.state === "finished" && status.error)) {
      const fresh = task.sawRunning === true || (status.lastActivity !== null && status.lastActivity >= sentAt);
      if (fresh && status.retry && status.error) {
        task.retrying = { cls: status.error.cls, attempt: status.retry.attempt, max: status.retry.max };
        return;
      }
      if (fresh && (status.error || status.state === "error")) return failWithError(task, status);
    }
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
    ensureRestored();
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
          // Tur 9: aynı motorda aynı anda çalışan sınırı ve 429 beklemesi; görev sırada bekler.
          if ((deps.gate?.(task.targetPaneId, task.targetEngine ?? "axet-code", false) ?? "ok") !== "ok") {
            if (!task.queuedNoted) {
              task.queuedNoted = true;
              deps.relay({ workspaceId: task.workspaceId, paneId: task.leaderPaneId, name: `${task.leaderName} → ${task.targetName}`, detail: `[${task.id}] ${task.text}`, act: "queued", toPaneId: task.targetPaneId });
            }
            continue;
          }
          busyTargets.add(task.targetPaneId);
          void sendTask(task);
        }
      } catch {
        // tek görevin hatası öbürlerini durdurmasın
      }
    }
    try {
      flushRestartNotices(now);
      flushOutbox();
    } catch {
      // bildirim kuyruğu hatası tick'i düşürmesin
    }
    try {
      persist();
    } catch {
      // kayıt hatası tick'i düşürmesin
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
    // Tur 9: düşmüş görevi yeni ajana vermek yeniden atama sayılır (en çok LEAD_REASSIGN_MAX).
    const prevFailed = cmd.task ? failedTwin(caller.paneId, cmd.task) : null;
    if (prevFailed && (prevFailed.reassigns ?? 0) >= LEAD_REASSIGN_MAX) return reassignLimit();
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
      const instead = prevFailed ? ` · ${prevFailed.id} yerine` : "";
      deps.relay({ workspaceId: ws, paneId: caller.paneId, name: caller.name, detail: `${name} (${role.label})${instead}`, act: "spawn", toPaneId: paneId });
      deps.log("ekip.lider.ac", { sonuc: "tamam", motor: opened.engine });
      // Kayıt (terminal açıldı, izleyici tanıdı) beklenir; gelmezse görev yine kuyrukta.
      const until = deps.now() + SPAWN_REGISTER_MS;
      while (deps.now() < until && !deps.status(paneId)) await deps.sleep(500);
      const ready = deps.status(paneId);
      let taskLine = "";
      if (cmd.task) {
        const task = queueTask(caller, { paneId, name, role: role.label, engine: opened.engine, spawnedBy: caller.paneId }, cmd.task);
        linkReassign(prevFailed, task);
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
      if (task.state === "failed") {
        const extra = task.errorClass
          ? { errorClass: task.errorClass, ...(task.attempts ? { attempts: task.attempts, max: task.maxAttempts } : {}), advice: leadErrorAdvice(task.errorClass) }
          : {};
        return json(200, { ok: false, id, state: "failed", error: `${task.targetName} [${id}]: ${task.note ?? "basarisiz"}`, ...extra });
      }
      if (task.asking !== undefined) {
        return json(202, { ok: true, id, state: "asking", text: `${task.targetName} [${id}] soru soruyor: ${task.asking} -- kullanici ya da sen cevapla (ntt-team ask), sonra yeniden wait.` });
      }
      if (deps.now() >= until && task.retrying) {
        const r = task.retrying;
        return json(202, {
          ok: true,
          id,
          state: "retrying",
          errorClass: r.cls,
          attempt: r.attempt,
          max: r.max,
          text: `${task.targetName} [${id}] hata verdi (${LEAD_ERROR_LABEL[r.cls]}); uygulama otomatik yeniden deniyor (deneme ${r.attempt}/${r.max}). Bekle: ntt-team wait ${id}`
        });
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
      const failure = s?.error && (s.state === "error" || s.state === "finished")
        ? ` (${LEAD_ERROR_LABEL[s.error.cls]}${s.retry ? `, otomatik deneme ${s.retry.attempt}/${s.retry.max} bekliyor` : tries(s.attempts, s.maxAttempts)})`
        : "";
      const state = !s ? "kapali" : s.detail === AXET_SETUP_DETAIL ? "arac secimi" : `${s.state === "error" ? "hata" : s.state}${failure}`;
      const phase = s?.phase ? ` (${s.phase.kind}${s.phase.tool ? `: ${s.phase.tool}` : ""})` : "";
      const by = spawnedBy(m);
      const tag = m.paneId === caller.paneId ? " (sen)" : by === caller.paneId ? " [senin actigin]" : by ? " [lider acti]" : "";
      return `${m.name}${tag} | rol: ${m.role || "-"} | motor: ${m.engine} | durum: ${state}${phase}`;
    });
    const active = [...tasks.values()].filter((t) => t.leaderPaneId === caller.paneId && t.state !== "done" && t.state !== "failed");
    const mine = members.filter((m) => spawnedBy(m)).length;
    const cut = [...tasks.values()].filter((t) => t.leaderPaneId === caller.paneId && t.restarted && !t.reassignedTo).slice(-10);
    const out = [
      ...lines,
      active.length ? "Aktif gorevler:" : "Aktif gorev yok.",
      ...active.map((t) => `  ${t.id} → ${t.targetName}: ${t.state === "queued" || t.state === "sending" ? "kuyrukta" : t.asking !== undefined ? "soru soruyor" : "suruyor"} | ${t.text.slice(0, 80)}`),
      ...(cut.length ? ["Uygulama yeniden basladi; durumu bilinmeyen gorevler:", ...cut.map((t) => `  ${t.id} → ${t.targetName}: durum bilinmiyor | ${t.text.slice(0, 80)}`)] : []),
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
    tasks: () => {
      ensureRestored();
      return [...tasks.values()];
    },
    tick,
    retryText(paneId) {
      for (const t of tasks.values()) {
        if (t.targetPaneId === paneId && t.state === "sent") return leadTaskPrompt(t.leaderName, t.id, t.text);
      }
      return null;
    },
    onAgentError(workspaceId, paneId, status) {
      try {
        if (!workspaceId) return;
        // Lider görevi olan ajan: görev yolu (failWithError) söylüyor.
        for (const t of tasks.values()) if (t.targetPaneId === paneId && (t.state === "sent" || t.state === "sending")) return;
        const members = deps.members(workspaceId);
        const leader = members.find((m) => isLeadRole(m.role) && !spawnedBy(m));
        const agent = members.find((m) => m.paneId === paneId);
        if (!leader || !agent || leader.paneId === paneId) return;
        const cls = status.error?.cls ?? "unknown";
        notifyLeader(
          workspaceId,
          leader.paneId,
          `info:${paneId}:${cls}:${status.lastActivity ?? ""}`,
          `Bilgi: ${agent.name} (kullanicinin verdigi is) hata verdi: ${LEAD_ERROR_LABEL[cls]}${tries(status.attempts, status.maxAttempts)}. Yalniz bilgi; kullanicinin isine karisma, kullanici isterse yardim et.`
        );
      } catch {
        // bilgi satırı hatası izleyiciyi düşürmesin
      }
    },
    async handle(caller, args) {
      ensureRestored();
      try {
        return await handleCommand(caller, args);
      } finally {
        try {
          persist();
        } catch {
          // kayıt hatası cevabı düşürmesin
        }
      }
    }
  };

  async function handleCommand(caller: LeadCaller, args: unknown): Promise<LeadResponse> {
    {
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
      const prev = failedTwin(caller.paneId, cmd.text);
      if (prev && (prev.reassigns ?? 0) >= LEAD_REASSIGN_MAX) return reassignLimit();
      const task = queueTask(caller, target, cmd.text);
      linkReassign(prev, task);
      if (prev) {
        deps.relay({ workspaceId: caller.workspaceId, paneId: caller.paneId, name: `${caller.name} → ${target.name}`, detail: `[${task.id}] ${prev.id} yerine: ${cmd.text}`, act: "reassign", toPaneId: target.paneId });
        deps.log("ekip.lider.yenidenAtama", { sayi: task.reassigns ?? 1 });
      }
      deps.log("ekip.lider.gorev", { sonuc: "kuyruk" });
      return json(200, { ok: true, id: task.id, text: `Gorev ${task.id} → ${target.name} (ajan hazir olunca gider). Sonuc: ntt-team wait ${task.id}` });
    }
  }
}

