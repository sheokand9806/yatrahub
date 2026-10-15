import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the React dev server (5173) proxies the API and the static
// assets (images, css) to the Express server (3000).
const target = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': target, '/img': target, '/css': target }
  },
  build: { outDir: 'dist', emptyOutDir: true }
});
