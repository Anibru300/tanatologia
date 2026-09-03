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
