import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

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
    plugins: [externalizeDepsPlugin()],
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
        input: "index.html"
      }
    }
  }
});
