import { execFile } from "node:child_process";
import { mt } from "./i18n";

/**
 * axet-code'un sürümünü öğrenir ve DEĞİŞTİĞİNDE bunu günlüğe yazar.
 *
 * Neden var: axet-code kendini sessizce güncelleyebiliyor ve kılıf bunu hiçbir
 * yerde kaydetmiyordu. Bir sohbet bir gün çalışıp ertesi gün çalışmadığında,
 * "aradaki fark bizim kodumuz mu, yoksa axet-code mu?" sorusunu cevaplayacak
 * tek veri buydu — ve elimizde yoktu (kullanıcı sorusu, 2026-09-07).
 *
 * `axet-code --version` tek satır yazıp hemen çıkıyor (ölçüldü: <1 sn), ama
 * yine de eşzamansız çağrılıyor: ana süreç bir alt sürecin çıkışını beklerken
 * bloke olursa arayüz donar.
 */

/** Bu kılıf çalışırken en son görülen sürüm. Süreç ömrü kadar yaşıyor. */
let lastSeen: string | null = null;
/** Aynı anda birden çok oturum açıldığında sondaj bir kez yapılsın. */
let inFlight: Promise<string | null> | null = null;

function probe(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("axet-code.exe", ["--version"], { timeout: 10_000, windowsHide: true }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      // "axet-code version 1.2.3" -> "1.2.3". Biçim değişirse ham satır
      // yine de anlamlı: sürüm karşılaştırması yapmıyoruz, yalnızca eşitlik.
      const line = String(stdout).trim().split(/\r?\n/)[0] ?? "";
      resolve(line.replace(/^axet-code\s+version\s+/i, "").trim() || null);
    });
  });
}

/**
 * Sürümü okur; ilk okumada ve her DEĞİŞİMDE günlüğe yazar.
 * Sonuç önbelleğe alınmıyor — güncelleme kılıf çalışırken de olabilir.
 */
export async function noteAxetCodeVersion(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = probe().finally(() => {
    inFlight = null;
  });
  const version = await inFlight;
  if (!version) return null;
  recordVersion(version);
  return version;
}

/**
 * Kurulu sürümü öğrenen HER yol buradan geçiyor (sondaj, durum denetimi,
 * `run -v`'nin güncelleme satırı): değişim hangisinden öğrenilirse öğrenilsin
 * günlüğe düşsün.
 */
function recordVersion(version: string): void {
  if (lastSeen === null) {
    console.log("[axetCode] surum", { surum: version });
  } else if (lastSeen !== version) {
    console.log("[axetCode] SURUM DEGISTI", { onceki: lastSeen, simdi: version });
  }
  lastSeen = version;
}

/** En son görülen sürüm; henüz sondaj yapılmadıysa `null`. */
export function axetCodeVersion(): string | null {
  return lastSeen;
}

// ---------------------------------------------------------------------------
// Sohbetin ön koşulu: axet-code 1.4+ ve SAĞLAM bir program dosyası
// ---------------------------------------------------------------------------
// Başsız köprü `run --resume` ve `--output-format json` kullanıyor; ikisi de
// 1.4.0'da geldi (spec 2026-10-16 basiz-kopru). Ayrıca axet-code'un kendi
// güncelleyicisi, program kullanımdayken onu 0 bayta indirip "başarılı"
// diyebiliyor (2026-10-15 ve 2026-10-16'da iki kez görüldü). O durumda
// sohbet sessizce cevapsız kalıyordu; artık ne olduğunu söylüyor.

export const MIN_AXET_VERSION = "1.4.0";

export type AxetBinaryStatus =
  | { kind: "ok"; version: string }
  | { kind: "old"; version: string }
  | { kind: "missing" }
  | { kind: "broken"; detail: string };

export interface ProbeOutcome {
  errorCode: string | null;
  errorMessage: string;
  stdout: string;
  /** Bir derleme `--version`'ı stderr'e basarsa sohbet herkese "bozuk" kalmasın. */
  stderr?: string;
}

/** Sayı olmayan parça ("beta", "x") 0 sayılıyor; NaN karşılaştırmayı bozardı. */
function versionPart(n: string): number {
  const v = parseInt(n, 10);
  return Number.isNaN(v) ? 0 : v;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(versionPart);
  const pb = b.split(".").map(versionPart);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function statusFromProbe(p: ProbeOutcome): AxetBinaryStatus {
  if (p.errorCode === "ENOENT") return { kind: "missing" };
  const out = `${p.stdout}\n${p.stderr ?? ""}`.trim();
  const m = /version\s+([0-9]+(?:\.[0-9]+)*)/i.exec(out);
  if (p.errorCode || !m) {
    // 0 baytlık exe Windows'ta "not a valid Win32 application" (UNKNOWN/EFTYPE)
    // veriyor ya da hiçbir şey basmıyor; ikisi de aynı şey: program bozuk.
    return { kind: "broken", detail: (p.errorMessage || out || "boş çıktı").slice(0, 200) };
  }
  const version = m[1];
  return compareVersions(version, MIN_AXET_VERSION) < 0 ? { kind: "old", version } : { kind: "ok", version };
}

function probeOutcome(): Promise<ProbeOutcome> {
  return new Promise((resolve) => {
    execFile("axet-code.exe", ["--version"], { timeout: 5_000, windowsHide: true }, (err, stdout, stderr) => {
      const e = err as (NodeJS.ErrnoException & { code?: string | number }) | null;
      resolve({
        errorCode: e ? String(e.code ?? "ERR") : null,
        errorMessage: e ? e.message : "",
        stdout: String(stdout ?? ""),
        stderr: String(stderr ?? "")
      });
    });
  });
}

let cachedStatus: AxetBinaryStatus | null = null;

/**
 * Önbellekli; `force` ile yeniden sorulur. Sohbet bir tur başlatamazsa
 * (süreç açılamadı, JSON yok) çağıran `force` ile tazeliyor: arada kullanıcı
 * axet-code'u onarmış ya da güncelleyici bozmuş olabilir.
 */
export async function axetBinaryStatus(force = false): Promise<AxetBinaryStatus> {
  if (cachedStatus && !force) return cachedStatus;
  cachedStatus = statusFromProbe(await probeOutcome());
  if (cachedStatus.kind === "ok" || cachedStatus.kind === "old") recordVersion(cachedStatus.version);
  return cachedStatus;
}

export function axetBinaryMessage(status: AxetBinaryStatus): string | null {
  switch (status.kind) {
    case "ok":
      return null;
    case "old":
      return mt("chat.axetTooOld", { version: status.version, min: MIN_AXET_VERSION });
    case "missing":
      return mt("chat.axetMissing");
    case "broken":
      return mt("chat.axetBroken");
  }
}

// Her `run -v` turu stderr'e şunu yazıyor (ölçüm 2026-10-16):
//   INFO Update check done component=bgjob job=auto-update current=1.4.1 latest=1.4.1 minimum=1.3.0 …
// Eski TUI ekranındaki "new version available" yazısının yerine bu okunuyor.
const RE_UPDATE_LINE = /Update check done\b.*?\bcurrent=([0-9][\w.+-]*)\s+latest=([0-9][\w.+-]*)/;
// Modül düzeyinde TEK değer bilerek: makinede tek bir axet-code kurulumu var,
// hangi sohbetin turu görürse görsün aynı kurulumu anlatıyor.
let updateInfo: { installed: string; latest: string } | null = null;

// Duyuru KALICI: yalnızca bir axet-code süreci çalışınca görülüyor, oysa
// gösterildiği yer sohbet açılış ekranı — henüz hiçbir turun koşmadığı an
// (eski gerekçe, bkz. AppConfig.axetCodeLatestSeen). Depo dışarıdan veriliyor:
// bu modül config'i bilmiyor, testte de bilmemeli.
let seenStore: { load(): string; save(latest: string): void } | null = null;

export function persistUpdateSeen(store: { load(): string; save(latest: string): void } | null): void {
  seenStore = store;
}

export function noteUpdateLine(line: string): void {
  const m = RE_UPDATE_LINE.exec(line);
  if (!m) return;
  updateInfo = compareVersions(m[2], m[1]) > 0 ? { installed: m[1], latest: m[2] } : null;
  // Satır kurulu sürümü de söylüyor; sondaya gerek yok.
  recordVersion(m[1]);
  if (seenStore && seenStore.load() !== m[2]) seenStore.save(m[2]);
}

export function axetUpdateAvailable(): { installed: string; latest: string } | null {
  if (updateInfo) return updateInfo;
  // Bu açılışta henüz tur koşmadı: kalıcı değeri bilinen kurulu sürümle karşılaştır.
  const latest = seenStore?.load() ?? "";
  if (!latest || !lastSeen) return null;
  return compareVersions(latest, lastSeen) > 0 ? { installed: lastSeen, latest } : null;
}
