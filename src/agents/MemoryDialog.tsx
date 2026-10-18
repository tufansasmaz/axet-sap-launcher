import { useEffect, useRef, useState } from "react";
import { BookOpen, FolderOpen, Loader2, RotateCw } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { MemoryFailure, MemoryNotice, MemoryWriteResult } from "../../app-electron/shared/memoryLogic";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { TOOL_BUTTON } from "../ui/buttons";

// Bellek penceresi (spec 2026-10-18 ajan-bellegi §4, §5, §7); "Sohbet
// talimatları" penceresinin kalıbı. Ana sürece yalnız (alan, bölme) kimliği
// gidiyor. Kaydetme iyimser eşzamanlılıkla: ana süreç diskteki dosyayı
// okunduğu andaki özetle karşılaştırıyor; ajan bu arada yazdıysa hiçbir şey
// ezilmiyor ve kullanıcının metni pencerede kalıyor (yalnız açıkça
// "Yeniden yükle"ye basılınca gidiyor).
//
// Taslak deposu: kirli hâlde kapatılırsa (bölme kapandı, ajan belleği
// devre dışı bırakıldı, Ajanlar ekranından çıkıldı) metin ve özet
// modül düzeyi Map'te tutulur. Aynı bölme için pencere yeniden açılınca
// taslak geri getirilir. Kaydet başarısında ya da Yeniden yükle'yle
// silindi.

const draftStore = new Map<string, { text: string; stamp: string }>();
const dKey = (wId: string, pId: string) => `${wId}\0${pId}`;

/** Test yardımcısı: testler arası taslak kirliliğini engeller. */
export function clearDraftStoreForTest() {
  draftStore.clear();
}

const FAIL_KEY: Record<MemoryFailure, TranslationKey> = {
  invalid: "memory.fail.writeFailed",
  noMemory: "memory.fail.noMemory",
  noRoot: "memory.fail.noRoot",
  unsafe: "memory.fail.unsafe",
  tooLarge: "memory.fail.tooLarge",
  encoding: "memory.fail.encoding",
  readFailed: "memory.fail.readFailed",
  changed: "memory.fail.changed",
  writeFailed: "memory.fail.writeFailed"
};

type Loaded =
  | { kind: "loading" }
  | { kind: "ready"; rel: string; stamp: string; notice: MemoryNotice }
  | { kind: "blocked"; reason: MemoryFailure; rel?: string; notice?: MemoryNotice };

interface Props {
  workspaceId: string;
  paneId: string;
  name: string;
  onClose: () => void;
}

export default function MemoryDialog({ workspaceId, paneId, name, onClose }: Props) {
  const t = useT();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [text, setText] = useState("");
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<MemoryFailure | null>(null);
  const [renotified, setRenotified] = useState(false);
  const [renotifyFailed, setRenotifyFailed] = useState(false);
  const [loadSeq, setLoadSeq] = useState(0);
  const [draftRestored, setDraftRestored] = useState(false);

  // Ref'ler: unmount cleanup'ında güncel değerlere erişim için.
  const textRef = useRef(text);
  const initialRef = useRef(initial);
  const loadedRef = useRef(loaded);
  textRef.current = text;
  initialRef.current = initial;
  loadedRef.current = loaded;

  // Kaydetme kilidi: çift tıklamayı yapısal olarak engeller (Minor 1).
  const savingRef = useRef(false);
  // Başarılı kaydet işareti: unmount cleanup'ta taslak yaratılmasın.
  const savedRef = useRef(false);

  // Unmount: başarılı kaydet sonrasıysa temiz; kirli hâldeyse taslağı depoya yaz; temizse sil.
  useEffect(() => {
    const dk = dKey(workspaceId, paneId);
    return () => {
      if (savedRef.current) {
        draftStore.delete(dk);
        return;
      }
      const l = loadedRef.current;
      if (l.kind === "ready" && textRef.current !== initialRef.current) {
        draftStore.set(dk, { text: textRef.current, stamp: l.stamp });
      } else if (l.kind === "ready") {
        draftStore.delete(dk);
      }
      // blocked ya da loading: taslağa dokunma (sonraki açılış tekrar dener).
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Okuma: bölme kimliği veya loadSeq değişince.
  useEffect(() => {
    let alive = true;
    setLoaded({ kind: "loading" });
    const dk = dKey(workspaceId, paneId);
    window.api.memoryRead(workspaceId, paneId).then(
      (res) => {
        if (!alive) return;
        if (res.ok) {
          const draft = draftStore.get(dk);
          setInitial(res.content);
          setFailure(null);
          if (draft && draft.text !== res.content) {
            // Taslak var ve diskten farklı: eski özeti kullan, çakışma yolu çalışır.
            setText(draft.text);
            setLoaded({ kind: "ready", rel: res.rel, stamp: draft.stamp, notice: res.notice });
            setDraftRestored(true);
          } else {
            draftStore.delete(dk);
            setText(res.content);
            setLoaded({ kind: "ready", rel: res.rel, stamp: res.stamp, notice: res.notice });
            setDraftRestored(false);
          }
        } else {
          setLoaded({ kind: "blocked", reason: res.reason, rel: res.rel, notice: res.notice });
        }
      },
      () => {
        if (alive) setLoaded({ kind: "blocked", reason: "readFailed" });
      }
    );
    return () => {
      alive = false;
    };
  }, [workspaceId, paneId, loadSeq]);

  const editable = loaded.kind === "ready";
  const conflict = failure === "changed";
  const rel = loaded.kind === "loading" ? undefined : loaded.rel;
  const notice = loaded.kind === "loading" ? undefined : loaded.notice;

  const reload = () => {
    draftStore.delete(dKey(workspaceId, paneId));
    setFailure(null);
    setDraftRestored(false);
    setRenotifyFailed(false);
    setLoadSeq((n) => n + 1);
  };

  const save = async () => {
    if (savingRef.current || loaded.kind !== "ready" || conflict) return;
    savingRef.current = true;
    setSaving(true);
    setFailure(null);
    let res: MemoryWriteResult;
    try {
      res = await window.api.memoryWrite(workspaceId, paneId, text, loaded.stamp);
    } catch {
      res = { ok: false, reason: "writeFailed" };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    savedRef.current = true;
    draftStore.delete(dKey(workspaceId, paneId));
    onClose();
  };

  const renotify = async () => {
    const ok = await window.api.memoryRenotify(workspaceId, paneId).catch(() => false);
    if (ok) {
      setRenotified(true);
      setRenotifyFailed(false);
    } else {
      setRenotifyFailed(true);
    }
  };

  const reveal = () => {
    void window.api.memoryReveal(workspaceId, paneId).catch(() => false);
  };

  // Kaydetmede tooLarge: kullanıcının metni çok uzun — farklı mesaj.
  const writeFailKey = (f: MemoryFailure): TranslationKey =>
    f === "tooLarge" ? "memory.fail.textTooLarge" : FAIL_KEY[f];

  return (
    <Modal
      open
      onClose={onClose}
      dirty={editable && text !== initial}
      closeDisabled={saving}
      title={t("memory.title", { name })}
      subtitle={t("memory.description")}
      icon={<BookOpen size={18} />}
      size="lg"
      footer={
        <>
          <ModalCancelButton label={t("common.close")} />
          <Button variant="primary" onClick={() => void save()} disabled={!editable || saving || conflict}>
            {saving ? t("memory.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      {rel && (
        <p className="mb-3 truncate font-mono text-2xs text-slate-500" title={rel}>
          {rel}
        </p>
      )}

      {draftRestored && (
        <p className="mb-2 text-2xs text-[var(--status-warning-text)]">{t("memory.draftRestored")}</p>
      )}

      {loaded.kind === "loading" ? (
        <div className="flex h-40 items-center justify-center text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : loaded.kind === "blocked" ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3 text-xs leading-relaxed text-[var(--status-danger-text)]"
        >
          <span>{t(FAIL_KEY[loaded.reason])}</span>
          {(loaded.reason === "tooLarge" || loaded.reason === "encoding") && (
            <button type="button" onClick={reveal} className={TOOL_BUTTON}>
              <FolderOpen size={12} />
              {t("memory.reveal")}
            </button>
          )}
          {loaded.reason === "noMemory" && (
            <button type="button" onClick={reload} className={TOOL_BUTTON}>
              <RotateCw size={12} />
              {t("memory.reload")}
            </button>
          )}
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          spellCheck={false}
          aria-label={t("memory.title", { name })}
          className="chat-scroll min-h-[280px] resize-y font-mono"
        />
      )}

      {conflict && (
        <div role="alert" className="mt-3 flex items-start gap-2 text-xs text-[var(--status-warning-text)]">
          <span className="min-w-0 flex-1">{t("memory.fail.changed")}</span>
          <button type="button" onClick={reload} className={TOOL_BUTTON}>
            <RotateCw size={12} />
            {t("memory.reload")}
          </button>
        </div>
      )}
      {failure && !conflict && (
        <p role="alert" className="mt-2 text-xs text-[var(--status-danger-text)]">
          {t(writeFailKey(failure))}
        </p>
      )}

      {notice === "failed" && (
        <div className="mt-3 flex items-center gap-2 text-2xs text-[var(--status-warning-text)]">
          <span className="min-w-0 flex-1">
            {renotified
              ? t("memory.renotified")
              : renotifyFailed
                ? t("memory.renotifyFailed")
                : t("memory.noticeFailed")}
          </span>
          {!renotified && (
            <button type="button" onClick={() => void renotify()} className={TOOL_BUTTON}>
              {t("memory.renotify")}
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-2xs text-slate-500">{t("memory.secretNote")}</p>
    </Modal>
  );
}
