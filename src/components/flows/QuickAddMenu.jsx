import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CANVAS_TYPES, CONFIG_TYPES, catalogEntry } from '../../flows/nodeCatalog';

export default function QuickAddMenu({ x, y, subflows, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose();
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const items = useMemo(() => {
    const subflowItems = (subflows || []).map((sf) => ({
      type: `subflow:${sf.id}`,
      kind: 'subflow',
      subflowName: sf.name,
      label: sf.name,
      color: '#c084e8'
    }));
    const canvasItems = CANVAS_TYPES.map((type) => {
      const entry = catalogEntry(type);
      return { type, kind: 'canvas', label: entry.label || type, color: entry.color };
    });
    const configItems = CONFIG_TYPES.map((type) => {
      const entry = catalogEntry(type);
      return { type, kind: 'config', label: entry.label || type, color: entry.color };
    });
    const all = [...subflowItems, ...canvasItems, ...configItems];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((it) => it.type.toLowerCase().includes(q) || it.label.toLowerCase().includes(q));
  }, [query, subflows]);

  return (
    <div className="quick-add-menu" style={{ left: x, top: y }} ref={rootRef}>
      <input
        ref={inputRef}
        className="quick-add-search"
        placeholder="Node ara... (Esc: kapat)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && items.length > 0) {
            onPick(items[0]);
          }
        }}
      />
      <div className="quick-add-list">
        {items.length === 0 && <div className="quick-add-empty">Sonuc yok</div>}
        {items.map((it) => (
          <button
            key={it.type}
            className="quick-add-item"
            style={{ borderLeftColor: it.color }}
            onClick={() => onPick(it)}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
