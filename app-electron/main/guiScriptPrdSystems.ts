import type { SapLandscape, SapNode, SystemTier } from "../shared/types";
import type { GuiScriptPrdSystem } from "./sapGuiScriptManager";

// SAP GUI Scripting köprüsünün yazmayı reddedeceği sistemler.
//
// KAYNAK, ADT kapısınınkiyle AYNI: kullanıcının NTT Studio'da sisteme verdiği
// önem derecesi (`config.systemTiers`, anahtarı SapService.uuid). Köprü
// yalnızca SAP GUI oturumunun `Info.SystemName`/`Info.Client`'ını görüyor; bu
// yüzden uuid burada landscape'ten SID'e çevriliyor.
//
// YALNIZCA PRD. Tier'ı işaretlenmemiş sistem PRD sayılmıyor: projede
// işaretlenmemiş sistem ADT için QA'ya düşüyor (launcher.ts `effectiveTier`),
// PRD'ye değil. QA'da SAP GUI ile yazmak (test senaryosu yürütmek) meşru bir
// iş; köprünün kapısı "canlı sistemde yalnızca görüntüleme" kuralının yeri.
//
// MANDANT BOŞ gönderiliyor, yani PRD SID'inin HER mandantı kapalı. Elimizdeki
// tek mandant bilgisi `lastCredentials[uuid].client` — kullanıcının o sisteme
// en son ADT ile girdiği mandant, sistemin "üretim mandantı" değil. Onu
// göndermek aynı PRD sisteminin 000'ına ya da ikinci mandantına yazmayı
// serbest bırakırdı. Bedeli: başka bir müşterinin aynı SID'li PRD olmayan
// sistemi de kapanır — yanlış yöne değil, güvenli yöne hata.
export function collectPrdSystems(
  landscape: SapLandscape,
  systemTiers: Record<string, SystemTier> | undefined
): GuiScriptPrdSystem[] {
  const prdUuids = new Set(
    Object.entries(systemTiers ?? {})
      .filter(([, tier]) => tier === "PRD")
      .map(([uuid]) => uuid)
  );
  if (prdUuids.size === 0) return [];

  const sids = new Set<string>();
  const walk = (node: SapNode): void => {
    for (const item of node.items ?? []) {
      const service = item.service;
      if (!service || !prdUuids.has(service.uuid)) continue;
      const sid = (service.systemId ?? "").trim().toUpperCase();
      if (sid) sids.add(sid);
    }
    for (const child of node.nodes ?? []) walk(child);
  };
  for (const customer of landscape.customers) walk(customer);

  return [...sids].sort().map((sid) => ({ sid, client: "" }));
}
