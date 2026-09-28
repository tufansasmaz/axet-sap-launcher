// @vitest-environment jsdom
//
// DOCX önizlemesi (Y1). Belge dışarıdan gelebiliyor ve ana pencerede
// `window.api` açık; buradaki her kaçak betik kullanıcının yetkisiyle komut
// çalıştırmak demek. Üç katman sınanıyor: temizleyicinin kendisi, gerçek
// mammoth çıktısı (saldırgan bir .docx'ten), önizleme bileşeninin tıklama
// yönetimi.

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import JSZip from "jszip";
import mammoth from "mammoth";
import { afterEach, describe, expect, it, vi } from "vitest";
import FileViewer from "../src/components/FileViewer";
import { LanguageProvider } from "../src/i18n";
import { resolveDocxLink, sanitizeDocxHtml } from "../src/lib/sanitizeDocxHtml";

function parse(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = sanitizeDocxHtml(html);
  return root;
}

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("sanitizeDocxHtml", () => {
  it("tehlikeli bağlantı şemaları gidiyor, metin kalıyor", () => {
    const root = parse(
      '<p><a href="javascript:window.api.runShell(\'calc\')">tıkla</a>' +
        '<a href=" JaVaScRiPt:alert(1)">b</a>' +
        '<a href="data:text/html,<script>alert(1)</script>">c</a>' +
        '<a href="vbscript:x">d</a>' +
        '<a href="file:///C:/Windows/System32/calc.exe">e</a>' +
        '<a href="\\\\sunucu\\paylasim">f</a>' +
        '<a href="index.html">g</a></p>'
    );
    const anchors = Array.from(root.querySelectorAll("a"));
    expect(anchors).toHaveLength(7);
    for (const a of anchors) expect(a.hasAttribute("href")).toBe(false);
    expect(root.textContent).toBe("tıklabcdefg");
  });

  it("izinli bağlantılar olduğu gibi kalıyor", () => {
    const root = parse(
      '<p><a href="https://help.sap.com/x?a=1&amp;b=2">h</a><a href="http://intranet/x">i</a>' +
        '<a href="mailto:ali@example.com">m</a><a href="#_Toc123">t</a></p>'
    );
    expect(Array.from(root.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
      "https://help.sap.com/x?a=1&b=2",
      "http://intranet/x",
      "mailto:ali@example.com",
      "#_Toc123"
    ]);
  });

  it("target, olay öznitelikleri, style ve class gidiyor", () => {
    const root = parse(
      '<p style="position:fixed;inset:0" class="fixed inset-0 z-50" onclick="x()">' +
        '<a href="https://example.com" target="_blank" rel="opener" onmouseover="x()">a</a>' +
        '<img src="' + PNG + '" onerror="alert(1)" onload="x()" style="width:9999px"></p>'
    );
    const html = root.innerHTML;
    expect(html).not.toMatch(/target|onclick|onmouseover|onerror|onload|style=|class=|rel=/i);
    expect(root.querySelector("a")!.getAttribute("href")).toBe("https://example.com");
    expect(root.querySelector("img")!.getAttribute("src")).toBe(PNG);
  });

  it("betik, çerçeve, nesne, form ve benzerleri tamamen gidiyor", () => {
    const root = parse(
      "<p>önce</p><script>alert(1)</script><iframe src=\"https://x\"></iframe>" +
        '<object data="x.swf"></object><embed src="x"><form action="https://x"><input type="text" name="p">' +
        '<button>gönder</button></form><svg><script>1</script></svg><math></math>' +
        '<style>*{display:none}</style><link rel="stylesheet" href="https://x"><meta http-equiv="refresh" content="0;url=https://x">' +
        '<base href="https://x/"><video src="x"></video><p>sonra</p>'
    );
    for (const tag of ["script", "iframe", "object", "embed", "form", "button", "svg", "math", "style", "link", "meta", "base", "video"]) {
      expect(root.querySelector(tag)).toBeNull();
    }
    expect(root.querySelector('input[type="text"]')).toBeNull();
    expect(root.textContent).toContain("önce");
    expect(root.textContent).toContain("sonra");
  });

  it("görsel yalnızca data:image ile kalıyor", () => {
    const root = parse(
      '<img src="' + PNG + '" alt="logo">' +
        '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" alt="html">' +
        '<img src="https://izleme.example/pixel.gif" alt="uzak">' +
        '<img src="\\\\sunucu\\paylasim\\a.png" alt="unc">' +
        '<img src="file:///C:/x.png" alt="dosya">' +
        '<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" alt="svg">'
    );
    const imgs = Array.from(root.querySelectorAll("img"));
    expect(imgs.map((img) => [img.getAttribute("alt"), img.getAttribute("src")])).toEqual([
      ["logo", PNG],
      ["html", null],
      ["uzak", null],
      ["unc", null],
      ["dosya", null],
      // svg bir <img> içinde betik çalıştıramıyor; mammoth da belgedeki
      // görseli olduğu gibi gömüyor.
      ["svg", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="]
    ]);
  });

  it("başlık, liste, tablo, dipnot ve işaret kutusu korunuyor", () => {
    const root = parse(
      "<h1>Başlık</h1><h2>Alt</h2><p><strong>kalın</strong> <em>eğik</em> <u>alt</u> <s>üstü</s> x<sup>2</sup></p>" +
        "<ul><li>bir</li></ul><ol><li>iki</li></ol>" +
        '<table><thead><tr><th colspan="2">T</th></tr></thead><tbody><tr><td rowspan="2">a</td><td>b</td></tr></tbody></table>' +
        '<p><sup><a href="#footnote-1" id="footnote-ref-1">[1]</a></sup></p>' +
        '<ol><li id="footnote-1"><p>not <a href="#footnote-ref-1">↑</a></p></li></ol>' +
        '<p><input type="checkbox" checked> yapıldı</p><dl><dt>yorum</dt><dd>metin</dd></dl>'
    );
    expect(root.querySelector("h1")!.textContent).toBe("Başlık");
    expect(root.querySelector("h2")).not.toBeNull();
    for (const tag of ["strong", "em", "u", "s", "sup", "ul", "ol", "li", "table", "thead", "tbody", "th", "td", "dl", "dt", "dd"]) {
      expect(root.querySelector(tag)).not.toBeNull();
    }
    expect(root.querySelector("th")!.getAttribute("colspan")).toBe("2");
    expect(root.querySelector("td")!.getAttribute("rowspan")).toBe("2");
    // Kimlikler önekleniyor: `id="api"` gibi bir kimlik window.api'nin üstüne
    // adlandırılmış özellik olarak binemesin.
    expect(root.querySelector("#user-content-footnote-1")).not.toBeNull();
    expect(root.querySelector("#footnote-1")).toBeNull();
    const box = root.querySelector("input") as HTMLInputElement;
    expect(box.type).toBe("checkbox");
    expect(box.checked).toBe(true);
    expect(box.disabled).toBe(true);
  });

  it("belgedeki kimlik global adları gölgeleyemiyor", () => {
    const root = parse('<p id="api">x</p><img name="api" src="' + PNG + '"><a id="location" href="#x">y</a>');
    document.body.appendChild(root);
    try {
      expect(document.getElementById("api")).toBeNull();
      expect(root.querySelector("img")!.hasAttribute("name")).toBe(false);
      expect(root.querySelector("#user-content-api")).not.toBeNull();
    } finally {
      root.remove();
    }
  });
});

describe("resolveDocxLink", () => {
  it("sayfa içi, dış ve geri kalan", () => {
    expect(resolveDocxLink("#_Toc123")).toEqual({ kind: "anchor", id: "user-content-_Toc123" });
    expect(resolveDocxLink("#user-content-footnote-1")).toEqual({ kind: "anchor", id: "user-content-footnote-1" });
    expect(resolveDocxLink("#%C3%B6zet")).toEqual({ kind: "anchor", id: "user-content-özet" });
    expect(resolveDocxLink("#%E0%A4%A")).toEqual({ kind: "anchor", id: "user-content-%E0%A4%A" });
    expect(resolveDocxLink("#")).toEqual({ kind: "none" });
    expect(resolveDocxLink(" https://help.sap.com ")).toEqual({ kind: "external", url: "https://help.sap.com" });
    expect(resolveDocxLink("mailto:a@b.c")).toEqual({ kind: "external", url: "mailto:a@b.c" });
    for (const href of [null, undefined, "", "javascript:alert(1)", "file:///C:/x", "index.html", "data:text/html,x"]) {
      expect(resolveDocxLink(href)).toEqual({ kind: "none" });
    }
  });
});

// --- Gerçek mammoth çıktısı -----------------------------------------------

// Word'ün kendisinin de ürettiği yapılar: dış köprü (hedefi ilişkiler
// dosyasında, `w:tgtFrame` ile yeni pencere), yer imi, sayfa içi köprü ve
// MIME türü belgede `text/html` olarak bildirilmiş bir "görsel".
async function hostileDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Default Extension="htm" ContentType="text/html"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
  );
  zip.file(
    "word/_rels/document.xml.rels",
    '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rIdJs" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="javascript:window.api.runShell(\'calc\')" TargetMode="External"/>' +
      '<Relationship Id="rIdWeb" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://help.sap.com/" TargetMode="External"/>' +
      '<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/x.htm"/></Relationships>'
  );
  zip.file("word/media/x.htm", "<script>window.api.runShell('calc')</script>");
  const run = (text: string) => `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;
  zip.file(
    "word/document.xml",
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' +
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:bookmarkStart w:id="0" w:name="ozet"/>' + run("Özet") + '<w:bookmarkEnd w:id="0"/></w:p>' +
      '<w:p><w:hyperlink r:id="rIdJs" w:tgtFrame="_blank">' + run("kötü bağlantı") + "</w:hyperlink></w:p>" +
      '<w:p><w:hyperlink r:id="rIdWeb" w:tgtFrame="_blank">' + run("SAP yardım") + "</w:hyperlink></w:p>" +
      '<w:p><w:hyperlink w:anchor="ozet">' + run("başa dön") + "</w:hyperlink></w:p>" +
      "<w:p><w:r><w:drawing><wp:inline><wp:docPr id=\"1\" name=\"x\" descr=\"resim\"/><a:graphic><a:graphicData>" +
      '<pic:pic><pic:blipFill><a:blip r:embed="rIdImg"/></pic:blipFill></pic:pic>' +
      "</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>" +
      "<w:tbl><w:tr><w:tc><w:p>" + run("hücre") + "</w:p></w:tc></w:tr></w:tbl>" +
      "</w:body></w:document>"
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("mammoth çıktısı temizleniyor", () => {
  it("saldırgan belgenin ham çıktısı gerçekten tehlikeli; temizlenmişi değil", async () => {
    const { value: raw } = await mammoth.convertToHtml({ buffer: await hostileDocx() });
    // Ön koşul: düzeltme olmasa açığın gerçek olduğunu gösteriyor. mammoth
    // sürümü değişip bunlardan birini kendisi temizlemeye başlarsa burası
    // kırılır ve varsayım yeniden gözden geçirilir.
    expect(raw).toContain('href="javascript:');
    expect(raw).toContain('target="_blank"');
    expect(raw).toContain('src="data:text/html;base64,');

    const root = parse(raw);
    const html = root.innerHTML;
    expect(html).not.toMatch(/javascript:|target=|data:text\/html/i);
    expect(root.querySelector("h1")!.textContent).toBe("Özet");
    expect(root.querySelector("#user-content-ozet")).not.toBeNull();
    expect(root.querySelector("td")!.textContent).toBe("hücre");
    const links = Array.from(root.querySelectorAll("a")).filter((a) => a.textContent);
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["kötü bağlantı", null],
      ["SAP yardım", "https://help.sap.com/"],
      ["başa dön", "#ozet"]
    ]);
    const img = root.querySelector("img")!;
    expect(img.getAttribute("alt")).toBe("resim");
    expect(img.hasAttribute("src")).toBe(false);
  });
});

// --- Önizleme bileşeni ----------------------------------------------------

function mountDocx(html: string) {
  const api = {
    readDocxFile: vi.fn().mockResolvedValue({ ok: true, html }),
    openExternalUrl: vi.fn().mockResolvedValue(undefined),
    openExternal: vi.fn(),
    openInExplorer: vi.fn()
  };
  (window as unknown as { api: unknown }).api = api;
  const view = render(
    <LanguageProvider language="tr">
      <FileViewer path="C:\\x\\belge.docx" name="belge.docx" />
    </LanguageProvider>
  );
  return { api, view };
}

afterEach(cleanup);

describe("FileViewer DOCX önizlemesi", () => {
  it("temizlenmiş HTML basılıyor", async () => {
    const { view } = mountDocx('<h1>Başlık</h1><p><a href="javascript:alert(1)" target="_blank">x</a><img src="x" onerror="alert(1)"></p>');
    await waitFor(() => expect(view.container.querySelector("h1")).not.toBeNull());
    const html = view.container.innerHTML;
    expect(html).not.toMatch(/javascript:|onerror|target=/i);
  });

  it("dış bağlantı sistem tarayıcısına gidiyor, pencere yerinde kalıyor", async () => {
    const { api, view } = mountDocx('<p><a href="https://help.sap.com/">yardım</a><a href="mailto:a@b.c">posta</a></p>');
    await waitFor(() => expect(view.container.querySelector("a")).not.toBeNull());
    const [web, mail] = Array.from(view.container.querySelectorAll("a"));
    // fireEvent varsayılanı engellenmişse false döner: ana pencere gitmiyor.
    expect(fireEvent.click(web)).toBe(false);
    expect(fireEvent.click(mail)).toBe(false);
    expect(api.openExternalUrl.mock.calls).toEqual([["https://help.sap.com/"], ["mailto:a@b.c"]]);
  });

  it("orta tık da aynı yoldan", async () => {
    const { api, view } = mountDocx('<p><a href="https://help.sap.com/"><strong>yardım</strong></a></p>');
    await waitFor(() => expect(view.container.querySelector("strong")).not.toBeNull());
    expect(fireEvent(view.container.querySelector("strong")!, new MouseEvent("auxclick", { bubbles: true, cancelable: true, button: 1 }))).toBe(false);
    expect(api.openExternalUrl).toHaveBeenCalledWith("https://help.sap.com/");
  });

  it("sayfa içi bağlantı önizlemede kalıyor, dışarı hiçbir şey açılmıyor", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const { api, view } = mountDocx('<p><a href="#hedef">git</a><a href="#yok">yok</a><a>bos</a></p><h2 id="hedef">Hedef</h2>');
    await waitFor(() => expect(view.container.querySelector("h2")).not.toBeNull());
    const [go, missing, empty] = Array.from(view.container.querySelectorAll("a"));
    expect(fireEvent.click(go)).toBe(false);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect((scroll.mock.contexts[0] as Element).id).toBe("user-content-hedef");
    expect(fireEvent.click(missing)).toBe(false);
    expect(fireEvent.click(empty)).toBe(false);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(api.openExternalUrl).not.toHaveBeenCalled();
  });
});
