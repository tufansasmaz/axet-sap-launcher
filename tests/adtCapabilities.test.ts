// "Ajan bu sistemde" öbeği (2026-10-16): satırlar 8787'nin kendi araç
// listesinden kuruluyor, etiketten ya da rolden tahmin edilmiyor.
import { describe, expect, it } from "vitest";
import { capabilitiesFromTools } from "../app-electron/shared/adtCapabilities";

const READONLY_21 = [
  "adt_get_source",
  "adt_search",
  "adt_where_used",
  "adt_syntax_check",
  "adt_atc_check",
  "adt_sql",
  "adt_dumps"
];
const GATED = [...READONLY_21, "adt_push", "adt_activate", "axet_teslim"];

const byId = (rows: ReturnType<typeof capabilitiesFromTools>) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe("capabilitiesFromTools", () => {
  it("salt okunur yüzey: okuma ✓, yazma ✗ (rol), çalıştırma yok", () => {
    const rows = byId(capabilitiesFromTools(READONLY_21, { role: "module-consultant", tier: "DEV" }));
    expect(rows.read).toEqual({ id: "read", state: "yes", reason: null });
    expect(rows.tables.state).toBe("yes");
    expect(rows.dumps.state).toBe("yes");
    expect(rows.checks.state).toBe("yes");
    expect(rows.write).toEqual({ id: "write", state: "no", reason: "role" });
    expect(rows.run).toEqual({ id: "run", state: "no", reason: "notInEngine" });
  });

  it("teknik danışman QA'da: yazma ✗ çünkü sistem DEV değil", () => {
    const rows = byId(capabilitiesFromTools(READONLY_21, { role: "technical-consultant", tier: "QA" }));
    expect(rows.write).toEqual({ id: "write", state: "no", reason: "tier" });
  });

  it("onaylı yazma sunucusu: yazma onaylı", () => {
    const rows = byId(capabilitiesFromTools(GATED, { role: "technical-consultant", tier: "DEV" }));
    expect(rows.write).toEqual({ id: "write", state: "approval", reason: null });
  });

  it("eski 19 araçlı sunucu: tablo ve dump ✗, nedeni yok (bilinmiyor)", () => {
    const rows = byId(capabilitiesFromTools(["adt_get_source", "adt_syntax_check"], { role: null, tier: null }));
    expect(rows.tables).toEqual({ id: "tables", state: "no", reason: null });
    expect(rows.dumps.state).toBe("no");
    expect(rows.write).toEqual({ id: "write", state: "no", reason: null });
  });

  it("sıra sabit", () => {
    expect(capabilitiesFromTools([], { role: null, tier: null }).map((r) => r.id)).toEqual([
      "read",
      "tables",
      "dumps",
      "checks",
      "write",
      "run"
    ]);
  });
});
