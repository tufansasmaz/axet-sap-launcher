import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import type { AxetChatMessage, AxetChatSendResult, AxetModelEntry } from "../shared/types";
import { axetSpawnEnv } from "./axetSpawnEnv";
import { buildContextPreamble } from "./activeContext";
import { shouldUseConnectors } from "./connectorPolicy";

// axet.code'un ana ekranındaki özgün sohbet arayüzü — gerçek interaktif TUI
// DEĞİL, her mesaj için `axet-code run -q` (stateless, tek-atış, non-interactive)
// modunu bir kere spawn edip tam metin cevabı bekleyen bir model. Bu modun
// CLI seviyesinde bir oturum hafızası YOK (canlı doğrulandı — aynı `-D` veri
// dizinine karşı iki ayrı `run` çağrısı birbirini hiç hatırlamıyor), bu yüzden
// bağlamı burada, önceki mesajları düz metin bir transkript olarak yeni
// prompt'un başına ekleyerek biz koruyoruz. Araç kullanımı (dosya okuma/
// yazma) `run` modunda hiçbir onay istemeden (yolo/otomatik) çalışıyor —
// canlı doğrulandı, bu modun kendi tasarımı (non-interactive = TTY'siz, onay
// isteyecek bir yer yok).

// Aktif olarak çalışan (henüz `close` event'i gelmemiş) her sohbet isteğinin
// process referansı — kullanıcı "Durdur"a basınca `cancelChatMessage` bunu
// bulup `kill()` çağırabilsin diye `requestId` başına saklanıyor.
const running = new Map<string, ChildProcess>();

// Canlı bulgu (2026-08-30): kullanıcı "Uygulama Bağlantıları"ndan Outlook'u
// bağladı (o ekranın "Bağlantıyı Test Et"i BAŞARILI oldu — bkz.
// agenticConnectors.ts'teki çoklu-entegrasyon-deneme prompt'u), ama genel
// axet.code sohbetinde "bağlantım çalışıyor mu" diye sorunca "ERROR
// durumunda, yetkilendirme akışını tamamlamalısın" cevabını aldı. Kök sebep
// (bu makinedeki gerçek axet-code'a karşı canlı doğrulandı): aynı provider
// için axet.nttdata.com/agentic'te BİRDEN FAZLA ayrı entegrasyon kaydı var
// (tekrarlanan re-authorization denemelerinden kalıntı) — bazıları bozuk,
// en az biri çalışıyor. Genel sohbetin ajanı, `agenticConnectors.ts`'teki
// gibi ÖZEL bir "hepsini dene" talimatı ALMADIĞI için İLK bulduğu (şans
// eseri bozuk) entegrasyonu deneyip hemen "çalışmıyor" diyordu. Bu hatırlatma
// TÜM sohbet mesajlarına (geçmiş olsun olmasın) eklenip AYNI canlı ortamda
// doğrulandı (`axet-code run -q` ile manuel test — hatırlatma eklenince
// ajan alternatif entegrasyonu bulup "Yes, working" dedi). Kısa ve generik
// olduğu için MCP tool'u olmayan sıradan sohbetlerde hiçbir etkisi/zararı
// yok, ajan sadece ilgili olduğunda kullanıyor.
const CONNECTOR_RETRY_REMINDER =
  "Not: Bir MCP araç çağrısı, altta yatan entegrasyonun yetkisiz (unauthorized) veya hata (ERROR) durumunda " +
  "olması yüzünden başarısız olursa ve aynı sağlayıcı/servis için BAŞKA bir araç/entegrasyon varsa, vazgeçmeden " +
  "önce o alternatif aracı bir kez dene.";

// Bağlayıcıların NE ZAMAN açılacağı artık burada değil — karar üç yüzeyde de
// aynı olsun diye `connectorPolicy.ts`'e taşındı (bkz. oradaki gerekçe).
// Buradan geçilen metin: yeni mesaj + SON İKİ mesaj. Zincir yüzünden:
// "gelen kutumda ne var" → "peki yarınki?" — ikinci mesajda hiçbir anahtar
// kelime yok, ama konu aynı konu.

/** Bu mesaj için bağlayıcılar açılsın mı? */
function decideConnectors(history: AxetChatMessage[], message: string): boolean {
  return shouldUseConnectors([message, ...history.slice(-2).map((m) => m.content)]);
}

// `useConnectors` false ise hatırlatma EKLENMİYOR: ortada bağlayıcı yokken
// ajana "alternatif entegrasyonu dene" demek hem anlamsız hem de var olmayan
// bir yetenek varmış izlenimi veriyor.
function buildPrompt(history: AxetChatMessage[], message: string, useConnectors: boolean, cwd: string): string {
  // Aktif SAP bağlamı (bkz. activeContext.ts). Sohbet bir sisteme BAĞLIYSA
  // ajan hangi sistemde/hangi ekranda olduğumuzu bilmeden cevap veriyordu:
  // proje klasöründe duran `.conn_adt` ve `sap-context.md`'yi ancak tesadüfen
  // okurdu. Sohbet bağlı değilse bu blok boş döner ve prompt eskisiyle
  // birebir aynı kalır.
  const contextBlock = buildContextPreamble(cwd);
  const preamble = contextBlock + (useConnectors ? `${CONNECTOR_RETRY_REMINDER}\n\n` : "");
  if (history.length === 0) return `${preamble}Kullanıcı mesajı: ${message}`;
  const transcript = history
    .map((m) => `${m.role === "user" ? "Kullanıcı" : "Sen"}: ${m.content}`)
    .join("\n\n");
  return (
    preamble +
    `Önceki konuşma:\n${transcript}\n\n` +
    `Yeni kullanıcı mesajı: ${message}\n\n` +
    `Lütfen SADECE en son kullanıcı mesajına, önceki konuşmayı bağlam olarak kullanarak cevap ver.`
  );
}

// Gelen stdout parçaları renderer'a HAM hâlleriyle değil, bu aralıkta
// biriktirilip toplu gönderiliyor. Canlı ölçümde tek bir cevap 178 ayrı
// `data` event'i üretebiliyor (bkz. PROJE-BILGI.md düzeltme notu) — her biri
// ayrı bir IPC mesajı + ayrı bir React render'ı demek olurdu. 50ms'lik
// pencere, göz için hâlâ "anlık" (60fps'de 3 kare) ama IPC/render trafiğini
// bir kat azaltıyor.
const CHUNK_FLUSH_MS = 50;

export function sendChatMessage(
  requestId: string,
  cwd: string,
  model: AxetModelEntry | null,
  history: AxetChatMessage[],
  message: string,
  // Cevap metni ÜRETİLDİKÇE çağrılır (yalnızca YENİ gelen parça, birikmiş
  // metnin tamamı değil). Verilmezse davranış eskisiyle birebir aynı: sadece
  // sonuçta tam metin döner.
  onChunk?: (text: string) => void
): Promise<AxetChatSendResult> {
  return new Promise((resolve) => {
    // Ayar HER MESAJDA okunuyor (tek küçük JSON dosyası, `shouldUseConnectors`
    // içinde) — kullanıcı "Uygulama Bağlantıları"ndan bağlanıp kestiğinde
    // etkisi bir sonraki mesajda görünsün diye; saniyelerle ölçülen bir
    // işlemin yanında bu okumanın maliyeti ölçülemez.
    const useConnectors = decideConnectors(history, message);
    const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
    try {
      mkdirSync(resolvedCwd, { recursive: true });
    } catch {
      // pty.spawn/spawn zaten aşağıda anlamlı bir hatayla patlar
    }

    const args = ["run", "-q"];
    if (model) args.push("-m", `${model.provider}/${model.model}`);
    // Prompt ARTIK komut satırı argümanı DEĞİL, stdin'den geçiyor (canlı
    // doğrulandı: pozisyonel argüman verilmeden `axet-code run -q` prompt'u
    // stdin'den okuyor ve normal cevap veriyor). Sebep: Windows'ta bir
    // process'in komut satırının tamamı ~32767 karakterle sınırlı; biz
    // geçmişi transkript olarak prompt'a GÖMDÜĞÜMÜZ için uzun bir sohbet bu
    // sınıra dayanabiliyordu ve aşıldığında hata, prompt'un uzunluğunu değil
    // spawn'ı işaret eden anlamsız bir mesaj olurdu. stdin'de böyle bir
    // sınır yok.

    let proc: ChildProcess;
    try {
      proc = spawn("axet-code", args, {
        cwd: resolvedCwd,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
        // Bağlayıcılar kapalıyken MCP kurulumu/yıkımı atlanıyor — mesaj
        // başına ~8 saniye (ölçüm ve gerekçe: axetSpawnEnv.ts).
        env: axetSpawnEnv(useConnectors)
      });
    } catch (err) {
      resolve({ ok: false, text: "", error: (err as Error).message });
      return;
    }
    running.set(requestId, proc);

    // stdin yazarken process çoktan ölmüş olabilir (kullanıcı hemen
    // "Durdur"a bastıysa) — o durumda EPIPE fırlar ve yakalanmazsa main
    // process'i düşürür. Sessizce yutuluyor; asıl sonuç zaten `close`
    // event'inden geliyor.
    proc.stdin?.on("error", () => {});
    try {
      proc.stdin?.end(buildPrompt(history, message, useConnectors, resolvedCwd), "utf-8");
    } catch {
      // yukarıdaki 'error' handler'ı zaten devrede
    }

    let stdout = "";
    let stderr = "";
    let killedByUser = false;

    // --- parça biriktirme (bkz. CHUNK_FLUSH_MS) ---
    let pending = "";
    let flushTimer: NodeJS.Timeout | null = null;
    const clearFlush = () => {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    };
    const flush = () => {
      clearFlush();
      if (!pending) return;
      const text = pending;
      pending = "";
      try {
        onChunk?.(text);
      } catch {
        // renderer penceresi kapanmış olabilir — akış hatası çağrıyı
        // düşürmemeli, tam metin yine de `close`'da dönecek
      }
    };

    proc.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      stdout += text;
      if (!onChunk) return;
      pending += text;
      if (!flushTimer) flushTimer = setTimeout(flush, CHUNK_FLUSH_MS);
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    proc.on("error", (err) => {
      clearFlush();
      running.delete(requestId);
      resolve({ ok: false, text: "", error: err.message });
    });

    proc.on("close", (code) => {
      // Bekleyen parça BİLEREK gönderilmiyor: hemen ardından dönen sonuç
      // zaten metnin TAMAMINI taşıyor ve renderer akış mesajını onunla
      // sonlandırıyor. Son bir parça daha göndermek gereksiz bir render.
      clearFlush();
      running.delete(requestId);
      if (killedByUser) {
        resolve({ ok: false, text: stdout.trim(), cancelled: true });
        return;
      }
      if (code === 0) {
        resolve({ ok: true, text: stdout.trim(), usedConnectors: useConnectors });
        return;
      }
      resolve({
        ok: false,
        text: stdout.trim(),
        error: (stderr || `axet-code çıkış kodu: ${code}`).trim(),
        usedConnectors: useConnectors
      });
    });

    // `cancelChatMessage`'ın kill() çağırdığını bu closure'da işaretlemek
    // için — Map'ten silindikten sonra kill edilse bile `close` handler'ı
    // hâlâ bu process referansına bağlı, `killedByUser`'ı ayrıca bir dış
    // Set üzerinden takip etmek yerine burada closure değişkeni yeterli
    // (bkz. cancelChatMessage — aynı `proc` referansına `(proc as any)
    // .__cancelled` yerine daha temiz bir çözüm için aşağıdaki yardımcı).
    (proc as ChildProcess & { __markCancelled?: () => void }).__markCancelled = () => {
      killedByUser = true;
    };
  });
}

export function cancelChatMessage(requestId: string): void {
  const proc = running.get(requestId);
  if (!proc) return;
  (proc as ChildProcess & { __markCancelled?: () => void }).__markCancelled?.();
  try {
    proc.kill();
  } catch {
    // process zaten kapanmış olabilir
  }
  running.delete(requestId);
}

export function cancelAllChatMessages(): void {
  for (const id of Array.from(running.keys())) cancelChatMessage(id);
}
