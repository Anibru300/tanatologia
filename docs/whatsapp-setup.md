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

| Nombre | Cuerpo (texto exacto) |
|---|---|
| `sc_cita_agendada_2` | Hola {{1}}, tu cita con {{2}} quedó agendada para el {{3}}. La videollamada se realiza desde la plataforma SOMOS-CALMA. |
| `sc_recordatorio_24h_2` | Hola {{1}}, te recordamos que tu sesión con {{2}} es mañana: {{3}}. Te esperamos en SOMOS-CALMA. |
| `sc_recordatorio_15m_2` | Hola {{1}}, tu sesión con {{2}} comienza en 15 minutos ({{3}}). Entra ahora a la app de SOMOS-CALMA para conectarte. |
| `sc_cita_cancelada_2` | Hola {{1}}, tu cita con {{2}} del {{3}} fue cancelada. Si tienes dudas escríbenos a hola@somos-calma.com. |

- ⚠️ **Los nombres llevan sufijo `_2` por bloqueo de Meta (oct-2026):** al borrar las plantillas iniciales, su cola de borrado se atascó horas ("no se puede agregar contenido en un nuevo Spanish (MEX) mientras se elimina el actual") y la única vía fue crearlas con nombre nuevo. Los secrets `WA_TEMPLATE_*` apuntan a los nombres `_2` (verificable con `supabase secrets list`). Si se recrean otra vez, crear con nombre nuevo y actualizar secrets.
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
# Solo si los nombres de las plantillas difieren de los defaults:
supabase secrets set WA_TEMPLATE_BOOKED=sc_cita_agendada
supabase secrets set WA_TEMPLATE_REMINDER_24H=sc_recordatorio_24h
supabase secrets set WA_TEMPLATE_REMINDER_15M=sc_recordatorio_15m
supabase secrets set WA_TEMPLATE_CANCELLED=sc_cita_cancelada
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

**Ejemplo real de la beta:** 100 citas/mes × 4 avisos × 2 personas = 800 mensajes de utilidad ≈ **$6.80 USD ≈ $125 MXN/mes** (variable: solo se paga lo enviado; sin mensualidad fija). Meta Business y la verificación son gratis; la SIM exclusiva para el número es un gasto aparte de celular (~$100–150 MXN/mes si se contrata plan básico).

## Notas

- **Aviso de privacidad:** se recomienda añadir un párrafo mencionando que los
  avisos de cita pueden enviarse por WhatsApp al número proporcionado
  voluntariamente por el usuario. Página: `pages/aviso-privacidad.html`.
- El opt-in se guarda en `profiles.whatsapp_opt_in` (default `false`); el
  teléfono se normaliza a E.164 (`+52...`) en `src/lib/phone.ts` y en la Edge
  Function (mismo algoritmo en ambos lados).
- Si un envío falla (plantilla rechazada, número fuera de lista de prueba,
  token vencido), el error queda en los logs de la función y **nunca** tumba la
  cita ni el correo.
