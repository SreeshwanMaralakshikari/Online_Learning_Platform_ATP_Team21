import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Dev proxy — only used when running `vite` locally.
  // In production (Vercel) all API calls go through VITE_API_URL instead.
  server: mode === 'development' ? {
    proxy: {
      '/auth': 'http://localhost:1935',
      '/student-api': 'http://localhost:1935',
      '/instructor-api': 'http://localhost:1935',
      '/admin-api': 'http://localhost:1935',
      '/uploads': 'http://localhost:1935',
    }
  } : {}
}))
