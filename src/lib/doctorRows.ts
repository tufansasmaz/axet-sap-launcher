// Ortam teşhisi satırlarının sırası (Hazırlık düzeni, 2026-10-19): sorunlu
// olan önce görünsün diye önem sırasına diziliyor; aynı durumdakiler ölçümün
// kendi sırasını koruyor (python → paketler → … anlamlı bir sıra).
import type { DoctorRow, DoctorStatus } from "../../app-electron/shared/types";

const RANK: Record<DoctorStatus, number> = { fail: 0, warn: 1, unknown: 2, info: 3, ok: 4 };

export function sortDoctorRows(rows: readonly DoctorRow[]): DoctorRow[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => RANK[a.row.status] - RANK[b.row.status] || a.i - b.i)
    .map(({ row }) => row);
}

/** Kullanıcının bir şey yapması gereken satırlar: hata ve uyarı. */
export function doctorIssueCount(rows: readonly DoctorRow[]): number {
  return rows.filter((r) => r.status === "fail" || r.status === "warn").length;
}
