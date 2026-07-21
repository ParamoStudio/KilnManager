import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// The mobile kiln-loading companion — a separate, lightweight PWA. Shares the
// pure-TS pricing/geometry engine (@core) with the desktop app but has its own
// small Svelte tree; no Electron, no vault, no pricing math (that only ever
// runs on desktop — see mobile/README.md).
//
// `base` is relative by default so `vite preview`/LAN testing works out of the
// box. The GitHub Pages workflow sets PAGES_BASE=/<repo-name>/ so the service
// worker gets an absolute scope (a relative base breaks SW registration on a
// project page, and the SW is what makes the app work offline).
const base = process.env.PAGES_BASE || "./";

export default defineConfig({
  root: "mobile",
  base,
  resolve: {
    alias: {
      "@core": r("src/core/index.ts"),
    },
  },
  build: {
    outDir: r("out/mobile"),
    emptyOutDir: true,
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Kiln Loader",
        short_name: "Kiln Loader",
        description: "Load a kiln from your phone — syncs with Kiln Manager on your computer.",
        start_url: "./",
        display: "standalone",
        background_color: "#0b0b0d",
        theme_color: "#0b0b0d",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // Precache everything the build emits — the whole point is that it
        // keeps working with the phone in Airplane Mode after the first visit.
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
    }),
  ],
});
