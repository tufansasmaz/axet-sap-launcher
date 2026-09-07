import { execFile } from "node:child_process";

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
  if (lastSeen === null) {
    console.log("[axetCode] surum", { surum: version });
  } else if (lastSeen !== version) {
    console.log("[axetCode] SURUM DEGISTI", { onceki: lastSeen, simdi: version });
  }
  lastSeen = version;
  return version;
}

/** En son görülen sürüm; henüz sondaj yapılmadıysa `null`. */
export function axetCodeVersion(): string | null {
  return lastSeen;
}
