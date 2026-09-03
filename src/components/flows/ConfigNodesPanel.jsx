import React, { useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { useFlowSnapshot } from '../../flows/FlowContext';
import { isConfigType, catalogEntry, getMissingRequiredFields, getConfigUsageMap } from '../../flows/nodeCatalog';

// Gercek aXet.flows editorunun Ctrl+F "is:config is:unused" arama
// sozdizimini (2026-08-29 arastirmasiyla dogrulandi) ARTIK GERCEKTEN
// YAZILABILIR bir arama kutusu olarak da destekler (`is:unused`,
// `is:invalid`, `is:config` token'lari + duz metin, bosluk ile birlestirilebilir
// - orn "is:config is:unused mail"). Panel zaten SADECE config node'lari
// listeledigi icin `is:config` token'i her zaman dogrudur (no-op, sadece
// gercek sozdizimiyle tutarlilik icin kabul ediliyor) - `is:unused`/
// `is:invalid` ise listeyi GERCEKTEN filtreler. Arama kutusu BOSKEN eskisi
// gibi TUM config node'lar (eksik-alan/kullanilmiyor rozetleriyle) gorunur -
// yani "surekli/gorsel gosterge" davranisi KAYBOLMADI, arama SADECE ustune
// eklenen bir daraltma secenegi.
function parseConfigQuery(raw) {
  const tokens = (raw || '').trim().split(/\s+/).filter(Boolean);
  const is = new Set();
  const textParts = [];
  tokens.forEach((t) => {
    const m = /^is:(\w+)$/i.exec(t);
    if (m) is.add(m[1].toLowerCase());
    else textParts.push(t.toLowerCase());
  });
  return { is, text: textParts.join(' ') };
}

export default function ConfigNodesPanel({ selectedId, onSelect }) {
  const snapshot = useFlowSnapshot();
  const [query, setQuery] = useState('');
  const configIds = snapshot.order.filter((id) => isConfigType(snapshot.nodesById[id]?.type));
  const usage = useMemo(() => getConfigUsageMap(snapshot.nodesById), [snapshot.nodesById]);
  const { is: isFilters, text: textFilter } = useMemo(() => parseConfigQuery(query), [query]);

  const visibleIds = configIds.filter((id) => {
    const n = snapshot.nodesById[id];
    const entry = catalogEntry(n.type);
    const missing = getMissingRequiredFields(n.type, n);
    const isUnused = !usage.has(id) || usage.get(id) === 0;
    if (isFilters.has('unused') && !isUnused) return false;
    if (isFilters.has('invalid') && missing.length === 0) return false;
    if (textFilter) {
      const label = (n.name || entry.label || n.type).toLowerCase();
      const hay = `${label} ${n.type.toLowerCase()} ${id.toLowerCase()}`;
      if (!hay.includes(textFilter)) return false;
    }
    return true;
  });

  return (
    <div className="config-panel">
      <div className="config-panel-title">Config Node'lar ({configIds.length})</div>
      <div className="config-panel-search">
        <Search size={12} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="is:config is:unused / is:invalid / ad ara..."
        />
      </div>
      {configIds.length === 0 && <div className="config-panel-empty">Henuz config node yok.</div>}
      {configIds.length > 0 && visibleIds.length === 0 && (
        <div className="config-panel-empty">Bu aramayla eslesen config node yok.</div>
      )}
      <ul className="config-panel-list">
        {visibleIds.map((id) => {
          const n = snapshot.nodesById[id];
          const entry = catalogEntry(n.type);
          const missing = getMissingRequiredFields(n.type, n);
          const isUnused = !usage.has(id) || usage.get(id) === 0;
          const label = n.name || entry.label || n.type;
          const tooltipParts = [JSON.stringify(n)];
          if (missing.length > 0) tooltipParts.push(`Eksik alanlar: ${missing.map((m) => m.label).join(', ')}`);
          if (isUnused) tooltipParts.push('Bu config node hicbir node tarafindan kullanilmiyor (is:config is:unused).');
          return (
            <li
              key={id}
              className={`${id === selectedId ? 'config-panel-item-selected' : ''}${missing.length > 0 ? ' config-panel-item-invalid' : ''}`}
              title={tooltipParts.join('\n')}
              onClick={() => onSelect?.(id)}
            >
              <span className="config-dot" style={{ background: entry.color }} />
              <span className="config-type">{label}</span>
              {missing.length > 0 && (
                <span className="config-panel-item-warn">
                  <AlertTriangle size={11} strokeWidth={2.5} />
                </span>
              )}
              {isUnused && <span className="config-panel-item-unused">kullanilmiyor</span>}
              <span className="config-id">{id.slice(0, 8)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
