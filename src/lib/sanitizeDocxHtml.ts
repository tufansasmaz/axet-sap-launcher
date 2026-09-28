import DOMPurify, { type DOMPurify as DOMPurifyInstance, type WindowLike } from "dompurify";

// DOCX önizlemesinin HTML'i (mammoth çıktısı) ana pencereye basılmadan önce
// buradan geçiyor.
//
// Neden: belge dışarıdan gelebiliyor (müşteri belgesi, e-posta eki, ajanın
// indirdiği dosya) ve mammoth köprü hedeflerini OLDUĞU GİBİ `href`'e yazıyor
// — `javascript:` dahil; görsellerin `src`'sindeki MIME türünü de belgenin
// kendi içinden alıyor (`data:text/html` olabiliyor). Ana pencerede
// `window.api` açık; buraya sızan bir betik kullanıcının yetkisiyle komut
// çalıştırıp SAP parolalarını okuyabilirdi.
//
// Liste KAPALI UÇLU: mammoth'un ürettiği etiketler dışında hiçbir şey
// geçmiyor. `style` ve `class` da yok — mammoth ikisini de üretmiyor, belgeye
// gömülü bir sınıf ise uygulamanın Tailwind sınıflarıyla önizlemenin dışına
// taşan (tam ekran, sahte düğme) bir katman çizebilirdi.

const ALLOWED_TAGS = [
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "ins", "sub", "sup", "small", "span", "div",
  "blockquote", "pre", "code",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  "a", "img", "input"
];

const ALLOWED_ATTR = ["href", "id", "src", "alt", "title", "colspan", "rowspan", "type", "checked", "disabled"];

// DOMPurify, URI-güvenli listesinde olmayan HER özniteliğin değerini
// ALLOWED_URI_REGEXP'e tutuyor; aşağıdaki dar düzenli ifade `colspan="2"` ya
// da `type="checkbox"` gibi değerleri de "izinsiz bağlantı" sayıp siliyordu
// (tablolar birleşik hücrelerini, işaret kutuları kendilerini kaybediyordu —
// testle yakalandı). Bunlar adres taşımıyor; denetim yalnızca href/src'de.
const URI_SAFE_ATTR = ["colspan", "rowspan", "type", "checked", "disabled"];

// Bağlantılar yalnızca sayfa içi (`#`), web ve e-posta. Göreli yollar da
// dışarıda: önizleme `file://` altında çalışıyor, göreli bir bağlantı
// uygulamanın kendi dosyalarına gider.
const ALLOWED_URI = /^(?:#|https?:|mailto:)/i;
const IMAGE_DATA_URI = /^data:image\//i;

// DOMPurify'ın kancaları örneğe bağlı; uygulamanın başka bir yerde kuracağı
// kancalarla karışmasın diye ayrı bir örnek.
let purifier: DOMPurifyInstance | null = null;

function getPurifier(): DOMPurifyInstance {
  if (purifier) return purifier;
  // Dönüşüm yalnızca tip için: DOMPurify'ın tipi `trustedTypes` alanını
  // isteğe bağlı olmayan bir @types paketinden alıyor, o paket kurulu değil.
  // Çalışma anında DOMPurify alanı kendisi yokluyor.
  const instance = DOMPurify(window as unknown as WindowLike);
  instance.addHook("afterSanitizeAttributes", (node) => {
    const element = node as Element;
    if (element.tagName === "IMG") {
      // mammoth görselleri data URI olarak gömüyor. Uzak bir adres izleme
      // pikseli ya da Windows'ta NTLM sızıntısı demek; data URI'nin de
      // yalnızca görsel olanı.
      const src = element.getAttribute("src") ?? "";
      if (!IMAGE_DATA_URI.test(src)) element.removeAttribute("src");
    } else if (element.tagName === "INPUT") {
      // mammoth'un ürettiği tek girdi işaret kutusu; önizlemede salt okunur.
      if ((element.getAttribute("type") ?? "").toLowerCase() !== "checkbox") {
        element.remove();
        return;
      }
      element.setAttribute("disabled", "");
    }
  });
  purifier = instance;
  return instance;
}

export function sanitizeDocxHtml(html: string): string {
  return getPurifier().sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: ALLOWED_URI,
    ADD_URI_SAFE_ATTR: URI_SAFE_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // Belgedeki yer imi/dipnot kimlikleri `user-content-` önekiyle yazılıyor:
    // `id="api"` gibi bir kimlik global adlandırılmış özelliklerle (window.x,
    // document.x) çakışamasın. Sayfa içi bağlantılar bu önekle çözülüyor
    // (bkz. resolveDocxLink).
    SANITIZE_NAMED_PROPS: true
  });
}

export const DOCX_ID_PREFIX = "user-content-";

export type DocxLinkAction = { kind: "anchor"; id: string } | { kind: "external"; url: string } | { kind: "none" };

/**
 * Önizlemedeki bir bağlantıya tıklanınca ne yapılacağı.
 *
 * Temizlenmiş HTML'de bile bağlantının kendi davranışına bırakılmıyor: bir
 * http(s) bağlantısı ana pencereyi götürürdü. Sayfa içi bağlantı önizleme
 * içinde kalıyor, web/e-posta sistem tarayıcısına devrediliyor, geri kalan
 * her şey hiçbir şey yapmıyor.
 */
export function resolveDocxLink(href: string | null | undefined): DocxLinkAction {
  const value = (href ?? "").trim();
  if (value.startsWith("#")) {
    let fragment = value.slice(1);
    try {
      fragment = decodeURIComponent(fragment);
    } catch {
      // bozuk yüzde kodlaması: olduğu gibi aranıyor
    }
    if (!fragment) return { kind: "none" };
    const id = fragment.startsWith(DOCX_ID_PREFIX) ? fragment : `${DOCX_ID_PREFIX}${fragment}`;
    return { kind: "anchor", id };
  }
  if (/^(?:https?:|mailto:)/i.test(value)) return { kind: "external", url: value };
  return { kind: "none" };
}
