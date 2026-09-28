'use strict';
// axet.flows function node sandbox penceresinin preload'u.
//
// Elle yazılmış CommonJS ve paketlenmiyor (electron.vite.config.ts bu
// dosyayı olduğu gibi dist-electron/preload'a kopyalıyor): `sandbox: true`
// olan bir pencerede preload ESM olamıyor ve yalnızca `require('electron')`
// kullanabiliyor. Ana pencerenin preload'u (index.ts → index.mjs) BURADA
// KULLANILMIYOR; o, uygulamanın bütün IPC yüzeyini açıyor.
//
// Açılan yüzey bilerek dar: bağlam oku/yaz/listele (senkron — Node-RED'in
// `context.get/set` sözleşmesi senkron), log, sonuç, hazır sinyali ve tek
// bir çalıştırma dinleyicisi. Kanal adları burada sabit; sayfa rastgele bir
// kanala mesaj gönderemiyor. Ana süreç yine de her girdiyi yeniden doğruluyor
// (app-electron/main/flowSandboxHost.ts) — bu dosya bir kolaylık, sınır değil.

const { contextBridge, ipcRenderer } = require('electron');

let taken = false;
let runHandler = null;

ipcRenderer.on('flow-sandbox:run', (_event, request) => {
  if (runHandler) runHandler(request);
});

const api = {
  contextGet: (token, scope, key) => ipcRenderer.sendSync('flow-sandbox:context', 'get', token, scope, key),
  contextSet: (token, scope, key, value) => ipcRenderer.sendSync('flow-sandbox:context', 'set', token, scope, key, value),
  contextKeys: (token, scope) => ipcRenderer.sendSync('flow-sandbox:context', 'keys', token, scope),
  log: (token, level, text) => ipcRenderer.send('flow-sandbox:log', token, level, text),
  done: (reply) => ipcRenderer.send('flow-sandbox:done', reply),
  ready: () => ipcRenderer.send('flow-sandbox:ready'),
  // Tek dinleyici: ilk kaydı sayfanın kendi betiği yapıyor; kullanıcı kodu
  // sonradan kendi dinleyicisini takıp istekleri (başka node'ların msg'lerini)
  // dinleyemesin diye ikinci kayıt reddediliyor.
  onRun: (handler) => {
    if (runHandler || typeof handler !== 'function') return false;
    runHandler = handler;
    return true;
  }
};

// API nesnesi doğrudan window'a konmuyor, bir kez alınabilen bir kutuda
// duruyor: sayfanın betiği ilk iş onu alıyor, sonra kutu boş dönüyor.
contextBridge.exposeInMainWorld('flowSandbox', {
  take: () => {
    if (taken) return null;
    taken = true;
    return api;
  }
});
