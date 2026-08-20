import { useEffect, useState } from "react";
import { X, FolderOpen, Download, Upload, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { AppConfig, UpdateStatus } from "../../app-electron/shared/types";

interface Props {
  open: boolean;
  onClose: () => void;
  config: AppConfig | null;
  onSave: (partial: Partial<AppConfig>) => Promise<void>;
  onExportManualSystems: () => Promise<void>;
  onImportManualSystems: () => Promise<void>;
}

export default function SettingsModal({ open, onClose, config, onSave, onExportManualSystems, onImportManualSystems }: Props) {
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

  const save = async () => {
    await onSave(form);
    onClose();
  };

  const handleCheckForUpdates = async () => {
    await onSave({ autoCheckUpdates: form.autoCheckUpdates });
    await window.api.checkForUpdates();
  };

  const renderUpdateStatus = () => {
    switch (updateStatus.phase) {
      case "checking":
        return (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <RefreshCw size={12} className="animate-spin" /> Kontrol ediliyor…
          </p>
        );
      case "available":
        return (
          <div className="flex items-center justify-between gap-2 text-xs text-accent-400">
            <span className="flex items-center gap-1.5">
              <Download size={12} /> Yeni sürüm bulundu: v{updateStatus.version}
            </span>
            <button
              onClick={() => window.api.downloadUpdate()}
              className="cursor-pointer rounded-md bg-accent-500 px-2 py-1 text-xs font-medium text-white hover:bg-accent-400"
            >
              İndir
            </button>
          </div>
        );
      case "not-available":
        return (
          <p className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 size={12} /> En güncel sürümü kullanıyorsun.
          </p>
        );
      case "downloading":
        return (
          <p className="flex items-center gap-1.5 text-xs text-accent-400">
            <Download size={12} /> İndiriliyor… %{updateStatus.percent ?? 0}
          </p>
        );
      case "downloaded":
        return (
          <div className="flex items-center justify-between gap-2 text-xs text-emerald-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={12} /> v{updateStatus.version} indirildi, kurulmaya hazır.
            </span>
            <button
              onClick={() => window.api.installUpdate()}
              className="cursor-pointer rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
            >
              Şimdi Yeniden Başlat ve Kur
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
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="max-h-[90vh] w-[480px] overflow-y-auto rounded-2xl border border-base-700 bg-base-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Ayarlar</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-base-700">
            <X size={18} />
          </button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">Proje klasörü (her müşteri/sistem için buraya alt klasör oluşturulur)</label>
        <div className="mb-4 flex gap-2">
          <input
            value={form.projectsBaseDir}
            onChange={(e) => setForm({ ...form, projectsBaseDir: e.target.value })}
            className="flex-1 rounded-md border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
          />
          <button onClick={pickFolder} className="rounded-md border border-base-600 px-3 text-slate-300 hover:bg-base-700">
            <FolderOpen size={16} />
          </button>
        </div>

        <label className="mb-1 block text-xs text-slate-400">axet.code çalıştırma komutu</label>
        <input
          value={form.axetCommand}
          onChange={(e) => setForm({ ...form, axetCommand: e.target.value })}
          className="mb-4 w-full rounded-md border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
        />

        <label className="mb-1 block text-xs text-slate-400">Gömülü terminal kabuğu</label>
        <div className="mb-2 flex gap-2">
          {(["cmd", "powershell"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setForm({ ...form, terminal: t })}
              className={`rounded-md px-3 py-1.5 text-sm ${
                form.terminal === t ? "bg-accent-500 text-white" : "border border-base-600 text-slate-300 hover:bg-base-700"
              }`}
            >
              {t === "cmd" ? "cmd.exe" : "PowerShell"}
            </button>
          ))}
        </div>
        <p className="mb-6 text-xs text-slate-500">
          Bağlandığında uygulamanın altında gömülü bir terminal sekmesi açılır, harici pencere açılmaz.
        </p>

        <label className="mb-1 block text-xs text-slate-400">SAPUILandscape.xml yolu (boş = otomatik algıla)</label>
        <input
          value={form.landscapePathOverride ?? ""}
          onChange={(e) => setForm({ ...form, landscapePathOverride: e.target.value || null })}
          placeholder="C:\Users\...\AppData\Roaming\SAP\Common\SAPUILandscape.xml"
          className="mb-6 w-full rounded-md border border-base-600 bg-base-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-accent-500"
        />

        <label className="mb-1 block text-xs text-slate-400">Manuel Sistemler</label>
        <div className="mb-6 flex gap-2">
          <button
            onClick={onExportManualSystems}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-base-600 px-3 py-2 text-sm text-slate-300 hover:bg-base-700"
          >
            <Download size={14} />
            Dışa Aktar (JSON)
          </button>
          <button
            onClick={onImportManualSystems}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-base-600 px-3 py-2 text-sm text-slate-300 hover:bg-base-700"
          >
            <Upload size={14} />
            İçe Aktar (JSON)
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-base-700 bg-base-800/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs text-slate-400">Güncellemeler</label>
            <span className="text-xs text-slate-500">Sürüm {appVersion || "…"} · by tsasmaz</span>
          </div>

          <label className="mb-3 flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.autoCheckUpdates}
              onChange={(e) => setForm({ ...form, autoCheckUpdates: e.target.checked })}
              className="cursor-pointer"
            />
            Uygulama açılışında otomatik kontrol et
          </label>

          <button
            onClick={handleCheckForUpdates}
            className="mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-base-600 px-3 py-2 text-sm text-slate-300 hover:bg-base-700"
          >
            <RefreshCw size={14} />
            Güncellemeleri Şimdi Kontrol Et
          </button>

          {renderUpdateStatus()}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-base-700">
            İptal
          </button>
          <button onClick={save} className="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-400">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
