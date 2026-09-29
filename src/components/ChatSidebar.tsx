import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Download,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Keyboard,
  Link2,
  Pencil,
  Plus,
  Search,
  Server,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import type {
  ActiveSapContext,
  ConnectivityState,
  SapService,
  SystemTier,
} from "../../app-electron/shared/types";
import { useT } from "../i18n";
import {
  activeGroupKeys,
  filterSessions,
  groupSessions,
  normalizeSessionQuery,
  orderSessions,
  GENERAL_GROUP_KEY,
  PROJECTS_SECTION_KEY,
  SAP_SECTION_KEY,
} from "../lib/chatSessionGroups";
import { resolveTier } from "../lib/tier";
import { ActiveLine } from "../shell/SidebarFooter";
import { useChatCommands, useChatStore } from "../stores/chatStore";
import type { ChatSession, RecentEntry } from "../stores/chatTypes";
import { Eyebrow } from "../ui/Eyebrow";
import StatusDot from "./StatusDot";
import SystemHoverCard from "./SystemHoverCard";
import TierBadge from "./TierBadge";

// Sohbet listesi: arama, proje / SAP / genel grupları, SAP bağlantıları.
// `AxetCodeHome`'dan taşındı (grafit, spec §5.1). Veri `ChatStore`'da;
// yazma kutusuna ya da süren cevaba dokunan işler (yeni sohbet, silme,
// proje penceresi, kısayol listesi) sohbet ekranında kalıyor ve buradan
// `useChatCommands` ile çağrılıyor.

// Taşıma menüsünün en fazla yüksekliği. Menünün konumu bununla alt kenara
// sıkıştırılıyor, yani ikisi aynı sayı olmak zorunda.
const MOVE_MENU_MAX_H = 280;

export interface ChatSidebarProps {
  recentEntries: RecentEntry[];
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  activeSap: ActiveSapContext | null;
  onOpenSapLauncher: () => void;
  onQuickConnectSap: (path: string[], service: SapService, itemUuid: string) => void;
}

export default function ChatSidebar({
  recentEntries,
  connectivity,
  tierOverrides,
  activeSap,
  onOpenSapLauncher,
  onQuickConnectSap,
}: ChatSidebarProps) {
  const t = useT();
  const {
    sessions,
    activeId,
    setActiveId,
    projects,
    searchResetKey,
    renameSession,
    moveSession,
    createProject,
    exportSession,
  } = useChatStore();
  const commands = useChatCommands();

  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  // "Projeye taşı" menüsü. Konum SABİT (viewport) koordinat: menü kenar
  // çubuğunun kaydırılan listesinin içinde açılsaydı, listeyle birlikte
  // kayar ve `overflow-hidden` sınırında kırpılırdı.
  const [moveMenu, setMoveMenu] = useState<{ sessionId: string; x: number; y: number } | null>(null);

  // Sohbet ekranı aramayı temizlemek istediğinde (yeni sohbet, SAP'den
  // gelen sohbet) sayacı artırıyor. İlk çizimde de çalışıyor, zararsız.
  useEffect(() => {
    setQuery("");
  }, [searchResetKey]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const orderedSessions = useMemo(() => orderSessions(sessions), [sessions]);
  const normalizedQuery = normalizeSessionQuery(query);
  const visibleSessions = useMemo(
    () => filterSessions(orderedSessions, normalizedQuery),
    [normalizedQuery, orderedSessions],
  );
  // --- Kenar çubuğu grupları (ChatGPT'nin "projeler" yapısı) ---
  //
  // Kullanıcı isteği (2026-09-06): *"sisteme bağlantı yaptığımız sohbetlerle
  // normal sohbetlerin başlıkları ayrı olsun ayrı başlıklar altında olsunlar
  // ve daraltıp genişletme olayı olsun"*. Önceden liste tamamen düzdü ve bir
  // SAP sohbetiyle sıradan bir sohbet aynı görünüyordu.
  const sessionGroups = useMemo(
    () => groupSessions(visibleSessions, projects, Boolean(normalizedQuery)),
    [normalizedQuery, projects, visibleSessions],
  );

  // Yalnızca AÇILMIŞ olanlar tutuluyor: varsayılan kapalı. Açık gelen ağaç
  // bütün sohbetleri bir anda döküyordu; kullanıcı yalnızca başlıkları görüp
  // istediği düğümü açmak istedi. Kalıcı değil (oturum içi) — kenar çubuğunun
  // açık/kapalı durumu gibi.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  // Arama sırasında daraltma YOK SAYILIYOR: eşleşen bir sohbet kapalı bir
  // grubun içinde kalsaydı arama bozuk görünürdü.
  const groupOpen = (key: string) =>
    Boolean(normalizedQuery) || Boolean(openGroups[key]);
  // Etkin sohbetin yolu açılıyor: yeni açılan ya da seçilen sohbet kapalı bir
  // grubun içinde kalsaydı listede kaybolmuş görünürdü. Yalnızca etkin sohbet
  // DEĞİŞİNCE çalışıyor — kullanıcı o grubu sonradan kapatırsa kapalı kalıyor.
  // Anahtarları `src/lib/chatSessionGroups.ts`'teki `activeGroupKeys`
  // hesaplıyor (kuralı `groupSessions`'la aynı). Açılışta `activeId` boş
  // olduğu için ağaç tamamen kapalı başlıyor.
  useEffect(() => {
    const s = activeSession;
    if (!s) return;
    const keys = activeGroupKeys(s, projects);
    setOpenGroups((prev) =>
      keys.every((k) => prev[k])
        ? prev
        : { ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  const commitRename = useCallback(() => {
    const id = renamingId;
    if (!id) return;
    setRenamingId(null);
    renameSession(id, renameDraft);
  }, [renameDraft, renamingId, renameSession]);

  // Yeni proje HEMEN ayar kutusunu açıyor: varsayılan adıyla ("Yeni proje")
  // bırakılan bir proje, ikinci projeden itibaren ayırt edilemez olurdu.
  // Pencere sohbet ekranında çiziliyor, bu yüzden komutla açılıyor.
  const handleCreateProject = useCallback(() => {
    const project = createProject();
    if (project) commands.openProjectDialog(project.id);
  }, [commands, createProject]);

  // Var olan bir sohbeti bir projeye taşı / projeden çıkar (bkz. store'daki
  // `moveSession`: `updatedAt` bilerek dokunulmuyor).
  const handleMoveSession = useCallback(
    (sessionId: string, projectId: string | null) => {
      moveSession(sessionId, projectId);
      setMoveMenu(null);
    },
    [moveSession],
  );

  // "Projeye taşı" menüsünün açık olduğu sohbet — o an hangi projede olduğunu
  // (ve "projeden çıkar"ın gösterilip gösterilmeyeceğini) buradan okuyor.
  const moveTarget = moveMenu
    ? sessions.find((s) => s.id === moveMenu.sessionId) ?? null
    : null;

  // Kenar çubuğundaki tek satır. Ayrı bir fonksiyon çünkü artık iki kat
  // (grup > satır) içinde çağrılıyor ve JSX'i yerinde bırakmak listeyi
  // okunmaz hâle getiriyordu.
  const renderSessionRow = (session: ChatSession) => {
    const isActive = activeId === session.id;
    if (renamingId === session.id) {
      return (
        <div key={session.id} className="flex h-7 items-center px-1">
          <input
            autoFocus
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                // Escape'te `commitRename` çalışmamalı; blur onu yine
                // tetiklemesin diye önce state kapatılıyor.
                setRenamingId(null);
              }
            }}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded bg-app px-2 py-0.5 text-sm text-slate-100 outline-none ring-1 ring-accent-500/50"
          />
        </div>
      );
    }
    const actionClass =
      "shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover:opacity-100";
    return (
      <div
        key={session.id}
        role="button"
        tabIndex={0}
        onClick={() => setActiveId(session.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveId(session.id);
          }
        }}
        title={session.title}
        aria-current={isActive ? "true" : undefined}
        // 28px satır (spec §6.5): eskiden 36px'ti ve kenarlıklıydı. Seçili
        // satır zeminden ve soldaki çizgiden tanınıyor; kenarlık yok, yani
        // seçim satırın ölçüsünü değiştirmiyor.
        className={`group relative flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors ${
          isActive
            ? "bg-[var(--accent-glow)] text-slate-100"
            : "text-slate-400 hover:bg-hover/60 hover:text-slate-300"
        }`}
      >
        {isActive && <ActiveLine />}
        {/* Sohbet ikonu KALDIRILDI (kullanıcı isteği, 2026-09-06: *"chat
            kısmında sohbetlerin yanındaki iconu kaldıralım"*). Bir sohbet
            listesinde her satıra "bu bir sohbettir" ikonu koymak bilgi
            taşımıyordu; kalkınca başlıklar da daha geniş yer buldu. */}
        <span className="min-w-0 flex-1 truncate">{session.title}</span>
        {session.pending && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
          </span>
        )}
        {/* "Projeye taşı" — yalnızca gidecek bir proje varsa. Proje kurmamış
            kullanıcıya boş bir menü açan düğme göstermenin anlamı yok.
            Menü SABİT konumlu (bkz. `moveMenu`): kaydırılan listenin içinde
            açılsaydı listeyle kayar ve kenar çubuğunun sınırında kırpılırdı. */}
        {projects.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              // Alt kenara sıkıştırma: listenin en altındaki bir sohbette menü
              // ekranın dışında açılır ve tıklanamaz olurdu.
              setMoveMenu({
                sessionId: session.id,
                x: rect.left,
                y: Math.min(
                  rect.bottom + 4,
                  window.innerHeight - MOVE_MENU_MAX_H - 8,
                ),
              });
            }}
            title={t("axetCodeHome.moveToProject")}
            className={actionClass}
          >
            <FolderInput size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setRenameDraft(session.title);
            setRenamingId(session.id);
          }}
          title={t("axetCodeHome.renameTitle")}
          className={actionClass}
        >
          <Pencil size={12} />
        </button>
        {/* Dışa aktarma yalnızca DOLU sohbetlerde: boş bir sohbetin dosyası
            yalnızca başlıktan ibaret olurdu. Biçim seçimi burada DEĞİL,
            kaydetme kutusunun kendi "dosya türü" listesinde — bu şeride ikinci
            bir ikon koymak gürültü olurdu. */}
        {session.messages.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              void exportSession(session.id);
            }}
            title={t("axetCodeHome.exportTitle")}
            className={actionClass}
          >
            <Download size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            commands.requestDelete(session.id);
          }}
          title={t("axetCodeHome.deleteTitle")}
          // `focus-visible:opacity-100` olmadan bu buton klavyeyle gezildiğinde
          // odaklanıyor ama GÖRÜNMÜYORDU.
          className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-[var(--status-danger-text)] focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Başlık şeridi: ARAMA + kısayol listesi. Daraltma düğmesi buradan
          kalktı; daraltma kabuğun işi (grafit). Eskiden solda tek başına bir
          ☰ vardı ve arama listenin içinde ayrı bir satırdı.

          Arama HEP AÇIK (kullanıcı isteği, 2026-09-04: *"arama kutusu açık
          olarak gelsin, kapanmasına gerek yok"*). 2026-09-02'de istenen
          açılır/kapanır büyüteç kaldırıldı — bir tık kazanmak için kutunun
          varlığını gizlemeye değmiyordu; büyüteç artık sadece bir ikon. */}
      <div className="flex h-[54px] shrink-0 items-center gap-1.5 px-2.5">
        <div className="flex min-w-0 flex-1 items-center rounded-lg bg-control ring-1 ring-inset ring-line focus-within:ring-accent-500/40">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-500">
            <Search size={14} />
          </span>
          <input
            ref={searchInputRef}
            data-sidebar-search
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Escape metni temizliyor. Kutu artık kapanmadığı için
              // "boşsa kapat" dalı da yok. `preventDefault` şart: Escape
              // artık süren turu da durduruyor (pencere düzeyinde), aramayı
              // temizlerken cevabı iptal etmek istemiyoruz.
              if (e.key === "Escape") {
                e.preventDefault();
                setQuery("");
              }
            }}
            placeholder={t("axetCodeHome.searchPlaceholder")}
            title={t("axetCodeHome.searchTitle")}
            className="min-w-0 flex-1 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              title={t("axetCodeHome.searchClear")}
              className="mr-1 shrink-0 cursor-pointer rounded p-1 text-slate-500 transition hover:bg-active hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
        {/* Kısayol listesinin GÖRÜNÜR kapısı. F1 tek başına keşfedilemez
            bir kısayol: bilmeyen kimse denemez. */}
        <button
          onClick={() => commands.openShortcuts()}
          title={t("axetCodeHome.shortcutsTitle")}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-hover hover:text-slate-200"
        >
          <Keyboard size={16} />
        </button>
      </div>

      {/* "Yeni sohbet" — TAM GENİŞLİK ve birincil eylem gibi görünüyor
          (kullanıcı geri bildirimi: *"yeni sohbet çok çirkin yerde
          duruyor"*). Eskiden başlığın altında sola sıkışmış, zemin
          rengiyle aynı tonda dar bir haptı; ekranın en sık kullanılan
          düğmesi olduğu hâlde sıradan bir satır gibi duruyordu. */}
      {/* İki eylem YAN YANA, ikisi de renkli ve yazılı (kullanıcı isteği,
          2026-09-06). Proje kurma eskiden "PROJELER" başlığının içindeki
          küçük bir "+"tı: hem zor görülüyordu hem de bölümü daraltmamak için
          tıklamayı durdurmak zorundaydı.

          İkinci renk şart: iki düğme de vurgu mavisi olsaydı hangisinin ne
          yaptığı bir bakışta okunmazdı (bkz. --project-500-rgb).

          "Yeni sohbet" artık YIKAMA değil DOLGU (kullanıcı isteği,
          2026-09-06: *"[o günkü limon vurgu] rengini özellikle Yeni sohbet ... için
          kullanırdım"*, çünkü *"şu an ekranda lime çok az görünüyor"*).
          Yıkama hâlinde (accent-500/10 + accent-400 metin) düğme yan
          komşusuyla aynı ağırlıktaydı; ikisi de "bir seçenek" gibi
          duruyordu. Şimdi ayrım İKİ eksende: dolgu-yıkama ve vurgu-mor.
          Yan taraftaki "Yeni proje" bilerek yıkama olarak kaldı — iki
          dolgu yan yana olsaydı hiyerarşi yine düzleşirdi.

          src/ui/buttons.ts'teki "ekranda tek `primary`" kuralına göre bu
          ekrandaki tek dolgu bu; composer'ın gönder düğmesi de dolgu ama o
          yalnızca gönderilecek bir şey varken görünüyor, yani durgun
          ekranda ikisi aynı anda bulunmuyor. */}
      {/* Sınıf dizesi elde yazılıyor (buttons.ts'in `btn()` kuralının
          istisnası): `btn()`'in sabit `px-4`'ü iki düğmeyi yan yana
          sığdırmıyordu.

          Ctrl+N rozeti düğmenin YÜZÜNDEN kalktı, yalnızca tooltip'te: dar
          kenar çubuğunda iki yazılı düğme + rozet aynı satıra sığmıyor,
          rozeti bırakmak "Yeni sohbet" yazısını kırpardı. */}
      <div className="flex shrink-0 gap-1.5 px-2.5 pb-2.5">
        {/* onClick'teki sarmalayıcı ok fonksiyonu şart: `newSession`'ı
            doğrudan geçmek MouseEvent'i `binding` argümanı sanardı. */}
        <button
          onClick={() => commands.newSession()}
          title={`${t("axetCodeHome.newSession")} (Ctrl+N)`}
          className="flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-accent-500 px-2 text-xs font-semibold text-accent-on transition hover:bg-accent-600"
        >
          <Plus size={15} className="shrink-0" />
          <span className="min-w-0 truncate">{t("axetCodeHome.newSession")}</span>
        </button>
        <button
          onClick={handleCreateProject}
          title={t("axetCodeHome.newProject")}
          className="flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-[rgb(var(--project-500-rgb)/0.35)] bg-[rgb(var(--project-500-rgb)/0.12)] px-2 text-xs font-medium text-[var(--project-soft-text)] transition hover:border-[rgb(var(--project-500-rgb)/0.6)] hover:bg-[rgb(var(--project-500-rgb)/0.22)]"
        >
          <FolderPlus size={15} className="shrink-0" />
          <span className="min-w-0 truncate">{t("axetCodeHome.newProject")}</span>
        </button>
      </div>

      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
        {/* Projeler — kullanıcının kendi kurduğu, kendi talimatını
            taşıyan gruplar (ChatGPT'nin "Projects" karşılığı, kullanıcı
            isteği 2026-09-06). SAP grupları bunun ALTINDA ve otomatik.
            Proje yokken bölüm hiç çizilmiyor: kurma düğmesi artık "Yeni
            sohbet"in yanında, yani boş başlık bir keşif kapısı değil
            sadece gürültü olurdu. */}
        {sessionGroups.projectGroups.length > 0 && (
          <>
            <button
              onClick={() => toggleGroup(PROJECTS_SECTION_KEY)}
              aria-expanded={groupOpen(PROJECTS_SECTION_KEY)}
              className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-2 text-left text-slate-400 transition hover:text-slate-200"
            >
              {groupOpen(PROJECTS_SECTION_KEY) ? (
                <ChevronDown size={12} className="shrink-0" />
              ) : (
                <ChevronRight size={12} className="shrink-0" />
              )}
              <Eyebrow as="span" count={projects.length} className="min-w-0 flex-1 group-hover:text-slate-200">
                {t("axetCodeHome.projectsTitle")}
              </Eyebrow>
            </button>
            <div
              className={
                groupOpen(PROJECTS_SECTION_KEY) ? "space-y-0.5" : "hidden"
              }
            >
              {sessionGroups.projectGroups.map((group) => {
                const open = groupOpen(group.key);
                return (
                  <div key={group.key}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleGroup(group.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleGroup(group.key);
                        }
                      }}
                      aria-expanded={open}
                      title={group.project.name}
                      className="group/proj flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs text-slate-400 transition hover:bg-hover hover:text-slate-200"
                    >
                      {open ? (
                        <ChevronDown
                          size={12}
                          className="shrink-0 text-slate-500"
                        />
                      ) : (
                        <ChevronRight
                          size={12}
                          className="shrink-0 text-slate-500"
                        />
                      )}
                      <FolderOpen
                        size={12}
                        className="shrink-0 text-accent-400"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {group.project.name}
                      </span>
                      {/* Projede yeni sohbet: sohbet, projenin talimatını
                      devralarak doğuyor (bkz. handleSendNew). */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          commands.newSession(null, null, group.project.id);
                        }}
                        title={t("axetCodeHome.newChatInProject")}
                        className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover/proj:opacity-100"
                      >
                        <Plus size={12} />
                      </button>
                      {/* Ad, talimat ve silme TEK kutuda (ChatProjectDialog):
                      başlığa dört düğme sığmıyordu. */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          commands.openProjectDialog(group.project.id);
                        }}
                        title={t("axetCodeHome.projectSettings")}
                        className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover/proj:opacity-100"
                      >
                        <Settings2 size={12} />
                      </button>
                      <span className="shrink-0 text-2xs text-slate-500">
                        {group.sessions.length}
                      </span>
                    </div>
                    {open && (
                      <div className="ml-2 space-y-0.5 border-l border-line-subtle pl-1.5">
                        {group.sessions.length > 0 ? (
                          group.sessions.map(renderSessionRow)
                        ) : (
                          <div className="px-2 py-1.5 text-2xs leading-relaxed text-slate-500">
                            {t("axetCodeHome.projectEmpty")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* SAP sohbetleri: sistem başına bir daraltılabilir grup.
            Bölüm etiketi yalnızca gerçekten SAP sohbeti varsa
            görünüyor — tek bir sisteme bile bağlanmamış kullanıcıya
            boş bir başlık göstermenin anlamı yok. */}
        {sessionGroups.sapGroups.length > 0 && (
          <>
            {/* Bölüm başlığı da daraltılabilir — "Sohbetler" öyleyken
                bunun düz bir etiket kalması tutarsızdı (kullanıcı
                bildirimi). Buradaki daraltma sistemleri TEK TEK değil,
                SAP bölümünün tamamını kapatıyor. */}
            <button
              onClick={() => toggleGroup(SAP_SECTION_KEY)}
              aria-expanded={groupOpen(SAP_SECTION_KEY)}
              className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-3 text-left text-slate-400 transition hover:text-slate-200"
            >
              {groupOpen(SAP_SECTION_KEY) ? (
                <ChevronDown size={12} className="shrink-0" />
              ) : (
                <ChevronRight size={12} className="shrink-0" />
              )}
              <Eyebrow as="span" count={sessionGroups.sapGroups.length} className="min-w-0 flex-1 group-hover:text-slate-200">
                {t("axetCodeHome.sapChatsTitle")}
              </Eyebrow>
            </button>
            <div
              className={
                groupOpen(SAP_SECTION_KEY) ? "space-y-0.5" : "hidden"
              }
            >
              {sessionGroups.sapGroups.map((group) => {
                const open = groupOpen(group.key);
                return (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleGroup(group.key)}
                      aria-expanded={open}
                      title={group.label}
                      className="group/sys flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left text-xs text-slate-400 transition hover:bg-hover hover:text-slate-200"
                    >
                      {open ? (
                        <ChevronDown
                          size={12}
                          className="shrink-0 text-slate-500"
                        />
                      ) : (
                        <ChevronRight
                          size={12}
                          className="shrink-0 text-slate-500"
                        />
                      )}
                      <Server
                        size={12}
                        className="shrink-0 text-[var(--navy-icon)]"
                      />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {group.label}
                      </span>
                      {/* Bu sistemde yeni sohbet. Elle açılan "Yeni
                          sohbet" artık "Sohbetler"e düştüğü için, bir
                          sistemin altına bilerek sohbet eklemenin TEK
                          yolu bu. `span role="button"`: satırın kendisi
                          zaten bir <button>, iç içe düğme geçersiz HTML
                          (proje başlığındaki "+" ile aynı gerekçe). */}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          commands.newSession({
                            cwd: group.cwd,
                            label: group.label,
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            commands.newSession({
                              cwd: group.cwd,
                              label: group.label,
                            });
                          }
                        }}
                        title={t("axetCodeHome.newChatInSystem")}
                        className="shrink-0 cursor-pointer rounded p-0.5 text-slate-500 opacity-0 transition hover:bg-active hover:text-slate-200 focus-visible:opacity-100 group-hover/sys:opacity-100"
                      >
                        <Plus size={12} />
                      </span>
                      <span className="shrink-0 text-2xs text-slate-500">
                        {group.sessions.length}
                      </span>
                    </button>
                    {/* Sol kenar çizgisi: satırların hangi gruba ait
                        olduğunu daraltma durumundan bağımsız gösteriyor. */}
                    {open && (
                      <div className="ml-2 space-y-0.5 border-l border-line-subtle pl-1.5">
                        {group.sessions.map(renderSessionRow)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Sisteme bağlı olmayan sohbetler. Kendi başlığı var ve o da
            daraltılabilir — SAP grupları daraltılıp bu bırakılsaydı
            tutarsız olurdu. */}
        {sessionGroups.general.length > 0 && (
          <div
            className={sessionGroups.sapGroups.length > 0 ? "mt-1" : ""}
          >
            <button
              onClick={() => toggleGroup(GENERAL_GROUP_KEY)}
              aria-expanded={groupOpen(GENERAL_GROUP_KEY)}
              className="group flex w-full cursor-pointer items-center gap-1.5 rounded-md px-0.5 pb-1.5 pt-3 text-left text-slate-400 transition hover:text-slate-200"
            >
              {groupOpen(GENERAL_GROUP_KEY) ? (
                <ChevronDown size={12} className="shrink-0" />
              ) : (
                <ChevronRight size={12} className="shrink-0" />
              )}
              <Eyebrow as="span" count={sessionGroups.general.length} className="min-w-0 flex-1 group-hover:text-slate-200">
                {t("axetCodeHome.generalChatsTitle")}
              </Eyebrow>
            </button>
            {groupOpen(GENERAL_GROUP_KEY) && (
              <div className="space-y-0.5">
                {sessionGroups.general.map(renderSessionRow)}
              </div>
            )}
          </div>
        )}

        {sessions.length > 0 && visibleSessions.length === 0 && (
          <div className="mt-1 rounded-md border border-line-subtle bg-app px-3 py-3 text-center text-xs text-slate-500">
            {t("axetCodeHome.searchEmpty", { query: query.trim() })}
          </div>
        )}

        {sessions.length === 0 && (
          <div className="mt-1 rounded-md border border-line-subtle bg-app px-3 py-3 text-center">
            <div className="text-xs font-medium text-slate-400">
              {t("axetCodeHome.emptyTitle")}
            </div>
            <div className="mt-1 text-2xs leading-relaxed text-slate-500">
              {t("axetCodeHome.emptyHint")}
            </div>
          </div>
        )}
      </div>

      {/* SAP bağlantıları dip bloğu. Eskiden başlıksızdı ve listeden
          yalnızca boşlukla ayrılıyordu; sohbetler artık kendi
          başlıklarının altında gruplandığı için bu blok da onlardan
          biri gibi görünmeye başladı — üstüne çizgi ve başlık kondu
          (kullanıcı isteği, 2026-09-06). Buradaki satırlar sohbet
          DEĞİL: tıklayınca bağlanıyorlar. */}
      <div className="shrink-0 border-t border-line-subtle p-2.5 pt-2">
        <Eyebrow className="px-0.5 pb-1.5">{t("axetCodeHome.systemsTitle")}</Eyebrow>
        {recentEntries.length > 0 ? (
          <div className="space-y-0.5">
            {recentEntries.slice(0, 3).map((entry) => {
              const state = connectivity[entry.service.uuid] ?? "unknown";
              const tier = resolveTier(entry.service, tierOverrides);
              // ŞU AN BAĞLI OLUNAN sistem. `StatusDot`'tan bambaşka bir
              // şey söylüyor ve ikisi karıştırılmamalı: nokta "bu sunucu
              // ayakta mı" (sağlık), bu ise "oturum bunun üzerinde"
              // (aktiflik). Erişilebilir üç sistem varken hangisine
              // bağlı olduğun satırda hiç görünmüyordu — yalnızca hover
              // kartını açınca.
              //
              // Vurgu rengi tam da bu yüzden BURADA doğru: accent yeşili
              // uygulamanın her yerinde "seçili/aktif" demek, sağlık
              // yeşili (`--status-success-text`) ise noktanın işi. İki
              // anlam iki renkte kalıyor.
              const connected = activeSap != null && activeSap.uuid === entry.service.uuid;
              const connect = () =>
                onQuickConnectSap(
                  entry.path,
                  entry.service,
                  entry.itemUuid,
                );
              return (
                // `title={path}` yerine gerçek bir kart: satırda yalnızca
                // ad/tier/durum sığıyor, host-port-router-client ise
                // bağlanmadan hiç görünmüyordu (bkz. SystemHoverCard).
                <SystemHoverCard
                  key={entry.itemUuid}
                  service={entry.service}
                  path={entry.path}
                  tier={tier}
                  state={state}
                  activeSap={activeSap}
                  onConnect={connect}
                >
                  <button
                    onClick={connect}
                    className={`relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition ${
                      connected
                        ? "bg-accent-500/10 text-slate-100"
                        : "text-slate-400 hover:bg-hover hover:text-slate-200"
                    }`}
                  >
                    {/* Şerit ray'daki aktif sekme şeridiyle AYNI dil:
                        uygulamada "burasısın" hep soldaki 2-3px'lik
                        vurgu çizgisi. */}
                    {connected && (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent-500" />
                    )}
                    <Server
                      size={13}
                      className={`shrink-0 ${connected ? "text-accent-400" : "text-[var(--navy-icon)]"}`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate ${connected ? "font-medium" : ""}`}
                    >
                      {entry.service.name}
                    </span>
                    {tier && <TierBadge tier={tier} />}
                    <StatusDot state={state} />
                  </button>
                </SystemHoverCard>
              );
            })}
            <button
              onClick={onOpenSapLauncher}
              className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-md px-2 py-1.5 text-2xs text-slate-500 transition hover:bg-hover hover:text-slate-300"
            >
              {t("axetCodeHome.viewAllConnections")}
              <ArrowUpRight size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenSapLauncher}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-line-subtle bg-app px-3 py-2.5 text-xs text-slate-500 transition hover:border-line hover:bg-hover hover:text-slate-300"
          >
            <Link2 size={14} className="shrink-0" />
            {t("axetCodeHome.connectionsEmpty")}
          </button>
        )}
      </div>

      {/* "Projeye taşı" menüsü. Arkasındaki saydam katman dışarı tıklamayı
          yakalıyor — menü, kaydırılan listenin dışında (sabit konumda)
          çizildiği için listenin kendi tıklamalarıyla kapanmazdı. */}
      {moveMenu && (
        <>
          <div
            className="fixed inset-0 z-[70]"
            onClick={() => setMoveMenu(null)}
          />
          <div
            className="chat-scroll fixed z-[71] w-[200px] overflow-y-auto rounded-md border border-line bg-card p-1 shadow-xl"
            style={{
              left: moveMenu.x,
              top: moveMenu.y,
              maxHeight: MOVE_MENU_MAX_H,
            }}
          >
            {projects.map((project) => {
              const current = moveTarget?.projectId === project.id;
              return (
                <button
                  key={project.id}
                  onClick={() =>
                    handleMoveSession(moveMenu.sessionId, project.id)
                  }
                  disabled={current}
                  title={project.name}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition ${
                    current
                      ? "cursor-default bg-control text-slate-300"
                      : "cursor-pointer text-slate-400 hover:bg-hover hover:text-slate-200"
                  }`}
                >
                  <FolderOpen size={12} className="shrink-0 text-accent-400" />
                  <span className="min-w-0 flex-1 truncate">
                    {project.name}
                  </span>
                </button>
              );
            })}
            {/* Yalnızca bir projedeyken görünüyor: projesiz bir sohbette
                "projeden çıkar" tıklanacak ama hiçbir şey yapmayan bir satır
                olurdu. */}
            {moveTarget?.projectId && (
              <button
                onClick={() => handleMoveSession(moveMenu.sessionId, null)}
                className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded border-t border-line-subtle px-2 py-1.5 pt-2 text-left text-xs text-slate-500 transition hover:bg-hover hover:text-slate-300"
              >
                <X size={12} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {t("axetCodeHome.removeFromProject")}
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
