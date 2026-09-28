// ipcMain'e kayıtlı bütün kanalları güvenilmeyen göndericilere kapatan bekçi.
//
// Uygulamanın 100'ü aşkın ipcMain kanalı (dosya okuma/yazma, terminal, SAP
// bağlantısı…) ana pencere için yazıldı ve göndericiyi kontrol etmiyor.
// Flow sandbox penceresinin preload'u bu kanallara erişim vermiyor, ama
// sınır preload değil: sandbox'ın renderer süreci ele geçirilirse
// (Chromium açığı) istediği kanala istediği mesajı gönderebilir. Her
// handler'a tek tek kontrol eklemek yerine kayıt fonksiyonları sarılıyor —
// sonradan eklenen bir kanal da kendiliğinden korunuyor.
//
// Sandbox'ın kendi kanalları ipcMain'de değil, kendi webContents.ipc'sinde
// (flowSandbox.ts); Electron onları ipcMain'den önce dağıtıyor, bu bekçi
// onlara dokunmuyor.

import type { IpcMain, WebContents } from "electron";

type AnyListener = (event: { sender?: WebContents | null; returnValue?: unknown }, ...args: unknown[]) => unknown;
type Registrar = (channel: string, listener: AnyListener) => unknown;

const guarded = new WeakSet<object>();

export function installIpcSenderGuard(ipc: IpcMain, isUntrusted: (sender: WebContents | null | undefined) => boolean): void {
  if (guarded.has(ipc)) return;
  guarded.add(ipc);
  const target = ipc as unknown as Record<string, Registrar>;
  // removeListener'ın özgün dinleyiciyle çalışmaya devam etmesi için
  // sarmalayıcıyla eşleştiriliyor.
  const wrappers = new WeakMap<AnyListener, AnyListener>();

  for (const method of ["handle", "handleOnce"]) {
    const original = target[method].bind(ipc);
    target[method] = (channel, listener) =>
      original(channel, (event, ...args) => {
        if (isUntrusted(event?.sender)) throw new Error(`IPC reddedildi: ${channel}`);
        return listener(event, ...args);
      });
  }

  for (const method of ["on", "once", "addListener", "prependListener", "prependOnceListener"]) {
    const original = target[method]?.bind(ipc);
    if (!original) continue;
    target[method] = (channel, listener) => {
      const wrapped: AnyListener = (event, ...args) => {
        if (isUntrusted(event?.sender)) {
          // sendSync ile geldiyse yanıtsız bırakmak göndericiyi askıda
          // tutardı; boş bir yanıt verip mesajı düşürüyoruz.
          try {
            event.returnValue = null;
          } catch {
            // eşzamansız mesajda returnValue yok
          }
          return undefined;
        }
        return listener(event, ...args);
      };
      wrappers.set(listener, wrapped);
      return original(channel, wrapped);
    };
  }

  for (const method of ["removeListener", "off"]) {
    const original = target[method]?.bind(ipc);
    if (!original) continue;
    target[method] = (channel, listener) => original(channel, wrappers.get(listener) ?? listener);
  }
}
