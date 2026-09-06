import { createClient } from "jsr:@supabase/supabase-js@^2";

// admin-contact — el administrador contacta directamente a un paciente o
// profesional desde su perfil. Envía correo con la plantilla de marca y deja
// una notificación in-app al destinatario (type: admin_message).
// Solo rol admin. verify_jwt=false en el gateway; JWT validado aquí.
//
// Secrets requeridos: RESEND_API_KEY, RESEND_FROM_EMAIL (opcional).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function branded(opts: { title: string; greeting: string; messageHtml: string }): string {
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
            <div style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;white-space:pre-wrap;">${opts.messageHtml}</div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F7F5F0;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">
              SOMOS-CALMA · Acompañamiento emocional y tanatología<br>
              <a href="https://somos-calma.com" style="color:#8BAE7A;text-decoration:none;">somos-calma.com</a>
              · <a href="mailto:hola@somos-calma.com" style="color:#8BAE7A;text-decoration:none;">hola@somos-calma.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No autenticado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "No autenticado" }, 401);

  // Rol admin estricto (desde profiles, no de user_metadata)
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!adminProfile || adminProfile.role !== "admin") {
    return json({ error: "Solo administradores pueden enviar este correo" }, 403);
  }

  let body: { profile_id?: string; subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const profileId = String(body.profile_id ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!profileId) return json({ error: "Falta el destinatario (profile_id)" }, 400);
  if (!subject || subject.length > 200) return json({ error: "Asunto inválido (máx. 200 caracteres)" }, 400);
  if (!message || message.length > 5000) return json({ error: "Mensaje inválido (máx. 5000 caracteres)" }, 400);

  // Cliente service role para leer el destinatario e insertar la notificación
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: target } = await service
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", profileId)
    .maybeSingle();
  if (!target || !target.email) {
    return json({ error: "Destinatario no encontrado" }, 404);
  }

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  const roleLabel = target.role === "professional" ? "profesional" : target.role === "patient" ? "paciente" : "usuario";
  const html = branded({
    title: subject,
    greeting: `Hola ${escapeHtml(firstName(target.full_name || "bienvenido/a"))},`,
    messageHtml: escapeHtml(message),
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [target.email],
      reply_to: "hola@somos-calma.com",
      subject: `[SOMOS-CALMA] ${subject}`,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend falló (admin-contact):", res.status, detail);
    return json({ error: "No se pudo enviar el correo. Inténtalo de nuevo." }, 502);
  }

  // Notificación in-app al destinatario (reutiliza el sistema de notificaciones)
  const link =
    target.role === "professional" ? "/profesional/ayuda" : target.role === "patient" ? "/paciente/ayuda" : "/";
  await service.from("notifications").insert({
    profile_id: target.id,
    type: "admin_message",
    title: "Mensaje del equipo SOMOS-CALMA",
    body: subject,
    link,
  });

  console.log(`admin-contact: correo a ${roleLabel} ${target.email} (${target.id})`);
  return json({ ok: true, sent_to: target.email });
});
