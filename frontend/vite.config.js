// frontend/vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',      // Expose Vite server to the network
    port: 5173            // Use port 5173 for frontend dev
  },
  build: {
    outDir: 'dist'         // Output folder for production build
  }
});
