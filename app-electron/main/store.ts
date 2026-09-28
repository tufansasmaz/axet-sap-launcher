import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { userInfo } from "node:os";
import path from "node:path";
import { encryptSecret } from "./secureStorage";
import { isSkillProfile } from "./skillProfiles";
import { rememberIdpOrigin } from "./samlPolicy";
import type {
  AppConfig,
  ConnectionHistoryEntry,
  LastCredential,
  SystemTier,
  TerminalMode,
  AppLanguage,
  ChatFontSize,
  ChatDensity,
  AppTheme,
  AppPalette,
  ConnectorMode
} from "../shared/types";

const LEGACY_AXET_COMMANDS = new Set(["axet-code", "axet-code.exe"]);
const MAX_CONNECTION_HISTORY = 10;
const VALID_TERMINAL_MODES: TerminalMode[] = ["cmd", "powershell"];
const VALID_LANGUAGES: AppLanguage[] = ["tr", "en"];
const VALID_CHAT_FONT_SIZES: ChatFontSize[] = ["sm", "md", "lg"];
const VALID_CHAT_DENSITIES: ChatDensity[] = ["compact", "comfortable"];
const VALID_CONNECTOR_MODES: ConnectorMode[] = ["auto", "always"];
const VALID_THEMES: AppTheme[] = ["dark", "light"];
const VALID_PALETTES: AppPalette[] = ["indigo", "warm"];

function configPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

// Bağlayıcı kipi + İKİ eski alandan göç: `chatUseConnectors` (boolean) ve
// `chatConnectorMode` (üç değerli, `off` dahil).
//
// `off` artık bir kip DEĞİL — "kapalı", sağlayıcının kendisinin bağlı
// olmamasıyla ifade ediliyor (`connectorEnabled`). `off` yazan bir config
// `auto`ya düşüyor ve bu kullanıcının kararını geri almıyor: sağlayıcılar
// varsayılan olarak BAĞLI DEĞİL, yani ekrandan "Bağlan"a basılmadan hiçbir
// araç kurulmuyor. Yani göçten sonraki davranış öncekiyle aynı — kapalı.
//
// `chatUseConnectors === true` ise bilinçli bir "her zaman açık" kararıydı;
// `always`e taşınıyor ki geri alınmış olmasın.
function readConnectorMode(parsed: Record<string, unknown>, fallback: ConnectorMode): ConnectorMode {
  for (const key of ["connectorMode", "chatConnectorMode"]) {
    const value = parsed[key];
    if (VALID_CONNECTOR_MODES.includes(value as ConnectorMode)) return value as ConnectorMode;
    if (value === "off") return "auto";
  }
  if (parsed.chatUseConnectors === true) return "always";
  return fallback;
}

// Hangi sağlayıcılar bağlı? Yalnızca `true` olan anahtarlar korunuyor —
// config elle düzenlenmiş olabilir ve buraya gelen her şey doğrudan bir
// yetki kapısını (bkz. connectorPolicy.ts) besliyor.
function readConnectorEnabled(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value as Record<string, unknown>)) {
    if (flag === true) out[key] = true;
  }
  return out;
}

/**
 * Global yetenek anahtarları. Yalnızca `false` saklanıyor: varsayılan "açık"
 * ve rolün listesi zaten kaynaktan geliyor, `true` yazmak dosyayı rol
 * değiştikçe bayatlayan bir kopyaya çevirirdi.
 */
function sanitizeOverrides(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value as Record<string, unknown>)) {
    if (flag === false) out[key] = false;
  }
  return out;
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
    skillProfile: null,
    skillNoticeAcceptedAt: null,
    globalSkillOverrides: {},
    theme: "dark",
    palette: "indigo",
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
    // Bkz. `ConnectorMode`. Bu bir aç/kapa değil, maliyet ayarı — açma/kapama
    // `connectorEnabled` ile, kullanıcının "Bağlan"/"Bağlantıyı Kes"
    // düğmesinden yapılıyor.
    connectorMode: "auto",
    // VARSAYILAN BOŞ: hiçbir sağlayıcı kendiliğinden bağlı değil. Bir
    // bağlayıcıyı kullanıcı istemeden açmak, hem her çağrıya ~10 s ekler hem
    // de kurumsal veriye (posta kutusu, SharePoint) sessizce erişim demektir.
    connectorEnabled: {},
    connectorLastResults: {},
    // Ekrandan okunarak doldurulur (axetChatTui.ts); duyuru görülmediyse boş.
    axetCodeLatestSeen: "",
    // Ölçülerek doldurulur (connectorHealth.ts); elle düzenlenen bir ayar değil.
    connectorIntegrations: {},
    connectorAutoDisabled: []
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
    // Görünüm de aynı muameleyi görüyor: değer doğrudan `<html data-palette /
    // data-theme>`'e yazılıyor ve hiçbir CSS bloğuyla eşleşmeyen bir değer
    // uygulamayı renksiz açardı. `palette` 2026-09-28'de eklendi; daha eski
    // dosyalarda hiç yok ve varsayılana ("indigo") düşüyor.
    const theme = VALID_THEMES.includes(parsed.theme) ? parsed.theme : fallback.theme;
    const palette = VALID_PALETTES.includes(parsed.palette) ? parsed.palette : fallback.palette;
    const merged: AppConfig = {
      ...fallback,
      ...parsed,
      axetCommand,
      terminal,
      language,
      chatFontSize,
      chatDensity,
      theme,
      palette,
      chatDisplayName: typeof parsed.chatDisplayName === "string" ? parsed.chatDisplayName : fallback.chatDisplayName,
      chatSidebarOpen: typeof parsed.chatSidebarOpen === "boolean" ? parsed.chatSidebarOpen : fallback.chatSidebarOpen,
      connectorMode: readConnectorMode(parsed, fallback.connectorMode),
      connectorEnabled: readConnectorEnabled(parsed.connectorEnabled),
      connectorLastResults:
        parsed.connectorLastResults && typeof parsed.connectorLastResults === "object"
          ? parsed.connectorLastResults
          : fallback.connectorLastResults,
      axetCodeLatestSeen:
        typeof parsed.axetCodeLatestSeen === "string" ? parsed.axetCodeLatestSeen : fallback.axetCodeLatestSeen,
      connectorIntegrations:
        parsed.connectorIntegrations && typeof parsed.connectorIntegrations === "object"
          ? (parsed.connectorIntegrations as AppConfig["connectorIntegrations"])
          : fallback.connectorIntegrations,
      // Dizi olduğu ve İÇİNİN dize olduğu ayrıca süzülüyor: bu listedeki bir
      // değer doğrudan axet-code'un durum dosyasına yazılıyor, bozuk bir eleman
      // o dosyayı da bozardı.
      connectorAutoDisabled: Array.isArray(parsed.connectorAutoDisabled)
        ? (parsed.connectorAutoDisabled as unknown[]).filter((x): x is string => typeof x === "string")
        : fallback.connectorAutoDisabled,
      lastCredentials: { ...fallback.lastCredentials, ...(parsed.lastCredentials ?? {}) },
      trustedCertificates: { ...fallback.trustedCertificates, ...(parsed.trustedCertificates ?? {}) },
      samlIdpOrigins: sanitizeSamlIdpOrigins(parsed.samlIdpOrigins),
      connectionHistory: Array.isArray(parsed.connectionHistory) ? parsed.connectionHistory : fallback.connectionHistory,
      systemTiers: { ...fallback.systemTiers, ...(parsed.systemTiers ?? {}) },
      systemComments: { ...fallback.systemComments, ...(parsed.systemComments ?? {}) },
      skillProfile: isSkillProfile(parsed.skillProfile) ? parsed.skillProfile : fallback.skillProfile,
      skillNoticeAcceptedAt:
        typeof parsed.skillNoticeAcceptedAt === "string"
          ? parsed.skillNoticeAcceptedAt
          : fallback.skillNoticeAcceptedAt,
      globalSkillOverrides: sanitizeOverrides(parsed.globalSkillOverrides)
    };
    // `...parsed` eski alanları da taşıyor; bir kere okunup göç ettirildikten
    // sonra dosyada kalmaları yalnızca kafa karıştırır (üç alan, ikisi ölü).
    const dead = merged as unknown as Record<string, unknown>;
    delete dead.chatUseConnectors;
    delete dead.chatConnectorMode;
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

// Bu liste parolanın otomatik yazılacağı yerleri belirliyor; elle bozulmuş
// ya da https olmayan bir değer izin listesine hiç girmemeli.
function sanitizeSamlIdpOrigins(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [uuid, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const clean = rememberIdpOrigin(
      list.filter((x): x is string => typeof x === "string"),
      null
    );
    if (clean.length > 0) out[uuid] = clean;
  }
  return out;
}

/** Başarılı bir SAML girişinde SAP'nin yönlendirdiği IdP origin'ini sistemin listesine ekler. */
export function saveSamlIdpOrigin(serviceUuid: string, origin: string): AppConfig {
  const current = loadConfig();
  const all = { ...(current.samlIdpOrigins ?? {}) };
  all[serviceUuid] = rememberIdpOrigin(all[serviceUuid], origin);
  return saveConfig({ samlIdpOrigins: all });
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


