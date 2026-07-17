import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  main: {
    // Keep node_modules (exceljs, …) external so they're required at runtime
    // instead of bundled — exceljs uses dynamic requires that don't bundle well.
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      rollupOptions: { input: r("src/main/index.ts") },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      rollupOptions: { input: r("src/preload/index.ts") },
    },
  },
  renderer: {
    root: "src/renderer",
    build: {
      outDir: "out/renderer",
      rollupOptions: { input: r("src/renderer/index.html") },
    },
    resolve: {
      alias: {
        "@core": r("src/core/index.ts"),
        "@": r("src/renderer/src"),
      },
    },
    plugins: [svelte()],
  },
});
