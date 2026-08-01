import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@^2";

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

Deno.serve(async (req) => {
  // Preflight CORS del navegador
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

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

  if (profileError || !profile) {
    return json({ error: "No se pudo verificar permisos" }, 403);
  }

  const { to, subject, html, type } = await req.json();

  if (!to || !subject || !html) {
    return json({ error: "Faltan campos obligatorios" }, 400);
  }

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0 || recipients.some((r: unknown) => typeof r !== "string" || !EMAIL_REGEX.test(r))) {
    return json({ error: "Destinatario(s) inválido(s)" }, 400);
  }

  // Pacientes solo pueden enviarse correos a sí mismos.
  // Admin/professional/support pueden notificar a terceros dentro de la plataforma.
  if (profile.role === "patient") {
    if (recipients.length > 1 || recipients[0] !== user.email) {
      return json({ error: "Solo puedes enviarte correos a tu propia dirección" }, 403);
    }
  } else if (!["admin", "professional", "support"].includes(profile.role)) {
    return json({ error: "No autorizado" }, 403);
  }

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: recipients,
      subject,
      html,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return json({ error: data }, res.status);
  }

  return json({ success: true, id: data.id, type });
});
