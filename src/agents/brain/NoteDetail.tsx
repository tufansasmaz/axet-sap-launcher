// Bellek notunun ayrıntı paneli (Tur 5): görüntüle ([[bağlantı]]lar
// tıklanır, geri bağlantılar), düzenle (başlık, tür, sahip, etiket, gövde),
// sil (satır içi onay). Kaydetme çakışması (ajan o arada yazdı) metni silmez.
import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { useT, type TranslateFn } from "../../i18n";
import type { TranslationKey } from "../../i18n/tr";
import {
  backlinks,
  extractLinks,
  findNote,
  NOTE_KINDS,
  normalizeTags,
  splitLinks,
  type MemoryNote,
  type NoteFailure,
  type NoteKind,
  type NoteResult
} from "../../../app-electron/shared/memoryNotes";
import { btn, GHOST_ICON_BUTTON, PRIMARY_BUTTON, TOOL_BUTTON } from "../../ui/buttons";
import { Input, Select, Textarea } from "../../ui/Field";
import { KIND_COLOR } from "./MemoryGraphView";
import { isLearnTaskId } from "../../../app-electron/shared/learnTasks";

export interface OwnerOption {
  id: string;
  name: string;
}

export interface NoteDraft {
  title: string;
  body: string;
  kind: NoteKind;
  tags: string;
  owner: string;
}

export function noteAge(at: number, now: number, t: TranslateFn): string {
  const min = Math.floor((now - at) / 60_000);
  if (min < 1) return t("brain.ageNow");
  if (min < 60) return t("brain.ageMin", { min });
  const hours = Math.floor(min / 60);
  if (hours < 24) return t("brain.ageHour", { hours });
  return new Date(at).toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

const LINK = "cursor-pointer rounded text-left text-[var(--accent-soft-text)] underline-offset-2 hover:underline";

export function KindChip({ kind }: { kind: NoteKind }) {
  const t = useT();
  return (
    <span className="inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border border-line px-2 text-2xs text-slate-300">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_COLOR[kind] }} aria-hidden />
      {t(`brain.kind.${kind}` as TranslationKey)}
    </span>
  );
}

export function NoteView({
  note,
  notes,
  ownerName,
  onOpen,
  onCreateLinked,
  onEdit,
  onDelete,
  onTag,
  onClose,
  learnTopic
}: {
  note: MemoryNote;
  notes: readonly MemoryNote[];
  ownerName: string;
  onOpen(id: string): void;
  onCreateLinked(title: string): void;
  onEdit(): void;
  onDelete(): Promise<boolean>;
  onTag(tag: string): void;
  onClose(): void;
  /** Öğrenme görevi kimliğinden konusu (görev listeden düştüyse undefined). */
  learnTopic?(ref: string): string | undefined;
}) {
  const t = useT();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setConfirm(false), [note.id]);
  const out = extractLinks(note.body)
    .map((l) => findNote(notes, l))
    .filter((n): n is MemoryNote => Boolean(n));
  const back = backlinks(notes, note);
  const learnRef = note.source?.type === "task" && isLearnTaskId(note.source.ref) ? note.source.ref : null;
  const topic = learnRef ? learnTopic?.(learnRef) : undefined;
  const source = learnRef
    ? topic
      ? t("learn.noteSource", { topic })
      : t("learn.noteSourceUnknown")
    : note.source
      ? note.source.name ?? t(`brain.source.${note.source.type}` as TranslationKey)
      : null;
  return (
    <article data-note-detail={note.id} aria-labelledby={`note-${note.id}`} className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <KindChip kind={note.kind} />
        <span className="min-w-0 truncate text-2xs text-slate-500">{ownerName}</span>
        <button type="button" className={`${GHOST_ICON_BUTTON} ml-auto`} aria-label={t("brain.close")} title={t("brain.close")} onClick={onClose}>
          <X size={14} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <h2 id={`note-${note.id}`} className="break-words text-base font-semibold text-slate-100">
          {note.title}
        </h2>
        <p className="mt-1 text-2xs text-slate-500">
          {noteAge(note.updated, Date.now(), t)}
          {source ? ` · ${t("brain.source", { name: source })}` : ""}
        </p>
        {note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <button key={tag} type="button" onClick={() => onTag(tag)} className="h-5 rounded-full bg-control px-2 text-2xs text-slate-300 hover:bg-hover">
                #{tag}
              </button>
            ))}
          </div>
        )}
        <div data-note-body="" className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-200">
          {splitLinks(note.body).map((part, i) => {
            if ("text" in part) return <span key={i}>{part.text}</span>;
            const target = findNote(notes, part.link);
            return target ? (
              <button key={i} type="button" className={LINK} onClick={() => onOpen(target.id)}>
                {part.label}
              </button>
            ) : (
              <button key={i} type="button" className={`${LINK} opacity-60`} title={t("brain.missingLink", { title: part.link })} onClick={() => onCreateLinked(part.link)}>
                {part.label}
              </button>
            );
          })}
        </div>
        <LinkList title={t("brain.links")} notes={out} onOpen={onOpen} empty={t("brain.noLinks")} />
        <LinkList title={t("brain.backlinks")} notes={back} onOpen={onOpen} empty={t("brain.noLinks")} />
      </div>
      <footer className="flex items-center gap-2 border-t border-line px-4 py-2.5">
        {confirm ? (
          <>
            <span className="min-w-0 flex-1 text-xs text-slate-300">{t("brain.deleteConfirm")}</span>
            <button type="button" className={TOOL_BUTTON} onClick={() => setConfirm(false)}>
              {t("brain.cancel")}
            </button>
            <button type="button" className={btn("danger", "sm")} onClick={() => void onDelete()}>
              {t("brain.delete")}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={TOOL_BUTTON} onClick={onEdit}>
              {t("brain.edit")}
            </button>
            <button type="button" className={`${TOOL_BUTTON} ml-auto`} onClick={() => setConfirm(true)}>
              {t("brain.delete")}
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

function LinkList({ title, notes, onOpen, empty }: { title: string; notes: MemoryNote[]; onOpen(id: string): void; empty: string }) {
  return (
    <section className="mt-4">
      <h3 className="text-2xs font-medium uppercase tracking-wide text-slate-500">
        {title} <span className="tabular-nums">{notes.length}</span>
      </h3>
      {notes.length === 0 ? (
        <p className="mt-1 text-2xs text-slate-600">{empty}</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {notes.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => onOpen(n.id)} className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-slate-300 hover:bg-hover">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[n.kind] }} aria-hidden />
                <span className="min-w-0 truncate">{n.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const FAIL_KEY: Record<NoteFailure, TranslationKey> = {
  invalid: "brain.fail.invalid",
  full: "brain.fail.full",
  tooLarge: "brain.fail.tooLarge",
  missing: "brain.fail.missing",
  changed: "brain.fail.changed",
  writeFailed: "brain.fail.writeFailed"
};

export function NoteEditor({
  initial,
  owners,
  heading,
  onSave,
  onCancel
}: {
  initial: NoteDraft;
  owners: readonly OwnerOption[];
  heading: string;
  onSave(draft: NoteDraft): Promise<NoteResult>;
  onCancel(): void;
}) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const set = <K extends keyof NoteDraft>(key: K, value: NoteDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const save = async () => {
    if (!draft.title.trim()) {
      setError("brain.fail.invalid");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave({ ...draft, tags: normalizeTags(draft.tags).join(", ") });
    setSaving(false);
    if (!result.ok) setError(FAIL_KEY[result.reason]);
  };
  return (
    <form
      data-note-editor=""
      aria-label={heading}
      className="flex h-full min-h-0 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void save();
        }
      }}
    >
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <h2 className="min-w-0 truncate text-sm font-semibold text-slate-100">{heading}</h2>
        <button type="button" className={`${GHOST_ICON_BUTTON} ml-auto`} aria-label={t("brain.close")} title={t("brain.close")} onClick={onCancel}>
          <X size={14} />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <label className="block text-2xs text-slate-400" htmlFor={`${id}-title`}>
          {t("brain.field.title")}
        </label>
        <Input id={`${id}-title`} value={draft.title} maxLength={120} autoFocus onChange={(e) => set("title", e.target.value)} className="-mt-2 h-9" />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-2xs text-slate-400" htmlFor={`${id}-kind`}>
              {t("brain.field.kind")}
            </label>
            <Select id={`${id}-kind`} value={draft.kind} onChange={(e) => set("kind", e.target.value as NoteKind)} className="mt-1 h-9">
              {NOTE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`brain.kind.${k}` as TranslationKey)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-2xs text-slate-400" htmlFor={`${id}-owner`}>
              {t("brain.field.owner")}
            </label>
            <Select id={`${id}-owner`} value={draft.owner} onChange={(e) => set("owner", e.target.value)} className="mt-1 h-9">
              <option value="">{t("brain.teamMemory")}</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <label className="block text-2xs text-slate-400" htmlFor={`${id}-tags`}>
          {t("brain.field.tags")}
        </label>
        <Input id={`${id}-tags`} value={draft.tags} onChange={(e) => set("tags", e.target.value)} className="-mt-2 h-9" />
        <label className="block text-2xs text-slate-400" htmlFor={`${id}-body`}>
          {t("brain.field.body")}
        </label>
        <Textarea id={`${id}-body`} value={draft.body} rows={12} onChange={(e) => set("body", e.target.value)} className="-mt-2 font-mono text-xs" aria-describedby={`${id}-hint`} />
        <p id={`${id}-hint`} className="-mt-1 text-2xs text-slate-500">
          {t("brain.bodyHint")}
        </p>
        {error && (
          <p role="alert" className="text-xs text-[var(--status-danger-text)]">
            {t(error)}
          </p>
        )}
      </div>
      <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-2.5">
        <button type="button" className={TOOL_BUTTON} onClick={onCancel}>
          {t("brain.cancel")}
        </button>
        <button type="submit" className={PRIMARY_BUTTON} disabled={saving}>
          {saving ? t("brain.saving") : t("brain.save")}
        </button>
      </footer>
    </form>
  );
}
