// Ajanlar > Dosyalar (kararlilik-2 R7).
//
// Kullanıcı: "Ajanlarda dosya görüntüleme yok. Dosya görüntüleme kısmında dosya
// dizinini açacak bir buton yok." Ekibin proje klasörü: ağaç + SALT OKUNUR
// önizleme. Gezgin ve önizleme Sohbet'in Dosyalar panelindekiyle aynı bileşenler
// (FileExplorer/FileViewer); büyük dosya (2 MB üstü kırpılır) ve ikili içerik
// koruması onların içinde (fsExplorer.readTextFile). Düzenleme kapalı: ajanlar
// aynı klasöre yazarken ikinci bir yazar açmak istemiyoruz.
//
// Kök renderer'dan gelmiyor: ana süreç alan kaydından okuyor ve okuma iznini o
// köke veriyor (`agents:filesRoot`). "Gezgin'de aç" da aynı kayıttan
// (`changes:openRoot`).
import { useEffect, useState } from "react";
import { FolderOpen, X } from "lucide-react";
import type { FsEntry } from "../../app-electron/shared/types";
import FileExplorer from "../components/FileExplorer";
import FileViewer from "../components/FileViewer";
import { useT } from "../i18n";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { TOOL_BUTTON } from "../ui/buttons";

export default function FilesView({ workspace, visible = true }: { workspace: TerminalWorkspace; visible?: boolean }) {
  const t = useT();
  const [root, setRoot] = useState<string | null | undefined>(undefined);
  const [openFile, setOpenFile] = useState<FsEntry | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRoot(undefined);
    setOpenFile(null);
    window.api
      .agentsFilesRoot(workspace.id)
      .then((dir) => {
        if (!cancelled) setRoot(dir);
      })
      .catch(() => {
        if (!cancelled) setRoot(null);
      });
    return () => {
      cancelled = true;
    };
    // Kök klasör değişince (RepoChip "Değiştir") yeniden sorulsun.
  }, [workspace.id, workspace.root]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app pl-14">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-subtle px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <FolderOpen size={14} className="shrink-0 text-[var(--folder-icon)]" />
          <span className="text-xs font-semibold text-slate-200">{t("agentFiles.title")}</span>
          {root && (
            <span className="truncate font-mono text-2xs text-slate-500" title={root}>
              {root}
            </span>
          )}
        </div>
        {root && (
          <button type="button" onClick={() => void window.api.changesOpenRoot(workspace.id)} className={TOOL_BUTTON}>
            {t("agentFiles.openInExplorer")}
          </button>
        )}
      </div>

      {root === null && (
        <div className="flex flex-1 items-center justify-center p-6 text-xs text-slate-500">{t("agentFiles.noRoot")}</div>
      )}

      {root && (
        <div className="flex min-h-0 flex-1">
          <div className={`min-h-0 ${openFile ? "w-[40%] max-w-[420px] shrink-0 border-r border-line-subtle" : "flex-1"} overflow-hidden`}>
            <FileExplorer
              rootDir={root}
              rootLabel={workspace.name}
              selectedPath={openFile?.path ?? null}
              onSelectFile={setOpenFile}
              autoRefresh={visible}
              onExternalChange={() => setReloadToken((n) => n + 1)}
            />
          </div>
          {openFile && (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-3 py-1.5">
                <span className="truncate font-mono text-[11px] text-slate-300" title={openFile.path}>
                  {openFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setOpenFile(null)}
                  title={t("chatFiles.closeFile")}
                  aria-label={t("chatFiles.closeFile")}
                  className="cursor-pointer rounded p-0.5 text-slate-500 transition hover:bg-hover hover:text-slate-200"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <FileViewer path={openFile.path} name={openFile.name} reloadToken={reloadToken} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
