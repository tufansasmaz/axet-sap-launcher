import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

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
  // Açılıştaki içerik — "kaydedilmemiş değişiklik var mı" bununla ölçülüyor.
  const [initialText, setInitialText] = useState("");
  // Dosya VAR ama okunamadı (izin, kilit, OneDrive'da inmemiş dosya…). Bu
  // durumda kutu boş açılıp Kaydet'e izin verseydi, `save` oluşturma izniyle
  // yazdığı için var olan dosyanın üstüne BOŞ metin giderdi — 2026-09-28'e
  // kadar tam olarak böyleydi. Artık metin kutusu hiç çizilmiyor, Kaydet kapalı.
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    if (!cwd) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setReadError(null);
    const open = (content: string) => {
      setText(content);
      setInitialText(content);
    };
    // Dosya YOKSA hata değil: yönergesi olmayan bir klasör normal durum, kutu
    // boş açılıyor ve kaydedince dosya oluşturuluyor (bkz. `save`, allowCreate).
    // "Yok" YALNIZCA ENOENT demek; başka her başarısızlık okuma hatası.
    window.api
      .readTextFile(joinPath(cwd, FILE_NAME))
      .then((res) => {
        if (!alive) return;
        if (res.ok) {
          open(res.content ?? "");
        } else if (res.code === "ENOENT") {
          open("");
        } else {
          open("");
          setReadError(res.error ?? t("common.unknownError"));
        }
        setTruncated(res.ok && res.truncated === true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        open("");
        setReadError(err instanceof Error ? err.message : String(err));
        setTruncated(false);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cwd]);

  if (!cwd) return null;

  // Kaydedilmemiş değişiklik. `Modal` her kapatma isteğinde (Escape — metin
  // kutusunun İÇİNDEYKEN de —, X, İptal) buna bakıp önce "Değişiklikleri at?"
  // diye soruyor. Yüklenirken ya da dosya okunamamışken sorulacak bir şey yok.
  const dirty = !loading && !readError && text !== initialText;

  const save = async () => {
    if (readError || truncated) return;
    setSaving(true);
    setError(null);
    // Üçüncü argüman OLMAZSA OLMAZ: `writeTextFile` varsayılan olarak var olmayan
    // bir dosyaya yazmayı reddediyor (ENOENT) ve bir klasörün İLK yönergesi tanım
    // gereği henüz yok — yani izinsiz hâli tam da en sık durumda patlıyordu.
    // Kayıt sürerken pencere kilitli (`closeDisabled`); istek hata fırlatırsa
    // kilit kalkmazsa pencere Escape, X ve İptal'e kapalı kalırdı.
    let res: { ok: boolean; error?: string };
    try {
      res = await window.api.writeTextFile(joinPath(cwd, FILE_NAME), text, true);
    } catch (err) {
      res = { ok: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      setSaving(false);
    }
    if (!res.ok) {
      setError(res.error ?? t("common.unknownError"));
      return;
    }
    onSaved(cwd);
    // Kaydedilmiş bir şey "atılamaz": onay kapısından geçmeden kapanıyor.
    onClose();
  };

  const filePath = joinPath(cwd, FILE_NAME);

  return (
    <Modal
      open
      onClose={onClose}
      dirty={dirty}
      // Yazma sürerken kapanmıyor: yazma başarısız olursa hata bu pencerede
      // gösteriliyor, yarım kalmış bir kayıt için "atılsın mı?" da sorulmuyor.
      closeDisabled={saving}
      title={t("chatInstructions.title")}
      subtitle={t("chatInstructions.description")}
      icon={<BookOpen size={18} />}
      width={620}
      footer={
        <>
          <ModalCancelButton />
          <Button
            variant="primary"
            onClick={() => void save()}
            disabled={loading || saving || truncated || readError !== null}
            title={truncated ? t("chatInstructions.tooLarge") : undefined}
          >
            {saving ? t("chatInstructions.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      <p className="mb-3 truncate font-mono text-2xs text-slate-500" title={filePath}>
        {filePath}
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : readError !== null ? (
        <div className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3 text-xs leading-relaxed text-[var(--status-danger-text)]">
          {t("chatInstructions.readFailed", { error: readError })}
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          spellCheck={false}
          aria-label={t("chatInstructions.title")}
          placeholder={t("chatInstructions.placeholder")}
          className="chat-scroll min-h-[240px] resize-y font-mono"
        />
      )}

      {/* Yeniden başlatma uyarısı ÖLÇÜLMÜŞ bir davranışa dayanıyor: bağlam
          dosyaları süreç açılışında okunuyor, çalışan bir oturuma sonradan
          yazılan AGENTS.md'yi o oturum GÖRMÜYOR (2026-09-05 ölçümü: aynı
          süreçte ZZQ7 yok, yeni süreçte var). Bu yüzden kaydettikten sonra
          etkilenen sohbetlerin oturumları bırakılıyor. */}
      <p className="mt-3 text-2xs text-slate-500">
        {truncated ? t("chatInstructions.tooLarge") : t("chatInstructions.restartNote")}
      </p>
      {error && <p className="mt-2 text-xs text-[var(--status-danger-text)]">{error}</p>}
    </Modal>
  );
}
