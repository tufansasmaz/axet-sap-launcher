import React, { useState } from 'react';
import { ArrowLeft, Layers } from 'lucide-react';
import { useFlowSnapshot, useFlowActions } from '../../flows/FlowContext';
import { requestPrompt } from '../../flows/utils/dialogService';

// Canvas'ın üstünde YÜZEN, sadece gerektiğinde görünen ince bir bilgi çubuğu.
// Önceki turda tüm bunlar sabit bir "WorkflowHeader" şeridinde (canvas'ın
// HER ZAMAN üstünde, tab adı/açıklama/deploy durumu dahil) gösteriliyordu —
// referans görselde böyle bir şerit YOK, canvas doğrudan sekmelerin altında
// başlıyor. Deploy/Restart/Stop artık Toolbar.jsx'e taşındı (bkz. o dosya);
// burada SADECE canvas'a özgü, bağlamsal iki durum kalıyor: (1) bir subflow
// düzenlerken "◀ Sekmeye dön" breadcrumb'ı, (2) 2+ node seçiliyken "Subflow'a
// Çevir" kısayolu (aynı işlev FlowCanvas.jsx'in sağ-tık menüsünde de var,
// burası sadece daha görünür/hızlı bir alternatif).
export default function CanvasOverlayBar({ selectedIds, onConverted }) {
  const snapshot = useFlowSnapshot();
  const { exitSubflow, createSubflowFromSelection } = useFlowActions();
  const [converting, setConverting] = useState(false);

  const isSubflow = snapshot.activeContainerKind === 'subflow';
  const activeSubflow = isSubflow ? snapshot.subflows.find((s) => s.id === snapshot.activeContainerId) : null;
  const showConvert = selectedIds.length >= 2;

  async function handleConvert() {
    setConverting(true);
    try {
      const name = await requestPrompt('Yeni subflow adi:', 'Subflow');
      if (name === null) return;
      const result = createSubflowFromSelection(selectedIds, name.trim() || undefined);
      onConverted?.(result?.instanceId || null);
    } finally {
      setConverting(false);
    }
  }

  if (!isSubflow && !showConvert) return null;

  return (
    <div className="canvas-overlay-bar">
      {isSubflow && (
        <button className="canvas-breadcrumb-back" onClick={exitSubflow}>
          <ArrowLeft size={13} />
          Sekmeye dön
          {activeSubflow?.name && <span className="canvas-breadcrumb-label"> · {activeSubflow.name}</span>}
        </button>
      )}
      {showConvert && (
        <button className="canvas-convert-btn" onClick={handleConvert} disabled={converting}>
          <Layers size={13} />
          {selectedIds.length} node seçili → Subflow'a Çevir
        </button>
      )}
    </div>
  );
}
