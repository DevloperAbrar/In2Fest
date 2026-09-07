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
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["framer-motion", "lucide-react"],
          "vendor-misc": ["axios", "dayjs", "embla-carousel-react"]
        }
      }
    }
  }
}));