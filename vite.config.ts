import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Plain-web build of the renderer (browser storage adapter). This is also the
// seed of the future online Páramo web tool. The Electron build uses
// electron.vite.config.ts instead.
export default defineConfig({
  root: "src/renderer",
  base: "./",
  resolve: {
    alias: {
      "@core": r("src/core/index.ts"),
      "@": r("src/renderer/src"),
    },
  },
  build: {
    outDir: r("out/web"),
    emptyOutDir: true,
  },
  plugins: [svelte()],
});
