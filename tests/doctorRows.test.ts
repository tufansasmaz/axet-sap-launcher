// Ortam teşhisi: sorunlu satırlar üstte (Hazırlık düzeni, 2026-10-19).
import { describe, expect, it } from "vitest";
import { doctorIssueCount, sortDoctorRows } from "../src/lib/doctorRows";
import type { DoctorRow } from "../app-electron/shared/types";

const row = (id: DoctorRow["id"], status: DoctorRow["status"]): DoctorRow => ({ id, status, detail: "" });

describe("sortDoctorRows", () => {
  it("fail > warn > unknown > info > ok; aynı durumda özgün sıra", () => {
    const rows = [row("python", "ok"), row("packages", "fail"), row("adtServer", "info"), row("rfcBridge", "warn"), row("axetCode", "fail"), row("catalog", "unknown")];
    expect(sortDoctorRows(rows).map((r) => r.id)).toEqual(["packages", "axetCode", "rfcBridge", "catalog", "adtServer", "python"]);
  });
  it("girdiyi değiştirmez", () => {
    const rows = [row("python", "ok"), row("packages", "fail")];
    sortDoctorRows(rows);
    expect(rows[0].id).toBe("python");
  });
  it("sorun sayısı yalnız fail + warn", () => {
    expect(doctorIssueCount([row("python", "ok"), row("packages", "fail"), row("rfcBridge", "warn"), row("catalog", "unknown")])).toBe(2);
  });
});
