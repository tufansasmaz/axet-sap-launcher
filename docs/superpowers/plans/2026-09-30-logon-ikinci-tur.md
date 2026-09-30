# Logon ikinci tur — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Logon ekranında sağ paneli iki sütunlu kartlı düzene geçirmek. Kenar çubuğunu, yapısını değiştirmeden, sohbet kenar çubuğunun görünümüne getirmek.

**Mimari:**
- Sağ panel (`SystemPanel`) başlık + ızgara düzenine geçiyor. Izgara, sütun sayısını kabın kendi genişliğine göre `auto-fit` ile seçiyor.
- Kenar çubuğunda satırlar sadeleşiyor. Üst şerit sohbetle aynı ölçüye geçiyor. Ağacın üstüne "Müşteriler" başlığı ekleniyor.
- Açılır-kapanır başlık ve kalıcı daraltma durumu tek bir yerde (`src/ui/SectionToggle.tsx`) toplanıyor. "Son Bağlanılanlar" ve "Müşteriler" ikisi de onu kullanıyor.

**Teknoloji:** React 18, TypeScript, Tailwind (Grafit jetonları), vitest 2 + jsdom + @testing-library/react (jest-dom yok).

**Spec:** `docs/superpowers/specs/2026-09-30-logon-ikinci-tur-design.md`

## Global Kısıtlar

- Dal `tasarim/grafit`. Push/merge yok.
- Kaynak dosyalar CRLF: düzenleme Edit aracıyla yapılır, `sed -i` kullanılmaz. Yeni dosyalar LF olabilir. prettier çalıştırılmaz.
- `git add` dosya dosya yapılır, `-A` kullanılmaz.
- Commit mesajı ASCII Türkçe olur ve `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ile biter. Kod yorumları tam Türkçe harflerle yazılır.
- Yeni renk/jeton eklenmez. Lime (`accent`) yalnızca liste seçimi ve tek birincil düğme için kullanılır.
- `SystemPanel.tsx`, `SystemHeader.tsx`, `SystemInfoList.tsx` ve `SystemNotes.tsx` içinde `text-[Npx]` yazılmaz. Dosya kuralı testi bunu yakalıyor.
- `npm run dev` yeniden başlatılmaz. `resources/rfc-runtime` ve `resources/guiscript-runtime` asla eklenmez.
- Her görevden önce `npm run -s typecheck` temiz olmalı.
- Test komutu `npx vitest run <dosya>`. Çıktı uzunsa `> .superpowers/x.txt 2>&1` ile dosyaya alınıp sonu okunur.

## İnceleme Odağı

Hiçbir görevin testlerinin doğrudan yoklamadığı ama kullanıcıyı en çok ısırabilecek durumlar:

1. **Dar pencere (kenar çubuğu açık, ~1100px pencere):** Izgara tek sütuna düşmeli, yatay kaydırma çıkmamalı. `minmax(min(100%,480px),1fr)` bunu sağlıyor. Görev 1'deki test sınıfı sabitliyor.
2. **Çok uzun not:** Metin alanı 420px'te kendi kaydırmasına geçmeli (bugünkü `useSystemComment` davranışı). Kart yan sütunu gereksiz uzatmamalı. `grow shrink-0` yalnızca büyütüyor, kod bunu değiştirmiyor.
3. **Müşteriler kapalıyken arama:** Sonuçlar görünmeli. Görev 3'teki test bunu yokluyor.
4. **Müşteriler kapalıyken klavye:** Ağaç `hidden` sınıfıyla gizli olduğu için Tab ona odaklanmamalı. `display:none` odaklanamaz, yani ek iş gerekmiyor.
5. **Hiç sistem yokken:** "Müşteriler 0" ve altında "Eşleşen müşteri/sistem bulunamadı." yazısı görünür. Kabul edilebilir, dokunulmuyor.

---

### Görev 1: Sağ panel iki sütun ve kartlar

**Dosyalar:**
- Değiştir: `src/components/SystemPanel.tsx` (seçili durumun `return`'ü, ~97-124. satırlar; importlar)
- Değiştir: `src/components/SystemNotes.tsx` (kök `section`, not kutusu `div`, `textarea` sınıfları)
- Test: `tests/systemPanel.test.tsx` (dosyanın sonuna yeni `describe`)

**Arayüzler:**
- Tüketir: `PANEL_TITLE` (`src/ui/buttons.ts`), i18n anahtarı `systemPanel.detailsHeading` ("Bağlantı Bilgileri"). Anahtar zaten var ve bugün hiçbir yerde kullanılmıyor.
- Üretir: yok (görsel değişiklik).

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/systemPanel.test.tsx` dosyasının EN SONUNA ekle:

```tsx
describe("SystemPanel — iki sütun (ikinci tur)", () => {
  it("bağlantı bilgileri ve notlar ayrı kartlarda, ikisi aynı ızgarada", async () => {
    renderPanel();
    await notesReady();
    const infoCard = screen.getByRole("heading", { name: "Bağlantı Bilgileri" }).closest("[data-panel-card]");
    const notesCard = screen.getByRole("textbox").closest("[data-panel-card]");
    expect(infoCard).not.toBeNull();
    expect(notesCard).not.toBeNull();
    expect(infoCard).not.toBe(notesCard);
    for (const card of [infoCard!, notesCard!]) {
      for (const cls of ["bg-card", "border", "border-line", "rounded-xl"]) {
        expect(card.classList.contains(cls)).toBe(true);
      }
    }
    const grid = infoCard!.parentElement!;
    expect(notesCard!.parentElement).toBe(grid);
    expect(grid.classList.contains("grid")).toBe(true);
    // Sütun sayısını pencere değil kabın kendi genişliği belirliyor.
    expect(grid.className).toContain("minmax(min(100%,480px),1fr)");
  });

  it("başlık kartların dışında, üstte", async () => {
    renderPanel();
    await notesReady();
    const title = screen.getByRole("heading", { name: "D01 Geliştirme" });
    expect(title.closest("[data-panel-card]")).toBeNull();
  });

  it("not alanı yan yana düzende kartını dolduruyor", async () => {
    renderPanel();
    const box = await notesReady();
    expect(box.classList.contains("grow")).toBe(true);
    expect(box.classList.contains("shrink-0")).toBe(true);
    expect(box.parentElement!.classList.contains("flex-1")).toBe(true);
    expect(box.closest("section")!.classList.contains("flex-1")).toBe(true);
  });

  it("720px'lik dar sütun sınırı kalktı", () => {
    const src = readFileSync("src/components/SystemPanel.tsx", "utf8");
    expect(src).not.toContain("max-w-[720px]");
    expect(src).toContain("max-w-[1280px]");
  });
});
```

- [ ] **Adım 2: Testlerin kırıldığını gör**

Çalıştır: `npx vitest run tests/systemPanel.test.tsx`
Beklenen: Yeni dört testten dördü de FAIL.
- İlki: "Bağlantı Bilgileri" başlığı bulunamıyor.
- İkincisi: `getByRole("heading", { name: "D01 Geliştirme" })` bulunur ama `closest` zaten `null` döner. Bu test bugün de GEÇEBİLİR. Bu bir koruma testi, beklenen budur; not al.
- Üçüncüsü: `grow` sınıfı yok.
- Dördüncüsü: `max-w-[720px]` var.

Diğer bütün testler geçiyor.

- [ ] **Adım 3: `SystemPanel.tsx`'i değiştir**

Import satırlarına ekle (`import { useT } from "../i18n";` satırının altına):

```tsx
import { PANEL_TITLE } from "../ui/buttons";

// Sağ panelin kartı. Zemin `bg-app` yalnızca kartların arasında ve çevresinde
// ince bir boşluk olarak görünüyor; eskiden dar sütunun iki yanı boş ve
// simsiyah kalıyordu (kullanıcı, 2026-09-30).
const PANEL_CARD = "flex flex-col gap-3 rounded-xl border border-line bg-card p-5";
```

Seçili durumun `return`'ünü (şu an `<div className="h-full overflow-y-auto">` ile başlayan blok) şununla değiştir:

```tsx
  return (
    <div className="h-full overflow-y-auto">
      <div
        key={selection.itemUuid}
        className="animate-panel-fade-in mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-8 py-8"
      >
        <SystemHeader
          path={path}
          service={service}
          state={state}
          tier={tier}
          lastConnectedAt={lastConnectedAt}
          onCheck={() => onCheck(service)}
          onConnect={() => onConnect(selection)}
          onOpenSapLogon={() => onOpenSapLogon(service)}
          onEditManual={() => onEditManual(service)}
          onDeleteManual={() => onDeleteManual(service)}
        />
        {/* İki sütun, ama eşik pencerenin değil kabın genişliği: kenar
            çubuğu ve dosya sekmeleri alanı daraltıyor. Kap ~980px'in altına
            inince `auto-fit` tek sütuna düşüyor; `min(100%,…)` dar kapta
            yatay taşmayı önlüyor. */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,480px),1fr))] gap-5">
          <section data-panel-card className={PANEL_CARD}>
            <h3 className={PANEL_TITLE}>{t("systemPanel.detailsHeading")}</h3>
            <SystemInfoList
              service={service}
              tier={tier}
              explicitTier={explicitTier}
              onSetTier={(next) => onSetTier(service, next)}
            />
          </section>
          <div data-panel-card className={PANEL_CARD}>
            <SystemNotes note={note} />
          </div>
        </div>
      </div>
    </div>
  );
```

- [ ] **Adım 4: `SystemNotes.tsx`'i değiştir**

Üç sınıf değişikliği:

1. `<section className="flex flex-col gap-2">` şuna dönüşüyor:
   `<section className="flex flex-1 flex-col gap-2">`
2. `<div className="rounded-lg border border-line bg-card focus-within:border-line-strong">` şuna dönüşüyor:
   `<div className="flex flex-1 flex-col rounded-lg border border-line bg-card focus-within:border-line-strong">`
3. `textarea`'nın `className`'inin başındaki `block w-full` şuna dönüşüyor: `block w-full grow shrink-0`. Satırın geri kalanı aynı kalıyor.

`textarea`'nın hemen üstüne şu yorumu ekle:

```tsx
        {/* Yükseklik `useSystemComment`'te içeriğe göre 140–420px arası
            ayarlanıyor; `grow` yan yana düzende kartın kalanını dolduruyor,
            `shrink-0` ayarlanan yüksekliğin altına inmesini engelliyor. */}
```

- [ ] **Adım 5: Testlerin geçtiğini gör**

Çalıştır: `npx vitest run tests/systemPanel.test.tsx`
Beklenen: Hepsi PASS. "not düzenlenirken de ekranda tek birincil düğme var" testi de yeni düzende geçiyor.

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok (temiz).

- [ ] **Adım 6: Commit**

```bash
git add src/components/SystemPanel.tsx
git add src/components/SystemNotes.tsx
git add tests/systemPanel.test.tsx
git commit -m "Logon: sag panel iki sutunlu kartli duzene gecti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 2: Kenar çubuğu satırları sadeleşiyor

**Dosyalar:**
- Değiştir: `src/components/Tree.tsx` (klasör ve sistem satırı, ~131-195. satırlar; `Server` importu)
- Değiştir: `src/components/RecentSystems.tsx` (satır, ~86-106. satırlar; `Server` importu)
- Test: `tests/logonSidebar.test.tsx` (`describe("LogonSidebar"...)` bloğunun içine, sonuna)

**Arayüzler:**
- Tüketir: `StatusDot` (değişmiyor).
- Üretir: Satırlarda `data-status-slot` işaretli durum yuvası. Görev 3 buna dokunmuyor.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/logonSidebar.test.tsx` başındaki importu değiştir: `cleanup, fireEvent, render, screen` → `cleanup, fireEvent, render, screen, within`.

`describe("LogonSidebar", ...)` bloğunun kapanışından hemen önce ekle:

```tsx
  it("sistem satırında sunucu simgesi yok; durum noktası addan önce, SID en sonda", () => {
    renderSidebar();
    for (const row of screen.getAllByRole("button", { name: /S4D Geliştirme/ })) {
      expect(row.querySelector(".lucide-server")).toBeNull();
      const slot = row.querySelector("[data-status-slot]");
      expect(slot).not.toBeNull();
      const name = within(row).getByText("S4D Geliştirme");
      expect(slot!.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(row.lastElementChild!.textContent).toBe("S4D");
    }
  });

  it("klasör simgesi gri, alt seviye girintisi 12px", () => {
    renderSidebar();
    const folder = screen.getByRole("button", { name: "Test Müşteri" });
    expect(folder.querySelector(".lucide-folder")!.classList.contains("text-slate-500")).toBe(true);
    // İlk satır son bağlanılanlar, ikincisi ağaç: 1 seviye × 12 + 8.
    const treeRow = screen.getAllByRole("button", { name: /S4D Geliştirme/ })[1];
    expect(treeRow.style.paddingLeft).toBe("20px");
  });
```

- [ ] **Adım 2: Testlerin kırıldığını gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx`
Beklenen: iki yeni test FAIL. `.lucide-server` bulunuyor; klasör simgesinde `text-slate-500` yok ve girinti `22px`.

- [ ] **Adım 3: `Tree.tsx`'i değiştir**

Import: `import { ChevronRight, ChevronDown, Folder, Server } from "lucide-react";` → `import { ChevronRight, ChevronDown, Folder } from "lucide-react";`

Dosyanın üstüne, `type FlatRow` tanımının altına ekle:

```tsx
// Seviye başına girinti. 14px'ti; durum noktası satırın başına gelince
// derin müşteri ağaçlarında ad fazla sağa kayıyordu.
const INDENT = 12;
```

Klasör düğmesinde:
- `style={{ paddingLeft: `${depth * 14 + 8}px` }}` şuna dönüşüyor: `style={{ paddingLeft: `${depth * INDENT + 8}px` }}`
- `<Folder size={14} className="text-[var(--folder-icon)]" />` şuna dönüşüyor: `<Folder size={14} className="shrink-0 text-slate-500" />`

Sistem satırında `style` ve düğmenin içi şöyle oluyor. `className` ve öncesi aynı kalıyor:

```tsx
                style={{ paddingLeft: `${(depth + 1) * INDENT + 8}px` }}
              >
                {isSelected && <ActiveLine />}
                {/* Durum en başta, sabit genişlikte: noktalar alt alta hizalı,
                    ad hep aynı yerden başlıyor. Sunucu simgesi kalktı —
                    her satırda aynı olduğu için bilgi taşımıyordu. */}
                <span data-status-slot className="flex w-2.5 shrink-0 justify-center">
                  <StatusDot state={state} />
                </span>
                <span className="min-w-0 flex-1 truncate">{service.name}</span>
                {tier && <TierBadge tier={tier} />}
                {/* lang="en": SID teknik bir kimlik, Türkçe büyütme kuralına tabi değil. */}
                <span lang="en" className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                  {service.systemId}
                </span>
              </button>
```

Eski sondaki `<StatusDot state={state} />` satırı ve `ml-auto` kalkıyor.

- [ ] **Adım 4: `RecentSystems.tsx`'i değiştir**

Import: `import { ChevronDown, ChevronRight, Server } from "lucide-react";` → `import { ChevronDown, ChevronRight } from "lucide-react";`

Satır düğmesinin içi (`{isSelected && <ActiveLine />}`'dan `</button>`'a kadar) şuna dönüşüyor:

```tsx
              {isSelected && <ActiveLine />}
              {/* Ağaçla aynı satır: durum başta, sunucu simgesi yok. */}
              <span data-status-slot className="flex w-2.5 shrink-0 justify-center">
                <StatusDot state={state} />
              </span>
              <span className="min-w-0 flex-1 truncate">{entry.service.name}</span>
              {tier && <TierBadge tier={tier} />}
              {/* lang="en": SID teknik bir kimlik, Türkçe değil — küçük harfli
                  kaydedilmiş bir SID Türkçe büyütme kuralıyla bozulurdu. */}
              <span lang="en" className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                {entry.service.systemId}
              </span>
            </button>
```

- [ ] **Adım 5: Testlerin geçtiğini gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx`
Beklenen: hepsi PASS. Eski "satır ölçüsü ve seçim dili" testi de geçiyor.

Çalıştır: `npm run -s typecheck`
Beklenen: temiz.

- [ ] **Adım 6: Commit**

```bash
git add src/components/Tree.tsx
git add src/components/RecentSystems.tsx
git add tests/logonSidebar.test.tsx
git commit -m "Logon: kenar cubugu satirlari sadelesti, durum noktasi basa geldi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: Üst şerit, liste boşluğu ve "Müşteriler" başlığı

**Dosyalar:**
- Oluştur: `src/ui/SectionToggle.tsx`
- Değiştir: `src/components/RecentSystems.tsx` (başlık ve daraltma durumu `SectionToggle`/`usePersistentCollapse`'a geçiyor)
- Değiştir: `src/components/Tree.tsx` (`countVisibleServices` dışa açılıyor)
- Değiştir: `src/components/LogonSidebar.tsx` (üst şerit, geçiş düğmeleri, liste kabı, Müşteriler bölümü)
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` (`logonSidebar.customers`)
- Test: `tests/logonSidebar.test.tsx`

**Arayüzler:**
- Üretir:
  - `usePersistentCollapse(key: string): [collapsed: boolean, toggle: () => void]`
  - `SectionToggle({ label: string; count: number; collapsed: boolean; onToggle: () => void })`. İkisi de `src/ui/SectionToggle.tsx` içinde.
  - `countVisibleServices(nodes: SapNode[], search: string): number` (`src/components/Tree.tsx`, named export)
- Tüketir: Görev 2'nin satır yapısı (dokunulmuyor).

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/logonSidebar.test.tsx`:

(a) Importlara ekle:

```tsx
import { countVisibleServices } from "../src/components/Tree";
```

(b) Dosyanın başındaki `afterEach` içine, `cleanup();` satırının altına ekle:

```tsx
  // Bölümlerin açık/kapalı hâli localStorage'da; testler birbirine sızmasın.
  localStorage.clear();
```

(c) Dosyanın EN SONUNA ekle:

```tsx
describe("LogonSidebar üst şerit ve Müşteriler bölümü", () => {
  it("arama şeridi Sohbet'le aynı yükseklikte ve yan boşlukta", () => {
    renderSidebar();
    const strip = searchBox().closest("[data-sidebar-header]")!;
    expect(strip).not.toBeNull();
    for (const cls of ["h-[54px]", "shrink-0", "px-2.5"]) {
      expect(strip.classList.contains(cls)).toBe(true);
    }
  });

  it("Sistemler/Dosyalar geçişi çerçeveli kutuda değil", () => {
    renderSidebar({ files: FILES });
    const systems = screen.getByRole("button", { name: "Sistem listesi" });
    expect(systems.parentElement!.classList.contains("border")).toBe(false);
    expect(systems.classList.contains("bg-active")).toBe(true);
    expect(systems.className).not.toContain("accent");
  });

  it("Müşteriler başlığı sistem sayısını gösteriyor; kapatınca ağaç gizleniyor ve bu hatırlanıyor", () => {
    renderSidebar();
    const label = screen.getByText("Müşteriler");
    expect(label.nextElementSibling?.textContent).toBe("1");
    const header = label.closest("button")!;
    expect(header.getAttribute("aria-expanded")).toBe("true");
    const folder = screen.getByRole("button", { name: "Test Müşteri" });
    expect(folder.closest(".hidden")).toBeNull();

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: "Test Müşteri" }).closest(".hidden")).not.toBeNull();
    expect(localStorage.getItem("axet.customerTree.collapsed")).toBe("1");

    cleanup();
    renderSidebar();
    expect(screen.getByText("Müşteriler").closest("button")!.getAttribute("aria-expanded")).toBe("false");
  });

  it("Müşteriler kapalıyken arama yapılınca sonuçlar yine görünüyor", () => {
    localStorage.setItem("axet.customerTree.collapsed", "1");
    renderSidebar({ search: "s4d" });
    const row = screen.getByRole("button", { name: /S4D Geliştirme/ });
    expect(row.closest(".hidden")).toBeNull();
    expect(screen.getByText("Müşteriler").nextElementSibling?.textContent).toBe("1");
  });

  it("Son Bağlanılanlar da aynı başlık bileşenini kullanıyor", () => {
    renderSidebar();
    const recent = screen.getByText("Son Bağlanılanlar").closest("button")!;
    const customers = screen.getByText("Müşteriler").closest("button")!;
    expect(recent.className).toBe(customers.className);
  });
});

describe("countVisibleServices", () => {
  const svc = (uuid: string, name: string, systemId: string): SapService => ({ ...SERVICE, uuid, name, systemId });
  const NODES: SapNode[] = [
    {
      uuid: "a",
      name: "Müşteri A",
      nodes: [{ uuid: "a1", name: "Alt Grup", nodes: [], items: [{ uuid: "i2", service: svc("s2", "D02 Geliştirme", "D02") }] }],
      items: [{ uuid: "i1", service: svc("s1", "D01 Geliştirme", "D01") }]
    },
    { uuid: "b", name: "Müşteri B", nodes: [], items: [{ uuid: "i3", service: svc("s3", "Q01 Kalite", "Q01") }] }
  ];

  it("arama yokken iç içe klasörler dahil bütün sistemleri sayıyor", () => {
    expect(countVisibleServices(NODES, "")).toBe(3);
  });

  it("aramada yalnızca eşleşenleri sayıyor", () => {
    expect(countVisibleServices(NODES, "q01")).toBe(1);
    expect(countVisibleServices(NODES, "zzz")).toBe(0);
  });

  it("müşteri adı eşleşince o müşterinin doğrudan sistemleri sayılıyor", () => {
    // Ağaç da böyle çiziyor: klasör adı eşleşirse doğrudan öğeleri görünür,
    // alt klasörler ise ancak kendileri eşleşirse.
    expect(countVisibleServices(NODES, "müşteri b")).toBe(1);
  });
});
```

- [ ] **Adım 2: Testlerin kırıldığını gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx`
Beklenen:
- Dosya derleme hatasıyla FAIL: `countVisibleServices` yok. vitest'te import `undefined` gelir ve `countVisibleServices` testleri "is not a function" ile düşer.
- Şerit testi `data-sidebar-header` bulamıyor.
- Geçiş testi `border` görüyor.
- "Müşteriler" testleri metni bulamıyor.
- "aynı başlık bileşeni" testi de "Müşteriler"i bulamıyor.

Görev 2'nin testleri ve eski testler geçmeye devam ediyor.

- [ ] **Adım 3: `src/ui/SectionToggle.tsx` dosyasını oluştur**

```tsx
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useT } from "../i18n";
import { Eyebrow } from "./Eyebrow";

// Kenar çubuğu bölümlerinin açık/kapalı hâli. Diskte DEĞİL localStorage'da:
// SAP Launcher ekranı sekme değişince tamamen unmount oluyor (bkz. App.tsx'teki
// koşullu render), yani bileşen state'i her dönüşte sıfırlanır ve kullanıcı
// listeyi her seferinde yeniden kapatmak zorunda kalırdı. Bu bir uygulama
// ayarı değil, tek bir listenin açık/kapalı hâli; AppConfig'e girmiyor.
export function usePersistentCollapse(key: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      // localStorage yoksa açık başla.
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Yazılamıyorsa sessizce geç: daraltma bu oturumda yine çalışıyor.
      }
      return next;
    });
  };

  return [collapsed, toggle];
}

// Açılır-kapanır bölüm başlığı: ok + `Eyebrow` + sayı, Sohbet'in grup
// başlıklarıyla aynı (grafit spec §6.5). Ok CSS döndürmesiyle değil AYRI
// İKONLA. Sayı kapalıyken de duruyor: kaç satırın saklandığını görmek açıp
// bakma ihtiyacını çoğu zaman ortadan kaldırıyor. Eskiden saat ikonu ve sayı
// rozeti de vardı; 220px kenar çubuğunda başlık onlarla iki satıra
// kırılıyordu (ölçüldü, 2026-09-29).
export function SectionToggle({
  label,
  count,
  collapsed,
  onToggle
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      title={collapsed ? t("recentSystems.expand") : t("recentSystems.collapse")}
      aria-expanded={!collapsed}
      className="group mb-1.5 flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-left text-slate-400 transition hover:text-slate-200"
    >
      {collapsed ? <ChevronRight size={12} className="shrink-0" /> : <ChevronDown size={12} className="shrink-0" />}
      <Eyebrow as="span" count={count} className="min-w-0 flex-1 group-hover:text-slate-200">
        {label}
      </Eyebrow>
    </button>
  );
}
```

- [ ] **Adım 4: `RecentSystems.tsx`'i `SectionToggle`'a geçir**

- Importlar:
  - `import { useState } from "react";` satırı siliniyor.
  - `import { ChevronDown, ChevronRight } from "lucide-react";` satırı siliniyor.
  - `import { Eyebrow } from "../ui/Eyebrow";` satırı şuna dönüşüyor: `import { SectionToggle, usePersistentCollapse } from "../ui/SectionToggle";`
- `COLLAPSE_KEY` sabiti ve üstündeki yorum aynı kalıyor. Yorumun ilk satırını şuna çevir: `// Daraltma tercihinin anahtarı; neden localStorage, bkz. usePersistentCollapse.`. Kalan yorum satırlarını sil.
- Bileşenin içindeki `const [collapsed, setCollapsed] = useState...` ve `const toggle = ...` blokları (~35-54. satırlar) şu tek satıra dönüşüyor:

```tsx
  const [collapsed, toggle] = usePersistentCollapse(COLLAPSE_KEY);
```

- Başlık yorumu ve `<button ...>…</button>` başlık bloğu (~60-79. satırlar) şuna dönüşüyor:

```tsx
      <SectionToggle
        label={t("recentSystems.heading")}
        count={entries.length}
        collapsed={collapsed}
        onToggle={toggle}
      />
```

- [ ] **Adım 5: `Tree.tsx`'e `countVisibleServices` ekle**

`buildFlatRows` fonksiyonunun hemen altına ekle:

```tsx
// "Müşteriler" başlığındaki sayı: ağacın aynı aramayla göstereceği sistem
// sayısı. Klasörler kapalı olsa bile sayılıyor — başlık, açınca ne
// göreceğini söylüyor.
export function countVisibleServices(nodes: SapNode[], search: string): number {
  const countNode = (node: SapNode): number =>
    getVisibleItems(node, search).length +
    getVisibleChildren(node, search).reduce((sum, child) => sum + countNode(child), 0);
  return nodes.filter((n) => nodeMatches(n, search)).reduce((sum, n) => sum + countNode(n), 0);
}
```

- [ ] **Adım 6: i18n anahtarı**

`src/i18n/tr.ts` içinde `"logonSidebar.addMenu": "Sistem ekle ve yenile",` satırının altına:

```ts
  "logonSidebar.customers": "Müşteriler",
```

`src/i18n/en.ts` içinde `"logonSidebar.addMenu": "Add and refresh systems",` satırının altına:

```ts
  "logonSidebar.customers": "Customers",
```

- [ ] **Adım 7: `LogonSidebar.tsx`'i değiştir**

1. **Importlar:**
   - `import Tree from "./Tree";` şuna dönüşüyor: `import Tree, { countVisibleServices } from "./Tree";`
   - Altına ekle: `import { SectionToggle, usePersistentCollapse } from "../ui/SectionToggle";`

2. **`EDGE` sabitinin altına ekle:**

```tsx
// "Müşteriler" bölümünün açık/kapalı hâli; Son Bağlanılanlar'la aynı yol.
const CUSTOMERS_COLLAPSE_KEY = "axet.customerTree.collapsed";
```

3. **Bileşenin içinde**, `const showFiles = ...` satırının altına ekle:

```tsx
  const [customersCollapsed, toggleCustomers] = usePersistentCollapse(CUSTOMERS_COLLAPSE_KEY);
  // Arama yapılırken ağaç kapalı olsa bile açık: sonuçlar görünmeli.
  const treeHidden = customersCollapsed && !search.trim();
```

4. **`modeButton`'ın `className`'i** şuna dönüşüyor:

```tsx
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition ${
        mode === value ? "bg-active text-slate-100" : "text-slate-400 hover:bg-hover hover:text-slate-200"
      }`}
```

5. **Üst şerit:**
   - `<div className="flex items-center gap-1.5 px-2 pb-2">` şuna dönüşüyor:
     `<div data-sidebar-header className="flex h-[54px] shrink-0 items-center gap-1.5 px-2.5">`
   - Üstüne yorum: `{/* Sohbet ve Terminal kenar çubuklarıyla aynı ölçü: ekran değiştirince üst çizgi zıplamıyor. */}`

6. **Geçiş kabı:** `<div className="flex shrink-0 items-center gap-1 rounded-sm border border-line p-0.5">` şuna dönüşüyor:
   `<div className="flex shrink-0 items-center gap-0.5">`

7. **Liste kabı:** `<div className="flex-1 overflow-y-auto p-3 pt-0">` şuna dönüşüyor:
   `<div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">`

8. **`<Tree ... />`** şu blokla sarılıyor (`Tree`'nin kendi prop'ları aynı kalıyor):

```tsx
              <SectionToggle
                label={t("logonSidebar.customers")}
                count={countVisibleServices(customers, search)}
                collapsed={treeHidden}
                onToggle={toggleCustomers}
              />
              {/* `hidden` ile gizleniyor, unmount değil: ağacın açık klasörleri
                  ve klavye odağı bölüm yeniden açılınca yerinde duruyor. */}
              <div className={treeHidden ? "hidden" : undefined}>
                <Tree
                  nodes={customers}
                  search={search}
                  selectedUuid={selectedUuid}
                  connectivity={connectivity}
                  tierOverrides={tierOverrides}
                  onSelect={onSelect}
                />
              </div>
```

- [ ] **Adım 8: Testlerin geçtiğini gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx tests/i18n.test.ts`
Beklenen: hepsi PASS.

Çalıştır: `npm run -s typecheck`
Beklenen: temiz.

- [ ] **Adım 9: Tam paket**

Çalıştır: `npx vitest run > .superpowers/x.txt 2>&1; tail -n 8 .superpowers/x.txt`
Beklenen: bütün dosyalar ve testler geçiyor. Önceki toplam 1260'tı, bu plan 3 dosyaya 17 test ekliyor; toplam 1277 civarı.

- [ ] **Adım 10: Commit**

```bash
git add src/ui/SectionToggle.tsx
git add src/components/RecentSystems.tsx
git add src/components/Tree.tsx
git add src/components/LogonSidebar.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/logonSidebar.test.tsx
git commit -m "Logon: kenar cubugu ust seridi sohbetle hizalandi, Musteriler basligi eklendi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
