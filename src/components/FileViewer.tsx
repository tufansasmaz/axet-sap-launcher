import { useEffect, useState } from "react";
import { FileWarning, FolderOpen, ExternalLink } from "lucide-react";
import { useT } from "../i18n";

interface Props {
  path: string;
  name: string;
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

export default function FileViewer({ path, name }: Props) {
  const t = useT();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
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
  }, [path, name]);

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

  return (
    <div className="h-full overflow-auto">
      {state.truncated && (
        <div
          className="px-4 py-2 text-xs"
          style={{
            backgroundColor: "var(--status-warning-bg)",
            color: "var(--status-warning-text)",
            borderBottom: "1px solid var(--status-warning-border)"
          }}
        >
          {t("fileViewer.truncated")}
        </div>
      )}
      <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs text-slate-200">{state.content}</pre>
    </div>
  );
}
