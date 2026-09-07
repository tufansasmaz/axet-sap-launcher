import { clock, type ChatExportInput } from "./chatExport";
import {
  BULLET_RE,
  HEADING_RE,
  HR_RE,
  INLINE_TOKEN,
  ORDERED_RE,
  QUOTE_RE,
  TABLE_DIVIDER,
  splitRow,
} from "./markdownLite";

// Sohbeti PDF'e basılmak üzere BAĞIMSIZ bir HTML belgesine çeviriyor. Yazdırma
// işi ana süreçte (`chat:export` → gizli bir BrowserWindow + `printToPDF`);
// belge burada üretiliyor, çünkü mesaj/araç yapısını bilen taraf renderer.
//
// NEDEN EKRANIN KENDİSİ BASILMIYOR: sohbetin ekrandaki hâli baskıya uygun
// değil. Kod blokları yatay KAYDIRILIYOR (kağıtta kaydırma yok, sağı kesilir),
// araç dökümleri KATLI duruyor (`<details>` kapalıyken basılmaz), yan paneller
// `display:none` ve tema koyu (bir sohbeti dolu sayfa siyahla basmak hem
// okunmuyor hem yazıcıyı boşaltıyor). Bu yüzden ekranı yakalamak yerine baskı
// için ayrı bir belge kuruluyor: açık zemin, sarmalanan kod, açılmış dökümler.
//
// Belge TAMAMEN bağımsız: dış CSS yok, font yok, script yok, ağ isteği yok.
// Gizli pencere de `javascript: false` ile açılıyor — içerik sonuçta bir dil
// modelinin ürettiği metin, ve burada çalıştırılacak hiçbir şeyi yok.
//
// Gramer `markdownLite.tsx` ile PAYLAŞILIYOR (desenler oradan import ediliyor).
// Blok dağıtımı yine de ayrı, çünkü o dosya React elemanı üretiyor: Tailwind
// sınıfları bu belgede yok, `CopyButton` bir PDF'te anlamsız ve harici linkler
// orada `window.api` ile açılıyor. Yeni bir markdown bloğu eklenirse İKİ yere
// de eklenmeli.

// Araç çıktısı bu satır sayısında kırpılıyor. Markdown dışa aktarması TAM
// çıktıyı taşıyor; PDF okunan/paylaşılan belge, 300 sayfalık grep çıktısı eki
// olan bir PDF okunmuyor. Kırpma GÖRÜNÜR — kaç satır atlandığı yazılıyor ki
// belgeyi okuyan eksik olduğunu bilsin (bkz. aşağıdaki `+N satır` notu).
const STEP_OUTPUT_MAX_LINES = 40;

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// `http(s)` DIŞINDAKİ şemalar (javascript:, file: …) href olmuyor, düz metne
// düşüyor — aynı kural ekranda da geçerli (bkz. markdownLite `openLink`).
//
// Etiket ile hedef farklıysa URL de yazılıyor: kağıtta bir linkin nereye
// gittiği görünmez, "buraya bak" diye basılmış bir cümle okuyucuya hiçbir şey
// vermez.
function link(href: string, label: string): string {
  if (!/^https?:\/\//i.test(href)) return esc(label);
  const anchor = `<a href="${esc(href)}">${esc(label)}</a>`;
  return label === href ? anchor : `${anchor} <span class="url">(${esc(href)})</span>`;
}

function inline(text: string): string {
  let out = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // `INLINE_TOKEN` global (`g`) — paylaşılan bir regex olduğu için gezinme
  // konumu sıfırlanmadan kullanılamaz.
  INLINE_TOKEN.lastIndex = 0;
  while ((match = INLINE_TOKEN.exec(text))) {
    if (match.index > lastIndex) out += esc(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("`")) out += `<code>${esc(token.slice(1, -1))}</code>`;
    else if (token.startsWith("**")) out += `<strong>${esc(token.slice(2, -2))}</strong>`;
    else if (token.startsWith("~~")) out += `<s>${esc(token.slice(2, -2))}</s>`;
    else if (token.startsWith("*")) out += `<em>${esc(token.slice(1, -1))}</em>`;
    else if (token.startsWith("[")) {
      const linkMatch = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(token);
      out += linkMatch ? link(linkMatch[2], linkMatch[1]) : esc(token);
    } else out += link(token, token);
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) out += esc(text.slice(lastIndex));
  return out;
}

/** Markdown → baskı HTML'i. `renderMarkdownLite` ile aynı gramer. */
function markdownToHtml(content: string): string {
  const lines = content.split(/\r?\n/);
  const blocks: string[] = [];
  let paraBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listOrdered = false;
  let quoteBuffer: string[] = [];

  const flushPara = () => {
    if (paraBuffer.length === 0) return;
    blocks.push(`<p>${inline(paraBuffer.join("\n"))}</p>`);
    paraBuffer = [];
  };
  const flushList = () => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((item) => `<li>${inline(item)}</li>`).join("");
    blocks.push(listOrdered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`);
    listBuffer = [];
  };
  const flushQuote = () => {
    if (quoteBuffer.length === 0) return;
    blocks.push(`<blockquote>${inline(quoteBuffer.join("\n"))}</blockquote>`);
    quoteBuffer = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      flushAll();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      // lang="en": belge `<html lang="tr">`, `.code-lang` ise `uppercase` çiziliyor.
      // İşaretlenmezse "typescript" Türkçe büyütme kuralıyla "TYPESCRİPT" basılır.
      const label = lang ? `<div class="code-lang" lang="en">${esc(lang)}</div>` : "";
      blocks.push(`<div class="code">${label}<pre>${esc(codeLines.join("\n"))}</pre></div>`);
      continue;
    }

    const headingMatch = HEADING_RE.exec(trimmed);
    if (headingMatch) {
      flushAll();
      // Kağıtta başlık kademeleri ekrandakinden biraz daha ayrışıyor: bir PDF
      // baştan sona okunuyor, ekrandaki gibi tek cevaba odaklanılmıyor.
      const level = Math.min(headingMatch[1].length + 2, 6);
      blocks.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    if (HR_RE.test(trimmed)) {
      flushAll();
      blocks.push("<hr />");
      i++;
      continue;
    }

    if (trimmed.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      flushAll();
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const head = headers.map((h) => `<th>${inline(h)}</th>`).join("");
      // Başlıktan az/çok hücreli satırlar olabiliyor; başlık sayısına
      // hizalanıyor ki tablo kaymasın (ekranda da öyle).
      const body = rows
        .map((row) => `<tr>${headers.map((_, ci) => `<td>${inline(row[ci] ?? "")}</td>`).join("")}</tr>`)
        .join("");
      blocks.push(`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
      continue;
    }

    const quoteMatch = QUOTE_RE.exec(line);
    if (quoteMatch) {
      flushPara();
      flushList();
      quoteBuffer.push(quoteMatch[1]);
      i++;
      continue;
    }

    const orderedMatch = ORDERED_RE.exec(line);
    if (orderedMatch) {
      flushPara();
      flushQuote();
      if (!listOrdered) flushList();
      listOrdered = true;
      listBuffer.push(orderedMatch[1]);
      i++;
      continue;
    }

    const listMatch = BULLET_RE.exec(line);
    if (listMatch) {
      flushPara();
      flushQuote();
      if (listOrdered) flushList();
      listOrdered = false;
      listBuffer.push(listMatch[1]);
      i++;
      continue;
    }

    if (trimmed === "") {
      flushAll();
      i++;
      continue;
    }

    flushList();
    flushQuote();
    paraBuffer.push(line);
    i++;
  }
  flushAll();
  return blocks.join("\n");
}

/** Uzun araç çıktısını kırpar ve kaç satırın atlandığını GÖRÜNÜR kılar. */
function clampOutput(text: string): string {
  const lines = text.split(/\r?\n/);
  if (lines.length <= STEP_OUTPUT_MAX_LINES) return `<pre>${esc(text)}</pre>`;
  const shown = lines.slice(0, STEP_OUTPUT_MAX_LINES).join("\n");
  const hidden = lines.length - STEP_OUTPUT_MAX_LINES;
  return (
    `<pre>${esc(shown)}</pre>` +
    `<div class="clamped">+${hidden} satır kırpıldı — tamamı için Markdown olarak dışa aktarın</div>`
  );
}

const STYLE = `
  @page { size: A4; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1b1b1f;
    background: #fff;
  }
  /* Kod ve tablolar SARMALANIYOR. Kağıtta yatay kaydırma yok: sarmalanmayan
     uzun bir satır sağdan kesiliyor ve bir daha hiçbir yerde görünmüyor. */
  pre, code { font-family: "Cascadia Mono", Consolas, "Courier New", monospace; }
  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 8.5pt;
    line-height: 1.45;
  }
  code { font-size: 0.88em; background: #f1f1f4; border-radius: 3px; padding: 0 3px; }
  .code { border: 1px solid #dcdce2; border-radius: 6px; overflow: hidden; margin: 8px 0; }
  .code pre { padding: 8px 10px; background: #fafafb; }
  .code-lang {
    padding: 3px 10px;
    background: #f1f1f4;
    border-bottom: 1px solid #dcdce2;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b6b76;
  }
  h1.doc { font-size: 19pt; margin: 0 0 4px; }
  .doc-meta { font-size: 9pt; color: #6b6b76; margin-bottom: 16px; }
  .doc-meta div { margin-top: 1px; }
  hr.doc-rule { border: 0; border-top: 2px solid #1b1b1f; margin: 0 0 18px; }
  /* Rol başlığı yalnız kalmasın: sayfa sonunda "Cevap" yazıp içeriği bir
     sonraki sayfaya atmak, belgeyi okunamaz hâle getiren klasik baskı hatası. */
  .who { break-after: avoid; page-break-after: avoid; font-size: 8.5pt; font-weight: 600;
         text-transform: uppercase; letter-spacing: 0.07em; color: #6b6b76; margin: 0 0 5px; }
  .msg { margin: 0 0 18px; }
  .msg.user { background: #f4f4f7; border-left: 3px solid #9a9aa6; border-radius: 0 6px 6px 0;
              padding: 9px 12px; }
  .msg.user .body { white-space: pre-wrap; overflow-wrap: anywhere; }
  .attachments { margin-top: 6px; font-size: 8.5pt; color: #6b6b76; font-style: italic; }
  .note { border-left: 3px solid #b48a2f; background: #fbf6e9; padding: 6px 10px;
          border-radius: 0 5px 5px 0; font-size: 9pt; margin: 0 0 8px; }
  .note.error { border-left-color: #b1424a; background: #fbeced; }
  .steps { border: 1px solid #e2e2e8; border-radius: 6px; margin: 0 0 10px; }
  .steps-head { padding: 4px 10px; background: #f4f4f7; border-bottom: 1px solid #e2e2e8;
                font-size: 8pt; font-weight: 600; text-transform: uppercase;
                letter-spacing: 0.06em; color: #6b6b76; }
  .step { padding: 7px 10px; border-bottom: 1px solid #eeeef2; }
  .step:last-child { border-bottom: 0; }
  .step-head { font-size: 9pt; font-weight: 600; }
  .step-result { font-size: 9pt; color: #4a4a55; }
  .clamped { margin-top: 4px; font-size: 8pt; font-style: italic; color: #8a6d1f; }
  blockquote { margin: 8px 0; padding-left: 10px; border-left: 3px solid #d0d0d8; color: #4a4a55; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt;
          table-layout: fixed; }
  th, td { border: 1px solid #dcdce2; padding: 4px 7px; text-align: left; vertical-align: top;
           overflow-wrap: anywhere; }
  th { background: #f4f4f7; font-weight: 600; }
  p { margin: 0 0 8px; }
  ul, ol { margin: 0 0 8px; padding-left: 22px; }
  li { margin-bottom: 2px; }
  h3, h4, h5, h6 { margin: 12px 0 5px; break-after: avoid; page-break-after: avoid; }
  a { color: #1f5fa8; }
  .url { color: #6b6b76; font-size: 0.85em; }
`;

/**
 * Sohbeti, `printToPDF`'e verilebilecek bağımsız bir HTML belgesine çevirir.
 * Dönen metin tek başına açılabilir: dış kaynak, script ve ağ isteği yok.
 */
export function chatToPrintHtml(input: ChatExportInput): string {
  const out: string[] = [];
  out.push(`<h1 class="doc">${esc(input.title)}</h1>`);

  const meta = [`Dışa aktarma: ${esc(clock(Date.now()))}`];
  if (input.contextLabel) meta.push(`Bağlam: ${esc(input.contextLabel)}`);
  if (input.contextPath) meta.push(`Klasör: ${esc(input.contextPath)}`);
  out.push(`<div class="doc-meta">${meta.map((m) => `<div>${m}</div>`).join("")}</div>`);
  out.push(`<hr class="doc-rule" />`);

  for (const message of input.messages) {
    if (message.role === "user") {
      out.push(`<section class="msg user">`);
      out.push(`<div class="who">Soru · ${esc(clock(message.createdAt))}</div>`);
      // Kullanıcı metni markdown olarak ÇİZİLMİYOR — ekranda da öyle (bkz.
      // ChatBubble: `renderMarkdownLite` yalnızca asistan cevaplarına
      // uygulanıyor). Yazdığı yıldızlar yıldız olarak kalmalı.
      if (message.content) out.push(`<div class="body">${esc(message.content)}</div>`);
      const attachments = message.attachments ?? [];
      if (attachments.length > 0) {
        out.push(`<div class="attachments">Ekler: ${esc(attachments.map((a) => a.name).join(", "))}</div>`);
      }
      out.push(`</section>`);
      continue;
    }

    out.push(`<section class="msg">`);
    out.push(`<div class="who">Cevap · ${esc(clock(message.createdAt))}</div>`);

    // Araç dökümü cevabın ÖNÜNE geliyor — ekranda da öyle, çünkü olaylar
    // cevaptan önce oldu. Ekranda katlanabilir; burada AÇIK, kağıtta
    // katlanacak bir şey yok.
    const steps = message.steps ?? [];
    if (steps.length > 0) {
      out.push(`<div class="steps"><div class="steps-head">${steps.length} araç adımı</div>`);
      for (const step of steps) {
        const head = [step.tool, step.target].filter(Boolean).join(" — ") || step.phase;
        out.push(`<div class="step"><div class="step-head">${esc(String(head))}</div>`);
        if (step.output) out.push(clampOutput(step.output));
        else if (step.result) {
          const extra = step.extraLines ? ` (+${step.extraLines} satır)` : "";
          out.push(`<div class="step-result">${esc(step.result + extra)}</div>`);
        }
        if (step.diff) out.push(clampOutput(step.diff));
        out.push(`</div>`);
      }
      out.push(`</div>`);
    }

    if (message.error) out.push(`<div class="note error">Bu cevap bir hata bildirimi.</div>`);
    if (message.restartedReason) {
      out.push(`<div class="note">Bu cevaptan önce oturum yenilendi (${esc(message.restartedReason)}).</div>`);
    }
    // Kırpılmış bir cevabın tam sanılması "yanlış bilgi" — belgede kalıcı
    // olarak görünmesi şart.
    if (message.interrupted) {
      out.push(`<div class="note">Bu cevap yarıda kesildi; cümlenin ortasında bitiyor olabilir.</div>`);
    }
    out.push(markdownToHtml(message.content));
    out.push(`</section>`);
  }

  return [
    "<!doctype html>",
    `<html lang="tr"><head><meta charset="utf-8" />`,
    `<title>${esc(input.title)}</title>`,
    `<style>${STYLE}</style>`,
    `</head><body>`,
    out.join("\n"),
    `</body></html>`,
  ].join("\n");
}
