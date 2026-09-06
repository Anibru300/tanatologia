import { createClient } from "jsr:@supabase/supabase-js@^2";

// support-request — un usuario autenticado (paciente o profesional) envía una
// solicitud de soporte/contacto desde su portal. Llega al inbox de soporte
// (CONTACT_INBOX) con reply_to del usuario, e inserta una notificación in-app
// de confirmación (type: support_request).
// verify_jwt=false en el gateway; JWT validado aquí. Rate-limit por IP.
//
// Secrets requeridos: RESEND_API_KEY, RESEND_FROM_EMAIL (opcional), CONTACT_INBOX.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";
const CONTACT_INBOX = Deno.env.get("CONTACT_INBOX") || "hola@somos-calma.com";

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

// Rate-limit en memoria por IP (3 por minuto; las cuentas son autenticadas,
// esto solo frena ráfagas accidentales o cuentas comprometidas).
const rateLimits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateLimits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  rateLimits.set(ip, hits);
  if (rateLimits.size > 10_000) {
    for (const [key, times] of rateLimits) {
      if (times.every((t) => now - t > WINDOW_MS)) rateLimits.delete(key);
    }
  }
  return hits.length > MAX_REQUESTS;
}

const ROLE_LABEL: Record<string, string> = {
  patient: "Paciente",
  professional: "Profesional",
  admin: "Administrador",
  support: "Soporte",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return json({ error: "Demasiados mensajes. Espera un minuto e inténtalo de nuevo." }, 429);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No autenticado" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "No autenticado" }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();
  if (!profile) return json({ error: "No se pudo verificar tu cuenta" }, 403);

  let body: { subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!subject || subject.length > 150) return json({ error: "Asunto inválido (máx. 150 caracteres)" }, 400);
  if (!message || message.length > 3000) return json({ error: "Mensaje inválido (máx. 3000 caracteres)" }, 400);

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  const roleLabel = ROLE_LABEL[profile.role] ?? profile.role;
  const fecha = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  const nombre = profile.full_name || "(sin nombre)";
  const emailUsuario = profile.email || user.email || "(sin correo)";

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#F7F5F0;font-family:sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;">
    <tr><td style="background:#5F6F55;color:#FFFFFF;padding:20px 24px;font-size:18px;font-weight:bold;">Solicitud de soporte — ${escapeHtml(roleLabel)}</td></tr>
    <tr><td style="padding:24px;">
      <table style="font-size:14px;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;color:#777;">Nombre:</td><td style="padding:4px 0;">${escapeHtml(nombre)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#777;">Correo:</td><td style="padding:4px 0;">${escapeHtml(emailUsuario)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#777;">Rol:</td><td style="padding:4px 0;">${escapeHtml(roleLabel)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#777;">Fecha (CDMX):</td><td style="padding:4px 0;">${escapeHtml(fecha)}</td></tr>
      </table>
      <p style="margin:16px 0 4px;font-weight:bold;font-size:14px;">Asunto: ${escapeHtml(subject)}</p>
      <div style="white-space:pre-wrap;background:#F7F5F2;padding:12px;border-radius:8px;font-size:14px;color:#444;">${escapeHtml(message)}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#999;">Responder a este correo contesta directamente al usuario (Reply-To configurado).</p>
    </td></tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [CONTACT_INBOX],
      reply_to: emailUsuario,
      subject: `[Soporte ${roleLabel}] ${subject}`,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend falló (support-request):", res.status, detail);
    return json({ error: "No se pudo enviar tu mensaje. Inténtalo de nuevo." }, 502);
  }

  // Confirmación in-app al usuario (service role: RLS no permite INSERT
  // a authenticated; el dueño de la notificación sigue siendo el usuario)
  const link = profile.role === "professional" ? "/profesional/ayuda" : "/paciente/ayuda";
  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await service.from("notifications").insert({
    profile_id: profile.id,
    type: "support_request",
    title: "Recibimos tu mensaje",
    body: `Te responderemos pronto: ${subject}`,
    link,
  });

  return json({ ok: true });
});
