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

**Número designado de SOMOS-CALMA: 477 125 0075** (E.164: `+52 477 125 0075`).

⚠️ **Conflicto a decidir antes de migrar:** hoy ese número está publicado en el sitio como
botón flotante de WhatsApp (`wa.me/5214771250075`) para que pacientes/profesionales
escriban directamente a las fundadoras. Al añadirlo a la API de Meta **deja de funcionar
en la app de WhatsApp** (un número no puede estar en ambas). Opciones:
1. **Dedicarlo 100% a la API** (avisos automáticos) y cambiar el botón del sitio a otro
   medio de contacto humano (correo, teléfono o un número distinto).
2. Dejar el número para contacto humano y **comprar una SIM/eSIM barata** solo para la API.
3. Migrarlo y gestionar las respuestas humanas desde la consola de Meta (más manual).

El número hay que **quitarlo de la app de WhatsApp** (si alguna vez se registró ahí) y
añadirlo en la consola en **WhatsApp Manager → Configuración de la API → Agregar número
de teléfono** (se verifica con un código por SMS/voz).

## Paso 5 — Plantillas (aprobar antes de producción)

En **WhatsApp Manager → Gestión de plantillas → Crear plantilla**, categoría
**Utilidad**, idioma **es-MX**, crear estas 4 (los nombres deben coincidir
exactamente, o actualizar los secrets `WA_TEMPLATE_*`):

| Nombre | Cuerpo (texto exacto) |
|---|---|
| `sc_cita_agendada` | Hola {{1}}, tu cita con {{2}} quedó agendada para el {{3}}. La videollamada se realiza desde la plataforma SOMOS-CALMA. |
| `sc_recordatorio_24h` | Hola {{1}}, te recordamos que tu sesión con {{2}} es mañana: {{3}}. Te esperamos en SOMOS-CALMA. |
| `sc_recordatorio_15m` | Hola {{1}}, tu sesión con {{2}} comienza en 15 minutos ({{3}}). Entra ahora a la app de SOMOS-CALMA para conectarte. |
| `sc_cita_cancelada` | Hola {{1}}, tu cita con {{2}} del {{3}} fue cancelada. Si tienes dudas escríbenos a hola@somos-calma.com. |

- `{{1}}` = primer nombre del destinatario, `{{2}}` = nombre del otro
  participante, `{{3}}` = fecha y hora (ej. "lunes 27/10/2026 18:00 h", hora del
  Centro de México).
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

## Costos (referencia Meta, sujeta a cambio)

Meta cobra **por mensaje de plantilla entregado** (rango orientativo
US$0.01–0.06 según categoría y país; ver la calculadora vigente en la
documentación de Meta). El volumen de una beta de citas es bajo (decenas de
mensajes al mes), por lo que el costo es mínimo. Las conversaciones iniciadas
por el usuario (ej. si alguien escribe al número) tienen su propia ventana
gratuita de 24 h, que hoy no utilizamos.

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
