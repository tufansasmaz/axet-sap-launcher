// ---------------------------------------------------------------------------
// Entegrasyon sağlığı — "bozuk olanı bir daha deneme"
// ---------------------------------------------------------------------------
// Kullanıcının axet.nttdata.com/agentic hesabında AYNI sağlayıcı için birden
// fazla entegrasyon kaydı var (tekrarlanan yetkilendirme denemelerinden
// kalıntı). Ajanın araç listesinde bunlar ayrı araçlar olarak görünüyor
// (`mcp_conn_<uuid>_outlook_read`) ve ajan hangisinin sağlam olduğunu
// bilmediği için listede İLK gördüğünü deniyor.
//
// ÖLÇÜM (2026-09-04, gerçek bir "son mailimi oku" turu, oturum veritabanından):
//
//   t=0s   → mcp_conn_c3c2a49d-…_outlook_read
//   t=6s   ← HTTP error 500 … "Integration c3c2a49d-… is in state 'ERROR';
//             complete the authorization flow before using it."
//   t=6s   → mcp_conn_df6566e3-…_outlook_read
//   t=16s  ← {'status': 'success', …}
//
// Yani 22 saniyelik turun ALTI SANİYESİ, sonucu baştan belli bir çağrıya
// gidiyordu. `axetChat.ts`'teki "vazgeçmeden önce alternatifi dene"
// hatırlatması bunu KURTARIYOR ama ÖNLEMİYOR — her turda aynı bedel yeniden
// ödeniyordu.
//
// Bu dosya bedeli bir KEZ ödetiyor: tur sırasında zaten okuduğumuz
// `tool_result` kayıtlarından hangi entegrasyonun bozuk, hangisinin sağlam
// olduğu öğreniliyor, sonuç config'e yazılıyor ve bir sonraki prompt'ta ajana
// "şunu çağırma, şunu tercih et" deniyor.
//
// İKİNCİ KALDIRAÇ (2026-09-05): prompt'a yazmak bozuk aracın araç TANIMINI
// listeden çıkarmıyor — model onu çağırmasa da tanımı her turda bağlama
// giriyor. Ölçüm: dört bağlayıcı kaydı = 92 araç ≈ tur başına 153.000 jeton.
// axet-code'un bağlayıcıları YERELDEN kapatılabiliyor ve kapatılan bir kaydın
// araçları hiç yüklenmiyor (diyalogda `0 tools`). Bu yüzden burada öğrenilen
// bozukluk artık axet-code'un kendi durum dosyasına da yazılıyor; ölçülen
// sonuç 92 -> 42 araç.
//
// NEDEN PORTALDEN SİLMİYORUZ: bu launcher tasarım gereği axet.nttdata.com'a
// HİÇ doğrudan istek atmıyor ve hiçbir token saklamıyor (bkz.
// agenticConnectors.ts başlığı) — erişimin tamamı axet-code'un kendi Okta
// oturumu üzerinden. Kaydı gerçekten silmek kullanıcının portaldeki işi;
// buradaki iş, silinene kadar onun bedelini ödememek. Yerel kapatma da o
// silmenin YERİNE geçmiyor: bu dosya yalnızca bu makinede geçerli.
//
// KARA LİSTE TEK BAŞINA KULLANILMIYOR — bilinçli. Bir entegrasyonu "çağırma"
// diye işaretlemek, kullanıcı portalden yetkilendirmeyi tamamladığında yanlışa
// düşer. Bu yüzden kural şu: bir uuid ancak AYNI SAĞLAYICI için çalıştığı
// bilinen başka bir uuid varsa dışlanıyor. Bilinen sağlam alternatif yoksa
// hiçbir şey söylenmiyor ve ajan eskisi gibi hepsini deniyor.
// ---------------------------------------------------------------------------

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { AxetDbMessage } from "./axetSessionDb";
import { loadConfig, saveConfig } from "./store";

/** `mcp_conn_<uuid>_<saglayici>_<eylem>` → uuid + sağlayıcı. */
const RE_MCP_TOOL = /^mcp_conn_([0-9a-f-]{8,})_([a-z0-9]+)_/i;

// Entegrasyonun kendisinin bozuk olduğunu söyleyen imzalar. Aracın NORMAL bir
// başarısızlığı (arama sonuç bulamadı, klasör yok) buraya girmemeli: onu
// bozukluk sayarsak sağlam bir entegrasyonu haksız yere dışlarız.
const RE_BROKEN =
  /is in state '(?:ERROR|UNAUTHORIZED|EXPIRED)'|complete the authorization flow|integration is unauthorized|authorization flow before using/i;

// Kayıtların ömrü. Kullanıcı portalde yetkilendirmeyi tamamladığında bizim
// eski "bozuk" notumuz en fazla bu kadar yaşasın; tersi de geçerli, çalışan
// bir entegrasyon sonradan bozulabilir.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// axet-code'un KENDİ bağlayıcı durum dosyası
// ---------------------------------------------------------------------------
// Ölçüldü 2026-09-05 (pty sondası): TUI'de `ctrl+b` -> satırı seç -> `t` bir
// bağlayıcıyı kapatıyor ve kapalı olanların uuid'si buraya yazılıyor. Biçim
// tam olarak `{"disabled": ["<uuid>", ...]}`. Doğrudan yazmak da çalışıyor.
//
// UUID'LER AYNI UZAYDA: log'daki `mcp_name: conn_<uuid>` ile araç adındaki
// `mcp_conn_<uuid>_<sağlayıcı>_<eylem>` aynı kimliği taşıyor — yani yukarıda
// öğrendiğimiz uuid buraya olduğu gibi yazılabiliyor. Bu tesadüf değil ama
// ÖLÇÜLDÜ; varsayılmadı.
//
// `-D/--data-dir` bu dosyayı KAPSAMIYOR: hangi veri klasörü verilirse verilsin
// her zaman %LOCALAPPDATA%\axet-code altına yazılıyor (bu, izole sanılan bir
// sondanın gerçek ayara yazmasıyla öğrenildi).
const STATE_FILE = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "axet-code", "connector_state.json")
  : null;

interface ConnectorState {
  disabled: string[];
}

function readState(): ConnectorState | null {
  if (!STATE_FILE) return null;
  // Dosyanın OLMAMASI normal: kullanıcı hiç bağlayıcı kapatmamış demektir,
  // boş liste gibi davranıyoruz. BOZUK olması başka bir şey — okuyamadığımız
  // bir dosyayı ezmek kullanıcının elle yaptığı kapatmaları sessizce geri
  // açardı, o yüzden o durumda hiç dokunmuyoruz.
  if (!existsSync(STATE_FILE)) return { disabled: [] };
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf-8")) as Partial<ConnectorState>;
    if (!Array.isArray(parsed.disabled)) return null;
    return { disabled: parsed.disabled.filter((x) => typeof x === "string") };
  } catch {
    return null;
  }
}

type State = "ok" | "error";

interface Entry {
  provider: string;
  state: State;
  seenAt: number;
}

// Config'ten bir kez okunup bellekte tutuluyor. Her turda diske yazmıyoruz —
// yalnızca bir uuid'in DURUMU DEĞİŞTİĞİNDE (ilk öğrenme dahil).
let cache: Record<string, Entry> | null = null;

// TTL dolduğu için düşürülen bir kayıt oldu mu? Kapatılmış bir bağlayıcının
// araçları hiç yüklenmediği için o bağlayıcı BİR DAHA ÖLÇÜLEMEZ — yani
// kullanıcı portalde yetkilendirmeyi düzeltse bile, TTL'in dolup kaydı geri
// AÇMASI bunu fark etmenin tek kendiliğinden yolu. Bayrak, o an bir sağlık
// değişikliği olmasa bile bir eşitleme yapılmasını sağlıyor; süreç başına bir
// kez, çünkü `entries()` önbelleği yalnızca bir kez kuruyor.
let staleDropped = false;

// Şu an GERÇEKTEN var olan kayıtlar (axet-code'un kendi günlüğünden, bkz.
// axetCodeLog.readLiveConnectors). `null` = bilinmiyor, hiçbir şey elenmiyor.
//
// Kullanıcı portalden bir kaydı sildiğinde bunu bize söyleyen başka bir sinyal
// YOK: silinen kayıt bir daha araç çağrısı üretmediği için `learnConnectorHealth`
// onu hiç görmüyor ve hakkındaki not TTL dolana kadar yaşıyordu.
let live: Set<string> | null = null;

/**
 * Canlı kayıt listesini bildirir. `null`/boş olmayan bir liste geldiğinde
 * SİLİNMİŞ kayıtların notları da temizleniyor — eleme zaten `excludable()`'da
 * yapılıyor, buradaki temizlik yalnızca config'in şişmemesi için.
 */
export function noteLiveConnectors(uuids: string[] | null): void {
  if (!uuids) {
    live = null;
    return;
  }
  live = new Set(uuids.map((uuid) => uuid.toLowerCase()));
  const known = entries();
  let changed = false;
  for (const uuid of Object.keys(known)) {
    if (live.has(uuid)) continue;
    delete known[uuid];
    changed = true;
    console.log("[connectorHealth] kayıt artık yok, notu silindi", { uuid });
  }
  if (changed) {
    saveConfig({ connectorIntegrations: known });
    syncDisabledConnectors(known);
  }
}

function entries(): Record<string, Entry> {
  if (cache) return cache;
  const stored = loadConfig().connectorIntegrations ?? {};
  const now = Date.now();
  const fresh: Record<string, Entry> = {};
  for (const [uuid, value] of Object.entries(stored)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Entry;
    if (entry.state !== "ok" && entry.state !== "error") continue;
    if (typeof entry.seenAt !== "number" || now - entry.seenAt > TTL_MS) {
      staleDropped = true;
      continue;
    }
    fresh[uuid] = { provider: String(entry.provider ?? ""), state: entry.state, seenAt: entry.seenAt };
  }
  cache = fresh;
  return cache;
}

/**
 * Bir turun mesajlarından entegrasyon sağlığını öğrenir.
 *
 * Turun sıcak yolunda çağrılıyor, bu yüzden hiçbir şey DEĞİŞMEDİYSE tek bir
 * disk erişimi bile yapmıyor.
 */
export function learnConnectorHealth(messages: AxetDbMessage[]): void {
  const known = entries();
  // `entries()` çağrısından SONRA okunuyor: bayrağı kuran o.
  let changed = staleDropped;
  staleDropped = false;

  for (const message of messages) {
    if (message.role !== "tool") continue;
    for (const part of message.parts) {
      if (part.type !== "tool_result") continue;
      const match = RE_MCP_TOOL.exec(part.data?.name ?? "");
      if (!match) continue;
      const uuid = match[1].toLowerCase();
      const provider = match[2].toLowerCase();
      const body = part.data?.content ?? "";
      const state: State = RE_BROKEN.test(body) ? "error" : "ok";
      const previous = known[uuid];
      if (previous && previous.state === state && previous.provider === provider) {
        // Aynı sonuç — sadece tazeliği güncelle, diske yazma.
        previous.seenAt = Date.now();
        continue;
      }
      known[uuid] = { provider, state, seenAt: Date.now() };
      changed = true;
      console.log("[connectorHealth] entegrasyon durumu", { uuid, provider, durum: state });
    }
  }

  if (changed) saveConfig({ connectorIntegrations: known });
  // Yalnızca DEĞİŞİKLİKTE: aksi hâlde her turda bir dosya okuması eklerdik ve
  // öğrenilecek yeni bir şey yokken yazılacak yeni bir şey de yok.
  if (changed) syncDisabledConnectors(known);
}

/**
 * Öğrenilen bozuklukları axet-code'un kendi `connector_state.json`'ına yazar.
 *
 * Prompt yönlendirmesinden FARKI: kapatılan bir bağlayıcının araç TANIMLARI da
 * yüklenmiyor. Ölçüm 2026-09-05: dört kayıt = 92 araç, ikisi kapatılınca 42.
 *
 * ÜÇ KURAL, üçü de kullanıcının kendi kapatmalarını korumak için:
 *
 *   1. Dosya bozuksa hiç dokunulmuyor (`readState()` null). Okuyamadığımız bir
 *      dosyayı ezmek, elle kapatılmış bağlayıcıları sessizce geri açardı.
 *   2. Yalnızca KENDİ eklediğimiz uuid'leri kaldırıyoruz. Kullanıcının elle
 *      kapattığı bir kayıt bizim listemizde olmadığı için hiç dokunulmuyor.
 *   3. Kendi kapattığımız biri dosyada YOKSA, kullanıcı onu elle geri açmış
 *      demektir. Bu durumda ısrar etmiyoruz: kaydı sahiplenmeyi bırakıyoruz VE
 *      sağlık notunu siliyoruz, yani bir dahaki sefere hafızadan değil YENİ bir
 *      ölçümden karar veriliyor. Hâlâ bozuksa bedeli bir kez daha ödeyip yine
 *      kapatılır; bu, "kullanıcıyla inatlaşma" ile "ölçülmüş bir gerçeği
 *      unutma" arasındaki dengenin bilinçli tarafı.
 *
 * Dosya süreç AÇILIŞINDA okunuyor (bkz. AGENTS.md ile aynı kural), yani etkisi
 * bir sonraki axet-code oturumunda görünüyor. Çalışan oturumları bunun için
 * kapatmıyoruz: kazanç yalnızca hız ve kullanıcının konuşmasını yarıda kesmeye
 * değmez.
 */
function syncDisabledConnectors(known: Record<string, Entry>): void {
  const state = readState();
  if (!state || !STATE_FILE) return;

  const config = loadConfig();
  const inFile = new Set(state.disabled);
  const { bad } = excludable(known);

  // SAHİPLENME: dosyada zaten kapalı olan ama bizim listemizde olmayan bir uuid,
  // ölçüme göre BOZUKSA sahipleniliyor. İki sebep:
  //   - Bu özellik yokken elle kapatılanlar (2026-09-05'te iki outlook kaydı öyle
  //     kapatıldı) aksi hâlde sonsuza kadar "kullanıcının" sayılır ve düzelseler
  //     bile bir daha asla açılmazlardı — kullanıcı ctrl+b'ye gitmek zorunda kalırdı.
  //   - Zaten kapatacağımız bir kaydı sahiplenmenin ek bir maliyeti yok.
  // SINIR bilinçli: yalnızca `bad` olanlar. Kullanıcının SAĞLAM bir bağlayıcıyı
  // (ör. istemediği için) kapatması bize ait olmuyor, ona hiç dokunmuyoruz.
  const ours = Array.from(
    new Set([...(config.connectorAutoDisabled ?? []), ...state.disabled.filter((uuid) => bad.includes(uuid))])
  );

  // Kural 3: bizim kapattığımız ama dosyada olmayanlar = kullanıcı geri açmış.
  const reopened = ours.filter((uuid) => !inFile.has(uuid));

  // Bizim kapatmamız gerekenler = şu an bozuk olanlar, kullanıcının geri
  // açtıkları hariç. Düzelen bir kayıt `bad` olmaktan çıktığı için buradan da
  // düşüyor, yani dosyadan kaldırılıyor — TTL'in dolması da aynı kapıya çıkıyor.
  const nextOurs = bad.filter((uuid) => !reopened.includes(uuid));

  // Dosya: kullanıcının kendi kapattıkları + bizimkiler. ARTIK VAR OLMAYAN bir
  // uuid ikisine de girmiyor — axet-code onu zaten yok sayıyor, ama listede
  // durması dosyayı okunmaz hâle getiriyor (silinen kayıtların mezarlığı).
  const theirs = state.disabled.filter((uuid) => !ours.includes(uuid) && (!live || live.has(uuid)));
  const nextDisabled = Array.from(new Set([...theirs, ...nextOurs]));

  const persisted = config.connectorAutoDisabled ?? [];
  const sameFile =
    nextDisabled.length === state.disabled.length && nextDisabled.every((uuid) => inFile.has(uuid));
  const sameOurs = nextOurs.length === persisted.length && nextOurs.every((uuid) => persisted.includes(uuid));
  if (sameFile && sameOurs && reopened.length === 0) return;

  if (!sameFile) {
    try {
      writeFileSync(STATE_FILE, `${JSON.stringify({ ...state, disabled: nextDisabled }, null, 2)}\n`, "utf-8");
      console.log("[connectorHealth] yerel kapatma yazıldı", { kapali: nextDisabled });
    } catch (err) {
      // Yazamamak bir arıza değil: prompt yönlendirmesi zaten devrede, sadece
      // araç tanımları yüklenmeye devam eder.
      console.warn("[connectorHealth] connector_state.json yazılamadı", err);
      return;
    }
  }

  const patch: Parameters<typeof saveConfig>[0] = { connectorAutoDisabled: nextOurs };
  if (reopened.length) {
    // Kural 3'ün ikinci yarısı: yeniden ölçülsün diye sağlık notunu sil.
    for (const uuid of reopened) delete known[uuid];
    patch.connectorIntegrations = known;
    console.log("[connectorHealth] kullanıcı geri açtı, yeniden ölçülecek", { uuid: reopened });
  }
  saveConfig(patch);
}

/**
 * Dışlanabilir kayıtlar: bozuk OLAN ve aynı sağlayıcı için çalıştığı BİLİNEN
 * bir alternatifi bulunanlar.
 *
 * Hem prompt yönlendirmesi hem de yerel kapatma bu tek kuraldan besleniyor —
 * ikisinin ayrı ayrı hesaplanması, birinin gevşetilip diğerinin unutulduğu bir
 * durumda "ajana çağırma dedik ama araç yüklü kaldı" gibi sessiz bir tutarsızlık
 * üretirdi.
 */
function excludable(known: Record<string, Entry>): { good: Record<string, string>; bad: string[] } {
  // ARTIK VAR OLMAYAN kayıtlar burada eleniyor — tek yerde, çünkü hem prompt
  // hem yerel kapatma buradan besleniyor.
  const alive = ([uuid]: [string, Entry]) => !live || live.has(uuid);
  const good: Record<string, string> = {};
  for (const [uuid, entry] of Object.entries(known).filter(alive)) {
    if (entry.state === "ok" && !good[entry.provider]) good[entry.provider] = uuid;
  }
  // Sağlam bir alternatifi bilmediğimiz sağlayıcı için hiçbir şey söylemiyoruz
  // (bkz. dosya başlığındaki gerekçe).
  const bad = Object.entries(known)
    .filter(alive)
    .filter(([, entry]) => entry.state === "error" && good[entry.provider])
    .map(([uuid]) => uuid);
  return { good, bad };
}

export function connectorGuidance(): string {
  const known = entries();
  const { good, bad } = excludable(known);

  const lines: string[] = [];
  const prefer = Object.entries(good)
    .filter(([provider]) => bad.some((uuid) => known[uuid].provider === provider))
    .map(([provider, uuid]) => `${provider}: ${uuid}`);
  // Dil bilinçli olarak SERT. İlk sürüm "tercih et" diyordu ve bu, 90'dan fazla
  // araç tanımı arasından seçim yapan bir modele yeterince bağlayıcı gelmiyor:
  // aynı sağlayıcının iki aracı arasında liste sırası hâlâ ağır basabiliyor.
  // Burada söylenen şey bir öneri değil, ölçülmüş bir olgu ve ondan çıkan tek
  // bir kural.
  //
  // METİNDE EM-DASH (—), OK (→) VE BENZERİ LATİN DIŞI İŞARET KULLANMA. Bu metin
  // pty'ye yazılıyor ve o karakterler yolda düşüyor (ölçüm: axetSessionDb.ts
  // `matchKey`). Eşleştirme artık buna dayanıklı, ama prompt'un veritabanına
  // bozuk inmesi yine de istenmez — Türkçe harfler sorunsuz geçiyor.
  if (bad.length) {
    lines.push(
      `KURAL, uygulama bağlantısı araçları için: adında şu kimlik(ler) geçen araçlar BOZUK ve çağrılırsa ` +
        `HTTP 500 döndürür: ${bad.join(", ")}. Bunları hiçbir koşulda çağırma; denemek zaman kaybından başka bir şey değil.`
    );
  }
  if (prefer.length) {
    lines.push(
      `Aynı sağlayıcı için ÇALIŞTIĞI ölçülmüş kayıt(lar): ${prefer.join(", ")}. ` +
        "O sağlayıcıya ait bir iş için doğrudan adında bu kimliği taşıyan aracı kullan."
    );
  }
  return lines.length ? `${lines.join(" ")}\n\n` : "";
}

/**
 * Bir sağlayıcının kayıtlarını unutur. Kullanıcı "Uygulama Bağlantıları"ndan
 * bağlanma/test akışını yeniden çalıştırdığında çağrılıyor: o an portalde
 * yetkilendirmeyi düzeltmiş olabilir ve bizim eski notumuz onu dışlamaya devam
 * etmemeli.
 */
export function forgetConnectorHealth(provider: string): void {
  const known = entries();
  let changed = false;
  for (const [uuid, entry] of Object.entries(known)) {
    if (entry.provider !== provider.toLowerCase()) continue;
    delete known[uuid];
    changed = true;
  }
  if (changed) saveConfig({ connectorIntegrations: known });
  // Unutmanın YEREL KAPATMAYA da yansıması şart: kullanıcı portalde
  // yetkilendirmeyi düzeltip "Bağlan"a bastığında kayıt hâlâ kapalı kalsaydı,
  // düzeltilmiş bağlayıcının araçları hiç yüklenmez ve kullanıcı "bağlandı
  // diyor ama olmuyor"un yeni bir sürümüyle karşılaşırdı.
  if (changed) syncDisabledConnectors(known);
}
