import { useEffect, useState } from "react";
import { X, KeyRound, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import type { SapService } from "../../app-electron/shared/types";
import { useT } from "../i18n";

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
  const canSubmit =
    username.trim().length > 0 && password.length > 0 && (isCloud || client.trim().length > 0) && !connecting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(username.trim(), password, client.trim());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 "
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="w-[420px] rounded-sm border border-base-700 bg-base-900 p-6">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-accent-400" />
            <h3 className="text-lg font-semibold text-white">{t("credentialsModal.title")}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-slate-400 hover:bg-base-700">
            <X size={18} />
          </button>
        </div>
        <p className="mb-5 break-all text-xs text-slate-500">
          {service.name} ({service.systemId})
          {service.manualAdtUrl
            ? ` — ${service.manualAdtUrl}`
            : service.host
              ? ` — ${service.host}${service.port ? `:${service.port}` : ""}`
              : ""}
        </p>

        <label className="mb-1 block text-xs text-slate-400">{t("credentialsModal.username")}</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loadingDefaults || connecting}
          autoFocus
          className="mb-4 w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500 disabled:opacity-50"
        />

        <label className="mb-1 block text-xs text-slate-400">{t("credentialsModal.password")}</label>
        <div className="mb-4 flex items-center gap-1">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            disabled={loadingDefaults || connecting}
            className="w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            title={showPassword ? t("credentialsModal.hidePassword") : t("credentialsModal.showPassword")}
            className="cursor-pointer rounded-sm p-2 text-slate-400 hover:bg-base-700 hover:text-slate-200"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">
          {t("credentialsModal.client")}
          {isCloud ? t("credentialsModal.optional") : ""}
        </label>
        <input
          value={client}
          onChange={(e) => setClient(e.target.value)}
          placeholder={
            isCloud ? t("credentialsModal.clientPlaceholderCloud") : t("credentialsModal.clientPlaceholderOnprem")
          }
          disabled={loadingDefaults || connecting}
          className="mb-5 w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500 disabled:opacity-50"
        />

        {errorMessage && (
          <div
            className="mb-4 flex items-start gap-2 rounded-sm border px-3 py-2 text-xs"
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-4 py-2 text-sm text-slate-300 hover:bg-base-700"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-sm border border-accent-500/40 bg-accent-500/15 px-4 py-2 text-sm font-medium text-[var(--accent-soft-text)] hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting && <Loader2 size={14} className="animate-spin" />}
            {connecting ? t("credentialsModal.verifying") : t("credentialsModal.connect")}
          </button>
        </div>
      </form>
    </div>
  );
}
