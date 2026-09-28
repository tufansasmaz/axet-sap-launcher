import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

// Flow sandbox penceresinin preload'u elle yazılmış CommonJS: `sandbox: true`
// olan bir pencerede preload ESM olamıyor, paketlenmesine de gerek yok
// (yalnızca `require('electron')` kullanıyor). Olduğu gibi
// dist-electron/preload'a kopyalanıyor (bkz. app-electron/main/flowSandbox.ts).
// Yol, renderer'ın `root: "."`'u gibi proje köküne göre.
function copyFlowSandboxPreload(): Plugin {
  const source = resolve("app-electron/preload/flowSandbox.cjs");
  return {
    name: "copy-flow-sandbox-preload",
    buildStart() {
      this.addWatchFile(source);
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "flowSandbox.cjs", source: readFileSync(source, "utf8") });
    }
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["fast-xml-parser"] })],
    build: {
      outDir: "dist-electron/main",
      rollupOptions: {
        input: "app-electron/main/index.ts"
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin(), copyFlowSandboxPreload()],
    build: {
      outDir: "dist-electron/preload",
      rollupOptions: {
        input: "app-electron/preload/index.ts"
      }
    }
  },
  renderer: {
    root: ".",
    plugins: [react()],
    build: {
      outDir: "dist",
      rollupOptions: {
        // flow-sandbox.html: function node / xlsx sandbox penceresinin sayfası.
        input: { index: "index.html", flowSandbox: "flow-sandbox.html" }
      }
    }
  }
});
