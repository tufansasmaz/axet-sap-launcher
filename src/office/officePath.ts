// Izgara üzerinde yol bulma (spec 2026-10-18 ajanlar-yeniden, kalite turu).
// SAF: 4 yönlü BFS — karolar eşit maliyetli, ızgara küçük (en çok ~40x40);
// A* burada bir şey kazandırmıyor. `extra`: o an dolu karolar (başka kişi).

export interface TilePoint {
  x: number;
  y: number;
}

const STEPS: ReadonlyArray<[number, number]> = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0]
];

const free = (blocked: readonly (readonly boolean[])[], x: number, y: number, extra?: ReadonlySet<string>) =>
  y >= 0 && y < blocked.length && x >= 0 && x < (blocked[y]?.length ?? 0) && !blocked[y][x] && !extra?.has(`${x},${y}`);

/** Başlangıç hariç, hedef dahil adımlar; aynı karoda []; ulaşılamazsa null. */
export function findPath(
  blocked: readonly (readonly boolean[])[],
  from: TilePoint,
  to: TilePoint,
  extra?: ReadonlySet<string>
): Array<[number, number]> | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (!free(blocked, to.x, to.y, extra)) return null;
  const cols = blocked[0]?.length ?? 0;
  const prev = new Map<number, number>();
  const start = from.y * cols + from.x;
  const goal = to.y * cols + to.x;
  prev.set(start, -1);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur === goal) break;
    const cx = cur % cols;
    const cy = Math.floor(cur / cols);
    for (const [dx, dy] of STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const id = ny * cols + nx;
      if (prev.has(id) || !free(blocked, nx, ny, extra)) continue;
      prev.set(id, cur);
      queue.push(id);
    }
  }
  if (!prev.has(goal)) return null;
  const out: Array<[number, number]> = [];
  for (let id = goal; id !== start; id = prev.get(id) as number) out.push([id % cols, Math.floor(id / cols)]);
  return out.reverse();
}

/** Başlangıçtan yürünerek varılabilen karolar ("x,y"). */
export function reachable(blocked: readonly (readonly boolean[])[], from: TilePoint): Set<string> {
  const seen = new Set<string>([`${from.x},${from.y}`]);
  const queue: Array<[number, number]> = [[from.x, from.y]];
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head];
    for (const [dx, dy] of STEPS) {
      const k = `${x + dx},${y + dy}`;
      if (seen.has(k) || !free(blocked, x + dx, y + dy)) continue;
      seen.add(k);
      queue.push([x + dx, y + dy]);
    }
  }
  return seen;
}
