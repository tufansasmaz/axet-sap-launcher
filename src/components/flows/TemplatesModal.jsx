import React from 'react';
import { TEMPLATES } from '../../flows/templates.js';
import { useFlowActions } from '../../flows/FlowContext';

function groupByCategory(templates) {
  const groups = {};
  templates.forEach((t) => {
    const cat = t.category || 'Diger';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  });
  return groups;
}

export default function TemplatesModal({ onClose, onApplied }) {
  const { applyTemplateInNewTab } = useFlowActions();
  const groups = groupByCategory(TEMPLATES);

  function handleApply(templateId) {
    const tabId = applyTemplateInNewTab(templateId);
    onApplied?.(tabId);
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <h2>Hizli Baslangic Sablonlari</h2>
        <p className="modal-hint">
          Bir sablon secince yeni bir flow sekmesinde, gercek aXet.flows node/config'leriyle hazir
          kurulmus halde acilir; sonra ihtiyacina gore duzenlersin.
        </p>
        <div className="templates-scroll">
          {Object.entries(groups).map(([cat, templates]) => (
            <div key={cat} className="templates-group">
              <div className="templates-group-title">{cat}</div>
              {templates.map((t) => (
                <div key={t.id} className="template-card">
                  <div className="template-card-name">{t.name}</div>
                  <div className="template-card-desc">{t.description}</div>
                  <button className="template-card-btn" onClick={() => handleApply(t.id)}>
                    Yeni Sekmede Ekle
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
