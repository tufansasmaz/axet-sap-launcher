import { BookOpen } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { MemoryEditorBody, useMemoryEditor } from "./memoryEditor";

// Bellek penceresi (spec 2026-10-18 ajan-bellegi §4, §5, §7); "Sohbet
// talimatları" penceresinin kalıbı. Mantık ve gövde Bellek görünümüyle ortak
// (memoryEditor.tsx). Kirli hâlde istem dışı sökülürse taslak saklanıyor;
// kullanıcının kendi kapatışında ("At ve Kapat") saklanmıyor.

export { clearDraftStoreForTest } from "./memoryEditor";

interface Props {
  workspaceId: string;
  paneId: string;
  name: string;
  onClose: () => void;
}

export default function MemoryDialog({ workspaceId, paneId, name, onClose }: Props) {
  const t = useT();
  const editor = useMemoryEditor(workspaceId, paneId);
  const closeByUser = () => {
    editor.markDiscarded();
    onClose();
  };
  const save = async () => {
    if (await editor.save()) onClose();
  };

  return (
    <Modal
      open
      onClose={closeByUser}
      dirty={editor.dirty}
      closeDisabled={editor.saving}
      title={t("memory.title", { name })}
      subtitle={t("memory.description")}
      icon={<BookOpen size={18} />}
      size="lg"
      footer={
        <>
          <ModalCancelButton label={t("common.close")} />
          <Button variant="primary" onClick={() => void save()} disabled={!editor.editable || editor.saving || editor.conflict}>
            {editor.saving ? t("memory.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <MemoryEditorBody editor={editor} label={t("memory.title", { name })} />
    </Modal>
  );
}
