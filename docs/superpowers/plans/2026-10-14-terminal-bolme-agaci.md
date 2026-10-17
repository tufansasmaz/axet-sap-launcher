# Terminal bölme ağacı — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Terminal modundaki otomatik ızgarayı bölme ağacıyla değiştirmek (serbest boyut, sürükleyip yerleştirme), bölme başına ad/renk/yazı boyutu/küçültme eklemek ve yazıların kayması hatasını ölçüp düzeltmek.

**Mimari:** Ağaç işlemleri `app-electron/shared/terminalTree.ts` içinde saf fonksiyonlar (ana süreç kaydı doğrularken de kullanıyor). İndirgeyici ağacı bölme listesiyle birlikte tutuyor. Ekranda `LayoutView` ağacı boş yer tutucularla çiziyor; bölmeler ağaçtan bağımsız, `paneId` anahtarıyla bir kez çizilip ölçülen kutulara mutlak konumla yerleşiyor — taşımada xterm yeniden kurulmuyor.

**Teknoloji:** Electron 44, React 18, TypeScript, Tailwind jetonları, vitest 2 + jsdom, @xterm/xterm 5.5.

**Spec:** `docs/superpowers/specs/2026-10-14-terminal-bolme-agaci-design.md`

## Genel kurallar

- Kod yorumları tam Türkçe karakterle; commit mesajları ASCII Türkçe, sonunda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `git add` dosya dosya; `-A` yok. Dal: `terminal/bolme-agaci`. Push/merge/yayın kullanıcı onayıyla.
- prettier çalıştırma. Satır sonu dosyanın kendi satır sonu (çoğu CRLF): düzenlemeyi Edit aracıyla yap; heredoc/sed ters eğik çizgiyi yutuyor.
- En fazla 9 bölme (`MAX_TERMINAL_PANES`), 6 alan (`MAX_TERMINAL_WORKSPACES`) aynen.
- Bölme alt sınırı 160 px × 90 px. Sürükleme eşiği 4 px. Kenar bırakma alanı bölmenin %25'i.
- Ad en fazla 40 karakter; renkler `gray | blue | green | amber | red | violet`; yazı boyutu 9–24, varsayılan 13.
- Sabit hex renk yok; renkler CSS jetonlarından.
- Diske terminal çıktısı, token, şifre yazılmaz. Günlüğe içerik yazılmaz.
- `EmbeddedTerminal`'in Ctrl+V / sağ tık ele alınışına (`attachCustomKeyEventHandler`) DOKUNULMAZ.
- Ekran görüntüsü alınmaz; gözle kontrol kullanıcıda.
- Komutlar: `npm run typecheck`, `npx vitest run <dosya>`, tam takım `npx vitest run` (~100 sn).

## İnceleme odağı

1. Kayıtlı düzende ağaç ile bölme listesi uyuşmuyor (elle düzenlenmiş/eski config) → hiçbir bölme kaybolmamalı, açılış çökmemeli. (Görev 2, 4 testleri)
2. Odaktaki bölme küçültülmüşken "Yeni bölme" → yeni bölme görünür bir yere açılmalı, kaybolmamalı. (Görev 5 testi)
3. Bütün bölmeler küçültülünce → boş-durum metni + şerit; ekleme yine çalışmalı. (Görev 5, 9 testleri)
4. Sürükleme sırasında bölme kapanırsa (süreç biterse değil, kullanıcı kapatırsa) → bırakma hiçbir şey yapmamalı. (Görev 8 testi)
5. Büyütülmüş bölme küçültülürse ya da taşınırsa → büyütme kalkmalı, ekran boş kalmamalı. (Görev 5 testi)

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `app-electron/main/terminalManager.ts` (değişir) | Boyut ölçüm satırı (Görev 1) |
| `app-electron/shared/terminalTree.ts` (yeni) | Ağaç tipleri ve saf işlemler (Görev 2, 3) |
| `app-electron/shared/terminalLayout.ts` (değişir) | Renk/yazı/ad sabitleri; kayıt doğrulama ağaçla (Görev 4) |
| `app-electron/shared/types.ts` (değişir) | `SavedTerminalPane`, `SavedTerminalWorkspace` yeni alanlar (Görev 4) |
| `src/stores/terminalTypes.ts`, `terminalReducer.ts` (değişir) | Ağaçlı durum ve yeni eylemler (Görev 5) |
| `src/stores/terminalStoreContext.ts`, `terminalStore.tsx` (değişir) | Yeni komutlar, kayıt imzası (Görev 6) |
| `src/terminal/dropZone.ts` (yeni) | Bırakma alanı ve gölge geometrisi (Görev 7) |
| `src/terminal/LayoutView.tsx` (yeni) | Ağacı çizme, ölçme, ayırıcılar (Görev 7) |
| `src/terminal/usePaneDrag.ts` (yeni) | Başlıktan sürükleme: eşik, hedef, Esc (Görev 8) |
| `src/terminal/paneColors.ts` (yeni) | Renk → tema jetonu, renk adları (Görev 9) |
| `src/terminal/TerminalMode.tsx` (değişir) | Izgara yerine LayoutView, sürükle-bırak, şerit (Görev 7, 8, 9) |
| `src/terminal/TerminalPaneView.tsx` (değişir) | Başlık: tutamak, böl, şeride indir, ad, renk; yazı boyutu tuşları (Görev 8, 9, 10) |
| `src/components/EmbeddedTerminal.tsx` (değişir) | `fontSize`; boyut bildirimi sakinleşmesi, yeniden çizim (Görev 10, 11) |
| `src/i18n/tr.ts`, `en.ts` (değişir) | Yeni metinler (Görev 9) |

`src/terminal/gridLayout.ts` kalıyor (spec §6.1; kendi testi var) ama artık `TerminalMode` onu kullanmıyor. `src/index.css` DEĞİŞMİYOR: mor için mevcut `--project-soft-text` jetonu kullanılıyor.

## Spec'ten bilinçli sapmalar

- **Dosya yeri:** spec §6.1 `src/terminal/layoutTree.ts` diyor; plan `app-electron/shared/terminalTree.ts` kullanıyor, çünkü ana süreç (`normalizeTerminalWorkspaces`) kaydı okurken ağacı da doğruluyor ve `shared` her iki tarafa açık. İşlemler aynı.
- **Eylem adı:** spec'teki `splitPane` ayrı bir eylem değil; `addPane`'in `split` alanı (komut: `addPane(kind, cwd, split)`). Davranış aynı.
- **Esc ile büyütmeden çıkış YOK:** spec §4 istiyor; ama Esc terminaldeki programa gidiyor (axet-code TUI iptal, vim). Esc yalnız sürükleme sürerken yakalanıyor. Plan teslimde kullanıcıya soruluyor.

---

### Görev 1: Boyut ölçüm satırı (kayma teşhisi)

Önce bu, çünkü kullanıcı kaymayı bu sürümle yaşayınca kök neden görünür (spec §5).

**Dosyalar:**
- Değişir: `app-electron/main/terminalManager.ts` (`resizeTerminal`, `disposeTerminal`)
- Test: `tests/terminalResizeLog.test.ts`

**Arayüzler:**
- Üretir: `resizeTerminal(id, cols, rows)` imzası aynı; yan etki olarak `appLog("terminal.boyut", { bolme, sutun, satir })`.

- [ ] **Adım 1: Kırmızı test**

```ts
// tests/terminalResizeLog.test.ts
// Kayma teşhisi (spec §5): kabuğa bildirilen her GERÇEK boyut değişikliği
// günlüğe düşüyor; aynı boyut tekrarı ve saniyede 4'ten fazlası düşmüyor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { spawn, appLog } = vi.hoisted(() => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    onExit: vi.fn(() => ({ dispose: vi.fn() })),
    write: vi.fn(),
    kill: vi.fn(),
    resize: vi.fn(),
    pid: 1
  })),
  appLog: vi.fn()
}));

vi.mock("@lydell/node-pty", () => ({ spawn }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "t" }));
vi.mock("../app-electron/main/pythonSiteEnv", () => ({ withNttPythonSite: (env: unknown) => env }));
vi.mock("../app-electron/main/appLog", () => ({ appLog }));

import { createTerminal, disposeAllTerminals, resizeTerminal } from "../app-electron/main/terminalManager";

const fakeWindow = { isDestroyed: () => false, webContents: { send: vi.fn() } } as never;

beforeEach(() => {
  appLog.mockClear();
  vi.useFakeTimers();
});
afterEach(() => {
  disposeAllTerminals();
  vi.useRealTimers();
});

let seq = 0;
function open(): string {
  const id = `pty-${++seq}-abcdefgh`;
  expect(createTerminal(fakeWindow, id, process.cwd(), 120, 30, "cmd", undefined, { createDir: false })).toBe(true);
  return id;
}

describe("terminal.boyut", () => {
  it("yalnız boyut değişince yazılıyor, içerik yok", () => {
    const id = open();
    resizeTerminal(id, 100, 40);
    resizeTerminal(id, 100, 40);
    resizeTerminal(id, 90, 40);
    const calls = appLog.mock.calls.filter(([tag]) => tag === "terminal.boyut");
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toEqual({ bolme: id.slice(0, 8), sutun: 100, satir: 40 });
    expect(calls[1][1]).toEqual({ bolme: id.slice(0, 8), sutun: 90, satir: 40 });
  });

  it("bölme başına saniyede en fazla 4 satır; bir saniye sonra yeniden yazılıyor", () => {
    const id = open();
    for (let c = 50; c < 60; c++) resizeTerminal(id, c, 20);
    expect(appLog.mock.calls.filter(([tag]) => tag === "terminal.boyut")).toHaveLength(4);
    vi.advanceTimersByTime(1001);
    resizeTerminal(id, 70, 20);
    expect(appLog.mock.calls.filter(([tag]) => tag === "terminal.boyut")).toHaveLength(5);
  });

  it("geçersiz boyut ne kabuğa ne günlüğe gidiyor", () => {
    const id = open();
    resizeTerminal(id, 0, 20);
    expect(appLog).not.toHaveBeenCalled();
  });
});
```

`createTerminal(window, id, cwd, cols, rows, shell, initialCommand?, options?)` kimliği çağırandan alıyor ve `boolean` dönüyor (bkz. `tests/terminalManager.test.ts`).

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalResizeLog.test.ts`
Beklenen: ilk iki test FAIL (`appLog` hiç çağrılmıyor).

- [ ] **Adım 3: Uygula**

`terminalManager.ts` başına `import { appLog } from "./appLog";` ekle. `resizeTerminal`'ı şöyle değiştir:

```ts
// Kayma teşhisi (spec 2026-10-14 §5): kabuğa bildirilen her GERÇEK boyut
// değişikliği günlüğe. Aynı boyut tekrarı yazılmıyor; bölme başına saniyede en
// fazla RESIZE_LOG_PER_SEC satır (sürükleme sırasında yüzlerce olay gelir).
// İçerik yok: kimliğin ilk 8 karakteri, sütun, satır.
const RESIZE_LOG_PER_SEC = 4;
const lastSize = new Map<string, string>();
const logWindow = new Map<string, { start: number; count: number }>();

function logResize(id: string, cols: number, rows: number): void {
  const key = `${cols}x${rows}`;
  if (lastSize.get(id) === key) return;
  lastSize.set(id, key);
  const now = Date.now();
  const win = logWindow.get(id);
  if (!win || now - win.start >= 1000) logWindow.set(id, { start: now, count: 1 });
  else if (win.count >= RESIZE_LOG_PER_SEC) return;
  else win.count += 1;
  appLog("terminal.boyut", { bolme: id.slice(0, 8), sutun: cols, satir: rows });
}

export function resizeTerminal(id: string, cols: number, rows: number): void {
  if (cols <= 0 || rows <= 0) return;
  const session = sessions.get(id);
  if (!session) return;
  logResize(id, cols, rows);
  try {
    session.proc.resize(cols, rows);
  } catch {
    // process az önce kapanmış olabilir, göz ardı et
  }
}
```

`disposeTerminal` içinde `sessions.delete(id);` satırının yanına ekle:

```ts
  lastSize.delete(id);
  logWindow.delete(id);
```

Not: hız sınırına takılan değişiklik `lastSize`'a yazılmış olur ama günlüğe düşmez; bu kabul — sınır günlüğü korumak için.

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalResizeLog.test.ts tests/terminalManager.test.ts`
Beklenen: hepsi PASS.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/main/terminalManager.ts
git add tests/terminalResizeLog.test.ts
git commit -m "Terminal: kabuga bildirilen boyut degisiklikleri ntt-studio.log'a (kayma teshisi)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 2: Ağaç modülü — tipler, düzeltme, ekleme, çıkarma, eski kayıttan dönüşüm, doğrulama

**Dosyalar:**
- Oluştur: `app-electron/shared/terminalTree.ts`
- Test: `tests/terminalTree.test.ts`

**Arayüzler:**
- Üretir (sonraki bütün görevler kullanıyor):

```ts
export type SplitDir = "row" | "column";
export type LayoutNode =
  | { type: "pane"; paneId: string }
  | { type: "split"; dir: SplitDir; children: LayoutNode[]; sizes: number[] };
export type EdgeSide = "left" | "right" | "top" | "bottom";
export type DropZone = EdgeSide | "center";
export interface PaneHome { siblingPaneId: string; side: EdgeSide }
export function leafIds(node: LayoutNode | null): string[];
export function tidy(node: LayoutNode | null): LayoutNode | null;
export function assertLayout(node: LayoutNode | null, ids?: readonly string[]): void; // bozuksa Error fırlatır
export function fromLegacy(ids: readonly string[]): LayoutNode | null;
export function insertPane(layout: LayoutNode | null, newId: string, target: { paneId: string; side: EdgeSide } | null): LayoutNode;
export function removePane(layout: LayoutNode | null, paneId: string): LayoutNode | null;
export function normalizeLayout(raw: unknown, ids: readonly string[]): LayoutNode | null;
```

Kurallar (spec §3.1): boş kap yok; tek çocuklu kap yok; aynı yönlü iç içe kap yok (düzleşir); `sizes.length === children.length`, her pay > 0, toplam 1 (±1e-6); her `paneId` en fazla bir kez.

- [ ] **Adım 1: Kırmızı test**

```ts
// tests/terminalTree.test.ts
// Terminal bölme ağacı (spec 2026-10-14 §3). Saf; React'sız.
import { describe, expect, it } from "vitest";
import {
  assertLayout,
  fromLegacy,
  insertPane,
  leafIds,
  normalizeLayout,
  removePane,
  tidy,
  type LayoutNode
} from "../app-electron/shared/terminalTree";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const leaf = (paneId: string): LayoutNode => ({ type: "pane", paneId });

describe("fromLegacy — eski kayıt bugünkü ızgaraya benziyor", () => {
  it("0 bölme: ağaç yok; 1 bölme: tek yaprak", () => {
    expect(fromLegacy([])).toBeNull();
    expect(fromLegacy(["p0"])).toEqual(leaf("p0"));
  });

  it("2 bölme yan yana", () => {
    expect(fromLegacy(ids(2))).toEqual({ type: "split", dir: "row", children: [leaf("p0"), leaf("p1")], sizes: [0.5, 0.5] });
  });

  it("3 bölme: sol boydan, sağda iki satır", () => {
    expect(fromLegacy(ids(3))).toEqual({
      type: "split",
      dir: "row",
      children: [leaf("p0"), { type: "split", dir: "column", children: [leaf("p1"), leaf("p2")], sizes: [0.5, 0.5] }],
      sizes: [0.5, 0.5]
    });
  });

  it.each([4, 5, 6, 7, 8, 9])("%i bölme: satır satır, hepsi var, kurallar tutuyor", (n) => {
    const layout = fromLegacy(ids(n));
    assertLayout(layout, ids(n));
    expect(leafIds(layout)).toEqual(ids(n));
    expect(layout?.type === "split" && layout.dir).toBe("column");
  });
});

describe("insertPane", () => {
  it("boş ağaca ekleme tek yaprak", () => {
    expect(insertPane(null, "a", null)).toEqual(leaf("a"));
  });

  it("sağa bölme: hedefin payı ikiye bölünüyor, komşu etkilenmiyor", () => {
    const base = fromLegacy(["a", "b"]);
    const next = insertPane(base, "c", { paneId: "b", side: "right" });
    assertLayout(next, ["a", "b", "c"]);
    expect(next).toEqual({ type: "split", dir: "row", children: [leaf("a"), leaf("b"), leaf("c")], sizes: [0.5, 0.25, 0.25] });
  });

  it("alta bölme yeni bir üst-alt kap kuruyor", () => {
    const next = insertPane(fromLegacy(["a", "b"]), "c", { paneId: "a", side: "bottom" });
    assertLayout(next, ["a", "c", "b"]);
    expect(next).toEqual({
      type: "split",
      dir: "row",
      children: [{ type: "split", dir: "column", children: [leaf("a"), leaf("c")], sizes: [0.5, 0.5] }, leaf("b")],
      sizes: [0.5, 0.5]
    });
  });

  it("sola ve üste ekleme yeni bölmeyi önce koyuyor", () => {
    expect(leafIds(insertPane(leaf("a"), "b", { paneId: "a", side: "left" }))).toEqual(["b", "a"]);
    expect(leafIds(insertPane(leaf("a"), "b", { paneId: "a", side: "top" }))).toEqual(["b", "a"]);
  });

  it("hedef yoksa ya da ağaçta değilse son yaprağın sağına", () => {
    expect(leafIds(insertPane(fromLegacy(["a", "b"]), "c", null))).toEqual(["a", "b", "c"]);
    expect(leafIds(insertPane(fromLegacy(["a", "b"]), "c", { paneId: "yok", side: "left" }))).toEqual(["a", "b", "c"]);
  });
});

describe("removePane", () => {
  it("kardeşler payı orantılı paylaşıyor", () => {
    const three: LayoutNode = { type: "split", dir: "row", children: [leaf("a"), leaf("b"), leaf("c")], sizes: [0.5, 0.25, 0.25] };
    const next = removePane(three, "a");
    assertLayout(next, ["b", "c"]);
    expect(next).toEqual({ type: "split", dir: "row", children: [leaf("b"), leaf("c")], sizes: [0.5, 0.5] });
  });

  it("tek çocuk kalan kap çözülüyor, aynı yönlü kap üstüne düzleşiyor", () => {
    const layout = fromLegacy(ids(3)); // row[p0, column[p1,p2]]
    const next = removePane(layout, "p1");
    expect(next).toEqual({ type: "split", dir: "row", children: [leaf("p0"), leaf("p2")], sizes: [0.5, 0.5] });
  });

  it("son yaprak gidince ağaç yok; olmayan kimlik ağacı değiştirmiyor", () => {
    expect(removePane(leaf("a"), "a")).toBeNull();
    const base = fromLegacy(["a", "b"]);
    expect(removePane(base, "yok")).toEqual(base);
  });
});

describe("tidy", () => {
  it("aynı yönlü iç içe kap düzleşiyor, paylar çarpılıyor", () => {
    const nested: LayoutNode = {
      type: "split",
      dir: "row",
      children: [leaf("a"), { type: "split", dir: "row", children: [leaf("b"), leaf("c")], sizes: [0.5, 0.5] }],
      sizes: [0.5, 0.5]
    };
    expect(tidy(nested)).toEqual({ type: "split", dir: "row", children: [leaf("a"), leaf("b"), leaf("c")], sizes: [0.5, 0.25, 0.25] });
  });
});

describe("normalizeLayout — kayıt elle bozulmuş olabilir", () => {
  it("geçerli ağaç aynen", () => {
    const layout = fromLegacy(ids(4));
    expect(normalizeLayout(layout, ids(4))).toEqual(layout);
  });

  it("ağaç yoksa eski düzen", () => {
    expect(normalizeLayout(undefined, ids(2))).toEqual(fromLegacy(ids(2)));
  });

  it("bilinmeyen ve çift kimlik atılıyor, eksik bölme sona ekleniyor", () => {
    const raw = { type: "split", dir: "row", children: [leaf("a"), leaf("yok"), leaf("a")], sizes: [0.3, 0.3, 0.4] };
    const next = normalizeLayout(raw, ["a", "b"]);
    assertLayout(next, ["a", "b"]);
    expect(leafIds(next)).toEqual(["a", "b"]);
  });

  it("bozuk paylar eşitleniyor; yanlış yön, yanlış tip düşüyor ama bölme kaybolmuyor", () => {
    const raw = { type: "split", dir: "row", children: [leaf("a"), leaf("b")], sizes: [Number.NaN, -1] };
    expect(normalizeLayout(raw, ["a", "b"])).toEqual(fromLegacy(["a", "b"]));
    const weird = { type: "split", dir: "diagonal", children: [leaf("a")], sizes: [1] };
    expect(leafIds(normalizeLayout(weird, ["a", "b"]))).toEqual(["a", "b"]);
    expect(leafIds(normalizeLayout("çöp", ["a"]))).toEqual(["a"]);
  });

  it("derinlik sınırı: kendini tekrar eden derin yapı çökertmiyor", () => {
    let raw: unknown = leaf("a");
    for (let i = 0; i < 50; i++) raw = { type: "split", dir: i % 2 ? "row" : "column", children: [raw, leaf(`x${i}`)], sizes: [0.5, 0.5] };
    const next = normalizeLayout(raw, ["a"]);
    expect(leafIds(next)).toEqual(["a"]);
  });

  it("bölme yoksa ağaç yok", () => {
    expect(normalizeLayout(fromLegacy(["a"]), [])).toBeNull();
  });
});

describe("assertLayout", () => {
  it("bozuk ağaçları yakalıyor", () => {
    expect(() => assertLayout({ type: "split", dir: "row", children: [leaf("a")], sizes: [1] })).toThrow();
    expect(() => assertLayout({ type: "split", dir: "row", children: [leaf("a"), leaf("a")], sizes: [0.5, 0.5] })).toThrow();
    expect(() => assertLayout({ type: "split", dir: "row", children: [leaf("a"), leaf("b")], sizes: [0.7, 0.7] })).toThrow();
    expect(() => assertLayout(fromLegacy(["a", "b"]), ["a"])).toThrow();
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalTree.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Uygula**

```ts
// app-electron/shared/terminalTree.ts
// Terminal bölme ağacı (spec 2026-10-14 §3). Saf fonksiyonlar; React'sız,
// Electron'suz — ana süreç kaydı doğrularken, renderer ekranı kurarken
// aynı kodu kullanıyor.
//
// Kap (`split`) çocuklarını `dir` yönünde diziyor: `row` yan yana,
// `column` üst üste. `sizes` çocuk başına pay, toplamı 1. Her işlem sonucu
// `tidy`'den geçiyor: boş kap yok, tek çocuklu kap yok, aynı yönlü iç içe
// kap düzleşmiş, paylar normalize.

export type SplitDir = "row" | "column";
export type LayoutNode =
  | { type: "pane"; paneId: string }
  | { type: "split"; dir: SplitDir; children: LayoutNode[]; sizes: number[] };
export type EdgeSide = "left" | "right" | "top" | "bottom";
export type DropZone = EdgeSide | "center";
/** Küçültülen bölmenin dönüş adresi: hangi bölmenin hangi tarafına. */
export interface PaneHome {
  siblingPaneId: string;
  side: EdgeSide;
}

const EPS = 1e-6;
/** Kayıttan okunurken izin verilen en fazla iç içelik (9 bölme için bol). */
const MAX_DEPTH = 12;

export function leafIds(node: LayoutNode | null): string[] {
  if (!node) return [];
  if (node.type === "pane") return [node.paneId];
  return node.children.flatMap(leafIds);
}

function normSizes(sizes: readonly number[]): number[] {
  const clean = sizes.map((s) => (Number.isFinite(s) && s > 0 ? s : 0));
  const sum = clean.reduce((a, b) => a + b, 0);
  if (sum <= 0) return sizes.map(() => 1 / sizes.length);
  return clean.map((s) => (s > 0 ? s / sum : 0));
}

export function tidy(node: LayoutNode | null): LayoutNode | null {
  if (!node) return null;
  if (node.type === "pane") return node;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  node.children.forEach((raw, i) => {
    const child = tidy(raw);
    const share = node.sizes[i] ?? 0;
    if (!child || !(share > 0)) return;
    if (child.type === "split" && child.dir === node.dir) {
      child.children.forEach((grand, j) => {
        children.push(grand);
        sizes.push(share * child.sizes[j]);
      });
    } else {
      children.push(child);
      sizes.push(share);
    }
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  return { type: "split", dir: node.dir, children, sizes: normSizes(sizes) };
}

export function assertLayout(node: LayoutNode | null, ids?: readonly string[]): void {
  const seen = new Set<string>();
  const walk = (n: LayoutNode, parentDir: SplitDir | null): void => {
    if (n.type === "pane") {
      if (seen.has(n.paneId)) throw new Error(`çift bölme: ${n.paneId}`);
      seen.add(n.paneId);
      return;
    }
    if (n.children.length < 2) throw new Error("tek çocuklu ya da boş kap");
    if (n.sizes.length !== n.children.length) throw new Error("pay sayısı uyuşmuyor");
    if (n.dir === parentDir) throw new Error("aynı yönlü iç içe kap");
    if (n.sizes.some((s) => !(s > 0))) throw new Error("pay sıfır ya da geçersiz");
    if (Math.abs(n.sizes.reduce((a, b) => a + b, 0) - 1) > EPS) throw new Error("payların toplamı 1 değil");
    n.children.forEach((c) => walk(c, n.dir));
  };
  if (node) walk(node, null);
  if (ids) {
    const expected = [...ids].sort().join("|");
    if ([...seen].sort().join("|") !== expected) throw new Error("ağaçtaki bölmeler listeyle uyuşmuyor");
  }
}

const pane = (paneId: string): LayoutNode => ({ type: "pane", paneId });
const equal = (n: number) => Array.from({ length: n }, () => 1 / n);

/** Ağacı olmayan eski kayıt: bugünkü otomatik ızgaranın satırları. */
export function fromLegacy(ids: readonly string[]): LayoutNode | null {
  const n = ids.length;
  if (n === 0) return null;
  if (n === 1) return pane(ids[0]);
  if (n === 3) {
    return {
      type: "split",
      dir: "row",
      children: [pane(ids[0]), { type: "split", dir: "column", children: [pane(ids[1]), pane(ids[2])], sizes: equal(2) }],
      sizes: equal(2)
    };
  }
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows: LayoutNode[] = [];
  for (let i = 0; i < n; i += cols) {
    const chunk = ids.slice(i, i + cols).map(pane);
    rows.push(chunk.length === 1 ? chunk[0] : { type: "split", dir: "row", children: chunk, sizes: equal(chunk.length) });
  }
  return tidy(rows.length === 1 ? rows[0] : { type: "split", dir: "column", children: rows, sizes: equal(rows.length) });
}

function dirOf(side: EdgeSide): SplitDir {
  return side === "left" || side === "right" ? "row" : "column";
}

function mapLeaves(node: LayoutNode, fn: (paneId: string) => LayoutNode | null): LayoutNode | null {
  if (node.type === "pane") return fn(node.paneId);
  return {
    ...node,
    children: node.children.map((c) => mapLeaves(c, fn) ?? { type: "split", dir: node.dir, children: [], sizes: [] })
  };
}

export function insertPane(
  layout: LayoutNode | null,
  newId: string,
  target: { paneId: string; side: EdgeSide } | null
): LayoutNode {
  if (!layout) return pane(newId);
  const ids = leafIds(layout);
  const where = target && ids.includes(target.paneId) ? target : { paneId: ids[ids.length - 1], side: "right" as const };
  const before = where.side === "left" || where.side === "top";
  const next = mapLeaves(layout, (id) =>
    id === where.paneId
      ? { type: "split", dir: dirOf(where.side), children: before ? [pane(newId), pane(id)] : [pane(id), pane(newId)], sizes: equal(2) }
      : pane(id)
  );
  return tidy(next) as LayoutNode;
}

export function removePane(layout: LayoutNode | null, paneId: string): LayoutNode | null {
  if (!layout || !leafIds(layout).includes(paneId)) return layout;
  return tidy(mapLeaves(layout, (id) => (id === paneId ? null : pane(id))));
}

function parse(raw: unknown, allowed: ReadonlySet<string>, seen: Set<string>, depth: number): LayoutNode | null {
  if (depth > MAX_DEPTH || !raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.type === "pane") {
    if (typeof r.paneId !== "string" || !allowed.has(r.paneId) || seen.has(r.paneId)) return null;
    seen.add(r.paneId);
    return pane(r.paneId);
  }
  if (r.type !== "split" || (r.dir !== "row" && r.dir !== "column") || !Array.isArray(r.children)) return null;
  const rawSizes = Array.isArray(r.sizes) ? r.sizes : [];
  const validSizes =
    rawSizes.length === r.children.length && rawSizes.every((s) => typeof s === "number" && Number.isFinite(s) && s > 0);
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  r.children.forEach((c, i) => {
    const child = parse(c, allowed, seen, depth + 1);
    if (!child) return;
    children.push(child);
    sizes.push(validSizes ? (rawSizes[i] as number) : 1);
  });
  return { type: "split", dir: r.dir, children, sizes: normSizes(sizes.length ? sizes : [1]) };
}

/** Kayıttan gelen ağacı onarır: bilinmeyen/çift kimlik düşer, eksik bölme sona eklenir. */
export function normalizeLayout(raw: unknown, ids: readonly string[]): LayoutNode | null {
  if (ids.length === 0) return null;
  const seen = new Set<string>();
  let layout = tidy(parse(raw, new Set(ids), seen, 0));
  if (!layout) return fromLegacy(ids);
  for (const id of ids) if (!seen.has(id)) layout = insertPane(layout, id, null);
  return layout;
}
```

`mapLeaves`'te kaldırılan yaprağın yerine konan boş kap `tidy` tarafından atılıyor; `tidy` payı 0 olan çocuğu da atıyor.

Not: "bozuk paylar eşitleniyor" testinde `sizes: [NaN, -1]` → `validSizes` false → çocuklar eşit pay alır, sonuç `fromLegacy(["a","b"])` ile aynı olur. Test beklentisi bu.

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalTree.test.ts`
Beklenen: hepsi PASS. Bir test başarısızsa beklentiyi değil kodu düzelt; beklenti spec §3.1'den.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/shared/terminalTree.ts
git add tests/terminalTree.test.ts
git commit -m "Terminal: bolme agaci modulu (ekle, cikar, duzelt, eski kayittan donusum, dogrulama)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: Ağaç modülü — yer değiştirme, taşıma, oran sürükleme, eşitleme, dönüş adresi

**Dosyalar:**
- Değişir: `app-electron/shared/terminalTree.ts` (sona eklenir)
- Test: `tests/terminalTreeMove.test.ts`

**Arayüzler:**
- Tüketir: Görev 2'deki `LayoutNode`, `EdgeSide`, `DropZone`, `PaneHome`, `leafIds`, `tidy`, `insertPane`, `removePane`, `fromLegacy`, `assertLayout`.
- Üretir:

```ts
export type LayoutPath = number[]; // kökten çocuk indisleri; [] = kök
export function nodeAt(layout: LayoutNode | null, path: LayoutPath): LayoutNode | null;
export function swapPanes(layout: LayoutNode | null, a: string, b: string): LayoutNode | null;
export function movePane(layout: LayoutNode | null, dragId: string, targetId: string, zone: DropZone): LayoutNode | null;
export function dragSizes(sizes: readonly number[], index: number, delta: number, min: number): number[];
export function resizeSplit(layout: LayoutNode | null, path: LayoutPath, index: number, delta: number, min: number): LayoutNode | null;
export function equalizeSplit(layout: LayoutNode | null, path: LayoutPath): LayoutNode | null;
export function homeOf(layout: LayoutNode | null, paneId: string): PaneHome | null;
export function restoreInto(layout: LayoutNode | null, paneId: string, home: PaneHome | null, fallbackPaneId: string | null): LayoutNode;
```

- [ ] **Adım 1: Kırmızı test**

```ts
// tests/terminalTreeMove.test.ts
// Bölme ağacında yer değiştirme, taşıma, boyutlandırma (spec 2026-10-14 §3.3–3.4, §4 küçült).
import { describe, expect, it } from "vitest";
import {
  assertLayout,
  dragSizes,
  equalizeSplit,
  fromLegacy,
  homeOf,
  leafIds,
  movePane,
  nodeAt,
  resizeSplit,
  restoreInto,
  removePane,
  swapPanes,
  type LayoutNode
} from "../app-electron/shared/terminalTree";

const leaf = (paneId: string): LayoutNode => ({ type: "pane", paneId });
const four = () => fromLegacy(["a", "b", "c", "d"]); // column[row[a,b], row[c,d]]

describe("swapPanes / movePane", () => {
  it("orta: yer değiştiriyor, yapı aynı", () => {
    const next = movePane(four(), "a", "d", "center");
    expect(leafIds(next)).toEqual(["d", "b", "c", "a"]);
    assertLayout(next, ["a", "b", "c", "d"]);
    expect(swapPanes(four(), "a", "d")).toEqual(next);
  });

  it("kenar: kaynaktan çıkıp hedefin o tarafına giriyor", () => {
    const next = movePane(four(), "a", "d", "right");
    assertLayout(next, ["a", "b", "c", "d"]);
    // a üst satırdan çıktı: üst satır yalnız b; alt satır c, d, a
    expect(next).toEqual({
      type: "split",
      dir: "column",
      children: [leaf("b"), { type: "split", dir: "row", children: [leaf("c"), leaf("d"), leaf("a")], sizes: [0.5, 0.25, 0.25] }],
      sizes: [0.5, 0.5]
    });
  });

  it("kendi üstüne, bilinmeyen kimlik: değişmiyor", () => {
    const base = four();
    expect(movePane(base, "a", "a", "left")).toBe(base);
    expect(movePane(base, "a", "yok", "left")).toBe(base);
    expect(movePane(base, "yok", "a", "center")).toBe(base);
  });

  it("iki bölmede kenara taşıma yön değiştiriyor", () => {
    const next = movePane(fromLegacy(["a", "b"]), "a", "b", "bottom");
    expect(next).toEqual({ type: "split", dir: "column", children: [leaf("b"), leaf("a")], sizes: [0.5, 0.5] });
  });
});

describe("dragSizes / resizeSplit / equalizeSplit", () => {
  it("yalnız iki komşu değişiyor, toplam korunuyor, alt sınır tutuyor", () => {
    expect(dragSizes([0.25, 0.25, 0.5], 0, 0.1, 0.05)).toEqual([0.35, 0.15, 0.5]);
    const clamped = dragSizes([0.25, 0.25, 0.5], 0, 0.5, 0.05);
    expect(clamped[0]).toBeCloseTo(0.45);
    expect(clamped[1]).toBeCloseTo(0.05);
    expect(clamped[2]).toBe(0.5);
    expect(dragSizes([0.5, 0.5], 1, 0.1, 0.05)).toEqual([0.5, 0.5]); // son ayırıcı yok
    expect(dragSizes([0.5, 0.5], 0, Number.NaN, 0.05)).toEqual([0.5, 0.5]);
  });

  it("resizeSplit yola göre iç kabı değiştiriyor", () => {
    const next = resizeSplit(four(), [1], 0, 0.2, 0.05);
    const inner = nodeAt(next, [1]);
    expect(inner?.type === "split" && inner.sizes[0]).toBeCloseTo(0.7);
    expect(nodeAt(next, [0])).toEqual(nodeAt(four(), [0])); // üst satır etkilenmedi
    assertLayout(next, ["a", "b", "c", "d"]);
  });

  it("geçersiz yol ya da yaprak: değişmiyor", () => {
    const base = four();
    expect(resizeSplit(base, [5], 0, 0.1, 0.05)).toBe(base);
    expect(resizeSplit(base, [0, 0], 0, 0.1, 0.05)).toBe(base);
  });

  it("equalizeSplit kabın çocuklarını eşitliyor", () => {
    const skewed = resizeSplit(four(), [], 0, 0.3, 0.05);
    const next = equalizeSplit(skewed, []);
    expect(next?.type === "split" && next.sizes).toEqual([0.5, 0.5]);
  });
});

describe("homeOf / restoreInto — küçült ve geri getir", () => {
  it("sonraki kardeşin solu / üstü; yoksa önceki kardeşin sağı / altı", () => {
    expect(homeOf(fromLegacy(["a", "b"]), "a")).toEqual({ siblingPaneId: "b", side: "left" });
    expect(homeOf(fromLegacy(["a", "b"]), "b")).toEqual({ siblingPaneId: "a", side: "right" });
    expect(homeOf(four(), "c")).toEqual({ siblingPaneId: "d", side: "left" });
    expect(homeOf(leaf("a"), "a")).toBeNull();
  });

  it("çocuğu kap olan kardeşte ilk / son yaprak", () => {
    // row[a, column[b, c]]: a'nın komşusu kabın ilk yaprağı b
    expect(homeOf(fromLegacy(["a", "b", "c"]), "a")).toEqual({ siblingPaneId: "b", side: "left" });
  });

  it("küçültüp geri getirmek yaprak sırasını koruyor", () => {
    const base = fromLegacy(["a", "b"]);
    const home = homeOf(base, "a");
    const without = removePane(base, "a");
    expect(leafIds(restoreInto(without, "a", home, null))).toEqual(["a", "b"]);
  });

  it("kardeş artık yoksa yedek bölmenin sağına; ağaç boşsa tek yaprak", () => {
    expect(leafIds(restoreInto(leaf("x"), "a", { siblingPaneId: "gitti", side: "left" }, "x"))).toEqual(["x", "a"]);
    expect(restoreInto(null, "a", null, null)).toEqual(leaf("a"));
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalTreeMove.test.ts`
Beklenen: FAIL — `movePane` vb. dışa açık değil.

- [ ] **Adım 3: Uygula** (`terminalTree.ts` sonuna)

```ts
export type LayoutPath = number[];

export function nodeAt(layout: LayoutNode | null, path: LayoutPath): LayoutNode | null {
  let node = layout;
  for (const i of path) {
    if (!node || node.type !== "split" || !Number.isInteger(i) || i < 0 || i >= node.children.length) return null;
    node = node.children[i];
  }
  return node;
}

function replaceAt(layout: LayoutNode, path: LayoutPath, next: LayoutNode): LayoutNode {
  if (path.length === 0) return next;
  if (layout.type !== "split") return layout;
  const [head, ...rest] = path;
  return { ...layout, children: layout.children.map((c, i) => (i === head ? replaceAt(c, rest, next) : c)) };
}

export function swapPanes(layout: LayoutNode | null, a: string, b: string): LayoutNode | null {
  if (!layout || a === b) return layout;
  const ids = leafIds(layout);
  if (!ids.includes(a) || !ids.includes(b)) return layout;
  return mapLeaves(layout, (id) => pane(id === a ? b : id === b ? a : id));
}

export function movePane(layout: LayoutNode | null, dragId: string, targetId: string, zone: DropZone): LayoutNode | null {
  if (!layout || dragId === targetId) return layout;
  const ids = leafIds(layout);
  if (!ids.includes(dragId) || !ids.includes(targetId)) return layout;
  if (zone === "center") return swapPanes(layout, dragId, targetId);
  return insertPane(removePane(layout, dragId), dragId, { paneId: targetId, side: zone });
}

/** `index` ile `index+1` arasındaki ayırıcı `delta` (pay) kadar kayınca. */
export function dragSizes(sizes: readonly number[], index: number, delta: number, min: number): number[] {
  const next = [...sizes];
  if (!Number.isInteger(index) || index < 0 || index >= sizes.length - 1 || !Number.isFinite(delta)) return next;
  const total = sizes[index] + sizes[index + 1];
  if (total <= 2 * min) return next;
  const first = Math.min(total - min, Math.max(min, sizes[index] + delta));
  next[index] = first;
  next[index + 1] = total - first;
  return next;
}

export function resizeSplit(layout: LayoutNode | null, path: LayoutPath, index: number, delta: number, min: number): LayoutNode | null {
  const node = nodeAt(layout, path);
  if (!layout || !node || node.type !== "split") return layout;
  const sizes = dragSizes(node.sizes, index, delta, min);
  if (sizes.every((s, i) => s === node.sizes[i])) return layout;
  return replaceAt(layout, path, { ...node, sizes });
}

export function equalizeSplit(layout: LayoutNode | null, path: LayoutPath): LayoutNode | null {
  const node = nodeAt(layout, path);
  if (!layout || !node || node.type !== "split") return layout;
  return replaceAt(layout, path, { ...node, sizes: equal(node.children.length) });
}

function firstLeaf(node: LayoutNode): string {
  return node.type === "pane" ? node.paneId : firstLeaf(node.children[0]);
}
function lastLeaf(node: LayoutNode): string {
  return node.type === "pane" ? node.paneId : lastLeaf(node.children[node.children.length - 1]);
}

/** Bölme ağaçtan çekilmeden önce dönüş adresi: en yakın kardeşin hangi tarafı. */
export function homeOf(layout: LayoutNode | null, paneId: string): PaneHome | null {
  const find = (node: LayoutNode): PaneHome | null => {
    if (node.type === "pane") return null;
    const i = node.children.findIndex((c) => c.type === "pane" && c.paneId === paneId);
    if (i >= 0) {
      const next = node.children[i + 1];
      if (next) return { siblingPaneId: firstLeaf(next), side: node.dir === "row" ? "left" : "top" };
      const prev = node.children[i - 1];
      return { siblingPaneId: lastLeaf(prev), side: node.dir === "row" ? "right" : "bottom" };
    }
    for (const c of node.children) {
      const found = find(c);
      if (found) return found;
    }
    return null;
  };
  return layout ? find(layout) : null;
}

/** Küçültülmüş bölmeyi geri koyar; kardeşi yoksa `fallbackPaneId`'nin sağına. */
export function restoreInto(layout: LayoutNode | null, paneId: string, home: PaneHome | null, fallbackPaneId: string | null): LayoutNode {
  const ids = leafIds(layout);
  if (home && ids.includes(home.siblingPaneId)) return insertPane(layout, paneId, { paneId: home.siblingPaneId, side: home.side });
  return insertPane(layout, paneId, fallbackPaneId && ids.includes(fallbackPaneId) ? { paneId: fallbackPaneId, side: "right" } : null);
}
```

`mapLeaves`, `pane`, `equal` Görev 2'de dosya içi tanımlı; aynı dosyada olduğu için erişilir.

`homeOf` testindeki "c" durumu: `four()` = `column[row[a,b], row[c,d]]`; c, alt satırda d'nin önünde → `{ siblingPaneId: "d", side: "left" }`.

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalTreeMove.test.ts tests/terminalTree.test.ts`
Beklenen: hepsi PASS.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/shared/terminalTree.ts
git add tests/terminalTreeMove.test.ts
git commit -m "Terminal: agacta yer degistirme, tasima, oran surukleme, kucultme donus adresi" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 4: Kayıt alanları — ad, renk, yazı boyutu, ağaç, küçültülenler

**Dosyalar:**
- Değişir: `app-electron/shared/types.ts` (`SavedTerminalPane`, `SavedTerminalWorkspace` çevresi, ~satır 310–322)
- Değişir: `app-electron/shared/terminalLayout.ts`
- Test: `tests/terminalConfig.test.ts` (sona yeni `describe`)

**Arayüzler:**
- Tüketir: Görev 2'den `LayoutNode`, `PaneHome`, `EdgeSide`, `normalizeLayout`.
- Üretir:

```ts
// types.ts
export type TerminalPaneColor = "gray" | "blue" | "green" | "amber" | "red" | "violet";
export interface SavedTerminalPane { id: string; kind: TerminalPaneKind; cwd: string; title?: string; color?: TerminalPaneColor; fontSize?: number }
export interface SavedMinimizedPane { paneId: string; home: PaneHome | null }
export interface SavedTerminalWorkspace { id: string; name: string; panes: SavedTerminalPane[]; layout?: LayoutNode | null; minimized?: SavedMinimizedPane[] }

// terminalLayout.ts
export const TERMINAL_PANE_COLORS: readonly TerminalPaneColor[];
export const PANE_FONT_MIN = 9, PANE_FONT_MAX = 24, PANE_FONT_DEFAULT = 13, PANE_TITLE_MAX = 40;
export function isTerminalPaneColor(value: unknown): value is TerminalPaneColor;
export function clampPaneFontSize(value: unknown): number | null; // sayı değilse null; değilse yuvarlanıp 9–24'e sıkıştırılır
export function cleanPaneTitle(value: unknown): string | null;    // kırpılmış, en fazla 40; boş ya da dize değil → null
```

**Kural:** eski biçimdeki kayıt (ağaçsız) normalizasyondan AYNEN çıkar — `layout` ve `minimized` yalnız kayıtta bu anahtarlar varsa çıktıya konur. Bölmenin `title`/`color`/`fontSize`'ı yalnız geçerliyse konur.

- [ ] **Adım 1: Kırmızı test** (`tests/terminalConfig.test.ts` sonuna; dosyanın başındaki import'a `PANE_FONT_DEFAULT`, `clampPaneFontSize`, `cleanPaneTitle`, `isTerminalPaneColor` eklenir; ayrıca `import { fromLegacy, leafIds } from "../app-electron/shared/terminalTree";`)

```ts
describe("normalizeTerminalWorkspaces — bölme ayarları ve ağaç (spec 2026-10-14 §4, §6.1)", () => {
  const p = (id: string, extra: Record<string, unknown> = {}) => ({ id, kind: "cmd", cwd: "C:\\a", ...extra });

  it("yardımcılar sınırları tutuyor", () => {
    expect(clampPaneFontSize(5)).toBe(9);
    expect(clampPaneFontSize(40)).toBe(24);
    expect(clampPaneFontSize(13.6)).toBe(14);
    expect(clampPaneFontSize("13")).toBeNull();
    expect(clampPaneFontSize(Number.NaN)).toBeNull();
    expect(cleanPaneTitle("  derleme  ")).toBe("derleme");
    expect(cleanPaneTitle("x".repeat(60))).toHaveLength(40);
    expect(cleanPaneTitle("   ")).toBeNull();
    expect(cleanPaneTitle(7)).toBeNull();
    expect(isTerminalPaneColor("violet")).toBe(true);
    expect(isTerminalPaneColor("pink")).toBe(false);
    expect(PANE_FONT_DEFAULT).toBe(13);
  });

  it("geçerli ad/renk/yazı boyutu kalıyor, bozukları düşüyor; bölme yine geliyor", () => {
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [p("p1", { title: " derleme ", color: "blue", fontSize: 15 }), p("p2", { title: "", color: "pink", fontSize: "büyük" })]
      }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor)[0].panes).toEqual([
      { id: "p1", kind: "cmd", cwd: "C:\\a", title: "derleme", color: "blue", fontSize: 15 },
      { id: "p2", kind: "cmd", cwd: "C:\\a" }
    ]);
  });

  it("geçerli ağaç ve küçültülen liste aynen kalıyor", () => {
    const layout = fromLegacy(["p1", "p2"]);
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [p("p1"), p("p2"), p("p3")],
        layout,
        minimized: [{ paneId: "p3", home: { siblingPaneId: "p2", side: "right" } }]
      }
    ];
    expect(normalizeTerminalWorkspaces(raw, nameFor)).toEqual(raw);
  });

  it("ağaç bölme listesiyle uyuşmuyorsa onarılıyor: hiçbir bölme kaybolmuyor (inceleme odağı 1)", () => {
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [p("p1"), p("p2"), p("p3")],
        // p2 ağaçta yok, "hayalet" listede yok, p1 iki kez
        layout: { type: "split", dir: "row", children: [{ type: "pane", paneId: "p1" }, { type: "pane", paneId: "hayalet" }, { type: "pane", paneId: "p1" }], sizes: [0.3, 0.3, 0.4] },
        minimized: [{ paneId: "p3", home: null }]
      }
    ];
    const [workspace] = normalizeTerminalWorkspaces(raw, nameFor);
    const visible = leafIds(workspace.layout ?? null);
    expect([...visible].sort()).toEqual(["p1", "p2"]);
    expect(workspace.minimized).toEqual([{ paneId: "p3", home: null }]);
  });

  it("küçültülen listesi: bilinmeyen/yinelenen bölme ve bozuk adres düşüyor", () => {
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [p("p1"), p("p2")],
        layout: "çöp",
        minimized: [
          { paneId: "yok", home: null },
          { paneId: "p2", home: { siblingPaneId: "p1", side: "çapraz" } },
          { paneId: "p2", home: null },
          "p1"
        ]
      }
    ];
    const [workspace] = normalizeTerminalWorkspaces(raw, nameFor);
    expect(workspace.minimized).toEqual([{ paneId: "p2", home: null }]);
    expect(workspace.layout).toEqual({ type: "pane", paneId: "p1" });
  });

  it("bütün bölmeler küçültülmüşse ağaç null", () => {
    const raw = [{ id: "w1", name: "A", panes: [p("p1")], layout: null, minimized: [{ paneId: "p1", home: null }] }];
    expect(normalizeTerminalWorkspaces(raw, nameFor)[0].layout).toBeNull();
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalConfig.test.ts`
Beklenen: FAIL — `clampPaneFontSize` vb. dışa açık değil.

- [ ] **Adım 3: `types.ts`**

Dosyanın başındaki import'ların yanına:

```ts
import type { LayoutNode, PaneHome } from "./terminalTree";
```

`SavedTerminalPane` / `SavedTerminalWorkspace` bloğu şöyle olur (yorum güncellenir):

```ts
// Terminal bölmesinin rengi (spec 2026-10-14 §4). `gray` = renksiz.
export type TerminalPaneColor = "gray" | "blue" | "green" | "amber" | "red" | "violet";

// Diske yalnız düzen yazılıyor: ad, tür, klasör, bölme ayarları, ağaç.
// Çıktı ve süreç kimliği yazılmıyor. Yeni alanlar isteğe bağlı: eski kayıt
// olduğu gibi okunuyor.
export interface SavedTerminalPane {
  id: string;
  kind: TerminalPaneKind;
  cwd: string;
  title?: string;
  color?: TerminalPaneColor;
  fontSize?: number;
}

export interface SavedMinimizedPane {
  paneId: string;
  home: PaneHome | null;
}

export interface SavedTerminalWorkspace {
  id: string;
  name: string;
  panes: SavedTerminalPane[];
  layout?: LayoutNode | null;
  minimized?: SavedMinimizedPane[];
}
```

`terminalTree.ts` `types.ts`'i import ETMİYOR; döngü yok.

- [ ] **Adım 4: `terminalLayout.ts`**

Import satırı:

```ts
import type { SavedMinimizedPane, SavedTerminalPane, SavedTerminalWorkspace, TerminalPaneColor, TerminalPaneKind } from "./types";
import { normalizeLayout, type EdgeSide, type PaneHome } from "./terminalTree";
```

`isTerminalPaneKind`'ın altına:

```ts
export const TERMINAL_PANE_COLORS: readonly TerminalPaneColor[] = ["gray", "blue", "green", "amber", "red", "violet"];
export const PANE_FONT_MIN = 9;
export const PANE_FONT_MAX = 24;
export const PANE_FONT_DEFAULT = 13;
export const PANE_TITLE_MAX = 40;

const EDGE_SIDES: readonly EdgeSide[] = ["left", "right", "top", "bottom"];

export function isTerminalPaneColor(value: unknown): value is TerminalPaneColor {
  return typeof value === "string" && (TERMINAL_PANE_COLORS as readonly string[]).includes(value);
}

export function clampPaneFontSize(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(PANE_FONT_MAX, Math.max(PANE_FONT_MIN, Math.round(value)));
}

export function cleanPaneTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim().slice(0, PANE_TITLE_MAX).trim();
  return title || null;
}

function readHome(raw: unknown): PaneHome | null {
  if (!raw || typeof raw !== "object") return null;
  const home = raw as Record<string, unknown>;
  if (!isId(home.siblingPaneId) || !(EDGE_SIDES as readonly unknown[]).includes(home.side)) return null;
  return { siblingPaneId: home.siblingPaneId, side: home.side as EdgeSide };
}

function readPaneExtras(pane: Record<string, unknown>): Partial<SavedTerminalPane> {
  const extras: Partial<SavedTerminalPane> = {};
  const title = cleanPaneTitle(pane.title);
  if (title) extras.title = title;
  if (isTerminalPaneColor(pane.color)) extras.color = pane.color;
  const fontSize = clampPaneFontSize(pane.fontSize);
  if (fontSize !== null) extras.fontSize = fontSize;
  return extras;
}

function readMinimized(raw: unknown, paneIds: ReadonlySet<string>): SavedMinimizedPane[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: SavedMinimizedPane[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (!isId(item.paneId) || !paneIds.has(item.paneId) || seen.has(item.paneId)) continue;
    seen.add(item.paneId);
    result.push({ paneId: item.paneId, home: readHome(item.home) });
  }
  return result;
}
```

`normalizeTerminalWorkspaces` içinde bölme okuma satırı:

```ts
        panes.push({ id: pane.id, kind: pane.kind, cwd: pane.cwd, ...readPaneExtras(pane) });
```

ve `workspaceIds.add(record.id); result.push(...)` iki satırı şöyle olur:

```ts
    workspaceIds.add(record.id);
    const workspace: SavedTerminalWorkspace = {
      id: record.id,
      name: typeof record.name === "string" ? record.name.trim() : "",
      panes
    };
    // Eski kayıtta bu iki anahtar yok; olduğu gibi bırakılıyor (ağacı
    // indirgeyici `fromLegacy` ile kuruyor).
    if ("layout" in record || "minimized" in record) {
      const minimized = readMinimized(record.minimized, new Set(panes.map((p) => p.id)));
      const hidden = new Set(minimized.map((m) => m.paneId));
      workspace.layout = normalizeLayout(record.layout, panes.map((p) => p.id).filter((id) => !hidden.has(id)));
      workspace.minimized = minimized;
    }
    result.push(workspace);
```

`normalizeLayout` eksik bölmeyi ekliyor, fazlasını/yinelenenini atıyor, bozuksa `fromLegacy`'ye düşüyor (Görev 2) — "hiçbir bölme kaybolmaz" buradan geliyor.

- [ ] **Adım 5: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalConfig.test.ts tests/terminalTree.test.ts` ve `npm run typecheck`
Beklenen: hepsi PASS; typecheck temiz.

- [ ] **Adım 6: Commit**

```bash
git add app-electron/shared/types.ts
git add app-electron/shared/terminalLayout.ts
git add tests/terminalConfig.test.ts
git commit -m "Terminal: kayitta bolme adi, rengi, yazi boyutu, agac ve kucultulenler" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 5: İndirgeyici — ağaçlı durum ve yeni eylemler

**Dosyalar:**
- Değişir: `src/stores/terminalTypes.ts`
- Değişir: `src/stores/terminalReducer.ts`
- Değişir: `tests/terminalReducer.test.ts` (yalnız sondaki `toSaved` testi)
- Test (yeni): `tests/terminalReducerTree.test.ts`

**Arayüzler:**
- Tüketir: Görev 2–3'ten `LayoutNode`, `LayoutPath`, `DropZone`, `SplitDir`, `EdgeSide`, `PaneHome`, `leafIds`, `fromLegacy`, `insertPane`, `removePane`, `movePane`, `resizeSplit`, `equalizeSplit`, `homeOf`, `restoreInto`, `normalizeLayout`; Görev 4'ten `TerminalPaneColor`, `cleanPaneTitle`, `clampPaneFontSize`, `isTerminalPaneColor`.
- Üretir:

```ts
// terminalTypes.ts
export interface MinimizedPane { paneId: string; home: PaneHome | null; unread?: boolean }
export interface TerminalPane { id; kind; cwd; run; title?: string; color?: TerminalPaneColor; fontSize?: number }
export interface TerminalWorkspace { /* eskiler */ layout?: LayoutNode | null; minimized?: MinimizedPane[] }
// Yeni / değişen eylemler
| { type: "addPane"; workspaceId: string; paneId: string; kind: TerminalPaneKind; cwd: string; split?: { targetPaneId: string; dir: SplitDir } }
| { type: "movePane"; paneId: string; targetPaneId: string; zone: DropZone }
| { type: "resizeSplit"; workspaceId: string; path: LayoutPath; index: number; delta: number; min: number }
| { type: "equalizeSplit"; workspaceId: string; path: LayoutPath }
| { type: "minimizePane"; paneId: string }
| { type: "restorePane"; paneId: string }
| { type: "renamePane"; paneId: string; title: string }
| { type: "setPaneColor"; paneId: string; color: TerminalPaneColor }
| { type: "setPaneFontSize"; paneId: string; fontSize: number | null } // null = varsayılan

// terminalReducer.ts
export function layoutOf(workspace: TerminalWorkspace): LayoutNode | null;   // layout yoksa görünür bölmelerden fromLegacy
export function minimizedOf(workspace: TerminalWorkspace): MinimizedPane[];  // yoksa []
```

**Neden `layout`/`minimized` isteğe bağlı:** bileşen testleri (`terminalMode.test.tsx`, `terminalSidebar.test.tsx`) alanı elle kuruyor; zorunlu yapılırsa hepsi değişir. Okuyan her yer `layoutOf`/`minimizedOf` kullanır, alanı doğrudan okumaz.

**Kurallar (spec §3.2, §3.4, §3.5, §4):**
- `addPane`: `split.targetPaneId` ağaçtaysa onu, değilse odaktaki görünür bölmeyi, o da yoksa son yaprağı böler. `split.dir === "column"` → altına, değilse sağına. Yeni bölme odak alır, büyütme kalkar.
- `focusPane` / `toggleMaximize` küçültülmüş bölmede hiçbir şey yapmaz. Odak hiçbir zaman küçültülmüş bölmede durmaz.
- `minimizePane`: dönüş adresi (`homeOf`) kaydedilir; odaktaysa odak adresteki kardeşe, o yoksa ilk görünür yaprağa; büyütülmüşse büyütme kalkar.
- `restorePane`: adrese, kardeş yoksa odaktaki bölmenin sağına; odak geri gelen bölmeye; büyütme kalkar.
- `movePane`: bilinmeyen/kapanmış kimlikte AYNI durum; değişince odak sürüklenene, büyütme kalkar.
- Küçültülmüş bölmeye çıktı gelince şerit sekmesinde nokta: `MinimizedPane.unread = true` (diske yazılmaz).
- `toSaved`: `layout`, `minimized` (`unread` olmadan) ve bölmenin tanımlı `title`/`color`/`fontSize`'ı yazılır.

- [ ] **Adım 1: Kırmızı test** — `tests/terminalReducerTree.test.ts`

```ts
// İndirgeyicide bölme ağacı (spec 2026-10-14 §3–4). React'sız.
import { describe, expect, it } from "vitest";
import { assertLayout, leafIds } from "../app-electron/shared/terminalTree";
import { initialTerminalState, layoutOf, minimizedOf, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalAction, TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";

const nameFor = (n: number) => `Alan ${n}`;
const run = (actions: TerminalAction[], from: TerminalState = initialTerminalState) => actions.reduce(terminalReducer, from);

function ready(): TerminalState {
  return run([
    { type: "setVisible", visible: true },
    { type: "open", saved: [], activeId: null, freshId: "w1", nameFor }
  ]);
}
const add = (paneId: string, split?: { targetPaneId: string; dir: "row" | "column" }): TerminalAction => ({
  type: "addPane",
  workspaceId: "w1",
  paneId,
  kind: "cmd",
  cwd: "C:\\a",
  split
});
const ws = (state: TerminalState): TerminalWorkspace => state.workspaces[0];

/** Ağaçtaki yapraklar + küçültülenler = bölmeler (spec §3.1 değişmezi). */
function consistent(state: TerminalState) {
  for (const w of state.workspaces) {
    const visible = leafIds(layoutOf(w));
    const hidden = minimizedOf(w).map((m) => m.paneId);
    assertLayout(layoutOf(w), visible);
    expect([...visible, ...hidden].sort()).toEqual(w.panes.map((p) => p.id).sort());
    expect(w.focusedPaneId === null || visible.includes(w.focusedPaneId)).toBe(true);
  }
}

describe("addPane ağaçla", () => {
  it("ilk bölme kök; sonrakiler odaktakinin sağına; split yönü ve hedefi uyuluyor", () => {
    let state = run([add("p1"), add("p2")], ready());
    expect(layoutOf(ws(state))).toEqual({
      type: "split",
      dir: "row",
      children: [{ type: "pane", paneId: "p1" }, { type: "pane", paneId: "p2" }],
      sizes: [0.5, 0.5]
    });
    state = terminalReducer(state, add("p3", { targetPaneId: "p1", dir: "column" }));
    const root = layoutOf(ws(state));
    expect(root?.type === "split" && root.children[0]).toEqual({
      type: "split",
      dir: "column",
      children: [{ type: "pane", paneId: "p1" }, { type: "pane", paneId: "p3" }],
      sizes: [0.5, 0.5]
    });
    expect(ws(state).focusedPaneId).toBe("p3");
    consistent(state);
  });

  it("hedef küçültülmüşse yeni bölme yine görünür bir yere açılıyor (inceleme odağı 2)", () => {
    const state = run([add("p1"), add("p2"), { type: "minimizePane", paneId: "p2" }, add("p3", { targetPaneId: "p2", dir: "row" })], ready());
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p1", "p3"]);
    consistent(state);
  });

  it("bütün bölmeler küçültülünce ağaç boş, ekleme yine çalışıyor (inceleme odağı 3)", () => {
    let state = run([add("p1"), add("p2"), { type: "minimizePane", paneId: "p1" }, { type: "minimizePane", paneId: "p2" }], ready());
    expect(layoutOf(ws(state))).toBeNull();
    expect(ws(state).focusedPaneId).toBeNull();
    state = terminalReducer(state, add("p3"));
    expect(layoutOf(ws(state))).toEqual({ type: "pane", paneId: "p3" });
    consistent(state);
  });
});

describe("küçült / geri getir", () => {
  it("eski yerine dönüyor; odak ve büyütme kuralları", () => {
    let state = run([add("p1"), add("p2"), add("p3"), { type: "toggleMaximize", paneId: "p2" }], ready());
    state = terminalReducer(state, { type: "minimizePane", paneId: "p2" });
    expect(ws(state).maximizedPaneId).toBeNull(); // inceleme odağı 5
    expect(ws(state).focusedPaneId).toBe("p3"); // adresteki kardeş
    expect(minimizedOf(ws(state))).toEqual([{ paneId: "p2", home: { siblingPaneId: "p3", side: "left" } }]);
    consistent(state);
    state = terminalReducer(state, { type: "restorePane", paneId: "p2" });
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p1", "p2", "p3"]);
    expect(ws(state).focusedPaneId).toBe("p2");
    expect(minimizedOf(ws(state))).toEqual([]);
    consistent(state);
  });

  it("küçültülmüş bölmeye odak ve büyütme gitmiyor; ikinci küçültme ve bilinmeyen geri getirme etkisiz", () => {
    const state = run([add("p1"), add("p2"), { type: "minimizePane", paneId: "p2" }], ready());
    expect(terminalReducer(state, { type: "focusPane", paneId: "p2" })).toBe(state);
    expect(terminalReducer(state, { type: "toggleMaximize", paneId: "p2" })).toBe(state);
    expect(terminalReducer(state, { type: "minimizePane", paneId: "p2" })).toBe(state);
    expect(terminalReducer(state, { type: "restorePane", paneId: "p1" })).toBe(state);
  });

  it("küçültülmüş bölmeye çıktı gelince sekmede nokta; geri gelince siliniyor", () => {
    let state = run(
      [
        add("p1"),
        add("p2"),
        { type: "spawnStarted", paneId: "p2", token: 1 },
        { type: "spawnSucceeded", paneId: "p2", token: 1, ptyId: "t2" },
        { type: "minimizePane", paneId: "p2" },
        { type: "ptyData", ptyId: "t2" }
      ],
      ready()
    );
    expect(minimizedOf(ws(state))[0].unread).toBe(true);
    expect(terminalReducer(state, { type: "ptyData", ptyId: "t2" })).toBe(state);
    state = terminalReducer(state, { type: "restorePane", paneId: "p2" });
    expect(minimizedOf(ws(state))).toEqual([]);
  });

  it("kapatma ağaçtan da küçültülenlerden de çıkarıyor", () => {
    let state = run([add("p1"), add("p2"), add("p3"), { type: "minimizePane", paneId: "p3" }], ready());
    state = run([{ type: "closePane", paneId: "p3" }, { type: "closePane", paneId: "p1" }], state);
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p2"]);
    expect(minimizedOf(ws(state))).toEqual([]);
    expect(ws(state).focusedPaneId).toBe("p2");
    consistent(state);
  });
});

describe("taşıma ve boyut", () => {
  it("orta yer değiştiriyor, kenar taşıyor; büyütme kalkıyor, odak sürüklenende", () => {
    let state = run([add("p1"), add("p2"), add("p3"), { type: "toggleMaximize", paneId: "p1" }], ready());
    state = terminalReducer(state, { type: "movePane", paneId: "p1", targetPaneId: "p3", zone: "center" });
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p3", "p2", "p1"]);
    expect(ws(state).maximizedPaneId).toBeNull();
    expect(ws(state).focusedPaneId).toBe("p1");
    state = terminalReducer(state, { type: "movePane", paneId: "p3", targetPaneId: "p1", zone: "bottom" });
    expect(leafIds(layoutOf(ws(state)))).toEqual(["p2", "p1", "p3"]);
    consistent(state);
  });

  it("kapanmış bölmeye ya da kendine bırakma aynı durumu döndürüyor (inceleme odağı 4)", () => {
    const state = run([add("p1"), add("p2"), { type: "closePane", paneId: "p2" }], ready());
    expect(terminalReducer(state, { type: "movePane", paneId: "p1", targetPaneId: "p2", zone: "left" })).toBe(state);
    expect(terminalReducer(state, { type: "movePane", paneId: "p2", targetPaneId: "p1", zone: "center" })).toBe(state);
    expect(terminalReducer(state, { type: "movePane", paneId: "p1", targetPaneId: "p1", zone: "left" })).toBe(state);
  });

  it("resizeSplit ve equalizeSplit yalnız o alanın ağacını değiştiriyor", () => {
    let state = run([add("p1"), add("p2")], ready());
    state = terminalReducer(state, { type: "resizeSplit", workspaceId: "w1", path: [], index: 0, delta: 0.2, min: 0.1 });
    const root = layoutOf(ws(state));
    expect(root?.type === "split" && root.sizes[0]).toBeCloseTo(0.7);
    expect(terminalReducer(state, { type: "resizeSplit", workspaceId: "yok", path: [], index: 0, delta: 0.1, min: 0.1 })).toBe(state);
    state = terminalReducer(state, { type: "equalizeSplit", workspaceId: "w1", path: [] });
    const eq = layoutOf(ws(state));
    expect(eq?.type === "split" && eq.sizes).toEqual([0.5, 0.5]);
  });
});

describe("bölme ayarları", () => {
  it("ad kırpılıyor, boş ad siliniyor; aynı değer aynı durum", () => {
    let state = run([add("p1"), { type: "renamePane", paneId: "p1", title: "  derleme " }], ready());
    expect(ws(state).panes[0].title).toBe("derleme");
    expect(terminalReducer(state, { type: "renamePane", paneId: "p1", title: "derleme" })).toBe(state);
    state = terminalReducer(state, { type: "renamePane", paneId: "p1", title: "   " });
    expect(ws(state).panes[0].title).toBeUndefined();
  });

  it("renk yalnız bilinen değer; yazı boyutu 9–24, null varsayılana dönüyor", () => {
    let state = run([add("p1"), { type: "setPaneColor", paneId: "p1", color: "violet" }], ready());
    expect(ws(state).panes[0].color).toBe("violet");
    expect(terminalReducer(state, { type: "setPaneColor", paneId: "p1", color: "pembe" as never })).toBe(state);
    state = terminalReducer(state, { type: "setPaneFontSize", paneId: "p1", fontSize: 40 });
    expect(ws(state).panes[0].fontSize).toBe(24);
    state = terminalReducer(state, { type: "setPaneFontSize", paneId: "p1", fontSize: null });
    expect(ws(state).panes[0].fontSize).toBeUndefined();
  });
});

describe("kayıt", () => {
  it("toSaved ağacı, küçültülenleri ve ayarları yazıyor; geri yükleme aynısını kuruyor", () => {
    const state = run(
      [
        add("p1"),
        add("p2"),
        add("p3", { targetPaneId: "p1", dir: "column" }),
        { type: "renamePane", paneId: "p1", title: "derleme" },
        { type: "setPaneFontSize", paneId: "p2", fontSize: 16 },
        { type: "minimizePane", paneId: "p3" }
      ],
      ready()
    );
    const saved = toSaved(state);
    expect(saved.workspaces[0].minimized).toEqual([{ paneId: "p3", home: { siblingPaneId: "p1", side: "bottom" } }]);
    expect(saved.workspaces[0].panes).toEqual([
      { id: "p1", kind: "cmd", cwd: "C:\\a", title: "derleme" },
      { id: "p2", kind: "cmd", cwd: "C:\\a", fontSize: 16 },
      { id: "p3", kind: "cmd", cwd: "C:\\a" }
    ]);
    const restored = run(
      [
        { type: "setVisible", visible: true },
        { type: "open", saved: saved.workspaces, activeId: saved.activeId, freshId: "x", nameFor },
        { type: "restore", nameFor }
      ]
    );
    expect(layoutOf(ws(restored))).toEqual(layoutOf(ws(state)));
    expect(minimizedOf(ws(restored))).toEqual(minimizedOf(ws(state)));
    expect(ws(restored).panes[0].title).toBe("derleme");
    expect(ws(restored).focusedPaneId).toBe("p1");
    consistent(restored);
  });

  it("ağaçsız eski kayıt ızgaraya benzer ağaçla açılıyor", () => {
    const panes = ["a", "b", "c"].map((id) => ({ id, kind: "cmd" as const, cwd: "C:\\a" }));
    const state = run([
      { type: "setVisible", visible: true },
      { type: "open", saved: [{ id: "w1", name: "A", panes }], activeId: "w1", freshId: "x", nameFor },
      { type: "restore", nameFor }
    ]);
    expect(leafIds(layoutOf(ws(state)))).toEqual(["a", "b", "c"]);
    consistent(state);
  });
});
```

`minimizePane` testindeki adres: `p1,p2,p3` tek `row`; `p2`'nin sonraki kardeşi `p3` → `{ siblingPaneId: "p3", side: "left" }`. Kayıt testindeki adres: `p3`, `p1`'in altına bölünmüş `column[p1,p3]` içinde son çocuk → önceki kardeş `p1`, `side: "bottom"`.

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalReducerTree.test.ts`
Beklenen: FAIL — `layoutOf`/`minimizedOf` dışa açık değil.

- [ ] **Adım 3: `terminalTypes.ts`**

Import'lar:

```ts
import type { SavedTerminalWorkspace, TerminalPaneColor, TerminalPaneKind } from "../../app-electron/shared/types";
import type { DropZone, LayoutNode, LayoutPath, PaneHome, SplitDir } from "../../app-electron/shared/terminalTree";
```

`TerminalPane`'in sonuna:

```ts
  // Bölme ayarları (spec 2026-10-14 §4). Tanımsız = varsayılan.
  title?: string;
  color?: TerminalPaneColor;
  fontSize?: number;
```

`TerminalPane`'in üstüne:

```ts
// Küçültülmüş bölme: ağaçta değil, alanın altındaki şeritte. `home` geri
// gelirken nereye konacağı; `unread` şeritteki nokta (diske yazılmıyor).
export interface MinimizedPane {
  paneId: string;
  home: PaneHome | null;
  unread?: boolean;
}
```

`TerminalWorkspace`'in sonuna:

```ts
  // Bölme ağacı ve küçültülenler. İsteğe bağlı: okuyan yer `layoutOf` /
  // `minimizedOf` kullanıyor; tanımsızsa görünür bölmelerden kuruluyor.
  layout?: LayoutNode | null;
  minimized?: MinimizedPane[];
```

`TerminalAction` içinde `addPane` satırı değişir, sona yeni eylemler eklenir:

```ts
  | {
      type: "addPane";
      workspaceId: string;
      paneId: string;
      kind: TerminalPaneKind;
      cwd: string;
      // Hangi bölme, hangi yönde bölünsün. Yoksa odaktaki bölmenin sağı.
      split?: { targetPaneId: string; dir: SplitDir };
    }
```

```ts
  | { type: "movePane"; paneId: string; targetPaneId: string; zone: DropZone }
  | { type: "resizeSplit"; workspaceId: string; path: LayoutPath; index: number; delta: number; min: number }
  | { type: "equalizeSplit"; workspaceId: string; path: LayoutPath }
  | { type: "minimizePane"; paneId: string }
  | { type: "restorePane"; paneId: string }
  | { type: "renamePane"; paneId: string; title: string }
  | { type: "setPaneColor"; paneId: string; color: TerminalPaneColor }
  | { type: "setPaneFontSize"; paneId: string; fontSize: number | null };
```

- [ ] **Adım 4: `terminalReducer.ts`**

Import'lar:

```ts
import {
  MAX_TERMINAL_PANES,
  MAX_TERMINAL_WORKSPACES,
  clampPaneFontSize,
  cleanPaneTitle,
  firstFreeWorkspaceNumber,
  isTerminalPaneColor
} from "../../app-electron/shared/terminalLayout";
import {
  equalizeSplit,
  fromLegacy,
  homeOf,
  insertPane,
  leafIds,
  movePane as moveInTree,
  normalizeLayout,
  removePane,
  resizeSplit,
  restoreInto,
  type EdgeSide,
  type LayoutNode,
  type SplitDir
} from "../../app-electron/shared/terminalTree";
```

ve `terminalTypes` import'una `MinimizedPane` eklenir.

`emptyWorkspace` şöyle olur:

```ts
function emptyWorkspace(id: string, name: string): TerminalWorkspace {
  return { id, name, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false, layout: null, minimized: [] };
}
```

`isWorkspaceVisible`'ın altına:

```ts
export function minimizedOf(workspace: TerminalWorkspace): MinimizedPane[] {
  return workspace.minimized ?? [];
}

/** Alanın ağacı. Tanımsızsa (elle kurulmuş durum) görünür bölmelerden. */
export function layoutOf(workspace: TerminalWorkspace): LayoutNode | null {
  if (workspace.layout !== undefined) return workspace.layout;
  const hidden = new Set(minimizedOf(workspace).map((m) => m.paneId));
  return fromLegacy(workspace.panes.filter((p) => !hidden.has(p.id)).map((p) => p.id));
}

function isMinimized(workspace: TerminalWorkspace, paneId: string): boolean {
  return minimizedOf(workspace).some((m) => m.paneId === paneId);
}

function updatePane(workspace: TerminalWorkspace, paneId: string, patch: Partial<TerminalPane>): TerminalWorkspace {
  return { ...workspace, panes: workspace.panes.map((p) => (p.id === paneId ? { ...p, ...patch } : p)) };
}
```

`withPane` şöyle olur:

```ts
function withPane(workspace: TerminalWorkspace, pane: TerminalPane, split?: { targetPaneId: string; dir: SplitDir }): TerminalWorkspace {
  const layout = layoutOf(workspace);
  const visible = leafIds(layout);
  // Hedef küçültülmüş ya da kapanmışsa odaktaki bölme; o da yoksa son yaprak.
  const anchor = [split?.targetPaneId, workspace.focusedPaneId].find((id): id is string => !!id && visible.includes(id));
  const side: EdgeSide = split?.dir === "column" ? "bottom" : "right";
  return {
    ...workspace,
    panes: [...workspace.panes, pane],
    layout: insertPane(layout, pane.id, anchor ? { paneId: anchor, side } : null),
    minimized: minimizedOf(workspace),
    focusedPaneId: pane.id,
    maximizedPaneId: null
  };
}
```

`fromSaved` şöyle olur:

```ts
function fromSaved(saved: SavedTerminalWorkspace): TerminalWorkspace {
  const ids = saved.panes.map((p) => p.id);
  const minimized = (saved.minimized ?? []).filter((m) => ids.includes(m.paneId)).map((m) => ({ paneId: m.paneId, home: m.home }));
  const hidden = new Set(minimized.map((m) => m.paneId));
  // Ağaçsız eski kayıt: normalizeLayout `fromLegacy`'ye düşüyor.
  const layout = normalizeLayout(saved.layout, ids.filter((id) => !hidden.has(id)));
  return {
    ...emptyWorkspace(saved.id, saved.name),
    panes: saved.panes.map((p) => ({
      id: p.id,
      kind: p.kind,
      cwd: p.cwd,
      title: p.title,
      color: p.color,
      fontSize: p.fontSize,
      run: { state: "queued" }
    })),
    layout,
    minimized,
    focusedPaneId: leafIds(layout)[0] ?? null
  };
}
```

`terminalReducer` içinde değişen `case`'ler:

```ts
    case "addPane": {
      const workspace = state.workspaces.find((w) => w.id === action.workspaceId);
      if (state.phase !== "ready" || !workspace || workspace.panes.length >= MAX_TERMINAL_PANES || !action.cwd.trim()) {
        return state;
      }
      const pane: TerminalPane = { id: action.paneId, kind: action.kind, cwd: action.cwd, run: { state: "queued" } };
      return replaceWorkspace(state, withPane(workspace, pane, action.split));
    }
```

```ts
    case "closePane": {
      const found = findPane(state, action.paneId);
      if (!found) return state;
      const { workspace } = found;
      const before = leafIds(layoutOf(workspace));
      const layout = removePane(layoutOf(workspace), action.paneId);
      const after = leafIds(layout);
      const index = before.indexOf(action.paneId);
      const focusedPaneId =
        workspace.focusedPaneId === action.paneId ? (after[Math.min(Math.max(index, 0), after.length - 1)] ?? null) : workspace.focusedPaneId;
      return replaceWorkspace(state, {
        ...workspace,
        panes: workspace.panes.filter((p) => p.id !== action.paneId),
        layout,
        minimized: minimizedOf(workspace).filter((m) => m.paneId !== action.paneId),
        focusedPaneId,
        maximizedPaneId: workspace.maximizedPaneId === action.paneId ? null : workspace.maximizedPaneId
      });
    }
```

```ts
    case "focusPane": {
      const found = findPane(state, action.paneId);
      if (!found || found.workspace.focusedPaneId === action.paneId || isMinimized(found.workspace, action.paneId)) return state;
      return replaceWorkspace(state, { ...found.workspace, focusedPaneId: action.paneId });
    }
    case "toggleMaximize": {
      const found = findPane(state, action.paneId);
      if (!found || isMinimized(found.workspace, action.paneId)) return state;
      const maximizedPaneId = found.workspace.maximizedPaneId === action.paneId ? null : action.paneId;
      return replaceWorkspace(state, { ...found.workspace, maximizedPaneId, focusedPaneId: action.paneId });
    }
```

```ts
    case "ptyData": {
      const found = paneByPty(state, action.ptyId);
      if (!found) return state;
      let workspace = flag(state, found.workspace, "unread");
      const entry = minimizedOf(workspace).find((m) => m.paneId === found.pane.id);
      if (entry && !entry.unread) {
        workspace = { ...workspace, minimized: minimizedOf(workspace).map((m) => (m === entry ? { ...m, unread: true } : m)) };
      }
      return workspace === found.workspace ? state : replaceWorkspace(state, workspace);
    }
```

Yeni `case`'ler (switch'in sonuna, `ptyData`'dan sonra):

```ts
    case "movePane": {
      const found = findPane(state, action.paneId);
      if (!found || !found.workspace.panes.some((p) => p.id === action.targetPaneId)) return state;
      const before = layoutOf(found.workspace);
      const layout = moveInTree(before, action.paneId, action.targetPaneId, action.zone);
      if (layout === before) return state;
      return replaceWorkspace(state, { ...found.workspace, layout, focusedPaneId: action.paneId, maximizedPaneId: null });
    }
    case "resizeSplit":
    case "equalizeSplit": {
      const workspace = state.workspaces.find((w) => w.id === action.workspaceId);
      if (!workspace) return state;
      const before = layoutOf(workspace);
      const layout =
        action.type === "resizeSplit"
          ? resizeSplit(before, action.path, action.index, action.delta, action.min)
          : equalizeSplit(before, action.path);
      if (layout === before) return state;
      return replaceWorkspace(state, { ...workspace, layout });
    }
    case "minimizePane": {
      const found = findPane(state, action.paneId);
      if (!found || isMinimized(found.workspace, action.paneId)) return state;
      const workspace = found.workspace;
      const before = layoutOf(workspace);
      const home = homeOf(before, action.paneId);
      const layout = removePane(before, action.paneId);
      const visible = leafIds(layout);
      const focusedPaneId =
        workspace.focusedPaneId !== action.paneId
          ? workspace.focusedPaneId
          : home && visible.includes(home.siblingPaneId)
            ? home.siblingPaneId
            : (visible[0] ?? null);
      return replaceWorkspace(state, {
        ...workspace,
        layout,
        minimized: [...minimizedOf(workspace), { paneId: action.paneId, home }],
        focusedPaneId,
        maximizedPaneId: workspace.maximizedPaneId === action.paneId ? null : workspace.maximizedPaneId
      });
    }
    case "restorePane": {
      const found = findPane(state, action.paneId);
      const entry = found ? minimizedOf(found.workspace).find((m) => m.paneId === action.paneId) : undefined;
      if (!found || !entry) return state;
      const workspace = found.workspace;
      return replaceWorkspace(state, {
        ...workspace,
        layout: restoreInto(layoutOf(workspace), action.paneId, entry.home, workspace.focusedPaneId),
        minimized: minimizedOf(workspace).filter((m) => m !== entry),
        focusedPaneId: action.paneId,
        maximizedPaneId: null
      });
    }
    case "renamePane": {
      const found = findPane(state, action.paneId);
      const title = cleanPaneTitle(action.title) ?? undefined;
      if (!found || found.pane.title === title) return state;
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { title }));
    }
    case "setPaneColor": {
      const found = findPane(state, action.paneId);
      if (!found || !isTerminalPaneColor(action.color) || found.pane.color === action.color) return state;
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { color: action.color }));
    }
    case "setPaneFontSize": {
      const found = findPane(state, action.paneId);
      const fontSize = action.fontSize === null ? undefined : (clampPaneFontSize(action.fontSize) ?? undefined);
      if (!found || found.pane.fontSize === fontSize) return state;
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { fontSize }));
    }
```

`toSaved` şöyle olur:

```ts
export function toSaved(state: TerminalState): { workspaces: SavedTerminalWorkspace[]; activeId: string | null } {
  return {
    workspaces: state.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      panes: w.panes.map((p) => ({
        id: p.id,
        kind: p.kind,
        cwd: p.cwd,
        ...(p.title ? { title: p.title } : {}),
        ...(p.color ? { color: p.color } : {}),
        ...(p.fontSize !== undefined ? { fontSize: p.fontSize } : {})
      })),
      layout: layoutOf(w),
      minimized: minimizedOf(w).map((m) => ({ paneId: m.paneId, home: m.home }))
    })),
    activeId: state.activeWorkspaceId
  };
}
```

- [ ] **Adım 5: Eski `toSaved` testini güncelle** (`tests/terminalReducer.test.ts`, sondaki `describe("toSaved")`)

```ts
describe("toSaved", () => {
  it("ad, tür, klasör, ağaç; çalışma durumu yok", () => {
    const state = runningPane(withPanes(1), "p1", "t1");
    expect(toSaved(state)).toEqual({
      workspaces: [
        {
          id: "w1",
          name: "Alan 1",
          panes: [{ id: "p1", kind: "cmd", cwd: "C:\\a" }],
          layout: { type: "pane", paneId: "p1" },
          minimized: []
        }
      ],
      activeId: "w1"
    });
  });
});
```

- [ ] **Adım 6: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalReducerTree.test.ts tests/terminalReducer.test.ts tests/terminalStore.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS. `terminalStore.test.tsx`'te kayıt içeriğini `toEqual` ile karşılaştıran bir test kırılırsa beklentiye `layout` ve `minimized` alanlarını ekle (davranış değişmedi, kayıt genişledi); başka bir değişiklik yapma.

- [ ] **Adım 7: Commit**

```bash
git add src/stores/terminalTypes.ts
git add src/stores/terminalReducer.ts
git add tests/terminalReducer.test.ts
git add tests/terminalReducerTree.test.ts
git commit -m "Terminal: indirgeyicide bolme agaci, kucult/geri getir, tasima, bolme ayarlari" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 6: Depo komutları ve kayıt imzası

**Dosyalar:**
- Değişir: `src/stores/terminalStoreContext.ts`
- Değişir: `src/stores/terminalStore.tsx` (`signature` ~satır 45, `commands` ~satır 296)
- Değişir: `tests/terminalStore.test.tsx` (`describe("kalıcılık")` ilk testinin beklentisi + yeni `describe`)
- Değişir: `tests/terminalMode.test.tsx`, `tests/terminalPaneView.test.tsx`, `tests/terminalSidebar.test.tsx` (yalnız `commandsMock`)

**Arayüzler:**
- Tüketir: Görev 5'in eylemleri, `layoutOf`, `minimizedOf`; Görev 2'den `fromLegacy`, `LayoutPath`, `DropZone`, `SplitDir`; Görev 4'ten `TerminalPaneColor`.
- Üretir (`TerminalCommands`'a eklenen / değişen):

```ts
/** Seçili alana ekler. `split` verilirse o bölmeyi o yönde böler. */
addPane: (kind: TerminalPaneKind, cwd: string, split?: { targetPaneId: string; dir: SplitDir }) => void;
movePane: (paneId: string, targetPaneId: string, zone: DropZone) => void;
resizeSplit: (workspaceId: string, path: LayoutPath, index: number, delta: number, min: number) => void;
equalizeSplit: (workspaceId: string, path: LayoutPath) => void;
minimizePane: (paneId: string) => void;
restorePane: (paneId: string) => void;
renamePane: (paneId: string, title: string) => void;
setPaneColor: (paneId: string, color: TerminalPaneColor) => void;
setPaneFontSize: (paneId: string, fontSize: number | null) => void;
```

**İmza kuralı:** kayıt imzası artık ağacı, küçültülenleri ve bölme ayarlarını da kapsar (yoksa ad/renk/oran değişikliği diske yazılmaz). Ağaçsız eski kayıt, geri yüklenince kurulan `fromLegacy` ağacıyla AYNI imzayı verir — eski kaydı geri yüklemek tek başına yazma tetiklemez (mevcut "aynısını yeniden yazmıyor" testi bunu tutuyor). Oran sürüklemesi indirgeyiciye yalnız bırakınca gidiyor (Görev 7), yani sürükleme boyunca yazma yok.

- [ ] **Adım 1: Kırmızı test** — `tests/terminalStore.test.tsx`

Başa import:

```ts
import { layoutOf, minimizedOf } from "../src/stores/terminalReducer";
import { leafIds } from "../app-electron/shared/terminalTree";
```

`describe("kalıcılık")` ilk testindeki beklenti şöyle olur:

```ts
    expect(api.saveConfig).toHaveBeenLastCalledWith({
      terminalWorkspaces: [
        {
          id: store.state.workspaces[0].id,
          name: "Çalışma alanı 1",
          panes: [{ id: panes()[0].id, kind: "cmd", cwd: "C:\\a" }],
          layout: { type: "pane", paneId: panes()[0].id },
          minimized: []
        }
      ],
      terminalActiveWorkspaceId: store.state.workspaces[0].id
    });
```

Dosyanın sonuna:

```ts
describe("bölme ağacı komutları (spec 2026-10-14)", () => {
  const ws = () => store.state.workspaces[0];

  it("böl, küçült, geri getir, taşı, eşitle; her biri diske yazılıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    const [p1] = panes().map((p) => p.id);
    act(() => store.commands.addPane("cmd", "C:\\a", { targetPaneId: p1, dir: "column" }));
    const p2 = panes()[1].id;
    expect(layoutOf(ws())).toMatchObject({ type: "split", dir: "column" });

    let calls = api.saveConfig.mock.calls.length;
    act(() => store.commands.minimizePane(p2));
    await flush();
    expect(minimizedOf(ws()).map((m) => m.paneId)).toEqual([p2]);
    expect(api.saveConfig.mock.calls.length).toBeGreaterThan(calls);

    act(() => store.commands.restorePane(p2));
    act(() => store.commands.movePane(p1, p2, "center"));
    expect(leafIds(layoutOf(ws()))).toEqual([p2, p1]);

    calls = api.saveConfig.mock.calls.length;
    act(() => store.commands.resizeSplit(ws().id, [], 0, 0.2, 0.1));
    await flush();
    expect(api.saveConfig.mock.calls.length).toBe(calls + 1);
    act(() => store.commands.equalizeSplit(ws().id, []));
    const root = layoutOf(ws());
    expect(root?.type === "split" && root.sizes).toEqual([0.5, 0.5]);
  });

  it("ad, renk, yazı boyutu değişince yazılıyor; süreç yeniden başlamıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    await act(async () => creates[0].resolve("pty-1"));
    await flush();
    const id = panes()[0].id;
    const createsBefore = api.createTerminal.mock.calls.length;
    act(() => store.commands.renamePane(id, "derleme"));
    act(() => store.commands.setPaneColor(id, "blue"));
    act(() => store.commands.setPaneFontSize(id, 16));
    await flush();
    expect(panes()[0]).toMatchObject({ title: "derleme", color: "blue", fontSize: 16, run: { state: "running" } });
    const last = api.saveConfig.mock.calls.at(-1)?.[0] as Partial<AppConfig>;
    expect(last.terminalWorkspaces?.[0].panes[0]).toEqual({ id, kind: "cmd", cwd: "C:\\a", title: "derleme", color: "blue", fontSize: 16 });
    expect(api.createTerminal.mock.calls.length).toBe(createsBefore);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalStore.test.tsx`
Beklenen: FAIL — `store.commands.minimizePane is not a function` ve kalıcılık beklentisinde `layout` eksik.

- [ ] **Adım 3: `terminalStoreContext.ts`**

Import'lar:

```ts
import type { TerminalPaneColor, TerminalPaneKind } from "../../app-electron/shared/types";
import type { DropZone, LayoutPath, SplitDir } from "../../app-electron/shared/terminalTree";
```

`TerminalCommands`'ta `addPane` satırı ve yorumu şöyle olur, `toggleMaximize`'tan sonra yenileri gelir:

```ts
  /** Seçili alana ekler. `split` verilirse o bölmeyi o yönde böler; yoksa odaktakinin sağı. */
  addPane: (kind: TerminalPaneKind, cwd: string, split?: { targetPaneId: string; dir: SplitDir }) => void;
```

```ts
  movePane: (paneId: string, targetPaneId: string, zone: DropZone) => void;
  resizeSplit: (workspaceId: string, path: LayoutPath, index: number, delta: number, min: number) => void;
  equalizeSplit: (workspaceId: string, path: LayoutPath) => void;
  minimizePane: (paneId: string) => void;
  restorePane: (paneId: string) => void;
  renamePane: (paneId: string, title: string) => void;
  setPaneColor: (paneId: string, color: TerminalPaneColor) => void;
  /** `null` varsayılana döndürür. */
  setPaneFontSize: (paneId: string, fontSize: number | null) => void;
```

- [ ] **Adım 4: `terminalStore.tsx`**

Import: `import { fromLegacy } from "../../app-electron/shared/terminalTree";`

`signature` şöyle olur:

```ts
function signature(workspaces: AppConfig["terminalWorkspaces"], activeId: string | null): string {
  return JSON.stringify({
    workspaces: workspaces.map((w) => {
      const minimized = (w.minimized ?? []).map((m) => ({ paneId: m.paneId, home: m.home }));
      const hidden = new Set(minimized.map((m) => m.paneId));
      return {
        id: w.id,
        name: w.name,
        panes: w.panes.map((p) => ({
          id: p.id,
          kind: p.kind,
          cwd: p.cwd,
          title: p.title ?? null,
          color: p.color ?? null,
          fontSize: p.fontSize ?? null
        })),
        // Ağaçsız eski kayıt, geri yüklenince kurulan ağaçla aynı sayılıyor:
        // yalnız geri yüklemek diske yazma tetiklemiyor.
        layout: w.layout !== undefined ? w.layout : fromLegacy(w.panes.filter((p) => !hidden.has(p.id)).map((p) => p.id)),
        minimized
      };
    }),
    activeId
  });
}
```

`commands` içinde `addPane` şöyle olur, `toggleMaximize`'tan sonra yenileri gelir:

```ts
      addPane: (kind, cwd, split) => {
        const workspaceId = stateRef.current.activeWorkspaceId;
        if (!workspaceId) return;
        setLastKind(kind);
        dispatch({ type: "addPane", workspaceId, paneId: crypto.randomUUID(), kind, cwd, split });
      },
```

```ts
      movePane: (paneId, targetPaneId, zone) => dispatch({ type: "movePane", paneId, targetPaneId, zone }),
      resizeSplit: (workspaceId, path, index, delta, min) => dispatch({ type: "resizeSplit", workspaceId, path, index, delta, min }),
      equalizeSplit: (workspaceId, path) => dispatch({ type: "equalizeSplit", workspaceId, path }),
      minimizePane: (paneId) => dispatch({ type: "minimizePane", paneId }),
      restorePane: (paneId) => dispatch({ type: "restorePane", paneId }),
      renamePane: (paneId, title) => dispatch({ type: "renamePane", paneId, title }),
      setPaneColor: (paneId, color) => dispatch({ type: "setPaneColor", paneId, color }),
      setPaneFontSize: (paneId, fontSize) => dispatch({ type: "setPaneFontSize", paneId, fontSize })
```

Küçültmede süreç kapanmıyor: `release` ÇAĞRILMAZ.

`tests/terminalMode.test.tsx` ve `tests/terminalPaneView.test.tsx` içindeki `commandsMock()` `TerminalCommands`'ı tam kuruyor; typecheck yeni alanları isteyecek. İkisine de ekle:

```ts
    movePane: vi.fn(),
    resizeSplit: vi.fn(),
    equalizeSplit: vi.fn(),
    minimizePane: vi.fn(),
    restorePane: vi.fn(),
    renamePane: vi.fn(),
    setPaneColor: vi.fn(),
    setPaneFontSize: vi.fn()
```

`tests/terminalSidebar.test.tsx`'in `commandsMock()`'una da aynısı.

- [ ] **Adım 5: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalStore.test.tsx tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx tests/terminalSidebar.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS; "kayıtlı düzen geri getirilince aynısını yeniden yazmıyor" testi değişmeden geçiyor.

- [ ] **Adım 6: Commit**

```bash
git add src/stores/terminalStoreContext.ts
git add src/stores/terminalStore.tsx
git add tests/terminalStore.test.tsx
git add tests/terminalMode.test.tsx
git add tests/terminalPaneView.test.tsx
git add tests/terminalSidebar.test.tsx
git commit -m "Terminal: depoda bolme agaci komutlari; kayit imzasi agaci ve bolme ayarlarini kapsiyor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```


---

### Görev 7: Ağacı ekrana çizme — yer tutucular, ölçülen kutular, ayırıcılar

**Dosyalar:**
- Yeni: `src/terminal/dropZone.ts`
- Yeni: `src/terminal/LayoutView.tsx`
- Değişir: `src/terminal/TerminalMode.tsx` (`WorkspaceGrid`, `useRatios`, `edgeCalc`, `Divider` kalkar; yerine `WorkspaceLayout`)
- Test (yeni): `tests/terminalDropZone.test.ts`
- Test (değişir): `tests/terminalMode.test.tsx`

**Arayüzler:**
- Tüketir: Görev 3'ten `dragSizes`, `LayoutNode`, `LayoutPath`, `DropZone`; Görev 5'ten `layoutOf`, `minimizedOf`; Görev 6'dan `commands.resizeSplit`, `commands.equalizeSplit`, `commands.addPane(kind, cwd, split?)`.
- Üretir:

```ts
// dropZone.ts
export interface Box { left: number; top: number; width: number; height: number }
export const EDGE_SHARE = 0.25;
export function dropZone(box: Box, x: number, y: number): DropZone | null; // kutu dışı → null
export function zoneBox(box: Box, zone: DropZone): Box;                    // bırakma gölgesi

// LayoutView.tsx
export const GAP = 6;
export interface LayoutViewProps {
  layout: LayoutNode | null;
  dividers: boolean;                       // büyütülmüş bölme varken false
  onRects: (rects: Record<string, Box>) => void;
  onResize: (path: LayoutPath, index: number, delta: number, min: number) => void;
  onEqualize: (path: LayoutPath) => void;
  labels: { row: string; column: string }; // ayırıcıların erişilebilir adları
}
export default function LayoutView(props: LayoutViewProps): JSX.Element;
```

**Nasıl çalışıyor (spec §6.2):** `LayoutView` ağacı iç içe flex kaplarla çizer; yapraklar BOŞ `div[data-slot=<paneId>]`. Her çizimden sonra ve kap boyutu değişince yer tutucuların kaba göre kutuları ölçülür, değiştiyse `onRects` çağrılır. Bölmeler `TerminalMode`'da alan başına düz listede, `key={pane.id}` ile, bu kutulara `position: absolute` ile oturur. Ağaç ne kadar değişirse değişsin bölmenin React ağacındaki yeri değişmez → xterm yeniden kurulmaz.

Ayırıcı sürüklenirken pay önizlemesi `LayoutView`'ın kendi durumunda (her karede indirgeyiciye gitmez, diske yazılmaz); bırakınca tek `onResize`. Alt sınır payı `160 px / kabın boyu` (row) ya da `90 px / kabın boyu` (column).

- [ ] **Adım 1: Kırmızı test** — `tests/terminalDropZone.test.ts`

```ts
// Sürükle-bırak alanları (spec 2026-10-14 §3.4): kenarlar %25, ortası takas.
import { describe, expect, it } from "vitest";
import { dropZone, zoneBox } from "../src/terminal/dropZone";

const box = { left: 100, top: 50, width: 400, height: 200 };

describe("dropZone", () => {
  it("beş alan", () => {
    expect(dropZone(box, 110, 150)).toBe("left");
    expect(dropZone(box, 490, 150)).toBe("right");
    expect(dropZone(box, 300, 55)).toBe("top");
    expect(dropZone(box, 300, 245)).toBe("bottom");
    expect(dropZone(box, 300, 150)).toBe("center");
  });

  it("köşede en yakın kenar kazanıyor", () => {
    expect(dropZone(box, 104, 60)).toBe("left"); // sola 1%, üste 5%
    expect(dropZone(box, 140, 52)).toBe("top"); // sola 10%, üste 1%
  });

  it("kutu dışı ve boş kutu null", () => {
    expect(dropZone(box, 99, 150)).toBeNull();
    expect(dropZone(box, 300, 251)).toBeNull();
    expect(dropZone({ left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull();
  });
});

describe("zoneBox", () => {
  it("kenar yarım kutu, orta bütün kutu", () => {
    expect(zoneBox(box, "left")).toEqual({ left: 100, top: 50, width: 200, height: 200 });
    expect(zoneBox(box, "right")).toEqual({ left: 300, top: 50, width: 200, height: 200 });
    expect(zoneBox(box, "top")).toEqual({ left: 100, top: 50, width: 400, height: 100 });
    expect(zoneBox(box, "bottom")).toEqual({ left: 100, top: 150, width: 400, height: 100 });
    expect(zoneBox(box, "center")).toEqual(box);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalDropZone.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: `src/terminal/dropZone.ts`**

```ts
// Sürükle-bırakta hedef bölmenin hangi alanı (spec 2026-10-14 §3.4).
// Kenarlar bölmenin %25'i; köşede en yakın kenar; geri kalan orta (takas).
import type { DropZone } from "../../app-electron/shared/terminalTree";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const EDGE_SHARE = 0.25;

export function dropZone(box: Box, x: number, y: number): DropZone | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const fx = (x - box.left) / box.width;
  const fy = (y - box.top) / box.height;
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
  const edges: Array<[DropZone, number]> = [
    ["left", fx],
    ["right", 1 - fx],
    ["top", fy],
    ["bottom", 1 - fy]
  ];
  const near = edges.filter(([, d]) => d < EDGE_SHARE).sort((a, b) => a[1] - b[1]);
  return near[0]?.[0] ?? "center";
}

export function zoneBox(box: Box, zone: DropZone): Box {
  const halfW = box.width / 2;
  const halfH = box.height / 2;
  switch (zone) {
    case "left":
      return { ...box, width: halfW };
    case "right":
      return { ...box, left: box.left + halfW, width: halfW };
    case "top":
      return { ...box, height: halfH };
    case "bottom":
      return { ...box, top: box.top + halfH, height: halfH };
    case "center":
      return box;
  }
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalDropZone.test.ts`
Beklenen: PASS.

- [ ] **Adım 5: `src/terminal/LayoutView.tsx`**

```tsx
// Bölme ağacının yer tutucuları ve ayırıcıları (spec 2026-10-14 §3.3, §6.2).
// Terminaller burada DEĞİL: yer tutucuların ölçülen kutuları `onRects` ile
// yukarı veriliyor, bölmeler alan düzeyinde düz bir listede o kutulara
// oturuyor. Böylece ağaç değişince xterm yeniden kurulmuyor.
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent
} from "react";
import { dragSizes, type LayoutNode, type LayoutPath, type SplitDir } from "../../app-electron/shared/terminalTree";
import type { Box } from "./dropZone";

export const GAP = 6;
const KEY_STEP = 0.02;
// Bölme alt sınırı (spec §3.3): ~20 sütun × 5 satır, yazı boyutundan bağımsız.
const MIN_PX: Record<SplitDir, number> = { row: 160, column: 90 };

export interface LayoutViewProps {
  layout: LayoutNode | null;
  dividers: boolean;
  onRects: (rects: Record<string, Box>) => void;
  onResize: (path: LayoutPath, index: number, delta: number, min: number) => void;
  onEqualize: (path: LayoutPath) => void;
  labels: { row: string; column: string };
}

interface Preview {
  key: string;
  sizes: number[];
}

interface Ctx extends Omit<LayoutViewProps, "layout" | "onRects"> {
  preview: Preview | null;
  setPreview: (preview: Preview | null) => void;
}

export default function LayoutView({ layout, onRects, ...rest }: LayoutViewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const last = useRef("");
  const onRectsRef = useRef(onRects);
  onRectsRef.current = onRects;

  const measure = useRef(() => {
    const root = rootRef.current;
    if (!root) return;
    const base = root.getBoundingClientRect();
    const rects: Record<string, Box> = {};
    root.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
      const r = el.getBoundingClientRect();
      rects[el.dataset.slot as string] = { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
    });
    const key = JSON.stringify(rects);
    if (key === last.current) return;
    last.current = key;
    onRectsRef.current(rects);
  }).current;

  // Ağaç ya da önizleme değişince kutular da değişir: her çizimden sonra ölç.
  useLayoutEffect(() => measure());

  // Pencere/kenar çubuğu boyu değişince.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure]);

  const ctx: Ctx = { ...rest, preview, setPreview };
  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full min-w-0">
      {layout && <Node node={layout} path={[]} share={1} ctx={ctx} />}
    </div>
  );
}

function Node({ node, path, share, ctx }: { node: LayoutNode; path: LayoutPath; share: number; ctx: Ctx }) {
  const flex: CSSProperties = { flex: `${share} 1 0px`, minWidth: 0, minHeight: 0 };
  if (node.type === "pane") return <div data-slot={node.paneId} style={flex} />;
  const key = path.join(".");
  const sizes = ctx.preview?.key === key ? ctx.preview.sizes : node.sizes;
  return (
    <div data-split={node.dir} className={`flex ${node.dir === "row" ? "flex-row" : "flex-col"}`} style={flex}>
      {node.children.map((child, i) => (
        <Fragment key={i}>
          {i > 0 &&
            (ctx.dividers ? (
              <SplitDivider dir={node.dir} path={path} index={i - 1} sizes={sizes} ctx={ctx} />
            ) : (
              <div style={{ flex: `0 0 ${GAP}px` }} />
            ))}
          <Node node={child} path={[...path, i]} share={sizes[i]} ctx={ctx} />
        </Fragment>
      ))}
    </div>
  );
}

function SplitDivider({
  dir,
  path,
  index,
  sizes,
  ctx
}: {
  dir: SplitDir;
  path: LayoutPath;
  index: number;
  sizes: number[];
  ctx: Ctx;
}) {
  const drag = useRef<{ start: number; size: number; min: number; sizes: number[] } | null>(null);
  const key = path.join(".");
  const share = sizes.slice(0, index + 1).reduce((a, b) => a + b, 0);
  const coord = (e: PointerEvent) => (dir === "row" ? e.clientX : e.clientY);

  /** Kabın aralıklar düşülmüş boyu ve alt sınır payı. */
  const span = (el: HTMLElement) => {
    const parent = el.parentElement?.getBoundingClientRect();
    const total = parent ? (dir === "row" ? parent.width : parent.height) : 0;
    const size = total - GAP * (sizes.length - 1);
    return { size, min: size > 0 ? MIN_PX[dir] / size : 0 };
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const { size, min } = span(e.currentTarget);
    if (size <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { start: coord(e), size, min, sizes };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    ctx.setPreview({ key, sizes: dragSizes(d.sizes, index, (coord(e) - d.start) / d.size, d.min) });
  };

  const finish = (e: PointerEvent<HTMLDivElement>, commit: boolean) => {
    const d = drag.current;
    drag.current = null;
    ctx.setPreview(null);
    if (commit && d) ctx.onResize(path, index, (coord(e) - d.start) / d.size, d.min);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const back = dir === "row" ? "ArrowLeft" : "ArrowUp";
    const fwd = dir === "row" ? "ArrowRight" : "ArrowDown";
    if (e.key !== back && e.key !== fwd) return;
    e.preventDefault();
    ctx.onResize(path, index, e.key === fwd ? KEY_STEP : -KEY_STEP, span(e.currentTarget).min);
  };

  // Görünür çizgi yok; üstüne gelince vurgu rengi (eski ızgaradaki gibi).
  return (
    <div
      role="separator"
      aria-orientation={dir === "row" ? "vertical" : "horizontal"}
      aria-label={dir === "row" ? ctx.labels.row : ctx.labels.column}
      aria-valuenow={Math.round(share * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, true)}
      onPointerCancel={(e) => finish(e, false)}
      onKeyDown={onKeyDown}
      onDoubleClick={() => ctx.onEqualize(path)}
      className={`z-10 rounded-full outline-none transition-colors hover:bg-accent-400/40 focus-visible:bg-accent-400/60 ${
        dir === "row" ? "cursor-col-resize" : "cursor-row-resize"
      }`}
      style={{ flex: `0 0 ${GAP}px` }}
    />
  );
}
```

- [ ] **Adım 6: `tests/terminalMode.test.tsx` — kırmızı testler**

`EmbeddedTerminal` sahtesi mount sayacıyla değişir (dosyanın başındaki `vi.mock` yerine):

```tsx
// Taşımada xterm'in yeniden kurulmadığını saymak için (spec §6.2).
const mounts = vi.hoisted(() => ({ count: 0 }));
vi.mock("../src/components/EmbeddedTerminal", async () => {
  const { useEffect } = await vi.importActual<typeof import("react")>("react");
  return {
    default: function FakeTerminal({ sessionId, active }: { sessionId: string; active: boolean }) {
      useEffect(() => {
        mounts.count += 1;
      }, []);
      return <div data-testid={`xterm-${sessionId}`} data-active={String(active)} />;
    }
  };
});
```

Import'lara `import type { LayoutNode } from "../app-electron/shared/terminalTree";` eklenir ve dosyaya yardımcı:

```ts
const leaf = (paneId: string): LayoutNode => ({ type: "pane", paneId });
const split = (dir: "row" | "column", ids: string[], sizes?: number[]): LayoutNode => ({
  type: "split",
  dir,
  children: ids.map(leaf),
  sizes: sizes ?? ids.map(() => 1 / ids.length)
});
```

Değişen testler (eski gövdelerin yerine):

```tsx
  it("üst şerit: ad, sayı; + Bölme pencereyi açıyor ve odaktaki bölmeyi bölüyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.getByText("Alan a")).toBeTruthy();
    expect(screen.getByText("2 / 9 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bölme" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    // jsdom'da kutular 0×0: genişlik yükseklikten büyük değil → alta.
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", { targetPaneId: "a-p1", dir: "column" });
    expect(screen.queryByText("Yeni bölme")).toBeNull();
  });
```

```tsx
  it("3 bölme: solda tek, sağda üst üste iki yer tutucu (eski ızgaraya benzer)", () => {
    setup({ workspaces: [ws("a", 3)], activeWorkspaceId: "a" });
    const root = document.querySelector('[data-workspace="a"] [data-split="row"]') as HTMLElement;
    expect(root.querySelector(':scope > [data-slot="a-p1"]')).toBeTruthy();
    const right = root.querySelector(':scope > [data-split="column"]') as HTMLElement;
    expect([...right.querySelectorAll("[data-slot]")].map((el) => el.getAttribute("data-slot"))).toEqual(["a-p2", "a-p3"]);
  });
```

```tsx
  it("büyütme: ötekiler display none ama takılı, ayırıcı yok", () => {
    setup({ workspaces: [ws("a", 3, { maximizedPaneId: "a-p2" })], activeWorkspaceId: "a" });
    expect(cell("a-p1").style.display).toBe("none");
    expect(cell("a-p3").style.display).toBe("none");
    expect(screen.getByTestId("xterm-a-t1")).toBeTruthy();
    expect(cell("a-p2").style.left).toBe("0px");
    expect(cell("a-p2").style.right).toBe("0px");
    expect(screen.queryAllByRole("separator")).toHaveLength(0);
  });
```

```tsx
  it("ayırıcı: değer ağaçtaki paydan; ok tuşu ve çift tık komut gönderiyor", () => {
    const { commands } = setup({
      workspaces: [ws("a", 2, { layout: split("row", ["a-p1", "a-p2"], [0.7, 0.3]) })],
      activeWorkspaceId: "a"
    });
    const sep = screen.getByRole("separator", { name: "Sütun genişliği" });
    expect(sep.getAttribute("aria-valuenow")).toBe("70");
    fireEvent.keyDown(sep, { key: "ArrowRight" });
    expect(commands.resizeSplit).toHaveBeenCalledWith("a", [], 0, 0.02, expect.any(Number));
    fireEvent.keyDown(sep, { key: "ArrowUp" }); // yatay ayırıcıda dikey ok: yok sayılıyor
    expect(commands.resizeSplit).toHaveBeenCalledTimes(1);
    fireEvent.doubleClick(sep);
    expect(commands.equalizeSplit).toHaveBeenCalledWith("a", []);
  });

  it("4 bölme: iki satır kabında birer sütun ayırıcısı, kökte bir satır ayırıcısı", () => {
    setup({ workspaces: [ws("a", 4)], activeWorkspaceId: "a" });
    expect(screen.getAllByRole("separator", { name: "Sütun genişliği" })).toHaveLength(2);
    expect(screen.getAllByRole("separator", { name: "Satır yüksekliği" })).toHaveLength(1);
  });

  it("ağaç değişince (takas, yön, küçültme) xterm yeniden kurulmuyor (spec §6.2)", () => {
    const { rerender } = setup({ workspaces: [ws("a", 2, { layout: split("row", ["a-p1", "a-p2"]) })], activeWorkspaceId: "a" });
    const before = mounts.count;
    rerender({ workspaces: [ws("a", 2, { layout: split("column", ["a-p2", "a-p1"]) })], activeWorkspaceId: "a" });
    rerender({
      workspaces: [ws("a", 2, { layout: leaf("a-p1"), minimized: [{ paneId: "a-p2", home: null }] })],
      activeWorkspaceId: "a"
    });
    expect(mounts.count).toBe(before);
    expect(cell("a-p2").style.display).toBe("none");
    expect(screen.getByTestId("xterm-a-t2")).toBeTruthy();
  });
```

Eski "ayırıcı ok tuşlarıyla kayıyor; bölme sayısı değişince oranlar eşitleniyor" ve "4 bölme: bir sütun, bir satır ayırıcısı" testleri SİLİNİR (yerlerine yukarıdaki iki test). "tek bölmede ayırıcı ve büyüt düğmesi yok" testi aynen kalır.

Çalıştır: `npx vitest run tests/terminalMode.test.tsx`
Beklenen: yeni/değişen testler FAIL (`data-split` yok, `addPane` iki argümanla çağrılıyor).

- [ ] **Adım 7: `TerminalMode.tsx`**

Import'lar şöyle olur:

```tsx
import { useRef, useState, type CSSProperties } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { layoutOf } from "../stores/terminalReducer";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import { MAX_TERMINAL_PANES, TERMINAL_PANE_KINDS } from "../../app-electron/shared/terminalLayout";
import { leafIds, type SplitDir } from "../../app-electron/shared/terminalTree";
import { middleEllipsis } from "../lib/paths";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import TerminalPaneView from "./TerminalPaneView";
import NewPaneDialog, { KIND_LABEL } from "./NewPaneDialog";
import LayoutView from "./LayoutView";
import type { Box } from "./dropZone";
```

`GAP`, `KEY_STEP` sabitleri, `useRatios`, `WorkspaceGrid`, `edgeCalc`, `Divider` SİLİNİR. `gridLayout.ts` dosyası kalır (spec §6.1; `tests/terminalGrid.test.ts` onu sınıyor), yalnız buradan import edilmez.

Dosya başındaki yorumun altına tip:

```tsx
type PaneSplit = { targetPaneId: string; dir: SplitDir };
```

`TerminalMode` gövdesinde `dialogOpen` durumu şöyle olur:

```tsx
  // Açıkken hangi bölmenin bölüneceği (yoksa odaktakinin sağı).
  const [dialog, setDialog] = useState<{ split?: PaneSplit } | null>(null);
  // Alan başına son ölçülen bölme kutuları: "Bölme" düğmesi uzun kenardan
  // bölsün diye (spec §3.2).
  const rects = useRef<Record<string, Record<string, Box>>>({});
```

`if (state.phase === "closed") return null;` satırından sonra:

```tsx
  const splitFor = (w: TerminalWorkspace): PaneSplit | undefined => {
    const target = w.focusedPaneId;
    if (!target || !leafIds(layoutOf(w)).includes(target)) return undefined;
    const box = rects.current[w.id]?.[target];
    return { targetPaneId: target, dir: box && box.width > box.height ? "row" : "column" };
  };
```

Üst şeritteki düğme: `onClick={() => setDialog({ split: splitFor(active) })}`.

Alan gövdesi:

```tsx
            {w.panes.length === 0 ? (
              <EmptyWorkspace defaultCwd={defaultCwd} onPick={(kind, cwd) => commands.addPane(kind, cwd)} />
            ) : (
              <WorkspaceLayout
                workspace={w}
                focusable={state.visible && w.id === state.activeWorkspaceId}
                onRects={(next) => {
                  rects.current[w.id] = next;
                }}
              />
            )}
```

Pencere:

```tsx
      <NewPaneDialog
        open={dialog !== null}
        defaultKind={defaultKind}
        defaultCwd={defaultCwd}
        onOpen={(kind, cwd) => {
          const split = dialog?.split;
          setDialog(null);
          commands.addPane(kind, cwd, split);
        }}
        onCancel={() => setDialog(null)}
      />
```

`EmptyWorkspace`'in altına (silinen ızgara kodunun yerine):

```tsx
/**
 * Bölmenin yeri. Bölmeler ağaçtan bağımsız, `paneId` anahtarıyla bir kez
 * çiziliyor; ağaç yalnız kutuyu veriyor (spec §6.2). Ağaçta olmayan
 * (küçültülmüş) ya da başka bölme büyütülmüşken gizli ama takılı.
 */
function paneStyle(paneId: string, visible: readonly string[], maximized: string | null, rects: Record<string, Box>): CSSProperties {
  if (maximized === paneId) return { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 };
  const box = rects[paneId];
  if (maximized || !visible.includes(paneId) || !box) return { display: "none" };
  return { position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height };
}

function WorkspaceLayout({
  workspace,
  focusable,
  onRects
}: {
  workspace: TerminalWorkspace;
  focusable: boolean;
  onRects: (rects: Record<string, Box>) => void;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const [rects, setRects] = useState<Record<string, Box>>({});
  const layout = layoutOf(workspace);
  const visible = leafIds(layout);
  const maximized = workspace.maximizedPaneId;

  return (
    <div className="relative h-full min-h-0">
      <LayoutView
        layout={layout}
        dividers={!maximized}
        onRects={(next) => {
          setRects(next);
          onRects(next);
        }}
        onResize={(path, index, delta, min) => commands.resizeSplit(workspace.id, path, index, delta, min)}
        onEqualize={(path) => commands.equalizeSplit(workspace.id, path)}
        labels={{ row: t("terminal.resizeColumns"), column: t("terminal.resizeRows") }}
      />
      {workspace.panes.map((pane) => (
        <div key={pane.id} data-pane={pane.id} className="min-h-0 min-w-0" style={paneStyle(pane.id, visible, maximized, rects)}>
          <TerminalPaneView
            pane={pane}
            active={focusable && workspace.focusedPaneId === pane.id}
            canMaximize={visible.length > 1}
            maximized={maximized === pane.id}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Adım 8: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalMode.test.tsx tests/terminalDropZone.test.ts tests/terminalPaneView.test.tsx tests/terminalGrid.test.ts` ve `npm run typecheck`
Beklenen: hepsi PASS.

- [ ] **Adım 9: Commit**

```bash
git add src/terminal/dropZone.ts
git add src/terminal/LayoutView.tsx
git add src/terminal/TerminalMode.tsx
git add tests/terminalDropZone.test.ts
git add tests/terminalMode.test.tsx
git commit -m "Terminal: izgara yerine bolme agaci; bolmeler olculen kutulara oturuyor, xterm yeniden kurulmuyor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 8: Başlıktan sürükle-bırak — beş alan, gölge, Esc, 4 px eşiği

**Dosyalar:**
- Yeni: `src/terminal/usePaneDrag.ts`
- Değişir: `src/terminal/TerminalMode.tsx` (`WorkspaceLayout`)
- Değişir: `src/terminal/TerminalPaneView.tsx` (başlık tutamak olur)
- Test (yeni): `tests/terminalPaneDrag.test.tsx`
- Test (değişir): `tests/terminalPaneView.test.tsx`

**Arayüzler:**
- Tüketir: Görev 7'den `Box`, `dropZone`, `zoneBox`; Görev 6'dan `commands.movePane`; Görev 5'ten `layoutOf`.
- Üretir:

```ts
// usePaneDrag.ts
export const DRAG_THRESHOLD = 4;
export interface PaneDrag { paneId: string; active: boolean; target: string | null; zone: DropZone | null }
export function usePaneDrag(opts: {
  containerRef: RefObject<HTMLElement | null>;
  rectsRef: RefObject<Record<string, Box>>;        // kaba göre son ölçülen kutular
  canDrop: (paneId: string, targetId: string) => boolean; // bırakma anındaki EN SON durum
  onDrop: (paneId: string, targetId: string, zone: DropZone) => void;
}): { drag: PaneDrag | null; start: (paneId: string, e: ReactPointerEvent) => void };

// TerminalPaneView'e yeni isteğe bağlı prop'lar
onDragStart?: (e: ReactPointerEvent<HTMLDivElement>) => void; // yoksa başlık sürüklenmez
dragging?: boolean;                                            // sürüklenen bölme soluk
```

**Kurallar (spec §3.4):** sol tuşla başlıktan (düğme ve giriş kutusu hariç) tutulur. 4 px'ten az hareket sürükleme değildir (tıklama odak vermeye devam eder). Hedef, imlecin altındaki görünür bölme; alan `dropZone`. Kendi üstü hedef sayılmaz. Esc ve `pointercancel` iptal eder. Bırakırken `canDrop` en son durumla yeniden sorulur: sürükleme sırasında kaynak ya da hedef kapandı/küçültüldüyse hiçbir şey olmaz (inceleme odağı 4). Büyütülmüş bölme varken ya da tek görünür bölmede sürükleme kapalı.

**Spec'ten sapma (Esc):** spec §4 "Esc büyütmeyi de geri alır" diyor. Esc terminaldeki programa gidiyor (axet-code TUI iptal, vim); pencere düzeyinde yakalanırsa onları bozar. Bu planda Esc YALNIZ sürükleme sürerken yakalanır; büyütmeden çıkış başlıktaki düğmeyle. Karar kullanıcıya plan teslimde soruluyor; değişirse bu görev güncellenir.

- [ ] **Adım 1: Kırmızı test** — `tests/terminalPaneDrag.test.tsx`

```tsx
// @vitest-environment jsdom
// Başlıktan sürükle-bırak (spec 2026-10-14 §3.4).
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { usePaneDrag } from "../src/terminal/usePaneDrag";
import type { Box } from "../src/terminal/dropZone";

afterEach(cleanup);

// jsdom'da PointerEvent'e güvenmemek için: clientX/clientY taşıyan MouseEvent,
// tür adı pointer*. React 18 de pencere dinleyicisi de bunu pointer olayı sayıyor.
function pointer(target: EventTarget, type: string, x: number, y: number) {
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  });
}

const RECTS: Record<string, Box> = {
  a: { left: 0, top: 0, width: 100, height: 100 },
  b: { left: 110, top: 0, width: 100, height: 100 }
};

function Harness({ onDrop, canDrop = () => true }: { onDrop: (...args: unknown[]) => void; canDrop?: (a: string, b: string) => boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef(RECTS);
  const { drag, start } = usePaneDrag({ containerRef, rectsRef, canDrop, onDrop });
  return (
    <div ref={containerRef}>
      <div data-testid="handle" onPointerDown={(e) => start("a", e)} />
      <output data-testid="state">{drag ? `${drag.active}:${drag.target}:${drag.zone}` : "yok"}</output>
    </div>
  );
}

const state = () => screen.getByTestId("state").textContent;

describe("usePaneDrag", () => {
  it("4 px'ten az hareket sürükleme değil", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 52, 12);
    expect(state()).toBe("false:null:null");
    pointer(window, "pointerup", 52, 12);
    expect(state()).toBe("yok");
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("hedefin ortası takas, kenarı kenar", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 160, 50);
    expect(state()).toBe("true:b:center");
    pointer(window, "pointermove", 115, 50);
    expect(state()).toBe("true:b:left");
    pointer(window, "pointerup", 115, 50);
    expect(onDrop).toHaveBeenCalledWith("a", "b", "left");
    expect(state()).toBe("yok");
  });

  it("kendi üstüne ve boşluğa bırakma bir şey yapmıyor", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 60, 60);
    expect(state()).toBe("true:null:null");
    pointer(window, "pointermove", 105, 50); // aralık
    pointer(window, "pointerup", 105, 50);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("Esc iptal ediyor; sonraki bırakma bir şey yapmıyor", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 160, 50);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(state()).toBe("yok");
    pointer(window, "pointerup", 160, 50);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("bırakırken hedef artık yoksa bir şey yapmıyor (inceleme odağı 4)", () => {
    const onDrop = vi.fn();
    render(<Harness onDrop={onDrop} canDrop={() => false} />);
    pointer(screen.getByTestId("handle"), "pointerdown", 50, 10);
    pointer(window, "pointermove", 160, 50);
    pointer(window, "pointerup", 160, 50);
    expect(onDrop).not.toHaveBeenCalled();
  });
});
```

`tests/terminalPaneView.test.tsx` — `renderPane`'in `opts`'una `onDragStart?: () => void` eklenir ve `<TerminalPaneView ... onDragStart={opts.onDragStart} />` olarak geçirilir; dosyaya:

```tsx
  it("başlıktan tutunca sürükleme başlıyor, düğmeden tutunca başlamıyor", () => {
    const onDragStart = vi.fn();
    renderPane({ state: "running", ptyId: "t1" }, { onDragStart, canMaximize: true });
    fireEvent.pointerDown(screen.getByText("cmd"), { button: 0 });
    expect(onDragStart).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Büyüt" }), { button: 0 });
    expect(onDragStart).toHaveBeenCalledTimes(1);
  });
```

(`terminal.kindCmd` = "cmd"; başlıktaki tür etiketi CSS ile büyük harf görünür ama metni "cmd".)

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/terminalPaneDrag.test.tsx tests/terminalPaneView.test.tsx`
Beklenen: FAIL — `usePaneDrag` modülü yok; `onDragStart` çağrılmıyor.

- [ ] **Adım 3: `src/terminal/usePaneDrag.ts`**

```ts
// Bölmeyi başlığından sürükleyip başka bölmenin kenarına/ortasına bırakma
// (spec 2026-10-14 §3.4). Olaylar pencerede dinleniyor: imleç bölmeden
// çıksa da sürükleme sürüyor. Esc yalnız sürükleme sürerken yakalanıyor;
// öteki zamanlarda terminaldeki programındır.
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { DropZone } from "../../app-electron/shared/terminalTree";
import { dropZone, type Box } from "./dropZone";

export const DRAG_THRESHOLD = 4;

export interface PaneDrag {
  paneId: string;
  active: boolean;
  target: string | null;
  zone: DropZone | null;
}

export function usePaneDrag(opts: {
  containerRef: RefObject<HTMLElement | null>;
  rectsRef: RefObject<Record<string, Box>>;
  canDrop: (paneId: string, targetId: string) => boolean;
  onDrop: (paneId: string, targetId: string, zone: DropZone) => void;
}): { drag: PaneDrag | null; start: (paneId: string, e: ReactPointerEvent) => void } {
  const [drag, setDrag] = useState<PaneDrag | null>(null);
  const dragRef = useRef<PaneDrag | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const update = (next: PaneDrag | null) => {
    dragRef.current = next;
    if (!next) origin.current = null;
    setDrag(next);
  };

  const start = useCallback((paneId: string, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    origin.current = { x: e.clientX, y: e.clientY };
    update({ paneId, active: false, target: null, zone: null });
  }, []);

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      const o = origin.current;
      if (!d || !o) return;
      if (!d.active && Math.hypot(e.clientX - o.x, e.clientY - o.y) < DRAG_THRESHOLD) return;
      const base = optsRef.current.containerRef.current?.getBoundingClientRect();
      let target: string | null = null;
      let zone: DropZone | null = null;
      if (base) {
        const x = e.clientX - base.left;
        const y = e.clientY - base.top;
        for (const [id, box] of Object.entries(optsRef.current.rectsRef.current ?? {})) {
          const z = dropZone(box, x, y);
          if (z) {
            target = id;
            zone = z;
            break;
          }
        }
      }
      // Kendi üstü hedef değil: bırakılırsa iptal.
      if (target === d.paneId) {
        target = null;
        zone = null;
      }
      if (d.active && d.target === target && d.zone === zone) return;
      update({ ...d, active: true, target, zone });
    };
    const up = () => {
      const d = dragRef.current;
      update(null);
      if (d?.active && d.target && d.zone && optsRef.current.canDrop(d.paneId, d.target)) {
        optsRef.current.onDrop(d.paneId, d.target, d.zone);
      }
    };
    const cancel = () => update(null);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      update(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key, true);
    };
  }, [dragging]);

  return { drag, start };
}
```

- [ ] **Adım 4: `TerminalPaneView.tsx` — başlık tutamak**

Import'a `type PointerEvent as ReactPointerEvent` eklenir (`import { useState, type PointerEvent as ReactPointerEvent } from "react";`). Prop'lar:

```tsx
export default function TerminalPaneView({
  pane,
  active,
  canMaximize,
  maximized,
  onDragStart,
  dragging = false
}: {
  pane: TerminalPane;
  active: boolean;
  canMaximize: boolean;
  maximized: boolean;
  /** Yoksa başlık sürüklenmiyor (tek bölme, büyütülmüş). */
  onDragStart?: (e: ReactPointerEvent<HTMLDivElement>) => void;
  dragging?: boolean;
}) {
```

Kök `div`'in sınıfına `${dragging ? "opacity-50" : ""}` eklenir. Başlık şeridi `div`'i:

```tsx
      <div
        onPointerDown={(e) => {
          // Düğmeler ve ad kutusu kendi işini yapsın.
          if (!onDragStart || (e.target as HTMLElement).closest("button, input")) return;
          onDragStart(e);
        }}
        className={`flex h-7 shrink-0 items-center gap-2 border-b border-line px-2 ${onDragStart ? "cursor-grab" : ""}`}
      >
```

- [ ] **Adım 5: `TerminalMode.tsx` — `WorkspaceLayout` sürüklemeyi bağlıyor**

Import'lara: `import type { DropZone } from "../../app-electron/shared/terminalTree";` (mevcut `leafIds, type SplitDir` satırına eklenir), `import { usePaneDrag } from "./usePaneDrag";`, `import { zoneBox } from "./dropZone";` (mevcut `type Box` satırıyla birleşir: `import { zoneBox, type Box } from "./dropZone";`).

`WorkspaceLayout` gövdesi şöyle olur:

```tsx
  const t = useT();
  const { commands } = useTerminalStore();
  const [rects, setRects] = useState<Record<string, Box>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef(rects);
  rectsRef.current = rects;
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const layout = layoutOf(workspace);
  const visible = leafIds(layout);
  const maximized = workspace.maximizedPaneId;

  const { drag, start } = usePaneDrag({
    containerRef,
    rectsRef,
    // Bırakma anındaki durum: sürüklerken kapanan/küçültülen bölmeye bırakılmıyor.
    canDrop: (paneId, targetId) => {
      const now = leafIds(layoutOf(workspaceRef.current));
      return now.includes(paneId) && now.includes(targetId);
    },
    onDrop: (paneId: string, targetId: string, zone: DropZone) => commands.movePane(paneId, targetId, zone)
  });
  const canDrag = !maximized && visible.length > 1;
  const ghost = drag?.active && drag.target && drag.zone && rects[drag.target] ? zoneBox(rects[drag.target], drag.zone) : null;

  return (
    <div ref={containerRef} className="relative h-full min-h-0">
      <LayoutView
        layout={layout}
        dividers={!maximized}
        onRects={(next) => {
          setRects(next);
          onRects(next);
        }}
        onResize={(path, index, delta, min) => commands.resizeSplit(workspace.id, path, index, delta, min)}
        onEqualize={(path) => commands.equalizeSplit(workspace.id, path)}
        labels={{ row: t("terminal.resizeColumns"), column: t("terminal.resizeRows") }}
      />
      {workspace.panes.map((pane) => (
        <div key={pane.id} data-pane={pane.id} className="min-h-0 min-w-0" style={paneStyle(pane.id, visible, maximized, rects)}>
          <TerminalPaneView
            pane={pane}
            active={focusable && workspace.focusedPaneId === pane.id}
            canMaximize={visible.length > 1}
            maximized={maximized === pane.id}
            onDragStart={canDrag ? (e) => start(pane.id, e) : undefined}
            dragging={drag?.active === true && drag.paneId === pane.id}
          />
        </div>
      ))}
      {ghost && (
        <div
          data-drop-ghost={drag?.zone ?? ""}
          className="pointer-events-none absolute z-20 rounded-md border border-accent-400/70 bg-accent-400/15 transition-all duration-75"
          style={{ left: ghost.left, top: ghost.top, width: ghost.width, height: ghost.height }}
        />
      )}
    </div>
  );
```

Sürükleme sürerken xterm'ler imleci yakalamasın diye: `drag?.active` iken bölme sarmalayıcılarına `pointer-events: none` verilmez — olaylar pencerede dinlendiği için gerek yok; seçim kaymasını önlemek için `start` içinde `e.preventDefault()` ÇAĞRILMAZ (tıklama odağı bozulur). Metin seçimi sorun olursa gözle kontrolde not edilir.

- [ ] **Adım 6: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalPaneDrag.test.tsx tests/terminalPaneView.test.tsx tests/terminalMode.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS.

- [ ] **Adım 7: Commit**

```bash
git add src/terminal/usePaneDrag.ts
git add src/terminal/TerminalPaneView.tsx
git add src/terminal/TerminalMode.tsx
git add tests/terminalPaneDrag.test.tsx
git add tests/terminalPaneView.test.tsx
git commit -m "Terminal: bolmeyi basligindan surukleyip kenara ya da ortaya birakma, golge, Esc iptal" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 9: Bölme başlığı (ad, renk, böl, şeride indir) ve küçültülenler şeridi

**Dosyalar:**
- Yeni: `src/terminal/paneColors.ts`
- Değişir: `src/terminal/TerminalPaneView.tsx`
- Değişir: `src/terminal/TerminalMode.tsx`
- Değişir: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test (değişir): `tests/terminalPaneView.test.tsx`, `tests/terminalMode.test.tsx`

**Arayüzler:**
- Tüketir: Görev 4'ten `TERMINAL_PANE_COLORS`, `PANE_TITLE_MAX`, `TerminalPaneColor`; Görev 5'ten `minimizedOf`, `layoutOf`; Görev 6'dan `commands.renamePane`, `setPaneColor`, `minimizePane`, `restorePane`, `addPane(kind, cwd, split)`; Görev 7–8'in `WorkspaceLayout`'u ve `dialog` durumu.
- Üretir:

```ts
// paneColors.ts
export const PANE_COLOR_VAR: Record<TerminalPaneColor, string | null>; // gray → null (renksiz)
export const PANE_COLOR_LABEL: Record<TerminalPaneColor, TranslationKey>;

// TerminalPaneView yeni isteğe bağlı prop'lar
onSplit?: (dir: SplitDir) => void; // yoksa böl düğmeleri yok
canSplit?: boolean;                 // false → böl düğmeleri kapalı, ipucu "En fazla 9 bölme" (varsayılan true)
```

**Renkler (spec §4):** sabit hex yok; mevcut tema jetonları: `blue` → `--status-info-text`, `green` → `--status-success-text`, `amber` → `--status-warning-text`, `red` → `--status-danger-text`, `violet` → `--project-soft-text` (koyu ve açık temada tanımlı). `index.css` DEĞİŞMEZ.

**"Küçült" adı:** `terminal.unmaximize` zaten "Küçült" (büyütmeden çıkış). Karışmasın diye yeni düğme "Şeride indir".

- [ ] **Adım 1: Metinler** — `src/i18n/tr.ts`'te `"terminal.resizeRows": "Satır yüksekliği"` satırının sonuna virgül konur, altına:

```ts
  "terminal.splitRight": "Sağa böl",
  "terminal.splitDown": "Alta böl",
  "terminal.minimize": "Şeride indir",
  "terminal.restorePane": "Geri getir",
  "terminal.minimizedStrip": "Şeritteki bölmeler",
  "terminal.paneName": "Bölme adı",
  "terminal.renameHint": "Adı değiştirmek için çift tıkla",
  "terminal.paneColor": "Renk",
  "terminal.colorGray": "Renksiz",
  "terminal.colorBlue": "Mavi",
  "terminal.colorGreen": "Yeşil",
  "terminal.colorAmber": "Kehribar",
  "terminal.colorRed": "Kırmızı",
  "terminal.colorViolet": "Mor"
```

`src/i18n/en.ts`'te `"terminal.resizeRows": "Row height"` satırının sonuna virgül, altına:

```ts
  "terminal.splitRight": "Split right",
  "terminal.splitDown": "Split down",
  "terminal.minimize": "Minimize to strip",
  "terminal.restorePane": "Restore",
  "terminal.minimizedStrip": "Minimized panes",
  "terminal.paneName": "Pane name",
  "terminal.renameHint": "Double-click to rename",
  "terminal.paneColor": "Color",
  "terminal.colorGray": "No color",
  "terminal.colorBlue": "Blue",
  "terminal.colorGreen": "Green",
  "terminal.colorAmber": "Amber",
  "terminal.colorRed": "Red",
  "terminal.colorViolet": "Violet"
```

- [ ] **Adım 2: Kırmızı test** — `tests/terminalPaneView.test.tsx`

`renderPane`'in `opts`'u genişler ve bölme/prop'lara geçirilir:

```tsx
function renderPane(
  run: PaneRun,
  opts: {
    kind?: TerminalPaneKind;
    cwd?: string;
    active?: boolean;
    canMaximize?: boolean;
    maximized?: boolean;
    title?: string;
    color?: TerminalPaneColor;
    onDragStart?: () => void;
    onSplit?: (dir: "row" | "column") => void;
    canSplit?: boolean;
  } = {}
) {
  const commands = commandsMock();
  const pane: TerminalPane = { id: "p1", kind: opts.kind ?? "cmd", cwd: opts.cwd ?? "C:\\a", run, title: opts.title, color: opts.color };
  // ... render içinde TerminalPaneView'e ek olarak:
  //   onDragStart={opts.onDragStart} onSplit={opts.onSplit} canSplit={opts.canSplit}
```

(`TerminalPaneColor` için `import type { TerminalPaneColor, TerminalPaneKind } from "../app-electron/shared/types";`. `renderPane`'in geri kalanı aynen kalır; `commands`'ı döndürüyor.)

Yeni testler:

```tsx
describe("başlık: ad, renk, böl, şeride indir (spec 2026-10-14 §4)", () => {
  it("ad yoksa tür; çift tık düzenliyor, Enter kaydediyor", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" });
    fireEvent.doubleClick(screen.getByText("cmd"));
    const input = screen.getByRole("textbox", { name: "Bölme adı" }) as HTMLInputElement;
    expect(input.maxLength).toBe(40);
    fireEvent.change(input, { target: { value: "derleme" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(commands.renamePane).toHaveBeenCalledWith("p1", "derleme");
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("Esc vazgeçiyor", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" }, { title: "derleme" });
    fireEvent.doubleClick(screen.getByText("derleme"));
    const input = screen.getByRole("textbox", { name: "Bölme adı" });
    fireEvent.change(input, { target: { value: "başka" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(commands.renamePane).not.toHaveBeenCalled();
    expect(screen.getByText("derleme")).toBeTruthy();
  });

  it("renk seçici altı renk; seçince komut, başlıkta şerit", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" }, { color: "blue" });
    const header = screen.getByText("cmd").closest("[data-pane-header]") as HTMLElement;
    expect(header.style.boxShadow).toContain("var(--status-info-text)");
    fireEvent.click(screen.getByRole("button", { name: "Renk" }));
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(6);
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Mor" }));
    expect(commands.setPaneColor).toHaveBeenCalledWith("p1", "violet");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("böl düğmeleri yönü veriyor; sınırda kapalı", () => {
    const onSplit = vi.fn();
    renderPane({ state: "running", ptyId: "t1" }, { onSplit });
    fireEvent.click(screen.getByRole("button", { name: "Sağa böl" }));
    fireEvent.click(screen.getByRole("button", { name: "Alta böl" }));
    expect(onSplit.mock.calls).toEqual([["row"], ["column"]]);
    cleanup();
    renderPane({ state: "running", ptyId: "t1" }, { onSplit, canSplit: false });
    const right = screen.getByRole("button", { name: "Sağa böl" }) as HTMLButtonElement;
    expect(right.disabled).toBe(true);
    expect(right.title).toBe("En fazla 9 bölme");
  });

  it("şeride indir", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" });
    fireEvent.click(screen.getByRole("button", { name: "Şeride indir" }));
    expect(commands.minimizePane).toHaveBeenCalledWith("p1");
  });
});
```

Çalıştır: `npx vitest run tests/terminalPaneView.test.tsx`
Beklenen: yeni testler FAIL (düğmeler yok).

- [ ] **Adım 3: `src/terminal/paneColors.ts`**

```ts
// Bölme renkleri (spec 2026-10-14 §4). Sabit hex yok: tema jetonları, koyu ve
// açık temada ayrı tanımlı. `gray` = renksiz (şerit yok, nokta boş).
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";

export const PANE_COLOR_VAR: Record<TerminalPaneColor, string | null> = {
  gray: null,
  blue: "var(--status-info-text)",
  green: "var(--status-success-text)",
  amber: "var(--status-warning-text)",
  red: "var(--status-danger-text)",
  violet: "var(--project-soft-text)"
};

export const PANE_COLOR_LABEL: Record<TerminalPaneColor, TranslationKey> = {
  gray: "terminal.colorGray",
  blue: "terminal.colorBlue",
  green: "terminal.colorGreen",
  amber: "terminal.colorAmber",
  red: "terminal.colorRed",
  violet: "terminal.colorViolet"
};
```

(`NewPaneDialog.tsx`'in `TranslationKey`'i nereden aldığına bak; yol farklıysa onu kullan.)

- [ ] **Adım 4: `TerminalPaneView.tsx`**

Import'lar:

```tsx
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Columns2, Maximize2, Minimize2, Minus, RotateCw, Rows2, X } from "lucide-react";
import { PANE_TITLE_MAX, TERMINAL_PANE_COLORS } from "../../app-electron/shared/terminalLayout";
import type { SplitDir } from "../../app-electron/shared/terminalTree";
import { PANE_COLOR_LABEL, PANE_COLOR_VAR } from "./paneColors";
```

(mevcut import'lar kalır.) Prop listesine `onSplit`, `canSplit = true` eklenir:

```tsx
  /** Yoksa böl düğmeleri yok. */
  onSplit?: (dir: SplitDir) => void;
  /** 9 bölmede false: düğmeler kapalı. */
  canSplit?: boolean;
```

Bileşenin başına (mevcut `useState`'lerin yanına):

```tsx
  const [editing, setEditing] = useState(false);
  // Escape blur'u da tetikliyor; blur kaydetmesin.
  const skipCommit = useRef(false);
  const [picker, setPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const colorVar = PANE_COLOR_VAR[pane.color ?? "gray"];
  const kindLabel = t(KIND_LABEL[pane.kind]);

  // Seçici dışına tıklayınca kapanıyor.
  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPicker(false);
    };
    window.addEventListener("mousedown", close, true);
    return () => window.removeEventListener("mousedown", close, true);
  }, [picker]);
```

Başlık şeridi (Görev 8'deki `onPointerDown`'lı `div`) şöyle olur — `data-pane-header` ve renk şeridi eklenir, tür etiketi span'i ad/düzenleme ile değişir, renk noktası ve yeni düğmeler gelir:

```tsx
      <div
        data-pane-header=""
        onPointerDown={(e) => {
          if (!onDragStart || (e.target as HTMLElement).closest("button, input")) return;
          onDragStart(e);
        }}
        style={colorVar ? { boxShadow: `inset 3px 0 0 ${colorVar}` } : undefined}
        className={`flex h-7 shrink-0 items-center gap-2 border-b border-line px-2 ${onDragStart ? "cursor-grab" : ""}`}
      >
        <span data-tone={tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_CLASS[tone]}`} />
        <div ref={pickerRef} className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setPicker((open) => !open)}
            aria-expanded={picker}
            title={t("terminal.paneColor")}
            aria-label={t("terminal.paneColor")}
            className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/5"
          >
            <span className="h-2 w-2 rounded-full border border-line" style={{ background: colorVar ?? "transparent" }} />
          </button>
          {picker && (
            <div role="menu" className="absolute left-0 top-5 z-30 flex gap-1 rounded-md border border-line bg-card p-1.5 shadow-lg">
              {TERMINAL_PANE_COLORS.map((c) => {
                const selected = (pane.color ?? "gray") === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    title={t(PANE_COLOR_LABEL[c])}
                    aria-label={t(PANE_COLOR_LABEL[c])}
                    onClick={() => {
                      commands.setPaneColor(pane.id, c);
                      setPicker(false);
                    }}
                    className={`h-4 w-4 rounded-full border ${selected ? "border-accent-400" : "border-line"}`}
                    style={{ background: PANE_COLOR_VAR[c] ?? "transparent" }}
                  />
                );
              })}
            </div>
          )}
        </div>
        {editing ? (
          <input
            autoFocus
            defaultValue={pane.title ?? ""}
            placeholder={kindLabel}
            maxLength={PANE_TITLE_MAX}
            aria-label={t("terminal.paneName")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                skipCommit.current = true;
                e.currentTarget.blur();
              }
            }}
            onBlur={(e) => {
              if (!skipCommit.current) commands.renamePane(pane.id, e.currentTarget.value);
              skipCommit.current = false;
              setEditing(false);
            }}
            className="h-5 w-32 min-w-0 rounded border border-line bg-transparent px-1 font-mono text-2xs text-slate-200 outline-none focus:border-accent-500/60"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            title={t("terminal.renameHint")}
            className={`max-w-[12rem] shrink-0 truncate font-mono text-2xs font-medium tracking-[0.08em] text-slate-300 ${
              pane.title ? "" : "uppercase"
            }`}
          >
            {pane.title ?? kindLabel}
          </span>
        )}
        <span title={pane.cwd} className="min-w-0 flex-1 truncate font-mono text-2xs text-slate-500">
          {middleEllipsis(pane.cwd, 40)}
        </span>
        {onSplit && (
          <>
            <button
              type="button"
              disabled={!canSplit}
              onClick={() => onSplit("row")}
              title={canSplit ? t("terminal.splitRight") : t("terminal.paneMax")}
              aria-label={t("terminal.splitRight")}
              className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
            >
              <Columns2 size={12} />
            </button>
            <button
              type="button"
              disabled={!canSplit}
              onClick={() => onSplit("column")}
              title={canSplit ? t("terminal.splitDown") : t("terminal.paneMax")}
              aria-label={t("terminal.splitDown")}
              className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
            >
              <Rows2 size={12} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => commands.minimizePane(pane.id)}
          title={t("terminal.minimize")}
          aria-label={t("terminal.minimize")}
          className={GHOST_ICON_BUTTON}
        >
          <Minus size={12} />
        </button>
        {/* büyüt, yeniden başlat, kapat düğmeleri AYNEN */}
```

Bölme dar olunca (160 px) yol metni (`flex-1 truncate`) önce kısalıyor; düğmeler `GHOST_ICON_BUTTON` ile sabit. Gözle kontrolde sığmazsa not edilir; bu görevde düğme gizleme yok.

- [ ] **Adım 5: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalPaneView.test.tsx` ve `npm run typecheck`
Beklenen: PASS.

- [ ] **Adım 6: Kırmızı test** — `tests/terminalMode.test.tsx` (ana `describe`'ın sonuna)

```tsx
  it("şerit: küçültülen bölme sekme olarak, okunmadı noktasıyla; tıklayınca geri geliyor", () => {
    const { commands } = setup({
      workspaces: [ws("a", 2, { layout: leaf("a-p1"), minimized: [{ paneId: "a-p2", home: null, unread: true }] })],
      activeWorkspaceId: "a"
    });
    const strip = screen.getByRole("toolbar", { name: "Şeritteki bölmeler" });
    const tab = strip.querySelector('[data-minimized="a-p2"]') as HTMLElement;
    expect(tab.textContent).toContain("cmd");
    expect(tab.querySelector("[data-unread]")).toBeTruthy();
    fireEvent.click(tab);
    expect(commands.restorePane).toHaveBeenCalledWith("a-p2");
  });

  it("şerit yoksa çizilmiyor", () => {
    setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.queryByRole("toolbar", { name: "Şeritteki bölmeler" })).toBeNull();
  });

  it("hepsi küçültülünce boş-durum metni, xterm'ler takılı, ekleme çalışıyor (inceleme odağı 3)", () => {
    const { commands } = setup({
      workspaces: [
        ws("a", 2, {
          layout: null,
          focusedPaneId: null,
          minimized: [
            { paneId: "a-p1", home: null },
            { paneId: "a-p2", home: null }
          ]
        })
      ],
      activeWorkspaceId: "a"
    });
    expect(screen.getByText("Bu alanda terminal yok")).toBeTruthy();
    expect(screen.getByTestId("xterm-a-t1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "PowerShell" }));
    expect(commands.addPane).toHaveBeenCalledWith("powershell", "C:\\a");
  });

  it("başlıktaki Sağa böl pencereyi açıyor, o bölmeyi sağdan bölüyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    const pane2 = cell("a-p2");
    fireEvent.click(pane2.querySelector('[aria-label="Sağa böl"]') as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", { targetPaneId: "a-p2", dir: "row" });
  });

  it("9 bölmede böl düğmeleri kapalı", () => {
    setup({ workspaces: [ws("a", 9)], activeWorkspaceId: "a" });
    const right = cell("a-p1").querySelector('[aria-label="Sağa böl"]') as HTMLButtonElement;
    expect(right.disabled).toBe(true);
  });
```

Çalıştır: `npx vitest run tests/terminalMode.test.tsx`
Beklenen: yeni testler FAIL (şerit ve böl düğmeleri bağlı değil).

- [ ] **Adım 7: `TerminalMode.tsx`**

Import'lar: `layoutOf` satırına `minimizedOf` eklenir (`import { layoutOf, minimizedOf } from "../stores/terminalReducer";`) ve `import { PANE_COLOR_VAR } from "./paneColors";`.

Alan gövdesi (Görev 7'deki `w.panes.length === 0 ? … : …` bloğu) şöyle olur:

```tsx
          <div
            key={w.id}
            data-workspace={w.id}
            className={`${w.id === state.activeWorkspaceId ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}
          >
            <div className="relative min-h-0 flex-1">
              {w.panes.length > 0 && (
                <WorkspaceLayout
                  workspace={w}
                  focusable={state.visible && w.id === state.activeWorkspaceId}
                  canSplit={w.panes.length < MAX_TERMINAL_PANES}
                  onSplit={(paneId, dir) => setDialog({ split: { targetPaneId: paneId, dir } })}
                  onRects={(next) => {
                    rects.current[w.id] = next;
                  }}
                />
              )}
              {/* Hiç bölme yoksa ya da hepsi şeritteyse. Bölmelerin üstünde: tıklamayı onlar almasın. */}
              {leafIds(layoutOf(w)).length === 0 && (
                <div className="absolute inset-0 z-10">
                  <EmptyWorkspace defaultCwd={defaultCwd} onPick={(kind, cwd) => commands.addPane(kind, cwd)} />
                </div>
              )}
            </div>
            <MinimizedStrip workspace={w} />
          </div>
```

`WorkspaceLayout` prop'larına `canSplit: boolean` ve `onSplit: (paneId: string, dir: SplitDir) => void` eklenir; kök `div`'in sınıfı `relative h-full min-h-0` → `absolute inset-0` olur (konum bağlamı aynı); `TerminalPaneView`'e:

```tsx
            onSplit={(dir) => onSplit(pane.id, dir)}
            canSplit={canSplit}
```

`WorkspaceLayout`'un altına:

```tsx
/** Küçültülen bölmeler: ad + renk, çıktı geldiyse nokta; tık → geri gelir (spec §4). */
function MinimizedStrip({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { commands } = useTerminalStore();
  const items = minimizedOf(workspace);
  if (items.length === 0) return null;
  return (
    <div role="toolbar" aria-label={t("terminal.minimizedStrip")} className="mt-1.5 flex h-7 shrink-0 items-center gap-1 overflow-x-auto">
      {items.map((m) => {
        const pane = workspace.panes.find((p) => p.id === m.paneId);
        if (!pane) return null;
        const color = PANE_COLOR_VAR[pane.color ?? "gray"];
        return (
          <button
            key={m.paneId}
            type="button"
            data-minimized={m.paneId}
            onClick={() => commands.restorePane(m.paneId)}
            title={t("terminal.restorePane")}
            className={`${TOOL_BUTTON} h-6 max-w-[14rem]`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
            <span className="min-w-0 truncate font-mono text-2xs">{pane.title ?? t(KIND_LABEL[pane.kind])}</span>
            {m.unread && <span data-unread="" className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Adım 8: Yeşili gör**

Çalıştır: `npx vitest run tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx tests/terminalSidebar.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS. "boş alan" testleri (0 bölme) aynen geçiyor.

- [ ] **Adım 9: Commit**

```bash
git add src/terminal/paneColors.ts
git add src/terminal/TerminalPaneView.tsx
git add src/terminal/TerminalMode.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/terminalPaneView.test.tsx
git add tests/terminalMode.test.tsx
git commit -m "Terminal: bolme basligi (ad, renk, saga/alta bol, seride indir) ve kucultulenler seridi" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 10: Bölme başına yazı boyutu — Ctrl+tekerlek, Ctrl+`+`/`-`/`0`

**Dosyalar:**
- Değişir: `src/components/EmbeddedTerminal.tsx` (yalnız `fontSize` prop'u ve yeniden ölçme; Ctrl+V / sağ tık / bırakma kodu AYNEN)
- Değişir: `src/terminal/TerminalPaneView.tsx`
- Test (yeni): `tests/embeddedTerminal.test.tsx`
- Test (değişir): `tests/terminalPaneView.test.tsx`

**Arayüzler:**
- Tüketir: Görev 4'ten `PANE_FONT_DEFAULT`, `PANE_FONT_MIN`, `PANE_FONT_MAX`, `clampPaneFontSize`; Görev 6'dan `commands.setPaneFontSize`.
- Üretir:

```ts
// EmbeddedTerminal
interface Props { sessionId: string; active: boolean; fontSize?: number } // varsayılan 13
// TerminalPaneView: pane.fontSize'ı EmbeddedTerminal'e geçirir; kökte Ctrl+tekerlek / Ctrl+tuş
export function nextFontSize(current: number | undefined, key: "up" | "down" | "reset"): number | null; // null = varsayılan
```

**Neden yerli dinleyici:** React tekerlek olayını pasif dinleyiciyle bağlıyor; `onWheel` içinde `preventDefault` çalışmaz, Chromium sayfayı yakınlaştırmaya devam edebilir. Bu yüzden bölme kökünde `addEventListener("wheel", …, { passive: false, capture: true })`. Tuşlar da yakalama aşamasında kökte (`keydown`, `capture: true`): xterm'in textarea'sından ÖNCE çalışır; yalnız Ctrl+`=`/`+`/`-`/`0` yutulur, gerisi xterm'e gider. `attachCustomKeyEventHandler`'a DOKUNULMAZ.

- [ ] **Adım 1: Kırmızı test** — `tests/embeddedTerminal.test.tsx`

```tsx
// @vitest-environment jsdom
// EmbeddedTerminal: yazı boyutu ve kabuğa boyut bildirimi (spec 2026-10-14 §4, §5).
// xterm sahte: gerçek tuval jsdom'da çizilmiyor.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import EmbeddedTerminal from "../src/components/EmbeddedTerminal";

interface FakeTerm {
  options: Record<string, unknown>;
  cols: number;
  rows: number;
  refresh: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
}
const fake = vi.hoisted(() => ({ terms: [] as FakeTerm[], fits: [] as Array<{ fit: ReturnType<typeof vi.fn> }> }));

vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    options: Record<string, unknown>;
    cols = 100;
    rows = 30;
    refresh = vi.fn();
    focus = vi.fn();
    constructor(options: Record<string, unknown>) {
      this.options = { ...options };
      fake.terms.push(this as unknown as FakeTerm);
    }
    loadAddon() {}
    open() {}
    onData() {
      return { dispose() {} };
    }
    attachCustomKeyEventHandler() {}
    write() {}
    paste() {}
    dispose() {}
  }
}));
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit = vi.fn();
    constructor() {
      fake.fits.push(this);
    }
  }
}));
vi.mock("@xterm/xterm/css/xterm.css", () => ({}));

let observers: Array<() => void>;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let prevRO: unknown;

beforeEach(() => {
  vi.useFakeTimers();
  fake.terms.length = 0;
  fake.fits.length = 0;
  observers = [];
  prevRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    constructor(cb: () => void) {
      observers.push(cb);
    }
    observe() {}
    disconnect() {}
  };
  // jsdom'da kutular 0×0; safeFit 0 boyutta çalışmıyor.
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 400 });
  api = {
    writeTerminal: vi.fn(),
    onTerminalData: vi.fn(() => () => {}),
    onTerminalExit: vi.fn(() => () => {}),
    getTerminalBuffer: vi.fn(() => Promise.resolve("")),
    resizeTerminal: vi.fn(),
    getPathForFile: vi.fn()
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  (window as unknown as { api: unknown }).api = prevApi;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = prevRO;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
});

function view(props: { active?: boolean; fontSize?: number }) {
  return (
    <LanguageProvider language="tr">
      <EmbeddedTerminal sessionId="s1" active={props.active ?? false} fontSize={props.fontSize} />
    </LanguageProvider>
  );
}

describe("EmbeddedTerminal yazı boyutu", () => {
  it("verilmezse 13, verilirse o boyutla kuruluyor", () => {
    render(view({}));
    expect(fake.terms[0].options.fontSize).toBe(13);
    cleanup();
    render(view({ fontSize: 16 }));
    expect(fake.terms[1].options.fontSize).toBe(16);
  });

  it("boyut değişince yeniden kurmadan uyguluyor, yeniden ölçüp kabuğa bildiriyor", () => {
    const r = render(view({ fontSize: 13 }));
    const fitsBefore = fake.fits[0].fit.mock.calls.length;
    r.rerender(view({ fontSize: 18 }));
    expect(fake.terms).toHaveLength(1);
    expect(fake.terms[0].options.fontSize).toBe(18);
    expect(fake.fits[0].fit.mock.calls.length).toBeGreaterThan(fitsBefore);
    act(() => {
      vi.runAllTimers();
    });
    expect(api.resizeTerminal).toHaveBeenCalledWith("s1", 100, 30);
  });
});
```

`tests/terminalPaneView.test.tsx` — `EmbeddedTerminal` sahtesi `fontSize`'ı da gösterir:

```tsx
vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId, active, fontSize }: { sessionId: string; active: boolean; fontSize?: number }) => (
    <div data-testid={`xterm-${sessionId}`} data-active={String(active)} data-font={String(fontSize ?? "")} />
  )
}));
```

`renderPane` `opts`'una `fontSize?: number` eklenir, `pane`'e `fontSize: opts.fontSize` konur. Yeni testler (dosyanın sonuna):

```tsx
describe("yazı boyutu (spec 2026-10-14 §4)", () => {
  it("bölmenin boyutu terminale gidiyor", () => {
    renderPane({ state: "running", ptyId: "t1" }, { fontSize: 16 });
    expect(screen.getByTestId("xterm-t1").getAttribute("data-font")).toBe("16");
  });

  it("Ctrl+tekerlek büyütüp küçültüyor; Ctrl'siz tekerlek terminalde kalıyor", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" });
    const body = screen.getByTestId("xterm-t1");
    const up = new WheelEvent("wheel", { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true });
    act(() => {
      body.dispatchEvent(up);
    });
    expect(up.defaultPrevented).toBe(true);
    expect(commands.setPaneFontSize).toHaveBeenLastCalledWith("p1", 14);
    act(() => {
      body.dispatchEvent(new WheelEvent("wheel", { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true }));
    });
    expect(commands.setPaneFontSize).toHaveBeenLastCalledWith("p1", 12);
    const plain = new WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true });
    act(() => {
      body.dispatchEvent(plain);
    });
    expect(plain.defaultPrevented).toBe(false);
    expect(commands.setPaneFontSize).toHaveBeenCalledTimes(2);
  });

  it("Ctrl+= / Ctrl+- / Ctrl+0; sınırda çağrı yok; başka Ctrl tuşları terminale gidiyor", () => {
    const commands = renderPane({ state: "running", ptyId: "t1" }, { fontSize: 24 });
    const body = screen.getByTestId("xterm-t1");
    const key = (k: string) => {
      const e = new KeyboardEvent("keydown", { key: k, ctrlKey: true, bubbles: true, cancelable: true });
      act(() => {
        body.dispatchEvent(e);
      });
      return e;
    };
    expect(key("=").defaultPrevented).toBe(true); // 24'te üst sınır: yutuluyor ama çağrı yok
    expect(commands.setPaneFontSize).not.toHaveBeenCalled();
    key("-");
    expect(commands.setPaneFontSize).toHaveBeenLastCalledWith("p1", 23);
    key("0");
    expect(commands.setPaneFontSize).toHaveBeenLastCalledWith("p1", null);
    expect(key("c").defaultPrevented).toBe(false);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/embeddedTerminal.test.tsx tests/terminalPaneView.test.tsx`
Beklenen: FAIL — `fontSize` 13'te sabit; Ctrl+tekerlek komut göndermiyor.

- [ ] **Adım 3: `EmbeddedTerminal.tsx`**

Import: `import { PANE_FONT_DEFAULT } from "../../app-electron/shared/terminalLayout";`

```tsx
interface Props {
  sessionId: string;
  active: boolean;
  /** Bölmenin yazı boyutu (spec 2026-10-14 §4). Değişince terminal yeniden kurulmuyor. */
  fontSize?: number;
}

export default function EmbeddedTerminal({ sessionId, active, fontSize = PANE_FONT_DEFAULT }: Props) {
```

`appearanceRef`'in altına:

```tsx
  // Kurulumda okunuyor; sonraki değişiklikleri aşağıdaki efekt uyguluyor
  // (bağımlılık olsaydı terminal sıfırdan kurulur, çıktı silinirdi).
  const fontSizeRef = useRef(fontSize);
  fontSizeRef.current = fontSize;
  // Kurulum efektinin içindeki "yeniden ölç + kabuğa bildir" adımı; yazı
  // boyutu efekti de bunu çağırıyor.
  const refitRef = useRef<() => void>(() => {});
```

`new Terminal({ … fontSize: 13, … })` → `fontSize: fontSizeRef.current,`.

ResizeObserver kurulumu şöyle olur (davranış aynı; adım `refit` adıyla dışarı da veriliyor):

```tsx
    const refit = () => {
      if (disposed) return;
      safeFit();
      if (term.cols > 0 && term.rows > 0) {
        window.api.resizeTerminal(sessionId, term.cols, term.rows);
      }
    };
    refitRef.current = refit;

    const resizeObserver = new ResizeObserver(refit);
    resizeObserver.observe(containerRef.current);
```

Temizlikte (`return () => { disposed = true; …`) ilk satırdan sonra: `refitRef.current = () => {};`

Palet efektinin altına:

```tsx
  // Yazı boyutu değişince aynı terminal yeniden ölçülüyor; satır/sütun
  // değiştiyse kabuğa bildiriliyor.
  useEffect(() => {
    const term = termRef.current;
    if (!term || term.options.fontSize === fontSize) return;
    term.options.fontSize = fontSize;
    refitRef.current();
  }, [fontSize]);
```

`attachCustomKeyEventHandler`, Ctrl+V, `dragover`/`drop` kodu DEĞİŞMEZ.

- [ ] **Adım 4: `TerminalPaneView.tsx`**

Import'a `PANE_FONT_DEFAULT`, `clampPaneFontSize` eklenir (`terminalLayout` satırı). Dosya düzeyinde (bileşenin üstünde):

```tsx
/** Ctrl+tekerlek / Ctrl+tuş sonrası yeni boyut; `null` = varsayılana dön. Sınırdaysa aynı değer. */
export function nextFontSize(current: number | undefined, key: "up" | "down" | "reset"): number | null {
  if (key === "reset") return null;
  const base = current ?? PANE_FONT_DEFAULT;
  return clampPaneFontSize(base + (key === "up" ? 1 : -1)) ?? base;
}
```

Bileşende, `pickerRef`'in yanına:

```tsx
  const rootRef = useRef<HTMLDivElement | null>(null);
  const fontRef = useRef(pane.fontSize);
  fontRef.current = pane.fontSize;

  // Bölme içinde Ctrl+tekerlek ve Ctrl+= / Ctrl+- / Ctrl+0 (spec §4). Yerli
  // dinleyici: React'in tekerlek dinleyicisi pasif, `preventDefault` orada
  // çalışmıyor. Yakalama aşaması: xterm'in textarea'sından önce.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Sınırda (yeni = mevcut) ve varsayılandayken Ctrl+0'da (null ↔ tanımsız) çağrı yok.
    const apply = (key: "up" | "down" | "reset") => {
      const current = fontRef.current;
      const next = nextFontSize(current, key);
      const same = next === null ? current === undefined : next === (current ?? PANE_FONT_DEFAULT);
      if (!same) commands.setPaneFontSize(pane.id, next);
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey || e.deltaY === 0) return;
      e.preventDefault();
      e.stopPropagation();
      apply(e.deltaY < 0 ? "up" : "down");
    };
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      const key = e.key === "=" || e.key === "+" ? "up" : e.key === "-" ? "down" : e.key === "0" ? "reset" : null;
      if (!key) return;
      e.preventDefault();
      e.stopPropagation();
      apply(key);
    };
    root.addEventListener("wheel", onWheel, { passive: false, capture: true });
    root.addEventListener("keydown", onKey, true);
    return () => {
      root.removeEventListener("wheel", onWheel, true);
      root.removeEventListener("keydown", onKey, true);
    };
  }, [commands, pane.id]);
```

Kök `div`'e `ref={rootRef}`; gövdedeki `<EmbeddedTerminal sessionId={ptyId} active={active} />` → `<EmbeddedTerminal sessionId={ptyId} active={active} fontSize={pane.fontSize} />`.

Test notu: "Ctrl+= 24'te" testinde `preventDefault` çağrılıyor ama komut gitmiyor — yukarıdaki `same` kontrolü bunu sağlıyor. Varsayılanda (fontSize tanımsız) Ctrl+0: `same` true → çağrı yok.

- [ ] **Adım 5: Yeşili gör**

Çalıştır: `npx vitest run tests/embeddedTerminal.test.tsx tests/terminalPaneView.test.tsx tests/terminalMode.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS.

- [ ] **Adım 6: Commit**

```bash
git add src/components/EmbeddedTerminal.tsx
git add src/terminal/TerminalPaneView.tsx
git add tests/embeddedTerminal.test.tsx
git add tests/terminalPaneView.test.tsx
git commit -m "Terminal: bolme basina yazi boyutu (Ctrl+tekerlek, Ctrl+=/-/0), terminal yeniden kurulmadan" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 11: Yazıların kayması — günlüğü oku, ölçülen nedene göre düzelt

**Dosyalar:**
- Değişir: `src/components/EmbeddedTerminal.tsx` (yalnız boyut bildirimi ve yeniden çizim)
- Test (değişir): `tests/embeddedTerminal.test.tsx`

**Arayüzler:**
- Tüketir: Görev 1'in `terminal.boyut` günlük satırları; Görev 10'un `refit` adımı.
- Üretir: `export const RESIZE_SETTLE_MS = 100;` (`EmbeddedTerminal.tsx`). Dışarıya başka değişiklik yok.

**Kural (spec §5):** ölçmeden düzeltme yok. Bu görev kullanıcının kaymayı bir kez yaşamasını bekler — yürütmede DURMA noktası: kullanıcıdan istenir, cevap gelmeden 2a/2b'ye geçilmez.

- [ ] **Adım 1: Teşhis — kullanıcıdan yeniden üretim, günlüğü okuma**

Kullanıcıya (Türkçe, sade):

> Geliştirme sürümünü açın (`npm run dev`; açık olanı ben yeniden başlatmıyorum), Terminal modunda 2–3 bölme açın ve kayma görülene kadar normal kullanın. Kayınca TIKLAMADAN önce saati not edin, sonra tıklayın. Bana "kaydı" ve saati yazın.

Sonra günlüğü oku (içerik yok, yalnız boyut satırları):

```bash
grep "terminal.boyut" "$APPDATA/axet-sap-launcher/logs/ntt-studio.log" | tail -n 200
```

Dosya orada yoksa yolu `app-electron/main/appLog.ts`'teki `logDir`'den al.

Karar tablosu (kullanıcının verdiği saatin ±10 sn'si):

| Görülen | Anlamı | Uygulanacak |
|---|---|---|
| Aynı bölmede kısa sürede birden çok farklı boyut (ör. 120×30 → 119×30 → 120×30), ya da tıklama anında yeni bir boyut satırı | xterm ile kabuğun boyutu ayrışıyor | **2a** |
| Kayma anında hiç satır yok, tıklamada da yeni boyut yok (aynı boyut tekrar yazılmıyor) | Boyut sabit, çizim bayat | **2b** |
| İkisi de | — | **2a ve 2b** |

Kararı ve günlükten 3–5 satırlık kanıtı (bölme kimliğinin ilk 8 hanesi, sütun, satır, saat) ledger'a `Task 11: Ruling:` olarak yaz.

- [ ] **Adım 2a: (boyut ayrışıyorsa) Kabuğa bildirim ~100 ms sakinlikten sonra ve yalnız değiştiyse**

Kırmızı test — `tests/embeddedTerminal.test.tsx` sonuna:

```tsx
describe("kabuğa boyut bildirimi (spec §5, 2a)", () => {
  it("art arda boyut değişimi tek bildirim: sakinlikten sonra, son boyutla", () => {
    render(view({}));
    api.resizeTerminal.mockClear();
    const term = fake.terms[0];
    act(() => {
      term.cols = 90;
      observers.forEach((cb) => cb());
      vi.advanceTimersByTime(40);
      term.cols = 95;
      observers.forEach((cb) => cb());
      vi.advanceTimersByTime(40);
    });
    expect(api.resizeTerminal).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(api.resizeTerminal.mock.calls).toEqual([["s1", 95, 30]]);
  });

  it("boyut aynı kaldıysa bildirim yok", () => {
    render(view({}));
    // İlk bildirim: "son bildirilen" 100×30 olsun.
    act(() => {
      observers.forEach((cb) => cb());
      vi.runAllTimers();
    });
    api.resizeTerminal.mockClear();
    act(() => {
      observers.forEach((cb) => cb());
      vi.runAllTimers();
    });
    expect(api.resizeTerminal).not.toHaveBeenCalled();
  });

  it("odak gelince bugünkü gibi hemen bildiriliyor (tıklamanın düzelttiği yol korunuyor)", () => {
    const r = render(view({ active: false }));
    api.resizeTerminal.mockClear();
    r.rerender(view({ active: true }));
    expect(api.resizeTerminal).toHaveBeenCalledWith("s1", 100, 30);
  });
});
```

Çalıştır: `npx vitest run tests/embeddedTerminal.test.tsx`
Beklenen: ilk iki test FAIL (bildirim hemen ve her seferinde gidiyor); üçüncüsü PASS.

Uygula — `EmbeddedTerminal.tsx`, bileşenin üstüne:

```tsx
// Kabuğa boyut, ölçüm bu kadar süre durulduktan sonra ve yalnız değiştiyse
// bildiriliyor (spec 2026-10-14 §5): sürükleme/yerleşim sırasında ara
// boyutlar kabuğa gidip ekranı yeniden akıtmasın. xterm'in kendi `fit()`'i
// her karede çalışmaya devam ediyor.
export const RESIZE_SETTLE_MS = 100;
```

Kurulum efektinde Görev 10'un `refit`'i şöyle olur:

```tsx
    // Kabuğa en son bildirilen boyut.
    let reported = { cols: 0, rows: 0 };
    let settle: ReturnType<typeof setTimeout> | null = null;
    const report = () => {
      if (settle) clearTimeout(settle);
      settle = setTimeout(() => {
        settle = null;
        if (disposed || term.cols <= 0 || term.rows <= 0) return;
        if (term.cols === reported.cols && term.rows === reported.rows) return;
        reported = { cols: term.cols, rows: term.rows };
        window.api.resizeTerminal(sessionId, term.cols, term.rows);
      }, RESIZE_SETTLE_MS);
    };
    reportedRef.current = (cols, rows) => {
      reported = { cols, rows };
    };

    const refit = () => {
      if (disposed) return;
      safeFit();
      report();
    };
    refitRef.current = refit;
```

Temizlikte: `if (settle) clearTimeout(settle);` ve `reportedRef.current = () => {};`.

Bileşen düzeyinde `refitRef`'in yanına:

```tsx
  // Odak efekti hemen bildirdiğinde kurulumdaki "son bildirilen" de güncellensin.
  const reportedRef = useRef<(cols: number, rows: number) => void>(() => {});
```

`active` efekti DEĞİŞMEZ (hemen ve koşulsuz bildiriyor: tıklamanın düzelttiği yol); yalnız bildirimden sonra `reportedRef.current(term.cols, term.rows);` eklenir.

Çalıştır: `npx vitest run tests/embeddedTerminal.test.tsx`
Beklenen: hepsi PASS (Görev 10'un testi `vi.runAllTimers()` ile zaten sakinliği bekliyor).

- [ ] **Adım 2b: (boyut sabitse) Görünürlük, odak ve yerleşim değişiminde yeniden çiz**

Kırmızı test — `tests/embeddedTerminal.test.tsx` sonuna:

```tsx
describe("yeniden çizim (spec §5, 2b)", () => {
  it("yerleşim değişince, odak gelince ve pencere öne gelince bütün satırlar yeniden çiziliyor", () => {
    const r = render(view({ active: false }));
    const term = fake.terms[0];
    act(() => {
      observers.forEach((cb) => cb());
    });
    expect(term.refresh).toHaveBeenLastCalledWith(0, 29);
    term.refresh.mockClear();
    r.rerender(view({ active: true }));
    expect(term.refresh).toHaveBeenCalledWith(0, 29);
    term.refresh.mockClear();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(term.refresh).toHaveBeenCalledWith(0, 29);
  });
});
```

Çalıştır: `npx vitest run tests/embeddedTerminal.test.tsx`
Beklenen: FAIL — `refresh` çağrılmıyor.

Uygula — kurulum efektinde:

```tsx
    // Boyut değişmese de tuval bayatlayabiliyor (spec §5): bütün satırları
    // yeniden çiz. Ucuz; yalnız görünür satırlar.
    const repaint = () => {
      if (disposed || term.rows <= 0) return;
      term.refresh(0, term.rows - 1);
    };
    repaintRef.current = repaint;
    const onWindowFocus = () => repaint();
    const onVisibility = () => {
      if (document.visibilityState === "visible") repaint();
    };
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibility);
```

`refit`'in sonuna `repaint();` eklenir (yerleşim değişimi ResizeObserver'dan geliyor). Temizlikte iki dinleyici kaldırılır ve `repaintRef.current = () => {};`. Bileşen düzeyinde `const repaintRef = useRef<() => void>(() => {});`; `active` efektinde `term.focus();`'tan sonra `repaintRef.current();`.

Çalıştır: `npx vitest run tests/embeddedTerminal.test.tsx`
Beklenen: hepsi PASS.

- [ ] **Adım 3: Tam takım ve tip denetimi**

Çalıştır: `npm run typecheck` ve `npx vitest run` (~100 sn; çıktıyı dosyaya alıp kuyruğunu oku)
Beklenen: hepsi PASS.

- [ ] **Adım 4: Commit**

```bash
git add src/components/EmbeddedTerminal.tsx
git add tests/embeddedTerminal.test.tsx
git commit -m "Terminal: kayma duzeltmesi (olcume gore: kabuga boyut sakinlikten sonra / bayat cizim yenileniyor)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Commit mesajındaki parantezi uygulanan dala göre kısalt (yalnız 2a ya da yalnız 2b).

- [ ] **Adım 5: Kullanıcı doğrulaması**

Kullanıcıya: aynı kullanımla kaymanın TIKLAMADAN düzgün kaldığını denemesi. Kalıyorsa görev biter. Kayma sürüyorsa günlük yeniden okunur ve ölçülene göre yeni bir karar verilir (ledger'a `Ruling:`); tahminle ikinci düzeltme yapılmaz.

---

## Gözle kontrol listesi (kullanıcı, bütün görevlerden sonra)

1. 9 bölme açılıyor; "Bölme" düğmesi odaktaki bölmeyi uzun kenarından bölüyor; başlıktaki Sağa böl / Alta böl.
2. Ayırıcı sürükleme akıcı, 160×90 px'te duruyor; çift tık eşitliyor; ok tuşları.
3. Başlıktan sürükleyip beş alana bırakma; gölge; Esc iptal; kısa tık yalnız odak veriyor.
4. Taşırken terminal geçmişi kaybolmuyor (komut çıktısı yerinde).
5. Ad (çift tık, Enter/Esc), renk (şerit ve nokta, koyu ve açık tema), Ctrl+tekerlek / Ctrl+= / Ctrl+- / Ctrl+0.
6. Şeride indir / geri getir; şeritte okunmadı noktası; hepsi şeritteyken boş-durum ve ekleme.
7. Uygulamayı kapatıp açınca "Geri yükle" aynı ağacı, adları, renkleri, boyutları ve şeridi getiriyor.
8. Kayma: tıklamadan düzgün kalıyor.
