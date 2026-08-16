import react from '@vitejs/plugin-react'
import path from 'path'

// Configuración de pruebas con Vitest. Las pruebas viven junto al código
// que cubren (src/**/*.test.ts) y usan el mismo alias '@' que la app.
// Nota: se exporta un objeto plano (sin defineConfig de 'vitest/config')
// para que funcione aunque Vitest se ejecute vía `npx vitest@^3` sin
// estar instalado como dependencia local.
export default {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
}
