import { createClient } from "jsr:@supabase/supabase-js@^2";

// availability-notify — función INTERNA: envía los correos "ya puedes agendar"
// a quienes dejaron su correo en "Avísame cuando abra agenda" cuando el
// profesional publica su primera disponibilidad. La invoca el trigger
// availability_slots_notify_alerts (039) vía pg_net con el header
// x-cron-secret. Best-effort: marca notified_at SOLO si el correo se envió;
// los fallidos quedan pendientes y se reintentan en la siguiente publicación.
//
// Secrets requeridos: CRON_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL (opcional).

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";
const APP_URL = "https://somos-calma.com/app";

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

// Plantilla de marca (misma línea visual que user-emails / emailTemplate.ts).
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

// Comparación en tiempo constante (auditoría 2026-10-20, M2).
function cronSecretValid(header: string | null): boolean {
  if (!CRON_SECRET || !header || header.length !== CRON_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) diff |= header.charCodeAt(i) ^ CRON_SECRET.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!cronSecretValid(req.headers.get("x-cron-secret"))) {
    return json({ error: "No autorizado" }, 401);
  }
  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  let body: { professional_profile_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const professionalProfileId = String(body.professional_profile_id ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(professionalProfileId)) {
    return json({ error: "professional_profile_id inválido" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [{ data: professional }, { data: alerts }] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("id, full_name, specialties, profiles!professional_profiles_profile_id_fkey(full_name)")
      .eq("id", professionalProfileId)
      .maybeSingle(),
    supabase
      .from("availability_alerts")
      .select("id, email")
      .eq("professional_profile_id", professionalProfileId)
      .is("notified_at", null)
      .limit(100),
  ]);

  if (!professional) {
    return json({ error: "Profesional no encontrado", professional_profile_id: professionalProfileId }, 404);
  }

  const profile = Array.isArray(professional.profiles) ? professional.profiles[0] : professional.profiles;
  const proName = professional.full_name || profile?.full_name || "tu profesional";
  const firstName = proName.trim().split(/\s+/)[0] || proName;
  const specialties = (professional.specialties ?? []).slice(0, 2).join(" · ");

  const subject = `${firstName} abrió su agenda en SOMOS CALMA`;
  const html = branded({
    title: "Ya puedes agendar tu sesión",
    greeting: "Hola,",
    paragraphs: [
      `Nos alegra avisarte que <strong>${escapeHtml(proName)}</strong> acaba de publicar su disponibilidad${specialties ? ` (${escapeHtml(specialties)})` : ""} en SOMOS CALMA.`,
      "Las sesiones son de 60 minutos por videollamada dentro de la plataforma. Entra ahora y elige el horario que mejor te convenga:",
    ],
    ctaText: "Agendar mi sesión",
    ctaUrl: `${APP_URL}/#/paciente/terapeutas`,
    note: "Si aún no tienes cuenta, créala gratis en somos-calma.com y te llevará directo a tu espacio. Recibiste este correo porque dejaste tu correo para que te avisáramos cuando este profesional abriera su agenda.",
  });

  let sent = 0;
  let failed = 0;
  for (const alert of alerts ?? []) {
    if (await sendResend(alert.email, subject, html)) {
      const { error: updateError } = await supabase
        .from("availability_alerts")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", alert.id);
      if (updateError) {
        console.error(`availability-notify marcar notified_at (${alert.id}):`, updateError);
      }
      sent += 1;
    } else {
      failed += 1;
    }
    // Pausa breve: evita ráfagas contra la API de Resend.
    await new Promise((r) => setTimeout(r, 150));
  }

  return json({ ok: true, professional_profile_id: professionalProfileId, pending: (alerts ?? []).length, sent, failed });
});
