# Auditoría integral 2026-08-16

Revisión del sitio público (16 páginas estáticas) y de la plataforma React
(portales paciente, profesional y admin) después del PR #1.

## Resumen ejecutivo

El proyecto está en buen estado general: sitio estático con SEO completo,
accesibilidad básica (skip-links, quick-exit), formularios con validación,
app con rutas protegidas por rol y datos reales (sin mocks). Se detectaron
**2 errores que afectan al usuario hoy**, 1 fuga de UX en el registro y
varios puntos de higiene. No hay imágenes repetidas ni duplicadas, ni
enlaces rotos reales.

## 🔴 Errores que conviene corregir de inmediato

### E1. Formulario de contacto: doble handler con señales contradictorias
`index.html` tiene su propio handler (línea ~483) que envía a la Edge
Function `contact-form` y muestra "¡Gracias! Tu mensaje fue enviado…".
Pero `assets/js/main.js` registra un listener `submit` sobre **todos** los
`form` de la página, incluido este. Resultado:

- En envío exitoso: el handler inline hace `form.reset()` y luego main.js
  valida los campos `[required]` ya vacíos → **pinta los campos en rojo**
  aunque el mensaje sí se envió.
- En caso de error de red: main.js muestra además el mensaje
  *"(modo demostración)"*, que confunde al usuario.

**Fix:** en `main.js`, ignorar formularios que ya tienen handler propio
(`if (form.id === 'contact-form') return` o un atributo `data-external`) y
eliminar la rama de "modo demostración".

### E2. 14 de 40 entradas de menú de los portales llevan a "Próximamente"
| Portal | Menú | "Pronto" | Cuáles |
|---|---|---|---|
| Paciente | 12 | 3 | Pagos, Mensajes, Recursos |
| Profesional | 15 | 5 | Ingresos, Membresía, Mensajes, Recursos, Configuración |
| Admin | 13 | 6 | Finanzas, Pagos, Reportes, Configuración, Contenidos, Soporte |

El badge "Pronto" es honesto, pero un tercio del menú sin función desgasta
la confianza. Recomendaciones de quick wins:
- **Recursos (paciente):** el sitio público ya tiene 4 artículos
  (`pages/recursos/*.html`); la página del portal puede enlazarlos. Esfuerzo mínimo.
- **Configuración (profesional):** cambiar contraseña y correo con
  `supabase.auth.updateUser()` es ~1 pantalla.
- **Mensajes (ambos):** mientras no exista chat, ofrecer botón de WhatsApp
  o `mailto:` con la otra parte en lugar de una página muerta.
- Considerar **ocultar** del menú las secciones sin fecha (Finanzas,
  Reportes, CMS) en vez de mostrar "Pronto".

## 🟡 Importantes (no urgentes)

### I1. El registro ignora el rol que viene del sitio
El sitio estático enlaza a `/app/#/register?role=patient` y
`?role=professional`, pero `RegisterPage.tsx` no lee el query param y
siempre arranca en "Paciente". El profesional debe corregir el rol a mano.
**Fix:** `useSearchParams` (LoginPage ya lo usa) + preselección.

### I2. Errores visibles solo en consola (7 lugares)
La convención del proyecto dice "errores siempre visibles con `Alert`,
nunca solo `console.error`", pero hay `console.error` sin feedback en:
`NotificationBell` (x3), `AuthProvider` (x2), `email.ts`,
`verificationService.ts`, `BookAppointment` (correo de confirmación).
Algunos son defensables (el correo no debe bloquear el booking), pero las
notificaciones fallan en silencio. **Fix:** `Alert` o estado vacío con
"reintentar" donde el usuario necesita saberlo.

### I3. Carga de scripts del sitio con orden no garantizado
`components.js` inserta dinámicamente `siteConfig.js`, `chatbot.js`
(WhatsApp) y `atencion-bot.js` sin `script.async = false`; el orden de
ejecución no está garantizado. Hoy funciona porque los valores por defecto
coinciden con la configuración, pero es frágil. **Fix:**
`script.async = false` antes de insertar, o concatenar en un solo archivo.

### I4. Contenido legal duplicado en dos lugares
Aviso de privacidad, términos, cancelación y crisis existen como páginas
estáticas (`pages/*.html`) **y** como páginas React
(`src/app/pages/*Page.tsx`). Dos fuentes que mantener; riesgo de que se
desactualicen. **Fix:** que las rutas de la app redirijan a las páginas
estáticas, o al revés, pero una sola fuente.

## 🟢 Higiene (menor)

- **H1. Assets sin uso:** `assets/images/illustration-community.svg`,
  `illustration-support.svg`, `hero-bg.svg`, `page-bg.svg`. Candidatos a
  borrar.
- **H2.** `platform/web/public/404.html` no tiene meta description (menor).
- **H3.** `admin/soporte` podría mostrar los mensajes del formulario de
  contacto (hoy `contact-form` solo envía correo; no hay bandeja).
- **H4.** Lockfile sin Vitest fijado: correr `npm i -D vitest` en disco
  local una vez (hoy se ejecuta vía `npx vitest@^3`).

## ✅ Lo que se verificó en orden

- Sitio estático: 24 HTML analizados — sin enlaces rotos reales, todas las
  páginas con title, meta description, `lang="es"` y skip-link; formulario
  de contacto con honeypot anti-spam y campos requeridos; matching con
  validación por paso y terapeutas reales; sin imágenes repetidas entre
  páginas ni archivos duplicados por tamaño; `musica-fondo.mp3` en uso;
  bots de WhatsApp y atención sí se cargan (vía `components.js`).
- App React: rutas completas y protegidas por rol (`/login`, `/register`,
  `/cotizacion`, 3 portales); dashboards con datos reales; acceso a sala
  de video desde dashboard y lista de citas; 0 TODOs pendientes; build,
  lint y 21 tests en verde (PR #1).
- Videollamadas (post PR #1): chequeo de dispositivos, ventana de acceso
  por cita, español, sin deep-link móvil, error con respaldo en pestaña
  nueva.

## Prioridad sugerida

1. **E1** (formulario de contacto) — media hora.
2. Issue #2 (buzón MX) — acción en Hostinger, sin código.
3. **I1** (rol preseleccionado en registro) — 15 minutos.
4. Quick wins de menú (**E2**): Recursos del paciente + Configuración del
   profesional.
5. **I2** (errores visibles) e **I4** (legales en una sola fuente).
