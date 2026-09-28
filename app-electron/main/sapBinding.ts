import type { SystemCredentials } from "../shared/types";

// NTT Studio'nun bir sisteme bağlanırken ADT motoruna verdiği bağlantı: adres,
// client, kullanıcı. İki yere gidiyor ve ikisi AYNI nesneden yazılıyor:
//
//   * `.conn_adt` (`buildConnAdt`): motor SAP'a bu dosyadaki değerlerle gidiyor.
//   * 8787'deki sunucunun ortamı (`applySapBindingEnv`): sarmalayıcı sunucular
//     (`ntt_binding.py`) her araç çağrısında `.conn_adt`'yi bununla
//     karşılaştırıp farklıysa çağrıyı SAP'a göndermiyor.
//
// Neden: `.conn_adt` ajanın klasöründe, ajan onu değiştirebiliyor; sunucunun
// ortamını değiştiremiyor. Ajan adresi başka bir sisteme (QA/PRD) çevirirse
// NTT Studio'nun onay penceresi yine bağlanılan sistemi gösterir, kullanıcı onu
// onaylar, yazma başka sisteme giderdi. İki değer ayrı hesaplansaydı meşru bir
// bağlantıda da farklı çıkabilirdi (biri kırpılmış, öbürü değil; biri RFC
// köprüsünün adresi, öbürü keşfedilen HTTPS adresi) ve her çağrı reddedilirdi.
//
// Parola bu nesnede YOK: ortama konmuyor, karşılaştırılmıyor. Aynı adres +
// client + kullanıcı aynı sistemdeki aynı hesap demek.

export interface SapBinding {
  /** `.conn_adt`'deki `ADT_SAP_URL`: RFC köprüsünde yerel köprü adresi. */
  url: string;
  /** `.conn_adt`'deki `ADT_SAP_CLIENT`; boşsa satır yazılmıyor (BTP). */
  client: string;
  /** `.conn_adt`'deki `ADT_SAP_USER`, olduğu gibi. */
  user: string;
}

/** Sarmalayıcı sunucuların (ntt_binding.py) okuduğu ortam değişkenleri. */
export const SAP_BINDING_ENV = {
  url: "NTT_STUDIO_SAP_URL",
  client: "NTT_STUDIO_SAP_CLIENT",
  user: "NTT_STUDIO_SAP_USER"
} as const;

/**
 * Motorun bağlantı anahtarları. Launcher'ın kendi ortamında bunlardan biri
 * varsa (kullanıcı ortam değişkeni) çocuğa miras kalıyor ve motor içe
 * aktarılırken `.conn_adt`'deki değerin ÖNÜNE geçiyor (`load_dotenv`
 * override=False). Hem yanlış sisteme gitmenin bir yolu, hem de sarmalayıcının
 * her çağrıyı haklı olarak reddetmesine yol açardı. Bağlantının tek kaynağı
 * `.conn_adt` olsun diye çocuğun ortamından siliniyor.
 */
const INHERITED_ENGINE_KEYS = ["ADT_SAP_URL", "ADT_SAP_CLIENT", "ADT_SAP_USER", "ADT_SAP_PASSWORD"] as const;

export function sapBindingFor(
  credentials: SystemCredentials,
  verifiedUrl: string,
  rfcBridgePort?: number | null
): SapBinding {
  return {
    url: rfcBridgePort != null ? `http://127.0.0.1:${rfcBridgePort}` : verifiedUrl,
    client: credentials.client.trim(),
    user: credentials.username
  };
}

/**
 * Çocuğun ortamına beklenen bağlantıyı koy. Kademe (`NTT_STUDIO_SAP_TIER`)
 * ile aynı desen: miras kalmış değer önce siliniyor, yalnızca bizimki kalıyor.
 * Bağlantı verilmemişse üçü de yok (sarmalayıcı eski davranışa döner, uyarı
 * yazar) — mirastan gelen bir değer NTT Studio'nun bağlantısı sanılmasın.
 */
export function applySapBindingEnv(env: NodeJS.ProcessEnv, binding: SapBinding | null | undefined): void {
  for (const key of Object.values(SAP_BINDING_ENV)) delete env[key];
  for (const key of INHERITED_ENGINE_KEYS) delete env[key];
  if (!binding) return;
  env[SAP_BINDING_ENV.url] = binding.url;
  // Boş client ortama boş değer olarak gitmiyor (Windows'ta boş değerli
  // değişken tutarlı taşınmıyor); yokluğu sarmalayıcı "client yok" okuyor.
  if (binding.client) env[SAP_BINDING_ENV.client] = binding.client;
  env[SAP_BINDING_ENV.user] = binding.user;
}

/** Sunucuyu yeniden kullanmadan önce: ortamına verilen bağlantı aynı mı. */
export function sapBindingKey(binding: SapBinding | null | undefined): string {
  return binding ? JSON.stringify([binding.url, binding.client, binding.user]) : "";
}
