# AGENTS.md — SOMOS-CALMA

## Contexto del proyecto
Plataforma de acompañamiento emocional y tanatología en México. Actualmente en fase beta/MVP.

## Ubicación del código fuente
- Nuevo stack React: `platform/web/`
- Migraciones Supabase: `platform/supabase/migrations/`
- Sitio estático legacy: raíz del repo (`index.html`, `assets/`, `pages/`)

## Stack
- React 19 + Vite 6 + TypeScript 6
- Tailwind CSS 3
- React Router DOM 7
- Lucide React (iconos)
- Supabase JS client (pendiente de conexión real)
- Jitsi Meet (pendiente de integración)
- Resend (pendiente de API key)

## Cómo ejecutar
```bash
cd platform/web
npm install   # solo en disco local, evitar Google Drive/OneDrive
npm run build # debe pasar sin errores
npm run dev   # servidor local
```

## Convenciones
- Path alias `@/` apunta a `platform/web/src/`.
- Componentes UI en `src/components/ui/`.
- Cada portal tiene su layout en `src/app/layouts/` y páginas en `src/features/{rol}/pages/`.
- Roles: `patient`, `professional`, `admin`.

## Cuentas demo
- paciente@demo.com / demo123
- profesional@demo.com / demo123
- admin@demo.com / demo123

## Pendientes críticos
1. Conectar autenticación con Supabase Auth y reemplazar `MOCK_USERS`.
2. Ejecutar migraciones SQL en proyecto Supabase real.
3. Integrar Jitsi Meet en `ProfessionalVideoRoom` y sala de paciente.
4. Configurar Resend para enviar cotizaciones y notificaciones.
5. Implementar pagos (Stripe/PayPal) cuando haya tracción.

## Despliegue
- GitHub Pages con workflow en `.github/workflows/deploy-platform.yml`.
- Base URL configurada en `platform/web/vite.config.ts` como `/tanatologia/`.
