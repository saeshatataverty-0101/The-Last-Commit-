import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages / any sub-path.
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 900 },
});
