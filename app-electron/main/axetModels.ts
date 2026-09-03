import { exec } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  AxetModelConfig,
  AxetModelConfigResult,
  AxetModelEntry,
  AxetModelKind,
  AxetModelsListResult
} from "../shared/types";

// axet-code CLI'ının kendi global config dosyası — `axet-code dirs` komutunun
// ikinci satırında bastırdığı veri dizini (bu makinede canlı doğrulandı:
// `C:\Users\<user>\AppData\Local\axet-code\axet-code.json`). Windows'ta
// `%LOCALAPPDATA%` her zaman bu dizinin köküdür — `axet-code dirs`'i her
// çağrıda tekrar spawn etmek yerine (yavaş, gereksiz) doğrudan ortam
// değişkeninden hesaplıyoruz, sadece o değişken hiç yoksa (çok nadir/bozuk
// profil) `os.homedir()/AppData/Local`'a düşülüyor.
function axetCodeDataDir(): string {
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
  return path.join(base, "axet-code");
}

function axetCodeConfigPath(): string {
  return path.join(axetCodeDataDir(), "axet-code.json");
}

const EXEC_TIMEOUT_MS = 15_000;
const MAX_RECENT = 6;

// "provider/model" satırlarını parse eder — model id'nin kendisi (`eu.
// anthropic.claude-haiku-4-5-20251001-v1:0` gibi) nokta/tire/kolon
// içerebilir ama ikinci bir "/" İÇERMEZ (canlı çıktıda doğrulandı), bu
// yüzden sadece İLK "/" üzerinden bölünüyor. Boş satırlar veya "/"
// içermeyen satırlar (olası uyarı/başlık metni) atlanıyor.
function parseModelLines(stdout: string): AxetModelEntry[] {
  const entries: AxetModelEntry[] = [];
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const slashIndex = line.indexOf("/");
    if (slashIndex <= 0 || slashIndex === line.length - 1) continue;
    if (/\s/.test(line)) continue;
    entries.push({
      provider: line.slice(0, slashIndex),
      model: line.slice(slashIndex + 1)
    });
  }
  return entries;
}

export function listAxetModels(): Promise<AxetModelsListResult> {
  return new Promise((resolve) => {
    exec("axet-code models", { timeout: EXEC_TIMEOUT_MS, windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, models: [], error: (stderr || err.message || "").trim() || err.message });
        return;
      }
      resolve({ ok: true, models: parseModelLines(stdout) });
    });
  });
}

function readRawConfig(): Record<string, unknown> {
  const file = axetCodeConfigPath();
  if (!existsSync(file)) return {};
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8"));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function getAxetModelConfig(): AxetModelConfigResult {
  try {
    const raw = readRawConfig();
    const models = (raw.models as Record<string, unknown>) ?? {};
    const large = (models.large as AxetModelEntry) ?? null;
    const small = (models.small as AxetModelEntry) ?? null;
    const config: AxetModelConfig = {
      large: large?.provider && large?.model ? large : null,
      small: small?.provider && small?.model ? small : null
    };
    return { ok: true, config };
  } catch (err) {
    return { ok: false, config: null, error: (err as Error).message };
  }
}

// `axet-code`'un kendi interaktif "/model" seçicisinin de yazdığı AYNI dosya
// ve AYNI şema (`models.large`/`models.small` + `recent_models.large`/`.small`
// dizileri) — burada dışarıdan (launcher'dan) yazıyoruz ki kullanıcı yeni bir
// sohbet başlatmadan önce modeli seçebilsin, CLI açılışta bu dosyayı okuyup
// varsayılan modeli buradan alır. Bilerek DEĞİŞTİRİLMEYEN/dokunulmayan alanlar
// (raw objesinin `models`/`recent_models` dışındaki her şeyi) olduğu gibi
// korunuyor — ileride CLI'nin bu dosyaya başka bir bölüm eklemesi bizim
// tarafımızdan sessizce silinmesin diye.
export function setAxetModel(kind: AxetModelKind, entry: AxetModelEntry): AxetModelConfigResult {
  try {
    const raw = readRawConfig();
    const models = { ...(raw.models as Record<string, AxetModelEntry> | undefined) };
    models[kind] = entry;

    const recentModels = { ...(raw.recent_models as Record<string, AxetModelEntry[]> | undefined) };
    const existingRecent = Array.isArray(recentModels[kind]) ? recentModels[kind] : [];
    const dedup = existingRecent.filter((e) => !(e.provider === entry.provider && e.model === entry.model));
    recentModels[kind] = [entry, ...dedup].slice(0, MAX_RECENT);

    const next = { ...raw, models, recent_models: recentModels };
    mkdirSync(axetCodeDataDir(), { recursive: true });
    writeFileSync(axetCodeConfigPath(), JSON.stringify(next, null, 2), "utf-8");

    return { ok: true, config: { large: models.large ?? null, small: models.small ?? null } };
  } catch (err) {
    return { ok: false, config: null, error: (err as Error).message };
  }
}
