# BETA-OPERATIONS.md — Somos Calma Beta 1.0

Documento operativo de la Beta. La plataforma está en **modo de operación y
validación con usuarios reales**: la prioridad es **estabilidad → observabilidad
→ feedback → corrección**. No se agregan funcionalidades nuevas por iniciativa
propia (ver `docs/backlog-post-beta.md`).

- Versión: **1.0.0-beta.1** (`platform/web/package.json`).
- Release candidate auditado: `docs/auditoria-pre-beta-2026-09-03.md` (0 críticos, 0 importantes).

---

## 1. Congelación de funcionalidades (vigente durante la Beta)

NO implementar: pagos, Stripe, PayPal, membresías, suscripciones, monetización,
nuevas funcionalidades grandes, rediseño completo, migración a JaaS, nuevas
integraciones innecesarias. Lo monetizable reservado está en
`docs/beta-monetizacion-diferida.md`.

## 2. Observaciones externas (NO son defectos de la plataforma)

### OBSERVACIÓN 1 — Correo institucional
`hola@somos-calma.com` requiere configuración en Hostinger (el dominio no tiene
MX). **Plan B activo:** el secret `CONTACT_INBOX` de la Edge Function
`contact-form` entrega a `lupitamcampuzano@outlook.com` (verificado, 200 OK).
Cuando el buzón institucional exista: (1) crear reenvío/buzón en Hostinger,
(2) eliminar o redefinir el secret `CONTACT_INBOX` a `hola@somos-calma.com`,
(3) `supabase functions deploy contact-form`, (4) probar envío desde
https://somos-calma.com/#contacto y confirmar recepción.

### OBSERVACIÓN 2 — Videollamadas (meet.jit.si)
La solución funciona. Limitación conocida: quien crea la sala (el profesional,
anfitrión) debe entrar primero; la app ya lo indica en pantalla. La migración a
**JaaS (8x8.vc)** queda como mejora futura (código preparado: definir
`VITE_JITSI_DOMAIN` + firma JWT en Edge Function). No modificar ahora.

## 3. Checklist operativo

### Antes de invitar usuarios
- [ ] Producción disponible: https://somos-calma.com y /app/ (200, sin assets rotos).
- [ ] Supabase Cloud accesible (proyecto `qjwebikgrqtotqfipeqt` resolviendo en DNS).
- [ ] Autenticación: registro + login + sesión persistente (smoke test abajo).
- [ ] Formulario de contacto: envío real con confirmación (Plan B activo).
- [ ] WhatsApp del chatbot responde (canal humano).
- [ ] Videollamadas: profesional crea sala y paciente entra en ventana.
- [ ] Feedback: envío desde paciente/profesional y consulta en admin.
- [ ] Monitoreo básico: acceso a Supabase Dashboard (Auth, Database, Logs) y
      GitHub Actions verde.

### Durante la Beta (revisión periódica, mínimo semanal)
- [ ] Registros nuevos y logins fallados (Supabase > Authentication > Logs).
- [ ] Citas creadas/canceladas; conflictos de horario (tabla `appointments`).
- [ ] Validaciones de profesionales pendientes (`/admin/verificacion`).
- [ ] Feedback nuevo (`/admin/feedback`): clasificar y priorizar.
- [ ] Reportes de videollamadas fallidas (sala no abre, micrófono/cámara).
- [ ] Errores en Edge Functions (Supabase > Edge Functions > Logs).
- [ ] Formulario de contacto: correos rebotados o no entregados.

### Después de cada periodo de prueba
- [ ] Problemas recurrentes → convertir en bugs priorizados.
- [ ] Funcionalidades confusas → tickets de UX.
- [ ] Abandonos del flujo (registro sin perfil, perfil sin agendar).
- [ ] Solicitudes de mejora → backlog (`docs/backlog-post-beta.md`).

## 4. Feedback como fuente principal de mejora

Usar el sistema de feedback existente (tabla `feedback`, panel `/admin/feedback`).
Clasificación de comentarios:

| Categoría | Significado |
|---|---|
| **BUG** | Algo que debería funcionar y no funciona. |
| **UX** | Funciona pero resulta confuso. |
| **FUNCIONALIDAD** | Necesidad inexistente hoy. |
| **CONTENIDO** | Texto/instrucciones que deben mejorar. |
| **SEGURIDAD** | Permisos, privacidad o acceso. |
| **IDEA** | Sugerencia futura. |

## 5. Prioridades

| Prioridad | Definición | Regla |
|---|---|---|
| **P0** | Seguridad, pérdida de información o sistema inutilizable. | Atender de inmediato. |
| **P1** | Una función principal no funciona correctamente. | Antes que cualquier otra cosa. |
| **P2** | Problema importante de experiencia. | Planificar. |
| **P3** | Mejora estética o comodidad. | **No desarrollar mientras existan P0/P1.** |

## 6. Regla de cambios a producción

Nada de cambios directos a producción. Flujo obligatorio:
reproducir el problema → identificar causa → modificar código →
`npm run lint` + `npm run test` + `npm run build` → probar →
deploy vía GitHub Actions → verificar producción (smoke test).

### Seguridad (regresión obligatoria)
No modificar políticas RLS, roles, Storage ni Auth salvo que una prueba real
detecte un problema. Todo cambio en esos temas debe ejecutar las baterías:
- `node scripts/test-auth-flow.mjs` (15 pruebas auth/RLS)
- `node scripts/test-security-negative.mjs` (22 pruebas negativas A–I)
Y borrar cualquier usuario de prueba creado (`@test.somos-calma.com`).

## 7. Deployment

GitHub Actions es el único mecanismo de despliegue. No cambiar la
infraestructura sin necesidad. Antes de cada release:
**lint → tests → build → deploy → smoke test.**

## 8. Smoke test de producción (después de cada release)

- **Paciente:** registro → login → dashboard → logout.
- **Profesional:** login → perfil → verificación/documentos.
- **Admin:** login → validación → feedback.
- **Público:** inicio → login → registro.
- **Contacto:** enviar formulario y confirmar recepción.
- **Citas:** crear y consultar una cita de prueba controlada (y cancelarla).
- **Videollamada:** comprobar acceso a la sala de una cita de prueba.

## 9. Datos de prueba

Producción no debe contener usuarios/citas/feedback de prueba. Cuentas QA
preexistentes del equipo (`qa.prof@somoscalma.test`, `qa.flujos@somoscalma.test`):
decisión del cliente sobre conservarlas o eliminarlas. Todo usuario creado por
scripts de auditoría debe eliminarse al terminar
(`DELETE FROM auth.users WHERE email LIKE '%@test.somos-calma.com'`).
