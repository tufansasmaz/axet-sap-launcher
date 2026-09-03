import React from 'react';

// Referans görseldeki "AVG DURATION" mini-eğilim grafiği — bağımsız/hafif
// bir SVG polyline. Veri yoksa/tek noktaysa düz bir çizgi gösterir; eksen/
// etiket yok, sadece son N çalışmanın süre eğilimini gösteren dekoratif bir
// gösterge (DebugPanel/RunsView'daki gerçek sayısal detaylar zaten var).
export default function MiniSparkline({ values, width = 84, height = 28 }) {
  const data = Array.isArray(values) && values.length > 0 ? values : [0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const points = data
    .map((v, i) => {
      const x = data.length > 1 ? i * stepX : width / 2;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mini-sparkline">
      <polyline points={points} fill="none" stroke="var(--accent-400)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
