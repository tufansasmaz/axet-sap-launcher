import { useEffect, useRef } from "react";
import { SIDEBAR_MODES, type SidebarMode } from "./activity";

export interface ShellShortcutOptions {
  // Ortada listesi duran mod; `/` ve Ctrl+F hangi arama kutusunun
  // kastedildiğini buradan biliyor.
  listMode: SidebarMode;
  sidebarCollapsed: boolean;
  onModeChange: (mode: SidebarMode) => void;
  // Config'e yazıp döndüğünde kutu çizilmiş oluyor; odak ondan sonra.
  onExpandSidebar: () => Promise<void>;
  // Ctrl+K: komut paleti.
  onOpenPalette?: () => void;
}

// Gömülü terminal (xterm) kendi tuşlarını kendi işliyor; axet-code'un TUI'si
// Ctrl+rakam ve `/` kullanabilir.
export function isInTerminal(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".xterm") !== null;
}

// `/` yazılabilen yerde bir karakter, kısayol değil. `isContentEditable`
// jsdom'da yok; nitelikten bakılıyor.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (isInTerminal(target)) return true;
  if (target.closest('[contenteditable]:not([contenteditable="false"])')) return true;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

// Kutu en fazla bu kadar kare beklenir; gelmezse odak verilmeden bırakılır.
const SEARCH_FOCUS_MAX_FRAMES = 10;

function focusSidebarSearch(framesLeft = SEARCH_FOCUS_MAX_FRAMES) {
  // Bir kare sonra: kutu o anda çizilmiyor olabilir (daraltma yeni açıldı,
  // Hazırlık'tan dönülüyor). Tek kare yetmeyebilir: açılışta `setConfig`
  // React olayı dışında çalıştığı için React 18 çizimi ayrı bir göreve
  // bırakıyor ve ilk kare kutudan önce gelebiliyor. Kutu çıkana kadar sınırlı
  // sayıda kare yeniden deneniyor; sınır, sonsuz döngüyü de önlüyor.
  requestAnimationFrame(() => {
    const box = document.querySelector<HTMLInputElement>("[data-sidebar-search]");
    if (box) {
      box.focus();
      return;
    }
    if (framesLeft > 1) focusSidebarSearch(framesLeft - 1);
  });
}

// Kabuk kısayolları (spec §6.4). Ctrl+B bilerek yok: gömülü terminalde
// axet-code'un kendi kısayolu.
export function useShellShortcuts(options: ShellShortcutOptions): void {
  // Dinleyici bir kez kuruluyor, değerler her render'da buraya yazılıyor.
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    const openSearch = () => {
      const { sidebarCollapsed, onExpandSidebar } = latest.current;
      if (sidebarCollapsed) {
        void onExpandSidebar().then(() => focusSidebarSearch());
        return;
      }
      focusSidebarSearch();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const { listMode, onModeChange, onOpenPalette } = latest.current;
      const mod = e.ctrlKey || e.metaKey;
      const isFind = mod && !e.altKey && e.key.toLowerCase() === "f";

      // Açık bir pencere (`aria-modal`) varken kabuk susuyor: `/` odağı
      // pencerenin arkasındaki arama kutusuna kaçırır, Ctrl+1–3 modu
      // pencerenin arkasında değiştirirdi. `Modal` yalnızca Tab'i tutuyor.
      // Tarayıcının bul çubuğu yine engelleniyor.
      if (document.querySelector('[aria-modal="true"]')) {
        if (isFind) e.preventDefault();
        return;
      }

      // Rakam aralığı listeden geliyor: gizli mod için boşta kalan Ctrl+4
      // yutulmuyor, `undefined` bir mod da istenmiyor.
      const modeIndex = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : -1;
      if (mod && !e.altKey && !e.shiftKey && modeIndex >= 0 && modeIndex < SIDEBAR_MODES.length) {
        if (isInTerminal(e.target)) return;
        e.preventDefault();
        onModeChange(SIDEBAR_MODES[modeIndex]);
        return;
      }

      // Ctrl+K yazı alanından da açıyor (palet bir "her yerden git" kapısı);
      // terminalde değil — kabukta satırın sonunu siliyor.
      if (mod && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k" && onOpenPalette) {
        if (isInTerminal(e.target)) return;
        e.preventDefault();
        onOpenPalette();
        return;
      }

      // Tarayıcının bul çubuğu bu uygulamada anlamsız; her ekranda
      // engelleniyor (bugünkü davranış). Kutu yalnızca Logon'da.
      if (isFind) {
        e.preventDefault();
        if (listMode === "sapLauncher") openSearch();
        return;
      }

      if (e.key === "/" && !mod && !e.altKey) {
        // Script'te ve Terminal'de kenar çubuğunda arama kutusu yok.
        if (listMode === "sapGuiScripting" || listMode === "terminal" || isTypingTarget(e.target)) return;
        e.preventDefault();
        openSearch();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
