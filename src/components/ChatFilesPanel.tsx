import { useEffect, useState } from "react";
import { FolderOpen, PanelRightClose, X } from "lucide-react";
import type { FsEntry } from "../../app-electron/shared/types";
import FileExplorer from "./FileExplorer";
import FileViewer from "./FileViewer";
import { useT } from "../i18n";

interface Props {
  /** Sohbetin çalışma klasörü — ağacın kökü. */
  rootDir: string;
  rootLabel: string;
  onClose: () => void;
  /**
   * Panel EKRANDA mı. Gizli panellerde izleyici açılmıyor: her sohbetin kendi
   * paneli var ve hepsi mount hâlde duruyor (bkz. AxetCodeHome'daki mount
   * kalıcılığı notu), yani bu bayrak olmadan onlarca `fs.watch` aynı anda
   * çalışırdı.
   */
  active: boolean;
}

// axet.code sohbetinin sağındaki dosya paneli.
//
// Kullanıcı geri bildirimi (2026-09-04, üçüncü bir kişiden aktarıldı):
// *"dosya sistemleri de çok faydalı oluyor / kendi gidip txt vs yazıyor
// direkt göreyim müdahale edeyim"*. Bu cümlenin üç ayrı gereği var ve üçü de
// burada karşılanıyor:
//   1. GÖRMEK       → ağaç, sohbetin KENDİ çalışma klasörünü gösteriyor.
//   2. DİREKT       → `autoRefresh`: ajan dosyayı yazdığı anda ağaç tazeleniyor,
//                     YENİLE'ye basmak gerekmiyor.
//   3. MÜDAHALE     → `editable`: metin dosyası panelde düzenlenip kaydediliyor.
//
// Gezgin ve önizleme AYNI bileşenler (FileExplorer/FileViewer) — SAP Launcher
// ekranındakiyle birebir aynı, sadece bu iki yetenek orada kapalı.
export default function ChatFilesPanel({ rootDir, rootLabel, onClose, active }: Props) {
  const t = useT();
  const [openFile, setOpenFile] = useState<FsEntry | null>(null);
  // Diskteki değişiklik önizlemeye de yansısın diye artan sayaç. İzleyici
  // FileExplorer'ın içinde; buraya `onExternalChange` ile geliyor.
  const [reloadToken, setReloadToken] = useState(0);

  // Kök değişince (başka bir sohbete/sisteme geçiş) açık dosya kapanıyor —
  // artık başka bir klasörün ağacına bakılıyor, eski dosya orada yok.
  useEffect(() => {
    setOpenFile(null);
  }, [rootDir]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-line-subtle bg-card">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <FolderOpen size={13} className="shrink-0 text-[var(--folder-icon)]" />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("chatFiles.title")}
          </span>
        </div>
        <button
          onClick={onClose}
          title={t("chatFiles.hide")}
          className="cursor-pointer rounded p-1 text-slate-500 transition hover:bg-hover hover:text-slate-200"
        >
          <PanelRightClose size={13} />
        </button>
      </div>

      {/* Dosya açıkken ağaç üst yarıya çekiliyor: ikisi de aynı anda görünür
          olmalı — kullanıcı dosyayı düzeltirken ajan komşu dosyayı yazıyor
          olabilir ve bunu görmesi işin yarısı. */}
      <div className={`min-h-0 ${openFile ? "h-[45%] shrink-0" : "flex-1"} overflow-hidden`}>
        <FileExplorer
          rootDir={rootDir}
          rootLabel={rootLabel}
          selectedPath={openFile?.path ?? null}
          onSelectFile={setOpenFile}
          autoRefresh={active}
          browsable
          onExternalChange={() => setReloadToken((n) => n + 1)}
        />
      </div>

      {openFile && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-line-subtle">
          <div className="flex shrink-0 items-center justify-between gap-2 bg-app px-3 py-1.5">
            <span className="truncate font-mono text-[11px] text-slate-300" title={openFile.path}>
              {openFile.name}
            </span>
            <button
              onClick={() => setOpenFile(null)}
              title={t("chatFiles.closeFile")}
              className="cursor-pointer rounded p-0.5 text-slate-500 transition hover:bg-hover hover:text-slate-200"
            >
              <X size={12} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <FileViewer path={openFile.path} name={openFile.name} editable reloadToken={reloadToken} />
          </div>
        </div>
      )}
    </div>
  );
}
