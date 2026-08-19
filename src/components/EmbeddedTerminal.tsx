import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface Props {
  sessionId: string;
  active: boolean;
}

function quotePathIfNeeded(p: string): string {
  return /\s/.test(p) ? `"${p}"` : p;
}

export default function EmbeddedTerminal({ sessionId, active }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      convertEol: true,
      fontSize: 13,
      fontFamily: "Consolas, 'Cascadia Mono', 'Courier New', monospace",
      cursorBlink: true,
      theme: {
        background: "#0b0d12",
        foreground: "#e2e8f0",
        cursor: "#38bdf8"
      }
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    termRef.current = term;
    fitRef.current = fit;

    // Bu component artık panel açılıp kapandığında unmount edilmiyor
    // (bkz. TerminalPanel.tsx) — sadece gerçekten kapatılan bir sekme
    // için unmount olur. Ama xterm/main-process arasındaki async IPC
    // çağrıları (getTerminalBuffer) unmount SIRASINDA hâlâ havada
    // olabilir; bu yüzden her yazma öncesi `disposed` bayrağını kontrol
    // ediyoruz — kontrolsüz "write after dispose" istisnası özellikle
    // birden fazla terminal hızlıca açılıp kapatıldığında React ağacını
    // görsel olarak bozan ("sapıtma") asıl sebepti.
    let disposed = false;
    let flushed = false;
    let pendingLive: string[] = [];

    const safeFit = () => {
      if (disposed || !containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      try {
        fit.fit();
      } catch {
        // container geçici olarak 0 boyutlu olabilir, bir sonraki resize'da düzelir
      }
    };

    safeFit();

    const dataDisposable = term.onData((data) => {
      window.api.writeTerminal(sessionId, data);
    });

    // Ctrl+V/sağ-tık yapıştırma: burada ELLE hiçbir şey yapılmıyor —
    // önceki bir sürüm bunu Electron'un `clipboard` modülünü (main
    // process IPC üzerinden) manuel çağırarak "düzeltmeye" çalışıyordu,
    // ama bu modül bu makinede tutarlı biçimde boş string döndürüyordu
    // (kök sebep hâlâ belirsiz — muhtemelen Windows 11 24H2 + Electron 33
    // clipboard native binding uyumsuzluğu). O manuel handler ayrıca
    // xterm.js'in KENDİ native paste akışını (`Clipboard.ts` —
    // `textarea`'ya native `paste` ClipboardEvent'i, tarayıcının kendi
    // `execCommand("paste")`/clipboard izin sistemi üzerinden) `event.
    // preventDefault()` ile TAMAMEN ENGELLİYORDU. Uygulamadaki normal
    // `<input>` alanlarında yapıştırma zaten çalışıyor (bkz.
    // `main/index.ts`'teki `enableDeprecatedPaste` + permission handler) —
    // xterm'in textarea'sı da aynı native mekanizmayı kullanan sıradan bir
    // DOM elemanı, dolayısıyla hiçbir özel koda gerek yok, sadece
    // ARAYA GİRMEMEK yeterli. Bu component artık Ctrl+V/sağ-tık'a hiç
    // dokunmuyor — xterm.js kendi `textarea`/`element` üzerindeki `paste`
    // event listener'ıyla (ve sağ tıkta tarayıcının kendi native context
    // menüsüyle) bunu native olarak hallediyor.

    const unsubscribeData = window.api.onTerminalData((id, data) => {
      if (id !== sessionId || disposed) return;
      if (flushed) {
        term.write(data);
      } else {
        pendingLive.push(data);
      }
    });

    window.api.getTerminalBuffer(sessionId).then((buffer) => {
      if (disposed) return;
      if (buffer) term.write(buffer);
      const queued = pendingLive;
      pendingLive = [];
      flushed = true;
      for (const chunk of queued) {
        if (disposed) return;
        term.write(chunk);
      }
    });

    const unsubscribeExit = window.api.onTerminalExit((id) => {
      if (id === sessionId && !disposed) {
        term.write("\r\n\u001b[90m[Oturum sonlandı — terminali kapatabilirsin]\u001b[0m\r\n");
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      safeFit();
      if (term.cols > 0 && term.rows > 0) {
        window.api.resizeTerminal(sessionId, term.cols, term.rows);
      }
    });
    resizeObserver.observe(containerRef.current);

    const container = containerRef.current;
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
      if (disposed) return;
      const dt = event.dataTransfer;
      if (!dt) return;
      if (dt.files && dt.files.length > 0) {
        const paths: string[] = [];
        for (let i = 0; i < dt.files.length; i++) {
          const file = dt.files.item(i);
          if (!file) continue;
          try {
            const filePath = window.api.getPathForFile(file);
            if (filePath) paths.push(quotePathIfNeeded(filePath));
          } catch {
            // yol alınamadı, o dosyayı atla
          }
        }
        if (paths.length > 0) {
          term.paste(paths.join(" "));
          term.focus();
        }
        return;
      }
      const text = dt.getData("text/plain");
      if (text) {
        term.paste(text);
        term.focus();
      }
    };
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);

    return () => {
      disposed = true;
      dataDisposable.dispose();
      unsubscribeData();
      unsubscribeExit();
      resizeObserver.disconnect();
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
      term.dispose();
    };
  }, [sessionId]);

  useEffect(() => {
    if (!active) return;
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit || !containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;
    try {
      fit.fit();
    } catch {
      // görünür olduğu ilk anda boyut henüz kararlı olmayabilir
    }
    term.focus();
    if (term.cols > 0 && term.rows > 0) {
      window.api.resizeTerminal(sessionId, term.cols, term.rows);
    }
  }, [active, sessionId]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}
