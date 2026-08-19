import { useEffect, useState } from "react";
import { X, FolderOpen, Download, Upload } from "lucide-react";
import type { AppConfig } from "../../app-electron/shared/types";

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

  useEffect(() => setForm(config), [config]);

  if (!open || !form) return null;

  const pickFolder = async () => {
    const dir = await window.api.pickFolder();
    if (dir) setForm({ ...form, projectsBaseDir: dir });
  };

  const save = async () => {
    await onSave(form);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="w-[480px] rounded-2xl border border-base-700 bg-base-900 p-6 shadow-2xl">
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
