import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Bot } from 'lucide-react';
import ModelSelector from '../ModelSelector';

const ACTION_LABELS = {
  list_node_types: 'Node tipleri listeleniyor',
  get_flow: 'Flow durumu okunuyor',
  add_node: 'Node ekleniyor',
  add_config_node: 'Config node ekleniyor',
  update_node: 'Node guncelleniyor',
  remove_node: 'Node siliniyor',
  connect_nodes: 'Baglanti kuruluyor',
  disconnect_nodes: 'Baglanti kaldiriliyor',
  auto_layout: 'Duzen hesaplaniyor',
  add_tab: 'Yeni sekme aciliyor',
  switch_tab: 'Sekme degistiriliyor',
  create_subflow: 'Subflow olusturuluyor',
  exit_subflow: 'Subflow’dan cikiliyor',
  ask_user: 'Soru soruluyor',
  finish: 'Tamamlaniyor'
};

function shortId(id) {
  if (!id || typeof id !== 'string') return '?';
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function describeArgs(name, args = {}) {
  switch (name) {
    case 'add_node':
    case 'add_config_node':
      return args.name ? `${args.type} · “${args.name}”` : String(args.type || '');
    case 'update_node':
      return shortId(args.id);
    case 'remove_node':
      return shortId(args.id);
    case 'connect_nodes':
      return `${shortId(args.from_id)} → ${shortId(args.to_id)}`;
    case 'disconnect_nodes':
      return `${shortId(args.from_id)} ✕ ${shortId(args.to_id)}`;
    case 'switch_tab':
      return shortId(args.id);
    case 'add_tab':
    case 'create_subflow':
      return args.name || '';
    default:
      return '';
  }
}

function summarizeResult(name, text) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && parsed.id) return `id: ${shortId(parsed.id)}`;
    } catch {
      // fall through to raw text
    }
  }
  return trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed;
}

function ActivityRow({ tone, title, detail }) {
  return (
    <div className={`agent-activity agent-activity-${tone}`}>
      <span className="agent-activity-dot" />
      <span className="agent-activity-title">{title}</span>
      {detail && <span className="agent-activity-detail">{detail}</span>}
    </div>
  );
}

function LogLine({ entry, onOptionPick, optionsDisabled }) {
  switch (entry.kind) {
    case 'user':
      return (
        <div className="chat-row chat-row-user">
          <div className="chat-bubble chat-bubble-user">{entry.text}</div>
        </div>
      );
    case 'assistant':
      return (
        <div className="chat-row chat-row-agent">
          <div className="chat-bubble chat-bubble-agent">{entry.text}</div>
        </div>
      );
    case 'tool_call':
      return (
        <ActivityRow
          tone="call"
          title={ACTION_LABELS[entry.name] || entry.name}
          detail={describeArgs(entry.name, entry.args)}
        />
      );
    case 'tool_result':
      return (
        <ActivityRow
          tone={entry.error ? 'error' : 'ok'}
          title={entry.error ? 'Hata' : 'Tamam'}
          detail={summarizeResult(entry.name, entry.text)}
        />
      );
    case 'question':
      return (
        <div className="chat-row chat-row-agent">
          <div className="chat-banner chat-banner-question">
            <span className="chat-banner-label">Soru</span>
            {entry.text}
            {Array.isArray(entry.options) && entry.options.length > 0 && (
              <div className="chat-suggested-options">
                {entry.options.map((opt, i) => (
                  <button
                    key={i}
                    className="chat-suggested-option-btn"
                    disabled={optionsDisabled}
                    onClick={() => onOptionPick?.(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    case 'finish':
      return (
        <div className="chat-row chat-row-agent">
          <div className="chat-banner chat-banner-finish">
            <span className="chat-banner-label">Tamamlandi</span>
            {entry.text}
          </div>
        </div>
      );
    case 'error':
      return (
        <div className="chat-row chat-row-agent">
          <div className="chat-banner chat-banner-error">
            <span className="chat-banner-label">Hata</span>
            {entry.text}
          </div>
        </div>
      );
    default:
      return null;
  }
}

function useElapsedSeconds(active) {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      startRef.current = null;
      return;
    }
    startRef.current = Date.now();
    setSeconds(0);
    const interval = setInterval(() => {
      setSeconds(Math.round((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  return seconds;
}

// Flow Builder Agent — kullanıcı isteğiyle artık ayrı bir sütun/pencere
// DEĞİL, sağ panelin (RightPanel.jsx) KENDİSİ — "Agent" adlı dördüncü bir
// sekme olarak render ediliyor (diğer üç sekmeyle AYNI panel, AYNI genişlik).
// Bu yüzden artık kendi `width`'ini TAŞIMIYOR — ebeveyni (`right-panel`)
// zaten doğru genişliği/kenarlığı sağlıyor, `.chat-dock` sadece o alanı
// dolduran bir flex sütunu. Tam yükseklik dolduruyor: header sabit, log
// `flex:1` ile kalan alanı dolduruyor, composer altta sabit. Composer
// artık kutu/kenarlık TAŞIMIYOR (node-palette-search ile AYNI "panelle
// bütünleşik" dil), gönder butonu da düz `Send` yerine dolgu renkli
// dairesel bir `ArrowUp` butonuna çevrildi (ChatSessionPane.tsx'teki
// axet.code sohbetinin gönder butonuyla AYNI ruh).
export default function ChatPanel({ log, busy, onSend, models, modelsLoading, modelsError, currentModel, onSelectModel }) {
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const elapsed = useElapsedSeconds(busy);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [log, busy]);

  const lastToolCall = [...log].reverse().find((e) => e.kind === 'tool_call');
  const lastQuestionIndex = (() => {
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].kind === 'question') return i;
      if (log[i].kind === 'user') return -1;
    }
    return -1;
  })();

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleOptionPick(optionText) {
    if (busy) return;
    onSend(optionText);
  }

  return (
    <div className="chat-dock">
      <div className="chat-dock-header">
        <Bot size={13} className="chat-dock-header-icon" />
        <span className="chat-panel-title-label">Agent</span>
        {busy && <span className="chat-panel-title-busy">calisiyor · {elapsed}s</span>}
        <ModelSelector
          models={models}
          current={currentModel}
          loading={modelsLoading}
          error={modelsError}
          onSelect={onSelectModel}
          direction="down"
        />
      </div>
      <div className="chat-log" ref={scrollRef}>
        {log.length === 0 && !busy && (
          <div className="chat-empty-hint">
            <Bot size={20} />
            <span>Flow'a ne eklemek istersin?</span>
          </div>
        )}
        {log.map((entry, i) => (
          <LogLine
            key={i}
            entry={entry}
            onOptionPick={i === lastQuestionIndex ? handleOptionPick : undefined}
            optionsDisabled={busy || i !== lastQuestionIndex}
          />
        ))}
        {busy && (
          <div className="agent-busy-row">
            <span className="agent-busy-dots">
              <span />
              <span />
              <span />
            </span>
            <span className="agent-busy-text">
              {lastToolCall ? ACTION_LABELS[lastToolCall.name] || lastToolCall.name : 'Baslatiliyor'}
            </span>
          </div>
        )}
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Flow'u ne yapsin?"
          rows={1}
          disabled={busy}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <button type="submit" className="chat-send-btn" disabled={busy || !text.trim()} title="Gonder">
          <ArrowUp size={15} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
