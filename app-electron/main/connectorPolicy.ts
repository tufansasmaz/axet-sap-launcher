// ---------------------------------------------------------------------------
// "Bu axet-code çağrısında bağlayıcılar açık mı?" — TEK KARAR NOKTASI
// ---------------------------------------------------------------------------
// Bu dosya var, çünkü karar eskiden SADECE sohbette veriliyordu ve adı da
// öyleydi (`chatConnectorMode`). Kullanıcının isteği (2026-09-04): *"eğer
// uygulamalar bağlıysa her yerden erişilebilsin bunlara yapayzeka ile
// konuştuğumuz"*. Yapay zekâyla konuşulan ÜÇ yüzey var ve üçü de ayrı ayrı
// `axet-code` spawn ediyor:
//
//   - axetChat.ts          — axet.code sohbeti
//   - axetFlowsAgent.ts    — akış kuran ajan
//   - sapGuiScriptAgent.ts — SAP GUI'yi süren ajan
//
// Son ikisi bir JSON aksiyon protokolü konuşuyor ve eskiden bağlayıcıları
// KOŞULSUZ kapatıyorlardı. Bu, "bağlıysa her yerde" ile çelişiyordu:
// kullanıcı SAP GUI ajanına "şu tabloyu aç ve sonucu bana mail at" diyemezdi.
// MCP araç çağrıları axet-code'un KENDİ ajan döngüsünün içinde olup bitiyor,
// stdout'a yine sadece nihai cevap düşüyor — yani JSON protokolü bundan
// zarar GÖRMÜYOR. Tek maliyet süre, o da aşağıdaki kapıyla sınırlanıyor.
//
// İKİ KAPI, sırayla:
//   1. Sağlayıcı BAĞLI MI (`connectorEnabled`)? Hiçbiri bağlı değilse hiçbir
//      çağrıda kurulmaz — kullanıcının "Bağlantıyı Kes"i budur.
//   2. Kip (`connectorMode`): `always` her çağrıda, `auto` metne bakarak.
// ---------------------------------------------------------------------------

import type { AppConfig, ConnectorProvider } from "../shared/types";
import { loadConfig } from "./store";

// `auto` kipinin sözlüğü. TR ve EN birlikte, çünkü kullanıcı iki dili aynı
// cümlede karıştırıyor ("outlook'ta bugünkü meeting'ler"). Fazladan açmak
// çağrıyı yavaşlatır, eksik açmak ajanı aracsız bırakır — ikincisi daha
// kötü, çünkü kullanıcı yavaş bir cevap değil YANLIŞ bir cevap alır
// ("erişimim yok"). Bu yüzden liste bilinçli olarak geniş tutuldu.
export const CONNECTOR_HINT_PATTERN =
  /(outlook|sharepoint|onedrive|e-?posta|e-?mail|mail|inbox|gelen kutu|giden kutu|takvim|calendar|toplant|meeting|randevu|appointment|davetiye|invite|out ?of ?office|otomatik yanıt|taslak|draft)/i;

/** Kullanıcının "Bağlan" dediği sağlayıcılar. */
export function enabledProviders(config: AppConfig): ConnectorProvider[] {
  const enabled = config.connectorEnabled ?? {};
  return (Object.keys(enabled) as ConnectorProvider[]).filter((p) => enabled[p] === true);
}

/** En az bir sağlayıcı bağlı mı? Ekrandaki/rozeti besleyen tek soru. */
export function anyConnectorEnabled(config: AppConfig): boolean {
  return enabledProviders(config).length > 0;
}

/**
 * Bu çağrıda bağlayıcılar kurulsun mu?
 *
 * @param texts Kararın dayanacağı KULLANICI metinleri. Ajanların kendi
 *   sistem prompt'u BURAYA VERİLMEMELİ: içinde "mail" geçen bir node
 *   kataloğu ya da araç listesi her turu gereksizce yavaşlatırdı. Çağıran,
 *   yalnızca kullanıcının yazdığını geçirir.
 */
export function shouldUseConnectors(texts: (string | undefined | null)[]): boolean {
  const config = loadConfig();
  if (!anyConnectorEnabled(config)) return false;
  if (config.connectorMode === "always") return true;
  return texts.some((text) => Boolean(text) && CONNECTOR_HINT_PATTERN.test(text as string));
}
