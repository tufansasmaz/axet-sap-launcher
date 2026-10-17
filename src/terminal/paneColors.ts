// Bölme renkleri (spec 2026-10-14 §4). Sabit hex yok: tema jetonları, koyu ve
// açık temada ayrı tanımlı. `gray` = renksiz (şerit yok, nokta boş).
import type { TerminalPaneColor } from "../../app-electron/shared/types";
import type { TranslationKey } from "../i18n/tr";

export const PANE_COLOR_VAR: Record<TerminalPaneColor, string | null> = {
  gray: null,
  blue: "var(--status-info-text)",
  green: "var(--status-success-text)",
  amber: "var(--status-warning-text)",
  red: "var(--status-danger-text)",
  violet: "var(--project-soft-text)"
};

export const PANE_COLOR_LABEL: Record<TerminalPaneColor, TranslationKey> = {
  gray: "terminal.colorGray",
  blue: "terminal.colorBlue",
  green: "terminal.colorGreen",
  amber: "terminal.colorAmber",
  red: "terminal.colorRed",
  violet: "terminal.colorViolet"
};
