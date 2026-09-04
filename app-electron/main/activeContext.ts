import type { ActiveContext, ActiveGuiContext, ActiveSapContext } from "../shared/types";

// Uygulamanın ÜÇ ekranının ortak hafızası: "şu an hangi SAP sistemine bağlıyız
// ve SAP GUI'de hangi ekrandayız". Kullanıcı isteği (2026-09-04): *"bu 3 farklı
// uygulamayı tek bir yere toplamış gibi / birbiriyle haberleri olsun"*.
//
// NEDEN MAIN PROCESS'TE, React state'inde değil: bu bilgiyi okuyan iki yer
// renderer'da DEĞİL. Sohbet ajanı `axetChat.ts`'te spawn ediliyor (prompt'una
// bağlam bloğu buradan giriyor) ve bağlantının kendisi `launcher.ts`'te
// kuruluyor. React state'i olsaydı main tarafı kendi yazdığı gerçeği geri
// okuyamazdı; ayrıca hangi bileşenin mount olduğu sorusuna bağlı kalırdı.
//
// NEDEN DİSKE YAZILMIYOR: canlı bir bağlantı, yeniden başlatmayı ATLATMAYAN bir
// olgu. RFC bridge ölür, `.conn_adt` bayatlar, oturum düşer. Kalıcı olsaydı
// uygulama bir sonraki açılışta "PRD'ye bağlısın" diye YANLIŞ bir şey iddia
// ederdi — ve bu, birinin yanlış sisteme iş yaptırmasına yol açan tam olarak o
// tür yalan. Bellekte duruyor, kapanınca gidiyor.
//
// TEK YAZAR KURALI: `sap` alanını yalnızca başarılı `system:connect` yazar,
// `gui` alanını yalnızca SAP GUI Scripting ekranı yazar. Renderer bunları
// üretmiyor, sadece okuyor ve (kullanıcı isterse) temizliyor.

let current: ActiveContext = { sap: null, gui: null };

// Değişiklik yayını. `index.ts` pencereyi bildiği için emitter'ı o kuruyor —
// bu modül `electron`'a hiç dokunmuyor, böylece test edilebilir ve main/preload
// ayrımı bulanmıyor.
let emit: ((context: ActiveContext) => void) | null = null;

export function setActiveContextEmitter(fn: ((context: ActiveContext) => void) | null): void {
  emit = fn;
}

function publish(): void {
  try {
    emit?.(current);
  } catch {
    // pencere kapanmış olabilir — yayın hatası bağlamı bozmamalı
  }
}

export function getActiveContext(): ActiveContext {
  return current;
}

export function setActiveSap(sap: ActiveSapContext): void {
  // Sisteme yeniden bağlanmak GUI bağlamını da geçersiz kılar: eski oturum
  // başka bir sisteme aitti ve onu taşımak, ekranda birbiriyle çelişen iki
  // sistem adı göstermek demekti.
  const sameSystem = current.sap?.uuid === sap.uuid;
  current = { sap, gui: sameSystem ? current.gui : null };
  publish();
}

export function clearActiveSap(): void {
  if (!current.sap) return;
  current = { sap: null, gui: current.gui };
  publish();
}

export function setActiveGui(gui: ActiveGuiContext | null): void {
  // Aynı ekranı saniyede bir yayınlamamak için: SAP GUI Scripting ekranı
  // `getScreen`'i düzenli aralıkla yokluyor ve çoğu yoklama AYNI ekranı
  // döndürüyor. Değişmediyse ne state yazılıyor ne de yayın yapılıyor —
  // aksi hâlde her yoklama tüm renderer'ı yeniden render ederdi.
  if (sameGui(current.gui, gui)) return;
  current = { sap: current.sap, gui };
  publish();
}

function sameGui(a: ActiveGuiContext | null, b: ActiveGuiContext | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.connectionIndex === b.connectionIndex &&
    a.sessionIndex === b.sessionIndex &&
    a.systemName === b.systemName &&
    a.client === b.client &&
    a.user === b.user &&
    a.transaction === b.transaction &&
    a.program === b.program &&
    a.title === b.title
  );
}

// Sohbet ajanının prompt'una eklenen bağlam bloğu (bkz. axetChat.ts).
// Boş string = eklenecek bir şey yok; çağıran taraf o zaman prompt'a hiç
// dokunmuyor.
//
// KISA TUTULUYOR. Bu metin HER mesajın başına giriyor; uzun bir sistem
// tanıtımı hem jeton yakar hem de ajanı kullanıcının asıl sorusundan
// uzaklaştırır. Sadece "neredeyiz" deniyor, ne yapılacağı söylenmiyor.
export function buildContextPreamble(cwd: string): string {
  const { sap, gui } = current;
  // Bağlam YALNIZCA o sisteme bağlı sohbetlere giriyor: sohbetin çalışma
  // klasörü bağlantının proje klasörüyse. Genel bir sohbette "S4D'ye
  // bağlısın" demek, kullanıcının hiç sormadığı bir bağlamı her cevaba
  // sızdırmak olurdu.
  if (!sap || !cwd || normalize(cwd) !== normalize(sap.projectDir)) return "";

  const lines = [
    "Aktif SAP bağlamı (bu sohbet bu sisteme bağlı):",
    // Host BTP/Cloud girdilerinde yok — o zaman satırdan tamamen düşüyor,
    // "host null" yazmıyor.
    `- Sistem: ${sap.systemId || sap.systemName}${sap.tier ? ` (${sap.tier})` : ""}${sap.host ? ` · host ${sap.host}` : ""}`,
    `- Client ${sap.client} · kullanıcı ${sap.username}`,
    `- Proje klasörü: ${sap.projectDir} (bağlantı ayrıntıları .conn_adt ve sap-context.md dosyalarında)`
  ];
  if (!sap.verified) {
    lines.push("- DİKKAT: bu bağlantı doğrulanamadı; ADT çağrıları başarısız olabilir.");
  }
  if (sap.tier === "QA" || sap.tier === "PRD") {
    // Kullanıcının kendi kuralı (bkz. PROJE-BILGI.md / SAP araç seti):
    // QA/PRD'de yazma yok, taşıma isteği olmadan hiçbir değişiklik yok.
    lines.push(`- Bu bir ${sap.tier} sistemi: yazma işlemi yapma, önce kullanıcıya sor.`);
  }
  if (gui) {
    const where = gui.transaction ? `işlem ${gui.transaction}` : gui.program ? `program ${gui.program}` : "bilinmeyen ekran";
    lines.push(`- Kullanıcının SAP GUI ekranı: ${where}${gui.title ? ` — "${gui.title}"` : ""}`);
  }
  return `${lines.join("\n")}\n\n`;
}

function normalize(p: string): string {
  return p.replace(/[\\/]+$/, "").toLowerCase();
}
