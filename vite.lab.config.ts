import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The Lab build — the distilled, free version of the app, meant to be dropped
 * into Páramo Ceramic Lab as a static folder.
 *
 * Same renderer source as the desktop app, with VITE_LAB=1 stripping the parts
 * that need a real computer (see src/renderer/src/lib/lab.ts). Kept as a build
 * flag rather than a fork so the two can never disagree about a price.
 *
 * `base: "./"` matters: the host site decides where this lives, so every asset
 * reference has to be relative. There is no router, so no server rewrites are
 * needed either — it drops into any subfolder and works.
 */
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
    outDir: r("out/lab"),
    emptyOutDir: true,
    // The heavy export machinery (PDF/ZIP) is dynamically imported, so it
    // stays out of the initial download for anyone who never exports.
    chunkSizeWarningLimit: 700,
  },
  plugins: [svelte()],
});
