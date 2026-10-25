import { createClient } from "jsr:@supabase/supabase-js@^2";

// inbox-reply — Responde un correo de la bandeja desde el panel admin.
// Solo administradores (validación JWT interna, mismo patrón que send-broadcast).
//
// Envía vía Resend con headers In-Reply-To / References tomados del mensaje
// original para que la conversación conserve el hilo en los clientes de
// correo (Gmail, Outlook...). Registra la salida en public.email_inbox
// (direction='out', mismo thread_root_id) y marca el mensaje original como leído.
//
// Secrets requeridos: RESEND_API_KEY, RESEND_FROM_EMAIL (opcional),
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Misma plantilla de marca que send-broadcast (colores de src/lib/emailTemplate.ts),
// con firma del equipo al final.
function replyHtml(bodyText: string): string {
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
            ${bodyHtml}
            <p style="margin:24px 0 0;color:#999;font-size:13px;line-height:1.5;">
              Con cariño,<br><strong style="color:#4C5845;">Equipo SOMOS-CALMA</strong><br>
              Acompañamiento emocional y tanatología ·
              <a href="https://somos-calma.com" style="color:#8BAE7A;text-decoration:none;">somos-calma.com</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#F7F5F0;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">
              Este es un correo personalizado de respuesta a tu mensaje.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim()}`;
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    return json({ error: "Solo administradores pueden responder correos" }, 403);
  }

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  let body: { inbox_id?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const { inbox_id: inboxId, text } = body;
  if (!inboxId || !text || !text.trim()) {
    return json({ error: "Faltan campos obligatorios (inbox_id, text)" }, 400);
  }
  if (text.length > 10000) {
    return json({ error: "La respuesta es demasiado larga (máx. 10000 caracteres)" }, 400);
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: original, error: origError } = await adminClient
    .from("email_inbox")
    .select("id, direction, from_email, from_name, subject, message_id, refs, thread_root_id")
    .eq("id", inboxId)
    .maybeSingle();

  if (origError || !original) {
    return json({ error: "Mensaje no encontrado" }, 404);
  }
  if (!EMAIL_REGEX.test(original.from_email)) {
    return json({ error: "El remitente original no tiene un correo válido" }, 422);
  }

  // Threading: References acumulado + In-Reply-To al mensaje al que se responde.
  const refsChain = [
    ...(Array.isArray(original.refs) ? original.refs : []),
    ...(original.message_id ? [original.message_id] : []),
  ].filter((v): v is string => typeof v === "string" && v.length > 0);

  const subject = replySubject(original.subject || "(sin asunto)");
  const textBody = text.trim();

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [original.from_email],
      subject,
      html: replyHtml(textBody),
      text: `${textBody}\n\n— Equipo SOMOS-CALMA · https://somos-calma.com`,
      reply_to: "hola@somos-calma.com",
      headers: {
        ...(original.message_id ? { "In-Reply-To": `<${original.message_id}>` } : {}),
        ...(refsChain.length > 0 ? { References: refsChain.map((r) => `<${r}>`).join(" ") } : {}),
      },
    }),
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text();
    console.error("Resend rechazó la respuesta:", resendRes.status, detail);
    return json({ error: "No se pudo enviar la respuesta" }, 502);
  }
  // Id de Resend del correo enviado: al guardarlo como message_id de la salida,
  // la respuesta del destinatario enlaza a este hilo (inbound-email matchea
  // in-reply-to/references contra message_id existentes).
  const resendData = await resendRes.json().catch(() => ({} as { id?: string }));

  // Registrar la salida y marcar leído el mensaje al que se respondió.
  const { data: inserted, error: insertError } = await adminClient
    .from("email_inbox")
    .insert({
      direction: "out",
      from_email: "hola@somos-calma.com",
      from_name: "SOMOS-CALMA",
      to_email: original.from_email,
      subject,
      text_body: textBody,
      message_id: resendData.id || null,
      in_reply_to: original.message_id,
      refs: refsChain,
      thread_root_id: original.thread_root_id ?? original.id,
      is_read: true,
    })
    .select("id")
    .single();

  if (insertError) {
    // El correo ya salió: se reporta el éxito del envío con advertencia.
    console.error("No se pudo registrar la respuesta en email_inbox:", insertError);
    return json({ ok: true, warning: "Enviado pero no se registró en la bandeja", inbox_id: null });
  }

  await adminClient
    .from("email_inbox")
    .update({ is_read: true })
    .eq("id", original.id);

  return json({ ok: true, inbox_id: inserted.id });
});
