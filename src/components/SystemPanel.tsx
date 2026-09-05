import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Cable,
  RefreshCw,
  Terminal,
  Router as RouterIcon,
  Hash,
  Globe,
  Trash2,
  Pencil,
  AlertTriangle,
  History,
  LogIn,
  Check,
  ChevronRight,
  Database,
  Network,
  Loader2,
  Circle,
  Link2,
  NotebookPen,
  type LucideIcon
} from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import CopyButton from "./CopyButton";
import { resolveTier } from "../lib/tier";
import { formatRelativeTime } from "../lib/time";
import { useT } from "../i18n";

interface Selection {
  path: string[];
  service: SapService;
  itemUuid: string;
}

interface Props {
  selection: Selection | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  lastConnectedAt: string | null;
  onCheck: (service: SapService) => void;
  onConnect: (selection: Selection) => void;
  onOpenSapLogon: (service: SapService) => void;
  onEditManual: (service: SapService) => void;
  onDeleteManual: (service: SapService) => void;
  onSetTier: (service: SapService, tier: SystemTier | null) => void;
}

const TIER_OPTIONS: SystemTier[] = ["DEV", "QA", "PRD"];

const TIER_ACCENT: Record<SystemTier, { border: string; bg: string; text: string }> = {
  DEV: { border: "var(--tier-dev-border)", bg: "var(--tier-dev-bg)", text: "var(--tier-dev-text)" },
  QA: { border: "var(--tier-qa-border)", bg: "var(--tier-qa-bg)", text: "var(--tier-qa-text)" },
  PRD: { border: "var(--tier-prd-border)", bg: "var(--tier-prd-bg)", text: "var(--tier-prd-text)" }
};

function avatarLabel(service: SapService) {
  const source = service.systemId?.trim() || service.name.trim();
  return source.slice(0, 2).toUpperCase() || "?";
}

function StatTile({ icon: Icon, label, value, mono }: { icon: LucideIcon; label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-md border border-base-700/60 bg-base-950/30 p-3 transition-colors hover:border-base-600">
      <div className="mb-1.5 flex items-center gap-1.5 text-slate-500">
        <Icon size={12} />
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`truncate text-sm font-semibold text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  compact,
  copyValue,
  copyTitle
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
  compact?: boolean;
  copyValue?: string;
  copyTitle?: string;
}) {
  return (
    <div className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-base-800/40">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-base-800 text-slate-500 transition-colors group-hover:bg-accent-500/15 group-hover:text-[var(--accent-soft-text)]">
        <Icon size={13} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="text-[11px] text-slate-500">{label}</div>
        <div
          className={`break-all ${mono ? "font-mono" : ""} ${compact ? "text-xs text-slate-400" : "text-sm text-slate-200"}`}
        >
          {value}
        </div>
      </div>
      {copyValue && (
        <div className="opacity-40 transition-opacity group-hover:opacity-100">
          <CopyButton value={copyValue} title={copyTitle} />
        </div>
      )}
    </div>
  );
}

function ActionCard({
  icon: Icon,
  label,
  description,
  tone,
  onClick,
  title
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  tone: "accent" | "amber";
  onClick: () => void;
  title?: string;
}) {
  const toneStyle =
    tone === "accent"
      ? {
          bg: "rgb(var(--accent-500-rgb) / 0.1)",
          bgHover: "rgb(var(--accent-500-rgb) / 0.18)",
          iconBg: "rgb(var(--accent-500-rgb) / 0.22)",
          text: "var(--accent-soft-text)",
          border: "rgb(var(--accent-500-rgb) / 0.35)",
          borderHover: "rgb(var(--accent-500-rgb) / 0.6)"
        }
      : {
          bg: "rgb(var(--action-amber-rgb) / 0.1)",
          bgHover: "rgb(var(--action-amber-rgb) / 0.18)",
          iconBg: "rgb(var(--action-amber-rgb) / 0.25)",
          text: "var(--action-amber-text)",
          border: "rgb(var(--action-amber-rgb) / 0.35)",
          borderHover: "rgb(var(--action-amber-rgb) / 0.6)"
        };
  return (
    <button
      onClick={onClick}
      title={title}
      className="group flex flex-1 cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-left transition-colors"
      style={{ borderColor: toneStyle.border, backgroundColor: toneStyle.bg }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = toneStyle.borderHover;
        e.currentTarget.style.backgroundColor = toneStyle.bgHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = toneStyle.border;
        e.currentTarget.style.backgroundColor = toneStyle.bg;
      }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: toneStyle.iconBg, color: toneStyle.text }}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-200 group-hover:text-white">{label}</div>
        <div className="truncate text-xs text-slate-500">{description}</div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
    </button>
  );
}

export default function SystemPanel({
  selection,
  connectivity,
  tierOverrides,
  lastConnectedAt,
  onCheck,
  onConnect,
  onOpenSapLogon,
  onEditManual,
  onDeleteManual,
  onSetTier
}: Props) {
  const t = useT();
  const [comment, setComment] = useState("");
  const [originalComment, setOriginalComment] = useState("");
  const [commentSource, setCommentSource] = useState<"saved" | "sapLogon" | "none">("none");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Kaydedilmemiş yorum taslakları, sistem uuid'i başına. Kullanıcı yazarken
  // ağaçtan başka bir sisteme tıklarsa o metin HENÜZ diskte değil, sadece
  // `comment` state'inde duruyor — aşağıdaki yükleme efekti onu koşulsuz
  // ezerse yazılan şey sessizce kaybolur, üstelik arayüz tam o sırada
  // "Kaydedilmemiş değişiklik" rozetini gösterirken. Bu yüzden geçişte taslak
  // buraya alınıyor ve sisteme geri dönüldüğünde yerine konuyor.
  const draftsRef = useRef<Map<string, string>>(new Map());
  // Yükleme efektinin temizlik fonksiyonu çalıştığı anda `comment`/
  // `originalComment` state'leri hâlâ ESKİ sisteme ait, ama efektin kendi
  // kapanışı bayat olabilir — o yüzden en güncel değerler bir ref'te
  // aynalanıyor. Efekt sırası: önce tüm temizlikler, sonra tüm efektler;
  // yani temizlik okuduğunda bu ref hâlâ eski sistemi gösteriyor.
  const liveRef = useRef<{ uuid: string; comment: string; original: string } | null>(null);

  // Seçimde erişim kontrolü — ama 30 sn'lik bir pencereyle. App.tsx zaten
  // açılışta 5 işçilik bir tarama yapıyor; bu efekt onun üstüne biniyordu ve
  // ağaçta sistemler arasında gezinen kullanıcı her tıklamada yeni bir TCP/
  // SAProuter bağlantısı açtırıyordu. Durum bilgisi 30 sn'de bir tazelenirse
  // yeterince güncel; anında sonuç isteyen için hero karttaki yenile düğmesi
  // var ve o bu penceredan geçmiyor.
  const lastCheckedRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!selection) return;
    const uuid = selection.service.uuid;
    const last = lastCheckedRef.current.get(uuid) ?? 0;
    if (Date.now() - last < 30_000) return;
    lastCheckedRef.current.set(uuid, Date.now());
    onCheck(selection.service);
  }, [selection?.itemUuid]);

  useEffect(() => {
    if (!selection) return;
    liveRef.current = { uuid: selection.service.uuid, comment, original: originalComment };
  }, [selection?.service.uuid, comment, originalComment]);

  useEffect(() => {
    if (!selection) return;
    const uuid = selection.service.uuid;
    let cancelled = false;
    setCommentLoading(true);
    setCommentSaved(false);
    window.api
      .getSystemCommentDefault(uuid)
      .then((result) => {
        if (cancelled) return;
        const draft = draftsRef.current.get(uuid);
        // Taslak varsa metin olarak o geri geliyor, ama `originalComment`
        // diskteki hâl olarak kalıyor — böylece "kaydedilmemiş" rozeti ve
        // Kaydet butonu doğru şekilde açık kalıyor.
        setComment(draft ?? result.comment);
        setOriginalComment(result.comment);
        setCommentSource(result.source);
        setCommentLoading(false);
      })
      .catch(() => {
        // Yutulan reddediş `commentLoading`'i sonsuza kadar true bırakıyordu:
        // yorum kartı hep iskelet hâlinde kalır, kullanıcı sebebini göremezdi.
        if (cancelled) return;
        setCommentLoading(false);
      });
    return () => {
      cancelled = true;
      const live = liveRef.current;
      if (live && live.comment !== live.original) draftsRef.current.set(live.uuid, live.comment);
    };
  }, [selection?.itemUuid]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 140), 420)}px`;
  }, [comment, commentLoading]);

  if (!selection) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-base-700 bg-base-900/60">
          <Cable size={28} className="opacity-50" />
        </div>
        <p className="text-sm">{t("systemPanel.emptyState")}</p>
      </div>
    );
  }

  const { service, path } = selection;
  const state = connectivity[service.uuid] ?? "unknown";
  const tier = resolveTier(service, tierOverrides);
  const explicitTier = tierOverrides[service.uuid] ?? null;
  const isDirty = comment !== originalComment;

  const avatarClass = tier
    ? "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-lg font-bold"
    : "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-base-600 bg-base-800 text-lg font-bold text-[var(--accent-soft-text)]";
  const avatarStyle = tier
    ? { borderColor: TIER_ACCENT[tier].border, backgroundColor: TIER_ACCENT[tier].bg, color: TIER_ACCENT[tier].text }
    : undefined;
  const accentBarColor = tier ? TIER_ACCENT[tier].text : "rgb(var(--accent-500-rgb))";

  // "Adres" satırı sistemin AĞ kimliğini gösterir: host:port. ADT adresi artık
  // on-prem sistemlerde de dolabildiği için ikisi aynı satırı paylaşamaz —
  // paylaşsalardı ADT adresi girilen bir on-prem sistemin host:port'u panelde
  // hiçbir yerde görünmezdi, üstelik hemen yanındaki "SAP Logon'da Aç" tam da
  // o gizlenen host:port'a bağlanırdı. Cloud sistemlerde host yok, orada adres
  // yine ADT URL'i.
  const address = service.host
    ? `${service.host}${service.port ? `:${service.port}` : ""}`
    : (service.manualAdtUrl ?? "");
  const extraAdtUrl = service.host && service.manualAdtUrl ? service.manualAdtUrl : null;

  const handleSaveComment = async () => {
    if (commentSaving || commentLoading) return;
    setCommentSaving(true);
    try {
      await window.api.setSystemComment(service.uuid, comment);
    } catch {
      // Yazma başarısızsa taslak DURUYOR (silinmiyor) ve `originalComment`
      // değişmiyor — yani metin ekranda kalıyor, rozet "kaydedilmemiş"
      // demeye devam ediyor. Eskiden buradaki reddediş `commentSaving`'i
      // kilitli bırakıp Kaydet butonunu kalıcı olarak devre dışı bırakıyordu.
      setCommentSaving(false);
      return;
    }
    // Artık diskte — taslağın yaşaması için bir sebep kalmadı.
    draftsRef.current.delete(service.uuid);
    setOriginalComment(comment);
    setCommentSource("saved");
    setCommentSaving(false);
    setCommentSaved(true);
    setTimeout(() => setCommentSaved(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div
        key={selection.itemUuid}
        className="animate-panel-fade-in mx-auto w-full max-w-3xl px-6 py-8 md:max-w-4xl lg:max-w-5xl xl:max-w-6xl xl:px-10 2xl:max-w-[1400px]"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
            {path.map((segment, i) => (
              <span key={`${segment}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight size={11} className="shrink-0 text-slate-600" />}
                <span className={`truncate ${i === path.length - 1 ? "text-slate-400" : ""}`}>{segment}</span>
              </span>
            ))}
          </div>
          {service.isManual && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => onEditManual(service)}
                title={t("systemPanel.editTitle")}
                className="flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-xs text-slate-400 hover:bg-base-700"
              >
                <Pencil size={12} />
                {t("common.edit")}
              </button>
              <button
                onClick={() => onDeleteManual(service)}
                title={t("systemPanel.deleteTitle")}
                className="flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-xs text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)]"
              >
                <Trash2 size={12} />
                {t("common.delete")}
              </button>
            </div>
          )}
        </div>

        {/* Hero: kimlik + durum + önem derecesi — işlem butonları artık ayrı,
            tam genişlikte bir "hızlı işlemler" şeridinde (aşağıda), hero'nun
            sağına sıkıştırılmış dar bir buton sütunu olarak DEĞİL. */}
        <div className="relative mb-4 overflow-hidden rounded-xl border border-base-700 bg-base-900/50">
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accentBarColor, opacity: 0.6 }} />
          <div className="p-5 xl:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <div className={avatarClass} style={avatarStyle}>
                {avatarLabel(service)}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-bold tracking-tight text-white xl:text-[28px]">{service.name}</h2>
                  {tier && <TierBadge tier={tier} />}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
                  {service.systemId && (
                    <span className="rounded-md bg-base-800 px-1.5 py-0.5 font-mono text-xs text-slate-300">
                      {service.systemId}
                    </span>
                  )}
                  <span>{service.type}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <StatusDot state={state} pill />
                  <button
                    onClick={() => onCheck(service)}
                    title={t("systemPanel.recheck")}
                    className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] text-slate-500 transition-colors hover:bg-base-700 hover:text-slate-300"
                  >
                    <RefreshCw size={11} className={state === "checking" ? "animate-spin" : ""} />
                    {t("systemPanel.recheck")}
                  </button>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <History size={12} />
                    {lastConnectedAt
                      ? t("systemPanel.lastConnected", { time: formatRelativeTime(lastConnectedAt, t) })
                      : t("systemPanel.neverConnected")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-base-700/70 pt-3.5">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">{t("systemPanel.tierLabel")}</span>
              <div className="flex items-center gap-0.5 rounded-md border border-base-700 bg-base-950/40 p-0.5">
                {TIER_OPTIONS.map((option) => {
                  const active = explicitTier === option;
                  return (
                    <button
                      key={option}
                      onClick={() => onSetTier(service, active ? null : option)}
                      className={`cursor-pointer rounded-[5px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                        active ? "" : "text-slate-400 hover:text-slate-200"
                      }`}
                      style={active ? { backgroundColor: TIER_ACCENT[option].bg, color: TIER_ACCENT[option].text } : undefined}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {explicitTier ? (
                <button
                  onClick={() => onSetTier(service, null)}
                  className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-300"
                >
                  {t("systemPanel.clearTier")}
                </button>
              ) : tier ? (
                <span className="text-[11px] text-slate-500">{t("systemPanel.autoGuessed")}</span>
              ) : null}
            </div>
          </div>
        </div>

        {state === "unreachable" && (
          <div
            className="animate-alert-slide-in mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--status-danger-border)",
              backgroundColor: "var(--status-danger-bg)",
              color: "var(--status-danger-text)"
            }}
          >
            <AlertTriangle size={16} className="shrink-0" />
            {t("systemPanel.unreachableWarning")}
          </div>
        )}

        {tier === "PRD" && (
          <div
            className="animate-alert-slide-in mb-4 flex items-center gap-2 rounded-md border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--status-danger-border)",
              backgroundColor: "var(--status-danger-bg)",
              color: "var(--status-danger-text)"
            }}
          >
            <AlertTriangle size={16} className="shrink-0" />
            {t("systemPanel.prodWarning")}
          </div>
        )}

        {/* Hızlı işlemler — tam genişlikte, kart görünümlü, hero'dan bağımsız
            bir şerit. Buton görünümü yerine ikon+başlık+açıklama içeren
            "action card" deseni, geri kalan minimalist kart diliyle tutarlı. */}
        <div className="mb-5 flex flex-col gap-2.5 sm:flex-row">
          <ActionCard
            icon={Terminal}
            label={t("systemPanel.openInAxet")}
            description={t("systemPanel.openInAxetDesc")}
            tone="accent"
            onClick={() => onConnect(selection)}
          />
          {/* Buradaki koşul, main tarafındaki `canOpenInSapLogon` ile AYNI
              olmak zorunda — ayrışırsa buton ya hiç görünmez ya da görünüp
              "missingHostOrPort" ile başarısız olur. Cloud testi sadece tipe
              bakar; ADT adresi girilmiş bir on-prem sistem hâlâ SAP GUI ile
              açılabilir. */}
          {service.type !== "BTP/CLOUD" && service.host && service.port && (
            <ActionCard
              icon={LogIn}
              label={t("systemPanel.openInSapLogon")}
              description={t("systemPanel.openInSapLogonDesc")}
              tone="amber"
              title={t("systemPanel.openInSapLogonTitle")}
              onClick={() => onOpenSapLogon(service)}
            />
          )}
        </div>

        {/* İki kolonlu dashboard alanı — sol: bağlantı bilgileri (özet karolar +
            uzun değer satırları), sağ: notlar. Geniş ekranda yan yana, dar
            ekranda (tarayıcı penceresi/sidebar açıkken) alt alta akar. */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="relative flex flex-col overflow-hidden rounded-lg border border-base-700 bg-base-900/40">
            <div
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ backgroundColor: "rgb(var(--accent-500-rgb))", opacity: 0.5 }}
            />
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-500/15 text-[var(--accent-soft-text)]">
                  <Globe size={14} />
                </span>
                <span className="text-sm font-semibold text-slate-200">{t("systemPanel.detailsHeading")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 px-4 pb-1 pt-3">
              <StatTile icon={Database} label={t("systemPanel.systemId")} value={service.systemId || "—"} mono />
              <StatTile icon={Network} label={t("systemPanel.connectionType")} value={service.type} />
            </div>
            <div className="mt-2 flex-1 divide-y divide-base-700/50 pb-2">
              <InfoRow
                icon={Globe}
                label={t("systemPanel.addressLabel")}
                value={address || "—"}
                mono
                copyValue={address}
                copyTitle={t("systemPanel.copyAddress")}
              />
              {extraAdtUrl && (
                <InfoRow
                  icon={Link2}
                  label={t("systemPanel.adtUrlLabel")}
                  value={extraAdtUrl}
                  mono
                  compact
                  copyValue={extraAdtUrl}
                  copyTitle={t("systemPanel.copyAdtUrl")}
                />
              )}
              {service.routerString && (
                <InfoRow
                  icon={RouterIcon}
                  label={t("systemPanel.routerLabel")}
                  value={service.routerString}
                  mono
                  compact
                />
              )}
              <InfoRow
                icon={Hash}
                label={t("systemPanel.uuid")}
                value={service.uuid}
                mono
                compact
                copyValue={service.uuid}
                copyTitle={t("systemPanel.copyUuid")}
              />
            </div>
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-lg border border-base-700 bg-base-900/40">
            {/* Kart üstündeki ince şerit ve ikon rozeti artık `--action-amber-*`
                jetonundan; önceden `#c9973f`/`#d9a566` olarak gömülüydü ve tema
                değişince olduğu yerde kalıyordu. */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-[rgb(var(--action-amber-rgb)/0.45)]" />
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[rgb(var(--action-amber-rgb)/0.15)] text-[var(--action-amber-text)]">
                  <NotebookPen size={14} />
                </span>
                <span className="text-sm font-semibold text-slate-200">{t("systemPanel.commentLabel")}</span>
              </div>
              <div className="flex items-center gap-2">
                {isDirty && !commentSaving && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--status-warning-text)]">
                    <Circle size={6} className="fill-current" />
                    {t("systemPanel.commentUnsaved")}
                  </span>
                )}
                {commentSource === "sapLogon" && !isDirty && (
                  <span className="rounded-full border border-base-600 bg-base-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    {t("systemPanel.commentFromSapLogon")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col px-4 pb-2 pt-3">
              <textarea
                ref={textareaRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSaveComment();
                  }
                }}
                disabled={commentLoading}
                placeholder={commentLoading ? "" : t("systemPanel.commentPlaceholder")}
                className="w-full flex-1 resize-none rounded-md border-none bg-transparent text-sm leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-500/70 focus:ring-0 disabled:opacity-60"
                style={{ boxShadow: "none" }}
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-base-700/60 bg-base-950/20 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                {comment.length > 0 ? (
                  t("systemPanel.commentChars", { count: comment.length })
                ) : (
                  <>
                    <kbd className="rounded border border-base-600 bg-base-800 px-1 py-0.5 text-[10px] font-medium text-slate-400">
                      Ctrl
                    </kbd>
                    <span>+</span>
                    <kbd className="rounded border border-base-600 bg-base-800 px-1 py-0.5 text-[10px] font-medium text-slate-400">
                      Enter
                    </kbd>
                    <span className="ml-0.5">{t("systemPanel.commentHint")}</span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-2">
                {commentSaved && !isDirty && (
                  <span className="animate-alert-slide-in flex items-center gap-1 text-[11px] text-[var(--status-success-text)]">
                    <Check size={12} />
                    {t("systemPanel.commentSaved")}
                  </span>
                )}
                <button
                  onClick={handleSaveComment}
                  disabled={commentSaving || commentLoading || !isDirty}
                  title={t("systemPanel.commentHint")}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:cursor-default ${
                    isDirty && !commentSaving
                      ? "border-accent-500/40 bg-accent-500/15 text-[var(--accent-soft-text)] hover:border-accent-500/60 hover:bg-accent-500/25"
                      : "border-base-600 text-slate-400 disabled:opacity-50"
                  }`}
                >
                  {commentSaving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      {t("systemPanel.commentSaving")}
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      {t("common.save")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
