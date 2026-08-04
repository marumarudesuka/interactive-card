import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    cors: true,
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "interactive-card",
      fileName: () => "interactive-card.js",
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        assetFileNames: "[name].[ext]",
      },
    },
  },
});