# Başsız köprü — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Sohbet ekranını görünmez terminal (PTY + axet-code TUI) yerine `axet-code run --resume … --output-format json` başsız moduyla çalıştırmak; eski yolu tamamen kaldırmak.

**Mimari:**
- Her mesaj kendi kısa ömürlü `axet-code run` sürecini açar. İstem stdin'den verilir.
- Oturum kimliği `-v` stderr satırından (ilk tur) ya da bağlamadan (`--resume`) gelir.
- Canlı metin ve araç olayları bugünkü gibi axet-code veritabanından, ama yalnız o oturumdan okunur. Sonuç stdout'taki JSON'dan alınır.
- Renderer'ın IPC kanalları aynı kalır. Soru kartı, kuyruk ve iptal arayüzde değişmeden çalışır; soru cevabı aynı oturuma yeni bir `run` olarak gider ama renderer'a göre aynı tur sürer.

**Teknoloji:** Electron 44 (Node 24), TypeScript, React 18, vitest 2, better-sqlite3 (salt okuma). Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-16-basiz-kopru-design.md`

## Genel kurallar

- **Commit ve dal:**
  - Commit mesajı ASCII Türkçe; sonunda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `git add` dosya dosya. Dal: `ozellik/basiz-kopru`.
- **Düzenleme:**
  - Kod yorumları tam Türkçe karakterle; prettier yok.
  - Satır sonu dosyanın kendisininki. Ters eğik çizgili düzenlemede Edit aracı ya da Write ile yazılmış `.cjs` betiği kullanılır; heredoc ters eğik çizgiyi yutuyor.
- **axet-code:**
  - En düşük sürüm **1.4.0**.
  - Komut: `axet-code run -v -q --output-format json [--resume <id>] -c <cwd> [-m <sağlayıcı/model>]`. İstem **stdin**'den.
- **Bağlayıcı kapalı turda** ortam: `AXET_MCP_BASE_URL=http://127.0.0.1:9` (bugünkü `axetSpawnEnv(false)`).
- **Süreler:** sessizlik uyarısı 5 dk (tur öldürülmez), sert sınır 6 sa, veritabanı yoklaması 150 ms, ilerleme yoklaması 1 sn.
- **Yeniden deneme:** yalnız turda araç çalışmadıysa, tek sefer; yetki hatasında 15 sn beklenir. Araç çalıştıysa yeniden gönderme yok.
- **Soru aracı:** `ask_user` görülürse, aracın **sonucu veritabanına düştükten sonra** süreç ağacı öldürülür (sonuçsuz araç çağrısı oturumu bozar).
- **Bozuk oturuma devam edilmez.** `--resume` öncesi oturumda sonuçsuz araç çağrısı (`sessionHasUnansweredToolCall`) varsa yeni oturum açılır ve geçmiş tohumlanır.
- **Model seçimi** axet-code'un global ayarına yazılmaz; tur başına `-m`.
- **Uygulamanın Terminal ekranına dokunulmaz.** `axetFlows*`, `agenticConnectors` gibi başka `axet-code` kullanıcılarına da dokunulmaz.
- **Komutlar:** `npm run typecheck`, `npx vitest run <dosya>`; tam takım `npx vitest run` (çıktıyı dosyaya al).

**Spec'ten bilinçli sapmalar:**
1. **Seçenekli soru yalnız ana süreçte.** Hem `secenekler` bloğu hem `ask_user` ağı ana süreçte bugünkü `askUser` olayına çevriliyor. Renderer'daki soru kartı değişmeden kullanılıyor; spec §10'daki "renderer bloğu ayrıştırır" yerine bu.
   - Gerekçe: tek akış, tek test yüzeyi, renderer'da sıfır yeni kod.
2. **Güncelleme uyarısı kalıyor.** `axetChat:updateAvailable` kaldırılmıyor; kaynağı terminal ekranı yerine her turun stderr'indeki `Update check done … current=X latest=Y` satırı.
   - Gerekçe: uyarı kullanıcıya hâlâ gerekli, renderer değişmiyor.
3. **Sahte süreç ve sahte veritabanı test içinde.** Spec §12'deki "node:sqlite ile gerçek şemaya yazan ayrı sahte program" yerine çalıştırıcı bağımlılık enjeksiyonuyla test ediliyor: sahte `spawn` ve sahte mesaj okuyucu.
   - Gerekçe: better-sqlite3 Electron ABI'si için derli, vitest'in Node'unda yüklenmiyor. Gerçek veritabanı okuması mevcut `readMessagesSince`'te kalıyor; gerçek axet-code ile duman testi kullanıcıya veriliyor (Görev 7, Adım 11).
4. **Yeni sohbetlerin varsayılan modeli bizim config'imizde** (`AppConfig.chatDefaultModel`). Spec §7 global ayara yazmayı yasaklıyor ama seçimin yeniden açılışta hatırlanması gerekiyor.
5. **Güncelleme duyurusu kalıcı** (`axetCodeLatestSeen`, Görev 6). Duyuru eskiden de kalıcıydı; açılış ekranında, henüz tur koşmadan görünmesi için.
6. **"Devam et" yeni bir düğme değil.** Mevcut "yarıda kaldı + Devam et" satırı (`interrupted`) hata notuyla kullanılıyor (Görev 5).

## İnceleme odağı

1. **Tur bir araç çağrısının ortasında iptal edilmişse sonraki mesaj** 400 almadan yeni, tohumlanmış oturumda gitmeli. (Görev 4 testi)
2. **Aynı klasörde iki sohbet aynı anda çalışırken** her sohbet yalnız kendi oturumunun metnini ve araçlarını görmeli. (Görev 3 testi)
3. **Oturum kimliği daha gelmeden** (süreç açılırken) **basılan Durdur** süreci öldürmeli; tur "iptal" olarak kapanmalı, askıda kalmamalı. (Görev 3 testi)
4. **axet-code JSON basmadan çıkarsa** (çökme, eski sürüm, yetki), kullanıcı stderr'den temizlenmiş bir hata görmeli, boş balon değil. (Görev 3 testi)
5. **Türkçe karakterli ve çok uzun istem** stdin'e bayt bayt doğru gitmeli; komut satırına hiç girmemeli. (Görev 3 testi)

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `app-electron/main/axetToolEvents.ts` (yeni) | Saf: araç adı, hedef, sonuç özeti, fark, `ask_user` ayrıştırma, `secenekler` bloğu (Görev 1) |
| `app-electron/main/axetCodeVersion.ts` (genişler) | Sürüm ve bozuk/yok denetimi, güncelleme satırı (Görev 2); duyurunun kalıcılığı (Görev 6) |
| `app-electron/main/axetHeadless.ts` (yeni) | Tek bir `run` turu: süreç, stdin, oturum kimliği, veritabanı yoklaması, olaylar, iptal, `ask_user` ağı, JSON sonucu (Görev 3) |
| `app-electron/main/axetChat.ts` (yeniden yazılır) | Dış yüz: bağlama/`--resume` kararı, istem, yeniden deneme, hata metinleri, soru akışı, iptal (Görev 4) |
| `app-electron/main/axetSessionBinding.ts` (değişir) | Başlık isteğe bağlı (Görev 4) |
| `src/lib/settleAnswer.ts` (yeni), `ChatBubble.tsx` | Tur sonucu → balon; araç çalıştıktan sonra düşen turda "Devam et" (Görev 5) |
| `app-electron/main/axetChatTui.ts`, `tuiPaste.ts` + testleri (silinir) | Isıtma, "durduramadım", global model yazma da gidiyor (Görev 6) |
| `app-electron/main/axetChatRecovery.ts` (değişir) | Kimlikle kurtarma, `tool_use` ayrımı (Görev 7) |
| `app-electron/main/chatStore.ts`, `src/lib/saveDelay.ts` (yeni), `appLog.ts` | Doğru sohbetin kırpılması, kayıt hatası, akışta kayıt, günlüğün susmaması (Görev 7) |
| `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts`, `AxetCodeHome.tsx` | IPC ve renderer bağlantıları (Görev 6–7) |
| `app-electron/main/doctor.ts`, `app-electron/main/i18n/{tr,en}.ts`, `src/i18n/{tr,en}.ts` | Sürüm satırı ve metinler (Görev 2, 4–7) |

---

### Görev 1: Saf araç olayları modülü

**Dosyalar:**
- Yeni: `app-electron/main/axetToolEvents.ts`
- Değişir: `app-electron/main/axetChatTui.ts` (taşınan bildirimler silinir, yeni modülden içe aktarılır; Görev 6'da dosya tamamen silinecek)
- Test: `tests/axetToolEvents.test.ts`

**Arayüzler:**
- Üretir:

```ts
export const ASK_USER_TOOL = "ask_user";
export interface AskUserRequest { callId: string; question: string; header: string; options: string[]; multiSelect: boolean }
export interface ResultSummary { result: string; extraLines: number; output: string; failed: boolean }   // mevcut tanımın aynısı
export function normalizeToolName(raw: string): string;
export function summarizeToolInput(input: string | undefined): string;
export function summarizeToolResult(content: string | undefined, isError: boolean | undefined): ResultSummary;
export function buildDiff(tool: string, input: string | undefined): string;
export function parseAskUser(callId: string, input: string | undefined): AskUserRequest | null;
export function askUserAsText(ask: AskUserRequest): string;
/** Cevabın sonundaki ```secenekler bloğunu ayırır; blok yoksa ask null. */
export function splitOptionsBlock(text: string): { text: string; ask: AskUserRequest | null };
```

- [ ] **Adım 1: Taşı (davranış değişmeden)**

`app-electron/main/axetChatTui.ts`'ten şu bildirimleri **olduğu gibi** (yorumlarıyla) kesip yeni `app-electron/main/axetToolEvents.ts`'e yapıştır:
- `normalizeToolName`, `TARGET_KEYS`, `TARGET_MAX`, `clip`, `summarizeToolInput`;
- `RE_TOOL_FAILED`, `ResultSummary`, `OUTPUT_MAX`, `stripResultWrapper`, `summarizeToolResult`;
- `DIFF_MAX`, `diffBlock`, `buildDiff`;
- `ASK_USER_TOOL`, `AskUserRequest`, `parseAskUser`, `askUserAsText`.

Satır aralıkları: yaklaşık 1237–1480 ve 1589–1638. `MENU_TAIL`/`escapeTuiMenus`/`promptNeedle` (1385–1395, 1479–1509) **taşınmaz**.

Yeni dosyada:
- Saydığın her isim `export` olur.
- Başına:

```ts
// axet-code oturum veritabanındaki araç çağrılarını ve sonuçlarını sohbet
// olaylarına çeviren SAF yardımcılar. Eskiden axetChatTui.ts'in içindeydi;
// başsız köprü (axetHeadless.ts) de aynılarını kullanıyor, terminal kodu
// silinince de yaşamaları gerekiyor (spec 2026-10-16 basiz-kopru).
import { mt } from "./i18n";
```

`axetChatTui.ts`'te silinen bildirimlerin yerine:

```ts
import {
  ASK_USER_TOOL,
  askUserAsText,
  buildDiff,
  normalizeToolName,
  parseAskUser,
  summarizeToolInput,
  summarizeToolResult,
  type AskUserRequest
} from "./axetToolEvents";
```

Çalıştır: `npm run typecheck` ve `npx vitest run tests/openToolCall.test.ts tests/policyBlock.test.ts`
Beklenen: temiz / PASS. Davranış değişmedi.

Bu testler Tui kaynağını metin olarak okuyorsa ve taşınan bir ismi arıyorsa, aranan dosya yolunu `axetToolEvents.ts` yap ve ledger'a yaz.

- [ ] **Adım 2: Kırmızı test** — `tests/axetToolEvents.test.ts`

```ts
// Saf araç olayları ve `secenekler` bloğu (spec 2026-10-16 basiz-kopru §5).
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));

const { parseAskUser, splitOptionsBlock, summarizeToolInput, normalizeToolName } = await import(
  "../app-electron/main/axetToolEvents"
);

const FENCE = "```";

describe("splitOptionsBlock", () => {
  it("sondaki secenekler bloğunu ayırıp soruya çeviriyor", () => {
    const raw = `Hangi transport'a yazayım?\n\n${FENCE}secenekler\n- D01K900123\n- D01K900130 (yeni)\n${FENCE}\n`;
    const { text, ask } = splitOptionsBlock(raw);
    expect(text).toBe("Hangi transport'a yazayım?");
    expect(ask).toEqual({
      callId: "secenekler",
      question: "Hangi transport'a yazayım?",
      header: "",
      options: ["D01K900123", "D01K900130 (yeni)"],
      multiSelect: false
    });
  });

  it("blok yoksa metin aynen, ask null", () => {
    expect(splitOptionsBlock("Bitti.")).toEqual({ text: "Bitti.", ask: null });
  });

  it("tek seçenekli ya da boş blok soru sayılmıyor ama metinden atılıyor", () => {
    const { text, ask } = splitOptionsBlock(`Tamam.\n${FENCE}secenekler\n- Evet\n${FENCE}`);
    expect(text).toBe("Tamam.");
    expect(ask).toBeNull();
  });

  it("blok sonda değilse (arkasından metin geliyorsa) dokunulmuyor", () => {
    const raw = `${FENCE}secenekler\n- A\n- B\n${FENCE}\nDevamı var.`;
    expect(splitOptionsBlock(raw)).toEqual({ text: raw, ask: null });
  });

  it("soru metni boşsa blok yine soru; soru alanı boş", () => {
    const { text, ask } = splitOptionsBlock(`${FENCE}secenekler\n- A\n- B\n${FENCE}`);
    expect(text).toBe("");
    expect(ask?.options).toEqual(["A", "B"]);
    expect(ask?.question).toBe("");
  });
});

describe("taşınan yardımcılar", () => {
  it("ask_user girdisi", () => {
    expect(parseAskUser("c1", '{"question":"Renk?","options":[{"label":"Kırmızı"},{"label":"Mavi"}]}')).toEqual({
      callId: "c1",
      question: "Renk?",
      header: "",
      options: ["Kırmızı", "Mavi"],
      multiSelect: false
    });
    expect(parseAskUser("c1", '{"question": "Yar')).toBeNull();
  });

  it("araç adı ve hedef", () => {
    expect(normalizeToolName("view")).toBe("view");
    expect(summarizeToolInput('{"file_path":"C:/p/a.abap"}')).toContain("a.abap");
  });
});
```

- [ ] **Adım 3: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/axetToolEvents.test.ts`
Beklenen: FAIL — `splitOptionsBlock is not a function`. Taşınan yardımcılar PASS.

`normalizeToolName("view")` beklentisi taşınan kodla uyuşmazsa, beklentiyi kodun gerçek çıktısına göre düzelt; kodu değil. Ledger'a `Ruling:`.

- [ ] **Adım 4: Uygula** — `axetToolEvents.ts`'in sonuna:

```ts
/**
 * Başsız modda `ask_user` kullanıcıya ulaşmıyor: axet-code "No interactive
 * user… use your best judgment" dönüyor ve ajan kendi seçiyor (ölçüm
 * 2026-10-16). Bu yüzden ajandan soruyu turun SONUNDA şu blokla vermesi
 * isteniyor (bkz. axetChat.ts `ASK_RULE`):
 *
 *     ```secenekler
 *     - Seçenek 1
 *     - Seçenek 2
 *     ```
 *
 * Blok yalnızca METNİN SONUNDAYSA soru sayılıyor: ortadaki bir örnek, ajanın
 * kullanıcıya biçimi anlatması olabilir. En az iki seçenek gerekiyor; daha
 * azında basılacak düğme yok, blok yine de metinden atılıyor.
 */
const OPTIONS_BLOCK = /\n?```secenekler[ \t]*\r?\n([\s\S]*?)\r?\n?```[ \t]*\s*$/;

export function splitOptionsBlock(text: string): { text: string; ask: AskUserRequest | null } {
  const m = OPTIONS_BLOCK.exec(text);
  if (!m) return { text, ask: null };
  const rest = text.slice(0, m.index).trim();
  const options = m[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);
  if (options.length < 2) return { text: rest, ask: null };
  return {
    text: rest,
    ask: { callId: "secenekler", question: rest, header: "", options, multiSelect: false }
  };
}
```

- [ ] **Adım 5: Yeşili gör**

Çalıştır: `npx vitest run tests/axetToolEvents.test.ts` ve `npm run typecheck`
Beklenen: 7/7 PASS, typecheck temiz.

- [ ] **Adım 6: Commit**

```bash
git add app-electron/main/axetToolEvents.ts
git add app-electron/main/axetChatTui.ts
git add tests/axetToolEvents.test.ts
git commit -m "Basiz kopru: arac olaylari saf modulu (Tui'den tasindi) + secenekler blogu" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 2: Sürüm, bozuk program ve güncelleme denetimi

**Dosyalar:**
- Değişir: `app-electron/main/axetCodeVersion.ts`, `app-electron/main/doctor.ts`, `app-electron/main/i18n/tr.ts`, `app-electron/main/i18n/en.ts`
- Test: `tests/axetBinaryStatus.test.ts`

Spec §8 `axetVersion.ts` diyor. Aynı işi yapan `axetCodeVersion.ts` zaten var; Doktor ve destek paketi onu kullanıyor. İkinci bir sondaj modülü açmak yerine onu genişletiyoruz. Ledger'a `Ruling:`.

**Arayüzler:**
- Üretir (`axetCodeVersion.ts`):

```ts
export const MIN_AXET_VERSION = "1.4.0";
export type AxetBinaryStatus =
  | { kind: "ok"; version: string }
  | { kind: "old"; version: string }
  | { kind: "missing" }
  | { kind: "broken"; detail: string };
export function compareVersions(a: string, b: string): number;          // -1 / 0 / 1, sayısal parça parça
export function statusFromProbe(p: ProbeOutcome): AxetBinaryStatus;      // saf
export interface ProbeOutcome { errorCode: string | null; errorMessage: string; stdout: string }
export async function axetBinaryStatus(force?: boolean): Promise<AxetBinaryStatus>; // önbellekli
export function axetBinaryMessage(status: AxetBinaryStatus): string | null;       // ok → null
export function noteUpdateLine(line: string): void;                    // stderr satırı
export function axetUpdateAvailable(): { installed: string; latest: string } | null;
```

Mevcut `noteAxetCodeVersion()` ve `axetCodeVersion()` kalır (destek paketi ve günlük kullanıyor).

- [ ] **Adım 1: Kırmızı test** — `tests/axetBinaryStatus.test.ts`

```ts
// axet-code sürüm/bozuk denetimi (spec 2026-10-16 basiz-kopru §8). Gerçek
// olay: güncelleyici exe'yi 0 bayta indirdi (2026-10-15 ve 2026-10-16),
// sohbet sessizce cevapsız kaldı.
import { describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/i18n", () => ({
  mt: (k: string, p?: Record<string, unknown>) => (p ? `${k} ${JSON.stringify(p)}` : k)
}));

const { axetBinaryMessage, axetUpdateAvailable, compareVersions, noteUpdateLine, statusFromProbe } = await import(
  "../app-electron/main/axetCodeVersion"
);

describe("compareVersions", () => {
  it("sayısal karşılaştırıyor", () => {
    expect(compareVersions("1.4.0", "1.4.0")).toBe(0);
    expect(compareVersions("1.3.9", "1.4.0")).toBe(-1);
    expect(compareVersions("1.10.0", "1.4.0")).toBe(1);
    expect(compareVersions("1.4", "1.4.0")).toBe(0);
  });
});

describe("statusFromProbe", () => {
  it("1.4.1 tamam, 1.3.0 eski", () => {
    expect(statusFromProbe({ errorCode: null, errorMessage: "", stdout: "axet-code version 1.4.1\n" })).toEqual({
      kind: "ok",
      version: "1.4.1"
    });
    expect(statusFromProbe({ errorCode: null, errorMessage: "", stdout: "axet-code version 1.3.0" })).toEqual({
      kind: "old",
      version: "1.3.0"
    });
  });

  it("bulunamadı: ENOENT", () => {
    expect(statusFromProbe({ errorCode: "ENOENT", errorMessage: "spawn axet-code.exe ENOENT", stdout: "" })).toEqual({
      kind: "missing"
    });
  });

  it("0 baytlık exe: Win32 hatası ya da boş çıktı bozuk sayılıyor", () => {
    expect(
      statusFromProbe({ errorCode: "UNKNOWN", errorMessage: "spawn UNKNOWN", stdout: "" }).kind
    ).toBe("broken");
    expect(statusFromProbe({ errorCode: null, errorMessage: "", stdout: "" }).kind).toBe("broken");
  });
});

describe("axetBinaryMessage", () => {
  it("tamamsa mesaj yok, diğerlerinde ilgili anahtar", () => {
    expect(axetBinaryMessage({ kind: "ok", version: "1.4.1" })).toBeNull();
    expect(axetBinaryMessage({ kind: "old", version: "1.3.0" })).toContain("chat.axetTooOld");
    expect(axetBinaryMessage({ kind: "old", version: "1.3.0" })).toContain("1.3.0");
    expect(axetBinaryMessage({ kind: "missing" })).toContain("chat.axetMissing");
    expect(axetBinaryMessage({ kind: "broken", detail: "x" })).toContain("chat.axetBroken");
  });
});

describe("güncelleme satırı", () => {
  it("latest > current ise duyuru; eşitse yok", () => {
    noteUpdateLine("INFO Update check done component=bgjob job=auto-update current=1.4.1 latest=1.4.1 minimum=1.3.0");
    expect(axetUpdateAvailable()).toBeNull();
    noteUpdateLine("2026/10/16 15:58:46 INFO Update check done component=bgjob job=auto-update current=1.4.1 latest=1.4.2 minimum=1.3.0");
    expect(axetUpdateAvailable()).toEqual({ installed: "1.4.1", latest: "1.4.2" });
    noteUpdateLine("INFO başka bir satır");
    expect(axetUpdateAvailable()).toEqual({ installed: "1.4.1", latest: "1.4.2" });
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/axetBinaryStatus.test.ts`
Beklenen: FAIL — fonksiyonlar yok.

- [ ] **Adım 3: Uygula** — `app-electron/main/axetCodeVersion.ts`'in sonuna (import satırına `import { mt } from "./i18n";` ekle):

```ts
// ---------------------------------------------------------------------------
// Sohbetin ön koşulu: axet-code 1.4+ ve SAĞLAM bir program dosyası
// ---------------------------------------------------------------------------
// Başsız köprü `run --resume` ve `--output-format json` kullanıyor; ikisi de
// 1.4.0'da geldi (spec 2026-10-16 basiz-kopru). Ayrıca axet-code'un kendi
// güncelleyicisi, program kullanımdayken onu 0 bayta indirip "başarılı"
// diyebiliyor (2026-10-15 ve 2026-10-16'da iki kez görüldü). O durumda
// sohbet sessizce cevapsız kalıyordu; artık ne olduğunu söylüyor.

export const MIN_AXET_VERSION = "1.4.0";

export type AxetBinaryStatus =
  | { kind: "ok"; version: string }
  | { kind: "old"; version: string }
  | { kind: "missing" }
  | { kind: "broken"; detail: string };

export interface ProbeOutcome {
  errorCode: string | null;
  errorMessage: string;
  stdout: string;
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function statusFromProbe(p: ProbeOutcome): AxetBinaryStatus {
  if (p.errorCode === "ENOENT") return { kind: "missing" };
  const m = /version\s+([0-9]+(?:\.[0-9]+)*)/i.exec(p.stdout);
  if (p.errorCode || !m) {
    // 0 baytlık exe Windows'ta "not a valid Win32 application" (UNKNOWN/EFTYPE)
    // veriyor ya da hiçbir şey basmıyor; ikisi de aynı şey: program bozuk.
    return { kind: "broken", detail: (p.errorMessage || p.stdout || "boş çıktı").slice(0, 200) };
  }
  const version = m[1];
  return compareVersions(version, MIN_AXET_VERSION) < 0 ? { kind: "old", version } : { kind: "ok", version };
}

function probeOutcome(): Promise<ProbeOutcome> {
  return new Promise((resolve) => {
    execFile("axet-code.exe", ["--version"], { timeout: 5_000, windowsHide: true }, (err, stdout) => {
      const e = err as (NodeJS.ErrnoException & { code?: string | number }) | null;
      resolve({
        errorCode: e ? String(e.code ?? "ERR") : null,
        errorMessage: e ? e.message : "",
        stdout: String(stdout ?? "")
      });
    });
  });
}

let cachedStatus: AxetBinaryStatus | null = null;

/**
 * Önbellekli; `force` ile yeniden sorulur. Sohbet bir tur başlatamazsa
 * (süreç açılamadı, JSON yok) çağıran `force` ile tazeliyor: arada kullanıcı
 * axet-code'u onarmış ya da güncelleyici bozmuş olabilir.
 */
export async function axetBinaryStatus(force = false): Promise<AxetBinaryStatus> {
  if (cachedStatus && !force) return cachedStatus;
  cachedStatus = statusFromProbe(await probeOutcome());
  if (cachedStatus.kind === "ok" || cachedStatus.kind === "old") lastSeen = cachedStatus.version;
  return cachedStatus;
}

export function axetBinaryMessage(status: AxetBinaryStatus): string | null {
  switch (status.kind) {
    case "ok":
      return null;
    case "old":
      return mt("chat.axetTooOld", { version: status.version, min: MIN_AXET_VERSION });
    case "missing":
      return mt("chat.axetMissing");
    case "broken":
      return mt("chat.axetBroken");
  }
}

// Her `run -v` turu stderr'e şunu yazıyor (ölçüm 2026-10-16):
//   INFO Update check done component=bgjob job=auto-update current=1.4.1 latest=1.4.1 minimum=1.3.0 …
// Eski TUI ekranındaki "new version available" yazısının yerine bu okunuyor.
const RE_UPDATE_LINE = /Update check done\b.*?\bcurrent=([0-9][\w.+-]*)\s+latest=([0-9][\w.+-]*)/;
let updateInfo: { installed: string; latest: string } | null = null;

export function noteUpdateLine(line: string): void {
  const m = RE_UPDATE_LINE.exec(line);
  if (!m) return;
  updateInfo = compareVersions(m[2], m[1]) > 0 ? { installed: m[1], latest: m[2] } : null;
}

export function axetUpdateAvailable(): { installed: string; latest: string } | null {
  return updateInfo;
}
```

`app-electron/main/i18n/tr.ts`, `"chat.emptyAnswerTui"` girdisinin üstüne:

```ts
  "chat.axetTooOld": "Sohbet için axet-code {min} veya üstü gerekiyor; kurulu sürüm {version}. axet-code'u güncelleyin.",
  "chat.axetMissing": "axet-code bulunamadı. axet-code'u kurun.",
  "chat.axetBroken":
    "axet-code program dosyası bozuk (güncelleme yarıda kalmış olabilir). %TEMP%\\axet-code-update.msi varsa Win+R ile çalıştırın: msiexec /fa \"%TEMP%\\axet-code-update.msi\" — yoksa axet-code'u yeniden kurun.",
```

`app-electron/main/i18n/en.ts`, aynı yere:

```ts
  "chat.axetTooOld": "Chat needs axet-code {min} or later; installed version is {version}. Please update axet-code.",
  "chat.axetMissing": "axet-code was not found. Please install axet-code.",
  "chat.axetBroken":
    "The axet-code program file is broken (an update may have been interrupted). If %TEMP%\\axet-code-update.msi exists, run via Win+R: msiexec /fa \"%TEMP%\\axet-code-update.msi\" — otherwise reinstall axet-code.",
```

Bu iki dosyadaki ters eğik çizgiler Edit aracıyla yazılmalı.

`app-electron/main/doctor.ts`:
- Import'a `axetBinaryMessage`, `axetBinaryStatus` ekle.
- `const axetVersion = axetCodeVersion();` ile başlayan bloğu şununla değiştir:

```ts
  // Sürüm ve SAĞLAMLIK: sohbet 1.4+ ister, güncelleyici exe'yi boşaltabiliyor.
  const axetStatus = await axetBinaryStatus(true);
  rows.push(
    axetStatus.kind === "ok"
      ? { id: "axetCode", status: "ok", detail: axetStatus.version }
      : { id: "axetCode", status: "fail", detail: axetBinaryMessage(axetStatus) ?? mt("doctor.axetUnknown") }
  );
```

`axetCodeVersion` import'u artık kullanılmıyorsa kaldır.

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/axetBinaryStatus.test.ts` ve `npm run typecheck`. Doktor testleri varsa (`ls tests | grep -i doctor`) onları da çalıştır.
Beklenen: 7/7 PASS, typecheck temiz. Doktor testi `axetCodeVersion`'ı sahteliyorsa yeni fonksiyonları da sahtele (`axetBinaryStatus: async () => ({ kind: "ok", version: "1.4.1" })`).

- [ ] **Adım 5: Commit**

```bash
git add app-electron/main/axetCodeVersion.ts
git add app-electron/main/doctor.ts
git add app-electron/main/i18n/tr.ts
git add app-electron/main/i18n/en.ts
git add tests/axetBinaryStatus.test.ts
git commit -m "Basiz kopru: axet-code surum/bozuk denetimi (1.4+), guncelleme satirindan duyuru, Doktor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Değişen Doktor testlerini de dosya dosya ekle.)

---
### Görev 3: Tek tur çalıştırıcı (`axetHeadless.ts`)

**Dosyalar:**
- Yeni: `app-electron/main/axetHeadless.ts`
- Test: `tests/axetHeadless.test.ts`

**Arayüzler:**
- Tüketir:
  - Görev 1: `ASK_USER_TOOL`, `parseAskUser`, `normalizeToolName`, `summarizeToolInput`, `summarizeToolResult`, `buildDiff`, `AskUserRequest`.
  - Görev 2: `noteUpdateLine`.
  - Mevcut: `toolInputComplete` (`toolCallInput.ts`); `AxetDbMessage`, `finishAuthFailure`, `finishPolicyBlock`, `finishPoisonsHistory` (`axetSessionDb.ts`).
- Üretir:

```ts
export interface ChildLike {
  pid?: number;
  stdin: { write(data: string, enc: "utf-8"): unknown; end(): unknown; on(ev: "error", cb: () => void): unknown } | null;
  stdout: NodeJS.EventEmitter | null;
  stderr: NodeJS.EventEmitter | null;
  on(ev: "close", cb: (code: number | null) => void): unknown;
  on(ev: "error", cb: (err: Error & { code?: string }) => void): unknown;
}
export type HeadlessFailure = "auth" | "context" | "provider" | "blocked" | "poisoned";
export interface HeadlessTurnArgs {
  cwd: string;
  model: AxetModelEntry | null;
  prompt: string;
  resumeId: string | null;
  useConnectors: boolean;
  onSessionId(id: string): void;
  onChunk(text: string): void;
  onActivity(activity: AxetChatActivity): void;
  onProgress(progress: AxetChatProgress): void;
}
export interface HeadlessTurnResult {
  ok: boolean;
  text: string;
  error?: string;
  sessionId: string | null;
  cancelled: boolean;
  timedOut: boolean;
  spawnFailed: boolean;
  toolCount: number;
  ask: AskUserRequest | null;
  failure: HeadlessFailure | null;
}
export interface HeadlessDeps {
  spawn(cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }): ChildLike;
  env(useConnectors: boolean): NodeJS.ProcessEnv;
  dbPath(cwd: string): string | null;
  readMessages(dbPath: string, sessionId: string, sinceSec: number): AxetDbMessage[];
  readProgress(dbPath: string, sessionId: string): AxetChatProgress;
  killTree(child: ChildLike): void;
  now(): number;
  pollMs: number;
  progressMs: number;
  silenceMs: number;
  hardCapMs: number;
}
export interface HeadlessTurn { done: Promise<HeadlessTurnResult>; cancel(): void }
export function buildRunArgs(args: Pick<HeadlessTurnArgs, "cwd" | "model" | "resumeId">): string[];
export function classifyStderr(lines: string[]): HeadlessFailure | null;
export function cleanStderr(stderr: string): string;
export function defaultHeadlessDeps(): HeadlessDeps;
export function startHeadlessTurn(args: HeadlessTurnArgs, deps?: HeadlessDeps): HeadlessTurn;
```

- [ ] **Adım 1: Kırmızı test** — `tests/axetHeadless.test.ts`

```ts
// Başsız tur çalıştırıcı (spec 2026-10-16 basiz-kopru §4–§6). Sahte süreç +
// sahte veritabanı okuyucu; gerçek axet-code ile ölçülen biçimler kullanılıyor.
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import type { AxetDbMessage } from "../app-electron/main/axetSessionDb";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({ noteUpdateLine: vi.fn() }));

const { buildRunArgs, classifyStderr, startHeadlessTurn } = await import("../app-electron/main/axetHeadless");

const SID = "90645781-855b-4e0e-aaae-8e5efdee112d";

class FakeChild extends EventEmitter {
  pid = 4242;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  written = "";
  ended = false;
  stdin = {
    write: (d: string) => {
      this.written += d;
      return true;
    },
    end: () => {
      this.ended = true;
    },
    on: () => undefined
  };
  exit(code: number | null, stdout = "") {
    if (stdout) this.stdout.emit("data", Buffer.from(stdout, "utf-8"));
    this.emit("close", code);
  }
  err(line: string) {
    this.stderr.emit("data", Buffer.from(line + "\n", "utf-8"));
  }
}

function msg(id: string, role: string, parts: unknown[], createdAt = 2_000_000_000): AxetDbMessage {
  return { id, role, parts: parts as AxetDbMessage["parts"], createdAt };
}
const text = (t: string) => ({ type: "text", data: { text: t } });
const finish = (reason: string, extra: Record<string, unknown> = {}) => ({ type: "finish", data: { reason, ...extra } });

function harness(db: Record<string, AxetDbMessage[]> = {}) {
  const child = new FakeChild();
  const spawned: { cmd: string; args: string[] }[] = [];
  const killed: number[] = [];
  const deps = {
    spawn: (cmd: string, args: string[]) => {
      spawned.push({ cmd, args });
      return child as never;
    },
    env: () => ({}),
    dbPath: () => "C:/p/.axet-code/axet-code.db",
    readMessages: (_p: string, sid: string) => db[sid] ?? [],
    readProgress: () => ({ todos: [], contextTokens: 0, contextLimit: 1_000_000 }),
    killTree: () => {
      killed.push(1);
      setTimeout(() => child.exit(null), 1);
    },
    now: () => Date.now(),
    pollMs: 5,
    progressMs: 1000,
    silenceMs: 60_000,
    hardCapMs: 60_000
  };
  const events = { chunks: [] as string[], activities: [] as Record<string, unknown>[], sessionIds: [] as string[] };
  const base = {
    cwd: "C:/p",
    model: null,
    prompt: "merhaba",
    resumeId: null,
    useConnectors: false,
    onSessionId: (id: string) => events.sessionIds.push(id),
    onChunk: (t: string) => events.chunks.push(t),
    onActivity: (a: Record<string, unknown>) => events.activities.push(a),
    onProgress: () => {}
  };
  return { child, spawned, killed, deps, events, base, db };
}
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe("buildRunArgs", () => {
  it("yeni oturum ve devam; istem argümanlarda yok", () => {
    expect(buildRunArgs({ cwd: "C:/p", model: null, resumeId: null })).toEqual([
      "run", "-v", "-q", "--output-format", "json", "-c", "C:/p"
    ]);
    expect(buildRunArgs({ cwd: "C:/p", model: { provider: "openai", model: "gpt-5.6-terra" } as never, resumeId: SID })).toEqual([
      "run", "-v", "-q", "--output-format", "json", "--resume", SID, "-c", "C:/p", "-m", "openai/gpt-5.6-terra"
    ]);
  });
});

describe("startHeadlessTurn", () => {
  it("ilk tur: oturum kimliği stderr'den, metin veritabanından (mesajlar arası boş satır), sonuç JSON'dan", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick();
    expect(h.events.sessionIds).toEqual([SID]);
    h.db[SID] = [
      msg("u1", "user", [text("merhaba"), finish("stop")]),
      msg("a1", "assistant", [text("Kontrol ediyorum."), finish("tool_use")]),
      msg("a2", "assistant", [text("Dosyada sorun yok."), finish("end_turn")])
    ];
    await tick();
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "Dosyada sorun yok.", is_error: false }) + "\n");
    const r = await turn.done;
    expect(r).toMatchObject({ ok: true, sessionId: SID, cancelled: false, toolCount: 0, ask: null });
    expect(r.text).toBe("Kontrol ediyorum.\n\nDosyada sorun yok.");
    expect(h.events.chunks.join("")).toBe("Kontrol ediyorum.\n\nDosyada sorun yok.");
  });

  it("devam turu: --resume; önceden var olan mesajlar yayılmıyor", async () => {
    const h = harness({ [SID]: [msg("eski", "assistant", [text("ESKI"), finish("end_turn")], 1)] });
    const turn = startHeadlessTurn({ ...h.base, resumeId: SID }, h.deps as never);
    await tick();
    h.db[SID] = [...h.db[SID], msg("a9", "assistant", [text("YENI"), finish("end_turn")])];
    await tick();
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "YENI", is_error: false }));
    const r = await turn.done;
    expect(h.spawned[0].args).toContain("--resume");
    expect(r.text).toBe("YENI");
    expect(h.events.chunks.join("")).not.toContain("ESKI");
  });

  it("başka oturumun mesajları görünmüyor (inceleme odağı 2)", async () => {
    const h = harness({ "baska-oturum": [msg("x", "assistant", [text("YABANCI")])] });
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    await tick();
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "tamam", is_error: false }));
    const r = await turn.done;
    expect(h.events.chunks.join("")).not.toContain("YABANCI");
    expect(r.text).toBe("tamam");
  });

  it("araç çağrısı ve sonucu olay olarak; araç sayılıyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = [
      msg("a1", "assistant", [
        { type: "tool_call", data: { id: "c1", name: "view", input: '{"file_path":"C:/p/a.abap"}', finished: true } },
        finish("tool_use")
      ]),
      msg("t1", "tool", [{ type: "tool_result", data: { tool_call_id: "c1", content: "satir1\nsatir2", is_error: false } }])
    ];
    await tick(40);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    const r = await turn.done;
    expect(r.toolCount).toBe(1);
    const phases = h.events.activities.map((a) => a.phase);
    expect(phases).toContain("tool");
    expect(phases).toContain("toolResult");
  });

  it("ask_user: sonucu düşünce süreç öldürülüyor, soru dönüyor (spec §5)", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err(`INFO Created session for non-interactive run session_id=${SID}`);
    h.db[SID] = [
      msg("a1", "assistant", [
        { type: "tool_call", data: { id: "q1", name: "ask_user", input: '{"question":"Hangi transport?","options":[{"label":"K1"},{"label":"K2"}]}', finished: true } },
        finish("tool_use")
      ])
    ];
    await tick(30);
    expect(h.killed).toHaveLength(0); // sonuç yokken öldürmek oturumu bozardı
    h.db[SID] = [
      ...h.db[SID],
      msg("t1", "tool", [{ type: "tool_result", data: { tool_call_id: "q1", content: "No interactive user", is_error: true } }])
    ];
    const r = await turn.done;
    expect(h.killed.length).toBeGreaterThan(0);
    expect(r.ok).toBe(true);
    expect(r.ask).toMatchObject({ question: "Hangi transport?", options: ["K1", "K2"] });
    expect(r.toolCount).toBe(0);
  });

  it("oturum kimliği gelmeden iptal: süreç öldürülüyor, tur iptal (inceleme odağı 3)", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    turn.cancel();
    const r = await turn.done;
    expect(h.killed).toHaveLength(1);
    expect(r).toMatchObject({ ok: false, cancelled: true, sessionId: null });
  });

  it("JSON yok, çıkış 1: temizlenmiş stderr hata, sınıf auth (inceleme odağı 4)", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.err("INFO Running in non-interactive mode");
    h.child.err('ERROR provider request failed error="POST https://x/v1/messages: 403 Forbidden"');
    h.child.exit(1);
    const r = await turn.done;
    expect(r.ok).toBe(false);
    expect(r.error).toContain("403 Forbidden");
    expect(r.error).not.toContain("Running in non-interactive");
    expect(r.failure).toBe("auth");
  });

  it("is_error:true JSON → hata, metni sonuçtan", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "context length exceeded", is_error: true }));
    const r = await turn.done;
    expect(r).toMatchObject({ ok: false, sessionId: SID, failure: "context" });
    expect(r.error).toContain("context length exceeded");
  });

  it("Türkçe ve uzun istem stdin'e aynen gidiyor, argümanlarda yok (inceleme odağı 5)", async () => {
    const h = harness();
    const prompt = "Şu ABAP sınıfını incele: ğüşıöç ".repeat(5000);
    const turn = startHeadlessTurn({ ...h.base, prompt }, h.deps as never);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    await turn.done;
    expect(h.child.written).toBe(prompt);
    expect(h.child.ended).toBe(true);
    expect(h.spawned[0].args.join(" ")).not.toContain("ABAP");
  });

  it("süreç açılamazsa spawnFailed", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, h.deps as never);
    h.child.emit("error", Object.assign(new Error("spawn axet-code ENOENT"), { code: "ENOENT" }));
    const r = await turn.done;
    expect(r).toMatchObject({ ok: false, spawnFailed: true });
  });

  it("sessizlikte stalled olayı, tur öldürülmüyor", async () => {
    const h = harness();
    const turn = startHeadlessTurn(h.base, { ...h.deps, silenceMs: 15 } as never);
    await tick(60);
    expect(h.events.activities.some((a) => a.phase === "stalled")).toBe(true);
    expect(h.killed).toHaveLength(0);
    h.child.exit(0, JSON.stringify({ type: "result", session_id: SID, result: "ok", is_error: false }));
    await turn.done;
  });
});

describe("classifyStderr", () => {
  it("yetki, bağlam, sağlayıcı", () => {
    expect(classifyStderr(["ERROR x 401 Unauthorized"])).toBe("auth");
    expect(classifyStderr(["ERROR prompt is too long: context length exceeded"])).toBe("context");
    expect(classifyStderr(["ERROR 529 overloaded_error"])).toBe("provider");
    expect(classifyStderr(["INFO her şey yolunda"])).toBeNull();
    // bağlayıcı uyarısı yetki arızası sayılmıyor (analiz bulgu 10)
    expect(classifyStderr(["WARN connector.sync.failed unauthorized"])).toBeNull();
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/axetHeadless.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Uygula** — `app-electron/main/axetHeadless.ts`

```ts
// Başsız köprü: TEK bir sohbet turunu `axet-code run` ile çalıştırır
// (spec 2026-10-16 basiz-kopru). Görünmez terminal yok: istem stdin'den
// gidiyor, oturum kimliği `-v` satırından ya da `--resume`'dan geliyor,
// canlı metin ve araçlar axet-code'un veritabanından YALNIZCA bu oturum için
// okunuyor, sonuç stdout'taki JSON belgesinden alınıyor. Süreç tur bitince
// kapanıyor; ayakta bekleyen axet-code yok.
//
// Ölçümler (axet-code 1.4.1, 2026-10-16): `-v` ~3,3 sn'de "Created session
// for non-interactive run session_id=…" basıyor; izinler sorulmadan kabul
// ediliyor; `ask_user` "No interactive user…" dönüyor; süreç ağacını
// öldürmek oturumu bozmuyor; veritabanı tur sürerken parça parça yazılıyor.

import { spawn } from "node:child_process";
import type { AxetChatActivity, AxetChatProgress, AxetModelEntry } from "../shared/types";
import { noteUpdateLine } from "./axetCodeVersion";
import { axetSpawnEnv } from "./axetSpawnEnv";
import {
  finishAuthFailure,
  finishPoisonsHistory,
  finishPolicyBlock,
  readMessagesSince,
  resolveSessionDb,
  sessionTodos,
  sessionTokens,
  type AxetDbMessage
} from "./axetSessionDb";
import {
  ASK_USER_TOOL,
  buildDiff,
  normalizeToolName,
  parseAskUser,
  summarizeToolInput,
  summarizeToolResult,
  type AskUserRequest
} from "./axetToolEvents";
import { toolInputComplete } from "./toolCallInput";

export interface ChildLike {
  pid?: number;
  stdin: { write(data: string, enc: "utf-8"): unknown; end(): unknown; on(ev: "error", cb: () => void): unknown } | null;
  stdout: NodeJS.EventEmitter | null;
  stderr: NodeJS.EventEmitter | null;
  on(ev: "close", cb: (code: number | null) => void): unknown;
  on(ev: "error", cb: (err: Error & { code?: string }) => void): unknown;
}

export type HeadlessFailure = "auth" | "context" | "provider" | "blocked" | "poisoned";

export interface HeadlessTurnArgs {
  cwd: string;
  model: AxetModelEntry | null;
  prompt: string;
  resumeId: string | null;
  useConnectors: boolean;
  onSessionId(id: string): void;
  onChunk(text: string): void;
  onActivity(activity: AxetChatActivity): void;
  onProgress(progress: AxetChatProgress): void;
}

export interface HeadlessTurnResult {
  ok: boolean;
  text: string;
  error?: string;
  sessionId: string | null;
  cancelled: boolean;
  timedOut: boolean;
  spawnFailed: boolean;
  toolCount: number;
  ask: AskUserRequest | null;
  failure: HeadlessFailure | null;
}

export interface HeadlessDeps {
  spawn(cmd: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }): ChildLike;
  env(useConnectors: boolean): NodeJS.ProcessEnv;
  dbPath(cwd: string): string | null;
  readMessages(dbPath: string, sessionId: string, sinceSec: number): AxetDbMessage[];
  readProgress(dbPath: string, sessionId: string): AxetChatProgress;
  killTree(child: ChildLike): void;
  now(): number;
  pollMs: number;
  progressMs: number;
  silenceMs: number;
  hardCapMs: number;
}

export interface HeadlessTurn {
  done: Promise<HeadlessTurnResult>;
  cancel(): void;
}

const CONTEXT_LIMIT_TOKENS = 1_000_000;
const RE_CREATED = /Created session for non-interactive run session_id=([0-9a-f-]{36})/i;

export function buildRunArgs(args: Pick<HeadlessTurnArgs, "cwd" | "model" | "resumeId">): string[] {
  const out = ["run", "-v", "-q", "--output-format", "json"];
  if (args.resumeId) out.push("--resume", args.resumeId);
  out.push("-c", args.cwd);
  if (args.model) out.push("-m", `${args.model.provider}/${args.model.model}`);
  return out;
}

// stderr'deki `-v` satırları düz metin ("ERROR … 403 Forbidden"). Bağlayıcı
// uyarıları (connector.sync) yetki arızası SAYILMIYOR: bugün her açılışta
// düşüyorlar ve turu öldürmemeliler (analiz 2026-10-16, bulgu 10).
const RE_IGNORED = /connector\.sync|MCP client/i;
const RE_AUTH = /\b(401|403)\b|unauthori[sz]ed|forbidden|invalid[_ ]?token|token (has )?expired/i;
const RE_CONTEXT = /context (length|window)|too many tokens|prompt is too long|maximum context/i;
const RE_PROVIDER = /\b(429|5\d\d)\b|overloaded|rate.?limit|service unavailable/i;

export function classifyStderr(lines: string[]): HeadlessFailure | null {
  for (const line of lines) {
    if (!/^\s*(\S+\s+\S+\s+)?(ERROR|WARN)\b/.test(line) && !/\b(ERROR|WARN)\b/.test(line)) continue;
    if (RE_IGNORED.test(line)) continue;
    if (RE_CONTEXT.test(line)) return "context";
    if (RE_AUTH.test(line)) return "auth";
    if (RE_PROVIDER.test(line)) return "provider";
  }
  return null;
}

/** Kullanıcıya gösterilecek stderr: INFO/DEBUG gürültüsü atılmış, kısaltılmış. */
export function cleanStderr(stderr: string): string {
  return stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^(\S+\s+\S+\s+)?(INFO|DEBU|DEBUG)\b/.test(l))
    .join("\n")
    .slice(0, 1500)
    .trim();
}

function classifyText(text: string): HeadlessFailure | null {
  if (RE_CONTEXT.test(text)) return "context";
  if (RE_AUTH.test(text)) return "auth";
  if (RE_PROVIDER.test(text)) return "provider";
  return null;
}

function killTreeDefault(child: ChildLike): void {
  const pid = child.pid;
  // `kill()` Windows'ta yalnız o süreci öldürüyor; axet-code'un MCP torunları
  // hayatta kalıyordu. `taskkill /T` ağacın tamamını alıyor.
  if (pid && process.platform === "win32") {
    try {
      spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
      return;
    } catch {
      // aşağıdaki kill'e düş
    }
  }
  try {
    (child as unknown as { kill(): void }).kill();
  } catch {
    // zaten kapanmış
  }
}

export function defaultHeadlessDeps(): HeadlessDeps {
  return {
    spawn: (cmd, args, opts) =>
      spawn(cmd, args, { cwd: opts.cwd, env: opts.env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }) as unknown as ChildLike,
    env: (useConnectors) => axetSpawnEnv(useConnectors),
    dbPath: (cwd) => resolveSessionDb(cwd),
    readMessages: (dbPath, sessionId, sinceSec) => readMessagesSince(dbPath, sessionId, sinceSec),
    readProgress: (dbPath, sessionId) => ({
      todos: sessionTodos(dbPath, sessionId),
      contextTokens: sessionTokens(dbPath, sessionId),
      contextLimit: CONTEXT_LIMIT_TOKENS
    }),
    killTree: killTreeDefault,
    now: () => Date.now(),
    pollMs: 150,
    progressMs: 1_000,
    silenceMs: 5 * 60_000,
    hardCapMs: 6 * 60 * 60_000
  };
}

export function startHeadlessTurn(args: HeadlessTurnArgs, deps: HeadlessDeps = defaultHeadlessDeps()): HeadlessTurn {
  const startedAt = deps.now();
  // Saat kayması payı: axet-code'un yazdığı `created_at` saniye çözünürlüklü.
  const sinceSec = Math.floor(startedAt / 1000) - 2;
  const dbPath = deps.dbPath(args.cwd);

  let sessionId: string | null = args.resumeId;
  // Devam turunda oturumun ESKİ mesajları bu tura ait değil.
  const preexisting = new Set<string>(
    args.resumeId && dbPath ? deps.readMessages(dbPath, args.resumeId, 0).map((m) => m.id) : []
  );

  const emitted = new Map<string, number>();
  const seenTools = new Set<string>();
  const pendingInputs = new Set<string>();
  const seenResults = new Set<string>();
  let answer = "";
  let toolCount = 0;
  let ask: AskUserRequest | null = null;
  let askKilled = false;
  let cancelled = false;
  let timedOut = false;
  let spawnFailed = false;
  let spawnError = "";
  let stdout = "";
  let stderr = "";
  let stderrTail = "";
  const stderrLines: string[] = [];
  let lastSignalAt = startedAt;
  let lastStalledAt = startedAt;
  let lastProgressAt = 0;
  let lastProgressKey = "";
  let lastFinish: AxetDbMessage["parts"][number] | undefined;
  let finished = false;

  const child = deps.spawn("axet-code", buildRunArgs(args), { cwd: args.cwd, env: deps.env(args.useConnectors) });

  const signal = () => {
    lastSignalAt = deps.now();
    lastStalledAt = lastSignalAt;
  };

  const kill = () => {
    try {
      deps.killTree(child);
    } catch {
      // zaten kapanmış olabilir
    }
  };

  function poll(): void {
    if (!sessionId || !dbPath) return;
    const messages = deps.readMessages(dbPath, sessionId, sinceSec).filter((m) => !preexisting.has(m.id));
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      const body = message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.data?.text ?? "")
        .join("");
      const already = emitted.get(message.id) ?? 0;
      if (body.length > already) {
        // Ardışık asistan mesajları (araç zincirinde her adım ayrı mesaj)
        // yapışmasın: "…ediyorum.Dosyada…" (analiz bulgu 6).
        const gap = already === 0 && answer ? "\n\n" : "";
        const piece = gap + body.slice(already);
        args.onChunk(piece);
        answer += piece;
        emitted.set(message.id, body.length);
        signal();
      }
      const fin = message.parts.find((p) => p.type === "finish");
      if (fin) lastFinish = fin;
      for (const part of message.parts) {
        if (part.type !== "tool_call") continue;
        const name = normalizeToolName(part.data?.name ?? "");
        const callId = part.data?.id ?? `${message.id}:${name}`;
        if (!name) continue;
        if (name === ASK_USER_TOOL) {
          if (ask || part.data?.finished !== true) continue;
          ask = parseAskUser(callId, part.data?.input);
          seenTools.add(callId);
          continue;
        }
        if (seenTools.has(callId)) {
          if (pendingInputs.has(callId) && toolInputComplete(part.data?.input, part.data?.finished)) {
            pendingInputs.delete(callId);
            const diff = buildDiff(name, part.data?.input);
            const target = summarizeToolInput(part.data?.input);
            if (target || diff) args.onActivity({ phase: "tool", callId, tool: name, target, ...(diff ? { diff } : {}) });
          }
          continue;
        }
        seenTools.add(callId);
        if (!toolInputComplete(part.data?.input, part.data?.finished)) pendingInputs.add(callId);
        toolCount += 1;
        signal();
        const diff = buildDiff(name, part.data?.input);
        args.onActivity({
          phase: "tool",
          callId,
          tool: name,
          target: pendingInputs.has(callId) ? "" : summarizeToolInput(part.data?.input),
          ...(diff ? { diff } : {})
        });
      }
    }
    for (const message of messages) {
      if (message.role !== "tool") continue;
      for (const part of message.parts) {
        if (part.type !== "tool_result") continue;
        const callId = part.data?.tool_call_id ?? "";
        if (!callId || !seenTools.has(callId) || seenResults.has(callId)) continue;
        seenResults.add(callId);
        if (ask && callId === ask.callId) {
          // Soru aracının sonucu ("No interactive user…") düştü: ajan şimdi
          // KENDİ seçmek üzere. Süreç burada öldürülüyor; sonuç yazılmadan
          // öldürmek oturumda sonuçsuz bir çağrı bırakırdı (400, bkz. 32d4952).
          if (!askKilled) {
            askKilled = true;
            kill();
          }
          continue;
        }
        signal();
        args.onActivity({ phase: "toolResult", callId, ...summarizeToolResult(part.data?.content, part.data?.is_error) });
      }
    }
    const now = deps.now();
    if (now - lastProgressAt >= deps.progressMs) {
      lastProgressAt = now;
      const progress = deps.readProgress(dbPath, sessionId);
      const key = JSON.stringify(progress);
      if (key !== lastProgressKey) {
        lastProgressKey = key;
        args.onProgress(progress);
      }
    }
  }

  const timer = setInterval(() => {
    if (finished) return;
    poll();
    const now = deps.now();
    if (now - startedAt >= deps.hardCapMs) {
      timedOut = true;
      kill();
      return;
    }
    if (now - lastStalledAt >= deps.silenceMs) {
      lastStalledAt = now;
      args.onActivity({ phase: "stalled", minutes: Math.max(1, Math.round((now - lastSignalAt) / 60_000)) });
    }
  }, deps.pollMs);

  child.stdin?.on("error", () => {});
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString("utf-8");
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf-8");
    stderr += text;
    const parts = (stderrTail + text).split(/\r?\n/);
    stderrTail = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.trim()) continue;
      stderrLines.push(line);
      signal();
      noteUpdateLine(line);
      const m = RE_CREATED.exec(line);
      if (m && !sessionId) {
        sessionId = m[1];
        args.onSessionId(sessionId);
      }
    }
  });

  const done = new Promise<HeadlessTurnResult>((resolve) => {
    const finish = (code: number | null) => {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      if (stderrTail.trim()) stderrLines.push(stderrTail);
      // Son okuma: süreç kapanırken yazılan metin kaçmasın.
      try {
        poll();
      } catch {
        // okuma hatası sonucu bozmamalı
      }
      const base = { sessionId, cancelled, timedOut, spawnFailed, toolCount, ask: null as AskUserRequest | null };
      if (spawnFailed) {
        resolve({ ...base, ok: false, text: "", error: spawnError, failure: null });
        return;
      }
      if (cancelled) {
        resolve({ ...base, ok: false, text: answer, failure: null });
        return;
      }
      if (askKilled && ask) {
        resolve({ ...base, ok: true, text: answer, ask, failure: null });
        return;
      }
      const jsonLine = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("{"))
        .pop();
      let doc: { session_id?: string; result?: unknown; is_error?: boolean } | null = null;
      try {
        doc = jsonLine ? JSON.parse(jsonLine) : null;
      } catch {
        doc = null;
      }
      if (doc?.session_id && !sessionId) sessionId = doc.session_id;
      const resultText = typeof doc?.result === "string" ? doc.result : "";
      if (doc && doc.is_error !== true && !timedOut) {
        resolve({ ...base, sessionId, ok: true, text: answer || resultText, failure: null });
        return;
      }
      // Hata: sınıf ve metin. Önce veritabanının `finish` hatası (sağlayıcının
      // kendi cümlesi), sonra JSON'un metni, en son stderr.
      let failure: HeadlessFailure | null = null;
      if (finishPolicyBlock(lastFinish)) failure = "blocked";
      else if (finishAuthFailure(lastFinish)) failure = "auth";
      else if (finishPoisonsHistory(lastFinish)) failure = "poisoned";
      const finishMsg = lastFinish?.data?.reason === "error" ? String(lastFinish.data?.message ?? "") : "";
      const errorText =
        finishMsg ||
        (doc?.is_error ? resultText : "") ||
        cleanStderr(stderr) ||
        `axet-code çıkış kodu ${code ?? "?"}`;
      failure = failure ?? classifyText(errorText) ?? classifyStderr(stderrLines);
      resolve({ ...base, sessionId, ok: false, text: answer, error: errorText, failure });
    };
    child.on("close", (code) => finish(code));
    child.on("error", (err) => {
      spawnFailed = true;
      spawnError = err.message;
      finish(null);
    });
  });

  try {
    child.stdin?.write(args.prompt, "utf-8");
    child.stdin?.end();
  } catch {
    // süreç hemen öldüyse 'close'/'error' yolu sonucu veriyor
  }

  return {
    done,
    cancel: () => {
      if (finished || cancelled) return;
      cancelled = true;
      kill();
    }
  };
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/axetHeadless.test.ts` ve `npm run typecheck`
Beklenen: 12/12 PASS, typecheck temiz.

Notlar:
- `AxetPart.data` tipinde `message` alanı yoksa: `finishErrorText`'i `axetSessionDb.ts`'te `export` yap ve `finishMsg` için onu kullan (`lastFinish?.data?.reason === "error" ? finishErrorText(lastFinish).trim() : ""`). Ledger'a yaz.
- Testteki `child.err` ile `exit` aynı tikte çağrılınca son okuma `poll()` metni yine yakalamalı. Yakalamıyorsa `finish` içindeki `poll()` çağrısını kontrol et; testi değiştirme.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/main/axetHeadless.ts
git add tests/axetHeadless.test.ts
git commit -m "Basiz kopru: tek tur calistirici (run --resume, JSON sonuc, oturuma ozel veritabani okuma, ask_user agi, iptal)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`axetSessionDb.ts` değiştiyse onu da ekle.)

---
### Görev 4: Sohbet yüzü — `axetChat.ts` yeniden yazılır

**Dosyalar:**
- Değişir (baştan yazılır): `app-electron/main/axetChat.ts`
- Değişir: `app-electron/main/axetSessionBinding.ts` (`title` isteğe bağlı), `app-electron/shared/types.ts` (`AxetChatSendResult.canContinue`), `app-electron/main/i18n/tr.ts`, `en.ts`
- Test: `tests/axetChatHeadless.test.ts`; değişir: `tests/axetSessionBinding.test.ts` (başlıksız bağ)

**Arayüzler:**
- Tüketir:
  - Görev 1: `splitOptionsBlock`, `askUserAsText`, `AskUserRequest`.
  - Görev 2: `axetBinaryStatus`, `axetBinaryMessage`.
  - Görev 3: `startHeadlessTurn`, `HeadlessTurnResult`, `HeadlessTurn`.
  - Mevcut: `readBinding`, `writeBinding`, `clearBinding`, `resolveSessionDb`, `sessionHasUnansweredToolCall`, `buildContextPreamble`, `shouldUseConnectors`, `connectorGuidance`, `isSilentEmptyAnswer`, `appLog`, `mt`.
- Üretir (dış yüz bugünküyle AYNI imzalar; renderer ve `index.ts` değişmeden derlenir):

```ts
export function sendChatMessage(requestId, chatId, cwd, model, history, message, onChunk?, onActivity?, onProgress?): Promise<AxetChatSendResult>;
export function cancelChatMessage(requestId: string, onVerdict?: (chatId: string, verdict: AxetChatCancelVerdict) => void): void;
export function answerChatQuestion(requestId: string, optionIndex: number | number[], customText?: string): boolean;
export function closeChatSession(chatId: string): void;
export function resetChatHistory(chatId: string): boolean;
export function cancelAllChatMessages(): void;
export function prewarmChat(cwd: string, model: AxetModelEntry | null, chatId?: string, draft?: string): void; // artık hiçbir şey yapmıyor; IPC Görev 6'da kalkıyor
export function chatBusy(chatId: string): boolean;
// test için
export function __setTurnStarter(fn: typeof startHeadlessTurn | null): void;
export const AUTH_RETRY_MS: number; // 15_000
```

- `AxetChatSendResult`'a eklenen alan:

```ts
  /**
   * Tur bir hatayla bitti ama ajan araç ÇALIŞTIRMIŞTI: otomatik yeniden
   * gönderme aynı yazmayı iki kez yapabilirdi (analiz 2026-10-16, bulgu 2).
   * Arayüz "Devam et" düğmesi gösteriyor; düğme aynı oturuma devam istiyor.
   */
  canContinue?: boolean;
```

- [ ] **Adım 1: Kırmızı test** — `tests/axetChatHeadless.test.ts`

```ts
// Sohbet yüzü: bağlama, devam, yeniden deneme, soru akışı, iptal
// (spec 2026-10-16 basiz-kopru §4–§7). Tur çalıştırıcı sahte.
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { HeadlessTurnArgs, HeadlessTurnResult } from "../app-electron/main/axetHeadless";

const h = vi.hoisted(() => ({
  bindings: new Map<string, { sessionId: string; cwd: string }>(),
  unanswered: new Set<string>(),
  status: { kind: "ok", version: "1.4.1" } as { kind: string; version?: string },
  logs: [] as { tag: string; fields: Record<string, unknown> }[]
}));

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string, p?: unknown) => (p ? `${k} ${JSON.stringify(p)}` : k) }));
vi.mock("../app-electron/main/appLog", () => ({ appLog: (tag: string, fields: Record<string, unknown>) => h.logs.push({ tag, fields }) }));
vi.mock("../app-electron/main/activeContext", () => ({ buildContextPreamble: () => "" }));
vi.mock("../app-electron/main/connectorPolicy", () => ({ shouldUseConnectors: () => false }));
vi.mock("../app-electron/main/connectorHealth", () => ({ connectorGuidance: () => "" }));
vi.mock("../app-electron/main/axetCodeVersion", () => ({
  axetBinaryStatus: async () => h.status,
  axetBinaryMessage: (s: { kind: string }) => (s.kind === "ok" ? null : `chat.axet:${s.kind}`)
}));
vi.mock("../app-electron/main/axetSessionBinding", () => ({
  readBinding: (id: string) => h.bindings.get(id) ?? null,
  writeBinding: (id: string, b: { sessionId: string; cwd: string }) => h.bindings.set(id, b),
  clearBinding: (id: string) => h.bindings.delete(id)
}));
vi.mock("../app-electron/main/axetSessionDb", () => ({
  resolveSessionDb: () => "C:/p/.axet-code/axet-code.db",
  sessionHasUnansweredToolCall: (_db: string, sid: string) => h.unanswered.has(sid)
}));

const chat = await import("../app-electron/main/axetChat");

type Script = (args: HeadlessTurnArgs) => Partial<HeadlessTurnResult> | Promise<Partial<HeadlessTurnResult>>;
const calls: HeadlessTurnArgs[] = [];
let cancels = 0;

function script(...steps: Script[]) {
  let i = 0;
  chat.__setTurnStarter(((args: HeadlessTurnArgs) => {
    calls.push(args);
    const step = steps[Math.min(i++, steps.length - 1)];
    let cancel: () => void = () => {};
    const done = new Promise<HeadlessTurnResult>((resolve) => {
      cancel = () => {
        cancels++;
        resolve({ ok: false, text: "", sessionId: args.resumeId, cancelled: true, timedOut: false, spawnFailed: false, toolCount: 0, ask: null, failure: null });
      };
      Promise.resolve(step(args)).then((r) =>
        resolve({ ok: true, text: "", sessionId: "S1", cancelled: false, timedOut: false, spawnFailed: false, toolCount: 0, ask: null, failure: null, ...r })
      );
    });
    return { done, cancel: () => cancel() };
  }) as never);
}

const send = (requestId = "r1", message = "merhaba", history = [] as { role: "user" | "assistant"; content: string }[]) =>
  chat.sendChatMessage(requestId, "chat-1", "C:/p", null, history, message, () => {}, (a) => activities.push(a as never));
let activities: Record<string, unknown>[] = [];

beforeEach(() => {
  h.bindings.clear();
  h.unanswered.clear();
  h.status = { kind: "ok", version: "1.4.1" };
  h.logs = [];
  calls.length = 0;
  cancels = 0;
  activities = [];
});

describe("sendChatMessage", () => {
  it("1.4'ten eski axet-code: tur başlamıyor, açık hata", async () => {
    h.status = { kind: "old", version: "1.3.0" };
    script(() => ({ text: "x" }));
    const r = await send();
    expect(r).toMatchObject({ ok: false, error: "chat.axet:old" });
    expect(calls).toHaveLength(0);
  });

  it("ilk tur yeni oturum, kimlik bağlanıyor; ikinci tur --resume ve geçmiş tohumlanmıyor", async () => {
    script(
      (a) => {
        a.onSessionId("S1");
        return { text: "bir", sessionId: "S1" };
      },
      () => ({ text: "iki", sessionId: "S1" })
    );
    expect((await send("r1", "ilk")).text).toBe("bir");
    expect(calls[0].resumeId).toBeNull();
    expect(h.bindings.get("chat-1")).toMatchObject({ sessionId: "S1", cwd: "C:/p" });
    const r2 = await send("r2", "ikinci", [{ role: "user", content: "ilk" }, { role: "assistant", content: "bir" }]);
    expect(r2.text).toBe("iki");
    expect(calls[1].resumeId).toBe("S1");
    expect(calls[1].prompt).not.toContain("Önceki konuşma");
  });

  it("bağlı oturumda sonuçsuz araç çağrısı varsa yeni oturum + geçmiş tohumu (inceleme odağı 1)", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    h.unanswered.add("S0");
    script(() => ({ text: "tamam", sessionId: "S2" }));
    await send("r1", "devam", [{ role: "user", content: "eski soru" }, { role: "assistant", content: "eski cevap" }]);
    expect(calls[0].resumeId).toBeNull();
    expect(calls[0].prompt).toContain("Önceki konuşma");
    expect(calls[0].prompt).toContain("eski soru");
  });

  it("klasör değiştiyse bağlı oturum kullanılmıyor", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/baska" });
    script(() => ({ text: "x" }));
    await send();
    expect(calls[0].resumeId).toBeNull();
  });

  it("araçsız hatada tek yeniden deneme; ikincisi de düşerse hata", async () => {
    script(
      () => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 0 }),
      () => ({ ok: true, text: "kurtardı" })
    );
    const r = await send();
    expect(calls).toHaveLength(2);
    expect(r).toMatchObject({ ok: true, text: "kurtardı", restartedReason: "provider" });
  });

  it("araç çalıştıysa yeniden gönderme yok; canContinue", async () => {
    script(() => ({ ok: false, error: "529 overloaded", failure: "provider", toolCount: 3, text: "yarım" }));
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r).toMatchObject({ ok: false, canContinue: true });
    expect(r.error).toContain("529 overloaded");
  });

  it("bağlam doldu: yeni oturum, geçmiş tohumlanıyor (araçsız)", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    script(
      () => ({ ok: false, error: "context length exceeded", failure: "context", toolCount: 0, sessionId: "S0" }),
      () => ({ ok: true, text: "yeni oturumda", sessionId: "S3" })
    );
    const r = await send("r1", "soru", [{ role: "user", content: "a" }, { role: "assistant", content: "b" }]);
    expect(calls[0].resumeId).toBe("S0");
    expect(calls[1].resumeId).toBeNull();
    expect(calls[1].prompt).toContain("Önceki konuşma");
    expect(r).toMatchObject({ ok: true, restartedReason: "context" });
  });

  it("secenekler bloğu: askUser olayı, cevap aynı oturuma yeni tur; renderer'a tek tur", async () => {
    const FENCE = "```";
    script(
      (a) => {
        a.onSessionId("S1");
        return { text: `Hangisi?\n\n${FENCE}secenekler\n- K1\n- K2\n${FENCE}`, sessionId: "S1" };
      },
      () => ({ text: "K2 ile devam ettim.", sessionId: "S1" })
    );
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    const ask = activities.find((a) => a.phase === "askUser")!;
    expect(ask.options).toEqual(["K1", "K2"]);
    expect(chat.answerChatQuestion("r1", 1)).toBe(true);
    const r = await pending;
    expect(calls[1].resumeId).toBe("S1");
    expect(calls[1].prompt).toContain("K2");
    expect(r.ok).toBe(true);
    expect(r.text).toBe("Hangisi?\n\nK2 ile devam ettim.");
  });

  it("ask_user ağı: tur öldürülmüş, soru gösteriliyor; serbest metin cevabı gidiyor", async () => {
    script(
      () => ({ text: "", sessionId: "S1", ask: { callId: "q1", question: "Paket?", header: "", options: ["ZA", "ZB"], multiSelect: false } }),
      () => ({ text: "ZC kullanıldı.", sessionId: "S1" })
    );
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", -1, "ZC");
    const r = await pending;
    expect(calls[1].prompt).toContain("ZC");
    expect(r.text).toBe("ZC kullanıldı.");
  });

  it("soru vazgeçilirse (-1, metinsiz) tur sorunun metniyle biter", async () => {
    script(() => ({ text: "", sessionId: "S1", ask: { callId: "q1", question: "Paket?", header: "", options: ["ZA", "ZB"], multiSelect: false } }));
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.answerChatQuestion("r1", -1);
    const r = await pending;
    expect(calls).toHaveLength(1);
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Paket?");
  });

  it("iptal: çalışan tur durduruluyor, karar hemen 'durdu'", async () => {
    script(() => new Promise(() => {}));
    const pending = send();
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const verdicts: unknown[] = [];
    chat.cancelChatMessage("r1", (id, v) => verdicts.push([id, v]));
    const r = await pending;
    expect(cancels).toBe(1);
    expect(r.cancelled).toBe(true);
    expect(verdicts).toEqual([["chat-1", { stopped: true, reason: "canceled" }]]);
  });

  it("soru beklerken iptal: tur iptal olarak kapanıyor", async () => {
    script(() => ({ text: "", sessionId: "S1", ask: { callId: "q1", question: "?", header: "", options: ["A", "B"], multiSelect: false } }));
    const pending = send();
    await vi.waitFor(() => expect(activities.some((a) => a.phase === "askUser")).toBe(true));
    chat.cancelChatMessage("r1");
    expect((await pending).cancelled).toBe(true);
  });

  it("resetChatHistory bağı düşürüyor; sonraki tur yeni oturum", async () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    expect(chat.resetChatHistory("chat-1")).toBe(true);
    script(() => ({ text: "x" }));
    await send();
    expect(calls[0].resumeId).toBeNull();
  });

  it("politika engeli: yeniden gönderme yok, açıklayıcı metin", async () => {
    script(() => ({ ok: false, error: "request_blocked", failure: "blocked", toolCount: 0 }));
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r.error).toBe("chatTui.policyBlocked");
  });

  it("403: 15 sn bekleyip bir kez yeniden; sürerse kalıcı 403 metni", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      script(() => ({ ok: false, error: "403 Forbidden", failure: "auth", toolCount: 0 }));
      const pending = send();
      await vi.waitFor(() => expect(calls).toHaveLength(1));
      await vi.advanceTimersByTimeAsync(chat.AUTH_RETRY_MS);
      const r = await pending;
      expect(calls).toHaveLength(2);
      expect(r.error).toBe("chatTui.restartStillFailingAuth");
    } finally {
      vi.useRealTimers();
    }
  });

  it("zorunlu güncelleme: yeniden gönderme yok, sürümlü metin", async () => {
    script(() => ({
      ok: false,
      error: "Mandatory update required. Installed version: 1.4.1 New version: 1.5.0",
      failure: null,
      toolCount: 0
    }));
    const r = await send();
    expect(calls).toHaveLength(1);
    expect(r.error).toContain("chatTui.updateRequiredVersions");
    expect(r.error).toContain("1.5.0");
  });

  it("günlük: kopru.tur, içerik yok", async () => {
    script(() => ({ text: "gizli cevap metni", sessionId: "S1" }));
    await send("r1", "gizli soru metni");
    const tur = h.logs.find((l) => l.tag === "kopru.tur");
    expect(tur).toBeTruthy();
    expect(JSON.stringify(h.logs)).not.toContain("gizli");
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/axetChatHeadless.test.ts`
Beklenen: FAIL — `__setTurnStarter is not a function` (eski `axetChat.ts`).

- [ ] **Adım 3: Bağlama kaydında `title` isteğe bağlı** — `app-electron/main/axetSessionBinding.ts`
- `title: string;` → `title?: string;` (yorum: "eski TUI ctrl+s etiketi; başsız köprü kullanmıyor").
- `writeBinding`'in koşulu: `if (!chatId || !binding.sessionId || !binding.cwd) return;`
- Okuma tarafı (`readBinding`) başlığı boş olan kaydı da kabul etmeli; başlık kontrolü varsa kaldır.
- `tests/axetSessionBinding.test.ts`, "EKSIK alanli bag hic yazilmiyor" testinden `writeBinding("chat-1", binding({ title: "" }));` satırını sil ve hemen altına yeni test ekle:

```ts
  it("basliksiz bag yaziliyor (basiz kopru basligi kullanmiyor)", () => {
    writeBinding("chat-1", { sessionId: "S1", cwd: "C:\\proje" });
    expect(readBinding("chat-1")).toMatchObject({ sessionId: "S1", cwd: "C:\\proje" });
  });
```

Bu testi Adım 1 ile birlikte yaz ve Adım 2'de kırmızı gör (bugün başlıksız kayıt yazılmıyor).

- [ ] **Adım 4: Tip** — `app-electron/shared/types.ts`, `AxetChatSendResult` içine `restartedReason`'dan sonra yukarıdaki `canContinue?: boolean;` alanı.

- [ ] **Adım 5: Metinler** — `app-electron/main/i18n/tr.ts` (`"chat.emptyAnswerTui"` üstüne):

```ts
  "chat.headlessAnswerLabel": "Kullanıcının cevabı",
  "chat.continuePrompt": "Kaldığın yerden devam et.",
```

`en.ts` aynı yere:

```ts
  "chat.headlessAnswerLabel": "The user's answer",
  "chat.continuePrompt": "Continue from where you left off.",
```

- [ ] **Adım 6: Uygula** — `app-electron/main/axetChat.ts`'i baştan yaz.

Dosyanın eski hâlinden **aynen** taşınacaklar, yorumlarıyla birlikte:
- `CONNECTOR_RETRY_REMINDER` (eski satır 55–74);
- `NO_UNASKED_WRITE_HINT` (eski satır 101–116);
- `decideConnectors` (eski satır 124–133).

Geri kalan her şey (TUI içe aktarmaları, ısıtma, `run -v` yolu, `PHASE_ORDER`, `phaseFromLogLine`, `extractError`, `ASK_FORMAT_HINT`) **silinir**.

```ts
// Sohbet ekranının axet-code yüzü (spec 2026-10-16 basiz-kopru).
//
// Her mesaj kendi kısa ömürlü `axet-code run` sürecinde çalışıyor (bkz.
// axetHeadless.ts). Oturum hafızası axet-code'da: sohbet → oturum kimliği
// bağlaması (axetSessionBinding) ile sonraki mesaj `--resume` ediyor. Eskiden
// burada görünmez bir terminal (PTY + TUI) vardı; hangi oturumun bu sohbete
// ait olduğu ve turun ne zaman bittiği ekrandan ve mesaj metninden TAHMİN
// ediliyordu. Bu tahminler 46 düzeltmenin çoğunun kaynağıydı.
//
// Renderer'a göre bir "tur" tek bir `sendChatMessage` çağrısı. Ajan soru
// sorarsa (ya `secenekler` bloğu ya da `ask_user` ağı) tur AÇIK kalıyor, soru
// kartı çıkıyor ve cevap aynı oturuma YENİ bir `run` olarak gidiyor — ama
// renderer bunu aynı turun devamı olarak görüyor.

import type {
  AxetChatActivity,
  AxetChatCancelVerdict,
  AxetChatMessage,
  AxetChatProgress,
  AxetChatSendResult,
  AxetModelEntry
} from "../shared/types";
import { buildContextPreamble } from "./activeContext";
import { appLog } from "./appLog";
import { isSilentEmptyAnswer } from "./axetChatAnswer";
import { axetBinaryMessage, axetBinaryStatus } from "./axetCodeVersion";
import { startHeadlessTurn, type HeadlessTurn, type HeadlessTurnResult } from "./axetHeadless";
import { clearBinding, readBinding, writeBinding } from "./axetSessionBinding";
import { resolveSessionDb, sessionHasUnansweredToolCall } from "./axetSessionDb";
import { askUserAsText, splitOptionsBlock, type AskUserRequest } from "./axetToolEvents";
import { connectorGuidance } from "./connectorHealth";
import { shouldUseConnectors } from "./connectorPolicy";
import { mt } from "./i18n";

// ← CONNECTOR_RETRY_REMINDER, NO_UNASKED_WRITE_HINT ve decideConnectors buraya, AYNEN.

// Başsız modda `ask_user` kullanıcıya ULAŞMIYOR: axet-code "No interactive
// user… use your best judgment" dönüyor ve ajan kendi seçiyor (ölçüm
// 2026-10-16). Transport/paket gibi kararlarda bu kabul edilemez. Bu yüzden
// soru turun SONUNDA bir blokla isteniyor; aracı yine çağırırsa
// axetHeadless.ts süreci durduruyor ve soru yine buraya geliyor.
const ASK_RULE =
  "Not: ask_user aracını KULLANMA — bu arayüzde cevaplanamıyor. Kullanıcıdan bir karar gerekiyorsa turu " +
  "sorunla bitir ve seçenekleri cevabının EN SONUNDA şu blokla ver (en az iki seçenek):\n" +
  "```secenekler\n- Seçenek 1\n- Seçenek 2\n```\n" +
  "Gerekmiyorsa en makul varsayımla devam et ve varsayımını tek cümleyle söyle.";

export const AUTH_RETRY_MS = 15_000;

function preamble(useConnectors: boolean, cwd: string): string {
  return (
    buildContextPreamble(cwd) +
    `${NO_UNASKED_WRITE_HINT}\n\n` +
    `${ASK_RULE}\n\n` +
    (useConnectors ? `${CONNECTOR_RETRY_REMINDER}\n\n${connectorGuidance()}` : "")
  );
}

/** Yeni oturum: geçmiş metin olarak tohumlanıyor (bağlam ajanın hafızasında yok). */
function seedPrompt(history: AxetChatMessage[], message: string, useConnectors: boolean, cwd: string): string {
  const pre = preamble(useConnectors, cwd);
  if (history.length === 0) return `${pre}Kullanıcı mesajı: ${message}`;
  const transcript = history.map((m) => `${m.role === "user" ? "Kullanıcı" : "Sen"}: ${m.content}`).join("\n\n");
  return (
    pre +
    `Önceki konuşma:\n${transcript}\n\n` +
    `Yeni kullanıcı mesajı: ${message}\n\n` +
    `Lütfen SADECE en son kullanıcı mesajına, önceki konuşmayı bağlam olarak kullanarak cevap ver.`
  );
}

/** Devam eden oturum: hafıza axet-code'da; yalnızca kurallar ve mesaj. */
function resumePrompt(message: string, useConnectors: boolean, cwd: string): string {
  return `${preamble(useConnectors, cwd)}Kullanıcı mesajı: ${message}`;
}

interface ChatRun {
  chatId: string;
  turn: HeadlessTurn | null;
  cancelled: boolean;
  pendingAsk: AskUserRequest | null;
  answerAsk: ((answer: string | null) => void) | null;
  turns: number;
}

const runs = new Map<string, ChatRun>(); // requestId → çalışan tur
let turnStarter: typeof startHeadlessTurn = startHeadlessTurn;

export function __setTurnStarter(fn: typeof startHeadlessTurn | null): void {
  turnStarter = fn ?? startHeadlessTurn;
}

export function chatBusy(chatId: string): boolean {
  for (const run of runs.values()) if (run.chatId === chatId) return true;
  return false;
}

/** Bağlı oturuma devam edilebilir mi? Klasör aynı ve sonuçsuz araç çağrısı yok. */
function resumableSession(chatId: string, cwd: string): string | null {
  const binding = readBinding(chatId);
  if (!binding) return null;
  const dbPath = resolveSessionDb(cwd);
  if (binding.cwd !== cwd || !dbPath || sessionHasUnansweredToolCall(dbPath, binding.sessionId)) {
    // Sonuçsuz bir araç çağrısı (tur bir aracın ortasında öldürüldü) bu oturumu
    // sağlayıcı için geçersiz kılıyor: 400 "tool_use without tool_result"
    // (bkz. 32d4952). Yeni oturum + geçmiş tohumu.
    appLog("kopru.bag-dustu", { sohbet: chatId, sebep: binding.cwd !== cwd ? "klasor" : "sonucsuz-arac" });
    clearBinding(chatId);
    return null;
  }
  return binding.sessionId;
}

function answerText(ask: AskUserRequest, optionIndex: number | number[], customText?: string): string | null {
  if (customText && customText.trim()) return customText.trim();
  const indexes = (Array.isArray(optionIndex) ? optionIndex : [optionIndex]).filter((i) => i >= 0 && i < ask.options.length);
  if (indexes.length === 0) return null;
  return indexes.map((i) => ask.options[i]).join(", ");
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Zorunlu güncelleme `run` kipini de durduruyor ve çıkış kodu bunu anlatmıyor;
// süreç ne yazdıysa onun içinde aranıyor (eski run yolundaki kalıp, aynen).
const RE_UPDATE_BLOCK = /Mandatory update required|new version of aXet\.Code is available/i;
function isUpdateBlock(error: string | undefined): boolean {
  return !!error && RE_UPDATE_BLOCK.test(error);
}

/**
 * Kullanıcıya gösterilecek hata. Sınıfı belli arızalar için eski TUI yolunun
 * açıklayıcı metinleri korunuyor (politika engeli, kalıcı 403, zorunlu
 * güncelleme, 6 saat sınırı); geri kalanında sağlayıcının kendi cümlesi.
 */
function userError(result: HeadlessTurnResult, retried: boolean): string {
  const raw = result.error ?? "";
  if (isUpdateBlock(raw)) {
    const installed = /Installed version:\s*([0-9][\w.+-]*)/i.exec(raw)?.[1] ?? "";
    const latest = /New version:\s*([0-9][\w.+-]*)/i.exec(raw)?.[1] ?? "";
    return latest
      ? mt("chatTui.updateRequiredVersions", { installed: installed || "?", latest })
      : mt("chatTui.updateRequired");
  }
  if (result.failure === "blocked") return mt("chatTui.policyBlocked");
  if (result.timedOut) return mt("chatTui.turnRanTooLong", { hours: "6" });
  if (result.failure === "auth" && retried) return mt("chatTui.restartStillFailingAuth");
  return raw || mt("chat.emptyAnswerTui");
}

export async function sendChatMessage(
  requestId: string,
  chatId: string,
  cwd: string,
  model: AxetModelEntry | null,
  history: AxetChatMessage[],
  message: string,
  onChunk?: (text: string) => void,
  onActivity?: (activity: AxetChatActivity) => void,
  onProgress?: (progress: AxetChatProgress) => void
): Promise<AxetChatSendResult> {
  const resolvedCwd = cwd && cwd.trim() ? cwd : process.cwd();
  const safe = <T>(fn: ((x: T) => void) | undefined) => (x: T) => {
    try {
      fn?.(x);
    } catch {
      // pencere kapanmış olabilir
    }
  };
  const emitChunk = safe(onChunk);
  const emitActivity = safe(onActivity);
  const emitProgress = safe(onProgress);

  // Ön koşul: axet-code 1.4+ ve sağlam program dosyası (kullanıcı kararı 2026-10-16).
  const status = await axetBinaryStatus();
  const blocked = axetBinaryMessage(status);
  if (blocked) {
    appLog("kopru.surum", { surum: "version" in status ? status.version : "-", durum: status.kind });
    return { ok: false, text: "", error: blocked };
  }

  const useConnectors = decideConnectors(history, message);
  const run: ChatRun = { chatId, turn: null, cancelled: false, pendingAsk: null, answerAsk: null, turns: 0 };
  runs.set(requestId, run);
  const started = Date.now();
  let resumeId = resumableSession(chatId, resolvedCwd);
  const startedResumed = resumeId !== null;
  let prompt = resumeId ? resumePrompt(message, useConnectors, resolvedCwd) : seedPrompt(history, message, useConnectors, resolvedCwd);
  let text = "";
  let restartedReason: AxetChatSendResult["restartedReason"];
  let retried = false;
  let totalTools = 0;
  let turns = 0;
  let firstChunkAt = 0;

  const runOnce = async (): Promise<HeadlessTurnResult> => {
    turns += 1;
    run.turns = turns;
    // Soru cevabından sonraki turun ilk parçası önceki metne yapışmasın.
    let first = true;
    const turn = turnStarter({
      cwd: resolvedCwd,
      model,
      prompt,
      resumeId,
      useConnectors,
      onSessionId: (id) => writeBinding(chatId, { sessionId: id, cwd: resolvedCwd }),
      onChunk: (piece) => {
        if (!piece) return;
        if (first && text) emitChunk("\n\n");
        first = false;
        if (!firstChunkAt) firstChunkAt = Date.now();
        emitChunk(piece);
      },
      onActivity: emitActivity,
      onProgress: emitProgress
    });
    run.turn = turn;
    const result = await turn.done;
    run.turn = null;
    if (result.sessionId) writeBinding(chatId, { sessionId: result.sessionId, cwd: resolvedCwd });
    totalTools += result.toolCount;
    return result;
  };

  try {
    for (;;) {
      if (run.cancelled) return { ok: false, text, cancelled: true, usedConnectors: useConnectors };
      const result = await runOnce();
      if (result.cancelled || run.cancelled) return { ok: false, text: text + result.text, cancelled: true, usedConnectors: useConnectors };

      if (result.spawnFailed) {
        // Süreç açılamadı: program bozulmuş/silinmiş olabilir — durumu tazele.
        const msg = axetBinaryMessage(await axetBinaryStatus(true));
        return { ok: false, text, error: msg ?? result.error ?? mt("chat.emptyAnswerTui"), usedConnectors: useConnectors };
      }

      if (result.ok) {
        const split = splitOptionsBlock(result.text);
        const ask = result.ask ?? split.ask;
        const piece = result.ask ? result.text : split.text;
        text = text ? (piece ? `${text}\n\n${piece}` : text) : piece;
        if (!ask) break;
        // Soru: kart çıkıyor, tur açık kalıyor.
        run.pendingAsk = ask;
        emitActivity({
          phase: "askUser",
          callId: ask.callId,
          question: ask.question,
          ...(ask.header ? { header: ask.header } : {}),
          options: ask.options,
          ...(ask.multiSelect ? { multiSelect: true } : {})
        });
        appLog("kopru.soru", { sohbet: chatId, katman: result.ask ? "ag" : "metin", secenek: ask.options.length });
        const answer = await new Promise<string | null>((resolve) => {
          run.answerAsk = resolve;
        });
        run.pendingAsk = null;
        run.answerAsk = null;
        if (run.cancelled) return { ok: false, text, cancelled: true, usedConnectors: useConnectors };
        if (answer === null) {
          // Vazgeçildi: soru metni cevapta kalsın, kullanıcı kendisi yazar.
          if (!text.includes(ask.question) || !ask.question) text = text ? `${text}\n\n${askUserAsText(ask)}` : askUserAsText(ask);
          break;
        }
        resumeId = result.sessionId;
        prompt = `${mt("chat.headlessAnswerLabel")}: ${answer}`;
        continue;
      }

      // --- Hata ---
      const canAutoRetry = result.toolCount === 0 && !retried && !result.timedOut && !isUpdateBlock(result.error);
      if (result.failure === "context" || result.failure === "poisoned") {
        if (canAutoRetry) {
          retried = true;
          restartedReason = "context";
          resumeId = null;
          clearBinding(chatId);
          prompt = seedPrompt(history, message, useConnectors, resolvedCwd);
          continue;
        }
      } else if (canAutoRetry && result.failure !== "blocked") {
        retried = true;
        restartedReason = result.failure === "auth" ? "auth" : "provider";
        if (result.failure === "auth") await delay(AUTH_RETRY_MS);
        if (run.cancelled) return { ok: false, text, cancelled: true, usedConnectors: useConnectors };
        resumeId = result.sessionId ?? resumeId;
        if (!resumeId) prompt = seedPrompt(history, message, useConnectors, resolvedCwd);
        continue;
      }
      appLog("kopru.hata", { sohbet: chatId, sinif: result.failure ?? "-", aracCalisti: result.toolCount > 0, yenidenDenendi: retried });
      return {
        ok: false,
        text: text + result.text,
        error: userError(result, retried),
        usedConnectors: useConnectors,
        ...(result.toolCount > 0 ? { canContinue: true } : {})
      };
    }

    const out: AxetChatSendResult = { ok: true, text, usedConnectors: useConnectors, ...(restartedReason ? { restartedReason } : {}) };
    appLog("kopru.tur", {
      sohbet: chatId,
      oturum: startedResumed && !restartedReason ? "surdu" : "yeni",
      saniye: Math.round((Date.now() - started) / 100) / 10,
      ilkHarf: firstChunkAt ? Math.round((firstChunkAt - started) / 100) / 10 : null,
      arac: totalTools,
      baglayici: useConnectors,
      model: model ? `${model.provider}/${model.model}` : "-",
      sonuc: "ok"
    });
    if (isSilentEmptyAnswer(out)) return { ...out, ok: false, error: mt("chat.emptyAnswerTui") };
    return out;
  } finally {
    runs.delete(requestId);
  }
}

export function cancelChatMessage(
  requestId: string,
  onVerdict?: (chatId: string, verdict: AxetChatCancelVerdict) => void
): void {
  const run = runs.get(requestId);
  if (!run) return;
  run.cancelled = true;
  run.turn?.cancel();
  run.answerAsk?.(null);
  appLog("kopru.iptal", { sohbet: run.chatId, turNo: run.turns });
  // Süreç ağacı öldürülüyor; "durmadı" diye bir durum yok (eski TUI'de Esc
  // tutmayabiliyordu, bkz. cancelStuck).
  onVerdict?.(run.chatId, { stopped: true, reason: "canceled" });
}

export function answerChatQuestion(requestId: string, optionIndex: number | number[], customText?: string): boolean {
  const run = runs.get(requestId);
  if (!run?.pendingAsk || !run.answerAsk) return false;
  run.answerAsk(answerText(run.pendingAsk, optionIndex, customText));
  return true;
}

/** Sohbet silindi ya da klasörü değişti: bağlı oturum bırakılır (çalışmıyorsa). */
export function closeChatSession(chatId: string): void {
  if (!chatBusy(chatId)) clearBinding(chatId);
}

/**
 * Sohbeti DALLANDIR (mesaj düzenlendi / yeniden üretildi): bağ düşer, bir
 * sonraki tur yeni oturumda geçmişi renderer'ın verdiği hâliyle tohumlar.
 * Eskiden bu TUI'de palet tuşlarıyla yapılıyordu ve 12 olayın 10'unda
 * axet-code'u çökertti (analiz 2026-10-16, bulgu 4).
 */
export function resetChatHistory(chatId: string): boolean {
  clearBinding(chatId);
  return true;
}

/** Artık ısıtılacak süreç yok; IPC Görev 6'da kalkıyor. */
export function prewarmChat(_cwd: string, _model: AxetModelEntry | null, _chatId?: string, _draft?: string): void {}

export function cancelAllChatMessages(): void {
  for (const id of Array.from(runs.keys())) cancelChatMessage(id);
}
```

- [ ] **Adım 7: Yeşili gör**

Çalıştır: `npx vitest run tests/axetChatHeadless.test.ts tests/axetSessionBinding.test.ts` ve `npm run typecheck`
Beklenen: 17/17 PASS (+ bağlama testleri), typecheck temiz.

`index.ts` hâlâ `axetChatTui`'den `closeAllTuiSessions`/`closeTuiSessionsForProject`/`axetUpdateAvailable` alıyor. Bu görevde dokunma; Tui dosyası Görev 6'ya kadar duruyor.

- [ ] **Adım 8: Commit**

```bash
git add app-electron/main/axetChat.ts
git add app-electron/main/axetSessionBinding.ts
git add app-electron/shared/types.ts
git add app-electron/main/i18n/tr.ts
git add app-electron/main/i18n/en.ts
git add tests/axetChatHeadless.test.ts
git add tests/axetSessionBinding.test.ts
git commit -m "Basiz kopru: sohbet yuzu run --resume ile (baglama, tohum, arac calistiysa yeniden gonderme yok, soru akisi, iptal)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 5: Arayüz — araç çalıştıktan sonra düşen turda "Devam et"

Görev 4'te ana süreç, ajan araç çalıştırdıktan sonra düşen turu **otomatik yeniden göndermiyor** ve `canContinue: true` dönüyor. Bu görev bunu kullanıcıya bir düğme olarak veriyor.

Yeni bir arayüz parçası eklenmiyor; mevcut "yarıda kaldı + Devam et" satırı (`interrupted`) yeniden kullanılıyor (tasarım ilkesi: daha fazla UI değil). Fark yalnızca not metninde: "uygulama kapandı" yerine hatanın kendisi yazıyor.

**Dosyalar:**
- Oluştur: `src/lib/settleAnswer.ts`
- Değişir:
  - `src/components/AxetCodeHome.tsx` (sonuç işleme: eski satır ~1313–1356; kalıcı kayıt: eski satır ~750);
  - `src/components/ChatBubble.tsx` (`ChatMessage.haltReason`, not metni);
  - `app-electron/shared/types.ts` (`StoredChatMessage.haltReason`);
  - `src/i18n/tr.ts`, `src/i18n/en.ts`.
- Test: `tests/settleAnswer.test.ts`, `tests/chatBubble.test.tsx`

**Arayüzler:**
- Tüketir: Görev 4'teki `AxetChatSendResult.canContinue?: boolean`.
- Üretir:

```ts
export interface SettledAnswer {
  content: string;
  error: boolean;
  /** Tur düştü ama ajan iş yapmıştı: "Devam et" düğmesi çıksın. */
  interrupted?: true;
  /** Yarıda kalmanın sebebi (hata metni); yoksa "uygulama kapandı" notu. */
  haltReason?: string;
}
export function settleAnswer(
  result: Pick<AxetChatSendResult, "ok" | "text" | "error" | "canContinue">,
  streamedText: string,
  genericError: string
): SettledAnswer;
```

- [ ] **Adım 1: Kırmızı testler**

`tests/settleAnswer.test.ts`:

```ts
// Tur sonucunun balona dönüşmesi (spec 2026-10-16 basiz-kopru §6: araç
// çalıştıysa otomatik yeniden gönderme yok, kullanıcıya "Devam et").
import { describe, expect, it } from "vitest";
import { settleAnswer } from "../src/lib/settleAnswer";

const G = "Cevap alınamadı";

describe("settleAnswer", () => {
  it("başarı: sonuç metni", () => {
    expect(settleAnswer({ ok: true, text: " cevap " }, "", G)).toEqual({ content: "cevap", error: false });
  });

  it("başarı ama boş sonuç: akmış metin kazanır", () => {
    expect(settleAnswer({ ok: true, text: "" }, "akan", G)).toEqual({ content: "akan", error: false });
  });

  it("başarı, ikisi de boş: genel hata", () => {
    expect(settleAnswer({ ok: true, text: "" }, "", G)).toEqual({ content: G, error: true });
  });

  it("hata, araç yok: hata metni, düğme yok", () => {
    expect(settleAnswer({ ok: false, text: "", error: "529" }, "yarım", G)).toEqual({ content: "529", error: true });
  });

  it("hata, araç çalıştı: yarım metin korunuyor, Devam et", () => {
    expect(settleAnswer({ ok: false, text: "yarım", error: "529 overloaded", canContinue: true }, "", G)).toEqual({
      content: "yarım",
      error: false,
      interrupted: true,
      haltReason: "529 overloaded"
    });
  });

  it("hata, araç çalıştı, metin hiç yok: balon hatanın kendisi ama devam edilebilir", () => {
    expect(settleAnswer({ ok: false, text: "", error: "529", canContinue: true }, "", G)).toEqual({
      content: "529",
      error: false,
      interrupted: true,
      haltReason: "529"
    });
  });
});
```

`tests/chatBubble.test.tsx` dosyasının sonuna:

```tsx
describe("ChatBubble yarıda kalan cevap", () => {
  it("haltReason varsa not hatayı söylüyor, 'uygulama kapandı' demiyor", () => {
    const onContinue = vi.fn();
    render(
      <LanguageProvider language="tr">
        <ChatBubble message={answer({ interrupted: true, haltReason: "529 overloaded" })} onContinue={onContinue} />
      </LanguageProvider>
    );
    expect(screen.getByText(/529 overloaded/)).toBeTruthy();
    expect(screen.queryByText(/uygulama kapandığında/)).toBeNull();
    fireEvent.click(screen.getByText("Devam et"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("haltReason yoksa eski not", () => {
    renderBubble(answer({ interrupted: true }));
    expect(screen.getByText(/uygulama kapandığında/)).toBeTruthy();
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/settleAnswer.test.ts tests/chatBubble.test.tsx`
Beklenen:
- `settleAnswer.test.ts` modül bulunamadığı için FAIL.
- `chatBubble` içindeki ilk yeni test FAIL (hata metni ekranda yok).

- [ ] **Adım 3: Uygula — `src/lib/settleAnswer.ts`**

```ts
// Bir sohbet turunun sonucu → balonun içeriği.
//
// AxetCodeHome'daki "EMNİYET AĞI" kuralları buraya taşındı (boş balon
// çizilmez; sonuç boşsa ekranda akmış metin kazanır) ve bir kural eklendi:
// ajan araç çalıştırdıktan sonra düşen tur HATA balonu değil, "yarıda kaldı"
// balonudur. Otomatik yeniden gönderme aynı yazmayı iki kez yapabilirdi
// (spec 2026-10-16 basiz-kopru §6); karar kullanıcıda, "Devam et" ile.

import type { AxetChatSendResult } from "../../app-electron/shared/types";

export interface SettledAnswer {
  content: string;
  error: boolean;
  /** Tur düştü ama ajan iş yapmıştı: "Devam et" düğmesi çıksın. */
  interrupted?: true;
  /** Yarıda kalmanın sebebi (hata metni); yoksa "uygulama kapandı" notu. */
  haltReason?: string;
}

export function settleAnswer(
  result: Pick<AxetChatSendResult, "ok" | "text" | "error" | "canContinue">,
  streamedText: string,
  genericError: string
): SettledAnswer {
  const answer = result.text.trim() || streamedText.trim();
  if (result.ok) return answer ? { content: answer, error: false } : { content: genericError, error: true };
  const reason = result.error || genericError;
  if (result.canContinue) return { content: answer || reason, error: false, interrupted: true, haltReason: reason };
  return { content: reason, error: true };
}
```

`src/lib` altındaki diğer dosyalar `app-electron/shared/types`'ı nasıl içe aktarıyorsa (göreli yol ya da takma ad) aynısını kullan.

- [ ] **Adım 4: Uygula — AxetCodeHome sonuç işleme**

`runPrompt` içindeki şu bloğu:

```ts
          const streamedText = streamed ? streamed.content.trim() : "";
          const answer = result.ok ? result.text.trim() || streamedText : "";
          const failed = !result.ok || !answer;
          const finalContent = failed
            ? result.error || t("axetCodeHome.chatGenericError")
            : answer;
```

şununla değiştir (üstündeki "EMNİYET AĞI" yorumunu kısalt; kuralların yeri artık `settleAnswer.ts`):

```ts
          // EMNİYET AĞI ve "Devam et" kuralı: bkz. src/lib/settleAnswer.ts.
          const settled = settleAnswer(
            result,
            streamed ? streamed.content : "",
            t("axetCodeHome.chatGenericError"),
          );
          // Sıradaki mesaj yalnızca TAM bir cevaptan sonra gidiyor; yarıda
          // kalan tur da kullanıcıdan karar bekliyor.
          const failed = settled.error || settled.interrupted === true;
          const halt = settled.interrupted
            ? { interrupted: true as const, haltReason: settled.haltReason }
            : {};
```

İki dalda (akmış mesaj güncelleniyor / yeni mesaj ekleniyor):
- `content: finalContent` → `content: settled.content`;
- `error: failed` → `error: settled.error`;
- `...withSteps` satırından sonra `...halt` ekle.

`restoreQueued` kullanımları `failed` üzerinden kalıyor.

Dosyanın başına içe aktarma ekle: `import { settleAnswer } from "../lib/settleAnswer";`.

- [ ] **Adım 5: Uygula — kalıcı kayıt ve not metni**

1. `app-electron/shared/types.ts`, `StoredChatMessage` içinde `interrupted?: boolean;` alanının altına:

```ts
  /**
   * Yarıda kalmanın sebebi: tur bir hatayla düştü ama ajan araç çalıştırmıştı
   * (bkz. AxetChatSendResult.canContinue). Yoksa ve `interrupted` varsa sebep
   * uygulamanın kapanması.
   */
  haltReason?: string;
```

2. `src/components/ChatBubble.tsx`, `ChatMessage` içinde `interrupted?: boolean;` altına `haltReason?: string;` ve kısa yorum.

3. Aynı dosyada not metni:

```tsx
            <span>{t("chatBubble.interrupted")}</span>
```

şuna dönüşür:

```tsx
            <span>
              {message.haltReason
                ? t("chatBubble.haltedByError", { error: message.haltReason })
                : t("chatBubble.interrupted")}
            </span>
```

4. `AxetCodeHome.tsx` kalıcı kayıt eşlemesinde (eski satır ~750), `...(m.interrupted ? { interrupted: true } : {}),` satırının altına:

```ts
                ...(m.haltReason ? { haltReason: m.haltReason } : {}),
```

Yükleme tarafı mesajı `{ ...m }` ile kopyaladığı için ayrıca değişiklik gerekmiyor.

5. `handleContinue` birleştirmesinde `interrupted: false,` satırının altına `haltReason: undefined,` ekle. Devam başarıyla birleşince eski hata notu da kalkmalı.

6. Metinler.

`src/i18n/tr.ts`, `"chatBubble.interrupted"` altına:

```ts
  // Tur bir hatayla düştü ama ajan araç çalıştırmıştı — otomatik yeniden
  // gönderilmedi (aynı yazma iki kez yapılmasın). Karar kullanıcıda.
  "chatBubble.haltedByError":
    "Bu cevap yarıda kaldı: {error}. Ajan bu turda araç çalıştırmıştı, bu yüzden otomatik yeniden denenmedi.",
```

`src/i18n/en.ts` aynı yere:

```ts
  "chatBubble.haltedByError":
    "This answer was cut short: {error}. The agent had already run tools in this turn, so it was not retried automatically.",
```

`t` parametre biçimi `{ad}` değilse (bkz. `axetCodeHome.phaseStalled`), dosyadaki biçimi kullan.

- [ ] **Adım 6: Yeşili gör**

Çalıştır: `npx vitest run tests/settleAnswer.test.ts tests/chatBubble.test.tsx tests/chatSessionPane.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS, typecheck temiz.

- [ ] **Adım 7: Commit**

```bash
git add src/lib/settleAnswer.ts
git add src/components/AxetCodeHome.tsx
git add src/components/ChatBubble.tsx
git add app-electron/shared/types.ts
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/settleAnswer.test.ts
git add tests/chatBubble.test.tsx
git commit -m "Basiz kopru: arac calistiktan sonra dusen turda yeniden gonderme yerine 'Devam et' (hata notuyla)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 6: Eski yolu söküp atmak — TUI, ısıtma, "durduramadım", global model yazma

Kullanıcı kararı (2026-10-16): *"eski yolu tamamen kaldır; kullanan olursa 1.4 ve üstü olmalı diye hata mesajı ver"*. Hata mesajı Görev 2 ve 4'te hazır. Bu görev yalnızca **siliyor** ve kalan üç bağlantıyı yeni kaynaklara bağlıyor.

**Dosyalar:**
- Sil:
  - `app-electron/main/axetChatTui.ts`, `app-electron/main/tuiPaste.ts`;
  - `tests/tuiPaste.test.ts`, `tests/tuiTimingLog.test.ts`.
- Değişir:
  - Ana süreç: `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `app-electron/main/axetCodeVersion.ts`, `app-electron/main/i18n/tr.ts`, `en.ts`.
  - Renderer: `src/window.d.ts`, `src/components/AxetCodeHome.tsx`, `src/components/ChatSessionPane.tsx`, `src/stores/chatTypes.ts`, `src/i18n/tr.ts`, `en.ts`.
  - Testler: `tests/openToolCall.test.ts`, `tests/policyBlock.test.ts`, `tests/chatSessionPane.test.tsx`, `tests/chatSidebar.test.tsx`, `tests/chatStore.test.tsx`, `tests/axetBinaryStatus.test.ts`.
  - Yorumlar: `axetChat` ve `axetChatTui`'ye atıf yapan yorumlar (aşağıdaki liste).
  - `PROJE-BILGI.md` (yeni bölüm).
- **Dokunma:**
  - `@lydell/node-pty` bağımlılığı: terminal modu kullanıyor.
  - `SapGuiAgentPanel.tsx` içindeki `setAxetModel`: ayrı özellik.
  - `axetModels:setCurrent` IPC'si: yukarıdaki panel kullanıyor.

**Arayüzler:**
- Tüketir:
  - Görev 2: `noteUpdateLine`, `axetUpdateAvailable`.
  - Görev 4: `cancelChatMessage`, `cancelAllChatMessages`, `closeChatSession`.
- Üretir:
  - `axetCodeVersion.ts`: `persistUpdateSeen(store: { load(): string; save(latest: string): void } | null): void`. Duyurunun kalıcılığı eskiden TUI'deydi.
  - `AppConfig.chatDefaultModel?: AxetModelEntry | null`: yeni sohbetlerin modeli. axet-code'un global ayarına artık yazılmıyor.

- [ ] **Adım 1: Kırmızı test — duyuru kalıcılığı** (`tests/axetBinaryStatus.test.ts` sonuna)

```ts
describe("güncelleme duyurusu kalıcı", () => {
  it("görülen en son sürüm kaydediliyor; yeni açılışta kurulu sürümle karşılaştırılıp dönüyor", async () => {
    let saved = "";
    const mod = await import("../app-electron/main/axetCodeVersion");
    mod.persistUpdateSeen({ load: () => saved, save: (v) => (saved = v) });
    mod.noteUpdateLine("INFO Update check done component=bgjob job=auto-update current=1.4.1 latest=1.4.2 minimum=1.3.0");
    expect(saved).toBe("1.4.2");
    // "yeni açılış": bellek boş, kalıcı değer duruyor
    mod.noteUpdateLine("INFO Update check done component=bgjob job=auto-update current=1.4.2 latest=1.4.2 minimum=1.3.0");
    expect(mod.axetUpdateAvailable()).toBeNull(); // güncellendi → duyuru yok
    mod.persistUpdateSeen(null);
  });
});
```

`tests/axetBinaryStatus.test.ts` üstteki içe aktarmayı `await import` ile mi yapıyor? Öyleyse yukarıdaki testte de aynı `mod` değişkenini kullan; ikinci bir `import` ekleme.

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/axetBinaryStatus.test.ts`
Beklenen: FAIL — `persistUpdateSeen is not a function`.

- [ ] **Adım 3: Uygula — `axetCodeVersion.ts`**

`updateInfo` tanımının altına:

```ts
// Duyuru KALICI: yalnızca bir axet-code süreci çalışınca görülüyor, oysa
// gösterildiği yer sohbet açılış ekranı — henüz hiçbir turun koşmadığı an
// (eski gerekçe, bkz. AppConfig.axetCodeLatestSeen). Depo dışarıdan veriliyor:
// bu modül config'i bilmiyor, testte de bilmemeli.
let seenStore: { load(): string; save(latest: string): void } | null = null;

export function persistUpdateSeen(store: { load(): string; save(latest: string): void } | null): void {
  seenStore = store;
}
```

`noteUpdateLine` içinde, `updateInfo = …` satırının altına:

```ts
  // Satır kurulu sürümü de söylüyor; sondaya gerek yok.
  lastSeen = m[1];
  if (seenStore && seenStore.load() !== m[2]) seenStore.save(m[2]);
```

`axetUpdateAvailable` gövdesi:

```ts
export function axetUpdateAvailable(): { installed: string; latest: string } | null {
  if (updateInfo) return updateInfo;
  // Bu açılışta henüz tur koşmadı: kalıcı değeri bilinen kurulu sürümle karşılaştır.
  const latest = seenStore?.load() ?? "";
  if (!latest || !lastSeen) return null;
  return compareVersions(latest, lastSeen) > 0 ? { installed: lastSeen, latest } : null;
}
```

`lastSeen` Görev 2'de `axetBinaryStatus` içinde dolduruluyor. Uygulama açılışında doctor satırı ve ilk tur onu dolduruyor. Dolmamışsa duyuru gösterilmiyor; yanlış duyuru göstermekten iyidir.

- [ ] **Adım 4: Yeşili gör** — `npx vitest run tests/axetBinaryStatus.test.ts` → PASS.

- [ ] **Adım 5: Ana süreç — `index.ts`**

1. İçe aktarma: `import { axetUpdateAvailable, closeAllTuiSessions, closeTuiSessionsForProject } from "./axetChatTui";` satırını sil. Yerine `axetCodeVersion` içe aktarmasına `axetUpdateAvailable, persistUpdateSeen` ekle. `./axetChat` içe aktarmasından `prewarmChat`'i çıkar ve `axetChat.ts`'teki boş `prewarmChat` fonksiyonunu sil.
2. `closeAllTuiSessions();` (global yetenek kurulumunun sonu): sil. Yerine yorum: `// Her tur yeni bir axet-code süreci: yetenek listesi bir sonraki turda zaten taze.`
3. `skills:reinstall`:
   - `const closed = closeTuiSessionsForProject(projectDir);` satırını ve altındaki `console.log` satırını sil.
   - Üstteki "Kurulumdan SONRA o projenin sıcak oturumları kapatılıyor…" paragrafını tek satırla değiştir: `// Sıcak oturum yok (her tur yeni süreç); kurulan liste bir sonraki turda görülüyor.`
4. `catalogSkills:install` / `catalogSkills:remove`:
   - `if (result.ok) closeTuiSessionsForProject(projectDir);` satırlarını sil.
   - Üstlerindeki "sıcak oturumlar kapatılmazsa…" yorumunu da aynı tek satırla değiştir.
5. `axetChat:cancel`:

```ts
  ipcMain.handle("axetChat:cancel", (_event, requestId: string) => {
    // Süreç ağacı öldürülüyor; "durdu mu" diye ayrı bir karar kanalı yok.
    cancelChatMessage(requestId);
  });
```

6. `axetChat:answerQuestion` üstündeki yorum: `// Ajanın sorusunun cevabı: aynı oturuma yeni bir tur olarak gidiyor (bkz. axetChat.ts).`
7. `axetChat:closeSession` üstündeki yorum: `// Sohbet silindi: bağlı oturum bırakılıyor (axet-code veritabanındaki kayda dokunulmuyor).`
8. `axetChat:prewarm` bloğunu yorumu ile birlikte sil.
9. `axetChat:updateAvailable` üstündeki yorum: `// Duyuru her turun stderr'inden okunuyor ve kalıcı (bkz. axetCodeVersion.ts).`
10. Uygulama hazır olduğunda, `registerIpc()` çağrısından önce, kalıcılığı bağla:

```ts
  persistUpdateSeen({
    load: () => loadConfig().axetCodeLatestSeen,
    save: (latest) => {
      saveConfig({ axetCodeLatestSeen: latest });
    }
  });
```

`saveConfig` `index.ts`'e içe aktarılmamışsa `./store` içe aktarmasına ekle.

- [ ] **Adım 6: Preload ve pencere tipleri**
- `app-electron/preload/index.ts`: `prewarmChat` ve `onChatCancelResult` girdilerini sil. `axetChatTui.ts`'e atıf yapan yorumları "bkz. axetChat.ts" yap. `AxetChatCancelVerdict` içe aktarması artık kullanılmıyorsa sil.
- `src/window.d.ts`: `prewarmChat` ve `onChatCancelResult` girdilerini sil.

- [ ] **Adım 7: Renderer — `AxetCodeHome.tsx`**
1. `PREWARM_DEBOUNCE_MS`, `CHAT_OPEN_PREWARM_MS` sabitlerini sil.
2. "--- Ön-ısıtma ---" bloğunu sil: `prewarmTargetRef`, iki `useEffect`, `prewarmKey`. `activeDraft` başka yerde kullanılmıyorsa onu da sil.
3. `onChatCancelResult` `useEffect`'ini ve üstündeki "Durdur gerçekten durdurdu mu?" yorumunu sil.
4. `handleDismissCancelStuck`'ı sil. `ChatSessionPane`'e verilen `onDismissCancelStuck` prop'unu iki yerden çıkar.
5. `newChatIdRef` yorumu ısıtmadan söz ediyor ("ısıtılan kalıcı oturum bu kimlikle açıldı"). Yorumu şöyle değiştir:
   `// Kimlik önceden üretiliyor; yeni sohbet ilk mesajla bu kimlikle oluşuyor.`
   Mekanizmayı değiştirme.
6. `handleSelectModel`:

```ts
  // Model SOHBETE ait ve her turda `-m` ile gidiyor (spec 2026-10-16 §7):
  // axet-code'un global ayarına yazmak öteki sohbetlerin modelini de
  // değiştiriyordu. Yeni sohbetlerin varsayılanı bizim config'imizde.
  const handleSelectModel = useCallback(
    async (entry: AxetModelEntry) => {
      setDefaultModel(entry);
      if (activeId) {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeId ? { ...s, model: entry } : s)),
        );
      }
      await window.api.saveConfig({ chatDefaultModel: entry }).catch(() => undefined);
      pushToast("success", t("modelSelector.switched", { model: entry.model }));
    },
    [activeId, pushToast, t],
  );
```

7. Model listesi yüklenirken (eski satır ~789):

```ts
      if (configResult.ok && configResult.config) {
        setDefaultModel(configResult.config.large);
      }
```

yerine:

```ts
      // Kullanıcının sohbet için seçtiği varsayılan önce; yoksa axet-code'un kendi ayarı.
      const chosen = (await window.api.getConfig().catch(() => null))?.chatDefaultModel ?? null;
      if (chosen) setDefaultModel(chosen);
      else if (configResult.ok && configResult.config) setDefaultModel(configResult.config.large);
```

Bu satır bir `.then` içinde; `await` kullanabilmek için geri çağrıyı `async` yap. `window.api.getConfig` adı farklıysa `src/window.d.ts`'teki config okuma fonksiyonunu kullan. Bileşende zaten yüklenmiş bir `config` durumu varsa onu kullan, yeni çağrı ekleme.

8. `cancelStuck: false` başlangıç değerlerini (3–4 yer) sil.

- [ ] **Adım 8: Tip ve bileşen**
- `app-electron/shared/types.ts`, `AppConfig` içine:

```ts
  // Yeni sohbetlerin modeli. axet-code'un global ayarı (`large`) yalnızca
  // bu boşken varsayılan; sohbet her turda modelini `-m` ile kendisi veriyor.
  chatDefaultModel?: AxetModelEntry | null;
```

- `axetCodeLatestSeen` yorumundaki "TUI el sıkışması sırasında ekrandan okunup yazılıyor" ifadesini "her turun stderr'indeki güncelleme satırından yazılıyor (bkz. axetCodeVersion.ts `persistUpdateSeen`)" yap.
- `src/stores/chatTypes.ts`: `cancelStuck` alanını ve yorumunu sil.
- `src/components/ChatSessionPane.tsx`:
  - `cancelStuck` prop'unu/alanını, `onDismissCancelStuck` prop'unu ve `session.cancelStuck && (…)` bloğunu sil.
  - Bloğun kullandığı i18n anahtarlarını not et.
- `src/i18n/tr.ts`/`en.ts`: o anahtarları sil, ama yalnızca başka yerde kullanılmıyorsa (`grep`).
- Testlerdeki `cancelStuck: false` ve `onDismissCancelStuck: vi.fn()` satırlarını sil: `chatSessionPane`, `chatSidebar`, `chatStore`.

- [ ] **Adım 9: Eski dosyaları sil**

```bash
git rm app-electron/main/axetChatTui.ts app-electron/main/tuiPaste.ts tests/tuiPaste.test.ts tests/tuiTimingLog.test.ts
```

Kaynak metni okuyan iki test bloğu da gidiyor:
- `tests/openToolCall.test.ts`: `describe("eski oturuma bağlanma", …)` bloğu ve onu açıklayan iki satırlık yorum. `readFileSync` başka yerde kullanılmıyorsa içe aktarmasını da sil.
- `tests/policyBlock.test.ts`: `describe("tur arızası yolu", …)` bloğu. Aynı içe aktarma kuralı geçerli.

Bu iki bloğun koruduğu davranış artık Görev 4'ün testlerinde:
- sonuçsuz araçlı oturuma bağlanmama;
- politika engelinde yeniden göndermeme ve açıklayıcı metin.

- [ ] **Adım 10: i18n temizliği (ana süreç)**

`app-electron/main/i18n/tr.ts` ve `en.ts`'te:
- `chat.emptyAnswerRun` ve `chat.emptyAnswerNoReason` anahtarlarını sil.
- `chatTui.*` anahtarlarından **yalnızca** şunlar kalıyor (Görev 4 `userError` kullanıyor): `policyBlocked`, `restartStillFailingAuth`, `updateRequired`, `updateRequiredVersions`, `turnRanTooLong`. Kalanları sil.
- Bölüm başlığı yorumu `// --- axetChatTui.ts ---` → `// --- axetChat.ts (tur hataları) ---`.

Silmeden önce her anahtar için `grep -rn "<anahtar>" app-electron src` çalıştır; başka kullanan çıkarsa silme ve ledger'a yaz.

- [ ] **Adım 11: Yorumlardaki eski atıflar**

`grep -rn "axetChatTui" app-electron src tests` boş dönmeli. Bugün atıf olan yerler:
- `appLog.ts:19`
- `axetChatAnswer.ts:16`
- `axetChatRecovery.ts:17,70`
- `axetSessionDb.ts:10,55,62,607`
- `chatStore.ts:33`
- `store.ts:127`
- `toolCallInput.ts:9`
- `shared/types.ts:418,766,784,789,831`
- `ChatComposer.tsx:218,596`
- `ChatEditedFiles.tsx:13`
- `chatTypes.ts:49,74`
- `classifyFailure.test.ts:4`

Her birinde atfı yeni yere çevir; anlamı değiştirme:
- araç olayları, `buildDiff`, `ASK_USER_TOOL` → `axetToolEvents.ts`;
- tur, iptal, soru, sessizlik → `axetHeadless.ts` / `axetChat.ts`;
- güncelleme duyurusu → `axetCodeVersion.ts`.

Artık doğru olmayan cümleleri sil. Örnekler: "TUI kipinde", "Esc tutmayabiliyor", "süreci yeniletiyor". `classifyFailure.test.ts:4` için: `"auth" ve "context" tur yeniden denemesini tetikliyor (axetChat.ts).`

`ChatComposer.tsx:218`'deki `closeMentionMenus` atfı TUI'nin menü tuzağıyla ilgili. Bileşendeki kod renderer'ın kendi menüsü içinse yalnızca yorumu düzelt, kodu değiştirme.

- [ ] **Adım 12: Proje günlüğü** — `PROJE-BILGI.md` sonuna:

```markdown
## 2026-10-16 — Başsız köprü: sohbet artık terminal (PTY/TUI) kullanmıyor

Sohbet ekranı her mesajda kısa ömürlü bir `axet-code run -v -q --output-format json [--resume <oturum>]`
süreci açıyor; oturum hafızası axet-code'da, sohbet → oturum eşlemesi `axetSessionBinding`.
Görünmez TUI, ısıtma, ekran okuma, palet tuşlarıyla geçmiş sarma ve "Esc tuttu mu" kararı kaldırıldı.

- Önkoşul axet-code 1.4.0+; eski sürümde sohbet açık bir hata veriyor.
- Soru: ajan `secenekler` bloğuyla soruyor; `ask_user`'ı yine çağırırsa süreç durdurulup soru kartı gösteriliyor.
- Hata: ajan araç çalıştırmadıysa bir kez otomatik yeniden; çalıştırdıysa "Devam et".
- Model sohbete ait (`-m`); axet-code'un global ayarına yazılmıyor.
- Ölçümler ve gerekçe: docs/superpowers/specs/2026-10-16-basiz-kopru-design.md.
```

- [ ] **Adım 13: Doğrula**

Çalıştır: `npm run typecheck` ve `npx vitest run > .superpowers/sdd/basiz-kopru-g6.txt 2>&1; tail -20 .superpowers/sdd/basiz-kopru-g6.txt`
Beklenen:
- typecheck temiz;
- tüm takım PASS (silinen iki test dosyası kadar eksik dosya);
- `grep -rn "axetChatTui\|tuiPaste\|prewarmChat\|cancelStuck" app-electron src tests` boş.

Typecheck bir silinmiş adı gösterirse kullanan yeri sil; yeni bir yedek yol **ekleme**.

- [ ] **Adım 14: Commit** — dosya dosya `git add` (silinenler `git rm` ile zaten sahnede):

```bash
git add app-electron/main/index.ts app-electron/preload/index.ts app-electron/main/axetCodeVersion.ts app-electron/main/axetChat.ts
git add app-electron/main/i18n/tr.ts app-electron/main/i18n/en.ts app-electron/shared/types.ts
git add src/window.d.ts src/components/AxetCodeHome.tsx src/components/ChatSessionPane.tsx src/stores/chatTypes.ts
git add src/i18n/tr.ts src/i18n/en.ts
git add tests/openToolCall.test.ts tests/policyBlock.test.ts tests/chatSessionPane.test.tsx tests/chatSidebar.test.tsx tests/chatStore.test.tsx tests/axetBinaryStatus.test.ts tests/classifyFailure.test.ts
git add PROJE-BILGI.md
# Adım 11'de yorumu değişen her dosya için ayrıca: git add <dosya>
git status --short   # resources/rfc-runtime, guiscript-runtime, auth-plus EKLENMEMELİ
git commit -m "Basiz kopru: eski TUI yolu kaldirildi (PTY, isitma, durduramadim uyarisi, global model yazma); guncelleme duyurusu stderr'den ve kalici" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Görev 7: Kalıcılık ve kurtarma — kimlikle kurtarma, doğru sohbetin kırpılması, kayıt hatası, akışta kayıt, günlük

Spec §9 ve §11. Analizin (2026-10-16) kalan bulguları:
- `chatStore` yanlış sohbetleri kırpıyor ve kayıt hatasını yutuyor;
- akış boyunca hiç kayıt yapılmıyor;
- kurtarma `tool_use` bitişini "tamamlandı" sayıyor ve oturumu istem metninden tahmin ediyor;
- `appLog` ilk yazma hatasında kalıcı olarak susuyor.

**Dosyalar:**
- Değişir:
  - Ana süreç: `app-electron/main/axetChatRecovery.ts`, `app-electron/main/chatStore.ts`, `app-electron/main/appLog.ts`, `app-electron/main/index.ts` (`axetChat:recoverAnswer`).
  - Köprü ve tipler: `app-electron/preload/index.ts`, `src/window.d.ts`.
  - Renderer: `src/components/AxetCodeHome.tsx`, `src/i18n/tr.ts`, `en.ts`.
- Oluştur: `src/lib/saveDelay.ts`
- Test:
  - Yeni: `tests/axetChatRecovery.test.ts`, `tests/chatStoreTrim.test.ts`, `tests/saveDelay.test.ts`, `tests/appLogRetry.test.ts`.
  - Mevcut: `tests/axetChatHeadless.test.ts` (bir test eklenir).

**Arayüzler:**
- Tüketir: `readBinding` (`axetSessionBinding.ts`), Görev 4'teki `closeChatSession`.
- Üretir:

```ts
// axetChatRecovery.ts
export function answerFromMessages(messages: AxetDbMessage[], needle: string): RecoveredAnswer | null; // saf
export function recoverAnswer(cwd: string, prompt: string, promptAtMs: number, sessionId?: string | null): RecoveredAnswer | null;
// chatStore.ts
export function trimSessions<T extends { updatedAt: number }>(sessions: T[], max: number): T[]; // saf, sırayı korur
// src/lib/saveDelay.ts
export const SAVE_DEBOUNCE_MS = 600;
export const SAVE_MAX_WAIT_MS = 10_000;
export function saveDelay(now: number, dirtySince: number): number;
// preload / window.d.ts
recoverChatAnswer(cwd: string, prompt: string, promptAtMs: number, chatId?: string): Promise<RecoveredAnswer | null>;
```

- [ ] **Adım 1: Kırmızı testler**

`tests/axetChatRecovery.test.ts`:

```ts
// Yarıda kalan turun kurtarılması (spec 2026-10-16 basiz-kopru §9).
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));
const db = vi.hoisted(() => ({ messages: [] as unknown[], byPrompt: null as string | null, asked: [] as string[] }));
vi.mock("../app-electron/main/axetSessionDb", async (orig) => ({
  ...(await orig<typeof import("../app-electron/main/axetSessionDb")>()),
  resolveSessionDb: () => "C:/p/.axet-code/axet-code.db",
  findSessionByPrompt: () => db.byPrompt,
  readMessagesSince: (_db: string, sid: string) => {
    db.asked.push(sid);
    return db.messages;
  }
}));

const { answerFromMessages, recoverAnswer } = await import("../app-electron/main/axetChatRecovery");
const { matchKey } = await import("../app-electron/main/axetSessionDb");

let n = 0;
const msg = (role: string, ...parts: Array<{ type: string; data?: Record<string, unknown> }>) =>
  ({ id: `m${++n}`, role, parts, createdAt: 0 }) as never;
const PROMPT = "Bu sistemde ZFI_RAPOR programı neden dump veriyor?";
const NEEDLE = matchKey(PROMPT).slice(0, 160);
const user = msg("user", { type: "text", data: { text: `Kurallar...\n\nKullanıcı mesajı: ${PROMPT}` } });

describe("answerFromMessages", () => {
  it("son bitişi tool_use olan tur YARIM sayılıyor", () => {
    const r = answerFromMessages(
      [user, msg("assistant", { type: "text", data: { text: "Bakıyorum." } }, { type: "finish", data: { reason: "tool_use" } })],
      NEEDLE
    );
    expect(r).toEqual({ text: "Bakıyorum.", finished: false });
  });

  it("araçtan sonra end_turn ile biten tur tamam; mesajlar boş satırla ayrılıyor", () => {
    const r = answerFromMessages(
      [
        user,
        msg("assistant", { type: "text", data: { text: "Bakıyorum." } }, { type: "finish", data: { reason: "tool_use" } }),
        msg("assistant", { type: "text", data: { text: "Sebep: X." } }, { type: "finish", data: { reason: "end_turn" } })
      ],
      NEEDLE
    );
    expect(r).toEqual({ text: "Bakıyorum.\n\nSebep: X.", finished: true });
  });
});

describe("recoverAnswer", () => {
  it("sohbetin bağlı oturum kimliği varsa tahmin edilmiyor, o oturum okunuyor", () => {
    db.messages = [user, msg("assistant", { type: "text", data: { text: "Cevap" } }, { type: "finish", data: { reason: "end_turn" } })];
    db.byPrompt = "BASKA";
    db.asked = [];
    const r = recoverAnswer("C:/p", PROMPT, Date.now(), "S-BAGLI");
    expect(db.asked).toEqual(["S-BAGLI"]);
    expect(r?.text).toBe("Cevap");
  });

  it("kimlik yoksa eski yol: istemden eşleştirme", () => {
    db.byPrompt = "S-ISTEM";
    db.asked = [];
    recoverAnswer("C:/p", PROMPT, Date.now(), null);
    expect(db.asked).toEqual(["S-ISTEM"]);
  });
});
```

`tests/chatStoreTrim.test.ts`:

```ts
// Sınır aşılınca EN ESKİ GÜNCELLENEN sohbet düşüyor (spec §9). Eskiden
// listenin başı düşüyordu: yeni sohbet sona eklendiği için bu "en eski
// oluşturulan" demekti — hâlâ her gün kullanılan bir sohbet silinebiliyordu.
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));
const { trimSessions } = await import("../app-electron/main/chatStore");

describe("trimSessions", () => {
  it("en eski güncellenenler düşüyor, kalanların sırası korunuyor", () => {
    const list = [
      { id: "a", updatedAt: 50 }, // eski oluşturulmuş ama yeni güncellenmiş
      { id: "b", updatedAt: 10 },
      { id: "c", updatedAt: 30 },
      { id: "d", updatedAt: 20 }
    ];
    expect(trimSessions(list, 2).map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("sınırın altındaysa aynen", () => {
    const list = [{ id: "a", updatedAt: 1 }];
    expect(trimSessions(list, 5)).toEqual(list);
  });
});
```

`tests/saveDelay.test.ts`:

```ts
// Akış sürerken de en geç 10 sn'de bir kayıt (spec §9). Parçalar ~50 ms
// aralıkla geldiği için düz debounce akış boyunca hiç tetiklenmiyordu.
import { describe, expect, it } from "vitest";
import { SAVE_DEBOUNCE_MS, SAVE_MAX_WAIT_MS, saveDelay } from "../src/lib/saveDelay";

describe("saveDelay", () => {
  it("yeni kirlenmede normal gecikme", () => {
    expect(saveDelay(1_000, 1_000)).toBe(SAVE_DEBOUNCE_MS);
  });
  it("uzun süredir kirliyse gecikme kısalıyor", () => {
    expect(saveDelay(1_000 + SAVE_MAX_WAIT_MS - 200, 1_000)).toBe(200);
  });
  it("süre dolmuşsa hemen", () => {
    expect(saveDelay(1_000 + SAVE_MAX_WAIT_MS + 5_000, 1_000)).toBe(0);
  });
});
```

`tests/appLogRetry.test.ts`:

```ts
// Bir yazma hatası günlüğü KALICI susturmamalı (spec §11): disk bir an dolu
// ya da dosya kilitli olabilir; sonraki satırlar yine denenmeli.
import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { getPath: () => "C:/tmp-userdata" } }));
const fs = vi.hoisted(() => ({ calls: 0, failFirst: true }));
vi.mock("node:fs", async (orig) => ({
  ...(await orig<typeof import("node:fs")>()),
  mkdirSync: () => undefined,
  statSync: () => ({ size: 0 }),
  appendFileSync: () => {
    fs.calls++;
    if (fs.failFirst && fs.calls === 1) throw new Error("EBUSY");
  }
}));

const { appLog } = await import("../app-electron/main/appLog");

describe("appLog", () => {
  it("ilk yazma hatasından sonra da yazmayı deniyor", () => {
    appLog("a");
    appLog("b");
    expect(fs.calls).toBe(2);
  });
});
```

`tests/axetChatHeadless.test.ts` içindeki `describe("sendChatMessage")` bloğunun sonuna:

```ts
  it("closeChatSession bağı siliyor (sohbet silindi)", () => {
    h.bindings.set("chat-1", { sessionId: "S0", cwd: "C:/p" });
    chat.closeChatSession("chat-1");
    expect(h.bindings.has("chat-1")).toBe(false);
  });
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/axetChatRecovery.test.ts tests/chatStoreTrim.test.ts tests/saveDelay.test.ts tests/appLogRetry.test.ts tests/axetChatHeadless.test.ts`
Beklenen:
- `answerFromMessages`/`trimSessions` dışa aktarılmadığı için FAIL;
- `saveDelay` modülü yok;
- `appLog` 1 çağrıda kalıyor;
- `closeChatSession` testi PASS (Görev 4'te uygulandı; bu test kilit).

- [ ] **Adım 3: Kurtarma — `axetChatRecovery.ts`**

1. `recoverAnswer`'daki döngüyü saf bir fonksiyona taşı. Mesajlar arasına boş satır koy; `tool_use` bitişini "tamam" sayma:

```ts
/**
 * Bu istemin turuna ait asistan metni. Saf: veritabanını bilmiyor.
 *
 * "Tamamlandı" yalnızca SON bitiş `tool_use` DEĞİLSE: `tool_use` bitişi
 * "araç çağırdım, sonucunu bekliyorum" demek — tur orada kesildiyse cevap
 * yarım (analiz 2026-10-16, bulgu 7).
 */
export function answerFromMessages(messages: AxetDbMessage[], needle: string): RecoveredAnswer | null {
  const pieces: string[] = [];
  let lastFinishReason: string | null = null;
  let promptSeen = false;
  for (const msg of messages) {
    if (!promptSeen) {
      if (msg.role !== "user") continue;
      const userText = msg.parts
        .filter((p) => p.type === "text")
        .map((p) => p.data?.text ?? "")
        .join("");
      if (matchKey(userText).includes(needle)) promptSeen = true;
      continue;
    }
    if (msg.role === "user") break;
    if (msg.role !== "assistant") continue;
    let text = "";
    for (const part of msg.parts) {
      if (part.type === "text") text += part.data?.text ?? "";
      else if (part.type === "finish") lastFinishReason = String(part.data?.reason ?? "");
    }
    if (text.trim()) pieces.push(text.trim());
  }
  const text = pieces.join("\n\n");
  if (!text) return null;
  return { text, finished: lastFinishReason !== null && lastFinishReason !== "tool_use" };
}
```

Mevcut döngünün içindeki iki açıklayıcı yorumu ("Prompt'un KENDİSİNDEN ÖNCEKİ…" ve "Prompt'tan SONRA gelen…") ilgili satırların üstüne taşı.

`AxetDbMessage` içe aktarmasını ekle (`import type`).

2. `recoverAnswer` imzası ve gövdesi:

```ts
export function recoverAnswer(
  cwd: string,
  prompt: string,
  promptAtMs: number,
  sessionId?: string | null
): RecoveredAnswer | null {
  if (!cwd) return null;
  const needle = matchKey(prompt).slice(0, 160);
  if (needle.length < MIN_NEEDLE) return null;
  const dbPath = resolveSessionDb(cwd);
  if (!dbPath) return null;
  const sinceSec = Math.floor(promptAtMs / 1000) - WINDOW_BACK_SEC;
  // Bağlı oturum kimliği varsa TAHMİN YOK: başsız köprü kimliği turun ilk
  // saniyelerinde bağlamaya yazıyor (bkz. axetChat.ts). Yalnızca eski
  // sohbetlerde (bağlaması olmayan) istem metninden eşleştiriliyor.
  const sid = sessionId || findSessionByPrompt(dbPath, sinceSec, needle);
  if (!sid) return null;
  return answerFromMessages(readMessagesSince(dbPath, sid, sinceSec), needle);
}
```

Dosya başlığındaki "`axetChatTui.ts` başlığı" atfını "bkz. axetHeadless.ts" yap. `newestSessionSince` yorumunu kaldır; artık o dalda değiliz.

- [ ] **Adım 4: IPC ve köprü**
- `app-electron/main/index.ts`:

```ts
  ipcMain.handle(
    "axetChat:recoverAnswer",
    (_event, cwd: string, prompt: string, promptAtMs: number, chatId?: string) => {
      const binding = chatId ? readBinding(chatId) : null;
      return recoverAnswer(cwd, prompt, promptAtMs, binding && binding.cwd === cwd ? binding.sessionId : null);
    }
  );
```

`readBinding`'i `./axetSessionBinding`'den içe aktar (zaten varsa ekleme).

- `app-electron/preload/index.ts`, `recoverChatAnswer`: dördüncü parametre `chatId?: string`; `invoke` çağrısına ekle.
- `src/window.d.ts`: aynı imza.
- `AxetCodeHome.tsx` kurtarma efektinde (eski satır ~669): `window.api.recoverChatAnswer(cwd, last.content, last.createdAt, session.id)`.

- [ ] **Adım 5: `chatStore.ts`**

```ts
/**
 * En son GÜNCELLENEN `max` sohbet; sıraları korunuyor. Eskiden `slice(-max)`
 * listenin başını atıyordu — yeni sohbetler sona eklendiği için bu en eski
 * OLUŞTURULANI atmak demekti, her gün kullanılan bir sohbet de olabilirdi.
 */
export function trimSessions<T extends { updatedAt: number }>(sessions: T[], max: number): T[] {
  if (sessions.length <= max) return sessions;
  const keep = new Set(
    sessions
      .map((s, i) => ({ i, at: s.updatedAt || 0 }))
      .sort((a, b) => b.at - a.at || b.i - a.i)
      .slice(0, max)
      .map((x) => x.i)
  );
  return sessions.filter((_, i) => keep.has(i));
}
```

`loadChatSessions` ve `saveChatSessions` içindeki `.slice(-MAX_SESSIONS)` iki yerde `trimSessions(…, MAX_SESSIONS)` olur.

- [ ] **Adım 6: `src/lib/saveDelay.ts`**

```ts
// Sohbet geçmişinin diske yazılma gecikmesi.
//
// Düz debounce (600 ms) akış sırasında HİÇ tetiklenmiyordu: parçalar ~50 ms
// aralıkla geliyor ve her biri zamanlayıcıyı sıfırlıyordu. Uzun bir turda
// uygulama kapanırsa kullanıcının o turdaki kendi mesajı bile diske inmemiş
// oluyordu. Üst sınır: ilk kirlenmeden en geç 10 sn sonra yazılıyor.

export const SAVE_DEBOUNCE_MS = 600;
export const SAVE_MAX_WAIT_MS = 10_000;

export function saveDelay(now: number, dirtySince: number): number {
  return Math.max(0, Math.min(SAVE_DEBOUNCE_MS, dirtySince + SAVE_MAX_WAIT_MS - now));
}
```

- [ ] **Adım 7: Renderer kayıt efekti** — `AxetCodeHome.tsx`, "--- Değişiklikleri diske yaz (debounce'lu) ---" efekti:
1. Bileşene iki ref ekle:
   - `const dirtySinceRef = useRef<number | null>(null);`
   - `const saveFailedRef = useRef(false);`
2. Efektin başında, `loadedRef` denetiminden sonra:

```ts
    if (dirtySinceRef.current === null) dirtySinceRef.current = Date.now();
    const delay = saveDelay(Date.now(), dirtySinceRef.current);
```

3. `setTimeout(() => {` gövdesinin başına `dirtySinceRef.current = null;` ekle. Sondaki `}, 600);` → `}, delay);`.
4. Kayıt çağrısı:

```ts
      window.api
        .saveChatSessions(state)
        .then((result) => {
          // Hata BİR KEZ söyleniyor; düzelince tekrar söylenebilir hâle geliyor.
          if (result.ok) saveFailedRef.current = false;
          else if (!saveFailedRef.current) {
            saveFailedRef.current = true;
            pushToast("error", t("axetCodeHome.historySaveFailed", { message: result.error ?? "" }));
          }
        })
        .catch(() => {});
```

5. Efektin bağımlılıklarına `pushToast` ve `t` ekle. Üstteki yorumdaki "kayıt ancak cevap bittikten sonra bir kez çalışıyor" cümlesini sil; yerine "bkz. src/lib/saveDelay.ts" yaz.
6. Akan mesaj yine yazılmıyor (`filter((m) => !m.streaming)`). Bu bilerek: uygulama tur ortasında kapanırsa son mesaj kullanıcınınki kalıyor ve açılışta kurtarma onu axet-code veritabanından dolduruyor.
7. İçe aktarma: `import { saveDelay } from "../lib/saveDelay";`

`src/i18n/tr.ts` (`axetCodeHome.historyCorrupt` yanına):

```ts
  "axetCodeHome.historySaveFailed": "Sohbet geçmişi diske yazılamadı: {message}. Uygulamayı kapatırsanız son değişiklikler kaybolabilir.",
```

`en.ts`:

```ts
  "axetCodeHome.historySaveFailed": "Chat history could not be saved: {message}. Closing the app may lose the latest changes.",
```

- [ ] **Adım 8: `appLog.ts`**
- `disabled` değişkenini ve onu kuran/okuyan satırları sil:
  - `resolveDir` içindeki `catch { disabled = true; … }` → `catch { return null; }`; bir sonraki çağrı yine dener;
  - `appLog` içindeki `catch { disabled = true; }` → `catch { /* bu satır kayıp; sonrakiler yine denenecek */ }`.
- Değişkenin yorumunu kaldır.
- Başlıktaki "`axetChatTui`'deki `sonEkran`" örneği Görev 6'da düzeltilmediyse burada düzelt: "örneğin hata ayıklama için ekran/metin döken satırlar".

- [ ] **Adım 9: Yeşili gör**

Çalıştır: `npx vitest run tests/axetChatRecovery.test.ts tests/chatStoreTrim.test.ts tests/saveDelay.test.ts tests/appLogRetry.test.ts tests/axetChatHeadless.test.ts tests/appLog.test.ts tests/chatStore.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS, typecheck temiz.

Sonra tüm takım: `npx vitest run > .superpowers/sdd/basiz-kopru-g7.txt 2>&1; tail -15 .superpowers/sdd/basiz-kopru-g7.txt`. Beklenen: tümü PASS.

Python testleri bu planda değişmedi; çalıştırma.

- [ ] **Adım 10: Commit**

```bash
git add app-electron/main/axetChatRecovery.ts app-electron/main/chatStore.ts app-electron/main/appLog.ts app-electron/main/index.ts
git add app-electron/preload/index.ts src/window.d.ts src/components/AxetCodeHome.tsx src/lib/saveDelay.ts
git add src/i18n/tr.ts src/i18n/en.ts
git add tests/axetChatRecovery.test.ts tests/chatStoreTrim.test.ts tests/saveDelay.test.ts tests/appLogRetry.test.ts tests/axetChatHeadless.test.ts
git commit -m "Basiz kopru: kurtarma bagli oturumla ve tool_use yarim sayiliyor; en eski guncellenen sohbet kirpiliyor; kayit hatasi bildiriliyor; akista 10 sn'de bir kayit; gunluk kalici susmuyor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Adım 11: Elle doğrulama (kullanıcıyla)**

Geliştirme sunucusunu yeniden başlatmadan önce kullanıcıya sor. Sonra uygulamada şunları dene:
1. Yeni sohbet: cevap geliyor. Günlükte `kopru.tur oturum=yeni`.
2. İkinci mesaj: ajan ilk mesajı hatırlıyor. Günlükte `oturum=surdu`.
3. Uzun bir tur sırasında Durdur: anında duruyor. Sonraki mesaj aynı sohbette sorunsuz.
4. Ajana iki seçenekli bir soru sordurt ("transport seçmem gerekiyorsa sor"). Kart çıkıyor; seçim yeni turu başlatıyor.
5. Bir mesajı düzenleyip yeniden gönder: yeni oturum, geçmiş korunuyor.
6. axet-code.exe adını geçici değiştir (kullanıcı yapar): sohbet "axet-code bulunamadı" hatası veriyor. Adı geri al: çalışıyor.

Sonuçları ledger'a yaz. Bir madde tutmazsa systematic-debugging ile kök nedeni bul. Ölçmeden düzeltme yapma.

---
