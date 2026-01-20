import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { viteNgrokPlugin } from './src/plugins/vite-ngrok-plugin';

export default defineConfig({
  plugins: [
    react(),
    viteNgrokPlugin(), // Плагин для работы с ngrok
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // Не переписываем путь
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
