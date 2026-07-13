import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/tanatologia/app/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // El bundle incluye React, Router, Supabase y Lucide; es razonable para un MVP.
    // A medida que crezca la app se puede aplicar más code-splitting por ruta.
    chunkSizeWarningLimit: 600,
  },
})
