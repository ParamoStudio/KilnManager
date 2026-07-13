import { defineConfig } from "electron-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  main: {
    build: {
      outDir: "out/main",
      rollupOptions: { input: r("src/main/index.ts") },
    },
  },
  preload: {
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
