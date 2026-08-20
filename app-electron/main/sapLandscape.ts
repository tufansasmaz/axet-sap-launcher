import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { SapLandscape, SapNode, SapItem, SapService } from "../shared/types";

const ARRAY_TAGS = new Set(["Include", "Workspace", "Node", "Item", "Router", "Service"]);
// Include'lar bazen ağ paylaşımına (SAP Common merkezi landscape dosyası)
// işaret eder — VPN kapalıyken/ağ yavaşken bu okuma Windows'un varsayılan
// UNC timeout'una (onlarca saniye) kadar sürebilir. Electron main process
// tek thread'li olduğu için senkron bir okuma burada tıkanırsa TÜM uygulama
// (pencere sürükleme, buton tıklamaları, her şey) donar — "uygulama çok
// yavaş açılıyor" şikayetinin en olası kök sebebi budur. Bu yüzden: (1) fs
// okumaları async (fs/promises), (2) her include için ayrı bir üst sınır
// (bu süre geçerse o include'u yoksay, ana landscape'i beklemeye devam
// etme), (3) include'lar sırayla değil paralel okunuyor.
const INCLUDE_TIMEOUT_MS = 4000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (tagName) => ARRAY_TAGS.has(tagName)
});

interface RawService {
  uuid: string;
  systemId: string;
  name: string;
  type: string;
  server: string | null;
  routerId: string | null;
  memo: string | null;
}

interface RawRouter {
  uuid: string;
  router: string;
}

export interface ServiceCredentials {
  username: string | null;
  password: string | null;
}

function defaultLandscapePath(): string {
  return path.join(homedir(), "AppData", "Roaming", "SAP", "Common", "SAPUILandscape.xml");
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

async function safeReadXml(filePath: string, timeoutMs = INCLUDE_TIMEOUT_MS): Promise<any | null> {
  return withTimeout(
    (async () => {
      try {
        const xml = await readFile(filePath, "utf-8");
        return parser.parse(xml);
      } catch {
        return null;
      }
    })(),
    timeoutMs,
    null
  );
}

async function readAllRoots(localPath: string): Promise<any[]> {
  const localRoot = await safeReadXml(localPath);
  if (!localRoot) return [];
  const paths = includePaths(localRoot);
  const includedRoots = await Promise.all(paths.map((p) => safeReadXml(p)));
  return [localRoot, ...includedRoots.filter((r): r is any => r !== null)];
}

function includePaths(root: any): string[] {
  const includes = root?.Landscape?.Includes?.Include ?? [];
  const list = Array.isArray(includes) ? includes : [includes];
  return list
    .map((inc: any) => inc?.["@_url"] as string | undefined)
    .filter((url: string | undefined): url is string => !!url)
    .map((url) => decodeURIComponent(url.replace(/^file:\/\/\//, "")))
    .map((p) => p.replace(/\//g, path.sep));
}

function extractMemoText(svc: any): string | null {
  const memo = svc?.Memo;
  if (memo === undefined || memo === null) return null;
  if (typeof memo === "string") return memo;
  if (typeof memo === "object" && "#text" in memo) return String(memo["#text"]);
  return null;
}

function collectServices(root: any, into: Map<string, RawService>) {
  const services = root?.Landscape?.Services?.Service ?? [];
  const list: any[] = Array.isArray(services) ? services : [services];
  for (const svc of list) {
    if (!svc?.["@_uuid"]) continue;
    into.set(svc["@_uuid"], {
      uuid: svc["@_uuid"],
      systemId: svc["@_systemid"] ?? "",
      name: svc["@_name"] ?? svc["@_systemid"] ?? "Sistem",
      type: svc["@_type"] ?? "SAPGUI",
      server: svc["@_server"] ?? null,
      routerId: svc["@_routerid"] ?? null,
      memo: extractMemoText(svc)
    });
  }
}

function collectRouters(root: any, into: Map<string, RawRouter>) {
  const routers = root?.Landscape?.Routers?.Router ?? [];
  const list: any[] = Array.isArray(routers) ? routers : [routers];
  for (const r of list) {
    if (!r?.["@_uuid"]) continue;
    into.set(r["@_uuid"], { uuid: r["@_uuid"], router: r["@_router"] ?? r["@_name"] ?? "" });
  }
}

function toService(raw: RawService, routers: Map<string, RawRouter>): SapService {
  let host: string | null = null;
  let port: number | null = null;
  if (raw.server && raw.server.includes(":")) {
    const [h, p] = raw.server.split(":");
    host = h || null;
    const parsedPort = Number.parseInt(p, 10);
    port = Number.isFinite(parsedPort) ? parsedPort : null;
  } else if (raw.server) {
    host = raw.server;
  }
  const router = raw.routerId ? routers.get(raw.routerId) ?? null : null;
  return {
    uuid: raw.uuid,
    systemId: raw.systemId,
    name: raw.name,
    type: raw.type,
    host,
    port,
    raw: raw.server ?? "",
    routerId: raw.routerId,
    routerString: router?.router ?? null,
    username: null
  };
}

function buildNode(rawNode: any, services: Map<string, RawService>, routers: Map<string, RawRouter>): SapNode {
  const nodes: SapNode[] = [];
  const items: SapItem[] = [];

  const childNodes = rawNode?.Node ?? [];
  for (const child of Array.isArray(childNodes) ? childNodes : [childNodes]) {
    if (child) nodes.push(buildNode(child, services, routers));
  }

  const childItems = rawNode?.Item ?? [];
  for (const child of Array.isArray(childItems) ? childItems : [childItems]) {
    if (!child?.["@_uuid"]) continue;
    const serviceId = child["@_serviceid"] as string | undefined;
    const rawService = serviceId ? services.get(serviceId) ?? null : null;
    items.push({
      uuid: child["@_uuid"],
      service: rawService ? toService(rawService, routers) : null
    });
  }

  return {
    uuid: rawNode?.["@_uuid"] ?? randomUUID(),
    name: rawNode?.["@_name"] ?? "Adsız",
    nodes,
    items
  };
}

async function loadRawServices(overridePath?: string | null): Promise<Map<string, RawService>> {
  const localPath = overridePath || defaultLandscapePath();
  const services = new Map<string, RawService>();
  if (!existsSync(localPath)) return services;

  const roots = await readAllRoots(localPath);
  for (const root of roots) collectServices(root, services);
  return services;
}

export async function loadLandscape(overridePath?: string | null): Promise<SapLandscape> {
  const localPath = overridePath || defaultLandscapePath();
  if (!existsSync(localPath)) {
    return { customers: [], sourceFile: localPath, loadedAt: new Date().toISOString() };
  }

  const roots = await readAllRoots(localPath);
  if (roots.length === 0) {
    return { customers: [], sourceFile: localPath, loadedAt: new Date().toISOString() };
  }

  const services = new Map<string, RawService>();
  const routers = new Map<string, RawRouter>();
  for (const root of roots) {
    collectServices(root, services);
    collectRouters(root, routers);
  }

  const customers: SapNode[] = [];
  for (const root of roots) {
    const workspaces = root?.Landscape?.Workspaces?.Workspace ?? [];
    const list: any[] = Array.isArray(workspaces) ? workspaces : [workspaces];
    for (const ws of list) {
      if (!ws) continue;
      customers.push(buildNode(ws, services, routers));
    }
  }

  return { customers, sourceFile: localPath, loadedAt: new Date().toISOString() };
}

export async function getServiceCredentials(serviceUuid: string, overridePath?: string | null): Promise<ServiceCredentials> {
  const services = await loadRawServices(overridePath);
  const svc = services.get(serviceUuid);
  if (!svc?.memo) return { username: null, password: null };

  const lines = svc.memo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { username: null, password: null };
  if (lines.length === 1) return { username: lines[0], password: null };
  return { username: lines[0], password: lines[1] };
}

// SAP Logon'un kendi "Memo" alanı bu launcher tarafından kullanıcı adı/şifre
// (ilk iki satır) olarak okunuyor (yukarıdaki getServiceCredentials) — bu
// SADECE kimlik bilgisi otomatik doldurma için kullanılan bir TAHMİN,
// Memo'nun "gerçek" yapısı değil. Yorum alanı için bu tahmine GÜVENİLMEZ:
// canlı veride bazı sistemlerde kullanıcı adından önce bir etiket satırı
// (örn. "Canlı") geliyor — böyle durumlarda "ilk 2 satırı atla" mantığı
// gerçek yorum metninin bir kısmını (etiketi ve/veya ilk kimlik satırını)
// sessizce yutuyordu, kullanıcı "yazdığım metin gelmiyor" şikayetiyle
// karşılaştı. Kesin çözüm: HİÇBİR satır atlanmadan Memo'nun TAMAMI
// olduğu gibi döndürülüyor — SAP Logon'da görünen ne varsa launcher'da
// da birebir aynı görünür, hiçbir metin kaybolmaz.
export async function getServiceSapLogonNote(serviceUuid: string, overridePath?: string | null): Promise<string | null> {
  const services = await loadRawServices(overridePath);
  const svc = services.get(serviceUuid);
  if (!svc?.memo) return null;

  const trimmed = svc.memo.replace(/\r\n/g, "\n").trim();
  return trimmed.length > 0 ? trimmed : null;
}
