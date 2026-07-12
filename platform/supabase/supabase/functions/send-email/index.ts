// SOMOS-CALMA — Edge Function para enviar correos con Resend
//
// Variables de entorno requeridas en Supabase Dashboard > Edge Functions > Secrets:
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL  (opcional, por defecto onboarding@resend.dev)

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, _ctx) => {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Cuerpo de petición inválido" }, { status: 400 });
    }

    const { to, subject, html, type } = body;

    if (!to || !subject || !html) {
      return Response.json(
        { error: "Faltan campos obligatorios: to, subject, html" },
        { status: 400 }
      );
    }

    if (!RESEND_API_KEY) {
      return Response.json(
        { error: "RESEND_API_KEY no está configurada" },
        { status: 500 }
      );
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: Array.isArray(to) ? to : [to],
          subject,
          html,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return Response.json(
          { error: data },
          { status: res.status }
        );
      }

      return Response.json({ success: true, id: data.id, type });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Error desconocido" },
        { status: 500 }
      );
    }
  }),
};
