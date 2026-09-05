import { Fragment, type ReactNode } from "react";

// `@dosya/yol` bahsi. `(^|\s)` başı, e-posta adreslerinin (`biri@yer.com`) bahis
// sanılmasını engelliyor; `[^\s@]+` de bahsin ilk boşlukta bittiğini söylüyor.
// ChatSessionPane'deki `MENTION_RE` ile aynı kural — ama o, imlecin solunda
// YARIM KALMIŞ bir bahsi arıyor (`*` ve `$` ile), bu ise metindeki TAMAMLANMIŞ
// bahisleri buluyor. Aynı ifadeyi paylaşamıyorlar.
const MENTION_G = /(^|\s)(@[^\s@]+)/g;

/**
 * Metni düz parçalara ve `@bahis` parçalarına böler.
 *
 * NEDEN AYRI BİR DOSYA: aynı boyama iki ayrı yerde gerekiyor ve ikisinin
 * ayrışması sinsi olurdu — composer'da vurgulanan bir yol, gönderildikten sonra
 * balonda düz metne dönseydi kullanıcı bahsin "tutmadığını" sanırdı.
 *
 * `key` olarak indeks kullanılıyor: liste her boyamada baştan üretiliyor, sıra
 * dışında bir kimliği yok.
 */
export function renderWithMentions(text: string, className: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  // `lastIndex` paylaşılan bir durum — her çağrıda sıfırlanıyor, yoksa ikinci
  // çağrı metnin ortasından başlardı (`/g` bayrağının klasik tuzağı).
  MENTION_G.lastIndex = 0;
  while ((match = MENTION_G.exec(text)) !== null) {
    const start = match.index + match[1].length;
    if (start > last) out.push(<Fragment key={`t${last}`}>{text.slice(last, start)}</Fragment>);
    out.push(
      <span key={`m${start}`} className={className}>
        {match[2]}
      </span>
    );
    last = start + match[2].length;
  }
  if (last < text.length) out.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  return out;
}

/** Bahis rengi — composer'daki kaplama ile mesaj balonunda AYNI olmak zorunda. */
export const MENTION_CLASS = "rounded bg-accent-500/15 text-accent-400";
