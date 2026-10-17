// Terminal bölme ağacı (spec 2026-10-14 §3). Saf fonksiyonlar; React'sız,
// Electron'suz — ana süreç kaydı doğrularken, renderer ekranı kurarken
// aynı kodu kullanıyor.
//
// Kap (`split`) çocuklarını `dir` yönünde diziyor: `row` yan yana,
// `column` üst üste. `sizes` çocuk başına pay, toplamı 1. Her işlem sonucu
// `tidy`'den geçiyor: boş kap yok, tek çocuklu kap yok, aynı yönlü iç içe
// kap düzleşmiş, paylar normalize.

export type SplitDir = "row" | "column";
export type LayoutNode =
  | { type: "pane"; paneId: string }
  | { type: "split"; dir: SplitDir; children: LayoutNode[]; sizes: number[] };
export type EdgeSide = "left" | "right" | "top" | "bottom";
export type DropZone = EdgeSide | "center";
/** Küçültülen bölmenin dönüş adresi: hangi bölmenin hangi tarafına. */
export interface PaneHome {
  siblingPaneId: string;
  side: EdgeSide;
}

const EPS = 1e-6;
/** Kayıttan okunurken izin verilen en fazla iç içelik (9 bölme için bol). */
const MAX_DEPTH = 12;

export function leafIds(node: LayoutNode | null): string[] {
  if (!node) return [];
  if (node.type === "pane") return [node.paneId];
  return node.children.flatMap(leafIds);
}

function normSizes(sizes: readonly number[]): number[] {
  const clean = sizes.map((s) => (Number.isFinite(s) && s > 0 ? s : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (sum <= 0) return sizes.map(() => 1 / sizes.length);
  return clean.map((s) => (s > 0 ? s / sum : 0));
}

export function tidy(node: LayoutNode | null): LayoutNode | null {
  if (!node) return null;
  if (node.type === "pane") return node;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((raw, i) => {
    const child = tidy(raw);
    const share = node.sizes[i] ?? 0;
    if (!child || !(share > 0)) return;
    if (child.type === "split" && child.dir === node.dir) {
      child.children.forEach((grand, j) => {
        children.push(grand);
        sizes.push(share * child.sizes[j]);
      });
    } else {
      children.push(child);
      sizes.push(share);
    }
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { type: "split", dir: node.dir, children, sizes: normSizes(sizes) };
}

export function assertLayout(node: LayoutNode | null, ids?: readonly string[]): void {
  const seen = new Set<string>();
  const walk = (n: LayoutNode, parentDir: SplitDir | null): void => {
    if (n.type === "pane") {
      if (seen.has(n.paneId)) throw new Error(`çift bölme: ${n.paneId}`);
      seen.add(n.paneId);
      return;
    }
    if (n.children.length < 2) throw new Error("tek çocuklu ya da boş kap");
    if (n.sizes.length !== n.children.length) throw new Error("pay sayısı uyuşmuyor");
    if (n.dir === parentDir) throw new Error("aynı yönlü iç içe kap");
    if (n.sizes.some((s) => !(s > 0))) throw new Error("pay sıfır ya da geçersiz");
    if (Math.abs(n.sizes.reduce((a, b) => a + b, 0) - 1) > EPS) throw new Error("payların toplamı 1 değil");
    n.children.forEach((c) => walk(c, n.dir));
  };
  if (node) walk(node, null);
  if (ids) {
    const expected = [...ids].sort().join("|");
    if ([...seen].sort().join("|") !== expected) throw new Error("ağaçtaki bölmeler listeyle uyuşmuyor");
  }
}

const pane = (paneId: string): LayoutNode => ({ type: "pane", paneId });
const equal = (n: number) => Array.from({ length: n }, () => 1 / n);

/** Ağacı olmayan eski kayıt: bugünkü otomatik ızgaranın satırları. */
export function fromLegacy(ids: readonly string[]): LayoutNode | null {
  const n = ids.length;
  if (n === 0) return null;
  if (n === 1) return pane(ids[0]);
  if (n === 3) {
    return {
      type: "split",
      dir: "row",
      children: [pane(ids[0]), { type: "split", dir: "column", children: [pane(ids[1]), pane(ids[2])], sizes: equal(2) }],
      sizes: equal(2)
    };
  }
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows: LayoutNode[] = [];
  for (let i = 0; i < n; i += cols) {
    const chunk = ids.slice(i, i + cols).map(pane);
    rows.push(chunk.length === 1 ? chunk[0] : { type: "split", dir: "row", children: chunk, sizes: equal(chunk.length) });
  }
  return tidy(rows.length === 1 ? rows[0] : { type: "split", dir: "column", children: rows, sizes: equal(rows.length) });
}

function dirOf(side: EdgeSide): SplitDir {
  return side === "left" || side === "right" ? "row" : "column";
}

function mapLeaves(node: LayoutNode, fn: (paneId: string) => LayoutNode | null): LayoutNode | null {
  if (node.type === "pane") return fn(node.paneId);
  return {
    ...node,
    children: node.children.map((c) => mapLeaves(c, fn) ?? { type: "split", dir: node.dir, children: [], sizes: [] })
  };
}

export function insertPane(
  layout: LayoutNode | null,
  newId: string,
  target: { paneId: string; side: EdgeSide } | null
): LayoutNode {
  if (!layout) return pane(newId);
  const ids = leafIds(layout);
  const where = target && ids.includes(target.paneId) ? target : { paneId: ids[ids.length - 1], side: "right" as const };
  const before = where.side === "left" || where.side === "top";
  const next = mapLeaves(layout, (id) =>
    id === where.paneId
      ? { type: "split", dir: dirOf(where.side), children: before ? [pane(newId), pane(id)] : [pane(id), pane(newId)], sizes: equal(2) }
      : pane(id)
  );
  return tidy(next) as LayoutNode;
}

export function removePane(layout: LayoutNode | null, paneId: string): LayoutNode | null {
  if (!layout || !leafIds(layout).includes(paneId)) return layout;
  return tidy(mapLeaves(layout, (id) => (id === paneId ? null : pane(id))));
}

function parse(raw: unknown, allowed: ReadonlySet<string>, seen: Set<string>, depth: number): LayoutNode | null {
  if (depth > MAX_DEPTH || !raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.type === "pane") {
    if (typeof r.paneId !== "string" || !allowed.has(r.paneId) || seen.has(r.paneId)) return null;
    seen.add(r.paneId);
    return pane(r.paneId);
  }
  if (r.type !== "split" || (r.dir !== "row" && r.dir !== "column") || !Array.isArray(r.children)) return null;
  const rawSizes = Array.isArray(r.sizes) ? r.sizes : [];
  const validSizes =
    rawSizes.length === r.children.length && rawSizes.every((s) => typeof s === "number" && Number.isFinite(s) && s > 0);
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  r.children.forEach((c, i) => {
    const child = parse(c, allowed, seen, depth + 1);
    if (!child) return;
    children.push(child);
    sizes.push(validSizes ? (rawSizes[i] as number) : 1);
  });
  return { type: "split", dir: r.dir, children, sizes: normSizes(sizes.length ? sizes : [1]) };
}

/** Kayıttan gelen ağacı onarır: bilinmeyen/çift kimlik düşer, eksik bölme sona eklenir. */
export function normalizeLayout(raw: unknown, ids: readonly string[]): LayoutNode | null {
  if (ids.length === 0) return null;
  const seen = new Set<string>();
  let layout = tidy(parse(raw, new Set(ids), seen, 0));
  if (!layout) return fromLegacy(ids);
  for (const id of ids) if (!seen.has(id)) layout = insertPane(layout, id, null);
  return layout;
}

export type LayoutPath = number[];

export function nodeAt(layout: LayoutNode | null, path: LayoutPath): LayoutNode | null {
  let node = layout;
  for (const i of path) {
    if (!node || node.type !== "split" || !Number.isInteger(i) || i < 0 || i >= node.children.length) return null;
    node = node.children[i];
  }
  return node;
}

function replaceAt(layout: LayoutNode, path: LayoutPath, next: LayoutNode): LayoutNode {
  if (path.length === 0) return next;
  if (layout.type !== "split") return layout;
  const [head, ...rest] = path;
  return { ...layout, children: layout.children.map((c, i) => (i === head ? replaceAt(c, rest, next) : c)) };
}

export function swapPanes(layout: LayoutNode | null, a: string, b: string): LayoutNode | null {
  if (!layout || a === b) return layout;
  const ids = leafIds(layout);
  if (!ids.includes(a) || !ids.includes(b)) return layout;
  return mapLeaves(layout, (id) => pane(id === a ? b : id === b ? a : id));
}

export function movePane(layout: LayoutNode | null, dragId: string, targetId: string, zone: DropZone): LayoutNode | null {
  if (!layout || dragId === targetId) return layout;
  const ids = leafIds(layout);
  if (!ids.includes(dragId) || !ids.includes(targetId)) return layout;
  if (zone === "center") return swapPanes(layout, dragId, targetId);
  return insertPane(removePane(layout, dragId), dragId, { paneId: targetId, side: zone });
}

/** `index` ile `index+1` arasındaki ayırıcı `delta` (pay) kadar kayınca. */
export function dragSizes(sizes: readonly number[], index: number, delta: number, min: number): number[] {
  const next = [...sizes];
  if (!Number.isInteger(index) || index < 0 || index >= sizes.length - 1 || !Number.isFinite(delta)) return next;
  const total = sizes[index] + sizes[index + 1];
  if (total <= 2 * min) return next;
  const first = Math.min(total - min, Math.max(min, sizes[index] + delta));
  next[index] = first;
  next[index + 1] = total - first;
  return next;
}

export function resizeSplit(layout: LayoutNode | null, path: LayoutPath, index: number, delta: number, min: number): LayoutNode | null {
  const node = nodeAt(layout, path);
  if (!layout || !node || node.type !== "split") return layout;
  const sizes = dragSizes(node.sizes, index, delta, min);
  if (sizes.every((s, i) => s === node.sizes[i])) return layout;
  return replaceAt(layout, path, { ...node, sizes });
}

export function equalizeSplit(layout: LayoutNode | null, path: LayoutPath): LayoutNode | null {
  const node = nodeAt(layout, path);
  if (!layout || !node || node.type !== "split") return layout;
  return replaceAt(layout, path, { ...node, sizes: equal(node.children.length) });
}

function firstLeaf(node: LayoutNode): string {
  return node.type === "pane" ? node.paneId : firstLeaf(node.children[0]);
}
function lastLeaf(node: LayoutNode): string {
  return node.type === "pane" ? node.paneId : lastLeaf(node.children[node.children.length - 1]);
}

/** Bölme ağaçtan çekilmeden önce dönüş adresi: en yakın kardeşin hangi tarafı. */
export function homeOf(layout: LayoutNode | null, paneId: string): PaneHome | null {
  const find = (node: LayoutNode): PaneHome | null => {
    if (node.type === "pane") return null;
    const i = node.children.findIndex((c) => c.type === "pane" && c.paneId === paneId);
    if (i >= 0) {
      const next = node.children[i + 1];
      if (next) return { siblingPaneId: firstLeaf(next), side: node.dir === "row" ? "left" : "top" };
      const prev = node.children[i - 1];
      return { siblingPaneId: lastLeaf(prev), side: node.dir === "row" ? "right" : "bottom" };
    }
    for (const c of node.children) {
      const found = find(c);
      if (found) return found;
    }
    return null;
  };
  return layout ? find(layout) : null;
}

/** Küçültülmüş bölmeyi geri koyar; kardeşi yoksa `fallbackPaneId`'nin sağına. */
export function restoreInto(layout: LayoutNode | null, paneId: string, home: PaneHome | null, fallbackPaneId: string | null): LayoutNode {
  const ids = leafIds(layout);
  if (home && ids.includes(home.siblingPaneId)) return insertPane(layout, paneId, { paneId: home.siblingPaneId, side: home.side });
  return insertPane(layout, paneId, fallbackPaneId && ids.includes(fallbackPaneId) ? { paneId: fallbackPaneId, side: "right" } : null);
}
