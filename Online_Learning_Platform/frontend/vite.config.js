import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) return 'router'
            if (id.includes('axios')) return 'axios'
            return 'vendor'
          }
        },
      },
    },
  },
  server: mode === 'development'
    ? {
        proxy: {
          '/auth': 'http://localhost:1935',
          '/student-api': 'http://localhost:1935',
          '/instructor-api': 'http://localhost:1935',
          '/admin-api': 'http://localhost:1935',
          '/uploads': 'http://localhost:1935',
        },
      }
    : {},
}))