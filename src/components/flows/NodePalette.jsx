import React, { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  CANVAS_TYPES,
  CONFIG_TYPES,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  catalogEntry,
  defaultConfigFor,
  isSubflowPortType
} from '../../flows/nodeCatalog';
import { useFlow, useFlowActions, useFlowSnapshot } from '../../flows/FlowContext';
import CategoryIcon from './CategoryIcon';

const DRAG_MIME = 'application/axetflow-node';
const CONFIG_GROUP_KEY = '__config__';
const SUBFLOWS_GROUP_KEY = '__subflows__';
const SUBFLOW_COLOR = '#c084e8';

function groupByCategory(types) {
  const groups = {};
  types.forEach((type) => {
    const entry = catalogEntry(type);
    const cat = entry.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(type);
  });
  return groups;
}

function matches(type, entry, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return type.toLowerCase().includes(q) || (entry.label || '').toLowerCase().includes(q);
}

function handleDragStart(event, payload) {
  event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.effectAllowed = 'move';
}

function CategorySection({ groupKey, title, count, color, collapsed, onToggle, children }) {
  return (
    <div className={`node-palette-group${collapsed ? ' node-palette-group-collapsed' : ''}`}>
      <button className="node-palette-group-title" onClick={() => onToggle(groupKey)}>
        {color && <span className="node-palette-group-accent" style={{ background: color }} />}
        <span className="node-palette-group-name">{title}</span>
        <span className="node-palette-group-count">{count}</span>
        <span className={`node-palette-group-chevron${collapsed ? ' node-palette-group-chevron-collapsed' : ''}`}>
          <ChevronDown size={13} />
        </span>
      </button>
      {!collapsed && <div className="node-palette-group-items">{children}</div>}
    </div>
  );
}

// Kullanıcı geri bildirimi: önceki turdaki dolgu renkli kare rozet ("kutu
// içinde ikon") ve kutulu/kenarlıklı satır tasarımı çok göze batıyordu — VS
// Code'un dosya gezgini gibi SADE bir liste isteniyordu. Artık ikon hiçbir
// arka plan/kutu TAŞIMIYOR, sadece kategori rengiyle boyanmış düz bir
// lucide-react ikonu (bkz. `.node-palette-item-icon` — `color` inline style).
function NodeIconBadge({ color, category, isConfig }) {
  return (
    <span className="node-palette-item-icon" style={{ color }}>
      <CategoryIcon category={isConfig ? 'other' : category} size={14} />
    </span>
  );
}

export default function NodePalette({ onNodeAdded, width }) {
  const { model } = useFlow();
  const snapshot = useFlowSnapshot();
  const { addNode } = useFlowActions();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const isEditingSubflow = snapshot.activeContainerKind === 'subflow';

  const selectableCanvasTypes = useMemo(
    () => CANVAS_TYPES.filter((type) => isEditingSubflow || !isSubflowPortType(type)),
    [isEditingSubflow]
  );

  const filteredCanvasTypes = useMemo(
    () => selectableCanvasTypes.filter((type) => matches(type, catalogEntry(type), query)),
    [selectableCanvasTypes, query]
  );
  const filteredConfigTypes = useMemo(
    () => CONFIG_TYPES.filter((type) => matches(type, catalogEntry(type), query)),
    [query]
  );
  const groups = groupByCategory(filteredCanvasTypes);
  const orderedCategories = useMemo(() => {
    const known = CATEGORY_ORDER.filter((cat) => groups[cat] && groups[cat].length > 0);
    const extra = Object.keys(groups).filter((cat) => !CATEGORY_ORDER.includes(cat));
    return [...known, ...extra];
  }, [groups]);

  const usableSubflows = snapshot.subflows
    .filter((sf) => sf.id !== snapshot.activeContainerId)
    .filter((sf) => !query || sf.name.toLowerCase().includes(query.toLowerCase()));

  function toggleGroup(key) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  function handleAddCanvasNode(type) {
    const count = model.order.filter(
      (id) => model.nodesById[id]?.type === type && model.nodesById[id]?.z === model.activeTabId
    ).length;
    const y = 80 + count * 90;
    const id = addNode({ type, config: defaultConfigFor(type), x: 80, y });
    onNodeAdded?.(id);
  }

  function handleAddConfigNode(type) {
    const id = addNode({ type, config: defaultConfigFor(type) });
    onNodeAdded?.(id);
  }

  function handleAddSubflowInstance(sf) {
    const id = addNode({ type: `subflow:${sf.id}`, name: sf.name, config: { wires: [[]] }, x: 80, y: 80 });
    onNodeAdded?.(id);
  }

  const nothingFound =
    query && filteredCanvasTypes.length === 0 && filteredConfigTypes.length === 0 && usableSubflows.length === 0;

  return (
    <div className="node-palette" style={width ? { width } : undefined}>
      <div className="node-palette-search">
        <Search size={13} className="node-palette-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Node ara..."
        />
      </div>
      <div className="node-palette-scroll">
        {nothingFound && <div className="node-palette-empty">"{query}" icin sonuc yok.</div>}

        {usableSubflows.length > 0 && (
          <CategorySection
            groupKey={SUBFLOWS_GROUP_KEY}
            title="Subflow'larim"
            count={usableSubflows.length}
            color={SUBFLOW_COLOR}
            collapsed={Boolean(collapsed[SUBFLOWS_GROUP_KEY])}
            onToggle={toggleGroup}
          >
            {usableSubflows.map((sf) => (
              <button
                key={sf.id}
                className="node-palette-item node-palette-item-subflow"
                draggable
                onDragStart={(e) =>
                  handleDragStart(e, { type: `subflow:${sf.id}`, isConfig: false, subflowName: sf.name })
                }
                onClick={() => handleAddSubflowInstance(sf)}
                title={`subflow:${sf.id}`}
              >
                <NodeIconBadge color={SUBFLOW_COLOR} category="subflow" />
                <span className="node-palette-item-label">{sf.name}</span>
              </button>
            ))}
          </CategorySection>
        )}

        {isEditingSubflow && (
          <div className="node-palette-subflow-hint">
            Subflow duzenleniyor: Giris/Cikis portlarini asagidaki "Subflow Portlari" bolumunden ekleyebilirsin.
          </div>
        )}

        {orderedCategories.map((cat) => {
          const types = groups[cat];
          return (
            <CategorySection
              key={cat}
              groupKey={cat}
              title={CATEGORY_LABELS[cat] || cat}
              count={types.length}
              color={catalogEntry(types[0]).color}
              collapsed={Boolean(collapsed[cat])}
              onToggle={toggleGroup}
            >
              {types.map((type) => {
                const entry = catalogEntry(type);
                return (
                  <button
                    key={type}
                    className="node-palette-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, { type, isConfig: false })}
                    onClick={() => handleAddCanvasNode(type)}
                    title={type}
                  >
                    <NodeIconBadge color={entry.color} category={entry.category} />
                    <span className="node-palette-item-label">{entry.label || type}</span>
                  </button>
                );
              })}
            </CategorySection>
          );
        })}

        {filteredConfigTypes.length > 0 && (
          <CategorySection
            groupKey={CONFIG_GROUP_KEY}
            title="Config Node'lar"
            count={filteredConfigTypes.length}
            color="var(--ink-500)"
            collapsed={Boolean(collapsed[CONFIG_GROUP_KEY])}
            onToggle={toggleGroup}
          >
            {filteredConfigTypes.map((type) => {
              const entry = catalogEntry(type);
              return (
                <button
                  key={type}
                  className="node-palette-item node-palette-item-config"
                  draggable
                  onDragStart={(e) => handleDragStart(e, { type, isConfig: true })}
                  onClick={() => handleAddConfigNode(type)}
                  title={type}
                >
                  <NodeIconBadge color={entry.color} category={entry.category} isConfig />
                  <span className="node-palette-item-label">{entry.label || type}</span>
                </button>
              );
            })}
          </CategorySection>
        )}
      </div>
    </div>
  );
}
