import { createClient } from "jsr:@supabase/supabase-js@^2";

// user-emails — correos transaccionales disparados por triggers de la base de datos
// (bienvenida, cancelación de cita, verificación de profesional) vía pg_net.
// Invocada con el header x-cron-secret (mismo secreto CRON_SECRET del cron de
// recordatorios). Best-effort: un fallo aquí nunca afecta la operación original.
//
// Secrets requeridos: CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL (opcional).

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";
const APP_URL = "https://somos-calma.com/app";
// México no observa horario de verano desde 2022: offset fijo -06:00.
const MX_OFFSET_MS = -6 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mxPretty(utcIso: string): string {
  const d = new Date(new Date(utcIso).getTime() + MX_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekday = new Intl.DateTimeFormat("es-MX", { weekday: "long", timeZone: "UTC" }).format(d);
  return `${weekday} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} h`;
}

// Plantilla de marca (misma línea visual que src/lib/emailTemplate.ts del frontend).
function branded(opts: {
  title: string;
  greeting: string;
  paragraphs: string[];
  ctaText?: string;
  ctaUrl?: string;
  note?: string;
}): string {
  const ctaBlock =
    opts.ctaText && opts.ctaUrl
      ? `
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr><td align="center" style="background-color:#5F6F55;border-radius:999px;">
                <a href="${opts.ctaUrl}"
                   style="display:inline-block;padding:14px 36px;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;">
                  ${escapeHtml(opts.ctaText)}
                </a>
              </td></tr>
            </table>`
      : "";

  const noteBlock = opts.note
    ? `<p style="margin:16px 0 0;color:#999;font-size:13px;line-height:1.5;">${escapeHtml(opts.note)}</p>`
    : "";

  const paragraphs = opts.paragraphs
    .map((p) => `<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">${p}</p>`)
    .join("\n            ");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F7F5F0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5F0;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(76,88,69,0.08);">
        <tr>
          <td style="background-color:#5F6F55;padding:28px 32px;text-align:center;">
            <span style="color:#FFFFFF;font-size:22px;letter-spacing:2px;font-weight:bold;">SOMOS-CALMA</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="margin:0 0 16px;color:#4C5845;font-size:24px;font-weight:bold;">${escapeHtml(opts.title)}</h1>
            <p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">${opts.greeting}</p>
            ${paragraphs}
            ${ctaBlock}
            ${noteBlock}
          </td>
        </tr>
        <tr>
          <td style="background-color:#F7F5F0;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">
              SOMOS-CALMA · Acompañamiento emocional y tanatología<br>
              <a href="https://somos-calma.com" style="color:#8BAE7A;text-decoration:none;">somos-calma.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

async function sendResend(to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html }),
  });
  if (!res.ok) {
    console.error(`Resend falló para ${to}:`, res.status, await res.text());
  }
  return res.ok;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json({ error: "No autorizado" }, 401);
  }
  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { type?: string; profile_id?: string; appointment_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const { type, profile_id, appointment_id } = body;
  if (!type || (type !== "appointment_cancelled" && !profile_id) || (type === "appointment_cancelled" && !appointment_id)) {
    return json({ error: "Faltan campos obligatorios (type, profile_id | appointment_id)" }, 400);
  }

  // Bienvenida: el perfil puede no estar visible aún si pg_net no difirió al COMMIT;
  // reintentamos unas veces antes de rendirnos.
  const fetchProfile = async (id: string, attempts = 5) => {
    for (let i = 0; i < attempts; i++) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .eq("id", id)
        .maybeSingle();
      if (data) return data;
      if (i < attempts - 1) await sleep(800);
    }
    return null;
  };

  const sent: string[] = [];

  switch (type) {
    case "welcome_patient":
    case "welcome_professional": {
      const profile = await fetchProfile(profile_id!);
      if (!profile || !profile.email) {
        return json({ error: "Perfil no encontrado", profile_id }, 404);
      }
      const name = escapeHtml(firstName(profile.full_name || "bienvenido/a"));
      const isPatient = type === "welcome_patient";
      const subject = "Bienvenido a SOMOS-CALMA";
      const html = isPatient
        ? branded({
            title: "Bienvenido a SOMOS-CALMA",
            greeting: `Hola ${name},`,
            paragraphs: [
              "Tu cuenta fue creada con éxito. Estamos muy contentos de acompañarte en este proceso.",
              "SOMOS-CALMA es una plataforma de acompañamiento emocional y tanatología: aquí puedes conocer a nuestros profesionales, agendar sesiones por videollamada y encontrar recursos para tu bienestar.",
              "Si quieres, puedes empezar completando tu encuesta personal: nos ayuda a orientarte hacia el profesional más adecuado para ti (también puedes hacerlo después desde tu panel).",
            ],
            ctaText: "Completar mi encuesta",
            ctaUrl: `${APP_URL}/#/paciente/encuesta`,
            note: "También puedes explorar el directorio de profesionales y agendar tu primera sesión desde tu panel.",
          })
        : branded({
            title: "Bienvenido a SOMOS-CALMA",
            greeting: `Hola ${name},`,
            paragraphs: [
              "Tu cuenta profesional fue creada con éxito. Nos alegra que formes parte de la red de acompañamiento de SOMOS-CALMA.",
              "Para aparecer en el directorio y recibir citas, completa tu perfil y envía tus documentos (cédula profesional, título e identificación). Nuestro equipo los revisará manualmente y te avisaremos por correo cuando tu verificación quede aprobada.",
              "Mientras tanto, puedes configurar tu disponibilidad para que los pacientes agenden contigo.",
            ],
            ctaText: "Completar mi perfil y verificación",
            ctaUrl: `${APP_URL}/#/profesional/verificacion`,
            note: "La revisión de documentos la realiza nuestro equipo; te notificaremos el resultado por correo y en tu panel.",
          });
      if (await sendResend(profile.email, subject, html)) sent.push(profile.email);
      break;
    }

    case "appointment_cancelled": {
      const { data: appt } = await supabase
        .from("appointments")
        .select("id, scheduled_at, patient_profile_id, professional_profile_id")
        .eq("id", appointment_id!)
        .maybeSingle();
      if (!appt) return json({ error: "Cita no encontrada", appointment_id }, 404);

      const [{ data: patient }, { data: professional }] = await Promise.all([
        supabase.from("patient_profiles").select("profile_id, full_name").eq("id", appt.patient_profile_id).maybeSingle(),
        supabase.from("professional_profiles").select("profile_id, full_name").eq("id", appt.professional_profile_id).maybeSingle(),
      ]);
      if (!patient || !professional) return json({ error: "Participantes no encontrados" }, 404);

      const [{ data: patientUser }, { data: proUser }] = await Promise.all([
        supabase.from("profiles").select("email, full_name").eq("id", patient.profile_id).maybeSingle(),
        supabase.from("profiles").select("email, full_name").eq("id", professional.profile_id).maybeSingle(),
      ]);

      const when = mxPretty(appt.scheduled_at);
      const patientName = patient.full_name || patientUser?.full_name || "tu paciente";
      const proName = professional.full_name || proUser?.full_name || "tu profesional";

      const emails = [
        {
          to: patientUser?.email,
          subject: "Tu cita fue cancelada",
          html: branded({
            title: "Tu cita fue cancelada",
            greeting: `Hola ${escapeHtml(firstName(patientName))},`,
            paragraphs: [
              `Tu sesión del <strong>${when}</strong> (hora del Centro de México) con <strong>${escapeHtml(proName)}</strong> fue cancelada.`,
              "Puedes agendar una nueva sesión en cualquier momento desde tu panel.",
            ],
            ctaText: "Ver mis citas",
            ctaUrl: `${APP_URL}/#/paciente/citas`,
          }),
        },
        {
          to: proUser?.email,
          subject: "Una cita fue cancelada",
          html: branded({
            title: "Una cita fue cancelada",
            greeting: `Hola ${escapeHtml(firstName(proName))},`,
            paragraphs: [
              `La sesión del <strong>${when}</strong> (hora del Centro de México) con <strong>${escapeHtml(patientName)}</strong> fue cancelada.`,
              "Revisa tu agenda para confirmar que el horario quedó libre.",
            ],
            ctaText: "Ver mi agenda",
            ctaUrl: `${APP_URL}/#/profesional/agenda`,
          }),
        },
      ];

      for (const e of emails) {
        if (e.to && (await sendResend(e.to, e.subject, e.html))) sent.push(e.to);
      }
      break;
    }

    case "verification_verified":
    case "verification_rejected": {
      const profile = await fetchProfile(profile_id!, 1);
      if (!profile || !profile.email) {
        return json({ error: "Perfil no encontrado", profile_id }, 404);
      }
      const name = escapeHtml(firstName(profile.full_name || "profesional"));
      const isVerified = type === "verification_verified";

      let reason: string | null = null;
      if (!isVerified) {
        const { data: proProfile } = await supabase
          .from("professional_profiles")
          .select("rejection_reason")
          .eq("profile_id", profile.id)
          .maybeSingle();
        reason = proProfile?.rejection_reason ?? null;
      }

      const subject = isVerified ? "¡Tu perfil fue verificado!" : "Tu verificación requiere cambios";
      const html = isVerified
        ? branded({
            title: "¡Tu perfil fue verificado!",
            greeting: `Hola ${name},`,
            paragraphs: [
              "Nuestro equipo revisó tus documentos y tu perfil ya está <strong>verificado</strong>: ahora eres visible en el directorio y los pacientes pueden agendar contigo.",
              "Te sugerimos publicar tu disponibilidad lo antes posible para empezar a recibir citas.",
            ],
            ctaText: "Configurar mi disponibilidad",
            ctaUrl: `${APP_URL}/#/profesional/disponibilidad`,
            note: "¡Bienvenido al directorio de SOMOS-CALMA!",
          })
        : branded({
            title: "Tu verificación requiere cambios",
            greeting: `Hola ${name},`,
            paragraphs: [
              "Revisamos tu expediente y no pudimos aprobar la verificación en este momento.",
              reason
                ? `<strong>Motivo:</strong> ${escapeHtml(reason)}`
                : "Revisa que tus documentos sean legibles y estén completos.",
              "Corrige lo indicado y vuelve a enviar tu expediente; te avisaremos por correo cuando esté aprobado.",
            ],
            ctaText: "Revisar mi expediente",
            ctaUrl: `${APP_URL}/#/profesional/verificacion`,
          });
      if (await sendResend(profile.email, subject, html)) sent.push(profile.email);
      break;
    }

    default:
      return json({ error: `Tipo de correo no soportado: ${type}` }, 400);
  }

  return json({ ok: true, type, sent: sent.length, skipped: sent.length === 0 });
});
