import { dirKey, listSystems, markSystemSleeping, type SystemRecord } from "./sapSystems";

// ---------------------------------------------------------------------------
// Boştaki sistemi uyutma (kucukler-3 madde 1, 2026-11-12)
// ---------------------------------------------------------------------------
// Her bağlı sistem 1-2 Python süreci tutuyor (ADT sunucusu + gerekirse RFC
// köprüsü). Uzun süre ADT isteği almayan sistemin süreçleri kapanıyor; kayıt,
// port ve bağlam kalıyor, ekranda "uyuyor" görünüyor. İlk istekte (yeni bölme,
// sohbet turu) ya da odakta aynı port ve YENİ jetonla yeniden açılıyor
// (sapSystems.wakeIfSleeping).
//
// Uyutulmayanlar:
//  - bağlı açık bölmesi/sohbet turu olan: ortamındaki jeton yeni sunucuda
//    geçersiz kalırdı;
//  - onay penceresi bekleyen: onay oturumu sunucuyla birlikte kapanırdı.
// "Etkinlik" = kayıttaki `lastUsedAt`: süreç açılışı, odak ve sunucunun her
// araç çağrısında yazdığı `[adt-audit]` satırı (index.ts bağlıyor).
// ---------------------------------------------------------------------------

export interface SleepPickDeps {
  now: number;
  /** Eşik (dk); 0 = kapalı. */
  idleMinutes: number;
  hasOpenPane: (projectDir: string) => boolean;
  hasPendingApproval: (projectDir: string) => boolean;
}

export interface SleepDeps extends SleepPickDeps {
  /** ADT sunucusu + RFC köprüsü + onay oturumu kapatılır. */
  stopServers: (projectDir: string) => void;
}

export function pickSleepers(deps: SleepPickDeps): SystemRecord[] {
  if (!(deps.idleMinutes > 0)) return [];
  const limit = deps.idleMinutes * 60_000;
  return listSystems().filter(
    (s) =>
      !s.sleeping &&
      s.adtPort !== null &&
      deps.now - s.lastUsedAt >= limit &&
      !deps.hasOpenPane(s.projectDir) &&
      !deps.hasPendingApproval(s.projectDir)
  );
}

/** Seçilenleri uyutur; uyutulan klasörleri döndürür. */
export function sleepIdleSystems(deps: SleepDeps): string[] {
  const out: string[] = [];
  for (const s of pickSleepers(deps)) {
    try {
      deps.stopServers(s.projectDir);
    } catch {
      continue;
    }
    markSystemSleeping(s.projectDir);
    out.push(s.projectDir);
  }
  return out;
}

/** Bölmelerin/turların klasörlerinden biri sistemin klasörü ya da altı mı. */
export function anyCwdUnder(cwds: Iterable<string>, projectDir: string): boolean {
  const key = dirKey(projectDir);
  for (const c of cwds) {
    if (!c) continue;
    const k = dirKey(c);
    if (k === key || k.startsWith(key + "\\")) return true;
  }
  return false;
}

/**
 * Sistemin sunucularını bağlanırken verilen ayarlarla yeniden açan işlev
 * (launcher.ts bağlanırken kaydediyor; bağlantı kesilince siliniyor).
 */
export type SystemRestarter = (token: string) => Promise<boolean>;
const restarters = new Map<string, SystemRestarter>();

export function setSystemRestarter(projectDir: string, fn: SystemRestarter | null): void {
  if (fn) restarters.set(dirKey(projectDir), fn);
  else restarters.delete(dirKey(projectDir));
}

export function getSystemRestarter(projectDir: string): SystemRestarter | null {
  return restarters.get(dirKey(projectDir)) ?? null;
}
