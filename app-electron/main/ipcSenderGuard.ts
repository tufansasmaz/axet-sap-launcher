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
//
// Göndericinin kimliği tek başına yetmiyor: ana pencere başka bir sayfaya
// götürülürse ya da bir alt çerçeve IPC'ye ulaşırsa gönderen webContents yine
// ana pencerenin kendisi. O yüzden gönderen ÇERÇEVEYE de bakılıyor: ana
// çerçeve olmalı ve uygulamanın kendi sayfasında durmalı
// (bkz. isMainWindowSenderUntrusted).

import type { IpcMain, WebContents } from "electron";

// Bekçinin baktığı alanlar. `senderFrame` Electron'un WebFrameMain'i; çerçeve
// yok edilmişse null olabiliyor, `url` okuması da o durumda hata fırlatıyor.
export interface IpcSenderInfo {
  sender?: WebContents | null;
  senderFrame?: { url: string; parent: unknown } | null;
}

export interface MainWindowSenderPolicy {
  isFlowSandboxSender: (sender: WebContents | null | undefined) => boolean;
  isAppUrl: (url: string) => boolean;
}

/**
 * ipcMain kanallarına gelen bir mesaj güvenilmez mi?
 *
 * Güvenilir olan tek gönderen: flow sandbox olmayan bir webContents'in, alt
 * çerçeve olmayan ana çerçevesi, uygulamanın kendi sayfasındayken. Çerçeve
 * bilgisi okunamıyorsa (yok edilmiş, null) mesaj REDDEDİLİYOR — şüphede
 * açık bırakmak bu bekçinin varlık sebebine ters.
 */
export function isMainWindowSenderUntrusted(event: IpcSenderInfo | null | undefined, policy: MainWindowSenderPolicy): boolean {
  if (!event?.sender) return true;
  if (policy.isFlowSandboxSender(event.sender)) return true;
  try {
    const frame = event.senderFrame;
    if (!frame) return true;
    if (frame.parent) return true;
    return !policy.isAppUrl(frame.url);
  } catch {
    return true;
  }
}

type AnyListener = (event: IpcSenderInfo & { returnValue?: unknown }, ...args: unknown[]) => unknown;
type Registrar = (channel: string, listener: AnyListener) => unknown;

const guarded = new WeakSet<object>();

export function installIpcSenderGuard(ipc: IpcMain, isUntrusted: (event: IpcSenderInfo | null | undefined) => boolean): void {
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
        if (isUntrusted(event)) throw new Error(`IPC reddedildi: ${channel}`);
        return listener(event, ...args);
      });
  }

  for (const method of ["on", "once", "addListener", "prependListener", "prependOnceListener"]) {
    const original = target[method]?.bind(ipc);
    if (!original) continue;
    target[method] = (channel, listener) => {
      const wrapped: AnyListener = (event, ...args) => {
        if (isUntrusted(event)) {
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
