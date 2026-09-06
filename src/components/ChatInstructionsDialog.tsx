import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { useT } from "../i18n";
import { DIALOG_CANCEL_BUTTON, DIALOG_CONFIRM_BUTTON } from "../ui/buttons";

// Proje yönergeleri = çalışma klasöründeki `AGENTS.md`. Kendi icat ettiğimiz
// bir mekanizma DEĞİL: axet-code bu dosyayı kendi bağlam dosyası olarak
// okuyor. 2026-09-05'te ölçüldü — boş bir klasörde `AGENTS.md`'ye "her cevaba
// ZZQ7 ile başla" yazıldığında cevap `ZZQ7 4` geldi.
//
// Dosya adı neden `AGENTS.md`: axet-code'un "Initialize Project" komutunun
// varsayılanı bu (`--init` bayrağının açıklamasında `default=AGENTS.md`,
// alternatifler `AXET.md`/`CLAUDE.md`). Terminalde de aynı dosya okunuyor,
// yani buradan yazılan yönerge gömülü terminaldeki oturumlarda da geçerli.
//
// AYNI KLASÖRDEKİ TÜM SOHBETLER etkileniyor — bu dosya sohbete değil KLASÖRE
// ait. Sohbete özel yönerge ayrı bir iş (bizim prompt'a eklememiz gerekirdi ve
// her turda jeton yerdi); burada bilinçli olarak yapılmadı.

const FILE_NAME = "AGENTS.md";

// `path` çizici süreçte yok. Tek ihtiyaç bir dosya adı eklemek, ama sondaki
// ayraç iki kere yazılırsa (`C:\x\\AGENTS.md`) ana süreçteki izin kontrolü
// yolu farklı normalleştirebilir — o yüzden bir kez kırpılıyor.
function joinPath(dir: string, name: string): string {
  return `${dir.replace(/[\\/]+$/, "")}\\${name}`;
}

interface Props {
  /** Sohbetin çalışma klasörü. `null` ise diyalog çizilmiyor. */
  cwd: string | null;
  onClose: () => void;
  /** Kaydedildikten sonra: etkilenen sohbetlerin TUI oturumlarını bırak. */
  onSaved: (cwd: string) => void;
}

export default function ChatInstructionsDialog({ cwd, onClose, onSaved }: Props) {
  const t = useT();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `readTextFile` 2 MB'ın üstünü KESEREK okuyor. Bir yönerge dosyasının o
  // boyuta ulaşması gerçekçi değil, ama olsaydı kaydetmek dosyanın kalanını
  // sessizce silerdi — o yüzden kesilmiş içerik kaydedilemiyor.
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!cwd) return;
    let alive = true;
    setLoading(true);
    setError(null);
    // Dosya YOKSA hata değil: yönergesi olmayan bir klasör normal durum, kutu
    // boş açılıyor ve kaydedince dosya oluşturuluyor (bkz. `save`, allowCreate).
    window.api
      .readTextFile(joinPath(cwd, FILE_NAME))
      .then((res) => {
        if (!alive) return;
        setText(res.ok ? (res.content ?? "") : "");
        setTruncated(res.ok && res.truncated === true);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setText("");
        setTruncated(false);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cwd]);

  if (!cwd) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    // Üçüncü argüman OLMAZSA OLMAZ: `writeTextFile` varsayılan olarak var olmayan
    // bir dosyaya yazmayı reddediyor (ENOENT) ve bir klasörün İLK yönergesi tanım
    // gereği henüz yok — yani izinsiz hâli tam da en sık durumda patlıyordu.
    const res = await window.api.writeTextFile(joinPath(cwd, FILE_NAME), text, true);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? t("common.unknownError"));
      return;
    }
    onSaved(cwd);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--overlay-scrim)]"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-[620px] flex-col rounded-xl border border-base-700 bg-base-900 p-6">
        <div className="mb-1 flex items-center gap-2">
          <BookOpen size={18} className="text-accent-400" />
          <h3 className="text-base font-semibold text-white">{t("chatInstructions.title")}</h3>
        </div>
        <p className="mb-1 text-sm text-slate-400">{t("chatInstructions.description")}</p>
        <p className="mb-4 truncate font-mono text-[11px] text-slate-500" title={joinPath(cwd, FILE_NAME)}>
          {joinPath(cwd, FILE_NAME)}
        </p>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-500">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            spellCheck={false}
            placeholder={t("chatInstructions.placeholder")}
            className="chat-scroll min-h-[220px] flex-1 resize-none rounded-md border border-base-700 bg-base-950 p-3 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-accent-500/50"
          />
        )}

        {/* Yeniden başlatma uyarısı ÖLÇÜLMÜŞ bir davranışa dayanıyor: bağlam
            dosyaları süreç açılışında okunuyor, çalışan bir oturuma sonradan
            yazılan AGENTS.md'yi o oturum GÖRMÜYOR (2026-09-05 ölçümü: aynı
            süreçte ZZQ7 yok, yeni süreçte var). Bu yüzden kaydettikten sonra
            etkilenen sohbetlerin oturumları bırakılıyor. */}
        <p className="mt-3 text-[11px] text-slate-500">
          {truncated ? t("chatInstructions.tooLarge") : t("chatInstructions.restartNote")}
        </p>
        {error && <p className="mt-2 text-[12px] text-[var(--status-danger-text)]">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className={DIALOG_CANCEL_BUTTON}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={() => void save()}
            disabled={loading || saving || truncated}
            title={truncated ? t("chatInstructions.tooLarge") : undefined}
            className={DIALOG_CONFIRM_BUTTON}
          >
            {saving ? t("chatInstructions.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
