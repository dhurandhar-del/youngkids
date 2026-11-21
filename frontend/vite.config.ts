import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the backend runs on :8787 and Vite proxies /api to it, so VITE_API_URL can stay empty.
const apiTarget = `http://127.0.0.1:${process.env.BACKEND_PORT ?? 8787}`;

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
    },
  },
});
