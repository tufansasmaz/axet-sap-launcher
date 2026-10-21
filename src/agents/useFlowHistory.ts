// Pano/Raporlar (2026-10-21): bellekteki Akış listesi alan başına 500 olayla
// sınırlı (performans); daha eski olaylar kalıcı kayıttan (flow:range) okunup
// withHistory ile başa ekleniyor. Bellekteki en eski olay değişince (liste
// kaydı) yeniden okunuyor; köprü yoksa (test, önizleme) yalnız bellek.
import { useEffect, useMemo, useState } from "react";
import type { FlowRange, StoredFlowEvent } from "../../app-electron/shared/flowHistory";
import { useFlow } from "./flowContext";
import { withHistory, type FlowEvent } from "./flowEvents";

export interface FlowHistoryView {
  events: FlowEvent[];
  /** Kayıttaki toplam olay (köprü yoksa bellektekiler). */
  total: number;
  /** Kayıttaki en eski olay. */
  oldest: number | undefined;
  /** Kayıt olay/boyut tavanına dayandı. */
  full: boolean;
}

const NONE: StoredFlowEvent[] = [];

export function useFlowHistory(workspaceId: string, from: number): FlowHistoryView {
  const { events: all } = useFlow();
  const live = useMemo(() => all.filter((e) => e.workspaceId === workspaceId), [all, workspaceId]);
  const liveOldest = live[0]?.at ?? 0;
  const [range, setRange] = useState<FlowRange | null>(null);
  useEffect(() => {
    const read = typeof window !== "undefined" ? window.api?.flowRange : undefined;
    if (!read) return;
    let alive = true;
    read(workspaceId, from).then(
      (r) => {
        if (alive && r && Array.isArray(r.events)) setRange(r);
      },
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [workspaceId, from, liveOldest]);
  const stored: StoredFlowEvent[] = range?.events ?? NONE;
  const events = useMemo(() => withHistory(live, workspaceId, stored, from), [live, workspaceId, stored, from]);
  const oldest = Math.min(range?.oldest ?? Infinity, live[0]?.at ?? Infinity);
  return {
    events,
    total: Math.max(range?.total ?? 0, live.length),
    oldest: Number.isFinite(oldest) ? oldest : undefined,
    full: range?.full ?? false
  };
}
