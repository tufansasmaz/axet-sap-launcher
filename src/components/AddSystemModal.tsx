import { useEffect, useState } from "react";
import { X, ServerCog, Cloud, Loader2, CheckCircle2 } from "lucide-react";
import type { ManualSystemType } from "../../app-electron/shared/types";
import { useT } from "../i18n";

export interface EditingManualSystem {
  id: string;
  name: string;
  systemId: string;
  type: ManualSystemType;
  host: string | null;
  diagPort: number | null;
  adtUrl: string | null;
}

interface Props {
  open: boolean;
  editing?: EditingManualSystem | null;
  onClose: () => void;
  onAdded: (id: string | null) => void;
}

export default function AddSystemModal({ open, editing, onClose, onAdded }: Props) {
  const t = useT();
  const [type, setType] = useState<ManualSystemType>("onprem");
  const [name, setName] = useState("");
  const [systemId, setSystemId] = useState("");
  const [host, setHost] = useState("");
  const [diagPort, setDiagPort] = useState("3200");
  const [adtUrl, setAdtUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setName(editing.name);
      setSystemId(editing.systemId);
      setHost(editing.host ?? "");
      setDiagPort(editing.diagPort ? String(editing.diagPort) : "3200");
      setAdtUrl(editing.adtUrl ?? "");
    } else {
      setType("onprem");
      setName("");
      setSystemId("");
      setHost("");
      setDiagPort("3200");
      setAdtUrl("");
    }
    setError(null);
  }, [open, editing?.id]);

  if (!open) return null;

  const reset = () => {
    setType("onprem");
    setName("");
    setSystemId("");
    setHost("");
    setDiagPort("3200");
    setAdtUrl("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSubmit =
    name.trim().length > 0 &&
    systemId.trim().length > 0 &&
    (type === "onprem" ? host.trim().length > 0 : adtUrl.trim().length > 0) &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        systemId: systemId.trim(),
        type,
        host: type === "onprem" ? host.trim() : null,
        diagPort: type === "onprem" && diagPort.trim() ? Number(diagPort.trim()) : null,
        adtUrl: type === "cloud" ? adtUrl.trim() : null
      };
      let resultId: string | null = null;
      if (editing) {
        const updated = await window.api.updateManualSystem(editing.id, input);
        resultId = updated?.id ?? null;
      } else {
        const created = await window.api.addManualSystem(input);
        resultId = created.id;
      }
      onAdded(resultId);
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 "
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
    >
      <form onSubmit={handleSubmit} className="w-[460px] rounded-sm border border-base-700 bg-base-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? t("addSystemModal.editTitle") : t("addSystemModal.addTitle")}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-sm p-1 text-slate-400 hover:bg-base-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setType("onprem")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border px-3 py-2.5 text-sm transition ${
              type === "onprem"
                ? "border-accent-500 bg-accent-500/15 text-white"
                : "border-base-600 text-slate-400 hover:bg-base-700"
            }`}
          >
            <ServerCog size={16} />
            {t("addSystemModal.onprem")}
          </button>
          <button
            type="button"
            onClick={() => setType("cloud")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border px-3 py-2.5 text-sm transition ${
              type === "cloud"
                ? "border-accent-500 bg-accent-500/15 text-white"
                : "border-base-600 text-slate-400 hover:bg-base-700"
            }`}
          >
            <Cloud size={16} />
            {t("addSystemModal.cloud")}
          </button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.displayName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addSystemModal.displayNamePlaceholder")}
          className="mb-4 w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
        />

        <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.systemId")}</label>
        <input
          value={systemId}
          onChange={(e) => setSystemId(e.target.value.toUpperCase())}
          placeholder={t("addSystemModal.systemIdPlaceholder")}
          maxLength={8}
          className="mb-4 w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm uppercase text-slate-100 outline-none focus:border-accent-500"
        />

        {type === "onprem" ? (
          <>
            <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.host")}</label>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={t("addSystemModal.hostPlaceholder")}
              className="mb-4 w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
            />
            <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.diagPort")}</label>
            <input
              value={diagPort}
              onChange={(e) => setDiagPort(e.target.value)}
              placeholder={t("addSystemModal.diagPortPlaceholder")}
              className="mb-4 w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
            />
            <p className="mb-4 text-xs text-slate-500">{t("addSystemModal.diagHelper")}</p>
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.adtUrl")}</label>
            <input
              value={adtUrl}
              onChange={(e) => setAdtUrl(e.target.value)}
              placeholder={t("addSystemModal.adtUrlPlaceholder")}
              className="mb-4 w-full rounded-sm border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
            />
            <p className="mb-4 text-xs text-slate-500">{t("addSystemModal.adtUrlHelper")}</p>
          </>
        )}

        {error && (
          <div
            className="mb-4 rounded-sm border px-3 py-2 text-xs"
            style={{
              borderColor: "var(--status-danger-border)",
              backgroundColor: "var(--status-danger-bg)",
              color: "var(--status-danger-text)"
            }}
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-sm px-4 py-2 text-sm text-slate-300 hover:bg-base-700"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-accent-500/40 bg-accent-500/15 px-4 py-2 text-sm font-medium text-[var(--accent-soft-text)] hover:bg-accent-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {isEditing ? t("addSystemModal.update") : t("addSystemModal.add")}
          </button>
        </div>
      </form>
    </div>
  );
}
