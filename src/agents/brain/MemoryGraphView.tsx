// Bellek haritası (Tur 5): kendi SVG kuvvet-yönelimli grafiğimiz (bağımlılık
// yok). Kenarlar tür başına TEK <path> (2000+ kenar tek DOM düğümü), düğümler
// <g role="button">. Yerleşim adım adım: her karede birkaç tur (yerleşme
// animasyonu, ana iş parçacığı kilitlenmez); hareketi azaltta tek seferde.
// Klavye: gezici tabindex — yalnız odaktaki düğüm Tab sırasında; ok tuşları
// o yöndeki en yakın görünür düğüme, Enter/Boşluk açar, Esc seçimi bırakır,
// + / − / 0 yakınlaştırma. Seçim vurgusu yalnız seçili düğümde (accent).
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { Crosshair, Minus, Plus } from "lucide-react";
import type { TranslateFn } from "../../i18n";
import { boundsOf, nearestInDirection, startLayout, type Point } from "../../../app-electron/shared/memoryLayout";
import type { GraphNode, MemoryGraph, NoteKind } from "../../../app-electron/shared/memoryNotes";
import { ICON_BUTTON } from "../../ui/buttons";
import { usePrefersReducedMotion } from "../../office/reducedMotion";

export const KIND_COLOR: Record<NoteKind, string> = {
  karar: "var(--status-warning-text)",
  olgu: "var(--status-info-text)",
  kisi: "var(--project-soft-text)",
  gorev: "var(--status-success-text)",
  ogrenim: "rgb(203 213 225)",
  not: "rgb(100 116 139)"
};

interface View {
  x: number;
  y: number;
  k: number;
}

const STEPS_PER_FRAME = 6;
const K_MIN = 0.15;
const K_MAX = 3;
const clampK = (k: number) => Math.min(K_MAX, Math.max(K_MIN, k));

/**
 * Yakınlaştırma düğüm katmanına kademeli gidiyor: etiket görünürlüğü ve yazı
 * boyu yalnız kademe değişince yeniden çizilir; kaydırma/yakınlaştırmada
 * düğümler (memo) yeniden çizilmez — yalnız <g transform>.
 */
export function zoomBucket(k: number): number {
  return k < 0.6 ? 0.5 : k < 0.9 ? 0.75 : k < 1.5 ? 1 : k < 2.2 ? 1.6 : 2.4;
}

function radius(node: GraphNode): number {
  if (node.type === "team") return 11;
  if (node.type === "agent") return 9;
  if (node.type === "tag") return 4;
  return 4 + Math.min(4, node.degree * 0.6);
}

export interface MemoryGraphViewProps {
  graph: MemoryGraph;
  /** Süzgeçten geçen düğümler; null = hepsi. Ötekiler soluk. */
  visible: ReadonlySet<string> | null;
  selectedId: string | null;
  onSelect(nodeId: string | null): void;
  colorOf(node: GraphNode): string;
  labelOf(node: GraphNode): string;
  ariaOf(node: GraphNode): string;
  t: TranslateFn;
}

export default function MemoryGraphView({ graph, visible, selectedId, onSelect, colorOf, labelOf, ariaOf, t }: MemoryGraphViewProps) {
  const reduced = usePrefersReducedMotion();
  const [positions, setPositions] = useState<Map<string, Point>>(() => new Map());
  const last = useRef<Map<string, Point>>(new Map());
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const touched = useRef(false);
  const fitted = useRef(false);
  const box = useRef<HTMLDivElement | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const nodeRefs = useRef(new Map<string, SVGGElement>());

  const fitTo = useCallback((points: Map<string, Point>) => {
    const el = box.current;
    const w = el?.clientWidth || 800;
    const h = el?.clientHeight || 600;
    const b = boundsOf(points.values());
    const k = clampK(Math.min(w / (b.maxX - b.minX + 120), h / (b.maxY - b.minY + 120)));
    setView({ k, x: w / 2 - ((b.minX + b.maxX) / 2) * k, y: h / 2 - ((b.minY + b.maxY) / 2) * k });
  }, []);

  // Graf değişince yerleşim: önceki konumlarla sıcak başlangıç (var olan düğümler yerinde).
  useEffect(() => {
    const run = startLayout(graph, last.current.size ? { initial: last.current } : {});
    const finish = () => {
      const p = run.positions();
      last.current = p;
      setPositions(p);
      if (!fitted.current && !touched.current) {
        fitted.current = true;
        fitTo(p);
      }
    };
    if (reduced || typeof requestAnimationFrame !== "function") {
      run.step(Number.MAX_SAFE_INTEGER);
      finish();
      return;
    }
    let frame = 0;
    let first = true;
    const tick = () => {
      const done = run.step(STEPS_PER_FRAME);
      const p = run.positions();
      last.current = p;
      setPositions(p);
      if (first && !fitted.current && !touched.current) fitTo(p);
      first = false;
      if (done) finish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [graph, reduced, fitTo]);

  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    touched.current = true;
    const el = box.current;
    const px = cx ?? (el?.clientWidth || 800) / 2;
    const py = cy ?? (el?.clientHeight || 600) / 2;
    setView((v) => {
      const k = clampK(v.k * factor);
      return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
    });
  };

  // Sürükle-kaydır (arka plan); düğüme tıklama sürüklemeyi başlatmaz.
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("[data-node]")) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    touched.current = true;
    setPan({ x: dx, y: dy });
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      onSelect(null);
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    setPan(null);
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    const rect = box.current?.getBoundingClientRect();
    zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, rect ? e.clientX - rect.left : undefined, rect ? e.clientY - rect.top : undefined);
  };

  const nodeIndex = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n] as const)), [graph]);
  const navigable = useMemo(() => graph.nodes.filter((n) => !visible || visible.has(n.id)), [graph, visible]);
  const activeFocus = focusId && nodeIndex.has(focusId) ? focusId : selectedId && nodeIndex.has(selectedId) ? selectedId : navigable[0]?.id ?? null;

  const moveFocus = (id: string | null) => {
    if (!id) return;
    setFocusId(id);
    nodeRefs.current.get(id)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : e.key === "ArrowUp" ? "up" : e.key === "ArrowDown" ? "down" : null;
    if (dir && activeFocus) {
      e.preventDefault();
      const from = positions.get(activeFocus) ?? { x: 0, y: 0 };
      const next = nearestInDirection(
        from,
        navigable.filter((n) => n.id !== activeFocus).map((n) => ({ id: n.id, p: positions.get(n.id) ?? { x: 0, y: 0 } })),
        dir
      );
      moveFocus(next);
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && activeFocus) {
      e.preventDefault();
      onSelect(activeFocus);
    } else if (e.key === "Escape") {
      onSelect(null);
    } else if (e.key === "+" || e.key === "=") zoomBy(1.2);
    else if (e.key === "-") zoomBy(1 / 1.2);
    else if (e.key === "0") {
      touched.current = false;
      fitTo(positions);
    }
  };

  const selectNode = useCallback(
    (id: string) => {
      setFocusId(id);
      onSelect(id);
    },
    [onSelect]
  );

  // Seçilinin komşuları: kenarlar vurgulanır, etiketleri görünür.
  const neighbors = useMemo(() => {
    const set = new Set<string>();
    if (!selectedId) return set;
    for (const e of graph.edges) {
      if (e.source === selectedId) set.add(e.target);
      else if (e.target === selectedId) set.add(e.source);
    }
    return set;
  }, [graph, selectedId]);

  return (
    <div
      ref={box}
      data-memory-graph=""
      role="group"
      aria-label={t("brain.mapLabel")}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onKeyDown={onKeyDown}
    >
      {/* Sürüklerken SVG yalnız CSS ile kayar (birleştirici; 539 düğümde ~100 ms → 1 kare, ölçüldü);
          bırakınca kayma <g> dönüşümüne işlenir. Yakınlaştırma <g> dönüşümünde (vektör, bulanıklaşmaz). */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={pan ? { transform: `translate(${pan.x}px, ${pan.y}px)`, willChange: "transform" } : undefined}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <Edges graph={graph} positions={positions} visible={visible} selectedId={selectedId} />
          <Nodes
            graph={graph}
            positions={positions}
            visible={visible}
            selectedId={selectedId}
            neighbors={neighbors}
            focusId={activeFocus}
            zoom={zoomBucket(view.k)}
            colorOf={colorOf}
            labelOf={labelOf}
            ariaOf={ariaOf}
            nodeRefs={nodeRefs.current}
            onSelect={selectNode}
            onFocusNode={setFocusId}
          />
        </g>
      </svg>
      <div className="absolute bottom-3 right-3 flex flex-col gap-1" role="group" aria-label={t("brain.fit")}>
        <button type="button" className={ICON_BUTTON} aria-label={t("brain.zoomIn")} title={t("brain.zoomIn")} onClick={() => zoomBy(1.25)}>
          <Plus size={14} />
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          aria-label={t("brain.fit")}
          title={t("brain.fit")}
          onClick={() => {
            touched.current = false;
            fitTo(positions);
          }}
        >
          <Crosshair size={14} />
        </button>
        <button type="button" className={ICON_BUTTON} aria-label={t("brain.zoomOut")} title={t("brain.zoomOut")} onClick={() => zoomBy(1 / 1.25)}>
          <Minus size={14} />
        </button>
      </div>
    </div>
  );
}

const Edges = memo(function Edges({
  graph,
  positions,
  visible,
  selectedId
}: {
  graph: MemoryGraph;
  positions: Map<string, Point>;
  visible: ReadonlySet<string> | null;
  selectedId: string | null;
}) {
  const paths = useMemo(() => {
    const out = { owner: "", link: "", tag: "", dim: "", hot: "" };
    const seg = (a: Point, b: Point) => `M${a.x} ${a.y}L${b.x} ${b.y}`;
    for (const e of graph.edges) {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (!a || !b) continue;
      const s = seg(a, b);
      if (selectedId && (e.source === selectedId || e.target === selectedId)) out.hot += s;
      else if (visible && (!visible.has(e.source) || !visible.has(e.target))) out.dim += s;
      else out[e.type] += s;
    }
    return out;
  }, [graph, positions, visible, selectedId]);
  return (
    <g fill="none" data-edges="">
      <path d={paths.dim} stroke="rgb(100 116 139)" strokeOpacity={0.06} strokeWidth={0.8} />
      <path d={paths.owner} stroke="rgb(100 116 139)" strokeOpacity={0.22} strokeWidth={0.8} />
      <path d={paths.tag} stroke="rgb(100 116 139)" strokeOpacity={0.18} strokeWidth={0.8} strokeDasharray="2 3" />
      <path d={paths.link} stroke="rgb(203 213 225)" strokeOpacity={0.45} strokeWidth={1.1} />
      <path d={paths.hot} stroke="rgb(var(--accent-400-rgb))" strokeOpacity={0.8} strokeWidth={1.4} />
    </g>
  );
});

const Nodes = memo(function Nodes({
  graph,
  positions,
  visible,
  selectedId,
  neighbors,
  focusId,
  zoom,
  colorOf,
  labelOf,
  ariaOf,
  nodeRefs,
  onSelect,
  onFocusNode
}: {
  graph: MemoryGraph;
  positions: Map<string, Point>;
  visible: ReadonlySet<string> | null;
  selectedId: string | null;
  neighbors: ReadonlySet<string>;
  focusId: string | null;
  zoom: number;
  colorOf(node: GraphNode): string;
  labelOf(node: GraphNode): string;
  ariaOf(node: GraphNode): string;
  nodeRefs: Map<string, SVGGElement>;
  onSelect(id: string): void;
  onFocusNode(id: string): void;
}) {
  return (
    <g data-nodes="">
      {graph.nodes.map((node) => {
        const p = positions.get(node.id) ?? { x: 0, y: 0 };
        const r = radius(node);
        const selected = node.id === selectedId;
        const dim = visible !== null && !visible.has(node.id);
        const showLabel =
          !dim &&
          (selected ||
            neighbors.has(node.id) ||
            node.type === "agent" ||
            node.type === "team" ||
            (node.type === "tag" && zoom > 0.9) ||
            (node.type === "note" && (zoom >= 1.5 || node.degree >= 4 || (visible !== null && zoom >= 0.6))));
        const color = colorOf(node);
        return (
          <g
            key={node.id}
            ref={(el) => {
              if (el) nodeRefs.set(node.id, el);
              else nodeRefs.delete(node.id);
            }}
            data-node={node.id}
            data-node-type={node.type}
            role="button"
            aria-label={ariaOf(node)}
            aria-pressed={selected}
            tabIndex={node.id === focusId ? 0 : -1}
            transform={`translate(${p.x} ${p.y})`}
            opacity={dim ? 0.12 : 1}
            className="cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-[rgb(var(--accent-400-rgb))] [&:focus-visible>circle.ring]:[stroke-opacity:1]"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
            onFocus={() => onFocusNode(node.id)}
          >
            <circle className="ring" r={r + 3.5} fill="none" stroke={selected ? "rgb(var(--accent-400-rgb))" : "transparent"} strokeWidth={1.6} strokeOpacity={selected ? 1 : 0} />
            {node.type === "tag" ? (
              <circle r={r} fill="none" stroke={color} strokeWidth={1.2} />
            ) : (
              <circle r={r} fill={color} stroke={node.type === "note" ? "none" : "rgba(15,23,42,0.6)"} strokeWidth={1} />
            )}
            {showLabel && (
              <text
                y={r + 11 / Math.max(0.6, zoom)}
                textAnchor="middle"
                fontSize={(node.type === "note" ? 10 : 11) / Math.max(0.6, zoom)}
                fill={selected ? "rgb(241 245 249)" : node.type === "note" ? "rgb(148 163 184)" : "rgb(203 213 225)"}
                fontWeight={node.type === "note" ? 400 : 600}
                className="pointer-events-none"
              >
                {labelOf(node)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
});
