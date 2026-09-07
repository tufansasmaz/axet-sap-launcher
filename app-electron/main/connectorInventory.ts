// ---------------------------------------------------------------------------
// Bağlayıcıların BEDELİ — "şu an kaç araç taşıyorum"
// ---------------------------------------------------------------------------
// Uygulama Bağlantıları ekranı bugüne kadar tek bir soruyu cevaplıyordu:
// "Outlook bağlı mı?". Cevaplamadığı soru şuydu: bağlı olmasının bedeli ne.
//
// ÖLÇÜM (2026-09-05, connectorHealth.ts başlığında ayrıntısı):
//   dört bağlayıcı kaydı = 92 araç ≈ tur başına 153.000 jeton.
//   kayıtların bir kısmı yerelden kapatıldığında: 42 araç.
//
// Bu bedel HER TURDA ödeniyor ve model o araçları hiç çağırmasa bile ödeniyor
// — araç TANIMLARI bağlama giriyor. Kullanıcının bunu görebileceği hiçbir yer
// yoktu; portalde biriken tekrarlı kayıtlar sessizce her turu pahalılaştırıyor.
//
// KAYITLAR NEREDEN GELİYOR: axet-code'un kendi günlüğündeki senkronizasyon
// bloğundan (bkz. axetCodeLog.ts). Bu, hesaptaki kayıtların tam dökümü —
// portale HİÇ istek atmadan (bkz. agenticConnectors.ts başlığı).
//
// TAHMİN OLDUĞU SÖYLENİYOR, ÇÜNKÜ TAHMİN. Günlük kayıt BAŞINA araç sayısı
// YAZMIYOR — ne günlükte ne oturum veritabanında böyle bir alan var (2026-09-07
// tarihinde canlı günlük tarandı; araçla ilgili tek sayısal alan
// `tool_call_count`). Elimizdeki tek çapa yukarıdaki tek ölçüm, o yüzden
// buradaki sayı ondan TÜRETİLİYOR ve arayüzde "≈" ile, ölçümün tarihiyle
// birlikte gösteriliyor. Kayıt başına gerçek araç sayısını uyduran bir sütun
// koymak, ölçülmemiş bir şeyi ölçülmüş gibi göstermek olurdu.
// ---------------------------------------------------------------------------

import { SYNC_TAIL, readLogTail } from "./axetCodeLog";
import { locallyDisabledConnectors } from "./connectorHealth";
import type { ConnectorInventory, ConnectorRecord } from "../shared/types";

/** Ölçümün kendisi — türetilen her sayı buradan çıkıyor. */
export const COST_ANCHOR = {
  measuredAt: "2026-09-05",
  records: 4,
  tools: 92,
  tokens: 153_000
} as const;

/** Kayıt başına araç ve araç başına jeton — tek çapadan türetilmiş oranlar. */
const TOOLS_PER_RECORD = COST_ANCHOR.tools / COST_ANCHOR.records;
const TOKENS_PER_TOOL = COST_ANCHOR.tokens / COST_ANCHOR.tools;

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
    return { known: false, records: [], activeCount: 0, estimatedTools: 0, estimatedTokens: 0, anchor: COST_ANCHOR };
  }
  const disabled = new Set(disabledUuids.map((x) => x.toLowerCase()));
  const merged = records.map((record) => ({
    ...record,
    disabledInLog: record.disabledInLog || disabled.has(record.uuid)
  }));
  const activeCount = merged.filter((record) => !record.disabledInLog).length;
  const estimatedTools = Math.round(activeCount * TOOLS_PER_RECORD);
  return {
    known: true,
    records: merged,
    activeCount,
    estimatedTools,
    estimatedTokens: Math.round(estimatedTools * TOKENS_PER_TOOL),
    anchor: COST_ANCHOR
  };
}

/** Diskten okuyup birleştirir — IPC'nin çağırdığı tek işlev. */
export function readConnectorInventory(cwd: string): ConnectorInventory {
  const text = cwd ? readLogTail(cwd, SYNC_TAIL) : null;
  return buildInventory(text === null ? null : parseConnectorBlock(text), locallyDisabledConnectors());
}
