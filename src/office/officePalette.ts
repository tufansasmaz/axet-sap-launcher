// Piksel ofisin paleti (spec 2026-10-18 ajanlar-yeniden §3). src/office
// altında renk YALNIZ bu dosyada: sıcak, sabit bir ofis paleti. Canvas tema
// değişkenini kare kare okumuyor; açık ve koyu temada aynı sahne. Lime yok:
// lime yalnız HTML katmanındaki seçim/odak halkası (accent sınıfı).
import type { TerminalPaneColor } from "../../app-electron/shared/types";

export const PALETTE = {
  outline: "#2a2024",
  floor: "#b98a5e",
  floorAlt: "#b0835a",
  floorSeam: "#8f6646",
  floorShine: "#c99a6c",
  wall: "#5c4b45",
  wallLight: "#6e5a50",
  wallTop: "#3b3136",
  baseboard: "#3a2e2a",
  doorFrame: "#4a3528",
  doorway: "#2e2422",
  windowFrame: "#d9cbb5",
  glass: "#8fc1d9",
  glassLight: "#c4e2ef",
  cork: "#b07a48",
  corkDark: "#8f5f36",
  paper: "#efe6d2",
  paperBlue: "#b9d3e6",
  pin: "#c8553d",
  clockFace: "#f2ead8",
  deskTop: "#8c5a3c",
  deskLight: "#a06a48",
  deskEdge: "#6e4630",
  deskShadow: "#4f3223",
  monitor: "#2b2b33",
  monitorLight: "#4a4a55",
  screenOff: "#1c1f26",
  screenOn: "#5fb7d4",
  screenLight: "#9fdcef",
  screenText: "#2f6f8a",
  screenError: "#d0574a",
  chair: "#3d4250",
  chairLight: "#555c6e",
  rug: "#4f7a74",
  rugBorder: "#3e625d",
  rugLight: "#5e8a83",
  table: "#9b6b45",
  tableLight: "#b07c52",
  pot: "#a65e3a",
  potShade: "#874a2c",
  leaf: "#4f8a4b",
  leafLight: "#6fae5f",
  counter: "#7a5238",
  counterLight: "#8d6142",
  machine: "#3a3a40",
  machineLight: "#55555e",
  led: "#d0574a",
  mug: "#efe6d2",
  coffee: "#6b4226",
  skin: "#f1c7a0",
  skinShade: "#d9a47e",
  pants: "#3b3f4a",
  askBg: "#fff4c2",
  askInk: "#a87b12",
  errBg: "#ffd9d4",
  errInk: "#b8372b",
  beam: "#fff2b0",
  beamCore: "#ffffff"
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Saç: koyu, kahve, sarı, kızıl — [ana, gölge]. */
export const HAIR: ReadonlyArray<readonly [string, string]> = [
  ["#2b2321", "#1b1515"],
  ["#6b3f23", "#4f2d18"],
  ["#c99a4b", "#a87c36"],
  ["#9c3b2a", "#7a2c1f"]
];

/** Gömlek = bölmenin rengi (PANE_COLOR_VAR karşılığı) — [ana, gölge]. */
export const SHIRT: Record<TerminalPaneColor, readonly [string, string]> = {
  gray: ["#8a8f99", "#6c717b"],
  blue: ["#4f7fc4", "#3c64a0"],
  green: ["#4f9a62", "#3c7a4c"],
  amber: ["#d39a3a", "#ad7c2a"],
  red: ["#c4554d", "#a0413a"],
  violet: ["#8a64b8", "#6d4d96"]
};

/** Bölme kimliğinden kararlı saç seçimi (0-3). */
export function hairIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % HAIR.length;
}
