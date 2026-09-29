import { useEffect, useState } from "react";
import { FolderOpen, Trash2 } from "lucide-react";
import type { ChatProject } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

// Bir projenin TÜM ayarları tek kutuda: adı, kalıcı talimatı ve silme.
//
// Neden ayrı bir "yeniden adlandır" satır içi düzenlemesi YOK: kenar
// çubuğundaki proje başlığına dört ayrı düğme (yeni sohbet / ad / talimat /
// sil) sığdırmak 272px'lik bir sütunu okunmaz hâle getiriyordu. Ad ve talimat
// zaten aynı kararın iki parçası, ikisi de burada.
//
// Silme onayı bu kutunun İÇİNDE, ayakta iki aşamalı — üstüne ikinci bir
// pencere açmak arkadaki kutunun hangi projeye ait olduğunu gizlerdi.
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

  // Kaydedilmemiş değişiklik. `Modal` her kapatma isteğinde (Escape — metin
  // kutusunun İÇİNDEYKEN de —, X, İptal) buna bakıp önce soruyor; eskiden
  // yazılan talimat tek tuşla gidiyordu.
  const dirty = name !== project.name || instructions !== project.instructions;

  const save = () => {
    // Adsız proje kenar çubuğunda tıklanamaz bir boşluk olurdu; eski ad
    // korunuyor.
    onSave(trimmedName || project.name, instructions);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      dirty={dirty}
      title={t("chatProject.title")}
      icon={<FolderOpen size={18} />}
      width={560}
      footer={
        confirmingDelete ? (
          <>
            <span className="mr-auto min-w-0 flex-1 text-xs leading-snug text-slate-400">
              {t("chatProject.deleteConfirm")}
            </span>
            {/* Güvenli seçenek önde ve odakta: onay belirdiği anda basılan
                Enter projeyi silmiyor, onaydan vazgeçiyor. */}
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)} autoFocus>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={onDelete}>
              {t("chatProject.deleteYes")}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)} className="mr-auto">
              <Trash2 size={14} />
              {t("chatProject.delete")}
            </Button>
            <ModalCancelButton />
            <Button variant="primary" onClick={save}>
              {t("common.save")}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={t("chatProject.nameLabel")}>
          <Input
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
          />
        </Field>

        <Field label={t("chatProject.instructionsLabel")} hint={t("chatProject.instructionsHint")}>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            // Aynı gerekçe: talimat diskte 8000 karakterde kesiliyor.
            maxLength={8000}
            spellCheck={false}
            placeholder={t("chatProject.instructionsPlaceholder")}
            className="chat-scroll min-h-[180px] resize-y font-mono"
          />
        </Field>

        {/* İki yönerge mekanizmasının karıştırılması en olası yanlış anlama:
            kullanıcı buraya "her cevabı Türkçe yaz" yazıp terminalde neden
            geçerli olmadığını sorabilir. */}
        <p className="text-2xs text-slate-500">{t("chatProject.folderNote")}</p>
      </div>
    </Modal>
  );
}
