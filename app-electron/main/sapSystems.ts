import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import type { SystemTier } from "../shared/types";

// ---------------------------------------------------------------------------
// Bağlı SAP sistemlerinin kaydı — çoklu sistem (2026-11-12)
// ---------------------------------------------------------------------------
// Tasarım: docs/superpowers/specs/2026-11-12-coklu-sistem-design.md
//
// Sistem = proje klasörü. `.conn_adt`, onay oturumu ve sohbet bağlaması zaten
// klasör başına; sohbetin/bölmenin `cwd`'si hangi sisteme ait olduğunu söylüyor.
// Her sistemin kendi ADT sunucusu (portu + jetonu) ve gerekirse RFC köprüsü var.
//
// JETON YALNIZ BURADA, BELLEKTE. `process.env`'e yazılmıyor: eskiden tek jeton
// global ortamdan her alt sürece geçiyordu; şimdi bir süreç açılırken yalnız
// kendi sisteminin jetonunu alıyor (`adtEnvForCwd`). Böylece QA bölmesinin
// ortamındaki jeton DEV'in yazan sunucusunu açmıyor. Renderer'a da gitmiyor
// (`ActiveSapContext` jeton taşımıyor).
// ---------------------------------------------------------------------------

/** İlk sistemin ADT portu — geriye uyum (beceriler ve eski notlar 8787 diyor). */
export const ADT_DEFAULT_PORT = 8787;
/** İlk RFC köprüsünün portu — geriye uyum. */
export const RFC_DEFAULT_PORT = 8788;
/** Dinamik portlar: 8790 salt okunur sarmalayıcının elle varsayılanı, aralık onun dışında. */
export const DYNAMIC_PORT_FIRST = 8800;
export const DYNAMIC_PORT_LAST = 8899;
/** Eşzamanlı sistem sınırı: her sistem 1-2 Python süreci (~60-120 MB). */
export const MAX_SYSTEMS = 4;

export interface SystemIdentity {
  uuid: string;
  systemId: string;
  client: string;
  user: string;
  tier: SystemTier | null;
}

export interface SystemRecord extends SystemIdentity {
  projectDir: string;
  token: string;
  adtPort: number | null;
  rfcPort: number | null;
  lastUsedAt: number;
}

const systems = new Map<string, SystemRecord>();
let focusKey: string | null = null;

export function dirKey(p: string): string {
  return p.replace(/[\\/]+/g, "\\").replace(/\\+$/, "").toLowerCase();
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Bağlanırken kaydı açar ya da günceller; jeton ve portlar korunur. Odak buna geçer. */
export function upsertSystem(projectDir: string, id: SystemIdentity, now = Date.now()): SystemRecord {
  const key = dirKey(projectDir);
  const prev = systems.get(key);
  const rec: SystemRecord = {
    ...id,
    projectDir,
    token: prev?.token ?? newToken(),
    adtPort: prev?.adtPort ?? null,
    rfcPort: prev?.rfcPort ?? null,
    lastUsedAt: now
  };
  systems.set(key, rec);
  focusKey = key;
  return rec;
}

export function getSystem(projectDir: string): SystemRecord | null {
  return systems.get(dirKey(projectDir)) ?? null;
}

export function listSystems(): SystemRecord[] {
  return [...systems.values()];
}

export function setSystemAdtPort(projectDir: string, port: number | null): void {
  const rec = systems.get(dirKey(projectDir));
  if (rec) rec.adtPort = port;
}

export function setSystemRfcPort(projectDir: string, port: number | null): void {
  const rec = systems.get(dirKey(projectDir));
  if (rec) rec.rfcPort = port;
}

export function touchSystem(projectDir: string, now = Date.now()): void {
  const rec = systems.get(dirKey(projectDir));
  if (rec) rec.lastUsedAt = now;
}

export function focusSystem(projectDir: string): boolean {
  const key = dirKey(projectDir);
  if (!systems.has(key)) return false;
  focusKey = key;
  touchSystem(projectDir);
  return true;
}

export function focusedSystem(): SystemRecord | null {
  return (focusKey && systems.get(focusKey)) || null;
}

/** Kaydı siler; odaktaysa odak en son kullanılan sisteme geçer. */
export function removeSystem(projectDir: string): SystemRecord | null {
  const key = dirKey(projectDir);
  const rec = systems.get(key) ?? null;
  systems.delete(key);
  if (focusKey === key) {
    const next = [...systems.entries()].sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt)[0];
    focusKey = next ? next[0] : null;
  }
  return rec;
}

/** Destek paketi maskelemesi için: bütün sistem jetonları. */
export function allSystemTokens(): string[] {
  return listSystems().map((s) => s.token);
}

/** `cwd`'nin ait olduğu sistem (klasörün kendisi ya da altı; en uzun eşleşme). */
export function systemForCwd(cwd: string): SystemRecord | null {
  if (!cwd) return null;
  const c = dirKey(cwd);
  let best: SystemRecord | null = null;
  let bestLen = -1;
  for (const [key, rec] of systems) {
    if ((c === key || c.startsWith(`${key}\\`)) && key.length > bestLen) {
      best = rec;
      bestLen = key.length;
    }
  }
  return best;
}

export interface AdtEnv {
  ABAP_HTTP_TOKEN: string;
  ABAP_HTTP_URL: string;
  ABAP_HTTP_PORT: string;
}

/**
 * Bir sürece (ajan, sohbet turu, terminal) verilecek ADT adresi + jetonu.
 * `cwd` bir sisteme aitse o sistem; değilse odaktaki (tek sistemde bugünkü
 * davranış). Sunucusu olmayan sistem için null — çağıran değişkenleri siler.
 */
export function adtEnvForCwd(cwd: string, opts: { touch?: boolean } = {}): AdtEnv | null {
  const rec = systemForCwd(cwd) ?? focusedSystem();
  if (!rec || !rec.adtPort) return null;
  if (opts.touch) rec.lastUsedAt = Date.now();
  return { ABAP_HTTP_TOKEN: rec.token, ABAP_HTTP_URL: `http://127.0.0.1:${rec.adtPort}`, ABAP_HTTP_PORT: String(rec.adtPort) };
}

const ADT_ENV_KEYS = ["ABAP_HTTP_TOKEN", "ABAP_HTTP_URL", "ABAP_HTTP_PORT"] as const;

/** Ortamı `cwd`'nin sistemine göre ayarlar: miras kalan değerler silinir, yalnız doğru sistem konur. */
export function applyAdtEnv<T extends Record<string, string | undefined>>(env: T, cwd: string, opts: { touch?: boolean } = {}): T {
  for (const k of ADT_ENV_KEYS) delete env[k];
  const adt = adtEnvForCwd(cwd, opts);
  if (adt) Object.assign(env, adt);
  return env;
}

/** Yeni sistem gelince sınır aşılıyorsa düşürülecek sistem (LRU); yoksa null. */
export function pickEviction(incomingDir: string, max = MAX_SYSTEMS): SystemRecord | null {
  if (systems.has(dirKey(incomingDir)) || systems.size < max) return null;
  return [...systems.values()].sort((a, b) => a.lastUsedAt - b.lastUsedAt)[0] ?? null;
}

/** 127.0.0.1:port'a bağlanılabiliyor mu (gerçekten bind ederek). */
export function portBindable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.listen(port, "127.0.0.1", () => srv.close(() => resolve(true)));
  });
}

/**
 * Sistemin portu. Sırayla: kayıtta zaten varsa o; varsayılan port başka
 * sistemde değilse varsayılan (boşluk DENENMİYOR — 8787'de önceki oturumdan
 * kalan sunucuyu sahiplik kanıtı mantığı çözüyor); değilse dinamik aralıkta
 * hiçbir sistemin tutmadığı ve bind edilebilen ilk port.
 */
export async function allocatePort(
  preferred: number,
  kind: "adt" | "rfc",
  projectDir: string,
  opts: { isFree?: (port: number) => Promise<boolean>; avoidPreferred?: boolean } = {}
): Promise<number> {
  const isFree = opts.isFree ?? portBindable;
  const own = getSystem(projectDir);
  const ownPort = own ? (kind === "adt" ? own.adtPort : own.rfcPort) : null;
  if (ownPort && !(opts.avoidPreferred && ownPort === preferred)) return ownPort;
  const key = dirKey(projectDir);
  const taken = new Set<number>();
  for (const [k, rec] of systems) {
    if (k === key) continue;
    if (rec.adtPort) taken.add(rec.adtPort);
    if (rec.rfcPort) taken.add(rec.rfcPort);
  }
  if (!opts.avoidPreferred && !taken.has(preferred)) return preferred;
  for (let p = DYNAMIC_PORT_FIRST; p <= DYNAMIC_PORT_LAST; p++) {
    if (taken.has(p)) continue;
    if (await isFree(p)) return p;
  }
  throw new Error(`no free port in ${DYNAMIC_PORT_FIRST}-${DYNAMIC_PORT_LAST}`);
}

export function resetSystemsForTest(): void {
  systems.clear();
  focusKey = null;
}
