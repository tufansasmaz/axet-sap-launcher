# Terminal Modu Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Kenar çubuğuna dördüncü mod olarak "Terminal" eklemek: solda çalışma alanları, sağda seçili alanın otomatik ızgarasında aynı anda görünen ve çalışan 1–9 terminal bölmesi. Logon'un alttaki TerminalPanel'i kalkıyor.

**Mimari:** Düzen verisi (alan adı, bölme türü, klasör) config'te; çalışma durumu yalnız bellekte, saf bir indirgeyicide (`terminalReducer.ts`). `TerminalStoreProvider` indirgeyiciyi `window.api` ile bağlıyor (başlatma sırası, pty olayları, kaydetme). Ekran (`TerminalMode`) Sohbet gibi hep takılı, mod değişince `hidden`.

**Teknoloji:** Electron, React 18 (StrictMode), TypeScript, Tailwind, `@lydell/node-pty`, xterm (`EmbeddedTerminal`), vitest 2 + jsdom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-29-terminal-modu-design.md`

## Genel Kurallar

- Dal `tasarim/grafit`; birleştirme, push, sürüm artırma açık onay olmadan YOK.
- Yeni paket eklenmiyor (jest-dom, user-event yok). `.tsx` testleri `// @vitest-environment jsdom` ile başlıyor ve `<LanguageProvider language="tr">` ile sarılıyor.
- En fazla **9** bölme / alan, **6** alan. Bölme en az **%8** (`min = 0.08`). Aynı anda en fazla **2** süreç başlıyor.
- Terminal modu bölmeleri klasör YARATMIYOR (`{ createDir: false }`); diğer çağıranlar (sohbet vb.) bugünkü gibi yaratıyor.
- Diske yalnız alan adı, bölme türü ve klasör yolu yazılıyor. ADT token'ı config'e, düzene, loga yazılmıyor.
- `EmbeddedTerminal`'ın davranışına (özellikle yapıştırma) dokunulmuyor. Ctrl+V / sağ tık elle yakalanmıyor.
- `app-electron/main/store.ts` `mt()` ÇAĞIRMIYOR (döngüsel içe aktarma: `i18n/index.ts` `loadConfig`'i içe aktarıyor). Ad doğrudan `MAIN_TR`/`MAIN_EN`'den kuruluyor.
- vibe değerleri birebir kopyalanmıyor; yalnız mevcut Grafit token'ları (`bg-card`, `border-line`, `bg-accent-400`, `z-dropdown` …).
- Commit mesajı ASCII Türkçe, sonunda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Kod yorumları tam Türkçe harflerle. `git add` dosya dosya, asla `-A`.
- İçinde ters bölü (`\`) olan dosyalar Bash heredoc/sed ile değil Write/Edit ile yazılıyor.
- Tam test: `npx vitest run > .superpowers/vitest.log 2>&1` (~95 sn), sonra `tail -40` ile oku. Bilinen kararsızlar: `scriptBehaviour`, `scriptStore`.
- Tip denetimi: `npm run -s typecheck`.

## İnceleme Odağı

Testlerin doğrudan sınamadığı, kullanıcıyı en çok ısırabilecek beş durum:

1. **Ctrl+R sonrası öksüz pty:** Renderer yenilenince ana süreçteki eski kabuklar kapanmalı ve yeni başlatmalar temizlik bitmeden başlamamalı (Görev 5'te "disposeAll bitmeden başlamıyor" testi).
2. **Başlatma sürerken bölme kapatma / yeniden başlatma:** Geç gelen pty kimliği sahipsiz kalmamalı, kapatılmalı (Görev 5'te "kapanan bölmenin geç pty'si kapatılıyor" testi).
3. **Elle bozulmuş config:** Yinelenen kimlik, bilinmeyen tür, dizi olmayan alan uygulamayı açılışta düşürmemeli (Görev 1 testleri).
4. **Gizli alan / gizli mod:** Terminal modu gizliyken gelen çıktı alanı "okunmadı" yapmalı; görünür olunca bayrak silinmeli (Görev 4 ve 5 testleri).
5. **Sürükleme sınırı:** Ayırıcı hangi hızda çekilirse çekilsin bölme %8'in altına inmemeli, oranların toplamı değişmemeli (Görev 2 testleri).

---

## Dosya Haritası

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `app-electron/shared/terminalLayout.ts` (yeni) | 1 | Sınırlar, tür listesi, config ayıklama |
| `app-electron/shared/types.ts` | 1 | `TerminalPaneKind`, `SavedTerminal*`, `AppConfig` alanları |
| `app-electron/main/store.ts` | 1 | Okurken ayıklama, varsayılanlar |
| `app-electron/main/i18n/tr.ts`, `en.ts` | 1 | `terminal.workspaceName` |
| `src/terminal/gridLayout.ts` (yeni) | 2 | Izgara hesabı, oran sürükleme |
| `src/lib/paths.ts` | 2 | `middleEllipsis` |
| `app-electron/main/terminalManager.ts` | 3 | `createDir: false` seçeneği |
| `app-electron/main/index.ts` | 3 | IPC: seçenek + `terminal:disposeAll` |
| `app-electron/preload/index.ts`, `src/window.d.ts` | 3 | Köprü |
| `src/stores/terminalTypes.ts` (yeni) | 4 | Bellek tipleri, eylemler |
| `src/stores/terminalReducer.ts` (yeni) | 4 | Saf indirgeyici + yardımcılar |
| `src/stores/terminalStoreContext.ts` (yeni) | 5 | Context + `useTerminalStore` |
| `src/stores/terminalStore.tsx` (yeni) | 5 | Sağlayıcı: IPC, sıra, kayıt |
| `src/shell/activity.ts`, `Sidebar.tsx`, `useShellShortcuts.ts` | 6 | Dördüncü mod, Ctrl+4 |
| `src/i18n/tr.ts`, `en.ts` | 6, 9 | Metinler |
| `src/components/TerminalSidebar.tsx` (yeni) | 7 | Çalışma alanı listesi |
| `src/terminal/TerminalMode.tsx`, `TerminalPaneView.tsx`, `NewPaneDialog.tsx` (yeni) | 8 | Sağ taraf |
| `src/App.tsx`, `src/components/TerminalPanel.tsx` (silinir), `src/shell/Sidebar.tsx` (bir yorum) | 9 | Bağlama, eskiyi kaldırma |
| `tests/appTerminalWiring.test.ts` (yeni) | 9 | Eski panel geri gelmesin kilidi |

Her görevin kendi test dosyası görevin **Dosyalar** bölümünde yazıyor.

---

### Görev 1: Config — tipler ve okurken ayıklama

**Dosyalar:**
- Oluştur: `app-electron/shared/terminalLayout.ts`
- Değiştir: `app-electron/shared/types.ts` (`TerminalMode` tanımının altı, ~l.304; `AppConfig` ~l.323)
- Değiştir: `app-electron/main/store.ts` (`defaultConfig` ~l.83, `loadConfig` ~l.144)
- Değiştir: `app-electron/main/i18n/tr.ts`, `app-electron/main/i18n/en.ts`
- Test: `tests/terminalConfig.test.ts`

**Arayüzler:**
- Üretir:
  - `type TerminalPaneKind = "axet" | "cmd" | "powershell"`
  - `interface SavedTerminalPane { id: string; kind: TerminalPaneKind; cwd: string }`
  - `interface SavedTerminalWorkspace { id: string; name: string; panes: SavedTerminalPane[] }`
  - `AppConfig.terminalWorkspaces: SavedTerminalWorkspace[]`, `AppConfig.terminalActiveWorkspaceId: string | null`
  - `MAX_TERMINAL_PANES = 9`, `MAX_TERMINAL_WORKSPACES = 6`, `TERMINAL_MISSING_DIR = "TERMINAL_MISSING_DIR"`, `TERMINAL_PANE_KINDS`
  - `isTerminalPaneKind(v: unknown): v is TerminalPaneKind`
  - `firstFreeWorkspaceNumber(names: readonly string[], nameFor: (n: number) => string): number`
  - `normalizeTerminalWorkspaces(raw: unknown, nameFor: (n: number) => string): SavedTerminalWorkspace[]`
  - `normalizeActiveWorkspaceId(raw: unknown, workspaces: readonly SavedTerminalWorkspace[]): string | null`

- [ ] **Adım 1: Başarısız testi yaz** — `tests/terminalConfig.test.ts`

```ts
// Terminal modu düzeninin config'ten okunması (spec §4.1).
//
// Dosya elle düzenlenebilir ya da eski bir sürümden gelebilir; bozuk bir
// alan uygulamayı açılışta düşürmemeli, yalnızca atlanmalı.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_TERMINAL_PANES,
  MAX_TERMINAL_WORKSPACES,
  firstFreeWorkspaceNumber,
  normalizeActiveWorkspaceId,
  normalizeTerminalWorkspaces
} from "../app-electron/shared/terminalLayout";

const nameFor = (n: number) => `Alan ${n}`;

describe("normalizeTerminalWorkspaces", () => {
  it("dizi olmayan değer boş liste", () => {
    for (const raw of [undefined, null, "x", 3, {}]) {
      expect(normalizeTerminalWorkspaces(raw, nameFor)).toEqual([]);
    }
  });

  it("geçerli düzen aynen kalıyor", () => {
    const raw = [{ id: "w1", name: "D01", panes: [{ id: "p1", kind: "axet", cwd: "C:\\a" }] }];
    expect(normalizeTerminalWorkspaces(raw, nameFor)).toEqual(raw);
  });

  it("bozuk bölmeler atlanıyor: bilinmeyen tür, boş klasör, boş/uzun/yinelenen kimlik", () => {
    const raw = [
      {
        id: "w1",
        name: "D01",
        panes: [
          { id: "p1", kind: "bash", cwd: "C:\\a" },
          { id: "p2", kind: "cmd", cwd: "  " },
          { id: "", kind: "cmd", cwd: "C:\\a" },
          { id: "x".repeat(101), kind: "cmd", cwd: "C:\\a" },
          { id: "p3", kind: "cmd", cwd: "C:\\a" },
          { id: "p3", kind: "powershell", cwd: "C:\\b" },
          null,
          "p4"
        ]
      }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor)[0].panes).toEqual([{ id: "p3", kind: "cmd", cwd: "C:\\a" }]);
  });

  it("bölme kimliği alanlar arasında da tekil", () => {
    const raw = [
      { id: "w1", name: "A", panes: [{ id: "p1", kind: "cmd", cwd: "C:\\a" }] },
      { id: "w2", name: "B", panes: [{ id: "p1", kind: "cmd", cwd: "C:\\b" }] }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor)[1].panes).toEqual([]);
  });

  it("geçersiz ya da yinelenen kimlikli alan atlanıyor", () => {
    const raw = [{ id: "", name: "A", panes: [] }, { id: "w1", name: "B", panes: [] }, { id: "w1", name: "C", panes: [] }, 7];
    expect(normalizeTerminalWorkspaces(raw, nameFor).map((w) => w.name)).toEqual(["B"]);
  });

  it("alan başına ilk 9 bölme, ilk 6 alan", () => {
    const panes = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, kind: "cmd", cwd: "C:\\a" }));
    const raw = Array.from({ length: 8 }, (_, i) => ({ id: `w${i}`, name: `W${i}`, panes: i === 0 ? panes : [] }));
    const result = normalizeTerminalWorkspaces(raw, nameFor);
    expect(result).toHaveLength(MAX_TERMINAL_WORKSPACES);
    expect(result[0].panes).toHaveLength(MAX_TERMINAL_PANES);
    expect(result[0].panes[8].id).toBe("p8");
  });

  it("ad kırpılıyor; boş ad ilk boş numarayı alıyor", () => {
    const raw = [
      { id: "w1", name: "  ", panes: [] },
      { id: "w2", name: " Alan 1 ", panes: [] },
      { id: "w3", panes: [] }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor).map((w) => w.name)).toEqual(["Alan 2", "Alan 1", "Alan 3"]);
  });
});

describe("firstFreeWorkspaceNumber", () => {
  it("alınmamış ilk sayıyı veriyor", () => {
    expect(firstFreeWorkspaceNumber([], nameFor)).toBe(1);
    expect(firstFreeWorkspaceNumber(["Alan 1", "Alan 3"], nameFor)).toBe(2);
  });
});

describe("normalizeActiveWorkspaceId", () => {
  const ws = [{ id: "w1", name: "A", panes: [] }];
  it("listede varsa aynen, yoksa null", () => {
    expect(normalizeActiveWorkspaceId("w1", ws)).toBe("w1");
    expect(normalizeActiveWorkspaceId("w9", ws)).toBeNull();
    expect(normalizeActiveWorkspaceId(5, ws)).toBeNull();
  });
});

// --- store.ts üzerinden uçtan uca ---

let userData = "";

vi.mock("electron", () => ({
  app: { getPath: () => userData, getLocale: () => "tr" },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: vi.fn(), decryptString: vi.fn() }
}));

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), "store-"));
  vi.resetModules();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

async function store(raw: Record<string, unknown> | null) {
  if (raw) writeFileSync(path.join(userData, "config.json"), JSON.stringify(raw));
  return import("../app-electron/main/store");
}

describe("loadConfig — terminal düzeni", () => {
  it("dosya yoksa boş liste ve null", async () => {
    const { loadConfig } = await store(null);
    const config = loadConfig();
    expect(config.terminalWorkspaces).toEqual([]);
    expect(config.terminalActiveWorkspaceId).toBeNull();
  });

  it("bozuk düzen ayıklanıyor, yok olan seçili alan null oluyor", async () => {
    const { loadConfig } = await store({
      terminalWorkspaces: [{ id: "w1", name: "", panes: [{ id: "p1", kind: "zsh", cwd: "C:\\a" }] }],
      terminalActiveWorkspaceId: "w9"
    });
    const config = loadConfig();
    expect(config.terminalWorkspaces).toEqual([{ id: "w1", name: "Çalışma alanı 1", panes: [] }]);
    expect(config.terminalActiveWorkspaceId).toBeNull();
  });

  it("İngilizce arayüzde boş ad İngilizce", async () => {
    const { loadConfig } = await store({ language: "en", terminalWorkspaces: [{ id: "w1", name: "", panes: [] }] });
    expect(loadConfig().terminalWorkspaces[0].name).toBe("Workspace 1");
  });
});
```

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalConfig.test.ts`
Beklenen: FAIL — `Failed to resolve import "../app-electron/shared/terminalLayout"`.

- [ ] **Adım 3: Tipleri ekle** — `app-electron/shared/types.ts`, `export type TerminalMode = "cmd" | "powershell";` satırının hemen altına:

```ts
// Terminal modundaki bir bölmenin türü (spec §4.1). `axet`, seçilen kabukta
// `config.axetCommand`'ı başlangıç komutu olarak çalıştırıyor.
export type TerminalPaneKind = "axet" | "cmd" | "powershell";

// Diske yalnız düzen yazılıyor: ad, tür, klasör. Çıktı, oran ve süreç
// kimliği yazılmıyor.
export interface SavedTerminalPane {
  id: string;
  kind: TerminalPaneKind;
  cwd: string;
}

export interface SavedTerminalWorkspace {
  id: string;
  name: string;
  panes: SavedTerminalPane[];
}
```

`AppConfig` arayüzünde `sidebarCollapsed: boolean;` satırının altına:

```ts
  // Terminal modunun kayıtlı düzeni (spec §4.1). Okurken `store.ts`
  // ayıklıyor; yazma yalnız yapı değişince (bkz. terminalStore.tsx).
  terminalWorkspaces: SavedTerminalWorkspace[];
  terminalActiveWorkspaceId: string | null;
```

- [ ] **Adım 4: `app-electron/shared/terminalLayout.ts` oluştur**

```ts
// Terminal modunun sınırları ve kayıtlı düzenin okunması (spec §4.1).
//
// Ana süreç (store.ts) ve renderer aynı sınırları kullanıyor; bu yüzden
// `shared` altında. Dosya elle düzenlenebilir ya da eski bir sürümden
// gelebilir: bozuk öğe hata fırlatmıyor, yalnızca atlanıyor.

import type { SavedTerminalPane, SavedTerminalWorkspace, TerminalPaneKind } from "./types";

export const MAX_TERMINAL_PANES = 9;
export const MAX_TERMINAL_WORKSPACES = 6;

// `terminal:create` klasör yokken bu metinle hata fırlatıyor. Electron
// mesajın başına "Error invoking remote method …" ekliyor; renderer
// `includes` ile tanıyor.
export const TERMINAL_MISSING_DIR = "TERMINAL_MISSING_DIR";

export const TERMINAL_PANE_KINDS: readonly TerminalPaneKind[] = ["axet", "cmd", "powershell"];

export function isTerminalPaneKind(value: unknown): value is TerminalPaneKind {
  return typeof value === "string" && (TERMINAL_PANE_KINDS as readonly string[]).includes(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 100;
}

/** `nameFor(n)` listede olmayan ilk n (1'den başlar). */
export function firstFreeWorkspaceNumber(names: readonly string[], nameFor: (n: number) => string): number {
  const taken = new Set(names);
  let n = 1;
  while (taken.has(nameFor(n))) n += 1;
  return n;
}

export function normalizeTerminalWorkspaces(raw: unknown, nameFor: (n: number) => string): SavedTerminalWorkspace[] {
  if (!Array.isArray(raw)) return [];
  const workspaceIds = new Set<string>();
  const paneIds = new Set<string>();
  const result: SavedTerminalWorkspace[] = [];
  for (const item of raw) {
    if (result.length >= MAX_TERMINAL_WORKSPACES) break;
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (!isId(record.id) || workspaceIds.has(record.id)) continue;
    const panes: SavedTerminalPane[] = [];
    if (Array.isArray(record.panes)) {
      for (const entry of record.panes) {
        if (panes.length >= MAX_TERMINAL_PANES) break;
        if (!entry || typeof entry !== "object") continue;
        const pane = entry as Record<string, unknown>;
        if (!isId(pane.id) || paneIds.has(pane.id)) continue;
        if (!isTerminalPaneKind(pane.kind)) continue;
        if (typeof pane.cwd !== "string" || !pane.cwd.trim()) continue;
        paneIds.add(pane.id);
        panes.push({ id: pane.id, kind: pane.kind, cwd: pane.cwd });
      }
    }
    workspaceIds.add(record.id);
    result.push({ id: record.id, name: typeof record.name === "string" ? record.name.trim() : "", panes });
  }
  // Adsızlar en sonda dolduruluyor: önce bütün dolu adlar biliniyor ki
  // "Çalışma alanı 1" adını elle almış bir alanla çakışılmasın.
  for (const workspace of result) {
    if (workspace.name) continue;
    workspace.name = nameFor(firstFreeWorkspaceNumber(result.map((w) => w.name), nameFor));
  }
  return result;
}

export function normalizeActiveWorkspaceId(raw: unknown, workspaces: readonly SavedTerminalWorkspace[]): string | null {
  return typeof raw === "string" && workspaces.some((w) => w.id === raw) ? raw : null;
}
```

- [ ] **Adım 5: Ana süreç metni** — `app-electron/main/i18n/tr.ts`'de `"dialog.openGuiScriptJson": …` satırının sonuna virgül koyup altına:

```ts
  "terminal.workspaceName": "Çalışma alanı {n}"
```

`app-electron/main/i18n/en.ts`'de aynı yere:

```ts
  "terminal.workspaceName": "Workspace {n}"
```

- [ ] **Adım 6: `store.ts`** — içe aktarmalara ekle:

```ts
import { MAIN_TR } from "./i18n/tr";
import { MAIN_EN } from "./i18n/en";
import { normalizeActiveWorkspaceId, normalizeTerminalWorkspaces } from "../shared/terminalLayout";
```

`defaultConfig()` içinde `sidebarCollapsed: false,` altına:

```ts
    terminalWorkspaces: [],
    terminalActiveWorkspaceId: null,
```

`loadConfig()` içinde `const palette = normalizePalette(parsed.palette);` satırının altına:

```ts
    // Boş adlı alan "Çalışma alanı N" oluyor. `mt()` burada KULLANILMIYOR:
    // `i18n/index.ts` `loadConfig`'i içe aktarıyor, döngü olurdu. Sözlükler
    // içe aktarması olmayan düz nesneler.
    const nameFor = (n: number) =>
      (language === "en" ? MAIN_EN : MAIN_TR)["terminal.workspaceName"].replace("{n}", String(n));
    const terminalWorkspaces = normalizeTerminalWorkspaces(parsed.terminalWorkspaces, nameFor);
```

`merged` nesnesinde `sidebarCollapsed: readSidebarCollapsed(parsed),` altına:

```ts
      terminalWorkspaces,
      terminalActiveWorkspaceId: normalizeActiveWorkspaceId(parsed.terminalActiveWorkspaceId, terminalWorkspaces),
```

- [ ] **Adım 7: Testi çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalConfig.test.ts tests/sidebarConfig.test.ts`
Beklenen: PASS (hepsi).

- [ ] **Adım 8: Tip denetimi** — `npm run -s typecheck`
Beklenen: hata yok. `AppConfig` nesnesi elle kuran testler/dosyalar hata verirse (`terminalWorkspaces` eksik), onlara `terminalWorkspaces: [], terminalActiveWorkspaceId: null` ekle.

- [ ] **Adım 9: Commit**

```bash
git add app-electron/shared/terminalLayout.ts app-electron/shared/types.ts app-electron/main/store.ts app-electron/main/i18n/tr.ts app-electron/main/i18n/en.ts tests/terminalConfig.test.ts
git commit -m "Terminal: config duzeni - tipler ve okurken ayiklama

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 2: Izgara hesabı ve yol kısaltma

**Dosyalar:**
- Oluştur: `src/terminal/gridLayout.ts`
- Değiştir: `src/lib/paths.ts`
- Test: `tests/terminalGrid.test.ts`

**Arayüzler:**
- Tüketir: `MAX_TERMINAL_PANES` (Görev 1)
- Üretir:
  - `interface GridCell { col: number; row: number; rowSpan: number }` (0 tabanlı)
  - `interface GridLayout { cols: number; rows: number; cells: GridCell[]; rowDividerStartCol: number }`
  - `gridLayout(count: number): GridLayout`
  - `dragRatios(ratios: readonly number[], index: number, delta: number, min?: number): number[]`
  - `equalRatios(n: number): number[]`
  - `middleEllipsis(text: string, max?: number): string` (`src/lib/paths.ts`)

- [ ] **Adım 1: Başarısız testi yaz** — `tests/terminalGrid.test.ts`

```ts
// Terminal ızgarasının hesabı (spec §3.3) ve bölme başlığındaki yol kısaltma.

import { describe, expect, it } from "vitest";
import { dragRatios, equalRatios, gridLayout } from "../src/terminal/gridLayout";
import { middleEllipsis } from "../src/lib/paths";

describe("gridLayout", () => {
  it("bölme sayısına göre sütun ve satır", () => {
    const table: Array<[number, number, number]> = [
      [1, 1, 1],
      [2, 2, 1],
      [3, 2, 2],
      [4, 2, 2],
      [5, 3, 2],
      [6, 3, 2],
      [7, 3, 3],
      [8, 3, 3],
      [9, 3, 3]
    ];
    for (const [count, cols, rows] of table) {
      const layout = gridLayout(count);
      expect([count, layout.cols, layout.rows]).toEqual([count, cols, rows]);
      expect(layout.cells).toHaveLength(count);
    }
  });

  it("3 bölmede ilki sol sütunu boydan kaplıyor, satır ayırıcı 2. sütundan başlıyor", () => {
    expect(gridLayout(3)).toEqual({
      cols: 2,
      rows: 2,
      cells: [
        { col: 0, row: 0, rowSpan: 2 },
        { col: 1, row: 0, rowSpan: 1 },
        { col: 1, row: 1, rowSpan: 1 }
      ],
      rowDividerStartCol: 1
    });
  });

  it("hücreler satır satır diziliyor", () => {
    expect(gridLayout(5).cells.map((c) => [c.col, c.row])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1]
    ]);
    expect(gridLayout(5).rowDividerStartCol).toBe(0);
  });

  it("0, negatif, sayı olmayan ve 9'dan büyük değerlere karşı korunuyor", () => {
    expect(gridLayout(0)).toEqual({ cols: 1, rows: 1, cells: [], rowDividerStartCol: 0 });
    expect(gridLayout(-3).cells).toEqual([]);
    expect(gridLayout(Number.NaN).cells).toEqual([]);
    expect(gridLayout(Number.POSITIVE_INFINITY).cells).toEqual([]);
    expect(gridLayout(10).cells).toHaveLength(9);
    expect(gridLayout(2.7).cells).toHaveLength(2);
  });
});

describe("equalRatios", () => {
  it("eşit paylar, en az 1", () => {
    expect(equalRatios(2)).toEqual([0.5, 0.5]);
    expect(equalRatios(0)).toEqual([1]);
  });
});

describe("dragRatios", () => {
  const sum = (r: number[]) => r.reduce((a, b) => a + b, 0);

  it("yalnız iki komşuyu değiştiriyor, toplam korunuyor", () => {
    const next = dragRatios([1 / 3, 1 / 3, 1 / 3], 0, 0.1);
    expect(next[0]).toBeCloseTo(1 / 3 + 0.1);
    expect(next[1]).toBeCloseTo(1 / 3 - 0.1);
    expect(next[2]).toBeCloseTo(1 / 3);
    expect(sum(next)).toBeCloseTo(1);
  });

  it("bölme %8'in altına inmiyor, hangi hızda çekilirse çekilsin", () => {
    expect(dragRatios([0.5, 0.5], 0, 5)).toEqual([0.92, 0.08].map((v) => expect.closeTo(v)));
    expect(dragRatios([0.5, 0.5], 0, -5)).toEqual([0.08, 0.92].map((v) => expect.closeTo(v)));
  });

  it("geçersiz indeks, sayı olmayan delta ya da sıkışmış çift kopya döndürüyor", () => {
    const base = [0.5, 0.5];
    for (const [index, delta] of [[-1, 0.1], [1, 0.1], [0.5, 0.1], [0, Number.NaN]] as const) {
      const next = dragRatios(base, index, delta);
      expect(next).toEqual(base);
      expect(next).not.toBe(base);
    }
    expect(dragRatios([0.9, 0.05, 0.05], 1, 0.01)).toEqual([0.9, 0.05, 0.05]);
  });
});

describe("middleEllipsis", () => {
  it("kısa metin aynen", () => {
    expect(middleEllipsis("C:\\a")).toBe("C:\\a");
  });

  it("uzun metin ortadan kısaltılıyor, uzunluk sınırda", () => {
    const text = "C:\\Users\\kullanici\\projeler\\cok-uzun-bir-klasor-adi\\alt\\son";
    const short = middleEllipsis(text, 20);
    expect(short).toHaveLength(20);
    expect(short.startsWith("C:\\Users\\")).toBe(true);
    expect(short.endsWith("alt\\son")).toBe(true);
    expect(short).toContain("…");
  });

  it("çok küçük sınır", () => {
    expect(middleEllipsis("abcdef", 1)).toBe("…");
  });
});
```

- [ ] **Adım 2: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalGrid.test.ts`
Beklenen: FAIL — `Failed to resolve import "../src/terminal/gridLayout"`.

- [ ] **Adım 3: `src/terminal/gridLayout.ts` oluştur**

```ts
// Terminal ızgarasının yerleşimi (spec §3.3). Saf hesap; React'sız sınanıyor.
//
// Sütun/satır/hücre 0 tabanlı. CSS'e çevirirken +1 ekleniyor.

import { MAX_TERMINAL_PANES } from "../../app-electron/shared/terminalLayout";

export interface GridCell {
  col: number;
  row: number;
  rowSpan: number;
}

export interface GridLayout {
  cols: number;
  rows: number;
  cells: GridCell[];
  // Satır ayırıcısının başladığı sütun. 3 bölmede sol sütun boydan
  // kaplandığı için ayırıcı yalnız sağ sütunda.
  rowDividerStartCol: number;
}

export function gridLayout(count: number): GridLayout {
  const n = Number.isFinite(count) ? Math.max(0, Math.min(MAX_TERMINAL_PANES, Math.floor(count))) : 0;
  if (n === 0) return { cols: 1, rows: 1, cells: [], rowDividerStartCol: 0 };
  if (n === 3) {
    return {
      cols: 2,
      rows: 2,
      cells: [
        { col: 0, row: 0, rowSpan: 2 },
        { col: 1, row: 0, rowSpan: 1 },
        { col: 1, row: 1, rowSpan: 1 }
      ],
      rowDividerStartCol: 1
    };
  }
  const cols = n === 1 ? 1 : n <= 4 ? 2 : 3;
  const rows = n <= 2 ? 1 : n <= 6 ? 2 : 3;
  const cells = Array.from({ length: n }, (_, i) => ({ col: i % cols, row: Math.floor(i / cols), rowSpan: 1 }));
  return { cols, rows, cells, rowDividerStartCol: 0 };
}

export function equalRatios(n: number): number[] {
  const k = Math.max(1, Math.floor(Number.isFinite(n) ? n : 1));
  return Array.from({ length: k }, () => 1 / k);
}

/**
 * `index` ile `index + 1` arasındaki ayırıcı `delta` kadar (toplamın payı
 * olarak) kayınca yeni oranlar. Yalnız bu iki komşu değişiyor, toplamları
 * korunuyor, ikisi de `min`'in altına inmiyor. Geçersiz girdide kopya.
 */
export function dragRatios(ratios: readonly number[], index: number, delta: number, min = 0.08): number[] {
  const next = [...ratios];
  if (!Number.isInteger(index) || index < 0 || index >= ratios.length - 1 || !Number.isFinite(delta)) return next;
  const total = ratios[index] + ratios[index + 1];
  if (total <= 2 * min) return next;
  const first = Math.min(total - min, Math.max(min, ratios[index] + delta));
  next[index] = first;
  next[index + 1] = total - first;
  return next;
}
```

- [ ] **Adım 4: `src/lib/paths.ts` sonuna ekle**

```ts
/**
 * Uzun metni ortadan "…" ile kısaltıyor: yolun başı (sürücü) ve sonu
 * (klasör adı) görünür kalıyor. Sonuç en fazla `max` karakter.
 */
export function middleEllipsis(text: string, max = 48): string {
  if (text.length <= max) return text;
  if (max <= 1) return "…";
  const keep = max - 1;
  const head = Math.ceil(keep / 2);
  const tail = keep - head;
  return text.slice(0, head) + "…" + (tail > 0 ? text.slice(text.length - tail) : "");
}
```

- [ ] **Adım 5: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalGrid.test.ts`
Beklenen: PASS.

- [ ] **Adım 6: Commit**

```bash
git add src/terminal/gridLayout.ts src/lib/paths.ts tests/terminalGrid.test.ts
git commit -m "Terminal: izgara hesabi, oran surukleme ve yol kisaltma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: Ana süreç — `createDir: false` ve `terminal:disposeAll`

**Dosyalar:**
- Değiştir: `app-electron/main/terminalManager.ts` (`createTerminal` ~l.86)
- Değiştir: `app-electron/main/index.ts` (`terminal:create` işleyicisi ~l.959)
- Değiştir: `app-electron/preload/index.ts` (~l.138)
- Değiştir: `src/window.d.ts` (~l.127)
- Test: `tests/terminalManager.test.ts`

**Arayüzler:**
- Tüketir: `TERMINAL_MISSING_DIR` (Görev 1)
- Üretir:
  - `createTerminal(window, id, cwd, cols, rows, shell, initialCommand?, options?: { createDir?: boolean }): boolean` — `false` = süreç açılmadı (klasör yok)
  - `window.api.createTerminal(cwd, cols, rows, shell, initialCommand?, options?: { createDir?: boolean }) => Promise<string>`; klasör yoksa mesajında `TERMINAL_MISSING_DIR` geçen hatayla reddediliyor
  - `window.api.disposeAllTerminals() => Promise<void>`

- [ ] **Adım 1: Başarısız testi yaz** — `tests/terminalManager.test.ts`

```ts
// `createTerminal`'ın klasör seçeneği (spec §5.1). Terminal modu bölmeleri
// klasör yaratmıyor; varsayılan davranış (sohbet vb.) değişmedi.

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `vi.mock` dosyanın başına taşınıyor; fabrikanın kullandığı değişken de
// `vi.hoisted` ile oraya taşınmalı, yoksa "before initialization" hatası.
const { spawn } = vi.hoisted(() => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onExit: vi.fn(() => ({ dispose: vi.fn() })),
    write: vi.fn(),
    kill: vi.fn(),
    resize: vi.fn(),
    pid: 1
  }))
}));

vi.mock("@lydell/node-pty", () => ({ spawn }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "t" }));
vi.mock("../app-electron/main/pythonSiteEnv", () => ({ withNttPythonSite: (env: unknown) => env }));

import { createTerminal, disposeAllTerminals } from "../app-electron/main/terminalManager";

const fakeWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } } as never;

let root = "";

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "term-"));
  spawn.mockClear();
});

afterEach(() => {
  disposeAllTerminals();
  rmSync(root, { recursive: true, force: true });
});

describe("createTerminal — klasör seçeneği", () => {
  it("createDir false ve klasör yoksa süreç açmıyor, false dönüyor", () => {
    const missing = path.join(root, "yok");
    expect(createTerminal(fakeWindow, "a", missing, 80, 24, "cmd", undefined, { createDir: false })).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
    expect(existsSync(missing)).toBe(false);
  });

  it("createDir false ve klasör boşsa false", () => {
    expect(createTerminal(fakeWindow, "b", "  ", 80, 24, "cmd", undefined, { createDir: false })).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("createDir false ve klasör varsa açıyor", () => {
    expect(createTerminal(fakeWindow, "c", root, 80, 24, "cmd", undefined, { createDir: false })).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("varsayılan davranış klasörü yaratıyor", () => {
    const fresh = path.join(root, "yeni", "alt");
    expect(createTerminal(fakeWindow, "d", fresh, 80, 24, "cmd")).toBe(true);
    expect(existsSync(fresh)).toBe(true);
    expect(spawn).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Adım 2: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalManager.test.ts`
Beklenen: FAIL — ilk test `expected undefined to be false` (fonksiyon bugün bir şey döndürmüyor ve klasörü yaratıyor).

- [ ] **Adım 3: `terminalManager.ts`** — içe aktarmayı değiştir:

```ts
import { mkdirSync, statSync } from "node:fs";
```

`resolveShellArgs`'ın altına:

```ts
function isDirectory(dir: string): boolean {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}
```

`createTerminal`'ın imzasını ve başını şöyle yap (gövdenin geri kalanı aynı; en sona `return true;`):

```ts
export function createTerminal(
  window: BrowserWindow,
  id: string,
  cwd: string,
  cols: number,
  rows: number,
  shell: "cmd" | "powershell",
  initialCommand?: string,
  options: { createDir?: boolean } = {}
): boolean {
  // Terminal modu bölmeleri klasör YARATMIYOR (spec §5.1): kayıtlı düzendeki
  // silinmiş bir klasör sessizce yeniden oluşmasın, bölme "Klasör bulunamadı"
  // desin. Süreç açılmadan `false`; IPC işleyicisi bunu hataya çeviriyor.
  if (options.createDir === false && !(cwd && cwd.trim() && isDirectory(cwd))) return false;
  const hasInitialCommand = Boolean(initialCommand && initialCommand.trim());
  const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
```

Mevcut `try { mkdirSync(resolvedCwd, { recursive: true }); } catch { … }` bloğunu `if (options.createDir !== false) { … }` içine al (yorumlar aynen kalsın). Fonksiyonun son satırı:

```ts
  return true;
}
```

- [ ] **Adım 4: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalManager.test.ts`
Beklenen: PASS (4 test).

- [ ] **Adım 5: IPC** — `app-electron/main/index.ts`: içe aktarmalara `import { TERMINAL_MISSING_DIR } from "../shared/terminalLayout";` ekle. `terminal:create` işleyicisini şununla değiştir ve altına `terminal:disposeAll`'u ekle:

```ts
  ipcMain.handle(
    "terminal:create",
    (
      _event,
      cwd: string,
      cols: number,
      rows: number,
      shell: TerminalMode,
      initialCommand?: string,
      options?: { createDir?: boolean }
    ) => {
      if (!mainWindow) throw new Error(mt("app.windowNotReady"));
      const id = randomUUID();
      // Klasör yoksa ve yaratılmaması istendiyse süreç açılmadı. Metin bir
      // işaret: renderer `includes(TERMINAL_MISSING_DIR)` ile tanıyor.
      if (!createTerminal(mainWindow, id, cwd, cols, rows, shell, initialCommand, options ?? {})) {
        throw new Error(TERMINAL_MISSING_DIR);
      }
      return id;
    }
  );

  // Renderer açılır açılmaz çağırıyor (spec §5.2): Ctrl+R sonrası öksüz
  // kalan kabuklar kapanıyor. Sohbetin TUI'si ayrı yönetici, etkilenmiyor.
  ipcMain.handle("terminal:disposeAll", () => {
    disposeAllTerminals();
  });
```

(`disposeAllTerminals` l.34'te zaten içe aktarılıyor; değilse ekle.)

- [ ] **Adım 6: Köprü** — `app-electron/preload/index.ts`:

```ts
  createTerminal: (
    cwd: string,
    cols: number,
    rows: number,
    shell: TerminalMode,
    initialCommand?: string,
    options?: { createDir?: boolean }
  ) => ipcRenderer.invoke("terminal:create", cwd, cols, rows, shell, initialCommand, options),
  disposeAllTerminals: () => ipcRenderer.invoke("terminal:disposeAll"),
```

`src/window.d.ts`:

```ts
  createTerminal: (
    cwd: string,
    cols: number,
    rows: number,
    shell: TerminalMode,
    initialCommand?: string,
    options?: { createDir?: boolean }
  ) => Promise<string>;
  disposeAllTerminals: () => Promise<void>;
```

- [ ] **Adım 7: Tip denetimi** — `npm run -s typecheck`
Beklenen: hata yok.

- [ ] **Adım 8: Commit**

```bash
git add app-electron/main/terminalManager.ts app-electron/main/index.ts app-electron/preload/index.ts src/window.d.ts tests/terminalManager.test.ts
git commit -m "Terminal: createDir secenegi ve terminal:disposeAll

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 4: Bellek durumu — tipler ve saf indirgeyici

**Dosyalar:**
- Oluştur: `src/stores/terminalTypes.ts`
- Oluştur: `src/stores/terminalReducer.ts`
- Test: `tests/terminalReducer.test.ts`

**Arayüzler:**
- Tüketir: `SavedTerminalWorkspace`, `TerminalPaneKind` (Görev 1), `MAX_TERMINAL_PANES`, `MAX_TERMINAL_WORKSPACES`, `firstFreeWorkspaceNumber` (Görev 1)
- Üretir (`terminalTypes.ts`):
  - `type NameFor = (n: number) => string`
  - `type PaneRun` — `queued` · `starting{token}` · `running{ptyId}` · `exited{ptyId, code}` · `failed{message}` · `missingDir`
  - `interface TerminalPane { id; kind; cwd; run: PaneRun }`
  - `interface TerminalWorkspace { id; name; panes; focusedPaneId: string | null; maximizedPaneId: string | null; unread: boolean; error: boolean }`
  - `interface PendingProjectPane { paneId; spareWorkspaceId; cwd }`
  - `interface TerminalState { phase: "closed" | "restorePrompt" | "ready"; saved; savedActiveId; workspaces; activeWorkspaceId; visible; pending: PendingProjectPane[]; limitHits: number }`
  - `type TerminalAction` (aşağıdaki kodda tam liste)
- Üretir (`terminalReducer.ts`): `SPAWN_CONCURRENCY = 2`, `initialTerminalState`, `terminalReducer(state, action)`, `isWorkspaceVisible(state, id)`, `findPane(state, paneId)`, `paneByPty(state, ptyId)`, `nextToStart(state, limit?)`, `liveCount(ws)`, `workspaceDot(ws): "error" | "unread" | null`, `paneTone(run): "running" | "stopped" | "error"`, `toSaved(state)`

Notlar (spec §4.2'den sapmalar, küçük):
- `starting`'e `token` eklendi: aynı bölme başlarken yeniden başlatılırsa geç gelen sonuç yeni denemeyle karışmasın.
- `exited`'e `ptyId` eklendi: süreç kapanınca xterm (ve çıktısı) yerinde kalsın.
- Kimlikler indirgeyicide üretilmiyor, eylemle geliyor (`crypto.randomUUID()` sağlayıcıda); indirgeyici saf kalıyor.
- Son alan kapatılırsa yerine boş "Çalışma alanı 1" açılıyor (spec susuyor; mod hiç alansız kalmasın).

- [ ] **Adım 1: Başarısız testi yaz** — `tests/terminalReducer.test.ts`

```ts
// Terminal modunun saf indirgeyicisi (spec §4.2, §5). React'sız.

import { describe, expect, it } from "vitest";
import {
  initialTerminalState,
  liveCount,
  nextToStart,
  paneByPty,
  paneTone,
  terminalReducer,
  toSaved,
  workspaceDot
} from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState } from "../src/stores/terminalTypes";

const nameFor = (n: number) => `Alan ${n}`;

function run(actions: TerminalAction[], from: TerminalState = initialTerminalState): TerminalState {
  return actions.reduce(terminalReducer, from);
}

// Görünür, tek boş alanlı hazır durum.
function ready(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor }
  ]);
}

function withPanes(count: number, from = ready()): TerminalState {
  const actions: TerminalAction[] = Array.from({ length: count }, (_, i) => ({
    type: "addPane",
    workspaceId: "w1",
    paneId: `p${i + 1}`,
    kind: "cmd",
    cwd: "C:\\a"
  }));
  return run(actions, from);
}

function runningPane(state: TerminalState, paneId: string, ptyId: string): TerminalState {
  return run(
    [
      { type: "spawnStarted", paneId, token: 1 },
      { type: "spawnSucceeded", paneId, token: 1, ptyId }
    ],
    state
  );
}

describe("açılış", () => {
  it("kayıtlı düzen yoksa tek boş alan", () => {
    const state = ready();
    expect(state.phase).toBe("ready");
    expect(state.workspaces.map((w) => [w.id, w.name, w.panes.length])).toEqual([["w1", "Alan 1", 0]]);
    expect(state.activeWorkspaceId).toBe("w1");
  });

  it("kayıtlı düzen varsa önce şerit; geri yükle bölmeleri sıraya koyuyor ve seçili alanı getiriyor", () => {
    const saved = [
      { id: "a", name: "A", panes: [{ id: "p1", kind: "axet" as const, cwd: "C:\\a" }] },
      { id: "b", name: "B", panes: [{ id: "p2", kind: "cmd" as const, cwd: "C:\\b" }] }
    ];
    const prompt = run([{ type: "open", saved, activeId: "b", freshId: "x", nameFor }]);
    expect(prompt.phase).toBe("restorePrompt");
    expect(prompt.workspaces).toEqual([]);
    const restored = terminalReducer(prompt, { type: "restore", nameFor });
    expect(restored.phase).toBe("ready");
    expect(restored.activeWorkspaceId).toBe("b");
    expect(restored.workspaces[0].panes[0].run).toEqual({ state: "queued" });
    expect(restored.workspaces[0].focusedPaneId).toBe("p1");
  });

  it("yalnız boş alanlardan oluşan düzen şerit sormadan açılıyor", () => {
    const saved = [
      { id: "a", name: "A", panes: [] },
      { id: "b", name: "B", panes: [] }
    ];
    const state = run([{ type: "open", saved, activeId: "b", freshId: "x", nameFor }]);
    expect(state.phase).toBe("ready");
    expect(state.workspaces.map((w) => w.name)).toEqual(["A", "B"]);
    expect(state.activeWorkspaceId).toBe("b");
  });

  it("boş başla tek boş alan açıyor; ikinci open bir şey yapmıyor", () => {
    const saved = [{ id: "a", name: "A", panes: [{ id: "p", kind: "cmd" as const, cwd: "C:\\a" }] }];
    const fresh = run([
      { type: "open", saved, activeId: null, freshId: "x", nameFor },
      { type: "startFresh", freshId: "y", nameFor },
      { type: "open", saved, activeId: null, freshId: "z", nameFor }
    ]);
    expect(fresh.workspaces.map((w) => w.id)).toEqual(["y"]);
    expect(fresh.phase).toBe("ready");
  });
});

describe("alanlar", () => {
  it("ekle, seç, yeniden adlandır; boş ad kabul edilmiyor", () => {
    const state = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "renameWorkspace", id: "w2", name: "  QA  " },
        { type: "renameWorkspace", id: "w2", name: "   " }
      ],
      ready()
    );
    expect(state.workspaces.map((w) => w.name)).toEqual(["Alan 1", "QA"]);
    expect(state.activeWorkspaceId).toBe("w2");
  });

  it("en fazla 6 alan", () => {
    const actions: TerminalAction[] = Array.from({ length: 8 }, (_, i) => ({ type: "addWorkspace", id: `n${i}`, nameFor }));
    expect(run(actions, ready()).workspaces).toHaveLength(6);
  });

  it("seçili alan kapanınca komşusu seçiliyor; sonuncusu kapanınca yeni boş alan", () => {
    let state = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "addWorkspace", id: "w3", nameFor },
        { type: "selectWorkspace", id: "w2" },
        { type: "closeWorkspace", id: "w2", freshId: "f", nameFor }
      ],
      ready()
    );
    expect(state.activeWorkspaceId).toBe("w3");
    state = run(
      [
        { type: "closeWorkspace", id: "w1", freshId: "f", nameFor },
        { type: "closeWorkspace", id: "w3", freshId: "f", nameFor }
      ],
      state
    );
    expect(state.workspaces.map((w) => [w.id, w.name])).toEqual([["f", "Alan 1"]]);
    expect(state.activeWorkspaceId).toBe("f");
  });
});

describe("bölmeler", () => {
  it("en fazla 9 bölme, eklenen odaklanıyor ve sırada bekliyor", () => {
    const state = withPanes(11);
    const ws = state.workspaces[0];
    expect(ws.panes).toHaveLength(9);
    expect(ws.focusedPaneId).toBe("p9");
    expect(ws.panes[0].run).toEqual({ state: "queued" });
  });

  it("şerit açıkken bölme ve alan eklenmiyor", () => {
    const saved = [{ id: "a", name: "A", panes: [{ id: "p0", kind: "cmd" as const, cwd: "C:\\a" }] }];
    const prompt = run([{ type: "open", saved, activeId: null, freshId: "x", nameFor }]);
    const after = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "addPane", workspaceId: "a", paneId: "p", kind: "cmd", cwd: "C:\\a" }
      ],
      prompt
    );
    expect(after).toBe(prompt);
  });

  it("kapatma odağı komşuya, büyütmeyi sıfıra alıyor", () => {
    const state = run(
      [
        { type: "toggleMaximize", paneId: "p2" },
        { type: "closePane", paneId: "p2" }
      ],
      withPanes(3)
    );
    const ws = state.workspaces[0];
    expect(ws.panes.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(ws.focusedPaneId).toBe("p3");
    expect(ws.maximizedPaneId).toBeNull();
  });

  it("büyüt iki kez basınca geri; yeni bölme büyütmeyi kaldırıyor", () => {
    let state = terminalReducer(withPanes(2), { type: "toggleMaximize", paneId: "p1" });
    expect(state.workspaces[0].maximizedPaneId).toBe("p1");
    state = terminalReducer(state, { type: "toggleMaximize", paneId: "p1" });
    expect(state.workspaces[0].maximizedPaneId).toBeNull();
    state = run(
      [
        { type: "toggleMaximize", paneId: "p1" },
        { type: "addPane", workspaceId: "w1", paneId: "p9", kind: "cmd", cwd: "C:\\a" }
      ],
      state
    );
    expect(state.workspaces[0].maximizedPaneId).toBeNull();
  });

  it("yeniden başlatma sıraya koyuyor, verilirse klasörü değiştiriyor", () => {
    const state = run(
      [
        { type: "spawnStarted", paneId: "p1", token: 1 },
        { type: "spawnFailed", paneId: "p1", token: 1, message: "", missingDir: true },
        { type: "restartPane", paneId: "p1", cwd: "C:\\yeni" }
      ],
      withPanes(1)
    );
    expect(state.workspaces[0].panes[0]).toMatchObject({ cwd: "C:\\yeni", run: { state: "queued" } });
  });
});

describe("başlatma", () => {
  it("aynı anda en fazla 2; seçili alan önce", () => {
    let state = run(
      [
        { type: "addWorkspace", id: "w2", nameFor },
        { type: "addPane", workspaceId: "w2", paneId: "q1", kind: "cmd", cwd: "C:\\a" },
        { type: "selectWorkspace", id: "w1" }
      ],
      withPanes(3)
    );
    state = run([{ type: "selectWorkspace", id: "w2" }], state);
    expect(nextToStart(state).map((p) => p.id)).toEqual(["q1", "p1"]);
    state = run([{ type: "spawnStarted", paneId: "q1", token: 1 }], state);
    expect(nextToStart(state).map((p) => p.id)).toEqual(["p1"]);
    state = run([{ type: "spawnStarted", paneId: "p1", token: 2 }], state);
    expect(nextToStart(state)).toEqual([]);
  });

  it("şerit açıkken hiçbir şey başlamıyor", () => {
    const prompt = run([
      { type: "open", saved: [{ id: "a", name: "A", panes: [{ id: "p", kind: "cmd", cwd: "C:\\a" }] }], activeId: null, freshId: "x", nameFor }
    ]);
    expect(nextToStart(prompt)).toEqual([]);
  });

  it("başka denemenin sonucu yok sayılıyor", () => {
    const state = run(
      [
        { type: "spawnStarted", paneId: "p1", token: 1 },
        { type: "restartPane", paneId: "p1" },
        { type: "spawnStarted", paneId: "p1", token: 2 },
        { type: "spawnSucceeded", paneId: "p1", token: 1, ptyId: "eski" }
      ],
      withPanes(1)
    );
    expect(state.workspaces[0].panes[0].run).toEqual({ state: "starting", token: 2 });
  });

  it("başarı çalışıyor, çıkış kodla kapanıyor ve pty kimliği kalıyor", () => {
    let state = runningPane(withPanes(1), "p1", "t1");
    expect(paneByPty(state, "t1")?.pane.id).toBe("p1");
    expect(liveCount(state.workspaces[0])).toBe(1);
    state = terminalReducer(state, { type: "ptyExit", ptyId: "t1", code: 0 });
    expect(state.workspaces[0].panes[0].run).toEqual({ state: "exited", ptyId: "t1", code: 0 });
    expect(liveCount(state.workspaces[0])).toBe(0);
  });
});

describe("noktalar", () => {
  // w1'de çalışan bir bölme, sonra w2 seçiliyor: w1 görünmez.
  function hiddenW1(): TerminalState {
    return run([{ type: "addWorkspace", id: "w2", nameFor }], runningPane(withPanes(1), "p1", "t1"));
  }

  it("görünmeyen alana çıktı mavi; görünür olunca siliniyor", () => {
    let state = terminalReducer(hiddenW1(), { type: "ptyData", ptyId: "t1" });
    expect(workspaceDot(state.workspaces[0])).toBe("unread");
    state = terminalReducer(state, { type: "selectWorkspace", id: "w1" });
    expect(workspaceDot(state.workspaces[0])).toBeNull();
  });

  it("görünür alana çıktı bayrak koymuyor ve durumu değiştirmiyor", () => {
    const state = runningPane(withPanes(1), "p1", "t1");
    expect(terminalReducer(state, { type: "ptyData", ptyId: "t1" })).toBe(state);
  });

  it("mod gizliyken seçili alan da görünmez sayılıyor; mod açılınca silinir", () => {
    let state = run(
      [
        { type: "setVisible", visible: false },
        { type: "ptyData", ptyId: "t1" }
      ],
      runningPane(withPanes(1), "p1", "t1")
    );
    expect(workspaceDot(state.workspaces[0])).toBe("unread");
    state = terminalReducer(state, { type: "setVisible", visible: true });
    expect(workspaceDot(state.workspaces[0])).toBeNull();
  });

  it("sıfırdan farklı çıkış ve başlatılamama kırmızı; kırmızı maviden önce", () => {
    let state = run(
      [
        { type: "ptyData", ptyId: "t1" },
        { type: "ptyExit", ptyId: "t1", code: 1 }
      ],
      hiddenW1()
    );
    expect(workspaceDot(state.workspaces[0])).toBe("error");
    expect(paneTone(state.workspaces[0].panes[0].run)).toBe("error");
    state = run(
      [
        { type: "addPane", workspaceId: "w2", paneId: "q", kind: "cmd", cwd: "C:\\a" },
        { type: "selectWorkspace", id: "w1" },
        { type: "spawnStarted", paneId: "q", token: 5 },
        { type: "spawnFailed", paneId: "q", token: 5, message: "yok", missingDir: false }
      ],
      state
    );
    expect(workspaceDot(state.workspaces[1])).toBe("error");
  });

  it("bölme tonu", () => {
    expect(paneTone({ state: "running", ptyId: "x" })).toBe("running");
    expect(paneTone({ state: "exited", ptyId: "x", code: 0 })).toBe("stopped");
    expect(paneTone({ state: "queued" })).toBe("stopped");
    expect(paneTone({ state: "starting", token: 1 })).toBe("stopped");
    expect(paneTone({ state: "missingDir" })).toBe("error");
    expect(paneTone({ state: "failed", message: "" })).toBe("error");
  });
});

describe("AXET projesi bölmesi (spec §5.5)", () => {
  const project = (paneId: string, spare: string): TerminalAction => ({
    type: "addProjectPane",
    paneId,
    spareWorkspaceId: spare,
    cwd: "C:\\proje",
    nameFor
  });

  it("seçili alana axet bölmesi ekliyor", () => {
    const pane = terminalReducer(ready(), project("x", "s")).workspaces[0].panes[0];
    expect(pane).toMatchObject({ id: "x", kind: "axet", cwd: "C:\\proje" });
  });

  it("alan doluysa yeni alan açıp oraya ekliyor", () => {
    const state = terminalReducer(withPanes(9), project("x", "s"));
    expect(state.workspaces.map((w) => [w.id, w.name])).toEqual([
      ["w1", "Alan 1"],
      ["s", "Alan 2"]
    ]);
    expect(state.activeWorkspaceId).toBe("s");
  });

  it("6 alan da doluysa sınır sayacı artıyor", () => {
    let state = ready();
    for (let i = 2; i <= 6; i += 1) state = terminalReducer(state, { type: "addWorkspace", id: `w${i}`, nameFor });
    for (const ws of state.workspaces) {
      for (let j = 0; j < 9; j += 1) {
        state = terminalReducer(state, { type: "addPane", workspaceId: ws.id, paneId: `${ws.id}-${j}`, kind: "cmd", cwd: "C:\\a" });
      }
    }
    state = terminalReducer(state, project("son", "yok"));
    expect(state.limitHits).toBe(1);
    expect(state.workspaces).toHaveLength(6);
    expect(state.workspaces.every((w) => w.panes.length === 9)).toBe(true);
  });

  it("şerit açıkken bekletiliyor, karardan sonra ekleniyor", () => {
    const saved = [{ id: "a", name: "A", panes: [{ id: "p0", kind: "cmd" as const, cwd: "C:\\a" }] }];
    let state = run([
      { type: "open", saved, activeId: "a", freshId: "x", nameFor },
      project("bekleyen", "s")
    ]);
    expect(state.pending).toHaveLength(1);
    state = terminalReducer(state, { type: "restore", nameFor });
    expect(state.pending).toEqual([]);
    expect(state.workspaces[0].panes.map((p) => p.id)).toEqual(["p0", "bekleyen"]);
  });

  it("mod hiç açılmadan gelirse de bekletiliyor", () => {
    const state = terminalReducer(initialTerminalState, project("erken", "s"));
    expect(state.pending.map((p) => p.paneId)).toEqual(["erken"]);
  });
});

describe("toSaved", () => {
  it("yalnız ad, tür, klasör; çalışma durumu yok", () => {
    const state = runningPane(withPanes(1), "p1", "t1");
    expect(toSaved(state)).toEqual({
      workspaces: [{ id: "w1", name: "Alan 1", panes: [{ id: "p1", kind: "cmd", cwd: "C:\\a" }] }],
      activeId: "w1"
    });
  });
});
```

- [ ] **Adım 2: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalReducer.test.ts`
Beklenen: FAIL — `Failed to resolve import "../src/stores/terminalReducer"`.

- [ ] **Adım 3: `src/stores/terminalTypes.ts` oluştur**

```ts
// Terminal modunun bellekteki durumu (spec §4.2). Diske yalnız `toSaved`'ın
// çıkardığı düzen yazılıyor; buradaki çalışma durumu yazılmıyor.

import type { SavedTerminalWorkspace, TerminalPaneKind } from "../../app-electron/shared/types";

export type NameFor = (n: number) => string;

export type PaneRun =
  | { state: "queued" }
  // `token`: aynı bölmenin başka bir denemesinin geç gelen sonucu bununla
  // ayırt ediliyor.
  | { state: "starting"; token: number }
  | { state: "running"; ptyId: string }
  // `ptyId` kalıyor: süreç kapansa da xterm ve çıktısı yerinde duruyor.
  | { state: "exited"; ptyId: string; code: number }
  | { state: "failed"; message: string }
  | { state: "missingDir" };

export interface TerminalPane {
  id: string;
  kind: TerminalPaneKind;
  cwd: string;
  run: PaneRun;
}

export interface TerminalWorkspace {
  id: string;
  name: string;
  panes: TerminalPane[];
  focusedPaneId: string | null;
  maximizedPaneId: string | null;
  // Kenar çubuğundaki nokta: görünmezken çıktı geldi / bir süreç hatayla bitti.
  unread: boolean;
  error: boolean;
}

// "AXET Projesi Seç"ten gelen, yer bekleyen bölme. Kimlikler baştan
// üretiliyor ki indirgeyici saf kalsın.
export interface PendingProjectPane {
  paneId: string;
  spareWorkspaceId: string;
  cwd: string;
}

export interface TerminalState {
  // closed: mod henüz hiç açılmadı · restorePrompt: "Son düzen" şeridi · ready
  phase: "closed" | "restorePrompt" | "ready";
  saved: SavedTerminalWorkspace[];
  savedActiveId: string | null;
  workspaces: TerminalWorkspace[];
  activeWorkspaceId: string | null;
  // Terminal modu ekranda mı (mod seçici). Gizliyken seçili alan da görünmez.
  visible: boolean;
  pending: PendingProjectPane[];
  // Proje bölmesi 6 alan × 9 bölme sınırına çarptıkça artıyor; sağlayıcı
  // artışı görünce bildirim gösteriyor.
  limitHits: number;
}

export type TerminalAction =
  | { type: "open"; saved: SavedTerminalWorkspace[]; activeId: string | null; freshId: string; nameFor: NameFor }
  | { type: "restore"; nameFor: NameFor }
  | { type: "startFresh"; freshId: string; nameFor: NameFor }
  | { type: "setVisible"; visible: boolean }
  | { type: "addWorkspace"; id: string; nameFor: NameFor }
  | { type: "selectWorkspace"; id: string }
  | { type: "renameWorkspace"; id: string; name: string }
  | { type: "closeWorkspace"; id: string; freshId: string; nameFor: NameFor }
  | { type: "addPane"; workspaceId: string; paneId: string; kind: TerminalPaneKind; cwd: string }
  | { type: "addProjectPane"; paneId: string; spareWorkspaceId: string; cwd: string; nameFor: NameFor }
  | { type: "closePane"; paneId: string }
  | { type: "restartPane"; paneId: string; cwd?: string }
  | { type: "focusPane"; paneId: string }
  | { type: "toggleMaximize"; paneId: string }
  | { type: "spawnStarted"; paneId: string; token: number }
  | { type: "spawnSucceeded"; paneId: string; token: number; ptyId: string }
  | { type: "spawnFailed"; paneId: string; token: number; message: string; missingDir: boolean }
  | { type: "ptyExit"; ptyId: string; code: number }
  | { type: "ptyData"; ptyId: string };
```

- [ ] **Adım 4: `src/stores/terminalReducer.ts` oluştur**

```ts
// Terminal modunun saf indirgeyicisi (spec §4.2, §5). Yan etki yok:
// süreç başlatma/kapatma sağlayıcıda (terminalStore.tsx). Hiçbir şey
// değişmiyorsa AYNI durum nesnesi dönüyor ki sık gelen çıktı olayları
// yeniden çizim tetiklemesin.

import type { SavedTerminalWorkspace } from "../../app-electron/shared/types";
import {
  MAX_TERMINAL_PANES,
  MAX_TERMINAL_WORKSPACES,
  firstFreeWorkspaceNumber
} from "../../app-electron/shared/terminalLayout";
import type {
  NameFor,
  PaneRun,
  PendingProjectPane,
  TerminalAction,
  TerminalPane,
  TerminalState,
  TerminalWorkspace
} from "./terminalTypes";

// Aynı anda başlayan süreç sayısı (spec §5.1): geri yüklemede dokuz
// axet-code birden açılıp makineyi kilitlemesin.
export const SPAWN_CONCURRENCY = 2;

export const initialTerminalState: TerminalState = {
  phase: "closed",
  saved: [],
  savedActiveId: null,
  workspaces: [],
  activeWorkspaceId: null,
  visible: false,
  pending: [],
  limitHits: 0
};

function emptyWorkspace(id: string, name: string): TerminalWorkspace {
  return { id, name, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false };
}

export function isWorkspaceVisible(state: TerminalState, workspaceId: string): boolean {
  return state.visible && state.activeWorkspaceId === workspaceId;
}

export function findPane(state: TerminalState, paneId: string): { workspace: TerminalWorkspace; pane: TerminalPane } | null {
  for (const workspace of state.workspaces) {
    const pane = workspace.panes.find((p) => p.id === paneId);
    if (pane) return { workspace, pane };
  }
  return null;
}

function ptyOf(run: PaneRun): string | null {
  return run.state === "running" || run.state === "exited" ? run.ptyId : null;
}

export function paneByPty(state: TerminalState, ptyId: string): { workspace: TerminalWorkspace; pane: TerminalPane } | null {
  for (const workspace of state.workspaces) {
    const pane = workspace.panes.find((p) => ptyOf(p.run) === ptyId);
    if (pane) return { workspace, pane };
  }
  return null;
}

function replaceWorkspace(state: TerminalState, next: TerminalWorkspace): TerminalState {
  return { ...state, workspaces: state.workspaces.map((w) => (w.id === next.id ? next : w)) };
}

function setRun(workspace: TerminalWorkspace, paneId: string, run: PaneRun, patch: Partial<TerminalPane> = {}): TerminalWorkspace {
  return { ...workspace, panes: workspace.panes.map((p) => (p.id === paneId ? { ...p, ...patch, run } : p)) };
}

// Görünür alana bayrak konmuyor: kullanıcı zaten bakıyor.
function flag(state: TerminalState, workspace: TerminalWorkspace, which: "unread" | "error"): TerminalWorkspace {
  if (isWorkspaceVisible(state, workspace.id) || workspace[which]) return workspace;
  return { ...workspace, [which]: true };
}

// Seçili alan görünür olunca iki bayrak da siliniyor (spec §3.2).
function clearVisibleFlags(state: TerminalState): TerminalState {
  const id = state.activeWorkspaceId;
  if (!state.visible || !id) return state;
  const active = state.workspaces.find((w) => w.id === id);
  if (!active || (!active.unread && !active.error)) return state;
  return replaceWorkspace(state, { ...active, unread: false, error: false });
}

function withPane(workspace: TerminalWorkspace, pane: TerminalPane): TerminalWorkspace {
  return { ...workspace, panes: [...workspace.panes, pane], focusedPaneId: pane.id, maximizedPaneId: null };
}

function placeProjectPane(state: TerminalState, item: PendingProjectPane, nameFor: NameFor): TerminalState {
  const pane: TerminalPane = { id: item.paneId, kind: "axet", cwd: item.cwd, run: { state: "queued" } };
  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId);
  if (active && active.panes.length < MAX_TERMINAL_PANES) return replaceWorkspace(state, withPane(active, pane));
  if (state.workspaces.length < MAX_TERMINAL_WORKSPACES) {
    const name = nameFor(firstFreeWorkspaceNumber(state.workspaces.map((w) => w.name), nameFor));
    const workspace = withPane(emptyWorkspace(item.spareWorkspaceId, name), pane);
    return clearVisibleFlags({ ...state, workspaces: [...state.workspaces, workspace], activeWorkspaceId: workspace.id });
  }
  return { ...state, limitHits: state.limitHits + 1 };
}

function becomeReady(state: TerminalState, workspaces: TerminalWorkspace[], activeWorkspaceId: string | null, nameFor: NameFor): TerminalState {
  let next: TerminalState = {
    ...state,
    phase: "ready",
    saved: [],
    savedActiveId: null,
    workspaces,
    activeWorkspaceId,
    pending: []
  };
  for (const item of state.pending) next = placeProjectPane(next, item, nameFor);
  return clearVisibleFlags(next);
}

function fromSaved(saved: SavedTerminalWorkspace): TerminalWorkspace {
  return {
    ...emptyWorkspace(saved.id, saved.name),
    panes: saved.panes.map((p) => ({ id: p.id, kind: p.kind, cwd: p.cwd, run: { state: "queued" } })),
    focusedPaneId: saved.panes[0]?.id ?? null
  };
}

export function terminalReducer(state: TerminalState, action: TerminalAction): TerminalState {
  switch (action.type) {
    case "open": {
      if (state.phase !== "closed") return state;
      // Şerit yalnız geri getirilecek bir bölme varsa: yalnız boş alanlardan
      // oluşan düzen "1 alan, 0 bölme — Geri yükle?" diye sormaya değmez,
      // alanlar adlarıyla doğrudan açılıyor.
      if (action.saved.some((w) => w.panes.length > 0)) {
        return { ...state, phase: "restorePrompt", saved: action.saved, savedActiveId: action.activeId };
      }
      if (action.saved.length > 0) {
        return becomeReady(state, action.saved.map(fromSaved), action.activeId ?? action.saved[0].id, action.nameFor);
      }
      return becomeReady(state, [emptyWorkspace(action.freshId, action.nameFor(1))], action.freshId, action.nameFor);
    }
    case "restore": {
      if (state.phase !== "restorePrompt") return state;
      const workspaces = state.saved.map(fromSaved);
      const activeId = state.savedActiveId ?? workspaces[0]?.id ?? null;
      return becomeReady(state, workspaces, activeId, action.nameFor);
    }
    case "startFresh": {
      if (state.phase !== "restorePrompt") return state;
      return becomeReady(state, [emptyWorkspace(action.freshId, action.nameFor(1))], action.freshId, action.nameFor);
    }
    case "setVisible": {
      if (state.visible === action.visible) return state;
      return clearVisibleFlags({ ...state, visible: action.visible });
    }
    case "addWorkspace": {
      if (state.phase !== "ready" || state.workspaces.length >= MAX_TERMINAL_WORKSPACES) return state;
      const name = action.nameFor(firstFreeWorkspaceNumber(state.workspaces.map((w) => w.name), action.nameFor));
      return { ...state, workspaces: [...state.workspaces, emptyWorkspace(action.id, name)], activeWorkspaceId: action.id };
    }
    case "selectWorkspace": {
      if (state.activeWorkspaceId === action.id || !state.workspaces.some((w) => w.id === action.id)) return state;
      return clearVisibleFlags({ ...state, activeWorkspaceId: action.id });
    }
    case "renameWorkspace": {
      const name = action.name.trim();
      const workspace = state.workspaces.find((w) => w.id === action.id);
      if (!name || !workspace || workspace.name === name) return state;
      return replaceWorkspace(state, { ...workspace, name });
    }
    case "closeWorkspace": {
      const index = state.workspaces.findIndex((w) => w.id === action.id);
      if (state.phase !== "ready" || index < 0) return state;
      const rest = state.workspaces.filter((_, i) => i !== index);
      if (rest.length === 0) {
        return { ...state, workspaces: [emptyWorkspace(action.freshId, action.nameFor(1))], activeWorkspaceId: action.freshId };
      }
      const activeWorkspaceId =
        state.activeWorkspaceId === action.id ? rest[Math.min(index, rest.length - 1)].id : state.activeWorkspaceId;
      return clearVisibleFlags({ ...state, workspaces: rest, activeWorkspaceId });
    }
    case "addPane": {
      const workspace = state.workspaces.find((w) => w.id === action.workspaceId);
      if (state.phase !== "ready" || !workspace || workspace.panes.length >= MAX_TERMINAL_PANES || !action.cwd.trim()) {
        return state;
      }
      const pane: TerminalPane = { id: action.paneId, kind: action.kind, cwd: action.cwd, run: { state: "queued" } };
      return replaceWorkspace(state, withPane(workspace, pane));
    }
    case "addProjectPane": {
      const item = { paneId: action.paneId, spareWorkspaceId: action.spareWorkspaceId, cwd: action.cwd };
      if (state.phase !== "ready") return { ...state, pending: [...state.pending, item] };
      return placeProjectPane(state, item, action.nameFor);
    }
    case "closePane": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const { workspace } = found;
      const index = workspace.panes.findIndex((p) => p.id === action.paneId);
      const panes = workspace.panes.filter((p) => p.id !== action.paneId);
      const focusedPaneId =
        workspace.focusedPaneId === action.paneId ? (panes[Math.min(index, panes.length - 1)]?.id ?? null) : workspace.focusedPaneId;
      const maximizedPaneId = workspace.maximizedPaneId === action.paneId ? null : workspace.maximizedPaneId;
      return replaceWorkspace(state, { ...workspace, panes, focusedPaneId, maximizedPaneId });
    }
    case "restartPane": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const cwd = action.cwd ?? found.pane.cwd;
      return replaceWorkspace(state, setRun(found.workspace, action.paneId, { state: "queued" }, { cwd }));
    }
    case "focusPane": {
      const found = findPane(state, action.paneId);
      if (!found || found.workspace.focusedPaneId === action.paneId) return state;
      return replaceWorkspace(state, { ...found.workspace, focusedPaneId: action.paneId });
    }
    case "toggleMaximize": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const maximizedPaneId = found.workspace.maximizedPaneId === action.paneId ? null : action.paneId;
      return replaceWorkspace(state, { ...found.workspace, maximizedPaneId, focusedPaneId: action.paneId });
    }
    case "spawnStarted": {
      const found = findPane(state, action.paneId);
      if (!found || found.pane.run.state !== "queued") return state;
      return replaceWorkspace(state, setRun(found.workspace, action.paneId, { state: "starting", token: action.token }));
    }
    case "spawnSucceeded": {
      const found = findPane(state, action.paneId);
      const run = found?.pane.run;
      if (!found || run?.state !== "starting" || run.token !== action.token) return state;
      return replaceWorkspace(state, setRun(found.workspace, action.paneId, { state: "running", ptyId: action.ptyId }));
    }
    case "spawnFailed": {
      const found = findPane(state, action.paneId);
      const run = found?.pane.run;
      if (!found || run?.state !== "starting" || run.token !== action.token) return state;
      const next: PaneRun = action.missingDir ? { state: "missingDir" } : { state: "failed", message: action.message };
      return replaceWorkspace(state, flag(state, setRun(found.workspace, action.paneId, next), "error"));
    }
    case "ptyExit": {
      const found = paneByPty(state, action.ptyId);
      if (!found || found.pane.run.state !== "running") return state;
      const workspace = setRun(found.workspace, found.pane.id, { state: "exited", ptyId: action.ptyId, code: action.code });
      return replaceWorkspace(state, action.code !== 0 ? flag(state, workspace, "error") : workspace);
    }
    case "ptyData": {
      const found = paneByPty(state, action.ptyId);
      if (!found) return state;
      const workspace = flag(state, found.workspace, "unread");
      return workspace === found.workspace ? state : replaceWorkspace(state, workspace);
    }
  }
}

/** Şimdi başlatılabilecek bölmeler: seçili alan önce, sınır `limit`. */
export function nextToStart(state: TerminalState, limit = SPAWN_CONCURRENCY): TerminalPane[] {
  if (state.phase !== "ready") return [];
  const ordered = [
    ...state.workspaces.filter((w) => w.id === state.activeWorkspaceId),
    ...state.workspaces.filter((w) => w.id !== state.activeWorkspaceId)
  ];
  let starting = 0;
  const queued: TerminalPane[] = [];
  for (const workspace of ordered) {
    for (const pane of workspace.panes) {
      if (pane.run.state === "starting") starting += 1;
      else if (pane.run.state === "queued") queued.push(pane);
    }
  }
  return queued.slice(0, Math.max(0, limit - starting));
}

/** Kapatınca ölecek süreç sayısı (onay metni için). */
export function liveCount(workspace: TerminalWorkspace): number {
  return workspace.panes.filter((p) => p.run.state === "running" || p.run.state === "starting").length;
}

export function workspaceDot(workspace: TerminalWorkspace): "error" | "unread" | null {
  if (workspace.error) return "error";
  return workspace.unread ? "unread" : null;
}

export function paneTone(run: PaneRun): "running" | "stopped" | "error" {
  if (run.state === "running") return "running";
  if (run.state === "failed" || run.state === "missingDir") return "error";
  if (run.state === "exited" && run.code !== 0) return "error";
  return "stopped";
}

export function toSaved(state: TerminalState): { workspaces: SavedTerminalWorkspace[]; activeId: string | null } {
  return {
    workspaces: state.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      panes: w.panes.map((p) => ({ id: p.id, kind: p.kind, cwd: p.cwd }))
    })),
    activeId: state.activeWorkspaceId
  };
}
```

- [ ] **Adım 5: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalReducer.test.ts`
Beklenen: PASS (hepsi).

- [ ] **Adım 6: Tip denetimi** — `npm run -s typecheck`
Beklenen: hata yok (`switch` her eylemi karşıladığı için dönüş tipi tam).

- [ ] **Adım 7: Commit**

```bash
git add src/stores/terminalTypes.ts src/stores/terminalReducer.ts tests/terminalReducer.test.ts
git commit -m "Terminal: bellek durumu ve saf indirgeyici

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 5: Süreçleri başlatan sağlayıcı

**Dosyalar:**
- Oluştur: `src/stores/terminalStoreContext.ts`
- Oluştur: `src/stores/terminalStore.tsx`
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` (iki anahtar)
- Test: `tests/terminalStore.test.tsx`

**Arayüzler:**
- Tüketir: `terminalReducer`, `initialTerminalState`, `nextToStart`, `findPane`, `paneByPty`, `isWorkspaceVisible`, `toSaved` (Görev 4); `TerminalState`, `TerminalPane` (Görev 4); `TERMINAL_MISSING_DIR` (Görev 1); `window.api.createTerminal(..., options)`, `window.api.disposeAllTerminals()` (Görev 3); `AppConfig.terminalWorkspaces`, `AppConfig.terminalActiveWorkspaceId` (Görev 1)
- Üretir (`terminalStoreContext.ts`):
  - `interface TerminalCommands { restore(); startFresh(); addWorkspace(); selectWorkspace(id); renameWorkspace(id, name); closeWorkspace(id); addPane(kind, cwd); closePane(paneId); restartPane(paneId, cwd?); focusPane(paneId); toggleMaximize(paneId) }`
  - `interface TerminalStoreValue { state: TerminalState; commands: TerminalCommands; defaultKind: TerminalPaneKind; defaultCwd: string }`
  - `TerminalStoreContext`, `useTerminalStore()` (sağlayıcı dışında hata fırlatır)
- Üretir (`terminalStore.tsx`): `TerminalStoreProvider` — props `{ config: AppConfig | null; visible: boolean; projectRequest: number; pushToast(kind, text): void; onConfigSaved(config: AppConfig): void; children }`
- Üretir (i18n): `terminal.workspaceName` ("Çalışma alanı {n}" / "Workspace {n}"), `terminal.workspaceLimitReached`

Sağlayıcının işleri (spec §5):
1. **Açılışta temizlik:** Ctrl+R sonrası ana süreçte kalan eski kabuklar `disposeAllTerminals()` ile kapanıyor; bu bitmeden hiçbir bölme başlamıyor. StrictMode'da etki iki kez çalışsa da temizlik bir kez yapılıyor (ref korur).
2. **Başlatma:** `nextToStart` en çok iki bölmeyi aynı anda başlatıyor. Her denemeye bir sıra numarası (`token`) veriliyor. Bölme kapatılmış ya da yeniden başlatılmışsa geç gelen pty hemen kapatılıyor.
3. **Olaylar:** `terminal:data` yalnız görünmeyen alandaki bölme için okunmadı işareti koyuyor (her karakter için dispatch yok). `terminal:exit` pty sahibi henüz bilinmiyorsa (süreç `createTerminal` dönmeden öldü) bekletiliyor, sahip belli olunca işleniyor.
4. **Kalıcılık:** yalnız düzen değişince (`toSaved` imzası) `saveConfig` çağrılıyor; çıktı gelmesi yazma yapmıyor.
5. **Proje bölmesi:** `projectRequest` sayacı artınca AXET bölmesi ekleniyor; sağlayıcı henüz hazır değilse indirgeyici bekletiyor.
6. **Sınır:** proje bölmesine yer yoksa (6 alan × 9 bölme) hata bildirimi çıkıyor.

Karar: "Boş başla" config'e `[Çalışma alanı 1]` yazıyor. Spec boş liste diyor. İkisi aynı sonucu veriyor: yalnız boş alanlardan oluşan düzen şerit sormadan açılıyor (Görev 4).

- [ ] **Adım 1: i18n anahtarlarını ekle**

`src/i18n/tr.ts` — nesnenin sonuna, kapanan `};`'den önce:

```ts
  "terminal.workspaceName": "Çalışma alanı {n}",
  "terminal.workspaceLimitReached": "Yer kalmadı: 6 çalışma alanının hepsi dolu (her birinde 9 terminal). Bir bölme kapatıp yeniden deneyin.",
```

`src/i18n/en.ts` — aynı yere:

```ts
  "terminal.workspaceName": "Workspace {n}",
  "terminal.workspaceLimitReached": "No room left: all 6 workspaces are full (9 terminals each). Close a pane and try again.",
```

- [ ] **Adım 2: Başarısız testi yaz** — `tests/terminalStore.test.tsx`

```tsx
// @vitest-environment jsdom
// Terminal modu sağlayıcısı (spec §5): temizlik, başlatma sırası, olaylar,
// kalıcılık. `window.api` sahte; `createTerminal` elle çözülüyor.
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import { TerminalStoreProvider } from "../src/stores/terminalStore";
import { useTerminalStore, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { TERMINAL_MISSING_DIR } from "../app-electron/shared/terminalLayout";
import type { AppConfig } from "../app-electron/shared/types";

interface PendingCreate {
  cwd: string;
  shell: string;
  initialCommand: string | undefined;
  options: unknown;
  resolve: (id: string) => void;
  reject: (error: Error) => void;
}

let creates: PendingCreate[];
let finishDisposeAll: () => void;
let dataListeners: Set<(id: string, data: string) => void>;
let exitListeners: Set<(id: string, code: number) => void>;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let store: TerminalStoreValue;

const baseConfig = {
  terminal: "cmd",
  axetCommand: "",
  projectsBaseDir: "C:\\proj",
  axetWorkspaceDir: "C:\\axet",
  terminalWorkspaces: [],
  terminalActiveWorkspaceId: null
} as unknown as AppConfig;

beforeEach(() => {
  creates = [];
  dataListeners = new Set();
  exitListeners = new Set();
  api = {
    createTerminal: vi.fn(
      (cwd: string, _cols: number, _rows: number, shell: string, initialCommand?: string, options?: unknown) =>
        new Promise<string>((resolve, reject) => creates.push({ cwd, shell, initialCommand, options, resolve, reject }))
    ),
    disposeTerminal: vi.fn(() => Promise.resolve()),
    disposeAllTerminals: vi.fn(() => new Promise<void>((resolve) => { finishDisposeAll = resolve; })),
    onTerminalData: vi.fn((cb: (id: string, data: string) => void) => {
      dataListeners.add(cb);
      return () => dataListeners.delete(cb);
    }),
    onTerminalExit: vi.fn((cb: (id: string, code: number) => void) => {
      exitListeners.add(cb);
      return () => exitListeners.delete(cb);
    }),
    saveConfig: vi.fn(async (partial: Partial<AppConfig>) => ({ ...baseConfig, ...partial }))
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

function Probe() {
  store = useTerminalStore();
  return null;
}

function Harness(props: { config?: AppConfig; projectRequest?: number; toasts?: string[] }) {
  return (
    <StrictMode>
      <LanguageProvider language="tr">
        <TerminalStoreProvider
          config={props.config ?? baseConfig}
          visible
          projectRequest={props.projectRequest ?? 0}
          pushToast={(_kind, text) => props.toasts?.push(text)}
          onConfigSaved={() => {}}
        >
          <Probe />
        </TerminalStoreProvider>
      </LanguageProvider>
    </StrictMode>
  );
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  });
}

/** Sağlayıcıyı kurar, temizliği bitirir: mod hazır, tek boş alan açık. */
async function ready(props: Parameters<typeof Harness>[0] = {}) {
  const utils = render(<Harness {...props} />);
  await flush();
  finishDisposeAll();
  await flush();
  return utils;
}

const panes = () => store.state.workspaces.flatMap((w) => w.panes);
const emitData = (id: string) => act(() => dataListeners.forEach((cb) => cb(id, "x")));
const emitExit = (id: string, code: number) => act(() => exitListeners.forEach((cb) => cb(id, code)));

describe("açılış temizliği", () => {
  it("StrictMode'da bir kez çalışıyor ve bitmeden bölme başlamıyor", async () => {
    render(<Harness />);
    await flush();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    expect(api.disposeAllTerminals).toHaveBeenCalledTimes(1);
    expect(api.createTerminal).not.toHaveBeenCalled();

    finishDisposeAll();
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(1);
  });
});

describe("başlatma", () => {
  it("aynı anda en çok iki bölme başlıyor", async () => {
    await ready();
    act(() => {
      store.commands.addPane("cmd", "C:\\a");
      store.commands.addPane("cmd", "C:\\b");
      store.commands.addPane("cmd", "C:\\c");
    });
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(2);

    await act(async () => creates[0].resolve("pty-1"));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(3);
    expect(panes()[0].run).toEqual({ state: "running", ptyId: "pty-1" });
  });

  it("AXET bölmesi seçili kabukla ve komutla, klasör açmadan başlıyor", async () => {
    await ready({ config: { ...baseConfig, terminal: "powershell" } as AppConfig });
    act(() => store.commands.addPane("axet", "C:\\w"));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledWith("C:\\w", 120, 30, "powershell", "axet-code -y", { createDir: false });
  });

  it("düz kabuk komutsuz başlıyor", async () => {
    await ready();
    act(() => store.commands.addPane("powershell", "C:\\w"));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledWith("C:\\w", 120, 30, "powershell", undefined, { createDir: false });
  });

  it("başlarken kapatılan bölmenin geç gelen pty'si kapatılıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    act(() => store.commands.closePane(panes()[0].id));
    await act(async () => creates[0].resolve("pty-geç"));
    await flush();
    expect(api.disposeTerminal).toHaveBeenCalledWith("pty-geç");
    expect(panes()).toEqual([]);
  });

  it("başlarken yeniden başlatılan bölmede eski sonuç kapatılıyor, yenisi kalıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    const id = panes()[0].id;
    act(() => store.commands.restartPane(id));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(2);

    await act(async () => creates[0].resolve("pty-eski"));
    await act(async () => creates[1].resolve("pty-yeni"));
    await flush();
    expect(api.disposeTerminal).toHaveBeenCalledWith("pty-eski");
    expect(panes()[0].run).toEqual({ state: "running", ptyId: "pty-yeni" });
  });

  it("klasör yoksa bölme missingDir oluyor, başka hata mesajıyla failed", async () => {
    await ready();
    act(() => {
      store.commands.addPane("cmd", "C:\\yok");
      store.commands.addPane("cmd", "C:\\a");
    });
    await flush();
    await act(async () =>
      creates[0].reject(new Error(`Error invoking remote method 'terminal:create': Error: ${TERMINAL_MISSING_DIR}`))
    );
    await act(async () => creates[1].reject(new Error("Error invoking remote method 'terminal:create': Error: spawn EPERM")));
    await flush();
    expect(panes()[0].run).toEqual({ state: "missingDir" });
    expect(panes()[1].run).toEqual({ state: "failed", message: "spawn EPERM" });
    expect(store.state.workspaces[0].error).toBe(false); // görünen alana nokta konmaz
  });
});

describe("olaylar", () => {
  it("görünmeyen alandaki çıktı okunmadı işareti koyuyor, alana geçince siliniyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    await act(async () => creates[0].resolve("pty-1"));
    await flush();
    const first = store.state.workspaces[0].id;

    emitData("pty-1");
    expect(store.state.workspaces[0].unread).toBe(false); // görünürken işaret yok

    act(() => store.commands.addWorkspace());
    emitData("pty-1");
    expect(store.state.workspaces[0].unread).toBe(true);

    act(() => store.commands.selectWorkspace(first));
    expect(store.state.workspaces[0].unread).toBe(false);
  });

  it("createTerminal dönmeden gelen çıkış kaybolmuyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    emitExit("pty-1", 3);
    await act(async () => creates[0].resolve("pty-1"));
    await flush();
    expect(panes()[0].run).toEqual({ state: "exited", ptyId: "pty-1", code: 3 });
  });
});

describe("kalıcılık", () => {
  it("düzen değişince yazıyor, çıktı gelince yazmıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await flush();
    const calls = api.saveConfig.mock.calls.length;
    expect(api.saveConfig).toHaveBeenLastCalledWith({
      terminalWorkspaces: [
        { id: store.state.workspaces[0].id, name: "Çalışma alanı 1", panes: [{ id: panes()[0].id, kind: "cmd", cwd: "C:\\a" }] }
      ],
      terminalActiveWorkspaceId: store.state.workspaces[0].id
    });

    await act(async () => creates[0].resolve("pty-1"));
    emitData("pty-1");
    await flush();
    expect(api.saveConfig.mock.calls.length).toBe(calls);
  });

  it("kayıtlı düzen geri getirilince aynısını yeniden yazmıyor", async () => {
    const saved = [{ id: "w1", name: "SAP", panes: [{ id: "p1", kind: "cmd" as const, cwd: "C:\\a" }] }];
    await ready({ config: { ...baseConfig, terminalWorkspaces: saved, terminalActiveWorkspaceId: "w1" } as AppConfig });
    expect(store.state.phase).toBe("restorePrompt");
    act(() => store.commands.restore());
    await flush();
    expect(store.state.workspaces[0].name).toBe("SAP");
    expect(api.saveConfig).not.toHaveBeenCalled();
  });
});

describe("proje bölmesi", () => {
  it("sayaç artınca AXET bölmesi AXET klasöründe açılıyor", async () => {
    const utils = await ready();
    utils.rerender(<Harness projectRequest={1} />);
    await flush();
    expect(panes()).toHaveLength(1);
    expect(panes()[0]).toMatchObject({ kind: "axet", cwd: "C:\\axet" });
  });

  it("6 alan × 9 bölme doluyken bildirim çıkıyor", async () => {
    const toasts: string[] = [];
    const utils = await ready({ toasts });
    act(() => {
      for (let w = 0; w < 6; w += 1) {
        if (w > 0) store.commands.addWorkspace();
      }
    });
    for (const workspace of store.state.workspaces) {
      act(() => store.commands.selectWorkspace(workspace.id));
      act(() => {
        for (let p = 0; p < 9; p += 1) store.commands.addPane("cmd", "C:\\a");
      });
    }
    expect(panes()).toHaveLength(54);

    utils.rerender(<Harness projectRequest={1} toasts={toasts} />);
    await flush();
    expect(toasts).toEqual(["Yer kalmadı: 6 çalışma alanının hepsi dolu (her birinde 9 terminal). Bir bölme kapatıp yeniden deneyin."]);
  });
});
```

Not (sınır testi): `addPane` her zaman **seçili** alana ekliyor, bu yüzden test her alanı seçip dolduruyor. `addWorkspace` tek `act` içinde beş kez çağrılınca indirgeyici sırayla uyguluyor; her yeni alan seçili oluyor.

- [ ] **Adım 3: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalStore.test.tsx`
Beklenen: FAIL — `Failed to resolve import "../src/stores/terminalStore"`.

- [ ] **Adım 4: Bağlamı yaz** — `src/stores/terminalStoreContext.ts`

```ts
// Terminal modu deposunun bağlamı. Sağlayıcıdan ayrı dosyada: bileşenler
// yalnız bunu içe aktarır, sağlayıcının etkilerini çekmez.
import { createContext, useContext } from "react";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import type { TerminalState } from "./terminalTypes";

export interface TerminalCommands {
  restore: () => void;
  startFresh: () => void;
  addWorkspace: () => void;
  selectWorkspace: (id: string) => void;
  renameWorkspace: (id: string, name: string) => void;
  closeWorkspace: (id: string) => void;
  /** Seçili alana ekler. */
  addPane: (kind: TerminalPaneKind, cwd: string) => void;
  closePane: (paneId: string) => void;
  restartPane: (paneId: string, cwd?: string) => void;
  focusPane: (paneId: string) => void;
  toggleMaximize: (paneId: string) => void;
}

export interface TerminalStoreValue {
  state: TerminalState;
  commands: TerminalCommands;
  /** Yeni bölme penceresinde önceden seçili tür: son eklenen, yoksa ayarlardaki kabuk. */
  defaultKind: TerminalPaneKind;
  /** Yeni bölme penceresinde önceden dolu klasör. */
  defaultCwd: string;
}

export const TerminalStoreContext = createContext<TerminalStoreValue | null>(null);

export function useTerminalStore(): TerminalStoreValue {
  const value = useContext(TerminalStoreContext);
  if (!value) throw new Error("useTerminalStore yalnızca TerminalStoreProvider içinde kullanılabilir");
  return value;
}
```

- [ ] **Adım 5: Sağlayıcıyı yaz** — `src/stores/terminalStore.tsx`

```tsx
// Terminal modunun sağlayıcısı (spec §5): indirgeyiciyi ana süreçteki pty'lere
// bağlar. Kararların hepsi indirgeyicide; burada yalnız yan etkiler var.
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import type { AppConfig, TerminalPaneKind } from "../../app-electron/shared/types";
import { TERMINAL_MISSING_DIR } from "../../app-electron/shared/terminalLayout";
import type { ToastMsg } from "../components/Toast";
import { useT } from "../i18n";
import {
  findPane,
  initialTerminalState,
  isWorkspaceVisible,
  nextToStart,
  paneByPty,
  terminalReducer,
  toSaved
} from "./terminalReducer";
import { TerminalStoreContext, type TerminalCommands } from "./terminalStoreContext";
import type { NameFor, TerminalPane, TerminalState } from "./terminalTypes";

/** Bölme ilk açılırken pty boyutu; xterm sığdırınca hemen yeniden boyutlanıyor. */
const INITIAL_COLS = 120;
const INITIAL_ROWS = 30;
/** Sahibi belli olmadan gelen çıkışlardan en çok bu kadarı tutulur. */
const EARLY_EXIT_LIMIT = 100;

interface TerminalStoreProviderProps {
  config: AppConfig | null;
  /** Terminal modu ekranda mı. */
  visible: boolean;
  /** "Proje terminali aç" sayacı: her artışta bir AXET bölmesi. */
  projectRequest: number;
  pushToast: (kind: ToastMsg["kind"], text: string) => void;
  onConfigSaved: (config: AppConfig) => void;
  children: ReactNode;
}

/** Kaydedilen düzenin karşılaştırma imzası; alan sırası sabit. */
function signature(workspaces: AppConfig["terminalWorkspaces"], activeId: string | null): string {
  return JSON.stringify({
    workspaces: workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      panes: w.panes.map((p) => ({ id: p.id, kind: p.kind, cwd: p.cwd }))
    })),
    activeId
  });
}

/** IPC'nin eklediği "Error invoking remote method '…': Error: " önekini atar. */
function ipcMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");
}

function panesOf(state: TerminalState, workspaceId: string): TerminalPane[] {
  return state.workspaces.find((w) => w.id === workspaceId)?.panes ?? [];
}

function ptyOf(pane: TerminalPane): string | null {
  return pane.run.state === "running" || pane.run.state === "exited" ? pane.run.ptyId : null;
}

export function TerminalStoreProvider({
  config,
  visible,
  projectRequest,
  pushToast,
  onConfigSaved,
  children
}: TerminalStoreProviderProps) {
  const t = useT();
  const [state, dispatch] = useReducer(terminalReducer, initialTerminalState);
  const [cleaned, setCleaned] = useState(false);
  const [lastKind, setLastKind] = useState<TerminalPaneKind | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const configRef = useRef(config);
  configRef.current = config;
  const nameForRef = useRef<NameFor>((n) => String(n));
  nameForRef.current = (n) => t("terminal.workspaceName", { n });

  const cleanupStarted = useRef(false);
  const spawnSeq = useRef(0);
  /** Başlamakta olan bölme → deneme numarası. Kapatma/yeniden başlatma siler. */
  const spawnTokens = useRef(new Map<string, number>());
  /** Tanınan pty → bölme. */
  const ptyOwners = useRef(new Map<string, string>());
  /** `createTerminal` dönmeden gelen çıkışlar. */
  const earlyExits = useRef(new Map<string, number>());
  const lastWritten = useRef<string | null>(null);
  const handledProjectRequest = useRef(projectRequest);
  const seenLimitHits = useRef(0);

  // 1. Ctrl+R sonrası eski kabuklar: ref, StrictMode'un ikinci çalıştırmasında da tutuyor.
  useEffect(() => {
    if (cleanupStarted.current) return;
    cleanupStarted.current = true;
    window.api
      .disposeAllTerminals()
      .catch(() => {})
      .then(() => setCleaned(true));
  }, []);

  // 3. Olaylar.
  useEffect(() => {
    const offData = window.api.onTerminalData((ptyId) => {
      const current = stateRef.current;
      const found = paneByPty(current, ptyId);
      if (!found || found.workspace.unread || isWorkspaceVisible(current, found.workspace.id)) return;
      dispatch({ type: "ptyData", ptyId });
    });
    const offExit = window.api.onTerminalExit((ptyId, code) => {
      if (ptyOwners.current.has(ptyId)) {
        dispatch({ type: "ptyExit", ptyId, code });
        return;
      }
      if (earlyExits.current.size >= EARLY_EXIT_LIMIT) {
        const oldest = earlyExits.current.keys().next().value;
        if (oldest !== undefined) earlyExits.current.delete(oldest);
      }
      earlyExits.current.set(ptyId, code);
    });
    return () => {
      offData();
      offExit();
    };
  }, []);

  useEffect(() => {
    dispatch({ type: "setVisible", visible });
  }, [visible]);

  // Mod ilk kez görününce kayıtlı düzen okunuyor.
  useEffect(() => {
    if (!visible || !config || state.phase !== "closed") return;
    if (lastWritten.current === null) {
      lastWritten.current = signature(config.terminalWorkspaces, config.terminalActiveWorkspaceId);
    }
    dispatch({
      type: "open",
      saved: config.terminalWorkspaces,
      activeId: config.terminalActiveWorkspaceId,
      freshId: crypto.randomUUID(),
      nameFor: nameForRef.current
    });
  }, [visible, config, state.phase]);

  // 2. Başlatma.
  useEffect(() => {
    if (!cleaned || !config) return;
    for (const pane of nextToStart(state)) {
      if (spawnTokens.current.has(pane.id)) continue;
      const token = ++spawnSeq.current;
      spawnTokens.current.set(pane.id, token);
      dispatch({ type: "spawnStarted", paneId: pane.id, token });
      const shell = pane.kind === "axet" ? config.terminal : pane.kind;
      const command = pane.kind === "axet" ? config.axetCommand || "axet-code -y" : undefined;
      window.api
        .createTerminal(pane.cwd, INITIAL_COLS, INITIAL_ROWS, shell, command, { createDir: false })
        .then(
          (ptyId) => {
            if (spawnTokens.current.get(pane.id) !== token) {
              void window.api.disposeTerminal(ptyId).catch(() => {});
              return;
            }
            spawnTokens.current.delete(pane.id);
            ptyOwners.current.set(ptyId, pane.id);
            dispatch({ type: "spawnSucceeded", paneId: pane.id, token, ptyId });
            const code = earlyExits.current.get(ptyId);
            if (code !== undefined) {
              earlyExits.current.delete(ptyId);
              dispatch({ type: "ptyExit", ptyId, code });
            }
          },
          (error: unknown) => {
            if (spawnTokens.current.get(pane.id) !== token) return;
            spawnTokens.current.delete(pane.id);
            const message = ipcMessage(error);
            dispatch({
              type: "spawnFailed",
              paneId: pane.id,
              token,
              message,
              missingDir: message.includes(TERMINAL_MISSING_DIR)
            });
          }
        );
    }
  }, [state, cleaned, config]);

  // 4. Kalıcılık: yalnız düzen değişince.
  useEffect(() => {
    if (state.phase !== "ready") return;
    const saved = toSaved(state);
    const next = signature(saved.workspaces, saved.activeId);
    if (next === lastWritten.current) return;
    lastWritten.current = next;
    window.api
      .saveConfig({ terminalWorkspaces: saved.workspaces, terminalActiveWorkspaceId: saved.activeId })
      .then(onConfigSaved)
      .catch(() => {});
  }, [state, onConfigSaved]);

  // 5. Proje bölmesi.
  useEffect(() => {
    if (projectRequest <= handledProjectRequest.current) return;
    handledProjectRequest.current = projectRequest;
    const current = configRef.current;
    dispatch({
      type: "addProjectPane",
      paneId: crypto.randomUUID(),
      spareWorkspaceId: crypto.randomUUID(),
      cwd: current?.axetWorkspaceDir || current?.projectsBaseDir || "",
      nameFor: nameForRef.current
    });
  }, [projectRequest]);

  // 6. Sınır bildirimi.
  useEffect(() => {
    if (state.limitHits > seenLimitHits.current) pushToast("error", t("terminal.workspaceLimitReached"));
    seenLimitHits.current = state.limitHits;
  }, [state.limitHits, pushToast, t]);

  const commands = useMemo<TerminalCommands>(() => {
    /** Bölmenin süreci varsa kapatır, izlerini siler. */
    const release = (pane: TerminalPane) => {
      spawnTokens.current.delete(pane.id);
      const ptyId = ptyOf(pane);
      if (!ptyId) return;
      ptyOwners.current.delete(ptyId);
      void window.api.disposeTerminal(ptyId).catch(() => {});
    };
    return {
      restore: () => dispatch({ type: "restore", nameFor: nameForRef.current }),
      startFresh: () => dispatch({ type: "startFresh", freshId: crypto.randomUUID(), nameFor: nameForRef.current }),
      addWorkspace: () => dispatch({ type: "addWorkspace", id: crypto.randomUUID(), nameFor: nameForRef.current }),
      selectWorkspace: (id) => dispatch({ type: "selectWorkspace", id }),
      renameWorkspace: (id, name) => dispatch({ type: "renameWorkspace", id, name }),
      closeWorkspace: (id) => {
        panesOf(stateRef.current, id).forEach(release);
        dispatch({ type: "closeWorkspace", id, freshId: crypto.randomUUID(), nameFor: nameForRef.current });
      },
      addPane: (kind, cwd) => {
        const workspaceId = stateRef.current.activeWorkspaceId;
        if (!workspaceId) return;
        setLastKind(kind);
        dispatch({ type: "addPane", workspaceId, paneId: crypto.randomUUID(), kind, cwd });
      },
      closePane: (paneId) => {
        const found = findPane(stateRef.current, paneId);
        if (found) release(found.pane);
        dispatch({ type: "closePane", paneId });
      },
      restartPane: (paneId, cwd) => {
        const found = findPane(stateRef.current, paneId);
        if (found) release(found.pane);
        dispatch({ type: "restartPane", paneId, cwd });
      },
      focusPane: (paneId) => dispatch({ type: "focusPane", paneId }),
      toggleMaximize: (paneId) => dispatch({ type: "toggleMaximize", paneId })
    };
  }, []);

  const activePanes = panesOf(state, state.activeWorkspaceId ?? "");
  const defaultKind: TerminalPaneKind = lastKind ?? config?.terminal ?? "cmd";
  const defaultCwd = activePanes[activePanes.length - 1]?.cwd ?? config?.projectsBaseDir ?? "";
  const value = useMemo(
    () => ({ state, commands, defaultKind, defaultCwd }),
    [state, commands, defaultKind, defaultCwd]
  );

  return <TerminalStoreContext.Provider value={value}>{children}</TerminalStoreContext.Provider>;
}
```

Notlar:
- `addPane` art arda çağrılınca (sınır testi) `stateRef` henüz yenilenmemiş olabilir; bu yalnız `activeWorkspaceId`'yi okuduğu için sorun değil. Dolu alana fazla ekleme indirgeyicide düşüyor.
- `release`, `restartPane`'de de çalışıyor: çıkmış bölmenin xterm'i kapanıyor, yeni süreç temiz ekranla başlıyor.
- Açık etkisinde `lastWritten` ilk kez config'ten doluyor; böylece geri getirme aynı düzeni yeniden yazmıyor.

- [ ] **Adım 6: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalStore.test.tsx tests/terminalReducer.test.ts`
Beklenen: PASS (hepsi).

- [ ] **Adım 7: Tip denetimi** — `npm run -s typecheck`
Beklenen: hata yok.

- [ ] **Adım 8: Commit**

```bash
git add src/stores/terminalStoreContext.ts src/stores/terminalStore.tsx src/i18n/tr.ts src/i18n/en.ts tests/terminalStore.test.tsx
git commit -m "Terminal: surecleri baslatan saglayici

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 6: Dördüncü mod — sekme, Ctrl+4, metinler

**Dosyalar:**
- Değiştir: `src/shell/activity.ts`
- Değiştir: `src/shell/Sidebar.tsx` (l.2, l.29, l.33-50)
- Değiştir: `src/shell/useShellShortcuts.ts`
- Değiştir: `src/App.tsx` (yalnız iki yer: kenar çubuğu listesi ve ana alan; asıl bağlama Görev 9)
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/shellShortcuts.test.tsx`, `tests/shellSidebar.test.tsx`

**Arayüzler:**
- Üretir: `Activity` ve `SidebarMode` birliğinde `"terminal"`; `SIDEBAR_MODES = ["axetCode", "sapLauncher", "sapGuiScripting", "terminal"]`
- Üretir: `ShellShortcutOptions`'tan `sidebarHidden` kalkıyor (App Görev 9'da güncelleniyor; bu görevde App'teki `sidebarHidden` satırı yalnız kısayol çağrısından siliniyor)
- Üretir (i18n): aşağıdaki tüm `terminal.*` anahtarları ve `shell.modeTerminal`, `shell.terminal`. Görev 7 ve 8 bunları kullanıyor.

- [ ] **Adım 1: Kısayol testlerini güncelle** — `tests/shellShortcuts.test.tsx`

`setup` içindeki ve "kutu açılıştan bir kare sonra" testindeki `sidebarHidden: false,` satırlarını sil.

"Ctrl+1 / 2 / 3" bloğunu şununla değiştir:

```tsx
describe("Ctrl+1 / 2 / 3 / 4", () => {
  it("sırayla Sohbet, Logon, Script, Terminal", () => {
    const { props } = setup();
    const modes: SidebarMode[] = ["axetCode", "sapLauncher", "sapGuiScripting", "terminal"];
    modes.forEach((mode, i) => {
      expect(fireEvent.keyDown(document.body, { key: String(i + 1), ctrlKey: true })).toBe(false);
      expect(props.onModeChange).toHaveBeenLastCalledWith(mode);
    });
  });

  it("sıradan bir yazı alanında da çalışıyor", () => {
    const { props } = setup();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Mesaj" }), { key: "2", ctrlKey: true });
    expect(props.onModeChange).toHaveBeenCalledWith("sapLauncher");
  });

  it("terminalin içinden gelince dokunulmuyor (Ctrl+4 dahil)", () => {
    const { props } = setup();
    const terminal = screen.getByRole("textbox", { name: "Terminal girdisi" });
    expect(fireEvent.keyDown(terminal, { key: "2", ctrlKey: true })).toBe(true);
    expect(fireEvent.keyDown(terminal, { key: "4", ctrlKey: true })).toBe(true);
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it("Shift, Alt ya da başka bir rakamla hiçbir şey olmuyor", () => {
    const { props } = setup();
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true, altKey: true });
    fireEvent.keyDown(document.body, { key: "5", ctrlKey: true });
    fireEvent.keyDown(document.body, { key: "1" });
    expect(props.onModeChange).not.toHaveBeenCalled();
  });

  it("bileşen kalkınca dinleyici de kalkıyor", () => {
    const { props, unmount } = setup();
    unmount();
    fireEvent.keyDown(document.body, { key: "1", ctrlKey: true });
    expect(props.onModeChange).not.toHaveBeenCalled();
  });
});
```

"Script'te ve kenar çubuğu gizliyken hiçbir şey olmuyor" testini şununla değiştir:

```tsx
  it("Script'te ve Terminal'de hiçbir şey olmuyor", () => {
    for (const listMode of ["sapGuiScripting", "terminal"] as const) {
      const { props } = setup({ listMode, sidebarCollapsed: true });
      expect(fireEvent.keyDown(document.body, { key: "/" })).toBe(true);
      expect(props.onExpandSidebar).not.toHaveBeenCalled();
      cleanup();
    }
  });
```

"Logon'da daraltılmışsa önce açıyor; gizliyken açmıyor" testini şununla değiştir (gizli kenar çubuğu artık yok):

```tsx
  it("Logon'da daraltılmışsa önce açıyor, sonra odaklıyor", async () => {
    const { props } = setup({ listMode: "sapLauncher", sidebarCollapsed: true });
    fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
    expect(props.onExpandSidebar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(search()));
  });

  it("Terminal'de yalnızca tarayıcının bul çubuğunu engelliyor", () => {
    const { props } = setup({ listMode: "terminal", sidebarCollapsed: true });
    expect(fireEvent.keyDown(document.body, { key: "f", ctrlKey: true })).toBe(false);
    expect(props.onExpandSidebar).not.toHaveBeenCalled();
  });
```

- [ ] **Adım 2: Kenar çubuğu testlerini güncelle** — `tests/shellSidebar.test.tsx`

- `listModeOf` testine ekle: `expect(isSidebarMode("terminal")).toBe(true);`
- "Hazırlık açıkken hiçbir sekme seçili değil" testinde `[0, -1, -1]` → `[0, -1, -1, -1]`.
- "Hazırlık açıkken ok tuşları uçtan başlıyor" testinde sol okun beklediği son mod `"sapGuiScripting"` ise `"terminal"` yap (son sekme artık Terminal). Testi aç, sol ok (`ArrowLeft`) sonrasındaki `toHaveBeenLastCalledWith` satırını bul; sağ ok satırları değişmiyor.
- Şerit testindeki ad listesine ekle: `["Axet Chat", "aXet SAP Logon", "SAP GUI Scripting", "Terminal"]`.
- Yeni test, `describe("Sidebar")` içine:

```tsx
  it("dördüncü sekme Terminal", () => {
    const { onModeChange } = renderSidebar({ mode: "axetCode" });
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Sohbet", "Logon", "Script", "Terminal"]);
    fireEvent.click(screen.getByRole("tab", { name: "Terminal" }));
    expect(onModeChange).toHaveBeenCalledWith("terminal");
  });
```

- [ ] **Adım 3: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/shellShortcuts.test.tsx tests/shellSidebar.test.tsx`
Beklenen: FAIL — Ctrl+4 çağrılmıyor, "Terminal" sekmesi yok; ayrıca tip hatası yüzünden değil, beklenti farkıyla (vitest tipi denetlemiyor).

- [ ] **Adım 4: `src/shell/activity.ts`**

`Activity` birliğine `| "terminal"` ekle (`"readiness"`'ten önce). Altını şöyle yap:

```ts
// Kenar çubuğunda listesi olan ekranlar; mod seçicinin sekmeleri bu sırada.
// Terminal sonda: Ctrl+1/2/3 alışkanlığı bozulmasın (terminal spec'i §3.1).
export type SidebarMode = "axetCode" | "sapLauncher" | "sapGuiScripting" | "terminal";

export const SIDEBAR_MODES: SidebarMode[] = ["axetCode", "sapLauncher", "sapGuiScripting", "terminal"];
```

- [ ] **Adım 5: `src/shell/Sidebar.tsx`**

l.2 içe aktarmaya `TerminalSquare` ekle:

```ts
import { MousePointerClick, PanelLeftOpen, Server, Sparkles, TerminalSquare, type LucideIcon } from "lucide-react";
```

l.29 yorumu: `// Modun listesi: \`ChatSidebar\`, \`LogonSidebar\`, \`ScriptSidebar\` ya da \`TerminalSidebar\`.`

Üç tabloya dördüncü satırı ekle:

```ts
const MODE_LABEL: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.modeChat",
  sapLauncher: "shell.modeLogon",
  sapGuiScripting: "shell.modeScript",
  terminal: "shell.modeTerminal"
};
```

```ts
const MODE_ICON: Record<SidebarMode, LucideIcon> = {
  axetCode: Sparkles,
  sapLauncher: Server,
  sapGuiScripting: MousePointerClick,
  terminal: TerminalSquare
};
const MODE_NAME: Record<SidebarMode, TranslationKey> = {
  axetCode: "shell.axetCode",
  sapLauncher: "shell.sapLauncher",
  sapGuiScripting: "shell.sapGuiScripting",
  terminal: "shell.terminal"
};
```

(`MODE_LABEL`'ın üstündeki yorum satırlarına dokunma.)

- [ ] **Adım 6: `src/shell/useShellShortcuts.ts`**

`ShellShortcutOptions`'tan `sidebarHidden` alanını ve yorumunu ("Logon terminali tam ekranken…") sil. `onKeyDown`'da:

```ts
      const { listMode, onModeChange } = latest.current;
```

```ts
      if (mod && !e.altKey && !e.shiftKey && /^[1-4]$/.test(e.key)) {
```

```ts
      if (isFind) {
        e.preventDefault();
        if (listMode === "sapLauncher") openSearch();
        return;
      }

      if (e.key === "/" && !mod && !e.altKey) {
        // Script'te ve Terminal'de kenar çubuğunda arama kutusu yok.
        if (listMode === "sapGuiScripting" || listMode === "terminal" || isTypingTarget(e.target)) return;
        e.preventDefault();
        openSearch();
      }
```

Aradaki yorumlarda "Ctrl+1/2/3" geçen yerleri "Ctrl+1–4" yap.

- [ ] **Adım 7: `src/App.tsx` — ara durum**

Kısayol çağrısından (`useShellShortcuts({ … })`, ~l.1034) `sidebarHidden,` satırını sil. `const sidebarHidden = …` satırı kalıyor (kenar çubuğunu gizlemek için hâlâ kullanılıyor; Görev 9 siliyor).

Kenar çubuğu listesinde (~l.1142) son dalı şöyle yap; Terminal'in listesi Görev 9'da bağlanıyor:

```tsx
            ) : listMode === "sapGuiScripting" ? (
              <ScriptSidebar />
            ) : null}
```

Ana alanda (~l.1172) Terminal modunda Logon ekranı çizilmesin:

```tsx
        {activity === "axetCode" || activity === "terminal" ? null : activity === "sapGuiScripting" ? (
```

- [ ] **Adım 8: i18n** — `src/i18n/tr.ts`

`"shell.modeScript"` satırının altına:

```ts
  "shell.modeTerminal": "Terminal",
  "shell.terminal": "Terminal",
```

Görev 5'te eklenen iki `terminal.*` satırının altına:

```ts
  "terminal.workspaces": "Çalışma alanları",
  "terminal.newWorkspace": "Yeni çalışma alanı",
  "terminal.workspaceMax": "En fazla 6 çalışma alanı",
  "terminal.workspaceNameLabel": "Çalışma alanı adı",
  "terminal.rename": "Yeniden adlandır",
  "terminal.close": "Kapat",
  "terminal.closeWorkspaceTitle": "Çalışma alanı kapatılsın mı?",
  "terminal.closeWorkspaceBody": "Bu alandaki {count} terminal kapanacak.",
  "terminal.closePaneTitle": "axet-code kapatılsın mı?",
  "terminal.closePaneBody": "Çalışan axet-code oturumu sonlanacak.",
  "terminal.paneCount": "{count} / 9 bölme",
  "terminal.addPane": "Bölme",
  "terminal.paneMax": "En fazla 9 bölme",
  "terminal.maximize": "Büyüt",
  "terminal.unmaximize": "Küçült",
  "terminal.restart": "Yeniden başlat",
  "terminal.queued": "Sırada…",
  "terminal.starting": "Başlatılıyor…",
  "terminal.exited": "Süreç kapandı (kod {code}) — yeniden başlatmak için ↻",
  "terminal.failed": "Başlatılamadı: {message}",
  "terminal.missingDir": "Klasör bulunamadı: {path}",
  "terminal.pickFolder": "Klasör seç",
  "terminal.remove": "Kaldır",
  "terminal.restorePrompt": "Son düzen: {workspaces} alan, {panes} bölme",
  "terminal.restoreLayout": "Geri yükle",
  "terminal.startFresh": "Boş başla",
  "terminal.emptyTitle": "Bu alanda terminal yok",
  "terminal.emptyHint": "Bir tür seç; bölme aşağıdaki klasörde açılır.",
  "terminal.kindAxet": "axet-code",
  "terminal.kindCmd": "cmd",
  "terminal.kindPowershell": "PowerShell",
  "terminal.newPaneTitle": "Yeni bölme",
  "terminal.kindLabel": "Tür",
  "terminal.folderLabel": "Klasör",
  "terminal.noFolder": "Klasör seçilmedi",
  "terminal.changeFolder": "Değiştir",
  "terminal.open": "Aç",
  "terminal.resizeColumns": "Sütun genişliği",
  "terminal.resizeRows": "Satır yüksekliği",
```

`src/i18n/en.ts` — aynı yerlere:

```ts
  "shell.modeTerminal": "Terminal",
  "shell.terminal": "Terminal",
```

```ts
  "terminal.workspaces": "Workspaces",
  "terminal.newWorkspace": "New workspace",
  "terminal.workspaceMax": "At most 6 workspaces",
  "terminal.workspaceNameLabel": "Workspace name",
  "terminal.rename": "Rename",
  "terminal.close": "Close",
  "terminal.closeWorkspaceTitle": "Close workspace?",
  "terminal.closeWorkspaceBody": "{count} terminals in this workspace will be closed.",
  "terminal.closePaneTitle": "Close axet-code?",
  "terminal.closePaneBody": "The running axet-code session will end.",
  "terminal.paneCount": "{count} / 9 panes",
  "terminal.addPane": "Pane",
  "terminal.paneMax": "At most 9 panes",
  "terminal.maximize": "Maximize",
  "terminal.unmaximize": "Restore size",
  "terminal.restart": "Restart",
  "terminal.queued": "Queued…",
  "terminal.starting": "Starting…",
  "terminal.exited": "Process exited (code {code}) — press ↻ to restart",
  "terminal.failed": "Could not start: {message}",
  "terminal.missingDir": "Folder not found: {path}",
  "terminal.pickFolder": "Choose folder",
  "terminal.remove": "Remove",
  "terminal.restorePrompt": "Last layout: {workspaces} workspaces, {panes} panes",
  "terminal.restoreLayout": "Restore",
  "terminal.startFresh": "Start fresh",
  "terminal.emptyTitle": "No terminals in this workspace",
  "terminal.emptyHint": "Pick a type; the pane opens in the folder below.",
  "terminal.kindAxet": "axet-code",
  "terminal.kindCmd": "cmd",
  "terminal.kindPowershell": "PowerShell",
  "terminal.newPaneTitle": "New pane",
  "terminal.kindLabel": "Type",
  "terminal.folderLabel": "Folder",
  "terminal.noFolder": "No folder selected",
  "terminal.changeFolder": "Change",
  "terminal.open": "Open",
  "terminal.resizeColumns": "Column width",
  "terminal.resizeRows": "Row height",
```

Bugün `tr.ts`'te `"terminal.` ile başlayan anahtar yok (2026-09-30 sayıldı: 0); çakışma olmaz.

- [ ] **Adım 9: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/shellShortcuts.test.tsx tests/shellSidebar.test.tsx`
Beklenen: PASS (hepsi).

- [ ] **Adım 10: Tip denetimi** — `npm run -s typecheck`
Beklenen: hata yok. (`Record<SidebarMode, …>` tabloları dördüncü satırı zorunlu kılıyor; eksik kalırsa burada görünür.)

- [ ] **Adım 11: Commit**

```bash
git add src/shell/activity.ts src/shell/Sidebar.tsx src/shell/useShellShortcuts.ts src/App.tsx src/i18n/tr.ts src/i18n/en.ts tests/shellShortcuts.test.tsx tests/shellSidebar.test.tsx
git commit -m "Terminal: dorduncu mod sekmesi, Ctrl+4 ve metinler

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 7: Kenar çubuğu — çalışma alanı listesi

**Dosyalar:**
- Oluştur: `src/components/TerminalSidebar.tsx`
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` (tek anahtar: onay düğmesi)
- Test: `tests/terminalSidebar.test.tsx`

**Arayüzler:**
- Kullanır: `useTerminalStore()` ve `TerminalStoreContext` (`src/stores/terminalStoreContext.ts`, Görev 5); `liveCount`, `workspaceDot`, `initialTerminalState` (`src/stores/terminalReducer.ts`, Görev 4); `terminal.*` metinleri (Görev 6).
- Kullanılan hazır parçalar: `Eyebrow` (`src/ui/Eyebrow`), `ActiveLine` ve `selectedClass` (`src/shell/SidebarFooter`), `GHOST_ICON_BUTTON` (`src/ui/buttons`), `ConfirmDialog` (`src/components/ConfirmDialog`, varsayılan dışa aktarım).
- Üretir: `export default function TerminalSidebar()`. Prop almıyor; Görev 9'da App kenar çubuğuna koyuyor.

**Davranış (spec §5.1):**
- Başlık: "ÇALIŞMA ALANLARI", sağında alan sayısı ve "+" düğmesi.
- "+" iki durumda kapalı. 6 alan varsa kapalı ve `title` "En fazla 6 çalışma alanı" oluyor. Evre `ready` değilse, yani geri yükleme şeridi açıkken, yine kapalı.
- Satır: 28px. Sırasıyla nokta, ad ve mono bölme sayısı.
- Nokta: hata varsa kırmızı, okunmamış çıktı varsa mavi, ikisi de yoksa boş yer.
- Seçili satır Sohbet'teki gibi: `selectedClass(true)` ve `ActiveLine`.
- Tıklama, Enter ya da Boşluk alanı seçiyor.
- Adlandırma üç yoldan açılıyor: çift tıklama, F2 ya da sağ tık menüsündeki "Yeniden adlandır".
  - Enter ya da odak kaybı kaydediyor. Escape vazgeçiyor.
  - Boş ad ya da aynı ad hiçbir şey göndermiyor.
- Sağ tık menüsü sabit konumda açılıyor. Pencerenin sağ ve alt kenarına sıkıştırılıyor. Dışarı tıklama ya da Escape menüyü kapatıyor.
- Menüdeki "Kapat" iki türlü davranıyor:
  - `liveCount > 0` ise onay soruyor: "Bu alandaki {count} terminal kapanacak."
  - Canlı süreç yoksa alanı doğrudan kapatıyor.

- [ ] **Adım 1: Başarısız testi yaz** — `tests/terminalSidebar.test.tsx`

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalSidebar from "../src/components/TerminalSidebar";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";

afterEach(cleanup);

function ws(id: string, name: string, runs: PaneRun[] = [], extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    id,
    name,
    panes: runs.map((run, i) => ({ id: `${id}-p${i}`, kind: "cmd" as const, cwd: "C:\\a", run })),
    focusedPaneId: null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    ...extra
  };
}

function commandsMock(): TerminalCommands {
  return {
    restore: vi.fn(),
    startFresh: vi.fn(),
    addWorkspace: vi.fn(),
    selectWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    closeWorkspace: vi.fn(),
    addPane: vi.fn(),
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn()
  };
}

function renderSidebar(workspaces: TerminalWorkspace[], over: Partial<TerminalState> = {}) {
  const commands = commandsMock();
  const state: TerminalState = {
    ...initialTerminalState,
    phase: "ready",
    visible: true,
    workspaces,
    activeWorkspaceId: workspaces[0]?.id ?? null,
    ...over
  };
  const value: TerminalStoreValue = { state, commands, defaultKind: "cmd", defaultCwd: "C:\\a" };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={value}>
        <TerminalSidebar />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

const running: PaneRun = { state: "running", ptyId: "t1" };

function row(name: string): HTMLElement {
  return screen.getByText(name).closest("[role=button]") as HTMLElement;
}

describe("TerminalSidebar", () => {
  it("alanları sayısıyla listeliyor, seçiliyi işaretliyor", () => {
    renderSidebar([ws("a", "API", [running, running]), ws("b", "UI")], { activeWorkspaceId: "b" });
    expect(screen.getByText("Çalışma alanları")).toBeTruthy();
    expect(row("UI").getAttribute("aria-current")).toBe("true");
    expect(row("API").getAttribute("aria-current")).toBeNull();
    expect(row("API").textContent).toContain("2");
  });

  it("tıklama ve Enter alanı seçiyor", () => {
    const c = renderSidebar([ws("a", "API"), ws("b", "UI")]);
    fireEvent.click(row("UI"));
    fireEvent.keyDown(row("API"), { key: "Enter" });
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(1, "b");
    expect(c.selectWorkspace).toHaveBeenNthCalledWith(2, "a");
  });

  it("hata noktası okunmamış noktasından önce geliyor", () => {
    renderSidebar([
      ws("a", "API", [], { error: true, unread: true }),
      ws("b", "UI", [], { unread: true }),
      ws("c", "DB")
    ]);
    expect(row("API").querySelector("[data-dot]")?.getAttribute("data-dot")).toBe("error");
    expect(row("UI").querySelector("[data-dot]")?.getAttribute("data-dot")).toBe("unread");
    expect(row("DB").querySelector("[data-dot]")).toBeNull();
  });

  it("+ yeni alan açıyor; 6 alanda kapalı ve nedenini söylüyor", () => {
    const c = renderSidebar([ws("a", "A")]);
    fireEvent.click(screen.getByTitle("Yeni çalışma alanı"));
    expect(c.addWorkspace).toHaveBeenCalledTimes(1);
    cleanup();
    renderSidebar(["1", "2", "3", "4", "5", "6"].map((n) => ws(n, `W${n}`)));
    const plus = screen.getByTitle("En fazla 6 çalışma alanı") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("geri yükleme şeridi açıkken + kapalı", () => {
    renderSidebar([], { phase: "restorePrompt" });
    const plus = screen.getByTitle("Yeni çalışma alanı") as HTMLButtonElement;
    expect(plus.disabled).toBe(true);
  });

  it("çift tıklayıp yeniden adlandırma: Enter kaydediyor, boşlukları kırpıyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.doubleClick(row("API"));
    const input = screen.getByLabelText("Çalışma alanı adı") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "  Backend  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(c.renameWorkspace).toHaveBeenCalledWith("a", "Backend");
    expect(screen.queryByLabelText("Çalışma alanı adı")).toBeNull();
  });

  it("boş ad ve Escape hiçbir şey göndermiyor", () => {
    const c = renderSidebar([ws("a", "API")]);
    fireEvent.keyDown(row("API"), { key: "F2" });
    const input = screen.getByLabelText("Çalışma alanı adı");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.doubleClick(row("API"));
    fireEvent.change(screen.getByLabelText("Çalışma alanı adı"), { target: { value: "Yeni" } });
    fireEvent.keyDown(screen.getByLabelText("Çalışma alanı adı"), { key: "Escape" });
    expect(c.renameWorkspace).not.toHaveBeenCalled();
    expect(screen.getByText("API")).toBeTruthy();
  });

  it("sağ tık menüsü: Yeniden adlandır girişi açıyor, Escape menüyü kapatıyor", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    expect(screen.getByRole("menu")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Yeniden adlandır" }));
    expect(screen.getByLabelText("Çalışma alanı adı")).toBeTruthy();
  });

  it("menü pencerenin dışına taşmıyor", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: window.innerWidth - 2, clientY: window.innerHeight - 2 });
    const menu = screen.getByRole("menu");
    expect(parseFloat(menu.style.left)).toBeLessThan(window.innerWidth - 100);
    expect(parseFloat(menu.style.top)).toBeLessThan(window.innerHeight - 40);
  });

  it("canlı süreç yoksa Kapat doğrudan kapatıyor", () => {
    const c = renderSidebar([ws("a", "API", [{ state: "exited", ptyId: "t1", code: 0 }]), ws("b", "UI")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).toHaveBeenCalledWith("a");
  });

  it("canlı süreç varsa Kapat önce soruyor, sayıyı söylüyor", () => {
    const c = renderSidebar([ws("a", "API", [running, { state: "starting", token: 1 }, { state: "queued" }])]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).not.toHaveBeenCalled();
    expect(screen.getByText("Bu alandaki 2 terminal kapanacak.")).toBeTruthy();
    // Pencerenin çarpısı da "Kapat" diye okunuyor; onay düğmesinin metni ayrı.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Alanı kapat" }));
    });
    expect(c.closeWorkspace).toHaveBeenCalledWith("a");
  });
});
```

- [ ] **Adım 2: Testi çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalSidebar.test.tsx > .superpowers/t7.txt 2>&1; tail -20 .superpowers/t7.txt`
Beklenen: FAIL — `Failed to resolve import "../src/components/TerminalSidebar"`.

- [ ] **Adım 3: Onay düğmesinin metnini ekle**

Pencerenin çarpı düğmesi de "Kapat" diye okunuyor (`common.close`). Onay düğmesi ayrı bir metin taşımalı, yoksa ekran okuyucu iki "Kapat" duyar.

`src/i18n/tr.ts`, `"terminal.closeWorkspaceBody"` satırının altına:

```ts
  "terminal.closeWorkspaceConfirm": "Alanı kapat",
```

`src/i18n/en.ts`, aynı yere:

```ts
  "terminal.closeWorkspaceConfirm": "Close workspace",
```

- [ ] **Adım 4: Bileşeni yaz** — `src/components/TerminalSidebar.tsx`

```tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { liveCount, workspaceDot } from "../stores/terminalReducer";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { ActiveLine, selectedClass } from "../shell/SidebarFooter";
import { Eyebrow } from "../ui/Eyebrow";
import { GHOST_ICON_BUTTON } from "../ui/buttons";
import ConfirmDialog from "./ConfirmDialog";

// Terminal modunun kenar çubuğu: çalışma alanı listesi (spec §5.1).
// Bölmeler burada değil, sağ tarafta; bu liste yalnız alan seçip yönetiyor.

const WORKSPACE_LIMIT = 6;
// Menünün yaklaşık ölçüsü: pencerenin kenarına sıkıştırmak için. Ölçüp
// yerleştirmek yerine sabit, çünkü menüde hep iki satır var.
const MENU_W = 176;
const MENU_H = 72;
const EDGE = 8;

export default function TerminalSidebar() {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const full = state.workspaces.length >= WORKSPACE_LIMIT;
  // Geri yükleme şeridi açıkken yeni alan açılmıyor: şerit "son düzen mi,
  // boş mu" sorusunu soruyor ve cevabı henüz yok.
  const canAdd = state.phase === "ready" && !full;
  const confirmTarget = state.workspaces.find((w) => w.id === confirmId) ?? null;

  const startRename = (w: TerminalWorkspace) => {
    setMenu(null);
    setDraft(w.name);
    setRenamingId(w.id);
  };

  const commitRename = () => {
    const w = state.workspaces.find((x) => x.id === renamingId);
    setRenamingId(null);
    const name = draft.trim();
    // Boş ad reddediliyor: kenar çubuğunda adsız, tıklanacak yeri olmayan bir
    // satır kalırdı.
    if (w && name && name !== w.name) commands.renameWorkspace(w.id, name);
  };

  const requestClose = (w: TerminalWorkspace) => {
    setMenu(null);
    if (liveCount(w) > 0) setConfirmId(w.id);
    else commands.closeWorkspace(w.id);
  };

  const menuTarget = state.workspaces.find((w) => w.id === menu?.id) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-1 px-3">
        <Eyebrow className="flex-1" count={state.workspaces.length}>
          {t("terminal.workspaces")}
        </Eyebrow>
        <button
          type="button"
          onClick={() => commands.addWorkspace()}
          disabled={!canAdd}
          title={full ? t("terminal.workspaceMax") : t("terminal.newWorkspace")}
          aria-label={full ? t("terminal.workspaceMax") : t("terminal.newWorkspace")}
          className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {state.workspaces.map((w) => {
          if (renamingId === w.id) {
            return (
              <div key={w.id} className="flex h-7 items-center px-1">
                <input
                  autoFocus
                  aria-label={t("terminal.workspaceNameLabel")}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      // Önce kapatılıyor: blur `commitRename`'i yine tetiklemesin.
                      setRenamingId(null);
                    }
                  }}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded bg-app px-2 py-0.5 text-sm text-slate-100 outline-none ring-1 ring-accent-500/50"
                />
              </div>
            );
          }
          const selected = state.activeWorkspaceId === w.id;
          const dot = workspaceDot(w);
          return (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              aria-current={selected ? "true" : undefined}
              title={w.name}
              onClick={() => commands.selectWorkspace(w.id)}
              onDoubleClick={() => startRename(w)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  commands.selectWorkspace(w.id);
                } else if (e.key === "F2") {
                  e.preventDefault();
                  startRename(w);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenu({ id: w.id, x: e.clientX, y: e.clientY });
              }}
              className={`group relative flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors ${selectedClass(selected)}`}
            >
              {selected && <ActiveLine />}
              {/* Nokta için yer hep ayrılıyor: nokta gelip gidince adlar
                  sağa sola kaymasın. Hata, okunmamıştan önce geliyor. */}
              <span className="flex w-2 shrink-0 justify-center">
                {dot && (
                  <span
                    data-dot={dot}
                    className={`h-1.5 w-1.5 rounded-full ${
                      dot === "error" ? "bg-[var(--status-danger-solid)]" : "bg-accent-400"
                    }`}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate">{w.name}</span>
              <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">{w.panes.length}</span>
            </div>
          );
        })}
      </div>

      {/* Sağ tık menüsü SABİT konumlu: kaydırılan listenin içinde açılsaydı
          listeyle kayar ve kenar çubuğunun sınırında kırpılırdı. */}
      {menu && menuTarget && (
        <>
          <div
            className="fixed inset-0 z-dropdown"
            onClick={() => setMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu(null);
            }}
          />
          <div
            role="menu"
            tabIndex={-1}
            ref={(el) => el?.focus()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setMenu(null);
              }
            }}
            className="fixed z-dropdown rounded-md border border-line bg-card p-1 shadow-xl outline-none"
            style={{
              width: MENU_W,
              left: Math.max(EDGE, Math.min(menu.x, window.innerWidth - MENU_W - EDGE)),
              top: Math.max(EDGE, Math.min(menu.y, window.innerHeight - MENU_H - EDGE))
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => startRename(menuTarget)}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
            >
              {t("terminal.rename")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => requestClose(menuTarget)}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-[var(--status-danger-text)]"
            >
              {t("terminal.close")}
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmTarget !== null}
        title={t("terminal.closeWorkspaceTitle")}
        message={t("terminal.closeWorkspaceBody", { count: confirmTarget ? liveCount(confirmTarget) : 0 })}
        confirmLabel={t("terminal.closeWorkspaceConfirm")}
        onConfirm={() => {
          if (confirmTarget) commands.closeWorkspace(confirmTarget.id);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
```

- [ ] **Adım 5: Testi çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalSidebar.test.tsx > .superpowers/t7.txt 2>&1; tail -20 .superpowers/t7.txt`
Beklenen: PASS, 11 test.

Test Tailwind sınıfını değil, `data-dot`'u okuyor. Rengi değiştirmek testi bozmamalı.

- [ ] **Adım 6: Tip denetimi**

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok (hata yok).

- [ ] **Adım 7: İşle**

```bash
git add src/components/TerminalSidebar.tsx
git add tests/terminalSidebar.test.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git commit -m "Terminal: kenar cubugu calisma alanlari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 8: Sağ taraf — bölme, yeni bölme penceresi, ızgara

Bu görev üç parçadan oluşuyor ve her parça ayrı işleniyor:

- **8A:** `TerminalPaneView`
- **8B:** `NewPaneDialog`
- **8C:** `TerminalMode`

Sıra bu, çünkü 8C ilk ikisini kullanıyor.

**Dosyalar:**
- Oluştur: `src/terminal/TerminalPaneView.tsx`, `src/terminal/NewPaneDialog.tsx`, `src/terminal/TerminalMode.tsx`
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` (tek anahtar: bölme kapatma onayı)
- Test: `tests/terminalPaneView.test.tsx`, `tests/newPaneDialog.test.tsx`, `tests/terminalMode.test.tsx`

**Arayüzler:**
- Kullanır:
  - `useTerminalStore()` ve `TerminalStoreContext` (Görev 5)
  - `paneTone` ve `initialTerminalState` (Görev 4)
  - `gridLayout`, `equalRatios` ve `dragRatios` (`src/terminal/gridLayout.ts`, Görev 2)
  - `middleEllipsis` (`src/lib/paths.ts`, Görev 2)
  - `MAX_TERMINAL_PANES` (`app-electron/shared/terminalLayout`, Görev 1)
  - `window.api.pickFolder(): Promise<string | null>`
  - `EmbeddedTerminal` (`src/components/EmbeddedTerminal.tsx`). Props `{ sessionId: string; active: boolean }`. **Davranışı değiştirilmiyor.**
    - `active` doğruya dönünce xterm odak alıyor ve boyut yeniden hesaplanıyor.
    - Boyut değişimini kendi `ResizeObserver`'ı izliyor.
    - Çıkışta `app.terminalSessionEnded` metnini yazıyor. Bu anahtar Görev 9'da **silinmemeli**.
- Üretir:
  - `export default function TerminalPaneView({ pane, active, canMaximize, maximized }: { pane: TerminalPane; active: boolean; canMaximize: boolean; maximized: boolean })`
  - `export default function NewPaneDialog({ open, defaultKind, defaultCwd, onOpen, onCancel }: { open: boolean; defaultKind: TerminalPaneKind; defaultCwd: string; onOpen: (kind: TerminalPaneKind, cwd: string) => void; onCancel: () => void })`
  - `export default function TerminalMode()`. Prop almıyor; görünürlüğü `state.visible`'dan okuyor. Görev 9'da App bunu hep takılı tutuyor.

**Testlerde xterm yok:** `EmbeddedTerminal` sahte bir `div` ile değiştiriliyor. Sahte div `data-testid="xterm-<ptyId>"` ve `data-active` taşıyor. Böylece jsdom'da tuval açılmıyor, ama hangi bölmenin odak aldığı sınanabiliyor.

#### 8A — `TerminalPaneView`

Davranış (spec §5.3, §6):

- **Başlık:** 28px. Sırasıyla nokta, türün büyük harfli mono adı ve klasör.
  - Klasör `middleEllipsis(cwd, 40)` ile kısaltılıyor; tam yol `title`'da duruyor.
  - Sağda üç düğme var: Büyüt/Küçült (yalnız `canMaximize`), Yeniden başlat ve Kapat.
- **Nokta** `paneTone`'a göre boyanıyor:
  - `running` → yeşil (`--status-success-text`)
  - `error` → kırmızı (`--status-danger-solid`)
  - `stopped` → gri
- **Gövde, duruma göre:**
  - `running` ya da `exited`: `EmbeddedTerminal`, `sessionId = ptyId`. `exited` iken altta tek satır da çıkıyor: "Süreç kapandı (kod N) — yeniden başlatmak için ↻".
  - `queued`: "Sırada…"
  - `starting`: "Başlatılıyor…"
  - `failed`: "Başlatılamadı: …" ve ↻ düğmesi.
  - `missingDir`: "Klasör bulunamadı: <yol>", ardından "Klasör seç" ve "Kaldır".
    - "Klasör seç" seçilen klasörle `restartPane(id, yeni)` çağırıyor. Seçim iptal edilirse hiçbir şey olmuyor.
    - "Kaldır" `closePane(id)` çağırıyor.
- **Odak:** bölmenin herhangi bir yerine basılınca (`onMouseDownCapture`) ya da odak içeri girince (`onFocusCapture`) `focusPane(id)` çağrılıyor. Seçili bölmenin kenarı vurgu renginde.
- **Kapatma:** çalışan bir axet bölmesi önce onay istiyor: "Çalışan axet-code oturumu sonlanacak." Onaysız kapatılırsa sohbet oturumu habersiz ölür. Diğer türler ve çalışmayan axet bölmesi doğrudan kapanıyor.
  - Onay düğmesinin metni "Oturumu kapat". Başlıktaki "Kapat" düğmesiyle ve pencerenin çarpısıyla karışmasın.

- [ ] **Adım 1: Onay metnini ekle** — `src/i18n/tr.ts`, `"terminal.closePaneBody"` satırının altına:

```ts
  "terminal.closePaneConfirm": "Oturumu kapat",
```

`src/i18n/en.ts`, aynı yere:

```ts
  "terminal.closePaneConfirm": "End session",
```

- [ ] **Adım 2: Başarısız testi yaz** — `tests/terminalPaneView.test.tsx`

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalPaneView from "../src/terminal/TerminalPaneView";
import { TerminalStoreContext, type TerminalCommands } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalPane } from "../src/stores/terminalTypes";
import type { TerminalPaneKind } from "../app-electron/shared/types";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId, active }: { sessionId: string; active: boolean }) => (
    <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />
  )
}));

let prevApi: unknown;
let pick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
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
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn()
  };
}

function renderPane(
  run: PaneRun,
  opts: { kind?: TerminalPaneKind; cwd?: string; active?: boolean; canMaximize?: boolean; maximized?: boolean } = {}
) {
  const commands = commandsMock();
  const pane: TerminalPane = { id: "p1", kind: opts.kind ?? "cmd", cwd: opts.cwd ?? "C:\\a", run };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider
        value={{ state: initialTerminalState, commands, defaultKind: "cmd", defaultCwd: "C:\\a" }}
      >
        <TerminalPaneView
          pane={pane}
          active={opts.active ?? false}
          canMaximize={opts.canMaximize ?? true}
          maximized={opts.maximized ?? false}
        />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("TerminalPaneView", () => {
  it("çalışan bölme xterm'i gösteriyor; odak yalnız active iken", () => {
    renderPane({ state: "running", ptyId: "t1" }, { active: true });
    expect(screen.getByTestId("xterm-t1").getAttribute("data-active")).toBe("true");
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { active: false });
    expect(screen.getByTestId("xterm-t1").getAttribute("data-active")).toBe("false");
  });

  it("başlık: tür büyük harf, uzun klasör ortadan kısalıyor, tam yol title'da", () => {
    const cwd = "C:\\Users\\kullanici\\projeler\\cok-uzun-bir-klasor-adi\\alt\\son-klasor";
    renderPane({ state: "running", ptyId: "t1" }, { kind: "powershell", cwd });
    expect(screen.getByText("powershell").className).toContain("uppercase");
    const label = screen.getByTitle(cwd);
    expect(label.textContent).toContain("…");
    expect(label.textContent!.endsWith("son-klasor")).toBe(true);
  });

  it("nokta paneTone'a göre", () => {
    renderPane({ state: "running", ptyId: "t1" });
    expect(document.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("running");
    cleanup();
    renderPane({ state: "exited", ptyId: "t1", code: 2 });
    expect(document.querySelector("[data-tone]")?.getAttribute("data-tone")).toBe("error");
  });

  it("kapanan süreç: xterm kalıyor, altta kod ve ↻ ipucu", () => {
    renderPane({ state: "exited", ptyId: "t1", code: 3 });
    expect(screen.getByTestId("xterm-t1")).toBeTruthy();
    expect(screen.getByText("Süreç kapandı (kod 3) — yeniden başlatmak için ↻")).toBeTruthy();
  });

  it("sırada ve başlatılıyor metinleri", () => {
    renderPane({ state: "queued" });
    expect(screen.getByText("Sırada…")).toBeTruthy();
    cleanup();
    renderPane({ state: "starting", token: 1 });
    expect(screen.getByText("Başlatılıyor…")).toBeTruthy();
  });

  it("başlatılamadı: ileti ve yeniden başlat", () => {
    const c = renderPane({ state: "failed", message: "spawn EPERM" });
    expect(screen.getByText("Başlatılamadı: spawn EPERM")).toBeTruthy();
    const restarts = screen.getAllByTitle("Yeniden başlat");
    fireEvent.click(restarts[restarts.length - 1]);
    expect(c.restartPane).toHaveBeenCalledWith("p1");
  });

  it("klasör yok: Klasör seç yeni yolla yeniden başlatıyor, iptal hiçbir şey yapmıyor", async () => {
    const c = renderPane({ state: "missingDir" }, { cwd: "C:\\yok" });
    expect(screen.getByText("Klasör bulunamadı: C:\\yok")).toBeTruthy();
    pick.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByRole("button", { name: "Klasör seç" }));
    await flush();
    expect(c.restartPane).not.toHaveBeenCalled();
    pick.mockResolvedValueOnce("C:\\b");
    fireEvent.click(screen.getByRole("button", { name: "Klasör seç" }));
    await flush();
    expect(c.restartPane).toHaveBeenCalledWith("p1", "C:\\b");
  });

  it("klasör yok: Kaldır bölmeyi kapatıyor", () => {
    const c = renderPane({ state: "missingDir" });
    fireEvent.click(screen.getByRole("button", { name: "Kaldır" }));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });

  it("büyüt düğmesi yalnız canMaximize iken; büyütülmüşken Küçült", () => {
    const c = renderPane({ state: "running", ptyId: "t1" }, { canMaximize: true });
    fireEvent.click(screen.getByTitle("Büyüt"));
    expect(c.toggleMaximize).toHaveBeenCalledWith("p1");
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { maximized: true });
    expect(screen.getByTitle("Küçült")).toBeTruthy();
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { canMaximize: false });
    expect(screen.queryByTitle("Büyüt")).toBeNull();
  });

  it("bölmeye basınca odak komutu gidiyor", () => {
    const c = renderPane({ state: "running", ptyId: "t1" });
    fireEvent.mouseDown(screen.getByTestId("xterm-t1"));
    expect(c.focusPane).toHaveBeenCalledWith("p1");
  });

  it("cmd bölmesi sormadan kapanıyor", () => {
    const c = renderPane({ state: "running", ptyId: "t1" }, { kind: "cmd" });
    fireEvent.click(screen.getByTitle("Kapat"));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });

  it("çalışan axet bölmesi önce soruyor", () => {
    const c = renderPane({ state: "running", ptyId: "t1" }, { kind: "axet" });
    fireEvent.click(screen.getByTitle("Kapat"));
    expect(c.closePane).not.toHaveBeenCalled();
    expect(screen.getByText("Çalışan axet-code oturumu sonlanacak.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Oturumu kapat" }));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });

  it("kapanmış axet bölmesi sormadan kapanıyor", () => {
    const c = renderPane({ state: "exited", ptyId: "t1", code: 0 }, { kind: "axet" });
    fireEvent.click(screen.getByTitle("Kapat"));
    expect(c.closePane).toHaveBeenCalledWith("p1");
  });
});
```

- [ ] **Adım 3: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalPaneView.test.tsx > .superpowers/t8a.txt 2>&1; tail -20 .superpowers/t8a.txt`
Beklenen: FAIL — `Failed to resolve import "../src/terminal/TerminalPaneView"`.

- [ ] **Adım 4: Bölmeyi yaz** — `src/terminal/TerminalPaneView.tsx`

```tsx
import { useState } from "react";
import { Maximize2, Minimize2, RotateCw, X } from "lucide-react";
import { useT } from "../i18n";
import EmbeddedTerminal from "../components/EmbeddedTerminal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { paneTone } from "../stores/terminalReducer";
import type { TerminalPane } from "../stores/terminalTypes";
import { middleEllipsis } from "../lib/paths";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";

// Izgaradaki tek bölme: başlık şeridi + gövde (spec §5.3). Gövde sürecin
// durumuna göre ya xterm ya da tek satırlık bir durum metni.

const TONE_CLASS = {
  running: "bg-[var(--status-success-text)]",
  error: "bg-[var(--status-danger-solid)]",
  stopped: "bg-slate-500"
} as const;

export default function TerminalPaneView({
  pane,
  active,
  canMaximize,
  maximized
}: {
  pane: TerminalPane;
  active: boolean;
  canMaximize: boolean;
  maximized: boolean;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const [confirmClose, setConfirmClose] = useState(false);
  const run = pane.run;
  const tone = paneTone(run);
  const ptyId = run.state === "running" || run.state === "exited" ? run.ptyId : null;

  const requestClose = () => {
    // Çalışan axet oturumunu kapatmak sohbeti de bitiriyor; tek tıkla
    // kaybolmasın. Kabuklar sormadan kapanıyor.
    if (pane.kind === "axet" && run.state === "running") setConfirmClose(true);
    else commands.closePane(pane.id);
  };

  const pickFolder = async () => {
    const folder = await window.api.pickFolder();
    if (folder) commands.restartPane(pane.id, folder);
  };

  return (
    <div
      onMouseDownCapture={() => commands.focusPane(pane.id)}
      onFocusCapture={() => commands.focusPane(pane.id)}
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border bg-card ${
        active ? "border-accent-500/60" : "border-line"
      }`}
    >
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-line px-2">
        <span data-tone={tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_CLASS[tone]}`} />
        <span className="shrink-0 font-mono text-2xs font-medium uppercase tracking-[0.08em] text-slate-300">
          {pane.kind}
        </span>
        <span title={pane.cwd} className="min-w-0 flex-1 truncate font-mono text-2xs text-slate-500">
          {middleEllipsis(pane.cwd, 40)}
        </span>
        {canMaximize && (
          <button
            type="button"
            onClick={() => commands.toggleMaximize(pane.id)}
            title={maximized ? t("terminal.unmaximize") : t("terminal.maximize")}
            aria-label={maximized ? t("terminal.unmaximize") : t("terminal.maximize")}
            className={GHOST_ICON_BUTTON}
          >
            {maximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => commands.restartPane(pane.id)}
          title={t("terminal.restart")}
          aria-label={t("terminal.restart")}
          className={GHOST_ICON_BUTTON}
        >
          <RotateCw size={12} />
        </button>
        <button
          type="button"
          onClick={requestClose}
          title={t("terminal.close")}
          aria-label={t("terminal.close")}
          className={GHOST_ICON_BUTTON}
        >
          <X size={12} />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {ptyId !== null && (
          <div className="absolute inset-0 p-1">
            <EmbeddedTerminal sessionId={ptyId} active={active} />
          </div>
        )}
        {run.state === "exited" && (
          <div className="absolute inset-x-0 bottom-0 border-t border-line bg-card/95 px-3 py-1 text-xs text-slate-400">
            {t("terminal.exited", { code: run.code })}
          </div>
        )}
        {(run.state === "queued" || run.state === "starting") && (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            {run.state === "queued" ? t("terminal.queued") : t("terminal.starting")}
          </div>
        )}
        {run.state === "failed" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-[var(--status-danger-text)]">
            <span className="break-all">{t("terminal.failed", { message: run.message })}</span>
            <button
              type="button"
              onClick={() => commands.restartPane(pane.id)}
              title={t("terminal.restart")}
              aria-label={t("terminal.restart")}
              className={GHOST_ICON_BUTTON}
            >
              <RotateCw size={14} />
            </button>
          </div>
        )}
        {run.state === "missingDir" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-xs text-slate-400">
            <span className="break-all">{t("terminal.missingDir", { path: pane.cwd })}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => void pickFolder()} className={TOOL_BUTTON}>
                {t("terminal.pickFolder")}
              </button>
              <button type="button" onClick={() => commands.closePane(pane.id)} className={TOOL_BUTTON}>
                {t("terminal.remove")}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title={t("terminal.closePaneTitle")}
        message={t("terminal.closePaneBody")}
        confirmLabel={t("terminal.closePaneConfirm")}
        onConfirm={() => {
          setConfirmClose(false);
          commands.closePane(pane.id);
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
```

- [ ] **Adım 5: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalPaneView.test.tsx > .superpowers/t8a.txt 2>&1; tail -20 .superpowers/t8a.txt`
Beklenen: PASS, 13 test.

- [ ] **Adım 6: Tip denetimi ve işleme**

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok.

```bash
git add src/terminal/TerminalPaneView.tsx
git add tests/terminalPaneView.test.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git commit -m "Terminal: bolme gorunumu ve durum satirlari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 8B — `NewPaneDialog`

Davranış (spec §5.2):

- Ortak `Modal` üzerine kurulu.
- **Tür:** üç seçenekli bir segment, `role="radiogroup"`. Açılışta `defaultKind` seçili.
- **Klasör:** `middleEllipsis`'le kısaltılmış yol gösteriliyor, tam yol `title`'da. Yanında "Değiştir" düğmesi `pickFolder` açıyor.
  - Klasör boşsa "Klasör seçilmedi" yazıyor ve "Aç" kapalı.
- **Kapanış:** Enter formu gönderiyor, "Aç" ile aynı iş. Escape ve İptal'i `Modal` karşılıyor.
- **Her açılışta sıfırlanma:** pencere her açıldığında tür ve klasör varsayılana dönüyor. Bir önceki açılışta seçilen klasör bir sonraki açılışa taşınmıyor; varsayılan zaten "son eklenen bölmenin klasörü".

- [ ] **Adım 7: Başarısız testi yaz** — `tests/newPaneDialog.test.tsx`

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import NewPaneDialog from "../src/terminal/NewPaneDialog";
import type { TerminalPaneKind } from "../app-electron/shared/types";

let prevApi: unknown;
let pick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

function renderDialog(defaultKind: TerminalPaneKind = "cmd", defaultCwd = "C:\\a") {
  const onOpen = vi.fn();
  const onCancel = vi.fn();
  const ui = (open: boolean) => (
    <LanguageProvider language="tr">
      <NewPaneDialog open={open} defaultKind={defaultKind} defaultCwd={defaultCwd} onOpen={onOpen} onCancel={onCancel} />
    </LanguageProvider>
  );
  const r = render(ui(true));
  return { onOpen, onCancel, reopen: () => { r.rerender(ui(false)); r.rerender(ui(true)); } };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("NewPaneDialog", () => {
  it("varsayılan tür seçili; Aç varsayılanlarla gönderiyor", () => {
    const { onOpen } = renderDialog("powershell");
    expect(screen.getByRole("radio", { name: "PowerShell" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(onOpen).toHaveBeenCalledWith("powershell", "C:\\a");
  });

  it("tür değişiyor, klasör Değiştir ile seçiliyor", async () => {
    const { onOpen } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: "axet-code" }));
    pick.mockResolvedValueOnce("C:\\b");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    expect(screen.getByTitle("C:\\b")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(onOpen).toHaveBeenCalledWith("axet", "C:\\b");
  });

  it("klasör seçimi iptal edilirse eski klasör kalıyor", async () => {
    renderDialog();
    pick.mockResolvedValueOnce(null);
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    expect(screen.getByTitle("C:\\a")).toBeTruthy();
  });

  it("klasör yoksa Aç kapalı ve Enter hiçbir şey göndermiyor", () => {
    const { onOpen } = renderDialog("cmd", "");
    expect(screen.getByText("Klasör seçilmedi")).toBeTruthy();
    const open = screen.getByRole("button", { name: "Aç" }) as HTMLButtonElement;
    expect(open.disabled).toBe(true);
    fireEvent.submit(open.form!);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("Enter formu gönderiyor", () => {
    const { onOpen } = renderDialog();
    fireEvent.submit((screen.getByRole("button", { name: "Aç" }) as HTMLButtonElement).form!);
    expect(onOpen).toHaveBeenCalledWith("cmd", "C:\\a");
  });

  it("İptal onCancel çağırıyor", () => {
    const { onCancel, onOpen } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("yeniden açılınca seçimler varsayılana dönüyor", () => {
    const { reopen } = renderDialog("cmd");
    fireEvent.click(screen.getByRole("radio", { name: "axet-code" }));
    reopen();
    expect(screen.getByRole("radio", { name: "cmd" }).getAttribute("aria-checked")).toBe("true");
  });
});
```

- [ ] **Adım 8: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/newPaneDialog.test.tsx > .superpowers/t8b.txt 2>&1; tail -20 .superpowers/t8b.txt`
Beklenen: FAIL — `Failed to resolve import "../src/terminal/NewPaneDialog"`.

- [ ] **Adım 9: Pencereyi yaz** — `src/terminal/NewPaneDialog.tsx`

```tsx
import { useEffect, useState, type FormEvent } from "react";
import { FolderOpen } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import { TERMINAL_PANE_KINDS } from "../../app-electron/shared/terminalLayout";
import { middleEllipsis } from "../lib/paths";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";

// "+ Bölme" penceresi (spec §5.2): tür + klasör, iki alan. Düğmeler formun
// İÇİNDE: Enter'la gönderim tarayıcının kendi form davranışı, ayrıca tuş
// dinlemeye gerek yok.

export const KIND_LABEL: Record<TerminalPaneKind, TranslationKey> = {
  axet: "terminal.kindAxet",
  cmd: "terminal.kindCmd",
  powershell: "terminal.kindPowershell"
};

export default function NewPaneDialog({
  open,
  defaultKind,
  defaultCwd,
  onOpen,
  onCancel
}: {
  open: boolean;
  defaultKind: TerminalPaneKind;
  defaultCwd: string;
  onOpen: (kind: TerminalPaneKind, cwd: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [kind, setKind] = useState<TerminalPaneKind>(defaultKind);
  const [cwd, setCwd] = useState(defaultCwd);

  // Her açılışta varsayılana dön. Varsayılan zaten "son eklenen bölme";
  // önceki açılışta yarım bırakılan seçim taşınmıyor.
  useEffect(() => {
    if (!open) return;
    setKind(defaultKind);
    setCwd(defaultCwd);
    // Yalnız açılış anı: pencere açıkken varsayılanın değişmesi (arkada
    // bölme eklenmesi) kullanıcının seçimini ezmemeli.
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!cwd) return;
    onOpen(kind, cwd);
  };

  const pick = async () => {
    const folder = await window.api.pickFolder();
    if (folder) setCwd(folder);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("terminal.newPaneTitle")} width={420}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("terminal.kindLabel")}</span>
          <div role="radiogroup" aria-label={t("terminal.kindLabel")} className="flex gap-1 rounded-md bg-control p-0.5">
            {TERMINAL_PANE_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
                  kind === k ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t(KIND_LABEL[k])}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("terminal.folderLabel")}</span>
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="shrink-0 text-accent-400" />
            <span title={cwd || undefined} className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">
              {cwd ? middleEllipsis(cwd, 44) : t("terminal.noFolder")}
            </span>
            <button type="button" onClick={() => void pick()} className={TOOL_BUTTON}>
              {t("terminal.changeFolder")}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <ModalCancelButton />
          <button type="submit" disabled={!cwd} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("terminal.open")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```


`TERMINAL_PANE_KINDS` Görev 1'de `terminalLayout.ts`'e kondu. Sıra axet, cmd, powershell; segment bu sırayla çiziliyor.

- [ ] **Adım 10: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/newPaneDialog.test.tsx > .superpowers/t8b.txt 2>&1; tail -20 .superpowers/t8b.txt`
Beklenen: PASS, 7 test.

- [ ] **Adım 11: Tip denetimi ve işleme**

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok.

```bash
git add src/terminal/NewPaneDialog.tsx
git add tests/newPaneDialog.test.tsx
git commit -m "Terminal: yeni bolme penceresi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

#### 8C — `TerminalMode`

Davranış (spec §3, §5.2, §5.4):

- **`closed` evresi:** hiçbir şey çizilmiyor. Sağlayıcı mod ilk görünür olunca `open` gönderiyor.
- **`restorePrompt` evresi:** üstte bir şerit çıkıyor: "Son düzen: N alan, M bölme".
  - Yanında "Geri yükle" ve "Boş başla" düğmeleri var.
  - Izgara ve "+ Bölme" yok.
- **`ready` evresi, seçili alan için üst şerit:**
  - Solda alan adı, yanında mono "N / 9 bölme".
  - Sağda "+ Bölme" düğmesi, `NewPaneDialog`'u açıyor. 9 bölmede kapalı ve `title` "En fazla 9 bölme" oluyor.
- **Boş alan:** "Bu alanda terminal yok" ve bir ipucu çıkıyor.
  - Altında üç tür düğmesi ve klasör satırı var.
  - Klasör varsayılanı `defaultCwd`. "Değiştir" ile klasör değişiyor.
  - Klasör yoksa düğmeler kapalı.
- **Izgara:** `gridLayout(n)` kullanılıyor, aralık 6px.
  - Sütun ve satır oranları `fr` olarak yazılıyor. Bölme sayısı değişince oranlar eşitleniyor.
- **Ayırıcılar:** `role="separator"`. Sürüklenebiliyor; en küçük oran 0,08.
  - Ok tuşları oranı ±0,02 kaydırıyor.
  - `aria-valuenow` ayırıcının solundaki ya da üstündeki toplam payı yüzde olarak veriyor.
  - 3 bölmede satır ayırıcısı yalnız sağ sütunda.
- **Büyütme:** büyütülen bölme bütün ızgarayı kaplıyor. Ötekiler `display: none` alıyor; ayırıcılar gizleniyor.
  - Ötekiler sökülmüyor: xterm'ler ve çıktıları yerinde kalıyor.
- **Bütün alanlar takılı kalıyor:** seçili olmayanlar `hidden` sınıfıyla gizleniyor. Alan değişince terminaller yeniden kurulmuyor, çıktı kaybolmuyor.
- **xterm odağı:** `active` yalnız şu üçü birlikte doğruysa açık:
  - mod görünür (`state.visible`),
  - alan seçili,
  - bölme alanın `focusedPaneId`'si.

- [ ] **Adım 12: Başarısız testi yaz** — `tests/terminalMode.test.tsx`

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalMode from "../src/terminal/TerminalMode";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { PaneRun, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId, active }: { sessionId: string; active: boolean }) => (
    <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />
  )
}));

let prevApi: unknown;
let pick: ReturnType<typeof vi.fn>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
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
    closePane: vi.fn(),
    restartPane: vi.fn(),
    focusPane: vi.fn(),
    toggleMaximize: vi.fn()
  };
}

/** `n` çalışan bölmeli alan; bölme kimlikleri `<id>-p1…`, pty'ler `<id>-t1…`. */
function ws(id: string, n: number, extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    id,
    name: `Alan ${id}`,
    panes: Array.from({ length: n }, (_, i) => ({
      id: `${id}-p${i + 1}`,
      kind: "cmd" as const,
      cwd: "C:\\a",
      run: { state: "running", ptyId: `${id}-t${i + 1}` } as PaneRun
    })),
    focusedPaneId: n > 0 ? `${id}-p1` : null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    ...extra
  };
}

function setup(over: Partial<TerminalState> = {}, defaultCwd = "C:\\a") {
  const commands = commandsMock();
  const make = (o: Partial<TerminalState>): TerminalStoreValue => ({
    state: { ...initialTerminalState, phase: "ready", visible: true, ...o },
    commands,
    defaultKind: "cmd",
    defaultCwd
  });
  const ui = (o: Partial<TerminalState>) => (
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={make(o)}>
        <TerminalMode />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(over));
  return { commands, rerender: (o: Partial<TerminalState>) => r.rerender(ui(o)) };
}

function cell(paneId: string): HTMLElement {
  return document.querySelector(`[data-pane="${paneId}"]`) as HTMLElement;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("TerminalMode", () => {
  it("kapalı evrede hiçbir şey çizmiyor", () => {
    setup({ phase: "closed" });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("geri yükleme şeridi: sayılar ve iki düğme; + Bölme yok", () => {
    const { commands } = setup({
      phase: "restorePrompt",
      saved: [
        { id: "a", name: "A", panes: [{ id: "x", kind: "cmd", cwd: "C:\\a" }] },
        { id: "b", name: "B", panes: [{ id: "y", kind: "cmd", cwd: "C:\\a" }, { id: "z", kind: "axet", cwd: "C:\\a" }] }
      ]
    });
    expect(screen.getByText("Son düzen: 2 alan, 3 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Geri yükle" }));
    fireEvent.click(screen.getByRole("button", { name: "Boş başla" }));
    expect(commands.restore).toHaveBeenCalledTimes(1);
    expect(commands.startFresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Bölme" })).toBeNull();
  });

  it("boş alan: tür düğmesi varsayılan klasörde bölme açıyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" });
    expect(screen.getByText("Bu alanda terminal yok")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "PowerShell" }));
    expect(commands.addPane).toHaveBeenCalledWith("powershell", "C:\\a");
  });

  it("boş alan: Değiştir klasörü değiştiriyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" });
    pick.mockResolvedValueOnce("C:\\b");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "axet-code" }));
    expect(commands.addPane).toHaveBeenCalledWith("axet", "C:\\b");
  });

  it("boş alan: klasör yoksa tür düğmeleri kapalı", () => {
    setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" }, "");
    expect(screen.getByText("Klasör seçilmedi")).toBeTruthy();
    expect((screen.getByRole("button", { name: "cmd" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("üst şerit: ad, sayı; + Bölme pencereyi açıyor ve ekliyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.getByText("Alan a")).toBeTruthy();
    expect(screen.getByText("2 / 9 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bölme" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a");
    expect(screen.queryByText("Yeni bölme")).toBeNull();
  });

  it("9 bölmede + Bölme kapalı ve nedenini söylüyor", () => {
    setup({ workspaces: [ws("a", 9)], activeWorkspaceId: "a" });
    const add = screen.getByRole("button", { name: "Bölme" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(add.title).toBe("En fazla 9 bölme");
  });

  it("3 bölme: soldaki iki satırı kaplıyor", () => {
    setup({ workspaces: [ws("a", 3)], activeWorkspaceId: "a" });
    expect(cell("a-p1").style.gridRow).toBe("1 / span 2");
    expect(cell("a-p2").style.gridColumn).toBe("2");
    expect(cell("a-p3").style.gridRow).toBe("2 / span 1");
  });

  it("xterm odağı: yalnız görünür + seçili alan + odaktaki bölme", () => {
    const { rerender } = setup({
      workspaces: [ws("a", 2, { focusedPaneId: "a-p2" }), ws("b", 1)],
      activeWorkspaceId: "a"
    });
    expect(screen.getByTestId("xterm-a-t1").getAttribute("data-active")).toBe("false");
    expect(screen.getByTestId("xterm-a-t2").getAttribute("data-active")).toBe("true");
    expect(screen.getByTestId("xterm-b-t1").getAttribute("data-active")).toBe("false");
    rerender({ workspaces: [ws("a", 2, { focusedPaneId: "a-p2" }), ws("b", 1)], activeWorkspaceId: "a", visible: false });
    expect(screen.getByTestId("xterm-a-t2").getAttribute("data-active")).toBe("false");
  });

  it("seçili olmayan alan takılı kalıyor ama gizli", () => {
    setup({ workspaces: [ws("a", 1), ws("b", 1)], activeWorkspaceId: "a" });
    const hidden = screen.getByTestId("xterm-b-t1").closest("[data-workspace]") as HTMLElement;
    const shown = screen.getByTestId("xterm-a-t1").closest("[data-workspace]") as HTMLElement;
    expect(hidden.className.split(" ")).toContain("hidden");
    expect(shown.className.split(" ")).not.toContain("hidden");
  });

  it("büyütme: ötekiler display none ama takılı, ayırıcı yok", () => {
    setup({ workspaces: [ws("a", 3, { maximizedPaneId: "a-p2" })], activeWorkspaceId: "a" });
    expect(cell("a-p1").style.display).toBe("none");
    expect(cell("a-p3").style.display).toBe("none");
    expect(screen.getByTestId("xterm-a-t1")).toBeTruthy();
    expect(cell("a-p2").style.gridColumn).toBe("1 / -1");
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
  });

  it("tek bölmede ayırıcı ve büyüt düğmesi yok", () => {
    setup({ workspaces: [ws("a", 1)], activeWorkspaceId: "a" });
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
    expect(screen.queryByTitle("Büyüt")).toBeNull();
  });

  it("ayırıcı ok tuşlarıyla kayıyor; bölme sayısı değişince oranlar eşitleniyor", () => {
    const { rerender } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    const sep = () => screen.getByRole("separator", { name: "Sütun genişliği" });
    expect(sep().getAttribute("aria-valuenow")).toBe("50");
    fireEvent.keyDown(sep(), { key: "ArrowRight" });
    expect(sep().getAttribute("aria-valuenow")).toBe("52");
    fireEvent.keyDown(sep(), { key: "ArrowLeft" });
    fireEvent.keyDown(sep(), { key: "ArrowLeft" });
    expect(sep().getAttribute("aria-valuenow")).toBe("48");
    rerender({ workspaces: [ws("a", 3)], activeWorkspaceId: "a" });
    expect(sep().getAttribute("aria-valuenow")).toBe("50");
    expect(screen.getByRole("separator", { name: "Satır yüksekliği" })).toBeTruthy();
  });

  it("4 bölme: bir sütun, bir satır ayırıcısı", () => {
    setup({ workspaces: [ws("a", 4)], activeWorkspaceId: "a" });
    expect(screen.getAllByRole("separator", { name: "Sütun genişliği" })).toHaveLength(1);
    expect(screen.getAllByRole("separator", { name: "Satır yüksekliği" })).toHaveLength(1);
  });
});
```

- [ ] **Adım 13: Çalıştır, başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/terminalMode.test.tsx > .superpowers/t8c.txt 2>&1; tail -20 .superpowers/t8c.txt`
Beklenen: FAIL — `Failed to resolve import "../src/terminal/TerminalMode"`.

- [ ] **Adım 14: Ekranı yaz** — `src/terminal/TerminalMode.tsx`

```tsx
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import { MAX_TERMINAL_PANES, TERMINAL_PANE_KINDS } from "../../app-electron/shared/terminalLayout";
import { dragRatios, equalRatios, gridLayout } from "./gridLayout";
import { middleEllipsis } from "../lib/paths";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalPaneView from "./TerminalPaneView";
import NewPaneDialog, { KIND_LABEL } from "./NewPaneDialog";

// Terminal modunun sağ tarafı (spec §3, §5). Bütün alanlar HEP takılı:
// seçili olmayanlar `hidden`. Alan değiştirince xterm'ler yeniden kurulmuyor,
// çıktı kaybolmuyor (Sohbet'teki hep-takılı düzenin aynısı).

const GAP = 6;
const KEY_STEP = 0.02;

export default function TerminalMode() {
  const t = useT();
  const { state, commands, defaultKind, defaultCwd } = useTerminalStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (state.phase === "closed") return null;

  const active = state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  const full = (active?.panes.length ?? 0) >= MAX_TERMINAL_PANES;
  const savedPanes = state.saved.reduce((sum, w) => sum + w.panes.length, 0);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {state.phase === "restorePrompt" && (
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-2 text-sm text-slate-300">
          <span className="min-w-0 flex-1 truncate">
            {t("terminal.restorePrompt", { workspaces: state.saved.length, panes: savedPanes })}
          </span>
          <button type="button" onClick={() => commands.startFresh()} className={TOOL_BUTTON}>
            {t("terminal.startFresh")}
          </button>
          <button type="button" onClick={() => commands.restore()} className={PRIMARY_BUTTON}>
            {t("terminal.restoreLayout")}
          </button>
        </div>
      )}

      {state.phase === "ready" && active && (
        <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
          <span className="min-w-0 truncate text-sm text-slate-200">{active.name}</span>
          <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">
            {t("terminal.paneCount", { count: active.panes.length })}
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={full}
            title={full ? t("terminal.paneMax") : undefined}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("terminal.addPane")}
          </button>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {state.workspaces.map((w) => (
          <div
            key={w.id}
            data-workspace={w.id}
            className={`${w.id === state.activeWorkspaceId ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}
          >
            {w.panes.length === 0 ? (
              <EmptyWorkspace defaultCwd={defaultCwd} onPick={(kind, cwd) => commands.addPane(kind, cwd)} />
            ) : (
              <WorkspaceGrid workspace={w} focusable={state.visible && w.id === state.activeWorkspaceId} />
            )}
          </div>
        ))}
      </div>

      <NewPaneDialog
        open={dialogOpen}
        defaultKind={defaultKind}
        defaultCwd={defaultCwd}
        onOpen={(kind, cwd) => {
          setDialogOpen(false);
          commands.addPane(kind, cwd);
        }}
        onCancel={() => setDialogOpen(false)}
      />
    </div>
  );
}

function EmptyWorkspace({
  defaultCwd,
  onPick
}: {
  defaultCwd: string;
  onPick: (kind: TerminalPaneKind, cwd: string) => void;
}) {
  const t = useT();
  const [picked, setPicked] = useState<string | null>(null);
  const cwd = picked ?? defaultCwd;

  const change = async () => {
    const folder = await window.api.pickFolder();
    if (folder) setPicked(folder);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-slate-200">{t("terminal.emptyTitle")}</p>
        <p className="text-xs text-slate-500">{t("terminal.emptyHint")}</p>
      </div>
      <div className="flex gap-2">
        {TERMINAL_PANE_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!cwd}
            onClick={() => onPick(k, cwd)}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            {t(KIND_LABEL[k])}
          </button>
        ))}
      </div>
      <div className="flex max-w-full items-center gap-2 text-xs">
        <FolderOpen size={14} className="shrink-0 text-accent-400" />
        <span title={cwd || undefined} className="min-w-0 truncate font-mono text-slate-400">
          {cwd ? middleEllipsis(cwd, 56) : t("terminal.noFolder")}
        </span>
        <button type="button" onClick={() => void change()} className={TOOL_BUTTON}>
          {t("terminal.changeFolder")}
        </button>
      </div>
    </div>
  );
}

/** Oranlar bölme sayısına bağlı: sayı değişince eşitleniyor (spec §3.3). */
function useRatios(count: number, n: number) {
  const [stored, setStored] = useState<{ count: number; ratios: number[] } | null>(null);
  const ratios = stored && stored.count === count && stored.ratios.length === n ? stored.ratios : equalRatios(n);
  return [ratios, (next: number[]) => setStored({ count, ratios: next })] as const;
}

function WorkspaceGrid({ workspace, focusable }: { workspace: TerminalWorkspace; focusable: boolean }) {
  const t = useT();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const count = workspace.panes.length;
  const layout = gridLayout(count);
  const [colRatios, setColRatios] = useRatios(count, layout.cols);
  const [rowRatios, setRowRatios] = useRatios(count, layout.rows);
  const maximized = workspace.maximizedPaneId;

  const gridStyle: CSSProperties = {
    display: "grid",
    gap: GAP,
    gridTemplateColumns: maximized ? "1fr" : colRatios.map((r) => `${r}fr`).join(" "),
    gridTemplateRows: maximized ? "1fr" : rowRatios.map((r) => `${r}fr`).join(" ")
  };

  return (
    <div ref={gridRef} className="relative h-full min-h-0" style={gridStyle}>
      {workspace.panes.map((pane, i) => {
        const c = layout.cells[i];
        const style: CSSProperties =
          maximized === pane.id
            ? { gridColumn: "1 / -1", gridRow: "1 / -1" }
            : maximized
              ? { display: "none" }
              : { gridColumn: `${c.col + 1}`, gridRow: `${c.row + 1} / span ${c.rowSpan}` };
        return (
          <div key={pane.id} data-pane={pane.id} className="min-h-0 min-w-0" style={style}>
            <TerminalPaneView
              pane={pane}
              active={focusable && workspace.focusedPaneId === pane.id}
              canMaximize={count > 1}
              maximized={maximized === pane.id}
            />
          </div>
        );
      })}

      {!maximized &&
        colRatios.slice(0, -1).map((_, i) => (
          <Divider
            key={`c${i}`}
            axis="x"
            index={i}
            ratios={colRatios}
            onChange={setColRatios}
            gridRef={gridRef}
            label={t("terminal.resizeColumns")}
            startOffset={null}
          />
        ))}
      {!maximized &&
        rowRatios.slice(0, -1).map((_, i) => (
          <Divider
            key={`r${i}`}
            axis="y"
            index={i}
            ratios={rowRatios}
            onChange={setRowRatios}
            gridRef={gridRef}
            label={t("terminal.resizeRows")}
            startOffset={
              layout.rowDividerStartCol === 0
                ? null
                : edgeCalc(colRatios, layout.rowDividerStartCol - 1, layout.cols, 1)
            }
          />
        ))}
    </div>
  );
}

/**
 * `index`'inci ayırıcının ortası, CSS `calc` olarak. `fr` payları aralıklar
 * düşüldükten sonraki alanı paylaşıyor: konum = pay × (100% − aralıklar)
 * + önceki aralıklar + yarım aralık. `half = 1` ise yarım yerine tam aralık
 * (satır ayırıcısının başladığı sütunun sol kenarı için).
 */
function edgeCalc(ratios: readonly number[], index: number, n: number, half: 0.5 | 1 = 0.5): string {
  const share = ratios.slice(0, index + 1).reduce((a, b) => a + b, 0);
  return `calc(${share} * (100% - ${GAP * (n - 1)}px) + ${(index + half) * GAP}px)`;
}

function Divider({
  axis,
  index,
  ratios,
  onChange,
  gridRef,
  label,
  startOffset
}: {
  axis: "x" | "y";
  index: number;
  ratios: number[];
  onChange: (next: number[]) => void;
  gridRef: RefObject<HTMLDivElement | null>;
  label: string;
  /** Satır ayırıcısı yalnız bir sütundan başlıyorsa soldaki kenar. */
  startOffset: string | null;
}) {
  const drag = useRef<{ start: number; ratios: number[]; size: number } | null>(null);
  const share = ratios.slice(0, index + 1).reduce((a, b) => a + b, 0);
  const pos = edgeCalc(ratios, index, ratios.length);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const total = axis === "x" ? rect.width : rect.height;
    const size = total - GAP * (ratios.length - 1);
    if (size <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { start: axis === "x" ? e.clientX : e.clientY, ratios, size };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const now = axis === "x" ? e.clientX : e.clientY;
    onChange(dragRatios(d.ratios, index, (now - d.start) / d.size));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const back = axis === "x" ? "ArrowLeft" : "ArrowUp";
    const fwd = axis === "x" ? "ArrowRight" : "ArrowDown";
    if (e.key !== back && e.key !== fwd) return;
    e.preventDefault();
    onChange(dragRatios(ratios, index, e.key === fwd ? KEY_STEP : -KEY_STEP));
  };

  // 6px'lik tutamaç aralığın tam üstünde; görünür çizgi yok, üstüne gelince
  // vurgu rengi (spec §3.3).
  const style: CSSProperties =
    axis === "x"
      ? { left: pos, top: 0, bottom: 0, width: GAP, transform: "translateX(-50%)" }
      : { top: pos, left: startOffset ?? 0, right: 0, height: GAP, transform: "translateY(-50%)" };

  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label={label}
      aria-valuenow={Math.round(share * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={onKeyDown}
      className={`absolute z-10 rounded-full outline-none transition-colors hover:bg-accent-400/40 focus-visible:bg-accent-400/60 ${
        axis === "x" ? "cursor-col-resize" : "cursor-row-resize"
      }`}
      style={style}
    />
  );
}
```

Satır ayırıcısının sol kenarı (`startOffset`), 3 bölmede ikinci sütunun başladığı yer. Bu yer, birinci sütun ayırıcısının ortası artı yarım aralık; `edgeCalc(..., half = 1)` bunu veriyor.

- [ ] **Adım 15: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx tests/newPaneDialog.test.tsx > .superpowers/t8c.txt 2>&1; tail -20 .superpowers/t8c.txt`
Beklenen: PASS, üç dosya.

jsdom'da `getBoundingClientRect` sıfır döndürüyor; o yüzden sürükleme testte sınanmıyor. Sürüklemeyi Görev 10'daki göz kontrolü sınıyor.

- [ ] **Adım 16: Tip denetimi ve işleme**

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok.

```bash
git add src/terminal/TerminalMode.tsx
git add tests/terminalMode.test.tsx
git commit -m "Terminal: izgara, ayiricilar, bos alan ve geri yukleme seridi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 9: App bağlantısı, eski terminal panelinin kaldırılması

**Dosyalar:**
- Değiştir: `src/App.tsx`
- Sil: `src/components/TerminalPanel.tsx`
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts` (kullanılmayan anahtarlar)
- Test: `tests/appTerminalWiring.test.ts`

**Arayüzler:**
- Tüketir: `TerminalStoreProvider({ config, visible, projectRequest, pushToast, onConfigSaved, children })` (`src/stores/terminalStore.tsx`, Görev 5), `TerminalSidebar()` (`src/components/TerminalSidebar.tsx`, Görev 7), `TerminalMode()` (`src/terminal/TerminalMode.tsx`, Görev 8), `Activity`/`SidebarMode` içindeki `"terminal"` (Görev 6).
- Üretir: yok (son bağlama).

Satır numaraları bu planın yazıldığı andaki `App.tsx`'e göre; Görev 6 birkaç satır oynattı. Satır numarasına değil, alıntılanan metne göre bul.

**Neden kaynak testi:** `App.tsx` jsdom'da tek parça çizilemiyor (yüzlerce `window.api` çağrısı). Bağlamanın doğru kurulduğu Görev 7-8'in bileşen testleri ve Görev 10'daki gözle kontrolle ölçülüyor; burada yalnız "eski kod geri gelmesin, yeni kod bağlı kalsın" kilitleniyor (`tests/flowSandboxSource.test.ts` ile aynı yaklaşım).

- [ ] **Adım 1: Kaynak testini yaz** — `tests/appTerminalWiring.test.ts`

```ts
// Terminal modu bağlantısı — kaynak düzeyinde kilit. Logon'un alttaki eski
// TerminalPanel'i kalktı (spec §1); geri gelirse iki ayrı terminal yolu
// olurdu ve pty'ler iki yerden yönetilirdi.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
// Yorumlar eski durumu anlatabilir; kontroller yalnız koda bakıyor.
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const app = code(read("src", "App.tsx"));
const tr = read("src", "i18n", "tr.ts");
const en = read("src", "i18n", "en.ts");

describe("App — terminal modu bağlı", () => {
  it("sağlayıcı, kenar çubuğu listesi ve ekran App'te", () => {
    expect(app).toContain("<TerminalStoreProvider");
    expect(app).toMatch(/visible=\{activity === "terminal"\}/);
    expect(app).toContain("<TerminalSidebar />");
    expect(app).toContain("<TerminalMode />");
  });

  it("proje terminali Terminal moduna geçip sayacı artırıyor", () => {
    expect(app).toContain('setActivity("terminal")');
    expect(app).toContain("setProjectTerminalRequest((n) => n + 1)");
  });
});

describe("App — eski terminal paneli yok", () => {
  it("TerminalPanel dosyası silindi", () => {
    expect(existsSync(path.join(ROOT, "src", "components", "TerminalPanel.tsx"))).toBe(false);
  });

  it("App'te eski panelin durumu ve işleyicileri yok", () => {
    for (const gone of [
      "TerminalPanel",
      "terminalFullscreen",
      "terminalPanelOpen",
      "terminalSessions",
      "onTerminalReady",
      "handleNewTerminal",
      "openConnectorHelperTerminal",
      "sidebarHidden",
      "TERMINAL_HEIGHT"
    ]) {
      expect(app, gone).not.toContain(gone);
    }
  });

  it("eski panelin metinleri silindi, oturum sonu metni kaldı", () => {
    for (const dict of [tr, en]) {
      expect(dict).not.toContain('"terminalPanel.');
      expect(dict).not.toContain('"app.toggleTerminalTitle"');
      expect(dict).not.toContain('"app.terminalDefaultTitle"');
      expect(dict).not.toContain('"app.terminalCreateFailed"');
      expect(dict).not.toContain('"appConnections.projectTerminalTitle"');
      // EmbeddedTerminal süreç bitince bunu yazıyor; silinirse ekranda anahtar adı çıkar.
      expect(dict).toContain('"app.terminalSessionEnded"');
    }
  });
});
```

- [ ] **Adım 2: Çalıştır, düştüğünü gör**

Çalıştır: `npx vitest run tests/appTerminalWiring.test.ts > .superpowers/t9.txt 2>&1; tail -30 .superpowers/t9.txt`
Beklenen: FAIL, 5 testin 5'i (sağlayıcı yok, sayaç yok, dosya var, eski adlar var, anahtarlar var).

- [ ] **Adım 3: `src/App.tsx` — içe aktarmalar ve sabitler**

`lucide-react` içe aktarmasından `TerminalSquare,` satırını sil (yalnız başlıktaki Terminal düğmesi kullanıyordu).

Şu satırı sil:

```tsx
import TerminalPanel, { type TerminalSessionInfo } from "./components/TerminalPanel";
```

Yerine:

```tsx
import TerminalSidebar from "./components/TerminalSidebar";
import TerminalMode from "./terminal/TerminalMode";
import { TerminalStoreProvider } from "./stores/terminalStore";
```

`MIN_TERMINAL_HEIGHT`, `MAX_TERMINAL_HEIGHT`, `DEFAULT_TERMINAL_HEIGHT` sabitlerini (~l.69-71) sil.

- [ ] **Adım 4: `src/App.tsx` — durum ve ref'ler**

Şu beş `useState` satırını (~l.145-149) sil: `terminalSessions`, `activeTerminalId`, `terminalPanelOpen`, `terminalPanelHeight`, `terminalFullscreen`. Yerlerine tek satır:

```tsx
  // "AXET Projesi Seç" sayacı: her artışta Terminal modunda bir AXET bölmesi (Görev 5).
  const [projectTerminalRequest, setProjectTerminalRequest] = useState(0);
```

`pendingTerminalTitlesRef` ve `manualTerminalCounterRef` satırlarını (~l.168-169) sil.

- [ ] **Adım 5: `src/App.tsx` — eski işleyiciler**

"`// SOHBET EKRANINDA TERMİNAL YOK`" yorumuyla başlayan bloktan `handleTerminalResizeStart`'ın kapanışına (`[terminalPanelHeight]\n  );`) kadar olan her şeyi sil: yorum, `onTerminalReady` efekti, `handleNewTerminal`, `openConnectorHelperTerminal` ve üstündeki uzun yorum, `handleOpenProjectTerminal`, `handleCloseTerminal`, `handleToggleTerminalPanel`, `handleToggleTerminalFullscreen` ve yorumu, `handleTerminalResizeStart`. Yerine:

```tsx
  // Terminal yalnız Terminal modunda (2026-09-29, spec §1). Sohbet ekranında
  // terminal yok (2026-09-05 kararı), Logon'un alttaki paneli de kalktı.
  //
  // Uygulama Bağlantıları — "AXET Projesi Seç": `axet-code` etkileşimli
  // açılınca Connector/MCP araçlarının istediği proje seçim ekranını
  // gösteriyor. Terminal moduna geçip sağlayıcıya bir AXET bölmesi açtırıyoruz;
  // hangi alana ve hangi klasörde açılacağına sağlayıcı karar veriyor.
  const handleOpenProjectTerminal = useCallback(() => {
    setActivity("terminal");
    setProjectTerminalRequest((n) => n + 1);
  }, []);
```

`setActivity` `useState` setter'ı olduğundan kararlı; bağımlılık dizisi boş kalıyor. `AppConnectionsModal`'daki `onOpenProjectTerminal={handleOpenProjectTerminal}` değişmiyor.

- [ ] **Adım 6: `src/App.tsx` — kenar çubuğu her zaman çiziliyor**

Şu iki satırı ve üstlerindeki yorumu sil:

```tsx
  // Logon terminali tam ekranken kenar çubuğu çizilmiyor (bkz. <Sidebar>).
  const sidebarHidden = activity === "sapLauncher" && terminalFullscreen;
```

Render'da `{!sidebarHidden && (` satırını sil ve `</Sidebar>`'dan hemen sonraki `)}` satırını sil; `<Sidebar …>` artık koşulsuz. Girinti bir kademe sola alınabilir, alınmasa da olur (prettier yok; dokunulan satır sayısı az kalsın diye olduğu gibi bırakmak serbest).

`src/shell/Sidebar.tsx:135`'teki yorum artık olmayan bir durumu örnek veriyor. Yalnız ilk satırı değiştir, kod aynı kalıyor (temizlik unmount'un her türlüsüne karşı hâlâ gerekli):

```tsx
  // Sürüklerken kenar çubuğu unmount olursa
```

(Eskisi: `// Sürüklerken kenar çubuğu kaybolursa (klavyeyle terminal tam ekranı)`.)

- [ ] **Adım 7: `src/App.tsx` — Terminal listesi ve ekranı**

Kenar çubuğu listesinin son dalı (Görev 6'dan kalan `: null`):

```tsx
            ) : listMode === "sapGuiScripting" ? (
              <ScriptSidebar />
            ) : (
              <TerminalSidebar />
            )}
```

axet.code'un her zaman takılı sarmalayıcısının (`<div className={activity === "axetCode" ? … : "hidden"}>` … `</div>`) hemen altına:

```tsx
        {/* Terminal de HER ZAMAN takılı (spec §4): mod değişince pty'ler ve
            xterm tamponları yaşamaya devam ediyor. Görünürlüğü sağlayıcıya
            `visible` ile ayrıca söylüyoruz; gizliyken gelen çıktı alanı
            "okunmadı" yapıyor. */}
        <div className={activity === "terminal" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "hidden"}>
          <TerminalMode />
        </div>
```

- [ ] **Adım 8: `src/App.tsx` — başlık düğmesi, `<main>` koşulu, eski panel**

Başlıktaki Terminal düğmesini sil (`onClick={handleToggleTerminalPanel}` olan `<button>` … `</button>`, ~l.1245-1251).

`{!terminalFullscreen && (` satırını sil ve `</main>`'den hemen sonraki `)}` satırını sil.

Eski panel bloğunu tamamen sil:

```tsx
            {(terminalPanelOpen || terminalSessions.length > 0) && (
              <TerminalPanel
                …
              />
            )}
```

- [ ] **Adım 9: `src/App.tsx` — sağlayıcı**

`<ScriptStoreProvider>` satırının altına:

```tsx
      <TerminalStoreProvider
        config={config}
        visible={activity === "terminal"}
        projectRequest={projectTerminalRequest}
        pushToast={pushToast}
        onConfigSaved={setConfig}
      >
```

`</ScriptStoreProvider>` satırının hemen üstüne `      </TerminalStoreProvider>`.

`onConfigSaved={setConfig}`: setter kararlı, sağlayıcının kaydetme efekti gereksiz yere yeniden koşmuyor. Kaydedilen config App'e dönüyor; Ayarlar penceresi eski `terminalWorkspaces`'ı geri yazmıyor.

- [ ] **Adım 10: Eski paneli sil**

```bash
git rm src/components/TerminalPanel.tsx
```

- [ ] **Adım 11: i18n temizliği**

Önce hiçbir yerde kullanılmadıklarını doğrula:

```bash
grep -rn "terminalPanel\.\|app\.toggleTerminalTitle\|app\.terminalDefaultTitle\|app\.terminalCreateFailed\|appConnections\.projectTerminalTitle\|\"app\.terminal\"" src tests --include=*.ts --include=*.tsx | grep -v "src/i18n/"
```

Beklenen: yalnız `tests/appTerminalWiring.test.ts`'teki satırlar. Başka bir yer çıkarsa o anahtarı silme ve testten de çıkar.

`src/i18n/tr.ts` ve `src/i18n/en.ts`'ten sil:
- `"app.terminal"`, `"app.toggleTerminalTitle"`, `"app.terminalDefaultTitle"`, `"app.terminalCreateFailed"`
- `"terminalPanel.*"` satırlarının dokuzu da
- `"appConnections.projectTerminalTitle"`

`"app.terminalSessionEnded"` KALIYOR (`EmbeddedTerminal` kullanıyor).

`preload`'daki `onTerminalReady` köprüsü ve `window.d.ts` tanımı kalıyor: ana süreç `terminal:ready`'yi hâlâ gönderiyor, dinleyen yokken zararsız. Köprüyü silmek ana süreç değişikliği ister; bu görevin kapsamı değil.

- [ ] **Adım 12: Çalıştır, geçtiğini gör**

Çalıştır: `npx vitest run tests/appTerminalWiring.test.ts > .superpowers/t9.txt 2>&1; tail -20 .superpowers/t9.txt`
Beklenen: PASS, 5 test.

- [ ] **Adım 13: Tip denetimi ve tam test**

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok. `TerminalSessionInfo`, `iconBtn`/`tintBtn` gibi artık kullanılmayan bir içe aktarma kalırsa typecheck `noUnusedLocals` ile yakalar; o satırı sil.

Çalıştır: `npx vitest run > .superpowers/vitest.log 2>&1; tail -40 .superpowers/vitest.log`
Beklenen: tüm dosyalar geçer. Yalnız bilinen kararsızlar (`scriptBehaviour`, `scriptStore`) düşerse tek başına yeniden çalıştır; tek başına geçiyorsa bu göreve ait değil.

- [ ] **Adım 14: İşle**

```bash
git add src/App.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/appTerminalWiring.test.ts
git add src/shell/Sidebar.tsx
git status --short
git commit -m "Terminal: App baglantisi, eski terminal paneli kaldirildi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

`git status --short` çıktısında `D  src/components/TerminalPanel.tsx` (Adım 10'daki `git rm`) görünmeli.

---

### Görev 10: Son doğrulama ve gözle kontrol

**Dosyalar:** yok (yalnız çalıştırma ve bakma). Bir kusur çıkarsa düzeltme, sahibi olan görevin dosyasında ve o görevin test dosyasına önce düşen bir testle yapılıyor.

**Arayüzler:** yok.

- [ ] **Adım 1: Tip denetimi**

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok.

- [ ] **Adım 2: Tam test**

Çalıştır: `npx vitest run > .superpowers/vitest.log 2>&1; tail -40 .superpowers/vitest.log`
Beklenen: tüm dosyalar geçer. Bu planın eklediği test dosyaları: `terminalConfig`, `terminalGrid`, `terminalManager` (createDir), `terminalReducer`, `terminalStore`, `shellShortcuts`, `shellSidebar`, `terminalSidebar`, `terminalPaneView`, `newPaneDialog`, `terminalMode`, `appTerminalWiring`. Özet satırındaki `Test Files` ve `Tests` sayılarını oku.

- [ ] **Adım 3: Uygulamayı aç**

Çalıştır: `npm run dev` (arka planda). Açık bir NTT Studio ya da VS Code varsa ona dokunma; yalnız bu komutun açtığı pencereyle çalış.

- [ ] **Adım 4: Kullanıcının gözle kontrolü (spec §8)**

Kullanıcıya şu listeyi Türkçe ver ve tek tek bakmasını iste. jsdom bunları ölçemiyor; özellikle sürükleme yalnız burada sınanıyor.

1. **Sekmeler:** Kenar çubuğunun üstündeki dört sekme (Sohbet, Logon, Script, Terminal) 264px genişlikte taşmadan, kesilmeden sığıyor. Ctrl+4 Terminal'e geçiyor; bir terminalin içindeyken Ctrl+4 terminale gidiyor, mod değiştirmiyor.
2. **Yerleşim 1–9:** "+ Bölme" ile 1'den 9'a kadar bölme ekle. Yerleşim spec §5'teki tabloyla aynı: 2'de iki sütun; 3'te sol bölme iki satır boyu, 2 ve 3 sağda üst üste; 4'te 2×2; 5–6'da 3×2 (5'te son hücre boş); 7–9'da 3×3 (eksik hücreler boş). 9'da "+ Bölme" pasif ve üzerine gelince "En fazla 9 bölme".
3. **Sürükleme:** Sütun ve satır ayırıcılarını fareyle çek; bölmeler akıcı büyüyüp küçülüyor, hiçbir bölme bir şeritten ince olmuyor (%8). Ayırıcıyı pencere dışına kadar çekip bırak: sürükleme bitiyor, takılı kalmıyor. Klavyeyle (Tab ile ayırıcıya gel, ok tuşları) da oynuyor. Bölme sayısı değişince oranlar eşitleniyor.
4. **Büyütme:** Bir bölmede Büyüt: yalnız o görünüyor, ayırıcılar yok, terminal yeni boyuta oturuyor (satırlar kırılmıyor). Küçült: eski ızgara ve oranlar geri.
5. **Aynı anda çalışma:** Üç bölmede aynı anda uzun süren bir komut çalıştır (ör. `ping -t localhost`); hepsi akıyor. Tıklanan bölme odağı alıyor; yazılan yalnız ona gidiyor. Yapıştırma (Ctrl+V, sağ tık) eskisi gibi.
6. **Alanlar ve noktalar:** İkinci bir alan aç, birinde çıktı üreten komut bırakıp diğerine geç: listede ilkinin yanında "okunmadı" noktası. Başka bir moda (Sohbet) geçip dön: süreçler hâlâ çalışıyor, tamponlar kaybolmamış. Bir bölmede `exit` yaz: bölme "Süreç kapandı (kod 0)" satırını gösteriyor ve ↻ ile yeniden başlıyor.
7. **Yeniden adlandırma ve kapatma:** Alanı çift tıkla yeniden adlandır, Escape iptal ediyor. Çalışan terminali olan bir alanı kapatırken "Bu alandaki N terminal kapanacak." onayı çıkıyor. Çalışan bir AXET bölmesini kapatırken "Oturumu kapat" onayı çıkıyor; cmd bölmesi sormadan kapanıyor.
8. **Olmayan klasör:** Bir bölmenin klasörünü uygulama kapalıyken sil (ya da config'te olmayan bir yol ver). Açınca o bölme "Klasör seç / Kaldır" gösteriyor, klasör YARATILMIYOR.
9. **Geri yükleme:** Uygulamayı kapat, aç. Terminal modunda "Son düzen: N alan, M bölme" şeridi: "Geri yükle" aynı alanları ve klasörleri açıyor (en fazla ikişer ikişer başlıyor); "Boş başla" tek boş alanla açıyor.
10. **Ctrl+R:** Birkaç bölme açıkken Ctrl+R. Görev Yöneticisi'nde eski `cmd.exe`/`powershell.exe`/`axet-code` süreçleri birikmiyor (yalnız bu uygulamanın açtıkları; başka süreçlere dokunma).
11. **AXET Projesi Seç:** Ayarlar → Uygulama Bağlantıları → "AXET Projesi Seç": Terminal moduna geçiyor ve AXET bölmesi ekleniyor. Alan 9 doluysa yeni bir alana ekleniyor.
12. **Logon:** Logon ekranında altta terminal paneli ve başlıkta "Terminal" düğmesi yok; kenar çubuğu her zaman görünüyor.

- [ ] **Adım 5: Sonuç**

Kullanıcı bir maddede sorun görürse: maddeyi ve sahip görevi yaz, o görevin test dosyasına sorunu yakalayan bir test ekle (önce düştüğünü gör), düzelt, Adım 1-2'yi yeniden koş, ayrı bir commit at. Kullanıcı "tamam" diyene kadar dal `tasarim/grafit`'te kalıyor; birleştirme ve push onay olmadan yapılmıyor.
