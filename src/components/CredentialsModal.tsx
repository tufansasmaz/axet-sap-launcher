import { useEffect, useState } from "react";
import { X, KeyRound, Loader2, AlertTriangle, Eye, EyeOff, User, Lock, Hash, Globe, Server, ShieldCheck } from "lucide-react";
import type { SapService } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";

interface Props {
  open: boolean;
  service: SapService | null;
  connecting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (username: string, password: string, client: string) => void;
  loadDefaults: (serviceUuid: string) => Promise<{ username: string; password: string; client: string }>;
}

export default function CredentialsModal({
  open,
  service,
  connecting,
  errorMessage,
  onClose,
  onSubmit,
  loadDefaults
}: Props) {
  const t = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [client, setClient] = useState("");
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowPassword(false);
  }, [open, service?.uuid]);

  useEffect(() => {
    if (!open || !service) return;
    setLoadingDefaults(true);
    loadDefaults(service.uuid)
      .then((defaults) => {
        setUsername(defaults.username);
        setPassword(defaults.password);
        setClient(defaults.client);
      })
      .finally(() => setLoadingDefaults(false));
  }, [open, service?.uuid]);

  if (!open || !service) return null;

  const isCloud = service.type === "BTP/CLOUD";
  const disabled = loadingDefaults || connecting;
  const canSubmit =
    username.trim().length > 0 && password.length > 0 && (isCloud || client.trim().length > 0) && !connecting;

  const address = service.manualAdtUrl ?? `${service.host ?? "?"}${service.port ? `:${service.port}` : ""}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(username.trim(), password, client.trim());
  };

  const fieldClass =
    "w-full rounded-lg border border-line-strong bg-control/70 py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 disabled:opacity-50";

  return (
    <div
      className="animate-backdrop-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="animate-modal-pop-in relative w-[440px] overflow-hidden rounded-2xl border border-line/60 bg-card shadow-2xl shadow-black/50"
      >

        <div className="px-6 pb-5 pt-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-slate-400 transition hover:bg-active hover:text-slate-200"
          >
            <X size={16} />
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/30 bg-accent-500/15">
              <KeyRound size={20} className="text-accent-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight text-white">{t("credentialsModal.title")}</h3>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <ShieldCheck size={12} className="text-accent-400" />
                {t("credentialsModal.username")} · {t("credentialsModal.password")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line-strong bg-control/70 px-2.5 py-1 text-xs text-slate-300">
              <Server size={12} className="shrink-0 text-slate-500" />
              <span className="truncate font-medium">{service.name}</span>
              {service.systemId && <span className="text-slate-500">({service.systemId})</span>}
            </span>
            {(service.manualAdtUrl || service.host) && (
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line-strong bg-control/70 px-2.5 py-1 text-xs text-slate-400">
                <Globe size={12} className="shrink-0 text-slate-500" />
                <span className="truncate font-mono">{address}</span>
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 px-6 pb-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {t("credentialsModal.username")}
            </label>
            <div className="relative">
              <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={disabled}
                autoFocus
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {t("credentialsModal.password")}
            </label>
            <div className="relative">
              <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                disabled={disabled}
                className={`${fieldClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? t("credentialsModal.hidePassword") : t("credentialsModal.showPassword")}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-active hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              {/* lang="en": "Client" Türkçe sözlükte de İngilizce kalıyor (SAP
                  terimi), etiket ise `uppercase` çiziliyor ve büyütme DİLE
                  ÖZGÜ — `<html lang="tr">` altında "CLİENT" oluyordu. */}
              <label lang="en" className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {t("credentialsModal.client")}
              </label>
              {isCloud && (
                <span className="rounded-full border border-line-strong px-1.5 py-0.5 text-[10px] leading-none text-slate-500">
                  {t("credentialsModal.optional").trim()}
                </span>
              )}
            </div>
            <div className="relative">
              <Hash size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={
                  isCloud ? t("credentialsModal.clientPlaceholderCloud") : t("credentialsModal.clientPlaceholderOnprem")
                }
                disabled={disabled}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className="px-6 pt-4">
          {errorMessage && (
            <div
              className="animate-alert-slide-in mb-2 flex items-start gap-2 rounded-lg border border-l-[3px] px-3 py-2.5 text-xs"
              style={{
                borderColor: "var(--status-danger-border)",
                backgroundColor: "var(--status-danger-bg)",
                color: "var(--status-danger-text)"
              }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2 border-t border-line-subtle px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className={DIALOG_CANCEL_BUTTON}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={DIALOG_CONFIRM_BUTTON}
          >
            {connecting && <Loader2 size={14} className="animate-spin" />}
            {connecting ? t("credentialsModal.verifying") : t("credentialsModal.connect")}
          </button>
        </div>
      </form>
    </div>
  );
}
