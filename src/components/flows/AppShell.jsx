import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import FlowCanvas from './FlowCanvas';
import CanvasOverlayBar from './CanvasOverlayBar';
import RightPanel from './RightPanel';
import NodePalette from './NodePalette';
import DebugPanel from './DebugPanel';
import RunsView from './RunsView';
import TestRequestModal from './TestRequestModal';
import Toolbar from './Toolbar';
import TabsBar from './TabsBar';
import TemplatesModal from './TemplatesModal';
import DialogHost from './DialogHost';
import { useFlow, useFlowActions } from '../../flows/FlowContext';
import { createExecutor } from '../../flows/agent/tools';
import { runAgentTurn, createTranscript } from '../../flows/agent/agentRunner';

const MAX_DEBUG_ENTRIES = 400;
const MAX_TRACE_EVENTS = 1000;
const DEFAULT_PALETTE_WIDTH = 200;
const MIN_PALETTE_WIDTH = 160;
const MAX_PALETTE_WIDTH = 340;
const DEFAULT_RIGHT_PANEL_WIDTH = 270;
const MIN_RIGHT_PANEL_WIDTH = 220;
const MAX_RIGHT_PANEL_WIDTH = 420;

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

// aXet.flows AI Builder'ın kök ekranı — kullanıcının verdiği referans
// görsele (Zapier/Node-RED tarzı flow builder — sol sabit node paleti,
// ortada canvas, sağda sekmeli Bilgi/İstatistikler/Özellikler paneli, altta
// tam genişlik "Flow Builder Agent" sohbet dock'u + kategori lejantı) göre
// YENİDEN DÜZENLENDİ (bkz. PROJE-BILGI.md "axet.flows Layout Yeniden
// Düzenlemesi"). Önceki turdaki WorkflowHeader (sabit deploy/başlık şeridi)
// ve WorkflowSidebar (ayrı sabit sütun) bileşenleri KALDIRILDI — deploy
// Toolbar'a, metadata/istatistikler RightPanel'in sekmelerine taşındı.
export default function AppShell() {
  const { model: flowModel, bump } = useFlow();
  const flowActions = useFlowActions();
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [runtimeStatus, setRuntimeStatus] = useState({ running: false, port: null });
  const [deploying, setDeploying] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEntries, setDebugEntries] = useState([]);
  const [traceEvents, setTraceEvents] = useState([]);
  const [validation, setValidation] = useState(null);
  const [testEndpointNode, setTestEndpointNode] = useState(null);
  const [focusChainId, setFocusChainId] = useState(null);
  const [runsViewOpen, setRunsViewOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState(null);
  const [currentModel, setCurrentModel] = useState(null);
  const [paletteWidth, setPaletteWidth] = useState(DEFAULT_PALETTE_WIDTH);
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_RIGHT_PANEL_WIDTH);
  const transcriptRef = useRef(createTranscript());
  const executorRef = useRef(createExecutor(flowModel, bump));
  const selectedIdsRef = useRef(selectedIds);
  const selectedIdRef = useRef(selectedId);
  const modelRef = useRef(null);
  selectedIdsRef.current = selectedIds;
  selectedIdRef.current = selectedId;
  modelRef.current = currentModel ? `${currentModel.provider}/${currentModel.model}` : '';

  useEffect(() => {
    window.api.flowsGetRuntimeStatus().then((status) => setRuntimeStatus(status));
  }, []);

  // Model seçimi axet.code sohbet ekranıyla AYNI paylaşılan varsayılan
  // modeli (axet-code.json'daki "large" modeli) kullanır - `ChatPanel`'in
  // kendi dock başlığında (axet.code sohbetindeki composer barıyla AYNI
  // desen) gösterilir, ayrı bir sayfa-seviyesi başlık çubuğu YOK.
  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    Promise.all([window.api.listAxetModels(), window.api.getAxetModelConfig()]).then(
      ([modelsResult, configResult]) => {
        if (cancelled) return;
        if (modelsResult.ok) {
          setModels(modelsResult.models);
          setModelsError(null);
        } else {
          setModelsError(modelsResult.error ?? null);
        }
        if (configResult.ok && configResult.config) {
          setCurrentModel(configResult.config.large);
        }
        setModelsLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectModel = useCallback(async (entry) => {
    const result = await window.api.setAxetModel('large', entry);
    if (result.ok) setCurrentModel(entry);
  }, []);

  // Sol/sağ panel genişliklerini sürükleyerek değiştirme — App.tsx'teki
  // `handleSidebarResizeStart` ile BİREBİR AYNI desen (mousedown başlangıç
  // x/genişliği kaydeder, window mousemove ile delta hesaplar, min/max'a
  // clamp'ler, mouseup'ta listener'ları temizler).
  const handlePaletteResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = paletteWidth;
      const onMove = (ev) => {
        const delta = ev.clientX - startX;
        setPaletteWidth(Math.min(MAX_PALETTE_WIDTH, Math.max(MIN_PALETTE_WIDTH, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [paletteWidth]
  );

  const handleRightPanelResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = rightPanelWidth;
      const onMove = (ev) => {
        const delta = startX - ev.clientX;
        setRightPanelWidth(Math.min(MAX_RIGHT_PANEL_WIDTH, Math.max(MIN_RIGHT_PANEL_WIDTH, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [rightPanelWidth]
  );

  useEffect(() => {
    const offDebug = window.api.onFlowsRuntimeDebug((entry) => {
      setDebugEntries((prev) => {
        const next = [...prev, { ...entry, kind: 'debug' }];
        return next.length > MAX_DEBUG_ENTRIES ? next.slice(next.length - MAX_DEBUG_ENTRIES) : next;
      });
    });
    const offLog = window.api.onFlowsRuntimeLog((entry) => {
      setDebugEntries((prev) => {
        const next = [...prev, { ...entry, kind: 'log' }];
        return next.length > MAX_DEBUG_ENTRIES ? next.slice(next.length - MAX_DEBUG_ENTRIES) : next;
      });
    });
    const offStatus = window.api.onFlowsRuntimeStatus((status) => setRuntimeStatus(status));
    const offTrace = window.api.onFlowsRuntimeTrace((entry) => {
      setTraceEvents((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_TRACE_EVENTS ? next.slice(next.length - MAX_TRACE_EVENTS) : next;
      });
    });
    return () => {
      offDebug?.();
      offLog?.();
      offStatus?.();
      offTrace?.();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (isTypingTarget(document.activeElement)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        flowActions.undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        flowActions.redo();
      } else if (key === 'c') {
        const ids = selectedIdsRef.current.length ? selectedIdsRef.current : selectedIdRef.current ? [selectedIdRef.current] : [];
        if (ids.length) {
          e.preventDefault();
          flowActions.copySelection(ids);
        }
      } else if (key === 'v') {
        e.preventDefault();
        flowActions.pasteClipboard();
      } else if (key === 'd') {
        const ids = selectedIdsRef.current.length ? selectedIdsRef.current : selectedIdRef.current ? [selectedIdRef.current] : [];
        if (ids.length) {
          e.preventDefault();
          flowActions.duplicateSelection(ids);
        }
      } else if (key === 'l' && e.altKey) {
        // aXet.flows/Node-RED gercek kisayolu: Ctrl+Alt+L = "core:clear-debug-messages"
        // (packages/node_modules/@node-red/editor-client/public/red/keymap.json).
        e.preventDefault();
        handleClearDebug();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flowActions]);

  function pushLog(entry) {
    setChatLog((prev) => [...prev, { ...entry, ts: Date.now() }]);
  }

  async function handleSend(userMessage) {
    if (busy) return;
    setBusy(true);
    try {
      const selected = selectedId ? flowModel.nodesById[selectedId] : null;
      const uiContext = {
        selectedNode: selected ? { id: selected.id, type: selected.type, name: selected.name || undefined } : null,
        selectedCount: selectedIds.length,
        validationIssues: validation?.issues?.length ? validation.issues.slice(0, 5) : undefined
      };
      await runAgentTurn({
        flowModel,
        model: modelRef.current,
        transcript: transcriptRef.current,
        userMessage,
        uiContext,
        executeTool: (name, args) => executorRef.current(name, args),
        onEvent: pushLog
      });
    } finally {
      setBusy(false);
    }
  }

  function handleNewFlow() {
    flowActions.resetFlow();
    transcriptRef.current = createTranscript();
    setChatLog([]);
    setSelectedId(null);
    setSelectedIds([]);
  }

  function handleContainerChanged() {
    setSelectedId(null);
    setSelectedIds([]);
  }

  // aXet.flows Designer'daki gercek Deploy dropdown semantigine gore ("Full" =
  // "Deploys everything in the workspace" - editor-client locales/en-US/
  // editor.json'dan dogrulandi): Deploy her zaman TUM workspace'i (tum
  // tab'lar + config node'lar) gonderir, sadece aktif tab'i degil - onceden
  // burasi hatali sekilde SADECE aktif tab'i deploy ediyordu. mode parametresi
  // ("full" | "modified-flows" | "modified-nodes") sadece runtime tarafinda
  // GERCEK bir diff hesaplayip loglamak icin kullanilir (bkz. flowRuntime.js
  // _diffSummary) - bu basit motor tek parca calistigi icin secici/kismi
  // redeploy YAPMAZ, bunu uydurmuyoruz.
  async function handleDeploy(mode = 'full') {
    setDeploying(true);
    setValidation(null);
    try {
      const flowArray = flowModel.toDeployArray();
      const result = await window.api.flowsDeploy(flowArray, mode);
      if (result.issues) {
        setValidation({ blocking: result.blocked, issues: result.issues });
      }
      if (!result.ok && !result.blocked) {
        setDebugEntries((prev) => [
          ...prev,
          { kind: 'log', level: 'error', text: `Deploy basarisiz: ${result.error}`, timestamp: Date.now() }
        ]);
      }
      setDebugOpen(true);
    } finally {
      setDeploying(false);
    }
  }

  // aXet.flows Designer'daki "Restart Flows" ("Restarts the current deployed
  // flows") - flow'da HICBIR degisiklik yapmadan son deploy edilen ayni
  // array'i tekrar baslatir.
  async function handleRestart() {
    setDeploying(true);
    try {
      const result = await window.api.flowsRestart();
      if (!result.ok) {
        setDebugEntries((prev) => [
          ...prev,
          { kind: 'log', level: 'error', text: `Restart basarisiz: ${result.error}`, timestamp: Date.now() }
        ]);
        setDebugOpen(true);
      }
    } finally {
      setDeploying(false);
    }
  }

  async function handleStopDeploy() {
    await window.api.flowsStop();
  }

  const handleTriggerInject = useCallback(async (nodeId) => {
    const result = await window.api.flowsTriggerInject(nodeId);
    if (!result.ok) {
      setDebugEntries((prev) => [
        ...prev,
        { kind: 'log', level: 'error', text: `Manuel tetikleme basarisiz: ${result.error}`, timestamp: Date.now() }
      ]);
      setDebugOpen(true);
    }
  }, []);

  const handleTestEndpoint = useCallback((node) => {
    setTestEndpointNode(node);
  }, []);

  function handleClearDebug() {
    setDebugEntries([]);
    setTraceEvents([]);
  }

  const handleOpenDebugChain = useCallback((chainId) => {
    setFocusChainId(chainId || null);
    setDebugOpen(true);
  }, []);

  const handleOpenChainFromRunsView = useCallback((chainId) => {
    setRunsViewOpen(false);
    setFocusChainId(chainId || null);
    setDebugOpen(true);
  }, []);

  function handleFixWithAI(entry) {
    const nodeLabel = entry.nodeName || entry.nodeId || 'bilinmeyen node';
    const errorMessage =
      entry.errorMessage ||
      entry.payload?.error ||
      (typeof entry.payload === 'string' ? entry.payload : JSON.stringify(entry.payload || {}));
    const causeLine = entry.cause ? `\nOlasi sebep: ${entry.cause}` : '';
    const suggestionLine = entry.suggestion ? `\nOneri: ${entry.suggestion}` : '';
    const prompt = `Deploy edilen flow'da "${nodeLabel}" (id: ${entry.nodeId}, tip: ${entry.nodeType}) node'unda bir sorun tespit edildi:\n\n${errorMessage}${causeLine}${suggestionLine}\n\nBu node'u incele (get_flow ile mevcut config'ini kontrol et) ve sorunu giderecek sekilde update_node ile duzelt.`;
    handleSend(prompt);
  }

  // Not: bir runtime hatasi hem traceEvents'te (kind:'step', status:'error')
  // hem debugEntries'te (onDebug error:true) gorunur - aynı hatanin iki
  // temsili oldugu icin badge sayisinda İKİSİNİ BİRDEN saymıyoruz (cift
  // sayim). "Kac akis hatayla durdu" (benzersiz chainId) + deploy-oncesi
  // kritik sorun sayisi en anlamli ozet.
  const erroredChainIds = useMemo(
    () =>
      new Set(
        traceEvents
          .filter((e) => (e.kind === 'step' && e.status === 'error') || e.kind === 'chain-timeout')
          .map((e) => e.chainId)
      ),
    [traceEvents]
  );
  const blockingIssueCount = validation?.issues?.filter((i) => i.severity === 'error').length || 0;
  const debugErrorCount = erroredChainIds.size + blockingIssueCount;

  return (
    <div className="app-shell app-shell-embedded">
      <Toolbar
        onNewFlow={handleNewFlow}
        onOpenTemplates={() => setTemplatesOpen(true)}
        debugOpen={debugOpen}
        onToggleDebug={() => setDebugOpen((o) => !o)}
        debugErrorCount={debugErrorCount}
        runtimeStatus={runtimeStatus}
        deploying={deploying}
        onDeploy={handleDeploy}
        onRestart={handleRestart}
        onStopDeploy={handleStopDeploy}
      />
      <div className="app-main-row">
        <NodePalette width={paletteWidth} onNodeAdded={(id) => setSelectedId(id)} />
        <div className="flows-resize-handle" onMouseDown={handlePaletteResizeStart} title="Genişliği değiştir" />
        <div className="app-center-col">
          <TabsBar onTabChanged={handleContainerChanged} />
          <div className="app-canvas-area">
            <CanvasOverlayBar selectedIds={selectedIds} onConverted={handleContainerChanged} />
            <FlowCanvas
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelect={setSelectedId}
              onSelectionChange={setSelectedIds}
              onConverted={handleContainerChanged}
              runtimeStatus={runtimeStatus}
              traceEvents={traceEvents}
              onTriggerInject={handleTriggerInject}
              onTestEndpoint={handleTestEndpoint}
            />
          </div>
          <DebugPanel
            open={debugOpen}
            validation={validation}
            traceEvents={traceEvents}
            entries={debugEntries}
            onClear={handleClearDebug}
            onFixWithAI={handleFixWithAI}
            onClose={() => setDebugOpen(false)}
            focusChainId={focusChainId}
            onFocusHandled={() => setFocusChainId(null)}
          />
        </div>
        <div className="flows-resize-handle" onMouseDown={handleRightPanelResizeStart} title="Genişliği değiştir" />
        <RightPanel
          width={rightPanelWidth}
          traceEvents={traceEvents}
          onOpenDebug={handleOpenDebugChain}
          onOpenRunsView={() => setRunsViewOpen(true)}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDeleted={() => setSelectedId(null)}
          onEnterSubflow={handleContainerChanged}
          chatLog={chatLog}
          chatBusy={busy}
          onChatSend={handleSend}
          models={models}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          currentModel={currentModel}
          onSelectModel={handleSelectModel}
        />
      </div>
      {templatesOpen && (
        <TemplatesModal onClose={() => setTemplatesOpen(false)} onApplied={handleContainerChanged} />
      )}
      {testEndpointNode && <TestRequestModal node={testEndpointNode} onClose={() => setTestEndpointNode(null)} />}
      {runsViewOpen && (
        <RunsView
          traceEvents={traceEvents}
          onClose={() => setRunsViewOpen(false)}
          onOpenChain={handleOpenChainFromRunsView}
        />
      )}
      <DialogHost />
    </div>
  );
}
