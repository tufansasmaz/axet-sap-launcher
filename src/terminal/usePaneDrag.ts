// Bölmeyi başlığından sürükleyip başka bölmenin kenarına/ortasına bırakma
// (spec 2026-10-14 §3.4). Olaylar pencerede dinleniyor: imleç bölmeden
// çıksa da sürükleme sürüyor. Esc yalnız sürükleme sürerken yakalanıyor;
// öteki zamanlarda terminaldeki programındır.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { DropZone } from "../../app-electron/shared/terminalTree";
import { dropZone, type Box } from "./dropZone";

export const DRAG_THRESHOLD = 4;

export interface PaneDrag {
  paneId: string;
  active: boolean;
  target: string | null;
  zone: DropZone | null;
}

export function usePaneDrag(opts: {
  containerRef: RefObject<HTMLElement | null>;
  rectsRef: RefObject<Record<string, Box>>;
  canDrop: (paneId: string, targetId: string) => boolean;
  onDrop: (paneId: string, targetId: string, zone: DropZone) => void;
}): { drag: PaneDrag | null; start: (paneId: string, e: ReactPointerEvent) => void } {
  const [drag, setDrag] = useState<PaneDrag | null>(null);
  const dragRef = useRef<PaneDrag | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const update = (next: PaneDrag | null) => {
    dragRef.current = next;
    if (!next) origin.current = null;
    setDrag(next);
  };

  const start = useCallback((paneId: string, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    origin.current = { x: e.clientX, y: e.clientY };
    update({ paneId, active: false, target: null, zone: null });
  }, []);

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      const o = origin.current;
      if (!d || !o) return;
      if (!d.active && Math.hypot(e.clientX - o.x, e.clientY - o.y) < DRAG_THRESHOLD) return;
      const base = optsRef.current.containerRef.current?.getBoundingClientRect();
      let target: string | null = null;
      let zone: DropZone | null = null;
      if (base) {
        const x = e.clientX - base.left;
        const y = e.clientY - base.top;
        for (const [id, box] of Object.entries(optsRef.current.rectsRef.current ?? {})) {
          const z = dropZone(box, x, y);
          if (z) {
            target = id;
            zone = z;
            break;
          }
        }
      }
      // Kendi üstü hedef değil: bırakılırsa iptal.
      if (target === d.paneId) {
        target = null;
        zone = null;
      }
      if (d.active && d.target === target && d.zone === zone) return;
      update({ ...d, active: true, target, zone });
    };
    const up = () => {
      const d = dragRef.current;
      update(null);
      if (d?.active && d.target && d.zone && optsRef.current.canDrop(d.paneId, d.target)) {
        optsRef.current.onDrop(d.paneId, d.target, d.zone);
      }
    };
    const cancel = () => update(null);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      update(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key, true);
    };
  }, [dragging]);

  return { drag, start };
}
