import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Circle,
  FolderOpen,
  GraduationCap,
  Info,
  ListTree,
  Loader2,
  MousePointerClick,
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
import { useT, type TranslateFn } from "../i18n";
import SapGuiAgentPanel from "./SapGuiAgentPanel";
import CommandBar from "./sapgui/CommandBar";
import ElementInspector from "./sapgui/ElementInspector";
import GuidePanel from "./sapgui/GuidePanel";
import PreflightPanel from "./sapgui/PreflightPanel";
import ScreenViewer from "./sapgui/ScreenViewer";
import StatusBarStrip from "./sapgui/StatusBarStrip";
import { CountBadge, GHOST_ICON_BUTTON, ICON_BUTTON, PRIMARY_BUTTON, PanelHeader, Pill, TOOL_BUTTON } from "./sapgui/ui";
import { btn } from "../ui/buttons";
import { vkeyLabel } from "../lib/sapGui/vkeys";
import { useScriptStore, type ScriptCommands, type SessionsByConn } from "../stores/scriptStore";
import { nodeKey, type NodeState, type SelectedSession } from "../stores/scriptTypes";
import type {
  ActiveSapContext,
  GuiScriptActionKind,
  GuiScriptBridgeStatus,
  GuiScriptPlaybackStepResult,
  GuiScriptPreflight,
  GuiScriptRecordedStep,
  GuiScriptScreenState,
  GuiScriptScreenshotMethod,
  GuiScriptScreenshotResult,
  GuiScriptScript
} from "../../app-electron/shared/types";

// Diskten açılan bir script'in adımlarını doğrulamak için TANINAN aksiyonlar.
// `Record<GuiScriptActionKind, true>` üzerinden türetiliyor: birliğe yeni bir
// aksiyon eklenirse burası derlenmez — listenin sessizce eskimesi, doğrulamayı
// doğrulama olmaktan çıkarırdı (geçerli bir adım "tanınmadı" diye atılırdı).
const GUI_SCRIPT_ACTIONS = Object.keys({
  setText: true,
  press: true,
  select: true,
  sendVKey: true,
  selectContextMenuItem: true,
  doubleClick: true,
  navigate: true,
  popupChoice: true
} satisfies Record<GuiScriptActionKind, true>) as GuiScriptActionKind[];

// SAP GUI'nin bildirdiği sistem, Launcher'ın bağlandığı sistemle aynı mı?
// GUI tarafı SID'i `systemName`'de veriyor; Launcher'da karşılığı `systemId`.
// Client de karşılaştırılıyor: aynı sistemin iki client'ı FARKLI veri
// demek. `client` bazı ekranlarda hiç gelmiyor — gelmediğinde o kısım
// sessizce eşleşmiş sayılıyor, yoksa her ekranda yanlış bir uyarı çıkardı.
function sameSystem(screen: GuiScriptScreenState, sap: ActiveSapContext): boolean {
  const sidMatch = (screen.systemName ?? "").trim().toUpperCase() === sap.systemId.trim().toUpperCase();
  if (!sidMatch) return false;
  if (!screen.client) return true;
  return screen.client.trim() === sap.client.trim();
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
  nodeLabel: string,
  // Etiketin TEK çevrilen parçası tuş anlamı (`vkeyLabel`) — gerisi kasten
  // kod gibi okunuyor (`setText("X") → GD-TAB`). Etiket kaydedilen script'e
  // YAZILIYOR, yani kayıt anındaki dil dosyada kalır; dili sonradan
  // değiştirmek eski adımların yazısını geçmişe dönük değiştirmez.
  t: TranslateFn,
  extra?: { row?: number; column?: string; by?: string }
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
      // Grid'de satır/sütun etiketin PARÇASI: onlarsız iki farklı adım
      // listede birebir aynı görünüyordu.
      return extra?.row !== undefined
        ? `doubleClick(${extra.row}, "${extra.column ?? ""}") → ${target}`
        : `doubleClick() → ${target}`;
    case "sendVKey":
      return `sendVKey(${vkey ?? 0}) · ${vkeyLabel(vkey ?? 0, t)}`;
    case "selectContextMenuItem":
      return `selectContextMenuItem("${value ?? ""}"${extra?.by ? `, ${extra.by}` : ""}) → ${target}`;
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
// üzerinden bağlanır. Bağımsız bir Activity (bkz. src/shell/activity.ts, App.tsx).
//
// EKRAN DÜZENİ (sıfırdan kuruldu, bkz. PROJE-BILGI.md):
//   üst      → köprü kontrolleri (bağlan/kes, teşhis, rehber)
//   teşhis   → köprü çalışıyor ama scripting hazır değilse ÖNÜNE geçer
//   komut    → tcode (/n) + fonksiyon tuşları + Kaydet/Script/AI Agent
//   panel    → script kaydedici | AI agent (komut çubuğunun hemen altında)
//   sol      → oturumlar (üst) + COM eleman ağacı (alt); ekranın dışında,
//              kenar çubuğunda (`ScriptSidebar`, veri `ScriptStore`'da)
//   orta     → CANLI EKRAN GÖRÜNTÜSÜ (seçili elemanın çerçevesiyle)
//   sağ      → eleman denetçisi (tüm özellikler + aksiyonlar + grid)
//   alt şerit→ popup + SAP durum çubuğu (aksiyonun GERÇEKTEN kabul edilip
//              edilmediğinin tek güvenilir kaynağı)
export default function SapGuiScriptingHome({ activeSap }: { activeSap: ActiveSapContext | null }) {
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

  // Ağaç verisi store'da (grafit, spec §5.2): bu ekran başka bir moda
  // geçilince unmount oluyor, seçili oturum ve açık düğümler dönüşte
  // yerinde dursun.
  const {
    connections,
    setConnections,
    sessionsByConn,
    setSessionsByConn,
    expandedConn,
    setExpandedConn,
    activeSession,
    setActiveSession,
    nodesByKey,
    setNodesByKey,
    setExpandedNodes,
    selectedElementId,
    setSelectedElementId,
    setTreeVisible,
    clearSelection,
    registerScriptCommands
  } = useScriptStore();
  // Dönüş doğrulamasının sonunda "şu an hangi bağlantılar açık" sorusu için
  // (bkz. `revalidateAfterReturn`); oradaki `expandedConn` mount anınınki.
  const expandedConnRef = useRef(expandedConn);
  expandedConnRef.current = expandedConn;

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

  // Durum bir kez okunmadan kenar çubuğuna "görünür/görünmez" yazılmıyor
  // (bkz. `treeVisible` efekti). Aksi hâlde dönüşte ağaç bir kare
  // "Köprü kapalı"ya düşüp geri gelirdi.
  const [statusKnown, setStatusKnown] = useState(false);
  const refreshStatus = useCallback(async () => {
    const next = await window.api.getGuiScriptBridgeStatus();
    setStatus(next);
    setStatusKnown(true);
    return next;
  }, []);

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

  // Dönüş doğrulamasının kuşağı (bkz. `revalidateAfterReturn`). Kullanıcının
  // ağaca dokunan her kararı (oturum seçmek, köprüyü durdurmak, ağacı
  // temizlemek) ve ekrandan çıkmak bunu artırıyor. Doğrulama her `await`
  // sonrasında kendi kuşağına bakıyor; değişmişse sonucunu yazmadan
  // çekiliyor, yoksa eski bir cevap kullanıcının yeni seçimini ezerdi.
  const revalidationGen = useRef(0);
  useEffect(
    () => () => {
      revalidationGen.current += 1;
    },
    []
  );

  // Köprü yokken ağaç da yok. Durdurma düğmesi ve dönüşte köprünün
  // kapanmış bulunması aynı temizliği yapıyor.
  const clearTree = useCallback(() => {
    revalidationGen.current += 1;
    setConnections(null);
    setSessionsByConn({});
    setExpandedConn({});
    clearSelection();
  }, [setConnections, setSessionsByConn, setExpandedConn, clearSelection]);

  // Köprü ZATEN çalışırken bu ekrana gelindiğinde bağlantılar KENDİLİĞİNDEN
  // yüklenir. Önceden `loadConnections` yalnızca "Bağlan" düğmesinden, küçük
  // yenile ikonundan ve preflight'ın "yine de devam et"inden çağrılıyordu —
  // yani hepsi kullanıcı tıklamasıydı. Köprü uygulama açılmadan önce ayaktaysa
  // (uygulama yeniden başlatıldı, köprüyü başka bir process başlattı, ya da
  // bu sekmeden çıkılıp geri dönüldü) başlık "Köprü çalışıyor (port 8790)"
  // diyor, BAĞLANTILAR listesi ise boş kalıyordu: çalışan bir köprünün yanında
  // hiçbir açıklaması olmayan boş bir liste. Canlı pencere görüntüsünde
  // yakalandı (2026-09-04) — kod okunarak değil, ekrana bakılarak.
  // TEK SEFER denenir: liste gerçekten boşsa (SAP Logon kapalı) her render'da
  // yeniden sorgulamanın anlamı yok, yenile ikonu zaten duruyor. `starting`
  // beklenir ki `handleStart`ın kendi çağrısıyla çakışıp iki kez sormasın.
  const autoLoadTried = useRef(false);
  useEffect(() => {
    if (!status.running || starting || connections !== null || autoLoadTried.current) return;
    autoLoadTried.current = true;
    loadConnections();
  }, [status.running, starting, connections, loadConnections]);

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
    revalidationGen.current += 1;
    await window.api.stopGuiScriptBridge();
    setStatus({ running: false, port: null, external: false });
    clearTree();
    setScreen(null);
    setShot(null);
    setPreflight(null);
    setBypassPreflight(false);
    setShowPreflight(false);
  }, [clearTree]);

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

  const loadNode = useCallback(
    async (connIdx: number, sessIdx: number, elementId: string, gridWindow?: { rows?: number; rowOffset?: number }) => {
      const key = nodeKey(connIdx, sessIdx, elementId);
      setNodesByKey((prev) => ({ ...prev, [key]: "loading" }));
      const result = await window.api.getGuiScriptNode(connIdx, sessIdx, elementId || null, gridWindow);
      setNodesByKey((prev) => ({ ...prev, [key]: result.ok && result.node ? result.node : "error" }));
      return result.ok ? result.node : null;
    },
    []
  );

  // Grid'in BAŞKA BİR SAYFASINI okur. Köprü artık her `get_node`'da 200 satır
  // okumuyor (canlı bir ALV'de 16,4 sn sürüyordu ve köprü tek iş parçacıklı
  // olduğu için o süre boyunca uygulama cevapsız kalıyordu); varsayılan
  // küçük bir pencere, gerisi buradan İSTENEREK geliyor.
  const loadGridWindow = useCallback(
    (rows: number, rowOffset: number) => {
      if (!activeSession) return;
      loadNode(activeSession.connIdx, activeSession.sessIdx, selectedElementId, { rows, rowOffset });
    },
    [activeSession, selectedElementId, loadNode]
  );

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

  // DÖNÜŞ: mount anında store'da bir bağlantı listesi (ya da yarım kalmış
  // bir yükleme, ya da hatası) varsa kullanıcı bu ekrana daha önce gelmiş,
  // başka bir moda geçip dönmüş demektir. Eski
  // ağaç hemen görünüyor, arada SAP tarafında olanlar burada doğrulanıyor.
  // Liste "loading"e çekilmiyor: doğrulama sürerken eski liste görünür
  // kalsın.
  //
  // Seçili oturum arada kapandıysa (SAP'de pencere kapatıldı, SAP Logon
  // yeniden açıldı) ona İSTEK GİTMİYOR. Seçim, düğümler ve seçili öğe
  // temizleniyor. Oturum hâlâ duruyorsa ekran bilgisi tazeleniyor, bu da
  // aktif GUI bağlamını yeniden yayımlıyor. `activeSession` ve
  // `expandedConn` mount anındaki değerler: doğrulanan şey tam olarak
  // kullanıcının bıraktığı durum.
  //
  // Doğrulama sürerken kenar çubuğu tıklanabilir. `gen`, doğrulamanın
  // başladığı andaki `revalidationGen`: kullanıcı arada başka bir oturum
  // seçtiyse (ya da köprüyü durdurduysa, ekrandan çıktıysa) her `await`
  // sonrasındaki denetim doğrulamayı sessizce bitiriyor.
  //
  // Oturum kimliği yalnızca sıra numarası (`sessIdx`). SAP kapanan bir
  // oturumun numarasını yeni açılan bir oturuma verebiliyor; o durumda
  // "hâlâ açık" denetimi geçiyor ve tazelenen ekran bilgisi yeni oturumun
  // oluyor. Köprü oturumun kalıcı bir kimliğini vermediği için bu kabul.
  const returning = useRef(connections !== null);
  const revalidateAfterReturn = async (gen: number) => {
    const stale = () => revalidationGen.current !== gen;
    const result = await window.api.listGuiScriptConnections();
    if (stale()) return;
    if (!result.ok || !result.connections) {
      setConnections("error");
      clearSelection();
      return;
    }
    const alive = new Set(result.connections.map((c) => c.index));
    setConnections(result.connections);
    const selected = activeSession;
    const toRead = Object.keys(expandedConn)
      .map(Number)
      .filter((idx) => expandedConn[idx] && alive.has(idx));
    if (selected && alive.has(selected.connIdx) && !toRead.includes(selected.connIdx)) toRead.push(selected.connIdx);
    const lists: SessionsByConn = {};
    await Promise.all(
      toRead.map(async (idx) => {
        const r = await window.api.listGuiScriptSessions(idx);
        lists[idx] = r.ok && r.sessions ? r.sessions : "error";
      })
    );
    if (stale()) return;
    // Birleştiriliyor, üzerine yazılmıyor: doğrulama sürerken kullanıcının
    // açtığı bir bağlantının oturum listesi kaybolmasın. Kapanmış
    // bağlantılar ayıklanıyor. Ne yeniden okunan ne de ŞU AN açık olan
    // bağlantının eski listesi de atılıyor: `toggleConn` yalnızca liste
    // yokken yüklediği için, sonradan açılınca önceki ziyaretin listesi
    // görünürdü.
    setSessionsByConn((prev) =>
      Object.fromEntries(
        Object.entries({ ...prev, ...lists }).filter(([key]) => {
          const idx = Number(key);
          return alive.has(idx) && (idx in lists || Boolean(expandedConnRef.current[idx]));
        })
      )
    );
    setExpandedConn((prev) => Object.fromEntries(Object.entries(prev).filter(([idx]) => alive.has(Number(idx)))));
    if (!selected) return;
    const sessions = lists[selected.connIdx];
    if (!Array.isArray(sessions) || !sessions.some((s) => s.index === selected.sessIdx)) {
      clearSelection();
      return;
    }
    refreshScreen(selected);
    refreshScreenshot(selected);
  };

  useEffect(() => {
    // Kuşak burada, `await`'ten ÖNCE alınıyor: StrictMode'un çift mount'unda
    // ilk çalıştırma, aradaki unmount'un artırdığı kuşak yüzünden çekiliyor.
    const gen = revalidationGen.current;
    (async () => {
      const next = await refreshStatus();
      if (!returning.current || revalidationGen.current !== gen) return;
      if (next.running) await revalidateAfterReturn(gen);
      else clearTree();
    })();
    // Yalnızca mount'ta: dönüş bir kez doğrulanıyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aktif bağlamın GUI tarafını yayınlar (bkz. app-electron/main/activeContext.ts).
  // Böylece sohbet ajanı, kullanıcının SAP GUI'de hangi işlemde olduğunu
  // biliyor — üç ekranın "birbirinden haberi olsun" isteğinin bu ekrandaki
  // payı.
  //
  // TEMİZLİK YOK, bilerek: bu ekran sekme değişince UNMOUNT oluyor ve
  // unmount'ta bağlamı silmek, tam olarak ona ihtiyaç duyulan anda (kullanıcı
  // sohbete geçip "bu ekranda ne yapmalıyım" diye sorduğunda) siler. Oturum
  // gerçekten kaybolduğunda `activeSession`/`screen` zaten burada null'a
  // düşüyor ve yayın o zaman yapılıyor.
  //
  // `updatedAt` her çağrıda değişiyor ama main tarafı onu karşılaştırmaya
  // KATMIYOR — aksi hâlde her ekran yoklaması bir yayın tetiklerdi.
  useEffect(() => {
    if (!activeSession || !screen) {
      window.api.setActiveGuiContext(null).catch(() => {});
      return;
    }
    window.api
      .setActiveGuiContext({
        connectionIndex: activeSession.connIdx,
        sessionIndex: activeSession.sessIdx,
        systemName: screen.systemName,
        client: screen.client,
        user: screen.user,
        transaction: screen.transaction,
        program: screen.program,
        title: screen.title,
        updatedAt: new Date().toISOString()
      })
      .catch(() => {
        // bağlam yayını en iyi çaba — başarısızlığı bu ekranı etkilemez
      });
  }, [activeSession, screen]);

  const handleSelectSession = useCallback(
    (connIdx: number, sessIdx: number) => {
      revalidationGen.current += 1;
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

  // Kenar çubuğunun çağırdığı işler (bkz. stores/scriptStore.tsx
  // `ScriptCommands`). Ref üzerinden: kayıt bir kere yapılıyor, her çağrı o
  // anki fonksiyona gidiyor. Kayıt `useLayoutEffect`'te, yani ilk boyamadan
  // önce: kullanıcı ilk karede tıklasa da komut boşa düşmüyor.
  const commandsRef = useRef<ScriptCommands>({
    selectSession: handleSelectSession,
    toggleConn,
    toggleNode,
    selectElement: handleSelectElement
  });
  commandsRef.current = {
    selectSession: handleSelectSession,
    toggleConn,
    toggleNode,
    selectElement: handleSelectElement
  };
  useLayoutEffect(
    () =>
      registerScriptCommands({
        selectSession: (connIdx, sessIdx) => commandsRef.current.selectSession(connIdx, sessIdx),
        toggleConn: (connIdx) => commandsRef.current.toggleConn(connIdx),
        toggleNode: (elementId) => commandsRef.current.toggleNode(elementId),
        selectElement: (elementId) => commandsRef.current.selectElement(elementId)
      }),
    [registerScriptCommands]
  );

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
            row: extra?.row,
            column: extra?.column,
            by: extra?.by,
            label: describeStep(action, targetId, extra?.value, extra?.vkey, nodeLabel, t, extra)
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
    if (result.canceled) return;
    // Okuma hatası da SESSİZDİ: `!result.content` ile iptalle aynı kefeye
    // konuyordu, oysa main artık `error` dolduruyor.
    if (!result.content) {
      setScriptMessage({ ok: false, text: result.error ?? t("sapGuiScripting.scriptFileInvalid") });
      return;
    }
    try {
      const parsed = JSON.parse(result.content) as GuiScriptScript;
      // AÇILAN DOSYA DOĞRULANIR. Önce geçerli JSON olması yeterli sayılıyordu:
      // `steps` yoksa liste sessizce boşalıyor, kullanıcı da "hiçbir şey
      // olmadı" görüyordu — yanlış dosyayı seçtiğini anlamasının yolu yoktu.
      if (!Array.isArray(parsed?.steps)) {
        setScriptMessage({ ok: false, text: t("sapGuiScripting.scriptFileInvalid") });
        return;
      }
      const valid = parsed.steps.filter(
        (step): step is GuiScriptRecordedStep =>
          !!step && typeof step === "object" && GUI_SCRIPT_ACTIONS.includes(step.action)
      );
      setSteps(valid);
      setScriptName(parsed.name || "");
      setPlayResults([]);
      // Atılan adım varsa SÖYLENİR; sessizce kısaltılmış bir script,
      // kullanıcının kaydettiğini sandığı script değildir.
      setScriptMessage(
        valid.length === parsed.steps.length
          ? null
          : { ok: false, text: t("sapGuiScripting.scriptStepsDropped", { count: parsed.steps.length - valid.length }) }
      );
    } catch (err) {
      setScriptMessage({ ok: false, text: (err as Error).message });
    }
  }, [t]);

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
        vkey: step.vkey,
        row: step.row,
        column: step.column,
        by: step.by
      });
      if (result.screen) setScreen(result.screen);
      // ADIMLAR ARASINDA UYKU YOK. Burada 350 ms'lik sabit bir bekleme vardı;
      // canlı ölçüm (SID-G1/SE16N, 2026-09-03) bunun tamamen ölü zaman olduğunu
      // gösterdi: sıfır beklemeyle arka arkaya gönderilen 10 adımın hepsi
      // geçti, ekran geçişleri doğru, ve köprünün `busySeen` raporu BİR KEZ
      // bile doğru olmadı — SAP GUI Scripting çağrısı senkron, sunucu turu
      // çağrının içinde bitiyor (tek bir F3 bile 5,2 sn boyunca DÖNMÜYOR).
      // Hazır olma beklemesi köprüde, oturum nesnesinin yanında yapılıyor.
      setPlayResults((prev) => [
        ...prev,
        { index: i, ok: result.ok, error: result.error, stillBusy: result.settle?.settled === false }
      ]);
      if (!result.ok) break;
    }
    if (autoRefresh) await refreshScreenshot(activeSession);
    setPlaying(false);
    setPlayIndex(null);
  }, [activeSession, steps, playing, autoRefresh, refreshScreenshot]);

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

  // Kenar çubuğu ağacı yalnızca çalışma alanı açıkken gösteriyor.
  useEffect(() => {
    if (statusKnown) setTreeVisible(status.running && !preflightVisible);
  }, [statusKnown, status.running, preflightVisible, setTreeVisible]);

  const dockTab = (active: boolean) =>
    `flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium ${
      active
        ? "bg-accent-500/10 text-accent-300 ring-1 ring-inset ring-accent-500/30"
        : "text-slate-400 hover:bg-hover hover:text-slate-200"
    }`;

  return (
    // `relative`: rehber çekmecesi bu kutunun içine `absolute` konumlanıyor —
    // uygulamanın geri kalanını (sol kenar çubuğu vb.) örtmesin diye.
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Başlık çubuğu — SADECE bağlantı alanı. Kayıt/Script/Agent düğmeleri
          buradan alınıp komut çubuğunun boş orta bölgesine taşındı: altı düğmenin
          aynı tonda yan yana dizildiği eski hâlde hangisinin ne yaptığı da,
          hangisinin daha önemli olduğu da okunmuyordu. */}
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-sidebar px-3">
        <MousePointerClick size={15} className="shrink-0 text-accent-400" />
        <div className="min-w-0">
          <h1 className="truncate text-[13px] font-semibold leading-tight text-slate-100">{t("sapGuiScripting.title")}</h1>
          {/* Alt başlık yalnızca köprü kapalıyken: bir kez okunacak bir cümle
              için her oturumda 18 piksel harcamanın anlamı yok. */}
          {!status.running && <p className="truncate text-[11px] leading-tight text-slate-500">{t("sapGuiScripting.subtitle")}</p>}
        </div>

        <span
          className="ml-1 flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-line bg-control px-2.5 text-[10px] font-medium text-slate-400"
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

        {/* Launcher'ın bağlı olduğu sistem. Bu ekran SAP GUI'ye COM üzerinden
            bakıyor ve Launcher'ın ADT/RFC bağlantısından tamamen habersizdi —
            ikisi FARKLI sistemler olabilir ve fark, script'i yanlış sistemde
            oynatana kadar hiçbir yerde görünmüyordu. */}
        {activeSap && (
          <span
            className="ml-1 flex h-6 min-w-0 shrink items-center gap-1.5 rounded-full border border-line bg-control px-2.5 text-[10px] font-medium text-slate-400"
            title={t("activeContext.launcherSystem", { system: activeSap.systemId, client: activeSap.client })}
          >
            <Plug size={11} className="shrink-0" />
            <span className="truncate">
              {activeSap.systemId} / {activeSap.client}
            </span>
            {screen?.systemName && !sameSystem(screen, activeSap) && (
              <span
                className="shrink-0 font-semibold"
                style={{ color: "var(--status-warning-text)" }}
                title={t("activeContext.mismatchHint", {
                  gui: `${screen.systemName ?? "?"} / ${screen.client ?? "?"}`,
                  launcher: `${activeSap.systemId} / ${activeSap.client}`
                })}
              >
                {t("activeContext.mismatch")}
              </span>
            )}
          </span>
        )}

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

          <div className="mx-0.5 h-5 w-px bg-active" />

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
        <div className="shrink-0 border-b border-line bg-[rgba(244,113,138,0.08)] px-4 py-2 text-xs text-[var(--status-danger-text)]">
          {startError}
        </div>
      )}

      {!status.running ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
          <div className="max-w-md rounded-lg border border-line bg-card p-5 text-center">
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
                className={btn("neutral", "md")}
              >
                {t("sapGuiScripting.preflight.continueAnyway")}
              </button>
            )}
            {!preflightBlocking && (
              <button
                onClick={() => setShowPreflight(false)}
                className={btn("primary", "md")}
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
                    className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium ${
                      recording
                        ? "border-[rgba(244,113,138,0.4)] bg-[rgba(244,113,138,0.14)] text-[var(--status-danger-text)]"
                        : "border-line bg-control text-slate-200 hover:bg-active"
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
            <div className="flex h-60 shrink-0 flex-col overflow-hidden border-b border-line bg-card">
              {/* Panel başlığı sekmeyle tekrar etmiyor: burada yalnızca script'in
                  KENDİ eylemleri var (ad, oynat, kaydet, aç, temizle). */}
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line-subtle px-2.5">
                <input
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder={t("sapGuiScripting.scriptNamePlaceholder")}
                  className="h-7 w-52 rounded-md border border-line bg-control px-2 text-xs text-slate-100 outline-none focus:border-accent-500"
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
                            isCurrent ? "bg-accent-500/15 ring-1 ring-inset ring-accent-500/50" : "bg-raised"
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
                          {/* Adım geçti ama oturum hâlâ meşguldü. Sessiz
                              geçilirse, bir SONRAKİ adımın anlaşılmaz bir SAP
                              hatasıyla düşmesinin sebebi görünmez olur. */}
                          {result?.ok && result.stillBusy && (
                            <span
                              className="shrink-0 text-[10px] text-[var(--status-warning-text)]"
                              title={t("sapGuiScripting.stepStillBusyHint")}
                            >
                              {t("sapGuiScripting.stepStillBusy")}
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
              <div className="flex w-[340px] shrink-0 flex-col overflow-hidden border-l border-line bg-sidebar">
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
                  onLoadRows={loadGridWindow}
                />
              </div>
            ) : (
              <button
                onClick={() => setInspectorOpen(true)}
                title={t("sapGuiScripting.expandPanel")}
                className="flex w-8 shrink-0 cursor-pointer flex-col items-center gap-2 border-l border-line bg-sidebar pt-2 text-slate-500 hover:bg-hover hover:text-white"
              >
                <PanelRightOpen size={13} />
                <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] [writing-mode:vertical-rl]">
                  {t("sapGuiScripting.detailTitle")}
                </span>
              </button>
            )}
          </div>

          {actionError && (
            <div className="shrink-0 border-t border-line bg-[rgba(244,113,138,0.08)] px-3 py-1.5 text-xs text-[var(--status-danger-text)]">
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
