import { useEffect, useState } from "react";
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
  const [loadSeq, setLoadSeq] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoaded({ kind: "loading" });
    window.api.memoryRead(workspaceId, paneId).then(
      (res) => {
        if (!alive) return;
        if (res.ok) {
          setText(res.content);
          setInitial(res.content);
          setFailure(null);
          setLoaded({ kind: "ready", rel: res.rel, stamp: res.stamp, notice: res.notice });
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
    setFailure(null);
    setLoadSeq((n) => n + 1);
  };

  const save = async () => {
    if (loaded.kind !== "ready" || conflict) return;
    setSaving(true);
    setFailure(null);
    let res: MemoryWriteResult;
    try {
      res = await window.api.memoryWrite(workspaceId, paneId, text, loaded.stamp);
    } catch {
      res = { ok: false, reason: "writeFailed" };
    } finally {
      setSaving(false);
    }
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    onClose();
  };

  const renotify = async () => {
    const ok = await window.api.memoryRenotify(workspaceId, paneId).catch(() => false);
    setRenotified(ok);
  };

  const reveal = () => {
    void window.api.memoryReveal(workspaceId, paneId).catch(() => false);
  };

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
          {t(FAIL_KEY[failure])}
        </p>
      )}

      {notice === "failed" && (
        <div className="mt-3 flex items-center gap-2 text-2xs text-[var(--status-warning-text)]">
          <span className="min-w-0 flex-1">{renotified ? t("memory.renotified") : t("memory.noticeFailed")}</span>
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
