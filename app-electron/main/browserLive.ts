// Yerleşik tarayıcının CANLI parçaları (spec 2026-10-18 tarayici §4.2, §4.6).
// İnce ve test edilmiyor: kararlar browserGuard.ts'te, gönderme
// browserSend.ts'te. Bu dosya electron'u çekiyor; testler bunu İÇE AKTARMAMALI.
import { session, webContents, type Session, type WebContents } from "electron";
import { BROWSER_PARTITION, BROWSER_SELECTION_WORLD } from "../shared/browserLogic";
import { isOurBrowserGuest } from "./browserGuard";
import type { BrowserGuestPort } from "./browserSend";

export function browserSession(): Session {
  return session.fromPartition(BROWSER_PARTITION);
}

// Sayfanın kendi betiklerinden ayrı dünyada: getSelection'ı ezemiyorlar.
const SELECTION_SCRIPT = "String(window.getSelection ? window.getSelection() : '')";

/** §4.6: webContentsId ana pencereye bağlı, bu bölümdeki canlı bir webview değilse null. */
export function liveBrowserGuest(id: number, host: WebContents | null): BrowserGuestPort | null {
  const wc = webContents.fromId(id);
  if (!wc || !isOurBrowserGuest(wc, host, browserSession())) return null;
  return {
    url: () => wc.getURL(),
    title: () => wc.getTitle(),
    selection: async () => {
      const value: unknown = await wc.executeJavaScriptInIsolatedWorld(BROWSER_SELECTION_WORLD, [{ code: SELECTION_SCRIPT }]);
      return typeof value === "string" ? value : "";
    },
    capture: async () => (await wc.capturePage()).toPNG()
  };
}
