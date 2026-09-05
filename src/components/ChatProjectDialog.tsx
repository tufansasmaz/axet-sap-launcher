import { useEffect, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import type { ChatProject } from "../../app-electron/shared/types";
import { useT } from "../i18n";

// Bir projenin TÜM ayarları tek kutuda: adı, kalıcı talimatı ve silme.
//
// Neden ayrı bir "yeniden adlandır" satır içi düzenlemesi YOK: kenar
// çubuğundaki proje başlığına dört ayrı düğme (yeni sohbet / ad / talimat /
// sil) sığdırmak 272px'lik bir sütunu okunmaz hâle getiriyordu. Ad ve talimat
// zaten aynı kararın iki parçası, ikisi de burada.
//
// Silme onayı bu kutunun İÇİNDE iki aşamalı — `ConfirmDialog`'u üstüne
// açmak iki modalı üst üste bindirirdi (ikisi de `z-[60]`), ve arkadaki
// kutunun hangi projeye ait olduğu kaybolurdu.
//
// `ChatInstructionsDialog` ile KARIŞTIRILMAMALI: o kutu klasöre ait
// `AGENTS.md` dosyasını düzenliyor (axet-code onu süreç açılışında kendisi
// okuyor), bu ise sohbete ait ve prompt'a bizim eklediğimiz bir metin.

interface Props {
  /** `null` ise kutu çizilmiyor. */
  project: ChatProject | null;
  onClose: () => void;
  onSave: (name: string, instructions: string) => void;
  onDelete: () => void;
}

export default function ChatProjectDialog({ project, onClose, onSave, onDelete }: Props) {
  const t = useT();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Kutu her açılışta O projenin değerleriyle doluyor. Bağımlılık `project.id`
  // değil `project`: aynı projeyi kapatıp açmak da alanları tazelemeli.
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setInstructions(project.instructions);
    setConfirmingDelete(false);
  }, [project]);

  if (!project) return null;

  const trimmedName = name.trim();

  const save = () => {
    // Adsız proje kenar çubuğunda tıklanamaz bir boşluk olurdu; eski ad
    // korunuyor.
    onSave(trimmedName || project.name, instructions);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay-scrim)]"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-[560px] flex-col rounded-xl border border-base-700 bg-base-900 p-6">
        <div className="mb-4 flex items-center gap-2">
          <FolderOpen size={18} className="text-accent-400" />
          <h3 className="text-base font-semibold text-white">{t("chatProject.title")}</h3>
        </div>

        <label className="mb-1 text-[12px] font-medium text-slate-300">{t("chatProject.nameLabel")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          // Ana süreçteki `chatStore.ts` adı 80 karakterde KESİYOR. Sınır
          // burada yoksa kullanıcının yazdığı ad kaydedilmiş görünür, sonraki
          // açılışta sessizce kısalırdı.
          maxLength={80}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          placeholder={t("chatProject.namePlaceholder")}
          className="mb-4 rounded-md border border-base-700 bg-base-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-accent-500/50"
        />

        <label className="mb-1 text-[12px] font-medium text-slate-300">
          {t("chatProject.instructionsLabel")}
        </label>
        <p className="mb-2 text-[11px] leading-relaxed text-slate-500">{t("chatProject.instructionsHint")}</p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          // Aynı gerekçe: talimat diskte 8000 karakterde kesiliyor.
          maxLength={8000}
          spellCheck={false}
          placeholder={t("chatProject.instructionsPlaceholder")}
          className="chat-scroll min-h-[180px] flex-1 resize-none rounded-md border border-base-700 bg-base-950 p-3 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent-500/50"
        />
        {/* İki yönerge mekanizmasının karıştırılması en olası yanlış anlama:
            kullanıcı buraya "her cevabı Türkçe yaz" yazıp terminalde neden
            geçerli olmadığını sorabilir. */}
        <p className="mt-2 text-[11px] text-slate-500">{t("chatProject.folderNote")}</p>

        <div className="mt-4 flex items-center gap-2">
          {confirmingDelete ? (
            <>
              <span className="min-w-0 flex-1 text-[11px] leading-tight text-slate-400">
                {t("chatProject.deleteConfirm")}
              </span>
              <button
                onClick={onDelete}
                className="shrink-0 cursor-pointer rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-[12px] font-medium text-[var(--status-danger-text)]"
              >
                {t("chatProject.deleteYes")}
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="shrink-0 cursor-pointer rounded-md px-3 py-2 text-[12px] text-slate-300 hover:bg-base-700"
              >
                {t("common.cancel")}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmingDelete(true)}
                title={t("chatProject.delete")}
                className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-[12px] text-slate-500 transition hover:text-[var(--status-danger-text)]"
              >
                <Trash2 size={13} />
                {t("chatProject.delete")}
              </button>
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="cursor-pointer rounded-md px-4 py-2 text-sm text-slate-300 hover:bg-base-700"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={save}
                className="cursor-pointer rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-accent-on transition hover:bg-accent-600"
              >
                {t("common.save")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
