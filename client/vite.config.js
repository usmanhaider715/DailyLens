import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5001', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
      '/sitemap.xml': { target: 'http://localhost:5001', changeOrigin: true },
      '/robots.txt': { target: 'http://localhost:5001', changeOrigin: true },
      '/feed.xml': { target: 'http://localhost:5001', changeOrigin: true },
      '/llms.txt': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },
});
