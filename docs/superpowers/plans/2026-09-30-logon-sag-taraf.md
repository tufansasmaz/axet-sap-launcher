# Logon sağ taraf — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Logon modunun sağ tarafını eylem öncelikli, sakin bir sütuna çevirmek; üst düğme şeridini kenar çubuğundaki ＋ menüsüne taşımak; giriş, sertifika, ortam ve rol pencerelerini ortak `Modal` iskeletine geçirmek.

**Mimari:** `SystemPanel.tsx` dört parçaya bölünüyor: not mantığı `useSystemComment` kancasına, görünüm `SystemHeader`, `SystemInfoList`, `SystemNotes` bileşenlerine. `SystemPanel` bunları dizen ince bir kabuk kalıyor, dışarıya açılan `Props` aynı (yalnızca üç isteğe bağlı prop ekleniyor). `LogonSidebar` ＋ menüsünün üç işini prop olarak alıyor. Dört pencere `src/ui/Modal` üstüne taşınıyor; içerik ve metinler değişmiyor.

**Teknoloji:** Electron, React 18, TypeScript, Tailwind (Grafit belirteçleri), vitest 2.1.9 + jsdom + @testing-library/react 16 (`renderHook` var, jest-dom yok).

**Spec:** `docs/superpowers/specs/2026-09-30-logon-sag-taraf-design.md`

## Genel kurallar

- Dal `tasarim/grafit`. Birleştirme ve push YOK.
- Dosyalar CRLF. Değişiklikler Edit aracıyla; `sed -i` kullanma. Python yok.
- Test: `npx vitest run <dosya> > .superpowers/x.txt 2>&1`, sonra dosyanın sonunu oku.
- Tip denetimi: `npm run -s typecheck`. `noUnusedLocals` açık: kullanılmayan import tip denetimini kırar.
- i18n: `en.ts`, `Record<TranslationKey,string>`. Anahtar eklenip silinirken tr.ts ve en.ts BİRLİKTE değişiyor. Boş değer olmaz, yer tutucular iki dilde aynı olur.
- Yeni dosyalarda `text-[Npx]`, `fixed inset-0`, `z-[N]` yok. Küçük yazı için `text-2xs`, `text-xs`.
- Lime yalnız seçim için. Renkler `bg-card`, `border-line`, `text-slate-*`, `var(--status-*)`.
- Vibe değerleri birebir kopyalanmıyor.
- Kod yorumları tam Türkçe karakterli. Commit mesajları ASCII Türkçe, sonunda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `git add` dosya dosya; `-A` yok. Müşteri adı yok; testte kullanıcı "TESTUSER".
- Bağlanma mantığına, IPC çağrılarına, `app-electron/`'a dokunulmuyor.

## İnceleme odağı

1. **Uzun sistem adı ya da yol:** başlık tek satırda kalıyor, `truncate` ile kesiliyor, tam ad `title`'da. Test: görev 3.
2. **Host'u olmayan bulut sistemi:** alt satırda boş parça ve fazladan " · " yok ("BTP/CLOUD · Henüz bağlanılmadı"). Test: görev 3.
3. **Not yüklemesi reddedilirse:** metin alanı "yükleniyor"da takılı kalmıyor. Kayıt başarısız olursa not kirli kalıyor, Kaydet yeniden açılıyor. Test: görev 2.
4. **＋ menüsü pencere kenarında:** menü pencereden taşmıyor (sağ-alt köşeye sıkıştırılıyor). Test: görev 4.
5. **Bağlanırken kapatma:** doğrulama sürerken Escape, Kapat ve İptal giriş penceresini kapatmıyor. Test: görev 7.

---

## Görevler

| # | Görev | Dosyalar |
|---|---|---|
| 1 | Bugünkü davranışı sabitleyen testler | `tests/systemPanel.test.tsx` (yeni) |
| 2 | Not mantığını kancaya çıkar | `src/components/useSystemComment.ts` (yeni), `SystemPanel.tsx` |
| 3 | Sağ tarafı yeniden yaz | `SystemPanel.tsx`, `SystemHeader.tsx`, `SystemInfoList.tsx`, `SystemNotes.tsx` (yeni), i18n |
| 4 | ＋ menüsü ve App.tsx bağlantısı | `LogonSidebar.tsx`, `src/App.tsx` (yalnız `<LogonSidebar>` props), i18n, `tests/logonSidebar.test.tsx` |
| 5 | Üst şerit ve sarı bant kalkıyor, boş durum sağda | `src/App.tsx`, i18n, `tests/appLogonWiring.test.ts` (yeni) |
| 6 | Modal'a `hideClose` | `src/ui/Modal.tsx`, `tests/modal.test.tsx` |
| 7 | Giriş penceresi Modal'a | `CredentialsModal.tsx`, `tests/credentialsModal.test.tsx` (yeni) |
| 8 | Sertifika penceresi Modal'a | `CertTrustDialog.tsx`, `tests/certTrustDialog.test.tsx` (yeni) |
| 9 | Ortam ve rol pencereleri Modal'a | `TierPromptModal.tsx`, `RoleModal.tsx` |
| 10 | Göç testi, tüm takım, gözle kontrol | `tests/dialogMigration.test.tsx` |

Pencere katmanları (App.tsx'teki açılış sırasına göre):
- **Ortam ve giriş** hiçbir zaman aynı anda açık değil. `beginConnect` ya birini ya ötekini açıyor; ortam seçilince ortam kapanıp giriş açılıyor. Özel katman gerekmiyor.
- **Giriş ve sertifika:** sertifika her zaman girişten SONRA açılıyor, yığında zaten üstte. Katman `modal`.
- **Rol** uygulama açılışından beri açık olabilir, sonradan açılanların altında kalmamalı. Bu yüzden `layer="critical"`.

### Görev 1: Bugünkü davranışı sabitleyen testler

`SystemPanel` bugün testsiz. Yeniden yazmadan önce, bugünkü kodun yaptığı işleri testle sabitliyoruz. Bu testler görev 3'teki yeni kodda da yeşil kalmalı, o yüzden yalnızca yeni düzende de geçerli olan şeylere bakıyorlar: erişilebilir ad, metin, çağrılan işlev.

**Dosyalar:**
- Yeni: `tests/systemPanel.test.tsx`

**Arayüzler:**
- Kullanır: `SystemPanel` (default export, `src/components/SystemPanel.tsx`). Bugünkü `Props`: `selection, connectivity, tierOverrides, lastConnectedAt, onCheck, onConnect, onOpenSapLogon, onEditManual, onDeleteManual, onSetTier`.
- Üretir: `renderPanel(overrides)` yardımcı işlevi ve `SERVICE_A` / `SERVICE_B` örnekleri. Görev 3 bu dosyaya yeni testler ekliyor.

- [ ] **Adım 1: Test dosyasını yaz**

```tsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SystemPanel from "../src/components/SystemPanel";
import type { ConnectivityState, SapService, SystemTier } from "../app-electron/shared/types";

// Sağ taraf yeniden yazılmadan ÖNCE bugünkü davranışı sabitliyor (plan,
// görev 1). Testler yalnızca yeni düzende de geçerli olan şeylere bakıyor:
// erişilebilir ad, metin ve çağrılan işlev. Sınıf adına bakan test yok.

const win = window as unknown as { api: unknown };
const originalApi = win.api;

// Tanımlanmayan her işlev hiç dönmeyen bir söz veriyor, `on…` abonelikleri
// boş bir iptal (logonSidebar.test ile aynı sahte).
function fakeApi(impl: Record<string, unknown> = {}) {
  return new Proxy(
    {},
    {
      get: (_t, k) => {
        if (typeof k !== "string") return undefined;
        if (k in impl) return impl[k];
        return k.startsWith("on") ? () => () => {} : () => new Promise(() => {});
      }
    }
  );
}

let setSystemComment: ReturnType<typeof vi.fn>;
beforeEach(() => {
  setSystemComment = vi.fn(() => Promise.resolve());
  win.api = fakeApi({
    getSystemCommentDefault: () => Promise.resolve({ comment: "", source: "none" }),
    setSystemComment
  });
});
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const SERVICE_A: SapService = {
  uuid: "svc-a",
  systemId: "D01",
  name: "D01 Geliştirme",
  type: "SAPGUI",
  host: "d01.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

const SERVICE_B: SapService = { ...SERVICE_A, uuid: "svc-b", systemId: "Q01", name: "Q01 Kalite" };

function selectionOf(service: SapService, itemUuid = `item-${service.uuid}`) {
  return { path: ["Test Müşteri"], service, itemUuid };
}

type PanelProps = Parameters<typeof SystemPanel>[0];

function renderPanel(overrides: Partial<PanelProps> = {}) {
  const props: PanelProps = {
    selection: selectionOf(SERVICE_A),
    connectivity: {} as Record<string, ConnectivityState>,
    tierOverrides: {} as Record<string, SystemTier>,
    lastConnectedAt: null,
    onCheck: vi.fn(),
    onConnect: vi.fn(),
    onOpenSapLogon: vi.fn(),
    onEditManual: vi.fn(),
    onDeleteManual: vi.fn(),
    onSetTier: vi.fn(),
    ...overrides
  };
  const view = render(
    <LanguageProvider language="tr">
      <SystemPanel {...props} />
    </LanguageProvider>
  );
  const rerender = (next: Partial<PanelProps>) =>
    view.rerender(
      <LanguageProvider language="tr">
        <SystemPanel {...props} {...next} />
      </LanguageProvider>
    );
  return { props, rerender };
}

// Not alanı yükleme bitene kadar devre dışı; yazmadan önce beklenmeli.
async function notesReady(): Promise<HTMLTextAreaElement> {
  const box = screen.getByRole("textbox") as HTMLTextAreaElement;
  await waitFor(() => expect(box.disabled).toBe(false));
  return box;
}

describe("SystemPanel — bugünkü davranış", () => {
  it("açılışta bir kez denetliyor, yeniden denetle düğmesi tekrar çağırıyor", async () => {
    const { props } = renderPanel();
    expect(props.onCheck).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Yeniden Kontrol Et/ }));
    expect(props.onCheck).toHaveBeenCalledTimes(2);
    expect(props.onCheck).toHaveBeenLastCalledWith(SERVICE_A);
    await notesReady();
  });

  it("el ile eklenmiş sistemde düzenle ve sil var, doğru işlevi çağırıyor", async () => {
    const manual = { ...SERVICE_A, isManual: true };
    const { props } = renderPanel({ selection: selectionOf(manual) });
    fireEvent.click(screen.getByRole("button", { name: "Düzenle" }));
    expect(props.onEditManual).toHaveBeenCalledWith(manual);
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(props.onDeleteManual).toHaveBeenCalledWith(manual);
    await notesReady();
  });

  it("SAP Logon'da Aç host ve port varken görünüyor, bulut sistemde yok", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /SAP Logon'da Aç/ }));
    expect(props.onOpenSapLogon).toHaveBeenCalledWith(SERVICE_A);
    await notesReady();
    cleanup();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, type: "BTP/CLOUD" }) });
    expect(screen.queryByRole("button", { name: /SAP Logon'da Aç/ })).toBeNull();
    await notesReady();
  });

  it("axet.code'da Aç seçimi onConnect'e veriyor", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /axet.code'da Aç/ }));
    expect(props.onConnect).toHaveBeenCalledWith(props.selection);
    await notesReady();
  });

  it("ortam seçici onSetTier çağırıyor", async () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "QA" }));
    expect(props.onSetTier).toHaveBeenCalledWith(SERVICE_A, "QA");
    await notesReady();
  });

  it("erişilemiyor ve PRD uyarıları görünüyor", async () => {
    renderPanel({
      connectivity: { "svc-a": "unreachable" },
      tierOverrides: { "svc-a": "PRD" }
    });
    expect(screen.getByText(/Bu sisteme ağ üzerinden erişilemiyor/)).toBeTruthy();
    expect(screen.getByText(/Bu bir PRODUCTION sistemi/)).toBeTruthy();
    await notesReady();
  });

  it("SAProuter satırı yalnızca router varken çiziliyor", async () => {
    renderPanel();
    expect(screen.queryByText("SAProuter")).toBeNull();
    await notesReady();
    cleanup();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, routerString: "/H/router.example.test/S/3299" }) });
    expect(screen.getByText("SAProuter")).toBeTruthy();
    await notesReady();
  });

  it("not Ctrl+Enter ile kaydediliyor", async () => {
    renderPanel();
    const box = await notesReady();
    fireEvent.change(box, { target: { value: "yeni not" } });
    await act(async () => {
      fireEvent.keyDown(box, { key: "Enter", ctrlKey: true });
    });
    expect(setSystemComment).toHaveBeenCalledWith("svc-a", "yeni not");
  });

  it("kaydedilmemiş taslak sistemler arasında gezerken kaybolmuyor", async () => {
    const { rerender } = renderPanel();
    const box = await notesReady();
    fireEvent.change(box, { target: { value: "taslak" } });
    rerender({ selection: selectionOf(SERVICE_B) });
    await notesReady();
    rerender({ selection: selectionOf(SERVICE_A) });
    expect(await screen.findByDisplayValue("taslak")).toBeTruthy();
  });
});
```

- [ ] **Adım 2: Çalıştır**

Çalıştır: `npx vitest run tests/systemPanel.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: 9 test GEÇİYOR. Bu testler bugünkü kodu sabitliyor, kırmızı aşaması yok. Biri kalırsa sebep testtir, kod değil. Testi bugünkü davranışa göre düzelt (ör. erişilebilir ad farklıysa bugünkü adı kullan), `SystemPanel.tsx`'e dokunma.

- [ ] **Adım 3: Commit**

```bash
git add tests/systemPanel.test.tsx
git commit -m "Test: SystemPanel bugunku davranisi sabitlendi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 2: Not mantığını kancaya çıkar

Not yükleme, taslak koruma ve kaydetme kodu `SystemPanel`'den `useSystemComment` kancasına taşınıyor. Kod ve yorumlar **aynen** taşınıyor. Bu görevde görünüm değişmiyor: `SystemPanel` kancayı çağırıyor ve aynı JSX'i çiziyor.

**Dosyalar:**
- Yeni: `src/components/useSystemComment.ts`
- Değişecek: `src/components/SystemPanel.tsx` (not state'i L191-210, yükleme ve boyutlandırma efektleri, `handleSaveComment`)
- Yeni test: `tests/useSystemComment.test.tsx`

**Arayüzler:**
- Üretir:
  ```ts
  export type CommentSource = "saved" | "sapLogon" | "none";
  export function useSystemComment(selection: { service: SapService; itemUuid: string } | null): {
    comment: string;
    setComment: (value: string) => void;
    originalComment: string;
    commentSource: CommentSource;
    commentLoading: boolean;
    commentSaving: boolean;
    commentSaved: boolean;
    isDirty: boolean;
    save: () => Promise<void>;
    textareaRef: RefObject<HTMLTextAreaElement>;
  };
  export type SystemCommentState = ReturnType<typeof useSystemComment>;
  ```
- Görev 3'teki `SystemNotes` bileşeni `note: SystemCommentState` alıyor.

- [ ] **Adım 1: Kanca testini yaz**

`tests/useSystemComment.test.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSystemComment } from "../src/components/useSystemComment";
import type { SapService } from "../app-electron/shared/types";

const win = window as unknown as { api: unknown };
const originalApi = win.api;
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

const SERVICE: SapService = {
  uuid: "svc-a",
  systemId: "D01",
  name: "D01 Geliştirme",
  type: "SAPGUI",
  host: "d01.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};
const SELECTION = { service: SERVICE, itemUuid: "item-a" };

describe("useSystemComment", () => {
  it("yükleme reddedilirse 'yükleniyor'da takılı kalmıyor", async () => {
    win.api = { getSystemCommentDefault: () => Promise.reject(new Error("okunamadı")) };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.commentLoading).toBe(false));
  });

  it("yüklenen notu ve kaynağını veriyor", async () => {
    win.api = { getSystemCommentDefault: () => Promise.resolve({ comment: "eski", source: "sapLogon" }) };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.comment).toBe("eski"));
    expect(result.current.commentSource).toBe("sapLogon");
    expect(result.current.isDirty).toBe(false);
  });

  it("kayıt başarısız olursa not kirli kalıyor ve kayıt kilidi açılıyor", async () => {
    const setSystemComment = vi.fn(() => Promise.reject(new Error("yazılamadı")));
    win.api = {
      getSystemCommentDefault: () => Promise.resolve({ comment: "", source: "none" }),
      setSystemComment
    };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.commentLoading).toBe(false));
    act(() => result.current.setComment("yeni"));
    await act(async () => {
      await result.current.save();
    });
    expect(setSystemComment).toHaveBeenCalledWith("svc-a", "yeni");
    expect(result.current.commentSaving).toBe(false);
    expect(result.current.isDirty).toBe(true);
  });

  it("başarılı kayıttan sonra not temiz ve kaynağı 'saved'", async () => {
    win.api = {
      getSystemCommentDefault: () => Promise.resolve({ comment: "", source: "none" }),
      setSystemComment: vi.fn(() => Promise.resolve())
    };
    const { result } = renderHook(() => useSystemComment(SELECTION));
    await waitFor(() => expect(result.current.commentLoading).toBe(false));
    act(() => result.current.setComment("yeni"));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.commentSource).toBe("saved");
    expect(result.current.commentSaved).toBe(true);
  });

  it("seçim yokken hiçbir şey okumuyor, kaydetme bir şey yapmıyor", async () => {
    const getSystemCommentDefault = vi.fn();
    const setSystemComment = vi.fn();
    win.api = { getSystemCommentDefault, setSystemComment };
    const { result } = renderHook(() => useSystemComment(null));
    await act(async () => {
      await result.current.save();
    });
    expect(getSystemCommentDefault).not.toHaveBeenCalled();
    expect(setSystemComment).not.toHaveBeenCalled();
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/useSystemComment.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: BAŞARISIZ, "Failed to resolve import ../src/components/useSystemComment".

- [ ] **Adım 3: Kancayı yaz**

`src/components/useSystemComment.ts`. Kod `SystemPanel.tsx`'ten taşınıyor. Aşağıda "(aynen)" yazan yorumları `SystemPanel.tsx`'teki hâliyle, harfi harfine kopyala.

```ts
import { useEffect, useRef, useState } from "react";
import type { SapService } from "../../app-electron/shared/types";

export type CommentSource = "saved" | "sapLogon" | "none";

// Seçili sistemin notu: yükleme, sistemler arası taslak koruma ve kaydetme.
// `SystemPanel`'den olduğu gibi taşındı (Logon sağ taraf planı, görev 2);
// davranış aynı, yalnızca görünümden ayrıldı.
export function useSystemComment(selection: { service: SapService; itemUuid: string } | null) {
  const [comment, setComment] = useState("");
  const [originalComment, setOriginalComment] = useState("");
  const [commentSource, setCommentSource] = useState<CommentSource>("none");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // (aynen) "Kaydedilmemiş yorum taslakları, sistem uuid'i başına. …" yorumu
  const draftsRef = useRef<Map<string, string>>(new Map());
  // (aynen) "Yükleme efektinin temizlik fonksiyonu çalıştığı anda …" yorumu
  const liveRef = useRef<{ uuid: string; comment: string; original: string } | null>(null);

  // SystemPanel'deki liveRef aynalama efekti, aynen.
  useEffect(() => {
    if (!selection) return;
    liveRef.current = { uuid: selection.service.uuid, comment, original: originalComment };
  }, [selection?.service.uuid, comment, originalComment]);

  // SystemPanel'deki yükleme efekti, içindeki iki yorumla birlikte aynen.
  useEffect(() => {
    if (!selection) return;
    const uuid = selection.service.uuid;
    let cancelled = false;
    setCommentLoading(true);
    setCommentSaved(false);
    window.api
      .getSystemCommentDefault(uuid)
      .then((result) => {
        if (cancelled) return;
        const draft = draftsRef.current.get(uuid);
        // (aynen) "Taslak varsa metin olarak o geri geliyor, …" yorumu
        setComment(draft ?? result.comment);
        setOriginalComment(result.comment);
        setCommentSource(result.source);
        setCommentLoading(false);
      })
      .catch(() => {
        // (aynen) "Yutulan reddediş `commentLoading`'i sonsuza kadar …" yorumu
        if (cancelled) return;
        setCommentLoading(false);
      });
    return () => {
      cancelled = true;
      const live = liveRef.current;
      if (live && live.comment !== live.original) draftsRef.current.set(live.uuid, live.comment);
    };
  }, [selection?.itemUuid]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 140), 420)}px`;
  }, [comment, commentLoading]);

  const isDirty = comment !== originalComment;

  async function save() {
    if (!selection || commentSaving || commentLoading) return;
    const uuid = selection.service.uuid;
    setCommentSaving(true);
    try {
      await window.api.setSystemComment(uuid, comment);
    } catch {
      // (aynen) "Yazma başarısızsa taslak DURUYOR (silinmiyor) …" yorumu
      setCommentSaving(false);
      return;
    }
    // Artık diskte — taslağın yaşaması için bir sebep kalmadı.
    draftsRef.current.delete(uuid);
    setOriginalComment(comment);
    setCommentSource("saved");
    setCommentSaving(false);
    setCommentSaved(true);
    setTimeout(() => setCommentSaved(false), 2000);
  }

  return {
    comment,
    setComment,
    originalComment,
    commentSource,
    commentLoading,
    commentSaving,
    commentSaved,
    isDirty,
    save,
    textareaRef
  };
}

export type SystemCommentState = ReturnType<typeof useSystemComment>;
```

`result`, `SystemCommentDefaults` tipinde (`src/window.d.ts:120`); `source` alanı bugün de doğrudan `setCommentSource`'a veriliyor.

- [ ] **Adım 4: SystemPanel kancayı kullansın**

`SystemPanel.tsx`'te:
1. `import { useSystemComment } from "./useSystemComment";` ekle.
2. Not state'lerini, `draftsRef`, `liveRef`, `textareaRef` tanımlarını, liveRef efektini, yükleme efektini ve boyutlandırma efektini SİL. Yerlerine, erişim denetimi efektinden (30 sn'lik pencere) ÖNCE şunu koy:
   ```ts
   const note = useSystemComment(selection);
   const { comment, setComment, commentSource, commentLoading, commentSaving, commentSaved, isDirty, textareaRef } = note;
   ```
3. `handleSaveComment`'i sil. Onu çağıran iki yerde (`onKeyDown` içindeki Ctrl/Meta+Enter ve Kaydet düğmesinin `onClick`'i) `note.save()` çağır.
4. `const isDirty = comment !== originalComment;` satırını sil (artık kancadan geliyor).
5. `useState` ya da `useRef` artık kullanılmıyorsa import'tan çıkar. Tip denetimi söyleyecek.

Erişim denetimi efekti (`lastCheckedRef`) `SystemPanel`'de KALIYOR.

- [ ] **Adım 5: Yeşili gör**

Çalıştır: `npx vitest run tests/useSystemComment.test.tsx tests/systemPanel.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: 14 test GEÇİYOR (5 + 9).

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok, çıkış kodu 0.

- [ ] **Adım 6: Commit**

```bash
git add src/components/useSystemComment.ts
git add src/components/SystemPanel.tsx
git add tests/useSystemComment.test.tsx
git commit -m "SystemPanel: not mantigi useSystemComment kancasina tasindi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 3: Sağ tarafı yeniden yaz

Spec §3'teki düzen: ortalanmış, en fazla 720px'lik bir sütun. Yukarıdan aşağı: yol, başlık satırı (ad, ortam rozeti, tıklanabilir durum, el ile sistemde düzenle ve sil), alt satır, eylem satırı, uyarılar, bilgiler listesi, notlar. Eski büyük kartlar, `StatTile`, `InfoRow`, `ActionCard`, `avatarLabel` siliniyor.

**Dosyalar:**
- Yeni: `src/components/SystemHeader.tsx`, `src/components/SystemInfoList.tsx`, `src/components/SystemNotes.tsx`
- Baştan yazılacak: `src/components/SystemPanel.tsx`
- Değişecek: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/systemPanel.test.tsx` (yeni testler ekleniyor; görev 1'deki testler aynen kalıyor)

**Arayüzler:**
- Kullanır: `useSystemComment`, `SystemCommentState` (görev 2).
- Üretir:
  - `SystemPanel` `Props`'una üç isteğe bağlı alan: `listEmpty?: boolean; emptyHint?: string; onAddSystem?: () => void;`. Görev 5 bunları App.tsx'ten geçiriyor.
  - `SystemInfoList.tsx`'ten `export function systemAddress(service: SapService): string` ve `export function extraAdtUrl(service: SapService): string | null`.
  - i18n: `systemPanel.emptyList`, `systemPanel.tierRow` eklenir. `systemPanel.tierLabel`, `systemPanel.openInAxetDesc`, `systemPanel.openInSapLogonDesc` silinir. `systemPanel.emptyState`'in metni değişir.

- [ ] **Adım 1: Yeni testleri ekle**

`tests/systemPanel.test.tsx`'in sonuna ekle. Dosyanın başındaki import'lara `readFileSync` için `import { readFileSync } from "node:fs";` ekle.

```tsx
describe("SystemPanel — yeni düzen", () => {
  it("seçim yokken boş durum ve Sistem Ekle düğmesi", () => {
    const onAddSystem = vi.fn();
    renderPanel({ selection: null, onAddSystem });
    expect(screen.getByText("Soldan bir sistem seç.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sistem Ekle/ }));
    expect(onAddSystem).toHaveBeenCalledTimes(1);
  });

  it("liste boşken 'Henüz sistem yok' ve landscape dosyası uyarısı", () => {
    renderPanel({ selection: null, listEmpty: true, emptyHint: "SAPUILandscape.xml bulunamadı (x)." });
    expect(screen.getByText("Henüz sistem yok")).toBeTruthy();
    expect(screen.getByText("SAPUILandscape.xml bulunamadı (x).")).toBeTruthy();
  });

  it("onAddSystem verilmezse boş durumda düğme yok", () => {
    renderPanel({ selection: null });
    expect(screen.queryByRole("button", { name: /Sistem Ekle/ })).toBeNull();
  });

  it("durum düğmesi denetim sürerken devre dışı ve çağırmıyor", async () => {
    const { props } = renderPanel({ connectivity: { "svc-a": "checking" } });
    const status = screen.getByRole("button", { name: /Yeniden Kontrol Et/ }) as HTMLButtonElement;
    expect(status.disabled).toBe(true);
    expect(status.getAttribute("aria-label")).toContain("Kontrol ediliyor…");
    const before = (props.onCheck as ReturnType<typeof vi.fn>).mock.calls.length;
    fireEvent.click(status);
    expect(props.onCheck).toHaveBeenCalledTimes(before);
    await notesReady();
  });

  it("el ile eklenmemiş sistemde düzenle ve sil yok", async () => {
    renderPanel();
    expect(screen.queryByRole("button", { name: "Düzenle" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sil" })).toBeNull();
    await notesReady();
  });

  it("host'u olmayan bulut sistemde alt satırda boş parça yok", async () => {
    renderPanel({
      selection: selectionOf({ ...SERVICE_A, type: "BTP/CLOUD", host: null, port: null, manualAdtUrl: null })
    });
    expect(screen.getByText("BTP/CLOUD · Henüz bağlanılmadı")).toBeTruthy();
    await notesReady();
  });

  it("alt satır adres, tür ve son bağlantıyı birleştiriyor", async () => {
    renderPanel({ lastConnectedAt: new Date().toISOString() });
    expect(screen.getByText(/^d01\.example\.test:3200 · SAPGUI · Son bağlantı: /)).toBeTruthy();
    await notesReady();
  });

  it("değeri olmayan bilgi satırı çizilmiyor", async () => {
    renderPanel({ selection: selectionOf({ ...SERVICE_A, systemId: "" }) });
    expect(screen.queryByText("Sistem ID")).toBeNull();
    expect(screen.queryByText("ADT Adresi")).toBeNull();
    expect(screen.getByText("UUID")).toBeTruthy();
    await notesReady();
  });

  it("ADT adresi yalnızca host'tan ayrı girilmişse ayrı satır", async () => {
    renderPanel({ selection: selectionOf({ ...SERVICE_A, manualAdtUrl: "https://d01.example.test:44300" }) });
    expect(screen.getByText("ADT Adresi")).toBeTruthy();
    expect(screen.getByText("https://d01.example.test:44300")).toBeTruthy();
    await notesReady();
  });

  it("addan tahmin edilen ortamda '(otomatik tahmin)' ve basılı düğme yok", async () => {
    renderPanel({ selection: selectionOf({ ...SERVICE_A, name: "D01 DEV" }) });
    expect(screen.getByText("(otomatik tahmin)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "DEV" }).getAttribute("aria-pressed")).toBe("false");
    await notesReady();
  });

  it("açıkça seçilen ortamda düğme basılı ve Temizle var", async () => {
    const { props } = renderPanel({ tierOverrides: { "svc-a": "QA" } });
    expect(screen.getByRole("button", { name: "QA" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Temizle" }));
    expect(props.onSetTier).toHaveBeenCalledWith(SERVICE_A, null);
    await notesReady();
  });

  it("uzun sistem adı tek satırda kesiliyor, tam ad title'da", async () => {
    const long = "D01 Geliştirme ".repeat(12).trim();
    renderPanel({ selection: selectionOf({ ...SERVICE_A, name: long }) });
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.getAttribute("title")).toBe(long);
    expect(heading.className).toContain("truncate");
    await notesReady();
  });
});

describe("SystemPanel — dosya kuralları", () => {
  const FILES = ["SystemPanel.tsx", "SystemHeader.tsx", "SystemInfoList.tsx", "SystemNotes.tsx"];
  for (const file of FILES) {
    it(`${file}: sabit piksel yazı boyu ve eski kart parçaları yok`, () => {
      const src = readFileSync(`src/components/${file}`, "utf8");
      expect(src).not.toMatch(/text-\[\d+px\]/);
      expect(src).not.toMatch(/StatTile|ActionCard|avatarLabel/);
    });
  }
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/systemPanel.test.tsx > .superpowers/x.txt 2>&1; tail -40 .superpowers/x.txt`
Beklenen: görev 1'in 9 testi GEÇİYOR. Yeni testlerin çoğu BAŞARISIZ ("Soldan bir sistem seç." bulunamadı, `SystemHeader.tsx` okunamadı, `aria-pressed` null …).

- [ ] **Adım 3: i18n**

`src/i18n/tr.ts`:
- `"systemPanel.emptyState": "Soldan bir müşteri sistemi seç.",` → `"systemPanel.emptyState": "Soldan bir sistem seç.",`
- Hemen altına: `"systemPanel.emptyList": "Henüz sistem yok",`
- `"systemPanel.tierLabel": "Sistem Önem Derecesi:",` satırını sil, yerine: `"systemPanel.tierRow": "Ortam",`
- `"systemPanel.openInAxetDesc": …` ve `"systemPanel.openInSapLogonDesc": …` satırlarını sil.

`src/i18n/en.ts`, aynı yerlerde:
- `"systemPanel.emptyState": "Select a system on the left.",`
- `"systemPanel.emptyList": "No systems yet",`
- `tierLabel` satırı silinir, yerine `"systemPanel.tierRow": "Environment",`
- `openInAxetDesc` ve `openInSapLogonDesc` silinir.

Silinen anahtarları başka kullanan var mı diye bak:
Çalıştır: `grep -rn "systemPanel.tierLabel\|openInAxetDesc\|openInSapLogonDesc" src tests`
Beklenen: yalnızca `src/components/SystemPanel.tsx` (adım 5'te baştan yazılıyor).

- [ ] **Adım 4: Bilgiler listesi — `src/components/SystemInfoList.tsx`**

Adres hesabı ve yorumu `SystemPanel.tsx`'ten **aynen** taşınıyor. Başlık satırı da aynı adresi kullandığı için bu işlev dışa açılıyor.

```tsx
import type { ReactNode } from "react";
import type { SapService, SystemTier } from "../../app-electron/shared/types";
import CopyButton from "./CopyButton";
import { useT } from "../i18n";

const TIER_OPTIONS: SystemTier[] = ["DEV", "QA", "PRD"];

const TIER_ACCENT: Record<SystemTier, { border: string; bg: string; text: string }> = {
  DEV: { border: "var(--tier-dev-border)", bg: "var(--tier-dev-bg)", text: "var(--tier-dev-text)" },
  QA: { border: "var(--tier-qa-border)", bg: "var(--tier-qa-bg)", text: "var(--tier-qa-text)" },
  PRD: { border: "var(--tier-prd-border)", bg: "var(--tier-prd-bg)", text: "var(--tier-prd-text)" }
};

// "Adres" satırı sistemin AĞ kimliğini gösterir: host:port. ADT adresi artık
// on-prem sistemlerde de dolabildiği için ikisi aynı satırı paylaşamaz —
// paylaşsalardı ADT adresi girilen bir on-prem sistemin host:port'u panelde
// hiçbir yerde görünmezdi, üstelik hemen yanındaki "SAP Logon'da Aç" tam da
// o gizlenen host:port'a bağlanırdı. Cloud sistemlerde host yok, orada adres
// yine ADT URL'i.
export function systemAddress(service: SapService): string {
  return service.host
    ? `${service.host}${service.port ? `:${service.port}` : ""}`
    : (service.manualAdtUrl ?? "");
}

export function extraAdtUrl(service: SapService): string | null {
  return service.host && service.manualAdtUrl ? service.manualAdtUrl : null;
}

function Row({
  label,
  children,
  copyValue,
  copyTitle
}: {
  label: string;
  children: ReactNode;
  copyValue?: string;
  copyTitle?: string;
}) {
  return (
    <div className="group flex min-h-8 items-center gap-3 border-b border-line-subtle py-1.5 last:border-b-0">
      <dt className="w-24 shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 font-mono text-xs text-slate-200">{children}</dd>
      {copyValue && (
        // Kopyala düğmesi satırın üzerine gelince ya da klavyeyle odaklanınca
        // beliriyor; görünmezken de sekme sırasında duruyor.
        <div className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <CopyButton value={copyValue} title={copyTitle} />
        </div>
      )}
    </div>
  );
}

export default function SystemInfoList({
  service,
  tier,
  explicitTier,
  onSetTier
}: {
  service: SapService;
  tier: SystemTier | null;
  explicitTier: SystemTier | null;
  onSetTier: (tier: SystemTier | null) => void;
}) {
  const t = useT();
  const address = systemAddress(service);
  const adtUrl = extraAdtUrl(service);

  // Değeri olmayan satır hiç çizilmiyor ("—" yok). UUID her sistemde var.
  return (
    <dl className="flex flex-col">
      {service.systemId && <Row label={t("systemPanel.systemId")}>{service.systemId}</Row>}
      {address && (
        <Row label={t("systemPanel.addressLabel")} copyValue={address} copyTitle={t("systemPanel.copyAddress")}>
          <span className="truncate" title={address}>
            {address}
          </span>
        </Row>
      )}
      {adtUrl && (
        <Row label={t("systemPanel.adtUrlLabel")} copyValue={adtUrl} copyTitle={t("systemPanel.copyAdtUrl")}>
          <span className="truncate" title={adtUrl}>
            {adtUrl}
          </span>
        </Row>
      )}
      {service.routerString && (
        <Row label={t("systemPanel.routerLabel")}>
          <span className="truncate" title={service.routerString}>
            {service.routerString}
          </span>
        </Row>
      )}
      <Row label={t("systemPanel.tierRow")}>
        <div className="flex items-center gap-0.5 rounded-md border border-line p-0.5 font-sans">
          {TIER_OPTIONS.map((option) => {
            const active = explicitTier === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onSetTier(active ? null : option)}
                className={`cursor-pointer rounded-sm px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide transition ${
                  active ? "" : "text-slate-400 hover:text-slate-200"
                }`}
                style={active ? { backgroundColor: TIER_ACCENT[option].bg, color: TIER_ACCENT[option].text } : undefined}
              >
                {option}
              </button>
            );
          })}
        </div>
        {explicitTier ? (
          <button
            type="button"
            onClick={() => onSetTier(null)}
            className="cursor-pointer font-sans text-2xs text-slate-500 hover:text-slate-300"
          >
            {t("systemPanel.clearTier")}
          </button>
        ) : tier ? (
          <span className="font-sans text-2xs text-slate-500">{t("systemPanel.autoGuessed")}</span>
        ) : null}
      </Row>
      <Row label={t("systemPanel.uuid")} copyValue={service.uuid} copyTitle={t("systemPanel.copyUuid")}>
        <span className="truncate text-slate-400" title={service.uuid}>
          {service.uuid}
        </span>
      </Row>
    </dl>
  );
}
```

`TIER_ACCENT`, `SystemPanel.tsx` L53-57'deki tanımın birebir kopyası; eski dosyadaki tanım adım 7'de siliniyor. Kullanılan sınıfların hepsi var: `text-2xs` (`tailwind.config.js` L123), `border-line-subtle` (L59), `min-h-8` (Tailwind 3.4.19).

- [ ] **Adım 5: Notlar — `src/components/SystemNotes.tsx`**

Görünüm bugünkü not kartının sadeleşmiş hâli: kart çerçevesi ve amber şerit yok, başlık `PANEL_TITLE`. Davranış (rozetler, Ctrl+Enter, sayaç, "Kaydedildi" işareti, Kaydet düğmesinin koşulu) aynen.

```tsx
import { Check, Circle, Loader2 } from "lucide-react";
import type { SystemCommentState } from "./useSystemComment";
import { btn, PANEL_TITLE } from "../ui/buttons";
import { useT } from "../i18n";

export default function SystemNotes({ note }: { note: SystemCommentState }) {
  const t = useT();
  const { comment, setComment, commentSource, commentLoading, commentSaving, commentSaved, isDirty, save, textareaRef } =
    note;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className={PANEL_TITLE}>{t("systemPanel.commentLabel")}</h3>
        {isDirty && !commentSaving && (
          <span className="flex items-center gap-1 text-2xs text-[var(--status-warning-text)]">
            <Circle size={6} className="fill-current" />
            {t("systemPanel.commentUnsaved")}
          </span>
        )}
        {commentSource === "sapLogon" && !isDirty && (
          <span className="rounded-full border border-line-strong px-2 py-0.5 text-2xs text-slate-400">
            {t("systemPanel.commentFromSapLogon")}
          </span>
        )}
      </div>
      <div className="rounded-lg border border-line bg-card focus-within:border-line-strong">
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          disabled={commentLoading}
          aria-label={t("systemPanel.commentLabel")}
          placeholder={commentLoading ? "" : t("systemPanel.commentPlaceholder")}
          className="block w-full resize-none border-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-500/70 focus:ring-0 disabled:opacity-60"
          style={{ boxShadow: "none" }}
        />
        <div className="flex items-center justify-between gap-2 border-t border-line-subtle px-3 py-2">
          <span className="flex items-center gap-1.5 text-2xs text-slate-500">
            {comment.length > 0 ? (
              t("systemPanel.commentChars", { count: comment.length })
            ) : (
              <>
                <kbd className="rounded border border-line-strong px-1 font-sans text-2xs text-slate-400">Ctrl</kbd>
                <span>+</span>
                <kbd className="rounded border border-line-strong px-1 font-sans text-2xs text-slate-400">Enter</kbd>
                <span className="ml-0.5">{t("systemPanel.commentHint")}</span>
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            {commentSaved && !isDirty && (
              <span className="animate-alert-slide-in flex items-center gap-1 text-2xs text-[var(--status-success-text)]">
                <Check size={12} />
                {t("systemPanel.commentSaved")}
              </span>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={commentSaving || commentLoading || !isDirty}
              title={t("systemPanel.commentHint")}
              className={btn(isDirty && !commentSaving ? "primary" : "neutral", "sm", "gap-1.5")}
            >
              {commentSaving ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {t("systemPanel.commentSaving")}
                </>
              ) : (
                <>
                  <Check size={13} />
                  {t("common.save")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

`aria-label` yeni ekleniyor (bugün textarea'nın adı yok). Görev 1'deki `getByRole("textbox")` bundan etkilenmiyor.

- [ ] **Adım 6: Başlık — `src/components/SystemHeader.tsx`**

Yol, başlık satırı, alt satır, eylemler ve uyarılar burada. Geri çağırmalar `SystemPanel`'de servise bağlanmış olarak geliyor; bu bileşen `SapService` dışında hiçbir şeyi bilmiyor.

```tsx
import { AlertTriangle, ChevronRight, LogIn, Pencil, Terminal, Trash2 } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import StatusDot from "./StatusDot";
import TierBadge from "./TierBadge";
import { systemAddress } from "./SystemInfoList";
import { Button } from "../ui/Button";
import { iconBtn, tintBtn } from "../ui/buttons";
import { formatRelativeTime } from "../lib/time";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";

const STATE_LABEL: Record<ConnectivityState, TranslationKey> = {
  unknown: "statusDot.unknown",
  checking: "statusDot.checking",
  reachable: "statusDot.reachable",
  unreachable: "statusDot.unreachable"
};

function Warning({ text }: { text: string }) {
  return (
    <div
      className="animate-alert-slide-in flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
      style={{
        borderColor: "var(--status-danger-border)",
        backgroundColor: "var(--status-danger-bg)",
        color: "var(--status-danger-text)"
      }}
    >
      <AlertTriangle size={15} className="shrink-0" />
      {text}
    </div>
  );
}

export default function SystemHeader({
  path,
  service,
  state,
  tier,
  lastConnectedAt,
  onCheck,
  onConnect,
  onOpenSapLogon,
  onEditManual,
  onDeleteManual
}: {
  path: string[];
  service: SapService;
  state: ConnectivityState;
  tier: SystemTier | null;
  lastConnectedAt: string | null;
  onCheck: () => void;
  onConnect: () => void;
  onOpenSapLogon: () => void;
  onEditManual: () => void;
  onDeleteManual: () => void;
}) {
  const t = useT();
  // Alt satır: olmayan parça hiç yazılmıyor, ayracı da (spec §3.3).
  const facts = [
    systemAddress(service),
    service.type,
    lastConnectedAt
      ? t("systemPanel.lastConnected", { time: formatRelativeTime(lastConnectedAt, t) })
      : t("systemPanel.neverConnected")
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-1 text-xs text-slate-500">
        {path.map((segment, i) => (
          <span key={`${segment}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight size={11} className="shrink-0 text-slate-600" />}
            <span className="truncate">{segment}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="min-w-0 truncate text-lg font-semibold text-white" title={service.name}>
            {service.name}
          </h2>
          {tier && <TierBadge tier={tier} />}
          {/* Durum yazısı aynı zamanda "yeniden denetle" düğmesi (spec §3.2).
              Denetim sürerken devre dışı; bu tıklama 30 sn'lik pencereden
              geçmiyor, her seferinde gerçekten denetliyor. */}
          <button
            type="button"
            onClick={onCheck}
            disabled={state === "checking"}
            aria-label={`${t(STATE_LABEL[state])} · ${t("systemPanel.recheck")}`}
            title={t("systemPanel.recheck")}
            className="shrink-0 cursor-pointer rounded-full px-1.5 py-0.5 transition-colors hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
          >
            <StatusDot state={state} showLabel />
          </button>
          {service.isManual && (
            <div className="ml-auto flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={onEditManual}
                aria-label={t("common.edit")}
                title={t("systemPanel.editTitle")}
                className={iconBtn("ghost", "sm")}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={onDeleteManual}
                aria-label={t("common.delete")}
                title={t("systemPanel.deleteTitle")}
                className={iconBtn(
                  "ghost",
                  "sm",
                  "hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger-text)]"
                )}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        <p className="truncate font-mono text-xs text-slate-500" title={facts}>
          {facts}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={onConnect}>
          <Terminal size={15} />
          {t("systemPanel.openInAxet")}
        </Button>
        {/* Buradaki koşul, main tarafındaki `canOpenInSapLogon` ile AYNI
            olmak zorunda — ayrışırsa buton ya hiç görünmez ya da görünüp
            "missingHostOrPort" ile başarısız olur. Cloud testi sadece tipe
            bakar; ADT adresi girilmiş bir on-prem sistem hâlâ SAP GUI ile
            açılabilir. */}
        {service.type !== "BTP/CLOUD" && service.host && service.port && (
          <button
            type="button"
            onClick={onOpenSapLogon}
            title={t("systemPanel.openInSapLogonTitle")}
            className={tintBtn("sap", "lg", "gap-1.5 px-3")}
          >
            <LogIn size={15} />
            {t("systemPanel.openInSapLogon")}
          </button>
        )}
      </div>

      {state === "unreachable" && <Warning text={t("systemPanel.unreachableWarning")} />}
      {tier === "PRD" && <Warning text={t("systemPanel.prodWarning")} />}
    </header>
  );
}
```

`TranslationKey` yalnızca `src/i18n/tr.ts` L1135'ten dışa açılıyor (`en.ts` de oradan alıyor). `iconBtn(variant, size, extra)` üçüncü parametreyi sınıf listesinin sonuna ekliyor (`src/ui/buttons.ts` L142-148). Durum düğmesinin erişilebilir adı `aria-label`'dan geliyor; içindeki `StatusDot` yazısı bu adı değiştirmiyor.

- [ ] **Adım 7: `SystemPanel.tsx`'i baştan yaz**

Dosyanın tamamını şununla değiştir. Denetim efekti ve yorumu korunuyor; yorumun son cümlesi yeni düzene göre düzeltildi.

```tsx
import { useEffect, useRef } from "react";
import { Cable, Plus } from "lucide-react";
import type { ConnectivityState, SapService, SystemTier } from "../../app-electron/shared/types";
import SystemHeader from "./SystemHeader";
import SystemInfoList from "./SystemInfoList";
import SystemNotes from "./SystemNotes";
import { useSystemComment } from "./useSystemComment";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { resolveTier } from "../lib/tier";
import { useT } from "../i18n";

interface Selection {
  path: string[];
  service: SapService;
  itemUuid: string;
}

interface Props {
  selection: Selection | null;
  connectivity: Record<string, ConnectivityState>;
  tierOverrides: Record<string, SystemTier>;
  lastConnectedAt: string | null;
  onCheck: (service: SapService) => void;
  onConnect: (selection: Selection) => void;
  onOpenSapLogon: (service: SapService) => void;
  onEditManual: (service: SapService) => void;
  onDeleteManual: (service: SapService) => void;
  onSetTier: (service: SapService, tier: SystemTier | null) => void;
  /** Listede hiç sistem yok: boş durum "Henüz sistem yok" diyor. */
  listEmpty?: boolean;
  /** Boş durumun açıklaması, ör. SAPUILandscape.xml bulunamadı uyarısı. */
  emptyHint?: string;
  /** Verilirse boş durumda "Sistem Ekle" düğmesi çıkıyor. */
  onAddSystem?: () => void;
}

export default function SystemPanel({
  selection,
  connectivity,
  tierOverrides,
  lastConnectedAt,
  onCheck,
  onConnect,
  onOpenSapLogon,
  onEditManual,
  onDeleteManual,
  onSetTier,
  listEmpty,
  emptyHint,
  onAddSystem
}: Props) {
  const t = useT();
  const note = useSystemComment(selection);

  // Seçimde erişim kontrolü — ama 30 sn'lik bir pencereyle. App.tsx zaten
  // açılışta 5 işçilik bir tarama yapıyor; bu efekt onun üstüne biniyordu ve
  // ağaçta sistemler arasında gezinen kullanıcı her tıklamada yeni bir TCP/
  // SAProuter bağlantısı açtırıyordu. Durum bilgisi 30 sn'de bir tazelenirse
  // yeterince güncel; anında sonuç isteyen başlıktaki durum yazısına tıklıyor
  // ve o bu pencereden geçmiyor.
  const lastCheckedRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    if (!selection) return;
    const uuid = selection.service.uuid;
    const last = lastCheckedRef.current.get(uuid) ?? 0;
    if (Date.now() - last < 30_000) return;
    lastCheckedRef.current.set(uuid, Date.now());
    onCheck(selection.service);
  }, [selection?.itemUuid]);

  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={<Cable size={22} />}
          title={t(listEmpty ? "systemPanel.emptyList" : "systemPanel.emptyState")}
          description={emptyHint}
          action={
            onAddSystem && (
              <Button variant="primary" onClick={onAddSystem}>
                <Plus size={14} />
                {t("app.addSystem")}
              </Button>
            )
          }
        />
      </div>
    );
  }

  const { service, path } = selection;
  const state = connectivity[service.uuid] ?? "unknown";
  const tier = resolveTier(service, tierOverrides);
  const explicitTier = tierOverrides[service.uuid] ?? null;

  return (
    <div className="h-full overflow-y-auto">
      <div
        key={selection.itemUuid}
        className="animate-panel-fade-in mx-auto flex w-full max-w-[720px] flex-col gap-6 px-6 py-8"
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
        <SystemInfoList
          service={service}
          tier={tier}
          explicitTier={explicitTier}
          onSetTier={(next) => onSetTier(service, next)}
        />
        <SystemNotes note={note} />
      </div>
    </div>
  );
}
```

Neden `key` iç sütunda: sistem değişince giriş animasyonu yeniden oynuyor (bugünkü davranış). Kanca `key`'in DIŞINDA çağrılıyor, o yüzden taslak haritası sistem değişince sıfırlanmıyor. Görev 1'deki "taslak kaybolmuyor" testi bunu koruyor.

- [ ] **Adım 8: Yeşili gör**

Çalıştır: `npx vitest run tests/systemPanel.test.tsx tests/useSystemComment.test.tsx tests/i18n.test.ts > .superpowers/x.txt 2>&1; tail -30 .superpowers/x.txt`
Beklenen: hepsi GEÇİYOR. `systemPanel.test.tsx`'te 9 + 12 + 4 = 25 test var.

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok. `noUnusedLocals` kullanılmayan import'u yakalar; sil.

Çalıştır: `grep -rn "systemPanel.tierLabel\|openInAxetDesc\|openInSapLogonDesc\|StatTile\|ActionCard" src`
Beklenen: hiçbir şey.

- [ ] **Adım 9: Commit**

```bash
git add src/components/SystemHeader.tsx
git add src/components/SystemInfoList.tsx
git add src/components/SystemNotes.tsx
git add src/components/SystemPanel.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/systemPanel.test.tsx
git commit -m "Logon: sag taraf eylem oncelikli duzene gecti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 4: Kenar çubuğunda ＋ menüsü

Üst şeritteki üç eylem, `LogonSidebar`'ın arama satırının sağındaki ＋ düğmesine taşınıyor. Menünün görünümü ve konumlanması Terminal kenar çubuğundaki sağ tık menüsüyle aynı (`src/components/TerminalSidebar.tsx` L150-200). O menüde ok tuşları yok; spec §4.1 istediği için bu menü kendisi ekliyor.

**Dosyalar:**
- Değişecek: `src/components/LogonSidebar.tsx`, `src/App.tsx` (yalnızca `<LogonSidebar>`'a üç prop), `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/logonSidebar.test.tsx`

**Arayüzler:**
- Üretir: `LogonSidebarProps`'a üç ZORUNLU alan: `onAddSystem(): void; onRefreshFromSapLogon(): void; onReloadList(): void;`. Bu görev onları App.tsx'te de bağlıyor, böylece her commit tip denetiminden geçiyor.
- i18n: `logonSidebar.addMenu` ("Sistem ekle ve yenile" / "Add and refresh systems").

- [ ] **Adım 1: Testleri yaz**

`tests/logonSidebar.test.tsx`'te `renderSidebar`'daki `props` nesnesine, `onSelect: vi.fn(),` satırının altına ekle:

```tsx
    onAddSystem: vi.fn(),
    onRefreshFromSapLogon: vi.fn(),
    onReloadList: vi.fn(),
```

Dosyanın sonuna yeni bir `describe` ekle:

```tsx
describe("LogonSidebar ＋ menüsü", () => {
  const openMenu = () => {
    fireEvent.click(screen.getByRole("button", { name: "Sistem ekle ve yenile" }));
    return screen.getByRole("menu");
  };

  it("açılıyor, üç seçenek var, ilki odakta", () => {
    renderSidebar();
    const trigger = screen.getByRole("button", { name: "Sistem ekle ve yenile" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    openMenu();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const items = screen.getAllByRole("menuitem");
    expect(items.map((i) => i.textContent)).toEqual(["Sistem Ekle", "SAP Logon'dan Getir", "Listeyi yeniden yükle"]);
    expect(document.activeElement).toBe(items[0]);
  });

  it("her seçenek kendi işlevini çağırıyor ve menüyü kapatıyor", () => {
    const props = renderSidebar();
    const cases: [string, ReturnType<typeof vi.fn>][] = [
      ["Sistem Ekle", props.onAddSystem as ReturnType<typeof vi.fn>],
      ["SAP Logon'dan Getir", props.onRefreshFromSapLogon as ReturnType<typeof vi.fn>],
      ["Listeyi yeniden yükle", props.onReloadList as ReturnType<typeof vi.fn>]
    ];
    for (const [label, fn] of cases) {
      openMenu();
      fireEvent.click(screen.getByRole("menuitem", { name: label }));
      expect(fn).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("menu")).toBeNull();
    }
  });

  it("Escape kapatıyor ve odağı ＋ düğmesine geri veriyor", () => {
    renderSidebar();
    const menu = openMenu();
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sistem ekle ve yenile" }));
  });

  it("ok tuşları seçenekler arasında dönerek geziyor", () => {
    renderSidebar();
    const menu = openMenu();
    const items = screen.getAllByRole("menuitem");
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement).toBe(items[0]);
  });

  it("dışarı tıklama kapatıyor, hiçbir işlev çağrılmıyor", () => {
    const props = renderSidebar();
    openMenu();
    const overlay = document.querySelector("[data-menu-overlay]") as HTMLElement;
    fireEvent.click(overlay);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(props.onAddSystem).not.toHaveBeenCalled();
  });

  it("pencere kenarına taşmıyor", () => {
    renderSidebar();
    const trigger = screen.getByRole("button", { name: "Sistem ekle ve yenile" });
    trigger.getBoundingClientRect = () =>
      ({ left: 1010, right: 1034, top: 736, bottom: 760, width: 24, height: 24, x: 1010, y: 736 }) as DOMRect;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
    const menu = openMenu();
    // 1024 - 176 - 8 = 840 ; 768 - 104 - 8 = 656
    expect(menu.style.left).toBe("840px");
    expect(menu.style.top).toBe("656px");
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx > .superpowers/x.txt 2>&1; tail -30 .superpowers/x.txt`
Beklenen: eski 10 test GEÇİYOR, yeni 6 test BAŞARISIZ ("Unable to find an accessible element with the role "button" and name "Sistem ekle ve yenile"").

- [ ] **Adım 3: i18n**

`src/i18n/tr.ts`'te `"app.reloadListTitle": "Listeyi yeniden yükle",` satırının altına:

```ts
  "logonSidebar.addMenu": "Sistem ekle ve yenile",
```

`src/i18n/en.ts`'te `"app.reloadListTitle"` satırının altına:

```ts
  "logonSidebar.addMenu": "Add and refresh systems",
```

- [ ] **Adım 4: Menüyü yaz**

`src/components/LogonSidebar.tsx`:

1. Import'ları değiştir:

```tsx
import { useEffect, useRef, useState, type RefObject } from "react";
import { Download, FolderTree, Plus, RefreshCw, Search, Server, X } from "lucide-react";
```

ve `import { useT } from "../i18n";` satırının altına:

```tsx
import { GHOST_ICON_BUTTON } from "../ui/buttons";
```

2. `LogonSidebarProps`'un sonuna, `onSelect(...)` satırının altına:

```tsx
  // ＋ menüsünün üç eylemi. IPC ve bildirimler App'te; kenar çubuğu yalnız
  // hangisinin seçildiğini söylüyor.
  onAddSystem(): void;
  onRefreshFromSapLogon(): void;
  onReloadList(): void;
```

3. `export type LogonPanelMode` satırının üstüne:

```tsx
// ＋ menüsünün yaklaşık ölçüsü: pencerenin kenarına sıkıştırmak için. Terminal
// kenar çubuğundaki menüyle aynı yöntem; burada hep üç satır var.
const MENU_W = 176;
const MENU_H = 104;
const EDGE = 8;
```

4. Bileşenin parametre listesine `onAddSystem, onRefreshFromSapLogon, onReloadList` ekle. `const showFiles = ...` satırının altına:

```tsx
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openMenu = () => {
    const rect = addButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenu({ x: rect.left, y: rect.bottom + 4 });
  };

  const closeMenu = (refocus: boolean) => {
    setMenu(null);
    if (refocus) addButtonRef.current?.focus();
  };

  // Seçilen eylem menü kapandıktan SONRA çalışıyor: "Sistem Ekle" bir pencere
  // açıyor ve odağı o pencere alıyor; menü açık kalsaydı odak ona dönmeye
  // çalışırdı.
  const choose = (action: () => void) => {
    setMenu(null);
    action();
  };

  const menuItems: { label: string; icon: JSX.Element; action: () => void }[] = [
    { label: t("app.addSystem"), icon: <Plus size={13} />, action: onAddSystem },
    { label: t("app.refetch"), icon: <Download size={13} />, action: onRefreshFromSapLogon },
    { label: t("app.reloadListTitle"), icon: <RefreshCw size={13} />, action: onReloadList }
  ];

  const moveFocus = (step: number) => {
    const items = itemRefs.current.filter((el): el is HTMLButtonElement => el !== null);
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = (current + step + items.length) % items.length;
    items[next]?.focus();
  };
```

5. Arama satırında, `{files && ( ... )}` bloğunun HEMEN ALTINA (aynı `flex` satırının son çocuğu olarak):

```tsx
        <button
          ref={addButtonRef}
          type="button"
          onClick={() => (menu ? closeMenu(false) : openMenu())}
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          aria-label={t("logonSidebar.addMenu")}
          title={t("logonSidebar.addMenu")}
          className={GHOST_ICON_BUTTON}
        >
          <Plus size={14} />
        </button>
```

6. Bileşenin en dıştaki `<div>`'inin kapanışından hemen ÖNCE:

```tsx
      {/* Menü SABİT konumlu: kenar çubuğunun içinde açılsaydı taşan kısmı
          kırpılırdı. Dış tıklama katmanı ekran okuyucudan gizli. */}
      {menu && (
        <>
          <div
            aria-hidden
            data-menu-overlay
            className="fixed inset-0 z-dropdown"
            onClick={() => closeMenu(false)}
            onContextMenu={(e) => {
              e.preventDefault();
              closeMenu(false);
            }}
          />
          <div
            role="menu"
            aria-label={t("logonSidebar.addMenu")}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                closeMenu(true);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                moveFocus(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveFocus(-1);
              }
            }}
            className="fixed z-dropdown rounded-md border border-line bg-card p-1 shadow-xl outline-none"
            style={{
              width: MENU_W,
              left: Math.max(EDGE, Math.min(menu.x, window.innerWidth - MENU_W - EDGE)),
              top: Math.max(EDGE, Math.min(menu.y, window.innerHeight - MENU_H - EDGE))
            }}
          >
            {menuItems.map((item, i) => (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => choose(item.action)}
                className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100 focus:bg-hover focus:text-slate-100 focus:outline-none"
              >
                <span className="text-slate-500">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
```

`menuItems[].icon` için `JSX.Element` tipi dosyada zaten kullanılıyor (`modeButton`).

7. İlk öğeye odak bir efektle veriliyor, `ref` geri çağırmasında değil. `ref` geri çağırması her çizimde çalışır ve ok tuşuyla ikinci öğeye geçtikten sonraki ilk yeniden çizimde odağı başa sıçratırdı. `moveFocus`'un altına:

```tsx
  // Menü açılınca odak ilk seçeneğe. Yalnız açılışta: `menu` konum nesnesi
  // açılış başına bir kez oluşuyor.
  useEffect(() => {
    if (menu) itemRefs.current[0]?.focus();
  }, [menu]);
```

- [ ] **Adım 5: App.tsx'te üç prop'u bağla**

Prop'lar zorunlu; bağlanmazsa tip denetimi kalır. `src/App.tsx`'te `<LogonSidebar`'ın `onSelect={handleSelect}` satırının (bugün L1024) altına:

```tsx
                onAddSystem={() => setAddSystemOpen(true)}
                onRefreshFromSapLogon={() => refreshWithToast("app.refreshedFromSapLogon")}
                onReloadList={() => refreshWithToast("app.listReloaded")}
```

Bunlar üst şeritteki üç düğmenin `onClick`'leriyle aynı (L1114, L1126, L1137). Şerit görev 5'te kalkıyor; o zamana kadar iki yerden de erişiliyor.

- [ ] **Adım 6: Yeşili gör**

Çalıştır: `npx vitest run tests/logonSidebar.test.tsx tests/i18n.test.ts > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: hepsi GEÇİYOR (logonSidebar'da 16 test).

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok.

- [ ] **Adım 7: Commit**

```bash
git add src/components/LogonSidebar.tsx
git add src/App.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/logonSidebar.test.tsx
git commit -m "Logon: kenar cubuguna + menusu (sistem ekle, getir, yenile)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 5: Üst şeridi ve sarı uyarı bandını kaldır

Üst şeritteki üç düğme görev 4'te kenar çubuğunun ＋ menüsüne taşındı. Şerit artık tekrar; sarı "SAPUILandscape.xml bulunamadı" bandı da sağ taraftaki boş duruma (görev 3'teki `emptyHint`) iniyor.

**Dosyalar:**
- Değişecek: `src/App.tsx` (import'lar L2-9 ve L64; şerit ve bant L1081-1157; `SystemPanel` kullanımı ~L1203-1214)
- Değişecek: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Yeni test: `tests/appLogonWiring.test.ts`

**Arayüzler:**
- Kullanır: `SystemPanel`'in görev 3'te eklenen `listEmpty?`, `emptyHint?`, `onAddSystem?` alanları. Görev 4'te LogonSidebar'a bağlanan `onAddSystem`, `onRefreshFromSapLogon`, `onReloadList`.
- Üretir: yok.
- Kalan anahtarlar: `app.addSystem`, `app.refetch`, `app.reloadListTitle` ＋ menüsünde kullanılıyor, SİLİNMEZ. `app.noLandscapeFile` boş durumda kullanılıyor, SİLİNMEZ.

- [ ] **Adım 1: Kaynak düzeyinde testi yaz**

`tests/appLogonWiring.test.ts`:

```ts
// Logon ekranı bağlantısı — kaynak düzeyinde kilit. Üst şeridin düğmeleri
// kenar çubuğunun ＋ menüsüne, sarı uyarı bandı sağ taraftaki boş duruma
// taşındı (Logon sağ taraf spec'i). Şerit geri gelirse aynı üç eylem ekranda
// iki yerde durur.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
// Yorumlar eski durumu anlatabilir; kontroller yalnız koda bakıyor.
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const app = code(read("src", "App.tsx"));
const tr = read("src", "i18n", "tr.ts");
const en = read("src", "i18n", "en.ts");

describe("App — Logon ekranı bağlantısı", () => {
  it("üst şerit ve sarı bant yok", () => {
    expect(app).not.toContain('title={t("app.addSystemTitle")}');
    expect(app).not.toContain('title={t("app.refetchTitle")}');
    expect(app).not.toContain("var(--status-warning-bg)");
  });

  it("kenar çubuğu ＋ menüsünün üç eylemi bağlı", () => {
    expect(app).toContain("onAddSystem={() => setAddSystemOpen(true)}");
    expect(app).toContain('onRefreshFromSapLogon={() => refreshWithToast("app.refreshedFromSapLogon")}');
    expect(app).toContain('onReloadList={() => refreshWithToast("app.listReloaded")}');
  });

  it("SystemPanel boş liste, uyarı ve Sistem Ekle alıyor", () => {
    expect(app).toContain("listEmpty={!!noLandscapeFile}");
    expect(app).toMatch(/emptyHint=\{\s*noLandscapeFile\s*\?\s*t\("app\.noLandscapeFile"/);
    // `onAddSystem` iki yerde: kenar çubuğu ve SystemPanel.
    expect(app.split("onAddSystem={() => setAddSystemOpen(true)}").length - 1).toBe(2);
  });

  it("kullanılmayan başlık anahtarları silindi", () => {
    for (const file of [tr, en]) {
      expect(file).not.toContain('"app.addSystemTitle"');
      expect(file).not.toContain('"app.refetchTitle"');
    }
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/appLogonWiring.test.ts > .superpowers/x.txt 2>&1; tail -30 .superpowers/x.txt`
Beklenen: "kenar çubuğu ＋ menüsünün üç eylemi bağlı" GEÇİYOR (görev 4 bağladı). Diğer üçü BAŞARISIZ.

- [ ] **Adım 3: Şeridi ve bandı sil**

`src/App.tsx`'te `<>` satırından (L1080) hemen sonra başlayan bloğu sil: `{/* Başlık şeridi, axet.code ekranının diline çekildi …` yorumundan başlayıp `<header …>…</header>` ve `{noLandscapeFile && ( <div …> … </div> )}` bloklarını da kapsayarak, `<div className="flex min-h-0 flex-1 overflow-hidden">` satırına KADAR (o satır kalıyor). Sonuç:

```tsx
          <>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
```

- [ ] **Adım 4: Kullanılmayan import'ları sil**

Şerit gidince `RefreshCw`, `AlertTriangle`, `Plus`, `Download`, `btn`, `iconBtn`, `tintBtn` App.tsx'te başka yerde kullanılmıyor (her biri yalnız import satırında ve şeritte geçiyordu). L2-9 şu olur:

```tsx
import { X, FileText } from "lucide-react";
```

L64'teki `import { btn, iconBtn, tintBtn } from "./ui/buttons";` satırını tamamen sil.

`loading` değişkeni KALIYOR: L1018'de `LogonSidebar`'a veriliyor.

- [ ] **Adım 5: SystemPanel'e boş durum bilgisini ver**

`noLandscapeFile` (L953) zaten "landscape okundu ama içinde sistem yok" demek; boş liste ile uyarı aynı koşula bağlı. `<SystemPanel` kullanımında `onSetTier={handleSetTier}` satırının altına:

```tsx
                      listEmpty={!!noLandscapeFile}
                      emptyHint={
                        noLandscapeFile ? t("app.noLandscapeFile", { file: landscape?.sourceFile ?? "" }) : undefined
                      }
                      onAddSystem={() => setAddSystemOpen(true)}
```

- [ ] **Adım 6: i18n**

Önce başka kullanan kalmadığını gör:
Çalıştır: `grep -rn "app.addSystemTitle\|app.refetchTitle" src tests`
Beklenen: yalnızca `src/i18n/tr.ts`, `src/i18n/en.ts` ve `tests/appLogonWiring.test.ts`.

`src/i18n/tr.ts`'ten sil:
- `"app.addSystemTitle": "Yeni SAP sistemi ekle",`
- `"app.refetchTitle": "Sistemleri SAP Logon'dan yeniden getir",`

`src/i18n/en.ts`'ten sil:
- `"app.addSystemTitle": "Add a new SAP system",`
- `"app.refetchTitle": "Reload systems from SAP Logon",`

- [ ] **Adım 7: Yeşili gör**

Çalıştır: `npx vitest run tests/appLogonWiring.test.ts tests/appTerminalWiring.test.ts tests/systemPanel.test.tsx tests/logonSidebar.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: hepsi GEÇİYOR (appLogonWiring 4, systemPanel 25, logonSidebar 16, appTerminalWiring değişmeden).

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok, çıkış kodu 0. Kullanılmayan bir import kaldıysa `noUnusedLocals` burada söyler; onu da sil.

- [ ] **Adım 8: Commit**

```bash
git add src/App.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/appLogonWiring.test.ts
git commit -m "Logon: ust serit ve sari bant kalkti, bos durum sag tarafta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 6: Modal'a `hideClose`

Rol seçimi (görev 9) zorunlu bir seçim: kapatılamamalı. Bugün `Modal` başlıkta her zaman bir X düğmesi çiziyor. `hideClose` bu düğmeyi gizliyor; Escape davranışı değişmiyor (`onClose` yine çağrılıyor, zorunlu pencere onu boş bir işlevle veriyor).

**Dosyalar:**
- Değişecek: `src/ui/Modal.tsx` (`ModalProps` L95-116, `ModalPanel` parametreleri L122-134, başlıktaki X düğmesi L265-273)
- Test: `tests/modal.test.tsx` (bugün 20 test)

**Arayüzler:**
- Üretir: `ModalProps.hideClose?: boolean` (varsayılan `false`). Görev 9'daki `RoleModal` kullanıyor.

- [ ] **Adım 1: Testi yaz**

`tests/modal.test.tsx`'in sonuna:

```tsx
describe("Modal — hideClose", () => {
  it("varsayılan olarak başlıkta Kapat düğmesi var", () => {
    wrap(<Modal open onClose={vi.fn()} title="Başlık" />);
    expect(screen.getByRole("button", { name: "Kapat" })).toBeTruthy();
  });

  it("hideClose verilince başlıkta Kapat düğmesi yok, Escape yine onClose'u çağırıyor", () => {
    const onClose = vi.fn();
    wrap(<Modal open onClose={onClose} title="Başlık" hideClose />);
    expect(screen.queryByRole("button", { name: "Kapat" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/modal.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: ikinci yeni test BAŞARISIZ (Kapat düğmesi bulunuyor). Tip denetimi de `hideClose` bilinmediği için hata verir; vitest tip denetimi yapmadığından test yine de çalışıyor.

`Modal` Escape'i `document` üzerinde yakalama evresinde dinliyor (L202), bu yüzden dialog'a gönderilen `keyDown` de ona ulaşıyor.

- [ ] **Adım 3: Uygula**

`src/ui/Modal.tsx`, `ModalProps` içinde `layer?: ModalLayer;` satırının altına:

```tsx
  /** Doğruysa başlıktaki X düğmesi çizilmiyor. Zorunlu seçim pencereleri
   *  için (ör. RoleModal): kullanıcının kapatabileceği izlenimi vermemeli.
   *  Escape yine `onClose`'u çağırıyor; zorunlu pencere onu boş veriyor. */
  hideClose?: boolean;
```

`ModalPanel` parametrelerinde `layer = "modal",` satırının altına `hideClose = false,` ekle.

Başlıktaki X düğmesini koşula al:

```tsx
            {!hideClose && (
              <button
                type="button"
                onClick={requestClose}
                disabled={closeDisabled}
                aria-label={t("common.close")}
                className={iconBtn("ghost", "sm")}
              >
                <X size={16} />
              </button>
            )}
```

`ModalPanel` içindeki kirli-çıkış onayı (`<Modal layer={layer === "modal" ? "confirm" : "critical"} …>`, ~L288) `hideClose` ALMIYOR: onay penceresinin X'i kalıyor.

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/modal.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: 22 test GEÇİYOR.

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok, çıkış kodu 0.

- [ ] **Adım 5: Commit**

```bash
git add src/ui/Modal.tsx
git add tests/modal.test.tsx
git commit -m "Modal: zorunlu pencereler icin hideClose

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 7: Giriş penceresi `Modal`'a geçiyor — `CredentialsModal`

Bugün elle yazılmış bir kaplama: kendi `fixed inset-0 z-50`'si, kendi Escape işleyicisi, `text-[11px]` etiketler. Doğrulama sürerken Escape ve X yine kapatıyor (spec §4.2: kapanmamalı). `Modal`'a geçince bunlar ortak kuraldan geliyor. İçerik aynı: kullanıcı, şifre, istemci, göster/gizle, ASCII dışı şifre uyarısı, hata satırı, "Doğrulanıyor…".

**Dosyalar:**
- Baştan yazılacak: `src/components/CredentialsModal.tsx` (246 satır; `Props` aynen kalıyor)
- Yeni test: `tests/credentialsModal.test.tsx`

**Arayüzler:**
- Kullanır: `Modal`, `ModalCancelButton` (`src/ui/Modal`), `Field`, `Input` (`src/ui/Field`), `Button` (`src/ui/Button`).
- `Props` değişmiyor; `App.tsx` L1276-1287 dokunulmuyor.
- Katman: varsayılan `layer="modal"`. Sertifika penceresi (görev 8) her zaman bundan SONRA açılıyor, yığında üste biniyor.

- [ ] **Adım 1: Testi yaz**

`tests/credentialsModal.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Giriş penceresi ortak Modal'a geçti (Logon sağ taraf spec'i §4.2). İçerik
// aynı kaldı; yeni olan, doğrulama sürerken pencerenin kapanmaması.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import CredentialsModal from "../src/components/CredentialsModal";
import type { SapService } from "../app-electron/shared/types";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const SERVICE: SapService = {
  uuid: "svc-a",
  systemId: "D01",
  name: "D01 Geliştirme",
  type: "SAPGUI",
  host: "d01.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

function mount(overrides: Partial<Parameters<typeof CredentialsModal>[0]> = {}) {
  const props = {
    open: true,
    service: SERVICE,
    connecting: false,
    errorMessage: null,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    loadDefaults: vi.fn(() => Promise.resolve({ username: "TESTUSER", password: "secret", client: "100" })),
    ...overrides
  };
  render(
    <LanguageProvider language="tr">
      <CredentialsModal {...props} />
    </LanguageProvider>
  );
  return props;
}

const loaded = () => waitFor(() => expect((screen.getByLabelText("Kullanıcı Adı") as HTMLInputElement).value).toBe("TESTUSER"));

describe("CredentialsModal", () => {
  it("kapalıyken ya da sistem yokken hiçbir şey çizmiyor", () => {
    mount({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    mount({ service: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dialog, başlık ve yüklenen varsayılanlar", async () => {
    mount();
    expect(screen.getByRole("dialog", { name: "Sisteme Bağlan" })).toBeTruthy();
    await loaded();
    expect((screen.getByLabelText("Şifre") as HTMLInputElement).value).toBe("secret");
    expect((screen.getByLabelText("Client") as HTMLInputElement).value).toBe("100");
  });

  it("Escape kapatıyor", async () => {
    const props = mount();
    await loaded();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("doğrulama sürerken kapanmıyor", async () => {
    const props = mount({ connecting: true });
    await waitFor(() => expect(props.loadDefaults).toHaveBeenCalled());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onClose).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "İptal" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Doğrulanıyor/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Bağlan formu gönderiyor", async () => {
    const props = mount();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Bağlan" }));
    expect(props.onSubmit).toHaveBeenCalledWith("TESTUSER", "secret", "100");
  });

  it("şifre göster/gizle düğmesinin adı var", async () => {
    mount();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Şifreyi göster" }));
    expect((screen.getByLabelText("Şifre") as HTMLInputElement).type).toBe("text");
    expect(screen.getByRole("button", { name: "Şifreyi gizle" })).toBeTruthy();
  });

  it("ASCII dışı şifrede uyarı çıkıyor ama Bağlan açık kalıyor", async () => {
    mount();
    await loaded();
    fireEvent.change(screen.getByLabelText("Şifre"), { target: { value: "şifre" } });
    expect(screen.getByText(/Şifrede ASCII dışı karakter var: ş\./)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Bağlan" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("hata satırı alert rolüyle okunuyor", async () => {
    mount({ errorMessage: "401 Unauthorized" });
    await loaded();
    expect(screen.getByRole("alert").textContent).toContain("401 Unauthorized");
  });

  it("sabit piksel yazı boyu yok", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/components/CredentialsModal.tsx", "utf8")).not.toMatch(/text-\[\d+px\]/);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/credentialsModal.test.tsx > .superpowers/x.txt 2>&1; tail -40 .superpowers/x.txt`
Beklenen BAŞARISIZ: "dialog, başlık…" (bugün `role="dialog"` yok ve etiketler alanlara bağlı değil), "Escape kapatıyor", "doğrulama sürerken kapanmıyor", "Bağlan formu gönderiyor", "ASCII dışı…" ve "hata satırı…" (hepsi `getByLabelText`'e ya da `role`'e dayanıyor), piksel testi. "kapalıyken…" GEÇİYOR. Göster/gizle düğmesinin bugün `title`'ı var ve testing-library onu ad sayıyor; ama şifre alanı etiketle bulunamadığı için o test de BAŞARISIZ.

- [ ] **Adım 3: Bileşeni yeniden yaz**

`src/components/CredentialsModal.tsx`:

```tsx
import { useEffect, useId, useState } from "react";
import { AlertTriangle, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import type { SapService } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";

interface Props {
  open: boolean;
  service: SapService | null;
  connecting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (username: string, password: string, client: string) => void;
  loadDefaults: (serviceUuid: string) => Promise<{ username: string; password: string; client: string }>;
}

export default function CredentialsModal({
  open,
  service,
  connecting,
  errorMessage,
  onClose,
  onSubmit,
  loadDefaults
}: Props) {
  const t = useT();
  const formId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [client, setClient] = useState("");
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowPassword(false);
  }, [open, service?.uuid]);

  useEffect(() => {
    if (!open || !service) return;
    setLoadingDefaults(true);
    loadDefaults(service.uuid)
      .then((defaults) => {
        setUsername(defaults.username);
        setPassword(defaults.password);
        setClient(defaults.client);
      })
      .finally(() => setLoadingDefaults(false));
  }, [open, service?.uuid]);

  if (!open || !service) return null;

  const isCloud = service.type === "BTP/CLOUD";
  const disabled = loadingDefaults || connecting;
  const canSubmit =
    username.trim().length > 0 && password.length > 0 && (isCloud || client.trim().length > 0) && !connecting;

  const address = service.manualAdtUrl ?? `${service.host ?? "?"}${service.port ? `:${service.port}` : ""}`;

  // basicAuth.ts'teki nonAsciiChars ile aynı kural. Ana süreç modülü renderer'a
  // import EDİLEMİYOR (Buffer), bu yüzden iki satırı burada tekrar ediyoruz.
  const passwordNonAscii = [...new Set([...password].filter((ch) => ch.codePointAt(0)! > 127))];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(username.trim(), password, client.trim());
  };

  return (
    <Modal
      open
      onClose={onClose}
      // Doğrulama sürerken kapanmıyor: sonuç (hata satırı ya da sertifika
      // sorusu) bu pencereye dönüyor.
      closeDisabled={connecting}
      width={440}
      icon={<KeyRound size={18} />}
      title={t("credentialsModal.title")}
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">
            {service.name}
            {service.systemId && ` (${service.systemId})`}
          </span>
          {(service.manualAdtUrl || service.host) && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate font-mono">{address}</span>
            </>
          )}
        </span>
      }
      footer={
        <>
          <ModalCancelButton />
          <Button type="submit" form={formId} variant="primary" disabled={!canSubmit}>
            {connecting && <Loader2 size={14} className="animate-spin" />}
            {connecting ? t("credentialsModal.verifying") : t("credentialsModal.connect")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t("credentialsModal.username")}>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={disabled} />
        </Field>

        <div className="flex flex-col gap-2">
          <Field label={t("credentialsModal.password")}>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                disabled={disabled}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("credentialsModal.hidePassword") : t("credentialsModal.showPassword")}
                title={showPassword ? t("credentialsModal.hidePassword") : t("credentialsModal.showPassword")}
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-slate-500 transition hover:bg-active hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          {/* (aynen) "Şifrede ASCII dışı karakter varsa DENEMEDEN uyar. …" yorumu */}
          {passwordNonAscii.length > 0 && (
            <div
              className="flex items-start gap-2 rounded-lg border border-l-[3px] px-3 py-2.5 text-xs"
              style={{
                borderColor: "var(--status-warning-border)",
                backgroundColor: "var(--status-warning-bg)",
                color: "var(--status-warning-text)"
              }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{t("credentialsModal.passwordNonAscii", { chars: passwordNonAscii.join(" ") })}</span>
            </div>
          )}
        </div>

        <Field
          label={
            <span className="inline-flex items-center gap-1.5">
              {/* lang="en": "Client" Türkçe sözlükte de İngilizce kalıyor (SAP
                  terimi); ekran okuyucu onu İngilizce okusun. */}
              <span lang="en">{t("credentialsModal.client")}</span>
              {isCloud && (
                <span className="rounded-full border border-line-strong px-1.5 py-0.5 text-2xs leading-none text-slate-500">
                  {t("credentialsModal.optional").trim()}
                </span>
              )}
            </span>
          }
        >
          <Input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder={
              isCloud ? t("credentialsModal.clientPlaceholderCloud") : t("credentialsModal.clientPlaceholderOnprem")
            }
            disabled={disabled}
          />
        </Field>

        {errorMessage && (
          <div
            role="alert"
            className="animate-alert-slide-in flex items-start gap-2 rounded-lg border border-l-[3px] px-3 py-2.5 text-xs"
            style={{
              borderColor: "var(--status-danger-border)",
              backgroundColor: "var(--status-danger-bg)",
              color: "var(--status-danger-text)"
            }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
```

Notlar:
- `useId` erken `return null`'dan ÖNCE: kancalar her çizimde aynı sırayla çağrılmalı.
- `(aynen)` yazan yeri, eski dosyadaki ASCII uyarısı yorumunun tamamıyla değiştir (“Şifrede ASCII dışı karakter varsa DENEMEDEN uyar. Ölçüm (2026-09-23, DS4) …” — altı satır, harfi harfine).
- Alan ikonları (`User`, `Lock`, `Hash`) ve başlıktaki `ShieldCheck` alt satırı düşüyor: `Input` sol ikon almıyor ve diğer pencerelerde de yok. Sistem adı ve adresi `subtitle`'a taşındı.
- Kullanıcı adı alanındaki `autoFocus` gitti: `Modal` ilk odağı gövdenin ilk öğesine (kullanıcı adı) kendisi veriyor.
- İstemci etiketinin `uppercase`'i kalktı (`Field` etiketi büyütmüyor); bu yüzden "CLİENT" sorunu da ortadan kalktı, `lang="en"` artık okunuş için.

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/credentialsModal.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: 9 test GEÇİYOR.

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok, çıkış kodu 0.

- [ ] **Adım 5: Commit**

```bash
git add src/components/CredentialsModal.tsx
git add tests/credentialsModal.test.tsx
git commit -m "Giris penceresi ortak Modal'a gecti, dogrulama surerken kapanmiyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 8: Sertifika sorusu `Modal`'a geçiyor — `CertTrustDialog`

Bugün `fixed inset-0 z-[60]` ile giriş penceresinin (z-50) üstünde duruyor ve Escape'i kendi yakalıyor. `Modal` yığınında sonra açılan üstte kalıyor; sertifika sorusu her zaman giriş penceresi açıkken, doğrulama sırasında geliyor, yani katman `modal` yeterli. Escape yalnız en üstteki pencereyi kapatıyor: sertifika sorusunda Escape giriş penceresini kapatmamalı.

**Dosyalar:**
- Baştan yazılacak: `src/components/CertTrustDialog.tsx` (97 satır; `Props` ve `groupFingerprint` aynen)
- Yeni test: `tests/certTrustDialog.test.tsx`

**Arayüzler:**
- Kullanır: `Modal`, `ModalCancelButton`, `Button`. Görev 7'nin `CredentialsModal`'ı (yığın testi için).
- `Props` değişmiyor; `App.tsx` L1289-1294 dokunulmuyor.

- [ ] **Adım 1: Testi yaz**

`tests/certTrustDialog.test.tsx`:

```tsx
// @vitest-environment jsdom
//
// Sertifika sorusu ortak Modal'a geçti (Logon sağ taraf spec'i §4.2). Karar
// anı: varsayılan odak İptal'de, Escape yalnız bu soruyu kapatıyor.

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import CertTrustDialog from "../src/components/CertTrustDialog";
import CredentialsModal from "../src/components/CredentialsModal";
import type { CertTrustPrompt, SapService } from "../app-electron/shared/types";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const PROMPT: CertTrustPrompt = {
  kind: "untrusted",
  key: "d01.example.test:44300",
  host: "d01.example.test",
  port: 44300,
  fingerprint: "ab".repeat(32),
  previousFingerprint: null,
  subject: "CN=d01.example.test",
  issuer: "CN=Example CA",
  validFrom: "2026-01-01",
  validTo: "2027-01-01",
  selfSigned: false,
  reason: "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
};

const SERVICE: SapService = {
  uuid: "svc-a",
  systemId: "D01",
  name: "D01 Geliştirme",
  type: "SAPGUI",
  host: "d01.example.test",
  port: 3200,
  raw: "",
  routerId: null,
  routerString: null,
  username: "TESTUSER"
};

function mount(overrides: Partial<Parameters<typeof CertTrustDialog>[0]> = {}) {
  const props = { prompt: PROMPT, busy: false, onTrust: vi.fn(), onCancel: vi.fn(), ...overrides };
  render(
    <LanguageProvider language="tr">
      <CertTrustDialog {...props} />
    </LanguageProvider>
  );
  return props;
}

describe("CertTrustDialog", () => {
  it("soru yokken hiçbir şey çizmiyor", () => {
    mount({ prompt: null });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("başlık dialog'un adı, odak İptal'de", () => {
    mount();
    expect(screen.getByRole("dialog", { name: "SAP sertifikası doğrulanamadı" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "İptal" }));
  });

  it("Escape ve İptal onCancel'ı çağırıyor", () => {
    const props = mount();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "İptal" }));
    expect(props.onCancel).toHaveBeenCalledTimes(2);
  });

  it("Güven düğmesi onTrust'ı çağırıyor", () => {
    const props = mount();
    fireEvent.click(screen.getByRole("button", { name: "Bu sertifikaya güven ve bağlan" }));
    expect(props.onTrust).toHaveBeenCalledTimes(1);
  });

  it("meşgulken iki düğme kapalı, Escape etkisiz", () => {
    const props = mount({ busy: true });
    expect((screen.getByRole("button", { name: "İptal" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Bu sertifikaya güven ve bağlan" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("değişen sertifikada önceki parmak izi de gösteriliyor", () => {
    mount({ prompt: { ...PROMPT, kind: "changed", previousFingerprint: "cd".repeat(32) } });
    expect(screen.getByRole("dialog", { name: "SAP sertifikası değişti" })).toBeTruthy();
    expect(screen.getByText("Önceki parmak izi")).toBeTruthy();
    expect(screen.getByText(Array(32).fill("CD").join(":"))).toBeTruthy();
  });

  it("giriş penceresinin üstünde: Escape yalnız sertifika sorusunu kapatıyor", async () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();
    const tree = (prompt: CertTrustPrompt | null) => (
      <LanguageProvider language="tr">
        <CredentialsModal
          open
          service={SERVICE}
          connecting={false}
          errorMessage={null}
          onClose={onClose}
          onSubmit={vi.fn()}
          loadDefaults={() => Promise.resolve({ username: "TESTUSER", password: "secret", client: "100" })}
        />
        <CertTrustDialog prompt={prompt} onTrust={vi.fn()} onCancel={onCancel} />
      </LanguageProvider>
    );
    const { rerender } = render(tree(null));
    await waitFor(() => expect((screen.getByLabelText("Kullanıcı Adı") as HTMLInputElement).value).toBe("TESTUSER"));
    rerender(tree(PROMPT));
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sabit piksel yazı boyu yok", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/components/CertTrustDialog.tsx", "utf8")).not.toMatch(/text-\[\d+px\]/);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/certTrustDialog.test.tsx > .superpowers/x.txt 2>&1; tail -40 .superpowers/x.txt`
Beklenen BAŞARISIZ: `role="dialog"` arayan testler, meşgulken Escape (bugün `busy` Escape'i durdurmuyor), yığın testi (bugün iki pencere de Escape'i dinliyor ya da hiçbiri dialog değil), piksel testi. GEÇİYOR: "soru yokken…", "Güven düğmesi…".

- [ ] **Adım 3: Bileşeni yeniden yaz**

`src/components/CertTrustDialog.tsx`. Dosya başındaki yorum bloğu ve `groupFingerprint` (yorumuyla) AYNEN kalıyor; import'lar ve bileşen gövdesi değişiyor:

```tsx
import { ShieldAlert } from "lucide-react";
import type { CertTrustPrompt } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";

// (aynen) "SAP sunucusunun TLS sertifikası doğrulanamadığında …" yorum bloğu
interface Props {
  prompt: CertTrustPrompt | null;
  busy?: boolean;
  onTrust: () => void;
  onCancel: () => void;
}

// (aynen) "64 hanelik hex'i ikişerli gruplara bölüyor …" yorumu
function groupFingerprint(fp: string): string {
  return (fp.match(/.{1,2}/g) ?? []).join(":").toUpperCase();
}

export default function CertTrustDialog({ prompt, busy = false, onTrust, onCancel }: Props) {
  const t = useT();
  if (!prompt) return null;
  const changed = prompt.kind === "changed";
  const endpoint = `${prompt.host}:${prompt.port}`;

  return (
    <Modal
      open
      onClose={onCancel}
      // Onay ya da bağlantı sürerken kapanmıyor.
      closeDisabled={busy}
      width={560}
      icon={<ShieldAlert size={18} className="text-[var(--status-warning-text)]" />}
      title={changed ? t("certTrust.changedTitle") : t("certTrust.untrustedTitle")}
      footer={
        <>
          {/* Varsayılan odak İptal'de: Enter'a refleksle basan kullanıcı
              sertifikaya güvenmiş olmasın. */}
          <ModalCancelButton autoFocus />
          <Button variant="primary" onClick={onTrust} disabled={busy}>
            {t("certTrust.trust")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-slate-400">
          {changed ? t("certTrust.changedMessage", { endpoint }) : t("certTrust.untrustedMessage", { endpoint })}
        </p>
        <div className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2 text-xs text-[var(--status-warning-text)]">
          {changed ? t("certTrust.changedWarning") : t("certTrust.untrustedWarning")}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          {changed && prompt.previousFingerprint && (
            <>
              <dt className="text-slate-500">{t("certTrust.previousFingerprint")}</dt>
              <dd className="break-all font-mono text-2xs text-slate-400">
                {groupFingerprint(prompt.previousFingerprint)}
              </dd>
            </>
          )}
          <dt className="text-slate-500">{changed ? t("certTrust.newFingerprint") : t("certTrust.fingerprint")}</dt>
          <dd className="break-all font-mono text-2xs text-slate-200">{groupFingerprint(prompt.fingerprint)}</dd>
          <dt className="text-slate-500">{t("certTrust.subject")}</dt>
          <dd className="break-all text-slate-300">{prompt.subject || "—"}</dd>
          <dt className="text-slate-500">{t("certTrust.issuer")}</dt>
          <dd className="break-all text-slate-300">
            {prompt.issuer || "—"}
            {prompt.selfSigned ? ` (${t("certTrust.selfSigned")})` : ""}
          </dd>
          <dt className="text-slate-500">{t("certTrust.validity")}</dt>
          <dd className="text-slate-300">
            {prompt.validFrom || "?"} — {prompt.validTo || "?"}
          </dd>
          {prompt.reason && (
            <>
              <dt className="text-slate-500">{t("certTrust.reason")}</dt>
              <dd className="break-all text-slate-400">{prompt.reason}</dd>
            </>
          )}
        </dl>
      </div>
    </Modal>
  );
}
```

`ModalCancelButton` `closeDisabled`'ı (`busy`) kendisi uyguluyor; `disabled` vermeye gerek yok. Gövdede odaklanabilir öğe olmadığı için `Modal` ilk odağı zaten ayaktaki ilk düğmeye (İptal) verirdi; `autoFocus` bunu açıkça yazıyor.

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/certTrustDialog.test.tsx tests/credentialsModal.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: 17 test GEÇİYOR (8 + 9).

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok, çıkış kodu 0.

- [ ] **Adım 5: Commit**

```bash
git add src/components/CertTrustDialog.tsx
git add tests/certTrustDialog.test.tsx
git commit -m "Sertifika sorusu ortak Modal'a gecti, Escape yalniz ustteki pencereyi kapatiyor

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 9: Ortam sorusu ve rol seçimi `Modal`'a geçiyor

`TierPromptModal` (z-[65]) ve `RoleModal` (z-[70]) elle yazılmış kaplamalar. Rol seçimi uygulama ilk açılışta, her şeyden önce soruluyor ve zorunlu; her zaman en üstte kalmalı. Bu yüzden `layer="critical"` alıyor. Ortam sorusu bağlanırken açılıyor; giriş penceresiyle aynı anda açık olmuyor, `layer="modal"` yeterli.

**Dosyalar:**
- Değişecek: `src/components/TierPromptModal.tsx` (115 satır; yalnız `return` bloğu ve import'lar)
- Değişecek: `src/components/RoleModal.tsx` (225 satır; yalnız `return` bloğunun kaplaması ve import'lar)
- Test: `tests/tierPromptModal.test.tsx` (4 test, aynen kalıyor), `tests/roleModal.test.tsx` (7 test, aynen kalıyor)

**Arayüzler:**
- Kullanır: `Modal`, `ModalCancelButton`, `Button`; görev 6'daki `hideClose`.
- `Props` ikisinde de değişmiyor.

- [ ] **Adım 1: Yeni testleri ekle**

`tests/tierPromptModal.test.tsx`'in sonuna:

```tsx
describe("TierPromptModal — ortak pencere", () => {
  it("dialog adı başlık, ilk odak pencerede (seçenek düğmesinde değil)", () => {
    mount();
    const dialog = screen.getByRole("dialog", { name: "Bu sistem hangisi?" });
    expect(document.activeElement).toBe(dialog);
  });

  it("Escape 'Şimdi değil' ile aynı: tier seçmeden geçiyor", () => {
    const { onChoose, onSkip } = mount("DEV");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
  });
});
```

`tests/roleModal.test.tsx`'in sonuna:

```tsx
describe("RoleModal — ortak pencere", () => {
  it("dialog adı başlık, Escape pencereyi kapatmıyor", () => {
    const { onConfirm } = mount();
    const dialog = screen.getByRole("dialog", { name: "Hangi danışmansın?" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Hangi danışmansın?" })).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/tierPromptModal.test.tsx tests/roleModal.test.tsx > .superpowers/x.txt 2>&1; tail -30 .superpowers/x.txt`
Beklenen: eski 11 test GEÇİYOR; 3 yeni test BAŞARISIZ (bugün `role="dialog"` yok).

- [ ] **Adım 3: `TierPromptModal`**

Import'lar:

```tsx
import { useEffect, useState } from "react";
import { Check, Lock, PenLine } from "lucide-react";
import type { SystemTier } from "../../app-electron/shared/types";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";
import TierBadge from "./TierBadge";
```

`if (!open) return null;` satırından sonraki `return (…)` bloğunun tamamı:

```tsx
  return (
    <Modal
      open
      // Escape ve İptal "Şimdi değil" ile aynı: hiçbir şey kaydetmeden,
      // salt okunur geçiyor.
      onClose={onSkip}
      width={520}
      // İlk öğe bir seçenek düğmesi; Enter'a refleksle basan kullanıcı bir
      // ortam seçmiş olmasın.
      initialFocus="dialog"
      title={t("tierPrompt.title")}
      subtitle={t("tierPrompt.subtitle", { system: systemLabel })}
      footer={
        <>
          <ModalCancelButton label={t("tierPrompt.skip")} />
          <Button variant="primary" disabled={tier === null} onClick={() => tier && onChoose(tier)}>
            {t("tierPrompt.confirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {TIERS.map((id) => {
          const selected = tier === id;
          const Icon = id === "DEV" ? PenLine : Lock;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTier(id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                selected
                  ? "border-accent-400/60 bg-accent-400/10"
                  : "border-line/60 bg-control/40 hover:border-line hover:bg-control/70"
              }`}
            >
              <Icon size={15} className={`mt-0.5 shrink-0 ${selected ? "text-accent-400" : "text-slate-400"}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <TierBadge tier={id} />
                  <span className="text-sm font-medium text-white">{t(`tierPrompt.option.${id}`)}</span>
                  {guess === id && <span className="text-2xs text-slate-500">{t("tierPrompt.guessHint")}</span>}
                  {selected && <Check size={13} className="text-accent-400" />}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">
                  {t(`tierPrompt.desc.${id}`)}
                </span>
              </span>
            </button>
          );
        })}
        <p className="pt-1 text-xs text-slate-500">{t("tierPrompt.changeLater")}</p>
      </div>
    </Modal>
  );
```

Seçenek düğmeleri ve `useEffect` aynen. `DIALOG_CANCEL_BUTTON`/`DIALOG_CONFIRM_BUTTON` import'u gidiyor.

- [ ] **Adım 4: `RoleModal`**

Import'larda `import { DIALOG_CONFIRM_BUTTON } from "../ui/buttons";` yerine:

```tsx
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
```

`return (…)` bloğunda DIŞ İKİ `<div>` (kaplama `fixed inset-0 z-[70] …` ve panel `… w-[620px] …`), başlık `<div>`'i ve ayak `<div>`'i gidiyor; onların yerine `Modal` geliyor. Ortadaki `<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">` `Modal`'ın gövdesi kaydırma ve dolguyu kendisi verdiği için `<div className="space-y-4">` oluyor; içindeki HER ŞEY (rol düğmeleri, kalıcılık uyarısı ve yorumu, `mustChoose`, önizleme, kilit uyarısı, onay kutusu) aynen kalıyor.

```tsx
  return (
    <Modal
      open
      // Zorunlu seçim: Escape, X ve arka plan kapatmıyor. `onClose` boş,
      // başlıkta X yok (`hideClose`), İptal düğmesi yok.
      onClose={() => {}}
      hideClose
      // Her şeyin üstünde: uygulama ilk açılışta, başka her pencereden önce
      // soruluyor ve cevaplanmadan hiçbir şey yapılamamalı.
      layer="critical"
      width={620}
      // İlk öğe bir rol düğmesi; kalıcı bir seçim Enter'la yapılmasın.
      initialFocus="dialog"
      title={t("roleModal.title")}
      subtitle={systemLabel ? t("roleModal.subtitleWithSystem", { system: systemLabel }) : t("roleModal.subtitle")}
      footer={
        // (aynen) "İPTAL DÜĞMESİ YOK — seçim zorunlu. …" yorumu
        <Button
          variant="primary"
          disabled={!canConfirm}
          onClick={() => profile && onConfirm(profile, needsNotice)}
        >
          {t("roleModal.confirm")}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* rol düğmeleri … onay kutusu: eski gövdenin içeriği, aynen */}
      </div>
    </Modal>
  );
```

`{/* rol düğmeleri … */}` satırı bir yer tutucu değil, taşıma talimatı: eski `min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4` div'inin İÇİNDEKİ her satırı (`<div className="space-y-2">{ROLES.map(…)}</div>`'den `{needsNotice && (<label …>…</label>)}`'e kadar) buraya olduğu gibi yapıştır. `(aynen)` yazan yorumu da eski ayak `div`'inin üstündeki yorumla değiştir; JSX içinde `{/* … */}` biçiminde, `footer={` ile `<Button` arasına.

Bir düzeltme: önizleme başlığındaki `text-xs font-medium uppercase tracking-wide text-slate-500` aynen kalıyor (piksel değil, kural dışı değil).

- [ ] **Adım 5: Yeşili gör**

Çalıştır: `npx vitest run tests/tierPromptModal.test.tsx tests/roleModal.test.tsx tests/modal.test.tsx > .superpowers/x.txt 2>&1; tail -20 .superpowers/x.txt`
Beklenen: 36 test GEÇİYOR (tier 6, rol 8, modal 22).

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok, çıkış kodu 0.

- [ ] **Adım 6: Commit**

```bash
git add src/components/TierPromptModal.tsx
git add src/components/RoleModal.tsx
git add tests/tierPromptModal.test.tsx
git add tests/roleModal.test.tsx
git commit -m "Ortam sorusu ve rol secimi ortak Modal'a gecti

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Görev 10: Taşınan dosyalar kuralı ve son denetim

**Dosyalar:**
- Değişecek: `tests/dialogMigration.test.tsx` ("taşınan dosyalar" `FILES` listesi, ~L307-313)

- [ ] **Adım 1: Dört dosyayı kurala ekle**

`FILES` listesinin sonuna, `"SettingsModal.tsx"`'ten sonra:

```ts
    "CredentialsModal.tsx",
    "CertTrustDialog.tsx",
    "TierPromptModal.tsx",
    "RoleModal.tsx"
```

(`"SettingsModal.tsx"` satırının sonuna virgül ekle.) Kural: `text-[Npx]` yok, `fixed inset-0` yok, `z-[N]` yok, `import ConfirmDialog` yok.

- [ ] **Adım 2: Tüm paket ve tip denetimi**

Çalıştır: `npx vitest run > .superpowers/x.txt 2>&1; tail -15 .superpowers/x.txt`
Beklenen: tüm dosyalar GEÇİYOR, başarısız test yok.

Çalıştır: `npm run -s typecheck`
Beklenen: çıktı yok, çıkış kodu 0.

Kalıntı araması:
Çalıştır: `grep -rn "z-\[6[05]\]\|z-\[70\]\|DIALOG_CONFIRM_BUTTON" src/components/CredentialsModal.tsx src/components/CertTrustDialog.tsx src/components/TierPromptModal.tsx src/components/RoleModal.tsx`
Beklenen: çıktı yok.

- [ ] **Adım 3: Commit**

```bash
git add tests/dialogMigration.test.tsx
git commit -m "Test: Logon pencereleri tasinan dosyalar kuralina eklendi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Adım 4: Gözle kontrol (kullanıcı)**

`npm run dev` zaten çalışıyor; yeniden BAŞLATMA. Kullanıcıdan uygulamada şunlara bakmasını iste:
1. Logon ekranı: sistem seçili değilken boş durum; bir sistem seçince başlık, durum yazısı, iki eylem düğmesi, bilgiler, notlar.
2. Kenar çubuğundaki ＋ menüsü: üç seçenek, klavye ile gezinme.
3. "Axet'te Aç" → giriş penceresi; yanlış şifreyle hata satırı; doğrulama sürerken Escape'in kapatmadığı.
4. Uzun adlı bir sistemde başlığın tek satırda kesilmesi.
