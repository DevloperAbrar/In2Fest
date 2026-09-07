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
    // Drop console.* and debugger statements from the production bundle.
    // They add noise, can leak internal state, and add bundle size.
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : []
    },
    rollupOptions: {
      output: {
        // Split heavy vendor libraries into separate chunks so returning
        // visitors only re-download chunks that actually changed.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["framer-motion", "lucide-react"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "yup"],
          "vendor-charts": ["recharts"],
          "vendor-misc": ["axios", "dayjs", "zustand"]
        }
      }
    }
  }
}));