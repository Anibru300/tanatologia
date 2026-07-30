# Avance 2026-07-29 — Verificación Cloud + Revisión UX completa (3 bloques)

## Resumen del día

### 1. Infraestructura verificada
- ✅ **Migración 008 confirmada en Supabase Cloud**: `availability_slots` activa (constraint EXCLUDE anti-traslape), tabla vieja `availability` eliminada, RPC `get_booked_slots(p_professional_profile_id, p_start, p_end)` operativa. **Ninguna migración pendiente.**
- ✅ **Secrets de GitHub Actions configurados** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) vía `gh secret set`. Se disparó un deploy manual y se verificó que el build de `/app` ya trae la URL de Supabase embebida (los deploys anteriores compilaban sin secrets → la app publicada no conectaba).
- ✅ **Flujos probados end-to-end contra Cloud** con cuentas QA temporales (ya eliminadas):
  - Cancelación de cita → el slot se libera en `get_booked_slots` + notificación automática al paciente ("Tu cita fue cancelada").
  - Notas clínicas → profesional escribe en su cita; trigger rechaza notas en citas ajenas; paciente no las ve por RLS.
  - Registro inmediato sin confirmar correo funciona.
- ⚠️ **Cuentas demo eliminadas** (`paciente@demo.com`, etc.): ya no existen/no se necesitan; la plataforma opera con usuarios reales. `scripts/seed-demo.mjs` se conserva solo como referencia.

### 2. Revisión UX/UI en 3 bloques (todo en `platform/web`)

**Bloque 1 — Lo urgente** (auditado ✅)
- Contraste WCAG AA: variantes `-dark`/`-darker` en toda la paleta (`tailwind.config.js`); botones, badges, banners, sidebar y chips corregidos.
- UI falsa eliminada: `ProfessionalAgenda` ahora muestra la semana real con navegación; `ProfessionalSettings`, `AdminCMS`, `AdminConfig`, `ProfessionalResources` → ComingSoon; `AdminAudit` conectado a `audit_logs` real; mocks de `PatientPrograms` y "Estado de cuenta" reemplazados por datos reales; ~10 botones muertos ahora funcionan.
- Errores silenciosos → banners visibles en 7 páginas.
- Cero `alert()`/`window.confirm`/`window.prompt`; nuevos componentes `Modal` y `ConfirmDialog`.

**Bloque 2 — Sistema de diseño** (auditado ✅)
- Componentes nuevos en `src/components/ui/`: `Alert` (auto-dismiss), `EmptyState`, `Skeleton`, `Logo`, `DataTable` (paginación), `LinkButton`.
- `PortalLayout` unificado (los 3 layouts → 1); badge "Pronto" en secciones ComingSoon; menú activo por prefijo + `matchPaths`; `QuickExitButton` solo en portal paciente.
- Tokens de radios consolidados (85 valores arbitrarios → 0); `prefers-reduced-motion` para el fondo aurora; labels asociados en Input/Select/Textarea.
- Las 6 tablas admin migradas a `DataTable`; verificación rápida sin confirmación eliminada de `AdminProfessionals` (solo flujo completo en `/admin/verificacion`).

**Bloque 3 — Por portal** (auditado ✅)
- **Paciente**: fechas en formato humano, precio de referencia en booking, pantalla de éxito con "Agendar otra", hint de Continuar, zona horaria visible, **cancelación de cita con confirmación**, modal del directorio accesible (Escape/backdrop).
- **Profesional**: notas clínicas con selector de sesión asociada (ya no se cuelgan de la cita equivocada), tabs Próximas/Pasadas/Todas en citas, confirmación al eliminar horarios, pacientes con historial expandible.
- **Admin**: preview inline de documentos (imagen/PDF en modal) sin salir del expediente.

**Estado**: `npm run build` pasa limpio. **Cambios SIN commit todavía** (quedaron en working tree).

---

## Para mañana (checklist)

### Prioridad 1 — Publicar
- [ ] Revisar en local: `cd platform/web && npm run dev` y recorrer los 3 portales con usuarios reales (paciente, Lupita/Carlos como profesionales, admin).
- [ ] Hacer commit + push de `platform/web` → el workflow `deploy-app.yml` recompila `/app` automáticamente.
- [ ] Verificar en producción (`/tanatologia/app/`): login, agendar, cancelar, videollamada, panel admin.

### Prioridad 2 — Pruebas funcionales con datos reales
- [ ] Profesional: publicar horarios en `/profesional/disponibilidad` (calendario) y confirmar que el paciente los ve en el booking.
- [ ] Paciente: agendar y **cancelar** desde "Mis citas" (nuevo botón) → verificar notificación y liberación del slot.
- [ ] Profesional: escribir nota clínica eligiendo la sesión asociada.
- [ ] Admin: revisar un documento con el nuevo preview inline en `/admin/verificacion`.
- [ ] Probar en móvil (menú hamburguesa, backdrop, tablas con scroll).

### Prioridad 3 — Siguientes mejoras (de la auditoría, no urgentes)
- [ ] `section-calma` usa `py-20` (ritmo de landing) → considerar `py-8 lg:py-12` en contexto portal.
- [ ] Perfil profesional: sticky footer de guardado + aviso de cambios sin guardar; unificar edición de cédula con Verificación.
- [ ] Edición/borrado de notas clínicas (hoy un error de captura es irreversible).
- [ ] Deep-link a notas con paciente preseleccionado desde citas/pacientes.
- [ ] Fuentes Poppins: self-hosting o `preconnect` (hoy 4 `@font-face` remotos bloquean render).
- [ ] Considerar dark mode o documentar la decisión de no tenerlo.
- [ ] Skeletons de carga en páginas que aún muestran "Cargando..." en texto plano.

### Pendientes de negocio (sin cambios)
- [ ] Secrets de producción ya están; falta activar Resend (API key) para correos reales (`send-email`).
- [ ] Pagos (Openpay) — cuando haya tracción.
- [ ] Jitsi ya integrado ✅; solo validar una sesión real completa paciente + profesional.

## Notas técnicas
- Convenciones nuevas documentadas en `AGENTS.md` (componentes ui, PortalLayout, paleta `-dark`, prohibidos los diálogos nativos).
- La pila de modales en `Modal.tsx` evita que Escape cierre dos modales anidados.
- `DataTable` pagina del lado del cliente (10/pág); si las tablas crecen mucho, mover a paginación server-side.
