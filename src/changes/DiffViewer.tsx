// Birleşik diff (spec 2026-10-18 degisiklikler §5): satır numaralı; eklenen ve
// silinen satır mevcut durum tonlarıyla (yeni renk yok). İkili ve 200 KB üstü
// dosyada yalnız bir satır; kırpılmışsa not. memo: Canlı yoklaması (3 sn) sırasında
// diff prop'u değişmedikçe satırlar yeniden uzlaştırılmıyor.
import { memo } from "react";
import { useT } from "../i18n";
import type { DiffLine, FileDiff } from "../../app-electron/shared/changesTypes";

const ROW: Record<DiffLine["kind"], string> = {
  hunk: "text-slate-500",
  context: "text-slate-300",
  add: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  del: "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
};
const SIGN: Record<DiffLine["kind"], string> = { hunk: "", context: " ", add: "+", del: "-" };

function DiffViewer({ diff }: { diff: FileDiff }) {
  const t = useT();
  if (diff.kind === "binary") {
    return (
      <p data-diff-note="binary" className="p-3 text-xs text-slate-400">
        {t("changes.binaryChanged")}
      </p>
    );
  }
  if (diff.kind === "large") {
    return (
      <p data-diff-note="large" className="p-3 text-xs text-slate-400">
        {t("changes.largeChanged")}
      </p>
    );
  }
  return (
    <div role="table" aria-label={t("changes.diffLabel")} className="min-w-max font-mono text-2xs leading-5">
      <div role="row" className="sr-only">
        <span role="columnheader">{t("changes.diffColOld")}</span>
        <span role="columnheader">{t("changes.diffColNew")}</span>
        <span role="columnheader">{t("changes.diffColSign")}</span>
        <span role="columnheader">{t("changes.diffColText")}</span>
      </div>
      {diff.lines.map((line, i) => (
        <div key={i} role="row" data-line-kind={line.kind} className={`flex ${ROW[line.kind]}`}>
          <span role="cell" className="w-12 shrink-0 select-none pr-2 text-right tabular-nums text-slate-500">
            {line.oldNo ?? ""}
          </span>
          <span role="cell" className="w-12 shrink-0 select-none pr-2 text-right tabular-nums text-slate-500">
            {line.newNo ?? ""}
          </span>
          <span role="cell" className="w-4 shrink-0 select-none">
            {SIGN[line.kind]}
          </span>
          <span role="cell" className="whitespace-pre pr-3">
            {line.text}
          </span>
        </div>
      ))}
      {diff.truncated && (
        <p data-diff-note="truncated" role="note" className="px-3 py-2 text-xs text-[var(--status-warning-text)]">
          {t("changes.diffTruncated")}
        </p>
      )}
    </div>
  );
}

export default memo(DiffViewer);
