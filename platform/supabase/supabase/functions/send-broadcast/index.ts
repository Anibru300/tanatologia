import { createClient } from "jsr:@supabase/supabase-js@^2";

// send-broadcast — envía un comunicado (newsletter) a una audiencia de usuarios.
// Solo administradores. Dos modos:
//   1) { broadcast_id }              -> envío real según la fila en email_broadcasts.
//   2) { dry_run: true, to, subject, body_text } -> copia de prueba a UNA dirección
//      (el botón "Enviarme una prueba" de la UI admin).
// Envío por lotes con la batch API de Resend (máx. 100 por request).
//
// Secrets requeridos: RESEND_API_KEY, RESEND_FROM_EMAIL (opcional).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BATCH_SIZE = 100;

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

// Misma plantilla de marca que user-emails (colores de src/lib/emailTemplate.ts).
function broadcastHtml(subject: string, bodyText: string): string {
  const bodyHtml = escapeHtml(bodyText)
    .split(/\n{2,}/)
    .map((block) =>
      `<p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">${block.replace(/\n/g, "<br>")}</p>`
    )
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
            <h1 style="margin:0 0 16px;color:#4C5845;font-size:24px;font-weight:bold;">${escapeHtml(subject)}</h1>
            ${bodyHtml}
            <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.5;">
              Recibiste este correo por formar parte de la beta de SOMOS-CALMA.
              Si no deseas recibir más comunicados, responde a este mensaje indicándolo.
            </p>
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

async function sendBatch(
  items: { to: string; subject: string; html: string }[],
): Promise<{ ok: boolean }[]> {
  // Envío individual secuencial: el endpoint /emails/batch de Resend fue rechazado
  // en producción (2026-09-06) mientras el envío simple funciona (lo usan send-email,
  // user-emails, contact-form). Se respeta el rate limit con pausa entre envíos.
  const results: { ok: boolean }[] = [];
  for (const e of items) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: RESEND_FROM_EMAIL, to: [e.to], subject: e.subject, html: e.html }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Resend rechazó:", e.to, res.status, text);
      results.push({ ok: false });
    } else {
      const data = await res.json();
      results.push({ ok: Boolean(data?.id) });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  // verify_jwt está desactivado en el gateway; la autenticación se hace aquí.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "No autenticado" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return json({ error: "No autenticado" }, 401);
  }

  // Verificar rol desde la tabla profiles (no confiar en user_metadata).
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    return json({ error: "Solo administradores pueden enviar comunicados" }, 403);
  }

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  let body: {
    broadcast_id?: string;
    dry_run?: boolean;
    to?: string;
    subject?: string;
    body_text?: string;
    /** Filtro opcional (solo admin): restringe el envío a estas direcciones. */
    only_emails?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  // ---------------------------------------------------------------------------
  // Modo prueba: una sola copia al correo indicado (normalmente el del admin).
  // ---------------------------------------------------------------------------
  if (body.dry_run) {
    const { to, subject, body_text: bodyText } = body;
    if (!to || !subject || !bodyText) {
      return json({ error: "Faltan campos obligatorios (to, subject, body_text)" }, 400);
    }
    if (!EMAIL_REGEX.test(to)) {
      return json({ error: "Destinatario inválido" }, 400);
    }
    const results = await sendBatch([{ to, subject, html: broadcastHtml(subject, bodyText) }]);
    if (!results[0]?.ok) {
      return json({ error: "Resend rechazó el envío" }, 502);
    }
    return json({ ok: true, dry_run: true, to });
  }

  // ---------------------------------------------------------------------------
  // Envío real de un broadcast registrado.
  // ---------------------------------------------------------------------------
  const { broadcast_id: broadcastId } = body;
  if (!broadcastId) {
    return json({ error: "Falta broadcast_id" }, 400);
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: broadcast, error: broadcastError } = await adminClient
    .from("email_broadcasts")
    .select("id, audience, subject, body_text, status")
    .eq("id", broadcastId)
    .maybeSingle();

  if (broadcastError || !broadcast) {
    return json({ error: "Comunicado no encontrado" }, 404);
  }
  if (broadcast.status === "sent") {
    return json({ error: "Este comunicado ya fue enviado" }, 409);
  }

  // Audiencia: clientes de la plataforma (pacientes y/o profesionales).
  // Se excluyen roles internos (admin/support).
  let query = adminClient
    .from("profiles")
    .select("email")
    .in("role", ["patient", "professional"])
    .eq("is_active", true);

  if (broadcast.audience === "patients") {
    query = adminClient
      .from("profiles")
      .select("email")
      .eq("role", "patient")
      .eq("is_active", true);
  } else if (broadcast.audience === "professionals") {
    query = adminClient
      .from("profiles")
      .select("email")
      .eq("role", "professional")
      .eq("is_active", true);
  }

  const { data: recipients, error: recipientsError } = await query;
  if (recipientsError) {
    return json({ error: "No se pudo resolver la audiencia" }, 500);
  }

  const emails = [
    ...new Set(
      (recipients ?? [])
        .map((r: { email: string }) => r.email)
        .filter((e: string) => typeof e === "string" && EMAIL_REGEX.test(e)),
    ),
  ];

  // Filtro opcional del administrador (p. ej. envío de prueba controlado).
  const finalEmails = Array.isArray(body.only_emails) && body.only_emails.length > 0
    ? emails.filter((e) => body.only_emails!.includes(e))
    : emails;

  if (finalEmails.length === 0) {
    await adminClient
      .from("email_broadcasts")
      .update({ status: "failed", recipient_count: 0 })
      .eq("id", broadcast.id);
    return json({ error: "La audiencia no tiene destinatarios" }, 422);
  }

  const html = broadcastHtml(broadcast.subject, broadcast.body_text);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < finalEmails.length; i += BATCH_SIZE) {
    const chunk = finalEmails.slice(i, i + BATCH_SIZE).map((to) => ({
      to,
      subject: broadcast.subject,
      html,
    }));
    const results = await sendBatch(chunk);
    for (const r of results) {
      if (r.ok) sent += 1;
      else failed += 1;
    }
  }

  const status = sent > 0 ? "sent" : "failed";
  await adminClient
    .from("email_broadcasts")
    .update({
      status,
      recipient_count: finalEmails.length,
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", broadcast.id);

  return json({ ok: status === "sent", broadcast_id: broadcast.id, recipients: finalEmails.length, sent, failed });
});
