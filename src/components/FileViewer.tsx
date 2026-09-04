import { useEffect, useRef, useState } from "react";
import { FileWarning, FolderOpen, ExternalLink, Pencil, Save } from "lucide-react";
import { useT } from "../i18n";

interface Props {
  path: string;
  name: string;
  /**
   * Metin dosyalarında "Düzenle" düğmesini açar (kullanıcı isteği: ajanın
   * yazdığı dosyayı *"direkt göreyim müdahale edeyim"*). SAP Launcher
   * ekranındaki önizlemede KAPALI — orası bilinçli olarak salt okunur.
   * Kırpılmış (truncated) dosyalarda düzenleme yine kapalı: ekrandaki metni
   * kaydetmek dosyanın geri kalanını SİLERDİ.
   */
  editable?: boolean;
  /**
   * Dosya diskte değiştiğinde artan bir sayaç. Değişince içerik yeniden
   * okunuyor — ajan aynı dosyayı tekrar yazdığında ekranda eski hâli
   * kalmasın. Düzenleme kipinde YOK SAYILIYOR: kullanıcının yazdıklarının
   * üzerine gelen bir tazeleme, kaybedilen emek demek.
   */
  reloadToken?: number;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "text"; content: string; truncated: boolean }
  | { kind: "docx"; html: string }
  | { kind: "image"; dataUrl: string }
  | { kind: "unsupported" }
  | { kind: "error"; message: string };

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".ico"]);
// Uygulama içinde asla render edilmeye çalışılmayacak, doğrudan "harici aç"
// önerilecek uzantılar (pdf gibi ikili formatlar için Chromium <embed>
// desteği ortama göre değişken davranabiliyor — güvenli taraf: yönlendir).
const UNSUPPORTED_EXTENSIONS = new Set([".pdf", ".xlsx", ".xls", ".pptx", ".zip", ".exe"]);

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

export default function FileViewer({ path, name, editable = false, reloadToken = 0 }: Props) {
  const t = useT();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  // `null` = okuma kipi. Doluysa düzenleme kipindeyiz ve taslak burada.
  const [editDraft, setEditDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Düzenlerken gelen disk tazelemelerini yok saymak için: effect'in
  // bağımlılığı olmadan okunması gerekiyor.
  const editingRef = useRef(false);
  editingRef.current = editDraft !== null;

  // Dosya değişince düzenleme kipinden çıkılıyor — başka bir dosyayı açıp
  // öncekinin taslağını taşımak sessiz bir veri kaybı olurdu.
  useEffect(() => {
    setEditDraft(null);
    setSaveError(null);
  }, [path]);

  useEffect(() => {
    if (editingRef.current) return;
    let cancelled = false;
    setState({ kind: "loading" });
    const ext = extOf(name);

    const load = async () => {
      if (ext === ".docx") {
        const result = await window.api.readDocxFile(path);
        if (cancelled) return;
        setState(
          result.ok
            ? { kind: "docx", html: result.html ?? "" }
            : { kind: "error", message: result.error ?? t("fileViewer.docxReadError") }
        );
        return;
      }
      if (IMAGE_EXTENSIONS.has(ext)) {
        const result = await window.api.readImageDataUrl(path);
        if (cancelled) return;
        setState(
          result.ok
            ? { kind: "image", dataUrl: result.dataUrl ?? "" }
            : { kind: "error", message: result.error ?? t("fileViewer.imageReadError") }
        );
        return;
      }
      if (UNSUPPORTED_EXTENSIONS.has(ext)) {
        setState({ kind: "unsupported" });
        return;
      }
      // Bilinmeyen/özel uzantılı dosyalar (.conn_adt, .gitignore gibi nokta ile
      // başlayanlar dahil) da metin olarak denenir — gerçekten ikiliyse
      // readTextFile kendisi "binary içerik" hatasıyla döner, biz de
      // "unsupported" görünümüne düşeriz.
      const result = await window.api.readTextFile(path);
      if (cancelled) return;
      if (result.ok) {
        setState({ kind: "text", content: result.content ?? "", truncated: Boolean(result.truncated) });
      } else {
        setState({ kind: "unsupported" });
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [path, name, reloadToken]);

  const handleSave = async () => {
    if (editDraft === null) return;
    setSaving(true);
    setSaveError(null);
    const result = await window.api.writeTextFile(path, editDraft);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error ?? t("fileViewer.saveError"));
      return;
    }
    // Ekranda görünen metin artık diskteki metin — yeniden okumaya gerek yok
    // ve okumak, izleyicinin tetiklediği tazelemeyle yarışırdı.
    setState({ kind: "text", content: editDraft, truncated: false });
    setEditDraft(null);
  };

  if (state.kind === "loading") {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">{t("common.loading")}</div>;
  }

  if (state.kind === "error" || state.kind === "unsupported") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-slate-500">
        <FileWarning size={32} className="opacity-50" />
        <p className="max-w-sm text-sm">{state.kind === "error" ? state.message : t("fileViewer.unsupported")}</p>
        <div className="flex gap-2">
          <button
            onClick={() => window.api.openExternal(path)}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-base-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-base-700"
          >
            <ExternalLink size={13} /> {t("fileViewer.openExternal")}
          </button>
          <button
            onClick={() => window.api.openInExplorer(path)}
            className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-base-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-base-700"
          >
            <FolderOpen size={13} /> {t("fileViewer.showInFolder")}
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "image") {
    return (
      <div className="flex h-full items-center justify-center overflow-auto p-6">
        <img src={state.dataUrl} alt={name} className="max-h-full max-w-full rounded-sm " />
      </div>
    );
  }

  if (state.kind === "docx") {
    return (
      // DOCX önizlemesi bilinçli olarak bir "kâğıt sayfası" taklit ediyor, bu
      // yüzden renkleri TEMADAN BAĞIMSIZ ve literal. Daha önce `bg-white` +
      // `text-slate-900` yazıyordu; `bg-white` uygulamanın `white` token'ına
      // (`--ink-strong-rgb`) bağlı olduğu için AÇIK temada zemin koyuya
      // (41 39 36) dönüyor, `text-slate-900` ise tanımsız olduğu için
      // Tailwind'in kendi koyu #0f172a'sını alıyordu — yani açık temada
      // koyu üstüne koyu, okunamayan bir sayfa.
      <div className="h-full overflow-y-auto bg-[#ffffff] px-10 py-8">
        <div className="mx-auto max-w-3xl text-[#1a1a1a] [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_table]:border-collapse [&_td]:border [&_td]:border-[#d4d4d4] [&_td]:p-1.5 [&_th]:border [&_th]:border-[#d4d4d4] [&_th]:p-1.5">
          <div dangerouslySetInnerHTML={{ __html: state.html }} />
        </div>
      </div>
    );
  }

  // Kırpılmış dosya düzenlenemez: ekranda dosyanın yalnızca ilk 2MB'ı var,
  // onu kaydetmek geri kalanını silmek olurdu (bkz. fsExplorer MAX_TEXT_BYTES).
  const canEdit = editable && !state.truncated;
  const isEditing = editDraft !== null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {state.truncated && (
        <div
          className="shrink-0 px-4 py-2 text-xs"
          style={{
            backgroundColor: "var(--status-warning-bg)",
            color: "var(--status-warning-text)",
            borderBottom: "1px solid var(--status-warning-border)"
          }}
        >
          {t("fileViewer.truncated")}
        </div>
      )}
      {canEdit && (
        <div className="flex shrink-0 items-center gap-2 border-b border-base-800 px-3 py-1.5">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex cursor-pointer items-center gap-1.5 rounded-sm bg-accent-500/20 px-2.5 py-1 text-[11px] font-medium text-accent-400 transition hover:bg-accent-500/30 disabled:cursor-default disabled:opacity-50"
              >
                <Save size={12} /> {saving ? t("common.loading") : t("fileViewer.save")}
              </button>
              <button
                onClick={() => {
                  setEditDraft(null);
                  setSaveError(null);
                }}
                className="cursor-pointer rounded-sm px-2.5 py-1 text-[11px] text-slate-400 transition hover:bg-base-800 hover:text-slate-200"
              >
                {t("common.cancel")}
              </button>
              {saveError && <span className="truncate text-[11px] text-[var(--status-danger-text)]">{saveError}</span>}
            </>
          ) : (
            <button
              onClick={() => setEditDraft(state.kind === "text" ? state.content : "")}
              className="flex cursor-pointer items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] text-slate-400 transition hover:bg-base-800 hover:text-slate-200"
            >
              <Pencil size={12} /> {t("fileViewer.edit")}
            </button>
          )}
        </div>
      )}
      {isEditing ? (
        <textarea
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          spellCheck={false}
          // Ctrl+S: bir metin düzenleyicide beklenen şey, ve tarayıcının
          // "sayfayı kaydet" davranışı bastırılmalı.
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
              e.preventDefault();
              handleSave();
            }
          }}
          className="min-h-0 flex-1 resize-none bg-base-950 p-4 font-mono text-xs text-slate-200 outline-none"
        />
      ) : (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs text-slate-200">
          {state.content}
        </pre>
      )}
    </div>
  );
}
