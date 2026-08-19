import { app } from "electron";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { AppConfig, ConnectionHistoryEntry, LastCredential, SystemTier, TerminalMode } from "../shared/types";

const LEGACY_AXET_COMMANDS = new Set(["axet-code", "axet-code.exe"]);
const MAX_CONNECTION_HISTORY = 10;
const VALID_TERMINAL_MODES: TerminalMode[] = ["cmd", "powershell"];

function configPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

function defaultConfig(): AppConfig {
  return {
    projectsBaseDir: path.join(app.getPath("documents"), "aXet SAP Projects"),
    axetCommand: "axet-code -y",
    terminal: "powershell",
    landscapePathOverride: null,
    lastCredentials: {},
    trustedCertificates: {},
    connectionHistory: [],
    systemTiers: {},
    theme: "dark",
    autoCheckUpdates: true
  };
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
    const merged: AppConfig = {
      ...fallback,
      ...parsed,
      axetCommand,
      terminal,
      lastCredentials: { ...fallback.lastCredentials, ...(parsed.lastCredentials ?? {}) },
      trustedCertificates: { ...fallback.trustedCertificates, ...(parsed.trustedCertificates ?? {}) },
      connectionHistory: Array.isArray(parsed.connectionHistory) ? parsed.connectionHistory : fallback.connectionHistory,
      systemTiers: { ...fallback.systemTiers, ...(parsed.systemTiers ?? {}) }
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
  const lastCredentials = { ...current.lastCredentials, [serviceUuid]: credential };
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

