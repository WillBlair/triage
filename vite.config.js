import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  // Same proxy for `vite preview` so /api/intake-tokens works after build.
  preview: {
    host: true,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
