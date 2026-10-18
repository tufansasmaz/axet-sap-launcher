// Görev panosu yöneticisi (spec 2026-10-18 gorev-panosu §3–§7, §9). Ana
// süreçte tek örnek. Panoyu diskten okuyor, komutları uyguluyor, her saniye
// ve her ajan durum olayında saf geçişleri (boardLogic) ve dağıtıcıyı
// (boardDispatch) çalıştırıyor, değişince diske yazıp renderer'a yayıyor.
//
// Kurallar:
//   - Hiçbir yol hata fırlatmıyor; söz zincirleri .catch'li.
//   - Ajanın "bitti" demesi kartı kapatmıyor; yalnız kanıt (doğrulama ya da
//     kullanıcının elle onayı).
//   - Doğrulama komutu yalnız alan ayarından (deps.workspace); IPC'den değil.
//   - Günlüğe hedef, istem, plan, komut ya da çıktı yazılmıyor.
import type { AgentStatus } from "../shared/agentTypes";
import {
  agentEligible,
  boardPrompt,
  busyPanes,
  planDispatch,
  sendBackPrompt,
  type AgentInfo
} from "../shared/boardDispatch";
import { isBoardId, type BoardCommand, type BoardCommandResult, type BoardFailure } from "../shared/boardCommands";
import {
  advanceDependencies,
  applyAgentStatuses,
  applyProof,
  approveTask,
  assignSubtask,
  graphError,
  manualProof,
  mapSubtask,
  requeueSubtask,
  withDerivedState
} from "../shared/boardLogic";
import { buildLeadPrompt } from "../shared/boardPlan";
import {
  MAX_TASKS,
  TASK_GOAL_MAX,
  TASK_TITLE_MAX,
  type Board,
  type BoardTask,
  type LeadErrorCode,
  type Proof,
  type Subtask,
  type SubtaskNote,
  type SubtaskState
} from "../shared/boardTypes";
import type { AgentPresence, AgentPromptResult, LogFields } from "./agentMonitor";
import type { LeadOutcome, LeadRun } from "./boardLead";
import type { BoardNotificationKind } from "./boardNotification";
import type { BoardFileResult } from "./boardStore";
import type { VerifyRun } from "./boardVerify";

export interface BoardStorePort {
  read(workspaceId: string): BoardFileResult;
  write(workspaceId: string, tasks: readonly BoardTask[]): boolean;
  remove(workspaceId: string): void;
  list(): string[];
}

export interface BoardWorkspaceInfo {
  /** Alanın kökü, yoksa ajanların varsayılan klasörü. */
  cwd: string;
  /** Kullanıcının alan menüsünde yazdığı doğrulama komutları. */
  verify: string[];
}

export interface BoardManagerDeps {
  now(): number;
  newId(): string;
  store: BoardStorePort;
  agents(): AgentPresence[];
  sendPrompt(paneId: string, text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult;
  workspace(workspaceId: string): BoardWorkspaceInfo | null;
  startLead(cwd: string, prompt: string): LeadRun;
  startVerify(commands: readonly string[], cwd: string): VerifyRun;
  emit(board: Board): void;
  notify(kind: BoardNotificationKind, workspaceId: string, taskTitle: string): void;
  log(tag: string, fields: LogFields): void;
}

export interface BoardManager {
  get(workspaceId: string): Board | null;
  command(workspaceId: string, cmd: BoardCommand): BoardCommandResult;
  tick(): void;
  /** Kullanıcı alanı kapattı: o alanın panosu bellekten ve diskten silinir. */
  drop(workspaceId: string): void;
  dispose(): void;
}

interface Entry {
  tasks: BoardTask[];
  recoveredFrom?: string;
  unreadable?: boolean;
}

const LEAD_LOG: Record<LeadErrorCode | "ok", string> = {
  ok: "tamam",
  timeout: "sure",
  binary: "motor",
  failed: "hata",
  noJson: "gecersiz",
  badJson: "gecersiz",
  noSubtasks: "gecersiz",
  tooMany: "gecersiz",
  badField: "gecersiz",
  badDependency: "gecersiz",
  cycle: "gecersiz"
};

/** leadRaw ve leadDetail saklama sınırları (savunma derinliği). */
const LEAD_RAW_MAX = 8192;
const LEAD_DETAIL_MAX = 500;

/** Doğrula / Onayla basılabilen durumlar ("her zaman da basılabilir", spec §6). */
const CHECKABLE: ReadonlySet<SubtaskState> = new Set<SubtaskState>(["running", "asking", "verifying", "failed"]);

const fail = (reason: BoardFailure): BoardCommandResult => ({ ok: false, reason });

function promptFailure(result: AgentPromptResult): BoardFailure {
  if (result === "typing") return "typing";
  if (result === "notRunning" || result === "noAgent" || result === "asking" || result === "busy") return "notEligible";
  return "writeFailed";
}

function toInfo(p: AgentPresence): AgentInfo {
  return {
    paneId: p.reg.paneId,
    workspaceId: p.reg.workspaceId ?? "",
    role: p.reg.role ?? "",
    status: p.status,
    inputIdle: p.inputIdle,
    engineReady: p.engineReady
  };
}

export function createBoardManager(deps: BoardManagerDeps): BoardManager {
  const boards = new Map<string, Entry>();
  /** Görev kimliği → çalışan lider. */
  const planning = new Map<string, { workspaceId: string; cancel: () => void }>();
  /** Alt görev kimliği → çalışan doğrulama. */
  const verifying = new Map<string, { workspaceId: string; cancel: () => void }>();
  /** dispose() çağrıldıktan sonra tick ve command no-op olur. */
  let disposed = false;

  function attempt<T>(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  const log = (tag: string, fields: LogFields) => attempt(() => deps.log(tag, fields), undefined);

  /**
   * Ajan listesini döndürür. deps.agents() hata fırlatırsa null döner; null
   * gelince o turda reconcile atlanır — çalışan alt görevler yanlışlıkla
   * "ajan kapandı" sayılmaz.
   */
  function presenceList(): AgentPresence[] | null {
    try {
      return deps.agents();
    } catch {
      return null;
    }
  }

  function load(workspaceId: string): Entry | null {
    if (!isBoardId(workspaceId)) return null;
    // Kayıtlı alan kapısı: config'te olmayan id için bellek girişi açılmaz, diske yazılmaz.
    if (!deps.workspace(workspaceId)) return null;
    let entry = boards.get(workspaceId);
    if (!entry) {
      const file = attempt<BoardFileResult>(() => deps.store.read(workspaceId), { tasks: [], unreadable: true });
      // withDerivedState: depo "draft" sabit okuyabilir; yönetici yüklerken türetiyor.
      entry = { tasks: file.tasks.map(withDerivedState) };
      if (file.recoveredFrom) entry.recoveredFrom = file.recoveredFrom;
      if (file.unreadable) entry.unreadable = true;
      boards.set(workspaceId, entry);
    }
    return entry;
  }

  function snapshot(workspaceId: string, entry: Entry): Board {
    const withRuntime = (t: BoardTask): BoardTask => {
      const running = t.subtasks.some((s) => verifying.has(s.id));
      const subtasks = running ? t.subtasks.map((s) => (verifying.has(s.id) ? { ...s, verifyRunning: true } : s)) : t.subtasks;
      if (!running && !planning.has(t.id)) return t;
      return { ...t, subtasks, ...(planning.has(t.id) ? { planning: true } : {}) };
    };
    const board: Board = { workspaceId, tasks: entry.tasks.map(withRuntime) };
    if (entry.recoveredFrom) board.recoveredFrom = entry.recoveredFrom;
    if (entry.unreadable) board.unreadable = true;
    return board;
  }

  function notifyTransitions(workspaceId: string, prev: readonly BoardTask[], next: readonly BoardTask[]): void {
    const before = new Map(prev.map((t) => [t.id, t]));
    for (const task of next) {
      const old = before.get(task.id);
      if (!old) continue;
      if (old.state !== "done" && task.state === "done") attempt(() => deps.notify("taskDone", workspaceId, task.title), undefined);
      const oldStates = new Map(old.subtasks.map((s) => [s.id, s.state]));
      const newlyFailed = task.subtasks.some((s) => s.state === "failed" && oldStates.has(s.id) && oldStates.get(s.id) !== "failed");
      if (newlyFailed) attempt(() => deps.notify("subtaskFailed", workspaceId, task.title), undefined);
    }
  }

  /** Yeni listeyi yerleştirir: değiştiyse diske yazar, bildirim kararını verir, yayınlar. */
  function commit(workspaceId: string, entry: Entry, next: BoardTask[], force = false): void {
    const prev = entry.tasks;
    // Referans karşılaştırması: applyAgentStatuses/advanceDependencies değişmeyenlerde
    // aynı referansı koruduğu için çoğu turda stringify'dan kaçınılır.
    if (!force && prev.length === next.length && prev.every((t, i) => t === next[i])) return;
    entry.tasks = next;
    if (!entry.unreadable) attempt(() => deps.store.write(workspaceId, next), false);
    notifyTransitions(workspaceId, prev, next);
    attempt(() => deps.emit(snapshot(workspaceId, entry)), undefined);
  }

  const replaceTask = (tasks: readonly BoardTask[], next: BoardTask): BoardTask[] => tasks.map((t) => (t.id === next.id ? next : t));

  /** Ajana giden her istem tek yerden geçiyor: nötr, alt göreve özgü önekle (boardPrompt). */
  const sendToAgent = (
    paneId: string,
    subtaskId: string,
    body: string,
    onSettled: (outcome: "sent" | "aborted") => void
  ): AgentPromptResult => deps.sendPrompt(paneId, boardPrompt(subtaskId, body), onSettled);

  /**
   * Enter 150 ms sonra "aborted" gelebilir: alt görev hâlâ çalışıyor ve aynı
   * bölme + gönderim anına sahipse geri alınıyor (spec §5).
   */
  function onPromptAborted(workspaceId: string, taskId: string, subtaskId: string, paneId: string, dispatchedAt: number): void {
    attempt(() => {
      const entry = boards.get(workspaceId);
      const task = entry?.tasks.find((t) => t.id === taskId);
      if (!entry || !task) return;
      const sub = task.subtasks.find((s) => s.id === subtaskId);
      if (!sub || sub.state !== "running" || sub.paneId !== paneId || sub.dispatchedAt !== dispatchedAt) return;
      const next = mapSubtask(task, subtaskId, (s): Subtask => ({
        ...s,
        state: "ready",
        paneId: null,
        held: true,
        note: "promptAborted" as const,
        sawBusy: false
      }));
      if (next) commit(workspaceId, entry, replaceTask(entry.tasks, next));
    }, undefined);
  }

  /** Doğrulama hiç başlayamadı: kırmızı kanıt (spec §6 `error: "spawn"`); kart "Doğrulanıyor"da takılı kalmasın. */
  function spawnFailure(commands: readonly string[]): Proof {
    return {
      kind: "commands",
      ok: false,
      at: deps.now(),
      commands: [{ command: commands[0] ?? "", exitCode: null, durationMs: 0, tail: "", error: "spawn" }]
    };
  }

  function startVerification(workspaceId: string, taskId: string, subtaskId: string): void {
    if (verifying.has(subtaskId)) return;
    const info = attempt(() => deps.workspace(workspaceId), null);
    // Komut yoksa alt görev verifying'de "Onayla"yı bekliyor (spec §6).
    if (!info || info.verify.length === 0) return;
    let job: VerifyRun;
    try {
      job = deps.startVerify(info.verify, info.cwd);
    } catch {
      finishVerification(workspaceId, taskId, subtaskId, spawnFailure(info.verify));
      return;
    }
    verifying.set(subtaskId, { workspaceId, cancel: job.cancel });
    // "Doğrulanıyor" yalnız iş gerçekten çalışırken: anlık görüntüde verifyRunning.
    const entry = boards.get(workspaceId);
    if (entry) attempt(() => deps.emit(snapshot(workspaceId, entry)), undefined);
    job.done
      .then((proof) => {
        if (verifying.get(subtaskId)?.cancel !== job.cancel) return;
        verifying.delete(subtaskId);
        finishVerification(workspaceId, taskId, subtaskId, proof);
      })
      .catch(() => {
        if (verifying.get(subtaskId)?.cancel !== job.cancel) return;
        verifying.delete(subtaskId);
        attempt(() => finishVerification(workspaceId, taskId, subtaskId, spawnFailure(info.verify)), undefined);
      });
  }

  function finishVerification(workspaceId: string, taskId: string, subtaskId: string, proof: Proof): void {
    const entry = boards.get(workspaceId);
    const task = entry?.tasks.find((t) => t.id === taskId);
    if (!entry || !task) return;
    proof.commands.forEach((c, i) => log("pano.dogrulama", { komut: i, cikis: c.exitCode ?? "yok", sure: c.durationMs }));
    const next = mapSubtask(task, subtaskId, (s) => {
      const applied = applyProof(s, proof);
      return applied === s ? null : applied;
    });
    if (!next) return;
    commit(workspaceId, entry, replaceTask(entry.tasks, advanceDependencies(next)));
  }

  function reconcile(workspaceId: string, entry: Entry, presence: readonly AgentPresence[]): void {
    if (entry.unreadable) return;
    const statuses = new Map<string, AgentStatus | null>();
    for (const p of presence) statuses.set(p.reg.paneId, p.status);
    const toVerify: { taskId: string; subtaskId: string }[] = [];
    let tasks = entry.tasks.map((task) => {
      const applied = applyAgentStatuses(task, statuses);
      for (const subtaskId of applied.toVerify) toVerify.push({ taskId: task.id, subtaskId });
      return advanceDependencies(applied.task);
    });
    const infos = presence.filter((p) => p.reg.workspaceId === workspaceId).map(toInfo);
    for (const d of planDispatch(tasks, workspaceId, infos)) {
      const task = tasks.find((t) => t.id === d.taskId);
      const sub = task?.subtasks.find((s) => s.id === d.subtaskId);
      if (!task || !sub) continue;
      const now = deps.now();
      // Eşzamanlı "aborted" yarışı: onSettled sendPrompt dönmeden önce
      // çağrılabilir; o anda alt görev henüz running değil. Bayrağı kaydedip
      // atamadan hemen sonra uyguluyoruz.
      let abortedSync = false;
      const result = attempt(
        () =>
          sendToAgent(d.paneId, sub.id, sub.prompt, (outcome) => {
            if (outcome === "aborted") {
              if (tasks.find((t) => t.id === d.taskId)?.subtasks.find((s) => s.id === d.subtaskId)?.state === "running") {
                onPromptAborted(workspaceId, d.taskId, d.subtaskId, d.paneId, now);
              } else {
                abortedSync = true;
              }
            }
          }),
        "writeFailed" as AgentPromptResult
      );
      if (result !== "ok") continue;
      const next = mapSubtask(task, sub.id, (s) => assignSubtask(s, d.paneId, now));
      if (next) tasks = replaceTask(tasks, next);
      if (abortedSync) {
        // assignSubtask çalıştı; şimdi geri alıyoruz.
        const abortNext = mapSubtask(tasks.find((t) => t.id === d.taskId)!, d.subtaskId, (s): Subtask => ({
          ...s,
          state: "ready",
          paneId: null,
          held: true,
          note: "promptAborted" as const,
          sawBusy: false
        }));
        if (abortNext) tasks = replaceTask(tasks, abortNext);
      }
      log("pano.dagitim", { altGorev: sub.id, bolme: d.paneId, yol: "oto" });
    }
    commit(workspaceId, entry, tasks);
    // Çalışan işi olmayan verifying (komutlar sonradan eklendi): komut varsa
    // doğrulama başlıyor; yoksa kart "Onayla"yı bekliyor (startVerification no-op).
    for (const task of tasks) {
      for (const s of task.subtasks) {
        if (s.state === "verifying" && !verifying.has(s.id) && !toVerify.some((v) => v.subtaskId === s.id)) {
          toVerify.push({ taskId: task.id, subtaskId: s.id });
        }
      }
    }
    for (const v of toVerify) startVerification(workspaceId, v.taskId, v.subtaskId);
  }

  function reconcileNow(workspaceId: string, entry: Entry): void {
    const presence = presenceList();
    if (presence === null) return;
    attempt(() => reconcile(workspaceId, entry, presence), undefined);
  }

  function clearLead(task: BoardTask): BoardTask {
    const next: BoardTask = { ...task };
    delete next.leadError;
    delete next.leadDetail;
    delete next.leadRaw;
    delete next.leadChangedFiles;
    return withDerivedState(next);
  }

  function finishLead(workspaceId: string, taskId: string, outcome: LeadOutcome): void {
    planning.delete(taskId);
    log("pano.lider", {
      sure: outcome.durationMs,
      altGorev: outcome.ok ? outcome.subtasks.length : 0,
      sonuc: LEAD_LOG[outcome.ok ? "ok" : outcome.error]
    });
    const entry = boards.get(workspaceId);
    const task = entry?.tasks.find((t) => t.id === taskId);
    if (!entry) return;
    // Görev silinmiş ya da (planlanırken onaylanamaz ama) onaylanmışsa sonuç yazılmıyor.
    if (!task || task.approvedAt !== undefined) {
      attempt(() => deps.emit(snapshot(workspaceId, entry)), undefined);
      return;
    }
    let next: BoardTask;
    if (outcome.ok) {
      const ids = outcome.subtasks.map(() => deps.newId());
      next = {
        ...clearLead(task),
        subtasks: outcome.subtasks.map(
          (p, i): Subtask => ({
            id: ids[i],
            title: p.title,
            prompt: p.prompt,
            roleHint: p.roleHint,
            dependsOn: p.dependsOn.map((d) => ids[d]),
            state: "waiting",
            paneId: null,
            attempts: 0
          })
        )
      };
      if (outcome.changedFiles) next.leadChangedFiles = true;
    } else {
      next = { ...clearLead(task), leadError: outcome.error };
      if (outcome.detail) next.leadDetail = outcome.detail.slice(0, LEAD_DETAIL_MAX);
      if (outcome.raw) next.leadRaw = outcome.raw.slice(0, LEAD_RAW_MAX);
      if (outcome.changedFiles) next.leadChangedFiles = true;
    }
    commit(workspaceId, entry, replaceTask(entry.tasks, withDerivedState(next)), true);
  }

  function startLead(workspaceId: string, entry: Entry, task: BoardTask): BoardCommandResult {
    const info = attempt(() => deps.workspace(workspaceId), null);
    if (!info) return fail("noBoard");
    const presence = presenceList() ?? [];
    const roles = presence
      .filter((p) => p.reg.workspaceId === workspaceId)
      .map((p) => p.reg.role ?? "");
    const prompt = buildLeadPrompt({ title: task.title, goal: task.goal, roles });
    let job: LeadRun;
    try {
      job = deps.startLead(info.cwd, prompt);
    } catch {
      return fail("writeFailed");
    }
    planning.set(task.id, { workspaceId, cancel: job.cancel });
    commit(workspaceId, entry, replaceTask(entry.tasks, clearLead(task)), true);
    job.done
      .then((outcome) => {
        if (planning.get(task.id)?.cancel !== job.cancel) return;
        finishLead(workspaceId, task.id, outcome);
      })
      .catch(() => {
        if (planning.get(task.id)?.cancel === job.cancel) planning.delete(task.id);
      });
    return { ok: true, taskId: task.id };
  }

  /** İstemi yazar; başarırsa alt görev running (spec §5). */
  function deliver(
    workspaceId: string,
    entry: Entry,
    task: BoardTask,
    subtaskId: string,
    paneId: string,
    text: string,
    yol: "elle" | "geri",
    note?: SubtaskNote
  ): BoardCommandResult {
    const now = deps.now();
    const taskId = task.id;
    // Eşzamanlı "aborted" yarışı: onSettled sendPrompt dönmeden önce
    // çağrılabilir; o anda alt görev henüz running değil. Bayrağı kaydedip
    // atamadan hemen sonra uyguluyoruz.
    let abortedSync = false;
    const result = attempt(
      () =>
        sendToAgent(paneId, subtaskId, text, (outcome) => {
          if (outcome === "aborted") {
            const currentSub = entry.tasks.find((t) => t.id === taskId)?.subtasks.find((s) => s.id === subtaskId);
            if (currentSub?.state === "running") {
              onPromptAborted(workspaceId, taskId, subtaskId, paneId, now);
            } else {
              abortedSync = true;
            }
          }
        }),
      "writeFailed" as AgentPromptResult
    );
    if (result !== "ok") return fail(promptFailure(result));
    const next = mapSubtask(task, subtaskId, (s) => {
      const assigned = assignSubtask(s, paneId, now);
      if (note) assigned.note = note;
      return assigned;
    });
    if (next) {
      commit(workspaceId, entry, replaceTask(entry.tasks, next));
      if (abortedSync) {
        // Atama yapıldı; şimdi geri alıyoruz.
        const latestTask = entry.tasks.find((t) => t.id === taskId);
        if (latestTask) {
          const abortNext = mapSubtask(latestTask, subtaskId, (s): Subtask => ({
            ...s,
            state: "ready",
            paneId: null,
            held: true,
            note: "promptAborted" as const,
            sawBusy: false
          }));
          if (abortNext) commit(workspaceId, entry, replaceTask(entry.tasks, abortNext));
        }
      }
    }
    log("pano.dagitim", { altGorev: subtaskId, bolme: paneId, yol });
    return { ok: true, taskId: task.id };
  }

  /** Elle atama ve geri gönderme için ajan: bu alanda, kayıtlı, 2–5 (spec §5; 6 atlanıyor). */
  function manualAgent(workspaceId: string, entry: Entry, paneId: string): BoardFailure | null {
    const presence = presenceList();
    if (presence === null) return "notEligible";
    const agent = presence
      .map(toInfo)
      .find((a) => a.paneId === paneId);
    if (!agent || agent.workspaceId !== workspaceId) return "notEligible";
    if (agentEligible(agent, busyPanes(entry.tasks), "manual")) return null;
    return agent.inputIdle ? "notEligible" : "typing";
  }

  function run(workspaceId: string, entry: Entry, cmd: BoardCommand): BoardCommandResult {
    if (cmd.type === "createTask") {
      if (entry.tasks.length >= MAX_TASKS) return fail("limit");
      const title = cmd.title.trim().slice(0, TASK_TITLE_MAX);
      if (!title) return fail("invalid");
      const task: BoardTask = {
        id: deps.newId(),
        title,
        goal: cmd.goal.trim().slice(0, TASK_GOAL_MAX),
        state: "draft",
        createdAt: deps.now(),
        subtasks: []
      };
      commit(workspaceId, entry, [...entry.tasks, task]);
      return { ok: true, taskId: task.id };
    }
    if (cmd.type === "dismissWarning") {
      delete entry.recoveredFrom;
      attempt(() => deps.emit(snapshot(workspaceId, entry)), undefined);
      return { ok: true };
    }
    const task = entry.tasks.find((t) => t.id === cmd.taskId);
    if (!task) return fail("noTask");
    switch (cmd.type) {
      case "split":
        if (task.approvedAt !== undefined || planning.has(task.id)) return fail("badState");
        return startLead(workspaceId, entry, task);
      case "saveDraft": {
        if (task.approvedAt !== undefined || planning.has(task.id)) return fail("badState");
        const titleTrimmed = cmd.title.trim().slice(0, TASK_TITLE_MAX);
        if (!titleTrimmed) return fail("invalid");
        const graph = graphError(cmd.subtasks);
        if (graph) return fail(graph);
        const old = new Map(task.subtasks.map((s) => [s.id, s]));
        const subtasks = cmd.subtasks.map(
          (d): Subtask => ({
            ...(old.get(d.id) ?? { state: "waiting" as const, paneId: null, attempts: 0 }),
            id: d.id,
            title: d.title,
            prompt: d.prompt,
            roleHint: d.roleHint,
            dependsOn: [...new Set(d.dependsOn)]
          })
        );
        const next: BoardTask = { ...task, title: titleTrimmed, goal: cmd.goal.slice(0, TASK_GOAL_MAX), subtasks };
        delete next.leadError;
        delete next.leadDetail;
        delete next.leadRaw;
        commit(workspaceId, entry, replaceTask(entry.tasks, withDerivedState(next)));
        return { ok: true, taskId: task.id };
      }
      case "approve": {
        if (planning.has(task.id)) return fail("badState");
        const graph = graphError(task.subtasks);
        if (graph) return fail(graph);
        const next = approveTask(task, deps.now());
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, next));
        reconcileNow(workspaceId, entry);
        return { ok: true, taskId: task.id };
      }
      case "deleteTask": {
        const lead = planning.get(task.id);
        planning.delete(task.id);
        attempt(() => lead?.cancel(), undefined);
        for (const s of task.subtasks) {
          const v = verifying.get(s.id);
          verifying.delete(s.id);
          attempt(() => v?.cancel(), undefined);
        }
        commit(workspaceId, entry, entry.tasks.filter((t) => t.id !== task.id));
        return { ok: true, taskId: task.id };
      }
      default:
        break;
    }
    if (!("subtaskId" in cmd)) return fail("invalid");
    const sub = task.subtasks.find((s) => s.id === cmd.subtaskId);
    if (!sub) return fail("noSubtask");
    switch (cmd.type) {
      case "assign": {
        // held alt görev önce "Yeniden sıraya al" ile serbest bırakılmalı.
        if (sub.state !== "ready" || sub.held) return fail("badState");
        const refusal = manualAgent(workspaceId, entry, cmd.paneId);
        if (refusal) return fail(refusal);
        return deliver(workspaceId, entry, task, sub.id, cmd.paneId, sub.prompt, "elle");
      }
      case "sendBack": {
        if (sub.state !== "failed" || !sub.paneId || !sub.proof) return fail("badState");
        const text = sendBackPrompt(sub.proof);
        if (!text) return fail("badState");
        const refusal = manualAgent(workspaceId, entry, sub.paneId);
        if (refusal) return fail(refusal);
        return deliver(workspaceId, entry, task, sub.id, sub.paneId, text, "geri", "sentBack");
      }
      case "verify": {
        if (!CHECKABLE.has(sub.state) || verifying.has(sub.id)) return fail("badState");
        const info = attempt(() => deps.workspace(workspaceId), null);
        if (!info) return fail("noBoard");
        if (info.verify.length === 0) return fail("noVerify");
        const next = mapSubtask(task, sub.id, (s) => ({ ...s, state: "verifying" as const }));
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, next));
        startVerification(workspaceId, task.id, sub.id);
        return { ok: true, taskId: task.id };
      }
      case "approveManual": {
        if (!CHECKABLE.has(sub.state) || verifying.has(sub.id)) return fail("badState");
        const info = attempt(() => deps.workspace(workspaceId), null);
        if (info && info.verify.length > 0) return fail("hasVerify");
        const now = deps.now();
        const next = mapSubtask(task, sub.id, (s) => {
          const done: Subtask = { ...s, state: "done", proof: manualProof(now) };
          delete done.note;
          return done;
        });
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, advanceDependencies(next)));
        return { ok: true, taskId: task.id };
      }
      case "requeue": {
        const next = mapSubtask(task, sub.id, requeueSubtask);
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, next));
        reconcileNow(workspaceId, entry);
        return { ok: true, taskId: task.id };
      }
    }
    return fail("invalid");
  }

  return {
    get(workspaceId) {
      const entry = attempt(() => load(workspaceId), null);
      return entry ? snapshot(workspaceId, entry) : null;
    },
    command(workspaceId, cmd) {
      if (disposed) return fail("writeFailed");
      try {
        const entry = load(workspaceId);
        if (!entry) return fail("noBoard");
        if (entry.unreadable) return fail("writeFailed");
        return run(workspaceId, entry, cmd);
      } catch {
        return fail("writeFailed");
      }
    },
    tick() {
      if (disposed) return;
      const presence = presenceList();
      if (presence === null) return;
      for (const [workspaceId, entry] of boards) attempt(() => reconcile(workspaceId, entry, presence), undefined);
    },
    drop(workspaceId) {
      // Yalnız kullanıcının onaylı "alan kapat" eyleminden (spec §7). Toplu
      // budama yok: "Boş başla" ya da okunamayan config hiçbir panoyu silmez.
      if (!isBoardId(workspaceId)) return;
      const entry = boards.get(workspaceId);
      for (const task of entry?.tasks ?? []) {
        attempt(() => planning.get(task.id)?.cancel(), undefined);
        planning.delete(task.id);
        for (const s of task.subtasks) {
          attempt(() => verifying.get(s.id)?.cancel(), undefined);
          verifying.delete(s.id);
        }
      }
      boards.delete(workspaceId);
      attempt(() => deps.store.remove(workspaceId), undefined);
    },
    dispose() {
      disposed = true;
      for (const p of planning.values()) attempt(() => p.cancel(), undefined);
      for (const v of verifying.values()) attempt(() => v.cancel(), undefined);
      planning.clear();
      verifying.clear();
    }
  };
}
