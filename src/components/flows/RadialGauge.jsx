import React from 'react';

// Dairesel yüzde göstergesi (SVG, bağımsız/hafif) — Referans görseldeki
// "Success Rate %98" gösterge dairesinin karşılığı. Renk eşiği uygulamanın
// kendi durum renklerine (--status-success/warning/danger-text) bağlı;
// başka bir kütüphane eklenmedi, saf SVG `stroke-dasharray` tekniği.
export default function RadialGauge({ value, size = 56, strokeWidth = 5 }) {
  const clamped = value === null || value === undefined ? null : Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = clamped === null ? circumference : circumference * (1 - clamped / 100);
  const colorVar =
    clamped === null
      ? 'var(--ink-500)'
      : clamped >= 80
        ? 'var(--status-success-text)'
        : clamped >= 50
          ? 'var(--status-warning-text)'
          : 'var(--status-danger-text)';

  return (
    <div className="radial-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--base-700)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colorVar}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="radial-gauge-arc"
        />
      </svg>
      <span className="radial-gauge-label">{clamped === null ? '–' : `${clamped}%`}</span>
    </div>
  );
}
