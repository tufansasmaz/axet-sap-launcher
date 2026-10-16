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

export type WriteHistoryResult =
  | { ok: true; ops: WriteOp[]; skipped: number; truncated: boolean }
  | { ok: false; reason: "okunamadi" };

export type WriteCsvResult = { ok: true; path: string; count: number } | { ok: false; canceled?: true; message?: string };
