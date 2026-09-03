import { useEffect, useState, type ReactNode } from "react";
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
import type { AppConfig, ChatConnectorMode, UpdateStatus } from "../../app-electron/shared/types";
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
            // `text-white` DEĞİL: o token temaya bağlı (`--ink-strong-rgb`) ve
            // açık temada koyu griye düşüyor — emerald zemin üstünde ~3.9:1
            // kontrast, AA'nın altında. `text-accent-on` her iki temada da
            // gerçek beyaz (bkz. index.css).
            className="cursor-pointer rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-accent-on hover:bg-emerald-500"
          >
            {t("settingsModal.restartAndInstall")}
          </button>
        </div>
      );
    case "error":
      return (
        <p className="flex items-start gap-1.5 text-xs text-red-400">
          <AlertCircle size={12} className="mt-0.5 shrink-0" /> {updateStatus.message}
        </p>
      );
    default:
      return null;
  }
}

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

  useEffect(() => setForm(config), [config]);

  useEffect(() => {
    if (!open) return;
    window.api.getAppVersion().then(setAppVersion);
    window.api.getLastUpdateStatus().then(setUpdateStatus);
    const unsubscribe = window.api.onUpdateStatus(setUpdateStatus);
    return unsubscribe;
  }, [open]);

  if (!open || !form) return null;

  const pickFolder = async () => {
    const dir = await window.api.pickFolder();
    if (dir) setForm({ ...form, projectsBaseDir: dir });
  };

  const pickAxetWorkspaceDir = async () => {
    const dir = await window.api.pickFolder();
    if (dir) setForm({ ...form, axetWorkspaceDir: dir });
  };

  const save = async () => {
    await onSave(form);
    onClose();
  };

  const handleCheckForUpdates = async () => {
    await onSave({ autoCheckUpdates: form.autoCheckUpdates });
    await window.api.checkForUpdates();
  };

  return (
    <div
      className="animate-backdrop-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="animate-modal-pop-in flex max-h-[88vh] w-[560px] flex-col overflow-hidden rounded-2xl border border-base-700/60 bg-base-900 shadow-2xl shadow-black/50">
        <div className="h-1 w-full shrink-0 bg-gradient-to-r from-accent-600 via-accent-500 to-accent-400" />

        <div className="relative shrink-0 px-6 pb-4 pt-5">
          <button
            onClick={onClose}
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
            {/* Hız/yetenek dengesi — görünüm değil DAVRANIŞ ayarı olduğu için
                "Sohbet görünümü" bölümünde değil burada. */}
            {/* Üç kip, iki değil: eski aç/kapa "kapalı" varsayılanıyla
                sohbeti sessizce araçsız bırakıyordu (bkz. axetChat.ts). */}
            <Field label={t("settingsModal.chatConnectorModeLabel")} hint={t("settingsModal.chatConnectorModeHint")}>
              <select
                value={form.chatConnectorMode}
                onChange={(e) => setForm({ ...form, chatConnectorMode: e.target.value as ChatConnectorMode })}
                className="w-full cursor-pointer rounded-md border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent-500"
              >
                <option value="auto">{t("settingsModal.chatConnectorModeAuto")}</option>
                <option value="always">{t("settingsModal.chatConnectorModeAlways")}</option>
                <option value="off">{t("settingsModal.chatConnectorModeOff")}</option>
              </select>
            </Field>
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
                className="h-4 w-4 cursor-pointer accent-[rgb(var(--accent-500-rgb))]"
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
                className={inputClass}
              />
            </Field>
            <Field label={t("settingsModal.sapShcutPathLabel")}>
              <input
                value={form.sapShcutPathOverride ?? ""}
                onChange={(e) => setForm({ ...form, sapShcutPathOverride: e.target.value || null })}
                placeholder="C:\Program Files (x86)\SAP\FrontEnd\SapGui\sapshcut.exe"
                className={inputClass}
              />
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

            {renderUpdateStatus(updateStatus, t) && (
              <div className="rounded-md border border-base-700/60 bg-base-950/30 px-3 py-2">
                {renderUpdateStatus(updateStatus, t)}
              </div>
            )}
          </Section>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-base-800 px-6 py-4">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg px-4 py-2.5 text-sm text-slate-300 transition hover:bg-base-700"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={save}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-accent-600 to-accent-500 px-5 py-2.5 text-sm font-medium text-accent-on shadow-lg shadow-accent-600/20 transition hover:brightness-110 active:scale-[0.98]"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
