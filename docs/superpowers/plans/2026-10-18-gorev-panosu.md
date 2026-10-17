# Görev Panosu ve Lider — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajanlar ekranına, kullanıcının hedefini liderin alt görevlere böldüğü, onaylanan alt görevlerin alandaki ajanlara kodla dağıtıldığı ve her alt görevin alanın doğrulama komutlarıyla kanıtlanarak kapandığı bir görev panosu eklemek.

**Architecture:**
- Pano alan başına bir JSON dosyası (`userData/boards/<workspaceId>.json`) ve ana süreçteki **pano yöneticisinde** (`boardManager.ts`) yaşıyor. Durum geçişleri, bağımlılık ilerletme ve dağıtım **saf** fonksiyonlar (`app-electron/shared/board*.ts`); yönetici yalnız bunları çağırıyor, diske yazıyor ve renderer'a `board:changed` gönderiyor.
- Lider, mevcut başsız köprünün `startHeadlessTurn`'ü ile (yeni oturum, bağlayıcılar kapalı, 3 dk sınır) yalnız plan üretiyor; cevaptaki ilk JSON nesnesi ayrıştırılıp şemadan geçiyor. Doğrulama, alanın kullanıcı yazımı komutlarını gizli bir çocuk süreçte sırayla çalıştırıyor (10 dk sınır, `taskkill /T /F`).
- Dağıtım Ajan Alanı izleyicisinin (`agentMonitor.ts`) üstüne iki yüz ekliyor: `agents()` (kayıtlı ajanlar + durum + "yazmıyor mu") ve `sendPrompt()` (motor çalışıyorsa ve kullanıcı yazmıyorsa istemi yazar, Enter'dan önce yeniden denetler). Renderer'da bir pano bağlamı, Bölmeler | Pano geçişi, sütunlar, ayrıntı paneli, ekip şeridi satırı ve kenar çubuğu rozeti var.

**Tech Stack:** Electron 44 (Node 24), TypeScript, React 18, vitest 2, @testing-library/react (jsdom). Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-18-gorev-panosu-design.md` (üstüne inşa edilen: `docs/superpowers/plans/2026-10-17-ajan-alani.md`, kodu dalda)

## Global Constraints

- Tasarım: **"daha fazla UI değil, daha güçlü hiyerarşi"**. Lime (accent) **YALNIZ seçim** için: seçili kart çerçevesi, seçili radyo/geçiş. **Yeni renk ya da jeton YOK.** Durum renkleri mevcut `--status-*` jetonlarından: hata/başarısız için mevcut `--status-danger-{bg,border,text,solid}`; `--status-error-*` diye bir jeton YOK, uydurulmaz. Görev grup rengi mevcut bölme renklerinden (`PANE_COLOR_VAR`).
- **Ana süreçte yakalanmamış istisna yok:** zamanlayıcı, çocuk süreç geri çağrıları, söz (Promise) zincirleri, IPC işleyicileri ve okuyucular `try/catch` (ya da `.catch`) içinde; pano yöneticisinin bir hatası izleyiciyi, izleyicinin hatası panoyu düşürmez.
- **Günlüğe hedef, istem, plan metni, komut metni ya da komut çıktısı yazılmaz.** Yalnız spec §9 etiketleri: `pano.lider` (`sure` ms, `altGorev` sayı, `sonuc`: `tamam`/`gecersiz`/`sure`/`hata`/`motor`), `pano.dagitim` (`altGorev` id, `bolme` pane id, `yol`: `oto`/`elle`/`geri`), `pano.dogrulama` (`komut` indeks, `cikis` kod ya da `yok`, `sure` ms).
- **Yapay zekânın ürettiği metin hiçbir koşulda cmd/PowerShell komutu olarak çalışmaz.** İstem yalnız motoru çalışan (kabuk istemi ekranda olmayan) bölmeye yazılır; Enter'dan hemen önce yeniden denetlenir, motor kapandıysa Enter yerine `Esc` yazılır. Doğrulama komutu **yalnız kullanıcının alan menüsünde yazdığı metindir**: ana süreç onu `config.json`'daki alan kaydından okur; IPC yükünden, liderden ya da ajandan komut alınmaz.
- **Tahmini durumda kesin gibi davranılmaz:** kendiliğinden dağıtım yalnız kesin `idle` ya da başlangıçtaki "boşta ≈" (`lastActivity === null`) ajana; kendiliğinden `verifying` geçişi yalnız kesin kaynakta. Tahmini ajanlarda kullanıcı **Ajana ver** ve **Doğrula** düğmelerini kullanır.
- **Renderer'dan gelen her IPC verisi ana süreçte doğrulanır** (`readBoardCommand`, kimlik deseni, sınırlar); `workspaceId` yalnız `^[A-Za-z0-9_-]{1,100}$` — dosya yoluna başka bir şey girmez.
- **Çift tıklama/çift gönderim kilidi:** pencerelerde ve ayrıntı panelinde komut uçuştayken düğmeler kilitli (ref + durum); yöneticide aynı alt görevin ikinci doğrulaması, aynı görevin ikinci planlaması reddedilir. **Bileşen söküldükten sonra `setState` yok** (`alive`/`mounted` ref).
- Sınırlar (spec §2): başlık ≤ 80, hedef ≤ 2000, alt görev ≤ 8, istem ≤ 4000, rol ipucu ≤ 40, ham lider cevabı ≤ 8 KB, doğrulama komutu ≤ 5 satır × ≤ 300; pano başına en fazla 50 görev (plan ekledi, bkz. sapmalar).
- SAP yazma kapısı (`SapWriteGate`), kademe kuralları (QA/PRD salt okunur), rol kapısı (`skillProfiles`), axet-code `-y`, Ajan Alanı'nın istem→oturum eşlemesi ve Kararlar **DEĞİŞMEZ ve atlatılmaz** (spec §12); bu plan o dosyalara dokunmaz. axet-code dışındaki motorlara izin atlatma bayrağı eklenmez.
- Düz kabuk bölmesi, "+ Terminal", bölme başlığındaki böl düğmeleri, 6 alan × 9 bölme sınırı ve uygulama içi kimlik `"terminal"` aynen kalır.
- **i18n:** her yeni metin aynı task'ta hem `src/i18n/tr.ts` hem `src/i18n/en.ts`'e (anahtar `board.` önekiyle); `tests/i18n.test.ts` yer tutucu eşitliğini denetler.
- Komutlar: `npm run typecheck`, `npx vitest run <dosya>`; tam takım `npx vitest run > .superpowers/vitest-pano.txt 2>&1` (çıktı dosyaya).
- **Commit:** `git add` dosya dosya (asla `-A`/`.`); mesaj ASCII Türkçe; mesajın son satırı tam olarak `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Dal: `ozellik/gorev-panosu` (dal değiştirme).
- **Asla stage edilmez:** `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*`.
- **Düzenleme:** Windows'ta Git Bash heredoc'u ters eğik çizgiyi bozuyor; dosyaları Edit/Write araçlarıyla değiştir. Prettier çalıştırma. Kod yorumları tam Türkçe karakterle. Satır sonu dosyanın kendisininki.
- Geliştirme sunucusunu (`npm run dev`) başlatma. **ADT/SAP çağrısı yok**, SAP sistemlerine dokunma. **axet-code testlerde çalıştırılmaz**: lider ve doğrulama enjekte sahte süreçle test edilir; gerçek bağlantılar `boardLive.ts`'teki ince fonksiyonlarda kalır.
- better-sqlite3 vitest'te yüklenmiyor (Electron ABI): pano test dosyaları `axetHeadless.ts`/`axetSessionDb.ts`'i İÇE AKTARMAZ; canlı bağımlılıklar yalnız `boardLive.ts`'te.

## Review Focus

1. **Motor kapanırken ya da kapandıktan sonra (kabuk istemi ekranda) istem yazılmamalı** — dağıtım anında, elle atamada, düzeltmeye geri göndermede ve istem yazıldıktan sonra Enter'a kadar geçen 150 ms içinde. Kullanıcı bu durumda istemin cmd'ye komut olarak gittiğini görürdü. (Task 3 testleri "2: motor kapalı…", "motoru kapalı ajan uygun değil…"; Task 7 testleri "kabuk istemi ekrandayken yazmıyor", "Enter anında motor kapandı → Enter yerine Esc"; Task 8 testleri "motor kapalı (kabuk istemi) ya da kullanıcı yazıyor…", "izleyici son anda reddederse…")
2. **Aynı ajana iki alt görev gitmemeli**: aynı dağıtım turunda iki `ready` alt görev, elle atama ile kendiliğinden dağıtımın çakışması, "Ajana ver"e çift tıklama. (Task 3 testleri "bir turda bir ajana tek alt görev", "4: başka alt göreve atanmış ajan uygun değil"; Task 8 testi "Ajana ver: … meşgul ajana … verilemiyor"; Task 12 testi "+ Görev: … çift tıklama"; Task 13 testi "Onayla: … çift tıklama tek sefer")
3. **Uygulama kapanıp açıldığında** yarıda kalan (`running/asking/verifying`) alt görevler `ready + held` olmalı ve **kendiliğinden yeniden gönderilmemeli**; pano dosyası bozuksa dosya `.bozuk-<zaman>` olarak kenara alınmalı, sessizce silinmemeli. (Task 1 testi "yeniden başlatma: running/asking/verifying → ready + held…"; Task 4 testleri "gidiş-dönüş…", "JSON değilse .bozuk-<zaman> olarak kenara alınıyor…"; Task 8 testi "yeniden başlatma: diskten held gelen alt görev kendiliğinden gönderilmiyor")
4. **Tahmini durumlu ajan (Claude/Codex/Gemini/özel) "≈ boşta" görünüyor diye** ona kendiliğinden iş verilmemeli ve işini "bitti" sayıp doğrulama başlatılmamalı; yalnız elle **Ajana ver**/**Doğrula** ile. (Task 1 testi "tahmini boşta: … kendiliğinden doğrulamaya geçmiyor"; Task 3 testi "3: tahmini boşta yalnız elle uygun…"; Task 8 testi "… tahmini ajanda Doğrula elle başlatılıyor…")
5. **Geç gelen sonuç yanlış karta yazılmamalı**: lider cevabı ya da doğrulama sonucu görev silindikten sonra gelirse yok sayılmalı (ve bildirim çıkmamalı); doğrulama sonucu artık `verifying` olmayan alt göreve yazılmamalı; aynı alt görev için ikinci doğrulama başlamamalı. (Task 1 testi "verifying olmayan alt göreve kanıt yazılmıyor"; Task 8 testleri "silinmiş göreve geç lider sonucu yazılmıyor…", "silinmiş göreve geç doğrulama sonucu yazılmıyor…", "… çift Doğrula reddediliyor")

## Spec'ten bilinçli sapmalar ve netleştirmeler

1. **`finished` = motor kapandı.** Spec §6 "running → idle/finished (kesin) → verifying" diyor; ama Ajan Alanı'nda `finished` iki okuyucuda da yalnız "kabuk istemi geri döndü" (motor çıktı) demek. §7 bunu "ajan kapandı → ready + held" olarak tanımlıyor. Plan: kesin `idle` (ve kesin `error`: tur hatayla bitti, not `agentError`) → `verifying`; `finished` ya da kaydın kaybolması → `ready + held`, not `agentClosed`.
2. **"running → idle" geçişi iki yoldan tanınıyor:** gönderimden sonra ajan bir kez `running/asking` görüldüyse (`sawBusy`) ya da kesin `idle`'ın `lastActivity`'si gönderim anından (`dispatchedAt`) büyükse (tur iki yoklama arasında bitmiş olabilir). Aynı saniyedeki belirsizlikte geçiş yok (kart "Çalışıyor" kalır, kullanıcı **Doğrula**'ya basar) — erken doğrulama yanlış bilgi olurdu.
3. **Elle atamada (Ajana ver, Düzeltmeye geri gönder) tahmini `idle` de kabul.** Spec 3. koşul "idle (kesin) ya da başlangıçtaki boşta ≈"; elle atama 2–5'i uyguluyor. Bu harfiyen uygulansa Claude/Codex ajanına hiç iş verilemezdi. Kendiliğinden dağıtım spec'e harfiyen uyuyor.
4. **Lider portal bağlayıcıları kapalı çalışıyor** (`useConnectors: false` — yalnız Outlook/SharePoint gibi aXet bağlayıcılarını kapatır, ilk cevabı hızlandırır). SAP ADT erişimi (8787, `ABAP_HTTP_TOKEN`) açık kalır: SAP alanında lider nesneleri okuyarak plan yapabilir; SAP yazma onayı/kademe/rol kapıları değişmez, plan aşamasında yazma beklenmez (spec §3).
5. **Doğrulama ve liderin klasörü:** alanın kökü, yoksa `config.axetWorkspaceDir` (Ajan Alanı'nın "yeni ajanın varsayılan klasörü" kuralı). Klasör yoksa komut çalıştırılmaz; kanıtta `error: "missingDir"`.
6. **Görev durumuna `approvedAt` eklendi:** `stuck` hem onaydan önce (lider hatası) hem sonra (alt görev `failed`) olabiliyor; sütun ve düğmeler bunu ayırt etmeli. Ayrıca bellekte `planning` (lider çalışıyor; diske yazılmaz).
7. **Not ve lider hatası kod olarak saklanıyor** (`SubtaskNote`, `LeadErrorCode`); metin renderer'da i18n'den. axet-code sürüm/bozukluk mesajı ana sürecin `axetBinaryMessage`'ından geldiği için `leadDetail` alanında metin olarak duruyor (≤ 500).
8. **Ayrıştırıcı:** yapısal hatalar (JSON değil, dizi yok/boş, > 8, istem boş ya da > 4000, geçersiz/kendine bağımlılık, döngü) reddediliyor; görünüm sınırları (başlık > 80, rol > 40) kırpılıyor — LLM'nin 85 karakterlik başlığı planı çöpe attırmamalı. `dependsOn` 0'dan başlayan indeks (istemde yazılı).
9. **"Yeniden sıraya al" `failed` alt görevde de var** (`ready`, ajansız): ajanı kapanmış başarısız bir alt görevin başka çıkışı yoktu. Kendiliğinden yeniden gönderme yok (otopilot kapsam dışı).
10. **Pano başına en fazla 50 görev** (dosya sınırsız büyümesin); aşılırsa "Görev sınırına ulaşıldı".
11. **Bölmeler | Pano seçimi ve doğrulama komutları alan kaydında** (`SavedTerminalWorkspace.view?: "board"`, `verify?: string[]`), config.json'da; pano dosyasında değil. Böylece doğrulama komutunu ana süreç yalnız kullanıcı ayarından okuyor.
12. **Alan silinince pano silinmesi** `config:save` anında yapılıyor (kaydedilen alan listesinde olmayan panolar). Açılışta toplu silme YOK: bozuk/okunamayan config boş liste döndürürse bütün panolar silinirdi. Alan kapatma onayı, panoda görev varsa da soruluyor ("görevler de silinir").
13. **İstem iki yazımda gidiyor:** önce tek satırlık metin, 150 ms sonra yeniden denetimle `\r`. Bazı TUI'ler tek parçada gelen "metin+Enter"i yapıştırma sayabiliyor (ölçülmedi; Task 15 elle deneme 2 bunu doğruluyor).
14. **15 task:** yönetici (Task 8) tek dosyada ama büyük; alan ayarları (Task 9) IPC bağlantısından (Task 10) önce, çünkü ana sürecin `deps.workspace`'i `boardWorkspaceInfo`'i kullanıyor; UI üç task'a bölündü (sütunlar / ayrıntı paneli / şerit+rozet) ki her biri ayrı reddedilebilsin.

## Dosya yapısı

| Dosya | Sorumluluk | Task |
|---|---|---|
| `app-electron/shared/boardTypes.ts` (yeni) | Pano türleri, sınırlar | 1 |
| `app-electron/shared/boardLogic.ts` (yeni) | Saf geçişler: türetme, onay, bağımlılık, ajan durumu uygulama, kanıt, yeniden başlatma | 1 |
| `app-electron/shared/boardPlan.ts` (yeni) | Lider istemi, JSON çıkarma, plan şeması | 2 |
| `app-electron/shared/boardDispatch.ts` (yeni) | Saf dağıtıcı: uygunluk 1–6, istem satırı, geri gönderme istemi | 3 |
| `app-electron/shared/boardCommands.ts` (yeni) | IPC komut türleri ve doğrulayıcısı | 3 |
| `app-electron/main/boardStore.ts` (yeni) | Pano dosyası okuma/yazma, bozuk dosya, silme | 4 |
| `app-electron/main/boardVerify.ts` (yeni) | Doğrulama çalıştırıcısı (enjekte süreç) | 5 |
| `app-electron/main/boardLead.ts` (yeni) | Lider çalıştırıcısı (enjekte tur, git status) | 6 |
| `app-electron/main/boardLive.ts` (yeni) | Canlı bağımlılıklar (spawn, taskkill, startHeadlessTurn, git, dizin) — test edilmez | 5, 6 |
| `app-electron/main/axetHeadless.ts` | `killTreeDefault` dışa açılıyor | 5 |
| `app-electron/shared/agentTypes.ts`, `app-electron/main/agentMonitor.ts`, `src/stores/terminalStore.tsx` | Kayda alan/rol; `agents()`, `sendPrompt()` | 7 |
| `app-electron/main/boardManager.ts` (yeni) | Pano yöneticisi | 8 |
| `app-electron/main/boardNotification.ts` (yeni) | Bildirim metni (saf) | 8 |
| `app-electron/shared/types.ts`, `terminalLayout.ts`, `src/stores/terminal*.ts(x)` | `verify`, `view` alanları, `boardWorkspaceInfo`, komutlar | 9 |
| `src/board/VerifyCommandsDialog.tsx` (yeni), `src/components/TerminalSidebar.tsx` | "Doğrulama komutları…" | 9 |
| `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts` | IPC, zamanlayıcı, bildirim, budama | 10 |
| `src/board/boardContext.tsx`, `src/board/boardView.ts` (yeni) | Renderer aboneliği, saf görünüm yardımcıları | 11 |
| `src/board/BoardView.tsx`, `src/board/NewTaskDialog.tsx` (yeni), `src/terminal/TerminalMode.tsx`, `src/agents/TeamStrip.tsx` | Geçiş, sütunlar, yeni görev | 12 |
| `src/board/BoardDetailPanel.tsx`, `src/board/DraftEditor.tsx` (yeni) | Ayrıntı paneli, taslak düzenleme, düğmeler | 13 |
| `src/agents/TeamStrip.tsx`, `src/components/TerminalSidebar.tsx`, `src/board/BoardOpenListener.tsx` (yeni), `src/App.tsx` | Şerit satırı, başarısız rozeti, kapatma onayı, bildirim tıklaması | 14 |
| `src/i18n/{tr,en}.ts` | Metinler (her UI task'ı kendi anahtarlarını ekler) | 9, 11–14 |
| `KULLANIM-REHBERI.md` | "Görev Panosu" alt bölümü | 15 |

---

### Task 1: Pano türleri ve saf durum geçişleri

**Files:**
- Create: `app-electron/shared/boardTypes.ts`
- Create: `app-electron/shared/boardLogic.ts`
- Test: `tests/boardLogic.test.ts`

**Interfaces:**
- Consumes: `AgentStatus` (`app-electron/shared/agentTypes.ts`).
- Produces (sonraki bütün task'lar bu adları kullanır):

```ts
// boardTypes.ts
export type TaskState = "draft" | "awaitingApproval" | "running" | "done" | "stuck";
export type SubtaskState = "waiting" | "ready" | "running" | "asking" | "verifying" | "done" | "failed";
export type SubtaskNote = "agentClosed" | "restarted" | "agentError" | "timeout" | "sentBack";
export type LeadErrorCode = "binary" | "failed" | "timeout" | "noJson" | "badJson" | "noSubtasks" | "tooMany" | "badField" | "badDependency" | "cycle";
export interface ProofCommand { command: string; exitCode: number | null; durationMs: number; tail: string; timedOut?: boolean; error?: "missingDir" | "spawn" }
export interface Proof { kind: "commands" | "manual"; commands: ProofCommand[]; ok: boolean; at: number }
export interface Subtask { id: string; title: string; prompt: string; roleHint: string; dependsOn: string[]; state: SubtaskState; paneId: string | null; note?: SubtaskNote; proof?: Proof; attempts: number; held?: boolean; dispatchedAt?: number; sawBusy?: boolean }
export interface BoardTask { id: string; title: string; goal: string; state: TaskState; createdAt: number; subtasks: Subtask[]; approvedAt?: number; leadError?: LeadErrorCode; leadDetail?: string; leadRaw?: string; leadChangedFiles?: boolean; planning?: boolean }
export interface Board { workspaceId: string; tasks: BoardTask[]; recoveredFrom?: string; unreadable?: boolean }
export const TASK_TITLE_MAX = 80, TASK_GOAL_MAX = 2000, SUBTASK_TITLE_MAX = 80, SUBTASK_PROMPT_MAX = 4000, ROLE_HINT_MAX = 40,
  MAX_SUBTASKS = 8, LEAD_RAW_MAX = 8192, LEAD_DETAIL_MAX = 500, MAX_TASKS = 50;   // (her biri ayrı export const)
export const SUBTASK_STATES: readonly SubtaskState[]; SUBTASK_NOTES: readonly SubtaskNote[]; LEAD_ERROR_CODES: readonly LeadErrorCode[];

// boardLogic.ts
export function isActiveSubtask(s: Subtask): boolean;                       // running | asking | verifying
export function deriveTaskState(task: BoardTask): TaskState;
export function withDerivedState(task: BoardTask): BoardTask;              // değişmediyse aynı nesne
export function graphError(subtasks: readonly Pick<Subtask, "id" | "dependsOn">[]): "badDependency" | "cycle" | null;
export function approveTask(task: BoardTask, now: number): BoardTask | null;
export function advanceDependencies(task: BoardTask): BoardTask;
export function assignSubtask(sub: Subtask, paneId: string, now: number): Subtask;
export function applyAgentStatuses(task: BoardTask, agents: ReadonlyMap<string, AgentStatus | null>): { task: BoardTask; toVerify: string[] };
export function applyProof(sub: Subtask, proof: Proof): Subtask;
export function manualProof(now: number): Proof;
export function requeueSubtask(sub: Subtask): Subtask | null;
export function restoreAfterRestart(task: BoardTask): BoardTask;
export function mapSubtask(task: BoardTask, subtaskId: string, fn: (s: Subtask) => Subtask | null): BoardTask | null;
```

`applyAgentStatuses`'ta `agents` haritası: anahtar YOK → ajan kayıtlı değil (bölme kapandı / pty bitti); değer `null` → kayıtlı ama henüz durum yok (dokunma).

- [ ] **Step 1: Kırmızı test** — `tests/boardLogic.test.ts`

```ts
// Pano durum geçişleri (spec 2026-10-18 gorev-panosu §2, §4–§7). Saf.
import { describe, expect, it } from "vitest";
import {
  advanceDependencies,
  applyAgentStatuses,
  applyProof,
  approveTask,
  assignSubtask,
  deriveTaskState,
  graphError,
  manualProof,
  mapSubtask,
  requeueSubtask,
  restoreAfterRestart
} from "../app-electron/shared/boardLogic";
import type { BoardTask, Proof, Subtask } from "../app-electron/shared/boardTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: `Alt ${id}`,
  prompt: `İstem ${id}`,
  roleHint: "",
  dependsOn: [],
  state: "waiting",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (subtasks: Subtask[], over: Partial<BoardTask> = {}): BoardTask => ({
  id: "t1",
  title: "İade akışı",
  goal: "Ödeme modülüne iade akışı ekle",
  state: "draft",
  createdAt: 1,
  subtasks,
  ...over
});
const approved = (subtasks: Subtask[]) => task(subtasks, { approvedAt: 10, state: "running" });
const exact = (state: AgentStatus["state"], lastActivity: number | null = 5_000): AgentStatus => ({ state, source: "exact", lastActivity });
const estimated = (state: AgentStatus["state"], lastActivity: number | null = 5_000): AgentStatus => ({ state, source: "estimated", lastActivity });
const running = (over: Partial<Subtask> = {}) => sub("a", { state: "running", paneId: "p1", attempts: 1, dispatchedAt: 10_000, ...over });
const proof = (ok: boolean, timedOut = false): Proof => ({
  kind: "commands",
  commands: [{ command: "npm test", exitCode: ok ? 0 : timedOut ? null : 1, durationMs: 5, tail: "", ...(timedOut ? { timedOut: true } : {}) }],
  ok,
  at: 99
});

describe("deriveTaskState", () => {
  it("onaydan önce: alt görevsiz draft, alt görevli awaitingApproval, lider hatası stuck", () => {
    expect(deriveTaskState(task([]))).toBe("draft");
    expect(deriveTaskState(task([sub("a")]))).toBe("awaitingApproval");
    expect(deriveTaskState(task([], { leadError: "noJson" }))).toBe("stuck");
  });

  it("onaydan sonra: hepsi done → done; biri failed → stuck; yoksa running", () => {
    expect(deriveTaskState(approved([sub("a", { state: "done" }), sub("b", { state: "done" })]))).toBe("done");
    expect(deriveTaskState(approved([sub("a", { state: "done" }), sub("b", { state: "failed" })]))).toBe("stuck");
    expect(deriveTaskState(approved([sub("a", { state: "ready" }), sub("b", { state: "waiting" })]))).toBe("running");
    expect(deriveTaskState(approved([sub("a", { state: "verifying" })]))).toBe("running");
  });
});

describe("graphError", () => {
  it("geçersiz bağımlılık: olmayan id, kendine bağımlılık, tekrar eden id", () => {
    expect(graphError([sub("a", { dependsOn: ["x"] })])).toBe("badDependency");
    expect(graphError([sub("a", { dependsOn: ["a"] })])).toBe("badDependency");
    expect(graphError([sub("a"), sub("a")])).toBe("badDependency");
  });

  it("döngü bulunuyor, düz zincir geçiyor", () => {
    expect(graphError([sub("a", { dependsOn: ["b"] }), sub("b", { dependsOn: ["a"] })])).toBe("cycle");
    expect(graphError([sub("a"), sub("b", { dependsOn: ["a"] }), sub("c", { dependsOn: ["a", "b"] })])).toBeNull();
  });
});

describe("approveTask", () => {
  it("bağımlılığı olmayan ready, olan waiting; lider alanları siliniyor", () => {
    const t = task([sub("a"), sub("b", { dependsOn: ["a"] })], { leadError: "noJson", leadDetail: "x", leadRaw: "{", leadChangedFiles: true });
    const next = approveTask(t, 50)!;
    expect(next.approvedAt).toBe(50);
    expect(next.state).toBe("running");
    expect(next.subtasks.map((s) => s.state)).toEqual(["ready", "waiting"]);
    expect("leadError" in next || "leadRaw" in next || "leadDetail" in next || "leadChangedFiles" in next).toBe(false);
  });

  it("onaylanamaz: alt görev yok, boş istem, döngü, planlanıyor, zaten onaylı", () => {
    expect(approveTask(task([]), 1)).toBeNull();
    expect(approveTask(task([sub("a", { prompt: "  " })]), 1)).toBeNull();
    expect(approveTask(task([sub("a", { dependsOn: ["b"] }), sub("b", { dependsOn: ["a"] })]), 1)).toBeNull();
    expect(approveTask(task([sub("a")], { planning: true }), 1)).toBeNull();
    expect(approveTask(approved([sub("a")]), 1)).toBeNull();
  });
});

describe("advanceDependencies", () => {
  it("bağımlılıkların hepsi done olan waiting → ready; failed bağımlılık waiting kalıyor", () => {
    const t = approved([
      sub("a", { state: "done" }),
      sub("b", { state: "failed" }),
      sub("c", { dependsOn: ["a"] }),
      sub("d", { dependsOn: ["a", "b"] })
    ]);
    expect(advanceDependencies(t).subtasks.map((s) => s.state)).toEqual(["done", "failed", "ready", "waiting"]);
  });

  it("değişiklik yoksa aynı nesne; onaysız görevde dokunmuyor", () => {
    const t = approved([sub("a", { state: "ready" })]);
    expect(advanceDependencies(t)).toBe(t);
    const draft = task([sub("a", { state: "waiting" })]);
    expect(advanceDependencies(draft)).toBe(draft);
  });
});

describe("assignSubtask", () => {
  it("running, ajan, deneme sayısı, gönderim anı; held ve not siliniyor", () => {
    const next = assignSubtask(sub("a", { state: "ready", held: true, note: "restarted", attempts: 1, sawBusy: true }), "p9", 777);
    expect(next).toMatchObject({ state: "running", paneId: "p9", attempts: 2, dispatchedAt: 777, sawBusy: false });
    expect("held" in next || "note" in next).toBe(false);
  });
});

describe("applyAgentStatuses", () => {
  const apply = (s: Subtask, status: AgentStatus | null | "gone") => {
    const map = new Map<string, AgentStatus | null>();
    if (status !== "gone") map.set("p1", status);
    return applyAgentStatuses(approved([s]), map);
  };

  it("ajan soru soruyor → asking; cevaplanınca running; ikisinde de sawBusy", () => {
    const asked = apply(running(), exact("asking")).task.subtasks[0];
    expect(asked).toMatchObject({ state: "asking", sawBusy: true });
    expect(apply(asked, exact("running")).task.subtasks[0]).toMatchObject({ state: "running", sawBusy: true });
  });

  it("kesin: çalıştığı görüldükten sonra idle → verifying ve doğrulama listesine giriyor", () => {
    const result = apply(running({ sawBusy: true }), exact("idle", 1_000));
    expect(result.task.subtasks[0].state).toBe("verifying");
    expect(result.toVerify).toEqual(["a"]);
  });

  it("kesin: çalışma görülmese de son etkinlik gönderimden sonraysa → verifying", () => {
    expect(apply(running(), exact("idle", 10_500)).task.subtasks[0].state).toBe("verifying");
  });

  it("kesin idle ama son etkinlik gönderimden eski: geçiş yok, aynı nesne", () => {
    const t = approved([running()]);
    const result = applyAgentStatuses(t, new Map([["p1", exact("idle", 9_000)]]));
    expect(result.task).toBe(t);
    expect(result.toVerify).toEqual([]);
  });

  it("tahmini boşta: çalışma görülmüş olsa da kendiliğinden doğrulamaya geçmiyor", () => {
    expect(apply(running({ sawBusy: true }), estimated("idle", 20_000)).task.subtasks[0].state).toBe("running");
  });

  it("kesin error → verifying, not agentError", () => {
    expect(apply(running({ sawBusy: true }), exact("error")).task.subtasks[0]).toMatchObject({ state: "verifying", note: "agentError" });
  });

  it("motor kapandı (finished) ya da kayıt yok → ready + held + agentClosed, ajan boşalıyor", () => {
    for (const status of [exact("finished"), estimated("finished"), "gone" as const]) {
      const s = apply(running({ state: "asking", sawBusy: true }), status).task.subtasks[0];
      expect(s).toMatchObject({ state: "ready", paneId: null, held: true, note: "agentClosed", sawBusy: false });
    }
  });

  it("kayıtlı ama durumu henüz yok: dokunmuyor", () => {
    const t = approved([running()]);
    expect(applyAgentStatuses(t, new Map([["p1", null]])).task).toBe(t);
  });
});

describe("applyProof, manualProof, requeueSubtask", () => {
  it("yeşil → done, kırmızı → failed; süre aşımı notu", () => {
    const v = sub("a", { state: "verifying", paneId: "p1" });
    expect(applyProof(v, proof(true)).state).toBe("done");
    expect(applyProof(v, proof(false))).toMatchObject({ state: "failed" });
    expect(applyProof(v, proof(false, true))).toMatchObject({ state: "failed", note: "timeout" });
  });

  it("verifying olmayan alt göreve kanıt yazılmıyor (geç gelen sonuç)", () => {
    const r = sub("a", { state: "ready" });
    expect(applyProof(r, proof(true))).toBe(r);
  });

  it("elle kanıt: manual, ok, komutsuz", () => {
    expect(manualProof(7)).toEqual({ kind: "manual", commands: [], ok: true, at: 7 });
  });

  it("yeniden sıraya al: held ready ve failed; ötekiler null", () => {
    expect(requeueSubtask(sub("a", { state: "ready", held: true, note: "agentClosed" }))).toMatchObject({ state: "ready", paneId: null });
    const f = requeueSubtask(sub("a", { state: "failed", paneId: "p1", note: "timeout" }))!;
    expect(f).toMatchObject({ state: "ready", paneId: null });
    expect("held" in f || "note" in f).toBe(false);
    expect(requeueSubtask(sub("a", { state: "ready" }))).toBeNull();
    expect(requeueSubtask(running())).toBeNull();
  });
});

describe("restoreAfterRestart ve mapSubtask", () => {
  it("yeniden başlatma: running/asking/verifying → ready + held + restarted; done dokunulmuyor; planning siliniyor", () => {
    const t = approved([
      running(),
      sub("b", { state: "asking", paneId: "p2" }),
      sub("c", { state: "verifying", paneId: "p3" }),
      sub("d", { state: "done", paneId: "p4" })
    ]);
    const next = restoreAfterRestart({ ...t, planning: true });
    expect(next.subtasks.map((s) => [s.state, s.held ?? false, s.note ?? null, s.paneId])).toEqual([
      ["ready", true, "restarted", null],
      ["ready", true, "restarted", null],
      ["ready", true, "restarted", null],
      ["done", false, null, "p4"]
    ]);
    expect("planning" in next).toBe(false);
  });

  it("mapSubtask: bulunamazsa ya da fn null dönerse null; değilse durum yeniden türetiliyor", () => {
    const t = approved([sub("a", { state: "verifying" })]);
    expect(mapSubtask(t, "x", (s) => s)).toBeNull();
    expect(mapSubtask(t, "a", () => null)).toBeNull();
    expect(mapSubtask(t, "a", (s) => ({ ...s, state: "done" }))!.state).toBe("done");
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardLogic.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/shared/boardLogic"`.

- [ ] **Step 3: Türler** — `app-electron/shared/boardTypes.ts`

```ts
// Görev panosunun ortak türleri (spec 2026-10-18 gorev-panosu §2).
//
// Ana süreç (yönetici, depo) ve renderer (pano ekranı) aynı türleri
// kullanıyor; bu yüzden `shared` altında. Pano alan başına; diskte
// `userData/boards/<workspaceId>.json`. Proje klasörüne dosya yazılmaz.

export type TaskState = "draft" | "awaitingApproval" | "running" | "done" | "stuck";

export type SubtaskState = "waiting" | "ready" | "running" | "asking" | "verifying" | "done" | "failed";

export const SUBTASK_STATES: readonly SubtaskState[] = ["waiting", "ready", "running", "asking", "verifying", "done", "failed"];

/** Kartın küçük notu. Metin renderer'da i18n'den (spec §2 `note`). */
export type SubtaskNote = "agentClosed" | "restarted" | "agentError" | "timeout" | "sentBack";

export const SUBTASK_NOTES: readonly SubtaskNote[] = ["agentClosed", "restarted", "agentError", "timeout", "sentBack"];

/** Lider neden plan üretemedi (spec §3, §7). */
export type LeadErrorCode =
  | "binary"
  | "failed"
  | "timeout"
  | "noJson"
  | "badJson"
  | "noSubtasks"
  | "tooMany"
  | "badField"
  | "badDependency"
  | "cycle";

export const LEAD_ERROR_CODES: readonly LeadErrorCode[] = [
  "binary",
  "failed",
  "timeout",
  "noJson",
  "badJson",
  "noSubtasks",
  "tooMany",
  "badField",
  "badDependency",
  "cycle"
];

export interface ProofCommand {
  command: string;
  exitCode: number | null;
  durationMs: number;
  /** Çıktının son 40 satırı, ≤ 8 KB. */
  tail: string;
  timedOut?: boolean;
  /** Komut hiç başlamadı: klasör yok ya da süreç açılamadı. */
  error?: "missingDir" | "spawn";
}

export interface Proof {
  kind: "commands" | "manual";
  commands: ProofCommand[];
  /** `manual` için her zaman true; ekranda yeşil onay gibi gösterilmez. */
  ok: boolean;
  at: number;
}

export interface Subtask {
  id: string;
  title: string;
  /** Ajana gidecek istem; gönderilirken tek satıra indiriliyor. */
  prompt: string;
  roleHint: string;
  /** Aynı görevdeki alt görev kimlikleri. */
  dependsOn: string[];
  state: SubtaskState;
  /** Atanan ajanın bölmesi. */
  paneId: string | null;
  note?: SubtaskNote;
  proof?: Proof;
  /** Ajana kaç kez gönderildi. */
  attempts: number;
  /** true iken dağıtıcı atlıyor (ajan kapandı / uygulama yeniden başladı). */
  held?: boolean;
  /** Son gönderim anı (ms); "iş bitti" tanımada kullanılıyor. */
  dispatchedAt?: number;
  /** Gönderimden sonra ajan bir kez çalışırken/soru sorarken görüldü. */
  sawBusy?: boolean;
}

export interface BoardTask {
  id: string;
  title: string;
  /** Kullanıcının yazdığı hedef. */
  goal: string;
  state: TaskState;
  createdAt: number;
  subtasks: Subtask[];
  /** Onay anı; tanımsızsa görev taslakta (plan ekledi: stuck onaydan önce de olabiliyor). */
  approvedAt?: number;
  leadError?: LeadErrorCode;
  /** Ana süreçten gelen açıklama (axet-code sürüm mesajı, hata metni), ≤ 500. */
  leadDetail?: string;
  /** Lider cevabı, ≤ 8 KB; yalnız hata ayıklama için, katlı. */
  leadRaw?: string;
  /** Lider planlarken depoda dosya değişti (git status farkı). */
  leadChangedFiles?: boolean;
  /** Lider şu an çalışıyor. Yalnız bellekte; diske yazılmaz. */
  planning?: boolean;
}

export interface Board {
  workspaceId: string;
  tasks: BoardTask[];
  /** Pano dosyası bozuktu ve bu adla kenara alındı (spec §7). */
  recoveredFrom?: string;
  /** Dosya okunamadı ve kenara da alınamadı: üzerine yazılmıyor, komutlar reddediliyor. */
  unreadable?: boolean;
}

export const TASK_TITLE_MAX = 80;
export const TASK_GOAL_MAX = 2000;
export const SUBTASK_TITLE_MAX = 80;
export const SUBTASK_PROMPT_MAX = 4000;
export const ROLE_HINT_MAX = 40;
export const MAX_SUBTASKS = 8;
export const LEAD_RAW_MAX = 8192;
export const LEAD_DETAIL_MAX = 500;
/** Pano başına görev sınırı (plan ekledi; dosya sınırsız büyümesin). */
export const MAX_TASKS = 50;
```

- [ ] **Step 4: Geçişler** — `app-electron/shared/boardLogic.ts`

```ts
// Görev panosunun SAF durum geçişleri (spec 2026-10-18 gorev-panosu §2,
// §4–§7). Electron'a, diske, saate dokunmuyor: zaman parametre. Ajanın
// "bitti" demesi hiçbir kartı kapatmıyor; kart yalnız kanıtla (applyProof)
// done oluyor. Tahmini durumdan kendiliğinden geçiş yok.
import type { AgentStatus } from "./agentTypes";
import type { BoardTask, Proof, Subtask, SubtaskNote, SubtaskState, TaskState } from "./boardTypes";

const ACTIVE: ReadonlySet<SubtaskState> = new Set<SubtaskState>(["running", "asking", "verifying"]);

export function isActiveSubtask(s: Subtask): boolean {
  return ACTIVE.has(s.state);
}

export function deriveTaskState(task: BoardTask): TaskState {
  if (task.approvedAt === undefined) {
    if (task.leadError) return "stuck";
    return task.subtasks.length > 0 ? "awaitingApproval" : "draft";
  }
  const subs = task.subtasks;
  if (subs.length > 0 && subs.every((s) => s.state === "done")) return "done";
  if (subs.some((s) => s.state === "failed")) return "stuck";
  return "running";
}

export function withDerivedState(task: BoardTask): BoardTask {
  const state = deriveTaskState(task);
  return state === task.state ? task : { ...task, state };
}

/** Bağımlılık grafiği geçerli mi: kimlikler tekil, bağımlılık var ve kendisi değil, döngü yok. */
export function graphError(subtasks: readonly Pick<Subtask, "id" | "dependsOn">[]): "badDependency" | "cycle" | null {
  const ids = new Set(subtasks.map((s) => s.id));
  if (ids.size !== subtasks.length) return "badDependency";
  for (const s of subtasks) {
    for (const dep of s.dependsOn) if (dep === s.id || !ids.has(dep)) return "badDependency";
  }
  const byId = new Map(subtasks.map((s) => [s.id, s]));
  // 1: yolda, 2: bitti. En fazla 8 düğüm: özyineleme güvenli.
  const mark = new Map<string, 1 | 2>();
  const visit = (id: string): boolean => {
    const m = mark.get(id);
    if (m === 1) return true;
    if (m === 2) return false;
    mark.set(id, 1);
    for (const dep of byId.get(id)?.dependsOn ?? []) if (visit(dep)) return true;
    mark.set(id, 2);
    return false;
  };
  for (const s of subtasks) if (visit(s.id)) return "cycle";
  return null;
}

/** Onayla (spec §4): bağımlılığı olmayanlar ready, ötekiler waiting. Onaylanamıyorsa null. */
export function approveTask(task: BoardTask, now: number): BoardTask | null {
  if (task.approvedAt !== undefined || task.planning || task.subtasks.length === 0) return null;
  if (task.subtasks.some((s) => !s.title.trim() || !s.prompt.trim())) return null;
  if (graphError(task.subtasks)) return null;
  const next: BoardTask = {
    ...task,
    approvedAt: now,
    subtasks: task.subtasks.map((s) => ({ ...s, state: (s.dependsOn.length === 0 ? "ready" : "waiting") as SubtaskState }))
  };
  delete next.leadError;
  delete next.leadDetail;
  delete next.leadRaw;
  delete next.leadChangedFiles;
  return withDerivedState(next);
}

/** Bağımlılıklarının hepsi done olan waiting → ready; failed bağımlılık waiting bırakır (spec §5). */
export function advanceDependencies(task: BoardTask): BoardTask {
  if (task.approvedAt === undefined) return task;
  const done = new Set(task.subtasks.filter((s) => s.state === "done").map((s) => s.id));
  let changed = false;
  const subtasks = task.subtasks.map((s) => {
    if (s.state !== "waiting" || !s.dependsOn.every((dep) => done.has(dep))) return s;
    changed = true;
    return { ...s, state: "ready" as const };
  });
  return changed ? withDerivedState({ ...task, subtasks }) : task;
}

/** İstem yazıldı: running, ajan, deneme sayısı, gönderim anı. */
export function assignSubtask(sub: Subtask, paneId: string, now: number): Subtask {
  const next: Subtask = { ...sub, state: "running", paneId, attempts: sub.attempts + 1, dispatchedAt: now, sawBusy: false };
  delete next.held;
  delete next.note;
  return next;
}

function releaseToQueue(s: Subtask, note: SubtaskNote): Subtask {
  return { ...s, state: "ready", paneId: null, held: true, note, sawBusy: false };
}

function applyOne(s: Subtask, agents: ReadonlyMap<string, AgentStatus | null>): Subtask {
  if ((s.state !== "running" && s.state !== "asking") || !s.paneId) return s;
  if (!agents.has(s.paneId)) return releaseToQueue(s, "agentClosed");
  const status = agents.get(s.paneId) ?? null;
  if (!status) return s;
  // `finished` iki okuyucuda da "kabuk istemi geri döndü": motor kapandı (spec §7).
  if (status.state === "finished") return releaseToQueue(s, "agentClosed");
  if (status.state === "asking") return s.state === "asking" && s.sawBusy ? s : { ...s, state: "asking", sawBusy: true };
  if (status.state === "running") return s.state === "running" && s.sawBusy ? s : { ...s, state: "running", sawBusy: true };
  // Tahmini durumdan kendiliğinden geçiş yok (spec §6): kullanıcı "Doğrula"ya basar.
  if (status.source !== "exact") return s;
  if (status.state !== "idle" && status.state !== "error") return s;
  const afterDispatch = status.lastActivity !== null && s.dispatchedAt !== undefined && status.lastActivity > s.dispatchedAt;
  if (s.sawBusy !== true && !afterDispatch) return s;
  const next: Subtask = { ...s, state: "verifying" };
  if (status.state === "error") next.note = "agentError";
  else delete next.note;
  return next;
}

/** Atanmış alt görevlere ajanların durumunu uygular (spec §6, §7). */
export function applyAgentStatuses(
  task: BoardTask,
  agents: ReadonlyMap<string, AgentStatus | null>
): { task: BoardTask; toVerify: string[] } {
  if (task.approvedAt === undefined) return { task, toVerify: [] };
  const toVerify: string[] = [];
  let changed = false;
  const subtasks = task.subtasks.map((s) => {
    const next = applyOne(s, agents);
    if (next !== s) changed = true;
    if (next.state === "verifying" && s.state !== "verifying") toVerify.push(s.id);
    return next;
  });
  return { task: changed ? withDerivedState({ ...task, subtasks }) : task, toVerify };
}

/** Doğrulama sonucu. verifying olmayan alt göreve yazılmaz: sonuç geç gelmiş olabilir. */
export function applyProof(sub: Subtask, proof: Proof): Subtask {
  if (sub.state !== "verifying") return sub;
  const next: Subtask = { ...sub, state: proof.ok ? "done" : "failed", proof };
  if (!proof.ok && proof.commands.some((c) => c.timedOut)) next.note = "timeout";
  else delete next.note;
  return next;
}

export function manualProof(now: number): Proof {
  return { kind: "manual", commands: [], ok: true, at: now };
}

/** "Yeniden sıraya al": held ready ya da failed → ajansız ready. */
export function requeueSubtask(sub: Subtask): Subtask | null {
  if (!((sub.state === "ready" && sub.held) || sub.state === "failed")) return null;
  const next: Subtask = { ...sub, state: "ready", paneId: null, sawBusy: false };
  delete next.held;
  delete next.note;
  return next;
}

/** Uygulama yeniden açıldı (spec §7): yarıda kalanlar ready + held; kendiliğinden gönderme yok. */
export function restoreAfterRestart(task: BoardTask): BoardTask {
  const next: BoardTask = {
    ...task,
    subtasks: task.subtasks.map((s) => (isActiveSubtask(s) ? releaseToQueue(s, "restarted") : s))
  };
  delete next.planning;
  return withDerivedState(next);
}

/** Tek alt görevi değiştirir; bulunamazsa ya da `fn` null dönerse null. */
export function mapSubtask(task: BoardTask, subtaskId: string, fn: (s: Subtask) => Subtask | null): BoardTask | null {
  const index = task.subtasks.findIndex((s) => s.id === subtaskId);
  if (index < 0) return null;
  const next = fn(task.subtasks[index]);
  if (!next) return null;
  const subtasks = [...task.subtasks];
  subtasks[index] = next;
  return withDerivedState({ ...task, subtasks });
}
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/boardLogic.test.ts` ve `npm run typecheck`
Expected: PASS (bütün testler); typecheck temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/shared/boardTypes.ts app-electron/shared/boardLogic.ts tests/boardLogic.test.ts
git commit -m "Gorev Panosu: pano turleri ve saf durum gecisleri

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Lider istemi ve plan ayrıştırıcı (saf)

**Files:**
- Create: `app-electron/shared/boardPlan.ts`
- Test: `tests/boardPlan.test.ts`

**Interfaces:**
- Consumes: Task 1 `graphError`, `MAX_SUBTASKS`, `ROLE_HINT_MAX`, `SUBTASK_PROMPT_MAX`, `SUBTASK_TITLE_MAX`, `LeadErrorCode`.
- Produces:

```ts
export interface PlannedSubtask { title: string; prompt: string; roleHint: string; dependsOn: number[] } // 0'dan başlayan indeks
export type PlanResult = { ok: true; subtasks: PlannedSubtask[] } | { ok: false; error: LeadErrorCode };
export function extractFirstJsonObject(text: string): string | null;
export function parseLeadPlan(text: string): PlanResult;
export function buildLeadPrompt(input: { title: string; goal: string; roles: readonly string[] }): string;
```

- [ ] **Step 1: Kırmızı test** — `tests/boardPlan.test.ts`

```ts
// Lider istemi ve plan ayrıştırıcı (spec 2026-10-18 gorev-panosu §3, §7, §10). Saf.
import { describe, expect, it } from "vitest";
import { buildLeadPrompt, extractFirstJsonObject, parseLeadPlan } from "../app-electron/shared/boardPlan";

const plan = (subtasks: unknown[]) => JSON.stringify({ subtasks });
const item = (over: Record<string, unknown> = {}) => ({ title: "Veri modeli", prompt: "İade tablosunu ekle.", role: "", dependsOn: [], ...over });

describe("extractFirstJsonObject", () => {
  it("düz metindeki ilk nesne; öncesi ve sonrası atılıyor", () => {
    expect(extractFirstJsonObject('Plan şu: {"a":1} bitti {"b":2}')).toBe('{"a":1}');
  });

  it("```json bloğu önce; dize içindeki süslü parantez sayılmıyor", () => {
    const text = 'Açıklama {değil}\n```json\n{"subtasks":[{"title":"a } b","prompt":"x \\" {"}]}\n```\n';
    expect(extractFirstJsonObject(text)).toBe('{"subtasks":[{"title":"a } b","prompt":"x \\" {"}]}');
  });

  it("nesne yoksa ya da kapanmıyorsa null", () => {
    expect(extractFirstJsonObject("JSON yok")).toBeNull();
    expect(extractFirstJsonObject('{"subtasks": [')).toBeNull();
  });
});

describe("parseLeadPlan", () => {
  it("geçerli plan: alanlar, bağımlılıklar tekilleşiyor, rol ve başlık kırpılıyor", () => {
    const result = parseLeadPlan(
      "```json\n" +
        plan([
          item({ title: "A".repeat(85), role: "  geliştirici  " }),
          item({ title: "Test", prompt: "Testleri yaz.", role: "R".repeat(45), dependsOn: [0, 0] })
        ]) +
        "\n```"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtasks[0]).toEqual({ title: "A".repeat(80), prompt: "İade tablosunu ekle.", roleHint: "geliştirici", dependsOn: [] });
    expect(result.subtasks[1].roleHint).toBe("R".repeat(40));
    expect(result.subtasks[1].dependsOn).toEqual([0]);
  });

  it("rol ve dependsOn yazılmamışsa boş", () => {
    const result = parseLeadPlan(plan([{ title: "A", prompt: "B" }]));
    expect(result).toEqual({ ok: true, subtasks: [{ title: "A", prompt: "B", roleHint: "", dependsOn: [] }] });
  });

  it("JSON yok / bozuk JSON", () => {
    expect(parseLeadPlan("Bu hedefi bölemem.")).toEqual({ ok: false, error: "noJson" });
    expect(parseLeadPlan("{subtasks: [}")).toEqual({ ok: false, error: "badJson" });
  });

  it("dizi yok, boş ya da 8'den fazla", () => {
    expect(parseLeadPlan('{"plan": []}')).toEqual({ ok: false, error: "noSubtasks" });
    expect(parseLeadPlan(plan([]))).toEqual({ ok: false, error: "noSubtasks" });
    expect(parseLeadPlan(plan(Array.from({ length: 9 }, () => item())))).toEqual({ ok: false, error: "tooMany" });
  });

  it("alan hataları: boş istem, 4000'i aşan istem, nesne olmayan öğe, sayı rol", () => {
    expect(parseLeadPlan(plan([item({ prompt: "   " })]))).toEqual({ ok: false, error: "badField" });
    expect(parseLeadPlan(plan([item({ prompt: "x".repeat(4001) })]))).toEqual({ ok: false, error: "badField" });
    expect(parseLeadPlan(plan(["metin"]))).toEqual({ ok: false, error: "badField" });
    expect(parseLeadPlan(plan([item({ role: 3 })]))).toEqual({ ok: false, error: "badField" });
  });

  it("geçersiz bağımlılık: aralık dışı, kendisi, dize indeks, dizi değil", () => {
    expect(parseLeadPlan(plan([item({ dependsOn: [1] })]))).toEqual({ ok: false, error: "badDependency" });
    expect(parseLeadPlan(plan([item(), item({ dependsOn: [1] })]))).toEqual({ ok: false, error: "badDependency" });
    expect(parseLeadPlan(plan([item(), item({ dependsOn: ["0"] })]))).toEqual({ ok: false, error: "badDependency" });
    expect(parseLeadPlan(plan([item({ dependsOn: 0 })]))).toEqual({ ok: false, error: "badDependency" });
  });

  it("döngü", () => {
    expect(parseLeadPlan(plan([item({ dependsOn: [1] }), item({ dependsOn: [0] })]))).toEqual({ ok: false, error: "cycle" });
  });
});

describe("buildLeadPrompt", () => {
  it("başlık, hedef, kurallar ve tekilleşmiş roller", () => {
    const text = buildLeadPrompt({ title: "İade", goal: "Ödeme modülüne iade akışı ekle", roles: ["coder", " coder ", "", "test"] });
    expect(text).toContain("İade");
    expect(text).toContain("Ödeme modülüne iade akışı ekle");
    expect(text).toContain("Dosya DEĞİŞTİRME, yalnız oku ve planla.");
    expect(text).toContain('{"subtasks":[{"title":"…","prompt":"…","role":"…","dependsOn":[0]}]}');
    expect(text).toContain("En fazla 8 alt görev");
    expect(text).toContain("rolleri: coder, test");
  });

  it("rol yoksa açıkça yazıyor", () => {
    expect(buildLeadPrompt({ title: "A", goal: "B", roles: [] })).toContain("(rol tanımlı değil)");
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardPlan.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/shared/boardPlan"`.

- [ ] **Step 3: Uygulama** — `app-electron/shared/boardPlan.ts`

```ts
// Lider (spec 2026-10-18 gorev-panosu §3): istem kurucu ve plan
// ayrıştırıcı. SAF. Bölmeyi yapay zekâ yapıyor; buradan sonrası kod.
// Cevaptaki ilk JSON nesnesi (```json bloğu önce) alınıyor ve şemadan
// geçiyor. Yapısal hata planı reddediyor; görünüm sınırları (başlık, rol)
// kırpılıyor: 85 karakterlik başlık bütün planı çöpe attırmamalı.
import { graphError } from "./boardLogic";
import { MAX_SUBTASKS, ROLE_HINT_MAX, SUBTASK_PROMPT_MAX, SUBTASK_TITLE_MAX, type LeadErrorCode } from "./boardTypes";

export interface PlannedSubtask {
  title: string;
  prompt: string;
  roleHint: string;
  /** Aynı listedeki alt görevlerin 0'dan başlayan indeksleri. */
  dependsOn: number[];
}

export type PlanResult = { ok: true; subtasks: PlannedSubtask[] } | { ok: false; error: LeadErrorCode };

/** `start`taki `{` ile dengelenen nesnenin bittiği yer (hariç); dengelenmiyorsa -1. */
function balancedEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** Cevaptaki ilk JSON nesnesinin metni: önce ``` bloğu, sonra düz metin. */
export function extractFirstJsonObject(text: string): string | null {
  const fence = /```(?:json)?[ \t]*\r?\n?([\s\S]*?)```/i.exec(text);
  const sources = fence ? [fence[1], text] : [text];
  for (const source of sources) {
    const start = source.indexOf("{");
    if (start < 0) continue;
    const end = balancedEnd(source, start);
    if (end > 0) return source.slice(start, end);
  }
  return null;
}

const fail = (error: LeadErrorCode): PlanResult => ({ ok: false, error });

export function parseLeadPlan(text: string): PlanResult {
  const json = extractFirstJsonObject(text);
  if (!json) return fail("noJson");
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail("badJson");
  }
  const list = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).subtasks : undefined;
  if (!Array.isArray(list) || list.length === 0) return fail("noSubtasks");
  if (list.length > MAX_SUBTASKS) return fail("tooMany");
  const subtasks: PlannedSubtask[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const raw: unknown = list[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail("badField");
    const record = raw as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const prompt = typeof record.prompt === "string" ? record.prompt.trim() : "";
    if (!title || !prompt || prompt.length > SUBTASK_PROMPT_MAX) return fail("badField");
    if (record.role !== undefined && record.role !== null && typeof record.role !== "string") return fail("badField");
    const roleHint = typeof record.role === "string" ? record.role.trim().slice(0, ROLE_HINT_MAX).trim() : "";
    const rawDeps: unknown = record.dependsOn ?? [];
    if (!Array.isArray(rawDeps)) return fail("badDependency");
    const dependsOn: number[] = [];
    for (const dep of rawDeps as unknown[]) {
      if (typeof dep !== "number" || !Number.isInteger(dep) || dep < 0 || dep >= list.length || dep === i) return fail("badDependency");
      if (!dependsOn.includes(dep)) dependsOn.push(dep);
    }
    subtasks.push({ title: title.slice(0, SUBTASK_TITLE_MAX).trim(), prompt, roleHint, dependsOn });
  }
  const graph = graphError(subtasks.map((s, i) => ({ id: String(i), dependsOn: s.dependsOn.map(String) })));
  if (graph) return fail(graph);
  return { ok: true, subtasks };
}

/** Liderin istemi (spec §3): hedef + kurallar + alandaki roller. */
export function buildLeadPrompt(input: { title: string; goal: string; roles: readonly string[] }): string {
  const roles = [...new Set(input.roles.map((r) => r.trim()).filter(Boolean))];
  return [
    `Görev: ${input.title.trim()}`,
    "Hedef:",
    input.goal.trim(),
    "",
    `Alandaki ajanların rolleri: ${roles.length ? roles.join(", ") : "(rol tanımlı değil)"}`,
    "",
    "Kurallar:",
    "- Dosya DEĞİŞTİRME, yalnız oku ve planla.",
    '- Cevabın yalnız şu JSON olsun: {"subtasks":[{"title":"…","prompt":"…","role":"…","dependsOn":[0]}]}',
    `- En fazla ${MAX_SUBTASKS} alt görev. "dependsOn" aynı listedeki alt görevlerin 0'dan başlayan indeksleri; döngü olmasın.`,
    '- Her "prompt" tek başına anlaşılır olsun: ajan hedefi ve öteki alt görevleri görmüyor.',
    '- "role" yukarıdaki rollerden biri olsun ya da boş kalsın.',
    `- "title" en fazla ${SUBTASK_TITLE_MAX}, "prompt" en fazla ${SUBTASK_PROMPT_MAX} karakter.`
  ].join("\n");
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/boardPlan.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/shared/boardPlan.ts tests/boardPlan.test.ts
git commit -m "Gorev Panosu: lider istemi ve plan ayristirici

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Saf dağıtıcı ve IPC komut doğrulayıcısı

**Files:**
- Create: `app-electron/shared/boardDispatch.ts`
- Create: `app-electron/shared/boardCommands.ts`
- Test: `tests/boardDispatch.test.ts`, `tests/boardCommands.test.ts`

**Interfaces:**
- Consumes: Task 1 `isActiveSubtask`, `BoardTask`, `Proof`, sınırlar; `AgentStatus`.
- Produces:

```ts
// boardDispatch.ts
export interface AgentInfo { paneId: string; workspaceId: string; role: string; status: AgentStatus | null; inputIdle: boolean }
export type AssignMode = "auto" | "manual";
export interface Dispatch { taskId: string; subtaskId: string; paneId: string }
export function engineRunning(agent: AgentInfo): boolean;
export function busyPanes(tasks: readonly BoardTask[]): Set<string>;
export function agentEligible(agent: AgentInfo, busy: ReadonlySet<string>, mode: AssignMode): boolean;
export function planDispatch(tasks: readonly BoardTask[], workspaceId: string, agents: readonly AgentInfo[]): Dispatch[];
export function foldRole(role: string): string;
export function toPromptLine(text: string): string;
export function sendBackPrompt(proof: Proof): string | null;

// boardCommands.ts
export interface SubtaskDraft { id: string; title: string; prompt: string; roleHint: string; dependsOn: string[] }
export type BoardCommand =
  | { type: "createTask"; title: string; goal: string }
  | { type: "split"; taskId: string }
  | { type: "saveDraft"; taskId: string; title: string; goal: string; subtasks: SubtaskDraft[] }
  | { type: "approve"; taskId: string }
  | { type: "assign"; taskId: string; subtaskId: string; paneId: string }
  | { type: "verify"; taskId: string; subtaskId: string }
  | { type: "approveManual"; taskId: string; subtaskId: string }
  | { type: "sendBack"; taskId: string; subtaskId: string }
  | { type: "requeue"; taskId: string; subtaskId: string }
  | { type: "deleteTask"; taskId: string }
  | { type: "dismissWarning" };
export type BoardFailure = "invalid" | "noBoard" | "noTask" | "noSubtask" | "badState" | "limit" | "badDependency" | "cycle"
  | "notEligible" | "typing" | "noVerify" | "hasVerify" | "writeFailed";
export type BoardCommandResult = { ok: true; taskId?: string } | { ok: false; reason: BoardFailure };
export const BOARD_FAILURES: readonly BoardFailure[];
export function isBoardId(value: unknown): value is string;           // ^[A-Za-z0-9_-]{1,100}$
export function readBoardCommand(raw: unknown): BoardCommand | null;
```

Uygunluk (spec §5): 1 aynı alan (`workspaceId`) ve izleyiciye kayıtlı ajan bölmesi (düz kabuk hiç kaydolmuyor); 2 `engineRunning` (durum var, `finished` değil); 3 `idle` — kendiliğinden dağıtımda yalnız kesin ya da `lastActivity === null` ("boşta ≈"), elle atamada tahmini de; 4 `busyPanes`'te değil ve alt görev `held` değil; 5 `inputIdle`; 6 yalnız kendiliğinden: rol ipucu doluysa `foldRole` eşleşeni önce.

- [ ] **Step 1: Kırmızı test (dağıtıcı)** — `tests/boardDispatch.test.ts`

```ts
// Saf dağıtıcı (spec 2026-10-18 gorev-panosu §5, §6). Uygunluk 1–6, motor
// kapalıyken yazmama, yazma koruması, rol eşleşmesi, istem satırı.
import { describe, expect, it } from "vitest";
import {
  agentEligible,
  busyPanes,
  foldRole,
  planDispatch,
  sendBackPrompt,
  toPromptLine,
  type AgentInfo
} from "../app-electron/shared/boardDispatch";
import type { BoardTask, Subtask } from "../app-electron/shared/boardTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

const idleExact: AgentStatus = { state: "idle", source: "exact", lastActivity: 5_000 };
const agent = (paneId: string, over: Partial<AgentInfo> = {}): AgentInfo => ({
  paneId,
  workspaceId: "w1",
  role: "",
  status: idleExact,
  inputIdle: true,
  ...over
});
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
const task = (id: string, subtasks: Subtask[], createdAt = 1): BoardTask => ({
  id,
  title: id,
  goal: "",
  state: "running",
  createdAt,
  approvedAt: createdAt,
  subtasks
});

describe("agentEligible", () => {
  const none = new Set<string>();

  it("2: motor kapalı (finished) ya da durum yok → uygun değil", () => {
    expect(agentEligible(agent("p1", { status: { state: "finished", source: "exact", lastActivity: 1 } }), none, "auto")).toBe(false);
    expect(agentEligible(agent("p1", { status: { state: "finished", source: "estimated", lastActivity: 1 } }), none, "manual")).toBe(false);
    expect(agentEligible(agent("p1", { status: null }), none, "manual")).toBe(false);
  });

  it("3: çalışıyor / soru soruyor / hata → uygun değil; kesin boşta uygun", () => {
    for (const state of ["running", "asking", "error", "unknown"] as const) {
      expect(agentEligible(agent("p1", { status: { state, source: "exact", lastActivity: 1 } }), none, "manual")).toBe(false);
    }
    expect(agentEligible(agent("p1"), none, "auto")).toBe(true);
  });

  it("3: tahmini boşta yalnız elle uygun; başlangıçtaki 'boşta ≈' kendiliğinden de uygun", () => {
    const quiet = agent("p1", { status: { state: "idle", source: "estimated", lastActivity: 9_000 } });
    expect(agentEligible(quiet, none, "auto")).toBe(false);
    expect(agentEligible(quiet, none, "manual")).toBe(true);
    const fresh = agent("p1", { status: { state: "idle", source: "estimated", lastActivity: null } });
    expect(agentEligible(fresh, none, "auto")).toBe(true);
  });

  it("4: başka alt göreve atanmış ajan uygun değil", () => {
    expect(agentEligible(agent("p1"), new Set(["p1"]), "manual")).toBe(false);
  });

  it("5: kullanıcı o bölmede yazıyorsa uygun değil", () => {
    expect(agentEligible(agent("p1", { inputIdle: false }), none, "manual")).toBe(false);
  });
});

describe("busyPanes", () => {
  it("running/asking/verifying alt görevlerin ajanları; failed ve done meşgul sayılmıyor", () => {
    const t = task("t", [
      sub("a", { state: "running", paneId: "p1" }),
      sub("b", { state: "asking", paneId: "p2" }),
      sub("c", { state: "verifying", paneId: "p3" }),
      sub("d", { state: "failed", paneId: "p4" }),
      sub("e", { state: "done", paneId: "p5" })
    ]);
    expect([...busyPanes([t])].sort()).toEqual(["p1", "p2", "p3"]);
  });
});

describe("planDispatch", () => {
  it("bir turda bir ajana tek alt görev", () => {
    const out = planDispatch([task("t", [sub("a"), sub("b")])], "w1", [agent("p1")]);
    expect(out).toEqual([{ taskId: "t", subtaskId: "a", paneId: "p1" }]);
  });

  it("1: başka alandaki ajan seçilmiyor", () => {
    expect(planDispatch([task("t", [sub("a")])], "w1", [agent("p9", { workspaceId: "w2" })])).toEqual([]);
  });

  it("4: held, waiting ve onaysız görevin alt görevleri dağıtılmıyor; meşgul ajan atlanıyor", () => {
    const draft: BoardTask = { ...task("d", [sub("x")]), approvedAt: undefined, state: "awaitingApproval" };
    const busy = task("b", [sub("r", { state: "running", paneId: "p1" })]);
    const out = planDispatch([draft, busy, task("t", [sub("h", { held: true }), sub("w", { state: "waiting" })])], "w1", [agent("p1")]);
    expect(out).toEqual([]);
  });

  it("6: rol ipucu büyük/küçük harf ve Türkçe İ/ı duyarsız eşleşiyor; eşleşen yoksa herhangi biri", () => {
    const agents = [agent("p1", { role: "coder" }), agent("p2", { role: "İnceleme" })];
    expect(planDispatch([task("t", [sub("a", { roleHint: "inceleme" })])], "w1", agents)[0].paneId).toBe("p2");
    expect(planDispatch([task("t", [sub("a", { roleHint: "analist" })])], "w1", agents)[0].paneId).toBe("p1");
    expect(foldRole(" INTEGRATION ")).toBe(foldRole("integration"));
  });

  it("eski görev önce", () => {
    const out = planDispatch([task("yeni", [sub("y")], 20), task("eski", [sub("e")], 10)], "w1", [agent("p1")]);
    expect(out).toEqual([{ taskId: "eski", subtaskId: "e", paneId: "p1" }]);
  });

  it("motoru kapalı ajan uygun değil: hiçbir dağıtım üretilmiyor", () => {
    const shell = agent("p1", { status: { state: "finished", source: "estimated", lastActivity: 1 } });
    expect(planDispatch([task("t", [sub("a")])], "w1", [shell])).toEqual([]);
  });
});

describe("toPromptLine ve sendBackPrompt", () => {
  it("satır sonları ve denetim karakterleri boşluğa; tek satır, ≤ 4000", () => {
    expect(toPromptLine("  Birinci satır\r\nİkinci\tsatır\x1b[31m kırmızı\x03 \n")).toBe("Birinci satır İkinci satır [31m kırmızı");
    expect(toPromptLine("x".repeat(5000)).length).toBe(4000);
  });

  it("geri gönderme istemi: ilk kırmızı komut ve çıktının sonu, tek satır", () => {
    const text = sendBackPrompt({
      kind: "commands",
      ok: false,
      at: 1,
      commands: [
        { command: "npm run lint", exitCode: 0, durationMs: 1, tail: "temiz" },
        { command: "npm test", exitCode: 1, durationMs: 1, tail: "FAIL a.test.ts\n  beklenen 2" }
      ]
    })!;
    expect(text).toBe("Doğrulama başarısız: npm test çıktısının sonu: FAIL a.test.ts beklenen 2 Düzelt.");
    expect(text).not.toMatch(/[\r\n]/);
  });

  it("uzun çıktı 4000'e sığacak şekilde baştan kırpılıyor; kırmızı komut yoksa null", () => {
    const text = sendBackPrompt({ kind: "commands", ok: false, at: 1, commands: [{ command: "x", exitCode: null, durationMs: 1, tail: "y".repeat(9000), timedOut: true }] })!;
    expect(text.length).toBeLessThanOrEqual(4000);
    expect(text.endsWith("Düzelt.")).toBe(true);
    expect(sendBackPrompt({ kind: "manual", ok: true, at: 1, commands: [] })).toBeNull();
  });
});
```

- [ ] **Step 2: Kırmızı test (komutlar)** — `tests/boardCommands.test.ts`

```ts
// Pano IPC komut doğrulayıcısı (spec 2026-10-18 gorev-panosu; Global
// Constraints: renderer'dan gelen veri ana süreçte doğrulanır).
import { describe, expect, it } from "vitest";
import { isBoardId, readBoardCommand } from "../app-electron/shared/boardCommands";

const draft = (over: Record<string, unknown> = {}) => ({ id: "s1", title: "A", prompt: "B", roleHint: "", dependsOn: [], ...over });

describe("isBoardId", () => {
  it("UUID ve basit kimlik geçiyor; yol parçası, boş, uzun ve dize olmayan reddediliyor", () => {
    expect(isBoardId("3f2a1c9e-1b2c-4d5e-8f90-123456789abc")).toBe(true);
    for (const bad of ["", "..", "../x", "a/b", "a\\b", "C:", "x".repeat(101), 5, null]) expect(isBoardId(bad)).toBe(false);
  });
});

describe("readBoardCommand", () => {
  it("geçerli komutlar olduğu gibi geliyor", () => {
    expect(readBoardCommand({ type: "createTask", title: " İade ", goal: "Hedef" })).toEqual({ type: "createTask", title: "İade", goal: "Hedef" });
    expect(readBoardCommand({ type: "assign", taskId: "t1", subtaskId: "s1", paneId: "p1" })).toEqual({ type: "assign", taskId: "t1", subtaskId: "s1", paneId: "p1" });
    expect(readBoardCommand({ type: "dismissWarning" })).toEqual({ type: "dismissWarning" });
    expect(readBoardCommand({ type: "saveDraft", taskId: "t1", title: "A", goal: "", subtasks: [draft({ dependsOn: ["s0"] })] })).toEqual({
      type: "saveDraft",
      taskId: "t1",
      title: "A",
      goal: "",
      subtasks: [draft({ dependsOn: ["s0"] })]
    });
  });

  it("bilinmeyen tür, eksik kimlik, yol parçası kimlik reddediliyor", () => {
    expect(readBoardCommand({ type: "rm -rf" })).toBeNull();
    expect(readBoardCommand({ type: "approve" })).toBeNull();
    expect(readBoardCommand({ type: "approve", taskId: "../x" })).toBeNull();
    expect(readBoardCommand(null)).toBeNull();
  });

  it("sınırlar: boş ya da 80'i aşan başlık, 2000'i aşan hedef, 8'i aşan alt görev, 4000'i aşan istem, 40'ı aşan rol", () => {
    expect(readBoardCommand({ type: "createTask", title: "   ", goal: "" })).toBeNull();
    expect(readBoardCommand({ type: "createTask", title: "x".repeat(81), goal: "" })).toBeNull();
    expect(readBoardCommand({ type: "createTask", title: "a", goal: "x".repeat(2001) })).toBeNull();
    const save = (subtasks: unknown[]) => readBoardCommand({ type: "saveDraft", taskId: "t1", title: "A", goal: "", subtasks });
    expect(save(Array.from({ length: 9 }, (_, i) => draft({ id: `s${i}` })))).toBeNull();
    expect(save([draft({ prompt: "x".repeat(4001) })])).toBeNull();
    expect(save([draft({ roleHint: "x".repeat(41) })])).toBeNull();
    expect(save([draft({ dependsOn: ["../x"] })])).toBeNull();
    expect(save([draft({ id: 3 })])).toBeNull();
  });

  it("taslakta boş başlık/istem kabul (onay ayrıca denetliyor)", () => {
    expect(readBoardCommand({ type: "saveDraft", taskId: "t1", title: "A", goal: "", subtasks: [draft({ title: "", prompt: "" })] })).not.toBeNull();
  });
});
```

- [ ] **Step 3: Kırmızıyı gör**

Run: `npx vitest run tests/boardDispatch.test.ts tests/boardCommands.test.ts`
Expected: FAIL — iki modül de çözülemiyor.

- [ ] **Step 4: Dağıtıcı** — `app-electron/shared/boardDispatch.ts`

```ts
// Görev panosunun SAF dağıtıcısı (spec 2026-10-18 gorev-panosu §5, §6).
// Yazmıyor; yalnız "hangi alt görev hangi ajana" diyor. Yazma ana süreçte
// izleyicinin `sendPrompt`'unda ve orada yeniden denetleniyor. Motor
// çalışmıyorsa (kabuk istemi ekranda) ajan HİÇBİR modda uygun değil: yapay
// zekâ metni asla cmd/PowerShell komutu olarak çalışmamalı.
import type { AgentStatus } from "./agentTypes";
import { isActiveSubtask } from "./boardLogic";
import { SUBTASK_PROMPT_MAX, type BoardTask, type Proof } from "./boardTypes";

export interface AgentInfo {
  paneId: string;
  workspaceId: string;
  role: string;
  status: AgentStatus | null;
  /** Kullanıcı o bölmede yazmıyor: Enter'a basılmamış taslak yok, son tuş TYPING_GUARD_MS'den eski. */
  inputIdle: boolean;
}

export type AssignMode = "auto" | "manual";

export interface Dispatch {
  taskId: string;
  subtaskId: string;
  paneId: string;
}

/** 2. koşul: kayıtlı, durumu biliniyor ve motor kapanmamış (`finished` = kabuk istemi geri döndü). */
export function engineRunning(agent: AgentInfo): boolean {
  return agent.status !== null && agent.status.state !== "finished";
}

/** 4. koşul: başka bir alt görevin üstünde çalışan/doğrulanan ajanlar. */
export function busyPanes(tasks: readonly BoardTask[]): Set<string> {
  const out = new Set<string>();
  for (const task of tasks) {
    for (const s of task.subtasks) if (s.paneId && isActiveSubtask(s)) out.add(s.paneId);
  }
  return out;
}

/** 2–5. koşullar. Kendiliğinden dağıtımda tahmini "boşta" yalnız başlangıçtaki (lastActivity yok) hâl. */
export function agentEligible(agent: AgentInfo, busy: ReadonlySet<string>, mode: AssignMode): boolean {
  if (!engineRunning(agent) || !agent.inputIdle || busy.has(agent.paneId)) return false;
  const status = agent.status as AgentStatus;
  if (status.state !== "idle") return false;
  return mode === "manual" || status.source === "exact" || status.lastActivity === null;
}

/** Rol karşılaştırması: büyük/küçük harf ve Türkçe İ/ı duyarsız. */
export function foldRole(role: string): string {
  return role.trim().toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
}

/** Kendiliğinden dağıtım turu: eski görev önce, her ajana en fazla bir alt görev. */
export function planDispatch(tasks: readonly BoardTask[], workspaceId: string, agents: readonly AgentInfo[]): Dispatch[] {
  const busy = busyPanes(tasks);
  const used = new Set<string>();
  const pool = agents.filter((a) => a.workspaceId === workspaceId);
  const out: Dispatch[] = [];
  const ordered = tasks.filter((t) => t.approvedAt !== undefined).sort((a, b) => a.createdAt - b.createdAt);
  for (const task of ordered) {
    for (const sub of task.subtasks) {
      if (sub.state !== "ready" || sub.held) continue;
      const eligible = pool.filter((a) => !used.has(a.paneId) && agentEligible(a, busy, "auto"));
      if (eligible.length === 0) return out;
      const hint = foldRole(sub.roleHint);
      const pick = (hint ? eligible.find((a) => foldRole(a.role) === hint) : undefined) ?? eligible[0];
      used.add(pick.paneId);
      out.push({ taskId: task.id, subtaskId: sub.id, paneId: pick.paneId });
    }
  }
  return out;
}

/** Ajana yazılacak tek satır: satır sonu ve denetim karakteri yok, ≤ 4000. `\r` yazan izleyici. */
export function toPromptLine(text: string): string {
  return text
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SUBTASK_PROMPT_MAX);
}

/** "Düzeltmeye geri gönder" istemi (spec §6): ilk kırmızı komut ve çıktısının sonu. */
export function sendBackPrompt(proof: Proof): string | null {
  const failed = proof.commands.find((c) => c.timedOut || c.error !== undefined || c.exitCode !== 0);
  if (!failed) return null;
  const head = `Doğrulama başarısız: ${toPromptLine(failed.command)} çıktısının sonu: `;
  const end = " Düzelt.";
  const room = Math.max(0, SUBTASK_PROMPT_MAX - head.length - end.length);
  const tail = toPromptLine(failed.tail);
  return toPromptLine(`${head}${room > 0 ? tail.slice(-room) : ""}${end}`);
}
```

- [ ] **Step 5: Komut doğrulayıcısı** — `app-electron/shared/boardCommands.ts`

```ts
// Pano IPC komutları (spec 2026-10-18 gorev-panosu). Renderer'dan gelen her
// komut ana süreçte buradan geçiyor: tür, kimlik deseni, sınırlar. Kimlik
// deseni dosya adına da giriyor (boards/<workspaceId>.json): yol parçası
// hiçbir koşulda geçmemeli.
import {
  MAX_SUBTASKS,
  ROLE_HINT_MAX,
  SUBTASK_PROMPT_MAX,
  SUBTASK_TITLE_MAX,
  TASK_GOAL_MAX,
  TASK_TITLE_MAX
} from "./boardTypes";

export interface SubtaskDraft {
  id: string;
  title: string;
  prompt: string;
  roleHint: string;
  dependsOn: string[];
}

export type BoardCommand =
  | { type: "createTask"; title: string; goal: string }
  | { type: "split"; taskId: string }
  | { type: "saveDraft"; taskId: string; title: string; goal: string; subtasks: SubtaskDraft[] }
  | { type: "approve"; taskId: string }
  | { type: "assign"; taskId: string; subtaskId: string; paneId: string }
  | { type: "verify"; taskId: string; subtaskId: string }
  | { type: "approveManual"; taskId: string; subtaskId: string }
  | { type: "sendBack"; taskId: string; subtaskId: string }
  | { type: "requeue"; taskId: string; subtaskId: string }
  | { type: "deleteTask"; taskId: string }
  | { type: "dismissWarning" };

export type BoardFailure =
  | "invalid"
  | "noBoard"
  | "noTask"
  | "noSubtask"
  | "badState"
  | "limit"
  | "badDependency"
  | "cycle"
  | "notEligible"
  | "typing"
  | "noVerify"
  | "hasVerify"
  | "writeFailed";

export const BOARD_FAILURES: readonly BoardFailure[] = [
  "invalid",
  "noBoard",
  "noTask",
  "noSubtask",
  "badState",
  "limit",
  "badDependency",
  "cycle",
  "notEligible",
  "typing",
  "noVerify",
  "hasVerify",
  "writeFailed"
];

export type BoardCommandResult = { ok: true; taskId?: string } | { ok: false; reason: BoardFailure };

const ID = /^[A-Za-z0-9_-]{1,100}$/;

export function isBoardId(value: unknown): value is string {
  return typeof value === "string" && ID.test(value);
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function readDraft(raw: unknown): SubtaskDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = text(r.title, SUBTASK_TITLE_MAX);
  const prompt = text(r.prompt, SUBTASK_PROMPT_MAX);
  const roleHint = text(r.roleHint, ROLE_HINT_MAX);
  if (!isBoardId(r.id) || title === null || prompt === null || roleHint === null) return null;
  if (!Array.isArray(r.dependsOn) || r.dependsOn.length > MAX_SUBTASKS || !r.dependsOn.every(isBoardId)) return null;
  return { id: r.id, title, prompt, roleHint, dependsOn: [...(r.dependsOn as string[])] };
}

export function readBoardCommand(raw: unknown): BoardCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const sub = (type: "verify" | "approveManual" | "sendBack" | "requeue"): BoardCommand | null =>
    isBoardId(r.taskId) && isBoardId(r.subtaskId) ? { type, taskId: r.taskId, subtaskId: r.subtaskId } : null;
  switch (r.type) {
    case "createTask": {
      const title = text(r.title, TASK_TITLE_MAX);
      const goal = text(r.goal, TASK_GOAL_MAX);
      return title && goal !== null ? { type: "createTask", title, goal } : null;
    }
    case "split":
    case "approve":
    case "deleteTask":
      return isBoardId(r.taskId) ? { type: r.type, taskId: r.taskId } : null;
    case "saveDraft": {
      const title = text(r.title, TASK_TITLE_MAX);
      const goal = text(r.goal, TASK_GOAL_MAX);
      if (!isBoardId(r.taskId) || !title || goal === null) return null;
      if (!Array.isArray(r.subtasks) || r.subtasks.length > MAX_SUBTASKS) return null;
      const subtasks: SubtaskDraft[] = [];
      for (const item of r.subtasks as unknown[]) {
        const draft = readDraft(item);
        if (!draft) return null;
        subtasks.push(draft);
      }
      return { type: "saveDraft", taskId: r.taskId, title, goal, subtasks };
    }
    case "assign":
      return isBoardId(r.taskId) && isBoardId(r.subtaskId) && isBoardId(r.paneId)
        ? { type: "assign", taskId: r.taskId, subtaskId: r.subtaskId, paneId: r.paneId }
        : null;
    case "verify":
    case "approveManual":
    case "sendBack":
    case "requeue":
      return sub(r.type);
    case "dismissWarning":
      return { type: "dismissWarning" };
    default:
      return null;
  }
}
```

Not (`toPromptLine` testi): `"  Birinci satır\r\nİkinci\tsatır\x1b[31m kırmızı\x03 \n"` → denetim karakterleri (`\r\n`, `\t`, `\x1b`, `\x03`) boşluğa, sonra boşluklar teke: `"Birinci satır İkinci satır [31m kırmızı"`. ESC atıldığı için `[31m` metin olarak kalıyor — kaçış dizisi değil, zararsız; test bunu sabitliyor.

- [ ] **Step 6: Yeşili gör**

Run: `npx vitest run tests/boardDispatch.test.ts tests/boardCommands.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 7: Commit**

```bash
git add app-electron/shared/boardDispatch.ts app-electron/shared/boardCommands.ts tests/boardDispatch.test.ts tests/boardCommands.test.ts
git commit -m "Gorev Panosu: saf dagitici ve IPC komut dogrulayicisi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pano deposu (dosya okuma/yazma, bozuk dosya, silme)

**Files:**
- Create: `app-electron/main/boardStore.ts`
- Test: `tests/boardStore.test.ts`

**Interfaces:**
- Consumes: Task 1 türler/sınırlar ve `restoreAfterRestart`; Task 3 `isBoardId`.
- Produces:

```ts
export interface BoardFileResult { tasks: BoardTask[]; recoveredFrom?: string; unreadable?: boolean }
export function boardFile(dir: string, workspaceId: string): string | null;            // geçersiz kimlikte null
export function readTasks(raw: unknown): BoardTask[] | null;                            // yapı bozuksa null
export function readBoardFile(dir: string, workspaceId: string, now: number): BoardFileResult;
export function writeBoardFile(dir: string, workspaceId: string, tasks: readonly BoardTask[]): boolean;
export function deleteBoardFile(dir: string, workspaceId: string): void;
export function listBoardIds(dir: string): string[];
```

Dosya biçimi: `{ "version": 1, "tasks": [...] }`; `planning` diske yazılmaz. Okurken her görev `restoreAfterRestart`'tan geçer (spec §7). Electron içe aktarılmıyor: klasör parametre (canlı klasör Task 9'da `userData/boards`).

- [ ] **Step 1: Kırmızı test** — `tests/boardStore.test.ts`

```ts
// Pano deposu (spec 2026-10-18 gorev-panosu §2, §7, §10). Gerçek geçici klasör.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  boardFile,
  deleteBoardFile,
  listBoardIds,
  readBoardFile,
  readTasks,
  writeBoardFile
} from "../app-electron/main/boardStore";
import type { BoardTask } from "../app-electron/shared/boardTypes";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "pano-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const WS = "3f2a1c9e-1b2c-4d5e-8f90-123456789abc";
const task = (over: Partial<BoardTask> = {}): BoardTask => ({
  id: "t1",
  title: "İade",
  goal: "Hedef",
  state: "running",
  createdAt: 5,
  approvedAt: 6,
  subtasks: [
    { id: "a", title: "A", prompt: "İstem A", roleHint: "", dependsOn: [], state: "done", paneId: "p1", attempts: 1 },
    { id: "b", title: "B", prompt: "İstem B", roleHint: "test", dependsOn: ["a"], state: "running", paneId: "p2", attempts: 1, dispatchedAt: 9 }
  ],
  ...over
});

describe("boardFile", () => {
  it("geçerli kimlik klasörün içinde; yol parçası reddediliyor", () => {
    expect(boardFile(dir, WS)).toBe(path.join(dir, `${WS}.json`));
    for (const bad of ["../x", "..", "a\\b", "C:x", ""]) expect(boardFile(dir, bad)).toBeNull();
  });
});

describe("yazma ve okuma", () => {
  it("dosya yoksa boş pano", () => {
    expect(readBoardFile(dir, WS, 1)).toEqual({ tasks: [] });
  });

  it("gidiş-dönüş: planning yazılmıyor; yarıda kalan alt görev ready + held + restarted", () => {
    expect(writeBoardFile(dir, WS, [task({ planning: true })])).toBe(true);
    const raw = JSON.parse(readFileSync(boardFile(dir, WS)!, "utf-8"));
    expect(raw.version).toBe(1);
    expect("planning" in raw.tasks[0]).toBe(false);
    const { tasks } = readBoardFile(dir, WS, 1);
    expect(tasks[0].subtasks[0].state).toBe("done");
    expect(tasks[0].subtasks[1]).toMatchObject({ state: "ready", held: true, note: "restarted", paneId: null });
    expect(tasks[0].state).toBe("running");
  });

  it("geçici dosya kalmıyor; klasör yoksa oluşturuluyor", () => {
    const nested = path.join(dir, "boards");
    expect(writeBoardFile(nested, WS, [])).toBe(true);
    expect(readdirSync(nested)).toEqual([`${WS}.json`]);
  });

  it("geçersiz kimlikle yazma false, okuma boş", () => {
    expect(writeBoardFile(dir, "../x", [task()])).toBe(false);
    expect(readBoardFile(dir, "../x", 1)).toEqual({ tasks: [] });
  });
});

describe("bozuk dosya", () => {
  it("JSON değilse .bozuk-<zaman> olarak kenara alınıyor, içerik korunuyor, boş pano + uyarı", () => {
    const file = boardFile(dir, WS)!;
    writeFileSync(file, "{ yarım", "utf-8");
    const result = readBoardFile(dir, WS, 1234);
    expect(result.tasks).toEqual([]);
    expect(result.recoveredFrom).toBe(`${WS}.json.bozuk-1234`);
    expect(existsSync(file)).toBe(false);
    expect(readFileSync(path.join(dir, `${WS}.json.bozuk-1234`), "utf-8")).toBe("{ yarım");
  });

  it("yapı bozuksa (tasks dizi değil) da kenara alınıyor", () => {
    writeFileSync(boardFile(dir, WS)!, JSON.stringify({ version: 1, tasks: "x" }), "utf-8");
    expect(readBoardFile(dir, WS, 7).recoveredFrom).toBe(`${WS}.json.bozuk-7`);
  });
});

describe("readTasks", () => {
  it("bozuk öğe atlanıyor, öteki kalıyor; olmayan bağımlılık süzülüyor; sınırlar kırpılıyor", () => {
    const tasks = readTasks({
      version: 1,
      tasks: [
        { title: "kimliksiz" },
        {
          ...task(),
          title: "x".repeat(200),
          subtasks: [
            { id: "a", title: "A", prompt: "P", roleHint: "", dependsOn: ["yok", "a"], state: "ready", paneId: null, attempts: 0 },
            { id: "b", title: "B", prompt: "P", roleHint: "", dependsOn: [], state: "uçuyor", paneId: null, attempts: 0 }
          ]
        }
      ]
    })!;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toHaveLength(80);
    expect(tasks[0].subtasks.map((s) => s.id)).toEqual(["a"]);
    expect(tasks[0].subtasks[0].dependsOn).toEqual([]);
  });

  it("yapı bozuksa null", () => {
    expect(readTasks(null)).toBeNull();
    expect(readTasks({ tasks: {} })).toBeNull();
    expect(readTasks([])).toBeNull();
  });

  it("kanıt ve not okunuyor; bilinmeyen not atlanıyor", () => {
    const tasks = readTasks({
      tasks: [
        task({
          subtasks: [
            {
              id: "a",
              title: "A",
              prompt: "P",
              roleHint: "",
              dependsOn: [],
              state: "failed",
              paneId: "p1",
              attempts: 2,
              note: "timeout",
              proof: { kind: "commands", ok: false, at: 3, commands: [{ command: "npm test", exitCode: null, durationMs: 600000, tail: "…", timedOut: true }] }
            },
            { id: "b", title: "B", prompt: "P", roleHint: "", dependsOn: [], state: "ready", paneId: null, attempts: 0, note: "uydurma" }
          ]
        })
      ]
    })!;
    expect(tasks[0].subtasks[0].proof?.commands[0]).toMatchObject({ command: "npm test", exitCode: null, timedOut: true });
    expect(tasks[0].subtasks[0].note).toBe("timeout");
    expect("note" in tasks[0].subtasks[1]).toBe(false);
  });
});

describe("silme ve listeleme", () => {
  it("yalnız geçerli .json panolar listeleniyor; silme dosyayı kaldırıyor; geçersiz kimlik dokunmuyor", () => {
    writeBoardFile(dir, WS, []);
    writeBoardFile(dir, "w2", []);
    writeFileSync(path.join(dir, `${WS}.json.bozuk-1`), "x");
    writeFileSync(path.join(dir, "w3.json.tmp"), "x");
    expect(listBoardIds(dir).sort()).toEqual([WS, "w2"].sort());
    deleteBoardFile(dir, "w2");
    expect(listBoardIds(dir)).toEqual([WS]);
    deleteBoardFile(dir, "../x");
    expect(listBoardIds(path.join(dir, "yok"))).toEqual([]);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardStore.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/boardStore"`.

- [ ] **Step 3: Uygulama** — `app-electron/main/boardStore.ts`

```ts
// Görev panosunun diskteki evi (spec 2026-10-18 gorev-panosu §2, §7):
// `userData/boards/<workspaceId>.json`. Proje klasörüne ya da depoya dosya
// yazılmıyor. Dosya elle düzenlenebilir: bozuk öğe atlanıyor; dosyanın
// tamamı bozuksa SESSİZCE ezilmiyor, `.bozuk-<zaman>` olarak kenara alınıyor.
// Yazma atomik (önce .tmp, sonra rename; bkz. chatStore.ts).
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import { restoreAfterRestart } from "../shared/boardLogic";
import {
  LEAD_DETAIL_MAX,
  LEAD_ERROR_CODES,
  LEAD_RAW_MAX,
  MAX_SUBTASKS,
  MAX_TASKS,
  ROLE_HINT_MAX,
  SUBTASK_NOTES,
  SUBTASK_PROMPT_MAX,
  SUBTASK_STATES,
  SUBTASK_TITLE_MAX,
  TASK_GOAL_MAX,
  TASK_TITLE_MAX,
  type BoardTask,
  type LeadErrorCode,
  type Proof,
  type ProofCommand,
  type Subtask,
  type SubtaskNote,
  type SubtaskState
} from "../shared/boardTypes";

export interface BoardFileResult {
  tasks: BoardTask[];
  recoveredFrom?: string;
  /** Okunamadı ve kenara da alınamadı: çağıran bu panonun üzerine yazmamalı. */
  unreadable?: boolean;
}

const TAIL_MAX = 8192;
const COMMAND_MAX = 300;

export function boardFile(dir: string, workspaceId: string): string | null {
  return isBoardId(workspaceId) ? path.join(dir, `${workspaceId}.json`) : null;
}

function str(value: unknown, max: number): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readProofCommand(raw: unknown): ProofCommand | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const command = str(r.command, COMMAND_MAX);
  const durationMs = num(r.durationMs);
  if (command === null || durationMs === null) return null;
  const exitCode = r.exitCode === null ? null : num(r.exitCode);
  if (exitCode === null && r.exitCode !== null) return null;
  const out: ProofCommand = { command, exitCode, durationMs, tail: str(r.tail, TAIL_MAX) ?? "" };
  if (r.timedOut === true) out.timedOut = true;
  if (r.error === "missingDir" || r.error === "spawn") out.error = r.error;
  return out;
}

function readProof(raw: unknown): Proof | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  if (r.kind !== "commands" && r.kind !== "manual") return undefined;
  const at = num(r.at);
  if (at === null || typeof r.ok !== "boolean" || !Array.isArray(r.commands)) return undefined;
  const commands = (r.commands as unknown[]).map(readProofCommand).filter((c): c is ProofCommand => c !== null);
  return { kind: r.kind, commands, ok: r.ok, at };
}

function readSubtask(raw: unknown): Subtask | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, SUBTASK_TITLE_MAX);
  const prompt = str(r.prompt, SUBTASK_PROMPT_MAX);
  const attempts = num(r.attempts);
  if (!isBoardId(r.id) || title === null || prompt === null || attempts === null) return null;
  if (!(SUBTASK_STATES as readonly unknown[]).includes(r.state)) return null;
  const sub: Subtask = {
    id: r.id,
    title,
    prompt,
    roleHint: str(r.roleHint, ROLE_HINT_MAX) ?? "",
    dependsOn: Array.isArray(r.dependsOn) ? (r.dependsOn as unknown[]).filter(isBoardId) : [],
    state: r.state as SubtaskState,
    paneId: isBoardId(r.paneId) ? r.paneId : null,
    attempts: Math.max(0, Math.floor(attempts))
  };
  if ((SUBTASK_NOTES as readonly unknown[]).includes(r.note)) sub.note = r.note as SubtaskNote;
  const proof = readProof(r.proof);
  if (proof) sub.proof = proof;
  if (r.held === true) sub.held = true;
  const dispatchedAt = num(r.dispatchedAt);
  if (dispatchedAt !== null) sub.dispatchedAt = dispatchedAt;
  if (r.sawBusy === true) sub.sawBusy = true;
  return sub;
}

function readTask(raw: unknown): BoardTask | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = str(r.title, TASK_TITLE_MAX);
  const goal = str(r.goal, TASK_GOAL_MAX);
  const createdAt = num(r.createdAt);
  if (!isBoardId(r.id) || title === null || goal === null || createdAt === null) return null;
  const subtasks: Subtask[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(r.subtasks) ? (r.subtasks as unknown[]) : []) {
    if (subtasks.length >= MAX_SUBTASKS) break;
    const sub = readSubtask(item);
    if (!sub || seen.has(sub.id)) continue;
    seen.add(sub.id);
    subtasks.push(sub);
  }
  // Bağımlılık yalnız aynı görevdeki mevcut ve kendisi olmayan alt göreve.
  for (const sub of subtasks) sub.dependsOn = [...new Set(sub.dependsOn)].filter((d) => d !== sub.id && seen.has(d));
  const task: BoardTask = { id: r.id, title, goal, state: "draft", createdAt, subtasks };
  const approvedAt = num(r.approvedAt);
  if (approvedAt !== null) task.approvedAt = approvedAt;
  if ((LEAD_ERROR_CODES as readonly unknown[]).includes(r.leadError)) task.leadError = r.leadError as LeadErrorCode;
  const leadDetail = str(r.leadDetail, LEAD_DETAIL_MAX);
  if (leadDetail) task.leadDetail = leadDetail;
  const leadRaw = str(r.leadRaw, LEAD_RAW_MAX);
  if (leadRaw) task.leadRaw = leadRaw;
  if (r.leadChangedFiles === true) task.leadChangedFiles = true;
  return restoreAfterRestart(task);
}

/** Dosyanın tamamı: `{ tasks: [...] }`. Yapı bozuksa null (çağıran kenara alıyor). */
export function readTasks(raw: unknown): BoardTask[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const list = (raw as Record<string, unknown>).tasks;
  if (!Array.isArray(list)) return null;
  const tasks: BoardTask[] = [];
  const seen = new Set<string>();
  for (const item of list as unknown[]) {
    if (tasks.length >= MAX_TASKS) break;
    const task = readTask(item);
    if (!task || seen.has(task.id)) continue;
    seen.add(task.id);
    tasks.push(task);
  }
  return tasks;
}

export function readBoardFile(dir: string, workspaceId: string, now: number): BoardFileResult {
  const file = boardFile(dir, workspaceId);
  if (!file || !existsSync(file)) return { tasks: [] };
  let tasks: BoardTask[] | null = null;
  try {
    tasks = readTasks(JSON.parse(readFileSync(file, "utf-8").replace(/^\uFEFF/, "")));
  } catch {
    tasks = null;
  }
  if (tasks) return { tasks };
  // Bozuk ya da okunamıyor: veri sessizce silinmiyor (spec §7).
  const backup = `${file}.bozuk-${now}`;
  try {
    renameSync(file, backup);
    return { tasks: [], recoveredFrom: path.basename(backup) };
  } catch {
    return { tasks: [], unreadable: true };
  }
}

export function writeBoardFile(dir: string, workspaceId: string, tasks: readonly BoardTask[]): boolean {
  const file = boardFile(dir, workspaceId);
  if (!file) return false;
  const payload = JSON.stringify(
    {
      version: 1,
      tasks: tasks.map((t) => {
        const copy: BoardTask = { ...t };
        delete copy.planning;
        return copy;
      })
    },
    null,
    2
  );
  const tmp = `${file}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, payload, "utf-8");
    renameSync(tmp, file);
    return true;
  } catch {
    try {
      if (existsSync(tmp)) unlinkSync(tmp);
    } catch {
      // temizlik başarısız olsa da sonuç false
    }
    return false;
  }
}

export function deleteBoardFile(dir: string, workspaceId: string): void {
  const file = boardFile(dir, workspaceId);
  if (!file) return;
  try {
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // silinemeyen dosya bir sonraki budamada yeniden denenir
  }
}

export function listBoardIds(dir: string): string[] {
  try {
    return readdirSync(dir)
      .map((name) => /^(.+)\.json$/.exec(name)?.[1] ?? "")
      .filter(isBoardId);
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/boardStore.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/main/boardStore.ts tests/boardStore.test.ts
git commit -m "Gorev Panosu: pano deposu (bozuk dosya kenara, atomik yazma)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Doğrulama çalıştırıcısı

**Files:**
- Create: `app-electron/main/boardVerify.ts`
- Create: `app-electron/main/boardLive.ts`
- Modify: `app-electron/main/axetHeadless.ts:179` (`killTreeDefault` dışa açılıyor)
- Test: `tests/boardVerify.test.ts`

**Interfaces:**
- Consumes: Task 1 `Proof`, `ProofCommand`; `stripAnsi` (`app-electron/main/agentGenericReader.ts`); `killTreeDefault`, `ChildLike` (`axetHeadless.ts`, yalnız `boardLive.ts`'te).
- Produces:

```ts
// boardVerify.ts
export const VERIFY_TIMEOUT_MS = 600_000;   // 10 dk
export const TAIL_LINES = 40;
export const TAIL_BYTES = 8192;
export interface VerifyChild { pid?: number; stdout: NodeJS.EventEmitter | null; stderr: NodeJS.EventEmitter | null;
  on(ev: "close", cb: (code: number | null) => void): unknown; on(ev: "error", cb: (err: Error) => void): unknown }
export interface VerifyDeps { spawn(command: string, cwd: string): VerifyChild; killTree(child: VerifyChild): void;
  dirExists(dir: string): boolean; now(): number; timeoutMs: number; killGraceMs: number }
export interface VerifyRun { done: Promise<Proof>; cancel(): void }
export function tailOf(text: string): string;
export function runVerification(commands: readonly string[], cwd: string, deps: VerifyDeps): VerifyRun;

// boardLive.ts (test edilmez; Task 6 ve 9 genişletir)
export function liveVerifyDeps(): VerifyDeps;
export function boardsDir(): string;        // userData/boards
```

`done` hiçbir koşulda reddedilmez (reject yok). Kanıt `ok` yalnız bütün komutlar başladı, süresinde bitti ve 0 döndüyse true.

- [ ] **Step 1: Kırmızı test** — `tests/boardVerify.test.ts`

```ts
// Doğrulama çalıştırıcısı (spec 2026-10-18 gorev-panosu §6, §7, §10). Sahte süreç.
import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { runVerification, tailOf, type VerifyChild, type VerifyDeps } from "../app-electron/main/boardVerify";

class FakeChild extends EventEmitter {
  pid = 77;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  out(text: string) {
    this.stdout.emit("data", Buffer.from(text, "utf-8"));
  }
  err(text: string) {
    this.stderr.emit("data", Buffer.from(text, "utf-8"));
  }
  exit(code: number | null) {
    this.emit("close", code);
  }
}

type Script = (command: string, child: FakeChild) => void;

function harness(script: Script, over: Partial<VerifyDeps> = {}) {
  const spawned: { command: string; cwd: string }[] = [];
  const killed: number[] = [];
  const deps: VerifyDeps = {
    spawn: (command, cwd) => {
      const child = new FakeChild();
      spawned.push({ command, cwd });
      setTimeout(() => script(command, child), 0);
      return child as unknown as VerifyChild;
    },
    killTree: (child) => {
      killed.push(child.pid ?? 0);
      setTimeout(() => (child as unknown as FakeChild).exit(null), 0);
    },
    dirExists: () => true,
    now: () => Date.now(),
    timeoutMs: 1_000,
    killGraceMs: 50,
    ...over
  };
  return { deps, spawned, killed };
}

describe("runVerification", () => {
  it("hepsi 0 → ok; sırayla, alan kökünde", async () => {
    const h = harness((_c, child) => {
      child.out("tamam\n");
      child.exit(0);
    });
    const proof = await runVerification(["npm run lint", "npm test"], "C:\\proje", h.deps).done;
    expect(proof.ok).toBe(true);
    expect(proof.kind).toBe("commands");
    expect(h.spawned).toEqual([
      { command: "npm run lint", cwd: "C:\\proje" },
      { command: "npm test", cwd: "C:\\proje" }
    ]);
    expect(proof.commands.map((c) => c.exitCode)).toEqual([0, 0]);
    expect(proof.commands[0].tail).toBe("tamam");
  });

  it("ilk kırmızıda duruyor; stdout ve stderr kanıtta", async () => {
    const h = harness((command, child) => {
      child.out(`${command} başladı\n`);
      child.err("HATA: 3 test kırmızı\n");
      child.exit(command === "npm run lint" ? 2 : 0);
    });
    const proof = await runVerification(["npm run lint", "npm test"], "C:\\p", h.deps).done;
    expect(proof.ok).toBe(false);
    expect(h.spawned).toHaveLength(1);
    expect(proof.commands).toHaveLength(1);
    expect(proof.commands[0].exitCode).toBe(2);
    expect(proof.commands[0].tail).toContain("HATA: 3 test kırmızı");
  });

  it("süre aşımı: ağaç kapatılıyor, timedOut, çıkış kodu null, sonraki komut çalışmıyor", async () => {
    const h = harness(() => {}, { timeoutMs: 20 });
    const proof = await runVerification(["npm test", "npm run e2e"], "C:\\p", h.deps).done;
    expect(h.killed).toEqual([77]);
    expect(proof.commands).toEqual([expect.objectContaining({ command: "npm test", exitCode: null, timedOut: true })]);
    expect(proof.ok).toBe(false);
    expect(h.spawned).toHaveLength(1);
  });

  it("ağaç kapatma süreci bitiremezse bile kanıt geliyor (killGraceMs)", async () => {
    const h = harness(() => {}, { timeoutMs: 10, killGraceMs: 20, killTree: () => {} });
    const proof = await runVerification(["npm test"], "C:\\p", h.deps).done;
    expect(proof.commands[0]).toMatchObject({ exitCode: null, timedOut: true });
  });

  it("başlatılamadı (spawn atıyor ya da 'error' olayı): exitCode null, hata metni kanıtta", async () => {
    const thrown = harness(() => {}, {
      spawn: () => {
        throw new Error("spawn EPERM");
      }
    });
    const a = await runVerification(["npm test"], "C:\\p", thrown.deps).done;
    expect(a.commands[0]).toMatchObject({ exitCode: null, error: "spawn" });
    expect(a.commands[0].tail).toContain("spawn EPERM");
    const evented = harness((_c, child) => child.emit("error", new Error("spawn cmd.exe ENOENT")));
    const b = await runVerification(["npm test"], "C:\\p", evented.deps).done;
    expect(b.commands[0]).toMatchObject({ exitCode: null, error: "spawn" });
    expect(b.ok).toBe(false);
  });

  it("klasör yoksa hiçbir komut çalışmıyor; missingDir", async () => {
    const h = harness(() => {}, { dirExists: () => false });
    const proof = await runVerification(["npm test"], "C:\\yok", h.deps).done;
    expect(h.spawned).toEqual([]);
    expect(proof.commands[0]).toMatchObject({ command: "npm test", exitCode: null, error: "missingDir" });
    expect(proof.ok).toBe(false);
  });

  it("iptal: süren komutun ağacı kapatılıyor, ok false", async () => {
    const h = harness(() => {});
    const run = runVerification(["npm test"], "C:\\p", h.deps);
    await new Promise((r) => setTimeout(r, 5));
    run.cancel();
    const proof = await run.done;
    expect(h.killed).toEqual([77]);
    expect(proof.ok).toBe(false);
  });
});

describe("tailOf", () => {
  it("son 40 satır, ANSI ve sondaki boş satırlar atılıyor", () => {
    const text = Array.from({ length: 100 }, (_, i) => `\x1b[32msatır ${i}\x1b[0m`).join("\r\n") + "\r\n\r\n";
    const tail = tailOf(text).split("\n");
    expect(tail).toHaveLength(40);
    expect(tail[0]).toBe("satır 60");
    expect(tail[39]).toBe("satır 99");
  });

  it("8 KB'ı aşmıyor, sonu korunuyor, baştaki kırık karakter atılıyor", () => {
    const long = "ğ".repeat(10_000) + "\nSON";
    const tail = tailOf(long);
    expect(Buffer.byteLength(tail, "utf-8")).toBeLessThanOrEqual(8192);
    expect(tail.endsWith("SON")).toBe(true);
    expect(tail.startsWith("\uFFFD")).toBe(false);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardVerify.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/boardVerify"`.

- [ ] **Step 3: Çalıştırıcı** — `app-electron/main/boardVerify.ts`

```ts
// Doğrulama çalıştırıcısı (spec 2026-10-18 gorev-panosu §6). Alanın
// doğrulama komutları — YALNIZ kullanıcının alan menüsünde yazdığı metin —
// terminalden bağımsız gizli bir çocuk süreçte, alan kökünde, sırayla
// çalışıyor; ilk kırmızıda duruyor. Komut başına süre sınırı var; aşılırsa
// süreç ağacı kapatılıyor. Çıktının son 40 satırı (≤ 8 KB) kanıta yazılıyor.
// `done` hiçbir koşulda reddedilmiyor: ana süreçte yakalanmamış söz yok.
import type { Proof, ProofCommand } from "../shared/boardTypes";
import { stripAnsi } from "./agentGenericReader";

export const VERIFY_TIMEOUT_MS = 10 * 60_000;
export const TAIL_LINES = 40;
export const TAIL_BYTES = 8 * 1024;
/** Süre boyunca tutulan çıktı (sonu); kuyruk bundan kesiliyor. */
const BUFFER_MAX = 64 * 1024;

export interface VerifyChild {
  pid?: number;
  stdout: NodeJS.EventEmitter | null;
  stderr: NodeJS.EventEmitter | null;
  on(ev: "close", cb: (code: number | null) => void): unknown;
  on(ev: "error", cb: (err: Error) => void): unknown;
}

export interface VerifyDeps {
  spawn(command: string, cwd: string): VerifyChild;
  killTree(child: VerifyChild): void;
  dirExists(dir: string): boolean;
  now(): number;
  timeoutMs: number;
  /** Ağaç kapatıldıktan sonra `close` gelmezse bu kadar bekleyip kanıtı yine de veriyor. */
  killGraceMs: number;
}

export interface VerifyRun {
  done: Promise<Proof>;
  cancel(): void;
}

/** Son 40 satır, ANSI'siz, ≤ 8 KB (baştan kesiliyor; kırık ilk karakter atılıyor). */
export function tailOf(text: string): string {
  const lines = stripAnsi(text).replace(/\r\n?/g, "\n").split("\n");
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  let tail = lines.slice(-TAIL_LINES).join("\n");
  const bytes = Buffer.from(tail, "utf-8");
  if (bytes.length > TAIL_BYTES) {
    tail = bytes.subarray(bytes.length - TAIL_BYTES).toString("utf-8").replace(/^\uFFFD+/, "");
  }
  return tail;
}

export function runVerification(commands: readonly string[], cwd: string, deps: VerifyDeps): VerifyRun {
  let cancelled = false;
  let current: VerifyChild | null = null;

  const kill = (child: VerifyChild) => {
    try {
      deps.killTree(child);
    } catch {
      // zaten kapanmış olabilir
    }
  };

  const runOne = (command: string): Promise<ProofCommand> =>
    new Promise((resolve) => {
      const started = deps.now();
      let out = "";
      let timedOut = false;
      let settled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      const finish = (entry: Omit<ProofCommand, "command" | "durationMs">) => {
        if (settled) return;
        settled = true;
        for (const t of timers) clearTimeout(t);
        current = null;
        resolve({ command, durationMs: Math.max(0, deps.now() - started), ...entry });
      };
      let child: VerifyChild;
      try {
        child = deps.spawn(command, cwd);
      } catch (err) {
        finish({ exitCode: null, tail: tailOf(err instanceof Error ? err.message : String(err)), error: "spawn" });
        return;
      }
      current = child;
      const collect = (chunk: Buffer | string) => {
        out = (out + chunk.toString()).slice(-BUFFER_MAX);
      };
      child.stdout?.on("data", collect);
      child.stderr?.on("data", collect);
      child.on("error", (err) => finish({ exitCode: null, tail: tailOf(`${out}\n${err.message}`), error: "spawn" }));
      child.on("close", (code) =>
        finish(timedOut ? { exitCode: null, tail: tailOf(out), timedOut: true } : { exitCode: code, tail: tailOf(out) })
      );
      timers.push(
        setTimeout(() => {
          timedOut = true;
          kill(child);
          // taskkill süreci bitiremezse kanıt yine gelsin.
          timers.push(setTimeout(() => finish({ exitCode: null, tail: tailOf(out), timedOut: true }), deps.killGraceMs));
        }, deps.timeoutMs)
      );
    });

  const done = (async (): Promise<Proof> => {
    const results: ProofCommand[] = [];
    try {
      let dirOk = false;
      try {
        dirOk = deps.dirExists(cwd);
      } catch {
        dirOk = false;
      }
      if (!dirOk) {
        results.push({ command: commands[0] ?? "", exitCode: null, durationMs: 0, tail: "", error: "missingDir" });
        return { kind: "commands", commands: results, ok: false, at: deps.now() };
      }
      for (const command of commands) {
        if (cancelled) break;
        const result = await runOne(command);
        results.push(result);
        if (result.exitCode !== 0 || result.timedOut || result.error) break;
      }
    } catch {
      // beklenmedik: kanıt kırmızı
      return { kind: "commands", commands: results, ok: false, at: Date.now() };
    }
    const ok =
      !cancelled &&
      commands.length > 0 &&
      results.length === commands.length &&
      results.every((r) => r.exitCode === 0 && !r.timedOut && !r.error);
    return { kind: "commands", commands: results, ok, at: deps.now() };
  })();

  return {
    done,
    cancel: () => {
      cancelled = true;
      if (current) kill(current);
    }
  };
}
```

- [ ] **Step 4: `killTreeDefault`'u dışa aç** — `app-electron/main/axetHeadless.ts:179`

`function killTreeDefault(child: ChildLike): void {` satırını şuna çevir:

```ts
export function killTreeDefault(child: ChildLike): void {
```

(Gövde aynı: Windows'ta `taskkill /PID <pid> /T /F`, `error` dinleyicisiyle; değilse `kill()`.)

- [ ] **Step 5: Canlı bağımlılıklar** — `app-electron/main/boardLive.ts`

```ts
// Görev panosunun CANLI bağımlılıkları (spec 2026-10-18 gorev-panosu).
// İnce ve test edilmiyor: mantık boardVerify.ts, boardLead.ts ve
// boardStore.ts'te, orada enjekte sahtelerle test ediliyor. Bu dosya
// axetHeadless.ts'i (dolayısıyla better-sqlite3'ü) çekiyor; testler bunu
// İÇE AKTARMAMALI.
import { app } from "electron";
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";
import { killTreeDefault, type ChildLike } from "./axetHeadless";
import { VERIFY_TIMEOUT_MS, type VerifyChild, type VerifyDeps } from "./boardVerify";

export function boardsDir(): string {
  return path.join(app.getPath("userData"), "boards");
}

function isDirectory(dir: string): boolean {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

export function liveVerifyDeps(): VerifyDeps {
  return {
    // `shell: true`: kullanıcının kendi yazdığı komut satırı (spec §6), cmd.exe /d /s /c ile.
    spawn: (command, cwd) =>
      spawn(command, { cwd, shell: true, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }) as unknown as VerifyChild,
    killTree: (child) => killTreeDefault(child as unknown as ChildLike),
    dirExists: isDirectory,
    now: () => Date.now(),
    timeoutMs: VERIFY_TIMEOUT_MS,
    killGraceMs: 5_000
  };
}
```

- [ ] **Step 6: Yeşili gör**

Run: `npx vitest run tests/boardVerify.test.ts tests/axetHeadless.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz (`boardLive.ts` derleniyor ama hiçbir testte yüklenmiyor).

- [ ] **Step 7: Commit**

```bash
git add app-electron/main/boardVerify.ts app-electron/main/boardLive.ts app-electron/main/axetHeadless.ts tests/boardVerify.test.ts
git commit -m "Gorev Panosu: dogrulama calistiricisi (sirayla, ilk kirmizida dur, 10 dk, agac kapatma)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Lider çalıştırıcısı

**Files:**
- Create: `app-electron/main/boardLead.ts`
- Modify: `app-electron/main/boardLive.ts` (canlı lider bağımlılıkları)
- Test: `tests/boardLead.test.ts`

**Interfaces:**
- Consumes: Task 2 `parseLeadPlan`, `PlannedSubtask`; Task 1 `LeadErrorCode`, `LEAD_RAW_MAX`, `LEAD_DETAIL_MAX`. Canlıda: `startHeadlessTurn`, `defaultHeadlessDeps` (`axetHeadless.ts`), `axetBinaryStatus`, `axetBinaryMessage` (`axetCodeVersion.ts`; en düşük sürüm `MIN_AXET_VERSION = "1.4.0"` zaten orada).
- Produces:

```ts
// boardLead.ts
export const LEAD_TIMEOUT_MS = 180_000;  // 3 dk
export interface LeadTurnResult { ok: boolean; text: string; error?: string; timedOut: boolean; spawnFailed: boolean }
export interface LeadDeps {
  binaryMessage(): Promise<string | null>;                               // null: axet-code kullanılabilir
  startTurn(cwd: string, prompt: string): { done: Promise<LeadTurnResult>; cancel(): void };
  gitStatus(cwd: string): Promise<string | null>;                       // Git deposu değilse null
  now(): number;
}
export type LeadOutcome =
  | { ok: true; subtasks: PlannedSubtask[]; changedFiles: boolean; durationMs: number }
  | { ok: false; error: LeadErrorCode; detail?: string; raw?: string; changedFiles: boolean; durationMs: number };
export interface LeadRun { done: Promise<LeadOutcome>; cancel(): void }
export function runLead(cwd: string, prompt: string, deps: LeadDeps): LeadRun;

// boardLive.ts (ek)
export function liveLeadDeps(): LeadDeps;
```

Lider her planlamada yeni oturum açar (`resumeId: null`), sohbet oturumu açmaz, bağlayıcılar kapalı (`useConnectors: false`), model axet-code'un varsayılanı; süre sınırı `startHeadlessTurn`'ün `hardCapMs`'i (aşılınca süreç ağacını `taskkill /T /F` ile kapatıp `timedOut: true` döndürüyor). `done` reddedilmez.

- [ ] **Step 1: Kırmızı test** — `tests/boardLead.test.ts`

```ts
// Lider çalıştırıcısı (spec 2026-10-18 gorev-panosu §3, §7, §10). axet-code
// ÇALIŞTIRILMIYOR: tur, sürüm denetimi ve git status enjekte.
import { describe, expect, it, vi } from "vitest";
import { runLead, type LeadDeps, type LeadTurnResult } from "../app-electron/main/boardLead";

const PLAN = '```json\n{"subtasks":[{"title":"Model","prompt":"Tabloyu ekle.","role":"coder","dependsOn":[]}]}\n```';

function harness(turn: Partial<LeadTurnResult> | "hang", over: Partial<LeadDeps> = {}, git: (string | null)[] = ["", ""]) {
  const calls: { cwd: string; prompt: string }[] = [];
  const cancel = vi.fn();
  const gitQueue = [...git];
  const deps: LeadDeps = {
    binaryMessage: async () => null,
    startTurn: (cwd, prompt) => {
      calls.push({ cwd, prompt });
      const done =
        turn === "hang"
          ? new Promise<LeadTurnResult>(() => {})
          : Promise.resolve({ ok: true, text: PLAN, timedOut: false, spawnFailed: false, ...turn });
      return { done, cancel };
    },
    gitStatus: async () => (gitQueue.length ? gitQueue.shift()! : null),
    now: () => 1_000,
    ...over
  };
  return { deps, calls, cancel };
}

describe("runLead", () => {
  it("başarı: plan, alan kökünde tek tur, istem aynen gidiyor", async () => {
    const h = harness({});
    const outcome = await runLead("C:\\proje", "İSTEM", h.deps).done;
    expect(h.calls).toEqual([{ cwd: "C:\\proje", prompt: "İSTEM" }]);
    expect(outcome).toMatchObject({ ok: true, changedFiles: false });
    if (outcome.ok) expect(outcome.subtasks[0]).toEqual({ title: "Model", prompt: "Tabloyu ekle.", roleHint: "coder", dependsOn: [] });
  });

  it("axet-code yok/eski/bozuk: tur başlamıyor, Doktor mesajı detayda", async () => {
    const h = harness({}, { binaryMessage: async () => "axet-code 1.3.9 çok eski; en az 1.4.0 gerekli." });
    const outcome = await runLead("C:\\p", "x", h.deps).done;
    expect(h.calls).toEqual([]);
    expect(outcome).toMatchObject({ ok: false, error: "binary", detail: "axet-code 1.3.9 çok eski; en az 1.4.0 gerekli." });
  });

  it("JSON dışı cevap: noJson ve ham cevap (≤ 8 KB)", async () => {
    const h = harness({ text: "Üzgünüm, " + "uzun ".repeat(3000) });
    const outcome = await runLead("C:\\p", "x", h.deps).done;
    expect(outcome).toMatchObject({ ok: false, error: "noJson" });
    if (!outcome.ok) expect(outcome.raw!.length).toBe(8192);
  });

  it("süre aşımı: timeout (ağacı startHeadlessTurn kapatıyor)", async () => {
    const h = harness({ ok: false, text: "", timedOut: true });
    expect(await runLead("C:\\p", "x", h.deps).done).toMatchObject({ ok: false, error: "timeout" });
  });

  it("tur hatası: failed ve hata metni", async () => {
    const h = harness({ ok: false, text: "", error: "403 Forbidden" });
    expect(await runLead("C:\\p", "x", h.deps).done).toMatchObject({ ok: false, error: "failed", detail: "403 Forbidden" });
  });

  it("git status farkı: lider planlarken dosya değiştirdi (başarıda da hatada da)", async () => {
    const ok = await runLead("C:\\p", "x", harness({}, {}, ["", " M src/a.ts\n"]).deps).done;
    expect(ok.changedFiles).toBe(true);
    const bad = await runLead("C:\\p", "x", harness({ text: "yok" }, {}, ["", "?? yeni.txt\n"]).deps).done;
    expect(bad).toMatchObject({ ok: false, error: "noJson", changedFiles: true });
  });

  it("Git deposu değil (null): fark yok sayılmıyor, changedFiles false", async () => {
    const outcome = await runLead("C:\\p", "x", harness({}, {}, [null, null]).deps).done;
    expect(outcome.changedFiles).toBe(false);
  });

  it("iptal turu durduruyor", async () => {
    const h = harness("hang");
    const run = runLead("C:\\p", "x", h.deps);
    await new Promise((r) => setTimeout(r, 0));
    run.cancel();
    expect(h.cancel).toHaveBeenCalledTimes(1);
  });

  it("bağımlılık atarsa söz reddedilmiyor: failed", async () => {
    const h = harness({}, {
      startTurn: () => {
        throw new Error("spawn");
      }
    });
    expect(await runLead("C:\\p", "x", h.deps).done).toMatchObject({ ok: false, error: "failed" });
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardLead.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/boardLead"`.

- [ ] **Step 3: Çalıştırıcı** — `app-electron/main/boardLead.ts`

```ts
// Lider çalıştırıcısı (spec 2026-10-18 gorev-panosu §3, §7). Başsız TEK
// tur, her planlamada yeni oturum; yalnız plan üretiyor. Önce axet-code'un
// kullanılabilir olduğu denetleniyor (yoksa Doktor mesajı). Alan bir Git
// deposuysa tur öncesi ve sonrası `git status --porcelain` karşılaştırılıyor:
// fark varsa "Lider planlarken dosya değiştirdi" — geri alma yok, yalnız
// dürüst bilgi. `done` hiçbir koşulda reddedilmiyor.
import { parseLeadPlan, type PlannedSubtask } from "../shared/boardPlan";
import { LEAD_DETAIL_MAX, LEAD_RAW_MAX, type LeadErrorCode } from "../shared/boardTypes";

export const LEAD_TIMEOUT_MS = 3 * 60_000;

export interface LeadTurnResult {
  ok: boolean;
  text: string;
  error?: string;
  timedOut: boolean;
  spawnFailed: boolean;
}

export interface LeadDeps {
  /** axet-code kullanılabilir mi; değilse kullanıcıya gösterilecek mesaj. */
  binaryMessage(): Promise<string | null>;
  startTurn(cwd: string, prompt: string): { done: Promise<LeadTurnResult>; cancel(): void };
  /** `git status --porcelain`; Git deposu değilse ya da okunamazsa null. */
  gitStatus(cwd: string): Promise<string | null>;
  now(): number;
}

export type LeadOutcome =
  | { ok: true; subtasks: PlannedSubtask[]; changedFiles: boolean; durationMs: number }
  | { ok: false; error: LeadErrorCode; detail?: string; raw?: string; changedFiles: boolean; durationMs: number };

export interface LeadRun {
  done: Promise<LeadOutcome>;
  cancel(): void;
}

export function runLead(cwd: string, prompt: string, deps: LeadDeps): LeadRun {
  let cancelled = false;
  let cancelTurn: (() => void) | null = null;
  const started = deps.now();
  const elapsed = () => Math.max(0, deps.now() - started);
  const safeGit = async (): Promise<string | null> => {
    try {
      return await deps.gitStatus(cwd);
    } catch {
      return null;
    }
  };
  const failure = (error: LeadErrorCode, changedFiles: boolean, extra: { detail?: string; raw?: string } = {}): LeadOutcome => {
    const out: Extract<LeadOutcome, { ok: false }> = { ok: false, error, changedFiles, durationMs: elapsed() };
    const detail = extra.detail?.trim().slice(0, LEAD_DETAIL_MAX);
    if (detail) out.detail = detail;
    const raw = extra.raw?.slice(0, LEAD_RAW_MAX);
    if (raw) out.raw = raw;
    return out;
  };

  const done = (async (): Promise<LeadOutcome> => {
    try {
      const message = await deps.binaryMessage();
      if (message) return failure("binary", false, { detail: message });
      if (cancelled) return failure("failed", false);
      const before = await safeGit();
      if (cancelled) return failure("failed", false);
      const turn = deps.startTurn(cwd, prompt);
      cancelTurn = turn.cancel;
      const result = await turn.done;
      cancelTurn = null;
      const after = await safeGit();
      const changedFiles = before !== null && after !== null && before !== after;
      if (result.timedOut) return failure("timeout", changedFiles, { raw: result.text });
      if (!result.ok) return failure("failed", changedFiles, { detail: result.error, raw: result.text });
      const plan = parseLeadPlan(result.text);
      if (!plan.ok) return failure(plan.error, changedFiles, { raw: result.text });
      return { ok: true, subtasks: plan.subtasks, changedFiles, durationMs: elapsed() };
    } catch {
      return failure("failed", false);
    }
  })();

  return {
    done,
    cancel: () => {
      cancelled = true;
      try {
        cancelTurn?.();
      } catch {
        // tur zaten bitmiş olabilir
      }
    }
  };
}
```

- [ ] **Step 4: Canlı lider bağımlılıkları** — `app-electron/main/boardLive.ts`

İçe aktarımlara ekle (mevcut `spawn` satırını `import { execFile, spawn } from "node:child_process";` yap):

```ts
import { axetBinaryMessage, axetBinaryStatus } from "./axetCodeVersion";
import { defaultHeadlessDeps, startHeadlessTurn } from "./axetHeadless";
import { LEAD_TIMEOUT_MS, type LeadDeps, type LeadTurnResult } from "./boardLead";
```

(`killTreeDefault, type ChildLike` içe aktarımı `./axetHeadless`'ten zaten var; iki satırı tek satırda birleştir: `import { defaultHeadlessDeps, killTreeDefault, startHeadlessTurn, type ChildLike } from "./axetHeadless";`.)

Dosyanın sonuna:

```ts
function gitStatus(cwd: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(
        "git",
        ["status", "--porcelain"],
        { cwd, timeout: 15_000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
        (err, stdout) => resolve(err ? null : String(stdout ?? ""))
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Lider: başsız `axet-code run`, yeni oturum, bağlayıcılar kapalı, 3 dk
 * (spec §3). Sürüm denetimi her planlamada tazeleniyor: arada kullanıcı
 * axet-code'u onarmış ya da güncelleyici bozmuş olabilir.
 */
export function liveLeadDeps(): LeadDeps {
  return {
    binaryMessage: async () => axetBinaryMessage(await axetBinaryStatus(true)),
    startTurn: (cwd, prompt) => {
      const turn = startHeadlessTurn(
        {
          cwd,
          model: null,
          prompt,
          resumeId: null,
          useConnectors: false,
          onSessionId: () => {},
          onChunk: () => {},
          onActivity: () => {},
          onProgress: () => {}
        },
        { ...defaultHeadlessDeps(), hardCapMs: LEAD_TIMEOUT_MS }
      );
      const done = turn.done.then(
        (r): LeadTurnResult => ({
          ok: r.ok,
          text: r.text,
          ...(r.error ? { error: r.error } : {}),
          timedOut: r.timedOut,
          spawnFailed: r.spawnFailed
        }),
        (): LeadTurnResult => ({ ok: false, text: "", timedOut: false, spawnFailed: true })
      );
      return { done, cancel: turn.cancel };
    },
    gitStatus,
    now: () => Date.now()
  };
}
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/boardLead.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/boardLead.ts app-electron/main/boardLive.ts tests/boardLead.test.ts
git commit -m "Gorev Panosu: lider calistiricisi (basiz tur, 3 dk, git status farki)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: İzleyicinin pano yüzü — `agents()` ve `sendPrompt()`

**Files:**
- Modify: `app-electron/shared/agentTypes.ts` (`AgentRegistration`'a `workspaceId?`, `role?`)
- Modify: `app-electron/main/agentMonitor.ts`
- Modify: `src/stores/terminalStore.tsx` (kayda alan ve rol)
- Test: `tests/agentMonitor.test.ts` (genişler), `tests/terminalStore.test.tsx` (bir beklenti güncellenir)

**Interfaces:**
- Consumes: mevcut `createAgentMonitor`, `TYPING_GUARD_MS`, `InputLineBuffer.hasDraft()`, `AgentReader.submitLine/poll/status`.
- Produces:

```ts
// agentTypes.ts — AgentRegistration'a iki isteğe bağlı alan
workspaceId?: string;   // bölmenin çalışma alanı
role?: string;          // ajanın rolü (rol ipucu eşleşmesi)

// agentMonitor.ts
export const PROMPT_ENTER_DELAY_MS = 150;
export type AgentPromptResult = "ok" | "noAgent" | "notRunning" | "typing" | "invalid" | "writeFailed";
export interface AgentPresence { reg: AgentRegistration; status: AgentStatus | null; inputIdle: boolean }
// MonitorDeps'e isteğe bağlı: schedule?(fn: () => void, ms: number): void;   (yoksa setTimeout)
// AgentMonitor'a:
agents(): AgentPresence[];
sendPrompt(paneId: string, text: string): AgentPromptResult;
```

`sendPrompt` sözleşmesi: `text` tek satır olmalı (denetim karakteri varsa `invalid`; satıra indirmek çağıranın işi — `toPromptLine`). Yazmadan hemen önce okuyucu yoklanır; durum `finished` (kabuk istemi ekranda) ise `notRunning` ve HİÇBİR ŞEY yazılmaz. Kullanıcı yazıyorsa (taslak ya da son tuş `TYPING_GUARD_MS`'den yeni) `typing`. Metin yazılır, `PROMPT_ENTER_DELAY_MS` sonra yeniden denetlenir: motor kapanmışsa `\r` yerine `\x1b` (cmd'de satırı temizler), arada kullanıcı tuşa bastıysa hiçbir şey; değilse `\r` ve okuyucuya `submitLine(text)` (axet-code istem→oturum eşlemesi bu satırla çalışıyor; Ajan Alanı eşlemesi değişmiyor). İzleyicinin kendi yazdıkları `onInput`'tan geçmediği için kullanıcı girdisi sayılmaz.

- [ ] **Step 1: Kırmızı test** — `tests/agentMonitor.test.ts`'in SONUNA (dosyanın başındaki `FakeReader`, `reg` ve içe aktarımlar kullanılır; içe aktarım satırını `import { PROMPT_ENTER_DELAY_MS, TYPING_GUARD_MS, createAgentMonitor, readAgentRegistration } from "../app-electron/main/agentMonitor";` yap):

```ts
describe("Görev Panosu yüzü: agents() ve sendPrompt()", () => {
  function boardHarness() {
    const clock = { ms: 1_000_000 };
    const readers = new Map<string, FakeReader>();
    const scheduled: { fn: () => void; ms: number }[] = [];
    const write = vi.fn((_ptyId: string, _data: string) => true);
    const monitor = createAgentMonitor({
      now: () => clock.ms,
      createReader: (r: AgentRegistration): AgentReader => {
        const reader = new FakeReader();
        readers.set(r.paneId, reader);
        return reader;
      },
      emit: vi.fn(),
      notify: vi.fn(),
      write,
      backlog: () => "",
      log: vi.fn(),
      schedule: (fn, ms) => {
        scheduled.push({ fn, ms });
      }
    });
    const flushEnter = () => {
      for (const s of scheduled.splice(0)) s.fn();
    };
    return { clock, scheduled, write, monitor, flushEnter, reader: (id = "p1") => readers.get(id)! };
  }
  const finished: AgentStatus = { state: "finished", source: "estimated", lastActivity: 1 };

  it("agents(): kayıt, alan, rol, son durum; taslak ya da yeni tuş varken yazmaya kapalı", () => {
    const h = boardHarness();
    h.monitor.register(reg({ workspaceId: "w1", role: "coder" }));
    const [a] = h.monitor.agents();
    expect(a.reg).toMatchObject({ paneId: "p1", workspaceId: "w1", role: "coder" });
    expect(a.status).toEqual({ state: "idle", source: "estimated", lastActivity: null });
    expect(a.inputIdle).toBe(true);
    h.monitor.onInput("t1", "ya");
    expect(h.monitor.agents()[0].inputIdle).toBe(false);
    h.monitor.onInput("t1", "\x15");
    expect(h.monitor.agents()[0].inputIdle).toBe(false);
    h.clock.ms += TYPING_GUARD_MS;
    expect(h.monitor.agents()[0].inputIdle).toBe(true);
  });

  it("sendPrompt: önce metin, 150 ms sonra Enter; satır okuyucuya Enter'da veriliyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "Tabloyu ekle.")).toBe("ok");
    expect(h.write.mock.calls).toEqual([["t1", "Tabloyu ekle."]]);
    expect(h.scheduled[0].ms).toBe(PROMPT_ENTER_DELAY_MS);
    expect(h.reader().lines).toEqual([]);
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([
      ["t1", "Tabloyu ekle."],
      ["t1", "\r"]
    ]);
    expect(h.reader().lines).toEqual(["Tabloyu ekle."]);
  });

  it("kabuk istemi ekrandayken yazmıyor (motor kapandı)", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.reader().current = finished;
    expect(h.monitor.sendPrompt("p1", "dir")).toBe("notRunning");
    expect(h.write).not.toHaveBeenCalled();
    expect(h.scheduled).toEqual([]);
  });

  it("Enter anında motor kapandı → Enter yerine Esc, okuyucuya satır yok", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("p1", "del dosya")).toBe("ok");
    h.reader().current = finished;
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([
      ["t1", "del dosya"],
      ["t1", "\x1b"]
    ]);
    expect(h.reader().lines).toEqual([]);
  });

  it("arada kullanıcı tuşa bastıysa Enter gönderilmiyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.monitor.sendPrompt("p1", "istem");
    h.clock.ms += 50;
    h.monitor.onInput("t1", "a");
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([["t1", "istem"]]);
  });

  it("bölme arada kapandıysa Enter gönderilmiyor", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    h.monitor.sendPrompt("p1", "istem");
    h.monitor.unregister("p1");
    h.flushEnter();
    expect(h.write.mock.calls).toEqual([["t1", "istem"]]);
  });

  it("yazıyor / geçersiz / ajan yok / yazılamadı", () => {
    const h = boardHarness();
    h.monitor.register(reg());
    expect(h.monitor.sendPrompt("yok", "x")).toBe("noAgent");
    expect(h.monitor.sendPrompt("p1", "a\nb")).toBe("invalid");
    expect(h.monitor.sendPrompt("p1", "")).toBe("invalid");
    h.write.mockReturnValueOnce(false);
    expect(h.monitor.sendPrompt("p1", "x")).toBe("writeFailed");
    h.monitor.onInput("t1", "abc");
    expect(h.monitor.sendPrompt("p1", "x")).toBe("typing");
  });

  it("readAgentRegistration alan ve rolü taşıyor; boş/bozuk olanı atıyor", () => {
    expect(readAgentRegistration({ ...reg(), workspaceId: "w1", role: "  coder  " })).toMatchObject({ workspaceId: "w1", role: "coder" });
    const r = readAgentRegistration({ ...reg(), workspaceId: 5, role: "" })!;
    expect("workspaceId" in r || "role" in r).toBe(false);
  });
});
```

(`AgentStatus` ve `AgentRegistration` dosyanın başında zaten içe aktarılıyor; `AgentReader` da.)

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentMonitor.test.ts`
Expected: FAIL — `PROMPT_ENTER_DELAY_MS` tanımsız, `h.monitor.agents is not a function`.

- [ ] **Step 3: Kayıt türü** — `app-electron/shared/agentTypes.ts`

`AgentRegistration` arayüzünde `added: boolean;` satırının altına:

```ts
  /** Bölmenin çalışma alanı (Görev Panosu dağıtımı; spec 2026-10-18 gorev-panosu §5). */
  workspaceId?: string;
  /** Ajanın rolü (rol ipucu eşleşmesi). */
  role?: string;
```

- [ ] **Step 4: İzleyici** — `app-electron/main/agentMonitor.ts`

İçe aktarımı genişlet: `import { AGENT_ROLE_MAX, isAgentEngineId, type AgentAnswerResult, type AgentRegistration, type AgentRoleKind, type AgentStatus, type AgentStatusEvent } from "../shared/agentTypes";`

`TYPING_GUARD_MS` satırının altına:

```ts
/**
 * Pano istemi yazıldıktan sonra Enter'a kadar beklenen süre. Bazı TUI'ler
 * tek parçada gelen "metin + Enter"i yapıştırma sayıp Enter'ı satır sonu
 * yapabiliyor; Enter ayrı yazılıyor ve o anda motor yeniden denetleniyor.
 */
export const PROMPT_ENTER_DELAY_MS = 150;

export type AgentPromptResult = "ok" | "noAgent" | "notRunning" | "typing" | "invalid" | "writeFailed";

/** Görev panosunun gördüğü ajan (spec 2026-10-18 gorev-panosu §5). */
export interface AgentPresence {
  reg: AgentRegistration;
  status: AgentStatus | null;
  /** Taslak yok ve son tuş TYPING_GUARD_MS'den eski. */
  inputIdle: boolean;
}
```

`MonitorDeps`'e (son alanın altına):

```ts
  /** Gecikmeli iş (Enter). Yoksa setTimeout; testte enjekte. */
  schedule?(fn: () => void, ms: number): void;
```

`AgentMonitor` arayüzüne (`snapshot()` satırının altına):

```ts
  agents(): AgentPresence[];
  sendPrompt(paneId: string, text: string): AgentPromptResult;
```

`createAgentMonitor` içinde, `answer` fonksiyonunun hemen altına:

```ts
  const inputIdle = (entry: Entry): boolean =>
    !entry.input.hasDraft() && deps.now() - entry.lastInputAt >= TYPING_GUARD_MS;

  // Görev panosunun istemi (spec 2026-10-18 gorev-panosu §5). Motor
  // çalışmıyorsa (kabuk istemi ekranda) HİÇBİR ŞEY yazılmıyor: yapay zekâ
  // metni asla cmd/PowerShell komutu olmamalı. Enter'dan önce yeniden bakılıyor.
  function sendPrompt(paneId: string, text: string): AgentPromptResult {
    const entry = byPane.get(paneId);
    if (!entry) return "noAgent";
    if (!text || /[\u0000-\u001f\u007f]/.test(text)) return "invalid";
    let sentAt = 0;
    try {
      entry.reader.poll();
      if (entry.reader.status().state === "finished") return "notRunning";
      if (!inputIdle(entry)) return "typing";
      if (!deps.write(entry.reg.ptyId, text)) return "writeFailed";
      sentAt = deps.now();
    } catch {
      return "writeFailed";
    }
    const enter = () =>
      guard(() => {
        if (byPane.get(paneId) !== entry) return;
        // Arada kullanıcı yazdıysa Enter onun satırını da gönderirdi: bırak.
        if (entry.lastInputAt > sentAt || entry.input.hasDraft()) return;
        entry.reader.poll();
        if (entry.reader.status().state === "finished") {
          deps.write(entry.reg.ptyId, "\x1b");
          return;
        }
        if (deps.write(entry.reg.ptyId, "\r")) entry.reader.submitLine(text);
      });
    if (deps.schedule) deps.schedule(enter, PROMPT_ENTER_DELAY_MS);
    else setTimeout(enter, PROMPT_ENTER_DELAY_MS);
    return "ok";
  }
```

Dönen nesnede `snapshot() { … },` bloğunun altına:

```ts
    agents() {
      const out: AgentPresence[] = [];
      for (const entry of byPane.values()) out.push({ reg: entry.reg, status: entry.last, inputIdle: inputIdle(entry) });
      return out;
    },
    sendPrompt,
```

`readAgentRegistration`'ın dönüşünü şuna çevir:

```ts
  const workspaceId = text(record.workspaceId, 100).trim();
  const role = text(record.role, 200).trim().slice(0, AGENT_ROLE_MAX).trim();
  return {
    paneId,
    ptyId,
    engine: record.engine,
    cwd,
    command: text(record.command, 400),
    name: text(record.name, 60),
    roleKind,
    sap: record.sap === true,
    added: record.added === true,
    ...(workspaceId ? { workspaceId } : {}),
    ...(role ? { role } : {})
  };
```

- [ ] **Step 5: Renderer kaydı** — `src/stores/terminalStore.tsx`

`register` içindeki `window.api.agentRegister({ … })` nesnesinde `added: freshAgents.current.delete(pane.id)` satırının altına:

```ts
            role: spec.role,
            ...(owner ? { workspaceId: owner.workspace.id } : {})
```

(`added: …` satırının sonuna virgül ekle.)

`tests/terminalStore.test.tsx`'teki "kayıt: ilk başlatmada 'eklendi'…" testinde `toHaveBeenCalledWith({ … added: true })` nesnesine iki alan ekle:

```ts
      added: true,
      role: "",
      workspaceId: expect.any(String)
```

- [ ] **Step 6: Yeşili gör**

Run: `npx vitest run tests/agentMonitor.test.ts tests/terminalStore.test.tsx tests/agentIpcWiring.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 7: Commit**

```bash
git add app-electron/shared/agentTypes.ts app-electron/main/agentMonitor.ts src/stores/terminalStore.tsx tests/agentMonitor.test.ts tests/terminalStore.test.tsx
git commit -m "Gorev Panosu: izleyiciye agents() ve sendPrompt() (motor kapaliyken yazmaz)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Pano yöneticisi (ana süreç) ve bildirim kararı

**Files:**
- Create: `app-electron/main/boardManager.ts`
- Create: `app-electron/main/boardNotification.ts`
- Test: `tests/boardManager.test.ts`

**Interfaces:**
- Consumes: Task 1 (`approveTask`, `advanceDependencies`, `applyAgentStatuses`, `applyProof`, `assignSubtask`, `graphError`, `manualProof`, `mapSubtask`, `requeueSubtask`, `withDerivedState`, türler, `MAX_TASKS`, `TASK_TITLE_MAX`, `TASK_GOAL_MAX`); Task 2 `buildLeadPrompt`; Task 3 (`agentEligible`, `busyPanes`, `planDispatch`, `sendBackPrompt`, `toPromptLine`, `AgentInfo`, `isBoardId`, `BoardCommand`, `BoardCommandResult`, `BoardFailure`); Task 4 `BoardFileResult` (tür); Task 5 `VerifyRun` (tür); Task 6 `LeadRun`, `LeadOutcome` (tür); Task 7 `AgentPresence`, `AgentPromptResult`, `LogFields` (tür); `AgentNotificationPayload` (`agentNotification.ts`).
- Produces:

```ts
// boardManager.ts
export interface BoardStorePort { read(workspaceId: string): BoardFileResult; write(workspaceId: string, tasks: readonly BoardTask[]): boolean;
  remove(workspaceId: string): void; list(): string[] }
export interface BoardWorkspaceInfo { cwd: string; verify: string[] }
export interface BoardManagerDeps {
  now(): number; newId(): string; store: BoardStorePort;
  agents(): AgentPresence[]; sendPrompt(paneId: string, text: string): AgentPromptResult;
  workspace(workspaceId: string): BoardWorkspaceInfo | null;          // null: alan yok
  startLead(cwd: string, prompt: string): LeadRun;
  startVerify(commands: readonly string[], cwd: string): VerifyRun;
  emit(board: Board): void;
  notify(kind: BoardNotificationKind, workspaceId: string, taskTitle: string): void;
  log(tag: string, fields: LogFields): void;
}
export interface BoardManager {
  get(workspaceId: string): Board | null;                                 // geçersiz kimlikte null
  command(workspaceId: string, cmd: BoardCommand): BoardCommandResult;    // hiç atmıyor
  tick(): void;                                                           // her saniye ve her durum olayında
  prune(keep: readonly string[]): void;                                   // boş listede hiçbir şey silmez
  dispose(): void;
}
export function createBoardManager(deps: BoardManagerDeps): BoardManager;

// boardNotification.ts
export type BoardNotificationKind = "taskDone" | "subtaskFailed";
export function boardNotificationFor(kind: BoardNotificationKind, focused: boolean, enabled: boolean, taskTitle: string, lang?: "tr" | "en"): AgentNotificationPayload | null;
```

Yönetici kuralları: her değişiklik `commit` ile (diske yaz + `emit` + bildirim kararı); okunamayan panoda (`unreadable`) hiçbir komut ve yazma yok; lider/doğrulama sonucu geldiğinde görev/alt görev hâlâ uygun durumda değilse yok sayılır; günlüğe yalnız Global Constraints'teki alanlar.

- [ ] **Step 1: Kırmızı test** — `tests/boardManager.test.ts`

```ts
// Pano yöneticisi (spec 2026-10-18 gorev-panosu §3–§7, §9). Depo, izleyici,
// lider, doğrulama, bildirim ve günlük sahte; axet-code çalıştırılmıyor.
import { describe, expect, it, vi } from "vitest";
import { createBoardManager } from "../app-electron/main/boardManager";
import { boardNotificationFor } from "../app-electron/main/boardNotification";
import type { AgentPresence, AgentPromptResult, LogFields } from "../app-electron/main/agentMonitor";
import type { BoardFileResult } from "../app-electron/main/boardStore";
import type { LeadOutcome } from "../app-electron/main/boardLead";
import type { AgentStatus } from "../app-electron/shared/agentTypes";
import type { SubtaskDraft } from "../app-electron/shared/boardCommands";
import type { Board, BoardTask, Proof } from "../app-electron/shared/boardTypes";

const exact = (state: AgentStatus["state"], lastActivity: number | null = 500): AgentStatus => ({ state, source: "exact", lastActivity });
const presence = (
  paneId: string,
  status: AgentStatus | null,
  over: Partial<AgentPresence["reg"]> = {},
  inputIdle = true
): AgentPresence => ({
  reg: {
    paneId,
    ptyId: `t-${paneId}`,
    engine: "axet-code",
    cwd: "C:\\kok",
    command: "axet-code -y",
    name: paneId,
    roleKind: "custom",
    sap: false,
    added: false,
    workspaceId: "w1",
    role: "",
    ...over
  },
  status,
  inputIdle
});
const proof = (ok: boolean): Proof => ({
  kind: "commands",
  ok,
  at: 9,
  commands: [{ command: "npm test", exitCode: ok ? 0 : 1, durationMs: 40, tail: ok ? "geçti" : "FAIL x.test.ts" }]
});
const flush = () => new Promise((r) => setTimeout(r, 0));
const draft = (id: string, over: Partial<SubtaskDraft> = {}): SubtaskDraft => ({
  id,
  title: `Alt ${id}`,
  prompt: `İstem ${id}\nikinci satır`,
  roleHint: "",
  dependsOn: [],
  ...over
});

function harness(opts: { verify?: string[]; files?: Record<string, BoardFileResult> } = {}) {
  const clock = { ms: 1_000 };
  let seq = 0;
  const written = new Map<string, BoardTask[]>();
  const removed: string[] = [];
  const emitted: Board[] = [];
  const notified: [string, string, string][] = [];
  const logs: [string, LogFields][] = [];
  const prompts: [string, string][] = [];
  const state = { agents: [] as AgentPresence[], promptResult: "ok" as AgentPromptResult, agentsThrow: false };
  const leads: { cwd: string; prompt: string; resolve: (o: LeadOutcome) => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const verifies: { commands: readonly string[]; cwd: string; resolve: (p: Proof) => void; cancel: ReturnType<typeof vi.fn> }[] = [];
  const info = { cwd: "C:\\kok", verify: opts.verify ?? ["npm test"] };
  const manager = createBoardManager({
    now: () => clock.ms,
    newId: () => `id${++seq}`,
    store: {
      read: (id) => opts.files?.[id] ?? { tasks: [] },
      write: (id, tasks) => {
        written.set(id, JSON.parse(JSON.stringify(tasks)));
        return true;
      },
      remove: (id) => {
        removed.push(id);
      },
      list: () => [...new Set([...written.keys(), ...Object.keys(opts.files ?? {})])]
    },
    agents: () => {
      if (state.agentsThrow) throw new Error("izleyici patladı");
      return state.agents;
    },
    sendPrompt: (paneId, text) => {
      if (state.promptResult === "ok") prompts.push([paneId, text]);
      return state.promptResult;
    },
    workspace: (id) => (id === "w1" ? info : null),
    startLead: (cwd, prompt) => {
      let resolve: (o: LeadOutcome) => void = () => {};
      const done = new Promise<LeadOutcome>((r) => {
        resolve = r;
      });
      const cancel = vi.fn();
      leads.push({ cwd, prompt, resolve, cancel });
      return { done, cancel };
    },
    startVerify: (commands, cwd) => {
      let resolve: (p: Proof) => void = () => {};
      const done = new Promise<Proof>((r) => {
        resolve = r;
      });
      const cancel = vi.fn();
      verifies.push({ commands, cwd, resolve, cancel });
      return { done, cancel };
    },
    emit: (b) => emitted.push(b),
    notify: (kind, ws, title) => notified.push([kind, ws, title]),
    log: (tag, fields) => logs.push([tag, fields])
  });
  const board = () => manager.get("w1")!;
  const task = (id = "id1") => board().tasks.find((t) => t.id === id)!;
  const save = (subtasks: SubtaskDraft[]) =>
    manager.command("w1", { type: "saveDraft", taskId: "id1", title: "İade akışı", goal: "Ödeme modülüne iade ekle", subtasks });
  return { clock, manager, written, removed, emitted, notified, logs, prompts, state, leads, verifies, info, board, task, save };
}

type H = ReturnType<typeof harness>;

/** Görev oluşturur, taslağı kaydeder, onaylar; görev kimliği "id1". */
function approvedTask(h: H, subtasks: SubtaskDraft[] = [draft("a")]) {
  expect(h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Ödeme modülüne iade ekle" })).toEqual({ ok: true, taskId: "id1" });
  expect(h.save(subtasks)).toEqual({ ok: true, taskId: "id1" });
  expect(h.manager.command("w1", { type: "approve", taskId: "id1" })).toEqual({ ok: true, taskId: "id1" });
}

/** "a" alt görevini p1'e verip ajanı bitirtir: a verifying. */
function runToVerifying(h: H) {
  h.state.agents = [presence("p1", exact("idle"))];
  h.manager.tick();
  h.state.agents = [presence("p1", exact("idle", 1_500))];
  h.manager.tick();
}

describe("görev, taslak, onay", () => {
  it("alt görevsiz onay reddediliyor; onayda ready/waiting, dosyaya yazılıyor, yayınlanıyor", () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    expect(h.manager.command("w1", { type: "approve", taskId: "id1" })).toEqual({ ok: false, reason: "badState" });
    h.save([draft("a"), draft("b", { dependsOn: ["a"] })]);
    expect(h.task().state).toBe("awaitingApproval");
    expect(h.manager.command("w1", { type: "approve", taskId: "id1" }).ok).toBe(true);
    expect(h.task().subtasks.map((s) => s.state)).toEqual(["ready", "waiting"]);
    expect(h.written.get("w1")![0].subtasks.map((s) => s.state)).toEqual(["ready", "waiting"]);
    expect(h.emitted.at(-1)!.tasks[0].state).toBe("running");
  });

  it("taslak: döngü ve geçersiz bağımlılık reddediliyor; onaylı görevde düzenleme yok", () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "" });
    expect(h.save([draft("a", { dependsOn: ["b"] }), draft("b", { dependsOn: ["a"] })])).toEqual({ ok: false, reason: "cycle" });
    expect(h.save([draft("a", { dependsOn: ["x"] })])).toEqual({ ok: false, reason: "badDependency" });
    h.save([draft("a")]);
    h.manager.command("w1", { type: "approve", taskId: "id1" });
    expect(h.save([draft("a")])).toEqual({ ok: false, reason: "badState" });
  });

  it("pano başına 50 görev", () => {
    const h = harness();
    for (let i = 0; i < 50; i += 1) h.manager.command("w1", { type: "createTask", title: `G${i}`, goal: "" });
    expect(h.manager.command("w1", { type: "createTask", title: "fazla", goal: "" })).toEqual({ ok: false, reason: "limit" });
  });
});

describe("lider", () => {
  it("Böl: alan kökünde; istemde hedef ve bu alanın rolleri; planlanıyor; plan taslağa geliyor; günlükte hedef/istem yok", async () => {
    const h = harness();
    h.state.agents = [presence("p1", exact("idle"), { role: "coder" }), presence("p9", exact("idle"), { role: "başka", workspaceId: "w2" })];
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "GİZLİ HEDEF" });
    expect(h.manager.command("w1", { type: "split", taskId: "id1" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.leads[0].cwd).toBe("C:\\kok");
    expect(h.leads[0].prompt).toContain("GİZLİ HEDEF");
    expect(h.leads[0].prompt).toContain("rolleri: coder");
    expect(h.leads[0].prompt).not.toContain("başka");
    expect(h.task().planning).toBe(true);
    expect(h.manager.command("w1", { type: "split", taskId: "id1" })).toEqual({ ok: false, reason: "badState" });
    expect(h.manager.command("w1", { type: "approve", taskId: "id1" })).toEqual({ ok: false, reason: "badState" });
    h.leads[0].resolve({
      ok: true,
      changedFiles: true,
      durationMs: 1200,
      subtasks: [
        { title: "Model", prompt: "Tabloyu ekle", roleHint: "coder", dependsOn: [] },
        { title: "Test", prompt: "Testleri yaz", roleHint: "", dependsOn: [0] }
      ]
    });
    await flush();
    const t = h.task();
    expect(t.planning).toBeUndefined();
    expect(t.state).toBe("awaitingApproval");
    expect(t.leadChangedFiles).toBe(true);
    expect(t.subtasks.map((s) => [s.id, s.title, s.dependsOn, s.state])).toEqual([
      ["id2", "Model", [], "waiting"],
      ["id3", "Test", ["id2"], "waiting"]
    ]);
    expect(h.logs).toContainEqual(["pano.lider", { sure: 1200, altGorev: 2, sonuc: "tamam" }]);
    expect(JSON.stringify(h.logs)).not.toContain("GİZLİ HEDEF");
    expect(JSON.stringify(h.logs)).not.toContain("Tabloyu ekle");
  });

  it("lider hatası: stuck, açık kod, ham cevap; Yeniden dene yeni lider başlatıyor ve hatayı siliyor", async () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    h.manager.command("w1", { type: "split", taskId: "id1" });
    h.leads[0].resolve({ ok: false, error: "noJson", raw: "Bölemem.", changedFiles: false, durationMs: 5 });
    await flush();
    expect(h.task()).toMatchObject({ state: "stuck", leadError: "noJson", leadRaw: "Bölemem." });
    expect(h.logs).toContainEqual(["pano.lider", { sure: 5, altGorev: 0, sonuc: "gecersiz" }]);
    expect(h.manager.command("w1", { type: "split", taskId: "id1" }).ok).toBe(true);
    expect(h.leads).toHaveLength(2);
    expect(h.task().leadError).toBeUndefined();
  });

  it("axet-code yok: binary + Doktor mesajı; elle alt görev ekleyince hata siliniyor", async () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    h.manager.command("w1", { type: "split", taskId: "id1" });
    h.leads[0].resolve({ ok: false, error: "binary", detail: "axet-code bulunamadı", changedFiles: false, durationMs: 1 });
    await flush();
    expect(h.task()).toMatchObject({ state: "stuck", leadError: "binary", leadDetail: "axet-code bulunamadı" });
    expect(h.logs).toContainEqual(["pano.lider", { sure: 1, altGorev: 0, sonuc: "motor" }]);
    h.save([draft("a")]);
    expect(h.task()).toMatchObject({ state: "awaitingApproval" });
    expect(h.task().leadError).toBeUndefined();
  });

  it("silinmiş göreve geç lider sonucu yazılmıyor; silme lideri iptal ediyor", async () => {
    const h = harness();
    h.manager.command("w1", { type: "createTask", title: "İade akışı", goal: "Hedef" });
    h.manager.command("w1", { type: "split", taskId: "id1" });
    expect(h.manager.command("w1", { type: "deleteTask", taskId: "id1" }).ok).toBe(true);
    expect(h.leads[0].cancel).toHaveBeenCalled();
    h.leads[0].resolve({ ok: true, changedFiles: false, durationMs: 1, subtasks: [{ title: "A", prompt: "B", roleHint: "", dependsOn: [] }] });
    await flush();
    expect(h.board().tasks).toEqual([]);
  });
});

describe("dağıtım", () => {
  it("kendiliğinden: uygun ajana tek satır istem; deneme, gönderim anı; günlükte istem yok; ikinci turda yeniden yazmıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    expect(h.prompts).toEqual([["p1", "İstem a ikinci satır"]]);
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", paneId: "p1", attempts: 1, dispatchedAt: 1_000 });
    expect(h.logs).toContainEqual(["pano.dagitim", { altGorev: "a", bolme: "p1", yol: "oto" }]);
    expect(JSON.stringify(h.logs)).not.toContain("İstem");
    h.manager.tick();
    expect(h.prompts).toHaveLength(1);
  });

  it("motor kapalı (kabuk istemi) ya da kullanıcı yazıyor: hiçbir şey yazılmıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", { state: "finished", source: "estimated", lastActivity: 1 }), presence("p2", exact("idle"), {}, false)];
    h.manager.tick();
    expect(h.prompts).toEqual([]);
    expect(h.task().subtasks[0].state).toBe("ready");
  });

  it("izleyici son anda reddederse (notRunning) alt görev ready kalıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.state.promptResult = "notRunning";
    h.manager.tick();
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", paneId: null, attempts: 0 });
  });

  it("Ajana ver: tahmini boşta ajana elle verilebiliyor; meşgul ajana, yazan kullanıcıya, başka alanın ajanına verilemiyor", () => {
    const h = harness();
    approvedTask(h, [draft("a"), draft("b")]);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p1" })).toEqual({ ok: false, reason: "notEligible" });
    const quiet: AgentStatus = { state: "idle", source: "estimated", lastActivity: 900 };
    h.state.agents = [presence("p1", exact("running")), presence("p2", quiet, {}, false), presence("p3", exact("idle"), { workspaceId: "w2" })];
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: false, reason: "typing" });
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p3" })).toEqual({ ok: false, reason: "notEligible" });
    h.state.agents[1] = presence("p2", quiet);
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.prompts.at(-1)).toEqual(["p2", "İstem b ikinci satır"]);
    expect(h.logs).toContainEqual(["pano.dagitim", { altGorev: "b", bolme: "p2", yol: "elle" }]);
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: false, reason: "badState" });
  });

  it("ajan kapandı → ready + held, dağıtıcı atlıyor; Yeniden sıraya al → dağıtılıyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    h.state.agents = [presence("p2", exact("idle"))];
    h.manager.tick();
    expect(h.task().subtasks[0]).toMatchObject({ state: "ready", held: true, note: "agentClosed", paneId: null });
    h.manager.tick();
    expect(h.prompts).toHaveLength(1);
    expect(h.manager.command("w1", { type: "requeue", taskId: "id1", subtaskId: "a" }).ok).toBe(true);
    expect(h.prompts.at(-1)).toEqual(["p2", "İstem a ikinci satır"]);
  });

  it("yeniden başlatma: diskten held gelen alt görev kendiliğinden gönderilmiyor", () => {
    const held: BoardTask = {
      id: "t1",
      title: "İade",
      goal: "",
      state: "running",
      createdAt: 1,
      approvedAt: 2,
      subtasks: [{ id: "a", title: "A", prompt: "P", roleHint: "", dependsOn: [], state: "ready", paneId: null, attempts: 1, held: true, note: "restarted" }]
    };
    const h = harness({ files: { w1: { tasks: [held] } } });
    h.state.agents = [presence("p1", exact("idle"))];
    expect(h.board().tasks[0].subtasks[0].note).toBe("restarted");
    h.manager.tick();
    expect(h.prompts).toEqual([]);
  });

  it("izleyici hatası panoyu düşürmüyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agentsThrow = true;
    expect(() => h.manager.tick()).not.toThrow();
  });
});

describe("doğrulama ve kanıt", () => {
  it("kesin bitiş → doğrulama alan kökünde → yeşil → done; bağımlı ready; görev bitince bildirim", async () => {
    const h = harness();
    approvedTask(h, [draft("a"), draft("b", { dependsOn: ["a"] })]);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    h.state.agents = [presence("p1", exact("running"))];
    h.manager.tick();
    h.state.agents = [presence("p1", exact("idle", 2_000))];
    h.manager.tick();
    expect(h.task().subtasks[0].state).toBe("verifying");
    expect(h.verifies).toHaveLength(1);
    expect(h.verifies[0]).toMatchObject({ commands: ["npm test"], cwd: "C:\\kok" });
    h.verifies[0].resolve(proof(true));
    await flush();
    expect(h.task().subtasks.map((s) => s.state)).toEqual(["done", "ready"]);
    expect(h.logs).toContainEqual(["pano.dogrulama", { komut: 0, cikis: 0, sure: 40 }]);
    expect(h.notified).toEqual([]);
    h.clock.ms = 3_000;
    h.manager.tick();
    expect(h.prompts.at(-1)).toEqual(["p1", "İstem b ikinci satır"]);
    h.state.agents = [presence("p1", exact("idle", 4_000))];
    h.manager.tick();
    h.verifies[1].resolve(proof(true));
    await flush();
    expect(h.task().state).toBe("done");
    expect(h.notified).toEqual([["taskDone", "w1", "İade akışı"]]);
  });

  it("kırmızı → failed + bildirim; kendiliğinden geri gönderme yok; Düzeltmeye geri gönder aynı ajana", async () => {
    const h = harness();
    approvedTask(h);
    runToVerifying(h);
    h.verifies[0].resolve(proof(false));
    await flush();
    expect(h.task().subtasks[0]).toMatchObject({ state: "failed", paneId: "p1" });
    expect(h.task().state).toBe("stuck");
    expect(h.notified).toEqual([["subtaskFailed", "w1", "İade akışı"]]);
    h.manager.tick();
    expect(h.prompts).toHaveLength(1);
    expect(h.manager.command("w1", { type: "sendBack", taskId: "id1", subtaskId: "a" })).toEqual({ ok: true, taskId: "id1" });
    expect(h.prompts.at(-1)).toEqual(["p1", "Doğrulama başarısız: npm test çıktısının sonu: FAIL x.test.ts Düzelt."]);
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", attempts: 2, note: "sentBack" });
    expect(h.logs).toContainEqual(["pano.dagitim", { altGorev: "a", bolme: "p1", yol: "geri" }]);
  });

  it("doğrulama komutu yoksa: verifying'de kalıyor; Doğrula noVerify; Onayla elle kanıt → done", () => {
    const h = harness({ verify: [] });
    approvedTask(h);
    runToVerifying(h);
    expect(h.task().subtasks[0].state).toBe("verifying");
    expect(h.verifies).toEqual([]);
    expect(h.manager.command("w1", { type: "verify", taskId: "id1", subtaskId: "a" })).toEqual({ ok: false, reason: "noVerify" });
    expect(h.manager.command("w1", { type: "approveManual", taskId: "id1", subtaskId: "a" }).ok).toBe(true);
    expect(h.task().subtasks[0]).toMatchObject({ state: "done", proof: { kind: "manual", ok: true, commands: [] } });
  });

  it("komut varken elle onay reddediliyor; tahmini ajanda Doğrula elle başlatılıyor; çift Doğrula reddediliyor", () => {
    const h = harness();
    approvedTask(h);
    h.state.agents = [presence("p1", { state: "idle", source: "estimated", lastActivity: null })];
    h.manager.tick();
    h.state.agents = [presence("p1", { state: "idle", source: "estimated", lastActivity: 5_000 })];
    h.manager.tick();
    expect(h.task().subtasks[0].state).toBe("running");
    expect(h.manager.command("w1", { type: "approveManual", taskId: "id1", subtaskId: "a" })).toEqual({ ok: false, reason: "hasVerify" });
    expect(h.manager.command("w1", { type: "verify", taskId: "id1", subtaskId: "a" }).ok).toBe(true);
    expect(h.task().subtasks[0].state).toBe("verifying");
    expect(h.manager.command("w1", { type: "verify", taskId: "id1", subtaskId: "a" })).toEqual({ ok: false, reason: "badState" });
    expect(h.verifies).toHaveLength(1);
  });

  it("silinmiş göreve geç doğrulama sonucu yazılmıyor; silme doğrulamayı iptal ediyor", async () => {
    const h = harness();
    approvedTask(h);
    runToVerifying(h);
    h.manager.command("w1", { type: "deleteTask", taskId: "id1" });
    expect(h.verifies[0].cancel).toHaveBeenCalled();
    h.verifies[0].resolve(proof(true));
    await flush();
    expect(h.board().tasks).toEqual([]);
    expect(h.notified).toEqual([]);
  });
});

describe("kimlik, okunamayan pano, uyarı, budama", () => {
  it("geçersiz alan kimliği: get null, komut noBoard; okunamayan pano komutları reddediyor ve yazılmıyor", () => {
    const h = harness({ files: { w1: { tasks: [], unreadable: true } } });
    expect(h.manager.get("../x")).toBeNull();
    expect(h.manager.command("../x", { type: "createTask", title: "A", goal: "" })).toEqual({ ok: false, reason: "noBoard" });
    expect(h.board().unreadable).toBe(true);
    expect(h.manager.command("w1", { type: "createTask", title: "A", goal: "" })).toEqual({ ok: false, reason: "writeFailed" });
    expect(h.written.size).toBe(0);
  });

  it("bozuk dosya uyarısı panoda; kapatılınca gidiyor", () => {
    const h = harness({ files: { w1: { tasks: [], recoveredFrom: "w1.json.bozuk-5" } } });
    expect(h.board().recoveredFrom).toBe("w1.json.bozuk-5");
    expect(h.manager.command("w1", { type: "dismissWarning" }).ok).toBe(true);
    expect(h.board().recoveredFrom).toBeUndefined();
  });

  it("budama: listede olmayan pano siliniyor; boş liste hiçbir şey silmiyor", () => {
    const h = harness({ files: { w1: { tasks: [] }, w2: { tasks: [] } } });
    h.manager.get("w2");
    h.manager.prune([]);
    expect(h.removed).toEqual([]);
    h.manager.prune(["w1"]);
    expect(h.removed).toEqual(["w2"]);
  });
});

describe("boardNotificationFor", () => {
  it("odaktayken ya da ayar kapalıyken yok; başlık görev başlığı, gövde sabit", () => {
    expect(boardNotificationFor("taskDone", true, true, "İade")).toBeNull();
    expect(boardNotificationFor("taskDone", false, false, "İade")).toBeNull();
    expect(boardNotificationFor("taskDone", false, true, "İade")).toEqual({ title: "İade", body: "Görev bitti" });
    expect(boardNotificationFor("subtaskFailed", false, true, "  ", "en")).toEqual({ title: "NTT Studio", body: "Subtask failed" });
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardManager.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/main/boardManager"`.

- [ ] **Step 3: Bildirim kararı** — `app-electron/main/boardNotification.ts`

```ts
// Görev panosu bildirimi: SAF karar (spec 2026-10-18 gorev-panosu §8).
// Electron'a dokunmuyor; gerçek bildirim index.ts'te. Gövde sabit; başlık
// kullanıcının yazdığı görev başlığı. Alt görev başlığı, istem ya da komut
// çıktısı bildirime girmiyor.
import type { AgentNotificationPayload } from "./agentNotification";

export type BoardNotificationKind = "taskDone" | "subtaskFailed";

const BODY: Record<"tr" | "en", Record<BoardNotificationKind, string>> = {
  tr: { taskDone: "Görev bitti", subtaskFailed: "Alt görev başarısız" },
  en: { taskDone: "Task finished", subtaskFailed: "Subtask failed" }
};

export function boardNotificationFor(
  kind: BoardNotificationKind,
  focused: boolean,
  enabled: boolean,
  taskTitle: string,
  lang: "tr" | "en" = "tr"
): AgentNotificationPayload | null {
  if (focused || !enabled) return null;
  return { title: taskTitle.trim() || "NTT Studio", body: BODY[lang][kind] };
}
```

- [ ] **Step 4: Yönetici** — `app-electron/main/boardManager.ts`

```ts
// Görev panosu yöneticisi (spec 2026-10-18 gorev-panosu §3–§7, §9). Ana
// süreçte tek örnek. Panoyu diskten okuyor, komutları uyguluyor, her saniye
// ve her ajan durum olayında saf geçişleri (boardLogic) ve dağıtıcıyı
// (boardDispatch) çalıştırıyor, değişince diske yazıp renderer'a yayıyor.
//
// Kurallar:
//   - Hiçbir yol hata fırlatmıyor; söz zincirleri .catch'li.
//   - Ajanın "bitti" demesi kartı kapatmıyor; yalnız kanıt (doğrulama ya da
//     kullanıcının elle onayı).
//   - Doğrulama komutu yalnız alan ayarından (deps.workspace); IPC'den değil.
//   - Günlüğe hedef, istem, plan, komut ya da çıktı yazılmıyor.
import type { AgentStatus } from "../shared/agentTypes";
import {
  agentEligible,
  busyPanes,
  planDispatch,
  sendBackPrompt,
  toPromptLine,
  type AgentInfo
} from "../shared/boardDispatch";
import { isBoardId, type BoardCommand, type BoardCommandResult, type BoardFailure } from "../shared/boardCommands";
import {
  advanceDependencies,
  applyAgentStatuses,
  applyProof,
  approveTask,
  assignSubtask,
  graphError,
  manualProof,
  mapSubtask,
  requeueSubtask,
  withDerivedState
} from "../shared/boardLogic";
import { buildLeadPrompt } from "../shared/boardPlan";
import {
  MAX_TASKS,
  TASK_GOAL_MAX,
  TASK_TITLE_MAX,
  type Board,
  type BoardTask,
  type LeadErrorCode,
  type Proof,
  type Subtask,
  type SubtaskNote,
  type SubtaskState
} from "../shared/boardTypes";
import type { AgentPresence, AgentPromptResult, LogFields } from "./agentMonitor";
import type { LeadOutcome, LeadRun } from "./boardLead";
import type { BoardNotificationKind } from "./boardNotification";
import type { BoardFileResult } from "./boardStore";
import type { VerifyRun } from "./boardVerify";

export interface BoardStorePort {
  read(workspaceId: string): BoardFileResult;
  write(workspaceId: string, tasks: readonly BoardTask[]): boolean;
  remove(workspaceId: string): void;
  list(): string[];
}

export interface BoardWorkspaceInfo {
  /** Alanın kökü, yoksa ajanların varsayılan klasörü. */
  cwd: string;
  /** Kullanıcının alan menüsünde yazdığı doğrulama komutları. */
  verify: string[];
}

export interface BoardManagerDeps {
  now(): number;
  newId(): string;
  store: BoardStorePort;
  agents(): AgentPresence[];
  sendPrompt(paneId: string, text: string): AgentPromptResult;
  workspace(workspaceId: string): BoardWorkspaceInfo | null;
  startLead(cwd: string, prompt: string): LeadRun;
  startVerify(commands: readonly string[], cwd: string): VerifyRun;
  emit(board: Board): void;
  notify(kind: BoardNotificationKind, workspaceId: string, taskTitle: string): void;
  log(tag: string, fields: LogFields): void;
}

export interface BoardManager {
  get(workspaceId: string): Board | null;
  command(workspaceId: string, cmd: BoardCommand): BoardCommandResult;
  tick(): void;
  prune(keep: readonly string[]): void;
  dispose(): void;
}

interface Entry {
  tasks: BoardTask[];
  recoveredFrom?: string;
  unreadable?: boolean;
}

const LEAD_LOG: Record<LeadErrorCode | "ok", string> = {
  ok: "tamam",
  timeout: "sure",
  binary: "motor",
  failed: "hata",
  noJson: "gecersiz",
  badJson: "gecersiz",
  noSubtasks: "gecersiz",
  tooMany: "gecersiz",
  badField: "gecersiz",
  badDependency: "gecersiz",
  cycle: "gecersiz"
};

/** Doğrula / Onayla basılabilen durumlar ("her zaman da basılabilir", spec §6). */
const CHECKABLE: ReadonlySet<SubtaskState> = new Set<SubtaskState>(["running", "asking", "verifying", "failed"]);

const fail = (reason: BoardFailure): BoardCommandResult => ({ ok: false, reason });

function promptFailure(result: AgentPromptResult): BoardFailure {
  if (result === "typing") return "typing";
  if (result === "notRunning" || result === "noAgent") return "notEligible";
  return "writeFailed";
}

function toInfo(p: AgentPresence): AgentInfo {
  return { paneId: p.reg.paneId, workspaceId: p.reg.workspaceId ?? "", role: p.reg.role ?? "", status: p.status, inputIdle: p.inputIdle };
}

export function createBoardManager(deps: BoardManagerDeps): BoardManager {
  const boards = new Map<string, Entry>();
  /** Görev kimliği → çalışan lider. */
  const planning = new Map<string, { workspaceId: string; cancel: () => void }>();
  /** Alt görev kimliği → çalışan doğrulama. */
  const verifying = new Map<string, { workspaceId: string; cancel: () => void }>();

  function attempt<T>(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  const log = (tag: string, fields: LogFields) => attempt(() => deps.log(tag, fields), undefined);
  const presenceList = (): AgentPresence[] => attempt(() => deps.agents(), [] as AgentPresence[]);

  function load(workspaceId: string): Entry | null {
    if (!isBoardId(workspaceId)) return null;
    let entry = boards.get(workspaceId);
    if (!entry) {
      const file = attempt<BoardFileResult>(() => deps.store.read(workspaceId), { tasks: [], unreadable: true });
      entry = { tasks: file.tasks };
      if (file.recoveredFrom) entry.recoveredFrom = file.recoveredFrom;
      if (file.unreadable) entry.unreadable = true;
      boards.set(workspaceId, entry);
    }
    return entry;
  }

  function snapshot(workspaceId: string, entry: Entry): Board {
    const board: Board = {
      workspaceId,
      tasks: entry.tasks.map((t) => (planning.has(t.id) ? { ...t, planning: true } : t))
    };
    if (entry.recoveredFrom) board.recoveredFrom = entry.recoveredFrom;
    if (entry.unreadable) board.unreadable = true;
    return board;
  }

  function notifyTransitions(workspaceId: string, prev: readonly BoardTask[], next: readonly BoardTask[]): void {
    const before = new Map(prev.map((t) => [t.id, t]));
    for (const task of next) {
      const old = before.get(task.id);
      if (!old) continue;
      if (old.state !== "done" && task.state === "done") attempt(() => deps.notify("taskDone", workspaceId, task.title), undefined);
      const oldStates = new Map(old.subtasks.map((s) => [s.id, s.state]));
      const newlyFailed = task.subtasks.some((s) => s.state === "failed" && oldStates.has(s.id) && oldStates.get(s.id) !== "failed");
      if (newlyFailed) attempt(() => deps.notify("subtaskFailed", workspaceId, task.title), undefined);
    }
  }

  /** Yeni listeyi yerleştirir: değiştiyse diske yazar, bildirim kararını verir, yayınlar. */
  function commit(workspaceId: string, entry: Entry, next: BoardTask[], force = false): void {
    const prev = entry.tasks;
    if (!force && JSON.stringify(prev) === JSON.stringify(next)) return;
    entry.tasks = next;
    if (!entry.unreadable) attempt(() => deps.store.write(workspaceId, next), false);
    notifyTransitions(workspaceId, prev, next);
    attempt(() => deps.emit(snapshot(workspaceId, entry)), undefined);
  }

  const replaceTask = (tasks: readonly BoardTask[], next: BoardTask): BoardTask[] => tasks.map((t) => (t.id === next.id ? next : t));

  function startVerification(workspaceId: string, taskId: string, subtaskId: string): void {
    if (verifying.has(subtaskId)) return;
    const info = attempt(() => deps.workspace(workspaceId), null);
    // Komut yoksa alt görev verifying'de "Onayla"yı bekliyor (spec §6).
    if (!info || info.verify.length === 0) return;
    let job: VerifyRun;
    try {
      job = deps.startVerify(info.verify, info.cwd);
    } catch {
      return;
    }
    verifying.set(subtaskId, { workspaceId, cancel: job.cancel });
    job.done
      .then((proof) => {
        if (verifying.get(subtaskId)?.cancel !== job.cancel) return;
        verifying.delete(subtaskId);
        finishVerification(workspaceId, taskId, subtaskId, proof);
      })
      .catch(() => {
        if (verifying.get(subtaskId)?.cancel === job.cancel) verifying.delete(subtaskId);
      });
  }

  function finishVerification(workspaceId: string, taskId: string, subtaskId: string, proof: Proof): void {
    const entry = boards.get(workspaceId);
    const task = entry?.tasks.find((t) => t.id === taskId);
    if (!entry || !task) return;
    proof.commands.forEach((c, i) => log("pano.dogrulama", { komut: i, cikis: c.exitCode ?? "yok", sure: c.durationMs }));
    const next = mapSubtask(task, subtaskId, (s) => {
      const applied = applyProof(s, proof);
      return applied === s ? null : applied;
    });
    if (!next) return;
    commit(workspaceId, entry, replaceTask(entry.tasks, advanceDependencies(next)));
  }

  function reconcile(workspaceId: string, entry: Entry, presence: readonly AgentPresence[]): void {
    if (entry.unreadable) return;
    const statuses = new Map<string, AgentStatus | null>();
    for (const p of presence) statuses.set(p.reg.paneId, p.status);
    const toVerify: { taskId: string; subtaskId: string }[] = [];
    let tasks = entry.tasks.map((task) => {
      const applied = applyAgentStatuses(task, statuses);
      for (const subtaskId of applied.toVerify) toVerify.push({ taskId: task.id, subtaskId });
      return advanceDependencies(applied.task);
    });
    const infos = presence.filter((p) => p.reg.workspaceId === workspaceId).map(toInfo);
    for (const d of planDispatch(tasks, workspaceId, infos)) {
      const task = tasks.find((t) => t.id === d.taskId);
      const sub = task?.subtasks.find((s) => s.id === d.subtaskId);
      if (!task || !sub) continue;
      const result = attempt(() => deps.sendPrompt(d.paneId, toPromptLine(sub.prompt)), "writeFailed" as AgentPromptResult);
      if (result !== "ok") continue;
      const now = deps.now();
      const next = mapSubtask(task, sub.id, (s) => assignSubtask(s, d.paneId, now));
      if (next) tasks = replaceTask(tasks, next);
      log("pano.dagitim", { altGorev: sub.id, bolme: d.paneId, yol: "oto" });
    }
    commit(workspaceId, entry, tasks);
    for (const v of toVerify) startVerification(workspaceId, v.taskId, v.subtaskId);
  }

  function reconcileNow(workspaceId: string, entry: Entry): void {
    attempt(() => reconcile(workspaceId, entry, presenceList()), undefined);
  }

  function clearLead(task: BoardTask): BoardTask {
    const next: BoardTask = { ...task };
    delete next.leadError;
    delete next.leadDetail;
    delete next.leadRaw;
    delete next.leadChangedFiles;
    return withDerivedState(next);
  }

  function finishLead(workspaceId: string, taskId: string, outcome: LeadOutcome): void {
    planning.delete(taskId);
    log("pano.lider", {
      sure: outcome.durationMs,
      altGorev: outcome.ok ? outcome.subtasks.length : 0,
      sonuc: LEAD_LOG[outcome.ok ? "ok" : outcome.error]
    });
    const entry = boards.get(workspaceId);
    const task = entry?.tasks.find((t) => t.id === taskId);
    if (!entry) return;
    // Görev silinmiş ya da (planlanırken onaylanamaz ama) onaylanmışsa sonuç yazılmıyor.
    if (!task || task.approvedAt !== undefined) {
      attempt(() => deps.emit(snapshot(workspaceId, entry)), undefined);
      return;
    }
    let next: BoardTask;
    if (outcome.ok) {
      const ids = outcome.subtasks.map(() => deps.newId());
      next = {
        ...clearLead(task),
        subtasks: outcome.subtasks.map(
          (p, i): Subtask => ({
            id: ids[i],
            title: p.title,
            prompt: p.prompt,
            roleHint: p.roleHint,
            dependsOn: p.dependsOn.map((d) => ids[d]),
            state: "waiting",
            paneId: null,
            attempts: 0
          })
        )
      };
      if (outcome.changedFiles) next.leadChangedFiles = true;
    } else {
      next = { ...clearLead(task), leadError: outcome.error };
      if (outcome.detail) next.leadDetail = outcome.detail;
      if (outcome.raw) next.leadRaw = outcome.raw;
      if (outcome.changedFiles) next.leadChangedFiles = true;
    }
    commit(workspaceId, entry, replaceTask(entry.tasks, withDerivedState(next)), true);
  }

  function startLead(workspaceId: string, entry: Entry, task: BoardTask): BoardCommandResult {
    const info = attempt(() => deps.workspace(workspaceId), null);
    if (!info) return fail("noBoard");
    const roles = presenceList()
      .filter((p) => p.reg.workspaceId === workspaceId)
      .map((p) => p.reg.role ?? "");
    const prompt = buildLeadPrompt({ title: task.title, goal: task.goal, roles });
    let job: LeadRun;
    try {
      job = deps.startLead(info.cwd, prompt);
    } catch {
      return fail("writeFailed");
    }
    planning.set(task.id, { workspaceId, cancel: job.cancel });
    commit(workspaceId, entry, replaceTask(entry.tasks, clearLead(task)), true);
    job.done
      .then((outcome) => {
        if (planning.get(task.id)?.cancel !== job.cancel) return;
        finishLead(workspaceId, task.id, outcome);
      })
      .catch(() => {
        if (planning.get(task.id)?.cancel === job.cancel) planning.delete(task.id);
      });
    return { ok: true, taskId: task.id };
  }

  /** İstemi yazar; başarırsa alt görev running (spec §5). */
  function deliver(
    workspaceId: string,
    entry: Entry,
    task: BoardTask,
    subtaskId: string,
    paneId: string,
    text: string,
    yol: "elle" | "geri",
    note?: SubtaskNote
  ): BoardCommandResult {
    const result = attempt(() => deps.sendPrompt(paneId, text), "writeFailed" as AgentPromptResult);
    if (result !== "ok") return fail(promptFailure(result));
    const now = deps.now();
    const next = mapSubtask(task, subtaskId, (s) => {
      const assigned = assignSubtask(s, paneId, now);
      if (note) assigned.note = note;
      return assigned;
    });
    if (next) commit(workspaceId, entry, replaceTask(entry.tasks, next));
    log("pano.dagitim", { altGorev: subtaskId, bolme: paneId, yol });
    return { ok: true, taskId: task.id };
  }

  /** Elle atama ve geri gönderme için ajan: bu alanda, kayıtlı, 2–5 (spec §5; 6 atlanıyor). */
  function manualAgent(workspaceId: string, entry: Entry, paneId: string): BoardFailure | null {
    const agent = presenceList()
      .map(toInfo)
      .find((a) => a.paneId === paneId);
    if (!agent || agent.workspaceId !== workspaceId) return "notEligible";
    if (agentEligible(agent, busyPanes(entry.tasks), "manual")) return null;
    return agent.inputIdle ? "notEligible" : "typing";
  }

  function run(workspaceId: string, entry: Entry, cmd: BoardCommand): BoardCommandResult {
    if (cmd.type === "createTask") {
      if (entry.tasks.length >= MAX_TASKS) return fail("limit");
      const title = cmd.title.trim().slice(0, TASK_TITLE_MAX);
      if (!title) return fail("invalid");
      const task: BoardTask = {
        id: deps.newId(),
        title,
        goal: cmd.goal.trim().slice(0, TASK_GOAL_MAX),
        state: "draft",
        createdAt: deps.now(),
        subtasks: []
      };
      commit(workspaceId, entry, [...entry.tasks, task]);
      return { ok: true, taskId: task.id };
    }
    if (cmd.type === "dismissWarning") {
      delete entry.recoveredFrom;
      attempt(() => deps.emit(snapshot(workspaceId, entry)), undefined);
      return { ok: true };
    }
    const task = entry.tasks.find((t) => t.id === cmd.taskId);
    if (!task) return fail("noTask");
    switch (cmd.type) {
      case "split":
        if (task.approvedAt !== undefined || planning.has(task.id)) return fail("badState");
        return startLead(workspaceId, entry, task);
      case "saveDraft": {
        if (task.approvedAt !== undefined || planning.has(task.id)) return fail("badState");
        const graph = graphError(cmd.subtasks);
        if (graph) return fail(graph);
        const old = new Map(task.subtasks.map((s) => [s.id, s]));
        const subtasks = cmd.subtasks.map(
          (d): Subtask => ({
            ...(old.get(d.id) ?? { state: "waiting" as const, paneId: null, attempts: 0 }),
            id: d.id,
            title: d.title,
            prompt: d.prompt,
            roleHint: d.roleHint,
            dependsOn: [...new Set(d.dependsOn)]
          })
        );
        const next: BoardTask = { ...task, title: cmd.title.slice(0, TASK_TITLE_MAX), goal: cmd.goal.slice(0, TASK_GOAL_MAX), subtasks };
        delete next.leadError;
        delete next.leadDetail;
        delete next.leadRaw;
        commit(workspaceId, entry, replaceTask(entry.tasks, withDerivedState(next)));
        return { ok: true, taskId: task.id };
      }
      case "approve": {
        if (planning.has(task.id)) return fail("badState");
        const graph = graphError(task.subtasks);
        if (graph) return fail(graph);
        const next = approveTask(task, deps.now());
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, next));
        reconcileNow(workspaceId, entry);
        return { ok: true, taskId: task.id };
      }
      case "deleteTask": {
        const lead = planning.get(task.id);
        planning.delete(task.id);
        attempt(() => lead?.cancel(), undefined);
        for (const s of task.subtasks) {
          const v = verifying.get(s.id);
          verifying.delete(s.id);
          attempt(() => v?.cancel(), undefined);
        }
        commit(workspaceId, entry, entry.tasks.filter((t) => t.id !== task.id));
        return { ok: true, taskId: task.id };
      }
      default:
        break;
    }
    const sub = task.subtasks.find((s) => s.id === cmd.subtaskId);
    if (!sub) return fail("noSubtask");
    switch (cmd.type) {
      case "assign": {
        if (sub.state !== "ready") return fail("badState");
        const refusal = manualAgent(workspaceId, entry, cmd.paneId);
        if (refusal) return fail(refusal);
        return deliver(workspaceId, entry, task, sub.id, cmd.paneId, toPromptLine(sub.prompt), "elle");
      }
      case "sendBack": {
        if (sub.state !== "failed" || !sub.paneId || !sub.proof) return fail("badState");
        const text = sendBackPrompt(sub.proof);
        if (!text) return fail("badState");
        const refusal = manualAgent(workspaceId, entry, sub.paneId);
        if (refusal) return fail(refusal);
        return deliver(workspaceId, entry, task, sub.id, sub.paneId, text, "geri", "sentBack");
      }
      case "verify": {
        if (!CHECKABLE.has(sub.state) || verifying.has(sub.id)) return fail("badState");
        const info = attempt(() => deps.workspace(workspaceId), null);
        if (!info) return fail("noBoard");
        if (info.verify.length === 0) return fail("noVerify");
        const next = mapSubtask(task, sub.id, (s) => ({ ...s, state: "verifying" }));
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, next));
        startVerification(workspaceId, task.id, sub.id);
        return { ok: true, taskId: task.id };
      }
      case "approveManual": {
        if (!CHECKABLE.has(sub.state) || verifying.has(sub.id)) return fail("badState");
        const info = attempt(() => deps.workspace(workspaceId), null);
        if (info && info.verify.length > 0) return fail("hasVerify");
        const now = deps.now();
        const next = mapSubtask(task, sub.id, (s) => {
          const done: Subtask = { ...s, state: "done", proof: manualProof(now) };
          delete done.note;
          return done;
        });
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, advanceDependencies(next)));
        return { ok: true, taskId: task.id };
      }
      case "requeue": {
        const next = mapSubtask(task, sub.id, requeueSubtask);
        if (!next) return fail("badState");
        commit(workspaceId, entry, replaceTask(entry.tasks, next));
        reconcileNow(workspaceId, entry);
        return { ok: true, taskId: task.id };
      }
    }
    return fail("invalid");
  }

  return {
    get(workspaceId) {
      const entry = attempt(() => load(workspaceId), null);
      return entry ? snapshot(workspaceId, entry) : null;
    },
    command(workspaceId, cmd) {
      try {
        const entry = load(workspaceId);
        if (!entry) return fail("noBoard");
        if (entry.unreadable) return fail("writeFailed");
        return run(workspaceId, entry, cmd);
      } catch {
        return fail("writeFailed");
      }
    },
    tick() {
      const presence = presenceList();
      for (const [workspaceId, entry] of boards) attempt(() => reconcile(workspaceId, entry, presence), undefined);
    },
    prune(keep) {
      // Boş liste: kayıt okunamamış olabilir; hiçbir pano silinmiyor.
      if (keep.length === 0) return;
      const keepSet = new Set(keep);
      const ids = new Set([...attempt(() => deps.store.list(), [] as string[]), ...boards.keys()]);
      for (const id of ids) {
        if (keepSet.has(id)) continue;
        const entry = boards.get(id);
        for (const task of entry?.tasks ?? []) {
          attempt(() => planning.get(task.id)?.cancel(), undefined);
          planning.delete(task.id);
          for (const s of task.subtasks) {
            attempt(() => verifying.get(s.id)?.cancel(), undefined);
            verifying.delete(s.id);
          }
        }
        boards.delete(id);
        attempt(() => deps.store.remove(id), undefined);
      }
    },
    dispose() {
      for (const p of planning.values()) attempt(() => p.cancel(), undefined);
      for (const v of verifying.values()) attempt(() => v.cancel(), undefined);
      planning.clear();
      verifying.clear();
    }
  };
}
```

İlk `switch`ten sonra TypeScript `cmd`'yi alt görev komutlarına daraltıyor (`split/saveDraft/approve/deleteTask` dalları `return` ediyor). Daraltma çalışmazsa (`cmd.subtaskId` "property does not exist" derse) `const sub = …` satırının önüne şu bekçiyi koy: `if (!("subtaskId" in cmd)) return fail("invalid");`.

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/boardManager.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/boardManager.ts app-electron/main/boardNotification.ts tests/boardManager.test.ts
git commit -m "Gorev Panosu: pano yoneticisi ve bildirim karari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Alan ayarları — doğrulama komutları, Bölmeler/Pano seçimi ve "Doğrulama komutları…" penceresi

**Files:**
- Modify: `app-electron/shared/types.ts` (`SavedTerminalWorkspace`)
- Modify: `app-electron/shared/terminalLayout.ts`
- Modify: `src/stores/terminalTypes.ts`, `src/stores/terminalReducer.ts`, `src/stores/terminalStoreContext.ts`, `src/stores/terminalStore.tsx`
- Create: `src/board/VerifyCommandsDialog.tsx`
- Modify: `src/components/TerminalSidebar.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Modify (komut taklitleri): `tests/terminalMode.test.tsx`, `tests/terminalPaneView.test.tsx`, `tests/terminalSidebar.test.tsx`
- Test: `tests/boardWorkspaceSettings.test.ts`, `tests/terminalSidebar.test.tsx` (yeni test)

**Interfaces:**
- Consumes: mevcut `normalizeTerminalWorkspaces`, `replaceWorkspace` (indirgeyici içi), `Modal`, `ModalCancelButton`, `PRIMARY_BUTTON`.
- Produces:

```ts
// types.ts — SavedTerminalWorkspace'e
verify?: string[];      // en fazla 5 satır, her biri ≤ 300
view?: "board";         // yoksa "Bölmeler"

// terminalLayout.ts
export const VERIFY_MAX_COMMANDS = 5;
export const VERIFY_COMMAND_MAX = 300;
export function readVerifyCommands(raw: unknown): string[];
export function boardWorkspaceInfo(workspaces: readonly SavedTerminalWorkspace[], fallbackDir: string, workspaceId: string): { cwd: string; verify: string[] } | null;

// terminalTypes.ts — TerminalWorkspace'e verify?: string[]; view?: "board";
// TerminalAction'a:
| { type: "setWorkspaceVerify"; id: string; verify: string[] }
| { type: "setWorkspaceView"; id: string; view: "panes" | "board" }

// terminalStoreContext.ts — TerminalCommands'a:
setWorkspaceVerify: (id: string, verify: string[]) => void;
setWorkspaceView: (id: string, view: "panes" | "board") => void;

// src/board/VerifyCommandsDialog.tsx
export default function VerifyCommandsDialog(props: { open: boolean; workspaceName: string; initial: readonly string[];
  onSave: (lines: string[]) => void; onCancel: () => void }): JSX.Element;
```

Doğrulama komutu kayıtta düzenlenmiş haliyle tutulur; 300'ü aşan satır **kırpılmaz, atılır** (kırpılmış komut başka bir komuttur). `boardWorkspaceInfo` Task 10'da ana sürecin `deps.workspace`'i olur: komut YALNIZ buradan, `config.json`'daki alan kaydından okunur.

- [ ] **Step 1: Kırmızı test (veri)** — `tests/boardWorkspaceSettings.test.ts`

```ts
// Alanın doğrulama komutları ve Bölmeler/Pano seçimi (spec 2026-10-18
// gorev-panosu §2, §8): kayıttan okuma, indirgeyici, pano için alan bilgisi.
import { describe, expect, it } from "vitest";
import {
  boardWorkspaceInfo,
  normalizeTerminalWorkspaces,
  readVerifyCommands
} from "../app-electron/shared/terminalLayout";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalState } from "../src/stores/terminalTypes";

const nameFor = (n: number) => `Alan ${n}`;

describe("readVerifyCommands", () => {
  it("satırlar kırpılıyor; boş, dize olmayan, 300'ü aşan ve satır sonu içeren atılıyor; en fazla 5", () => {
    expect(readVerifyCommands(["  npm test  ", "", 5, "x".repeat(301), "a\nb", "npm run lint"])).toEqual(["npm test", "npm run lint"]);
    expect(readVerifyCommands(["1", "2", "3", "4", "5", "6"])).toEqual(["1", "2", "3", "4", "5"]);
    expect(readVerifyCommands("npm test")).toEqual([]);
  });
});

describe("normalizeTerminalWorkspaces — verify ve view", () => {
  it("eski kayıt bu alanlar olmadan açılıyor; geçerli olanlar okunuyor; bozuk view atılıyor", () => {
    const [plain, set, bad] = normalizeTerminalWorkspaces(
      [
        { id: "w1", name: "A", panes: [] },
        { id: "w2", name: "B", panes: [], verify: ["npm test", ""], view: "board" },
        { id: "w3", name: "C", panes: [], verify: "npm test", view: "office" }
      ],
      nameFor
    );
    expect("verify" in plain || "view" in plain).toBe(false);
    expect(set.verify).toEqual(["npm test"]);
    expect(set.view).toBe("board");
    expect("verify" in bad || "view" in bad).toBe(false);
  });
});

describe("boardWorkspaceInfo", () => {
  const saved = [
    { id: "w1", name: "A", panes: [], root: "C:\\kok", verify: ["npm test"] },
    { id: "w2", name: "B", panes: [] }
  ];
  it("kök varsa kök, yoksa yedek klasör; komutlar yeniden doğrulanıyor; alan yoksa null", () => {
    expect(boardWorkspaceInfo(saved, "C:\\axet", "w1")).toEqual({ cwd: "C:\\kok", verify: ["npm test"] });
    expect(boardWorkspaceInfo(saved, "C:\\axet", "w2")).toEqual({ cwd: "C:\\axet", verify: [] });
    expect(boardWorkspaceInfo(saved, "C:\\axet", "yok")).toBeNull();
    expect(boardWorkspaceInfo([{ id: "w9", name: "X", panes: [], verify: ["x".repeat(301)] }], "C:\\a", "w9")).toEqual({ cwd: "C:\\a", verify: [] });
  });
});

describe("indirgeyici: setWorkspaceVerify ve setWorkspaceView", () => {
  const ready = (): TerminalState => ({
    ...initialTerminalState,
    phase: "ready",
    workspaces: [{ id: "w1", name: "A", panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false }],
    activeWorkspaceId: "w1"
  });

  it("komutlar kaydediliyor ve toSaved'e giriyor; boş liste alanı kaldırıyor; aynı değer aynı durum", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceVerify", id: "w1", verify: [" npm test ", "x".repeat(301)] });
    expect(s.workspaces[0].verify).toEqual(["npm test"]);
    expect(toSaved(s).workspaces[0].verify).toEqual(["npm test"]);
    expect(terminalReducer(s, { type: "setWorkspaceVerify", id: "w1", verify: ["npm test"] })).toBe(s);
    const cleared = terminalReducer(s, { type: "setWorkspaceVerify", id: "w1", verify: [] });
    expect("verify" in cleared.workspaces[0]).toBe(false);
  });

  it("görünüm: board kaydediliyor, panes kaldırıyor, bilinmeyen alan aynı durum", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceView", id: "w1", view: "board" });
    expect(s.workspaces[0].view).toBe("board");
    expect(toSaved(s).workspaces[0].view).toBe("board");
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "board" })).toBe(s);
    expect("view" in terminalReducer(s, { type: "setWorkspaceView", id: "w1", view: "panes" }).workspaces[0]).toBe(false);
    expect(terminalReducer(s, { type: "setWorkspaceView", id: "yok", view: "panes" })).toBe(s);
  });

  it("geri yükleme: kayıttaki verify ve view alana geliyor", () => {
    const opened = terminalReducer(initialTerminalState, {
      type: "open",
      saved: [{ id: "w1", name: "A", panes: [], verify: ["npm test"], view: "board" }],
      activeId: "w1",
      freshId: "f",
      nameFor
    });
    // Bölmesiz kayıt geri yükleme şeridine uğramadan açılıyor (fromSaved).
    expect(opened.workspaces[0]).toMatchObject({ verify: ["npm test"], view: "board" });
  });
});
```

- [ ] **Step 2: Kırmızı test (pencere)** — `tests/terminalSidebar.test.tsx`'in `describe("TerminalSidebar", …)` bloğunun sonuna:

```tsx
  it("menü: Doğrulama komutları… penceresi satırları alana kaydediyor; 5'i aşınca kaydetmiyor", () => {
    const c = renderSidebar([ws("a", "API", [], { verify: ["npm test"] })]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Doğrulama komutları…" }));
    const box = screen.getByRole("textbox", { name: "Komutlar (satır başına bir)" }) as HTMLTextAreaElement;
    expect(box.value).toBe("npm test");
    fireEvent.change(box, { target: { value: "1\n2\n3\n4\n5\n6" } });
    expect(screen.getByRole("alert").textContent).toBe("En fazla 5 komut.");
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(box, { target: { value: "  npm run lint \n\nnpm test" } });
    const save = screen.getByRole("button", { name: "Kaydet" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(c.setWorkspaceVerify).toHaveBeenCalledTimes(1);
    expect(c.setWorkspaceVerify).toHaveBeenCalledWith("a", ["npm run lint", "npm test"]);
  });
```

Aynı dosyada `commandsMock()` dönüşüne `setPaneFontSize: vi.fn()` satırının altına `setWorkspaceVerify: vi.fn(),` ve `setWorkspaceView: vi.fn()` ekle (önceki satıra virgül). Aynı iki satırı `tests/terminalMode.test.tsx` ve `tests/terminalPaneView.test.tsx`'teki `commandsMock()`'a da ekle (yoksa `npm run typecheck` "property missing" der).

- [ ] **Step 3: Kırmızıyı gör**

Run: `npx vitest run tests/boardWorkspaceSettings.test.ts tests/terminalSidebar.test.tsx`
Expected: FAIL — `readVerifyCommands` dışa aktarılmıyor; menüde "Doğrulama komutları…" yok.

- [ ] **Step 4: Kayıt türü ve okuma** — `app-electron/shared/types.ts`, `app-electron/shared/terminalLayout.ts`

`SavedTerminalWorkspace`'te `sap?: SavedWorkspaceSap;` satırının altına:

```ts
  /** Görev panosunun doğrulama komutları; satır başına bir (spec 2026-10-18 gorev-panosu §2). */
  verify?: string[];
  /** Ajanlar ekranında son seçilen görünüm; yoksa bölmeler (spec 2026-10-18 gorev-panosu §8). */
  view?: "board";
```

`terminalLayout.ts`'te `readWorkspaceSap` fonksiyonunun altına:

```ts
// Görev panosunun doğrulama komutları (spec 2026-10-18 gorev-panosu §2).
// Kullanıcının kendi yazdığı metin; liderden ya da ajandan gelmez. 300'ü
// aşan satır KIRPILMIYOR, atılıyor: kırpılmış komut başka bir komuttur.
export const VERIFY_MAX_COMMANDS = 5;
export const VERIFY_COMMAND_MAX = 300;

export function readVerifyCommands(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw as unknown[]) {
    if (out.length >= VERIFY_MAX_COMMANDS) break;
    if (typeof item !== "string") continue;
    const line = item.trim();
    if (!line || line.length > VERIFY_COMMAND_MAX || /[\r\n\u0000]/.test(line)) continue;
    out.push(line);
  }
  return out;
}

/** Pano için alanın klasörü (kök, yoksa yedek) ve doğrulama komutları; alan yoksa null. */
export function boardWorkspaceInfo(
  workspaces: readonly SavedTerminalWorkspace[],
  fallbackDir: string,
  workspaceId: string
): { cwd: string; verify: string[] } | null {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;
  return { cwd: workspace.root?.trim() || fallbackDir, verify: readVerifyCommands(workspace.verify) };
}
```

`normalizeTerminalWorkspaces` içinde `if (sap) workspace.sap = sap;` satırının altına:

```ts
    const verify = readVerifyCommands(record.verify);
    if (verify.length) workspace.verify = verify;
    if (record.view === "board") workspace.view = "board";
```

- [ ] **Step 5: Renderer durumu** — `src/stores/terminalTypes.ts`, `terminalReducer.ts`, `terminalStoreContext.ts`, `terminalStore.tsx`

`terminalTypes.ts` — `TerminalWorkspace`'te `sap?: SavedWorkspaceSap;` altına:

```ts
  verify?: string[];
  view?: "board";
```

`TerminalAction` birleşiminin sonuna (`setWorkspaceRoot` satırından sonra; o satırın sonundaki `;`'yi kaldır):

```ts
  | { type: "setWorkspaceVerify"; id: string; verify: string[] }
  | { type: "setWorkspaceView"; id: string; view: "panes" | "board" };
```

`terminalReducer.ts` — `terminalLayout` içe aktarımına `readVerifyCommands` ekle. `fromSaved`'de `...(saved.sap ? { sap: saved.sap } : {}),` satırının altına:

```ts
    ...(saved.verify?.length ? { verify: [...saved.verify] } : {}),
    ...(saved.view === "board" ? { view: "board" as const } : {}),
```

`toSaved`'de `...(w.sap ? { sap: w.sap } : {})` satırını şuna çevir:

```ts
      ...(w.sap ? { sap: w.sap } : {}),
      ...(w.verify?.length ? { verify: w.verify } : {}),
      ...(w.view === "board" ? { view: "board" as const } : {})
```

`case "setWorkspaceRoot": { … }` bloğunun altına:

```ts
    case "setWorkspaceVerify": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      if (!workspace) return state;
      const verify = readVerifyCommands(action.verify);
      if (JSON.stringify(workspace.verify ?? []) === JSON.stringify(verify)) return state;
      const next = { ...workspace };
      delete next.verify;
      return replaceWorkspace(state, verify.length ? { ...next, verify } : next);
    }
    case "setWorkspaceView": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      if (!workspace || (workspace.view ?? "panes") === action.view) return state;
      const next = { ...workspace };
      delete next.view;
      return replaceWorkspace(state, action.view === "board" ? { ...next, view: "board" } : next);
    }
```

`terminalStoreContext.ts` — `TerminalCommands`'ta `setWorkspaceRoot` satırının altına:

```ts
  /** Görev panosunun doğrulama komutları (spec 2026-10-18 gorev-panosu §2). */
  setWorkspaceVerify: (id: string, verify: string[]) => void;
  /** Ajanlar ekranında Bölmeler | Pano (spec 2026-10-18 gorev-panosu §8). */
  setWorkspaceView: (id: string, view: "panes" | "board") => void;
```

`terminalStore.tsx` — `signature()` içindeki alan nesnesinde `sap: w.sap ?? null` satırını şuna çevir (yoksa değişiklik diske yazılmaz):

```ts
        sap: w.sap ?? null,
        verify: w.verify ?? [],
        view: w.view ?? null
```

`commands` nesnesinde `setWorkspaceRoot: …` satırının altına:

```ts
      setWorkspaceVerify: (id, verify) => dispatch({ type: "setWorkspaceVerify", id, verify }),
      setWorkspaceView: (id, view) => dispatch({ type: "setWorkspaceView", id, view }),
```

- [ ] **Step 6: Pencere** — `src/board/VerifyCommandsDialog.tsx`

```tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import { VERIFY_COMMAND_MAX, VERIFY_MAX_COMMANDS } from "../../app-electron/shared/terminalLayout";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON } from "../ui/buttons";

// "Doğrulama komutları…" (spec 2026-10-18 gorev-panosu §6, §8): alanın
// kanıt komutları, satır başına bir. Yalnız kullanıcının buraya yazdığı
// metin çalıştırılır; liderden ya da ajandan komut gelmez. Boş bırakılırsa
// alt görevler elle onaylanır.

const AREA =
  "min-h-28 w-full min-w-0 rounded border border-line bg-transparent px-2 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-accent-500/60";

export default function VerifyCommandsDialog({
  open,
  workspaceName,
  initial,
  onSave,
  onCancel
}: {
  open: boolean;
  workspaceName: string;
  initial: readonly string[];
  onSave: (lines: string[]) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [text, setText] = useState("");
  // Çift kaydetmeyi önlemek için ref (React yeniden çizmeden önce etkili).
  const savedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setText(initial.join("\n"));
    savedRef.current = false;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const error =
    lines.length > VERIFY_MAX_COMMANDS
      ? t("board.verifyTooMany", { max: VERIFY_MAX_COMMANDS })
      : lines.some((line) => line.length > VERIFY_COMMAND_MAX)
        ? t("board.verifyTooLong", { max: VERIFY_COMMAND_MAX })
        : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (error || savedRef.current) return;
    savedRef.current = true;
    onSave(lines);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("board.verifyTitle")} subtitle={workspaceName} size="md">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="text-xs text-slate-400">{t("board.verifyHelp")}</p>
        <textarea
          aria-label={t("board.verifyLabel")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={"npm run lint\nnpm test"}
          className={AREA}
          autoFocus
        />
        {error ? (
          <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
            {error}
          </p>
        ) : (
          <p className="text-2xs text-slate-500">
            {lines.length === 0 ? t("board.verifyEmptyHint") : t("board.verifyCount", { count: lines.length })}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <ModalCancelButton />
          <button type="submit" disabled={error !== null} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("common.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 7: Alan menüsü** — `src/components/TerminalSidebar.tsx`

İçe aktar: `import VerifyCommandsDialog from "../board/VerifyCommandsDialog";`

Durumlara ekle: `const [verifyId, setVerifyId] = useState<string | null>(null);` ve `confirmTarget` satırının altına `const verifyTarget = state.workspaces.find((w) => w.id === verifyId) ?? null;`

`menuHeight` satırındaki `3 +`'ü `4 +` yap (yeni madde).

Menüde `agents.menuRoot` düğmesinin hemen altına:

```tsx
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(null);
                setVerifyId(menuTarget.id);
              }}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
            >
              {t("board.menuVerify")}
            </button>
```

`<ConfirmDialog … />`'un altına:

```tsx
      <VerifyCommandsDialog
        open={verifyTarget !== null}
        workspaceName={verifyTarget?.name ?? ""}
        initial={verifyTarget?.verify ?? []}
        onSave={(lines) => {
          if (verifyTarget) commands.setWorkspaceVerify(verifyTarget.id, lines);
          setVerifyId(null);
        }}
        onCancel={() => setVerifyId(null)}
      />
```

- [ ] **Step 8: Metinler** — `src/i18n/tr.ts` (son `agents.menuUnlinkSap` satırından sonra; o satıra virgül) ve `src/i18n/en.ts` (aynı yer)

`tr.ts`:

```ts
  "board.menuVerify": "Doğrulama komutları…",
  "board.verifyTitle": "Doğrulama komutları",
  "board.verifyLabel": "Komutlar (satır başına bir)",
  "board.verifyHelp": "Görev panosu bir alt görevi yalnız bu komutlar sırayla çalışıp hepsi başarıyla bitince kapatır. Komutlar alanın kökünde, gizli bir pencerede çalışır; yalnız buraya yazdığın metin çalıştırılır.",
  "board.verifyTooMany": "En fazla {max} komut.",
  "board.verifyTooLong": "Bir komut en fazla {max} karakter olabilir.",
  "board.verifyEmptyHint": "Boş bırakırsan alt görevleri elle onaylarsın.",
  "board.verifyCount": "{count} komut"
```

`en.ts`:

```ts
  "board.menuVerify": "Verification commands…",
  "board.verifyTitle": "Verification commands",
  "board.verifyLabel": "Commands (one per line)",
  "board.verifyHelp": "The task board closes a subtask only when these commands run in order and all succeed. They run hidden in the workspace root; only the text you type here is ever run.",
  "board.verifyTooMany": "At most {max} commands.",
  "board.verifyTooLong": "A command can be at most {max} characters.",
  "board.verifyEmptyHint": "Leave it empty to approve subtasks by hand.",
  "board.verifyCount": "{count} commands"
```

- [ ] **Step 9: Yeşili gör**

Run: `npx vitest run tests/boardWorkspaceSettings.test.ts tests/terminalSidebar.test.tsx tests/terminalConfig.test.ts tests/terminalReducer.test.ts tests/terminalStore.test.tsx tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 10: Commit**

```bash
git add app-electron/shared/types.ts app-electron/shared/terminalLayout.ts src/stores/terminalTypes.ts src/stores/terminalReducer.ts src/stores/terminalStoreContext.ts src/stores/terminalStore.tsx src/board/VerifyCommandsDialog.tsx src/components/TerminalSidebar.tsx src/i18n/tr.ts src/i18n/en.ts tests/boardWorkspaceSettings.test.ts tests/terminalSidebar.test.tsx tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx
git commit -m "Gorev Panosu: alanin dogrulama komutlari ve Bolmeler/Pano secimi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Ana süreç bağlantısı — IPC, zamanlayıcı, bildirim, budama; preload ve tipler

**Files:**
- Modify: `app-electron/main/index.ts`
- Modify: `app-electron/preload/index.ts`, `src/window.d.ts`
- Test: `tests/boardIpcWiring.test.ts`

**Interfaces:**
- Consumes: Task 3 `readBoardCommand`, `BoardCommand`, `BoardCommandResult`; Task 4 `readBoardFile`, `writeBoardFile`, `deleteBoardFile`, `listBoardIds`; Task 5/6 `runVerification`, `runLead`, `boardsDir`, `liveVerifyDeps`, `liveLeadDeps`; Task 7 `agentMonitor.agents()`, `agentMonitor.sendPrompt()`; Task 8 `createBoardManager`, `boardNotificationFor`, `BoardNotificationKind`; Task 9 `boardWorkspaceInfo`.
- Produces (renderer'ın kullandığı):

```ts
window.api.boardGet(workspaceId: string): Promise<Board | null>;                                     // "board:get"
window.api.boardCommand(workspaceId: string, command: BoardCommand): Promise<BoardCommandResult>;   // "board:command"
window.api.onBoardChanged(cb: (board: Board) => void): () => void;                                   // "board:changed"
window.api.onBoardOpen(cb: (workspaceId: string) => void): () => void;                               // "board:open" (bildirim tıklaması)
```

- [ ] **Step 1: Kırmızı test** — `tests/boardIpcWiring.test.ts`

```ts
// Görev Panosu IPC bağlantıları — kaynak düzeyinde kilit (bkz. agentIpcWiring.test.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");

describe("Görev Panosu — IPC bağlantısı", () => {
  it("kanallar ana süreçte, preload'da ve tiplerde", () => {
    for (const channel of ["board:get", "board:command", "board:changed", "board:open"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["boardGet:", "boardCommand:", "onBoardChanged:", "onBoardOpen:"]) expect(types, name).toContain(name);
  });

  it("renderer'ın komutu doğrulanarak geçiyor", () => {
    expect(main).toMatch(/"board:command"[\s\S]{0,300}readBoardCommand\(/);
  });

  it("doğrulama komutu ve klasör yalnız config'teki alan kaydından", () => {
    expect(main).toMatch(/workspace:\s*\(id\)\s*=>[\s\S]{0,200}boardWorkspaceInfo\(/);
  });

  it("zamanlayıcı kuruluyor ve kapanışta iki yerde de durduruluyor", () => {
    expect(main).toMatch(/setInterval\(\s*\(\)\s*=>\s*boardManager\.tick\(\)/);
    expect(main.match(/stopBoardManager\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("ajan durum olayı panoyu da tetikliyor (ertelenmiş, tek seferde)", () => {
    expect(main).toMatch(/"agents:status", event\);[\s\S]{0,200}queueBoardTick\(\)/);
    expect(main).toMatch(/function queueBoardTick[\s\S]{0,300}setImmediate\(/);
  });

  it("alan silinince pano config:save'de budanıyor", () => {
    expect(main).toMatch(/"config:save"[\s\S]{0,1200}boardManager\.prune\(/);
  });

  it("bildirim tıklaması board:open; ayar chatNotifications", () => {
    expect(main).toMatch(/function showBoardNotification[\s\S]*chatNotifications !== false[\s\S]*"board:open"/);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardIpcWiring.test.ts`
Expected: FAIL — kanallar yok.

- [ ] **Step 3: Ana süreç** — `app-electron/main/index.ts`

İçe aktarımlar: `import { TERMINAL_MISSING_DIR } from "../shared/terminalLayout";` satırını `import { TERMINAL_MISSING_DIR, boardWorkspaceInfo } from "../shared/terminalLayout";` yap; altına:

```ts
import { readBoardCommand } from "../shared/boardCommands";
import { createBoardManager } from "./boardManager";
import { boardNotificationFor, type BoardNotificationKind } from "./boardNotification";
import { deleteBoardFile, listBoardIds, readBoardFile, writeBoardFile } from "./boardStore";
import { runLead } from "./boardLead";
import { runVerification } from "./boardVerify";
import { boardsDir, liveLeadDeps, liveVerifyDeps } from "./boardLive";
```

`showAgentNotification` fonksiyonunun hemen altına:

```ts
// Görev panosu bildirimi (spec 2026-10-18 gorev-panosu §8). Aynı ayar
// (`chatNotifications`) ve yaşam döngüsü; tıklayınca o alanın panosu açılıyor.
function showBoardNotification(workspaceId: string, taskTitle: string, kind: BoardNotificationKind): void {
  try {
    if (!Notification.isSupported()) return;
    const cfg = loadConfig();
    const isFocusedAndVisible = (mainWindow?.isFocused() ?? false) && !(mainWindow?.isMinimized() ?? true);
    const lang = cfg.language === "en" ? "en" : "tr";
    const payload = boardNotificationFor(kind, isFocusedAndVisible, cfg.chatNotifications !== false, taskTitle, lang);
    if (!payload) return;
    const n = new Notification({ title: payload.title, body: payload.body, silent: false, icon: resolveIconPath() });
    _liveNotifications.add(n);
    const cleanup = () => _liveNotifications.delete(n);
    n.on("close", cleanup);
    n.on("failed", cleanup);
    n.on("click", () => {
      cleanup();
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send("board:open", workspaceId);
    });
    n.show();
  } catch {
    // Ana süreçte yakalanmamış istisna bırakılmamalı.
  }
}
```

`createAgentMonitor({ … })` içindeki `emit`'i şuna çevir:

```ts
  emit: (event) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("agents:status", event);
    // Görev panosu her durum olayında da dağıtıyor (spec 2026-10-18 gorev-panosu §5).
    queueBoardTick();
  },
```

`stopAgentMonitor` fonksiyonunun altına:

```ts
// Görev panosu yöneticisi (spec 2026-10-18 gorev-panosu). Doğrulama komutu ve
// klasör YALNIZ config.json'daki alan kaydından okunuyor (boardWorkspaceInfo).
const boardManager = createBoardManager({
  now: () => Date.now(),
  newId: () => randomUUID(),
  store: {
    read: (id) => readBoardFile(boardsDir(), id, Date.now()),
    write: (id, tasks) => writeBoardFile(boardsDir(), id, tasks),
    remove: (id) => deleteBoardFile(boardsDir(), id),
    list: () => listBoardIds(boardsDir())
  },
  agents: () => agentMonitor.agents(),
  sendPrompt: (paneId, text) => agentMonitor.sendPrompt(paneId, text),
  workspace: (id) => {
    const cfg = loadConfig();
    return boardWorkspaceInfo(cfg.terminalWorkspaces, cfg.axetWorkspaceDir, id);
  },
  startLead: (cwd, prompt) => runLead(cwd, prompt, liveLeadDeps()),
  startVerify: (commands, cwd) => runVerification(commands, cwd, liveVerifyDeps()),
  emit: (board) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("board:changed", board);
  },
  notify: (kind, workspaceId, title) => showBoardNotification(workspaceId, title, kind),
  log: (tag, fields) => appLog(tag, fields)
});
let boardTimer: NodeJS.Timeout | null = null;
let boardTickQueued = false;

/** İzleyicinin durum olayından: aynı turdaki olaylar tek pano turunda toplanıyor; izleyicinin döngüsüne girilmiyor. */
function queueBoardTick(): void {
  if (boardTickQueued) return;
  boardTickQueued = true;
  setImmediate(() => {
    boardTickQueued = false;
    try {
      boardManager.tick();
    } catch {
      // pano hatası izleyiciyi düşürmesin
    }
  });
}

function stopBoardManager(): void {
  if (boardTimer) clearInterval(boardTimer);
  boardTimer = null;
  boardManager.dispose();
}
```

`registerIpc()` içinde `ipcMain.handle("agents:snapshot", …)` satırının altına:

```ts
  ipcMain.handle("board:get", (_event, workspaceId: unknown) =>
    typeof workspaceId === "string" ? boardManager.get(workspaceId) : null
  );

  ipcMain.handle("board:command", (_event, workspaceId: unknown, raw: unknown) => {
    const command = readBoardCommand(raw);
    if (typeof workspaceId !== "string" || !command) return { ok: false, reason: "invalid" };
    return boardManager.command(workspaceId, command);
  });

  if (!boardTimer) {
    boardTimer = setInterval(() => boardManager.tick(), 1_000);
  }
```

`ipcMain.handle("config:save", …)` içinde `const saved = saveConfig(clean);` satırının altına:

```ts
    // Alan silinince panosu da silinir (spec 2026-10-18 gorev-panosu §7).
    // Yalnız renderer alan listesini yazdığında; açılışta toplu silme yok.
    if (Array.isArray(clean.terminalWorkspaces)) {
      try {
        boardManager.prune(saved.terminalWorkspaces.map((w) => w.id));
      } catch {
        // budama bir sonraki kayıtta yeniden denenir
      }
    }
```

`app.on("window-all-closed", …)` ve `app.on("before-quit", …)` gövdelerinde `stopAgentMonitor();` satırının hemen ÖNÜNE `stopBoardManager();` (önce süren doğrulama/lider ağaçları kapanıyor).

- [ ] **Step 4: Preload ve tipler**

`app-electron/preload/index.ts` — `agentTypes` içe aktarımının altına:

```ts
import type { Board } from "../shared/boardTypes";
import type { BoardCommand, BoardCommandResult } from "../shared/boardCommands";
```

`onAgentOpen: …` bloğunun altına:

```ts
  boardGet: (workspaceId: string): Promise<Board | null> => ipcRenderer.invoke("board:get", workspaceId),
  boardCommand: (workspaceId: string, command: BoardCommand): Promise<BoardCommandResult> =>
    ipcRenderer.invoke("board:command", workspaceId, command),
  onBoardChanged: (callback: (board: Board) => void) => {
    const listener = (_event: unknown, board: Board) => callback(board);
    ipcRenderer.on("board:changed", listener);
    return () => ipcRenderer.removeListener("board:changed", listener);
  },
  // Pano bildirimine tıklanınca (spec 2026-10-18 gorev-panosu §8): o alanın panosu.
  onBoardOpen: (callback: (workspaceId: string) => void) => {
    const listener = (_event: unknown, workspaceId: string) => callback(workspaceId);
    ipcRenderer.on("board:open", listener);
    return () => ipcRenderer.removeListener("board:open", listener);
  },
```

`src/window.d.ts` — `agentTypes` içe aktarımının altına:

```ts
import type { Board } from "../app-electron/shared/boardTypes";
import type { BoardCommand, BoardCommandResult } from "../app-electron/shared/boardCommands";
```

`onAgentOpen: …` satırının altına:

```ts
  boardGet: (workspaceId: string) => Promise<Board | null>;
  boardCommand: (workspaceId: string, command: BoardCommand) => Promise<BoardCommandResult>;
  onBoardChanged: (callback: (board: Board) => void) => () => void;
  onBoardOpen: (callback: (workspaceId: string) => void) => () => void;
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/boardIpcWiring.test.ts tests/agentIpcWiring.test.ts tests/ipcSenderGuard.test.ts tests/notificationIpc.test.tsx tests/appTerminalWiring.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/index.ts app-electron/preload/index.ts src/window.d.ts tests/boardIpcWiring.test.ts
git commit -m "Gorev Panosu: ana surec baglantisi (IPC, zamanlayici, bildirim, budama)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Renderer pano bağlamı ve saf görünüm yardımcıları

**Files:**
- Create: `src/board/boardContext.tsx`
- Create: `src/board/boardView.ts`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/boardView.test.ts`, `tests/boardContext.test.tsx`

**Interfaces:**
- Consumes: Task 1 türler ve `SUBTASK_STATES`, `SUBTASK_NOTES`, `LEAD_ERROR_CODES`; Task 3 `BoardCommand`, `BoardCommandResult`, `BoardFailure`, `BOARD_FAILURES`; Task 10 `window.api.boardGet/boardCommand/onBoardChanged`; `useTerminalStore`; `agentPanes` (`src/agents/agentView.ts`).
- Produces:

```ts
// boardContext.tsx
export interface BoardContextValue { boards: Record<string, Board>; command: (workspaceId: string, cmd: BoardCommand) => Promise<BoardCommandResult> }
export const BoardContext: React.Context<BoardContextValue>;     // varsayılan: boş pano, komut { ok: false, reason: "noBoard" }
export function useBoards(): BoardContextValue;
export function BoardProvider(props: { children: ReactNode }): JSX.Element;   // TerminalStoreProvider İÇİNDE

// boardView.ts
export type BoardColumn = "draft" | "queued" | "running" | "verifying" | "done";
export const BOARD_COLUMNS: readonly BoardColumn[];
export const COLUMN_KEY: Record<BoardColumn, TranslationKey>;
export function taskColumn(task: BoardTask): BoardColumn;                       // onaysız → draft; done → done; değilse running
export function subtaskColumn(sub: Subtask): Exclude<BoardColumn, "draft">;
export function taskProgress(task: BoardTask): { done: number; total: number };
export function taskColor(tasks: readonly BoardTask[], taskId: string): TerminalPaneColor;  // blue/green/amber/violet döngüsü
export function failedCount(board: Board | undefined): number;
export function taskCount(board: Board | undefined): number;
export function activeSubtaskOf(boards: Record<string, Board>, paneId: string): { task: BoardTask; subtask: Subtask } | null;
export function sameFolderParallel(tasks: readonly BoardTask[], workspace: TerminalWorkspace): Set<string>;
export function assignablePanes(workspace: TerminalWorkspace): TerminalPane[];
export const SUBTASK_STATE_KEY: Record<SubtaskState, TranslationKey>;
export const NOTE_KEY: Record<SubtaskNote, TranslationKey>;
export const LEAD_ERROR_KEY: Record<LeadErrorCode, TranslationKey>;
export const FAILURE_KEY: Record<BoardFailure, TranslationKey>;
```

- [ ] **Step 1: Kırmızı test (görünüm)** — `tests/boardView.test.ts`

```ts
// Pano görünüm yardımcıları (spec 2026-10-18 gorev-panosu §8). Saf.
import { describe, expect, it } from "vitest";
import {
  activeSubtaskOf,
  assignablePanes,
  FAILURE_KEY,
  failedCount,
  LEAD_ERROR_KEY,
  NOTE_KEY,
  sameFolderParallel,
  SUBTASK_STATE_KEY,
  subtaskColumn,
  taskColor,
  taskColumn,
  taskCount,
  taskProgress
} from "../src/board/boardView";
import { BOARD_FAILURES } from "../app-electron/shared/boardCommands";
import { LEAD_ERROR_CODES, SUBTASK_NOTES, SUBTASK_STATES, type Board, type BoardTask, type Subtask } from "../app-electron/shared/boardTypes";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";

const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  title: id,
  prompt: "p",
  roleHint: "",
  dependsOn: [],
  state: "ready",
  paneId: null,
  attempts: 0,
  ...over
});
const task = (id: string, subtasks: Subtask[], over: Partial<BoardTask> = {}): BoardTask => ({
  id,
  title: id,
  goal: "",
  state: "running",
  createdAt: 1,
  approvedAt: 2,
  subtasks,
  ...over
});
const board = (tasks: BoardTask[], workspaceId = "w1"): Board => ({ workspaceId, tasks });
const pane = (id: string, cwd: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd,
  run: { state: "running", ptyId: `t-${id}` }
});
const ws = (panes: TerminalPane[]): TerminalWorkspace => ({
  id: "w1",
  name: "A",
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
});

describe("sütunlar", () => {
  it("görev: onaysız taslak, bitmiş bitti, ötekiler çalışıyor", () => {
    expect(taskColumn(task("t", [], { approvedAt: undefined, state: "stuck" }))).toBe("draft");
    expect(taskColumn(task("t", [], { state: "done" }))).toBe("done");
    expect(taskColumn(task("t", [], { state: "stuck" }))).toBe("running");
  });

  it("alt görev: waiting/ready sırada, running/asking çalışıyor, verifying/failed doğrulama, done bitti", () => {
    const map = Object.fromEntries(SUBTASK_STATES.map((s) => [s, subtaskColumn(sub("a", { state: s }))]));
    expect(map).toEqual({ waiting: "queued", ready: "queued", running: "running", asking: "running", verifying: "verifying", failed: "verifying", done: "done" });
  });
});

describe("ilerleme, renk, sayılar", () => {
  it("ilerleme bitmiş/toplam", () => {
    expect(taskProgress(task("t", [sub("a", { state: "done" }), sub("b")]))).toEqual({ done: 1, total: 2 });
  });

  it("renk oluşturulma sırasına göre dört renkte dönüyor; bilinmeyen gri", () => {
    const tasks = [5, 1, 3, 2, 4].map((n) => task(`t${n}`, [], { createdAt: n }));
    expect(["t1", "t2", "t3", "t4", "t5"].map((id) => taskColor(tasks, id))).toEqual(["blue", "green", "amber", "violet", "blue"]);
    expect(taskColor(tasks, "yok")).toBe("gray");
  });

  it("başarısız alt görev ve görev sayısı", () => {
    const b = board([task("t1", [sub("a", { state: "failed" }), sub("b", { state: "failed" })]), task("t2", [sub("c")])]);
    expect(failedCount(b)).toBe(2);
    expect(taskCount(b)).toBe(2);
    expect(failedCount(undefined)).toBe(0);
  });
});

describe("ajan ilişkisi", () => {
  it("ajanın üstündeki alt görev: running/asking/verifying; failed ve done değil", () => {
    const boards = {
      w1: board([task("t1", [sub("a", { state: "done", paneId: "p1" }), sub("b", { state: "asking", paneId: "p1" }), sub("c", { state: "failed", paneId: "p2" })])])
    };
    expect(activeSubtaskOf(boards, "p1")?.subtask.id).toBe("b");
    expect(activeSubtaskOf(boards, "p2")).toBeNull();
  });

  it("aynı klasörde paralel: yol büyük/küçük harf ve sondaki ayraç duyarsız", () => {
    const tasks = [
      task("t1", [sub("a", { state: "running", paneId: "p1" }), sub("b", { state: "asking", paneId: "p2" }), sub("c", { state: "running", paneId: "p3" })])
    ];
    const set = sameFolderParallel(tasks, ws([pane("p1", "C:\\proje"), pane("p2", "c:\\PROJE\\"), pane("p3", "C:\\baska")]));
    expect([...set].sort()).toEqual(["a", "b"]);
  });

  it("elle atanabilir bölmeler: çalışan ajan bölmeleri", () => {
    const stopped: TerminalPane = { ...pane("p2", "C:\\a"), run: { state: "exited", ptyId: "x", code: 0 } };
    const shell: TerminalPane = { id: "p3", kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: "y" } };
    expect(assignablePanes(ws([pane("p1", "C:\\a"), stopped, shell])).map((p) => p.id)).toEqual(["p1"]);
  });
});

describe("metin anahtarları", () => {
  it("her durum, not, lider hatası ve komut hatası için iki dilde metin var", () => {
    const keys = [
      ...SUBTASK_STATES.map((s) => SUBTASK_STATE_KEY[s]),
      ...SUBTASK_NOTES.map((n) => NOTE_KEY[n]),
      ...LEAD_ERROR_CODES.map((c) => LEAD_ERROR_KEY[c]),
      ...BOARD_FAILURES.map((f) => FAILURE_KEY[f])
    ];
    for (const key of keys) {
      expect(tr[key], key).toBeTruthy();
      expect(en[key], key).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Kırmızı test (bağlam)** — `tests/boardContext.test.tsx`

```tsx
// @vitest-environment jsdom
// Pano aboneliği (spec 2026-10-18 gorev-panosu §8): alan başına yükleme, olay, komut.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { BoardProvider, useBoards, type BoardContextValue } from "../src/board/boardContext";
import { TerminalStoreContext, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";
import type { Board } from "../app-electron/shared/boardTypes";

let changed: ((board: Board) => void) | null;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let value: BoardContextValue;

function Probe() {
  value = useBoards();
  return null;
}

const ws = (id: string): TerminalWorkspace => ({ id, name: id, panes: [], focusedPaneId: null, maximizedPaneId: null, unread: false, error: false });
const empty = (workspaceId: string): Board => ({ workspaceId, tasks: [] });

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function ui(workspaces: TerminalWorkspace[]) {
  const store = { state: { ...initialTerminalState, phase: "ready", workspaces }, commands: {}, defaultKind: "cmd", defaultCwd: "", agentCwd: "" } as unknown as TerminalStoreValue;
  return (
    <TerminalStoreContext.Provider value={store}>
      <BoardProvider>
        <Probe />
      </BoardProvider>
    </TerminalStoreContext.Provider>
  );
}

beforeEach(() => {
  changed = null;
  api = {
    boardGet: vi.fn(async (id: string) => empty(id)),
    boardCommand: vi.fn(async () => ({ ok: true })),
    onBoardChanged: vi.fn((cb: (board: Board) => void) => {
      changed = cb;
      return () => {
        changed = null;
      };
    })
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

describe("BoardProvider", () => {
  it("her alanın panosu yükleniyor; olay panoyu güncelliyor; kaldırılan alanın panosu düşüyor", async () => {
    const r = render(ui([ws("w1"), ws("w2")]));
    await flush();
    expect(api.boardGet).toHaveBeenCalledWith("w1");
    expect(api.boardGet).toHaveBeenCalledWith("w2");
    expect(Object.keys(value.boards).sort()).toEqual(["w1", "w2"]);
    act(() => changed?.({ workspaceId: "w1", tasks: [{ id: "t", title: "T", goal: "", state: "draft", createdAt: 1, subtasks: [] }] }));
    expect(value.boards.w1.tasks).toHaveLength(1);
    r.rerender(ui([ws("w1")]));
    await flush();
    expect(Object.keys(value.boards)).toEqual(["w1"]);
    expect(value.boards.w1.tasks).toHaveLength(1);
  });

  it("geç gelen yükleme yeni olayı ezmiyor", async () => {
    let resolve: (b: Board) => void = () => {};
    api.boardGet.mockImplementationOnce(() => new Promise<Board>((r) => (resolve = r)));
    render(ui([ws("w1")]));
    act(() => changed?.({ workspaceId: "w1", tasks: [{ id: "t", title: "Yeni", goal: "", state: "draft", createdAt: 1, subtasks: [] }] }));
    resolve(empty("w1"));
    await flush();
    expect(value.boards.w1.tasks[0].title).toBe("Yeni");
  });

  it("komut IPC'ye gidiyor; IPC reddederse writeFailed", async () => {
    render(ui([ws("w1")]));
    await expect(value.command("w1", { type: "approve", taskId: "t" })).resolves.toEqual({ ok: true });
    expect(api.boardCommand).toHaveBeenCalledWith("w1", { type: "approve", taskId: "t" });
    api.boardCommand.mockRejectedValueOnce(new Error("kanal yok"));
    await expect(value.command("w1", { type: "approve", taskId: "t" })).resolves.toEqual({ ok: false, reason: "writeFailed" });
  });
});
```

- [ ] **Step 3: Kırmızıyı gör**

Run: `npx vitest run tests/boardView.test.ts tests/boardContext.test.tsx`
Expected: FAIL — modüller yok.

- [ ] **Step 4: Bağlam** — `src/board/boardContext.tsx`

```tsx
// Görev panolarının renderer'daki kopyası (spec 2026-10-18 gorev-panosu §8).
// Tek kaynak ana süreçteki yönetici; burada yalnız son yayınladığı. Varsayılan
// değer boş: sağlayıcısız çizilen bileşenler (testler) çökmüyor.
// TerminalStoreProvider'ın İÇİNDE çizilmeli: alan listesini oradan alıyor.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BoardCommand, BoardCommandResult } from "../../app-electron/shared/boardCommands";
import type { Board } from "../../app-electron/shared/boardTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";

export interface BoardContextValue {
  boards: Record<string, Board>;
  command: (workspaceId: string, cmd: BoardCommand) => Promise<BoardCommandResult>;
}

const EMPTY: BoardContextValue = {
  boards: {},
  command: async () => ({ ok: false, reason: "noBoard" })
};

export const BoardContext = createContext<BoardContextValue>(EMPTY);

export function useBoards(): BoardContextValue {
  return useContext(BoardContext);
}

export function BoardProvider({ children }: { children: ReactNode }) {
  const { state } = useTerminalStore();
  const [boards, setBoards] = useState<Record<string, Board>>({});
  const ids = state.workspaces.map((w) => w.id).join("|");

  useEffect(() => {
    const off = window.api.onBoardChanged((board) => setBoards((prev) => ({ ...prev, [board.workspaceId]: board })));
    return off;
  }, []);

  useEffect(() => {
    let alive = true;
    const list = ids ? ids.split("|") : [];
    // Kaldırılan alanların panoları düşüyor.
    setBoards((prev) => {
      const keep = Object.keys(prev).filter((id) => list.includes(id));
      return keep.length === Object.keys(prev).length ? prev : Object.fromEntries(keep.map((id) => [id, prev[id]]));
    });
    for (const id of list) {
      window.api.boardGet(id).then(
        (board) => {
          if (!alive || !board) return;
          // Olaydan gelen daha yeni değer ezilmiyor.
          setBoards((prev) => (id in prev ? prev : { ...prev, [id]: board }));
        },
        () => {}
      );
    }
    return () => {
      alive = false;
    };
  }, [ids]);

  const command = useCallback(
    (workspaceId: string, cmd: BoardCommand) =>
      window.api.boardCommand(workspaceId, cmd).catch((): BoardCommandResult => ({ ok: false, reason: "writeFailed" })),
    []
  );

  const value = useMemo(() => ({ boards, command }), [boards, command]);
  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}
```

- [ ] **Step 5: Görünüm yardımcıları** — `src/board/boardView.ts`

```ts
// Görev panosu ekranının SAF yardımcıları (spec 2026-10-18 gorev-panosu §8).
// Renk yalnız mevcut jetonlardan: görev grubu mevcut bölme renklerinden,
// başarısız/takıldı `--status-danger-*`. Lime (accent) yalnız seçim; burada yok.
import type { BoardFailure } from "../../app-electron/shared/boardCommands";
import type {
  Board,
  BoardTask,
  LeadErrorCode,
  Subtask,
  SubtaskNote,
  SubtaskState
} from "../../app-electron/shared/boardTypes";
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { agentPanes } from "../agents/agentView";

export type BoardColumn = "draft" | "queued" | "running" | "verifying" | "done";

export const BOARD_COLUMNS: readonly BoardColumn[] = ["draft", "queued", "running", "verifying", "done"];

export const COLUMN_KEY: Record<BoardColumn, TranslationKey> = {
  draft: "board.colDraft",
  queued: "board.colQueued",
  running: "board.colRunning",
  verifying: "board.colVerifying",
  done: "board.colDone"
};

export function taskColumn(task: BoardTask): BoardColumn {
  if (task.approvedAt === undefined) return "draft";
  return task.state === "done" ? "done" : "running";
}

export function subtaskColumn(sub: Subtask): Exclude<BoardColumn, "draft"> {
  switch (sub.state) {
    case "waiting":
    case "ready":
      return "queued";
    case "running":
    case "asking":
      return "running";
    case "verifying":
    case "failed":
      return "verifying";
    case "done":
      return "done";
  }
}

export function taskProgress(task: BoardTask): { done: number; total: number } {
  return { done: task.subtasks.filter((s) => s.state === "done").length, total: task.subtasks.length };
}

/** Görev grubu rengi: mevcut bölme renkleri, oluşturulma sırasına göre (yeni renk yok). */
const GROUP_COLORS: readonly TerminalPaneColor[] = ["blue", "green", "amber", "violet"];

export function taskColor(tasks: readonly BoardTask[], taskId: string): TerminalPaneColor {
  const ordered = [...tasks].sort((a, b) => a.createdAt - b.createdAt);
  const index = ordered.findIndex((t) => t.id === taskId);
  return index < 0 ? "gray" : GROUP_COLORS[index % GROUP_COLORS.length];
}

export function failedCount(board: Board | undefined): number {
  return (board?.tasks ?? []).reduce((sum, t) => sum + t.subtasks.filter((s) => s.state === "failed").length, 0);
}

export function taskCount(board: Board | undefined): number {
  return board?.tasks.length ?? 0;
}

const ON_AGENT: ReadonlySet<SubtaskState> = new Set<SubtaskState>(["running", "asking", "verifying"]);

/** Ekip şeridi: bu ajanın üstündeki alt görev (spec §8). */
export function activeSubtaskOf(boards: Record<string, Board>, paneId: string): { task: BoardTask; subtask: Subtask } | null {
  for (const board of Object.values(boards)) {
    for (const task of board.tasks) {
      const subtask = task.subtasks.find((s) => s.paneId === paneId && ON_AGENT.has(s.state));
      if (subtask) return { task, subtask };
    }
  }
  return null;
}

const folderKey = (cwd: string) => cwd.trim().replace(/[\\/]+$/, "").toLowerCase();

/** "Aynı klasörde paralel çalışıyor" uyarısı alacak alt görevler (spec §5). */
export function sameFolderParallel(tasks: readonly BoardTask[], workspace: TerminalWorkspace): Set<string> {
  const cwdOf = new Map(workspace.panes.map((p) => [p.id, folderKey(p.cwd)]));
  const byFolder = new Map<string, string[]>();
  for (const task of tasks) {
    for (const s of task.subtasks) {
      if ((s.state !== "running" && s.state !== "asking") || !s.paneId) continue;
      const folder = cwdOf.get(s.paneId);
      if (!folder) continue;
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), s.id]);
    }
  }
  return new Set([...byFolder.values()].filter((ids) => ids.length > 1).flat());
}

/** "Ajana ver" seçicisi: bu alanda çalışan ajan bölmeleri (uygunluğu ana süreç yeniden denetler). */
export function assignablePanes(workspace: TerminalWorkspace): TerminalPane[] {
  return agentPanes(workspace).filter((p) => p.run.state === "running");
}

export const SUBTASK_STATE_KEY: Record<SubtaskState, TranslationKey> = {
  waiting: "board.stateWaiting",
  ready: "board.stateReady",
  running: "board.stateRunning",
  asking: "board.stateAsking",
  verifying: "board.stateVerifying",
  done: "board.stateDone",
  failed: "board.stateFailed"
};

export const NOTE_KEY: Record<SubtaskNote, TranslationKey> = {
  agentClosed: "board.noteAgentClosed",
  restarted: "board.noteRestarted",
  agentError: "board.noteAgentError",
  timeout: "board.noteTimeout",
  sentBack: "board.noteSentBack"
};

export const LEAD_ERROR_KEY: Record<LeadErrorCode, TranslationKey> = {
  binary: "board.leadBinary",
  failed: "board.leadFailed",
  timeout: "board.leadTimeout",
  noJson: "board.leadNoJson",
  badJson: "board.leadBadJson",
  noSubtasks: "board.leadNoSubtasks",
  tooMany: "board.leadTooMany",
  badField: "board.leadBadField",
  badDependency: "board.leadBadDependency",
  cycle: "board.leadCycle"
};

export const FAILURE_KEY: Record<BoardFailure, TranslationKey> = {
  invalid: "board.failInvalid",
  noBoard: "board.failNoBoard",
  noTask: "board.failNoTask",
  noSubtask: "board.failNoSubtask",
  badState: "board.failBadState",
  limit: "board.failLimit",
  badDependency: "board.failBadDependency",
  cycle: "board.failCycle",
  notEligible: "board.failNotEligible",
  typing: "board.failTyping",
  noVerify: "board.failNoVerify",
  hasVerify: "board.failHasVerify",
  writeFailed: "board.failWriteFailed"
};
```

- [ ] **Step 6: Metinler** — `src/i18n/tr.ts` ve `src/i18n/en.ts` (Task 9'un `board.verifyCount` satırından sonra; o satıra virgül)

`tr.ts`:

```ts
  "board.colDraft": "Taslak",
  "board.colQueued": "Sırada",
  "board.colRunning": "Çalışıyor",
  "board.colVerifying": "Doğrulama",
  "board.colDone": "Bitti",
  "board.stateWaiting": "Bağımlılık bekliyor",
  "board.stateReady": "Uygun ajan bekleniyor",
  "board.stateRunning": "Çalışıyor",
  "board.stateAsking": "Soru soruyor",
  "board.stateVerifying": "Doğrulanıyor",
  "board.stateDone": "Bitti",
  "board.stateFailed": "Başarısız",
  "board.noteAgentClosed": "Ajan kapandı",
  "board.noteRestarted": "Uygulama yeniden başlatıldı",
  "board.noteAgentError": "Ajanın turu hatayla bitti",
  "board.noteTimeout": "Süre aşıldı",
  "board.noteSentBack": "Düzeltmeye geri gönderildi",
  "board.leadBinary": "axet-code kullanılamıyor.",
  "board.leadFailed": "Lider çalışırken hata oluştu.",
  "board.leadTimeout": "Lider 3 dakikada bitmedi.",
  "board.leadNoJson": "Lider bir JSON planı döndürmedi.",
  "board.leadBadJson": "Liderin JSON'u okunamadı.",
  "board.leadNoSubtasks": "Planda alt görev yok.",
  "board.leadTooMany": "Planda 8'den fazla alt görev var.",
  "board.leadBadField": "Planda eksik ya da çok uzun bir alan var.",
  "board.leadBadDependency": "Planda geçersiz bir bağımlılık var.",
  "board.leadCycle": "Plandaki bağımlılıklar döngü oluşturuyor.",
  "board.failInvalid": "Geçersiz istek.",
  "board.failNoBoard": "Pano bulunamadı.",
  "board.failNoTask": "Görev bulunamadı.",
  "board.failNoSubtask": "Alt görev bulunamadı.",
  "board.failBadState": "Bu durumda yapılamaz.",
  "board.failLimit": "Görev sınırına ulaşıldı (50).",
  "board.failBadDependency": "Geçersiz bağımlılık.",
  "board.failCycle": "Bağımlılıklar döngü oluşturuyor.",
  "board.failNotEligible": "Ajan şu an uygun değil: meşgul, motoru kapalı ya da boşta değil.",
  "board.failTyping": "Bu ajanın terminalinde yazıyorsun; satırı gönder ya da sil, sonra yeniden dene.",
  "board.failNoVerify": "Bu alanda doğrulama komutu yok; Onayla'yı kullan.",
  "board.failHasVerify": "Bu alanda doğrulama komutu var; Doğrula'yı kullan.",
  "board.failWriteFailed": "Pano güncellenemedi."
```

`en.ts`:

```ts
  "board.colDraft": "Draft",
  "board.colQueued": "Queued",
  "board.colRunning": "Running",
  "board.colVerifying": "Verification",
  "board.colDone": "Done",
  "board.stateWaiting": "Waiting on dependencies",
  "board.stateReady": "Waiting for a free agent",
  "board.stateRunning": "Running",
  "board.stateAsking": "Asking a question",
  "board.stateVerifying": "Verifying",
  "board.stateDone": "Done",
  "board.stateFailed": "Failed",
  "board.noteAgentClosed": "Agent closed",
  "board.noteRestarted": "App restarted",
  "board.noteAgentError": "The agent's turn ended with an error",
  "board.noteTimeout": "Timed out",
  "board.noteSentBack": "Sent back for a fix",
  "board.leadBinary": "axet-code is not available.",
  "board.leadFailed": "The lead failed.",
  "board.leadTimeout": "The lead did not finish within 3 minutes.",
  "board.leadNoJson": "The lead did not return a JSON plan.",
  "board.leadBadJson": "The lead's JSON could not be read.",
  "board.leadNoSubtasks": "The plan has no subtasks.",
  "board.leadTooMany": "The plan has more than 8 subtasks.",
  "board.leadBadField": "A field in the plan is missing or too long.",
  "board.leadBadDependency": "The plan has an invalid dependency.",
  "board.leadCycle": "The plan's dependencies form a cycle.",
  "board.failInvalid": "Invalid request.",
  "board.failNoBoard": "Board not found.",
  "board.failNoTask": "Task not found.",
  "board.failNoSubtask": "Subtask not found.",
  "board.failBadState": "Not possible in this state.",
  "board.failLimit": "Task limit reached (50).",
  "board.failBadDependency": "Invalid dependency.",
  "board.failCycle": "The dependencies form a cycle.",
  "board.failNotEligible": "The agent is not available: busy, its engine is closed, or it is not idle.",
  "board.failTyping": "You are typing in this agent's terminal; send or clear the line, then try again.",
  "board.failNoVerify": "This workspace has no verification commands; use Approve.",
  "board.failHasVerify": "This workspace has verification commands; use Verify.",
  "board.failWriteFailed": "The board could not be updated."
```

- [ ] **Step 7: Yeşili gör**

Run: `npx vitest run tests/boardView.test.ts tests/boardContext.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 8: Commit**

```bash
git add src/board/boardContext.tsx src/board/boardView.ts src/i18n/tr.ts src/i18n/en.ts tests/boardView.test.ts tests/boardContext.test.tsx
git commit -m "Gorev Panosu: renderer pano baglami ve gorunum yardimcilari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Bölmeler | Pano geçişi, pano sütunları ve yeni görev penceresi

**Files:**
- Create: `src/board/BoardView.tsx`
- Create: `src/board/NewTaskDialog.tsx`
- Modify: `src/agents/TeamStrip.tsx` (görünüm geçişi)
- Modify: `src/terminal/TerminalMode.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/boardScreen.test.tsx`

**Interfaces:**
- Consumes: Task 9 `TerminalWorkspace.view`, `commands.setWorkspaceView`; Task 11 `useBoards`, `BoardContext`, `BOARD_COLUMNS`, `COLUMN_KEY`, `taskColumn`, `subtaskColumn`, `taskProgress`, `taskColor`, `sameFolderParallel`, `SUBTASK_STATE_KEY`, `NOTE_KEY`, `FAILURE_KEY`; `PANE_COLOR_VAR`, `Eyebrow`, `Modal`, `ModalCancelButton`, düğme sınıfları.
- Produces:

```ts
// BoardView.tsx
export interface BoardSelection { taskId: string; subtaskId?: string }
export default function BoardView(props: { workspace: TerminalWorkspace }): JSX.Element;
// Kart işaretleri (Task 13–14 testleri kullanır): data-task-card={task.id}, data-subtask-card={sub.id},
// data-column={column}, tehlike etiketi data-danger.

// NewTaskDialog.tsx
export default function NewTaskDialog(props: { open: boolean; onCreate: (title: string, goal: string) => Promise<BoardCommandResult>;
  onCancel: () => void }): JSX.Element;

// TeamStrip — yeni zorunlu props
view: "panes" | "board";
onView: (view: "panes" | "board") => void;
```

Sütun kuralı: onaysız görev yalnız ana kartıyla "Taslak"ta (alt görevleri sütunlara dağılmaz); onaylı görevin ana kartı "Çalışıyor"da (bittiyse "Bitti"), alt görevleri `subtaskColumn`'a göre. `stuck` ana kart ve `failed` alt görev mevcut `--status-danger-*` etiketiyle. Grup rengi kartın sol şeridi (`PANE_COLOR_VAR[taskColor]`); lime yalnız seçili kartın çerçevesi. Bölmeler pano görünümünde de TAKILI kalır (yalnız `hidden`): xterm sökülmez.

- [ ] **Step 1: Kırmızı test** — `tests/boardScreen.test.tsx`

```tsx
// @vitest-environment jsdom
// Pano ekranı: Bölmeler | Pano geçişi, sütunlar, seçim, yeni görev, uyarı,
// aria-live (spec 2026-10-18 gorev-panosu §8).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import TerminalMode from "../src/terminal/TerminalMode";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { BoardContext, type BoardContextValue } from "../src/board/boardContext";
import type { BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { Board, BoardTask, Subtask } from "../app-electron/shared/boardTypes";

vi.mock("../src/components/EmbeddedTerminal", () => ({
  default: ({ sessionId }: { sessionId: string }) => <div data-testid={`xterm-${sessionId}`} />
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
const task = (id: string, subtasks: Subtask[], over: Partial<BoardTask> = {}): BoardTask => ({
  id,
  title: id,
  goal: "Hedef",
  state: "running",
  createdAt: 1,
  approvedAt: 2,
  subtasks,
  ...over
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function setup(ws: TerminalWorkspace, board?: Board, language: "tr" | "en" = "tr") {
  const commands = commandsMock();
  const command = vi.fn(async (): Promise<BoardCommandResult> => ({ ok: true, taskId: "yeni" }));
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: ws.id },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  const agents: AgentStatusValue = { statuses: {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) };
  const ui = (b?: Board) => {
    const boards: BoardContextValue = { boards: b ? { [ws.id]: b } : {}, command };
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
  const r = render(ui(board));
  return { commands, command, rerender: (b?: Board) => r.rerender(ui(b)) };
}

const col = (name: string) => screen.getByRole("list", { name });

const mixed: Board = {
  workspaceId: "a",
  tasks: [
    task("t1", [sub("a1")], { approvedAt: undefined, state: "awaitingApproval", title: "Taslak görev", createdAt: 1 }),
    task(
      "t2",
      [
        sub("b1", { state: "ready", held: true, note: "agentClosed" }),
        sub("b2", { state: "running", paneId: "p1" }),
        sub("b3", { state: "failed", paneId: "p1" }),
        sub("b4", { state: "done" })
      ],
      { title: "Onaylı", createdAt: 2, state: "stuck" }
    )
  ]
};

describe("Bölmeler | Pano", () => {
  it("geçiş: Pano seçimi alana kaydediliyor; pano görünümünde sütunlar var, bölmeler gizli ama takılı", () => {
    const { commands } = setup(workspace());
    const group = screen.getByRole("radiogroup", { name: "Görünüm" });
    expect(within(group).getByRole("radio", { name: "Bölmeler" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(group).getByRole("radio", { name: "Pano" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "board");
    cleanup();
    setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] });
    expect(screen.getByRole("radio", { name: "Pano" }).getAttribute("aria-checked")).toBe("true");
    for (const name of ["Taslak", "Sırada", "Çalışıyor", "Doğrulama", "Bitti"]) expect(col(name)).toBeTruthy();
    const cell = document.querySelector('[data-pane="p1"]') as HTMLElement;
    expect(cell).toBeTruthy();
    expect((cell.closest("[data-workspace]") as HTMLElement).className).toContain("hidden");
  });

  it("İngilizce: geçiş ve sütun adları", () => {
    setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] }, "en");
    expect(screen.getByRole("radio", { name: "Board" })).toBeTruthy();
    expect(col("Draft")).toBeTruthy();
    expect(col("Verification")).toBeTruthy();
  });
});

describe("sütunlar ve kartlar", () => {
  it("onaysız görev yalnız ana kartıyla Taslak'ta; onaylının alt görevleri durumlarına göre; tehlike etiketleri", () => {
    setup(workspace({ view: "board" }), mixed);
    expect(col("Taslak").querySelector('[data-task-card="t1"]')).toBeTruthy();
    expect(document.querySelector('[data-subtask-card="a1"]')).toBeNull();
    expect(col("Çalışıyor").querySelector('[data-task-card="t2"]')).toBeTruthy();
    expect(col("Sırada").querySelector('[data-subtask-card="b1"]')?.textContent).toContain("Beklemede");
    expect(col("Sırada").querySelector('[data-subtask-card="b1"]')?.textContent).toContain("Ajan kapandı");
    expect(col("Çalışıyor").querySelector('[data-subtask-card="b2"]')).toBeTruthy();
    expect(col("Doğrulama").querySelector('[data-subtask-card="b3"] [data-danger]')?.textContent).toBe("Başarısız");
    expect(col("Bitti").querySelector('[data-subtask-card="b4"]')).toBeTruthy();
    expect(document.querySelector('[data-task-card="t2"] [data-danger]')?.textContent).toBe("Takıldı");
    expect(document.querySelector('[data-task-card="t2"]')?.textContent).toContain("1/4");
  });

  it("seçim: tıklanan kart seçili; lime çerçeve yalnız seçili kartta", () => {
    setup(workspace({ view: "board" }), mixed);
    const card = document.querySelector('[data-subtask-card="b2"]') as HTMLElement;
    expect(card.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(card);
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(card.className).toContain("border-accent-500/60");
    expect((document.querySelector('[data-subtask-card="b1"]') as HTMLElement).className).not.toContain("accent");
  });

  it("aynı klasörde iki çalışan alt görev uyarı alıyor", () => {
    const ws = workspace({ view: "board", panes: [agentPane("p1"), agentPane("p2")] });
    setup(ws, { workspaceId: "a", tasks: [task("t", [sub("x", { state: "running", paneId: "p1" }), sub("y", { state: "asking", paneId: "p2" })])] });
    expect(document.querySelector('[data-subtask-card="x"]')?.textContent).toContain("Aynı klasörde paralel çalışıyor");
  });

  it("durum değişikliği tek satır aria-live", () => {
    const { rerender } = setup(workspace({ view: "board" }), mixed);
    const next: Board = { ...mixed, tasks: [mixed.tasks[0], { ...mixed.tasks[1], subtasks: mixed.tasks[1].subtasks.map((s) => (s.id === "b2" ? { ...s, state: "verifying" as const } : s)) }] };
    rerender(next);
    expect(document.querySelector("[aria-live=polite]")?.textContent).toBe("b2: Doğrulanıyor");
  });
});

describe("yeni görev ve uyarı", () => {
  it("+ Görev: başlık zorunlu; Oluştur tek komut (çift tıklama); başarıda pencere kapanıyor", async () => {
    const { command } = setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] });
    fireEvent.click(screen.getByRole("button", { name: "Görev" }));
    const create = screen.getByRole("button", { name: "Oluştur" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık" }), { target: { value: " İade akışı " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Hedef" }), { target: { value: "Ödeme modülüne iade ekle" } });
    fireEvent.click(create);
    fireEvent.click(create);
    await flush();
    expect(command).toHaveBeenCalledTimes(1);
    expect(command).toHaveBeenCalledWith("a", { type: "createTask", title: "İade akışı", goal: "Ödeme modülüne iade ekle" });
    expect(screen.queryByRole("button", { name: "Oluştur" })).toBeNull();
  });

  it("görev sınırı: hata pencerede kalıyor", async () => {
    const { command } = setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [] });
    command.mockResolvedValueOnce({ ok: false, reason: "limit" });
    fireEvent.click(screen.getByRole("button", { name: "Görev" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık" }), { target: { value: "Fazla" } });
    fireEvent.click(screen.getByRole("button", { name: "Oluştur" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toBe("Görev sınırına ulaşıldı (50).");
  });

  it("kenara alınmış pano dosyası uyarısı; Kapat dismissWarning gönderiyor", () => {
    const { command } = setup(workspace({ view: "board" }), { workspaceId: "a", tasks: [], recoveredFrom: "a.json.bozuk-5" });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("a.json.bozuk-5");
    fireEvent.click(within(alert).getByRole("button", { name: "Kapat" }));
    expect(command).toHaveBeenCalledWith("a", { type: "dismissWarning" });
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardScreen.test.tsx`
Expected: FAIL — "Görünüm" radiogroup yok, `src/board/BoardView` yok.

- [ ] **Step 3: Yeni görev penceresi** — `src/board/NewTaskDialog.tsx`

```tsx
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { BoardCommandResult } from "../../app-electron/shared/boardCommands";
import { TASK_GOAL_MAX, TASK_TITLE_MAX } from "../../app-electron/shared/boardTypes";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON } from "../ui/buttons";
import { FAILURE_KEY } from "./boardView";

// "+ Görev" (spec 2026-10-18 gorev-panosu §3): başlık + hedef. Gönderim
// uçuştayken ikinci gönderim yok; pencere kapandıktan sonra durum yazılmıyor.

const INPUT =
  "h-7 w-full min-w-0 rounded border border-line bg-transparent px-2 text-xs text-slate-200 outline-none focus:border-accent-500/60";
const AREA =
  "min-h-24 w-full min-w-0 rounded border border-line bg-transparent px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-accent-500/60";

export default function NewTaskDialog({
  open,
  onCreate,
  onCancel
}: {
  open: boolean;
  onCreate: (title: string, goal: string) => Promise<BoardCommandResult>;
  onCancel: () => void;
}) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setGoal("");
    setError(null);
    setBusy(false);
    busyRef.current = false;
  }, [open]);

  const valid = title.trim() !== "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const result = await onCreate(title.trim(), goal.trim());
    if (!mounted.current) return;
    busyRef.current = false;
    setBusy(false);
    if (!result.ok) setError(FAILURE_KEY[result.reason]);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("board.newTaskTitle")} size="md">
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("board.titleLabel")}</span>
          <input
            aria-label={t("board.titleLabel")}
            value={title}
            maxLength={TASK_TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            className={INPUT}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("board.goalLabel")}</span>
          <textarea
            aria-label={t("board.goalLabel")}
            value={goal}
            maxLength={TASK_GOAL_MAX}
            rows={5}
            onChange={(e) => setGoal(e.target.value)}
            className={AREA}
          />
          <p className="text-2xs text-slate-500">{t("board.goalHint")}</p>
        </div>
        {error && (
          <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
            {t(error)}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <ModalCancelButton />
          <button type="submit" disabled={!valid || busy} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("board.create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 4: Pano görünümü** — `src/board/BoardView.tsx`

```tsx
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { useT } from "../i18n";
import type { BoardTask, Subtask } from "../../app-electron/shared/boardTypes";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { Eyebrow } from "../ui/Eyebrow";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useBoards } from "./boardContext";
import {
  BOARD_COLUMNS,
  COLUMN_KEY,
  NOTE_KEY,
  SUBTASK_STATE_KEY,
  sameFolderParallel,
  subtaskColumn,
  taskColor,
  taskColumn,
  taskProgress,
  type BoardColumn
} from "./boardView";
import NewTaskDialog from "./NewTaskDialog";

// Görev panosu (spec 2026-10-18 gorev-panosu §8): Taslak · Sırada ·
// Çalışıyor · Doğrulama · Bitti. Ana görev kartı ilerlemesiyle; alt görevler
// kendi sütunlarında, görevin rengiyle (sol şerit). Takıldı/Başarısız mevcut
// `--status-danger-*` etiketiyle; lime yalnız seçili kartın çerçevesi.

export interface BoardSelection {
  taskId: string;
  subtaskId?: string;
}

const DANGER_TAG = "shrink-0 rounded bg-[var(--status-danger-bg)] px-1 text-2xs text-[var(--status-danger-text)]";
const CARD = "w-full cursor-pointer rounded-md border bg-card text-left transition-colors";
const cardBorder = (selected: boolean) => (selected ? "border-accent-500/60" : "border-line hover:border-slate-500");

export default function BoardView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { boards, command } = useBoards();
  const board = boards[workspace.id];
  const tasks = board?.tasks ?? [];
  const [selection, setSelection] = useState<BoardSelection | null>(null);
  const [creating, setCreating] = useState(false);
  const [announce, setAnnounce] = useState("");
  const previous = useRef<Map<string, string> | null>(null);
  const mounted = useRef(true);
  const parallel = sameFolderParallel(tasks, workspace);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Durum değişikliği tek satır, aria-live (spec §8).
  useEffect(() => {
    const now = new Map<string, string>();
    let message = "";
    for (const task of board?.tasks ?? []) {
      for (const s of task.subtasks) {
        now.set(s.id, s.state);
        const before = previous.current?.get(s.id);
        if (!message && before !== undefined && before !== s.state) {
          message = t("board.announce", { title: s.title, state: t(SUBTASK_STATE_KEY[s.state]) });
        }
      }
    }
    previous.current = now;
    if (message) setAnnounce(message);
  }, [board, t]);

  const select = (next: BoardSelection) => setSelection(next);
  const isSelected = (taskId: string, subtaskId?: string) =>
    selection?.taskId === taskId && selection.subtaskId === subtaskId;

  const items = (column: BoardColumn): ReactNode[] => {
    const out: ReactNode[] = [];
    for (const task of tasks) {
      const color = PANE_COLOR_VAR[taskColor(tasks, task.id)];
      if (taskColumn(task) === column) {
        out.push(<TaskCard key={task.id} task={task} color={color} selected={isSelected(task.id)} onSelect={() => select({ taskId: task.id })} />);
      }
      if (task.approvedAt === undefined) continue;
      for (const sub of task.subtasks) {
        if (subtaskColumn(sub) !== column) continue;
        out.push(
          <SubtaskCard
            key={sub.id}
            task={task}
            sub={sub}
            color={color}
            parallel={parallel.has(sub.id)}
            selected={isSelected(task.id, sub.id)}
            onSelect={() => select({ taskId: task.id, subtaskId: sub.id })}
          />
        );
      }
    }
    return out;
  };

  return (
    <div className="flex h-full min-h-0">
      <section aria-label={t("board.boardLabel")} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={!board || board.unreadable === true}
            className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
          >
            <Plus size={12} />
            {t("board.addTask")}
          </button>
          <p aria-live="polite" className="min-w-0 flex-1 truncate text-2xs text-slate-500">
            {announce}
          </p>
        </div>
        {board?.recoveredFrom && (
          <div
            role="alert"
            className="flex shrink-0 items-center gap-2 rounded-md border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-1.5 text-xs text-[var(--status-warning-text)]"
          >
            <span className="min-w-0 flex-1">{t("board.recovered", { file: board.recoveredFrom })}</span>
            <button
              type="button"
              onClick={() => void command(workspace.id, { type: "dismissWarning" })}
              title={t("common.close")}
              aria-label={t("common.close")}
              className={GHOST_ICON_BUTTON}
            >
              <X size={12} />
            </button>
          </div>
        )}
        {board?.unreadable && (
          <div
            role="alert"
            className="shrink-0 rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-1.5 text-xs text-[var(--status-danger-text)]"
          >
            {t("board.unreadable")}
          </div>
        )}
        {board && !board.unreadable && tasks.length === 0 && <p className="shrink-0 text-xs text-slate-400">{t("board.empty")}</p>}
        <div className="grid min-h-0 flex-1 grid-cols-5 gap-2">
          {BOARD_COLUMNS.map((column) => {
            const list = items(column);
            return (
              <div key={column} className="flex min-h-0 min-w-0 flex-col gap-1.5">
                <Eyebrow count={list.length}>{t(COLUMN_KEY[column])}</Eyebrow>
                <ul
                  role="list"
                  aria-label={t(COLUMN_KEY[column])}
                  data-column={column}
                  className="chat-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
                >
                  {list}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
      <NewTaskDialog
        open={creating}
        onCancel={() => setCreating(false)}
        onCreate={async (title, goal) => {
          const result = await command(workspace.id, { type: "createTask", title, goal });
          if (result.ok && mounted.current) {
            setCreating(false);
            if (result.taskId) setSelection({ taskId: result.taskId });
          }
          return result;
        }}
      />
    </div>
  );
}

function TaskCard({ task, color, selected, onSelect }: { task: BoardTask; color: string | null; selected: boolean; onSelect: () => void }) {
  const t = useT();
  const progress = taskProgress(task);
  return (
    <li>
      <button
        type="button"
        data-task-card={task.id}
        aria-pressed={selected}
        onClick={onSelect}
        style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
        className={`${CARD} ${cardBorder(selected)} flex flex-col gap-1 px-3 py-2`}
      >
        <span title={task.title} className="truncate text-xs font-medium text-slate-200">
          {task.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs text-slate-400">
          {task.planning ? (
            <span className="truncate">{t("board.planning")}</span>
          ) : task.approvedAt !== undefined ? (
            <span className="font-mono tabular-nums">{t("board.progress", { done: progress.done, total: progress.total })}</span>
          ) : (
            <span className="truncate">{t(task.state === "awaitingApproval" ? "board.awaitingApproval" : "board.colDraft")}</span>
          )}
          {task.state === "stuck" && (
            <span data-danger="" className={DANGER_TAG}>
              {t("board.tagStuck")}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function SubtaskCard({
  task,
  sub,
  color,
  parallel,
  selected,
  onSelect
}: {
  task: BoardTask;
  sub: Subtask;
  color: string | null;
  parallel: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useT();
  const label = sub.state === "ready" && sub.held ? "board.stateHeld" : SUBTASK_STATE_KEY[sub.state];
  return (
    <li>
      <button
        type="button"
        data-subtask-card={sub.id}
        aria-pressed={selected}
        onClick={onSelect}
        style={color ? { boxShadow: `inset 2px 0 0 ${color}` } : undefined}
        className={`${CARD} ${cardBorder(selected)} flex flex-col gap-0.5 px-2.5 py-1.5`}
      >
        <span title={task.title} className="truncate text-2xs text-slate-500">
          {task.title}
        </span>
        <span title={sub.title} className="truncate text-xs text-slate-200">
          {sub.title}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs text-slate-400">
          {sub.state === "failed" ? (
            <span data-danger="" className={DANGER_TAG}>
              {t("board.stateFailed")}
            </span>
          ) : (
            <span className="truncate">{t(label)}</span>
          )}
          {sub.note && <span className="truncate text-slate-500">· {t(NOTE_KEY[sub.note])}</span>}
        </span>
        {parallel && <span className="truncate text-2xs text-[var(--status-warning-text)]">{t("board.parallel")}</span>}
      </button>
    </li>
  );
}
```

- [ ] **Step 5: Görünüm geçişi** — `src/agents/TeamStrip.tsx`

Bileşenin props'una ekle (tür ve parametre listesi):

```tsx
  view,
  onView,
```

```tsx
  view: "panes" | "board";
  onView: (view: "panes" | "board") => void;
```

Dönen `<div className="flex h-16 …">`'in ilk çocuğu olarak (ekip listesinden önce):

```tsx
      {/* Bölmeler | Pano (spec 2026-10-18 gorev-panosu §8); seçim lime, alan başına hatırlanıyor. */}
      <div role="radiogroup" aria-label={t("board.viewLabel")} className="flex shrink-0 gap-0.5 rounded-md bg-control p-0.5">
        {(["panes", "board"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={view === v}
            onClick={() => onView(v)}
            className={`cursor-pointer rounded px-2 py-1 text-xs transition-colors ${
              view === v ? "bg-[var(--accent-glow)] text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t(v === "panes" ? "board.viewPanes" : "board.viewBoard")}
          </button>
        ))}
      </div>
```

- [ ] **Step 6: Ajanlar ekranı** — `src/terminal/TerminalMode.tsx`

İçe aktar: `import BoardView from "../board/BoardView";`

`const full = …` satırının altına:

```tsx
  const boardOpen = active?.view === "board";
```

`<TeamStrip … />` çağrısına iki prop ekle:

```tsx
          view={boardOpen ? "board" : "panes"}
          onView={(view) => commands.setWorkspaceView(active.id, view)}
```

Alan döngüsündeki `className={`${w.id === state.activeWorkspaceId ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}` satırını şuna çevir (pano açıkken bölmeler gizli ama takılı):

```tsx
              className={`${w.id === state.activeWorkspaceId && !boardOpen ? "flex" : "hidden"} absolute inset-0 flex-col p-1.5`}
```

Aynı `<div className="relative min-h-0 flex-1">` içinde, `state.workspaces.map(…)`'ten SONRA:

```tsx
          {state.phase === "ready" && active && boardOpen && (
            <div className="absolute inset-0">
              <BoardView workspace={active} />
            </div>
          )}
```

- [ ] **Step 7: Metinler** — `src/i18n/tr.ts` ve `src/i18n/en.ts` (Task 11'in `board.failWriteFailed` satırından sonra; o satıra virgül)

`tr.ts`:

```ts
  "board.viewLabel": "Görünüm",
  "board.viewPanes": "Bölmeler",
  "board.viewBoard": "Pano",
  "board.boardLabel": "Görev panosu",
  "board.addTask": "Görev",
  "board.newTaskTitle": "Yeni görev",
  "board.titleLabel": "Başlık",
  "board.goalLabel": "Hedef",
  "board.goalHint": "Ne yapılmasını istediğini yaz; lider bunu alt görevlere böler. Alt görevleri elle de ekleyebilirsin.",
  "board.create": "Oluştur",
  "board.empty": "Henüz görev yok. Bir görev ekleyip hedefini yaz; lider alt görevlere böler, sen onaylayınca ajanlara dağıtılır.",
  "board.planning": "Lider planlıyor…",
  "board.progress": "{done}/{total}",
  "board.awaitingApproval": "Onay bekliyor",
  "board.tagStuck": "Takıldı",
  "board.stateHeld": "Beklemede",
  "board.parallel": "Aynı klasörde paralel çalışıyor",
  "board.recovered": "Pano dosyası bozuktu; {file} adıyla kenara alındı ve boş pano açıldı.",
  "board.unreadable": "Pano dosyası okunamadı; üzerine yazılmıyor. Dosyayı tutan programı kapatıp uygulamayı yeniden başlat.",
  "board.announce": "{title}: {state}"
```

`en.ts`:

```ts
  "board.viewLabel": "View",
  "board.viewPanes": "Panes",
  "board.viewBoard": "Board",
  "board.boardLabel": "Task board",
  "board.addTask": "Task",
  "board.newTaskTitle": "New task",
  "board.titleLabel": "Title",
  "board.goalLabel": "Goal",
  "board.goalHint": "Describe what you want done; the lead splits it into subtasks. You can also add subtasks by hand.",
  "board.create": "Create",
  "board.empty": "No tasks yet. Add a task and describe its goal; the lead splits it into subtasks, and once you approve they go to the agents.",
  "board.planning": "The lead is planning…",
  "board.progress": "{done}/{total}",
  "board.awaitingApproval": "Awaiting approval",
  "board.tagStuck": "Stuck",
  "board.stateHeld": "On hold",
  "board.parallel": "Running in parallel in the same folder",
  "board.recovered": "The board file was damaged; it was set aside as {file} and an empty board was opened.",
  "board.unreadable": "The board file could not be read; it is not being overwritten. Close the program holding it and restart the app.",
  "board.announce": "{title}: {state}"
```

- [ ] **Step 8: Yeşili gör**

Run: `npx vitest run tests/boardScreen.test.tsx tests/terminalMode.test.tsx tests/agentsShell.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz. (`tests/terminalMode.test.tsx` bir `BoardContext` sağlamıyor: `useBoards` varsayılan boş değerle çalışıyor, geçiş "Bölmeler"de.)

- [ ] **Step 9: Commit**

```bash
git add src/board/BoardView.tsx src/board/NewTaskDialog.tsx src/agents/TeamStrip.tsx src/terminal/TerminalMode.tsx src/i18n/tr.ts src/i18n/en.ts tests/boardScreen.test.tsx
git commit -m "Gorev Panosu: Bolmeler/Pano gecisi, pano sutunlari ve yeni gorev penceresi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Ayrıntı paneli, taslak düzenleme ve düğmeler

**Files:**
- Create: `src/board/DraftEditor.tsx`
- Create: `src/board/BoardDetailPanel.tsx`
- Modify: `src/board/BoardView.tsx` (seçili görevin panelini çizer)
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/boardDetailPanel.test.tsx`

**Interfaces:**
- Consumes: Task 3 `BoardCommand`, `SubtaskDraft`; Task 1 sınırlar; Task 9 `TerminalWorkspace.verify`, `commands.setWorkspaceView`; Task 11 `useBoards`, `assignablePanes`, `SUBTASK_STATE_KEY`, `NOTE_KEY`, `LEAD_ERROR_KEY`, `FAILURE_KEY`; Task 12 `BoardView`, `BoardSelection`; `agentName` (`src/agents/agentLabels.ts`), `ConfirmDialog`, `commands.revealPane`.
- Produces:

```ts
// DraftEditor.tsx
export function toDraft(s: Subtask): SubtaskDraft;
export default function DraftEditor(props: { task: BoardTask; busy: boolean; onSave: (drafts: SubtaskDraft[]) => Promise<boolean>;
  onSplit: () => void; onApprove: (drafts: SubtaskDraft[] | null) => void }): JSX.Element;   // null: kaydedilmemiş değişiklik yok

// BoardDetailPanel.tsx
export default function BoardDetailPanel(props: { workspace: TerminalWorkspace; task: BoardTask; subtaskId?: string;
  onClose: () => void; onSelectSubtask: (subtaskId: string) => void }): JSX.Element;
// Satır işareti: data-detail-subtask={sub.id}; yeşil komut kanıtı data-proof-ok.
```

Düğme kuralları (spec §8, §6): `ready` → Ajana ver (+ held ise Yeniden sıraya al); `running/asking` → Terminale git + (komut varsa Doğrula, yoksa Onayla); `verifying` → komut varsa "Doğrulanıyor…", yoksa Onayla; `failed` → Düzeltmeye geri gönder (ajan varsa), Yeniden sıraya al, komut varsa Doğrula, Terminale git; görev düzeyinde Böl/Yeniden dene, Onayla (taslak), Sil (onaylı pencereyle). Komut uçuştayken bütün düğmeler kilitli; çift tıklama tek komut. "Terminale git" görünümü Bölmeler'e çevirip bölmeyi öne getirir. Bu ekranda ikinci bir dolgulu (primary) düğme yok: ekip şeridindeki "Ajan" zaten primary.

- [ ] **Step 1: Kırmızı test** — `tests/boardDetailPanel.test.tsx`

```tsx
// @vitest-environment jsdom
// Ayrıntı paneli: taslak düzenleme, lider durumu, alt görev düğmeleri, kanıt,
// hata, silme (spec 2026-10-18 gorev-panosu §3, §4, §6, §8).
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import BoardDetailPanel from "../src/board/BoardDetailPanel";
import { BoardContext } from "../src/board/boardContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { BoardCommand, BoardCommandResult } from "../app-electron/shared/boardCommands";
import type { BoardTask, Subtask } from "../app-electron/shared/boardTypes";

afterEach(cleanup);

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

const agentPane = (id: string, title: string): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title
});
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
const task = (id: string, subtasks: Subtask[], over: Partial<BoardTask> = {}): BoardTask => ({
  id,
  title: "İade akışı",
  goal: "Ödeme modülüne iade ekle",
  state: "running",
  createdAt: 1,
  approvedAt: 2,
  subtasks,
  ...over
});
const draftTask = task("t1", [sub("s1", { title: "Model", prompt: "Tabloyu ekle" }), sub("s2", { title: "Test", prompt: "Test yaz", dependsOn: ["s1"] })], {
  approvedAt: undefined,
  state: "awaitingApproval"
});
const rowOf = (id: string) => document.querySelector(`[data-detail-subtask="${id}"]`) as HTMLElement;

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

function setup(initial: BoardTask, wsOver: Partial<TerminalWorkspace> = {}, language: "tr" | "en" = "tr") {
  const commands = commandsMock();
  const command = vi.fn(async (_ws: string, _cmd: BoardCommand): Promise<BoardCommandResult> => ({ ok: true, taskId: initial.id }));
  const onClose = vi.fn();
  const ws: TerminalWorkspace = {
    id: "a",
    name: "Alan a",
    panes: [agentPane("p1", "Ayşe"), agentPane("p2", "Can")],
    focusedPaneId: null,
    maximizedPaneId: null,
    unread: false,
    error: false,
    verify: ["npm test"],
    ...wsOver
  };
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", workspaces: [ws], activeWorkspaceId: "a" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  const ui = (tk: BoardTask) => (
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <BoardContext.Provider value={{ boards: {}, command }}>
          <BoardDetailPanel workspace={ws} task={tk} onClose={onClose} onSelectSubtask={vi.fn()} />
        </BoardContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(initial));
  return { commands, command, onClose, rerender: (tk: BoardTask) => r.rerender(ui(tk)) };
}

const types = (command: ReturnType<typeof vi.fn>) => command.mock.calls.map((c) => (c[1] as BoardCommand).type);

describe("taslak", () => {
  it("alanları düzenleyip Kaydet: saveDraft; ekle, sırala, bağımlılık", async () => {
    const { command } = setup(draftTask);
    expect((screen.getByRole("button", { name: "Kaydet" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık 1" }), { target: { value: "Veri modeli" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "2. alt görev şuna bağlı: Veri modeli" }));
    fireEvent.click(screen.getByRole("button", { name: "Aşağı taşı (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Alt görev" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Başlık 3" }), { target: { value: "Belge" } });
    fireEvent.change(screen.getByRole("textbox", { name: "İstem 3" }), { target: { value: "Rehberi güncelle" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await flush();
    const sent = command.mock.calls[0][1] as Extract<BoardCommand, { type: "saveDraft" }>;
    expect(sent.type).toBe("saveDraft");
    expect(sent.subtasks.map((d) => [d.title, d.dependsOn])).toEqual([
      ["Test", []],
      ["Veri modeli", []],
      ["Belge", []]
    ]);
    expect(sent.subtasks[2].id).toMatch(/^[A-Za-z0-9_-]{1,100}$/);
  });

  it("alt görev silinince ona bağlılık da kalkıyor", async () => {
    const { command } = setup(draftTask);
    fireEvent.click(screen.getByRole("button", { name: "Alt görevi sil (1)" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await flush();
    const sent = command.mock.calls[0][1] as Extract<BoardCommand, { type: "saveDraft" }>;
    expect(sent.subtasks).toEqual([{ id: "s2", title: "Test", prompt: "Test yaz", roleHint: "", dependsOn: [] }]);
  });

  it("Onayla: kaydedilmemiş değişiklik varsa önce saveDraft sonra approve; çift tıklama tek sefer", async () => {
    const { command } = setup(draftTask);
    fireEvent.change(screen.getByRole("textbox", { name: "İstem 1" }), { target: { value: "Yeni istem" } });
    const approve = screen.getByRole("button", { name: "Onayla" });
    fireEvent.click(approve);
    fireEvent.click(approve);
    await flush();
    expect(types(command)).toEqual(["saveDraft", "approve"]);
  });

  it("boş istemli alt görev varken Onayla kapalı", () => {
    setup(task("t1", [sub("s1", { prompt: "" })], { approvedAt: undefined, state: "awaitingApproval" }));
    expect((screen.getByRole("button", { name: "Onayla" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("Böl lideri başlatıyor; planlanırken kilitli; lider hatası açık mesaj, ayrıntı, uyarı ve katlı ham cevap", async () => {
    const t0 = task("t1", [], { approvedAt: undefined, state: "draft" });
    const { command, rerender } = setup(t0);
    fireEvent.click(screen.getByRole("button", { name: "Böl" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "split", taskId: "t1" });
    rerender({ ...t0, planning: true });
    expect(screen.getByText("Lider planlıyor…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Böl" }) as HTMLButtonElement).disabled).toBe(true);
    rerender({ ...t0, state: "stuck", leadError: "binary", leadDetail: "axet-code bulunamadı", leadRaw: "ham cevap", leadChangedFiles: true });
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("axet-code kullanılamıyor.");
    expect(alert.textContent).toContain("axet-code bulunamadı");
    expect(screen.getByText("Lider planlarken dosya değiştirdi.")).toBeTruthy();
    expect(screen.getByText("Liderin ham cevabı").closest("details")?.textContent).toContain("ham cevap");
    expect(screen.getByRole("button", { name: "Yeniden dene" })).toBeTruthy();
  });
});

describe("onaylı görev", () => {
  it("ready: seçilen ajana Ajana ver; held: Yeniden sıraya al", async () => {
    const { command } = setup(task("t1", [sub("s1"), sub("s2", { held: true, note: "agentClosed" })]));
    const row1 = rowOf("s1");
    expect(row1.textContent).toContain("Uygun ajan bekleniyor");
    fireEvent.change(within(row1).getByRole("combobox", { name: "Ajan" }), { target: { value: "p2" } });
    fireEvent.click(within(row1).getByRole("button", { name: "Ajana ver" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "assign", taskId: "t1", subtaskId: "s1", paneId: "p2" });
    expect(rowOf("s2").textContent).toContain("Beklemede");
    fireEvent.click(within(rowOf("s2")).getByRole("button", { name: "Yeniden sıraya al" }));
    await flush();
    expect(command).toHaveBeenLastCalledWith("a", { type: "requeue", taskId: "t1", subtaskId: "s2" });
  });

  it("running: ajan ve deneme; Terminale git Bölmeler'e geçip bölmeyi öne getiriyor; Doğrula", async () => {
    const { command, commands } = setup(task("t1", [sub("s1", { state: "running", paneId: "p1", attempts: 1 })]));
    const row = rowOf("s1");
    expect(row.textContent).toContain("Ajan: Ayşe");
    expect(row.textContent).toContain("Deneme: 1");
    fireEvent.click(within(row).getByRole("button", { name: "Terminale git" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "panes");
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
    fireEvent.click(within(row).getByRole("button", { name: "Doğrula" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "verify", taskId: "t1", subtaskId: "s1" });
    expect(within(row).queryByRole("button", { name: "Onayla" })).toBeNull();
  });

  it("doğrulama komutu yok: Onayla elle kanıt; elle onaylanan yeşil işaretle gösterilmiyor", async () => {
    const { command } = setup(
      task("t1", [sub("s1", { state: "verifying", paneId: "p1" }), sub("s2", { state: "done", proof: { kind: "manual", commands: [], ok: true, at: 1 } })]),
      { verify: undefined }
    );
    fireEvent.click(within(rowOf("s1")).getByRole("button", { name: "Onayla" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "approveManual", taskId: "t1", subtaskId: "s1" });
    expect(rowOf("s2").textContent).toContain("Elle onaylandı");
    expect(rowOf("s2").querySelector("[data-proof-ok]")).toBeNull();
  });

  it("yeşil komut kanıtı onay işaretiyle", () => {
    setup(task("t1", [sub("s1", { state: "done", proof: { kind: "commands", ok: true, at: 1, commands: [{ command: "npm test", exitCode: 0, durationMs: 900, tail: "" }] } })]));
    expect(rowOf("s1").querySelector("[data-proof-ok]")?.textContent).toContain("Doğrulandı");
  });

  it("başarısız: kanıt (komut, çıkış, süre, katlı çıktı); geri gönder reddedilirse açık hata", async () => {
    const failed = sub("s1", {
      state: "failed",
      paneId: "p1",
      attempts: 1,
      proof: { kind: "commands", ok: false, at: 1, commands: [{ command: "npm test", exitCode: 1, durationMs: 12_000, tail: "FAIL a.test.ts" }] }
    });
    const { command } = setup(task("t1", [failed]));
    const row = rowOf("s1");
    expect(row.textContent).toContain("npm test");
    expect(row.textContent).toContain("çıkış 1");
    expect(row.textContent).toContain("12 sn");
    expect(within(row).getByText("Çıktının sonu").closest("details")?.textContent).toContain("FAIL a.test.ts");
    command.mockResolvedValueOnce({ ok: false, reason: "typing" });
    fireEvent.click(within(row).getByRole("button", { name: "Düzeltmeye geri gönder" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "sendBack", taskId: "t1", subtaskId: "s1" });
    expect(screen.getByRole("alert").textContent).toBe("Bu ajanın terminalinde yazıyorsun; satırı gönder ya da sil, sonra yeniden dene.");
  });

  it("Sil: onay penceresinden sonra deleteTask ve panel kapanıyor; panelin erişilebilir adı", async () => {
    const { command, onClose } = setup(task("t1", [sub("s1")]));
    expect(screen.getByRole("complementary", { name: "Görev ayrıntısı" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sil" }));
    expect(command).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Sil" }));
    await flush();
    expect(command).toHaveBeenCalledWith("a", { type: "deleteTask", taskId: "t1" });
    expect(onClose).toHaveBeenCalled();
  });

  it("İngilizce", () => {
    setup(task("t1", [sub("s1", { state: "running", paneId: "p1" })]), {}, "en");
    expect(screen.getByRole("button", { name: "Verify" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Go to terminal" })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/boardDetailPanel.test.tsx`
Expected: FAIL — `src/board/BoardDetailPanel` yok.

- [ ] **Step 3: Taslak düzenleyici** — `src/board/DraftEditor.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useT } from "../i18n";
import type { SubtaskDraft } from "../../app-electron/shared/boardCommands";
import {
  MAX_SUBTASKS,
  ROLE_HINT_MAX,
  SUBTASK_PROMPT_MAX,
  SUBTASK_TITLE_MAX,
  type BoardTask,
  type Subtask
} from "../../app-electron/shared/boardTypes";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";

// Taslak (spec 2026-10-18 gorev-panosu §4): alt görevler düzenlenir, silinir,
// eklenir, sırası değişir. Onaysız hiçbir şey ajana gitmez. Değişiklik
// kaydedilmeden Böl kapalı: lider kullanıcının düzenlemesini ezmesin.

const INPUT =
  "h-7 w-full min-w-0 rounded border border-line bg-transparent px-2 text-xs text-slate-200 outline-none focus:border-accent-500/60 disabled:opacity-60";
const AREA =
  "min-h-16 w-full min-w-0 rounded border border-line bg-transparent px-2 py-1 text-xs text-slate-200 outline-none focus:border-accent-500/60 disabled:opacity-60";
const ACTION = `${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`;

export function toDraft(s: Subtask): SubtaskDraft {
  return { id: s.id, title: s.title, prompt: s.prompt, roleHint: s.roleHint, dependsOn: [...s.dependsOn] };
}

export default function DraftEditor({
  task,
  busy,
  onSave,
  onSplit,
  onApprove
}: {
  task: BoardTask;
  busy: boolean;
  onSave: (drafts: SubtaskDraft[]) => Promise<boolean>;
  onSplit: () => void;
  onApprove: (drafts: SubtaskDraft[] | null) => void;
}) {
  const t = useT();
  const source = JSON.stringify(task.subtasks.map(toDraft));
  const [drafts, setDrafts] = useState<SubtaskDraft[]>(() => task.subtasks.map(toDraft));
  const [dirty, setDirty] = useState(false);
  const mounted = useRef(true);
  const locked = busy || task.planning === true;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Liderden gelen yeni plan, kullanıcı düzenlemiyorsa ekrana geliyor.
  useEffect(() => {
    if (!dirty) setDrafts(JSON.parse(source) as SubtaskDraft[]);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (next: SubtaskDraft[]) => {
    setDrafts(next);
    setDirty(true);
  };
  const patch = (id: string, change: Partial<SubtaskDraft>) => edit(drafts.map((d) => (d.id === id ? { ...d, ...change } : d)));
  const remove = (id: string) =>
    edit(drafts.filter((d) => d.id !== id).map((d) => ({ ...d, dependsOn: d.dependsOn.filter((dep) => dep !== id) })));
  const move = (index: number, delta: -1 | 1) => {
    const next = [...drafts];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    edit(next);
  };
  const add = () => edit([...drafts, { id: crypto.randomUUID(), title: "", prompt: "", roleHint: "", dependsOn: [] }]);
  const toggleDep = (draft: SubtaskDraft, dep: string, on: boolean) =>
    patch(draft.id, { dependsOn: on ? [...draft.dependsOn, dep] : draft.dependsOn.filter((d) => d !== dep) });
  const label = (d: SubtaskDraft) => d.title.trim() || `#${drafts.indexOf(d) + 1}`;
  const complete = drafts.length > 0 && drafts.every((d) => d.title.trim() && d.prompt.trim());

  const save = async () => {
    const ok = await onSave(drafts);
    if (ok && mounted.current) setDirty(false);
  };

  return (
    <div className="flex flex-col gap-2">
      {drafts.length === 0 && <p className="text-xs text-slate-400">{t("board.draftEmpty")}</p>}
      <ol className="flex flex-col gap-2">
        {drafts.map((d, i) => {
          const n = i + 1;
          return (
            <li key={d.id} data-draft={d.id} className="flex flex-col gap-1.5 rounded-md border border-line p-2">
              <div className="flex items-center gap-1">
                <span className="shrink-0 font-mono text-2xs text-slate-500">{n}.</span>
                <input
                  aria-label={t("board.subtaskTitle", { n })}
                  value={d.title}
                  maxLength={SUBTASK_TITLE_MAX}
                  disabled={locked}
                  onChange={(e) => patch(d.id, { title: e.target.value })}
                  className={INPUT}
                />
                <button type="button" aria-label={t("board.moveUp", { n })} title={t("board.moveUp", { n })} disabled={locked || i === 0} onClick={() => move(i, -1)} className={GHOST_ICON_BUTTON}>
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  aria-label={t("board.moveDown", { n })}
                  title={t("board.moveDown", { n })}
                  disabled={locked || i === drafts.length - 1}
                  onClick={() => move(i, 1)}
                  className={GHOST_ICON_BUTTON}
                >
                  <ArrowDown size={12} />
                </button>
                <button type="button" aria-label={t("board.removeSubtask", { n })} title={t("board.removeSubtask", { n })} disabled={locked} onClick={() => remove(d.id)} className={GHOST_ICON_BUTTON}>
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                aria-label={t("board.subtaskPrompt", { n })}
                value={d.prompt}
                maxLength={SUBTASK_PROMPT_MAX}
                rows={3}
                disabled={locked}
                onChange={(e) => patch(d.id, { prompt: e.target.value })}
                className={AREA}
              />
              <input
                aria-label={t("board.subtaskRole", { n })}
                placeholder={t("board.rolePlaceholder")}
                value={d.roleHint}
                maxLength={ROLE_HINT_MAX}
                disabled={locked}
                onChange={(e) => patch(d.id, { roleHint: e.target.value })}
                className={INPUT}
              />
              {drafts.length > 1 && (
                <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
                  <legend className="text-2xs text-slate-500">{t("board.dependsOn")}</legend>
                  {drafts
                    .filter((o) => o.id !== d.id)
                    .map((o) => (
                      <label key={o.id} className="flex items-center gap-1 text-2xs text-slate-300">
                        <input
                          type="checkbox"
                          aria-label={t("board.dependsOnItem", { n, title: label(o) })}
                          checked={d.dependsOn.includes(o.id)}
                          disabled={locked}
                          onChange={(e) => toggleDep(d, o.id, e.target.checked)}
                        />
                        {label(o)}
                      </label>
                    ))}
                </fieldset>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={add} disabled={locked || drafts.length >= MAX_SUBTASKS} className={ACTION}>
          <Plus size={12} />
          {t("board.addSubtask")}
        </button>
        <button type="button" onClick={() => void save()} disabled={locked || !dirty} className={ACTION}>
          {t("common.save")}
        </button>
        <button type="button" onClick={onSplit} disabled={locked || dirty} title={dirty ? t("board.splitDirty") : undefined} className={ACTION}>
          {t(task.leadError ? "board.retry" : "board.split")}
        </button>
        <button type="button" onClick={() => onApprove(dirty ? drafts : null)} disabled={locked || !complete} className={ACTION}>
          {t("board.approve")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Ayrıntı paneli** — `src/board/BoardDetailPanel.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { BoardCommand, SubtaskDraft } from "../../app-electron/shared/boardCommands";
import type { BoardTask, Proof, Subtask } from "../../app-electron/shared/boardTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import ConfirmDialog from "../components/ConfirmDialog";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { agentName } from "../agents/agentLabels";
import { useBoards } from "./boardContext";
import { assignablePanes, FAILURE_KEY, LEAD_ERROR_KEY, NOTE_KEY, SUBTASK_STATE_KEY } from "./boardView";
import DraftEditor from "./DraftEditor";

// Ayrıntı paneli (spec 2026-10-18 gorev-panosu §8): hedef, lider durumu,
// taslak ya da alt görev listesi (istem, rol ipucu, bağımlılık, ajan seçici),
// kanıt ve düğmeler. Komut uçuştayken bütün düğmeler kilitli; panel
// söküldükten sonra durum yazılmıyor. "Elle onaylandı" yeşil işaretle
// gösterilmiyor.

const ACTION = `${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`;
const SELECT =
  "h-7 min-w-0 flex-1 rounded border border-line bg-transparent px-1.5 text-xs text-slate-200 outline-none focus:border-accent-500/60";

export default function BoardDetailPanel({
  workspace,
  task,
  subtaskId,
  onClose,
  onSelectSubtask
}: {
  workspace: TerminalWorkspace;
  task: BoardTask;
  subtaskId?: string;
  onClose: () => void;
  onSelectSubtask: (subtaskId: string) => void;
}) {
  const t = useT();
  const { command } = useBoards();
  const { commands } = useTerminalStore();
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const mounted = useRef(true);
  const hasVerify = (workspace.verify?.length ?? 0) > 0;
  const panes = assignablePanes(workspace);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Komutları sırayla gönderir; ilk hatada durur. Uçuştayken ikinci çağrı yok sayılır. */
  const run = async (...cmds: BoardCommand[]): Promise<boolean> => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    let ok = true;
    for (const cmd of cmds) {
      const result = await command(workspace.id, cmd);
      if (!result.ok) {
        ok = false;
        if (mounted.current) setError(FAILURE_KEY[result.reason]);
        break;
      }
    }
    pendingRef.current = false;
    if (mounted.current) setPending(false);
    return ok;
  };

  const ids = { taskId: task.id };
  const saveCommand = (drafts: SubtaskDraft[]): BoardCommand => ({ type: "saveDraft", taskId: task.id, title: task.title, goal: task.goal, subtasks: drafts });
  const goToTerminal = (paneId: string) => {
    commands.setWorkspaceView(workspace.id, "panes");
    commands.revealPane(paneId);
  };
  const paneName = (paneId: string | null) => {
    const pane = paneId ? workspace.panes.find((p) => p.id === paneId) : undefined;
    return pane ? agentName(pane, t) : null;
  };
  const titleOf = (id: string) => task.subtasks.find((s) => s.id === id)?.title ?? id;

  return (
    <aside aria-label={t("board.detailLabel")} className="flex w-96 shrink-0 flex-col border-l border-line">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
        <h2 title={task.title} className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
          {task.title}
        </h2>
        <button type="button" onClick={onClose} title={t("board.closeDetail")} aria-label={t("board.closeDetail")} className={GHOST_ICON_BUTTON}>
          <X size={14} />
        </button>
      </div>

      <div className="chat-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {task.goal && (
          <section className="flex flex-col gap-1">
            <span className="text-2xs text-slate-500">{t("board.goalLabel")}</span>
            <p className="whitespace-pre-wrap break-words text-xs text-slate-300">{task.goal}</p>
          </section>
        )}

        {task.planning && <p className="text-xs text-slate-400">{t("board.planning")}</p>}
        {task.leadChangedFiles && <p className="text-xs text-[var(--status-warning-text)]">{t("board.leadChangedFiles")}</p>}
        {task.leadError && (
          <div role="alert" className="rounded-md border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-2 py-1.5 text-xs text-[var(--status-danger-text)]">
            <p>{t(LEAD_ERROR_KEY[task.leadError])}</p>
            {task.leadDetail && <p className="mt-1 whitespace-pre-wrap break-words">{task.leadDetail}</p>}
          </div>
        )}
        {task.leadRaw && (
          <details className="text-2xs text-slate-400">
            <summary className="cursor-pointer">{t("board.leadRaw")}</summary>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">{task.leadRaw}</pre>
          </details>
        )}

        {task.approvedAt === undefined ? (
          <DraftEditor
            task={task}
            busy={pending}
            onSave={(drafts) => run(saveCommand(drafts))}
            onSplit={() => void run({ type: "split", ...ids })}
            onApprove={(drafts) => void (drafts ? run(saveCommand(drafts), { type: "approve", ...ids }) : run({ type: "approve", ...ids }))}
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {task.subtasks.map((s) => (
              <li
                key={s.id}
                data-detail-subtask={s.id}
                onClick={() => onSelectSubtask(s.id)}
                className={`flex flex-col gap-1.5 rounded-md border p-2 ${s.id === subtaskId ? "border-accent-500/60" : "border-line"}`}
              >
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200" title={s.title}>
                    {s.title}
                  </span>
                  {s.state === "failed" ? (
                    <span className="shrink-0 rounded bg-[var(--status-danger-bg)] px-1 text-2xs text-[var(--status-danger-text)]">{t("board.stateFailed")}</span>
                  ) : (
                    <span className="shrink-0 text-2xs text-slate-400">{t(s.state === "ready" && s.held ? "board.stateHeld" : SUBTASK_STATE_KEY[s.state])}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 text-2xs text-slate-500">
                  {paneName(s.paneId) && <span>{t("board.agentLabel", { name: paneName(s.paneId) ?? "" })}</span>}
                  {s.attempts > 0 && <span>{t("board.attempts", { count: s.attempts })}</span>}
                  {s.roleHint && <span>{t("board.roleHint", { role: s.roleHint })}</span>}
                  {s.dependsOn.length > 0 && <span>{t("board.dependsOnList", { list: s.dependsOn.map(titleOf).join(", ") })}</span>}
                  {s.note && <span>{t(NOTE_KEY[s.note])}</span>}
                </div>
                <details className="text-2xs text-slate-400">
                  <summary className="cursor-pointer">{t("board.prompt")}</summary>
                  <p className="mt-1 whitespace-pre-wrap break-words text-slate-300">{s.prompt}</p>
                </details>
                {s.proof && <ProofView proof={s.proof} />}
                <SubtaskActions
                  sub={s}
                  hasVerify={hasVerify}
                  busy={pending}
                  panes={panes.map((p) => ({ id: p.id, name: agentName(p, t) }))}
                  pick={picks[s.id] ?? panes[0]?.id ?? ""}
                  onPick={(paneId) => setPicks((prev) => ({ ...prev, [s.id]: paneId }))}
                  onRun={(cmd) => void run(cmd)}
                  onTerminal={goToTerminal}
                  taskId={task.id}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
        {error && (
          <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
            {t(error)}
          </p>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={pending} className={`${ACTION} hover:text-[var(--status-danger-text)]`}>
            {t("common.delete")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("board.deleteTitle")}
        message={t("board.deleteBody", { title: task.title })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          setConfirmDelete(false);
          void run({ type: "deleteTask", ...ids }).then((ok) => {
            if (ok) onClose();
          });
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </aside>
  );
}

function ProofView({ proof }: { proof: Proof }) {
  const t = useT();
  if (proof.kind === "manual") return <p className="text-2xs text-slate-400">{t("board.proofManual")}</p>;
  return (
    <div className="flex flex-col gap-1">
      {proof.ok ? (
        <p data-proof-ok="" className="flex items-center gap-1 text-2xs text-[var(--status-success-text)]">
          <Check size={12} />
          {t("board.proofOk")}
        </p>
      ) : (
        <p className="text-2xs text-[var(--status-danger-text)]">{t("board.proofFailed")}</p>
      )}
      {proof.commands.map((c, i) => (
        <div key={`${i}-${c.command}`} className="flex flex-col gap-0.5 rounded border border-line px-2 py-1">
          <div className="flex min-w-0 items-baseline gap-2 text-2xs">
            <code className="min-w-0 flex-1 truncate font-mono text-slate-300" title={c.command}>
              {c.command}
            </code>
            <span className="shrink-0 text-slate-500">
              {c.error === "missingDir"
                ? t("board.missingDir")
                : c.error === "spawn"
                  ? t("board.spawnFailed")
                  : c.timedOut
                    ? t("board.noteTimeout")
                    : c.exitCode === null
                      ? t("board.exitNone")
                      : t("board.exitCode", { code: c.exitCode })}
            </span>
            <span className="shrink-0 font-mono tabular-nums text-slate-500">{t("board.duration", { sec: Math.max(0, Math.round(c.durationMs / 1000)) })}</span>
          </div>
          {c.tail && (
            <details className="text-2xs text-slate-400">
              <summary className="cursor-pointer">{t("board.tail")}</summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono">{c.tail}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function SubtaskActions({
  sub,
  taskId,
  hasVerify,
  busy,
  panes,
  pick,
  onPick,
  onRun,
  onTerminal
}: {
  sub: Subtask;
  taskId: string;
  hasVerify: boolean;
  busy: boolean;
  panes: { id: string; name: string }[];
  pick: string;
  onPick: (paneId: string) => void;
  onRun: (cmd: BoardCommand) => void;
  onTerminal: (paneId: string) => void;
}) {
  const t = useT();
  const ids = { taskId, subtaskId: sub.id };
  const verifyOrApprove = hasVerify ? (
    <button type="button" disabled={busy} onClick={() => onRun({ type: "verify", ...ids })} className={ACTION}>
      {t("board.verify")}
    </button>
  ) : (
    <button type="button" disabled={busy} onClick={() => onRun({ type: "approveManual", ...ids })} className={ACTION}>
      {t("board.approve")}
    </button>
  );
  const terminal = sub.paneId ? (
    <button type="button" onClick={() => onTerminal(sub.paneId as string)} className={ACTION}>
      {t("board.goTerminal")}
    </button>
  ) : null;

  switch (sub.state) {
    case "waiting":
    case "done":
      return null;
    case "ready":
      return (
        <div className="flex flex-col gap-1.5">
          {panes.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <select aria-label={t("board.agentPick")} value={pick} onChange={(e) => onPick(e.target.value)} className={SELECT}>
                {panes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button type="button" disabled={busy || !pick} onClick={() => onRun({ type: "assign", ...ids, paneId: pick })} className={ACTION}>
                {t("board.assign")}
              </button>
            </div>
          ) : (
            <p className="text-2xs text-slate-500">{t("board.noAgents")}</p>
          )}
          {sub.held && (
            <div>
              <button type="button" disabled={busy} onClick={() => onRun({ type: "requeue", ...ids })} className={ACTION}>
                {t("board.requeue")}
              </button>
            </div>
          )}
        </div>
      );
    case "running":
    case "asking":
      return (
        <div className="flex flex-wrap gap-1.5">
          {terminal}
          {verifyOrApprove}
        </div>
      );
    case "verifying":
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {terminal}
          {hasVerify ? <span className="text-2xs text-slate-400">{t("board.verifyingNow")}</span> : verifyOrApprove}
        </div>
      );
    case "failed":
      return (
        <div className="flex flex-wrap gap-1.5">
          {sub.paneId && (
            <button type="button" disabled={busy} onClick={() => onRun({ type: "sendBack", ...ids })} className={ACTION}>
              {t("board.sendBack")}
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => onRun({ type: "requeue", ...ids })} className={ACTION}>
            {t("board.requeue")}
          </button>
          {hasVerify && verifyOrApprove}
          {terminal}
        </div>
      );
  }
}
```

- [ ] **Step 5: Panoya bağla** — `src/board/BoardView.tsx`

İçe aktar: `import BoardDetailPanel from "./BoardDetailPanel";`

`const parallel = …` satırının altına:

```tsx
  const selectedTask = selection ? tasks.find((task) => task.id === selection.taskId) : undefined;
```

`</section>` ile `<NewTaskDialog` arasına:

```tsx
      {selectedTask && (
        <BoardDetailPanel
          key={selectedTask.id}
          workspace={workspace}
          task={selectedTask}
          subtaskId={selection?.subtaskId}
          onClose={() => setSelection(null)}
          onSelectSubtask={(id) => setSelection({ taskId: selectedTask.id, subtaskId: id })}
        />
      )}
```

- [ ] **Step 6: Metinler** — `src/i18n/tr.ts` ve `src/i18n/en.ts` (Task 12'nin `board.announce` satırından sonra; o satıra virgül)

`tr.ts`:

```ts
  "board.detailLabel": "Görev ayrıntısı",
  "board.closeDetail": "Ayrıntıyı kapat",
  "board.leadChangedFiles": "Lider planlarken dosya değiştirdi.",
  "board.leadRaw": "Liderin ham cevabı",
  "board.split": "Böl",
  "board.retry": "Yeniden dene",
  "board.approve": "Onayla",
  "board.addSubtask": "Alt görev",
  "board.draftEmpty": "Henüz alt görev yok. Böl'e bas ya da elle ekle.",
  "board.splitDirty": "Önce değişiklikleri kaydet.",
  "board.subtaskTitle": "Başlık {n}",
  "board.subtaskPrompt": "İstem {n}",
  "board.subtaskRole": "Rol ipucu {n}",
  "board.rolePlaceholder": "Rol ipucu (isteğe bağlı)",
  "board.dependsOn": "Önce bitmesi gerekenler",
  "board.dependsOnItem": "{n}. alt görev şuna bağlı: {title}",
  "board.moveUp": "Yukarı taşı ({n})",
  "board.moveDown": "Aşağı taşı ({n})",
  "board.removeSubtask": "Alt görevi sil ({n})",
  "board.assign": "Ajana ver",
  "board.agentPick": "Ajan",
  "board.noAgents": "Bu alanda çalışan ajan yok.",
  "board.requeue": "Yeniden sıraya al",
  "board.goTerminal": "Terminale git",
  "board.verify": "Doğrula",
  "board.sendBack": "Düzeltmeye geri gönder",
  "board.verifyingNow": "Doğrulanıyor…",
  "board.attempts": "Deneme: {count}",
  "board.agentLabel": "Ajan: {name}",
  "board.roleHint": "Rol: {role}",
  "board.dependsOnList": "Bağımlı: {list}",
  "board.prompt": "İstem",
  "board.proofOk": "Doğrulandı",
  "board.proofFailed": "Doğrulama başarısız",
  "board.proofManual": "Elle onaylandı",
  "board.exitCode": "çıkış {code}",
  "board.exitNone": "çıkış kodu yok",
  "board.duration": "{sec} sn",
  "board.tail": "Çıktının sonu",
  "board.missingDir": "Klasör bulunamadı",
  "board.spawnFailed": "Başlatılamadı",
  "board.deleteTitle": "Görevi sil",
  "board.deleteBody": "“{title}” ve alt görevleri silinir; çalışan lider ya da doğrulama durdurulur."
```

`en.ts`:

```ts
  "board.detailLabel": "Task details",
  "board.closeDetail": "Close details",
  "board.leadChangedFiles": "The lead changed files while planning.",
  "board.leadRaw": "The lead's raw answer",
  "board.split": "Split",
  "board.retry": "Try again",
  "board.approve": "Approve",
  "board.addSubtask": "Subtask",
  "board.draftEmpty": "No subtasks yet. Press Split or add them by hand.",
  "board.splitDirty": "Save your changes first.",
  "board.subtaskTitle": "Title {n}",
  "board.subtaskPrompt": "Prompt {n}",
  "board.subtaskRole": "Role hint {n}",
  "board.rolePlaceholder": "Role hint (optional)",
  "board.dependsOn": "Must finish first",
  "board.dependsOnItem": "Subtask {n} depends on: {title}",
  "board.moveUp": "Move up ({n})",
  "board.moveDown": "Move down ({n})",
  "board.removeSubtask": "Delete subtask ({n})",
  "board.assign": "Give to agent",
  "board.agentPick": "Agent",
  "board.noAgents": "No agent is running in this workspace.",
  "board.requeue": "Requeue",
  "board.goTerminal": "Go to terminal",
  "board.verify": "Verify",
  "board.sendBack": "Send back for a fix",
  "board.verifyingNow": "Verifying…",
  "board.attempts": "Attempts: {count}",
  "board.agentLabel": "Agent: {name}",
  "board.roleHint": "Role: {role}",
  "board.dependsOnList": "Depends on: {list}",
  "board.prompt": "Prompt",
  "board.proofOk": "Verified",
  "board.proofFailed": "Verification failed",
  "board.proofManual": "Approved by hand",
  "board.exitCode": "exit {code}",
  "board.exitNone": "no exit code",
  "board.duration": "{sec} s",
  "board.tail": "End of output",
  "board.missingDir": "Folder not found",
  "board.spawnFailed": "Could not start",
  "board.deleteTitle": "Delete task",
  "board.deleteBody": "“{title}” and its subtasks will be deleted; a running lead or verification is stopped."
```

- [ ] **Step 7: Yeşili gör**

Run: `npx vitest run tests/boardDetailPanel.test.tsx tests/boardScreen.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 8: Commit**

```bash
git add src/board/DraftEditor.tsx src/board/BoardDetailPanel.tsx src/board/BoardView.tsx src/i18n/tr.ts src/i18n/en.ts tests/boardDetailPanel.test.tsx
git commit -m "Gorev Panosu: ayrinti paneli, taslak duzenleme ve dugmeler

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Ekip şeridi görev satırı, kenar çubuğu başarısız rozeti, alan kapatma onayı ve bildirim tıklaması

**Files:**
- Modify: `src/agents/TeamStrip.tsx`
- Modify: `src/components/TerminalSidebar.tsx`
- Create: `src/board/BoardOpenListener.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/boardScreen.test.tsx` (yeni test), `tests/terminalSidebar.test.tsx` (yardımcı genişler + yeni testler), `tests/boardOpenListener.test.tsx`, `tests/appTerminalWiring.test.ts` (yeni test)

**Interfaces:**
- Consumes: Task 11 `useBoards`, `BoardProvider`, `activeSubtaskOf`, `failedCount`, `taskCount`, `BoardContext`; Task 10 `window.api.onBoardOpen`; Task 9 `commands.setWorkspaceView`; mevcut `commands.selectWorkspace`, `liveCount`, `ConfirmDialog`.
- Produces:

```ts
// BoardOpenListener.tsx — TerminalStoreProvider İÇİNDE çizilir
export default function BoardOpenListener(props: { onShow: () => void }): null;
// Şerit kartı: [data-agent-task] (görevli ajanın alt görev başlığı); kenar çubuğu: [data-failed=<sayı>]
```

- [ ] **Step 1: Kırmızı test (şerit)** — `tests/boardScreen.test.tsx`'in sonuna:

```tsx
describe("ekip şeridi", () => {
  it("görevli ajanın kartında alt görev başlığı küçük satır; görevsiz ajanda yok", () => {
    const ws = workspace({ panes: [agentPane("p1"), agentPane("p2")] });
    setup(ws, { workspaceId: "a", tasks: [task("t", [sub("Tabloyu ekle", { state: "running", paneId: "p1" })])] });
    expect(document.querySelector('[data-agent-card="p1"] [data-agent-task]')?.textContent).toBe("Tabloyu ekle");
    expect(document.querySelector('[data-agent-card="p2"] [data-agent-task]')).toBeNull();
  });
});
```

- [ ] **Step 2: Kırmızı test (kenar çubuğu)** — `tests/terminalSidebar.test.tsx`

İçe aktarımlara ekle:

```tsx
import { BoardContext } from "../src/board/boardContext";
import type { Board } from "../app-electron/shared/boardTypes";
```

`renderSidebar`'ın `extra` türüne `boards?: Record<string, Board>` ekle ve `<TerminalSidebar …/>`'ı sar:

```tsx
          <BoardContext.Provider value={{ boards: extra.boards ?? {}, command: vi.fn(async () => ({ ok: true as const })) }}>
            <TerminalSidebar activeSap={extra.activeSap ?? null} />
          </BoardContext.Provider>
```

`describe("TerminalSidebar", …)` bloğunun sonuna:

```tsx
  it("panoda başarısız alt görev varsa alan satırında tehlike rozeti", () => {
    const board: Board = {
      workspaceId: "a",
      tasks: [
        {
          id: "t",
          title: "T",
          goal: "",
          state: "stuck",
          createdAt: 1,
          approvedAt: 2,
          subtasks: [
            { id: "s1", title: "A", prompt: "p", roleHint: "", dependsOn: [], state: "failed", paneId: null, attempts: 1 },
            { id: "s2", title: "B", prompt: "p", roleHint: "", dependsOn: [], state: "failed", paneId: null, attempts: 1 }
          ]
        }
      ]
    };
    renderSidebar([ws("a", "API"), ws("b", "UI")], {}, { boards: { a: board } });
    const badge = row("API").querySelector("[data-failed]") as HTMLElement;
    expect(badge.textContent).toBe("2");
    expect(badge.getAttribute("aria-label")).toBe("2 alt görev başarısız");
    expect(row("UI").querySelector("[data-failed]")).toBeNull();
  });

  it("kapatma: süreç yok ama panoda görev varsa onay soruluyor ve görevlerin silineceği yazıyor", () => {
    const board: Board = { workspaceId: "a", tasks: [{ id: "t", title: "T", goal: "", state: "draft", createdAt: 1, subtasks: [] }] };
    const c = renderSidebar([ws("a", "API"), ws("b", "UI")], {}, { boards: { a: board } });
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kapat" }));
    expect(c.closeWorkspace).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").textContent).toContain("Bu alanın panosundaki 1 görev de silinir.");
    expect(screen.getByRole("dialog").textContent).not.toContain("terminal kapanacak");
  });
```

- [ ] **Step 3: Kırmızı test (bildirim tıklaması ve App)** — `tests/boardOpenListener.test.tsx`

```tsx
// @vitest-environment jsdom
// Pano bildirimine tıklama (spec 2026-10-18 gorev-panosu §8): Ajanlar ekranı, o alan, Pano görünümü.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import BoardOpenListener from "../src/board/BoardOpenListener";
import { TerminalStoreContext, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";

afterEach(cleanup);

describe("BoardOpenListener", () => {
  it("bildirim tıklaması ekranı açıyor, alanı seçiyor ve Pano'ya geçiyor; söküldüğünde dinleyici kalkıyor", () => {
    let open: ((workspaceId: string) => void) | null = null;
    const off = vi.fn();
    (window as unknown as { api: unknown }).api = {
      onBoardOpen: (cb: (workspaceId: string) => void) => {
        open = cb;
        return off;
      }
    };
    const commands = { selectWorkspace: vi.fn(), setWorkspaceView: vi.fn() };
    const store = { state: initialTerminalState, commands, defaultKind: "cmd", defaultCwd: "", agentCwd: "" } as unknown as TerminalStoreValue;
    const onShow = vi.fn();
    const r = render(
      <TerminalStoreContext.Provider value={store}>
        <BoardOpenListener onShow={onShow} />
      </TerminalStoreContext.Provider>
    );
    act(() => open?.("w2"));
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(commands.selectWorkspace).toHaveBeenCalledWith("w2");
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("w2", "board");
    r.unmount();
    expect(off).toHaveBeenCalled();
  });
});
```

`tests/appTerminalWiring.test.ts`'te `describe("App — terminal modu bağlı", …)` bloğunun sonuna:

```ts
  it("görev panosu sağlayıcısı ve bildirim dinleyicisi App'te", () => {
    expect(app).toContain("<BoardProvider>");
    expect(app).toMatch(/<BoardOpenListener onShow=\{[^}]*\}\s*\/>/);
  });
```

- [ ] **Step 4: Kırmızıyı gör**

Run: `npx vitest run tests/boardScreen.test.tsx tests/terminalSidebar.test.tsx tests/boardOpenListener.test.tsx tests/appTerminalWiring.test.ts`
Expected: FAIL — `[data-agent-task]` ve `[data-failed]` yok; `BoardOpenListener` yok; App'te `<BoardProvider>` yok.

- [ ] **Step 5: Ekip şeridi** — `src/agents/TeamStrip.tsx`

İçe aktar:

```tsx
import { useBoards } from "../board/boardContext";
import { activeSubtaskOf } from "../board/boardView";
```

Şerit kabının sınıfında `h-16` → `min-h-16`. `AgentCard` içinde `const view = …` satırının altına:

```tsx
  const { boards } = useBoards();
  const job = activeSubtaskOf(boards, pane.id);
```

Kart düğmesinin sınıfında `h-12` → `min-h-12 py-1`; ikinci `<span className="flex min-w-0 items-center gap-1.5 text-2xs">…</span>` bloğunun ALTINA:

```tsx
        {/* Görev panosu (spec 2026-10-18 gorev-panosu §8): görevli ajanın alt görevi. */}
        {job && (
          <span data-agent-task="" title={job.subtask.title} className="min-w-0 truncate text-2xs text-slate-500">
            {job.subtask.title}
          </span>
        )}
```

- [ ] **Step 6: Kenar çubuğu** — `src/components/TerminalSidebar.tsx`

İçe aktar:

```tsx
import { useBoards } from "../board/boardContext";
import { failedCount, taskCount } from "../board/boardView";
```

Bileşenin başında `const { statuses } = useAgentStatuses();` altına: `const { boards } = useBoards();`

`requestClose`'u şuna çevir (panoda görev varsa da sor: görevler sessizce silinmesin):

```tsx
  const requestClose = (w: TerminalWorkspace) => {
    setMenu(null);
    if (liveCount(w) > 0 || taskCount(boards[w.id]) > 0) setConfirmId(w.id);
    else commands.closeWorkspace(w.id);
  };
```

Alan satırında `const asking = askingCount(w, statuses);` altına `const failed = failedCount(boards[w.id]);` ve `{asking > 0 && (…)}` bloğunun ÖNÜNE:

```tsx
              {failed > 0 && (
                <span
                  data-failed={failed}
                  title={t("board.failedCount", { count: failed })}
                  aria-label={t("board.failedCount", { count: failed })}
                  className="shrink-0 rounded-full bg-[var(--status-danger-bg)] px-1.5 font-mono text-2xs tabular-nums text-[var(--status-danger-text)]"
                >
                  {failed}
                </span>
              )}
```

`<ConfirmDialog … message={…} />` mesajını şuna çevir:

```tsx
        message={
          confirmTarget
            ? [
                liveCount(confirmTarget) > 0 ? t("terminal.closeWorkspaceBody", { count: liveCount(confirmTarget) }) : "",
                taskCount(boards[confirmTarget.id]) > 0 ? t("board.closeWorkspaceTasks", { count: taskCount(boards[confirmTarget.id]) }) : ""
              ]
                .filter(Boolean)
                .join(" ")
            : ""
        }
```

- [ ] **Step 7: Bildirim dinleyicisi ve App** — `src/board/BoardOpenListener.tsx`

```tsx
import { useEffect, useRef } from "react";
import { useTerminalStore } from "../stores/terminalStoreContext";

// Pano bildirimine tıklanınca (spec 2026-10-18 gorev-panosu §8) Ajanlar
// ekranı açılıyor, o alan seçiliyor ve Pano görünümüne geçiliyor.
// TerminalStoreProvider'ın İÇİNDE çizilmeli.
export default function BoardOpenListener({ onShow }: { onShow: () => void }) {
  const { commands } = useTerminalStore();
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;
  useEffect(() => {
    const off = window.api?.onBoardOpen?.((workspaceId) => {
      onShowRef.current();
      commands.selectWorkspace(workspaceId);
      commands.setWorkspaceView(workspaceId, "board");
    });
    return off ?? (() => {});
  }, [commands]);
  return null;
}
```

`src/App.tsx`:
- İçe aktar: `import { BoardProvider } from "./board/boardContext";` ve `import BoardOpenListener from "./board/BoardOpenListener";`
- `<AgentStatusProvider>` satırının hemen altına `<BoardProvider>`; `<AgentOpenListener onShow={handleShowAgents} />` satırının altına `<BoardOpenListener onShow={handleShowAgents} />`; `</AgentStatusProvider>` satırının hemen ÜSTÜNE `</BoardProvider>`.

- [ ] **Step 8: Metinler** — `src/i18n/tr.ts` ve `src/i18n/en.ts` (Task 13'ün `board.deleteBody` satırından sonra; o satıra virgül)

`tr.ts`:

```ts
  "board.failedCount": "{count} alt görev başarısız",
  "board.closeWorkspaceTasks": "Bu alanın panosundaki {count} görev de silinir."
```

`en.ts`:

```ts
  "board.failedCount": "{count} subtasks failed",
  "board.closeWorkspaceTasks": "The {count} tasks on this workspace's board will be deleted too."
```

- [ ] **Step 9: Yeşili gör**

Run: `npx vitest run tests/boardScreen.test.tsx tests/terminalSidebar.test.tsx tests/boardOpenListener.test.tsx tests/appTerminalWiring.test.ts tests/terminalMode.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 10: Commit**

```bash
git add src/agents/TeamStrip.tsx src/components/TerminalSidebar.tsx src/board/BoardOpenListener.tsx src/App.tsx src/i18n/tr.ts src/i18n/en.ts tests/boardScreen.test.tsx tests/terminalSidebar.test.tsx tests/boardOpenListener.test.tsx tests/appTerminalWiring.test.ts
git commit -m "Gorev Panosu: ekip seridi gorev satiri, basarisiz rozeti, kapatma onayi, bildirim tiklamasi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Kullanım rehberi, tam doğrulama ve elle deneme listesi

**Files:**
- Modify: `KULLANIM-REHBERI.md`

**Interfaces:**
- Consumes: bütün önceki task'lar.
- Produces: rehberde "Görev Panosu" alt bölümü; yeşil tam takım; kullanıcıya elle deneme listesi.

- [ ] **Step 1: Rehber** — `KULLANIM-REHBERI.md`

"## Ajanlar Ekranı" bölümünün son maddesinden ("…daha eski bir sürüme (1.8.x) dönersen ajan bölmeleri o sürümde açılmaz.") sonra, "## Klavye Kısayolları" başlığının hemen ÖNÜNE:

```markdown
### Görev Panosu

Üst şeritteki **Bölmeler | Pano** geçişiyle alanın görev panosunu açarsın
(seçim alan başına hatırlanır). Bir hedef yazarsın; **lider** onu alt
görevlere böler, sen onaylarsın, NTT Studio alt görevleri alandaki ajanlara
dağıtır ve her alt görev ancak **kanıtla** kapanır. Ajanın "bitti" demesi
hiçbir kartı kapatmaz.

- **Görev**: başlık ve hedef yazarsın. **Böl** lideri çalıştırır: axet-code
  alanın kökünde (yoksa ajanların varsayılan klasöründe) tek seferlik,
  Outlook gibi bağlayıcıları kapalı bir oturum açar, dosya değiştirmeden en fazla 8 alt
  görevlik bir plan üretir (3 dakika sınırı). Lider planlarken dosya
  değiştirdiyse taslağın üstünde uyarı çıkar. Lider kullanılamıyorsa ya da
  geçerli bir plan dönmezse görev "Takıldı" olur, sebebi açıkça yazar;
  **Yeniden dene** ya da alt görevleri elle ekle.
- **Taslak**: alt görevlerin başlığını, istemini, rol ipucunu ve
  bağımlılıklarını düzenler, ekler, siler, sıralarsın. **Onayla** demeden
  hiçbir şey ajana gitmez.
- **Dağıtım**: bağımlılığı bitmiş alt görev, aynı alandaki boşta bir ajana
  gider (rol ipucu eşleşen ajan önce). Ajanın motoru kapalıysa (terminalde
  kabuk istemi görünüyorsa) ya da sen o terminalde yazıyorsan hiçbir şey
  yazılmaz; alt görev "Uygun ajan bekleniyor" olarak bekler. Durumu tahmini
  (≈) olan ajanlara (Claude Code, Codex, Gemini, özel komut) iş kendiliğinden
  gitmez: **Ajana ver** ile sen verirsin.
- **Kanıt**: alana sağ tıklayıp **Doğrulama komutları…** ile satır başına
  bir komut yazarsın (en fazla 5; ör. `npm run lint`, `npm test`). axet-code
  ajanı işini bitirince komutlar alanın kökünde, gizli bir pencerede sırayla
  çalışır; hepsi başarılıysa alt görev **Bitti**, biri başarısızsa
  **Başarısız** olur (komut başına 10 dakika sınırı; çıktının sonu kartta).
  Tahmini durumlu ajanlarda **Doğrula**'ya sen basarsın. Komut yazmadıysan
  alt görevi **Onayla** ile elle kapatırsın; kartta "Elle onaylandı" yazar,
  yeşil onay işareti çıkmaz. Yalnız buraya senin yazdığın komutlar çalışır;
  lider ya da ajan komut çalıştıramaz.
- **Başarısız alt görev**: **Düzeltmeye geri gönder** aynı ajana hata
  çıktısının sonunu yazar; **Yeniden sıraya al** alt görevi boşa çıkarır.
  Kendiliğinden geri gönderme yoktur.
- **Ajan kapandıysa ya da uygulama yeniden açıldıysa** yarıda kalan alt
  görevler "Beklemede" olur ve kendiliğinden yeniden gönderilmez; **Yeniden
  sıraya al** dersin.
- Ekip şeridinde görevli ajanın kartında alt görevin başlığı, kenar
  çubuğunda başarısız alt görevi olan alanın yanında kırmızı bir sayı
  görünür. Pencere arka plandayken "Görev bitti" ve "Alt görev başarısız"
  bildirimleri gelir (sohbet bildirimi ayarı).
- Pano uygulamanın veri klasöründe tutulur; proje klasörüne ya da depoya
  dosya yazılmaz. Alanı kapatınca panosu da silinir (görev varsa sorulur).
  Pano dosyası bozulursa kenara alınır ve boş pano açılır; veri sessizce
  silinmez.
- SAP yazma onayı, QA/PRD salt okunur kuralı ve rol kapısı aynen geçerlidir:
  modül danışmanı rolünde pano görev çalıştırabilir ama ajan SAP'ye
  geliştirme yazamaz.
```

- [ ] **Step 2: Tam doğrulama**

Run: `npm run typecheck`
Expected: temiz.

Run: `npx vitest run > .superpowers/vitest-pano.txt 2>&1` ve dosyanın sonundaki özeti oku.
Expected: bütün dosyalar PASS. Bir test kırmızıysa: bu planın değiştirdiği bir davranışı eski hâliyle bekliyorsa (ör. ekip şeridinin sabit yüksekliği, alan kapatmada onay sorulmaması, `agentRegister` çağrısının tam nesnesi), beklentiyi yeni davranışa çevir ve ledger'a yaz; değilse sistematik hata ayıklamaya geç (bu task'ı kapatmadan).

Run: `git status --short`
Expected: yalnız `KULLANIM-REHBERI.md` değişmiş (izlenmeyen `resources/sap-toolkit/auth-plus/scripts/` dalda zaten vardı; dokunma); `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*` stage edilmemiş.

- [ ] **Step 3: Commit**

```bash
git add KULLANIM-REHBERI.md
git commit -m "Rehber: Gorev Panosu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Elle deneme listesini kullanıcıya ver** (spec §10; geliştirme sunucusunu sen başlatma)

1. Bir Git deposunu kök yapan bir alanda iki axet-code ajanı aç (ör. rol `coder` ve `task`); alana sağ tıklayıp **Doğrulama komutları…**'na deponun lint/test komutunu yaz.
2. **Pano**'ya geç, **Görev** ile bir hedef yaz, **Böl** → taslak gelmeli (lider dosya değiştirdiyse uyarı). İstemi kısa ve terminalde görülebilir bir işe çevir; **Onayla** → iki ajana birer alt görev gitmeli; terminalde istem TEK satır olarak yazılıp gönderilmeli (TUI istemi yapıştırma sanıp satır sonu eklemiyor mu? Eklerse plan "Spec'ten bilinçli sapmalar" 13'teki gecikmeyi artır ve not et).
3. Bir ajanın terminalinde yazmaya başla (Enter'a basma), sonra o ajana **Ajana ver** dene → "terminalinde yazıyorsun" hatası; istem gitmemeli.
4. Bir ajanın motorunu kapat (`/exit` ya da Ctrl+C ile kabuk istemine dön) → atanmış alt görev "Beklemede · Ajan kapandı" olmalı; kabukta hiçbir istem komut olarak çalışmamış olmalı.
5. Kırmızı doğrulama üret (ör. bilerek kırılan bir test) → alt görev "Başarısız", kartta komut, çıkış kodu, çıktının sonu; pencere arka plandayken "Alt görev başarısız" bildirimi. **Düzeltmeye geri gönder** → aynı ajana tek satırlık düzeltme istemi.
6. Yeşil doğrulamadan sonra bütün alt görevler bitince "Görev bitti" bildirimi; tıklayınca o alanın panosu açılmalı.
7. Uygulamayı bir alt görev çalışırken kapatıp aç → alt görev "Beklemede · Uygulama yeniden başlatıldı", kendiliğinden gönderilmemeli.
8. Bir Claude Code ajanında: kendiliğinden iş gitmemeli; **Ajana ver** ile ver, bitince **Doğrula**'ya bas.

---

## Spec kapsama özeti

| Spec | Task |
|---|---|
| §1 ilke: bölmeyi yapay zekâ, gerisini kod; kanıtla kapanış | 1, 3, 5, 8 |
| §2 veri modeli, `boards/<workspaceId>.json`, `verify` alanı, görev durumu türetme | 1, 4, 9 |
| §3 lider: başsız `axet-code run`, istem, JSON ayrıştırma, 3 dk, git status farkı, sürüm denetimi | 2, 6, 8, 10 |
| §4 taslak ve onay | 1, 8, 13 |
| §5 dağıtım: uygunluk 1–6, tek satır + `\r`, Ajana ver, motor kapalıyken yazmama, paralel uyarısı | 3, 7, 8, 11, 12, 13 |
| §6 bitiş ve kanıt: kesin geçiş, Doğrula, 10 dk, son 40 satır, Düzeltmeye geri gönder, elle onay | 1, 5, 8, 13 |
| §7 hata durumları (tablo satırlarının hepsi) | 1, 4, 5, 6, 7, 8, 10, 14 |
| §8 ekran: geçiş, sütunlar, ayrıntı paneli, ekip şeridi, kenar çubuğu, alan menüsü, bildirim, erişilebilirlik | 9, 10, 12, 13, 14 |
| §9 günlük (`pano.lider`, `pano.dagitim`, `pano.dogrulama`; içerik yok) | 8, 10 |
| §10 test + elle deneme | her task, 15 |
| §11 kapsam dışı (otopilot, worktree, SAP kanıtı…) | yapılmıyor; kendiliğinden geri gönderme yok (8) |
| §12 değişmeyenler | Global Constraints (dokunulmuyor) |
