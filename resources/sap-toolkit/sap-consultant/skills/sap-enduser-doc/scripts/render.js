#!/usr/bin/env node
/**
 * render.js — Markdown → styled HTML → PDF (Playwright)
 *
 * Usage:
 *   node scripts/render.js work/document.md work/output.pdf [--logo path/to/logo.png] [--accent "#0a6ed1"]
 *
 * Expects the Markdown to start with a frontmatter block:
 *   --- title / subtitle / customer / version / date / system / transaction / author ---
 *
 * Pipeline:
 *   1. Parse frontmatter + body.
 *   2. marked → HTML, with custom handling for:
 *        - ```mermaid blocks  → <pre class="mermaid"> (rendered in-browser before print)
 *        - > [!NOT] / [!IPUCU] / [!DIKKAT] blockquotes → styled admonition divs
 *   3. Build cover page + TOC (from h1/h2) + content, inline assets/style.css.
 *   4. Playwright Chromium loads the HTML (file://, so relative image paths work),
 *      waits for Mermaid to finish, prints A4 PDF with header/footer templates.
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked'); // requires marked >= 13 (token-object renderer API)

// ---------- CLI ----------
const args = process.argv.slice(2);
if (require.main === module && args.length < 2) {
  console.error('Usage: node render.js <input.md> <output.pdf> [--logo file] [--accent "#hex"]');
  process.exit(1);
}
const mdPath = args[0] ? path.resolve(args[0]) : null;
const pdfPath = args[1] ? path.resolve(args[1]) : null;
const logoPath = args.includes('--logo') ? path.resolve(args[args.indexOf('--logo') + 1]) : null;
const accent = args.includes('--accent') ? args[args.indexOf('--accent') + 1] : null;

const skillRoot = path.resolve(__dirname, '..');
const cssPath = path.join(skillRoot, 'assets', 'style.css');

// Logo: an explicit --logo wins; otherwise fall back to the bundled corporate logo so the
// cover AND the running page header carry the brand mark without needing the flag.
const defaultLogo = path.join(skillRoot, 'assets', 'ntt-data-logo.png');
const resolvedLogo = (logoPath && fs.existsSync(logoPath))
  ? logoPath
  : (fs.existsSync(defaultLogo) ? defaultLogo : null);

/** Read an image as a data: URI — Playwright's header/footer templates cannot load
 *  file:// resources, so the header logo must be inlined as base64. */
function logoDataUri() {
  if (!resolvedLogo) return null;
  const ext = path.extname(resolvedLogo).slice(1).toLowerCase();
  const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
  return `data:${mime};base64,${fs.readFileSync(resolvedLogo).toString('base64')}`;
}

// ---------- Frontmatter ----------
function parseFrontmatter(raw) {
  const meta = {};
  // Normalize BOM/CRLF and drop any leading template usage comment (e.g. the
  // "ŞABLON KULLANIMI" block in assets/template.md) so the frontmatter regex still
  // anchors correctly if an author forgets to delete it — otherwise the whole
  // frontmatter block falls through as literal body text (raw metadata visible to the
  // reader, and the last "key: value" line right before the closing --- gets parsed by
  // marked as a Setext heading, polluting the İçindekiler/TOC).
  //
  // HTML comments can't be reliably nested (a literal "-->" inside example text ends
  // the comment early), so instead of trying to balance <!-- --> pairs with a regex,
  // find the real frontmatter opener (a lone "---" line) and, if everything before it
  // looks like a comment/blank preamble, drop that preamble wholesale.
  let body = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const fmStart = body.search(/^---[ \t]*\n/m);
  if (fmStart > 0 && /^\s*<!--/.test(body.slice(0, fmStart))) {
    body = body.slice(fmStart);
  }
  const m = body.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n?/);
  if (m) {
    body = body.slice(m[0].length);
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
      if (kv) meta[kv[1]] = kv[2];
    }
  }
  return { meta, body };
}

// The cover title must always be the program's real functional/business name,
// never a hardcoded generic label, and never a redundant repeat of the subtitle
// ("Kullanıcı Dokümanı" is already shown right below it). This is enforced here
// as a code-level safety net on top of the authoring rule in SKILL.md/template.md,
// so a forgotten placeholder or a copy-pasted subtitle can never reach the PDF.
const GENERIC_TITLE_RE = /^\s*sap\s+kullan[ıi]c[ıi]\s+dok[üu]man[ıi]\s*$/i;
const TRAILING_KULLANICI_DOKUMANI_RE = /[\s\-–—:]*kullan[ıi]c[ıi]\s+dok[üu]man[ıi]\s*$/i;

function resolveCoverTitle(meta) {
  let title = (meta.title || '').trim();
  if (!title || GENERIC_TITLE_RE.test(title)) {
    title = (meta.transaction || '').trim();
  }
  const stripped = title.replace(TRAILING_KULLANICI_DOKUMANI_RE, '').trim();
  title = stripped || title;
  if (!title) title = (meta.transaction || '').trim();
  return title;
}

// ---------- Markdown transforms ----------
function slugify(text) {
  return text.toLowerCase()
    .replace(/[ğ]/g, 'g').replace(/[ü]/g, 'u').replace(/[ş]/g, 's')
    .replace(/[ı]/g, 'i').replace(/[ö]/g, 'o').replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const ADMONITIONS = {
  'NOT':    { cls: 'note',    title: 'Not' },
  'IPUCU':  { cls: 'tip',     title: 'İpucu' },
  'DIKKAT': { cls: 'warning', title: 'Dikkat' },
};

function renderMarkdown(body) {
  const toc = [];

  const renderer = new marked.Renderer();

  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const plain = text.replace(/<[^>]+>/g, '');
    const id = slugify(plain);
    if (depth <= 2) toc.push({ depth, text: plain, id });
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };

  renderer.code = function ({ text, lang }) {
    if (lang === 'mermaid') return `<pre class="mermaid">${text}</pre>\n`;
    return `<pre><code>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>\n`;
  };

  renderer.blockquote = function ({ tokens }) {
    const inner = this.parser.parse(tokens);
    const m = inner.match(/^<p>\[!(\w+)\]\s*(?:<br>)?\s*/);
    if (m && ADMONITIONS[m[1]]) {
      const { cls, title } = ADMONITIONS[m[1]];
      const content = inner.replace(m[0], '<p>');
      return `<div class="admonition ${cls}"><span class="adm-title">${title}</span>${content}</div>\n`;
    }
    return `<blockquote>${inner}</blockquote>\n`;
  };

  const html = marked.parse(body, { renderer, gfm: true, breaks: false });
  return { html, toc };
}

// ---------- HTML shell ----------
function buildHtml(meta, contentHtml, toc) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const accentOverride = accent ? `:root { --accent: ${accent}; }` : '';
  const logoImg = resolvedLogo
    ? `<img class="logo" src="file://${resolvedLogo}" alt="logo">` : '';

  const tocHtml = toc.map(t =>
    `<li class="${t.depth === 2 ? 'toc-l2' : ''}"><a href="#${t.id}">${t.text}</a></li>`
  ).join('\n');

  // Prefer the locally installed mermaid (works in closed/VPN networks); fall
  // back to the CDN.
  //
  // The fallback now SAYS SO. It used to happen silently, and silence was the
  // real problem: on a customer network with no route to jsdelivr the <script>
  // simply does not load, mermaid never runs, and the PDF comes out with blank
  // process diagrams. Nothing errors. A missing diagram in a Turkish document is
  // easy not to notice, and the consultant delivers it.
  //
  // The CDN URL is also pinned to the version package.json declares, instead of
  // the `mermaid@11` range it used to carry: a fallback that renders with a
  // different mermaid than the local install is a fallback that produces a
  // different document.
  const localMermaid = path.join(skillRoot, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
  let mermaidSrc;
  if (fs.existsSync(localMermaid)) {
    mermaidSrc = 'file://' + localMermaid;
  } else {
    let ver = '11';
    try {
      const decl = JSON.parse(fs.readFileSync(path.join(skillRoot, 'package.json'), 'utf8'))
        .dependencies.mermaid;
      ver = String(decl).replace(/^[\^~>=<\s]+/, '') || '11';
    } catch (_) { /* keep the major-only fallback */ }
    mermaidSrc = `https://cdn.jsdelivr.net/npm/mermaid@${ver}/dist/mermaid.min.js`;
    console.warn(
      `WARNING: node_modules/mermaid is missing — falling back to the CDN ` +
      `(mermaid@${ver}).\n` +
      `  On a closed network this silently produces BLANK process diagrams.\n` +
      `  Fix it properly: run \`npm install\` in the skill folder, then re-render.`);
  }

  const ctrlRow = (label, value) => value ? `<tr><td>${label}</td><td>${value}</td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<style>${css}\n${accentOverride}</style>
<script src="${mermaidSrc}"></script>
</head>
<body>

<section class="cover">
  <div>
    <div class="brand-bar"></div>
    ${logoImg}
    <h1>${meta.title || meta.transaction || ''}</h1>
    <p class="subtitle">${meta.subtitle || 'Kullanıcı Dokümanı'}</p>
    <p class="customer">${meta.customer || ''}</p>
  </div>
  <table class="doc-control">
    ${ctrlRow('Versiyon', meta.version)}
    ${ctrlRow('Tarih', meta.date)}
    ${ctrlRow('Sistem', meta.system)}
    ${ctrlRow('İşlem Kodu', meta.transaction)}
    ${ctrlRow('Varyant', meta.variant)}
    ${ctrlRow('Hazırlayan', meta.author)}
  </table>
</section>

<section class="toc">
  <h2>İçindekiler</h2>
  <ol>${tocHtml}</ol>
</section>

${contentHtml}

<script>
  window.__mermaidDone = false;
  if (typeof mermaid === 'undefined' || document.querySelectorAll('.mermaid').length === 0) {
    // mermaid failed to load (offline + no local copy) or nothing to render — don't block the PDF.
    window.__mermaidDone = true;
  } else {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', fontFamily: 'Inter, sans-serif' });
    mermaid.run({ querySelector: '.mermaid' })
      .catch(e => { console.error('Mermaid error:', e); })
      .finally(() => { window.__mermaidDone = true; });
  }
</script>
</body>
</html>`;
}

// ---------- Main ----------
async function main() {
  const { chromium } = require('playwright');
  const { resolveExecutablePath } = require('./browser-path');

  // Resolve once, fail loud and stop — never install, never retry the search.
  let executablePath;
  try {
    executablePath = resolveExecutablePath();
  } catch (err) {
    console.error(err.message);
    process.exit(4);
  }

  const raw = fs.readFileSync(mdPath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  meta.title = resolveCoverTitle(meta);
  const { html: contentHtml, toc } = renderMarkdown(body);
  const fullHtml = buildHtml(meta, contentHtml, toc);

  // Write HTML next to the md so relative image paths (shots/...) resolve.
  const htmlPath = mdPath.replace(/\.md$/, '.render.html');
  fs.writeFileSync(htmlPath, fullHtml, 'utf8');

  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.waitForFunction('window.__mermaidDone === true', { timeout: 30000 });
  await page.waitForTimeout(300); // settle fonts/layout

  const headerLogo = logoDataUri();
  const headerTemplate = `
    <div style="width:100%; font-size:7.5pt; color:#556b82; padding:3mm 14mm 0;
                display:flex; align-items:center; justify-content:space-between; font-family:'Inter','Segoe UI',sans-serif;">
      ${headerLogo ? `<img src="${headerLogo}" style="height:7mm;">` : `<span>${meta.title || ''}</span>`}
      <span>${meta.title || ''} &nbsp;·&nbsp; v${meta.version || '1.0'}</span>
    </div>`;
  const footerTemplate = `
    <div style="width:100%; font-size:7.5pt; color:#556b82; padding:0 14mm;
                display:flex; justify-content:space-between; font-family:'Inter','Segoe UI',sans-serif;">
      <span>${meta.customer || ''}</span>
      <span>Sayfa <span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;

  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate,
    footerTemplate,
    margin: { top: '24mm', bottom: '18mm', left: '14mm', right: '14mm' },
  });

  await browser.close();
  console.log('PDF written to', pdfPath);
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { parseFrontmatter, renderMarkdown, buildHtml, resolveCoverTitle };
