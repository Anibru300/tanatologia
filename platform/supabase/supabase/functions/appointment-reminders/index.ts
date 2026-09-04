import { createClient } from "jsr:@supabase/supabase-js@^2";

// appointment-reminders — envía recordatorios de cita (24h y 15min antes) por email
// (Resend) e inserta notificación in-app ("alarma") para paciente y profesional.
// Invocada por pg_cron cada 10 minutos con el header x-cron-secret.
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

function mxDateParts(utcIso: string) {
  const d = new Date(new Date(utcIso).getTime() + MX_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    ymd: `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`,
    hm: `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`,
    pretty: `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} h`,
    weekday: new Intl.DateTimeFormat("es-MX", { weekday: "long", timeZone: "UTC" }).format(d),
  };
}

function googleCalendarUrl(opts: { title: string; startUtc: string; durationMin: number; details: string }) {
  const s = mxDateParts(opts.startUtc);
  const end = new Date(new Date(opts.startUtc).getTime() + opts.durationMin * 60 * 1000);
  const e = mxDateParts(end.toISOString());
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${s.ymd}T${s.hm}00/${e.ymd}T${e.hm}00`,
    details: opts.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function reminderEmail(opts: {
  recipientName: string;
  otherName: string;
  whenPretty: string;
  weekday: string;
  urgency: "24h" | "15m";
  link: string;
  calendarUrl: string;
  role: "patient" | "professional";
}) {
  const is15 = opts.urgency === "15m";
  const subject = is15
    ? `Tu sesión comienza en 15 minutos — ${opts.weekday} ${opts.whenPretty}`
    : `Recordatorio: tu sesión es mañana — ${opts.weekday} ${opts.whenPretty}`;
  const cta = is15 ? "Entrar a la videollamada" : "Ver mi cita";
  const lead = is15
    ? "Tu sesión de SOMOS-CALMA comienza en <strong>15 minutos</strong>."
    : "Te recordamos que tienes una sesión de SOMOS-CALMA en <strong>24 horas</strong>.";
  const tip = is15
    ? "<p style='margin:0 0 16px;font-size:13px;color:#5b6779'>Entra unos minutos antes para revisar tu cámara y micrófono.</p>"
    : "";

  return {
    subject,
    html: `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="background:#046e6b;color:#ffffff;padding:20px 24px;border-radius:12px 12px 0 0">
<span style="font-size:18px;font-weight:bold;letter-spacing:.5px">SOMOS-CALMA</span>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 24px;border:1px solid #e3e8ee;border-top:none">
<p style="margin:0 0 12px;font-size:15px;color:#26303d">Hola, ${opts.recipientName}:</p>
<p style="margin:0 0 16px;font-size:15px;color:#26303d">${lead}</p>
<p style="margin:0 0 4px;font-size:14px;color:#26303d"><strong>${opts.weekday} ${opts.whenPretty}</strong> (hora del Centro de México)</p>
<p style="margin:0 0 16px;font-size:14px;color:#5b6779">${opts.role === "patient" ? "Con" : "Con tu paciente"}: <strong>${opts.otherName}</strong></p>
${tip}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr>
<td style="background:#046e6b;border-radius:8px"><a href="${opts.link}" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold">${cta}</a></td>
<td style="padding-left:12px"><a href="${opts.calendarUrl}" style="display:inline-block;padding:11px 16px;border:1px solid #046e6b;border-radius:8px;color:#046e6b;text-decoration:none;font-size:13px">Agregar a Google Calendar</a></td>
</tr></table>
<p style="margin:0;font-size:12px;color:#8a94a6">Si el botón no funciona, copia este enlace: ${opts.link}</p>
</td></tr>
<tr><td style="padding:14px 24px;font-size:11px;color:#8a94a6">
SOMOS-CALMA · Acompañamiento emocional y tanatología en México ·
<a href="https://somos-calma.com" style="color:#046e6b">somos-calma.com</a>
</td></tr>
</table></td></tr></table></body></html>`,
  };
}

async function sendResend(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [to], subject, html }),
  });
  return res.ok;
}

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

  const now = new Date();
  const stats = { sent_24h: 0, sent_15m: 0, notifications: 0, failed: 0 };

  // Ventanas: la función corre cada 10 min. 15m: próximos 25 min (cubre un ciclo perdido).
  // 24h: entre 30 min y 25 h (evita duplicar si corre tarde).
  const windows = [
    {
      key: "24h" as const,
      flag: "reminder_24h_sent",
      from: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      to: new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString(),
    },
    {
      key: "15m" as const,
      flag: "reminder_15m_sent",
      from: now.toISOString(),
      to: new Date(now.getTime() + 25 * 60 * 1000).toISOString(),
    },
  ];

  for (const win of windows) {
    const { data: due, error: dueError } = await supabase
      .from("appointments")
      .select("id, scheduled_at, duration_minutes, patient_profile_id, professional_profile_id")
      .in("status", ["pending", "confirmed"])
      .eq(win.flag, false)
      .gt("scheduled_at", win.from)
      .lte("scheduled_at", win.to);

    if (dueError) {
      console.error("query due appointments", dueError);
      stats.failed += 1;
      continue;
    }

    for (const appt of due ?? []) {
      // Claim atómico: solo un run marca la bandera
      const { data: claimed, error: claimError } = await supabase
        .from("appointments")
        .update({ [win.flag]: true })
        .eq("id", appt.id)
        .eq(win.flag, false)
        .select("id");

      if (claimError || !claimed || claimed.length === 0) continue;

      const { data: patient } = await supabase
        .from("patient_profiles")
        .select("profile_id, full_name")
        .eq("id", appt.patient_profile_id)
        .single();
      const { data: professional } = await supabase
        .from("professional_profiles")
        .select("profile_id, full_name")
        .eq("id", appt.professional_profile_id)
        .single();

      if (!patient || !professional) continue;

      const [{ data: patientUser }, { data: proUser }] = await Promise.all([
        supabase.from("profiles").select("email, full_name").eq("id", patient.profile_id).single(),
        supabase.from("profiles").select("email, full_name").eq("id", professional.profile_id).single(),
      ]);

      const patientName = patient.full_name || patientUser?.full_name || "paciente";
      const proName = professional.full_name || proUser?.full_name || "tu profesional";
      const when = mxDateParts(appt.scheduled_at);
      const calendarUrl = googleCalendarUrl({
        title: `Sesión SOMOS-CALMA — ${patientName} / ${proName}`,
        startUtc: appt.scheduled_at,
        durationMin: appt.duration_minutes ?? 50,
        details: `Sesión de acompañamiento por videollamada. Entra desde ${APP_URL}`,
      });

      const roomPath = `/#/sala/${appt.id}`;
      const emails = [
        {
          to: patientUser?.email,
          role: "patient" as const,
          name: patientName.split(" ")[0],
          other: proName,
          link: `${APP_URL}${win.key === "15m" ? roomPath : "/#/paciente/citas"}`,
        },
        {
          to: proUser?.email,
          role: "professional" as const,
          name: proName.split(" ")[0],
          other: patientName,
          link: `${APP_URL}${win.key === "15m" ? roomPath : "/#/profesional/citas"}`,
        },
      ];

      let emailsSent = 0;
      for (const e of emails) {
        if (!e.to) continue;
        const { subject, html } = reminderEmail({
          recipientName: e.name,
          otherName: e.other,
          whenPretty: when.pretty,
          weekday: when.weekday,
          urgency: win.key,
          link: e.link,
          calendarUrl,
          role: e.role,
        });
        const ok = await sendResend(e.to, subject, html);
        if (ok) {
          emailsSent += 1;
          stats[win.key === "24h" ? "sent_24h" : "sent_15m"] += 1;
        } else {
          console.error(`email falló para cita ${appt.id} (${e.role})`);
        }
      }

      // Notificación in-app ("alarma") para ambos, aunque algún email falle.
      const title = win.key === "15m" ? "Tu sesión comienza en 15 minutos" : "Recordatorio: tu sesión es mañana";
      const body = `${when.weekday} ${when.pretty} — ${win.key === "15m" ? "entra a la sala ahora." : "te esperamos."}`;
      const patientLink = win.key === "15m" ? `/paciente/sala/${appt.id}` : "/paciente/citas";
      const proLink = win.key === "15m" ? `/profesional/sala/${appt.id}` : "/profesional/citas";
      const { error: notifError } = await supabase.from("notifications").insert([
        { profile_id: patient.profile_id, type: "appointment_reminder", title, body, link: patientLink },
        { profile_id: professional.profile_id, type: "appointment_reminder", title, body, link: proLink },
      ]);
      if (!notifError) stats.notifications += 2;

      // Si ningún email se envió (ej. Resend caído), liberamos la bandera para reintento.
      if (emailsSent === 0) {
        await supabase.from("appointments").update({ [win.flag]: false }).eq("id", appt.id);
      }
    }
  }

  return json({ ok: true, ...stats });
});
