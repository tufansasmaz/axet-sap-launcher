# Ayarlar ve pencereler — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Bütün pencereler ortak `Modal` çerçevesini, aynı boy ölçeğini ve aynı
düğme dilini kullansın; Ayarlar penceresi solda bölüm listesi, sağda seçili
bölüm olacak şekilde bölünsün; ertelenmiş pencere ve Ayarlar hataları düzelsin.

**Mimari:** Önce ortak çerçeve (`src/ui/Modal.tsx`) değişiyor: `width` yerine
`size`, `bare` gövde, `role`/`describedBy`, odak süzgeci, Escape sahibi ve
Escape tekrarı. Sonra elle çizilen üç pencere bu çerçeveye taşınıyor. En son
Ayarlar: bölüm kaydı (`settingsSections.ts`) ve bölüm listesi
(`SettingsNav.tsx`) ayrı dosyalarda, `SettingsModal.tsx` ikisini birleştiriyor.

**Teknoloji:** Electron + React 18 + TypeScript, Tailwind 3 (grafit
değişkenleri), lucide-react, vitest 2 + jsdom + @testing-library/react
(jest-dom YOK: `classList`, `getAttribute`, `style` ile doğrulanıyor).

**Spec:** `docs/superpowers/specs/2026-10-01-ayarlar-ve-pencereler-design.md`

## Global kurallar

- Dal: `tasarim/grafit`. Push / merge / sürüm artırma kullanıcı onayı olmadan YOK.
- Vibe değerleri birebir kopyalanmıyor.
- Lime/vurgu yalnız seçimde; bir pencerede en fazla bir birincil düğme.
- Kod yorumları tam Türkçe karakterle; commit mesajları ASCII Türkçe ve sonu
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `git add` dosya dosya (asla `-A`); prettier çalıştırılmıyor; satır sonu LF.
- Kaynak düzenlemeleri Edit aracıyla.
- `EmbeddedTerminal` davranışı değişmiyor. `npm run dev` yeniden başlatılmıyor.
- Test çalıştırma: `npx vitest run <dosya> > .superpowers/x.txt 2>&1` ve
  ardından `tail -n 30 .superpowers/x.txt`. Tip denetimi: `npm run -s typecheck`.
- Bilinen kararsızlık: `scriptBehaviour` / `scriptStore` testleri tam takımda
  ara sıra kırmızı (bu turdan önce de böyleydi); tek başlarına yeşilse sorun sayılmıyor.
- Her yeni çeviri anahtarı hem `src/i18n/tr.ts` hem `src/i18n/en.ts`'e
  ekleniyor (`en.ts` `Record<TranslationKey,string>`, eksik anahtar tip hatası).

## Gözden geçirmede dikkat (Review Focus)

1. **Açık liste içinde Escape:** pencerede model listesi açıkken Escape
   yalnız listeyi kapatmalı; liste kapandıktan sonraki Escape pencereyi
   kapatmalı (Görev 2, "sahip kalkınca Escape yine kapatıyor" testi).
2. **Klasör seçici beklerken başka alan değişirse** seçilen klasör gelince
   öteki düzenleme kaybolmamalı (Görev 8, klasör yarışı testi).
3. **Ayarlar'ı kaydetmeden kapatıp yeniden açmak** ilk karede bile eski
   düzenlemeyi göstermemeli ve Genel bölümüyle açılmalı (Görev 8).
4. **Güncelleme indirilirken** pencere hiçbir yoldan kapanmamalı; hata
   olunca Kapat ve Escape çalışmalı (Görev 3).
5. **Dar pencere:** `xl` Ayarlar ekrandan taşmamalı (`maxWidth` korunuyor,
   Görev 1 testi `style.maxWidth`'i doğruluyor).

## Dosya haritası

| Dosya | Ne değişiyor |
|---|---|
| `src/ui/Modal.tsx` | `size`, `bare`, `role`, `describedBy`, odak süzgeci, Escape sahibi, Escape tekrarı, görünüm |
| 11 pencere çağıranı | `width={…}` → `size="…"` |
| `src/components/ModelSelector.tsx` | açıkken `data-escape-owner` |
| `src/components/AttachmentLightbox.tsx` | `data-escape-owner` |
| `src/components/UpdatePromptModal.tsx` | ortak `Modal`'a taşınıyor |
| `src/components/AppConnectionsModal.tsx` | ortak `Modal`'a taşınıyor |
| `src/components/GlobalSkillsModal.tsx` | ortak `Modal`'a taşınıyor |
| `src/components/SkillsSection.tsx` | düğme sınıfları, `text-[11px]` |
| `src/components/ChatProjectDialog.tsx` (+ gerekirse `AxetCodeHome.tsx`) | İptal sonrası odak (önce ölçüm) |
| `src/components/settings/settingsSections.ts` (yeni) | bölüm kaydı, `EDITED_FIELDS`, `dirtySections` |
| `src/components/settings/SettingsNav.tsx` (yeni) | dikey sekme listesi |
| `src/components/SettingsModal.tsx` | iki sütunlu düzen + hata düzeltmeleri |
| `src/i18n/tr.ts`, `src/i18n/en.ts` | bölüm açıklamaları + `sectionsLabel` |
| Testler | `tests/modalFrame.test.tsx` (yeni), `tests/updatePromptModal.test.tsx` (yeni), `tests/appConnectionsModal.test.tsx` (yeni), `tests/chatProjectDialogFocus.test.tsx` (yeni), `tests/settingsSections.test.ts` (yeni), `tests/settingsNav.test.tsx` (yeni), `tests/settingsLayout.test.tsx` (yeni), `tests/settingsOpenForm.test.tsx`, `tests/settingsAppearance.test.tsx`, `tests/dialogMigration.test.tsx`, `tests/globalSkillsModal.test.tsx` |

## Plan kararları (spec'ten ayrıldığı ya da spec'in açık bıraktığı yerler)

- **Escape sahibi kuralı:** spec "`defaultPrevented` ya da hedef sahibin
  içinde" diyor. İkisi de çalışmıyor: Modal'ın dinleyicisi `document`'ta
  YAKALAMA aşamasında, açılır listelerin dinleyicileri kabarma aşamasında —
  Modal her zaman önce çalışıyor, `defaultPrevented` henüz yanlış. Işık
  kutusunda odak sahibin içinde olmayabiliyor. Kural: belgede herhangi bir
  `[data-escape-owner]` öğesi varsa Modal Escape'e hiç dokunmuyor.
- **Bölüm adları** bugünkü etiketler kalıyor (Genel, Görünüm, axet.code,
  Sohbet görünümü, Terminal, Gelişmiş Yollar, Manuel Sistemler,
  Güncellemeler); spec'teki gevşek adlar uygulanmıyor.
- **RoleModal:** spec'in "elle çizilmiş `<input>`" dediği öğe bir onay kutusu;
  `Input`'a geçmiyor. Rol kartları seçim kartı, eylem düğmesi değil; kalıyor.
- **`maxWidth`** `calc(100vw - 32px)` kalıyor (= spec'teki `2rem`).
- **UpdatePromptModal indirme sırasında** ✕ hiç çizilmiyor (`hideClose`):
  bugün de yok, devre dışı bir ✕ yanıltıcı olurdu.
- **Seçili bölüm rengi:** spec `bg-active` diyor; kenar çubuğundaki seçim
  aslında `bg-[var(--accent-glow)] text-slate-100`. Kenar çubuğuyla aynısı
  kullanılıyor (Görev 7).
- **Ayarlar'da "Yeniden Başlat ve Kur"** dolgulu değil soluk vurgu
  (`tintBtn`): pencerenin tek birincil düğmesi Kaydet (Görev 8).
- **Otomatik güncelleme denetimi** onay kutusundan anahtara (`Toggle`)
  geçiyor; spec'in "aç/kapa satırları anahtar sağda" kuralı (Görev 8).

---

### Görev 1: Pencere boy ölçeği ve görünüm

**Dosyalar:**
- Değiştir: `src/ui/Modal.tsx`
- Değiştir (çağıranlar): `src/components/AddSystemModal.tsx`, `CertTrustDialog.tsx`,
  `ChatInstructionsDialog.tsx`, `ChatProjectDialog.tsx`, `ConfirmDialog.tsx`,
  `CredentialsModal.tsx`, `RoleModal.tsx`, `SettingsModal.tsx`,
  `TierPromptModal.tsx`, `src/terminal/NewPaneDialog.tsx`
- Test: `tests/modalFrame.test.tsx` (yeni)

**Arayüzler:**
- Üretir: `export type ModalSize = "sm" | "md" | "lg" | "xl"`;
  `ModalProps.size?: ModalSize` (varsayılan `"md"`);
  `ModalProps.bare?: boolean`. `ModalProps.width` KALDIRILIYOR.
- Genişlikler: `sm` 420, `md` 520, `lg` 640, `xl` 960 (px).

- [ ] **Adım 1: Başarısız testi yaz** — `tests/modalFrame.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Ortak pencere çerçevesi: boy ölçeği, görünüm, çıplak gövde (Görev 1) ve
// ertelenmiş çerçeve hataları (Görev 2).

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal, type ModalSize } from "../src/ui/Modal";
import { LanguageProvider } from "../src/i18n";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function open(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <Modal open title="Deneme" onClose={onClose} {...props}>
        {props.children ?? <button type="button">içerik</button>}
      </Modal>
    </LanguageProvider>
  );
  return { onClose, dialog: () => screen.getByRole("dialog") };
}

describe("Modal — boy ölçeği ve görünüm", () => {
  it.each<[ModalSize | undefined, string]>([
    ["sm", "420px"],
    ["md", "520px"],
    ["lg", "640px"],
    ["xl", "960px"],
    [undefined, "520px"]
  ])("size=%s → genişlik %s, dar ekranda taşmıyor", (size, width) => {
    const { dialog } = open(size ? { size } : {});
    expect(dialog().style.width).toBe(width);
    expect(dialog().style.maxWidth).toBe("calc(100vw - 32px)");
  });

  it("xl sabit yükseklikte, öbürleri en çok %88", () => {
    const { dialog } = open({ size: "xl" });
    expect(dialog().className).toContain("h-[min(80vh,720px)]");
    expect(dialog().className).not.toContain("max-h-[88vh]");
    cleanup();
    const second = open({ size: "lg" });
    expect(second.dialog().className).toContain("max-h-[88vh]");
  });

  it("arka plan bulanık, başlık text-lg, alt başlık text-sm", () => {
    const { dialog } = open({ subtitle: "Alt başlık" });
    expect(dialog().parentElement!.className).toContain("backdrop-blur-sm");
    expect(screen.getByRole("heading", { name: "Deneme" }).className).toContain("text-lg");
    expect(screen.getByText("Alt başlık").className).toContain("text-sm");
  });

  it("bare gövdede iç boşluk ve kaydırma yok", () => {
    open({ bare: true, children: <div data-testid="ic" /> });
    const body = screen.getByTestId("ic").parentElement!;
    expect(body.className).toContain("flex");
    expect(body.className).not.toContain("px-6");
    expect(body.className).not.toContain("overflow-y-auto");
  });

  it("bare olmayan gövde bugünkü gibi", () => {
    open({ children: <div data-testid="ic" /> });
    const body = screen.getByTestId("ic").parentElement!;
    expect(body.className).toContain("px-6");
    expect(body.className).toContain("overflow-y-auto");
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/modalFrame.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt`
Beklenen: FAIL — `ModalSize` dışa aktarılmıyor / genişlik `480px`, `backdrop-blur-sm` yok.

- [ ] **Adım 3: `Modal.tsx`'i değiştir**

`ModalLayer` tanımının altına ekle:

```ts
export type ModalSize = "sm" | "md" | "lg" | "xl";

// Boy ölçeği (spec §1). Pencereler sayı değil ad veriyor: aynı türden iki
// pencere aynı boyda dursun, yeni pencere ölçeğin dışına çıkmasın.
const MODAL_WIDTH: Record<ModalSize, number> = { sm: 420, md: 520, lg: 640, xl: 960 };
```

`ModalProps`'ta `width` alanını ve yorumunu şununla değiştir:

```ts
  /** Pencere boyu: `sm` 420, `md` 520 (varsayılan), `lg` 640, `xl` 960 px.
   *  Dar pencerede ekrandan taşmıyor. `xl` sabit yükseklikte (Ayarlar:
   *  bölüm değişince pencere zıplamasın). */
  size?: ModalSize;
  /** Doğruysa gövde iç boşluksuz ve kaydırmasız bir esnek kap: içerik kendi
   *  sütunlarını ve kaydırma alanlarını kuruyor (Ayarlar'ın bölüm listesi). */
  bare?: boolean;
```

`ModalPanel` parametrelerinde `width = 480,` satırını `size = "md",` ve
`bare = false,` olarak değiştir.

Arka plan sınıfında `bg-[var(--overlay-scrim)] p-4` → `bg-[var(--overlay-scrim)] p-4 backdrop-blur-sm`.

Panel `className` ve `style`:

```tsx
          className={`animate-modal-pop-in flex ${
            size === "xl" ? "h-[min(80vh,720px)]" : "max-h-[88vh]"
          } flex-col overflow-hidden rounded-xl border border-line bg-card shadow-elev-2 outline-none`}
          style={{ width: MODAL_WIDTH[size], maxWidth: "calc(100vw - 32px)" }}
```

Başlık: `className="text-base font-semibold text-white"` → `className="text-lg font-semibold leading-tight text-white"`.
Alt başlık: `className="mt-0.5 text-xs text-slate-400"` → `className="mt-1 text-sm leading-relaxed text-slate-400"`.

Gövde:

```tsx
          <div
            ref={bodyRef}
            className={bare ? "flex min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto px-6 py-4"}
          >
            {children}
          </div>
```

Onay penceresindeki `width={400}` → `size="sm"`.

- [ ] **Adım 4: Çağıranları taşı** — her dosyada `width={N}` satırını sil ve yerine yaz:

| Dosya | Eski | Yeni |
|---|---|---|
| `src/components/AddSystemModal.tsx` | `width={460}` | `size="md"` |
| `src/components/CertTrustDialog.tsx` | `width={560}` | `size="lg"` |
| `src/components/ChatInstructionsDialog.tsx` | `width={620}` | `size="lg"` |
| `src/components/ChatProjectDialog.tsx` | `width={560}` | `size="lg"` |
| `src/components/ConfirmDialog.tsx` | `width={400}` | `size="sm"` |
| `src/components/CredentialsModal.tsx` | `width={440}` | `size="md"` |
| `src/components/RoleModal.tsx` | `width={620}` | `size="lg"` |
| `src/components/SettingsModal.tsx` | `width={560}` | `size="lg"` (Görev 8'de `xl` + `bare` olacak) |
| `src/components/TierPromptModal.tsx` | `width={520}` | `size="md"` |
| `src/terminal/NewPaneDialog.tsx` | `width={420}` | `size="sm"` |

Kalan var mı: `grep -rn "width={" src/components src/terminal src/ui | grep -v "style"` — pencere çağıranlarında sonuç kalmamalı.

- [ ] **Adım 5: Testleri ve tip denetimini çalıştır**

Çalıştır: `npx vitest run tests/modalFrame.test.tsx tests/modal.test.tsx tests/dialogMigration.test.tsx tests/newPaneDialog.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt; npm run -s typecheck`
Beklenen: hepsi PASS; typecheck çıktısız. (Eski bir test 480/460 gibi genişlik doğruluyorsa yeni ölçeğe güncelle ve bunu commit mesajında belirt.)

- [ ] **Adım 6: Commit**

```bash
git add src/ui/Modal.tsx
git add tests/modalFrame.test.tsx
git add src/components/AddSystemModal.tsx
git add src/components/CertTrustDialog.tsx
git add src/components/ChatInstructionsDialog.tsx
git add src/components/ChatProjectDialog.tsx
git add src/components/ConfirmDialog.tsx
git add src/components/CredentialsModal.tsx
git add src/components/RoleModal.tsx
git add src/components/SettingsModal.tsx
git add src/components/TierPromptModal.tsx
git add src/terminal/NewPaneDialog.tsx
git commit -m "Modal: boy olcegi (size), bulanik arka plan, bare govde

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 2: Ertelenmiş çerçeve hataları

**Dosyalar:**
- Değiştir: `src/ui/Modal.tsx`
- Değiştir: `src/components/ModelSelector.tsx` (kap `div`'i, ~93. satır)
- Değiştir: `src/components/AttachmentLightbox.tsx` (kök `div`, ~41. satır)
- Test: `tests/modalFrame.test.tsx` (Görev 1'de açıldı, sonuna ekleniyor)

**Arayüzler:**
- Tüketir: Görev 1'deki `Modal`, `size`.
- Üretir: `ModalProps.role?: "dialog" | "alertdialog"` (varsayılan `"dialog"`),
  `ModalProps.describedBy?: string` (panelin `aria-describedby`'ı).
  Escape sahibi sözleşmesi: belgede `[data-escape-owner]` taşıyan bir öğe
  varsa açık pencere Escape'e dokunmuyor; o öğe Escape'i kendi kapatıyor.

- [ ] **Adım 1: Başarısız testleri yaz** — `tests/modalFrame.test.tsx` başındaki
  import'a `act` ve `fireEvent` ekle (`@testing-library/react`'ten) ve şunları ekle:

```tsx
import { readFileSync } from "node:fs";
import AttachmentLightbox from "../src/components/AttachmentLightbox";
```

Dosyanın sonuna ekle:

```tsx
describe("Modal — odak tuzağı gizli öğeleri atlıyor", () => {
  it.each<[string, () => JSX.Element]>([
    ["hidden", () => <div hidden><button type="button">gizli</button></div>],
    ["display:none", () => <div style={{ display: "none" }}><button type="button">gizli</button></div>],
    ["aria-hidden", () => <div aria-hidden="true"><button type="button">gizli</button></div>],
    // jsdom `inert` özelliğini tanımıyor; öznitelik olarak veriliyor.
    ["inert", () => <div {...{ inert: "" }}><button type="button">gizli</button></div>],
    ["fieldset disabled", () => <fieldset disabled><button type="button">gizli</button></fieldset>]
  ])("%s içindeki düğme Tab sırasında yok", (_name, Wrap) => {
    open({
      children: (
        <>
          <button type="button">son</button>
          <Wrap />
        </>
      )
    });
    screen.getByRole("button", { name: "son" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    // "son"dan sonraki tek görünür öğe yok; döngü başa, başlıktaki ✕'e sarıyor.
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Kapat" }));
  });
});

describe("Modal — Escape", () => {
  it("basılı tutulan Escape (repeat) pencereyi kapatmıyor", () => {
    const { onClose } = open();
    fireEvent.keyDown(document, { key: "Escape", repeat: true });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("belgede escape sahibi varken Escape pencereye dokunmuyor", () => {
    const { onClose } = open({ children: <div data-escape-owner="" /> });
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    document.dispatchEvent(event);
    expect(onClose).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("sahip kalkınca Escape yine kapatıyor", () => {
    const { onClose } = open({ children: <div data-escape-owner="" data-testid="sahip" /> });
    act(() => {
      screen.getByTestId("sahip").removeAttribute("data-escape-owner");
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("pencere içindeki ışık kutusu: Escape yalnız ışık kutusunu kapatıyor", () => {
    const onLightboxClose = vi.fn();
    const { onClose } = open({
      children: (
        <AttachmentLightbox
          attachment={{ id: "1", path: "C:\\a.png", name: "a.png" }}
          dataUrl="data:image/png;base64,AA=="
          onClose={onLightboxClose}
          onOpenExternal={() => {}}
        />
      )
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onLightboxClose).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ModelSelector açıkken escape sahibi oluyor", () => {
    const source = readFileSync("src/components/ModelSelector.tsx", "utf8");
    expect(source).toContain('data-escape-owner={open ? "" : undefined}');
  });
});

describe("Modal — değişiklikleri at onayı", () => {
  it("alertdialog, açıklaması aria-describedby ile bağlı, boyu sm", () => {
    open({ dirty: true });
    fireEvent.keyDown(document, { key: "Escape" });
    const alert = screen.getByRole("alertdialog");
    const descId = alert.getAttribute("aria-describedby");
    expect(descId).toBeTruthy();
    expect(document.getElementById(descId!)!.textContent).toContain("kaydetmediğin");
    expect(alert.style.width).toBe("420px");
  });

  it("role ve describedBy dışarıdan da verilebiliyor", () => {
    render(
      <LanguageProvider language="tr">
        <Modal open title="Uyarı" onClose={() => {}} role="alertdialog" describedBy="aciklama">
          <p id="aciklama">Açıklama</p>
        </Modal>
      </LanguageProvider>
    );
    expect(screen.getByRole("alertdialog").getAttribute("aria-describedby")).toBe("aciklama");
  });
});
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/modalFrame.test.tsx > .superpowers/x.txt 2>&1; tail -n 40 .superpowers/x.txt`
Beklenen: Görev 1 testleri PASS; yeni testler FAIL — gizli düğmelere odak
gidiyor, repeat Escape kapatıyor, sahip varken kapatıyor, `alertdialog` yok.
(ModelSelector kaynak testi ve ışık kutusu testi de FAIL.)

- [ ] **Adım 3: Odak süzgecini düzelt** — `focusables`'ı şununla değiştir:

```ts
// Görünmeyen ya da etkisiz alandaki öğeler Tab sırasına girmiyor: odak
// görünmez bir düğmeye düşerse kullanıcı nerede olduğunu kaybediyor.
const HIDDEN_ANCESTOR = "[hidden], [aria-hidden='true'], [inert], fieldset[disabled]";

function isRendered(el: HTMLElement, root: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== root; node = node.parentElement) {
    if (getComputedStyle(node).display === "none") return false;
  }
  return true;
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !(el as HTMLButtonElement).disabled &&
      el.tabIndex >= 0 &&
      !el.closest(HIDDEN_ANCESTOR) &&
      isRendered(el, root)
  );
}
```

- [ ] **Adım 4: Escape kuralını değiştir** — `onKeyDown` içindeki Escape dalı:

```ts
      if (e.key === "Escape") {
        // Açık bir açılır liste ya da ışık kutusu Escape'in sahibi: önce o
        // kapanmalı. Sahipler dinleyicilerini `document`'ta kabarma
        // aşamasında tutuyor; bu dinleyici yakalama aşamasında ve her zaman
        // ÖNCE çalışıyor, o yüzden `defaultPrevented`'a bakmak işe yaramıyor —
        // sahibin varlığına bakılıyor. Olaya dokunulmuyor ki sahip onu alsın.
        if (document.querySelector("[data-escape-owner]")) return;
        e.preventDefault();
        e.stopPropagation();
        // Basılı tutulan Escape peş peşe pencere kapatmasın.
        if (e.repeat) return;
        requestClose();
        return;
      }
```

- [ ] **Adım 5: `role` ve `describedBy`** — `ModalProps`'a (`bare`'in altına) ekle:

```ts
  /** `"alertdialog"`: kullanıcının karar vermesi gereken uyarı
   *  (ör. "Değişiklikleri at?"). Ekran okuyucu açıklamayı hemen okuyor. */
  role?: "dialog" | "alertdialog";
  /** Açıklama metninin id'si; panelin `aria-describedby`'ı oluyor. */
  describedBy?: string;
```

`ModalPanel` parametrelerine `role = "dialog",` ve `describedBy,` ekle;
`const titleId = useId();` altına `const discardDescId = useId();`.
Panel `div`'inde `role="dialog"` → `role={role}`, `aria-labelledby={titleId}`
altına `aria-describedby={describedBy}`.

Onay penceresinin açılışı:

```tsx
        <Modal
          open
          layer={layer === "modal" ? "confirm" : "critical"}
          role="alertdialog"
          describedBy={discardDescId}
          title={t("settingsModal.discardTitle")}
          size="sm"
```

ve gövdesi: `<p id={discardDescId} className="text-sm text-slate-400">{t("settingsModal.discardMessage")}</p>`.

- [ ] **Adım 6: Sahipleri işaretle**

`src/components/ModelSelector.tsx` kap `div`'i:

```tsx
    // Liste açıkken Escape'in sahibi bu bileşen: içinde bulunduğu pencere
    // Escape'i ona bırakıyor (bkz. Modal). Kapanınca öznitelik kalkıyor.
    <div ref={containerRef} className="relative" data-escape-owner={open ? "" : undefined}>
```

(Yorum JSX dönüşünün içinde olamayacağı için `return (` satırının üstüne yaz.)

`src/components/AttachmentLightbox.tsx` kök `div`'inde `role="dialog"`
satırının altına `data-escape-owner=""` ekle; Escape yorumunun sonuna:

```ts
  // Kökteki `data-escape-owner` altındaki pencerenin Escape'i bize bırakmasını
  // sağlıyor; yoksa tek Escape hem ışık kutusunu hem pencereyi kapatırdı.
```

- [ ] **Adım 7: Testleri çalıştır**

Çalıştır: `npx vitest run tests/modalFrame.test.tsx tests/modal.test.tsx tests/dialogMigration.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt; npm run -s typecheck`
Beklenen: hepsi PASS; typecheck çıktısız.

- [ ] **Adım 8: Commit**

```bash
git add src/ui/Modal.tsx
git add tests/modalFrame.test.tsx
git add src/components/ModelSelector.tsx
git add src/components/AttachmentLightbox.tsx
git commit -m "Modal: odak suzgeci, Escape sahibi ve tekrari, alertdialog onayi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: UpdatePromptModal ortak çerçeveye

**Dosyalar:**
- Değiştir: `src/components/UpdatePromptModal.tsx`
- Test: `tests/updatePromptModal.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: Görev 1–2'deki `Modal` (`size`, `layer`, `closeDisabled`, `hideClose`, `footer`), `ModalCancelButton`.
- Üretir: dışa açık imza DEĞİŞMİYOR — `export type UpdatePromptMode`,
  `Props {mode, status, onAccept, onDismiss}`; `App.tsx` dokunulmuyor.

- [ ] **Adım 1: Başarısız testi yaz** — `tests/updatePromptModal.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Güncelleme penceresi ortak çerçevede: soru aşamasında Escape/✕/"Daha
// Sonra" aynı şeyi yapıyor, indirme sürerken hiçbir yoldan kapanmıyor, hata
// olunca kapanabiliyor.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UpdatePromptModal, { type UpdatePromptMode } from "../src/components/UpdatePromptModal";
import type { UpdateStatus } from "../app-electron/shared/types";
import { LanguageProvider } from "../src/i18n";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount(mode: UpdatePromptMode, status: UpdateStatus) {
  const onAccept = vi.fn();
  const onDismiss = vi.fn();
  render(
    <LanguageProvider language="tr">
      <UpdatePromptModal mode={mode} status={status} onAccept={onAccept} onDismiss={onDismiss} />
    </LanguageProvider>
  );
  return { onAccept, onDismiss };
}

describe("UpdatePromptModal", () => {
  it("gizliyken hiçbir şey çizmiyor", () => {
    mount("hidden", { phase: "idle" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("soru: ortak çerçeve, md boy, confirm katmanı, odak İndir ve Kur'da", () => {
    mount("prompt", { phase: "available", version: "9.9.9" });
    const dialog = screen.getByRole("dialog", { name: "Yeni sürüm bulundu" });
    expect(dialog.style.width).toBe("520px");
    expect(dialog.parentElement!.className).toContain("z-confirm");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İndir ve Kur" }));
  });

  it("soru: Escape, ✕ ve Daha Sonra onDismiss'i çağırıyor; İndir ve Kur onAccept'i", () => {
    const { onAccept, onDismiss } = mount("prompt", { phase: "available", version: "9.9.9" });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Kapat" }));
    fireEvent.click(screen.getByRole("button", { name: "Daha Sonra" }));
    expect(onDismiss).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole("button", { name: "İndir ve Kur" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("indirme sürerken: ✕ yok, Escape kapatmıyor, ilerleme çubuğu var", () => {
    const { onDismiss } = mount("progress", { phase: "downloading", version: "9.9.9", percent: 40 });
    expect(screen.queryByRole("button", { name: "Kapat" })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByText(/indiriliyor/)).toBeTruthy();
  });

  it("indirildi: kapanmıyor", () => {
    const { onDismiss } = mount("progress", { phase: "downloaded", version: "9.9.9" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("hata: Escape ve alttaki Kapat onDismiss'i çağırıyor", () => {
    const { onDismiss } = mount("progress", { phase: "error", message: "ağ yok" });
    expect(screen.getByText(/ağ yok/)).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    // İki "Kapat" var: başlıktaki ✕ ve alttaki düğme. Sonuncusu alttaki.
    const closes = screen.getAllByRole("button", { name: "Kapat" });
    fireEvent.click(closes[closes.length - 1]);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/updatePromptModal.test.tsx > .superpowers/x.txt 2>&1; tail -n 40 .superpowers/x.txt`
Beklenen: FAIL — `role="dialog"` yok, Escape hiçbir şey yapmıyor, ✕ yok.
("gizliyken" testi PASS olabilir.)

- [ ] **Adım 3: Bileşeni yeniden yaz** — `src/components/UpdatePromptModal.tsx`
dosyasının tamamı (uzun açıklama yorumu aynen kalıyor, sonuna iki cümle ekli):

```tsx
import { Download, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { UpdateStatus } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { DIALOG_CONFIRM_BUTTON } from "../ui/buttons";
import { Modal, ModalCancelButton } from "../ui/Modal";

export type UpdatePromptMode = "hidden" | "prompt" | "progress";

interface Props {
  mode: UpdatePromptMode;
  status: UpdateStatus;
  onAccept: () => void;
  onDismiss: () => void;
}

// Uygulama açılışında (main/index.ts'teki otomatik `checkForUpdates`
// tetiklemesi sonrası) veya Ayarlar'daki "Şimdi Kontrol Et" sonrası bir
// güncelleme bulunursa burada TEK BİR SORU sorulur ("İndir ve Kur mu?") —
// kullanıcı "İndir ve Kur"a bastıktan sonra indirme VE kurulum (yeniden
// başlatma) tamamen otomatik ilerler, ikinci bir onay istenmez (bkz.
// App.tsx'teki "downloaded" fazında otomatik `installUpdate()` çağrısı).
// "Daha Sonra" seçilirse bu modal o oturumda aynı sürüm için bir daha
// açılmaz (App.tsx `dismissedUpdateVersion` ile takip ediyor) — sonraki
// bir sürüm bulunduğunda (veya uygulama yeniden başlatıldığında) tekrar
// sorulur.
//
// Ortak `Modal` çerçevesinde, `confirm` katmanında: açık bir pencerenin
// üstünde de görünüyor. İndirme/kurulum sürerken kapanmıyor ve ✕ hiç
// çizilmiyor; devre dışı bir ✕ kapatılabilirmiş izlenimi verirdi.
export default function UpdatePromptModal({ mode, status, onAccept, onDismiss }: Props) {
  const t = useT();
  const locked = mode === "progress" && status.phase !== "error";

  const footer =
    mode === "prompt" ? (
      <>
        <ModalCancelButton label={t("updatePrompt.later")} />
        <button type="button" onClick={onAccept} autoFocus className={DIALOG_CONFIRM_BUTTON}>
          <Download size={14} />
          {t("updatePrompt.install")}
        </button>
      </>
    ) : mode === "progress" && status.phase === "error" ? (
      <ModalCancelButton label={t("updatePrompt.close")} />
    ) : undefined;

  return (
    <Modal
      open={mode !== "hidden"}
      layer="confirm"
      size="md"
      title={t("updatePrompt.title")}
      icon={<Download size={18} />}
      onClose={onDismiss}
      closeDisabled={locked}
      hideClose={locked}
      footer={footer}
    >
      {mode === "prompt" && (
        <p className="text-sm text-slate-400">{t("updatePrompt.message", { version: status.version ?? "" })}</p>
      )}

      {mode === "progress" && status.phase === "downloading" && (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm text-accent-400">
            <Download size={14} />
            {t("updatePrompt.downloading", { version: status.version ?? "", percent: status.percent ?? 0 })}
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-control">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${status.percent ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {mode === "progress" && status.phase === "downloaded" && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--status-success-text)]">
          <CheckCircle2 size={14} />
          {t("updatePrompt.downloaded")}
        </p>
      )}

      {mode === "progress" && status.phase === "error" && (
        <p className="flex items-start gap-1.5 text-sm text-[var(--status-danger-text)]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          {t("updatePrompt.error", { message: status.message ?? "" })}
        </p>
      )}

      {mode === "progress" &&
        status.phase !== "downloading" &&
        status.phase !== "downloaded" &&
        status.phase !== "error" && (
          <p className="flex items-center gap-1.5 text-sm text-slate-400">
            <RefreshCw size={14} className="animate-spin" />
            {t("settingsModal.checking")}
          </p>
        )}
    </Modal>
  );
}
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npx vitest run tests/updatePromptModal.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt; npm run -s typecheck`
Beklenen: 6/6 PASS; typecheck çıktısız.

- [ ] **Adım 5: Commit**

```bash
git add src/components/UpdatePromptModal.tsx
git add tests/updatePromptModal.test.tsx
git commit -m "UpdatePromptModal ortak Modal cercevesine tasindi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 4: AppConnectionsModal ve GlobalSkillsModal ortak çerçeveye

**Dosyalar:**
- Değiştir: `src/components/AppConnectionsModal.tsx`
- Değiştir: `src/components/GlobalSkillsModal.tsx`
- Test: `tests/appConnectionsModal.test.tsx` (yeni), `tests/globalSkillsModal.test.tsx` (ekleme)

**Arayüzler:**
- Tüketir: `Modal` (`size="lg"`, `initialFocus="dialog"`, `icon`, `subtitle`, `footer`), `ModalCancelButton`.
- Üretir: dışa açık imzalar DEĞİŞMİYOR (`AppConnectionsModal {open, onClose, onOpenProjectTerminal, projectDir}`, `GlobalSkillsModal {open, onClose}`).

- [ ] **Adım 1: Başarısız testleri yaz** — `tests/appConnectionsModal.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Uygulama Bağlantıları ortak çerçevede: Escape odak dışarıdayken de
// çalışıyor (eskiden yalnız pencerenin içinden kabaran tuşu dinliyordu),
// tek "Kapat" nötr düğme, proje terminali açılınca pencere kapanıyor.

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";

// İçerik bu testin konusu değil; yalnız terminal geri çağrısı lazım.
vi.mock("../src/components/AppConnectionsSection", () => ({
  default: ({ onOpenProjectTerminal }: { onOpenProjectTerminal: () => void }) => (
    <button type="button" onClick={onOpenProjectTerminal}>
      proje terminali
    </button>
  )
}));

import AppConnectionsModal from "../src/components/AppConnectionsModal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount() {
  const onClose = vi.fn();
  const onOpenProjectTerminal = vi.fn();
  const outside = document.createElement("button");
  document.body.appendChild(outside);
  outside.focus();
  render(
    <LanguageProvider language="tr">
      <AppConnectionsModal open onClose={onClose} onOpenProjectTerminal={onOpenProjectTerminal} projectDir={null} />
    </LanguageProvider>
  );
  return { onClose, onOpenProjectTerminal };
}

describe("AppConnectionsModal", () => {
  it("ortak çerçeve: lg boy, başlık adıyla dialog, odak pencerede", () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Uygulama Bağlantıları" });
    expect(dialog.style.width).toBe("640px");
    expect(document.activeElement).toBe(dialog);
  });

  it("Escape kapatıyor", () => {
    const { onClose } = mount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("alttaki Kapat dolgulu vurgu değil", () => {
    mount();
    const closes = screen.getAllByRole("button", { name: "Kapat" });
    const footerClose = closes[closes.length - 1];
    expect(footerClose.className).not.toContain("bg-accent-500");
  });

  it("proje terminali açılınca pencere kapanıyor", () => {
    const { onClose, onOpenProjectTerminal } = mount();
    fireEvent.click(screen.getByRole("button", { name: "proje terminali" }));
    expect(onOpenProjectTerminal).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

`tests/globalSkillsModal.test.tsx`'te `mountWith`'e isteğe bağlı `onClose`
parametresi ekle (`function mountWith(value: GlobalSkillList, onClose = () => {})`
ve `<GlobalSkillsModal open onClose={onClose} />`), `describe` bloğunun sonuna:

```tsx
  it("ortak çerçeve: Escape kapatıyor, boy lg", async () => {
    const onClose = vi.fn();
    mountWith(list([row()]), onClose);
    await screen.findByRole("switch", { name: "sap-adt-readonly" });
    const dialog = screen.getByRole("dialog", { name: "Genel yetenekler" });
    expect(dialog.style.width).toBe("640px");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/appConnectionsModal.test.tsx tests/globalSkillsModal.test.tsx > .superpowers/x.txt 2>&1; tail -n 40 .superpowers/x.txt`
Beklenen: yeni testler FAIL (`role="dialog"` yok; Escape `document`'ta
dinlenmiyor). Terminal testi PASS olabilir. Eski globalSkills testleri PASS.

- [ ] **Adım 3: `AppConnectionsModal.tsx`'i yeniden yaz** (dosyanın tamamı):

```tsx
import { Plug } from "lucide-react";
import { useT } from "../i18n";
import { Modal, ModalCancelButton } from "../ui/Modal";
import AppConnectionsSection from "./AppConnectionsSection";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenProjectTerminal: () => void;
  /** Yalnızca içeriye geçiriliyor — bkz. AppConnectionsSection.Props. */
  projectDir: string | null;
}

// Uygulama Bağlantıları — kullanıcı isteğiyle (2026-08-29, aynı gün ikinci
// tur) Ayarlar modal'ının İÇİNDEN çıkarıldı: "ayarların içinde değil de
// ayarlar butonunun üstünde de olsun" — yani o günkü ActivityBar'ın alt
// köşesinde, dil/tema/ayarlar butonlarının sırasında (2026-09-29'dan beri
// kenar çubuğunun dibinde, Ayarlar'ın durduğu ikon sırasının üstünde) ayrı
// bir buton, kendi bağımsız modal'ını açıyor. İçerik
// (`AppConnectionsSection.tsx`) DEĞİŞMEDİ.
//
// Çerçeve ortak `Modal` (2026-10-01): Escape eskiden yalnız pencerenin
// içinden kabaran tuşu dinliyordu ve odak dışarıdayken ölüydü (kullanıcı
// bildirdi, 2026-09-07). Bu kutuda belirgin bir "ilk alan" yok, içerik
// bağlayıcı listesi — ilk odak pencerenin kendisi (`initialFocus="dialog"`).
export default function AppConnectionsModal({ open, onClose, onOpenProjectTerminal, projectDir }: Props) {
  const t = useT();

  // "AXET Projesi Seç" tıklanınca hem Terminal moduna geçilip AXET bölmesi
  // ekleniyor hem bu modal KAPATILIYOR — aksi halde modal'ın arka planı
  // Terminal modunu görünmez şekilde ÖRTERDİ, kullanıcı yeni bölmeyi hiç
  // göremezdi.
  const handleOpenProjectTerminal = () => {
    onOpenProjectTerminal();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      initialFocus="dialog"
      icon={<Plug size={18} />}
      title={t("appConnectionsModal.title")}
      subtitle={t("appConnectionsModal.subtitle")}
      footer={<ModalCancelButton label={t("common.close")} />}
    >
      <AppConnectionsSection onOpenProjectTerminal={handleOpenProjectTerminal} projectDir={projectDir} />
    </Modal>
  );
}
```

- [ ] **Adım 4: `GlobalSkillsModal.tsx`'i değiştir**

1. Import'lar:
   ```tsx
   import { useCallback, useEffect, useState } from "react";
   import { AlertCircle, Globe, Lock } from "lucide-react";
   import type { GlobalSkillList, GlobalSkillRow, SkillSet } from "../../app-electron/shared/types";
   import { useT } from "../i18n";
   import { Modal } from "../ui/Modal";
   ```
2. `const panelRef = useRef<HTMLDivElement>(null);` satırını sil.
3. Efekt:
   ```tsx
   useEffect(() => {
     if (!open) return;
     load();
   }, [open, load]);
   ```
4. `if (!open) return null;` satırını sil (Modal kapalıyken zaten bir şey çizmiyor).
5. `return (` ile başlayan dış iki `div`, başlık bloğu ve gövde `div`'i yerine:
   ```tsx
   return (
     <Modal
       open={open}
       onClose={onClose}
       size="lg"
       initialFocus="dialog"
       icon={<Globe size={18} />}
       title={t("globalSkills.title")}
       subtitle={<span title={list?.root}>{t("globalSkills.subtitle")}</span>}
     >
       <div className="space-y-4">
         {/* …gövdenin içeriği AYNEN: intro paragrafı, failed, noRole, SETS.map… */}
       </div>
     </Modal>
   );
   ```
   Gövdedeki `<p className="text-xs leading-relaxed text-slate-400">{t("globalSkills.intro")}</p>`
   ve sonrasındaki her şey (SETS.map dahil) değişmeden bu `div`'in içine taşınıyor.
   Anahtar düğmesinin sınıfından ` disabled:cursor-not-allowed disabled:opacity-50`
   KALIYOR: bu `btn()` değil, elle çizilmiş bir `role="switch"`; SHELL'in
   devre dışı kuralları ona uygulanmıyor.

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `npx vitest run tests/appConnectionsModal.test.tsx tests/globalSkillsModal.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt; npm run -s typecheck`
Beklenen: hepsi PASS; typecheck çıktısız (kullanılmayan `useRef`/`X`/`useEffect` uyarısı yok).

- [ ] **Adım 6: Commit**

```bash
git add src/components/AppConnectionsModal.tsx
git add src/components/GlobalSkillsModal.tsx
git add tests/appConnectionsModal.test.tsx
git add tests/globalSkillsModal.test.tsx
git commit -m "Uygulama Baglantilari ve Genel yetenekler ortak Modal cercevesine tasindi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 5: SkillsSection düğmeleri ortak dile; RoleModal kararı

**Dosyalar:**
- Değiştir: `src/components/SkillsSection.tsx` (111, 149, 173, ~255–286. satırlar)
- Test: `tests/skillsSection.test.tsx` (ekleme)
- `src/components/RoleModal.tsx`: DEĞİŞMİYOR (aşağıdaki karar)

**Arayüzler:**
- Tüketir: `btn`, `iconBtn` (`src/ui/buttons.ts`). `SHELL` zaten
  `disabled:cursor-default`, `neutral` zaten `disabled:opacity-40` veriyor;
  elle eklenen devre dışı sınıflar fazlalık ve birbiriyle çelişiyor.
- Üretir: yok.

**RoleModal kararı:** spec'in "elle çizilmiş `<input>`" dediği öğe (~213. satır)
bir onay kutusu (`type="checkbox"`); `Input` metin alanı, onay kutusuna
uymuyor. ~134. satırdaki düğmeler rol SEÇİM KARTLARI, eylem düğmesi değil;
`btn()` onları sıradan düğmeye çevirirdi. İkisi de olduğu gibi kalıyor.

- [ ] **Adım 1: Başarısız testleri yaz** — `tests/skillsSection.test.tsx`
import'larına `import { readFileSync } from "node:fs";` ve
`import { iconBtn } from "../src/ui/buttons";` ekle; `describe` bloğunun sonuna:

```tsx
  it("Kaldır düğmesi ortak kare ikon düğmesi ve adı var", async () => {
    mountWith(catalog([skill({ installed: true, removable: true })]));
    const remove = await screen.findByRole("button", { name: "Kaldır" });
    expect(remove.getAttribute("aria-label")).toBe("Kaldır");
    expect(remove.className).toBe(iconBtn("neutral", "sm"));
  });

  it("kaynakta elle devre dışı sınıfı ve 11px yazı kalmadı", () => {
    const source = readFileSync("src/components/SkillsSection.tsx", "utf8");
    expect(source).not.toContain("disabled:cursor-not-allowed");
    expect(source).not.toContain("text-[11px]");
  });
```

- [ ] **Adım 2: Testlerin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/skillsSection.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt`
Beklenen: iki yeni test FAIL (sınıf `btn(...)` + fazlalık; kaynakta iki kalıp var).

- [ ] **Adım 3: Değişiklikler**

1. Import: `import { btn } from "../ui/buttons";` → `import { btn, iconBtn } from "../ui/buttons";`
2. ~111. satır etiket: `text-[11px]` → `text-2xs`.
3. ~149. satır: `` className={`${btn("neutral", "sm")} shrink-0`} `` → `className={btn("neutral", "sm", "shrink-0")}`.
4. ~173. satır: `` className={`${btn("neutral", "sm")} shrink-0 disabled:cursor-not-allowed disabled:opacity-50`} `` → `className={btn("neutral", "sm", "shrink-0")}`.
5. Kur düğmesi (~268. satır): `` className={`${btn("neutral", "sm")} disabled:cursor-not-allowed disabled:opacity-50`} `` → `className={btn("neutral", "sm")}`.
6. Kaldır düğmesi (~274–286. satırlar):

```tsx
                          <button
                            type="button"
                            disabled={pending !== null}
                            title={t("catalogSkills.remove")}
                            aria-label={t("catalogSkills.remove")}
                            onClick={() =>
                              void runCatalog(`rm:${skill.id}`, () =>
                                window.api.removeCatalogSkill(projectDir, skill.name)
                              )
                            }
                            className={iconBtn("neutral", "sm")}
                          >
                            <Trash2 size={12} />
                          </button>
```

Kalan var mı: `grep -n "disabled:cursor-not-allowed\|text-\[11px\]" src/components/SkillsSection.tsx` → sonuç yok.

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npx vitest run tests/skillsSection.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt`
Beklenen: hepsi PASS (eski `findByTitle("Kaldır")` testleri de; `title` duruyor).

- [ ] **Adım 5: Commit**

```bash
git add src/components/SkillsSection.tsx
git add tests/skillsSection.test.tsx
git commit -m "SkillsSection: dugmeler ortak btn/iconBtn diline gecti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 6: Proje penceresinde İptal sonrası odak (önce ölçüm)

**Dosyalar:**
- Test: `tests/chatProjectDialogFocus.test.tsx` (yeni)
- Test: `tests/addSystemModal.test.tsx` (ekleme; dosya yoksa `tests/` altındaki
  `AddSystemModal`'ı bağlayan test dosyasına — `grep -ln "AddSystemModal" tests`)
- Değiştir (yalnız ölçüm Dal A'yı gösterirse): `src/ui/Modal.tsx`,
  `src/components/ChatProjectDialog.tsx`, `src/components/AxetCodeHome.tsx`

**Arayüzler:**
- Tüketir: `ChatProjectDialog {project, onClose, onSave, onDelete}`,
  `ChatStoreProvider`, `useChatStore().registerChatCommands`,
  `ChatSidebar` (proje açan iki düğme: "Yeni proje" ve proje başlığındaki
  "Proje ayarları").
- Üretir (yalnız Dal A): `ModalProps.returnFocus?: () => HTMLElement | null` —
  kapanışta odak bu işlevin döndürdüğü öğeye gidiyor; `null` dönerse ya da
  verilmemişse bugünkü gibi açan öğeye.

**Neden ölçüm:** `Modal` kapanınca odağı açan öğeye zaten veriyor ve pencere
tek başına denendiğinde bu çalışıyor. Bozukluk kenar çubuğu → AxetCodeHome
akışında. Sebebi görmeden düzeltme yazılmıyor.

- [ ] **Adım 1: Ölçüm testini yaz** — `tests/chatProjectDialogFocus.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Proje penceresi kenar çubuğundan açılıp İptal'le kapanınca odak açan
// düğmeye dönmeli; `body`'ye düşerse klavye kullanıcısı kenar çubuğunun
// başına geri yürümek zorunda kalıyor. Pencere AxetCodeHome'daki gibi
// komutla açılıyor (store'daki `openProjectDialog`).

import { useEffect, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import ChatSidebar from "../src/components/ChatSidebar";
import ChatProjectDialog from "../src/components/ChatProjectDialog";
import { ChatStoreProvider, useChatStore, type ChatStore } from "../src/stores/chatStore";

let store: ChatStore;

function Harness() {
  store = useChatStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const { registerChatCommands } = store;
  useEffect(
    () =>
      registerChatCommands({
        newSession: vi.fn(),
        requestDelete: vi.fn(),
        openProjectDialog: setOpenId,
        openShortcuts: vi.fn()
      }),
    [registerChatCommands]
  );
  const project = store.projects.find((p) => p.id === openId) ?? null;
  return (
    <>
      <ChatSidebar
        recentEntries={[]}
        connectivity={{}}
        tierOverrides={{}}
        activeSap={null}
        onOpenSapLauncher={() => {}}
        onQuickConnectSap={() => {}}
      />
      <ChatProjectDialog project={project} onClose={() => setOpenId(null)} onSave={() => {}} onDelete={() => {}} />
    </>
  );
}

beforeEach(() => {
  (window as unknown as { api: unknown }).api = new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) });
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function mount() {
  render(
    <LanguageProvider language="tr">
      <ChatStoreProvider pushToast={() => {}}>
        <Harness />
      </ChatStoreProvider>
    </LanguageProvider>
  );
}

describe("ChatProjectDialog — İptal sonrası odak", () => {
  it("Yeni proje ile açılıp İptal'le kapanınca odak Yeni proje düğmesinde", () => {
    mount();
    const opener = screen.getByTitle("Yeni proje");
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("Proje ayarları ile açılıp İptal'le kapanınca odak o düğmede", () => {
    mount();
    act(() => {
      store.createProject();
    });
    const opener = screen.getByTitle("Proje ayarları");
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(document.activeElement).toBe(opener);
  });
});
```

Not: `window.api` Proxy'si kenar çubuğunun ve store'un açılışta yaptığı
çağrıları sessizce karşılıyor. Bir çağrı senkron değer bekleyip patlarsa
o adı Proxy'den önce `{ ad: () => değer }` ile ver ve bunu raporda yaz.

- [ ] **Adım 2: Ölç**

Çalıştır: `npx vitest run tests/chatProjectDialogFocus.test.tsx > .superpowers/x.txt 2>&1; tail -n 40 .superpowers/x.txt`
Sonuca göre YALNIZ BİR dal uygulanıyor:

**Dal A — test FAIL, odak `body`'de.** Sebebi bul: `Modal` kapanırken
`opener.isConnected` yanlış mı (düğme yeniden mi çizildi), yoksa `opener`
ilk çizimde düğme değil miydi? Ölç:
`Modal.tsx`'teki kapanış temizliğine geçici olarak
`console.log("opener", opener?.outerHTML.slice(0, 80), (opener as HTMLElement | null)?.isConnected)`
ekle, testi yeniden çalıştır, çıktıyı oku, satırı SİL.
- Düğme yeniden çizildiyse (bağlı değil): `ModalProps`'a ekle
  ```ts
  /** Kapanışta odağın döneceği öğe. Açan öğe kapanışta yeniden çizilmiş
   *  olabiliyorsa (ör. proje listesi yeniden kuruluyor) verilir; `null`
   *  dönerse açan öğeye dönülüyor. */
  returnFocus?: () => HTMLElement | null;
  ```
  `ModalPanel`'de `const returnFocusRef = useRef(returnFocus); returnFocusRef.current = returnFocus;`
  ve kapanış temizliği:
  ```ts
  useEffect(
    () => () => {
      const target = returnFocusRef.current?.() ?? opener;
      if (target instanceof HTMLElement && target.isConnected) target.focus();
    },
    [opener]
  );
  ```
  `ChatProjectDialog`'a `returnFocus?: () => HTMLElement | null` prop'u ekleyip
  `Modal`'a geçir; AxetCodeHome'da açılış anındaki odaklı öğenin
  `title`'ını sakla ve `returnFocus={() => document.querySelector<HTMLElement>(`[title="${savedTitle}"]`)}`
  yerine ölçümde bulunan kalıcı bir seçiciyle (ör. düğmeye eklenecek
  `data-project-opener={project.id}`) geri bul. Seçiciyi ölçüme göre seç
  ve kararı rapora yaz.
- `opener` ilk çizimde düğme değildiyse: odak açılıştan ÖNCE başka bir yere
  taşınıyor demektir; o yeri bul ve rapora yaz, düzeltmeyi oraya yap.

**Dal B — test PASS (jsdom'da odak dönüyor).** Pencerenin kendisi doğru;
gerçek uygulamada odağı alan AxetCodeHome. Şüpheliler:
`src/components/AxetCodeHome.tsx` ~835 ve ~1755. satırlardaki
`requestAnimationFrame(() => textareaRef.current?.focus())` ve
`setProjectDialogId(null)` çağıran her yer (`grep -n "setProjectDialogId" src/components/AxetCodeHome.tsx`).
Bu dalda KÖR DÜZELTME YOK: hangi çağrının odağı çaldığını kanıtlayan ölçüm
(ör. AxetCodeHome'u bağlayan bir test ya da uygulamada
`document.addEventListener("focusin", …)` ile geçici günlük) yapılmadan kod
değişmiyor. Ölçüm yapılamıyorsa raporda "Dal B: jsdom'da çalışıyor,
uygulamadaki sebep ölçülemedi" yaz; test dosyası koruma olarak kalıyor.

- [ ] **Adım 3: AddSystemModal koruma testi** — düzenleme modunda açılan
pencere `dirty` değil; değişiklik yapmadan Escape soru sormadan kapatıyor.
AddSystemModal'ı bağlayan test dosyasının `describe` bloğuna (oradaki
bağlama yardımcısını ve `api` taklidini kullanarak) ekle:

```tsx
  it("düzenleme modunda değişiklik yokken Escape soru sormadan kapatıyor", () => {
    const onClose = vi.fn();
    render(
      <LanguageProvider language="tr">
        <AddSystemModal
          open
          onClose={onClose}
          editing={{
            id: "m1",
            name: "Test",
            systemId: "TST",
            type: "onprem",
            host: "10.0.0.1",
            diagPort: "",
            adtUrl: ""
          }}
          onSaved={() => {}}
        />
      </LanguageProvider>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Değişiklikleri at?")).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
```

Prop adları (`editing`, `onSaved`, `diagPort`'un tipi) dosyadaki gerçek
`AddSystemModal` imzasına göre düzeltilir — `grep -n "interface Props" -A15 src/components/AddSystemModal.tsx`.
Bu testin İLK ÇALIŞTIRMADA GEÇMESİ bekleniyor (bugünkü davranışı koruyor).

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatProjectDialogFocus.test.tsx tests/modal.test.tsx tests/modalFrame.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt; npm run -s typecheck`
Beklenen: hepsi PASS; typecheck çıktısız. AddSystemModal test dosyası da PASS.

- [ ] **Adım 5: Commit** (yalnız değişen dosyalar, dal sonucuna göre)

```bash
git add tests/chatProjectDialogFocus.test.tsx
git add tests/<AddSystemModal test dosyası>
# Dal A'da ayrıca:
git add src/ui/Modal.tsx
git add src/components/ChatProjectDialog.tsx
git add src/components/AxetCodeHome.tsx
git commit -m "Proje penceresi: Iptal sonrasi odak olculdu ve korundu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 7: Ayarlar bölüm tanımları ve sol bölüm listesi (`SettingsNav`)

**Dosyalar:**
- Oluştur: `src/components/settings/settingsSections.ts`
- Oluştur: `src/components/settings/SettingsNav.tsx`
- Değiştir: `src/i18n/tr.ts` (584. satırdaki `settingsModal.pathMissing`'in altına)
- Değiştir: `src/i18n/en.ts` (528. satırdaki `settingsModal.pathMissing`'in altına)
- Test: `tests/settingsSections.test.ts` (yeni), `tests/settingsNav.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: `AppConfig` (`app-electron/shared/types.ts`), `TranslationKey` (`src/i18n/tr.ts`).
- Üretir (Görev 8 kullanıyor):
  ```ts
  export type SettingsSectionId =
    | "general" | "appearance" | "axetCode" | "chatAppearance"
    | "terminal" | "advanced" | "manual" | "updates";
  export interface SettingsSection {
    id: SettingsSectionId;
    icon: LucideIcon;
    titleKey: TranslationKey;
    descKey: TranslationKey;
    fields: readonly (keyof AppConfig)[];
  }
  export const SETTINGS_SECTIONS: readonly SettingsSection[];
  export const EDITED_FIELDS: readonly (keyof AppConfig)[];
  export function dirtySections(form: AppConfig | null, config: AppConfig | null): Set<SettingsSectionId>;
  // SettingsNav.tsx (default export)
  interface SettingsNavProps {
    value: SettingsSectionId;
    onChange: (id: SettingsSectionId) => void;
    dirty: ReadonlySet<SettingsSectionId>;
    idPrefix: string;          // sekme id'si `${idPrefix}-tab-${id}`, panel id'si `${idPrefix}-panel`
    footer?: ReactNode;        // en altta sabit soluk metin (sürüm)
  }
  ```

**Seçim rengi kararı:** spec "kenar çubuklarındaki seçim diliyle (`bg-active`)"
diyor; kenar çubuğundaki seçili satır gerçekte
`bg-[var(--accent-glow)] text-slate-100` (`ChatSidebar.tsx` ~211. satır).
Amaç aynı dil olduğu için kenar çubuğundaki sınıf kullanılıyor; `bg-active`
yalnız fareyle üstüne gelince değil, `hover:bg-hover/60` de kenar
çubuğundaki gibi.

**Alan eşlemesi** (bugünkü `SettingsModal.tsx`'teki bölümlerle aynı;
ikonlar oradaki `Section` çağrılarından):

| id | ikon | başlık anahtarı | alanlar |
|---|---|---|---|
| general | `Languages` | `settingsModal.sectionGeneral` | `language`, `projectsBaseDir` |
| appearance | `Palette` | `settingsModal.sectionAppearance` | `palette`, `theme`, `chatFontSize` |
| axetCode | `Sparkles` | `settingsModal.sectionAxetCode` | `axetWorkspaceDir` |
| chatAppearance | `Type` | `settingsModal.sectionChatAppearance` | `chatDensity` |
| terminal | `TerminalSquare` | `settingsModal.sectionTerminal` | `axetCommand`, `terminal` |
| advanced | `Wrench` | `settingsModal.sectionAdvanced` | `landscapePathOverride`, `sapShcutPathOverride` |
| manual | `Database` | `settingsModal.sectionManual` | — |
| updates | `Download` | `settingsModal.sectionUpdates` | `autoCheckUpdates` |

Not: `chatFontSize` bugün Görünüm bölümünde çiziliyor (555. satır); orada kalıyor.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/settingsSections.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { AppConfig } from "../app-electron/shared/types";
import { dirtySections, EDITED_FIELDS, SETTINGS_SECTIONS } from "../src/components/settings/settingsSections";

const base = {
  language: "tr",
  projectsBaseDir: "C:\\p",
  palette: "ntt",
  theme: "dark",
  chatFontSize: "md",
  axetWorkspaceDir: "C:\\w",
  chatDensity: "comfortable",
  axetCommand: "axet",
  terminal: "cmd",
  landscapePathOverride: null,
  sapShcutPathOverride: null,
  autoCheckUpdates: true
} as unknown as AppConfig;

describe("settingsSections", () => {
  it("sekiz bölüm, spec'teki sırayla", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual([
      "general", "appearance", "axetCode", "chatAppearance", "terminal", "advanced", "manual", "updates"
    ]);
  });

  it("bir alan yalnız bir bölümde", () => {
    expect(new Set(EDITED_FIELDS).size).toBe(EDITED_FIELDS.length);
  });

  it("değişiklik yoksa boş küme", () => {
    expect(dirtySections({ ...base }, base).size).toBe(0);
    expect(dirtySections(null, base).size).toBe(0);
    expect(dirtySections(base, null).size).toBe(0);
  });

  it("değişen alanın bölümü işaretleniyor", () => {
    const form = { ...base, theme: "light", axetCommand: "x" } as AppConfig;
    expect([...dirtySections(form, base)].sort()).toEqual(["appearance", "terminal"]);
  });

  it("boş yol ('') null'dan farklı sayılıyor", () => {
    const form = { ...base, landscapePathOverride: "" } as AppConfig;
    expect([...dirtySections(form, base)]).toEqual(["advanced"]);
  });
});
```

Bugünkü `isDirty` hesabı alanları `!==` ile karşılaştırıyor
(`grep -n "isDirty" -A12 src/components/SettingsModal.tsx`); yeni hesap
bununla aynı kalmalı. Bugünkü hesap boş metni `null`'a çeviriyorsa bu testi
o davranışa göre düzelt ve rapora yaz.

`tests/settingsNav.test.tsx`:

```tsx
// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SettingsNav from "../src/components/settings/SettingsNav";
import type { SettingsSectionId } from "../src/components/settings/settingsSections";

afterEach(cleanup);

function Harness({ dirty = new Set<SettingsSectionId>() }: { dirty?: Set<SettingsSectionId> }) {
  const [value, setValue] = useState<SettingsSectionId>("general");
  return (
    <LanguageProvider language="tr">
      <SettingsNav value={value} onChange={setValue} dirty={dirty} idPrefix="ayar" footer={<span>Sürüm 1.0</span>} />
    </LanguageProvider>
  );
}

const tabs = () => screen.getAllByRole("tab");

describe("SettingsNav", () => {
  it("dikey sekme listesi, sekiz sekme, adı var", () => {
    render(<Harness />);
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    expect(list.getAttribute("aria-label")).toBe("Ayar bölümleri");
    expect(tabs()).toHaveLength(8);
    expect(tabs()[0].textContent).toContain("Genel");
    expect(screen.getByText("Sürüm 1.0")).toBeTruthy();
  });

  it("seçili sekme: aria-selected, tabindex 0, panele bağlı; ötekiler -1", () => {
    render(<Harness />);
    const [first, second] = tabs();
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.getAttribute("tabindex")).toBe("0");
    expect(first.id).toBe("ayar-tab-general");
    expect(first.getAttribute("aria-controls")).toBe("ayar-panel");
    expect(second.getAttribute("aria-selected")).toBe("false");
    expect(second.getAttribute("tabindex")).toBe("-1");
  });

  it("tıklama seçiyor", () => {
    render(<Harness />);
    fireEvent.click(tabs()[4]);
    expect(tabs()[4].getAttribute("aria-selected")).toBe("true");
  });

  it("ok tuşları geziyor ve uçlarda dönüyor; Home/End", () => {
    render(<Harness />);
    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tabs()[1], { key: "End" });
    expect(document.activeElement).toBe(tabs()[7]);
    fireEvent.keyDown(tabs()[7], { key: "ArrowDown" });
    expect(document.activeElement).toBe(tabs()[0]);
    fireEvent.keyDown(tabs()[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(tabs()[7]);
    fireEvent.keyDown(tabs()[7], { key: "Home" });
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it("değişiklikli bölümde nokta var, ötekilerde yok", () => {
    render(<Harness dirty={new Set<SettingsSectionId>(["terminal"])} />);
    const dots = document.querySelectorAll("[data-dirty-dot]");
    expect(dots).toHaveLength(1);
    expect(tabs()[4].contains(dots[0])).toBe(true);
    expect(dots[0].getAttribute("aria-hidden")).toBe("true");
  });

  it("seçili satır kenar çubuğunun seçim rengiyle", () => {
    render(<Harness />);
    expect(tabs()[0].className).toContain("bg-[var(--accent-glow)]");
    expect(tabs()[1].className).not.toContain("bg-[var(--accent-glow)]");
  });
});
```

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/settingsSections.test.ts tests/settingsNav.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt`
Beklenen: FAIL — modüller yok (`Failed to resolve import`).

- [ ] **Adım 3: Çeviri anahtarları**

`src/i18n/tr.ts`, `"settingsModal.pathMissing"` satırının altına:

```ts
  "settingsModal.sectionsLabel": "Ayar bölümleri",
  "settingsModal.descGeneral": "Uygulama dili ve proje klasörü.",
  "settingsModal.descAppearance": "Vurgu rengi, tema ve sohbet yazı boyutu.",
  "settingsModal.descAxetCode": "Yeni sohbetlerin açılacağı klasör.",
  "settingsModal.descChatAppearance": "Sohbette satırların sıklığı.",
  "settingsModal.descTerminal": "axet.code komutu ve gömülü terminal kabuğu.",
  "settingsModal.descAdvanced": "SAP Logon ve SAP GUI dosyalarının yolları.",
  "settingsModal.descManual": "Elle eklenen sistemleri dışa ve içe aktar.",
  "settingsModal.descUpdates": "Sürüm bilgisi ve güncelleme denetimi.",
```

`src/i18n/en.ts`, `"settingsModal.pathMissing"` satırının altına:

```ts
  "settingsModal.sectionsLabel": "Settings sections",
  "settingsModal.descGeneral": "App language and project folder.",
  "settingsModal.descAppearance": "Accent color, theme and chat text size.",
  "settingsModal.descAxetCode": "Folder where new chats open.",
  "settingsModal.descChatAppearance": "Line spacing in chat.",
  "settingsModal.descTerminal": "axet.code command and embedded terminal shell.",
  "settingsModal.descAdvanced": "Paths to SAP Logon and SAP GUI files.",
  "settingsModal.descManual": "Export and import manually added systems.",
  "settingsModal.descUpdates": "Version info and update checks.",
```

- [ ] **Adım 4: `src/components/settings/settingsSections.ts`**

```ts
import {
  Database,
  Download,
  Languages,
  Palette,
  Sparkles,
  TerminalSquare,
  Type,
  Wrench,
  type LucideIcon
} from "lucide-react";
import type { AppConfig } from "../../../app-electron/shared/types";
import type { TranslationKey } from "../../i18n/tr";

export type SettingsSectionId =
  | "general"
  | "appearance"
  | "axetCode"
  | "chatAppearance"
  | "terminal"
  | "advanced"
  | "manual"
  | "updates";

export interface SettingsSection {
  id: SettingsSectionId;
  icon: LucideIcon;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  /** Bu bölümün formda değiştirdiği alanlar; "değişiklik noktası" bunlardan hesaplanıyor. */
  fields: readonly (keyof AppConfig)[];
}

// Sıra spec'teki sıra. Bir alan yalnız bir bölümde durmalı; yoksa tek
// değişiklik iki bölümü birden işaretler.
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { id: "general", icon: Languages, titleKey: "settingsModal.sectionGeneral", descKey: "settingsModal.descGeneral", fields: ["language", "projectsBaseDir"] },
  { id: "appearance", icon: Palette, titleKey: "settingsModal.sectionAppearance", descKey: "settingsModal.descAppearance", fields: ["palette", "theme", "chatFontSize"] },
  { id: "axetCode", icon: Sparkles, titleKey: "settingsModal.sectionAxetCode", descKey: "settingsModal.descAxetCode", fields: ["axetWorkspaceDir"] },
  { id: "chatAppearance", icon: Type, titleKey: "settingsModal.sectionChatAppearance", descKey: "settingsModal.descChatAppearance", fields: ["chatDensity"] },
  { id: "terminal", icon: TerminalSquare, titleKey: "settingsModal.sectionTerminal", descKey: "settingsModal.descTerminal", fields: ["axetCommand", "terminal"] },
  { id: "advanced", icon: Wrench, titleKey: "settingsModal.sectionAdvanced", descKey: "settingsModal.descAdvanced", fields: ["landscapePathOverride", "sapShcutPathOverride"] },
  { id: "manual", icon: Database, titleKey: "settingsModal.sectionManual", descKey: "settingsModal.descManual", fields: [] },
  { id: "updates", icon: Download, titleKey: "settingsModal.sectionUpdates", descKey: "settingsModal.descUpdates", fields: ["autoCheckUpdates"] }
];

/** Ayarlar penceresinin düzenlediği bütün alanlar. */
export const EDITED_FIELDS: readonly (keyof AppConfig)[] = SETTINGS_SECTIONS.flatMap((s) => s.fields);

export function dirtySections(form: AppConfig | null, config: AppConfig | null): Set<SettingsSectionId> {
  const dirty = new Set<SettingsSectionId>();
  if (!form || !config) return dirty;
  for (const section of SETTINGS_SECTIONS) {
    if (section.fields.some((field) => form[field] !== config[field])) dirty.add(section.id);
  }
  return dirty;
}
```

Nesne satırları uzun; dosyadaki öteki dizilerin biçimine uy (prettier yok,
elle böl). `tests/settingsSections.test.ts`'i çalıştır, PASS gör.

- [ ] **Adım 5: `src/components/settings/SettingsNav.tsx`**

```tsx
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { useT } from "../../i18n";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "./settingsSections";

interface Props {
  value: SettingsSectionId;
  onChange: (id: SettingsSectionId) => void;
  dirty: ReadonlySet<SettingsSectionId>;
  /** Sekme id'si `${idPrefix}-tab-${id}`; hepsi tek panele (`${idPrefix}-panel`) bağlı. */
  idPrefix: string;
  /** Listenin altında sabit duran soluk metin (sürüm). */
  footer?: ReactNode;
}

// Ayarlar'ın sol sütunu. Dikey sekme listesi: yalnız seçili sekme sekme
// sırasında (roving tabindex), ok tuşları seçimi taşıyor ve uçlarda dönüyor.
export default function SettingsNav({ value, onChange, dirty, idPrefix, footer }: Props) {
  const t = useT();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (e: KeyboardEvent, index: number) => {
    const last = SETTINGS_SECTIONS.length - 1;
    const next =
      e.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    const id = SETTINGS_SECTIONS[next].id;
    onChange(id);
    refs.current[id]?.focus();
  };

  return (
    <div className="flex w-[200px] shrink-0 flex-col border-r border-line">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label={t("settingsModal.sectionsLabel")}
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2"
      >
        {SETTINGS_SECTIONS.map((section, index) => {
          const selected = section.id === value;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              ref={(el) => {
                refs.current[section.id] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${section.id}`}
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(section.id)}
              onKeyDown={(e) => move(e, index)}
              // Seçim dili kenar çubuğundakiyle aynı (ChatSidebar oturum satırı).
              className={`flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm transition-colors ${
                selected
                  ? "bg-[var(--accent-glow)] text-slate-100"
                  : "text-slate-400 hover:bg-hover/60 hover:text-slate-300"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{t(section.titleKey)}</span>
              {dirty.has(section.id) && (
                <span
                  data-dirty-dot
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--status-warning-text)]"
                />
              )}
            </button>
          );
        })}
      </div>
      {footer && <div className="shrink-0 px-4 py-3 text-2xs text-slate-500">{footer}</div>}
    </div>
  );
}
```

- [ ] **Adım 6: Testleri ve tip denetimini çalıştır**

Çalıştır: `npx vitest run tests/settingsSections.test.ts tests/settingsNav.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt; npm run -s typecheck`
Beklenen: hepsi PASS; typecheck çıktısız (en.ts'te eksik anahtar olursa
`Record<TranslationKey, string>` burada yakalıyor).

- [ ] **Adım 7: Commit**

```bash
git add src/components/settings/settingsSections.ts
git add src/components/settings/SettingsNav.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/settingsSections.test.ts
git add tests/settingsNav.test.tsx
git commit -m "Ayarlar: bolum tanimlari ve dikey bolum listesi (SettingsNav)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 8: Ayarlar penceresi iki sütuna bölünüyor; ertelenmiş Ayarlar hataları

**Dosyalar:**
- Değiştir: `src/components/SettingsModal.tsx` (bileşen gövdesi baştan; yardımcılar kısmen)
- Değiştir: `src/components/settings/settingsSections.ts` (yalnız `EDITED_FIELDS`'in üstüne yorum taşınıyor)
- Test: `tests/settingsLayout.test.tsx` (yeni)
- Test: `tests/settingsOpenForm.test.tsx`, `tests/settingsAppearance.test.tsx`, `tests/dialogMigration.test.tsx` (bölüm geçişi ekleniyor)

**Arayüzler:**
- Tüketir: Görev 1'den `Modal` `size="xl"` ve `bare` (bare gövde
  `flex min-h-0 flex-1`, dolgu ve kaydırma yok; xl yükseklik `h-[min(80vh,720px)]`).
  Görev 7'den `SETTINGS_SECTIONS`, `EDITED_FIELDS`, `dirtySections`,
  `SettingsSectionId`, `SettingsNav` (`value`, `onChange`, `dirty`, `idPrefix`, `footer`).
  `Input` (`src/ui/Field.tsx`), `Toggle` (`src/ui/Toggle.tsx`),
  `btn`/`iconBtn`/`tintBtn` (`src/ui/buttons.ts`).
- Üretir: yok (dışarıdan görünen `Props` aynı kalıyor; `App.tsx` değişmiyor).

**Kararlar:**
- **Dışa/İçe aktar kartları** `btn()`'e çevrilmiyor: ikon kutulu, açıklamalı,
  oklu gezinme kartları; RoleModal'daki seçim kartlarıyla aynı gerekçe.
- **"Şimdi Yeniden Başlat ve Kur"** dolgulu değil `tintBtn("accent","sm")`:
  pencerenin tek birincil düğmesi alttaki Kaydet.
- **Sürüm metni** Güncellemeler bölümünden bölüm listesinin altına taşınıyor (spec).
- **Otomatik denetim onay kutusu** `Toggle` oluyor: spec "aç/kapa satırları
  başlık solda, anahtar sağda" diyor.
- Formu değiştiren HER yer tek yardımcıdan geçiyor:
  `update(patch)` = `setForm((current) => (current ? { ...current, ...patch } : current))`.
  Klasör seçicinin eski kopya hatası böylece kökten kapanıyor; elle yazılan
  `setForm({ ...form, … })` kalmıyor.

- [ ] **Adım 1: Yeni davranış testlerini yaz** — `tests/settingsLayout.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Ayarlar iki sütunlu (spec §2): solda bölüm listesi, sağda yalnız seçili
// bölüm. Ertelenmiş iki hata da burada sabitleniyor: klasör seçici formun
// eski kopyasını yazmıyor, yeniden açılışın ilk karesinde eski form görünmüyor.

import { useLayoutEffect } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../app-electron/shared/types";
import SettingsModal from "../src/components/SettingsModal";
import { LanguageProvider } from "../src/i18n";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const CONFIG = {
  language: "tr",
  palette: "ntt",
  theme: "dark",
  projectsBaseDir: "C:\\projeler",
  axetWorkspaceDir: "C:\\axet",
  chatFontSize: "md",
  chatDensity: "comfortable",
  axetCommand: "axet",
  terminal: "cmd",
  landscapePathOverride: null,
  sapShcutPathOverride: null,
  autoCheckUpdates: true
} as unknown as AppConfig;

const UNSAVED = "Kaydedilmemiş değişiklik var";

// Her commit'te (yerleşim efekti, boyamadan önce) ekrandaki girdi değerlerini
// topluyor. Eski kodda form `useEffect`'te sıfırlandığı için yeniden açılışın
// ilk commit'inde eski değer burada görünüyordu.
function FrameProbe({ seen }: { seen: string[] }) {
  useLayoutEffect(() => {
    seen.push(...Array.from(document.querySelectorAll("input"), (input) => input.value));
  });
  return null;
}

function setup(pickFolder: () => Promise<string | null> = () => Promise.resolve(null)) {
  (window as unknown as { api: unknown }).api = {
    getAppVersion: vi.fn(() => Promise.resolve("1.2.3")),
    getLastUpdateStatus: vi.fn(() => Promise.resolve({ phase: "idle" })),
    onUpdateStatus: vi.fn(() => () => {}),
    validateOverridePaths: vi.fn(() => Promise.resolve({ landscape: null, sapShcut: null })),
    pickFolder: vi.fn(pickFolder),
    checkForUpdates: vi.fn(() => Promise.resolve()),
    downloadUpdate: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  };
  const seen: string[] = [];
  const ui = (open: boolean, config: AppConfig) => (
    <LanguageProvider language="tr">
      <SettingsModal
        open={open}
        onClose={() => {}}
        config={config}
        onSave={() => Promise.resolve()}
        onExportManualSystems={() => Promise.resolve()}
        onImportManualSystems={() => Promise.resolve()}
      />
      <FrameProbe seen={seen} />
    </LanguageProvider>
  );
  const view = render(ui(true, CONFIG));
  return { seen, rerender: (open: boolean, config: AppConfig) => view.rerender(ui(open, config)) };
}

const goTo = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));

describe("Ayarlar — iki sütun", () => {
  it("960px, açılışta Genel seçili, panel seçili sekmeyle adlandırılıyor", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog.style.width).toBe("960px");
    expect(screen.getByRole("tab", { name: "Genel" }).getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel", { name: "Genel" });
    expect(within(panel).getByRole("heading", { name: "Genel" })).toBeTruthy();
    expect(within(panel).getByText("Uygulama dili ve proje klasörü.")).toBeTruthy();
  });

  it("yalnız seçili bölüm görünüyor; landmark kalabalığı yok", () => {
    setup();
    expect(screen.queryByRole("group", { name: "Tema" })).toBeNull();
    goTo("Görünüm");
    expect(screen.getByRole("group", { name: "Tema" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Uygulama dili" })).toBeNull();
    expect(within(screen.getByRole("dialog")).queryAllByRole("region")).toHaveLength(0);
  });

  it("bölüm geçişi formu sıfırlamıyor; değişen bölüm işaretli kalıyor", () => {
    setup();
    goTo("Terminal");
    fireEvent.change(screen.getByDisplayValue("axet"), { target: { value: "axet-yeni" } });
    goTo("Genel");
    goTo("Terminal");
    expect(screen.getByDisplayValue("axet-yeni")).toBeTruthy();
    const terminalTab = screen.getByRole("tab", { name: "Terminal" });
    expect(terminalTab.querySelector("[data-dirty-dot]")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Genel" }).querySelector("[data-dirty-dot]")).toBeNull();
    expect(screen.getByText(UNSAVED)).toBeTruthy();
  });

  it("sürüm metni bölüm listesinin altında", async () => {
    setup();
    expect(await screen.findByText("Sürüm 1.2.3 · by tsasmaz")).toBeTruthy();
  });

  it("girdiler görünen etiketleriyle adlandırılıyor; göz at düğmesinin adı var", () => {
    setup();
    expect(screen.getByRole("textbox", { name: /Proje klasörü/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Klasör seç" })).toBeTruthy();
  });

  it("otomatik denetim bir anahtar", () => {
    setup();
    goTo("Güncellemeler");
    const toggle = screen.getByRole("switch", { name: "Uygulama açılışında otomatik kontrol et" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText(UNSAVED)).toBeTruthy();
  });
});

describe("Ayarlar — ertelenmiş hatalar", () => {
  it("klasör seçici beklerken yapılan düzenleme silinmiyor", async () => {
    let resolve!: (dir: string | null) => void;
    setup(() => new Promise((r) => (resolve = r)));
    fireEvent.click(screen.getByRole("button", { name: "Klasör seç" }));
    // Seçici açıkken dil değiştirildi.
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    await act(async () => resolve("Z:\\secilen"));
    expect(screen.getByDisplayValue("Z:\\secilen")).toBeTruthy();
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("yeniden açılışın ilk karesinde eski form yok; bölüm Genel'e dönüyor", () => {
    const { seen, rerender } = setup();
    fireEvent.change(screen.getByDisplayValue("C:\\projeler"), { target: { value: "D:\\yeni" } });
    goTo("Terminal");
    rerender(false, CONFIG);
    seen.length = 0;
    rerender(true, { ...CONFIG, projectsBaseDir: "F:\\sonra" } as AppConfig);
    expect(seen).not.toContain("D:\\yeni");
    expect(seen).toContain("F:\\sonra");
    expect(screen.getByRole("tab", { name: "Genel" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText(UNSAVED)).toBeNull();
  });
});
```

Not: `getByRole("textbox", { name: /Proje klasörü/ })` girdinin adı
`aria-labelledby` ile görünen etiketten gelirse geçer; bugünkü kodda girdi
etiketsiz.

- [ ] **Adım 2: Başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/settingsLayout.test.tsx > .superpowers/x.txt 2>&1; tail -n 40 .superpowers/x.txt`
Beklenen: neredeyse hepsi FAIL (`tab` rolü yok, genişlik 560px yerine
Görev 1'den sonra 640px, klasör seçici dili `tr`'ye geri çeviriyor, ilk
karede `D:\yeni` görülüyor).

- [ ] **Adım 3: İçe aktarmalar ve yardımcılar** — `src/components/SettingsModal.tsx`:

İlk satırdan `ReactNode`'a kadar olan içe aktarmaları şununla değiştir
(`useRef` PalettePicker'da hâlâ kullanılıyor, kalıyor; `useMemo` gidiyor):

```tsx
import { createContext, useContext, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import {
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ChevronRight,
  Terminal,
  Circle
} from "lucide-react";
import type { AppConfig, AppPalette, UpdateStatus } from "../../app-electron/shared/types";
import { PALETTES, THEME_SURFACES } from "../../app-electron/shared/themeSurfaces";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { useT } from "../i18n";
import type { TranslateFn } from "../i18n";
import { Button } from "../ui/Button";
import { Input } from "../ui/Field";
import { Toggle } from "../ui/Toggle";
import { btn, iconBtn, tintBtn } from "../ui/buttons";
import SettingsNav from "./settings/SettingsNav";
import { SETTINGS_SECTIONS, EDITED_FIELDS, dirtySections, type SettingsSectionId } from "./settings/settingsSections";
```

`function Section(...)` bloğunu (yorumu yok, `Section`'ın tamamı) SİL.

Yerel `Field`'ın etiket sınıfını ortak `Field`'la aynı yap ve hemen altına
etiketle adlandırılan girdi ekle:

```tsx
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const labelId = useId();
  return (
    <div>
      <label id={labelId} className="mb-1.5 block text-xs font-medium text-slate-300">
        {label}
      </label>
      <FieldLabelContext.Provider value={labelId}>{children}</FieldLabelContext.Provider>
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Ortak `Input`, adını üstteki `Field` başlığından alıyor. Elle çizilmiş
// girdilerin adı yoktu: ekran okuyucu yalnızca "düzenleme alanı" diyordu.
function FieldInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const labelledBy = useContext(FieldLabelContext);
  return <Input aria-labelledby={labelledBy} {...props} />;
}
```

`const inputClass = …` satırını SİL.

`renderUpdateStatus` içindeki iki düğme:

```tsx
          <button
            type="button"
            onClick={() => window.api.downloadUpdate()}
            className={tintBtn("accent", "sm")}
          >
            {t("settingsModal.download")}
          </button>
```

```tsx
          <button
            type="button"
            onClick={() => window.api.installUpdate()}
            // Soluk vurgu, dolgulu değil: pencerenin tek birincil düğmesi
            // alttaki Kaydet (bkz. buttons.ts). Sabit `bg-emerald-600` de
            // kullanılmıyor — satırın metni zaten "başarı" tonunda, düğmenin de
            // yeşil olması ikisini birbirine karıştırıyordu.
            className={tintBtn("accent", "sm")}
          >
            {t("settingsModal.restartAndInstall")}
          </button>
```

Yerel `EDITED_FIELDS` dizisini (üstündeki uzun `/** … */` yorumu dahil) SİL.
Yorumu kaybetme: `/** Bu kutunun GERÇEKTEN düzenlediği alanlar … */` bloğunu
olduğu gibi `src/components/settings/settingsSections.ts`'te
`export const EDITED_FIELDS`'in üstüne taşı, sonuna şu iki paragrafı ekle:

```ts
 *
 * Liste artık elle tutulmuyor: bölümlerin `fields` listelerinden türüyor.
 * Yeni alan, ait olduğu bölümün `fields`'ına eklenince hem kaydediliyor hem
 * o bölümün "değişti" noktasını yakıyor.
 *
 * `theme` soldaki güneş/ay düğmesiyle de değişiyor; Ayarlar açıkken o düğmeye
 * ulaşılamıyor (pencere modal), iki yazar aynı anda çalışmıyor.
 * `chatDisplayName` hiçbir bölümde yok: karşılama başlığı kalktı
 * (2026-09-29), Kaydet ona dokunmuyor.
```

`mergeIntoForm` olduğu gibi kalıyor (artık içe aktarılan `EDITED_FIELDS`'i
kullanıyor).

- [ ] **Adım 4: Açılış ve form durumu** — bileşenin başı. `const [form, setForm]`
satırından `if (!open || !form) return null;` satırına kadar olan bölümde:

`useState` satırlarının altına ekle:

```tsx
  const [section, setSection] = useState<SettingsSectionId>("general");
  const baseId = useId();
```

`wasOpenRef`/`syncedRef` efektini (üstündeki yorum dahil) şu blokla değiştir:

```tsx
  // Kutuyu her AÇILIŞTA (kapalı → açık) SIFIRLIYOR. Bileşen kapanınca `null`
  // döndürüyor ama SÖKÜLMÜYOR — state olduğu gibi duruyor. Sıfırlama olmadan,
  // kaydetmeden çıkılan bir düzenleme bir sonraki açılışta hâlâ ekranda
  // duruyordu (ve "kaydedilmemiş" uyarısını da tetiklerdi).
  //
  // Sıfırlama ÇİZİM SIRASINDA, efektte değil: efekt ilk çizimden SONRA
  // çalışıyordu ve yeniden açılışın ilk karesinde bir an eski form
  // görünüyordu. React çizim sırasındaki `setState`'i ekrana basmadan önce
  // yeniden çizerek uyguluyor.
  //
  // Açıkken gelen yeni `config` ise formu SIFIRLAMIYOR, `mergeIntoForm` ile
  // katılıyor (bkz. orada). `synced.config` formun en son eşitlendiği
  // `config`: düzenlenmiş alanı düzenlenmemişten ayırmanın ölçüsü.
  //
  // Escape ve ilk odak ortak `Modal`'da. İlk odak pencerenin kendisine
  // (`initialFocus="dialog"`): gövdenin ilk öğesi dil seçimi ve oraya inen
  // odakta Enter dili değiştiriyordu.
  const [synced, setSynced] = useState<{ open: boolean; config: AppConfig | null }>({ open: false, config: null });
  if (open !== synced.open || (open && config !== synced.config)) {
    setSynced({ open, config });
    if (open && !synced.open) {
      setForm(config);
      setSection("general");
    } else if (open && config) {
      const previous = synced.config;
      setForm((current) => (current && previous ? mergeIntoForm(current, previous, config) : config));
    }
  }
```

`isDirty` `useMemo`'sunu şununla değiştir (yorumu koru, son cümlesi
"bkz. EDITED_FIELDS" kalsın):

```tsx
  const dirty = dirtySections(form, config);
  const isDirty = dirty.size > 0;
```

`if (!open || !form) return null;`'dan SONRAKİ `pickFolder` ve
`pickAxetWorkspaceDir`'i şununla değiştir:

```tsx
  // Formu değiştiren her yer buradan geçiyor. İşlevsel güncelleme: klasör
  // seçici `await`'ten sonra yazıyor ve o arada yapılan düzenleme, formun
  // eski kopyası yayılınca sessizce siliniyordu.
  const update = (patch: Partial<AppConfig>) =>
    setForm((current) => (current ? { ...current, ...patch } : current));

  const pickFolder = async () => {
    const dir = await window.api.pickFolder();
    if (dir) update({ projectsBaseDir: dir });
  };

  const pickAxetWorkspaceDir = async () => {
    const dir = await window.api.pickFolder();
    if (dir) update({ axetWorkspaceDir: dir });
  };
```

`save` ve `handleCheckForUpdates` değişmiyor.

- [ ] **Adım 5: Gövde iki sütun** — `const updateStatusNode = …` satırından
dosyanın sonuna kadar olan bölümü şununla değiştir. Bölüm içerikleri bugünkü
`Section`'lardan taşınıyor; yorumları (bağlayıcı kipi, Hazırlık'a taşınanlar,
sohbet görünümü, axet-code duyurusu) olduğu yerde koru.

```tsx
  const updateStatusNode = renderUpdateStatus(updateStatus, t);
  const current = SETTINGS_SECTIONS.find((s) => s.id === section) ?? SETTINGS_SECTIONS[0];
  const CARD = "space-y-4 rounded-xl border border-line bg-card p-5";

  const browseButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      title={t("settingsModal.browseFolder")}
      aria-label={t("settingsModal.browseFolder")}
      className={iconBtn("neutral", "md")}
    >
      <FolderOpen size={16} />
    </button>
  );

  // Yalnız seçili bölüm çiziliyor (spec §2): uzun kaydırma yok, bölümler
  // landmark değil. Form tek; bölüm değişince düzenleme kaybolmuyor.
  const renderSection = (): ReactNode => {
    switch (section) {
      case "general":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.languageLabel")}>
              <SegmentedControl
                value={form.language}
                onChange={(language) => update({ language })}
                options={[
                  { key: "tr", label: t("settingsModal.languageTr") },
                  { key: "en", label: t("settingsModal.languageEn") }
                ]}
              />
            </Field>
            <Field label={t("settingsModal.projectsDirLabel")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <FieldInput
                    value={form.projectsBaseDir}
                    onChange={(e) => update({ projectsBaseDir: e.target.value })}
                    className="pl-9"
                  />
                </div>
                {browseButton(pickFolder)}
              </div>
            </Field>
          </div>
        );
      case "appearance":
        return (
          <div className={CARD}>
            {/* PalettePicker, tema ve yazı boyutu bugünkü Görünüm Section'ındaki
                gibi; yalnız `setForm({ ...form, x })` → `update({ x })`.
                "Sohbet görünümü"nden taşınma yorumu yazı boyutunun üstünde kalıyor. */}
          </div>
        );
      case "axetCode":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.axetWorkspaceDirLabel")}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <FieldInput
                    value={form.axetWorkspaceDir}
                    onChange={(e) => update({ axetWorkspaceDir: e.target.value })}
                    className="pl-9"
                  />
                </div>
                {browseButton(pickAxetWorkspaceDir)}
              </div>
            </Field>
            {/* Bağlayıcı kipi yorumu ve Hazırlık'a taşınanlar yorumu buraya. */}
          </div>
        );
      case "chatAppearance":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.chatDensityLabel")} hint={t("settingsModal.chatDensityHint")}>
              <SegmentedControl
                value={form.chatDensity}
                onChange={(chatDensity) => update({ chatDensity })}
                options={[
                  { key: "comfortable", label: t("settingsModal.chatDensityComfortable") },
                  { key: "compact", label: t("settingsModal.chatDensityCompact") }
                ]}
              />
            </Field>
          </div>
        );
      case "terminal":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.axetCommandLabel")}>
              <div className="relative">
                <Terminal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <FieldInput
                  value={form.axetCommand}
                  onChange={(e) => update({ axetCommand: e.target.value })}
                  className="pl-9"
                />
              </div>
            </Field>
            <Field label={t("settingsModal.shellLabel")} hint={t("settingsModal.shellHelper")}>
              <SegmentedControl
                value={form.terminal}
                onChange={(terminal) => update({ terminal })}
                options={[
                  { key: "cmd", label: t("settingsModal.shellCmd") },
                  { key: "powershell", label: t("settingsModal.shellPowershell") }
                ]}
              />
            </Field>
          </div>
        );
      case "advanced":
        return (
          <div className={CARD}>
            <Field label={t("settingsModal.landscapePathLabel")}>
              <FieldInput
                value={form.landscapePathOverride ?? ""}
                onChange={(e) => update({ landscapePathOverride: e.target.value || null })}
                placeholder="C:\Users\...\AppData\Roaming\SAP\Common\SAPUILandscape.xml"
                aria-invalid={pathCheck.landscape === false || undefined}
              />
              {pathCheck.landscape === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
            <Field label={t("settingsModal.sapShcutPathLabel")}>
              <FieldInput
                value={form.sapShcutPathOverride ?? ""}
                onChange={(e) => update({ sapShcutPathOverride: e.target.value || null })}
                placeholder="C:\Program Files (x86)\SAP\FrontEnd\SapGui\sapshcut.exe"
                aria-invalid={pathCheck.sapShcut === false || undefined}
              />
              {pathCheck.sapShcut === false && <PathMissing text={t("settingsModal.pathMissing")} />}
            </Field>
          </div>
        );
      case "manual":
        return (
          <div className={CARD}>
            {/* Yardım metni ve iki kart düğme bugünkü Manuel Section'ındaki gibi,
                değişmeden (Kararlar: kart düğmeler btn()'e çevrilmiyor).
                Her iki `<button>`'a yalnız `type="button"` ekle. */}
          </div>
        );
      case "updates":
        return (
          <div className={CARD}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-200">{t("settingsModal.autoCheckLabel")}</span>
              <Toggle
                checked={form.autoCheckUpdates}
                onChange={(autoCheckUpdates) => update({ autoCheckUpdates })}
                label={t("settingsModal.autoCheckLabel")}
              />
            </div>
            <button type="button" onClick={handleCheckForUpdates} className={btn("neutral", "md", "w-full gap-2")}>
              <RefreshCw size={14} />
              {t("settingsModal.checkNow")}
            </button>
            {updateStatusNode && (
              <div className="rounded-md border border-line/60 bg-app/30 px-3 py-2">{updateStatusNode}</div>
            )}
            {/* axet-code'un kendi güncelleme duyurusu yorumu buraya. */}
          </div>
        );
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      dirty={isDirty}
      initialFocus="dialog"
      title={t("settingsModal.title")}
      subtitle={t("settingsModal.subtitle")}
      icon={<SlidersHorizontal size={18} />}
      size="xl"
      bare
      footer={
        <>
          {isDirty && (
            <span className="mr-auto flex items-center gap-1.5 text-xs text-[var(--status-warning-text)]">
              <Circle size={6} className="fill-current" />
              {t("settingsModal.unsavedBadge")}
            </span>
          )}
          <ModalCancelButton />
          <Button variant="primary" onClick={() => void save()}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <SettingsNav
        value={section}
        onChange={setSection}
        dirty={dirty}
        idPrefix={baseId}
        footer={t("settingsModal.versionText", { version: appVersion || "…" })}
      />
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${section}`}
        className="min-h-0 flex-1 overflow-y-auto p-6"
      >
        <h3 className="text-base font-semibold text-white">{t(current.titleKey)}</h3>
        <p className="mt-1 text-sm text-slate-400">{t(current.descKey)}</p>
        <div className="mt-5 space-y-4">{renderSection()}</div>
      </div>
    </Modal>
  );
}
```

Üç yorum kutusu (`appearance`, `manual`, ve `axetCode`/`updates`'teki yorum
yerleri) yer tutucu DEĞİL, taşıma talimatı: bugünkü dosyadaki ilgili
`Section`'ın içeriği oraya BİREBİR kopyalanıyor, `setForm({ ...form, x: v })`
→ `update({ x: v })` dışında değişiklik yok. Görünüm'de:

```tsx
            <Field label={t("settingsModal.paletteLabel")}>
              <PalettePicker
                value={form.palette}
                label={t("settingsModal.paletteLabel")}
                names={{
                  ntt: { name: t("settingsModal.paletteNtt"), description: t("settingsModal.paletteNttDesc") },
                  indigo: { name: t("settingsModal.paletteIndigo"), description: t("settingsModal.paletteIndigoDesc") },
                  amber: { name: t("settingsModal.paletteAmber"), description: t("settingsModal.paletteAmberDesc") }
                }}
                onChange={(palette) => update({ palette })}
              />
            </Field>
            <Field label={t("settingsModal.themeLabel")}>
              <SegmentedControl
                value={form.theme}
                onChange={(theme) => update({ theme })}
                options={[
                  { key: "dark", label: t("settingsModal.themeDark") },
                  { key: "light", label: t("settingsModal.themeLight") }
                ]}
              />
            </Field>
            {/* "Sohbet görünümü"nden buraya taşındı (spec §7): yazı boyutu
                okuma konforu, yani görünüm ayarı. İpucu kapsamını söylüyor —
                uygulamanın geri kalanı bu ayarla büyümüyor. */}
            <Field label={t("settingsModal.chatFontSizeLabel")} hint={t("settingsModal.chatFontSizeHint")}>
              <SegmentedControl
                value={form.chatFontSize}
                onChange={(chatFontSize) => update({ chatFontSize })}
                options={[
                  { key: "sm", label: t("settingsModal.chatFontSizeSm") },
                  { key: "md", label: t("settingsModal.chatFontSizeMd") },
                  { key: "lg", label: t("settingsModal.chatFontSizeLg") }
                ]}
              />
            </Field>
```

Bitince dosyada `setForm({ ...form` ARANDIĞINDA sonuç çıkmamalı:
`grep -n "setForm({ ...form" src/components/SettingsModal.tsx` → boş.

- [ ] **Adım 6: Yeni testleri çalıştır**

Çalıştır: `npx vitest run tests/settingsLayout.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt`
Beklenen: 8/8 PASS.

- [ ] **Adım 7: Eski Ayarlar testlerini yeni düzene uydur**

Üç dosyada da en üste (içe aktarmaların altına) yardımcıyı ekle:

```tsx
const goTo = (name: string) => fireEvent.click(screen.getByRole("tab", { name }));
```

Sekme adları: "Genel", "Görünüm", "axet.code", "Sohbet görünümü",
"Terminal", "Gelişmiş Yollar", "Manuel Sistemler", "Güncellemeler"
(`settingsModal.section*` metinleri; emin değilsen
`grep -n '"settingsModal.section' src/i18n/tr.ts`).

`tests/settingsOpenForm.test.tsx`:
- Başka bölümdeki alana (`D:\\baska` axetCode'da, `axet2` Terminal'de)
  bakmadan önce `goTo("axet.code")` / `goTo("Terminal")`; Genel'deki
  `projectsInput()`'a dönmeden önce `goTo("Genel")`.
- "güncelleme kontrolü" testinde düğmeye basmadan önce `goTo("Güncellemeler")`,
  sonra `goTo("Genel")`. Onay kutusu yerine anahtar:
  `getByRole("switch", { name: "Uygulama açılışında otomatik kontrol et" })`.
- "ilk odak" testi: Enter adımını ve ardından gelen dil doğrulamasını SİL;
  yalnız şu kalsın:

```tsx
    const dialog = screen.getByRole("dialog");
    expect(document.activeElement).toBe(dialog);
```

- Gruplar testi: her grubu kendi bölümünde ara (`goTo` + `getByRole("group", …)`).

`tests/settingsAppearance.test.tsx`:
- `getByRole("region", { name: "Görünüm" })` → `goTo("Görünüm")` +
  `getByRole("tabpanel", { name: "Görünüm" })`; "Sohbet görünümü" için aynısı.
- Palet/tema/yazı boyutu testlerinin başına `goTo("Görünüm")`.
- "karşılama" testi (alan hiçbir yerde yok): sekmelerin hepsini gez ve her
  birinde yokluğunu doğrula:

```tsx
    for (const tab of screen.getAllByRole("tab")) {
      fireEvent.click(tab);
      expect(document.body.textContent ?? "").not.toMatch(/karşılama/i);
    }
```

`tests/dialogMigration.test.tsx` (SettingsModal `describe`'ı):
- `getByDisplayValue("axet")`'ten önce `goTo("Terminal")`.

Her değişiklikten sonra davranışı DEĞİŞTİRME, yalnız gezinme ekle; bir test
gezinmeyle de geçmiyorsa dur ve nedenini ölç.

- [ ] **Adım 8: Ayarlar testlerinin hepsi**

Çalıştır: `npx vitest run tests/settingsLayout.test.tsx tests/settingsOpenForm.test.tsx tests/settingsAppearance.test.tsx tests/settingsSections.test.ts tests/settingsNav.test.tsx tests/dialogMigration.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt`
Beklenen: hepsi PASS.

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok.

- [ ] **Adım 9: Commit**

```bash
git add src/components/SettingsModal.tsx
git add src/components/settings/settingsSections.ts
git add tests/settingsLayout.test.tsx
git add tests/settingsOpenForm.test.tsx
git add tests/settingsAppearance.test.tsx
git add tests/dialogMigration.test.tsx
git commit -m "Ayarlar: iki sutunlu bolumlu duzen, ilk kare ve klasor secici duzeltmesi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 9: Kaynak kuralları genişliyor, tam takım

**Dosyalar:**
- Test: `tests/dialogMigration.test.tsx` ("taşınan dosyalar" `describe`'ı)

**Arayüzler:**
- Tüketir: Görev 1–8'in hepsi (taşınan üç pencere, `width` özelliğinin kalkması).
- Üretir: yok.

- [ ] **Adım 1: Kuralı genişlet** — `describe("taşınan dosyalar", …)` bloğunu
şununla değiştir:

```tsx
describe("taşınan dosyalar", () => {
  const ROOT = path.join(__dirname, "..", "src");
  const FILES = [
    "components/ConfirmDialog.tsx",
    "components/ChatInstructionsDialog.tsx",
    "components/ChatProjectDialog.tsx",
    "components/AddSystemModal.tsx",
    "components/SettingsModal.tsx",
    "components/CredentialsModal.tsx",
    "components/CertTrustDialog.tsx",
    "components/TierPromptModal.tsx",
    "components/RoleModal.tsx",
    // Bu turda ortak Modal'a taşınanlar (spec §3).
    "components/AppConnectionsModal.tsx",
    "components/GlobalSkillsModal.tsx",
    "components/UpdatePromptModal.tsx",
    "terminal/NewPaneDialog.tsx"
  ];

  it("kendi arka planını, katmanını ve px yazı boyunu taşımıyor", () => {
    for (const file of FILES) {
      const src = readFileSync(path.join(ROOT, file), "utf8");
      expect(src, file).not.toMatch(/text-\[[0-9.]+px\]/);
      expect(src, file).not.toMatch(/fixed inset-0/);
      expect(src, file).not.toMatch(/z-\[\d+\]/);
      expect(src, file).not.toMatch(/import ConfirmDialog/);
    }
  });

  // Boy `size` ölçeğinden geliyor (sm/md/lg/xl); elle piksel genişlik,
  // pencereleri yeniden birbirinden farklı boylara dağıtırdı.
  it("genişliği elle vermiyor", () => {
    for (const file of FILES) {
      const src = readFileSync(path.join(ROOT, file), "utf8");
      expect(src, file).not.toMatch(/\swidth=\{/);
    }
  });
});
```

- [ ] **Adım 2: Çalıştır**

Çalıştır: `npx vitest run tests/dialogMigration.test.tsx > .superpowers/x.txt 2>&1; tail -n 30 .superpowers/x.txt`
Beklenen: PASS. Görev 1–4 tamamsa kural kendiliğinden geçiyor; bu test
yeni davranış değil, geri kaymaya karşı kilit. FAIL ederse hangi dosyanın
hangi kuralı bozduğu mesajda yazıyor (`expect(src, file)`): o dosyanın
görevine dön, kuralı gevşetme.

- [ ] **Adım 3: Tam takım ve tip denetimi**

Çalıştır: `npx vitest run > .superpowers/x.txt 2>&1; tail -n 40 .superpowers/x.txt`
Beklenen: hepsi PASS. Bilinen kararsız testler: `scriptBehaviour` ve
`scriptStore` ara sıra zaman aşımıyla düşüyor (bu turdan önce de). Biri
düşerse yalnız onu tek başına yeniden çalıştır; tek başına geçiyorsa not
düş, bu turun hatası sayma. Başka bir test düşerse dur ve ölç.

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok.

- [ ] **Adım 4: Commit**

```bash
git add tests/dialogMigration.test.tsx
git commit -m "Pencereler: kaynak kurali testleri genisletildi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Adım 5: Görsel doğrulama kullanıcıda** — ekran görüntüsü alma.
Kullanıcıya açık `npm run dev` penceresinde bakmasını söyle: Ayarlar
(sekiz bölüm, nokta, sürüm metni), Uygulama Bağlantıları, Yetenekler,
güncelleme sorusu.

