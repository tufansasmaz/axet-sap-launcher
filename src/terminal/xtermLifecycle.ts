// xterm yaşam döngüsü (2026-10-21). Ölçüldü (@xterm/xterm 5.5.0, kaynak eşlemeli
// yığın): "Cannot read properties of undefined (reading 'dimensions')" =
// RenderService.dimensions <- Viewport.syncScrollArea <- setTimeout. Viewport
// kurucusu `term.open()` anında bir setTimeout kuruyor; terminal aynı tikte
// dispose edilirse (dev'de React StrictMode efekti kurup hemen temizliyor,
// bölme hızla kapanınca da) zamanlayıcı renderer'ı silinmiş servise çarpıyor.
// Gizli (display:none) bölmede açılış tek başına hata vermiyor (ölçüldü).

/**
 * `term.open()`'dan HEMEN SONRA çağrılmalı. Dönen fonksiyon terminali bir kez
 * dispose eder; açılış tiki geçmediyse xterm'in zamanlayıcısından sonraya
 * erteler (setTimeout sırası FIFO: xterm'inki önce kuruldu).
 */
export function disposeAfterOpenTick(term: { dispose(): void }): () => void {
  let settled = false;
  let done = false;
  setTimeout(() => {
    settled = true;
  });
  const run = () => {
    if (done) return;
    done = true;
    term.dispose();
  };
  return () => {
    if (done) return;
    if (settled) run();
    else setTimeout(run);
  };
}
