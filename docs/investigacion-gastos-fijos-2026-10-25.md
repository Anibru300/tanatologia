# Investigación — Gastos fijos de operación de SOMOS CALMA (2026-10-25)

> Todos los precios verificados hoy contra fuentes públicas (oficiales cuando fue posible).
> Tipo de cambio de referencia: **$18.50 MXN por USD** (FIX Banxico ~18.42–18.62, semana del 20-oct-2026; el peso se ha depreciado, conviene presupuestar a $19).

## Estado actual de la plataforma (contexto real)

- **49 usuarios registrados** (34 profesionales / 14 pacientes), 12 profesionales verificados, pocas citas reales por mes.
- **Supabase:** plan Free ($0). Límites que nos importan: 500 MB base de datos, 1 GB archivos, 5 GB salida, 50,000 usuarios activos/mes, 500,000 invocaciones Edge Functions. Se pausa si hay 7 días sin actividad (con el tráfico actual no pasa).
- **Videollamadas:** JaaS (8x8) plan **Developer: gratis hasta 25 MAU** (usuario activo mensual = persona que entró a ≥1 llamada). Hoy estamos dentro.
- **Correos:** Resend plan **Free: 3,000 correos/mes** (tope 100/día). Los comunicados masivos son los que más consumen.
- **Sitio web:** GitHub Pages = **$0** (hosting del sitio estático y de la app).
- **Dominio:** somos-calma.com en Hostinger (comprado 2026-07-31; primera renovación jul-2027).

---

## 1. Asistente de código (Kimi) — el "sueldo" del mantenimiento

Kimi es la suscripción que usamos para mejorar el código, corregir problemas y operar la plataforma.

| Plan | Precio USD/mes | ≈ MXN/mes | Notas |
|---|---|---|---|
| Plus | $19 | ~$350 | Incluye Kimi Code (agente de código) |
| **Pro** | **$39** | **~$720** | **Es el que coincide con los ~$700 que mencionas.** 2× créditos de agente |
| Max | $99 | ~$1,830 | Uso pesado de agentes |
| Ultra | $199 | ~$3,680 | Automatización continua |

Fuente: precios oficiales Kimi/Moonshot verificados el 24-oct-2026 (planes Plus/Pro/Max/Ultra, todos incluyen Kimi Code; anual ≈ 20% menos).

**Conclusión:** presupuestar **$39 USD/mes ≈ $700–750 MXN/mes** (o $372 USD/año ≈ $6,900 MXN si se paga anual).

## 2. GitHub — hacer el repo privado

**Costo: $0.** Desde 2020 GitHub incluye **repositorios privados ilimitados gratis** en el plan Free (para individuos y organizaciones), con Actions incluidas:

- Free privado: 2,000 minutos de GitHub Actions/mes. Nuestro build de la app tarda ~40 s → caben ~3,000 builds/mes. Hoy usamos ~10–20.
- GitHub Pages: gratis (es donde vive el sitio y la app).

Plan GitHub Team ($4 USD/usuario/mes ≈ $74 MXN) **no se necesita**; solo aporta reglas avanzadas de protección de ramas. Hacer el repo privado es solo cambiar un setting, sin costo.

Fuente: docs.github.com y página de precios, verificado oct-2026.

## 3. Supabase (base de datos, usuarios, archivos) — "tenerlo bien para más usuarios"

| Plan | Precio USD/mes | ≈ MXN/mes | Qué da |
|---|---|---|---|
| Free (actual) | $0 | $0 | 500 MB BD, 1 GB archivos, 5 GB salida, 50k usuarios/mes, se pausa a los 7 días sin actividad |
| **Pro** | **$25** | **~$460** | **8 GB BD, 100 GB archivos, 250 GB salida, 100k usuarios/mes, respaldos diarios, NUNCA se pausa, compute Micro incluido ($10 de crédito)** |
| Team | $599 | ~$11,000 | Igual que Pro + SOC2/ISO, SSO, soporte prioritario. **No necesario.** |

Cargos extra si se excede (Pro): salida $0.09/GB, usuarios extra $0.00325/MAU, almacenamiento $0.125/GB.

**Conclusión:** mientras seamos Beta con decenas de usuarios, **Free es suficiente y cuesta $0**. El salto a **Pro ($25 ≈ $460 MXN/mes)** se justifica cuando: (a) se acerquen los 500 MB de base de datos o 1 GB de archivos (videos/avatars/documentos), (b) queramos respaldos diarios garantizados, o (c) volumen real de usuarios. Es **el siguiente gasto fijo más probable**.

Fuente: supabase.com/pricing verificado oct-2026 (varias fuentes concuerdan).

## 4. Videollamadas (JaaS / 8x8) — "más de 100 videollamadas, más profesionistas"

JaaS cobra por **MAU** (persona distinta que entra a ≥1 llamada al mes), no por número de llamadas. 100 llamadas entre las mismas 20 personas = 20 MAU.

| Plan | MAU incluidos | Precio USD/mes | ≈ MXN/mes |
|---|---|---|---|
| Developer (actual) | 25 | **$0** | $0 |
| Basic | 300 | $99 | ~$1,830 |
| Standard | 1,500 | $499 | ~$9,230 |
| Business | 3,000 | $999 | ~$18,500 |

Excedente: $0.99 USD por MAU extra. Grabación (si algún día se ocupa): $0.01/min.

**Ejemplo real:** 15 profesionales + 30 pacientes activos en video al mes = 45 MAU → hay que pasar a Basic ($99).

**Alternativa documentada para volumen alto:** servidor Jitsi propio (~$60–100 USD/mes de servidor para 50–100 usuarios concurrentes, software gratis). A partir de ~300 MAU sale más barato que JaaS, pero hay que administrarlo. Ya está anotado como "plan futuro" en AGENTS.md.

Fuente: 8x8.com/products/apis/video y cpaas.8x8.com/pricing, verificado oct-2026.

## 5. Correo transaccional (Resend)

| Plan | Correos/mes | Precio USD | ≈ MXN |
|---|---|---|---|
| Free (actual) | 3,000 (tope 100/día) | $0 | $0 |
| Pro | 50,000 | $20/mes | ~$370 |
| Pro | 100,000 | $35/mes | ~$650 |

**Conclusión:** con ~50 usuarios, 3,000/mes sobra (recordatorios + bienvenidas + soporte ≈ 200–400/mes). El tope de **100/día** es el límite real: un comunicado masivo a 46 profesionales + correos del día puede acercarse. Si se vuelve frecuente, Pro ($20).

Fuente: resend.com pricing, verificado oct-2026.

## 6. Dominio somos-calma.com (Hostinger)

- Renovación .com en Hostinger: **~$19.99 USD/año ≈ $370 MXN/año (≈ $31 MXN/mes)**.
- La primera renovación cae en **julio-2027** (compra del 2026-07-31).
- Incluye privacidad WHOIS gratis. El correo hola@ vive en el webmail de Hostinger (sin costo extra con el dominio; el plan de hosting si lo hay es aparte — el sitio no usa hosting de Hostinger, usa GitHub Pages).

Fuente: precios de dominios Hostinger 2026 (varios comparadores concuerdan: $19.99 renovación .com).

## 7. WhatsApp (recordatorios de cita) — gasto variable, muy barato

Meta cobra **por mensaje** en México (tarifas oficiales desde el 1-oct-2026):

| Categoría | USD/mensaje | ≈ MXN/mensaje |
|---|---|---|
| **Utilidad** (recordatorios, confirmaciones — lo que usaríamos) | $0.0085 | **~$0.16** |
| Autenticación | $0.0085 | ~$0.16 |
| Servicio | $0.0085 (primeros 1,000/mes gratis por número) | ~$0.16 |
| Marketing | $0.0397 | ~$0.73 |

**Ejemplo:** 100 citas/mes × 4 avisos (agendada, 24h, 15min, cancelación) × 2 personas = 800 mensajes de utilidad ≈ **$6.80 USD ≈ $125 MXN/mes**. No es un gasto fijo: se paga solo lo que se envía. Requiere la verificación de Meta Business (gratis) y la SIM exclusiva (decisión ya tomada, ~$100–150 MXN/mes si se contrata un plan de celular básico — costo de teléfono, no de software).

## 8. Otros servicios que usamos y NO cuestan

| Servicio | Costo |
|---|---|
| GitHub Pages (sitio + app) | $0 |
| Google Analytics 4 + Search Console | $0 |
| Google Calendar links en correos | $0 |
| Jitsi sala de respaldo (meet.jit.si) | $0 (límite 5 min, solo respaldo) |
| Meta/Facebook página | $0 |
| Supabase CLI, GitHub Actions, Dependabot | $0 |

## 9. ¿Qué otros gastos vamos a ocupar? (anticipo honesto)

1. **Pasarela de pagos (cuando se active cobro):** Stripe no opera en México para esto; Openpay cobra ~2.9% + $3 MXN por transacción (sin mensualidad) o plan fijo ~$600 MXN/mes; PayPal ~3.49% + comisión fija. **No es gasto fijo hasta que cobremos.**
2. **Respaldo del código fuera de GitHub:** opcional, un bundle en disco/USB = $0 (ya se hizo uno en la purga de oct-2026).
3. **Turnstile/rate-limit persistente** contra spam en formularios públicos: Cloudflare Turnstile es **gratis** (pospuesto M3).
4. **Servidor Jitsi propio:** solo si superamos ~300 MAU (ver sección 4).
5. **Contador/legal:** fuera de scope técnico, pero la plataforma como persona física con ingresos necesitará facturación (honorarios de contador ~$500–1,000 MXN/mes cuando haya ingresos).

---

## Resumen ejecutivo

### Escenario HOY (Beta, ~50 usuarios, <25 personas en video/mes)

| Concepto | USD/mes | MXN/mes |
|---|---|---|
| Kimi (Pro, para operar/mantener) | $39 | ~$720 |
| Supabase Free | $0 | $0 |
| JaaS Developer (25 MAU) | $0 | $0 |
| Resend Free | $0 | $0 |
| GitHub (repo privado + Actions + Pages) | $0 | $0 |
| Dominio (prorrateado) | ~$1.7 | ~$31 |
| **TOTAL** | **~$41** | **~$750 MXN/mes** |

### Escenario CRECIMIENTO (~300 usuarios activos, 45–300 personas en video/mes, comunicados frecuentes)

| Concepto | USD/mes | MXN/mes |
|---|---|---|
| Kimi Pro | $39 | ~$720 |
| **Supabase Pro** (respaldos diarios, sin pausas) | $25 | ~$460 |
| **JaaS Basic** (300 MAU) | $99 | ~$1,830 |
| **Resend Pro** (sin tope diario) | $20 | ~$370 |
| GitHub | $0 | $0 |
| Dominio | ~$1.7 | ~$31 |
| WhatsApp recordatorios (variable, 800 mensajes) | ~$7 | ~$130 |
| **TOTAL** | **~$192** | **~$3,550 MXN/mes** |

### Reglas de decisión (cuándo pagar qué)

- **Supabase Pro ($25):** cuando la BD pase de ~400 MB, los archivos de 1 GB, o quieras respaldos diarios oficiales.
- **JaaS Basic ($99):** el primer mes que supere 25 personas distintas en videollamadas. Si se acerca a 300 MAU sostenido, evaluar servidor Jitsi propio (~$60–100) con técnico que lo opere.
- **Resend Pro ($20):** el primer día que un comunicado masivo supere los 100 correos o se necesiten >100/día.
- **Kimi:** Plus ($19) si baja el uso; Max ($99) solo si el volumen de trabajo lo justifica.
- **GitHub privado:** hacerlo YA, cuesta $0.

### Fuentes principales (verificadas 2026-10-25)
- Kimi/Moonshot: felloai.com/kimi-pricing (datos de platform.kimi.ai, 24-oct-2026)
- Supabase: supabase.com/pricing vía nocode.mba y selfhost.dev (jul–oct 2026)
- JaaS: 8x8.com/products/apis/video, cpaas.8x8.com/en/pricing/jitsi-as-a-service-pricing
- Resend: resend.com/docs precios oficiales
- GitHub: docs.github.com planes
- Hostinger dominios: hostadvice.com comparador 2026
- WhatsApp: tarifas Meta oficiales vía dapta.ai y respond.io (rate card 1-oct-2026)
- Tipo de cambio: FIX Banxico / prensa financiera, semana del 20-oct-2026 (~18.5)
