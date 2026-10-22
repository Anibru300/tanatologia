// jaas-webhook — recibe los eventos de webhook de JaaS (8x8.vc) de las salas de
// videollamada y los guarda en `video_call_events` (ground-truth de la sesión:
// quién entró/salió, duración real, no-show).
//
// Seguridad: JaaS firma cada evento con HMAC-SHA256 usando el secreto del
// endpoint (header `X-Jaas-Signature: t=<ts>,v1=<base64>`). Si el secreto
// JAAS_WEBHOOK_SECRET no está configurado, responde 503 (la consola de JaaS
// aún no ha sido configurada; sin eventos el sistema sigue funcionando con la
// señal de colgar + cron, migración 031).
//
// Eventos que procesamos: PARTICIPANT_JOINED, PARTICIPANT_LEFT, ROOM_CREATED,
// ROOM_DESTROYED. Al destruirse la sala con <2 participantes distintos y la
// cita aún pending/confirmada, se marca 'no_show'.
//
// Secret requerido: JAAS_WEBHOOK_SECRET (se genera en JaaS Console → Webhooks
// → Add endpoint → Reveal secret; pégalo con `supabase secrets set`).

import { createClient } from "jsr:@supabase/supabase-js@^2";

const JAAS_WEBHOOK_SECRET = Deno.env.get("JAAS_WEBHOOK_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-jaas-signature",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

/** Comparación en tiempo constante (anti timing attacks). */
function safeEqual(a: string, b: string): boolean {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

/** HMAC-SHA256 base64 (WebCrypto) — firma de JaaS. */
async function hmacBase64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/** Verifica el header X-Jaas-Signature contra el cuerpo crudo. */
async function verifySignature(header: string | null, rawBody: string): Promise<boolean> {
  if (!header || !JAAS_WEBHOOK_SECRET) return false;
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [prefix, ...rest] = part.split("=");
    const value = rest.join("=");
    if (prefix === "t") timestamp = value;
    else if (prefix === "v1") signatures.push(value); // ignorar otros esquemas
  }
  if (!timestamp || signatures.length === 0) return false;
  // Tolerancia de 5 minutos contra replay de eventos viejos
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = await hmacBase64(JAAS_WEBHOOK_SECRET, `${timestamp}.${rawBody}`);
  return signatures.some((s) => safeEqual(s, expected));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!JAAS_WEBHOOK_SECRET) {
    return json({ error: "JAAS_WEBHOOK_SECRET no configurado" }, 503);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Jaas-Signature");
  if (!(await verifySignature(signature, rawBody))) {
    return json({ error: "Firma inválida" }, 401);
  }

  let event: {
    eventType?: string;
    fqn?: string;
    timestamp?: number;
    idempotencyKey?: string;
    data?: Record<string, unknown>;
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const TRACKED = ["PARTICIPANT_JOINED", "PARTICIPANT_LEFT", "ROOM_CREATED", "ROOM_DESTROYED"];
  if (!event.eventType || !TRACKED.includes(event.eventType)) {
    return json({ ok: true, ignored: event.eventType ?? "unknown" });
  }

  // fqn = "[AppID]/[roomName]"; nuestras salas (video_link) no contienen "/"
  const roomName = (event.fqn ?? "").split("/").slice(1).join("/");
  if (!roomName) return json({ error: "fqn inválido" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  // La cita de la sala (la más reciente si el nombre se reutilizara)
  const { data: appointment } = await adminClient
    .from("appointments")
    .select("id, status, scheduled_at, duration_minutes")
    .eq("video_link", roomName)
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!appointment) {
    // Sala sin cita (p. ej. sala de prueba del admin): se ignora con ok
    return json({ ok: true, ignored: "no_appointment", room: roomName });
  }

  const data = event.data ?? {};
  const { error: insertError } = await adminClient
    .from("video_call_events")
    .insert({
      appointment_id: appointment.id,
      event_type: event.eventType,
      participant_jid: typeof data.participantJid === "string" ? data.participantJid : null,
      participant_name: typeof data.name === "string" ? data.name : null,
      is_moderator: data.moderator === true || data.moderator === "true",
      occurred_at: new Date(event.timestamp ?? Date.now()).toISOString(),
      idempotency_key: event.idempotencyKey ?? `${event.eventType}-${event.timestamp}`,
      raw: event,
    });

  if (insertError && insertError.code !== "23505") {
    console.error("insert video_call_events:", insertError.message);
    return json({ error: "No se pudo registrar el evento" }, 500);
  }

  // No-show real: la sala se cerró sin alcanzar 2 participantes distintos.
  // GUARDA DE HORARIO (incidente 2026-10-22): solo aplica DESPUÉS de que la
  // cita terminó (+15 min de gracia). Antes de esa hora, la destrucción de la
  // sala casi siempre es alguien probando el acceso (p. ej. el profesional
  // entrando temprano a revisar cámara/mic): marcar no_show ahí cerraba la
  // cita a ambos para siempre y ninguno podía volver a entrar.
  const occurredAt = new Date(event.timestamp ?? Date.now());
  const endsAt = new Date(
    new Date(appointment.scheduled_at).getTime() + (appointment.duration_minutes ?? 50) * 60 * 1000,
  );
  const graceEndsAt = new Date(endsAt.getTime() + 15 * 60 * 1000);
  if (
    event.eventType === "ROOM_DESTROYED" &&
    ["pending", "confirmed"].includes(appointment.status) &&
    occurredAt >= graceEndsAt
  ) {
    const { data: joined } = await adminClient
      .from("video_call_events")
      .select("participant_jid")
      .eq("appointment_id", appointment.id)
      .eq("event_type", "PARTICIPANT_JOINED")
      .not("participant_jid", "is", null);

    const distinct = new Set((joined ?? []).map((r: { participant_jid: string }) => r.participant_jid));
    if (distinct.size < 2) {
      const { error: updateError } = await adminClient
        .from("appointments")
        .update({ status: "no_show" })
        .eq("id", appointment.id);
      if (updateError) {
        console.error("marcar no_show:", updateError.message);
      }
    }
  }

  return json({ ok: true });
});
