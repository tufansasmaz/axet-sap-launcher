import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";
import type { ChatProject } from "../../app-electron/shared/types";
import { chatToMarkdown, safeFileName } from "../lib/chatExport";
import { chatToPrintHtml } from "../lib/chatPrint";
import { useT } from "../i18n";
import { activeGroupKeys } from "../lib/chatSessionGroups";
import { deriveTitle, type ChatSession } from "./chatTypes";

// Sohbet verisinin tek sahibi (grafit, spec §5.1). `AxetCodeHome` ve sohbet
// kenar çubuğu aynı listeyi okuyor. Diskten yükleme ve diske kayıt BURADA
// DEĞİL, `AxetCodeHome`'da: o bileşen hiç unmount olmuyor ve `loadedRef`
// koruması orada. Taşımak yalnızca veri kaybı riski getirirdi.

// Proje sayısının tavanı. Ana süreçteki `chatStore.ts` ile AYNI olmalı: orada
// fazlası kesiliyor, burada ise daha oluşturulmadan söyleniyor. Sınırın
// diskte sessizce uygulanması, kullanıcının kurduğu projenin bir sonraki
// açılışta yok olması demek olurdu.
export const MAX_PROJECTS = 40;

// Sohbet ekranında kalan işlemler: yazma kutusuna ya da süren cevaba
// dokunuyorlar. Ekran bunları `registerChatCommands` ile bırakıyor, kenar
// çubuğu `useChatCommands` ile çağırıyor.
export interface ChatCommands {
  newSession(binding?: { cwd: string; label: string } | null, notice?: string | null, projectId?: string | null): void;
  requestDelete(id: string): void;
  openProjectDialog(id: string): void;
  openShortcuts(): void;
}

export interface ChatStore {
  sessions: ChatSession[];
  setSessions: Dispatch<SetStateAction<ChatSession[]>>;
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  projects: ChatProject[];
  setProjects: Dispatch<SetStateAction<ChatProject[]>>;
  sessionsLoaded: boolean;
  setSessionsLoaded: Dispatch<SetStateAction<boolean>>;
  // Kenar çubuğunun arama metni ve açık grupları BURADA: `ChatSidebar` mod
  // değişince ve kenar çubuğu daralınca unmount oluyor, kendi state'inde
  // tutsaydı her dönüşte arama silinir, açılan gruplar kapanırdı. Kalıcı
  // değil (oturum içi). Sohbet ekranı aramayı temizlemek istediğinde (yeni
  // sohbet, SAP'den gelen sohbet) `resetSearch`'ü çağırıyor.
  sidebarQuery: string;
  setSidebarQuery: Dispatch<SetStateAction<string>>;
  openGroups: Record<string, boolean>;
  setOpenGroups: Dispatch<SetStateAction<Record<string, boolean>>>;
  resetSearch(): void;
  renameSession(id: string, title: string): void;
  moveSession(id: string, projectId: string | null): void;
  createProject(): ChatProject | null;
  deleteProject(id: string): void;
  exportSession(id: string): Promise<void>;
  registerChatCommands(commands: ChatCommands): () => void;
}

interface ChatStoreContextValue extends ChatStore {
  commands: ChatCommands;
}

const ChatStoreContext = createContext<ChatStoreContextValue | null>(null);

export function ChatStoreProvider({
  pushToast,
  children
}: {
  pushToast: (kind: "success" | "error", text: string) => void;
  children: ReactNode;
}) {
  const t = useT();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // `App`'in `pushToast`'u her çizimde yeni bir fonksiyon. Bağımlılık
  // yapılsaydı store'un bütün işlemleri her çizimde yenilenirdi.
  const pushToastRef = useRef(pushToast);
  pushToastRef.current = pushToast;

  const resetSearch = useCallback(() => setSidebarQuery(""), []);

  // Etkin sohbetin yolu açılıyor: yeni açılan ya da seçilen sohbet kapalı bir
  // grubun içinde kalsaydı listede kaybolmuş görünürdü. Yalnızca etkin sohbet
  // DEĞİŞİNCE çalışıyor — kullanıcı o grubu sonradan kapatırsa kapalı kalıyor.
  // Kenar çubuğunda değil burada, çünkü store hiç unmount olmuyor: orada her
  // dönüşte yeniden çalışır, kapatılan grubu yine açardı. Anahtarları
  // `src/lib/chatSessionGroups.ts`'teki `activeGroupKeys` hesaplıyor (kuralı
  // `groupSessions`'la aynı). Açılışta `activeId` boş olduğu için ağaç
  // tamamen kapalı başlıyor.
  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  useEffect(() => {
    const s = activeSession;
    if (!s) return;
    const keys = activeGroupKeys(s, projects);
    setOpenGroups((prev) =>
      keys.every((k) => prev[k])
        ? prev
        : { ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  const renameSession = useCallback((id: string, title: string) => {
    const next = title.trim();
    // Boş ada izin verilmiyor: sohbet listede görünmez hâle gelirdi.
    if (!next) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: deriveTitle(next), updatedAt: Date.now() } : s))
    );
  }, []);

  // `updatedAt` BİLEREK dokunulmuyor: taşımak bir konuşma değil. Taşınan
  // sohbet birdenbire en üste zıplasaydı kullanıcı onu kaybederdi.
  const moveSession = useCallback((id: string, projectId: string | null) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, projectId } : s)));
  }, []);

  const createProject = useCallback((): ChatProject | null => {
    if (projects.length >= MAX_PROJECTS) {
      pushToastRef.current("error", t("axetCodeHome.projectLimit", { count: MAX_PROJECTS }));
      return null;
    }
    const now = Date.now();
    const project: ChatProject = {
      id: crypto.randomUUID(),
      name: t("axetCodeHome.newProjectName"),
      instructions: "",
      createdAt: now,
      updatedAt: now
    };
    setProjects((prev) => [...prev, project]);
    return project;
  }, [projects.length, t]);

  // Proje silmek SOHBETLERİ SİLMİYOR, yalnızca aidiyeti kopuyor ve sohbetler
  // "Sohbetler" başlığına düşüyor. Aksi hâlde tek bir çöp kutusu düğmesi bir
  // klasör dolusu konuşmayı uyarısız yok ederdi.
  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setSessions((prev) => prev.map((s) => (s.projectId === id ? { ...s, projectId: null } : s)));
  }, []);

  // İÇERİK burada üretiliyor, kaydetme diyaloğu ve yazma ana süreçte
  // (`chat:export`). İki biçim de gönderiliyor çünkü hangisinin isteneceği
  // ancak kaydetme kutusu kapandığında belli oluyor. Hata bildirimi ana
  // süreçte (`dialog.showErrorBox`).
  const exportSession = useCallback(
    async (id: string) => {
      const target = sessions.find((s) => s.id === id);
      if (!target || target.messages.length === 0) return;
      const input = {
        title: target.title,
        messages: target.messages,
        contextPath: target.cwd,
        contextLabel: target.sapLabel
      };
      await window.api.exportChat(safeFileName(target.title, "pdf"), {
        markdown: chatToMarkdown(input),
        html: chatToPrintHtml(input)
      });
    },
    [sessions]
  );

  // Kayıtlı komutlar bir ref'te: kenar çubuğunun elindeki aracı (`commands`)
  // hiç değişmiyor, her çağrıda o anki kaydı okuyor. Kayıt yokken (ilk kare)
  // çağrı hiçbir şey yapmıyor.
  const registeredRef = useRef<ChatCommands | null>(null);
  const registerChatCommands = useCallback((next: ChatCommands) => {
    registeredRef.current = next;
    return () => {
      // Yalnızca HÂLÂ bu kayıt duruyorsa temizle: yeniden çizimde yeni kayıt
      // eskisinin iptalinden önce gelirse, eski iptal yeniyi silmesin.
      if (registeredRef.current === next) registeredRef.current = null;
    };
  }, []);
  const commands = useMemo<ChatCommands>(
    () => ({
      newSession: (...args) => registeredRef.current?.newSession(...args),
      requestDelete: (id) => registeredRef.current?.requestDelete(id),
      openProjectDialog: (id) => registeredRef.current?.openProjectDialog(id),
      openShortcuts: () => registeredRef.current?.openShortcuts()
    }),
    []
  );

  const value = useMemo<ChatStoreContextValue>(
    () => ({
      sessions,
      setSessions,
      activeId,
      setActiveId,
      projects,
      setProjects,
      sessionsLoaded,
      setSessionsLoaded,
      sidebarQuery,
      setSidebarQuery,
      openGroups,
      setOpenGroups,
      resetSearch,
      renameSession,
      moveSession,
      createProject,
      deleteProject,
      exportSession,
      registerChatCommands,
      commands
    }),
    [
      sessions,
      activeId,
      projects,
      sessionsLoaded,
      sidebarQuery,
      openGroups,
      resetSearch,
      renameSession,
      moveSession,
      createProject,
      deleteProject,
      exportSession,
      registerChatCommands,
      commands
    ]
  );

  return <ChatStoreContext.Provider value={value}>{children}</ChatStoreContext.Provider>;
}

function useChatStoreContext(): ChatStoreContextValue {
  const value = useContext(ChatStoreContext);
  if (!value) throw new Error("useChatStore yalnızca ChatStoreProvider içinde kullanılabilir");
  return value;
}

export function useChatStore(): ChatStore {
  return useChatStoreContext();
}

export function useChatCommands(): ChatCommands {
  return useChatStoreContext().commands;
}
