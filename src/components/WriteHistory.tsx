import { useEffect, useState } from "react";
import type { WriteOp, WriteHistoryResult } from "../../app-electron/shared/sapWriteHistory";
import type { SapService } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

// "SAP'ye yazılanlar" (spec 2026-10-16 sap-yazma-gecmisi). Müşteri ya da
// denetçi "yapay zekâ neyi değiştirdi, kim onayladı?" diye sorduğunda cevap
// burada. Kayıt sistemin proje klasöründe; bağlı olmak gerekmiyor. Seçim
// değişince bir kez okunur, yoklama yok. Kayıt boşsa bölüm hiç yok: modül
// danışmanı (yazamaz) ve hiç yazılmamış sistem boş başlık görmesin.

const VISIBLE = 10;

type Tone = "success" | "danger" | "warning" | "neutral";

// Lime yalnız seçim içindir; durum renkleri durum değişkenlerinden.
const DOT: Record<Tone, string> = {
  success: "bg-[var(--status-success-text)]",
  danger: "bg-[var(--status-danger-text)]",
  warning: "bg-[var(--status-warning-text)]",
  neutral: "bg-slate-500"
};

const WARNING_APPROVALS = new Set(["reddedildi", "sure_doldu", "engellendi", "kalite_reddi", "bilinmiyor"]);
// Onay verilmiş ama SAP sonucu kayıtta yok: yazma olmuş da olabilir, olmamış da.
const GRANTED = new Set(["onaylandi", "oturum", "ust_onay", "teslim"]);

/** Tek kelimelik durum: SAP sonucu varsa o, yoksa onay. */
export function opStatus(op: WriteOp): { key: TranslationKey; tone: Tone } {
  if (op.result === "basarili") return { key: "writeHistory.status.basarili", tone: "success" };
  if (op.result === "hata") return { key: "writeHistory.status.hata", tone: "danger" };
  if (op.result === "etkin_degil") return { key: "writeHistory.status.etkin_degil", tone: "warning" };
  if (GRANTED.has(op.approval)) return { key: "writeHistory.status.approvedNoResult", tone: "neutral" };
  return {
    key: `writeHistory.status.${op.approval}` as TranslationKey,
    tone: WARNING_APPROVALS.has(op.approval) ? "warning" : "neutral"
  };
}

function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function objectsShort(op: WriteOp): string {
  if (op.nesneler.length === 0) return "—";
  const rest = op.nesneler.length - 1;
  return rest > 0 ? `${op.nesneler[0].ad} +${rest}` : op.nesneler[0].ad;
}

const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;

/** Onaylanan transport; SAP başkasına kaydettiyse ikisi. */
function transportLabel(op: WriteOp): string {
  if (op.sapTransport && op.transport && op.sapTransport !== op.transport) return `${op.transport} → ${op.sapTransport}`;
  return op.transport ?? op.sapTransport ?? "—";
}

export default function WriteHistory({ path, service }: { path: string[]; service: SapService }) {
  const t = useT();
  const [history, setHistory] = useState<WriteHistoryResult | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pathKey = path.join("\u0000");

  useEffect(() => {
    setHistory(null);
    setShowAll(false);
    setOpenKey(null);
    setNotice(null);
    let disposed = false;
    window.api.getWriteHistory(path, service).then(
      (next) => {
        if (!disposed) setHistory(next);
      },
      () => {
        if (!disposed) setHistory({ ok: false, reason: "okunamadi" });
      }
    );
    return () => {
      disposed = true;
    };
  }, [service.uuid, pathKey]);

  if (!history) return null;
  if (history.ok && history.ops.length === 0) return null;

  const exportCsv = async () => {
    setNotice(null);
    const r = await window.api.exportWriteHistoryCsv(path, service).catch((err: unknown) => ({
      ok: false as const,
      message: (err as Error).message
    }));
    if (r.ok) setNotice(t("writeHistory.saved", { file: baseName(r.path) }));
    else if (!("canceled" in r && r.canceled)) setNotice(t("writeHistory.saveFailed", { message: r.message ?? "" }));
  };

  const ops = history.ok ? history.ops : [];
  const shown = showAll ? ops : ops.slice(0, VISIBLE);

  return (
    <div className="flex flex-col gap-2 border-t border-line-subtle pt-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-medium text-slate-300">{t("writeHistory.heading", { n: ops.length })}</h4>
        {history.ok && (
          <button
            type="button"
            onClick={() => void exportCsv()}
            className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-hover hover:text-slate-200"
          >
            {t("writeHistory.export")}
          </button>
        )}
      </div>
      {notice && <p className="text-xs text-slate-400">{notice}</p>}
      {!history.ok ? (
        <p className="text-xs text-slate-400">{t("writeHistory.unreadable")}</p>
      ) : (
        <>
          {history.truncated && <p className="text-xs text-slate-500">{t("writeHistory.truncated")}</p>}
          {history.skipped > 0 && (
            <p className="text-xs text-slate-500">{t("writeHistory.skipped", { n: history.skipped })}</p>
          )}
          <ul className="flex flex-col">
            {shown.map((op) => {
              const status = opStatus(op);
              const open = openKey === op.key;
              return (
                <li key={op.key} className="-mb-px border-b border-line-subtle">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenKey(open ? null : op.key)}
                    className="flex min-h-8 w-full min-w-0 items-center gap-3 py-1.5 text-left text-xs hover:bg-hover/40"
                  >
                    <span className="w-20 shrink-0 tabular-nums text-slate-500">{shortTime(op.zaman)}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-slate-200">{objectsShort(op)}</span>
                    <span className="w-28 shrink-0 truncate font-mono text-slate-400" title={transportLabel(op)}>
                      {transportLabel(op)}
                    </span>
                    <span className="flex w-28 shrink-0 items-center gap-2 text-slate-200">
                      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[status.tone]}`} />
                      <span className="truncate">{t(status.key)}</span>
                    </span>
                  </button>
                  {open && (
                    <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 pb-2 pl-[5.75rem] text-xs">
                      <dt className="text-slate-500">{t("writeHistory.user")}</dt>
                      <dd className="text-slate-200">{op.kullanici ?? "—"}</dd>
                      <dt className="text-slate-500">{t("writeHistory.client")}</dt>
                      <dd className="text-slate-200">{op.client ?? "—"}</dd>
                      <dt className="text-slate-500">{t("writeHistory.mode")}</dt>
                      <dd className="text-slate-200">{op.mod ?? "—"}</dd>
                      <dt className="text-slate-500">{t("writeHistory.tool")}</dt>
                      <dd className="font-mono text-slate-200">{op.arac ?? "—"}</dd>
                      <dt className="text-slate-500">{t("writeHistory.package")}</dt>
                      <dd className="font-mono text-slate-200">{op.paket ?? "—"}</dd>
                      <dt className="text-slate-500">{t("writeHistory.objects")}</dt>
                      <dd className="break-words font-mono text-slate-200">
                        {op.nesneler.length ? op.nesneler.map((o) => (o.tip ? `${o.ad} (${o.tip})` : o.ad)).join(", ") : "—"}
                      </dd>
                      <dt className="text-slate-500">{t("writeHistory.approvalLabel")}</dt>
                      <dd className="text-slate-200">{t(`writeHistory.status.${op.approval}` as TranslationKey)}</dd>
                      {op.sapMessage && (
                        <>
                          <dt className="text-slate-500">{t("writeHistory.message")}</dt>
                          <dd className="whitespace-pre-wrap break-words text-slate-200">{op.sapMessage}</dd>
                        </>
                      )}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
          {!showAll && ops.length > VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="self-start rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-hover hover:text-slate-200"
            >
              {t("writeHistory.showAll", { n: ops.length })}
            </button>
          )}
        </>
      )}
    </div>
  );
}
