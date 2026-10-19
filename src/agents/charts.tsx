// Pano grafik bileşenleri (2026-10-19): bağımlılıksız SVG. dataviz kuralları:
// ince işaretler, 2 px çizgi, 4 px yuvarlak veri ucu tabana oturuyor, yığında
// 2 px yüzey boşluğu, sessiz ızgara; tek eksen; renk kimlik taşıyor, metin
// mürekkep jetonlarında. Her grafik klavyeyle gezilebilir (←/→), üzerine
// gelince ipucu veriyor ve bir tablo karşılığı var (bkz. OverviewView).
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/** Kabın genişliği (ResizeObserver yoksa — jsdom — sabit varsayılan). */
export function useWidth(fallback = 560): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Küçük eğilim çizgisi: tek seri, 2 px, son nokta işaretli. Anlamı çağıran metinle veriyor. */
export function Sparkline({ values, width = 72, height = 20 }: { values: readonly number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const pad = 2;
  const y = (v: number) => pad + (height - 2 * pad) * (1 - v / max);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lastX = (values.length - 1) * step;
  return (
    <svg aria-hidden="true" data-sparkline="" width={width} height={height} viewBox={`-2 0 ${width + 4} ${height}`} className="shrink-0 overflow-visible">
      <line x1={0} x2={width} y1={height - pad} y2={height - pad} stroke="var(--viz-grid)" strokeWidth={1} />
      <polyline points={points} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={y(values[values.length - 1])} r={2.5} fill="var(--viz-1)" />
    </svg>
  );
}

export interface Series {
  key: string;
  label: string;
  color: string;
}

export interface Column {
  label: string;
  /** Kısa eksen etiketi; boşsa çizilmez. */
  tick: string;
  values: Record<string, number>;
  total: number;
}

/** Ortak klavye gezinmesi: ←/→ ile etkin sütun, Home/End uçlar, Esc kapatır. */
function useActive(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (count === 0) return;
    const at = active ?? count - 1;
    let next: number | null = at;
    if (e.key === "ArrowRight") next = Math.min(count - 1, at + (active === null ? 0 : 1));
    else if (e.key === "ArrowLeft") next = Math.max(0, at - (active === null ? 0 : 1));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else if (e.key === "Escape") next = null;
    else return;
    e.preventDefault();
    setActive(next);
  };
  return { active, setActive, onKeyDown };
}

export function Legend({ series }: { series: readonly Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-slate-400">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function Tip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(0, x - 80), Math.max(0, width - 168));
  return (
    <div
      role="status"
      className="pointer-events-none absolute top-0 z-10 w-[168px] rounded-md border border-line bg-raised px-2 py-1.5 text-2xs text-slate-300 shadow-[var(--elev-1)]"
      style={{ left }}
    >
      {children}
    </div>
  );
}

/** Yığılmış sütun: kova başına seri sayıları. */
export function StackedColumns({
  columns,
  series,
  label,
  totalLabel,
  height = 132
}: {
  columns: readonly Column[];
  series: readonly Series[];
  /** Grafiğin erişilebilir özeti. */
  label: string;
  totalLabel: string;
  height?: number;
}) {
  const [ref, width] = useWidth();
  const { active, setActive, onKeyDown } = useActive(columns.length);
  const axis = 18;
  const plotH = height - axis;
  const max = Math.max(1, ...columns.map((c) => c.total));
  const slot = width / Math.max(1, columns.length);
  const bar = Math.max(2, Math.min(28, slot * 0.62));
  const gridSteps = [0.5, 1];
  const col = active !== null ? columns[active] : null;
  return (
    <div ref={ref} className="relative">
      <svg
        role="img"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onMouseLeave={() => setActive(null)}
        width={width}
        height={height}
        className="block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        {gridSteps.map((g) => (
          <line key={g} x1={0} x2={width} y1={plotH - plotH * g + 0.5} y2={plotH - plotH * g + 0.5} stroke="var(--viz-grid)" strokeWidth={1} />
        ))}
        <text x={0} y={10} className="fill-slate-500 text-[10px] tabular-nums">
          {max}
        </text>
        {columns.map((c, i) => {
          const x = i * slot + (slot - bar) / 2;
          let y = plotH;
          const parts = series.filter((s) => (c.values[s.key] ?? 0) > 0);
          return (
            <g key={i} onMouseEnter={() => setActive(i)} data-column={i}>
              <rect x={i * slot} y={0} width={slot} height={plotH} fill={active === i ? "rgb(var(--surface-hover-rgb))" : "transparent"} />
              {parts.map((s, k) => {
                const h = Math.max(1, (plotH * (c.values[s.key] ?? 0)) / max);
                y -= h;
                const top = k === parts.length - 1;
                const gap = k > 0 ? 2 : 0;
                const rectH = Math.max(1, h - gap);
                return top && rectH > 4 ? (
                  <path
                    key={s.key}
                    d={`M${x},${y + rectH} V${y + 4} Q${x},${y} ${x + 4},${y} H${x + bar - 4} Q${x + bar},${y} ${x + bar},${y + 4} V${y + rectH} Z`}
                    fill={s.color}
                  />
                ) : (
                  <rect key={s.key} x={x} y={y} width={bar} height={rectH} fill={s.color} />
                );
              })}
              {c.tick && (
                <text x={i * slot + slot / 2} y={height - 4} textAnchor="middle" className="fill-slate-500 text-[10px] tabular-nums">
                  {c.tick}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} x2={width} y1={plotH + 0.5} y2={plotH + 0.5} stroke="var(--viz-axis)" strokeWidth={1} />
      </svg>
      {col && active !== null && (
        <Tip x={active * slot + slot / 2} width={width}>
          <div className="mb-1 font-medium text-slate-100">{col.label}</div>
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              <span className="flex-1">{s.label}</span>
              <span className="tabular-nums text-slate-100">{col.values[s.key] ?? 0}</span>
            </div>
          ))}
          <div className="mt-1 flex border-t border-line pt-1">
            <span className="flex-1">{totalLabel}</span>
            <span className="tabular-nums text-slate-100">{col.total}</span>
          </div>
        </Tip>
      )}
    </div>
  );
}

export interface LaneRow {
  key: string;
  name: string;
  segments: { state: string; start: number; end: number; label: string }[];
}

/** Ajan başına durum şeridi (gantt benzeri). Boşta ince çizgi; diğer durumlar dolu. */
export function LaneChart({
  lanes,
  from,
  to,
  colors,
  label,
  onOpen,
  openLabel,
  ticks
}: {
  lanes: readonly LaneRow[];
  from: number;
  to: number;
  colors: Record<string, string>;
  label: string;
  onOpen?: (key: string) => void;
  openLabel: (name: string) => string;
  ticks: readonly { at: number; text: string }[];
}) {
  const [ref, width] = useWidth();
  const nameW = 104;
  const plotW = Math.max(40, width - nameW);
  const span = Math.max(1, to - from);
  const x = (at: number) => ((at - from) / span) * plotW;
  const rowH = 20;
  const [hover, setHover] = useState<{ lane: number; seg: number } | null>(null);
  const tipId = useId();
  const seg = hover ? lanes[hover.lane]?.segments[hover.seg] : undefined;
  return (
    <div ref={ref} className="relative" role="group" aria-label={label}>
      <ul className="flex flex-col gap-1">
        {lanes.map((lane, li) => (
          <li key={lane.key} className="flex items-center" data-lane={lane.key}>
            {onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(lane.key)}
                aria-label={openLabel(lane.name)}
                style={{ width: nameW }}
                className="shrink-0 truncate pr-2 text-left text-2xs text-slate-300 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              >
                {lane.name}
              </button>
            ) : (
              <span style={{ width: nameW }} className="shrink-0 truncate pr-2 text-2xs text-slate-300">
                {lane.name}
              </span>
            )}
            <svg width={plotW} height={rowH} aria-hidden="true" onMouseLeave={() => setHover(null)}>
              <line x1={0} x2={plotW} y1={rowH / 2} y2={rowH / 2} stroke="var(--viz-grid)" strokeWidth={1} />
              {lane.segments.map((s, si) => {
                const sx = x(s.start);
                const w = Math.max(2, x(s.end) - sx);
                const on = hover?.lane === li && hover.seg === si;
                return s.state === "idle" ? (
                  <rect key={si} x={sx} y={rowH / 2 - 1} width={w} height={2} fill="var(--viz-axis)" onMouseEnter={() => setHover({ lane: li, seg: si })} />
                ) : (
                  <rect
                    key={si}
                    x={sx}
                    y={4}
                    width={w}
                    height={rowH - 8}
                    rx={Math.min(4, w / 2)}
                    fill={colors[s.state]}
                    stroke={on ? "rgb(var(--ink-strong-rgb))" : "rgb(var(--surface-card-rgb))"}
                    strokeWidth={on ? 1.5 : 1}
                    onMouseEnter={() => setHover({ lane: li, seg: si })}
                  />
                );
              })}
            </svg>
          </li>
        ))}
      </ul>
      <div className="relative mt-1 h-3" style={{ marginLeft: nameW, width: plotW }} aria-hidden="true">
        {ticks.map((tk) => (
          <span key={tk.at} className="absolute -translate-x-1/2 text-[10px] tabular-nums text-slate-500" style={{ left: x(tk.at) }}>
            {tk.text}
          </span>
        ))}
      </div>
      {seg && hover && (
        <div id={tipId} className="pointer-events-none absolute z-10" style={{ top: hover.lane * (rowH + 4) + rowH + 2, left: 0, width }}>
          <Tip x={nameW + x((seg.start + seg.end) / 2)} width={width}>
            {seg.label}
          </Tip>
        </div>
      )}
    </div>
  );
}

/** Yatay sayı çubukları (huni / dağılım). */
export function BarList({
  rows,
  label
}: {
  rows: readonly { key: string; label: string; count: number; color: string }[];
  label: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul aria-label={label} className="flex flex-col gap-1">
      {rows.map((r) => (
        <li key={r.key} data-bar={r.key} className="grid grid-cols-[minmax(0,7.5rem)_1fr_2rem] items-center gap-2 text-2xs">
          <span className="truncate text-slate-400">{r.label}</span>
          <span className="h-2 rounded-full bg-[rgb(var(--surface-hover-rgb))]">
            {r.count > 0 && <span className="block h-2 rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: r.color }} />}
          </span>
          <span className="text-right tabular-nums text-slate-200">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}
