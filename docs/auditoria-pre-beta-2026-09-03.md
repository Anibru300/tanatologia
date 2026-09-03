# Auditoría final pre-Beta / Release Candidate — 2026-09-03

**Veredicto: 🟡 LISTA CON OBSERVACIONES** — la plataforma puede recibir usuarios externos.
Las observaciones son dependencias externas (buzón MX en Hostinger, límite de meet.jit.si),
no defectos de la plataforma. 0 hallazgos 🔴 críticos, 0 🟡 importantes.

## Cobertura

- **Monetización (búsqueda global)**: estático, React (incl. render dinámico), chatbot, siteConfig,
  sitemap. Sin fugas: toda mención es "Gratis durante la Beta" / futuro con aviso. Stripe/PayPal/Openpay: 0 en `src/`.
  `siteConfig.pricing` reservado sin consumidores de montos. Páginas admin de finanzas existen en disco sin ruta/menú.
- **Sitio público** (agente de auditoría): 0 críticos/0 importantes/4 menores. Sin enlaces al portal
  estático viejo, sin links rotos, crisis.html correcta (911/SAPTEL/Locatel/Línea de la Vida).
- **App React** (agente de auditoría): 0 críticos/0 importantes/6 menores. Sin datos mock, sin botones
  muertos, todas las rutas con menú o badge "Pronto", manejo de errores con `Alert`, persistencia real
  (re-fetch en montaje de cada página), videollamadas con ventana de acceso y ownership por RLS.
- **Seguridad negativa (API, contra Cloud)**: Tests A–I → **22/22** (aislamiento paciente↔paciente,
  profesional↔profesional, anti-escalación de role, anti-auto-verificación, anónimo bloqueado,
  manipulación de IDs en citas ajena rechazada, Storage privado verificado).
- **Flujo de verificación profesional** (E2E): registro → cédula → 3 documentos al bucket privado →
  `submit_for_review` → `in_review`. Validación estricta sin cédula rechaza (400). ✅
- **Storage**: políticas correctas en Cloud (subida con rol professional, lectura propia/admin,
  sin acceso público incluso conociendo la ruta — verificado I1–I5).
- **Producción**: 12 páginas con todos sus assets 200; sitemap 16 URLs 200; `/app/` y rutas
  directas/refresh 200; 0 assets rotos en el build de la app.

## Correcciones aplicadas en esta auditoría
- `pages/membresias.html` fuera del flujo público: eliminado de nav, footer y sitemap
  (el archivo queda sin enlazar como referencia). Commit `b43c35a`.
- Typo "encontras" → "encontraras" (`crisis.html`).
- Card de 4 sesiones en `pacientes.html` ahora dice "Gratis durante la Beta".
- Script nuevo `scripts/test-security-negative.mjs` (Tests A–I, reutilizable).

## Mejoras deliberadamente post-Beta (🔵)
1. `PatientVideoRoom` muestra errores como texto plano, no con `Alert` (convención visual).
2. `BookAppointment` pierde la preselección de terapeuta al recargar (fallback graceful a paso 1).
3. `formatCurrency` queda como código muerto reservado (test-only).
4. Entrada manual por nombre de sala en `ProfessionalVideoRoom` (fallback de soporte; reevaluar con JaaS).
5. `pages/matching.html` + `matching.js`: cards hardcodeadas de las fundadoras reales, no
   sincronizadas con el directorio verificado (conectar a Supabase cuando haya volumen).
6. `AdminSupport`: página estática "próximamente" bajo badge "Pronto" (admin-only).
7. `siteConfig.js` (sitio) tiene config de crisis sin consumidor + "Cruz Roja 065" deprecado.

## Observaciones externas (no bloquean la Beta)
- **Buzón**: sin MX en el dominio; Plan B activo (`CONTACT_INBOX` → Outlook personal, verificado).
  Cliente debe crear el reenvío en Hostinger para recuperar `hola@somos-calma.com`.
- **Videollamadas**: meet.jit.si exige que el profesional (anfitrión) entre primero; la UI ya lo
  documenta. Migrar a JaaS cuando haya volumen.

## Pruebas
| Batería | Resultado |
|---|---|
| Unit (Vitest) | 25/25 |
| Auth/RLS (`test-auth-flow.mjs`) | 15/15 |
| Flujos core Bloques 3–6, 10 (`test-core-flows.mjs`) | 22/22 |
| Seguridad negativa A–I (`test-security-negative.mjs`) | 22/22 |
| Verificación profesional (E2E inline) | ✅ (con negativa) |
| Producción (páginas, assets, sitemap, rutas) | 0 rotos |

Usuarios de prueba creados durante la auditoría: eliminados (0 restantes `@test.somos-calma.com`).
