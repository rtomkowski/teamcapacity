import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// One self-contained index.html (JS, CSS and the Excel library inlined), so the app
// opens by double-click from a shared folder without a local server.
export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: { assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 3000 },
});
