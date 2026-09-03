import type { ReactNode } from "react";

// SAP GUI Scripting ekranının ortak kabuk parçaları.
//
// NEDEN VAR: panel başlıkları dört ayrı dosyada dört farklı şekilde yazılmıştı
// — kimi çerçeveli kimi çerçevesiz, 10px/11px, farklı gri tonları ve farklı
// yükseklikler. Sonuç: sütunların üst kenarları birbirini tutmuyordu. Tek
// yerden gelince hem hiza düzeliyor hem de tema değişkenlerinden şaşmak
// (ör. tanımsız `slate-700`) zorlaşıyor.
//
// Yükseklikler BİLEREK sabit: `h-8` başlık, `h-7` düğme. Dikey ritim ancak
// böyle tutuyor; `py-*` ile yazılan sürüm, içerik uzunluğuna göre panelden
// panele 2-3 piksel kayıyordu.

export const TOOL_BUTTON =
  "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-base-700 bg-base-800 px-2.5 text-[11px] font-medium text-slate-200 hover:bg-base-700 disabled:cursor-default disabled:opacity-40";

export const ICON_BUTTON =
  "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-base-700 bg-base-800 text-slate-400 hover:bg-base-700 hover:text-white disabled:cursor-default disabled:opacity-40";

// Çerçevesiz ikon düğmesi — panel başlıklarındaki ikincil eylemler için.
export const GHOST_ICON_BUTTON =
  "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-base-800 hover:text-white disabled:cursor-default disabled:opacity-40";

export const PRIMARY_BUTTON =
  "flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-accent-500 px-3 text-[11px] font-medium text-accent-on hover:bg-accent-600 disabled:cursor-default disabled:opacity-60";

export const PANEL_TITLE = "text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500";

export function PanelHeader({
  icon,
  title,
  children,
  right
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-base-800 px-2.5">
      {icon}
      <span className={PANEL_TITLE}>{title}</span>
      {children}
      {right ? <div className="ml-auto flex items-center gap-1">{right}</div> : null}
    </div>
  );
}

// Sayı rozeti — "kaç bağlantı", "kaç adım". Sıfırsa hiç çizilmez: boş bir
// rozet bilgi değil gürültüdür.
export function CountBadge({ value }: { value: number }) {
  if (!value) return null;
  return (
    <span className="rounded-full bg-base-800 px-1.5 text-[10px] font-semibold text-slate-400">{value}</span>
  );
}

export function Pill({ children, mono = true }: { children: ReactNode; mono?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full bg-base-800 px-2 py-0.5 text-[10px] text-slate-400 ${mono ? "font-mono" : ""}`}
    >
      {children}
    </span>
  );
}

// Boş durum — üç panelde de aynı ölçüde: ikon + tek paragraf, ortalanmış.
export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="text-slate-600">{icon}</div>
      <p className="max-w-[34ch] text-[11px] leading-relaxed text-slate-500">{text}</p>
    </div>
  );
}
