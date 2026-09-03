import React, { useState } from 'react';
import {
  Plus,
  LayoutTemplate,
  Database,
  Wrench,
  ChevronDown,
  Play,
  Square,
  Upload,
  Download,
  Copy,
  LayoutGrid,
  Bug,
  Undo2,
  Redo2,
  RotateCcw,
  CloudUpload
} from 'lucide-react';
import { useFlow, useFlowActions, useUndoState } from '../../flows/FlowContext';
import ExportCheckModal from './ExportCheckModal';
import { requestAlert } from '../../flows/utils/dialogService';

// aXet.flows Designer'daki GERCEK Deploy dropdown secenekleri (editor-client
// locales/en-US/editor.json "deploy" bolumunden birebir alindi - label/aciklama
// metinleri kaynaktaki ingilizce orijinal metin, uydurma yok).
const DEPLOY_MODES = [
  { mode: 'full', label: 'Full', desc: 'Deploys everything in the workspace' },
  { mode: 'modified-flows', label: 'Modified Flows', desc: 'Only deploys flows that contain changed nodes' },
  { mode: 'modified-nodes', label: 'Modified Nodes', desc: 'Only deploys nodes that have changed' }
];

// Toolbar — referans görseldeki üst çubuk düzenine göre kuruldu: sol grup
// [+ Yeni Flow (birincil)] [Şablonlar] [Data▾ (Import/Export)] [Tools▾
// (Undo/Redo/Restart)] [Run (deploy, split mod menüsü)]; sağ grup [Kopyala]
// [Auto Layout] [Debug]. Flow sekmeleri (TabsBar) burada DEĞİL — kullanıcı
// isteğiyle canvas'ın ÜSTÜNDE kendi ayrı paneli olarak duruyor (bkz.
// AppShell.jsx `app-center-col` içindeki `TabsBar`). Deploy/Restart/Stop
// mantığı önceki turda WorkflowHeader.jsx'te yaşıyordu — kaldırılan
// WorkflowHeader'ın tüm deploy sorumluluğu buraya taşındı (bkz.
// PROJE-BILGI.md "axet.flows Layout Yeniden Düzenlemesi").
export default function Toolbar({
  onNewFlow,
  onOpenTemplates,
  debugOpen,
  onToggleDebug,
  debugErrorCount,
  runtimeStatus,
  deploying,
  onDeploy,
  onRestart,
  onStopDeploy
}) {
  const { model } = useFlow();
  const { importFlow, autoLayout, undo, redo } = useFlowActions();
  const { canUndo, canRedo } = useUndoState();
  const [exportCheck, setExportCheck] = useState(null);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const [lastMode, setLastMode] = useState('full');
  const [savingToLive, setSavingToLive] = useState(false);

  const isRunning = Boolean(runtimeStatus?.running);

  async function runExportCheck(flowArray, targetLabel, proceed) {
    try {
      const result = await window.api.flowsValidate(flowArray);
      const issues = result?.issues || [];
      if (issues.length === 0) {
        await proceed();
        return;
      }
      setExportCheck({ issues, blocking: Boolean(result.blocking), targetLabel, proceed });
    } catch {
      // Validasyon calisamiyorsa (beklenmedik hata) kullaniciyi bloke etmeyip devam ettiriyoruz.
      await proceed();
    }
  }

  async function handleExport(withTab) {
    const flowArray = withTab ? model.toArray() : model.toDeployArray();
    await runExportCheck(flowArray, 'Dışa Aktar', async () => {
      const json = JSON.stringify(flowArray, null, 2);
      const res = await window.api.flowsSaveJson(json);
      if (!res.canceled) {
        // eslint-disable-next-line no-console
        console.log('Flow kaydedildi:', res.filePath);
      }
    });
  }

  async function handleCopy(withTab) {
    const flowArray = withTab ? model.toArray() : model.toDeployArray(model.activeTabId);
    await runExportCheck(flowArray, 'Panoya Kopyala', async () => {
      const json = JSON.stringify(flowArray, null, 2);
      await navigator.clipboard.writeText(json);
    });
  }

  async function handleSaveToLive() {
    const tabMeta = model.tabs.find((t) => t.id === model.activeTabId);
    if (!tabMeta) {
      await requestAlert('Kaydedilecek aktif bir flow sekmesi yok.');
      return;
    }
    // toDeployArray(tabId) sadece o tab'a AIT node'lari + config node'lari
    // dondurur, tab'in KENDISINI (type:'tab' node'unu) icermez — gercek
    // Node-RED host'unda bu flow'un sekme olarak gorunmesi icin onu burada
    // AYNI sekilde (bkz. FlowModel.toArray()) elle ekliyoruz.
    const tabNode = { id: tabMeta.id, type: 'tab', label: tabMeta.name, disabled: false, info: tabMeta.description || '', env: [] };
    const flowArray = [tabNode, ...model.toDeployArray(model.activeTabId)];
    await runExportCheck(flowArray, "Cloud'a Kaydet", async () => {
      setSavingToLive(true);
      try {
        const res = await window.api.saveFlowToLiveHost(flowArray);
        if (!res.ok) {
          await requestAlert(`Canlıya kaydedilemedi: ${res.error || 'Bilinmeyen hata.'}`);
        }
      } finally {
        setSavingToLive(false);
      }
    });
  }

  async function handleImport() {
    const res = await window.api.flowsOpenJson();
    if (res.canceled) return;
    try {
      const arr = JSON.parse(res.content);
      importFlow(arr);
    } catch (err) {
      await requestAlert(`JSON okunamadı: ${err.message}`);
    }
  }

  function runDeploy(mode) {
    setLastMode(mode);
    setDeployMenuOpen(false);
    onDeploy?.(mode);
  }

  function runRestart() {
    setDeployMenuOpen(false);
    onRestart?.();
  }

  return (
    <div className="toolbar">
      <button className="toolbar-btn-primary" onClick={onNewFlow}>
        <Plus size={14} strokeWidth={2.5} />
        Yeni Flow
      </button>

      <div className="toolbar-actions toolbar-actions-center">
        <div className="toolbar-group">
          <button onClick={onOpenTemplates}>
            <LayoutTemplate size={13} />
            Şablonlar
          </button>
        </div>

        <div className="toolbar-dropdown-wrap" onMouseLeave={() => setDataMenuOpen(false)}>
          <button className="toolbar-dropdown-trigger" onClick={() => setDataMenuOpen((o) => !o)}>
            <Database size={13} />
            Data
            <ChevronDown size={11} className={dataMenuOpen ? 'toolbar-caret-open' : ''} />
          </button>
          {dataMenuOpen && (
            <div className="toolbar-dropdown-menu">
              <button
                className="toolbar-dropdown-item"
                onClick={() => {
                  setDataMenuOpen(false);
                  handleImport();
                }}
              >
                <Upload size={13} />
                Import
              </button>
              <button
                className="toolbar-dropdown-item"
                onClick={() => {
                  setDataMenuOpen(false);
                  handleExport(true);
                }}
              >
                <Download size={13} />
                Export
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-dropdown-wrap" onMouseLeave={() => setToolsMenuOpen(false)}>
          <button className="toolbar-dropdown-trigger" onClick={() => setToolsMenuOpen((o) => !o)}>
            <Wrench size={13} />
            Tools
            <ChevronDown size={11} className={toolsMenuOpen ? 'toolbar-caret-open' : ''} />
          </button>
          {toolsMenuOpen && (
            <div className="toolbar-dropdown-menu">
              <button
                className="toolbar-dropdown-item"
                disabled={!canUndo}
                onClick={() => {
                  setToolsMenuOpen(false);
                  undo();
                }}
              >
                <Undo2 size={13} />
                Geri Al
              </button>
              <button
                className="toolbar-dropdown-item"
                disabled={!canRedo}
                onClick={() => {
                  setToolsMenuOpen(false);
                  redo();
                }}
              >
                <Redo2 size={13} />
                Yinele
              </button>
              <button
                className="toolbar-dropdown-item"
                disabled={!isRunning}
                onClick={() => {
                  setToolsMenuOpen(false);
                  runRestart();
                }}
                title="Restarts the current deployed flows"
              >
                <RotateCcw size={13} />
                Restart Flows
              </button>
            </div>
          )}
        </div>

        <span className="toolbar-sep" />

        <div className="toolbar-run-group">
          <div className={`toolbar-run-split${isRunning ? ' toolbar-run-split-active' : ''}`}>
            <button
              className="toolbar-run-main"
              onClick={() => runDeploy(lastMode)}
              disabled={deploying}
              title={`${DEPLOY_MODES.find((m) => m.mode === lastMode)?.desc ?? ''}${
                isRunning ? ` · Calisiyor${runtimeStatus?.port ? ` (port ${runtimeStatus.port})` : ''}` : ''
              }`}
            >
              {deploying ? (
                'Deploy ediliyor...'
              ) : (
                <>
                  <Play size={12} fill={isRunning ? 'currentColor' : 'none'} />
                  Run
                </>
              )}
            </button>
            <button
              className="toolbar-run-caret"
              onClick={() => setDeployMenuOpen((o) => !o)}
              disabled={deploying}
              title="Deploy secenekleri"
            >
              <ChevronDown size={12} />
            </button>
            {deployMenuOpen && (
              <div className="deploy-menu" onMouseLeave={() => setDeployMenuOpen(false)}>
                {DEPLOY_MODES.map((m) => (
                  <button key={m.mode} className="deploy-menu-item" onClick={() => runDeploy(m.mode)}>
                    <span className="deploy-menu-item-label">{m.label}</span>
                    <span className="deploy-menu-item-desc">{m.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {isRunning && (
            <button className="toolbar-run-stop" onClick={onStopDeploy} disabled={deploying} title="Durdur">
              <Square size={12} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      <div className="toolbar-actions toolbar-actions-right">
        <button
          onClick={handleSaveToLive}
          disabled={savingToLive}
          title="Bu flow'u, aynı makinede çalışan gerçek aXet.flows (Canlı) uygulamasına kaydet"
        >
          <CloudUpload size={13} />
          {savingToLive ? 'Kaydediliyor...' : "Cloud'a Kaydet"}
        </button>
        <button onClick={() => handleCopy(false)} title="aXet.flows Designer'a Ctrl+I ile yapıştırmak için (aktif sekme)">
          <Copy size={13} />
          Kopyala
        </button>
        <button onClick={autoLayout} title="Aktif sekmedeki node'ları otomatik düzenle">
          <LayoutGrid size={13} />
          Auto Layout
        </button>
        <button className={`debug-toggle-btn${debugOpen ? ' debug-toggle-btn-active' : ''}`} onClick={onToggleDebug}>
          <Bug size={13} />
          Debug
          {debugErrorCount > 0 && <span className="debug-toggle-badge">{debugErrorCount}</span>}
        </button>
      </div>

      {exportCheck && (
        <ExportCheckModal
          issues={exportCheck.issues}
          blocking={exportCheck.blocking}
          targetLabel={exportCheck.targetLabel}
          onCancel={() => setExportCheck(null)}
          onProceed={async () => {
            const proceed = exportCheck.proceed;
            setExportCheck(null);
            await proceed();
          }}
        />
      )}
    </div>
  );
}
