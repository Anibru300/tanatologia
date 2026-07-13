import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  fetch: withSupabase({ auth: "required" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Requiere usuario autenticado (verify_jwt = true en config.toml).
    const { data: { user }, error: userError } = await ctx.supabase.auth.getUser();
    if (userError || !user) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar rol desde la tabla profiles (no confiar en user_metadata).
    const { data: profile, error: profileError } = await ctx.supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return Response.json({ error: "No se pudo verificar permisos" }, { status: 403 });
    }

    const { to, subject, html, type } = await req.json();

    if (!to || !subject || !html) {
      return Response.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length === 0 || recipients.some((r: unknown) => typeof r !== "string" || !EMAIL_REGEX.test(r))) {
      return Response.json({ error: "Destinatario(s) inválido(s)" }, { status: 400 });
    }

    // Pacientes solo pueden enviarse correos a sí mismos.
    // Admin/professional/support pueden notificar a terceros dentro de la plataforma.
    if (profile.role === 'patient') {
      if (recipients.length > 1 || recipients[0] !== user.email) {
        return Response.json({ error: "Solo puedes enviarte correos a tu propia dirección" }, { status: 403 });
      }
    } else if (!["admin", "professional", "support"].includes(profile.role)) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    if (!RESEND_API_KEY) {
      return Response.json({ error: "RESEND_API_KEY no está configurada" }, { status: 500 });
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
      return Response.json({ error: data }, { status: res.status });
    }

    return Response.json({ success: true, id: data.id, type });
  }),
};
