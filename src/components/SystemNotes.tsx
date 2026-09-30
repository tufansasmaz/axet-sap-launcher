import { Check, Circle, Loader2 } from "lucide-react";
import type { SystemCommentState } from "./useSystemComment";
import { btn, PANEL_TITLE, tintBtn } from "../ui/buttons";
import { useT } from "../i18n";

export default function SystemNotes({ note }: { note: SystemCommentState }) {
  const t = useT();
  const { comment, setComment, commentSource, commentLoading, commentSaving, commentSaved, isDirty, save, textareaRef } =
    note;

  return (
    <section className="flex flex-col gap-2">
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
      <div className="rounded-lg border border-line bg-card focus-within:border-line-strong">
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          disabled={commentLoading}
          aria-label={t("systemPanel.commentLabel")}
          placeholder={commentLoading ? "" : t("systemPanel.commentPlaceholder")}
          className="block w-full resize-none border-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500/70 focus:ring-0 disabled:opacity-60"
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
            {commentSaved && !isDirty && (
              <span className="animate-alert-slide-in flex items-center gap-1 text-2xs text-[var(--status-success-text)]">
                <Check size={12} />
                {t("systemPanel.commentSaved")}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
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
