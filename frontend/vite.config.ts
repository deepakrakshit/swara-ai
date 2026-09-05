import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/chat': 'http://127.0.0.1:8000',
      '/system': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
      '/files': 'http://127.0.0.1:8000',
      '/artifacts': 'http://127.0.0.1:8000',
      '/sessions': 'http://127.0.0.1:8000',
      '/events': 'http://127.0.0.1:8000',
      '/stream': 'http://127.0.0.1:8000',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
