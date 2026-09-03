import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  FolderOpen,
  GraduationCap,
  Info,
  ListTree,
  Loader2,
  MousePointerClick,
  Network,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Plug,
  PlugZap,
  RefreshCw,
  Save,
  Square,
  Stethoscope,
  Trash2,
  X
} from "lucide-react";
import { useT } from "../i18n";
import SapGuiAgentPanel from "./SapGuiAgentPanel";
import CommandBar from "./sapgui/CommandBar";
import ElementInspector from "./sapgui/ElementInspector";
import GuidePanel from "./sapgui/GuidePanel";
import PreflightPanel from "./sapgui/PreflightPanel";
import ScreenViewer from "./sapgui/ScreenViewer";
import StatusBarStrip from "./sapgui/StatusBarStrip";
import { CountBadge, EmptyState, GHOST_ICON_BUTTON, ICON_BUTTON, PRIMARY_BUTTON, PanelHeader, Pill, TOOL_BUTTON } from "./sapgui/ui";
import { vkeyLabel } from "../lib/sapGui/vkeys";
import type {
  GuiScriptActionKind,
  GuiScriptBridgeStatus,
  GuiScriptComponentDetail,
  GuiScriptComponentSummary,
  GuiScriptConnectionInfo,
  GuiScriptPlaybackStepResult,
  GuiScriptPreflight,
  GuiScriptRecordedStep,
  GuiScriptScreenState,
  GuiScriptScreenshotMethod,
  GuiScriptScreenshotResult,
  GuiScriptScript,
  GuiScriptSessionInfo
} from "../../app-electron/shared/types";

type NodeState = GuiScriptComponentDetail | "loading" | "error";

interface SelectedSession {
  connIdx: number;
  sessIdx: number;
}

const ROOT_KEY = "__root__";
const PLAYBACK_STEP_DELAY_MS = 350;

function nodeKey(connIdx: number, sessIdx: number, elementId: string): string {
  return `${connIdx}:${sessIdx}:${elementId || ROOT_KEY}`;
}

// Faz 2 — Kayıt + Tekrar Oynatma: kaydedilen bir adımın kısa, insan-okunur
// bir özetini üretir (adım listesinde gösterilir). Gerçek yürütme ANINDA
// `GuiScriptActionPayload`'a çevrilip `performGuiScriptAction`'a gönderiliyor
// — bu sadece görsel bir etiket, yürütme mantığına dahil değil.
function describeStep(
  action: GuiScriptActionKind,
  id: string | undefined,
  value: string | undefined,
  vkey: number | undefined,
  nodeLabel: string
): string {
  const target = nodeLabel || id || "wnd[0]";
  switch (action) {
    case "setText":
      return `setText("${value ?? ""}") → ${target}`;
    case "press":
      return `press() → ${target}`;
    case "select":
      return `select() → ${target}`;
    case "doubleClick":
      return `doubleClick() → ${target}`;
    case "sendVKey":
      return `sendVKey(${vkey ?? 0}) · ${vkeyLabel(vkey ?? 0)}`;
    case "selectContextMenuItem":
      return `selectContextMenuItem("${value ?? ""}") → ${target}`;
    case "navigate":
      return `navigate(/n${value ?? ""})`;
    case "popupChoice":
      return `popupChoice("${value ?? ""}")`;
    default:
      return `${action} → ${target}`;
  }
}

interface ActionExtra {
  value?: string;
  vkey?: number;
  /** Seçili eleman yerine BU id kullanılır (popup butonları gibi). */
  id?: string;
  /** Hiçbir elemana bağlanma — aksiyon aktif pencereye gider (komut çubuğu). */
  detached?: boolean;
  /** ALV grid'de `doubleClick` için satır/sütun (grid'de satır zorunlu). */
  row?: number;
  column?: string;
  /** `selectContextMenuItem` — öğe metne/koda/konuma göre mi seçilsin. */
  by?: "text" | "code" | "position";
}

// Bu ekran, `connectToSystem()`/.conn_adt akışına HİÇ bağlı değil — kullanıcının
// o an AÇIK olan bir SAP Logon/SAP GUI penceresine, gömülü Python+pywin32
// köprüsü (`sap_gui_scripting_bridge.py`, bkz. sapGuiScriptManager.ts)
// üzerinden bağlanır. Bağımsız bir Activity (bkz. ActivityBar.tsx/App.tsx).
//
// EKRAN DÜZENİ (sıfırdan kuruldu, bkz. PROJE-BILGI.md):
//   üst      → köprü kontrolleri (bağlan/kes, teşhis, rehber)
//   teşhis   → köprü çalışıyor ama scripting hazır değilse ÖNÜNE geçer
//   komut    → tcode (/n) + fonksiyon tuşları + Kaydet/Script/AI Agent
//   panel    → script kaydedici | AI agent (komut çubuğunun hemen altında)
//   sol      → oturumlar (üst) + COM eleman ağacı (alt)
//   orta     → CANLI EKRAN GÖRÜNTÜSÜ (seçili elemanın çerçevesiyle)
//   sağ      → eleman denetçisi (tüm özellikler + aksiyonlar + grid)
//   alt şerit→ popup + SAP durum çubuğu (aksiyonun GERÇEKTEN kabul edilip
//              edilmediğinin tek güvenilir kaynağı)
export default function SapGuiScriptingHome() {
  const t = useT();

  const [status, setStatus] = useState<GuiScriptBridgeStatus>({ running: false, port: null, external: false });
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Teşhis (preflight) — köprü çalışırken ölçülür; "hazır değil" ise çalışma
  // alanının ÖNÜNE geçer, çünkü bu durumda ağaç zaten boş gelecektir ve
  // kullanıcı sebebini göremeden uğraşır.
  const [preflight, setPreflight] = useState<GuiScriptPreflight | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [bypassPreflight, setBypassPreflight] = useState(false);

  const [connections, setConnections] = useState<GuiScriptConnectionInfo[] | "loading" | "error" | null>(null);
  const [sessionsByConn, setSessionsByConn] = useState<Record<number, GuiScriptSessionInfo[] | "loading" | "error">>({});
  const [expandedConn, setExpandedConn] = useState<Record<number, boolean>>({});

  const [activeSession, setActiveSession] = useState<SelectedSession | null>(null);
  const [nodesByKey, setNodesByKey] = useState<Record<string, NodeState>>({});
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedElementId, setSelectedElementId] = useState<string>("");

  const [screen, setScreen] = useState<GuiScriptScreenState | null>(null);
  const [shot, setShot] = useState<GuiScriptScreenshotResult | null>(null);
  const [shotLoading, setShotLoading] = useState(false);
  const [shotMethod, setShotMethod] = useState<GuiScriptScreenshotMethod>("auto");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Faz 2 — Kayıt + Tekrar Oynatma (RPA). Kayıt açıkken UI'dan tetiklenen HER
  // BAŞARILI aksiyon `steps` dizisine eklenir. Tekrar oynatma bu adımları
  // sırayla `performGuiScriptAction`'a gönderir (runAction'ı ATLAR — playback
  // sırasında yeni adım kaydedilmesin diye, kayıt açık bile olsa).
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<GuiScriptRecordedStep[]>([]);
  const [scriptName, setScriptName] = useState("");
  // Faz 3 — AI Agent paneli de Faz 2'nin Script paneliyle AYNI "alt panel"
  // yerini paylaşıyor; ikisi birlikte açık olmaz.
  const [bottomPanel, setBottomPanel] = useState<"script" | "agent" | null>(null);
  const [scriptMessage, setScriptMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState<number | null>(null);
  const [playResults, setPlayResults] = useState<GuiScriptPlaybackStepResult[]>([]);

  const recordStep = useCallback((step: GuiScriptRecordedStep) => {
    setSteps((prev) => [...prev, step]);
  }, []);

  const refreshStatus = useCallback(async () => {
    const next = await window.api.getGuiScriptBridgeStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const runPreflight = useCallback(async () => {
    setPreflightLoading(true);
    setPreflightError(null);
    try {
      const result = await window.api.guiScriptPreflight();
      if (result.ok && result.preflight) {
        setPreflight(result.preflight);
      } else {
        setPreflight(null);
        setPreflightError(result.error ?? null);
      }
    } finally {
      setPreflightLoading(false);
    }
  }, []);

  const loadConnections = useCallback(async () => {
    setConnections("loading");
    const result = await window.api.listGuiScriptConnections();
    if (result.ok && result.connections) {
      setConnections(result.connections);
    } else {
      setConnections("error");
      setStartError(result.error ?? null);
    }
  }, []);

  const handleStart = useCallback(async () => {
    setStarting(true);
    setStartError(null);
    try {
      const result = await window.api.startGuiScriptBridge();
      setStatus({ running: result.running, port: result.port, external: false });
      if (!result.ok) {
        setStartError(result.message);
        return;
      }
      await runPreflight();
      await loadConnections();
    } finally {
      setStarting(false);
    }
  }, [loadConnections, runPreflight]);

  const handleStop = useCallback(async () => {
    await window.api.stopGuiScriptBridge();
    setStatus({ running: false, port: null, external: false });
    setConnections(null);
    setSessionsByConn({});
    setActiveSession(null);
    setNodesByKey({});
    setExpandedNodes({});
    setSelectedElementId("");
    setScreen(null);
    setShot(null);
    setPreflight(null);
    setBypassPreflight(false);
    setShowPreflight(false);
  }, []);

  const loadSessions = useCallback(async (connIdx: number) => {
    setSessionsByConn((prev) => ({ ...prev, [connIdx]: "loading" }));
    const result = await window.api.listGuiScriptSessions(connIdx);
    setSessionsByConn((prev) => ({
      ...prev,
      [connIdx]: result.ok && result.sessions ? result.sessions : "error"
    }));
  }, []);

  const toggleConn = (connIdx: number) => {
    setExpandedConn((prev) => {
      const willExpand = !prev[connIdx];
      if (willExpand && !sessionsByConn[connIdx]) loadSessions(connIdx);
      return { ...prev, [connIdx]: willExpand };
    });
  };

  const loadNode = useCallback(async (connIdx: number, sessIdx: number, elementId: string) => {
    const key = nodeKey(connIdx, sessIdx, elementId);
    setNodesByKey((prev) => ({ ...prev, [key]: "loading" }));
    const result = await window.api.getGuiScriptNode(connIdx, sessIdx, elementId || null);
    setNodesByKey((prev) => ({ ...prev, [key]: result.ok && result.node ? result.node : "error" }));
    return result.ok ? result.node : null;
  }, []);

  // Oturum YOKKEN de çalışır. Sunucu tarafı scripting kapalıyken
  // (`DisabledByServer`) hiçbir oturum çözülemez, ama `window` yakalama COM'a
  // hiç dokunmaz — kullanıcının canlı SAP ekranını görebildiği tek yol odur.
  // Burada erken dönmek, o yeteneği tam ihtiyaç duyulduğu anda kapatıyordu.
  const refreshScreenshot = useCallback(
    async (session: SelectedSession | null = activeSession, method: GuiScriptScreenshotMethod = shotMethod) => {
      setShotLoading(true);
      try {
        const result = session
          ? await window.api.captureGuiScriptScreenshot(session.connIdx, session.sessIdx, method)
          : await window.api.captureGuiScriptScreenshot(null, null, "window");
        setShot(result);
      } finally {
        setShotLoading(false);
      }
    },
    [activeSession, shotMethod]
  );

  const refreshScreen = useCallback(
    async (session: SelectedSession | null = activeSession) => {
      if (!session) return;
      const result = await window.api.getGuiScriptScreen(session.connIdx, session.sessIdx);
      if (result.ok && result.screen) setScreen(result.screen);
    },
    [activeSession]
  );

  const handleSelectSession = useCallback(
    (connIdx: number, sessIdx: number) => {
      const next = { connIdx, sessIdx };
      setActiveSession(next);
      setSelectedElementId("");
      setActionError(null);
      setExpandedNodes({ [nodeKey(connIdx, sessIdx, "")]: true });
      loadNode(connIdx, sessIdx, "");
      refreshScreen(next);
      refreshScreenshot(next);
    },
    [loadNode, refreshScreen, refreshScreenshot]
  );

  // Yakalama yöntemi değiştiğinde görüntüyü tazele — kullanıcı hardcopy ↔
  // window arasında geçiş yaptığında beklediği şey budur.
  const firstMethodRun = useRef(true);
  useEffect(() => {
    if (firstMethodRun.current) {
      firstMethodRun.current = false;
      return;
    }
    refreshScreenshot(activeSession, shotMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotMethod]);

  // Oturum seçilemeyen sistemlerde (scripting sunucuda kapalı) ekran alanı
  // boş kalmasın: köprü ayaktaysa ve elde görüntü yoksa oturumsuz `window`
  // yakalamayı bir kez kendiliğinden dene.
  const sessionlessShotTried = useRef(false);
  useEffect(() => {
    if (!status.running || activeSession || shot || sessionlessShotTried.current) return;
    sessionlessShotTried.current = true;
    refreshScreenshot(null, "window");
  }, [status.running, activeSession, shot, refreshScreenshot]);

  const toggleNode = (elementId: string) => {
    if (!activeSession) return;
    const key = nodeKey(activeSession.connIdx, activeSession.sessIdx, elementId);
    setExpandedNodes((prev) => {
      const willExpand = !prev[key];
      if (willExpand && !nodesByKey[key]) loadNode(activeSession.connIdx, activeSession.sessIdx, elementId);
      return { ...prev, [key]: willExpand };
    });
  };

  const handleSelectElement = (elementId: string) => {
    if (!activeSession) return;
    setSelectedElementId(elementId);
    setActionError(null);
    const key = nodeKey(activeSession.connIdx, activeSession.sessIdx, elementId);
    if (!nodesByKey[key]) loadNode(activeSession.connIdx, activeSession.sessIdx, elementId);
  };

  const selectedNode: NodeState | null = activeSession
    ? nodesByKey[nodeKey(activeSession.connIdx, activeSession.sessIdx, selectedElementId)] ?? null
    : null;
  const selectedDetail = selectedNode && typeof selectedNode !== "string" ? selectedNode : null;

  const runAction = useCallback(
    async (action: GuiScriptActionKind, extra?: ActionExtra) => {
      if (!activeSession) return;
      const targetId =
        extra?.id !== undefined ? extra.id : extra?.detached ? undefined : selectedElementId || undefined;
      setActionBusy(true);
      setActionError(null);
      try {
        const result = await window.api.performGuiScriptAction(activeSession.connIdx, activeSession.sessIdx, {
          action,
          id: targetId,
          value: extra?.value,
          vkey: extra?.vkey,
          row: extra?.row,
          column: extra?.column,
          by: extra?.by
        });
        // Aksiyon SONRASI ekran durumu aksiyonun kendi yanıtıyla geliyor —
        // ayrı bir okuma turu yok. Durum çubuğu burada: COM'un "başarılı"sı
        // SAP'nin "kabul ettim"i DEĞİL (bkz. StatusBarStrip.tsx).
        if (result.screen) setScreen(result.screen);
        if (!result.ok) {
          setActionError(t("sapGuiScripting.actionError", { error: result.error ?? "?" }));
          return;
        }
        if (recording) {
          const nodeLabel = selectedDetail ? selectedDetail.name || selectedDetail.type : "";
          recordStep({
            action,
            id: targetId,
            value: extra?.value,
            vkey: extra?.vkey,
            label: describeStep(action, targetId, extra?.value, extra?.vkey, nodeLabel)
          });
        }
        // Ekran değişmiş olabilir: seçili eleman artık var olmayabilir, bu
        // yüzden ağacın kökü de tazeleniyor.
        setNodesByKey({});
        setExpandedNodes({ [nodeKey(activeSession.connIdx, activeSession.sessIdx, "")]: true });
        await loadNode(activeSession.connIdx, activeSession.sessIdx, "");
        if (selectedElementId) await loadNode(activeSession.connIdx, activeSession.sessIdx, selectedElementId);
        if (autoRefresh) await refreshScreenshot(activeSession);
      } finally {
        setActionBusy(false);
      }
    },
    [activeSession, selectedElementId, selectedDetail, recording, recordStep, loadNode, autoRefresh, refreshScreenshot, t]
  );

  const handleToggleRecording = () => {
    setRecording((prev) => !prev);
    setScriptMessage(null);
  };

  const handleClearSteps = () => {
    setSteps([]);
    setPlayResults([]);
    setScriptMessage(null);
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveScript = useCallback(async () => {
    if (steps.length === 0) return;
    const script: GuiScriptScript = { name: scriptName || "SAP GUI Script", createdAt: Date.now(), steps };
    const jsonText = JSON.stringify(script, null, 2);
    const suggestedName = `${(scriptName || "sap-gui-script").trim().replace(/\s+/g, "-").toLowerCase() || "sap-gui-script"}.json`;
    const result = await window.api.saveGuiScriptScript(jsonText, suggestedName);
    if (!result.canceled) {
      setScriptMessage(result.filePath ? { ok: true, text: result.filePath } : { ok: false, text: result.error ?? "?" });
    }
  }, [steps, scriptName]);

  const handleOpenScript = useCallback(async () => {
    const result = await window.api.openGuiScriptScript();
    if (result.canceled || !result.content) return;
    try {
      const parsed = JSON.parse(result.content) as GuiScriptScript;
      setSteps(Array.isArray(parsed.steps) ? parsed.steps : []);
      setScriptName(parsed.name || "");
      setPlayResults([]);
      setScriptMessage(null);
    } catch (err) {
      setScriptMessage({ ok: false, text: (err as Error).message });
    }
  }, []);

  const handlePlayScript = useCallback(async () => {
    if (!activeSession || steps.length === 0 || playing) return;
    setPlaying(true);
    setPlayResults([]);
    for (let i = 0; i < steps.length; i++) {
      setPlayIndex(i);
      const step = steps[i];
      // Playback DOĞRUDAN `performGuiScriptAction`'ı çağırıyor - `runAction`'ı
      // BİLEREK atlıyor, aksi halde `recording` açıksa oynatılan adımlar
      // sonsuz şekilde tekrar kaydedilirdi.
      const result = await window.api.performGuiScriptAction(activeSession.connIdx, activeSession.sessIdx, {
        action: step.action,
        id: step.id,
        value: step.value,
        vkey: step.vkey
      });
      if (result.screen) setScreen(result.screen);
      setPlayResults((prev) => [...prev, { index: i, ok: result.ok, error: result.error }]);
      if (!result.ok) break;
      await new Promise((resolve) => setTimeout(resolve, PLAYBACK_STEP_DELAY_MS));
    }
    if (autoRefresh) await refreshScreenshot(activeSession);
    setPlaying(false);
    setPlayIndex(null);
  }, [activeSession, steps, playing, autoRefresh, refreshScreenshot]);

  const renderTreeNode = (summary: GuiScriptComponentSummary, depth: number) => {
    if (!activeSession) return null;
    const key = nodeKey(activeSession.connIdx, activeSession.sessIdx, summary.id);
    const isExpanded = expandedNodes[key] ?? false;
    const isSelected = selectedElementId === summary.id;
    const state = nodesByKey[key];
    const paddingLeft = depth * 12 + 8;

    return (
      <div key={summary.id || key}>
        <div
          className={`flex w-full cursor-pointer items-center gap-1.5 rounded-sm py-1 pr-2 text-left ${
            isSelected ? "bg-accent-500/20 text-white" : "text-slate-300 hover:bg-base-700/60"
          }`}
          style={{ paddingLeft }}
          onClick={() => handleSelectElement(summary.id)}
        >
          {summary.hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(summary.id);
              }}
              className="shrink-0 cursor-pointer text-slate-500 hover:text-slate-200"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-[12px] shrink-0" />
          )}
          <span className="shrink-0 truncate font-mono text-[10px] text-accent-400">
            {(summary.type || t("sapGuiScripting.unknown")).replace(/^Gui/, "")}
          </span>
          <span className="truncate text-[11px]">{summary.name || summary.text || summary.id}</span>
        </div>
        {isExpanded && (
          <div>
            {state === "loading" && (
              <div className="py-1 text-[11px] text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                {t("sapGuiScripting.treeLoading")}
              </div>
            )}
            {state === "error" && (
              <div className="py-1 text-[11px] text-[var(--status-danger-text)]" style={{ paddingLeft: paddingLeft + 20 }}>
                {t("sapGuiScripting.treeError")}
              </div>
            )}
            {state && typeof state !== "string" && state.children.length === 0 && (
              <div className="py-1 text-[11px] text-slate-500" style={{ paddingLeft: paddingLeft + 20 }}>
                {t("sapGuiScripting.treeEmpty")}
              </div>
            )}
            {state && typeof state !== "string" && state.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootKey = activeSession ? nodeKey(activeSession.connIdx, activeSession.sessIdx, "") : "";
  const rootState = activeSession ? nodesByKey[rootKey] : null;

  const activeSessionInfo = activeSession
    ? (() => {
        const sessions = sessionsByConn[activeSession.connIdx];
        if (!Array.isArray(sessions)) return undefined;
        return sessions.find((s) => s.index === activeSession.sessIdx)?.info;
      })()
    : undefined;

  // Teşhis kapısı: köprü çalışıyor ama scripting hazır değilse çalışma alanı
  // yerine teşhis paneli gösterilir. Kullanıcı yine de geçebilir — ölçüm
  // yanlış olabilir diye değil, bir kenar durumu bu ekranı kilitlemesin diye.
  const preflightBlocking = Boolean(preflight && preflight.recommendation !== "ready" && !bypassPreflight);
  const preflightVisible = status.running && (showPreflight || preflightBlocking);

  const dockTab = (active: boolean) =>
    `flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium ${
      active
        ? "bg-accent-500/10 text-accent-300 ring-1 ring-inset ring-accent-500/30"
        : "text-slate-400 hover:bg-base-800 hover:text-slate-200"
    }`;

  return (
    // `relative`: rehber çekmecesi bu kutunun içine `absolute` konumlanıyor —
    // uygulamanın geri kalanını (sol kenar çubuğu vb.) örtmesin diye.
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Başlık çubuğu — SADECE bağlantı alanı. Kayıt/Script/Agent düğmeleri
          buradan alınıp komut çubuğunun boş orta bölgesine taşındı: altı düğmenin
          aynı tonda yan yana dizildiği eski hâlde hangisinin ne yaptığı da,
          hangisinin daha önemli olduğu da okunmuyordu. */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-base-700 bg-base-900 px-3">
        <MousePointerClick size={15} className="shrink-0 text-accent-400" />
        <div className="min-w-0">
          <h1 className="truncate text-[13px] font-semibold leading-tight text-slate-100">{t("sapGuiScripting.title")}</h1>
          {/* Alt başlık yalnızca köprü kapalıyken: bir kez okunacak bir cümle
              için her oturumda 18 piksel harcamanın anlamı yok. */}
          {!status.running && <p className="truncate text-[11px] leading-tight text-slate-500">{t("sapGuiScripting.subtitle")}</p>}
        </div>

        <span
          className="ml-1 flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-base-700 bg-base-800 px-2.5 text-[10px] font-medium text-slate-400"
          title={t("sapGuiScripting.bridgeRunning", { port: status.port ?? "" })}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              starting
                ? "animate-pulse bg-[var(--status-warning-text)]"
                : status.running
                  ? "bg-[var(--status-success-text)]"
                  : "bg-slate-600"
            }`}
          />
          {starting
            ? t("sapGuiScripting.bridgeStarting")
            : status.running
              ? t("sapGuiScripting.bridgeRunning", { port: status.port ?? "" })
              : t("sapGuiScripting.bridgeStopped")}
        </span>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {status.running && (
            <>
              <button
                onClick={() => {
                  setShowPreflight((v) => !v);
                  if (!showPreflight) runPreflight();
                }}
                title={t("sapGuiScripting.preflight.title")}
                className={preflightVisible ? `${TOOL_BUTTON} border-accent-500 bg-accent-500/10 text-accent-300` : TOOL_BUTTON}
              >
                <Stethoscope size={13} />
                {t("sapGuiScripting.preflight.title")}
              </button>
              <button onClick={loadConnections} title={t("sapGuiScripting.refresh")} className={ICON_BUTTON}>
                <RefreshCw size={13} />
              </button>
            </>
          )}
          {/* Köprü kapalıyken de görünür: rehbere en çok ihtiyaç duyulan an
              tam da "bağlanamıyorum" anı. */}
          <button
            onClick={() => setShowGuide(true)}
            title={t("sapGuiScripting.guideOpen")}
            className={showGuide ? `${TOOL_BUTTON} border-accent-500 bg-accent-500/10 text-accent-300` : TOOL_BUTTON}
          >
            <GraduationCap size={13} />
            {t("sapGuiScripting.guideOpen")}
          </button>

          <div className="mx-0.5 h-5 w-px bg-base-700" />

          {status.running ? (
            <button onClick={handleStop} className={TOOL_BUTTON}>
              <PlugZap size={13} />
              {t("sapGuiScripting.stopBridge")}
            </button>
          ) : (
            <button onClick={handleStart} disabled={starting} className={PRIMARY_BUTTON}>
              {starting ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
              {t("sapGuiScripting.startBridge")}
            </button>
          )}
        </div>
      </div>

      {startError && (
        <div className="shrink-0 border-b border-base-700 bg-[rgba(244,113,138,0.08)] px-4 py-2 text-xs text-[var(--status-danger-text)]">
          {startError}
        </div>
      )}

      {!status.running ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
          <div className="max-w-md rounded-lg border border-base-700 bg-base-900 p-5 text-center">
            <MousePointerClick size={22} className="mx-auto text-slate-600" />
            <h2 className="mt-3 text-sm font-semibold text-slate-100">{t("sapGuiScripting.requirementsTitle")}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{t("sapGuiScripting.requirementsBody")}</p>
            <button
              onClick={handleStart}
              disabled={starting}
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md bg-accent-500 px-3 py-2 text-xs font-medium text-accent-on hover:bg-accent-600 disabled:cursor-default disabled:opacity-60"
            >
              {starting ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
              {t("sapGuiScripting.startBridge")}
            </button>
          </div>
        </div>
      ) : preflightVisible ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <PreflightPanel preflight={preflight} loading={preflightLoading} error={preflightError} onRecheck={runPreflight} />
          <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-end gap-2 px-6 pb-6">
            {preflightBlocking && (
              <button
                onClick={() => {
                  setBypassPreflight(true);
                  setShowPreflight(false);
                  loadConnections();
                }}
                className="cursor-pointer rounded-md border border-base-700 bg-base-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-base-700"
              >
                {t("sapGuiScripting.preflight.continueAnyway")}
              </button>
            )}
            {!preflightBlocking && (
              <button
                onClick={() => setShowPreflight(false)}
                className="cursor-pointer rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-accent-on hover:bg-accent-600"
              >
                {t("sapGuiScripting.preflight.close")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Otomasyon düğmeleri KENDİ şeritlerinde değil, komut çubuğunun boş
              orta bölgesinde (bkz. CommandBar `dock`). Önce sağ üstteydi, sonra
              en alta, sonra ayrı bir üst şeride alındı; ayrı şerit her hâlinde
              36 piksel yiyordu, oysa fonksiyon tuşlarıyla vkey seçicisi arası
              zaten boştu. Açtıkları panel yine hemen altlarında. */}
          <CommandBar
            busy={actionBusy || !activeSession}
            toolbarKeys={screen?.toolbarKeys}
            onNavigate={(tcode) => runAction("navigate", { value: tcode, detached: true })}
            onVKey={(vkey) => runAction("sendVKey", { vkey, detached: true })}
            dock={
              <>
                {activeSession && (
                  <button
                    onClick={handleToggleRecording}
                    title={recording ? t("sapGuiScripting.stopRecording") : t("sapGuiScripting.startRecording")}
                    className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${
                      recording
                        ? "border-[rgba(244,113,138,0.4)] bg-[rgba(244,113,138,0.14)] text-[var(--status-danger-text)]"
                        : "border-base-700 bg-base-800 text-slate-200 hover:bg-base-700"
                    }`}
                  >
                    {recording ? <Square size={11} /> : <Circle size={11} className="fill-current" />}
                    {recording ? t("sapGuiScripting.stopRecording") : t("sapGuiScripting.startRecording")}
                  </button>
                )}
                <button onClick={() => setBottomPanel((p) => (p === "script" ? null : "script"))} className={dockTab(bottomPanel === "script")}>
                  <ListTree size={13} />
                  {t("sapGuiScripting.scriptPanel")}
                  <CountBadge value={steps.length} />
                </button>
                <button onClick={() => setBottomPanel((p) => (p === "agent" ? null : "agent"))} className={dockTab(bottomPanel === "agent")}>
                  <Bot size={13} />
                  {t("sapGuiScripting.agentPanel")}
                </button>
              </>
            }
          />

          {bottomPanel === "script" && (
            <div className="flex h-60 shrink-0 flex-col overflow-hidden border-b border-base-700 bg-base-900">
              {/* Panel başlığı sekmeyle tekrar etmiyor: burada yalnızca script'in
                  KENDİ eylemleri var (ad, oynat, kaydet, aç, temizle). */}
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-base-800 px-2.5">
                <input
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder={t("sapGuiScripting.scriptNamePlaceholder")}
                  className="h-7 w-52 rounded-md border border-base-700 bg-base-800 px-2 text-xs text-slate-100 outline-none focus:border-accent-500"
                />
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={handlePlayScript}
                    disabled={!activeSession || steps.length === 0 || playing}
                    title={t("sapGuiScripting.play")}
                    className={TOOL_BUTTON}
                  >
                    {playing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                    {t("sapGuiScripting.play")}
                  </button>
                  <button onClick={handleSaveScript} disabled={steps.length === 0} title={t("sapGuiScripting.saveScript")} className={ICON_BUTTON}>
                    <Save size={13} />
                  </button>
                  <button onClick={handleOpenScript} title={t("sapGuiScripting.openScript")} className={ICON_BUTTON}>
                    <FolderOpen size={13} />
                  </button>
                  <button onClick={handleClearSteps} disabled={steps.length === 0} title={t("sapGuiScripting.clearSteps")} className={ICON_BUTTON}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {scriptMessage && (
                <div className={`shrink-0 px-3 py-1.5 text-xs ${scriptMessage.ok ? "text-[var(--status-success-text)]" : "text-[var(--status-danger-text)]"}`}>
                  {scriptMessage.text}
                </div>
              )}
              <div className="flex-1 overflow-y-auto px-2 py-1.5">
                {steps.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-xs text-slate-500">
                    {t("sapGuiScripting.stepsEmpty")}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {steps.map((step, i) => {
                      const result = playResults.find((r) => r.index === i);
                      const isCurrent = playIndex === i;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                            isCurrent ? "bg-accent-500/15 ring-1 ring-inset ring-accent-500/50" : "bg-base-850"
                          }`}
                        >
                          <span className="w-5 shrink-0 text-center text-[10px] text-slate-500">{i + 1}</span>
                          <span className="shrink-0">
                            {result ? (
                              result.ok ? (
                                <Check size={13} className="text-[var(--status-success-text)]" />
                              ) : (
                                <X size={13} className="text-[var(--status-danger-text)]" />
                              )
                            ) : isCurrent ? (
                              <Loader2 size={13} className="animate-spin text-accent-400" />
                            ) : (
                              <span className="inline-block h-[13px] w-[13px]" />
                            )}
                          </span>
                          <span className="flex-1 truncate font-mono text-[11px] text-slate-300" title={step.label}>
                            {step.label}
                          </span>
                          {result && !result.ok && (
                            <span className="max-w-[240px] truncate text-[10px] text-[var(--status-danger-text)]" title={result.error}>
                              {result.error}
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveStep(i)}
                            disabled={playing}
                            className="shrink-0 cursor-pointer text-slate-500 hover:text-[var(--status-danger-text)] disabled:cursor-default disabled:opacity-40"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {bottomPanel === "agent" && (
            <SapGuiAgentPanel
              connIdx={activeSession?.connIdx ?? null}
              sessIdx={activeSession?.sessIdx ?? null}
              sessionInfo={activeSessionInfo}
              selectedElementId={selectedElementId}
              selectedNode={selectedDetail}
              recording={recording}
              onRecordStep={recordStep}
            />
          )}

          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Sol: oturumlar (üst) + eleman ağacı (alt) */}
            <div className="flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-base-700 bg-base-900/60">
              <div className="flex max-h-[45%] min-h-0 flex-col overflow-hidden">
                <PanelHeader
                  icon={<Network size={12} className="text-slate-500" />}
                  title={t("sapGuiScripting.connectionsTitle")}
                >
                  <CountBadge value={Array.isArray(connections) ? connections.length : 0} />
                </PanelHeader>
                <div className="min-h-0 flex-1 overflow-y-auto py-1">
                  {connections === "loading" && <div className="px-3 py-2 text-[11px] text-slate-500">{t("sapGuiScripting.treeLoading")}</div>}
                  {(connections === "error" || (Array.isArray(connections) && connections.length === 0)) && (
                    <div className="px-3 py-2 text-[11px] leading-relaxed text-slate-500">{t("sapGuiScripting.connectionsEmpty")}</div>
                  )}
                  {Array.isArray(connections) &&
                    connections.map((conn) => {
                      const isExpanded = expandedConn[conn.index] ?? false;
                      const sessions = sessionsByConn[conn.index];
                      return (
                        <div key={conn.index}>
                          <button
                            onClick={() => toggleConn(conn.index)}
                            className="flex w-full cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-left text-[11px] font-medium text-slate-300 hover:bg-base-800"
                          >
                            {isExpanded ? (
                              <ChevronDown size={12} className="shrink-0 text-slate-500" />
                            ) : (
                              <ChevronRight size={12} className="shrink-0 text-slate-500" />
                            )}
                            <span className="truncate">{conn.description || `#${conn.index}`}</span>
                          </button>
                          {isExpanded && (
                            <div>
                              {sessions === "loading" && <div className="px-6 py-1 text-xs text-slate-500">{t("sapGuiScripting.treeLoading")}</div>}
                              {sessions === "error" && <div className="px-6 py-1 text-xs text-slate-500">{t("sapGuiScripting.treeError")}</div>}
                              {Array.isArray(sessions) && sessions.length === 0 && (
                                <div className="px-6 py-1 text-xs text-slate-500">{t("sapGuiScripting.sessionsEmpty")}</div>
                              )}
                              {Array.isArray(sessions) &&
                                sessions.map((session) => {
                                  const isActive = activeSession?.connIdx === conn.index && activeSession?.sessIdx === session.index;
                                  return (
                                    <button
                                      key={session.index}
                                      onClick={() => handleSelectSession(conn.index, session.index)}
                                      className={`flex w-full cursor-pointer flex-col gap-0.5 border-l-2 py-1.5 pl-5 pr-2.5 text-left ${
                                        isActive
                                          ? "border-accent-500 bg-accent-500/10 text-white"
                                          : "border-transparent text-slate-300 hover:bg-base-800"
                                      }`}
                                    >
                                      <span className="truncate text-[11px] font-medium">
                                        {session.info.Transaction || session.info.Program || `Session ${session.index}`}
                                      </span>
                                      <span className="truncate text-[10px] text-slate-500">
                                        {[session.info.SystemName, session.info.Client, session.info.User].filter(Boolean).join(" · ")}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-base-700">
                <PanelHeader icon={<ListTree size={12} className="text-slate-500" />} title={t("sapGuiScripting.treeTitle")} />
                <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
                  {!activeSession && <EmptyState icon={<ListTree size={20} />} text={t("sapGuiScripting.selectSession")} />}
                  {activeSession && rootState === "loading" && <div className="px-2 py-2 text-[11px] text-slate-500">{t("sapGuiScripting.treeLoading")}</div>}
                  {activeSession && rootState === "error" && <div className="px-2 py-2 text-[11px] text-slate-500">{t("sapGuiScripting.treeError")}</div>}
                  {activeSession &&
                    rootState &&
                    typeof rootState !== "string" &&
                    renderTreeNode(
                      {
                        id: rootState.id,
                        type: rootState.type,
                        name: rootState.name,
                        text: rootState.text,
                        hasChildren: rootState.children.length > 0
                      },
                      0
                    )}
                </div>
              </div>
            </div>

            {/* Orta: canlı ekran */}
            <ScreenViewer
              shot={shot}
              loading={shotLoading}
              method={shotMethod}
              autoRefresh={autoRefresh}
              selectedNode={selectedDetail}
              onMethodChange={setShotMethod}
              onAutoRefreshChange={setAutoRefresh}
              onRefresh={() => refreshScreenshot()}
            />

            {/* Sağ: eleman denetçisi — KATLANABİLİR. 1280 piksellik bir pencerede
                380 piksel sabit ayrılıyordu ve eleman seçili değilken tamamı
                boş duruyordu; o genişlik asıl işi gören canlı ekrandan
                çalınıyordu. Katlanınca dikey etiketli ince bir şeride iniyor. */}
            {inspectorOpen ? (
              <div className="flex w-[340px] shrink-0 flex-col overflow-hidden border-l border-base-700 bg-base-900/60">
                <PanelHeader
                  icon={<Info size={12} className="text-slate-500" />}
                  title={t("sapGuiScripting.detailTitle")}
                  right={
                    <>
                      {screen?.transaction && (
                        <Pill>
                          {screen.transaction}
                          {screen.screenNumber ? ` · ${screen.screenNumber}` : ""}
                        </Pill>
                      )}
                      <button
                        onClick={() => setInspectorOpen(false)}
                        title={t("sapGuiScripting.collapsePanel")}
                        className={GHOST_ICON_BUTTON}
                      >
                        <PanelRightClose size={13} />
                      </button>
                    </>
                  }
                />
                <ElementInspector
                  node={selectedDetail}
                  state={selectedNode === "loading" ? "loading" : selectedNode === "error" ? "error" : null}
                  busy={actionBusy}
                  onAction={(action, value, extra) => runAction(action, { value, ...extra })}
                />
              </div>
            ) : (
              <button
                onClick={() => setInspectorOpen(true)}
                title={t("sapGuiScripting.expandPanel")}
                className="flex w-8 shrink-0 cursor-pointer flex-col items-center gap-2 border-l border-base-700 bg-base-900/60 pt-2 text-slate-500 hover:bg-base-800 hover:text-white"
              >
                <PanelRightOpen size={13} />
                <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] [writing-mode:vertical-rl]">
                  {t("sapGuiScripting.detailTitle")}
                </span>
              </button>
            )}
          </div>

          {actionError && (
            <div className="shrink-0 border-t border-base-700 bg-[rgba(244,113,138,0.08)] px-3 py-1.5 text-xs text-[var(--status-danger-text)]">
              {actionError}
            </div>
          )}

          <StatusBarStrip
            screen={screen}
            busy={actionBusy}
            onPopupChoice={(choice) => runAction("popupChoice", { value: choice, detached: true })}
            onPopupButton={(buttonId) => runAction("press", { id: buttonId })}
          />

        </div>
      )}

      {showGuide && <GuidePanel onClose={() => setShowGuide(false)} />}
    </div>
  );
}
