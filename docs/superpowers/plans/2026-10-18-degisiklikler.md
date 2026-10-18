# Değişiklikler: Canlı İzleme, İnceleme Kuyruğu ve Geri Alma Noktası — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajanlar ekranına **Bölmeler | Pano | Ofis | Değişiklikler** geçişinin dördüncü seçeneği olarak, Git deposu olan bir alanda ajanların dosya değişikliklerini canlı gösteren, her istem/dağıtım öncesi alınan geri alma noktalarını inceleme kuyruğunda listeleyen ve seçili kaydın değişikliklerini kullanıcının Git durumuna dokunmadan geri alabilen bir görünüm eklemek.

**Architecture:**
- Anlık görüntü = **ağaç nesnesi**: alanın köküne ait, uygulamaya ait kalıcı bir index dosyasında (`userData/checkpoints/<workspaceId>.index`, `GIT_INDEX_FILE`) `git add -A -- .` + `git write-tree`. Kullanıcının index'i, HEAD'i, dalı, stash'i ve ref'leri değişmez; yalnız nesne veritabanına ağaç/blob yazılır. Kayıtlar `userData/checkpoints/<workspaceId>.json`'da (en çok 200; Görev Panosu deposu kalıbı: atomik yazma, bozuk dosya `.bozuk-<zaman>`).
- Bütün karşılaştırmalar **ağaç↔ağaç** (`git diff-tree -r --no-renames --relative=<önek>`): "çalışma ağacına kadar" ve **Canlı** satırı, aynı özel index'le o an alınan (kaydedilmeyen) taze bir ağaçla karşılaştırılıyor; böylece izlenmeyen yeni dosyalar da görünüyor. Geri alma ayrı, geçici bir index'e `read-tree <ağaç>` + dosya başına `checkout-index -f`; sonradan eklenmiş dosya Electron `shell.trashItem` ile çöpe.
- Ana süreçte **değişiklik yöneticisi** (`changesManager.ts`): alan başına sıralı iş kuyruğu, görüntü kancaları (izleyicinin `onPromptLine`'ı, pano yöneticisinin `onDispatched`'ı, elle, `beforeRestore`), aralık/diff/geri alma. Saf mantık `app-electron/shared/changesLogic.ts`'te, gerçek git `changesGit.ts`'te (vitest'te gerçek geçici depoyla test ediliyor), Electron'a dokunan ince parça `changesLive.ts`'te. Renderer'da `src/changes/` altında görünüm, diff görüntüleyici, geri alma penceresi ve pano ayrıntı panelinden bağlantı.

**Tech Stack:** Electron 44 (Node 24), TypeScript, React 18, Tailwind 3, vitest 2, @testing-library/react (jsdom), sistemdeki `git` (PATH). Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-18-degisiklikler-design.md` (üstüne inşa edilen: `docs/superpowers/plans/2026-10-18-gorev-panosu.md`, `docs/superpowers/plans/2026-10-18-ofis-gorunumu.md`; kodları `ozellik/ofis-gorunumu` dalında)

## Global Constraints

- **Kullanıcının deposunda HEAD, dal, index (`.git/index`), stash ve ref'ler ASLA değişmez.** Index'e yazan her git komutu (`add`, `write-tree`, `read-tree`, `checkout-index`) `GIT_INDEX_FILE` ile uygulamaya ait bir index dosyasında çalışır; `commit`, `stash`, `reset`, `checkout <dal>`, `update-ref`, `gc`, `init` hiçbir yerde çağrılmaz. Otomatik `git init` YOK (spec §2).
- **Git yalnız `execFile("git", [...sabit argümanlar])` ile, `shell` seçeneği olmadan** çalışır; argümanlara yalnız doğrulanmış ağaç kimliği (`isTreeId`), doğrulanmış göreli yol (`isSafeRelPath`, `:(top,literal)` yol belirteciyle) ve git'in kendi verdiği önek girer. Ortamda `GIT_TERMINAL_PROMPT=0`, `GIT_OPTIONAL_LOCKS=0`; kullanıcının `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE` değişkenleri silinir. Komutların başında `-c core.fsmonitor=false -c core.quotepath=false`.
- **Renderer serbest yol gönderemez.** Ana süreç her IPC verisini doğrular: `workspaceId` `isBoardId` deseni + config'teki kayıtlı alan (`boardWorkspaceInfo`), kayıt kimliği `isBoardId`, dosya yolu `isSafeRelPath` **ve** yöneticide o kaydın o anki aralık listesinde olmalı; geri almada yazmadan hemen önce `insideRootReal` (sembolik bağ/junction ile kök dışına çıkış reddi).
- **Geri almadan önce `beforeRestore` görüntüsü alınır; alınamazsa hiçbir dosyaya dokunulmaz.** Sonradan eklenmiş dosya **kalıcı silinmez**, `shell.trashItem` ile çöpe taşınır. Yarıda kalan geri alma durur, o ana kadar yazılanları döndürür, kaydı `reverted` yapmaz.
- **Görüntü alma istemi ve pano dağıtımını bekletmez:** kancalar senkron döner, iş söz zincirinde (`void ….catch(() => {})`); kanca fırlatsa da izleyici girdiyi, pano istemi işler. Görüntü süre sınırı 20 sn (`SNAPSHOT_TIMEOUT_MS`).
- **Ana süreçte yakalanmamış istisna yok:** IPC işleyicileri, söz zincirleri, kancalar `try/catch`/`.catch` içinde; değişiklik yöneticisinin hatası izleyiciyi ve panoyu düşürmez.
- **Günlüğe dosya yolu, dosya içeriği, istem ya da etiket yazılmaz.** Yalnız `degisiklik.goruntu` (`sebep`: `istem`/`dagitim`/`elle`/`geriAlmaOncesi`, `sure` ms, `sonuc`: `tamam` ya da hata kodu) ve `degisiklik.geriAl` (`dosya` sayı, `sonuc`).
- Tasarım: **"daha fazla UI değil, daha güçlü hiyerarşi."** Lime (accent) **YALNIZ seçim**: seçili radyo (`bg-[var(--accent-glow)]`), seçili kayıt/dosya satırının çerçevesi (`border-accent-500/60`). **Yeni renk ya da jeton YOK:** eklenen satır `--status-success-{bg,text}`, silinen satır `--status-danger-{bg,text}`, uyarı `--status-warning-{bg,border,text}`. `--status-error-*` diye bir jeton YOK, uydurulmaz (kod yorumunda da yazılmaz). Ajan rengi mevcut `PANE_COLOR_VAR`. `src/changes/` altında hex (`#…`), `rgb(`/`hsl(`, Tailwind `lime-*` yok.
- **Mevcut davranış bozulmaz:** Ajan Alanı (izleyici, Kararlar, istem→oturum eşlemesi, "yazıyor" kilidi), Görev Panosu (dağıtım, `promptAborted`, doğrulama, `board:dropWorkspace`), Ofis görünümü, SAP yazma kapısı (`SapWriteGate`), kademe kuralları ve rol kapısı aynen kalır. Bölmeler Değişiklikler'deyken (Pano/Ofis gibi) gizlenir, sökülmez; gizli xterm odak almaz.
- **i18n:** her yeni metin aynı task'ta hem `src/i18n/tr.ts` hem `src/i18n/en.ts`'e (anahtar `changes.` önekiyle); `tests/i18n.test.ts` yer tutucu eşitliğini denetler.
- **Dosya adları:** yalnız harf büyüklüğüyle ayrışan iki dosya adı YASAK (Windows'ta aynı dosya). Bu plandaki adlar: `changesTypes.ts`, `changesLogic.ts`, `changesStore.ts`, `changesGit.ts`, `changesFs.ts`, `changesManager.ts`, `changesLive.ts` (ana/ortak); `src/changes/changesFormat.ts`, `src/changes/useChanges.ts`, `src/changes/changesFocus.tsx`, `src/changes/ChangesView.tsx`, `src/changes/DiffViewer.tsx`, `src/changes/RevertDialog.tsx`. Başka ad ekleme.
- better-sqlite3 vitest'te yüklenmiyor: değişiklik testleri `changesLive.ts`'i, `index.ts`'i, `axetHeadless.ts`'i ve `electron`'u İÇE AKTARMAZ. Electron'a dokunan tek dosya `changesLive.ts`.
- Komutlar: `npm run typecheck`, `npx vitest run <dosya>`; tam takım `npx vitest run > .superpowers/vitest-degisiklik.txt 2>&1` (çıktı dosyaya, sonra özeti oku).
- **Commit:** `git add` dosya dosya (asla `-A`/`.`); mesajın KONU satırı ASCII (Türkçe karakter yok); mesajın son satırı tam olarak `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Dal: `ozellik/degisiklikler` (`ozellik/ofis-gorunumu` üstünden açılmış olmalı; dal değiştirme).
- **Asla stage edilmez:** `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*`.
- **Düzenleme:** Windows'ta Git Bash heredoc'u ters eğik çizgiyi bozuyor; dosyaları Edit/Write araçlarıyla değiştir. **Prettier çalıştırma.** Kod yorumları tam Türkçe karakterle. Satır sonu dosyanın kendisininki.
- **Uygulamayı başlatma** (`npm run dev`, `npm start`, Electron yok); elle deneme listesi kullanıcıya verilir. ADT/SAP çağrısı yok. axet-code testlerde çalıştırılmaz.

## Review Focus

1. **Kullanıcının Git durumu hiçbir işlemden sonra değişmemeli:** görüntü, Canlı yoklaması, diff ve geri alma sonrasında `.git/index`'in baytları, `HEAD`, dal adı, `git stash list`, `git for-each-ref` ve `git status --porcelain` aynı kalmalı; kullanıcı kendi `git add`'iyle index'e aldığı değişikliği bizim geri almamızdan sonra da index'te görmeli. (Task 3 testleri "görüntü, diff ve geri yükleme kullanıcının index'ine, HEAD'ine, dalına, stash'ine, ref'lerine dokunmuyor", "kullanıcının index'e aldığı değişiklik geri yüklemeden sonra da index'te")
2. **Geri alma güvenlik ağı:** `beforeRestore` görüntüsü alınamazsa hiçbir dosyaya dokunulmamalı; bir dosya yazılamazsa işlem durmalı, o ana kadar yazılanlar listelenmeli, kayıt `reverted` olmamalı ve `beforeRestore` kaydının kendi **Geri al**'ı geri almayı geri alabilmeli. (Task 4 testleri "Geri al: beforeRestore alınamazsa…", "Geri al: bir dosya yazılamazsa…", "Geri al: önce beforeRestore…"; Task 3 testi "geri yükleme: değişen ve silinen dosya ağaçtaki hâline dönüyor…")
3. **Kök dışına çıkan ya da listede olmayan yol:** renderer `..`, mutlak yol, `C:` sürücüsü, ters eğik çizgi, `.git`, `:` (NTFS akışı) içeren ya da kaydın aralığında olmayan bir yol gönderirse reddedilmeli; kök içindeki bir junction dışarıyı gösteriyorsa yazma yapılmamalı. (Task 1 testi "isSafeRelPath…"; Task 3 testi "insideRootReal: junction ile dışarı çıkış reddediliyor…"; Task 4 testi "Geri al: onaylanan listede olup artık aralıkta olmayan atlanıyor…")
4. **Onay penceresi açıkken çalışma ağacı değişirse** (son kaydın aralığı çalışma ağacına kadar): yalnız kullanıcının onayladığı listedeki yollara dokunulmalı; listede olup artık aralıkta olmayan atlanmalı (`skipped`), sonradan değişen ama listede olmayan dosyaya hiç dokunulmamalı. (Task 4 testi "Geri al: onaylanan listede olup artık aralıkta olmayan atlanıyor…")
5. **Git deposu olmayan alan / git yok / kilitli index / takılan git:** istem ve pano dağıtımı beklememeli ve hata görmemeli; görünüm açık mesaj göstermeli, kilitte 3 deneme sonra uyarı satırı, 20 sn'de vazgeçme. (Task 3 testleri "index.lock: taze kilitte 3 deneme sonra locked…", "git yok: noGit…"; Task 4 testleri "depo değil / git yok…", "görüntü hatası (locked): uyarı satırı…"; Task 5 testleri "onPromptLine fırlatsa da okuyucu satırı alıyor", "onDispatched fırlatsa da dağıtım sürüyor")

## Spec'ten bilinçli sapmalar ve netleştirmeler

1. **Bütün karşılaştırmalar ağaç↔ağaç.** Spec §5 Canlı için `git diff <tree>` (ağaç↔çalışma ağacı) diyor; ama bu komut kullanıcının index'ine göre izlenmeyen yeni dosyaları göstermez (yanlış bilgi olurdu). Plan: Canlı ve "en sonuncusunda çalışma ağacına kadar" aralığı, aynı özel index'le o an alınan **kaydedilmeyen** taze bir ağaçla karşılaştırılıyor.
2. **Özel index kalıcı** (`checkpoints/<workspaceId>.index`): her görüntüde sıfırdan karma hesaplanmasın diye (`git add` stat önbelleğini kullanır). İlk kullanımda `git read-tree HEAD` ile tohumlanıyor (HEAD yoksa boş); izlenen ama `.gitignore`'a takılan dosyalar da böylece görüntüde. Bu dosya kullanıcının deposunda değil, uygulama veri klasöründe.
3. **Görüntü alan köküyle sınırlı:** `git add -A -- .` (alan kökü deponun alt klasörüyse yalnız orası) ve diff'te `--relative=<önek>`; yollar alan köküne göreli. Geri yüklemede `checkout-index` deponun kökünde, `önek + yol` ile çalışıyor.
4. **`Checkpoint.stats` eklendi** (`{ files, added, deleted }`): kaydın aralığı bir sonraki kayıt gelince sabitleniyor; istatistik o anda bir kez hesaplanıp saklanıyor ki liste her açılışta 200 diff çalıştırmasın. En son kaydın sayıları Canlı yoklamasından geliyor.
5. **Dağıtım görüntüsü `sendPrompt` "ok" döndükten hemen sonra** tetikleniyor (Enter 150 ms sonra yazılıyor, git süreci aynı turda başlıyor). Spec "yazılmadan hemen önce" diyor; önce tetiklenseydi yazma reddedildiğinde boş, yanlış etiketli bir kayıt kalırdı.
6. **İstem sayılmayan satırlar:** motor kapalıyken (`finished`, kabuk istemi ekranda) yazılan satır ve `/` ile başlayan motor komutu görüntü almıyor. Pano istemi `onInput`'tan geçmediği için (izleyici `submitLine`'ı doğrudan çağırıyor) dağıtımda çift görüntü yok.
7. **"Çalışan ajan" uyarısı alan düzeyinde:** ajanın hangi dosyaya yazdığı bilinmiyor; onay penceresi alandaki `running`/`asking` (kesin ya da tahmini) ajanların adlarını listeliyor.
8. **Çakışma taraması seçili kayıttan sonraki ilk 50 kayıtla sınırlı** (`CONFLICT_SCAN_MAX`; her biri bir diff). Daha fazla sonraki kaydı olan eski bir kayıtta liste eksik olabilir; pencere bunu açıkça söylüyor (`conflictsPartial` → "Sonraki kayıtların yalnız ilk 50'si tarandı…"). Sessizce eksik liste yok.
9. **Süresi dolmuş ağaç tespiti:** alan ilk yüklendiğinde arka planda bir kez bütün kayıtlar için (`cat-file -e`), sonra her aralık okunurken. Bulunamayan ağaç "süresi doldu" olarak işaretlenip yayınlanıyor.
10. **`index.lock`:** kilit uygulamaya ait index'in kilidi (`<index>.lock`); kullanıcının kendi git işlemi bizi kilitlemez ama spec'in 3 deneme kuralı aynen uygulanıyor (300 ms arayla). 60 sn'den eski kendi kilidimiz (çökmüş git'ten kalma) silinip devam ediliyor.
11. **Süre sınırı `execFile` `timeout` ile:** git tek süreç; `taskkill /T` gerekmiyor.
12. **`beforeRestore` kaydının etiketi geri alınan kaydın etiketi;** görünüm "Geri almadan önce · <etiket>" diye gösteriyor. "N bekliyor" sayısına `beforeRestore` kayıtları girmiyor.
13. **Elle geri alma noktası adsız** (`label: ""`, görünümde "Elle geri alma noktası"): ad sormak için ek pencere yok ("daha fazla UI değil").
14. **Alan kapatılınca kayıtlar da siliniyor** (`board:dropWorkspace` ile aynı onaylı yol): JSON + iki index dosyası. Ağaç nesneleri depoda kalır (git'in kendi `gc`'si).
15. **"Kabul et" yalnız `pending` kayıtta; "Geri al" `reverted` ve süresi dolmuş kayıtta kapalı.** Geri alınmış kaydı yeniden geri almak yerine `beforeRestore` kaydı kullanılır.
16. **10 task:** saf mantık (1), depo (2), git katmanı (3), yönetici (4), kancalar (5), IPC (6), renderer veri katmanı (7), görünüm + geçiş (8), Kabul et/Geri al + pano bağlantısı (9), rehber + doğrulama (10). 7 ve 8 ayrı, çünkü 8 mevcut `TerminalMode`/`TeamStrip` davranışına dokunuyor.

## Dosya yapısı

| Dosya | Sorumluluk | Task |
|---|---|---|
| `app-electron/shared/changesTypes.ts` (yeni) | Türler, sınırlar | 1 |
| `app-electron/shared/changesLogic.ts` (yeni) | Saf: aralık, yol doğrulama, diff ayrıştırma/kırpma, 30 sn kuralı, 200 sınırı, sıralı kuyruk | 1 |
| `app-electron/main/changesStore.ts` (yeni) | Kayıt dosyası okuma/yazma, bozuk dosya, silme, index dosya yolları | 2 |
| `app-electron/main/changesGit.ts` (yeni) | Gerçek git: yoklama, görüntü, ağaç↔ağaç diff, dosya diff, geri yükleme | 3 |
| `app-electron/main/changesFs.ts` (yeni) | `insideRootReal` (gerçek yol ile kök denetimi) | 3 |
| `app-electron/main/changesManager.ts` (yeni) | Yönetici: kancalar, kuyruk, aralık, Kabul et, Geri al | 4 |
| `app-electron/main/agentMonitor.ts`, `app-electron/main/boardManager.ts` | `onPromptLine`, `onDispatched` kancaları | 5 |
| `app-electron/main/changesLive.ts` (yeni) | Canlı bağımlılıklar (`shell.trashItem`, `userData`) — test edilmez | 6 |
| `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts` | IPC, kancaların bağlanması, kapanış | 6 |
| `src/changes/changesFormat.ts`, `src/changes/useChanges.ts`, `src/changes/changesFocus.tsx` (yeni) | Saf görünüm yardımcıları, durum kancası, pano→görünüm odak bağlamı | 7 |
| `app-electron/shared/types.ts`, `app-electron/shared/terminalLayout.ts` | `WorkspaceView`'e `"changes"` | 8 |
| `src/changes/ChangesView.tsx`, `src/changes/DiffViewer.tsx` (yeni), `src/agents/TeamStrip.tsx`, `src/terminal/TerminalMode.tsx` | Görünüm, diff, dört seçenekli geçiş | 8 |
| `src/changes/RevertDialog.tsx` (yeni), `src/changes/ChangesView.tsx`, `src/board/BoardDetailPanel.tsx` | Kabul et, Geri al, pano bağlantısı | 9 |
| `src/i18n/{tr,en}.ts` | `changes.*` metinleri | 7, 8, 9 |
| `KULLANIM-REHBERI.md` | "Değişiklikler" alt bölümü | 10 |
| `tests/changesLogic.test.ts`, `tests/changesStore.test.ts`, `tests/changesGit.test.ts`, `tests/changesManager.test.ts`, `tests/changesHooks.test.ts`, `tests/changesIpcWiring.test.ts`, `tests/changesFormat.test.tsx`, `tests/changesView.test.tsx`, `tests/changesRevert.test.tsx` (yeni) | Testler | 1–9 |
| `tests/boardManager.test.ts`, `tests/officeScreen.test.tsx` | Pano kancası testi; dört seçenekli geçiş beklentisi | 5, 8 |

---

### Task 1: Türler ve saf mantık — aralık, yol doğrulama, diff ayrıştırma, 30 sn kuralı, 200 sınırı, sıralı kuyruk

**Files:**
- Create: `app-electron/shared/changesTypes.ts`
- Create: `app-electron/shared/changesLogic.ts`
- Test: `tests/changesLogic.test.ts`

**Interfaces:**
- Consumes: yok (yalnız TypeScript).
- Produces (sonraki bütün task'lar bu adları kullanır):

```ts
// changesTypes.ts
export type CheckpointReason = "prompt" | "dispatch" | "manual" | "beforeRestore";
export type ReviewState = "pending" | "accepted" | "reverted";
export const CHECKPOINT_REASONS: readonly CheckpointReason[];
export const REVIEW_STATES: readonly ReviewState[];
export interface RangeStats { files: number; added: number; deleted: number }
export interface Checkpoint { id: string; workspaceId: string; tree: string; createdAt: number; reason: CheckpointReason; paneId: string | null; agentName: string | null; subtaskId: string | null; label: string; reviewed: ReviewState; stats?: RangeStats }
export type FileStatus = "added" | "modified" | "deleted";
export interface FileChange { path: string; status: FileStatus; added: number; deleted: number; binary: boolean }
export type RepoStatus = "unknown" | "ok" | "notRepo" | "noGit" | "missingDir";
export type ChangesFailure = "invalid" | "noWorkspace" | "notRepo" | "noGit" | "missingDir" | "notFound" | "expired" | "locked" | "timeout" | "git" | "notInRange" | "snapshotFailed" | "writeFailed" | "busy";
export const CHANGES_FAILURES: readonly ChangesFailure[];
export interface ChangesWarning { code: ChangesFailure; at: number }
export interface ChangesState { workspaceId: string; repo: RepoStatus; checkpoints: Checkpoint[]; expired: string[]; warning?: ChangesWarning; recoveredFrom?: string; unreadable?: boolean }
export type DiffLineKind = "hunk" | "context" | "add" | "del";
export interface DiffLine { kind: DiffLineKind; oldNo: number | null; newNo: number | null; text: string }
export type FileDiff = { kind: "text"; lines: DiffLine[]; truncated: boolean } | { kind: "binary" } | { kind: "large" };
export type SnapshotResult = { ok: true; id: string } | { ok: false; reason: ChangesFailure };
export type RangeResult = { ok: true; files: FileChange[]; truncated: boolean; toWorkingTree: boolean; noCheckpoint?: boolean } | { ok: false; reason: ChangesFailure };
export type DiffResult = { ok: true; diff: FileDiff } | { ok: false; reason: ChangesFailure };
export type ChangesCommandResult = { ok: true } | { ok: false; reason: ChangesFailure };
export interface RevertConflict { id: string; label: string; agentName: string | null; reason: CheckpointReason }
export interface RevertPlan { files: FileChange[]; conflicts: RevertConflict[]; conflictsPartial: boolean; runningAgents: string[] }
export type PrepareRevertResult = { ok: true; plan: RevertPlan } | { ok: false; reason: ChangesFailure };
export interface RevertResult { ok: boolean; reason?: ChangesFailure; restored: string[]; trashed: string[]; skipped: string[]; failedPath?: string; beforeRestoreId?: string }
export const MAX_CHECKPOINTS = 200, LABEL_MAX = 80, PROMPT_THROTTLE_MS = 30_000, SNAPSHOT_TIMEOUT_MS = 20_000, GIT_TIMEOUT_MS = 20_000,
  DIFF_MAX_BYTES = 2 * 1024 * 1024, LARGE_FILE_BYTES = 200 * 1024, MAX_DIFF_LINES = 20_000, LIVE_POLL_MS = 3_000, LOCK_RETRIES = 3,
  LOCK_RETRY_MS = 300, STALE_LOCK_MS = 60_000, CONFLICT_SCAN_MAX = 50, REVERT_PATHS_MAX = 5_000, PATH_MAX = 1_000;   // (her biri ayrı export const)

// changesLogic.ts
export function isTreeId(value: unknown): value is string;                  // 40 ya da 64 küçük hex
export function labelOf(text: string): string;                              // boşluk tekleştir, ≤ 80 kod noktası
export function shouldSnapshotPrompt(lastAt: number | undefined, now: number): boolean;
export function capCheckpoints(list: readonly Checkpoint[]): Checkpoint[];  // en yeni 200
export interface CheckpointRange { from: Checkpoint; to: Checkpoint | null; index: number }
export function rangeOf(list: readonly Checkpoint[], id: string): CheckpointRange | null;
export function laterCheckpoints(list: readonly Checkpoint[], id: string, max?: number): Checkpoint[];
export function pendingCount(list: readonly Checkpoint[]): number;          // beforeRestore sayılmaz
export function isSafeRelPath(value: unknown): value is string;
export function readRevertPaths(raw: unknown): string[] | null;
export function parseNameStatusZ(out: string): { path: string; status: FileStatus }[];
export function parseNumstatZ(out: string): Map<string, { added: number; deleted: number; binary: boolean }>;
export function mergeChanges(names: readonly { path: string; status: FileStatus }[], stats: ReadonlyMap<string, { added: number; deleted: number; binary: boolean }>): FileChange[];
export function statsOf(files: readonly FileChange[]): RangeStats;
export function parseUnifiedDiff(patch: string, inputTruncated: boolean): { lines: DiffLine[]; truncated: boolean };
export interface KeyedQueue { run<T>(key: string, job: () => Promise<T>): Promise<T>; idle(key: string): boolean }
export function createKeyedQueue(): KeyedQueue;
```

- [ ] **Step 1: Kırmızı test** — `tests/changesLogic.test.ts`

```ts
// Değişiklikler: saf mantık (spec 2026-10-18 degisiklikler §3, §4, §6, §7, §9).
import { describe, expect, it } from "vitest";
import {
  capCheckpoints,
  createKeyedQueue,
  isSafeRelPath,
  isTreeId,
  labelOf,
  laterCheckpoints,
  mergeChanges,
  parseNameStatusZ,
  parseNumstatZ,
  parseUnifiedDiff,
  pendingCount,
  rangeOf,
  readRevertPaths,
  shouldSnapshotPrompt,
  statsOf
} from "../app-electron/shared/changesLogic";
import { MAX_CHECKPOINTS, MAX_DIFF_LINES, PROMPT_THROTTLE_MS, type Checkpoint } from "../app-electron/shared/changesTypes";

const tree = (n: number) => n.toString(16).padStart(40, "0");
const cp = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "w1",
  tree: tree(n),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: `istem ${id}`,
  reviewed: "pending",
  ...over
});

describe("isTreeId", () => {
  it("40 ya da 64 küçük hex; başka her şey değil", () => {
    expect(isTreeId("a".repeat(40))).toBe(true);
    expect(isTreeId("0".repeat(64))).toBe(true);
    for (const raw of ["A".repeat(40), "a".repeat(39), "a".repeat(41), "g".repeat(40), "", 5, null, `${"a".repeat(40)}\n`]) {
      expect(isTreeId(raw)).toBe(false);
    }
  });
});

describe("labelOf", () => {
  it("boşluklar tekleşiyor, kırpılıyor, 80 kod noktası; vekil çift bölünmüyor", () => {
    expect(labelOf("  merhaba \n\t dünya  ")).toBe("merhaba dünya");
    expect(labelOf("x".repeat(200))).toHaveLength(80);
    const emoji = "😀".repeat(100);
    expect(Array.from(labelOf(emoji))).toHaveLength(80);
    expect(labelOf(emoji).endsWith("😀")).toBe(true);
  });
});

describe("shouldSnapshotPrompt (spec §4.2)", () => {
  it("ilk istem; 30 sn içinde ikinci yok; 30 sn'de var; saat geri giderse var", () => {
    expect(shouldSnapshotPrompt(undefined, 1_000)).toBe(true);
    expect(shouldSnapshotPrompt(1_000, 1_000 + PROMPT_THROTTLE_MS - 1)).toBe(false);
    expect(shouldSnapshotPrompt(1_000, 1_000 + PROMPT_THROTTLE_MS)).toBe(true);
    expect(shouldSnapshotPrompt(50_000, 10_000)).toBe(true);
  });
});

describe("kayıt listesi", () => {
  it("capCheckpoints: en yeni 200 kalıyor, sıra korunuyor", () => {
    const list = Array.from({ length: MAX_CHECKPOINTS + 5 }, (_, i) => cp(`c${i}`, i + 1));
    const capped = capCheckpoints(list);
    expect(capped).toHaveLength(MAX_CHECKPOINTS);
    expect(capped[0].id).toBe("c5");
    expect(capped.at(-1)?.id).toBe(`c${MAX_CHECKPOINTS + 4}`);
    expect(capCheckpoints([cp("a", 1)])).toEqual([cp("a", 1)]);
  });

  it("rangeOf: kayıt → sonraki kayıt; sonuncusu çalışma ağacına (to null); bilinmeyen null", () => {
    const list = [cp("a", 1), cp("b", 2), cp("c", 3)];
    expect(rangeOf(list, "a")).toEqual({ from: list[0], to: list[1], index: 0 });
    expect(rangeOf(list, "c")).toEqual({ from: list[2], to: null, index: 2 });
    expect(rangeOf(list, "x")).toBeNull();
  });

  it("laterCheckpoints: seçiliden sonrakiler, en çok max", () => {
    const list = [cp("a", 1), cp("b", 2), cp("c", 3), cp("d", 4)];
    expect(laterCheckpoints(list, "a").map((c) => c.id)).toEqual(["b", "c", "d"]);
    expect(laterCheckpoints(list, "a", 2).map((c) => c.id)).toEqual(["b", "c"]);
    expect(laterCheckpoints(list, "d")).toEqual([]);
    expect(laterCheckpoints(list, "x")).toEqual([]);
  });

  it("pendingCount: yalnız pending; beforeRestore sayılmıyor", () => {
    const list = [cp("a", 1), cp("b", 2, { reviewed: "accepted" }), cp("c", 3, { reason: "beforeRestore" }), cp("d", 4, { reviewed: "reverted" }), cp("e", 5)];
    expect(pendingCount(list)).toBe(2);
  });
});

describe("isSafeRelPath / readRevertPaths (spec §6.4, §7)", () => {
  it("git'in göreli yolu kabul; kök dışı, mutlak, sürücü, ters eğik çizgi, .git, NTFS akışı, denetim karakteri reddediliyor", () => {
    for (const ok of ["a.txt", "src/app.ts", "klasör/çğüşöı.md", "a b/c d.txt", ".github/workflows/x.yml", "dosya.git"]) {
      expect(isSafeRelPath(ok), ok).toBe(true);
    }
    for (const bad of ["", "../x", "a/../../x", "a/./b", "./a", "/etc/passwd", "C:/x", "c:x", "a\\b", ".git/config", "a/.GIT/hooks/x", "GIT~1/config", "a:b", "a//b", "a/", "a\u0000b", "a\nb", "x".repeat(1_001), 5, null]) {
      expect(isSafeRelPath(bad), String(bad)).toBe(false);
    }
  });

  it("readRevertPaths: dizi, boş değil, ≤ 5000, hepsi güvenli; tekrarlar tekleşiyor", () => {
    expect(readRevertPaths(["a.txt", "b/c.ts", "a.txt"])).toEqual(["a.txt", "b/c.ts"]);
    expect(readRevertPaths([])).toBeNull();
    expect(readRevertPaths("a.txt")).toBeNull();
    expect(readRevertPaths(["a.txt", "../x"])).toBeNull();
    expect(readRevertPaths(Array.from({ length: 5_001 }, (_, i) => `f${i}`))).toBeNull();
    // Seyrek dizinin deliği undefined sayılıyor (atlanmıyor).
    // eslint-disable-next-line no-sparse-arrays
    expect(readRevertPaths(["a.txt", , "b.txt"])).toBeNull();
  });
});

describe("diff-tree çıktısı ayrıştırma", () => {
  it("name-status -z: A/M/D/T; T değişti sayılıyor; kırpılmış son kayıt atılıyor", () => {
    expect(parseNameStatusZ("A\0yeni.txt\0M\0src/a.ts\0D\0eski.md\0T\0bag\0")).toEqual([
      { path: "yeni.txt", status: "added" },
      { path: "src/a.ts", status: "modified" },
      { path: "eski.md", status: "deleted" },
      { path: "bag", status: "modified" }
    ]);
    expect(parseNameStatusZ("M\0a.ts\0A\0yar")).toEqual([{ path: "a.ts", status: "modified" }]);
    expect(parseNameStatusZ("")).toEqual([]);
  });

  it("numstat -z: sayılar, ikili (- -), sekmeli yol; kırpılmış son kayıt atılıyor", () => {
    const map = parseNumstatZ("3\t1\tsrc/a.ts\0-\t-\tlogo.png\0" + "0\t2\tsekme\tli.txt\0" + "5\t5\tya");
    expect(map.get("src/a.ts")).toEqual({ added: 3, deleted: 1, binary: false });
    expect(map.get("logo.png")).toEqual({ added: 0, deleted: 0, binary: true });
    expect(map.get("sekme\tli.txt")).toEqual({ added: 0, deleted: 2, binary: false });
    expect(map.has("ya")).toBe(false);
  });

  it("mergeChanges: yola göre sıralı; sayısı olmayan dosya 0/0; statsOf toplamı", () => {
    const files = mergeChanges(
      [
        { path: "b.ts", status: "modified" },
        { path: "a.png", status: "added" },
        { path: "c.md", status: "deleted" }
      ],
      new Map([
        ["b.ts", { added: 4, deleted: 2, binary: false }],
        ["a.png", { added: 0, deleted: 0, binary: true }]
      ])
    );
    expect(files.map((f) => f.path)).toEqual(["a.png", "b.ts", "c.md"]);
    expect(files[0]).toEqual({ path: "a.png", status: "added", added: 0, deleted: 0, binary: true });
    expect(files[2]).toEqual({ path: "c.md", status: "deleted", added: 0, deleted: 0, binary: false });
    expect(statsOf(files)).toEqual({ files: 3, added: 4, deleted: 2 });
  });
});

describe("parseUnifiedDiff (spec §5: satır numaralı)", () => {
  const patch = [
    "diff --git a/a.ts b/a.ts",
    "index 1111111..2222222 100644",
    "--- a/a.ts",
    "+++ b/a.ts",
    "@@ -1,3 +1,4 @@ function x()",
    " bir",
    "-iki",
    "+İKİ",
    "+iki buçuk",
    " üç\r",
    "@@ -10,2 +11,2 @@",
    " on",
    "-on bir",
    "\\ No newline at end of file",
    "+on bir!",
    ""
  ].join("\n");

  it("başlık atlanıyor; hunk, bağlam, eklenen, silinen satır numaralarıyla; CR ve 'No newline' atılıyor", () => {
    const { lines, truncated } = parseUnifiedDiff(patch, false);
    expect(truncated).toBe(false);
    expect(lines.map((l) => [l.kind, l.oldNo, l.newNo, l.text])).toEqual([
      ["hunk", null, null, "@@ -1,3 +1,4 @@ function x()"],
      ["context", 1, 1, "bir"],
      ["del", 2, null, "iki"],
      ["add", null, 2, "İKİ"],
      ["add", null, 3, "iki buçuk"],
      ["context", 3, 4, "üç"],
      ["hunk", null, null, "@@ -10,2 +11,2 @@"],
      ["context", 10, 11, "on"],
      ["del", 11, null, "on bir"],
      ["add", null, 12, "on bir!"]
    ]);
  });

  it("kırpılmış girdi: yarım son satır atılıyor ve truncated", () => {
    const cut = patch.slice(0, patch.indexOf("+iki buçuk") + 5);
    const { lines, truncated } = parseUnifiedDiff(cut, true);
    expect(truncated).toBe(true);
    expect(lines.at(-1)).toEqual({ kind: "add", oldNo: null, newNo: 2, text: "İKİ" });
  });

  it(`${MAX_DIFF_LINES} satırdan sonrası kesiliyor ve truncated`, () => {
    const body = Array.from({ length: MAX_DIFF_LINES + 10 }, (_, i) => `+s${i}`).join("\n");
    const { lines, truncated } = parseUnifiedDiff(`@@ -0,0 +1,${MAX_DIFF_LINES + 10} @@\n${body}\n`, false);
    expect(lines).toHaveLength(MAX_DIFF_LINES);
    expect(truncated).toBe(true);
  });
});

describe("createKeyedQueue (spec §7: aynı alanda sıralı)", () => {
  it("aynı anahtar sıralı, farklı anahtar paralel; hata zinciri kırmıyor; idle", async () => {
    const q = createKeyedQueue();
    const order: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const first = q.run("w1", async () => {
      order.push("1 başladı");
      await gate;
      order.push("1 bitti");
      throw new Error("patladı");
    });
    const second = q.run("w1", async () => {
      order.push("2");
      return 2;
    });
    const other = q.run("w2", async () => {
      order.push("başka alan");
      return "w2";
    });
    await other;
    expect(order).toEqual(["1 başladı", "başka alan"]);
    expect(q.idle("w1")).toBe(false);
    release();
    await expect(first).rejects.toThrow("patladı");
    await expect(second).resolves.toBe(2);
    expect(order).toEqual(["1 başladı", "başka alan", "1 bitti", "2"]);
    await new Promise((r) => setTimeout(r, 0));
    expect(q.idle("w1")).toBe(true);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesLogic.test.ts`
Expected: FAIL — `changesLogic` ve `changesTypes` modülleri yok.

- [ ] **Step 3: Türler** — `app-electron/shared/changesTypes.ts`

```ts
// Değişiklikler görünümünün türleri ve sınırları (spec 2026-10-18 degisiklikler
// §3–§8). Ana süreç, preload ve renderer aynı türleri kullanıyor.

export type CheckpointReason = "prompt" | "dispatch" | "manual" | "beforeRestore";
export type ReviewState = "pending" | "accepted" | "reverted";

export const CHECKPOINT_REASONS: readonly CheckpointReason[] = ["prompt", "dispatch", "manual", "beforeRestore"];
export const REVIEW_STATES: readonly ReviewState[] = ["pending", "accepted", "reverted"];

/** Kaydın aralığı (bu kayıt → sonraki kayıt) kapanınca bir kez hesaplanıp saklanıyor. */
export interface RangeStats {
  files: number;
  added: number;
  deleted: number;
}

export interface Checkpoint {
  id: string;
  workspaceId: string;
  /** `git write-tree` sonucu. */
  tree: string;
  createdAt: number;
  reason: CheckpointReason;
  paneId: string | null;
  /** O anki bölme adı; sonradan değişse de kayıt tarihî. */
  agentName: string | null;
  subtaskId: string | null;
  /** İstemin ilk 80 karakteri, alt görev başlığı ya da boş (elle). */
  label: string;
  reviewed: ReviewState;
  stats?: RangeStats;
}

export type FileStatus = "added" | "modified" | "deleted";

export interface FileChange {
  /** Alan köküne göre, "/" ayraçlı. */
  path: string;
  status: FileStatus;
  added: number;
  deleted: number;
  binary: boolean;
}

export type RepoStatus = "unknown" | "ok" | "notRepo" | "noGit" | "missingDir";

export type ChangesFailure =
  | "invalid"
  | "noWorkspace"
  | "notRepo"
  | "noGit"
  | "missingDir"
  | "notFound"
  | "expired"
  | "locked"
  | "timeout"
  | "git"
  | "notInRange"
  | "snapshotFailed"
  | "writeFailed"
  | "busy";

export const CHANGES_FAILURES: readonly ChangesFailure[] = [
  "invalid",
  "noWorkspace",
  "notRepo",
  "noGit",
  "missingDir",
  "notFound",
  "expired",
  "locked",
  "timeout",
  "git",
  "notInRange",
  "snapshotFailed",
  "writeFailed",
  "busy"
];

/** Son görüntü alma hatası (görünümdeki uyarı satırı); başarılı görüntü siler. */
export interface ChangesWarning {
  code: ChangesFailure;
  at: number;
}

export interface ChangesState {
  workspaceId: string;
  repo: RepoStatus;
  /** Eskiden yeniye. */
  checkpoints: Checkpoint[];
  /** Ağacı bulunamayan (git gc) kayıtların kimlikleri. */
  expired: string[];
  warning?: ChangesWarning;
  recoveredFrom?: string;
  unreadable?: boolean;
}

export type DiffLineKind = "hunk" | "context" | "add" | "del";

export interface DiffLine {
  kind: DiffLineKind;
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

export type FileDiff = { kind: "text"; lines: DiffLine[]; truncated: boolean } | { kind: "binary" } | { kind: "large" };

export type SnapshotResult = { ok: true; id: string } | { ok: false; reason: ChangesFailure };
export type RangeResult =
  | { ok: true; files: FileChange[]; truncated: boolean; toWorkingTree: boolean; noCheckpoint?: boolean }
  | { ok: false; reason: ChangesFailure };
export type DiffResult = { ok: true; diff: FileDiff } | { ok: false; reason: ChangesFailure };
export type ChangesCommandResult = { ok: true } | { ok: false; reason: ChangesFailure };

export interface RevertConflict {
  id: string;
  label: string;
  agentName: string | null;
  reason: CheckpointReason;
}

export interface RevertPlan {
  files: FileChange[];
  /** Aralığı bu dosyalara dokunan sonraki kayıtlar (spec §6.1). */
  conflicts: RevertConflict[];
  /** Sonraki kayıtların hepsi taranmadı (en çok CONFLICT_SCAN_MAX). */
  conflictsPartial: boolean;
  /** Alanda şu an çalışan ya da soru soran ajanlar (spec §6.6). */
  runningAgents: string[];
}

export type PrepareRevertResult = { ok: true; plan: RevertPlan } | { ok: false; reason: ChangesFailure };

export interface RevertResult {
  ok: boolean;
  reason?: ChangesFailure;
  restored: string[];
  trashed: string[];
  /** Onaylanan listede olup artık aralıkta olmayan (ya da zaten olmayan eklenmiş) yollar. */
  skipped: string[];
  failedPath?: string;
  beforeRestoreId?: string;
}

export const MAX_CHECKPOINTS = 200;
export const LABEL_MAX = 80;
export const PROMPT_THROTTLE_MS = 30_000;
export const SNAPSHOT_TIMEOUT_MS = 20_000;
export const GIT_TIMEOUT_MS = 20_000;
export const DIFF_MAX_BYTES = 2 * 1024 * 1024;
export const LARGE_FILE_BYTES = 200 * 1024;
export const MAX_DIFF_LINES = 20_000;
export const LIVE_POLL_MS = 3_000;
export const LOCK_RETRIES = 3;
export const LOCK_RETRY_MS = 300;
export const STALE_LOCK_MS = 60_000;
export const CONFLICT_SCAN_MAX = 50;
export const REVERT_PATHS_MAX = 5_000;
export const PATH_MAX = 1_000;
```

- [ ] **Step 4: Saf mantık** — `app-electron/shared/changesLogic.ts`

```ts
// Değişiklikler görünümünün saf mantığı (spec 2026-10-18 degisiklikler §3–§7).
// Dosya sistemi, git ve Electron yok; ana süreç ve renderer ortak kullanıyor.
import {
  CONFLICT_SCAN_MAX,
  LABEL_MAX,
  MAX_CHECKPOINTS,
  MAX_DIFF_LINES,
  PATH_MAX,
  PROMPT_THROTTLE_MS,
  REVERT_PATHS_MAX,
  type Checkpoint,
  type DiffLine,
  type FileChange,
  type FileStatus,
  type RangeStats
} from "./changesTypes";

const TREE = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/** `git write-tree` çıktısı: SHA-1 (40) ya da SHA-256 (64) küçük hex. */
export function isTreeId(value: unknown): value is string {
  return typeof value === "string" && TREE.test(value);
}

/** Etiket: boşluklar tekleşiyor, en çok 80 kod noktası (vekil çift bölünmüyor). */
export function labelOf(text: string): string {
  return Array.from(text.replace(/\s+/g, " ").trim()).slice(0, LABEL_MAX).join("");
}

/** Aynı ajan için 30 sn içinde ikinci istem görüntüsü yok (spec §4.2). Saat geri gittiyse izin. */
export function shouldSnapshotPrompt(lastAt: number | undefined, now: number): boolean {
  return lastAt === undefined || now < lastAt || now - lastAt >= PROMPT_THROTTLE_MS;
}

/** En yeni 200 kayıt (spec §3); liste eskiden yeniye. */
export function capCheckpoints(list: readonly Checkpoint[]): Checkpoint[] {
  return list.length > MAX_CHECKPOINTS ? list.slice(list.length - MAX_CHECKPOINTS) : [...list];
}

export interface CheckpointRange {
  from: Checkpoint;
  /** null: en sonuncusu, çalışma ağacına kadar (spec §5). */
  to: Checkpoint | null;
  index: number;
}

export function rangeOf(list: readonly Checkpoint[], id: string): CheckpointRange | null {
  const index = list.findIndex((c) => c.id === id);
  if (index < 0) return null;
  return { from: list[index], to: list[index + 1] ?? null, index };
}

export function laterCheckpoints(list: readonly Checkpoint[], id: string, max = CONFLICT_SCAN_MAX): Checkpoint[] {
  const index = list.findIndex((c) => c.id === id);
  return index < 0 ? [] : list.slice(index + 1, index + 1 + max);
}

/** "N bekliyor" (spec §5): geri alma öncesi güvenlik kayıtları sayılmıyor. */
export function pendingCount(list: readonly Checkpoint[]): number {
  return list.filter((c) => c.reviewed === "pending" && c.reason !== "beforeRestore").length;
}

/**
 * Git'in verdiği, alan köküne göre yol mu (spec §6.4, §7). Kök dışı (`..`),
 * mutlak, sürücü harfli, ters eğik çizgili, `.git` (ve 8.3 kısa adı), NTFS
 * akışı (`:`), boş/`.` parça ve denetim karakteri reddediliyor.
 */
export function isSafeRelPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > PATH_MAX) return false;
  if (/[\u0000-\u001f\u007f\\:]/.test(value)) return false;
  if (value.startsWith("/")) return false;
  return value.split("/").every((part) => part !== "" && part !== "." && part !== ".." && part.toLowerCase() !== ".git" && !/^git~\d+$/i.test(part));
}

/** Geri alınacak yollar (IPC): dizi, boş değil, ≤ 5000, hepsi güvenli; tekrarlar tekleşiyor. */
export function readRevertPaths(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > REVERT_PATHS_MAX) return null;
  // Array.from seyrek dizinin deliklerini undefined yapıyor (every deliği atlardı).
  const items = Array.from(raw as unknown[]);
  if (!items.every(isSafeRelPath)) return null;
  return [...new Set(items as string[])];
}

/** `-z` çıktısının yalnız tamamlanmış kayıtları: kırpılmış son kayıt atılıyor. */
function completeZ(out: string): string {
  return out.endsWith("\0") ? out : out.slice(0, out.lastIndexOf("\0") + 1);
}

/** `git diff-tree -r --no-renames --name-status -z` çıktısı. */
export function parseNameStatusZ(out: string): { path: string; status: FileStatus }[] {
  const parts = completeZ(out).split("\0");
  const result: { path: string; status: FileStatus }[] = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const code = parts[i];
    const path = parts[i + 1];
    if (!code || !path) break;
    result.push({ path, status: code[0] === "A" ? "added" : code[0] === "D" ? "deleted" : "modified" });
  }
  return result;
}

/** `git diff-tree -r --no-renames --numstat -z` çıktısı; ikili dosya "-\t-". */
export function parseNumstatZ(out: string): Map<string, { added: number; deleted: number; binary: boolean }> {
  const map = new Map<string, { added: number; deleted: number; binary: boolean }>();
  for (const entry of completeZ(out).split("\0")) {
    const match = /^(\d+|-)\t(\d+|-)\t([\s\S]+)$/.exec(entry);
    if (!match) continue;
    const binary = match[1] === "-" && match[2] === "-";
    map.set(match[3], { added: binary ? 0 : Number(match[1]), deleted: binary ? 0 : Number(match[2]), binary });
  }
  return map;
}

export function mergeChanges(
  names: readonly { path: string; status: FileStatus }[],
  stats: ReadonlyMap<string, { added: number; deleted: number; binary: boolean }>
): FileChange[] {
  return names
    .map((n) => ({ path: n.path, status: n.status, ...(stats.get(n.path) ?? { added: 0, deleted: 0, binary: false }) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export function statsOf(files: readonly FileChange[]): RangeStats {
  return files.reduce<RangeStats>((s, f) => ({ files: s.files + 1, added: s.added + f.added, deleted: s.deleted + f.deleted }), { files: 0, added: 0, deleted: 0 });
}

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Tek dosyanın birleşik diff'i → satır numaralı satırlar (spec §5). Başlık
 * satırları atlanıyor; "\ No newline at end of file" ve satır sonu CR'si
 * gösterilmiyor. Kırpılmış girdinin yarım son satırı atılıyor; en çok
 * MAX_DIFF_LINES satır.
 */
export function parseUnifiedDiff(patch: string, inputTruncated: boolean): { lines: DiffLine[]; truncated: boolean } {
  const raw = patch.split("\n");
  if (inputTruncated || raw[raw.length - 1] === "") raw.pop();
  const lines: DiffLine[] = [];
  let oldNo = 0;
  let newNo = 0;
  let inHunk = false;
  for (const rawLine of raw) {
    if (lines.length >= MAX_DIFF_LINES) return { lines, truncated: true };
    const text = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    const hunk = HUNK.exec(text);
    if (hunk) {
      oldNo = Number(hunk[1]);
      newNo = Number(hunk[2]);
      inHunk = true;
      lines.push({ kind: "hunk", oldNo: null, newNo: null, text });
      continue;
    }
    if (text.startsWith("diff --git ")) {
      inHunk = false;
      continue;
    }
    if (!inHunk) continue;
    const sign = text[0];
    if (sign === "+") lines.push({ kind: "add", oldNo: null, newNo: newNo++, text: text.slice(1) });
    else if (sign === "-") lines.push({ kind: "del", oldNo: oldNo++, newNo: null, text: text.slice(1) });
    else if (sign === " ") lines.push({ kind: "context", oldNo: oldNo++, newNo: newNo++, text: text.slice(1) });
  }
  return { lines, truncated: inputTruncated };
}

export interface KeyedQueue {
  run<T>(key: string, job: () => Promise<T>): Promise<T>;
  idle(key: string): boolean;
}

/** Aynı anahtarda işler sırayla (spec §7: aynı alanda eşzamanlı iki git işlemi yok). */
export function createKeyedQueue(): KeyedQueue {
  const tails = new Map<string, Promise<void>>();
  return {
    run<T>(key: string, job: () => Promise<T>): Promise<T> {
      const prev = tails.get(key) ?? Promise.resolve();
      // Önceki işin hatası zinciri kırmıyor.
      const next = prev.then(job, job);
      const tail = next.then(
        () => undefined,
        () => undefined
      );
      tails.set(key, tail);
      void tail.then(() => {
        if (tails.get(key) === tail) tails.delete(key);
      });
      return next;
    },
    idle(key: string): boolean {
      return !tails.has(key);
    }
  };
}
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/changesLogic.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/shared/changesTypes.ts app-electron/shared/changesLogic.ts tests/changesLogic.test.ts
git commit -m "Degisiklikler: turler ve saf mantik (aralik, yol dogrulama, diff ayristirma)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Kayıt deposu — `checkpoints/<workspaceId>.json`, 200 sınırı, bozuk dosya

**Files:**
- Create: `app-electron/main/changesStore.ts`
- Test: `tests/changesStore.test.ts`

**Interfaces:**
- Consumes: `isBoardId` (`app-electron/shared/boardCommands.ts`); Task 1'den `isTreeId`, `capCheckpoints`, `Checkpoint`, `CHECKPOINT_REASONS`, `REVIEW_STATES`, `LABEL_MAX`.
- Produces:

```ts
export interface CheckpointFileResult { checkpoints: Checkpoint[]; recoveredFrom?: string; unreadable?: boolean }
export function checkpointFile(dir: string, workspaceId: string): string | null;     // <dir>/<id>.json
export function privateIndexFile(dir: string, workspaceId: string): string | null;   // <dir>/<id>.index
export function restoreIndexFile(dir: string, workspaceId: string): string | null;   // <dir>/<id>.restore.index
export function readCheckpoints(raw: unknown, workspaceId: string): Checkpoint[] | null;
export function readCheckpointFile(dir: string, workspaceId: string, now: number): CheckpointFileResult;
export function writeCheckpointFile(dir: string, workspaceId: string, list: readonly Checkpoint[]): boolean;
export function deleteCheckpointFiles(dir: string, workspaceId: string): void;
```

- [ ] **Step 1: Kırmızı test** — `tests/changesStore.test.ts`

```ts
// Değişiklikler: kayıt deposu (spec 2026-10-18 degisiklikler §3, §8). Gerçek geçici klasör.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkpointFile,
  deleteCheckpointFiles,
  privateIndexFile,
  readCheckpointFile,
  readCheckpoints,
  restoreIndexFile,
  writeCheckpointFile
} from "../app-electron/main/changesStore";
import { MAX_CHECKPOINTS, type Checkpoint } from "../app-electron/shared/changesTypes";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "degisiklik-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const WS = "3f2a1c9e-1b2c-4d5e-8f90-123456789abc";
const tree = (n: number) => n.toString(16).padStart(40, "0");
const cp = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: WS,
  tree: tree(n),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: "testleri düzelt",
  reviewed: "pending",
  ...over
});

describe("dosya yolları", () => {
  it("geçerli kimlik klasörün içinde; yol parçası reddediliyor", () => {
    expect(checkpointFile(dir, WS)).toBe(path.join(dir, `${WS}.json`));
    expect(privateIndexFile(dir, WS)).toBe(path.join(dir, `${WS}.index`));
    expect(restoreIndexFile(dir, WS)).toBe(path.join(dir, `${WS}.restore.index`));
    for (const bad of ["../x", "a/b", "a\\b", "", "x".repeat(101)]) {
      expect(checkpointFile(dir, bad)).toBeNull();
      expect(privateIndexFile(dir, bad)).toBeNull();
      expect(restoreIndexFile(dir, bad)).toBeNull();
    }
  });
});

describe("readCheckpoints", () => {
  it("bozuk öğe atlanıyor; başka alanın kaydı, tekrar kimlik, geçersiz ağaç atlanıyor; tarihe göre sıralı", () => {
    const list = readCheckpoints(
      {
        checkpoints: [
          cp("b", 20),
          cp("a", 10, { stats: { files: 2, added: 5, deleted: 1 } }),
          cp("a", 11),
          { ...cp("x", 12), workspaceId: "baska" },
          { ...cp("y", 13), tree: "kirik" },
          { ...cp("z", 14), reason: "salon" },
          { ...cp("w", 15), reviewed: "belki" },
          null,
          "metin"
        ]
      },
      WS
    );
    expect(list?.map((c) => c.id)).toEqual(["a", "b"]);
    expect(list?.[0].stats).toEqual({ files: 2, added: 5, deleted: 1 });
  });

  it("alanlar sınırlanıyor: etiket 80, ajan adı 60; bozuk pane/subtask null; bozuk stats atılıyor", () => {
    const [c] = readCheckpoints(
      {
        checkpoints: [
          { ...cp("a", 1), label: "x".repeat(300), agentName: "y".repeat(300), paneId: 5, subtaskId: "../x", stats: { files: -1, added: 1, deleted: 1 } }
        ]
      },
      WS
    )!;
    expect(c.label).toHaveLength(80);
    expect(c.agentName).toHaveLength(60);
    expect(c.paneId).toBeNull();
    expect(c.subtaskId).toBeNull();
    expect("stats" in c).toBe(false);
  });

  it("200'den fazlası: en yeni 200 kalıyor", () => {
    const list = readCheckpoints({ checkpoints: Array.from({ length: MAX_CHECKPOINTS + 3 }, (_, i) => cp(`c${i}`, i + 1)) }, WS)!;
    expect(list).toHaveLength(MAX_CHECKPOINTS);
    expect(list[0].id).toBe("c3");
  });

  it("yapı bozuksa null", () => {
    for (const raw of [null, [], "x", { checkpoints: "x" }, {}]) expect(readCheckpoints(raw, WS)).toBeNull();
  });
});

describe("dosya", () => {
  it("gidiş-dönüş; yazma atomik (.tmp kalmıyor); dosya yoksa boş", () => {
    expect(readCheckpointFile(dir, WS, 1)).toEqual({ checkpoints: [] });
    const list = [cp("a", 1), cp("b", 2, { reason: "dispatch", subtaskId: "s1", paneId: "p2", reviewed: "accepted" })];
    expect(writeCheckpointFile(dir, WS, list)).toBe(true);
    expect(readCheckpointFile(dir, WS, 1)).toEqual({ checkpoints: list });
    expect(readdirSync(dir).filter((n) => n.endsWith(".tmp"))).toEqual([]);
    expect(JSON.parse(readFileSync(checkpointFile(dir, WS)!, "utf-8")).version).toBe(1);
  });

  it("BOM'lu dosya okunuyor", () => {
    writeFileSync(checkpointFile(dir, WS)!, `﻿${JSON.stringify({ checkpoints: [cp("a", 1)] })}`, "utf-8");
    expect(readCheckpointFile(dir, WS, 1).checkpoints.map((c) => c.id)).toEqual(["a"]);
  });

  it("JSON değilse .bozuk-<zaman> olarak kenara alınıyor, boş liste + recoveredFrom (sessizce silinmiyor)", () => {
    writeFileSync(checkpointFile(dir, WS)!, "{bozuk", "utf-8");
    const result = readCheckpointFile(dir, WS, 777);
    expect(result).toEqual({ checkpoints: [], recoveredFrom: `${WS}.json.bozuk-777` });
    expect(readFileSync(path.join(dir, `${WS}.json.bozuk-777`), "utf-8")).toBe("{bozuk");
    expect(existsSync(checkpointFile(dir, WS)!)).toBe(false);
  });

  it("geçersiz kimlikle yazma yapılmıyor", () => {
    expect(writeCheckpointFile(dir, "../x", [cp("a", 1)])).toBe(false);
  });

  it("silme: json + iki index dosyası; olmayan dosya hata vermiyor", () => {
    writeCheckpointFile(dir, WS, [cp("a", 1)]);
    writeFileSync(privateIndexFile(dir, WS)!, "x");
    writeFileSync(restoreIndexFile(dir, WS)!, "x");
    deleteCheckpointFiles(dir, WS);
    expect(readdirSync(dir)).toEqual([]);
    expect(() => deleteCheckpointFiles(dir, WS)).not.toThrow();
    expect(() => deleteCheckpointFiles(dir, "../x")).not.toThrow();
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesStore.test.ts`
Expected: FAIL — `changesStore` modülü yok.

- [ ] **Step 3: Depo** — `app-electron/main/changesStore.ts`

```ts
// Değişiklik kayıtlarının diskteki evi (spec 2026-10-18 degisiklikler §3, §8):
// `userData/checkpoints/<workspaceId>.json` ve aynı klasörde uygulamaya ait
// iki index dosyası (`.index` görüntü için, `.restore.index` geri alma için).
// Kullanıcının deposuna dosya yazılmıyor. Görev Panosu deposu kalıbı: bozuk
// öğe atlanıyor; dosyanın tamamı bozuksa SESSİZCE ezilmiyor, `.bozuk-<zaman>`
// olarak kenara alınıyor; yazma atomik (önce .tmp, sonra rename).
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isBoardId } from "../shared/boardCommands";
import { capCheckpoints, isTreeId } from "../shared/changesLogic";
import {
  CHECKPOINT_REASONS,
  LABEL_MAX,
  REVIEW_STATES,
  type Checkpoint,
  type CheckpointReason,
  type RangeStats,
  type ReviewState
} from "../shared/changesTypes";

export interface CheckpointFileResult {
  checkpoints: Checkpoint[];
  recoveredFrom?: string;
  /** Okunamadı ve kenara da alınamadı: çağıran bu dosyanın üzerine yazmamalı. */
  unreadable?: boolean;
}

const AGENT_NAME_MAX = 60;

function fileFor(dir: string, workspaceId: string, suffix: string): string | null {
  return isBoardId(workspaceId) ? path.join(dir, `${workspaceId}${suffix}`) : null;
}

export function checkpointFile(dir: string, workspaceId: string): string | null {
  return fileFor(dir, workspaceId, ".json");
}

export function privateIndexFile(dir: string, workspaceId: string): string | null {
  return fileFor(dir, workspaceId, ".index");
}

export function restoreIndexFile(dir: string, workspaceId: string): string | null {
  return fileFor(dir, workspaceId, ".restore.index");
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readStats(raw: unknown): RangeStats | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const files = count(r.files);
  const added = count(r.added);
  const deleted = count(r.deleted);
  return files === null || added === null || deleted === null ? undefined : { files, added, deleted };
}

function readCheckpoint(raw: unknown, workspaceId: string): Checkpoint | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isBoardId(r.id) || r.workspaceId !== workspaceId || !isTreeId(r.tree)) return null;
  if (typeof r.createdAt !== "number" || !Number.isFinite(r.createdAt)) return null;
  if (!(CHECKPOINT_REASONS as readonly unknown[]).includes(r.reason)) return null;
  if (!(REVIEW_STATES as readonly unknown[]).includes(r.reviewed)) return null;
  const checkpoint: Checkpoint = {
    id: r.id,
    workspaceId,
    tree: r.tree,
    createdAt: r.createdAt,
    reason: r.reason as CheckpointReason,
    paneId: isBoardId(r.paneId) ? r.paneId : null,
    agentName: typeof r.agentName === "string" ? r.agentName.slice(0, AGENT_NAME_MAX) : null,
    subtaskId: isBoardId(r.subtaskId) ? r.subtaskId : null,
    label: typeof r.label === "string" ? Array.from(r.label).slice(0, LABEL_MAX).join("") : "",
    reviewed: r.reviewed as ReviewState
  };
  const stats = readStats(r.stats);
  if (stats) checkpoint.stats = stats;
  return checkpoint;
}

/** Dosyanın tamamı: `{ checkpoints: [...] }`. Yapı bozuksa null (çağıran kenara alıyor). */
export function readCheckpoints(raw: unknown, workspaceId: string): Checkpoint[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const list = (raw as Record<string, unknown>).checkpoints;
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const result: Checkpoint[] = [];
  for (const item of list as unknown[]) {
    const checkpoint = readCheckpoint(item, workspaceId);
    if (!checkpoint || seen.has(checkpoint.id)) continue;
    seen.add(checkpoint.id);
    result.push(checkpoint);
  }
  // Array.prototype.sort kararlı: aynı zamanlı kayıtlar dosyadaki sırasını koruyor.
  result.sort((a, b) => a.createdAt - b.createdAt);
  return capCheckpoints(result);
}

export function readCheckpointFile(dir: string, workspaceId: string, now: number): CheckpointFileResult {
  const file = checkpointFile(dir, workspaceId);
  if (!file || !existsSync(file)) return { checkpoints: [] };
  let checkpoints: Checkpoint[] | null = null;
  try {
    checkpoints = readCheckpoints(JSON.parse(readFileSync(file, "utf-8").replace(/^﻿/, "")), workspaceId);
  } catch {
    checkpoints = null;
  }
  if (checkpoints) return { checkpoints };
  // Bozuk ya da okunamıyor: veri sessizce silinmiyor (spec §8).
  const backup = `${file}.bozuk-${now}`;
  try {
    renameSync(file, backup);
    return { checkpoints: [], recoveredFrom: path.basename(backup) };
  } catch {
    return { checkpoints: [], unreadable: true };
  }
}

export function writeCheckpointFile(dir: string, workspaceId: string, list: readonly Checkpoint[]): boolean {
  const file = checkpointFile(dir, workspaceId);
  if (!file) return false;
  const tmp = `${file}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmp, JSON.stringify({ version: 1, checkpoints: list }, null, 2), "utf-8");
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

/** Alan kapatıldı (spec sapma 14): kayıtlar ve iki index dosyası. */
export function deleteCheckpointFiles(dir: string, workspaceId: string): void {
  for (const file of [checkpointFile(dir, workspaceId), privateIndexFile(dir, workspaceId), restoreIndexFile(dir, workspaceId)]) {
    if (!file) continue;
    try {
      if (existsSync(file)) unlinkSync(file);
    } catch {
      // silinemeyen dosya öksüz kalır; veri kaybından iyidir
    }
  }
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/changesStore.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/main/changesStore.ts tests/changesStore.test.ts
git commit -m "Degisiklikler: kayit deposu (200 sinir, bozuk dosya kenara)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Git katmanı — yoklama, görüntü, ağaç↔ağaç diff, dosya diff, geri yükleme; kök denetimi

**Files:**
- Create: `app-electron/main/changesGit.ts`
- Create: `app-electron/main/changesFs.ts`
- Test: `tests/changesGit.test.ts`

**Interfaces:**
- Consumes: Task 1'den `isTreeId`, `parseNameStatusZ`, `parseNumstatZ`, `mergeChanges`, `parseUnifiedDiff`, `isSafeRelPath` ve sabitler (`GIT_TIMEOUT_MS`, `DIFF_MAX_BYTES`, `LARGE_FILE_BYTES`, `LOCK_RETRIES`, `LOCK_RETRY_MS`, `STALE_LOCK_MS`).
- Produces:

```ts
// changesGit.ts
export interface GitResult { ok: boolean; code: number | null; stdout: string; stderr: string; timedOut: boolean; tooBig: boolean; missing: boolean }
export interface GitRunOptions { cwd: string; indexFile?: string; timeoutMs: number; maxBuffer?: number }
export type GitRun = (args: readonly string[], opts: GitRunOptions) => Promise<GitResult>;
export const GIT_BASE_ARGS: readonly string[];                 // ["-c", "core.fsmonitor=false", "-c", "core.quotepath=false"]
export function gitEnv(indexFile?: string): NodeJS.ProcessEnv;
export const runGitDefault: GitRun;
export type ProbeResult = { ok: true; top: string; prefix: string } | { ok: false; reason: "notRepo" | "noGit" | "git" | "timeout" };
export type SnapshotOutcome = { ok: true; tree: string } | { ok: false; reason: "noGit" | "locked" | "timeout" | "git" };
export type TreesDiff = { ok: true; files: FileChange[]; truncated: boolean } | { ok: false; reason: "git" | "timeout" };
export interface GitPort {
  probe(cwd: string): Promise<ProbeResult>;
  snapshot(cwd: string, indexFile: string, timeoutMs: number): Promise<SnapshotOutcome>;
  treeExists(cwd: string, tree: string): Promise<boolean>;
  diffTrees(cwd: string, prefix: string, a: string, b: string): Promise<TreesDiff>;
  fileDiff(cwd: string, prefix: string, a: string, b: string, change: FileChange): Promise<FileDiff | null>;
  loadIndex(top: string, indexFile: string, tree: string): Promise<boolean>;
  restoreFile(top: string, indexFile: string, fullPath: string): Promise<boolean>;
  discardIndex(indexFile: string): void;
}
export interface GitPortDeps { run: GitRun; sleep(ms: number): Promise<void>; now(): number }
export function createGitPort(deps?: Partial<GitPortDeps>): GitPort;

// changesFs.ts
export function isWithin(root: string, target: string): boolean;
export function insideRootReal(root: string, rel: string): boolean;
```

Notlar (uygulayıcı için):
- `cwd` alan kökü; `top` deponun kökü (`rev-parse --show-toplevel`, ileri eğik çizgili); `prefix` alan kökünün depodaki öneki (`--show-prefix`, boş ya da `/` ile biten). Diff yolları `--relative=<prefix>` ile alan köküne göreli; ağaçtaki tam yol `prefix + path`.
- Yol belirteci her zaman `:(top,literal)<prefix><path>` — `*`, `?` ya da `[` içeren dosya adı başka dosyalarla eşleşmesin.
- Görüntü: özel index ilk kez kullanılıyorsa `read-tree HEAD` ile tohumlanıyor (HEAD yoksa sonuç yok sayılıyor), sonra `add -A -- .` + `write-tree`. `add` `index.lock` hatasıyla düşerse `LOCK_RETRY_MS` arayla toplam `LOCK_RETRIES` deneme; sonra `locked`. Kendi kilidimiz (`<index>.lock`) `STALE_LOCK_MS`'ten eskiyse silinip başlanıyor.

- [ ] **Step 1: Kırmızı test** — `tests/changesGit.test.ts`

```ts
// Değişiklikler: git katmanı (spec 2026-10-18 degisiklikler §2, §6, §7, §9).
// Geçici klasörde GERÇEK bir test deposu. `git` PATH'te yoksa gerçek depo
// testleri atlanıyor ve sebebi yazılıyor; sahte koşucuyla olanlar her zaman çalışıyor.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGitPort, gitEnv, type GitResult, type GitRun } from "../app-electron/main/changesGit";
import { insideRootReal, isWithin } from "../app-electron/main/changesFs";
import { LARGE_FILE_BYTES, LOCK_RETRIES, type FileChange } from "../app-electron/shared/changesTypes";

function gitAvailable(): boolean {
  try {
    execFileSync("git", ["--version"], { windowsHide: true, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const HAS_GIT = gitAvailable();
if (!HAS_GIT) console.warn("[changesGit.test] git PATH'te yok: gerçek depo testleri atlanıyor");

let base = "";
let repo = "";
let indexFile = "";
beforeEach(() => {
  base = mkdtempSync(path.join(os.tmpdir(), "degisiklik-git-"));
  repo = path.join(base, "depo");
  mkdirSync(repo);
  indexFile = path.join(base, "veri", "w1.index");
  mkdirSync(path.dirname(indexFile));
});
afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

/** Kullanıcının kendi git komutu (bizim ortamımız değil). */
function g(...args: string[]): string {
  return execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], {
    cwd: repo,
    windowsHide: true,
    encoding: "utf8"
  });
}
function write(rel: string, content: string | Buffer) {
  const file = path.join(repo, ...rel.split("/"));
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}
function read(rel: string): string {
  return readFileSync(path.join(repo, ...rel.split("/")), "utf8");
}
function initRepo() {
  g("init", "-q", "-b", "ana");
  g("config", "core.autocrlf", "false");
  write(".gitignore", "gizli.log\n");
  write("a.txt", "bir\niki\nüç\n");
  write("src/b.ts", "export const b = 1;\n");
  write("sil.md", "silinecek\n");
  g("add", "-A");
  g("commit", "-q", "-m", "ilk");
}
/** Kullanıcının bakış açısından deponun bütün durumu. */
function userState() {
  return {
    index: createHash("sha256").update(readFileSync(path.join(repo, ".git", "index"))).digest("hex"),
    head: g("rev-parse", "HEAD").trim(),
    branch: g("symbolic-ref", "HEAD").trim(),
    stash: g("stash", "list"),
    refs: g("for-each-ref"),
    status: g("--no-optional-locks", "status", "--porcelain=v1", "-uall")
  };
}
const byPath = (files: FileChange[]) => Object.fromEntries(files.map((f) => [f.path, f]));

describe.skipIf(!HAS_GIT)("gerçek depo", () => {
  it("probe: depo kökü önek boş; alt klasör öneki; depo olmayan klasör notRepo", async () => {
    initRepo();
    const port = createGitPort();
    const root = await port.probe(repo);
    expect(root.ok && root.prefix).toBe("");
    expect(root.ok && path.resolve(root.top)).toBe(path.resolve(repo));
    const sub = await port.probe(path.join(repo, "src"));
    expect(sub.ok && sub.prefix).toBe("src/");
    const outside = path.join(base, "duz");
    mkdirSync(outside);
    expect(await port.probe(outside)).toEqual({ ok: false, reason: "notRepo" });
  });

  it("görüntü: izlenmeyen yeni dosya dahil, .gitignore'daki hariç; durumlar, sayılar, ikili", async () => {
    initRepo();
    const port = createGitPort();
    const first = await port.snapshot(repo, indexFile, 20_000);
    expect(first.ok).toBe(true);
    write("a.txt", "bir\nİKİ\nüç\ndört\n");
    write("yeni/c.txt", "yeni dosya\n");
    write("gizli.log", "görünmemeli\n");
    write("resim.bin", Buffer.from([0, 1, 2, 0, 255]));
    rmSync(path.join(repo, "sil.md"));
    const second = await port.snapshot(repo, indexFile, 20_000);
    if (!first.ok || !second.ok) throw new Error("görüntü alınamadı");
    const diff = await port.diffTrees(repo, "", first.tree, second.tree);
    if (!diff.ok) throw new Error("diff alınamadı");
    const files = byPath(diff.files);
    expect(Object.keys(files).sort()).toEqual(["a.txt", "resim.bin", "sil.md", "yeni/c.txt"]);
    expect(files["a.txt"]).toMatchObject({ status: "modified", added: 2, deleted: 1, binary: false });
    expect(files["yeni/c.txt"]).toMatchObject({ status: "added", added: 1, deleted: 0 });
    expect(files["sil.md"]).toMatchObject({ status: "deleted", deleted: 1 });
    expect(files["resim.bin"]).toMatchObject({ status: "added", binary: true });
    expect(diff.truncated).toBe(false);
    // Değişiklik yoksa aynı ağaç.
    const third = await port.snapshot(repo, indexFile, 20_000);
    expect(third.ok && third.tree).toBe(second.tree);
  });

  it("görüntü, diff ve geri yükleme kullanıcının index'ine, HEAD'ine, dalına, stash'ine, ref'lerine dokunmuyor", async () => {
    initRepo();
    write("a.txt", "kullanıcının değişikliği\n");
    g("stash", "push", "-q", "-m", "kullanıcının stash'i");
    write("src/b.ts", "export const b = 2;\n");
    g("add", "src/b.ts");
    write("yeni.txt", "izlenmeyen\n");
    const before = userState();
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    write("yeni.txt", "ajan değiştirdi\n");
    const two = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok || !two.ok) throw new Error("görüntü alınamadı");
    await port.diffTrees(repo, "", one.tree, two.tree);
    await port.fileDiff(repo, "", one.tree, two.tree, { path: "yeni.txt", status: "modified", added: 1, deleted: 1, binary: false });
    const restoreIndex = path.join(base, "veri", "w1.restore.index");
    expect(await port.loadIndex(repo, restoreIndex, one.tree)).toBe(true);
    expect(await port.restoreFile(repo, restoreIndex, "yeni.txt")).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("yeni.txt")).toBe("izlenmeyen\n");
    expect(userState()).toEqual(before);
    expect(existsSync(restoreIndex)).toBe(false);
  });

  it("kullanıcının index'e aldığı değişiklik geri yüklemeden sonra da index'te", async () => {
    initRepo();
    write("src/b.ts", "export const b = 3;\n");
    g("add", "src/b.ts");
    const staged = g("diff", "--cached", "--name-only");
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    write("src/b.ts", "export const b = 4;\n");
    if (!one.ok) throw new Error("görüntü alınamadı");
    const restoreIndex = path.join(base, "veri", "r.index");
    await port.loadIndex(repo, restoreIndex, one.tree);
    expect(await port.restoreFile(repo, restoreIndex, "src/b.ts")).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("src/b.ts")).toBe("export const b = 3;\n");
    expect(g("diff", "--cached", "--name-only")).toBe(staged);
  });

  it("geri yükleme: değişen ve silinen dosya ağaçtaki hâline dönüyor; alt klasör öneki ile", async () => {
    initRepo();
    const root = path.join(repo, "src");
    const port = createGitPort();
    const probe = await port.probe(root);
    if (!probe.ok) throw new Error("probe");
    const subIndex = path.join(base, "veri", "alt.index");
    const one = await port.snapshot(root, subIndex, 20_000);
    write("src/b.ts", "değişti\n");
    write("src/c.ts", "yeni\n");
    write("a.txt", "kök dışı değişiklik\n");
    const two = await port.snapshot(root, subIndex, 20_000);
    if (!one.ok || !two.ok) throw new Error("görüntü");
    const diff = await port.diffTrees(root, probe.prefix, one.tree, two.tree);
    if (!diff.ok) throw new Error("diff");
    // Kök dışındaki a.txt görünmüyor; yollar alan köküne göreli.
    expect(diff.files.map((f) => [f.path, f.status])).toEqual([
      ["b.ts", "modified"],
      ["c.ts", "added"]
    ]);
    const restoreIndex = path.join(base, "veri", "alt.restore.index");
    expect(await port.loadIndex(probe.top, restoreIndex, one.tree)).toBe(true);
    expect(await port.restoreFile(probe.top, restoreIndex, `${probe.prefix}b.ts`)).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("src/b.ts")).toBe("export const b = 1;\n");
    // Silinen dosya geri geliyor.
    rmSync(path.join(repo, "src", "b.ts"));
    await port.loadIndex(probe.top, restoreIndex, one.tree);
    expect(await port.restoreFile(probe.top, restoreIndex, `${probe.prefix}b.ts`)).toBe(true);
    port.discardIndex(restoreIndex);
    expect(read("src/b.ts")).toBe("export const b = 1;\n");
  });

  it("dosya diff'i: satır numaralı metin; ikili; 200 KB üstü büyük; adında [1] olan dosya yalnız kendisi", async () => {
    initRepo();
    write("köşeli[1].txt", "a\n");
    write("köşeli1.txt", "x\n");
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    write("a.txt", "bir\nİKİ\nüç\n");
    write("büyük.txt", "x".repeat(LARGE_FILE_BYTES + 1));
    write("köşeli[1].txt", "b\n");
    write("köşeli1.txt", "y\n");
    const two = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok || !two.ok) throw new Error("görüntü");
    const text = await port.fileDiff(repo, "", one.tree, two.tree, { path: "a.txt", status: "modified", added: 1, deleted: 1, binary: false });
    expect(text?.kind).toBe("text");
    if (text?.kind !== "text") throw new Error("metin değil");
    expect(text.lines.filter((l) => l.kind !== "context").map((l) => [l.kind, l.oldNo, l.newNo, l.text])).toEqual([
      ["hunk", null, null, "@@ -1,3 +1,3 @@"],
      ["del", 2, null, "iki"],
      ["add", null, 2, "İKİ"]
    ]);
    expect(await port.fileDiff(repo, "", one.tree, two.tree, { path: "resim.bin", status: "added", added: 0, deleted: 0, binary: true })).toEqual({ kind: "binary" });
    expect(await port.fileDiff(repo, "", one.tree, two.tree, { path: "büyük.txt", status: "added", added: 1, deleted: 0, binary: false })).toEqual({ kind: "large" });
    const star = await port.fileDiff(repo, "", one.tree, two.tree, { path: "köşeli[1].txt", status: "modified", added: 1, deleted: 1, binary: false });
    if (star?.kind !== "text") throw new Error("metin değil");
    expect(star.lines.filter((l) => l.kind === "add").map((l) => l.text)).toEqual(["b"]);
  });

  it("treeExists: var olan ağaç true, uydurma ağaç false", async () => {
    initRepo();
    const port = createGitPort();
    const one = await port.snapshot(repo, indexFile, 20_000);
    if (!one.ok) throw new Error("görüntü");
    expect(await port.treeExists(repo, one.tree)).toBe(true);
    expect(await port.treeExists(repo, "1".repeat(40))).toBe(false);
  });

  it("index.lock: taze kilitte 3 deneme sonra locked; 60 sn'den eski kendi kilidimiz siliniyor", async () => {
    initRepo();
    const sleeps: number[] = [];
    const port = createGitPort({ sleep: async (ms) => void sleeps.push(ms) });
    writeFileSync(`${indexFile}.lock`, "");
    expect(await port.snapshot(repo, indexFile, 20_000)).toEqual({ ok: false, reason: "locked" });
    expect(sleeps).toHaveLength(LOCK_RETRIES - 1);
    const old = (Date.now() - 120_000) / 1000;
    utimesSync(`${indexFile}.lock`, old, old);
    const result = await port.snapshot(repo, indexFile, 20_000);
    expect(result.ok).toBe(true);
    expect(existsSync(`${indexFile}.lock`)).toBe(false);
  });
});

describe("sahte koşucu", () => {
  const result = (over: Partial<GitResult> = {}): GitResult => ({ ok: true, code: 0, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false, ...over });

  it("git yok: probe ve snapshot noGit", async () => {
    const run: GitRun = async () => result({ ok: false, code: null, missing: true });
    const port = createGitPort({ run });
    expect(await port.probe("C:/x")).toEqual({ ok: false, reason: "noGit" });
    expect(await port.snapshot("C:/x", path.join(os.tmpdir(), "yok.index"), 20_000)).toEqual({ ok: false, reason: "noGit" });
  });

  it("süre aşımı: timeout; 'dubious ownership' notRepo değil git", async () => {
    const port = createGitPort({ run: async () => result({ ok: false, code: null, timedOut: true }) });
    expect(await port.probe("C:/x")).toEqual({ ok: false, reason: "timeout" });
    expect(await port.snapshot("C:/x", path.join(os.tmpdir(), "yok.index"), 20_000)).toEqual({ ok: false, reason: "timeout" });
    const dubious = createGitPort({ run: async () => result({ ok: false, code: 128, stderr: "fatal: detected dubious ownership in repository" }) });
    expect(await dubious.probe("C:/x")).toEqual({ ok: false, reason: "git" });
  });

  it("her çağrı sabit önek argümanları ve özel index ortamıyla; kabuk yok", async () => {
    const calls: { args: readonly string[]; indexFile?: string }[] = [];
    const run: GitRun = async (args, opts) => {
      calls.push({ args, indexFile: opts.indexFile });
      if (args[0] === "write-tree") return result({ stdout: `${"a".repeat(40)}\n` });
      return result();
    };
    const port = createGitPort({ run });
    const idx = path.join(os.tmpdir(), `yok-${process.pid}.index`);
    expect(await port.snapshot("C:/x", idx, 20_000)).toEqual({ ok: true, tree: "a".repeat(40) });
    expect(calls.map((c) => c.args.join(" "))).toEqual(["read-tree HEAD", "add -A -- .", "write-tree"]);
    expect(calls.every((c) => c.indexFile === idx)).toBe(true);
  });

  it("gitEnv: kullanıcının GIT_DIR/GIT_WORK_TREE/GIT_INDEX_FILE'ı siliniyor; istem ve isteğe bağlı kilit kapalı", () => {
    const saved = { ...process.env };
    process.env.GIT_DIR = "C:/baska";
    process.env.GIT_WORK_TREE = "C:/baska";
    process.env.GIT_INDEX_FILE = "C:/baska/index";
    try {
      const env = gitEnv();
      expect(env.GIT_DIR).toBeUndefined();
      expect(env.GIT_WORK_TREE).toBeUndefined();
      expect(env.GIT_INDEX_FILE).toBeUndefined();
      expect(env.GIT_TERMINAL_PROMPT).toBe("0");
      expect(env.GIT_OPTIONAL_LOCKS).toBe("0");
      expect(gitEnv("C:/veri/w.index").GIT_INDEX_FILE).toBe("C:/veri/w.index");
    } finally {
      process.env = saved;
    }
  });
});

describe("insideRootReal (spec §6.4)", () => {
  it("kök içi var olan ve olmayan yol kabul; .. ve mutlak reddediliyor", () => {
    const root = path.join(base, "kok");
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "a.ts"), "");
    expect(insideRootReal(root, "src/a.ts")).toBe(true);
    expect(insideRootReal(root, "yeni/klasor/dosya.txt")).toBe(true);
    expect(insideRootReal(root, "../disari.txt")).toBe(false);
    expect(insideRootReal(root, "C:/Windows/x")).toBe(false);
    expect(insideRootReal(path.join(base, "olmayan-kok"), "a.txt")).toBe(false);
  });

  it("junction ile dışarı çıkış reddediliyor", () => {
    const root = path.join(base, "kok");
    const outside = path.join(base, "disari");
    mkdirSync(root);
    mkdirSync(outside);
    writeFileSync(path.join(outside, "gizli.txt"), "");
    symlinkSync(outside, path.join(root, "kopru"), "junction");
    expect(insideRootReal(root, "kopru/gizli.txt")).toBe(false);
    expect(insideRootReal(root, "kopru/yeni.txt")).toBe(false);
  });

  it("isWithin: kök kendisi ve altı içeride; kardeş ve ..lı ad dışarıda değil yanlış sayılmıyor", () => {
    const root = path.join(base, "kok");
    expect(isWithin(root, root)).toBe(true);
    expect(isWithin(root, path.join(root, "a", "b"))).toBe(true);
    expect(isWithin(root, path.join(root, "..kok2"))).toBe(true);
    expect(isWithin(root, path.join(base, "kok2"))).toBe(false);
  });
});
```

Notlar: `"..kok2"` kökün altında `..` ile BAŞLAYAN bir klasör adı; dışarıda sayılmamalı. Junction Windows'ta yönetici hakkı istemez; diğer platformda `"junction"` türü yok sayılır ve dizin bağı oluşur.

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesGit.test.ts`
Expected: FAIL — `changesGit` ve `changesFs` modülleri yok.

- [ ] **Step 3: Kök denetimi** — `app-electron/main/changesFs.ts`

```ts
// Değişiklikler: yazmadan hemen önce yolun gerçekten alan kökünün içinde
// olduğu denetimi (spec 2026-10-18 degisiklikler §6.4). Sembolik bağ ya da
// junction ile dışarı çıkış reddediliyor: var olan en yakın ata (dosyanın
// kendisi dahil) gerçek yoluyla karşılaştırılıyor.
import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";
import { isSafeRelPath } from "../shared/changesLogic";

export function isWithin(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  if (rel === "") return true;
  if (path.isAbsolute(rel)) return false;
  return rel.split(path.sep)[0] !== "..";
}

function exists(p: string): boolean {
  try {
    lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

export function insideRootReal(root: string, rel: string): boolean {
  if (!isSafeRelPath(rel)) return false;
  try {
    const realRoot = realpathSync.native(root);
    let current = path.resolve(root, ...rel.split("/"));
    while (!exists(current)) {
      const parent = path.dirname(current);
      if (parent === current) return false;
      current = parent;
    }
    // Sarkan bağda realpath fırlatır: dışarı sayılır.
    return isWithin(realRoot, realpathSync.native(current));
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Git katmanı** — `app-electron/main/changesGit.ts`

```ts
// Değişiklikler görünümünün git katmanı (spec 2026-10-18 degisiklikler §2, §6, §7).
//
// Kurallar:
//   - Git yalnız execFile + sabit argümanla, kabuksuz. Argümana yalnız
//     doğrulanmış ağaç kimliği, `:(top,literal)` belirteçli doğrulanmış yol ve
//     git'in kendi verdiği önek giriyor.
//   - Kullanıcının index'i, HEAD'i, dalı, stash'i ve ref'leri DEĞİŞMEZ: index'e
//     yazan her komut GIT_INDEX_FILE ile uygulamaya ait bir dosyada çalışıyor;
//     ağaç ve blob yalnız nesne veritabanına gidiyor.
//   - Hiçbir yol hata fırlatmıyor; sonuç her zaman bir değer.
import { execFile } from "node:child_process";
import { existsSync, statSync, unlinkSync } from "node:fs";
import { isTreeId, mergeChanges, parseNameStatusZ, parseNumstatZ, parseUnifiedDiff } from "../shared/changesLogic";
import {
  DIFF_MAX_BYTES,
  GIT_TIMEOUT_MS,
  LARGE_FILE_BYTES,
  LOCK_RETRIES,
  LOCK_RETRY_MS,
  STALE_LOCK_MS,
  type FileChange,
  type FileDiff
} from "../shared/changesTypes";

export interface GitResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Çıktı maxBuffer'ı aştı; stdout o ana kadarki kısım. */
  tooBig: boolean;
  /** git bulunamadı (ENOENT). */
  missing: boolean;
}

export interface GitRunOptions {
  cwd: string;
  indexFile?: string;
  timeoutMs: number;
  maxBuffer?: number;
}

export type GitRun = (args: readonly string[], opts: GitRunOptions) => Promise<GitResult>;

/** fsmonitor arka plan süreci başlatılmasın; yollar tırnaklanmasın. */
export const GIT_BASE_ARGS: readonly string[] = ["-c", "core.fsmonitor=false", "-c", "core.quotepath=false"];

export function gitEnv(indexFile?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0" };
  // Kullanıcının ortamındaki yönlendirmeler bizim komutlarımıza karışmasın.
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  if (indexFile) env.GIT_INDEX_FILE = indexFile;
  return env;
}

export const runGitDefault: GitRun = (args, opts) =>
  new Promise<GitResult>((resolve) => {
    try {
      execFile(
        "git",
        [...GIT_BASE_ARGS, ...args],
        {
          cwd: opts.cwd,
          env: gitEnv(opts.indexFile),
          timeout: opts.timeoutMs,
          windowsHide: true,
          maxBuffer: opts.maxBuffer ?? DIFF_MAX_BYTES,
          encoding: "utf8"
        },
        (err, stdout, stderr) => {
          const e = err as (Error & { code?: unknown; killed?: boolean }) | null;
          const missing = e?.code === "ENOENT";
          const tooBig = e?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
          resolve({
            ok: !e,
            code: !e ? 0 : typeof e.code === "number" ? e.code : null,
            stdout: String(stdout ?? ""),
            stderr: String(stderr ?? ""),
            timedOut: !!e && !missing && !tooBig && e.killed === true,
            tooBig,
            missing
          });
        }
      );
    } catch {
      resolve({ ok: false, code: null, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false });
    }
  });

export type ProbeResult = { ok: true; top: string; prefix: string } | { ok: false; reason: "notRepo" | "noGit" | "git" | "timeout" };
export type SnapshotOutcome = { ok: true; tree: string } | { ok: false; reason: "noGit" | "locked" | "timeout" | "git" };
export type TreesDiff = { ok: true; files: FileChange[]; truncated: boolean } | { ok: false; reason: "git" | "timeout" };

export interface GitPort {
  probe(cwd: string): Promise<ProbeResult>;
  snapshot(cwd: string, indexFile: string, timeoutMs: number): Promise<SnapshotOutcome>;
  treeExists(cwd: string, tree: string): Promise<boolean>;
  diffTrees(cwd: string, prefix: string, a: string, b: string): Promise<TreesDiff>;
  fileDiff(cwd: string, prefix: string, a: string, b: string, change: FileChange): Promise<FileDiff | null>;
  loadIndex(top: string, indexFile: string, tree: string): Promise<boolean>;
  restoreFile(top: string, indexFile: string, fullPath: string): Promise<boolean>;
  discardIndex(indexFile: string): void;
}

export interface GitPortDeps {
  run: GitRun;
  sleep(ms: number): Promise<void>;
  now(): number;
}

const literal = (fullPath: string) => `:(top,literal)${fullPath}`;
const relative = (prefix: string): string[] => (prefix ? [`--relative=${prefix}`] : []);

function removeQuietly(file: string): void {
  try {
    if (existsSync(file)) unlinkSync(file);
  } catch {
    // silinemeyen geçici dosya bir sonraki işte yeniden denenir
  }
}

export function createGitPort(partial: Partial<GitPortDeps> = {}): GitPort {
  const deps: GitPortDeps = {
    run: partial.run ?? runGitDefault,
    sleep: partial.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms))),
    now: partial.now ?? (() => Date.now())
  };
  const run = (args: readonly string[], opts: GitRunOptions) => deps.run(args, opts).catch((): GitResult => ({ ok: false, code: null, stdout: "", stderr: "", timedOut: false, tooBig: false, missing: false }));

  /** Çökmüş bir git'ten kalan KENDİ kilidimiz (spec sapma 10). Kullanıcının `.git/index.lock`'una dokunulmuyor. */
  function clearStaleLock(indexFile: string): void {
    const lock = `${indexFile}.lock`;
    try {
      if (existsSync(lock) && deps.now() - statSync(lock).mtimeMs > STALE_LOCK_MS) unlinkSync(lock);
    } catch {
      // kilit silinemezse add aşağıda "locked" der
    }
  }

  return {
    async probe(cwd) {
      const r = await run(["rev-parse", "--is-inside-work-tree", "--show-toplevel", "--show-prefix"], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (r.missing) return { ok: false, reason: "noGit" };
      if (r.timedOut) return { ok: false, reason: "timeout" };
      if (!r.ok) return { ok: false, reason: /not a git repository/i.test(r.stderr) ? "notRepo" : "git" };
      const [inside, top, prefix = ""] = r.stdout.replace(/\r/g, "").split("\n");
      if (inside !== "true" || !top) return { ok: false, reason: "notRepo" };
      return { ok: true, top, prefix };
    },

    async snapshot(cwd, indexFile, timeoutMs) {
      const deadline = deps.now() + timeoutMs;
      const left = () => Math.max(1, deadline - deps.now());
      clearStaleLock(indexFile);
      // İlk kullanım: HEAD ile tohumla (izlenen ama .gitignore'a takılan dosyalar da görüntüde; HEAD yoksa önemsiz).
      if (!existsSync(indexFile)) {
        const seed = await run(["read-tree", "HEAD"], { cwd, indexFile, timeoutMs: left() });
        if (seed.missing) return { ok: false, reason: "noGit" };
        if (!seed.ok) removeQuietly(indexFile);
      }
      for (let attempt = 1; ; attempt++) {
        const add = await run(["add", "-A", "--", "."], { cwd, indexFile, timeoutMs: left() });
        if (add.ok) break;
        if (add.missing) return { ok: false, reason: "noGit" };
        if (add.timedOut || deps.now() >= deadline) return { ok: false, reason: "timeout" };
        if (!/index\.lock/i.test(add.stderr)) return { ok: false, reason: "git" };
        if (attempt >= LOCK_RETRIES) return { ok: false, reason: "locked" };
        await deps.sleep(LOCK_RETRY_MS);
      }
      const written = await run(["write-tree"], { cwd, indexFile, timeoutMs: left() });
      if (!written.ok) return { ok: false, reason: written.timedOut ? "timeout" : "git" };
      const tree = written.stdout.trim();
      return isTreeId(tree) ? { ok: true, tree } : { ok: false, reason: "git" };
    },

    async treeExists(cwd, tree) {
      if (!isTreeId(tree)) return false;
      const r = await run(["cat-file", "-e", `${tree}^{tree}`], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    async diffTrees(cwd, prefix, a, b) {
      if (!isTreeId(a) || !isTreeId(b)) return { ok: false, reason: "git" };
      const common = ["diff-tree", "-r", "--no-renames", "-z", ...relative(prefix)];
      const names = await run([...common, "--name-status", a, b], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (!names.ok && !names.tooBig) return { ok: false, reason: names.timedOut ? "timeout" : "git" };
      const nums = await run([...common, "--numstat", a, b], { cwd, timeoutMs: GIT_TIMEOUT_MS });
      if (!nums.ok && !nums.tooBig) return { ok: false, reason: nums.timedOut ? "timeout" : "git" };
      return { ok: true, files: mergeChanges(parseNameStatusZ(names.stdout), parseNumstatZ(nums.stdout)), truncated: names.tooBig || nums.tooBig };
    },

    async fileDiff(cwd, prefix, a, b, change) {
      if (change.binary) return { kind: "binary" };
      if (!isTreeId(a) || !isTreeId(b)) return null;
      const full = prefix + change.path;
      const sides: string[] = [];
      if (change.status !== "added") sides.push(a);
      if (change.status !== "deleted") sides.push(b);
      for (const tree of sides) {
        const size = await run(["cat-file", "-s", `${tree}:${full}`], { cwd, timeoutMs: GIT_TIMEOUT_MS });
        if (!size.ok) return null;
        if (Number(size.stdout.trim()) > LARGE_FILE_BYTES) return { kind: "large" };
      }
      const patch = await run(
        ["diff-tree", "-r", "-p", "--no-renames", "--no-color", "--no-ext-diff", "--no-textconv", "-U3", a, b, "--", literal(full)],
        { cwd, timeoutMs: GIT_TIMEOUT_MS, maxBuffer: DIFF_MAX_BYTES }
      );
      if (!patch.ok && !patch.tooBig) return null;
      const parsed = parseUnifiedDiff(patch.stdout, patch.tooBig);
      return { kind: "text", lines: parsed.lines, truncated: parsed.truncated };
    },

    async loadIndex(top, indexFile, tree) {
      if (!isTreeId(tree)) return false;
      removeQuietly(indexFile);
      const r = await run(["read-tree", tree], { cwd: top, indexFile, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    async restoreFile(top, indexFile, fullPath) {
      // checkout-index yol belirteci değil düz yol alıyor (deponun köküne göre).
      const r = await run(["checkout-index", "-f", "--", fullPath], { cwd: top, indexFile, timeoutMs: GIT_TIMEOUT_MS });
      return r.ok;
    },

    discardIndex(indexFile) {
      removeQuietly(indexFile);
      removeQuietly(`${indexFile}.lock`);
    }
  };
}
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/changesGit.test.ts`
Expected: PASS (git varsa hepsi; yoksa "gerçek depo" atlanmış ve uyarı satırı basılmış, diğerleri PASS).

Bir gerçek depo testi kırmızıysa önce bunlara bak (yazarın tam emin olmadığı noktalar): (a) `diff-tree --relative=<önek>` önekin sonundaki `/` ile çalışıyor mu; (b) `checkout-index`'in deponun kökünde tam yolla çağrılması; (c) `cat-file -s <ağaç>:<yol>` Türkçe karakterli yolda. Davranışı değiştirmeden düzelt (ör. önek biçimi), testi gevşetme.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/changesGit.ts app-electron/main/changesFs.ts tests/changesGit.test.ts
git commit -m "Degisiklikler: git katmani (ozel index ile goruntu, agac diff, geri yukleme)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Değişiklik yöneticisi — görüntü kancaları, aralık, diff, Kabul et, Geri al

**Files:**
- Create: `app-electron/main/changesManager.ts`
- Test: `tests/changesManager.test.ts`

**Interfaces:**
- Consumes: Task 1 (`createKeyedQueue`, `rangeOf`, `laterCheckpoints`, `capCheckpoints`, `labelOf`, `shouldSnapshotPrompt`, `statsOf`, `isSafeRelPath`, `readRevertPaths`, türler); Task 2 (`CheckpointFileResult`); Task 3 (`GitPort`); `AgentPresence`, `LogFields` (`app-electron/main/agentMonitor.ts`); `AgentRegistration` (`app-electron/shared/agentTypes.ts`); `isBoardId`.
- Produces (Task 5 ve 6 bunları kullanır):

```ts
export interface ChangesStorePort {
  read(workspaceId: string): CheckpointFileResult;
  write(workspaceId: string, list: readonly Checkpoint[]): boolean;
  remove(workspaceId: string): void;
  indexFile(workspaceId: string): string | null;
  restoreIndexFile(workspaceId: string): string | null;
}
export interface ChangesManagerDeps {
  now(): number;
  newId(): string;
  store: ChangesStorePort;
  git: GitPort;
  /** Alanın kökü (yoksa ajanların varsayılan klasörü); kayıtlı değilse null. */
  workspace(workspaceId: string): { cwd: string } | null;
  dirExists(dir: string): boolean;
  insideRoot(root: string, rel: string): boolean;
  pathExists(root: string, rel: string): boolean;
  trash(root: string, rel: string): Promise<void>;
  agents(): AgentPresence[];
  emit(state: ChangesState): void;
  log(tag: string, fields: LogFields): void;
}
export interface SnapshotMeta { paneId: string | null; agentName: string | null; subtaskId: string | null; label: string }
export interface ChangesManager {
  state(workspaceId: string): Promise<ChangesState | null>;
  snapshot(workspaceId: string, reason: CheckpointReason, meta: SnapshotMeta): Promise<SnapshotResult>;
  onPromptLine(reg: AgentRegistration, line: string): void;          // senkron döner, iş arka planda
  onDispatched(workspaceId: string, paneId: string, subtaskId: string, title: string): void; // senkron döner
  live(workspaceId: string): Promise<RangeResult>;
  range(workspaceId: string, checkpointId: string): Promise<RangeResult>;
  fileDiff(workspaceId: string, checkpointId: string, path: string): Promise<DiffResult>;
  accept(workspaceId: string, checkpointId: string): ChangesCommandResult;
  prepareRevert(workspaceId: string, checkpointId: string): Promise<PrepareRevertResult>;
  revert(workspaceId: string, checkpointId: string, paths: unknown): Promise<RevertResult>;
  drop(workspaceId: string): void;
  dispose(): void;
}
export function createChangesManager(deps: ChangesManagerDeps): ChangesManager;
```

- [ ] **Step 1: Kırmızı test** — `tests/changesManager.test.ts`

```ts
// Değişiklik yöneticisi (spec 2026-10-18 degisiklikler §3–§8). Git, depo,
// çöp ve izleyici sahte; gerçek git Task 3'te test ediliyor.
import { describe, expect, it } from "vitest";
import { createChangesManager, type SnapshotMeta } from "../app-electron/main/changesManager";
import type { GitPort, ProbeResult } from "../app-electron/main/changesGit";
import type { CheckpointFileResult } from "../app-electron/main/changesStore";
import type { AgentPresence, LogFields } from "../app-electron/main/agentMonitor";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";
import { MAX_CHECKPOINTS, type ChangesState, type Checkpoint, type FileChange } from "../app-electron/shared/changesTypes";

const T = (n: number) => n.toString(16).padStart(40, "0");
const change = (path: string, status: FileChange["status"] = "modified", added = 1, deleted = 1): FileChange => ({ path, status, added, deleted, binary: false });
const meta = (over: Partial<SnapshotMeta> = {}): SnapshotMeta => ({ paneId: null, agentName: null, subtaskId: null, label: "", ...over });
const flush = () => new Promise((r) => setTimeout(r, 0));
const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:/kok",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "custom",
  sap: false,
  added: false,
  workspaceId: "w1",
  ...over
});
const presence = (paneId: string, name: string, state: AgentStatus["state"] | null, workspaceId = "w1"): AgentPresence => ({
  reg: reg({ paneId, ptyId: `t-${paneId}`, name, workspaceId }),
  status: state ? { state, source: "exact", lastActivity: 1 } : null,
  inputIdle: true,
  engineReady: true
});
const saved = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "w1",
  tree: T(n),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: `istem ${id}`,
  reviewed: "pending",
  ...over
});

function harness(opts: { files?: CheckpointFileResult } = {}) {
  const clock = { ms: 1_000 };
  let seq = 0;
  const written: Checkpoint[][] = [];
  const removed: string[] = [];
  const emitted: ChangesState[] = [];
  const logs: [string, LogFields][] = [];
  const events: string[] = [];
  const git = {
    probe: { ok: true, top: "C:/kok", prefix: "" } as ProbeResult,
    nextTree: opts.files ? 900 : 1,
    snapshotFail: null as null | "noGit" | "locked" | "timeout" | "git",
    diffs: new Map<string, FileChange[]>(),
    missing: new Set<string>(),
    restoreFail: new Set<string>(),
    active: 0,
    maxActive: 0,
    gate: null as Promise<void> | null
  };
  const port: GitPort = {
    probe: async () => git.probe,
    snapshot: async () => {
      git.active += 1;
      git.maxActive = Math.max(git.maxActive, git.active);
      try {
        if (git.gate) await git.gate;
        if (git.snapshotFail) return { ok: false, reason: git.snapshotFail };
        const tree = T(git.nextTree++);
        events.push(`snapshot:${tree}`);
        return { ok: true, tree };
      } finally {
        git.active -= 1;
      }
    },
    treeExists: async (_cwd, tree) => !git.missing.has(tree),
    diffTrees: async (_cwd, _prefix, a, b) => ({ ok: true, files: git.diffs.get(`${a}>${b}`) ?? [], truncated: false }),
    fileDiff: async (_c, _p, _a, _b, ch) => ({ kind: "text", lines: [{ kind: "add", oldNo: null, newNo: 1, text: ch.path }], truncated: false }),
    loadIndex: async (_top, _idx, tree) => {
      events.push(`load:${tree}`);
      return true;
    },
    restoreFile: async (_top, _idx, full) => {
      if (git.restoreFail.has(full)) return false;
      events.push(`restore:${full}`);
      return true;
    },
    discardIndex: () => {}
  };
  const state = {
    agents: [] as AgentPresence[],
    agentsThrow: false,
    dirOk: true,
    inside: (_rel: string) => true,
    exists: new Set<string>(),
    trashFail: new Set<string>(),
    emitThrows: false
  };
  const manager = createChangesManager({
    now: () => clock.ms,
    newId: () => `c${++seq}`,
    store: {
      read: () => opts.files ?? { checkpoints: [] },
      write: (_ws, list) => {
        written.push(JSON.parse(JSON.stringify(list)));
        return true;
      },
      remove: (ws) => {
        removed.push(ws);
      },
      indexFile: (ws) => `C:/veri/${ws}.index`,
      restoreIndexFile: (ws) => `C:/veri/${ws}.restore.index`
    },
    git: port,
    workspace: (id) => (id === "w1" ? { cwd: "C:/kok" } : null),
    dirExists: () => state.dirOk,
    insideRoot: (_root, rel) => state.inside(rel),
    pathExists: (_root, rel) => state.exists.has(rel),
    trash: async (_root, rel) => {
      if (state.trashFail.has(rel)) throw new Error("çöp kutusu yok");
      events.push(`trash:${rel}`);
    },
    agents: () => {
      if (state.agentsThrow) throw new Error("izleyici patladı");
      return state.agents;
    },
    emit: (s) => {
      if (state.emitThrows) throw new Error("pencere yok");
      emitted.push(JSON.parse(JSON.stringify(s)));
    },
    log: (tag, fields) => logs.push([tag, fields])
  });
  const last = () => emitted.at(-1) as ChangesState;
  const ids = () => last().checkpoints.map((c) => c.id);
  return { clock, git, state, manager, written, removed, emitted, logs, events, last, ids };
}

type H = ReturnType<typeof harness>;

/** İki kayıt: c1 (T1) ve c2 (T2); c1'in aralığı T1>T2. */
async function twoCheckpoints(h: H, range: FileChange[]) {
  h.git.diffs.set(`${T(1)}>${T(2)}`, range);
  expect(await h.manager.snapshot("w1", "prompt", meta({ paneId: "p1", agentName: "Ayşe", label: "ilk istem" }))).toEqual({ ok: true, id: "c1" });
  h.clock.ms += 1_000;
  expect(await h.manager.snapshot("w1", "prompt", meta({ paneId: "p1", agentName: "Ayşe", label: "ikinci istem" }))).toEqual({ ok: true, id: "c2" });
}

describe("görüntü", () => {
  it("elle: kayıt ekleniyor, diske yazılıyor, yayınlanıyor; günlükte etiket yok", async () => {
    const h = harness();
    expect(await h.manager.snapshot("w1", "manual", meta({ label: "gizli etiket" }))).toEqual({ ok: true, id: "c1" });
    expect(h.written.at(-1)).toEqual([
      { id: "c1", workspaceId: "w1", tree: T(1), createdAt: 1_000, reason: "manual", paneId: null, agentName: null, subtaskId: null, label: "gizli etiket", reviewed: "pending" }
    ]);
    expect(h.last().repo).toBe("ok");
    expect(h.ids()).toEqual(["c1"]);
    expect(h.logs).toContainEqual(["degisiklik.goruntu", { sebep: "elle", sure: 0, sonuc: "tamam" }]);
    expect(JSON.stringify(h.logs)).not.toContain("gizli");
  });

  it("önceki kaydın aralık istatistiği yeni görüntüde hesaplanıp saklanıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts", "modified", 3, 1), change("b.ts", "added", 2, 0)]);
    const [first, second] = h.written.at(-1)!;
    expect(first.stats).toEqual({ files: 2, added: 5, deleted: 1 });
    expect("stats" in second).toBe(false);
  });

  it("200 sınırı: en eski düşüyor", async () => {
    const h = harness({ files: { checkpoints: Array.from({ length: MAX_CHECKPOINTS }, (_, i) => saved(`s${i}`, i + 1)) } });
    await h.manager.snapshot("w1", "manual", meta());
    const list = h.written.at(-1)!;
    expect(list).toHaveLength(MAX_CHECKPOINTS);
    expect(list[0].id).toBe("s1");
    expect(list.at(-1)?.id).toBe("c1");
  });

  it("emit ve depo yazımı fırlatsa da sonuç dönüyor", async () => {
    const h = harness();
    h.state.emitThrows = true;
    expect(await h.manager.snapshot("w1", "manual", meta())).toEqual({ ok: true, id: "c1" });
  });

  it("depo değil / git yok / klasör yok: hata fırlatmıyor, kayıt yok, uyarı satırı yok, durum mesajı", async () => {
    const h = harness();
    h.git.probe = { ok: false, reason: "notRepo" };
    expect(() => h.manager.onPromptLine(reg(), "dosyayı düzelt")).not.toThrow();
    await flush();
    expect(await h.manager.snapshot("w1", "manual", meta())).toEqual({ ok: false, reason: "notRepo" });
    expect(h.written).toEqual([]);
    const s = await h.manager.state("w1");
    expect(s?.repo).toBe("notRepo");
    expect(s?.warning).toBeUndefined();
    h.git.probe = { ok: false, reason: "noGit" };
    expect((await h.manager.state("w1"))?.repo).toBe("noGit");
    h.state.dirOk = false;
    expect((await h.manager.state("w1"))?.repo).toBe("missingDir");
    expect(h.logs.every(([tag]) => tag === "degisiklik.goruntu")).toBe(true);
  });

  it("görüntü hatası (locked): uyarı satırı; sonraki başarılı görüntü uyarıyı siliyor", async () => {
    const h = harness();
    h.git.snapshotFail = "locked";
    expect(await h.manager.snapshot("w1", "manual", meta())).toEqual({ ok: false, reason: "locked" });
    expect(h.last().warning).toEqual({ code: "locked", at: 1_000 });
    expect(h.logs).toContainEqual(["degisiklik.goruntu", { sebep: "elle", sure: 0, sonuc: "locked" }]);
    h.git.snapshotFail = null;
    await h.manager.snapshot("w1", "manual", meta());
    expect(h.last().warning).toBeUndefined();
  });

  it("kayıtlı olmayan alan: noWorkspace, bellek girişi yok, diske yazılmıyor; geçersiz kimlik invalid", async () => {
    const h = harness();
    expect(await h.manager.snapshot("w9", "manual", meta())).toEqual({ ok: false, reason: "noWorkspace" });
    expect(await h.manager.snapshot("../x", "manual", meta())).toEqual({ ok: false, reason: "invalid" });
    expect(await h.manager.state("w9")).toBeNull();
    expect(h.written).toEqual([]);
    expect(h.emitted).toEqual([]);
  });

  it("okunamayan kayıt dosyası: görüntü bellekte, diske yazılmıyor", async () => {
    const h = harness({ files: { checkpoints: [], unreadable: true } });
    expect((await h.manager.snapshot("w1", "manual", meta())).ok).toBe(true);
    expect(h.written).toEqual([]);
    expect(h.last().unreadable).toBe(true);
  });

  it("aynı alanda işlemler sıralı: eşzamanlı iki görüntü üst üste binmiyor", async () => {
    const h = harness();
    let open: () => void = () => {};
    h.git.gate = new Promise<void>((r) => {
      open = r;
    });
    const a = h.manager.snapshot("w1", "manual", meta());
    const b = h.manager.snapshot("w1", "manual", meta());
    await flush();
    open();
    await Promise.all([a, b]);
    expect(h.git.maxActive).toBe(1);
    expect(h.ids()).toEqual(["c1", "c2"]);
  });
});

describe("kancalar (spec §4)", () => {
  it("istem: senkron dönüyor; 30 sn içinde aynı ajana ikinci görüntü yok; başka ajana var; / komutu ve alansız kayıt yok", async () => {
    const h = harness();
    expect(h.manager.onPromptLine(reg(), "testleri   düzelt\tlütfen")).toBeUndefined();
    expect(h.events).toEqual([]);
    await flush();
    expect(h.last().checkpoints[0]).toMatchObject({ reason: "prompt", paneId: "p1", agentName: "Ayşe", label: "testleri düzelt lütfen" });
    h.clock.ms += 29_999;
    h.manager.onPromptLine(reg(), "ikinci");
    h.manager.onPromptLine(reg({ paneId: "p2", name: "Can" }), "başka ajan");
    h.manager.onPromptLine(reg({ paneId: "p3" }), "/exit");
    h.manager.onPromptLine(reg({ paneId: "p4", workspaceId: undefined }), "alansız");
    h.manager.onPromptLine(reg({ paneId: "p5", workspaceId: "w9" }), "kayıtsız alan");
    await flush();
    expect(h.last().checkpoints.map((c) => c.label)).toEqual(["testleri düzelt lütfen", "başka ajan"]);
    h.clock.ms += 1;
    h.manager.onPromptLine(reg(), "üçüncü");
    await flush();
    expect(h.last().checkpoints.map((c) => c.label)).toEqual(["testleri düzelt lütfen", "başka ajan", "üçüncü"]);
    expect(JSON.stringify(h.logs)).not.toContain("düzelt");
  });

  it("dağıtım: alt görev ve ajan adıyla; izleyici fırlatırsa ad boş ama görüntü alınıyor", async () => {
    const h = harness();
    h.state.agents = [presence("p1", "Ayşe", "idle")];
    expect(h.manager.onDispatched("w1", "p1", "s1", "Model tablosu")).toBeUndefined();
    await flush();
    expect(h.last().checkpoints[0]).toMatchObject({ reason: "dispatch", paneId: "p1", agentName: "Ayşe", subtaskId: "s1", label: "Model tablosu" });
    h.state.agentsThrow = true;
    h.manager.onDispatched("w1", "p1", "s2", "Test");
    await flush();
    expect(h.last().checkpoints[1]).toMatchObject({ reason: "dispatch", agentName: null, subtaskId: "s2" });
  });
});

describe("aralık ve diff (spec §5)", () => {
  it("kayıt → sonraki kayıt; sonuncusu çalışma ağacına (taze ağaç, kayıt eklenmiyor); Canlı; kayıt yoksa noCheckpoint", async () => {
    const h = harness();
    expect(await h.manager.live("w1")).toEqual({ ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true });
    await twoCheckpoints(h, [change("a.ts")]);
    expect(await h.manager.range("w1", "c1")).toEqual({ ok: true, files: [change("a.ts")], truncated: false, toWorkingTree: false });
    h.git.diffs.set(`${T(2)}>${T(3)}`, [change("b.ts", "added", 4, 0)]);
    expect(await h.manager.range("w1", "c2")).toEqual({ ok: true, files: [change("b.ts", "added", 4, 0)], truncated: false, toWorkingTree: true });
    h.git.diffs.set(`${T(2)}>${T(4)}`, [change("c.ts")]);
    expect(await h.manager.live("w1")).toEqual({ ok: true, files: [change("c.ts")], truncated: false, toWorkingTree: true });
    expect(h.ids()).toEqual(["c1", "c2"]);
    expect(await h.manager.range("w1", "yok")).toEqual({ ok: false, reason: "notFound" });
  });

  it("ağaç silinmiş (gc): süresi doldu; diff, hazırlık ve geri al reddediliyor; açılışta arka planda tespit", async () => {
    const h = harness({ files: { checkpoints: [saved("s1", 1), saved("s2", 2)] } });
    h.git.missing.add(T(1));
    await h.manager.state("w1");
    await flush();
    expect(h.last().expired).toEqual(["s1"]);
    expect(await h.manager.range("w1", "s1")).toEqual({ ok: false, reason: "expired" });
    expect(await h.manager.fileDiff("w1", "s1", "a.ts")).toEqual({ ok: false, reason: "expired" });
    expect(await h.manager.prepareRevert("w1", "s1")).toEqual({ ok: false, reason: "expired" });
    const result = await h.manager.revert("w1", "s1", ["a.ts"]);
    expect(result).toMatchObject({ ok: false, reason: "expired" });
    expect(h.events.filter((e) => e.startsWith("snapshot"))).toEqual([]);
  });

  it("fileDiff: yalnız aralıktaki yol; listede olmayan notInRange; güvensiz yol invalid", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    expect(await h.manager.fileDiff("w1", "c1", "a.ts")).toEqual({ ok: true, diff: { kind: "text", lines: [{ kind: "add", oldNo: null, newNo: 1, text: "a.ts" }], truncated: false } });
    expect(await h.manager.fileDiff("w1", "c1", "b.ts")).toEqual({ ok: false, reason: "notInRange" });
    expect(await h.manager.fileDiff("w1", "c1", "../a.ts")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("Kabul et ve Geri al (spec §5, §6)", () => {
  it("Kabul et: pending → accepted; dosyaya dokunmuyor; bilinmeyen kayıt notFound", async () => {
    const h = harness();
    await twoCheckpoints(h, []);
    const before = h.events.length;
    expect(h.manager.accept("w1", "c1")).toEqual({ ok: true });
    expect(h.written.at(-1)?.[0].reviewed).toBe("accepted");
    expect(h.events.length).toBe(before);
    expect(h.manager.accept("w1", "yok")).toEqual({ ok: false, reason: "notFound" });
  });

  it("Geri al: önce beforeRestore; değişen/silinen dosyalar ağaçtan, eklenen çöpe; kayıt reverted; günlükte yol yok", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("sil.md", "deleted", 0, 3), change("yeni.txt", "added", 2, 0)]);
    h.state.exists.add("yeni.txt");
    const result = await h.manager.revert("w1", "c1", ["a.ts", "sil.md", "yeni.txt"]);
    expect(result).toEqual({ ok: true, restored: ["a.ts", "sil.md"], trashed: ["yeni.txt"], skipped: [], beforeRestoreId: "c3" });
    expect(h.events.slice(2)).toEqual([`snapshot:${T(3)}`, `load:${T(1)}`, "restore:a.ts", "restore:sil.md", "trash:yeni.txt"]);
    const list = h.written.at(-1)!;
    expect(list.map((c) => [c.id, c.reason, c.reviewed])).toEqual([
      ["c1", "prompt", "reverted"],
      ["c2", "prompt", "pending"],
      ["c3", "beforeRestore", "pending"]
    ]);
    expect(list[2].label).toBe("ilk istem");
    expect(h.logs).toContainEqual(["degisiklik.geriAl", { dosya: 3, sonuc: "tamam" }]);
    expect(JSON.stringify(h.logs)).not.toMatch(/a\.ts|sil\.md|yeni\.txt/);
  });

  it("Geri al: alt klasör önekiyle tam yol geri yükleniyor", async () => {
    const h = harness();
    h.git.probe = { ok: true, top: "C:/depo", prefix: "src/" };
    await twoCheckpoints(h, [change("a.ts")]);
    await h.manager.revert("w1", "c1", ["a.ts"]);
    expect(h.events).toContain("restore:src/a.ts");
  });

  it("Geri al: beforeRestore alınamazsa hiçbir dosyaya dokunulmuyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.git.snapshotFail = "git";
    const result = await h.manager.revert("w1", "c1", ["a.ts", "yeni.txt"]);
    expect(result).toEqual({ ok: false, reason: "snapshotFailed", restored: [], trashed: [], skipped: [] });
    expect(h.events.filter((e) => !e.startsWith("snapshot"))).toEqual([]);
    expect(h.last().checkpoints[0].reviewed).toBe("pending");
    expect(h.logs).toContainEqual(["degisiklik.geriAl", { dosya: 0, sonuc: "goruntuYok" }]);
  });

  it("Geri al: bir dosya yazılamazsa durur, yazılanlar listelenir, kayıt reverted olmuyor, beforeRestore listede", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("b.ts"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.git.restoreFail.add("b.ts");
    const result = await h.manager.revert("w1", "c1", ["a.ts", "b.ts", "yeni.txt"]);
    expect(result).toEqual({ ok: false, reason: "writeFailed", restored: ["a.ts"], trashed: [], skipped: [], failedPath: "b.ts", beforeRestoreId: "c3" });
    expect(h.events).not.toContain("trash:yeni.txt");
    expect(h.last().checkpoints.map((c) => [c.id, c.reviewed])).toEqual([
      ["c1", "pending"],
      ["c2", "pending"],
      ["c3", "pending"]
    ]);
    expect(h.last().checkpoints[2].reason).toBe("beforeRestore");
  });

  it("Geri al: çöpe taşınamayan dosyada durur; zaten olmayan eklenmiş dosya atlanıyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("gitti.txt", "added"), change("yeni.txt", "added")]);
    h.state.exists.add("yeni.txt");
    h.state.trashFail.add("yeni.txt");
    const result = await h.manager.revert("w1", "c1", ["gitti.txt", "yeni.txt"]);
    expect(result).toMatchObject({ ok: false, reason: "writeFailed", skipped: ["gitti.txt"], trashed: [], failedPath: "yeni.txt" });
  });

  it("Geri al: onaylanan listede olup artık aralıkta olmayan atlanıyor; aralıkta olup listede olmayana dokunulmuyor; kök dışına çıkan yol reddediliyor", async () => {
    const h = harness();
    await twoCheckpoints(h, []);
    // c2 en sonuncusu: aralığı çalışma ağacına kadar; beforeRestore (T3) sonrası T2>T3.
    h.git.diffs.set(`${T(2)}>${T(3)}`, [change("b.ts"), change("c.ts")]);
    const result = await h.manager.revert("w1", "c2", ["a.ts", "b.ts"]);
    expect(result).toMatchObject({ ok: true, restored: ["b.ts"], skipped: ["a.ts"], trashed: [] });
    expect(h.events).not.toContain("restore:c.ts");

    const h2 = harness();
    await twoCheckpoints(h2, [change("a.ts")]);
    h2.state.inside = (rel) => rel !== "a.ts";
    expect(await h2.manager.revert("w1", "c1", ["a.ts"])).toMatchObject({ ok: false, reason: "invalid", failedPath: "a.ts", restored: [] });
    expect(h2.events.filter((e) => e.startsWith("restore"))).toEqual([]);
    expect(await h2.manager.revert("w1", "c1", ["../x"])).toEqual({ ok: false, reason: "invalid", restored: [], trashed: [], skipped: [] });
    expect(await h2.manager.revert("w1", "c1", "a.ts")).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("Geri al: aynı alanda ikinci geri alma busy", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts")]);
    let open: () => void = () => {};
    h.git.gate = new Promise<void>((r) => {
      open = r;
    });
    const first = h.manager.revert("w1", "c1", ["a.ts"]);
    expect(await h.manager.revert("w1", "c1", ["a.ts"])).toMatchObject({ ok: false, reason: "busy" });
    open();
    expect((await first).ok).toBe(true);
  });

  it("prepareRevert: çakışan sonraki kayıtlar adıyla; çalışan/soru soran ajanlar; dosyaya dokunmuyor", async () => {
    const h = harness();
    await twoCheckpoints(h, [change("a.ts"), change("b.ts")]);
    h.clock.ms += 1_000;
    await h.manager.snapshot("w1", "dispatch", meta({ paneId: "p2", agentName: "Can", subtaskId: "s1", label: "Model" }));
    h.git.diffs.set(`${T(2)}>${T(3)}`, [change("a.ts")]);
    h.git.diffs.set(`${T(3)}>${T(4)}`, [change("z.ts")]);
    h.state.agents = [presence("p1", "Ayşe", "running"), presence("p2", "Can", "asking"), presence("p3", "Ece", "idle"), presence("p4", "Baş", "running", "w2")];
    const prepared = await h.manager.prepareRevert("w1", "c1");
    expect(prepared).toEqual({
      ok: true,
      plan: {
        files: [change("a.ts"), change("b.ts")],
        conflicts: [{ id: "c2", label: "ikinci istem", agentName: "Ayşe", reason: "prompt" }],
        conflictsPartial: false,
        runningAgents: ["Ayşe", "Can"]
      }
    });
    expect(h.events.filter((e) => !e.startsWith("snapshot"))).toEqual([]);
    expect(h.ids()).toEqual(["c1", "c2", "c3"]);
  });

  it("drop: kayıt dosyaları siliniyor; bellek temizleniyor", async () => {
    const h = harness();
    await h.manager.snapshot("w1", "manual", meta());
    h.manager.drop("w1");
    expect(h.removed).toEqual(["w1"]);
    expect((await h.manager.state("w1"))?.checkpoints).toEqual([]);
  });
});
```

Notlar: Sahte `snapshot` her çağrıda sıradaki ağacı (`T(1)`, `T(2)`, …) veriyor; "çalışma ağacına kadar" aralıkları ve `beforeRestore` da bir ağaç tüketiyor, testlerdeki `T(n)` numaraları buna göre. Son testte `drop` sonrası `state` deposu yeniden okuyor; sahte depo boş liste döndürüyor.

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesManager.test.ts`
Expected: FAIL — `changesManager` modülü yok.

- [ ] **Step 3: Yönetici** — `app-electron/main/changesManager.ts`

```ts
// Değişiklikler yöneticisi (spec 2026-10-18 degisiklikler §3–§8). Ana süreçte
// tek örnek. Kayıtları diskten okuyor, görüntü kancalarını (istem, dağıtım,
// elle, geri alma öncesi) alan başına SIRALI bir kuyrukta çalıştırıyor,
// aralık/diff/geri alma sağlıyor, değişince renderer'a yayıyor.
//
// Kurallar:
//   - Hiçbir yol hata fırlatmıyor; kancalar senkron dönüyor, iş arka planda.
//   - Geri almadan önce beforeRestore görüntüsü; alınamazsa hiçbir dosyaya
//     dokunulmuyor. Eklenmiş dosya çöpe (deps.trash), kalıcı silinmiyor.
//   - Yol yalnız o kaydın o anki aralık listesinden; yazmadan hemen önce
//     deps.insideRoot ile kök denetimi.
//   - Günlüğe yol, içerik, istem ya da etiket yazılmıyor.
import type { AgentRegistration } from "../shared/agentTypes";
import { isBoardId } from "../shared/boardCommands";
import {
  capCheckpoints,
  createKeyedQueue,
  isSafeRelPath,
  labelOf,
  laterCheckpoints,
  rangeOf,
  readRevertPaths,
  shouldSnapshotPrompt,
  statsOf,
  type CheckpointRange
} from "../shared/changesLogic";
import {
  CONFLICT_SCAN_MAX,
  SNAPSHOT_TIMEOUT_MS,
  type ChangesCommandResult,
  type ChangesFailure,
  type ChangesState,
  type ChangesWarning,
  type Checkpoint,
  type CheckpointReason,
  type DiffResult,
  type FileChange,
  type PrepareRevertResult,
  type RangeResult,
  type RangeStats,
  type RepoStatus,
  type RevertConflict,
  type RevertResult,
  type SnapshotResult
} from "../shared/changesTypes";
import type { AgentPresence, LogFields } from "./agentMonitor";
import type { GitPort } from "./changesGit";
import type { CheckpointFileResult } from "./changesStore";

export interface ChangesStorePort {
  read(workspaceId: string): CheckpointFileResult;
  write(workspaceId: string, list: readonly Checkpoint[]): boolean;
  remove(workspaceId: string): void;
  indexFile(workspaceId: string): string | null;
  restoreIndexFile(workspaceId: string): string | null;
}

export interface ChangesManagerDeps {
  now(): number;
  newId(): string;
  store: ChangesStorePort;
  git: GitPort;
  /** Alanın kökü (yoksa ajanların varsayılan klasörü); kayıtlı değilse null. */
  workspace(workspaceId: string): { cwd: string } | null;
  dirExists(dir: string): boolean;
  insideRoot(root: string, rel: string): boolean;
  pathExists(root: string, rel: string): boolean;
  trash(root: string, rel: string): Promise<void>;
  agents(): AgentPresence[];
  emit(state: ChangesState): void;
  log(tag: string, fields: LogFields): void;
}

export interface SnapshotMeta {
  paneId: string | null;
  agentName: string | null;
  subtaskId: string | null;
  label: string;
}

export interface ChangesManager {
  state(workspaceId: string): Promise<ChangesState | null>;
  snapshot(workspaceId: string, reason: CheckpointReason, meta: SnapshotMeta): Promise<SnapshotResult>;
  onPromptLine(reg: AgentRegistration, line: string): void;
  onDispatched(workspaceId: string, paneId: string, subtaskId: string, title: string): void;
  live(workspaceId: string): Promise<RangeResult>;
  range(workspaceId: string, checkpointId: string): Promise<RangeResult>;
  fileDiff(workspaceId: string, checkpointId: string, path: string): Promise<DiffResult>;
  accept(workspaceId: string, checkpointId: string): ChangesCommandResult;
  prepareRevert(workspaceId: string, checkpointId: string): Promise<PrepareRevertResult>;
  revert(workspaceId: string, checkpointId: string, paths: unknown): Promise<RevertResult>;
  drop(workspaceId: string): void;
  dispose(): void;
}

interface Entry {
  checkpoints: Checkpoint[];
  expired: Set<string>;
  repo: RepoStatus;
  warning?: ChangesWarning;
  recoveredFrom?: string;
  unreadable?: boolean;
  expiryChecked: boolean;
}

interface Ctx {
  /** Alan kökü. */
  cwd: string;
  /** Deponun kökü. */
  top: string;
  /** Alan kökünün depodaki öneki ("" ya da "/" ile biten). */
  prefix: string;
}

type Internal = { ok: true; files: FileChange[]; truncated: boolean; range: CheckpointRange; toTree: string } | { ok: false; reason: ChangesFailure };

const REASON_LOG: Record<CheckpointReason, string> = {
  prompt: "istem",
  dispatch: "dagitim",
  manual: "elle",
  beforeRestore: "geriAlmaOncesi"
};

const fail = (reason: ChangesFailure) => ({ ok: false as const, reason });

export function createChangesManager(deps: ChangesManagerDeps): ChangesManager {
  const entries = new Map<string, Entry>();
  const queue = createKeyedQueue();
  /** Bölme → son istem görüntüsü anı (spec §4.2, 30 sn). */
  const lastPrompt = new Map<string, number>();
  /** Geri alma süren alanlar: ikinci geri alma "busy". */
  const reverting = new Set<string>();
  let disposed = false;

  function attempt<T>(fn: () => T, fallback: T): T {
    try {
      return fn();
    } catch {
      return fallback;
    }
  }

  const log = (tag: string, fields: LogFields) => attempt(() => deps.log(tag, fields), undefined);

  function load(workspaceId: string): Entry | null {
    if (!isBoardId(workspaceId)) return null;
    // Kayıtlı alan kapısı: config'te olmayan id için bellek girişi açılmaz, diske yazılmaz.
    if (!attempt(() => deps.workspace(workspaceId), null)) return null;
    let entry = entries.get(workspaceId);
    if (!entry) {
      const file = attempt<CheckpointFileResult>(() => deps.store.read(workspaceId), { checkpoints: [], unreadable: true });
      entry = { checkpoints: file.checkpoints, expired: new Set(), repo: "unknown", expiryChecked: false };
      if (file.recoveredFrom) entry.recoveredFrom = file.recoveredFrom;
      if (file.unreadable) entry.unreadable = true;
      entries.set(workspaceId, entry);
    }
    return entry;
  }

  function stateOf(workspaceId: string, entry: Entry): ChangesState {
    const state: ChangesState = { workspaceId, repo: entry.repo, checkpoints: entry.checkpoints, expired: [...entry.expired] };
    if (entry.warning) state.warning = entry.warning;
    if (entry.recoveredFrom) state.recoveredFrom = entry.recoveredFrom;
    if (entry.unreadable) state.unreadable = true;
    return state;
  }

  const emit = (workspaceId: string, entry: Entry) => attempt(() => deps.emit(stateOf(workspaceId, entry)), undefined);

  function save(workspaceId: string, entry: Entry): void {
    if (!entry.unreadable) attempt(() => deps.store.write(workspaceId, entry.checkpoints), false);
  }

  function markExpired(workspaceId: string, entry: Entry, ids: readonly string[]): void {
    let changed = false;
    for (const id of ids) {
      if (entry.expired.has(id)) continue;
      entry.expired.add(id);
      changed = true;
    }
    if (changed) emit(workspaceId, entry);
  }

  async function context(workspaceId: string, entry: Entry): Promise<{ ok: true; ctx: Ctx } | { ok: false; reason: ChangesFailure }> {
    const info = attempt(() => deps.workspace(workspaceId), null);
    if (!info) return fail("noWorkspace");
    const setRepo = (repo: RepoStatus) => {
      if (entry.repo === repo) return;
      entry.repo = repo;
      emit(workspaceId, entry);
    };
    if (!attempt(() => deps.dirExists(info.cwd), false)) {
      setRepo("missingDir");
      return fail("missingDir");
    }
    const probe = await deps.git.probe(info.cwd);
    if (!probe.ok) {
      if (probe.reason === "notRepo" || probe.reason === "noGit") setRepo(probe.reason);
      return fail(probe.reason);
    }
    setRepo("ok");
    return { ok: true, ctx: { cwd: info.cwd, top: probe.top, prefix: probe.prefix } };
  }

  /** Alan kuyruğunda, bağlamla çalıştırır; hiçbir yol fırlatmaz. */
  async function withContext<T>(workspaceId: string, onFail: (reason: ChangesFailure) => T, job: (entry: Entry, ctx: Ctx) => Promise<T>): Promise<T> {
    if (disposed || !isBoardId(workspaceId)) return onFail("invalid");
    try {
      return await queue.run(workspaceId, async () => {
        const entry = load(workspaceId);
        if (!entry) return onFail("noWorkspace");
        const c = await context(workspaceId, entry);
        if (!c.ok) return onFail(c.reason);
        return job(entry, c.ctx);
      });
    } catch {
      return onFail("git");
    }
  }

  async function freshTree(workspaceId: string, ctx: Ctx): Promise<{ ok: true; tree: string } | { ok: false; reason: ChangesFailure }> {
    const indexFile = attempt(() => deps.store.indexFile(workspaceId), null);
    if (!indexFile) return fail("invalid");
    return deps.git.snapshot(ctx.cwd, indexFile, SNAPSHOT_TIMEOUT_MS);
  }

  /** Kuyruğun İÇİNDEN çağrılır (kendisi kuyruğa girmez). */
  async function takeSnapshot(workspaceId: string, entry: Entry, ctx: Ctx, reason: CheckpointReason, meta: SnapshotMeta): Promise<SnapshotResult> {
    const started = deps.now();
    const out = await freshTree(workspaceId, ctx);
    const sure = Math.max(0, deps.now() - started);
    if (!out.ok) {
      entry.warning = { code: out.reason, at: deps.now() };
      log("degisiklik.goruntu", { sebep: REASON_LOG[reason], sure, sonuc: out.reason });
      emit(workspaceId, entry);
      return fail(out.reason);
    }
    const prev = entry.checkpoints.at(-1);
    let stats: RangeStats | null = null;
    if (prev && !prev.stats) {
      const d = await deps.git.diffTrees(ctx.cwd, ctx.prefix, prev.tree, out.tree);
      if (d.ok && !d.truncated) stats = statsOf(d.files);
    }
    // Beklerken alan kapatıldıysa (drop) hiçbir şey yazılmıyor.
    if (entries.get(workspaceId) !== entry) return fail("noWorkspace");
    const checkpoint: Checkpoint = {
      id: deps.newId(),
      workspaceId,
      tree: out.tree,
      createdAt: started,
      reason,
      paneId: meta.paneId,
      agentName: meta.agentName,
      subtaskId: meta.subtaskId,
      label: labelOf(meta.label),
      reviewed: "pending"
    };
    // Bekleme sırasında Kabul et değiştirmiş olabilir: güncel listeye uygulanıyor.
    const current = entry.checkpoints.map((c) => (stats && prev && c.id === prev.id ? { ...c, stats } : c));
    entry.checkpoints = capCheckpoints([...current, checkpoint]);
    for (const id of [...entry.expired]) if (!entry.checkpoints.some((c) => c.id === id)) entry.expired.delete(id);
    delete entry.warning;
    save(workspaceId, entry);
    log("degisiklik.goruntu", { sebep: REASON_LOG[reason], sure, sonuc: "tamam" });
    emit(workspaceId, entry);
    return { ok: true, id: checkpoint.id };
  }

  /** Kaydın aralığı: bu kayıt → sonraki kayıt; en sonuncusunda taze ağaca (çalışma ağacı). */
  async function rangeInternal(workspaceId: string, entry: Entry, ctx: Ctx, id: string): Promise<Internal> {
    const range = rangeOf(entry.checkpoints, id);
    if (!range) return fail("notFound");
    if (entry.expired.has(id)) return fail("expired");
    if (!(await deps.git.treeExists(ctx.cwd, range.from.tree))) {
      markExpired(workspaceId, entry, [id]);
      return fail("expired");
    }
    let toTree: string;
    if (range.to) {
      if (!(await deps.git.treeExists(ctx.cwd, range.to.tree))) {
        markExpired(workspaceId, entry, [range.to.id]);
        return fail("expired");
      }
      toTree = range.to.tree;
    } else {
      const fresh = await freshTree(workspaceId, ctx);
      if (!fresh.ok) return fail(fresh.reason);
      toTree = fresh.tree;
    }
    const d = await deps.git.diffTrees(ctx.cwd, ctx.prefix, range.from.tree, toTree);
    if (!d.ok) return fail(d.reason);
    return { ok: true, files: d.files, truncated: d.truncated, range, toTree };
  }

  const publicRange = (r: Internal): RangeResult => (r.ok ? { ok: true, files: r.files, truncated: r.truncated, toWorkingTree: r.range.to === null } : r);

  function snapshot(workspaceId: string, reason: CheckpointReason, meta: SnapshotMeta): Promise<SnapshotResult> {
    return withContext<SnapshotResult>(
      workspaceId,
      (reasonCode) => {
        log("degisiklik.goruntu", { sebep: REASON_LOG[reason], sure: 0, sonuc: reasonCode });
        return fail(reasonCode);
      },
      (entry, ctx) => takeSnapshot(workspaceId, entry, ctx, reason, meta)
    );
  }

  function checkExpiry(workspaceId: string): Promise<void> {
    return withContext<void>(
      workspaceId,
      () => undefined,
      async (entry, ctx) => {
        const missing: string[] = [];
        for (const c of entry.checkpoints) {
          if (!entry.expired.has(c.id) && !(await deps.git.treeExists(ctx.cwd, c.tree))) missing.push(c.id);
        }
        if (missing.length) markExpired(workspaceId, entry, missing);
      }
    );
  }

  function agentNameOf(paneId: string): string | null {
    const found = attempt(() => deps.agents(), [] as AgentPresence[]).find((p) => p.reg.paneId === paneId);
    return found?.reg.name || null;
  }

  async function revertJob(workspaceId: string, entry: Entry, ctx: Ctx, id: string, paths: readonly string[]): Promise<RevertResult> {
    const target = entry.checkpoints.find((c) => c.id === id);
    if (!target) return { ok: false, reason: "notFound", restored: [], trashed: [], skipped: [] };
    if (entry.expired.has(id)) return { ok: false, reason: "expired", restored: [], trashed: [], skipped: [] };
    // 1) Güvenlik ağı: geri almadan önce o anın görüntüsü (spec §6.2). Alınamazsa dokunma.
    const before = await takeSnapshot(workspaceId, entry, ctx, "beforeRestore", { paneId: null, agentName: null, subtaskId: null, label: target.label });
    if (!before.ok) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: "goruntuYok" });
      return { ok: false, reason: "snapshotFailed", restored: [], trashed: [], skipped: [] };
    }
    const result: RevertResult = { ok: false, restored: [], trashed: [], skipped: [], beforeRestoreId: before.id };
    const range = await rangeInternal(workspaceId, entry, ctx, id);
    if (!range.ok) {
      log("degisiklik.geriAl", { dosya: 0, sonuc: range.reason });
      return { ...result, reason: range.reason };
    }
    const byPath = new Map(range.files.map((f) => [f.path, f]));
    const restoreIndex = attempt(() => deps.store.restoreIndexFile(workspaceId), null);
    let indexReady = false;
    let problem: ChangesFailure | null = null;
    for (const rel of paths) {
      const change = byPath.get(rel);
      // Onaylandıktan sonra aralıktan çıkmış: dokunulmuyor (spec §7).
      if (!change) {
        result.skipped.push(rel);
        continue;
      }
      if (!attempt(() => deps.insideRoot(ctx.cwd, rel), false)) {
        problem = "invalid";
        result.failedPath = rel;
        break;
      }
      if (change.status === "added") {
        // Görüntüde yoktu: kalıcı silme yok, çöp kutusu (spec §6.3).
        if (!attempt(() => deps.pathExists(ctx.cwd, rel), false)) {
          result.skipped.push(rel);
          continue;
        }
        try {
          await deps.trash(ctx.cwd, rel);
          result.trashed.push(rel);
        } catch {
          problem = "writeFailed";
          result.failedPath = rel;
          break;
        }
        continue;
      }
      if (!indexReady) {
        indexReady = !!restoreIndex && (await deps.git.loadIndex(ctx.top, restoreIndex, target.tree));
        if (!indexReady) {
          problem = "git";
          result.failedPath = rel;
          break;
        }
      }
      if (restoreIndex && (await deps.git.restoreFile(ctx.top, restoreIndex, ctx.prefix + rel))) {
        result.restored.push(rel);
      } else {
        problem = "writeFailed";
        result.failedPath = rel;
        break;
      }
    }
    if (restoreIndex) attempt(() => deps.git.discardIndex(restoreIndex), undefined);
    if (!problem && entries.get(workspaceId) === entry) {
      entry.checkpoints = entry.checkpoints.map((c) => (c.id === id ? { ...c, reviewed: "reverted" as const } : c));
      save(workspaceId, entry);
      emit(workspaceId, entry);
    }
    log("degisiklik.geriAl", { dosya: result.restored.length + result.trashed.length, sonuc: problem ?? "tamam" });
    return problem ? { ...result, reason: problem } : { ...result, ok: true };
  }

  return {
    async state(workspaceId) {
      if (disposed || !isBoardId(workspaceId)) return null;
      const entry = load(workspaceId);
      if (!entry) return null;
      try {
        await queue.run(workspaceId, async () => {
          await context(workspaceId, entry);
        });
      } catch {
        // durum yine dönüyor
      }
      if (!entry.expiryChecked && entry.repo === "ok") {
        entry.expiryChecked = true;
        void checkExpiry(workspaceId).catch(() => {});
      }
      return stateOf(workspaceId, entry);
    },

    snapshot,

    onPromptLine(reg, line) {
      attempt(() => {
        const workspaceId = reg.workspaceId;
        if (disposed || !workspaceId || !isBoardId(workspaceId)) return;
        // Motor komutu istem değil (spec sapma 6).
        if (line.trim().startsWith("/")) return;
        const now = deps.now();
        if (!shouldSnapshotPrompt(lastPrompt.get(reg.paneId), now)) return;
        lastPrompt.set(reg.paneId, now);
        void snapshot(workspaceId, "prompt", { paneId: reg.paneId, agentName: reg.name || null, subtaskId: null, label: line }).catch(() => {});
      }, undefined);
    },

    onDispatched(workspaceId, paneId, subtaskId, title) {
      attempt(() => {
        if (disposed) return;
        void snapshot(workspaceId, "dispatch", { paneId, agentName: agentNameOf(paneId), subtaskId, label: title }).catch(() => {});
      }, undefined);
    },

    live(workspaceId) {
      return withContext<RangeResult>(workspaceId, fail, async (entry, ctx) => {
        const latest = entry.checkpoints.at(-1);
        if (!latest) return { ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true };
        return publicRange(await rangeInternal(workspaceId, entry, ctx, latest.id));
      });
    },

    range(workspaceId, checkpointId) {
      if (!isBoardId(checkpointId)) return Promise.resolve(fail("invalid"));
      return withContext<RangeResult>(workspaceId, fail, async (entry, ctx) => publicRange(await rangeInternal(workspaceId, entry, ctx, checkpointId)));
    },

    fileDiff(workspaceId, checkpointId, path) {
      if (!isBoardId(checkpointId) || !isSafeRelPath(path)) return Promise.resolve(fail("invalid"));
      return withContext<DiffResult>(workspaceId, fail, async (entry, ctx) => {
        const r = await rangeInternal(workspaceId, entry, ctx, checkpointId);
        if (!r.ok) return r;
        const change = r.files.find((f) => f.path === path);
        if (!change) return fail("notInRange");
        const diff = await deps.git.fileDiff(ctx.cwd, ctx.prefix, r.range.from.tree, r.toTree, change);
        return diff ? { ok: true, diff } : fail("git");
      });
    },

    accept(workspaceId, checkpointId) {
      if (disposed || !isBoardId(checkpointId)) return fail("invalid");
      const entry = load(workspaceId);
      if (!entry) return fail("noWorkspace");
      const target = entry.checkpoints.find((c) => c.id === checkpointId);
      if (!target) return fail("notFound");
      if (target.reviewed !== "pending") return { ok: true };
      entry.checkpoints = entry.checkpoints.map((c) => (c.id === checkpointId ? { ...c, reviewed: "accepted" as const } : c));
      save(workspaceId, entry);
      emit(workspaceId, entry);
      return { ok: true };
    },

    prepareRevert(workspaceId, checkpointId) {
      if (!isBoardId(checkpointId)) return Promise.resolve(fail("invalid"));
      return withContext<PrepareRevertResult>(workspaceId, fail, async (entry, ctx) => {
        const r = await rangeInternal(workspaceId, entry, ctx, checkpointId);
        if (!r.ok) return r;
        const paths = new Set(r.files.map((f) => f.path));
        const later = laterCheckpoints(entry.checkpoints, checkpointId, CONFLICT_SCAN_MAX);
        const totalLater = entry.checkpoints.length - 1 - r.range.index;
        const conflicts: RevertConflict[] = [];
        let fresh: string | null = null;
        for (const c of later) {
          const next = rangeOf(entry.checkpoints, c.id)?.to ?? null;
          let toTree = next?.tree ?? null;
          if (!toTree) {
            if (!fresh) {
              const t = await freshTree(workspaceId, ctx);
              if (!t.ok) break;
              fresh = t.tree;
            }
            toTree = fresh;
          }
          const d = await deps.git.diffTrees(ctx.cwd, ctx.prefix, c.tree, toTree);
          if (d.ok && d.files.some((f) => paths.has(f.path))) conflicts.push({ id: c.id, label: c.label, agentName: c.agentName, reason: c.reason });
        }
        const runningAgents = attempt(() => deps.agents(), [] as AgentPresence[])
          .filter((p) => p.reg.workspaceId === workspaceId && (p.status?.state === "running" || p.status?.state === "asking"))
          .map((p) => p.reg.name || p.reg.paneId);
        return { ok: true, plan: { files: r.files, conflicts, conflictsPartial: totalLater > later.length, runningAgents } };
      });
    },

    async revert(workspaceId, checkpointId, raw) {
      const empty = { restored: [] as string[], trashed: [] as string[], skipped: [] as string[] };
      const paths = readRevertPaths(raw);
      if (disposed || !isBoardId(workspaceId) || !isBoardId(checkpointId) || !paths) return { ok: false, reason: "invalid", ...empty };
      if (reverting.has(workspaceId)) return { ok: false, reason: "busy", ...empty };
      reverting.add(workspaceId);
      try {
        return await withContext<RevertResult>(
          workspaceId,
          (reason) => ({ ok: false, reason, ...empty }),
          (entry, ctx) => revertJob(workspaceId, entry, ctx, checkpointId, paths)
        );
      } finally {
        reverting.delete(workspaceId);
      }
    },

    drop(workspaceId) {
      if (!isBoardId(workspaceId)) return;
      entries.delete(workspaceId);
      attempt(() => deps.store.remove(workspaceId), undefined);
    },

    dispose() {
      disposed = true;
    }
  };
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/changesManager.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/main/changesManager.ts tests/changesManager.test.ts
git commit -m "Degisiklikler: yonetici (goruntu kancalari, aralik, Kabul et, Geri al)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Kancalar — izleyicinin `onPromptLine`'ı ve pano yöneticisinin `onDispatched`'ı

**Files:**
- Modify: `app-electron/main/agentMonitor.ts` (`MonitorDeps`, `onInput`)
- Modify: `app-electron/main/boardManager.ts` (`BoardManagerDeps`, `reconcile` içindeki dağıtım, `deliver`)
- Modify: `tests/boardManager.test.ts` (`harness` seçeneği + yeni `describe`)
- Test: `tests/changesHooks.test.ts` (yeni)

**Interfaces:**
- Consumes: mevcut `createAgentMonitor`, `createBoardManager`, `AgentReader`, `AgentRegistration`.
- Produces (Task 6 bağlıyor):

```ts
// agentMonitor.ts — MonitorDeps'e:
onPromptLine?(reg: AgentRegistration, line: string): void;
// boardManager.ts — BoardManagerDeps'e:
onDispatched?(workspaceId: string, paneId: string, subtaskId: string, title: string): void;
```

Davranış: `onPromptLine` kullanıcının bölmede Enter ile tamamladığı her satır için, okuyucuya verilmeden hemen önce, motor kapalı değilse (`entry.last?.state !== "finished"`) çağrılıyor; fırlatırsa yutuluyor. Pano istemi `sendPrompt` içinde `reader.submitLine` ile gidiyor, `onInput`'tan geçmiyor: kanca çağrılmıyor. `onDispatched` istem yazımı `"ok"` döndükten hemen sonra (oto ve elle/geri gönderim), `attempt` içinde.

- [ ] **Step 1: Kırmızı test (izleyici)** — `tests/changesHooks.test.ts`

```ts
// Değişiklikler kancaları (spec 2026-10-18 degisiklikler §4): izleyicinin
// istem satırı kancası. Okuyucu sahte; pano kancası boardManager.test.ts'te.
import { describe, expect, it, vi } from "vitest";
import { createAgentMonitor } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import type { AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";

class FakeReader implements AgentReader {
  current: AgentStatus = { state: "idle", source: "exact", lastActivity: null };
  lines: string[] = [];
  feedOutput() {}
  submitLine(line: string) {
    this.lines.push(line);
  }
  poll() {}
  status() {
    return this.current;
  }
  engineReady() {
    return true;
  }
  dispose() {}
}

const reg: AgentRegistration = {
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\kok",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "custom",
  sap: false,
  added: false,
  workspaceId: "w1"
};

function harness(onPromptLine: (r: AgentRegistration, line: string) => void) {
  const reader = new FakeReader();
  const monitor = createAgentMonitor({
    now: () => 10_000_000,
    createReader: () => reader,
    emit: () => {},
    notify: () => {},
    write: () => true,
    backlog: () => "",
    log: () => {},
    schedule: (fn) => fn(),
    onPromptLine
  });
  monitor.register(reg);
  return { monitor, reader };
}

describe("onPromptLine (spec §4.2)", () => {
  it("Enter ile biten satır kayıtla gidiyor; Enter'sız taslak gitmiyor", () => {
    const hook = vi.fn();
    const { monitor, reader } = harness(hook);
    monitor.onInput("t1", "testleri düzelt");
    expect(hook).not.toHaveBeenCalled();
    monitor.onInput("t1", "\r");
    expect(hook).toHaveBeenCalledWith(reg, "testleri düzelt");
    expect(reader.lines).toEqual(["testleri düzelt"]);
  });

  it("motor kapalıyken (kabuk istemi) yazılan satır istem sayılmıyor ama okuyucuya gidiyor", () => {
    const hook = vi.fn();
    const { monitor, reader } = harness(hook);
    reader.current = { state: "finished", source: "exact", lastActivity: 1 };
    monitor.tick();
    monitor.onInput("t1", "dir\r");
    expect(hook).not.toHaveBeenCalled();
    expect(reader.lines).toEqual(["dir"]);
  });

  it("onPromptLine fırlatsa da okuyucu satırı alıyor ve sonraki satırlar işleniyor", () => {
    const { monitor, reader } = harness(() => {
      throw new Error("değişiklik yöneticisi patladı");
    });
    expect(() => monitor.onInput("t1", "bir\riki\r")).not.toThrow();
    expect(reader.lines).toEqual(["bir", "iki"]);
  });

  it("pano istemi (sendPrompt) kancaya gitmiyor", () => {
    const hook = vi.fn();
    const { monitor, reader } = harness(hook);
    expect(monitor.sendPrompt("p1", "[Gorev a] iş")).toBe("ok");
    expect(reader.lines).toEqual(["[Gorev a] iş"]);
    expect(hook).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Kırmızı test (pano)** — `tests/boardManager.test.ts`

Başa, mevcut `import { createBoardManager } from "../app-electron/main/boardManager";` satırını şununla değiştir:

```ts
import { createBoardManager, type BoardManagerDeps } from "../app-electron/main/boardManager";
```

`function harness(opts: { verify?: string[]; files?: Record<string, BoardFileResult> } = {}) {` satırını şununla değiştir:

```ts
function harness(opts: { verify?: string[]; files?: Record<string, BoardFileResult>; onDispatched?: BoardManagerDeps["onDispatched"] } = {}) {
```

Aynı fonksiyondaki

```ts
    log: (tag, fields) => logs.push([tag, fields])
  });
  const board = () => manager.get("w1")!;
```

bloğunu şununla değiştir:

```ts
    log: (tag, fields) => logs.push([tag, fields]),
    ...(opts.onDispatched ? { onDispatched: opts.onDispatched } : {})
  });
  const board = () => manager.get("w1")!;
```

Dosyanın SONUNA:

```ts
describe("Değişiklikler kancası (spec 2026-10-18 degisiklikler §4.1)", () => {
  it("oto ve elle dağıtımda yazma başarılıysa onDispatched alan, bölme, alt görev ve başlıkla; reddedilen yazımda yok", () => {
    const calls: [string, string, string, string][] = [];
    const h = harness({ onDispatched: (ws, paneId, subtaskId, title) => void calls.push([ws, paneId, subtaskId, title]) });
    approvedTask(h, [draft("a"), draft("b")]);
    h.state.agents = [presence("p1", exact("idle"))];
    h.manager.tick();
    expect(calls).toEqual([["w1", "p1", "a", "Alt a"]]);
    h.state.agents = [presence("p1", exact("running")), presence("p2", { state: "idle", source: "estimated", lastActivity: 900 })];
    h.state.promptResult = "notRunning";
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: false, reason: "notEligible" });
    expect(calls).toHaveLength(1);
    h.state.promptResult = "ok";
    expect(h.manager.command("w1", { type: "assign", taskId: "id1", subtaskId: "b", paneId: "p2" })).toEqual({ ok: true, taskId: "id1" });
    expect(calls.at(-1)).toEqual(["w1", "p2", "b", "Alt b"]);
  });

  it("onDispatched fırlatsa da dağıtım sürüyor", () => {
    const h = harness({
      onDispatched: () => {
        throw new Error("değişiklik yöneticisi patladı");
      }
    });
    approvedTask(h);
    h.state.agents = [presence("p1", exact("idle"))];
    expect(() => h.manager.tick()).not.toThrow();
    expect(h.task().subtasks[0]).toMatchObject({ state: "running", paneId: "p1" });
  });
});
```

- [ ] **Step 3: Kırmızıyı gör**

Run: `npx vitest run tests/changesHooks.test.ts tests/boardManager.test.ts`
Expected: FAIL — `changesHooks`: "Enter ile biten satır…" (kanca hiç çağrılmıyor; `toHaveBeenCalledWith`'te düşer); öbür üçü koruyucu test, şimdiden geçer. `boardManager`: yeni iki testten ilki (`calls` boş). `npm run typecheck` `onPromptLine`/`onDispatched` için bilinmeyen özellik der.

- [ ] **Step 4: İzleyici** — `app-electron/main/agentMonitor.ts`

`MonitorDeps` arayüzünde `schedule?(fn: () => void, ms: number): void;` satırının ALTINA:

```ts
  /**
   * Değişiklikler (spec 2026-10-18 degisiklikler §4.2): kullanıcı bölmede bir
   * satırı Enter ile gönderdi ve motor açık. Senkron dönmeli; iş arka planda.
   */
  onPromptLine?(reg: AgentRegistration, line: string): void;
```

`onInput` gövdesindeki

```ts
      guard(() => {
        for (const line of entry.input.feed(data)) entry.reader.submitLine(line);
      });
```

bloğunu şununla değiştir:

```ts
      guard(() => {
        for (const line of entry.input.feed(data)) {
          // Motor kapalıyken (kabuk istemi ekranda) yazılan satır istem değil.
          // Kancanın hatası satırın okuyucuya gitmesini engellemiyor.
          if (entry.last?.state !== "finished") guard(() => deps.onPromptLine?.(entry.reg, line));
          entry.reader.submitLine(line);
        }
      });
```

- [ ] **Step 5: Pano yöneticisi** — `app-electron/main/boardManager.ts`

`BoardManagerDeps` arayüzünde `log(tag: string, fields: LogFields): void;` satırının ALTINA:

```ts
  /**
   * Değişiklikler (spec 2026-10-18 degisiklikler §4.1): alt görevin istemi
   * ajana yazıldı (Enter 150 ms sonra). Senkron dönmeli; iş arka planda.
   */
  onDispatched?(workspaceId: string, paneId: string, subtaskId: string, title: string): void;
```

`reconcile` içindeki

```ts
      if (result !== "ok") continue;
      const next = mapSubtask(task, sub.id, (s) => assignSubtask(s, d.paneId, now));
```

satırlarını şununla değiştir:

```ts
      if (result !== "ok") continue;
      attempt(() => deps.onDispatched?.(workspaceId, d.paneId, sub.id, sub.title), undefined);
      const next = mapSubtask(task, sub.id, (s) => assignSubtask(s, d.paneId, now));
```

`deliver` içindeki

```ts
    if (result !== "ok") return fail(promptFailure(result));
```

satırını şununla değiştir:

```ts
    if (result !== "ok") return fail(promptFailure(result));
    const dispatchedTitle = task.subtasks.find((s) => s.id === subtaskId)?.title ?? "";
    attempt(() => deps.onDispatched?.(workspaceId, paneId, subtaskId, dispatchedTitle), undefined);
```

- [ ] **Step 6: Yeşili gör**

Run: `npx vitest run tests/changesHooks.test.ts tests/boardManager.test.ts tests/agentMonitor.test.ts`
Expected: PASS (hepsi; mevcut izleyici ve pano testleri değişmeden geçer).

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 7: Commit**

```bash
git add app-electron/main/agentMonitor.ts app-electron/main/boardManager.ts tests/changesHooks.test.ts tests/boardManager.test.ts
git commit -m "Degisiklikler: izleyici istem ve pano dagitim kancalari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ana süreç bağlantısı — canlı bağımlılıklar, IPC, kancalar, kapanış; preload ve tipler

**Files:**
- Create: `app-electron/main/changesLive.ts`
- Modify: `app-electron/main/index.ts` (içe aktarmalar, `agentMonitor` ve `boardManager` bağımlılıkları, yeni `changesManager`, `stopBoardManager`, `board:dropWorkspace`, yeni `changes:*` işleyicileri)
- Modify: `app-electron/preload/index.ts`, `src/window.d.ts`
- Test: `tests/changesIpcWiring.test.ts` (yeni; kaynak düzeyinde kilit, `boardIpcWiring.test.ts` kalıbı)

**Interfaces:**
- Consumes: Task 2 (`readCheckpointFile`, `writeCheckpointFile`, `deleteCheckpointFiles`, `privateIndexFile`, `restoreIndexFile`), Task 3 (`createGitPort`, `insideRootReal`), Task 4 (`createChangesManager`, `ChangesManagerDeps`), Task 5 kancaları, Task 1 (`isSafeRelPath`, `readRevertPaths`, türler); mevcut `boardWorkspaceInfo`, `isBoardId`, `loadConfig`, `appLog`, `randomUUID`.
- Produces (renderer, Task 7–9):

```ts
// window.api (preload + src/window.d.ts)
changesState: (workspaceId: string) => Promise<ChangesState | null>;
changesLive: (workspaceId: string) => Promise<RangeResult>;
changesRange: (workspaceId: string, checkpointId: string) => Promise<RangeResult>;
changesDiff: (workspaceId: string, checkpointId: string, path: string) => Promise<DiffResult>;
changesCheckpoint: (workspaceId: string) => Promise<SnapshotResult>;
changesAccept: (workspaceId: string, checkpointId: string) => Promise<ChangesCommandResult>;
changesPrepareRevert: (workspaceId: string, checkpointId: string) => Promise<PrepareRevertResult>;
changesRevert: (workspaceId: string, checkpointId: string, paths: string[]) => Promise<RevertResult>;
onChangesChanged: (callback: (state: ChangesState) => void) => () => void;
// IPC kanalları: "changes:state", "changes:live", "changes:range", "changes:diff", "changes:checkpoint",
// "changes:accept", "changes:prepareRevert", "changes:revert"; olay "changes:changed".
```

- [ ] **Step 1: Kırmızı test** — `tests/changesIpcWiring.test.ts`

```ts
// Değişiklikler IPC bağlantıları ve güvenlik kuralları — kaynak düzeyinde kilit
// (bkz. boardIpcWiring.test.ts). Spec 2026-10-18 degisiklikler §2, §6, §7.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");
const live = read("app-electron", "main", "changesLive.ts");
const git = read("app-electron", "main", "changesGit.ts");
const manager = read("app-electron", "main", "changesManager.ts");

const CHANNELS = ["changes:state", "changes:live", "changes:range", "changes:diff", "changes:checkpoint", "changes:accept", "changes:prepareRevert", "changes:revert"];

describe("Değişiklikler — IPC bağlantısı", () => {
  it("kanallar ana süreçte, preload'da ve tiplerde; olay changes:changed", () => {
    for (const channel of [...CHANNELS, "changes:changed"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["changesState:", "changesLive:", "changesRange:", "changesDiff:", "changesCheckpoint:", "changesAccept:", "changesPrepareRevert:", "changesRevert:", "onChangesChanged:"]) {
      expect(types, name).toContain(name);
    }
  });

  it("her kanal kayıtlı alan kapısından geçiyor (boardWorkspaceInfo)", () => {
    for (const channel of CHANNELS) expect(main, channel).toMatch(new RegExp(`"${channel}"[\\s\\S]{0,200}changesWorkspace\\(`));
    expect(main).toMatch(/const changesWorkspace = [\s\S]{0,300}isBoardId\([\s\S]{0,300}boardWorkspaceInfo\(/);
  });

  it("renderer serbest yol gönderemez: diff yolu isSafeRelPath, geri alma listesi readRevertPaths", () => {
    expect(main).toMatch(/"changes:diff"[\s\S]{0,500}isSafeRelPath\(/);
    expect(main).toMatch(/"changes:revert"[\s\S]{0,600}readRevertPaths\(/);
  });

  it("yöneticinin klasörü yalnız config'teki alan kaydından", () => {
    expect(main).toMatch(/createChangesManager\(\{[\s\S]{0,1200}workspace:\s*\(id\)\s*=>[\s\S]{0,200}boardWorkspaceInfo\(/);
  });

  it("kancalar bağlı: istem satırı ve pano dağıtımı", () => {
    expect(main).toMatch(/onPromptLine:\s*\(reg, line\)\s*=>\s*changesManager\.onPromptLine\(reg, line\)/);
    expect(main).toMatch(/onDispatched:\s*\(workspaceId, paneId, subtaskId, title\)\s*=>\s*changesManager\.onDispatched\(workspaceId, paneId, subtaskId, title\)/);
  });

  it("alan kapatmada kayıtlar da siliniyor; kapanışta yönetici duruyor", () => {
    expect(main).toMatch(/"board:dropWorkspace"[\s\S]{0,600}changesManager\.drop\(/);
    expect(main).toMatch(/function stopBoardManager[\s\S]{0,300}changesManager\.dispose\(\)/);
  });

  it("eklenen dosya kalıcı silinmiyor: yalnız shell.trashItem", () => {
    expect(live).toContain("shell.trashItem(");
    expect(live).not.toMatch(/unlink|rmSync|rmdir|\brm\(/);
  });

  it("git yalnız execFile, kabuksuz; kullanıcının HEAD/dal/stash/ref'ini değiştiren komut yok", () => {
    expect(git).toContain('execFile(\n        "git"');
    expect(git).not.toMatch(/shell:\s*true/);
    expect(git).not.toMatch(/\bexec\(|\bspawn\(|execSync|spawnSync/);
    for (const forbidden of ['"commit"', '"stash"', '"reset"', '"checkout"', '"update-ref"', '"gc"', '"init"', '"switch"', '"restore"']) {
      expect(git, forbidden).not.toContain(forbidden);
    }
  });

  it("günlükte yalnız iki etiket", () => {
    const tags = new Set([...manager.matchAll(/log\("([^"]+)"/g)].map((m) => m[1]));
    expect([...tags].sort()).toEqual(["degisiklik.geriAl", "degisiklik.goruntu"]);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesIpcWiring.test.ts`
Expected: FAIL — `changesLive.ts` yok (okuma hatası); kanallar yok.

- [ ] **Step 3: Canlı bağımlılıklar** — `app-electron/main/changesLive.ts`

```ts
// Değişikliklerin CANLI bağımlılıkları (spec 2026-10-18 degisiklikler). İnce
// ve test edilmiyor: mantık changesManager.ts, changesGit.ts ve changesFs.ts'te,
// orada sahtelerle ve gerçek geçici depoyla test ediliyor. Bu dosya
// electron'u çekiyor; testler bunu İÇE AKTARMAMALI.
import { app, shell } from "electron";
import { lstatSync, statSync } from "node:fs";
import path from "node:path";
import { insideRootReal } from "./changesFs";
import { createGitPort } from "./changesGit";
import type { ChangesManagerDeps } from "./changesManager";

export function checkpointsDir(): string {
  return path.join(app.getPath("userData"), "checkpoints");
}

const absolute = (root: string, rel: string) => path.join(root, ...rel.split("/"));

export function liveChangesPorts(): Pick<ChangesManagerDeps, "git" | "dirExists" | "insideRoot" | "pathExists" | "trash"> {
  return {
    git: createGitPort(),
    dirExists: (dir) => {
      try {
        return statSync(dir).isDirectory();
      } catch {
        return false;
      }
    },
    insideRoot: insideRootReal,
    pathExists: (root, rel) => {
      try {
        lstatSync(absolute(root, rel));
        return true;
      } catch {
        return false;
      }
    },
    // Kalıcı silme yok: işletim sisteminin çöp kutusu (spec §6.3).
    trash: (root, rel) => shell.trashItem(absolute(root, rel))
  };
}
```

- [ ] **Step 4: Ana süreç** — `app-electron/main/index.ts`

(a) İçe aktarmalar: `import { boardsDir, liveLeadDeps, liveVerifyDeps } from "./boardLive";` satırının ALTINA:

```ts
import { createChangesManager } from "./changesManager";
import { deleteCheckpointFiles, privateIndexFile, readCheckpointFile, restoreIndexFile, writeCheckpointFile } from "./changesStore";
import { checkpointsDir, liveChangesPorts } from "./changesLive";
import { isSafeRelPath, readRevertPaths } from "../shared/changesLogic";
import type { ChangesFailure } from "../shared/changesTypes";
```

(b) İzleyici kancası: `createAgentMonitor({` çağrısındaki

```ts
  backlog: (ptyId) => getTerminalBuffer(ptyId).slice(-4_000),
  log: (tag, fields) => appLog(tag, fields)
});
let agentMonitorTimer: NodeJS.Timeout | null = null;
```

bloğunu şununla değiştir:

```ts
  backlog: (ptyId) => getTerminalBuffer(ptyId).slice(-4_000),
  log: (tag, fields) => appLog(tag, fields),
  // Değişiklikler (spec 2026-10-18 degisiklikler §4.2): istem öncesi görüntü; senkron döner.
  onPromptLine: (reg, line) => changesManager.onPromptLine(reg, line)
});
let agentMonitorTimer: NodeJS.Timeout | null = null;
```

(c) Pano kancası ve yönetici: `createBoardManager({` çağrısının sonundaki

```ts
  notify: (kind, workspaceId, title) => showBoardNotification(workspaceId, title, kind),
  log: (tag, fields) => appLog(tag, fields)
});
let boardTimer: NodeJS.Timeout | null = null;
```

bloğunu şununla değiştir:

```ts
  notify: (kind, workspaceId, title) => showBoardNotification(workspaceId, title, kind),
  log: (tag, fields) => appLog(tag, fields),
  // Değişiklikler (spec 2026-10-18 degisiklikler §4.1): dağıtım görüntüsü; senkron döner.
  onDispatched: (workspaceId, paneId, subtaskId, title) => changesManager.onDispatched(workspaceId, paneId, subtaskId, title)
});

// Değişiklikler yöneticisi (spec 2026-10-18 degisiklikler). Klasör YALNIZ
// config.json'daki alan kaydından (boardWorkspaceInfo); dosya yolu yalnız
// kaydın aralığından (yönetici denetliyor). Kancalar bu nesneyi geç çağırıyor.
const changesManager = createChangesManager({
  now: () => Date.now(),
  newId: () => randomUUID(),
  store: {
    read: (id) => readCheckpointFile(checkpointsDir(), id, Date.now()),
    write: (id, list) => writeCheckpointFile(checkpointsDir(), id, list),
    remove: (id) => deleteCheckpointFiles(checkpointsDir(), id),
    indexFile: (id) => privateIndexFile(checkpointsDir(), id),
    restoreIndexFile: (id) => restoreIndexFile(checkpointsDir(), id)
  },
  ...liveChangesPorts(),
  workspace: (id) => {
    const cfg = loadConfig();
    const info = boardWorkspaceInfo(cfg.terminalWorkspaces, cfg.axetWorkspaceDir, id);
    return info ? { cwd: info.cwd } : null;
  },
  agents: () => agentMonitor.agents(),
  emit: (state) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("changes:changed", state);
  },
  log: (tag, fields) => appLog(tag, fields)
});
let boardTimer: NodeJS.Timeout | null = null;
```

(d) Kapanış: `stopBoardManager` fonksiyonunu şununla değiştir:

```ts
function stopBoardManager(): void {
  if (boardTimer) clearInterval(boardTimer);
  boardTimer = null;
  boardManager.dispose();
  try {
    changesManager.dispose();
  } catch {
    // kapanışta yönetici hatası önemsiz
  }
}
```

(e) Alan kapatma: `ipcMain.handle("board:dropWorkspace", …)` gövdesindeki mevcut `try { boardManager.drop(workspaceId); } catch { … }` bloğunun ALTINA (aynı işleyicinin içinde):

```ts
    // Değişiklik kayıtları da (spec sapma 14); ağaç nesneleri depoda kalır.
    try {
      changesManager.drop(workspaceId);
    } catch {
      // silinemeyen kayıt dosyası öksüz kalır; veri kaybından iyidir
    }
```

(f) IPC: `ipcMain.handle("board:command", …)` işleyicisinin kapanışından (`  });`) sonra, `  if (!boardTimer) {` satırının hemen ÖNÜNE:

```ts
  // Değişiklikler (spec 2026-10-18 degisiklikler §5–§7). Alan yalnız config'teki
  // kayıtlı alan; kayıt kimliği deseni; dosya yolu güvenli VE yöneticide o
  // kaydın o anki aralığında. Renderer serbest yol gönderemez.
  const changesWorkspace = (workspaceId: unknown): string | null => {
    if (!isBoardId(workspaceId)) return null;
    const cfg = loadConfig();
    return boardWorkspaceInfo(cfg.terminalWorkspaces, cfg.axetWorkspaceDir, workspaceId) ? workspaceId : null;
  };
  const changesFail = (reason: ChangesFailure) => ({ ok: false as const, reason });
  const noRevert = (reason: ChangesFailure) => ({ ok: false, reason, restored: [], trashed: [], skipped: [] });

  ipcMain.handle("changes:state", async (_event, workspaceId: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return null;
    try {
      return await changesManager.state(ws);
    } catch {
      return null;
    }
  });

  ipcMain.handle("changes:live", async (_event, workspaceId: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return changesFail("noWorkspace");
    try {
      return await changesManager.live(ws);
    } catch {
      return changesFail("git");
    }
  });

  ipcMain.handle("changes:range", async (_event, workspaceId: unknown, checkpointId: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return changesFail("noWorkspace");
    if (!isBoardId(checkpointId)) return changesFail("invalid");
    try {
      return await changesManager.range(ws, checkpointId);
    } catch {
      return changesFail("git");
    }
  });

  ipcMain.handle("changes:diff", async (_event, workspaceId: unknown, checkpointId: unknown, filePath: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return changesFail("noWorkspace");
    if (!isBoardId(checkpointId) || !isSafeRelPath(filePath)) return changesFail("invalid");
    try {
      return await changesManager.fileDiff(ws, checkpointId, filePath);
    } catch {
      return changesFail("git");
    }
  });

  ipcMain.handle("changes:checkpoint", async (_event, workspaceId: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return changesFail("noWorkspace");
    try {
      return await changesManager.snapshot(ws, "manual", { paneId: null, agentName: null, subtaskId: null, label: "" });
    } catch {
      return changesFail("git");
    }
  });

  ipcMain.handle("changes:accept", (_event, workspaceId: unknown, checkpointId: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return changesFail("noWorkspace");
    if (!isBoardId(checkpointId)) return changesFail("invalid");
    try {
      return changesManager.accept(ws, checkpointId);
    } catch {
      return changesFail("writeFailed");
    }
  });

  ipcMain.handle("changes:prepareRevert", async (_event, workspaceId: unknown, checkpointId: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return changesFail("noWorkspace");
    if (!isBoardId(checkpointId)) return changesFail("invalid");
    try {
      return await changesManager.prepareRevert(ws, checkpointId);
    } catch {
      return changesFail("git");
    }
  });

  ipcMain.handle("changes:revert", async (_event, workspaceId: unknown, checkpointId: unknown, paths: unknown) => {
    const ws = changesWorkspace(workspaceId);
    if (!ws) return noRevert("noWorkspace");
    const list = readRevertPaths(paths);
    if (!isBoardId(checkpointId) || !list) return noRevert("invalid");
    try {
      return await changesManager.revert(ws, checkpointId, list);
    } catch {
      return noRevert("git");
    }
  });

```

- [ ] **Step 5: Preload** — `app-electron/preload/index.ts`

`import type { BoardCommand, BoardCommandResult } from "../shared/boardCommands";` satırının ALTINA:

```ts
import type {
  ChangesCommandResult,
  ChangesState,
  DiffResult,
  PrepareRevertResult,
  RangeResult,
  RevertResult,
  SnapshotResult
} from "../shared/changesTypes";
```

`onBoardOpen` bloğunun (…`return () => ipcRenderer.removeListener("board:open", listener);` + `  },`) hemen ALTINA:

```ts
  // Değişiklikler (spec 2026-10-18 degisiklikler §5): yol yalnız ana sürecin verdiği listeden.
  changesState: (workspaceId: string): Promise<ChangesState | null> => ipcRenderer.invoke("changes:state", workspaceId),
  changesLive: (workspaceId: string): Promise<RangeResult> => ipcRenderer.invoke("changes:live", workspaceId),
  changesRange: (workspaceId: string, checkpointId: string): Promise<RangeResult> =>
    ipcRenderer.invoke("changes:range", workspaceId, checkpointId),
  changesDiff: (workspaceId: string, checkpointId: string, path: string): Promise<DiffResult> =>
    ipcRenderer.invoke("changes:diff", workspaceId, checkpointId, path),
  changesCheckpoint: (workspaceId: string): Promise<SnapshotResult> => ipcRenderer.invoke("changes:checkpoint", workspaceId),
  changesAccept: (workspaceId: string, checkpointId: string): Promise<ChangesCommandResult> =>
    ipcRenderer.invoke("changes:accept", workspaceId, checkpointId),
  changesPrepareRevert: (workspaceId: string, checkpointId: string): Promise<PrepareRevertResult> =>
    ipcRenderer.invoke("changes:prepareRevert", workspaceId, checkpointId),
  changesRevert: (workspaceId: string, checkpointId: string, paths: string[]): Promise<RevertResult> =>
    ipcRenderer.invoke("changes:revert", workspaceId, checkpointId, paths),
  onChangesChanged: (callback: (state: ChangesState) => void) => {
    const listener = (_event: unknown, state: ChangesState) => callback(state);
    ipcRenderer.on("changes:changed", listener);
    return () => ipcRenderer.removeListener("changes:changed", listener);
  },
```

- [ ] **Step 6: Tipler** — `src/window.d.ts`

`import type { BoardCommand, BoardCommandResult } from "../app-electron/shared/boardCommands";` satırının ALTINA:

```ts
import type {
  ChangesCommandResult,
  ChangesState,
  DiffResult,
  PrepareRevertResult,
  RangeResult,
  RevertResult,
  SnapshotResult
} from "../app-electron/shared/changesTypes";
```

`  onBoardOpen: (callback: (workspaceId: string) => void) => () => void;` satırının ALTINA:

```ts
  changesState: (workspaceId: string) => Promise<ChangesState | null>;
  changesLive: (workspaceId: string) => Promise<RangeResult>;
  changesRange: (workspaceId: string, checkpointId: string) => Promise<RangeResult>;
  changesDiff: (workspaceId: string, checkpointId: string, path: string) => Promise<DiffResult>;
  changesCheckpoint: (workspaceId: string) => Promise<SnapshotResult>;
  changesAccept: (workspaceId: string, checkpointId: string) => Promise<ChangesCommandResult>;
  changesPrepareRevert: (workspaceId: string, checkpointId: string) => Promise<PrepareRevertResult>;
  changesRevert: (workspaceId: string, checkpointId: string, paths: string[]) => Promise<RevertResult>;
  onChangesChanged: (callback: (state: ChangesState) => void) => () => void;
```

- [ ] **Step 7: Yeşili gör**

Run: `npx vitest run tests/changesIpcWiring.test.ts tests/boardIpcWiring.test.ts tests/agentIpcWiring.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz. (`changesManager` modül düzeyinde `agentMonitor`'dan SONRA tanımlı; izleyicinin `onPromptLine` oku onu yalnız çağrıldığında okuyor, tanımdan önce çağrılmıyor. TypeScript ok fonksiyon içindeki ileri başvuruya izin verir.)

- [ ] **Step 8: Commit**

```bash
git add app-electron/main/changesLive.ts app-electron/main/index.ts app-electron/preload/index.ts src/window.d.ts tests/changesIpcWiring.test.ts
git commit -m "Degisiklikler: IPC, kancalarin baglanmasi, preload ve tipler

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Renderer veri katmanı — görünüm yardımcıları, durum kancası, pano→görünüm odak bağlamı

**Files:**
- Create: `src/changes/changesFormat.ts`
- Create: `src/changes/useChanges.ts`
- Create: `src/changes/changesFocus.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts` (sözlüğün sonuna `changes.*` anahtarları)
- Test: `tests/changesFormat.test.tsx` (yeni)

**Interfaces:**
- Consumes: Task 1 türleri; Task 6 `window.api.changesState`, `window.api.onChangesChanged`.
- Produces (Task 8, 9):

```ts
// changesFormat.ts
export const REASON_KEY: Record<CheckpointReason, TranslationKey>;
export const REVIEW_KEY: Record<ReviewState, TranslationKey>;
export const FAILURE_KEY: Record<ChangesFailure, TranslationKey>;
export const REPO_KEY: Record<"notRepo" | "noGit" | "missingDir", TranslationKey>;
export const STATUS_KEY: Record<FileStatus, TranslationKey>;
export const STATUS_MARK: Record<FileStatus, string>;                 // "A" | "M" | "D"
export function newestFirst(list: readonly Checkpoint[]): Checkpoint[];
export function latestForSubtask(list: readonly Checkpoint[], subtaskId: string): Checkpoint | null;
export function clockLabel(ms: number, now: number): string;          // bugünse "HH:MM", değilse "GG.AA HH:MM"
export function canAccept(cp: Checkpoint): boolean;                   // yalnız pending
export function canRevert(cp: Checkpoint, expired: readonly string[]): boolean; // süresi dolmamış, reverted değil

// useChanges.ts
export function useChangesState(workspaceId: string): { state: ChangesState | null; refresh: () => void };

// changesFocus.tsx
export interface ChangesFocus { workspaceId: string; subtaskId: string }
export interface ChangesFocusValue { focus: ChangesFocus | null; requestFocus: (workspaceId: string, subtaskId: string) => void; clearFocus: () => void }
export const ChangesFocusContext: React.Context<ChangesFocusValue>;  // varsayılan: no-op (sağlayıcısız testler çökmesin)
export function ChangesFocusProvider(props: { children: ReactNode }): JSX.Element;
export function useChangesFocus(): ChangesFocusValue;
```

- [ ] **Step 1: Kırmızı test** — `tests/changesFormat.test.tsx`

```tsx
// @vitest-environment jsdom
// Değişiklikler: renderer veri katmanı (spec 2026-10-18 degisiklikler §5).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  canAccept,
  canRevert,
  clockLabel,
  FAILURE_KEY,
  latestForSubtask,
  newestFirst,
  REASON_KEY,
  REPO_KEY,
  REVIEW_KEY,
  STATUS_KEY
} from "../src/changes/changesFormat";
import { useChangesState } from "../src/changes/useChanges";
import { ChangesFocusProvider, useChangesFocus } from "../src/changes/changesFocus";
import { tr } from "../src/i18n/tr";
import { en } from "../src/i18n/en";
import { CHANGES_FAILURES, type ChangesState, type Checkpoint } from "../app-electron/shared/changesTypes";

const cp = (id: string, n: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "a",
  tree: n.toString(16).padStart(40, "0"),
  createdAt: n,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: "",
  reviewed: "pending",
  ...over
});

describe("saf yardımcılar", () => {
  it("bütün anahtar tabloları iki dilde var", () => {
    const keys = [...Object.values(REASON_KEY), ...Object.values(REVIEW_KEY), ...Object.values(REPO_KEY), ...Object.values(STATUS_KEY), ...CHANGES_FAILURES.map((f) => FAILURE_KEY[f])];
    for (const key of keys) {
      expect(tr[key], key).toBeTruthy();
      expect(en[key as keyof typeof en], key).toBeTruthy();
    }
  });

  it("newestFirst kopya; latestForSubtask en yeni eşleşme ya da null", () => {
    const list = [cp("a", 1, { subtaskId: "s1" }), cp("b", 2), cp("c", 3, { subtaskId: "s1" })];
    expect(newestFirst(list).map((c) => c.id)).toEqual(["c", "b", "a"]);
    expect(list.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(latestForSubtask(list, "s1")?.id).toBe("c");
    expect(latestForSubtask(list, "s9")).toBeNull();
  });

  it("clockLabel: bugünse saat:dakika, değilse gün.ay saat:dakika", () => {
    const now = new Date(2026, 9, 18, 14, 0).getTime();
    expect(clockLabel(new Date(2026, 9, 18, 9, 5).getTime(), now)).toBe("09:05");
    expect(clockLabel(new Date(2026, 9, 17, 23, 59).getTime(), now)).toBe("17.10 23:59");
  });

  it("canAccept yalnız pending; canRevert süresi dolmamış ve geri alınmamış", () => {
    expect(canAccept(cp("a", 1))).toBe(true);
    expect(canAccept(cp("a", 1, { reviewed: "accepted" }))).toBe(false);
    expect(canRevert(cp("a", 1), [])).toBe(true);
    expect(canRevert(cp("a", 1, { reviewed: "accepted" }), [])).toBe(true);
    expect(canRevert(cp("a", 1, { reviewed: "reverted" }), [])).toBe(false);
    expect(canRevert(cp("a", 1), ["a"])).toBe(false);
  });
});

describe("useChangesState", () => {
  let listener: ((s: ChangesState) => void) | null = null;
  const off = vi.fn();
  let resolveState: (s: ChangesState | null) => void = () => {};
  let prevApi: unknown;
  beforeEach(() => {
    prevApi = (window as unknown as { api?: unknown }).api;
    listener = null;
    off.mockClear();
    (window as unknown as { api: unknown }).api = {
      changesState: vi.fn(
        () =>
          new Promise<ChangesState | null>((r) => {
            resolveState = r;
          })
      ),
      onChangesChanged: vi.fn((cb: (s: ChangesState) => void) => {
        listener = cb;
        return off;
      })
    };
  });
  afterEach(() => {
    cleanup();
    (window as unknown as { api: unknown }).api = prevApi;
  });

  function Probe({ id }: { id: string }) {
    const { state } = useChangesState(id);
    return <span data-testid="durum">{state ? `${state.workspaceId}:${state.checkpoints.length}` : "yok"}</span>;
  }
  const st = (workspaceId: string, n: number): ChangesState => ({ workspaceId, repo: "ok", checkpoints: Array.from({ length: n }, (_, i) => cp(`c${i}`, i + 1)), expired: [] });

  it("ilk durum yükleniyor; başka alanın olayı yok sayılıyor; aynı alanın olayı uygulanıyor; sökülünce abonelik kalkıyor", async () => {
    const { unmount } = render(<Probe id="a" />);
    expect(screen.getByTestId("durum").textContent).toBe("yok");
    await act(async () => resolveState(st("a", 1)));
    expect(screen.getByTestId("durum").textContent).toBe("a:1");
    act(() => listener?.(st("b", 5)));
    expect(screen.getByTestId("durum").textContent).toBe("a:1");
    act(() => listener?.(st("a", 2)));
    expect(screen.getByTestId("durum").textContent).toBe("a:2");
    unmount();
    expect(off).toHaveBeenCalled();
  });

  it("olay ilk yanıttan önce geldiyse eski yanıt onu ezmiyor", async () => {
    render(<Probe id="a" />);
    act(() => listener?.(st("a", 3)));
    await act(async () => resolveState(st("a", 1)));
    expect(screen.getByTestId("durum").textContent).toBe("a:3");
  });
});

describe("ChangesFocusProvider", () => {
  afterEach(cleanup);

  function Probe() {
    const { focus, requestFocus, clearFocus } = useChangesFocus();
    return (
      <div>
        <span data-testid="odak">{focus ? `${focus.workspaceId}/${focus.subtaskId}` : "yok"}</span>
        <button onClick={() => requestFocus("a", "s1")}>iste</button>
        <button onClick={clearFocus}>temizle</button>
      </div>
    );
  }

  it("sağlayıcısız no-op; sağlayıcıyla iste/temizle", () => {
    render(<Probe />);
    act(() => screen.getByText("iste").click());
    expect(screen.getByTestId("odak").textContent).toBe("yok");
    cleanup();
    render(
      <ChangesFocusProvider>
        <Probe />
      </ChangesFocusProvider>
    );
    act(() => screen.getByText("iste").click());
    expect(screen.getByTestId("odak").textContent).toBe("a/s1");
    act(() => screen.getByText("temizle").click());
    expect(screen.getByTestId("odak").textContent).toBe("yok");
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesFormat.test.tsx`
Expected: FAIL — `src/changes/*` modülleri yok.

- [ ] **Step 3: Metinler** — `src/i18n/tr.ts` ve `src/i18n/en.ts`

`tr.ts`'te sözlüğün son satırı `  "office.view": "Ofis"` → `  "office.view": "Ofis",` yap ve ALTINA:

```ts
  "changes.reasonPrompt": "İstem",
  "changes.reasonDispatch": "Pano ataması",
  "changes.reasonManual": "Elle geri alma noktası",
  "changes.reasonBeforeRestore": "Geri almadan önce",
  "changes.reviewPending": "Bekliyor",
  "changes.reviewAccepted": "Kabul edildi",
  "changes.reviewReverted": "Geri alındı",
  "changes.failInvalid": "Geçersiz istek.",
  "changes.failNoWorkspace": "Alan bulunamadı.",
  "changes.failNotRepo": "Bu klasör bir Git deposu değil.",
  "changes.failNoGit": "Git bulunamadı.",
  "changes.failMissingDir": "Alanın klasörü bulunamadı.",
  "changes.failNotFound": "Kayıt bulunamadı.",
  "changes.failExpired": "Bu kaydın süresi doldu: Git eski nesneleri temizlemiş.",
  "changes.failLocked": "Git index'i kilitli; biraz sonra yeniden dene.",
  "changes.failTimeout": "Git zamanında cevap vermedi.",
  "changes.failGit": "Git komutu başarısız oldu.",
  "changes.failNotInRange": "Bu dosya artık bu kaydın değişikliklerinde değil.",
  "changes.failSnapshotFailed": "Geri almadan önce geri alma noktası alınamadı; hiçbir dosyaya dokunulmadı.",
  "changes.failWriteFailed": "Bir dosya yazılamadı; işlem durduruldu.",
  "changes.failBusy": "Bu alanda başka bir geri alma sürüyor.",
  "changes.repoNotRepo": "Bu klasör bir Git deposu değil; değişiklik izleme yalnız Git depolarında çalışır.",
  "changes.repoNoGit": "Git bulunamadı; değişiklik izleme için Git'in kurulu ve PATH'te olması gerekir.",
  "changes.repoMissingDir": "Alanın klasörü bulunamadı.",
  "changes.statusAdded": "Eklendi",
  "changes.statusModified": "Değişti",
  "changes.statusDeleted": "Silindi"
```

`en.ts`'te son satır `  "office.view": "Office"` → `  "office.view": "Office",` yap ve ALTINA:

```ts
  "changes.reasonPrompt": "Prompt",
  "changes.reasonDispatch": "Board assignment",
  "changes.reasonManual": "Manual restore point",
  "changes.reasonBeforeRestore": "Before revert",
  "changes.reviewPending": "Pending",
  "changes.reviewAccepted": "Accepted",
  "changes.reviewReverted": "Reverted",
  "changes.failInvalid": "Invalid request.",
  "changes.failNoWorkspace": "Workspace not found.",
  "changes.failNotRepo": "This folder is not a Git repository.",
  "changes.failNoGit": "Git was not found.",
  "changes.failMissingDir": "The workspace folder was not found.",
  "changes.failNotFound": "Record not found.",
  "changes.failExpired": "This record has expired: Git cleaned up old objects.",
  "changes.failLocked": "The Git index is locked; try again shortly.",
  "changes.failTimeout": "Git did not respond in time.",
  "changes.failGit": "A Git command failed.",
  "changes.failNotInRange": "This file is no longer part of this record's changes.",
  "changes.failSnapshotFailed": "Could not create a restore point before reverting; no file was touched.",
  "changes.failWriteFailed": "A file could not be written; the operation stopped.",
  "changes.failBusy": "Another revert is running in this workspace.",
  "changes.repoNotRepo": "This folder is not a Git repository; change tracking only works in Git repositories.",
  "changes.repoNoGit": "Git was not found; change tracking needs Git installed and on PATH.",
  "changes.repoMissingDir": "The workspace folder was not found.",
  "changes.statusAdded": "Added",
  "changes.statusModified": "Modified",
  "changes.statusDeleted": "Deleted"
```

- [ ] **Step 4: Görünüm yardımcıları** — `src/changes/changesFormat.ts`

```ts
// Değişiklikler görünümünün saf yardımcıları (spec 2026-10-18 degisiklikler §5).
// Bileşen dosyası ChangesView.tsx; bu dosyanın adı bilerek farklı köklü.
import type { TranslationKey } from "../i18n/tr";
import type { ChangesFailure, Checkpoint, CheckpointReason, FileStatus, ReviewState } from "../../app-electron/shared/changesTypes";

export const REASON_KEY: Record<CheckpointReason, TranslationKey> = {
  prompt: "changes.reasonPrompt",
  dispatch: "changes.reasonDispatch",
  manual: "changes.reasonManual",
  beforeRestore: "changes.reasonBeforeRestore"
};

export const REVIEW_KEY: Record<ReviewState, TranslationKey> = {
  pending: "changes.reviewPending",
  accepted: "changes.reviewAccepted",
  reverted: "changes.reviewReverted"
};

export const FAILURE_KEY: Record<ChangesFailure, TranslationKey> = {
  invalid: "changes.failInvalid",
  noWorkspace: "changes.failNoWorkspace",
  notRepo: "changes.failNotRepo",
  noGit: "changes.failNoGit",
  missingDir: "changes.failMissingDir",
  notFound: "changes.failNotFound",
  expired: "changes.failExpired",
  locked: "changes.failLocked",
  timeout: "changes.failTimeout",
  git: "changes.failGit",
  notInRange: "changes.failNotInRange",
  snapshotFailed: "changes.failSnapshotFailed",
  writeFailed: "changes.failWriteFailed",
  busy: "changes.failBusy"
};

export const REPO_KEY: Record<"notRepo" | "noGit" | "missingDir", TranslationKey> = {
  notRepo: "changes.repoNotRepo",
  noGit: "changes.repoNoGit",
  missingDir: "changes.repoMissingDir"
};

export const STATUS_KEY: Record<FileStatus, TranslationKey> = {
  added: "changes.statusAdded",
  modified: "changes.statusModified",
  deleted: "changes.statusDeleted"
};

export const STATUS_MARK: Record<FileStatus, string> = { added: "A", modified: "M", deleted: "D" };

export function newestFirst(list: readonly Checkpoint[]): Checkpoint[] {
  return [...list].reverse();
}

export function latestForSubtask(list: readonly Checkpoint[], subtaskId: string): Checkpoint | null {
  for (let i = list.length - 1; i >= 0; i--) if (list[i].subtaskId === subtaskId) return list[i];
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function clockLabel(ms: number, now: number): string {
  const d = new Date(ms);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return d.toDateString() === new Date(now).toDateString() ? hm : `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${hm}`;
}

export function canAccept(cp: Checkpoint): boolean {
  return cp.reviewed === "pending";
}

export function canRevert(cp: Checkpoint, expired: readonly string[]): boolean {
  return cp.reviewed !== "reverted" && !expired.includes(cp.id);
}
```

- [ ] **Step 5: Durum kancası** — `src/changes/useChanges.ts`

```ts
// Bir alanın değişiklik durumu (spec 2026-10-18 degisiklikler §5). Tek kaynak
// ana süreçteki yönetici; burada yalnız son yayınladığı. Olay ilk yanıttan önce
// geldiyse eski yanıt onu ezmiyor.
import { useCallback, useEffect, useState } from "react";
import type { ChangesState } from "../../app-electron/shared/changesTypes";

export function useChangesState(workspaceId: string): { state: ChangesState | null; refresh: () => void } {
  const [state, setState] = useState<ChangesState | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    let fromEvent = false;
    const off = window.api.onChangesChanged((next) => {
      if (!alive || next.workspaceId !== workspaceId) return;
      fromEvent = true;
      setState(next);
    });
    window.api.changesState(workspaceId).then(
      (next) => {
        if (alive && !fromEvent && next) setState(next);
      },
      () => {}
    );
    return () => {
      alive = false;
      off();
    };
  }, [workspaceId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  // Alan değiştiyse eski alanın durumu gösterilmiyor.
  return { state: state && state.workspaceId === workspaceId ? state : null, refresh };
}
```

- [ ] **Step 6: Odak bağlamı** — `src/changes/changesFocus.tsx`

```tsx
// Pano ayrıntı panelindeki "Değişiklikler" bağlantısından görünüme: hangi alt
// görevin kaydı seçilsin (spec 2026-10-18 degisiklikler §5). Sağlayıcı
// TerminalMode'da; varsayılan değer no-op, sağlayıcısız çizilen bileşenler çökmüyor.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface ChangesFocus {
  workspaceId: string;
  subtaskId: string;
}

export interface ChangesFocusValue {
  focus: ChangesFocus | null;
  requestFocus: (workspaceId: string, subtaskId: string) => void;
  clearFocus: () => void;
}

export const ChangesFocusContext = createContext<ChangesFocusValue>({
  focus: null,
  requestFocus: () => {},
  clearFocus: () => {}
});

export function ChangesFocusProvider({ children }: { children: ReactNode }) {
  const [focus, setFocus] = useState<ChangesFocus | null>(null);
  const requestFocus = useCallback((workspaceId: string, subtaskId: string) => setFocus({ workspaceId, subtaskId }), []);
  const clearFocus = useCallback(() => setFocus(null), []);
  const value = useMemo(() => ({ focus, requestFocus, clearFocus }), [focus, requestFocus, clearFocus]);
  return <ChangesFocusContext.Provider value={value}>{children}</ChangesFocusContext.Provider>;
}

export function useChangesFocus(): ChangesFocusValue {
  return useContext(ChangesFocusContext);
}
```

- [ ] **Step 7: Yeşili gör**

Run: `npx vitest run tests/changesFormat.test.tsx tests/i18n.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 8: Commit**

```bash
git add src/changes/changesFormat.ts src/changes/useChanges.ts src/changes/changesFocus.tsx src/i18n/tr.ts src/i18n/en.ts tests/changesFormat.test.tsx
git commit -m "Degisiklikler: renderer yardimcilari, durum kancasi, odak baglami

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Değişiklikler görünümü — liste, Canlı satırı, diff görüntüleyici; dört seçenekli geçiş

**Files:**
- Modify: `app-electron/shared/types.ts` (`WorkspaceView`)
- Modify: `app-electron/shared/terminalLayout.ts` (`readWorkspaceView`)
- Create: `src/changes/DiffViewer.tsx`
- Create: `src/changes/ChangesView.tsx`
- Modify: `src/agents/TeamStrip.tsx` (`VIEW_KEY`, `VIEWS`)
- Modify: `src/terminal/TerminalMode.tsx` (odak sağlayıcısı, görünüm bağlantısı)
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Modify: `tests/officeScreen.test.tsx:120` (radyo listesi artık dört)
- Test: `tests/changesView.test.tsx` (yeni)

**Interfaces:**
- Consumes: Task 7 (`useChangesState`, `changesFormat` yardımcıları, `ChangesFocusProvider`); Task 6 `window.api.changesLive`, `changesRange`, `changesDiff`, `changesCheckpoint`; Task 1 (`pendingCount`, `statsOf`, `LIVE_POLL_MS`); mevcut `useTerminalStore`, `PANE_COLOR_VAR`, `TOOL_BUTTON`.
- Produces:

```ts
// types.ts
export type WorkspaceView = "panes" | "board" | "office" | "changes";
// terminalLayout.ts
export function readWorkspaceView(raw: unknown): Exclude<WorkspaceView, "panes"> | undefined; // "changes" de kabul
// src/changes/DiffViewer.tsx
export default function DiffViewer(props: { diff: FileDiff }): JSX.Element;
// src/changes/ChangesView.tsx
export default function ChangesView(props: { workspace: TerminalWorkspace }): JSX.Element;
// DOM kancaları (Task 9 testleri kullanıyor): [data-live-row], [data-checkpoint="<id>"], [data-file="<yol>"],
// [data-actions] (sağ başlıktaki düğme kabı), [data-pending-count], [data-warning], [data-line-kind], [data-diff-note]
```

- [ ] **Step 1: Kırmızı test** — `tests/changesView.test.tsx`

```tsx
// @vitest-environment jsdom
// Değişiklikler görünümü (spec 2026-10-18 degisiklikler §2, §5, §8): depo
// mesajı, liste, Canlı yoklaması, aralık, diff, elle geri alma noktası,
// Terminale git; görünüm kaydı; renk kuralı.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChangesView from "../src/changes/ChangesView";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState, terminalReducer, toSaved } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import { readWorkspaceView } from "../app-electron/shared/terminalLayout";
import type { ChangesState, Checkpoint, DiffResult, FileChange, RangeResult } from "../app-electron/shared/changesTypes";

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
  title,
  color: "blue"
});
const ws: TerminalWorkspace = {
  id: "a",
  name: "Alan a",
  panes: [agentPane("p1", "Ayşe")],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "changes"
};
const NOW = new Date(2026, 9, 18, 14, 0).getTime();
const at = (h: number, m: number) => new Date(2026, 9, 18, h, m).getTime();
const cp = (id: string, createdAt: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "a",
  tree: "0".repeat(40),
  createdAt,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: `istem ${id}`,
  reviewed: "pending",
  ...over
});
const file = (p: string, status: FileChange["status"] = "modified", added = 2, deleted = 1, binary = false): FileChange => ({ path: p, status, added, deleted, binary });
const okRange = (files: FileChange[], toWorkingTree = false): RangeResult => ({ ok: true, files, truncated: false, toWorkingTree });

interface Api {
  changesState: ReturnType<typeof vi.fn>;
  onChangesChanged: ReturnType<typeof vi.fn>;
  changesLive: ReturnType<typeof vi.fn>;
  changesRange: ReturnType<typeof vi.fn>;
  changesDiff: ReturnType<typeof vi.fn>;
  changesCheckpoint: ReturnType<typeof vi.fn>;
  changesAccept: ReturnType<typeof vi.fn>;
  changesPrepareRevert: ReturnType<typeof vi.fn>;
  changesRevert: ReturnType<typeof vi.fn>;
}
let api: Api;
let prevApi: unknown;
const state = (over: Partial<ChangesState> = {}): ChangesState => ({ workspaceId: "a", repo: "ok", checkpoints: [], expired: [], ...over });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  vi.setSystemTime(NOW);
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    changesState: vi.fn(async () => state()),
    onChangesChanged: vi.fn(() => () => {}),
    changesLive: vi.fn(async () => okRange([], true)),
    changesRange: vi.fn(async () => okRange([])),
    changesDiff: vi.fn(async (): Promise<DiffResult> => ({ ok: true, diff: { kind: "text", lines: [], truncated: false } })),
    changesCheckpoint: vi.fn(async () => ({ ok: true, id: "yeni" })),
    changesAccept: vi.fn(async () => ({ ok: true })),
    changesPrepareRevert: vi.fn(),
    changesRevert: vi.fn()
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  (window as unknown as { api: unknown }).api = prevApi;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

async function setup({ visible = true, language = "tr" as "tr" | "en" } = {}) {
  const commands = commandsMock();
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible, workspaces: [ws], activeWorkspaceId: "a" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
  render(
    <LanguageProvider language={language}>
      <TerminalStoreContext.Provider value={store}>
        <ChangesView workspace={ws} />
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  await flush();
  return { commands };
}

describe("görünüm kaydı", () => {
  it("readWorkspaceView changes'i kabul ediyor; indirgeyici kaydediyor", () => {
    expect(readWorkspaceView("changes")).toBe("changes");
    const ready = { ...initialTerminalState, phase: "ready" as const, workspaces: [{ ...ws, view: undefined }], activeWorkspaceId: "a" };
    const next = terminalReducer(ready, { type: "setWorkspaceView", id: "a", view: "changes" });
    expect(next.workspaces[0].view).toBe("changes");
    expect(toSaved(next).workspaces[0].view).toBe("changes");
  });
});

describe("depo durumu (spec §2, §8)", () => {
  it("depo değil: açık mesaj; liste ve Canlı yoklaması yok", async () => {
    api.changesState.mockResolvedValue(state({ repo: "notRepo" }));
    await setup();
    expect(screen.getByText("Bu klasör bir Git deposu değil; değişiklik izleme yalnız Git depolarında çalışır.")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Geri alma noktaları" })).toBeNull();
    expect(api.changesLive).not.toHaveBeenCalled();
  });

  it("git yok ve klasör yok mesajları", async () => {
    api.changesState.mockResolvedValue(state({ repo: "noGit" }));
    await setup();
    expect(screen.getByText(/Git bulunamadı/)).toBeTruthy();
    cleanup();
    api.changesState.mockResolvedValue(state({ repo: "missingDir" }));
    await setup();
    expect(screen.getByText("Alanın klasörü bulunamadı.")).toBeTruthy();
  });
});

describe("liste (spec §5)", () => {
  it("yeniden eskiye; Canlı üstte; saat, ajan, etiket, sayılar, durum; geri alma öncesi ve süresi dolmuş; N bekliyor", async () => {
    api.changesState.mockResolvedValue(
      state({
        checkpoints: [
          cp("c1", at(9, 5), { stats: { files: 2, added: 5, deleted: 1 } }),
          cp("c2", at(9, 30), { reason: "beforeRestore", label: "istem c1", paneId: null, agentName: null, stats: { files: 0, added: 0, deleted: 0 } }),
          cp("c3", at(10, 0), { reviewed: "accepted", label: "", reason: "manual", paneId: null, agentName: null })
        ],
        expired: ["c1"]
      })
    );
    api.changesLive.mockResolvedValue(okRange([file("a.ts", "modified", 3, 0), file("b.ts", "added", 1, 0)], true));
    await setup();
    const list = screen.getByRole("list", { name: "Geri alma noktaları" });
    const rows = within(list).getAllByRole("button");
    expect(rows[0].hasAttribute("data-live-row")).toBe(true);
    expect(rows.slice(1).map((r) => r.getAttribute("data-checkpoint"))).toEqual(["c3", "c2", "c1"]);
    expect(rows[0].textContent).toContain("Canlı");
    expect(rows[0].textContent).toContain("2 dosya");
    expect(rows[1].textContent).toContain("Elle geri alma noktası");
    expect(rows[1].textContent).toContain("Kabul edildi");
    expect(rows[1].textContent).toContain("2 dosya");
    expect(rows[2].textContent).toContain("Geri almadan önce · istem c1");
    expect(rows[3].textContent).toContain("09:05");
    expect(rows[3].textContent).toContain("Ayşe");
    expect(rows[3].textContent).toContain("Süresi doldu");
    expect(rows[3].textContent).toContain("+5");
    expect(document.querySelector("[data-pending-count]")?.textContent).toBe("1 bekliyor");
  });

  it("uyarı satırı: son görüntü alınamadı", async () => {
    api.changesState.mockResolvedValue(state({ warning: { code: "locked", at: NOW } }));
    await setup();
    expect(document.querySelector("[data-warning]")?.textContent).toContain("Git index'i kilitli");
  });

  it("olay gelince liste güncelleniyor", async () => {
    let push: (s: ChangesState) => void = () => {};
    api.onChangesChanged.mockImplementation((cb: (s: ChangesState) => void) => {
      push = cb;
      return () => {};
    });
    await setup();
    act(() => push(state({ checkpoints: [cp("c1", at(9, 0))] })));
    expect(document.querySelector('[data-checkpoint="c1"]')).toBeTruthy();
  });
});

describe("Canlı yoklaması (spec §5)", () => {
  it("görünürken hemen ve 3 sn'de bir; uçuştaki istek bitmeden ikincisi yok", async () => {
    let release: (r: RangeResult) => void = () => {};
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", at(9, 0))] }));
    api.changesLive.mockImplementation(() => new Promise<RangeResult>((r) => (release = r)));
    await setup();
    expect(api.changesLive).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(3_000));
    expect(api.changesLive).toHaveBeenCalledTimes(1);
    await act(async () => release(okRange([], true)));
    await act(async () => vi.advanceTimersByTime(3_000));
    expect(api.changesLive).toHaveBeenCalledTimes(2);
  });

  it("görünmezken (Ajanlar ekranı kapalı) hiç yoklama yok", async () => {
    await setup({ visible: false });
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(api.changesLive).not.toHaveBeenCalled();
  });
});

describe("aralık ve diff (spec §5)", () => {
  const twoRecords = () => state({ checkpoints: [cp("c1", at(9, 0)), cp("c2", at(9, 30))] });

  it("eski kayıt seçince aralık isteniyor; dosyaya tıklayınca satır numaralı diff; ikili ve büyük dosya notu", async () => {
    api.changesState.mockResolvedValue(twoRecords());
    api.changesRange.mockResolvedValue(okRange([file("a.ts"), file("logo.png", "added", 0, 0, true), file("büyük.txt")]));
    await setup();
    fireEvent.click(document.querySelector('[data-checkpoint="c1"]')!);
    await flush();
    expect(api.changesRange).toHaveBeenCalledWith("a", "c1");
    api.changesDiff.mockResolvedValueOnce({
      ok: true,
      diff: {
        kind: "text",
        truncated: true,
        lines: [
          { kind: "hunk", oldNo: null, newNo: null, text: "@@ -1,2 +1,2 @@" },
          { kind: "context", oldNo: 1, newNo: 1, text: "bir" },
          { kind: "del", oldNo: 2, newNo: null, text: "iki" },
          { kind: "add", oldNo: null, newNo: 2, text: "İKİ" }
        ]
      }
    });
    fireEvent.click(document.querySelector('[data-file="a.ts"]')!);
    await flush();
    expect(api.changesDiff).toHaveBeenCalledWith("a", "c1", "a.ts");
    const rows = [...document.querySelectorAll("[data-line-kind]")];
    expect(rows.map((r) => r.getAttribute("data-line-kind"))).toEqual(["hunk", "context", "del", "add"]);
    expect(rows[2].textContent).toContain("2");
    expect(rows[2].textContent).toContain("iki");
    expect(rows[2].className).toContain("--status-danger-bg");
    expect(rows[3].className).toContain("--status-success-bg");
    expect(document.querySelector('[data-diff-note="truncated"]')).toBeTruthy();
    api.changesDiff.mockResolvedValueOnce({ ok: true, diff: { kind: "binary" } });
    fireEvent.click(document.querySelector('[data-file="logo.png"]')!);
    await flush();
    expect(screen.getByText("İkili dosya değişti.")).toBeTruthy();
    api.changesDiff.mockResolvedValueOnce({ ok: true, diff: { kind: "large" } });
    fireEvent.click(document.querySelector('[data-file="büyük.txt"]')!);
    await flush();
    expect(screen.getByText(/Büyük dosya değişti/)).toBeTruthy();
  });

  it("en son kayıt Canlı sonucunu kullanıyor: ayrı aralık isteği yok, diff o kaydın kimliğiyle", async () => {
    api.changesState.mockResolvedValue(twoRecords());
    api.changesLive.mockResolvedValue(okRange([file("c.ts")], true));
    await setup();
    fireEvent.click(document.querySelector('[data-checkpoint="c2"]')!);
    await flush();
    expect(api.changesRange).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector('[data-file="c.ts"]')!);
    await flush();
    expect(api.changesDiff).toHaveBeenCalledWith("a", "c2", "c.ts");
  });

  it("aralık hatası (süresi doldu) açık mesaj", async () => {
    api.changesState.mockResolvedValue(twoRecords());
    api.changesRange.mockResolvedValue({ ok: false, reason: "expired" });
    await setup();
    fireEvent.click(document.querySelector('[data-checkpoint="c1"]')!);
    await flush();
    expect(screen.getByText(/Bu kaydın süresi doldu/)).toBeTruthy();
  });

  it("kayıt yokken Canlı: ipucu", async () => {
    api.changesLive.mockResolvedValue({ ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true });
    await setup();
    expect(screen.getAllByText(/Henüz geri alma noktası yok/).length).toBeGreaterThan(0);
  });
});

describe("düğmeler", () => {
  it("Geri alma noktası oluştur: çift tıklama tek istek; hata mesajı", async () => {
    let release: (r: unknown) => void = () => {};
    api.changesCheckpoint.mockImplementation(() => new Promise((r) => (release = r)));
    await setup();
    const button = screen.getByRole("button", { name: "Geri alma noktası oluştur" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.changesCheckpoint).toHaveBeenCalledTimes(1);
    await act(async () => release({ ok: false, reason: "locked" }));
    expect(screen.getByRole("alert").textContent).toContain("Git index'i kilitli");
  });

  it("Terminale git: Bölmeler'e geçip bölmeyi öne getiriyor; Canlı seçiliyken düğme yok", async () => {
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", at(9, 0)), cp("c2", at(9, 30))] }));
    const { commands } = await setup();
    expect(within(document.querySelector("[data-actions]") as HTMLElement).queryByRole("button")).toBeNull();
    fireEvent.click(document.querySelector('[data-checkpoint="c1"]')!);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Terminale git" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "panes");
    expect(commands.revealPane).toHaveBeenCalledWith("p1");
  });

  it("en: metinler İngilizce", async () => {
    await setup({ language: "en" });
    expect(screen.getByRole("button", { name: "Create restore point" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Changes view" })).toBeTruthy();
  });
});

describe("renk kuralı", () => {
  it("src/changes altında hex, rgb/hsl, lime sınıfı ve uydurma --status-error yok", () => {
    const dir = path.join(__dirname, "..", "src", "changes");
    for (const name of readdirSync(dir)) {
      const source = readFileSync(path.join(dir, name), "utf8");
      expect(source, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\blime-\d|--status-error/);
    }
  });
});
```

`tests/officeScreen.test.tsx` 120. satırı

```ts
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Bölmeler", "Pano", "Ofis"]);
```

şununla değiştir:

```ts
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Bölmeler", "Pano", "Ofis", "Değişiklikler"]);
```

ve aynı dosyanın `describe("Bölmeler | Pano | Ofis", () => {` bloğunun SONUNA (kapanan `});`'den önce) şu testi ekle:

```tsx
  it("Değişiklikler: seçince bölmeler gizli ama takılı, xterm active değil, görünüm bölgesi var, Kararlar yerinde", async () => {
    (window as unknown as { api: Record<string, unknown> }).api = {
      ...(window as unknown as { api: Record<string, unknown> }).api,
      changesState: vi.fn(async () => ({ workspaceId: "a", repo: "ok", checkpoints: [], expired: [] })),
      onChangesChanged: vi.fn(() => () => {}),
      changesLive: vi.fn(async () => ({ ok: true, files: [], truncated: false, toWorkingTree: true, noCheckpoint: true }))
    };
    const { commands } = setup(workspace());
    fireEvent.click(screen.getByRole("radio", { name: "Değişiklikler" }));
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "changes");
    cleanup();
    setup(workspace({ view: "changes" }));
    expect(screen.getByRole("radio", { name: "Değişiklikler" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("region", { name: "Değişiklikler görünümü" })).toBeTruthy();
    const cell = document.querySelector('[data-pane="p1"]') as HTMLElement;
    expect((cell.closest("[data-workspace]") as HTMLElement).className.split(" ")).toContain("hidden");
    expect(xterm().getAttribute("data-active")).toBe("false");
    expect(screen.getByRole("complementary", { name: "Kararlar" })).toBeTruthy();
    await act(async () => {
      await Promise.resolve();
    });
  });
```

(`act` içe aktarması `officeScreen.test.tsx`'te yoksa `@testing-library/react` içe aktarma listesine ekle.)

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesView.test.tsx tests/officeScreen.test.tsx`
Expected: FAIL — `ChangesView` modülü yok; `officeScreen`'de radyo listesi üç.

- [ ] **Step 3: Görünüm türü** — `app-electron/shared/types.ts`, `app-electron/shared/terminalLayout.ts`

`types.ts`'te

```ts
export type WorkspaceView = "panes" | "board" | "office";
```

satırını şununla değiştir:

```ts
export type WorkspaceView = "panes" | "board" | "office" | "changes";
```

ve hemen üstündeki yorum satırının sonuna `, degisiklikler §5` ekle (yorum: `/** Ajanlar ekranının görünümü (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2, degisiklikler §5). "panes" varsayılan; kayda yazılmaz. */`).

`terminalLayout.ts`'te `readWorkspaceView` gövdesini

```ts
  return raw === "board" || raw === "office" ? raw : undefined;
```

yerine:

```ts
  return raw === "board" || raw === "office" || raw === "changes" ? raw : undefined;
```

- [ ] **Step 4: Metinler** — `src/i18n/tr.ts`, `src/i18n/en.ts`

`tr.ts`'te son satır `  "changes.statusDeleted": "Silindi"` → sonuna virgül ekle ve ALTINA:

```ts
  "changes.view": "Değişiklikler",
  "changes.label": "Değişiklikler görünümü",
  "changes.title": "Değişiklikler",
  "changes.pendingCount": "{count} bekliyor",
  "changes.createCheckpoint": "Geri alma noktası oluştur",
  "changes.snapshotWarning": "Son geri alma noktası alınamadı: {reason}",
  "changes.recovered": "Kayıt dosyası bozuktu; {file} olarak kenara alındı.",
  "changes.unreadable": "Kayıt dosyası okunamadı; yeni kayıtlar diske yazılmayacak.",
  "changes.repoUnknown": "Git durumu okunamadı.",
  "changes.listLabel": "Geri alma noktaları",
  "changes.live": "Canlı",
  "changes.liveSince": "{time} noktasından bu yana",
  "changes.noCheckpoint": "Henüz geri alma noktası yok",
  "changes.noCheckpointHint": "Henüz geri alma noktası yok. Bir ajana istem gönderdiğinde ya da \"Geri alma noktası oluştur\"a bastığında burada görünür.",
  "changes.expired": "Süresi doldu",
  "changes.fileCount": "{count} dosya",
  "changes.goTerminal": "Terminale git",
  "changes.loading": "Yükleniyor…",
  "changes.noChanges": "Bu aralıkta değişiklik yok.",
  "changes.untilNow": "Bu noktadan şu ana kadar",
  "changes.listTruncated": "Değişiklik listesi çok uzun; kırpıldı.",
  "changes.filesLabel": "Değişen dosyalar",
  "changes.pickFile": "Diff'i görmek için bir dosya seç.",
  "changes.binaryShort": "ikili",
  "changes.binaryChanged": "İkili dosya değişti.",
  "changes.largeChanged": "Büyük dosya değişti (200 KB üstü); diff gösterilmiyor.",
  "changes.diffLabel": "Diff",
  "changes.diffTruncated": "Diff çok uzun; kırpıldı."
```

`en.ts`'te son satır `  "changes.statusDeleted": "Deleted"` → sonuna virgül ekle ve ALTINA:

```ts
  "changes.view": "Changes",
  "changes.label": "Changes view",
  "changes.title": "Changes",
  "changes.pendingCount": "{count} pending",
  "changes.createCheckpoint": "Create restore point",
  "changes.snapshotWarning": "The last restore point could not be created: {reason}",
  "changes.recovered": "The record file was corrupt; it was set aside as {file}.",
  "changes.unreadable": "The record file could not be read; new records will not be saved to disk.",
  "changes.repoUnknown": "Could not read the Git status.",
  "changes.listLabel": "Restore points",
  "changes.live": "Live",
  "changes.liveSince": "since {time}",
  "changes.noCheckpoint": "No restore point yet",
  "changes.noCheckpointHint": "No restore point yet. One appears here when you send a prompt to an agent or press \"Create restore point\".",
  "changes.expired": "Expired",
  "changes.fileCount": "{count} files",
  "changes.goTerminal": "Go to terminal",
  "changes.loading": "Loading…",
  "changes.noChanges": "No changes in this range.",
  "changes.untilNow": "From this point until now",
  "changes.listTruncated": "The change list is too long; it was truncated.",
  "changes.filesLabel": "Changed files",
  "changes.pickFile": "Pick a file to see its diff.",
  "changes.binaryShort": "binary",
  "changes.binaryChanged": "Binary file changed.",
  "changes.largeChanged": "Large file changed (over 200 KB); no diff shown.",
  "changes.diffLabel": "Diff",
  "changes.diffTruncated": "The diff is too long; it was truncated."
```

- [ ] **Step 5: Diff görüntüleyici** — `src/changes/DiffViewer.tsx`

```tsx
// Birleşik diff (spec 2026-10-18 degisiklikler §5): satır numaralı; eklenen ve
// silinen satır mevcut durum tonlarıyla (yeni renk yok). İkili ve 200 KB üstü
// dosyada yalnız bir satır; kırpılmışsa not.
import { useT } from "../i18n";
import type { DiffLine, FileDiff } from "../../app-electron/shared/changesTypes";

const ROW: Record<DiffLine["kind"], string> = {
  hunk: "text-slate-500",
  context: "text-slate-300",
  add: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  del: "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
};
const SIGN: Record<DiffLine["kind"], string> = { hunk: "", context: " ", add: "+", del: "-" };

export default function DiffViewer({ diff }: { diff: FileDiff }) {
  const t = useT();
  if (diff.kind === "binary") {
    return (
      <p data-diff-note="binary" className="p-3 text-xs text-slate-400">
        {t("changes.binaryChanged")}
      </p>
    );
  }
  if (diff.kind === "large") {
    return (
      <p data-diff-note="large" className="p-3 text-xs text-slate-400">
        {t("changes.largeChanged")}
      </p>
    );
  }
  return (
    <div role="table" aria-label={t("changes.diffLabel")} className="min-w-max font-mono text-2xs leading-5">
      {diff.lines.map((line, i) => (
        <div key={i} role="row" data-line-kind={line.kind} className={`flex ${ROW[line.kind]}`}>
          <span role="cell" className="w-12 shrink-0 select-none pr-2 text-right tabular-nums text-slate-500">
            {line.oldNo ?? ""}
          </span>
          <span role="cell" className="w-12 shrink-0 select-none pr-2 text-right tabular-nums text-slate-500">
            {line.newNo ?? ""}
          </span>
          <span role="cell" className="w-4 shrink-0 select-none">
            {SIGN[line.kind]}
          </span>
          <span role="cell" className="whitespace-pre pr-3">
            {line.text}
          </span>
        </div>
      ))}
      {diff.truncated && (
        <p data-diff-note="truncated" role="note" className="px-3 py-2 text-xs text-[var(--status-warning-text)]">
          {t("changes.diffTruncated")}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Görünüm** — `src/changes/ChangesView.tsx`

```tsx
// Değişiklikler görünümü (spec 2026-10-18 degisiklikler §5): solda kayıt
// listesi (yeniden eskiye, üstte Canlı satırı), sağda seçili kaydın dosyaları
// ve birleşik diff'i. Canlı yalnız görünüm görünürken 3 sn'de bir yoklanıyor;
// en son kaydın aralığı Canlı'yla aynı (çalışma ağacına kadar). Lime yalnız
// seçim. Komut uçuştayken düğmeler kilitli; söküldükten sonra setState yok.
import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalWorkspace } from "../stores/terminalTypes";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { TOOL_BUTTON } from "../ui/buttons";
import { pendingCount, statsOf } from "../../app-electron/shared/changesLogic";
import { LIVE_POLL_MS, type Checkpoint, type DiffResult, type FileChange, type RangeResult, type RangeStats } from "../../app-electron/shared/changesTypes";
import { clockLabel, FAILURE_KEY, newestFirst, REASON_KEY, REPO_KEY, REVIEW_KEY, STATUS_KEY, STATUS_MARK } from "./changesFormat";
import { useChangesState } from "./useChanges";
import DiffViewer from "./DiffViewer";

const ACTION = `${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`;
const LIVE = "live";

const rowClass = (selected: boolean) =>
  `flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left transition-colors ${selected ? "border-accent-500/60" : "border-line hover:border-slate-500"}`;

function titleOf(cp: Checkpoint, t: ReturnType<typeof useT>): string {
  if (cp.reason === "beforeRestore") return cp.label ? `${t("changes.reasonBeforeRestore")} · ${cp.label}` : t("changes.reasonBeforeRestore");
  return cp.label || t(REASON_KEY[cp.reason]);
}

function StatsLine({ stats }: { stats: RangeStats }) {
  const t = useT();
  return (
    <span data-stats="" className="flex gap-2 font-mono text-2xs tabular-nums">
      <span className="text-slate-400">{t("changes.fileCount", { count: stats.files })}</span>
      <span className="text-[var(--status-success-text)]">+{stats.added}</span>
      <span className="text-[var(--status-danger-text)]">-{stats.deleted}</span>
    </span>
  );
}

export default function ChangesView({ workspace }: { workspace: TerminalWorkspace }) {
  const t = useT();
  const { state: store, commands } = useTerminalStore();
  const { state } = useChangesState(workspace.id);
  const [selected, setSelected] = useState<string>(LIVE);
  const [live, setLive] = useState<RangeResult | null>(null);
  const [range, setRange] = useState<RangeResult | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const diffRequest = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const checkpoints = state?.checkpoints ?? [];
  const expired = state?.expired ?? [];
  const latest = checkpoints.at(-1) ?? null;
  const repoOk = state?.repo === "ok";
  const visible = store.visible;
  const selectedCp = selected === LIVE ? null : (checkpoints.find((c) => c.id === selected) ?? null);
  const showsLive = selected === LIVE || (selectedCp !== null && selectedCp.id === latest?.id);
  const diffTarget = selected === LIVE ? (latest?.id ?? null) : (selectedCp?.id ?? null);

  // Seçili kayıt listeden düştüyse (200 sınırı) Canlı'ya dön.
  useEffect(() => {
    if (state && selected !== LIVE && !state.checkpoints.some((c) => c.id === selected)) setSelected(LIVE);
  }, [state, selected]);

  // Canlı (spec §5): yalnız görünüm görünürken 3 sn'de bir; uçuşta ikinci istek yok.
  useEffect(() => {
    if (!visible || !repoOk) return;
    let alive = true;
    let inFlight = false;
    const poll = () => {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      window.api.changesLive(workspace.id).then(
        (r) => {
          inFlight = false;
          if (alive) setLive(r);
        },
        () => {
          inFlight = false;
        }
      );
    };
    poll();
    const timer = setInterval(poll, LIVE_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [visible, repoOk, workspace.id, latest?.id]);

  // Eski kaydın aralığı bir kez isteniyor; en son kayıt Canlı sonucunu kullanıyor.
  const selectedId = selectedCp?.id ?? null;
  useEffect(() => {
    setFile(null);
    setDiff(null);
    setRange(null);
    if (!selectedId || showsLive) return;
    let alive = true;
    window.api.changesRange(workspace.id, selectedId).then(
      (r) => {
        if (alive) setRange(r);
      },
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [workspace.id, selectedId, showsLive]);

  const shown: RangeResult | null = showsLive ? live : range;

  const openFile = (rel: string) => {
    if (!diffTarget) return;
    const request = ++diffRequest.current;
    setFile(rel);
    setDiff(null);
    window.api.changesDiff(workspace.id, diffTarget, rel).then(
      (r) => {
        if (mounted.current && diffRequest.current === request) setDiff(r);
      },
      () => {}
    );
  };

  const createCheckpoint = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    const r = await window.api.changesCheckpoint(workspace.id).catch(() => ({ ok: false as const, reason: "git" as const }));
    pendingRef.current = false;
    if (!mounted.current) return;
    setPending(false);
    if (!r.ok) setError(FAILURE_KEY[r.reason]);
  };

  const goTerminal = (paneId: string) => {
    commands.setWorkspaceView(workspace.id, "panes");
    commands.revealPane(paneId);
  };

  if (!state) {
    return (
      <section aria-label={t("changes.label")} className="flex h-full items-center justify-center text-xs text-slate-500">
        {t("changes.loading")}
      </section>
    );
  }
  if (state.repo === "notRepo" || state.repo === "noGit" || state.repo === "missingDir") {
    return (
      <section aria-label={t("changes.label")} className="flex h-full items-center justify-center p-6">
        <p role="status" className="max-w-md text-center text-sm text-slate-400">
          {t(REPO_KEY[state.repo])}
        </p>
      </section>
    );
  }

  const pendingN = pendingCount(checkpoints);
  const liveFiles = live?.ok ? live.files : null;
  const actionCp = selectedCp;
  const actionPane = actionCp?.paneId ? workspace.panes.find((p) => p.id === actionCp.paneId) : undefined;

  return (
    <section aria-label={t("changes.label")} className="flex h-full min-h-0">
      <div className="flex w-80 shrink-0 flex-col border-r border-line">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{t("changes.title")}</h2>
          {pendingN > 0 && (
            <span data-pending-count="" className="shrink-0 text-2xs text-slate-400">
              {t("changes.pendingCount", { count: pendingN })}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-line p-2">
          <button type="button" disabled={pending || !repoOk} onClick={() => void createCheckpoint()} className={ACTION}>
            {t("changes.createCheckpoint")}
          </button>
          {state.warning && (
            <p
              role="status"
              data-warning=""
              className="rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-1 text-2xs text-[var(--status-warning-text)]"
            >
              {t("changes.snapshotWarning", { reason: t(FAILURE_KEY[state.warning.code]) })}
            </p>
          )}
          {state.recoveredFrom && <p className="text-2xs text-[var(--status-warning-text)]">{t("changes.recovered", { file: state.recoveredFrom })}</p>}
          {state.unreadable && <p className="text-2xs text-[var(--status-warning-text)]">{t("changes.unreadable")}</p>}
          {state.repo === "unknown" && <p className="text-2xs text-slate-400">{t("changes.repoUnknown")}</p>}
          {error && (
            <p role="alert" className="text-2xs text-[var(--status-danger-text)]">
              {t(error)}
            </p>
          )}
        </div>
        <ul aria-label={t("changes.listLabel")} className="chat-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
          <li>
            <button type="button" data-live-row="" aria-pressed={selected === LIVE} onClick={() => setSelected(LIVE)} className={rowClass(selected === LIVE)}>
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="text-xs font-medium text-slate-200">{t("changes.live")}</span>
                <span className="min-w-0 truncate text-2xs text-slate-500">
                  {latest ? t("changes.liveSince", { time: clockLabel(latest.createdAt, Date.now()) }) : t("changes.noCheckpoint")}
                </span>
              </span>
              {liveFiles && <StatsLine stats={statsOf(liveFiles)} />}
            </button>
          </li>
          {newestFirst(checkpoints).map((c) => {
            const pane = c.paneId ? workspace.panes.find((p) => p.id === c.paneId) : undefined;
            const color = pane ? PANE_COLOR_VAR[pane.color ?? "gray"] : null;
            const isExpired = expired.includes(c.id);
            const stats = c.id === latest?.id ? (liveFiles ? statsOf(liveFiles) : null) : (c.stats ?? null);
            const title = titleOf(c, t);
            return (
              <li key={c.id}>
                <button type="button" data-checkpoint={c.id} aria-pressed={selected === c.id} onClick={() => setSelected(c.id)} className={rowClass(selected === c.id)}>
                  <span className="flex min-w-0 items-center gap-1.5 text-2xs text-slate-500">
                    <span className="font-mono tabular-nums">{clockLabel(c.createdAt, Date.now())}</span>
                    {c.agentName && (
                      <>
                        <span className="h-2 w-2 shrink-0 rounded-full border border-line" style={{ background: color ?? "transparent" }} />
                        <span className="min-w-0 truncate text-slate-300">{c.agentName}</span>
                      </>
                    )}
                    <span className="ml-auto shrink-0">{isExpired ? t("changes.expired") : t(REVIEW_KEY[c.reviewed])}</span>
                  </span>
                  <span title={title} className="min-w-0 truncate text-xs text-slate-200">
                    {title}
                  </span>
                  {stats && <StatsLine stats={stats} />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
          <h3 className="min-w-0 flex-1 truncate text-sm text-slate-100">{selectedCp ? titleOf(selectedCp, t) : t("changes.live")}</h3>
          {shown?.ok && shown.toWorkingTree && !shown.noCheckpoint && <span className="shrink-0 text-2xs text-slate-500">{t("changes.untilNow")}</span>}
          <div data-actions="" className="flex shrink-0 gap-1.5">
            {actionCp && actionPane && (
              <button type="button" onClick={() => goTerminal(actionPane.id)} className={ACTION}>
                {t("changes.goTerminal")}
              </button>
            )}
          </div>
        </div>
        <ChangesBody shown={shown} file={file} diff={diff} onOpen={openFile} />
      </div>
    </section>
  );
}

function ChangesBody({
  shown,
  file,
  diff,
  onOpen
}: {
  shown: RangeResult | null;
  file: string | null;
  diff: DiffResult | null;
  onOpen: (rel: string) => void;
}) {
  const t = useT();
  if (!shown) return <p className="p-3 text-xs text-slate-500">{t("changes.loading")}</p>;
  if (!shown.ok) {
    return (
      <p role="alert" className="p-3 text-xs text-[var(--status-danger-text)]">
        {t(FAILURE_KEY[shown.reason])}
      </p>
    );
  }
  if (shown.noCheckpoint) return <p className="p-3 text-xs text-slate-400">{t("changes.noCheckpointHint")}</p>;
  if (shown.files.length === 0) return <p className="p-3 text-xs text-slate-400">{t("changes.noChanges")}</p>;
  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-64 shrink-0 flex-col border-r border-line">
        {shown.truncated && <p className="px-2 py-1 text-2xs text-[var(--status-warning-text)]">{t("changes.listTruncated")}</p>}
        <ul aria-label={t("changes.filesLabel")} className="chat-scroll min-h-0 flex-1 overflow-y-auto p-1">
          {shown.files.map((f: FileChange) => (
            <li key={f.path}>
              <button
                type="button"
                data-file={f.path}
                aria-pressed={file === f.path}
                onClick={() => onOpen(f.path)}
                title={f.path}
                className={`flex w-full items-center gap-1.5 rounded border px-1.5 py-1 text-left text-2xs ${file === f.path ? "border-accent-500/60" : "border-transparent hover:border-line"}`}
              >
                <span title={t(STATUS_KEY[f.status])} className="w-3 shrink-0 font-mono text-slate-400">
                  {STATUS_MARK[f.status]}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-slate-200">{f.path}</span>
                {f.binary ? (
                  <span className="shrink-0 text-slate-500">{t("changes.binaryShort")}</span>
                ) : (
                  <span className="flex shrink-0 gap-1 font-mono tabular-nums">
                    <span className="text-[var(--status-success-text)]">+{f.added}</span>
                    <span className="text-[var(--status-danger-text)]">-{f.deleted}</span>
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="chat-scroll min-w-0 flex-1 overflow-auto">
        {file === null ? (
          <p className="p-3 text-xs text-slate-500">{t("changes.pickFile")}</p>
        ) : !diff ? (
          <p className="p-3 text-xs text-slate-500">{t("changes.loading")}</p>
        ) : !diff.ok ? (
          <p role="alert" className="p-3 text-xs text-[var(--status-danger-text)]">
            {t(FAILURE_KEY[diff.reason])}
          </p>
        ) : (
          <DiffViewer diff={diff.diff} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Geçiş** — `src/agents/TeamStrip.tsx`

```ts
const VIEW_KEY: Record<WorkspaceView, TranslationKey> = {
  panes: "board.viewPanes",
  board: "board.viewBoard",
  office: "office.view"
};
const VIEWS: readonly WorkspaceView[] = ["panes", "board", "office"];
```

yerine:

```ts
const VIEW_KEY: Record<WorkspaceView, TranslationKey> = {
  panes: "board.viewPanes",
  board: "board.viewBoard",
  office: "office.view",
  changes: "changes.view"
};
const VIEWS: readonly WorkspaceView[] = ["panes", "board", "office", "changes"];
```

ve radyo grubunun üstündeki yorumu `{/* Bölmeler | Pano | Ofis | Değişiklikler (spec 2026-10-18 gorev-panosu §8, ofis-gorunumu §2, degisiklikler §5); seçim lime, alan başına hatırlanıyor. */}` yap.

- [ ] **Step 8: Bağlantı** — `src/terminal/TerminalMode.tsx`

İçe aktarmalarda `import OfficeView from "../office/OfficeView";` satırının ALTINA:

```ts
import ChangesView from "../changes/ChangesView";
import { ChangesFocusProvider } from "../changes/changesFocus";
```

Dosyanın ilk satırındaki yorumu `// Ajanlar ekranının sağ tarafı (spec 2026-10-17 ajan-alani §4): üstte ekip şeridi, ortada bölmeler, Pano, Ofis ya da Değişiklikler (spec 2026-10-18). Bütün alanlar HEP takılı: seçili olmayanlar ve öbür görünümlerdeyken bölmeler hidden.` yap.

`TerminalMode`'un `return (` ifadesindeki kök `<div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">` öğesini `<ChangesFocusProvider>` ile sar (açılış: `return (\n    <ChangesFocusProvider>\n      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">`; kapanış: son `</div>`'den sonra `\n    </ChangesFocusProvider>\n  );`). Pano bağlantısı (Task 9) bu sağlayıcıya `BoardView` → `BoardDetailPanel` içinden ulaşıyor.

Ofis bloğunun

```tsx
          {state.phase === "ready" && active && view === "office" && (
            <div className="absolute inset-0">
              <OfficeView workspace={active} onAddAgent={() => setAgentDialog({})} />
            </div>
          )}
```

hemen ALTINA:

```tsx
          {state.phase === "ready" && active && view === "changes" && (
            <div className="absolute inset-0">
              <ChangesView workspace={active} />
            </div>
          )}
```

- [ ] **Step 9: Yeşili gör**

Run: `npx vitest run tests/changesView.test.tsx tests/officeScreen.test.tsx tests/boardScreen.test.tsx tests/terminalMode.test.tsx tests/officeWorkspaceView.test.ts tests/i18n.test.ts`
Expected: PASS (hepsi).

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 10: Commit**

```bash
git add app-electron/shared/types.ts app-electron/shared/terminalLayout.ts src/changes/DiffViewer.tsx src/changes/ChangesView.tsx src/agents/TeamStrip.tsx src/terminal/TerminalMode.tsx src/i18n/tr.ts src/i18n/en.ts tests/changesView.test.tsx tests/officeScreen.test.tsx
git commit -m "Degisiklikler: gorunum, Canli satiri, diff ve dort secenekli gecis

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Kabul et ve Geri al (onay penceresi, çakışan kayıtlar, çalışan ajan uyarısı); pano ayrıntı panelinden bağlantı

**Files:**
- Create: `src/changes/RevertDialog.tsx`
- Modify: `src/changes/ChangesView.tsx`
- Modify: `src/board/BoardDetailPanel.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/changesRevert.test.tsx` (yeni)

**Interfaces:**
- Consumes: Task 6 `window.api.changesAccept`, `changesPrepareRevert`, `changesRevert`; Task 7 (`canAccept`, `canRevert`, `latestForSubtask`, `useChangesFocus`, `ChangesFocusContext`, `REASON_KEY`, `STATUS_KEY`, `STATUS_MARK`, `FAILURE_KEY`); Task 8 `ChangesView` ve DOM kancaları; mevcut `Modal`, `ModalCancelButton`, `Button`.
- Produces:

```ts
// src/changes/RevertDialog.tsx
export default function RevertDialog(props: { open: boolean; plan: RevertPlan | null; onConfirm: () => void; onCancel: () => void }): JSX.Element | null;
// DOM kancaları: [data-revert-conflicts], [data-revert-running], [data-revert-outcome="ok"|"fail"], [data-subtask-changes="<altGörevId>"]
```

Akış: **Geri al** → `changesPrepareRevert` (tek uçuş) → pencere (alertdialog, ilk odak İptal) → onayda `changesRevert(alan, kayıt, plan.files.map(f => f.path))` — yalnız kullanıcının gördüğü liste → sonuç şeridi (başarı özeti ya da durduğu dosya + o ana kadar yazılanlar + "geri almayı geri al" ipucu). **Kabul et** yalnız `pending` kayıtta; **Geri al** süresi dolmuş ve `reverted` kayıtta kapalı; Canlı satırı seçiliyken ikisi de yok (eylem bir kayda bağlı).

- [ ] **Step 1: Kırmızı test** — `tests/changesRevert.test.tsx`

```tsx
// @vitest-environment jsdom
// Değişiklikler: Kabul et, Geri al onayı ve sonucu, pano bağlantısı
// (spec 2026-10-18 degisiklikler §5, §6, §8).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import ChangesView from "../src/changes/ChangesView";
import BoardDetailPanel from "../src/board/BoardDetailPanel";
import { ChangesFocusContext, type ChangesFocusValue } from "../src/changes/changesFocus";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { BoardTask, Subtask } from "../app-electron/shared/boardTypes";
import type { ChangesState, Checkpoint, FileChange, RangeResult, RevertPlan, RevertResult } from "../app-electron/shared/changesTypes";

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
const ws: TerminalWorkspace = {
  id: "a",
  name: "Alan a",
  panes: [agentPane("p1", "Ayşe")],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false,
  view: "changes"
};
const cp = (id: string, createdAt: number, over: Partial<Checkpoint> = {}): Checkpoint => ({
  id,
  workspaceId: "a",
  tree: "0".repeat(40),
  createdAt,
  reason: "prompt",
  paneId: "p1",
  agentName: "Ayşe",
  subtaskId: null,
  label: `istem ${id}`,
  reviewed: "pending",
  ...over
});
const file = (p: string, status: FileChange["status"] = "modified"): FileChange => ({ path: p, status, added: 1, deleted: 1, binary: false });
const okRange = (files: FileChange[], toWorkingTree = false): RangeResult => ({ ok: true, files, truncated: false, toWorkingTree });
const plan = (over: Partial<RevertPlan> = {}): RevertPlan => ({
  files: [file("a.ts"), file("yeni.txt", "added")],
  conflicts: [],
  conflictsPartial: false,
  runningAgents: [],
  ...over
});

let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
const state = (over: Partial<ChangesState> = {}): ChangesState => ({
  workspaceId: "a",
  repo: "ok",
  checkpoints: [cp("c1", 1_000), cp("c2", 2_000, { subtaskId: "s1" }), cp("c3", 3_000)],
  expired: [],
  ...over
});

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    changesState: vi.fn(async () => state()),
    onChangesChanged: vi.fn(() => () => {}),
    changesLive: vi.fn(async () => okRange([], true)),
    changesRange: vi.fn(async () => okRange([file("a.ts"), file("yeni.txt", "added")])),
    changesDiff: vi.fn(),
    changesCheckpoint: vi.fn(),
    changesAccept: vi.fn(async () => ({ ok: true })),
    changesPrepareRevert: vi.fn(async () => ({ ok: true, plan: plan() })),
    changesRevert: vi.fn(async (): Promise<RevertResult> => ({ ok: true, restored: ["a.ts"], trashed: ["yeni.txt"], skipped: [], beforeRestoreId: "c4" }))
  };
  (window as unknown as { api: unknown }).api = api;
});
afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
}

function store(commands: TerminalCommands): TerminalStoreValue {
  return {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces: [ws], activeWorkspaceId: "a" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\a"
  };
}

async function setup(focus?: Partial<ChangesFocusValue>) {
  const commands = commandsMock();
  const focusValue: ChangesFocusValue = { focus: null, requestFocus: vi.fn(), clearFocus: vi.fn(), ...focus };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store(commands)}>
        <ChangesFocusContext.Provider value={focusValue}>
          <ChangesView workspace={ws} />
        </ChangesFocusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  await flush();
  return { commands, focusValue };
}

const select = async (id: string) => {
  fireEvent.click(document.querySelector(`[data-checkpoint="${id}"]`)!);
  await flush();
};
const actions = () => within(document.querySelector("[data-actions]") as HTMLElement);

describe("Kabul et (spec §5)", () => {
  it("yalnız bekleyen kayıtta; tıklayınca changesAccept; Canlı seçiliyken eylem yok", async () => {
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", 1_000), cp("c2", 2_000, { reviewed: "accepted" }), cp("c3", 3_000)] }));
    await setup();
    expect(actions().queryByRole("button", { name: "Kabul et" })).toBeNull();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Kabul et" }));
    await flush();
    expect(api.changesAccept).toHaveBeenCalledWith("a", "c1");
    await select("c2");
    expect(actions().queryByRole("button", { name: "Kabul et" })).toBeNull();
  });
});

describe("Geri al (spec §6)", () => {
  it("geri alınmış ve süresi dolmuş kayıtta kapalı", async () => {
    api.changesState.mockResolvedValue(state({ checkpoints: [cp("c1", 1_000, { reviewed: "reverted" }), cp("c2", 2_000), cp("c3", 3_000)], expired: ["c2"] }));
    await setup();
    await select("c1");
    expect((actions().getByRole("button", { name: "Geri al" }) as HTMLButtonElement).disabled).toBe(true);
    await select("c2");
    expect((actions().getByRole("button", { name: "Geri al" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("pencere: dosyalar, sonraki değişiklik uyarısı, çakışan kayıtlar adıyla, çalışan ajanlar, çöp notu; İptal'de hiçbir şey yok", async () => {
    api.changesPrepareRevert.mockResolvedValue({
      ok: true,
      plan: plan({
        conflicts: [{ id: "c2", label: "testleri düzelt", agentName: "Can", reason: "prompt" }],
        conflictsPartial: true,
        runningAgents: ["Ayşe", "Can"]
      })
    });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    expect(api.changesPrepareRevert).toHaveBeenCalledWith("a", "c1");
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("list", { name: "Etkilenecek dosyalar" }).textContent).toContain("a.ts");
    expect(dialog.textContent).toContain("Bu dosyalardaki sonraki değişiklikler de geri alınır");
    expect(dialog.textContent).toContain("1 dosya çöp kutusuna taşınır");
    expect(dialog.querySelector("[data-revert-conflicts]")?.textContent).toContain("Can · testleri düzelt");
    expect(dialog.textContent).toContain("yalnız ilk 50");
    expect(dialog.querySelector("[data-revert-running]")?.textContent).toContain("Ayşe, Can");
    fireEvent.click(within(dialog).getByRole("button", { name: "İptal" }));
    await flush();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(api.changesRevert).not.toHaveBeenCalled();
  });

  it("onay: yalnız penceredeki yollarla changesRevert; başarı özeti ve geri almayı geri alma ipucu", async () => {
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    expect(api.changesRevert).toHaveBeenCalledWith("a", "c1", ["a.ts", "yeni.txt"]);
    const outcome = document.querySelector('[data-revert-outcome="ok"]') as HTMLElement;
    expect(outcome.textContent).toContain("1 dosya eski hâline döndü, 1 dosya çöpe taşındı");
    expect(outcome.textContent).toContain("Geri almadan önce");
  });

  it("yarıda kalan geri alma: durduğu dosya ve o ana kadar yazılanlar listeleniyor", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "writeFailed", restored: ["a.ts"], trashed: [], skipped: ["eski.md"], failedPath: "b.ts", beforeRestoreId: "c4" });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    const outcome = document.querySelector('[data-revert-outcome="fail"]') as HTMLElement;
    expect(outcome.getAttribute("role")).toBe("alert");
    expect(outcome.textContent).toContain("Bir dosya yazılamadı");
    expect(outcome.textContent).toContain("Durduğu dosya: b.ts");
    expect(outcome.textContent).toContain("Durmadan önce 1 dosya geri alındı");
    expect(outcome.textContent).toContain("a.ts");
    expect(outcome.textContent).toContain("1 dosya artık bu kaydın aralığında olmadığı için atlandı");
    expect(outcome.textContent).toContain("Geri almadan önce");
  });

  it("geri alma noktası alınamadı: hiçbir dosyaya dokunulmadığı söyleniyor", async () => {
    api.changesRevert.mockResolvedValue({ ok: false, reason: "snapshotFailed", restored: [], trashed: [], skipped: [] });
    await setup();
    await select("c1");
    fireEvent.click(actions().getByRole("button", { name: "Geri al" }));
    await flush();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "2 dosyayı geri al" }));
    await flush();
    expect(document.querySelector('[data-revert-outcome="fail"]')?.textContent).toContain("hiçbir dosyaya dokunulmadı");
  });

  it("hazırlık hatası açık mesaj; çift tıklama tek hazırlık isteği", async () => {
    let release: (r: unknown) => void = () => {};
    api.changesPrepareRevert.mockImplementation(() => new Promise((r) => (release = r)));
    await setup();
    await select("c1");
    const button = actions().getByRole("button", { name: "Geri al" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.changesPrepareRevert).toHaveBeenCalledTimes(1);
    await act(async () => release({ ok: false, reason: "expired" }));
    expect(screen.getByRole("alert").textContent).toContain("Bu kaydın süresi doldu");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("pano bağlantısı (spec §5)", () => {
  const sub = (id: string, over: Partial<Subtask> = {}): Subtask => ({ id, title: id, prompt: `İstem ${id}`, roleHint: "", dependsOn: [], state: "ready", paneId: null, attempts: 0, ...over });
  const task: BoardTask = {
    id: "t1",
    title: "İade akışı",
    goal: "Hedef",
    state: "running",
    createdAt: 1,
    approvedAt: 2,
    subtasks: [sub("s1", { state: "running", paneId: "p1", attempts: 1, dispatchedAt: 5 }), sub("s2")]
  };

  it("gönderilmiş alt görevde 'Değişiklikler' → odak + görünüm; hiç gönderilmemişte bağlantı yok", () => {
    const commands = commandsMock();
    const requestFocus = vi.fn();
    render(
      <LanguageProvider language="tr">
        <TerminalStoreContext.Provider value={store(commands)}>
          <ChangesFocusContext.Provider value={{ focus: null, requestFocus, clearFocus: vi.fn() }}>
            <BoardDetailPanel workspace={ws} task={task} onClose={vi.fn()} onSelectSubtask={vi.fn()} />
          </ChangesFocusContext.Provider>
        </TerminalStoreContext.Provider>
      </LanguageProvider>
    );
    expect(document.querySelector('[data-subtask-changes="s2"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-subtask-changes="s1"]')!);
    expect(requestFocus).toHaveBeenCalledWith("a", "s1");
    expect(commands.setWorkspaceView).toHaveBeenCalledWith("a", "changes");
  });

  it("görünüm odakta o alt görevin en son kaydını seçiyor ve odağı temizliyor; kayıt yoksa not", async () => {
    const { focusValue } = await setup({ focus: { workspaceId: "a", subtaskId: "s1" } });
    expect(document.querySelector('[data-checkpoint="c2"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(focusValue.clearFocus).toHaveBeenCalled();
    cleanup();
    await setup({ focus: { workspaceId: "a", subtaskId: "s9" } });
    expect(screen.getByText("Bu alt görev için geri alma noktası yok.")).toBeTruthy();
    expect(document.querySelector("[data-live-row]")?.getAttribute("aria-pressed")).toBe("true");
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/changesRevert.test.tsx`
Expected: FAIL — "Kabul et"/"Geri al" düğmeleri ve `[data-subtask-changes]` yok.

- [ ] **Step 3: Metinler** — `src/i18n/tr.ts`, `src/i18n/en.ts`

`tr.ts`'te son satır `  "changes.diffTruncated": "Diff çok uzun; kırpıldı."` → sonuna virgül ekle ve ALTINA:

```ts
  "changes.accept": "Kabul et",
  "changes.revert": "Geri al",
  "changes.revertTitle": "Değişiklikler geri alınsın mı?",
  "changes.revertBody": "{count} dosya bu geri alma noktasındaki hâline dönecek.",
  "changes.revertLaterWarning": "Bu dosyalardaki sonraki değişiklikler de geri alınır. Önce şimdiki hâlin geri alma noktası alınır; geri almayı geri alabilirsin.",
  "changes.revertTrashNote": "Sonradan eklenen {count} dosya çöp kutusuna taşınır (kalıcı silinmez).",
  "changes.revertFiles": "Etkilenecek dosyalar",
  "changes.revertConflicts": "Bu dosyalara sonraki kayıtlar da dokunmuş; onların bu dosyalardaki değişiklikleri de gider:",
  "changes.conflictsPartial": "Sonraki kayıtların yalnız ilk 50'si tarandı; daha yeni kayıtlar da bu dosyalara dokunmuş olabilir.",
  "changes.revertRunning": "Şu an çalışan ajanlar var: {names}. Bu dosyalara yazıyor olabilirler.",
  "changes.revertConfirm": "{count} dosyayı geri al",
  "changes.revertDone": "Geri alındı: {restored} dosya eski hâline döndü, {trashed} dosya çöpe taşındı.",
  "changes.revertFailedAt": "Durduğu dosya: {path}",
  "changes.revertPartial": "Durmadan önce {count} dosya geri alındı:",
  "changes.revertSkipped": "{count} dosya artık bu kaydın aralığında olmadığı için atlandı.",
  "changes.revertUndoHint": "Geri almayı geri almak için listedeki \"Geri almadan önce\" kaydını seçip Geri al'a bas.",
  "changes.dismiss": "Kapat",
  "changes.noSubtaskRecord": "Bu alt görev için geri alma noktası yok.",
  "changes.boardLink": "Değişiklikler"
```

`en.ts`'te son satır `  "changes.diffTruncated": "The diff is too long; it was truncated."` → sonuna virgül ekle ve ALTINA:

```ts
  "changes.accept": "Accept",
  "changes.revert": "Revert",
  "changes.revertTitle": "Revert these changes?",
  "changes.revertBody": "{count} files will return to their state at this restore point.",
  "changes.revertLaterWarning": "Later changes to these files are reverted too. A restore point of the current state is taken first, so you can undo the revert.",
  "changes.revertTrashNote": "{count} files added later are moved to the Recycle Bin (not permanently deleted).",
  "changes.revertFiles": "Affected files",
  "changes.revertConflicts": "Later records also touched these files; their changes to these files will be lost too:",
  "changes.conflictsPartial": "Only the first 50 later records were checked; newer records may also have touched these files.",
  "changes.revertRunning": "Agents are running right now: {names}. They may be writing to these files.",
  "changes.revertConfirm": "Revert {count} files",
  "changes.revertDone": "Reverted: {restored} files restored, {trashed} files moved to the Recycle Bin.",
  "changes.revertFailedAt": "Stopped at: {path}",
  "changes.revertPartial": "{count} files were reverted before it stopped:",
  "changes.revertSkipped": "{count} files were skipped because they are no longer in this record's range.",
  "changes.revertUndoHint": "To undo the revert, select the \"Before revert\" record in the list and press Revert.",
  "changes.dismiss": "Dismiss",
  "changes.noSubtaskRecord": "There is no restore point for this subtask.",
  "changes.boardLink": "Changes"
```

- [ ] **Step 4: Onay penceresi** — `src/changes/RevertDialog.tsx`

```tsx
// Geri alma onayı (spec 2026-10-18 degisiklikler §6.1, §6.6): etkilenecek
// dosyalar, sonraki değişikliklerin de geri alınacağı uyarısı, çakışan kayıtlar
// adıyla, alanda çalışan ajanlar, çöp notu. Yıkıcı onay: alertdialog, kırmızı
// düğme, ilk odak İptal'de. Ortak Modal'ın confirm katmanı.
import { AlertTriangle } from "lucide-react";
import { useT } from "../i18n";
import { Button } from "../ui/Button";
import { Modal, ModalCancelButton } from "../ui/Modal";
import type { RevertPlan } from "../../app-electron/shared/changesTypes";
import { REASON_KEY, STATUS_KEY, STATUS_MARK } from "./changesFormat";

export default function RevertDialog({
  open,
  plan,
  onConfirm,
  onCancel
}: {
  open: boolean;
  plan: RevertPlan | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  if (!plan) return null;
  const added = plan.files.filter((f) => f.status === "added").length;
  return (
    <Modal
      open={open}
      layer="confirm"
      size="md"
      role="alertdialog"
      title={t("changes.revertTitle")}
      icon={<AlertTriangle size={18} className="text-[var(--status-danger-text)]" />}
      onClose={onCancel}
      footer={
        <>
          <ModalCancelButton autoFocus />
          <Button variant="danger" onClick={onConfirm}>
            {t("changes.revertConfirm", { count: plan.files.length })}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-slate-400">
        <p>{t("changes.revertBody", { count: plan.files.length })}</p>
        <p>{t("changes.revertLaterWarning")}</p>
        {added > 0 && <p>{t("changes.revertTrashNote", { count: added })}</p>}
        <ul aria-label={t("changes.revertFiles")} className="chat-scroll max-h-48 overflow-y-auto rounded border border-line p-2 font-mono text-2xs text-slate-300">
          {plan.files.map((f) => (
            <li key={f.path} className="flex gap-2">
              <span title={t(STATUS_KEY[f.status])} className="w-3 shrink-0 text-slate-500">
                {STATUS_MARK[f.status]}
              </span>
              <span title={f.path} className="min-w-0 truncate">
                {f.path}
              </span>
            </li>
          ))}
        </ul>
        {plan.conflicts.length > 0 && (
          <div
            data-revert-conflicts=""
            className="flex flex-col gap-1 rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-2 text-2xs text-[var(--status-warning-text)]"
          >
            <p>{t("changes.revertConflicts")}</p>
            <ul>
              {plan.conflicts.map((c) => (
                <li key={c.id}>{[c.agentName, c.label || t(REASON_KEY[c.reason])].filter(Boolean).join(" · ")}</li>
              ))}
            </ul>
          </div>
        )}
        {plan.conflictsPartial && <p className="text-2xs">{t("changes.conflictsPartial")}</p>}
        {plan.runningAgents.length > 0 && (
          <p data-revert-running="" className="text-2xs text-[var(--status-warning-text)]">
            {t("changes.revertRunning", { names: plan.runningAgents.join(", ") })}
          </p>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Görünüm** — `src/changes/ChangesView.tsx`

(a) İçe aktarmalar:

```ts
import { LIVE_POLL_MS, type Checkpoint, type DiffResult, type FileChange, type RangeResult, type RangeStats } from "../../app-electron/shared/changesTypes";
import { clockLabel, FAILURE_KEY, newestFirst, REASON_KEY, REPO_KEY, REVIEW_KEY, STATUS_KEY, STATUS_MARK } from "./changesFormat";
import { useChangesState } from "./useChanges";
import DiffViewer from "./DiffViewer";
```

yerine:

```ts
import {
  LIVE_POLL_MS,
  type Checkpoint,
  type DiffResult,
  type FileChange,
  type RangeResult,
  type RangeStats,
  type RevertPlan,
  type RevertResult
} from "../../app-electron/shared/changesTypes";
import {
  canAccept,
  canRevert,
  clockLabel,
  FAILURE_KEY,
  latestForSubtask,
  newestFirst,
  REASON_KEY,
  REPO_KEY,
  REVIEW_KEY,
  STATUS_KEY,
  STATUS_MARK
} from "./changesFormat";
import { useChangesFocus } from "./changesFocus";
import { useChangesState } from "./useChanges";
import DiffViewer from "./DiffViewer";
import RevertDialog from "./RevertDialog";
```

ve `import { TOOL_BUTTON } from "../ui/buttons";` satırını `import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";` yap; `import { useEffect, useRef, useState } from "react";` aynı kalır. `import { X } from "lucide-react";` satırını `react` içe aktarmasının ALTINA ekle.

(b) Durum: 

```ts
  const diffRequest = useRef(0);
  const mounted = useRef(true);
```

satırlarının ALTINA:

```ts
  const [plan, setPlan] = useState<{ checkpointId: string; plan: RevertPlan } | null>(null);
  const [outcome, setOutcome] = useState<RevertResult | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const { focus, clearFocus } = useChangesFocus();
```

(c) Odak: "Seçili kayıt listeden düştüyse" efektinin (…`}, [state, selected]);`) ALTINA:

```ts
  // Pano ayrıntı panelinden "Değişiklikler" (spec §5): o alt görevin en son kaydı seçili.
  useEffect(() => {
    if (!focus || focus.workspaceId !== workspace.id || !state) return;
    const target = latestForSubtask(state.checkpoints, focus.subtaskId);
    setSelected(target ? target.id : LIVE);
    setNotice(target ? null : "changes.noSubtaskRecord");
    setOutcome(null);
    clearFocus();
  }, [focus, state, workspace.id, clearFocus]);
```

(d) Eylemler: `goTerminal` tanımının ALTINA:

```ts
  const select = (id: string) => {
    setSelected(id);
    setNotice(null);
    setOutcome(null);
  };

  /** Tek uçuş: komut sürerken ikinci tıklama yok sayılır; söküldükten sonra durum yazılmaz. */
  const runLocked = async <T,>(job: () => Promise<T>): Promise<T | null> => {
    if (pendingRef.current) return null;
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try {
      return await job();
    } catch {
      return null;
    } finally {
      pendingRef.current = false;
      if (mounted.current) setPending(false);
    }
  };

  const accept = async (id: string) => {
    const r = await runLocked(() => window.api.changesAccept(workspace.id, id));
    if (mounted.current && r && !r.ok) setError(FAILURE_KEY[r.reason]);
  };

  const prepareRevert = async (id: string) => {
    setOutcome(null);
    const r = await runLocked(() => window.api.changesPrepareRevert(workspace.id, id));
    if (!mounted.current || !r) return;
    if (r.ok) setPlan({ checkpointId: id, plan: r.plan });
    else setError(FAILURE_KEY[r.reason]);
  };

  // Yalnız kullanıcının penceredeki listesi gidiyor (spec §7: yol yalnız kaydın aralığından).
  const confirmRevert = async () => {
    const current = plan;
    setPlan(null);
    if (!current) return;
    const r = await runLocked(() => window.api.changesRevert(workspace.id, current.checkpointId, current.plan.files.map((f) => f.path)));
    if (!mounted.current) return;
    setOutcome(r ?? { ok: false, reason: "git", restored: [], trashed: [], skipped: [] });
  };
```

(e) Satır tıklamaları: `onClick={() => setSelected(LIVE)}` ifadesini `onClick={() => select(LIVE)}`, `onClick={() => setSelected(c.id)}` ifadesini `onClick={() => select(c.id)}` yap.

(f) Düğmeler: 

```tsx
          <div data-actions="" className="flex shrink-0 gap-1.5">
            {actionCp && actionPane && (
```

satırlarını şununla değiştir:

```tsx
          <div data-actions="" className="flex shrink-0 gap-1.5">
            {actionCp && canAccept(actionCp) && (
              <button type="button" disabled={pending} onClick={() => void accept(actionCp.id)} className={ACTION}>
                {t("changes.accept")}
              </button>
            )}
            {actionCp && (
              <button
                type="button"
                disabled={pending || !canRevert(actionCp, expired)}
                onClick={() => void prepareRevert(actionCp.id)}
                className={`${ACTION} hover:text-[var(--status-danger-text)]`}
              >
                {t("changes.revert")}
              </button>
            )}
            {actionCp && actionPane && (
```

(g) Sonuç şeridi ve pencere: `        <ChangesBody shown={shown} file={file} diff={diff} onOpen={openFile} />` satırını şununla değiştir:

```tsx
        {notice && (
          <p role="status" className="shrink-0 border-b border-line px-3 py-1.5 text-2xs text-slate-400">
            {t(notice)}
          </p>
        )}
        {outcome && <RevertOutcome outcome={outcome} onClose={() => setOutcome(null)} />}
        <ChangesBody shown={shown} file={file} diff={diff} onOpen={openFile} />
        <RevertDialog open={plan !== null} plan={plan?.plan ?? null} onConfirm={() => void confirmRevert()} onCancel={() => setPlan(null)} />
```

(h) Dosyanın SONUNA:

```tsx
/** Geri alma sonucu (spec §8): başarı özeti ya da durduğu dosya + o ana kadar yazılanlar; her durumda geri almayı geri alma yolu. */
function RevertOutcome({ outcome, onClose }: { outcome: RevertResult; onClose: () => void }) {
  const t = useT();
  const written = [...outcome.restored, ...outcome.trashed];
  return (
    <div
      role={outcome.ok ? "status" : "alert"}
      data-revert-outcome={outcome.ok ? "ok" : "fail"}
      className={`flex shrink-0 flex-col gap-1 border-b px-3 py-2 text-2xs ${
        outcome.ok
          ? "border-line text-slate-300"
          : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
      }`}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1">
          {outcome.ok
            ? t("changes.revertDone", { restored: outcome.restored.length, trashed: outcome.trashed.length })
            : t(FAILURE_KEY[outcome.reason ?? "git"])}
        </p>
        <button type="button" onClick={onClose} title={t("changes.dismiss")} aria-label={t("changes.dismiss")} className={GHOST_ICON_BUTTON}>
          <X size={12} />
        </button>
      </div>
      {!outcome.ok && outcome.failedPath && <p>{t("changes.revertFailedAt", { path: outcome.failedPath })}</p>}
      {!outcome.ok && written.length > 0 && (
        <>
          <p>{t("changes.revertPartial", { count: written.length })}</p>
          <ul className="font-mono">
            {written.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {outcome.skipped.length > 0 && <p>{t("changes.revertSkipped", { count: outcome.skipped.length })}</p>}
      {outcome.beforeRestoreId && <p>{t("changes.revertUndoHint")}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Pano bağlantısı** — `src/board/BoardDetailPanel.tsx`

İçe aktarmalarda `import DraftEditor from "./DraftEditor";` satırının ALTINA:

```ts
import { useChangesFocus } from "../changes/changesFocus";
```

`const { commands } = useTerminalStore();` satırının ALTINA:

```ts
  const { requestFocus } = useChangesFocus();
```

`goToTerminal` tanımının ALTINA:

```ts
  // Değişiklikler görünümüne, bu alt görevin en son geri alma noktası seçili (spec 2026-10-18 degisiklikler §5).
  const goToChanges = (subtaskId: string) => {
    requestFocus(workspace.id, subtaskId);
    commands.setWorkspaceView(workspace.id, "changes");
  };
```

Alt görev satırındaki

```tsx
                  {s.note && <span>{t(NOTE_KEY[s.note])}</span>}
                </div>
```

satırlarını şununla değiştir:

```tsx
                  {s.note && <span>{t(NOTE_KEY[s.note])}</span>}
                  {/* Yalnız bir ajana gönderilmiş alt görevde: dağıtım anında geri alma noktası alınmıştır. */}
                  {(s.dispatchedAt !== undefined || s.attempts > 0) && (
                    <button
                      type="button"
                      data-subtask-changes={s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToChanges(s.id);
                      }}
                      className="cursor-pointer text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                    >
                      {t("changes.boardLink")}
                    </button>
                  )}
                </div>
```

- [ ] **Step 7: Yeşili gör**

Run: `npx vitest run tests/changesRevert.test.tsx tests/changesView.test.tsx tests/boardDetailPanel.test.tsx tests/i18n.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: temiz.

- [ ] **Step 8: Commit**

```bash
git add src/changes/RevertDialog.tsx src/changes/ChangesView.tsx src/board/BoardDetailPanel.tsx src/i18n/tr.ts src/i18n/en.ts tests/changesRevert.test.tsx
git commit -m "Degisiklikler: Kabul et, Geri al onayi ve sonucu, pano baglantisi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Kullanım rehberi, tam doğrulama ve elle deneme listesi

**Files:**
- Modify: `KULLANIM-REHBERI.md` ("### Ofis görünümü" bölümünün sonu, "## Klavye Kısayolları" başlığının önü)

**Interfaces:**
- Consumes: bütün önceki task'lar.
- Produces: rehberde "Değişiklikler" alt bölümü; yeşil tam takım; kullanıcıya elle deneme listesi.

- [ ] **Step 1: Rehber** — `KULLANIM-REHBERI.md`

"### Ofis görünümü" bölümünün son maddesinden

```markdown
- Ofisteyken terminaller kapanmaz, yalnız gizlenir. Windows'ta "Animasyon
  efektlerini göster" kapalıysa (hareketi azalt) ofiste hiçbir şey kıpırdamaz.
```

sonra, "## Klavye Kısayolları" başlığının hemen ÖNÜNE (arada bir boş satır):

```markdown
### Değişiklikler

Üst şeritteki **Bölmeler | Pano | Ofis | Değişiklikler** geçişinde
**Değişiklikler**, ajanların bu alanın klasöründe dosyalarda yaptığı
değişiklikleri gösterir ve beğenmediğini geri almanı sağlar. Yalnız **Git
deposu** olan klasörlerde çalışır (alanın kökü, yoksa ajanların varsayılan
klasörü); depo değilse ya da Git kurulu değilse bunu açıkça söyler. Klasörü
kendisi depoya çevirmez.

- **Geri alma noktası** kendiliğinden alınır: bir ajana istem gönderdiğinde
  (aynı ajan için en çok 30 saniyede bir), Görev Panosu bir alt görevi bir
  ajana verdiğinde ve her geri almadan hemen önce. **Geri alma noktası
  oluştur** ile elle de alabilirsin. Alan başına en yeni 200 nokta saklanır.
- Solda noktalar yeniden eskiye sıralıdır: saat, ajan, istemin başı (ya da alt
  görev başlığı), değişen dosya sayısı ve +/− satırlar, inceleme durumu. En
  üstteki **Canlı** satırı son noktadan bu yana çalışma klasöründe ne
  değiştiğini gösterir; görünüm açıkken birkaç saniyede bir tazelenir.
- Bir noktayı seçince sağda o noktadan bir sonraki noktaya kadar (en
  sonuncusunda: şu ana kadar) değişen dosyalar çıkar; dosyaya tıklayınca
  satır numaralı fark görünür. İkili ve 200 KB'tan büyük dosyalarda yalnız
  "değişti" yazar.
- **Kabul et** yalnız bir işarettir, dosyalara dokunmaz. Başlıktaki "N
  bekliyor" henüz incelemediğin noktaları sayar.
- **Geri al**, o noktanın değişikliklerini geri alır: önce etkilenecek
  dosyaları ve uyarıları gösterir (sonraki noktalar da bu dosyalara
  dokunduysa adlarıyla; o sırada çalışan ajanlar varsa adlarıyla). Onaylarsan
  önce şimdiki hâlin geri alma noktası alınır, sonra dosyalar eski hâline
  döner; sonradan eklenmiş dosyalar **çöp kutusuna** taşınır, kalıcı
  silinmez. Geri almayı geri almak için listedeki **Geri almadan önce**
  noktasını seçip **Geri al**'a bas.
- Senin Git durumuna dokunulmaz: dalın, son commit'in, `git add` ile
  hazırladıkların ve stash'lerin aynen kalır. `.gitignore`'daki dosyalar
  izlenmez. Git eski nesneleri temizlediyse (yaklaşık iki hafta sonra) nokta
  "Süresi doldu" der; farkı ve geri alması kapanır.
- Görev Panosu'nda bir alt görevin satırındaki **Değişiklikler** bağlantısı
  bu görünümü o alt görevin noktası seçili açar. **Terminale git** noktayı
  oluşturan ajanın terminalini öne getirir.
- SAP nesnelerindeki değişiklikler burada değil, **SAP yazma geçmişi**
  panelindedir.
```

- [ ] **Step 2: Tam doğrulama**

Run: `npm run typecheck`
Expected: temiz.

Run: `npx vitest run > .superpowers/vitest-degisiklik.txt 2>&1` ve dosyanın sonundaki özeti oku.
Expected: bütün dosyalar PASS (`changesGit.test.ts`'in "gerçek depo" grubu git yoksa "skipped" ve uyarı satırıyla). Bir test kırmızıysa: bu planın bilinçli değiştirdiği bir davranışı eski hâliyle bekliyorsa (ör. radyo sayısının üç olması, `readWorkspaceView("changes")`'in atılması), beklentiyi yeni davranışa çevir ve hangi sapmaya dayandığını commit mesajına yaz; değilse sistematik hata ayıklamaya geç (bu task'ı kapatmadan).

Run: `git status --short`
Expected: yalnız `KULLANIM-REHBERI.md` değişmiş (izlenmeyen `docs/superpowers/specs/2026-10-18-degisiklikler-design.md`, bu plan ve `resources/sap-toolkit/auth-plus/scripts/` dalda zaten olabilir; dokunma). `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*` stage edilmemiş.

Run: `git log --oneline -10`
Expected: Task 1–9 commit'leri; her konu satırı ASCII.

- [ ] **Step 3: Commit**

```bash
git add KULLANIM-REHBERI.md
git commit -m "Rehber: Degisiklikler gorunumu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Elle deneme listesini kullanıcıya ver** (spec §9; uygulamayı sen başlatma)

Hazırlık: bir deneme Git deposu (`git init`, bir iki dosya, ilk commit), içinde bir dosyayı `git add` ile hazırla, bir de `git stash` yap. Bu depoyu bir alanın kökü yap.

1. Önce `git status`, `git log --oneline -3`, `git stash list` çıktılarını not et.
2. Alanda bir axet-code ajanı aç; **Değişiklikler**'e geç → "Henüz geri alma noktası yok" ve Canlı satırı. Git deposu olmayan bir alanda aynı görünüm "Bu klasör bir Git deposu değil…" demeli.
3. Ajana "a.txt'ye bir satır ekle, yeni.txt diye bir dosya oluştur, b.txt'yi sil" de. İstemi gönderdiğin anda listede bir "İstem" noktası belirmeli; ajan çalışırken **Canlı** satırında dosya sayısı birkaç saniyede bir artmalı. Görüntü alma istemi geciktirmemeli.
4. Tur bitince noktayı seç → a.txt (+1), yeni.txt (eklendi), b.txt (silindi); a.txt'ye tıkla → satır numaralı fark, eklenen satır yeşil tonlu.
5. **Geri al** → pencerede üç dosya, "sonraki değişiklikler de geri alınır" uyarısı, "1 dosya çöp kutusuna taşınır". Onayla → a.txt ve b.txt eski hâlinde, yeni.txt Windows Geri Dönüşüm Kutusu'nda; listede "Geri almadan önce · …" noktası.
6. "Geri almadan önce" noktasını seçip **Geri al** → dosyalar 5. adımdan önceki hâline döner (yeni.txt yeniden yerinde).
7. 1. adımdaki üç komutu yeniden çalıştır → çıktılar aynı olmalı (hazırladığın dosya hâlâ "Changes to be committed"ta, stash duruyor, commit eklenmemiş).
8. Ajana 30 sn içinde art arda iki kısa istem gönder → yalnız bir yeni nokta. `/help` gibi bir motor komutu → nokta yok.
9. Görev Panosu'nda bir alt görev dağıt → "Pano ataması" noktası alt görev başlığıyla; ayrıntı panelindeki **Değişiklikler** bağlantısı görünümü o nokta seçili açmalı.
10. Bir ajan çalışırken eski bir noktada **Geri al**'a bas → pencerede "Şu an çalışan ajanlar var: …" uyarısı.
11. Uygulamayı kapatıp aç → noktalar ve inceleme durumları duruyor; alan Değişiklikler görünümünde açılıyor. `%APPDATA%\…\checkpoints\<alan>.json`'u elle boz → görünüm "Kayıt dosyası bozuktu; … olarak kenara alındı" demeli, dosya `.bozuk-<zaman>` olarak duruyor.
12. Günlük dosyasında (`degisiklik.goruntu`, `degisiklik.geriAl`) dosya adı, istem ya da içerik geçmemeli.

---

## Spec kapsama özeti

| Spec | Task |
|---|---|
| §1 üç soru, ilke (veri kaybı yok, geri almayı geri al), SAP kapsam dışı | 4, 8, 9; Global Constraints; rehber (10) |
| §2 yalnız Git deposu, depo değil/git yok mesajı, otomatik `git init` yok, HEAD/dal/index/stash/ref değişmez, `GIT_INDEX_FILE` + `add -A` + `write-tree`, `.gitignore`, gc → "süresi doldu" | 3, 4, 8; Review Focus 1 |
| §3 `checkpoints/<id>.json`, 200 sınırı, `Checkpoint` alanları, istem ilk 80 karakter, günlüğe yazılmaz | 1, 2, 4 (`stats` eklendi: sapma 4) |
| §4 dağıtım, istem (`InputLineBuffer`, 30 sn), elle, `beforeRestore`; asenkron, hata istemi engellemez, uyarı satırı, 20 sn | 4, 5, 6, 8 (sapma 5, 6) |
| §5 dört seçenekli geçiş, liste + Canlı (yalnız görünürken 3 sn), aralık → sonraki kayıt / çalışma ağacı, birleşik diff satır numaralı, mevcut tonlar, ikili/200 KB, Kabul et / Geri al / Terminale git, pano bağlantısı, "N bekliyor" | 7, 8, 9 (sapma 1) |
| §6 onay penceresi (dosyalar, sonraki değişiklik uyarısı, çakışan kayıtlar adıyla, çalışan ajan), önce `beforeRestore`, geçici index ile geri yükleme, eklenen dosya çöpe, yol doğrulama (`..`, mutlak, bağ), `reverted`, geri almayı geri al | 1, 3, 4, 9 (sapma 7, 8) |
| §7 execFile + sabit argüman, kabuksuz, renderer serbest yol gönderemez, 2 MB sınır + kırpma notu, sıralı kuyruk, `index.lock` 3 deneme, günlük etiketleri | 1, 3, 4, 6 (sapma 10, 11) |
| §8 hata tablosu (depo değil, gc, görüntü hatası, yazılamayan dosya, bozuk kayıt dosyası) | 2, 4, 8, 9 |
| §9 testler: saf, gerçek geçici depo (git yoksa atla + sebep), bileşen, i18n, elle deneme | 1–9, 10 |
| §10 kapsam dışı (SAP, satır bazında geri alma, otomatik commit, dal/worktree, push, git'siz klasör) | yapılmıyor |

