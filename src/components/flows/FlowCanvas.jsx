import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, ConnectionLineType, Controls, MiniMap, ReactFlowProvider, useReactFlow, applyNodeChanges } from 'reactflow';
import 'reactflow/dist/style.css';
import FlowNode from './FlowNode';
import QuickAddMenu from './QuickAddMenu';
import NodeContextMenu from './NodeContextMenu';
import { useFlowSnapshot, useFlowActions } from '../../flows/FlowContext';
import { isConfigType, defaultConfigFor, getNodeValidationIssues } from '../../flows/nodeCatalog';
import { computeActiveEdgeKeys } from '../../flows/utils/executionStats';
import { requestPrompt } from '../../flows/utils/dialogService';

const nodeTypes = { flowNode: FlowNode };
const DRAG_MIME = 'application/axetflow-node';
const ACTIVE_EDGE_TICK_MS = 1000;

function parseOutputIndex(handleId) {
  if (!handleId) return 0;
  const match = /^out-(\d+)$/.exec(handleId);
  return match ? Number(match[1]) : 0;
}

function buildNodeContextMenuItems({
  nodeId,
  selectedIds,
  selectedId,
  onSelect,
  removeNodes,
  copySelection,
  duplicateSelection,
  createSubflowFromSelection,
  onConverted
}) {
  const currentSelection = selectedIds && selectedIds.length ? selectedIds : selectedId ? [selectedId] : [];
  const effectiveIds = currentSelection.includes(nodeId) && currentSelection.length > 1 ? currentSelection : [nodeId];
  const multi = effectiveIds.length > 1;

  return [
    {
      key: 'copy',
      label: multi ? `${effectiveIds.length} node'u Kopyala` : 'Kopyala',
      onClick: () => copySelection(effectiveIds)
    },
    {
      key: 'duplicate',
      label: multi ? `${effectiveIds.length} node'u Coğalt` : 'Coğalt',
      onClick: () => {
        const newIds = duplicateSelection(effectiveIds);
        if (newIds && newIds.length === 1) onSelect?.(newIds[0]);
      }
    },
    { separator: true },
    {
      key: 'subflow',
      label: multi ? `${effectiveIds.length} node'u Subflow'a Çevir` : "Subflow'a Çevir (en az 2 node secin)",
      disabled: !multi,
      onClick: async () => {
        if (!multi) return;
        const name = await requestPrompt('Yeni subflow adi:', 'Subflow');
        if (name === null) return;
        const result = createSubflowFromSelection(effectiveIds, name.trim() || undefined);
        onConverted?.(result?.instanceId || null);
      }
    },
    { separator: true },
    {
      key: 'delete',
      label: multi ? `${effectiveIds.length} node'u Sil` : 'Sil',
      danger: true,
      onClick: () => {
        removeNodes(effectiveIds);
        if (selectedId && effectiveIds.includes(selectedId)) onSelect?.(null);
      }
    }
  ];
}

function FlowCanvasInner({
  selectedId,
  selectedIds,
  onSelect,
  onSelectionChange,
  onConverted,
  runtimeStatus,
  traceEvents,
  onTriggerInject,
  onTestEndpoint
}) {
  const snapshot = useFlowSnapshot();
  const {
    connect,
    disconnectMany,
    removeNodes,
    moveNodes,
    addNode,
    copySelection,
    duplicateSelection,
    createSubflowFromSelection
  } = useFlowActions();
  const { project } = useReactFlow();
  const wrapperRef = useRef(null);
  const [quickAdd, setQuickAdd] = useState(null);
  const [nodeContextMenu, setNodeContextMenu] = useState(null);
  const [tick, setTick] = useState(0);

  // Deploy sirasinda aktif path'ler akiyor gorunsun: her 1sn'de bir "tick"
  // ilerleterek activeEdgeKeys memo'sunu yeniden hesaplatiyoruz - boylece bir
  // adim gerceklestikten ACTIVE_EDGE_WINDOW_MS sonra edge otomatik olarak
  // "duraga" doner (yeni traceEvent gelmese bile).
  useEffect(() => {
    if (!runtimeStatus?.running) return;
    const id = setInterval(() => setTick((t) => t + 1), ACTIVE_EDGE_TICK_MS);
    return () => clearInterval(id);
  }, [runtimeStatus?.running]);

  const activeEdgeKeys = useMemo(
    () => computeActiveEdgeKeys(traceEvents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [traceEvents, tick]
  );

  const usableSubflows = useMemo(
    () => snapshot.subflows.filter((sf) => sf.id !== snapshot.activeContainerId),
    [snapshot.subflows, snapshot.activeContainerId]
  );

  const subflowNameById = useMemo(() => {
    const map = {};
    snapshot.subflows.forEach((sf) => {
      map[sf.id] = sf.name;
    });
    return map;
  }, [snapshot.subflows]);

  const { nodes: modelNodes, edges } = useMemo(() => {
    const canvasIdSet = new Set(
      snapshot.order.filter(
        (id) => !isConfigType(snapshot.nodesById[id]?.type) && snapshot.nodesById[id]?.z === snapshot.activeContainerId
      )
    );
    const canvasIds = Array.from(canvasIdSet);
    const nodes = canvasIds.map((id) => {
      const raw = snapshot.nodesById[id];
      let subflowName;
      if (typeof raw.type === 'string' && raw.type.startsWith('subflow:')) {
        subflowName = subflowNameById[raw.type.slice('subflow:'.length)];
      }
      // GERCEK Node-RED editor'unun otomatik "required field" dogrulamasi
      // (bkz. nodeCatalog.js getNodeValidationIssues) - kendi alanlari VE
      // isaret ettigi config node'un alanlari (recursive) kontrol edilir,
      // 2026-08-29 canli bulgu: "Mail Gonder" node'unun KENDI alanlari dolu
      // olsa da isaret ettigi ms-graph-mail-config'in authType=DELEGATED +
      // bos tenant'i node'u GECERSIZ yapiyordu, artik canvas'ta kirmizi
      // gosteriliyor.
      const validationIssues = getNodeValidationIssues(raw.type, raw, snapshot.nodesById);
      return {
        id,
        type: 'flowNode',
        position: { x: raw.x ?? 100, y: raw.y ?? 100 },
        selected: id === selectedId,
        data: { raw, selected: id === selectedId, subflowName, runtimeStatus, onTriggerInject, onTestEndpoint, validationIssues }
      };
    });

    const edges = [];
    canvasIds.forEach((id) => {
      const raw = snapshot.nodesById[id];
      (raw.wires || []).forEach((targets, outIdx) => {
        (targets || []).forEach((toId) => {
          if (!canvasIdSet.has(toId)) return;
          const isActive = activeEdgeKeys.has(`${id}->${toId}`);
          edges.push({
            id: `${id}-${outIdx}-${toId}`,
            source: id,
            sourceHandle: `out-${outIdx}`,
            target: toId,
            targetHandle: 'in',
            animated: isActive,
            className: isActive ? 'flow-edge-active' : undefined,
            // Kullanıcı geri bildirimi: CSS ile (--canvas-edge değişkeni +
            // .flow-canvas özgüllük artışı) yapılan önceki düzeltmeler
            // yetmedi — kök sebep kesin olarak doğrulanamadı (tema CSS'i
            // teorik olarak doğru özgüllükte). Bu yüzden ARTIK CSS
            // CASCADE'İNE HİÇ GÜVENMİYORUZ: her edge'e DOĞRUDAN inline
            // `style` veriliyor — inline style HER ZAMAN harici stylesheet
            // kurallarını (specificity'den bağımsız olarak) ezer, bu
            // rengin/kalınlığın görünmemesi artık İMKANSIZ. Aktif/hata
            // rengi (yeşil) hâlâ önceliklidir.
            style: isActive
              ? { stroke: '#22c55e', strokeWidth: 2.6 }
              : { stroke: '#334155', strokeWidth: 2 },
            markerEnd: {
              type: 'arrowclosed',
              width: 16,
              height: 16,
              color: isActive ? '#22c55e' : '#334155'
            }
          });
        });
      });
    });

    return { nodes, edges };
  }, [snapshot, selectedId, subflowNameById, runtimeStatus, onTriggerInject, onTestEndpoint, activeEdgeKeys]);

  // React Flow'un onerdigi "controlled nodes + onNodesChange" deseni: node
  // pozisyonlari SADECE modelden (snapshot) geldiginde bu yerel state'e
  // senkronize edilir; surukleme sirasindaki HER hareket ise applyNodeChanges
  // ile bu yerel state uzerinde islenir (React Flow'un kendi optimize
  // mekanizmasi). Onceki tasarimda "nodes" prop'u DOGRUDAN modelden
  // hesaplaniyordu ve onNodesChange YOKTU - bu, surukleme sirasinda
  // (drag sirasinda model DEGISMEDIGI icin) React Flow'un pozisyonu takip
  // edip etmemesini render araligina birakiyordu; parent'ta HERHANGI bir
  // state guncellemesi (debug/trace event'leri gibi sik gelenler) olursa
  // node prop'u yeniden hesaplanip surukleme ortasinda eski pozisyona
  // "zipliyor" (kasma/yumusak-olmayan-surukleme hissi). Simdi surukleme
  // TAMAMEN yerel state'te, akici.
  const [rfNodes, setRfNodes] = useState(modelNodes);
  useEffect(() => {
    setRfNodes(modelNodes);
  }, [modelNodes]);

  const handleNodesChange = useCallback((changes) => {
    setRfNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const handleConnect = useCallback(
    (params) => {
      const outputIndex = parseOutputIndex(params.sourceHandle);
      connect(params.source, params.target, outputIndex);
    },
    [connect]
  );

  const handleEdgesDelete = useCallback(
    (deleted) => {
      const links = deleted.map((edge) => ({
        fromId: edge.source,
        toId: edge.target,
        output: parseOutputIndex(edge.sourceHandle)
      }));
      disconnectMany(links);
    },
    [disconnectMany]
  );

  const handleNodesDelete = useCallback(
    (deleted) => {
      const ids = deleted.map((n) => n.id);
      removeNodes(ids);
      if (selectedId && ids.includes(selectedId)) onSelect?.(null);
    },
    [removeNodes, selectedId, onSelect]
  );

  const handleNodeClick = useCallback(
    (_evt, node) => {
      onSelect?.(node.id);
    },
    [onSelect]
  );

  const handlePaneClick = useCallback(
    (event) => {
      if (event && (event.ctrlKey || event.metaKey) && wrapperRef.current) {
        const bounds = wrapperRef.current.getBoundingClientRect();
        const screenX = event.clientX - bounds.left;
        const screenY = event.clientY - bounds.top;
        const flowPos = project({ x: screenX, y: screenY });
        setQuickAdd({ screenX, screenY, flowX: flowPos.x, flowY: flowPos.y });
        return;
      }
      setQuickAdd(null);
      setNodeContextMenu(null);
      onSelect?.(null);
      onSelectionChange?.([]);
    },
    [project, onSelect, onSelectionChange]
  );

  const handlePaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      if (!wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const screenX = event.clientX - bounds.left;
      const screenY = event.clientY - bounds.top;
      const flowPos = project({ x: screenX, y: screenY });
      setNodeContextMenu(null);
      setQuickAdd({ screenX, screenY, flowX: flowPos.x, flowY: flowPos.y });
    },
    [project]
  );

  const handleNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      if (!wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      setQuickAdd(null);
      setNodeContextMenu({
        screenX: event.clientX - bounds.left,
        screenY: event.clientY - bounds.top,
        nodeId: node.id
      });
    },
    []
  );

  const handleNodeDragStop = useCallback(
    (_evt, _node, draggedNodes) => {
      const moves = (draggedNodes && draggedNodes.length ? draggedNodes : [_node]).map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y
      }));
      moveNodes(moves);
    },
    [moveNodes]
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes }) => {
      onSelectionChange?.(selNodes.map((n) => n.id));
    },
    [onSelectionChange]
  );

  const handleDragOver = useCallback((event) => {
    if (!Array.from(event.dataTransfer.types || []).includes(DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event) => {
      const raw = event.dataTransfer.getData(DRAG_MIME);
      if (!raw || !wrapperRef.current) return;
      event.preventDefault();
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      const { type, isConfig, subflowName } = payload;
      if (isConfig) {
        const id = addNode({ type, config: defaultConfigFor(type) });
        onSelect?.(id);
        return;
      }
      const bounds = wrapperRef.current.getBoundingClientRect();
      const flowPos = project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
      const isSubflowInstance = typeof type === 'string' && type.startsWith('subflow:');
      const config = isSubflowInstance ? { wires: [[]] } : defaultConfigFor(type);
      const id = addNode({ type, name: isSubflowInstance ? subflowName : undefined, config, x: flowPos.x, y: flowPos.y });
      onSelect?.(id);
    },
    [project, addNode, onSelect]
  );

  const handleQuickAddPick = useCallback(
    (item) => {
      if (!quickAdd) return;
      let id;
      if (item.kind === 'config') {
        id = addNode({ type: item.type, config: defaultConfigFor(item.type) });
      } else if (item.kind === 'subflow') {
        id = addNode({
          type: item.type,
          name: item.subflowName,
          config: { wires: [[]] },
          x: quickAdd.flowX,
          y: quickAdd.flowY
        });
      } else {
        id = addNode({ type: item.type, config: defaultConfigFor(item.type), x: quickAdd.flowX, y: quickAdd.flowY });
      }
      setQuickAdd(null);
      onSelect?.(id);
    },
    [quickAdd, addNode, onSelect]
  );

  return (
    <div className="flow-canvas" ref={wrapperRef} onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        key={snapshot.activeContainerId}
        nodes={rfNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        onNodesDelete={handleNodesDelete}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeDragStop={handleNodeDragStop}
        onSelectionChange={handleSelectionChange}
        selectionOnDrag
        panOnDrag={[1]}
        deleteKeyCode={['Backspace', 'Delete']}
        // KRİTİK: reactflow'un `multiSelectionKeyCode`/`zoomActivationKeyCode`
        // varsayılanı (`['Meta','Control']`) — kütüphanenin kendi
        // `useKeyPress` hook'u BU İKİSİ İÇİN `actInsideInputWithModifier`
        // seçeneğini AÇIKÇA GEÇMİYOR (varsayılan `true`), yani bu hook'lar
        // odak bir <input>/<textarea> İÇİNDEYKEN DE çalışıyor ve modifier
        // (Ctrl/Cmd) tuşunun KENDİSİ basıldığı anda `event.preventDefault()`
        // çağırıyor — bu da Chromium'da Ctrl+V/Ctrl+C gibi ardından gelen
        // kombinasyonların native kopyala/yapıştır akışını KIRIYOR (canlı
        // doğrulandı: axet.flows ekranındaki HİÇBİR metin alanına — node
        // arama kutusu, node özellik alanları, agent composer — Ctrl+V ile
        // yapıştırma YAPILAMIYORDU, kök sebep buydu). `null` vererek bu iki
        // hook'u TAMAMEN devre dışı bırakıyoruz — Ctrl+tıkla çoklu seçim ve
        // panOnScroll-modunda Ctrl+tekerlek-zoom kaybediliyor (ikisi de bu
        // canvas'ta zaten kullanılmıyor: çoklu seçim `selectionOnDrag` ile,
        // zoom ise fare tekerleği/Controls +/- ile yapılıyor) ama karşılığında
        // TÜM metin alanlarında normal Ctrl+V/Ctrl+C tekrar çalışıyor.
        multiSelectionKeyCode={null}
        zoomActivationKeyCode={null}
        elevateNodesOnSelect={false}
        // Kullanıcı geri bildirimi: "noktadan çekince bağlantı çizgisi
        // çıkmıyor" — sürüklerken gösterilen ge​çici bağlantı çizgisi CSS
        // sınıfına (.react-flow__connection-path) bağımlıydı; edge'lerde
        // yaptığımız AYNI "CSS cascade'inden bağımsız inline style" düzeltmesi
        // burada da uygulandı, çizgi artık her ortamda garanti görünür.
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: '#22c55e', strokeWidth: 2.5 }}
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          style={{ backgroundColor: 'var(--base-900)' }}
          maskColor="rgba(15, 15, 17, 0.55)"
          nodeColor="var(--ink-400)"
          nodeStrokeColor="var(--base-600)"
        />
      </ReactFlow>
      {quickAdd && (
        <QuickAddMenu
          x={quickAdd.screenX}
          y={quickAdd.screenY}
          subflows={usableSubflows}
          onPick={handleQuickAddPick}
          onClose={() => setQuickAdd(null)}
        />
      )}
      {nodeContextMenu && (
        <NodeContextMenu
          x={nodeContextMenu.screenX}
          y={nodeContextMenu.screenY}
          items={buildNodeContextMenuItems({
            nodeId: nodeContextMenu.nodeId,
            selectedIds,
            selectedId,
            onSelect,
            removeNodes,
            copySelection,
            duplicateSelection,
            createSubflowFromSelection,
            onConverted
          })}
          onClose={() => setNodeContextMenu(null)}
        />
      )}
    </div>
  );
}

export default function FlowCanvas(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
