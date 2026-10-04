import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages / any sub-path.
export default defineConfig({
  base: "./",
  // fonts are inlined so the build also works as a single offline file
  build: { chunkSizeWarningLimit: 900, assetsInlineLimit: 100_000 },
});
