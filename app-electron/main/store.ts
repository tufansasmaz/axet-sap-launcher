import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { userInfo } from "node:os";
import path from "node:path";
import { encryptSecret } from "./secureStorage";
import type {
  AppConfig,
  ConnectionHistoryEntry,
  LastCredential,
  SystemTier,
  TerminalMode,
  AppLanguage,
  ChatFontSize,
  ChatDensity
} from "../shared/types";

const LEGACY_AXET_COMMANDS = new Set(["axet-code", "axet-code.exe"]);
const MAX_CONNECTION_HISTORY = 10;
const VALID_TERMINAL_MODES: TerminalMode[] = ["cmd", "powershell"];
const VALID_LANGUAGES: AppLanguage[] = ["tr", "en"];
const VALID_CHAT_FONT_SIZES: ChatFontSize[] = ["sm", "md", "lg"];
const VALID_CHAT_DENSITIES: ChatDensity[] = ["compact", "comfortable"];

function configPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

function defaultConfig(): AppConfig {
  return {
    projectsBaseDir: path.join(app.getPath("documents"), "aXet SAP Projects"),
    axetCommand: "axet-code -y",
    terminal: "powershell",
    landscapePathOverride: null,
    sapShcutPathOverride: null,
    lastCredentials: {},
    trustedCertificates: {},
    connectionHistory: [],
    systemTiers: {},
    systemComments: {},
    theme: "dark",
    language: "tr",
    autoCheckUpdates: true,
    axetWorkspaceDir: path.join(app.getPath("documents"), "aXet Code Sessions"),
    // Windows oturum adından TÜRETİLİR, ama sadece isme benziyorsa
    // (bkz. safeUserName). Kullanıcı Ayarlar'dan değiştirebilir, boşaltırsa
    // karşılama adsız görünür.
    chatDisplayName: safeUserName(),
    chatFontSize: "md",
    chatDensity: "comfortable",
    chatSidebarOpen: true,
    // Hız varsayılan (bkz. axetSpawnEnv.ts): bağlayıcılar mesaj başına ~8 s
    // ekliyor ve sohbetlerin çoğunda kullanılmıyor.
    chatUseConnectors: false
  };
}

// Karşılamada kullanılacak varsayılan ad. Windows oturum adı kurumsal
// ortamlarda çoğu zaman bir SİCİL NUMARASIDIR ("10134570") ve "İyi akşamlar,
// 10134570" saçma görünüyor (kullanıcı geri bildirimi, 2026-09-02). Bu yüzden
// oturum adı yalnızca İSME BENZİYORSA kullanılıyor: en az bir harf içermeli.
// Benzemiyorsa boş dönülür ve karşılama adsız kalır — kullanıcı isterse
// Ayarlar > Sohbet görünümü'nden kendi adını yazar. `userInfo()` bazı kilitli
// ortamlarda fırlatıyor; ad kozmetik olduğu için hata tüm config'i düşürmemeli.
function safeUserName(): string {
  try {
    const raw = (userInfo().username ?? "").trim();
    return /\p{L}/u.test(raw) ? raw : "";
  } catch {
    return "";
  }
}

export function loadConfig(): AppConfig {
  const file = configPath();
  const fallback = defaultConfig();
  if (!existsSync(file)) return fallback;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf-8"));
    const axetCommand = LEGACY_AXET_COMMANDS.has(parsed.axetCommand) ? fallback.axetCommand : parsed.axetCommand ?? fallback.axetCommand;
    // Eski sürümlerde "wt" (harici Windows Terminal) değeri saklanmış
    // olabilir — gömülü terminal artık her zaman cmd/powershell kabuğu
    // kullandığı için "wt" geçersizdir, sessizce "cmd"ye düşürülür.
    const terminal = VALID_TERMINAL_MODES.includes(parsed.terminal) ? parsed.terminal : fallback.terminal;
    // Eski config dosyalarında `language` alanı hiç yoktu (bu alan eklenmeden
    // önce oluşturulmuş) — geçersiz/eksik değer sessizce varsayılana ("tr")
    // düşürülür, hata fırlatılmaz.
    const language = VALID_LANGUAGES.includes(parsed.language) ? parsed.language : fallback.language;
    // Sohbet görünüm ayarları da aynı muameleyi görüyor: bu alanlar eklenmeden
    // önce yazılmış config'lerde HİÇ YOK, ve doğrudan CSS değişkenine
    // çevrildikleri için geçersiz bir değer sessiz bir görsel bozulma olurdu.
    const chatFontSize = VALID_CHAT_FONT_SIZES.includes(parsed.chatFontSize)
      ? parsed.chatFontSize
      : fallback.chatFontSize;
    const chatDensity = VALID_CHAT_DENSITIES.includes(parsed.chatDensity)
      ? parsed.chatDensity
      : fallback.chatDensity;
    const merged: AppConfig = {
      ...fallback,
      ...parsed,
      axetCommand,
      terminal,
      language,
      chatFontSize,
      chatDensity,
      chatDisplayName: typeof parsed.chatDisplayName === "string" ? parsed.chatDisplayName : fallback.chatDisplayName,
      chatSidebarOpen: typeof parsed.chatSidebarOpen === "boolean" ? parsed.chatSidebarOpen : fallback.chatSidebarOpen,
      chatUseConnectors:
        typeof parsed.chatUseConnectors === "boolean" ? parsed.chatUseConnectors : fallback.chatUseConnectors,
      lastCredentials: { ...fallback.lastCredentials, ...(parsed.lastCredentials ?? {}) },
      trustedCertificates: { ...fallback.trustedCertificates, ...(parsed.trustedCertificates ?? {}) },
      connectionHistory: Array.isArray(parsed.connectionHistory) ? parsed.connectionHistory : fallback.connectionHistory,
      systemTiers: { ...fallback.systemTiers, ...(parsed.systemTiers ?? {}) },
      systemComments: { ...fallback.systemComments, ...(parsed.systemComments ?? {}) }
    };
    return merged;
  } catch {
    return fallback;
  }
}

export function saveConfig(partial: Partial<AppConfig>): AppConfig {
  const current = loadConfig();
  const next: AppConfig = { ...current, ...partial };
  const dir = path.dirname(configPath());
  mkdirSync(dir, { recursive: true });
  writeFileSync(configPath(), JSON.stringify(next, null, 2), "utf-8");
  return next;
}

export function saveLastCredential(serviceUuid: string, credential: LastCredential): AppConfig {
  const current = loadConfig();
  // Şifre `config.json`'a ASLA düz metin yazılmıyor — `safeStorage`
  // (Windows DPAPI) ile şifrelenip `enc:v1:<base64>` olarak saklanıyor
  // (bkz. secureStorage.ts). Geri okuma tarafı `resolveCredentialDefaults`
  // (index.ts) — orada `decryptSecret` ile çözülüyor.
  const encrypted: LastCredential = { ...credential, password: encryptSecret(credential.password) };
  const lastCredentials = { ...current.lastCredentials, [serviceUuid]: encrypted };
  return saveConfig({ lastCredentials });
}

export function saveTrustedCertificates(updated: Record<string, string>): AppConfig {
  const current = loadConfig();
  const trustedCertificates = { ...current.trustedCertificates, ...updated };
  return saveConfig({ trustedCertificates });
}

export function pushConnectionHistory(serviceUuid: string): AppConfig {
  const current = loadConfig();
  const entry: ConnectionHistoryEntry = { uuid: serviceUuid, connectedAt: new Date().toISOString() };
  const connectionHistory = [entry, ...current.connectionHistory.filter((e) => e.uuid !== serviceUuid)].slice(
    0,
    MAX_CONNECTION_HISTORY
  );
  return saveConfig({ connectionHistory });
}

export function saveSystemTier(serviceUuid: string, tier: SystemTier | null): AppConfig {
  const current = loadConfig();
  const systemTiers = { ...current.systemTiers };
  if (tier) {
    systemTiers[serviceUuid] = tier;
  } else {
    delete systemTiers[serviceUuid];
  }
  return saveConfig({ systemTiers });
}

export function saveSystemComment(serviceUuid: string, comment: string): AppConfig {
  const current = loadConfig();
  const systemComments = { ...current.systemComments };
  if (comment.trim().length > 0) {
    systemComments[serviceUuid] = comment;
  } else {
    delete systemComments[serviceUuid];
  }
  return saveConfig({ systemComments });
}


