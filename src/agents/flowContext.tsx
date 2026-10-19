// Akış olaylarının deposu (spec 2026-10-18 ajanlar-yeniden §2). Kenar çubuğu
// (FlowSidebar) Sohbet sekmesinde sökülüyor; olaylar orada kaybolmasın diye
// toplama App düzeyinde. Kaynaklar: ajan durumu, pano, Değişiklikler yayını ve
// (Tur 4) ekip köprüsünün "A → B" mesajları.
// Tur 4: alan başına geçmiş ana süreçte kalıcı (flow:load/save/clear); alan ilk
// görüldüğünde yükleniyor, değişince 1 sn sonra yazılıyor. Yükleme bitmeden
// yazılmıyor (oturumun ilk olayları eski geçmişi ezmesin).
// Tur 4: açılış seçim penceresindeki axet-code'a giden mesaj kuyrukta bekliyor;
// pencere kapanınca KENDİLİĞİNDEN ve TEK KEZ gönderiliyor.
// AgentStatusProvider ve BoardProvider'ın İÇİNDE çizilmeli.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "../i18n";
import { AXET_SETUP_DETAIL, type AgentStatus } from "../../app-electron/shared/agentTypes";
import type { AgentSendFailure } from "../../app-electron/shared/agentMessage";
import type { Board } from "../../app-electron/shared/boardTypes";
import type { ChangesState } from "../../app-electron/shared/changesTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { useAgentStatuses } from "./agentStatusContext";
import { useBoards } from "../board/boardContext";
import { agentName } from "./agentLabels";
import { pickNotices, type AgentNotice } from "./agentNotices";
import {
  appendFlow,
  boardEvents,
  checkpointEvents,
  mergeHistory,
  statusEvents,
  toStored,
  type FlowEvent,
  type FlowInput
} from "./flowEvents";

/** Açılış seçimindeki ajana giden, bekleyen mesaj. */
export interface QueuedSend {
  workspaceId: string;
  paneId: string;
  name: string;
  body: string;
  state: "waiting" | "sending" | "failed";
  reason?: AgentSendFailure;
}

export interface FlowValue {
  events: FlowEvent[];
  record: (input: FlowInput) => void;
  /** Alanın geçmişini siler (bellek + disk). */
  clear: (workspaceId: string) => void;
  queued: QueuedSend[];
  queue: (item: Omit<QueuedSend, "state">) => void;
  cancelQueued: (paneId: string) => void;
  /** Başarısız kuyruk mesajını kullanıcı isteğiyle bir kez daha gönderir. */
  retryQueued: (paneId: string) => void;
  /** Tur 6: canlı olaylardan doğan, henüz gösterilmemiş ajan bildirimleri (AgentNotifier tüketir). */
  notices: AgentNotice[];
  dropNotices: (keys: readonly string[]) => void;
  /** Ajanlar düğmesindeki okunmamış rozet. */
  unread: number;
  addUnread: (count: number) => void;
  markRead: () => void;
}

/** Sağlayıcısız değer (testler de kendi değerlerini bunun üstüne kuruyor). */
export const EMPTY_FLOW: FlowValue = {
  events: [],
  record: () => {},
  clear: () => {},
  queued: [],
  queue: () => {},
  cancelQueued: () => {},
  retryQueued: () => {},
  notices: [],
  dropNotices: () => {},
  unread: 0,
  addUnread: () => {},
  markRead: () => {}
};

export const FlowContext = createContext<FlowValue>(EMPTY_FLOW);

export function useFlow(): FlowValue {
  return useContext(FlowContext);
}

const SAVE_DEBOUNCE_MS = 1_000;
/** Pencere kapandıktan sonra motorun sohbet ekranına oturması için kısa bekleme. */
export const QUEUE_SEND_DELAY_MS = 800;

export function FlowProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const { state } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const { boards } = useBoards();
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [queued, setQueued] = useState<QueuedSend[]>([]);
  const since = useRef(Date.now());
  const prevStatuses = useRef<Record<string, AgentStatus>>({});
  const prevBoards = useRef<Record<string, Board>>({});
  const prevChanges = useRef<Record<string, ChangesState>>({});
  // Bölme → (alan, ad); olay anındaki ad kaydediliyor.
  const panes = useMemo(() => {
    const map = new Map<string, { workspaceId: string; name: string }>();
    for (const w of state.workspaces) for (const p of w.panes) if (p.kind === "agent") map.set(p.id, { workspaceId: w.id, name: agentName(p, t) });
    return map;
  }, [state.workspaces, t]);
  const panesRef = useRef(panes);
  panesRef.current = panes;

  // Tur 6: bağ kurulamama sebebi ajan başına bir kez; canlı soru/bitti/hata bildirime.
  const notedLinks = useRef(new Set<string>());
  const seenNotices = useRef(new Set<string>());
  const [notices, setNotices] = useState<AgentNotice[]>([]);
  const [unread, setUnread] = useState(0);
  const add = useCallback((inputs: FlowInput[]) => {
    const kept = inputs.filter((e) => {
      if (e.kind !== "note") return true;
      const key = `${e.paneId}|${e.detail}`;
      if (notedLinks.current.has(key)) return false;
      notedLinks.current.add(key);
      return true;
    });
    if (kept.length === 0) return;
    setEvents((list) => appendFlow(list, kept));
    const fresh = pickNotices(kept, seenNotices.current);
    if (fresh.length) setNotices((list) => [...list, ...fresh].slice(-20));
  }, []);
  const dropNotices = useCallback((keys: readonly string[]) => setNotices((list) => list.filter((n) => !keys.includes(n.key))), []);
  const addUnread = useCallback((count: number) => setUnread((n) => n + count), []);
  const markRead = useCallback(() => setUnread(0), []);

  useEffect(() => {
    add(statusEvents(prevStatuses.current, statuses, panesRef.current, Date.now()));
    prevStatuses.current = statuses;
  }, [statuses, add]);

  useEffect(() => {
    const nameOf = (paneId: string | null) => (paneId ? panesRef.current.get(paneId)?.name ?? "" : "");
    const now = Date.now();
    add(Object.values(boards).flatMap((board) => boardEvents(prevBoards.current[board.workspaceId], board, nameOf, now)));
    prevBoards.current = boards;
  }, [boards, add]);

  useEffect(() => {
    const subscribe = typeof window !== "undefined" ? window.api?.onChangesChanged : undefined;
    if (!subscribe) return;
    return subscribe((next) => {
      add(checkpointEvents(prevChanges.current[next.workspaceId], next, Date.now(), since.current));
      prevChanges.current = { ...prevChanges.current, [next.workspaceId]: next };
    });
  }, [add]);

  // Ekip köprüsü: ajandan ajana mesaj/cevap.
  useEffect(() => {
    const subscribe = typeof window !== "undefined" ? window.api?.onTeamRelay : undefined;
    if (!subscribe) return;
    return subscribe((m) => {
      if (typeof m?.workspaceId !== "string") return;
      add([{ at: typeof m.at === "number" ? m.at : Date.now(), workspaceId: m.workspaceId, kind: "relay", paneId: m.paneId ?? null, name: String(m.name ?? ""), detail: String(m.detail ?? "") }]);
    });
  }, [add]);

  // Geçmiş: alan ilk görüldüğünde yükle.
  const loaded = useRef(new Set<string>());
  const [loadedSeq, setLoadedSeq] = useState(0);
  const workspaceIds = state.workspaces.map((w) => w.id).join("|");
  useEffect(() => {
    const api = typeof window !== "undefined" ? window.api : undefined;
    if (!api?.flowLoad) return;
    for (const id of workspaceIds ? workspaceIds.split("|") : []) {
      if (loaded.current.has(id)) continue;
      loaded.current.add(id);
      api.flowLoad(id).then(
        (stored) => {
          if (Array.isArray(stored) && stored.length) setEvents((list) => mergeHistory(list, id, stored));
          saveReady.current.add(id);
          setLoadedSeq((n) => n + 1);
        },
        () => {
          // Okunamadı: üzerine yazmamak için bu oturumda kaydetme de yok.
        }
      );
    }
  }, [workspaceIds]);

  // Geçmiş: değişince (yalnız yüklenmiş alanlar) 1 sn sonra yaz.
  const saveReady = useRef(new Set<string>());
  const lastSaved = useRef(new Map<string, string>());
  useEffect(() => {
    const api = typeof window !== "undefined" ? window.api : undefined;
    if (!api?.flowSave) return;
    const timer = setTimeout(() => {
      for (const id of saveReady.current) {
        const list = toStored(events, id);
        const sig = `${list.length}:${list[list.length - 1]?.at ?? 0}:${list[0]?.at ?? 0}`;
        if (lastSaved.current.get(id) === sig) continue;
        lastSaved.current.set(id, sig);
        void api.flowSave(id, list).catch(() => {});
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [events, loadedSeq]);

  const clear = useCallback((workspaceId: string) => {
    setEvents((list) => list.filter((e) => e.workspaceId !== workspaceId));
    lastSaved.current.set(workspaceId, "0:0:0");
    void window.api?.flowClear?.(workspaceId).catch(() => {});
  }, []);

  // Kuyruk (açılış seçimindeki ajan).
  const queue = useCallback((item: Omit<QueuedSend, "state">) => {
    setQueued((list) => [...list.filter((q) => q.paneId !== item.paneId), { ...item, state: "waiting" }]);
  }, []);
  const cancelQueued = useCallback((paneId: string) => setQueued((list) => list.filter((q) => q.paneId !== paneId)), []);

  const sendQueued = useCallback(
    async (item: QueuedSend) => {
      setQueued((list) => list.map((q) => (q.paneId === item.paneId ? { ...q, state: "sending" } : q)));
      let result;
      try {
        result = await window.api.agentSend(item.workspaceId, item.paneId, item.body);
      } catch {
        result = { ok: false as const, reason: "writeFailed" as const };
      }
      if (result.ok) {
        add([{ at: Date.now(), workspaceId: item.workspaceId, kind: "message", paneId: item.paneId, name: item.name, detail: item.body }]);
        setQueued((list) => list.filter((q) => q.paneId !== item.paneId));
      } else {
        const reason = result.reason;
        setQueued((list) => list.map((q) => (q.paneId === item.paneId ? { ...q, state: "failed", reason } : q)));
      }
    },
    [add]
  );
  const retryQueued = useCallback(
    (paneId: string) => {
      const item = queued.find((q) => q.paneId === paneId);
      if (item && item.state === "failed") void sendQueued(item);
    },
    [queued, sendQueued]
  );

  // Seçim penceresi kapanınca (durumdaki "setup" işareti kalktı) kendiliğinden, bir kez.
  useEffect(() => {
    const ready = queued.filter((q) => q.state === "waiting" && statuses[q.paneId] && statuses[q.paneId].detail !== AXET_SETUP_DETAIL);
    if (ready.length === 0) return;
    const timer = setTimeout(() => {
      for (const item of ready) void sendQueued(item);
    }, QUEUE_SEND_DELAY_MS);
    return () => clearTimeout(timer);
  }, [queued, statuses, sendQueued]);

  // Bölmesi kapanan kuyruk öğesi düşüyor.
  useEffect(() => {
    if (queued.some((q) => !panes.has(q.paneId))) setQueued((list) => list.filter((q) => panes.has(q.paneId)));
  }, [queued, panes]);

  const record = useCallback((input: FlowInput) => add([input]), [add]);
  const value = useMemo(
    () => ({ events, record, clear, queued, queue, cancelQueued, retryQueued, notices, dropNotices, unread, addUnread, markRead }),
    [events, record, clear, queued, queue, cancelQueued, retryQueued, notices, dropNotices, unread, addUnread, markRead]
  );
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}
