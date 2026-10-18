# Ajan Başına Kalıcı Bellek — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bellek açık her ajanın alan kökünde kendi `.ntt-studio/bellek/<anahtar>.md` dosyası olsun; ajan her süreç açılışında bir kez (boşta bir anda) bu dosyayı okuması/yazması için tek satırlık bir istem alsın; kullanıcı dosyayı ekip şeridindeki karttan açıp güvenle (üstüne yazmadan) düzenleyebilsin.

**Architecture:**
- **Saf mantık `shared` altında:** `app-electron/shared/memoryLogic.ts` anahtar türetme/doğrulama, yol, ilk içerik, istem satırı, config'ten hedef bulma (`memoryTarget`) ve IPC sonuç türlerini; `app-electron/shared/memoryNotice.ts` bildirim zamanlamasını (deneme sayısı, aralık, süreç başına bir kez) saf bir durum makinesi olarak tutuyor. Saat dışarıdan; testler sahte saatle.
- **Dosya ana süreçte:** `app-electron/main/memoryFiles.ts` dosyayı yalnız yoksa (`wx`) yaratıyor, en çok 256 KB okuyor, kaydetmede diskteki baytların SHA-256 özetini okunduğu andakiyle karşılaştırıyor (değiştiyse yazmıyor), geçici dosya + `rename` ile yazıyor, BOM/CRLF'yi koruyor; her adımda yol kökün içinde mi (`insideRootReal`, junction reddi).
- **Bildirim:** `app-electron/main/memoryNotifier.ts` her turda izleyicinin ajan listesine bakıyor, bellek anahtarını ve kökü config'teki kayıttan buluyor, Görev Panosu'nun yolundan (`agentMonitor.sendPrompt`) yazıyor. `index.ts`'te pano turundan ÖNCE çağrılıyor: aynı turda ikisi de bekliyorsa bellek satırı önce gider, pano mevcut "meşgul, sonra dene" davranışıyla sonraki tura kalır.
- **Pencere:** `app-electron/main/memoryService.ts` IPC'nin işini yapıyor (renderer yalnız alan + bölme kimliği yollar). Renderer: "Ajan ekle"de **Kalıcı bellek** kutusu, ekip şeridi kartında tek ikon düğmesi (**Belleği etkinleştir** / **Belleği aç**), `src/agents/MemoryDialog.tsx` ("Sohbet talimatları" kalıbı).

**Tech Stack:** Electron 44, TypeScript, React 18, Tailwind 3, lucide-react, vitest 2, @testing-library/react (jsdom), Node `crypto` (SHA-256). Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-18-ajan-bellegi-design.md` (dal `ozellik/ajan-bellegi`, `ozellik/tarayici` üstünden; üstüne inşa edilen: `docs/superpowers/plans/2026-10-18-tarayici.md`)

## Global Constraints

- **Öncelik: veri kaybı yok → yanlış bilgi yok → işlevsel boşluk** (spec §1). **Bellek kullanıcının dosyasıdır:** uygulama onu hiçbir yolda kendiliğinden silmez ya da ezmez. `memoryFiles.ts`'te dosyanın kendisine giden tek yazma yolu "okunduğu andaki özet hâlâ aynıysa geçici dosya + rename"; ilk yaratma yalnız `flag: "wx"`. `rmSync`/`unlinkSync(<bellek dosyası>)` yok (yalnız kendi geçici dosyamız silinir). Kaydetmede dosya diskte değişmiş ya da silinmişse yazılmaz, yeniden yaratılmaz; kullanıcının metni pencerede kalır.
- **Yol güvenliği:** anahtar `^[a-z0-9][a-z0-9-]{0,39}$` ve Windows ayrılmış adı değil; göreli yol `isSafeRelPath`; yazma/okuma öncesi gerçek yol alan kökünün içinde (`insideRootReal`, `mkdir`'den önce ve sonra); dosyanın yerinde bağ ya da klasör varsa dokunulmaz.
- **256 KB sınırı** (`MEMORY_MAX_BYTES = 256 * 1024`): büyük dosya okunmaz/gösterilmez/ezilmez; büyük metin yazılmaz. UTF-8 olmayan dosya da düzenlemeye açılmaz (U+FFFD ile ezilmesin).
- **Renderer serbest yol gönderemez:** bellek IPC'si yalnız `(workspaceId, paneId)` (+ kaydetmede metin ve özet) alır, yalnız ana pencereden (`event.sender === mainWindow.webContents`); anahtar config'teki ajan kaydından, kök config'teki alandan (`memoryTarget`).
- **Günlükte içerik ve yol yok.** Yalnız iki etiket: `bellek.bildirim` (`sonuc`: `tamam`/`vazgecildi`/`dosya`, `deneme`: sayı) ve `bellek.kaydet` (`sonuc`: `tamam` ya da hata kodu, `bayt`: sayı).
- **Bildirim yolu Görev Panosu'nunki** (`agentMonitor.sendPrompt`): motor çalışmıyorsa, soru varsa, kullanıcı yazıyorsa hiçbir şey yazılmaz. İstem satırı spec §3'teki metnin aynısı (ASCII, tek satır). `axet-code` ajanında da aynı yol; `AGENTS.md`'ye yazılmaz. axet-code `-y` ile kalır (komut satırı değişmez).
- **"Modül danışmanları asla geliştirme yapamasınlar" rol kapısı değişmez;** bu iş rol/izin koduna dokunmaz.
- **Tasarım: "daha fazla UI değil, daha güçlü hiyerarşi."** Yeni görünüm/panel yok. Lime (accent) **YALNIZ seçim**; yeni renk ya da jeton yok: uyarı `--status-warning-text`, hata `--status-danger-*`. `src/agents/MemoryDialog.tsx`'te hex (`#…`), `rgb(`/`hsl(`, `lime-*` yok.
- **Klavye:** Ctrl+V ve sağ tık elle yakalanmaz (`preventDefault`/`onPaste`/`onContextMenu` eklenmez); metin alanı tarayıcının kendi davranışında.
- **Kaynak dosyalarda görünmez ya da bidi karakter literal'i yok.** Gerekiyorsa \u kaçışı ya da kod noktasıyla kur (ör. `String.fromCharCode(0xfeff)`, `/\p{M}/gu`); bu planın kod blokları \u kaçışını bilerek kullanmıyor. Görünür semboller (`—`, `…`) serbest.
- **i18n:** her yeni metin aynı task'ta hem `src/i18n/tr.ts` hem `src/i18n/en.ts`'e (anahtar `agents.memory*` ya da `memory.` önekiyle, dosyanın SONUNA, `browser.fail.notSubmitted` satırından sonra); `tests/i18n.test.ts` yer tutucu eşitliğini denetler.
- **Dosya adları** (yalnız harf büyüklüğüyle ayrışan iki ad YASAK): `app-electron/shared/memoryLogic.ts`, `app-electron/shared/memoryNotice.ts`, `app-electron/main/memoryFiles.ts`, `app-electron/main/memoryNotifier.ts`, `app-electron/main/memoryService.ts`, `src/agents/MemoryDialog.tsx`. Başka yeni kaynak dosyası ekleme.
- better-sqlite3 vitest'te yüklenmiyor: testler `index.ts`'i ve `electron`'u İÇE AKTARMAZ (yalnız kaynak metni olarak okur).
- **Yeni npm bağımlılığı yok.** Prettier çalıştırılmaz.
- Komutlar: `npm run typecheck`, `npx vitest run <dosya>`; tam takım `npx vitest run > .superpowers/vitest-bellek.txt 2>&1` (çıktı dosyaya, sonra özeti oku).
- **Commit:** `git add` dosya dosya (asla `-A`/`.`); mesajın KONU satırı YALNIZ ASCII Türkçe (Türkçe harf yok, uzun tire yok); mesajın son satırı tam olarak `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Dal: `ozellik/ajan-bellegi` (dal değiştirme). `git stash`, `git reset`, `git rebase`, `git checkout` YOK.
- **Asla stage edilmez:** `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*`.
- **Düzenleme:** Windows'ta Git Bash heredoc'u ters eğik çizgiyi bozuyor; dosyaları Edit/Write araçlarıyla değiştir. Kod yorumları tam Türkçe karakterle. Satır sonu dosyanın kendisininki.
- **Uygulamayı başlatma** (`npm run dev`, `npm start`, Electron yok); elle deneme listesi kullanıcıya verilir. ADT/SAP çağrısı yok.

## Review Focus

1. **Pencere açıkken dosya diskte değişir** (ajan yazar, aynı boyutta aynı saniyede yeniden yazar, dosyayı siler, editör kilitler): Kaydet hiçbir durumda ezmemeli ya da silinen dosyayı yeniden yaratmamalı; "Dosya bu arada değişti" demeli, kullanıcının metni ancak açıkça **Yeniden yükle**'ye basınca gitmeli. (Task 2 testleri "arada diskte değiştiyse…", "aynı boyutta, aynı saniyede…", "arada silindiyse…"; Task 7 testi "dosya bu arada değiştiyse…")
2. **Dosyanın biçimi yabancı:** UTF-8 olmayan (ANSI/Windows-1254) dosya, BOM'lu ya da CRLF'li dosya, 256 KB'ı aşan dosya: düzenlemeye açılmamalı ya da açıldıysa BOM/CRLF korunmalı; U+FFFD ile ezilmemeli; büyük metin yazılmamalı. (Task 2 testleri "UTF-8 olmayan…", "CRLF ve BOM korunuyor", "256 KB…"; Task 7 testi "dosya çok büyük…")
3. **Tuhaf ajan adı ya da elle düzenlenmiş config:** "Con", "NUL", "LPT1", "İĞÜŞÖÇ", yalnız emoji, 60 karakter, iki alanda aynı ad; config'te `"memory": "../disari"` ya da `"Ayşe"`: anahtar Windows'ta yaratılabilir, benzersiz ve desene uygun olmalı; geçersiz anahtar atılmalı (bellek kapalı), ajan yine açılmalı. (Task 1 testleri "Windows ayrılmış adları…", "her türetilen anahtar…", "AgentSpec.memory…"; Task 5 testi "iki alanda aynı ad…")
4. **Bildirim ile ajanın işi yarışır:** ajan pano işiyle 10 dakika çalışır, soru sorar ya da kullanıcı yazarken boşa düşer; Enter'dan önce kullanıcı yazar (aborted); ajan yeniden başlatılır: deneme hakkı çalışırken tükenmemeli, aynı turda pano da bekliyorsa bellek önce gitmeli, süreç başına bir kez (yeniden başlatmada yine bir kez) gitmeli. (Task 3 testleri "çalışırken deneme sayılmıyor…", "aborted deneme sayılıyor…", "yeniden başlatma…", "aynı turda ikisi de bekliyorsa…")
5. **Yol kaçışı ya da başka alanın bölmesi:** `.ntt-studio` ya da `.ntt-studio/bellek` bir junction ile kök dışını gösteriyor; bellek dosyasının yerinde bir klasör var; renderer başka alanın bölme kimliğini ya da bellek kapalı bölmeyi yolluyor: hiçbir şey okunmamalı/yazılmamalı/yaratılmamalı (`unsafe`/`noMemory`). (Task 2 testleri ".ntt-studio kök dışını gösteren bir bağsa…", ".ntt-studio/bellek kök dışını gösteren bağsa…", "…dosyanın yerinde klasör…"; Task 4 testi "başka alanın bölmesi, bellek kapalı bölme, geçersiz kimlik…")

## Spec'ten bilinçli sapmalar ve netleştirmeler

1. **Kartta menü yok; tek ikon düğmesi.** Ekip şeridindeki ajan kartının menüsü yok (yalnız "Yeniden başlat" ikonu var). Yeni menü yerine kartın sağ altına tek ikon: bellek kapalıysa **Belleği etkinleştir** (`BookPlus`), açıksa **Belleği aç** (`BookOpen`). "Bellek bildirilemedi" notu ve **Yeniden bildir** bellek penceresinde.
2. **"Deneme"nin tanımı:** deneme = ajanın boşta göründüğü (motor hazır, durum `idle`/`unknown`, taslak yok, son tuştan 2 sn geçmiş) ve önceki denemeden en az 10 sn geçmiş bir anda yapılan gönderme girişimi. Ajan çalışırken, soru sorarken ya da kullanıcı yazarken beklemek deneme SAYMAZ: böylece pano işi uzun sürse de bellek satırı atlanmaz (spec §3 ikinci madde). "Sürekli meşgul" (spec §7) = boşta görünüp üç kez reddedilmek (`sendPrompt` `busy`/`typing`/`asking`, ya da Enter'dan önce `aborted`).
3. **Etkinleştirince bildirim çalışan sürece de gider** (spec: "bir sonraki açılışta"). Bildirimci bellek kapalı ajanın kaydına 10 sn'de bir bakar; anahtar config'e yazılınca bir sonraki boşta anda bir kez gönderir. Yeniden başlatmayı beklemek gereksiz; kayıt (renderer'ın `agents:register`'ı) ile config yazımı arasındaki sıra yarışını da kaldırıyor.
4. **Çakışma eki bütün alanlardaki anahtarlara bakar** (spec: "aynı alanda"): iki alan aynı kökü gösterebiliyor; iki ajan habersizce aynı dosyayı paylaşmasın.
5. **Anahtar türetmede iki ek:** Windows ayrılmış adları (`con`, `prn`, `aux`, `nul`, `com0-9`, `lpt0-9`) `-ajan` eki alır ve desen bunları reddeder (`con.md` yaratılamaz); Türkçe dışı aksanlar (`â`, `é`) NFD ile sökülür (`Kâtip` → `katip`).
6. **Değişiklik denetimi içerik özetiyle (SHA-256),** mtime+boyut değil: aynı saniyede aynı boyutta yazmayı da yakalar. Yazma: aynı klasörde geçici dosya (`wx`) → rename'den hemen önce özet yeniden denetlenir → `rename`. Kaydetmede dosya yoksa (silinmişse) "değişti" sayılır, yeniden yaratılmaz.
7. **UTF-8 olmayan dosya düzenlenmez** (256 KB üstü gibi: "bir düzenleyicide aç" + **Klasörde göster**). BOM ve CRLF korunur (metin alanı satır sonlarını LF'ye çeviriyor; ana süreç dosyanın kendi biçimine geri çeviriyor).
8. **Dosya yaratılamazsa bildirim denemesiz "bildirilemedi" olur** (beklemenin anlamı yok); pencerede hata ve **Yeniden bildir**.
9. **Çakışmada Kaydet kapalı, Yeniden yükle açık bir eylem:** uyarı metni "Senin metnin burada duruyor; gerekiyorsa kopyala, sonra Yeniden yükle (yüklenince bu metin gider)" der. Metin bu düğmeye basılana kadar pencerede kalır.
10. **Belleği etkinleştir pencereyi açmaz:** ikon **Belleği aç**'a döner (config yazımı birkaç ms sürüyor; hemen açılan pencere `noMemory` alabilirdi). Pencere yine de `noMemory` alırsa "henüz kayıtlı değil; birazdan yeniden yükle" + **Yeniden yükle**.
11. **Bildirim durumunu renderer'a iten kanal yok:** durum (`none`/`pending`/`sending`/`sent`/`failed`) pencere açılınca `memory:read` cevabında gelir. Kartta ayrı uyarı rengi yok.
12. **Dosya ilk açılışta yaratılır** = ilk bildirimden hemen önce ya da pencere ilk açıldığında (hangisi önceyse), her ikisi de yalnız yoksa (`wx`).
13. **Kaydetmeden sonra pencere kapanır** ("Sohbet talimatları" kalıbı); kapatma düğmesinin adı **Kapat**.
14. **8 task:** saf mantık (1), dosya (2), bildirim durum makinesi + bildirimci (3), ana süreç bağlantısı + IPC (4), terminal kaydı (5), Ajan ekle kutusu (6), bellek penceresi + kart düğmesi (7), rehber + doğrulama (8).

## Dosya yapısı

| Dosya | Sorumluluk | Task |
|---|---|---|
| `app-electron/shared/memoryLogic.ts` (yeni) | Saf: sabitler, anahtar türetme/doğrulama/tekilleştirme, yol, ilk içerik, istem satırı, `memoryTarget`, IPC sonuç türleri | 1 |
| `app-electron/shared/agentTypes.ts` | `AgentSpec.memory`, `readAgentSpec` doğrulaması | 1 |
| `app-electron/main/memoryFiles.ts` (yeni) | Yalnız yoksa yaratma, okuma (256 KB, UTF-8), iyimser eşzamanlı yazma, mutlak yol | 2 |
| `app-electron/shared/memoryNotice.ts` (yeni) | Saf bildirim durum makinesi | 3 |
| `app-electron/main/memoryNotifier.ts` (yeni) | Bildirimci (bağımlılık enjeksiyonu) | 3 |
| `app-electron/main/memoryService.ts` (yeni) | IPC'nin işi: hedef bulma, okuma/yazma/göster/yeniden bildir, günlük | 4 |
| `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts` | Bağlantı, pano turundan önce bildirim, dört IPC | 4 |
| `src/stores/terminalTypes.ts`, `src/stores/terminalReducer.ts`, `src/stores/terminalStore.tsx`, `src/stores/terminalStoreContext.ts` | `addPane.memory`, `enablePaneMemory` | 5 |
| `src/agents/AddAgentDialog.tsx` | **Kalıcı bellek** kutusu | 6 |
| `src/agents/MemoryDialog.tsx` (yeni), `src/agents/TeamStrip.tsx` | Bellek penceresi, kart düğmesi | 7 |
| `src/i18n/{tr,en}.ts` | `agents.memory*`, `memory.*` | 6, 7 |
| `KULLANIM-REHBERI.md` | "### Kalıcı bellek" bölümü | 8 |
| `tests/memoryLogic.test.ts`, `tests/memoryFiles.test.ts`, `tests/memoryNotice.test.ts`, `tests/memoryNotifier.test.ts`, `tests/memoryService.test.ts`, `tests/memoryIpcWiring.test.ts`, `tests/memoryReducer.test.ts`, `tests/memoryDialog.test.tsx` (yeni) | Testler | 1–7 |
| `tests/addAgentDialog.test.tsx`, `tests/terminalMode.test.tsx` ve `commandsMock` kullanan 12 test dosyası | Kutu, kart düğmesi; yeni komutun sahtesi | 5, 6, 7 |

---

### Task 1: Saf mantık — anahtar, yol, ilk içerik, istem satırı, hedef; `AgentSpec.memory`

**Files:**
- Create: `app-electron/shared/memoryLogic.ts`
- Modify: `app-electron/shared/agentTypes.ts` (`AgentSpec`, `readAgentSpec`)
- Test: `tests/memoryLogic.test.ts`

**Interfaces:**
- Consumes: `AgentSpec` (`app-electron/shared/agentTypes.ts`), `SavedTerminalWorkspace` (`app-electron/shared/types.ts`) — yalnız tür. Testte `isSafeRelPath` (`app-electron/shared/changesLogic.ts`), `normalizeTerminalWorkspaces` (`app-electron/shared/terminalLayout.ts`).
- Produces (sonraki bütün task'lar bu adları kullanır):

```ts
export const MEMORY_DIR = ".ntt-studio/bellek";
export const MEMORY_KEY_MAX = 40;
export const MEMORY_MAX_BYTES = 256 * 1024;
export type MemoryNotice = "none" | "pending" | "sending" | "sent" | "failed";
export type MemoryFailure = "invalid" | "noMemory" | "noRoot" | "unsafe" | "tooLarge" | "encoding" | "readFailed" | "changed" | "writeFailed";
export type MemoryReadResult =
  | { ok: true; rel: string; content: string; stamp: string; notice: MemoryNotice }
  | { ok: false; reason: MemoryFailure; rel?: string; notice?: MemoryNotice };
export type MemoryWriteResult = { ok: true; stamp: string } | { ok: false; reason: MemoryFailure };
export interface MemoryTarget { root: string; key: string; name: string }
export function isMemoryKey(value: unknown): value is string;
export function isMemoryStamp(value: unknown): value is string;
export function deriveMemoryKey(name: string): string;
export function uniqueMemoryKey(base: string, taken: ReadonlySet<string>): string;
export function takenMemoryKeys(workspaces: readonly { panes: readonly { agent?: AgentSpec }[] }[]): Set<string>;
export function withMemoryKey(spec: AgentSpec, name: string, workspaces: readonly { panes: readonly { agent?: AgentSpec }[] }[]): AgentSpec;
export function memoryRelPath(key: string): string;
export function memoryInitialContent(name: string): string;
export function memoryPromptLine(key: string): string;
export function memoryTarget(workspaces: readonly SavedTerminalWorkspace[], workspaceId: string, paneId: string): MemoryTarget | null;
// agentTypes.ts
export interface AgentSpec { /* … */ memory?: string }
```

- [ ] **Step 1: Kırmızı test** — `tests/memoryLogic.test.ts`

```ts
// Kalıcı bellek: saf mantık (spec 2026-10-18 ajan-bellegi §2, §3, §5).
import { describe, expect, it } from "vitest";
import {
  MEMORY_DIR,
  MEMORY_MAX_BYTES,
  deriveMemoryKey,
  isMemoryKey,
  isMemoryStamp,
  memoryInitialContent,
  memoryPromptLine,
  memoryRelPath,
  memoryTarget,
  takenMemoryKeys,
  uniqueMemoryKey,
  withMemoryKey
} from "../app-electron/shared/memoryLogic";
import { readAgentSpec, type AgentSpec } from "../app-electron/shared/agentTypes";
import { isSafeRelPath } from "../app-electron/shared/changesLogic";
import { normalizeTerminalWorkspaces } from "../app-electron/shared/terminalLayout";
import type { SavedTerminalWorkspace } from "../app-electron/shared/types";

const ROCKET = String.fromCodePoint(0x1f680);
const LINE_SEP = String.fromCharCode(0x2028);

describe("deriveMemoryKey (§2)", () => {
  it("Türkçe harfler ASCII, küçük harf, işaretler tek tire", () => {
    expect(deriveMemoryKey("Ayşe Çağrı Öztürk")).toBe("ayse-cagri-ozturk");
    expect(deriveMemoryKey("İLKER IŞIK")).toBe("ilker-isik");
    expect(deriveMemoryKey("  --Kod  İnceleme!!  ")).toBe("kod-inceleme");
    expect(deriveMemoryKey("SAP_MM v2.0")).toBe("sap-mm-v2-0");
    expect(deriveMemoryKey("İğüşöç")).toBe("igusoc");
  });

  it("Türkçe dışı aksanlar sökülüyor", () => {
    expect(deriveMemoryKey("Kâtip José")).toBe("katip-jose");
  });

  it("boş, yalnız işaret ya da emoji → ajan", () => {
    for (const name of ["", "   ", "!!!", `${ROCKET}${ROCKET}`, "---"]) expect(deriveMemoryKey(name), name).toBe("ajan");
  });

  it("en çok 40 karakter; kesimden sonra sonda tire kalmıyor", () => {
    expect(deriveMemoryKey(`${"a".repeat(39)} b`)).toBe("a".repeat(39));
    expect(deriveMemoryKey("x".repeat(80))).toBe("x".repeat(40));
  });

  it("Windows ayrılmış adları ek alıyor", () => {
    expect(deriveMemoryKey("Con")).toBe("con-ajan");
    expect(deriveMemoryKey("NUL")).toBe("nul-ajan");
    expect(deriveMemoryKey("com1")).toBe("com1-ajan");
    expect(deriveMemoryKey("LPT9")).toBe("lpt9-ajan");
    expect(deriveMemoryKey("console")).toBe("console");
  });

  it("her türetilen anahtar desene uyuyor ve güvenli göreli yol veriyor", () => {
    for (const name of ["Ayşe", "Con", "", "x".repeat(80), "a b c", "--", "Lpt9", "İğüşöç", ROCKET, "Kâtip"]) {
      const key = deriveMemoryKey(name);
      expect(isMemoryKey(key), name).toBe(true);
      expect(isSafeRelPath(memoryRelPath(key)), name).toBe(true);
    }
  });
});

describe("isMemoryKey / isMemoryStamp (§2, §5)", () => {
  it("anahtar deseni: ^[a-z0-9][a-z0-9-]{0,39}$, ayrılmış ad yok", () => {
    for (const ok of ["a", "ayse", "ayse-2", "0", "a".repeat(40), "con-ajan"]) expect(isMemoryKey(ok), ok).toBe(true);
    for (const bad of ["", "-a", "A", "ayşe", "a".repeat(41), "../x", "a/b", "a.md", "a b", "con", "aux", "lpt1", " a", 3, null, undefined]) {
      expect(isMemoryKey(bad), String(bad)).toBe(false);
    }
  });

  it("özet: 64 küçük onaltılık", () => {
    expect(isMemoryStamp("a".repeat(64))).toBe(true);
    for (const bad of ["A".repeat(64), "a".repeat(63), "g".repeat(64), "", 5]) expect(isMemoryStamp(bad), String(bad)).toBe(false);
  });
});

describe("uniqueMemoryKey / takenMemoryKeys / withMemoryKey (§2)", () => {
  const spec: AgentSpec = { engine: "claude", role: "", roleKind: "custom" };

  it("çakışmada -2, -3; uzun anahtarda toplam yine 40, sonda tire yok", () => {
    expect(uniqueMemoryKey("ayse", new Set())).toBe("ayse");
    expect(uniqueMemoryKey("ayse", new Set(["ayse"]))).toBe("ayse-2");
    expect(uniqueMemoryKey("ayse", new Set(["ayse", "ayse-2"]))).toBe("ayse-3");
    const long = "a".repeat(40);
    expect(uniqueMemoryKey(long, new Set([long]))).toBe(`${"a".repeat(38)}-2`);
    const dashy = `${"a".repeat(37)}-bc`;
    expect(uniqueMemoryKey(dashy, new Set([dashy]))).toBe(`${"a".repeat(37)}-2`);
  });

  it("bütün alanlardaki anahtarlar sayılıyor; varsa dokunulmuyor", () => {
    const workspaces = [
      { panes: [{ agent: { ...spec, memory: "ayse" } }, {}] },
      { panes: [{ agent: { ...spec, memory: "ayse-2" } }, { agent: { ...spec } }] }
    ];
    expect(takenMemoryKeys(workspaces)).toEqual(new Set(["ayse", "ayse-2"]));
    expect(withMemoryKey(spec, "Ayşe", workspaces)).toEqual({ ...spec, memory: "ayse-3" });
    expect(withMemoryKey({ ...spec, memory: "eski" }, "Ayşe", workspaces)).toEqual({ ...spec, memory: "eski" });
    expect(withMemoryKey(spec, "Mehmet", workspaces)).toEqual({ ...spec, memory: "mehmet" });
  });
});

describe("ilk içerik ve istem satırı (§2, §3)", () => {
  it("ilk içerik: başlık + boş satır + tek satır açıklama", () => {
    expect(memoryInitialContent("Ayşe")).toBe(
      "# Ayşe — kalıcı bellek\n\nBu dosyayı ajan ve sen birlikte tutarsınız; kalıcı kararlar, öğrenilenler, yarım işler.\n"
    );
  });

  it("başlıkta satır sonu ve ayırıcı yok; boş ad → Ajan", () => {
    expect(memoryInitialContent(` a\nb${LINE_SEP}c `).split("\n")[0]).toBe("# a b c — kalıcı bellek");
    expect(memoryInitialContent("   ").split("\n")[0]).toBe("# Ajan — kalıcı bellek");
    expect(memoryInitialContent("x".repeat(100)).split("\n")[0]).toBe(`# ${"x".repeat(60)} — kalıcı bellek`);
  });

  it("istem satırı spec'teki metin; tek satır, yalnız yazdırılabilir ASCII, ≤ 4000, `!`/`/` ile başlamıyor", () => {
    const line = memoryPromptLine("ayse-2");
    expect(line).toBe(
      "[Bellek] Kalici bellegin: .ntt-studio/bellek/ayse-2.md (alan kokune gore). Once oku. Kalici kararlari, ogrendiklerini ve yarim isleri oraya kisa maddelerle yaz; gizli bilgi (sifre, token) yazma."
    );
    expect(line).toMatch(/^[ -~]+$/);
    expect(line.length).toBeLessThanOrEqual(4000);
    expect(line).not.toMatch(/^[!/]/);
  });

  it("yol ve sınır", () => {
    expect(memoryRelPath("ayse")).toBe(`${MEMORY_DIR}/ayse.md`);
    expect(MEMORY_DIR).toBe(".ntt-studio/bellek");
    expect(MEMORY_MAX_BYTES).toBe(262_144);
  });
});

describe("memoryTarget (§2, §6)", () => {
  const ws = (over: Partial<SavedTerminalWorkspace> = {}): SavedTerminalWorkspace => ({
    id: "w1",
    name: "A",
    panes: [
      { id: "p1", kind: "agent", cwd: "C:\\ajan", title: "Ayşe", agent: { engine: "claude", role: "", roleKind: "custom", memory: "ayse" } },
      { id: "p2", kind: "agent", cwd: "C:\\ajan", agent: { engine: "codex", role: "", roleKind: "custom" } },
      { id: "p3", kind: "cmd", cwd: "C:\\ajan" },
      { id: "p4", kind: "agent", cwd: "C:\\ajan4", agent: { engine: "gemini", role: "", roleKind: "custom", memory: "gemini" } }
    ],
    ...over
  });

  it("kök varsa kök, yoksa ajanın klasörü; ad yoksa motor", () => {
    expect(memoryTarget([ws({ root: "C:\\kok" })], "w1", "p1")).toEqual({ root: "C:\\kok", key: "ayse", name: "Ayşe" });
    expect(memoryTarget([ws()], "w1", "p1")).toEqual({ root: "C:\\ajan", key: "ayse", name: "Ayşe" });
    expect(memoryTarget([ws({ root: "   " })], "w1", "p4")).toEqual({ root: "C:\\ajan4", key: "gemini", name: "gemini" });
  });

  it("bellek kapalı, kabuk, başka alan, olmayan bölme: null", () => {
    expect(memoryTarget([ws()], "w1", "p2")).toBeNull();
    expect(memoryTarget([ws()], "w1", "p3")).toBeNull();
    expect(memoryTarget([ws()], "w2", "p1")).toBeNull();
    expect(memoryTarget([ws(), { ...ws(), id: "w2", panes: [] }], "w2", "p1")).toBeNull();
    expect(memoryTarget([ws()], "w1", "yok")).toBeNull();
  });

  it("geçersiz anahtar (elle düzenlenmiş kayıt): null", () => {
    const bad = ws();
    bad.panes[0] = { ...bad.panes[0], agent: { engine: "claude", role: "", roleKind: "custom", memory: "../disari" } };
    expect(memoryTarget([bad], "w1", "p1")).toBeNull();
  });
});

describe("AgentSpec.memory (§5)", () => {
  it("geçerli anahtar kalıyor; geçersiz olan atılıyor, ajan yine okunuyor", () => {
    expect(readAgentSpec({ engine: "claude", role: "", roleKind: "custom", memory: "ayse" })).toEqual({
      engine: "claude",
      role: "",
      roleKind: "custom",
      memory: "ayse"
    });
    for (const memory of ["../x", "Ayşe", "con", 5, "", "a".repeat(41), null]) {
      expect(readAgentSpec({ engine: "claude", role: "", roleKind: "custom", memory }), String(memory)).toEqual({
        engine: "claude",
        role: "",
        roleKind: "custom"
      });
    }
  });

  it("config'ten okunan bölmede anahtar korunuyor; eski kayıt etkilenmiyor", () => {
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [
          { id: "p1", kind: "agent", cwd: "C:\\a", agent: { engine: "claude", role: "", roleKind: "custom", memory: "ayse" } },
          { id: "p2", kind: "agent", cwd: "C:\\a", agent: { engine: "claude", role: "", roleKind: "custom" } },
          { id: "p3", kind: "axet", cwd: "C:\\a" }
        ]
      }
    ];
    const panes = normalizeTerminalWorkspaces(raw, (n) => `Alan ${n}`)[0].panes;
    expect(panes[0].agent?.memory).toBe("ayse");
    expect(panes[1].agent).toEqual({ engine: "claude", role: "", roleKind: "custom" });
    expect(panes[2].agent && "memory" in panes[2].agent).toBe(false);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/memoryLogic.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/shared/memoryLogic"`.

- [ ] **Step 3: Uygulama** — `app-electron/shared/memoryLogic.ts`

```ts
// Ajan başına kalıcı bellek: saf mantık (spec 2026-10-18 ajan-bellegi §2, §3, §5).
//
// Ana süreç ve renderer aynı kuralları kullanıyor; bu yüzden `shared` altında.
// Dosyaya dokunan hiçbir şey burada yok (bkz. main/memoryFiles.ts). Bellek
// kullanıcının dosyası: bu modül yalnız ad, yol ve metin üretir.
import type { AgentSpec } from "./agentTypes";
import type { SavedTerminalWorkspace } from "./types";

export const MEMORY_DIR = ".ntt-studio/bellek";
export const MEMORY_KEY_MAX = 40;
/** Bellek dosyası en çok bu kadar okunur, gösterilir, yazılır (spec §5). */
export const MEMORY_MAX_BYTES = 256 * 1024;

const FALLBACK_KEY = "ajan";
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
// Windows'un ayrılmış aygıt adları: `con.md` uzantıyla da yaratılamıyor.
const RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/;
const TR_ASCII: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
const STAMP_RE = /^[0-9a-f]{64}$/;
const TITLE_MAX = 60;

export type MemoryNotice = "none" | "pending" | "sending" | "sent" | "failed";

export type MemoryFailure =
  | "invalid"
  | "noMemory"
  | "noRoot"
  | "unsafe"
  | "tooLarge"
  | "encoding"
  | "readFailed"
  | "changed"
  | "writeFailed";

export type MemoryReadResult =
  | { ok: true; rel: string; content: string; stamp: string; notice: MemoryNotice }
  | { ok: false; reason: MemoryFailure; rel?: string; notice?: MemoryNotice };

export type MemoryWriteResult = { ok: true; stamp: string } | { ok: false; reason: MemoryFailure };

export interface MemoryTarget {
  /** Alanın kökü, yoksa ajanın çalışma klasörü. */
  root: string;
  key: string;
  /** Dosya başlığı için: bölmenin adı, yoksa motor. */
  name: string;
}

type PanesOf = readonly { panes: readonly { agent?: AgentSpec }[] }[];

export function isMemoryKey(value: unknown): value is string {
  return typeof value === "string" && KEY_RE.test(value) && !RESERVED.test(value);
}

/** Bellek dosyasının SHA-256 özeti: 64 küçük onaltılık. */
export function isMemoryStamp(value: unknown): value is string {
  return typeof value === "string" && STAMP_RE.test(value);
}

/**
 * Ajan adından anahtar (spec §2): küçük harf, Türkçe harfler ASCII, öteki
 * aksanlar sökülür, `[a-z0-9-]` dışı `-`, art arda `-` teke, baş/son `-`
 * atılır, en çok 40; boşsa `ajan`; Windows ayrılmış adı `-ajan` eki alır.
 */
export function deriveMemoryKey(name: string): string {
  const key = name
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => TR_ASCII[c] ?? c)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MEMORY_KEY_MAX)
    .replace(/-+$/, "");
  if (!key) return FALLBACK_KEY;
  return RESERVED.test(key) ? `${key}-${FALLBACK_KEY}` : key;
}

/** Çakışmada `-2`, `-3`… eki; toplam yine en çok 40, ekin önünde tire birikmez. */
export function uniqueMemoryKey(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const key = `${base.slice(0, MEMORY_KEY_MAX - suffix.length).replace(/-+$/, "")}${suffix}`;
    if (!taken.has(key)) return key;
  }
}

/** Bütün alanlardaki ajanların anahtarları: iki alan aynı kökü gösterebilir (sapma 4). */
export function takenMemoryKeys(workspaces: PanesOf): Set<string> {
  const out = new Set<string>();
  for (const workspace of workspaces) {
    for (const pane of workspace.panes) {
      const key = pane.agent?.memory;
      if (isMemoryKey(key)) out.add(key);
    }
  }
  return out;
}

/** Spec'e tekil anahtar ekler; geçerli anahtarı varsa olduğu gibi döner. */
export function withMemoryKey(spec: AgentSpec, name: string, workspaces: PanesOf): AgentSpec {
  if (isMemoryKey(spec.memory)) return spec;
  return { ...spec, memory: uniqueMemoryKey(deriveMemoryKey(name), takenMemoryKeys(workspaces)) };
}

export function memoryRelPath(key: string): string {
  return `${MEMORY_DIR}/${key}.md`;
}

// C0, DEL, C1 ve Unicode satır/paragraf ayırıcıları (kod noktasıyla; kaynakta görünmez karakter yok).
function isControl(ch: string): boolean {
  const n = ch.codePointAt(0) ?? 0;
  return n < 0x20 || (n >= 0x7f && n <= 0x9f) || n === 0x2028 || n === 0x2029;
}

/** Yeni dosyanın içeriği (spec §2); yalnız dosya yoksa yazılır. */
export function memoryInitialContent(name: string): string {
  const flat = Array.from(name, (ch) => (isControl(ch) ? " " : ch)).join("").replace(/\s+/g, " ").trim();
  const title = Array.from(flat).slice(0, TITLE_MAX).join("").trim() || "Ajan";
  return `# ${title} — kalıcı bellek\n\nBu dosyayı ajan ve sen birlikte tutarsınız; kalıcı kararlar, öğrenilenler, yarım işler.\n`;
}

/** Ajana yazılan tek satır (spec §3). ASCII; `sendPrompt`'un kurallarına uyar. */
export function memoryPromptLine(key: string): string {
  return (
    `[Bellek] Kalici bellegin: ${memoryRelPath(key)} (alan kokune gore). Once oku. ` +
    "Kalici kararlari, ogrendiklerini ve yarim isleri oraya kisa maddelerle yaz; gizli bilgi (sifre, token) yazma."
  );
}

/**
 * Config'teki kayıttan bellek hedefi (spec §6): anahtar ajanın spec'inden,
 * kök alanın kaydından (yoksa ajanın klasörü). Bellek kapalı, kabuk, başka
 * alanın bölmesi ya da geçersiz anahtar → null.
 */
export function memoryTarget(
  workspaces: readonly SavedTerminalWorkspace[],
  workspaceId: string,
  paneId: string
): MemoryTarget | null {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const pane = workspace?.panes.find((p) => p.id === paneId);
  const key = pane?.kind === "agent" ? pane.agent?.memory : undefined;
  if (!workspace || !pane || !pane.agent || !isMemoryKey(key)) return null;
  const root = workspace.root?.trim() || pane.cwd.trim();
  if (!root) return null;
  return { root, key, name: pane.title ?? pane.agent.engine };
}
```

`app-electron/shared/agentTypes.ts` — dosyanın başındaki yorum bloğundan sonra içe aktarma:

```ts
import { isMemoryKey } from "./memoryLogic";
```

`AgentSpec`'e son alan olarak:

```ts
  /** Yalnız `ozel` motorda: kullanıcının yazdığı komut satırı. */
  command?: string;
  /** Kalıcı bellek anahtarı (spec 2026-10-18 ajan-bellegi §2, §5); yoksa bellek kapalı. */
  memory?: string;
}
```

`readAgentSpec`'te `if (record.engine === "ozel") {` bloğundan ÖNCE:

```ts
  // Geçersiz anahtar atılıyor (bellek kapalı sayılır); dosyaya dokunulmaz.
  if (isMemoryKey(record.memory)) spec.memory = record.memory;
```

(`memoryLogic.ts` `agentTypes.ts`'ten yalnız `import type` alıyor; döngü çalışma zamanında yok.)

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/memoryLogic.test.ts tests/terminalConfig.test.ts tests/agentEngines.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/shared/memoryLogic.ts
git add app-electron/shared/agentTypes.ts
git add tests/memoryLogic.test.ts
git commit -m "Bellek: anahtar, yol, ilk icerik ve istem satiri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Bellek dosyası — yalnız yoksa yaratma, okuma, değişmişse ezmeyen yazma

**Files:**
- Create: `app-electron/main/memoryFiles.ts`
- Test: `tests/memoryFiles.test.ts`

**Interfaces:**
- Consumes: Task 1 (`MEMORY_MAX_BYTES`, `isMemoryKey`, `memoryInitialContent`, `memoryRelPath`); `isSafeRelPath` (`app-electron/shared/changesLogic.ts`); `insideRootReal` (`app-electron/main/changesFs.ts`).
- Produces (Task 3, 4):

```ts
export type MemoryEnsure = "exists" | "created" | "failed";
export type MemoryFileRead =
  | { ok: true; content: string; stamp: string }
  | { ok: false; reason: "noRoot" | "unsafe" | "tooLarge" | "encoding" | "readFailed" | "missing" };
export type MemoryFileWrite =
  | { ok: true; stamp: string; bytes: number }
  | { ok: false; reason: "noRoot" | "unsafe" | "tooLarge" | "changed" | "writeFailed" };
export function memoryStamp(bytes: Uint8Array): string;
export function memoryAbsPath(root: string, key: string): string | null;
export function ensureMemoryFile(root: string, key: string, name: string): MemoryEnsure;
export function readMemoryFile(root: string, key: string): MemoryFileRead;
export function writeMemoryFile(root: string, key: string, content: string, expectedStamp: string): MemoryFileWrite;
```

- [ ] **Step 1: Kırmızı test** — `tests/memoryFiles.test.ts`

```ts
// Bellek dosyası (spec 2026-10-18 ajan-bellegi §2, §4, §5, §7) — gerçek geçici klasörle.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureMemoryFile, memoryAbsPath, memoryStamp, readMemoryFile, writeMemoryFile } from "../app-electron/main/memoryFiles";
import { MEMORY_MAX_BYTES, memoryInitialContent } from "../app-electron/shared/memoryLogic";

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const dirs: string[] = [];
const temp = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "ntt-bellek-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});
const fileOf = (root: string, key = "ayse") => path.join(root, ".ntt-studio", "bellek", `${key}.md`);
const put = (root: string, content: string | Buffer, key = "ayse") => {
  mkdirSync(path.dirname(fileOf(root, key)), { recursive: true });
  writeFileSync(fileOf(root, key), content);
};
const open = (root: string) => {
  const r = readMemoryFile(root, "ayse");
  if (!r.ok) throw new Error(r.reason);
  return r;
};

describe("ensureMemoryFile (§2)", () => {
  it("yoksa klasörü ve başlıklı dosyayı yaratıyor", () => {
    const root = temp();
    expect(ensureMemoryFile(root, "ayse", "Ayşe")).toBe("created");
    expect(readFileSync(fileOf(root), "utf8")).toBe(memoryInitialContent("Ayşe"));
  });

  it("var olan dosyaya asla yazmıyor (boş dosya dahil)", () => {
    const root = temp();
    put(root, "kendi notum\r\n");
    expect(ensureMemoryFile(root, "ayse", "Ayşe")).toBe("exists");
    expect(readFileSync(fileOf(root), "utf8")).toBe("kendi notum\r\n");
    put(root, "", "bos");
    expect(ensureMemoryFile(root, "bos", "Boş")).toBe("exists");
    expect(readFileSync(fileOf(root, "bos"), "utf8")).toBe("");
  });

  it("kök yok, kök bir dosya, geçersiz anahtar, dosyanın yerinde klasör: failed", () => {
    const root = temp();
    expect(ensureMemoryFile(path.join(root, "yok"), "ayse", "A")).toBe("failed");
    writeFileSync(path.join(root, "dosya.txt"), "x");
    expect(ensureMemoryFile(path.join(root, "dosya.txt"), "ayse", "A")).toBe("failed");
    expect(ensureMemoryFile(root, "../disari", "A")).toBe("failed");
    expect(ensureMemoryFile(root, "con", "A")).toBe("failed");
    mkdirSync(fileOf(root, "klasor"), { recursive: true });
    expect(ensureMemoryFile(root, "klasor", "A")).toBe("failed");
  });

  it(".ntt-studio kök dışını gösteren bir bağsa yaratılmıyor", (ctx) => {
    const root = temp();
    const outside = temp();
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio"), "junction");
    } catch {
      ctx.skip();
    }
    expect(ensureMemoryFile(root, "ayse", "A")).toBe("failed");
    expect(readdirSync(outside)).toEqual([]);
  });
});

describe("readMemoryFile (§4, §5)", () => {
  it("içerik BOM'suz ve LF; özet diskteki baytların SHA-256'sı", () => {
    const root = temp();
    const bytes = Buffer.concat([BOM, Buffer.from("# Not\r\n- karar\r\n", "utf8")]);
    put(root, bytes);
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: true, content: "# Not\n- karar\n", stamp: memoryStamp(bytes) });
    expect(memoryStamp(bytes)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("256 KB üstü okunmuyor: tooLarge; tam sınır okunuyor", () => {
    const root = temp();
    put(root, "a".repeat(MEMORY_MAX_BYTES + 1));
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "tooLarge" });
    put(root, "a".repeat(MEMORY_MAX_BYTES));
    expect(readMemoryFile(root, "ayse").ok).toBe(true);
  });

  it("UTF-8 olmayan dosya düzenlemeye açılmıyor: encoding", () => {
    const root = temp();
    put(root, Buffer.from([0x23, 0x20, 0x49, 0xfe, 0xff, 0x0a]));
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "encoding" });
  });

  it("yok: missing; kök yok: noRoot; anahtar geçersiz ya da yerinde klasör: unsafe", () => {
    const root = temp();
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "missing" });
    expect(readMemoryFile(path.join(root, "yok"), "ayse")).toEqual({ ok: false, reason: "noRoot" });
    expect(readMemoryFile(root, "../x")).toEqual({ ok: false, reason: "unsafe" });
    mkdirSync(fileOf(root, "klasor"), { recursive: true });
    expect(readMemoryFile(root, "klasor")).toEqual({ ok: false, reason: "unsafe" });
  });

  it(".ntt-studio/bellek kök dışını gösteren bağsa okunmuyor", (ctx) => {
    const root = temp();
    const outside = temp();
    writeFileSync(path.join(outside, "ayse.md"), "dışarıdaki gizli");
    mkdirSync(path.join(root, ".ntt-studio"));
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio", "bellek"), "junction");
    } catch {
      ctx.skip();
    }
    expect(readMemoryFile(root, "ayse")).toEqual({ ok: false, reason: "unsafe" });
  });
});

describe("writeMemoryFile (§4, §7: değişmiş dosya ezilmez)", () => {
  it("okunduğu gibiyse yazıyor; yeni özet ve bayt sayısı dönüyor; geçici dosya kalmıyor", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "# Not\n- yeni\n", r.stamp)).toEqual({
      ok: true,
      stamp: memoryStamp(Buffer.from("# Not\n- yeni\n", "utf8")),
      bytes: 13
    });
    expect(readFileSync(fileOf(root), "utf8")).toBe("# Not\n- yeni\n");
    expect(readdirSync(path.dirname(fileOf(root)))).toEqual(["ayse.md"]);
  });

  it("arada diskte değiştiyse yazmıyor: changed; ajanın yazdığı yerinde", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    put(root, "# Not\n- ajan yazdı\n");
    expect(writeMemoryFile(root, "ayse", "benim metnim", r.stamp)).toEqual({ ok: false, reason: "changed" });
    expect(readFileSync(fileOf(root), "utf8")).toBe("# Not\n- ajan yazdı\n");
    expect(readdirSync(path.dirname(fileOf(root)))).toEqual(["ayse.md"]);
  });

  it("aynı boyutta, aynı saniyede değişiklik de yakalanıyor (özet, mtime değil)", () => {
    const root = temp();
    put(root, "aaaa");
    const r = open(root);
    put(root, "bbbb");
    expect(writeMemoryFile(root, "ayse", "cccc", r.stamp)).toEqual({ ok: false, reason: "changed" });
    expect(readFileSync(fileOf(root), "utf8")).toBe("bbbb");
  });

  it("arada silindiyse yeniden yaratılmıyor: changed", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    rmSync(fileOf(root));
    expect(writeMemoryFile(root, "ayse", "benim metnim", r.stamp)).toEqual({ ok: false, reason: "changed" });
    expect(existsSync(fileOf(root))).toBe(false);
  });

  it("CRLF ve BOM korunuyor", () => {
    const root = temp();
    put(root, Buffer.concat([BOM, Buffer.from("a\r\nb\r\n", "utf8")]));
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "a\nb\nc\n", r.stamp).ok).toBe(true);
    expect(readFileSync(fileOf(root)).equals(Buffer.concat([BOM, Buffer.from("a\r\nb\r\nc\r\n", "utf8")]))).toBe(true);
  });

  it("LF dosyaya CRLF eklenmiyor", () => {
    const root = temp();
    put(root, "a\nb\n");
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "a\r\nb\r\nc\n", r.stamp).ok).toBe(true);
    expect(readFileSync(fileOf(root), "utf8")).toBe("a\nb\nc\n");
  });

  it("256 KB üstü metin yazılmıyor; dosya aynen kalıyor", () => {
    const root = temp();
    put(root, "# Not\n");
    const r = open(root);
    expect(writeMemoryFile(root, "ayse", "ş".repeat(MEMORY_MAX_BYTES / 2 + 1), r.stamp)).toEqual({ ok: false, reason: "tooLarge" });
    expect(readFileSync(fileOf(root), "utf8")).toBe("# Not\n");
  });

  it("kök yok: noRoot; anahtar geçersiz: unsafe", () => {
    const root = temp();
    expect(writeMemoryFile(path.join(root, "yok"), "ayse", "x", "a".repeat(64))).toEqual({ ok: false, reason: "noRoot" });
    expect(writeMemoryFile(root, "../ayse", "x", "a".repeat(64))).toEqual({ ok: false, reason: "unsafe" });
  });

  it(".ntt-studio kök dışını gösteren bağsa dışarıdaki dosya yazılmıyor", (ctx) => {
    const root = temp();
    const outside = temp();
    mkdirSync(path.join(outside, "bellek"));
    writeFileSync(path.join(outside, "bellek", "ayse.md"), "dışarı");
    try {
      symlinkSync(outside, path.join(root, ".ntt-studio"), "junction");
    } catch {
      ctx.skip();
    }
    const stamp = memoryStamp(Buffer.from("dışarı", "utf8"));
    expect(writeMemoryFile(root, "ayse", "ezilmesin", stamp)).toEqual({ ok: false, reason: "unsafe" });
    expect(readFileSync(path.join(outside, "bellek", "ayse.md"), "utf8")).toBe("dışarı");
  });
});

describe("memoryAbsPath", () => {
  it("güvenli yolda mutlak yol, değilse null", () => {
    const root = temp();
    expect(memoryAbsPath(root, "ayse")).toBe(fileOf(root));
    expect(memoryAbsPath(root, "../x")).toBeNull();
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/memoryFiles.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/memoryFiles"`.

- [ ] **Step 3: Uygulama** — `app-electron/main/memoryFiles.ts`

```ts
// Bellek dosyasının diskteki işleri (spec 2026-10-18 ajan-bellegi §2, §4, §5, §7).
//
// Kurallar (veri kaybı yok):
//   - Yaratma YALNIZ yoksa ("wx"); var olan dosyaya ilk içerik yazılmaz.
//   - Yazma YALNIZ diskteki baytların özeti okunduğu andakiyle aynıysa;
//     aynı klasörde geçici dosya ("wx") → rename'den hemen önce yeniden
//     özet → rename. Dosya silinmişse yeniden yaratılmaz ("changed").
//   - Bellek dosyası hiçbir yolda silinmez; yalnız kendi geçici dosyamız.
//   - Yol alan kökünün gerçekten içinde (insideRootReal, mkdir'den önce ve
//     sonra); dosyanın yerinde bağ ya da klasör varsa dokunulmaz.
//   - 256 KB üstü ve UTF-8 olmayan dosya düzenlemeye açılmaz.
import { createHash, randomBytes } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isSafeRelPath } from "../shared/changesLogic";
import { MEMORY_MAX_BYTES, isMemoryKey, memoryInitialContent, memoryRelPath } from "../shared/memoryLogic";
import { insideRootReal } from "./changesFs";

export type MemoryEnsure = "exists" | "created" | "failed";

export type MemoryFileRead =
  | { ok: true; content: string; stamp: string }
  | { ok: false; reason: "noRoot" | "unsafe" | "tooLarge" | "encoding" | "readFailed" | "missing" };

export type MemoryFileWrite =
  | { ok: true; stamp: string; bytes: number }
  | { ok: false; reason: "noRoot" | "unsafe" | "tooLarge" | "changed" | "writeFailed" };

const BOM = String.fromCharCode(0xfeff);
const absolute = (root: string, rel: string) => path.join(root, ...rel.split("/"));

export function memoryStamp(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function rootIsDir(root: string): boolean {
  try {
    return statSync(root).isDirectory();
  } catch {
    return false;
  }
}

/** Anahtar geçerli ve yol (var olan en yakın ata dahil) kökün gerçekten içinde. */
function safeRel(root: string, key: string): string | null {
  if (!isMemoryKey(key)) return null;
  const rel = memoryRelPath(key);
  return isSafeRelPath(rel) && insideRootReal(root, rel) ? rel : null;
}

/** Bağı izlemeden: düz dosya mı, yok mu, başka bir şey mi (bağ, klasör, okunamayan). */
function fileKind(file: string): "file" | "none" | "other" {
  try {
    const stat = lstatSync(file);
    return stat.isSymbolicLink() || !stat.isFile() ? "other" : "file";
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "ENOENT" ? "none" : "other";
  }
}

const hasBom = (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;

/** Katı UTF-8; geçersiz bayt varsa null (U+FFFD ile ezmemek için). BOM düşer. */
function decode(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function memoryAbsPath(root: string, key: string): string | null {
  const rel = safeRel(root, key);
  return rel ? absolute(root, rel) : null;
}

export function ensureMemoryFile(root: string, key: string, name: string): MemoryEnsure {
  if (!rootIsDir(root)) return "failed";
  const rel = safeRel(root, key);
  if (!rel) return "failed";
  const file = absolute(root, rel);
  const kind = fileKind(file);
  if (kind === "file") return "exists";
  if (kind === "other") return "failed";
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    if (!insideRootReal(root, rel)) return "failed";
    writeFileSync(file, memoryInitialContent(name), { encoding: "utf8", flag: "wx" });
    return "created";
  } catch (error) {
    // Aynı anda biri yarattıysa onunki kalır.
    return (error as NodeJS.ErrnoException)?.code === "EEXIST" && fileKind(file) === "file" ? "exists" : "failed";
  }
}

export function readMemoryFile(root: string, key: string): MemoryFileRead {
  if (!rootIsDir(root)) return { ok: false, reason: "noRoot" };
  const rel = safeRel(root, key);
  if (!rel) return { ok: false, reason: "unsafe" };
  const file = absolute(root, rel);
  const kind = fileKind(file);
  if (kind === "none") return { ok: false, reason: "missing" };
  if (kind === "other") return { ok: false, reason: "unsafe" };
  try {
    if (statSync(file).size > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
    const bytes = readFileSync(file);
    // stat ile okuma arasında büyüdüyse
    if (bytes.length > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
    const text = decode(bytes);
    if (text === null) return { ok: false, reason: "encoding" };
    return { ok: true, content: text.replace(/\r\n/g, "\n"), stamp: memoryStamp(bytes) };
  } catch {
    return { ok: false, reason: "readFailed" };
  }
}

/** Kullanıcının metni dosyanın kendi biçimine: CRLF'liyse CRLF, BOM'luysa BOM. */
function toFileText(content: string, original: Uint8Array, originalText: string): string {
  const lf = content.replace(/\r\n/g, "\n");
  const text = originalText.includes("\r\n") ? lf.replace(/\n/g, "\r\n") : lf;
  return hasBom(original) ? BOM + text : text;
}

export function writeMemoryFile(root: string, key: string, content: string, expectedStamp: string): MemoryFileWrite {
  if (!rootIsDir(root)) return { ok: false, reason: "noRoot" };
  const rel = safeRel(root, key);
  if (!rel) return { ok: false, reason: "unsafe" };
  const file = absolute(root, rel);
  // Silinmiş ya da yerine başka bir şey konmuş: ezme yok, yeniden yaratma yok.
  if (fileKind(file) !== "file") return { ok: false, reason: "changed" };
  let current: Buffer;
  try {
    current = readFileSync(file);
  } catch {
    return { ok: false, reason: "writeFailed" };
  }
  if (memoryStamp(current) !== expectedStamp) return { ok: false, reason: "changed" };
  const originalText = decode(current);
  if (originalText === null) return { ok: false, reason: "changed" };
  const bytes = Buffer.from(toFileText(content, current, originalText), "utf8");
  if (bytes.length > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
  const temp = path.join(path.dirname(file), `.${key}.${randomBytes(4).toString("hex")}.tmp`);
  try {
    writeFileSync(temp, bytes, { flag: "wx" });
    // Son bakış: rename'den hemen önce dosya hâlâ okunduğu gibi mi.
    if (fileKind(file) !== "file" || memoryStamp(readFileSync(file)) !== expectedStamp || !insideRootReal(root, rel)) {
      unlinkSync(temp);
      return { ok: false, reason: "changed" };
    }
    renameSync(temp, file);
    return { ok: true, stamp: memoryStamp(bytes), bytes: bytes.length };
  } catch {
    try {
      unlinkSync(temp);
    } catch {
      // geçici dosya hiç yazılmadıysa yok
    }
    return { ok: false, reason: "writeFailed" };
  }
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/memoryFiles.test.ts`
Expected: PASS (junction testleri bağ kurulamayan ortamda "skipped").

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/main/memoryFiles.ts
git add tests/memoryFiles.test.ts
git commit -m "Bellek: dosya yaratma, okuma ve degismisse ezmeyen yazma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Bildirim — saf durum makinesi ve bildirimci (sahte saat; pano ile sıra)

**Files:**
- Create: `app-electron/shared/memoryNotice.ts`
- Create: `app-electron/main/memoryNotifier.ts`
- Test: `tests/memoryNotice.test.ts`, `tests/memoryNotifier.test.ts`

**Interfaces:**
- Consumes: Task 1 (`memoryPromptLine`, `memoryTarget`, `MemoryNotice`, `MemoryTarget`); Task 2 (`MemoryEnsure`); `AgentPresence`, `AgentPromptResult`, `LogFields`, `createAgentMonitor`, `TYPING_GUARD_MS` (`app-electron/main/agentMonitor.ts`); `AgentStatus` (`agentTypes.ts`); `SavedTerminalWorkspace`.
- Produces (Task 4):

```ts
// shared/memoryNotice.ts
export const MEMORY_NOTICE_TRIES = 3;
export const MEMORY_NOTICE_GAP_MS = 10_000;
export type NoticePhase = "pending" | "sending" | "sent" | "failed";
export interface NoticeState { ptyId: string; phase: NoticePhase; attempts: number; nextAt: number }
export interface NoticeAgent { status: AgentStatus | null; inputIdle: boolean; engineReady: boolean }
export function startNotice(ptyId: string): NoticeState;
export function agentAtRest(agent: NoticeAgent): boolean;
export function noticeDue(state: NoticeState, agent: NoticeAgent, now: number): boolean;
export function noticeSending(state: NoticeState): NoticeState;
export function noticeDelivered(state: NoticeState): NoticeState;
export function noticeMissed(state: NoticeState, now: number): NoticeState;
export function noticeLater(state: NoticeState, now: number): NoticeState;
export function noticeBlocked(state: NoticeState): NoticeState;
export function noticeRetry(state: NoticeState): NoticeState | null;
// main/memoryNotifier.ts
export interface MemoryNotifierDeps {
  now(): number;
  agents(): AgentPresence[];
  workspaces(): readonly SavedTerminalWorkspace[];
  ensureFile(root: string, key: string, name: string): MemoryEnsure;
  sendPrompt(paneId: string, text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult;
  log(tag: string, fields: LogFields): void;
}
export interface MemoryNotifier { tick(): void; notice(paneId: string): MemoryNotice; renotify(paneId: string): boolean }
export function createMemoryNotifier(deps: MemoryNotifierDeps): MemoryNotifier;
```

- [ ] **Step 1: Kırmızı test** — `tests/memoryNotice.test.ts`

```ts
// Bellek bildiriminin zamanlaması (spec 2026-10-18 ajan-bellegi §3, §7): saf
// durum makinesi, sahte saatle.
import { describe, expect, it } from "vitest";
import {
  MEMORY_NOTICE_GAP_MS,
  MEMORY_NOTICE_TRIES,
  agentAtRest,
  noticeBlocked,
  noticeDelivered,
  noticeDue,
  noticeLater,
  noticeMissed,
  noticeRetry,
  noticeSending,
  startNotice,
  type NoticeAgent
} from "../app-electron/shared/memoryNotice";

const idle: NoticeAgent = { status: { state: "idle", source: "exact", lastActivity: 1 }, inputIdle: true, engineReady: true };

describe("agentAtRest", () => {
  it("motor hazır + taslak yok + idle ya da unknown", () => {
    expect(agentAtRest(idle)).toBe(true);
    expect(agentAtRest({ ...idle, status: { state: "unknown", source: "estimated", lastActivity: null } })).toBe(true);
  });

  it("çalışıyor, soru, bitti, hata, durum yok, motor hazır değil, kullanıcı yazıyor: hayır", () => {
    for (const state of ["running", "asking", "finished", "error"] as const) {
      expect(agentAtRest({ ...idle, status: { state, source: "exact", lastActivity: 1 } }), state).toBe(false);
    }
    expect(agentAtRest({ ...idle, status: null })).toBe(false);
    expect(agentAtRest({ ...idle, engineReady: false })).toBe(false);
    expect(agentAtRest({ ...idle, inputIdle: false })).toBe(false);
  });
});

describe("durum makinesi", () => {
  it("başlangıç: bekliyor, deneme 0, hemen uygun", () => {
    const s = startNotice("t1");
    expect(s).toEqual({ ptyId: "t1", phase: "pending", attempts: 0, nextAt: 0 });
    expect(noticeDue(s, idle, 5)).toBe(true);
  });

  it("gönderiliyor/gönderildi/vazgeçildi durumunda bir daha uygun değil", () => {
    const s = startNotice("t1");
    expect(noticeDue(noticeSending(s), idle, 1e12)).toBe(false);
    expect(noticeDue(noticeDelivered(noticeSending(s)), idle, 1e12)).toBe(false);
    expect(noticeDue(noticeBlocked(s), idle, 1e12)).toBe(false);
  });

  it("düşen deneme: 10 sn sonra yeniden; üçüncüde vazgeçiliyor", () => {
    let now = 1_000;
    let s = startNotice("t1");
    for (let i = 1; i <= MEMORY_NOTICE_TRIES; i += 1) {
      expect(noticeDue(s, idle, now), `deneme ${i}`).toBe(true);
      s = noticeMissed(noticeSending(s), now);
      expect(s.attempts).toBe(i);
      if (i < MEMORY_NOTICE_TRIES) {
        expect(s.phase).toBe("pending");
        expect(noticeDue(s, idle, now + MEMORY_NOTICE_GAP_MS - 1)).toBe(false);
        now += MEMORY_NOTICE_GAP_MS;
      }
    }
    expect(s.phase).toBe("failed");
    expect(noticeDue(s, idle, now + 10 * MEMORY_NOTICE_GAP_MS)).toBe(false);
    expect(MEMORY_NOTICE_TRIES).toBe(3);
    expect(MEMORY_NOTICE_GAP_MS).toBe(10_000);
  });

  it("noticeLater denemeyi saymadan erteliyor", () => {
    const s = noticeLater(startNotice("t1"), 1_000);
    expect(s).toEqual({ ptyId: "t1", phase: "pending", attempts: 0, nextAt: 1_000 + MEMORY_NOTICE_GAP_MS });
  });

  it("Yeniden bildir: vazgeçilmiş ya da gönderilmiş yeniden bekliyor (deneme 0); gönderilirken reddediliyor", () => {
    const failed = { ptyId: "t1", phase: "failed" as const, attempts: 3, nextAt: 99 };
    expect(noticeRetry(failed)).toEqual({ ptyId: "t1", phase: "pending", attempts: 0, nextAt: 0 });
    expect(noticeRetry(noticeDelivered(startNotice("t1")))?.phase).toBe("pending");
    expect(noticeRetry(noticeSending(startNotice("t1")))).toBeNull();
  });
});
```

- [ ] **Step 2: Kırmızı test** — `tests/memoryNotifier.test.ts`

```ts
// Bellek bildirimcisi (spec 2026-10-18 ajan-bellegi §3, §7): sahte saat,
// sahte izleyici; sonda gerçek izleyiciyle Görev Panosu sırası.
import { describe, expect, it, vi } from "vitest";
import { createAgentMonitor, type AgentPresence, type AgentPromptResult } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import { createMemoryNotifier } from "../app-electron/main/memoryNotifier";
import type { MemoryEnsure } from "../app-electron/main/memoryFiles";
import { memoryPromptLine } from "../app-electron/shared/memoryLogic";
import { MEMORY_NOTICE_GAP_MS } from "../app-electron/shared/memoryNotice";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";
import type { SavedTerminalWorkspace } from "../app-electron/shared/types";

const IDLE: AgentStatus = { state: "idle", source: "exact", lastActivity: 1 };
const RUNNING: AgentStatus = { state: "running", source: "exact", lastActivity: 1 };
const LINE = memoryPromptLine("ayse");

const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\kok",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "custom",
  sap: false,
  added: true,
  workspaceId: "w1",
  ...over
});

const workspace = (memory: string | undefined = "ayse"): SavedTerminalWorkspace => ({
  id: "w1",
  name: "A",
  root: "C:\\kok",
  panes: [{ id: "p1", kind: "agent", cwd: "C:\\kok", title: "Ayşe", agent: { engine: "axet-code", role: "", roleKind: "custom", ...(memory ? { memory } : {}) } }]
});

function harness() {
  const clock = { ms: 1_000_000 };
  const presence: AgentPresence[] = [{ reg: reg(), status: IDLE, inputIdle: true, engineReady: true }];
  const state = { workspaces: [workspace()] };
  const settles: ((outcome: "sent" | "aborted") => void)[] = [];
  const deps = {
    now: () => clock.ms,
    agents: vi.fn(() => presence),
    workspaces: vi.fn(() => state.workspaces),
    ensureFile: vi.fn((_root: string, _key: string, _name: string): MemoryEnsure => "created"),
    sendPrompt: vi.fn((_paneId: string, _text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult => {
      if (onSettled) settles.push(onSettled);
      return "ok";
    }),
    log: vi.fn()
  };
  const notifier = createMemoryNotifier(deps);
  const set = (over: Partial<AgentPresence>) => (presence[0] = { ...presence[0], ...over });
  return { clock, presence, state, settles, deps, notifier, set };
}

describe("bir kez, boşta bir anda (§3)", () => {
  it("motor hazır olmadan gönderilmiyor; hazır+boşta tek satır; gönderildikten sonra bir daha yok", () => {
    const { deps, notifier, set, settles, clock } = harness();
    set({ engineReady: false });
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    set({ engineReady: true });
    notifier.tick();
    expect(deps.ensureFile).toHaveBeenCalledWith("C:\\kok", "ayse", "Ayşe");
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    expect(deps.sendPrompt.mock.calls[0][0]).toBe("p1");
    expect(deps.sendPrompt.mock.calls[0][1]).toBe(LINE);
    expect(notifier.notice("p1")).toBe("sending");
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    settles[0]("sent");
    expect(notifier.notice("p1")).toBe("sent");
    for (let i = 0; i < 100; i += 1) {
      clock.ms += 1_000;
      notifier.tick();
    }
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    expect(deps.log).toHaveBeenCalledWith("bellek.bildirim", { sonuc: "tamam", deneme: 1 });
  });

  it("çalışırken deneme sayılmıyor: pano işi 10 dk sürse de bellek satırı sonra gidiyor", () => {
    const { deps, notifier, set, clock } = harness();
    set({ status: RUNNING });
    for (let i = 0; i < 600; i += 1) {
      clock.ms += 1_000;
      notifier.tick();
    }
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    set({ status: { state: "asking", source: "exact", lastActivity: 1 } });
    notifier.tick();
    set({ status: IDLE, inputIdle: false });
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    expect(notifier.notice("p1")).toBe("pending");
    set({ inputIdle: true });
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
  });

  it("reddedilen deneme 10 sn arayla; üçüncüde vazgeçiliyor ve günlüğe düşüyor", () => {
    const { deps, notifier, clock } = harness();
    deps.sendPrompt.mockReturnValue("busy");
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    clock.ms += MEMORY_NOTICE_GAP_MS - 1;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
    clock.ms += 1;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(2);
    clock.ms += MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(3);
    expect(notifier.notice("p1")).toBe("failed");
    clock.ms += 10 * MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(3);
    expect(deps.log).toHaveBeenCalledWith("bellek.bildirim", { sonuc: "vazgecildi", deneme: 3 });
  });

  it("aborted deneme sayılıyor; eşzamanlı aborted bir kez sayılıyor", () => {
    const { deps, notifier, settles, clock } = harness();
    notifier.tick();
    settles[0]("aborted");
    expect(notifier.notice("p1")).toBe("pending");
    deps.sendPrompt.mockImplementationOnce((_p, _t, onSettled) => {
      onSettled?.("aborted");
      return "ok";
    });
    clock.ms += MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(notifier.notice("p1")).toBe("pending");
    clock.ms += MEMORY_NOTICE_GAP_MS;
    notifier.tick();
    expect(notifier.notice("p1")).toBe("sending");
    settles[settles.length - 1]("aborted");
    expect(notifier.notice("p1")).toBe("failed");
  });

  it("yeniden başlatma (yeni pty): yeniden bir kez; eski sürecin geç gelen sonucu yok sayılıyor", () => {
    const { deps, notifier, set, settles } = harness();
    notifier.tick();
    set({ reg: reg({ ptyId: "t2" }) });
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(2);
    settles[0]("aborted");
    expect(notifier.notice("p1")).toBe("sending");
    settles[1]("sent");
    expect(notifier.notice("p1")).toBe("sent");
  });

  it("kapanan bölmenin kaydı atılıyor", () => {
    const { notifier, presence } = harness();
    notifier.tick();
    presence.splice(0);
    notifier.tick();
    expect(notifier.notice("p1")).toBe("none");
  });
});

describe("bellek kapalı, etkinleştirme, dosya (§3, §7; sapma 3, 8)", () => {
  it("bellek kapalı ajana hiçbir şey gitmiyor; config en çok 10 sn'de bir okunuyor; etkinleşince gidiyor", () => {
    const { deps, notifier, state, clock } = harness();
    state.workspaces = [workspace(undefined)];
    for (let i = 0; i < 20; i += 1) {
      notifier.tick();
      clock.ms += 1_000;
    }
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    expect(deps.ensureFile).not.toHaveBeenCalled();
    expect(deps.workspaces.mock.calls.length).toBeLessThanOrEqual(3);
    state.workspaces = [workspace("ayse")];
    for (let i = 0; i < 10; i += 1) {
      notifier.tick();
      clock.ms += 1_000;
    }
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
  });

  it("alanı olmayan kayıt (eski renderer) bildirim almıyor", () => {
    const { deps, notifier, set } = harness();
    set({ reg: reg({ workspaceId: undefined }) });
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
  });

  it("dosya yaratılamazsa gönderilmiyor; durum failed, günlükte 'dosya'; Yeniden bildir yeniden deniyor", () => {
    const { deps, notifier } = harness();
    deps.ensureFile.mockReturnValueOnce("failed");
    notifier.tick();
    expect(deps.sendPrompt).not.toHaveBeenCalled();
    expect(notifier.notice("p1")).toBe("failed");
    expect(deps.log).toHaveBeenCalledWith("bellek.bildirim", { sonuc: "dosya", deneme: 0 });
    expect(notifier.renotify("p1")).toBe(true);
    notifier.tick();
    expect(deps.sendPrompt).toHaveBeenCalledTimes(1);
  });

  it("gönderilirken Yeniden bildir reddediliyor; bilinmeyen bölme false", () => {
    const { notifier } = harness();
    notifier.tick();
    expect(notifier.renotify("p1")).toBe(false);
    expect(notifier.renotify("yok")).toBe(false);
  });

  it("bağımlılık fırlatsa da tick fırlatmıyor", () => {
    const { deps, notifier } = harness();
    deps.agents.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
    deps.workspaces.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
    deps.ensureFile.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
    deps.sendPrompt.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(() => notifier.tick()).not.toThrow();
  });

  it("günlükte yol, anahtar ya da metin yok", () => {
    const { deps, notifier, settles } = harness();
    notifier.tick();
    settles[0]("sent");
    const logged = JSON.stringify(deps.log.mock.calls);
    expect(logged).not.toMatch(/ayse|bellek\/|kok|Kalici/);
  });
});

// --- gerçek izleyiciyle Görev Panosu sırası ---------------------------------

class FakeReader implements AgentReader {
  current: AgentStatus = IDLE;
  feedOutput() {}
  submitLine() {}
  poll() {}
  status() {
    return this.current;
  }
  engineReady() {
    return true;
  }
  dispose() {}
}

describe("Görev Panosu ile sıra (§3)", () => {
  it("aynı turda ikisi de bekliyorsa bellek satırı önce gider; pano 'busy' alıp sonraki tura kalır", () => {
    const clock = { ms: 1_000_000 };
    const writes: string[] = [];
    const jobs: (() => void)[] = [];
    const monitor = createAgentMonitor({
      now: () => clock.ms,
      createReader: () => new FakeReader(),
      emit: () => {},
      notify: () => {},
      write: (_ptyId, data) => {
        writes.push(data);
        return true;
      },
      backlog: () => "",
      log: () => {},
      schedule: (fn) => {
        jobs.push(fn);
      }
    });
    monitor.register(reg());
    const notifier = createMemoryNotifier({
      now: () => clock.ms,
      agents: () => monitor.agents(),
      workspaces: () => [workspace()],
      ensureFile: () => "exists",
      sendPrompt: (paneId, text, onSettled) => monitor.sendPrompt(paneId, text, onSettled),
      log: () => {}
    });
    // index.ts'teki tur: önce bellek, sonra pano.
    notifier.tick();
    expect(monitor.sendPrompt("p1", "[Gorev abcd1234] is", () => {})).toBe("busy");
    jobs.splice(0).forEach((job) => job());
    expect(writes).toEqual([LINE, "\r"]);
    expect(notifier.notice("p1")).toBe("sent");
  });
});
```

- [ ] **Step 3: Kırmızıyı gör**

Run: `npx vitest run tests/memoryNotice.test.ts tests/memoryNotifier.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/shared/memoryNotice"` ve `"../app-electron/main/memoryNotifier"`.

- [ ] **Step 4: Uygulama** — `app-electron/shared/memoryNotice.ts`

```ts
// Bellek bildiriminin zamanlaması (spec 2026-10-18 ajan-bellegi §3, §7): saf
// durum makinesi. Saat dışarıdan; zamanlayıcı yok.
//
// "Deneme" (sapma 2): ajan boşta göründüğü bir anda yapılan gönderme
// girişimi. Ajan çalışırken, soru sorarken ya da kullanıcı yazarken beklemek
// deneme saymaz; böylece uzun bir pano işi bellek satırını düşürmez.
import type { AgentStatus } from "./agentTypes";

export const MEMORY_NOTICE_TRIES = 3;
export const MEMORY_NOTICE_GAP_MS = 10_000;

export type NoticePhase = "pending" | "sending" | "sent" | "failed";

export interface NoticeState {
  /** Hangi ajan süreci: yeni pty → yeni durum (yeniden başlatmada yine bir kez). */
  ptyId: string;
  phase: NoticePhase;
  attempts: number;
  /** Bundan önce yeniden denenmez (ms). */
  nextAt: number;
}

export interface NoticeAgent {
  status: AgentStatus | null;
  inputIdle: boolean;
  engineReady: boolean;
}

export function startNotice(ptyId: string): NoticeState {
  return { ptyId, phase: "pending", attempts: 0, nextAt: 0 };
}

/** Motor hazır, istem satırı boş, iş ya da soru yok. */
export function agentAtRest(agent: NoticeAgent): boolean {
  const state = agent.status?.state;
  return agent.engineReady && agent.inputIdle && (state === "idle" || state === "unknown");
}

export function noticeDue(state: NoticeState, agent: NoticeAgent, now: number): boolean {
  return state.phase === "pending" && now >= state.nextAt && agentAtRest(agent);
}

export function noticeSending(state: NoticeState): NoticeState {
  return { ...state, phase: "sending" };
}

export function noticeDelivered(state: NoticeState): NoticeState {
  return { ...state, phase: "sent" };
}

/** Deneme düştü (reddedildi ya da Enter'dan önce kesildi); üçüncüde vazgeçiliyor. */
export function noticeMissed(state: NoticeState, now: number): NoticeState {
  const attempts = state.attempts + 1;
  return { ...state, attempts, phase: attempts >= MEMORY_NOTICE_TRIES ? "failed" : "pending", nextAt: now + MEMORY_NOTICE_GAP_MS };
}

/** Bellek kapalı ya da kayıt henüz yazılmadı: deneme sayılmadan sonra yeniden bakılıyor. */
export function noticeLater(state: NoticeState, now: number): NoticeState {
  return { ...state, nextAt: now + MEMORY_NOTICE_GAP_MS };
}

/** Dosya yaratılamadı: denemesiz vazgeçiliyor (sapma 8). */
export function noticeBlocked(state: NoticeState): NoticeState {
  return { ...state, phase: "failed" };
}

/** "Yeniden bildir": gönderilirken yok; diğer her durumda baştan. */
export function noticeRetry(state: NoticeState): NoticeState | null {
  return state.phase === "sending" ? null : { ...state, phase: "pending", attempts: 0, nextAt: 0 };
}
```

`app-electron/main/memoryNotifier.ts`

```ts
// Bellek bildirimcisi (spec 2026-10-18 ajan-bellegi §3, §7). Ana süreçte tek
// örnek; index.ts'te pano turundan ÖNCE çağrılıyor (tickMemoryNotifier):
// aynı turda ikisi de bekliyorsa bellek satırı önce gider, pano izleyicinin
// "busy" cevabıyla sonraki tura kalır.
//
// Kurallar: hiçbir yol hata fırlatmıyor; günlüğe yol, anahtar ya da metin
// yazılmıyor; dosya yalnız yoksa yaratılıyor (deps.ensureFile, "wx");
// anahtar ve kök yalnız config'teki kayıttan (memoryTarget).
import { memoryPromptLine, memoryTarget, type MemoryNotice, type MemoryTarget } from "../shared/memoryLogic";
import {
  noticeBlocked,
  noticeDelivered,
  noticeDue,
  noticeLater,
  noticeMissed,
  noticeRetry,
  noticeSending,
  startNotice,
  type NoticeState
} from "../shared/memoryNotice";
import type { SavedTerminalWorkspace } from "../shared/types";
import type { AgentPresence, AgentPromptResult, LogFields } from "./agentMonitor";
import type { MemoryEnsure } from "./memoryFiles";

export interface MemoryNotifierDeps {
  now(): number;
  agents(): AgentPresence[];
  /** config.json'daki alanlar; turda en çok bir kez çağrılıyor. */
  workspaces(): readonly SavedTerminalWorkspace[];
  ensureFile(root: string, key: string, name: string): MemoryEnsure;
  sendPrompt(paneId: string, text: string, onSettled?: (outcome: "sent" | "aborted") => void): AgentPromptResult;
  log(tag: string, fields: LogFields): void;
}

export interface MemoryNotifier {
  tick(): void;
  notice(paneId: string): MemoryNotice;
  renotify(paneId: string): boolean;
}

export function createMemoryNotifier(deps: MemoryNotifierDeps): MemoryNotifier {
  const byPane = new Map<string, NoticeState>();

  function attempt<T>(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  const log = (fields: LogFields) => attempt(() => deps.log("bellek.bildirim", fields), undefined);

  function missed(paneId: string, from: NoticeState): void {
    const next = noticeMissed(from, attempt(() => deps.now(), 0));
    byPane.set(paneId, next);
    if (next.phase === "failed") log({ sonuc: "vazgecildi", deneme: next.attempts });
  }

  function send(paneId: string, state: NoticeState, target: MemoryTarget): void {
    const ensured = attempt(() => deps.ensureFile(target.root, target.key, target.name), "failed" as MemoryEnsure);
    if (ensured === "failed") {
      byPane.set(paneId, noticeBlocked(state));
      log({ sonuc: "dosya", deneme: state.attempts });
      return;
    }
    const sending = noticeSending(state);
    byPane.set(paneId, sending);
    const result = attempt(
      () =>
        deps.sendPrompt(paneId, memoryPromptLine(target.key), (outcome) => {
          // Arada yeniden başlatıldı ya da kapandı: bu sonuç artık o sürecin değil.
          if (byPane.get(paneId) !== sending) return;
          if (outcome === "sent") {
            byPane.set(paneId, noticeDelivered(sending));
            log({ sonuc: "tamam", deneme: sending.attempts + 1 });
          } else {
            missed(paneId, sending);
          }
        }),
      "writeFailed" as AgentPromptResult
    );
    // Reddedildi (busy/typing/asking/notRunning/…): onSettled hiç çağrılmaz.
    if (result !== "ok" && byPane.get(paneId) === sending) missed(paneId, sending);
  }

  function tick(): void {
    const presence = attempt(() => deps.agents(), null);
    if (!presence) return;
    const live = new Set(presence.map((p) => p.reg.paneId));
    for (const paneId of [...byPane.keys()]) if (!live.has(paneId)) byPane.delete(paneId);
    const now = attempt(() => deps.now(), 0);
    let workspaces: readonly SavedTerminalWorkspace[] | null = null;
    for (const p of presence) {
      const paneId = p.reg.paneId;
      const existing = byPane.get(paneId);
      const state = existing && existing.ptyId === p.reg.ptyId ? existing : startNotice(p.reg.ptyId);
      if (state !== existing) byPane.set(paneId, state);
      if (!noticeDue(state, p, now)) continue;
      if (workspaces === null) workspaces = attempt(() => deps.workspaces(), [] as readonly SavedTerminalWorkspace[]);
      const list = workspaces;
      const target = p.reg.workspaceId ? attempt(() => memoryTarget(list, p.reg.workspaceId as string, paneId), null) : null;
      if (!target) {
        byPane.set(paneId, noticeLater(state, now));
        continue;
      }
      attempt(() => send(paneId, state, target), undefined);
    }
  }

  return {
    tick,
    notice(paneId) {
      return byPane.get(paneId)?.phase ?? "none";
    },
    renotify(paneId) {
      const state = byPane.get(paneId);
      const next = state ? noticeRetry(state) : null;
      if (!next) return false;
      byPane.set(paneId, next);
      return true;
    }
  };
}
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/memoryNotice.test.ts tests/memoryNotifier.test.ts tests/agentMonitor.test.ts`
Expected: PASS.

Notlar (kırmızıysa bak): "config en çok 10 sn'de bir" testinde 20 tur × 1 sn → en çok 3 okuma (0., 10., 20. sn). `deps.sendPrompt` fırlatırsa `send`'in `attempt`'i yakalıyor ve durum `sending`'de kalmasın diye `attempt(..., "writeFailed")` sonucu `missed`'e gidiyor.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/shared/memoryNotice.ts
git add app-electron/main/memoryNotifier.ts
git add tests/memoryNotice.test.ts
git add tests/memoryNotifier.test.ts
git commit -m "Bellek: bildirim zamanlamasi ve bildirimci

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Ana süreç bağlantısı — bellek hizmeti, dört IPC, pano turundan önce bildirim; preload ve tipler

**Files:**
- Create: `app-electron/main/memoryService.ts`
- Modify: `app-electron/main/index.ts` (içe aktarma, `browserSender`'dan sonra bildirimci + hizmet, `queueBoardTick` ve pano zamanlayıcısı, `browser:send` işleyicisinden sonra dört IPC)
- Modify: `app-electron/preload/index.ts`, `src/window.d.ts`
- Test: `tests/memoryService.test.ts`, `tests/memoryIpcWiring.test.ts`

**Interfaces:**
- Consumes: Task 1 (`memoryTarget`, `memoryRelPath`, `isMemoryStamp`, `MEMORY_MAX_BYTES`, `MemoryReadResult`, `MemoryWriteResult`, `MemoryNotice`); Task 2 (`ensureMemoryFile`, `readMemoryFile`, `writeMemoryFile`, `memoryAbsPath`, `MemoryEnsure`, `MemoryFileRead`, `MemoryFileWrite`); Task 3 (`createMemoryNotifier`); `isBoardId` (`app-electron/shared/boardCommands.ts`).
- Produces (Task 7 renderer'ı kullanır):

```ts
// main/memoryService.ts
export interface MemoryServiceDeps {
  workspaces(): readonly SavedTerminalWorkspace[];
  ensure(root: string, key: string, name: string): MemoryEnsure;
  read(root: string, key: string): MemoryFileRead;
  write(root: string, key: string, content: string, stamp: string): MemoryFileWrite;
  absPath(root: string, key: string): string | null;
  reveal(file: string): void;
  notice(paneId: string): MemoryNotice;
  renotify(paneId: string): boolean;
  log(tag: string, fields: LogFields): void;
}
export interface MemoryService {
  read(workspaceId: unknown, paneId: unknown): MemoryReadResult;
  write(workspaceId: unknown, paneId: unknown, content: unknown, stamp: unknown): MemoryWriteResult;
  reveal(workspaceId: unknown, paneId: unknown): boolean;
  renotify(workspaceId: unknown, paneId: unknown): boolean;
}
export function createMemoryService(deps: MemoryServiceDeps): MemoryService;
// window.api (preload)
memoryRead(workspaceId: string, paneId: string): Promise<MemoryReadResult>;
memoryWrite(workspaceId: string, paneId: string, content: string, stamp: string): Promise<MemoryWriteResult>;
memoryReveal(workspaceId: string, paneId: string): Promise<boolean>;
memoryRenotify(workspaceId: string, paneId: string): Promise<boolean>;
```

- [ ] **Step 1: Kırmızı test** — `tests/memoryService.test.ts`

```ts
// Bellek penceresinin ana süreç tarafı (spec 2026-10-18 ajan-bellegi §4, §6): sahte bağımlılıklarla.
import { describe, expect, it, vi } from "vitest";
import { createMemoryService } from "../app-electron/main/memoryService";
import type { MemoryEnsure, MemoryFileRead, MemoryFileWrite } from "../app-electron/main/memoryFiles";
import type { MemoryNotice } from "../app-electron/shared/memoryLogic";
import type { SavedTerminalWorkspace } from "../app-electron/shared/types";

const STAMP = "a".repeat(64);
const WORKSPACES: SavedTerminalWorkspace[] = [
  {
    id: "w1",
    name: "A",
    root: "C:\\kok",
    panes: [
      { id: "p1", kind: "agent", cwd: "C:\\kok", title: "Ayşe", agent: { engine: "claude", role: "", roleKind: "custom", memory: "ayse" } },
      { id: "p2", kind: "agent", cwd: "C:\\kok", agent: { engine: "claude", role: "", roleKind: "custom" } }
    ]
  },
  {
    id: "w2",
    name: "B",
    panes: [{ id: "q1", kind: "agent", cwd: "C:\\b", agent: { engine: "claude", role: "", roleKind: "custom", memory: "mehmet" } }]
  }
];

function harness() {
  const deps = {
    workspaces: vi.fn(() => WORKSPACES),
    ensure: vi.fn((_r: string, _k: string, _n: string): MemoryEnsure => "exists"),
    read: vi.fn((_r: string, _k: string): MemoryFileRead => ({ ok: true, content: "# Ayşe\n", stamp: STAMP })),
    write: vi.fn((_r: string, _k: string, _c: string, _s: string): MemoryFileWrite => ({ ok: true, stamp: "b".repeat(64), bytes: 9 })),
    absPath: vi.fn((root: string, key: string): string | null => `${root}\\.ntt-studio\\bellek\\${key}.md`),
    reveal: vi.fn(),
    notice: vi.fn((_p: string): MemoryNotice => "sent"),
    renotify: vi.fn((_p: string) => true),
    log: vi.fn()
  };
  return { deps, service: createMemoryService(deps) };
}

describe("read (§4)", () => {
  it("önce yalnız-yoksa yaratma, sonra okuma; yol göreli, bildirim durumu ekli", () => {
    const { deps, service } = harness();
    expect(service.read("w1", "p1")).toEqual({ ok: true, rel: ".ntt-studio/bellek/ayse.md", content: "# Ayşe\n", stamp: STAMP, notice: "sent" });
    expect(deps.ensure).toHaveBeenCalledWith("C:\\kok", "ayse", "Ayşe");
    expect(deps.ensure.mock.invocationCallOrder[0]).toBeLessThan(deps.read.mock.invocationCallOrder[0]);
    expect(deps.read).toHaveBeenCalledWith("C:\\kok", "ayse");
  });

  it("dosya hatası sebebiyle dönüyor; yok (yaratılamadı) → readFailed", () => {
    const { deps, service } = harness();
    for (const reason of ["tooLarge", "encoding", "unsafe", "noRoot", "readFailed"] as const) {
      deps.read.mockReturnValueOnce({ ok: false, reason });
      expect(service.read("w1", "p1")).toEqual({ ok: false, reason, rel: ".ntt-studio/bellek/ayse.md", notice: "sent" });
    }
    deps.read.mockReturnValueOnce({ ok: false, reason: "missing" });
    expect(service.read("w1", "p1")).toMatchObject({ ok: false, reason: "readFailed" });
  });

  it("başka alanın bölmesi, bellek kapalı bölme, geçersiz kimlik: noMemory ve dosyaya dokunulmuyor", () => {
    const { deps, service } = harness();
    for (const [w, p] of [
      ["w1", "q1"],
      ["w2", "p1"],
      ["w1", "p2"],
      ["w1", "yok"],
      ["../w1", "p1"],
      [5, "p1"],
      ["w1", ""],
      ["w1", "x".repeat(101)],
      [null, null]
    ] as [unknown, unknown][]) {
      expect(service.read(w, p), `${String(w)}/${String(p)}`).toEqual({ ok: false, reason: "noMemory" });
    }
    expect(deps.ensure).not.toHaveBeenCalled();
    expect(deps.read).not.toHaveBeenCalled();
  });

  it("bağımlılık fırlatırsa fırlatmıyor", () => {
    const { deps, service } = harness();
    deps.read.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(service.read("w1", "p1")).toMatchObject({ ok: false, reason: "readFailed" });
    deps.workspaces.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(service.read("w1", "p1")).toEqual({ ok: false, reason: "noMemory" });
  });
});

describe("write (§4, §6, §7)", () => {
  it("okunduğu andaki özetle yazıyor; günlükte yalnız sonuç ve bayt", () => {
    const { deps, service } = harness();
    expect(service.write("w1", "p1", "# Ayşe\n- yeni\n", STAMP)).toEqual({ ok: true, stamp: "b".repeat(64) });
    expect(deps.write).toHaveBeenCalledWith("C:\\kok", "ayse", "# Ayşe\n- yeni\n", STAMP);
    expect(deps.log).toHaveBeenCalledWith("bellek.kaydet", { sonuc: "tamam", bayt: 9 });
  });

  it("değişmiş dosya: changed döner, günlükte sebep", () => {
    const { deps, service } = harness();
    deps.write.mockReturnValueOnce({ ok: false, reason: "changed" });
    expect(service.write("w1", "p1", "x", STAMP)).toEqual({ ok: false, reason: "changed" });
    expect(deps.log).toHaveBeenCalledWith("bellek.kaydet", { sonuc: "changed", bayt: 0 });
  });

  it("geçersiz metin ya da özet: invalid, dosyaya gidilmiyor", () => {
    const { deps, service } = harness();
    expect(service.write("w1", "p1", 5, STAMP)).toEqual({ ok: false, reason: "invalid" });
    expect(service.write("w1", "p1", "x", "kisa")).toEqual({ ok: false, reason: "invalid" });
    expect(service.write("w1", "p1", "x", undefined)).toEqual({ ok: false, reason: "invalid" });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("sınırı aşan metin dosyaya gitmeden tooLarge; bellek kapalı bölme noMemory", () => {
    const { deps, service } = harness();
    expect(service.write("w1", "p1", "a".repeat(256 * 1024 + 1), STAMP)).toEqual({ ok: false, reason: "tooLarge" });
    expect(service.write("w1", "p2", "x", STAMP)).toEqual({ ok: false, reason: "noMemory" });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("günlükte metin, anahtar ya da yol yok", () => {
    const { deps, service } = harness();
    service.write("w1", "p1", "gizli metin", STAMP);
    expect(JSON.stringify(deps.log.mock.calls)).not.toMatch(/gizli|ayse|kok|bellek\//);
  });

  it("yazma fırlatırsa writeFailed", () => {
    const { deps, service } = harness();
    deps.write.mockImplementationOnce(() => {
      throw new Error("x");
    });
    expect(service.write("w1", "p1", "x", STAMP)).toEqual({ ok: false, reason: "writeFailed" });
  });
});

describe("reveal / renotify", () => {
  it("yalnız kayıtlı bellek bölmesinde; yol ana süreçte kuruluyor", () => {
    const { deps, service } = harness();
    expect(service.reveal("w1", "p1")).toBe(true);
    expect(deps.reveal).toHaveBeenCalledWith("C:\\kok\\.ntt-studio\\bellek\\ayse.md");
    expect(service.reveal("w1", "p2")).toBe(false);
    deps.absPath.mockReturnValueOnce(null);
    expect(service.reveal("w1", "p1")).toBe(false);
    expect(deps.reveal).toHaveBeenCalledTimes(1);
    expect(service.renotify("w1", "p1")).toBe(true);
    expect(deps.renotify).toHaveBeenCalledWith("p1");
    expect(service.renotify("w2", "p1")).toBe(false);
    expect(deps.renotify).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Kırmızı test** — `tests/memoryIpcWiring.test.ts`

```ts
// Kalıcı bellek: ana süreç bağlantısı ve veri güvenliği kilitleri — kaynak
// düzeyinde (bkz. browserIpcWiring.test.ts). Spec 2026-10-18 ajan-bellegi §3, §6.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");
const files = read("app-electron", "main", "memoryFiles.ts");
const notifier = read("app-electron", "main", "memoryNotifier.ts");
const service = read("app-electron", "main", "memoryService.ts");

describe("Bellek — bağlantı (§3, §6)", () => {
  it("bellek satırı pano turundan ÖNCE: hem ertelenmiş turda hem zamanlayıcıda", () => {
    expect(main).toMatch(/function queueBoardTick[\s\S]{0,300}tickMemoryNotifier\(\);[\s\S]{0,120}boardManager\.tick\(\)/);
    expect(main).toMatch(/setInterval\(\s*\(\)\s*=>\s*\{\s*tickMemoryNotifier\(\);[\s\S]{0,100}boardManager\.tick\(\)/);
    expect(main).toMatch(/function tickMemoryNotifier\(\): void \{\s*try \{\s*memoryNotifier\.tick\(\);/);
  });

  it("bildirim Görev Panosu'nun yolundan; anahtar ve kök yalnız config'ten", () => {
    expect(main).toMatch(/createMemoryNotifier\(\{[\s\S]{0,500}sendPrompt: \(paneId, text, onSettled\) => agentMonitor\.sendPrompt\(paneId, text, onSettled\)/);
    expect(main.match(/workspaces: \(\) => loadConfig\(\)\.terminalWorkspaces/g)).toHaveLength(2);
  });

  it("dört IPC yalnız ana pencereden ve yalnız kimliklerle", () => {
    for (const channel of ["memory:read", "memory:write", "memory:reveal", "memory:renotify"]) {
      expect(main, channel).toMatch(new RegExp(`"${channel}",[\\s\\S]{0,200}memoryFromMain\\(event\\.sender\\)`));
    }
    expect(main).toMatch(/function memoryFromMain\(sender: unknown\): boolean \{\s*return !!mainWindow && !mainWindow\.isDestroyed\(\) && sender === mainWindow\.webContents;/);
    expect(preload).toContain('ipcRenderer.invoke("memory:read", workspaceId, paneId)');
    expect(preload).toContain('ipcRenderer.invoke("memory:write", workspaceId, paneId, content, stamp)');
    expect(preload).toContain('ipcRenderer.invoke("memory:reveal", workspaceId, paneId)');
    expect(preload).toContain('ipcRenderer.invoke("memory:renotify", workspaceId, paneId)');
    expect(types).toMatch(/memoryRead: \(workspaceId: string, paneId: string\) => Promise<MemoryReadResult>;/);
  });
});

describe("Bellek — veri güvenliği kilitleri (§1, §2, §6)", () => {
  it("bellek dosyası hiçbir yolda silinmiyor; her yazma 'wx'", () => {
    expect(files).not.toMatch(/rmSync|rmdirSync|truncateSync|appendFileSync/);
    expect(files.match(/unlinkSync\(/g)).toHaveLength(2);
    expect(files).not.toMatch(/unlinkSync\((?!temp\))/);
    expect(files.match(/writeFileSync\(/g)?.length).toBe(files.match(/flag: "wx"/g)?.length);
    expect(files).toMatch(/memoryStamp\(readFileSync\(file\)\) !== expectedStamp[\s\S]{0,200}renameSync\(temp, file\)/);
  });

  it("günlükte yalnız sonuç, deneme, bayt", () => {
    for (const call of notifier.match(/log\(\{[^}]*\}\)/g) ?? []) expect(call).toMatch(/^log\(\{ sonuc: [^,]+, deneme: [^}]+ \}\)$/);
    expect(service).toMatch(/"bellek\.kaydet"/);
    expect(service).not.toMatch(/log\([^)]*(content|rel|root|key)/);
  });

  it("yeni dosyalarda görünmez ya da bidi karakter yok", () => {
    const invisible = new RegExp("[" + [0x200b, 0x200f, 0x202a, 0x202e, 0x2066, 0x2069].map((n, i) => (i % 2 ? "-" : "") + String.fromCharCode(n)).join("") + String.fromCharCode(0x2028, 0x2029, 0xfeff) + "]");
    for (const [name, src] of Object.entries({ files, notifier, service, logic: read("app-electron", "shared", "memoryLogic.ts"), notice: read("app-electron", "shared", "memoryNotice.ts") })) {
      expect(invisible.test(src), name).toBe(false);
    }
  });
});
```

- [ ] **Step 3: Kırmızıyı gör**

Run: `npx vitest run tests/memoryService.test.ts tests/memoryIpcWiring.test.ts`
Expected: FAIL — `memoryService` içe aktarılamıyor; kilit testi `memoryService.ts` dosyasını bulamıyor (ENOENT).

- [ ] **Step 4: Uygulama** — `app-electron/main/memoryService.ts`

```ts
// Bellek penceresinin ana süreç tarafı (spec 2026-10-18 ajan-bellegi §4, §6).
// Renderer yalnız (alan kimliği, bölme kimliği) yollar; anahtar config'teki
// ajan kaydından, kök alanın kaydından (memoryTarget). Serbest yol yok;
// günlükte metin, anahtar ya da yol yok.
import { isBoardId } from "../shared/boardCommands";
import {
  MEMORY_MAX_BYTES,
  isMemoryStamp,
  memoryRelPath,
  memoryTarget,
  type MemoryNotice,
  type MemoryReadResult,
  type MemoryTarget,
  type MemoryWriteResult
} from "../shared/memoryLogic";
import type { SavedTerminalWorkspace } from "../shared/types";
import type { LogFields } from "./agentMonitor";
import type { MemoryEnsure, MemoryFileRead, MemoryFileWrite } from "./memoryFiles";

export interface MemoryServiceDeps {
  workspaces(): readonly SavedTerminalWorkspace[];
  ensure(root: string, key: string, name: string): MemoryEnsure;
  read(root: string, key: string): MemoryFileRead;
  write(root: string, key: string, content: string, stamp: string): MemoryFileWrite;
  absPath(root: string, key: string): string | null;
  reveal(file: string): void;
  notice(paneId: string): MemoryNotice;
  renotify(paneId: string): boolean;
  log(tag: string, fields: LogFields): void;
}

export interface MemoryService {
  read(workspaceId: unknown, paneId: unknown): MemoryReadResult;
  write(workspaceId: unknown, paneId: unknown, content: unknown, stamp: unknown): MemoryWriteResult;
  reveal(workspaceId: unknown, paneId: unknown): boolean;
  renotify(workspaceId: unknown, paneId: unknown): boolean;
}

const isPaneId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 100;

function attempt<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function createMemoryService(deps: MemoryServiceDeps): MemoryService {
  function target(workspaceId: unknown, paneId: unknown): (MemoryTarget & { paneId: string }) | null {
    if (!isBoardId(workspaceId) || !isPaneId(paneId)) return null;
    const found = attempt(() => memoryTarget(deps.workspaces(), workspaceId, paneId), null);
    return found ? { ...found, paneId } : null;
  }

  return {
    read(workspaceId, paneId) {
      const t = target(workspaceId, paneId);
      if (!t) return { ok: false, reason: "noMemory" };
      const rel = memoryRelPath(t.key);
      const notice = attempt(() => deps.notice(t.paneId), "none" as MemoryNotice);
      // İlk açılış: yalnız yoksa yaratılır (sapma 12); sonuç okuma adımında görünür.
      attempt(() => deps.ensure(t.root, t.key, t.name), "failed" as MemoryEnsure);
      const file = attempt(() => deps.read(t.root, t.key), { ok: false, reason: "readFailed" } as MemoryFileRead);
      if (file.ok) return { ok: true, rel, content: file.content, stamp: file.stamp, notice };
      return { ok: false, reason: file.reason === "missing" ? "readFailed" : file.reason, rel, notice };
    },
    write(workspaceId, paneId, content, stamp) {
      if (typeof content !== "string" || !isMemoryStamp(stamp)) return { ok: false, reason: "invalid" };
      const t = target(workspaceId, paneId);
      if (!t) return { ok: false, reason: "noMemory" };
      // UTF-16 birimi ≤ UTF-8 baytı: bu kadar uzunsa kesin sınır dışı.
      if (content.length > MEMORY_MAX_BYTES) return { ok: false, reason: "tooLarge" };
      const res = attempt(() => deps.write(t.root, t.key, content, stamp), { ok: false, reason: "writeFailed" } as MemoryFileWrite);
      const fields: LogFields = res.ok ? { sonuc: "tamam", bayt: res.bytes } : { sonuc: res.reason, bayt: 0 };
      attempt(() => deps.log("bellek.kaydet", fields), undefined);
      return res.ok ? { ok: true, stamp: res.stamp } : { ok: false, reason: res.reason };
    },
    reveal(workspaceId, paneId) {
      const t = target(workspaceId, paneId);
      const file = t ? attempt(() => deps.absPath(t.root, t.key), null) : null;
      if (!file) return false;
      return attempt(() => {
        deps.reveal(file);
        return true;
      }, false);
    },
    renotify(workspaceId, paneId) {
      const t = target(workspaceId, paneId);
      return t ? attempt(() => deps.renotify(t.paneId), false) : false;
    }
  };
}
```

`app-electron/main/index.ts` — içe aktarmalar (`import { removeBrowserScreenshot, writeBrowserScreenshot } from "./browserFiles";` satırının altına):

```ts
import { ensureMemoryFile, memoryAbsPath, readMemoryFile, writeMemoryFile } from "./memoryFiles";
import { createMemoryNotifier } from "./memoryNotifier";
import { createMemoryService } from "./memoryService";
```

`const browserSender = createBrowserSender({ … });` bloğunun hemen ALTINA (`let boardTimer` satırından önce):

```ts
// Ajan başına kalıcı bellek (spec 2026-10-18 ajan-bellegi). Anahtar ve kök
// YALNIZ config'teki kayıttan (memoryTarget); bildirim Görev Panosu'nun
// yolundan (agentMonitor.sendPrompt), pano turundan ÖNCE (tickMemoryNotifier).
const memoryNotifier = createMemoryNotifier({
  now: () => Date.now(),
  agents: () => agentMonitor.agents(),
  workspaces: () => loadConfig().terminalWorkspaces,
  ensureFile: ensureMemoryFile,
  sendPrompt: (paneId, text, onSettled) => agentMonitor.sendPrompt(paneId, text, onSettled),
  log: (tag, fields) => appLog(tag, fields)
});

const memoryService = createMemoryService({
  workspaces: () => loadConfig().terminalWorkspaces,
  ensure: ensureMemoryFile,
  read: readMemoryFile,
  write: writeMemoryFile,
  absPath: memoryAbsPath,
  reveal: (file) => shell.showItemInFolder(file),
  notice: (paneId) => memoryNotifier.notice(paneId),
  renotify: (paneId) => memoryNotifier.renotify(paneId),
  log: (tag, fields) => appLog(tag, fields)
});

/** Bellek satırı pano turundan ÖNCE (spec §3): ikisi de bekliyorsa bellek gider, pano "busy" alıp sonraki tura kalır. */
function tickMemoryNotifier(): void {
  try {
    memoryNotifier.tick();
  } catch {
    // bellek bildirimi hatası panoyu durdurmaz
  }
}

/** Bellek IPC'si yalnız ana pencereden (spec §6). */
function memoryFromMain(sender: unknown): boolean {
  return !!mainWindow && !mainWindow.isDestroyed() && sender === mainWindow.webContents;
}
```

`queueBoardTick` içinde `boardTickQueued = false;` satırının ALTINA:

```ts
    tickMemoryNotifier();
```

Pano zamanlayıcısı (`boardTimer = setInterval(() => {`) gövdesinin İLK satırı olarak (`try {` satırından önce):

```ts
      tickMemoryNotifier();
```

`ipcMain.handle("browser:send", …);` bloğunun ALTINA (pano zamanlayıcısından önce):

```ts
  // Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4, §6): yalnız ana pencereden;
  // renderer yalnız (alan, bölme) kimliklerini yollar.
  ipcMain.handle("memory:read", (event, workspaceId: unknown, paneId: unknown) =>
    memoryFromMain(event.sender) ? memoryService.read(workspaceId, paneId) : { ok: false, reason: "invalid" }
  );
  ipcMain.handle("memory:write", (event, workspaceId: unknown, paneId: unknown, content: unknown, stamp: unknown) =>
    memoryFromMain(event.sender) ? memoryService.write(workspaceId, paneId, content, stamp) : { ok: false, reason: "invalid" }
  );
  ipcMain.handle("memory:reveal", (event, workspaceId: unknown, paneId: unknown) =>
    memoryFromMain(event.sender) ? memoryService.reveal(workspaceId, paneId) : false
  );
  ipcMain.handle("memory:renotify", (event, workspaceId: unknown, paneId: unknown) =>
    memoryFromMain(event.sender) ? memoryService.renotify(workspaceId, paneId) : false
  );
```

(`memoryFromMain`, `mainWindow`'u kullanıyor; `mainWindow` modül düzeyinde `let` ve fonksiyon çağrı anında okunuyor. `memoryNotifier` ve `memoryService` modül düzeyi `const`; `queueBoardTick` ve zamanlayıcı `registerIpc` sonrasında çalışıyor.)

`app-electron/preload/index.ts` — tür içe aktarması (diğer `import type` satırlarının yanına):

```ts
import type { MemoryReadResult, MemoryWriteResult } from "../shared/memoryLogic";
```

`onBrowserShortcut: …` girdisinin ALTINA:

```ts
  memoryRead: (workspaceId: string, paneId: string): Promise<MemoryReadResult> => ipcRenderer.invoke("memory:read", workspaceId, paneId),
  memoryWrite: (workspaceId: string, paneId: string, content: string, stamp: string): Promise<MemoryWriteResult> =>
    ipcRenderer.invoke("memory:write", workspaceId, paneId, content, stamp),
  memoryReveal: (workspaceId: string, paneId: string): Promise<boolean> => ipcRenderer.invoke("memory:reveal", workspaceId, paneId),
  memoryRenotify: (workspaceId: string, paneId: string): Promise<boolean> => ipcRenderer.invoke("memory:renotify", workspaceId, paneId),
```

`src/window.d.ts` — içe aktarma (`browserLogic` satırının altına) ve `onBrowserShortcut` satırının altına:

```ts
import type { MemoryReadResult, MemoryWriteResult } from "../app-electron/shared/memoryLogic";
```

```ts
  memoryRead: (workspaceId: string, paneId: string) => Promise<MemoryReadResult>;
  memoryWrite: (workspaceId: string, paneId: string, content: string, stamp: string) => Promise<MemoryWriteResult>;
  memoryReveal: (workspaceId: string, paneId: string) => Promise<boolean>;
  memoryRenotify: (workspaceId: string, paneId: string) => Promise<boolean>;
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/memoryService.test.ts tests/memoryIpcWiring.test.ts tests/boardIpcWiring.test.ts tests/browserIpcWiring.test.ts tests/agentIpcWiring.test.ts`
Expected: PASS (`boardIpcWiring`'in "setInterval … boardManager.tick()" kilidi aralık içinde kalıyor: `tickMemoryNotifier();` ile `boardManager.tick()` arası 100 karakterden kısa).

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/memoryService.ts
git add app-electron/main/index.ts
git add app-electron/preload/index.ts
git add src/window.d.ts
git add tests/memoryService.test.ts
git add tests/memoryIpcWiring.test.ts
git commit -m "Bellek: ana surec baglantisi ve IPC

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Terminal kaydı — yeni ajanda anahtar, `enablePaneMemory`

**Files:**
- Modify: `src/stores/terminalTypes.ts` (`addPane` eylemine `memory?: boolean`; yeni eylem `enablePaneMemory`)
- Modify: `src/stores/terminalReducer.ts` (`addPane`, yeni `enablePaneMemory` dalı)
- Modify: `src/stores/terminalStoreContext.ts` (`NewAgentInput.memory`, `TerminalCommands.enablePaneMemory`)
- Modify: `src/stores/terminalStore.tsx` (`addAgent`, `enablePaneMemory`)
- Modify (yalnız sahte komut satırı): `tests/boardDetailPanel.test.tsx`, `tests/boardScreen.test.tsx`, `tests/browserScreen.test.tsx`, `tests/browserSendMenu.test.tsx`, `tests/browserView.test.tsx`, `tests/changesRevert.test.tsx`, `tests/changesView.test.tsx`, `tests/officeScreen.test.tsx`, `tests/officeView.test.tsx`, `tests/terminalMode.test.tsx`, `tests/terminalPaneView.test.tsx`, `tests/terminalSidebar.test.tsx`
- Test: `tests/memoryReducer.test.ts`

**Interfaces:**
- Consumes: Task 1 (`withMemoryKey`, `isMemoryKey`).
- Produces (Task 6, 7):

```ts
// terminalTypes.ts
| { type: "addPane"; …; memory?: boolean }
| { type: "enablePaneMemory"; paneId: string }
// terminalStoreContext.ts
export interface NewAgentInput { spec: AgentSpec; name: string; color?: TerminalPaneColor; cwd: string; memory?: boolean }
export interface TerminalCommands { /* … */ enablePaneMemory: (paneId: string) => void }
```

- [ ] **Step 1: Kırmızı test** — `tests/memoryReducer.test.ts`

```ts
// Kalıcı bellek: terminal kaydı (spec 2026-10-18 ajan-bellegi §2, §4, §5).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalState, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentSpec } from "../app-electron/shared/agentTypes";

const spec: AgentSpec = { engine: "claude", role: "", roleKind: "custom" };
const empty = (id: string): TerminalWorkspace => ({ id, name: id, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false });
const ready = (): TerminalState => ({ ...initialTerminalState, phase: "ready", workspaces: [empty("w1"), empty("w2")], activeWorkspaceId: "w1" });
const addAgent = (s: TerminalState, workspaceId: string, paneId: string, title: string, memory?: boolean) =>
  terminalReducer(s, { type: "addPane", workspaceId, paneId, kind: "agent", cwd: "C:\\a", agent: spec, title, ...(memory === undefined ? {} : { memory }) });
const agentOf = (s: TerminalState, paneId: string) => s.workspaces.flatMap((w) => w.panes).find((p) => p.id === paneId)?.agent;

describe("addPane — memory (§2)", () => {
  it("işaretliyse anahtar addan türetiliyor ve kayda giriyor; işaretsizse yok", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe", true);
    s = addAgent(s, "w1", "p2", "Mehmet");
    s = addAgent(s, "w1", "p3", "Zeynep", false);
    expect(agentOf(s, "p1")).toEqual({ ...spec, memory: "ayse" });
    expect(agentOf(s, "p2")).toEqual(spec);
    expect(agentOf(s, "p3")).toEqual(spec);
    expect(toSaved(s).workspaces[0].panes[0].agent).toEqual({ ...spec, memory: "ayse" });
  });

  it("iki alanda aynı ad: anahtarlar ayrışıyor (sapma 4)", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe", true);
    s = addAgent(s, "w1", "p2", "Ayşe", true);
    s = addAgent(s, "w2", "p3", "AYŞE", true);
    expect([agentOf(s, "p1")?.memory, agentOf(s, "p2")?.memory, agentOf(s, "p3")?.memory]).toEqual(["ayse", "ayse-2", "ayse-3"]);
  });

  it("kabuk bölmesine bellek eklenmiyor", () => {
    const s = terminalReducer(ready(), { type: "addPane", workspaceId: "w1", paneId: "p1", kind: "cmd", cwd: "C:\\a", memory: true });
    expect(s.workspaces[0].panes[0].agent).toBeUndefined();
  });
});

describe("enablePaneMemory (§4)", () => {
  it("anahtarı addan türetip ekliyor; adı yoksa motor", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe");
    s = terminalReducer(s, { type: "addPane", workspaceId: "w1", paneId: "p2", kind: "agent", cwd: "C:\\a", agent: spec });
    s = terminalReducer(s, { type: "enablePaneMemory", paneId: "p1" });
    s = terminalReducer(s, { type: "enablePaneMemory", paneId: "p2" });
    expect(agentOf(s, "p1")?.memory).toBe("ayse");
    expect(agentOf(s, "p2")?.memory).toBe("claude");
  });

  it("zaten açıksa, kabuksa ya da bölme yoksa aynı durum (anahtar asla değişmiyor)", () => {
    let s = addAgent(ready(), "w1", "p1", "Ayşe", true);
    s = terminalReducer(s, { type: "renamePane", paneId: "p1", title: "Fatma" });
    s = terminalReducer(s, { type: "addPane", workspaceId: "w1", paneId: "k1", kind: "cmd", cwd: "C:\\a" });
    for (const paneId of ["p1", "k1", "yok"]) {
      expect(terminalReducer(s, { type: "enablePaneMemory", paneId }), paneId).toBe(s);
    }
    expect(agentOf(s, "p1")?.memory).toBe("ayse");
  });
});

describe("sağlayıcı bağlantısı", () => {
  it("addAgent memory'yi eyleme, enablePaneMemory eylemi gönderiyor", () => {
    const src = readFileSync(path.join(__dirname, "..", "src", "stores", "terminalStore.tsx"), "utf8");
    expect(src).toMatch(/addAgent: \(input, split\) => \{[\s\S]{0,700}memory: input\.memory === true/);
    expect(src).toContain('enablePaneMemory: (paneId) => dispatch({ type: "enablePaneMemory", paneId }),');
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/memoryReducer.test.ts`
Expected: FAIL — anahtar yok (`memory` undefined); `enablePaneMemory` eylemi tanınmıyor; kaynak kilidi eşleşmiyor.

- [ ] **Step 3: Uygulama**

`src/stores/terminalTypes.ts` — `addPane` eyleminde `color?: TerminalPaneColor;` satırının altına:

```ts
      /** Kalıcı bellek açılsın mı (spec 2026-10-18 ajan-bellegi §4); anahtar indirgeyicide türetiliyor. */
      memory?: boolean;
```

Birliğin sonuna (`setWorkspaceBrowserUrl` satırından sonra, `;` o satırdan bu satıra taşınır):

```ts
  | { type: "setWorkspaceBrowserUrl"; id: string; url: string }
  | { type: "enablePaneMemory"; paneId: string };
```

`src/stores/terminalReducer.ts` — içe aktarma:

```ts
import { isMemoryKey, withMemoryKey } from "../../app-electron/shared/memoryLogic";
```

`case "addPane":` içinde `const title = cleanPaneTitle(action.title);` satırının ALTINA:

```ts
      // Kalıcı bellek (spec 2026-10-18 ajan-bellegi §2): anahtar addan, bütün alanlarda tekil.
      const agent =
        action.kind === "agent" && action.agent
          ? action.memory === true
            ? withMemoryKey(action.agent, title ?? action.agent.engine, state.workspaces)
            : action.agent
          : undefined;
```

ve `pane` nesnesindeki

```ts
        ...(action.kind === "agent" && action.agent ? { agent: action.agent } : {}),
```

satırını şuyla değiştir:

```ts
        ...(agent ? { agent } : {}),
```

`case "setWorkspaceBrowserUrl": { … }` dalından sonra (switch'in kapanışından önce):

```ts
    case "enablePaneMemory": {
      // Belleği etkinleştir (spec 2026-10-18 ajan-bellegi §4): anahtar bir kez
      // türetiliyor; açıksa ya da ad sonradan değiştiyse dokunulmuyor (dosya aynı kalır).
      const found = findPane(state, action.paneId);
      const agent = found?.pane.kind === "agent" ? found.pane.agent : undefined;
      if (!found || !agent || isMemoryKey(agent.memory)) return state;
      const next = withMemoryKey(agent, found.pane.title ?? agent.engine, state.workspaces);
      return replaceWorkspace(state, updatePane(found.workspace, action.paneId, { agent: next }));
    }
```

`src/stores/terminalStoreContext.ts` — `NewAgentInput`'a `cwd: string;` satırının altına:

```ts
  /** Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4); anahtar indirgeyicide. */
  memory?: boolean;
```

`TerminalCommands`'ın sonuna (`setWorkspaceBrowserUrl` satırından sonra):

```ts
  /** Ajanın kalıcı belleğini açar (spec 2026-10-18 ajan-bellegi §4); anahtar addan türetilir. */
  enablePaneMemory: (paneId: string) => void;
```

`src/stores/terminalStore.tsx` — `addAgent` içindeki `dispatch({ … color: input.color })` nesnesine `color: input.color` satırından sonra:

```ts
          color: input.color,
          memory: input.memory === true
```

ve `setWorkspaceBrowserUrl: (id, url) => …,` satırının altına:

```ts
      enablePaneMemory: (paneId) => dispatch({ type: "enablePaneMemory", paneId }),
```

On iki test dosyasındaki `commandsMock` (ya da eşdeğer sahte komut nesnesi) — her birinde `setWorkspaceBrowserUrl: vi.fn()` satırını bul (`git grep -n "setWorkspaceBrowserUrl: vi.fn()" tests`) ve aynı nesneye ekle:

```ts
    setWorkspaceBrowserUrl: vi.fn(),
    enablePaneMemory: vi.fn()
```

(Satırın sonunda virgül yoksa ekle; girinti dosyanınki.)

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/memoryReducer.test.ts tests/terminalReducer.test.ts tests/terminalReducerTree.test.ts tests/browserWorkspaceView.test.ts tests/terminalStore.test.tsx`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz (12 sahte komut dosyası dahil; biri unutulduysa "Property 'enablePaneMemory' is missing" hatası verir, onu da ekle).

- [ ] **Step 5: Commit**

```bash
git add src/stores/terminalTypes.ts
git add src/stores/terminalReducer.ts
git add src/stores/terminalStoreContext.ts
git add src/stores/terminalStore.tsx
git add tests/memoryReducer.test.ts
git add tests/boardDetailPanel.test.tsx
git add tests/boardScreen.test.tsx
git add tests/browserScreen.test.tsx
git add tests/browserSendMenu.test.tsx
git add tests/browserView.test.tsx
git add tests/changesRevert.test.tsx
git add tests/changesView.test.tsx
git add tests/officeScreen.test.tsx
git add tests/officeView.test.tsx
git add tests/terminalMode.test.tsx
git add tests/terminalPaneView.test.tsx
git add tests/terminalSidebar.test.tsx
git commit -m "Bellek: ajan kaydinda anahtar ve etkinlestirme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: "Ajan ekle" penceresinde Kalıcı bellek kutusu

**Files:**
- Modify: `src/agents/AddAgentDialog.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/addAgentDialog.test.tsx`, `tests/terminalMode.test.tsx`

**Interfaces:**
- Consumes: Task 5 (`NewAgentInput.memory`, `commands.addAgent(input, split)`).
- Produces: `onAdd` çıktısında yalnız işaretliyse `memory: true` (işaretsizse alan hiç yok; eski testler aynen geçer). i18n: `agents.memoryLabel`, `agents.memoryHint`, `agents.memoryNoFolder`.

- [ ] **Step 1: Kırmızı test** — `tests/addAgentDialog.test.tsx` (dosyanın sonundaki `describe("AddAgentDialog", …)` bloğunun içine, son `it`'ten sonra)

```tsx
  it("Kalıcı bellek varsayılan kapalı ve açıklamalı; işaretlenince onAdd memory: true taşıyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    const box = screen.getByRole("checkbox", { name: "Kalıcı bellek" }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(screen.getByText("Ajan her açılışta kendi bellek dosyasını okur ve önemli şeyleri oraya yazar.")).toBeTruthy();
    fireEvent.click(box);
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Ajan 2", cwd: "C:\\p", memory: true }));
  });

  it("işaretlenmezse çıktıda memory alanı hiç yok", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(addButton());
    expect("memory" in onAdd.mock.calls[0][0]).toBe(false);
  });

  it("klasör yoksa kutu kapalı ve sebebi yazılı", async () => {
    render(
      <LanguageProvider language="tr">
        <AddAgentDialog open defaultCwd="" defaultName="Ajan 2" engines={ENGINES} onAdd={vi.fn()} onCancel={vi.fn()} />
      </LanguageProvider>
    );
    await flush();
    const box = screen.getByRole("checkbox", { name: "Kalıcı bellek" }) as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(screen.getByText("Bellek için ajanın bir klasörü olmalı.")).toBeTruthy();
  });

  it("yeniden açılınca kutu yine kapalı", async () => {
    const onAdd = vi.fn();
    const view = (open: boolean) => (
      <LanguageProvider language="tr">
        <AddAgentDialog open={open} defaultCwd={"C:\\p"} defaultName="Ajan 2" engines={ENGINES} onAdd={onAdd} onCancel={vi.fn()} />
      </LanguageProvider>
    );
    const { rerender } = render(view(true));
    await flush();
    fireEvent.click(screen.getByRole("checkbox", { name: "Kalıcı bellek" }));
    rerender(view(false));
    rerender(view(true));
    await flush();
    expect((screen.getByRole("checkbox", { name: "Kalıcı bellek" }) as HTMLInputElement).checked).toBe(false);
  });
```

`tests/terminalMode.test.tsx` — "+ Ajan pencereden addAgent'a bölme yönüyle gidiyor" testinin altına:

```tsx
  it("+ Ajan: Kalıcı bellek işaretliyse addAgent'a memory: true gidiyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 1)], activeWorkspaceId: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Ajan" }));
    await flush();
    fireEvent.click(screen.getByRole("checkbox", { name: "Kalıcı bellek" }));
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(commands.addAgent).toHaveBeenCalledWith(expect.objectContaining({ memory: true }), expect.anything());
  });
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/addAgentDialog.test.tsx tests/terminalMode.test.tsx`
Expected: FAIL — `Unable to find an accessible element with the role "checkbox" and name "Kalıcı bellek"`.

- [ ] **Step 3: Uygulama**

`src/i18n/tr.ts` — dosyanın sonundaki `"browser.fail.notSubmitted": …` satırına virgül ekle ve altına:

```ts
  // Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4)
  "agents.memoryLabel": "Kalıcı bellek",
  "agents.memoryHint": "Ajan her açılışta kendi bellek dosyasını okur ve önemli şeyleri oraya yazar.",
  "agents.memoryNoFolder": "Bellek için ajanın bir klasörü olmalı."
```

`src/i18n/en.ts` — aynı yere:

```ts
  "agents.memoryLabel": "Persistent memory",
  "agents.memoryHint": "On every start the agent reads its own memory file and writes important things there.",
  "agents.memoryNoFolder": "Memory needs a folder for the agent."
```

`src/agents/AddAgentDialog.tsx`:

İçe aktarma satırını genişlet:

```ts
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
```

Durumlar (`const [color, setColor] = …` satırının altına):

```ts
  // Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4): varsayılan kapalı.
  const [memory, setMemory] = useState(false);
  const memoryHintId = useId();
```

Açılış efektinde `setColor("gray");` satırının altına:

```ts
    setMemory(false);
```

`submit` içindeki son satırı

```ts
    onAdd({ spec, name: name.trim().slice(0, PANE_TITLE_MAX), color, cwd });
```

şuyla değiştir:

```ts
    // Yalnız işaretliyse alan var: işaretsiz ekleme eskisiyle bayt bayt aynı.
    onAdd({ spec, name: name.trim().slice(0, PANE_TITLE_MAX), color, cwd, ...(memory && cwd ? { memory: true } : {}) });
```

Klasör bloğunun (`{t("agents.folderLabel")}` içeren `<div className="flex flex-col gap-1.5">…</div>`) hemen ALTINA, renk bloğundan önce:

```tsx
        {/* Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4, §7): klasör yoksa kapalı ve sebebi yazılı. */}
        <label className={`flex items-start gap-2 text-xs ${cwd ? "text-slate-200" : "text-slate-500"}`}>
          <input
            type="checkbox"
            checked={memory && cwd !== ""}
            disabled={!cwd}
            aria-label={t("agents.memoryLabel")}
            aria-describedby={memoryHintId}
            onChange={(e) => setMemory(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            {t("agents.memoryLabel")}
            <span id={memoryHintId} className="text-2xs text-slate-500">
              {cwd ? t("agents.memoryHint") : t("agents.memoryNoFolder")}
            </span>
          </span>
        </label>
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/addAgentDialog.test.tsx tests/terminalMode.test.tsx tests/i18n.test.ts`
Expected: PASS (eski "varsayılanlar … rolsüz axet-code ajanı gönderiyor" testi `memory` alanı olmadığı için aynen geçer).

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 5: Commit**

```bash
git add src/agents/AddAgentDialog.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/addAgentDialog.test.tsx
git add tests/terminalMode.test.tsx
git commit -m "Bellek: Ajan ekle penceresinde Kalici bellek secenegi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Bellek penceresi ve ajan kartındaki düğme

**Files:**
- Create: `src/agents/MemoryDialog.tsx`
- Modify: `src/agents/TeamStrip.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/memoryDialog.test.tsx`, `tests/terminalMode.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`MemoryFailure`, `MemoryNotice`, `MemoryWriteResult`); Task 4 (`window.api.memoryRead/memoryWrite/memoryReveal/memoryRenotify`); Task 5 (`commands.enablePaneMemory`); `Modal`, `ModalCancelButton` (`src/ui/Modal.tsx`), `Button` (`src/ui/Button.tsx`), `Textarea` (`src/ui/Field.tsx`), `TOOL_BUTTON`, `GHOST_ICON_BUTTON` (`src/ui/buttons.ts`), `agentName` (`src/agents/agentLabels.ts`).
- Produces:

```tsx
export default function MemoryDialog(props: { workspaceId: string; paneId: string; name: string; onClose: () => void }): JSX.Element;
// TeamStrip ajan kartı: data-agent-memory="on" | "off" düğmesi, aria-label "Belleği aç" | "Belleği etkinleştir"
```

- [ ] **Step 1: Kırmızı test** — `tests/memoryDialog.test.tsx`

```tsx
// @vitest-environment jsdom
// Bellek penceresi (spec 2026-10-18 ajan-bellegi §4, §5, §7).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import MemoryDialog from "../src/agents/MemoryDialog";

const STAMP = "a".repeat(64);
const REL = ".ntt-studio/bellek/ayse.md";
let prevApi: unknown;
let api: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    memoryRead: vi.fn(async () => ({ ok: true, rel: REL, content: "# Ayşe\n", stamp: STAMP, notice: "sent" })),
    memoryWrite: vi.fn(async () => ({ ok: true, stamp: "b".repeat(64) })),
    memoryReveal: vi.fn(async () => true),
    memoryRenotify: vi.fn(async () => true)
  };
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function renderDialog() {
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <MemoryDialog workspaceId="w1" paneId="p1" name="Ayşe" onClose={onClose} />
    </LanguageProvider>
  );
  return { onClose };
}

const box = () => screen.getByRole("textbox") as HTMLTextAreaElement;
const saveButton = () => screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement;

describe("MemoryDialog", () => {
  it("başlık, yol ve içerik; ana sürece yalnız kimlikler gidiyor", async () => {
    renderDialog();
    await flush();
    expect(api.memoryRead).toHaveBeenCalledWith("w1", "p1");
    expect(screen.getByRole("dialog", { name: "Ayşe — kalıcı bellek" })).toBeTruthy();
    expect(screen.getByText(REL)).toBeTruthy();
    expect(box().value).toBe("# Ayşe\n");
    expect(screen.getAllByRole("button", { name: "Kapat" }).length).toBeGreaterThan(0);
  });

  it("Kaydet okunduğu andaki özetle yazıyor ve kapanıyor", async () => {
    const { onClose } = renderDialog();
    await flush();
    fireEvent.change(box(), { target: { value: "# Ayşe\n- yeni\n" } });
    fireEvent.click(saveButton());
    await flush();
    expect(api.memoryWrite).toHaveBeenCalledWith("w1", "p1", "# Ayşe\n- yeni\n", STAMP);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dosya bu arada değiştiyse: uyarı, metin yerinde, Kaydet kapalı; Yeniden yükle diskteki içeriği ve yeni özeti getiriyor", async () => {
    const { onClose } = renderDialog();
    await flush();
    api.memoryWrite.mockResolvedValueOnce({ ok: false, reason: "changed" });
    fireEvent.change(box(), { target: { value: "benim metnim" } });
    fireEvent.click(saveButton());
    await flush();
    expect(screen.getByText(/Dosya bu arada değişti/)).toBeTruthy();
    expect(box().value).toBe("benim metnim");
    expect(saveButton().disabled).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "# Ayşe\n- ajan yazdı\n", stamp: "c".repeat(64), notice: "sent" });
    fireEvent.click(screen.getByRole("button", { name: "Yeniden yükle" }));
    await flush();
    expect(box().value).toBe("# Ayşe\n- ajan yazdı\n");
    expect(screen.queryByText(/Dosya bu arada değişti/)).toBeNull();
    fireEvent.change(box(), { target: { value: "x" } });
    fireEvent.click(saveButton());
    await flush();
    expect(api.memoryWrite).toHaveBeenLastCalledWith("w1", "p1", "x", "c".repeat(64));
  });

  it("yazılamadı: hata satırı, metin pencerede, pencere açık", async () => {
    const { onClose } = renderDialog();
    await flush();
    api.memoryWrite.mockResolvedValueOnce({ ok: false, reason: "writeFailed" });
    fireEvent.change(box(), { target: { value: "metnim" } });
    fireEvent.click(saveButton());
    await flush();
    expect(screen.getByText("Kaydedilemedi; metnin pencerede duruyor.")).toBeTruthy();
    expect(box().value).toBe("metnim");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("istek fırlatırsa da metin kaybolmuyor", async () => {
    renderDialog();
    await flush();
    api.memoryWrite.mockRejectedValueOnce(new Error("ipc"));
    fireEvent.change(box(), { target: { value: "metnim" } });
    fireEvent.click(saveButton());
    await flush();
    expect(box().value).toBe("metnim");
    expect(saveButton().disabled).toBe(false);
  });

  it("dosya çok büyük: düzenleme yok, Kaydet kapalı, Klasörde göster", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: false, reason: "tooLarge", rel: REL, notice: "sent" });
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Dosya çok büyük (256 KB üstü); bir düzenleyicide aç.")).toBeTruthy();
    expect(saveButton().disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Klasörde göster" }));
    expect(api.memoryReveal).toHaveBeenCalledWith("w1", "p1");
  });

  it("UTF-8 değil: aynı yol, düzenleme yok", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: false, reason: "encoding", rel: REL, notice: "sent" });
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Klasörde göster" })).toBeTruthy();
  });

  it("okunamadı ya da istek fırlattı: hata, metin alanı yok", async () => {
    api.memoryRead.mockRejectedValueOnce(new Error("ipc"));
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Bellek dosyası okunamadı; dosyaya dokunulmadı.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Klasörde göster" })).toBeNull();
  });

  it("henüz kayıtlı değil: Yeniden yükle ile tekrar okunuyor", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: false, reason: "noMemory" });
    renderDialog();
    await flush();
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden yükle" }));
    await flush();
    expect(api.memoryRead).toHaveBeenCalledTimes(2);
    expect(box().value).toBe("# Ayşe\n");
  });

  it("bildirilemedi notu ve Yeniden bildir", async () => {
    api.memoryRead.mockResolvedValueOnce({ ok: true, rel: REL, content: "", stamp: STAMP, notice: "failed" });
    renderDialog();
    await flush();
    expect(screen.getByText(/Bellek ajana bildirilemedi/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden bildir" }));
    await flush();
    expect(api.memoryRenotify).toHaveBeenCalledWith("w1", "p1");
    expect(screen.getByText("Ajan bir sonraki boşta anında yeniden bildirilecek.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yeniden bildir" })).toBeNull();
  });

  it("bildirildiyse not yok", async () => {
    renderDialog();
    await flush();
    expect(screen.queryByText(/Bellek ajana bildirilemedi/)).toBeNull();
  });

  it("kaydedilmemiş değişiklikle Escape hemen kapatmıyor", async () => {
    const { onClose } = renderDialog();
    await flush();
    fireEvent.change(box(), { target: { value: "değişti" } });
    fireEvent.keyDown(box(), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("metin alanında Ctrl+V ve sağ tık elle yakalanmıyor", async () => {
    renderDialog();
    await flush();
    const paste = new Event("paste", { bubbles: true, cancelable: true });
    box().dispatchEvent(paste);
    const menu = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    box().dispatchEvent(menu);
    expect(paste.defaultPrevented).toBe(false);
    expect(menu.defaultPrevented).toBe(false);
  });
});
```

`tests/terminalMode.test.tsx` — "motoru kurulu olmayan ajan 'Kurulu değil'…" testinin altına:

```tsx
  it("bellek kapalı ajan kartında 'Belleği etkinleştir' komutu çağırıyor, pencere açmıyor", () => {
    const { commands } = setup({ workspaces: [agentWs([agentPane("x")])], activeWorkspaceId: "a" });
    expect(card("x").parentElement!.querySelector("[data-agent-memory]")?.getAttribute("data-agent-memory")).toBe("off");
    fireEvent.click(within(strip()).getByRole("button", { name: "Belleği etkinleştir" }));
    expect(commands.enablePaneMemory).toHaveBeenCalledWith("x");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(commands.revealPane).not.toHaveBeenCalled();
  });

  it("bellek açık ajan kartında 'Belleği aç' bellek penceresini açıyor", async () => {
    const memoryRead = vi.fn(async () => ({ ok: true, rel: ".ntt-studio/bellek/ayse.md", content: "# Ayşe", stamp: "a".repeat(64), notice: "sent" }));
    (window as unknown as { api: Record<string, unknown> }).api.memoryRead = memoryRead;
    setup({
      workspaces: [agentWs([agentPane("x", { agent: { engine: "claude", role: "Test", roleKind: "preset", memory: "ayse" } })])],
      activeWorkspaceId: "a"
    });
    fireEvent.click(within(strip()).getByRole("button", { name: "Belleği aç" }));
    await flush();
    expect(memoryRead).toHaveBeenCalledWith("a", "x");
    expect(screen.getByRole("dialog", { name: "Ayşe — kalıcı bellek" })).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("# Ayşe");
  });
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/memoryDialog.test.tsx tests/terminalMode.test.tsx`
Expected: FAIL — `Failed to resolve import "../src/agents/MemoryDialog"`; kart testlerinde "Belleği etkinleştir" adlı düğme yok.

- [ ] **Step 3: Uygulama**

`src/i18n/tr.ts` — Task 6'nın `"agents.memoryNoFolder"` satırına virgül ekle ve altına:

```ts
  "memory.open": "Belleği aç",
  "memory.enable": "Belleği etkinleştir",
  "memory.title": "{name} — kalıcı bellek",
  "memory.description": "Bu dosyayı ajan ve sen birlikte tutarsınız; kalıcı kararlar, öğrenilenler, yarım işler.",
  "memory.saving": "Kaydediliyor…",
  "memory.reload": "Yeniden yükle",
  "memory.reveal": "Klasörde göster",
  "memory.noticeFailed": "Bellek ajana bildirilemedi (ajan sürekli meşguldü ya da dosya yaratılamadı).",
  "memory.renotify": "Yeniden bildir",
  "memory.renotified": "Ajan bir sonraki boşta anında yeniden bildirilecek.",
  "memory.secretNote": "Belleğe şifre ya da token yazma: dosya alanın klasöründe durur, Git ile taşınabilir.",
  "memory.fail.noMemory": "Bu ajanın belleği henüz kayıtlı değil; birazdan yeniden yükle.",
  "memory.fail.noRoot": "Alanın kök klasörü ya da ajanın klasörü bulunamadı.",
  "memory.fail.unsafe": "Bellek dosyasının yolu alanın klasörü dışını gösteriyor; açılmadı.",
  "memory.fail.tooLarge": "Dosya çok büyük (256 KB üstü); bir düzenleyicide aç.",
  "memory.fail.encoding": "Dosya UTF-8 değil; bozulmasın diye burada açılmadı, bir düzenleyicide aç.",
  "memory.fail.readFailed": "Bellek dosyası okunamadı; dosyaya dokunulmadı.",
  "memory.fail.changed": "Dosya bu arada değişti (ajan yazmış olabilir); üzerine yazılmadı. Senin metnin burada duruyor; gerekiyorsa kopyala, sonra Yeniden yükle (yüklenince bu metin gider).",
  "memory.fail.writeFailed": "Kaydedilemedi; metnin pencerede duruyor."
```

`src/i18n/en.ts` — aynı yere:

```ts
  "memory.open": "Open memory",
  "memory.enable": "Enable memory",
  "memory.title": "{name} — persistent memory",
  "memory.description": "You and the agent keep this file together: lasting decisions, lessons learned, unfinished work.",
  "memory.saving": "Saving…",
  "memory.reload": "Reload",
  "memory.reveal": "Show in folder",
  "memory.noticeFailed": "The agent could not be told about its memory (it stayed busy, or the file could not be created).",
  "memory.renotify": "Notify again",
  "memory.renotified": "The agent will be told again the next time it is idle.",
  "memory.secretNote": "Do not put passwords or tokens in memory: the file lives in the workspace folder and can travel with Git.",
  "memory.fail.noMemory": "This agent's memory is not saved yet; reload in a moment.",
  "memory.fail.noRoot": "Neither the workspace root nor the agent's folder was found.",
  "memory.fail.unsafe": "The memory file's path points outside the workspace folder; not opened.",
  "memory.fail.tooLarge": "The file is too large (over 256 KB); open it in an editor.",
  "memory.fail.encoding": "The file is not UTF-8; it was not opened here so it does not get damaged. Open it in an editor.",
  "memory.fail.readFailed": "The memory file could not be read; it was not touched.",
  "memory.fail.changed": "The file changed in the meantime (the agent may have written to it); it was not overwritten. Your text is still here; copy it if you need it, then Reload (reloading discards this text).",
  "memory.fail.writeFailed": "Could not save; your text is still in the window."
```

`src/agents/MemoryDialog.tsx`

```tsx
import { useEffect, useState } from "react";
import { BookOpen, FolderOpen, Loader2, RotateCw } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { MemoryFailure, MemoryNotice, MemoryWriteResult } from "../../app-electron/shared/memoryLogic";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { TOOL_BUTTON } from "../ui/buttons";

// Bellek penceresi (spec 2026-10-18 ajan-bellegi §4, §5, §7); "Sohbet
// talimatları" penceresinin kalıbı. Ana sürece yalnız (alan, bölme) kimliği
// gidiyor. Kaydetme iyimser eşzamanlılıkla: ana süreç diskteki dosyayı
// okunduğu andaki özetle karşılaştırıyor; ajan bu arada yazdıysa hiçbir şey
// ezilmiyor ve kullanıcının metni pencerede kalıyor (yalnız açıkça
// "Yeniden yükle"ye basılınca gidiyor).

const FAIL_KEY: Record<MemoryFailure, TranslationKey> = {
  invalid: "memory.fail.writeFailed",
  noMemory: "memory.fail.noMemory",
  noRoot: "memory.fail.noRoot",
  unsafe: "memory.fail.unsafe",
  tooLarge: "memory.fail.tooLarge",
  encoding: "memory.fail.encoding",
  readFailed: "memory.fail.readFailed",
  changed: "memory.fail.changed",
  writeFailed: "memory.fail.writeFailed"
};

type Loaded =
  | { kind: "loading" }
  | { kind: "ready"; rel: string; stamp: string; notice: MemoryNotice }
  | { kind: "blocked"; reason: MemoryFailure; rel?: string; notice?: MemoryNotice };

interface Props {
  workspaceId: string;
  paneId: string;
  name: string;
  onClose: () => void;
}

export default function MemoryDialog({ workspaceId, paneId, name, onClose }: Props) {
  const t = useT();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [text, setText] = useState("");
  const [initial, setInitial] = useState("");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<MemoryFailure | null>(null);
  const [renotified, setRenotified] = useState(false);
  const [loadSeq, setLoadSeq] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoaded({ kind: "loading" });
    window.api.memoryRead(workspaceId, paneId).then(
      (res) => {
        if (!alive) return;
        if (res.ok) {
          setText(res.content);
          setInitial(res.content);
          setFailure(null);
          setLoaded({ kind: "ready", rel: res.rel, stamp: res.stamp, notice: res.notice });
        } else {
          setLoaded({ kind: "blocked", reason: res.reason, rel: res.rel, notice: res.notice });
        }
      },
      () => {
        if (alive) setLoaded({ kind: "blocked", reason: "readFailed" });
      }
    );
    return () => {
      alive = false;
    };
  }, [workspaceId, paneId, loadSeq]);

  const editable = loaded.kind === "ready";
  const conflict = failure === "changed";
  const rel = loaded.kind === "loading" ? undefined : loaded.rel;
  const notice = loaded.kind === "loading" ? undefined : loaded.notice;

  const reload = () => {
    setFailure(null);
    setLoadSeq((n) => n + 1);
  };

  const save = async () => {
    if (loaded.kind !== "ready" || conflict) return;
    setSaving(true);
    setFailure(null);
    let res: MemoryWriteResult;
    try {
      res = await window.api.memoryWrite(workspaceId, paneId, text, loaded.stamp);
    } catch {
      res = { ok: false, reason: "writeFailed" };
    } finally {
      setSaving(false);
    }
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    onClose();
  };

  const renotify = async () => {
    const ok = await window.api.memoryRenotify(workspaceId, paneId).catch(() => false);
    setRenotified(ok);
  };

  const reveal = () => {
    void window.api.memoryReveal(workspaceId, paneId).catch(() => false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      dirty={editable && text !== initial}
      closeDisabled={saving}
      title={t("memory.title", { name })}
      subtitle={t("memory.description")}
      icon={<BookOpen size={18} />}
      size="lg"
      footer={
        <>
          <ModalCancelButton label={t("common.close")} />
          <Button variant="primary" onClick={() => void save()} disabled={!editable || saving || conflict}>
            {saving ? t("memory.saving") : t("common.save")}
          </Button>
        </>
      }
    >
      {rel && (
        <p className="mb-3 truncate font-mono text-2xs text-slate-500" title={rel}>
          {rel}
        </p>
      )}

      {loaded.kind === "loading" ? (
        <div className="flex h-40 items-center justify-center text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : loaded.kind === "blocked" ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3 text-xs leading-relaxed text-[var(--status-danger-text)]"
        >
          <span>{t(FAIL_KEY[loaded.reason])}</span>
          {(loaded.reason === "tooLarge" || loaded.reason === "encoding") && (
            <button type="button" onClick={reveal} className={TOOL_BUTTON}>
              <FolderOpen size={12} />
              {t("memory.reveal")}
            </button>
          )}
          {loaded.reason === "noMemory" && (
            <button type="button" onClick={reload} className={TOOL_BUTTON}>
              <RotateCw size={12} />
              {t("memory.reload")}
            </button>
          )}
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          spellCheck={false}
          aria-label={t("memory.title", { name })}
          className="chat-scroll min-h-[280px] resize-y font-mono"
        />
      )}

      {conflict && (
        <div role="alert" className="mt-3 flex items-start gap-2 text-xs text-[var(--status-warning-text)]">
          <span className="min-w-0 flex-1">{t("memory.fail.changed")}</span>
          <button type="button" onClick={reload} className={TOOL_BUTTON}>
            <RotateCw size={12} />
            {t("memory.reload")}
          </button>
        </div>
      )}
      {failure && !conflict && (
        <p role="alert" className="mt-2 text-xs text-[var(--status-danger-text)]">
          {t(FAIL_KEY[failure])}
        </p>
      )}

      {notice === "failed" && (
        <div className="mt-3 flex items-center gap-2 text-2xs text-[var(--status-warning-text)]">
          <span className="min-w-0 flex-1">{renotified ? t("memory.renotified") : t("memory.noticeFailed")}</span>
          {!renotified && (
            <button type="button" onClick={() => void renotify()} className={TOOL_BUTTON}>
              {t("memory.renotify")}
            </button>
          )}
        </div>
      )}

      <p className="mt-3 text-2xs text-slate-500">{t("memory.secretNote")}</p>
    </Modal>
  );
}
```

`src/agents/TeamStrip.tsx`:

İçe aktarmalar:

```ts
import { useState } from "react";
import { BookOpen, BookPlus, Plus, RotateCw } from "lucide-react";
import MemoryDialog from "./MemoryDialog";
```

(`import { Plus, RotateCw } from "lucide-react";` satırı yukarıdakiyle değişir.)

`TeamStrip` gövdesinde `const agents = agentPanes(workspace);` satırının altına:

```ts
  // Kalıcı bellek penceresi (spec 2026-10-18 ajan-bellegi §4): yalnız belleği açık ajanda.
  const [memoryPaneId, setMemoryPaneId] = useState<string | null>(null);
  const memoryPane = agents.find((p) => p.id === memoryPaneId && p.agent?.memory);
```

`<AgentCard … />` çağrısına prop:

```tsx
            onOpenMemory={() => setMemoryPaneId(pane.id)}
```

Kök `<div>`'in kapanışından hemen önce (`+ Ajan` düğmesinden sonra):

```tsx
      {memoryPane && (
        <MemoryDialog
          workspaceId={workspace.id}
          paneId={memoryPane.id}
          name={agentName(memoryPane, t)}
          onClose={() => setMemoryPaneId(null)}
        />
      )}
```

`AgentCard` imzasına `onOpenMemory: () => void;` (hem parametre listesine hem tür nesnesine) ekle. Kart düğmesinin sınıfındaki

```ts
        className={`flex min-h-12 w-52 flex-col justify-center gap-1 rounded-md border bg-card py-1 pl-3 pr-2 text-left transition-colors ${
          selected ? "border-accent-500/60" : "border-line hover:border-slate-500"
        } ${view.restartable ? "pr-8" : ""}`}
```

şuyla değişir (bellek düğmesi her kartta; yer açılıyor):

```ts
        className={`flex min-h-12 w-52 flex-col justify-center gap-1 rounded-md border bg-card py-1 pl-3 pr-8 text-left transition-colors ${
          selected ? "border-accent-500/60" : "border-line hover:border-slate-500"
        }`}
```

`{view.restartable && ( … )}` bloğundan sonra, `</div>`'den önce:

```tsx
      {/* Kalıcı bellek (spec 2026-10-18 ajan-bellegi §4; sapma 1, 10): açıksa pencere,
          kapalıysa anahtar türetilip kaydediliyor (pencere açılmıyor). */}
      <button
        type="button"
        data-agent-memory={pane.agent?.memory ? "on" : "off"}
        onClick={() => (pane.agent?.memory ? onOpenMemory() : commands.enablePaneMemory(pane.id))}
        title={t(pane.agent?.memory ? "memory.open" : "memory.enable")}
        aria-label={t(pane.agent?.memory ? "memory.open" : "memory.enable")}
        className={`${GHOST_ICON_BUTTON} absolute bottom-1 right-1`}
      >
        {pane.agent?.memory ? <BookOpen size={12} /> : <BookPlus size={12} />}
      </button>
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/memoryDialog.test.tsx tests/terminalMode.test.tsx tests/i18n.test.ts tests/boardScreen.test.tsx tests/officeScreen.test.tsx tests/browserScreen.test.tsx tests/agentsShell.test.tsx`
Expected: PASS. (Pencere `Modal`'ın `aria-labelledby` başlığıyla adlanıyor; "Kapat" iki düğmede — başlıktaki X ve alttaki — bu yüzden testte `getAllByRole`.)

Run: `npm run typecheck`
Expected: temiz.

Run: `git grep -nE "#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|lime-|onPaste|onContextMenu|preventDefault" -- src/agents/MemoryDialog.tsx`
Expected: çıktı yok.

- [ ] **Step 5: Commit**

```bash
git add src/agents/MemoryDialog.tsx
git add src/agents/TeamStrip.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/memoryDialog.test.tsx
git add tests/terminalMode.test.tsx
git commit -m "Bellek: bellek penceresi ve ajan kartindaki dugme

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Kullanım rehberi, tam doğrulama ve elle deneme listesi

**Files:**
- Modify: `KULLANIM-REHBERI.md` ("### Tarayıcı" bölümünün sonu, "## Klavye Kısayolları" başlığının önü)

**Interfaces:**
- Consumes: bütün önceki task'lar.
- Produces: rehberde "Kalıcı bellek" alt bölümü; yeşil tam takım; kullanıcıya elle deneme listesi.

- [ ] **Step 1: Rehber** — `KULLANIM-REHBERI.md`

"### Tarayıcı" bölümünün son maddesinden

```markdown
- Ajan bu tarayıcıyı kendisi süremez (açma, okuma, tıklama yok); sayfayı sen
  açar, sen gönderirsin.
```

sonra, "## Klavye Kısayolları" başlığının hemen ÖNÜNE (arada bir boş satır):

```markdown
### Kalıcı bellek

Bir ajan kapanıp yeniden açıldığında (ya da ertesi gün) "nerede kalmıştık,
neye karar vermiştik" bilgisi kaybolmasın diye her ajanın kendi **bellek
dosyası** olabilir. Ajan her açılışta onu okur ve önemli şeyleri oraya
yazar; sen de dosyayı uygulamadan açıp düzeltebilirsin.

- **Ajan ekle** penceresinde **Kalıcı bellek** kutusunu işaretle (varsayılan
  kapalı). Var olan bir ajanda ekip şeridindeki kartın sağ altındaki kitap
  simgesine bas (**Belleği etkinleştir**); simge **Belleği aç**'a döner.
- Dosya alanın kök klasörü altında `.ntt-studio/bellek/<ad>.md` olarak durur
  (alanın kökü yoksa ajanın klasöründe). `<ad>` ajanın adından türetilir
  (ör. "Ayşe Çağrı" → `ayse-cagri`); ajanın adını sonradan değiştirsen de
  dosya aynı kalır. Aynı adlı ikinci ajan `-2`, `-3` eki alır.
- Dosya yoksa ilk açılışta tek satırlık bir başlıkla yaratılır. Var olan
  dosyaya uygulama asla kendiliğinden yazmaz, onu hiçbir zaman silmez.
- Ajanın motoru hazır olup boşta beklediği ilk anda istem satırına bir kez
  şu satır yazılıp Enter'a basılır: `[Bellek] Kalici bellegin:
  .ntt-studio/bellek/<ad>.md …`. Ajan çalışıyorsa, soru soruyorsa ya da sen
  terminale yazıyorsan beklenir. Görev Panosu'ndan iş bekleniyorsa bellek
  satırı önce gider, pano işi bir sonraki turda. Ajanı yeniden başlatınca
  bir kez daha gider. Ajan boşta göründüğü halde üç kez (10 sn arayla)
  gönderilemezse vazgeçilir; pencerede "Bellek ajana bildirilemedi" ve
  **Yeniden bildir** görünür.
- **Belleği aç** dosyayı bir pencerede gösterir; düzeltip **Kaydet**.
  Pencere açıkken ajan dosyaya yazdıysa üzerine yazılmaz: "Dosya bu arada
  değişti" uyarısı çıkar, senin metnin pencerede kalır. Gerekirse kopyala,
  sonra **Yeniden yükle** (yüklenince pencerede yazdığın gider).
- Dosya 256 KB'tan büyükse ya da UTF-8 değilse pencerede düzenlenmez;
  **Klasörde göster** ile bir düzenleyicide aç. Satır sonları (CRLF) ve
  dosya başındaki BOM kaydederken korunur.
- Alan bir Git deposuysa bellek dosyaları Değişiklikler görünümünde çıkar ve
  Git ile taşınır; istemiyorsan `.gitignore`'a `.ntt-studio/` satırını ekle.
- Ajana belleğe şifre ya da token yazmaması söylenir, ama bu denetlenemez:
  dosyaya ara sıra göz at. Uygulama dosyanın içeriğini günlüğe yazmaz.
```

- [ ] **Step 2: Tam doğrulama**

Run: `npm run typecheck`
Expected: temiz.

Run: `npx vitest run > .superpowers/vitest-bellek.txt 2>&1` ve dosyanın sonundaki özeti oku.
Expected: bütün dosyalar PASS (`memoryFiles.test.ts`'in junction testleri bağ kurulamayan ortamda "skipped"). Bir test kırmızıysa: bu planın bilinçli değiştirdiği bir davranışı eski hâliyle bekliyorsa (ör. ajan kartının `pr-2`/`pr-8` sınıfı, `commandsMock`'ta eksik `enablePaneMemory`), beklentiyi yeni davranışa çevir ve dayandığı sapmayı commit mesajına yaz; değilse sistematik hata ayıklamaya geç (bu task'ı kapatmadan).

Run: `git status --short`
Expected: yalnız `KULLANIM-REHBERI.md` değişmiş (izlenmeyen `resources/sap-toolkit/auth-plus/scripts/` dalda zaten var; dokunma). `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*` stage edilmemiş.

Run: `git log --oneline -9`
Expected: Task 1–7 commit'leri; her konu satırı ASCII.

Run: `git grep -nP "[\x{200b}-\x{200f}\x{202a}-\x{202e}\x{2066}-\x{2069}\x{2028}\x{2029}\x{feff}]" -- app-electron src tests`
Expected: bu planın eklediği ya da değiştirdiği dosyalarda çıktı yok (önceden var olan bir dosyada çıkarsa dokunma, raporla).

- [ ] **Step 3: Commit**

```bash
git add KULLANIM-REHBERI.md
git commit -m "Rehber: Kalici bellek

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Elle deneme listesini kullanıcıya ver** (spec §8; uygulamayı sen başlatma)

Hazırlık: kök klasörü olan bir alan (Git deposu olması iyi), içinde bir axet-code ajanı ve bir claude ajanı.

1. **Yeni ajan:** **Ajan ekle** → ad "Ayşe Çağrı", **Kalıcı bellek** işaretli → Ekle. Kökte `.ntt-studio/bellek/ayse-cagri.md` başlıkla yaratılmalı; ajan ilk boşta anında `[Bellek] Kalici bellegin: .ntt-studio/bellek/ayse-cagri.md …` satırını almalı ve dosyayı okumalı. Satır yalnız bir kez gelmeli.
2. **Ajan yazıyor mu:** ajana "bugün X'e karar verdik, belleğe yaz" de → dosyada madde olmalı. Ajanı **Yeniden başlat** → satır bir kez daha gelmeli; ajan kararı hatırlamalı.
3. **Var olan ajanı etkinleştir:** bellek kapalı kartta kitap simgesi (**Belleği etkinleştir**) → simge **Belleği aç**'a dönmeli; ajan boştaysa ~10 sn içinde satırı almalı.
4. **Pencere:** **Belleği aç** → içerik görünmeli; bir satır ekle, **Kaydet** → dosyada olmalı, pencere kapanmalı.
5. **Çakışma (en önemlisi):** pencereyi aç, bir şey yaz; bu arada dosyayı Not Defteri'nde değiştirip kaydet; pencerede **Kaydet** → "Dosya bu arada değişti…" uyarısı, Not Defteri'ndeki değişiklik diskte yerinde, senin metnin pencerede. **Yeniden yükle** → diskteki içerik gelmeli.
6. **Silinen dosya:** pencere açıkken dosyayı sil, **Kaydet** → yine "değişti" uyarısı; dosya yeniden yaratılmamalı.
7. **Biçim:** dosyayı Not Defteri'nde "UTF-8 with BOM" ve CRLF ile kaydet; pencereden bir satır ekleyip kaydet → BOM ve CRLF kalmalı (`git diff` yalnız eklenen satırı göstermeli). Dosyayı ANSI olarak kaydet (Türkçe harfle) → pencere "UTF-8 değil…" + **Klasörde göster**; dosyaya dokunulmamalı.
8. **Büyük dosya:** dosyayı 300 KB'a büyüt → "Dosya çok büyük…" + **Klasörde göster** Gezgin'de dosyayı seçmeli.
9. **Meşgul ajan ve pano:** belleği yeni açılmış bir ajana Görev Panosu'ndan iş ata (ajan boşta) → önce bellek satırı, sonra (iş bitip ajan boşa düşünce) pano istemi gitmeli; ajan uzun çalışırken bellek satırı araya girmemeli.
10. **Yazarken:** ajan boşta, sen terminale bir şey yazmaya başla (Enter'a basma) → bellek satırı senin satırına karışmamalı; sen satırını silince gelmeli.
11. **Kök dışına kaçış:** (isteğe bağlı) kökte `.ntt-studio` klasörünü sil, yerine dışarıyı gösteren bir junction kur (`mklink /J .ntt-studio C:\baska`) → bellek açık yeni ajanda dosya `C:\baska` altında yaratılmamalı; pencere "yol alanın klasörü dışını gösteriyor" demeli.
12. **Değişiklikler ve günlük:** Değişiklikler görünümünde `.ntt-studio/bellek/…md` görünmeli. Günlük dosyasında `bellek.bildirim` (yalnız `sonuc`, `deneme`) ve `bellek.kaydet` (yalnız `sonuc`, `bayt`) satırları olmalı; dosya içeriği ya da yolu geçmemeli.
13. **Gerileme:** Sohbet talimatları penceresi, Görev Panosu dağıtımı ve Tarayıcı'nın Ajana gönder'i eskisi gibi çalışmalı.

---

## Spec kapsama özeti

| Spec | Task |
|---|---|
| §1 amaç; öncelik sırası; bellek kullanıcının dosyası (silme/ezme yok); kapsam dışı maddeler | Global Constraints; 2 (kilitler 4); rehber 8 |
| §2 yer (`.ntt-studio/bellek/<anahtar>.md`, kök yoksa ajan klasörü), Git/Değişiklikler notu | 1 (`memoryTarget`), 2, 8 |
| §2 anahtar türetme, 40 karakter, `ajan`, çakışma eki, ad değişse de aynı dosya | 1, 5 (sapma 4, 5) |
| §2 yalnız yoksa (`wx`) ilk içerik; var olana yazılmaz | 1, 2, 3, 4 (sapma 12) |
| §2 yol güvenliği: desen + `insideRootReal` (junction) | 1, 2 |
| §3 tek satır istem, `sendPrompt` yolu, motor hazır, süreç başına bir kez, yeniden başlatmada bir kez | 1, 3, 4 |
| §3 meşgul/soru/yazıyor → bekleme; 3 deneme, 10 sn; vazgeçme notu | 3, 7 (sapma 2) |
| §3 Görev Panosu ile sıra (bellek önce; pano "meşgul, sonra dene") | 3 (gerçek izleyiciyle test), 4 (kilit) |
| §3 axet-code'da aynı yol, AGENTS.md'ye yazılmaz | 3, 4 (aynı `sendPrompt`); Global Constraints |
| §4 Ajan ekle'de Kalıcı bellek kutusu (varsayılan kapalı, açıklama) | 6 |
| §4 kartta Belleği aç / Belleği etkinleştir; pencere (metin, Kaydet, Kapat); değişmişse ezmeme, metin kalır | 5, 7 (sapma 1, 9, 10, 13) |
| §4 yeni görünüm/panel yok | Global Constraints; 7 |
| §5 `AgentSpec.memory`; eski kayıtlar; geçersiz anahtar atılır, dosya silinmez | 1, 5 |
| §5 256 KB; büyükse "bir düzenleyicide aç" + Klasörde göster | 2, 4, 7 (sapma 7) |
| §6 içerik günlüğe yazılmaz; `bellek.bildirim`, `bellek.kaydet` | 3, 4 |
| §6 IPC yalnız (alan, bölme); anahtar spec'ten, kök config'ten | 4 |
| §6 gizli bilgi uyarısı istemde ve rehberde | 1, 7, 8 |
| §7 hata tablosu (kök yok, yaratılamadı/okunamadı, değişmiş, yazılamadı, sürekli meşgul + Yeniden bildir) | 2, 3, 4, 6, 7 (sapma 8, 11) |
| §8 testler: saf, ana süreç (wx, kök içi, değişmiş dosya, 256 KB), izleyici/pano sırası (sahte saat), bileşen, i18n, elle | 1–7; elle deneme 8 |
| §9 kapsam dışı (arama, tipli not, global bellek, onay kutusu, sır filtresi, özetleme, içe aktarım) | yapılmıyor |
