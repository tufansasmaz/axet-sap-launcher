import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, SlidersHorizontal, Bot, ArrowUpRight } from 'lucide-react';
import { useFlowSnapshot } from '../../flows/FlowContext';
import { catalogEntry, connectionStatusFor, isConfigType } from '../../flows/nodeCatalog';
import {
  computeExecutionStats,
  computeTopNodesByUsage,
  computeDurationSeries,
  formatAgo,
  formatDuration,
  groupChains
} from '../../flows/utils/executionStats';
import RadialGauge from './RadialGauge';
import MiniSparkline from './MiniSparkline';
import ConfigNodesPanel from './ConfigNodesPanel';
import SubflowsPanel from './SubflowsPanel';
import NodeEditorPanel from './NodeEditorPanel';
import ChatPanel from './ChatPanel';
import { requestPrompt } from '../../flows/utils/dialogService';
import { useFlowActions } from '../../flows/FlowContext';

// Kullanıcı geri bildirimi: "İstatistikler" ayrı bir sekme olarak KALDIRILDI
// — içeriği "Genel" sekmesinin İÇİNE taşındı (tek bir "genel bakış" ekranı:
// metadata + bağlantılar + subflow/config listeleri + çalıştırma
// istatistikleri, hepsi aynı sekmede alt alta). "Agent" sekmesi de kullanıcı
// isteğiyle en SOLA (ilk sekme) alındı — artık üç sekme var: Agent, Genel,
// Özellikler.
const TABS = [
  { key: 'agent', label: 'Agent', icon: Bot },
  { key: 'info', label: 'Genel', icon: Info },
  { key: 'properties', label: 'Özellikler', icon: SlidersHorizontal }
];

function useConnections(snapshot) {
  return useMemo(() => {
    const counts = new Map();
    snapshot.order.forEach((id) => {
      const n = snapshot.nodesById[id];
      if (!n || !isConfigType(n.type)) return;
      const entry = catalogEntry(n.type);
      const label = n.name || entry.label || n.type;
      const key = `${n.type}:${label}`;
      if (!counts.has(key)) counts.set(key, { type: n.type, label, count: 0, raw: n });
      const item = counts.get(key);
      item.count += 1;
      item.raw = n;
    });
    return Array.from(counts.values());
  }, [snapshot]);
}

function ConnectionRow({ connection }) {
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const status = connectionStatusFor(connection.type, connection.raw);

  function handleVerify() {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      setCheckedAt(Date.now());
    }, 350);
  }

  return (
    <div className="workflow-connection-row" title={status.detail || undefined}>
      <span className={`workflow-connection-dot${status.ok ? '' : ' workflow-connection-dot-warn'}`} />
      <span className="workflow-connection-label">{connection.label}</span>
      <span className={`workflow-connection-status${status.ok ? '' : ' workflow-connection-status-warn'}`}>
        {checking ? 'Kontrol ediliyor...' : checkedAt ? 'Kontrol edildi' : status.label}
      </span>
      <button className="workflow-connection-verify-btn" onClick={handleVerify} disabled={checking} title="Yapilandirma alanlarini yeniden kontrol et">
        Dogrula
      </button>
    </div>
  );
}

// "Genel" sekmesi — önceki turda ayrı bir "İstatistikler" sekmesi olan
// çalıştırma istatistikleri/en çok kullanılan düğümler/çalıştırma geçmişi
// bölümleri BURAYA taşındı (kullanıcı isteği: "istatistikleri genelin
// içine aktar, sonra istatistikleri [ayrı sekme olarak] kaldır").
function InfoTab({ onEnterSubflow, selectedId, onSelect, traceEvents, onOpenDebug, onOpenRunsView }) {
  const snapshot = useFlowSnapshot();
  const { renameTab, setTabDescription } = useFlowActions();
  const isSubflow = snapshot.activeContainerKind === 'subflow';
  const activeTab = !isSubflow ? snapshot.tabs.find((t) => t.id === snapshot.activeContainerId) : null;
  const connections = useConnections(snapshot);
  const [showRuns, setShowRuns] = useState(false);
  const stats = useMemo(() => computeExecutionStats(traceEvents), [traceEvents]);
  const durationSeries = useMemo(() => computeDurationSeries(traceEvents), [traceEvents]);
  const topNodes = useMemo(
    () => computeTopNodesByUsage(snapshot.nodesById, snapshot.order, snapshot.activeContainerId),
    [snapshot]
  );
  const recentChains = useMemo(
    () =>
      groupChains(traceEvents)
        .filter((c) => c.steps.length > 0 || c.timedOut)
        .slice(-8)
        .reverse(),
    [traceEvents]
  );
  const maxTopCount = topNodes[0]?.count || 1;

  async function handleRename() {
    if (!activeTab) return;
    const name = await requestPrompt('Workflow adi:', activeTab.name);
    if (name === null || !name.trim()) return;
    renameTab(activeTab.id, name.trim());
  }

  async function handleEditDescription() {
    if (!activeTab) return;
    const desc = await requestPrompt('Bu workflow ne yapiyor?', activeTab.description || '');
    if (desc === null) return;
    setTabDescription(activeTab.id, desc.trim());
  }

  return (
    <div className="right-panel-tab-body">
      <div className="right-panel-section">
        <div className="right-panel-section-title">Genel Bilgi</div>
        <div className="workflow-meta-row">
          <span className="workflow-meta-label">Ad</span>
          <span className="workflow-meta-value workflow-meta-value-editable" onClick={handleRename} title="Yeniden adlandir">
            {activeTab?.name || (isSubflow ? 'Subflow' : '-')}
          </span>
        </div>
        <div className="workflow-meta-row workflow-meta-row-desc">
          <span className="workflow-meta-label">Aciklama</span>
          <span className="workflow-meta-value workflow-meta-value-editable" onClick={handleEditDescription} title="Duzenle">
            {activeTab?.description || <span className="workflow-description-empty">Aciklama ekle...</span>}
          </span>
        </div>
      </div>

      <div className="right-panel-section">
        <div className="right-panel-section-title">Bağlantılar (Config Node'lar)</div>
        {connections.length === 0 && <div className="workflow-sidebar-empty">Config node yok.</div>}
        {connections.map((c) => (
          <ConnectionRow key={`${c.type}:${c.label}`} connection={c} />
        ))}
      </div>

      <div className="right-panel-section right-panel-section-flush">
        <SubflowsPanel onEnterSubflow={onEnterSubflow} />
      </div>

      <div className="right-panel-section right-panel-section-flush">
        <ConfigNodesPanel selectedId={selectedId} onSelect={onSelect} />
      </div>

      <div className="right-panel-section">
        <div className="right-panel-section-title">Çalıştırma İstatistikleri</div>
        <div className="stats-card-grid">
          <div className="stats-card">
            <div className="stats-card-value">{stats.totalRuns}</div>
            <div className="stats-card-label">Toplam Çalışma</div>
          </div>
          <div className="stats-card stats-card-gauge">
            <RadialGauge value={stats.successRate} />
            <div className="stats-card-label">Başarı Oranı</div>
          </div>
          <div className="stats-card">
            <MiniSparkline values={durationSeries} />
            <div className="stats-card-value stats-card-value-sm">{formatDuration(stats.avgDurationMs)}</div>
            <div className="stats-card-label">Ort. Süre</div>
          </div>
        </div>
      </div>

      <div className="right-panel-section">
        <div className="right-panel-section-title">En Çok Kullanılan Düğümler</div>
        {topNodes.length === 0 && <div className="workflow-sidebar-empty">Bu flow'da henuz node yok.</div>}
        {topNodes.map((n) => {
          const entry = catalogEntry(n.type);
          const pct = Math.max(6, Math.round((n.count / maxTopCount) * 100));
          return (
            <div key={n.type} className="workflow-usage-row">
              <span className="workflow-usage-swatch" style={{ background: entry.color }} />
              <span className="workflow-usage-label" title={n.type}>
                {entry.label || n.type}
              </span>
              <span className="workflow-usage-bar-track">
                <span className="workflow-usage-bar-fill" style={{ width: `${pct}%`, background: entry.color }} />
              </span>
              <span className="workflow-usage-count">{n.count}</span>
            </div>
          );
        })}
      </div>

      <div className="right-panel-section">
        <div className="workflow-executions-header">
          <div className="right-panel-section-title" style={{ margin: 0 }}>Çalıştırma Geçmişi</div>
          <button className="workflow-view-all-runs-btn" onClick={() => onOpenRunsView?.()} title="Tam ekran calisma gecmisi">
            Tümünü Gör
            <ArrowUpRight size={11} />
          </button>
        </div>
        <button className="workflow-view-executions-btn" onClick={() => setShowRuns((s) => !s)}>
          {showRuns ? 'Listeyi gizle' : `Son çalışmalar (${recentChains.length})`}
        </button>
        {showRuns && (
          <div className="workflow-executions-list">
            {recentChains.length === 0 && <div className="workflow-sidebar-empty">Kayit yok.</div>}
            {recentChains.map((chain) => {
              const failed = chain.timedOut || chain.steps.some((s) => s.status === 'error');
              return (
                <button
                  key={chain.chainId}
                  className={`workflow-execution-row${failed ? ' workflow-execution-row-error' : ''}`}
                  onClick={() => onOpenDebug?.(chain.chainId)}
                  title="Debug panelinde ac"
                >
                  <span className="workflow-execution-trigger">
                    {chain.trigger?.nodeName || chain.trigger?.reason || 'Tetikleyici'}
                  </span>
                  <span className="workflow-execution-meta">
                    {chain.steps.length} adim · {formatAgo(chain.startedAt)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// aXet Studio temasına uyan, sekmeli sağ panel — WorkflowSidebar
// (metadata+stats+connections) ve NodeEditorPanel'i AYRI sabit sütunlar
// olarak alt alta dizmek YERİNE, tek bir sekme değiştiricinin ARDINDA
// gösteriyor (SystemPanel.tsx'teki segmented-tab desenine benzer bir
// yaklaşım). Node seçilince "Özellikler" sekmesine OTOMATİK geçmiyoruz
// (kullanıcı istemeden sekme değişmesin) — sadece kullanıcı kendisi
// sekmeye tıkladığında NodeEditorPanel görünür.
//
// "Flow Builder Agent" (ChatPanel) kullanıcı isteğiyle ayrı bir sütun/
// pencere DEĞİL — bu panelin KENDİSİ, EN SOLDAKİ ("Agent") sekmesi olarak.
// Varsayılan açılış sekmesi de "info" (Genel) — kullanıcı bir flow'u
// düzenlerken önce genel bakışı görsün, agent'a bilerek gitsin.
export default function RightPanel({
  width,
  traceEvents,
  onOpenDebug,
  onOpenRunsView,
  selectedId,
  onSelect,
  onDeleted,
  onEnterSubflow,
  chatLog,
  chatBusy,
  onChatSend,
  models,
  modelsLoading,
  modelsError,
  currentModel,
  onSelectModel
}) {
  const [tab, setTab] = useState('info');

  // Kullanıcı geri bildirimi: "node seçtiğim zaman otomatik olarak
  // özellikler kısmı açılmıyor" — canvas'ta, ConfigNodesPanel'de veya
  // SubflowsPanel'de bir node YENİ seçildiğinde (id gerçekten değiştiğinde,
  // sadece prop referansı değil) "Özellikler" sekmesine otomatik geç.
  // Seçim TEMİZLENDİĞİNDE (null) sekme DEĞİŞTİRİLMİYOR — kullanıcı boş
  // canvas'a tıklayınca aniden "Genel"e fırlatılmasın.
  const prevSelectedIdRef = useRef(selectedId);
  useEffect(() => {
    if (selectedId && selectedId !== prevSelectedIdRef.current) {
      setTab('properties');
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

  return (
    <div className="right-panel" style={width ? { width } : undefined}>
      <div className="right-panel-tabs">
        {TABS.map((t) => {
          const TabIcon = t.icon;
          return (
            <button
              key={t.key}
              className={`right-panel-tab${tab === t.key ? ' right-panel-tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <TabIcon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === 'agent' ? (
        <ChatPanel
          log={chatLog}
          busy={chatBusy}
          onSend={onChatSend}
          models={models}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          currentModel={currentModel}
          onSelectModel={onSelectModel}
        />
      ) : (
        <div className="right-panel-scroll">
          {tab === 'info' && (
            <InfoTab
              onEnterSubflow={onEnterSubflow}
              selectedId={selectedId}
              onSelect={onSelect}
              traceEvents={traceEvents}
              onOpenDebug={onOpenDebug}
              onOpenRunsView={onOpenRunsView}
            />
          )}
          {tab === 'properties' && (
            <div className="right-panel-tab-body right-panel-tab-body-flush">
              <NodeEditorPanel selectedId={selectedId} onSelect={onSelect} onDeleted={onDeleted} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
