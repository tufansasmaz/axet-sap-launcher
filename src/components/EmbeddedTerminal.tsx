import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { quotePathIfNeeded } from "../lib/paths";

interface Props {
  sessionId: string;
  active: boolean;
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
      // xterm kendi tuvalini boyuyor, CSS değişkenlerini okumuyor — bu yüzden
      // renkler burada elle tutuluyor ve koyu temanın base/ink jetonlarıyla
      // AYNI değerde olmaları gerekiyor (--base-950 / --ink-100). Palet
      // değişirse burası da değişmeli; bağ otomatik değil.
      theme: {
        background: "#121019",
        foreground: "#eceaf2",
        cursor: "#60a5fa"
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

    // Ctrl+V yapıştırma: xterm.js Ctrl+V'yi KASITLI OLARAK paste olarak ele
    // almıyor — terminal/readline dünyasında bu kombinasyon "sıradaki
    // karakteri literal ekle" (quoted-insert) anlamına geldiği için xterm.js
    // onu ham bir kontrol baytı olarak shell'e iletiyor
    // (bkz. xterm.js#2478/#2390 — "xterm.js doesn't do anything special
    // with paste, embedder'ın `attachCustomKeyEventHandler` ile kendisi
    // uygulaması gerekiyor"). Önceki bir sürümün buradaki yorumu ("sıradan
    // bir textarea, dokunmaya gerek yok") bu yüzden YANLIŞTI — dokunmamak
    // normal `<input>` alanlarında çalışan native paste'in terminalde hiç
    // tetiklenmemesine yol açıyordu.
    //
    // ÖNEMLİ — önceki başarısız girişimden FARKI: o girişim TÜM `document`
    // üzerinde global bir `keydown` (`capture:true`) listener'ı kullanıp
    // `preventDefault()` ile native paste zincirini HER YERDE (input
    // alanları dahil) kırmıştı, üstüne bir de ana süreç Win32 `clipboard`
    // IPC'si hep boş string döndürüyordu. Burada SADECE bu `Terminal`
    // örneğine özel `attachCustomKeyEventHandler` kullanılıyor — bu handler
    // yalnızca xterm'in kendi textarea'sı odaktayken çağrılır, `document`
    // seviyesinde hiçbir şeye dokunmaz, diğer input alanlarındaki mevcut
    // native paste akışını etkilemez. Metin `navigator.clipboard.readText()`
    // (zaten `CopyButton.tsx`'te `writeText` için kullanılan aynı Async
    // Clipboard API) ile okunup `term.paste()`'e veriliyor.
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const isPasteCombo = (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "v";
      if (!isPasteCombo) return true;
      // KRİTİK: preventDefault() BURADA çağrılmalı, sadece `return false`
      // YETMEZ — xterm.js'in kendi `_keyDown()` implementasyonu
      // (`_customKeyEventHandler(e)` false dönünce `return false` ile
      // erken çıkıyor) native keyboard event'i HİÇ preventDefault ETMİYOR,
      // sadece xterm'in KENDİ iç işlemesini (data gönderme) durduruyor.
      // Bu yüzden Chromium'un native Ctrl+V klavye kısayolu (main/index.ts
      // `enableDeprecatedPaste:true` + Menu'deki paste rolünün
      // `registerAccelerator:false` olması sayesinde hâlâ aktif) DEVAM
      // EDİYORDU — bu da xterm'in textarea'sına gerçek bir native "paste"
      // DOM event'i gönderiyordu, ve xterm.js'in KENDİSİ bu textarea'ya
      // ayrıca bir "paste" event dinleyicisi bağlıyor (bkz. xterm.js
      // kaynağında `handlePasteEvent`) — o dinleyici de aynı metni ayrıca
      // yapıştırıyordu. Sonuç: ikisi üst üste binip metin İKİ KEZ
      // yazılıyordu (canlı bulgu, 2026-09-02). `preventDefault()` bu native
      // yolu tamamen kapatıyor, geriye SADECE bizim manuel
      // `navigator.clipboard.readText()` → `term.paste()` yolu kalıyor.
      event.preventDefault();
      navigator.clipboard
        .readText()
        .then((text) => {
          if (disposed || !text) return;
          term.paste(text);
        })
        .catch(() => {
          // Panoya erişilemedi (izin/WIP vb.) — sessizce yoksay, terminal
          // en azından eskisi gibi ham Ctrl+V baytını göndermeye devam eder.
        });
      return false;
    });

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
