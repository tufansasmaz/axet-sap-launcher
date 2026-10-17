// Bölme ağacının yer tutucuları ve ayırıcıları (spec 2026-10-14 §3.3, §6.2).
// Terminaller burada DEĞİL: yer tutucuların ölçülen kutuları `onRects` ile
// yukarı veriliyor, bölmeler alan düzeyinde düz bir listede o kutulara
// oturuyor. Böylece ağaç değişince xterm yeniden kurulmuyor.
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import { dragSizes, type LayoutNode, type LayoutPath, type SplitDir } from "../../app-electron/shared/terminalTree";
import type { Box } from "./dropZone";

export const GAP = 6;
const KEY_STEP = 0.02;
// Bölme alt sınırı (spec §3.3): ~20 sütun × 5 satır, yazı boyutundan bağımsız.
const MIN_PX: Record<SplitDir, number> = { row: 160, column: 90 };

export interface LayoutViewProps {
  layout: LayoutNode | null;
  dividers: boolean;
  onRects: (rects: Record<string, Box>) => void;
  onResize: (path: LayoutPath, index: number, delta: number, min: number) => void;
  onEqualize: (path: LayoutPath) => void;
  labels: { row: string; column: string };
}

interface Preview {
  key: string;
  sizes: number[];
}

interface Ctx extends Omit<LayoutViewProps, "layout" | "onRects"> {
  preview: Preview | null;
  setPreview: (preview: Preview | null) => void;
}

export default function LayoutView({ layout, onRects, ...rest }: LayoutViewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const last = useRef("");
  const onRectsRef = useRef(onRects);
  onRectsRef.current = onRects;

  const measure = useRef(() => {
    const root = rootRef.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    const rects: Record<string, Box> = {};
    root.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
      const r = el.getBoundingClientRect();
      rects[el.dataset.slot as string] = { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
    });
    const key = JSON.stringify(rects);
    if (key === last.current) return;
    last.current = key;
    onRectsRef.current(rects);
  }).current;

  // Ağaç ya da önizleme değişince kutular da değişir: her çizimden sonra ölç.
  useLayoutEffect(() => measure());

  // Pencere/kenar çubuğu boyu değişince.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure]);

  const ctx: Ctx = { ...rest, preview, setPreview };
  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full min-w-0">
      {layout && <Node node={layout} path={[]} share={1} ctx={ctx} />}
    </div>
  );
}

function Node({ node, path, share, ctx }: { node: LayoutNode; path: LayoutPath; share: number; ctx: Ctx }) {
  const flex: CSSProperties = { flex: `${share} 1 0px`, minWidth: 0, minHeight: 0 };
  if (node.type === "pane") return <div data-slot={node.paneId} style={flex} />;
  const key = path.join(".");
  const sizes = ctx.preview?.key === key ? ctx.preview.sizes : node.sizes;
  return (
    <div data-split={node.dir} className={`flex ${node.dir === "row" ? "flex-row" : "flex-col"}`} style={flex}>
      {node.children.map((child, i) => (
        <Fragment key={i}>
          {i > 0 &&
            (ctx.dividers ? (
              <SplitDivider dir={node.dir} path={path} index={i - 1} sizes={sizes} ctx={ctx} />
            ) : (
              <div style={{ flex: `0 0 ${GAP}px` }} />
            ))}
          <Node node={child} path={[...path, i]} share={sizes[i]} ctx={ctx} />
        </Fragment>
      ))}
    </div>
  );
}

function SplitDivider({
  dir,
  path,
  index,
  sizes,
  ctx
}: {
  dir: SplitDir;
  path: LayoutPath;
  index: number;
  sizes: number[];
  ctx: Ctx;
}) {
  const drag = useRef<{ start: number; size: number; min: number; sizes: number[] } | null>(null);
  const key = path.join(".");
  const share = sizes.slice(0, index + 1).reduce((a, b) => a + b, 0);
  const coord = (e: PointerEvent) => (dir === "row" ? e.clientX : e.clientY);

  /** Kabın aralıklar düşülmüş boyu ve alt sınır payı. */
  const span = (el: HTMLElement) => {
    const parent = el.parentElement?.getBoundingClientRect();
    const total = parent ? (dir === "row" ? parent.width : parent.height) : 0;
    const size = total - GAP * (sizes.length - 1);
    return { size, min: size > 0 ? MIN_PX[dir] / size : 0 };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const { size, min } = span(e.currentTarget);
    if (size <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { start: coord(e), size, min, sizes };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    ctx.setPreview({ key, sizes: dragSizes(d.sizes, index, (coord(e) - d.start) / d.size, d.min) });
  };

  const finish = (e: PointerEvent<HTMLDivElement>, commit: boolean) => {
    const d = drag.current;
    drag.current = null;
    ctx.setPreview(null);
    if (commit && d) ctx.onResize(path, index, (coord(e) - d.start) / d.size, d.min);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const back = dir === "row" ? "ArrowLeft" : "ArrowUp";
    const fwd = dir === "row" ? "ArrowRight" : "ArrowDown";
    if (e.key !== back && e.key !== fwd) return;
    e.preventDefault();
    ctx.onResize(path, index, e.key === fwd ? KEY_STEP : -KEY_STEP, span(e.currentTarget).min);
  };

  // Görünür çizgi yok; üstüne gelince vurgu rengi (eski ızgaradaki gibi).
  return (
    <div
      role="separator"
      aria-orientation={dir === "row" ? "vertical" : "horizontal"}
      aria-label={dir === "row" ? ctx.labels.row : ctx.labels.column}
      aria-valuenow={Math.round(share * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, true)}
      onPointerCancel={(e) => finish(e, false)}
      onKeyDown={onKeyDown}
      onDoubleClick={() => ctx.onEqualize(path)}
      className={`z-10 rounded-full outline-none transition-colors hover:bg-accent-400/40 focus-visible:bg-accent-400/60 ${
        dir === "row" ? "cursor-col-resize" : "cursor-row-resize"
      }`}
      style={{ flex: `0 0 ${GAP}px` }}
    />
  );
}
