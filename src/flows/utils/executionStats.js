// traceEvents (AppShell'de runtime:trace IPC event'lerinden biriken dizi)
// icin ortak analiz yardimcilari. DebugPanel.jsx'teki buildChains ile ayni
// gruplama mantigini kullanir (chainId bazli), WorkflowHeader/WorkflowSidebar
// icin ozet istatistikler cikarir. Kaynak veri: electron/flowRuntime.js
// onTrace() cagrilari (kind: 'chain-start' | 'step' | 'chain-timeout').

export function groupChains(traceEvents) {
  const chainsMap = new Map();
  const order = [];
  (traceEvents || []).forEach((evt) => {
    const id = evt.chainId || 'unknown';
    if (!chainsMap.has(id)) {
      chainsMap.set(id, { chainId: id, trigger: null, steps: [], timedOut: false, startedAt: evt.timestamp, endedAt: evt.timestamp });
      order.push(id);
    }
    const chain = chainsMap.get(id);
    chain.endedAt = evt.timestamp;
    if (evt.kind === 'chain-start') {
      chain.trigger = evt.trigger;
      chain.startedAt = evt.timestamp;
    } else if (evt.kind === 'step') {
      chain.steps.push(evt);
    } else if (evt.kind === 'chain-timeout') {
      chain.timedOut = true;
      chain.steps.push({ ...evt, nodeName: 'Zaman Asimi (15sn)', status: 'error' });
    }
  });
  return order.map((id) => chainsMap.get(id));
}

const ACTIVE_EDGE_WINDOW_MS = 2500;

// Deploy sirasinda hangi wire/edge'in "az once kullanildigini" belirler -
// FlowCanvas.jsx bunu React Flow edge'lerine animated:true olarak uygular
// (aktif path akiyor gorunsun). Bir chain'deki ardisik iki step arasindaki
// (nodeId(i) -> nodeId(i+1)) gecis, ikinci step'in zaman damgasi "simdi"ye
// gore ACTIVE_EDGE_WINDOW_MS icindeyse "aktif" sayilir.
export function computeActiveEdgeKeys(traceEvents, windowMs = ACTIVE_EDGE_WINDOW_MS, now = Date.now()) {
  const chains = groupChains(traceEvents);
  const keys = new Set();
  chains.forEach((chain) => {
    for (let i = 0; i < chain.steps.length - 1; i++) {
      const cur = chain.steps[i];
      const next = chain.steps[i + 1];
      if (!cur.nodeId || !next.nodeId) continue;
      if (typeof next.timestamp !== 'number') continue;
      if (now - next.timestamp <= windowMs) {
        keys.add(`${cur.nodeId}->${next.nodeId}`);
      }
    }
  });
  return keys;
}

export function computeExecutionStats(traceEvents) {
  const chains = groupChains(traceEvents);
  const finished = chains.filter((c) => c.steps.length > 0 || c.timedOut);
  const totalRuns = finished.length;
  const errored = finished.filter((c) => c.timedOut || c.steps.some((s) => s.status === 'error'));
  const successCount = totalRuns - errored.length;
  const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : null;
  const durations = finished
    .map((c) => (c.endedAt && c.startedAt ? c.endedAt - c.startedAt : null))
    .filter((d) => typeof d === 'number' && d >= 0);
  const avgDurationMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  const last = finished[finished.length - 1] || null;
  const lastRun = last
    ? {
        ok: !(last.timedOut || last.steps.some((s) => s.status === 'error')),
        timestamp: last.endedAt || last.startedAt,
        trigger: last.trigger,
        stepCount: last.steps.length
      }
    : null;

  return { totalRuns, successCount, errorCount: errored.length, successRate, avgDurationMs, lastRun };
}

export function formatAgo(timestamp) {
  if (!timestamp) return null;
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'az once';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return 'az once';
  if (sec < 60) return `${sec} sn once`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk once`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa once`;
  const day = Math.floor(hr / 24);
  return `${day} gun once`;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '-';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} sn`;
}

export function computeTopNodesByUsage(nodesById, order, containerId, limit = 5) {
  const counts = new Map();
  order.forEach((id) => {
    const n = nodesById[id];
    if (!n || n.z !== containerId) return;
    if (n.type === 'subflow-in' || n.type === 'subflow-out') return;
    counts.set(n.type, (counts.get(n.type) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([type, count]) => ({ type, count }));
}

// RightPanel.jsx'teki "Ort. Süre" mini-sparkline grafiği için - son N
// çalışmanın (chain) süresini (ms) sırasıyla döner. Grafik sadece GÖRSEL bir
// eğilim göstergesidir (küçük/büyük iniş-çıkış), eksen/etiket taşımaz.
export function computeDurationSeries(traceEvents, limit = 12) {
  const chains = groupChains(traceEvents).filter((c) => c.steps.length > 0 || c.timedOut);
  return chains
    .slice(-limit)
    .map((c) => (c.endedAt && c.startedAt ? Math.max(0, c.endedAt - c.startedAt) : 0));
}

