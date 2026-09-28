import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { Plugin } from "vite";
import { relaxCspForDev } from "./app-electron/shared/devCsp";

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

// index.html'deki CSP paketlenmiş uygulamanın politikası. Vite geliştirme
// sunucusu satır içi react-refresh betiği ve HMR websocket'i istiyor; yalnızca
// `serve` kipinde gevşetiliyor, derleme çıktısı sıkı kalıyor. flow-sandbox.html
// bilerek dışarıda: onun politikası geliştirmede de gevşemesin.
function devContentSecurityPolicy(): Plugin {
  return {
    name: "dev-content-security-policy",
    apply: "serve",
    transformIndexHtml: {
      order: "pre",
      handler: (html, ctx) => (basename(ctx.filename) === "index.html" ? relaxCspForDev(html) : html)
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
        input: "app-electron/preload/index.ts",
        // Ana pencere `sandbox: true` (bkz. app-electron/main/index.ts):
        // sandbox'lı pencerede preload ESM olamıyor. Paket `type: module`
        // olduğu için electron-vite varsayılan olarak .mjs üretiyordu.
        output: { format: "cjs", entryFileNames: "[name].cjs" }
      }
    }
  },
  renderer: {
    root: ".",
    plugins: [react(), devContentSecurityPolicy()],
    build: {
      outDir: "dist",
      rollupOptions: {
        // flow-sandbox.html: function node / xlsx sandbox penceresinin sayfası.
        input: { index: "index.html", flowSandbox: "flow-sandbox.html" }
      }
    }
  }
});
