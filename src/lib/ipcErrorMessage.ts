// IPC üzerinden gelen bir hatanın kullanıcıya gösterilecek kısa hâli.
//
// Electron, main'den fırlayan hatayı "Error invoking remote method
// 'config:save': Error: …" diye sarıyor; Node'un dosya hataları da sonuna
// tam yolu ekliyor ("…, open 'C:\Users\<kullanıcı>\AppData\…\config.json'").
// Bildirimde ikisi de gürültü, yol ayrıca kullanıcı adını taşıyor.

const PREFIX = /^Error invoking remote method '[^']*':\s*(?:Error:\s*)?/;
const FS_VERB = "(?:open|write|read|mkdir|rename|unlink|stat|lstat|scandir|access|copyfile|rmdir)";
const QUOTED_PATH = new RegExp(`,?\\s*(?:${FS_VERB}\\s+)?'(?:[A-Za-z]:[\\\\/]|\\\\\\\\|/)[^']*'(?:\\s*->\\s*'[^']*')?`, "g");
const BARE_PATH = new RegExp(`,?\\s*(?:${FS_VERB}\\s+)?(?:[A-Za-z]:[\\\\/]|/)\\S*[\\\\/]\\S*`, "g");

export function ipcErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(PREFIX, "").replace(QUOTED_PATH, "").replace(BARE_PATH, "").replace(/[\s,:;]+$/, "").trim();
}
