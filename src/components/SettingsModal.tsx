import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  X,
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Languages,
  TerminalSquare,
  Wrench,
  Database,
  ChevronRight,
  Terminal,
  Sparkles,
  Type
} from "lucide-react";
import type { AppConfig, UpdateStatus } from "../../app-electron/shared/types";
import ConfirmDialog from "./ConfirmDialog";
import { useT } from "../i18n";
import type { TranslateFn } from "../i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  config: AppConfig | null;
  onSave: (partial: Partial<AppConfig>) => Promise<void>;
  onExportManualSystems: () => Promise<void>;
  onImportManualSystems: () => Promise<void>;
}

function Section({
  icon: Icon,
  title,
  children
}: {
  icon: typeof SlidersHorizontal;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-base-700 bg-base-900/40">
      <div className="flex items-center gap-2 border-b border-base-700/70 px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-500/15 text-[var(--accent-soft-text)]">
          <Icon size={13} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</span>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-base-700 bg-base-950/40 p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`cursor-pointer rounded-[5px] px-3 py-1.5 text-sm font-medium transition ${
            value === option.key
              ? "bg-accent-500/25 text-white"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Uyarı, hata değil: yol yanlış olsa da kaydetmek serbest. Kullanıcı henüz
// bağlanmamış bir ağ sürücüsündeki yolu bilerek girmiş olabilir.
function PathMissing({ text }: { text: string }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[var(--status-warning-text)]">
      <AlertCircle size={12} className="mt-0.5 shrink-0" />
      {text}
    </p>
  );
}

const inputClass =
  "w-full rounded-md border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20";

function renderUpdateStatus(updateStatus: UpdateStatus, t: TranslateFn) {
  switch (updateStatus.phase) {
    case "checking":
      return (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <RefreshCw size={12} className="animate-spin" /> {t("settingsModal.checking")}
        </p>
      );
    case "available":
      return (
        <div className="flex items-center justify-between gap-2 text-xs text-accent-400">
          <span className="flex items-center gap-1.5">
            <Download size={12} /> {t("settingsModal.updateAvailable", { version: updateStatus.version ?? "" })}
          </span>
          <button
            onClick={() => window.api.downloadUpdate()}
            className="cursor-pointer rounded-md border border-accent-500/40 bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-[var(--accent-soft-text)] hover:bg-accent-500/25"
          >
            {t("settingsModal.download")}
          </button>
        </div>
      );
    case "not-available":
      return (
        <p className="flex items-center gap-1.5 text-xs text-[var(--status-success-text)]">
          <CheckCircle2 size={12} /> {t("settingsModal.upToDate")}
        </p>
      );
    case "downloading":
      return (
        <p className="flex items-center gap-1.5 text-xs text-accent-400">
          <Download size={12} /> {t("settingsModal.downloading", { percent: updateStatus.percent ?? 0 })}
        </p>
      );
    case "downloaded":
      return (
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--status-success-text)]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={12} /> {t("settingsModal.downloaded", { version: updateStatus.version ?? "" })}
          </span>
          <button
            onClick={() => window.api.installUpdate()}
            // Zemin `bg-emerald-600` DEĞİL artık: o, temadan bağımsız sabit bir
            // Tailwind rengiydi. Bu satırın birincil eylemi olduğu için düz
            // vurgu dolgusu kullanıyor — satırın metni zaten "başarı" tonunda,
            // düğmenin de yeşil olması ikisini birbirine karıştırıyordu.
            // `text-white` DEĞİL: o token temaya bağlı (`--ink-strong-rgb`) ve
            // açık temada koyu griye düşüyor — dolu zemin üstünde ~3.9:1
            // kontrast, AA'nın altında. `text-accent-on` her iki temada da
            // gerçek beyaz (bkz. index.css).
            className="cursor-pointer rounded-md bg-accent-500 px-2.5 py-1 text-xs font-medium text-accent-on hover:bg-accent-600"
          >
            {t("settingsModal.restartAndInstall")}
          </button>
        </div>
      );
    case "error":
      return (
        <p className="flex items-start gap-1.5 text-xs text-[var(--status-danger-text)]">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {updateStatus.message}
        </p>
      );
    default:
      return null;
  }
}

/**
 * Bu kutunun GERÇEKTEN düzenlediği alanlar — kaydederken yalnızca bunlar
 * gönderiliyor.
 *
 * NEDEN bir liste: `form`, kutu açıldığında alınmış bir `AppConfig`
 * ANLIK GÖRÜNTÜSÜ. Eskiden `onSave(form)` bu görüntünün TAMAMINI yolluyordu ve
 * `saveConfig` gelen nesneyi diskteki hâlin üstüne yaydığı için, kutu açıkken
 * ANA SÜRECİN yazdığı her alan sessizce eski değerine dönüyordu.
 *
 * Ana sürecin sahibi olduğu alanlar az değil: `connectorIntegrations`,
 * `connectorAutoDisabled` (bkz. connectorHealth.ts), `connectorEnabled`,
 * `lastCredentials`, `trustedCertificates`. Bunlar kullanıcı ayarı değil,
 * ÖLÇÜM sonucu — geri alınmaları hiçbir yerde görünmüyor, yalnızca etkisi
 * görünüyor (ölçüm 2026-09-05: kapatılmış iki bağlayıcı kendiliğinden geri
 * açıldı, tur başına ~24k jeton yeniden ~153k oldu).
 *
 * Buraya yeni bir alan eklerken listeye de eklemek gerekiyor; unutulursa alan
 * kaydedilmez — sessizce başka bir ayarı bozmasından iyidir.
 */
const EDITED_FIELDS = [
  "language",
  "projectsBaseDir",
  "axetWorkspaceDir",
  "chatDisplayName",
  "chatFontSize",
  "chatDensity",
  "chatSidebarOpen",
  "axetCommand",
  "terminal",
  "landscapePathOverride",
  "sapShcutPathOverride",
  "autoCheckUpdates"
] as const satisfies readonly (keyof AppConfig)[];

export default function SettingsModal({
  open,
  onClose,
  config,
  onSave,
  onExportManualSystems,
  onImportManualSystems
}: Props) {
  const t = useT();
  const [form, setForm] = useState<AppConfig | null>(config);
  const [appVersion, setAppVersion] = useState<string>("");
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ phase: "idle" });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pathCheck, setPathCheck] = useState<{ landscape: boolean | null; sapShcut: boolean | null }>({
    landscape: null,
    sapShcut: null
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setForm(config), [config]);

  useEffect(() => {
    if (!open) return;
    window.api.getAppVersion().then(setAppVersion);
    window.api.getLastUpdateStatus().then(setUpdateStatus);
    const unsubscribe = window.api.onUpdateStatus(setUpdateStatus);
    return unsubscribe;
  }, [open]);

  // Escape'in ÇALIŞMASININ şartı. `onKeyDown` odaklanamayan bir `div`'de
  // duruyor ve React'te tuş olayları odaklı elemandan yukarı kabarır — kutu
  // açıldığında odak hâlâ onu açan butonda, yani dışarıda kaldığı için tuş bu
  // ağaca hiç girmiyordu. Kutunun içine tıklanana kadar Escape ölüydü.
  // Buradaki çözüm `autoFocus` DEĞİL (öbür kutularda öyle): ayarlarda belirgin
  // bir "ilk alan" yok, rastgele bir metin kutusuna odaklanmak yanlış olurdu.
  // Onun yerine panelin kendisi odaklanıyor.
  //
  // Aynı efekt kutuyu her açılışta SIFIRLIYOR. Bileşen kapanınca `null`
  // döndürüyor ama SÖKÜLMÜYOR — state olduğu gibi duruyor. Sıfırlama olmadan,
  // kaydetmeden çıkılan bir düzenleme bir sonraki açılışta hâlâ ekranda
  // duruyordu (ve artık "kaydedilmemiş" uyarısını da tetiklerdi).
  useEffect(() => {
    if (!open) return;
    setForm(config);
    setConfirmDiscard(false);
    panelRef.current?.focus();
  }, [open, config]);

  // Yazarken doğrulama, kaydederken değil — kaydettikten SONRA "bu yol yok"
  // demek geç kalmış olurdu, kutu çoktan kapanmış olur. Yazma sırasında her
  // tuşta ana sürece gitmemek için 400 ms bekliyor.
  const landscapePath = form?.landscapePathOverride ?? null;
  const sapShcutPath = form?.sapShcutPathOverride ?? null;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      window.api
        .validateOverridePaths({ landscapePath, sapShcutPath })
        .then((result) => {
          if (!cancelled) setPathCheck(result);
        })
        .catch(() => {
          // Doğrulama başarısızsa uyarı göstermiyoruz — var olmayan bir yolu
          // sessizce geçmek, var olan bir yolu yanlışlıkla kırmızı boyamaktan
          // iyi.
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, landscapePath, sapShcutPath]);

  // Yalnızca bu kutunun düzenlediği alanlar karşılaştırılıyor — ana sürecin
  // arka planda yazdığı alanlar (`connectorAutoDisabled` vb.) `form`'u
  // "kirli" göstermemeli, bkz. EDITED_FIELDS.
  const isDirty = useMemo(() => {
    if (!form || !config) return false;
    return EDITED_FIELDS.some((field) => form[field] !== config[field]);
  }, [form, config]);

  if (!open || !form) return null;

  // Kapatma isteği tek kapıdan geçiyor (X, Escape, Vazgeç). Kaydedilmemiş
  // değişiklik varsa sessizce atılmıyor.
  const requestClose = () => {
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  const pickFolder = async () => {
    const dir = await window.api.pickFolder();
    if (dir) setForm({ ...form, projectsBaseDir: dir });
  };

  const pickAxetWorkspaceDir = async () => {
    const dir = await window.api.pickFolder();
    if (dir) setForm({ ...form, axetWorkspaceDir: dir });
  };

  const save = async () => {
    const patch: Partial<AppConfig> = {};
    for (const field of EDITED_FIELDS) patch[field] = form[field] as never;
    await onSave(patch);
    onClose();
  };

  const handleCheckForUpdates = async () => {
    await onSave({ autoCheckUpdates: form.autoCheckUpdates });
    await window.api.checkForUpdates();
  };

  const updateStatusNode = renderUpdateStatus(updateStatus, t);

  return (
    <>
    <div
      className="animate-backdrop-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") requestClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-modal-pop-in flex max-h-[88vh] w-[560px] flex-col overflow-hidden rounded-2xl border border-base-700/60 bg-base-900 shadow-2xl shadow-black/50 outline-none"
      >

        <div className="relative shrink-0 px-6 pb-4 pt-5">
          <button
            onClick={requestClose}
            className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:bg-base-700 hover:text-slate-200"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/15">
              <SlidersHorizontal size={20} className="text-accent-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight text-white">{t("settingsModal.title")}</h3>
              <p className="truncate text-xs text-slate-500">{t("settingsModal.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <Section icon={Languages} title={t("settingsModal.sectionGeneral")}>
            <Field label={t("settingsModal.languageLabel")}>
              <SegmentedControl
                value={form.language}
                onChange={(lang) => setForm({ ...form, language: lang })}
                options={[
                  { key: "tr", label: t("settingsModal.languageTr") },
                  { key: "en", label: t("settingsModal.languageEn") }
                ]}
              />
            </Field>
            <Field label={t("settingsModal.projectsDirLabel")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={form.projectsBaseDir}
                    onChange={(e) => setForm({ ...form, projectsBaseDir: e.target.value })}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <button
                  onClick={pickFolder}
                  title={t("settingsModal.browseFolder")}
                  className="cursor-pointer rounded-md border border-base-600 px-3 text-slate-300 transition hover:bg-base-700"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </Field>
          </Section>

          <Section icon={Sparkles} title={t("settingsModal.sectionAxetCode")}>
            <Field label={t("settingsModal.axetWorkspaceDirLabel")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={form.axetWorkspaceDir}
                    onChange={(e) => setForm({ ...form, axetWorkspaceDir: e.target.value })}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <button
                  onClick={pickAxetWorkspaceDir}
                  title={t("settingsModal.browseFolder")}
                  className="cursor-pointer rounded-md border border-base-600 px-3 text-slate-300 transition hover:bg-base-700"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
            </Field>
            {/* Bağlayıcı kipi ("Sohbette uygulama bağlantıları") BURADAN
                KALDIRILDI (2026-09-04). Aynı şeyi iki ayrı ekrandan ifade
                etmek — burada "kapalı", Uygulama Bağlantıları'nda yeşil tik —
                kullanıcının "bağlandı diyor ama olmuyor" şikayetinin
                kaynağıydı. Açık/kapalı artık Uygulama Bağlantıları
                ekranındaki Bağlan/Bağlantıyı Kes butonu, ne zaman
                yükleneceği de yine orada; tek yer, tek doğruluk kaynağı. */}
          </Section>

          {/* Sohbet ekranının okuma konforu. Terminal/dizin ayarlarından AYRI
              bir bölüm: burası "nasıl çalışsın" değil "nasıl görünsün" — ikisi
              aynı kutuda olsaydı görünüm ayarları teknik ayarların arasında
              kaybolurdu. */}
          <Section icon={Type} title={t("settingsModal.sectionChatAppearance")}>
            <Field label={t("settingsModal.chatDisplayNameLabel")} hint={t("settingsModal.chatDisplayNameHint")}>
              <input
                value={form.chatDisplayName}
                onChange={(e) => setForm({ ...form, chatDisplayName: e.target.value })}
                placeholder={t("settingsModal.chatDisplayNamePlaceholder")}
                className={inputClass}
              />
            </Field>
            <Field label={t("settingsModal.chatFontSizeLabel")}>
              <SegmentedControl
                value={form.chatFontSize}
                onChange={(size) => setForm({ ...form, chatFontSize: size })}
                options={[
                  { key: "sm", label: t("settingsModal.chatFontSizeSm") },
                  { key: "md", label: t("settingsModal.chatFontSizeMd") },
                  { key: "lg", label: t("settingsModal.chatFontSizeLg") }
                ]}
              />
            </Field>
            <Field label={t("settingsModal.chatDensityLabel")} hint={t("settingsModal.chatDensityHint")}>
              <SegmentedControl
                value={form.chatDensity}
                onChange={(density) => setForm({ ...form, chatDensity: density })}
                options={[
                  { key: "comfortable", label: t("settingsModal.chatDensityComfortable") },
                  { key: "compact", label: t("settingsModal.chatDensityCompact") }
                ]}
              />
            </Field>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.chatSidebarOpen}
                onChange={(e) => setForm({ ...form, chatSidebarOpen: e.target.checked })}
                className="h-4 w-4 cursor-pointer accent-accent-500"
              />
              {t("settingsModal.chatSidebarOpenLabel")}
            </label>
          </Section>

          <Section icon={TerminalSquare} title={t("settingsModal.sectionTerminal")}>
            <Field label={t("settingsModal.axetCommandLabel")}>
              <div className="relative">
                <Terminal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={form.axetCommand}
                  onChange={(e) => setForm({ ...form, axetCommand: e.target.value })}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>
            <Field label={t("settingsModal.shellLabel")} hint={t("settingsModal.shellHelper")}>
              <SegmentedControl
                value={form.terminal}
                onChange={(shell) => setForm({ ...form, terminal: shell })}
                options={[
                  { key: "cmd", label: t("settingsModal.shellCmd") },
                  { key: "powershell", label: t("settingsModal.shellPowershell") }
                ]}
              />
            </Field>
          </Section>

          <Section icon={Wrench} title={t("settingsModal.sectionAdvanced")}>
            <Field label={t("settingsModal.landscapePathLabel")}>
              <input
                value={form.landscapePathOverride ?? ""}
                onChange={(e) => setForm({ ...form, landscapePathOverride: e.target.value || null })}
                placeholder="C:\Users\...\AppData\Roaming\SAP\Common\SAPUILandscape.xml"
                className={`${inputClass} ${pathCheck.landscape === false ? "border-[var(--status-danger-border)]" : ""}`}
              />
              {pathCheck.landscape === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
            <Field label={t("settingsModal.sapShcutPathLabel")}>
              <input
                value={form.sapShcutPathOverride ?? ""}
                onChange={(e) => setForm({ ...form, sapShcutPathOverride: e.target.value || null })}
                placeholder="C:\Program Files (x86)\SAP\FrontEnd\SapGui\sapshcut.exe"
                className={`${inputClass} ${pathCheck.sapShcut === false ? "border-[var(--status-danger-border)]" : ""}`}
              />
              {pathCheck.sapShcut === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
          </Section>

          <Section icon={Database} title={t("settingsModal.sectionManual")}>
            <p className="text-xs text-slate-500">{t("settingsModal.manualSystemsHelper")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={onExportManualSystems}
                className="group flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-base-700 bg-base-950/30 p-3 text-left transition-colors hover:border-base-600 hover:bg-base-800/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-base-800 text-slate-400 group-hover:text-slate-200">
                  <Download size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200">{t("settingsModal.exportJson")}</div>
                  <div className="truncate text-xs text-slate-500">{t("settingsModal.exportJsonDesc")}</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </button>
              <button
                onClick={onImportManualSystems}
                className="group flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-base-700 bg-base-950/30 p-3 text-left transition-colors hover:border-base-600 hover:bg-base-800/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-base-800 text-slate-400 group-hover:text-slate-200">
                  <Upload size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200">{t("settingsModal.importJson")}</div>
                  <div className="truncate text-xs text-slate-500">{t("settingsModal.importJsonDesc")}</div>
                </div>
                <ChevronRight size={15} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-400" />
              </button>
            </div>
          </Section>

          <Section icon={Download} title={t("settingsModal.sectionUpdates")}>
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.autoCheckUpdates}
                  onChange={(e) => setForm({ ...form, autoCheckUpdates: e.target.checked })}
                  className="cursor-pointer accent-accent-500"
                />
                {t("settingsModal.autoCheckLabel")}
              </label>
              <span className="text-xs text-slate-500">
                {t("settingsModal.versionText", { version: appVersion || "…" })}
              </span>
            </div>

            <button
              onClick={handleCheckForUpdates}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-base-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-base-700"
            >
              <RefreshCw size={14} />
              {t("settingsModal.checkNow")}
            </button>

            {updateStatusNode && (
              <div className="rounded-md border border-base-700/60 bg-base-950/30 px-3 py-2">{updateStatusNode}</div>
            )}
          </Section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-base-800 px-6 py-4">
          {isDirty && (
            <span className="mr-auto text-xs text-[var(--status-warning-text)]">
              {t("settingsModal.unsavedBadge")}
            </span>
          )}
          <button
            onClick={requestClose}
            className="cursor-pointer rounded-md px-4 py-2 text-sm text-slate-300 transition hover:bg-base-700"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={save}
            className="flex items-center gap-2 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-accent-on transition hover:bg-accent-600"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>

    {/* Ayarlar kutusunun DIŞINDA, kardeş olarak — içine konsaydı buradaki
        Escape yukarı kabarıp ayarların `onKeyDown`'ına da düşer ve az önce
        kapattığımız onayı yeniden açardı. */}
    <ConfirmDialog
      open={confirmDiscard}
      danger={false}
      title={t("settingsModal.discardTitle")}
      message={t("settingsModal.discardMessage")}
      confirmLabel={t("settingsModal.discardConfirm")}
      onConfirm={() => {
        setConfirmDiscard(false);
        onClose();
      }}
      onCancel={() => setConfirmDiscard(false)}
    />
    </>
  );
}
