// Bellek haritasının kuvvet-yönelimli yerleşimi (Tur 5). Saf ve KARARLI:
// Math.random yok, başlangıç konumları düğüm kimliğinin özetinden; aynı graf
// her açılışta aynı resmi verir. İtme ızgara kovalarıyla (yakın komşular),
// yani ~O(n). Adım adım ilerletilebiliyor (startLayout): arayüz her karede
// birkaç tur çizer, ana iş parçacığı kilitlenmez; sıcak başlangıçla yeni not
// eklenince var olan düğümler yerinde kalır.
import type { MemoryGraph } from "./memoryNotes";

export interface Point {
  x: number;
  y: number;
}

export interface LayoutOptions {
  iterations?: number;
  /** İdeal kenar uzunluğu. */
  spacing?: number;
  /** Önceki yerleşim (sıcak başlangıç): var olan düğümler yerinde başlar, yeniler komşusunun yanında. */
  initial?: ReadonlyMap<string, Point>;
}

/** FNV-1a 32 bit: kimlikten kararlı sayı. */
export function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface LayoutRun {
  /** `count` tur ilerletir; bittiyse true. */
  step(count: number): boolean;
  readonly done: boolean;
  positions(): Map<string, Point>;
}

export function startLayout(graph: MemoryGraph, options: LayoutOptions = {}): LayoutRun {
  const n = graph.nodes.length;
  const spacing = options.spacing ?? 46;
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  const dx = new Float64Array(n);
  const dy = new Float64Array(n);
  const index = new Map<string, number>();
  const spread = spacing * Math.sqrt(Math.max(1, n)) * 0.6;
  const known = new Uint8Array(n);
  graph.nodes.forEach((node, i) => {
    index.set(node.id, i);
    const prev = options.initial?.get(node.id);
    if (prev) {
      xs[i] = prev.x;
      ys[i] = prev.y;
      known[i] = 1;
      return;
    }
    const h = hashId(node.id);
    // Kimlikten açı ve yarıçap: tohum kararlı, düğümler üst üste düşmez.
    const angle = ((h & 0xffff) / 0xffff) * Math.PI * 2;
    const radius = spread * Math.sqrt(((h >>> 16) + 1) / 0x10000);
    xs[i] = Math.cos(angle) * radius;
    ys[i] = Math.sin(angle) * radius;
  });
  const edges: [number, number][] = [];
  for (const edge of graph.edges) {
    const a = index.get(edge.source);
    const b = index.get(edge.target);
    if (a !== undefined && b !== undefined && a !== b) edges.push([a, b]);
  }
  const degree = new Float64Array(n);
  for (const [a, b] of edges) {
    degree[a] += 1;
    degree[b] += 1;
  }
  // Sıcak başlangıçta yeni düğüm, bilinen ilk komşusunun yanına (kimlikten kararlı kayma).
  const warm = known.some((k) => k === 1);
  if (warm) {
    for (const [a, b] of edges) {
      for (const [x, y] of [
        [a, b],
        [b, a]
      ] as const) {
        if (known[x] || !known[y]) continue;
        const h = hashId(graph.nodes[x].id);
        xs[x] = xs[y] + ((h & 0xff) / 0xff - 0.5) * spacing;
        ys[x] = ys[y] + (((h >>> 8) & 0xff) / 0xff - 0.5) * spacing;
        known[x] = 2;
      }
    }
  }
  const iterations = options.iterations ?? (warm ? 60 : n > 400 ? 120 : 220);

  const cutoff = spacing * 2.5;
  const cutoff2 = cutoff * cutoff;
  const repulse = spacing * spacing;
  // Izgara: her turda sayım sıralamasıyla (typed array; Map'ten ~5 kat hızlı, ölçüldü).
  const cellOf = new Int32Array(n);
  const order = new Int32Array(n);
  let starts = new Int32Array(1);
  let temperature = warm ? spacing * 0.5 : spacing * 2;
  const cool = Math.pow(0.02, 1 / Math.max(1, iterations));
  let iter = 0;

  function tick(): void {
    dx.fill(0);
    dy.fill(0);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i += 1) {
      if (xs[i] < minX) minX = xs[i];
      if (xs[i] > maxX) maxX = xs[i];
      if (ys[i] < minY) minY = ys[i];
      if (ys[i] > maxY) maxY = ys[i];
    }
    // Hücre boyu en az cutoff; dağınık grafta ızgara 4n hücreyi aşmasın.
    const size = Math.max(cutoff, Math.sqrt(((maxX - minX + 1) * (maxY - minY + 1)) / Math.max(1, 4 * n)));
    const gw = Math.floor((maxX - minX) / size) + 1;
    const gh = Math.floor((maxY - minY) / size) + 1;
    if (starts.length < gw * gh + 1) starts = new Int32Array(gw * gh + 1);
    else starts.fill(0, 0, gw * gh + 1);
    for (let i = 0; i < n; i += 1) {
      const c = Math.floor((xs[i] - minX) / size) + Math.floor((ys[i] - minY) / size) * gw;
      cellOf[i] = c;
      starts[c + 1] += 1;
    }
    for (let c = 0; c < gw * gh; c += 1) starts[c + 1] += starts[c];
    const fill = starts.slice(0, gw * gh);
    for (let i = 0; i < n; i += 1) order[fill[cellOf[i]]++] = i;
    // İtme: yalnız komşu hücrelerdeki düğümler.
    for (let i = 0; i < n; i += 1) {
      const cx = cellOf[i] % gw;
      const cy = (cellOf[i] - cx) / gw;
      for (let gy = Math.max(0, cy - 1); gy <= Math.min(gh - 1, cy + 1); gy += 1) {
        for (let gx = Math.max(0, cx - 1); gx <= Math.min(gw - 1, cx + 1); gx += 1) {
          const c = gx + gy * gw;
          for (let k = starts[c]; k < starts[c + 1]; k += 1) {
            const j = order[k];
            if (j <= i) continue;
            let ddx = xs[i] - xs[j];
            let ddy = ys[i] - ys[j];
            let d2 = ddx * ddx + ddy * ddy;
            if (d2 > cutoff2) continue;
            if (d2 < 0.01) {
              // Çakışan düğümler: sıraya göre kararlı it.
              ddx = (i - j) * 0.1;
              ddy = 0.1;
              d2 = ddx * ddx + ddy * ddy;
            }
            const f = repulse / d2;
            const fx = ddx * f;
            const fy = ddy * f;
            dx[i] += fx;
            dy[i] += fy;
            dx[j] -= fx;
            dy[j] -= fy;
          }
        }
      }
    }
    // Yay: kenarlar ideal uzunluğa çeker.
    for (const [a, b] of edges) {
      const ddx = xs[a] - xs[b];
      const ddy = ys[a] - ys[b];
      const d = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
      // Göbek (çok bağlı ajan/etiket) kenarı uzar: yüzlerce not tek halkaya sıkışmasın (itme O(k²) olurdu).
      const ideal = spacing * Math.max(1, 0.6 * Math.sqrt(Math.max(degree[a], degree[b])));
      const f = (d - ideal) / d / 2;
      const wa = 1 / Math.max(1, Math.sqrt(degree[a]));
      const wb = 1 / Math.max(1, Math.sqrt(degree[b]));
      dx[a] -= ddx * f * wa;
      dy[a] -= ddy * f * wa;
      dx[b] += ddx * f * wb;
      dy[b] += ddy * f * wb;
    }
    // Merkeze hafif çekim (kopuk adalar uzaklaşmasın) + sıcaklık sınırı.
    for (let i = 0; i < n; i += 1) {
      dx[i] -= xs[i] * 0.01;
      dy[i] -= ys[i] * 0.01;
      const len = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]);
      if (len > temperature) {
        dx[i] = (dx[i] / len) * temperature;
        dy[i] = (dy[i] / len) * temperature;
      }
      xs[i] += dx[i];
      ys[i] += dy[i];
    }
    temperature *= cool;
  }

  return {
    step(count) {
      for (let k = 0; k < count && iter < iterations; k += 1, iter += 1) tick();
      return iter >= iterations;
    },
    get done() {
      return iter >= iterations || n === 0;
    },
    positions() {
      const result = new Map<string, Point>();
      graph.nodes.forEach((node, i) => result.set(node.id, { x: Math.round(xs[i] * 10) / 10, y: Math.round(ys[i] * 10) / 10 }));
      return result;
    }
  };
}

/** Tek seferde (hareketi azalt, testler). */
export function forceLayout(graph: MemoryGraph, options: LayoutOptions = {}): Map<string, Point> {
  const run = startLayout(graph, options);
  run.step(Number.MAX_SAFE_INTEGER);
  return run.positions();
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(points: Iterable<Point>): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
  return { minX, minY, maxX, maxY };
}

/** Odaktan bir yönde en yakın düğüm (klavyeyle gezinme): yön konisi ±60°. */
export function nearestInDirection(
  from: Point,
  candidates: readonly { id: string; p: Point }[],
  direction: "left" | "right" | "up" | "down"
): string | null {
  const [ux, uy] = direction === "left" ? [-1, 0] : direction === "right" ? [1, 0] : direction === "up" ? [0, -1] : [0, 1];
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const vx = c.p.x - from.x;
    const vy = c.p.y - from.y;
    const along = vx * ux + vy * uy;
    if (along <= 0.5) continue;
    const across = Math.abs(vx * uy - vy * ux);
    if (across > along * 1.8) continue;
    const score = along + across * 2;
    if (score < bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return best;
}
