export function quotePathIfNeeded(p: string): string {
  return /\s/.test(p) ? `"${p}"` : p;
}

/**
 * Uzun metni ortadan "…" ile kısaltıyor: yolun başı (sürücü) ve sonu
 * (klasör adı) görünür kalıyor. Sonuç en fazla `max` karakter.
 */
export function middleEllipsis(text: string, max = 48): string {
  if (text.length <= max) return text;
  if (max <= 1) return "…";
  const keep = max - 1;
  const head = Math.ceil(keep / 2);
  const tail = keep - head;
  return text.slice(0, head) + "…" + (tail > 0 ? text.slice(text.length - tail) : "");
}
