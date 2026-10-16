// Uygulamadaki gerçek klavye kısayolları.
//
// Kaynak: useShellShortcuts.ts, AxetCodeHome.tsx, ChatComposer.tsx,
// ChatSessionPane.tsx, FileViewer.tsx, EmbeddedTerminal.tsx.
// UYDURMAK yasak: yalnızca gerçekten çalışan kısayollar buraya giriyor.
// Yeni kısayol eklenince bu dosyaya da eklenmeli.
//
// Grup açıklamaları için i18n: shortcuts.groupNav, shortcuts.groupChat,
// shortcuts.groupFile.

import type { TranslationKey } from "../i18n/tr";

export type ShortcutGroup = "nav" | "chat" | "file";

export interface Shortcut {
  /** Ekranda gösterilen tuş etiketi (örn. "Ctrl+K", "Shift+Enter"). */
  keys: string;
  /** i18n anahtarı — tr ve en'de eksiksiz olmalı. */
  descKey: TranslationKey;
  group: ShortcutGroup;
}

export const SHORTCUTS: Shortcut[] = [
  // --- Gezinme (nav) ---
  // Kaynak: useShellShortcuts.ts → onOpenPalette callback
  { keys: "Ctrl+K", descKey: "shortcuts.palette", group: "nav" },
  // Kaynak: useShellShortcuts.ts → mod değiştirme (SIDEBAR_MODES[0..2])
  { keys: "Ctrl+1", descKey: "shortcuts.modeChat", group: "nav" },
  { keys: "Ctrl+2", descKey: "shortcuts.modeLogon", group: "nav" },
  { keys: "Ctrl+3", descKey: "shortcuts.modeTerminal", group: "nav" },
  // Kaynak: useShellShortcuts.ts → F1 handler + Ctrl+/ handler (her ekranda)
  // Not: Türkçe klavyede `/` = Shift+7 → Ctrl+/ fiilen Ctrl+Shift+7 olarak
  // kaydedilir; tuş basılabilir ama Türkçe düzende güç. Kod çakışması yok.
  { keys: "F1 / Ctrl+/", descKey: "shortcuts.shortcutList", group: "nav" },
  // Kaynak: useShellShortcuts.ts → openSearch (satır 132: e.key === "/")
  { keys: "/", descKey: "shortcuts.sidebarSearch", group: "nav" },
  // Kaynak: useShellShortcuts.ts → isFind + sapLauncher (satır 126-128)
  { keys: "Ctrl+F", descKey: "shortcuts.logonSearch", group: "nav" },

  // --- Sohbet (chat) ---
  // Kaynak: AxetCodeHome.tsx → Ctrl+N handler
  { keys: "Ctrl+N", descKey: "axetCodeHome.shortcutNewChat", group: "chat" },
  // Kaynak: AxetCodeHome.tsx → Ctrl+↑/↓ handler
  { keys: "Ctrl+↑ / Ctrl+↓", descKey: "axetCodeHome.shortcutSwitchChat", group: "chat" },
  // Kaynak: ChatSessionPane.tsx → Ctrl+F handler (sohbet içi arama)
  { keys: "Ctrl+F", descKey: "axetCodeHome.shortcutFind", group: "chat" },
  // Kaynak: ChatComposer.tsx → Enter (sohbet içinde)
  { keys: "Enter", descKey: "axetCodeHome.shortcutSend", group: "chat" },
  // Kaynak: ChatComposer.tsx → Shift+Enter
  { keys: "Shift+Enter", descKey: "axetCodeHome.shortcutNewline", group: "chat" },
  // Kaynak: ChatComposer.tsx → ArrowUp (boş taslakta)
  { keys: "↑", descKey: "axetCodeHome.shortcutEditLast", group: "chat" },
  // Kaynak: AxetCodeHome.tsx → Escape (bekleyen tur)
  { keys: "Esc", descKey: "axetCodeHome.shortcutStop", group: "chat" },

  // --- Dosya gezgini (file) ---
  // Kaynak: FileViewer.tsx → Ctrl+S
  { keys: "Ctrl+S", descKey: "shortcuts.fileSave", group: "file" }
];
