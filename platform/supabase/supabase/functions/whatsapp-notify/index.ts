// whatsapp-notify — envía avisos de cita por WhatsApp vía Meta Cloud API
// (Graph API). Canal paralelo al correo: SOLO a usuarios con
// profiles.whatsapp_opt_in = true y teléfono normalizable a E.164.
//
// Tipos soportados (type + appointment_id):
//   appointment_booked | appointment_cancelled | appointment_reminder_24h |
//   appointment_reminder_15m
//
// Invocada por: triggers vía pg_net (dispatch_whatsapp, header x-cron-secret)
// y desde la Edge Function appointment-reminders (mismo header).
//
// Secrets requeridos: CRON_SECRET, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID.
// Sin WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID responde 501: el llamador
// (best-effort) lo ignora y el sistema sigue operando solo con correo.
//
// Las plantillas deben existir y estar aprobadas en Meta (ver
// docs/whatsapp-setup.md). Nombres configurables por env con defaults.
import { createClient } from "jsr:@supabase/supabase-js@^2";

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const WA_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
const WA_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const GRAPH_VERSION = Deno.env.get("WA_GRAPH_VERSION") || "v21.0";

const TEMPLATES = {
  appointment_booked: Deno.env.get("WA_TEMPLATE_BOOKED") || "sc_cita_agendada",
  appointment_cancelled: Deno.env.get("WA_TEMPLATE_CANCELLED") || "sc_cita_cancelada",
  appointment_reminder_24h: Deno.env.get("WA_TEMPLATE_REMINDER_24H") || "sc_recordatorio_24h",
  appointment_reminder_15m: Deno.env.get("WA_TEMPLATE_REMINDER_15M") || "sc_recordatorio_15m",
};
const SUPPORTED_TYPES = Object.keys(TEMPLATES);

// México no observa horario de verano desde 2022: offset fijo -06:00.
const MX_OFFSET_MS = -6 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

// Normaliza a E.164 mexicano: quita todo lo que no sea dígito o '+'.
// - Si ya trae '+', se respeta tal cual (cualquier país).
// - Si no, asume México: quita el prefijo de marcación 045/044/01 o el '0'
//   nacional, y acepta 10 dígitos (local), '1'+10 (celular) y '52'+10
//   (ya con lada país).
// Devuelve null si queda inválido (<10 o >15 dígitos).
export function normalizeMxPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^0-9+]/g, "");
  if (!cleaned) return null;

  const hasPlus = cleaned.startsWith("+");
  let digits = cleaned.replace(/\D/g, "");
  if (!hasPlus) {
    // Prefijos de marcación mexicanos: 045/044 (celular) y 01 (larga distancia).
    if (digits.length === 13 && (digits.startsWith("045") || digits.startsWith("044"))) {
      digits = digits.slice(3);
    } else if (digits.length === 12 && digits.startsWith("01")) {
      digits = digits.slice(2);
    } else {
      digits = digits.replace(/^0+/, "");
    }
  }
  if (digits.length < 10 || digits.length > 15) return null;

  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+52${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
  // 13-15 dígitos sin '+' y sin prefijo reconocido: no adivinar país.
  if (digits.length > 12) return null;
  return `+52${digits}`;
}

function mxPretty(utcIso: string) {
  const d = new Date(new Date(utcIso).getTime() + MX_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekday = new Intl.DateTimeFormat("es-MX", { weekday: "long", timeZone: "UTC" }).format(d);
  return `${weekday} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} h`;
}

type Recipient = {
  to: string; // E.164
  name: string;
  otherName: string;
  whenPretty: string;
};

async function sendTemplate(recipient: Recipient, templateName: string): Promise<{ ok: boolean; error?: string }> {
  const body = {
    messaging_product: "whatsapp",
    to: recipient.to.replace("+", ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: "es_MX" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: recipient.name },
            { type: "text", text: recipient.otherName },
            { type: "text", text: recipient.whenPretty },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${WA_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `Graph ${res.status}: ${detail.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json({ error: "No autorizado" }, 401);
  }
  // Sin configuración de Meta: 501. Los llamadores son best-effort y lo ignoran.
  if (!WA_TOKEN || !WA_PHONE_NUMBER_ID) {
    return json({ error: "WhatsApp no está configurado (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID)" }, 501);
  }

  let payload: { type?: string; appointment_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const type = payload?.type;
  const appointmentId = payload?.appointment_id;
  if (!type || !SUPPORTED_TYPES.includes(type)) {
    return json({ error: `type inválido. Soportados: ${SUPPORTED_TYPES.join(", ")}` }, 400);
  }
  if (!appointmentId) {
    return json({ error: "appointment_id requerido" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, scheduled_at, patient_profile_id, professional_profile_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (apptError || !appt) {
    return json({ error: "Cita no encontrada" }, 404);
  }

  const [{ data: patient }, { data: professional }] = await Promise.all([
    supabase.from("patient_profiles").select("profile_id, full_name").eq("id", appt.patient_profile_id).maybeSingle(),
    supabase.from("professional_profiles").select("profile_id, full_name").eq("id", appt.professional_profile_id).maybeSingle(),
  ]);
  if (!patient || !professional) {
    return json({ error: "Participantes no encontrados" }, 404);
  }

  const [{ data: patientUser }, { data: proUser }] = await Promise.all([
    supabase.from("profiles").select("phone, whatsapp_opt_in, full_name").eq("id", patient.profile_id).maybeSingle(),
    supabase.from("profiles").select("phone, whatsapp_opt_in, full_name").eq("id", professional.profile_id).maybeSingle(),
  ]);

  const whenPretty = mxPretty(appt.scheduled_at);
  const patientName = patient.full_name || patientUser?.full_name || "paciente";
  const proName = professional.full_name || proUser?.full_name || "tu profesional";
  const templateName = TEMPLATES[type as keyof typeof TEMPLATES];

  const candidates: { user: typeof patientUser; name: string; otherName: string }[] = [
    { user: patientUser, name: patientName.split(" ")[0], otherName: proName },
    { user: proUser, name: proName.split(" ")[0], otherName: patientName },
  ];

  const stats = { sent: 0, skipped: 0, errors: [] as string[] };

  for (const c of candidates) {
    if (!c.user?.whatsapp_opt_in) {
      stats.skipped += 1;
      continue;
    }
    const to = normalizeMxPhone(c.user.phone);
    if (!to) {
      stats.skipped += 1;
      console.warn(`whatsapp-notify: teléfono inválido para perfil (cita ${appointmentId})`);
      continue;
    }
    const result = await sendTemplate({ to, name: c.name, otherName: c.otherName, whenPretty }, templateName);
    if (result.ok) {
      stats.sent += 1;
    } else {
      // Nunca tumbar el flujo: se loggea y se reporta en la respuesta.
      console.error(`whatsapp-notify (${type}, cita ${appointmentId}): ${result.error}`);
      stats.errors.push(result.error ?? "error desconocido");
    }
  }

  return json({ ok: true, type, appointment_id: appointmentId, ...stats });
});
