import { useEffect, useState, type FormEvent } from "react";
import { FolderOpen } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import { TERMINAL_PANE_KINDS } from "../../app-electron/shared/terminalLayout";
import { middleEllipsis } from "../lib/paths";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";

// "+ Bölme" penceresi (spec §5.2): tür + klasör, iki alan. Düğmeler formun
// İÇİNDE: Enter'la gönderim tarayıcının kendi form davranışı, ayrıca tuş
// dinlemeye gerek yok.

export const KIND_LABEL: Record<TerminalPaneKind, TranslationKey> = {
  axet: "terminal.kindAxet",
  cmd: "terminal.kindCmd",
  powershell: "terminal.kindPowershell"
};

export default function NewPaneDialog({
  open,
  defaultKind,
  defaultCwd,
  onOpen,
  onCancel
}: {
  open: boolean;
  defaultKind: TerminalPaneKind;
  defaultCwd: string;
  onOpen: (kind: TerminalPaneKind, cwd: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [kind, setKind] = useState<TerminalPaneKind>(defaultKind);
  const [cwd, setCwd] = useState(defaultCwd);

  // Her açılışta varsayılana dön. Varsayılan zaten "son eklenen bölme";
  // önceki açılışta yarım bırakılan seçim taşınmıyor.
  useEffect(() => {
    if (!open) return;
    setKind(defaultKind);
    setCwd(defaultCwd);
    // Yalnız açılış anı: pencere açıkken varsayılanın değişmesi (arkada
    // bölme eklenmesi) kullanıcının seçimini ezmemeli.
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!cwd) return;
    onOpen(kind, cwd);
  };

  const pick = async () => {
    const folder = await window.api.pickFolder();
    if (folder) setCwd(folder);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("terminal.newPaneTitle")} width={420}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("terminal.kindLabel")}</span>
          <div role="radiogroup" aria-label={t("terminal.kindLabel")} className="flex gap-1 rounded-md bg-control p-0.5">
            {TERMINAL_PANE_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
                  kind === k ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t(KIND_LABEL[k])}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("terminal.folderLabel")}</span>
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="shrink-0 text-accent-400" />
            <span title={cwd || undefined} className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">
              {cwd ? middleEllipsis(cwd, 44) : t("terminal.noFolder")}
            </span>
            <button type="button" onClick={() => void pick()} className={TOOL_BUTTON}>
              {t("terminal.changeFolder")}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <ModalCancelButton />
          <button type="submit" disabled={!cwd} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("terminal.open")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
