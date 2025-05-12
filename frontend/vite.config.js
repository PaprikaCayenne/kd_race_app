// File: frontend/vite.config.js
// Version: v0.3.0 — Injects app version using package.json, removes need for hardcoded index.html version

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { version } from './package.json';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: {
    __KD_RACE_APP_VERSION__: JSON.stringify(`v${version}`),
    __KD_BACKEND_VERSION__: JSON.stringify('v0.7.20'), // optional, update as needed
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    outDir: 'dist',
  },
  base: './',
});
