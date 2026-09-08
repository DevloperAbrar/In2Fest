import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3001,
    host: "localhost",
    allowedHosts: [".localhost"]
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : []
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router-dom") || id.includes("/react-dom/") || id.includes("/react/")) return "vendor-react";
          if (id.includes("framer-motion") || id.includes("lucide-react")) return "vendor-ui";
          if (id.includes("/axios/") || id.includes("/dayjs/") || id.includes("embla-carousel-react")) return "vendor-misc";
        }
      }
    }
  }
}));
