// ---------------------------------------------------------------------------
// Bağlayıcıların BEDELİ — "şu an kaç araç taşıyorum"
// ---------------------------------------------------------------------------
// Uygulama Bağlantıları ekranı bugüne kadar tek bir soruyu cevaplıyordu:
// "Outlook bağlı mı?". Cevaplamadığı soru şuydu: bağlı olmasının bedeli ne.
//
// Bu bedel HER TURDA ödeniyor ve model o araçları hiç çağırmasa bile ödeniyor
// — araç TANIMLARI bağlama giriyor. Kullanıcının bunu görebileceği hiçbir yer
// yoktu; portalde biriken tekrarlı kayıtlar sessizce her turu pahalılaştırıyor.
//
// KAYITLAR NEREDEN GELİYOR: axet-code'un kendi günlüğündeki senkronizasyon
// bloğundan (bkz. axetCodeLog.ts). Bu, hesaptaki kayıtların tam dökümü —
// portale HİÇ istek atmadan (bkz. agenticConnectors.ts başlığı).
//
// ARAÇ SAYISI ARTIK KAYIT BAŞINA DEĞİL, TÜR BAŞINA (2026-09-08).
//
// Önceki sürüm tek bir çapadan (dört kayıt = 92 araç) "kayıt başına 23 araç"
// türetiyordu. İki ayrı yerden yanlıştı ve kullanıcı ikisini de gördü
// (*"bağlayıcı maliyet kutusu 92 diyosun da bizde o kadar değil ki"*):
//
//   1. 92, o makinenin O GÜNKÜ portal durumuydu — kullanıcının kendi durumu
//      değil. Dayanak satırında yazılı olması onu bir tahmin dayanağı yapmıyor,
//      ekranda kendi sayısı sanılıyor.
//   2. Kayıt başına araç sayısı SABİT DEĞİL: 2026-09-08'de bağlayıcı
//      penceresinden (ctrl+b) okunan gerçek sayılar Outlook 25, SharePoint 17.
//      Düzgün ortalama bile 46 derdi, doğrusu 42.
//
// Bu yüzden sayı artık kaydın TÜRÜNDEN geliyor ve türü ölçülmemiş bir kayıt
// ortalamaya düşerken bunu ekranda söylüyor. Günlükte kayıt başına araç sayısı
// yazmıyor — ne günlükte ne oturum veritabanında böyle bir alan var (2026-09-07
// tarihinde canlı günlük tarandı; araçla ilgili tek sayısal alan
// `tool_call_count`) — yani ölçüm, bağlayıcı penceresini elle okumaktan
// geliyor ve yeni bir tür çıktığında bu tablo BÜYÜTÜLMELİ.
//
// Jeton tarafı hâlâ tek çapadan türetiliyor (2026-09-05: 92 araç ≈ 153.000
// jeton → araç başına ~1.663) ve arayüzde "≈" ile gösteriliyor.
// ---------------------------------------------------------------------------

import { SYNC_TAIL, readLogTail } from "./axetCodeLog";
import { locallyDisabledConnectors } from "./connectorHealth";
import type { ConnectorInventory, ConnectorRecord } from "../shared/types";

/** Bağlayıcı penceresinden (ctrl+b) elle okunan araç sayıları — TÜR başına. */
const TOOLS_BY_TYPE: Record<string, number> = {
  outlook: 25,
  sharepoint: 17
};

/** Ölçüm çapası — türetilen her sayı buradan çıkıyor, arayüz de bunu yazıyor. */
export const COST_ANCHOR = {
  measuredAt: "2026-09-08",
  toolsByType: TOOLS_BY_TYPE,
  /** Türü ölçülmemiş kayıt: ölçülenlerin ortalaması, yukarı yuvarlanmadan. */
  fallbackTools: Math.round(
    Object.values(TOOLS_BY_TYPE).reduce((sum, n) => sum + n, 0) / Object.keys(TOOLS_BY_TYPE).length
  ),
  tokensMeasuredAt: "2026-09-05",
  /** 153.000 jeton / 92 araç. */
  tokensPerTool: Math.round(153_000 / 92)
} as const;

/** Bir kaydın araç sayısı ve bunun ÖLÇÜLMÜŞ mü tahmin mi olduğu. */
function toolsFor(type: string): { tools: number; measured: boolean } {
  const measured = TOOLS_BY_TYPE[type.toLowerCase()];
  return measured === undefined ? { tools: COST_ANCHOR.fallbackTools, measured: false } : { tools: measured, measured: true };
}

/**
 * Günlüğün son senkronizasyon bloğundaki kayıtlar.
 *
 * `null` = bilinmiyor (günlük yok, blok yarım, ya da okuma penceresinin
 * dışında kalmış). Boş dizi ise "hiç kayıt yok" demek. Ayrım
 * `readLiveConnectors`'la aynı sebeple korunuyor: yarım bir bloğa bakıp
 * "bağlayıcın yok" demek, sessizce yanlış bilgi vermek olurdu.
 *
 * Diskten AYRI duruyor ki test edilebilsin.
 */
export function parseConnectorBlock(text: string): ConnectorRecord[] | null {
  const lines = text.split(/\r?\n/);

  // Sondan başlayarak son `complete`, oradan geriye onun `start`'ı.
  let end = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].includes('"connector.sync.complete"')) {
      end = i;
      break;
    }
    // Tamamlanmamış blok = senkronizasyon hâlâ sürüyor.
    if (lines[i].includes('"connector.sync.start"')) return null;
  }
  if (end < 0) return null;

  const records: ConnectorRecord[] = [];
  for (let i = end - 1; i >= 0; i -= 1) {
    if (lines[i].includes('"connector.sync.start"')) {
      // Blok dosyada eskiden yeniye sıralı; geriye tarandığı için ters çevriliyor.
      return records.reverse();
    }
    const record = parseResolvedLine(lines[i]);
    if (record) records.push(record);
  }
  // `start`'a hiç ulaşamadık: blok okuma penceresinin dışında kalmış.
  return null;
}

function parseResolvedLine(line: string): ConnectorRecord | null {
  if (!line.includes('"connector.sync.resolved"')) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    // Yarım yazılmış bir satır — bloğun tamamını çöpe atmaya değmez.
    return null;
  }
  const mcpName = typeof parsed.mcp_name === "string" ? parsed.mcp_name : "";
  const uuid = mcpName.startsWith("conn_") ? mcpName.slice(5).toLowerCase() : "";
  if (!uuid) return null;
  return {
    uuid,
    // Ad boşsa tipe düşülüyor: adsız bir satır kullanıcıya hiçbir şey söylemez.
    displayName: typeof parsed.display_name === "string" && parsed.display_name ? parsed.display_name : uuid,
    type: typeof parsed.type === "string" ? parsed.type : "",
    url: typeof parsed.url === "string" ? parsed.url : "",
    disabledInLog: parsed.disabled === true
  };
}

/**
 * Kayıtları ve YEREL kapatma durumunu birleştirip bedeli hesaplar.
 *
 * Yerel kapatma listesi log'daki `disabled` alanının ÜSTÜNE biniyor: günlük
 * süreç açılışında yazılıyor, durum dosyası ise sonradan (TUI'den ya da
 * connectorHealth'ten) değişebiliyor. Yani günlük "o an öyleydi", durum
 * dosyası "şu an öyle".
 */
export function buildInventory(records: ConnectorRecord[] | null, disabledUuids: readonly string[]): ConnectorInventory {
  if (!records) {
    return {
      known: false,
      records: [],
      activeCount: 0,
      estimatedTools: 0,
      estimatedTokens: 0,
      unmeasuredCount: 0,
      anchor: COST_ANCHOR
    };
  }
  const disabled = new Set(disabledUuids.map((x) => x.toLowerCase()));
  const merged = records.map((record) => ({
    ...record,
    disabledInLog: record.disabledInLog || disabled.has(record.uuid),
    ...toolsFor(record.type)
  }));
  const active = merged.filter((record) => !record.disabledInLog);
  // Toplam, kayıtların KENDİ sayılarından toplanıyor: tek bir ortalamayla
  // çarpmak, 25 ile 17'yi aynı sayan eski hatanın ta kendisiydi.
  const estimatedTools = active.reduce((sum, record) => sum + record.tools, 0);
  return {
    known: true,
    records: merged,
    activeCount: active.length,
    estimatedTools,
    estimatedTokens: Math.round(estimatedTools * COST_ANCHOR.tokensPerTool),
    // Yalnızca AÇIK kayıtlar: kapalı bir kaydın türünün ölçülmemiş olması
    // ekrandaki sayıyı etkilemiyor, o hâlde uyarısı da çıkmamalı.
    unmeasuredCount: active.filter((record) => !record.measured).length,
    anchor: COST_ANCHOR
  };
}

/** Diskten okuyup birleştirir — IPC'nin çağırdığı tek işlev. */
export function readConnectorInventory(cwd: string): ConnectorInventory {
  const text = cwd ? readLogTail(cwd, SYNC_TAIL) : null;
  return buildInventory(text === null ? null : parseConnectorBlock(text), locallyDisabledConnectors());
}
