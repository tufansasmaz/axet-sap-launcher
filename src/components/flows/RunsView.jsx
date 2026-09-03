import React, { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { groupChains, formatAgo, formatDuration } from '../../flows/utils/executionStats';

const FILTERS = [
  { key: 'all', label: 'Tumu' },
  { key: 'success', label: 'Basarili' },
  { key: 'error', label: 'Hatali' }
];

function chainFailed(chain) {
  return chain.timedOut || chain.steps.some((s) => s.status === 'error');
}

export default function RunsView({ traceEvents, onClose, onOpenChain }) {
  const [filter, setFilter] = useState('all');

  const chains = useMemo(() => {
    const all = groupChains(traceEvents)
      .filter((c) => c.steps.length > 0 || c.timedOut)
      .reverse();
    if (filter === 'success') return all.filter((c) => !chainFailed(c));
    if (filter === 'error') return all.filter((c) => chainFailed(c));
    return all;
  }, [traceEvents, filter]);

  const counts = useMemo(() => {
    const all = groupChains(traceEvents).filter((c) => c.steps.length > 0 || c.timedOut);
    return { all: all.length, success: all.filter((c) => !chainFailed(c)).length, error: all.filter(chainFailed).length };
  }, [traceEvents]);

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide runs-view-modal">
        <h2>Calisma Gecmisi (Runs)</h2>
        <p className="modal-hint">
          Bu oturumda deploy edilen flow'un tetiklendigi her akis (chain) burada listelenir. Bir
          satira tiklamak Debug panelini o akisa odaklanmis halde acar.
        </p>
        <div className="runs-view-filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`runs-view-filter-btn${filter === f.key ? ' runs-view-filter-btn-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className="runs-view-filter-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="runs-view-list">
          {chains.length === 0 && (
            <div className="debug-panel-empty">
              Bu filtreye uyan bir calisma yok. Flow'u deploy et ve bir tetikleyici (HTTP istegi,
              inject) calistir - burada gorunecek.
            </div>
          )}
          {chains.map((chain) => {
            const failed = chainFailed(chain);
            const duration = chain.endedAt && chain.startedAt ? chain.endedAt - chain.startedAt : null;
            return (
              <button
                key={chain.chainId}
                className={`runs-view-row${failed ? ' runs-view-row-error' : ''}`}
                onClick={() => onOpenChain?.(chain.chainId)}
              >
                <span className={`runs-view-row-icon${failed ? ' runs-view-row-icon-error' : ' runs-view-row-icon-ok'}`}>
                  {failed ? <X size={13} strokeWidth={2.5} /> : <Check size={13} strokeWidth={2.5} />}
                </span>
                <span className="runs-view-row-main">
                  <span className="runs-view-row-trigger">
                    {chain.trigger?.nodeName || chain.trigger?.reason || 'Tetikleyici bilinmiyor'}
                  </span>
                  <span className="runs-view-row-meta">
                    {chain.steps.length} adim · sure: {formatDuration(duration)} · {formatAgo(chain.startedAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
