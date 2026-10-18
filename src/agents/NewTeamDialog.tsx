import { Users } from "lucide-react";
import { useT } from "../i18n";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { TEAM_TEMPLATES, type TeamTemplateId } from "./teamTemplates";

// "+ Ekip" penceresi (spec 2026-10-18 ajanlar-yeniden §2b): boş ekip ya da
// hazır şablon. Seçim tek tık; şablon ajanları axet-code ile açılıyor.

const OPTION =
  "flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md border border-line bg-card px-3 py-2 text-left " +
  "transition-colors hover:border-slate-500 focus-visible:border-accent-400 focus-visible:outline-none";

export default function NewTeamDialog({
  open,
  onPick,
  onCancel
}: {
  open: boolean;
  onPick: (template: TeamTemplateId | null) => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <Modal open={open} size="sm" title={t("teams.addTitle")} icon={<Users size={18} className="text-slate-400" />} onClose={onCancel} footer={<ModalCancelButton />}>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => onPick(null)} className={OPTION}>
          <span className="text-sm text-slate-100">{t("teams.empty")}</span>
          <span className="text-2xs text-slate-500">{t("teams.emptyHint")}</span>
        </button>
        {TEAM_TEMPLATES.map((template) => (
          <button key={template.id} type="button" onClick={() => onPick(template.id)} className={OPTION}>
            <span className="text-sm text-slate-100">{t(template.titleKey)}</span>
            <span className="text-2xs text-slate-500">{t(template.hintKey)}</span>
          </button>
        ))}
        <p className="text-2xs text-slate-500">{t("teams.templateNote")}</p>
      </div>
    </Modal>
  );
}
