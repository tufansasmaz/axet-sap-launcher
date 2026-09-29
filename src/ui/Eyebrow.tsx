import type { ReactNode } from "react";

// Bölüm etiketi (grafit spec §4.2): "SİSTEMLER 3". Mono, küçük, büyük harf,
// geniş harf aralığı, ink-300. Büyük harf CSS'le yapılıyor; Türkçe'de "i"nin
// "İ" olması `<html lang>`'a bağlı (bkz. useDocumentLanguage).
//
// `count` sağa yaslı ve eşit genişlikli rakamla; 0 da gösteriliyor, yalnızca
// verilmezse çizilmiyor. Başlık anlamı gerekiyorsa `as="h2"`/`"h3"`; bir
// düğmenin içindeyse `as="span"` (düğmenin içine blok öğe konmaz).
export function Eyebrow({
  children,
  count,
  as: Tag = "div",
  className = ""
}: {
  children: ReactNode;
  count?: ReactNode;
  as?: "div" | "span" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag
      className={`flex items-center gap-2 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-slate-300 ${className}`}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count !== undefined && <span className="shrink-0 tabular-nums">{count}</span>}
    </Tag>
  );
}
