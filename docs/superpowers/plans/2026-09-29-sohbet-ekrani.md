# Sohbet Ekranı Uygulama Planı

> **Ajanlar için:** GEREKLİ ALT BECERİ: Bu planı görev görev uygulamak için superpowers:subagent-driven-development (önerilen) ya da superpowers:executing-plans kullan. Adımlar onay kutusu (`- [ ]`) ile izleniyor.

**Amaç:** Sohbet ekranını onaylı taslağa göre yeniden düzenlemek:
- araç çağrıları tek satırda toplanıyor;
- yazma kutusu 3 satır ve ayrı bir araç çubuğuyla geliyor;
- sistem bilgisi kutuya yapışık bir sekmede duruyor;
- gösterge konuşmanın sonuna iniyor;
- boş ekran sadeleşiyor.

**Mimari:**
- İki yeni bileşen var: `ChatToolRun` (araç satırı) ve `ChatComposer` (yazma kutusu ve sistem sekmesi).
- `ChatSessionPane` inceliyor: liste, arama ve sürükle-bırak onda kalıyor. Yazma kutusunun bütün mantığı `ChatComposer`'a taşınıyor.
- Seviye rozetinin doğruluğu tek bir saf fonksiyonda (`contextTierFor`) toplanıyor.

**Teknoloji:** Electron, React 18, TypeScript, Tailwind 3.4, vitest 2.1.9, jsdom, @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-09-29-sohbet-ekrani-design.md`. Spec bağlayıcıdır. Plan ile çelişirse spec geçerli.

## Genel Kısıtlar

**Paketler ve testler**
- Yeni npm paketi eklenmiyor. jest-dom ve user-event yok. Testler `fireEvent` ile ve düz `expect` ile yazılıyor.
- `.tsx` testleri `// @vitest-environment jsdom` ile başlıyor ve `afterEach(cleanup)` çağırıyor.
- Render'lar `<LanguageProvider language="tr">` ile sarılıyor (`../src/i18n`).
- `window.api` sahtesi `tests/chatHomeBehaviour.test.tsx`'teki Proxy deseniyle kuruluyor:
  - `on*` anahtarları `() => () => {}` döndürüyor;
  - öteki anahtarlar `() => new Promise(() => {})` döndürüyor.
  - Test sonunda eski değer geri konuyor.

**Yazım**
- tsconfig `noUnusedLocals` ve `noUnusedParameters` açık. Kullanılmayan her import ve değişken silinmeli.
- Dosyalar CRLF. Düzenleme Edit aracıyla yapılıyor. Prettier çalıştırılmıyor.
- Yeni `text-[Npx]` sınıfı eklenmiyor. `text-2xs` (11px), `text-xs` (12.5px) ve `text-sm` (14px) kullanılıyor. `tests/designScale.test.ts` sayacı yalnız düşebilir.
- Yeni metinler `src/i18n/tr.ts` ve `src/i18n/en.ts`'e birlikte ekleniyor. `i18n.test` şunları kontrol ediyor:
  - boş değer;
  - yer tutucu eşitliği;
  - anahtar ile değerin aynı olmaması.
- Kod yorumları tam Türkçe karakterle yazılıyor.
- Vibe'ın değerleri (renk, ölçü, metin) birebir kopyalanmıyor.

**Commit**
- Commit mesajları ASCII Türkçe ve `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ile bitiyor.
- `git add` dosya dosya yapılıyor, `-A` yok.
- Push ve merge yok.

**Korunacak davranışlar**
- `tests/dragToChat.test.tsx`, ChatSessionPane.tsx kaynağında şu sırayı arıyor: `readDraggedPaths(dt)` → `dt.files && dt.files.length > 0` → `dt.getData("text/plain")`. Bu yüzden sürükle-bırak işleyicileri pane'de KALIYOR.
- `ChatBubble` `memo` ile sarılı. Ona verilen her geri çağrı kararlı olmalı (`useCallback` ya da `undefined`).

**Her görevin sonunda**
- `npm run -s typecheck` ve `npx vitest run` yeşil.

## Review Focus

Testlerin kolay kaçırdığı ve kullanıcıyı en çok ısırabilecek durumlar, olasılık sırasıyla. Her birinin testi sahibi olan görevde duruyor.

| # | Durum | Beklenen | Test |
|---|---|---|---|
| 1 | **Uzun sohbette kayma** | Dipteyken yeni araç adımı görünümü aşağı taşıyor. Kullanıcı yukarıdayken taşımıyor. | Görev 4 |
| 2 | **Uzun ad ve dar pencere** | Sekmede sistem adı ve klasör adı kırpılıyor (`truncate`, `min-w-0`). Sekme kutudan geniş olmuyor (`max-w-full`). Dosyalar ve Talimatlar küçülmüyor (`shrink-0`). | Görev 6 |
| 3 | **Bahis boyamasının kayması** | Boyama katmanı ile textarea aynı yazı boyunu, satır yüksekliğini ve dikey dolguyu taşıyor. İkisinde de yatay dolgu yok. | Görev 5 |
| 4 | **Çok adımlı ve hatalı turlar** | 30+ adımda açık liste `max-h-[320px]` ve `overflow-auto` ile sınırlı kalıyor. Tek hatalı adım başlığı `failed` yapıyor. | Görev 1 |
| 5 | **Yanlış seviye rozeti** | Başka bir sistemin klasöründeki eski sohbette rozet çıkmıyor. | Görev 6 |

---

## Dosya haritası

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `src/components/ChatToolRun.tsx` (yeni) | 1 | Araç satırı; `TOOL_KEYS`, `useToolLabel`, `StepDetail` buraya taşınıyor |
| `src/components/ChatBubble.tsx` | 1, 2, 4 | Cevap satırı, kullanıcı balonu, sadeleşen `ThinkingBubble`, `AskUserCard` |
| `src/lib/markdownLite.tsx` | 3 | Başlıksız kod bloğu |
| `src/components/ChatComposer.tsx` (yeni) | 5, 6 | Yazma kutusu, bahis menüsü, araç çubuğu, `ContextRing`, sistem sekmesi |
| `src/lib/contextTier.ts` (yeni) | 6 | `contextTierFor` saf fonksiyonu |
| `src/components/ChatSessionPane.tsx` | 4, 5, 6, 7, 8 | Liste, arama, sürükle-bırak, boş ekran |
| `src/components/AxetCodeHome.tsx` | 6, 7 | `contextTier` geçişi, selamlama kodunun silinmesi |
| `src/App.tsx`, `src/index.css` | 8 | Mesaj arası boşluk |
| `src/i18n/tr.ts`, `src/i18n/en.ts` | 1, 7, 8 | Yeni ve silinen anahtarlar |

---

### Görev 1: `ChatToolRun` bileşeni

**Dosyalar:**
- Oluştur: `src/components/ChatToolRun.tsx`
- Değiştir: `src/components/ChatBubble.tsx` (l.366-405 `StepDetail`, l.491-526 `TOOL_KEYS` ve `useToolLabel` buradan taşınıyor)
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/chatToolRun.test.tsx`

**Arayüzler:**
- Üretir:
  - `export default function ChatToolRun({ steps, status }: { steps: AxetChatActivity[]; status: "running" | "done" })`
  - `export function useToolLabel(): (tool: string) => string`
  - `export function StepDetail({ diff, output }: { diff?: string; output?: string })`
  - `export interface KindCount { kind: string; label?: TranslationKey; count: number }`
  - `export function summarizeKinds(steps: AxetChatActivity[]): KindCount[]`
- Görev 2 ve 4 `ChatToolRun`'ı kullanıyor. `ThinkingBubble` Görev 4'te `useToolLabel`'ı bırakıyor.

- [ ] **Adım 1: i18n anahtarlarını ekle**

`src/i18n/tr.ts`'e `chatBubble.*` anahtarlarının yanına:

```ts
  "chatToolRun.count": "{count} araç işlemi",
  "chatToolRun.running": "çalışıyor",
  "chatToolRun.kind.view": "Okuma",
  "chatToolRun.kind.edit": "Düzenleme",
  "chatToolRun.kind.write": "Yazma",
  "chatToolRun.kind.bash": "Komut",
  "chatToolRun.kind.glob": "Dosya arama",
  "chatToolRun.kind.grep": "İçerik arama",
  "chatToolRun.kind.ls": "Klasör",
  "chatToolRun.kind.fetch": "İnternet",
  "chatToolRun.kind.agent": "Alt ajan",
  "chatToolRun.kind.todo": "Görev listesi",
```

`src/i18n/en.ts`'e aynı yere:

```ts
  "chatToolRun.count": "{count} tool calls",
  "chatToolRun.running": "running",
  "chatToolRun.kind.view": "Read",
  "chatToolRun.kind.edit": "Edit",
  "chatToolRun.kind.write": "Write",
  "chatToolRun.kind.bash": "Command",
  "chatToolRun.kind.glob": "File search",
  "chatToolRun.kind.grep": "Content search",
  "chatToolRun.kind.ls": "Folder",
  "chatToolRun.kind.fetch": "Web",
  "chatToolRun.kind.agent": "Subagent",
  "chatToolRun.kind.todo": "Todo list",
```

- [ ] **Adım 2: Başarısız testi yaz**

`tests/chatToolRun.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChatToolRun, { summarizeKinds } from "../src/components/ChatToolRun";
import type { AxetChatActivity } from "../app-electron/shared/types";

afterEach(cleanup);

const step = (tool: string, extra: Partial<AxetChatActivity> = {}, id = tool + Math.random()): AxetChatActivity => ({
  phase: "tool",
  tool,
  callId: id,
  ...extra
});

const renderRun = (steps: AxetChatActivity[], status: "running" | "done" = "done") =>
  render(
    <LanguageProvider language="tr">
      <ChatToolRun steps={steps} status={status} />
    </LanguageProvider>
  );

const header = () => screen.getByRole("button", { expanded: false }) as HTMLButtonElement;

describe("ChatToolRun", () => {
  it("başlık adımları sayıp türleri ilk görülme sırasıyla özetliyor", () => {
    renderRun([step("view", { target: "a.ts" }), step("edit"), step("read"), step("grep")]);
    expect(screen.getByText("4 araç işlemi")).toBeTruthy();
    expect(screen.getByText("2× Okuma · 1× Düzenleme · 1× İçerik arama")).toBeTruthy();
  });

  it("summarizeKinds read ile view'ı aynı türde topluyor", () => {
    const kinds = summarizeKinds([step("view"), step("read"), step("bash")]);
    expect(kinds.map((k) => [k.kind, k.count])).toEqual([["view", 2], ["bash", 1]]);
  });

  it("MCP araç adı ön eksiz ve alt çizgisiz yazılıyor", () => {
    renderRun([step("mcp:outlook_list_emails")]);
    expect(screen.getByText("1× outlook list emails")).toBeTruthy();
  });

  it("durum: hata varsa failed, tur sürüyorsa running, yoksa done", () => {
    renderRun([step("view"), step("bash", { failed: true })], "running");
    expect(header().dataset.status).toBe("failed");
    cleanup();
    renderRun([step("view")], "running");
    expect(header().dataset.status).toBe("running");
    cleanup();
    renderRun([step("view")], "done");
    expect(header().dataset.status).toBe("done");
  });

  it("kapalı başlıyor, tıklayınca liste açılıyor", () => {
    renderRun([step("view")]);
    expect(screen.queryByTestId("tool-run-list")).toBeNull();
    fireEvent.click(header());
    expect(screen.getByTestId("tool-run-list")).toBeTruthy();
    expect(screen.getByRole("button", { expanded: true })).toBeTruthy();
  });

  it("yalnız ayrıntısı olan adım tıklanabilir ve iki ayrıntı aynı anda açık kalabiliyor", () => {
    renderRun([
      step("edit", { diff: "-a\n+b" }, "c1"),
      step("view", {}, "c2"),
      step("bash", { output: "tamam çıktı" }, "c3")
    ]);
    fireEvent.click(header());
    const list = screen.getByTestId("tool-run-list");
    const clickable = list.querySelectorAll('[role="button"]');
    expect(clickable.length).toBe(2);
    fireEvent.click(clickable[0]);
    fireEvent.click(clickable[1]);
    expect(screen.getByText("+b")).toBeTruthy();
    expect(screen.getByText("tamam çıktı")).toBeTruthy();
  });

  // Review Focus 4
  it("30+ adımda açık liste sınırlı yükseklikte kendi içinde kayıyor", () => {
    renderRun(Array.from({ length: 34 }, (_, i) => step("view", { target: `f${i}.ts` }, `c${i}`)));
    fireEvent.click(header());
    const list = screen.getByTestId("tool-run-list");
    expect(list.className).toContain("max-h-[320px]");
    expect(list.className).toContain("overflow-auto");
    expect(screen.getByText("34 araç işlemi")).toBeTruthy();
  });

  it("canlı turda kullanıcı bir ayrıntı açtıysa yeni son adımın ayrıntısı da açılıyor", () => {
    const first = [step("bash", { output: "birinci" }, "c1")];
    const { rerender } = renderRun(first, "running");
    fireEvent.click(header());
    fireEvent.click(screen.getByTestId("tool-run-list").querySelector('[role="button"]')!);
    expect(screen.getByText("birinci")).toBeTruthy();
    rerender(
      <LanguageProvider language="tr">
        <ChatToolRun steps={[...first, step("bash", { output: "ikinci" }, "c2")]} status="running" />
      </LanguageProvider>
    );
    expect(screen.getByText("ikinci")).toBeTruthy();
  });
});
```

- [ ] **Adım 3: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/chatToolRun.test.tsx`
Beklenen: FAIL, "Failed to resolve import ../src/components/ChatToolRun".

- [ ] **Adım 4: Bileşeni yaz**

`src/components/ChatToolRun.tsx`:
- `TOOL_KEYS` sabitini ve `useToolLabel`'ı, üstlerindeki yorumlarla birlikte ChatBubble.tsx l.491-526'dan buraya taşı. MCP yorumu korunuyor. `useToolLabel`'ı `export` et.
- `StepDetail`'ı ChatBubble.tsx l.366-405'ten yorumuyla taşı ve `export` et.
- `text-[10px]` iki yerde `text-2xs` oluyor. Sayaç böylece düşüyor.

Dosyanın geri kalanı:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  FolderSearch,
  Globe,
  ListChecks,
  Pencil,
  Search,
  Terminal,
  Wrench,
  X
} from "lucide-react";
import type { AxetChatActivity } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

// (TOOL_KEYS, useToolLabel ve StepDetail buraya — yukarıdaki adıma bak.)

// Araç adı → özet satırındaki TÜR. `read` ile `view` aynı iş, `download` ile
// `fetch` de; özette ayrı ayrı sayılsalar "1× Okuma · 1× Okuma" gibi
// tekrarlar çıkardı. Listede olmayan araç (MCP dahil) kendi adıyla ayrı bir
// tür sayılıyor.
const KIND_OF: Record<string, string> = {
  view: "view",
  read: "view",
  edit: "edit",
  write: "write",
  bash: "bash",
  glob: "glob",
  grep: "grep",
  ls: "ls",
  fetch: "fetch",
  download: "fetch",
  agent: "agent",
  todo: "todo"
};

const KIND_LABELS: Record<string, TranslationKey> = {
  view: "chatToolRun.kind.view",
  edit: "chatToolRun.kind.edit",
  write: "chatToolRun.kind.write",
  bash: "chatToolRun.kind.bash",
  glob: "chatToolRun.kind.glob",
  grep: "chatToolRun.kind.grep",
  ls: "chatToolRun.kind.ls",
  fetch: "chatToolRun.kind.fetch",
  agent: "chatToolRun.kind.agent",
  todo: "chatToolRun.kind.todo"
};

const KIND_ICONS: Record<string, LucideIcon> = {
  view: FileText,
  edit: Pencil,
  write: FilePlus,
  bash: Terminal,
  glob: FolderSearch,
  grep: Search,
  ls: Folder,
  fetch: Globe,
  agent: Bot,
  todo: ListChecks
};

export interface KindCount {
  kind: string;
  label?: TranslationKey;
  count: number;
}

/** Adımları türe göre sayar; sıra, türün İLK görüldüğü sıra. */
export function summarizeKinds(steps: AxetChatActivity[]): KindCount[] {
  const counts = new Map<string, KindCount>();
  for (const step of steps) {
    const tool = step.tool ?? "";
    const kind = KIND_OF[tool] ?? tool;
    const entry = counts.get(kind);
    if (entry) entry.count++;
    else counts.set(kind, { kind, label: KIND_LABELS[kind], count: 1 });
  }
  return Array.from(counts.values());
}

/**
 * Bir turun araç çağrıları, TEK SATIRDA toplanmış hâlde.
 *
 * Kapalıyken: sayı, tür özeti ve durum simgesi. Açıkken: kutusuz, ince bir sol
 * çizginin arkasında adım adım liste. Ayrıntısı (fark ya da çıktı) olan adım
 * tıklanınca ayrıntı altında açılıyor.
 *
 * Aynı bileşen hem biten cevabın üstünde (`done`) hem canlı turda (`running`)
 * kullanılıyor: tur bitince görünüm değişmiyor, yalnızca durum simgesi.
 */
export default function ChatToolRun({
  steps,
  status
}: {
  steps: AxetChatActivity[];
  status: "running" | "done";
}) {
  const t = useT();
  const toolLabel = useToolLabel();
  const [open, setOpen] = useState(false);
  // Küme: iki adımın farkını yan yana görmek isteniyor.
  const [openSteps, setOpenSteps] = useState<Set<string>>(() => new Set());
  // Kullanıcı canlı turda bir ayrıntı açtıysa tercihi YAPIŞKAN: yeni gelen son
  // adımın ayrıntısı da kendiliğinden açılıyor. Her adımda yeniden tıklatmak,
  // canlı izlemeyi imkânsız kılardı (kullanıcı isteği, 2026-09-07).
  const stickyRef = useRef(false);
  const toggleStep = (key: string) => {
    stickyRef.current = true;
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const lastIndex = steps.length - 1;
  const last = lastIndex >= 0 ? steps[lastIndex] : null;
  const lastKey = last ? last.callId ?? String(lastIndex) : "";
  useEffect(() => {
    if (status !== "running" || !stickyRef.current || !last || !(last.diff || last.output)) return;
    setOpenSteps((prev) => (prev.has(lastKey) ? prev : new Set(prev).add(lastKey)));
    // `last` her render'da yeni bir nesne olabilir; tetikleyici anahtar ve ayrıntının varlığı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey, status, Boolean(last?.diff || last?.output)]);

  const kinds = useMemo(() => summarizeKinds(steps), [steps]);
  const failed = steps.some((s) => s.failed);
  const runStatus = failed ? "failed" : status === "running" ? "running" : "done";
  const summary = kinds.map((k) => `${k.count}× ${k.label ? t(k.label) : toolLabel(k.kind)}`).join(" · ");

  return (
    <div className="min-w-0 text-2xs">
      <button
        type="button"
        data-status={runStatus}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-slate-500 transition hover:bg-hover hover:text-slate-300"
      >
        {open ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
        <Wrench size={12} className="shrink-0" />
        <span className="shrink-0">{t("chatToolRun.count", { count: String(steps.length) })}</span>
        <span className="truncate font-mono text-slate-600">{summary}</span>
        {/* Canlı ve kapalıyken son adımın hedefi: ne olduğunu açmadan görmek. */}
        {status === "running" && !open && last?.target && (
          <span className="truncate font-mono text-slate-600/70" title={last.target}>
            {last.target}
          </span>
        )}
        <StatusIcon status={runStatus} />
      </button>
      {open && (
        <div
          data-testid="tool-run-list"
          className="chat-scroll ml-1.5 mt-1 flex max-h-[320px] flex-col gap-1 overflow-auto border-l border-line pl-3"
        >
          {steps.map((step, i) => {
            const key = step.callId ?? String(i);
            const detail = step.diff || step.output || "";
            const detailOpen = openSteps.has(key);
            const kind = KIND_OF[step.tool ?? ""] ?? "";
            const Icon = KIND_ICONS[kind] ?? Wrench;
            // Satırın kendi durumu: canlı turda sonucu henüz gelmemiş SON adım sürüyor.
            const rowStatus = step.failed
              ? "failed"
              : status === "running" && i === lastIndex && !step.result && !step.output
                ? "running"
                : "done";
            return (
              <div key={key} className="min-w-0">
                <div
                  role={detail ? "button" : undefined}
                  onClick={detail ? () => toggleStep(key) : undefined}
                  className={`flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 ${
                    detail ? "cursor-pointer hover:bg-hover" : ""
                  }`}
                >
                  <Icon size={12} className="shrink-0 text-slate-500" />
                  <span className="shrink-0 text-slate-400">{toolLabel(step.tool ?? "")}</span>
                  {step.target && (
                    <span className="truncate font-mono text-slate-500" title={step.target}>
                      {step.target}
                    </span>
                  )}
                  {step.result && (
                    <span
                      className={`truncate font-mono ${
                        step.failed ? "text-[var(--status-danger-text)]" : "text-slate-600"
                      }`}
                      title={step.result}
                    >
                      ↳{" "}
                      {step.extraLines
                        ? t("axetCodeHome.toolMoreLines", { count: String(step.extraLines) })
                        : step.result}
                    </span>
                  )}
                  <span className="ml-auto flex shrink-0 items-center gap-1 pl-1">
                    {rowStatus === "running" && <span className="text-slate-500">{t("chatToolRun.running")}</span>}
                    <StatusIcon status={rowStatus} />
                  </span>
                </div>
                {detailOpen && detail && <StepDetail diff={step.diff} output={step.output} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: "failed" | "running" | "done" }) {
  if (status === "failed") return <X size={12} className="shrink-0 text-[var(--status-danger-text)]" />;
  if (status === "running")
    return <span className="chat-breathe block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />;
  return <Check size={12} className="shrink-0 text-[var(--status-success-text)]" />;
}
```

`eslint-disable` satırı: depoda eslint yoksa bu satırı ve üstündeki yorumun ikinci cümlesini kaldır. Kontrol: `grep -rn "eslint-disable" src | head -3`.

- [ ] **Adım 5: ChatBubble'ı yeni modüle bağla**

- `src/components/ChatBubble.tsx`'ten `StepDetail`, `TOOL_KEYS` ve `useToolLabel` tanımlarını sil.
- Yerine şu importu ekle:
  ```ts
  import { StepDetail, useToolLabel } from "./ChatToolRun";
  ```
  Bu görevde ChatBubble'ın davranışı değişmiyor: eski döküm ve `ThinkingBubble` bu iki adı kullanmayı sürdürüyor.

- [ ] **Adım 6: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatToolRun.test.tsx`, sonra `npm run -s typecheck` ve `npx vitest run`.
Beklenen: hepsi PASS.

- [ ] **Adım 7: Commit**

```bash
git add src/components/ChatToolRun.tsx
git add src/components/ChatBubble.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/chatToolRun.test.tsx
git commit -m "Sohbet: arac islemleri tek satirda toplanan ChatToolRun bileseni" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 2: Cevap satırı ve kullanıcı balonu

**Dosyalar:**
- Değiştir: `src/components/ChatBubble.tsx` (props l.105-128, kullanıcı balonu l.156-198, döküm l.220-286, cevap satırı l.339-359, yorum l.70-77)
- Test: `tests/chatBubble.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: Görev 1'deki `ChatToolRun`.
- Üretir: `ChatBubble` yeni bir prop alıyor: `onRegenerate?: () => void`.
  - Kararlı olmalı (memo).
  - Yalnız SON cevapta ve yeniden üretme mümkünken veriliyor.
  - Görev 4 pane'den geçiyor.

- [ ] **Adım 1: Başarısız testi yaz**

`tests/chatBubble.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChatBubble, { type ChatMessage } from "../src/components/ChatBubble";

afterEach(cleanup);

const answer = (extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({ id: "a1", role: "assistant", content: "Cevap metni", createdAt: Date.now(), ...extra }) as ChatMessage;

const renderBubble = (message: ChatMessage, onRegenerate?: () => void) =>
  render(
    <LanguageProvider language="tr">
      <ChatBubble message={message} onRegenerate={onRegenerate} />
    </LanguageProvider>
  );

describe("ChatBubble cevap satırı", () => {
  it("Yeniden üret yalnız onRegenerate verilen balonda, satır da görünür", () => {
    const onRegenerate = vi.fn();
    renderBubble(answer(), onRegenerate);
    const row = screen.getByTestId("answer-row");
    expect(row.className).not.toContain("opacity-0");
    fireEvent.click(screen.getByTitle("Son cevabı sil ve yeniden üret"));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("öteki cevaplarda satır DOM'da ama hover'a kadar gizli, Yeniden üret yok", () => {
    renderBubble(answer());
    expect(screen.getByTestId("answer-row").className).toContain("opacity-0");
    expect(screen.queryByTitle("Son cevabı sil ve yeniden üret")).toBeNull();
    expect(screen.getByTitle("Cevabı kopyala")).toBeTruthy();
  });

  it("akış sürerken satır yok", () => {
    renderBubble(answer({ streaming: true }), vi.fn());
    expect(screen.queryByTestId("answer-row")).toBeNull();
  });

  it("hata cevabında onRegenerate yoksa satır yok, varsa yalnız Yeniden üret", () => {
    renderBubble(answer({ error: true }));
    expect(screen.queryByTestId("answer-row")).toBeNull();
    cleanup();
    renderBubble(answer({ error: true }), vi.fn());
    expect(screen.getByTitle("Son cevabı sil ve yeniden üret")).toBeTruthy();
    expect(screen.queryByTitle("Cevabı kopyala")).toBeNull();
  });

  it("biten cevabın araç dökümü ChatToolRun ile çiziliyor", () => {
    renderBubble(answer({ steps: [{ phase: "tool", tool: "view", callId: "c1" }] }));
    expect(screen.getByText("1 araç işlemi")).toBeTruthy();
  });
});
```

`ChatMessage` tipinde `error`'un tipi boolean değilse (l.23-60'a bak), fixture'ı ona göre ver (örneğin `error: "..."`).

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/chatBubble.test.tsx`
Beklenen: FAIL. `answer-row` yok ve TypeScript/prop uyarısı var.

- [ ] **Adım 3: Props'a `onRegenerate` ekle**

`onContinue`'dan sonra:

```tsx
  // Son cevabı sil ve yeniden üret. Verilmezse düğme çizilmiyor — çağıran
  // yalnızca SON cevap için ve yeniden üretme mümkünken veriyor. `onEdit`
  // gibi kararlı olmalı (memo).
  onRegenerate?: () => void;
```

Parametre listesine `onRegenerate,` ekle.

- [ ] **Adım 4: Eski dökümü ChatToolRun ile değiştir**

l.220-286'daki `steps.length > 0 && !message.streaming` bloğunun tamamını şununla değiştir. Üstteki "ARAÇ DÖKÜMÜ" yorumu korunuyor.

```tsx
      {steps.length > 0 && !message.streaming && (
        <div className="mb-2">
          <ChatToolRun steps={steps} status="done" />
        </div>
      )}
```

Sonra temizlik:
- `stepsOpen`, `openSteps`, `toggleStep` ve `toolLabel` tanımlarını (l.137-149) sil.
- `import ChatToolRun from "./ChatToolRun";` ekle.
- `StepDetail` ve `useToolLabel` importundan yalnız hâlâ kullanılanlar kalsın. `ThinkingBubble` Görev 4'e kadar `useToolLabel`'ı kullanıyor.
- `ChevronDown`/`ChevronRight` kullanılmıyorsa importtan çıkar.

- [ ] **Adım 5: Cevap satırını yeniden yaz**

Dış sarmalayıcı (`<div data-mid=... className={`min-w-0${searchClass}`}>`) `group min-w-0` olsun.

l.339-359'daki satırı şununla değiştir. "Uygulama bağlantıları" rozeti yorumu aynen kalıyor.

```tsx
      {/* Akış sürerken gizli — yarım bir cevabı kopyalatmanın anlamı yok.
          SON cevabın satırı hep görünür ve Yeniden üret'i taşıyor; öteki
          cevaplarınki hover'a kadar gizli ama yer ayrılı (`opacity-0`, `hidden`
          değil) — fare üstüne gelince liste kaymasın. Hata cevabında
          kopyalanacak bir şey yok; yalnız Yeniden üret anlamlı. */}
      {!message.streaming && (!message.error || onRegenerate) && (
        <div
          data-testid="answer-row"
          className={`mt-1 flex h-7 items-center gap-0.5${
            onRegenerate ? "" : " opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100"
          }`}
        >
          {!message.error && <CopyButton value={message.content} title={t("copyButton.copyAnswer")} />}
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              title={t("axetCodeHome.regenerateTitle")}
              className="cursor-pointer rounded-md p-1 text-slate-500 transition hover:bg-active hover:text-slate-200"
            >
              <RefreshCw size={13} />
            </button>
          )}
          {!message.error && (
            <span className="ml-1.5 text-2xs text-slate-600">{formatClock(message.createdAt)}</span>
          )}
          {/* (Uygulama bağlantıları rozeti yorumu burada aynen kalıyor.) */}
        </div>
      )}
```

- [ ] **Adım 6: Kullanıcı balonunu sadeleştir**

- Kullanıcı dalının dış div'i `group relative flex flex-col items-end gap-1 pb-5${searchClass}` olsun.
- Balon `max-w-[80%] rounded-2xl bg-raised px-4 py-2.5 text-slate-100 ${BODY}` olsun.
- Hover satırı:
  - sınıfı `absolute bottom-0 right-0 flex h-5 items-center gap-0.5 pr-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100`;
  - saat `mr-1 text-2xs text-slate-500`;
  - Düzenle düğmesi `rounded-md p-1` olsun.

Satır mutlak konumlu ve `pb-5` onun yerini ayırıyor. Hover'da hiçbir şey kaymıyor. Yorumu buna göre güncelle.

- [ ] **Adım 7: GEMİNİ yorumunu güncelle**

l.70-77'deki "GEMİNİ DÜZENİ" yorumunu yeni düzene göre yeniden yaz:
- istem sağda, `bg-raised` silik balon, hover'da saat/Düzenle/Kopyala;
- cevap solda ve balonsuz;
- araçlar cevabın üstünde tek satır;
- son cevabın altında simge düğmeler.

- [ ] **Adım 8: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatBubble.test.tsx`, `npm run -s typecheck`, `npx vitest run`.
Beklenen: PASS. Pane henüz `onRegenerate` geçmiyor; eski yazılı düğme Görev 4'e kadar pane'de duruyor.

- [ ] **Adım 9: Commit**

```bash
git add src/components/ChatBubble.tsx
git add tests/chatBubble.test.tsx
git commit -m "Sohbet: cevap satiri simge dugmeler, kullanici balonu sade" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: Başlıksız kod bloğu

**Dosyalar:**
- Değiştir: `src/lib/markdownLite.tsx:108-127`
- Test: `tests/markdownCodeBlock.test.tsx` (yeni)

**Arayüzler:** Dışarıya değişen bir şey yok.

- [ ] **Adım 1: Başarısız testi yaz**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import { renderMarkdownLite } from "../src/lib/markdownLite";

afterEach(cleanup);

describe("markdown kod bloğu", () => {
  it("dil başlık şeridi yok, Kopyala düğmesi köşede", () => {
    const { container } = render(
      <LanguageProvider language="tr">{renderMarkdownLite("```js\nconst a = 1;\n```")}</LanguageProvider>
    );
    expect(screen.queryByText("js")).toBeNull();
    expect(screen.getByTitle("Kopyala")).toBeTruthy();
    expect(container.querySelector("code.language-js")).toBeTruthy();
  });
});
```

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/markdownCodeBlock.test.tsx`
Beklenen: FAIL, "js" metni bulundu.

- [ ] **Adım 3: `CodeBlock`'u değiştir**

Yorum ve fonksiyon:

```tsx
// Kod bloğu: başlık şeridi YOK — dil adı bilgi taşımıyordu, renklendirme
// zaten dili gösteriyor. Kopyala sağ üst köşede ve SADECE hover'da beliriyor
// (uzun cevaplarda her bloğun üstünde sabit bir ikon görsel gürültü olurdu)
// ama `focus-within` ile klavyeden de erişilebilir. `pr-10`: düğme ilk
// satırın sonunu örtmesin.
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="group/code relative overflow-hidden rounded-lg border border-line bg-app">
      <span className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover/code:opacity-100">
        <CopyButton value={code} />
      </span>
      <pre className="overflow-x-auto p-3 pr-10 font-mono text-xs text-slate-200">
        <code className={lang ? `language-${lang}` : undefined}>{highlightCode(code, lang)}</code>
      </pre>
    </div>
  );
}
```

- [ ] **Adım 4: Testleri çalıştır**

Çalıştır: `npx vitest run tests/markdownCodeBlock.test.tsx`, `npm run -s typecheck`, `npx vitest run`.
Beklenen: PASS. Başka bir test "TYPESCRIPT" gibi dil etiketini arıyorsa o beklentiyi kaldır. Kontrol: `grep -rn "uppercase\|lang=\"en\"" tests`.

- [ ] **Adım 5: Commit**

```bash
git add src/lib/markdownLite.tsx
git add tests/markdownCodeBlock.test.tsx
git commit -m "Sohbet: kod blogunda baslik seridi kalkti, Kopyala kosede" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 4: Gösterge konuşmanın sonunda, soru kartı satır satır

**Dosyalar:**
- Değiştir: `src/components/ChatBubble.tsx` (`ThinkingBubble` l.528-672, `AskUserCard` l.753-822)
- Değiştir: `src/components/ChatSessionPane.tsx` (l.322-338, l.748, l.866-953)
- Test: `tests/chatSessionPane.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: `ChatToolRun`; Görev 2'deki `ChatBubble` `onRegenerate` prop'u.
- Üretir (sonraki testler bunları kullanıyor):
  - mesaj listesi `data-testid="chat-messages"`;
  - canlı tur `data-testid="turn-live"`;
  - `tests/chatSessionPane.test.tsx` içinde `renderPane(overrides)` fikstürü. Görev 5, 6 ve 7 bu dosyaya test ekliyor.

- [ ] **Adım 1: Test fikstürünü ve başarısız testleri yaz**

`tests/chatSessionPane.test.tsx`:
- `ChatSessionPane`'in bütün zorunlu prop'larını (l.153-210) bir `baseProps` nesnesinde doldur.
- Geri çağrılar `vi.fn()` olsun.
- `session` şu alanlarla kurulsun:
  - `messages: []`, `draft: ""`, `attachments: []`, `pending: false`;
  - `activity: null`, `activitySteps: []`, `pendingAsk: null`, `stalledMinutes: 0`;
  - `model: ""`, `contextTokens: 0`, `contextLimit: 0`, `todos: []`;
  - `ChatSessionData`'nın (l.114-151) öteki zorunlu alanları.

İskelet:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChatSessionPane, { type ChatSessionData } from "../src/components/ChatSessionPane";
import type { ChatMessage } from "../src/components/ChatBubble";

// window.api — tests/chatHomeBehaviour.test.tsx'teki Proxy deseni.
const impl: Record<string, (...args: unknown[]) => unknown> = {};
let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = new Proxy(
    {},
    {
      get: (_t, key: string) =>
        impl[key] ?? (key.startsWith("on") ? () => () => {} : () => new Promise(() => {}))
    }
  );
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const k of Object.keys(impl)) delete impl[k];
  (window as unknown as { api: unknown }).api = prevApi;
});

const msg = (id: string, role: "user" | "assistant", content = id): ChatMessage =>
  ({ id, role, content, createdAt: Date.now() }) as ChatMessage;

const baseSession = (): ChatSessionData => ({
  /* ChatSessionData'nın bütün zorunlu alanları — yukarıdaki listeye bak */
}) as ChatSessionData;

const baseProps = () => ({
  /* ChatSessionPane'in zorunlu prop'ları: active: true, session: baseSession(),
     geri çağrılar vi.fn(), models: [], modelsLoading: false, ... */
});

export function renderPane(overrides: Record<string, unknown> = {}, session: Partial<ChatSessionData> = {}) {
  const props = { ...baseProps(), ...overrides, session: { ...baseSession(), ...session } };
  const utils = render(
    <LanguageProvider language="tr">
      <ChatSessionPane {...(props as never)} />
    </LanguageProvider>
  );
  const rerenderWith = (next: Partial<ChatSessionData>) =>
    utils.rerender(
      <LanguageProvider language="tr">
        <ChatSessionPane {...(props as never)} session={{ ...props.session, ...next }} />
      </LanguageProvider>
    );
  return { ...utils, props, rerenderWith };
}

describe("ChatSessionPane liste", () => {
  it("canlı tur listenin SON öğesi ve yapışık değil", () => {
    renderPane({}, {
      messages: [msg("u1", "user"), msg("a1", "assistant")],
      pending: true,
      activity: "tool",
      activitySteps: [{ phase: "tool", tool: "view", callId: "c1" }]
    });
    const list = screen.getByTestId("chat-messages");
    const live = screen.getByTestId("turn-live");
    expect(list.contains(live)).toBe(true);
    expect(live.className).not.toContain("sticky");
    expect(live.parentElement?.lastElementChild).toBe(live);
    expect(screen.getByText("1 araç işlemi")).toBeTruthy();
  });

  it("Yeniden üret yalnız son cevapta", () => {
    renderPane({ onRegenerate: vi.fn() }, {
      messages: [msg("u1", "user"), msg("a1", "assistant"), msg("u2", "user"), msg("a2", "assistant")]
    });
    expect(screen.getAllByTitle("Son cevabı sil ve yeniden üret").length).toBe(1);
  });

  // Review Focus 1
  it("dipteyken yeni adım görünümü aşağı taşıyor, yukarıdayken taşımıyor", () => {
    const steps = [{ phase: "tool" as const, tool: "view", callId: "c1" }];
    const { rerenderWith } = renderPane({}, { messages: [msg("u1", "user")], pending: true, activitySteps: steps });
    const list = screen.getByTestId("chat-messages");
    const setBox = (scrollTop: number) => {
      Object.defineProperty(list, "scrollHeight", { configurable: true, value: 2000 });
      Object.defineProperty(list, "clientHeight", { configurable: true, value: 500 });
      list.scrollTop = scrollTop;
      act(() => {
        list.dispatchEvent(new Event("scroll"));
      });
    };

    setBox(1500); // dipte
    rerenderWith({ activitySteps: [...steps, { phase: "tool", tool: "bash", callId: "c2" }] });
    expect(list.scrollTop).toBe(2000);

    setBox(200); // yukarıda
    rerenderWith({
      activitySteps: [...steps, { phase: "tool", tool: "bash", callId: "c2" }, { phase: "tool", tool: "grep", callId: "c3" }]
    });
    expect(list.scrollTop).toBe(200);
  });
});
```

Otomatik kaydırma etkisi (l.330-338) `scrollTop = scrollHeight` yerine `scrollTo`/`scrollIntoView` kullanıyorsa beklentiyi ona göre kur. Örneğin `scrollTo` casusunun çağrı sayısını ölç. Kaydırmanın gerçek mekanizmasını l.330-338 ve l.520-536'dan oku; testi ona göre yaz, mekanizmayı teste göre değiştirme.

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/chatSessionPane.test.tsx`
Beklenen: FAIL, `chat-messages`/`turn-live` bulunamadı.

- [ ] **Adım 3: `ThinkingBubble`'ı tek satıra indir**

- `detailOpen`, `detail`, `toolLabel` ve `step` tanımlarını sil.
- l.602-669'daki araç kutusunu tamamen sil.
- Dönüş yalnız durum satırı:

```tsx
    <div className="flex items-center gap-2 text-2xs" role="status" aria-label={label}>
      <span className="chat-breathe block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
      <span className="text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5 pl-1 tabular-nums text-slate-600">
        {all.length > 1 && <span>{t("axetCodeHome.phaseStepCount", { count: String(all.length) })}</span>}
        {seconds > 0 && <span>{t("axetCodeHome.phaseElapsed", { seconds: String(seconds) })}</span>}
      </span>
    </div>
```

Yorumlar:
- Üstteki uzun tarihçe yorumuna 5. maddeyi ekle: "(2026-09-29) Araç satırı göstergeden ayrıldı. Adımlar artık `ChatToolRun`'da, konuşmanın sonunda duruyor. Gösterge yalnız durum, adım sayısı ve süre."
- Artık doğru olmayan "SABİT YÜKSEKLİKTE, iki satır" çizimini kaldır.

Sonra:
- `useToolLabel` artık ChatBubble'da kullanılmıyorsa importtan çıkar.
- `StepDetail` importu da kullanılmıyorsa çıkar.

- [ ] **Adım 4: `AskUserCard` seçenekleri satır satır**

- Seçenek kapsayıcısı (l.753) `flex flex-col gap-1.5` olsun.
- Seçenek düğmesinin sınıfı:
  ```
  flex w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-xs leading-tight transition-colors
  ```
  Seçili ve seçili değil renkleri aynen kalıyor. `hover:-translate-y-px` siliniyor.
- "Kendi cevabım" ve çoklu "Gönder" düğmeleri kapsayıcının DIŞINA, ayrı bir `<div className="flex flex-wrap gap-1.5">` satırına taşınsın.
  - `rounded-full` yerine `rounded-lg`.
  - `text-[12.5px]` yerine `text-xs`.
  - `transition-all duration-150` yerine `transition-colors`.
  - `hover:-translate-y-px` ve `disabled:hover:translate-y-0` siliniyor.
- Çoklu seçim ipucundaki `text-[11px]` `text-2xs` olsun.

- [ ] **Adım 5: Pane listesini düzenle**

`src/components/ChatSessionPane.tsx` içinde:

1. **Silinecekler**
   - `lastUserIndex`/`indicatorAfter` (l.327-328);
   - liste içindeki yapışık gösterge bloğu (l.904-917);
   - yedek gösterge (l.923-934);
   - yazılı "Yeniden üret" düğmesi (l.940-952).
2. **ChatBubble'a yeni prop**
   ```tsx
   onRegenerate={canRegenerate && index === session.messages.length - 1 ? onRegenerate : undefined}
   ```
   `onRegenerate` AxetCodeHome'da `useCallback` (l.1559). Kararlı olduğu için memo bozulmuyor.
3. **Listenin sonuna, map'ten sonra**
   ```tsx
            {/* CANLI TUR — konuşmanın SONUNDA, yapışık değil. Eskiden gösterge
                son istemin altına yapışıyordu; araç adımları ayrı bir satıra
                (`ChatToolRun`) taşınınca en doğal yeri, cevabın geleceği yer
                oldu. Otomatik kaydırma adım sayısını da izliyor (aşağıda). */}
            {session.pending && (
              <div data-testid="turn-live" className="flex flex-col gap-2">
                {session.activitySteps.length > 0 && (
                  <ChatToolRun steps={session.activitySteps} status="running" />
                )}
                <ThinkingBubble
                  phase={session.activity}
                  steps={session.activitySteps}
                  stalledMinutes={session.stalledMinutes}
                />
                {session.pendingAsk && <AskUserCard ask={session.pendingAsk} onAnswer={onAnswerQuestion} />}
              </div>
            )}
   ```
   Bu blok liste kapsayıcısının son çocuğu olmalı.
4. **Mesaj listesi div'i (l.748)** `data-testid="chat-messages"` alsın.
5. **Otomatik kaydırma etkisi (l.330-338)** bağımlılıklarına `session.activitySteps.length` ve `session.pendingAsk` eklensin. Etkinin "kullanıcı dipte mi" korumasına dokunma.
6. **Temizlik**
   - `import ChatToolRun from "./ChatToolRun";` ekle.
   - Artık kullanılmayan `RefreshCw` ve `btn` importlarını kaldır. `btn` başka yerde kullanılıyorsa kalır; `grep -n "btn\." src/components/ChatSessionPane.tsx` ile bak.

- [ ] **Adım 6: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatSessionPane.test.tsx`, `npm run -s typecheck`, `npx vitest run`.
Beklenen: PASS. `tests/chatHomeBehaviour.test.tsx` "Yeniden üret" metnini ya da yapışık göstergeyi arıyorsa beklentiyi yeni düzene çevir: başlık `title` ile aransın, gösterge `turn-live` içinde.

- [ ] **Adım 7: Commit**

```bash
git add src/components/ChatBubble.tsx
git add src/components/ChatSessionPane.tsx
git add tests/chatSessionPane.test.tsx
git commit -m "Sohbet: gosterge ve soru karti konusmanin sonunda, secenekler satir satir" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 5: `ChatComposer` — 3 satırlık kutu ve araç çubuğu

**Dosyalar:**
- Oluştur: `src/components/ChatComposer.tsx`
- Değiştir: `src/components/ChatSessionPane.tsx`
  - taşınanlar: sabitler l.101-112, ref'ler l.282-284, bahis durumu l.289-295, ölçüm l.394-439, bahis mantığı l.441-518, `canSend`/`handlePaste` l.578-586, kutu l.1032-1283, `MentionMenu` l.1303-1360;
  - silinenler: feragat ve `ContextMeter` l.1288-1291 ile l.1436-1456.
- Test: `tests/chatComposer.test.tsx` (yeni)

**Arayüzler:**
- Tüketir: pane'in mevcut prop'ları (aynı adlarla aktarılıyor).
- Üretir:

```ts
export interface ChatComposerProps {
  active: boolean;
  draft: string;
  attachments: ChatAttachment[];
  pending: boolean;
  /** Boş kutuda ↑ ile geri çağrılacak son istem. */
  recallText: string;
  models: AxetModelEntry[];
  model: string;
  modelsLoading: boolean;
  modelsError: string | null;
  onSelectModel: (id: string) => void;
  attaching: boolean;
  onAttachFiles: () => void;
  onRemoveAttachment: (id: string) => void;
  onFilesResolved: (paths: string[]) => void;
  registerTextarea: (el: HTMLTextAreaElement | null) => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  /** Bahis araması bu klasörde yapılıyor; yoksa `@` menüsü açılmıyor. */
  contextPath?: string | null;
  contextTokens: number;
  contextLimit: number;
}
export default function ChatComposer(props: ChatComposerProps): JSX.Element;
export function ContextRing({ tokens, limit }: { tokens: number; limit: number }): JSX.Element | null;
```

Tiplerin hepsi pane'in şu anki props tanımından (l.153-210) birebir alınıyor. Oradaki tip farklıysa (örneğin `modelsError?: string`) oradakini kullan. Görev 6 bu arayüze sistem sekmesi prop'larını ekliyor.

- [ ] **Adım 1: Başarısız testi yaz**

`tests/chatComposer.test.tsx`. Aynı `window.api` Proxy'si Görev 4'teki gibi kuruluyor.

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { LanguageProvider } from "../src/i18n";
import ChatComposer, { type ChatComposerProps } from "../src/components/ChatComposer";

const impl: Record<string, (...args: unknown[]) => unknown> = {};
let prevApi: unknown;
beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = new Proxy(
    {},
    { get: (_t, key: string) => impl[key] ?? (key.startsWith("on") ? () => () => {} : () => new Promise(() => {})) }
  );
});
afterEach(() => {
  cleanup();
  for (const k of Object.keys(impl)) delete impl[k];
  (window as unknown as { api: unknown }).api = prevApi;
});

const base = (): ChatComposerProps => ({
  active: true,
  draft: "",
  attachments: [],
  pending: false,
  recallText: "",
  models: [],
  model: "",
  modelsLoading: false,
  modelsError: null,
  onSelectModel: vi.fn(),
  attaching: false,
  onAttachFiles: vi.fn(),
  onRemoveAttachment: vi.fn(),
  onFilesResolved: vi.fn(),
  registerTextarea: vi.fn(),
  onDraftChange: vi.fn(),
  onSend: vi.fn(),
  onCancel: vi.fn(),
  contextPath: "C:/p",
  contextTokens: 0,
  contextLimit: 0
});

const renderComposer = (over: Partial<ChatComposerProps> = {}) => {
  const props = { ...base(), ...over };
  render(
    <LanguageProvider language="tr">
      <ChatComposer {...props} />
    </LanguageProvider>
  );
  return props;
};

// Taslağı gerçekten tutan sarmalayıcı — bahis menüsü taslağın değişmesine bakıyor.
function Stateful(over: Partial<ChatComposerProps>) {
  const [draft, setDraft] = useState("");
  return <ChatComposer {...base()} {...over} draft={draft} onDraftChange={setDraft} />;
}

describe("ChatComposer", () => {
  it("3 satırla başlıyor", () => {
    renderComposer();
    expect(screen.getByRole("textbox").getAttribute("rows")).toBe("3");
  });

  it("Enter gönderir, Shift+Enter göndermez", () => {
    const props = renderComposer({ draft: "merhaba" });
    const box = screen.getByRole("textbox");
    fireEvent.keyDown(box, { key: "Enter", shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it("bahis menüsü açıkken Enter göndermiyor, seçimi uyguluyor", async () => {
    impl.searchFiles = async () => ({ ok: true, entries: [{ path: "C:/p/a.txt", rel: "a.txt" }] });
    const onSend = vi.fn();
    render(
      <LanguageProvider language="tr">
        <Stateful onSend={onSend} />
      </LanguageProvider>
    );
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "@a", selectionStart: 2, selectionEnd: 2 } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(screen.getByText("a.txt")).toBeTruthy();
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onSend).not.toHaveBeenCalled();
    expect(box.value).toBe("@a.txt ");
  });

  it("gönder ve durdur geçişi", () => {
    const props = renderComposer({ pending: true });
    fireEvent.click(screen.getByTitle("Durdur"));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    cleanup();
    renderComposer({ draft: "" });
    expect((screen.getByTitle("Gönder") as HTMLButtonElement).disabled).toBe(true);
  });

  it("bağlam halkası: ölçüm yokken yok, %60 uyarı, %80 tehlike", () => {
    renderComposer();
    expect(screen.queryByTestId("context-ring")).toBeNull();
    cleanup();
    renderComposer({ contextTokens: 50, contextLimit: 100 });
    expect(screen.getByTestId("context-ring").dataset.tone).toBe("normal");
    cleanup();
    renderComposer({ contextTokens: 60, contextLimit: 100 });
    expect(screen.getByTestId("context-ring").dataset.tone).toBe("warning");
    cleanup();
    renderComposer({ contextTokens: 80, contextLimit: 100 });
    expect(screen.getByTestId("context-ring").dataset.tone).toBe("danger");
  });

  // Review Focus 3
  it("boyama katmanı ile yazı alanı aynı ölçüleri taşıyor, yatay dolgu yok", () => {
    renderComposer({ draft: "@a.txt merhaba" });
    const box = screen.getByRole("textbox");
    const overlay = box.previousElementSibling as HTMLElement;
    const pick = (cls: string) =>
      cls.split(/\s+/).filter((c) => /^(py-|pt-|pb-|leading-|text-\[length)/.test(c)).sort();
    expect(pick(overlay.className)).toEqual(pick(box.className));
    for (const el of [overlay, box]) expect(el.className).not.toMatch(/(^|\s)(px|pl)-/);
  });
});
```

"Durdur" ve "Gönder" `axetCodeHome.stopGenerating` ve `axetCodeHome.send` anahtarlarının tr değerleri. Testi yazmadan önce `grep -n '"axetCodeHome.send"\|"axetCodeHome.stopGenerating"' src/i18n/tr.ts` ile doğrula; farklıysa testteki metni düzelt. Bahis menüsündeki öğe metni `MentionMenu`'nün çizdiği alan (`rel`). Farklı bir alan çiziliyorsa beklentiyi ona göre ayarla. Bahis araması `window.api.searchFiles` dışında bir ad kullanıyorsa (l.453-470'e bak) `impl` anahtarını düzelt.

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/chatComposer.test.tsx`
Beklenen: FAIL, modül bulunamadı.

- [ ] **Adım 3: `ChatComposer.tsx`'i oluştur**

1. **Pane'den buraya TAŞI (kes/yapıştır, yorumlarıyla)**
   - `COMPOSER_MAX_PX`, `MENTION_RE`, `MENTION_DEBOUNCE_MS` (l.101-112);
   - `textareaRef`, `overlayRef` (l.282-284);
   - bahis durumu (l.289-295);
   - ölçüm (`measureComposer`, ResizeObserver; l.394-439);
   - taslak temizleme etkisi, bahis araması, `syncMention`, `applyMention`, `dismissMention` (l.441-518);
   - `canSend`, `handlePaste` (l.578-586);
   - textarea `onKeyDown` (l.1146-1202);
   - `MentionMenu` yardımcısı (l.1303-1360).

   `session.draft`, `session.attachments`, `session.pending` ve `session.model` yerine düz prop'ları kullan. Klavye işleyicisi ↑ geri çağırmada son istemi `session.messages`'tan buluyorsa onun yerine `recallText`'i kullan.

2. **Dönüş gövdesi**
   - Kutu l.1086'daki sınıfıyla kalıyor. Yalnız `px-2 py-1.5` yerine `px-3 pb-2 pt-2.5`.
   - Ekler bloğu aynen kalıyor.
   - Yazı alanı:
     - kapsayıcı `relative min-w-0 px-1`;
     - boyama katmanı ve textarea eski sınıflarını koruyor, iki fark var:
       - textarea'da `min-h-[36px]` yerine `min-h-[80px]`;
       - textarea'ya `rows={3}` ekleniyor.
     - İkisinde de yatay dolgu yok. Katmanın `pr-[10px]`'i kalıyor (sağ kaydırma çubuğunun karşılığı; `pr-` testte yasak değil, yalnız `px-`/`pl-` yasak).
   - Araç çubuğu yazı alanının ALTINDA ayrı bir satır:

```tsx
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={onAttachFiles}
                disabled={attaching}
                title={t("axetCodeHome.attachTitle")}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition hover:bg-hover hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
              <div className="ml-auto flex items-center gap-1">
                <ModelSelector
                  models={models}
                  current={model}
                  loading={modelsLoading}
                  error={modelsError}
                  onSelect={onSelectModel}
                  // Tetikleyici ekranın DİBİNDE — menü yukarı açılmalı.
                  direction="up"
                  variant="ghost"
                />
                <ContextRing tokens={contextTokens} limit={contextLimit} />
                {/* (Gönder/durdur düğmesinin "HER ZAMAN çiziliyor" yorumu
                    aynen buraya taşınıyor; ölçü 36px → 32px.) */}
                {pending ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    title={t("axetCodeHome.stopGenerating")}
                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-active text-slate-200 transition hover:bg-active"
                  >
                    <Square size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={!canSend}
                    title={t("axetCodeHome.send")}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                      canSend
                        ? "cursor-pointer bg-accent-500 text-accent-on hover:bg-accent-600"
                        : "cursor-not-allowed bg-active text-slate-600"
                    }`}
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
              </div>
            </div>
```

   - `MentionMenu` kutunun üstünde. Dış kapsayıcı `relative` ve menü eskisi gibi mutlak konumlu.

3. **`ContextRing`**

```tsx
/**
 * Bağlam doluluğu — küçük bir halka. Yüzde yalnız üzerine gelince (`title`)
 * okunuyor: sürekli görünen bir sayı, çoğu zaman önemsiz olan bir bilgiyi
 * gözün önünde tutardı. Renk %60'ta uyarıya, %80'de tehlikeye dönüyor.
 * Ölçüm yokken (yeni oturum, ya da model sınırını bildirmedi) hiç çizilmiyor.
 */
export function ContextRing({ tokens, limit }: { tokens: number; limit: number }) {
  const t = useT();
  if (limit <= 0 || tokens <= 0) return null;
  const pct = Math.min(100, Math.round((tokens / limit) * 100));
  const tone = pct >= 80 ? "danger" : pct >= 60 ? "warning" : "normal";
  const color =
    tone === "danger"
      ? "text-[var(--status-danger-text)]"
      : tone === "warning"
        ? "text-[var(--status-warning-text)]"
        : "text-accent-400";
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <span
      data-testid="context-ring"
      data-tone={tone}
      title={`${t("chatPlan.context", { pct: String(pct) })} · ${t("chatPlan.contextTitle")}`}
      className={`flex h-8 w-6 shrink-0 items-center justify-center ${color}`}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r={r} fill="none" strokeWidth="2" className="stroke-line" />
        <circle
          cx="9"
          cy="9"
          r={r}
          fill="none"
          strokeWidth="2"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          strokeLinecap="round"
          transform="rotate(-90 9 9)"
        />
      </svg>
    </span>
  );
}
```

`chatPlan.context` ve `chatPlan.contextTitle` anahtarlarının parametre adlarını tr.ts l.728-730'dan doğrula. Eski `ContextMeter` (pane l.1436-1456) hangi parametreyi geçiyorsa onu kullan.

4. **Importlar:** `Plus`, `ArrowUp`, `Square`, `X` (menüde kullanılıyorsa), `ModelSelector`, `AttachmentChip`, `renderWithMentions`, `MENTION_CLASS`, `useT` ve tipler.

- [ ] **Adım 4: Pane'i `ChatComposer`'a bağla**

- Pane'de taşınan her şeyi sil, yerine şunu koy:

```tsx
          <ChatComposer
            active={active}
            draft={session.draft}
            attachments={session.attachments}
            pending={session.pending}
            recallText={recallText}
            models={models}
            model={session.model}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            onSelectModel={onSelectModel}
            attaching={attaching}
            onAttachFiles={onAttachFiles}
            onRemoveAttachment={onRemoveAttachment}
            onFilesResolved={onFilesResolved}
            registerTextarea={registerTextarea}
            onDraftChange={onDraftChange}
            onSend={onSend}
            onCancel={onCancel}
            contextPath={contextPath}
            contextTokens={session.contextTokens}
            contextLimit={session.contextLimit}
          />
```

- `recallText`:

```tsx
  // ↑ ile geri çağrılacak son istem. Composer mesaj listesini bilmiyor.
  const recallText = useMemo(() => {
    for (let i = session.messages.length - 1; i >= 0; i--)
      if (session.messages[i].role === "user") return session.messages[i].content;
    return "";
  }, [session.messages]);
```

- Feragat `<p>`'sini ve `ContextMeter`'ı (l.1288-1291, l.1436-1456) sil. Dock'ta PlanPanel, editUndo, cancelStuck ve "aşağı in" düğmesi yerinde kalıyor.
- Ctrl+F ya da başka bir etki `textareaRef` kullanıyorsa `registerTextarea` üzerinden gelen öğeyi kullan, ya da pane'de ayrı bir ref tut. Yeni bir yol uydurma: pane l.357-368'e bak.
- Kullanılmayan importları temizle: `Paperclip`, `ArrowUp`, `Square`, `ModelSelector`, `renderWithMentions`, `FsSearchFilesEntry` vb.
- Sürükle-bırak işleyicileri pane'de kalıyor.

- [ ] **Adım 5: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatComposer.test.tsx tests/dragToChat.test.tsx tests/chatSessionPane.test.tsx`, sonra `npm run -s typecheck` ve `npx vitest run`.
Beklenen: PASS. Kaynak metin arayan eski bir test bir kalıbı ChatSessionPane.tsx'te arıyorsa (örneğin `MENTION_RE`) dosya yolunu `ChatComposer.tsx` olarak düzelt. Sürükle-bırak testi pane'de kalmalı.

- [ ] **Adım 6: Commit**

```bash
git add src/components/ChatComposer.tsx
git add src/components/ChatSessionPane.tsx
git add tests/chatComposer.test.tsx
git commit -m "Sohbet: yazma kutusu ChatComposer'a ayrildi, 3 satir ve ayri arac cubugu" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Değişen başka test dosyası varsa onu da ayrı `git add` ile ekle.

---

### Görev 6: Kutuya yapışık sistem sekmesi ve doğru rozet

**Dosyalar:**
- Oluştur: `src/lib/contextTier.ts`
- Değiştir: `src/components/ChatComposer.tsx`, `src/components/ChatSessionPane.tsx` (bağlam şeridi l.620-667, arama katmanı l.672-729), `src/components/AxetCodeHome.tsx` (l.2207-2330)
- Test: `tests/contextTier.test.ts`, `tests/chatComposer.test.tsx`, `tests/chatSessionPane.test.tsx`

**Arayüzler:**
- Tüketir: `ActiveSapContext` ve `SystemTier` (`app-electron/shared/types.ts` l.54, l.502); `TierBadge` (`src/components/TierBadge.tsx`, `{ tier: SystemTier; className?: string }`).
- Üretir:
  - `export function contextTierFor(cwd: string | null | undefined, activeSap: ActiveSapContext | null): SystemTier | null`;
  - `ChatComposerProps`'a eklenenler:

```ts
  contextLabel?: string | null;
  contextTier?: SystemTier | null;
  onOpenInstructions?: () => void;
  filesPanelOpen?: boolean;
  onToggleFilesPanel?: () => void;
```

  - `ChatSessionPane` prop'larına `contextTier?: SystemTier | null` ekleniyor.

- [ ] **Adım 1: Başarısız testleri yaz**

`tests/contextTier.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contextTierFor } from "../src/lib/contextTier";
import type { ActiveSapContext } from "../app-electron/shared/types";

const sap = (projectDir: string, tier: ActiveSapContext["tier"]) =>
  ({ projectDir, tier }) as ActiveSapContext;

describe("contextTierFor", () => {
  it("sohbetin klasörü bağlı sistemin klasörüyse rozet o sistemin", () => {
    expect(contextTierFor("C:\\Proj\\P01\\", sap("c:/proj/p01", "PRD"))).toBe("PRD");
  });

  // Review Focus 5
  it("başka sistemin klasöründeki eski sohbette rozet yok", () => {
    expect(contextTierFor("C:/Proj/D01", sap("C:/Proj/P01", "PRD"))).toBeNull();
  });

  it("bağlı sistem, klasör ya da seviye yoksa null", () => {
    expect(contextTierFor("C:/Proj/P01", null)).toBeNull();
    expect(contextTierFor("", sap("C:/Proj/P01", "PRD"))).toBeNull();
    expect(contextTierFor("C:/Proj/P01", sap("C:/Proj/P01", null))).toBeNull();
  });
});
```

`SystemTier` değerlerini l.54'ten doğrula (örneğin `"PRD"` mi `"prod"` mu) ve testi ona göre yaz.

`tests/chatComposer.test.tsx`'e:

```tsx
describe("sistem sekmesi", () => {
  it("rozet yalnız contextTier varken; klasör adı son parça, tam yol title'da", () => {
    renderComposer({ contextPath: "C:/Proj/P01", contextLabel: "P01 Üretim" });
    const tab = screen.getByTestId("system-tab");
    expect(tab.textContent).toContain("P01 Üretim");
    expect(screen.getByTitle("C:/Proj/P01").textContent).toBe("P01");
    expect(tab.querySelector("[data-tier]")).toBeNull();
    cleanup();
    renderComposer({ contextPath: "C:/Proj/P01", contextLabel: "P01 Üretim", contextTier: "PRD" });
    expect(screen.getByTestId("system-tab").querySelector("[data-tier]")).toBeTruthy();
  });

  it("Dosyalar ve Talimatlar geri çağrıları", () => {
    const onToggleFilesPanel = vi.fn();
    const onOpenInstructions = vi.fn();
    renderComposer({ contextPath: "C:/p", onToggleFilesPanel, onOpenInstructions });
    fireEvent.click(screen.getByText("Dosyalar"));
    fireEvent.click(screen.getByText("Yönergeler"));
    expect(onToggleFilesPanel).toHaveBeenCalledTimes(1);
    expect(onOpenInstructions).toHaveBeenCalledTimes(1);
  });

  it("klasör yoksa sekme yok", () => {
    renderComposer({ contextPath: null });
    expect(screen.queryByTestId("system-tab")).toBeNull();
  });

  // Review Focus 2
  it("uzun adlar kırpılıyor, sekme kutudan geniş olmuyor, düğmeler küçülmüyor", () => {
    renderComposer({
      contextPath: "C:/" + "cok-uzun-klasor-".repeat(10),
      contextLabel: "Çok uzun bir sistem adı ".repeat(5),
      onToggleFilesPanel: vi.fn(),
      onOpenInstructions: vi.fn()
    });
    const tab = screen.getByTestId("system-tab");
    expect(tab.className).toContain("max-w-full");
    expect(tab.className).toContain("min-w-0");
    const label = screen.getByTestId("system-tab-label");
    const folder = screen.getByTestId("system-tab-folder");
    for (const el of [label, folder]) {
      expect(el.className).toContain("truncate");
      expect(el.className).toContain("min-w-0");
    }
    for (const text of ["Dosyalar", "Yönergeler"])
      expect(screen.getByText(text).closest("button")!.className).toContain("shrink-0");
  });
});
```

Kontroller:
- `TierBadge` kök öğesinde `data-tier` yoksa, testte rozeti rozetin metniyle ara (`screen.queryByText("PROD")` gibi; TierBadge.tsx'e bak). TierBadge'e yeni öznitelik eklenmiyor.
- "Dosyalar" metni `axetCodeHome.contextFiles`'ın tr değeri. l.276'dan doğrula.

`tests/chatSessionPane.test.tsx`'e:

```tsx
it("bağlam şeridi yok, arama katmanı top-2", () => {
  renderPane({ contextPath: "C:/p", contextLabel: "P01" });
  expect(document.querySelector(".top-9")).toBeNull();
  fireEvent.keyDown(window, { key: "f", ctrlKey: true });
  expect(screen.getByPlaceholderText(/ara/i).closest(".top-2")).toBeTruthy();
});
```

Ctrl+F dinleyicisinin bağlandığı hedefi l.357-368'den doğrula (`window` mu, `document` mı). `chatSearch.placeholder` değerini l.740'tan oku ve düzenli ifadeyi ona göre ayarla. `fireEvent` importunu ekle.

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/contextTier.test.ts tests/chatComposer.test.tsx tests/chatSessionPane.test.tsx`
Beklenen: FAIL.

- [ ] **Adım 3: `contextTier.ts`'i yaz**

```ts
import type { ActiveSapContext, SystemTier } from "../../app-electron/shared/types";

// Yol karşılaştırması Windows'a göre: ters/düz eğik çizgi ve büyük/küçük harf
// fark etmiyor, sondaki ayraç yok sayılıyor.
const norm = (p: string) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

/**
 * Sohbetin sekmesinde gösterilecek seviye rozeti.
 *
 * Rozet YALNIZCA sohbetin klasörü şu an bağlı sistemin klasörüyse çıkıyor.
 * B sistemine bağlıyken A'nın eski sohbeti açılırsa rozet hiç çıkmıyor —
 * yanlış bir "DEV" rozeti, olmayan bir rozetten çok daha tehlikeli.
 */
export function contextTierFor(
  cwd: string | null | undefined,
  activeSap: ActiveSapContext | null
): SystemTier | null {
  if (!cwd || !activeSap?.projectDir || !activeSap.tier) return null;
  return norm(cwd) === norm(activeSap.projectDir) ? activeSap.tier : null;
}
```

- [ ] **Adım 4: Sekmeyi `ChatComposer`'a ekle**

`ChatComposerProps`'a yukarıdaki beş alanı ekle. Kutunun hemen ÜSTÜNE:

```tsx
        {/* SİSTEM SEKMESİ — kutuya yapışık (taslakta seçilen A). Eskiden
            sohbetin tepesinde dolgulu bir şerit vardı; yazarken göz kutuda,
            PROD'da olunduğu tam oraya yazılmalı. Klasör yoksa sekme de yok.
            Dar pencerede ad ve klasör kırpılıyor, düğmeler küçülmüyor. */}
        {contextPath && (
          <div
            data-testid="system-tab"
            className="flex w-fit min-w-0 max-w-full items-center gap-2 rounded-t-lg border border-b-0 border-line-subtle bg-card px-2.5 py-1 text-2xs"
          >
            {contextTier && <TierBadge tier={contextTier} className="shrink-0" />}
            <span data-testid="system-tab-label" className="min-w-0 truncate font-medium text-slate-200">
              {contextLabel ?? t("axetCodeHome.contextWorkspace")}
            </span>
            <span
              data-testid="system-tab-folder"
              title={contextPath}
              className="min-w-0 truncate font-mono text-slate-500"
            >
              {basename(contextPath)}
            </span>
            {onToggleFilesPanel && (
              <button
                type="button"
                onClick={onToggleFilesPanel}
                title={t("axetCodeHome.contextFilesHint")}
                aria-pressed={filesPanelOpen}
                className={`flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 transition hover:text-slate-200 ${
                  filesPanelOpen ? "text-accent-400" : "text-slate-400"
                }`}
              >
                <FolderOpen size={12} className="text-[var(--module-gui-text,currentColor)]" />
                {t("axetCodeHome.contextFiles")}
              </button>
            )}
            {onOpenInstructions && (
              <button
                type="button"
                onClick={onOpenInstructions}
                title={t("chatInstructions.title")}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded px-1 text-slate-400 transition hover:text-slate-200"
              >
                <BookOpen size={12} />
                {t("chatInstructions.button")}
              </button>
            )}
          </div>
        )}
```

Ayrıntılar:
- İkon renkleri eski şeritteki (pane l.620-667) sınıflarla aynen alınıyor. Yukarıdaki `--module-gui-text` yalnız yer tutucu; oradaki gerçek sınıfı kopyala.
- `basename`:
  ```ts
  const basename = (p: string) => p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;
  ```
- Kutunun sınıfına sekme varken `rounded-tl-none` ekleniyor:
  ```tsx
  className={`rounded-2xl ${contextPath ? "rounded-tl-none " : ""}border ...`}
  ```
- Importlar: `FolderOpen`, `BookOpen`, `TierBadge`, `SystemTier`.

- [ ] **Adım 5: Pane'den şeridi kaldır, prop'ları aktar**

- Bağlam şeridini (l.620-667) sil.
- Arama katmanındaki `contextPath ? "top-9" : "top-2"` ifadesi düz `top-2` olsun.
- Pane prop'larına `contextTier?: SystemTier | null` ekle.
- `ChatComposer`'a `contextLabel`, `contextTier`, `onOpenInstructions`, `filesPanelOpen` ve `onToggleFilesPanel`'ı geçir.
- Kullanılmayan `Server`, `FolderOpen` ve `BookOpen` importlarını kaldır.

- [ ] **Adım 6: AxetCodeHome'dan rozeti geçir**

- `import { contextTierFor } from "../lib/contextTier";` ekle.
- Mevcut oturum panelleri (l.2207-2270):
  ```tsx
  contextTier={contextTierFor(session.cwd || workspaceDir, activeSap)}
  ```
- Yeni oturum paneli (l.2276+):
  ```tsx
  contextTier={contextTierFor(effectiveNewBinding?.cwd || workspaceDir, activeSap)}
  ```
- `activeSap` değişkeninin bu bileşendeki gerçek adını doğrula: `grep -n "activeSap" src/components/AxetCodeHome.tsx | head`. Farklıysa onu kullan.

- [ ] **Adım 7: Testleri çalıştır**

Çalıştır: `npx vitest run tests/contextTier.test.ts tests/chatComposer.test.tsx tests/chatSessionPane.test.tsx`, `npm run -s typecheck`, `npx vitest run`.
Beklenen: PASS.

- [ ] **Adım 8: Commit**

```bash
git add src/lib/contextTier.ts
git add src/components/ChatComposer.tsx
git add src/components/ChatSessionPane.tsx
git add src/components/AxetCodeHome.tsx
git add tests/contextTier.test.ts
git add tests/chatComposer.test.tsx
git add tests/chatSessionPane.test.tsx
git commit -m "Sohbet: sistem bilgisi kutuya yapisik sekmede, rozet yalniz bagli sistemin klasorunde" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 7: Sade boş ekran

**Dosyalar:**
- Değiştir: `src/components/ChatSessionPane.tsx` (boş ekran l.749-864, `greeting` prop'u, `Eyebrow` importu)
- Değiştir: `src/components/AxetCodeHome.tsx` (`greetingKey` l.103-109, l.2036, l.2164-2178, iki `greeting=` geçişi)
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Değiştir: `tests/eyebrow.test.tsx:54-61`
- Test: `tests/chatSessionPane.test.tsx`

**Arayüzler:** `ChatSessionPane`'den `greeting: string` prop'u siliniyor. Görev 4'teki test fikstüründen de çıkar.

- [ ] **Adım 1: Başarısız testi yaz**

`tests/chatSessionPane.test.tsx`'e:

```tsx
describe("boş ekran", () => {
  it("selamlama ve Hızlı başlangıç yok, soru başlığı var", () => {
    renderPane({ suggestionKeys: ["sgArchitecture", "sgTests", "sgDebug"] });
    expect(screen.queryByText("Hızlı başlangıç")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Bugün ne yapalım?");
  });

  it("karta tıklamak metni kutuya koyuyor, göndermiyor", () => {
    const { props } = renderPane({ suggestionKeys: ["sgArchitecture", "sgTests", "sgDebug"] });
    const card = screen.getAllByRole("button").find((b) => b.dataset.suggestion === "sgArchitecture")!;
    fireEvent.click(card);
    expect(props.onSuggestionClick).toHaveBeenCalledTimes(1);
    expect(props.onSend).not.toHaveBeenCalled();
  });
});
```

- Öneri anahtarlarının pane'e hangi prop adıyla geldiğini l.153-210'dan doğrula (`suggestionKeys` / `suggestions`). Test ona göre.
- Karta `data-suggestion={key}` özniteliği bu görevde ekleniyor.

- [ ] **Adım 2: Testin başarısız olduğunu gör**

Çalıştır: `npx vitest run tests/chatSessionPane.test.tsx`
Beklenen: FAIL. "Hızlı başlangıç" bulundu, ya da `data-suggestion` yok.

- [ ] **Adım 3: Boş ekranı yeniden yaz**

l.749-864'ü şu düzenle değiştir:
- `axetUpdate` satırı (l.791-803) içeriğiyle aynen korunuyor.
- Kartların `onClick`'i ve metin kaynağı eskisiyle aynı.
- `SUGGESTION_ICONS` ve `SUGGESTION_TINTS` aynen kullanılıyor.

```tsx
          {session.messages.length === 0 ? (
            // BOŞ EKRAN — ortalı: logo, tek soru, düz kartlar. Renk geçişli
            // büyük selamlama ve "Hızlı başlangıç" etiketi kalktı (2026-09-29):
            // yazma kutusu zaten ekranın dibinde bekliyor, üstündeki her şey
            // yalnız bir başlangıç önerisi.
            <div className={`${COLUMN} flex min-h-full flex-col items-center justify-center py-10 text-center`}>
              <img src={logo} alt="" width={40} height={40} className="mb-4 rounded-xl" />
              <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
                {t("axetCodeHome.heroSubtitle")}
              </h1>
              {/* (axetUpdate satırı — l.791-803 — aynen buraya) */}
              <div className="mt-6 grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-3">
                {suggestionKeys.map((key, i) => {
                  const Icon = SUGGESTION_ICONS[key] ?? Sparkles;
                  return (
                    <button
                      key={key}
                      type="button"
                      data-suggestion={key}
                      onClick={() => onSuggestionClick(/* eski çağrıyla aynı argüman */)}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-line-subtle bg-card px-3 py-2.5 text-sm text-slate-300 transition hover:border-line hover:bg-hover hover:text-slate-100"
                    >
                      <Icon size={15} className={`mt-0.5 shrink-0 ${SUGGESTION_TINTS[i % SUGGESTION_TINTS.length]}`} />
                      <span>{/* eski kart metni */}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
```

- `import logo from "../assets/logo.svg";` ekle. Dosyanın var olduğunu doğrula: `ls src/assets/logo.svg`. Yoksa uygulamada kullanılan logo yolunu `grep -rn "logo.svg" src | head -3` ile bul.
- Kart metni ve `onSuggestionClick` argümanı eski gridin (l.817-863) içinden birebir alınıyor. `SUGGESTION_TINTS`'in öğe tipi sınıf değilse (örneğin stil nesnesiyse) eski kullanım biçimini koru.
- `greeting` prop'unu props arayüzünden ve parametre listesinden sil.
- `Eyebrow` importunu sil.
- Artık kullanılmayan importları temizle (`--chat-hero-*` kullanan inline stil gidiyorsa ilgili sabitler dahil).

- [ ] **Adım 4: AxetCodeHome'dan selamlama kodunu sil**

- `greetingKey()` (l.103-109) ve `const greeting = useMemo(greetingKey, [])` (l.2036) siliniyor.
- `baseGreeting`/`displayName`/`greetingText` bloğu (l.2164-2178) siliniyor.
- İki pane'e geçen `greeting={greetingText}` siliniyor.
- `displayName` başka yerde kullanılmıyorsa ve onu besleyen ayar okuması yalnız buna hizmet ediyorsa, okumayı da kaldır. `settingsModal.chatDisplayName*` anahtarları ve ayarın kendisi KALIYOR (Ayarlar ekranı işi).

- [ ] **Adım 5: i18n anahtarlarını sil**

- Önce kullanım kontrolü: `grep -rn "quickStart\|axetCodeHome.greeting" src tests`. Kullanımı kalmayan anahtarlar siliniyor.
- tr.ts: `axetCodeHome.quickStart` (l.179), `axetCodeHome.greeting*` ve `axetCodeHome.greetingWithName` (l.189-193).
- en.ts: aynı anahtarlar (l.155, l.162-166).
- `axetCodeHome.heroSubtitle` KALIYOR.

- [ ] **Adım 6: Eyebrow testini güncelle**

`tests/eyebrow.test.tsx:54-61`:
- Eski elle yazılmış etiket deseni için negatif kontrol iki dosyada da kalıyor.
- `<Eyebrow` bulunma zorunluluğu yalnız `ChatSidebar.tsx` için geçerli.
- ChatSessionPane artık Eyebrow kullanmıyor; bu bilinçli bir karar. Test içine bir satır yorum ekle.

- [ ] **Adım 7: Testleri çalıştır**

Çalıştır: `npx vitest run tests/chatSessionPane.test.tsx tests/eyebrow.test.tsx tests/i18n.test.ts`, `npm run -s typecheck`, `npx vitest run`.
Beklenen: PASS. `tests/chatHomeBehaviour.test.tsx` selamlama metnini arıyorsa beklentiyi "Bugün ne yapalım?" başlığına çevir.

- [ ] **Adım 8: Commit**

```bash
git add src/components/ChatSessionPane.tsx
git add src/components/AxetCodeHome.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/eyebrow.test.tsx
git add tests/chatSessionPane.test.tsx
git commit -m "Sohbet: bos ekran sade - logo, tek soru, duz kartlar" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 8: Plan satırı, boşluk, temizlik ve son kontrol

**Dosyalar:**
- Değiştir: `src/components/ChatSessionPane.tsx` (`PlanPanel` l.1375-1418 civarı)
- Değiştir: `src/App.tsx:345-360`, `src/index.css:179`
- Değiştir: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Değiştir: `tests/designScale.test.ts:90-104`

**Arayüzler:** Dışarıya değişen bir şey yok.

- [ ] **Adım 1: PlanPanel'i çerçevesiz yap**

- `PlanPanel`'in dış kapsayıcısından kenarlık, zemin ve yuvarlaklığı kaldır. Sınıf `mb-1 text-[12px]` olsun, yazı boyu mevcut değerle aynı kalıyor. Mevcut dolgu `text-2xs`/`text-xs` ile ifade edilebiliyorsa onu kullan ve sayaç düşsün.
- Başlık düğmesinin dolgusu `px-1 py-1` olsun.
- Açık listedeki üst kenarlık (`border-t`) siliniyor.
- Satır yine yazma kutusunun hemen üstünde. Davranış (aç/kapa, sayılar) değişmiyor.

- [ ] **Adım 2: Mesaj arası boşluk**

- `src/index.css:179`: `--chat-message-gap: 32px;` → `--chat-message-gap: 16px;`.
- `src/App.tsx:345-360`: yoğunluk ayarına bağlı boşluk değerleri `"12px" : "16px"` olsun (sıkı: 12, normal: 16). `heroSize` ve `--chat-hero-*` değişkenleri yerinde kalıyor; Ayarlar ekranında ele alınacak.

- [ ] **Adım 3: Kullanılmayan i18n anahtarlarını sil**

Önce kontrol:

```bash
grep -rn "axetCodeHome.disclaimer\|axetCodeHome.regenerate\"\|chatBubble.stepsToggle\|axetCodeHome.toolDetailToggle" src tests
```

Kullanımı kalmayanları iki dilden de sil:
- `axetCodeHome.disclaimer` (tr l.202, en l.175);
- `axetCodeHome.regenerate` (tr l.311, en l.258). `regenerateTitle` KALIYOR;
- `chatBubble.stepsToggle` (tr l.725, en l.660);
- `axetCodeHome.toolDetailToggle` (tr l.274, en l.224).

- [ ] **Adım 4: Eskimiş yorumları düzelt**

Şunları ara ve artık doğru olmayan anlatımları yeni düzene göre düzelt:

```bash
grep -rn "feragat\|disclaimer\|ml-\[42px\]\|yapışık gösterge\|Yeniden üret\" düğmesi\|bağlam şeridi" src
```

Örnek: ChatBubble'daki avatar yorumunda "ChatSessionPane'deki Yeniden üret düğmesinin `ml-[42px]` girintisi" cümlesi artık geçersiz; o cümle siliniyor.

- [ ] **Adım 5: designScale sayacını indir**

Ölç:

```bash
grep -rhoE "text-\[[0-9.]+px\]" src | wc -l
```

`tests/designScale.test.ts:90-104`:
- `<= 152` sınırını ölçülen sayıya indir.
- Yorumdaki geçmiş dizisine yeni değeri ekle (`207→205→191→186→154→152→<yeni>`).
- Sayıyı testin kendi saydığı kapsamla doğrula (test yalnız belirli klasörleri sayıyorsa ona uy). Sayı 152'den büyük çıktıysa yeni `text-[Npx]` eklenmiş demektir. Bulup `text-2xs`/`text-xs`'e çevir.

- [ ] **Adım 6: Bütün testler**

Çalıştır: `npm run -s typecheck` ve `npx vitest run`.
Beklenen: ikisi de yeşil. Kırmızı bir test varsa çıktısını olduğu gibi raporla.

- [ ] **Adım 7: Çalışan uygulamada gözle kontrol**

Çalıştır: `npm run dev`.

Açık bir NTT Studio penceresi varsa ona dokunma. `dev` başka bir port/örnek açıyorsa onu kullan.

Kontrol listesi:
1. Dolu sohbet: araç satırı kapalı, özet doğru, açınca sol çizgili liste. Son cevabın altında Kopyala ve Yeniden üret; öteki cevaplarda hover'da çıkıyor.
2. Boş ekran: logo, "Bugün ne yapalım?", kartlar. Karta tıklayınca metin kutuya geliyor, gönderilmiyor.
3. Tur sürerken: araç satırı ve "Düşünüyor" konuşmanın sonunda. Dipteyken takip ediyor, yukarı kaydırınca çekmiyor.
4. Soru kartı: seçenekler satır satır.
5. PROD bağlı sohbet: sekmede PROD rozeti. Başka sistemin eski sohbetinde rozet yok.
6. Dar pencere ve dosya paneli açık: sekme taşmıyor.
7. Uzun taslak ve `@dosya` bahsi: renkli metin imleçle hizalı, kayma yok.

Bulunan her sorunu önce ölç, sonra düzelt; düzeltme ayrı bir commit olsun.

- [ ] **Adım 8: Commit**

```bash
git add src/components/ChatSessionPane.tsx
git add src/App.tsx
git add src/index.css
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/designScale.test.ts
git commit -m "Sohbet: plan satiri cercevesiz, mesaj araligi 16px, kullanilmayan metinler silindi" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Adım 4'te değişen başka dosyalar varsa onları da ayrı `git add` ile ekle.

---

## Kapsam dışı (park edildi)

- Arama sırasında gereksiz yeniden çizim.
- Ctrl+F odağı.
- `scriptApiFake.tsx:104` Symbol Proxy.
- Korunmasız `handleSaveConfig`.
- `chatDisplayName` ayarı ve `--chat-hero-size`. Artık hiçbir şey okumuyor; Ayarlar ekranında ele alınacak.
