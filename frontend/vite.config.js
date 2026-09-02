import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
  ],

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    // Split chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core':  ['react', 'react-dom', 'react-router-dom'],
          'charts':      ['chart.js', 'react-chartjs-2'],
          'forms':       ['react-hook-form'],
          'axios':       ['axios'],
        },
      },
    },
    // Warn if any chunk > 500KB
    chunkSizeWarningLimit: 500,
  },

  // Optimise deps for faster cold starts
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'react-hook-form'],
  },
}));
