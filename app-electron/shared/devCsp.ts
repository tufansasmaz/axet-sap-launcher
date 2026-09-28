// Geliştirme sunucusunda (electron-vite dev) ana sayfanın CSP'sini gevşeten
// dönüşüm. Paketlenmiş uygulama index.html'deki sıkı politikayla çalışıyor;
// bu dönüşüm YALNIZCA Vite'ın `serve` kipinde uygulanıyor
// (bkz. electron.vite.config.ts).
//
// Neden gerekiyor:
//   - @vitejs/plugin-react sayfaya satır içi bir react-refresh betiği
//     ekliyor; `script-src 'self'` onu engelleyince HMR ve React yüklenmiyor.
//   - Vite istemcisi HMR için dev sunucusuna websocket açıyor.

const CSP_META = /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/i;

function addSource(policy: string, directive: string, source: string): string {
  const parts = policy.split(";").map((p) => p.trim()).filter(Boolean);
  const index = parts.findIndex((p) => p.split(/\s+/)[0] === directive);
  if (index === -1) return policy;
  if (parts[index].split(/\s+/).includes(source)) return policy;
  parts[index] = `${parts[index]} ${source}`;
  return parts.join("; ");
}

export function relaxCspForDev(html: string): string {
  return html.replace(CSP_META, (_m, head: string, policy: string, tail: string) => {
    let next = addSource(policy, "script-src", "'unsafe-inline'");
    next = addSource(next, "connect-src", "ws://localhost:*");
    return `${head}${next}${tail}`;
  });
}
