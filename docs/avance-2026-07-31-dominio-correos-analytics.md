# Avance — 2026-07-31: Dominio propio, correos de marca y Analytics

> Sesión histórica: SOMOS-CALMA pasó de `anibru300.github.io/tanatologia/` a operar con dominio propio, sistema de correos profesional y medición de tráfico. Todo en un día.

---

## ✅ Lo que logramos hoy

### 1. Dominio propio: somos-calma.com
- Dominio comprado en **Hostinger** y conectado a GitHub Pages.
- DNS configurado: 4 registros A (GitHub Pages) + CNAME `www`.
- **HTTPS forzado** (certificado Let's Encrypt activo).
- Archivo `CNAME` en la raíz del repo.
- Migración completa de rutas: `/tanatologia/...` → `/...` en 24 archivos del sitio estático, y base de Vite `/tanatologia/app/` → `/app/`.
- URLs de Supabase actualizadas (Site URL + Redirect URLs a `https://somos-calma.com/app/`).

### 2. Sistema de correos profesional (Resend)
- Dominio verificado en Resend con **DKIM, SPF y DMARC** en el DNS de Hostinger.
- **SMTP propio** en Supabase Auth: los correos de login/recuperación salen de `SOMOS-CALMA <hola@somos-calma.com>` (ya no de `noreply@mail.app.supabase.io`). Límite subido a 30 correos/hora.
- **Plantilla de recuperación de contraseña** personalizada con branding (verde SOMOS-CALMA, botón, footer).
- **Bug de recuperación reparado**: el enlace llevaba a `/login` por el HashRouter; se migró al flujo `token_hash` + `verifyOtp` en `UpdatePasswordPage`.
- **Edge Function `send-email` reescrita**: el wrapper `@supabase/server` rechazaba credenciales válidas (`INVALID_CREDENTIALS`); ahora es `Deno.serve` + `createClient` con validación interna de usuario/rol, `verify_jwt = false` en el gateway y headers CORS completos.
- **Correos de citas y cotizaciones con branding** (`src/lib/emailTemplate.ts`): tabla de detalles + botón a la sala de videollamada. Probado end-to-end: **el correo de confirmación de cita llega con diseño de marca**.

### 3. Fundadoras en la página principal
- Video de la **Dra. Edith González Huerta** (cofundadora) procesado: audio normalizado (loudnorm, 62→128 kbps), 6.8 MB → 3.1 MB, faststart.
- Reestructura de la landing con criterio de jerarquía: **hero → video único de bienvenida (Dra. Lupita) → sección Fundadoras → cómo funciona**.
- Tarjetas de fundadoras con foto (frames extraídos de sus videos), nombre, rol y bio.
- **Modal de video**: carga bajo demanda (ahorra ~3 MB de carga inicial), con sonido, cierra con ✕/Esc/clic afuera.
- Coordinación de audio: al activar sonido de un video, el otro se silencia.

### 4. Música de fondo (solo index)
- *Gymnopedie No. 1* (Kevin MacLeod, CC BY 4.0) con crédito en el pie.
- Procesada suave (-27 LUFS), fade-in de 4 s, loop, 2.2 MB.
- Arranca con la primera interacción del usuario (política de navegadores) + botón flotante 🎵 abajo a la izquierda.
- La música cede automáticamente cuando suena un video y regresa al cerrarlo.

### 5. Medición: Google Analytics 4
- GA4 (`G-CJ0QQ9JY27`) integrado en las **16 páginas estáticas** (vía `components.js`) y en la **app React** (con `page_view` por cada navegación del HashRouter).
- **Search Console**: propiedad de dominio verificada (registro TXT en Hostinger).
- **Aviso de privacidad actualizado**: sección 9.1 Google Analytics (LFPDPPP), con opt-out.

### 6. Seguridad y limpieza
- API key de Resend rotada y guardada correctamente (SMTP password + secret de Edge Function); duplicado `RESEND_API_KEY 2` eliminado.
- `RESEND_FROM_EMAIL` = `SOMOS-CALMA <hola@somos-calma.com>`.
- Token temporal de despliegue (`sbp_...`) usado solo en memoria; indicado para revocación.
- Fix: enlace directo a `/app/#/login` en la página legacy `pages/login.html`.

---

## ⏳ En proceso (sin acción nuestra, solo esperar)

| Tema | Estado |
|---|---|
| Advertencia de Google "sitio peligroso" | Revisión solicitada 2026-07-31. Falso positivo por dominio nuevo. Respuesta esperada en 24–72 h. Mientras: clic en "El sitio es legítimo". |

---

## 📋 Siguientes pasos (en orden sugerido)

### Corto plazo (esta semana, $0)
1. **Bios reales de las doctoras** — pedirles: bio de 2–3 líneas, credenciales públicas y (opcional) foto profesional. Actualizar tarjetas de fundadoras.
2. **Verificar resolución de Google** — cuando llegue el correo de Search Console, confirmar que la advertencia desapareció.
3. **Primeras métricas** — revisar Analytics (Tiempo real + Adquisición) tras unos días de tráfico.

### Media cancha (1–4 semanas, $0–3,000 MXN/mes)
4. **Recordatorios automáticos de citas** (24 h y 1 h antes) — cron en Supabase + Resend. Cierra el ciclo de notificaciones.
5. **Correo de cancelación/reagendado** con la misma plantilla de marca.
6. **Buzones para recibir correo** (opcional): plan de correo Hostinger o reenvío a Gmail, para que `hola@somos-calma.com` pueda recibir respuestas.
7. **SEO básico**: con datos de Analytics/Search Console, ajustar títulos y contenidos según búsquedas reales.

### Fase de monetización (requiere decisión + inversión $10,000–25,000 MXN únicos)
> Detalle completo en `docs/investigacion-plataforma-2026-07-27.md` (Fase 5 y 6).

8. **Constituir la empresa** (S.A.S. ~$3,000–8,000) + e.firma/CSD (gratis en SAT).
9. **Contador** (~$1,500–2,500/mes) — definir esquema fiscal ANTES de cobrar (IVA, retenciones, quién factura a quién).
10. **Abogado** (~$3,000–8,000) — contrato de comisión mercantil con profesionistas + consentimiento de teleterapia.
11. **Pagos con Openpay** (sin renta; 2.9% + $2.50 por cobro): checkout al agendar, OXXO/SPEI, ledger interno.
12. **Payouts semanales** a profesionistas (CLABE vía Openpay Payout API).
13. **Facturación CFDI 4.0** con Facturapi (~$300/mes + $0.60/timbre).
14. **Suscripciones/membresías** (planes paciente 4/6 sesiones + cuota profesional).

### Gasto mensual proyectado al operar con pagos
≈ **$2,300–3,800 MXN/mes** fijos (Supabase Pro, Facturapi, contador, dominio) + comisiones variables que salen de la comisión por cita, no de la bolsa.

---

## 📌 Estado de la plataforma al cierre del día

**En producción y funcionando:** dominio propio con HTTPS, registro/login, recuperación de contraseña, directorio de terapeutas, agendamiento con disponibilidad real, videollamadas Jitsi, notas clínicas, notificaciones in-app, correos transaccionales con branding, verificación documental de profesionistas, panel admin, landing con fundadoras y música, Analytics midiendo.

**Siguiente gran hito:** cobrar la primera sesión. 💳
