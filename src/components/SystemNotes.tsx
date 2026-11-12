import { useState } from "react";
import { Check, Circle, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { maskNoteSecrets } from "../lib/noteSecrets";
import type { SystemCommentState } from "./useSystemComment";
import { btn, PANEL_TITLE, tintBtn } from "../ui/buttons";
import { useT } from "../i18n";

export default function SystemNotes({ note, username = "" }: { note: SystemCommentState; username?: string }) {
  const t = useT();
  const { comment, setComment, commentSource, commentLoading, commentSaving, commentSaved, isDirty, save, textareaRef } =
    note;
  // Notta şifreye benzeyen içerik (bkz. noteSecrets.ts): gösterimde maskeli,
  // "Göster" ile açılıyor. Veri değişmiyor; kaydederken uyarı çıkıyor.
  const masked = maskNoteSecrets(comment, username);
  const hasSecrets = masked.count > 0;
  const [revealed, setRevealed] = useState(false);
  const [savedWithSecret, setSavedWithSecret] = useState(false);
  const showMasked = hasSecrets && !revealed;
  const saveNote = async () => {
    setSavedWithSecret(hasSecrets);
    await save();
  };

  return (
    <section className="flex flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className={PANEL_TITLE}>{t("systemPanel.commentLabel")}</h3>
        {isDirty && !commentSaving && (
          <span className="flex items-center gap-1 text-2xs text-[var(--status-warning-text)]">
            <Circle size={6} className="fill-current" />
            {t("systemPanel.commentUnsaved")}
          </span>
        )}
        {commentSource === "sapLogon" && !isDirty && (
          <span className="rounded-full border border-line-strong px-2 py-0.5 text-2xs text-slate-400">
            {t("systemPanel.commentFromSapLogon")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col rounded-lg border border-line bg-card focus-within:border-line-strong">
        {/* Yükseklik `useSystemComment`'te içeriğe göre 140–420px arası
            ayarlanıyor; `grow` kartın kalanını panelin altına kadar dolduruyor,
            `shrink-0` ayarlanan yüksekliğin altına inmesini engelliyor. */}
        {hasSecrets && (
          <div className="flex items-center justify-between gap-2 border-b border-line-subtle px-3 py-1.5 text-2xs text-[var(--status-warning-text)]">
            <span className="flex min-w-0 items-center gap-1.5">
              <ShieldAlert size={12} className="shrink-0" />
              <span className="truncate">{t("systemPanel.secretMasked", { count: masked.count })}</span>
            </span>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className={btn("neutral", "sm", "gap-1")}
            >
              {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
              {revealed ? t("systemPanel.secretHide") : t("systemPanel.secretShow")}
            </button>
          </div>
        )}
        {showMasked && (
          <div
            data-testid="system-note-masked"
            className="block w-full grow shrink-0 whitespace-pre-wrap break-words px-3 py-2.5 text-sm leading-relaxed text-slate-100"
            style={{ minHeight: 140 }}
          >
            {masked.text}
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={comment}
          hidden={showMasked}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void saveNote();
            }
          }}
          disabled={commentLoading}
          aria-label={t("systemPanel.commentLabel")}
          placeholder={commentLoading ? "" : t("systemPanel.commentPlaceholder")}
          className="block w-full grow shrink-0 resize-none border-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500/70 focus:ring-0 disabled:opacity-60"
          style={{ boxShadow: "none" }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-line-subtle px-3 py-2">
          <span className="flex items-center gap-1.5 text-2xs text-slate-500">
            {comment.length > 0 ? (
              t("systemPanel.commentChars", { count: comment.length })
            ) : (
              <>
                <kbd className="rounded border border-line-strong px-1 font-sans text-2xs text-slate-400">Ctrl</kbd>
                <span>+</span>
                <kbd className="rounded border border-line-strong px-1 font-sans text-2xs text-slate-400">Enter</kbd>
                <span className="ml-0.5">{t("systemPanel.commentHint")}</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            {commentSaved && !isDirty && savedWithSecret && hasSecrets && (
              <span role="alert" className="flex items-center gap-1 text-2xs text-[var(--status-warning-text)]">
                <ShieldAlert size={12} />
                {t("systemPanel.secretSavedWarning")}
              </span>
            )}
            {commentSaved && !isDirty && !(savedWithSecret && hasSecrets) && (
              <span className="animate-alert-slide-in flex items-center gap-1 text-2xs text-[var(--status-success-text)]">
                <Check size={12} />
                {t("systemPanel.commentSaved")}
              </span>
            )}
            <button
              type="button"
              onClick={() => void saveNote()}
              disabled={commentSaving || commentLoading || !isDirty}
              title={t("systemPanel.commentHint")}
              // Kaydedilmemiş not var: dolgulu değil soluk vurgu. Ekrandaki tek
              // birincil düğme başlıktaki "aXet'te Aç" (bkz. buttons.ts).
              className={
                isDirty && !commentSaving ? tintBtn("accent", "sm", "gap-1.5") : btn("neutral", "sm", "gap-1.5")
              }
            >
              {commentSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {t("systemPanel.commentSaving")}
                </>
              ) : (
                <>
                  <Check size={13} />
                  {t("common.save")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
