import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt': el SW nuevo espera a que el usuario acepte la actualización
      // (banner "Nueva versión disponible"), igual que el flujo de viajespro.
      registerType: 'prompt',
      includeAssets: [],
      manifest: {
        id: '/app/',
        lang: 'es',
        name: 'SOMOS-CALMA',
        short_name: 'SOMOS-CALMA',
        description:
          'Tu espacio seguro para sanar y encontrar alivio. Tanatólogos y psicólogos certificados en México.',
        start_url: '/app/',
        scope: '/app/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F5F2',
        theme_color: '#7A8B6E',
        icons: [
          {
            src: '/assets/images/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/images/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/images/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // La sesión de Supabase vive en localStorage: recargar tras actualizar
        // nunca cierra la sesión del usuario.
        clientsClaim: true,
        skipWaiting: false,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  define: {
    // npm_package_version está disponible al correr vía npm scripts (dev, build, CI)
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  base: '/app/',
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
