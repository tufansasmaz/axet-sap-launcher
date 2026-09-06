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
//
// DÜĞMELER ARTIK BURADA TANIMLI DEĞİL (2026-09-06). Bu ekranın düğme yapısı
// kullanıcı kararıyla uygulamanın tamamına dil oldu, dolayısıyla tanımlar
// `src/ui/buttons.ts`e taşındı. Buradan yeniden dışa aktarılıyorlar ki bu
// klasördeki düzinelerce `import { TOOL_BUTTON } from "./ui"` satırı olduğu
// gibi çalışmaya devam etsin.
export {
  TOOL_BUTTON,
  ICON_BUTTON,
  GHOST_ICON_BUTTON,
  PRIMARY_BUTTON,
  PANEL_TITLE,
  btn,
  iconBtn,
} from "../../ui/buttons";

// `PanelHeader` aşağıda PANEL_TITLE'ı kendisi kullanıyor; `export ... from`
// yeniden dışa aktarır ama bu dosyanın kapsamına SOKMAZ, o yüzden ayrıca
// içe aktarılıyor.
import { PANEL_TITLE } from "../../ui/buttons";

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
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-line-subtle px-2.5">
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
    <span className="rounded-full bg-control px-1.5 text-[10px] font-semibold text-slate-400">{value}</span>
  );
}

export function Pill({ children, mono = true }: { children: ReactNode; mono?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full bg-control px-2 py-0.5 text-[10px] text-slate-400 ${mono ? "font-mono" : ""}`}
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
