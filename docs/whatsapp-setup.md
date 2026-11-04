# Configuración de WhatsApp (Meta Cloud API) — checklist para el dueño

> El código ya está desplegado y es **seguro en cualquier estado**: sin los secrets
> de Meta, la plataforma sigue enviando correo + notificación in-app exactamente
> como antes, y el canal WhatsApp simplemente no se activa (la función responde
> 501 y el sistema lo ignora). Este trámite solo **enciende** el canal extra.

## Qué se envía por WhatsApp

Solo a usuarios que **activaron el aviso** (checkbox en el registro o en
Configuración de cuenta) **y** tienen teléfono válido:

| Momento | Destinatarios |
|---|---|
| Nueva cita agendada | Paciente y profesional |
| Recordatorio 24 h antes | Paciente y profesional |
| Aviso 15 min antes ("ya va a empezar") | Paciente y profesional |
| Cita cancelada | Paciente y profesional |
| Sesión completada (cierre de cita) | Paciente (CTA a reseña) |

## Paso 1 — Cuenta Meta Business y verificación (empezar YA, tarda días)

1. Entrar a https://business.facebook.com y crear la cuenta de Meta Business
   de SOMOS-CALMA.
2. En **Configuración de la empresa → Seguridad** iniciar la **verificación del
   negocio** (piden documentos: constancia de situación fiscal o similar).
   Mientras no esté verificada, todo funciona en **modo de prueba** (paso 3).

## Paso 2 — App de Meta y credenciales

1. Ir a https://developers.facebook.com → **Crear app** → tipo **Empresa**.
2. En el producto **WhatsApp** → **Configuración de la API** anotar:
   - **Identificador del número de teléfono** (`Phone Number ID`)
   - **Identificador de la cuenta de WhatsApp Business** (`WABA ID`)
3. Crear un **token permanente** (el token temporal dura 24 h):
   - Configuración de la empresa → **Usuarios del sistema** → Agregar → con
     permiso **Administrador** de la app.
   - Generar **token nuevo**, con el permiso `whatsapp_business_messaging`.
   - **Guardarlo como un password** (solo se muestra una vez).

## Paso 3 — Número de prueba (puedes probar HOY, sin verificación)

En la misma sección de Configuración de la API está la sección **Enviar y
recibir mensajes → Números de prueba**: permite agregar hasta **5 números
destinatarios** que recibirán mensajes sin plantillas aprobadas. Agrega el tuyo
y los de prueba. El **número emisor** de prueba de Meta sirve para desarrollo.

## Paso 4 — Número de producción

**Número designado de SOMOS-CALMA para la API: 477 849 1080** (E.164: `+52 477 849 1080`).
**Decisión tomada (26-oct-2026, opción A): SIM nueva exclusiva para la API.** El 477 125 0075 NO se toca — sigue para atención humana de las fundadoras (botón flotante del sitio intacto).

⚠️ **Antes de agregarlo a Meta:** el chip NO debe tener WhatsApp activo en la app de consumidor (si alguna vez se registró, borrar esa cuenta de la app primero) — un número no puede estar en ambas. El número se agrega en **WhatsApp Manager → Configuración de la API → Agregar número de teléfono** (se verifica con un código por SMS/voz que llega al chip). Al verificarse, la consola muestra su **Phone Number ID** — pasarlo a quien opere para el secret `WHATSAPP_PHONE_NUMBER_ID` (paso 6).

## Paso 5 — Plantillas (aprobar antes de producción)

En **WhatsApp Manager → Gestión de plantillas → Crear plantilla**, categoría
**Utilidad**, idioma **es-MX**, crear estas 4 (los nombres deben coincidir
exactamente, o actualizar los secrets `WA_TEMPLATE_*`):

**✅ ESTADO 2026-11-03 — 100% EN PRODUCCIÓN.** Las 6 plantillas activas están APPROVED y los secrets apuntan a ellas: `sc_cita_agendada_2_3`, `sc_recordatorio_24h_2_3`, `sc_recordatorio_15m_3` (4º parámetro = link directo a la sala), `sc_cita_cancelada_2_3`, `sc_sesion_paciente_1` y `sc_sesion_profesional_1` (4º parámetro = link a reseña por rol, secrets `WA_TEMPLATE_COMPLETED_PATIENT`/`_PRO`). Las viejas (`*_2`, `sc_sesion_completada*`, `sc_recordatorio_15m_2_3`) fueron **eliminadas** de Meta. Pruebas reales enviadas 2026-11-03 (las 3 nuevas con wamid OK al tel del dueño) y E2E por triggers 2026-11-01 (`sent:1, errors:[]`). Prohibido volver a usar `create-wa-templates.sh` (corrompió acentos); usar siempre Node.

| Nombre (activa) | Cuerpo (texto exacto) |
|---|---|
| `sc_cita_agendada_2_3` | Hola {{1}}, tu cita con {{2}} quedó agendada para el {{3}}. La videollamada se realiza desde la plataforma SOMOS-CALMA. |
| `sc_recordatorio_24h_2_3` | Hola {{1}}, te recordamos que tu sesión con {{2}} es mañana: {{3}}. Te esperamos en SOMOS-CALMA. |
| `sc_recordatorio_15m_2_3` | Hola {{1}}, tu sesión con {{2}} comienza en 15 minutos ({{3}}). Entra ahora a la app de SOMOS-CALMA para conectarte. |
| `sc_cita_cancelada_2_3` | Hola {{1}}, tu cita con {{2}} del {{3}} fue cancelada. Si tienes dudas escríbenos a hola@somos-calma.com. |
| `sc_sesion_completada_3` | Hola {{1}}, tu sesión con {{2}} del {{3}} fue completada. Gracias por confiar en SOMOS-CALMA. Entra a la plataforma para contarnos cómo te sentiste: tu reseña ayuda a otros a encontrar acompañamiento. |

- **`sc_recordatorio_15m_3` (✅ APPROVED y activa desde 2026-11-03, ID Meta `3201709756684468`):** igual que la de 15 min pero con **`{{4}}` = link directo de la videollamada** (pedido del dueño: "da click a este link para entrar a tu videollamada"). Meta prohibe que la plantilla termine en variable, por eso cierra con "Te esperamos en SOMOS-CALMA.". `whatsapp-notify` agrega el 4º parámetro porque el nombre configurado ya no es el default de 3 parámetros (`THREE_PARAM_DEFAULTS`).
- **`sc_sesion_completada_3` (036):** avisa al paciente cuando la cita pasa a 'completed' (colgar del profesional o cron 031); cableada vía migración 036 (`dispatch_whatsapp('appointment_completed', ...)` en `notify_appointment_events`). Bienvenida/verificación/chat NO llevan plantilla a propósito: el opt-in cubre solo **avisos de cita**.
- **✅ ACTIVAS DESDE 2026-11-03 — `sc_sesion_paciente_1`** (ID `889336330933570`) y **`sc_sesion_profesional_1`** (ID `1642256980725541`): reemplazan a `sc_sesion_completada_3` (borrada de Meta) — al completarse la sesión, **cada participante recibe UN mensaje con su propia plantilla y su link de reseña** (paciente → reseña pública anónima en `/#/paciente/citas`; profesional → reseña privada en `/#/profesional/citas`). `whatsapp-notify` lee los secrets `WA_TEMPLATE_COMPLETED_PATIENT` / `WA_TEMPLATE_COMPLETED_PRO` (fallback al default `sc_sesion_completada_3`, hoy inexistente en Meta pero nunca usado porque los secrets nuevos están fijados) y manda el link `{{4}}` por rol. El secret viejo `WA_TEMPLATE_COMPLETED` se conserva solo como fallback inerte.
- Guion de consulta/prueba/envío: `node .tools/review/test-wa-templates.mjs status|send` (lee token de `WHATSAPP_TOKEN` env; NO necesita la CLI vinculada si las variables van por env).

- ⚠️ **Historia de nombres (oct-2026):** Meta atascó la cola de borrado de las plantillas iniciales y no permitía reutilizar nombres; por eso las copias corregidas llevan doble sufijo (`_2_3`). Los nombres ya están libres (borrado completado 2026-11-01) pero no vale la pena recrearlas: los secrets apuntan a los nombres actuales.
- ⚠️ **Meta (oct-2026) está en migración y es inconsistente:** el EDITOR de plantillas exige variables con nombre (`{{nombre}}`), pero el SISTEMA DE REVISIÓN rechaza esas mismas plantillas con "parámetros incorrectos" pidiendo POSICIONALES (`{{1}}`). **Usar SIEMPRE posicionales** (`{{1}}`, `{{2}}`, `{{3}}`) — las creadas con nombre serán rechazadas. Crear por API con `example.body_text` (ejemplo posicional).
- `{{1}}` = primer nombre del destinatario, `{{2}}` = nombre del otro
  participante, `{{3}}` = fecha y hora (ej. "lunes 27/10/2026 18:00 h", hora del
  destinatario). Tipo de variable: **Texto** (no Número).
- La aprobación tarda de minutos a ~48 h. Si Meta las rechaza, ajustar el
  texto (evitar pedir datos, incluir el nombre de la empresa, etc.).

## Paso 6 — Secrets en Supabase

Con la CLI vinculada (`supabase link --project-ref qjwebikgrqtotqfipeqt`):

```bash
supabase secrets set WHATSAPP_TOKEN=<token permanente del paso 2>
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID del paso 2>
# Nombres de plantillas (los defaults del código ya traen los nombres `_3`):
supabase secrets set WA_TEMPLATE_BOOKED=sc_cita_agendada_2_3
supabase secrets set WA_TEMPLATE_REMINDER_24H=sc_recordatorio_24h_2_3
supabase secrets set WA_TEMPLATE_REMINDER_15M=sc_recordatorio_15m_2_3
supabase secrets set WA_TEMPLATE_CANCELLED=sc_cita_cancelada_2_3
supabase secrets set WA_TEMPLATE_COMPLETED=sc_sesion_completada_3
```

Redeployar las funciones para que tomen los secrets:

```bash
supabase functions deploy whatsapp-notify
supabase functions deploy appointment-reminders
```

## Paso 7 — Prueba

```bash
cd platform/web
CRON_SECRET=<valor del vault> node scripts/test-whatsapp.mjs
```

Con el número de prueba del paso 3 y el secret correcto, la salida esperada ya
no es 501 sino 400/404 en los casos inválidos. Para una prueba real end-to-end:
crear una cita de prueba entre dos cuentas con opt-in activado y teléfono de
prueba agregado en Meta, y verificar que lleguen los mensajes.

## Costos (verificados 2026-10-25, tarifas oficiales de Meta vigentes desde el 1-oct-2026)

Meta cobra **por mensaje entregado** en México:

| Categoría | USD/mensaje | ≈ MXN/mensaje |
|---|---|---|
| **Utilidad** (las 4 plantillas de cita son esta categoría) | $0.0085 | ~$0.16 |
| Autenticación | $0.0085 | ~$0.16 |
| Servicio (respuestas libres) | $0.0085, pero **primeros 1,000/mes gratis por número** | ~$0.16 |
| Marketing | $0.0397 | ~$0.73 |

**Ejemplo real de la beta:** 100 citas/mes × 4 avisos × 2 personas = 800 mensajes de utilidad ≈ **$6.80 USD ≈ $125 MXN/mes** (más el aviso de sesión completada: +100 msgs ≈ +$16 MXN) (variable: solo se paga lo enviado; sin mensualidad fija). Meta Business y la verificación son gratis; la SIM exclusiva para el número es un gasto aparte de celular (~$100–150 MXN/mes si se contrata plan básico).

## Notas

- **Aviso de privacidad:** se recomienda añadir un párrafo mencionando que los
  avisos de cita pueden enviarse por WhatsApp al número proporcionado
  voluntariamente por el usuario. Página: `pages/aviso-privacidad.html`.
- El opt-in se guarda en `profiles.whatsapp_opt_in` (default `false`); el
  teléfono se normaliza a E.164 (`+52...`) en `src/lib/phone.ts` y en la Edge
  Function (mismo algoritmo en ambos lados).
- ⚠️ **Verificación del negocio NO es requisito para operar con usuarios reales** (regla vigente de Meta 2026). El número de producción registrado (con método de pago) puede enviar a **250 usuarios únicos por período móvil de 24 h** sin verificación — volumen muy superior al de la beta. La verificación desbloquea 2,000+/día, el nombre de empresa visible en el chat y la insignia; hacerla cuando haya CSF a la mano. (El límite de "5 números de prueba" aplica SOLO al número de prueba gratuito de Meta, no al número de producción.)
- ⚠️ **Usuarios fuera de México:** el teléfono acepta formato internacional con `+` y código de país (p. ej. `+1 416...`, `+34 612...`); `normalizeMxPhone` respeta cualquier número que empiece con `+`. Sin `+` se asume México. El costo por mensaje varía por país destino (tarifas de Meta por utilidad). La hora de los avisos ya va en la `timezone` del destinatario.
- Si un envío falla (plantilla rechazada, token vencido), el error queda en los logs de la función y **nunca** tumba la cita ni el correo.
