import { createClient } from "jsr:@supabase/supabase-js@^2";

// support-request — un usuario autenticado (paciente o profesional) envía una
// solicitud de soporte/contacto desde su portal. Se inserta DIRECTAMENTE en
// public.email_inbox (service role) como mensaje entrante con from_email del
// usuario, para que el admin la vea en /admin/soporte y /admin/bandeja y la
// responda desde ahí (inbox-reply contesta al remitente). Se notifica in-app
// a los administradores (type: inbox_email) y se confirma al usuario
// (type: support_request).
// verify_jwt=false en el gateway; JWT validado aquí. Rate-limit por IP.
//
// Secrets requeridos: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.

const CONTACT_INBOX = Deno.env.get("CONTACT_INBOX") || "hola@somos-calma.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
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

  const roleLabel = ROLE_LABEL[profile.role] ?? profile.role;
  const nombre = profile.full_name || "(sin nombre)";
  const emailUsuario = profile.email || user.email || "";
  if (!EMAIL_REGEX.test(emailUsuario)) {
    return json({ error: "Tu cuenta no tiene un correo válido para responderte" }, 422);
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Insertar directamente en la bandeja como mensaje ENTRANTE del usuario.
  // message_id generado: al responder, inbox-reply registra la salida con el
  // id real de Resend y el hilo enlaza correctamente si el usuario contesta.
  const fullSubject = `[Soporte ${roleLabel}] ${subject}`;
  const { data: inserted, error: insertError } = await service
    .from("email_inbox")
    .insert({
      direction: "in",
      from_email: emailUsuario,
      from_name: nombre,
      to_email: CONTACT_INBOX,
      subject: fullSubject,
      text_body: message,
      message_id: `support-${crypto.randomUUID()}@somos-calma.com`,
      is_read: false,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("No se pudo registrar la solicitud en la bandeja:", insertError);
    return json({ error: "No se pudo enviar tu mensaje. Inténtalo de nuevo." }, 502);
  }

  // Avisar in-app a los administradores (mismo type que usa inbound-email).
  const { data: admins } = await service.from("profiles").select("id").eq("role", "admin");
  if (admins && admins.length > 0) {
    await service.from("notifications").insert(
      admins.map((a) => ({
        profile_id: a.id,
        type: "inbox_email",
        title: `Soporte ${roleLabel}: ${subject}`,
        body: `${nombre} (${emailUsuario}) envió una solicitud de ayuda.`,
        link: "/admin/soporte",
      })),
    );
  }

  // Confirmación in-app al usuario (el `service` de más arriba ya usa service role:
  // RLS no permite INSERT a authenticated; el dueño de la notificación es el usuario).
  const link = profile.role === "professional" ? "/profesional/ayuda" : "/paciente/ayuda";
  await service.from("notifications").insert({
    profile_id: profile.id,
    type: "support_request",
    title: "Recibimos tu mensaje",
    body: `Te responderemos pronto: ${subject}`,
    link,
  });

  return json({ ok: true });
});
