import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@zegon/game-core": path.resolve(__dirname, "../game-core/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
