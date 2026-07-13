import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts (which roots the web build at src/renderer)
// so the engine tests are always discovered at the project root.
export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ["tests/**/*.test.ts"],
  },
});
