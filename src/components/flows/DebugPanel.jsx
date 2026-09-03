import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Check, X, Waves, ChevronDown, Pin, PictureInPicture2, Download, Trash2, Timer, ScrollText } from 'lucide-react';
import { computeExecutionStats, formatDuration } from '../../flows/utils/executionStats';

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('tr-TR', { hour12: false }) + `.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function formatPayload(payload) {
  if (payload === undefined) return 'undefined';
  if (payload === null) return 'null';
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

const STEP_ICON = { ok: Check, error: X, simulated: Waves };
const STEP_ICON_CLASS = { ok: 'trace-step-icon-ok', error: 'trace-step-icon-error', simulated: 'trace-step-icon-sim' };

function buildChains(traceEvents, maxChains = 25) {
  const chainsMap = new Map();
  const order = [];
  (traceEvents || []).forEach((evt) => {
    const id = evt.chainId || 'unknown';
    if (!chainsMap.has(id)) {
      chainsMap.set(id, { chainId: id, trigger: null, steps: [], timedOut: false, startedAt: evt.timestamp });
      order.push(id);
    }
    const chain = chainsMap.get(id);
    if (evt.kind === 'chain-start') {
      chain.trigger = evt.trigger;
      chain.startedAt = evt.timestamp;
    } else if (evt.kind === 'step') {
      chain.steps.push(evt);
    } else if (evt.kind === 'chain-timeout') {
      chain.timedOut = true;
      chain.steps.push({ ...evt, nodeName: 'Zaman Asimi (15sn)', status: 'error' });
    }
  });
  return order
    .slice(-maxChains)
    .reverse()
    .map((id) => chainsMap.get(id));
}

// Kullanıcı geri bildirimi: "flow adımlarında adım seçilip detay
// görüntülenemiyor" — önceden bir adım (StepRow) hiç TIKLANAMIYORDU, sadece
// girdi/çıktının kırpılmış 90 karakterlik bir özeti görünüyordu. Artık her
// adım tıklanabilir bir buton: açılınca tam (kırpılmamış, JSON ise
// biçimlendirilmiş) girdi/çıktıyı + node id/chain id/zaman damgasını
// gösteren bir detay bloğu belirir, tekrar tıklayınca kapanır.
function StepRow({ step, isLast, expanded, onToggle }) {
  const StepIcon = STEP_ICON[step.status] || Check;
  const iconClass = STEP_ICON_CLASS[step.status] || '';
  const hasDetail = step.input !== undefined || step.output !== undefined || step.nodeId || step.errorMessage;
  return (
    <div className={`trace-step trace-step-appear${isLast && step.status === 'error' ? ' trace-step-stopped' : ''}`}>
      <button
        type="button"
        className={`trace-step-row${expanded ? ' trace-step-row-expanded' : ''}`}
        onClick={() => hasDetail && onToggle()}
        disabled={!hasDetail}
      >
        <span className={`trace-step-icon trace-step-icon-appear ${iconClass}`}>
          <StepIcon size={11} strokeWidth={2.5} />
        </span>
        <div className="trace-step-body">
          <div className="trace-step-head">
            <span className="trace-step-name">{step.nodeName || step.nodeType}</span>
            <span className="trace-step-type">{step.nodeType}</span>
            {step.status === 'simulated' && <span className="trace-step-tag">SIMULATED</span>}
          </div>
          {step.status !== 'error' && (step.input !== undefined || step.output !== undefined) && (
            <div className="trace-step-io">
              {step.input !== undefined && <span className="trace-step-io-in">girdi: {String(step.input).slice(0, 90)}</span>}
              {step.output !== undefined && step.output !== null && (
                <span className="trace-step-io-out">→ cikti: {String(step.output).slice(0, 90)}</span>
              )}
            </div>
          )}
        </div>
        {hasDetail && (
          <span className={`trace-step-chevron${expanded ? ' trace-step-chevron-open' : ''}`}>
            <ChevronDown size={12} />
          </span>
        )}
      </button>
      {expanded && hasDetail && (
        <div className="trace-step-detail">
          {step.timestamp && (
            <div className="trace-step-detail-row">
              <span className="trace-step-detail-label">Zaman</span>
              <span className="trace-step-detail-value">{formatTime(step.timestamp)}</span>
            </div>
          )}
          {step.nodeId && (
            <div className="trace-step-detail-row">
              <span className="trace-step-detail-label">Node ID</span>
              <span className="trace-step-detail-value trace-step-detail-mono">{step.nodeId}</span>
            </div>
          )}
          {step.input !== undefined && (
            <div className="trace-step-detail-block">
              <span className="trace-step-detail-label">Girdi</span>
              <pre className="trace-step-detail-pre">{formatPayload(step.input)}</pre>
            </div>
          )}
          {step.output !== undefined && (
            <div className="trace-step-detail-block">
              <span className="trace-step-detail-label">Cikti</span>
              <pre className="trace-step-detail-pre">{formatPayload(step.output)}</pre>
            </div>
          )}
          {step.errorMessage && (
            <div className="trace-step-detail-block">
              <span className="trace-step-detail-label">Hata</span>
              <pre className="trace-step-detail-pre trace-step-detail-pre-error">{step.errorMessage}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StoppedCard({ step, onFixWithAI }) {
  return (
    <div className="trace-stopped-card">
      <div className="trace-stopped-title">
        <span className="trace-stopped-badge">DURDU</span>
        "{step.nodeName || step.nodeType}" node'unda akis durdu
      </div>
      <div className="trace-stopped-row">
        <span className="trace-stopped-label">Ne oldu:</span> {step.errorMessage}
      </div>
      {step.cause && (
        <div className="trace-stopped-row">
          <span className="trace-stopped-label">Neden:</span> {step.cause}
        </div>
      )}
      {step.suggestion && (
        <div className="trace-stopped-row">
          <span className="trace-stopped-label">Ne yapmali:</span> {step.suggestion}
        </div>
      )}
      <button className="trace-stopped-fix-btn" onClick={() => onFixWithAI(step)}>
        AI ile Duzelt
      </button>
    </div>
  );
}

function ChainCard({ chain, onFixWithAI, focused }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedStep, setExpandedStep] = useState(null);
  const cardRef = useRef(null);
  const lastStep = chain.steps[chain.steps.length - 1];
  const hasError = lastStep && lastStep.status === 'error';
  const hasSimulated = chain.steps.some((s) => s.status === 'simulated');
  const OverallIcon = hasError ? X : hasSimulated ? Waves : chain.steps.length ? Check : Timer;
  const statusClass = hasError ? 'trace-chain-status-error' : chain.steps.length ? 'trace-chain-status-ok' : 'trace-chain-status-idle';

  useEffect(() => {
    if (focused) {
      setCollapsed(false);
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focused]);

  return (
    <div className={`trace-chain ${statusClass}${focused ? ' trace-chain-focused' : ''}`} ref={cardRef}>
      <button className="trace-chain-head" onClick={() => setCollapsed((c) => !c)}>
        <span className={`trace-chain-head-icon ${statusClass}`}>
          <OverallIcon size={12} strokeWidth={2.5} />
        </span>
        <span className="trace-chain-head-text">
          {chain.trigger ? chain.trigger.reason : 'Tetikleyici bilinmiyor'}
          {chain.trigger?.nodeName ? ` · ${chain.trigger.nodeName}` : ''}
        </span>
        {chain.steps.length > 0 && <span className="trace-chain-head-count">{chain.steps.length}</span>}
        <span className="trace-chain-head-time">{chain.startedAt ? formatTime(chain.startedAt) : ''}</span>
        <span className={`trace-chain-chevron${collapsed ? ' trace-chain-chevron-collapsed' : ''}`}>
          <ChevronDown size={13} />
        </span>
      </button>
      {!collapsed && (
        <div className="trace-chain-body">
          {chain.steps.length === 0 && <div className="trace-chain-empty">Henüz adım yok...</div>}
          {chain.steps.map((step, i) => (
            <StepRow
              key={i}
              step={step}
              isLast={i === chain.steps.length - 1}
              expanded={expandedStep === i}
              onToggle={() => setExpandedStep((cur) => (cur === i ? null : i))}
            />
          ))}
          {hasError && <StoppedCard step={lastStep} onFixWithAI={onFixWithAI} />}
        </div>
      )}
    </div>
  );
}

function ExecutionSummary({ traceEvents }) {
  const stats = useMemo(() => computeExecutionStats(traceEvents), [traceEvents]);
  if (stats.totalRuns === 0) return null;
  return (
    <div className="execution-summary">
      <span className="execution-summary-item">
        <span className="execution-summary-value">{stats.totalRuns}</span> çalışma
      </span>
      <span className="execution-summary-sep" />
      <span className="execution-summary-item">
        <span className="execution-summary-value execution-summary-value-ok">{stats.successCount}</span> başarılı
      </span>
      <span className="execution-summary-sep" />
      <span className="execution-summary-item">
        <span className="execution-summary-value execution-summary-value-error">{stats.errorCount}</span> hatalı
      </span>
      <span className="execution-summary-sep" />
      <span className="execution-summary-item">ort. süre {formatDuration(stats.avgDurationMs)}</span>
    </div>
  );
}

function ValidationIssueCard({ issue, onFixWithAI }) {
  return (
    <div className={`validation-issue validation-issue-${issue.severity}`}>
      <div className="validation-issue-head">
        <span className="validation-issue-badge">{issue.severity === 'error' ? 'KRITIK' : 'UYARI'}</span>
        <span className="validation-issue-title">{issue.title}</span>
        <span className="validation-issue-node">{issue.nodeName}</span>
      </div>
      <div className="validation-issue-row">
        <span className="trace-stopped-label">Neden:</span> {issue.cause}
      </div>
      <div className="validation-issue-row">
        <span className="trace-stopped-label">Ne yapmali:</span> {issue.suggestion}
      </div>
      <button
        className="trace-stopped-fix-btn"
        onClick={() =>
          onFixWithAI({
            nodeId: issue.nodeId,
            nodeName: issue.nodeName,
            nodeType: issue.nodeType,
            errorMessage: issue.title,
            cause: issue.cause,
            suggestion: issue.suggestion
          })
        }
      >
        AI ile Duzelt
      </button>
    </div>
  );
}

function DebugEntryRow({ entry }) {
  const isDebugMsg = entry.kind === 'debug';
  const isError = Boolean(entry.error);
  const isSimulated = Boolean(entry.simulated);

  return (
    <div className={`debug-entry${isError ? ' debug-entry-error' : ''}${isSimulated ? ' debug-entry-simulated' : ''}`}>
      <div className="debug-entry-head">
        <span className="debug-entry-time">{formatTime(entry.timestamp)}</span>
        {isDebugMsg ? (
          <>
            <span className="debug-entry-node">{entry.nodeName || entry.nodeType}</span>
            {isSimulated && <span className="debug-entry-tag debug-entry-tag-sim">SIMULATED</span>}
            {isError && <span className="debug-entry-tag debug-entry-tag-error">HATA</span>}
            {entry.topic ? <span className="debug-entry-topic">topic: {entry.topic}</span> : null}
          </>
        ) : (
          <span className={`debug-entry-loglevel debug-entry-loglevel-${entry.level || 'info'}`}>{(entry.level || 'info').toUpperCase()}</span>
        )}
      </div>
      <pre className="debug-entry-payload">{isDebugMsg ? formatPayload(entry.payload) : entry.text}</pre>
    </div>
  );
}

const TABS = [
  { key: 'steps', label: 'Flow Adimlari' },
  { key: 'messages', label: 'Debug / Sistem' }
];

const MIN_PANEL_HEIGHT = 140;
const MAX_PANEL_HEIGHT_RATIO = 0.8;
const MIN_FLOAT_WIDTH = 320;
const MIN_FLOAT_HEIGHT = 200;
const DEFAULT_FLOAT_SIZE = { width: 460, height: 380 };

export default function DebugPanel({ open, validation, traceEvents, entries, onClear, onFixWithAI, onClose, focusChainId, onFocusHandled }) {
  const scrollRef = useRef(null);
  const panelRef = useRef(null);
  const [tab, setTab] = useState('steps');
  const [panelHeight, setPanelHeight] = useState(340);
  const resizingRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const [floating, setFloating] = useState(false);
  const [floatPos, setFloatPos] = useState(null);
  const [floatSize, setFloatSize] = useState(DEFAULT_FLOAT_SIZE);
  const dragRef = useRef(null);
  const floatResizeRef = useRef(null);
  const [listMaxHeight, setListMaxHeight] = useState(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    stickToBottomRef.current = true;
  }, [tab]);

  const chains = useMemo(() => buildChains(traceEvents), [traceEvents]);

  // Kullanici bildirimi: "flow adimlarinda scroll yok, scrollbar hic
  // gorunmuyor" - .debug-panel-list'in CSS'i (flex:1 + min-height:0 +
  // overflow-y:auto) yapisal olarak dogru olsa da (statik denetimde iki
  // ayri turda hata bulunamadi), bu bir GUVENLIK AGI: listin gercek
  // piksel yuksekligini panelin kendi kutusundan (header + varsa
  // execution-summary DUSULEREK) DOGRUDAN OLCUP `max-height` olarak
  // zorluyoruz - flex hesaplamasi herhangi bir Chromium/Electron
  // kenar-durumunda basarisiz olsa bile, bu JS-olculu deger scroll'un
  // HER ZAMAN tetiklenmesini garanti eder (CSS'teki flex:1 ile CAKISMAZ,
  // sadece onu piksel bir tavanla destekler - ikisi ayni sonuca varir).
  useEffect(() => {
    function recompute() {
      if (!panelRef.current || !scrollRef.current) return;
      const panelRect = panelRef.current.getBoundingClientRect();
      const listRect = scrollRef.current.getBoundingClientRect();
      const available = panelRect.bottom - listRect.top;
      if (available > 0) setListMaxHeight(Math.floor(available));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    if (panelRef.current) ro.observe(panelRef.current);
    if (scrollRef.current && scrollRef.current.previousSibling) {
      // header/execution-summary yuksekligi degisebilir (orn tab degisince
      // execution-summary gorunur/gizlenir) - panelin tum onceki kardeslerini
      // de izle.
      let sib = scrollRef.current.parentElement.firstElementChild;
      while (sib && sib !== scrollRef.current) {
        ro.observe(sib);
        sib = sib.nextElementSibling;
      }
    }
    window.addEventListener('resize', recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [floating, panelHeight, floatSize.height, tab, chains.length]);

  useEffect(() => {
    if (!focusChainId) return;
    setTab('steps');
    stickToBottomRef.current = false;
    const timer = setTimeout(() => onFocusHandled?.(), 1500);
    return () => clearTimeout(timer);
  }, [focusChainId, onFocusHandled]);

  // Yeni bir adim/mesaj geldiginde, kullanici listeyi yukari kaydirmadiysa
  // (halen "en altta" ise) otomatik olarak en alta kaydir - boylece "tum
  // adimlari goremiyorum" sorunu olmaz, yeni gelen her sey otomatik gorunur.
  // Kullanici bilerek yukari kaydirdiysa (eski bir adima bakiyorsa) onu
  // rahatsiz etmeyiz.
  useEffect(() => {
    if (!scrollRef.current) return;
    if (stickToBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chains, entries, validation]);

  function handleListScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 24;
  }

  const handleResizeStart = useCallback((event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panelRef.current ? panelRef.current.getBoundingClientRect().height : panelHeight;
    resizingRef.current = { startY, startHeight };

    function handleMouseMove(e) {
      if (!resizingRef.current) return;
      const delta = resizingRef.current.startY - e.clientY;
      const maxHeight = window.innerHeight * MAX_PANEL_HEIGHT_RATIO;
      const next = Math.min(maxHeight, Math.max(MIN_PANEL_HEIGHT, resizingRef.current.startHeight + delta));
      setPanelHeight(next);
    }
    function handleMouseUp() {
      resizingRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [panelHeight]);

  const handleToggleFloating = useCallback(() => {
    setFloating((wasFloating) => {
      if (!wasFloating && !floatPos) {
        setFloatPos({
          x: Math.max(16, window.innerWidth - DEFAULT_FLOAT_SIZE.width - 40),
          y: Math.max(16, window.innerHeight - DEFAULT_FLOAT_SIZE.height - 90)
        });
      }
      return !wasFloating;
    });
  }, [floatPos]);

  const handleFloatDragStart = useCallback(
    (event) => {
      if (!floating) return;
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const origin = floatPos || { x: 0, y: 0 };
      dragRef.current = { startX, startY, origin };

      function handleMouseMove(e) {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setFloatPos({
          x: Math.max(0, dragRef.current.origin.x + dx),
          y: Math.max(0, dragRef.current.origin.y + dy)
        });
      }
      function handleMouseUp() {
        dragRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [floating, floatPos]
  );

  const handleFloatResizeStart = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startSize = floatSize;
      floatResizeRef.current = { startX, startY, startSize };

      function handleMouseMove(e) {
        if (!floatResizeRef.current) return;
        const dx = e.clientX - floatResizeRef.current.startX;
        const dy = e.clientY - floatResizeRef.current.startY;
        setFloatSize({
          width: Math.max(MIN_FLOAT_WIDTH, floatResizeRef.current.startSize.width + dx),
          height: Math.max(MIN_FLOAT_HEIGHT, floatResizeRef.current.startSize.height + dy)
        });
      }
      function handleMouseUp() {
        floatResizeRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [floatSize]
  );

  const errorCount = useMemo(
    () => (entries || []).filter((e) => e.error).length + chains.filter((c) => c.steps.some((s) => s.status === 'error')).length,
    [entries, chains]
  );
  const blockingIssueCount = validation?.issues?.filter((i) => i.severity === 'error').length || 0;

  const [exporting, setExporting] = useState(false);
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const payload = { exportedAt: new Date().toISOString(), traceEvents: traceEvents || [], entries: entries || [] };
      const res = await window.api.flowsExportDebugLog(JSON.stringify(payload, null, 2));
      if (res?.canceled === false) {
        // eslint-disable-next-line no-console
        console.log('Debug log kaydedildi:', res.filePath);
      }
    } finally {
      setExporting(false);
    }
  }, [traceEvents, entries]);

  if (!open) return null;

  const containerStyle = floating
    ? {
        left: `${floatPos?.x ?? 40}px`,
        top: `${floatPos?.y ?? 40}px`,
        width: `${floatSize.width}px`,
        height: `${floatSize.height}px`
      }
    : { '--debug-panel-height': `${panelHeight}px` };

  return (
    <div
      className={`debug-panel${floating ? ' debug-panel-floating' : ''}`}
      ref={panelRef}
      style={containerStyle}
    >
      {!floating && (
        <div
          className="debug-panel-resize-handle"
          onMouseDown={handleResizeStart}
          title="Debug panel boyutunu ayarlamak icin surukle"
        />
      )}
      <div className="debug-panel-header" onMouseDown={floating ? handleFloatDragStart : undefined}>
        <div className="debug-panel-header-main">
          <span className="debug-panel-dot" />
          <span className="debug-panel-title">Debug</span>
          {errorCount > 0 && <span className="debug-panel-error-badge">{errorCount}</span>}
        </div>
        <div className="debug-panel-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`debug-panel-tab${tab === t.key ? ' debug-panel-tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="debug-panel-actions">
          <button
            className="debug-panel-icon-btn"
            onClick={handleToggleFloating}
            title={floating ? 'Panele sabitle' : 'Kayan pencere olarak ac'}
          >
            {floating ? <Pin size={13} /> : <PictureInPicture2 size={13} />}
          </button>
          <button
            className="debug-panel-icon-btn"
            onClick={handleExport}
            disabled={exporting}
            title="Debug kaydini JSON olarak disa aktar"
          >
            <Download size={13} />
          </button>
          <button className="debug-panel-icon-btn" onClick={onClear} title="Mesajlari temizle">
            <Trash2 size={13} />
          </button>
          <button className="debug-panel-icon-btn debug-panel-icon-btn-close" onClick={onClose} title="Paneli kapat">
            <X size={14} />
          </button>
        </div>
      </div>
      {tab === 'steps' && <ExecutionSummary traceEvents={traceEvents} />}
      <div
        className="debug-panel-list"
        ref={scrollRef}
        onScroll={handleListScroll}
        style={listMaxHeight ? { maxHeight: `${listMaxHeight}px` } : undefined}
      >
        {validation?.issues?.length > 0 && (
          <div className="validation-section">
            <div className="validation-section-title">
              Deploy Öncesi Kontrol
              {blockingIssueCount > 0 && <span className="validation-section-blocked">Deploy engellendi</span>}
            </div>
            {validation.issues.map((issue, i) => (
              <ValidationIssueCard key={i} issue={issue} onFixWithAI={onFixWithAI} />
            ))}
          </div>
        )}

        {tab === 'steps' && (
          <>
            {chains.length === 0 && (
              <div className="debug-panel-empty">
                <Timer size={16} className="debug-panel-empty-icon" />
                Henüz bir tetikleme olmadı. Flow'u deploy et, bir HTTP isteği gönder veya bir inject
                node'unu manuel tetikle — flow'un adım adım ne yaptığı burada görünecek.
              </div>
            )}
            {chains.map((chain) => (
              <ChainCard
                key={chain.chainId}
                chain={chain}
                onFixWithAI={onFixWithAI}
                focused={chain.chainId === focusChainId}
              />
            ))}
          </>
        )}

        {tab === 'messages' && (
          <>
            {(!entries || entries.length === 0) && (
              <div className="debug-panel-empty">
                <ScrollText size={16} className="debug-panel-empty-icon" />
                Henüz mesaj yok.
              </div>
            )}
            {(entries || []).map((entry, i) => (
              <DebugEntryRow key={i} entry={entry} />
            ))}
          </>
        )}
      </div>
      {floating && (
        <div
          className="debug-panel-float-resize-handle"
          onMouseDown={handleFloatResizeStart}
          title="Kayan pencere boyutunu ayarlamak icin surukle"
        />
      )}
    </div>
  );
}
