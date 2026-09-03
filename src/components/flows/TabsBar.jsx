import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useFlowSnapshot, useFlowActions } from '../../flows/FlowContext';
import { requestConfirm } from '../../flows/utils/dialogService';

export default function TabsBar({ onTabChanged }) {
  const snapshot = useFlowSnapshot();
  const { addTab, renameTab, setActiveTab, removeTab } = useFlowActions();
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  function handleSwitch(id) {
    if (id === snapshot.activeTabId) return;
    setActiveTab(id);
    onTabChanged?.(id);
  }

  function handleAdd() {
    const id = addTab();
    onTabChanged?.(id);
  }

  function startRename(tab) {
    setEditingId(tab.id);
    setEditingValue(tab.name);
  }

  function commitRename() {
    if (editingId && editingValue.trim()) {
      renameTab(editingId, editingValue.trim());
    }
    setEditingId(null);
  }

  async function handleRemove(e, id) {
    e.stopPropagation();
    if (snapshot.tabs.length <= 1) return;
    const ok = await requestConfirm("Bu flow sekmesini ve icindeki tum node'lari silmek istedigine emin misin?", 'danger');
    if (!ok) return;
    removeTab(id);
    onTabChanged?.(null);
  }

  return (
    <div className="tabs-bar">
      {snapshot.tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tabs-bar-item${tab.id === snapshot.activeTabId ? ' tabs-bar-item-active' : ''}`}
          onClick={() => handleSwitch(tab.id)}
          onDoubleClick={() => startRename(tab)}
          title="Cift tikla: yeniden adlandir"
        >
          {editingId === tab.id ? (
            <input
              autoFocus
              className="tabs-bar-rename-input"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="tabs-bar-label">{tab.name}</span>
          )}
          {snapshot.tabs.length > 1 && (
            <button className="tabs-bar-close" onClick={(e) => handleRemove(e, tab.id)} title="Sekmeyi sil">
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      ))}
      <button className="tabs-bar-add" onClick={handleAdd} title="Yeni flow sekmesi">
        <Plus size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}
