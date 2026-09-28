import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { parseAppearance } from "../app-electron/shared/themeSurfaces";
import { applyAppearance } from "./ui/appearance";
import "./index.css";

// Görünüm React'ten ÖNCE yazılıyor: ana süreç seçimi adres sorgusuna koydu
// (bkz. app-electron/main/index.ts createWindow). Ayar IPC ile gelene kadar
// beklenseydi ilk kare varsayılan renkle boyanırdı.
const { palette, theme } = parseAppearance(window.location.search);
applyAppearance(document.documentElement, palette, theme, false);

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
