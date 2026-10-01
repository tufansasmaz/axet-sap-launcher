import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileDiff } from "lucide-react";
import type { AxetChatActivity } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { StepDetail } from "./ChatToolRun";

// Bir cevabın DEĞİŞTİRDİĞİ dosyalar, dosya başına toplanmış hâlde.
//
// Araç dökümü (`ChatToolRun`) zaten her düzenlemeyi gösteriyor, ama adım adım
// ve okumalarla, komutlarla karışık: "ajan bu turda neyi değiştirdi?" sorusunun
// cevabı için 20 satırlık dökümü açıp düzenlemeleri tek tek bulmak gerekiyordu.
// Bu liste o sorunun kendisi. Yeni veri yok: fark, araç girdisinden zaten
// üretilip `steps` ile diske yazılıyor (bkz. axetChatTui.ts `buildDiff`).

const EDIT_TOOLS = new Set(["edit", "multiedit", "write"]);

export interface EditedFile {
  path: string;
  added: number;
  removed: number;
  /** Bu dosyaya dokunan her adımın farkı, sırayla. */
  diffs: string[];
}

/**
 * Fark metnindeki eklenen/silinen satır sayısı.
 *
 * Fark metni gerçek bir satır farkı DEĞİL: `edit` girdisindeki eski bloğu `-`,
 * yeni bloğu `+` ile olduğu gibi yazıyor. İki blokta aynen duran satır
 * değişmemiş demek; düz sayılsa tek satırlık bir düzeltme "+12 −12" diye
 * görünürdü. Bu yüzden aynı içerikli bir `-` ile bir `+` birbirini götürüyor.
 * Kırpılmış farkın sonundaki `…` satırı sayılmıyor.
 */
export function countChanges(diff: string): { added: number; removed: number } {
  const removedLines = new Map<string, number>();
  const addedLines: string[] = [];
  for (const line of diff.split("\n")) {
    if (line.startsWith("-")) {
      const text = line.slice(1);
      removedLines.set(text, (removedLines.get(text) ?? 0) + 1);
    } else if (line.startsWith("+")) {
      addedLines.push(line.slice(1));
    }
  }
  let added = 0;
  for (const text of addedLines) {
    const left = removedLines.get(text) ?? 0;
    if (left > 0) removedLines.set(text, left - 1);
    else added++;
  }
  let removed = 0;
  for (const count of removedLines.values()) removed += count;
  return { added, removed };
}

/**
 * Adımlardan değişen dosyalar; sıra, dosyanın İLK görüldüğü sıra.
 *
 * Hatalı adım dışarıda: araç patladıysa değişiklik diske yazılmadı, listede
 * görünmesi yanlış bilgi olurdu. Farkı olmayan adım da dışarıda — gösterecek
 * bir şeyi yok.
 */
export function summarizeEditedFiles(steps: AxetChatActivity[]): EditedFile[] {
  const files = new Map<string, EditedFile>();
  for (const step of steps) {
    if (!EDIT_TOOLS.has(step.tool ?? "") || step.failed || !step.diff || !step.target) continue;
    const { added, removed } = countChanges(step.diff);
    const entry = files.get(step.target);
    if (entry) {
      entry.added += added;
      entry.removed += removed;
      entry.diffs.push(step.diff);
    } else {
      files.set(step.target, { path: step.target, added, removed, diffs: [step.diff] });
    }
  }
  return Array.from(files.values());
}

/** Yolu ad ve klasör olarak ayırır; iki ayraç türü de (Windows yolları geliyor). */
function splitPath(path: string): { name: string; dir: string } {
  const cut = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return cut < 0 ? { name: path, dir: "" } : { name: path.slice(cut + 1), dir: path.slice(0, cut) };
}

function Counts({ added, removed }: { added: number; removed: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 font-mono tabular-nums">
      {added > 0 && <span className="text-[var(--status-success-text)]">+{added}</span>}
      {removed > 0 && <span className="text-[var(--status-danger-text)]">−{removed}</span>}
    </span>
  );
}

export default function ChatEditedFiles({ steps }: { steps: AxetChatActivity[] }) {
  const t = useT();
  const files = useMemo(() => summarizeEditedFiles(steps), [steps]);
  // Küme: iki dosyanın farkını yan yana görmek isteniyor (`ChatToolRun` ile aynı).
  const [openFiles, setOpenFiles] = useState<Set<string>>(() => new Set());
  if (files.length === 0) return null;

  const toggle = (path: string) =>
    setOpenFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  const added = files.reduce((sum, f) => sum + f.added, 0);
  const removed = files.reduce((sum, f) => sum + f.removed, 0);

  return (
    <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-line-subtle text-2xs">
      <div className="flex items-center gap-1.5 border-b border-line-subtle px-3 py-1.5 text-slate-400">
        <FileDiff size={12} className="shrink-0" />
        <span>{t("chatEditedFiles.count", { count: String(files.length) })}</span>
        <Counts added={added} removed={removed} />
      </div>
      {files.map((file) => {
        const { name, dir } = splitPath(file.path);
        const open = openFiles.has(file.path);
        return (
          <div key={file.path} className="min-w-0 border-b border-line-subtle last:border-b-0">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggle(file.path)}
              title={file.path}
              className="flex w-full min-w-0 cursor-pointer items-center gap-1.5 px-3 py-1.5 text-left transition hover:bg-hover"
            >
              {open ? (
                <ChevronDown size={12} className="shrink-0 text-slate-500" />
              ) : (
                <ChevronRight size={12} className="shrink-0 text-slate-500" />
              )}
              <span className="shrink-0 font-mono text-slate-300">{name}</span>
              {dir && <span className="truncate font-mono text-slate-600">{dir}</span>}
              <span className="ml-auto pl-2">
                <Counts added={file.added} removed={file.removed} />
              </span>
            </button>
            {/* Aynı dosyaya birden fazla düzenleme: farklar sırayla, aralarında
                `⋯` ile — hangi parçanın hangi adımdan geldiği belli olsun. */}
            {open && (
              <div className="px-3 pb-2">
                <StepDetail diff={file.diffs.join("\n⋯\n")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
