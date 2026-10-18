// Kalıcı bellek düzenleyicisinin ortak mantığı ve gövdesi (spec 2026-10-18
// ajan-bellegi §4, §5, §7; ajanlar-ux §5). Hem bellek penceresi (MemoryDialog)
// hem Bellek görünümü (MemoryView) bunu kullanıyor. Ana sürece yalnız
// (alan, bölme) kimliği gidiyor. Kaydetme iyimser eşzamanlılıkla: ana süreç
// diskteki dosyayı okunduğu andaki özetle karşılaştırıyor; ajan bu arada
// yazdıysa hiçbir şey ezilmiyor ve kullanıcının metni yerinde kalıyor (yalnız
// açıkça "Yeniden yükle"ye basılınca gidiyor).
//
// Taslak deposu: kirli hâlde sökülürse (bölme kapandı, başka ajan seçildi,
// ekrandan çıkıldı) metin ve özet modül düzeyi Map'te tutulur. Aynı bölme
// için düzenleyici yeniden açılınca taslak geri getirilir. Kaydet
// başarısında, "At"ta ya da "Yeniden yükle"de silinir.
import { useEffect, useRef, useState } from "react";
import { FolderOpen, Loader2, RotateCw } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { MemoryFailure, MemoryNotice, MemoryWriteResult } from "../../app-electron/shared/memoryLogic";
import { Textarea } from "../ui/Field";
import { TOOL_BUTTON } from "../ui/buttons";

const draftStore = new Map<string, { text: string; stamp: string }>();
const dKey = (wId: string, pId: string) => `${wId}\0${pId}`;

/** Test yardımcısı: testler arası taslak kirliliğini engeller. */
export function clearDraftStoreForTest() {
  draftStore.clear();
}

/** Bu bölmenin saklı taslağı var mı (Bellek görünümündeki ajan listesi için). */
export function hasMemoryDraft(workspaceId: string, paneId: string): boolean {
  return draftStore.has(dKey(workspaceId, paneId));
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

export interface MemoryEditor {
  loaded: Loaded;
  text: string;
  setText: (value: string) => void;
  dirty: boolean;
  editable: boolean;
  saving: boolean;
  conflict: boolean;
  failure: MemoryFailure | null;
  draftRestored: boolean;
  renotified: boolean;
  renotifyFailed: boolean;
  rel: string | undefined;
  notice: MemoryNotice | undefined;
  /** true: kaydedildi. */
  save: () => Promise<boolean>;
  reload: () => void;
  /** Kaydedilmemiş değişiklikleri atar: metin diskteki hâline döner, taslak silinir. */
  discard: () => void;
  /** Kullanıcının kendi kapatışı: sökülünce taslak saklanmaz. */
  markDiscarded: () => void;
  renotify: () => Promise<void>;
  reveal: () => void;
}

export function useMemoryEditor(workspaceId: string, paneId: string): MemoryEditor {
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [text, setTextState] = useState("");
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

  // Kaydetme kilidi: çift tıklamayı yapısal olarak engeller.
  const savingRef = useRef(false);
  // Kullanıcının kendi kapatışı: taslak saklanmaz.
  const discardedRef = useRef(false);

  // Söküm (ya da başka bölmeye geçiş): kirliyse taslağı depoya yaz; temizse sil.
  useEffect(() => {
    const dk = dKey(workspaceId, paneId);
    discardedRef.current = false;
    return () => {
      if (discardedRef.current) {
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
  }, [workspaceId, paneId]);

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
            setTextState(draft.text);
            setLoaded({ kind: "ready", rel: res.rel, stamp: draft.stamp, notice: res.notice });
            setDraftRestored(true);
          } else {
            draftStore.delete(dk);
            setTextState(res.content);
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

  const reload = () => {
    draftStore.delete(dKey(workspaceId, paneId));
    setFailure(null);
    setDraftRestored(false);
    setRenotifyFailed(false);
    setLoadSeq((n) => n + 1);
  };

  const save = async (): Promise<boolean> => {
    if (savingRef.current || loaded.kind !== "ready" || conflict) return false;
    savingRef.current = true;
    setSaving(true);
    setFailure(null);
    let res: MemoryWriteResult;
    const sent = text;
    try {
      res = await window.api.memoryWrite(workspaceId, paneId, sent, loaded.stamp);
    } catch {
      res = { ok: false, reason: "writeFailed" };
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    if (!res.ok) {
      setFailure(res.reason);
      return false;
    }
    draftStore.delete(dKey(workspaceId, paneId));
    // Düzenleyici açık kalırsa (Bellek görünümü) kaydedilen metin yeni taban.
    initialRef.current = sent;
    setInitial(sent);
    setDraftRestored(false);
    setLoaded({ kind: "ready", rel: loaded.rel, stamp: res.stamp, notice: loaded.notice });
    return true;
  };

  const discard = () => {
    draftStore.delete(dKey(workspaceId, paneId));
    setTextState(initialRef.current);
    setDraftRestored(false);
    if (failure === "changed") reload();
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

  return {
    loaded,
    text,
    setText: setTextState,
    dirty: editable && text !== initial,
    editable,
    saving,
    conflict,
    failure,
    draftRestored,
    renotified,
    renotifyFailed,
    rel: loaded.kind === "loading" ? undefined : loaded.rel,
    notice: loaded.kind === "loading" ? undefined : loaded.notice,
    save,
    reload,
    discard,
    markDiscarded: () => {
      discardedRef.current = true;
    },
    renotify,
    reveal
  };
}

/** Düzenleyicinin gövdesi: yol, taslak notu, metin alanı ya da engel, uyarılar. */
export function MemoryEditorBody({ editor, label, autoFocus = true }: { editor: MemoryEditor; label: string; autoFocus?: boolean }) {
  const t = useT();
  const { loaded, rel, notice, conflict, failure } = editor;
  // Kaydetmede tooLarge: kullanıcının metni çok uzun — farklı mesaj.
  const writeFailKey = (f: MemoryFailure): TranslationKey => (f === "tooLarge" ? "memory.fail.textTooLarge" : FAIL_KEY[f]);

  return (
    <>
      {rel && (
        <p className="mb-3 truncate font-mono text-2xs text-slate-500" title={rel}>
          {rel}
        </p>
      )}

      {editor.draftRestored && <p className="mb-2 text-2xs text-[var(--status-warning-text)]">{t("memory.draftRestored")}</p>}

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
            <button type="button" onClick={editor.reveal} className={TOOL_BUTTON}>
              <FolderOpen size={12} />
              {t("memory.reveal")}
            </button>
          )}
          {loaded.reason === "noMemory" && (
            <button type="button" onClick={editor.reload} className={TOOL_BUTTON}>
              <RotateCw size={12} />
              {t("memory.reload")}
            </button>
          )}
        </div>
      ) : (
        <Textarea
          value={editor.text}
          onChange={(e) => editor.setText(e.target.value)}
          autoFocus={autoFocus}
          spellCheck={false}
          aria-label={label}
          className="chat-scroll min-h-[280px] flex-1 resize-y font-mono"
        />
      )}

      {conflict && (
        <div role="alert" className="mt-3 flex items-start gap-2 text-xs text-[var(--status-warning-text)]">
          <span className="min-w-0 flex-1">{t("memory.fail.changed")}</span>
          <button type="button" onClick={editor.reload} className={TOOL_BUTTON}>
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
            {editor.renotified ? t("memory.renotified") : editor.renotifyFailed ? t("memory.renotifyFailed") : t("memory.noticeFailed")}
          </span>
          {!editor.renotified && (
            <button type="button" onClick={() => void editor.renotify()} className={TOOL_BUTTON}>
              {t("memory.renotify")}
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-2xs text-slate-500">{t("memory.secretNote")}</p>
    </>
  );
}
