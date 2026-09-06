import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Send, Square, User, X, Check, HelpCircle, Flag, AlertTriangle } from "lucide-react";
import { useT } from "../i18n";
import ModelSelector from "./ModelSelector";
import { createExecutor, type RecordStepFn } from "../lib/sapGuiAgent/tools";
import { createTranscript, runAgentTurn, type AgentEvent, type SapGuiUiContext } from "../lib/sapGuiAgent/agentRunner";
import { btn } from "../ui/buttons";
import type {
  AxetModelEntry,
  GuiScriptComponentDetail
} from "../../app-electron/shared/types";

type LogEntry = AgentEvent & { ts: number };

interface Props {
  connIdx: number | null;
  sessIdx: number | null;
  sessionInfo: Record<string, unknown> | undefined;
  selectedElementId: string;
  selectedNode: GuiScriptComponentDetail | null;
  recording: boolean;
  onRecordStep: RecordStepFn;
}

// Faz 3 — AI Agent ile doğal dil otomasyonu. `axet.flows`'un `AppShell.jsx`
// (handleSend/pushLog/chatLog/busy deseni) + `ChatPanel.jsx` (log render'ı)
// ile AYNI mimari — TEK fark: burada bir "Durdur" butonu var (`axetChat.ts`
// iptal deseninden ödünç alındı) çünkü bu agent GERÇEK SAP GUI aksiyonları
// uyguluyor, canvas'ta bir node eklemekten daha "geri alınamaz" olabilir.
export default function SapGuiAgentPanel({ connIdx, sessIdx, sessionInfo, selectedElementId, selectedNode, recording, onRecordStep }: Props) {
  const t = useT();
  const transcriptRef = useRef(createTranscript());
  const activeRequestIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");

  const [models, setModels] = useState<AxetModelEntry[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<AxetModelEntry | null>(null);
  const modelRef = useRef<string | null>(null);
  modelRef.current = currentModel ? `${currentModel.provider}/${currentModel.model}` : null;

  useEffect(() => {
    let cancelled = false;
    setModelsLoading(true);
    Promise.all([window.api.listAxetModels(), window.api.getAxetModelConfig()]).then(([modelsResult, configResult]) => {
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
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectModel = useCallback(async (entry: AxetModelEntry) => {
    const result = await window.api.setAxetModel("large", entry);
    if (result.ok) setCurrentModel(entry);
  }, []);

  const executeToolRef = useRef(createExecutor(null));
  useEffect(() => {
    const defaultSession = connIdx !== null && sessIdx !== null ? { connIdx, sessIdx } : null;
    executeToolRef.current = createExecutor(defaultSession, recording ? onRecordStep : undefined);
  }, [connIdx, sessIdx, recording, onRecordStep]);

  const pushLog = useCallback((entry: AgentEvent) => {
    setLog((prev) => [...prev, { ...entry, ts: Date.now() }]);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log, busy]);

  const uiContext: SapGuiUiContext = useMemo(
    () => ({
      connIdx,
      sessIdx,
      sessionInfo,
      selectedElementId: selectedElementId || undefined,
      selectedElementSummary: selectedNode ? { id: selectedNode.id, type: selectedNode.type, name: selectedNode.name } : null
    }),
    [connIdx, sessIdx, sessionInfo, selectedElementId, selectedNode]
  );

  const handleSend = useCallback(
    async (message: string) => {
      if (busy || !message.trim()) return;
      setBusy(true);
      cancelledRef.current = false;
      try {
        await runAgentTurn({
          model: modelRef.current,
          transcript: transcriptRef.current,
          userMessage: message,
          uiContext,
          executeTool: (name, args) => executeToolRef.current(name, args),
          onEvent: pushLog,
          onRequestIdChange: (id) => {
            activeRequestIdRef.current = id;
          },
          isCancelled: () => cancelledRef.current
        });
      } finally {
        setBusy(false);
        activeRequestIdRef.current = null;
      }
    },
    [busy, uiContext, pushLog]
  );

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (activeRequestIdRef.current) {
      window.api.cancelGuiScriptAgentStep(activeRequestIdRef.current).catch(() => {});
    }
  }, []);

  const handleComposerSubmit = () => {
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    handleSend(message);
  };

  const noSession = connIdx === null || sessIdx === null;

  return (
    <div className="flex h-80 shrink-0 flex-col overflow-hidden border-b border-line bg-card">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-3 py-2">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-accent-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("sapGuiScripting.agentPanel")}</span>
        </div>
        <ModelSelector
          models={models}
          current={currentModel}
          loading={modelsLoading}
          error={modelsError}
          onSelect={handleSelectModel}
          direction="up"
        />
      </div>

      {noSession && (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-slate-500">
          {t("sapGuiScripting.agentNoSession")}
        </div>
      )}

      {!noSession && (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {log.length === 0 && (
              <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">
                {t("sapGuiScripting.agentEmpty")}
              </div>
            )}
            <div className="space-y-1.5">
              {log.map((entry, i) => (
                <AgentLogRow
                  key={i}
                  entry={entry}
                  onPickOption={!busy && i === log.length - 1 ? handleSend : undefined}
                />
              ))}
              {busy && (
                <div className="flex items-center gap-1.5 py-1 text-xs text-slate-500">
                  <Loader2 size={12} className="animate-spin" />
                  {t("sapGuiScripting.agentThinking")}
                </div>
              )}
            </div>
            <div ref={logEndRef} />
          </div>
          <div className="flex shrink-0 items-end gap-1.5 border-t border-line-subtle p-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComposerSubmit();
                }
              }}
              disabled={busy}
              rows={1}
              placeholder={t("sapGuiScripting.agentPlaceholder")}
              className="flex-1 resize-none rounded-md border border-line bg-control px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-accent-500 disabled:opacity-60"
            />
            {busy ? (
              <button
                onClick={handleCancel}
                className={btn("danger", "sm")}
              >
                <Square size={12} />
                {t("sapGuiScripting.agentStop")}
              </button>
            ) : (
              <button
                onClick={handleComposerSubmit}
                disabled={!draft.trim()}
                className={btn("primary", "sm")}
              >
                <Send size={12} />
                {t("sapGuiScripting.agentSend")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AgentLogRow({ entry, onPickOption }: { entry: LogEntry; onPickOption?: (text: string) => void }) {
  if (entry.kind === "user") {
    return (
      <div className="flex items-start gap-2">
        <User size={13} className="mt-0.5 shrink-0 text-slate-500" />
        <span className="text-xs text-slate-200">{entry.text}</span>
      </div>
    );
  }
  if (entry.kind === "tool_call") {
    return (
      <div className="ml-5 flex items-start gap-1.5 text-[11px] text-accent-300">
        <span className="shrink-0 font-mono">→ {entry.name}</span>
        <span className="truncate font-mono text-slate-500">{JSON.stringify(entry.args)}</span>
      </div>
    );
  }
  if (entry.kind === "tool_result") {
    return (
      <div className={`ml-5 flex items-start gap-1.5 text-[11px] ${entry.error ? "text-[var(--status-danger-text)]" : "text-slate-500"}`}>
        {entry.error ? <AlertTriangle size={11} className="mt-0.5 shrink-0" /> : <Check size={11} className="mt-0.5 shrink-0" />}
        <span className="truncate font-mono">{entry.text}</span>
      </div>
    );
  }
  if (entry.kind === "question") {
    // `ask_user`'ın SEÇENEKLERİ ekrana hiç gelmiyordu: `tools.ts` onları
    // ayrıştırıyor, `agentRunner` olayla taşıyor, burada da `entry.options`
    // olarak DURUYORDU — ama render edilmiyordu. Yani sistem prompt'unun
    // agent'a "seçenek sun" demesinin ekranda hiçbir karşılığı yoktu;
    // kullanıcı cevabı elle yazmak zorundaydı. Canlı tıklamayla yakalandı
    // (2026-09-04). Yalnız SON soru tıklanabilir (`onPickOption` sadece o
    // satıra veriliyor) — eski bir soruya geri dönüp cevap göndermek
    // transkript sırasını bozardı.
    const options = entry.options ?? [];
    return (
      <div className="rounded-md border border-accent-500/30 bg-accent-500/10 px-2.5 py-1.5">
        <div className="flex items-start gap-2">
          <HelpCircle size={13} className="mt-0.5 shrink-0 text-accent-400" />
          <span className="text-xs text-slate-100">{entry.text}</span>
        </div>
        {options.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[21px]">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => onPickOption?.(opt)}
                disabled={!onPickOption}
                className="cursor-pointer rounded border border-accent-500/40 bg-accent-500/15 px-2 py-0.5 text-[11px] text-slate-100 hover:bg-accent-500/30 disabled:cursor-default disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
  if (entry.kind === "finish") {
    return (
      <div className="flex items-start gap-2 rounded-md border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-2.5 py-1.5">
        <Flag size={13} className="mt-0.5 shrink-0 text-[var(--status-success-text)]" />
        <span className="text-xs text-slate-100">{entry.text}</span>
      </div>
    );
  }
  if (entry.kind === "cancelled") {
    return (
      <div className="flex items-start gap-2 text-xs text-slate-500">
        <X size={13} className="mt-0.5 shrink-0" />
        {entry.text}
      </div>
    );
  }
  // error
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-2.5 py-1.5">
      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[var(--status-danger-text)]" />
      <span className="whitespace-pre-wrap text-xs text-[var(--status-danger-text)]">{entry.text}</span>
    </div>
  );
}
