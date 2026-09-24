// SAP DEV yazma onayı — renderer köprüsü. Pencere durumu okur ve yalnızca iki
// karar verir: oturumun modu ve bekleyen isteğin cevabı. Karar mantığı
// policy.ts'de; buradaki doğrulama renderer'dan gelen değerin biçimi için.
//
// `electron` import edilmiyor: ipcMain ve pencere parametre olarak geliyor, test
// sahte nesnelerle koşuyor (activeContext.ts ile aynı kalıp).

import type { Choice, SapWriteState, WorkMode } from "../../shared/sapWriteTypes";
import { listWriteState, respondToApproval, setWriteMode, setWriteNotifier } from "./server";

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, ...args: unknown[]) => unknown): void;
}

export interface WindowLike {
  isDestroyed(): boolean;
  isFocused(): boolean;
  flashFrame(flag: boolean): void;
  webContents: { send(channel: string, ...args: unknown[]): void };
}

const MODES: ReadonlySet<string> = new Set<WorkMode>(["dogrudan", "yerel"]);
const CHOICES: ReadonlySet<string> = new Set<Choice>(["reddet", "bu_seferlik", "oturum"]);

export function registerSapWriteIpc(ipc: IpcMainLike, getWindow: () => WindowLike | null): void {
  ipc.handle("sap-write:state", (): SapWriteState => listWriteState());

  ipc.handle("sap-write:set-mode", (_event, sessionId, mode): boolean => {
    if (typeof sessionId !== "string" || typeof mode !== "string" || !MODES.has(mode)) return false;
    return setWriteMode(sessionId, mode as WorkMode);
  });

  ipc.handle("sap-write:respond", (_event, id, choice): { ok: boolean; error?: string } => {
    if (typeof id !== "string" || typeof choice !== "string" || !CHOICES.has(choice)) {
      return { ok: false, error: "gecersiz_istek" };
    }
    return respondToApproval(id, choice as Choice);
  });

  // Yeni bir istek geldiğinde pencere öndeyse zaten görünüyor; değilse görev
  // çubuğunda yanıp sönüyor. Öne FIRLATILMIYOR: kullanıcı başka bir yere
  // yazarken odağı çalmak, yanlışlıkla Enter'la bir düğmeye basmak demek.
  let seen = new Set<string>();
  setWriteNotifier(() => {
    const state = listWriteState();
    const hasNew = state.pending.some((p) => !seen.has(p.id));
    seen = new Set(state.pending.map((p) => p.id));
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.send("sap-write:changed", state);
    if (hasNew && !win.isFocused()) win.flashFrame(true);
  });
}
