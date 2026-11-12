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

let current: ActiveContext = { sap: null, gui: null, systems: [] };

// Çoklu sistem (2026-11-12): birden fazla bağlı sistem. `sap` odaktaki —
// eski tüketiciler (rozet, Logon seçimi, destek paketi) onu okumaya devam
// ediyor; yeni sohbet/bölme odaktaki sistemin klasöründe açılıyor.
function systemsOf(ctx: ActiveContext): ActiveSapContext[] {
  return ctx.systems ?? [];
}

function sameDirKey(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

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
  const list = systemsOf(current);
  const i = list.findIndex((s) => sameDirKey(s.projectDir, sap.projectDir));
  const systems = i >= 0 ? list.map((s, j) => (j === i ? sap : s)) : [...list, sap];
  current = { sap, gui: sameSystem ? current.gui : null, systems };
  publish();
}

/** Odaktaki sistemi bağlamdan çıkarır (süreçleri kapatmak çağıranın işi). */
export function clearActiveSap(): void {
  if (!current.sap) return;
  removeActiveSap(current.sap.projectDir);
}

/** Bir sistemi bağlamdan çıkarır; odaktaysa odak en son bağlanan öteki sisteme geçer. */
export function removeActiveSap(projectDir: string): void {
  const list = systemsOf(current);
  const systems = list.filter((s) => !sameDirKey(s.projectDir, projectDir));
  const wasFocused = Boolean(current.sap && sameDirKey(current.sap.projectDir, projectDir));
  if (systems.length === list.length && !wasFocused) return;
  const sap = wasFocused ? (systems[systems.length - 1] ?? null) : current.sap;
  // GUI oturumu odaktaki sisteme aitti; odak değiştiyse taşınmıyor.
  current = { sap, gui: wasFocused ? null : current.gui, systems };
  publish();
}

/** Odağı bağlı bir sisteme taşır (üst şeritteki çip). */
export function focusActiveSap(uuid: string): boolean {
  const target = systemsOf(current).find((s) => s.uuid === uuid);
  if (!target) return false;
  if (current.sap?.uuid !== target.uuid) {
    current = { ...current, sap: target, gui: null };
    publish();
  }
  return true;
}

export function findActiveSap(uuid: string): ActiveSapContext | null {
  return systemsOf(current).find((s) => s.uuid === uuid) ?? null;
}

export function resetActiveContextForTest(): void {
  current = { sap: null, gui: null, systems: [] };
}

export function setActiveGui(gui: ActiveGuiContext | null): void {
  // Aynı ekranı saniyede bir yayınlamamak için: SAP GUI Scripting ekranı
  // `getScreen`'i düzenli aralıkla yokluyor ve çoğu yoklama AYNI ekranı
  // döndürüyor. Değişmediyse ne state yazılıyor ne de yayın yapılıyor —
  // aksi hâlde her yoklama tüm renderer'ı yeniden render ederdi.
  if (sameGui(current.gui, gui)) return;
  current = { ...current, gui };
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
  // Bağlam YALNIZCA o sisteme bağlı sohbetlere giriyor: sohbetin çalışma
  // klasörü bağlantının proje klasörüyse. Genel bir sohbette "SID-G1'e
  // bağlısın" demek, kullanıcının hiç sormadığı bir bağlamı her cevaba
  // sızdırmak olurdu. Çoklu sistemde odaktaki değil, KLASÖRÜN sistemi.
  const sap = cwd ? (systemsOf(current).find((s) => sameDirKey(s.projectDir, cwd)) ?? null) : null;
  if (!sap) return "";
  // GUI ekranı yalnız odaktaki sisteme ait.
  const gui = current.sap?.uuid === sap.uuid ? current.gui : null;
  const port = sap.adtPort ?? 8787;

  const lines = [
    "Aktif SAP bağlamı (bu sohbet bu sisteme bağlı):",
    // Host BTP/Cloud girdilerinde yok — o zaman satırdan tamamen düşüyor,
    // "host null" yazmıyor.
    `- Sistem: ${sap.systemId || sap.systemName}${sap.tier ? ` (${sap.tier})` : ""}${sap.host ? ` · host ${sap.host}` : ""}`,
    `- Client ${sap.client} · kullanıcı ${sap.username}`,
    `- Proje klasörü: ${sap.projectDir} (bağlantı ayrıntıları .conn_adt ve sap-context.md dosyalarında)`,
    // Bu satır 2026-09-24'te eklendi. Ajan araç listesinde `adt_*` göremeyince
    // SID-I'da (DEV, sunucu ayakta) "bu oturumda ADT aracı yok, bağlı değilim"
    // dedi ve tek araç çağrısı yapmadı. Çünkü okuduğu SKILL.md "her şey MCP
    // araçlarıyla" diyordu. Skill metni onarıldı, ama o metni okumadan cevap
    // veren ajanı bu satır yakalıyor.
    `- ADT araçları MCP DEĞİL: bu sistemin sunucusu http://127.0.0.1:${port} (ortamda $ABAP_HTTP_URL), HTTP ile (\`POST /tool/<ad>\`, \`Authorization: Bearer $ABAP_HTTP_TOKEN\`). Araç listende \`adt_*\` görmemen bağlı olmadığın anlamına gelmez; tarif sap-context.md'de.`
  ];
  if (!sap.verified) {
    lines.push("- DİKKAT: bu bağlantı doğrulanamadı; ADT çağrıları başarısız olabilir.");
  }
  if (sap.tier === "DEV") {
    lines.push(`- SAP'a yazma yalnızca ${port} üzerinden, NTT Studio'nun onay penceresiyle. adt-tool.ps1 salt okunur; .conn_adt parolasıyla kendi isteğini kurma.`);
  } else {
    // Kullanıcının kendi kuralı (bkz. PROJE-BILGI.md / SAP araç seti):
    // yazma yalnızca DEV'de. Eski metin "yazma işlemi yapma, önce kullanıcıya
    // sor" diyordu; kullanıcı "evet" deyince ajanın yazabileceğini ima
    // ediyordu. QA/PRD'de onay yolu da yok. İşaretsiz sistem (tier null)
    // `.conn_adt`'de QA yazılıyor (buildConnAdt), burada da öyle sayılıyor.
    lines.push(
      `- Bu bir ${sap.tier ?? "işaretsiz (QA sayılır)"} sistemi: SALT OKUNUR. Kullanıcı istese bile SAP'a yazma yok; yazma yalnızca DEV sisteminin kendi ADT sunucusu üzerinden, onay penceresiyle.`
    );
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
