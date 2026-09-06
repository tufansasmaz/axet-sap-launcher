import { useEffect, useState } from "react";
import { X, ServerCog, Cloud, Loader2, CheckCircle2 } from "lucide-react";
import type { ManualSystemType } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";

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

  // DIAG portu: boş bırakılabilir ama yazıldıysa geçerli bir port olmalı.
  // Eskiden `Number("abc")` → NaN → JSON'a `null` olarak yazılıyordu; kullanıcı
  // yanlış yazdığını hiç öğrenmiyor, sistem sadece sessizce "erişilemiyor"
  // oluyordu.
  const diagPortTrimmed = diagPort.trim();
  const diagPortValid =
    diagPortTrimmed.length === 0 ||
    (/^\d+$/.test(diagPortTrimmed) && Number(diagPortTrimmed) >= 1 && Number(diagPortTrimmed) <= 65535);

  const canSubmit =
    name.trim().length > 0 &&
    systemId.trim().length > 0 &&
    (type === "onprem" ? host.trim().length > 0 && diagPortValid : adtUrl.trim().length > 0) &&
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
        diagPort: type === "onprem" && diagPortTrimmed ? Number(diagPortTrimmed) : null,
        // ADT URL artık on-prem'de de gönderiliyor. Eskiden `type === "cloud"`
        // koşuluna bağlıydı; bu, ADT adresi bilinen bir on-prem sistemi
        // (çoğu S/4'te `https://host:44300`) elle girmeyi imkânsız kılıyor ve
        // kullanıcıyı port keşfine mahkûm ediyordu. Daha kötüsü: cloud olarak
        // eklenmiş bir sistemi on-prem'e çevirmek kayıtlı URL'i SESSİZCE
        // siliyordu. Boşsa yine null gider, davranış değişmez.
        adtUrl: adtUrl.trim() || null
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
      // Electron, main'den fırlayan hatayı "Error invoking remote method
      // 'x': Error: ..." diye sarıyor. Kullanıcıya gösterilen tek şey bu
      // kutu olduğu için sarmalayıcıyı soyup gerçek mesajı bırakıyoruz.
      const raw = (err as Error).message;
      setError(raw.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] "
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
    >
      <form onSubmit={handleSubmit} className="w-[460px] rounded-xl border border-line bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? t("addSystemModal.editTitle") : t("addSystemModal.addTitle")}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-active"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setType("onprem")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm transition ${
              type === "onprem"
                ? "border-accent-500 bg-accent-500/15 text-white"
                : "border-line-strong text-slate-400 hover:bg-active"
            }`}
          >
            <ServerCog size={16} />
            {t("addSystemModal.onprem")}
          </button>
          <button
            type="button"
            onClick={() => setType("cloud")}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm transition ${
              type === "cloud"
                ? "border-accent-500 bg-accent-500/15 text-white"
                : "border-line-strong text-slate-400 hover:bg-active"
            }`}
          >
            <Cloud size={16} />
            {t("addSystemModal.cloud")}
          </button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.displayName")}</label>
        {/* autoFocus sadece kolaylık değil, Escape'in ÇALIŞMASININ şartı:
            aşağıdaki onKeyDown odaklanamayan bir div'de duruyor, tuş oraya
            ancak odak modalın içindeyken kabararak ulaşıyor. Odak dışarıdayken
            Escape hiçbir şey yapmıyordu. */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("addSystemModal.displayNamePlaceholder")}
          autoFocus
          className="mb-4 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
        />

        <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.systemId")}</label>
        <input
          value={systemId}
          onChange={(e) => setSystemId(e.target.value.toUpperCase())}
          placeholder={t("addSystemModal.systemIdPlaceholder")}
          maxLength={8}
          className="mb-4 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm uppercase text-slate-100 outline-none focus:border-accent-500"
        />

        {type === "onprem" ? (
          <>
            <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.host")}</label>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder={t("addSystemModal.hostPlaceholder")}
              className="mb-4 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
            />
            <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.diagPort")}</label>
            <input
              value={diagPort}
              onChange={(e) => setDiagPort(e.target.value)}
              placeholder={t("addSystemModal.diagPortPlaceholder")}
              inputMode="numeric"
              className={`mb-1 w-full rounded-md border bg-control px-3 py-2 text-sm text-slate-100 outline-none ${
                diagPortValid ? "border-line-strong focus:border-accent-500" : "border-[var(--status-danger-border)]"
              }`}
            />
            {!diagPortValid && (
              <p className="mb-3 text-xs" style={{ color: "var(--status-danger-text)" }}>
                {t("addSystemModal.diagPortInvalid")}
              </p>
            )}
            <p className="mb-4 mt-3 text-xs text-slate-500">{t("addSystemModal.diagHelper")}</p>

            <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.adtUrlOnprem")}</label>
            <input
              value={adtUrl}
              onChange={(e) => setAdtUrl(e.target.value)}
              placeholder={t("addSystemModal.adtUrlOnpremPlaceholder")}
              className="mb-4 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
            />
            <p className="mb-4 text-xs text-slate-500">{t("addSystemModal.adtUrlOnpremHelper")}</p>
          </>
        ) : (
          <>
            <label className="mb-1 block text-xs text-slate-400">{t("addSystemModal.adtUrl")}</label>
            <input
              value={adtUrl}
              onChange={(e) => setAdtUrl(e.target.value)}
              placeholder={t("addSystemModal.adtUrlPlaceholder")}
              className="mb-4 w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
            />
            <p className="mb-4 text-xs text-slate-500">{t("addSystemModal.adtUrlHelper")}</p>
          </>
        )}

        {error && (
          <div
            className="mb-4 rounded-md border px-3 py-2 text-xs"
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
            className={DIALOG_CANCEL_BUTTON}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={DIALOG_CONFIRM_BUTTON}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {isEditing ? t("addSystemModal.update") : t("addSystemModal.add")}
          </button>
        </div>
      </form>
    </div>
  );
}
