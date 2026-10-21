import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// The engine packages are ESM-only, so they are bundled into main instead of required.
const bundled = ["@icpfinder/core", "@icpfinder/providers"];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: bundled })],
    // mcpBrowser.js is started by Claude Code as the in-app browser's MCP server.
    build: {
      rollupOptions: {
        input: { index: "src/main/index.ts", mcpBrowser: "src/main/mcpBrowser.ts" },
      },
    },
  },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { plugins: [react()] },
});
