import type { HTMLAttributes } from "react";

// Dolgulu yüzey (spec §6.4): `card` zemini, 12px köşe, saç teli kenarlık.
// Gölge yok — koyu temada gölge görünmüyor, açık temada kenarlık yetiyor;
// yükselti yalnızca üstte yüzen şeylerde (pencere, menü) kullanılıyor.
// `flush`: içinde kendi dolgusu olan liste/tablo taşıyan kartlar için.

export function Card({ flush = false, className, ...rest }: HTMLAttributes<HTMLDivElement> & { flush?: boolean }) {
  const base = `rounded-xl border border-line bg-card${flush ? "" : " p-5"}`;
  return <div className={className ? `${base} ${className}` : base} {...rest} />;
}
