// Uygulamanın TEK düğme dili.
//
// Bu dosya 2026-09-06'da `src/components/sapgui/ui.tsx`ten çıkarıldı. O dosya
// SAP GUI Scripting ekranı için yazılmıştı ama düğmelerinin yapısı (saç teli
// kenarlık + bir kademe açık zemin + sabit boy + 6px köşe + gölgesiz düz
// dolgu) aslında uygulamanın tamamının olması gereken dildi. Geri kalan
// ekranlar bunun yerine her yerde biraz farklı yazılmış onlarca tek seferlik
// sınıf dizisi kullanıyordu: `px-3 py-1.5`, `px-2.5 py-1`, `px-4 py-2`,
// `rounded`, `rounded-lg`, `text-xs`, `text-sm`, `text-[12px]`... Aynı
// diyalogdaki iki düğme 2–3 piksel farklı yükseklikte oluyordu ve bu, tek tek
// bakınca görünmeyen ama ekrana bütün olarak bakınca "özensiz" diye okunan
// türden bir fark.
//
// KURAL: yeni bir düğme yazarken sınıf dizisini elle kurma. Buradan bir
// kademe seç; buradaki kademeler yetmiyorsa BURAYA ekle.
//
// --- Boy kademeleri -------------------------------------------------------
// Yükseklik `py-*` ile DEĞİL, sabit `h-*` ile veriliyor. Sebep ölçülmüş: `py`
// ile kurulan bir düğmenin boyu içindeki metnin satır yüksekliğine bağlı, yani
// aynı sınıf 11px yazıyla 26px, 13px yazıyla 30px düğme üretiyor — ikisi yan
// yana geldiğinde şerit hizası bozuluyor.
//
//   sm → h-7  (28px) · 11px yazı · araç panelleri, satır içi eylemler
//   md → h-8  (32px) · 12px yazı · panel/modal üst şeritleri, form eylemleri
//   lg → h-9  (36px) · 13px yazı · modal ayak düğmeleri, birincil eylemler
//
// --- Ton kademeleri -------------------------------------------------------
//   neutral → varsayılan. Kenarlıklı, bir kademe açık zemin.
//   primary → vurgu dolgusu. Ekranda AYNI ANDA EN FAZLA BİR TANE olmalı;
//             "burada ne yapılması bekleniyor" sorusunun cevabı o.
//   danger  → yıkıcı dolgu. `--status-danger-solid` kullanıyor,
//             `--status-danger-text` DEĞİL: ikincisi koyu zemin üstünde
//             OKUNMAK için ayarlı, zemin olarak kullanıldığında beyaz metinle
//             ~2.5:1 veriyor (bkz. index.css).
//   ghost   → kenarlıksız/zeminsiz. Yoğun listelerde satır başına düşen
//             eylemler için; kenarlıklı düğme orada gürültü yapıyor.

//   tint    → soluk kenarlık + soluk dolgu + renkli yazı. `primary`nin
//             sakin hâli: dolgulu düğme "burada bunu yap" derken bu yalnızca
//             "bu düğmenin bir konusu var" diyor. Bir şeritte YAN YANA birden
//             fazlası durabilir (bkz. `tintBtn` başlığı).

export type BtnVariant = "neutral" | "primary" | "danger" | "ghost";
export type BtnSize = "sm" | "md" | "lg";
export type BtnTint = "accent" | "sap" | "terminal";

// Her düğmenin ortak iskeleti. `shrink-0`: düğmeler flex şeritlerin içinde
// yaşıyor ve yanlarındaki metin uzadığında ezilmemeleri gerekiyor.
const SHELL =
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium transition " +
  "disabled:cursor-default";

const SIZE: Record<BtnSize, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-[11px]",
  md: "h-8 gap-1.5 px-3 text-[12px]",
  lg: "h-9 gap-2 px-4 text-[13px]",
};

// İkon-tek düğmelerde yatay dolgu yok, genişlik yüksekliğe eşit — yoksa kare
// olması gereken düğme dikdörtgen çıkıyor.
const ICON_SIZE: Record<BtnSize, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-9 w-9",
};

// Sönük hâl tonla değişiyor: dolgulu düğmelerde 0.6 hâlâ okunuyor, kenarlıklı
// olanlarda 0.6 fazla diri kalıp "basılabilir" görünüyordu.
const VARIANT: Record<BtnVariant, string> = {
  neutral:
    "border border-line bg-control text-slate-200 hover:border-line-strong hover:bg-active hover:text-white disabled:opacity-40",
  primary:
    "bg-accent-500 text-accent-on hover:bg-accent-600 disabled:opacity-60",
  // `text-on-solid`, `text-accent-on` DEĞİL: dolgu accent değil kırmızı.
  danger:
    "bg-[var(--status-danger-solid)] text-on-solid hover:brightness-110 disabled:opacity-60",
  ghost:
    "text-slate-400 hover:bg-hover hover:text-slate-100 disabled:opacity-40",
};

// Soluk-dolgu ailesi. Şablon her tonda AYNI: kenarlık %30, zemin %10, yazı
// tam doygunlukta; hover'da kenarlık %50, zemin %20. Yalnızca renk değişiyor.
//
// SINIFLAR NEDEN ELLE VE UZUN UZUN YAZILI: Tailwind sınıf adlarını kaynak
// METNİNDEN tarıyor. `bg-[color-mix(...var(${x})...)]` gibi çalışma anında
// kurulan bir dize taramaya hiç görünmez, dolayısıyla o CSS üretilmez ve düğme
// zeminsiz çıkar. O yüzden her ton burada birebir yazılı duruyor; yeni bir ton
// eklemek = bu nesneye tam yazılmış bir satır eklemek.
//
// `color:` ipucu da bilerek var: `border-[...]`/`text-[...]` Tailwind için
// genişlik/punto ile renk arasında belirsiz ve `color-mix()` tahmin edilebilir
// bir renk değeri değil.
//
// accent Tailwind'in kendi opaklık sözdizimini kullanıyor (`accent-500/30`)
// çünkü accent bir RGB üçlüsü; --module-* ve --status-* ise hex, onlarda tek
// yol color-mix.
const TINT: Record<BtnTint, string> = {
  accent:
    "border border-accent-500/30 bg-accent-500/10 text-accent-400 " +
    "hover:border-accent-500/50 hover:bg-accent-500/20 disabled:opacity-40",
  sap:
    "border border-[color:color-mix(in_srgb,var(--module-sap)_30%,transparent)] " +
    "bg-[color:color-mix(in_srgb,var(--module-sap)_10%,transparent)] " +
    "text-[color:var(--module-sap)] " +
    "hover:border-[color:color-mix(in_srgb,var(--module-sap)_50%,transparent)] " +
    "hover:bg-[color:color-mix(in_srgb,var(--module-sap)_20%,transparent)] disabled:opacity-40",
  terminal:
    "border border-[color:color-mix(in_srgb,var(--status-success-text)_30%,transparent)] " +
    "bg-[color:color-mix(in_srgb,var(--status-success-text)_10%,transparent)] " +
    "text-[color:var(--status-success-text)] " +
    "hover:border-[color:color-mix(in_srgb,var(--status-success-text)_50%,transparent)] " +
    "hover:bg-[color:color-mix(in_srgb,var(--status-success-text)_20%,transparent)] disabled:opacity-40",
};

/**
 * Soluk-dolgu düğme sınıfı — `btn("primary")`nin bir kademe sakin hâli.
 *
 * `primary`den farkı: aynı şeritte birden fazla bulunabilir. Kural "ekranda tek
 * birincil düğme"ye takılmadan bir düğmeye kimlik vermek gerektiğinde bu
 * kullanılıyor; renk "ne yapılması bekleniyor"u değil "bu düğme neye dokunuyor"u
 * söylüyor (mavi = SAP Logon, yeşil = terminal, accent = ekleme).
 */
export function tintBtn(
  tint: BtnTint = "accent",
  size: BtnSize = "md",
  extra = "",
): string {
  return `${SHELL} ${SIZE[size]} ${TINT[tint]}${extra ? ` ${extra}` : ""}`;
}

/** Metinli (ve isteğe bağlı ikonlu) düğme sınıfı. */
export function btn(
  variant: BtnVariant = "neutral",
  size: BtnSize = "md",
  extra = "",
): string {
  return `${SHELL} ${SIZE[size]} ${VARIANT[variant]}${extra ? ` ${extra}` : ""}`;
}

/** Yalnızca ikon taşıyan kare düğme sınıfı. */
export function iconBtn(
  variant: BtnVariant = "neutral",
  size: BtnSize = "md",
  extra = "",
): string {
  return `${SHELL} ${ICON_SIZE[size]} ${VARIANT[variant]}${extra ? ` ${extra}` : ""}`;
}

// --- Hazır kademeler ------------------------------------------------------
// `btn()` her yerde kullanılabilir; bunlar yalnızca en sık geçen dördü için
// kısayol. SAP GUI Scripting ekranındaki isimler KORUNDU (`TOOL_BUTTON`,
// `ICON_BUTTON`, ...) çünkü o ekranda düzinelerce yerde geçiyorlar ve isim
// değişikliği bu dosyanın çözdüğü soruna hiçbir şey katmazdı.

/** Araç panelindeki dar metinli düğme (28px). */
export const TOOL_BUTTON = btn("neutral", "sm");
/** Araç panelindeki kare ikon düğmesi (28px). */
export const ICON_BUTTON = iconBtn("neutral", "sm");
/** Kenarlıksız satır içi ikon düğmesi — liste satırlarındaki eylemler (24px). */
export const GHOST_ICON_BUTTON =
  "inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 " +
  "transition hover:bg-hover hover:text-white disabled:cursor-default disabled:opacity-40";
/** Araç panelindeki vurgu düğmesi (28px). */
export const PRIMARY_BUTTON = btn("primary", "sm");

/** Modal ayağındaki düğme çifti — "Vazgeç" tarafı. */
export const DIALOG_CANCEL_BUTTON = btn("ghost", "lg");
/** Modal ayağındaki düğme çifti — onaylayan taraf. */
export const DIALOG_CONFIRM_BUTTON = btn("primary", "lg");
/** Modal ayağındaki düğme çifti — yıkıcı onay. */
export const DIALOG_DANGER_BUTTON = btn("danger", "lg");

/** Panel başlığı etiketi. Düğme değil ama aynı şeritte yaşıyor, hizası buradan. */
export const PANEL_TITLE =
  "text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500";
