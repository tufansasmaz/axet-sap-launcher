// Uygulama içi logo. `src/assets/logo.svg` ile aynı çizim, ama renkleri
// jetondan: ok ve hız çizgileri seçili vurgunun (`--accent-500`), kutu
// temanın yüzeyinin rengini alıyor. Vurgu ya da tema değişince logo da
// değişiyor (kullanıcı kararı, 2026-10-01). Dosyadaki SVG sabit Amber;
// CSS değişkenine erişemeyen yerler (favicon, Windows simgesi) onu kullanıyor.
//
// Renk geçişi ve parlama yok: grafit görünümde renk düz ve tek.

interface AppLogoProps {
  size: number;
  className?: string;
}

const MARK = "rgb(var(--accent-500-rgb))";

export default function AppLogo({ size, className }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
      className={className}
      data-testid="app-logo"
    >
      <rect
        x="8"
        y="8"
        width="496"
        height="496"
        rx="100"
        fill="rgb(var(--surface-raised-rgb))"
        stroke="rgb(var(--border-line-rgb))"
        strokeWidth="16"
      />
      <line x1="86" y1="330" x2="118" y2="298" stroke={MARK} strokeWidth="14" strokeLinecap="round" opacity="0.35" />
      <line x1="98" y1="372" x2="146" y2="324" stroke={MARK} strokeWidth="14" strokeLinecap="round" opacity="0.55" />
      <line x1="110" y1="414" x2="174" y2="350" stroke={MARK} strokeWidth="14" strokeLinecap="round" opacity="0.75" />
      <path
        d="M 208 140 L 372 256 L 208 372"
        fill="none"
        stroke={MARK}
        strokeWidth="56"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
