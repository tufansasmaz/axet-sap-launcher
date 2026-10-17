import { useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import { VERIFY_COMMAND_MAX, VERIFY_MAX_COMMANDS } from "../../app-electron/shared/terminalLayout";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON } from "../ui/buttons";

// "Doğrulama komutları…" (spec 2026-10-18 gorev-panosu §6, §8): alanın
// kanıt komutları, satır başına bir. Yalnız kullanıcının buraya yazdığı
// metin çalıştırılır; liderden ya da ajandan komut gelmez. Boş bırakılırsa
// alt görevler elle onaylanır.

const AREA =
  "min-h-28 w-full min-w-0 rounded border border-line bg-transparent px-2 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-accent-500/60";

export default function VerifyCommandsDialog({
  open,
  workspaceName,
  initial,
  onSave,
  onCancel
}: {
  open: boolean;
  workspaceName: string;
  initial: readonly string[];
  onSave: (lines: string[]) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [text, setText] = useState("");
  // Çift kaydetmeyi önlemek için ref (React yeniden çizmeden önce etkili).
  const savedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setText(initial.join("\n"));
    savedRef.current = false;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const error =
    lines.length > VERIFY_MAX_COMMANDS
      ? t("board.verifyTooMany", { max: VERIFY_MAX_COMMANDS })
      : lines.some((line) => line.length > VERIFY_COMMAND_MAX)
        ? t("board.verifyTooLong", { max: VERIFY_COMMAND_MAX })
        : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error || savedRef.current) return;
    savedRef.current = true;
    onSave(lines);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("board.verifyTitle")} subtitle={workspaceName} size="md">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-xs text-slate-400">{t("board.verifyHelp")}</p>
        <textarea
          aria-label={t("board.verifyLabel")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={"npm run lint\nnpm test"}
          className={AREA}
          autoFocus
        />
        {error ? (
          <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
            {error}
          </p>
        ) : (
          <p className="text-2xs text-slate-500">
            {lines.length === 0 ? t("board.verifyEmptyHint") : t("board.verifyCount", { count: lines.length })}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <ModalCancelButton />
          <button type="submit" disabled={error !== null} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
