import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-dom") || id.includes("/react/")) return "react";
          if (id.includes("/convex/") || id.includes("@convex-dev/")) return "convex";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("i18next") || id.includes("react-i18next")) return "i18n";
          if (id.includes("recharts")) return "charts";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("date-fns")) return "date";

          return "vendor";
        },
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
  publicDir: 'public',
});
