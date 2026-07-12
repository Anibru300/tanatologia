# AGENTS.md — SOMOS-CALMA

## Contexto del proyecto
Plataforma de acompañamiento emocional y tanatología en México. Actualmente en fase beta/MVP.

## Ubicación del código fuente
- Nuevo stack React: `platform/web/`
- Migraciones Supabase: `platform/supabase/migrations/`
- Sitio estático legacy: raíz del repo (`index.html`, `assets/`, `pages/`)

## Stack
- React 19 + Vite 8 + TypeScript 6
- Tailwind CSS 3
- React Router DOM 7
- Lucide React (iconos)
- Supabase Auth + PostgreSQL (conectado a proyecto cloud)
- Jitsi Meet (pendiente de integración)
- Resend (pendiente de API key)

## Cómo ejecutar
```bash
cd platform/web
npm install   # solo en disco local, evitar Google Drive/OneDrive
npm run build # debe pasar sin errores
npm run dev   # servidor local
```

## Configuración de Supabase
1. Crear un proyecto en https://supabase.com.
2. Copiar `Project URL` y `anon public key` desde **Project Settings > API**.
3. Crear `platform/web/.env` a partir de `.env.example` y pegar esos valores.
4. Ejecutar `platform/supabase/migrations/001_initial_schema.sql` en el **SQL Editor** del proyecto.
5. (Opcional) Crear usuarios demo con el service role key:
   ```bash
   cd platform/web
   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/seed-demo.mjs
   ```
   El `service role key` nunca debe subirse al frontend ni al repositorio.

## Notas ACID
La migración está diseñada para aprovechar las garantías ACID de PostgreSQL:
- **Atomicidad:** el registro de usuario y la creación de perfil ocurren en la misma transacción mediante un trigger en `auth.users`.
- **Consistencia:** constraints (`CHECK`, `NOT NULL`, `UNIQUE`, `FOREIGN KEY`) y RLS validan estados válidos.
- **Aislamiento:** PostgreSQL gestiona concurrencia con MVCC.
- **Durabilidad:** los commits persisten en el almacenamiento de Supabase Cloud.

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
1. ✅ Autenticación conectada a Supabase Auth; `MOCK_USERS` eliminado.
2. ✅ Migración SQL ACID ejecutada en proyecto Supabase Cloud.
3. ✅ Integrar Jitsi Meet en `ProfessionalVideoRoom` y sala de paciente (usando `meet.jit.si`).
4. Configurar Resend para enviar cotizaciones y notificaciones.
5. Implementar pagos (Stripe/PayPal) cuando haya tracción.
3. Integrar Jitsi Meet en `ProfessionalVideoRoom` y sala de paciente.
4. Configurar Resend para enviar cotizaciones y notificaciones.
5. Implementar pagos (Stripe/PayPal) cuando haya tracción.

## Despliegue
- GitHub Pages publica la rama `main` (sitio estático original en raíz).
- La plataforma React compilada se encuentra en `/app/`.
- Base URL configurada en `platform/web/vite.config.ts` como `/tanatologia/app/`.
- Se usa `HashRouter` para evitar errores 404 en rutas de SPA en GitHub Pages.
- El archivo `/app/404.html` redirige cualquier ruta desconocida al hash correspondiente (`/#/ruta`).

## Registro de nuevos usuarios
- Al registrarse, el trigger `handle_new_user()` crea automáticamente el perfil en `profiles` y, según el rol, un registro en `patient_profiles` o `professional_profiles`.
- Si deseas que el registro sea inmediato (sin confirmar correo), desactiva **Confirm email** en:
  **Supabase Dashboard > Authentication > Providers > Email > Confirm email**.
- Para aplicar el trigger actualizado con subperfiles, ejecuta en el SQL Editor:
  `platform/supabase/migrations/002_update_trigger_subprofiles.sql`.
