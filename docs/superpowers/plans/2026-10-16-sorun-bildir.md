# Sorun bildir — uygulama planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Amaç:** Kullanıcının tek tıkla, ne gönderdiğini görerek, gizli değer sızdırmadan bir destek paketi (zip) oluşturup Outlook taslağıyla göndermesi.

**Mimari:** Ana süreçte `app-electron/main/support/` altında dört küçük modül var: maskeleme, zip yazıcı, paket kurucu ve Outlook taslağı. İki IPC kanalı bunları açıyor (`support:preview`, `support:create`). Renderer'da tek bir pencere (`SupportDialog`), Ayarlar → Gelişmiş'te bir eylem satırı ve komut paletinde bir komut var.

**Teknoloji:** Electron 44 (Node 24: `zlib.crc32` var), React 18, TypeScript, vitest 2 + jsdom. Yeni bağımlılık yok.

**Spec:** `docs/superpowers/specs/2026-10-16-sorun-bildir-design.md`

## Genel kurallar

- **Yazım ve commit:**
  - Kod yorumları tam Türkçe karakterle.
  - Commit mesajları ASCII Türkçe; sonunda `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - `git add` dosya dosya, `-A` yok.
  - Dal: `ozellik/ajan-yetenekleri`.
- **Düzenleme:** prettier yok. Satır sonu dosyanın kendi satır sonu; Edit aracı ya da satır sonunu koruyan node betiği. heredoc/sed ters eğik çizgiyi yutuyor.
- **Paket konumu:** `Belgeler\NTT Studio Destek\ntt-studio-destek-<YYYYMMDD-HHmmss>.zip`.
- **Boyut:** günlük dosyası başına en fazla 2 MB (sondan).
- **Maske metni:** `«gizli»`. 8 karakterden kısa bilinen değerler maskelenmez.
- **Asla pakete girmeyenler:** `.conn_adt`, ham `config.json`, `.saml_cookies.json`, `axet-code.db*`, ekler, `sap-context.md`.
- **Gönderim:** uygulama hiçbir yere veri göndermez; yalnız Outlook taslağı açar ya da klasörü gösterir.
- **Destek adresi:** varsayılan `tufan.sasmaz@nttdata.com` (`config.supportEmail`), Ayarlar'dan değişir, boş olabilir.
- **Outlook:** PowerShell COM; değerler ortam değişkeniyle geçer, komut satırına gömülmez. Zaman aşımı 20 sn.
- **Komutlar:** `npm run typecheck`, `npx vitest run <dosya>`, tam takım `npx vitest run`.

**Spec'ten sapma (bilinçli):** `support:create` sohbet kimliği yerine hazır markdown alıyor (`chatMarkdown: string | null`). Sebep: sohbeti markdown'a çeviren `chatToMarkdown` renderer'da (`src/lib/chatExport.ts`), ana süreçte kopyası olmasın. Ana süreç metni yine maskeliyor.

## İnceleme odağı

1. Yüzlerce MB'lik `axet-code.log` → yalnız son 2 MB okunur, bellek şişmez. (Görev 3 testi)
2. Bağlı proje yok ya da günlük dosyası yok → paket yine oluşur, `bilgi.json` eksikleri söyler. (Görev 3 testi)
3. Sondan kesilen günlüğün ilk satırı yarım bir anahtar taşıyabilir → yarım ilk satır atılır. (Görev 3 testi)
4. Outlook kurulu değil, COM hata veriyor ya da takılıyor → 20 sn içinde klasöre düşer. (Görev 4 testi)
5. Türkçe dosya adı ve notu → zip Windows'ta ve Python'da açılıyor, adlar doğru. (Görev 2 testi)

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `app-electron/main/support/redact.ts` (yeni) | Maskeleme (Görev 1) |
| `app-electron/main/support/zipWriter.ts` (yeni) | Bağımlılıksız zip (Görev 2) |
| `app-electron/main/support/bundle.ts` (yeni) | Paket içeriği: dosyalar, sohbet zamanları, bilgi (Görev 3) |
| `app-electron/main/support/outlookDraft.ts` (yeni) | Outlook taslağı ya da klasör (Görev 4) |
| `app-electron/main/support/ipc.ts` (yeni) | `support:preview`, `support:create`; kaynak ve sır toplama (Görev 5) |
| `app-electron/main/sapWrite/server.ts` (değişir) | Etkin onay anahtarlarını dışa veren fonksiyon (Görev 5) |
| `app-electron/shared/types.ts`, `app-electron/main/store.ts` (değişir) | `supportEmail` (Görev 5) |
| `app-electron/main/index.ts`, `app-electron/preload/index.ts`, `src/window.d.ts` (değişir) | Kayıt ve köprü (Görev 5) |
| `src/components/SupportDialog.tsx` (yeni) | Pencere (Görev 6) |
| `src/components/SettingsModal.tsx`, `src/components/settings/settingsSections.ts`, `src/components/AppCommandPalette.tsx`, `src/App.tsx`, `src/i18n/tr.ts`, `en.ts` (değişir) | Giriş noktaları ve metinler (Görev 6) |

---

### Görev 1: Maskeleme

**Dosyalar:**
- Yeni: `app-electron/main/support/redact.ts`
- Test: `tests/supportRedact.test.ts`

**Arayüzler:**
- Üretir:

```ts
export const MASK = "«gizli»";
export interface RedactResult { text: string; counts: Record<string, number> } // kalıp adı → kaç kez
export function redact(text: string, secrets: readonly string[]): RedactResult;
export function addCounts(into: Record<string, number>, from: Record<string, number>): void;
```

Kalıp adları: `known`, `authorization`, `bearer`, `github`, `jwt`, `keyValue`.

- [ ] **Adım 1: Kırmızı test**

```ts
// Destek paketinde maskeleme (spec 2026-10-16 §5).
import { describe, expect, it } from "vitest";
import { MASK, addCounts, redact } from "../app-electron/main/support/redact";

describe("redact", () => {
  it("bilinen değer birebir; 8 karakterden kısası atlanıyor", () => {
    const r = redact("anahtar=AAAAbbbbCCCCdddd ve kisa=abc", ["AAAAbbbbCCCCdddd", "abc"]);
    expect(r.text).toBe(`anahtar=${MASK} ve kisa=abc`);
    expect(r.counts.known).toBe(1);
  });

  it("Bearer, Authorization, GitHub anahtarları, JWT", () => {
    const text = [
      "Authorization: Basic dXNlcjpwYXNzd29yZA==",
      "header Bearer abcdefgh12345678",
      "pat ghp_" + "a".repeat(36) + " ve github_pat_" + "B".repeat(40),
      "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlMTI"
    ].join("\n");
    const r = redact(text, []);
    expect(r.text).not.toMatch(/dXNlcjpwYXNz|abcdefgh12345678|ghp_a|github_pat_B|eyJhbGci/);
    expect(r.counts.authorization).toBe(1);
    expect(r.counts.bearer).toBe(1);
    expect(r.counts.github).toBe(2);
    expect(r.counts.jwt).toBe(1);
  });

  it("anahtar=değer: ad kalıyor, değer gidiyor; Türkçe adlar da", () => {
    const r = redact(
      'password=Gizli123! "token": "xyz12345678" ADT_SAP_PASSWORD=Sifre99 şifre: deneme1 parola=abc',
      []
    );
    expect(r.text).toBe(`password=${MASK} "token": "${MASK}" ADT_SAP_PASSWORD=${MASK} şifre: ${MASK} parola=${MASK}`);
    expect(r.counts.keyValue).toBe(5);
  });

  it("sıradan metne dokunmuyor", () => {
    const text = 'input_tokens: 1234 "tokens":5 password policy changed token count 42';
    const r = redact(text, []);
    expect(r.text).toBe(text);
    expect(r.counts).toEqual({});
  });

  it("zaten maskelenmiş değer ikinci kez sayılmıyor", () => {
    const r = redact("token=AAAAbbbbCCCCdddd", ["AAAAbbbbCCCCdddd"]);
    expect(r.text).toBe(`token=${MASK}`);
    expect(r.counts).toEqual({ known: 1 });
  });

  it("addCounts topluyor", () => {
    const total: Record<string, number> = { known: 1 };
    addCounts(total, { known: 2, jwt: 1 });
    expect(total).toEqual({ known: 3, jwt: 1 });
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/supportRedact.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Uygula** — `app-electron/main/support/redact.ts`

```ts
// Destek paketine giren her metin buradan geçiyor (spec 2026-10-16 §5).
// Önce bilinen değerler birebir (ADT anahtarı, onay anahtarları, kayıtlı
// şifreler), sonra kalıplar. Değerler hiçbir yere yazılmıyor; yalnız kaç kez
// maskelendiği sayılıyor ve `bilgi.json`'a o sayı giriyor.

export const MASK = "«gizli»";

export interface RedactResult {
  text: string;
  counts: Record<string, number>;
}

const MIN_SECRET = 8;

// Ad ve ayıraç kalıyor, değer gidiyor. `\b` Türkçe harfte (ş) çalışmadığı için
// solda ASCII kelime karakteri olmaması lookbehind ile isteniyor.
const KEY_VALUE =
  /(?<![A-Za-z0-9_])(password|passwd|pwd|parola|şifre|token|secret|api[_-]?key|ADT_SAP_PASSWORD|ABAP_HTTP_TOKEN|ADT_APPROVAL_TOKEN)(["']?\s*[=:]\s*["']?)([^\s"',;}]+)/giu;

const PATTERNS: { name: string; re: RegExp; replace: (match: string, ...groups: string[]) => string }[] = [
  {
    name: "authorization",
    re: /(Authorization["']?\s*[:=]\s*["']?)(?:Basic|Bearer)?\s*[A-Za-z0-9._~+/=-]{6,}/gi,
    replace: (_m, head) => `${head}${MASK}`
  },
  { name: "bearer", re: /Bearer\s+[A-Za-z0-9._~+/=-]{8,}/g, replace: () => `Bearer ${MASK}` },
  { name: "github", re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g, replace: () => MASK },
  { name: "jwt", re: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, replace: () => MASK }
];

function bump(counts: Record<string, number>, name: string): void {
  counts[name] = (counts[name] ?? 0) + 1;
}

export function redact(text: string, secrets: readonly string[]): RedactResult {
  const counts: Record<string, number> = {};
  let out = text;
  // Uzun değer önce: biri ötekinin parçasıysa kısası uzunu bölmesin.
  for (const secret of [...new Set(secrets)].filter((s) => s.length >= MIN_SECRET).sort((a, b) => b.length - a.length)) {
    const parts = out.split(secret);
    if (parts.length > 1) {
      counts.known = (counts.known ?? 0) + parts.length - 1;
      out = parts.join(MASK);
    }
  }
  for (const p of PATTERNS) {
    out = out.replace(p.re, (...args: string[]) => {
      const match = args[0];
      if (match.includes(MASK)) return match;
      bump(counts, p.name);
      return p.replace(match, ...args.slice(1));
    });
  }
  out = out.replace(KEY_VALUE, (match: string, name: string, sep: string, value: string) => {
    if (value === MASK || value.startsWith(MASK)) return match;
    bump(counts, "keyValue");
    return `${name}${sep}${MASK}`;
  });
  return { text: out, counts };
}

export function addCounts(into: Record<string, number>, from: Record<string, number>): void {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/supportRedact.test.ts`
Beklenen: 6/6 PASS. "Authorization: Basic …" satırında `bearer` da eşleşmemeli; eşleşirse `authorization` kalıbının `MASK` sonrası `includes(MASK)` denetimiyle atlandığını kontrol et.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/main/support/redact.ts
git add tests/supportRedact.test.ts
git commit -m "Sorun bildir: destek paketi icin maskeleme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 2: Zip yazıcı

**Dosyalar:**
- Yeni: `app-electron/main/support/zipWriter.ts`
- Test: `tests/supportZip.test.ts`

**Arayüzler:**
- Üretir:

```ts
export interface ZipEntry { name: string; data: Buffer }
export function buildZip(entries: readonly ZipEntry[], date?: Date): Buffer;
```

- [ ] **Adım 1: Kırmızı test**

```ts
// Bağımlılıksız zip (spec 2026-10-16 §6). Python varsa onunla açılıyor; yoksa
// Node ile başlıklar ve CRC denetleniyor.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { crc32, inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { buildZip } from "../app-electron/main/support/zipWriter";

const ENTRIES = [
  { name: "bilgi.json", data: Buffer.from('{"a":1}') },
  { name: "not-şçğ.txt", data: Buffer.from("Ne oldu: sohbet açılmıyor — çok yavaş.\n".repeat(50), "utf-8") }
];

describe("buildZip", () => {
  it("yerel başlık, merkezi dizin ve EOCD tutarlı; veri açılıyor", () => {
    const zip = buildZip(ENTRIES, new Date(2026, 9, 16, 14, 30, 10));
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    const eocd = zip.length - 22;
    expect(zip.readUInt32LE(eocd)).toBe(0x06054b50);
    expect(zip.readUInt16LE(eocd + 10)).toBe(2);
    // İlk girdinin verisi: başlık 30 + ad uzunluğu sonrası, sıkıştırılmış boy kadar.
    const nameLen = zip.readUInt16LE(26);
    const compSize = zip.readUInt32LE(18);
    const raw = inflateRawSync(zip.subarray(30 + nameLen, 30 + nameLen + compSize));
    expect(raw.toString()).toBe('{"a":1}');
    expect(zip.readUInt32LE(14)).toBe(crc32(ENTRIES[0].data));
    // UTF-8 ad bayrağı
    expect(zip.readUInt16LE(6) & 0x0800).toBe(0x0800);
  });

  it("Python zipfile açabiliyor, Türkçe ad ve içerik doğru (Python yoksa atlanır)", () => {
    const probe = spawnSync("py", ["-3", "--version"], { encoding: "utf-8" });
    if (probe.status !== 0) return;
    const dir = mkdtempSync(path.join(tmpdir(), "zip-"));
    const file = path.join(dir, "t.zip");
    writeFileSync(file, buildZip(ENTRIES));
    const res = spawnSync(
      "py",
      ["-3", "-c", "import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);z.testzip();print(json.dumps({n:len(z.read(n)) for n in z.namelist()}))", file],
      { encoding: "utf-8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } }
    );
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout)).toEqual({ "bilgi.json": 7, "not-şçğ.txt": ENTRIES[1].data.length });
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/supportZip.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Uygula** — `app-electron/main/support/zipWriter.ts`

```ts
// Destek paketi için bağımlılıksız zip (spec 2026-10-16 §6). Paket küçük
// (en fazla ~10 MB): ZIP64 yok. Adlar UTF-8 (genel amaçlı bayrak bit 11),
// sıkıştırma deflate, sağlama Node'un `zlib.crc32`'si.

import { crc32, deflateRawSync } from "node:zlib";

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const UTF8_FLAG = 0x0800;
const DEFLATE = 8;
const VERSION = 20;

function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}

export function buildZip(entries: readonly ZipEntry[], date: Date = new Date()): Buffer {
  const { time, date: day } = dosTime(date);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf-8");
    const comp = deflateRawSync(entry.data);
    const crc = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(VERSION, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(DEFLATE, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(VERSION, 4);
    central.writeUInt16LE(VERSION, 6);
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(DEFLATE, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    // ek alan, yorum, disk, iç/dış öznitelik: 0
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + comp.length;
  }
  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, eocd]);
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/supportZip.test.ts`
Beklenen: 2/2 PASS (Python yoksa ikincisi erken dönerek geçer).

- [ ] **Adım 5: Commit**

```bash
git add app-electron/main/support/zipWriter.ts
git add tests/supportZip.test.ts
git commit -m "Sorun bildir: bagimliliksiz zip yazici" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 3: Paket kurucu

**Dosyalar:**
- Yeni: `app-electron/main/support/bundle.ts`
- Test: `tests/supportBundle.test.ts`

**Arayüzler:**
- Tüketir: Görev 1 `redact`, `addCounts`; Görev 2 `ZipEntry`.
- Üretir:

```ts
export const MAX_LOG_BYTES = 2 * 1024 * 1024;
export interface BundleSources {
  appLogPath: string;            // userData/logs/ntt-studio.log (".1" yanında aranır)
  projectDir: string | null;     // bağlı sistemin proje klasörü
  chatState: ChatSessionsState;
  info: Record<string, unknown>; // bilgi.json'un temeli (sürümler, sistem, Doktor…)
  secrets: readonly string[];    // birebir maskelenecek değerler
}
export interface BundleRequest { note: string; chatMarkdown: string | null }
export function readTail(file: string, max?: number): string;
export function chatTimings(state: ChatSessionsState): unknown[];
export function bundleFileNames(src: Pick<BundleSources, "appLogPath" | "projectDir">, req: BundleRequest): string[];
export function buildBundleEntries(src: BundleSources, req: BundleRequest): { entries: ZipEntry[]; redactions: Record<string, number> };
```

- [ ] **Adım 1: Kırmızı test** — `tests/supportBundle.test.ts`

```ts
// Destek paketinin içeriği (spec 2026-10-16 §4). Geçici klasörlerde; SAP yok.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_LOG_BYTES, buildBundleEntries, bundleFileNames, readTail } from "../app-electron/main/support/bundle";
import type { ChatSessionsState } from "../app-electron/shared/types";

const TOKEN = "TOKEN-abcdef0123456789";
const SECRET_TEXT = "musteri-gizli-metni";

let root = "";
let appLog = "";
let projectDir = "";

const CHAT: ChatSessionsState = {
  activeId: "s1",
  sessions: [
    {
      id: "s1",
      title: `Başlık ${SECRET_TEXT}`,
      messages: [
        { id: "m1", role: "user", content: SECRET_TEXT, createdAt: 1000 },
        {
          id: "m2",
          role: "assistant",
          content: `cevap ${SECRET_TEXT}`,
          createdAt: 5000,
          error: true,
          steps: [{ phase: "tool", tool: "view", target: SECRET_TEXT } as never]
        }
      ],
      model: { provider: "axet", model: "claude" },
      draft: "",
      createdAt: 900,
      updatedAt: 5000
    }
  ]
};

function src(over: Partial<Parameters<typeof buildBundleEntries>[0]> = {}) {
  return { appLogPath: appLog, projectDir, chatState: CHAT, info: { surum: "1.8.3" }, secrets: [TOKEN], ...over };
}
const text = (entries: { name: string; data: Buffer }[], name: string) =>
  entries.find((e) => e.name === name)?.data.toString("utf-8") ?? "";

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "bundle-"));
  mkdirSync(path.join(root, "logs"));
  appLog = path.join(root, "logs", "ntt-studio.log");
  writeFileSync(appLog, `tur basladi Bearer abcdefgh12345678 anahtar ${TOKEN}\n`);
  projectDir = path.join(root, "proje");
  mkdirSync(path.join(projectDir, ".axet-code", "logs"), { recursive: true });
  writeFileSync(path.join(projectDir, ".conn_adt"), "ADT_SAP_PASSWORD=Sifre99\n");
  writeFileSync(path.join(projectDir, "config.json"), "{}");
  writeFileSync(path.join(projectDir, ".saml_cookies.json"), "{}");
  writeFileSync(path.join(projectDir, "sap-context.md"), "#");
  writeFileSync(path.join(projectDir, ".axet-code", "axet-code.db"), "db");
  writeFileSync(path.join(projectDir, "adt-readonly.log"), `[adt-http] token: ${TOKEN}\n`);
  // 3 MB'lık ajan günlüğü: satırlar JSON, her biri '{' ile başlıyor.
  const line = `{"level":"INFO","msg":"agent turn finished","token":"${TOKEN}","pad":"${"x".repeat(200)}"}\n`;
  writeFileSync(path.join(projectDir, ".axet-code", "logs", "axet-code.log"), line.repeat(Math.ceil((3 * 1024 * 1024) / line.length)));
});

describe("buildBundleEntries", () => {
  it("yalnız izinli dosyalar; yasaklılar asla yok", () => {
    const { entries } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    expect(entries.map((e) => e.name)).toEqual(["bilgi.json", "ntt-studio.log", "axet-code.log", "adt-sunucu.log", "sohbet-zamanlari.json"]);
    for (const e of entries) {
      expect(e.name).not.toMatch(/conn_adt|config\.json|saml|axet-code\.db|sap-context/);
      expect(e.data.toString("utf-8")).not.toContain("Sifre99");
    }
  });

  it("her metinde bilinen anahtar ve kalıplar maskeli; sayılar bilgi.json'da", () => {
    const { entries, redactions } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    for (const e of entries) expect(e.data.toString("utf-8")).not.toContain(TOKEN);
    expect(text(entries, "ntt-studio.log")).not.toContain("abcdefgh12345678");
    expect(redactions.known).toBeGreaterThan(2);
    expect(JSON.parse(text(entries, "bilgi.json")).maskeleme.known).toBeGreaterThan(2);
  });

  it("büyük günlük: son 2 MB, yarım ilk satır atılmış (inceleme odağı 1, 3)", () => {
    const { entries } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    const log = entries.find((e) => e.name === "axet-code.log")!.data;
    expect(log.length).toBeLessThanOrEqual(MAX_LOG_BYTES);
    expect(log.toString("utf-8").startsWith("{")).toBe(true);
  });

  it("sohbet zamanları: metin ve başlık yok, araç adı ve zamanlar var", () => {
    const { entries } = buildBundleEntries(src(), { note: "", chatMarkdown: null });
    const timings = text(entries, "sohbet-zamanlari.json");
    expect(timings).not.toContain(SECRET_TEXT);
    const parsed = JSON.parse(timings);
    expect(parsed[0].messages[1]).toMatchObject({ role: "assistant", createdAt: 5000, error: true, tools: ["view"] });
    expect(parsed[0].model).toBe("axet/claude");
  });

  it("sohbet metni yalnız istenirse; not kırpılıp maskeleniyor", () => {
    const { entries } = buildBundleEntries(src(), { note: `  çöktü ${TOKEN}  `, chatMarkdown: `# Sohbet\n${TOKEN}` });
    expect(text(entries, "sohbet.md")).toBe("# Sohbet\n«gizli»");
    expect(text(entries, "not.txt")).toBe("çöktü «gizli»");
  });

  it("bağlı proje yoksa proje günlükleri yok, bilgi.json söylüyor (inceleme odağı 2)", () => {
    const { entries } = buildBundleEntries(src({ projectDir: null }), { note: "", chatMarkdown: null });
    expect(entries.map((e) => e.name)).toEqual(["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json"]);
    expect(JSON.parse(text(entries, "bilgi.json")).eksik.join(" ")).toContain("proje");
  });

  it("ön izleme listesi paketle aynı", () => {
    const req = { note: "x", chatMarkdown: "y" };
    expect(bundleFileNames(src(), req)).toEqual(buildBundleEntries(src(), req).entries.map((e) => e.name));
  });
});

describe("readTail", () => {
  it("küçük dosyayı olduğu gibi okuyor", () => {
    expect(readTail(appLog)).toContain("tur basladi");
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/supportBundle.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Uygula** — `app-electron/main/support/bundle.ts`

```ts
// Destek paketinin içeriği (spec 2026-10-16 §4). Electron'a dokunmuyor;
// kaynakları çağıran veriyor (bkz. support/ipc.ts). Yasaklı dosyalar
// (.conn_adt, config.json, SAML çerezleri, axet-code.db, ekler,
// sap-context.md) burada adıyla bile geçmiyor: aday listesi yalnız izinlileri
// sayıyor.

import { closeSync, existsSync, fstatSync, openSync, readSync } from "node:fs";
import path from "node:path";
import type { ChatSessionsState } from "../../shared/types";
import { addCounts, redact } from "./redact";
import type { ZipEntry } from "./zipWriter";

export const MAX_LOG_BYTES = 2 * 1024 * 1024;
const MAX_NOTE = 4000;

export interface BundleSources {
  appLogPath: string;
  projectDir: string | null;
  chatState: ChatSessionsState;
  info: Record<string, unknown>;
  secrets: readonly string[];
}

export interface BundleRequest {
  note: string;
  chatMarkdown: string | null;
}

interface Candidate {
  name: string;
  path: string;
  /** Yoksa `bilgi.json`'da eksik diye yazılsın mı (`.1` yedeği olmayabilir, olağan). */
  expected: boolean;
}

function candidates(src: Pick<BundleSources, "appLogPath" | "projectDir">): Candidate[] {
  const list: Candidate[] = [
    { name: "ntt-studio.log", path: src.appLogPath, expected: true },
    { name: "ntt-studio.log.1", path: `${src.appLogPath}.1`, expected: false }
  ];
  if (src.projectDir) {
    list.push({ name: "axet-code.log", path: path.join(src.projectDir, ".axet-code", "logs", "axet-code.log"), expected: true });
    list.push({ name: "adt-sunucu.log", path: path.join(src.projectDir, "adt-readonly.log"), expected: true });
  }
  return list;
}

/** Dosyanın son `max` baytı; kesildiyse yarım ilk satır atılıyor (yarım bir anahtar maskeden kaçmasın). */
export function readTail(file: string, max = MAX_LOG_BYTES): string {
  const fd = openSync(file, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - max);
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    const text = buf.toString("utf-8");
    if (start === 0) return text;
    const nl = text.indexOf("\n");
    return nl >= 0 ? text.slice(nl + 1) : "";
  } finally {
    closeSync(fd);
  }
}

/** Sohbetlerin zaman çizelgesi: metin, başlık ve araç hedefi YOK. */
export function chatTimings(state: ChatSessionsState): unknown[] {
  return state.sessions.map((s) => ({
    id: s.id,
    titleLength: s.title.length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    model: s.model ? `${s.model.provider}/${s.model.model}` : null,
    messages: s.messages.map((m) => ({
      role: m.role,
      createdAt: m.createdAt,
      length: m.content.length,
      ...(m.error ? { error: true } : {}),
      ...(m.interrupted ? { interrupted: true } : {}),
      attachments: m.attachments?.length ?? 0,
      tools: (m.steps ?? []).map((st) => st.tool).filter((t): t is string => typeof t === "string" && t.length > 0)
    }))
  }));
}

export function bundleFileNames(src: Pick<BundleSources, "appLogPath" | "projectDir">, req: BundleRequest): string[] {
  return [
    "bilgi.json",
    ...candidates(src).filter((c) => existsSync(c.path)).map((c) => c.name),
    "sohbet-zamanlari.json",
    ...(req.chatMarkdown ? ["sohbet.md"] : []),
    ...(req.note.trim() ? ["not.txt"] : [])
  ];
}

export function buildBundleEntries(
  src: BundleSources,
  req: BundleRequest
): { entries: ZipEntry[]; redactions: Record<string, number> } {
  const redactions: Record<string, number> = {};
  const clean = (text: string): string => {
    const r = redact(text, src.secrets);
    addCounts(redactions, r.counts);
    return r.text;
  };
  const utf8 = (s: string) => Buffer.from(s, "utf-8");

  const entries: ZipEntry[] = [];
  const missing: string[] = [];
  if (!src.projectDir) missing.push("proje günlükleri (bağlı sistem yok)");
  for (const c of candidates(src)) {
    if (!existsSync(c.path)) {
      if (c.expected) missing.push(c.name);
      continue;
    }
    entries.push({ name: c.name, data: utf8(clean(readTail(c.path))) });
  }
  entries.push({ name: "sohbet-zamanlari.json", data: utf8(JSON.stringify(chatTimings(src.chatState), null, 2)) });
  if (req.chatMarkdown) entries.push({ name: "sohbet.md", data: utf8(clean(req.chatMarkdown)) });
  const note = req.note.trim().slice(0, MAX_NOTE);
  if (note) entries.push({ name: "not.txt", data: utf8(clean(note)) });

  // En son: maskeleme sayıları öteki dosyaların hepsini kapsasın.
  const info = clean(JSON.stringify({ ...src.info, eksik: missing, maskeleme: { ...redactions } }, null, 2));
  entries.unshift({ name: "bilgi.json", data: utf8(info) });
  return { entries, redactions };
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/supportBundle.test.ts tests/supportRedact.test.ts tests/supportZip.test.ts`
Beklenen: hepsi PASS.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/main/support/bundle.ts
git add tests/supportBundle.test.ts
git commit -m "Sorun bildir: paket icerigi (izinli dosyalar, son 2 MB, sohbet zamanlari, maskeleme)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 4: Outlook taslağı ya da klasör

**Dosyalar:**
- Yeni: `app-electron/main/support/outlookDraft.ts`
- Test: `tests/supportOutlook.test.ts`

**Arayüzler:**
- Üretir:

```ts
export interface DraftMail { to: string; subject: string; body: string; attachment: string }
export const DRAFT_TIMEOUT_MS = 20_000;
export const OUTLOOK_SCRIPT: string;
export function openOutlookDraft(mail: DraftMail, spawnImpl?: SpawnLike, timeoutMs?: number): Promise<boolean>;
export function deliverBundle(mail: DraftMail, deps: { openDraft: (m: DraftMail) => Promise<boolean>; showInFolder: (p: string) => void }): Promise<"outlook" | "folder">;
```

- [ ] **Adım 1: Kırmızı test** — `tests/supportOutlook.test.ts`

```ts
// Outlook taslağı (spec 2026-10-16 §7): değerler ortamda, komut satırında
// değil; başarısızlıkta ve takılmada klasöre düşüş.
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { OUTLOOK_SCRIPT, deliverBundle, openOutlookDraft, type DraftMail } from "../app-electron/main/support/outlookDraft";

const MAIL: DraftMail = {
  to: "destek@example.test",
  subject: "NTT Studio sorun bildirimi — 1.8.3 — D01 (DEV)",
  body: "Ek'teki paket… \"tırnak\" ve $(Get-Date)",
  attachment: "C:\\Users\\x\\Documents\\NTT Studio Destek\\p.zip"
};

function fakeSpawn(behave: "ok" | "fail" | "error" | "hang") {
  const calls: { cmd: string; args: string[]; env: NodeJS.ProcessEnv }[] = [];
  const kill = vi.fn();
  const impl = (cmd: string, args: string[], opts: { env: NodeJS.ProcessEnv }) => {
    calls.push({ cmd, args, env: opts.env });
    const child = Object.assign(new EventEmitter(), { kill });
    setTimeout(() => {
      if (behave === "ok") child.emit("exit", 0);
      if (behave === "fail") child.emit("exit", 1);
      if (behave === "error") child.emit("error", new Error("ENOENT"));
    }, 5);
    return child;
  };
  return { impl, calls, kill };
}

describe("openOutlookDraft", () => {
  it("değerler ortamda; komut satırında ne adres ne konu ne gövde var", async () => {
    const f = fakeSpawn("ok");
    expect(await openOutlookDraft(MAIL, f.impl as never)).toBe(true);
    const { cmd, args, env } = f.calls[0];
    expect(cmd.toLowerCase()).toContain("powershell");
    expect(args).toContain(OUTLOOK_SCRIPT);
    expect(args.join(" ")).not.toContain("destek@example.test");
    expect(args.join(" ")).not.toContain("Get-Date");
    expect(env.NTT_MAIL_TO).toBe(MAIL.to);
    expect(env.NTT_MAIL_SUBJECT).toBe(MAIL.subject);
    expect(env.NTT_MAIL_BODY).toBe(MAIL.body);
    expect(env.NTT_MAIL_ATTACHMENT).toBe(MAIL.attachment);
  });

  it("çıkış kodu 0 değilse ya da başlatılamazsa false", async () => {
    expect(await openOutlookDraft(MAIL, fakeSpawn("fail").impl as never)).toBe(false);
    expect(await openOutlookDraft(MAIL, fakeSpawn("error").impl as never)).toBe(false);
  });

  it("takılırsa zaman aşımında öldürülüp false (inceleme odağı 4)", async () => {
    const f = fakeSpawn("hang");
    expect(await openOutlookDraft(MAIL, f.impl as never, 30)).toBe(false);
    expect(f.kill).toHaveBeenCalled();
  });
});

describe("deliverBundle", () => {
  it("Outlook açılırsa outlook; açılmazsa klasör gösteriliyor", async () => {
    const showInFolder = vi.fn();
    expect(await deliverBundle(MAIL, { openDraft: async () => true, showInFolder })).toBe("outlook");
    expect(showInFolder).not.toHaveBeenCalled();
    expect(await deliverBundle(MAIL, { openDraft: async () => false, showInFolder })).toBe("folder");
    expect(showInFolder).toHaveBeenCalledWith(MAIL.attachment);
  });
});
```

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/supportOutlook.test.ts`
Beklenen: FAIL — modül yok.

- [ ] **Adım 3: Uygula** — `app-electron/main/support/outlookDraft.ts`

```ts
// Destek paketini Outlook taslağına ek olarak koymak (spec 2026-10-16 §7).
// Outlook COM'u PowerShell'den. Adres, konu, gövde ve dosya yolu ORTAMDAN
// okunuyor: komut sabit; kullanıcı metni (not, sistem adı) tırnak ya da `$(…)`
// içerse bile komut olarak çalışmıyor. Outlook yoksa, hata verirse ya da
// takılırsa çağıran klasörü gösteriyor.

import { spawn } from "node:child_process";

export interface DraftMail {
  to: string;
  subject: string;
  body: string;
  attachment: string;
}

export const DRAFT_TIMEOUT_MS = 20_000;

export const OUTLOOK_SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$o = New-Object -ComObject Outlook.Application",
  "$m = $o.CreateItem(0)",
  "if ($env:NTT_MAIL_TO) { $m.To = $env:NTT_MAIL_TO }",
  "$m.Subject = $env:NTT_MAIL_SUBJECT",
  "$m.Body = $env:NTT_MAIL_BODY",
  "[void]$m.Attachments.Add($env:NTT_MAIL_ATTACHMENT)",
  "$m.Display()"
].join("; ");

type ChildLike = {
  on(event: "exit", cb: (code: number | null) => void): unknown;
  on(event: "error", cb: (err: Error) => void): unknown;
  kill(): unknown;
};
export type SpawnLike = (cmd: string, args: string[], opts: { env: NodeJS.ProcessEnv; windowsHide: boolean }) => ChildLike;

export function openOutlookDraft(
  mail: DraftMail,
  spawnImpl: SpawnLike = spawn as unknown as SpawnLike,
  timeoutMs = DRAFT_TIMEOUT_MS
): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      resolve(ok);
    };
    let child: ChildLike;
    try {
      child = spawnImpl("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", OUTLOOK_SCRIPT], {
        env: {
          ...process.env,
          NTT_MAIL_TO: mail.to,
          NTT_MAIL_SUBJECT: mail.subject,
          NTT_MAIL_BODY: mail.body,
          NTT_MAIL_ATTACHMENT: mail.attachment
        },
        windowsHide: true
      });
    } catch {
      finish(false);
      return;
    }
    timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        // zaten bitmiş olabilir
      }
      finish(false);
    }, timeoutMs);
    child.on("exit", (code) => finish(code === 0));
    child.on("error", () => finish(false));
  });
}

export async function deliverBundle(
  mail: DraftMail,
  deps: { openDraft: (m: DraftMail) => Promise<boolean>; showInFolder: (p: string) => void }
): Promise<"outlook" | "folder"> {
  if (await deps.openDraft(mail)) return "outlook";
  deps.showInFolder(mail.attachment);
  return "folder";
}
```

- [ ] **Adım 4: Yeşili gör**

Çalıştır: `npx vitest run tests/supportOutlook.test.ts`
Beklenen: 4/4 PASS.

- [ ] **Adım 5: Commit**

```bash
git add app-electron/main/support/outlookDraft.ts
git add tests/supportOutlook.test.ts
git commit -m "Sorun bildir: Outlook taslagi (degerler ortamda), basarisizsa klasor" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Görev 5: Ana süreç — kaynakları toplama, IPC, destek adresi

**Dosyalar:**
- Yeni: `app-electron/main/support/ipc.ts`
- Değişir: `app-electron/main/sapWrite/server.ts` (dışa açık `activeApprovalTokens`)
- Değişir: `app-electron/shared/types.ts` (`AppConfig.supportEmail`), `app-electron/main/store.ts` (varsayılan + okuma)
- Değişir: `app-electron/main/index.ts` (kayıt), `app-electron/preload/index.ts`, `src/window.d.ts`
- Test: `tests/supportIpc.test.ts`

**Arayüzler:**
- Tüketir: Görev 1–4'ün tümü; `getAdtHttpToken()` (`adtHttpToken.ts`), `decryptSecret()` (`secureStorage.ts`), `probeAdtTools(port)` (`adtReadonlyServerManager.ts`), `runDoctor()` (`doctor.ts`), `appLogPath()`/`appLog()` (`appLog.ts`), `loadChatSessions()` (`chatStore.ts`), `getActiveContext()` (`activeContext.ts`), `axetCodeVersion()`, `readToolkitVersion()`.
- Üretir:

```ts
// support/ipc.ts
export interface SupportCreateRequest { note: string; chatMarkdown: string | null }
export function registerSupportIpc(ipc: { handle(channel: string, fn: (...args: any[]) => unknown): void }): void;
export function createSupportBundle(req: SupportCreateRequest): Promise<SupportCreateResult>;
// sapWrite/server.ts
export function activeApprovalTokens(): string[];
// shared/types.ts (renderer main'e bağlanamaz; tip ortak dosyada)
export type SupportCreateResult = { ok: true; zipPath: string; draft: "outlook" | "folder" } | { ok: false; message: string };
// AppConfig
supportEmail: string; // varsayılan "tufan.sasmaz@nttdata.com"
// preload / window.api
supportPreview(req: { note: string; chatMarkdown: string | null }): Promise<string[]>;
supportCreate(req: { note: string; chatMarkdown: string | null }): Promise<SupportCreateResult>;
```

- [ ] **Adım 1: Kırmızı test** — `tests/supportIpc.test.ts`

```ts
// Sorun bildir uçtan uca (ana süreç): kaynaklar toplanıyor, kayıtlı şifre
// pakete girmiyor, zip Belgeler'de, Outlook yoksa klasör (spec 2026-10-16).
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ root: "", showItemInFolder: vi.fn(), handles: new Map<string, (...a: unknown[]) => unknown>() }));

vi.mock("electron", () => ({
  app: { getPath: (name: string) => `${h.root}/${name}`, getVersion: () => "9.9.9" },
  shell: { showItemInFolder: h.showItemInFolder }
}));
vi.mock("../app-electron/main/appLog", () => ({
  appLogPath: () => path.join(h.root, "logs", "ntt-studio.log"),
  appLog: vi.fn()
}));
vi.mock("../app-electron/main/store", () => ({
  loadConfig: () => ({
    language: "tr",
    skillProfile: "module-consultant",
    supportEmail: "destek@example.test",
    lastCredentials: { a: { username: "U", password: "enc:x", client: "100" } }
  })
}));
vi.mock("../app-electron/main/secureStorage", () => ({ decryptSecret: () => "SapSifre12345" }));
vi.mock("../app-electron/main/adtHttpToken", () => ({ getAdtHttpToken: () => "ADT-TOKEN-0123456789" }));
vi.mock("../app-electron/main/sapWrite/server", () => ({ activeApprovalTokens: () => ["onay".repeat(8)] }));
vi.mock("../app-electron/main/adtReadonlyServerManager", () => ({
  probeAdtTools: async () => ({ alive: true, unauthorized: false, tools: ["adt_get_source", "adt_sql"] })
}));
vi.mock("../app-electron/main/doctor", () => ({ runDoctor: async () => ({ rows: [] }) }));
vi.mock("../app-electron/main/chatStore", () => ({
  loadChatSessions: () => ({ ok: true, state: { activeId: null, sessions: [] } })
}));
vi.mock("../app-electron/main/activeContext", () => ({
  getActiveContext: () => ({
    sap: { uuid: "u", systemId: "D01", client: "100", tier: "DEV", verified: true, projectDir: path.join(h.root, "proje") },
    gui: null
  })
}));
vi.mock("../app-electron/main/axetCodeVersion", () => ({ axetCodeVersion: () => "1.2.3" }));
vi.mock("../app-electron/main/sapToolkit", () => ({ readToolkitVersion: () => ({ version: "t-1" }) }));
vi.mock("../app-electron/main/support/outlookDraft", async () => {
  const real = await vi.importActual<typeof import("../app-electron/main/support/outlookDraft")>(
    "../app-electron/main/support/outlookDraft"
  );
  return { ...real, openOutlookDraft: async () => false };
});

const { createSupportBundle, registerSupportIpc } = await import("../app-electron/main/support/ipc");

/** Zip'in merkezi dizininden adlar ve açılmış içerikler. */
function unzip(file: string): Record<string, string> {
  const buf = readFileSync(file);
  const eocd = buf.length - 22;
  let p = buf.readUInt32LE(eocd + 16);
  const out: Record<string, string> = {};
  for (let i = 0; i < buf.readUInt16LE(eocd + 10); i++) {
    const comp = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf-8");
    const lName = buf.readUInt16LE(local + 26);
    out[name] = inflateRawSync(buf.subarray(local + 30 + lName, local + 30 + lName + comp)).toString("utf-8");
    p += 46 + nameLen;
  }
  return out;
}

beforeEach(() => {
  h.root = mkdtempSync(path.join(tmpdir(), "support-"));
  h.showItemInFolder.mockClear();
  mkdirSync(path.join(h.root, "logs"));
  writeFileSync(path.join(h.root, "logs", "ntt-studio.log"), "giris SapSifre12345 ADT-TOKEN-0123456789\n");
  mkdirSync(path.join(h.root, "proje", ".axet-code", "logs"), { recursive: true });
  writeFileSync(path.join(h.root, "proje", ".conn_adt"), "ADT_SAP_PASSWORD=SapSifre12345\n");
});

describe("createSupportBundle", () => {
  it("zip Belgeler\\NTT Studio Destek'te; şifre ve anahtarlar maskeli; Outlook yoksa klasör", async () => {
    const result = await createSupportBundle({ note: "sohbet takıldı", chatMarkdown: null });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(path.dirname(result.zipPath)).toBe(path.join(h.root, "documents", "NTT Studio Destek"));
    expect(path.basename(result.zipPath)).toMatch(/^ntt-studio-destek-\d{8}-\d{6}\.zip$/);
    expect(result.draft).toBe("folder");
    expect(h.showItemInFolder).toHaveBeenCalledWith(result.zipPath);
    const files = unzip(result.zipPath);
    expect(Object.keys(files)).toEqual(["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json", "not.txt"]);
    const all = Object.values(files).join("\n");
    expect(all).not.toContain("SapSifre12345");
    expect(all).not.toContain("ADT-TOKEN-0123456789");
    const info = JSON.parse(files["bilgi.json"]);
    expect(info).toMatchObject({ uygulama: "9.9.9", rol: "module-consultant", sistem: { sid: "D01", kademe: "DEV" } });
    expect(info.adtSunucu).toEqual({ calisiyor: true, yetkisiz: false, aracSayisi: 2 });
  });

  it("IPC: önizleme listesi ve oluşturma kayıtlı", async () => {
    registerSupportIpc({ handle: (ch, fn) => h.handles.set(ch, fn) });
    const preview = (await h.handles.get("support:preview")!({}, { note: "", chatMarkdown: "x" })) as string[];
    expect(preview).toEqual(["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json", "sohbet.md"]);
    // Bozuk istek: varsayılanlara düşüyor, çökmüyor.
    const res = (await h.handles.get("support:create")!({}, null)) as { ok: boolean };
    expect(res.ok).toBe(true);
    expect(readdirSync(path.join(h.root, "documents", "NTT Studio Destek")).length).toBeGreaterThan(0);
  });
});
```

`unzip` yardımcısı Görev 2'nin biçimine dayanıyor (EOCD'de dizin ofseti 16'da, girdi sayısı 10'da; merkezi başlıkta sıkıştırılmış boy 20'de, ad uzunluğu 28'de, yerel ofset 42'de).

- [ ] **Adım 2: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/supportIpc.test.ts`
Beklenen: FAIL — `support/ipc` yok.

- [ ] **Adım 3: `sapWrite/server.ts`** — `listWriteState`'in üstüne:

```ts
/** Açık onay oturumlarının anahtarları — yalnız destek paketini maskelemek için (bkz. support/ipc.ts). */
export function activeApprovalTokens(): string[] {
  return [...sessions.values()].map((s) => s.token);
}
```

- [ ] **Adım 4: `supportEmail`**

`app-electron/shared/types.ts`, `AppConfig` içinde `sapShcutPathOverride: string | null;` satırının altına:

```ts
  /** "Sorun bildir" taslağının alıcısı; boşsa taslak alıcısız açılıyor. */
  supportEmail: string;
```

Aynı dosyanın sonuna (renderer `app-electron/main`'i göremez, `tsconfig.web.json` yalnız `shared`'ı içeriyor):

```ts
/** "Sorun bildir" sonucu (support:create). */
export type SupportCreateResult =
  | { ok: true; zipPath: string; draft: "outlook" | "folder" }
  | { ok: false; message: string };
```

`app-electron/main/store.ts`, `defaultConfig()` içinde `sapShcutPathOverride: null,` altına:

```ts
    // Kullanıcı, 2026-10-16: destek paketleri ona gelsin.
    supportEmail: "tufan.sasmaz@nttdata.com",
```

ve `loadConfig()`'teki `merged` nesnesine (`chatDisplayName` satırının altına):

```ts
      supportEmail: typeof parsed.supportEmail === "string" ? parsed.supportEmail.trim() : fallback.supportEmail,
```

`npm run typecheck` `AppConfig`'i tam kuran test sahtelerinde eksik alan bildirirse oraya `supportEmail: ""` ekle.

- [ ] **Adım 5: `app-electron/main/support/ipc.ts`**

```ts
// "Sorun bildir"in ana süreç tarafı (spec 2026-10-16). Kaynakları toplar,
// paketi kurar, Belgeler\NTT Studio Destek'e yazar, Outlook taslağını açar ya
// da klasörü gösterir. Gizli değerler yalnız bellekte; pakete ve günlüğe
// yalnız maskeleme sayıları giriyor.

import { mkdirSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { app, shell } from "electron";
import type { AppConfig, SupportCreateResult } from "../../shared/types";
import { getActiveContext } from "../activeContext";
import { getAdtHttpToken } from "../adtHttpToken";
import { probeAdtTools } from "../adtReadonlyServerManager";
import { appLog, appLogPath } from "../appLog";
import { axetCodeVersion } from "../axetCodeVersion";
import { loadChatSessions } from "../chatStore";
import { runDoctor } from "../doctor";
import { activeApprovalTokens } from "../sapWrite/server";
import { readToolkitVersion } from "../sapToolkit";
import { decryptSecret } from "../secureStorage";
import { loadConfig } from "../store";
import { buildBundleEntries, bundleFileNames, type BundleRequest } from "./bundle";
import { deliverBundle, openOutlookDraft } from "./outlookDraft";
import { redact } from "./redact";
import { buildZip } from "./zipWriter";

const ADT_PORT = 8787;
const MAX_NOTE = 4000;

export interface SupportCreateRequest {
  note: string;
  chatMarkdown: string | null;
}

function normalize(raw: unknown): BundleRequest {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    note: typeof r.note === "string" ? r.note.slice(0, MAX_NOTE) : "",
    chatMarkdown: typeof r.chatMarkdown === "string" && r.chatMarkdown ? r.chatMarkdown : null
  };
}

function collectSecrets(config: AppConfig): string[] {
  const out = [getAdtHttpToken(), ...activeApprovalTokens()];
  for (const cred of Object.values(config.lastCredentials ?? {})) {
    const pw = decryptSecret(cred?.password ?? "");
    if (pw) out.push(pw);
  }
  return out.filter((s) => typeof s === "string" && s.length > 0);
}

async function buildInfo(config: AppConfig): Promise<Record<string, unknown>> {
  const sap = getActiveContext().sap;
  const health = await probeAdtTools(ADT_PORT);
  const doctor = await runDoctor().catch((err: unknown) => ({ hata: String(err) }));
  return {
    olusturuldu: new Date().toISOString(),
    uygulama: app.getVersion(),
    electron: process.versions.electron ?? null,
    chromium: process.versions.chrome ?? null,
    windows: os.release(),
    dil: config.language,
    rol: config.skillProfile ?? null,
    axetCode: axetCodeVersion(),
    toolkit: readToolkitVersion()?.version ?? null,
    sistem: sap ? { sid: sap.systemId, client: sap.client, kademe: sap.tier, dogrulandi: sap.verified } : null,
    adtSunucu: { calisiyor: health.alive, yetkisiz: health.unauthorized, aracSayisi: health.tools.length },
    doktor: doctor
  };
}

function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export async function createSupportBundle(raw: unknown): Promise<SupportCreateResult> {
  try {
    const req = normalize(raw);
    const config = loadConfig();
    const sap = getActiveContext().sap;
    const secrets = collectSecrets(config);
    const { entries, redactions } = buildBundleEntries(
      {
        appLogPath: appLogPath(),
        projectDir: sap?.projectDir ?? null,
        chatState: loadChatSessions().state,
        info: await buildInfo(config),
        secrets
      },
      req
    );
    const dir = path.join(app.getPath("documents"), "NTT Studio Destek");
    mkdirSync(dir, { recursive: true });
    const zipPath = path.join(dir, `ntt-studio-destek-${stamp(new Date())}.zip`);
    writeFileSync(zipPath, buildZip(entries));
    appLog("destek.paket", { dosya: entries.length, bayt: statSync(zipPath).size, maske: Object.values(redactions).reduce((a, b) => a + b, 0) });

    const system = sap ? ` — ${sap.systemId} (${sap.tier ?? "?"})` : "";
    const note = redact(req.note.trim(), secrets).text;
    const draft = await deliverBundle(
      {
        to: config.supportEmail ?? "",
        subject: `NTT Studio sorun bildirimi — ${app.getVersion()}${system}`,
        body:
          "Ekteki destek paketi NTT Studio'nun \"Sorun bildir\" komutuyla oluşturuldu; gizli değerler maskelendi.\r\n\r\n" +
          (note ? `Ne oldu:\r\n${note}\r\n` : ""),
        attachment: zipPath
      },
      { openDraft: (m) => openOutlookDraft(m), showInFolder: (p) => shell.showItemInFolder(p) }
    );
    return { ok: true, zipPath, draft };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export function registerSupportIpc(ipc: { handle(channel: string, fn: (...args: any[]) => unknown): void }): void {
  ipc.handle("support:preview", (_event: unknown, raw: unknown) =>
    bundleFileNames({ appLogPath: appLogPath(), projectDir: getActiveContext().sap?.projectDir ?? null }, normalize(raw))
  );
  ipc.handle("support:create", (_event: unknown, raw: unknown) => createSupportBundle(raw));
}
```

- [ ] **Adım 6: Kayıt ve köprü**

`app-electron/main/index.ts`:
- Import: `import { registerSupportIpc } from "./support/ipc";`.
- `registerSapWriteIpc(ipcMain, () => mainWindow);` satırının altına: `registerSupportIpc(ipcMain);`.

`app-electron/preload/index.ts`, `getAdtCapabilities` satırının altına:

```ts
  // "Sorun bildir": pakete girecek dosyalar ve paketi oluşturma (bkz. support/ipc.ts).
  supportPreview: (req: { note: string; chatMarkdown: string | null }): Promise<string[]> =>
    ipcRenderer.invoke("support:preview", req),
  supportCreate: (req: { note: string; chatMarkdown: string | null }): Promise<SupportCreateResult> =>
    ipcRenderer.invoke("support:create", req),
```

Preload başına `import type { SupportCreateResult } from "../shared/types";` eklenir (dosyada zaten `../shared/types` importu varsa ona eklenir).

`src/window.d.ts`, `getAdtCapabilities` satırının altına:

```ts
  supportPreview: (req: { note: string; chatMarkdown: string | null }) => Promise<string[]>;
  supportCreate: (req: { note: string; chatMarkdown: string | null }) => Promise<SupportCreateResult>;
```

`SupportCreateResult` `../app-electron/shared/types`'tan alınır (dosyanın mevcut import satırına eklenir).

- [ ] **Adım 7: Yeşili gör**

Çalıştır: `npx vitest run tests/supportIpc.test.ts tests/supportBundle.test.ts tests/supportOutlook.test.ts` ve `npm run typecheck`
Beklenen: hepsi PASS; typecheck temiz.

- [ ] **Adım 8: Commit**

```bash
git add app-electron/main/support/ipc.ts
git add app-electron/main/sapWrite/server.ts
git add app-electron/shared/types.ts
git add app-electron/main/store.ts
git add app-electron/main/index.ts
git add app-electron/preload/index.ts
git add src/window.d.ts
git add tests/supportIpc.test.ts
git commit -m "Sorun bildir: ana surec (kaynaklar, sifre/anahtar maskeleme, Belgeler'e zip, Outlook ya da klasor), destek adresi ayari" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(typecheck için değiştirilen test sahtelerini de dosya dosya ekle.)

---

### Görev 6: Pencere ve giriş noktaları

**Dosyalar:**
- Yeni: `src/components/SupportDialog.tsx`
- Değişir: `src/components/SettingsModal.tsx`, `src/components/settings/settingsSections.ts`, `src/components/AppCommandPalette.tsx`, `src/App.tsx`, `src/i18n/tr.ts`, `src/i18n/en.ts`
- Test: `tests/supportDialog.test.tsx`

**Arayüzler:**
- Tüketir: Görev 5 `window.api.supportPreview`, `window.api.supportCreate`, `config.supportEmail`; `chatToMarkdown`, `ChatExportInput` (`src/lib/chatExport.ts`); `Modal`, `ModalCancelButton` (`src/ui/Modal.tsx`); `useChatStore` (`src/stores/chatStore.tsx`).
- Üretir:

```tsx
export default function SupportDialog(props: {
  open: boolean;
  onClose: () => void;
  /** Seçili sohbet; yoksa ya da boşsa "sohbeti ekle" kutusu kapalı. */
  chat: ChatExportInput | null;
  onDone: (result: { zipPath: string; draft: "outlook" | "folder" }) => void;
}): JSX.Element;
export function SupportDialogHost(props: Omit<Parameters<typeof SupportDialog>[0], "chat">): JSX.Element; // ChatStoreProvider içinde seçili sohbeti okur
```

- [ ] **Adım 1: Metinler** — `src/i18n/tr.ts` (`"agentCaps.heading"` satırının üstüne):

```ts
  "support.title": "Sorun bildir",
  "support.subtitle": "Günlükler maskelenip bir zip'e konur ve Outlook'ta taslak açılır. Uygulama hiçbir yere kendisi göndermez.",
  "support.noteLabel": "Ne oldu?",
  "support.notePlaceholder": "Ne yapıyordunuz, ne bekliyordunuz, ne oldu?",
  "support.includeChat": "Seçili sohbetin mesajlarını da ekle",
  "support.includeChatHint": "Müşteri verisi içerebilir. Şifre ve anahtarlar yine maskelenir.",
  "support.filesLabel": "Pakete girecekler",
  "support.create": "Paketi oluştur",
  "support.creating": "Oluşturuluyor…",
  "support.failed": "Paket oluşturulamadı: {message}",
  "support.doneOutlook": "Destek paketi Outlook taslağına eklendi.",
  "support.doneFolder": "Destek paketi kaydedildi: {path}",
  "support.emailLabel": "Destek e-posta adresi",
  "support.emailHelper": "\"Sorun bildir\" taslağının alıcısı. Boşsa taslak alıcısız açılır.",
  "support.openAction": "Sorun bildir…",
  "palette.reportProblem": "Sorun bildir",
```

`src/i18n/en.ts` (`"agentCaps.heading"` satırının üstüne):

```ts
  "support.title": "Report a problem",
  "support.subtitle": "Logs are masked and packed into a zip, and an Outlook draft opens. The app never sends anything itself.",
  "support.noteLabel": "What happened?",
  "support.notePlaceholder": "What were you doing, what did you expect, what happened?",
  "support.includeChat": "Include the selected chat's messages",
  "support.includeChatHint": "May contain customer data. Passwords and keys are still masked.",
  "support.filesLabel": "Will be included",
  "support.create": "Create package",
  "support.creating": "Creating…",
  "support.failed": "Could not create the package: {message}",
  "support.doneOutlook": "The support package was attached to an Outlook draft.",
  "support.doneFolder": "Support package saved: {path}",
  "support.emailLabel": "Support e-mail address",
  "support.emailHelper": "Recipient of the \"Report a problem\" draft. If empty, the draft has no recipient.",
  "support.openAction": "Report a problem…",
  "palette.reportProblem": "Report a problem",
```

- [ ] **Adım 2: Kırmızı test** — `tests/supportDialog.test.tsx`

```tsx
// @vitest-environment jsdom
// Sorun bildir penceresi (spec 2026-10-16 §3).
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../src/i18n";
import SupportDialog from "../src/components/SupportDialog";

const win = window as unknown as { api: unknown };
const originalApi = win.api;
afterEach(() => {
  cleanup();
  win.api = originalApi;
});

function setup(chat: Parameters<typeof SupportDialog>[0]["chat"], create = vi.fn(async () => ({ ok: true, zipPath: "C:\\d\\p.zip", draft: "outlook" }))) {
  const preview = vi.fn(async (req: { note: string; chatMarkdown: string | null }) =>
    ["bilgi.json", "ntt-studio.log", "sohbet-zamanlari.json", ...(req.chatMarkdown ? ["sohbet.md"] : []), ...(req.note ? ["not.txt"] : [])]
  );
  win.api = { supportPreview: preview, supportCreate: create };
  const onDone = vi.fn();
  const onClose = vi.fn();
  render(
    <LanguageProvider language="tr">
      <SupportDialog open onClose={onClose} chat={chat} onDone={onDone} />
    </LanguageProvider>
  );
  return { preview, create, onDone, onClose };
}

const CHAT = { title: "Sohbet A", messages: [{ id: "m1", role: "user", content: "merhaba", createdAt: 1 }] as never };

describe("SupportDialog", () => {
  it("dosya listesi; sohbet kutusu varsayılan kapalı; işaretlenince listeye sohbet.md giriyor", async () => {
    const { preview } = setup(CHAT);
    expect(await screen.findByText("ntt-studio.log")).toBeTruthy();
    const box = screen.getByRole("checkbox", { name: "Seçili sohbetin mesajlarını da ekle" }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(screen.queryByText("sohbet.md")).toBeNull();
    fireEvent.click(box);
    expect(await screen.findByText("sohbet.md")).toBeTruthy();
    expect(preview).toHaveBeenLastCalledWith(expect.objectContaining({ chatMarkdown: expect.stringContaining("merhaba") }));
  });

  it("sohbet yoksa kutu kapalı ve devre dışı", async () => {
    setup(null);
    const box = (await screen.findByRole("checkbox")) as HTMLInputElement;
    expect(box.disabled).toBe(true);
  });

  it("oluştur: not ve (işaretliyse) sohbet gidiyor; sonuç bildirilip pencere kapanıyor", async () => {
    const { create, onDone, onClose } = setup(CHAT);
    fireEvent.change(await screen.findByRole("textbox", { name: "Ne oldu?" }), { target: { value: "takıldı" } });
    fireEvent.click(screen.getByRole("button", { name: "Paketi oluştur" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith({ zipPath: "C:\\d\\p.zip", draft: "outlook" }));
    expect(create).toHaveBeenCalledWith({ note: "takıldı", chatMarkdown: null });
    expect(onClose).toHaveBeenCalled();
  });

  it("sürerken düğme kapalı (çift tık iki paket yapmıyor); hata pencerede gösteriliyor", async () => {
    let resolve: (v: unknown) => void = () => {};
    const create = vi.fn(() => new Promise((r) => (resolve = r)));
    const { onDone } = setup(null, create as never);
    const button = await screen.findByRole("button", { name: "Paketi oluştur" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(create).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: false, message: "disk dolu" }));
    expect(await screen.findByText("Paket oluşturulamadı: disk dolu")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});
```

- [ ] **Adım 3: Kırmızıyı gör**

Çalıştır: `npx vitest run tests/supportDialog.test.tsx`
Beklenen: FAIL — bileşen yok.

- [ ] **Adım 4: `src/components/SupportDialog.tsx`**

```tsx
import { useEffect, useMemo, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { Modal, ModalCancelButton } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useT } from "../i18n";
import { chatToMarkdown, type ChatExportInput } from "../lib/chatExport";
import { useChatStore } from "../stores/chatStore";

// "Sorun bildir" (spec 2026-10-16). Kullanıcı ne gönderdiğini görüyor: dosya
// listesi ana süreçten geliyor, sohbet metni yalnız kutu işaretliyse gidiyor.
// Paketi oluşturan ve maskeleyen ana süreç (support/ipc.ts).

interface Props {
  open: boolean;
  onClose: () => void;
  chat: ChatExportInput | null;
  onDone: (result: { zipPath: string; draft: "outlook" | "folder" }) => void;
}

export default function SupportDialog({ open, onClose, chat, onDone }: Props) {
  const t = useT();
  const [note, setNote] = useState("");
  const [includeChat, setIncludeChat] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatAvailable = !!chat && chat.messages.length > 0;
  const chatMarkdown = useMemo(
    () => (includeChat && chatAvailable && chat ? chatToMarkdown(chat) : null),
    [includeChat, chatAvailable, chat]
  );
  const hasNote = note.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    setNote("");
    setIncludeChat(false);
    setError(null);
    setBusy(false);
  }, [open]);

  // Liste yalnız "not var mı / sohbet var mı" değişince yenileniyor.
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    window.api.supportPreview({ note: hasNote ? "x" : "", chatMarkdown }).then((names) => {
      if (!disposed) setFiles(names);
    });
    return () => {
      disposed = true;
    };
  }, [open, hasNote, chatMarkdown]);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await window.api.supportCreate({ note: note.trim(), chatMarkdown });
    setBusy(false);
    if (!result.ok) {
      setError(t("support.failed", { message: result.message }));
      return;
    }
    onDone({ zipPath: result.zipPath, draft: result.draft });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={busy}
      title={t("support.title")}
      subtitle={t("support.subtitle")}
      icon={<LifeBuoy size={16} />}
      footer={
        <>
          <ModalCancelButton />
          <Button variant="primary" onClick={() => void create()} disabled={busy}>
            {busy ? t("support.creating") : t("support.create")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-xs text-slate-400">
          {t("support.noteLabel")}
          <textarea
            aria-label={t("support.noteLabel")}
            value={note}
            maxLength={4000}
            rows={4}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("support.notePlaceholder")}
            className="resize-y rounded-md border border-line bg-app/40 px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent-500/60"
          />
        </label>
        <label className={`flex items-start gap-2 text-sm ${chatAvailable ? "text-slate-200" : "text-slate-500"}`}>
          <input
            type="checkbox"
            checked={includeChat}
            disabled={!chatAvailable}
            onChange={(e) => setIncludeChat(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            {t("support.includeChat")}
            <span className="text-xs text-slate-500">{t("support.includeChatHint")}</span>
          </span>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">{t("support.filesLabel")}</span>
          <ul className="flex flex-wrap gap-1.5">
            {files.map((name) => (
              <li key={name} className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-slate-300">
                {name}
              </li>
            ))}
          </ul>
        </div>
        {error && <p className="text-xs text-[var(--status-danger-text)]">{error}</p>}
      </div>
    </Modal>
  );
}

/** ChatStoreProvider'ın içinde çizilir: seçili sohbeti okuyup pencereye verir. */
export function SupportDialogHost(props: Omit<Props, "chat">) {
  const { sessions, activeId } = useChatStore();
  const session = sessions.find((s) => s.id === activeId) ?? null;
  const chat: ChatExportInput | null = session
    ? { title: session.title, messages: session.messages, contextPath: session.cwd, contextLabel: session.sapLabel }
    : null;
  return <SupportDialog {...props} chat={chat} />;
}
```

`Button`'ın yolu ve `variant` adı `src/ui/Button.tsx`'tekiyle aynı olmalı (SystemPanel `import { Button } from "../ui/Button"` ve `variant="primary"` kullanıyor). `useChatStore`'un döndürdüğü `sessions[i]`'de `cwd` ve `sapLabel` yoksa o iki alanı atla.

- [ ] **Adım 5: Giriş noktaları**

`src/components/settings/settingsSections.ts`, `advanced` bölümünün `fields`'i:

```ts
    fields: ["landscapePathOverride", "sapShcutPathOverride", "supportEmail"]
```

`src/components/SettingsModal.tsx`:
- `Props`'a `onReportProblem: () => void;`; bileşen imzasına `onReportProblem` eklenir.
- `case "advanced":` kartının sonuna, `sapShcutPathOverride` `Field`'ından sonra:

```tsx
            <Field label={t("support.emailLabel")} hint={t("support.emailHelper")}>
              <FieldInput
                type="email"
                value={form.supportEmail ?? ""}
                onChange={(e) => update({ supportEmail: e.target.value })}
                placeholder="ad.soyad@nttdata.com"
              />
            </Field>
            <div>
              <Button onClick={onReportProblem}>
                <LifeBuoy size={14} />
                {t("support.openAction")}
              </Button>
            </div>
```

Import: `lucide-react` satırına `LifeBuoy`; `Button` import edilmemişse `import { Button } from "../ui/Button";`. `Field`'ın `hint` prop'u yoksa yardım metnini `terminal` bölümündeki kalıpla ver (`shellHelper` nasıl veriliyorsa).

`src/components/AppCommandPalette.tsx`:
- `PaletteActions`'a `reportProblem: () => void;`.
- Öğeler listesinde `settings`'ten sonra:

```ts
    { id: "report-problem", group: "action", label: t("palette.reportProblem"), run: actions.reportProblem },
```

- `Props`'a `onReportProblem: () => void;`; `actions` nesnesine `reportProblem: onReportProblem,`; `useMemo` bağımlılıklarına `onReportProblem`.

`src/App.tsx`:
- Durum: `const [supportOpen, setSupportOpen] = useState(false);`.
- Import: `import { SupportDialogHost } from "./components/SupportDialog";`.
- `<SettingsModal … />`'a `onReportProblem={() => setSupportOpen(true)}`.
- `<AppCommandPalette … />`'a `onReportProblem={() => setSupportOpen(true)}`.
- `<AppCommandPalette …/>`'tan hemen sonra (ChatStoreProvider içinde):

```tsx
        <SupportDialogHost
          open={supportOpen}
          onClose={() => setSupportOpen(false)}
          onDone={(r) =>
            pushToast("success", r.draft === "outlook" ? t("support.doneOutlook") : t("support.doneFolder", { path: r.zipPath }))
          }
        />
```

(`App.tsx`'te çeviri fonksiyonunun adı `t` değilse oradakini kullan.)

- [ ] **Adım 6: Yeşili gör**

Çalıştır: `npx vitest run tests/supportDialog.test.tsx tests/commandPalette.test.tsx tests/settingsSections.test.ts tests/settingsLayout.test.tsx tests/settingsOpenForm.test.tsx` ve `npm run typecheck`
Beklenen: hepsi PASS. `settingsSections.test.ts` alan listesini sabitliyorsa `supportEmail`'i beklentiye ekle. `commandPalette.test.tsx` öğe sırasını sabitliyorsa `report-problem`'i `settings`'ten sonra ekle. Başka değişiklik yapma.

- [ ] **Adım 7: Tam takım**

Çalıştır: `npx vitest run` (çıktıyı dosyaya al, kuyruğunu oku)
Beklenen: hepsi PASS.

- [ ] **Adım 8: Commit**

```bash
git add src/components/SupportDialog.tsx
git add src/components/SettingsModal.tsx
git add src/components/settings/settingsSections.ts
git add src/components/AppCommandPalette.tsx
git add src/App.tsx
git add src/i18n/tr.ts
git add src/i18n/en.ts
git add tests/supportDialog.test.tsx
git commit -m "Sorun bildir: pencere (not, sohbet secimi, dosya listesi), Ayarlar > Gelismis ve komut paleti" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(beklentisi güncellenen test dosyalarını da dosya dosya ekle.)

## Gözle kontrol (kullanıcı)

1. Ayarlar → Gelişmiş: destek adresi `tufan.sasmaz@nttdata.com`; "Sorun bildir…" pencereyi açıyor.
2. Komut paleti (Ctrl+K): "Sorun bildir".
3. Paketi oluştur → Outlook'ta ekli taslak, alıcı ve konu dolu.
4. Zip'i açın: `bilgi.json` okunur; `ntt-studio.log`'da şifre ve anahtar yerine `«gizli»`; `.conn_adt` yok.
5. Outlook kapalıyken (ya da yoksa) klasör açılıyor, dosya seçili.
