# SAP'ye yazılanlar — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Sistem panelinde seçili sistemin SAP yazma geçmişini işlem başına bir satırla göstermek ve CSV olarak dışa aktarmak.

**Mimari:**
- **Saf modül:** `app-electron/shared/sapWriteHistory.ts`. Var olan `sap-yazma-gunlugu.jsonl` satırlarını işlemlere çevirir (`buildWriteHistory`) ve CSV üretir (`toCsv`).
- **Ana süreç:** `app-electron/main/sapWrite/history.ts`. Dosyanın son 5 MB'ını okur, kaydetme penceresini açar ve iki IPC kanalını kaydeder.
- **Renderer:** `src/components/WriteHistory.tsx`. Detay kartında `AgentCapabilities`'in altında durur.

**Teknoloji:** Electron 44, React 18, TypeScript, vitest 2 + jsdom. Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-16-sap-yazma-gecmisi-design.md`

## Genel kurallar

- **Yazım ve commit:**
  - Kod yorumları tam Türkçe karakterle.
  - Commit mesajları ASCII Türkçe; sonunda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `git add` dosya dosya; dal `ozellik/ajan-yetenekleri`.
- **Düzenleme:**
  - prettier yok.
  - Satır sonu dosyanın kendi satır sonu.
  - Ters eğik çizgi içeren düzenlemede Edit aracı kullan; heredoc/sed ters eğik çizgiyi yutuyor.
- **Kayıt dosyası:**
  - Yalnız OKUNUR: silme ya da düzenleme yok.
  - Okunan en fazla son 5 MB; kesilirse yarım ilk satır atılır.
- **CSV:**
  - ayraç `;`;
  - UTF-8 BOM;
  - CRLF;
  - `=`, `+`, `-`, `@`, sekme ya da CR ile başlayan hücrenin başına `'`.
- **Arayüz:**
  - Yeni kart yok.
  - Satır düzeni `AgentCapabilities` ile aynı.
  - Lime yok.
  - Kayıt boşsa bölüm hiç çizilmez.
  - Sürekli yoklama yok.
- **Komutlar:** `npm run typecheck`, `npx vitest run <dosya>`; tam takım `npx vitest run`.

**Spec'ten sapma (bilinçli):** CSV sonucu genel bildirimle değil, bölümün başlığının altında tek satırla gösteriliyor ("Kaydedildi: …"). Sebep: `SystemPanel` App'in bildirim fonksiyonuna erişmiyor. Sırf bunun için prop zinciri kurmak, hiyerarşi ilkesine de ters.

## İnceleme odağı

1. **Eski kayıtta alan eksik:** `nesneler`, `transport` ya da kimlik yok. Satır yine çizilir, boş alan "—" olur, çökme yok. (Görev 1 testi)
2. **Aynı `id` için birden çok `karar`:** `bekliyor` tekrarı ya da `reddedildi`/`sure_doldu` yapışkan tekrarı gelir. Yine tek işlem çıkar. (Görev 1 testi)
3. **Sohbet ya da not içeriğinden `=SUM(...)` gibi bir nesne adı ya da mesaj gelir.** CSV'de formül çalışmaz. (Görev 2 testi)
4. **Proje klasörü hiç yok:** sisteme hiç bağlanılmamış. Hata değil, boş liste. (Görev 3 testi)
5. **Kayıt OneDrive kilidinde ya da okunamıyor.** Bölüm "Kayıt okunamadı" der, panel çökmez. (Görev 3 ve 4 testleri)

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `app-electron/shared/sapWriteHistory.ts` (yeni) | Tipler, `buildWriteHistory`, `toCsv` (Görev 1–2) |
| `app-electron/main/sapWrite/history.ts` (yeni) | Okuma, CSV kaydetme, IPC (Görev 3) |
| `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts`, `app-electron/main/i18n/tr.ts`, `en.ts` (değişir) | Kayıt, köprü, pencere başlığı (Görev 3) |
| `src/components/WriteHistory.tsx` (yeni) | Bölüm (Görev 4) |
| `src/components/SystemPanel.tsx`, `src/i18n/tr.ts`, `en.ts` (değişir) | Yerleşim ve metinler (Görev 4) |

---

### Görev 1: Satırları işlemlere çevirme

**Dosyalar:**
- Yeni: `app-electron/shared/sapWriteHistory.ts`
- Test: `tests/sapWriteHistory.test.ts`

**Arayüzler:**
- Üretir:

```ts
export type WriteApproval =
  | "onaylandi" | "oturum" | "ust_onay" | "teslim"
  | "reddedildi" | "sure_doldu" | "engellendi" | "kalite_reddi" | "yanitsiz";
export type WriteResult = "basarili" | "hata" | "yok";
export interface WriteOpObject { ad: string; tip: string }
export interface WriteOp {
  key: string;                 // id ya da "satir-<n>"
  zaman: string;               // ISO, işlemin ilk satırı
  kullanici: string | null;
  sid: string | null;
  client: string | null;
  mod: string | null;
  arac: string | null;
  transport: string | null;
  paket: string | null;
  nesneler: WriteOpObject[];
  approval: WriteApproval;
  result: WriteResult;
  sapMessage: string | null;
}
export function buildWriteHistory(lines: readonly string[]): { ops: WriteOp[]; skipped: number };
```

- [ ] **Adım 1: Kırmızı test** — `tests/sapWriteHistory.test.ts`

```ts
// SAP yazma kaydını işlemlere çevirme (spec 2026-10-16 sap-yazma-gecmisi §4).
import { describe, expect, it } from "vitest";
import { buildWriteHistory } from "../app-electron/shared/sapWriteHistory";

const ID = { sid: "D01", client: "100", kullanici: "TSASMAZ", mod: "dogrudan" };
const FACT = {
  arac: "adt_push",
  sinif: "TRANSPORT_ONAYLI",
  transport: "D01K900123",
  nesneler: [{ ad: "ZCL_A", tip: "CLAS", paket: "ZPKG", yeni: false }, { ad: "ZIF_B", tip: "INTF", paket: "ZPKG", yeni: true }]
};
const line = (o: Record<string, unknown>) => JSON.stringify(o);

describe("buildWriteHistory", () => {
  it("karar + cevap + sonuç tek işlem; sıra karışık olsa da", () => {
    const { ops, skipped } = buildWriteHistory([
      line({ zaman: "2026-10-16T11:00:05Z", tur: "sonuc", id: "a", arac: "adt_push", transport: "D01K900123", sap_sonucu: { success: true, activated: true }, ...ID }),
      line({ zaman: "2026-10-16T11:00:00Z", tur: "karar", id: "a", karar: "bekliyor", kaynak: null, ...FACT, ...ID }),
      line({ zaman: "2026-10-16T11:00:02Z", tur: "cevap", id: "a", secim: "bu_seferlik", ...FACT, ...ID })
    ]);
    expect(skipped).toBe(0);
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      key: "a",
      zaman: "2026-10-16T11:00:00Z",
      kullanici: "TSASMAZ",
      sid: "D01",
      client: "100",
      mod: "dogrudan",
      arac: "adt_push",
      transport: "D01K900123",
      paket: "ZPKG",
      approval: "onaylandi",
      result: "basarili",
      sapMessage: null
    });
    expect(ops[0].nesneler).toEqual([{ ad: "ZCL_A", tip: "CLAS" }, { ad: "ZIF_B", tip: "INTF" }]);
  });

  it("onay türleri: reddet, oturum, oturum izni, üst onay, teslim, süresi doldu, yanıtsız", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T10:00:00Z", tur: "karar", id: "r", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:00:01Z", tur: "cevap", id: "r", secim: "reddet", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:01:00Z", tur: "karar", id: "o", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:01:01Z", tur: "cevap", id: "o", secim: "oturum", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:02:00Z", tur: "karar", id: "oi", karar: "izinli", kaynak: "oturum_izni", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:03:00Z", tur: "karar", id: "u", karar: "izinli", kaynak: "ust_onay", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:04:00Z", tur: "karar", id: "t", karar: "izinli", kaynak: "teslim_izni", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:05:00Z", tur: "karar", id: "s", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:15:00Z", tur: "karar", id: "s", karar: "sure_doldu", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T10:20:00Z", tur: "karar", id: "y", karar: "bekliyor", ...FACT, ...ID })
    ]);
    const byKey = Object.fromEntries(ops.map((o) => [o.key, o.approval]));
    expect(byKey).toEqual({
      r: "reddedildi",
      o: "oturum",
      oi: "oturum",
      u: "ust_onay",
      t: "teslim",
      s: "sure_doldu",
      y: "yanitsiz"
    });
    for (const o of ops) expect(o.result).toBe("yok");
  });

  it("aynı id'nin karar tekrarları tek işlem (inceleme odağı 2)", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T09:00:00Z", tur: "karar", id: "x", karar: "bekliyor", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T09:00:30Z", tur: "cevap", id: "x", secim: "reddet", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T09:01:00Z", tur: "karar", id: "x", karar: "reddedildi", ...FACT, ...ID })
    ]);
    expect(ops).toHaveLength(1);
    expect(ops[0].approval).toBe("reddedildi");
  });

  it("kimliksiz karar ve kalite reddi ayrı işlemler; mod ve bağlantı uyuşmazlığı listelenmiyor", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T08:00:00Z", tur: "mod", ...ID }),
      line({ zaman: "2026-10-16T08:01:00Z", tur: "karar", id: null, karar: "yerel_mod", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T08:02:00Z", tur: "karar", id: null, karar: "mod_secilmedi", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T08:03:00Z", tur: "kalite_reddi", arac: "adt_push", nesneler: [{ ad: "ZCL_Q", tip: "CLAS" }], sebep: "ATC", ...ID }),
      line({ zaman: "2026-10-16T08:04:00Z", tur: "baglanti_uyusmazligi", ...ID })
    ]);
    expect(ops.map((o) => o.approval)).toEqual(["kalite_reddi", "engellendi", "engellendi"]);
    expect(new Set(ops.map((o) => o.key)).size).toBe(3);
    expect(ops[0].nesneler).toEqual([{ ad: "ZCL_Q", tip: "CLAS" }]);
  });

  it("SAP hatası: sonuç hata, mesaj taşınıyor", () => {
    const { ops } = buildWriteHistory([
      line({ zaman: "2026-10-16T07:00:00Z", tur: "karar", id: "h", karar: "izinli", kaynak: "oturum_izni", ...FACT, ...ID }),
      line({ zaman: "2026-10-16T07:00:09Z", tur: "sonuc", id: "h", sap_sonucu: { success: false, error: "Syntax error in line 12" }, ...ID })
    ]);
    expect(ops[0]).toMatchObject({ result: "hata", sapMessage: "Syntax error in line 12" });
  });

  it("bozuk satırlar sayılıyor; eksik alanlı eski kayıt çökmüyor (inceleme odağı 1); en yeni üstte", () => {
    const { ops, skipped } = buildWriteHistory([
      "bu json değil",
      "",
      line({ zaman: "2026-10-15T07:00:00Z" }),
      line({ zaman: "2026-10-15T08:00:00Z", tur: "karar", id: "eski", karar: "bekliyor" }),
      line({ zaman: "2026-10-16T08:00:00Z", tur: "karar", id: "yeni", karar: "izinli", kaynak: "ust_onay", ...FACT, ...ID })
    ]);
    expect(skipped).toBe(2);
    expect(ops.map((o) => o.key)).toEqual(["yeni", "eski"]);
    expect(ops[1]).toMatchObject({ kullanici: null, sid: null, transport: null, paket: null, nesneler: [], approval: "yanitsiz" });
  });
});
```

Boş satır ne bozuk ne işlem sayılır (sondaki satır sonu her dosyada var). JSON olmayan satır ve `tur`'u olmayan satır `skipped`'e girer.

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/sapWriteHistory.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Uygula** — `app-electron/shared/sapWriteHistory.ts`

```ts
// SAP yazma kaydını (`sap-yazma-gunlugu.jsonl`, bkz. main/sapWrite/log.ts)
// işlem başına bir satıra çeviren saf kod; hem ana süreç (CSV) hem renderer
// (tipler) kullanıyor. Spec: 2026-10-16 sap-yazma-gecmisi §4.
//
// Bir işlemin satırları `id` ile bağlı: ajanın isteği (`karar`), kullanıcının
// penceredeki seçimi (`cevap`), SAP'nin dönüşü (`sonuc`). Kimliksiz olanlar
// (yerel modda/mod seçilmeden engellenen istek, kalite reddi) tek başına bir
// işlem. Oturum olayları (`mod`, `baglanti_uyusmazligi`) işlem değil.

export type WriteApproval =
  | "onaylandi"
  | "oturum"
  | "ust_onay"
  | "teslim"
  | "reddedildi"
  | "sure_doldu"
  | "engellendi"
  | "kalite_reddi"
  | "yanitsiz";

export type WriteResult = "basarili" | "hata" | "yok";

export interface WriteOpObject {
  ad: string;
  tip: string;
}

export interface WriteOp {
  key: string;
  zaman: string;
  kullanici: string | null;
  sid: string | null;
  client: string | null;
  mod: string | null;
  arac: string | null;
  transport: string | null;
  paket: string | null;
  nesneler: WriteOpObject[];
  approval: WriteApproval;
  result: WriteResult;
  sapMessage: string | null;
}

type Row = Record<string, unknown>;

const OP_TYPES = new Set(["karar", "cevap", "sonuc", "kalite_reddi"]);
const MAX_MESSAGE = 500;

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

function objects(v: unknown): WriteOpObject[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((o): o is Row => typeof o === "object" && o !== null)
    .map((o) => ({ ad: str(o.ad) ?? "?", tip: str(o.tip) ?? "" }));
}

function packageOf(rows: Row[]): string | null {
  for (const r of rows) {
    const direct = str(r.paket);
    if (direct) return direct;
    if (Array.isArray(r.nesneler)) {
      for (const o of r.nesneler) {
        const p = typeof o === "object" && o !== null ? str((o as Row).paket) : null;
        if (p) return p;
      }
    }
  }
  return null;
}

/** İlk dolu değer: alanlar satırlar arasında eksik olabiliyor (eski kayıt, `sonuc`'ta nesne yok). */
function first(rows: Row[], key: string): string | null {
  for (const r of rows) {
    const v = str(r[key]);
    if (v) return v;
  }
  return null;
}

function approvalOf(rows: Row[]): WriteApproval {
  const answer = rows.find((r) => r.tur === "cevap");
  if (answer) {
    if (answer.secim === "reddet") return "reddedildi";
    if (answer.secim === "oturum") return "oturum";
    return "onaylandi";
  }
  if (rows.some((r) => r.tur === "kalite_reddi")) return "kalite_reddi";
  for (const r of rows) {
    if (r.tur !== "karar") continue;
    if (r.karar === "izinli") {
      if (r.kaynak === "oturum_izni") return "oturum";
      if (r.kaynak === "ust_onay") return "ust_onay";
      if (r.kaynak === "teslim_izni") return "teslim";
      return "onaylandi";
    }
    if (r.karar === "sure_doldu") return "sure_doldu";
    if (r.karar === "reddedildi") return "reddedildi";
    if (r.karar === "yerel_mod" || r.karar === "mod_secilmedi") return "engellendi";
  }
  return "yanitsiz";
}

function resultOf(rows: Row[]): { result: WriteResult; sapMessage: string | null } {
  const res = rows.find((r) => r.tur === "sonuc");
  if (!res) return { result: "yok", sapMessage: null };
  const sap = typeof res.sap_sonucu === "object" && res.sap_sonucu !== null ? (res.sap_sonucu as Row) : {};
  const ok = sap.ok === true || sap.success === true;
  const message = str(sap.message) ?? str(sap.error);
  return { result: ok ? "basarili" : "hata", sapMessage: message ? message.slice(0, MAX_MESSAGE) : null };
}

function toOp(key: string, rows: Row[]): WriteOp {
  const objs = rows.map((r) => objects(r.nesneler)).find((list) => list.length > 0) ?? [];
  return {
    key,
    zaman: first(rows, "zaman") ?? "",
    kullanici: first(rows, "kullanici"),
    sid: first(rows, "sid"),
    client: first(rows, "client"),
    mod: first(rows, "mod"),
    arac: first(rows, "arac"),
    transport: first(rows, "transport"),
    paket: packageOf(rows),
    nesneler: objs,
    approval: approvalOf(rows),
    ...resultOf(rows)
  };
}

export function buildWriteHistory(lines: readonly string[]): { ops: WriteOp[]; skipped: number } {
  let skipped = 0;
  const groups = new Map<string, Row[]>();
  lines.forEach((text, index) => {
    if (!text.trim()) return;
    let row: unknown;
    try {
      row = JSON.parse(text);
    } catch {
      skipped++;
      return;
    }
    if (typeof row !== "object" || row === null || typeof (row as Row).tur !== "string") {
      skipped++;
      return;
    }
    const r = row as Row;
    if (!OP_TYPES.has(r.tur as string)) return;
    const key = str(r.id) ?? `satir-${index}`;
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  });
  const ops = [...groups.entries()].map(([key, rows]) => {
    // Zaman sırası: `sonuc` önce yazılmış olsa da işlemin zamanı ilk satırı.
    rows.sort((a, b) => String(a.zaman ?? "").localeCompare(String(b.zaman ?? "")));
    return toOp(key, rows);
  });
  ops.sort((a, b) => b.zaman.localeCompare(a.zaman));
  return { ops, skipped };
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/sapWriteHistory.test.ts`
Beklenen: 6/6 PASS.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/shared/sapWriteHistory.ts
git add tests/sapWriteHistory.test.ts
git commit -m "SAP yazma gecmisi: kayit satirlarini isleme cevirme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 2: CSV

**Dosyalar:**
- Değişir: `app-electron/shared/sapWriteHistory.ts`
- Test: `tests/sapWriteHistoryCsv.test.ts`

**Arayüzler:**
- Tüketir: Görev 1 `WriteOp`, `WriteApproval`, `WriteResult`.
- Üretir:

```ts
export type CsvLanguage = "tr" | "en";
/** BOM'suz; satırlar CRLF; ayraç ";". BOM'u dosyaya yazan ekler (Görev 3). */
export function toCsv(ops: readonly WriteOp[], language: CsvLanguage): string;
export const APPROVAL_LABELS: Record<CsvLanguage, Record<WriteApproval, string>>;
export const RESULT_LABELS: Record<CsvLanguage, Record<WriteResult, string>>;
```

- [ ] **Adım 1: Kırmızı test** — `tests/sapWriteHistoryCsv.test.ts`

```ts
// SAP yazma geçmişinin CSV'si (spec 2026-10-16 sap-yazma-gecmisi §5).
import { describe, expect, it } from "vitest";
import { toCsv, type WriteOp } from "../app-electron/shared/sapWriteHistory";

const OP: WriteOp = {
  key: "a",
  zaman: new Date(2026, 9, 16, 14, 32, 5).toISOString(),
  kullanici: "TSASMAZ",
  sid: "D01",
  client: "100",
  mod: "dogrudan",
  arac: "adt_push",
  transport: "D01K900123",
  paket: "ZPKG",
  nesneler: [{ ad: "ZCL_A", tip: "CLAS" }, { ad: "ZIF_B", tip: "INTF" }],
  approval: "onaylandi",
  result: "basarili",
  sapMessage: null
};

describe("toCsv", () => {
  it("başlık + satır; yerel saat; ; ayracı; CRLF; BOM yok", () => {
    const csv = toCsv([OP], "tr");
    expect(csv.charCodeAt(0)).not.toBe(0xfeff);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Zaman;Kullanıcı;SID;Client;Mod;Araç;Nesneler;Paket;Transport;Onay;Sonuç;SAP mesajı");
    expect(lines[1]).toBe("2026-10-16 14:32:05;TSASMAZ;D01;100;dogrudan;adt_push;ZCL_A (CLAS), ZIF_B (INTF);ZPKG;D01K900123;Onaylandı;Başarılı;");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("İngilizce başlık ve etiketler", () => {
    const lines = toCsv([{ ...OP, approval: "sure_doldu", result: "yok" }], "en").split("\r\n");
    expect(lines[0]).toBe("Time;User;SID;Client;Mode;Tool;Objects;Package;Transport;Approval;Result;SAP message");
    expect(lines[1]).toContain(";Expired;None;");
  });

  it("; tırnak ve satır sonu içeren hücre tırnaklanıyor", () => {
    const csv = toCsv([{ ...OP, result: "hata", sapMessage: 'Hata; "satır 12"\nyeniden dene' }], "tr");
    expect(csv).toContain('"Hata; ""satır 12""\nyeniden dene"');
  });

  it("formül gibi başlayan hücre çalışmıyor (inceleme odağı 3)", () => {
    const csv = toCsv(
      [{ ...OP, nesneler: [{ ad: "=SUM(A1)", tip: "CLAS" }], paket: "+ZPKG", transport: "-K1", sapMessage: "@cmd" }],
      "tr"
    );
    const cells = csv.split("\r\n")[1].split(";");
    expect(cells[6]).toBe("'=SUM(A1) (CLAS)");
    expect(cells[7]).toBe("'+ZPKG");
    expect(cells[8]).toBe("'-K1");
    expect(cells[11]).toBe("'@cmd");
  });

  it("boş alanlar boş hücre; liste boşsa yalnız başlık", () => {
    const csv = toCsv([{ ...OP, kullanici: null, transport: null, nesneler: [] }], "tr");
    expect(csv.split("\r\n")[1].split(";").slice(0, 9)).toEqual(["2026-10-16 14:32:05", "", "D01", "100", "dogrudan", "adt_push", "", "ZPKG", ""]);
    expect(toCsv([], "tr").split("\r\n").filter(Boolean)).toHaveLength(1);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/sapWriteHistoryCsv.test.ts`
Beklenen: FAIL — `toCsv` yok.

- [ ] **Adım 3: Uygula** — `app-electron/shared/sapWriteHistory.ts`'in sonuna:

```ts
export type CsvLanguage = "tr" | "en";

export const APPROVAL_LABELS: Record<CsvLanguage, Record<WriteApproval, string>> = {
  tr: {
    onaylandi: "Onaylandı",
    oturum: "Oturum izni",
    ust_onay: "Üst onay",
    teslim: "Teslim izni",
    reddedildi: "Reddedildi",
    sure_doldu: "Süresi doldu",
    engellendi: "Engellendi",
    kalite_reddi: "Kalite reddi",
    yanitsiz: "Yanıtsız"
  },
  en: {
    onaylandi: "Approved",
    oturum: "Session grant",
    ust_onay: "Prior approval",
    teslim: "Delivery grant",
    reddedildi: "Rejected",
    sure_doldu: "Expired",
    engellendi: "Blocked",
    kalite_reddi: "Quality rejection",
    yanitsiz: "No answer"
  }
};

export const RESULT_LABELS: Record<CsvLanguage, Record<WriteResult, string>> = {
  tr: { basarili: "Başarılı", hata: "Hata", yok: "Yok" },
  en: { basarili: "Succeeded", hata: "Failed", yok: "None" }
};

const HEADERS: Record<CsvLanguage, string[]> = {
  tr: ["Zaman", "Kullanıcı", "SID", "Client", "Mod", "Araç", "Nesneler", "Paket", "Transport", "Onay", "Sonuç", "SAP mesajı"],
  en: ["Time", "User", "SID", "Client", "Mode", "Tool", "Objects", "Package", "Transport", "Approval", "Result", "SAP message"]
};

// Excel `=`, `+`, `-`, `@` ile (ve sekme/CR ile) başlayan hücreyi formül sayıyor;
// kayıttaki metin (nesne adı, SAP mesajı) dışarıdan gelebilir.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | null): string {
  let v = value ?? "";
  if (FORMULA_START.test(v)) v = `'${v}`;
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function localTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function toCsv(ops: readonly WriteOp[], language: CsvLanguage): string {
  const rows = [HEADERS[language].map(cell).join(";")];
  for (const op of ops) {
    rows.push(
      [
        localTime(op.zaman),
        op.kullanici,
        op.sid,
        op.client,
        op.mod,
        op.arac,
        op.nesneler.map((o) => (o.tip ? `${o.ad} (${o.tip})` : o.ad)).join(", "),
        op.paket,
        op.transport,
        APPROVAL_LABELS[language][op.approval],
        RESULT_LABELS[language][op.result],
        op.sapMessage
      ]
        .map(cell)
        .join(";")
    );
  }
  return rows.join("\r\n") + "\r\n";
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/sapWriteHistoryCsv.test.ts tests/sapWriteHistory.test.ts`
Beklenen: 11/11 PASS.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/shared/sapWriteHistory.ts
git add tests/sapWriteHistoryCsv.test.ts
git commit -m "SAP yazma gecmisi: CSV (; ayraci, kacis, formul korumasi)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: Ana süreç — okuma, CSV kaydetme, IPC

**Dosyalar:**
- Yeni: `app-electron/main/sapWrite/history.ts`
- Değişir: `app-electron/shared/sapWriteHistory.ts` (sonuç tipleri), `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts`, `app-electron/main/i18n/tr.ts`, `app-electron/main/i18n/en.ts`
- Test: `tests/sapWriteHistoryMain.test.ts`

**Arayüzler:**
- Tüketir:
  - Görev 1–2: `buildWriteHistory`, `toCsv`.
  - `readTail(file, max)` (`app-electron/main/support/bundle.ts`): son `max` bayt; kesildiyse yarım ilk satırı atar.
  - `LOG_FILE` (`app-electron/main/sapWrite/log.ts`).
  - `computeProjectDir(config, customerPath, service)` (`app-electron/main/launcher.ts`), `loadConfig()` (`store.ts`), `mt()` (`main/i18n`).
- Üretir:

```ts
// shared/sapWriteHistory.ts
export type WriteHistoryResult =
  | { ok: true; ops: WriteOp[]; skipped: number; truncated: boolean }
  | { ok: false; reason: "okunamadi" };
export type WriteCsvResult = { ok: true; path: string; count: number } | { ok: false; canceled?: true; message?: string };
// main/sapWrite/history.ts
export const MAX_HISTORY_BYTES = 5 * 1024 * 1024;
export function readWriteHistory(projectDir: string, max?: number): WriteHistoryResult;
export function csvFileName(sid: string, now: Date): string; // sap-yazma-<SID>-<YYYYMMDD>.csv
export function exportWriteHistoryCsv(
  projectDir: string, sid: string, language: CsvLanguage,
  deps: { pickPath: (defaultName: string) => Promise<string | null>; now?: Date }
): Promise<WriteCsvResult>;
export function registerWriteHistoryIpc(ipc: { handle(channel: string, fn: (...args: any[]) => unknown): void }): void;
// preload / window.api
getWriteHistory(customerPath: string[], service: SapService): Promise<WriteHistoryResult>;
exportWriteHistoryCsv(customerPath: string[], service: SapService): Promise<WriteCsvResult>;
```

- [ ] **Adım 1: Kırmızı test** — `tests/sapWriteHistoryMain.test.ts`

```ts
// SAP yazma geçmişi, ana süreç (spec 2026-10-16 sap-yazma-gecmisi §5).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ BrowserWindow: { getFocusedWindow: () => null }, dialog: { showSaveDialog: vi.fn() } }));

const { MAX_HISTORY_BYTES, csvFileName, exportWriteHistoryCsv, readWriteHistory } = await import(
  "../app-electron/main/sapWrite/history"
);

const ROW = (id: string, zaman: string) =>
  JSON.stringify({ zaman, tur: "karar", id, karar: "izinli", kaynak: "ust_onay", sid: "D01", arac: "adt_push", nesneler: [{ ad: "ZCL_A", tip: "CLAS" }] });

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "yazma-"));
});

describe("readWriteHistory", () => {
  it("proje klasörü ya da kayıt yoksa boş liste, hata değil (inceleme odağı 4)", () => {
    expect(readWriteHistory(path.join(dir, "yok"))).toEqual({ ok: true, ops: [], skipped: 0, truncated: false });
    expect(readWriteHistory(dir)).toEqual({ ok: true, ops: [], skipped: 0, truncated: false });
  });

  it("kaydı okuyup işlemlere çeviriyor", () => {
    writeFileSync(path.join(dir, "sap-yazma-gunlugu.jsonl"), `${ROW("a", "2026-10-16T10:00:00Z")}\n${ROW("b", "2026-10-16T11:00:00Z")}\n`);
    const r = readWriteHistory(dir);
    expect(r.ok && r.ops.map((o) => o.key)).toEqual(["b", "a"]);
  });

  it("sınırı aşan kayıt sondan okunuyor, truncated", () => {
    const filler = `${ROW("eski", "2026-01-01T00:00:00Z")}\n`.repeat(50);
    writeFileSync(path.join(dir, "sap-yazma-gunlugu.jsonl"), filler + `${ROW("son", "2026-10-16T12:00:00Z")}\n`);
    const r = readWriteHistory(dir, 300);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.truncated).toBe(true);
    expect(r.ops[0].key).toBe("son");
    expect(r.skipped).toBe(0); // yarım ilk satır atıldı, bozuk sayılmadı
  });

  it("okunamıyorsa okunamadi (inceleme odağı 5)", () => {
    // Kayıt adında bir KLASÖR: var ama dosya olarak okunamıyor.
    mkdirSync(path.join(dir, "sap-yazma-gunlugu.jsonl"));
    expect(readWriteHistory(dir)).toEqual({ ok: false, reason: "okunamadi" });
  });

  it("varsayılan sınır 5 MB", () => {
    expect(MAX_HISTORY_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("exportWriteHistoryCsv", () => {
  it("BOM + CSV yazıyor; önerilen ad SID ve tarih", async () => {
    writeFileSync(path.join(dir, "sap-yazma-gunlugu.jsonl"), `${ROW("a", "2026-10-16T10:00:00Z")}\n`);
    const target = path.join(dir, "cikti.csv");
    const pickPath = vi.fn(async () => target);
    const r = await exportWriteHistoryCsv(dir, "D01", "tr", { pickPath, now: new Date(2026, 9, 16) });
    expect(pickPath).toHaveBeenCalledWith("sap-yazma-D01-20261016.csv");
    expect(r).toEqual({ ok: true, path: target, count: 1 });
    const bytes = readFileSync(target);
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(bytes.toString("utf-8")).toContain("\r\n");
  });

  it("iptal edilirse dosya yok", async () => {
    const r = await exportWriteHistoryCsv(dir, "D01", "tr", { pickPath: async () => null });
    expect(r).toEqual({ ok: false, canceled: true });
  });

  it("dosya adı güvenli", () => {
    expect(csvFileName("D/0:1", new Date(2026, 0, 2))).toBe("sap-yazma-D_0_1-20260102.csv");
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/sapWriteHistoryMain.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Sonuç tipleri** — `app-electron/shared/sapWriteHistory.ts`'in sonuna:

```ts
export type WriteHistoryResult =
  | { ok: true; ops: WriteOp[]; skipped: number; truncated: boolean }
  | { ok: false; reason: "okunamadi" };

export type WriteCsvResult = { ok: true; path: string; count: number } | { ok: false; canceled?: true; message?: string };
```

- [ ] **Adım 4: `app-electron/main/sapWrite/history.ts`**

```ts
// SAP yazma geçmişini okuma ve CSV'ye kaydetme (spec 2026-10-16
// sap-yazma-gecmisi §5). Kayıt YALNIZ okunuyor; silme/düzenleme yok.
// Kayıt proje klasöründe, sistemin kendi klasöründe: bağlı olmak gerekmiyor.

import { existsSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BrowserWindow, dialog } from "electron";
import type { SapService } from "../../shared/types";
import {
  buildWriteHistory,
  toCsv,
  type CsvLanguage,
  type WriteCsvResult,
  type WriteHistoryResult
} from "../../shared/sapWriteHistory";
import { mt } from "../i18n";
import { computeProjectDir } from "../launcher";
import { loadConfig } from "../store";
import { readTail } from "../support/bundle";
import { LOG_FILE } from "./log";

export const MAX_HISTORY_BYTES = 5 * 1024 * 1024;

export function readWriteHistory(projectDir: string, max = MAX_HISTORY_BYTES): WriteHistoryResult {
  const file = path.join(projectDir, LOG_FILE);
  if (!existsSync(file)) return { ok: true, ops: [], skipped: 0, truncated: false };
  try {
    const stat = statSync(file);
    // Windows'ta klasör "dosya gibi" açılıp boş okunuyor: boş liste değil, okunamadı.
    if (!stat.isFile()) return { ok: false, reason: "okunamadi" };
    const size = stat.size;
    const { ops, skipped } = buildWriteHistory(readTail(file, max).split(/\r?\n/));
    return { ok: true, ops, skipped, truncated: size > max };
  } catch {
    // OneDrive kilidi, izin, klasör: panel çökmesin, "okunamadı" desin.
    return { ok: false, reason: "okunamadi" };
  }
}

export function csvFileName(sid: string, now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const safe = sid.replace(/[^A-Za-z0-9_-]/g, "_") || "sistem";
  return `sap-yazma-${safe}-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.csv`;
}

export async function exportWriteHistoryCsv(
  projectDir: string,
  sid: string,
  language: CsvLanguage,
  deps: { pickPath: (defaultName: string) => Promise<string | null>; now?: Date }
): Promise<WriteCsvResult> {
  const history = readWriteHistory(projectDir);
  if (!history.ok) return { ok: false, message: history.reason };
  const target = await deps.pickPath(csvFileName(sid, deps.now ?? new Date()));
  if (!target) return { ok: false, canceled: true };
  try {
    // BOM: Excel UTF-8'i ancak onunla tanıyor, yoksa Türkçe harfler bozuk açılıyor.
    writeFileSync(target, "\uFEFF" + toCsv(history.ops, language), "utf-8");
    return { ok: true, path: target, count: history.ops.length };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

/** Renderer'dan gelen seçim: yol parçaları ve sistem; biçim tutmuyorsa null. */
function projectDirFrom(customerPath: unknown, service: unknown): { dir: string; sid: string } | null {
  if (!Array.isArray(customerPath) || !customerPath.every((s) => typeof s === "string")) return null;
  if (typeof service !== "object" || service === null) return null;
  const s = service as Partial<SapService>;
  if (typeof s.systemId !== "string" || typeof s.name !== "string") return null;
  return {
    dir: computeProjectDir(loadConfig(), customerPath, { systemId: s.systemId, name: s.name }),
    sid: s.systemId || s.name
  };
}

export function registerWriteHistoryIpc(ipc: { handle(channel: string, fn: (...args: any[]) => unknown): void }): void {
  ipc.handle("sapWrite:history", (_event: unknown, customerPath: unknown, service: unknown): WriteHistoryResult => {
    const target = projectDirFrom(customerPath, service);
    return target ? readWriteHistory(target.dir) : { ok: false, reason: "okunamadi" };
  });
  ipc.handle("sapWrite:exportCsv", async (_event: unknown, customerPath: unknown, service: unknown): Promise<WriteCsvResult> => {
    const target = projectDirFrom(customerPath, service);
    if (!target) return { ok: false, message: "okunamadi" };
    return exportWriteHistoryCsv(target.dir, target.sid, loadConfig().language === "en" ? "en" : "tr", {
      pickPath: async (defaultName) => {
        const win = BrowserWindow.getFocusedWindow();
        const result = await dialog.showSaveDialog(win ?? (undefined as any), {
          title: mt("dialog.exportWriteHistory"),
          defaultPath: defaultName,
          filters: [{ name: "CSV", extensions: ["csv"] }]
        });
        return result.canceled || !result.filePath ? null : result.filePath;
      }
    });
  });
}
```

`history.ts` `launcher.ts`'i içe aktarıyor. Test `electron`'u sahteliyor ama `launcher.ts`'in kendi içe aktarmaları test ortamında yüklenemezse:
- testin başına `vi.mock("../app-electron/main/launcher", () => ({ computeProjectDir: vi.fn() }))`,
- `vi.mock("../app-electron/main/store", () => ({ loadConfig: () => ({ language: "tr" }) }))`,
- `vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }))`

ekle ve ledger'a `Ruling:` yaz.

- [ ] **Adım 5: Pencere başlığı** — `app-electron/main/i18n/tr.ts`, `"dialog.exportManualSystems"` satırının altına:

```ts
  "dialog.exportWriteHistory": "SAP Yazma Geçmişini Kaydet",
```

`app-electron/main/i18n/en.ts`, aynı yere:

```ts
  "dialog.exportWriteHistory": "Save SAP Write History",
```

- [ ] **Adım 6: Kayıt ve köprü**

`app-electron/main/index.ts`:
- Import: `import { registerWriteHistoryIpc } from "./sapWrite/history";`, `registerSapWriteIpc` import satırının altına.
- `registerSupportIpc(ipcMain);` satırının altına: `registerWriteHistoryIpc(ipcMain);`.

`app-electron/preload/index.ts`:
- Başa: `import type { WriteCsvResult, WriteHistoryResult } from "../shared/sapWriteHistory";`.
- `supportCreate` girdisinin altına:

```ts
  // "SAP'ye yazılanlar" (sistem paneli): kayıt okuma ve CSV (bkz. sapWrite/history.ts).
  getWriteHistory: (customerPath: string[], service: SapService): Promise<WriteHistoryResult> =>
    ipcRenderer.invoke("sapWrite:history", customerPath, service),
  exportWriteHistoryCsv: (customerPath: string[], service: SapService): Promise<WriteCsvResult> =>
    ipcRenderer.invoke("sapWrite:exportCsv", customerPath, service),
```

(`SapService` preload'da zaten `../shared/types`'tan alınıyor; değilse o import listesine ekle.)

`src/window.d.ts`:
- Başa: `import type { WriteCsvResult, WriteHistoryResult } from "../app-electron/shared/sapWriteHistory";`.
- `supportCreate` satırının altına:

```ts
  getWriteHistory: (customerPath: string[], service: SapService) => Promise<WriteHistoryResult>;
  exportWriteHistoryCsv: (customerPath: string[], service: SapService) => Promise<WriteCsvResult>;
```

- [ ] **Adım 7: Yeşili gör**

Çalıştır: `npx vitest run tests/sapWriteHistoryMain.test.ts tests/sapWriteHistory.test.ts tests/sapWriteHistoryCsv.test.ts` ve `npm run typecheck`
Beklenen: hepsi PASS (8 + 6 + 5); typecheck temiz.

- [ ] **Adım 8: Commit**

```bash
git add app-electron/main/sapWrite/history.ts
git add app-electron/shared/sapWriteHistory.ts
git add app-electron/main/index.ts
git add app-electron/preload/index.ts
git add src/window.d.ts
git add app-electron/main/i18n/tr.ts
git add app-electron/main/i18n/en.ts
git add tests/sapWriteHistoryMain.test.ts
git commit -m "SAP yazma gecmisi: ana surec (son 5 MB okuma, CSV kaydetme, IPC)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 4: "SAP'ye yazılanlar" bölümü

**Dosyalar:**
- Yeni: `src/components/WriteHistory.tsx`
- Değişir: `src/components/SystemPanel.tsx`, `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/writeHistory.test.tsx`

**Arayüzler:**
- Tüketir:
  - Görev 1–3: `WriteOp`, `WriteHistoryResult`, `WriteCsvResult`, `window.api.getWriteHistory`, `window.api.exportWriteHistoryCsv`.
  - `useT()`, `LanguageProvider` (`src/i18n`).
  - `SapService` (`app-electron/shared/types`).
- Üretir:

```tsx
export default function WriteHistory(props: { path: string[]; service: SapService }): JSX.Element | null;
export function opStatus(op: WriteOp): { key: TranslationKey; tone: "success" | "danger" | "warning" | "neutral" };
```

- [ ] **Adım 1: Metinler** — `src/i18n/tr.ts`, `"agentCaps.heading"` satırının üstüne:

```ts
  "writeHistory.heading": "SAP'ye yazılanlar ({n})",
  "writeHistory.export": "CSV olarak kaydet",
  "writeHistory.saved": "Kaydedildi: {file}",
  "writeHistory.saveFailed": "Kaydedilemedi: {message}",
  "writeHistory.unreadable": "Kayıt okunamadı.",
  "writeHistory.truncated": "Kayıt büyük; yalnız son 5 MB gösteriliyor.",
  "writeHistory.skipped": "Okunamayan {n} satır atlandı.",
  "writeHistory.showAll": "Tümünü göster ({n})",
  "writeHistory.user": "Kullanıcı",
  "writeHistory.client": "Client",
  "writeHistory.mode": "Mod",
  "writeHistory.tool": "Araç",
  "writeHistory.package": "Paket",
  "writeHistory.objects": "Nesneler",
  "writeHistory.approvalLabel": "Onay",
  "writeHistory.message": "SAP mesajı",
  "writeHistory.status.basarili": "Başarılı",
  "writeHistory.status.hata": "Hata",
  "writeHistory.status.onaylandi": "Onaylandı",
  "writeHistory.status.oturum": "Oturum izni",
  "writeHistory.status.ust_onay": "Üst onay",
  "writeHistory.status.teslim": "Teslim izni",
  "writeHistory.status.reddedildi": "Reddedildi",
  "writeHistory.status.sure_doldu": "Süresi doldu",
  "writeHistory.status.engellendi": "Engellendi",
  "writeHistory.status.kalite_reddi": "Kalite reddi",
  "writeHistory.status.yanitsiz": "Yanıtsız",
```

`src/i18n/en.ts`, aynı yere:

```ts
  "writeHistory.heading": "Written to SAP ({n})",
  "writeHistory.export": "Save as CSV",
  "writeHistory.saved": "Saved: {file}",
  "writeHistory.saveFailed": "Could not save: {message}",
  "writeHistory.unreadable": "The log could not be read.",
  "writeHistory.truncated": "The log is large; only the last 5 MB is shown.",
  "writeHistory.skipped": "{n} unreadable lines were skipped.",
  "writeHistory.showAll": "Show all ({n})",
  "writeHistory.user": "User",
  "writeHistory.client": "Client",
  "writeHistory.mode": "Mode",
  "writeHistory.tool": "Tool",
  "writeHistory.package": "Package",
  "writeHistory.objects": "Objects",
  "writeHistory.approvalLabel": "Approval",
  "writeHistory.message": "SAP message",
  "writeHistory.status.basarili": "Succeeded",
  "writeHistory.status.hata": "Failed",
  "writeHistory.status.onaylandi": "Approved",
  "writeHistory.status.oturum": "Session grant",
  "writeHistory.status.ust_onay": "Prior approval",
  "writeHistory.status.teslim": "Delivery grant",
  "writeHistory.status.reddedildi": "Rejected",
  "writeHistory.status.sure_doldu": "Expired",
  "writeHistory.status.engellendi": "Blocked",
  "writeHistory.status.kalite_reddi": "Quality rejection",
  "writeHistory.status.yanitsiz": "No answer",
```

- [ ] **Adım 2: Kırmızı test** — `tests/writeHistory.test.tsx`

```tsx
// @vitest-environment jsdom
// "SAP'ye yazılanlar" bölümü (spec 2026-10-16 sap-yazma-gecmisi §6).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WriteOp } from "../app-electron/shared/sapWriteHistory";
import type { SapService } from "../app-electron/shared/types";
import { LanguageProvider } from "../src/i18n";
import WriteHistory, { opStatus } from "../src/components/WriteHistory";

const win = window as unknown as { api: unknown };
const originalApi = win.api;
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const SERVICE = { uuid: "u1", systemId: "D01", name: "D01 Geliştirme" } as SapService;

function op(i: number, over: Partial<WriteOp> = {}): WriteOp {
  return {
    key: `k${i}`,
    zaman: new Date(2026, 9, 16, 14, i).toISOString(),
    kullanici: "TSASMAZ",
    sid: "D01",
    client: "100",
    mod: "dogrudan",
    arac: "adt_push",
    transport: `D01K9000${String(i).padStart(2, "0")}`,
    paket: "ZPKG",
    nesneler: [{ ad: `ZCL_${i}`, tip: "CLAS" }],
    approval: "onaylandi",
    result: "basarili",
    sapMessage: null,
    ...over
  };
}

function setup(history: unknown, exportCsv = vi.fn(async () => ({ ok: true, path: "C:/x/sap-yazma-D01-20261016.csv", count: 1 }))) {
  const getWriteHistory = vi.fn(async () => history);
  win.api = { getWriteHistory, exportWriteHistoryCsv: exportCsv };
  render(
    <LanguageProvider language="tr">
      <WriteHistory path={["Müşteri"]} service={SERVICE} />
    </LanguageProvider>
  );
  return { getWriteHistory, exportCsv };
}

describe("WriteHistory", () => {
  it("kayıt boşsa hiçbir şey çizilmiyor", async () => {
    const { getWriteHistory } = setup({ ok: true, ops: [], skipped: 0, truncated: false });
    await waitFor(() => expect(getWriteHistory).toHaveBeenCalledWith(["Müşteri"], SERVICE));
    expect(screen.queryByText(/SAP'ye yazılanlar/)).toBeNull();
  });

  it("başlık sayıyla; ilk 10 satır, 'Tümünü göster' kalanı açıyor", async () => {
    setup({ ok: true, ops: Array.from({ length: 12 }, (_, i) => op(i)), skipped: 0, truncated: false });
    expect(await screen.findByText("SAP'ye yazılanlar (12)")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /D01K9000/ })).toHaveLength(10);
    fireEvent.click(screen.getByRole("button", { name: "Tümünü göster (12)" }));
    expect(screen.getAllByRole("button", { name: /D01K9000/ })).toHaveLength(12);
  });

  it("satır: nesne +N, transport, durum; tıklayınca ayrıntı", async () => {
    setup({
      ok: true,
      ops: [op(1, { nesneler: [{ ad: "ZCL_A", tip: "CLAS" }, { ad: "ZIF_B", tip: "INTF" }, { ad: "ZT", tip: "TABL" }], result: "hata", sapMessage: "Syntax error" })],
      skipped: 0,
      truncated: false
    });
    const row = await screen.findByRole("button", { name: /ZCL_A \+2/ });
    expect(row.textContent).toContain("D01K900001");
    expect(row.textContent).toContain("Hata");
    expect(screen.queryByText("Syntax error")).toBeNull();
    fireEvent.click(row);
    expect(screen.getByText("Syntax error")).toBeTruthy();
    expect(screen.getByText("ZCL_A (CLAS), ZIF_B (INTF), ZT (TABL)")).toBeTruthy();
    expect(row.getAttribute("aria-expanded")).toBe("true");
  });

  it("CSV: çağrı yapılıyor, sonuç başlığın altında", async () => {
    const { exportCsv } = setup({ ok: true, ops: [op(1)], skipped: 0, truncated: false });
    fireEvent.click(await screen.findByRole("button", { name: "CSV olarak kaydet" }));
    await waitFor(() => expect(exportCsv).toHaveBeenCalledWith(["Müşteri"], SERVICE));
    expect(await screen.findByText("Kaydedildi: sap-yazma-D01-20261016.csv")).toBeTruthy();
  });

  it("CSV iptal edilirse ileti yok; hata ileti olarak", async () => {
    const exportCsv = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, canceled: true })
      .mockResolvedValueOnce({ ok: false, message: "erişim engellendi" });
    setup({ ok: true, ops: [op(1)], skipped: 0, truncated: false }, exportCsv);
    const button = await screen.findByRole("button", { name: "CSV olarak kaydet" });
    fireEvent.click(button);
    await waitFor(() => expect(exportCsv).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Kaydedil/)).toBeNull();
    fireEvent.click(button);
    expect(await screen.findByText("Kaydedilemedi: erişim engellendi")).toBeTruthy();
  });

  it("okunamadı ve kısmi okuma notları (inceleme odağı 5)", async () => {
    setup({ ok: false, reason: "okunamadi" });
    expect(await screen.findByText("Kayıt okunamadı.")).toBeTruthy();
    cleanup();
    setup({ ok: true, ops: [op(1)], skipped: 3, truncated: true });
    expect(await screen.findByText("Kayıt büyük; yalnız son 5 MB gösteriliyor.")).toBeTruthy();
    expect(screen.getByText("Okunamayan 3 satır atlandı.")).toBeTruthy();
    cleanup();
    setup({ ok: true, ops: [op(1)], skipped: 0, truncated: false });
    await screen.findByText("SAP'ye yazılanlar (1)");
    expect(screen.queryByText(/atlandı|5 MB/)).toBeNull();
  });
});

describe("opStatus", () => {
  it("sonuç onaydan önce gelir; tonlar", () => {
    expect(opStatus(op(1))).toEqual({ key: "writeHistory.status.basarili", tone: "success" });
    expect(opStatus(op(1, { result: "hata" }))).toEqual({ key: "writeHistory.status.hata", tone: "danger" });
    expect(opStatus(op(1, { result: "yok", approval: "reddedildi" }))).toEqual({ key: "writeHistory.status.reddedildi", tone: "warning" });
    expect(opStatus(op(1, { result: "yok", approval: "yanitsiz" }))).toEqual({ key: "writeHistory.status.yanitsiz", tone: "neutral" });
    expect(opStatus(op(1, { result: "yok", approval: "kalite_reddi" })).tone).toBe("warning");
  });
});
```

- [ ] **Adım 3: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/writeHistory.test.tsx`
Beklenen: FAIL — bileşen yok.

- [ ] **Adım 4: `src/components/WriteHistory.tsx`**

```tsx
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

const WARNING_APPROVALS = new Set(["reddedildi", "sure_doldu", "engellendi", "kalite_reddi"]);

/** Tek kelimelik durum: SAP sonucu varsa o, yoksa onay. */
export function opStatus(op: WriteOp): { key: TranslationKey; tone: Tone } {
  if (op.result === "basarili") return { key: "writeHistory.status.basarili", tone: "success" };
  if (op.result === "hata") return { key: "writeHistory.status.hata", tone: "danger" };
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
                    <span className="w-28 shrink-0 truncate font-mono text-slate-400">{op.transport ?? "—"}</span>
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
```

`t(key, { n: 12 })` sayı parametresini kabul etmiyorsa `String(ops.length)` ver. Parametre tipi `src/i18n/index.tsx`'teki `TranslateParams`.

- [ ] **Adım 5: Sistem paneli** — `src/components/SystemPanel.tsx`:
- Import: `import WriteHistory from "./WriteHistory";`, `AgentCapabilities` import satırının altına.
- `<AgentCapabilities systemUuid={service.uuid} />` satırının altına:

```tsx
          {/* Bağlı olmasa da: kayıt sistemin proje klasöründe. Boşsa hiç çizilmiyor. */}
          <WriteHistory path={path} service={service} />
```

- [ ] **Adım 6: Yeşili gör**

Çalıştır: `npx vitest run tests/writeHistory.test.tsx tests/systemPanel.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS; typecheck temiz. `systemPanel.test.tsx`'in sahte API'si bilinmeyen çağrıya sonsuza bekleyen söz döndürüyor, bölüm o testlerde çizilmez; değişiklik gerekmez.

- [ ] **Adım 7: Tam takım**

Çalıştır: `npx vitest run` (çıktıyı dosyaya al, kuyruğunu oku)
Beklenen: hepsi PASS.

- [ ] **Adım 8: Commit**

```bash
git add src/components/WriteHistory.tsx
git add src/components/SystemPanel.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/writeHistory.test.tsx
git commit -m "SAP yazma gecmisi: sistem panelinde 'SAP'ye yazilanlar' (10 satir, ayrinti, CSV)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Gözle kontrol (kullanıcı)

1. Yazma yapılmış bir DEV sistemini seçin: detay kartında "SAP'ye yazılanlar (N)" görünüyor, bağlı olmasanız da.
2. Hiç yazılmamış bir sistemde bölüm yok.
3. Satıra tıklayınca ayrıntı açılıyor.
4. "CSV olarak kaydet" → Excel'de açın: Türkçe harfler doğru, sütunlar ayrı.
