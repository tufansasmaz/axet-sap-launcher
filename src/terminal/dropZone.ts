// Sürükle-bırakta hedef bölmenin hangi alanı (spec 2026-10-14 §3.4).
// Kenarlar bölmenin %25'i; köşede en yakın kenar; geri kalan orta (takas).
import type { DropZone } from "../../app-electron/shared/terminalTree";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const EDGE_SHARE = 0.25;

export function dropZone(box: Box, x: number, y: number): DropZone | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const fx = (x - box.left) / box.width;
  const fy = (y - box.top) / box.height;
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
  const edges: Array<[DropZone, number]> = [
    ["left", fx],
    ["right", 1 - fx],
    ["top", fy],
    ["bottom", 1 - fy]
  ];
  const near = edges.filter(([, d]) => d < EDGE_SHARE).sort((a, b) => a[1] - b[1]);
  return near[0]?.[0] ?? "center";
}

export function zoneBox(box: Box, zone: DropZone): Box {
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  switch (zone) {
    case "left":
      return { ...box, width: halfW };
    case "right":
      return { ...box, left: box.left + halfW, width: halfW };
    case "top":
      return { ...box, height: halfH };
    case "bottom":
      return { ...box, top: box.top + halfH, height: halfH };
    case "center":
      return box;
  }
}
