// Kendi kendine öğrenme — görevlerin deposu ve izleyicisi. Bellek görünümü
// kapansa da görev sürsün diye App düzeyinde (FlowProvider'ın İÇİNDE).
// Gönderim Akış mesajlarıyla aynı yol (agents:send); ajan meşgulse görev
// "bekliyor"da kalır, ajan boşalınca kendiliğinden bir kez daha denenir.
// Bitiş ajan durumundan (learnTasks.stepLearnTask); not sayısı notes:list'ten.
// Görevler bu makinede localStorage'da (en çok 50); notların kendisi ana süreçte.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "../../i18n";
import type { AgentStatus } from "../../../app-electron/shared/agentTypes";
import type { MemoryNote } from "../../../app-electron/shared/memoryNotes";
import {
  countLearnNotes,
  createLearnTask,
  LEARN_RETRY_REASONS,
  LEARN_TASKS_MAX,
  LEARN_TIMEOUT_MS,
  learnPrompt,
  newLearnTaskId,
  sanitizeLearnTasks,
  stepLearnTask,
  type LearnEvent,
  type LearnTask,
  type LearnTaskInput
} from "../../../app-electron/shared/learnTasks";
import { useAgentStatuses } from "../agentStatusContext";
import { useFlow } from "../flowContext";

export const LEARN_STORAGE_KEY = "ntt.learnTasks";
/** Çalışan görevlerin süre sınırı bu aralıkla denetlenir (açılışta bir kez hemen). */
export const LEARN_TICK_MS = Math.min(60_000, LEARN_TIMEOUT_MS);
/** Biten görevin notları haritada bu kadar vurgulanır. */
export const LEARN_HIGHLIGHT_MS = 8_000;

export interface LearnHighlight {
  workspaceId: string;
  ids: ReadonlySet<string>;
}

export interface LearnValue {
  tasks: LearnTask[];
  start(input: LearnTaskInput): Promise<LearnTask | null>;
  /** Bekleyen görevi iptal eder (gönderilmemiş). */
  cancel(id: string): void;
  /** Zaman aşımı/hatalı görevi aynı kimlikle yeniden gönderir. */
  retry(id: string): Promise<void>;
  /** Bitmiş/hatalı görevi listeden kaldırır (notlar kalır). */
  dismiss(id: string): void;
  /** Görevin eklediği notları siler; silinen sayısı. */
  undo(id: string): Promise<number>;
  highlight: LearnHighlight | null;
}

export const EMPTY_LEARN: LearnValue = {
  tasks: [],
  start: async () => null,
  cancel: () => {},
  retry: async () => {},
  dismiss: () => {},
  undo: async () => 0,
  highlight: null
};

export const LearnContext = createContext<LearnValue>(EMPTY_LEARN);
export const useLearn = (): LearnValue => useContext(LearnContext);

type Api = Partial<Pick<Window["api"], "notesList" | "notesRemove" | "onNotesChanged" | "agentSend">>;
const api = (): Api => ((typeof window !== "undefined" ? (window as unknown as { api?: Api }).api : undefined) ?? {});

function loadTasks(): LearnTask[] {
  try {
    const raw = localStorage.getItem(LEARN_STORAGE_KEY);
    return raw ? sanitizeLearnTasks(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

async function listNotes(workspaceId: string): Promise<MemoryNote[]> {
  try {
    const list = await api().notesList?.(workspaceId);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

const finishedState = (t: LearnTask) => t.state === "done" || t.state === "error" || t.state === "timeout";

export function LearnProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const { statuses } = useAgentStatuses();
  const { record } = useFlow();
  const [tasks, setTasks] = useState<LearnTask[]>(loadTasks);
  const [highlight, setHighlight] = useState<LearnHighlight | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const sending = useRef(new Set<string>());
  const prevStatuses = useRef<Record<string, AgentStatus>>({});
  const highlightTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(LEARN_STORAGE_KEY, JSON.stringify(tasks.slice(0, LEARN_TASKS_MAX)));
    } catch {
      // dolu/kapalı depo: liste bu oturumda sürer
    }
  }, [tasks]);

  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

  const patch = useCallback((id: string, fn: (task: LearnTask) => LearnTask) => {
    setTasks((list) => list.map((task) => (task.id === id ? fn(task) : task)));
  }, []);

  const step = useCallback((id: string, event: LearnEvent) => patch(id, (task) => stepLearnTask(task, event)), [patch]);

  const recount = useCallback(
    async (id: string) => {
      const task = tasksRef.current.find((x) => x.id === id);
      if (!task) return null;
      const counts = countLearnNotes(task, await listNotes(task.workspaceId));
      patch(id, (cur) => ({ ...cur, added: counts.added, updated: counts.updated }));
      return counts;
    },
    [patch]
  );

  const send = useCallback(
    async (task: LearnTask) => {
      if (sending.current.has(task.id)) return;
      sending.current.add(task.id);
      try {
        const baseline: Record<string, number> = {};
        for (const n of await listNotes(task.workspaceId)) baseline[n.id] = n.updated;
        let result;
        try {
          result = (await api().agentSend?.(task.workspaceId, task.paneId, learnPrompt(task))) ?? { ok: false as const, reason: "writeFailed" as const };
        } catch {
          result = { ok: false as const, reason: "writeFailed" as const };
        }
        const at = Date.now();
        if (result.ok) {
          step(task.id, { type: "sent", at, baseline });
          record({ at, workspaceId: task.workspaceId, kind: "learn", paneId: task.paneId, name: task.agentName, detail: t("learn.flow.started", { topic: task.topic }) });
        } else {
          step(task.id, { type: "sendFailed", at, reason: result.reason });
          if (!LEARN_RETRY_REASONS.includes(result.reason)) {
            record({ at, workspaceId: task.workspaceId, kind: "learn", paneId: task.paneId, name: task.agentName, detail: t("learn.flow.failed", { topic: task.topic }) });
          }
        }
      } finally {
        sending.current.delete(task.id);
      }
    },
    [step, record, t]
  );

  // Biten görev: notları say, haritada vurgula, Akış'a kart.
  const settle = useCallback(
    async (task: LearnTask) => {
      const counts = (await recount(task.id)) ?? { added: [], updated: [] };
      const at = Date.now();
      if (task.state === "done") {
        const ids = new Set([...counts.added, ...counts.updated]);
        if (ids.size) {
          setHighlight({ workspaceId: task.workspaceId, ids });
          window.clearTimeout(highlightTimer.current);
          highlightTimer.current = window.setTimeout(() => setHighlight(null), LEARN_HIGHLIGHT_MS);
        }
        record({
          at,
          workspaceId: task.workspaceId,
          kind: "learn",
          paneId: task.paneId,
          name: task.agentName,
          detail: t("learn.flow.done", { topic: task.topic, added: counts.added.length, updated: counts.updated.length })
        });
      } else {
        record({ at, workspaceId: task.workspaceId, kind: "learn", paneId: task.paneId, name: task.agentName, detail: t("learn.flow.failed", { topic: task.topic }) });
      }
    },
    [recount, record, t]
  );

  // Ajan durumları: çalışan görevler ilerler; bekleyenler ajan boşalınca yeniden gönderilir.
  useEffect(() => {
    const prev = prevStatuses.current;
    prevStatuses.current = statuses;
    const at = Date.now();
    for (const task of tasksRef.current) {
      const status = statuses[task.paneId];
      if (!status || status === prev[task.paneId]) continue;
      if (task.state === "running") {
        const next = stepLearnTask(task, { type: "status", at, status });
        if (next === task) continue;
        tasksRef.current = tasksRef.current.map((x) => (x.id === task.id ? next : x));
        setTasks(tasksRef.current);
        if (finishedState(next)) void settle(next);
      } else if (task.state === "waiting" && status.state === "idle") {
        void send(task);
      }
    }
  }, [statuses, send, settle]);

  // Süre sınırı: takılan ya da uygulama kapalıyken yarım kalan görev "zaman aşımı".
  useEffect(() => {
    const tick = () => {
      const at = Date.now();
      for (const task of tasksRef.current) {
        if (task.state !== "running") continue;
        const next = stepLearnTask(task, { type: "tick", at });
        if (next === task) continue;
        tasksRef.current = tasksRef.current.map((x) => (x.id === task.id ? next : x));
        setTasks(tasksRef.current);
        void settle(next);
      }
    };
    tick();
    const timer = window.setInterval(tick, LEARN_TICK_MS);
    return () => window.clearInterval(timer);
  }, [settle]);

  // Ajan not yazdıkça çalışan görevin sayısı canlı.
  useEffect(() => {
    const subscribe = api().onNotesChanged;
    if (!subscribe) return;
    return subscribe((workspaceId) => {
      for (const task of tasksRef.current) if (task.state === "running" && task.workspaceId === workspaceId) void recount(task.id);
    });
  }, [recount]);

  const start = useCallback(
    async (input: LearnTaskInput) => {
      const task = createLearnTask(input, Date.now(), newLearnTaskId());
      if (!task) return null;
      tasksRef.current = [task, ...tasksRef.current].slice(0, LEARN_TASKS_MAX);
      setTasks(tasksRef.current);
      await send(task);
      return task;
    },
    [send]
  );

  const retry = useCallback(
    async (id: string) => {
      const task = tasksRef.current.find((x) => x.id === id);
      if (!task) return;
      const next = stepLearnTask(task, { type: "retry" });
      if (next === task) return;
      tasksRef.current = tasksRef.current.map((x) => (x.id === id ? next : x));
      setTasks(tasksRef.current);
      await send(next);
    },
    [send]
  );

  const cancel = useCallback((id: string) => setTasks((list) => list.filter((x) => !(x.id === id && x.state === "waiting"))), []);
  const dismiss = useCallback((id: string) => setTasks((list) => list.filter((x) => !(x.id === id && x.state !== "running"))), []);

  const undo = useCallback(
    async (id: string) => {
      const task = tasksRef.current.find((x) => x.id === id);
      if (!task || task.state === "running") return 0;
      let removed = 0;
      for (const noteId of task.added) {
        try {
          if (await api().notesRemove?.(task.workspaceId, noteId)) removed += 1;
        } catch {
          // silinemeyen not kalır; sayılmaz
        }
      }
      patch(id, (cur) => ({ ...cur, added: [], undone: true }));
      return removed;
    },
    [patch]
  );

  const value = useMemo<LearnValue>(() => ({ tasks, start, cancel, retry, dismiss, undo, highlight }), [tasks, start, cancel, retry, dismiss, undo, highlight]);
  return <LearnContext.Provider value={value}>{children}</LearnContext.Provider>;
}
