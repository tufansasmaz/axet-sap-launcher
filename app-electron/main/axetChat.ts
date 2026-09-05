import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import type {
  AxetChatActivity,
  AxetChatActivityPhase,
  AxetChatCancelVerdict,
  AxetChatProgress,
  AxetChatMessage,
  AxetChatSendResult,
  AxetModelEntry
} from "../shared/types";
import { axetSpawnEnv } from "./axetSpawnEnv";
import { buildContextPreamble } from "./activeContext";
import { shouldUseConnectors } from "./connectorPolicy";
import { connectorGuidance } from "./connectorHealth";
import {
  answerTuiQuestion,
  cancelTui,
  closeAllTuiSessions,
  closeTuiSession,
  prewarmTui,
  resetTuiHistory,
  sendViaTui,
  tuiBusy,
  tuiUnavailableReason
} from "./axetChatTui";

// axet.code'un ana ekranındaki özgün sohbet arayüzü — gerçek interaktif TUI
// DEĞİL, her mesaj için `axet-code run` (stateless, tek-atış, non-interactive)
// modunu bir kere spawn edip tam metin cevabı bekleyen bir model. Bu modun
// CLI seviyesinde bir oturum hafızası YOK (canlı doğrulandı — aynı `-D` veri
// dizinine karşı iki ayrı `run` çağrısı birbirini hiç hatırlamıyor), bu yüzden
// bağlamı burada, önceki mesajları düz metin bir transkript olarak yeni
// prompt'un başına ekleyerek biz koruyoruz. Araç kullanımı (dosya okuma/
// yazma) `run` modunda hiçbir onay istemeden (yolo/otomatik) çalışıyor —
// canlı doğrulandı, bu modun kendi tasarımı (non-interactive = TTY'siz, onay
// isteyecek bir yer yok).
//
// BU MODELİN SINIRI: `run`'ın `--resume`/`--session` gibi bir devam bayrağı
// YOK (`run --help` ile doğrulandı). Yani araç SONUÇLARI mesajlar arasında
// kayboluyor — ajan 1. mesajda bir dosya okuduysa, 2. mesajın transkriptinde
// yalnızca metin cevabı var, okuduğu içerik yok. Gerçek TUI bunu tutuyor.
//
// 2026-09-04 (2. adım): bu yüzden ARTIK ÖNCE kalıcı TUI oturumu deneniyor
// (axetChatTui.ts) — gerçek interaktif axet-code, bir pty içinde, sohbet
// başına bir oturum. Bu dosyadaki `run` yolu KALDIRILMADI, YEDEK oldu: TUI
// kurulamazsa (native sqlite yüklenemedi, açılış diyalogları değişti, pty
// açılmadı) mesaj sessizce buradan gider. Yani en kötü durum, dünkü davranış.

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

// axet-code'un `ask_user` diye bir aracı var: ajan soruyu sorunca TUI bir soru
// kutusu çiziyor ve cevabı BEKLİYOR.
//
// ESKİDEN BU BİR TUZAKTI. Ölçüm (2026-09-05): "kısa bi abap kodu yaz" mesajına
// ajan `ask_user` çağırdı, oturum veritabanında ondan sonra HİÇBİR kayıt yok,
// kullanıcı 105 saniye "Düşünüyor" görüp hiç cevap alamadı. O dönemde buradaki
// metin ajandan aracı HİÇ kullanmamasını istiyordu.
//
// ARTIK DEĞİL: kutuyu cevaplayabiliyoruz (bkz. axetChatTui.ts
// `answerTuiQuestion` — seçenek dizini kadar `↓`, sonra `enter`; ölçümde
// axet-code `✓ The user selected: ...` yazıp aynı turda devam etti). Soru,
// sohbette tıklanabilir bir kart olarak çiziliyor.
//
// Şıklar da tek yol değil: kutunun "Other" satırı serbest metin kabul ediyor
// (ölçüm 2026-09-05: `✓ The user typed a custom answer: "Yesil"`), yani
// kullanıcı hiçbir şıkka mahkûm değil — kartta kendi cevabını yazabiliyor.
//
// O YÜZDEN "SORMA" YASAĞI KALDIRILDI (kullanıcı testi, 2026-09-05: yasak
// tuttuğu için kart hiç çıkmadı — ajan soruyu düz metinle sordu). Yerine, HANGİ
// BİÇİMDE sorulacağını söyleyen bir not var, çünkü desteklenen tek biçim bu:
// tek seçimli ve en az iki seçenekli. Çoklu seçim ile seçeneksiz soru
// ölçülmedi; onlar hâlâ eski yoldan (turu soruyla bitir) gidiyor.
//
// Yumuşak önlem: metin bir kural değil, istek. Ajan yine de yanlış biçimde
// sorabilir — ikinci katman orada devreye giriyor.
// axet-code bir KODLAMA ajanı ve `-y` ile çalışıyor (kullanıcı kararı): onay
// sormadan dosya yazabiliyor. Terminalde beklenen davranış bu; sohbet kılıfında
// değil.
//
// ÖLÇÜM (2026-09-05, kullanıcı testi): "kısa bi abap kodu yaz" mesajına ajan
// `hello.abap` diye bir DOSYA oluşturdu. Kullanıcının istediği bir cevaptı,
// dosya değil — *"burada direkt bi dosyaya abap kodunu yazıyor ben istemeden"*.
//
// Dosya yazmayı KAPATMIYORUZ: bu sohbet gerçek bir proje klasöründe çalışıyor
// ve "şu dosyayı düzelt" de meşru bir istek. Ayıran şey niyet, o yüzden çare
// bir bayrak değil bu cümle: istenmedikçe yazma, kodu cevabın içinde ver.
const NO_UNASKED_WRITE_HINT =
  "Not: Kullanıcı açıkça bir dosya oluşturmanı/değiştirmeni istemedikçe diske YAZMA. " +
  "\"Kod yaz\" demek dosya istemek değildir — kodu cevabının içinde kod bloğu olarak ver. " +
  "Dosyaya yazmanın gerektiğini düşünüyorsan önce bunu tek cümleyle söyle ve kullanıcının " +
  "istemesini bekle.";

const ASK_FORMAT_HINT =
  "Not: Gerçekten bir tercihe ihtiyacın varsa soru sorma aracını (ask_user) kullanabilirsin; " +
  "sorman gerekmiyorsa en makul varsayımla devam et ve varsayımını tek cümleyle söyle. " +
  "Sorarken EN AZ İKİ seçenek ver — bu arayüz seçeneksiz soruyu gösteremiyor. " +
  "Çoklu seçim (multi_select) serbest.";

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
  // Hatırlatma bozuk entegrasyonu KURTARIYOR (ajan alternatifi deniyor), sağlık
  // kaydı ise ONU HİÇ DENEMEMESİNİ sağlıyor — ölçülen kazanç tur başına ~6 sn.
  // İkisi birlikte duruyor: kayıt boşken (ilk kullanım, ya da kayıtlar
  // eskidiğinde) kurtarma yine devrede.
  // `ASK_FORMAT_HINT` bağlayıcılardan BAĞIMSIZ: soru sorma her mesajda olabilir
  // (ölçülen olay bağlayıcısız bir ABAP sorusunda yaşandı).
  const preamble =
    contextBlock +
    `${NO_UNASKED_WRITE_HINT}\n\n` +
    `${ASK_FORMAT_HINT}\n\n` +
    (useConnectors ? `${CONNECTOR_RETRY_REMINDER}\n\n${connectorGuidance()}` : "");
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

// Bir cevabın bekletilebileceği en uzun süre. Eskiden TAVAN YOKTU: axet-code
// takılırsa (ağ yutulması, yanıtsız bir MCP sunucusu) sohbet sonsuza kadar
// "düşünüyor"da kalıyordu ve tek çıkış kullanıcının Durdur'a basmasıydı.
// 5 dakika, uzun bir araç zincirini kesmeyecek kadar geniş — ölçülen en uzun
// gerçek cevap bunun onda biri bile değil.
const CHAT_TIMEOUT_MS = 5 * 60_000;

// ---------------------------------------------------------------------------
// Ön-ısıtma (pre-warm) — ölçülmüş gerekçe (2026-09-04)
// ---------------------------------------------------------------------------
// Kullanıcı şikâyeti: *"chat aynı zamanda çok yavaş çalışıyor, chatteki
// bekleme süresi aşırı çok"*.
//
// Ölçüm: `(sleep 9; echo prompt) | axet-code run -v` çalıştırıldığında
// `skillsmarket.sync.complete` satırı, prompt gönderilmeden DOKUZ SANİYE ÖNCE
// düştü. Yani axet-code açılış işinin çoğunu (auth, config, skills kataloğu)
// stdin'i BEKLERKEN yapıyor. Prompt geldikten sonraki sabit maliyet ise
// yalnızca ~0.47 s (agent resolve → oturum → kod grafiği → denetim kaydı).
//
// Sonuç: süreci kullanıcı YAZARKEN başlatırsak mesaj başına ~2–4 saniye
// tamamen görünmez oluyor. İnsanların yazma süresi bundan uzun.
//
// NEDEN TEK BİR ISITILMIŞ SÜREÇ: ikisi aynı anda beklerse ikinci kullanıcı
// yok, ikisi de aynı kişinin. Havuz tutmak bellek ve süreç sayısı demek,
// karşılığı yok.
//
// NEDEN BAĞLAYICILAR KAPALI ISITILIYOR: bağlayıcıların açılıp açılmayacağı
// MESAJIN METNİNE bağlı (bkz. connectorPolicy) ve ısıtma anında metin henüz
// yok. Yaygın durum kapalı; karar "açık" çıkarsa ısıtılmış süreç atılıp
// yenisi kuruluyor. Yanlış tahminin bedeli, eskiden her mesajda ödenen şeyin
// aynısı — yani kötüleşme yok.
const WARM_IDLE_MS = 3 * 60_000;

interface ProcChannel {
  proc: ChildProcess;
  cwd: string;
  modelKey: string;
  /** Şu ana kadar biriken cevap metni (ısıtma sırasında boş kalır). */
  stdout: string;
  /** Ham log çıktısı — hata mesajı üretmek için saklanıyor. */
  stderr: string;
  /** Satıra bölünmemiş stderr artığı. */
  stderrTail: string;
  exited: boolean;
  onStdout: ((text: string) => void) | null;
  onStderrLine: ((line: string) => void) | null;
  onExit: ((code: number | null) => void) | null;
  onSpawnError: ((message: string) => void) | null;
}

interface WarmEntry {
  channel: ProcChannel;
  idleTimer: NodeJS.Timeout;
}

let warm: WarmEntry | null = null;

function modelKeyOf(model: AxetModelEntry | null): string {
  return model ? `${model.provider}/${model.model}` : "";
}

/**
 * `axet-code run` sürecini başlatır ve çıktı borularını tek bir kanala bağlar.
 * Prompt BURADA yazılmıyor — süreç stdin'i bekleyerek açılıyor, çünkü
 * ön-ısıtmanın tüm kazancı tam olarak bu bekleyişte (bkz. yukarıdaki not).
 */
function createChannel(cwd: string, modelKey: string, useConnectors: boolean): ProcChannel {
  // `-v` (Show logs) ARTIK `-q` yerine: `-q` yalnızca spinner'ı gizliyordu ve
  // karşılığında hiçbir ilerleme bilgisi vermiyordu. `-v` aşamaları stderr'e
  // CANLI yazıyor (zaman damgalarıyla doğrulandı) ve stdout'u kirletmiyor —
  // cevap metni eskisi gibi tertemiz geliyor.
  const args = ["run", "-v"];
  if (modelKey) args.push("-m", modelKey);

  const channel: ProcChannel = {
    proc: spawn("axet-code", args, {
      cwd,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      // Bağlayıcılar kapalıyken MCP kurulumu/yıkımı atlanıyor — mesaj
      // başına ~8 saniye ve istek gövdesinde 317 KB (ölçüm ve gerekçe:
      // axetSpawnEnv.ts).
      env: axetSpawnEnv(useConnectors)
    }),
    cwd,
    modelKey,
    stdout: "",
    stderr: "",
    stderrTail: "",
    exited: false,
    onStdout: null,
    onStderrLine: null,
    onExit: null,
    onSpawnError: null
  };

  // stdin yazarken process çoktan ölmüş olabilir (kullanıcı hemen "Durdur"a
  // bastıysa, ya da ısıtılmış süreç bu arada düştüyse) — o durumda EPIPE
  // fırlar ve yakalanmazsa main process'i düşürür.
  channel.proc.stdin?.on("error", () => {});

  channel.proc.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8");
    channel.stdout += text;
    channel.onStdout?.(text);
  });

  channel.proc.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8");
    channel.stderr += text;
    if (!channel.onStderrLine) return;
    // Satır satır işleniyor: bir `data` event'i satırın ORTASINDA bitebilir,
    // yarım satırdan aşama okumaya kalkmak yanlış aşama üretirdi.
    const parts = (channel.stderrTail + text).split(/\r?\n/);
    channel.stderrTail = parts.pop() ?? "";
    for (const line of parts) {
      if (line.trim()) channel.onStderrLine(line);
    }
  });

  channel.proc.on("error", (err) => {
    channel.exited = true;
    channel.onSpawnError?.(err.message);
  });

  channel.proc.on("close", (code) => {
    channel.exited = true;
    channel.onExit?.(code);
  });

  return channel;
}

function killTree(proc: ChildProcess): void {
  const pid = proc.pid;
  // `proc.kill()` Windows'ta YALNIZCA o süreci öldürüyor; axet-code'un
  // başlattığı MCP istemcileri torun süreç olarak hayatta kalıyordu.
  // `taskkill /T` ağacın tamamını alıyor.
  if (pid && process.platform === "win32") {
    try {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      return;
    } catch {
      // taskkill yoksa aşağıdaki normal kill'e düşülüyor
    }
  }
  try {
    proc.kill();
  } catch {
    // süreç zaten kapanmış olabilir
  }
}

function disposeWarm(): void {
  if (!warm) return;
  const { channel, idleTimer } = warm;
  warm = null;
  clearTimeout(idleTimer);
  // Bırakılan sürecin olay kancaları da temizleniyor: `onExit` hâlâ bağlıyken
  // ölürse, çoktan `null`'lanmış `warm`'a dokunmaya çalışırdı.
  channel.onExit = null;
  channel.onSpawnError = null;
  if (!channel.exited) killTree(channel.proc);
}

/**
 * Kullanıcı yazmaya başladığında çağrılır: bir sonraki mesajın süreci şimdiden
 * açılıp stdin'de bekletilir. Zaten uygun bir süreç ısınıyorsa yalnızca
 * boşta-kalma sayacı tazelenir.
 */
export function prewarmChat(
  cwd: string,
  model: AxetModelEntry | null,
  chatId?: string,
  draft?: string
): void {
  const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
  // TUI kipi kullanılabiliyorsa ısıtılacak şey ODUR: `run` süreci o mesajda
  // zaten kullanılmayacak, ısıtmak boşuna bir axet-code süreci demek.
  if (chatId && !tuiUnavailableReason(resolvedCwd)) {
    disposeWarm();
    // Bağlayıcı kararı, YAZILMAKTA OLAN metne bakılarak şimdiden veriliyor.
    // Bunsuz ısıtma her zaman bağlayıcısız kuruluyordu ve "mail" geçen ilk
    // mesajda oturum baştan kuruluyordu: 3,5 s el sıkışması + 2,5 s bağlayıcı
    // beklemesi, kullanıcının GÖZÜ ÖNÜNDE (ölçüldü, 2026-09-04). Taslakta
    // "mail" görür görmez doğru oturumu kurarsak bu altı saniye yazma
    // süresinin içinde eriyor.
    //
    // Yanlış tahminin bedeli sınırlı: metin sonradan bağlayıcı gerektirmezse
    // oturum olduğu gibi kullanılıyor (yapışkan kural), gerektirir de biz
    // kaçırmışsak eski davranışa, yani o mesajda yeniden kuruluma dönüyoruz.
    prewarmTui(chatId, resolvedCwd, model, shouldUseConnectors([draft]));
    return;
  }
  const key = modelKeyOf(model);
  if (warm && !warm.channel.exited && warm.channel.cwd === resolvedCwd && warm.channel.modelKey === key) {
    clearTimeout(warm.idleTimer);
    warm.idleTimer = setTimeout(disposeWarm, WARM_IDLE_MS);
    return;
  }
  // Klasör ya da model değiştiyse eldeki ısıtılmış süreç işe yaramaz: ikisi de
  // spawn anında sabitleniyor.
  disposeWarm();
  try {
    mkdirSync(resolvedCwd, { recursive: true });
  } catch {
    // klasör açılamıyorsa ısıtma da yapılmıyor; asıl gönderim anlamlı bir
    // hatayla patlayacak
    return;
  }
  let channel: ProcChannel;
  try {
    channel = createChannel(resolvedCwd, key, false);
  } catch {
    // axet-code kurulu değilse ısıtma sessizce vazgeçiyor — kullanıcıya hata
    // göstermek için doğru an, gerçekten bir mesaj gönderdiği an.
    return;
  }
  warm = { channel, idleTimer: setTimeout(disposeWarm, WARM_IDLE_MS) };
  // Isınırken ölürse (auth düşmüş, axet-code güncelleniyor) eldeki referans
  // çöpe dönüyor; bu ilk gönderimde fark edilmesin diye hemen bırakılıyor.
  const forget = () => {
    if (warm?.channel !== channel) return;
    clearTimeout(warm.idleTimer);
    warm = null;
  };
  channel.onExit = forget;
  channel.onSpawnError = forget;
}

/** Isıtılmış süreç bu isteğe uyuyorsa devral, yoksa `null`. */
function takeWarm(cwd: string, modelKey: string, useConnectors: boolean): ProcChannel | null {
  // Bağlayıcılar İSTENİYORSA ısıtılmış süreç kullanılamaz: MCP adresi spawn
  // anında ortam değişkeniyle sabitleniyor (bkz. axetSpawnEnv.ts).
  if (useConnectors) return null;
  if (!warm) return null;
  const { channel, idleTimer } = warm;
  if (channel.exited || channel.cwd !== cwd || channel.modelKey !== modelKey) return null;
  clearTimeout(idleTimer);
  warm = null;
  channel.onExit = null;
  channel.onSpawnError = null;
  return channel;
}

// Aşamaların GÖRÜNME sırası — canlı log'dan okunmuş hâli, alfabetik ya da
// tahmini değil. Bağlayıcılar açıkken `connector.sync` "Running in
// non-interactive mode"dan ÖNCE düşüyor, bu yüzden `connectors` listede
// `starting`'in hemen ardında.
//
// Neye yarıyor: gösterge GERİ SIÇRAMASIN. İki ayrı sebeple sıçrardı — (1)
// ısıtılmış süreçte açılış satırları prompt'tan sonra tekrar akıyor, (2)
// bağlayıcılar açıkken "MCP client initialized" satırları denetim kaydından
// sonra da gelebiliyor. "Düşünüyor"dan "Başlatılıyor"a dönen bir gösterge,
// olmayan bir yeniden başlatmayı anlatırdı.
const PHASE_ORDER: readonly AxetChatActivityPhase[] = [
  "starting",
  "connectors",
  "skills",
  "agent",
  "session",
  "indexing",
  "thinking",
  "finishing"
];

/** stderr log satırından arayüze gösterilecek aşamayı çıkarır. */
function phaseFromLogLine(line: string): AxetChatActivityPhase | null {
  if (line.includes("connector.sync") || line.includes("MCP client")) return "connectors";
  if (line.includes("skillsmarket.sync")) return "skills";
  if (line.includes("Running in non-interactive mode")) return "starting";
  if (line.includes("Agent resolved")) return "agent";
  if (line.includes("Created session")) return "session";
  if (line.includes("Code graph")) return "indexing";
  // Denetim kaydından SONRA axet-code cevap gelene kadar hiçbir şey yazmıyor —
  // bu satır pratikte "artık model çalışıyor" demek.
  if (line.includes("Audit logged")) return "thinking";
  if (line.includes("agent turn finished")) return "finishing";
  return null;
}

/**
 * Hata mesajı için stderr'i temizler. `-v` açık olduğu için stderr artık
 * NORMAL çalışmada da dolu — ham hâliyle gösterilseydi her hata "INFO
 * skillsmarket.sync.complete..." diye başlayan bir log yığını olurdu.
 */
function extractError(stderr: string): string {
  const noise = /^(INFO|DEBU|DEBUG|WARN)\b/;
  const lines = stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !noise.test(l));
  return lines.join("\n").trim();
}

/**
 * Bir mesaj gönderir.
 *
 * ÖNCE kalıcı TUI oturumu denenir (axetChatTui.ts): açılış maliyeti bir kez
 * ödenir, oturum hafızası CLI'ın kendisinde durur ve arka plandaki araç
 * çağrıları canlı görünür. Kurulamazsa aşağıdaki `run` yoluna düşülür.
 *
 * `chatId` sohbetin kalıcı kimliği (renderer'daki `session.id`) — TUI
 * oturumları bununla eşleniyor. `requestId` ise TEK BİR mesaja ait; iptal
 * onunla yapılıyor.
 */
export async function sendChatMessage(
  requestId: string,
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  history: AxetChatMessage[],
  message: string,
  onChunk?: (text: string) => void,
  onActivity?: (activity: AxetChatActivity) => void,
  // `run` yolunda KARŞILIĞI YOK: ayrı bir süreç kendi oturumunu veritabanına
  // yazana kadar okuyacak bir plan da yok. Bu yüzden yalnızca TUI kipinde
  // bağlanıyor, ve arayüz bilginin gelmemesine dayanıklı.
  onProgress?: (progress: AxetChatProgress) => void
): Promise<AxetChatSendResult> {
  const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
  // Ayar HER MESAJDA okunuyor (tek küçük JSON dosyası, `shouldUseConnectors`
  // içinde) — kullanıcı "Uygulama Bağlantıları"ndan bağlanıp kestiğinde etkisi
  // bir sonraki mesajda görünsün diye; saniyelerle ölçülen bir işlemin yanında
  // bu okumanın maliyeti ölçülemez.
  const useConnectors = decideConnectors(history, message);

  if (chatId && !tuiUnavailableReason(resolvedCwd)) {
    tuiRequests.set(requestId, chatId);
    try {
      const result = await sendViaTui({
        chatId,
        cwd: resolvedCwd,
        model,
        history,
        message,
        useConnectors,
        buildSeedPrompt: (h, m) => buildPrompt(h, m, useConnectors, resolvedCwd),
        buildFirstPrompt: (m) => buildPrompt([], m, useConnectors, resolvedCwd),
        onChunk: (text) => {
          try {
            onChunk?.(text);
          } catch {
            // renderer penceresi kapanmış olabilir
          }
        },
        onActivity: (activity) => {
          try {
            onActivity?.(activity);
          } catch {
            // pencere kapanmış olabilir
          }
        },
        onProgress: (progress) => {
          try {
            onProgress?.(progress);
          } catch {
            // pencere kapanmış olabilir
          }
        }
      });
      if (result) return result;
    } catch {
      // TUI tarafındaki beklenmedik bir hata mesajı düşürmemeli — `run` yolu
      // duruyor.
    } finally {
      tuiRequests.delete(requestId);
    }
    // Buraya düşmek = TUI bu mesaj için kurulamadı. Oturumu bırakıyoruz ki
    // bir sonraki mesaj yarım kalmış bir pty'ye yazmaya çalışmasın.
    //
    // MEŞGULSE DOKUNMUYORUZ: aynı sohbete ikinci bir mesaj gelmişse (arayüz
    // buna izin vermiyor ama IPC seviyesinde mümkün) süren turun oturumunu
    // kapatmak, cevabını bekleyen İLK mesajı öldürürdü.
    if (!tuiBusy(chatId)) closeTuiSession(chatId);
  }

  return sendViaRun(requestId, resolvedCwd, model, history, message, useConnectors, onChunk, onActivity);
}

/** İptalin doğru yere gitmesi için: hangi istek hangi TUI sohbetinde. */
const tuiRequests = new Map<string, string>();

function sendViaRun(
  requestId: string,
  cwd: string,
  model: AxetModelEntry | null,
  history: AxetChatMessage[],
  message: string,
  useConnectors: boolean,
  // Cevap metni ÜRETİLDİKÇE çağrılır (yalnızca YENİ gelen parça, birikmiş
  // metnin tamamı değil). Verilmezse davranış eskisiyle birebir aynı: sadece
  // sonuçta tam metin döner.
  onChunk?: (text: string) => void,
  // Alt süreç aşama değiştirdikçe çağrılır (bkz. AxetChatActivityPhase).
  // Bu kipte YALNIZCA aşama var: `run -v`'nin stderr'i araç çağrılarını hiç
  // yazmıyor, dolayısıyla `tool`/`toolResult` olayları buradan çıkmıyor.
  onActivity?: (activity: AxetChatActivity) => void
): Promise<AxetChatSendResult> {
  return new Promise((resolve) => {
    const resolvedCwd = cwd;
    const key = modelKeyOf(model);

    let channel = takeWarm(resolvedCwd, key, useConnectors);
    const wasWarm = channel !== null;
    if (!channel) {
      // Isıtılmış süreç bu isteğe uymuyorsa (klasör/model/bağlayıcı farkı) ya
      // da hiç yoksa: eskisi gibi şimdi başlat. Uymayan ısıtılmış süreç boşuna
      // bekliyor demektir, bırakılıyor.
      disposeWarm();
      try {
        mkdirSync(resolvedCwd, { recursive: true });
      } catch {
        // spawn zaten aşağıda anlamlı bir hatayla patlar
      }
      try {
        channel = createChannel(resolvedCwd, key, useConnectors);
      } catch (err) {
        resolve({ ok: false, text: "", error: (err as Error).message });
        return;
      }
    }

    const active = channel;
    running.set(requestId, active.proc);

    let settled = false;
    let killedByUser = false;
    let lastPhase: AxetChatActivityPhase | null = null;

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

    const timeoutTimer = setTimeout(() => {
      if (settled) return;
      killTree(active.proc);
      finish({
        ok: false,
        text: active.stdout.trim(),
        error: `axet-code ${Math.round(CHAT_TIMEOUT_MS / 1000)} saniyede cevap vermedi.`,
        usedConnectors: useConnectors
      });
    }, CHAT_TIMEOUT_MS);

    const finish = (result: AxetChatSendResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      clearFlush();
      running.delete(requestId);
      resolve(result);
    };

    const report = (phase: AxetChatActivityPhase) => {
      if (phase === lastPhase) return;
      // Geriye gitmiyor (bkz. PHASE_ORDER).
      if (lastPhase && PHASE_ORDER.indexOf(phase) < PHASE_ORDER.indexOf(lastPhase)) return;
      lastPhase = phase;
      try {
        onActivity?.({ phase });
      } catch {
        // pencere kapanmış olabilir
      }
    };

    active.onStdout = (text) => {
      if (!onChunk) return;
      pending += text;
      if (!flushTimer) flushTimer = setTimeout(flush, CHUNK_FLUSH_MS);
    };

    active.onStderrLine = (line) => {
      const phase = phaseFromLogLine(line);
      if (phase) report(phase);
    };

    active.onSpawnError = (msg) => {
      finish({ ok: false, text: "", error: msg });
    };

    active.onExit = (code) => {
      // Bekleyen parça BİLEREK gönderilmiyor: hemen ardından dönen sonuç
      // zaten metnin TAMAMINI taşıyor ve renderer akış mesajını onunla
      // sonlandırıyor. Son bir parça daha göndermek gereksiz bir render.
      if (killedByUser) {
        finish({ ok: false, text: active.stdout.trim(), cancelled: true });
        return;
      }
      if (code === 0) {
        finish({ ok: true, text: active.stdout.trim(), usedConnectors: useConnectors });
        return;
      }
      finish({
        ok: false,
        text: active.stdout.trim(),
        error: extractError(active.stderr) || `axet-code çıkış kodu: ${code}`,
        usedConnectors: useConnectors
      });
    };

    // Isıtılmış süreçte açılış (auth, config, yetenek kataloğu) ZATEN geçti;
    // prompt'tan sonra gelen ilk gerçek adım ajanın seçilmesi. "Başlatılıyor"
    // demek, olmayan bir bekleyişi anlatmak olurdu.
    report(wasWarm ? "agent" : "starting");

    // Süreç ısıtma sırasında ölmüş olabilir; `takeWarm` bunu kontrol ediyor
    // ama devralma ile stdin yazımı arasında da ölebilir. `stdin.on("error")`
    // yutuyor, gerçek sonuç `close`'dan geliyor.
    try {
      active.proc.stdin?.end(buildPrompt(history, message, useConnectors, resolvedCwd), "utf-8");
    } catch {
      // yukarıdaki 'error' handler'ı zaten devrede
    }

    (active.proc as ChildProcess & { __markCancelled?: () => void }).__markCancelled = () => {
      killedByUser = true;
    };
  });
}

/**
 * Süren turu iptal eder.
 *
 * `onVerdict` YALNIZCA TUI kipinde çağrılıyor, çünkü "gerçekten durdu mu"
 * sorusunu ancak orada cevaplayabiliyoruz: iptalden sonra axet-code'un kendi
 * veritabanına bakılıyor (bkz. axetChatTui.ts `cancelTui`). `run` kipinde
 * süreç öldürülüyor, yani soru zaten yok.
 *
 * `chatId` geri veriliyor çünkü karar 1–4 saniye SONRA geliyor ve o noktada
 * `requestId` arayüzde ölü: istek iptalle birlikte çözülüyor ve oturumun
 * `requestId`'si `null`'a çekiliyor. Sohbet kimliği ise kalıcı.
 */
export function cancelChatMessage(
  requestId: string,
  onVerdict?: (chatId: string, verdict: AxetChatCancelVerdict) => void
): void {
  // TUI kipinde iptal süreci ÖLDÜRMÜYOR: oturum kalıcı, esc sadece süren turu
  // kesiyor. Süreci öldürmek bir sonraki mesajda açılış maliyetini geri
  // getirirdi — yani iptalin bedeli, iptal edilen mesajdan büyük olurdu.
  const chatId = tuiRequests.get(requestId);
  if (chatId) {
    tuiRequests.delete(requestId);
    cancelTui(chatId, onVerdict ? (verdict) => onVerdict(chatId, verdict) : undefined);
    return;
  }
  const proc = running.get(requestId);
  if (!proc) {
    // SESSİZ DEĞİL: bu dal, iptalin hiçbir sürece ulaşmadığı yer. Arayüz yine de
    // duruyor, yani kullanıcı "durdurdum" diyor ve tur arkada üretmeye devam
    // ediyor — 2026-09-05'te tam olarak bu oldu ve nedenini bulmak, jeton
    // sayaçlarını iki ayrı veritabanından karşılaştırmayı gerektirdi.
    console.log("[axetChat] iptal edilecek istek bulunamadi", {
      requestId,
      tuiIstekleri: tuiRequests.size,
      calisanSurecler: running.size
    });
    return;
  }
  (proc as ChildProcess & { __markCancelled?: () => void }).__markCancelled?.();
  killTree(proc);
  running.delete(requestId);
}

/**
 * Ajanın sorduğu soruyu cevaplar (`index < 0` = vazgeç). `customText` doluysa
 * şıklar yerine kutunun "Other" satırındaki serbest metin alanı kullanılıyor.
 *
 * `requestId` üzerinden gidiyor çünkü arayüzün elindeki kimlik bu: soru,
 * etkinlik akışında `askUser` aşaması olarak o kimlikle geliyor. `run` kipinde
 * soru kutusu diye bir şey yok, orada `false` dönüyor.
 */
export function answerChatQuestion(
  requestId: string,
  optionIndex: number | number[],
  customText?: string
): boolean {
  const chatId = tuiRequests.get(requestId);
  if (!chatId) return false;
  return answerTuiQuestion(chatId, optionIndex, customText);
}

/** Bir sohbet silindiğinde/kapatıldığında onun TUI oturumunu da bırak. */
export function closeChatSession(chatId: string): void {
  closeTuiSession(chatId);
}

/**
 * Sohbeti DALLANDIR: ajanın hafızasını sıfırla, süreci kapatmadan.
 *
 * Arayüz bunu mesaj düzenlendiğinde ve cevap yeniden üretildiğinde çağırıyor.
 * `false` dönmesi hata değil: ayakta bir TUI oturumu yoksa sıfırlanacak bir
 * hafıza da yok, sonraki gönderim zaten sıfırdan başlıyor.
 */
export function resetChatHistory(chatId: string): boolean {
  return resetTuiHistory(chatId);
}

export function cancelAllChatMessages(): void {
  for (const id of Array.from(running.keys())) cancelChatMessage(id);
  // Isıtılmış süreç de bırakılmalı: uygulama kapanırken stdin'de bekleyen bir
  // axet-code'u arkada bırakmak, kullanıcının göremediği bir süreç demek.
  disposeWarm();
  // Kalıcı TUI oturumları da öyle — bunlar tam bir interaktif axet-code.
  closeAllTuiSessions();
  tuiRequests.clear();
}
