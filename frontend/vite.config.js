// File: frontend/vite.config.js
// Version: v0.8.0 — Maps / to users.html and /race to race.html
// https://kd.paprikacayenne.com/       → users.html (main-user.jsx)
// https://kd.paprikacayenne.com/race   → race.html (main-race.jsx)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  build: {
    rollupOptions: {
      input: {
        // 📱 Mobile UI at root
        users: path.resolve(__dirname, 'users.html'),

        // 🐎 Race screen at /race
        race: path.resolve(__dirname, 'race.html')
      }
    },
    outDir: 'frontend_build'
  }
});
