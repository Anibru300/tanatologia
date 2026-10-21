import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@^2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 5;
const MAX_SUBJECT_LENGTH = 200;
const MAX_HTML_LENGTH = 200_000;

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

  let body: { to?: unknown; subject?: unknown; html?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const { to, subject, html, type } = body;

  if (!to || !subject || !html) {
    return json({ error: "Faltan campos obligatorios" }, 400);
  }

  const recipients = Array.isArray(to) ? to : [to];
  if (
    recipients.length === 0 ||
    recipients.length > MAX_RECIPIENTS ||
    recipients.some((r: unknown) => typeof r !== "string" || !EMAIL_REGEX.test(r))
  ) {
    return json({ error: "Destinatario(s) inválido(s)" }, 400);
  }
  if (typeof subject !== "string" || subject.length === 0 || subject.length > MAX_SUBJECT_LENGTH) {
    return json({ error: "Asunto inválido" }, 400);
  }
  if (typeof html !== "string" || html.length === 0 || html.length > MAX_HTML_LENGTH) {
    return json({ error: "Contenido inválido" }, 400);
  }

  // Pacientes solo pueden enviarse correos a sí mismos.
  if (profile.role === "patient") {
    if (recipients.length > 1 || recipients[0] !== user.email) {
      return json({ error: "Solo puedes enviarte correos a tu propia dirección" }, 403);
    }
  } else if (profile.role === "professional") {
    // Hardening (auditoría 2026-10-20, A2): el profesional solo puede escribir a
    // PACIENTES con quienes tiene al menos una cita NO cancelada. Evita que la
    // función sea un relay abierto de spam/phishing desde el dominio verificado.
    const { data: prof } = await supabase
      .from("professional_profiles")
      .select("id")
      .eq("profile_id", user.id)
      .single();
    if (!prof) {
      return json({ error: "No autorizado" }, 403);
    }
    const { data: allowed, error: allowedError } = await supabase
      .from("appointments")
      .select("patient_profiles!inner(profiles!inner(email))")
      .eq("professional_profile_id", prof.id)
      .neq("status", "cancelled");
    if (allowedError) {
      return json({ error: "No se pudo verificar destinatarios" }, 500);
    }
    const allowedEmails = new Set(
      (allowed ?? [])
        .map((a) => {
          const nested = (a as { patient_profiles?: { profiles?: { email?: string } | { email?: string }[] } })
            .patient_profiles;
          const profRow = Array.isArray(nested) ? nested[0] : nested;
          const emails = profRow?.profiles;
          const emailRow = Array.isArray(emails) ? emails[0] : emails;
          return emailRow?.email;
        })
        .filter((e): e is string => typeof e === "string"),
    );
    if (recipients.some((r) => !allowedEmails.has(r.toLowerCase()))) {
      return json({ error: "Solo puedes escribir a tus pacientes con cita activa" }, 403);
    }
  } else if (profile.role !== "admin" && profile.role !== "support") {
    return json({ error: "No autorizado" }, 403);
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY no está configurada");
    return json({ error: "No se pudo enviar el correo" }, 500);
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

  if (!res.ok) {
    console.error("Resend rechazó el envío:", res.status, await res.text());
    return json({ error: "No se pudo enviar el correo" }, 502);
  }

  const data = await res.json();
  return json({ success: true, id: data.id, type });
});
