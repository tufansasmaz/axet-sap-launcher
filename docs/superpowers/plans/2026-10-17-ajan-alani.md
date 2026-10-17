# Ajan Alanı — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terminal ekranını, birden çok yapay zekâ ajanının kendi terminalinde yan yana çalıştığı, durumlarının tek bakışta göründüğü ve sorularının "Kararlar" panelinde toplandığı "Ajanlar" ekranına çevirmek.

**Architecture:**
- Her ajan bugünkü bölmeli terminalde bir bölme: bölme türü `agent` + ajan tanımı (`AgentSpec`). Ad, renk, klasör bölmenin kendi alanları. Eski `axet` bölmeleri okunurken motoru axet-code olan ajana dönüşüyor.
- Ana süreçte bir **izleyici** (`agentMonitor.ts`) her ajan için bir **okuyucu** tutuyor: axet-code için oturum veritabanından **kesin** okuyucu (istem→oturum eşlemesiyle), ötekiler için terminal hareketinden **tahmini** okuyucu. Terminal çıktısı `terminalManager`'dan, yazılan tuşlar `terminal:write` IPC'sinden izleyiciye akıyor; içerik yalnız bellekte.
- Durum değişimleri `agents:status` olayıyla renderer'a gidiyor; ekip şeridi, Kararlar paneli ve kenar çubuğu rozetleri bundan çiziliyor. Kararlar'dan cevap, izleyicinin "soru hâlâ açık mı" denetiminden sonra bölmeye ok tuşu + Enter olarak yazılıyor.

**Tech Stack:** Electron 44 (Node 24), TypeScript, React 18, vitest 2, @lydell/node-pty, better-sqlite3 (salt okuma, yalnız Electron'da). Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-17-ajan-alani-design.md` (§14 ölçümleri dahil; Task 1 §15'i ekliyor)

## Global Constraints

- Tasarım: **"daha fazla UI değil, daha güçlü hiyerarşi"**. Lime (accent) **YALNIZ seçim** için: seçili kart çerçevesi, seçili radyo. Durum renkleri `--status-*` jetonlarından (çalışıyor yeşil, soru kehribar, hata kırmızı, diğerleri gri).
- Ofis görünümü ve "Görünüm" düğmesi YOK (ölü düğme bırakılmaz).
- **Ana süreçte yakalanmamış istisna yok:** zamanlayıcı, alt süreç geri çağrıları, IPC işleyicileri ve okuyucular `try/catch` içinde; okuyucu hatası "tahmini"ye düşer.
- **Günlüğe mesaj, soru, seçenek ya da terminal içeriği yazılmaz.** Yalnız spec §11 etiketleri: `ajan.eklendi` (motor, rol: hazir/serbest, sap: evet/hayir), `ajan.durum` (motor, durum, kaynak: kesin/tahmini — yalnız değişimde), `ajan.karar` (motor, yol: liste/terminal), `ajan.eslesme` (motor, sonuc: istem/belirsiz). `bayrak` sonucu hiç üretilmez (§14.1: bayrak yok).
- **Ajan ASLA yanlış oturuma bağlanmaz.** Belirsizlikte (birden çok aday, aynı istemi bekleyen başka ajan, veritabanı okunamıyor) kaynak "tahmini"dir.
- Yazılan satırlar (istem eşleme için) **yalnız bellekte**, diske ve günlüğe yazılmaz.
- axet-code dışındaki motorlara **izin atlatma bayrağı EKLENMEZ** (`--dangerously-skip-permissions`, `--yolo`, `-y`, `--full-auto` vb.). axet-code `-y` ile kalır (kullanıcı kararı 2026-09-24). axet-code TUI'sinde model bayrağı yok (§14): model alanı yalnız `claude`/`codex`/`gemini` için.
- Kararlar'dan yalnız **tek seçimli, en az iki seçenekli, kaynağı kesin** soru cevaplanır; tuş dizisi `↓ × i` + `Enter` (Task 1 ölçümü). Serbest metin ve çok seçimli soru "Terminale git".
- SAP yazma kapısı (`SapWriteGate`), kademe kuralları (QA/PRD salt okunur) ve rol kapısı (`skillProfiles`) **DEĞİŞMEZ ve atlatılmaz**; bu plan o dosyalara dokunmaz.
- Düz kabuk bölmesi (cmd / PowerShell) çalışmaya devam eder: "+ Terminal" düğmesi ve bölme başlığındaki böl düğmeleri.
- Sınırlar aynen: en fazla 6 çalışma alanı, alan başına 9 bölme (ajanlar dahil).
- Uygulama içi kimlik `"terminal"` olarak kalır (config, `Activity`, `Ctrl+3`); yalnız görünen ad "Ajanlar" olur.
- Komutlar: `npm run typecheck`, `npx vitest run <dosya>`; tam takım `npx vitest run > .superpowers/vitest-ajan.txt 2>&1` (çıktı dosyaya).
- **Commit:** `git add` dosya dosya (asla `-A`/`.`); mesaj ASCII Türkçe; mesajın son satırı tam olarak `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Dal: `ozellik/ajan-alani` (dal değiştirme).
- **Asla stage edilmez:** `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*`.
- **Düzenleme:** Windows'ta Git Bash heredoc'u ters eğik çizgiyi bozuyor; dosyaları Edit/Write araçlarıyla değiştir. prettier çalıştırma. Kod yorumları tam Türkçe karakterle. Satır sonu dosyanın kendisininki.
- Geliştirme sunucusunu (`npm run dev`) başlatma. SAP sistemlerine dokunma.
- better-sqlite3 vitest'te yüklenmiyor (Electron ABI): veritabanı okuyan kod enjekte edilen okuyucularla test edilir; gerçek okuma `axetSessionDb.ts`'teki ince fonksiyonlarda kalır.
- Task 1'de gerçek axet-code çalıştırmak **onaylı** (yalnız ölçüm için, geçici klasörde, bağlayıcılar kapalı: `AXET_MCP_BASE_URL=http://127.0.0.1:9`).

## Review Focus

1. **Aynı klasörde iki axet-code ajanı aynı anda başlar ve aynı ilk istemi yazarsa**, hiçbiri öbürünün oturumuna bağlanmamalı; ikisi de "≈ tahmini" kalmalı, ayrışan ilk istemde ikisi de doğru oturuma bağlanmalı. Bir ajanın mesajı veritabanına öbüründen önce düşse bile (tek aday görünse bile) bağlanılmamalı. (Task 7 testleri: "aynı istem iki ajanda", "mesajı henüz düşmemiş rakip")
2. **Kararlar'dan cevap gönderilirken kullanıcı aynı bölmede yazıyorsa ya da soru açıldıktan sonra o bölmede herhangi bir tuşa bastıysa** (imleç yer değiştirmiş olabilir) tuş gönderilmemeli; satır "terminalden cevaplayın" demeli. (Task 8 testi "soru açıldıktan sonra dokunulduysa", Task 14 testi "dokunulmuş soru")
3. **Motor kapanıp kabuk istemi geri dönünce** kart "Bitti" + "Yeniden başlat" göstermeli; açılışta komut yankısından önceki ilk kabuk istemi "bitti" sayılmamalı; tahmini "bitti" bildirim çıkarmamalı. (Task 6 testi "yankıdan önceki istem", Task 8 testi "tahmini bitişte bildirim yok", Task 13 testi "bitti → Yeniden başlat")
4. **Oturum veritabanı yok, kilitli ya da okunurken hata fırlatıyor:** okuyucu hata fırlatmadan "≈ tahmini"ye düşmeli, izleyicinin zamanlayıcısı öteki ajanları okumaya devam etmeli. (Task 7 testleri "veritabanı okunamıyor/yok", Task 8 testi "bir okuyucu patlasa da öteki okunuyor")
5. **Eski kayıtlı düzen** (`axet` türü bölmeler, `agent` alanı bozuk kayıt, kök/SAP alanı olmayan alan) açılışta kaybolmadan açılmalı: `axet` → motoru axet-code olan ajan; bozuk ajan bölmesi atlanmalı, alanın geri kalanı yerinde kalmalı. (Task 4 testleri "eski axet bölmesi", "bozuk ajan alanı")

## Spec'ten bilinçli sapmalar ve netleştirmeler

1. **Bağ çözülebiliyor.** Spec §6.1 "bulunduktan sonra ajan→oturum bağı sabittir" diyor. Kullanıcı TUI'de yeni oturuma geçerse (Ctrl+N) sabit bağ yanlış oturumu okur; bu "ASLA yanlış oturuma bağlanmaz" kuralıyla çelişiyor. Plan: bağdan sonra yazılan bir istem, ajan çalışmıyorken 30 sn içinde bağlı oturumda görünmezse bağ çözülür, kaynak "tahmini"ye düşer, sonraki istemle yeniden eşlenir (`ajan.eslesme sonuc=belirsiz`).
2. **İlk istemden önce durum "Boşta ≈".** Spec "boşta" diyor ama kaynak söylemiyor; motorun kaydı henüz okunmadığı için kaynak "tahmini".
3. **Ad, renk, klasör bölmenin alanları.** `AgentSpec` yalnız `{ engine, role, roleKind, model?, command? }`; ajanın adı `pane.title`, rengi `pane.color`, klasörü `pane.cwd`. Bölmeyi yeniden adlandırmak ajanı yeniden adlandırır.
4. **Çalışma alanının kökü ve SAP sistemi** (§3) kenar çubuğundaki alan menüsünden: "Kök klasör…" ve "Kökü {SID} proje klasörü yap" (yalnız aktif SAP bağlamı varken). Yeni ajanın varsayılan klasörü: alanın kökü → `config.axetWorkspaceDir` → son bölmenin klasörü.
5. **`ozel` motorun "kurulu mu" denetimi başlatırken**, komutun ilk parçası `where` ile aranarak yapılır (komut ajan başına farklı).
6. **Başlatma yuvası bütün ajan motorlarına genişler:** bugün yalnız axet bölmeleri "terminal:ready" gelene kadar başlatma yuvası tutuyor; artık her ajan bölmesi tutuyor (dokuz ajan birden açılıp makineyi kilitlemesin).
7. **Kararlar paneli bütün çalışma alanlarının sorularını** gösterir ("bütün ajanların"); satıra tıklamak o alanı seçip bölmeyi öne getirir.
8. Bölme başlığındaki böl düğmeleri düz kabuk penceresini açmaya devam eder; ajan eklemek "+ Ajan"dan (odaktaki bölmenin uzun kenarından böler).

## Dosya yapısı

| Dosya | Sorumluluk | Task |
|---|---|---|
| `.superpowers/ajan-olcum/olcum.cjs` (atılır, commit edilmez) | Gerçek TUI ölçümü | 1 |
| `app-electron/shared/agentTypes.ts` (yeni) | Ajan, motor, durum, karar, kayıt türleri; kayıttan okuma | 2 |
| `app-electron/shared/agentEngines.ts` (yeni) | Motor tanımları, komut kurma, PATH'te aranacak program | 2 |
| `app-electron/shared/agentDecisions.ts` (yeni) | Listeden cevaplanabilir mi, seçenek tuş dizisi | 2 |
| `app-electron/main/agentEngineProbe.ts` (yeni) | Kurulu motorlar (`where`, axetBinaryStatus), axet-code ajan listesi | 3 |
| `app-electron/shared/types.ts`, `terminalLayout.ts` | `agent` bölme türü, eski `axet` göçü, alan kökü/SAP | 4 |
| `src/stores/terminal*.ts(x)` | Ajan bölmesi ekleme/başlatma, `revealPane`, `setWorkspaceRoot`, kayıt | 4, 10 |
| `src/agents/agentLabels.ts` (yeni) | Motor/bölme etiketleri, ajan adı | 4 |
| `app-electron/main/agentInput.ts` (yeni) | Yazılan tuşlardan gönderilen satır | 5 |
| `app-electron/main/terminalManager.ts` | Çıktı/çıkış dinleyicisi (`setTerminalTap`), `writeTerminal` sonucu | 5 |
| `app-electron/main/agentGenericReader.ts` (yeni) | Tahmini okuyucu, `AgentReader` arayüzü | 6 |
| `app-electron/main/agentAxetReader.ts` (yeni) | axet-code kesin okuyucu, istem→oturum eşleme, oturum kaydı | 7 |
| `app-electron/main/agentReaders.ts` (yeni) | Motor→okuyucu seçimi, canlı veritabanı bağlantısı | 7 |
| `app-electron/main/axetSessionDb.ts` | `findSessionsByPrompt`, `readSessionMessages` | 7 |
| `app-electron/main/agentMonitor.ts` (yeni) | İzleyici: kayıt, girdi/çıktı, yoklama, cevap, günlük, bildirim kararı | 8 |
| `app-electron/main/agentNotification.ts` (yeni) | Bildirim metni (saf) | 8 |
| `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts` | IPC ve bağlantılar | 3, 9 |
| `src/agents/agentStatusContext.tsx`, `agentView.ts` (yeni) | Durum aboneliği, saf görünüm yardımcıları | 11 |
| `src/agents/AddAgentDialog.tsx` (yeni) | Ajan ekleme penceresi | 12 |
| `src/agents/TeamStrip.tsx`, `AgentsEmptyState.tsx` (yeni), `src/terminal/TerminalMode.tsx` | Ekip şeridi, boş durum | 13 |
| `src/agents/DecisionsPanel.tsx` (yeni) | Kararlar paneli | 14 |
| `src/components/TerminalSidebar.tsx`, `src/agents/AgentOpenListener.tsx`, `AgentsModeBadge.tsx` (yeni), `src/shell/Sidebar.tsx`, `src/App.tsx` | Rozetler, alan menüsü, "Ajanlar" adı, bildirim tıklaması | 15 |
| `src/i18n/{tr,en}.ts` | Metinler (her task kendi anahtarlarını ekler) | 4, 10–15 |
| `KULLANIM-REHBERI.md` | "Ajanlar Ekranı" bölümü | 16 |

---

### Task 1: Ölçüm — 1.4.x TUI'de seçenek seçimi ve istemin veritabanına inişi

Ürün kodu YOK. Gerçek axet-code TUI'si, ürünün yaptığı gibi bir kabuğun içinde node-pty ile açılır; iki soru turunda seçenek tuş dizisi, istemin oturum veritabanına nasıl indiği ve motor kapanınca kabuk isteminin biçimi ölçülür. axet-code çalıştırmak bu ölçüm için onaylı; SAP sistemine dokunulmaz.

Planlama sırasında ölçülen (axet-code 1.4.1, 2026-10-17) ve Task 3'te test verisi olarak kullanılan çıktı: `axet-code agent list --json` beş yerleşik ajanı `name/scope/model/permissions/description` alanlarıyla JSON dizi olarak veriyor (`permissions: "ask (default)"`). Bu task onu yeniden ölçmez.

**Files:**
- Create (commit EDİLMEZ, `.superpowers/` git dışı): `.superpowers/ajan-olcum/olcum.cjs`
- Modify: `docs/superpowers/specs/2026-10-17-ajan-alani-design.md` (sona §15 eklenir)

**Interfaces:**
- Consumes: yok.
- Produces: §15 bulguları ve iki karar. (a) **Ruling A:** Kararlar'da listeden cevap sürüm 1'de var mı → Task 2'deki `LIST_ANSWER_ENABLED` sabiti. (b) **Ruling B:** motor kapanınca kabuk isteminin son satırı → Task 6'daki `isShellPromptLine` düzenine uyuyor mu.

- [ ] **Step 1: Ön koşulları denetle**

Run: `axet-code --version` ve `node --version`
Expected: `axet-code version 1.4.x` (≥ 1.4.0) ve Node ≥ 22.5 (betik `node:sqlite` kullanıyor). axet-code daha önce bu makinede hiç etkileşimli açılmadıysa bir kez elle `axet-code` açıp araç/model seçimini yap, sonra kapat (betik açılış diyaloğunu görürse durur).

- [ ] **Step 2: Ölçüm betiğini yaz** — `.superpowers/ajan-olcum/olcum.cjs`

```js
// Atılacak ölçüm betiği (plan 2026-10-17 ajan-alani, Task 1). Depoya GİRMEZ.
// Ürünün yaptığı gibi: kabuk (cmd) açılır, `axet-code -y` ilk satır olarak
// yazılır. Bağlayıcılar kapalı. Oturum veritabanı node:sqlite ile SALT OKUNUR.
const pty = require("@lydell/node-pty");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const OUT = path.join(__dirname, "sonuc.json");
// İsteğe bağlı: OLCUM_ARALIK=120 → tuşlar tek tek, aralıklı yazılır (yalnız bilgi için).
const GAP = Number(process.env.OLCUM_ARALIK || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) =>
  s
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[@-_]/g, "");
const matchKey = (t) => t.replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ajan-olcum-"));
fs.mkdirSync(path.join(dir, ".axet-code"), { recursive: true });
const dbPath = path.join(dir, ".axet-code", "axet-code.db");
const result = { dir, aralikMs: GAP, steps: [] };
const note = (k, v) => {
  result.steps.push({ k, v, t: Date.now() });
  console.log(k, JSON.stringify(v));
};

let screen = "";
const shell = pty.spawn(process.env.COMSPEC || "cmd.exe", [], {
  name: "xterm-color",
  cols: 120,
  rows: 34,
  cwd: dir,
  env: { ...process.env, AXET_MCP_BASE_URL: "http://127.0.0.1:9" }
});
shell.onData((d) => {
  screen += d;
  if (screen.length > 400000) screen = screen.slice(-200000);
});

async function waitFor(fn, ms, label) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await sleep(250);
  }
  throw new Error(`zaman aşımı: ${label}`);
}
function rows(sql, ...args) {
  if (!fs.existsSync(dbPath)) return [];
  let d = null;
  try {
    d = new DatabaseSync(dbPath, { readOnly: true });
    return d.prepare(sql).all(...args);
  } catch {
    return [];
  } finally {
    try {
      d && d.close();
    } catch {}
  }
}
function parts(raw) {
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
const textOf = (raw) => parts(raw).filter((p) => p.type === "text").map((p) => (p.data && p.data.text) || "").join("");

async function typeSlowly(text) {
  for (const ch of text) {
    shell.write(ch);
    await sleep(8);
  }
}

async function askRound(label, prompt, index, expected, startSec) {
  const typedAt = Date.now();
  await typeSlowly(prompt);
  shell.write("\r");
  const needle = matchKey(prompt).slice(0, 80);
  const hit = await waitFor(
    () =>
      rows(
        "SELECT session_id, parts, created_at FROM messages WHERE role='user' AND created_at>=? ORDER BY created_at DESC LIMIT 40",
        startSec
      ).find((r) => matchKey(textOf(r.parts)).includes(needle)),
    60000,
    `${label}: istem veritabanında`
  );
  note(`${label}.istemDbde`, {
    sessionId: hit.session_id,
    gecikmeMs: Date.now() - typedAt,
    saklanan: textOf(hit.parts).slice(0, 300),
    anahtarTuttu: matchKey(textOf(hit.parts)).includes(needle)
  });
  const call = await waitFor(() => {
    const all = rows("SELECT parts FROM messages WHERE session_id=? ORDER BY created_at ASC", hit.session_id).flatMap((r) => parts(r.parts));
    const done = new Set(all.filter((p) => p.type === "tool_result").map((p) => p.data && p.data.tool_call_id));
    return all.find((p) => p.type === "tool_call" && p.data && p.data.name === "ask_user" && p.data.finished === true && !done.has(p.data.id));
  }, 180000, `${label}: ask_user`);
  note(`${label}.soru`, { callId: call.data.id, input: call.data.input });
  await sleep(1500); // kutunun çizilmesi için
  note(`${label}.ekranKutu`, strip(screen).slice(-1200));
  if (GAP > 0) {
    for (let i = 0; i < index; i += 1) {
      shell.write("\x1b[B");
      await sleep(GAP);
    }
    shell.write("\r");
  } else {
    // Ürünün yapacağı gibi: TEK yazım (bkz. shared/agentDecisions.ts optionKeys).
    shell.write("\x1b[B".repeat(index) + "\r");
  }
  const res = await waitFor(
    () =>
      rows("SELECT parts FROM messages WHERE session_id=?", hit.session_id)
        .flatMap((r) => parts(r.parts))
        .find((p) => p.type === "tool_result" && p.data && p.data.tool_call_id === call.data.id),
    60000,
    `${label}: tool_result`
  );
  const content = String((res.data && res.data.content) || "");
  note(`${label}.cevap`, { content: content.slice(0, 300), beklenen: expected, tuttu: content.includes(expected) });
  return { sessionId: hit.session_id, ok: content.includes(expected) };
}

(async () => {
  try {
    await sleep(1500);
    const startSec = Math.floor(Date.now() / 1000) - 2;
    shell.write("axet-code -y\r\n");
    await waitFor(() => {
      const s = strip(screen);
      if (/Choose your development tool|choose a provider and model|Mandatory update required/i.test(s)) {
        throw new Error("açılış diyaloğu: axet-code'u bir kez elle açıp kur");
      }
      return ["ctrl+c quit", "ctrl+p commands", "tab focus chat", "ctrl+j newline"].some((m) => s.includes(m));
    }, 90000, "TUI hazır");
    note("hazir", true);
    await sleep(2000);
    note("istemOncesiOturumlar", rows("SELECT id, created_at FROM sessions WHERE created_at>=?", startSec).length);
    const tag = Math.random().toString(36).slice(2, 8);
    const ask = (n) =>
      `Ölçüm ${tag}-${n} — ask_user aracını çağır: tek seçimli soru "Hangi renk?", seçenekler tam olarak "Kırmızı", "Mavi", "Yeşil". Başka araç kullanma; cevaptan sonra yalnız "tamam" yaz.`;
    const a = await askRound("tur1", ask(1), 1, "Mavi", startSec);
    await sleep(8000);
    const b = await askRound("tur2", ask(2), 2, "Yeşil", startSec);
    note("ayniOturum", a.sessionId === b.sessionId);
    note("oturumSayisi", rows("SELECT id FROM sessions WHERE created_at>=?", startSec).length);
    await sleep(5000);
    // Motoru kapat; kabuk istemi nasıl dönüyor?
    shell.write("\x03");
    await sleep(1500);
    shell.write("\x03");
    await sleep(3000);
    note("cikisSonrasiSonSatirlar", JSON.stringify(strip(screen).slice(-300)));
    result.karar = a.ok && b.ok ? "liste-cevabi-calisiyor" : "liste-cevabi-tutmadi";
  } catch (e) {
    result.hata = String((e && e.message) || e);
    result.ekran = strip(screen).slice(-2000);
  } finally {
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
    try {
      shell.kill();
    } catch {}
    console.log("SONUÇ:", result.karar || result.hata, "→", OUT);
    process.exit(0);
  }
})();
```

- [ ] **Step 3: Çalıştır**

Run: `node .superpowers/ajan-olcum/olcum.cjs`
Expected: birkaç dakika içinde `SONUÇ: liste-cevabi-calisiyor → …sonuc.json`. `tur1.cevap.tuttu` ve `tur2.cevap.tuttu` true.

Sonuç `liste-cevabi-tutmadi` ise bir kez de `OLCUM_ARALIK=120 node .superpowers/ajan-olcum/olcum.cjs` çalıştır ve iki sonucu da not et (aralıklı yazımın tutması yalnız bilgi; sürüm 1 kararı tek yazıma göre). Betik zaman aşımına düşerse `sonuc.json`'daki `ekran`'ı oku; ajan `ask_user` çağırmadıysa istemi bir kez daha dene (model bazen aracı atlıyor), yine olmazsa bunu bulgu olarak yaz.

- [ ] **Step 4: Bulguları spec'e ekle** — `docs/superpowers/specs/2026-10-17-ajan-alani-design.md` dosyasının SONUNA, `sonuc.json`'daki değerlerle:

```markdown
## 15. Görev 1 ölçümleri — TUI (2026-10-17, axet-code <sürüm>)

Gerçek TUI, ürünün yaptığı gibi cmd içinde `axet-code -y` ile, bağlayıcılar kapalı, geçici klasörde açıldı (betik depoda değil).

1. **Seçenek seçimi:** `↓ × i` + `Enter` TEK yazımda — tur 1 (i=1, "Mavi"): <tuttu/tutmadı>; tur 2 (i=2, "Yeşil"): <tuttu/tutmadı>. İkinci turda imleç yine ilk seçenekten başladı: <evet/hayır>. (Aralıklı yazım denendiyse sonucu.)
2. **İstem veritabanında:** yazılan istem <N> ms sonra `messages` tablosunda `role='user'` olarak göründü; `matchKey` ile aranan anahtar <tuttu/tutmadı> (em-dash ve Türkçe harfli istem). İstemden önce açılmış oturum sayısı: <N>. İki tur aynı oturumda: <evet/hayır>.
3. **Motor kapanınca kabuk:** Ctrl+C ×2 sonrası son satırlar: `<son 300 karakterden istem satırı>`.

**Karar A (Kararlar'dan liste cevabı, sürüm 1):** <VAR / YOK>. Gerekçe: madde 1.
**Karar B (kabuk istemi düzeni):** son satır `^(?:PS )?[A-Za-z]:\\[^<>|"]*>$` düzenine <uyuyor / uymuyor: gerçek biçim …>.
```

`<…>` alanlarını ölçülen değerlerle doldur; şablon cümleyi değil ölçümü yaz.

- [ ] **Step 5: Kararları kaydet**

Ledger'a iki satır:
- `Ruling A: LIST_ANSWER_ENABLED = true` (iki tur da tuttuysa) ya da `= false` (biri tutmadıysa). Task 2 Step 3 ve Task 8'in iki başarı testi buna göre yazılır.
- `Ruling B: isShellPromptLine düzeni aynen` ya da `düzen şuna genişler: …` (Task 6 Step 3'teki `RE_PROMPT` ve Step 1'deki istem testi bu gerçek satırla yazılır).

- [ ] **Step 6: Commit** (yalnız spec dosyası; betik ve `sonuc.json` commit edilmez)

```bash
git add docs/superpowers/specs/2026-10-17-ajan-alani-design.md
git commit -m "Spec: Ajan Alani Task 1 olcumleri (TUI secenek secimi, istem eslesmesi)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Ajan türleri, motor tanımları ve komut kurma (ortak, saf)

**Files:**
- Create: `app-electron/shared/agentTypes.ts`
- Create: `app-electron/shared/agentEngines.ts`
- Create: `app-electron/shared/agentDecisions.ts`
- Test: `tests/agentEngines.test.ts`

**Interfaces:**
- Consumes: Task 1 Ruling A (`LIST_ANSWER_ENABLED`).
- Produces (sonraki her task bunları kullanır):

```ts
// agentTypes.ts
export type AgentEngineId = "axet-code" | "claude" | "codex" | "gemini" | "ozel";
export const AGENT_ENGINE_IDS: readonly AgentEngineId[];
export function isAgentEngineId(value: unknown): value is AgentEngineId;
export type AgentRoleKind = "preset" | "custom" | "axetAgent";
export interface AgentSpec { engine: AgentEngineId; role: string; roleKind: AgentRoleKind; model?: string; command?: string }
export const AGENT_ROLE_MAX = 40; export const AGENT_MODEL_MAX = 80; export const AGENT_COMMAND_MAX = 300;
export const LEGACY_AXET_AGENT: AgentSpec;            // { engine: "axet-code", role: "", roleKind: "custom" }
export function readAgentSpec(raw: unknown): AgentSpec | null;
export const AGENT_ENGINE_MISSING = "AGENT_ENGINE_MISSING";
export type AgentState = "running" | "idle" | "asking" | "finished" | "error" | "unknown";
export type AgentStatusSource = "exact" | "estimated";
export interface AgentQuestion { callId: string; question: string; header: string; options: string[]; multiSelect: boolean; askedAt: number }
export interface AgentStatus { state: AgentState; source: AgentStatusSource; lastActivity: number | null; question?: AgentQuestion; detail?: string }
export interface AgentStatusEvent { paneId: string; status: AgentStatus }
export interface AgentRegistration { paneId: string; ptyId: string; engine: AgentEngineId; cwd: string; command: string; name: string; roleKind: AgentRoleKind; sap: boolean; added: boolean }
export type AgentAnswerFailure = "noAgent" | "closed" | "notAnswerable" | "typing" | "writeFailed";
export type AgentAnswerResult = { ok: true } | { ok: false; reason: AgentAnswerFailure };
export interface AgentEngineInfo { id: AgentEngineId; installed: boolean; blocked: boolean; note?: string }
export interface AxetAgentEntry { name: string; scope: string; permissions: string; description: string }
// agentEngines.ts
export interface AgentEngineDef { id: AgentEngineId; binary: string | null; base: string; modelFlag: string | null; reader: "axet" | "generic" }
export const AGENT_ENGINES: Record<AgentEngineId, AgentEngineDef>;
export function isSafeArg(value: string): boolean;
export function engineBinary(spec: AgentSpec): string | null;
export function buildAgentCommand(spec: AgentSpec, axetCommand: string): string;
// agentDecisions.ts
export const LIST_ANSWER_ENABLED: boolean;
export function isListAnswerable(question: AgentQuestion): boolean;
export function optionKeys(index: number): string;
```

- [ ] **Step 1: Kırmızı test** — `tests/agentEngines.test.ts`

```ts
// Ajan motorları, komut kurma ve kayıttan okuma (spec 2026-10-17 ajan-alani §3, §5, §7).
import { describe, expect, it } from "vitest";
import { buildAgentCommand, engineBinary, isSafeArg } from "../app-electron/shared/agentEngines";
import { LEGACY_AXET_AGENT, readAgentSpec, type AgentQuestion, type AgentSpec } from "../app-electron/shared/agentTypes";
import { LIST_ANSWER_ENABLED, isListAnswerable, optionKeys } from "../app-electron/shared/agentDecisions";

const spec = (over: Partial<AgentSpec>): AgentSpec => ({ engine: "claude", role: "", roleKind: "custom", ...over });

describe("buildAgentCommand", () => {
  it("axet-code: ayarlardaki komut, boşsa axet-code -y", () => {
    expect(buildAgentCommand(LEGACY_AXET_AGENT, "")).toBe("axet-code -y");
    expect(buildAgentCommand(LEGACY_AXET_AGENT, "  axet-code -y -d ")).toBe("axet-code -y -d");
  });

  it("axet-code ajanı --agent ile; serbest rol bayrağa girmiyor", () => {
    expect(buildAgentCommand({ engine: "axet-code", role: "coder", roleKind: "axetAgent" }, "")).toBe("axet-code -y --agent coder");
    expect(buildAgentCommand({ engine: "axet-code", role: "Analist", roleKind: "custom" }, "")).toBe("axet-code -y");
  });

  it("axet-code'a model bayrağı eklenmiyor (TUI'de yok, spec §14)", () => {
    expect(buildAgentCommand({ ...LEGACY_AXET_AGENT, model: "large" }, "")).toBe("axet-code -y");
  });

  it("model yalnız bayrağı bilinen motorlarda", () => {
    expect(buildAgentCommand(spec({ engine: "claude", model: "sonnet" }), "")).toBe("claude --model sonnet");
    expect(buildAgentCommand(spec({ engine: "codex", model: "gpt-5" }), "")).toBe("codex --model gpt-5");
    expect(buildAgentCommand(spec({ engine: "gemini", model: "gemini-2.5-pro" }), "")).toBe("gemini --model gemini-2.5-pro");
    expect(buildAgentCommand(spec({ engine: "claude" }), "")).toBe("claude");
  });

  it("öteki motorlara izin atlatma bayrağı eklenmiyor", () => {
    for (const engine of ["claude", "codex", "gemini"] as const) {
      const cmd = buildAgentCommand(spec({ engine, model: "m1", role: "Geliştirici", roleKind: "preset" }), "axet-code -y");
      expect(cmd).not.toMatch(/dangerously|--yolo|(^|\s)-y(\s|$)|bypass|full-auto/);
    }
  });

  it("kabuk karakterli model ve rol komuta girmiyor", () => {
    expect(buildAgentCommand(spec({ model: "x & del C:\\" }), "")).toBe("claude");
    expect(buildAgentCommand({ engine: "axet-code", role: "coder & calc", roleKind: "axetAgent" }, "")).toBe("axet-code -y");
  });

  it("özel motor: kullanıcının komutu kırpılıp olduğu gibi", () => {
    expect(buildAgentCommand({ engine: "ozel", role: "", roleKind: "custom", command: "  opencode --port 1 " }, "")).toBe("opencode --port 1");
  });
});

describe("engineBinary ve isSafeArg", () => {
  it("bilinen motorda program adı, özelde komutun ilk parçası (tırnaklı yol dahil)", () => {
    expect(engineBinary(spec({ engine: "codex" }))).toBe("codex");
    expect(engineBinary(LEGACY_AXET_AGENT)).toBe("axet-code");
    expect(engineBinary({ engine: "ozel", role: "", roleKind: "custom", command: "kiro-cli chat" })).toBe("kiro-cli");
    expect(engineBinary({ engine: "ozel", role: "", roleKind: "custom", command: '"C:\\Program Files\\Kiro\\kiro.exe" chat' })).toBe(
      "C:\\Program Files\\Kiro\\kiro.exe"
    );
    expect(engineBinary({ engine: "ozel", role: "", roleKind: "custom", command: "  " })).toBeNull();
  });

  it("güvenli argüman: harf/rakamla başlar, boşluk ve kabuk karakteri yok", () => {
    expect(isSafeArg("anthropic/claude-sonnet-4")).toBe(true);
    expect(isSafeArg("gpt-5")).toBe(true);
    expect(isSafeArg("-y")).toBe(false);
    expect(isSafeArg("a b")).toBe(false);
    expect(isSafeArg("a|b")).toBe(false);
    expect(isSafeArg("")).toBe(false);
  });
});

describe("readAgentSpec", () => {
  it("bozuk değer ve bilinmeyen motor null", () => {
    for (const raw of [undefined, null, "x", 3, {}, { engine: "bash" }]) expect(readAgentSpec(raw)).toBeNull();
  });

  it("özel motor komutsuzsa null", () => {
    expect(readAgentSpec({ engine: "ozel", role: "", roleKind: "custom" })).toBeNull();
    expect(readAgentSpec({ engine: "ozel", command: "   " })).toBeNull();
  });

  it("geçerli değer temizleniyor: rol kırpılıyor, bilinmeyen rol türü serbest, boş model atılıyor", () => {
    expect(readAgentSpec({ engine: "claude", role: `  ${"r".repeat(60)}  `, roleKind: "garip", model: "  " })).toEqual({
      engine: "claude",
      role: "r".repeat(40),
      roleKind: "custom"
    });
    expect(readAgentSpec({ engine: "axet-code", role: "coder", roleKind: "axetAgent" })).toEqual({
      engine: "axet-code",
      role: "coder",
      roleKind: "axetAgent"
    });
    expect(readAgentSpec({ engine: "ozel", command: " opencode ", model: "m" })).toEqual({
      engine: "ozel",
      role: "",
      roleKind: "custom",
      model: "m",
      command: "opencode"
    });
  });
});

describe("Kararlar yardımcıları", () => {
  const q = (over: Partial<AgentQuestion>): AgentQuestion => ({
    callId: "c1",
    question: "Hangi renk?",
    header: "",
    options: ["Kırmızı", "Mavi"],
    multiSelect: false,
    askedAt: 0,
    ...over
  });

  it("seçenek tuş dizisi: i kez aşağı ok + Enter", () => {
    expect(optionKeys(0)).toBe("\r");
    expect(optionKeys(2)).toBe("\x1b[B\x1b[B\r");
    expect(optionKeys(-3)).toBe("\r");
  });

  it("çok seçimli ve tek seçenekli soru listeden cevaplanmıyor", () => {
    expect(isListAnswerable(q({ multiSelect: true }))).toBe(false);
    expect(isListAnswerable(q({ options: ["Tek"] }))).toBe(false);
  });

  it("tek seçimli iki seçenekli soru Task 1 kararına göre", () => {
    expect(isListAnswerable(q({}))).toBe(LIST_ANSWER_ENABLED);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentEngines.test.ts`
Expected: FAIL — `Failed to resolve import "../app-electron/shared/agentEngines"`.

- [ ] **Step 3: Uygula**

`app-electron/shared/agentTypes.ts`:

```ts
// Ajan Alanı'nın ortak türleri (spec 2026-10-17 ajan-alani §3).
//
// Ana süreç ve renderer aynı türleri kullanıyor; bu yüzden `shared` altında.
// Ajanın ADI, RENGİ ve KLASÖRÜ burada değil: ajan bir terminal bölmesi ve bu
// üçü bölmenin kendi alanları (`title`, `color`, `cwd`). Burada yalnız
// bölmeyi ajan yapan şey var: hangi motor, hangi rol.

export type AgentEngineId = "axet-code" | "claude" | "codex" | "gemini" | "ozel";

export const AGENT_ENGINE_IDS: readonly AgentEngineId[] = ["axet-code", "claude", "codex", "gemini", "ozel"];

export function isAgentEngineId(value: unknown): value is AgentEngineId {
  return typeof value === "string" && (AGENT_ENGINE_IDS as readonly string[]).includes(value);
}

/**
 * Rol nereden geldi: hazır listeden (`preset`), kullanıcının yazdığı metin
 * (`custom`) ya da axet-code'un kendi ajanı (`axetAgent`, `--agent <ad>` ile
 * başlatılıyor; spec §14.2).
 */
export type AgentRoleKind = "preset" | "custom" | "axetAgent";

export interface AgentSpec {
  engine: AgentEngineId;
  role: string;
  roleKind: AgentRoleKind;
  /** Yalnız model bayrağı bilinen motorlarda kullanılıyor (bkz. agentEngines.ts). */
  model?: string;
  /** Yalnız `ozel` motorda: kullanıcının yazdığı komut satırı. */
  command?: string;
}

export const AGENT_ROLE_MAX = 40;
export const AGENT_MODEL_MAX = 80;
export const AGENT_COMMAND_MAX = 300;

/** Eski `axet` bölmesinin dönüştüğü ajan: rolsüz axet-code. */
export const LEGACY_AXET_AGENT: AgentSpec = { engine: "axet-code", role: "", roleKind: "custom" };

/**
 * Kayıttan (config dosyası, IPC) gelen ajan alanını doğrular. Bozuksa `null`;
 * çağıran bölmeyi atlıyor. Dosya elle düzenlenebilir: hata fırlatmıyor.
 */
export function readAgentSpec(raw: unknown): AgentSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isAgentEngineId(record.engine)) return null;
  const roleKind: AgentRoleKind =
    record.roleKind === "preset" || record.roleKind === "axetAgent" ? record.roleKind : "custom";
  const role = typeof record.role === "string" ? record.role.trim().slice(0, AGENT_ROLE_MAX).trim() : "";
  const spec: AgentSpec = { engine: record.engine, role, roleKind };
  const model = typeof record.model === "string" ? record.model.trim().slice(0, AGENT_MODEL_MAX) : "";
  if (model) spec.model = model;
  if (record.engine === "ozel") {
    const command = typeof record.command === "string" ? record.command.trim().slice(0, AGENT_COMMAND_MAX) : "";
    if (!command) return null;
    spec.command = command;
  }
  return spec;
}

/**
 * Motoru kurulu olmayan ajan bölmesinin başlatma hatası. Renderer bu işareti
 * görünce "Başlatılamadı" yerine "kurulu değil" yazıyor (spec §10).
 */
export const AGENT_ENGINE_MISSING = "AGENT_ENGINE_MISSING";

export type AgentState = "running" | "idle" | "asking" | "finished" | "error" | "unknown";

/** `exact`: motorun kendi kaydından · `estimated`: terminal hareketinden (spec §2.5). */
export type AgentStatusSource = "exact" | "estimated";

/** Ajanın cevap bekleyen sorusu. `askedAt`: sorunun kayda düştüğü an (ms). */
export interface AgentQuestion {
  callId: string;
  question: string;
  header: string;
  options: string[];
  multiSelect: boolean;
  askedAt: number;
}

export interface AgentStatus {
  state: AgentState;
  source: AgentStatusSource;
  /** Son etkinlik (ms); bilinmiyorsa null. */
  lastActivity: number | null;
  question?: AgentQuestion;
  /** Kısa sebep (`end_turn`, `error`); içerik değil. */
  detail?: string;
}

export interface AgentStatusEvent {
  paneId: string;
  status: AgentStatus;
}

/** Renderer'ın bir ajan bölmesini izleyiciye kaydettirmesi (bkz. agentMonitor.ts). */
export interface AgentRegistration {
  paneId: string;
  ptyId: string;
  engine: AgentEngineId;
  cwd: string;
  /** Bölmeye ilk satır olarak yazılan komut (yankısı "motor kapandı" tespitinde aranıyor). */
  command: string;
  /** Bildirim başlığı: ajanın adı ya da motorun adı. */
  name: string;
  roleKind: AgentRoleKind;
  /** Alan bir SAP sistemine bağlı mı (yalnız günlük için). */
  sap: boolean;
  /** "+ Ajan" ile yeni eklendi mi (yeniden başlatma ya da geri yükleme değil). */
  added: boolean;
}

export type AgentAnswerFailure = "noAgent" | "closed" | "notAnswerable" | "typing" | "writeFailed";

export type AgentAnswerResult = { ok: true } | { ok: false; reason: AgentAnswerFailure };

export interface AgentEngineInfo {
  id: AgentEngineId;
  installed: boolean;
  /** Bölme açılmasın: kurulu değil ya da program bozuk. */
  blocked: boolean;
  /** Kartta gösterilecek kısa uyarı (ör. axet-code sürümü eski). */
  note?: string;
}

/** `axet-code agent list --json` satırı (spec §14.2). */
export interface AxetAgentEntry {
  name: string;
  scope: string;
  permissions: string;
  description: string;
}
```

`app-electron/shared/agentEngines.ts`:

```ts
// Ajan motorlarının tanımları ve başlangıç komutu (spec 2026-10-17 ajan-alani §3, §5).
//
// İzin kipi: axet-code bugünkü kararla `-y` (kullanıcı kararı 2026-09-24; SAP
// yazmaları ayrıca SapWriteGate'ten geçiyor). Öteki motorlara izin atlatma
// bayrağı EKLENMİYOR: motor kendi onayını terminalde soruyor.
import type { AgentEngineId, AgentSpec } from "./agentTypes";

export interface AgentEngineDef {
  id: AgentEngineId;
  /** PATH'te aranan program; `ozel` için null (komutun ilk parçası, bkz. engineBinary). */
  binary: string | null;
  /** Varsayılan komut. axet-code'da ayarlardaki `axetCommand` önce geliyor. */
  base: string;
  /** Model bayrağı; bilinmiyorsa null ve ekleme penceresinde model alanı yok. */
  modelFlag: string | null;
  /** `axet`: oturum veritabanından kesin durum · `generic`: terminal hareketinden tahmini. */
  reader: "axet" | "generic";
}

export const AGENT_ENGINES: Record<AgentEngineId, AgentEngineDef> = {
  // axet-code TUI'sinde model bayrağı yok (`-m` yalnız `run`'da; spec §14).
  "axet-code": { id: "axet-code", binary: "axet-code", base: "axet-code -y", modelFlag: null, reader: "axet" },
  claude: { id: "claude", binary: "claude", base: "claude", modelFlag: "--model", reader: "generic" },
  codex: { id: "codex", binary: "codex", base: "codex", modelFlag: "--model", reader: "generic" },
  gemini: { id: "gemini", binary: "gemini", base: "gemini", modelFlag: "--model", reader: "generic" },
  ozel: { id: "ozel", binary: null, base: "", modelFlag: null, reader: "generic" }
};

// Komut kabuğa yazılıyor (cmd/PowerShell). Model ve ajan adı kullanıcıdan
// geldiği için yalnız harf/rakamla başlayan, boşluksuz ve kabuk karakteri
// taşımayan değerler komuta giriyor; ötekiler sessizce atlanıyor.
const SAFE_ARG = /^[A-Za-z0-9][\w.:/@-]*$/;

export function isSafeArg(value: string): boolean {
  return SAFE_ARG.test(value);
}

/** PATH'te aranacak program. `ozel`de komutun ilk parçası (tırnaklı yol olabilir). */
export function engineBinary(spec: AgentSpec): string | null {
  if (spec.engine !== "ozel") return AGENT_ENGINES[spec.engine].binary;
  const match = /^\s*"([^"]+)"|^\s*(\S+)/.exec(spec.command ?? "");
  const first = (match?.[1] ?? match?.[2] ?? "").trim();
  return first || null;
}

export function buildAgentCommand(spec: AgentSpec, axetCommand: string): string {
  if (spec.engine === "ozel") return (spec.command ?? "").trim();
  const def = AGENT_ENGINES[spec.engine];
  const parts = [spec.engine === "axet-code" ? axetCommand.trim() || def.base : def.base];
  if (spec.engine === "axet-code" && spec.roleKind === "axetAgent" && isSafeArg(spec.role)) {
    parts.push("--agent", spec.role);
  }
  if (def.modelFlag && spec.model && isSafeArg(spec.model)) parts.push(def.modelFlag, spec.model);
  return parts.join(" ");
}
```

`app-electron/shared/agentDecisions.ts` (sabiti Task 1 Ruling A'ya göre yaz: iki tur tuttuysa `true`, değilse `false`):

```ts
// Kararlar paneli: hangi soru listeden cevaplanabilir, hangi tuşlar gönderilir
// (spec 2026-10-17 ajan-alani §7).
//
// axet-code soru kutusunda imleç ilk seçenekte açılıyor; `i` numaralı seçenek
// = `i` kez aşağı ok + Enter (eski TUI köprüsü 2026-09-05 ölçümü, 1.4.x için
// Task 1 ölçümü, spec §15). Serbest metin ve çok seçimli soru terminalde
// cevaplanıyor.
import type { AgentQuestion } from "./agentTypes";

/** Task 1 Karar A: 1.4.x TUI'de tek yazımla seçenek seçimi tuttu mu. */
export const LIST_ANSWER_ENABLED = true;

export function isListAnswerable(question: AgentQuestion): boolean {
  return LIST_ANSWER_ENABLED && !question.multiSelect && question.options.length >= 2;
}

export function optionKeys(index: number): string {
  const steps = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  return "\x1b[B".repeat(steps) + "\r";
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/agentEngines.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/shared/agentTypes.ts app-electron/shared/agentEngines.ts app-electron/shared/agentDecisions.ts tests/agentEngines.test.ts
git commit -m "Ajan Alani: ajan turleri, motor tanimlari ve komut kurma

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Kurulu motor tespiti ve axet-code ajan listesi

**Files:**
- Create: `app-electron/main/agentEngineProbe.ts`
- Create: `tests/fixtures/axet-agent-list.json`
- Modify: `app-electron/main/index.ts` (üç IPC işleyicisi; `terminal:getBuffer` işleyicisinin hemen altına)
- Modify: `app-electron/preload/index.ts`, `src/window.d.ts`
- Test: `tests/agentEngineProbe.test.ts`, `tests/agentIpcWiring.test.ts` (yeni; Task 9 ve 15 genişletir)

**Interfaces:**
- Consumes: Task 2 `AGENT_ENGINES`, `AGENT_ENGINE_IDS`, `AgentEngineInfo`, `AxetAgentEntry`; mevcut `axetBinaryStatus(force)`, `axetBinaryMessage(status)`, `axetSpawnEnv(useConnectors)`.
- Produces:

```ts
export interface EngineProbeDeps {
  where(binary: string): Promise<boolean>;
  axetStatus(): Promise<AxetBinaryStatus>;
  axetMessage(status: AxetBinaryStatus): string | null;
}
export function detectEngines(deps: EngineProbeDeps): Promise<AgentEngineInfo[]>;
export function whereOnPath(binary: string): Promise<boolean>;
export const BUILTIN_AXET_AGENTS: AxetAgentEntry[];
export function parseAxetAgentList(raw: string): AxetAgentEntry[];
export function listAxetAgents(cwd: string, run: (args: string[]) => Promise<string | null>): Promise<AxetAgentEntry[]>;
export function runAxetCode(args: string[]): Promise<string | null>;
// IPC (renderer):
//   window.api.agentEngines(force?: boolean): Promise<AgentEngineInfo[]>   — "agents:engines" (60 sn önbellek)
//   window.api.axetAgents(cwd: string): Promise<AxetAgentEntry[]>          — "agents:axetAgents"
//   window.api.agentWhich(binary: string): Promise<boolean>                 — "agents:which"
```

- [ ] **Step 1: Ölçülmüş çıktıyı test verisi yap** — `tests/fixtures/axet-agent-list.json` (axet-code 1.4.1, `axet-code agent list --json`, 2026-10-17):

```json
[
  {
    "name": "agent-builder",
    "scope": "builtin",
    "model": "large",
    "permissions": "ask (default)",
    "description": "Creates and edits custom agents and the project's agent ecosystem."
  },
  {
    "name": "coder",
    "scope": "builtin",
    "model": "large",
    "permissions": "ask (default)",
    "description": "An agent that helps with executing coding tasks."
  },
  {
    "name": "guide",
    "scope": "builtin",
    "model": "large",
    "permissions": "ask (default)",
    "description": "Answers questions about configuring aXet.code itself: config files, options, permissions, skills, agents, connectors and environment variables."
  },
  {
    "name": "security",
    "scope": "builtin",
    "model": "large",
    "permissions": "ask (default)",
    "description": "Reviews the security of the code: agentic attack-surface discovery, vulnerability analysis (CWE/OWASP/CVSS, taint chains), STRIDE/ATT\u0026CK threat modeling and verified remediation fixes."
  },
  {
    "name": "task",
    "scope": "builtin",
    "model": "large",
    "permissions": "ask (default)",
    "description": "An agent that helps with searching for context and finding implementation details."
  }
]
```

- [ ] **Step 2: Kırmızı test** — `tests/agentEngineProbe.test.ts`

```ts
// Kurulu motorlar ve axet-code ajan listesi (spec 2026-10-17 ajan-alani §3, §10, §14.2).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app-electron/main/axetSpawnEnv", () => ({ axetSpawnEnv: () => ({}) }));

const { BUILTIN_AXET_AGENTS, detectEngines, listAxetAgents, parseAxetAgentList } = await import(
  "../app-electron/main/agentEngineProbe"
);

const FIXTURE = readFileSync(path.join(__dirname, "fixtures", "axet-agent-list.json"), "utf8");

function deps(found: string[], axet: { kind: "ok"; version: string } | { kind: "missing" } | { kind: "broken"; detail: string } | { kind: "old"; version: string }) {
  return {
    where: vi.fn(async (binary: string) => found.includes(binary)),
    axetStatus: vi.fn(async () => axet),
    axetMessage: vi.fn((s: { kind: string }) => (s.kind === "ok" ? null : `mesaj:${s.kind}`))
  };
}

describe("detectEngines", () => {
  it("PATH'te bulunan kurulu; bulunmayan kurulu değil ve engelli", async () => {
    const d = deps(["claude"], { kind: "ok", version: "1.4.1" });
    const list = await detectEngines(d);
    expect(list.map((e) => [e.id, e.installed, e.blocked])).toEqual([
      ["axet-code", true, false],
      ["claude", true, false],
      ["codex", false, true],
      ["gemini", false, true],
      ["ozel", true, false]
    ]);
    expect(d.where).toHaveBeenCalledWith("codex");
    expect(d.where).not.toHaveBeenCalledWith("axet-code");
  });

  it("axet-code eski: kurulu, engelsiz, uyarı notu var", async () => {
    const [axet] = await detectEngines(deps([], { kind: "old", version: "1.3.0" }));
    expect(axet).toEqual({ id: "axet-code", installed: true, blocked: false, note: "mesaj:old" });
  });

  it("axet-code bozuk: kurulu ama engelli; yoksa kurulu değil", async () => {
    expect((await detectEngines(deps([], { kind: "broken", detail: "0 bayt" })))[0]).toMatchObject({ installed: true, blocked: true });
    expect((await detectEngines(deps([], { kind: "missing" })))[0]).toMatchObject({ installed: false, blocked: true });
  });

  it("sondaj hata fırlatsa da liste dönüyor", async () => {
    const d = {
      where: vi.fn(async () => {
        throw new Error("where yok");
      }),
      axetStatus: vi.fn(async () => {
        throw new Error("exec patladı");
      }),
      axetMessage: vi.fn(() => null)
    };
    const list = await detectEngines(d);
    expect(list).toHaveLength(5);
    expect(list[0]).toMatchObject({ id: "axet-code", installed: false, blocked: true });
    expect(list[1]).toMatchObject({ id: "claude", installed: false });
  });
});

describe("axet-code ajan listesi", () => {
  it("ölçülmüş JSON ayrıştırılıyor", () => {
    const list = parseAxetAgentList(FIXTURE);
    expect(list.map((a) => a.name)).toEqual(["agent-builder", "coder", "guide", "security", "task"]);
    expect(list[1]).toEqual({
      name: "coder",
      scope: "builtin",
      permissions: "ask (default)",
      description: "An agent that helps with executing coding tasks."
    });
  });

  it("bozuk JSON, dizi olmayan değer, geçersiz ad ve tekrar atılıyor", () => {
    expect(parseAxetAgentList("{")).toEqual([]);
    expect(parseAxetAgentList('{"name":"x"}')).toEqual([]);
    expect(parseAxetAgentList('[{"name":"a b"},{"name":"-x"},{"name":"ok"},{"name":"ok"},null]').map((a) => a.name)).toEqual(["ok"]);
  });

  it("komut -c ile klasörde çalışıyor; okunamazsa yerleşik beş ajan", async () => {
    const run = vi.fn(async () => FIXTURE);
    expect((await listAxetAgents("C:\\proje", run)).length).toBe(5);
    expect(run).toHaveBeenCalledWith(["agent", "list", "--json", "-c", "C:\\proje"]);
    expect(await listAxetAgents("", vi.fn(async () => null))).toEqual(BUILTIN_AXET_AGENTS);
    const failing = vi.fn(async () => {
      throw new Error("x");
    });
    expect(await listAxetAgents("C:\\p", failing)).toEqual(BUILTIN_AXET_AGENTS);
    expect(BUILTIN_AXET_AGENTS.map((a) => a.name)).toEqual(["coder", "task", "guide", "security", "agent-builder"]);
  });

  it("klasör boşsa -c verilmiyor", async () => {
    const run = vi.fn(async () => "[]");
    await listAxetAgents("  ", run);
    expect(run).toHaveBeenCalledWith(["agent", "list", "--json"]);
  });
});
```

`tests/agentIpcWiring.test.ts`:

```ts
// Ajan Alanı IPC bağlantıları — kaynak düzeyinde kilit (bkz. appTerminalWiring.test.ts).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..");
const read = (...parts: string[]) => readFileSync(path.join(ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
const main = read("app-electron", "main", "index.ts");
const preload = read("app-electron", "preload", "index.ts");
const types = read("src", "window.d.ts");

describe("Ajan Alanı — motor sondajı IPC", () => {
  it("üç kanal ana süreçte, preload'da ve tiplerde", () => {
    for (const channel of ["agents:engines", "agents:axetAgents", "agents:which"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["agentEngines:", "axetAgents:", "agentWhich:"]) expect(types, name).toContain(name);
  });
});
```

- [ ] **Step 3: Kırmızıyı gör**

Run: `npx vitest run tests/agentEngineProbe.test.ts tests/agentIpcWiring.test.ts`
Expected: FAIL — modül bulunamıyor; wiring testinde kanal yok.

- [ ] **Step 4: Uygula** — `app-electron/main/agentEngineProbe.ts`:

```ts
// Ajan motorlarının kurulu olup olmadığı ve axet-code'un kendi ajan listesi
// (spec 2026-10-17 ajan-alani §3, §10, §14.2).
//
// Süreç çağrıları enjekte ediliyor: testte gerçek `where` ya da axet-code
// çalışmıyor. Hiçbir yol hata fırlatmıyor; sondaj patlarsa motor "kurulu
// değil" sayılıyor ve ajan listesi yerleşik beşe düşüyor.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { AGENT_ENGINES } from "../shared/agentEngines";
import { AGENT_ENGINE_IDS, type AgentEngineInfo, type AxetAgentEntry } from "../shared/agentTypes";
import { axetSpawnEnv } from "./axetSpawnEnv";
import type { AxetBinaryStatus } from "./axetCodeVersion";

export interface EngineProbeDeps {
  where(binary: string): Promise<boolean>;
  axetStatus(): Promise<AxetBinaryStatus>;
  axetMessage(status: AxetBinaryStatus): string | null;
}

export async function detectEngines(deps: EngineProbeDeps): Promise<AgentEngineInfo[]> {
  const out: AgentEngineInfo[] = [];
  for (const id of AGENT_ENGINE_IDS) {
    // Özel komut ajan başına farklı: başlatırken komutun ilk parçası aranıyor.
    if (id === "ozel") {
      out.push({ id, installed: true, blocked: false });
      continue;
    }
    if (id === "axet-code") {
      let status: AxetBinaryStatus;
      try {
        status = await deps.axetStatus();
      } catch {
        status = { kind: "missing" };
      }
      const note = deps.axetMessage(status);
      out.push({
        id,
        installed: status.kind !== "missing",
        blocked: status.kind === "missing" || status.kind === "broken",
        ...(note ? { note } : {})
      });
      continue;
    }
    let installed = false;
    try {
      installed = await deps.where(AGENT_ENGINES[id].binary ?? id);
    } catch {
      installed = false;
    }
    out.push({ id, installed, blocked: !installed });
  }
  return out;
}

const SAFE_BINARY = /^[\w.-]+$/;

/** Program PATH'te mi (`where`). Yol verilmişse dosyanın varlığı. */
export function whereOnPath(binary: string): Promise<boolean> {
  const name = binary.trim();
  if (!name) return Promise.resolve(false);
  if (/[\\/]/.test(name)) return Promise.resolve(existsSync(name));
  if (!SAFE_BINARY.test(name)) return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      execFile("where", [name], { timeout: 5_000, windowsHide: true }, (error) => resolve(!error));
    } catch {
      resolve(false);
    }
  });
}

/** Liste okunamazsa gösterilen yerleşik ajanlar (spec §14.2). */
export const BUILTIN_AXET_AGENTS: AxetAgentEntry[] = ["coder", "task", "guide", "security", "agent-builder"].map((name) => ({
  name,
  scope: "builtin",
  permissions: "ask (default)",
  description: ""
}));

const AGENT_NAME = /^[A-Za-z0-9][\w.-]*$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function parseAxetAgentList(raw: string): AxetAgentEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  const out: AxetAgentEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = text(record.name, 60);
    if (!AGENT_NAME.test(name) || seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      scope: text(record.scope, 40),
      permissions: text(record.permissions, 60),
      description: text(record.description, 200)
    });
  }
  return out;
}

export async function listAxetAgents(cwd: string, run: (args: string[]) => Promise<string | null>): Promise<AxetAgentEntry[]> {
  const args = cwd.trim() ? ["agent", "list", "--json", "-c", cwd] : ["agent", "list", "--json"];
  let raw: string | null = null;
  try {
    raw = await run(args);
  } catch {
    raw = null;
  }
  const list = raw ? parseAxetAgentList(raw) : [];
  return list.length > 0 ? list : BUILTIN_AXET_AGENTS;
}

/** `axet-code <args>`; bağlayıcılar kapalı (liste okumak MCP gerektirmiyor). */
export function runAxetCode(args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(
        "axet-code.exe",
        args,
        { timeout: 15_000, windowsHide: true, env: axetSpawnEnv(false), maxBuffer: 1024 * 1024 },
        (error, stdout) => resolve(error ? null : String(stdout))
      );
    } catch {
      resolve(null);
    }
  });
}
```

`axetSpawnEnv`'in imzası `axetSpawnEnv(useConnectors: boolean)` değilse (dosyayı aç ve bak), gerçek imzaya göre çağır ve ledger'a yaz.

`app-electron/main/index.ts`:
- İçe aktarımlar (dosyanın başındaki içe aktarma bloğuna):

```ts
import { detectEngines, listAxetAgents, runAxetCode, whereOnPath } from "./agentEngineProbe";
import { axetBinaryMessage, axetBinaryStatus } from "./axetCodeVersion";
import type { AgentEngineInfo } from "../shared/agentTypes";
```

(`./axetCodeVersion`'dan başka bir şey zaten içe aktarılıyorsa adları o satıra ekle; aynı modülden iki satır açma.)

- `registerIpc()` içinde, `ipcMain.handle("terminal:getBuffer", …)` bloğunun hemen altına:

```ts
  // Ajan Alanı (spec 2026-10-17 ajan-alani §3): kurulu motorlar. Sondaj
  // `where` ve `axet-code --version` çağırıyor; 60 sn önbellek, `force` tazeler.
  let engineCache: { at: number; value: AgentEngineInfo[] } | null = null;
  ipcMain.handle("agents:engines", async (_event, force?: unknown) => {
    const fresh = force === true;
    if (!fresh && engineCache && Date.now() - engineCache.at < 60_000) return engineCache.value;
    try {
      const value = await detectEngines({
        where: whereOnPath,
        axetStatus: () => axetBinaryStatus(fresh),
        axetMessage: axetBinaryMessage
      });
      engineCache = { at: Date.now(), value };
      return value;
    } catch {
      return [];
    }
  });

  ipcMain.handle("agents:axetAgents", (_event, cwd: unknown) => listAxetAgents(typeof cwd === "string" ? cwd : "", runAxetCode));

  ipcMain.handle("agents:which", (_event, binary: unknown) => whereOnPath(typeof binary === "string" ? binary : ""));
```

`app-electron/preload/index.ts`:
- `import type { AgentEngineInfo, AxetAgentEntry } from "../shared/agentTypes";` (diğer `import type` satırlarının yanına)
- `api` nesnesinde `getTerminalBuffer` satırının altına:

```ts
  agentEngines: (force?: boolean): Promise<AgentEngineInfo[]> => ipcRenderer.invoke("agents:engines", force === true),
  axetAgents: (cwd: string): Promise<AxetAgentEntry[]> => ipcRenderer.invoke("agents:axetAgents", cwd),
  agentWhich: (binary: string): Promise<boolean> => ipcRenderer.invoke("agents:which", binary),
```

`src/window.d.ts`:
- `import type { AgentEngineInfo, AxetAgentEntry } from "../app-electron/shared/agentTypes";`
- `getTerminalBuffer: (id: string) => Promise<string>;` satırının altına:

```ts
  agentEngines: (force?: boolean) => Promise<AgentEngineInfo[]>;
  axetAgents: (cwd: string) => Promise<AxetAgentEntry[]>;
  agentWhich: (binary: string) => Promise<boolean>;
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/agentEngineProbe.test.ts tests/agentIpcWiring.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/agentEngineProbe.ts tests/fixtures/axet-agent-list.json tests/agentEngineProbe.test.ts tests/agentIpcWiring.test.ts app-electron/main/index.ts app-electron/preload/index.ts src/window.d.ts
git commit -m "Ajan Alani: kurulu motor tespiti ve axet-code ajan listesi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Veri modeli, eski kayıtların göçü ve ajan bölmesinin başlatılması

Bölme türü `axet | cmd | powershell` → `agent | cmd | powershell`. Eski `axet` kaydı okunurken `agent` + `LEGACY_AXET_AGENT` oluyor. Ajan bölmesi seçilen kabukta açılıp motorun komutunu ilk satır olarak yazıyor. Çalışma alanına kök klasör ve SAP bağı ekleniyor. Tür değişikliği derlemeyi geniş bir alanda etkilediği için bu task, derlemeyi ve mevcut testleri yeşil tutan bütün dokunuşları içeriyor.

**Files:**
- Modify: `app-electron/shared/types.ts:306-338` (`TerminalPaneKind`, `SavedTerminalPane`, `SavedTerminalWorkspace`)
- Modify: `app-electron/shared/terminalLayout.ts`
- Modify: `src/stores/terminalTypes.ts`, `src/stores/terminalReducer.ts`, `src/stores/terminalStoreContext.ts`, `src/stores/terminalStore.tsx`
- Create: `src/agents/agentLabels.ts`
- Modify: `src/terminal/NewPaneDialog.tsx`, `src/terminal/TerminalMode.tsx`, `src/terminal/TerminalPaneView.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test (yeni testler + uyarlamalar): `tests/terminalConfig.test.ts`, `tests/terminalReducer.test.ts`, `tests/terminalStore.test.tsx`, `tests/newPaneDialog.test.tsx`, `tests/terminalMode.test.tsx`, `tests/terminalPaneView.test.tsx`, `tests/terminalSidebar.test.tsx`

**Interfaces:**
- Consumes: Task 2 `AgentSpec`, `LEGACY_AXET_AGENT`, `readAgentSpec`, `buildAgentCommand`, `AgentEngineId`.
- Produces:

```ts
// shared/types.ts
export type TerminalPaneKind = "agent" | "cmd" | "powershell";
export interface SavedTerminalPane { id; kind; cwd; title?; color?; fontSize?; agent?: AgentSpec }
export interface SavedWorkspaceSap { uuid: string; label: string }
export interface SavedTerminalWorkspace { id; name; panes; layout?; minimized?; root?: string; sap?: SavedWorkspaceSap }
// shared/terminalLayout.ts
export const SHELL_PANE_KINDS: readonly TerminalMode[];            // ["cmd", "powershell"]
export function readPaneKind(pane: Record<string, unknown>): { kind: TerminalPaneKind; agent?: AgentSpec } | null;
export function readWorkspaceSap(raw: unknown): SavedWorkspaceSap | null;
// src/stores/terminalTypes.ts
TerminalPane.agent?: AgentSpec;  TerminalWorkspace.root?: string;  TerminalWorkspace.sap?: SavedWorkspaceSap;
TerminalAction "addPane" += { agent?: AgentSpec; title?: string; color?: TerminalPaneColor };
TerminalAction += { type: "setWorkspaceRoot"; id: string; root: string | null; sap: SavedWorkspaceSap | null };
// src/stores/terminalStoreContext.ts
export interface NewAgentInput { spec: AgentSpec; name: string; color?: TerminalPaneColor; cwd: string }
TerminalCommands.addPane: (kind: TerminalMode, cwd: string, split?) => void;
TerminalCommands.addAgent: (input: NewAgentInput, split?: { targetPaneId: string; dir: SplitDir }) => void;
TerminalCommands.revealPane: (paneId: string) => void;   // alanı seçer; şeritteyse geri getirir, değilse odaklar
TerminalCommands.setWorkspaceRoot: (id: string, root: string | null, sap: SavedWorkspaceSap | null) => void;
TerminalStoreValue.defaultKind: TerminalMode;  TerminalStoreValue.agentCwd: string;
// src/agents/agentLabels.ts
export const ENGINE_LABEL: Record<AgentEngineId, TranslationKey>;
export const KIND_LABEL: Record<TerminalPaneKind, TranslationKey>;
export function paneLabel(pane: Pick<TerminalPane, "kind" | "agent">, t: TranslateFn): string;
export function agentName(pane: Pick<TerminalPane, "kind" | "agent" | "title">, t: TranslateFn): string;
```

- [ ] **Step 1: Kırmızı testler**

`tests/terminalConfig.test.ts`:
- "geçerli düzen aynen kalıyor" testinde `kind: "axet"` → `kind: "powershell"` (eski tür artık aynen kalmıyor, göç ediyor; aşağıdaki yeni test onu kapsıyor).
- Dosyanın sonuna:

```ts
describe("ajan bölmeleri ve eski axet göçü (spec 2026-10-17 ajan-alani §3)", () => {
  it("eski axet bölmesi motoru axet-code olan ajana dönüşüyor; ad ve renk kalıyor", () => {
    const raw = [{ id: "w1", name: "D01", panes: [{ id: "p1", kind: "axet", cwd: "C:\\a", title: "Eski", color: "green" }] }];
    expect(normalizeTerminalWorkspaces(raw, nameFor)[0].panes).toEqual([
      { id: "p1", kind: "agent", cwd: "C:\\a", title: "Eski", color: "green", agent: { engine: "axet-code", role: "", roleKind: "custom" } }
    ]);
  });

  it("geçerli ajan bölmesi okunuyor; bozuk ajan alanı yalnız o bölmeyi atlatıyor", () => {
    const raw = [
      {
        id: "w1",
        name: "A",
        panes: [
          { id: "p1", kind: "agent", cwd: "C:\\a", agent: { engine: "claude", role: "Test", roleKind: "preset" } },
          { id: "p2", kind: "agent", cwd: "C:\\a", agent: { engine: "bash" } },
          { id: "p3", kind: "agent", cwd: "C:\\a" },
          { id: "p4", kind: "cmd", cwd: "C:\\a" }
        ]
      }
    ];
    const panes = normalizeTerminalWorkspaces(raw, nameFor)[0].panes;
    expect(panes.map((p) => p.id)).toEqual(["p1", "p4"]);
    expect(panes[0].agent).toEqual({ engine: "claude", role: "Test", roleKind: "preset" });
  });

  it("alan kökü ve SAP bağı okunuyor; bozuksa atlanıyor", () => {
    const raw = [
      { id: "w1", name: "A", panes: [], root: "  C:\\kok ", sap: { uuid: "u1", label: " D01 " } },
      { id: "w2", name: "B", panes: [], root: 5, sap: { uuid: "", label: "x" } }
    ];
    const [a, b] = normalizeTerminalWorkspaces(raw, nameFor);
    expect(a).toMatchObject({ root: "C:\\kok", sap: { uuid: "u1", label: "D01" } });
    expect(b.root).toBeUndefined();
    expect(b.sap).toBeUndefined();
  });
});
```

`tests/terminalReducer.test.ts`:
- İçe aktarımlara: `import { LEGACY_AXET_AGENT, type AgentSpec } from "../app-electron/shared/agentTypes";`
- "kayıtlı düzen varsa önce şerit…" testinde `{ id: "p1", kind: "axet" as const, cwd: "C:\\a" }` → `{ id: "p1", kind: "agent" as const, agent: LEGACY_AXET_AGENT, cwd: "C:\\a" }`.
- "seçili alana axet bölmesi ekliyor" testinin beklentisi → `expect(pane).toMatchObject({ id: "x", kind: "agent", agent: LEGACY_AXET_AGENT, cwd: "C:\\proje" });` ve test adı "seçili alana axet-code ajanı ekliyor".
- Dosyanın sonuna:

```ts
describe("ajan bölmeleri (spec 2026-10-17 ajan-alani §3)", () => {
  const claude: AgentSpec = { engine: "claude", role: "Test", roleKind: "preset", model: "sonnet" };
  const addAgent = (paneId: string, agent?: AgentSpec): TerminalAction => ({
    type: "addPane",
    workspaceId: "w1",
    paneId,
    kind: "agent",
    cwd: "C:\\p",
    agent,
    title: "  Ayşe ",
    color: "blue"
  });

  it("ajan bölmesi tanımı, adı ve rengiyle ekleniyor; tanımsız ajan eklenmiyor", () => {
    const s = terminalReducer(ready(), addAgent("a1", claude));
    expect(s.workspaces[0].panes[0]).toMatchObject({ id: "a1", kind: "agent", agent: claude, title: "Ayşe", color: "blue" });
    const same = ready();
    expect(terminalReducer(same, addAgent("a2"))).toBe(same);
  });

  it("kayıt gidiş-dönüş: ajan, kök ve SAP bağı korunuyor", () => {
    const s = run([addAgent("a1", claude), { type: "setWorkspaceRoot", id: "w1", root: "C:\\kok", sap: { uuid: "u1", label: "D01" } }], ready());
    const saved = toSaved(s);
    expect(saved.workspaces[0]).toMatchObject({ root: "C:\\kok", sap: { uuid: "u1", label: "D01" } });
    expect(saved.workspaces[0].panes[0]).toMatchObject({ kind: "agent", agent: claude, title: "Ayşe" });
    const back = run([
      { type: "open", saved: saved.workspaces, activeId: "w1", freshId: "x", nameFor },
      { type: "restore", nameFor }
    ]);
    expect(back.workspaces[0]).toMatchObject({ root: "C:\\kok", sap: { uuid: "u1", label: "D01" } });
    expect(back.workspaces[0].panes[0]).toMatchObject({ kind: "agent", agent: claude, run: { state: "queued" } });
  });

  it("ajan alanı olmayan agent kaydı axet-code ajanı olarak açılıyor", () => {
    const back = run([
      { type: "open", saved: [{ id: "w", name: "W", panes: [{ id: "p", kind: "agent", cwd: "C:\\a" }] }], activeId: "w", freshId: "x", nameFor },
      { type: "restore", nameFor }
    ]);
    expect(back.workspaces[0].panes[0].agent).toEqual(LEGACY_AXET_AGENT);
  });

  it("setWorkspaceRoot: boş kök kaldırılıyor, aynı değer aynı durum", () => {
    const s = terminalReducer(ready(), { type: "setWorkspaceRoot", id: "w1", root: "C:\\k", sap: null });
    expect(s.workspaces[0].root).toBe("C:\\k");
    expect(terminalReducer(s, { type: "setWorkspaceRoot", id: "w1", root: "C:\\k", sap: null })).toBe(s);
    const cleared = terminalReducer(s, { type: "setWorkspaceRoot", id: "w1", root: "  ", sap: null });
    expect(cleared.workspaces[0].root).toBeUndefined();
  });
});
```

`tests/terminalStore.test.tsx`:
- İçe aktarımlara: `import { LEGACY_AXET_AGENT } from "../app-electron/shared/agentTypes";`
- Bütün `store.commands.addPane("axet", <X>)` çağrılarını `store.commands.addAgent({ spec: LEGACY_AXET_AGENT, name: "", cwd: <X> })` yap (satır ~161, 203–205, 227–230, 379; `grep -n 'addPane("axet"' tests/terminalStore.test.tsx` ile hepsini bul).
- "sayaç artınca AXET bölmesi…" testinin beklentisi → `expect(panes()[0]).toMatchObject({ kind: "agent", agent: LEGACY_AXET_AGENT, cwd: "C:\\axet" });`
- Dosyanın sonuna:

```ts
describe("ajan bölmeleri (spec 2026-10-17 ajan-alani §5)", () => {
  it("Claude Code ajanı modeliyle, izin atlatma bayrağı olmadan başlıyor; ad başlık oluyor", async () => {
    await ready();
    act(() =>
      store.commands.addAgent({
        spec: { engine: "claude", role: "", roleKind: "custom", model: "sonnet" },
        name: "Ayşe",
        color: "blue",
        cwd: "C:\\p"
      })
    );
    await flush();
    expect(api.createTerminal).toHaveBeenCalledWith("C:\\p", 120, 30, "cmd", "claude --model sonnet", { createDir: false });
    expect(panes()[0]).toMatchObject({ kind: "agent", title: "Ayşe", color: "blue" });
  });

  it("axet-code ajanı ayarlardaki komutla ve --agent ile başlıyor", async () => {
    await ready({ config: { ...baseConfig, axetCommand: "axet-code -y -d" } as AppConfig });
    act(() => store.commands.addAgent({ spec: { engine: "axet-code", role: "coder", roleKind: "axetAgent" }, name: "", cwd: "C:\\p" }));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledWith("C:\\p", 120, 30, "cmd", "axet-code -y -d --agent coder", { createDir: false });
  });

  it("revealPane: alanı seçiyor, şeritteki bölmeyi geri getirip odaklıyor", async () => {
    await ready();
    act(() => store.commands.addPane("cmd", "C:\\a"));
    const first = panes()[0].id;
    const firstWs = store.state.activeWorkspaceId;
    act(() => store.commands.minimizePane(first));
    act(() => store.commands.addWorkspace());
    expect(store.state.activeWorkspaceId).not.toBe(firstWs);
    act(() => store.commands.revealPane(first));
    expect(store.state.activeWorkspaceId).toBe(firstWs);
    const ws = store.state.workspaces.find((w) => w.id === firstWs)!;
    expect(minimizedOf(ws)).toEqual([]);
    expect(ws.focusedPaneId).toBe(first);
  });

  it("alan kökü kaydediliyor ve yeni ajanın varsayılan klasörü oluyor", async () => {
    await ready();
    expect(store.agentCwd).toBe("C:\\axet");
    const id = store.state.activeWorkspaceId!;
    act(() => store.commands.setWorkspaceRoot(id, "C:\\kok", { uuid: "u1", label: "D01" }));
    await flush();
    expect(store.agentCwd).toBe("C:\\kok");
    expect(api.saveConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({
        terminalWorkspaces: [expect.objectContaining({ root: "C:\\kok", sap: { uuid: "u1", label: "D01" } })]
      })
    );
  });
});
```

`tests/newPaneDialog.test.tsx`:
- `import type { TerminalPaneKind } from "../app-electron/shared/types";` → `import type { TerminalMode as ShellKind } from "../app-electron/shared/types";` ve `renderDialog(defaultKind: TerminalPaneKind = "cmd", …)` → `renderDialog(defaultKind: ShellKind = "cmd", …)`.
- "tür değişiyor, klasör Değiştir ile seçiliyor" testinde `renderDialog()` → `renderDialog("powershell")`, `{ name: "axet-code" }` → `{ name: "cmd" }`, beklenti → `expect(onOpen).toHaveBeenCalledWith("cmd", "C:\\b");`
- Yeni test (describe içine):

```ts
  it("pencere yalnız kabuk türlerini sunuyor; ajan '+ Ajan'dan ekleniyor", () => {
    renderDialog();
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["cmd", "PowerShell"]);
  });
```

`tests/terminalMode.test.tsx`, `tests/terminalPaneView.test.tsx`, `tests/terminalSidebar.test.tsx`:
- Her `commandsMock()` dönüşüne üç satır ekle: `addAgent: vi.fn(),`, `revealPane: vi.fn(),`, `setWorkspaceRoot: vi.fn()` (son satırdan önce virgül).
- `TerminalStoreValue` kurulan her yerde (`terminalMode` `make`, `terminalPaneView` `renderPane`'deki `value={{…}}`, `terminalSidebar` `value`) `agentCwd: "C:\\axet"` ekle.
- `terminalMode.test.tsx` "geri yükleme şeridi" testinde `{ id: "z", kind: "axet", cwd: "C:\\a" }` → `{ id: "z", kind: "powershell", cwd: "C:\\a" }`.
- `terminalMode.test.tsx` "boş alan: Değiştir klasörü değiştiriyor" testinde `{ name: "axet-code" }` → `{ name: "cmd" }`, beklenti → `expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\b");`
- `terminalPaneView.test.tsx`: içe aktarımlara `import { LEGACY_AXET_AGENT, type AgentSpec } from "../app-electron/shared/agentTypes";`; `renderPane`'in `opts` tipine `agent?: AgentSpec;`; `pane` nesnesine `agent: opts.agent`; `{ kind: "axet" }` geçen üç çağrı → `{ kind: "agent", agent: LEGACY_AXET_AGENT }`; `"Çalışan axet-code oturumu sonlanacak."` → `"Çalışan ajanın oturumu sonlanacak."`; test adları "axet" → "ajan".

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/terminalConfig.test.ts tests/terminalReducer.test.ts tests/terminalStore.test.tsx tests/newPaneDialog.test.tsx tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx tests/terminalSidebar.test.tsx`
Expected: FAIL — `addAgent is not a function`, `kind: "axet"` beklentileri, `root` tanımsız vb.

- [ ] **Step 3: Ortak türler** — `app-electron/shared/types.ts`

Dosyanın başındaki içe aktarmaların yanına: `import type { AgentSpec } from "./agentTypes";`

`TerminalPaneKind` ve kayıt arayüzlerini şöyle değiştir:

```ts
// Terminal modundaki bir bölmenin türü. `agent`: bir motoru (axet-code,
// Claude Code…) seçilen kabukta başlangıç komutu olarak çalıştıran ajan
// bölmesi (spec 2026-10-17 ajan-alani §3). Eski `axet` türü okunurken
// `agent`'a çevriliyor (bkz. terminalLayout.ts `readPaneKind`).
export type TerminalPaneKind = "agent" | "cmd" | "powershell";
```

```ts
export interface SavedTerminalPane {
  id: string;
  kind: TerminalPaneKind;
  cwd: string;
  title?: string;
  color?: TerminalPaneColor;
  fontSize?: number;
  /** Yalnız `agent` türünde: hangi motor, hangi rol. */
  agent?: AgentSpec;
}
```

```ts
/** Çalışma alanının bağlı olduğu SAP sistemi (yalnız kök ve günlük için). */
export interface SavedWorkspaceSap {
  uuid: string;
  label: string;
}

export interface SavedTerminalWorkspace {
  id: string;
  name: string;
  panes: SavedTerminalPane[];
  layout?: LayoutNode | null;
  minimized?: SavedMinimizedPane[];
  /** Yeni ajanların varsayılan klasörü (spec §3). */
  root?: string;
  sap?: SavedWorkspaceSap;
}
```

- [ ] **Step 4: Kayıt okuma** — `app-electron/shared/terminalLayout.ts`

İçe aktarımları şöyle yap:

```ts
import type {
  SavedMinimizedPane,
  SavedTerminalPane,
  SavedTerminalWorkspace,
  SavedWorkspaceSap,
  TerminalMode,
  TerminalPaneColor,
  TerminalPaneKind
} from "./types";
import { LEGACY_AXET_AGENT, readAgentSpec, type AgentSpec } from "./agentTypes";
import { normalizeLayout, type EdgeSide, type PaneHome } from "./terminalTree";
```

`TERMINAL_PANE_KINDS` satırını ve altına yenilerini:

```ts
export const TERMINAL_PANE_KINDS: readonly TerminalPaneKind[] = ["agent", "cmd", "powershell"];

/** "+ Terminal" penceresinin türleri: düz kabuklar. Ajan "+ Ajan"dan ekleniyor. */
export const SHELL_PANE_KINDS: readonly TerminalMode[] = ["cmd", "powershell"];

/**
 * Kayıttaki bölme türü. Eski `axet` bölmesi motoru axet-code olan rolsüz bir
 * ajana dönüşüyor (spec 2026-10-17 ajan-alani §3). `agent` türünde ajan alanı
 * bozuksa bölme atlanıyor; alanın geri kalanı yerinde kalıyor.
 */
export function readPaneKind(pane: Record<string, unknown>): { kind: TerminalPaneKind; agent?: AgentSpec } | null {
  if (pane.kind === "axet") return { kind: "agent", agent: { ...LEGACY_AXET_AGENT } };
  if (pane.kind === "agent") {
    const agent = readAgentSpec(pane.agent);
    return agent ? { kind: "agent", agent } : null;
  }
  if (pane.kind === "cmd" || pane.kind === "powershell") return { kind: pane.kind };
  return null;
}

export function readWorkspaceSap(raw: unknown): SavedWorkspaceSap | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isId(record.uuid) || typeof record.label !== "string") return null;
  const label = record.label.trim().slice(0, 40);
  return label ? { uuid: record.uuid, label } : null;
}
```

`isId` bu dosyada `readPaneKind`'dan aşağıda tanımlıysa, `readWorkspaceSap`'ı `isId`'nin altına taşı (fonksiyon bildirimi yukarı taşındığı için çalışır, ama okuması kolay olsun).

`normalizeTerminalWorkspaces` içinde bölme döngüsündeki iki satırı:

```ts
        if (!isTerminalPaneKind(pane.kind)) continue;
        if (typeof pane.cwd !== "string" || !pane.cwd.trim()) continue;
        paneIds.add(pane.id);
        panes.push({ id: pane.id, kind: pane.kind, cwd: pane.cwd, ...readPaneExtras(pane) });
```

şununla değiştir:

```ts
        const kind = readPaneKind(pane);
        if (!kind) continue;
        if (typeof pane.cwd !== "string" || !pane.cwd.trim()) continue;
        paneIds.add(pane.id);
        panes.push({
          id: pane.id,
          kind: kind.kind,
          cwd: pane.cwd,
          ...readPaneExtras(pane),
          ...(kind.agent ? { agent: kind.agent } : {})
        });
```

ve `const workspace: SavedTerminalWorkspace = { … };` bloğunun hemen altına:

```ts
    const root = typeof record.root === "string" ? record.root.trim() : "";
    if (root) workspace.root = root;
    const sap = readWorkspaceSap(record.sap);
    if (sap) workspace.sap = sap;
```

- [ ] **Step 5: İndirgeyici** — `src/stores/terminalTypes.ts` ve `src/stores/terminalReducer.ts`

`terminalTypes.ts`:
- İçe aktarım: `import type { SavedTerminalWorkspace, SavedWorkspaceSap, TerminalPaneColor, TerminalPaneKind } from "../../app-electron/shared/types";` ve `import type { AgentSpec } from "../../app-electron/shared/agentTypes";`
- `TerminalPane`'e `fontSize?: number;` altına: `/** Yalnız ajan bölmesinde (spec 2026-10-17 ajan-alani §3). */ agent?: AgentSpec;`
- `TerminalWorkspace`'e `minimized?: MinimizedPane[];` altına: `root?: string;` ve `sap?: SavedWorkspaceSap;`
- `addPane` eyleminde `split?: …;` altına: `agent?: AgentSpec; title?: string; color?: TerminalPaneColor;`
- Eylem birliğinin sonuna: `| { type: "setWorkspaceRoot"; id: string; root: string | null; sap: SavedWorkspaceSap | null };`

`terminalReducer.ts`:
- İçe aktarım: `import { LEGACY_AXET_AGENT } from "../../app-electron/shared/agentTypes";`
- `placeProjectPane`'deki bölme:

```ts
  const pane: TerminalPane = { id: item.paneId, kind: "agent", agent: { ...LEGACY_AXET_AGENT }, cwd: item.cwd, run: { state: "queued" } };
```

- `fromSaved` dönüşü:

```ts
  return {
    ...emptyWorkspace(saved.id, saved.name),
    ...(saved.root ? { root: saved.root } : {}),
    ...(saved.sap ? { sap: saved.sap } : {}),
    panes: saved.panes.map((p) => ({
      id: p.id,
      kind: p.kind,
      cwd: p.cwd,
      title: p.title,
      color: p.color,
      fontSize: p.fontSize,
      // Ajan alanı eksik `agent` kaydı (elle düzenlenmiş): rolsüz axet-code.
      ...(p.kind === "agent" ? { agent: p.agent ?? { ...LEGACY_AXET_AGENT } } : {}),
      run: { state: "queued" as const }
    })),
    layout,
    minimized,
    focusedPaneId: leafIds(layout)[0] ?? null
  };
```

- `case "addPane"`:

```ts
    case "addPane": {
      const workspace = state.workspaces.find((w) => w.id === action.workspaceId);
      if (state.phase !== "ready" || !workspace || workspace.panes.length >= MAX_TERMINAL_PANES || !action.cwd.trim()) {
        return state;
      }
      // Ajan bölmesi tanımsız eklenmiyor: hangi motorun başlayacağı belli değil.
      if (action.kind === "agent" && !action.agent) return state;
      const title = cleanPaneTitle(action.title);
      const pane: TerminalPane = {
        id: action.paneId,
        kind: action.kind,
        cwd: action.cwd,
        run: { state: "queued" },
        ...(action.kind === "agent" && action.agent ? { agent: action.agent } : {}),
        ...(title ? { title } : {}),
        ...(action.color && isTerminalPaneColor(action.color) ? { color: action.color } : {})
      };
      return replaceWorkspace(state, withPane(workspace, pane, action.split));
    }
```

- `case "setPaneFontSize"` bloğunun altına:

```ts
    case "setWorkspaceRoot": {
      const workspace = state.workspaces.find((w) => w.id === action.id);
      if (!workspace) return state;
      const root = action.root?.trim() || undefined;
      const sap = action.sap ?? undefined;
      if (workspace.root === root && workspace.sap?.uuid === sap?.uuid && workspace.sap?.label === sap?.label) return state;
      const { root: _oldRoot, sap: _oldSap, ...rest } = workspace;
      return replaceWorkspace(state, { ...rest, ...(root ? { root } : {}), ...(sap ? { sap } : {}) });
    }
```

(`noUnusedLocals` alt çizgili yok sayılan değişkenlere izin vermiyorsa `_oldRoot`/`_oldSap` yerine `const next = { ...workspace }; delete next.root; delete next.sap;` kullan.)

- `toSaved`:

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
        ...(p.fontSize !== undefined ? { fontSize: p.fontSize } : {}),
        ...(p.agent ? { agent: p.agent } : {})
      })),
      layout: layoutOf(w),
      minimized: minimizedOf(w).map((m) => ({ paneId: m.paneId, home: m.home })),
      ...(w.root ? { root: w.root } : {}),
      ...(w.sap ? { sap: w.sap } : {})
    })),
    activeId: state.activeWorkspaceId
  };
}
```

- [ ] **Step 6: Etiketler** — `src/agents/agentLabels.ts`

```ts
// Ajan ve bölme etiketleri (spec 2026-10-17 ajan-alani §4). Ürün adları
// çevrilmiyor ama sözlükte duruyor: "Özel komut" çevriliyor ve hepsi tek yerden.
import type { AgentEngineId } from "../../app-electron/shared/agentTypes";
import type { TerminalPaneKind } from "../../app-electron/shared/types";
import type { TranslateFn } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane } from "../stores/terminalTypes";

export const ENGINE_LABEL: Record<AgentEngineId, TranslationKey> = {
  "axet-code": "agents.engineAxet",
  claude: "agents.engineClaude",
  codex: "agents.engineCodex",
  gemini: "agents.engineGemini",
  ozel: "agents.engineCustom"
};

export const KIND_LABEL: Record<TerminalPaneKind, TranslationKey> = {
  agent: "terminal.kindAgent",
  cmd: "terminal.kindCmd",
  powershell: "terminal.kindPowershell"
};

/** Adı olmayan bölmenin etiketi: ajanda motorun adı, kabukta türü. */
export function paneLabel(pane: Pick<TerminalPane, "kind" | "agent">, t: TranslateFn): string {
  if (pane.kind === "agent") return t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"]);
  return t(KIND_LABEL[pane.kind]);
}

/** Ajanın görünen adı: bölmenin adı, yoksa motorun adı. */
export function agentName(pane: Pick<TerminalPane, "kind" | "agent" | "title">, t: TranslateFn): string {
  return pane.title ?? paneLabel(pane, t);
}
```

- [ ] **Step 7: Bileşenler**

`src/terminal/NewPaneDialog.tsx`:
- `KIND_LABEL` tanımını SİL; içe aktar: `import { KIND_LABEL } from "../agents/agentLabels";`
- `import type { TerminalPaneKind } …` → `import type { TerminalMode as ShellKind } from "../../app-electron/shared/types";`
- `import { TERMINAL_PANE_KINDS } …` → `import { SHELL_PANE_KINDS } from "../../app-electron/shared/terminalLayout";`
- Prop ve durum tiplerindeki `TerminalPaneKind` → `ShellKind`; `TERMINAL_PANE_KINDS.map` → `SHELL_PANE_KINDS.map`.
- Dosya başındaki yorum: `// "+ Terminal" penceresi: düz kabuk türü + klasör. Ajan "+ Ajan"dan (AddAgentDialog) ekleniyor.`

`src/terminal/TerminalMode.tsx`:
- `import type { TerminalPaneKind } …` → `import type { TerminalMode as ShellKind } from "../../app-electron/shared/types";`
- `import { MAX_TERMINAL_PANES, TERMINAL_PANE_KINDS } …` → `import { MAX_TERMINAL_PANES, SHELL_PANE_KINDS } …`
- `import NewPaneDialog, { KIND_LABEL } from "./NewPaneDialog";` → `import NewPaneDialog from "./NewPaneDialog";` ve `import { KIND_LABEL, paneLabel } from "../agents/agentLabels";`
- `EmptyWorkspace`'te `onPick: (kind: TerminalPaneKind, …)` → `ShellKind`; `TERMINAL_PANE_KINDS.map` → `SHELL_PANE_KINDS.map`.
- `MinimizedStrip`'te `{pane.title ?? t(KIND_LABEL[pane.kind])}` → `{pane.title ?? paneLabel(pane, t)}`.

`src/terminal/TerminalPaneView.tsx`:
- `import { KIND_LABEL } from "./NewPaneDialog";` → `import { paneLabel } from "../agents/agentLabels";`
- `const kindLabel = t(KIND_LABEL[pane.kind]);` → `const kindLabel = paneLabel(pane, t);`
- `requestClose` içinde `pane.kind === "axet"` → `pane.kind === "agent"`; yorum: `// Çalışan ajanı kapatmak oturumunu bitiriyor; tek tıkla kaybolmasın.`

- [ ] **Step 8: Depo** — `src/stores/terminalStoreContext.ts` ve `src/stores/terminalStore.tsx`

`terminalStoreContext.ts`:

```ts
import { createContext, useContext } from "react";
import type { AgentSpec } from "../../app-electron/shared/agentTypes";
import type { SavedWorkspaceSap, TerminalMode, TerminalPaneColor } from "../../app-electron/shared/types";
import type { DropZone, LayoutPath, SplitDir } from "../../app-electron/shared/terminalTree";
import type { TerminalState } from "./terminalTypes";

/** "+ Ajan" penceresinin çıktısı (spec 2026-10-17 ajan-alani §4). */
export interface NewAgentInput {
  spec: AgentSpec;
  /** Bölme adı olur; boşsa kartta motorun adı. */
  name: string;
  color?: TerminalPaneColor;
  cwd: string;
}
```

`TerminalCommands` içinde `addPane` satırını değiştir ve yenilerini ekle:

```ts
  /** Seçili alana düz kabuk ekler. `split` verilirse o bölmeyi o yönde böler; yoksa odaktakinin sağı. */
  addPane: (kind: TerminalMode, cwd: string, split?: { targetPaneId: string; dir: SplitDir }) => void;
  /** Seçili alana ajan bölmesi ekler (spec §4). */
  addAgent: (input: NewAgentInput, split?: { targetPaneId: string; dir: SplitDir }) => void;
  /** Bölmenin alanını seçer; şeritteyse geri getirir, değilse odaklar (kart, Kararlar, bildirim). */
  revealPane: (paneId: string) => void;
  /** Alanın kökü ve SAP bağı; `null` kaldırır (spec §3). */
  setWorkspaceRoot: (id: string, root: string | null, sap: SavedWorkspaceSap | null) => void;
```

`TerminalStoreValue`: `defaultKind: TerminalPaneKind;` → `defaultKind: TerminalMode;` ve altına:

```ts
  /** Yeni ajanın klasörü: seçili alanın kökü, yoksa axet çalışma klasörü. */
  agentCwd: string;
```

(Kullanılmayan `TerminalPaneKind` içe aktarımını kaldır.)

`terminalStore.tsx`:
- İçe aktarımlar: `import type { AppConfig, TerminalMode } from "../../app-electron/shared/types";` (TerminalPaneKind yerine), `import { buildAgentCommand } from "../../app-electron/shared/agentEngines";`, `import { LEGACY_AXET_AGENT } from "../../app-electron/shared/agentTypes";`, reducer içe aktarımına `minimizedOf`.
- `const [lastKind, setLastKind] = useState<TerminalPaneKind | null>(null);` → `useState<TerminalMode | null>(null)`.
- `signature` içindeki bölme nesnesine `agent: p.agent ?? null` ve alan nesnesine `root: w.root ?? null, sap: w.sap ?? null` ekle (alan sırası sabit kalsın: `minimized`'dan sonra).
- Başlatma döngüsünde

```ts
      const isAxet = pane.kind === "axet";
      const shell = pane.kind === "axet" ? config.terminal : pane.kind;
      const command = pane.kind === "axet" ? config.axetCommand || "axet-code -y" : undefined;
```

yerine:

```ts
      // Ajan bölmesi seçilen kabukta açılıyor, motorun komutu ilk satır
      // (spec 2026-10-17 ajan-alani §5): motor kapansa da bölme kabukta kalır.
      const isAgent = pane.kind === "agent";
      const shell: TerminalMode = pane.kind === "agent" ? config.terminal : pane.kind;
      const command = pane.kind === "agent" ? buildAgentCommand(pane.agent ?? LEGACY_AXET_AGENT, config.axetCommand || "") : undefined;
```

ve döngünün geri kalanındaki `isAxet` kullanımlarını (`if (isAxet && readyEarly) return;`, `if (isAxet) { … bootingAxetPtyIds … }`) `isAgent` yap. Yuva yorumlarındaki "axet" → "ajan" (spec sapması 6: yuva bütün motorlar için).
- `commands` içinde `addPane`'in altına:

```ts
      addAgent: (input, split) => {
        const workspaceId = stateRef.current.activeWorkspaceId;
        if (!workspaceId) return;
        dispatch({
          type: "addPane",
          workspaceId,
          paneId: crypto.randomUUID(),
          kind: "agent",
          cwd: input.cwd,
          split,
          agent: input.spec,
          title: input.name,
          color: input.color
        });
      },
      revealPane: (paneId) => {
        const found = findPane(stateRef.current, paneId);
        if (!found) return;
        dispatch({ type: "selectWorkspace", id: found.workspace.id });
        if (minimizedOf(found.workspace).some((m) => m.paneId === paneId)) dispatch({ type: "restorePane", paneId });
        else dispatch({ type: "focusPane", paneId });
      },
      setWorkspaceRoot: (id, root, sap) => dispatch({ type: "setWorkspaceRoot", id, root, sap }),
```

- Sonda:

```ts
  const activePanes = panesOf(state, state.activeWorkspaceId ?? "");
  const defaultKind: TerminalMode = lastKind ?? config?.terminal ?? "cmd";
  const defaultCwd = activePanes[activePanes.length - 1]?.cwd ?? config?.projectsBaseDir ?? "";
  const activeRoot = state.workspaces.find((w) => w.id === state.activeWorkspaceId)?.root;
  const agentCwd = activeRoot || config?.axetWorkspaceDir || defaultCwd;
  const value = useMemo(
    () => ({ state, commands, defaultKind, defaultCwd, agentCwd }),
    [state, commands, defaultKind, defaultCwd, agentCwd]
  );
```

- [ ] **Step 9: Metinler** — `src/i18n/tr.ts` ve `src/i18n/en.ts`

`tr.ts`: `"terminal.kindAxet": "axet-code",` satırını sil; yerine `"terminal.kindAgent": "Ajan",`. `"terminal.closePaneTitle": "Ajan kapatılsın mı?",` ve `"terminal.closePaneBody": "Çalışan ajanın oturumu sonlanacak.",`. Nesnenin sonuna (`};`'den önce; önceki son satırın sonuna virgül):

```ts
  // --- Ajan Alanı (spec 2026-10-17 ajan-alani) ---
  "agents.engineAxet": "axet-code",
  "agents.engineClaude": "Claude Code",
  "agents.engineCodex": "Codex",
  "agents.engineGemini": "Gemini CLI",
  "agents.engineCustom": "Özel komut"
```

`en.ts`: `"terminal.kindAxet"` silinir, `"terminal.kindAgent": "Agent",`; `"terminal.closePaneTitle": "Close the agent?",`, `"terminal.closePaneBody": "The running agent's session will end.",`; sona:

```ts
  // --- Agent Space ---
  "agents.engineAxet": "axet-code",
  "agents.engineClaude": "Claude Code",
  "agents.engineCodex": "Codex",
  "agents.engineGemini": "Gemini CLI",
  "agents.engineCustom": "Custom command"
```

- [ ] **Step 10: Yeşili gör**

Run: `npm run typecheck` ve `npx vitest run tests/terminalConfig.test.ts tests/terminalReducer.test.ts tests/terminalReducerTree.test.ts tests/terminalStore.test.tsx tests/newPaneDialog.test.tsx tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx tests/terminalSidebar.test.tsx tests/appTerminalWiring.test.ts tests/i18n.test.ts`
Expected: typecheck temiz; hepsi PASS. Typecheck başka bir dosyada `"axet"` bölme türü yakalarsa (`grep -rn '"axet"' src app-electron --include=*.ts --include=*.tsx`), aynı kuralla `agent` + `LEGACY_AXET_AGENT`'a çevir ve ledger'a yaz.

- [ ] **Step 11: Commit**

```bash
git add app-electron/shared/types.ts app-electron/shared/terminalLayout.ts src/stores/terminalTypes.ts src/stores/terminalReducer.ts src/stores/terminalStoreContext.ts src/stores/terminalStore.tsx src/agents/agentLabels.ts src/terminal/NewPaneDialog.tsx src/terminal/TerminalMode.tsx src/terminal/TerminalPaneView.tsx src/i18n/tr.ts src/i18n/en.ts tests/terminalConfig.test.ts tests/terminalReducer.test.ts tests/terminalStore.test.tsx tests/newPaneDialog.test.tsx tests/terminalMode.test.tsx tests/terminalPaneView.test.tsx tests/terminalSidebar.test.tsx
git commit -m "Ajan Alani: agent bolme turu, eski axet bolmelerinin gocu, alan koku

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Yazılan satırın yakalanması ve terminal dinleyicisi (ana süreç)

**Files:**
- Create: `app-electron/main/agentInput.ts`
- Modify: `app-electron/main/terminalManager.ts`
- Test: `tests/agentInput.test.ts`, `tests/terminalTap.test.ts`

**Interfaces:**
- Consumes: yok.
- Produces:

```ts
// agentInput.ts — yalnız bellekte
export class InputLineBuffer {
  feed(data: string): string[];   // Enter ile tamamlanan, boş olmayan, kırpılmış satırlar
  hasDraft(): boolean;            // Enter'a basılmamış yazı var mı
}
// terminalManager.ts
export interface TerminalTap { onOutput(id: string, data: string): void; onExit(id: string): void }
export function setTerminalTap(next: TerminalTap | null): void;
export function writeTerminal(id: string, data: string): boolean;   // eskiden void
```

- [ ] **Step 1: Kırmızı testler**

`tests/agentInput.test.ts`:

```ts
// Bölmeye yazılan tuşlardan gönderilen satırı çıkarma (spec 2026-10-17 ajan-alani §6.1).
import { describe, expect, it } from "vitest";
import { InputLineBuffer } from "../app-electron/main/agentInput";

const feedAll = (...chunks: string[]) => {
  const buffer = new InputLineBuffer();
  return chunks.flatMap((c) => buffer.feed(c));
};

describe("InputLineBuffer", () => {
  it("Enter satırı gönderiyor; parça parça yazım birleşiyor", () => {
    expect(feedAll("merhaba\r")).toEqual(["merhaba"]);
    expect(feedAll("me", "rha", "ba", "\r")).toEqual(["merhaba"]);
  });

  it("geri silme son karakteri siliyor (Türkçe harf dahil)", () => {
    expect(feedAll("abcd\x7f\x7fxy\r")).toEqual(["abxy"]);
    expect(feedAll("çğış\b\r")).toEqual(["çğı"]);
  });

  it("ok ve işlev tuşu dizileri satıra girmiyor", () => {
    expect(feedAll("ab\x1b[Dc\x1bOP\r")).toEqual(["abc"]);
  });

  it("yapıştırma içindeki satır sonu göndermiyor, boşluk oluyor", () => {
    expect(feedAll("\x1b[200~satır1\r\nsatır2\x1b[201~\r")).toEqual(["satır1 satır2"]);
  });

  it("Ctrl+J yeni satır boşluk oluyor; Ctrl+C ve Ctrl+U taslağı siliyor", () => {
    expect(feedAll("a\nb\r")).toEqual(["a b"]);
    expect(feedAll("abc\x03def\r")).toEqual(["def"]);
    expect(feedAll("abc\x15x\r")).toEqual(["x"]);
  });

  it("boş Enter satır üretmiyor; tek başına Esc yutuluyor", () => {
    expect(feedAll("\r\r", "  \r")).toEqual([]);
    expect(feedAll("\x1b", "a\r")).toEqual(["a"]);
  });

  it("taslak var mı", () => {
    const buffer = new InputLineBuffer();
    expect(buffer.hasDraft()).toBe(false);
    buffer.feed("yaz");
    expect(buffer.hasDraft()).toBe(true);
    buffer.feed("\r");
    expect(buffer.hasDraft()).toBe(false);
  });
});
```

`tests/terminalTap.test.ts`:

```ts
// Ajan izleyicisinin terminal dinleyicisi (spec 2026-10-17 ajan-alani §6).
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    data: null as null | ((d: string) => void),
    exit: null as null | ((e: { exitCode: number }) => void),
    write: vi.fn()
  };
  const spawn = vi.fn(() => ({
    onData: (cb: (d: string) => void) => {
      state.data = cb;
      return { dispose: vi.fn() };
    },
    onExit: (cb: (e: { exitCode: number }) => void) => {
      state.exit = cb;
      return { dispose: vi.fn() };
    },
    write: state.write,
    kill: vi.fn(),
    resize: vi.fn(),
    pid: 1
  }));
  return { state, spawn };
});

vi.mock("@lydell/node-pty", () => ({ spawn: h.spawn }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "t" }));
vi.mock("../app-electron/main/pythonSiteEnv", () => ({ withNttPythonSite: (env: unknown) => env }));
vi.mock("../app-electron/main/appLog", () => ({ appLog: vi.fn() }));

import { createTerminal, disposeAllTerminals, setTerminalTap, writeTerminal } from "../app-electron/main/terminalManager";

const send = vi.fn();
const fakeWindow = { isDestroyed: () => false, webContents: { send } } as never;

beforeEach(() => {
  send.mockClear();
  h.state.write.mockClear();
  createTerminal(fakeWindow, "p1", tmpdir(), 80, 24, "cmd", undefined, { createDir: false });
});

afterEach(() => {
  setTerminalTap(null);
  disposeAllTerminals();
});

describe("setTerminalTap", () => {
  it("çıktı ve çıkış dinleyiciye gidiyor; renderer akışı sürüyor", () => {
    const tap = { onOutput: vi.fn(), onExit: vi.fn() };
    setTerminalTap(tap);
    h.state.data?.("merhaba");
    h.state.exit?.({ exitCode: 0 });
    expect(tap.onOutput).toHaveBeenCalledWith("p1", "merhaba");
    expect(tap.onExit).toHaveBeenCalledWith("p1");
    expect(send).toHaveBeenCalledWith("terminal:data", "p1", "merhaba");
  });

  it("dinleyici hata fırlatsa da terminal akışı sürüyor", () => {
    setTerminalTap({
      onOutput: () => {
        throw new Error("izleyici");
      },
      onExit: () => {
        throw new Error("izleyici");
      }
    });
    expect(() => h.state.data?.("x")).not.toThrow();
    expect(send).toHaveBeenCalledWith("terminal:data", "p1", "x");
    expect(() => h.state.exit?.({ exitCode: 1 })).not.toThrow();
  });

  it("writeTerminal: bilinen bölmeye yazıp true, bilinmeyene false", () => {
    expect(writeTerminal("p1", "a")).toBe(true);
    expect(h.state.write).toHaveBeenCalledWith("a");
    expect(writeTerminal("yok", "a")).toBe(false);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentInput.test.ts tests/terminalTap.test.ts`
Expected: FAIL — `agentInput` bulunamıyor; `setTerminalTap is not a function`.

- [ ] **Step 3: Uygula**

`app-electron/main/agentInput.ts`:

```ts
// Bölmeye yazılan tuşlardan "gönderilen satır"ı çıkarır (spec 2026-10-17
// ajan-alani §6.1). axet-code okuyucusu bu satırı oturum veritabanında arayıp
// ajanın oturumunu buluyor. Satırlar YALNIZ BELLEKTE: diske ve günlüğe gitmez.
//
// Satır içi düzenleme (ok tuşuyla geri gidip araya yazma) izlenmiyor: ok
// dizileri atılıyor, karakterler sona ekleniyor. Böyle bir satır veritabanında
// bulunmaz; okuyucu o zaman "tahmini"de kalır — yanlış oturuma bağlanmaz.

const MAX_LINE = 4_000;
// CSI (`ESC [ … son`), SS3 (`ESC O x`) ya da iki baytlık `ESC x`.
const ESCAPE_SEQUENCE = /^\x1b(?:\[[0-?]*[ -/]*[@-~]|O[@-~]|[@-_])/;

export class InputLineBuffer {
  private line = "";
  private pasting = false;

  feed(data: string): string[] {
    const lines: string[] = [];
    let i = 0;
    while (i < data.length) {
      const ch = data[i];
      if (ch === "\x1b") {
        const rest = data.slice(i, i + 32);
        if (rest.startsWith("\x1b[200~")) {
          this.pasting = true;
          i += 6;
          continue;
        }
        if (rest.startsWith("\x1b[201~")) {
          this.pasting = false;
          i += 6;
          continue;
        }
        const match = ESCAPE_SEQUENCE.exec(rest);
        // Tek başına Esc (soru kutusunu kapatma vb.) yalnızca atlanıyor.
        i += match ? match[0].length : 1;
        continue;
      }
      if (ch === "\r") {
        if (this.pasting) {
          this.append(" ");
        } else {
          const done = this.line.trim();
          if (done) lines.push(done);
          this.line = "";
        }
        i += data[i + 1] === "\n" ? 2 : 1;
        continue;
      }
      // axet-code'da Ctrl+J istem içinde yeni satır: gönderme değil.
      if (ch === "\n") {
        this.append(" ");
        i += 1;
        continue;
      }
      if (ch === "\x7f" || ch === "\b") {
        this.line = Array.from(this.line).slice(0, -1).join("");
        i += 1;
        continue;
      }
      // Ctrl+C ve Ctrl+U taslağı siliyor.
      if (ch === "\x03" || ch === "\x15") {
        this.line = "";
        i += 1;
        continue;
      }
      if (ch < " ") {
        i += 1;
        continue;
      }
      this.append(ch);
      i += 1;
    }
    return lines;
  }

  hasDraft(): boolean {
    return this.line.trim().length > 0;
  }

  private append(text: string): void {
    if (this.line.length < MAX_LINE) this.line += text;
  }
}
```

`app-electron/main/terminalManager.ts`:
- `const sessions = new Map<string, TerminalSession>();` satırının altına:

```ts
/**
 * Ajan izleyicisinin çıktı ve çıkış dinleyicisi (spec 2026-10-17 ajan-alani
 * §6). Tek dinleyici. Dinleyici hata fırlatsa da terminal akışı sürüyor:
 * izleyici bozulsa bile kullanıcının terminali çalışmaya devam etmeli.
 * Girdi burada değil: `terminal:write` IPC'sinde dinleniyor (index.ts), çünkü
 * izleyicinin kendi yazdığı tuşlar (Kararlar cevabı) kullanıcı girdisi sayılmamalı.
 */
export interface TerminalTap {
  onOutput(id: string, data: string): void;
  onExit(id: string): void;
}

let tap: TerminalTap | null = null;

export function setTerminalTap(next: TerminalTap | null): void {
  tap = next;
}

function tell(fn: (current: TerminalTap) => void): void {
  const current = tap;
  if (!current) return;
  try {
    fn(current);
  } catch {
    // İzleyici hatası terminali düşürmesin.
  }
}
```

- `proc.onData` içinde `appendToBuffer(session, data);` satırının altına: `tell((t) => t.onOutput(id, data));`
- `proc.onExit` içinde `markReady(session);` satırının altına: `tell((t) => t.onExit(id));`
- `writeTerminal`:

```ts
export function writeTerminal(id: string, data: string): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  try {
    session.proc.write(data);
    return true;
  } catch {
    // Süreç az önce kapanmış olabilir.
    return false;
  }
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/agentInput.test.ts tests/terminalTap.test.ts tests/terminalManager.test.ts tests/terminalResizeLog.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/main/agentInput.ts app-electron/main/terminalManager.ts tests/agentInput.test.ts tests/terminalTap.test.ts
git commit -m "Ajan Alani: yazilan satirin yakalanmasi ve terminal dinleyicisi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Genel (tahmini) durum okuyucusu

**Files:**
- Create: `app-electron/main/agentGenericReader.ts`
- Test: `tests/agentGenericReader.test.ts`

**Interfaces:**
- Consumes: Task 2 `AgentStatus`; Task 1 Ruling B (kabuk istemi düzeni).
- Produces:

```ts
export interface AgentReader {   // izleyicinin (Task 8) bildiği tek yüz
  feedOutput(data: string): void;
  submitLine(line: string): void;
  poll(): void;
  status(): AgentStatus;
  dispose(): void;
}
export const IDLE_AFTER_MS = 20_000;
export function stripAnsi(text: string): string;
export function isShellPromptLine(line: string): boolean;
export function lastLine(text: string): string;
export function commandToken(command: string): string;
export interface GenericReaderOptions { command: string; now: () => number; idleAfterMs?: number }
export class GenericReader {
  constructor(opts: GenericReaderOptions);
  feedOutput(data: string): void;
  engineExited(): boolean;
  status(): AgentStatus;          // kaynak her zaman "estimated"
}
export function genericAgentReader(reader: GenericReader): AgentReader;
```

- [ ] **Step 1: Kırmızı test** — `tests/agentGenericReader.test.ts`

```ts
// Genel (tahmini) okuyucu: terminal hareketinden durum (spec 2026-10-17 ajan-alani §6.3).
import { describe, expect, it } from "vitest";
import {
  GenericReader,
  IDLE_AFTER_MS,
  commandToken,
  genericAgentReader,
  isShellPromptLine,
  lastLine,
  stripAnsi
} from "../app-electron/main/agentGenericReader";

function setup(command = "claude --model sonnet", idleAfterMs?: number) {
  const clock = { ms: 1_000_000 };
  const reader = new GenericReader({ command, now: () => clock.ms, idleAfterMs });
  return { clock, reader };
}

describe("GenericReader", () => {
  it("çıktı yokken bilinmiyor, kaynak tahmini", () => {
    const { reader } = setup();
    expect(reader.status()).toEqual({ state: "unknown", source: "estimated", lastActivity: null });
  });

  it("çıktı gelince çalışıyor; 20 sn sessizlikte boşta", () => {
    const { clock, reader } = setup();
    reader.feedOutput("x");
    expect(reader.status()).toEqual({ state: "running", source: "estimated", lastActivity: 1_000_000 });
    clock.ms += IDLE_AFTER_MS - 1;
    expect(reader.status().state).toBe("running");
    clock.ms += 1;
    expect(reader.status()).toEqual({ state: "idle", source: "estimated", lastActivity: 1_000_000 });
  });

  it("eşik enjekte edilebiliyor", () => {
    const { clock, reader } = setup("codex", 1_000);
    reader.feedOutput("x");
    clock.ms += 1_000;
    expect(reader.status().state).toBe("idle");
  });

  it("komut yankısından sonra kabuk istemi dönünce bitti (cmd)", () => {
    const { reader } = setup();
    reader.feedOutput("Microsoft Windows [Version 10.0]\r\n\r\nC:\\proje>");
    reader.feedOutput("claude --model sonnet\r\n");
    reader.feedOutput("\x1b[?1049h\x1b[2J  ● Claude Code  \x1b[1;1H");
    expect(reader.engineExited()).toBe(false);
    reader.feedOutput("\x1b[?1049l\r\nC:\\proje>");
    expect(reader.engineExited()).toBe(true);
    expect(reader.status().state).toBe("finished");
    expect(reader.status().source).toBe("estimated");
  });

  it("PowerShell istemi de tanınıyor", () => {
    const { reader } = setup("codex");
    reader.feedOutput("PS C:\\proje> codex\r\n");
    reader.feedOutput("...çalışıyor...\r\n");
    reader.feedOutput("PS C:\\proje> ");
    expect(reader.status().state).toBe("finished");
  });

  it("yankıdan önceki ilk istem 'bitti' sayılmıyor (açılış yarışı)", () => {
    const { reader } = setup();
    reader.feedOutput("Microsoft Windows\r\n\r\nC:\\proje>");
    expect(reader.engineExited()).toBe(false);
    expect(reader.status().state).toBe("running");
  });

  it("bittikten sonra yeni çıktı yeniden çalışıyor", () => {
    const { reader } = setup();
    reader.feedOutput("C:\\proje>claude --model sonnet\r\nC:\\proje>");
    expect(reader.status().state).toBe("finished");
    reader.feedOutput("claude\r\n\x1b[2J yeniden açıldı");
    expect(reader.status().state).toBe("running");
  });

  it("genericAgentReader sarmalayıcısı satırları yok sayıyor, durumu aktarıyor", () => {
    const { reader } = setup();
    const wrapped = genericAgentReader(reader);
    wrapped.submitLine("gizli istem");
    wrapped.poll();
    wrapped.feedOutput("x");
    expect(wrapped.status().state).toBe("running");
    expect(() => wrapped.dispose()).not.toThrow();
  });
});

describe("yardımcılar", () => {
  it("stripAnsi renk, imleç, başlık ve karakter kümesi dizilerini siliyor", () => {
    expect(stripAnsi("\x1b[31mkırmızı\x1b[0m \x1b]0;başlık\x07son\x1b(B\x1b=")).toBe("kırmızı son");
  });

  it("isShellPromptLine", () => {
    expect(isShellPromptLine("C:\\a b\\c>")).toBe(true);
    expect(isShellPromptLine("PS C:\\x> ")).toBe(true);
    expect(isShellPromptLine("C:\\a>dir")).toBe(false);
    expect(isShellPromptLine("> ")).toBe(false);
    expect(isShellPromptLine("")).toBe(false);
  });

  it("lastLine boş satırları atlıyor; commandToken tırnaklı yolu tanıyor", () => {
    expect(lastLine("a\r\nb\r\n\r\n  ")).toBe("b");
    expect(commandToken('  "C:\\Program Files\\x.exe" --a')).toBe("C:\\Program Files\\x.exe");
    expect(commandToken("axet-code -y --agent coder")).toBe("axet-code");
    expect(commandToken("")).toBe("");
  });
});
```

Task 1 Ruling B gerçek istem satırını farklı bulduysa, "isShellPromptLine" testine o gerçek satırı `true` beklentisiyle ekle.

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentGenericReader.test.ts`
Expected: FAIL — modül bulunamıyor.

- [ ] **Step 3: Uygula** — `app-electron/main/agentGenericReader.ts`

```ts
// Genel okuyucu: durumu terminal hareketinden TAHMİN eder (spec 2026-10-17
// ajan-alani §6.3). Claude Code / Codex / Gemini / özel komut için; axet-code
// okuyucusu da eşleme kurulana kadar buna yaslanıyor.
//
//   - Çıktı akıyorsa çalışıyor, 20 sn sessizse boşta (eşik testte enjekte).
//   - Motorun komutu kabukta yankılandıktan SONRA son satır yine kabuk
//     istemiyse motor kapanmış: bitti. Yankıdan önceki istem (bölme yeni
//     açılırken) sayılmıyor.
//   - Soru algılamıyor; soru kartı çıkmıyor.
//
// Bilinen sınır: dönen imleç ya da saat çizen bir TUI hep "çalışıyor"
// görünür. Bu yüzden kaynak hep "tahmini" ve kartta "≈".
import type { AgentStatus } from "../shared/agentTypes";

/** İzleyicinin (agentMonitor.ts) bildiği tek yüz. Yöntemler hata fırlatmamalı. */
export interface AgentReader {
  feedOutput(data: string): void;
  submitLine(line: string): void;
  poll(): void;
  status(): AgentStatus;
  dispose(): void;
}

export const IDLE_AFTER_MS = 20_000;
const TAIL_MAX = 4_000;

export function stripAnsi(text: string): string {
  return text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[()][0-9A-Za-z]/g, "")
    .replace(/\x1b[@-_=>]/g, "");
}

// cmd: `C:\proje>`, PowerShell: `PS C:\proje>` (Task 1 Karar B).
const RE_PROMPT = /^(?:PS )?[A-Za-z]:\\[^<>|"]*>$/;

export function isShellPromptLine(line: string): boolean {
  return RE_PROMPT.test(line.replace(/\s+$/, ""));
}

export function lastLine(text: string): string {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.length > 0);
  return lines[lines.length - 1] ?? "";
}

/** Komutun ilk parçası (tırnaklı yol olabilir); yankı bununla aranıyor. */
export function commandToken(command: string): string {
  const match = /^\s*"([^"]+)"|^\s*(\S+)/.exec(command);
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface GenericReaderOptions {
  command: string;
  now: () => number;
  idleAfterMs?: number;
}

export class GenericReader {
  private tail = "";
  private lastOutputAt: number | null = null;
  private sawEcho = false;
  private readonly echo: RegExp | null;

  constructor(private readonly opts: GenericReaderOptions) {
    const token = commandToken(opts.command);
    this.echo = token ? new RegExp(`>\\s?"?${escapeRegExp(token)}`, "i") : null;
  }

  feedOutput(data: string): void {
    this.lastOutputAt = this.opts.now();
    this.tail = (this.tail + stripAnsi(data)).slice(-TAIL_MAX);
    if (!this.sawEcho && this.echo?.test(this.tail)) this.sawEcho = true;
  }

  engineExited(): boolean {
    return this.sawEcho && isShellPromptLine(lastLine(this.tail));
  }

  status(): AgentStatus {
    const at = this.lastOutputAt;
    if (this.engineExited()) return { state: "finished", source: "estimated", lastActivity: at };
    if (at === null) return { state: "unknown", source: "estimated", lastActivity: null };
    const quiet = this.opts.now() - at >= (this.opts.idleAfterMs ?? IDLE_AFTER_MS);
    return { state: quiet ? "idle" : "running", source: "estimated", lastActivity: at };
  }
}

/** Kesin okuyucusu olmayan motorlar için izleyici yüzü. */
export function genericAgentReader(reader: GenericReader): AgentReader {
  return {
    feedOutput: (data) => reader.feedOutput(data),
    submitLine: () => {},
    poll: () => {},
    status: () => reader.status(),
    dispose: () => {}
  };
}
```

Task 1 Ruling B farklı bir istem biçimi bulduysa `RE_PROMPT`'u o biçimi de kapsayacak şekilde genişlet.

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/agentGenericReader.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/main/agentGenericReader.ts tests/agentGenericReader.test.ts
git commit -m "Ajan Alani: genel (tahmini) durum okuyucusu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: axet-code kesin okuyucusu ve istem→oturum eşleme

**Files:**
- Create: `app-electron/main/agentAxetReader.ts`
- Create: `app-electron/main/agentReaders.ts`
- Modify: `app-electron/main/axetSessionDb.ts` (dosyanın sonuna iki fonksiyon)
- Test: `tests/agentAxetReader.test.ts`

**Interfaces:**
- Consumes: Task 2 türleri, `AGENT_ENGINES`; Task 6 `AgentReader`, `GenericReader`, `genericAgentReader`; mevcut `matchKey`, `resolveSessionDb`, `AxetDbMessage`, `AxetPart` (axetSessionDb.ts), `ASK_USER_TOOL`, `parseAskUser` (axetToolEvents.ts).
- Produces:

```ts
// axetSessionDb.ts
export function findSessionsByPrompt(dbPath: string, sinceEpochSec: number, needle: string): string[] | null; // null = okunamadı
export function readSessionMessages(dbPath: string, sessionId: string, sinceEpochSec: number): AxetDbMessage[] | null;
// agentAxetReader.ts
export interface AxetDbPort {
  resolveDb(cwd: string): string | null;
  findSessions(dbPath: string, sinceSec: number, needle: string): string[] | null;
  readMessages(dbPath: string, sessionId: string, sinceSec: number): AxetDbMessage[] | null;
}
export interface SessionRegistry {
  owner(dbPath: string, sessionId: string): string | null;
  claim(dbPath: string, sessionId: string, agentId: string): void;
  setPending(agentId: string, dbPath: string | null, keys: string[]): void;
  rivalPending(dbPath: string, agentId: string, key: string): boolean;
  release(agentId: string): void;
}
export function createSessionRegistry(): SessionRegistry;
export function keysOverlap(a: string, b: string): boolean;
export const PROMPT_MATCH_WINDOW_MS = 60_000; export const UNCONFIRMED_LIMIT_MS = 30_000;
export const NEEDLE_MAX = 80; export const NEEDLE_MIN = 4;
export type MatchOutcome = "istem" | "belirsiz";
export interface DerivedAxetState { state: AgentState; question?: AgentQuestion; detail?: string; lastActivitySec: number | null }
export function deriveAxetState(messages: AxetDbMessage[]): DerivedAxetState;
export interface AxetReaderOptions { agentId: string; cwd: string; startedAtMs: number; port: AxetDbPort; registry: SessionRegistry; generic: GenericReader; now: () => number; onMatch?: (outcome: MatchOutcome) => void }
export class AxetReader implements AgentReader { constructor(opts: AxetReaderOptions); binding(): string | null; /* + AgentReader */ }
// agentReaders.ts
export const liveAxetDbPort: AxetDbPort;
export interface ReaderDeps { now: () => number; port: AxetDbPort; registry: SessionRegistry; onMatch: (reg: AgentRegistration, outcome: MatchOutcome) => void }
export function createAgentReader(reg: AgentRegistration, deps: ReaderDeps): AgentReader;
```

- [ ] **Step 1: Kırmızı test** — `tests/agentAxetReader.test.ts`

```ts
// axet-code kesin okuyucusu: oturum veritabanından durum ve istem→oturum
// eşleme (spec 2026-10-17 ajan-alani §6.1). Veritabanı sahte; better-sqlite3
// vitest'te yüklenmiyor.
import { describe, expect, it, vi } from "vitest";
import type { AxetDbMessage, AxetPart } from "../app-electron/main/axetSessionDb";
import type { AgentRegistration } from "../app-electron/shared/agentTypes";

vi.mock("electron", () => ({ app: { getPath: () => "", getAppPath: () => "" } }));
vi.mock("../app-electron/main/i18n", () => ({ mt: (k: string) => k }));

const { AxetReader, createSessionRegistry, deriveAxetState, keysOverlap, UNCONFIRMED_LIMIT_MS } = await import(
  "../app-electron/main/agentAxetReader"
);
const { createAgentReader } = await import("../app-electron/main/agentReaders");
const { GenericReader } = await import("../app-electron/main/agentGenericReader");
const { matchKey } = await import("../app-electron/main/axetSessionDb");

const T0 = 1_700_000_000; // sn
const DB = "C:\\p\\.axet-code\\axet-code.db";

type Row = AxetDbMessage & { sessionId: string };
interface FakeDb {
  rows: Row[];
  broken: boolean;
  throws: boolean;
  missing: boolean;
}

let seq = 0;
const text = (t: string): AxetPart => ({ type: "text", data: { text: t } });
const finish = (reason: string): AxetPart => ({ type: "finish", data: { reason } });
const askCall = (id: string, options = ["Kırmızı", "Mavi"], multi = false): AxetPart => ({
  type: "tool_call",
  data: { id, name: "ask_user", finished: true, input: JSON.stringify({ question: "Hangi renk?", options: options.map((label) => ({ label })), multi_select: multi }) }
});
const result = (callId: string): AxetPart => ({ type: "tool_result", data: { tool_call_id: callId, content: "ok" } });
const msg = (sessionId: string, role: string, parts: AxetPart[], sec: number): Row => ({
  id: `m${++seq}`,
  sessionId,
  role,
  parts,
  createdAt: sec
});
const textOf = (m: AxetDbMessage) => m.parts.filter((p) => p.type === "text").map((p) => p.data?.text ?? "").join("");

function fakeDb(): FakeDb {
  return { rows: [], broken: false, throws: false, missing: false };
}

function port(db: FakeDb) {
  return {
    resolveDb: () => (db.missing ? null : DB),
    findSessions: (_path: string, since: number, needle: string) => {
      if (db.throws) throw new Error("database is locked");
      if (db.broken) return null;
      const ids = new Set<string>();
      for (const m of db.rows) if (m.role === "user" && m.createdAt >= since && matchKey(textOf(m)).includes(needle)) ids.add(m.sessionId);
      return [...ids];
    },
    readMessages: (_path: string, sessionId: string, since: number) => {
      if (db.throws) throw new Error("database is locked");
      if (db.broken) return null;
      return db.rows.filter((m) => m.sessionId === sessionId && m.createdAt >= since);
    }
  };
}

function scenario() {
  const db = fakeDb();
  const registry = createSessionRegistry();
  const clock = { ms: (T0 + 10) * 1000 };
  const make = (agentId: string) => {
    const onMatch = vi.fn();
    const generic = new GenericReader({ command: "axet-code -y", now: () => clock.ms });
    const reader = new AxetReader({ agentId, cwd: "C:\\p", startedAtMs: T0 * 1000, port: port(db), registry, generic, now: () => clock.ms, onMatch });
    return { reader, onMatch };
  };
  return { db, registry, clock, make };
}

describe("deriveAxetState", () => {
  it("son mesaj kullanıcıdan ya da araç sonucuysa çalışıyor", () => {
    expect(deriveAxetState([msg("S", "user", [text("iş")], T0)]).state).toBe("running");
    expect(deriveAxetState([msg("S", "tool", [result("c0")], T0)]).state).toBe("running");
  });

  it("finish yok ya da tool_use ise çalışıyor; end_turn boşta; error hata", () => {
    expect(deriveAxetState([msg("S", "assistant", [text("yazıyor")], T0)]).state).toBe("running");
    expect(deriveAxetState([msg("S", "assistant", [finish("tool_use")], T0)]).state).toBe("running");
    expect(deriveAxetState([msg("S", "assistant", [text("bitti"), finish("end_turn")], T0 + 5)])).toEqual({
      state: "idle",
      detail: "end_turn",
      lastActivitySec: T0 + 5
    });
    expect(deriveAxetState([msg("S", "assistant", [finish("error")], T0)])).toMatchObject({ state: "error", detail: "error" });
  });

  it("sonucu gelmemiş tamamlanmış ask_user soru soruyor; seçenekler ve zaman", () => {
    const d = deriveAxetState([msg("S", "user", [text("iş")], T0), msg("S", "assistant", [askCall("c1"), finish("tool_use")], T0 + 3)]);
    expect(d.state).toBe("asking");
    expect(d.question).toEqual({ callId: "c1", question: "Hangi renk?", header: "", options: ["Kırmızı", "Mavi"], multiSelect: false, askedAt: (T0 + 3) * 1000 });
  });

  it("cevaplanmış ya da arkasından kullanıcı mesajı gelmiş soru açık sayılmıyor", () => {
    const asked = msg("S", "assistant", [askCall("c1"), finish("tool_use")], T0);
    expect(deriveAxetState([asked, msg("S", "tool", [result("c1")], T0 + 1)]).state).toBe("running");
    expect(deriveAxetState([asked, msg("S", "user", [text("yeni iş")], T0 + 9)]).state).toBe("running");
  });

  it("boş liste boşta", () => {
    expect(deriveAxetState([])).toEqual({ state: "idle", lastActivitySec: null });
  });
});

describe("AxetReader — eşleme", () => {
  it("ilk istemden önce boşta ve tahmini", () => {
    const { make } = scenario();
    const { reader } = make("A");
    reader.poll();
    expect(reader.status()).toEqual({ state: "idle", source: "estimated", lastActivity: null });
  });

  it("istem yazılınca oturuma bağlanıyor; durum kesin", () => {
    const { db, make } = scenario();
    const { reader, onMatch } = make("A");
    reader.submitLine("Raporu hazırla — lütfen");
    db.rows.push(msg("S1", "user", [text("Raporu hazırla lütfen")], T0 + 11), msg("S1", "assistant", [text("tamam"), finish("end_turn")], T0 + 12));
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(onMatch).toHaveBeenCalledWith("istem");
    expect(reader.status()).toEqual({ state: "idle", source: "exact", lastActivity: (T0 + 12) * 1000, detail: "end_turn" });
  });

  it("aynı klasörde iki ajan: her biri kendi oturumuna", () => {
    const { db, make } = scenario();
    const a = make("A");
    const b = make("B");
    a.reader.submitLine("Birinci işi yap");
    b.reader.submitLine("İkinci işi yap");
    db.rows.push(
      msg("S1", "user", [text("Birinci işi yap")], T0 + 11),
      msg("S2", "user", [text("İkinci işi yap")], T0 + 11),
      msg("S2", "assistant", [askCall("c9"), finish("tool_use")], T0 + 12)
    );
    a.reader.poll();
    b.reader.poll();
    expect(a.reader.binding()).toBe("S1");
    expect(b.reader.binding()).toBe("S2");
    expect(a.reader.status()).toMatchObject({ state: "running", source: "exact" });
    expect(b.reader.status()).toMatchObject({ state: "asking", source: "exact", question: { callId: "c9" } });
  });

  it("aynı istem iki ajanda: hiçbirine bağlanmıyor; ayrışan istemle ikisi de doğru oturuma", () => {
    const { db, make } = scenario();
    const a = make("A");
    const b = make("B");
    a.reader.submitLine("Testleri çalıştır");
    b.reader.submitLine("Testleri çalıştır");
    db.rows.push(msg("S1", "user", [text("Testleri çalıştır")], T0 + 11), msg("S2", "user", [text("Testleri çalıştır")], T0 + 11));
    a.reader.poll();
    b.reader.poll();
    expect(a.reader.binding()).toBeNull();
    expect(b.reader.binding()).toBeNull();
    expect(a.reader.status().source).toBe("estimated");
    expect(a.onMatch).toHaveBeenCalledWith("belirsiz");

    a.reader.submitLine("Yalnız birinci modül");
    db.rows.push(msg("S1", "user", [text("Yalnız birinci modül")], T0 + 20));
    a.reader.poll();
    b.reader.poll();
    expect(a.reader.binding()).toBe("S1");
    expect(b.reader.binding()).toBe("S2");
  });

  it("rakibin aynı istemi bekliyorsa tek aday görünse bile bağlanmıyor (mesajı henüz düşmemiş rakip)", () => {
    const { db, make } = scenario();
    const a = make("A");
    const b = make("B");
    a.reader.submitLine("Merhaba ajan");
    b.reader.submitLine("Merhaba ajan");
    // Yalnız B'nin mesajı düştü; A'nınki henüz yazılmadı.
    db.rows.push(msg("SB", "user", [text("Merhaba ajan")], T0 + 11));
    a.reader.poll();
    expect(a.reader.binding()).toBeNull();
    expect(a.reader.status().source).toBe("estimated");
  });

  it("başka ajanın sahiplendiği oturum aday sayılmıyor", () => {
    const { db, make } = scenario();
    const a = make("A");
    a.reader.submitLine("Ortak başlık uzun");
    db.rows.push(msg("S1", "user", [text("Ortak başlık uzun")], T0 + 11));
    a.reader.poll();
    expect(a.reader.binding()).toBe("S1");
    const b = make("B");
    b.reader.submitLine("Ortak başlık uzun");
    db.rows.push(msg("S2", "user", [text("Ortak başlık uzun")], T0 + 12));
    b.reader.poll();
    expect(b.reader.binding()).toBe("S2");
  });

  it("eğik çizgi komutları ve kısa satırlar istem sayılmıyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("/model");
    reader.submitLine("ok");
    db.rows.push(msg("S1", "user", [text("/model ok")], T0 + 11));
    reader.poll();
    expect(reader.binding()).toBeNull();
    expect(reader.status()).toEqual({ state: "idle", source: "estimated", lastActivity: null });
  });
});

describe("AxetReader — bağdan sonra", () => {
  it("soru kutusuna yazılan cevap istem sayılmıyor, bağ bozulmuyor", () => {
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Renk sor bana");
    db.rows.push(msg("S1", "user", [text("Renk sor bana")], T0 + 11), msg("S1", "assistant", [askCall("c1"), finish("tool_use")], T0 + 12));
    reader.poll();
    reader.submitLine("Turuncu olsun");
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(reader.binding()).toBe("S1");
  });

  it("bağlı oturumda görünmeyen istem 30 sn sonra bağı çözüyor ve yeni oturuma bağlanıyor (Ctrl+N)", () => {
    const { db, clock, make } = scenario();
    const { reader, onMatch } = make("A");
    reader.submitLine("Eski konu burada");
    db.rows.push(msg("S1", "user", [text("Eski konu burada")], T0 + 11), msg("S1", "assistant", [finish("end_turn")], T0 + 12));
    reader.poll();
    expect(reader.binding()).toBe("S1");
    reader.submitLine("Yeni konu başlasın");
    db.rows.push(msg("S3", "user", [text("Yeni konu başlasın")], T0 + 20));
    clock.ms += UNCONFIRMED_LIMIT_MS + 1_000;
    reader.poll();
    expect(onMatch).toHaveBeenCalledWith("belirsiz");
    reader.poll();
    expect(reader.binding()).toBe("S3");
  });

  it("ajan çalışırken bekleyen istem süre saymıyor", () => {
    const { db, clock, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Uzun iş başlat");
    db.rows.push(msg("S1", "user", [text("Uzun iş başlat")], T0 + 11), msg("S1", "assistant", [text("çalışıyor")], T0 + 12));
    reader.poll();
    reader.submitLine("Sıradaki istem");
    clock.ms += UNCONFIRMED_LIMIT_MS * 3;
    reader.poll();
    expect(reader.binding()).toBe("S1");
    expect(reader.status()).toMatchObject({ state: "running", source: "exact" });
  });

  it("motor kapandı: bağlıysa kesin 'bitti'", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("C:\\p>axet-code -y\r\n");
    reader.submitLine("Bir iş yap");
    db.rows.push(msg("S1", "user", [text("Bir iş yap")], T0 + 11), msg("S1", "assistant", [finish("end_turn")], T0 + 12));
    reader.poll();
    reader.feedOutput("\r\nC:\\p>");
    expect(reader.status()).toMatchObject({ state: "finished", source: "exact", detail: "end_turn" });
  });
});

describe("AxetReader — veritabanı arızası", () => {
  it("veritabanı okunamıyor: tahmini, hata fırlatmıyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.feedOutput("x");
    reader.submitLine("Bir şey yap");
    db.broken = true;
    expect(() => reader.poll()).not.toThrow();
    expect(reader.status()).toMatchObject({ state: "running", source: "estimated" });
  });

  it("sorgu hata fırlatıyor (kilit) ya da veritabanı yok: tahmini, hata fırlatmıyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Bir şey yap");
    db.throws = true;
    expect(() => reader.poll()).not.toThrow();
    expect(reader.status().source).toBe("estimated");
    db.throws = false;
    db.missing = true;
    expect(() => reader.poll()).not.toThrow();
    expect(reader.status().source).toBe("estimated");
  });

  it("bağlandıktan sonra okuma bozulursa tahminiye düşüyor, düzelince kesine dönüyor", () => {
    const { db, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Bir şey yap");
    db.rows.push(msg("S1", "user", [text("Bir şey yap")], T0 + 11), msg("S1", "assistant", [finish("end_turn")], T0 + 12));
    reader.poll();
    db.broken = true;
    reader.poll();
    expect(reader.status().source).toBe("estimated");
    db.broken = false;
    reader.poll();
    expect(reader.status().source).toBe("exact");
  });

  it("dispose sahipliği bırakıyor", () => {
    const { db, registry, make } = scenario();
    const { reader } = make("A");
    reader.submitLine("Bir şey yap");
    db.rows.push(msg("S1", "user", [text("Bir şey yap")], T0 + 11));
    reader.poll();
    expect(registry.owner(DB, "S1")).toBe("A");
    reader.dispose();
    expect(registry.owner(DB, "S1")).toBeNull();
  });
});

describe("oturum kaydı ve okuyucu seçimi", () => {
  it("keysOverlap iki yönlü içerme", () => {
    expect(keysOverlap("Merhaba ajan", "Merhaba")).toBe(true);
    expect(keysOverlap("Merhaba", "Merhaba ajan")).toBe(true);
    expect(keysOverlap("Birinci", "İkinci")).toBe(false);
  });

  it("axet-code kesin okuyucu, öteki motorlar genel okuyucu alıyor", () => {
    const deps = { now: () => 0, port: port(fakeDb()), registry: createSessionRegistry(), onMatch: vi.fn() };
    const reg = (engine: AgentRegistration["engine"]): AgentRegistration => ({
      paneId: "p",
      ptyId: "t",
      engine,
      cwd: "C:\\p",
      command: engine,
      name: "x",
      roleKind: "custom",
      sap: false,
      added: false
    });
    expect(createAgentReader(reg("axet-code"), deps)).toBeInstanceOf(AxetReader);
    expect(createAgentReader(reg("claude"), deps)).not.toBeInstanceOf(AxetReader);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentAxetReader.test.ts`
Expected: FAIL — `agentAxetReader` bulunamıyor.

- [ ] **Step 3: Veritabanı fonksiyonları** — `app-electron/main/axetSessionDb.ts` dosyasının sonuna:

```ts
/**
 * `findSessionByPrompt`'un çoğul hâli: iğneyi içeren kullanıcı mesajlarının
 * oturumları, tekrarsız. Ajan Alanı belirsizliği görmek zorunda (spec
 * 2026-10-17 ajan-alani §6.1): iki oturum eşleşiyorsa hiçbirine bağlanılmıyor.
 * Okunamazsa `null` — boş liste "eşleşme yok" demek, ikisi ayrı şeyler.
 */
export function findSessionsByPrompt(dbPath: string, sinceEpochSec: number, needle: string): string[] | null {
  const db = openDb(dbPath);
  if (!db) return null;
  try {
    const rows = db
      .prepare("SELECT session_id, parts FROM messages WHERE role='user' AND created_at>=? ORDER BY created_at DESC LIMIT 200")
      .all(sinceEpochSec) as Array<{ session_id: string; parts: string }>;
    const found = new Set<string>();
    for (const row of rows) {
      const text = parseParts(row.parts)
        .filter((p) => p.type === "text")
        .map((p) => p.data?.text ?? "")
        .join("");
      if (matchKey(text).includes(needle)) found.add(row.session_id);
    }
    return [...found];
  } catch {
    return null;
  }
}

/** `readMessagesSince`'in arızayı ayırt eden hâli: okunamazsa `null`. */
export function readSessionMessages(dbPath: string, sessionId: string, sinceEpochSec: number): AxetDbMessage[] | null {
  const db = openDb(dbPath);
  if (!db) return null;
  try {
    const rows = db
      .prepare("SELECT id, role, parts, created_at FROM messages WHERE session_id=? AND created_at>=? ORDER BY created_at ASC")
      .all(sessionId, sinceEpochSec) as MessageRow[];
    return rows.map((row) => ({ id: row.id, role: row.role, parts: parseParts(row.parts), createdAt: row.created_at }));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Okuyucu** — `app-electron/main/agentAxetReader.ts`

```ts
// axet-code KESİN okuyucusu (spec 2026-10-17 ajan-alani §6.1).
//
// Aynı klasördeki ajanlar AYNI oturum veritabanını kullanıyor; "en yeni
// oturum" yetmiyor. Bölmeye yazılan satır (yalnız bellekte) veritabanında
// aranıyor ve ajanın oturumu böyle bulunuyor. Kural: ASLA yanlış oturuma
// bağlanma. Şunlardan biri varsa bağ kurulmuyor, kaynak "tahmini" kalıyor:
//   - birden çok aday oturum,
//   - aynı (ya da birbirini içeren) istemi bekleyen başka bir ajan — onun
//     mesajı henüz yazılmamış olabilir, tek aday yanıltıcı,
//   - veritabanı yok/okunamıyor.
// Bağdan sonra yazılan bir istem, ajan çalışmıyorken 30 sn içinde bağlı
// oturumda görünmezse (kullanıcı Ctrl+N ile yeni oturuma geçmiş olabilir)
// bağ çözülüyor ve istem yeniden aranıyor (plan sapması 1).
import { ASK_USER_TOOL, parseAskUser } from "./axetToolEvents";
import { matchKey, type AxetDbMessage, type AxetPart } from "./axetSessionDb";
import type { AgentQuestion, AgentState, AgentStatus } from "../shared/agentTypes";
import type { AgentReader, GenericReader } from "./agentGenericReader";

export interface AxetDbPort {
  resolveDb(cwd: string): string | null;
  /** Bu andan sonra iğneyi içeren kullanıcı mesajlarının oturumları; okunamazsa null. */
  findSessions(dbPath: string, sinceSec: number, needle: string): string[] | null;
  /** Okunamazsa null. */
  readMessages(dbPath: string, sessionId: string, sinceSec: number): AxetDbMessage[] | null;
}

export function keysOverlap(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

/** Ajanlar arası ortak defter: hangi oturum kimin, kim hangi istemi bekliyor. */
export interface SessionRegistry {
  owner(dbPath: string, sessionId: string): string | null;
  claim(dbPath: string, sessionId: string, agentId: string): void;
  setPending(agentId: string, dbPath: string | null, keys: string[]): void;
  rivalPending(dbPath: string, agentId: string, key: string): boolean;
  release(agentId: string): void;
}

export function createSessionRegistry(): SessionRegistry {
  const owners = new Map<string, string>();
  const pending = new Map<string, { dbPath: string; keys: string[] }>();
  const slot = (dbPath: string, sessionId: string) => `${dbPath}\n${sessionId}`;
  const dropOwned = (agentId: string) => {
    for (const [key, owner] of owners) if (owner === agentId) owners.delete(key);
  };
  return {
    owner: (dbPath, sessionId) => owners.get(slot(dbPath, sessionId)) ?? null,
    claim(dbPath, sessionId, agentId) {
      dropOwned(agentId);
      owners.set(slot(dbPath, sessionId), agentId);
    },
    setPending(agentId, dbPath, keys) {
      if (!dbPath || keys.length === 0) pending.delete(agentId);
      else pending.set(agentId, { dbPath, keys });
    },
    rivalPending(dbPath, agentId, key) {
      for (const [other, entry] of pending) {
        if (other === agentId || entry.dbPath !== dbPath) continue;
        if (entry.keys.some((k) => keysOverlap(k, key))) return true;
      }
      return false;
    },
    release(agentId) {
      dropOwned(agentId);
      pending.delete(agentId);
    }
  };
}

export const PROMPT_MATCH_WINDOW_MS = 60_000;
export const UNCONFIRMED_LIMIT_MS = 30_000;
export const NEEDLE_MAX = 80;
export const NEEDLE_MIN = 4;
const MESSAGE_CAP = 400;
const PENDING_CAP = 5;

export type MatchOutcome = "istem" | "belirsiz";

export interface DerivedAxetState {
  state: AgentState;
  question?: AgentQuestion;
  detail?: string;
  lastActivitySec: number | null;
}

function textOf(message: AxetDbMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.data?.text ?? "")
    .join("");
}

/**
 * Mesaj listesinden durum. Açık soru: son kullanıcı mesajından SONRA,
 * tamamlanmış (`finished`) ama sonucu gelmemiş `ask_user`. Arkasından
 * kullanıcı mesajı gelmiş eski bir soru (süreç soru açıkken kapanmış) açık
 * sayılmıyor.
 */
export function deriveAxetState(messages: AxetDbMessage[]): DerivedAxetState {
  const last = messages[messages.length - 1];
  if (!last) return { state: "idle", lastActivitySec: null };
  const lastActivitySec = last.createdAt;
  const answered = new Set<string>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === "tool_result" && part.data?.tool_call_id) answered.add(part.data.tool_call_id);
    }
  }
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role === "user") break;
    for (const part of message.parts) {
      const id = part.data?.id;
      if (part.type !== "tool_call" || part.data?.name !== ASK_USER_TOOL || part.data?.finished !== true || !id || answered.has(id)) continue;
      const ask = parseAskUser(id, part.data?.input);
      if (ask) return { state: "asking", question: { ...ask, askedAt: message.createdAt * 1000 }, lastActivitySec };
    }
  }
  if (last.role !== "assistant") return { state: "running", lastActivitySec };
  let finish: AxetPart | undefined;
  for (const part of last.parts) if (part.type === "finish") finish = part;
  if (!finish) return { state: "running", lastActivitySec };
  const reason = finish.data?.reason ?? "";
  if (reason === "error") return { state: "error", detail: "error", lastActivitySec };
  if (reason === "tool_use") return { state: "running", lastActivitySec };
  return { state: "idle", ...(reason ? { detail: reason } : {}), lastActivitySec };
}

export interface AxetReaderOptions {
  agentId: string;
  cwd: string;
  startedAtMs: number;
  port: AxetDbPort;
  registry: SessionRegistry;
  generic: GenericReader;
  now: () => number;
  onMatch?: (outcome: MatchOutcome) => void;
}

interface Needle {
  key: string;
  atMs: number;
}

export class AxetReader implements AgentReader {
  private needles: Needle[] = [];
  private unconfirmed: Needle[] = [];
  private session: { dbPath: string; id: string } | null = null;
  private prompted = false;
  private ambiguous = false;
  private dbFailed = false;
  private messages = new Map<string, AxetDbMessage>();
  private lastSec = 0;
  private derived: DerivedAxetState | null = null;

  constructor(private readonly opts: AxetReaderOptions) {}

  feedOutput(data: string): void {
    this.opts.generic.feedOutput(data);
  }

  submitLine(line: string): void {
    const trimmed = line.trim();
    const key = matchKey(trimmed).slice(0, NEEDLE_MAX).trim();
    // TUI komutları (`/model`) ve çok kısa satırlar istem değil.
    if (trimmed.startsWith("/") || key.length < NEEDLE_MIN) return;
    // Soru kutusuna yazılan serbest cevap yeni bir istem değil.
    if (this.session && this.derived?.state === "asking") return;
    this.prompted = true;
    const needle = { key, atMs: this.opts.now() };
    if (this.session) this.unconfirmed = [...this.unconfirmed, needle].slice(-PENDING_CAP);
    else this.needles = [...this.needles, needle].slice(-PENDING_CAP);
    this.publishPending();
  }

  poll(): void {
    try {
      const now = this.opts.now();
      if (!this.session) this.tryBind(now);
      if (this.session) this.refresh(now);
    } catch {
      // Kilitli/bozuk veritabanı: tahminiye düş, ana süreci düşürme (spec §10).
      this.dbFailed = true;
    }
  }

  status(): AgentStatus {
    const exact = this.session !== null && !this.dbFailed && this.derived !== null;
    const generic = this.opts.generic;
    if (generic.engineExited()) {
      return {
        state: "finished",
        source: exact ? "exact" : "estimated",
        lastActivity: generic.status().lastActivity,
        ...(exact && this.derived?.detail ? { detail: this.derived.detail } : {})
      };
    }
    if (exact && this.derived) {
      const d = this.derived;
      return {
        state: d.state,
        source: "exact",
        lastActivity: d.lastActivitySec === null ? null : d.lastActivitySec * 1000,
        ...(d.question ? { question: d.question } : {}),
        ...(d.detail ? { detail: d.detail } : {})
      };
    }
    // İlk istemden önce: boşta (motorun kaydı henüz okunmadı → tahmini).
    if (!this.prompted) return { state: "idle", source: "estimated", lastActivity: null };
    return generic.status();
  }

  binding(): string | null {
    return this.session?.id ?? null;
  }

  dispose(): void {
    this.opts.registry.release(this.opts.agentId);
  }

  private dbPath(): string | null {
    return this.opts.port.resolveDb(this.opts.cwd);
  }

  private publishPending(): void {
    const keys = [...this.needles, ...this.unconfirmed].map((n) => n.key);
    this.opts.registry.setPending(this.opts.agentId, keys.length ? this.dbPath() : null, keys);
  }

  private tryBind(now: number): void {
    const before = this.needles.length;
    this.needles = this.needles.filter((n) => now - n.atMs < PROMPT_MATCH_WINDOW_MS);
    if (this.needles.length !== before) this.publishPending();
    if (this.needles.length === 0) return;
    const dbPath = this.dbPath();
    if (!dbPath) {
      this.dbFailed = true;
      return;
    }
    const sinceSec = Math.floor(this.opts.startedAtMs / 1000) - 2;
    for (const needle of [...this.needles].reverse()) {
      const found = this.opts.port.findSessions(dbPath, sinceSec, needle.key);
      if (found === null) {
        this.dbFailed = true;
        return;
      }
      this.dbFailed = false;
      const free = found.filter((id) => {
        const owner = this.opts.registry.owner(dbPath, id);
        return owner === null || owner === this.opts.agentId;
      });
      if (free.length === 0) continue;
      if (free.length === 1 && !this.opts.registry.rivalPending(dbPath, this.opts.agentId, needle.key)) {
        this.bind(dbPath, free[0]);
        return;
      }
      if (!this.ambiguous) {
        this.ambiguous = true;
        this.opts.onMatch?.("belirsiz");
      }
    }
  }

  private bind(dbPath: string, id: string): void {
    this.session = { dbPath, id };
    this.opts.registry.claim(dbPath, id, this.opts.agentId);
    this.needles = [];
    this.ambiguous = false;
    this.messages.clear();
    this.lastSec = 0;
    this.derived = null;
    this.publishPending();
    this.opts.onMatch?.("istem");
  }

  private unbind(now: number): void {
    this.opts.registry.release(this.opts.agentId);
    this.session = null;
    this.derived = null;
    this.messages.clear();
    this.lastSec = 0;
    this.needles = this.unconfirmed.map((n) => ({ key: n.key, atMs: now }));
    this.unconfirmed = [];
    this.ambiguous = true;
    this.publishPending();
    this.opts.onMatch?.("belirsiz");
  }

  private refresh(now: number): void {
    if (!this.session) return;
    const { dbPath, id } = this.session;
    const since = this.lastSec > 0 ? this.lastSec - 2 : Math.floor(this.opts.startedAtMs / 1000) - 2;
    const fresh = this.opts.port.readMessages(dbPath, id, since);
    if (fresh === null) {
      this.dbFailed = true;
      return;
    }
    this.dbFailed = false;
    for (const message of fresh) {
      this.messages.set(message.id, message);
      if (message.createdAt > this.lastSec) this.lastSec = message.createdAt;
    }
    while (this.messages.size > MESSAGE_CAP) {
      const oldest = this.messages.keys().next().value;
      if (oldest === undefined) break;
      this.messages.delete(oldest);
    }
    const ordered = [...this.messages.values()].sort((a, b) => a.createdAt - b.createdAt);
    this.derived = deriveAxetState(ordered);
    this.confirm(ordered, now);
  }

  private confirm(ordered: AxetDbMessage[], now: number): void {
    if (this.unconfirmed.length === 0) return;
    const texts = ordered.filter((m) => m.role === "user").map((m) => matchKey(textOf(m)));
    const before = this.unconfirmed.length;
    const running = this.derived?.state === "running";
    this.unconfirmed = this.unconfirmed
      .filter((n) => !texts.some((t) => t.includes(n.key)))
      // Ajan çalışırken TUI istemi sıraya alıyor olabilir: süre o sırada işlemiyor.
      .map((n) => (running ? { ...n, atMs: now } : n));
    if (this.unconfirmed.some((n) => now - n.atMs >= UNCONFIRMED_LIMIT_MS)) {
      this.unbind(now);
      return;
    }
    if (this.unconfirmed.length !== before) this.publishPending();
  }
}
```

- [ ] **Step 5: Okuyucu seçimi** — `app-electron/main/agentReaders.ts`

```ts
// Motor → okuyucu (spec 2026-10-17 ajan-alani §6). Kesin okuyucusu olmayan
// motor genel okuyucuyu alıyor; Claude Code/Codex kesin okuyucuları ölçüldükçe
// burada takılacak (ekran değişmez).
import { AGENT_ENGINES } from "../shared/agentEngines";
import type { AgentRegistration } from "../shared/agentTypes";
import { AxetReader, type AxetDbPort, type MatchOutcome, type SessionRegistry } from "./agentAxetReader";
import { GenericReader, genericAgentReader, type AgentReader } from "./agentGenericReader";
import { findSessionsByPrompt, readSessionMessages, resolveSessionDb } from "./axetSessionDb";

/** Gerçek oturum veritabanı (salt okuma, better-sqlite3; yalnız Electron'da). */
export const liveAxetDbPort: AxetDbPort = {
  resolveDb: resolveSessionDb,
  findSessions: findSessionsByPrompt,
  readMessages: readSessionMessages
};

export interface ReaderDeps {
  now: () => number;
  port: AxetDbPort;
  registry: SessionRegistry;
  onMatch: (reg: AgentRegistration, outcome: MatchOutcome) => void;
}

export function createAgentReader(reg: AgentRegistration, deps: ReaderDeps): AgentReader {
  const generic = new GenericReader({ command: reg.command, now: deps.now });
  if (AGENT_ENGINES[reg.engine].reader !== "axet") return genericAgentReader(generic);
  return new AxetReader({
    agentId: reg.paneId,
    cwd: reg.cwd,
    startedAtMs: deps.now(),
    port: deps.port,
    registry: deps.registry,
    generic,
    now: deps.now,
    onMatch: (outcome) => deps.onMatch(reg, outcome)
  });
}
```

- [ ] **Step 6: Yeşili gör**

Run: `npx vitest run tests/agentAxetReader.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 7: Commit**

```bash
git add app-electron/main/agentAxetReader.ts app-electron/main/agentReaders.ts app-electron/main/axetSessionDb.ts tests/agentAxetReader.test.ts
git commit -m "Ajan Alani: axet-code kesin okuyucusu ve istem-oturum eslemesi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Ajan izleyicisi, Kararlar cevabı ve bildirim kararı (saf)

**Files:**
- Create: `app-electron/main/agentMonitor.ts`
- Create: `app-electron/main/agentNotification.ts`
- Test: `tests/agentMonitor.test.ts`, `tests/agentNotification.test.ts`

**Interfaces:**
- Consumes: Task 2 türleri, `isListAnswerable`, `optionKeys`, `isAgentEngineId`; Task 5 `InputLineBuffer`; Task 6 `AgentReader`.
- Produces:

```ts
// agentNotification.ts
export type AgentNotificationKind = "asking" | "done";
export interface AgentNotificationPayload { title: string; body: string }
export function agentNotificationFor(kind: AgentNotificationKind, focused: boolean, enabled: boolean, agentName: string, lang?: "tr" | "en"): AgentNotificationPayload | null;
// agentMonitor.ts
export const TYPING_GUARD_MS = 2_000;
export type LogFields = Record<string, string | number | boolean>;
export interface MonitorDeps {
  now(): number;
  createReader(reg: AgentRegistration): AgentReader;
  emit(event: AgentStatusEvent): void;
  notify(kind: AgentNotificationKind, reg: AgentRegistration): void;   // yalnız KESİN durumda çağrılır
  write(ptyId: string, data: string): boolean;
  backlog(ptyId: string): string;
  log(tag: string, fields: LogFields): void;
}
export interface AgentMonitor {
  register(reg: AgentRegistration): void;
  unregister(paneId: string): void;
  onOutput(ptyId: string, data: string): void;
  onInput(ptyId: string, data: string): void;
  onExit(ptyId: string): void;
  tick(): void;
  answer(paneId: string, callId: string, index: number): AgentAnswerResult;
  snapshot(): AgentStatusEvent[];
  dispose(): void;
}
export function createAgentMonitor(deps: MonitorDeps): AgentMonitor;
export function readAgentRegistration(raw: unknown): AgentRegistration | null;
```

- [ ] **Step 1: Kırmızı testler**

`tests/agentNotification.test.ts`:

```ts
// Ajan bildirimi: saf karar (spec 2026-10-17 ajan-alani §9).
import { describe, expect, it } from "vitest";
import { agentNotificationFor } from "../app-electron/main/agentNotification";

describe("agentNotificationFor", () => {
  it("pencere odaktaysa ya da ayar kapalıysa bildirim yok", () => {
    expect(agentNotificationFor("asking", true, true, "Ayşe")).toBeNull();
    expect(agentNotificationFor("done", false, false, "Ayşe")).toBeNull();
  });

  it("başlık ajanın adı, gövde sabit; ad boşsa NTT Studio", () => {
    expect(agentNotificationFor("asking", false, true, "Ayşe")).toEqual({ title: "Ayşe", body: "Ajan bir soru soruyor" });
    expect(agentNotificationFor("done", false, true, "  ")).toEqual({ title: "NTT Studio", body: "Ajan işini bitirdi" });
  });

  it("İngilizce gövde", () => {
    expect(agentNotificationFor("done", false, true, "Ayşe", "en")?.body).toBe("The agent finished its work");
  });
});
```

`tests/agentMonitor.test.ts`:

```ts
// Ajan izleyicisi: kayıt, girdi/çıktı, yoklama, Kararlar cevabı, bildirim ve
// günlük (spec 2026-10-17 ajan-alani §6, §7, §9, §11). Okuyucular sahte.
import { describe, expect, it, vi } from "vitest";
import { TYPING_GUARD_MS, createAgentMonitor, readAgentRegistration } from "../app-electron/main/agentMonitor";
import type { AgentReader } from "../app-electron/main/agentGenericReader";
import { LIST_ANSWER_ENABLED } from "../app-electron/shared/agentDecisions";
import type { AgentQuestion, AgentRegistration, AgentStatus } from "../app-electron/shared/agentTypes";

class FakeReader implements AgentReader {
  current: AgentStatus = { state: "idle", source: "estimated", lastActivity: null };
  lines: string[] = [];
  output: string[] = [];
  polls = 0;
  disposed = false;
  failPoll = false;
  feedOutput(data: string) {
    this.output.push(data);
  }
  submitLine(line: string) {
    this.lines.push(line);
  }
  poll() {
    this.polls += 1;
    if (this.failPoll) throw new Error("okuyucu patladı");
  }
  status() {
    return this.current;
  }
  dispose() {
    this.disposed = true;
  }
}

function harness() {
  const clock = { ms: 1_000_000 };
  const readers = new Map<string, FakeReader>();
  const deps = {
    now: () => clock.ms,
    createReader: vi.fn((reg: AgentRegistration): AgentReader => {
      const reader = new FakeReader();
      readers.set(reg.paneId, reader);
      return reader;
    }),
    emit: vi.fn(),
    notify: vi.fn(),
    write: vi.fn((_ptyId: string, _data: string) => true),
    backlog: vi.fn((_ptyId: string) => ""),
    log: vi.fn()
  };
  const monitor = createAgentMonitor(deps);
  return { clock, readers, deps, monitor, reader: (id = "p1") => readers.get(id)! };
}

const reg = (over: Partial<AgentRegistration> = {}): AgentRegistration => ({
  paneId: "p1",
  ptyId: "t1",
  engine: "axet-code",
  cwd: "C:\\p",
  command: "axet-code -y",
  name: "Ayşe",
  roleKind: "axetAgent",
  sap: true,
  added: true,
  ...over
});
const question = (over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId: "c1",
  question: "Hangi renk?",
  header: "",
  options: ["Kırmızı", "Mavi"],
  multiSelect: false,
  askedAt: 900_000,
  ...over
});
const asking = (q: AgentQuestion = question()): AgentStatus => ({ state: "asking", source: "exact", lastActivity: q.askedAt, question: q });
const runningExact: AgentStatus = { state: "running", source: "exact", lastActivity: 1 };
// Task 1 Karar A "YOK" ise listeden cevap hiç gönderilmiyor.
const BLOCKED = LIST_ANSWER_ENABLED ? "typing" : "notAnswerable";

describe("kayıt ve akış", () => {
  it("ilk durum gönderiliyor; yeni eklenen günlüğe düşüyor; önceki çıktı okuyucuya veriliyor", () => {
    const { deps, monitor, reader } = harness();
    deps.backlog.mockReturnValue("C:\\p>axet-code -y");
    monitor.register(reg());
    expect(reader().output).toEqual(["C:\\p>axet-code -y"]);
    expect(deps.emit).toHaveBeenCalledWith({ paneId: "p1", status: { state: "idle", source: "estimated", lastActivity: null } });
    expect(deps.log).toHaveBeenCalledWith("ajan.eklendi", { motor: "axet-code", rol: "hazir", sap: "evet" });
    monitor.register(reg({ paneId: "p2", ptyId: "t2", added: false, roleKind: "custom", sap: false }));
    expect(deps.log.mock.calls.filter(([tag]) => tag === "ajan.eklendi")).toHaveLength(1);
  });

  it("girdi satırları ve çıktı doğru okuyucuya; bilinmeyen pty yok sayılıyor", () => {
    const { monitor, reader } = harness();
    monitor.register(reg());
    monitor.onInput("t1", "Rapor");
    monitor.onInput("t1", "u yaz\r");
    monitor.onOutput("t1", "çıktı");
    expect(() => monitor.onOutput("yok", "x")).not.toThrow();
    expect(() => monitor.onInput("yok", "x\r")).not.toThrow();
    expect(reader().lines).toEqual(["Raporu yaz"]);
    expect(reader().output).toContain("çıktı");
  });

  it("yoklama yalnız değişimde gönderiyor; durum günlüğe kaynağıyla düşüyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    deps.emit.mockClear();
    deps.log.mockClear();
    monitor.tick();
    expect(deps.emit).not.toHaveBeenCalled();
    reader().current = runningExact;
    monitor.tick();
    expect(deps.emit).toHaveBeenCalledTimes(1);
    expect(deps.log).toHaveBeenCalledWith("ajan.durum", { motor: "axet-code", durum: "running", kaynak: "kesin" });
    reader().current = { ...runningExact, lastActivity: 2 };
    monitor.tick();
    expect(deps.emit).toHaveBeenCalledTimes(1);
  });

  it("bir okuyucu patlasa da öteki okunuyor; kayıt hatası fırlatmıyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    monitor.register(reg({ paneId: "p2", ptyId: "t2" }));
    reader("p1").failPoll = true;
    reader("p2").current = runningExact;
    expect(() => monitor.tick()).not.toThrow();
    expect(deps.emit).toHaveBeenCalledWith({ paneId: "p2", status: runningExact });
    deps.createReader.mockImplementationOnce(() => {
      throw new Error("okuyucu kurulamadı");
    });
    expect(() => monitor.register(reg({ paneId: "p3", ptyId: "t3" }))).not.toThrow();
  });

  it("çıkış ve kayıt silme okuyucuyu bırakıyor; anlık görüntü", () => {
    const { monitor, reader } = harness();
    monitor.register(reg());
    expect(monitor.snapshot()).toEqual([{ paneId: "p1", status: { state: "idle", source: "estimated", lastActivity: null } }]);
    monitor.onExit("t1");
    expect(reader().disposed).toBe(true);
    expect(monitor.snapshot()).toEqual([]);
    monitor.register(reg());
    monitor.unregister("p1");
    expect(monitor.snapshot()).toEqual([]);
  });
});

describe("bildirim (yalnız kesin)", () => {
  it("kesin soru bir kez, kesin çalışmadan boşa geçiş 'bitti'", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = runningExact;
    monitor.tick();
    reader().current = asking();
    monitor.tick();
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenLastCalledWith("asking", expect.objectContaining({ paneId: "p1" }));
    reader().current = { ...runningExact, lastActivity: 5 };
    monitor.tick();
    reader().current = { state: "idle", source: "exact", lastActivity: 6, detail: "end_turn" };
    monitor.tick();
    expect(deps.notify).toHaveBeenCalledTimes(2);
    expect(deps.notify).toHaveBeenLastCalledWith("done", expect.objectContaining({ paneId: "p1" }));
  });

  it("tahmini durumda bildirim yok (tahmini bitiş dahil)", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg({ engine: "claude", command: "claude" }));
    reader().current = { state: "running", source: "estimated", lastActivity: 1 };
    monitor.tick();
    reader().current = { state: "finished", source: "estimated", lastActivity: 1 };
    monitor.tick();
    reader().current = { ...asking(), source: "estimated" };
    monitor.tick();
    expect(deps.notify).not.toHaveBeenCalled();
  });
});

describe("Kararlar cevabı", () => {
  it("soru hâlâ açıksa i kez aşağı + Enter yazılıyor; günlüğe 'liste'; kapanınca 'terminal' yazılmıyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking();
    monitor.tick();
    const result = monitor.answer("p1", "c1", 1);
    expect(reader().polls).toBeGreaterThan(0);
    if (!LIST_ANSWER_ENABLED) {
      expect(result).toEqual({ ok: false, reason: "notAnswerable" });
      expect(deps.write).not.toHaveBeenCalled();
      return;
    }
    expect(result).toEqual({ ok: true });
    expect(deps.write).toHaveBeenCalledWith("t1", "\x1b[B\r");
    expect(deps.log).toHaveBeenCalledWith("ajan.karar", { motor: "axet-code", yol: "liste" });
    reader().current = runningExact;
    monitor.tick();
    expect(deps.log.mock.calls.filter(([tag, f]) => tag === "ajan.karar" && (f as { yol: string }).yol === "terminal")).toHaveLength(0);
  });

  it("soru kapanmışsa ya da başka soruysa tuş gönderilmiyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = { state: "idle", source: "exact", lastActivity: 1 };
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: "closed" });
    reader().current = asking(question({ callId: "c2" }));
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: "closed" });
    expect(monitor.answer("yok", "c1", 0)).toEqual({ ok: false, reason: "noAgent" });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("kullanıcı yazıyorsa ya da soru açıldıktan sonra terminalde dokunduysa tuş gönderilmiyor", () => {
    const { clock, deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking(question({ askedAt: clock.ms - 10_000 }));
    monitor.tick();
    monitor.onInput("t1", "yarım");
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: BLOCKED });
    monitor.onInput("t1", "\x1b[B\x15"); // ok tuşu + taslağı sil: imleç yer değiştirmiş olabilir
    clock.ms += TYPING_GUARD_MS + 1;
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: BLOCKED });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("soru açılmadan önceki yazım engel değil", () => {
    const { clock, deps, monitor, reader } = harness();
    monitor.register(reg());
    monitor.onInput("t1", "renk sor\r");
    clock.ms += 10_000;
    reader().current = asking(question({ askedAt: clock.ms - 5_000 }));
    monitor.tick();
    const result = monitor.answer("p1", "c1", 0);
    expect(result).toEqual(LIST_ANSWER_ENABLED ? { ok: true } : { ok: false, reason: "notAnswerable" });
    if (LIST_ANSWER_ENABLED) expect(deps.write).toHaveBeenCalledWith("t1", "\r");
  });

  it("çok seçimli ve aralık dışı dizin listeden cevaplanmıyor; yazılamazsa writeFailed", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking(question({ multiSelect: true }));
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: "notAnswerable" });
    reader().current = asking();
    expect(monitor.answer("p1", "c1", 5)).toEqual({ ok: false, reason: "notAnswerable" });
    expect(monitor.answer("p1", "c1", -1)).toEqual({ ok: false, reason: "notAnswerable" });
    deps.write.mockReturnValue(false);
    expect(monitor.answer("p1", "c1", 0)).toEqual({ ok: false, reason: LIST_ANSWER_ENABLED ? "writeFailed" : "notAnswerable" });
  });

  it("terminalden cevaplanan karar günlüğe 'terminal' olarak düşüyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    reader().current = asking();
    monitor.tick();
    reader().current = runningExact;
    monitor.tick();
    expect(deps.log).toHaveBeenCalledWith("ajan.karar", { motor: "axet-code", yol: "terminal" });
  });

  it("günlüğe soru, seçenek ya da yazılan metin girmiyor", () => {
    const { deps, monitor, reader } = harness();
    monitor.register(reg());
    monitor.onInput("t1", "Gizli müşteri verisi\r");
    reader().current = asking(question({ question: "Gizli soru?", options: ["Gizli A", "Gizli B"] }));
    monitor.tick();
    monitor.answer("p1", "c1", 1);
    reader().current = { state: "idle", source: "exact", lastActivity: 9 };
    monitor.tick();
    expect(JSON.stringify(deps.log.mock.calls)).not.toMatch(/Gizli/);
  });
});

describe("readAgentRegistration", () => {
  it("geçerli kayıt okunuyor; bozuk alanlar reddediliyor", () => {
    expect(readAgentRegistration(reg())).toEqual(reg());
    expect(readAgentRegistration(null)).toBeNull();
    expect(readAgentRegistration({ ...reg(), engine: "bash" })).toBeNull();
    expect(readAgentRegistration({ ...reg(), paneId: "" })).toBeNull();
    expect(readAgentRegistration({ ...reg(), cwd: "  " })).toBeNull();
    expect(readAgentRegistration({ ...reg(), roleKind: "x", sap: "evet", added: 1 })).toMatchObject({ roleKind: "custom", sap: false, added: false });
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentMonitor.test.ts tests/agentNotification.test.ts`
Expected: FAIL — modüller bulunamıyor.

- [ ] **Step 3: Uygula**

`app-electron/main/agentNotification.ts`:

```ts
// Ajan bildirimi: SAF karar (spec 2026-10-17 ajan-alani §9). Electron'a
// dokunmuyor; gerçek bildirim index.ts'te. Gövde sabit: soru metni ya da
// ajanın yazdığı hiçbir şey bildirime girmiyor. "Yalnız kesin durumda"
// kuralı izleyicide (agentMonitor.ts): tahmini durum buraya hiç gelmiyor.

export type AgentNotificationKind = "asking" | "done";

export interface AgentNotificationPayload {
  title: string;
  body: string;
}

const BODY: Record<"tr" | "en", Record<AgentNotificationKind, string>> = {
  tr: { asking: "Ajan bir soru soruyor", done: "Ajan işini bitirdi" },
  en: { asking: "The agent is asking a question", done: "The agent finished its work" }
};

export function agentNotificationFor(
  kind: AgentNotificationKind,
  focused: boolean,
  enabled: boolean,
  agentName: string,
  lang: "tr" | "en" = "tr"
): AgentNotificationPayload | null {
  if (focused || !enabled) return null;
  return { title: agentName.trim() || "NTT Studio", body: BODY[lang][kind] };
}
```

`app-electron/main/agentMonitor.ts`:

```ts
// Ajan Alanı'nın ana süreç izleyicisi (spec 2026-10-17 ajan-alani §6, §7,
// §9, §11). Her ajan bölmesi için bir okuyucu tutuyor; terminal çıktısını ve
// yazılan tuşları ona veriyor, saniyede bir yokluyor, durum DEĞİŞİNCE
// renderer'a gönderiyor.
//
// Kurallar:
//   - Hiçbir yol hata fırlatmıyor (ana süreçte yakalanmamış istisna yok).
//   - Bildirim yalnız KESİN durumda: tahmini "bitti" yanlış alarm olurdu.
//   - Günlüğe yalnız etiket ve kısa alanlar; soru, seçenek, yazılan metin asla.
//   - Kararlar cevabı, soru hâlâ açıksa VE kullanıcı o soruya terminalde
//     dokunmadıysa gönderiliyor: dokunduysa imleç yer değiştirmiş olabilir,
//     `↓ × i` yanlış seçeneği onaylardı.
import { isListAnswerable, optionKeys } from "../shared/agentDecisions";
import {
  isAgentEngineId,
  type AgentAnswerResult,
  type AgentRegistration,
  type AgentRoleKind,
  type AgentStatus,
  type AgentStatusEvent
} from "../shared/agentTypes";
import { InputLineBuffer } from "./agentInput";
import type { AgentReader } from "./agentGenericReader";
import type { AgentNotificationKind } from "./agentNotification";

/** Son tuştan bu kadar süre geçmeden listeden cevap gönderilmiyor. */
export const TYPING_GUARD_MS = 2_000;

export type LogFields = Record<string, string | number | boolean>;

export interface MonitorDeps {
  now(): number;
  createReader(reg: AgentRegistration): AgentReader;
  emit(event: AgentStatusEvent): void;
  notify(kind: AgentNotificationKind, reg: AgentRegistration): void;
  write(ptyId: string, data: string): boolean;
  /** Kayıttan önce bölmeye düşmüş çıktı (komut yankısı kaçmasın). */
  backlog(ptyId: string): string;
  log(tag: string, fields: LogFields): void;
}

export interface AgentMonitor {
  register(reg: AgentRegistration): void;
  unregister(paneId: string): void;
  onOutput(ptyId: string, data: string): void;
  onInput(ptyId: string, data: string): void;
  onExit(ptyId: string): void;
  tick(): void;
  answer(paneId: string, callId: string, index: number): AgentAnswerResult;
  snapshot(): AgentStatusEvent[];
  dispose(): void;
}

interface Entry {
  reg: AgentRegistration;
  reader: AgentReader;
  input: InputLineBuffer;
  lastInputAt: number;
  last: AgentStatus | null;
  /** Listeden cevaplanan soru kimlikleri: kapanınca "terminal" yazılmasın. */
  listAnswered: Set<string>;
}

const SOURCE_LOG = { exact: "kesin", estimated: "tahmini" } as const;

/** Çalışırken son etkinlik sürekli değişiyor; o yüzden karşılaştırmaya girmiyor. */
function sameStatus(a: AgentStatus, b: AgentStatus): boolean {
  if (a.state !== b.state || a.source !== b.source || a.detail !== b.detail) return false;
  if (a.question?.callId !== b.question?.callId) return false;
  return a.state === "running" || a.lastActivity === b.lastActivity;
}

export function createAgentMonitor(deps: MonitorDeps): AgentMonitor {
  const byPane = new Map<string, Entry>();
  const paneOfPty = new Map<string, string>();

  const guard = (fn: () => void): void => {
    try {
      fn();
    } catch {
      // İzleyici hatası ana süreci düşürmesin (spec §10).
    }
  };

  const entryOfPty = (ptyId: string): Entry | undefined => {
    const paneId = paneOfPty.get(ptyId);
    return paneId ? byPane.get(paneId) : undefined;
  };

  function evaluate(entry: Entry): void {
    const next = entry.reader.status();
    const prev = entry.last;
    if (prev && sameStatus(prev, next)) return;
    entry.last = next;
    const motor = entry.reg.engine;
    deps.emit({ paneId: entry.reg.paneId, status: next });
    if (!prev || prev.state !== next.state || prev.source !== next.source) {
      deps.log("ajan.durum", { motor, durum: next.state, kaynak: SOURCE_LOG[next.source] });
    }
    if (next.source === "exact") {
      const newQuestion = next.state === "asking" && (prev?.state !== "asking" || prev.question?.callId !== next.question?.callId);
      if (newQuestion) deps.notify("asking", entry.reg);
      const finishedWork =
        (next.state === "idle" || next.state === "finished") && prev?.state === "running" && prev.source === "exact";
      if (finishedWork) deps.notify("done", entry.reg);
    }
    const closedId = prev?.state === "asking" ? prev.question?.callId : undefined;
    const stillOpen = next.state === "asking" && next.question?.callId === closedId;
    if (closedId && !stillOpen && !entry.listAnswered.delete(closedId)) {
      deps.log("ajan.karar", { motor, yol: "terminal" });
    }
  }

  function unregister(paneId: string): void {
    const entry = byPane.get(paneId);
    if (!entry) return;
    byPane.delete(paneId);
    if (paneOfPty.get(entry.reg.ptyId) === paneId) paneOfPty.delete(entry.reg.ptyId);
    guard(() => entry.reader.dispose());
  }

  function register(reg: AgentRegistration): void {
    guard(() => {
      unregister(reg.paneId);
      const entry: Entry = {
        reg,
        reader: deps.createReader(reg),
        input: new InputLineBuffer(),
        lastInputAt: 0,
        last: null,
        listAnswered: new Set()
      };
      byPane.set(reg.paneId, entry);
      paneOfPty.set(reg.ptyId, reg.paneId);
      if (reg.added) {
        deps.log("ajan.eklendi", {
          motor: reg.engine,
          rol: reg.roleKind === "custom" ? "serbest" : "hazir",
          sap: reg.sap ? "evet" : "hayir"
        });
      }
      const backlog = deps.backlog(reg.ptyId);
      if (backlog) entry.reader.feedOutput(backlog);
      evaluate(entry);
    });
  }

  function answer(paneId: string, callId: string, index: number): AgentAnswerResult {
    const entry = byPane.get(paneId);
    if (!entry) return { ok: false, reason: "noAgent" };
    try {
      // Yeniden doğrula: soru aynı anda terminalden cevaplanmış olabilir (spec §7).
      entry.reader.poll();
      const status = entry.reader.status();
      const question = status.question;
      if (status.state !== "asking" || !question || question.callId !== callId) {
        evaluate(entry);
        return { ok: false, reason: "closed" };
      }
      if (!isListAnswerable(question) || !Number.isInteger(index) || index < 0 || index >= question.options.length) {
        return { ok: false, reason: "notAnswerable" };
      }
      // `askedAt` saniye çözünürlüklü: 1 sn pay, şüphede gönderme.
      const touched = entry.lastInputAt > 0 && entry.lastInputAt >= question.askedAt - 1_000;
      if (entry.input.hasDraft() || touched || deps.now() - entry.lastInputAt < TYPING_GUARD_MS) {
        return { ok: false, reason: "typing" };
      }
      if (!deps.write(entry.reg.ptyId, optionKeys(index))) return { ok: false, reason: "writeFailed" };
      entry.listAnswered.add(callId);
      deps.log("ajan.karar", { motor: entry.reg.engine, yol: "liste" });
      return { ok: true };
    } catch {
      return { ok: false, reason: "writeFailed" };
    }
  }

  return {
    register,
    unregister,
    onOutput(ptyId, data) {
      const entry = entryOfPty(ptyId);
      if (entry) guard(() => entry.reader.feedOutput(data));
    },
    onInput(ptyId, data) {
      const entry = entryOfPty(ptyId);
      if (!entry) return;
      entry.lastInputAt = deps.now();
      guard(() => {
        for (const line of entry.input.feed(data)) entry.reader.submitLine(line);
      });
    },
    onExit(ptyId) {
      const paneId = paneOfPty.get(ptyId);
      if (paneId) unregister(paneId);
    },
    tick() {
      for (const entry of [...byPane.values()]) {
        guard(() => entry.reader.poll());
        guard(() => evaluate(entry));
      }
    },
    answer,
    snapshot() {
      const out: AgentStatusEvent[] = [];
      for (const entry of byPane.values()) if (entry.last) out.push({ paneId: entry.reg.paneId, status: entry.last });
      return out;
    },
    dispose() {
      for (const paneId of [...byPane.keys()]) unregister(paneId);
    }
  };
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Renderer'dan gelen kaydı doğrular; bozuksa null (IPC işleyicisi yok sayar). */
export function readAgentRegistration(raw: unknown): AgentRegistration | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const paneId = text(record.paneId, 100);
  const ptyId = text(record.ptyId, 100);
  const cwd = text(record.cwd, 1_000);
  if (!paneId || !ptyId || !isAgentEngineId(record.engine) || !cwd.trim()) return null;
  const roleKind: AgentRoleKind = record.roleKind === "preset" || record.roleKind === "axetAgent" ? record.roleKind : "custom";
  return {
    paneId,
    ptyId,
    engine: record.engine,
    cwd,
    command: text(record.command, 400),
    name: text(record.name, 60),
    roleKind,
    sap: record.sap === true,
    added: record.added === true
  };
}
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/agentMonitor.test.ts tests/agentNotification.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add app-electron/main/agentMonitor.ts app-electron/main/agentNotification.ts tests/agentMonitor.test.ts tests/agentNotification.test.ts
git commit -m "Ajan Alani: izleyici, Kararlar cevabi ve bildirim karari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Ana süreç bağlantısı — IPC, zamanlayıcı, terminal dinleyicisi, bildirim

**Files:**
- Modify: `app-electron/main/index.ts`
- Modify: `app-electron/preload/index.ts`, `src/window.d.ts`
- Test: `tests/agentIpcWiring.test.ts` (genişler)

**Interfaces:**
- Consumes: Task 5 `setTerminalTap`, `writeTerminal` (boolean), `getTerminalBuffer`; Task 7 `createAgentReader`, `liveAxetDbPort`, `createSessionRegistry`; Task 8 `createAgentMonitor`, `readAgentRegistration`, `agentNotificationFor`.
- Produces (renderer'ın kullandığı):

```ts
window.api.agentRegister(reg: AgentRegistration): Promise<void>;                 // "agents:register"
window.api.agentUnregister(paneId: string): Promise<void>;                       // "agents:unregister"
window.api.agentAnswer(paneId: string, callId: string, index: number): Promise<AgentAnswerResult>; // "agents:answer"
window.api.agentSnapshot(): Promise<AgentStatusEvent[]>;                         // "agents:snapshot"
window.api.onAgentStatus(cb: (event: AgentStatusEvent) => void): () => void;     // "agents:status"
window.api.onAgentOpen(cb: (paneId: string) => void): () => void;                // "agents:open" (bildirim tıklaması)
```

- [ ] **Step 1: Kırmızı test** — `tests/agentIpcWiring.test.ts`'e yeni describe:

```ts
describe("Ajan Alanı — izleyici bağlantısı", () => {
  it("izleyici kanalları ana süreçte, preload'da ve tiplerde", () => {
    for (const channel of ["agents:register", "agents:unregister", "agents:answer", "agents:snapshot", "agents:status", "agents:open"]) {
      expect(main, channel).toContain(`"${channel}"`);
      expect(preload, channel).toContain(`"${channel}"`);
    }
    for (const name of ["agentRegister:", "agentUnregister:", "agentAnswer:", "agentSnapshot:", "onAgentStatus:", "onAgentOpen:"]) {
      expect(types, name).toContain(name);
    }
  });

  it("terminal dinleyicisi kuruluyor; kullanıcı girdisi terminal:write'tan izleyiciye gidiyor", () => {
    expect(main).toContain("setTerminalTap(");
    expect(main).toMatch(/"terminal:write"[\s\S]{0,400}agentMonitor\.onInput\(/);
  });

  it("zamanlayıcı kuruluyor ve kapanışta iki yerde de durduruluyor", () => {
    expect(main).toMatch(/setInterval\(\s*\(\)\s*=>\s*agentMonitor\.tick\(\)/);
    // Tanım + window-all-closed + before-quit.
    expect(main.match(/stopAgentMonitor\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("bildirim tıklaması ajan bölmesini açıyor, ayar chatNotifications", () => {
    expect(main).toMatch(/function showAgentNotification[\s\S]*chatNotifications !== false[\s\S]*"agents:open"/);
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentIpcWiring.test.ts`
Expected: FAIL — kanallar yok.

- [ ] **Step 3: Ana süreç** — `app-electron/main/index.ts`

İçe aktarımlar:
- `terminalManager` satırını: `import { createTerminal, writeTerminal, resizeTerminal, disposeTerminal, disposeAllTerminals, getTerminalBuffer, setTerminalTap } from "./terminalManager";`
- Yeni satırlar:

```ts
import { createAgentMonitor, readAgentRegistration } from "./agentMonitor";
import { agentNotificationFor, type AgentNotificationKind } from "./agentNotification";
import { createAgentReader, liveAxetDbPort } from "./agentReaders";
import { createSessionRegistry } from "./agentAxetReader";
```

`showChatNotification` fonksiyonunun hemen altına:

```ts
// Ajan Alanı bildirimi (spec 2026-10-17 ajan-alani §9). Sohbet bildirimiyle
// aynı ayar (`chatNotifications`) ve aynı yaşam döngüsü; tıklayınca Ajanlar
// ekranı ve o ajanın bölmesi açılıyor. Gövde sabit, içerik yok.
function showAgentNotification(paneId: string, agentName: string, kind: AgentNotificationKind): void {
  try {
    if (!Notification.isSupported()) return;
    const cfg = loadConfig();
    const isFocusedAndVisible = (mainWindow?.isFocused() ?? false) && !(mainWindow?.isMinimized() ?? true);
    const lang = cfg.language === "en" ? "en" : "tr";
    const payload = agentNotificationFor(kind, isFocusedAndVisible, cfg.chatNotifications !== false, agentName, lang);
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
      mainWindow.webContents.send("agents:open", paneId);
    });
    n.show();
  } catch {
    // Ana süreçte yakalanmamış istisna bırakılmamalı.
  }
}

// Ajan izleyicisi (spec 2026-10-17 ajan-alani §6). Modül düzeyinde tek örnek;
// zamanlayıcı registerIpc'de kuruluyor, kapanışta duruyor.
const agentSessions = createSessionRegistry();
const agentMonitor = createAgentMonitor({
  now: () => Date.now(),
  createReader: (reg) =>
    createAgentReader(reg, {
      now: () => Date.now(),
      port: liveAxetDbPort,
      registry: agentSessions,
      onMatch: (r, sonuc) => appLog("ajan.eslesme", { motor: r.engine, sonuc })
    }),
  emit: (event) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("agents:status", event);
  },
  notify: (kind, reg) => showAgentNotification(reg.paneId, reg.name, kind),
  write: (ptyId, data) => writeTerminal(ptyId, data),
  backlog: (ptyId) => getTerminalBuffer(ptyId).slice(-4_000),
  log: (tag, fields) => appLog(tag, fields)
});
let agentMonitorTimer: NodeJS.Timeout | null = null;

function stopAgentMonitor(): void {
  if (agentMonitorTimer) clearInterval(agentMonitorTimer);
  agentMonitorTimer = null;
  agentMonitor.dispose();
}
```

(`appLog` index.ts'te zaten içe aktarılıyor: `import { appLog, appLogPath } from "./appLog";`.)

`registerIpc()` içinde `terminal:write` işleyicisini değiştir:

```ts
  ipcMain.on("terminal:write", (_event, id: string, data: string) => {
    // Kullanıcının tuşları ajan izleyicisine (istem eşleme, "yazıyor" kilidi);
    // izleyicinin kendi yazdıkları (Kararlar cevabı) buradan geçmiyor.
    agentMonitor.onInput(id, data);
    writeTerminal(id, data);
  });
```

Task 3'te eklenen `agents:which` işleyicisinin altına:

```ts
  setTerminalTap({
    onOutput: (id, data) => agentMonitor.onOutput(id, data),
    onExit: (id) => agentMonitor.onExit(id)
  });
  if (!agentMonitorTimer) {
    agentMonitorTimer = setInterval(() => agentMonitor.tick(), 1_000);
  }

  ipcMain.handle("agents:register", (_event, raw: unknown) => {
    const reg = readAgentRegistration(raw);
    if (reg) agentMonitor.register(reg);
  });

  ipcMain.handle("agents:unregister", (_event, paneId: unknown) => {
    if (typeof paneId === "string") agentMonitor.unregister(paneId);
  });

  ipcMain.handle("agents:answer", (_event, paneId: unknown, callId: unknown, index: unknown) =>
    typeof paneId === "string" && typeof callId === "string" && typeof index === "number"
      ? agentMonitor.answer(paneId, callId, index)
      : { ok: false, reason: "notAnswerable" }
  );

  ipcMain.handle("agents:snapshot", () => agentMonitor.snapshot());
```

`app.on("window-all-closed", …)` ve `app.on("before-quit", …)` gövdelerinde `disposeAllTerminals();` satırının hemen ÖNÜNE `stopAgentMonitor();`.

- [ ] **Step 4: Preload ve tipler**

`app-electron/preload/index.ts` — `import type { AgentEngineInfo, AxetAgentEntry } …` satırını `import type { AgentAnswerResult, AgentEngineInfo, AgentRegistration, AgentStatusEvent, AxetAgentEntry } from "../shared/agentTypes";` yap; `agentWhich` satırının altına:

```ts
  agentRegister: (reg: AgentRegistration): Promise<void> => ipcRenderer.invoke("agents:register", reg),
  agentUnregister: (paneId: string): Promise<void> => ipcRenderer.invoke("agents:unregister", paneId),
  agentAnswer: (paneId: string, callId: string, index: number): Promise<AgentAnswerResult> =>
    ipcRenderer.invoke("agents:answer", paneId, callId, index),
  agentSnapshot: (): Promise<AgentStatusEvent[]> => ipcRenderer.invoke("agents:snapshot"),
  onAgentStatus: (callback: (event: AgentStatusEvent) => void) => {
    const listener = (_event: unknown, event: AgentStatusEvent) => callback(event);
    ipcRenderer.on("agents:status", listener);
    return () => ipcRenderer.removeListener("agents:status", listener);
  },
  // Ajan bildirimine tıklanınca (spec §9): Ajanlar ekranı ve o bölme.
  onAgentOpen: (callback: (paneId: string) => void) => {
    const listener = (_event: unknown, paneId: string) => callback(paneId);
    ipcRenderer.on("agents:open", listener);
    return () => ipcRenderer.removeListener("agents:open", listener);
  },
```

`src/window.d.ts` — içe aktarımı `import type { AgentAnswerResult, AgentEngineInfo, AgentRegistration, AgentStatusEvent, AxetAgentEntry } from "../app-electron/shared/agentTypes";` yap; `agentWhich` satırının altına:

```ts
  agentRegister: (reg: AgentRegistration) => Promise<void>;
  agentUnregister: (paneId: string) => Promise<void>;
  agentAnswer: (paneId: string, callId: string, index: number) => Promise<AgentAnswerResult>;
  agentSnapshot: () => Promise<AgentStatusEvent[]>;
  onAgentStatus: (callback: (event: AgentStatusEvent) => void) => () => void;
  onAgentOpen: (callback: (paneId: string) => void) => () => void;
```

- [ ] **Step 5: Yeşili gör**

Run: `npx vitest run tests/agentIpcWiring.test.ts tests/ipcSenderGuard.test.ts tests/notificationIpc.test.tsx tests/appTerminalWiring.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 6: Commit**

```bash
git add app-electron/main/index.ts app-electron/preload/index.ts src/window.d.ts tests/agentIpcWiring.test.ts
git commit -m "Ajan Alani: ana surec baglantisi (izleyici IPC, zamanlayici, bildirim)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Motor denetimi ve izleyiciye kayıt (renderer deposu)

**Files:**
- Modify: `src/stores/terminalStore.tsx`
- Modify: `src/terminal/TerminalPaneView.tsx` ("kurulu değil" metni)
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/terminalStore.test.tsx`, `tests/terminalPaneView.test.tsx`

**Interfaces:**
- Consumes: Task 2 `AGENT_ENGINE_MISSING`, `engineBinary`, `AgentEngineInfo`; Task 3 `window.api.agentEngines`, `agentWhich`; Task 4 `ENGINE_LABEL`, `addAgent`; Task 9 `window.api.agentRegister`, `agentUnregister`.
- Produces: davranış — ajan bölmesi motor bilgisi gelmeden başlamıyor; `blocked` motor ya da PATH'te olmayan özel komut → `spawnFailed(message = AGENT_ENGINE_MISSING)`, kabuk açılmıyor; başarılı başlatmada `agentRegister({ …, added })` (yalnız "+ Ajan"dan sonraki ilk başlatmada `added: true`); bölme kapanınca/yeniden başlayınca `agentUnregister(paneId)`.

- [ ] **Step 1: Kırmızı testler**

`tests/terminalStore.test.tsx`:
- İçe aktarım: `import { AGENT_ENGINE_MISSING, LEGACY_AXET_AGENT } from "../app-electron/shared/agentTypes";` (Task 4'teki `LEGACY_AXET_AGENT` satırını bununla birleştir).
- `beforeEach`'teki `api` nesnesine:

```ts
    agentEngines: vi.fn(async () => [] as unknown[]),
    agentWhich: vi.fn(async () => true),
    agentRegister: vi.fn(async () => {}),
    agentUnregister: vi.fn(async () => {}),
```

- Dosyanın sonuna:

```ts
describe("motor denetimi ve izleyici kaydı (spec 2026-10-17 ajan-alani §3, §6, §10)", () => {
  it("kurulu olmayan motor: kabuk açılmıyor, bölme 'kurulu değil' hatasında", async () => {
    api.agentEngines.mockResolvedValue([{ id: "claude", installed: false, blocked: true }]);
    await ready();
    act(() => store.commands.addAgent({ spec: { engine: "claude", role: "", roleKind: "custom" }, name: "", cwd: "C:\\p" }));
    await flush();
    expect(api.createTerminal).not.toHaveBeenCalled();
    expect(panes()[0].run).toEqual({ state: "failed", message: AGENT_ENGINE_MISSING });
  });

  it("motor listesi gelmeden ajan bekliyor, düz kabuk başlıyor", async () => {
    let resolveEngines: (value: unknown[]) => void = () => {};
    api.agentEngines.mockImplementation(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveEngines = resolve;
        })
    );
    await ready();
    act(() => {
      store.commands.addAgent({ spec: LEGACY_AXET_AGENT, name: "", cwd: "C:\\p" });
      store.commands.addPane("cmd", "C:\\a");
    });
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(1);
    expect(creates[0].initialCommand).toBeUndefined();
    await act(async () => resolveEngines([]));
    await flush();
    expect(api.createTerminal).toHaveBeenCalledTimes(2);
    expect(creates[1].initialCommand).toBe("axet-code -y");
  });

  it("kayıt: ilk başlatmada 'eklendi', yeniden başlatmada değil; ad ve komut gidiyor", async () => {
    await ready();
    act(() => store.commands.addAgent({ spec: LEGACY_AXET_AGENT, name: "Ayşe", cwd: "C:\\p" }));
    await flush();
    await act(async () => creates[0].resolve("pty-1"));
    await flush();
    const paneId = panes()[0].id;
    expect(api.agentRegister).toHaveBeenCalledWith({
      paneId,
      ptyId: "pty-1",
      engine: "axet-code",
      cwd: "C:\\p",
      command: "axet-code -y",
      name: "Ayşe",
      roleKind: "custom",
      sap: false,
      added: true
    });
    act(() => store.commands.restartPane(paneId));
    expect(api.agentUnregister).toHaveBeenCalledWith(paneId);
    await flush();
    await act(async () => creates[1].resolve("pty-2"));
    await flush();
    expect(api.agentRegister).toHaveBeenLastCalledWith(expect.objectContaining({ ptyId: "pty-2", added: false }));
  });

  it("adsız ajanın kaydında motorun adı", async () => {
    await ready();
    act(() => store.commands.addAgent({ spec: { engine: "codex", role: "", roleKind: "custom" }, name: "", cwd: "C:\\p" }));
    await flush();
    await act(async () => creates[0].resolve("pty-c"));
    await flush();
    expect(api.agentRegister).toHaveBeenCalledWith(expect.objectContaining({ name: "Codex", engine: "codex", command: "codex" }));
  });

  it("özel komut PATH'te yoksa açılmıyor", async () => {
    api.agentWhich.mockResolvedValue(false);
    await ready();
    act(() =>
      store.commands.addAgent({ spec: { engine: "ozel", role: "", roleKind: "custom", command: "kiro-cli chat" }, name: "", cwd: "C:\\p" })
    );
    await flush();
    expect(api.agentWhich).toHaveBeenCalledWith("kiro-cli");
    expect(api.createTerminal).not.toHaveBeenCalled();
    expect(panes()[0].run).toEqual({ state: "failed", message: AGENT_ENGINE_MISSING });
  });

  it("ajan bölmesi kapanınca kayıt siliniyor; kabuk bölmesi kaydedilmiyor", async () => {
    await ready();
    act(() => {
      store.commands.addAgent({ spec: LEGACY_AXET_AGENT, name: "", cwd: "C:\\p" });
      store.commands.addPane("cmd", "C:\\a");
    });
    await flush();
    await act(async () => {
      creates[0].resolve("pty-a");
      creates[1].resolve("pty-c");
    });
    await flush();
    expect(api.agentRegister).toHaveBeenCalledTimes(1);
    const agentPane = panes().find((p) => p.kind === "agent")!;
    act(() => store.commands.closePane(agentPane.id));
    expect(api.agentUnregister).toHaveBeenCalledWith(agentPane.id);
  });
});
```

`tests/terminalPaneView.test.tsx` — içe aktarıma `AGENT_ENGINE_MISSING` ekle; describe içine:

```ts
  it("motoru kurulu olmayan ajan bölmesi 'kurulu değil' diyor", () => {
    renderPane({ state: "failed", message: AGENT_ENGINE_MISSING }, { kind: "agent", agent: { engine: "claude", role: "", roleKind: "custom" } });
    expect(screen.getByText("Bu ajanın motoru bu bilgisayarda kurulu değil. Kurup ↻ ile yeniden başlatın.")).toBeTruthy();
  });
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/terminalStore.test.tsx tests/terminalPaneView.test.tsx`
Expected: FAIL — createTerminal kurulu olmayan motorda çağrılıyor; `agentRegister` çağrılmıyor; metin yok.

- [ ] **Step 3: Uygula** — `src/stores/terminalStore.tsx`

İçe aktarımlar:

```ts
import { buildAgentCommand, engineBinary } from "../../app-electron/shared/agentEngines";
import { AGENT_ENGINE_MISSING, LEGACY_AXET_AGENT, type AgentEngineInfo, type AgentSpec } from "../../app-electron/shared/agentTypes";
import { ENGINE_LABEL } from "../agents/agentLabels";
```

Bileşen gövdesinde, `const stateRef = useRef(state);` bloğunun yakınına:

```ts
  const tRef = useRef(t);
  tRef.current = t;
  /** Kurulu motorlar (spec §3). `null`: henüz bilinmiyor → ajan bölmesi bekliyor. */
  const [engines, setEngines] = useState<AgentEngineInfo[] | null>(null);
  /** "+ Ajan" ile eklenen, henüz kaydı yapılmamış bölmeler (günlükte `ajan.eklendi`). */
  const freshAgents = useRef(new Set<string>());
```

`useEffect(() => { dispatch({ type: "setVisible", visible }); }, [visible]);` bloğunun altına:

```ts
  // Motorların kurulu olup olmadığı. Sorulamazsa boş liste: hiçbir motor
  // engellenmiyor (IPC arızası ajanları kilitlemesin; kabuk zaten hata söyler).
  useEffect(() => {
    if (!cleaned) return;
    let alive = true;
    window.api.agentEngines().then(
      (list) => {
        if (alive) setEngines(list);
      },
      () => {
        if (alive) setEngines([]);
      }
    );
    return () => {
      alive = false;
    };
  }, [cleaned]);
```

"2. Başlatma" etkisini tümüyle şununla değiştir:

```ts
  // 2. Başlatma.
  useEffect(() => {
    if (!cleaned || !config) return;
    for (const pane of nextToStart(state, SPAWN_CONCURRENCY, bootingAxetCount)) {
      if (spawnTokens.current.has(pane.id)) continue;
      // Motorların kurulu olup olmadığı bilinmeden ajan başlamıyor.
      if (pane.kind === "agent" && engines === null) continue;
      const token = ++spawnSeq.current;
      spawnTokens.current.set(pane.id, token);
      dispatch({ type: "spawnStarted", paneId: pane.id, token });
      // Ajan bölmesi seçilen kabukta açılıyor, motorun komutu ilk satır
      // (spec 2026-10-17 ajan-alani §5): motor kapansa da bölme kabukta kalır.
      const spec: AgentSpec | null = pane.kind === "agent" ? (pane.agent ?? LEGACY_AXET_AGENT) : null;
      const isAgent = spec !== null;
      const shell: TerminalMode = pane.kind === "agent" ? config.terminal : pane.kind;
      const command = spec ? buildAgentCommand(spec, config.axetCommand || "") : undefined;

      const fail = (message: string) => {
        if (spawnTokens.current.get(pane.id) !== token) return;
        spawnTokens.current.delete(pane.id);
        dispatch({ type: "spawnFailed", paneId: pane.id, token, message, missingDir: message.includes(TERMINAL_MISSING_DIR) });
      };

      const register = (ptyId: string) => {
        if (!spec) return;
        const owner = findPane(stateRef.current, pane.id);
        void window.api
          .agentRegister({
            paneId: pane.id,
            ptyId,
            engine: spec.engine,
            cwd: pane.cwd,
            command: command ?? "",
            name: pane.title ?? tRef.current(ENGINE_LABEL[spec.engine]),
            roleKind: spec.roleKind,
            sap: Boolean(owner?.workspace.sap),
            added: freshAgents.current.delete(pane.id)
          })
          .catch(() => {});
      };

      const launch = () => {
        window.api.createTerminal(pane.cwd, INITIAL_COLS, INITIAL_ROWS, shell, command, { createDir: false }).then(
          (ptyId) => {
            if (spawnTokens.current.get(pane.id) !== token) {
              void window.api.disposeTerminal(ptyId).catch(() => {});
              return;
            }
            spawnTokens.current.delete(pane.id);
            ptyOwners.current.set(ptyId, pane.id);
            dispatch({ type: "spawnSucceeded", paneId: pane.id, token, ptyId });
            const code = earlyExits.current.get(ptyId);
            const readyEarly = earlyReady.current.delete(ptyId);
            if (code !== undefined) {
              // Süreç çoktan kapandı: başlangıç kipi de yuva da tutulmuyor.
              earlyExits.current.delete(ptyId);
              dispatch({ type: "ptyExit", ptyId, code });
              return;
            }
            register(ptyId);
            // Başlangıç kipi: bu sürede çıktı okunmadı işareti koymaz (spec §4).
            if (isAgent && readyEarly) return; // ajan zaten hazır; yuva tutulmuyor
            startupPtyIds.current.add(ptyId);
            if (isAgent) {
              // Ajan için terminal:ready gelene kadar yuva meşgul kalıyor (spec §5.1).
              bootingAxetPtyIds.current.add(ptyId);
              setBootingAxetCount((c) => c + 1);
            } else {
              // cmd/powershell için STARTUP_GRACE_MS sonra başlangıç kipi biter.
              setTimeout(() => startupPtyIds.current.delete(ptyId), STARTUP_GRACE_MS);
            }
          },
          (error: unknown) => fail(ipcMessage(error))
        );
      };

      // Kurulu olmayan (ya da bozuk) motor: kabuk açılmıyor (spec §10).
      if (spec && engines?.some((e) => e.id === spec.engine && e.blocked)) {
        fail(AGENT_ENGINE_MISSING);
        continue;
      }
      // Özel komut ajan başına farklı: ilk parçası PATH'te aranıyor.
      if (spec?.engine === "ozel") {
        window.api.agentWhich(engineBinary(spec) ?? "").then(
          (found) => (found ? launch() : fail(AGENT_ENGINE_MISSING)),
          () => launch()
        );
        continue;
      }
      launch();
    }
  }, [state, cleaned, config, bootingAxetCount, engines]);
```

`commands` içinde `release`'e, `if (!ptyId) return;` satırından ÖNCE:

```ts
      if (pane.kind === "agent") void window.api.agentUnregister(pane.id).catch(() => {});
```

`addAgent` komutunda `dispatch` öncesine bölme kimliğini değişkene al ve kaydet:

```ts
      addAgent: (input, split) => {
        const workspaceId = stateRef.current.activeWorkspaceId;
        if (!workspaceId) return;
        const paneId = crypto.randomUUID();
        freshAgents.current.add(paneId);
        dispatch({
          type: "addPane",
          workspaceId,
          paneId,
          kind: "agent",
          cwd: input.cwd,
          split,
          agent: input.spec,
          title: input.name,
          color: input.color
        });
      },
```

`src/terminal/TerminalPaneView.tsx`:
- İçe aktarım: `import { AGENT_ENGINE_MISSING } from "../../app-electron/shared/agentTypes";`
- `run.state === "failed"` bloğundaki metin:

```tsx
            <span className="break-all">
              {run.message === AGENT_ENGINE_MISSING ? t("agents.engineMissing") : t("terminal.failed", { message: run.message })}
            </span>
```

`src/i18n/tr.ts` (agents bloğunun sonuna): `"agents.engineMissing": "Bu ajanın motoru bu bilgisayarda kurulu değil. Kurup ↻ ile yeniden başlatın."`
`src/i18n/en.ts`: `"agents.engineMissing": "This agent's engine is not installed on this computer. Install it, then restart with ↻."`

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/terminalStore.test.tsx tests/terminalPaneView.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add src/stores/terminalStore.tsx src/terminal/TerminalPaneView.tsx src/i18n/tr.ts src/i18n/en.ts tests/terminalStore.test.tsx tests/terminalPaneView.test.tsx
git commit -m "Ajan Alani: motor denetimi ve izleyiciye kayit (renderer)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Durum aboneliği ve saf görünüm yardımcıları

**Files:**
- Create: `src/agents/agentStatusContext.tsx`
- Create: `src/agents/agentView.ts`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/agentView.test.ts`, `tests/agentStatusContext.test.tsx`

**Interfaces:**
- Consumes: Task 2 türleri, `isListAnswerable`; Task 9 `window.api.onAgentStatus`, `agentSnapshot`, `agentAnswer`; Task 3 `agentEngines`.
- Produces:

```ts
// agentStatusContext.tsx
export interface AgentStatusValue {
  statuses: Record<string, AgentStatus>;
  engines: AgentEngineInfo[] | null;
  now: number;
  answer: (paneId: string, callId: string, index: number) => Promise<AgentAnswerResult>;
}
export const AgentStatusContext: React.Context<AgentStatusValue>;   // varsayılan: boş (sağlayıcısız testler çalışsın)
export function useAgentStatuses(): AgentStatusValue;
export const NOW_TICK_MS = 30_000;
export function AgentStatusProvider(props: { children: ReactNode }): JSX.Element;
// agentView.ts
export type StatusTone = "success" | "warning" | "danger" | "muted";
export const TONE_DOT: Record<StatusTone, string>;
export function statusText(status: AgentStatus | undefined, now: number): { key: TranslationKey; params?: { min: number } };
export function statusTone(state: AgentState | undefined): StatusTone;
export interface CardStatus { key: TranslationKey; params?: { min: number }; tone: StatusTone; estimated: boolean; restartable: boolean }
export function cardStatus(pane: TerminalPane, status: AgentStatus | undefined, now: number): CardStatus;
export function agentPanes(workspace: TerminalWorkspace): TerminalPane[];
export function askingCount(workspace: TerminalWorkspace, statuses: Record<string, AgentStatus>): number;
export interface DecisionRow { paneId: string; workspaceId: string; pane: TerminalPane; question: AgentQuestion; answerable: boolean }
export function decisionsOf(workspaces: TerminalWorkspace[], statuses: Record<string, AgentStatus>): DecisionRow[];
```

- [ ] **Step 1: Kırmızı testler**

`tests/agentView.test.ts`:

```ts
// Ajan kartı, durum metni ve Kararlar listesi: saf yardımcılar (spec 2026-10-17 ajan-alani §4, §7).
import { describe, expect, it } from "vitest";
import { askingCount, cardStatus, decisionsOf, statusText, statusTone } from "../src/agents/agentView";
import { AGENT_ENGINE_MISSING, LEGACY_AXET_AGENT, type AgentQuestion, type AgentStatus } from "../app-electron/shared/agentTypes";
import { LIST_ANSWER_ENABLED } from "../app-electron/shared/agentDecisions";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";

const pane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: LEGACY_AXET_AGENT,
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  ...over
});
const ws = (id: string, panes: TerminalPane[]): TerminalWorkspace => ({
  id,
  name: id,
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
});
const q = (callId: string, askedAt: number, over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId,
  question: "?",
  header: "",
  options: ["A", "B"],
  multiSelect: false,
  askedAt,
  ...over
});
const asking = (question: AgentQuestion, source: AgentStatus["source"] = "exact"): AgentStatus => ({
  state: "asking",
  source,
  lastActivity: question.askedAt,
  question
});
const NOW = 10_000_000;

describe("statusText ve statusTone", () => {
  it("durum yoksa bilinmiyor; boşta süresi dakikayla", () => {
    expect(statusText(undefined, NOW)).toEqual({ key: "agents.stateUnknown" });
    expect(statusText({ state: "idle", source: "exact", lastActivity: NOW - 30_000 }, NOW)).toEqual({ key: "agents.stateIdle" });
    expect(statusText({ state: "idle", source: "exact", lastActivity: NOW - 3 * 60_000 }, NOW)).toEqual({
      key: "agents.stateIdleFor",
      params: { min: 3 }
    });
    expect(statusText({ state: "asking", source: "exact", lastActivity: 1 }, NOW)).toEqual({ key: "agents.stateAsking" });
  });

  it("renk tonları: çalışıyor yeşil, soru kehribar, hata kırmızı, öteki gri", () => {
    expect(statusTone("running")).toBe("success");
    expect(statusTone("asking")).toBe("warning");
    expect(statusTone("error")).toBe("danger");
    expect(statusTone("idle")).toBe("muted");
    expect(statusTone(undefined)).toBe("muted");
  });
});

describe("cardStatus", () => {
  it("bölme durumu önce gelir: sırada, başlatılıyor, kurulu değil, hata, kapandı", () => {
    expect(cardStatus(pane("a", { run: { state: "queued" } }), undefined, NOW)).toMatchObject({ key: "terminal.queued", tone: "muted" });
    expect(cardStatus(pane("a", { run: { state: "starting", token: 1 } }), undefined, NOW).key).toBe("terminal.starting");
    expect(cardStatus(pane("a", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), undefined, NOW)).toMatchObject({
      key: "agents.notInstalled",
      tone: "danger",
      restartable: true
    });
    expect(cardStatus(pane("a", { run: { state: "failed", message: "x" } }), undefined, NOW).key).toBe("agents.stateError");
    expect(cardStatus(pane("a", { run: { state: "exited", ptyId: "t", code: 0 } }), undefined, NOW)).toMatchObject({
      key: "agents.stateFinished",
      restartable: true
    });
  });

  it("çalışan bölmede izleyicinin durumu; tahmini işaretli; bitti yeniden başlatılabilir", () => {
    expect(cardStatus(pane("a"), { state: "running", source: "estimated", lastActivity: NOW }, NOW)).toEqual({
      key: "agents.stateRunning",
      tone: "success",
      estimated: true,
      restartable: false
    });
    expect(cardStatus(pane("a"), { state: "finished", source: "exact", lastActivity: NOW }, NOW)).toMatchObject({
      estimated: false,
      restartable: true
    });
    expect(cardStatus(pane("a"), undefined, NOW)).toMatchObject({ key: "agents.stateUnknown", estimated: true });
  });
});

describe("decisionsOf ve askingCount", () => {
  it("bütün alanların açık soruları, eskisi önce; listeden cevap yalnız kesin tek seçimlide", () => {
    const workspaces = [ws("w1", [pane("a"), pane("b")]), ws("w2", [pane("c")])];
    const statuses: Record<string, AgentStatus> = {
      a: asking(q("ca", 300)),
      b: asking(q("cb", 100, { multiSelect: true })),
      c: asking(q("cc", 200), "estimated")
    };
    const rows = decisionsOf(workspaces, statuses);
    expect(rows.map((r) => [r.paneId, r.workspaceId, r.answerable])).toEqual([
      ["b", "w1", false],
      ["c", "w2", false],
      ["a", "w1", LIST_ANSWER_ENABLED]
    ]);
  });

  it("kapanmış bölmenin eski sorusu ve kabuk bölmesi listeye girmiyor", () => {
    const workspaces = [
      ws("w1", [pane("a", { run: { state: "exited", ptyId: "t", code: 0 } }), pane("s", { kind: "cmd", agent: undefined })])
    ];
    const statuses = { a: asking(q("ca", 1)), s: asking(q("cs", 2)) };
    expect(decisionsOf(workspaces, statuses)).toEqual([]);
    expect(askingCount(workspaces[0], statuses)).toBe(0);
  });

  it("askingCount yalnız çalışan ajanların sorularını sayıyor", () => {
    const w = ws("w1", [pane("a"), pane("b"), pane("c")]);
    expect(askingCount(w, { a: asking(q("x", 1)), b: { state: "idle", source: "exact", lastActivity: 1 } })).toBe(1);
  });
});
```

`tests/agentStatusContext.test.tsx`:

```tsx
// @vitest-environment jsdom
// Durum aboneliği: olaylar, anlık görüntü, motorlar, cevap (spec 2026-10-17 ajan-alani §4, §7).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { AgentStatusProvider, useAgentStatuses, type AgentStatusValue } from "../src/agents/agentStatusContext";
import type { AgentStatus, AgentStatusEvent } from "../app-electron/shared/agentTypes";

const idle: AgentStatus = { state: "idle", source: "exact", lastActivity: 1 };
const running: AgentStatus = { state: "running", source: "exact", lastActivity: 2 };

let listener: ((event: AgentStatusEvent) => void) | null;
let api: Record<string, ReturnType<typeof vi.fn>>;
let prevApi: unknown;
let value: AgentStatusValue;

function Probe() {
  value = useAgentStatuses();
  return null;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  listener = null;
  api = {
    onAgentStatus: vi.fn((cb: (event: AgentStatusEvent) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
    agentSnapshot: vi.fn(async () => [
      { paneId: "p1", status: idle },
      { paneId: "p2", status: idle }
    ]),
    agentEngines: vi.fn(async () => [{ id: "claude", installed: true, blocked: false }]),
    agentAnswer: vi.fn(async () => ({ ok: true }))
  };
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = api;
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

describe("AgentStatusProvider", () => {
  it("olay ve anlık görüntü birleşiyor; yeni olay eski görüntüyle ezilmiyor; motorlar yükleniyor", async () => {
    render(
      <AgentStatusProvider>
        <Probe />
      </AgentStatusProvider>
    );
    act(() => listener?.({ paneId: "p1", status: running }));
    await flush();
    expect(value.statuses.p1).toEqual(running);
    expect(value.statuses.p2).toEqual(idle);
    expect(value.engines).toEqual([{ id: "claude", installed: true, blocked: false }]);
  });

  it("cevap ana sürece gidiyor; IPC hatası writeFailed oluyor", async () => {
    render(
      <AgentStatusProvider>
        <Probe />
      </AgentStatusProvider>
    );
    await flush();
    expect(await value.answer("p1", "c1", 1)).toEqual({ ok: true });
    expect(api.agentAnswer).toHaveBeenCalledWith("p1", "c1", 1);
    api.agentAnswer.mockRejectedValueOnce(new Error("ipc"));
    expect(await value.answer("p1", "c1", 1)).toEqual({ ok: false, reason: "writeFailed" });
  });

  it("kaldırılınca abonelik bırakılıyor", async () => {
    const r = render(
      <AgentStatusProvider>
        <Probe />
      </AgentStatusProvider>
    );
    await flush();
    r.unmount();
    expect(listener).toBeNull();
  });

  it("sağlayıcı yokken boş değer (sağlayıcısız bileşen testleri çalışsın)", () => {
    render(<Probe />);
    expect(value.statuses).toEqual({});
    expect(value.engines).toBeNull();
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/agentView.test.ts tests/agentStatusContext.test.tsx`
Expected: FAIL — modüller bulunamıyor.

- [ ] **Step 3: Uygula**

`src/agents/agentView.ts`:

```ts
// Ajan kartı, durum metni ve Kararlar listesi: SAF yardımcılar (spec
// 2026-10-17 ajan-alani §4, §7). Renk yalnız durum jetonlarından; lime
// (accent) seçim için ayrılmış, burada kullanılmıyor.
import { isListAnswerable } from "../../app-electron/shared/agentDecisions";
import {
  AGENT_ENGINE_MISSING,
  type AgentQuestion,
  type AgentState,
  type AgentStatus
} from "../../app-electron/shared/agentTypes";
import type { TranslationKey } from "../i18n/tr";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";

export type StatusTone = "success" | "warning" | "danger" | "muted";

export const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-[var(--status-success-text)]",
  warning: "bg-[var(--status-warning-text)]",
  danger: "bg-[var(--status-danger-solid)]",
  muted: "bg-slate-500"
};

const STATE_KEY: Record<AgentState, TranslationKey> = {
  running: "agents.stateRunning",
  idle: "agents.stateIdle",
  asking: "agents.stateAsking",
  finished: "agents.stateFinished",
  error: "agents.stateError",
  unknown: "agents.stateUnknown"
};

export function statusText(status: AgentStatus | undefined, now: number): { key: TranslationKey; params?: { min: number } } {
  if (!status) return { key: "agents.stateUnknown" };
  if (status.state === "idle" && status.lastActivity !== null) {
    const min = Math.floor((now - status.lastActivity) / 60_000);
    if (min >= 1) return { key: "agents.stateIdleFor", params: { min } };
  }
  return { key: STATE_KEY[status.state] };
}

export function statusTone(state: AgentState | undefined): StatusTone {
  if (state === "running") return "success";
  if (state === "asking") return "warning";
  if (state === "error") return "danger";
  return "muted";
}

export interface CardStatus {
  key: TranslationKey;
  params?: { min: number };
  tone: StatusTone;
  estimated: boolean;
  restartable: boolean;
}

/** Kartın durumu: bölme çalışmıyorsa bölmenin hâli, çalışıyorsa izleyicinin. */
export function cardStatus(pane: TerminalPane, status: AgentStatus | undefined, now: number): CardStatus {
  const run = pane.run;
  if (run.state === "queued") return { key: "terminal.queued", tone: "muted", estimated: false, restartable: false };
  if (run.state === "starting") return { key: "terminal.starting", tone: "muted", estimated: false, restartable: false };
  if (run.state === "failed" && run.message === AGENT_ENGINE_MISSING) {
    return { key: "agents.notInstalled", tone: "danger", estimated: false, restartable: true };
  }
  if (run.state === "failed" || run.state === "missingDir") {
    return { key: "agents.stateError", tone: "danger", estimated: false, restartable: true };
  }
  if (run.state === "exited") return { key: "agents.stateFinished", tone: "muted", estimated: false, restartable: true };
  const text = statusText(status, now);
  return {
    key: text.key,
    ...(text.params ? { params: text.params } : {}),
    tone: statusTone(status?.state),
    estimated: (status?.source ?? "estimated") === "estimated",
    restartable: status?.state === "finished"
  };
}

export function agentPanes(workspace: TerminalWorkspace): TerminalPane[] {
  return workspace.panes.filter((p) => p.kind === "agent");
}

/** Kapanmış bölmenin son bilinen durumu bayat: yalnız çalışanlar sayılıyor. */
function liveAgents(workspace: TerminalWorkspace): TerminalPane[] {
  return agentPanes(workspace).filter((p) => p.run.state === "running");
}

export function askingCount(workspace: TerminalWorkspace, statuses: Record<string, AgentStatus>): number {
  return liveAgents(workspace).filter((p) => statuses[p.id]?.state === "asking").length;
}

export interface DecisionRow {
  paneId: string;
  workspaceId: string;
  pane: TerminalPane;
  question: AgentQuestion;
  answerable: boolean;
}

/** Bütün alanlardaki açık sorular, eskisi önce (spec §7). */
export function decisionsOf(workspaces: TerminalWorkspace[], statuses: Record<string, AgentStatus>): DecisionRow[] {
  const rows: DecisionRow[] = [];
  for (const workspace of workspaces) {
    for (const pane of liveAgents(workspace)) {
      const status = statuses[pane.id];
      if (status?.state !== "asking" || !status.question) continue;
      rows.push({
        paneId: pane.id,
        workspaceId: workspace.id,
        pane,
        question: status.question,
        answerable: status.source === "exact" && isListAnswerable(status.question)
      });
    }
  }
  return rows.sort((a, b) => a.question.askedAt - b.question.askedAt);
}
```

`src/agents/agentStatusContext.tsx`:

```tsx
// Ajan durumlarının renderer'daki kopyası (spec 2026-10-17 ajan-alani §4).
// Gerçek tek kaynak ana süreçteki izleyici; burada yalnız son bildirdiği.
// Varsayılan değer boş: sağlayıcısız çizilen bileşenler (testler) çökmüyor.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AgentAnswerResult, AgentEngineInfo, AgentStatus } from "../../app-electron/shared/agentTypes";

export interface AgentStatusValue {
  statuses: Record<string, AgentStatus>;
  engines: AgentEngineInfo[] | null;
  /** "Boşta 3 dk" için saat; NOW_TICK_MS'de bir ilerliyor. */
  now: number;
  answer: (paneId: string, callId: string, index: number) => Promise<AgentAnswerResult>;
}

const EMPTY: AgentStatusValue = {
  statuses: {},
  engines: null,
  now: 0,
  answer: async () => ({ ok: false, reason: "noAgent" })
};

export const AgentStatusContext = createContext<AgentStatusValue>(EMPTY);

export function useAgentStatuses(): AgentStatusValue {
  return useContext(AgentStatusContext);
}

export const NOW_TICK_MS = 30_000;

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({});
  const [engines, setEngines] = useState<AgentEngineInfo[] | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const off = window.api.onAgentStatus((event) => setStatuses((prev) => ({ ...prev, [event.paneId]: event.status })));
    // Yeniden yüklemeden (Ctrl+R) sonra son durumlar; olaydan gelen daha yeni değer ezilmiyor.
    window.api.agentSnapshot().then(
      (list) => {
        if (!alive) return;
        setStatuses((prev) => {
          const next = { ...prev };
          for (const event of list) if (!(event.paneId in next)) next[event.paneId] = event.status;
          return next;
        });
      },
      () => {}
    );
    window.api.agentEngines().then(
      (list) => {
        if (alive) setEngines(list);
      },
      () => {
        if (alive) setEngines([]);
      }
    );
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => {
      alive = false;
      off();
      window.clearInterval(timer);
    };
  }, []);

  const answer = useCallback(
    (paneId: string, callId: string, index: number) =>
      window.api.agentAnswer(paneId, callId, index).catch((): AgentAnswerResult => ({ ok: false, reason: "writeFailed" })),
    []
  );

  const value = useMemo(() => ({ statuses, engines, now, answer }), [statuses, engines, now, answer]);
  return <AgentStatusContext.Provider value={value}>{children}</AgentStatusContext.Provider>;
}
```

`src/i18n/tr.ts` (agents bloğu sonuna):

```ts
  "agents.stateRunning": "Çalışıyor",
  "agents.stateIdle": "Boşta",
  "agents.stateIdleFor": "Boşta {min} dk",
  "agents.stateAsking": "Soru soruyor",
  "agents.stateFinished": "Bitti",
  "agents.stateError": "Hata",
  "agents.stateUnknown": "Bilinmiyor",
  "agents.notInstalled": "Kurulu değil"
```

`src/i18n/en.ts`:

```ts
  "agents.stateRunning": "Working",
  "agents.stateIdle": "Idle",
  "agents.stateIdleFor": "Idle {min} min",
  "agents.stateAsking": "Asking",
  "agents.stateFinished": "Finished",
  "agents.stateError": "Error",
  "agents.stateUnknown": "Unknown",
  "agents.notInstalled": "Not installed"
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/agentView.test.ts tests/agentStatusContext.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add src/agents/agentView.ts src/agents/agentStatusContext.tsx src/i18n/tr.ts src/i18n/en.ts tests/agentView.test.ts tests/agentStatusContext.test.tsx
git commit -m "Ajan Alani: durum aboneligi ve gorunum yardimcilari

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Ajan ekleme penceresi

**Files:**
- Create: `src/agents/AddAgentDialog.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/addAgentDialog.test.tsx`

**Interfaces:**
- Consumes: Task 2 `AGENT_ENGINES`, `AGENT_ENGINE_IDS`, sınırlar; Task 3 `window.api.axetAgents`; Task 4 `NewAgentInput`, `ENGINE_LABEL`, `PANE_TITLE_MAX`; ortak `Modal`, `ModalCancelButton`, `PANE_COLOR_VAR`, `PANE_COLOR_LABEL`.
- Produces:

```ts
export const ROLE_PRESETS: TranslationKey[];   // Geliştirici, Analist, Test, İnceleme
export function orderEngines(engines: AgentEngineInfo[] | null): AgentEngineId[];   // kurulu olanlar önce
export default function AddAgentDialog(props: {
  open: boolean;
  defaultCwd: string;
  defaultName: string;
  engines: AgentEngineInfo[] | null;
  onAdd: (input: NewAgentInput) => void;
  onCancel: () => void;
}): JSX.Element | null;
```

- [ ] **Step 1: Kırmızı test** — `tests/addAgentDialog.test.tsx`

```tsx
// @vitest-environment jsdom
// Ajan ekleme penceresi (spec 2026-10-17 ajan-alani §4, §5, §14.2).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AddAgentDialog from "../src/agents/AddAgentDialog";
import type { AgentEngineInfo } from "../app-electron/shared/agentTypes";

const ENGINES: AgentEngineInfo[] = [
  { id: "axet-code", installed: true, blocked: false },
  { id: "claude", installed: true, blocked: false },
  { id: "codex", installed: false, blocked: true },
  { id: "gemini", installed: false, blocked: true },
  { id: "ozel", installed: true, blocked: false }
];

let prevApi: unknown;
let api: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  prevApi = (window as unknown as { api?: unknown }).api;
  api = {
    pickFolder: vi.fn(),
    axetAgents: vi.fn(async () => [
      { name: "coder", scope: "builtin", permissions: "ask (default)", description: "Kod" },
      { name: "task", scope: "builtin", permissions: "ask (default)", description: "Arama" }
    ])
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

function renderDialog(engines: AgentEngineInfo[] | null = ENGINES) {
  const onAdd = vi.fn();
  const onCancel = vi.fn();
  render(
    <LanguageProvider language="tr">
      <AddAgentDialog open defaultCwd="C:\\p" defaultName="Ajan 2" engines={engines} onAdd={onAdd} onCancel={onCancel} />
    </LanguageProvider>
  );
  return { onAdd, onCancel };
}

const engineGroup = () => screen.getByRole("radiogroup", { name: "Motor" });
const addButton = () => screen.getByRole("button", { name: "Ekle" }) as HTMLButtonElement;

describe("AddAgentDialog", () => {
  it("varsayılanlar: ad dolu, kurulu ilk motor seçili; Ekle rolsüz axet-code ajanı gönderiyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    expect((screen.getByLabelText("Ad") as HTMLInputElement).value).toBe("Ajan 2");
    expect(within(engineGroup()).getByRole("radio", { name: "axet-code" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith({
      spec: { engine: "axet-code", role: "", roleKind: "custom" },
      name: "Ajan 2",
      color: "gray",
      cwd: "C:\\p"
    });
  });

  it("axet-code ajan listesi klasörde okunuyor; seçilen ajan --agent rolü oluyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    expect(api.axetAgents).toHaveBeenCalledWith("C:\\p");
    fireEvent.change(screen.getByRole("combobox", { name: "Rol" }), { target: { value: "coder" } });
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ spec: { engine: "axet-code", role: "coder", roleKind: "axetAgent" } }));
  });

  it("Claude Code: hazır rol ve model; axet ajan listesi yok", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Claude Code" }));
    expect(screen.queryByRole("combobox", { name: "Rol" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Test" }));
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "sonnet" } });
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ spec: { engine: "claude", role: "Test", roleKind: "preset", model: "sonnet" } })
    );
  });

  it("serbest rol 'custom' olarak gidiyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Claude Code" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Rol" }), { target: { value: "Veri göçü" } });
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ spec: { engine: "claude", role: "Veri göçü", roleKind: "custom" } }));
  });

  it("özel komut: komut yazılmadan Ekle kapalı; model alanı yok", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Özel komut" }));
    expect(screen.queryByLabelText("Model")).toBeNull();
    expect(addButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Komut"), { target: { value: "opencode" } });
    expect(addButton().disabled).toBe(false);
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ spec: { engine: "ozel", role: "", roleKind: "custom", command: "opencode" } })
    );
  });

  it("kurulu olmayan motor sonda ve işaretli; seçilince uyarı görünüyor", async () => {
    renderDialog();
    await flush();
    expect(within(engineGroup()).getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "axet-code",
      "Claude Code",
      "Özel komut",
      "Codex · kurulu değil",
      "Gemini CLI · kurulu değil"
    ]);
    fireEvent.click(within(engineGroup()).getByRole("radio", { name: "Codex · kurulu değil" }));
    expect(screen.getByText("Bu motor PATH'te bulunamadı; eklenebilir ama kurulana kadar başlamaz.")).toBeTruthy();
  });

  it("ad boşsa Ekle kapalı; renk ve klasör seçimi gidiyor", async () => {
    const { onAdd } = renderDialog();
    await flush();
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "   " } });
    expect(addButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Ad"), { target: { value: "Ayşe" } });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Renk" })).getByRole("radio", { name: "Mavi" }));
    api.pickFolder.mockResolvedValueOnce("C:\\diger");
    fireEvent.click(screen.getByRole("button", { name: "Değiştir" }));
    await flush();
    fireEvent.click(addButton());
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Ayşe", color: "blue", cwd: "C:\\diger" }));
  });

  it("motor bilgisi yokken axet-code önde", async () => {
    renderDialog(null);
    await flush();
    expect(within(engineGroup()).getAllByRole("radio")[0].textContent).toBe("axet-code");
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/addAgentDialog.test.tsx`
Expected: FAIL — `AddAgentDialog` bulunamıyor.

- [ ] **Step 3: Uygula** — `src/agents/AddAgentDialog.tsx`

```tsx
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FolderOpen } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import { AGENT_ENGINES } from "../../app-electron/shared/agentEngines";
import {
  AGENT_COMMAND_MAX,
  AGENT_ENGINE_IDS,
  AGENT_MODEL_MAX,
  AGENT_ROLE_MAX,
  type AgentEngineId,
  type AgentEngineInfo,
  type AgentSpec,
  type AxetAgentEntry
} from "../../app-electron/shared/agentTypes";
import { PANE_TITLE_MAX, TERMINAL_PANE_COLORS } from "../../app-electron/shared/terminalLayout";
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import { middleEllipsis } from "../lib/paths";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { PANE_COLOR_LABEL, PANE_COLOR_VAR } from "../terminal/paneColors";
import type { NewAgentInput } from "../stores/terminalStoreContext";
import { ENGINE_LABEL } from "./agentLabels";

// "+ Ajan" penceresi (spec 2026-10-17 ajan-alani §4): ad, motor, rol, model,
// klasör, renk. axet-code'da rol, axet-code'un kendi ajan listesinden
// (`agent list --json`, spec §14.2) ve `--agent` ile başlatılıyor; öteki
// motorlarda rol serbest metin ya da hazır etiket. Model alanı yalnız model
// bayrağı bilinen motorlarda. Kurulu olmayan motor seçilebiliyor; kartta
// "kurulu değil" yazıyor ve bölme açılmıyor.

export const ROLE_PRESETS: TranslationKey[] = ["agents.roleDeveloper", "agents.roleAnalyst", "agents.roleTest", "agents.roleReview"];

/** Kurulu motorlar önce; kendi aralarında tanım sırası. Bilgi yoksa hepsi kurulu sayılıyor. */
export function orderEngines(engines: AgentEngineInfo[] | null): AgentEngineId[] {
  const installed = (id: AgentEngineId) => engines?.find((e) => e.id === id)?.installed ?? true;
  return [...AGENT_ENGINE_IDS].sort((a, b) => Number(installed(b)) - Number(installed(a)));
}

const RADIO_BASE = "flex-1 cursor-pointer rounded px-2 py-1 text-xs transition-colors";
const RADIO_ON = "bg-[var(--accent-glow)] text-slate-100";
const RADIO_OFF = "text-slate-400 hover:text-slate-200";
const INPUT =
  "h-7 w-full min-w-0 rounded border border-line bg-transparent px-2 text-xs text-slate-200 outline-none focus:border-accent-500/60";

export default function AddAgentDialog({
  open,
  defaultCwd,
  defaultName,
  engines,
  onAdd,
  onCancel
}: {
  open: boolean;
  defaultCwd: string;
  defaultName: string;
  engines: AgentEngineInfo[] | null;
  onAdd: (input: NewAgentInput) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const order = useMemo(() => orderEngines(engines), [engines]);
  const [name, setName] = useState(defaultName);
  const [engine, setEngine] = useState<AgentEngineId>(order[0]);
  const [axetRole, setAxetRole] = useState("");
  const [role, setRole] = useState("");
  const [model, setModel] = useState("");
  const [command, setCommand] = useState("");
  const [cwd, setCwd] = useState(defaultCwd);
  const [color, setColor] = useState<TerminalPaneColor>("gray");
  const [axetAgents, setAxetAgents] = useState<AxetAgentEntry[]>([]);

  // Her açılışta varsayılana dön (NewPaneDialog ile aynı kural).
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEngine(order[0]);
    setAxetRole("");
    setRole("");
    setModel("");
    setCommand("");
    setCwd(defaultCwd);
    setColor("gray");
  }, [open]);

  useEffect(() => {
    if (!open || engine !== "axet-code") return;
    let alive = true;
    window.api.axetAgents(cwd).then(
      (list) => {
        if (alive) setAxetAgents(list);
      },
      () => {
        if (alive) setAxetAgents([]);
      }
    );
    return () => {
      alive = false;
    };
  }, [open, engine, cwd]);

  const def = AGENT_ENGINES[engine];
  const info = engines?.find((e) => e.id === engine);
  const valid = name.trim() !== "" && cwd !== "" && (engine !== "ozel" || command.trim() !== "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const typedRole = role.trim().slice(0, AGENT_ROLE_MAX);
    const spec: AgentSpec =
      engine === "axet-code"
        ? { engine, role: axetRole, roleKind: axetRole ? "axetAgent" : "custom" }
        : { engine, role: typedRole, roleKind: ROLE_PRESETS.some((k) => t(k) === typedRole) ? "preset" : "custom" };
    if (def.modelFlag && model.trim()) spec.model = model.trim().slice(0, AGENT_MODEL_MAX);
    if (engine === "ozel") spec.command = command.trim().slice(0, AGENT_COMMAND_MAX);
    onAdd({ spec, name: name.trim().slice(0, PANE_TITLE_MAX), color, cwd });
  };

  const pick = async () => {
    const folder = await window.api.pickFolder();
    if (folder) setCwd(folder);
  };

  return (
    <Modal open={open} onClose={onCancel} title={t("agents.addTitle")} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.nameLabel")}</span>
          <input
            aria-label={t("agents.nameLabel")}
            value={name}
            maxLength={PANE_TITLE_MAX}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.engineLabel")}</span>
          <div role="radiogroup" aria-label={t("agents.engineLabel")} className="flex flex-wrap gap-1 rounded-md bg-control p-0.5">
            {order.map((id) => {
              const missing = engines?.find((e) => e.id === id)?.installed === false;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={engine === id}
                  onClick={() => setEngine(id)}
                  className={`${RADIO_BASE} ${engine === id ? RADIO_ON : RADIO_OFF}`}
                >
                  {t(ENGINE_LABEL[id])}
                  {missing && <span className="text-slate-500"> · {t("agents.notInstalledShort")}</span>}
                </button>
              );
            })}
          </div>
          {info?.installed === false && <p className="text-2xs text-[var(--status-warning-text)]">{t("agents.engineMissingHint")}</p>}
          {info?.note && <p className="text-2xs text-[var(--status-warning-text)]">{info.note}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.roleLabel")}</span>
          {engine === "axet-code" ? (
            <select aria-label={t("agents.roleLabel")} value={axetRole} onChange={(e) => setAxetRole(e.target.value)} className={INPUT}>
              <option value="">{t("agents.roleDefault")}</option>
              {axetAgents.map((a) => (
                <option key={a.name} value={a.name} title={a.description || undefined}>
                  {a.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <div className="flex flex-wrap gap-1">
                {ROLE_PRESETS.map((key) => (
                  <button key={key} type="button" onClick={() => setRole(t(key))} className={TOOL_BUTTON}>
                    {t(key)}
                  </button>
                ))}
              </div>
              <input
                aria-label={t("agents.roleLabel")}
                value={role}
                maxLength={AGENT_ROLE_MAX}
                onChange={(e) => setRole(e.target.value)}
                className={INPUT}
              />
            </>
          )}
        </div>

        {def.modelFlag && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">{t("agents.modelLabel")}</span>
            <input
              aria-label={t("agents.modelLabel")}
              value={model}
              maxLength={AGENT_MODEL_MAX}
              placeholder={t("agents.modelHint")}
              onChange={(e) => setModel(e.target.value)}
              className={INPUT}
            />
          </div>
        )}

        {engine === "ozel" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">{t("agents.commandLabel")}</span>
            <input
              aria-label={t("agents.commandLabel")}
              value={command}
              maxLength={AGENT_COMMAND_MAX}
              placeholder={t("agents.commandHint")}
              onChange={(e) => setCommand(e.target.value)}
              className={`${INPUT} font-mono`}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.folderLabel")}</span>
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="shrink-0 text-slate-400" />
            <span title={cwd || undefined} className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">
              {cwd ? middleEllipsis(cwd, 44) : t("terminal.noFolder")}
            </span>
            <button type="button" onClick={() => void pick()} className={TOOL_BUTTON}>
              {t("terminal.changeFolder")}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("agents.colorLabel")}</span>
          <div role="radiogroup" aria-label={t("agents.colorLabel")} className="flex gap-1.5">
            {TERMINAL_PANE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={t(PANE_COLOR_LABEL[c])}
                title={t(PANE_COLOR_LABEL[c])}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border ${color === c ? "border-accent-400" : "border-line"}`}
                style={{ background: PANE_COLOR_VAR[c] ?? "transparent" }}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <ModalCancelButton />
          <button type="submit" disabled={!valid} className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}>
            {t("agents.add")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

(Klasör ikonu bilerek gri: lime yalnız seçim; NewPaneDialog'daki accent ikonuna dokunulmuyor.)

`src/i18n/tr.ts` (agents bloğu sonuna):

```ts
  "agents.addTitle": "Ajan ekle",
  "agents.nameLabel": "Ad",
  "agents.engineLabel": "Motor",
  "agents.roleLabel": "Rol",
  "agents.roleDefault": "Varsayılan",
  "agents.roleDeveloper": "Geliştirici",
  "agents.roleAnalyst": "Analist",
  "agents.roleTest": "Test",
  "agents.roleReview": "İnceleme",
  "agents.modelLabel": "Model",
  "agents.modelHint": "Boşsa motorun varsayılanı",
  "agents.commandLabel": "Komut",
  "agents.commandHint": "ör. opencode",
  "agents.folderLabel": "Klasör",
  "agents.colorLabel": "Renk",
  "agents.add": "Ekle",
  "agents.notInstalledShort": "kurulu değil",
  "agents.engineMissingHint": "Bu motor PATH'te bulunamadı; eklenebilir ama kurulana kadar başlamaz."
```

`src/i18n/en.ts`:

```ts
  "agents.addTitle": "Add agent",
  "agents.nameLabel": "Name",
  "agents.engineLabel": "Engine",
  "agents.roleLabel": "Role",
  "agents.roleDefault": "Default",
  "agents.roleDeveloper": "Developer",
  "agents.roleAnalyst": "Analyst",
  "agents.roleTest": "Test",
  "agents.roleReview": "Review",
  "agents.modelLabel": "Model",
  "agents.modelHint": "Empty: the engine's default",
  "agents.commandLabel": "Command",
  "agents.commandHint": "e.g. opencode",
  "agents.folderLabel": "Folder",
  "agents.colorLabel": "Color",
  "agents.add": "Add",
  "agents.notInstalledShort": "not installed",
  "agents.engineMissingHint": "This engine was not found on PATH; you can add it, but it won't start until installed."
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/addAgentDialog.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add src/agents/AddAgentDialog.tsx src/i18n/tr.ts src/i18n/en.ts tests/addAgentDialog.test.tsx
git commit -m "Ajan Alani: ajan ekleme penceresi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Ekip şeridi, boş durum ve Ajanlar ekranının yerleşimi

**Files:**
- Create: `src/agents/TeamStrip.tsx`
- Create: `src/agents/AgentsEmptyState.tsx`
- Modify: `src/terminal/TerminalMode.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/terminalMode.test.tsx`

**Interfaces:**
- Consumes: Task 4 `agentCwd`, `addAgent`, `revealPane`, `restartPane`, `ENGINE_LABEL`, `agentName`; Task 11 `useAgentStatuses`, `AgentStatusContext`, `cardStatus`, `agentPanes`, `TONE_DOT`; Task 12 `AddAgentDialog`.
- Produces:

```ts
export default function TeamStrip(props: { workspace: TerminalWorkspace; full: boolean; onAddAgent: () => void; onAddShell: () => void }): JSX.Element;
export default function AgentsEmptyState(props: { allMinimized: boolean; onAddAgent: () => void; onAddShell: () => void }): JSX.Element;
// TerminalMode: üstte TeamStrip, ortada bölmeler (+ Task 14'te sağda Kararlar); "+ Ajan" AddAgentDialog'u, "+ Terminal" NewPaneDialog'u açıyor.
```

- [ ] **Step 1: Kırmızı testler** — `tests/terminalMode.test.tsx`

İçe aktarımlara:

```ts
import { within } from "@testing-library/react";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { AGENT_ENGINE_MISSING, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { TerminalPane } from "../src/stores/terminalTypes";
```

(`within`'i mevcut `@testing-library/react` içe aktarımına ekle; `TerminalPane`'i mevcut `terminalTypes` içe aktarımına ekle.)

`beforeEach`'te `window.api`'ye `axetAgents: vi.fn(async () => [])` ekle.

`setup`'ı ajan bağlamı alacak şekilde değiştir:

```tsx
function setup(over: Partial<TerminalState> = {}, defaultCwd = "C:\\a", agents: Partial<AgentStatusValue> = {}) {
  const commands = commandsMock();
  const make = (o: Partial<TerminalState>): TerminalStoreValue => ({
    state: { ...initialTerminalState, phase: "ready", visible: true, ...o },
    commands,
    defaultKind: "cmd",
    defaultCwd,
    agentCwd: "C:\\axet"
  });
  const agentValue: AgentStatusValue = {
    statuses: {},
    engines: [],
    now: 1_000_000,
    answer: vi.fn(async () => ({ ok: true as const })),
    ...agents
  };
  const ui = (o: Partial<TerminalState>) => (
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={make(o)}>
        <AgentStatusContext.Provider value={agentValue}>
          <TerminalMode />
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  const r = render(ui(over));
  return { commands, rerender: (o: Partial<TerminalState>) => r.rerender(ui(o)) };
}

const agentPane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "claude", role: "Test", roleKind: "preset" },
  cwd: "C:\\a",
  run: { state: "running", ptyId: `t-${id}` },
  title: "Ayşe",
  ...over
});

function agentWs(panes: TerminalPane[], extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return { id: "a", name: "Alan a", panes, focusedPaneId: panes[0]?.id ?? null, maximizedPaneId: null, unread: false, error: false, ...extra };
}

const strip = () => screen.getByRole("list", { name: "Ekip" });
const card = (paneId: string) => document.querySelector(`[data-agent-card="${paneId}"]`) as HTMLElement;
```

Şu testleri SİL (eski boş durum ve üst şerit artık yok): "boş alan: tür düğmesi varsayılan klasörde bölme açıyor", "boş alan: Değiştir klasörü değiştiriyor", "boş alan: klasör yoksa tür düğmeleri kapalı", "üst şerit: ad, sayı; + Bölme pencereyi açıyor ve odaktaki bölmeyi bölüyor", "9 bölmede + Bölme kapalı ve nedenini söylüyor", "hepsi küçültülünce boş-durum metni, xterm'ler takılı, ekleme çalışıyor (inceleme odağı 3)". "geri yükleme şeridi" testindeki `{ name: "Bölme" }` → `{ name: "Ajan" }`.

describe içine yenileri:

```tsx
  it("boş alan: açıklama ve kurulu motorlar; 'İlk ajanını ekle' ajanı varsayılanlarla ekliyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" }, "C:\\a", {
      engines: [
        { id: "axet-code", installed: true, blocked: false },
        { id: "codex", installed: false, blocked: true },
        { id: "ozel", installed: true, blocked: false }
      ]
    });
    expect(screen.getByText("Bu alanda ajan yok")).toBeTruthy();
    expect(screen.getByText("Kurulu motorlar: axet-code")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "İlk ajanını ekle" }));
    expect(screen.getByText("Ajan ekle")).toBeTruthy();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(commands.addAgent).toHaveBeenCalledWith(
      { spec: { engine: "axet-code", role: "", roleKind: "custom" }, name: "Ajan 1", color: "gray", cwd: "C:\\axet" },
      undefined
    );
  });

  it("boş alan: 'Düz terminal aç' kabuk penceresini açıyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 0)], activeWorkspaceId: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Düz terminal aç" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", undefined);
  });

  it("hepsi küçültülünce boş-durum metni, xterm'ler takılı (inceleme odağı 3)", () => {
    setup({
      workspaces: [ws("a", 2, { layout: null, focusedPaneId: null, minimized: [{ paneId: "a-p1", home: null }, { paneId: "a-p2", home: null }] })],
      activeWorkspaceId: "a"
    });
    expect(screen.getByText("Bütün bölmeler alttaki şeritte.")).toBeTruthy();
    expect(screen.getByTestId("xterm-a-t1")).toBeTruthy();
  });

  it("ekip şeridi: kartta ad, rol, motor ve durum; kabuk bölmesinin kartı yok; tıklayınca bölme öne geliyor", () => {
    const asking: AgentStatus = {
      state: "asking",
      source: "exact",
      lastActivity: 1,
      question: { callId: "c1", question: "?", header: "", options: ["A", "B"], multiSelect: false, askedAt: 1 }
    };
    const shell: TerminalPane = { id: "s", kind: "cmd", cwd: "C:\\a", run: { state: "running", ptyId: "t-s" } };
    const { commands } = setup({ workspaces: [agentWs([agentPane("x"), shell])], activeWorkspaceId: "a" }, "C:\\a", {
      statuses: { x: asking }
    });
    const text = card("x").textContent ?? "";
    for (const part of ["Ayşe", "Test", "Claude Code", "Soru soruyor"]) expect(text).toContain(part);
    expect(card("s")).toBeNull();
    expect(card("x").querySelector("[data-estimated]")).toBeNull();
    expect(card("x").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(card("x"));
    expect(commands.revealPane).toHaveBeenCalledWith("x");
  });

  it("tahmini durumda ≈ ve ipucu; boşta süresi", () => {
    setup({ workspaces: [agentWs([agentPane("x")])], activeWorkspaceId: "a" }, "C:\\a", {
      now: 1_000_000 + 3 * 60_000,
      statuses: { x: { state: "idle", source: "estimated", lastActivity: 1_000_000 } }
    });
    expect(card("x").textContent).toContain("Boşta 3 dk");
    const mark = card("x").querySelector("[data-estimated]") as HTMLElement;
    expect(mark.textContent).toBe("≈");
    expect(mark.getAttribute("title")).toBe("Bu motorun durumu terminal hareketinden tahmin ediliyor.");
  });

  it("axet-code sürüm uyarısı kartta motor adının ipucunda", () => {
    setup(
      { workspaces: [agentWs([agentPane("x", { agent: { engine: "axet-code", role: "", roleKind: "custom" } })])], activeWorkspaceId: "a" },
      "C:\\a",
      { engines: [{ id: "axet-code", installed: true, blocked: false, note: "axet-code eski" }] }
    );
    const note = card("x").querySelector("[data-engine-note]") as HTMLElement;
    expect(note.textContent).toBe("axet-code");
    expect(note.getAttribute("title")).toBe("axet-code eski");
  });

  it("motoru kurulu olmayan ajan 'Kurulu değil'; bitmiş ajan 'Yeniden başlat'", () => {
    const { commands } = setup(
      {
        workspaces: [agentWs([agentPane("x", { run: { state: "failed", message: AGENT_ENGINE_MISSING } }), agentPane("y", { title: "Mehmet" })])],
        activeWorkspaceId: "a"
      },
      "C:\\a",
      { statuses: { y: { state: "finished", source: "exact", lastActivity: 1 } } }
    );
    expect(card("x").textContent).toContain("Kurulu değil");
    const restarts = within(strip()).getAllByRole("button", { name: "Yeniden başlat" });
    fireEvent.click(restarts[restarts.length - 1]);
    expect(commands.restartPane).toHaveBeenCalledWith("y");
  });

  it("+ Terminal kabuk penceresini açıp odaktaki bölmeyi bölüyor; bölme sayısı görünüyor", () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    expect(screen.getByText("2 / 9 bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
    expect(screen.getByText("Yeni bölme")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Aç" }));
    // jsdom'da kutular 0×0: genişlik yükseklikten büyük değil → alta.
    expect(commands.addPane).toHaveBeenCalledWith("cmd", "C:\\a", { targetPaneId: "a-p1", dir: "column" });
  });

  it("+ Ajan pencereden addAgent'a bölme yönüyle gidiyor", async () => {
    const { commands } = setup({ workspaces: [ws("a", 2)], activeWorkspaceId: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Ajan" }));
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "Ekle" }));
    expect(commands.addAgent).toHaveBeenCalledWith(expect.objectContaining({ name: "Ajan 1", cwd: "C:\\axet" }), {
      targetPaneId: "a-p1",
      dir: "column"
    });
  });

  it("9 bölmede + Ajan ve + Terminal kapalı ve nedenini söylüyor", () => {
    setup({ workspaces: [ws("a", 9)], activeWorkspaceId: "a" });
    for (const name of ["Ajan", "Terminal"]) {
      const button = screen.getByRole("button", { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.title).toBe("En fazla 9 bölme");
    }
  });
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/terminalMode.test.tsx`
Expected: FAIL — "Bu alanda ajan yok", `data-agent-card`, "Ajan"/"Terminal" düğmeleri yok.

- [ ] **Step 3: Uygula**

`src/agents/TeamStrip.tsx`:

```tsx
import { Plus, RotateCw } from "lucide-react";
import { useT } from "../i18n";
import type { AgentEngineInfo, AgentStatus } from "../../app-electron/shared/agentTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import type { TerminalPane, TerminalWorkspace } from "../stores/terminalTypes";
import { PRIMARY_BUTTON, TOOL_BUTTON, GHOST_ICON_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useAgentStatuses } from "./agentStatusContext";
import { agentPanes, cardStatus, TONE_DOT } from "./agentView";
import { ENGINE_LABEL, agentName } from "./agentLabels";

// Ekip şeridi (spec 2026-10-17 ajan-alani §4): seçili alandaki ajanlar yan
// yana. Kart: renk şeridi, ad, rol, motor, durum noktası + metni; tahmini
// durumda "≈". Seçili kart (odaktaki bölme) lime çerçeveyle — lime YALNIZ
// seçim. Kabuk bölmelerinin kartı yok; onlar bölme alanında.

export default function TeamStrip({
  workspace,
  full,
  onAddAgent,
  onAddShell
}: {
  workspace: TerminalWorkspace;
  full: boolean;
  onAddAgent: () => void;
  onAddShell: () => void;
}) {
  const t = useT();
  const { statuses, engines, now } = useAgentStatuses();
  const agents = agentPanes(workspace);
  return (
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-line px-3">
      <div role="list" aria-label={t("agents.team")} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
        {agents.map((pane) => (
          <AgentCard
            key={pane.id}
            pane={pane}
            selected={workspace.focusedPaneId === pane.id}
            status={statuses[pane.id]}
            engine={engines?.find((e) => e.id === (pane.agent?.engine ?? "axet-code"))}
            now={now || Date.now()}
          />
        ))}
      </div>
      <span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">
        {t("terminal.paneCount", { count: workspace.panes.length })}
      </span>
      <button
        type="button"
        onClick={onAddShell}
        disabled={full}
        title={full ? t("terminal.paneMax") : undefined}
        className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
      >
        <Plus size={12} />
        {t("agents.addShell")}
      </button>
      <button
        type="button"
        onClick={onAddAgent}
        disabled={full}
        title={full ? t("terminal.paneMax") : undefined}
        className={`${PRIMARY_BUTTON} disabled:cursor-default disabled:opacity-40`}
      >
        <Plus size={12} />
        {t("agents.addAgent")}
      </button>
    </div>
  );
}

function AgentCard({
  pane,
  selected,
  status,
  engine,
  now
}: {
  pane: TerminalPane;
  selected: boolean;
  status: AgentStatus | undefined;
  engine: AgentEngineInfo | undefined;
  now: number;
}) {
  const t = useT();
  const { commands } = useTerminalStore();
  const view = cardStatus(pane, status, now);
  const color = PANE_COLOR_VAR[pane.color ?? "gray"];
  const engineLabel = t(ENGINE_LABEL[pane.agent?.engine ?? "axet-code"]);
  return (
    <div role="listitem" className="relative shrink-0">
      <button
        type="button"
        data-agent-card={pane.id}
        aria-pressed={selected}
        onClick={() => commands.revealPane(pane.id)}
        style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
        className={`flex h-12 w-52 flex-col justify-center gap-1 rounded-md border bg-card pl-3 pr-2 text-left transition-colors ${
          selected ? "border-accent-500/60" : "border-line hover:border-slate-500"
        } ${view.restartable ? "pr-8" : ""}`}
      >
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="min-w-0 truncate text-xs font-medium text-slate-200">{agentName(pane, t)}</span>
          {pane.agent?.role && <span className="min-w-0 truncate text-2xs text-slate-500">{pane.agent.role}</span>}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-2xs">
          <span data-tone={view.tone} className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[view.tone]}`} />
          <span className="min-w-0 truncate text-slate-300">{t(view.key, view.params)}</span>
          {view.estimated && (
            <span data-estimated="" title={t("agents.estimatedHint")} className="shrink-0 text-slate-500">
              ≈
            </span>
          )}
          {/* axet-code eski/bozuk (axetBinaryStatus, spec §10): motor adı uyarı renginde, mesaj ipucunda. */}
          <span
            data-engine-note={engine?.note ? "" : undefined}
            title={engine?.note}
            className={`ml-auto shrink-0 truncate ${engine?.note ? "text-[var(--status-warning-text)]" : "text-slate-500"}`}
          >
            {engineLabel}
          </span>
        </span>
      </button>
      {view.restartable && (
        <button
          type="button"
          onClick={() => commands.restartPane(pane.id)}
          title={t("terminal.restart")}
          aria-label={t("terminal.restart")}
          className={`${GHOST_ICON_BUTTON} absolute right-1 top-1`}
        >
          <RotateCw size={12} />
        </button>
      )}
    </div>
  );
}
```

`src/agents/AgentsEmptyState.tsx`:

```tsx
import { useT } from "../i18n";
import { PRIMARY_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { useAgentStatuses } from "./agentStatusContext";
import { ENGINE_LABEL } from "./agentLabels";

// Hiç ajan yokken (spec 2026-10-17 ajan-alani §4): kısa açıklama, tek ana
// eylem, kurulu motorlar. Düz terminal ikincil düğme olarak kalıyor (spec §2.8).
export default function AgentsEmptyState({
  allMinimized,
  onAddAgent,
  onAddShell
}: {
  allMinimized: boolean;
  onAddAgent: () => void;
  onAddShell: () => void;
}) {
  const t = useT();
  const { engines } = useAgentStatuses();
  const installed = (engines ?? []).filter((e) => e.installed && e.id !== "ozel").map((e) => t(ENGINE_LABEL[e.id]));
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-sm text-slate-200">{allMinimized ? t("agents.allMinimized") : t("agents.emptyTitle")}</p>
        {!allMinimized && <p className="text-xs text-slate-500">{t("agents.emptyBody")}</p>}
      </div>
      <button type="button" onClick={onAddAgent} className={PRIMARY_BUTTON}>
        {t("agents.addFirst")}
      </button>
      {engines !== null && (
        <p className="text-2xs text-slate-500">
          {installed.length > 0 ? t("agents.installedEngines", { list: installed.join(", ") }) : t("agents.noEngines")}
        </p>
      )}
      <button type="button" onClick={onAddShell} className={TOOL_BUTTON}>
        {t("agents.addShellLong")}
      </button>
    </div>
  );
}
```

`src/terminal/TerminalMode.tsx`:
- İçe aktarımlar: `lucide-react` satırı (`FolderOpen`, `Plus`), `middleEllipsis`, `SHELL_PANE_KINDS`, `KIND_LABEL`, `ShellKind` artık kullanılmıyor — sil (`paneLabel`, `MAX_TERMINAL_PANES`, `TOOL_BUTTON`, `PRIMARY_BUTTON` kalıyor). Ekle:

```ts
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes } from "../agents/agentView";
import TeamStrip from "../agents/TeamStrip";
import AgentsEmptyState from "../agents/AgentsEmptyState";
import AddAgentDialog from "../agents/AddAgentDialog";
```

- Dosya başı yorumu: `// Ajanlar ekranının sağ tarafı (spec 2026-10-17 ajan-alani §4): üstte ekip şeridi, ortada bölmeler. Bütün alanlar HEP takılı: seçili olmayanlar hidden.`
- `TerminalMode` fonksiyonunun başını:

```tsx
export default function TerminalMode() {
  const t = useT();
  const { state, commands, defaultKind, defaultCwd, agentCwd } = useTerminalStore();
  const { engines } = useAgentStatuses();
  // Açıkken hangi bölmenin bölüneceği (yoksa odaktakinin sağı).
  const [dialog, setDialog] = useState<{ split?: PaneSplit } | null>(null);
  const [agentDialog, setAgentDialog] = useState<{ split?: PaneSplit } | null>(null);
```

- `state.phase === "ready" && active && ( <div className="flex h-9 …"> … </div> )` bloğunun TAMAMINI şununla değiştir:

```tsx
      {state.phase === "ready" && active && (
        <TeamStrip
          workspace={active}
          full={full}
          onAddAgent={() => setAgentDialog({ split: splitFor(active) })}
          onAddShell={() => setDialog({ split: splitFor(active) })}
        />
      )}
```

- `<div className="relative min-h-0 flex-1">{state.workspaces.map(…)}</div>` kabını yatay bir kabın içine al (Task 14 sağına Kararlar'ı koyacak):

```tsx
      <div className="flex min-h-0 flex-1">
        <div className="relative min-h-0 flex-1">
          {state.workspaces.map((w) => (
            …mevcut içerik…
          ))}
        </div>
      </div>
```

- Mevcut içerikteki boş durum:

```tsx
              {leafIds(layoutOf(w)).length === 0 && (
                <div className="absolute inset-0 z-10">
                  <AgentsEmptyState
                    allMinimized={w.panes.length > 0}
                    onAddAgent={() => setAgentDialog({})}
                    onAddShell={() => setDialog({})}
                  />
                </div>
              )}
```

- `<NewPaneDialog … />`'un altına:

```tsx
      <AddAgentDialog
        open={agentDialog !== null}
        defaultCwd={agentCwd}
        defaultName={t("agents.defaultName", { n: (active ? agentPanes(active).length : 0) + 1 })}
        engines={engines}
        onAdd={(input) => {
          const split = agentDialog?.split;
          setAgentDialog(null);
          commands.addAgent(input, split);
        }}
        onCancel={() => setAgentDialog(null)}
      />
```

- `function EmptyWorkspace(…) { … }` bileşenini tümüyle SİL.

`src/i18n/tr.ts` (agents bloğu sonuna):

```ts
  "agents.team": "Ekip",
  "agents.addAgent": "Ajan",
  "agents.addShell": "Terminal",
  "agents.estimatedHint": "Bu motorun durumu terminal hareketinden tahmin ediliyor.",
  "agents.emptyTitle": "Bu alanda ajan yok",
  "agents.emptyBody": "Ajanlar kendi terminallerinde yan yana çalışır; soru sorduklarında Kararlar'da toplanır.",
  "agents.addFirst": "İlk ajanını ekle",
  "agents.installedEngines": "Kurulu motorlar: {list}",
  "agents.noEngines": "Kurulu motor bulunamadı; özel komutla da ajan ekleyebilirsin.",
  "agents.addShellLong": "Düz terminal aç",
  "agents.allMinimized": "Bütün bölmeler alttaki şeritte.",
  "agents.defaultName": "Ajan {n}"
```

`src/i18n/en.ts`:

```ts
  "agents.team": "Team",
  "agents.addAgent": "Agent",
  "agents.addShell": "Terminal",
  "agents.estimatedHint": "This engine's status is estimated from terminal activity.",
  "agents.emptyTitle": "No agents in this workspace",
  "agents.emptyBody": "Agents work side by side in their own terminals; their questions gather in Decisions.",
  "agents.addFirst": "Add your first agent",
  "agents.installedEngines": "Installed engines: {list}",
  "agents.noEngines": "No installed engine found; you can still add an agent with a custom command.",
  "agents.addShellLong": "Open a plain terminal",
  "agents.allMinimized": "All panes are in the strip below.",
  "agents.defaultName": "Agent {n}"
```

`"terminal.emptyTitle"`, `"terminal.emptyHint"`, `"terminal.addPane"` artık hiçbir yerde kullanılmıyorsa (`grep -rn 'terminal.emptyTitle\|terminal.emptyHint\|terminal.addPane' src`) iki sözlükten de sil.

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/terminalMode.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add src/agents/TeamStrip.tsx src/agents/AgentsEmptyState.tsx src/terminal/TerminalMode.tsx src/i18n/tr.ts src/i18n/en.ts tests/terminalMode.test.tsx
git commit -m "Ajan Alani: ekip seridi, bos durum ve Ajanlar ekrani yerlesimi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Kararlar paneli

**Files:**
- Create: `src/agents/DecisionsPanel.tsx`
- Modify: `src/terminal/TerminalMode.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/decisionsPanel.test.tsx`

**Interfaces:**
- Consumes: Task 11 `decisionsOf`, `DecisionRow`, `useAgentStatuses().answer`; Task 4 `revealPane`, `agentName`.
- Produces: `export default function DecisionsPanel(): JSX.Element;` — sağda katlanabilir panel; boşken kendiliğinden dar; satır: ajan adı/rengi, soru, seçenek düğmeleri (listeden cevaplanabilirse) ya da "Terminale git".

- [ ] **Step 1: Kırmızı test** — `tests/decisionsPanel.test.tsx`

```tsx
// @vitest-environment jsdom
// Kararlar paneli (spec 2026-10-17 ajan-alani §4.3, §7).
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import DecisionsPanel from "../src/agents/DecisionsPanel";
import { AgentStatusContext, type AgentStatusValue } from "../src/agents/agentStatusContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalPane, TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentAnswerResult, AgentQuestion, AgentStatus } from "../app-electron/shared/agentTypes";
import { LIST_ANSWER_ENABLED } from "../app-electron/shared/agentDecisions";

afterEach(cleanup);

const pane = (id: string, over: Partial<TerminalPane> = {}): TerminalPane => ({
  id,
  kind: "agent",
  agent: { engine: "axet-code", role: "", roleKind: "custom" },
  cwd: "C:\\p",
  run: { state: "running", ptyId: `t-${id}` },
  title: `Ajan ${id}`,
  ...over
});
const ws = (id: string, panes: TerminalPane[]): TerminalWorkspace => ({
  id,
  name: id,
  panes,
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
});
const question = (callId: string, over: Partial<AgentQuestion> = {}): AgentQuestion => ({
  callId,
  question: "Hangi renk?",
  header: "",
  options: ["Kırmızı", "Mavi"],
  multiSelect: false,
  askedAt: 1,
  ...over
});
const asking = (q: AgentQuestion): AgentStatus => ({ state: "asking", source: "exact", lastActivity: 1, question: q });

function setup(workspaces: TerminalWorkspace[], statuses: Record<string, AgentStatus>, answerResult: AgentAnswerResult = { ok: true }) {
  const commands = { revealPane: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: true, workspaces, activeWorkspaceId: workspaces[0]?.id ?? null },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  const answer = vi.fn(async () => answerResult);
  const agents: AgentStatusValue = { statuses, engines: [], now: 1, answer };
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={agents}>
          <DecisionsPanel />
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, answer };
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("DecisionsPanel", () => {
  it("bekleyen karar yoksa dar ve 'Bekleyen karar yok' diyor", () => {
    setup([ws("w1", [pane("a")])], {});
    const button = screen.getByRole("button", { name: "Bekleyen karar yok" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.queryByText("Hangi renk?")).toBeNull();
  });

  it("seçenek düğmesi cevabı doğru dizinle gönderiyor", async () => {
    const { answer } = setup([ws("w1", [pane("a")])], { a: asking(question("c1")) });
    expect(screen.getByText("Hangi renk?")).toBeTruthy();
    expect(screen.getByText("Ajan a")).toBeTruthy();
    if (!LIST_ANSWER_ENABLED) {
      expect(screen.queryByRole("button", { name: "Mavi" })).toBeNull();
      return;
    }
    fireEvent.click(screen.getByRole("button", { name: "Mavi" }));
    await flush();
    expect(answer).toHaveBeenCalledWith("a", "c1", 1);
  });

  it("çok seçimli soru: seçenek yok, 'Terminale git' bölmeyi öne getiriyor", () => {
    const { commands } = setup([ws("w1", [pane("a")])], { a: asking(question("c1", { multiSelect: true })) });
    expect(screen.queryByRole("button", { name: "Kırmızı" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Terminale git" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("dokunulmuş soru: tuş gönderilmedi, 'terminalden cevaplayın' ve 'Terminale git' görünüyor", async () => {
    if (!LIST_ANSWER_ENABLED) return;
    const { commands } = setup([ws("w1", [pane("a")])], { a: asking(question("c1")) }, { ok: false, reason: "typing" });
    fireEvent.click(screen.getByRole("button", { name: "Kırmızı" }));
    await flush();
    expect(screen.getByRole("alert").textContent).toBe("Bu soruya terminalde dokunuldu; cevabı terminalden verin.");
    fireEvent.click(screen.getByRole("button", { name: "Terminale git" }));
    expect(commands.revealPane).toHaveBeenCalledWith("a");
  });

  it("bütün alanların soruları eskisi önce; kapanmış bölmenin eski sorusu yok", () => {
    setup([ws("w1", [pane("a"), pane("z", { run: { state: "exited", ptyId: "t", code: 0 } })]), ws("w2", [pane("b")])], {
      a: asking(question("ca", { askedAt: 50, question: "İkinci soru" })),
      b: asking(question("cb", { askedAt: 10, question: "Birinci soru" })),
      z: asking(question("cz", { question: "Bayat soru" }))
    });
    const texts = Array.from(document.querySelectorAll("[data-decision] p")).map((p) => p.textContent);
    expect(texts).toEqual(["Birinci soru", "İkinci soru"]);
    expect(screen.queryByText("Bayat soru")).toBeNull();
  });

  it("katlanıyor ve sayaçla açılıyor", () => {
    setup([ws("w1", [pane("a")])], { a: asking(question("c1")) });
    fireEvent.click(screen.getByRole("button", { name: "Kararları gizle" }));
    expect(screen.queryByText("Hangi renk?")).toBeNull();
    expect(screen.getByText("1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kararları göster" }));
    expect(screen.getByText("Hangi renk?")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/decisionsPanel.test.tsx`
Expected: FAIL — `DecisionsPanel` bulunamıyor.

- [ ] **Step 3: Uygula** — `src/agents/DecisionsPanel.tsx`

```tsx
import { useState } from "react";
import { Inbox, PanelRightClose } from "lucide-react";
import { useT } from "../i18n";
import type { TranslationKey } from "../i18n/tr";
import type { AgentAnswerFailure } from "../../app-electron/shared/agentTypes";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { Eyebrow } from "../ui/Eyebrow";
import { GHOST_ICON_BUTTON, TOOL_BUTTON } from "../ui/buttons";
import { PANE_COLOR_VAR } from "../terminal/paneColors";
import { useAgentStatuses } from "./agentStatusContext";
import { decisionsOf, type DecisionRow } from "./agentView";
import { agentName } from "./agentLabels";

// Kararlar paneli (spec 2026-10-17 ajan-alani §4.3, §7): bütün ajanların
// cevap bekleyen soruları tek listede. Tek seçimli, kesin kaynaklı soru
// listeden cevaplanıyor; ana süreç göndermeden önce sorunun hâlâ açık
// olduğunu ve terminalde dokunulmadığını yeniden doğruluyor. Ötekiler
// "Terminale git". Boşken panel kendiliğinden daralıyor.

const ANSWER_ERROR: Record<Exclude<AgentAnswerFailure, "closed">, TranslationKey> = {
  typing: "agents.answerTyping",
  notAnswerable: "agents.answerNotAnswerable",
  writeFailed: "agents.answerFailed",
  noAgent: "agents.answerFailed"
};

export default function DecisionsPanel() {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const { statuses, answer } = useAgentStatuses();
  const rows = decisionsOf(state.workspaces, statuses);
  const [collapsed, setCollapsed] = useState(false);
  const [errors, setErrors] = useState<Record<string, TranslationKey>>({});
  const [sending, setSending] = useState<string | null>(null);

  const send = async (row: DecisionRow, index: number) => {
    const callId = row.question.callId;
    setSending(callId);
    const result = await answer(row.paneId, callId, index);
    setSending(null);
    if (result.ok || result.reason === "closed") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[callId];
        return next;
      });
      return;
    }
    setErrors((prev) => ({ ...prev, [callId]: ANSWER_ERROR[result.reason] }));
  };

  if (rows.length === 0 || collapsed) {
    const empty = rows.length === 0;
    const label = empty ? t("agents.noDecisions") : t("agents.showDecisions");
    return (
      <aside aria-label={t("agents.decisions")} className="flex w-9 shrink-0 flex-col items-center gap-1 border-l border-line py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          disabled={empty}
          title={label}
          aria-label={label}
          className={`${GHOST_ICON_BUTTON} disabled:cursor-default disabled:opacity-40`}
        >
          <Inbox size={14} />
        </button>
        {!empty && <span className="font-mono text-2xs tabular-nums text-[var(--status-warning-text)]">{rows.length}</span>}
      </aside>
    );
  }

  return (
    <aside aria-label={t("agents.decisions")} className="flex w-72 shrink-0 flex-col border-l border-line">
      <div className="flex h-9 shrink-0 items-center gap-2 px-3">
        <Eyebrow className="flex-1" count={rows.length}>
          {t("agents.decisions")}
        </Eyebrow>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title={t("agents.hideDecisions")}
          aria-label={t("agents.hideDecisions")}
          className={GHOST_ICON_BUTTON}
        >
          <PanelRightClose size={14} />
        </button>
      </div>
      <ul className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {rows.map((row) => {
          const callId = row.question.callId;
          const color = PANE_COLOR_VAR[row.pane.color ?? "gray"];
          const error = errors[callId];
          return (
            <li
              key={callId}
              data-decision={row.paneId}
              className="mb-2 rounded-md border border-line bg-card p-2"
              style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
            >
              <div className="mb-1 truncate text-2xs font-medium text-slate-400">{agentName(row.pane, t)}</div>
              <p className="mb-2 max-h-24 overflow-hidden whitespace-pre-wrap break-words text-xs text-slate-200">
                {row.question.question || row.question.header || t("agents.questionFallback")}
              </p>
              {row.answerable && (
                <div className="flex flex-wrap gap-1">
                  {row.question.options.map((option, index) => (
                    <button
                      key={`${index}-${option}`}
                      type="button"
                      disabled={sending === callId}
                      onClick={() => void send(row, index)}
                      className={`${TOOL_BUTTON} disabled:cursor-default disabled:opacity-40`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {error && (
                <p role="alert" className="mt-1 text-2xs text-[var(--status-warning-text)]">
                  {t(error)}
                </p>
              )}
              {(!row.answerable || error) && (
                <button
                  type="button"
                  onClick={() => commands.revealPane(row.paneId)}
                  className="mt-1 cursor-pointer text-2xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                >
                  {t("agents.goToTerminal")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
```

`src/terminal/TerminalMode.tsx`: `import DecisionsPanel from "../agents/DecisionsPanel";` ve Task 13'te kurulan `<div className="flex min-h-0 flex-1">` kabında bölme kabının kardeşi olarak, kapanıştan önce: `{state.phase === "ready" && <DecisionsPanel />}`.

`src/i18n/tr.ts`:

```ts
  "agents.decisions": "Kararlar",
  "agents.noDecisions": "Bekleyen karar yok",
  "agents.showDecisions": "Kararları göster",
  "agents.hideDecisions": "Kararları gizle",
  "agents.goToTerminal": "Terminale git",
  "agents.questionFallback": "Ajan bir tercih bekliyor.",
  "agents.answerTyping": "Bu soruya terminalde dokunuldu; cevabı terminalden verin.",
  "agents.answerNotAnswerable": "Bu soru listeden cevaplanamıyor; terminalden cevaplayın.",
  "agents.answerFailed": "Cevap gönderilemedi; terminalden cevaplayın."
```

`src/i18n/en.ts`:

```ts
  "agents.decisions": "Decisions",
  "agents.noDecisions": "No pending decisions",
  "agents.showDecisions": "Show decisions",
  "agents.hideDecisions": "Hide decisions",
  "agents.goToTerminal": "Go to terminal",
  "agents.questionFallback": "The agent is waiting for a choice.",
  "agents.answerTyping": "This question was touched in the terminal; answer it there.",
  "agents.answerNotAnswerable": "This question can't be answered from the list; answer it in the terminal.",
  "agents.answerFailed": "The answer couldn't be sent; answer it in the terminal."
```

`tests/terminalMode.test.tsx`'teki testler Kararlar panelinin varlığından etkilenmez (durum yokken panel dar; "Bekleyen karar yok" düğmesi ekleniyor). `getByRole("button", …)` sorgularından biri çakışırsa sorguyu `within(strip())` ile daralt ve ledger'a yaz.

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/decisionsPanel.test.tsx tests/terminalMode.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz.

- [ ] **Step 5: Commit**

```bash
git add src/agents/DecisionsPanel.tsx src/terminal/TerminalMode.tsx src/i18n/tr.ts src/i18n/en.ts tests/decisionsPanel.test.tsx
git commit -m "Ajan Alani: Kararlar paneli

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Kenar çubuğu rozetleri, alan kökü menüsü, "Ajanlar" adı ve bildirim tıklaması

**Files:**
- Modify: `src/components/TerminalSidebar.tsx`
- Create: `src/agents/AgentOpenListener.tsx`, `src/agents/AgentsModeBadge.tsx`
- Modify: `src/shell/Sidebar.tsx` (ikon), `src/App.tsx`
- Modify: `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/terminalSidebar.test.tsx`, `tests/agentsShell.test.tsx` (yeni), `tests/shellSidebar.test.tsx`, `tests/appTerminalWiring.test.ts`

**Interfaces:**
- Consumes: Task 4 `setWorkspaceRoot`, `revealPane`; Task 9 `window.api.onAgentOpen`; Task 11 `useAgentStatuses`, `agentPanes`, `askingCount`; mevcut `ActiveSapContext` (`uuid`, `systemId`, `projectDir`).
- Produces:

```ts
export default function TerminalSidebar(props?: { activeSap?: ActiveSapContext | null }): JSX.Element;
export default function AgentOpenListener(props: { onShow: () => void }): null;
export default function AgentsModeBadge(): JSX.Element | null;
```

- [ ] **Step 1: Kırmızı testler**

`tests/terminalSidebar.test.tsx`:
- İçe aktarımlar:

```ts
import { beforeEach } from "vitest";
import { AgentStatusContext } from "../src/agents/agentStatusContext";
import { LEGACY_AXET_AGENT, type AgentStatus } from "../app-electron/shared/agentTypes";
import type { ActiveSapContext } from "../app-electron/shared/types";
```

(`beforeEach`'i mevcut `vitest` içe aktarımına ekle.)

- `renderSidebar`'ı şöyle genişlet (gövdenin geri kalanı aynı):

```tsx
function renderSidebar(
  workspaces: TerminalWorkspace[],
  over: Partial<TerminalState> = {},
  extra: { statuses?: Record<string, AgentStatus>; activeSap?: ActiveSapContext | null } = {}
) {
  // …mevcut commands/state/value…
  render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={value}>
        <AgentStatusContext.Provider value={{ statuses: extra.statuses ?? {}, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) }}>
          <TerminalSidebar activeSap={extra.activeSap ?? null} />
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return commands;
}
```

- Yardımcılar ve `window.api`:

```tsx
let pick: ReturnType<typeof vi.fn>;
beforeEach(() => {
  pick = vi.fn();
  (window as unknown as { api: unknown }).api = { pickFolder: pick };
});

function agentWs(id: string, name: string, count: number, extra: Partial<TerminalWorkspace> = {}): TerminalWorkspace {
  return {
    ...ws(id, name),
    panes: Array.from({ length: count }, (_, i) => ({
      id: `${id}-a${i}`,
      kind: "agent" as const,
      agent: LEGACY_AXET_AGENT,
      cwd: "C:\\a",
      run: { state: "running", ptyId: `${id}-t${i}` } as PaneRun
    })),
    ...extra
  };
}

const SAP: ActiveSapContext = {
  uuid: "u1",
  systemId: "D01",
  systemName: "Geliştirme",
  customerPath: [],
  host: null,
  client: "100",
  username: "u",
  tier: null,
  projectDir: "C:\\proj\\D01",
  connectedAt: "",
  verified: true
};
```

(`agentWs`'i `ws`'in altına koy; `running` sabiti `agentWs`'ten önce tanımlıysa onu kullanabilirsin.)

- "alanları sayısıyla listeliyor, seçiliyi işaretliyor" testinde `ws("a", "API", [running, running])` → `agentWs("a", "API", 2)`; beklenti aynı (`toContain("2")`); test adı "alanları ajan sayısıyla listeliyor…".
- describe sonuna:

```tsx
  it("kabuk bölmeleri ajan sayılmıyor; soru bekleyen ajan rozeti", () => {
    const asking: AgentStatus = {
      state: "asking",
      source: "exact",
      lastActivity: 1,
      question: { callId: "c", question: "?", header: "", options: ["A", "B"], multiSelect: false, askedAt: 1 }
    };
    renderSidebar([agentWs("a", "API", 2), ws("b", "UI", [running, running, running])], {}, { statuses: { "a-a1": asking } });
    expect(row("UI").textContent).not.toContain("3");
    const badge = row("API").querySelector("[data-asking]") as HTMLElement;
    expect(badge.textContent).toBe("1");
    expect(badge.getAttribute("title")).toBe("1 soru bekliyor");
    expect(row("UI").querySelector("[data-asking]")).toBeNull();
  });

  it("menü: Kök klasör seçilen klasörü kök yapıyor (SAP bağı düşüyor)", async () => {
    const c = renderSidebar([ws("a", "API", [], { sap: { uuid: "u1", label: "D01" }, root: "C:\\proj\\D01" })]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    pick.mockResolvedValueOnce("C:\\kok");
    fireEvent.click(screen.getByRole("menuitem", { name: "Kök klasör…" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(c.setWorkspaceRoot).toHaveBeenCalledWith("a", "C:\\kok", null);
  });

  it("menü: aktif SAP sistemi varken kökü proje klasörü yapıyor; bağlıysa kaldırma seçeneği", () => {
    const c = renderSidebar([ws("a", "API"), ws("b", "UI", [], { sap: { uuid: "u1", label: "D01" }, root: "C:\\proj\\D01" })], {}, { activeSap: SAP });
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Kökü D01 proje klasörü yap" }));
    expect(c.setWorkspaceRoot).toHaveBeenCalledWith("a", "C:\\proj\\D01", { uuid: "u1", label: "D01" });
    fireEvent.contextMenu(row("UI"), { clientX: 10, clientY: 10 });
    expect(screen.queryByRole("menuitem", { name: "Kökü D01 proje klasörü yap" })).toBeNull();
    fireEvent.click(screen.getByRole("menuitem", { name: "SAP bağını kaldır" }));
    expect(c.setWorkspaceRoot).toHaveBeenLastCalledWith("b", "C:\\proj\\D01", null);
  });

  it("aktif SAP yokken SAP menü maddesi yok", () => {
    renderSidebar([ws("a", "API")]);
    fireEvent.contextMenu(row("API"), { clientX: 10, clientY: 10 });
    expect(screen.queryByRole("menuitem", { name: /proje klasörü yap/ })).toBeNull();
  });
```

`tests/agentsShell.test.tsx`:

```tsx
// @vitest-environment jsdom
// Bildirim tıklaması ve "Ajanlar" sekmesi rozeti (spec 2026-10-17 ajan-alani §4, §9).
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { LanguageProvider } from "../src/i18n";
import AgentOpenListener from "../src/agents/AgentOpenListener";
import AgentsModeBadge from "../src/agents/AgentsModeBadge";
import { AgentStatusContext } from "../src/agents/agentStatusContext";
import { TerminalStoreContext, type TerminalCommands, type TerminalStoreValue } from "../src/stores/terminalStoreContext";
import { initialTerminalState } from "../src/stores/terminalReducer";
import type { TerminalWorkspace } from "../src/stores/terminalTypes";
import type { AgentStatus } from "../app-electron/shared/agentTypes";

let openListener: ((paneId: string) => void) | null;
let prevApi: unknown;

beforeEach(() => {
  openListener = null;
  prevApi = (window as unknown as { api?: unknown }).api;
  (window as unknown as { api: unknown }).api = {
    onAgentOpen: vi.fn((cb: (paneId: string) => void) => {
      openListener = cb;
      return () => {
        openListener = null;
      };
    })
  };
});

afterEach(() => {
  cleanup();
  (window as unknown as { api: unknown }).api = prevApi;
});

const workspace: TerminalWorkspace = {
  id: "w",
  name: "W",
  panes: [
    { id: "a", kind: "agent", agent: { engine: "axet-code", role: "", roleKind: "custom" }, cwd: "C:\\p", run: { state: "running", ptyId: "t" } }
  ],
  focusedPaneId: null,
  maximizedPaneId: null,
  unread: false,
  error: false
};

function wrap(children: ReactNode, statuses: Record<string, AgentStatus> = {}) {
  const commands = { revealPane: vi.fn() } as unknown as TerminalCommands;
  const store: TerminalStoreValue = {
    state: { ...initialTerminalState, phase: "ready", visible: false, workspaces: [workspace], activeWorkspaceId: "w" },
    commands,
    defaultKind: "cmd",
    defaultCwd: "C:\\a",
    agentCwd: "C:\\axet"
  };
  const r = render(
    <LanguageProvider language="tr">
      <TerminalStoreContext.Provider value={store}>
        <AgentStatusContext.Provider value={{ statuses, engines: [], now: 1, answer: vi.fn(async () => ({ ok: true as const })) }}>
          {children}
        </AgentStatusContext.Provider>
      </TerminalStoreContext.Provider>
    </LanguageProvider>
  );
  return { commands, ...r };
}

describe("AgentOpenListener", () => {
  it("bildirim tıklaması Ajanlar ekranını açıp bölmeyi öne getiriyor; kaldırılınca dinleme bitiyor", () => {
    const onShow = vi.fn();
    const { commands, unmount } = wrap(<AgentOpenListener onShow={onShow} />);
    act(() => openListener?.("a"));
    expect(onShow).toHaveBeenCalledTimes(1);
    expect(commands.revealPane).toHaveBeenCalledWith("a");
    unmount();
    expect(openListener).toBeNull();
  });
});

describe("AgentsModeBadge", () => {
  it("soru bekleyen ajan yoksa çizilmiyor; varsa sayıyla", () => {
    const { container, unmount } = wrap(<AgentsModeBadge />);
    expect(container.querySelector("[data-agents-asking]")).toBeNull();
    unmount();
    const asking: AgentStatus = {
      state: "asking",
      source: "exact",
      lastActivity: 1,
      question: { callId: "c", question: "?", header: "", options: ["A", "B"], multiSelect: false, askedAt: 1 }
    };
    const second = wrap(<AgentsModeBadge />, { a: asking });
    const badge = second.container.querySelector("[data-agents-asking]") as HTMLElement;
    expect(badge.getAttribute("data-agents-asking")).toBe("1");
    expect(badge.getAttribute("title")).toBe("1 soru bekliyor");
  });
});
```

`tests/shellSidebar.test.tsx`: `"Terminal"` geçen beş yerde (satır ~83, 128, 129, 293, 309) adı `"Ajanlar"` yap; `["Sohbet", "Logon", "Terminal"]` → `["Sohbet", "Logon", "Ajanlar"]`; `["Axet Chat", "aXet SAP Logon", "Terminal"]` → `["Axet Chat", "aXet SAP Logon", "Ajanlar"]`; test adı "son sekme Terminal" → "son sekme Ajanlar".

`tests/appTerminalWiring.test.ts`:
- `expect(app).toContain("<TerminalSidebar />");` → `expect(app).toContain("<TerminalSidebar activeSap={activeContext.sap} />");`
- İlk describe'a:

```ts
  it("Ajan Alanı: durum sağlayıcısı, bildirim dinleyicisi ve sekme rozeti", () => {
    expect(app).toContain("<AgentStatusProvider>");
    expect(app).toMatch(/<AgentOpenListener onShow=\{[^}]*\}\s*\/>/);
    expect(app).toContain("terminal: <AgentsModeBadge />");
  });
```

- [ ] **Step 2: Kırmızıyı gör**

Run: `npx vitest run tests/terminalSidebar.test.tsx tests/agentsShell.test.tsx tests/shellSidebar.test.tsx tests/appTerminalWiring.test.ts`
Expected: FAIL — rozet, menü maddeleri, yeni bileşenler ve "Ajanlar" adı yok.

- [ ] **Step 3: Uygula**

`src/agents/AgentOpenListener.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { useTerminalStore } from "../stores/terminalStoreContext";

// Ajan bildirimine tıklanınca (spec 2026-10-17 ajan-alani §9) Ajanlar ekranı
// açılıyor ve o ajanın bölmesi öne geliyor. TerminalStoreProvider'ın İÇİNDE
// çizilmeli: bölmeyi bulmak için deponun komutlarını kullanıyor.
export default function AgentOpenListener({ onShow }: { onShow: () => void }) {
  const { commands } = useTerminalStore();
  const onShowRef = useRef(onShow);
  onShowRef.current = onShow;
  useEffect(
    () =>
      window.api.onAgentOpen((paneId) => {
        onShowRef.current();
        commands.revealPane(paneId);
      }),
    [commands]
  );
  return null;
}
```

`src/agents/AgentsModeBadge.tsx`:

```tsx
import { useT } from "../i18n";
import { useTerminalStore } from "../stores/terminalStoreContext";
import { useAgentStatuses } from "./agentStatusContext";
import { askingCount } from "./agentView";

// Başka moddayken "Ajanlar" sekmesindeki işaret: soru bekleyen ajan sayısı
// (spec 2026-10-17 ajan-alani §4). Kehribar: durum rengi, seçim değil.
export default function AgentsModeBadge() {
  const t = useT();
  const { state } = useTerminalStore();
  const { statuses } = useAgentStatuses();
  const asking = state.workspaces.reduce((sum, w) => sum + askingCount(w, statuses), 0);
  if (asking === 0) return null;
  const label = t("agents.askingCount", { count: asking });
  return (
    <span data-agents-asking={asking} title={label} className="relative flex h-2 w-2 shrink-0">
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-warning-text)]" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
```

`src/components/TerminalSidebar.tsx`:
- İçe aktarımlar:

```ts
import type { ActiveSapContext } from "../../app-electron/shared/types";
import { useAgentStatuses } from "../agents/agentStatusContext";
import { agentPanes, askingCount } from "../agents/agentView";
```

- `const MENU_H = 72;` → `const MENU_ITEM_H = 30;` (yorum: "Menünün yaklaşık satır yüksekliği; madde sayısıyla çarpılıyor.")
- İmza ve ilk satırlar:

```tsx
export default function TerminalSidebar({ activeSap = null }: { activeSap?: ActiveSapContext | null } = {}) {
  const t = useT();
  const { state, commands } = useTerminalStore();
  const { statuses } = useAgentStatuses();
```

- `requestClose`'un altına:

```tsx
  // Alanın kökü (spec 2026-10-17 ajan-alani §3): yeni ajanların klasörü.
  // Elle seçilen kök SAP bağını düşürüyor: kök artık o sistemin klasörü değil.
  const pickRoot = async (w: TerminalWorkspace) => {
    setMenu(null);
    const folder = await window.api.pickFolder();
    if (folder) commands.setWorkspaceRoot(w.id, folder, null);
  };

  const linkSap = (w: TerminalWorkspace) => {
    setMenu(null);
    if (activeSap) commands.setWorkspaceRoot(w.id, activeSap.projectDir, { uuid: activeSap.uuid, label: activeSap.systemId });
  };

  const unlinkSap = (w: TerminalWorkspace) => {
    setMenu(null);
    commands.setWorkspaceRoot(w.id, w.root ?? null, null);
  };
```

- `const menuTarget = …` satırının altına:

```tsx
  const canLinkSap = Boolean(activeSap && menuTarget && menuTarget.sap?.uuid !== activeSap.uuid);
  const menuHeight = 8 + MENU_ITEM_H * (3 + (canLinkSap ? 1 : 0) + (menuTarget?.sap ? 1 : 0));
```

- Satırda `title={w.name}` → `title={w.root ? `${w.name} — ${w.root}` : w.name}`; `const dot = workspaceDot(w);` altına:

```tsx
          const agents = agentPanes(w).length;
          const asking = askingCount(w, statuses);
```

- Satırdaki `<span className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">{w.panes.length}</span>` yerine:

```tsx
              {w.sap && <span className="shrink-0 font-mono text-2xs text-slate-500">{w.sap.label}</span>}
              {asking > 0 && (
                <span
                  data-asking={asking}
                  title={t("agents.askingCount", { count: asking })}
                  className="shrink-0 rounded-full bg-[var(--status-warning-bg)] px-1.5 font-mono text-2xs tabular-nums text-[var(--status-warning-text)]"
                >
                  {asking}
                </span>
              )}
              <span title={t("agents.agentCount", { count: agents })} className="shrink-0 font-mono text-2xs tabular-nums text-slate-500">
                {agents}
              </span>
```

- Menüde `top: Math.max(EDGE, Math.min(menu.y, window.innerHeight - MENU_H - EDGE))` → `menuHeight`. "Yeniden adlandır" ile "Kapat" maddeleri arasına (aynı `className` ile):

```tsx
            <button
              type="button"
              role="menuitem"
              onClick={() => void pickRoot(menuTarget)}
              className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
            >
              {t("agents.menuRoot")}
            </button>
            {canLinkSap && activeSap && (
              <button
                type="button"
                role="menuitem"
                onClick={() => linkSap(menuTarget)}
                className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
              >
                {t("agents.menuLinkSap", { sid: activeSap.systemId })}
              </button>
            )}
            {menuTarget.sap && (
              <button
                type="button"
                role="menuitem"
                onClick={() => unlinkSap(menuTarget)}
                className="flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-hover hover:text-slate-100"
              >
                {t("agents.menuUnlinkSap")}
              </button>
            )}
```

- Kapatma onayı metni (`terminal.closeWorkspaceBody` "…{count} terminal kapanacak.") aynen kalıyor.

`src/shell/Sidebar.tsx`: `lucide-react` içe aktarımına `Bot` ekle (`TerminalSquare` başka yerde kullanılmıyorsa çıkar); `MODE_ICON`'da `terminal: Bot`.

`src/App.tsx`:
- İçe aktarımlar:

```ts
import { AgentStatusProvider } from "./agents/agentStatusContext";
import AgentOpenListener from "./agents/AgentOpenListener";
import AgentsModeBadge from "./agents/AgentsModeBadge";
```

- `handleOpenProjectTerminal`'ın altına:

```ts
  // Ajan bildirimine tıklanınca (spec 2026-10-17 ajan-alani §9).
  const handleShowAgents = useCallback(() => setActivity("terminal"), []);
```

- `<TerminalStoreProvider …>` açılışının hemen altına `<AgentStatusProvider>` ve `<AgentOpenListener onShow={handleShowAgents} />`; `</TerminalStoreProvider>` kapanışının hemen üstüne `</AgentStatusProvider>`.
- `modeBadges={activity === "axetCode" ? undefined : { axetCode: <ChatModeBadge /> }}` →

```tsx
            modeBadges={{
              ...(activity === "axetCode" ? {} : { axetCode: <ChatModeBadge /> }),
              ...(activity === "terminal" ? {} : { terminal: <AgentsModeBadge /> })
            }}
```

- `<TerminalSidebar />` → `<TerminalSidebar activeSap={activeContext.sap} />`.

`src/i18n/tr.ts`: `"shell.modeTerminal": "Ajanlar",`, `"shell.terminal": "Ajanlar",`, `"shortcuts.modeTerminal": "Ajanlar ekranına geç",`; agents bloğuna:

```ts
  "agents.askingCount": "{count} soru bekliyor",
  "agents.agentCount": "{count} ajan",
  "agents.menuRoot": "Kök klasör…",
  "agents.menuLinkSap": "Kökü {sid} proje klasörü yap",
  "agents.menuUnlinkSap": "SAP bağını kaldır"
```

`src/i18n/en.ts`: `"shell.modeTerminal": "Agents",`, `"shell.terminal": "Agents",`, `"shortcuts.modeTerminal": "Switch to agents",`; agents bloğuna:

```ts
  "agents.askingCount": "{count} waiting for an answer",
  "agents.agentCount": "{count} agents",
  "agents.menuRoot": "Root folder…",
  "agents.menuLinkSap": "Use the {sid} project folder as root",
  "agents.menuUnlinkSap": "Remove SAP link"
```

- [ ] **Step 4: Yeşili gör**

Run: `npx vitest run tests/terminalSidebar.test.tsx tests/agentsShell.test.tsx tests/shellSidebar.test.tsx tests/appTerminalWiring.test.ts tests/shortcutsModal.test.tsx tests/commandPalette.test.tsx tests/i18n.test.ts` ve `npm run typecheck`
Expected: PASS; typecheck temiz. Kısayol/komut paleti testlerinde "Terminal ekranına geç" ya da "Terminal" adı bekleyen bir satır çıkarsa yeni ada ("Ajanlar ekranına geç" / "Ajanlar") çevir ve ledger'a yaz.

- [ ] **Step 5: Commit**

```bash
git add src/components/TerminalSidebar.tsx src/agents/AgentOpenListener.tsx src/agents/AgentsModeBadge.tsx src/shell/Sidebar.tsx src/App.tsx src/i18n/tr.ts src/i18n/en.ts tests/terminalSidebar.test.tsx tests/agentsShell.test.tsx tests/shellSidebar.test.tsx tests/appTerminalWiring.test.ts
git commit -m "Ajan Alani: kenar cubugu rozetleri, alan koku menusu, Ajanlar adi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Kullanım rehberi, tam doğrulama ve elle deneme listesi

**Files:**
- Modify: `KULLANIM-REHBERI.md`

**Interfaces:**
- Consumes: bütün önceki task'lar.
- Produces: rehberde "Ajanlar Ekranı" bölümü; yeşil tam takım; kullanıcıya elle deneme listesi.

- [ ] **Step 1: Rehber** — `KULLANIM-REHBERI.md`

"## Soldaki Ray — Üç Modül" listesinde **SAP GUI Scripting** maddesinin altına:

```markdown
- **Ajanlar** (robot ikonu, **Ctrl+3**) — Eski Terminal ekranının yerini aldı.
  Birden çok yapay zekâ ajanını kendi terminallerinde yan yana çalıştırırsın;
  ayrıntı aşağıda, "Ajanlar Ekranı" bölümünde.
```

"## Klavye Kısayolları" başlığının hemen ÖNÜNE:

```markdown
## Ajanlar Ekranı

Birden çok yapay zekâ ajanının yan yana çalıştığı çalışma alanı. SAP'ye bağlı
değil: herhangi bir klasörde ya da Git deposunda kullanılabilir.

- **Ajan ekle**: üst şeritteki **Ajan** düğmesi. Ad, motor (axet-code, Claude
  Code, Codex, Gemini CLI ya da kendi yazdığın bir komut), rol, klasör ve renk
  seçersin. axet-code'da rol listesi axet-code'un kendi ajanlarından gelir
  (`coder`, `task`, `guide`…); ajan o rolle başlar. Kurulu olmayan bir motor
  seçilebilir ama kartında "Kurulu değil" yazar ve başlamaz.
- **Ekip şeridi**: her ajanın kartı — ad, rol, motor ve durum (Çalışıyor, Soru
  soruyor, Boşta 3 dk, Bitti, Hata). Karta tıklayınca o ajanın terminali öne
  gelir. Durumun yanında **≈** varsa durum tahminidir: o motorun kendi kaydı
  okunamıyor, terminal hareketinden tahmin ediliyor. axet-code ajanlarında
  durum, ilk isteğini yazdıktan sonra axet-code'un kendi kaydından okunur.
- **Kararlar**: sağdaki panel bütün ajanların cevap bekleyen sorularını
  toplar. axet-code'un seçenekli sorusunu buradan tek tıkla cevaplayabilirsin;
  o soruya terminalde dokunduysan ya da serbest metin/çok seçimli bir soruysa
  **Terminale git** ile terminalden cevaplarsın.
- **Bildirim**: pencere arka plandayken bir ajan soru sorarsa ya da işini
  bitirirse Windows bildirimi gelir (Ayarlar'daki sohbet bildirimi ayarı). Yalnız
  durumu kesin bilinen ajanlar için; tahmini durumda bildirim çıkmaz.
- **Düz terminal**: **Terminal** düğmesi ya da bölme başlığındaki böl
  düğmeleriyle cmd/PowerShell bölmesi açmaya devam edebilirsin.
- **Çalışma alanının kökü**: kenar çubuğunda alana sağ tıklayıp **Kök klasör…**
  ile yeni ajanların varsayılan klasörünü seçersin. Bir SAP sistemine bağlıyken
  **Kökü {SID} proje klasörü yap** o sistemin proje klasörünü kök yapar. SAP
  yazma onayı ve QA/PRD salt okunur kuralları ajanlar için de aynen geçerlidir.
- Kenar çubuğunda her alanın yanında ajan sayısı, soru bekleyen ajan varsa
  kehribar bir sayı görünür. Başka ekrandayken **Ajanlar** sekmesinde de nokta
  belirir.
- Bir alanda en fazla 9 bölme (ajanlar dahil), en fazla 6 alan olur. Eski
  Terminal düzenin kaybolmaz: eski axet-code bölmeleri axet-code ajanı olarak
  açılır.
```

- [ ] **Step 2: Tam doğrulama**

Run: `npm run typecheck`
Expected: temiz.

Run: `npx vitest run > .superpowers/vitest-ajan.txt 2>&1` ve dosyanın sonundaki özeti oku.
Expected: bütün dosyalar PASS. Bir test kırmızıysa: bu planın değiştirdiği bir davranışı eski hâliyle bekliyorsa (ör. "Terminal" adı, `axet` bölme türü), beklentiyi yeni davranışa çevir ve ledger'a yaz; değilse sistematik hata ayıklamaya geç (bu task'ı kapatmadan).

Run: `git status --short`
Expected: yalnız `KULLANIM-REHBERI.md` değişmiş; `resources/rfc-runtime`, `resources/guiscript-runtime`, `resources/sap-toolkit/auth-plus/scripts/`, `release-*` stage edilmemiş.

- [ ] **Step 3: Commit**

```bash
git add KULLANIM-REHBERI.md
git commit -m "Rehber: Ajanlar ekrani

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Elle deneme listesini kullanıcıya ver** (spec §12; geliştirme sunucusunu sen başlatma)

1. Ajanlar ekranında (Ctrl+3) aynı klasörde iki axet-code ajanı ekle; ikisine farklı birer istem yaz → iki kart da "≈" işaretini kaybedip kesin duruma geçmeli.
2. Birine "ask_user ile bana tek seçimli bir renk sorusu sor" yaz → kart "Soru soruyor", Kararlar'da satır; seçenek düğmesiyle cevapla → terminalde seçim görünmeli, satır kalkmalı.
3. Aynı soruyu tekrar sordur, terminalde ok tuşuna bas, sonra Kararlar'dan dene → "terminalde dokunuldu" uyarısı, tuş gitmemeli.
4. Pencereyi küçült, bir ajana uzun bir iş ver → bitince "Ajan işini bitirdi" bildirimi; tıklayınca o bölme öne gelmeli.
5. Bir Claude Code/Codex ajanı ekle (kurulu değilse "Kurulu değil" kartı görünmeli).
6. "Terminal" düğmesiyle düz cmd/PowerShell bölmesi aç; eski kayıtlı düzen geri yüklemesinde axet-code bölmelerinin ajan olarak geldiğini doğrula.

---

## Spec kapsama özeti

| Spec | Task |
|---|---|
| §2.1 Ajanlar ekranı, Ctrl+3 | 15 |
| §2.2, §4 ajan ekleme penceresi | 12, 13 |
| §2.3 bölmeli terminal altyapısı | 4, 10, 13 |
| §2.4, §4 ekip şeridi | 11, 13 |
| §2.5, §6 durum + kaynak (kesin/tahmini) | 6, 7, 8, 11 |
| §2.6, §7 Kararlar | 2, 8, 14 |
| §2.7, §9 bildirim | 8, 9, 15 |
| §2.8 düz terminal | 4, 13 |
| §3 veri modeli, kök/SAP, göç | 4, 15 |
| §5 başlatma, izin kipi, model bayrağı | 2, 4, 10 |
| §6.1 istem→oturum eşleme | 5, 7 |
| §8 SAP kuralları değişmez | Global Constraints (dokunulmuyor) |
| §10 hata durumları | 3, 6, 7, 8, 10, 13 |
| §11 günlük | 8, 9 |
| §12 test + elle doğrulama | her task, 16 |
| §13.2, §14.3 TUI tuş dizisi ölçümü | 1 |
| §14.2 axet-code ajan listesi, `--agent` | 2, 3, 12 |

