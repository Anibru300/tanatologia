# Beta gratuita — Monetización diferida (2026-09-02)

Durante la **Beta de Somos Calma el acceso es completamente gratuito**. Este documento
registra qué se eliminó de la experiencia y qué infraestructura se **conserva
internamente** para una futura fase de monetización.

## Regla de oro

Ninguna estructura reservada puede mostrarse al usuario, bloquear un flujo,
ni requerir configuración de pagos durante la Beta.

## Eliminado de la experiencia Beta

### App React (`platform/web`)
- `features/patient/QuotePage.tsx` — **eliminado** (cotización con precios; recuperable en git).
- `features/patient/pages/PatientPayments.tsx` — **eliminado** (página "interim" de pagos).
- `features/professional/pages/ProfessionalEarnings.tsx` — **eliminado** (tarifas $400/$300 estáticas).
- `features/professional/pages/ProfessionalMembership.tsx` — **eliminado** (ComingSoon de membresía).
- Rutas y entradas de menú: `/cotizacion` (pública y paciente), `/paciente/pagos`,
  `/profesional/ingresos`, `/profesional/membresia`, `/admin/cotizaciones`,
  `/admin/finanzas`, `/admin/pagos`, `/admin/reportes`.
- Cards "Ingresos $0" en dashboards de profesional y admin → reemplazadas por
  tarjeta informativa "Beta gratuita".
- Precios en flujos reales: `BookAppointment` (precio por terapeuta y "total a
  pagar" → "Gratuito"), `TherapistDirectory` (precio en tarjeta y modal → "Gratis
  en la Beta"), `ProfessionalProfile` (sección "Tarifas" → nota de Beta; campos
  de precio retirados del formulario; en `UpdateProfessionalProfileInput` los
  precios son ahora opcionales).
- FAQ profesional "¿Cuándo recibo mis pagos?" → "¿Tiene algún costo participar?".

### Sitio estático (raíz)
- Hero, stats, meta/OG, secciones de precios en `index.html`; pricing cards y
  tabla comparativa en `pages/membresias.html` (reescrita como "Beta gratuita");
  precios en `pages/pacientes.html`, `pages/profesionales.html` (incl. metadata
  "pagos seguros"), `pages/matching.html`, `pages/login.html` (metadata).
- Chatbot `assets/js/atencion-bot.js`: opciones de precio/pago/descuento
  reemplazadas por respuesta "Beta gratuita"; redirección de "agendar" ahora va
  a registro en vez de cotización.
- `assets/js/components.js`: link "Membresías" renombrado "Beta gratuita".
- `assets/js/siteConfig.js`: bloque `pricing` conservado pero comentado como
  RESERVADO (no mostrar durante la Beta).

## Conservado para fase futura

| Elemento | Ubicación | Estado |
|---|---|---|
| `siteConfig.pricing` (app) | `platform/web/src/lib/siteConfig.ts` | Objeto intacto, comentado como reservado; sin consumidores en UI. |
| `siteConfig.js` pricing (sitio) | `assets/js/siteConfig.js` | Igual: reservado, sin mostrar. |
| Tabla `quotes` | migración 001 | Existe en BD; sin inserción anónima nueva (QuotePage eliminado). Página `AdminQuotes.tsx` conservada en disco pero sin ruta ni menú. |
| Precios en `professional_profiles` | migración 001 | Columnas intactas; solo admin las edita; UI propia del profesional ya no las toca. |
| Columnas financieras de `appointments` (`price_centavos`, `platform_fee_centavos`, `payout_centavos`, `payment_status`) | migración 005 | Intactas, protegidas por triggers; sin uso en frontend. |
| `platform_settings.commission_percent = 20` | migración 005 | Semilla intacta, no consumida. |
| `formatCurrency()` | `platform/web/src/lib/utils.ts` | Helper intacto (con su test). |
| Páginas admin ComingSoon (`AdminFinances`, `AdminPayments`, `AdminReports`, `AdminQuotes`) | `platform/web/src/features/admin/pages/` | Conservadas en disco, sin ruta ni menú. |
| Página `pages/membresias.html` | sitio estático | Reescrita como Beta; estructura reutilizable para planes futuros. |

## Pendiente de decisión del cliente (legales)

`pages/terminos.html`, `pages/cancelacion.html` y `pages/aviso-privacidad.html`
(fecha "20 de junio de 2026") asumen membresías/pagos/comisiones/reembolsos.
Antes del lanzamiento público de la Beta se necesita una versión "sin pagos"
de estos 3 documentos.

## Reglas para la fase de monetización

1. No activar pagos sin migración nueva con RLS y políticas revisadas.
2. Ningún flujo de la Beta puede depender de estructuras de pago.
3. Stripe/PayPal/Openpay: NO instalados. Se evaluarán en su momento.
