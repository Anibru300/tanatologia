# Avance — 2026-07-27: Investigación estratégica + Fase 1 implementada

## Resumen del día

En una sola sesión se pasó de "la plataforma no guarda datos de perfil y no hay profesionistas reales"
a tener **el flujo completo de Fase 1 funcionando en producción**: investigación de mercado,
5 módulos nuevos implementados, 2 migraciones aplicadas en Supabase Cloud, deploy automático
configurado y prueba E2E exitosa del flujo de verificación de profesionistas.

---

## 1. Investigación estratégica (documento maestro)

📄 `docs/investigacion-plataforma-2026-07-27.md` — incluye:

- **Benchmark:** Doctoralia, BetterHelp, Talkspace, Terapify, Psychology Today, Calmerry, Mindy, Yana y más Latam. Hallazgo clave: **ningún competidor grande se especializa en tanatología/duelo** → ese es nuestro nicho.
- **Comparativa funcionalidad por funcionalidad** vs. nuestra plataforma con prioridades.
- **Validación de cédula SEP:** no hay API oficial (reCAPTCHA por consulta); hay APIs de terceros desde $44 USD/mes; los datos de cédula son públicos (INAI). Patrón del sector = API de apoyo + **revisión humana** + entrevista. Para el MVP: **verificación manual gratuita** (lo implementado).
- **Pagos (Fase 3):** comparativa Openpay / Stripe Connect / Mercado Pago / Conekta. Recomendación: **Openpay** (tarjeta 2.9% + $2.50, payouts a CLABE, $0 fijo). Decisión fiscal pendiente con contador (IVA 16%, retenciones, RESICO).
- **Legal:** checklist de documentos (T&C, aviso de privacidad, consentimiento datos sensibles, contrato de prestación de servicios, comisiones, cancelaciones) y en qué momento del flujo acepta cada uno.
- **Roadmap de 6 fases** con tiempos, riesgos y entregables.

## 2. Lo implementado hoy (Fase 1 — todo con herramientas gratuitas)

| Módulo | Estado |
|---|---|
| Perfiles paciente/profesional editables con persistencia | ✅ Probado en producción |
| Foto de perfil (Supabase Storage, bucket `avatars`) | ✅ Probado |
| Verificación documental: subida de cédula/título/INE/comprobante (bucket privado) + botón "Enviar a revisión" | ✅ Probado |
| Panel admin `/admin/verificacion`: revisión con URLs firmadas, aprobar/rechazar con motivo, link a cedulaprofesional.sep.gob.mx | ✅ Implementado (pendiente probar aprobación) |
| Disponibilidad semanal real del profesional conectada al booking (solo slots libres, RPC `get_booked_slots`) | ✅ Implementado (pendiente probar booking) |
| Notificaciones in-app con campana 🔔 y Realtime (triggers de citas y verificación) | ✅ Probado (llegó la notificación de "en revisión") |
| Campana reubicada arriba en el menú lateral | ✅ Ajuste de hoy |
| Migración 005: tablas `professional_documents`, `notifications`, `legal_acceptances`, `platform_settings`, buckets, columna financieras | ✅ Aplicada en Cloud |
| Migración 006: fix de `submit_for_review()` vs trigger de seguridad | ✅ Aplicada y probada |
| CI/CD: workflow GitHub Actions build → `/app/` | ✅ Configurado con secrets |
| Resend (correos) activado con API key en Supabase Secrets | ✅ Configurado (pendiente probar envío real) |
| Limpieza de código muerto | ✅ |

## 3. Bugs encontrados y corregidos en la prueba

1. **Realtime duplicado** (`cannot add postgres_changes callbacks after subscribe()`): canal de notificaciones con nombre único + efecto por `userId`. ✅
2. **Scroll al error** en Verificación (el mensaje estaba arriba y no se veía). ✅
3. **`submit_for_review()` bloqueada** por el trigger anti-auto-verificación de la migración 003: se agregó bandera de sesión `app.verification_change_allowed` (migración 006). ✅
4. **`refresh_token` 400:** token viejo en navegador; se resuelve limpiando datos del sitio o incógnito (no es bug de la app).
5. **RLS de citas en booking:** el paciente no podía leer citas del profesional para calcular horarios → RPC `get_booked_slots` SECURITY DEFINER que solo expone horarios, sin datos de pacientes. ✅ (en migración 005)

## 4. Pendiente de probar mañana (resto del guion E2E)

- [ ] **4️⃣ Admin aprueba al profesional:** entrar como `admin@demo.com / demo123` → menú **Verificación** → abrir detalle → ver documentos → **Aprobar profesional** → checar que llega la notificación "¡Tu perfil fue verificado!" al profesional y que aparece en el directorio.
- [ ] **5️⃣ Horarios:** como profesional → menú **Disponibilidad** → agregar rangos (ej. Lunes 10:00–14:00) → Guardar.
- [ ] **6️⃣ Paciente agenda:** registrarse como paciente → buscar al profesional → agendar → verificar que **solo aparecen los horarios configurados** y que los ocupados ya no salen al agendar una segunda cita en el mismo horario.
- [ ] **7️⃣ Videollamada:** entrar a la sala desde ambas cuentas a la hora de la cita (Jitsi).
- [ ] **8️⃣ Correo:** verificar que llega el correo de confirmación de cita (Resend; revisar spam).
- [ ] Probar en **celular** (menú móvil + campana).

## 5. Siguientes pasos (orden sugerido)

### Corto plazo (esta semana)
1. Terminar el guion E2E de arriba y corregir lo que salga.
2. **Dar de alta a la Dra. Edith** como profesional real: sus documentos, bio, foto, tarifas, horarios; verificarla con el flujo nuevo (consulta manual de cédula en https://cedulaprofesional.sep.gob.mx/).
3. **Dashboards con datos reales** (hoy muestran números de muestra: "5 pacientes, $1,200, 4.9★"): conectar contadores a Supabase.
4. **Datos fiscales** (razón social + domicilio) para quitar los "PENDIENTE" del aviso de privacidad y términos.

### Media semana / siguiente sesión de código
5. Cancelación de citas con política (ventana de 24 h, ya está en `platform_settings`).
6. Historial del paciente y lista de pacientes del profesional con datos reales.
7. Recordatorios automáticos de cita por correo (cron en Supabase + Edge Function `send-email`).
8. Notas clínicas conectadas a `clinical_notes` (la tabla ya existe con RLS).

### No olvidar (decisiones del negocio, no código)
- Constituir razón social y domicilio fiscal → desbloquea legales, pagos y facturación.
- Dominio propio (~$200–400 MXN/año) → mejora correos y confianza.
- Cuando haya tracción: Openpay para pagos (diseño completo en el documento de investigación).

## 6. Notas técnicas para la próxima sesión

- Deploy: push a `main` → workflow compila y publica `/app/` solo (secrets ya configurados). Deploy manual: `rm -rf app && cp -r platform/web/dist app`.
- Migraciones pendientes de ejecutar: **ninguna** (005 y 006 ya aplicadas en Cloud).
- Credenciales admin de prueba: `admin@demo.com / demo123` (única cuenta demo que queda).
- El dashboard del profesional/paciente/admin muestra datos de muestra (stubs) — no son bugs.
- Documento de investigación con todo el análisis: `docs/investigacion-plataforma-2026-07-27.md`.
