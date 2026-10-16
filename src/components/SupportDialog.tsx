import { useEffect, useId, useMemo, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useT } from "../i18n";
import { chatToMarkdown, type ChatExportInput } from "../lib/chatExport";
import { useChatStore } from "../stores/chatStore";

// "Sorun bildir" (spec 2026-10-16). Kullanıcı ne gönderdiğini görüyor: dosya
// listesi ana süreçten geliyor, sohbet metni yalnız kutu işaretliyse gidiyor.
// Paketi oluşturan ve maskeleyen ana süreç (support/ipc.ts).

interface Props {
  open: boolean;
  onClose: () => void;
  chat: ChatExportInput | null;
  onDone: (result: { zipPath: string; draft: "outlook" | "folder" }) => void;
}

export default function SupportDialog({ open, onClose, chat, onDone }: Props) {
  const t = useT();
  const hintId = useId();
  const [note, setNote] = useState("");
  const [includeChat, setIncludeChat] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatAvailable = !!chat && chat.messages.length > 0;
  const chatMarkdown = useMemo(
    () => (includeChat && chatAvailable && chat ? chatToMarkdown(chat) : null),
    [includeChat, chatAvailable, chat]
  );
  const hasNote = note.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    setNote("");
    setIncludeChat(false);
    setError(null);
    setBusy(false);
  }, [open]);

  // Liste yalnız "not var mı / sohbet var mı" değişince yenileniyor.
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    window.api.supportPreview({ note: hasNote ? "x" : "", chatMarkdown }).then((names) => {
      if (!disposed) setFiles(names);
    });
    return () => {
      disposed = true;
    };
  }, [open, hasNote, chatMarkdown]);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await window.api.supportCreate({ note: note.trim(), chatMarkdown });
    setBusy(false);
    if (!result.ok) {
      setError(t("support.failed", { message: result.message }));
      return;
    }
    onDone({ zipPath: result.zipPath, draft: result.draft });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={busy}
      title={t("support.title")}
      subtitle={t("support.subtitle")}
      icon={<LifeBuoy size={16} />}
      footer={
        <>
          <ModalCancelButton />
          <Button variant="primary" onClick={() => void create()} disabled={busy}>
            {busy ? t("support.creating") : t("support.create")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs text-slate-400">
          {t("support.noteLabel")}
          <textarea
            aria-label={t("support.noteLabel")}
            value={note}
            maxLength={4000}
            rows={4}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("support.notePlaceholder")}
            className="resize-y rounded-md border border-line bg-app/40 px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent-500/60"
          />
        </label>
        <label className={`flex items-start gap-2 text-sm ${chatAvailable ? "text-slate-200" : "text-slate-500"}`}>
          <input
            type="checkbox"
            checked={includeChat}
            disabled={!chatAvailable}
            aria-label={t("support.includeChat")}
            aria-describedby={hintId}
            onChange={(e) => setIncludeChat(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            {t("support.includeChat")}
            <span id={hintId} className="text-xs text-slate-500">
              {t("support.includeChatHint")}
            </span>
          </span>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("support.filesLabel")}</span>
          <ul className="flex flex-wrap gap-1.5">
            {files.map((name) => (
              <li key={name} className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-slate-300">
                {name}
              </li>
            ))}
          </ul>
        </div>
        {error && <p className="text-xs text-[var(--status-danger-text)]">{error}</p>}
      </div>
    </Modal>
  );
}

/** ChatStoreProvider'ın içinde çizilir: seçili sohbeti okuyup pencereye verir. */
export function SupportDialogHost(props: Omit<Props, "chat">) {
  const { sessions, activeId } = useChatStore();
  const session = sessions.find((s) => s.id === activeId) ?? null;
  const chat: ChatExportInput | null = session
    ? { title: session.title, messages: session.messages, contextPath: session.cwd, contextLabel: session.sapLabel }
    : null;
  return <SupportDialog {...props} chat={chat} />;
}
