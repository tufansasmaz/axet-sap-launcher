import React from 'react';
import { Plus } from 'lucide-react';
import { useFlowSnapshot, useFlowActions, useFlow } from '../../flows/FlowContext';
import { requestPrompt, requestConfirm } from '../../flows/utils/dialogService';

export default function SubflowsPanel({ onEnterSubflow }) {
  const snapshot = useFlowSnapshot();
  const { model } = useFlow();
  const { createSubflow, renameSubflow, editSubflow, removeSubflow } = useFlowActions();

  async function handleCreate() {
    const name = await requestPrompt('Yeni subflow adi:', `Subflow ${snapshot.subflows.length + 1}`);
    if (name === null) return;
    const id = createSubflow(name.trim() || undefined);
    onEnterSubflow?.(id);
  }

  async function handleRename(sf) {
    const name = await requestPrompt('Yeni ad:', sf.name);
    if (name === null || !name.trim()) return;
    renameSubflow(sf.id, name.trim());
  }

  function handleEdit(sf) {
    editSubflow(sf.id);
    onEnterSubflow?.(sf.id);
  }

  async function handleRemove(sf) {
    const count = model.instanceCountFor(sf.id);
    const warning =
      count > 0
        ? `Bu subflow'un ${count} yerde kullanimi var. Silersen o instance'lar bozuk kalir. Silmek istedigine emin misin?`
        : `"${sf.name}" subflow'unu silmek istedigine emin misin?`;
    const ok = await requestConfirm(warning, 'danger');
    if (!ok) return;
    removeSubflow(sf.id);
  }

  return (
    <div className="subflow-panel">
      <div className="subflow-panel-title">
        Subflow'lar ({snapshot.subflows.length})
        <button className="subflow-panel-add" onClick={handleCreate} title="Yeni subflow">
          <Plus size={12} strokeWidth={2.5} />
        </button>
      </div>
      {snapshot.subflows.length === 0 && <div className="subflow-panel-empty">Henuz subflow yok.</div>}
      <ul className="subflow-panel-list">
        {snapshot.subflows.map((sf) => (
          <li key={sf.id} className={sf.id === snapshot.activeContainerId ? 'subflow-panel-item-active' : ''}>
            <span className="subflow-dot" />
            <span className="subflow-name" onDoubleClick={() => handleRename(sf)} title="Cift tikla: yeniden adlandir">
              {sf.name}
            </span>
            <button className="subflow-panel-btn" onClick={() => handleEdit(sf)} title="Duzenle">
              Ac
            </button>
            <button className="subflow-panel-btn subflow-panel-btn-danger" onClick={() => handleRemove(sf)} title="Sil">
              Sil
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
