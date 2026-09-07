import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Search,
  RefreshCw,
  AlertTriangle,
  Plus,
  Download,
  X,
  TerminalSquare,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Server,
  FolderTree
} from "lucide-react";
import type {
  AppConfig,
  AppTheme,
  ConnectivityState,
  DoctorReport,
  FsEntry,
  SapLandscape,
  SapService,
  SkillProfile,
  SystemTier,
  UpdateStatus
} from "../app-electron/shared/types";
import TitleBar from "./components/TitleBar";
import ActivityBar, { type Activity } from "./components/ActivityBar";
import AxetCodeHome, { type SapChatRequest } from "./components/AxetCodeHome";
// axet.flows ve axet.flows Live ekranları arayüzden ÇIKARILDI (kullanıcı
// isteği, 2026-09-04): uygulama GitHub'a açılırken bu iki modül henüz hazır
// değil ve akıbetleri sonra kararlaştırılacak. Kaynak dosyalar
// (AxetFlowsHome.tsx, AxetFlowsLiveHome.tsx, src/flows/**,
// src/components/flows/**, app-electron/main/axetFlows*.ts, flowRuntime.js)
// diskte DURUYOR, yalnızca import/route/rayları kaldırıldı — geri açmak
// bu üç yeri (import, ActivityBar girdisi, aşağıdaki route dalı) geri
// eklemekten ibaret.
import SapGuiScriptingHome from "./components/SapGuiScriptingHome";
import Tree from "./components/Tree";
import RecentSystems from "./components/RecentSystems";
import SystemPanel from "./components/SystemPanel";
import SettingsModal from "./components/SettingsModal";
import AppConnectionsModal from "./components/AppConnectionsModal";
import CredentialsModal from "./components/CredentialsModal";
import ReadinessHome from "./components/ReadinessHome";
import { hasDoctorFault } from "../app-electron/shared/doctorSeverity";
import RoleModal from "./components/RoleModal";
import AddSystemModal, { type EditingManualSystem } from "./components/AddSystemModal";
import UpdatePromptModal, { type UpdatePromptMode } from "./components/UpdatePromptModal";
import ConfirmDialog from "./components/ConfirmDialog";
import Toast, { type ToastMsg } from "./components/Toast";
import TerminalPanel, { type TerminalSessionInfo } from "./components/TerminalPanel";
import FileExplorer from "./components/FileExplorer";
import FileViewer from "./components/FileViewer";
import { flattenLandscape } from "./lib/landscape";
import { btn, iconBtn, tintBtn } from "./ui/buttons";
import { useActiveContext } from "./lib/useActiveContext";
import { LanguageProvider, translate } from "./i18n";

const MIN_TERMINAL_HEIGHT = 160;
const MAX_TERMINAL_HEIGHT = 720;
const DEFAULT_TERMINAL_HEIGHT = 320;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 320;
const COLLAPSED_SIDEBAR_WIDTH = 44;
// Yenileme animasyonunun EN AZ görünür kalacağı süre. Yerel XML okuması
// ~15ms; bayrağı hemen indirmek dönme animasyonunu hiç çizdirmiyordu ve
// düğme ölü görünüyordu. 450ms "bir şey oldu" demeye yetiyor, beklemeye
// dönüşecek kadar uzun değil.
const MIN_REFRESH_SPIN_MS = 450;

interface OpenFileTab {
  path: string;
  name: string;
}

interface Selection {
  path: string[];
  service: SapService;
  itemUuid: string;
}

let toastSeq = 0;
const CONNECTIVITY_SCAN_CONCURRENCY = 5;

export default function App() {
  const [activity, setActivity] = useState<Activity>("axetCode");
  const [landscape, setLandscape] = useState<SapLandscape | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [connectivity, setConnectivity] = useState<Record<string, ConnectivityState>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [credentialsTarget, setCredentialsTarget] = useState<Selection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Rol seciminin beklettigi kimlik bilgileri. Dolu ise rol ekrani aciktir.
  const [pendingConnect, setPendingConnect] = useState<{
    username: string;
    password: string;
    client: string;
  } | null>(null);
  // Başarılı bağlantıdan sonra axet.code'a devredilen "bu sisteme bağlı bir
  // sohbet aç" isteği (bkz. AxetCodeHome `SapChatRequest`).
  const [sapChatRequest, setSapChatRequest] = useState<SapChatRequest | null>(null);
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<EditingManualSystem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SapService | null>(null);
  const [pendingSelectUuid, setPendingSelectUuid] = useState<string | null>(null);
  const [terminalSessions, setTerminalSessions] = useState<TerminalSessionInfo[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [terminalPanelOpen, setTerminalPanelOpen] = useState(false);
  const [terminalPanelHeight, setTerminalPanelHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
  const [terminalFullscreen, setTerminalFullscreen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<"systems" | "files">("systems");
  const [openFiles, setOpenFiles] = useState<OpenFileTab[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  // Kenar çubuğundaki Hazırlık arıza noktası. Ölçüm açılışta BİR KEZ yapılıyor
  // ve sonuç yalnızca `fail` satırlarına indirgeniyor (bkz. doctorSeverity.ts).
  // Süre bu makinede ölçüldü: Python probu 181 ms, katalog taraması 96 ms,
  // portlar reddedildiğinde anında dönüyor — yani "ucuz kontrolleri ayır"
  // diye bir bölme gerekmedi, tamamı yarım saniyenin altında.
  const [readinessFault, setReadinessFault] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ phase: "idle" });
  const [updatePromptMode, setUpdatePromptMode] = useState<UpdatePromptMode>("hidden");
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(null);
  const scanGenerationRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pendingConnectivityRef = useRef<Record<string, ConnectivityState>>({});
  const flushTimerRef = useRef<number | null>(null);
  const pendingTerminalTitlesRef = useRef<Map<string, string>>(new Map());
  const manualTerminalCounterRef = useRef(0);

  // Aktif bağlam TEK KEZ burada okunuyor ve prop olarak dağıtılıyor. Hook'u
  // her ihtiyaç duyan bileşende ayrı ayrı çağırmak, aynı yayına N ayrı abone
  // ve N ayrı kopya demek olurdu — "tek bir yerde toplama" isteğinin tam
  // tersi (bkz. app-electron/main/activeContext.ts).
  const activeContext = useActiveContext();

  const language = config?.language ?? "tr";
  const t = useCallback(
    (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) =>
      translate(language, key, params),
    [language]
  );

  const flushConnectivity = useCallback(() => {
    flushTimerRef.current = null;
    const pending = pendingConnectivityRef.current;
    pendingConnectivityRef.current = {};
    if (Object.keys(pending).length === 0) return;
    setConnectivity((prev) => ({ ...prev, ...pending }));
  }, []);

  // Bir landscape'te yüzlerce sistem varsa, her birinin connectivity sonucu
  // için ayrı ayrı setState çağırmak App'in (ve altındaki tüm ağacın) her
  // sonuçta bir kez yeniden render olmasına yol açardı — 100+ sistemli bir
  // landscape'te açılışta 100+ art arda render demek. Bunun yerine sonuçları
  // bir ref'te biriktirip kısa bir pencerede (150ms) tek bir state güncellemesi
  // olarak flush ediyoruz — render sayısını dramatik şekilde düşürür.
  const setConnectivityBatched = useCallback(
    (uuid: string, state: ConnectivityState) => {
      pendingConnectivityRef.current[uuid] = state;
      if (flushTimerRef.current === null) {
        flushTimerRef.current = window.setTimeout(flushConnectivity, 150);
      }
    },
    [flushConnectivity]
  );

  const pushToast = (kind: ToastMsg["kind"], text: string) => {
    setToasts((prev) => {
      const existing = prev.find((t) => t.kind === kind && t.text === text);
      if (existing) {
        return prev.map((t) => (t.id === existing.id ? { ...t, count: t.count + 1, version: t.version + 1 } : t));
      }
      const id = ++toastSeq;
      return [...prev, { id, kind, text, count: 1, version: 0 }];
    });
  };
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  // `refresh`in bağımlılıkları BİLEREK boş: kimliği değişirse aşağıdaki efekt
  // landscape'i baştan yükler, yani dil değiştirmek SAPUILandscape.xml'i
  // yeniden okuturdu. Ama hata mesajı da güncel dilde olmalı — bu yüzden dil
  // kapanıştan değil ref'ten okunuyor. Eskiden buradaki `t` ilk render'ın
  // dilinde donuyordu: kullanıcı dili değiştirse bile landscape hatası hep
  // açılış dilinde çıkıyordu.
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // "Yenile çalışmıyor" (kullanıcı, 2026-09-06). İŞLEVSEL OLARAK ÇALIŞIYORDU:
  // `landscape:get` her çağrıda SAPUILandscape.xml'i diskten baştan okuyor,
  // hiçbir yerde önbellek yok. Çalışmayan şey GERİ BİLDİRİMDİ —
  //   * yerel bir XML'i okumak ~15ms sürüyor, yani `loading` bayrağına bağlı
  //     dönme animasyonu bir kare bile çizilmeden bitiyordu;
  //   * dosya değişmediyse ekranda hiçbir piksel değişmiyor.
  // Sonuç: kullanıcı düğmeye basıyor, hiçbir şey olmuyor, düğme ölü sanılıyor.
  //
  // İki şey eklendi: (1) animasyonun görülebileceği bir ALT SÜRE, (2) yüklenen
  // sistem sayısını söyleyen bir bildirim. Sayı önemli — dosya gerçekten
  // değişmediyse kullanıcı bunu sayının aynı kalmasından anlıyor, "düğme
  // bozuk" diye düşünmüyor.
  //
  // Ayrıca artık SONUCU DÖNDÜRÜYOR. Eskiden çağıran taraf koşulsuz "başarılı"
  // bildirimi basıyordu: okuma patladığında ekranda aynı anda bir hata ve bir
  // başarı bildirimi beliriyordu.
  const refresh = useCallback(async (): Promise<SapLandscape | null> => {
    const startedAt = Date.now();
    setLoading(true);
    try {
      const [ls, cfg] = await Promise.all([window.api.getLandscape(), window.api.getConfig()]);
      setLandscape(ls);
      setConfig(cfg);
      return ls;
    } catch (err) {
      pushToast(
        "error",
        translate(languageRef.current, "app.landscapeLoadError", { message: (err as Error).message })
      );
      return null;
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_REFRESH_SPIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_SPIN_MS - elapsed));
      }
      setLoading(false);
    }
  }, []);

  // Yenileme düğmelerinin ortak kuyruğu: sayıyı hesapla, bildirimi bas.
  // `messageKey` iki düğme için ayrı, çünkü ikisi kullanıcının kafasında ayrı
  // şeyler ("SAP Logon'dan getir" vs "listeyi yenile") — teknik olarak aynı
  // okumayı yapıyor olmaları bunu değiştirmiyor.
  const refreshWithToast = useCallback(
    async (messageKey: "app.refreshedFromSapLogon" | "app.listReloaded") => {
      const ls = await refresh();
      if (!ls) return;
      pushToast("success", translate(languageRef.current, messageKey, {
        count: String(flattenLandscape(ls.customers).length)
      }));
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // KİMLİĞİ SABİT olmak ZORUNDA: DoctorSection'ın ölçüm fonksiyonu bunu
  // bağımlılık olarak taşıyor ve her render'da yeni bir fonksiyon geçseydik
  // efekt yeniden koşar, ölçüm kendini tetikler, ekran sonsuz döngüye girerdi.
  const handleDoctorReport = useCallback((report: DoctorReport | null) => {
    setReadinessFault(report ? hasDoctorFault(report.rows) : false);
  }, []);

  // Açılışta tek teşhis. Hata yutuluyor: ölçüm yapılamadıysa doğru cevap
  // "arıza var" değil "bilmiyorum" — uydurma bir kırmızı nokta, gerçek bir
  // noktanın güvenilirliğini de götürür.
  useEffect(() => {
    void window.api
      .runDoctor()
      .then((report) => setReadinessFault(hasDoctorFault(report.rows)))
      .catch(() => setReadinessFault(false));
  }, []);

  // Ağaçtaki "Manuel Eklenen Sistemler" başlığı main'de üretiliyor
  // (manualMerge.ts) ve dili landscape okunurken sabitleniyor — dil
  // değişince o başlık eski dilde kalırdı. İlk render atlanıyor: yukarıdaki
  // efekt zaten yüklemeyi yapıyor.
  const didInitialLoadRef = useRef(false);
  useEffect(() => {
    if (!didInitialLoadRef.current) {
      didInitialLoadRef.current = true;
      return;
    }
    refresh();
  }, [language, refresh]);

  // Tema değişimi. `theme-transition` sınıfı SADECE geçiş süresince ekleniyor
  // (bkz. src/index.css) — geçiş yumuşak olsun ama o CSS kuralının maliyeti
  // (sayfadaki her elemana bg/border/color animasyonu) uygulamanın geri
  // kalanında ödenmesin diye. İlk yüklemede sınıf eklenmez, sadece kullanıcı
  // temayı değiştirdiğinde.
  const previousThemeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!config?.theme) return;
    const isSwitch = previousThemeRef.current !== null && previousThemeRef.current !== config.theme;
    previousThemeRef.current = config.theme;
    if (!isSwitch) {
      document.documentElement.setAttribute("data-theme", config.theme);
      return;
    }
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.setAttribute("data-theme", config.theme);
    const timer = window.setTimeout(() => root.classList.remove("theme-transition"), 260);
    return () => window.clearTimeout(timer);
  }, [config?.theme]);

  // Sohbet okuma konforu ayarlarını CSS değişkenlerine çevirir. Neden prop
  // olarak geçirilmiyor: değerlerin ihtiyaç duyulduğu yer AxetCodeHome >
  // ChatSessionPane > ChatBubble zinciri, yani üç kat prop drilling — üstelik
  // yalnızca sınıf adı üretmek için. Tema jetonlarında zaten kullanılan
  // desenin (CSS custom property + Tailwind arbitrary value) aynısı.
  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    // Sembolik ayarın piksel karşılığı TEK YERDE burada. Gövde ve karşılama
    // birlikte ölçekleniyor; ayrı ayrı ayarlanabilir olsalardı kullanıcı iki
    // kadranı dengelemek zorunda kalırdı.
    const fontSize = { sm: "14px", md: "15px", lg: "17px" }[config.chatFontSize];
    // Karşılama merdiveni 34/40/46'dan iki adımda 50/60/70'e çıktı (kullanıcı
    // isteği, 2026-09-07: *"bu yazı büyük olsun iyice"*, ardından 46/54/62
    // görüldükten sonra *"biraz daha büyük olsun"*). Gövde ölçeği DEĞİŞMEDİ:
    // karşılama açılış ekranının tek başlığı ve orada rakibi yok, gövde ise
    // her mesajda okunan metin — ikisini birlikte büyütmek okuma konforu
    // ayarını bozardı. Alt başlık bu değerin %48'i (bkz. ChatSessionPane),
    // yani 60px'te ~29px: hiyerarşi oran olarak korunuyor.
    const heroSize = { sm: "50px", md: "60px", lg: "70px" }[config.chatFontSize];
    // Mesajlar arası dikey boşluk. "Yoğun" ekrana daha çok mesaj sığdırır,
    // "rahat" uzun cevapların birbirine karışmasını önler.
    const gap = config.chatDensity === "compact" ? "20px" : "32px";
    root.style.setProperty("--chat-font-size", fontSize);
    root.style.setProperty("--chat-hero-size", heroSize);
    root.style.setProperty("--chat-message-gap", gap);
  }, [config?.chatFontSize, config?.chatDensity]);

  // Electron/Chromium'un varsayılan davranışı: bir dosya, HERHANGİ bir özel
  // sürükle-bırak işleyicisi olmayan bir alana bırakılırsa, pencere o dosyayı
  // (file:// URL'i olarak) AÇMAYA/NAVİGASYONA çalışır — bu, sohbet composer'ı
  // veya Dosya Gezgini gibi kendi `onDrop`'unu tanımlayan alanların DIŞINDA
  // bir yere yanlışlıkla bırakılan bir dosyanın tüm uygulamayı bir dosya
  // görüntüleyiciye çevirmesini önlemek için pencere seviyesinde bir güvenlik
  // ağı. `stopPropagation()` ÇAĞRILMIYOR — bu yüzden `FileExplorer.tsx`/
  // `ChatSessionPane.tsx` gibi kendi özel `onDrop`'u olan elemanlar event
  // bubble sırasında ÖNCE kendi mantıklarını çalıştırır, bu handler sadece
  // event ağacın en tepesine (window) ulaştığında son bir "varsayılanı
  // engelle" katmanı olarak devreye girer.
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  const flatSystems = useMemo(() => flattenLandscape(landscape?.customers ?? []), [landscape]);

  const recentEntries = useMemo(() => {
    if (!config?.connectionHistory?.length) return [];
    const byUuid = new Map(flatSystems.map((f) => [f.service.uuid, f]));
    return config.connectionHistory
      .map((h) => {
        const flat = byUuid.get(h.uuid);
        return flat ? { ...flat, connectedAt: h.connectedAt } : null;
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .slice(0, 5);
  }, [config?.connectionHistory, flatSystems]);

  const lastConnectedAt = useMemo(() => {
    if (!selection || !config?.connectionHistory) return null;
    return config.connectionHistory.find((h) => h.uuid === selection.service.uuid)?.connectedAt ?? null;
  }, [selection, config?.connectionHistory]);

  useEffect(() => {
    if (flatSystems.length === 0) return;
    const generation = ++scanGenerationRef.current;
    const uniqueByUuid = new Map(flatSystems.map((f) => [f.service.uuid, f.service]));
    const services = Array.from(uniqueByUuid.values());
    let cursor = 0;

    const worker = async () => {
      while (cursor < services.length) {
        if (scanGenerationRef.current !== generation) return;
        const service = services[cursor++];
        setConnectivityBatched(service.uuid, "checking");
        try {
          const result = await window.api.checkConnectivity(service);
          if (scanGenerationRef.current !== generation) return;
          setConnectivityBatched(service.uuid, result.state);
        } catch {
          if (scanGenerationRef.current !== generation) return;
          setConnectivityBatched(service.uuid, "unknown");
        }
      }
    };

    Array.from({ length: CONNECTIVITY_SCAN_CONCURRENCY }, () => worker());
  }, [flatSystems, setConnectivityBatched]);

  useEffect(() => {
    if (!pendingSelectUuid) return;
    const match = flatSystems.find((f) => f.service.uuid === pendingSelectUuid);
    if (match) {
      setSelection(match);
      setPendingSelectUuid(null);
    }
  }, [pendingSelectUuid, flatSystems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Güncelleme durumu — `main/index.ts`'teki açılıştan 3sn sonraki otomatik
  // kontrolün (veya Ayarlar'daki "Şimdi Kontrol Et"in) sonucu buraya, tüm
  // uygulama seviyesinde tek bir yerden dinleniyor. `getLastUpdateStatus()`
  // ile mount anında son bilinen durum çekiliyor (otomatik kontrol bu
  // component mount olmadan önce bitmiş olabilir), `onUpdateStatus` ile
  // sonraki her değişiklik canlı olarak alınıyor. `SettingsModal`'ın kendi
  // ayrı (sadece o modal açıkken aktif) aynı event'i dinleyen kopyası hâlâ
  // duruyor — ikisi aynı yayını bağımsız dinliyor, çakışma yok.
  useEffect(() => {
    window.api.getLastUpdateStatus().then(setUpdateStatus);
    const unsubscribe = window.api.onUpdateStatus(setUpdateStatus);
    return unsubscribe;
  }, []);

  // `updateStatus.phase`'e göre modal modu türetiliyor — kullanıcı "Daha
  // Sonra" dediyse (`dismissedUpdateVersion`) AYNI sürüm için modal bir daha
  // açılmıyor (indirme/kurulum arka planda tetiklenmeden sessizce beklemede
  // kalır, kullanıcı istediğinde Ayarlar'dan elle indirebilir); farklı/daha
  // yeni bir sürüm bulunursa (ör. bir sonraki açılışta) tekrar sorulur.
  // Ayarlar penceresi açıkken bu global modal bilerek gösterilmiyor —
  // `SettingsModal` zaten aynı durumu kendi içinde (İndir/Yeniden Başlat
  // butonlarıyla) gösteriyor, iki ayrı UI'ın üst üste binmesini önlüyoruz.
  useEffect(() => {
    if (settingsOpen) {
      setUpdatePromptMode("hidden");
      return;
    }
    if (updateStatus.phase === "available") {
      if (updateStatus.version && updateStatus.version === dismissedUpdateVersion) return;
      setUpdatePromptMode("prompt");
    } else if (updateStatus.phase === "downloading" || updateStatus.phase === "downloaded") {
      setUpdatePromptMode("progress");
    } else if (updateStatus.phase === "error") {
      setUpdatePromptMode((prev) => (prev === "progress" ? "progress" : "hidden"));
    } else {
      setUpdatePromptMode("hidden");
    }
  }, [updateStatus, dismissedUpdateVersion, settingsOpen]);

  // Kullanıcı "İndir ve Kur"a bastıktan sonra kalan her şey OTOMATİK:
  // indirme ilerlemesi bu efekt DEĞİL `updateStatus` event akışı ile
  // güncelleniyor, "downloaded" fazına ulaşıldığında burada kısa bir
  // gecikmeyle (kullanıcının "indirildi" mesajını görebilmesi için)
  // `installUpdate()` (quitAndInstall) otomatik çağrılıyor — ikinci bir
  // onay istenmiyor, bu tam olarak kullanıcının istediği "kendi otomatik
  // yapsın" akışı.
  useEffect(() => {
    if (updateStatus.phase !== "downloaded") return;
    const timer = window.setTimeout(() => {
      window.api.installUpdate();
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [updateStatus.phase, updateStatus.version]);

  const handleAcceptUpdate = () => {
    setUpdatePromptMode("progress");
    window.api.downloadUpdate();
  };

  const handleDismissUpdate = () => {
    setDismissedUpdateVersion(updateStatus.version ?? null);
    setUpdatePromptMode("hidden");
  };

  const handleSelect = (path: string[], service: SapService, itemUuid: string) => {
    setSelection({ path, service, itemUuid });
  };

  // Başlık çubuğundaki aktif bağlam rozetine tıklandığında: SAP Launcher'a
  // geç ve bağlı sistemi seç. `pendingSelectUuid` yolu kullanılıyor çünkü
  // rozet yalnızca uuid'yi biliyor — ağaçtaki karşılığını (yol + service)
  // zaten var olan efekt buluyor.
  const handleShowActiveSystem = useCallback(() => {
    if (!activeContext.sap) return;
    setActivity("sapLauncher");
    setPendingSelectUuid(activeContext.sap.uuid);
  }, [activeContext.sap?.uuid]);

  const handleClearActiveSap = useCallback(() => {
    window.api.clearActiveSapContext().catch(() => {
      // bağlam yayını zaten main'den geliyor; temizleme başarısızsa rozet kalır
    });
  }, []);

  // axet.code ana ekranındaki (AxetCodeHome) "Son Bağlanılanlar" dashboard
  // kartından tek tıkla SAP Launcher'a geçip doğrudan kimlik bilgisi
  // penceresini açar — kullanıcı iki ayrı aktivite arasında elle gezip
  // sistemi tekrar aramak zorunda kalmaz.
  const handleQuickConnectSap = useCallback((path: string[], service: SapService, itemUuid: string) => {
    setActivity("sapLauncher");
    setSelection({ path, service, itemUuid });
    setConnectError(null);
    setCredentialsTarget({ path, service, itemUuid });
  }, []);

  // Seçili sistem değiştiğinde Dosya Gezgini'nin göstereceği kök klasörü
  // (o sistem için proje klasörü) yeniden hesapla — henüz bağlanılmamışsa
  // bu klasör diskte yoktur, FileExplorer bunu kendi içinde uygun bir
  // mesajla gösterir. Açık dosya sekmeleri de sistem değişince temizlenir.
  useEffect(() => {
    setOpenFiles([]);
    setActiveFilePath(null);
    setLeftPanelMode("systems");
    if (!selection) {
      setProjectDir(null);
      return;
    }
    let cancelled = false;
    window.api.resolveProjectDir(selection.path, selection.service).then((dir) => {
      if (!cancelled) setProjectDir(dir);
    });
    return () => {
      cancelled = true;
    };
  }, [selection?.itemUuid]);

  const handleOpenFile = useCallback((entry: FsEntry) => {
    setOpenFiles((prev) =>
      prev.some((f) => f.path === entry.path) ? prev : [...prev, { path: entry.path, name: entry.name }]
    );
    setActiveFilePath(entry.path);
  }, []);

  const handleCloseFileTab = useCallback((filePath: string) => {
    setOpenFiles((prev) => {
      const next = prev.filter((f) => f.path !== filePath);
      setActiveFilePath((current) => {
        if (current !== filePath) return current;
        return next.length > 0 ? next[next.length - 1].path : null;
      });
      return next;
    });
  }, []);

  const handleImportComplete = useCallback(
    (result: { ok: boolean; imported?: number; skippedDirs?: string[]; error?: string }) => {
      if (!result.ok) {
        pushToast("error", t("app.fileImportFailed", { error: result.error ?? t("common.unknownError") }));
        return;
      }
      const imported = result.imported ?? 0;
      const skipped = result.skippedDirs?.length ?? 0;
      if (imported === 0 && skipped === 0) return;
      const skippedNote = skipped > 0 ? t("app.skippedFoldersNote", { count: skipped }) : "";
      pushToast("success", t("app.filesImported", { count: imported, note: skippedNote }));
    },
    [t]
  );

  const handleCheck = useCallback(async (service: SapService) => {
    setConnectivity((prev) => ({ ...prev, [service.uuid]: "checking" }));
    const result = await window.api.checkConnectivity(service);
    setConnectivity((prev) => ({ ...prev, [service.uuid]: result.state }));
  }, []);

  const handleOpenConnect = (sel: Selection) => {
    setConnectError(null);
    setCredentialsTarget(sel);
  };

  const handleOpenSapLogon = useCallback(
    async (service: SapService) => {
      try {
        const result = await window.api.openInSapLogon(service);
        if (result.ok) {
          pushToast("success", t("sapLogon.opened"));
        } else if (result.reason === "spawnError") {
          pushToast("error", t("sapLogon.spawnError", { detail: result.detail ?? "" }));
        } else {
          pushToast("error", t(`sapLogon.${result.reason}` as Parameters<typeof t>[0]));
        }
      } catch (err) {
        pushToast("error", t("sapLogon.spawnError", { detail: (err as Error).message }));
      }
    },
    [t]
  );

  // SOHBET EKRANINDA TERMİNAL YOK (2026-09-05, kullanıcı isteği: *"chat
  // ekranındaki terminali kaldıralım"*). Bir zamanlar bağlanınca terminal
  // açılıyordu, sonra rozetteki bir düğmeye indi, şimdi de kalktı: sohbet
  // ekranının işi sohbet, konsol işi SAP Launcher ekranındaki alt panelde
  // duruyor (`TerminalPanel`) ve orada duruyor olmaya devam ediyor.

  useEffect(() => {
    const unsubscribe = window.api.onTerminalReady((id) => {
      const title = pendingTerminalTitlesRef.current.get(id);
      pendingTerminalTitlesRef.current.delete(id);
      setTerminalSessions((prev) => {
        if (prev.some((s) => s.id === id)) return prev;
        return [...prev, { id, title: title ?? t("app.terminalDefaultTitle", { n: prev.length + 1 }) }];
      });
      setActiveTerminalId(id);
      setTerminalPanelOpen(true);
    });
    return unsubscribe;
  }, [t]);

  const handleNewTerminal = useCallback(async () => {
    const shell = config?.terminal ?? "cmd";
    const cwd = config?.projectsBaseDir ?? "";
    try {
      manualTerminalCounterRef.current += 1;
      const id = await window.api.createTerminal(cwd, 80, 24, shell);
      pendingTerminalTitlesRef.current.set(id, t("app.terminalDefaultTitle", { n: manualTerminalCounterRef.current }));
    } catch (err) {
      pushToast("error", t("app.terminalCreateFailed", { message: (err as Error).message }));
    }
  }, [config?.terminal, config?.projectsBaseDir, t]);

  // Uygulama Bağlantıları — "AXET Projesi Seç" butonu (bkz.
  // AppConnectionsSection.tsx). `axet-code` (argümansız, interaktif),
  // Connector/MCP araçlarının gerektirdiği "AXET Project" seçim diyaloğunu
  // açan GERÇEK TUI'nin kendisi — CLI'nın kendi hata mesajı da bunu
  // doğruluyor: "No project selected, launch axet-code in interactive mode
  // first." Bu yüzden komut vererek terminal açan yolun (READY_PATTERNS/8sn
  // fallback bekleyen, axet.code'un TAM EKRAN sohbet arayüzü için
  // tasarlanmış) yolunu KULLANMIYORUZ — `handleNewTerminal`'la AYNI "manuel
  // terminal" yolu (hemen hazır sayılır, tab anında açılır) + hazır olur
  // olmaz komutu stdin'e yazan bir `writeTerminal` çağrısı yeterli;
  // kullanıcı TUI'de normal şekilde etkileşime girer, bizim tarafımızdan
  // ekstra bir tuş vuruşu simüle edilmez.
  // ("Terminalde Giriş Yap" yolu 2026-09-04'te kullanıcı isteğiyle
  // kaldırıldı — başarısızlıkların çaresi artık doğrudan aXet Agentic
  // portalı.)
  const openConnectorHelperTerminal = useCallback(
    async (command: string, title: string) => {
      const shell = config?.terminal ?? "cmd";
      const cwd = config?.axetWorkspaceDir || config?.projectsBaseDir || "";
      try {
        manualTerminalCounterRef.current += 1;
        const id = await window.api.createTerminal(cwd, 80, 24, shell);
        pendingTerminalTitlesRef.current.set(id, title);
        window.api.writeTerminal(id, `${command}\r\n`);
      } catch (err) {
        pushToast("error", t("app.terminalCreateFailed", { message: (err as Error).message }));
      }
    },
    [config?.terminal, config?.axetWorkspaceDir, config?.projectsBaseDir, t]
  );

  const handleOpenProjectTerminal = useCallback(
    () => openConnectorHelperTerminal(config?.axetCommand || "axet-code -y", t("appConnections.projectTerminalTitle")),
    [openConnectorHelperTerminal, config?.axetCommand, t]
  );

  const handleCloseTerminal = useCallback((id: string) => {
    window.api.disposeTerminal(id).catch(() => {
      // process zaten kapanmış olabilir, göz ardı et
    });
    setTerminalSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveTerminalId((current) => {
        if (current !== id) return current;
        return next.length > 0 ? next[next.length - 1].id : null;
      });
      return next;
    });
  }, []);

  const handleToggleTerminalPanel = useCallback(() => {
    setTerminalPanelOpen((prev) => !prev);
  }, []);

  // Tam ekran modu, sidebar'ı ve ana içerik (SystemPanel/FileViewer) panelini
  // tamamen render'dan çıkarıp terminale App'in kalan TÜM dikey/yatay alanını
  // veriyor (VS Code'un "Maximize Panel" davranışına benzer) — üstteki arama/
  // ayarlar çubuğu bilerek görünür bırakıldı, sadece TerminalPanel içindeki
  // buton ile çıkılabiliyor. Panel kapalıyken tam ekrana geçilmeye çalışılırsa
  // önce paneli açıyoruz, aksi halde "tam ekran" boş bir alan gösterirdi.
  const handleToggleTerminalFullscreen = useCallback(() => {
    setTerminalFullscreen((prev) => {
      const next = !prev;
      if (next) setTerminalPanelOpen(true);
      return next;
    });
  }, []);

  const handleTerminalResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = terminalPanelHeight;
      const onMove = (ev: MouseEvent) => {
        const delta = startY - ev.clientY;
        setTerminalPanelHeight(Math.min(MAX_TERMINAL_HEIGHT, Math.max(MIN_TERMINAL_HEIGHT, startHeight + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [terminalPanelHeight]
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleSidebarResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (sidebarCollapsed) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarCollapsed, sidebarWidth]
  );

  /**
   * Rol henüz seçilmemişse bağlantıyı DURDURUP rol ekranını açar.
   *
   * Sıra önemli: skill kurulumu `connect` içinde yapılıyor, yani rol
   * bağlantıdan ÖNCE bilinmek zorunda. Sonradan sorsaydık ilk bağlantı
   * varsayılan profille kurulur, kullanıcının seçimi bir sonraki bağlantıya
   * kadar hiçbir şeyi değiştirmezdi.
   */
  const handleCredentialsSubmit = async (username: string, password: string, client: string) => {
    if (!credentialsTarget) return;
    if (config && config.skillProfile === null) {
      setPendingConnect({ username, password, client });
      return;
    }
    await runConnect(username, password, client);
  };

  const handleRoleConfirm = async (profile: SkillProfile, noticeAccepted: boolean) => {
    const creds = pendingConnect;
    setPendingConnect(null);
    if (!creds) return;
    try {
      const next = await window.api.saveConfig({
        skillProfile: profile,
        // Onay yalnızca gerçekten soruldu ise damgalanıyor: sorulmadan
        // yazılan bir "kabul edildi" kaydı, kullanıcının görmediği bir metni
        // onaylamış gibi göstermek olurdu.
        ...(noticeAccepted ? { skillNoticeAcceptedAt: new Date().toISOString() } : {})
      });
      setConfig(next);
    } catch {
      // Ayar yazılamazsa bağlantıyı yine de kuruyoruz; kurulum en dar
      // profille (modül danışmanı) yapılır, veri kaybı yok.
    }
    await runConnect(creds.username, creds.password, creds.client);
  };

  const runConnect = async (username: string, password: string, client: string) => {
    if (!credentialsTarget) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const result = await window.api.connect({
        customerPath: credentialsTarget.path,
        service: credentialsTarget.service,
        credentials: { username, password, client }
      });
      if (result.ok) {
        pushToast("success", result.message);
        const title = `${credentialsTarget.path[credentialsTarget.path.length - 1] ?? credentialsTarget.service.name} · ${credentialsTarget.service.systemId || credentialsTarget.service.name}`;
        setCredentialsTarget(null);
        // Sohbetin ilk balonu. Bunu BURADA üretmemizin sebebi: bağlantının
        // doğrulanıp doğrulanmadığını launcher zaten biliyor. Eskiden sohbet
        // bomboş açılıyordu, kullanıcı "bu sisteme bağlı mısın" diye sormak
        // zorunda kalıyor, ajan da sıfırdan komut çalıştırıp durumu kendi
        // keşfediyordu — bir tur jeton, birkaç saniye ve tahmine dayalı bir
        // cevap. Buradaki metin ölçüm değil, olgu.
        //
        // `ok: true` + `verified: false` GERÇEK bir durum (SAML kurulumu
        // gerektiren sistemler, RFC bridge ayakta ama doğrulanmamış) — o
        // yüzden karşılama iki ayrı hâl biliyor. Sebebi ve sıradaki adımı
        // yeniden yazmıyoruz: `result.message` zaten launcher'ın dile
        // duyarlı, duruma özel açıklaması (bkz. `connectMsg`).
        const svc = credentialsTarget.service;
        const systemLabel = `${svc.name}${svc.systemId ? ` · ${svc.systemId}` : ""}`;
        const notice = [
          result.verified
            ? t("connectNotice.verified", { system: systemLabel })
            : t("connectNotice.unverified", { system: systemLabel }),
          t("connectNotice.identity", { client: result.effectiveClient || client, user: username }),
          "",
          result.message,
          "",
          result.verified ? t("connectNotice.whatNext") : t("connectNotice.whatNextUnverified")
        ].join("\n");
        // Bağlantı artık TERMİNAL AÇMIYOR: axet.code sohbetine, bu bağlantının
        // proje klasörüne bağlı boş bir sohbetle düşüyoruz (bkz.
        // openProjectDirTerminal'daki not). `nonce` şart — aynı sisteme arka
        // arkaya bağlanmak da yeni bir sohbet açmalı.
        setSapChatRequest({ projectDir: result.projectDir, label: title, notice, nonce: Date.now() });
        setActivity("axetCode");
        try {
          const cfg = await window.api.getConfig();
          setConfig(cfg);
        } catch {
          // config yeniden yüklenemezse "Son Bağlanılanlar" bir sonraki refresh'te güncellenir, kritik değil
        }
      } else {
        setConnectError(result.message);
      }
    } catch (err) {
      setConnectError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveConfig = async (partial: Partial<AppConfig>) => {
    const next = await window.api.saveConfig(partial);
    setConfig(next);
    pushToast("success", t("app.settingsSaved"));
  };

  const handleDeleteManual = (service: SapService) => {
    setDeleteTarget(service);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await window.api.removeManualSystem(deleteTarget.uuid);
    pushToast("success", t("app.systemDeleted"));
    setSelection(null);
    setDeleteTarget(null);
    refresh();
  };

  const handleEditManual = (service: SapService) => {
    setEditingSystem({
      id: service.uuid,
      name: service.name,
      systemId: service.systemId,
      type: service.type === "BTP/CLOUD" ? "cloud" : "onprem",
      host: service.host,
      diagPort: service.port,
      adtUrl: service.manualAdtUrl ?? null
    });
    setAddSystemOpen(true);
  };

  const handleToggleTheme = async () => {
    const nextTheme: AppTheme = config?.theme === "light" ? "dark" : "light";
    const next = await window.api.saveConfig({ theme: nextTheme });
    setConfig(next);
  };

  const handleToggleLanguage = async () => {
    const nextLanguage = language === "tr" ? "en" : "tr";
    const next = await window.api.saveConfig({ language: nextLanguage });
    setConfig(next);
  };

  const handleSetTier = async (service: SapService, tier: SystemTier | null) => {
    const next = await window.api.setSystemTier(service.uuid, tier);
    setConfig(next);
  };

  const handleExportManualSystems = async () => {
    const result = await window.api.exportManualSystems();
    if (result.canceled) return;
    if (result.ok) {
      pushToast("success", t("app.manualExported", { path: result.filePath ?? "" }));
    } else {
      pushToast("error", result.error ?? t("app.exportFailed"));
    }
  };

  const handleImportManualSystems = async () => {
    const result = await window.api.importManualSystems();
    if (result.canceled) return;
    if (result.ok) {
      pushToast(
        "success",
        t("app.manualImported", {
          imported: result.imported ?? 0,
          skipped: result.skipped ?? 0,
          total: result.total ?? 0
        })
      );
      refresh();
    } else {
      pushToast("error", result.error ?? t("app.importFailed"));
    }
  };

  const noLandscapeFile = landscape && landscape.customers.length === 0;

  return (
    <LanguageProvider language={language}>
      <div className="flex h-screen flex-col overflow-hidden">
        <TitleBar context={activeContext} onShowSystem={handleShowActiveSystem} onClearSap={handleClearActiveSap} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
        <ActivityBar
          activity={activity}
          onChange={setActivity}
          theme={config?.theme ?? "dark"}
          language={language.toUpperCase()}
          onToggleTheme={handleToggleTheme}
          onToggleLanguage={handleToggleLanguage}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenConnections={() => setConnectionsOpen(true)}
          connectorsConnected={Object.values(config?.connectorEnabled ?? {}).some(Boolean)}
          readinessFault={readinessFault}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* axet.code HER ZAMAN mount — gizlenirken CSS ile gizleniyor, koşullu
            render EDİLMİYOR (kullanıcı isteği, 2026-09-04: *"eğer açıksa ve
            herhangi bir sohbet devam ediyosa ekran değiştiğinde de sabit
            kalsın"*). Koşullu render'da başka bir sekmeye geçmek bileşeni
            unmount ediyordu ve bu üç şeyi birden götürüyordu: açık sohbetin
            seçimi, henüz diske yazılmamış (600ms debounce) son değişiklikler,
            ve AKAN bir cevap — main process'teki `axet-code` çalışmaya devam
            edip cevabı ölü bir bileşene teslim ediyordu. Mount'u korumak
            üçünü de tek hamlede çözüyor; bedeli yok, çünkü burada webview
            yok (bkz. axetFlowsLive'ın gizli div'inin yarattığı konsol
            gürültüsü — o yüzden O kaldırıldı, bu KALIYOR).
            Ek fayda: model listesi/sohbet geçmişi her sekme geçişinde değil
            uygulama ömründe bir kez yükleniyor. */}
        <div className={activity === "axetCode" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}>
          <AxetCodeHome
            active={activity === "axetCode"}
            config={config}
            pushToast={pushToast}
            recentEntries={recentEntries}
            connectivity={connectivity}
            tierOverrides={config?.systemTiers ?? {}}
            onOpenSapLauncher={() => setActivity("sapLauncher")}
            onQuickConnectSap={handleQuickConnectSap}
            sapChatRequest={sapChatRequest}
            activeSap={activeContext.sap}
          />
        </div>
        {activity === "axetCode" ? null : activity === "sapGuiScripting" ? (
          <SapGuiScriptingHome activeSap={activeContext.sap} />
        ) : activity === "readiness" ? (
          // Yetenek profili burada FORM DEĞİL, doğrudan kaydediliyor: bu ekranın
          // "Kaydet" düğmesi yok ve olmamalı — üç bölümün ikisi (teşhis,
          // yetenek listesi) zaten anlık, üçüncüsü (reçete) kendi düğmesini
          // taşıyor. Ekranın tepesine ortak bir kaydet koymak, bir bölümü
          // kaydedince diğer ikisinin de kaydedildiği izlenimini verirdi.
          <ReadinessHome
            projectDir={projectDir}
            skillProfile={config?.skillProfile ?? null}
            // Söz GERİ VERİLİYOR: yetenek bölümü, rol diske yazıldıktan SONRA
            // kurulumu tazeliyor. `void` ile atılsaydı kurulum eski rolü okurdu.
            onProfileChange={(profile) => handleSaveConfig({ skillProfile: profile })}
            onDoctorReport={handleDoctorReport}
          />
        ) : (
          <>
        {/* Başlık şeridi, axet.code ekranının diline çekildi (kullanıcı isteği,
            2026-09-06: *"ordaki butonlar arama kutularının şekilleri axet.code
            ekranındaki buton ve arama kutuları gibi olsun"*). Değişen üç şey:

              1. Köşeler: `rounded-sm` (4px) → `rounded-md`/`rounded-lg`. Bu
                 ekran, 4px köşeleri hâlâ kullanan son yerdi.
              2. Yükseklik: `py-1.5`ten TÜREYEN yükseklik yerine sabit `h-9`.
                 Dolgudan türeyen yükseklik yazı boyuna göre düğmeden düğmeye
                 1-2px kayıyordu (bkz. src/ui/buttons.ts başlığı).
              3. Arama kutusu: kenarlık yerine `ring-1 ring-inset` + odakta
                 vurgu halkası — axet.code kenar çubuğundaki kutunun aynısı.
                 `ring-inset` şart: dıştan halka, kutuyu komşu düğmelerden 1px
                 daha uzun gösteriyordu.

            Metinli düğmelerde renk gövdenin KENDİSİNDE (kullanıcı isteği,
            2026-09-06): önceki hâlde renk sadece ikondaydı, gövde nötrdü —
            15px'lik renkli bir ikon nötr bir düğmenin içinde kaybolduğu için
            düğmeler pratikte üç tane aynı gri kutuydu. Şimdi şeride bakınca
            hangisinin neye dokunduğu okunuyor: ekleme accent, "SAP Logon'dan
            Getir" SAP mavisi, terminal durum yeşili.

            "SİSTEM EKLE" DOLGULU (kullanıcı isteği, 2026-09-07: *"SAP
            logondaki sistem ekle butonu aynı chat ekranındaki yeni sohbet
            butonu gibi olsun"*), diğer ikisi soluk-dolgu ailesinde kaldı. Bu
            AYRIM kuralın kendisi: `btn("primary")` "ekranda en fazla bir tane"
            (bkz. src/ui/buttons.ts) ve bu şeridin cevabı gerçekten o —
            sistemsiz bir listede yapılacak tek şey sistem eklemek. Diğer ikisi
            de dolgu olsaydı kural çiğnenir ve şerit üç tane "asıl eylem benim"
            diyen düğmeye dönerdi; `tintBtn` tam bu yüzden var, kimlik veriyor
            ama sıra istemiyor. Kenar çubuğundaki "Yeni sohbet" ile aynı ilişki:
            orada da tek dolgu o.

            Sağdaki yenile düğmesi bilerek nötr kaldı: konusu kendi başına bir
            şey değil, şeridin tamamı. */}
        <header className="flex items-center gap-2 border-b border-line bg-sidebar px-4 py-2.5">
          <button
            onClick={() => setAddSystemOpen(true)}
            title={t("app.addSystemTitle")}
            // Kenar çubuğundaki "Yeni sohbet" ile aynı deri: dolgulu accent,
            // 36px boy, yarı kalın 12px yazı. Boy/punto komşularıyla aynı
            // kalıyor (`lg` + 12px), yalnızca ton dolguya geçiyor — `lg`nin
            // kendi 13px'i bırakılsaydı düğme şeritteki tek uzun yazı olurdu.
            className={btn("primary", "lg", "gap-1.5 px-3 text-[12px] font-semibold")}
          >
            <Plus size={15} className="shrink-0" />
            {t("app.addSystem")}
          </button>
          <button
            onClick={() => refreshWithToast("app.refreshedFromSapLogon")}
            title={t("app.refetchTitle")}
            className={tintBtn("sap", "lg", "gap-1.5 px-3 text-[12px]")}
          >
            <Download size={15} className={`shrink-0 ${loading ? "animate-pulse" : ""}`} />
            {t("app.refetch")}
          </button>
          <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg bg-control ring-1 ring-inset ring-line focus-within:ring-accent-500/40">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-500">
              <Search size={14} />
            </span>
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search) setSearch("");
              }}
              placeholder={t("app.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-slate-200 outline-none placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                title={t("app.clearSearch")}
                className="mr-1.5 shrink-0 cursor-pointer rounded p-1 text-slate-500 transition hover:bg-active hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={handleToggleTerminalPanel}
            title={t("app.toggleTerminalTitle")}
            className={tintBtn("terminal", "lg", "gap-1.5 px-3 text-[12px]")}
          >
            <TerminalSquare size={15} className="shrink-0" />
            {t("app.terminal")}
          </button>
          <button
            onClick={() => refreshWithToast("app.listReloaded")}
            title={t("app.reloadListTitle")}
            className={iconBtn("neutral", "lg")}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        {noLandscapeFile && (
          <div
            className="flex items-center gap-2 border-b px-4 py-2 text-sm"
            style={{
              borderColor: "var(--status-warning-border)",
              backgroundColor: "var(--status-warning-bg)",
              color: "var(--status-warning-text)"
            }}
          >
            <AlertTriangle size={14} />
            {t("app.noLandscapeFile", { file: landscape?.sourceFile ?? "" })}
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {!terminalFullscreen && (
            <aside
              style={{ width: sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth }}
              className="flex shrink-0 cursor-default flex-col overflow-hidden border-r border-line bg-sidebar"
            >
              <div className="flex items-center gap-2 p-2">
                <button
                  onClick={handleToggleSidebar}
                  title={sidebarCollapsed ? t("app.expandSidebar") : t("app.collapseSidebar")}
                  className="cursor-pointer rounded-sm p-1.5 text-slate-400 hover:bg-active hover:text-white"
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
                {!sidebarCollapsed && selection && projectDir && (
                  <div className="ml-auto flex items-center gap-1 rounded-sm border border-line p-0.5">
                    <button
                      onClick={() => setLeftPanelMode("systems")}
                      title={t("app.systemsMode")}
                      className={`cursor-pointer rounded-sm p-1.5 ${
                        leftPanelMode === "systems" ? "bg-active text-white" : "text-slate-400 hover:bg-active"
                      }`}
                    >
                      <Server size={14} />
                    </button>
                    <button
                      onClick={() => setLeftPanelMode("files")}
                      title={t("app.filesMode")}
                      className={`cursor-pointer rounded-sm p-1.5 ${
                        leftPanelMode === "files" ? "bg-active text-white" : "text-slate-400 hover:bg-active"
                      }`}
                    >
                      <FolderTree size={14} />
                    </button>
                  </div>
                )}
              </div>
              {!sidebarCollapsed && leftPanelMode === "files" && selection && projectDir ? (
                <div className="flex-1 overflow-hidden">
                  <FileExplorer
                    rootDir={projectDir}
                    rootLabel={selection.service.systemId || selection.service.name}
                    selectedPath={activeFilePath}
                    onSelectFile={handleOpenFile}
                    onImportComplete={handleImportComplete}
                    browsable
                  />
                </div>
              ) : (
                !sidebarCollapsed && (
                  <div className="flex-1 overflow-y-auto p-3 pt-0">
                    {loading && !landscape ? (
                      <div className="px-3 py-6 text-center text-sm text-slate-500">{t("common.loading")}</div>
                    ) : (
                      <>
                        {!search.trim() && (
                          <RecentSystems
                            entries={recentEntries}
                            selectedUuid={selection?.itemUuid ?? null}
                            connectivity={connectivity}
                            tierOverrides={config?.systemTiers ?? {}}
                            onSelect={handleSelect}
                          />
                        )}
                        <Tree
                          nodes={landscape?.customers ?? []}
                          search={search}
                          selectedUuid={selection?.itemUuid ?? null}
                          connectivity={connectivity}
                          tierOverrides={config?.systemTiers ?? {}}
                          onSelect={handleSelect}
                        />
                      </>
                    )}
                  </div>
                )
              )}
            </aside>
          )}

          {!terminalFullscreen && !sidebarCollapsed && (
            <div
              onMouseDown={handleSidebarResizeStart}
              title={t("app.resizeWidthTitle")}
              className="w-1 shrink-0 cursor-col-resize hover:bg-accent-500/50"
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {!terminalFullscreen && (
              <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {openFiles.length > 0 && (
                  <div className="flex h-9 w-full min-w-0 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-sidebar px-2">
                    <button
                      onClick={() => setActiveFilePath(null)}
                      className={`shrink-0 whitespace-nowrap rounded-t-sm px-3 py-1.5 text-xs ${
                        activeFilePath === null ? "bg-control text-white" : "text-slate-400 hover:bg-hover/60"
                      }`}
                    >
                      {t("app.systemDetailTab")}
                    </button>
                    {openFiles.map((f) => (
                      <div
                        key={f.path}
                        onClick={() => setActiveFilePath(f.path)}
                        className={`flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-t-sm px-3 py-1.5 text-xs ${
                          activeFilePath === f.path ? "bg-control text-white" : "text-slate-400 hover:bg-hover/60"
                        }`}
                      >
                        <FileText size={12} />
                        {f.name}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseFileTab(f.path);
                          }}
                          title={t("app.closeTabTitle")}
                          className="cursor-pointer rounded p-0.5 hover:bg-active"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="min-w-0 flex-1 overflow-y-auto">
                  {activeFilePath ? (
                    <FileViewer
                      path={activeFilePath}
                      name={openFiles.find((f) => f.path === activeFilePath)?.name ?? ""}
                    />
                  ) : (
                    <SystemPanel
                      selection={selection}
                      connectivity={connectivity}
                      tierOverrides={config?.systemTiers ?? {}}
                      lastConnectedAt={lastConnectedAt}
                      onCheck={handleCheck}
                      onConnect={handleOpenConnect}
                      onOpenSapLogon={handleOpenSapLogon}
                      onEditManual={handleEditManual}
                      onDeleteManual={handleDeleteManual}
                      onSetTier={handleSetTier}
                    />
                  )}
                </div>
              </main>
            )}

            {(terminalPanelOpen || terminalSessions.length > 0) && (
              <TerminalPanel
                sessions={terminalSessions}
                activeId={activeTerminalId}
                open={terminalPanelOpen}
                height={terminalPanelHeight}
                fullscreen={terminalFullscreen}
                onSelect={setActiveTerminalId}
                onClose={handleCloseTerminal}
                onToggleOpen={handleToggleTerminalPanel}
                onResizeStart={handleTerminalResizeStart}
                onNewTerminal={handleNewTerminal}
                onToggleFullscreen={handleToggleTerminalFullscreen}
              />
            )}
          </div>
        </div>
          </>
        )}
        </div>
        </div>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          config={config}
          onSave={handleSaveConfig}
          onExportManualSystems={handleExportManualSystems}
          onImportManualSystems={handleImportManualSystems}
        />

        <AppConnectionsModal
          open={connectionsOpen}
          projectDir={projectDir}
          // Modal kapanırken config yeniden okunuyor: bağlan/kes main
          // process'te kaydediliyor, App.tsx'in kopyası bunu bilmiyor —
          // yoksa ActivityBar'daki nokta bir sonraki açılışa kadar bayat
          // kalırdı.
          onClose={() => {
            setConnectionsOpen(false);
            window.api.getConfig().then(setConfig);
          }}
          onOpenProjectTerminal={handleOpenProjectTerminal}
        />

        <AddSystemModal
          open={addSystemOpen}
          editing={editingSystem}
          onClose={() => {
            setAddSystemOpen(false);
            setEditingSystem(null);
          }}
          onAdded={(id) => {
            pushToast("success", editingSystem ? t("app.systemUpdated") : t("app.systemAdded"));
            setEditingSystem(null);
            if (id) setPendingSelectUuid(id);
            refresh();
          }}
        />

        <ConfirmDialog
          open={deleteTarget !== null}
          title={t("app.deleteSystemTitle")}
          message={
            deleteTarget
              ? t("app.deleteSystemMessage", { name: deleteTarget.name, systemId: deleteTarget.systemId })
              : ""
          }
          confirmLabel={t("common.delete")}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />

        <CredentialsModal
          open={credentialsTarget !== null}
          service={credentialsTarget?.service ?? null}
          connecting={connecting}
          errorMessage={connectError}
          onClose={() => setCredentialsTarget(null)}
          onSubmit={handleCredentialsSubmit}
          loadDefaults={(uuid) => window.api.getCredentialDefaults(uuid)}
        />

        <RoleModal
          open={pendingConnect !== null}
          tier={
            credentialsTarget ? (config?.systemTiers?.[credentialsTarget.service.uuid] ?? null) : null
          }
          systemLabel={
            credentialsTarget
              ? `${credentialsTarget.service.name}${credentialsTarget.service.systemId ? ` · ${credentialsTarget.service.systemId}` : ""}`
              : undefined
          }
          onConfirm={handleRoleConfirm}
          onCancel={() => setPendingConnect(null)}
        />

        <UpdatePromptModal
          mode={updatePromptMode}
          status={updateStatus}
          onAccept={handleAcceptUpdate}
          onDismiss={handleDismissUpdate}
        />

        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
    </LanguageProvider>
  );
}
