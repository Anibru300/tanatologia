import { createClient } from "jsr:@supabase/supabase-js@^2";

// send-notification-broadcast — envía una notificación IN-APP a una audiencia
// de usuarios (pacientes y/o profesionales). Solo administradores.
// Mismo patrón que send-broadcast (correos), pero inserta en la tabla
// `notifications` con service role (la RLS de notifications no acepta inserts
// de cliente). Las notificaciones llegan en vivo por Realtime a la campana.
//
// Dos modos:
//   1) { broadcast_id } -> envío real según la fila en notification_broadcasts.
//   2) { dry_run: true, title, body, link? } -> notificación de prueba SOLO para
//      el admin autenticado (botón "Enviarme una prueba" de la UI admin).
//
// Filtro opcional (solo admin): only_emails restringe el envío real a esas
// direcciones (útil para pruebas controladas). Mismo contrato que send-broadcast.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INSERT_BATCH = 500;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
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
    return json({ error: "Solo administradores pueden enviar notificaciones masivas" }, 403);
  }

  let body: {
    broadcast_id?: string;
    dry_run?: boolean;
    title?: string;
    body?: string;
    link?: string | null;
    /** Filtro opcional (solo admin): restringe el envío a estas direcciones. */
    only_emails?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---------------------------------------------------------------------------
  // Modo prueba: una sola notificación para el propio admin.
  // ---------------------------------------------------------------------------
  if (body.dry_run) {
    const { title, body: text, link } = body;
    if (!title || !text) {
      return json({ error: "Faltan campos obligatorios (title, body)" }, 400);
    }
    const { error: insertError } = await adminClient.from("notifications").insert({
      profile_id: user.id,
      type: "admin_broadcast",
      title,
      body: text,
      link: link || null,
    });
    if (insertError) {
      console.error("dry_run insert:", insertError);
      return json({ error: "No se pudo crear la notificación de prueba" }, 502);
    }
    return json({ ok: true, dry_run: true, to: user.id });
  }

  // ---------------------------------------------------------------------------
  // Envío real de un broadcast registrado.
  // ---------------------------------------------------------------------------
  const { broadcast_id: broadcastId } = body;
  if (!broadcastId) {
    return json({ error: "Falta broadcast_id" }, 400);
  }

  const { data: broadcast, error: broadcastError } = await adminClient
    .from("notification_broadcasts")
    .select("id, audience, title, body, link, status")
    .eq("id", broadcastId)
    .maybeSingle();

  if (broadcastError || !broadcast) {
    return json({ error: "Notificación masiva no encontrada" }, 404);
  }
  if (broadcast.status === "sent") {
    return json({ error: "Esta notificación ya fue enviada" }, 409);
  }

  // Audiencia: clientes de la plataforma (pacientes y/o profesionales).
  // Se excluyen roles internos (admin/support).
  let query = adminClient
    .from("profiles")
    .select("id, email")
    .in("role", ["patient", "professional"])
    .eq("is_active", true);

  if (broadcast.audience === "patients") {
    query = adminClient
      .from("profiles")
      .select("id, email")
      .eq("role", "patient")
      .eq("is_active", true);
  } else if (broadcast.audience === "professionals") {
    query = adminClient
      .from("profiles")
      .select("id, email")
      .eq("role", "professional")
      .eq("is_active", true);
  }

  const { data: recipients, error: recipientsError } = await query;
  if (recipientsError) {
    return json({ error: "No se pudo resolver la audiencia" }, 500);
  }

  // Filtro opcional del administrador (p. ej. envío de prueba controlado).
  const onlyEmails = Array.isArray(body.only_emails) && body.only_emails.length > 0
    ? new Set(body.only_emails.filter((e) => EMAIL_REGEX.test(e)))
    : null;

  const userIds = [
    ...new Set(
      (recipients ?? [])
        .filter((r: { id: string; email: string }) => !onlyEmails || onlyEmails.has(r.email))
        .map((r: { id: string }) => r.id),
    ),
  ];

  if (userIds.length === 0) {
    await adminClient
      .from("notification_broadcasts")
      .update({ status: "failed", recipient_count: 0 })
      .eq("id", broadcast.id);
    return json({ error: "La audiencia no tiene destinatarios" }, 422);
  }

  const rows = userIds.map((profileId) => ({
    profile_id: profileId,
    type: "admin_broadcast",
    title: broadcast.title,
    body: broadcast.body,
    link: broadcast.link || null,
  }));

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const chunk = rows.slice(i, i + INSERT_BATCH);
    const { error: insertError } = await adminClient.from("notifications").insert(chunk);
    if (insertError) {
      console.error("broadcast insert:", insertError);
      failed += chunk.length;
    } else {
      sent += chunk.length;
    }
  }

  const status = sent > 0 ? "sent" : "failed";
  await adminClient
    .from("notification_broadcasts")
    .update({
      status,
      recipient_count: userIds.length,
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", broadcast.id);

  return json({ ok: status === "sent", broadcast_id: broadcast.id, recipients: userIds.length, sent, failed });
});
