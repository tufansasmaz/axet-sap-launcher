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
/** Sohbet metni üst sınırı; aşan kısım BAŞTAN kırpılıyor (son mesajlar kalsın). */
export const MAX_CHAT_CHARS = 2 * 1024 * 1024;

export interface SupportCreateRequest {
  note: string;
  chatMarkdown: string | null;
}

function normalize(raw: unknown): BundleRequest {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    note: typeof r.note === "string" ? r.note.slice(0, MAX_NOTE) : "",
    chatMarkdown:
      typeof r.chatMarkdown === "string" && r.chatMarkdown
        ? r.chatMarkdown.length > MAX_CHAT_CHARS
          ? `…(baştan kırpıldı)\n${r.chatMarkdown.slice(-MAX_CHAT_CHARS)}`
          : r.chatMarkdown
        : null
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
    const delivered = await deliverBundle(
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
    return { ok: true, zipPath, ...delivered };
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
