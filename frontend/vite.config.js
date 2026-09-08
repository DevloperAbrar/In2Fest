import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    host: "localhost",
    proxy: {
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false
      },
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : []
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router-dom") || id.includes("/react-dom/") || id.includes("/react/")) return "vendor-react";
          if (id.includes("framer-motion") || id.includes("lucide-react")) return "vendor-ui";
          if (id.includes("react-hook-form") || id.includes("@hookform/resolvers") || id.includes("/yup/")) return "vendor-forms";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("/axios/") || id.includes("/dayjs/") || id.includes("/zustand/")) return "vendor-misc";
        }
      }
    }
  }
}));
