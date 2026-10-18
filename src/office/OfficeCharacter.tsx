// Ofis karakteri (spec 2026-10-18 ofis-gorunumu §4): sandalye, oturan kişi,
// masa, ekran ve klavye — kendi basit geometrik çizimimiz; başka ürünlerin
// piksel çizimleri kopyalanmıyor. Kişi bölme rengini taşıyor; durum tonları
// yalnız mevcut --status-* jetonlarından. Hareket yalnız `motion` (kesin
// "çalışıyor") ve "hareketi azalt" kapalıyken; etiketler düğmede, çizim gizli.
import type { CSSProperties } from "react";
import type { OfficePose } from "./officeLayout";
import { usePrefersReducedMotion } from "./reducedMotion";

export default function OfficeCharacter({ pose, motion, color }: { pose: OfficePose; motion: boolean; color: string | null }) {
  const reduced = usePrefersReducedMotion();
  const moving = motion && !reduced;
  const faded = pose === "unknown" || pose === "absent";
  const atDesk = pose === "typing" || pose === "asking" || pose === "error";
  const ink: { style?: CSSProperties; className?: string } = color ? { style: { fill: color } } : { className: "fill-slate-400" };
  return (
    <svg
      viewBox="0 0 120 96"
      aria-hidden="true"
      focusable="false"
      data-pose={pose}
      className={`h-auto w-full max-w-[9rem] ${faded ? "opacity-40" : ""}`}
    >
      {/* Masa ve ayakları */}
      <rect x="50" y="62" width="60" height="6" rx="2" className="fill-slate-600" />
      <rect x="54" y="68" width="4" height="22" className="fill-slate-600" />
      <rect x="102" y="68" width="4" height="22" className="fill-slate-600" />
      {/* Ekran: çerçeve, ayak, yüzey */}
      <rect x="62" y="28" width="40" height="28" rx="3" className="fill-raised stroke-line" strokeWidth="1" />
      <rect x="80" y="56" width="4" height="6" className="fill-slate-600" />
      <Screen pose={pose} moving={moving} color={color} />
      {/* Klavye */}
      <rect x="64" y="58" width="24" height="3" rx="1" className="fill-slate-500" />
      {pose !== "absent" && (
        <>
          {/* Sandalye */}
          <rect x="14" y="34" width="5" height="34" rx="2" className="fill-slate-600" />
          <rect x="18" y="64" width="32" height="5" rx="2" className="fill-slate-600" />
          <rect x="32" y="69" width="4" height="21" className="fill-slate-600" />
          <g data-person="" transform={pose === "resting" ? "rotate(-10 36 64)" : undefined}>
            <circle cx="34" cy="24" r="9" {...ink} />
            <rect x="24" y="36" width="20" height="28" rx="8" {...ink} />
            <g data-hands="">
              <rect
                x={atDesk ? 64 : 36}
                y={atDesk ? 55 : 58}
                width="7"
                height="3"
                rx="1.5"
                {...ink}
                className={[ink.className, moving ? "office-typing" : ""].filter(Boolean).join(" ") || undefined}
              />
              <rect
                x={atDesk ? 76 : 42}
                y={atDesk ? 55 : 58}
                width="7"
                height="3"
                rx="1.5"
                {...ink}
                className={[ink.className, moving ? "office-typing" : ""].filter(Boolean).join(" ") || undefined}
                style={{ ...ink.style, ...(moving ? { animationDelay: "300ms" } : {}) }}
              />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}

/** Ekran yüzeyi: çalışırken parlak, soru ve hatada kendi tonu, gerisinde sönük. */
function Screen({ pose, moving, color }: { pose: OfficePose; moving: boolean; color: string | null }) {
  if (pose === "error") {
    return (
      <>
        <rect data-screen="" x="65" y="31" width="34" height="22" rx="1.5" style={{ fill: "var(--status-danger-bg)" }} />
        <g data-danger-mark="" style={{ fill: "var(--status-danger-solid)" }}>
          <rect x="80" y="35" width="4" height="9" rx="1" />
          <rect x="80" y="46" width="4" height="4" rx="1" />
        </g>
      </>
    );
  }
  if (pose === "typing" || pose === "asking") {
    return (
      <rect
        data-screen=""
        x="65"
        y="31"
        width="34"
        height="22"
        rx="1.5"
        style={{ fill: color ?? "var(--status-success-text)" }}
        opacity={pose === "typing" ? 0.45 : 0.3}
        className={moving ? "office-glow" : undefined}
      />
    );
  }
  return <rect data-screen="" x="65" y="31" width="34" height="22" rx="1.5" opacity={0.5} className="fill-slate-600" />;
}
