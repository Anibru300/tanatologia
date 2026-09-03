# Backlog post-Beta — Somos Calma Beta 1.0

Mejoras deliberadamente pospuestas durante la Beta. **No implementar** hasta que
la operación con usuarios reales indique lo contrario (vía feedback). Priorizar
con las reglas P0–P3 de `BETA-OPERATIONS.md`.

## UX / calidad de código (menores detectados en auditoría 2026-09-03)

1. **Alert en PatientVideoRoom** — los errores de carga/acceso se muestran como
   texto plano, no con el componente `Alert` (convención de la casa).
2. **Preselección de terapeuta en BookAppointment** — al recargar
   `/paciente/agendar` se pierde el `location.state` y el asistente vuelve al
   paso 1 (fallback graceful; conservar la selección en URL o storage).
3. **`formatCurrency` muerto** (`src/lib/utils.ts`) — solo lo consume su test;
   eliminar o reactivar junto con la monetización futura.
4. **Entrada manual por nombre de sala** (`ProfessionalVideoRoom`) — bypass de
   soporte que permite unirse a cualquier sala; reevaluar con la migración a JaaS.

## Funcionales

5. **Migración de videollamadas a JaaS (8x8.vc)** — elimina el login de quien
   crea la sala, permite marca propia y JWT por usuario. Código ya compatible
   (`VITE_JITSI_DOMAIN` + Edge Function de firma). Trigger: volumen de sesiones.
6. **Conectar matching.js con el directorio real** — `pages/matching.html` +
   `assets/js/matching.js` muestran cards hardcodeadas de las fundadoras; no se
   sincronizan con profesionales verificados nuevos. Conectar a Supabase o
   derivar al directorio de la app.
7. **AdminSupport estático** — página de tickets "próximamente" bajo badge
   "Pronto" (admin-only); implementar cuando exista soporte real.

## Config / contenido

8. **Config de crisis en `assets/js/siteConfig.js`** — líneas de crisis sin
   consumidor en el sitio e incluye "Cruz Roja 065" (deprecado; hoy 911).
   Limpiar o alimentar un componente real.

## Monetización diferida (fuera de alcance hasta nueva decisión)

Ver `docs/beta-monetizacion-diferida.md`: pagos (Openpay: tarjeta + SPEI;
PayPal aparte), membresías, comisiones, cotizaciones, `siteConfig.pricing`,
páginas admin financieras en disco. Requisitos del cliente: tarjeta
Visa/Mastercard, PayPal y transferencia SPEI.

## Ideas de mejora (ideación 2026-09-03, benchmark Doctoralia/Sanamente/BetterHelp/Talkspace/Alma/Headway)

**Quick wins (alto impacto, bajo esfuerzo):**
1. Recordatorios de cita (email Resend + botón WhatsApp prellenado) 24 h y 1 h antes — reduce no-shows.
2. Reprogramación directa desde la tarjeta de la cita (sin cancelar y re-agendar).
3. Botón de crisis visible dentro del portal paciente.
4. Evaluación post-sesión (rating + comentario) ligada a la cita.
5. Pausar disponibilidad por rango de fechas (vacaciones) en lugar de borrar slots.
6. Plantillas de nota clínica (estructura de evolución prellenada).
7. Indicador de perfil completo del profesional (afecta visibilidad en directorio).
8. Recordatorios de cita también al profesional.

**Diferenciadores de medio esfuerzo:**
9. Seguimiento de progreso clínico (PHQ-9/GAD-7 / escala breve de duelo) con gráfica para el profesional.
10. Diario emocional entre sesiones, opcionalmente compartible con el terapeuta.
11. Mensajería segura asíncrona paciente↔profesional entre sesiones.
12. Perfil profesional enriquecido: video corto, enfoque terapéutico, especialidades, idiomas, "3 palabras que describen mi práctica".
13. Filtros avanzados de directorio: género, especialidad, idioma, enfoque.
14. Supervisión de casos entre colegas (red de tanatología).
15. Seguimiento visible de programas (progreso 4/6 sesiones + materiales por sesión).

**Estructurales (cuando el feedback lo justifique):**
16. Matching conectado al directorio real (ver arriba).
17. PWA instalable / app móvil.
18. Dashboard admin con métricas de salud de la Beta.

**Descartadas por ahora (no encajan en la Beta):** pagos/seguros,
prescripción de medicamento, chat anónimo masivo.

Regla: ninguna se implementa hasta que el feedback de usuarios reales lo justifique (P2/P3 de `BETA-OPERATIONS.md`).
