import type { ChatMessage } from "../components/ChatBubble";

// Sohbeti Markdown'a çeviren dönüştürücü. Dosyaya YAZMA işi ana süreçte
// (`chat:exportMarkdown`); metni burada üretiyoruz, çünkü mesaj/araç yapısını
// bilen taraf renderer.
//
// PDF ARTIK VAR ama BURADAN DEĞİL — bkz. `chatPrint.ts`. Eski not "sohbetin
// ekrandaki hâli baskıya uygun değil" diyordu ve bu doğruydu: yatay kaydırılan
// kod blokları, katlanmış araç dökümleri ve `display:none` duran paneller
// olduğu gibi basılamaz. Çözüm ekranı basmak değil, baskı için AYRI bir belge
// üretmek oldu.
//
// İki biçim, iki farklı iş — ve bu ayrım bilinçli:
//   Markdown → ARŞİV. Her şey tam: araç dökümleri kırpılmadan, ham metin
//              olarak. Başka bir araca yapıştırılabiliyor, diff'lenebiliyor.
//   PDF      → OKUNAN/PAYLAŞILAN belge. Araç dökümleri kırpılıyor (bkz.
//              `chatPrint.ts` `STEP_OUTPUT_MAX_LINES`), çünkü 300 sayfalık
//              grep çıktısı eki olan bir PDF okunmuyor.

/**
 * Dosya adında kullanılamayan karakterleri ayıklar, uzunluğu sınırlar.
 * `ext` uzantıyı belirliyor — kaydetme kutusunun ilk teklifi buna göre.
 */
export function safeFileName(title: string, ext: "md" | "pdf" = "md"): string {
  const base = title
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  // Boş/yalnızca noktalama bir başlık dosya adı olamaz; zaman damgası hem
  // benzersizleştiriyor hem de sıralanabilir kalıyor.
  //
  // SAAT-DAKİKA de var, sadece tarih DEĞİL. Başlıklar ilk mesajdan üretiliyor
  // ve tekrar ediyorlar: ölçüm (2026-09-05) 24 sohbetin 8'inin adı "son
  // mailimi oku", 6'sının "selam". Yalnızca tarihle, aynı gün ikinci bir
  // sohbeti dışa aktarmak birincisinin dosyasının üstüne yazmayı öneriyordu —
  // kaydetme kutusu adı hazır getirdiği için fark edilmesi de zordu.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    ` ${pad(now.getHours())}.${pad(now.getMinutes())}`;
  return `${base || "sohbet"} ${stamp}.${ext}`;
}

/** Tarih + saat, kullanıcının yerel biçiminde. `chatPrint.ts` de kullanıyor. */
export function clock(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Araç çıktısı ve fark, kod bloğuna sarılıyor. İçinde ``` geçen bir çıktı
// bloğu erkenden kapatırdı — sarmalayıcı, içerikteki en uzun ters-tırnak
// dizisinden bir uzun seçiliyor (CommonMark'ın kendi kuralı).
function fence(body: string, lang = ""): string {
  let longest = 0;
  for (const m of body.matchAll(/`+/g)) longest = Math.max(longest, m[0].length);
  const ticks = "`".repeat(Math.max(3, longest + 1));
  return `${ticks}${lang}\n${body}\n${ticks}`;
}

export interface ChatExportInput {
  title: string;
  messages: ChatMessage[];
  /** Sohbetin çalışma klasörü — varsa başlığın altına yazılıyor. */
  contextPath?: string | null;
  /** Bağlı SAP sistemi vb. etiket. */
  contextLabel?: string | null;
}

export function chatToMarkdown(input: ChatExportInput): string {
  const out: string[] = [];
  out.push(`# ${input.title}`, "");
  const meta: string[] = [`Dışa aktarma: ${clock(Date.now())}`];
  if (input.contextLabel) meta.push(`Bağlam: ${input.contextLabel}`);
  if (input.contextPath) meta.push(`Klasör: \`${input.contextPath}\``);
  out.push(meta.join("  \n"), "");

  for (const message of input.messages) {
    if (message.role === "user") {
      out.push(`## 👤 Soru — ${clock(message.createdAt)}`, "");
      if (message.content) out.push(message.content, "");
      const attachments = message.attachments ?? [];
      if (attachments.length > 0) {
        out.push(`_Ekler: ${attachments.map((a) => a.name).join(", ")}_`, "");
      }
      continue;
    }

    out.push(`## 🤖 Cevap — ${clock(message.createdAt)}`, "");

    // Araç dökümü cevabın ÖNÜNE geliyor — ekranda da öyle, çünkü olaylar
    // cevaptan önce oldu. Katlanabilir `<details>` kullanılıyor: GitHub ve
    // çoğu görüntüleyici destekliyor, desteklemeyende de düz metin olarak
    // okunabiliyor.
    const steps = message.steps ?? [];
    if (steps.length > 0) {
      out.push("<details>", `<summary>${steps.length} araç adımı</summary>`, "");
      for (const step of steps) {
        const head = [step.tool, step.target].filter(Boolean).join(" — ");
        out.push(`- **${head || step.phase}**`);
        if (step.output) out.push("", fence(step.output), "");
        else if (step.result) out.push(`  - ${step.result}${step.extraLines ? ` (+${step.extraLines} satır)` : ""}`);
        if (step.diff) out.push("", fence(step.diff, "diff"), "");
      }
      out.push("", "</details>", "");
    }

    if (message.error) out.push("> ⚠️ Bu cevap bir hata bildirimi.", "");
    if (message.restartedReason) {
      out.push(`> ℹ️ Bu cevaptan önce oturum yenilendi (${message.restartedReason}).`, "");
    }
    // Yarım bir cevabın tam sanılması "yanlış bilgi" — ekranda görünüyor,
    // dosyada da görünmeli.
    if (message.interrupted) {
      out.push("> ⚠️ Bu cevap yarıda kesildi; cümlenin ortasında bitiyor olabilir.", "");
    }
    out.push(message.content, "");
  }

  return out.join("\n");
}
