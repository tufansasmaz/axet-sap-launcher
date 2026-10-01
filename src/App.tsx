import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { X, FileText } from "lucide-react";
import type {
  AppConfig,
  AppTheme,
  CertTrustPrompt,
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
import Sidebar from "./shell/Sidebar";
import { listModeOf, isSidebarMode, type Activity, type SidebarMode } from "./shell/activity";
import { useShellShortcuts } from "./shell/useShellShortcuts";
import AppCommandPalette from "./components/AppCommandPalette";
import AxetCodeHome, { type SapChatRequest, type WorkDirRequest } from "./components/AxetCodeHome";
import ChatSidebar from "./components/ChatSidebar";
import ChatModeBadge from "./components/ChatModeBadge";
// axet.flows ve axet.flows Live ekranları arayüzden ÇIKARILDI (kullanıcı
// isteği, 2026-09-04): uygulama GitHub'a açılırken bu iki modül henüz hazır
// değil ve akıbetleri sonra kararlaştırılacak. Kaynak dosyalar
// (AxetFlowsHome.tsx, AxetFlowsLiveHome.tsx, src/flows/**,
// src/components/flows/**, app-electron/main/axetFlows*.ts, flowRuntime.js)
// diskte DURUYOR, yalnızca import/route/rayları kaldırıldı — geri açmak
// bu üç yeri (import, kenar çubuğundaki mod sekmesi (src/shell/activity.ts),
// aşağıdaki route dalı) geri eklemekten ibaret.
import SapGuiScriptingHome from "./components/SapGuiScriptingHome";
import ScriptSidebar from "./components/ScriptSidebar";
import { ScriptStoreProvider } from "./stores/scriptStore";
import LogonSidebar from "./components/LogonSidebar";
import SystemPanel from "./components/SystemPanel";
import SettingsModal from "./components/SettingsModal";
import AppConnectionsModal from "./components/AppConnectionsModal";
import CredentialsModal from "./components/CredentialsModal";
import ReadinessHome from "./components/ReadinessHome";
import { hasDoctorFault } from "../app-electron/shared/doctorSeverity";
import { SIDEBAR_DEFAULT_WIDTH } from "../app-electron/shared/sidebarLayout";
import RoleModal from "./components/RoleModal";
import TierPromptModal from "./components/TierPromptModal";
import { guessTier } from "./lib/tier";
import AddSystemModal, { type EditingManualSystem } from "./components/AddSystemModal";
import UpdatePromptModal, { type UpdatePromptMode } from "./components/UpdatePromptModal";
import SapWriteGate from "./components/SapWriteGate";
import type { SapWriteState } from "../app-electron/shared/sapWriteTypes";
import ConfirmDialog from "./components/ConfirmDialog";
import CertTrustDialog from "./components/CertTrustDialog";
import Toast, { type ToastMsg } from "./components/Toast";
import TerminalSidebar from "./components/TerminalSidebar";
import TerminalMode from "./terminal/TerminalMode";
import { TerminalStoreProvider } from "./stores/terminalStore";
import FileViewer from "./components/FileViewer";
import { ChatStoreProvider } from "./stores/chatStore";
import { flattenLandscape } from "./lib/landscape";
import { applyAppearance } from "./ui/appearance";
import { useActiveContext } from "./lib/useActiveContext";
import { useDocumentLanguage } from "./ui/useDocumentLanguage";
import { LanguageProvider, translate } from "./i18n";

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
  // Kenar çubuğunun ortasında duran liste. Hazırlık açılınca son modunki
  // kalıyor (spec §6.2), bu yüzden son mod ayrıca tutuluyor.
  const [lastListMode, setLastListMode] = useState<SidebarMode>("axetCode");
  useEffect(() => {
    if (isSidebarMode(activity)) setLastListMode(activity);
  }, [activity]);
  const listMode = listModeOf(activity, lastListMode);
  const [landscape, setLandscape] = useState<SapLandscape | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [connectivity, setConnectivity] = useState<Record<string, ConnectivityState>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [credentialsTarget, setCredentialsTarget] = useState<Selection | null>(null);
  // İşaretsiz sisteme bağlanmadan önce "bu sistem hangisi?" sorusu (bkz.
  // TierPromptModal). Cevaptan sonra kimlik penceresi bu seçimle açılıyor.
  const [tierPromptTarget, setTierPromptTarget] = useState<Selection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  // Bağlanma, SAP sertifikası doğrulanamadığı ya da değiştiği için kimlik
  // bilgisi GÖNDERİLMEDEN durdu; kullanıcı onaylarsa aynı bilgilerle yeniden
  // deneniyor. Kimlik bilgisi burada, açık olan kimlik penceresinin zaten
  // tuttuğundan fazla bir yerde tutulmuyor ve pencere kapanınca siliniyor.
  const [certPrompt, setCertPrompt] = useState<{
    prompt: CertTrustPrompt;
    username: string;
    password: string;
    client: string;
  } | null>(null);
  const [certApproving, setCertApproving] = useState(false);
  // Rol seciminin beklettigi kimlik bilgileri. Rol ekrani artik ACILISTA
  // aciliyor (bkz. roleGateOpen); bu alan yalnizca "rolsuz kullanici bir sekilde
  // baglanti akisina girdi" durumunda bagalantiyi bekletmek icin duruyor.
  const [pendingConnect, setPendingConnect] = useState<{
    username: string;
    password: string;
    client: string;
  } | null>(null);
  // Başarılı bağlantıdan sonra axet.code'a devredilen "bu sisteme bağlı bir
  // sohbet aç" isteği (bkz. AxetCodeHome `SapChatRequest`).
  const [sapChatRequest, setSapChatRequest] = useState<SapChatRequest | null>(null);
  // Dosya Gezgini'nden seçilen klasörün ajanın çalışma klasörü olması isteği
  // (bkz. AxetCodeHome `WorkDirRequest`).
  const [workDirRequest, setWorkDirRequest] = useState<WorkDirRequest | null>(null);
  const [addSystemOpen, setAddSystemOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<EditingManualSystem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SapService | null>(null);
  const [pendingSelectUuid, setPendingSelectUuid] = useState<string | null>(null);
  // "AXET Projesi Seç" sayacı: her artışta Terminal modunda bir AXET bölmesi (Görev 5).
  const [projectTerminalRequest, setProjectTerminalRequest] = useState(0);
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
  const [sapWriteState, setSapWriteState] = useState<SapWriteState>({ sessions: [], pending: [] });
  const [dismissedUpdateVersion, setDismissedUpdateVersion] = useState<string | null>(null);
  const scanGenerationRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const pendingConnectivityRef = useRef<Record<string, ConnectivityState>>({});
  const flushTimerRef = useRef<number | null>(null);
  // Aktif bağlam TEK KEZ burada okunuyor ve prop olarak dağıtılıyor. Hook'u
  // her ihtiyaç duyan bileşende ayrı ayrı çağırmak, aynı yayına N ayrı abone
  // ve N ayrı kopya demek olurdu — "tek bir yerde toplama" isteğinin tam
  // tersi (bkz. app-electron/main/activeContext.ts).
  const activeContext = useActiveContext();

  const language = config?.language ?? "tr";
  useDocumentLanguage(language);
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

  // Görünüm değişimi (palet ve koyu/açık). `theme-transition` sınıfı SADECE
  // kullanıcı değiştirdiğinde ve geçiş süresince ekleniyor (bkz.
  // src/ui/appearance.ts) — ilk yüklemede `src/main.tsx` aynı değerleri zaten
  // yazdı, burada yeniden yazmak görünür bir şey değiştirmiyor.
  const previousAppearanceRef = useRef<string | null>(null);
  useEffect(() => {
    if (!config?.theme) return;
    const palette = config.palette ?? "ntt";
    const key = `${palette}/${config.theme}`;
    const isSwitch = previousAppearanceRef.current !== null && previousAppearanceRef.current !== key;
    previousAppearanceRef.current = key;
    return applyAppearance(document.documentElement, palette, config.theme, isSwitch);
  }, [config?.palette, config?.theme]);

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
    // ayarını bozardı.
    // NOT (2026-09-29): boş ekran sadeleşti, `--chat-hero-size`ı artık hiçbir
    // şey okumuyor. Değişken Ayarlar ekranı ele alınınca kaldırılacak.
    const heroSize = { sm: "50px", md: "60px", lg: "70px" }[config.chatFontSize];
    // Mesajlar arası dikey boşluk. "Yoğun" ekrana daha çok mesaj sığdırır,
    // "rahat" uzun cevapların birbirine karışmasını önler. 32px→16px
    // (2026-09-29): cevaplar artık balonsuz, araç satırı ve cevap satırı
    // aralarında zaten ritim kuruyor; 32px konuşmayı dağıtıyordu.
    const gap = config.chatDensity === "compact" ? "12px" : "16px";
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

  // SAP DEV yazma onayı: main her değişikliği (oturum açıldı/kapandı, mod
  // seçildi, istek geldi/cevaplandı/süresi doldu) tam durum olarak yayınlıyor.
  // Mount'ta bir kez çekiliyor — pencere açılmadan önce gelen istek kaybolmasın.
  useEffect(() => {
    window.api.getSapWriteState().then(setSapWriteState);
    return window.api.onSapWriteChanged(setSapWriteState);
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
  const handleQuickConnectSap = useCallback(
    (path: string[], service: SapService, itemUuid: string) => {
      setActivity("sapLauncher");
      setSelection({ path, service, itemUuid });
      beginConnect({ path, service, itemUuid });
    },
    [config?.systemTiers]
  );

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

  // Gezginde yeni bir kök klasör seçildiğinde: yetenekleri oraya kur ve klasörü
  // ajanın çalışma klasörü yap. Kurulum ÖNCE bitmeli — sohbet klasöre taşınınca
  // ajan oradaki `.claude/skills`i okuyor, sonradan kurulan yeteneği görmüyor.
  const handleExplorerRootPicked = useCallback(
    async (dir: string) => {
      const res = await window.api.adoptWorkDir(dir, selection?.service.uuid ?? null);
      if (!res.ok || !res.dir) {
        pushToast("error", t("workDir.failed", { message: res.error ?? "" }));
        return;
      }
      const lines = [
        t("workDir.adopted", { dir: res.dir }),
        t("workDir.skills", { count: String(res.installed ?? 0) })
      ];
      if (res.blockedByTier && res.blockedByTier.length > 0) {
        lines.push(t("workDir.blockedByTier", { names: res.blockedByTier.join(", ") }));
      }
      setWorkDirRequest({ dir: res.dir, notice: lines.join("\n\n"), nonce: Date.now() });
    },
    [selection?.service.uuid, t]
  );

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

  /**
   * Bağlantının İLK adımı. Sistem işaretsizse (kullanıcı DEV/QA/PRD demediyse)
   * önce önem derecesi soruluyor, sonra kimlik penceresi açılıyor.
   *
   * Neden kimlikten ÖNCE: yazma kapısı `.conn_adt`'a bağlanırken yazılıyor ve
   * hangi ADT motorunun (yazan / salt okunur) kurulacağı da o anda seçiliyor.
   * Bağlandıktan sonra sorsaydık ilk bağlantı her zaman salt okunur kurulurdu.
   * Şifreyi soru boyunca state'te bekletmemek de ikinci sebep.
   *
   * `guessTier` burada KULLANILMIYOR: addan tahmin rozette görünüyor ama
   * launcher yalnızca `systemTiers`'a bakıyor. Tahmin edilmiş bir DEV'i
   * "işaretli" saymak, kullanıcının hiç onaylamadığı bir yazma iznini açardı.
   */
  function beginConnect(sel: Selection) {
    setConnectError(null);
    if (config && !config.systemTiers?.[sel.service.uuid]) {
      setTierPromptTarget(sel);
      return;
    }
    setCredentialsTarget(sel);
  }

  const handleOpenConnect = (sel: Selection) => {
    beginConnect(sel);
  };

  const handleTierChosen = async (tier: SystemTier) => {
    const sel = tierPromptTarget;
    setTierPromptTarget(null);
    if (!sel) return;
    try {
      await handleSetTier(sel.service, tier);
    } catch (err) {
      // Kaydedilemezse bağlantı işaretsiz (salt okunur) kurulur — yanlış yön
      // değil, güvenli yön. Kullanıcı neden yazamadığını buradan öğreniyor.
      pushToast("error", t("tierPrompt.saveFailed", { message: (err as Error).message }));
    }
    setCredentialsTarget(sel);
  };

  const handleTierSkipped = () => {
    const sel = tierPromptTarget;
    setTierPromptTarget(null);
    if (sel) setCredentialsTarget(sel);
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

  // Terminal yalnız Terminal modunda (2026-09-29, spec §1). Sohbet ekranında
  // terminal yok (2026-09-05 kararı), Logon'un alttaki paneli de kalktı.
  //
  // Uygulama Bağlantıları — "AXET Projesi Seç": `axet-code` etkileşimli
  // açılınca Connector/MCP araçlarının istediği proje seçim ekranını
  // gösteriyor. Terminal moduna geçip sağlayıcıya bir AXET bölmesi açtırıyoruz;
  // hangi alana ve hangi klasörde açılacağına sağlayıcı karar veriyor.
  const handleOpenProjectTerminal = useCallback(() => {
    setActivity("terminal");
    setProjectTerminalRequest((n) => n + 1);
  }, []);

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

  /**
   * Rol kapısı: config okundu ve içinde rol YOKSA açık.
   *
   * Kullanıcı (2026-09-08): *"uygulama kurulduktan sonra açılır açılmaz
   * danışmanlık statüsünü sorsun zorunlu"* ve *"ilk açıldığında sorsun hiç
   * seçilmediyse"*. Yani tetikleyici bağlantı değil, uygulamanın kendisi:
   * kuran ama henüz hiçbir sisteme bağlanmamış kullanıcı da rolünü seçmiş
   * oluyor, ve bu rol o andan itibaren BÜTÜN SAP sistemleri için geçerli
   * (rol tek bir küresel ayar, her proje klasörüne o kuruluyor).
   *
   * `config === null` iken açılmıyor: ayar dosyası daha okunmadan pencere
   * açsaydık, rolü zaten seçmiş kullanıcıya her açılışta bir kez sorardı.
   */
  const roleGateOpen = config !== null && config.skillProfile === null;

  const handleRoleConfirm = async (profile: SkillProfile, noticeAccepted: boolean) => {
    const creds = pendingConnect;
    setPendingConnect(null);
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
    // Rol yokken bir bağlantı beklemeye alınmışsa kaldığı yerden sürüyor.
    // Açılış kapısında böyle bir bekleyen yok; o durumda pencere kapanır ve
    // kullanıcı normal ekrana düşer.
    if (creds) await runConnect(creds.username, creds.password, creds.client);
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
        if (result.certPrompt) {
          setCertPrompt({ prompt: result.certPrompt, username, password, client });
        }
      }
    } catch (err) {
      setConnectError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  // Sertifika onayı. Kaydedilen parmak izi ana sürecin ölçtüğü değer; eşleşmezse
  // (ör. arada başka bir bağlanma denemesi yeni bir ölçüm getirdiyse) kayıt
  // yapılmıyor ve kullanıcıdan yeniden bağlanması isteniyor.
  const handleCertTrust = async () => {
    if (!certPrompt) return;
    setCertApproving(true);
    try {
      const saved = await window.api.approveCertificate(certPrompt.prompt.key, certPrompt.prompt.fingerprint);
      const creds = certPrompt;
      setCertPrompt(null);
      if (!saved) {
        setConnectError(t("certTrust.approveFailed"));
        return;
      }
      await runConnect(creds.username, creds.password, creds.client);
    } catch (err) {
      setCertPrompt(null);
      setConnectError((err as Error).message);
    } finally {
      setCertApproving(false);
    }
  };

  // `silent`: Ayarlar'ın ara kayıtları (güncelleme kontrolünden önce
  // `autoCheckUpdates`) bildirim çıkarmıyor — kullanıcı Kaydet'e basmadı,
  // "Ayarlar kaydedildi" formdaki öteki düzenlemeleri de kaydedilmiş sandırırdı.
  const handleSaveConfig = async (partial: Partial<AppConfig>, options?: { silent?: boolean }) => {
    const next = await window.api.saveConfig(partial);
    setConfig(next);
    if (!options?.silent) pushToast("success", t("app.settingsSaved"));
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

  // Kenar çubuğunun genişliği ve daraltması config'te duruyor; bileşen
  // değer değişince bir kez haber veriyor, burada doğrudan yazılıyor.
  const sidebarWidth = config?.sidebarWidth ?? SIDEBAR_DEFAULT_WIDTH;
  const sidebarCollapsed = config?.sidebarCollapsed ?? false;

  // Yazma reddedilirse bildirim çıkıyor: yoksa işlenmemiş bir reddetme olur,
  // kenar çubuğu sürüklenen genişliği gösterirken diskte eskisi kalırdı ve
  // kullanıcı bunu bir sonraki açılışta fark ederdi. `pushToast` yalnızca
  // setter kullanıyor, bağımlılık olmasına gerek yok.
  const saveSidebarConfig = useCallback(
    async (partial: Partial<AppConfig>) => {
      try {
        setConfig(await window.api.saveConfig(partial));
      } catch (err) {
        pushToast("error", t("app.settingsSaveFailed", { message: (err as Error).message }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const handleSidebarWidthCommit = useCallback(
    (width: number) => saveSidebarConfig({ sidebarWidth: width }),
    [saveSidebarConfig]
  );

  const handleSidebarCollapsedChange = useCallback(
    (collapsed: boolean) => saveSidebarConfig({ sidebarCollapsed: collapsed }),
    [saveSidebarConfig]
  );

  useShellShortcuts({
    listMode,
    sidebarCollapsed,
    onModeChange: setActivity,
    onExpandSidebar: () => handleSidebarCollapsedChange(false),
    onOpenPalette: () => setPaletteOpen(true)
  });

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
      <ChatStoreProvider pushToast={pushToast}>
      <ScriptStoreProvider>
      <TerminalStoreProvider
        config={config}
        visible={activity === "terminal"}
        projectRequest={projectTerminalRequest}
        pushToast={pushToast}
        onConfigSaved={setConfig}
      >
      <div className="flex h-screen flex-col overflow-hidden">
        <TitleBar context={activeContext} onShowSystem={handleShowActiveSystem} onClearSap={handleClearActiveSap} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
            mode={listMode}
            readinessOpen={activity === "readiness"}
            onModeChange={setActivity}
            footer={{
              readinessOpen: activity === "readiness",
              readinessFault,
              onOpenReadiness: () => setActivity("readiness"),
              connectorCount: Object.values(config?.connectorEnabled ?? {}).filter(Boolean).length,
              onOpenConnections: () => setConnectionsOpen(true),
              theme: config?.theme ?? "dark",
              language: language.toUpperCase(),
              onToggleTheme: handleToggleTheme,
              onToggleLanguage: handleToggleLanguage,
              onOpenSettings: () => setSettingsOpen(true)
            }}
            width={sidebarWidth}
            collapsed={sidebarCollapsed}
            onWidthCommit={handleSidebarWidthCommit}
            onCollapsedChange={handleSidebarCollapsedChange}
            // Sohbet ekranındayken satır noktaları zaten görünüyor; sekmede
            // ikinci bir nokta yalnızca başka moddayken anlam taşıyor.
            modeBadges={activity === "axetCode" ? undefined : { axetCode: <ChatModeBadge /> }}
          >
            {listMode === "axetCode" ? (
              <ChatSidebar
                recentEntries={recentEntries}
                connectivity={connectivity}
                tierOverrides={config?.systemTiers ?? {}}
                activeSap={activeContext.sap}
                onOpenSapLauncher={() => setActivity("sapLauncher")}
                onQuickConnectSap={handleQuickConnectSap}
              />
            ) : listMode === "sapLauncher" ? (
              <LogonSidebar
                search={search}
                onSearchChange={setSearch}
                searchInputRef={searchInputRef}
                mode={leftPanelMode}
                onModeChange={setLeftPanelMode}
                files={
                  selection && projectDir
                    ? {
                        rootDir: projectDir,
                        rootLabel: selection.service.systemId || selection.service.name,
                        selectedPath: activeFilePath,
                        onSelectFile: handleOpenFile,
                        onImportComplete: handleImportComplete,
                        onRootPicked: handleExplorerRootPicked
                      }
                    : null
                }
                loading={loading && !landscape}
                customers={landscape?.customers ?? []}
                recentEntries={recentEntries}
                selectedUuid={selection?.itemUuid ?? null}
                connectivity={connectivity}
                tierOverrides={config?.systemTiers ?? {}}
                onSelect={handleSelect}
                onAddSystem={() => setAddSystemOpen(true)}
                onRefreshFromSapLogon={() => refreshWithToast("app.refreshedFromSapLogon")}
                onReloadList={() => refreshWithToast("app.listReloaded")}
              />
            ) : listMode === "sapGuiScripting" ? (
              <ScriptSidebar />
            ) : (
              <TerminalSidebar />
            )}
          </Sidebar>
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
            sapChatRequest={sapChatRequest}
            workDirRequest={workDirRequest}
            activeSap={activeContext.sap}
          />
        </div>
        {/* Terminal de HER ZAMAN takılı (spec §4): mod değişince pty'ler ve
            xterm tamponları yaşamaya devam ediyor. Görünürlüğü sağlayıcıya
            `visible` ile ayrıca söylüyoruz; gizliyken gelen çıktı alanı
            "okunmadı" yapıyor. */}
        <div className={activity === "terminal" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}>
          <TerminalMode />
        </div>
        {activity === "axetCode" || activity === "terminal" ? null : activity === "sapGuiScripting" ? (
          <SapGuiScriptingHome activeSap={activeContext.sap} />
        ) : activity === "readiness" ? (
          // Yetenek profili burada FORM DEĞİL, doğrudan kaydediliyor: bu ekranın
          // "Kaydet" düğmesi yok ve olmamalı — üç bölümün ikisi (teşhis,
          // yetenek listesi) zaten anlık, üçüncüsü (reçete) kendi düğmesini
          // taşıyor. Ekranın tepesine ortak bir kaydet koymak, bir bölümü
          // kaydedince diğer ikisinin de kaydedildiği izlenimini verirdi.
          <ReadinessHome
            projectDir={projectDir}
            // Yalnızca GÖSTERİM: rol ilk açılıştaki kapıda seçildi ve
            // değişmiyor, bu yüzden buraya bir "değiştir" sözü inmiyor.
            skillProfile={config?.skillProfile ?? null}
            onDoctorReport={handleDoctorReport}
          />
        ) : (
          <>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
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
                      listEmpty={!!noLandscapeFile}
                      emptyHint={
                        noLandscapeFile ? t("app.noLandscapeFile", { file: landscape?.sourceFile ?? "" }) : undefined
                      }
                      onAddSystem={() => setAddSystemOpen(true)}
                    />
                  )}
                </div>
              </main>
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
          // yoksa kenar çubuğundaki nokta bir sonraki açılışa kadar bayat
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
          onClose={() => {
            setCredentialsTarget(null);
            setCertPrompt(null);
          }}
          onSubmit={handleCredentialsSubmit}
          loadDefaults={(uuid) => window.api.getCredentialDefaults(uuid)}
        />

        <CertTrustDialog
          prompt={credentialsTarget ? certPrompt?.prompt ?? null : null}
          busy={certApproving || connecting}
          onTrust={() => void handleCertTrust()}
          onCancel={() => setCertPrompt(null)}
        />

        <TierPromptModal
          open={tierPromptTarget !== null}
          systemLabel={
            tierPromptTarget
              ? `${tierPromptTarget.service.name}${tierPromptTarget.service.systemId ? ` · ${tierPromptTarget.service.systemId}` : ""}`
              : ""
          }
          guess={tierPromptTarget ? guessTier(tierPromptTarget.service) : null}
          onChoose={(tier) => void handleTierChosen(tier)}
          onSkip={handleTierSkipped}
        />

        <RoleModal
          open={roleGateOpen}
          tier={
            credentialsTarget ? (config?.systemTiers?.[credentialsTarget.service.uuid] ?? null) : null
          }
          systemLabel={
            credentialsTarget
              ? `${credentialsTarget.service.name}${credentialsTarget.service.systemId ? ` · ${credentialsTarget.service.systemId}` : ""}`
              : undefined
          }
          onConfirm={handleRoleConfirm}
        />

        <UpdatePromptModal
          mode={updatePromptMode}
          status={updateStatus}
          onAccept={handleAcceptUpdate}
          onDismiss={handleDismissUpdate}
        />

        <AppCommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          systems={flatSystems}
          setActivity={setActivity}
          onSelectSystem={setPendingSelectUuid}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleTheme={handleToggleTheme}
          onToggleLanguage={handleToggleLanguage}
        />

        <SapWriteGate
          state={sapWriteState}
          onSetMode={window.api.setSapWriteMode}
          onRespond={window.api.respondSapWrite}
        />

        <div className="fixed bottom-4 right-4 z-toast flex flex-col gap-2">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
      </TerminalStoreProvider>
      </ScriptStoreProvider>
      </ChatStoreProvider>
    </LanguageProvider>
  );
}
