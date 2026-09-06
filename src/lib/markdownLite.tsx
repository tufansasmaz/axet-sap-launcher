import { type ReactNode } from "react";
import CopyButton from "../components/CopyButton";
import { highlightCode } from "./highlightLite";

// axet.code sohbet cevaplarındaki markdown'ı React elemanlarına çeviren,
// bağımsız/hafif bir dönüştürücü — tam bir CommonMark implementasyonu DEĞİL,
// sohbet cevaplarında gerçekten sık geçen kalıpları kapsıyor:
//   blok  : başlık (#..######), kod bloğu, GFM boru-tablosu, madde işaretli
//           liste, SIRALI liste, alıntı (>), yatay çizgi (---)
//   satır : `kod`, **kalın**, *italik*, ~~üstü çizili~~, [link](url), çıplak URL
// `dangerouslySetInnerHTML` HİÇ kullanılmıyor (React elemanı üretiyoruz, ham
// HTML string'i değil) — bu yüzden XSS riski yok, ek bir sanitizer/markdown
// kütüphanesi gerekmedi.
//
// Kapsam neden genişletildi: gerçek `axet-code` cevapları canlı ölçümde
// düzenli olarak başlık + tablo + sıralı liste üretiyor (bkz. PROJE-BILGI.md
// Faz 1 notu). Bunlar desteklenmediği sürece kullanıcı ham `## Overview` ve
// `|---|---|` satırlarını okuyordu.

// Sıra ÖNEMLİ: `**kalın**` `*italik*`ten ÖNCE gelmeli, yoksa italik kuralı
// kalın işaretinin ilk yıldızını yiyip bozuk eşleşme üretir. Satır içi kod
// (`) en başta, çünkü içindeki yıldız/alt tire biçimlendirilmemeli.
//
// DIŞA AÇIK, çünkü ikinci bir tüketicisi var: `chatPrint.ts` aynı markdown'ı
// PDF için statik HTML'e çeviriyor. O dosya React üretemez (baskı belgesi
// bağımsız, Tailwind'siz ve etkileşimsiz), bu yüzden blok dağıtımını kendi
// yapıyor — ama DESENLER paylaşılıyor ki gramerin iki ayrı tanımı oluşmasın.
export const INLINE_TOKEN =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))|(https?:\/\/[^\s)]+)/g;

const LINK_CLASS = "text-accent-400 underline underline-offset-2 hover:text-accent-500";

// Linkler Electron'un renderer'ında `target="_blank"` ile açılamaz (yeni bir
// BrowserWindow doğar ya da tamamen engellenir); doğru yol işletim sisteminin
// varsayılan tarayıcısına devretmek. `http(s)` DIŞINDAKİ şemalar (javascript:,
// file: vb.) bilinçli olarak reddediliyor — bir LLM cevabından gelen metne
// kabuk/uygulama açtırmak istemiyoruz.
function openLink(e: React.MouseEvent, url: string) {
  e.preventDefault();
  e.stopPropagation();
  if (!/^https?:\/\//i.test(url)) return;
  window.api.openExternalUrl(url).catch(() => {});
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} onClick={(e) => openLink(e, href)} className={LINK_CLASS}>
      {children}
    </a>
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_TOKEN.lastIndex = 0;
  while ((match = INLINE_TOKEN.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i}`;
    if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-base-800 px-1 py-0.5 font-mono text-[0.85em] text-slate-200">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("~~")) {
      nodes.push(
        <span key={key} className="line-through opacity-70">
          {token.slice(2, -2)}
        </span>
      );
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const linkMatch = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(token);
      if (linkMatch) {
        nodes.push(
          <ExternalLink key={key} href={linkMatch[2]}>
            {linkMatch[1]}
          </ExternalLink>
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <ExternalLink key={key} href={token}>
          {token}
        </ExternalLink>
      );
    }
    lastIndex = match.index + token.length;
    i++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// Kod bloğu: üstte dil rozeti + kopyala butonu olan bir başlık şeridi. Kopyala
// SADECE hover'da beliriyor (uzun cevaplarda her bloğun üstünde sabit bir
// ikon görsel gürültü olurdu) ama `focus-within` ile klavyeden de erişilebilir.
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="group/code overflow-hidden rounded-lg border border-base-700 bg-base-950">
      <div className="flex items-center justify-between border-b border-base-700 bg-base-900/60 px-3 py-1">
        <span className="font-mono text-[10px] uppercase tracking-wide text-slate-500">{lang || "text"}</span>
        <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover/code:opacity-100">
          <CopyButton value={code} />
        </span>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs text-slate-200">
        <code className={lang ? `language-${lang}` : undefined}>{highlightCode(code, lang)}</code>
      </pre>
    </div>
  );
}

// GFM boru-tablosu ayırıcı satırı: |---|:---:|---:| gibi. Bir satırın TABLO
// BAŞLIĞI olduğunu ancak BİR SONRAKİ satır buysa anlarız.
export const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

export function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

// Blok desenleri. Döngünün içine gömülü literaller olarak duruyorlardı;
// `chatPrint.ts` aynı grameri baskı için yeniden dağıtmak zorunda olduğundan
// buraya çıkarıldılar — iki dosyanın FARKLI listeler taşıması, bir gün
// birinde düzeltilip diğerinde unutulan bir ayrıştırma hatası demek olurdu.
// Hiçbirinde `g` bayrağı yok, yani paylaşılmaları `lastIndex` taşımıyor.
export const HEADING_RE = /^(#{1,6})\s+(.*)$/;
export const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
export const QUOTE_RE = /^\s*>\s?(.*)$/;
// En fazla 3 hane: Türkçe metinde "2024. yılında..." gibi bir cümle başlangıcı
// sınırsız `\d+` ile yanlışlıkla liste maddesine dönüşüyordu.
export const ORDERED_RE = /^\s*\d{1,3}[.)]\s+(.*)$/;
export const BULLET_RE = /^\s*[-*+]\s+(.*)$/;

export function renderMarkdownLite(content: string): ReactNode {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let paraBuffer: string[] = [];
  // Madde listesi: `ordered` ile aynı tampon kullanılıyor, çünkü iki liste
  // türü art arda gelmez — tür değişirse önceki tampon zaten boşaltılır.
  let listBuffer: string[] = [];
  let listOrdered = false;
  let quoteBuffer: string[] = [];

  const flushPara = () => {
    if (paraBuffer.length === 0) return;
    const key = `p-${blocks.length}`;
    blocks.push(
      <p key={key} className="whitespace-pre-wrap leading-relaxed">
        {renderInline(paraBuffer.join("\n"), key)}
      </p>
    );
    paraBuffer = [];
  };
  const flushList = () => {
    if (listBuffer.length === 0) return;
    const key = `list-${blocks.length}`;
    const items = listBuffer.map((item, idx) => (
      <li key={`${key}-${idx}`} className="pl-0.5">
        {renderInline(item, `${key}-${idx}`)}
      </li>
    ));
    blocks.push(
      listOrdered ? (
        <ol key={key} className="ml-5 list-decimal space-y-1">
          {items}
        </ol>
      ) : (
        <ul key={key} className="ml-5 list-disc space-y-1">
          {items}
        </ul>
      )
    );
    listBuffer = [];
  };
  const flushQuote = () => {
    if (quoteBuffer.length === 0) return;
    const key = `q-${blocks.length}`;
    blocks.push(
      <blockquote key={key} className="border-l-2 border-base-600 pl-3 text-slate-400">
        {renderInline(quoteBuffer.join("\n"), key)}
      </blockquote>
    );
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

    // --- kod bloğu ---
    if (trimmed.startsWith("```")) {
      flushAll();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // kapanış çubuğunu atla (akış hâlâ sürüyorsa hiç gelmemiş olabilir — sorun değil)
      blocks.push(<CodeBlock key={`code-${blocks.length}`} code={codeLines.join("\n")} lang={lang} />);
      continue;
    }

    // --- başlık ---
    const headingMatch = HEADING_RE.exec(trimmed);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const key = `h-${blocks.length}`;
      // Sohbet gövdesi 14px; başlıklar ondan çok fazla ayrışmamalı (bir
      // cevabın içindeki `#`, sayfa başlığı değil bölüm ayıracı).
      const cls =
        level === 1
          ? "mt-1 text-base font-semibold text-slate-100"
          : level === 2
            ? "mt-1 text-sm font-semibold text-slate-100"
            : "mt-1 text-sm font-semibold text-slate-300";
      blocks.push(
        <div key={key} className={cls}>
          {renderInline(headingMatch[2], key)}
        </div>
      );
      i++;
      continue;
    }

    // --- yatay çizgi ---
    if (HR_RE.test(trimmed)) {
      flushAll();
      blocks.push(<hr key={`hr-${blocks.length}`} className="border-base-700" />);
      i++;
      continue;
    }

    // --- tablo (başlık satırı + ayırıcı satır) ---
    if (trimmed.includes("|") && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      flushAll();
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const key = `tbl-${blocks.length}`;
      blocks.push(
        <div key={key} className="overflow-x-auto rounded-lg border border-base-700">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-base-900/60">
                {headers.map((h, hi) => (
                  <th
                    key={`${key}-h-${hi}`}
                    className="border-b border-base-700 px-2.5 py-1.5 text-left font-semibold text-slate-300"
                  >
                    {renderInline(h, `${key}-h-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={`${key}-r-${ri}`} className="border-b border-base-700/60 last:border-b-0">
                  {/* Başlıktan az/çok hücreli satırlar sohbet cevaplarında
                      olabiliyor; başlık sayısına göre hizalıyoruz ki tablo
                      kaymasın. */}
                  {headers.map((_, ci) => (
                    <td key={`${key}-r-${ri}-${ci}`} className="px-2.5 py-1.5 align-top text-slate-400">
                      {renderInline(row[ci] ?? "", `${key}-r-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // --- alıntı ---
    const quoteMatch = QUOTE_RE.exec(line);
    if (quoteMatch) {
      flushPara();
      flushList();
      quoteBuffer.push(quoteMatch[1]);
      i++;
      continue;
    }

    // --- sıralı liste --- (hane sınırının gerekçesi için bkz. `ORDERED_RE`)
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

    // --- madde işaretli liste ---
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

  // `space-y-2`: bloklar arası tek merkezî dikey ritim — her blok tipine ayrı
  // margin vermek yerine (öyleyken başlık/tablo/liste birleşimlerinde
  // margin-collapse yüzünden düzensiz boşluklar çıkıyordu).
  return <div className="space-y-2">{blocks}</div>;
}
