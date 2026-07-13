# Correcciones de seguridad y bugs críticos — 2026-07-12

## Resumen ejecutivo

Se corrigieron las vulnerabilidades críticas identificadas en el diagnóstico del MVP y varios bugs funcionales bloqueantes. El build de React pasa (`npm run build`) y el sitio compilado se copió a `/app/` para GitHub Pages.

## Cambios realizados

### 1. Auto-registro de administradores eliminado
- **`platform/web/src/features/auth/RegisterPage.tsx`**: se quitó la opción `Administración` del selector de roles. Ahora solo se permite `patient` y `professional`.
- **`platform/supabase/migrations/003_security_fixes.sql`**: el trigger `handle_new_user()` fuerza a `patient` cualquier rol distinto de `patient`/`professional`. Los roles `admin`/`support` deben crearse manualmente por un admin existente (vía `seed-demo.mjs` o SQL con service role).

### 2. RLS endurecido
Archivo: `platform/supabase/migrations/003_security_fixes.sql`

- `profiles`: trigger `enforce_profile_update_restrictions` impide cambiar `id`, `email`, `role` e `is_active` sin ser admin.
- `professional_profiles`: trigger `enforce_professional_profile_update_restrictions` impide que un profesional modifique `verification_status`, `is_visible` y `rating`.
- `appointments`: trigger `set_appointment_video_link` genera automáticamente una sala Jitsi aleatoria al insertar; trigger `enforce_appointment_update_restrictions` limita qué campos puede editar paciente/profesional.
- `clinical_notes`: trigger `validate_clinical_note` garantiza que la nota corresponda a una cita donde el profesional es el asignado.
- `quotes`: trigger `limit_quote_submissions` limita a 5 cotizaciones por correo cada hora.
- `audit_logs`: se eliminó la política que permitía a usuarios insertar sus propios logs.

### 3. Nombres duplicados en subperfiles
Para evitar que los joins `profiles(full_name)` fallen por RLS, se agregó la columna `full_name` a `patient_profiles` y `professional_profiles`, se poblaron con los datos existentes y se agregó un trigger de sincronización desde `profiles`.

### 4. Salas Jitsi no predecibles
- El nombre de sala se genera ahora con `gen_random_uuid()` en la base de datos (`sc-<uuid>`).
- El frontend sigue usando `appointment.video_link` como `roomName` para el iframe de Jitsi.
- `platform/web/src/lib/video.ts` genera salas aleatorias cuando se usa manualmente.

### 5. Edge Function `send-email` restringida
- **`platform/supabase/supabase/functions/send-email/index.ts`**: ahora requiere autenticación (`auth: "required"`), valida el rol contra la tabla `profiles`. Admin/professional/support pueden notificar a terceros; los pacientes solo pueden enviarse correos a sí mismos.
- **`platform/supabase/supabase/config.toml`**: `verify_jwt = true`.

### 6. Cotización corregida
- **`platform/web/src/features/patient/QuotePage.tsx`**: el cálculo de programas ya no multiplica el precio del paquete por la cantidad de sesiones.
- El envío de correo de confirmación solo ocurre si el usuario está autenticado (la Edge Function ya no acepta llamadas anónimas).

### 7. Recuperación de contraseña con HashRouter
- **`platform/web/index.html`**: script que detecta `?type=recovery` y redirige al HashRouter (`#/actualizar-contrasena`) antes de que React tome el control.
- **`platform/web/src/features/auth/ForgotPasswordPage.tsx`**: `redirectTo` apunta a `/tanatologia/app/` (sin hash), dejando que el index.html y Supabase manejen el token.

### 8. Enlaces legacy corregidos
- **`pages/login.html`**: redirige a `/tanatologia/app/#/login`.
- **`404.html`**: redirige a la app React con hash en lugar de inyectar HTML con hashes de build obsoletos.

### 9. Botón de salida rápida en portales autenticados
Agregado `QuickExitButton` a:
- `PatientLayout.tsx`
- `ProfessionalLayout.tsx`
- `AdminLayout.tsx`

### 10. Imagen rota
- **`pages/recursos/carta-a-quien-ya-no-esta.html`**: se reemplazó `frase-brazos.png` por `frase-aceptar.jpeg`.

## Archivos modificados

```
platform/supabase/migrations/003_security_fixes.sql          (nuevo)
platform/supabase/supabase/functions/send-email/index.ts
platform/supabase/supabase/config.toml
platform/web/src/features/auth/RegisterPage.tsx
platform/web/src/features/auth/ForgotPasswordPage.tsx
platform/web/src/features/appointments/appointmentsService.ts
platform/web/src/features/admin/adminService.ts
platform/web/src/features/patient/QuotePage.tsx
platform/web/src/lib/video.ts
platform/web/src/app/layouts/PatientLayout.tsx
platform/web/src/app/layouts/ProfessionalLayout.tsx
platform/web/src/app/layouts/AdminLayout.tsx
platform/web/index.html
pages/login.html
404.html
pages/recursos/carta-a-quien-ya-no-esta.html
app/ (build actualizado)
```

## Pasos de despliegue obligatorios

### 1. Ejecutar migración 003 en Supabase Cloud
Abrir el SQL Editor del proyecto `qjwebikgrqtotqfipeqt` y ejecutar:

```sql
-- Ejecutar el contenido de platform/supabase/migrations/003_security_fixes.sql
```

### 2. Redesplegar Edge Function
```bash
cd platform/supabase
supabase functions deploy send-email
```

Verificar en Supabase Dashboard que la función tenga configurado `Verify JWT = true`.

### 3. Verificar configuración de Auth
En Supabase Dashboard > Authentication > URL Configuration:
- Site URL: `https://anibru300.github.io/tanatologia/app/`
- Additional redirect URLs: `https://anibru300.github.io/tanatologia/app/`

Esto asegura que los emails de recuperación redirijan correctamente.

### 4. Recrear citas de prueba (si aplica)
Las citas creadas antes de esta migración no tienen `video_link` generado por trigger. Se recomienda cancelarlas y crear nuevas, o actualizarlas manualmente desde SQL con un UUID aleatorio.

### 5. Crear usuarios admin
Los administradores deben crearse manualmente con service role key:

```bash
cd platform/web
SUPABASE_URL=https://qjwebikgrqtotqfipeqt.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
node scripts/seed-demo.mjs
```

O bien crear el usuario desde Supabase Auth con `user_metadata.role = 'admin'`.

## Pendientes que requieren datos del negocio

1. **Datos legales**: domicilio fiscal completo y razón social constituida en `platform/web/src/lib/siteConfig.ts` y en las páginas legales.
2. **Alta de Dra. Edith González Huerta**: se requieren correo, cédula profesional, universidad/especialidad, bio, especialidades, precios, disponibilidad y foto.
3. **Pasarela de pagos**: las citas se confirman sin cobro; se mantiene como "Próximamente".
4. **Jitsi propio**: meet.jit.si no es adecuado para datos de salud mental en producción.

## Validación local

```bash
cd platform/web
npm run build   # ✓ pasa
npm run lint    # ✓ 0 errores, 1 warning preexistente
```

El build actualizado se encuentra en `/app/`.
