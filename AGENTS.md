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
- Supabase Auth + PostgreSQL + Edge Functions (conectado a proyecto cloud)
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
4. ✅ Citas conectadas a Supabase (agendar, listar, videollamada real).
5. ✅ Edge Function `send-email` preparada para Resend (pendiente API key para activar).
6. ✅ Fase 1 (2026-07-27): perfiles editables con avatar (Supabase Storage), verificación documental de profesionistas + panel admin `/admin/verificacion`, disponibilidad real conectada al booking (RPC `get_booked_slots`), notificaciones in-app con Realtime, CI/CD con GitHub Actions.
7. ⏳ Ejecutar `platform/supabase/migrations/005_phase1_profiles_documents_notifications.sql` en el SQL Editor (crea tablas `professional_documents`, `notifications`, `legal_acceptances`, `platform_settings`, buckets `avatars` y `professional-documents`).
8. ⏳ Agregar secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en GitHub (Settings > Secrets > Actions) para el workflow de deploy.
9. Implementar pagos (Openpay recomendado para marketplace MX; ver `docs/investigacion-plataforma-2026-07-27.md`) cuando haya tracción.

## Despliegue
- GitHub Pages publica la rama `main` (sitio estático original en raíz).
- La plataforma React compilada se encuentra en `/app/`.
- Base URL configurada en `platform/web/vite.config.ts` como `/tanatologia/app/`.
- Se usa `HashRouter` para evitar errores 404 en rutas de SPA en GitHub Pages.
- El archivo `/app/404.html` redirige cualquier ruta desconocida al hash correspondiente (`/#/ruta`).
- El workflow `.github/workflows/deploy-app.yml` compila `platform/web` y copia el build a `/app/` automáticamente en cada push a `main` que toque `platform/web/**` (requiere los secrets de Supabase configurados).

## Registro de nuevos usuarios
- Al registrarse, el trigger `handle_new_user()` crea automáticamente el perfil en `profiles` y, según el rol, un registro en `patient_profiles` o `professional_profiles`.
- Si deseas que el registro sea inmediato (sin confirmar correo), desactiva **Confirm email** en:
  **Supabase Dashboard > Authentication > Providers > Email > Confirm email**.
- Para aplicar el trigger actualizado con subperfiles, ejecuta en el SQL Editor:
  `platform/supabase/migrations/002_update_trigger_subprofiles.sql`.

## Verificación de profesionistas (Fase 1)
- El profesional captura su cédula y sube documentos (cédula, título, INE, comprobante) desde `/profesional/verificacion`; los archivos van al bucket privado `professional-documents` (carpeta por `profile_id`).
- `submit_for_review()` (RPC) valida requisitos mínimos y pasa el perfil a `in_review`.
- El admin revisa en `/admin/verificacion` con URLs firmadas, consulta manualmente la cédula en https://cedulaprofesional.sep.gob.mx/ y aprueba (`verified` + visible en directorio) o rechaza con motivo.
- La investigación completa (benchmark, pagos, legal, roadmap) está en `docs/investigacion-plataforma-2026-07-27.md`.
