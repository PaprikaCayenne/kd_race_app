// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000', // 👈 Proxy API requests to backend
    },
  },
  build: {
    outDir: 'dist',
  },
  base: './', // ✅ Fix for relative paths in production
});
