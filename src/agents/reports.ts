// Raporlar ekranının SAF derlemesi (2026-10-19). Yeni veri yok: biten ve
// başarısız alt görevler panodan (reportRows), süre/adımlar/son cevap kalıcı
// Akış geçmişinden, değişiklik özeti Değişiklikler kaydından. Bir kaynakta
// karşılığı yoksa alan boş kalıyor (null / []), uydurulmuyor.
import type { AppLanguage } from "../../app-electron/shared/types";
import type { Board } from "../../app-electron/shared/boardTypes";
import type { Checkpoint } from "../../app-electron/shared/changesTypes";
import type { TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { reportRows, type ReportRow } from "../board/boardDisplay";
import { latestForSubtask } from "../changes/changesFormat";
import type { FlowEvent } from "./flowEvents";
import { flowBody } from "./flowText";

/** Doğrulama olayı kanıttan biraz sonra düşebiliyor (yoklama aralığı). */
const SLACK_MS = 10_000;

export interface Report extends ReportRow {
  key: string;
  paneId: string | null;
  /** Ajan adı (bölme kapandıysa Akış'taki adı); atanmamışsa boş. */
  agent: string;
  startedAt: number | null;
  durationMs: number | null;
  /** Ajanın son cevap özeti (yalnız kesin kaynaklı motorlar). */
  reply: string | null;
  /** Bu işe ait Akış olayları, eskiden yeniye. */
  steps: FlowEvent[];
  checkpoint: Checkpoint | null;
}

export function buildReports(
  board: Board | null | undefined,
  events: readonly FlowEvent[],
  checkpoints: readonly Checkpoint[],
  nameOf: (paneId: string | null) => string
): Report[] {
  return reportRows(board ?? undefined).map((row) => {
    const { task, subtask } = row;
    const paneId = subtask.paneId;
    const end = row.at > 0 ? row.at + SLACK_MS : 0;
    const assigned = end
      ? events.find((e) => e.kind === "assigned" && e.detail === subtask.title && (paneId === null || e.paneId === paneId) && e.at <= end)
      : undefined;
    const startedAt = assigned?.at ?? subtask.dispatchedAt ?? null;
    const durationMs = startedAt !== null && row.at > 0 && row.at >= startedAt ? row.at - startedAt : null;
    const steps =
      startedAt !== null && end
        ? events.filter(
            (e) =>
              e.at >= startedAt &&
              e.at <= end &&
              ((paneId !== null && e.paneId === paneId) || ((e.kind === "assigned" || e.kind === "verified" || e.kind === "failed") && e.detail === subtask.title))
          )
        : [];
    let reply: string | null = null;
    for (const e of steps) if (e.kind === "finished" && e.reply) reply = e.reply;
    const fromFlow = [...steps].reverse().find((e) => e.paneId === paneId && e.name)?.name ?? "";
    return {
      ...row,
      key: `${task.id}/${subtask.id}`,
      paneId,
      agent: nameOf(paneId) || fromFlow,
      startedAt,
      durationMs,
      reply,
      steps,
      checkpoint: latestForSubtask(checkpoints, subtask.id)
    };
  });
}

export type DateFilter = "all" | "today" | "7d" | "30d";
export const DATE_FILTERS: readonly DateFilter[] = ["all", "today", "7d", "30d"];

export function sinceOf(filter: DateFilter, now: number): number {
  if (filter === "all") return 0;
  if (filter === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return now - (filter === "7d" ? 7 : 30) * 24 * 3_600_000;
}

export interface ReportFilter {
  /** Bölme kimliği ya da (bölmesiz) ajan adı; boşsa hepsi. */
  agent: string;
  outcome: Report["outcome"] | "";
  since: number;
  query: string;
}

export const agentKey = (r: Pick<Report, "paneId" | "agent">) => r.paneId ?? r.agent;

/** Türkçe ve İngilizce aramada I/İ/ı/i aynı sayılsın. */
const fold = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/g, "i");

export function filterReports(list: readonly Report[], filter: ReportFilter): Report[] {
  const q = fold(filter.query.trim());
  return list.filter((r) => {
    if (filter.agent && agentKey(r) !== filter.agent) return false;
    if (filter.outcome && r.outcome !== filter.outcome) return false;
    if (filter.since > 0 && r.at < filter.since) return false;
    if (!q) return true;
    return [r.subtask.title, r.task.title, r.reply ?? "", r.agent].some((s) => fold(s).includes(q));
  });
}

export function durationText(ms: number | null, t: TranslateFn): string {
  if (ms === null) return "—";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return t("reports.durLess");
  if (min < 60) return t("reports.durMin", { m: min });
  return t("reports.durHour", { h: Math.floor(min / 60), m: min % 60 });
}

export const OUTCOME_KEY: Record<Report["outcome"], TranslationKey> = {
  verified: "board.reportVerified",
  manual: "board.reportManual",
  done: "board.reportDone",
  failed: "board.reportFailed"
};

/** Raporun "sonraki iş" önerileri — yalnız eldeki veriden. */
export function nextSteps(r: Report): TranslationKey[] {
  const out: TranslationKey[] = [];
  if (r.outcome === "failed") out.push("reports.nextFailed");
  else if (r.outcome !== "verified") out.push("reports.nextVerify");
  if (r.checkpoint?.reviewed === "pending") out.push("reports.nextReview");
  return out;
}

export function reportMarkdown(r: Report, t: TranslateFn, language: AppLanguage): string {
  const when = (at: number) => new Date(at).toLocaleString(language, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const hm = (at: number) => new Date(at).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });
  const lines: string[] = [`# ${r.subtask.title}`, ""];
  lines.push(`- **${t("reports.task")}:** ${r.task.title}`);
  lines.push(`- **${t("reports.agent")}:** ${r.agent || t("reports.unknownAgent")}`);
  lines.push(`- **${t("reports.outcome")}:** ${t(OUTCOME_KEY[r.outcome])}`);
  lines.push(`- **${t("reports.duration")}:** ${durationText(r.durationMs, t)}`);
  if (r.at > 0) lines.push(`- **${t("reports.date")}:** ${when(r.at)}`);
  lines.push("", `## ${t("reports.summary")}`, "", r.reply ?? t("reports.noReply"));
  lines.push("", `## ${t("reports.verification")}`, "");
  const proof = r.subtask.proof;
  if (!proof) lines.push(t("reports.noProof"));
  else if (proof.kind === "manual") lines.push(t("reports.manualProof"));
  else for (const c of proof.commands) lines.push(`- \`${c.command}\` → ${c.timedOut ? "timeout" : c.error ?? c.exitCode}`);
  lines.push("", `## ${t("reports.steps")}`, "");
  if (r.steps.length === 0) lines.push(t("reports.noSteps"));
  else for (const e of r.steps) lines.push(`- ${hm(e.at)} ${e.name ? `${e.name}: ` : ""}${flowBody(e, t)}`);
  lines.push("", `## ${t("reports.changes")}`, "");
  const stats = r.checkpoint?.stats;
  lines.push(r.checkpoint ? (stats ? t("reports.changesStats", { files: stats.files, added: stats.added, deleted: stats.deleted }) : t("reports.changesOpen")) : t("reports.noChanges"));
  const next = nextSteps(r);
  if (next.length) {
    lines.push("", `## ${t("reports.next")}`, "");
    for (const key of next) lines.push(`- ${t(key)}`);
  }
  return lines.join("\n") + "\n";
}

export function reportsMarkdown(list: readonly Report[], t: TranslateFn, language: AppLanguage): string {
  return list.map((r) => reportMarkdown(r, t, language)).join("\n---\n\n");
}

/** Dışa aktarılan dosyanın önerilen adı (Windows'ta geçersiz karakterler atılmış). */
export function reportFileName(title: string): string {
  const base = title.replace(/[\\/:*?"<>|\x00-\x1f]/g, "").replace(/\s+/g, "-").slice(0, 60) || "rapor";
  return `${base}.md`;
}
