# Ofis Görünümü — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajanlar ekranına **Bölmeler | Pano | Ofis** geçişinin üçüncü seçeneği olarak, her ajanı masasında oturan basit bir SVG karakter olarak gösteren, durumu (kesin/tahmini) renk ve küçük hareketle özetleyen ve tıklanınca o ajanın terminalini öne getiren bir ofis görünümü eklemek.

**Architecture:**
- Görünüm seçimi mevcut alan kaydı alanında (`view`) yaşıyor: `"board"`'a ek olarak `"office"`; `"panes"` kayda yazılmıyor, bilinmeyen değer atılıyor. Normalizasyon `terminalLayout.ts`'teki yeni `readWorkspaceView`'da, indirgeyici aynı fonksiyonu kullanıyor.
- Bütün karar mantığı **saf** `src/office/officeLayout.ts`'te: ızgara (`officeLayout`), durum→poz eşlemesi (`officeSeat`, mevcut `cardStatus`'un üstüne) ve metin kırpma (`clipText`). Çizim `OfficeCharacter.tsx`'te (kendi geometrik SVG'miz), yerleşim ve etkileşim `OfficeView.tsx`'te. Yeni IPC, yeni bağlam, yeni renk yok: veri `useAgentStatuses()`, `useBoards()` + `activeSubtaskOf`, `agentPanes`.
- `TerminalMode` görünümü `active.view ?? "panes"`'ten okuyor; Pano'daki gibi bölmeler Ofis'te **gizleniyor, sökülmüyor**; Kararlar paneli her görünümde yerinde.

**Tech Stack:** Electron 44 (Node 24), TypeScript, React 18, Tailwind 3, vitest 2, @testing-library/react (jsdom). Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-18-ofis-gorunumu-design.md` (üstüne inşa edilen: `docs/superpowers/plans/2026-10-18-gorev-panosu.md`, kodu `ozellik/gorev-panosu` dalında)

## Global Constraints

- Tasarım: **"daha fazla UI değil, daha güçlü hiyerarşi."** Ofis süs değil, durum özetidir. Lime (accent) **YALNIZ seçim** için: seçili radyo (`bg-[var(--accent-glow)]`), seçili/odaktaki ajanın çerçevesi (`border-accent-500/60`). Odak halkası `src/index.css`'teki genel `:focus-visible` kuralından gelir; yeni halka yazılmaz.
- **Yeni renk ya da jeton YOK.** Durum tonları mevcut `--status-*` jetonlarından: soru `--status-warning-{bg,border,text}`, hata `--status-danger-{bg,border,text,solid}`, çalışıyor `--status-success-text`. `--status-error-*` diye bir jeton YOK, uydurulmaz (kod yorumunda da yazılmaz; Task 3'teki kaynak taraması `var(--status-error` arar). Karakter rengi mevcut bölme rengi (`PANE_COLOR_VAR`); gri bölme için `fill-slate-400`. Hex (`#…`), `rgb(`/`hsl(` ve Tailwind `lime-*` sınıfı `src/office/` altında yok.
- **Hareket yalnız CSS animasyonu** (`@keyframes` `src/index.css`'te) ve yalnız **kesin** `running`'de. **Tahmini durumda hareket sınıfı hiç verilmez** (aynı poz, ≈ işareti). `prefers-reduced-motion: reduce` açıkken hiç hareket yok: bileşen sınıfı vermez (`usePrefersReducedMotion`) **ve** CSS `@media` bloğu animasyonu kapatır (iki kapı).
- **Yanlış bilgi yerine "bilinmiyor":** durum kaydı yoksa soluk karakter + "Bilinmiyor"; bölmenin süreci çalışmıyorsa (`exited`, `failed`, `queued`…) izleyicinin son (bayat) durumu gösterilmez. Soru balonundaki metin yalnız **kesin** `asking`'te.
- **AgentSpace ya da başka ürünlerin piksel-art çizimleri kopyalanmaz**, onlardan türetilmez; karakter `OfficeCharacter.tsx`'teki kendi basit geometrik SVG'mizdir (baş + gövde + sandalye + masa + ekran).
- **Mevcut Ajan Alanı ve Görev Panosu davranışları bozulmaz:** ekip şeridi kartları, Pano sütunları/ayrıntı paneli, `BoardOpenListener`, `AgentOpenListener`, Kararlar paneli, `revealPane`, "+ Ajan"/"+ Terminal", 6 alan × 9 bölme sınırı aynen kalır. Bu plan `app-electron/main/*`, `preload`, `agentMonitor`, pano yöneticisi ve SAP yazma kapısı dosyalarına dokunmaz.
- **i18n:** her yeni metin aynı task'ta hem `src/i18n/tr.ts` hem `src/i18n/en.ts`'e (anahtar `office.` önekiyle); `tests/i18n.test.ts` yer tutucu eşitliğini denetler.
- Komutlar: `npm run typecheck`, `npx vitest run <dosya>`; tam takım `npx vitest run > .superpowers/vitest-ofis.txt 2>&1` (çıktı dosyaya, sonra özeti oku).
- **Commit:** `git add` dosya dosya (asla `-A`/`.`); mesajın KONU satırı ASCII (Türkçe karakter yok); mesajın son satırı tam olarak `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Dal: `ozellik/ofis-gorunumu` (`ozellik/gorev-panosu` üstünden açılmış olmalı; dal değiştirme).
- **Asla stage edilmez:** `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*`.
- **Dosya adları:** saf yardımcı `officeLayout.ts` (küçük harf), bileşenler `OfficeView.tsx`, `OfficeCharacter.tsx` (büyük harf). Yalnız harf büyüklüğüyle ayrışan iki dosya adı YASAK (Windows'ta aynı dosya; mevcut örnek `boardDisplay.ts` ↔ `BoardView.tsx` bu yüzden farklı köklü).
- **Düzenleme:** Windows'ta Git Bash heredoc'u ters eğik çizgiyi bozuyor; dosyaları Edit/Write araçlarıyla değiştir. **Prettier çalıştırma.** Kod yorumları tam Türkçe karakterle. Satır sonu dosyanın kendisininki.
- **Uygulamayı başlatma** (`npm run dev`, `npm start`, Electron yok); elle deneme listesi kullanıcıya verilir. ADT/SAP çağrısı yok.

## Review Focus

1. **Bölmenin süreci kapandığı hâlde izleyicinin son durumu "asking" kalmışsa** (motor çıktı, `run.state === "exited"`) ofiste soru balonu ve soru metni **çıkmamalı**; karakter "Bitti" ile dinlenme pozunda olmalı. Aynı şekilde `failed`/`queued`/`starting` bölmede bayat "Çalışıyor" hareketi olmamalı. (Task 2 testleri "bayat asking: süreç bitmiş bölmede balon yok…", "bölmenin hâli izleyiciden önce gelir…")
2. **Tahmini (≈) durumlu ajan hareket etmemeli ve soru metni göstermemeli:** Claude/Codex/Gemini ajanı "çalışıyor ≈" iken eller durur, ekran sabit parlar; "soru ≈" iken balonda yalnız "?" vardır; `aria-label` "(tahmini)" der. (Task 2 testi "hareket yalnız kesin running'de…"; Task 4 testleri "tahmini çalışıyor: hareket sınıfı yok…", "soru balonu: kesin asking'te ilk 60 karakter…")
3. **"Hareketi azalt" uygulama açıkken açılırsa** animasyon yeniden başlatmadan durmalı; `window.matchMedia` olmayan ortamda bileşen çökmemeli. (Task 3 testleri "hareketi azalt sonradan açılınca sınıflar kalkıyor", "matchMedia yoksa çökmüyor…")
4. **Karaktere tıklayınca terminal gerçekten öne gelmeli ve klavye o terminale gitmeli:** görünüm Bölmeler'e dönmeli, bölme küçültülmüşse geri açılmalı (`revealPane`), gizliyken `active` olmayan xterm Bölmeler'e dönünce yeniden `active` olup odak almalı. Ofisteyken gizli xterm klavye odağını çalmamalı. (Task 4 testi "tıklama: önce görünüm Bölmeler, sonra revealPane…"; Task 5 testleri "ofiste: … xterm active değil…", "karaktere tıklama Bölmeler'e döndürüp bölmeyi öne getiriyor; Bölmeler'e dönünce odaktaki bölme active")
5. **Eski/bozuk kayıt ve ileri sürüm değeri:** `view: "salon"` gibi bilinmeyen değer alanı açılmaz hâle getirmemeli, sessizce Bölmeler'e düşmeli; `"panes"` kayda yazılmamalı (eski sürüm okusa da bozulmasın). (Task 1 testleri "yalnız board ve office…", "office okunuyor; bilinmeyen değer atılıyor…", "bilinmeyen görünüm değeri…")

## Spec'ten bilinçli sapmalar ve netleştirmeler

1. **Izgara satır dağılımı:** spec "1–3 tek sıra, 4–6 iki sıra, 7–9 üç sıra; hücreler eşit, ortalanmış" diyor. Plan: satır sayısı `ceil(n/3)`, sütun `ceil(n/satır)`; böylece 4 → 2+2 (3+1 değil), 5 → 3+2, 7 → 3+3+1, 8 → 3+3+2. Eksik son satır ortalanır, hücre genişliği bütün satırlarda aynı (`100/sütun %`).
2. **"Kayıt yok" ≈ göstermez:** ekip şeridi kartı durum kaydı yokken "Bilinmiyor ≈" diyor (`cardStatus`'ta kaynak yoksa tahmini sayılıyor). Ofiste `estimated` yalnız bölme çalışırken ve bir kayıt varken `source === "estimated"`; kayıt yoksa soluk "Bilinmiyor", ≈ yok, `aria-label`'da "(tahmini)" yok. Ekip şeridi değişmiyor.
3. **Spec tablosunda olmayan bölme hâlleri** `cardStatus` ile aynı metinle: `queued`/`starting` → soluk "bilinmiyor" pozu, metin "Sırada"/"Başlatılıyor"; `exited` → dinlenme pozu, "Bitti"; `failed`/`missingDir` → hata pozu, "Hata"; `failed` + `AGENT_ENGINE_MISSING` → boş masa, "Kurulu değil".
4. **Tahmini `asking`:** poz ve "?" balonu var, metin yok (spec: metin yalnız kesin asking'te).
5. **Balon karakter düğmesinin içinde:** ayrı bir iç içe düğme yok (erişilebilirlik ihlali olurdu); balona tıklamak karaktere tıklamakla aynı (spec §5 sonucu aynı).
6. **Gizli görünümde xterm `active` değil:** `TerminalMode`'da `focusable` artık `view === "panes"` koşulunu da içeriyor. Etkisi Pano görünümünde de var: Pano'dayken gizli xterm odak almıyor, Bölmeler'e dönünce `EmbeddedTerminal` yeniden `fit` + `focus` yapıyor (önceden dönüşte `active` değişmediği için yapmıyordu). Bu bir düzeltme; Pano'nun görünen davranışı değişmiyor.
7. **İki kapılı reduced-motion:** spec "CSS animasyonu; reduced ise hiç hareket yok". CSS `@media` kuralı jsdom'da ölçülemediği için bileşen de `matchMedia` ile sınıfı vermiyor; CSS bloğu ikinci kapı ve metin olarak test ediliyor.
8. **Boş durumdaki "Ajan" düğmesi** mevcut `agents.addAgent` metnini ve mevcut "+ Ajan" penceresini (`AddAgentDialog`) kullanıyor; bölme yönü yok (`AgentsEmptyState` ile aynı: `setAgentDialog({})`).
9. **Ekip şeridi kartına ve Kararlar'daki "Terminale git"e tıklama** Ofis'te (Pano'da olduğu gibi) görünümü değiştirmiyor; spec yalnız karakter/balon tıklamasını tanımlıyor ve Pano davranışını değiştirmemek için dokunulmadı (bkz. elle deneme 6).
10. **6 task:** veri (1), saf mantık (2), çizim (3), görünüm (4), bağlantı (5), rehber + doğrulama (6). Her biri ayrı reddedilebilir; 4 ve 5 ayrı, çünkü `OfficeView` sağlayıcılarla tek başına test ediliyor, `TerminalMode` bağlantısı ise mevcut bölme/Pano davranışına dokunuyor.

## Dosya yapısı

| Dosya | Sorumluluk | Task |
|---|---|---|
| `app-electron/shared/types.ts` | `WorkspaceView` türü; `SavedTerminalWorkspace.view` | 1 |
| `app-electron/shared/terminalLayout.ts` | `readWorkspaceView`, normalizasyon | 1 |
| `src/stores/terminalTypes.ts`, `src/stores/terminalReducer.ts`, `src/stores/terminalStoreContext.ts` | `view` alanı, `setWorkspaceView`, `fromSaved`/`toSaved` | 1 |
| `src/office/officeLayout.ts` (yeni) | Saf: ızgara, durum→poz, metin kırpma, sınırlar | 2 |
| `src/office/reducedMotion.ts` (yeni) | `usePrefersReducedMotion` | 3 |
| `src/office/OfficeCharacter.tsx` (yeni) | SVG karakter (masa, ekran, kişi, eller, hata işareti) | 3 |
| `src/index.css` | `office-typing`, `office-glow` animasyonları + reduced-motion bloğu | 3 |
| `src/office/OfficeView.tsx` (yeni) | Izgara, koltuk düğmesi, balon, etiketler, boş durum, terminal notu, tıklama | 4 |
| `src/agents/TeamStrip.tsx`, `src/terminal/TerminalMode.tsx` | Üç seçenekli geçiş, Ofis bağlantısı, gizli xterm | 5 |
| `src/i18n/{tr,en}.ts` | `office.*` metinleri | 4, 5 |
| `KULLANIM-REHBERI.md` | "Ofis görünümü" alt bölümü | 6 |
| `tests/officeWorkspaceView.test.ts` (yeni), `tests/boardWorkspaceSettings.test.ts` | Kayıt/indirgeyici | 1 |
| `tests/officeLayout.test.ts` (yeni) | Saf mantık | 2 |
| `tests/officeCharacter.test.tsx` (yeni) | Çizim, hareket, reduced-motion, CSS, renk taraması | 3 |
| `tests/officeView.test.tsx` (yeni) | Görünüm bileşeni | 4 |
| `tests/officeScreen.test.tsx` (yeni) | `TerminalMode` + `TeamStrip` bağlantısı | 5 |

---

### Task 1: Görünüm türüne "office" — kayıt, normalizasyon, indirgeyici

**Files:**
- Modify: `app-electron/shared/types.ts:343-356` (`SavedTerminalWorkspace` ve üstüne yeni tür)
- Modify: `app-electron/shared/terminalLayout.ts:7-15` (içe aktarma), `:200` (normalizasyon), yeni `readWorkspaceView`
- Modify: `src/stores/terminalTypes.ts:4`, `:58`, `:125`
- Modify: `src/stores/terminalReducer.ts:7-15` (içe aktarma), `fromSaved` (`:175-181`), `setWorkspaceView` (`:444-450`), `toSaved` (`:509`)
- Modify: `src/stores/terminalStoreContext.ts:5`, `:48-49`
- Modify: `tests/boardWorkspaceSettings.test.ts:28` (artık geçerli olan `"office"` yerine bilinmeyen değer)
- Test: `tests/officeWorkspaceView.test.ts` (yeni)

**Interfaces:**
- Consumes: mevcut `normalizeTerminalWorkspaces`, `terminalReducer`, `toSaved`, `initialTerminalState`, `replaceWorkspace` (indirgeyici içi).
- Produces (sonraki bütün task'lar bu adları kullanır):

```ts
// app-electron/shared/types.ts
export type WorkspaceView = "panes" | "board" | "office";
// SavedTerminalWorkspace'te:
view?: Exclude<WorkspaceView, "panes">;

// app-electron/shared/terminalLayout.ts
export function readWorkspaceView(raw: unknown): Exclude<WorkspaceView, "panes"> | undefined;

// src/stores/terminalTypes.ts — TerminalWorkspace'te:
view?: Exclude<WorkspaceView, "panes">;
// TerminalAction'da:
| { type: "setWorkspaceView"; id: string; view: WorkspaceView }

// src/stores/terminalStoreContext.ts — TerminalCommands'ta:
setWorkspaceView: (id: string, view: WorkspaceView) => void;
```

Bu task'tan sonra `TeamStrip` ve `TerminalMode` hâlâ yalnız `"panes" | "board"` gönderiyor (alt küme, tür uyumlu); `view: "office"` olan alan şimdilik Bölmeler gibi görünür. Bağlantı Task 5'te.

- [ ] **Step 1: Kırmızı test** — `tests/officeWorkspaceView.test.ts`

```ts
// Ofis görünümünün alan kaydı (spec 2026-10-18 ofis-gorunumu §2): "office"
// okunuyor ve yazılıyor; bilinmeyen değer atılıyor; "panes" kayda girmiyor.
import { describe, expect, it } from "vitest";
import { normalizeTerminalWorkspaces, readWorkspaceView } from "../app-electron/shared/terminalLayout";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalState } from "../src/stores/terminalTypes";
import type { WorkspaceView } from "../app-electron/shared/types";

const nameFor = (n: number) => `Alan ${n}`;

describe("readWorkspaceView", () => {
  it("yalnız board ve office; panes, bilinmeyen ve dize olmayan atılıyor", () => {
    expect(readWorkspaceView("board")).toBe("board");
    expect(readWorkspaceView("office")).toBe("office");
    for (const raw of ["panes", "salon", "Office", "", 3, null, undefined, ["office"], { view: "office" }]) {
      expect(readWorkspaceView(raw)).toBeUndefined();
    }
  });
});

describe("normalizeTerminalWorkspaces — office", () => {
  it("office okunuyor; bilinmeyen değer atılıyor, alan yine açılıyor", () => {
    const [office, bad] = normalizeTerminalWorkspaces(
      [
        { id: "w1", name: "A", panes: [], view: "office" },
        { id: "w2", name: "B", panes: [], view: "salon" }
      ],
      nameFor
    );
    expect(office.view).toBe("office");
    expect(bad.id).toBe("w2");
    expect("view" in bad).toBe(false);
  });
});

describe("indirgeyici: setWorkspaceView office", () => {
  const ready = (): TerminalState => ({
    ...initialTerminalState,
    phase: "ready",
    workspaces: [{ id: "w1", name: "A", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false }],
    activeWorkspaceId: "w1"
  });

  it("office kaydediliyor ve toSaved'e giriyor; aynı değer aynı durum; board↔office; panes kaldırıyor", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceView", id: "w1", view: "office" });
    expect(s.workspaces[0].view).toBe("office");
    expect(toSaved(s).workspaces[0].view).toBe("office");
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "office" })).toBe(s);
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "board" }).workspaces[0].view).toBe("board");
    const panes = terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "panes" });
    expect("view" in panes.workspaces[0]).toBe(false);
    expect("view" in toSaved(panes).workspaces[0]).toBe(false);
  });

  it("bilinmeyen görünüm değeri Bölmeler sayılıyor; zaten Bölmeler'deyse aynı durum", () => {
    const start = ready();
    expect(terminalReducer(start, { type: "setWorkspaceView", id: "w1", view: "salon" as WorkspaceView })).toBe(start);
    const office = terminalReducer(start, { type: "setWorkspaceView", id: "w1", view: "office" });
    expect("view" in terminalReducer(office, { type: "setWorkspaceView", id: "w1", view: "salon" as WorkspaceView }).workspaces[0]).toBe(false);
  });

  it("geri yükleme: kayıttaki office alana geliyor", () => {
    const opened = terminalReducer(initialTerminalState, {
      type: "open",
      saved: [{ id: "w1", name: "A", panes: [], view: "office" }],
      activeId: "w1",
      freshId: "f",
      nameFor
    });
    expect(opened.workspaces[0].view).toBe("office");
  });
});
```

`tests/boardWorkspaceSettings.test.ts`'te `"office"` artık geçerli bir değer; "bozuk view atılıyor" beklentisi bilinmeyen bir değerle kalmalı. 28. satırı değiştir:

```ts
        { id: "w3", name: "C", panes: [], verify: "npm test", view: "office" }
```

yerine:

```ts
        { id: "w3", name: "C", panes: [], verify: "npm test", view: "salon" }
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/officeWorkspaceView.test.ts tests/boardWorkspaceSettings.test.ts`
Expected: FAIL — `readWorkspaceView` dışa aktarılmıyor (`officeWorkspaceView`); `boardWorkspaceSettings` geçiyor.

- [ ] **Step 3: Tür** — `app-electron/shared/types.ts`

`export interface SavedTerminalWorkspace {` satırının hemen ÜSTÜNE:

```ts
/** Ajanlar ekranının görünümü (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2). "panes" varsayılan; kayda yazılmaz. */
export type WorkspaceView = "panes" | "board" | "office";

```

Aynı arayüzdeki

```ts
  /** Ajanlar ekranında son seçilen görünüm; yoksa bölmeler (spec 2026-10-18 gorev-panosu §8). */
  view?: "board";
```

satırlarını şununla değiştir:

```ts
  /** Ajanlar ekranında son seçilen görünüm; yoksa bölmeler (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2). */
  view?: Exclude<WorkspaceView, "panes">;
```

- [ ] **Step 4: Normalizasyon** — `app-electron/shared/terminalLayout.ts`

Dosyanın başındaki `import type { … } from "./types";` listesinin son satırını (`  TerminalPaneKind`) şöyle yap:

```ts
  TerminalPaneKind,
  WorkspaceView
} from "./types";
```

`readVerifyCommands` fonksiyonunun hemen ALTINA:

```ts
/** Kayıttaki görünüm (spec 2026-10-18 ofis-gorunumu §2). "panes" ve bilinmeyen değer
 * atılıyor: alan yine açılır, Bölmeler'de. İleri sürümün yazdığı değer de böyle düşer. */
export function readWorkspaceView(raw: unknown): Exclude<WorkspaceView, "panes"> | undefined {
  return raw === "board" || raw === "office" ? raw : undefined;
}
```

`normalizeTerminalWorkspaces` içindeki

```ts
    if (record.view === "board") workspace.view = "board";
```

satırını şununla değiştir:

```ts
    const view = readWorkspaceView(record.view);
    if (view) workspace.view = view;
```

- [ ] **Step 5: Renderer türleri** — `src/stores/terminalTypes.ts`, `src/stores/terminalStoreContext.ts`

`terminalTypes.ts` 4. satır:

```ts
import type { SavedTerminalWorkspace, SavedWorkspaceSap, TerminalPaneColor, TerminalPaneKind } from "../../app-electron/shared/types";
```

yerine:

```ts
import type { SavedTerminalWorkspace, SavedWorkspaceSap, TerminalPaneColor, TerminalPaneKind, WorkspaceView } from "../../app-electron/shared/types";
```

`TerminalWorkspace`'teki `  view?: "board";` satırını `  view?: Exclude<WorkspaceView, "panes">;` yap. `TerminalAction`'ın son satırını

```ts
  | { type: "setWorkspaceView"; id: string; view: "panes" | "board" };
```

şununla değiştir:

```ts
  | { type: "setWorkspaceView"; id: string; view: WorkspaceView };
```

`terminalStoreContext.ts` 5. satır:

```ts
import type { SavedWorkspaceSap, TerminalMode, TerminalPaneColor } from "../../app-electron/shared/types";
```

yerine:

```ts
import type { SavedWorkspaceSap, TerminalMode, TerminalPaneColor, WorkspaceView } from "../../app-electron/shared/types";
```

ve

```ts
  /** Ajanlar ekranında Bölmeler | Pano (spec 2026-10-18 gorev-panosu §8). */
  setWorkspaceView: (id: string, view: "panes" | "board") => void;
```

yerine:

```ts
  /** Ajanlar ekranında Bölmeler | Pano | Ofis (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2). */
  setWorkspaceView: (id: string, view: WorkspaceView) => void;
```

- [ ] **Step 6: İndirgeyici** — `src/stores/terminalReducer.ts`

`terminalLayout` içe aktarmasının son satırını (`  readVerifyCommands`) şöyle yap:

```ts
  readVerifyCommands,
  readWorkspaceView
} from "../../app-electron/shared/terminalLayout";
```

`fromSaved`'de `const layout = normalizeLayout(saved.layout, ids.filter((id) => !hidden.has(id)));` satırının ALTINA:

```ts
  const view = readWorkspaceView(saved.view);
```

ve aynı fonksiyondaki

```ts
    ...(saved.view === "board" ? { view: "board" as const } : {}),
```

yerine:

```ts
    ...(view ? { view } : {}),
```

`case "setWorkspaceView"` bloğunun tamamını şununla değiştir:

```ts
    case "setWorkspaceView": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      // "panes" ve bilinmeyen değer: kayıtta görünüm yok (spec 2026-10-18 ofis-gorunumu §2).
      const view = readWorkspaceView(action.view);
      if (!workspace || workspace.view === view) return state;
      const next = { ...workspace };
      delete next.view;
      return replaceWorkspace(state, view ? { ...next, view } : next);
    }
```

`toSaved`'deki

```ts
      ...(w.view === "board" ? { view: "board" as const } : {})
```

yerine:

```ts
      ...(w.view ? { view: w.view } : {})
```

- [ ] **Step 7: Yeşili gör**

Run: `npx vitest run tests/officeWorkspaceView.test.ts tests/boardWorkspaceSettings.test.ts tests/boardScreen.test.tsx tests/terminalMode.test.tsx`
Expected: PASS (hepsi).

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 8: Commit**

```bash
git add app-electron/shared/types.ts app-electron/shared/terminalLayout.ts src/stores/terminalTypes.ts src/stores/terminalReducer.ts src/stores/terminalStoreContext.ts tests/officeWorkspaceView.test.ts tests/boardWorkspaceSettings.test.ts
git commit -m "Ofis: alan gorunumune office degeri (kayit, normalizasyon, indirgeyici)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Saf ofis mantığı — ızgara, durum→poz, metin kırpma

**Files:**
- Create: `src/office/officeLayout.ts`
- Test: `tests/officeLayout.test.ts`

**Interfaces:**
- Consumes: `cardStatus`, `StatusTone` (`src/agents/agentView.ts`); `AGENT_ENGINE_MISSING`, `AgentStatus` (`app-electron/shared/agentTypes.ts`); `MAX_TERMINAL_PANES` (`app-electron/shared/terminalLayout.ts`, değeri 9); `TerminalPane` (`src/stores/terminalTypes.ts`); `TranslationKey` (`src/i18n/tr.ts`).
- Produces (Task 3–4 bu adları kullanır):

```ts
export const OFFICE_MAX_SEATS: number;        // = MAX_TERMINAL_PANES (9)
export const OFFICE_QUESTION_MAX = 60;
export const OFFICE_TASK_MAX = 40;

export interface OfficeGrid { rows: number[]; cols: number }   // rows: satır başına koltuk sayısı
export function officeLayout(count: number): OfficeGrid;

export function clipText(text: string, max: number): string;

export type OfficePose = "typing" | "asking" | "resting" | "error" | "unknown" | "absent";
export interface OfficeSeatView {
  pose: OfficePose;
  motion: boolean;          // yalnız kesin running
  estimated: boolean;       // bölme çalışıyor ve kayıt tahmini
  question: string | null;  // yalnız kesin asking; ≤ OFFICE_QUESTION_MAX
  tone: StatusTone;
  key: TranslationKey;
  params?: { min: number };
}
export function officeSeat(pane: TerminalPane, status: AgentStatus | undefined, now: number): OfficeSeatView;
```

Kural sırası (`officeSeat`): **önce bölmenin hâli**, sonra izleyicinin kaydı. Bölme çalışmıyorsa (`exited`, `failed`, `missingDir`, `queued`, `starting`) izleyicinin son kaydı bayattır ve kullanılmaz (Review Focus 1). Metin ve ton `cardStatus`'tan; ekip şeridi kartıyla aynı sözcükler.

- [ ] **Step 1: Kırmızı test** — `tests/officeLayout.test.ts`

```ts
// Ofis görünümünün saf mantığı (spec 2026-10-18 ofis-gorunumu §3, §4, §7):
// ızgara, durum→poz eşlemesi (kesin/tahmini ayrımı, bilinmiyor), metin kırpma.
import { describe, expect, it } from "vitest";
import {
  AGENT_ENGINE_MISSING,
  type AgentQuestion,
  type AgentState,
  type AgentStatus,
  type AgentStatusSource
} from "../app-electron/shared/agentTypes";
import type { PaneRun, TerminalPane } from "../src/stores/terminalTypes";
import { OFFICE_MAX_SEATS, OFFICE_QUESTION_MAX, clipText, officeLayout, officeSeat } from "../src/office/officeLayout";

const RUN: PaneRun = { state: "running", ptyId: "t1" };
const pane = (run: PaneRun = RUN): TerminalPane => ({
  id: "p1",
  kind: "agent",
  agent: { engine: "axet-code", role: "coder", roleKind: "custom" },
  cwd: "C:\\a",
  run
});
const st = (state: AgentState, source: AgentStatusSource = "exact", over: Partial<AgentStatus> = {}): AgentStatus => ({
  state,
  source,
  lastActivity: null,
  ...over
});
const q = (question: string, header = "Başlık"): AgentQuestion => ({
  callId: "c1",
  question,
  header,
  options: ["Evet", "Hayır"],
  multiSelect: false,
  askedAt: 1
});
const NOW = 10_000_000;

describe("officeLayout", () => {
  it("0–9 ajan: 1–3 tek sıra, 4–6 iki sıra, 7–9 üç sıra; eksik son satır", () => {
    expect(officeLayout(0)).toEqual({ rows: [], cols: 0 });
    expect(officeLayout(1)).toEqual({ rows: [1], cols: 1 });
    expect(officeLayout(2)).toEqual({ rows: [2], cols: 2 });
    expect(officeLayout(3)).toEqual({ rows: [3], cols: 3 });
    expect(officeLayout(4)).toEqual({ rows: [2, 2], cols: 2 });
    expect(officeLayout(5)).toEqual({ rows: [3, 2], cols: 3 });
    expect(officeLayout(6)).toEqual({ rows: [3, 3], cols: 3 });
    expect(officeLayout(7)).toEqual({ rows: [3, 3, 1], cols: 3 });
    expect(officeLayout(8)).toEqual({ rows: [3, 3, 2], cols: 3 });
    expect(officeLayout(9)).toEqual({ rows: [3, 3, 3], cols: 3 });
  });

  it("sınır: 9'u aşan 9'a, negatif/NaN 0'a, kesirli aşağı yuvarlanıyor; toplam hep koltuk sayısı", () => {
    expect(OFFICE_MAX_SEATS).toBe(9);
    expect(officeLayout(12)).toEqual(officeLayout(9));
    expect(officeLayout(-1)).toEqual({ rows: [], cols: 0 });
    expect(officeLayout(Number.NaN)).toEqual({ rows: [], cols: 0 });
    expect(officeLayout(2.7)).toEqual({ rows: [2], cols: 2 });
    for (let n = 0; n <= 9; n++) expect(officeLayout(n).rows.reduce((a, b) => a + b, 0)).toBe(n);
  });
});

describe("clipText", () => {
  it("sınırda dokunmuyor; aşınca sınır uzunluğunda … ile bitiyor", () => {
    expect(clipText("a".repeat(60), 60)).toBe("a".repeat(60));
    const clipped = clipText("a".repeat(61), 60);
    expect(Array.from(clipped)).toHaveLength(60);
    expect(clipped.endsWith("…")).toBe(true);
  });

  it("satır sonu ve fazla boşluk tek boşluk; kırpmadan önce sondaki boşluk atılıyor", () => {
    expect(clipText("  Bir\n\nsoru\t var  ", 60)).toBe("Bir soru var");
    expect(clipText("abc def", 5)).toBe("abc…");
    expect(clipText("", 10)).toBe("");
  });

  it("vekil çiftleri (emoji) bölünmüyor", () => {
    const text = "😀".repeat(5);
    expect(clipText(text, 5)).toBe(text);
    expect(clipText(text, 3)).toBe("😀😀…");
  });
});

describe("officeSeat", () => {
  it("kesin running: yazıyor, hareket var, ≈ yok", () => {
    expect(officeSeat(pane(), st("running"), NOW)).toEqual({
      pose: "typing",
      motion: true,
      estimated: false,
      question: null,
      tone: "success",
      key: "agents.stateRunning"
    });
  });

  it("tahmini running: aynı poz, hareket YOK, ≈", () => {
    expect(officeSeat(pane(), st("running", "estimated"), NOW)).toMatchObject({ pose: "typing", motion: false, estimated: true });
  });

  it("hareket yalnız kesin running'de (bütün durum × kaynak)", () => {
    const states: AgentState[] = ["running", "idle", "asking", "finished", "error", "unknown"];
    for (const state of states) {
      for (const source of ["exact", "estimated"] as const) {
        expect(officeSeat(pane(), st(state, source), NOW).motion, `${state}/${source}`).toBe(state === "running" && source === "exact");
      }
    }
  });

  it("kesin asking: soru metni ilk 60 karakter; metin boşsa başlık", () => {
    const long = "Bu tabloya yeni bir alan eklensin mi, yoksa mevcut yapı mı korunsun, karar ver lütfen";
    const seat = officeSeat(pane(), st("asking", "exact", { question: q(long) }), NOW);
    expect(seat).toMatchObject({ pose: "asking", tone: "warning", estimated: false, key: "agents.stateAsking" });
    expect(Array.from(seat.question ?? "")).toHaveLength(OFFICE_QUESTION_MAX);
    expect(seat.question?.endsWith("…")).toBe(true);
    expect(officeSeat(pane(), st("asking", "exact", { question: q("  ", "Onay") }), NOW).question).toBe("Onay");
  });

  it("tahmini asking ya da sorusuz asking: balon pozu var, metin yok", () => {
    expect(officeSeat(pane(), st("asking", "estimated", { question: q("Gizli mi?") }), NOW)).toMatchObject({ pose: "asking", question: null, estimated: true });
    expect(officeSeat(pane(), st("asking"), NOW)).toMatchObject({ pose: "asking", question: null });
  });

  it("idle ve finished: dinleniyor; boşta süresi metinde", () => {
    expect(officeSeat(pane(), st("idle", "exact", { lastActivity: NOW - 3 * 60_000 }), NOW)).toMatchObject({
      pose: "resting",
      motion: false,
      key: "agents.stateIdleFor",
      params: { min: 3 }
    });
    expect(officeSeat(pane(), st("finished"), NOW)).toMatchObject({ pose: "resting", key: "agents.stateFinished" });
  });

  it("error: hata pozu, tehlike tonu", () => {
    expect(officeSeat(pane(), st("error"), NOW)).toMatchObject({ pose: "error", tone: "danger", key: "agents.stateError" });
  });

  it("kayıt yok: bilinmiyor, ≈ YOK; kayıt unknown ve tahmini: bilinmiyor, ≈", () => {
    expect(officeSeat(pane(), undefined, NOW)).toEqual({
      pose: "unknown",
      motion: false,
      estimated: false,
      question: null,
      tone: "muted",
      key: "agents.stateUnknown"
    });
    expect(officeSeat(pane(), st("unknown", "estimated"), NOW)).toMatchObject({ pose: "unknown", estimated: true });
  });

  it("motor kurulu değil: boş masa", () => {
    expect(officeSeat(pane({ state: "failed", message: AGENT_ENGINE_MISSING }), undefined, NOW)).toMatchObject({
      pose: "absent",
      key: "agents.notInstalled",
      tone: "danger",
      estimated: false
    });
  });

  it("bölmenin hâli izleyiciden önce gelir: başlatma hatası, klasör yok, sırada, başlatılıyor", () => {
    expect(officeSeat(pane({ state: "failed", message: "spawn ENOENT" }), st("running"), NOW)).toMatchObject({ pose: "error", motion: false, key: "agents.stateError" });
    expect(officeSeat(pane({ state: "missingDir" }), st("running"), NOW)).toMatchObject({ pose: "error", motion: false });
    expect(officeSeat(pane({ state: "queued" }), st("running"), NOW)).toMatchObject({ pose: "unknown", motion: false, key: "terminal.queued" });
    expect(officeSeat(pane({ state: "starting", token: 1 }), st("running"), NOW)).toMatchObject({ pose: "unknown", motion: false, key: "terminal.starting" });
  });

  it("bayat asking: süreç bitmiş bölmede balon yok, dinleniyor, 'Bitti'", () => {
    const seat = officeSeat(pane({ state: "exited", ptyId: "t1", code: 0 }), st("asking", "exact", { question: q("Devam?") }), NOW);
    expect(seat).toMatchObject({ pose: "resting", question: null, motion: false, estimated: false, key: "agents.stateFinished" });
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/officeLayout.test.ts`
Expected: FAIL — `Failed to resolve import "../src/office/officeLayout"`.

- [ ] **Step 3: Uygulama** — `src/office/officeLayout.ts`

```ts
// Ofis görünümünün SAF yardımcıları (spec 2026-10-18 ofis-gorunumu §3, §4).
// Yeni bilgi üretmiyor: ekip şeridinin durum metni (`cardStatus`) üstüne poz
// ekliyor. Sıra: önce bölmenin hâli, sonra izleyicinin kaydı — süreci bitmiş
// bölmenin son kaydı bayattır, gösterilmez. Tahmini durumda hareket yok;
// soru metni yalnız kesin "soru soruyor"da.
import { AGENT_ENGINE_MISSING, type AgentStatus } from "../../app-electron/shared/agentTypes";
import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane } from "../stores/terminalTypes";
import { cardStatus, type StatusTone } from "../agents/agentView";

/** Alan sınırı: bir alanda en fazla bu kadar bölme, dolayısıyla ajan. */
export const OFFICE_MAX_SEATS = MAX_TERMINAL_PANES;
export const OFFICE_QUESTION_MAX = 60;
export const OFFICE_TASK_MAX = 40;

export interface OfficeGrid {
  /** Satır başına koltuk sayısı; eksik son satır ortalanarak çiziliyor. */
  rows: number[];
  /** En geniş satırın koltuk sayısı; hücre genişliği bütün satırlarda 1/cols. */
  cols: number;
}

/** 1–3 tek sıra, 4–6 iki sıra, 7–9 üç sıra (spec §3); 4 → 2+2, 7 → 3+3+1. */
export function officeLayout(count: number): OfficeGrid {
  const n = Number.isFinite(count) ? Math.max(0, Math.min(OFFICE_MAX_SEATS, Math.floor(count))) : 0;
  if (n === 0) return { rows: [], cols: 0 };
  const rowCount = Math.ceil(n / 3);
  const cols = Math.ceil(n / rowCount);
  const rows: number[] = [];
  let left = n;
  for (let r = 0; r < rowCount; r++) {
    const k = Math.min(cols, left);
    rows.push(k);
    left -= k;
  }
  return { rows, cols };
}

/** Boşlukları teke indirir; `max` karakteri aşarsa `max` uzunlukta "…" ile biter. Emoji bölünmez. */
export function clipText(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const chars = Array.from(flat);
  if (chars.length <= max) return flat;
  return `${chars.slice(0, Math.max(0, max - 1)).join("").trimEnd()}…`;
}

export type OfficePose = "typing" | "asking" | "resting" | "error" | "unknown" | "absent";

export interface OfficeSeatView {
  pose: OfficePose;
  /** Yalnız kesin "çalışıyor"da; tahmini durumda asla. */
  motion: boolean;
  /** Bölme çalışıyor ve kayıt tahmini (≈). Kayıt yoksa false: "bilinmiyor" ≈ ile süslenmiyor. */
  estimated: boolean;
  /** Balondaki metin: yalnız kesin "soru soruyor"da, en çok OFFICE_QUESTION_MAX. */
  question: string | null;
  tone: StatusTone;
  key: TranslationKey;
  params?: { min: number };
}

function poseOf(state: AgentStatus["state"]): OfficePose {
  switch (state) {
    case "running":
      return "typing";
    case "asking":
      return "asking";
    case "idle":
    case "finished":
      return "resting";
    case "error":
      return "error";
    default:
      return "unknown";
  }
}

export function officeSeat(pane: TerminalPane, status: AgentStatus | undefined, now: number): OfficeSeatView {
  const card = cardStatus(pane, status, now);
  const text = { tone: card.tone, key: card.key, ...(card.params ? { params: card.params } : {}) };
  const still = { motion: false, estimated: false, question: null };
  const run = pane.run;
  if (run.state === "failed" && run.message === AGENT_ENGINE_MISSING) return { ...text, ...still, pose: "absent" };
  if (run.state === "failed" || run.state === "missingDir") return { ...text, ...still, pose: "error" };
  if (run.state === "exited") return { ...text, ...still, pose: "resting" };
  if (run.state !== "running" || !status) return { ...text, ...still, pose: "unknown" };
  const estimated = status.source === "estimated";
  const pose = poseOf(status.state);
  const asked =
    pose === "asking" && !estimated && status.question
      ? clipText(status.question.question.trim() || status.question.header, OFFICE_QUESTION_MAX)
      : "";
  return { ...text, pose, motion: pose === "typing" && !estimated, estimated, question: asked || null };
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/officeLayout.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 5: Commit**

```bash
git add src/office/officeLayout.ts tests/officeLayout.test.ts
git commit -m "Ofis: saf izgara, durum-poz eslemesi ve metin kirpma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 3: Karakter çizimi — `OfficeCharacter` SVG, hareket ve "hareketi azalt"

**Files:**
- Create: `src/office/reducedMotion.ts`
- Create: `src/office/OfficeCharacter.tsx`
- Modify: `src/index.css` (dosyanın sonuna, `.chat-breathe` kuralından sonra)
- Test: `tests/officeCharacter.test.tsx`

**Interfaces:**
- Consumes: `OfficePose` (Task 2, `src/office/officeLayout.ts`).
- Produces (Task 4 kullanır):

```ts
// src/office/reducedMotion.ts
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export function usePrefersReducedMotion(): boolean;   // matchMedia yoksa false; "change" dinleniyor

// src/office/OfficeCharacter.tsx
export default function OfficeCharacter(props: { pose: OfficePose; motion: boolean; color: string | null }): JSX.Element;
// DOM sözleşmesi (testler ve Task 4 buna dayanıyor):
//   <svg aria-hidden="true" data-pose={pose}>; soluk pozlarda (unknown, absent) sınıfta "opacity-40"
//   [data-person]       kişi grubu; pose === "absent" ise YOK
//   [data-hands] rect   iki el; hareketteyken her birinde "office-typing" sınıfı
//   [data-screen]       ekran; hareketteyken "office-glow" sınıfı
//   [data-danger-mark]  yalnız pose === "error"; fill var(--status-danger-solid)
```

Çizim kendi geometrimizdir (viewBox 120×96): solda sandalye + kişi (baş dairesi, yuvarlak köşeli gövde), sağda masa, ekran ve klavye. Kişi rengi `color` (bölme rengi `var(--…)`), yoksa `fill-slate-400`. "Dinleniyor" pozunda kişi grubu arkaya yaslanır (`rotate(-10 36 64)`), eller kucakta, ekran sönük. Etiket (ad, durum) çizimde değil, Task 4'teki düğmede: SVG `aria-hidden`.

- [ ] **Step 1: Kırmızı test** — `tests/officeCharacter.test.tsx`

```tsx
// @vitest-environment jsdom
// Ofis karakteri (spec 2026-10-18 ofis-gorunumu §4): pozlar, hareket yalnız
// kesin çalışmada, "hareketi azalt", tehlike işareti, bölme rengi; yeni renk yok.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OfficeCharacter from "../src/office/OfficeCharacter";

const ROOT = path.join(__dirname, "..");

/** jsdom'da matchMedia yok; "hareketi azalt" tercihini taklit ediyor ve sonradan değiştirebiliyor. */
function mockMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn((media: string) => ({
    get matches() {
      return matches;
    },
    media,
    addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn)
  }));
  return {
    set(next: boolean) {
      matches = next;
      act(() => listeners.forEach((fn) => fn()));
    }
  };
}

afterEach(() => {
  cleanup();
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

const svg = () => document.querySelector("svg") as SVGSVGElement;
const cls = (el: Element | null) => el?.getAttribute("class") ?? "";
const moving = () => document.querySelectorAll(".office-typing, .office-glow").length;

describe("OfficeCharacter", () => {
  it("kesin çalışma: eller yazıyor, ekran parlıyor; çizim ekran okuyucudan gizli", () => {
    mockMotion(false);
    render(<OfficeCharacter pose="typing" motion color="var(--status-info-text)" />);
    expect(svg().getAttribute("aria-hidden")).toBe("true");
    expect(svg().getAttribute("data-pose")).toBe("typing");
    const hands = document.querySelectorAll("[data-hands] rect");
    expect(hands).toHaveLength(2);
    for (const hand of hands) expect(cls(hand)).toContain("office-typing");
    expect(cls(document.querySelector("[data-screen]"))).toContain("office-glow");
  });

  it("hareket istenmiyorsa (tahmini) aynı poz ama hiçbir hareket sınıfı yok", () => {
    mockMotion(false);
    render(<OfficeCharacter pose="typing" motion={false} color={null} />);
    expect(svg().getAttribute("data-pose")).toBe("typing");
    expect(moving()).toBe(0);
  });

  it("hareketi azalt açıkken motion olsa da hareket sınıfı yok", () => {
    mockMotion(true);
    render(<OfficeCharacter pose="typing" motion color={null} />);
    expect(moving()).toBe(0);
  });

  it("hareketi azalt sonradan açılınca sınıflar kalkıyor", () => {
    const media = mockMotion(false);
    render(<OfficeCharacter pose="typing" motion color={null} />);
    expect(moving()).toBe(3);
    media.set(true);
    expect(moving()).toBe(0);
  });

  it("matchMedia yoksa çökmüyor, hareket var", () => {
    render(<OfficeCharacter pose="typing" motion color={null} />);
    expect(moving()).toBe(3);
  });

  it("bölme rengi kişide; gri bölmede tema mürekkebi", () => {
    render(<OfficeCharacter pose="resting" motion={false} color="var(--status-info-text)" />);
    expect((document.querySelector("[data-person] circle") as SVGElement).style.fill).toBe("var(--status-info-text)");
    cleanup();
    render(<OfficeCharacter pose="resting" motion={false} color={null} />);
    expect(cls(document.querySelector("[data-person] circle"))).toContain("fill-slate-400");
  });

  it("hata: ekranda tehlike işareti; başka pozda yok", () => {
    render(<OfficeCharacter pose="error" motion={false} color={null} />);
    const mark = document.querySelector("[data-danger-mark]") as SVGElement;
    expect(mark).toBeTruthy();
    expect(mark.style.fill).toBe("var(--status-danger-solid)");
    cleanup();
    render(<OfficeCharacter pose="asking" motion={false} color={null} />);
    expect(document.querySelector("[data-danger-mark]")).toBeNull();
  });

  it("bilinmiyor soluk; kurulu değil: masa boş ve soluk; dinlenen kişi arkaya yaslanmış", () => {
    render(<OfficeCharacter pose="unknown" motion={false} color={null} />);
    expect(cls(svg())).toContain("opacity-40");
    expect(document.querySelector("[data-person]")).toBeTruthy();
    cleanup();
    render(<OfficeCharacter pose="absent" motion={false} color={null} />);
    expect(cls(svg())).toContain("opacity-40");
    expect(document.querySelector("[data-person]")).toBeNull();
    cleanup();
    render(<OfficeCharacter pose="resting" motion={false} color={null} />);
    expect(cls(svg())).not.toContain("opacity-40");
    expect(document.querySelector("[data-person]")?.getAttribute("transform")).toBe("rotate(-10 36 64)");
  });

  it("CSS: animasyon tanımlı ve 'hareketi azalt' bloğu ikisini de kapatıyor", () => {
    const css = readFileSync(path.join(ROOT, "src", "index.css"), "utf8").replace(/\r\n/g, "\n");
    expect(css).toMatch(/@keyframes office-typing \{/);
    expect(css).toMatch(/@keyframes office-glow \{/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.office-typing,\s*\.office-glow \{\s*animation: none;\s*\}\s*\}/);
  });

  it("src/office altında yeni renk yok: hex, rgb/hsl, lime sınıfı, uydurma hata jetonu", () => {
    const dir = path.join(ROOT, "src", "office");
    const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const text = readFileSync(path.join(dir, file), "utf8");
      expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(text, file).not.toMatch(/\b(rgba?|hsla?)\(/);
      expect(text, file).not.toMatch(/\blime-\d/);
      expect(text, file).not.toMatch(/var\(--status-error/);
    }
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/officeCharacter.test.tsx`
Expected: FAIL — `Failed to resolve import "../src/office/OfficeCharacter"`.

- [ ] **Step 3: "Hareketi azalt" kancası** — `src/office/reducedMotion.ts`

```ts
// "Hareketi azalt" tercihi (spec 2026-10-18 ofis-gorunumu §4). CSS'teki
// @media bloğu ikinci kapı; bu kanca sınıfı hiç vermiyor, böylece test
// edilebiliyor. matchMedia olmayan ortamda (jsdom) hareket serbest sayılıyor.
import { useEffect, useState } from "react";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function query(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const list = query();
    if (!list) return;
    const update = () => setReduced(list.matches);
    update();
    // Uygulama açıkken tercih değişirse yeniden başlatmadan uyuluyor.
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);
  return reduced;
}
```

- [ ] **Step 4: Karakter** — `src/office/OfficeCharacter.tsx`

```tsx
// Ofis karakteri (spec 2026-10-18 ofis-gorunumu §4): sandalye, oturan kişi,
// masa, ekran ve klavye — kendi basit geometrik çizimimiz; başka ürünlerin
// piksel çizimleri kopyalanmıyor. Kişi bölme rengini taşıyor; durum tonları
// yalnız mevcut --status-* jetonlarından. Hareket yalnız `motion` (kesin
// "çalışıyor") ve "hareketi azalt" kapalıyken; etiketler düğmede, çizim gizli.
import type { CSSProperties } from "react";
import type { OfficePose } from "./officeLayout";
import { usePrefersReducedMotion } from "./reducedMotion";

export default function OfficeCharacter({ pose, motion, color }: { pose: OfficePose; motion: boolean; color: string | null }) {
  const reduced = usePrefersReducedMotion();
  const moving = motion && !reduced;
  const faded = pose === "unknown" || pose === "absent";
  const atDesk = pose === "typing" || pose === "asking" || pose === "error";
  const ink: { style?: CSSProperties; className?: string } = color ? { style: { fill: color } } : { className: "fill-slate-400" };
  return (
    <svg
      viewBox="0 0 120 96"
      aria-hidden="true"
      focusable="false"
      data-pose={pose}
      className={`h-auto w-full max-w-[9rem] ${faded ? "opacity-40" : ""}`}
    >
      {/* Masa ve ayakları */}
      <rect x="50" y="62" width="60" height="6" rx="2" className="fill-slate-600" />
      <rect x="54" y="68" width="4" height="22" className="fill-slate-600" />
      <rect x="102" y="68" width="4" height="22" className="fill-slate-600" />
      {/* Ekran: çerçeve, ayak, yüzey */}
      <rect x="62" y="28" width="40" height="28" rx="3" className="fill-raised stroke-line" strokeWidth="1" />
      <rect x="80" y="56" width="4" height="6" className="fill-slate-600" />
      <Screen pose={pose} moving={moving} color={color} />
      {/* Klavye */}
      <rect x="64" y="58" width="24" height="3" rx="1" className="fill-slate-500" />
      {pose !== "absent" && (
        <>
          {/* Sandalye */}
          <rect x="14" y="34" width="5" height="34" rx="2" className="fill-slate-600" />
          <rect x="18" y="64" width="32" height="5" rx="2" className="fill-slate-600" />
          <rect x="32" y="69" width="4" height="21" className="fill-slate-600" />
          <g data-person="" transform={pose === "resting" ? "rotate(-10 36 64)" : undefined}>
            <circle cx="34" cy="24" r="9" {...ink} />
            <rect x="24" y="36" width="20" height="28" rx="8" {...ink} />
            <g data-hands="">
              <rect
                x={atDesk ? 64 : 36}
                y={atDesk ? 55 : 58}
                width="7"
                height="3"
                rx="1.5"
                {...ink}
                className={[ink.className, moving ? "office-typing" : ""].filter(Boolean).join(" ") || undefined}
              />
              <rect
                x={atDesk ? 76 : 42}
                y={atDesk ? 55 : 58}
                width="7"
                height="3"
                rx="1.5"
                {...ink}
                className={[ink.className, moving ? "office-typing" : ""].filter(Boolean).join(" ") || undefined}
                style={{ ...ink.style, ...(moving ? { animationDelay: "300ms" } : {}) }}
              />
            </g>
          </g>
        </>
      )}
    </svg>
  );
}

/** Ekran yüzeyi: çalışırken parlak, soru ve hatada kendi tonu, gerisinde sönük. */
function Screen({ pose, moving, color }: { pose: OfficePose; moving: boolean; color: string | null }) {
  if (pose === "error") {
    return (
      <>
        <rect data-screen="" x="65" y="31" width="34" height="22" rx="1.5" style={{ fill: "var(--status-danger-bg)" }} />
        <g data-danger-mark="" style={{ fill: "var(--status-danger-solid)" }}>
          <rect x="80" y="35" width="4" height="9" rx="1" />
          <rect x="80" y="46" width="4" height="4" rx="1" />
        </g>
      </>
    );
  }
  if (pose === "typing" || pose === "asking") {
    return (
      <rect
        data-screen=""
        x="65"
        y="31"
        width="34"
        height="22"
        rx="1.5"
        style={{ fill: color ?? "var(--status-success-text)" }}
        opacity={pose === "typing" ? 0.45 : 0.3}
        className={moving ? "office-glow" : undefined}
      />
    );
  }
  return <rect data-screen="" x="65" y="31" width="34" height="22" rx="1.5" opacity={0.5} className="fill-slate-600" />;
}
```

Notlar: `var(--…)` içeren dolgular **`style` ile** veriliyor, `fill="var(--…)"` özniteliğiyle DEĞİL — SVG sunum özniteliği `var()`'ı çözmüyor. `data-danger-mark` bir `<g>`; testteki `style.fill` gruptan okuyor. İkinci el `style`'ı `ink.style`'ı da taşıyor; renksiz bölmede `ink.style` tanımsız, yayılım boş nesne verir. `CSSProperties` içe aktarması `ink` türü için.

- [ ] **Step 5: Animasyonlar** — `src/index.css`

Dosyanın en sonuna (`.chat-breathe { … }` kuralından sonra) ekle:

```css

/* Ofis görünümü (spec 2026-10-18 ofis-gorunumu §4): yalnız kesin "çalışıyor"da
   küçük bir döngü — eller hafifçe iniyor kalkıyor, ekran yavaşça parlıyor.
   Tahmini durumda sınıf hiç verilmiyor. "Hareketi azalt" açıksa bileşen
   sınıfı vermiyor; bu @media bloğu ikinci kapı. */
@keyframes office-typing {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-1.5px); }
}
@keyframes office-glow {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.6; }
}
.office-typing {
  animation: office-typing 600ms ease-in-out infinite;
  transform-box: fill-box;
}
.office-glow {
  animation: office-glow 2400ms ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .office-typing,
  .office-glow {
    animation: none;
  }
}
```

- [ ] **Step 6: Yeşili gör**

Run: `npx vitest run tests/officeCharacter.test.tsx tests/themeTokens.test.ts`
Expected: PASS (renk jetonu testi CSS'i ayrıştırıyor; yeni blok onu bozmamalı).

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 7: Commit**

```bash
git add src/office/reducedMotion.ts src/office/OfficeCharacter.tsx src/index.css tests/officeCharacter.test.tsx
git commit -m "Ofis: SVG karakter, kesin calismada hareket, hareketi azalt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: `OfficeView` — ızgara, koltuklar, balon, boş durum, tıklama

**Files:**
- Create: `src/office/OfficeView.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts` (dosya sonundaki `board.closeWorkspaceTasks` satırından sonra)
- Test: `tests/officeView.test.tsx`

**Interfaces:**
- Consumes: Task 2'den `officeLayout`, `officeSeat`, `clipText`, `OFFICE_TASK_MAX`; Task 3'ten `OfficeCharacter` (`{ pose, motion, color }`); Task 1'den `setWorkspaceView(id, "panes")`. Mevcut: `useTerminalStore().commands.revealPane`, `useAgentStatuses()` (`statuses`, `now`), `useBoards()` + `activeSubtaskOf(boards, paneId)`, `agentPanes`, `TONE_DOT`, `agentName`, `ENGINE_LABEL`, `PANE_COLOR_VAR`, `PRIMARY_BUTTON`.
- Produces (Task 5 kullanır):

```ts
export default function OfficeView(props: { workspace: TerminalWorkspace; onAddAgent: () => void }): JSX.Element;
// DOM sözleşmesi:
//   <section aria-label="Ofis görünümü" data-office>          (rol: region)
//   role="list" aria-label="Masalar" > [data-office-row] > role="listitem" > button[data-office-seat=<paneId>][data-pose]
//   [data-balloon] (yalnız asking), [data-balloon-text] (yalnız kesin asking), [data-estimated] "≈",
//   [data-office-task] (görevli ajan), [data-office-shells] "N terminal", [data-office-empty]
```

i18n anahtarları (bu task ekler): `office.label`, `office.seats`, `office.empty`, `office.shellCount`, `office.estimatedSuffix`.

- [ ] **Step 1: Kırmızı test** — `tests/officeView.test.tsx`

```tsx
// @vitest-environment jsdom
// Ofis görünümü bileşeni (spec 2026-10-18 ofis-gorunumu §3–§7): ızgara,
// kabuk notu, koltuk düğmesi (klavye, aria-label), tahmini/kesin ayrımı,
// soru balonu, alt görev satırı, seçim, boş durum, tıklama, i18n.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import OfficeView from "../src/office/OfficeView";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import { AGENT_ENGINE_MISSING, type AgentQuestion, type AgentState, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { Board, BoardTask, Subtask } from "../app-electron/shared/boardTypes";

afterEach(() => {
  cleanup();
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

function commandsMock(): TerminalCommands {
  return {
    restore: vi.fn(),
    startFresh: vi.fn(),
    addWorkspace: vi.fn(),
    selectWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    closeWorkspace: vi.fn(),
    addPane: vi.fn(),
    addAgent: vi.fn(),
    revealPane: vi.fn(),
    setWorkspaceRoot: vi.fn(),
    setWorkspaceVerify: vi.fn(),
    setWorkspaceView: vi.fn(),
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn(),
    movePane: vi.fn(),
    resizeSplit: vi.fn(),
    equalizeSplit: vi.fn(),
    minimizePane: vi.fn(),
    restorePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    setPaneFontSize: vi.fn()
  };
}

const NOW = 10_000_000;
const agentPane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "coder", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`,
  ...over
});
const shellPane = (id: string): TerminalPane => ({ id, kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: `t-${id}` } });
const workspace = (panes: TerminalPane[], over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes,
  focusedPaneId: panes[0]?.id ?? null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "office",
  ...over
});
const st = (state: AgentState, source: "exact" | "estimated" = "exact", over: Partial<AgentStatus> = {}): AgentStatus => ({
  state,
  source,
  lastActivity: null,
  ...over
});
const q = (question: string): AgentQuestion => ({ callId: "c1", question, header: "", options: ["Evet", "Hayır"], multiSelect: false, askedAt: 1 });
const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: id,
  prompt: `İstem ${id}`,
  roleHint: "",
  dependsOn: [],
  state: "ready",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (id: string, subtasks: Subtask[]): BoardTask => ({ id, title: id, goal: "Hedef", state: "running", createdAt: 1, approvedAt: 2, subtasks });
const LONG_QUESTION = "Bu tabloya yeni bir alan eklensin mi, yoksa mevcut yapı mı korunsun, karar ver lütfen";

function setup(
  ws: TerminalWorkspace,
  { statuses = {}, board, language = "tr" }: { statuses?: Record<string, AgentStatus>; board?: Board; language?: "tr" | "en" } = {}
) {
  const commands = commandsMock();
  const onAddAgent = vi.fn();
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: ws.id },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  const agents: AgentStatusValue = { statuses, engines: [], now: NOW, answer: vi.fn(async () => ({ ok: true as const })) };
  const boards: BoardContextValue = {
    boards: board ? { [ws.id]: board } : {},
    command: vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true }))
  };
  render(
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <BoardContext.Provider value={boards}>
            <OfficeView workspace={ws} onAddAgent={onAddAgent} />
          </BoardContext.Provider>
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, onAddAgent };
}

const seat = (id: string) => document.querySelector(`[data-office-seat="${id}"]`) as HTMLButtonElement;

describe("OfficeView — yerleşim", () => {
  it("5 ajan 3+2 satır; kabuk bölmesi koltuk değil, köşede '1 terminal'", () => {
    setup(workspace([...["p1", "p2", "p3", "p4", "p5"].map((id) => agentPane(id)), shellPane("s1")]));
    const rows = [...document.querySelectorAll("[data-office-row]")];
    expect(rows.map((r) => r.querySelectorAll("[data-office-seat]").length)).toEqual([3, 2]);
    expect(within(screen.getByRole("list", { name: "Masalar" })).getAllByRole("listitem")).toHaveLength(5);
    expect(seat("s1")).toBeNull();
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("1 terminal");
  });

  it("boş durum: 'Ofiste kimse yok' + Ajan düğmesi pencereyi istiyor; kabuk notu yine var", () => {
    const { onAddAgent } = setup(workspace([shellPane("s1"), shellPane("s2")]));
    const office = screen.getByRole("region", { name: "Ofis görünümü" });
    expect(within(office).getByText("Ofiste kimse yok")).toBeTruthy();
    fireEvent.click(within(office).getByRole("button", { name: "Ajan" }));
    expect(onAddAgent).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("2 terminal");
    expect(screen.queryByRole("list", { name: "Masalar" })).toBeNull();
  });

  it("kabuk yoksa terminal notu yok", () => {
    setup(workspace([agentPane("p1")]));
    expect(document.querySelector("[data-office-shells]")).toBeNull();
  });
});

describe("OfficeView — etkileşim", () => {
  it("tıklama: önce görünüm Bölmeler, sonra revealPane; balona tıklamak aynı", () => {
    const { commands } = setup(workspace([agentPane("p1"), agentPane("p2")]), { statuses: { p2: st("asking", "exact", { question: q("Devam edilsin mi?") }) } });
    fireEvent.click(seat("p1"));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "panes");
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
    expect(vi.mocked(commands.setWorkspaceView).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(commands.revealPane).mock.invocationCallOrder[0]);
    fireEvent.click(seat("p2").querySelector("[data-balloon]") as HTMLElement);
    expect(commands.revealPane).toHaveBeenLastCalledWith("p2");
    expect(commands.setWorkspaceView).toHaveBeenCalledTimes(2);
  });

  it("klavye: koltuklar ızgara sırasıyla doğal düğme (tab sırası); aria-label ad, rol, durum (tahmini)", () => {
    setup(workspace([agentPane("p1"), agentPane("p2", { agent: { engine: "claude", role: "", roleKind: "custom" } })]), {
      statuses: { p1: st("running"), p2: st("running", "estimated") }
    });
    const buttons = within(screen.getByRole("list", { name: "Masalar" })).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("data-office-seat"))).toEqual(["p1", "p2"]);
    expect(buttons.every((b) => b.tagName === "BUTTON" && b.getAttribute("tabindex") === null)).toBe(true);
    expect(buttons[0].getAttribute("aria-label")).toBe("Ajan p1, coder, Çalışıyor");
    expect(buttons[1].getAttribute("aria-label")).toBe("Ajan p2, Çalışıyor (tahmini)");
    buttons[1].focus();
    expect(document.activeElement).toBe(buttons[1]);
  });

  it("seçim: odaktaki ajanın çerçevesi lime, ötekinde accent yok; kırpılan ad ve rolde title", () => {
    setup(workspace([agentPane("p1", { title: "Çok Uzun Bir Ajan Adı Burada" }), agentPane("p2")], { focusedPaneId: "p2" }));
    expect(seat("p2").getAttribute("aria-pressed")).toBe("true");
    expect(seat("p2").className).toContain("border-accent-500/60");
    expect(seat("p1").getAttribute("aria-pressed")).toBe("false");
    expect(seat("p1").className).not.toContain("accent");
    expect(seat("p1").querySelector('[title="Çok Uzun Bir Ajan Adı Burada"]')).toBeTruthy();
    expect(seat("p1").querySelector('[title="coder"]')).toBeTruthy();
  });
});

describe("OfficeView — durum", () => {
  it("tahmini çalışıyor: hareket sınıfı yok, ≈ var; kesin çalışıyor: eller yazıyor", () => {
    setup(workspace([agentPane("p1"), agentPane("p2")]), { statuses: { p1: st("running"), p2: st("running", "estimated") } });
    expect(seat("p1").querySelectorAll(".office-typing")).toHaveLength(2);
    expect(seat("p1").querySelector("[data-estimated]")).toBeNull();
    expect(seat("p2").getAttribute("data-pose")).toBe("typing");
    expect(seat("p2").querySelector(".office-typing, .office-glow")).toBeNull();
    expect(seat("p2").querySelector("[data-estimated]")?.textContent).toBe("≈");
  });

  it("hareketi azalt: kesin çalışmada da hareket yok", () => {
    (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn((media: string) => ({
      matches: true,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));
    setup(workspace([agentPane("p1")]), { statuses: { p1: st("running") } });
    expect(seat("p1").querySelector(".office-typing, .office-glow")).toBeNull();
  });

  it("soru balonu: kesin asking'te ilk 60 karakter, uyarı tonunda; tahminide yalnız '?'", () => {
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      statuses: { p1: st("asking", "exact", { question: q(LONG_QUESTION) }), p2: st("asking", "estimated", { question: q(LONG_QUESTION) }) }
    });
    const balloon = seat("p1").querySelector("[data-balloon]") as HTMLElement;
    expect(balloon.className).toContain("--status-warning-");
    const text = seat("p1").querySelector("[data-balloon-text]")?.textContent ?? "";
    expect(Array.from(text)).toHaveLength(60);
    expect(text.endsWith("…")).toBe(true);
    expect(seat("p2").querySelector("[data-balloon]")?.textContent).toBe("?");
    expect(seat("p2").querySelector("[data-balloon-text]")).toBeNull();
  });

  it("bilinmiyor (≈ yok), boşta süresi, kurulu değil (boş masa), hata işareti", () => {
    setup(
      workspace([agentPane("p1"), agentPane("p2"), agentPane("p3", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), agentPane("p4")]),
      { statuses: { p2: st("idle", "exact", { lastActivity: NOW - 3 * 60_000 }), p4: st("error") } }
    );
    expect(seat("p1").getAttribute("data-pose")).toBe("unknown");
    expect(seat("p1").textContent).toContain("Bilinmiyor");
    expect(seat("p1").querySelector("[data-estimated]")).toBeNull();
    expect(seat("p2").getAttribute("data-pose")).toBe("resting");
    expect(seat("p2").textContent).toContain("Boşta 3 dk");
    expect(seat("p3").getAttribute("data-pose")).toBe("absent");
    expect(seat("p3").textContent).toContain("Kurulu değil");
    expect(seat("p3").querySelector("[data-person]")).toBeNull();
    expect(seat("p4").querySelector("[data-danger-mark]")).toBeTruthy();
  });

  it("alt görev: en çok 40 karakter, title tam metin; görevsiz ajanda ve pano yokken satır yok", () => {
    const title = "Sipariş tablosuna iade nedeni alanını ekle ve testleri yaz";
    setup(workspace([agentPane("p1"), agentPane("p2")]), {
      board: { workspaceId: "a", tasks: [task("t", [sub("x", { title, state: "running", paneId: "p1" })])] }
    });
    const row = seat("p1").querySelector("[data-office-task]") as HTMLElement;
    expect(Array.from(row.textContent ?? "")).toHaveLength(40);
    expect(row.getAttribute("title")).toBe(title);
    expect(seat("p2").querySelector("[data-office-task]")).toBeNull();
    cleanup();
    setup(workspace([agentPane("p1")]));
    expect(document.querySelector("[data-office-task]")).toBeNull();
  });
});

describe("OfficeView — İngilizce", () => {
  it("boş durum, bölge adı, terminal notu ve tahmini eki", () => {
    setup(workspace([shellPane("s1")]), { language: "en" });
    const office = screen.getByRole("region", { name: "Office view" });
    expect(within(office).getByText("Nobody in the office")).toBeTruthy();
    expect(document.querySelector("[data-office-shells]")?.textContent).toBe("Terminals: 1");
    cleanup();
    setup(workspace([agentPane("p1")]), { language: "en", statuses: { p1: st("idle", "estimated") } });
    expect(seat("p1").getAttribute("aria-label")).toBe("Ajan p1, coder, Idle (estimated)");
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/officeView.test.tsx`
Expected: FAIL — `Failed to resolve import "../src/office/OfficeView"`.

- [ ] **Step 3: Metinler** — `src/i18n/tr.ts`, `src/i18n/en.ts`

`tr.ts`'in sonundaki

```ts
  "board.closeWorkspaceTasks": "Bu alanın panosundaki {count} görev de silinir."
};
```

satırlarını şununla değiştir:

```ts
  "board.closeWorkspaceTasks": "Bu alanın panosundaki {count} görev de silinir.",
  "office.label": "Ofis görünümü",
  "office.seats": "Masalar",
  "office.empty": "Ofiste kimse yok",
  "office.shellCount": "{count} terminal",
  "office.estimatedSuffix": "(tahmini)"
};
```

`en.ts`'in sonundaki

```ts
  "board.closeWorkspaceTasks": "The {count} tasks on this workspace's board will be deleted too."
};
```

satırlarını şununla değiştir:

```ts
  "board.closeWorkspaceTasks": "The {count} tasks on this workspace's board will be deleted too.",
  "office.label": "Office view",
  "office.seats": "Desks",
  "office.empty": "Nobody in the office",
  "office.shellCount": "Terminals: {count}",
  "office.estimatedSuffix": "(estimated)"
};
```

- [ ] **Step 4: Bileşen** — `src/office/OfficeView.tsx`

```tsx
// Ofis görünümü (spec 2026-10-18 ofis-gorunumu §3–§6): alanın ajanları
// masalarında. Yeni bilgi yok: durum `useAgentStatuses`, alt görev
// `useBoards` + `activeSubtaskOf`. Düz kabuk bölmeleri ajan değil; yalnız
// köşede sayıları. Karaktere (ya da balonuna) tıklamak görünümü Bölmeler'e
// döndürüp bölmeyi öne getiriyor. Lime yalnız odaktaki ajanın çerçevesi.
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import type { AgentStatus } from "../../app-electron/shared/agentTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes, TONE_DOT } from "../agents/agentView";
import { ENGINE_LABEL, agentName } from "../agents/agentLabels";
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardDisplay";
import { OFFICE_TASK_MAX, clipText, officeLayout, officeSeat } from "./officeLayout";
import OfficeCharacter from "./OfficeCharacter";

/** Satırlar arası ve koltuklar arası boşluk (rem); hücre genişliği hesabında da kullanılıyor. */
const GAP_REM = 0.75;

export default function OfficeView({ workspace, onAddAgent }: { workspace: TerminalWorkspace; onAddAgent: () => void }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const { statuses, now } = useAgentStatuses();
  const agents = agentPanes(workspace);
  const shells = workspace.panes.length - agents.length;
  const grid = officeLayout(agents.length);
  const rows: TerminalPane[][] = [];
  let start = 0;
  for (const size of grid.rows) {
    rows.push(agents.slice(start, start + size));
    start += size;
  }
  // Hücreler bütün satırlarda eşit: eksik son satır ortalanıyor, büyümüyor.
  const cellWidth = `calc((100% - ${(grid.cols - 1) * GAP_REM}rem) / ${Math.max(1, grid.cols)})`;
  const open = (paneId: string) => {
    // Önce görünüm: bölmeler görünür olunca odak xterm'e geçebiliyor.
    commands.setWorkspaceView(workspace.id, "panes");
    commands.revealPane(paneId);
  };
  return (
    <section aria-label={t("office.label")} data-office="" className="relative flex h-full min-h-0 flex-col overflow-auto p-4">
      {agents.length === 0 ? (
        <div data-office-empty="" className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm text-slate-200">{t("office.empty")}</p>
          <button type="button" onClick={onAddAgent} className={PRIMARY_BUTTON}>
            <Plus size={12} />
            {t("agents.addAgent")}
          </button>
        </div>
      ) : (
        <div role="list" aria-label={t("office.seats")} className="m-auto flex w-full max-w-4xl flex-col" style={{ gap: `${GAP_REM}rem` }}>
          {rows.map((seats, r) => (
            <div key={r} data-office-row="" className="flex justify-center" style={{ gap: `${GAP_REM}rem` }}>
              {seats.map((pane) => (
                <div key={pane.id} role="listitem" className="min-w-0" style={{ width: cellWidth }}>
                  <OfficeSeat
                    pane={pane}
                    status={statuses[pane.id]}
                    now={now || Date.now()}
                    selected={workspace.focusedPaneId === pane.id}
                    onOpen={() => open(pane.id)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {shells > 0 && (
        <p data-office-shells="" className="pointer-events-none absolute bottom-2 right-3 font-mono text-2xs tabular-nums text-slate-500">
          {t("office.shellCount", { count: shells })}
        </p>
      )}
    </section>
  );
}

function OfficeSeat({
  pane,
  status,
  now,
  selected,
  onOpen
}: {
  pane: TerminalPane;
  status: AgentStatus | undefined;
  now: number;
  selected: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  const { boards } = useBoards();
  const seat = officeSeat(pane, status, now);
  const name = agentName(pane, t);
  const role = pane.agent?.role ?? "";
  const engine = t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"]);
  const state = t(seat.key, seat.params);
  const job = activeSubtaskOf(boards, pane.id);
  const label = [name, role, seat.estimated ? `${state} ${t("office.estimatedSuffix")}` : state].filter(Boolean).join(", ");
  return (
    <button
      type="button"
      data-office-seat={pane.id}
      data-pose={seat.pose}
      aria-label={label}
      aria-pressed={selected}
      onClick={onOpen}
      className={`relative flex w-full min-w-0 cursor-pointer flex-col items-center gap-1 rounded-md border bg-card px-2 pb-2 pt-7 text-center transition-colors ${
        selected ? "border-accent-500/60" : "border-line hover:border-slate-500"
      }`}
    >
      {/* Soru balonu düğmenin içinde: ayrı bir iç içe düğme yok, tıklaması karakterinkiyle aynı. */}
      {seat.pose === "asking" && (
        <span
          data-balloon=""
          className="absolute left-1/2 top-1 flex max-w-[90%] -translate-x-1/2 items-center gap-1 rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-2xs text-[var(--status-warning-text)]"
        >
          <span aria-hidden="true" className="font-semibold">
            ?
          </span>
          {seat.question && (
            <span data-balloon-text="" className="min-w-0 truncate">
              {seat.question}
            </span>
          )}
        </span>
      )}
      <OfficeCharacter pose={seat.pose} motion={seat.motion} color={PANE_COLOR_VAR[pane.color ?? "gray"]} />
      <span className="flex w-full min-w-0 items-baseline justify-center gap-1.5">
        <span title={name} className="min-w-0 truncate text-xs font-medium text-slate-200">
          {name}
        </span>
        {role && (
          <span title={role} className="min-w-0 truncate text-2xs text-slate-500">
            {role}
          </span>
        )}
      </span>
      <span className="flex w-full min-w-0 items-center justify-center gap-1.5 text-2xs">
        <span data-tone={seat.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[seat.tone]}`} />
        <span className="min-w-0 truncate text-slate-300">{state}</span>
        {seat.estimated && (
          <span data-estimated="" title={t("agents.estimatedHint")} className="shrink-0 text-slate-500">
            ≈
          </span>
        )}
        <span className="min-w-0 shrink truncate text-slate-500">{engine}</span>
      </span>
      {job && (
        <span data-office-task="" title={job.subtask.title} className="w-full min-w-0 truncate text-2xs text-slate-500">
          {clipText(job.subtask.title, OFFICE_TASK_MAX)}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/officeView.test.tsx tests/officeCharacter.test.tsx tests/i18n.test.ts`
Expected: PASS (kaynak taraması artık `OfficeView.tsx`'i de tarıyor: `--status-warning-*` ve `accent-500` serbest, hex/rgb/lime yok).

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 6: Commit**

```bash
git add src/office/OfficeView.tsx src/i18n/tr.ts src/i18n/en.ts tests/officeView.test.tsx
git commit -m "Ofis: gorunum bileseni (izgara, balon, bos durum, tiklama)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Üç seçenekli geçiş ve `TerminalMode` bağlantısı

**Files:**
- Modify: `src/agents/TeamStrip.tsx:1-55` (içe aktarma, prop türleri, radyo listesi)
- Modify: `src/terminal/TerminalMode.tsx:1-25` (içe aktarma), `:46-49` (`boardOpen`), `:67-76` (`TeamStrip`), `:80-116` (bölme kabı, `focusable`, Pano/Ofis)
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts` (`office.view`)
- Test: `tests/officeScreen.test.tsx`

**Interfaces:**
- Consumes: Task 1'den `WorkspaceView`, `setWorkspaceView(id, view: WorkspaceView)`; Task 4'ten `OfficeView({ workspace, onAddAgent })`. Mevcut: `BoardView`, `DecisionsPanel`, `AddAgentDialog` (`setAgentDialog`), `WorkspaceLayout`'un `focusable` propu.
- Produces:

```ts
// TeamStrip props (değişen iki alan)
view: WorkspaceView;
onView: (view: WorkspaceView) => void;
// TerminalMode: görünüm = active?.view ?? "panes"; bölme kabı yalnız "panes"te görünür ve yalnız orada xterm active.
```

i18n anahtarı (bu task ekler): `office.view`.

- [ ] **Step 1: Kırmızı test** — `tests/officeScreen.test.tsx`

```tsx
// @vitest-environment jsdom
// Bölmeler | Pano | Ofis (spec 2026-10-18 ofis-gorunumu §2, §5): üç seçenekli
// geçiş; ofiste bölmeler gizli ama takılı ve xterm odak almıyor; Kararlar
// yerinde; boş ofisten "+ Ajan" penceresi; Pano görünümü değişmedi.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalMode from "../src/terminal/TerminalMode";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { Board } from "../app-electron/shared/boardTypes";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId, active }: { sessionId: string; active: boolean }) => (
    <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />
  )
}));

let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = { pickFolder: vi.fn(), axetAgents: vi.fn(async () => []) };
});
afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

function commandsMock(): TerminalCommands {
  return {
    restore: vi.fn(),
    startFresh: vi.fn(),
    addWorkspace: vi.fn(),
    selectWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    closeWorkspace: vi.fn(),
    addPane: vi.fn(),
    addAgent: vi.fn(),
    revealPane: vi.fn(),
    setWorkspaceRoot: vi.fn(),
    setWorkspaceVerify: vi.fn(),
    setWorkspaceView: vi.fn(),
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn(),
    movePane: vi.fn(),
    resizeSplit: vi.fn(),
    equalizeSplit: vi.fn(),
    minimizePane: vi.fn(),
    restorePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    setPaneFontSize: vi.fn()
  };
}

const agentPane = (id: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`
});
const shellPane = (id: string): TerminalPane => ({ id, kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: `t-${id}` } });
const workspace = (over: Partial<TerminalWorkspace> = {}): TerminalWorkspace => ({
  id: "a",
  name: "Alan a",
  panes: [agentPane("p1")],
  focusedPaneId: "p1",
  maximizedPaneId: null,
  unread: false,
  error: false,
  ...over
});

function setup(ws: TerminalWorkspace, { board, language = "tr" }: { board?: Board; language?: "tr" | "en" } = {}) {
  const commands = commandsMock();
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) };
  const ui = (w: TerminalWorkspace) => {
    const store: TerminalStoreValue = {
      state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [w], activeWorkspaceId: w.id },
      commands,
      defaultKind: "cmd",
      defaultCwd: "C:\\a",
      agentCwd: "C:\\a"
    };
    const boards: BoardContextValue = {
      boards: board ? { [w.id]: board } : {},
      command: vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true }))
    };
    return (
      <LanguageProvider language={language}>
        <TerminalStoreContext.Provider value={store}>
          <AgentStatusContext.Provider value={agents}>
            <BoardContext.Provider value={boards}>
              <TerminalMode />
            </BoardContext.Provider>
          </AgentStatusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
  };
  const r = render(ui(ws));
  return { commands, rerender: (w: TerminalWorkspace) => r.rerender(ui(w)) };
}

const office = () => screen.queryByRole("region", { name: "Ofis görünümü" });
const xterm = () => screen.getByTestId("xterm-t-p1");

describe("Bölmeler | Pano | Ofis", () => {
  it("geçiş üç seçenekli; Ofis seçimi alana kaydediliyor", () => {
    const { commands } = setup(workspace());
    const group = screen.getByRole("radiogroup", { name: "Görünüm" });
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Bölmeler", "Pano", "Ofis"]);
    expect(within(group).getByRole("radio", { name: "Bölmeler" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(group).getByRole("radio", { name: "Ofis" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "office");
    expect(office()).toBeNull();
  });

  it("ofiste: Ofis seçili, bölmeler gizli ama takılı, xterm active değil, Kararlar yerinde, Pano yok", () => {
    setup(workspace({ view: "office" }));
    expect(screen.getByRole("radio", { name: "Ofis" }).getAttribute("aria-checked")).toBe("true");
    expect(office()).toBeTruthy();
    const cell = document.querySelector('[data-pane="p1"]') as HTMLElement;
    expect(cell).toBeTruthy();
    expect((cell.closest("[data-workspace]") as HTMLElement).className.split(" ")).toContain("hidden");
    expect(xterm().getAttribute("data-active")).toBe("false");
    expect(screen.getByRole("complementary", { name: "Kararlar" })).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Taslak" })).toBeNull();
  });

  it("karaktere tıklama Bölmeler'e döndürüp bölmeyi öne getiriyor; Bölmeler'e dönünce odaktaki bölme active", () => {
    const { commands, rerender } = setup(workspace({ view: "office" }));
    fireEvent.click(document.querySelector('[data-office-seat="p1"]') as HTMLElement);
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "panes");
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
    rerender(workspace());
    expect(office()).toBeNull();
    expect(xterm().getAttribute("data-active")).toBe("true");
    expect((document.querySelector('[data-pane="p1"]')?.closest("[data-workspace]") as HTMLElement).className.split(" ")).not.toContain("hidden");
  });

  it("boş ofis: Ajan düğmesi mevcut 'Ajan ekle' penceresini açıyor", () => {
    setup(workspace({ view: "office", panes: [shellPane("s1")], focusedPaneId: "s1" }));
    fireEvent.click(within(office() as HTMLElement).getByRole("button", { name: "Ajan" }));
    expect(screen.getByText("Ajan ekle")).toBeTruthy();
  });

  it("Pano görünümü değişmedi: Pano seçili, sütunlar var, ofis yok, xterm active değil", () => {
    setup(workspace({ view: "board" }), { board: { workspaceId: "a", tasks: [] } });
    expect(screen.getByRole("radio", { name: "Pano" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("list", { name: "Taslak" })).toBeTruthy();
    expect(office()).toBeNull();
    expect(xterm().getAttribute("data-active")).toBe("false");
  });

  it("İngilizce: Office seçeneği", () => {
    setup(workspace({ view: "office" }), { language: "en" });
    expect(screen.getByRole("radio", { name: "Office" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("region", { name: "Office view" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/officeScreen.test.tsx`
Expected: FAIL — radyolar `["Bölmeler", "Pano"]`; "Ofis" radyosu yok.

- [ ] **Step 3: Metin** — `src/i18n/tr.ts`, `src/i18n/en.ts`

`tr.ts`'te

```ts
  "office.estimatedSuffix": "(tahmini)"
};
```

yerine:

```ts
  "office.estimatedSuffix": "(tahmini)",
  "office.view": "Ofis"
};
```

`en.ts`'te

```ts
  "office.estimatedSuffix": "(estimated)"
};
```

yerine:

```ts
  "office.estimatedSuffix": "(estimated)",
  "office.view": "Office"
};
```

- [ ] **Step 4: Ekip şeridi** — `src/agents/TeamStrip.tsx`

`import { activeSubtaskOf } from "../board/boardDisplay";` satırının ALTINA:

```ts
import type { WorkspaceView } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";

const VIEW_KEY: Record<WorkspaceView, TranslationKey> = {
  panes: "board.viewPanes",
  board: "board.viewBoard",
  office: "office.view"
};
const VIEWS: readonly WorkspaceView[] = ["panes", "board", "office"];
```

Prop türlerinde

```ts
  view: "panes" | "board";
  onView: (view: "panes" | "board") => void;
```

yerine:

```ts
  view: WorkspaceView;
  onView: (view: WorkspaceView) => void;
```

Radyo grubunda

```tsx
      {/* Bölmeler | Pano (spec 2026-10-18 gorev-panosu §8); seçim lime, alan başına hatırlanıyor. */}
```

yorumunu

```tsx
      {/* Bölmeler | Pano | Ofis (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2); seçim lime, alan başına hatırlanıyor. */}
```

yap; `{(["panes", "board"] as const).map((v) => (` satırını `{VIEWS.map((v) => (` yap; düğme metnindeki

```tsx
            {t(v === "panes" ? "board.viewPanes" : "board.viewBoard")}
```

satırını şununla değiştir:

```tsx
            {t(VIEW_KEY[v])}
```

- [ ] **Step 5: Bağlantı** — `src/terminal/TerminalMode.tsx`

`import BoardView from "../board/BoardView";` satırının ALTINA:

```ts
import OfficeView from "../office/OfficeView";
import type { WorkspaceView } from "../../app-electron/shared/types";
```

```ts
  const boardOpen = active?.view === "board";
```

satırını şununla değiştir:

```ts
  // Görünüm alan başına; bölmeler yalnız "panes"te görünür, öbürlerinde gizli ama takılı.
  const view: WorkspaceView = active?.view ?? "panes";
```

`TeamStrip`'e giden `view={boardOpen ? "board" : "panes"}` satırını `view={view}` yap.

Bölme kabındaki

```tsx
              className={`${w.id === state.activeWorkspaceId && !boardOpen ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}
```

satırını şununla değiştir:

```tsx
              className={`${w.id === state.activeWorkspaceId && view === "panes" ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}
```

`WorkspaceLayout`'un

```tsx
                    focusable={state.visible && w.id === state.activeWorkspaceId}
```

satırını şununla değiştir (gizli xterm odak çalmıyor; Bölmeler'e dönünce yeniden `fit` + `focus` alıyor):

```tsx
                    focusable={state.visible && w.id === state.activeWorkspaceId && view === "panes"}
```

Pano bloğunu

```tsx
          {state.phase === "ready" && active && boardOpen && (
            <div className="absolute inset-0">
              <BoardView workspace={active} />
            </div>
          )}
```

şununla değiştir:

```tsx
          {state.phase === "ready" && active && view === "board" && (
            <div className="absolute inset-0">
              <BoardView workspace={active} />
            </div>
          )}
          {state.phase === "ready" && active && view === "office" && (
            <div className="absolute inset-0">
              <OfficeView workspace={active} onAddAgent={() => setAgentDialog({})} />
            </div>
          )}
```

Dosyanın ilk satırındaki yorumu da güncelle:

```ts
// Ajanlar ekranının sağ tarafı (spec 2026-10-17 ajan-alani §4): üstte ekip şeridi, ortada bölmeler. Bütün alanlar HEP takılı: seçili olmayanlar hidden.
```

yerine:

```ts
// Ajanlar ekranının sağ tarafı (spec 2026-10-17 ajan-alani §4): üstte ekip şeridi, ortada bölmeler, Pano ya da Ofis (spec 2026-10-18). Bütün alanlar HEP takılı: seçili olmayanlar ve Pano/Ofis'teyken bölmeler hidden.
```

- [ ] **Step 6: Yeşili gör**

Run: `npx vitest run tests/officeScreen.test.tsx tests/boardScreen.test.tsx tests/terminalMode.test.tsx tests/officeView.test.tsx tests/i18n.test.ts`
Expected: PASS (hepsi). `boardScreen`'in "geçiş: Pano seçimi…" testi radyoları adla aradığı için üçüncü radyodan etkilenmez.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 7: Commit**

```bash
git add src/agents/TeamStrip.tsx src/terminal/TerminalMode.tsx src/i18n/tr.ts src/i18n/en.ts tests/officeScreen.test.tsx
git commit -m "Ofis: Bolmeler | Pano | Ofis gecisi ve TerminalMode baglantisi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Kullanım rehberi, tam doğrulama ve elle deneme listesi

**Files:**
- Modify: `KULLANIM-REHBERI.md` ("### Görev Panosu" bölümünün sonu, "## Klavye Kısayolları" başlığının önü)

**Interfaces:**
- Consumes: bütün önceki task'lar.
- Produces: rehberde "Ofis görünümü" alt bölümü; yeşil tam takım; kullanıcıya elle deneme listesi.

- [ ] **Step 1: Rehber** — `KULLANIM-REHBERI.md`

"### Görev Panosu" bölümünün son maddesinden

```markdown
- SAP yazma onayı, QA/PRD salt okunur kuralı ve rol kapısı aynen geçerlidir:
  modül danışmanı rolünde pano görev çalıştırabilir ama ajan SAP'ye
  geliştirme yazamaz.
```

sonra, "## Klavye Kısayolları" başlığının hemen ÖNÜNE (arada bir boş satır):

```markdown
### Ofis görünümü

Üst şeritteki **Bölmeler | Pano | Ofis** geçişinde **Ofis**, alandaki
ajanları masalarında oturan karakterler olarak gösterir (seçim alan başına
hatırlanır). Yeni bir bilgi üretmez; ekip şeridindeki durumu ve panodaki
alt görevi tek bakışta özetler.

- **Çalışıyor**: ekran parlar, eller yazar. Durumu tahmini (≈) olan
  ajanlarda (Claude Code, Codex, Gemini, özel komut) aynı poz durağandır;
  hareket yalnız kesin durumda olur.
- **Soru soruyor**: başın üstünde sarı bir "?" balonu; axet-code ajanında
  sorunun ilk 60 karakteri balonda yazar. Cevabı sağdaki **Kararlar**
  panelinden ya da terminalden verirsin.
- **Boşta / Bitti**: karakter arkasına yaslanır, ekran söner; "Boşta 3 dk"
  gibi süre yazar. **Hata**: ekranda kırmızı bir işaret.
  **Bilinmiyor**: durum henüz gelmediyse karakter soluktur.
  **Kurulu değil**: motor bu bilgisayarda yoksa masa boştur.
- Masanın altında ad, rol ve motor; ajan panodan bir alt görev
  yürütüyorsa başlığı (uzunsa kısaltılır, üstüne gelince tamamı görünür).
- Karaktere tıklayınca (ya da Tab ile gelip Enter/Space) görünüm
  **Bölmeler**'e döner ve o ajanın terminali öne gelir; küçültülmüşse geri
  açılır. Seçili/odaktaki ajanın çerçevesi vurgu rengindedir.
- Düz terminaller ofiste görünmez; sağ alt köşede sayıları yazar. Ajan
  yoksa "Ofiste kimse yok" ve **Ajan** düğmesi çıkar.
- Ofisteyken terminaller kapanmaz, yalnız gizlenir. Windows'ta "Animasyon
  efektlerini göster" kapalıysa (hareketi azalt) ofiste hiçbir şey kıpırdamaz.
```

- [ ] **Step 2: Tam doğrulama**

Run: `npm run typecheck`
Expected: temiz.

Run: `npx vitest run > .superpowers/vitest-ofis.txt 2>&1` ve dosyanın sonundaki özeti oku.
Expected: bütün dosyalar PASS. Bir test kırmızıysa: bu planın bilinçli değiştirdiği bir davranışı eski hâliyle bekliyorsa (ör. Pano görünümünde gizli xterm'in `data-active="true"` olması, radyo sayısının 2 olması, kayıtta `view: "office"`'in atılması), beklentiyi yeni davranışa çevir ve hangi sapmaya dayandığını commit mesajına yaz; değilse sistematik hata ayıklamaya geç (bu task'ı kapatmadan).

Run: `git status --short`
Expected: yalnız `KULLANIM-REHBERI.md` değişmiş (izlenmeyen `docs/superpowers/specs/2026-10-18-ofis-gorunumu-design.md`, bu plan ve `resources/sap-toolkit/auth-plus/scripts/` dalda zaten olabilir; dokunma). `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*` stage edilmemiş.

- [ ] **Step 3: Commit**

```bash
git add KULLANIM-REHBERI.md
git commit -m "Rehber: Ofis gorunumu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Elle deneme listesini kullanıcıya ver** (spec §7; uygulamayı sen başlatma)

1. Bir alanda iki axet-code ajanı ve bir Claude Code ajanı aç, bir de düz terminal. **Ofis**'e geç → üç masa tek sırada; sağ altta "1 terminal"; düz terminalin karakteri yok.
2. axet-code ajanlarından birine uzun sürecek bir iş ver → ekranı parlıyor, elleri yazıyor. Claude ajanına iş ver → aynı poz, hareket yok, durumun yanında ≈; karakterin üstüne Tab ile gelince ekran okuyucu "… Çalışıyor (tahmini)" demeli.
3. axet-code ajanına soru sordurt (ör. "bana iki seçenek sun ve hangisini istediğimi sor") → başın üstünde sarı "?" balonu ve sorunun ilk 60 karakteri; Kararlar panelinde aynı soru. Balona tıkla → Bölmeler'e döner, o terminal öne gelir ve klavye o terminalde.
4. Bir axet-code ajanını kapat (`/exit` ile kabuk istemine dön) → karakter arkasına yaslanır, "Bitti"; soru balonu kalmamalı.
5. Bir ajanı küçült, Ofis'e geç, o karaktere tıkla → bölme şeritten geri gelip öne çıkmalı.
6. Ofis'teyken sağdaki Kararlar'da **Terminale git**'e bas → görünüm Ofis'te kalır (Pano'daki gibi; sapma 9). Bu davranış rahatsız ediyorsa not et: Kararlar ve ekip şeridi tıklamasının görünümü Bölmeler'e çevirmesi ayrı bir karar (Pano'yu da etkiler).
7. Windows Ayarlar → Erişilebilirlik → Görsel efektler → **Animasyon efektleri** kapat (uygulama açıkken) → ofiste hareket hemen durmalı; aç → geri gelmeli.
8. Pencereyi daraltıp 7–9 ajanla dene → ızgara küçülür, adlar "…" ile kısalır, taşma/yatay kaydırma olmamalı. Uygulamayı kapatıp aç → alan Ofis'te açılmalı.

---

## Spec kapsama özeti

| Spec | Task |
|---|---|
| §1 amaç, ilke (tahmini ≈ hareketsiz, bilinmiyor, reduced-motion), kopyalanmayan çizim | 2, 3, 4; Global Constraints |
| §2 `view: "office"`, eski kayıtlar, bilinmeyen değer, üç seçenekli radiogroup, bölmeler gizli/takılı, veri kaynakları | 1, 4, 5 |
| §3 `officeLayout(count)` 1–3/4–6/7–9, kabuk bölmesi görünmez + "N terminal", boş durum + Ajan | 2, 4, 5 |
| §4 karakter tablosu (7 satır), bölme rengi, lime seçim, ad · rol · motor, alt görev ≤ 40, CSS hareket, reduced-motion, yeni renk yok | 2, 3, 4 |
| §5 tıklama/Enter/Space → Bölmeler + `revealPane` (küçültülmüş geri açılır), balon tıklaması, tab sırası, odak halkası, `aria-label`, Kararlar yerinde | 4, 5 |
| §6 durum yok → bilinmiyor; pano yok → alt görev satırı yok; küçük pencere → kırpma + title | 2, 4, 6 (elle 8) |
| §7 testler (saf, bileşen, i18n) + elle deneme | 1–5, 6 |
| §8 kapsam dışı (sürükleme, özelleştirme, ses, mola, alanlar arası, lider karakteri) | yapılmıyor |
