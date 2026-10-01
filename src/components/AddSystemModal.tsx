import { useEffect, useId, useState } from "react";
import { ServerCog, Cloud, Loader2, CheckCircle2 } from "lucide-react";
import type { ManualSystemType } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

export interface EditingManualSystem {
  id: string;
  name: string;
  systemId: string;
  type: ManualSystemType;
  host: string | null;
  diagPort: number | null;
  adtUrl: string | null;
}

// Kutunun açılıştaki değerleri. Hem alanları doldurmak hem de "kaydedilmemiş
// değişiklik var mı" ölçmek için TEK kaynak — ikisi ayrı yazılsaydı biri
// değiştiğinde öbürü unutulur, kutu hiç dokunulmamışken "atılsın mı?" sorardı.
function initialValues(editing: EditingManualSystem | null | undefined) {
  return {
    type: editing?.type ?? ("onprem" as ManualSystemType),
    name: editing?.name ?? "",
    systemId: editing?.systemId ?? "",
    host: editing?.host ?? "",
    diagPort: editing?.diagPort ? String(editing.diagPort) : "3200",
    adtUrl: editing?.adtUrl ?? ""
  };
}

interface Props {
  open: boolean;
  editing?: EditingManualSystem | null;
  onClose: () => void;
  onAdded: (id: string | null) => void;
}

const TYPE_BUTTON =
  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm transition";

export default function AddSystemModal({ open, editing, onClose, onAdded }: Props) {
  const t = useT();
  const formId = useId();
  const [type, setType] = useState<ManualSystemType>("onprem");
  const [name, setName] = useState("");
  const [systemId, setSystemId] = useState("");
  const [host, setHost] = useState("");
  const [diagPort, setDiagPort] = useState("3200");
  const [adtUrl, setAdtUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(editing);

  useEffect(() => {
    if (!open) return;
    const init = initialValues(editing);
    setType(init.type);
    setName(init.name);
    setSystemId(init.systemId);
    setHost(init.host);
    setDiagPort(init.diagPort);
    setAdtUrl(init.adtUrl);
    setError(null);
  }, [open, editing?.id]);

  if (!open) return null;

  const reset = () => {
    setType("onprem");
    setName("");
    setSystemId("");
    setHost("");
    setDiagPort("3200");
    setAdtUrl("");
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Kaydedilmemiş değişiklik. `Modal` her kapatma isteğinde (Escape, X, İptal)
  // buna bakıp önce soruyor — yazılmış bir host/ADT adresi tek tuşla sessizce
  // gitmiyor. Başarılı kayıttan sonraki kapanış bu kapıdan GEÇMİYOR
  // (`handleClose` doğrudan): kaydedilmiş bir şey "atılamaz".
  const init = initialValues(editing);
  const dirty =
    type !== init.type ||
    name !== init.name ||
    systemId !== init.systemId ||
    host !== init.host ||
    diagPort !== init.diagPort ||
    adtUrl !== init.adtUrl;

  // DIAG portu: boş bırakılabilir ama yazıldıysa geçerli bir port olmalı.
  // Eskiden `Number("abc")` → NaN → JSON'a `null` olarak yazılıyordu; kullanıcı
  // yanlış yazdığını hiç öğrenmiyor, sistem sadece sessizce "erişilemiyor"
  // oluyordu.
  const diagPortTrimmed = diagPort.trim();
  const diagPortValid =
    diagPortTrimmed.length === 0 ||
    (/^\d+$/.test(diagPortTrimmed) && Number(diagPortTrimmed) >= 1 && Number(diagPortTrimmed) <= 65535);

  const canSubmit =
    name.trim().length > 0 &&
    systemId.trim().length > 0 &&
    (type === "onprem" ? host.trim().length > 0 && diagPortValid : adtUrl.trim().length > 0) &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        systemId: systemId.trim(),
        type,
        host: type === "onprem" ? host.trim() : null,
        diagPort: type === "onprem" && diagPortTrimmed ? Number(diagPortTrimmed) : null,
        // ADT URL artık on-prem'de de gönderiliyor. Eskiden `type === "cloud"`
        // koşuluna bağlıydı; bu, ADT adresi bilinen bir on-prem sistemi
        // (çoğu S/4'te `https://host:44300`) elle girmeyi imkânsız kılıyor ve
        // kullanıcıyı port keşfine mahkûm ediyordu. Daha kötüsü: cloud olarak
        // eklenmiş bir sistemi on-prem'e çevirmek kayıtlı URL'i SESSİZCE
        // siliyordu. Boşsa yine null gider, davranış değişmez.
        adtUrl: adtUrl.trim() || null
      };
      let resultId: string | null = null;
      if (editing) {
        const updated = await window.api.updateManualSystem(editing.id, input);
        resultId = updated?.id ?? null;
      } else {
        const created = await window.api.addManualSystem(input);
        resultId = created.id;
      }
      onAdded(resultId);
      handleClose();
    } catch (err) {
      // Electron, main'den fırlayan hatayı "Error invoking remote method
      // 'x': Error: ..." diye sarıyor. Kullanıcıya gösterilen tek şey bu
      // kutu olduğu için sarmalayıcıyı soyup gerçek mesajı bırakıyoruz.
      const raw = (err as Error).message;
      setError(raw.replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, ""));
    } finally {
      setSaving(false);
    }
  };

  const typeClass = (value: ManualSystemType) =>
    `${TYPE_BUTTON} ${
      type === value ? "border-accent-500 bg-accent-500/15 text-white" : "border-line-strong text-slate-400 hover:bg-active"
    }`;

  return (
    <Modal
      open
      onClose={handleClose}
      dirty={dirty}
      // Kayıt sürerken kapanmıyor: ana süreç hata döndürürse mesajı bu
      // pencere gösteriyor, yarım kalmış bir kayıt için "atılsın mı?" da
      // sorulmuyor.
      closeDisabled={saving}
      title={isEditing ? t("addSystemModal.editTitle") : t("addSystemModal.addTitle")}
      size="md"
      footer={
        <>
          <ModalCancelButton />
          <Button type="submit" form={formId} variant="primary" disabled={!canSubmit}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {isEditing ? t("addSystemModal.update") : t("addSystemModal.add")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={type === "onprem"}
            onClick={() => setType("onprem")}
            className={typeClass("onprem")}
          >
            <ServerCog size={16} />
            {t("addSystemModal.onprem")}
          </button>
          <button
            type="button"
            aria-pressed={type === "cloud"}
            onClick={() => setType("cloud")}
            className={typeClass("cloud")}
          >
            <Cloud size={16} />
            {t("addSystemModal.cloud")}
          </button>
        </div>

        <Field label={t("addSystemModal.displayName")}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("addSystemModal.displayNamePlaceholder")}
            autoFocus
          />
        </Field>

        <Field label={t("addSystemModal.systemId")}>
          <Input
            value={systemId}
            onChange={(e) => setSystemId(e.target.value.toUpperCase())}
            placeholder={t("addSystemModal.systemIdPlaceholder")}
            maxLength={8}
            className="uppercase"
          />
        </Field>

        {type === "onprem" ? (
          <>
            <Field label={t("addSystemModal.host")}>
              <Input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder={t("addSystemModal.hostPlaceholder")}
              />
            </Field>
            <Field
              label={t("addSystemModal.diagPort")}
              hint={t("addSystemModal.diagHelper")}
              error={diagPortValid ? undefined : t("addSystemModal.diagPortInvalid")}
            >
              <Input
                value={diagPort}
                onChange={(e) => setDiagPort(e.target.value)}
                placeholder={t("addSystemModal.diagPortPlaceholder")}
                inputMode="numeric"
              />
            </Field>
            <Field label={t("addSystemModal.adtUrlOnprem")} hint={t("addSystemModal.adtUrlOnpremHelper")}>
              <Input
                value={adtUrl}
                onChange={(e) => setAdtUrl(e.target.value)}
                placeholder={t("addSystemModal.adtUrlOnpremPlaceholder")}
              />
            </Field>
          </>
        ) : (
          <Field label={t("addSystemModal.adtUrl")} hint={t("addSystemModal.adtUrlHelper")}>
            <Input
              value={adtUrl}
              onChange={(e) => setAdtUrl(e.target.value)}
              placeholder={t("addSystemModal.adtUrlPlaceholder")}
            />
          </Field>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs text-[var(--status-danger-text)]"
          >
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
