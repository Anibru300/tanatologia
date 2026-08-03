# Auditoría integral SOMOS-CALMA — 2026-08-02

Alcance: sitio estático (22 páginas HTML, CSS, JS), integridad de ~240 referencias (173 enlaces internos, anclas, assets), y app React `platform/web` (src + Edge Functions + migraciones).

## 🔴 CRÍTICO — corregir cuanto antes

### Sitio estático
1. **Formulario de contacto roto (Formspree 404)** — `index.html:369` envía a `formspree.io/f/xnnnzbjw`, que responde HTTP 404. **Los mensajes de contacto se están perdiendo.** Acción: reactivar/crear el form en Formspree o migrar a la Edge Function `send-email`.
2. **Legales con placeholders y razón social no constituida** — `pages/aviso-privacidad.html:75,365`, `pages/terminos.html:391` muestran literal `[DOMICILIO FISCAL PENDIENTE]`; se declara "SOMOS-CALMA, S.A.P.I. de C.V." sin estar constituida (la propia nota lo admite en aviso-privacidad:86-88). Riesgo LFPDPPP/PROFECO. Mismo problema en la app: `platform/web/src/lib/siteConfig.ts:17,19` → visible en `PrivacyPage`/`TermsPage`.
3. **Aula con ponentes ficticios y videos inexistentes** — `pages/profesionales/aula.html:35,55` ("Dra. María Rodríguez", "Dra. Sofía Castro") y 3 botones "Ver conferencia" con `href="#"` (:39,49,59).
4. **Formulario "Guardar disponibilidad" con éxito FALSO** — `pages/profesionales/agenda.html:31-86` + `assets/js/main.js:178-182`: muestra "Hemos recibido tu mensaje (modo demostración)" y no guarda nada.
5. **Chatbot cotiza precio no confirmado** — `assets/js/siteConfig.js:43` + `atencion-bot.js`: el bot dice "4 sesiones por $1,600 MXN" pero `membresias.html:165` dice "Por definir".
6. **Doble reserva de horario posible (app)** — `platform/web/src/features/appointments/appointmentsService.ts:94-129` inserta sin validación en BD; el EXCLUDE anti-traslape solo existe en `availability_slots`. Dos pacientes pueden reservar el mismo slot; un cliente API puede agendar horarios no publicados. Acción: constraint EXCLUDE o trigger de validación en `appointments`.

### Testimonios
7. **3 testimonios genéricos no verificables** — `index.html:337-348` ("Paciente anónima", "Profesional de la red", "Familiar de paciente") en una plataforma en beta: riesgo de publicidad engañosa.

## 🟡 MEDIO

8. **Portal demo estático con datos que parecen reales** — `pages/profesionales/{dashboard,agenda,aula,biblioteca,soporte}.html`: pacientes/turnos/sesiones simulados, calendario "Junio 2026" (ya pasado), 12+ botones `href="#"`. Sin etiqueta "demo" dentro del portal. Duplica funciones que ya hace la app real → candidato a retirar o redirigir a `/app/`.
9. **Embudo profesional inconsistente** — `pages/profesionales.html:154,183,196` ("Aplicar como profesional") → `index.html#contacto` (form genérico roto, ver #1) en vez de `/app/#/register?role=professional`.
10. **Ancla rota en footer global** — `assets/js/components.js:70`: `profesionales.html#formacion` no existe (el id real es `#portal`).
11. **Skip-link roto (accesibilidad)** en las 5 páginas del portal profesional: `#main-content` sin destino.
12. **Correo oficial = Outlook personal** — `crisis.html:144`, `aviso-privacidad`, `cancelacion`, `terminos` y `platform/web/src/lib/siteConfig.ts:27-32` usan `lupitamcampuzano@outlook.com` (incluso para crisis) pese a existir `hola@somos-calma.com`.
13. **Precio profesional contradictorio** — `assets/js/siteConfig.js:45` dice "monthly 300 / yearly 3000"; todo el sitio dice "$300 trimestral".
14. **"Cerrar sesión" falso** — `assets/js/portal-components.js:20` apunta a `index.html#contacto`.
15. **Fecha pasada** — `aula.html:68` "Próxima transmisión: 15 jul" (hoy es 2026-08-02).
16. **App: QuotePage falso error** — `QuotePage.tsx:61-88`: si el correo difiere del de la cuenta, la Edge Function rechaza y se muestra "Error" aunque la cotización sí se guardó → duplicados al reintentar.
17. **App: AdminSupport falso-funcional** — `AdminSupport.tsx:22-25`: "tickets" hardcodeados vacíos sin badge "Pronto".
18. **App: FAQs que prometen lo que no existe** — `ProfessionalHelp.tsx:8` ("pagos se liberan cada semana"), `PatientHelp.tsx:8` ("reembolso completo 24 h").
19. **App: ⭐ 0.0 ficticio** — `TherapistDirectory.tsx:150,220`, `BookAppointment.tsx:430`: rating mostrado sin sistema de reseñas.
20. **Promesa de cobertura dudosa** — "16 hrs de cobertura al día, 7 días" (index, pacientes, membresias) con solo 2 profesionales.
21. **CTA ambiguo** — `index.html:215` "Ver opciones y precios" → va al registro.

## 🟢 MENOR / mejoras

22. `sitemap.xml` sin los 4 artículos de `pages/recursos/`.
23. `manifest.json`: logo 1083×799 declarado como 192/512 cuadrado (ícono PWA distorsionado); falta `purpose: "any maskable"`.
24. Imágenes del index y artículos sin `loading="lazy"` (~16 imgs).
25. Números de crisis inconsistentes: SAPTEL `800 4727 835` (crisis.html) vs `(55) 5259-8121` (entender-el-duelo); Locatel con agrupación errónea en crisis.html.
26. `crisis.html:148` "Volver a SOMOS-CALMA" → matching.html (destino extraño).
27. App: `src/lib/video.ts` muerto (el video_link lo genera un trigger), `updateAppointmentVideoLink` sin llamadores, `formatCurrency` sin uso, nota de transición en `LoginPage.tsx:114-116`, `scripts/seed-demo.mjs` con contraseñas demo (candidato a borrar).
28. Jitsi en `meet.jit.si` público: cualquiera con el link entra; `PatientVideoRoom` no valida ventana horaria.
29. Edge Function `send-email`: un profesional puede enviar HTML arbitrario a cualquier correo (vector de phishing con la marca si comprometen su cuenta); CORS `*`.
30. Varios `console.error` sin feedback al usuario (NotificationBell, AuthProvider.fetchProfile, correo de confirmación en BookAppointment).

## ✅ Verificado sano

- 173/173 enlaces internos resuelven; todos los assets existen; alts descriptivos en todas las imágenes.
- Sin mocks en la app (MOCK_USERS eliminado), sin claves hardcodeadas, `.env` ignorado, RLS en las 13 tablas, triggers protegen rol/email/verificación.
- matching.js solo muestra a Lupita y Edith (reales) → registro gratuito. Sin bucles.
- 12 secciones ComingSoon con badge "Pronto" coherente; todas las rutas del router existen.
- Formulario de contacto es el único envío real del sitio estático (pero roto, ver #1).

## Prioridad sugerida
1. Formspree (se pierden leads HOY). 2. Legales (domicilio/razón social). 3. Aula + agenda demo (ficción visible). 4. Constraint anti doble-reserva en `appointments`. 5. Testimonios. 6. Embudo profesional + anclas/skip-links. 7. Correos de marca en todo. 8. Precio del bot vs sitio.
