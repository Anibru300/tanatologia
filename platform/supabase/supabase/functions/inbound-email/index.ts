import { createClient } from "jsr:@supabase/supabase-js@^2";

// inbound-email — Webhook de Resend Inbound (evento email.received).
//
// Flujo: Hostinger reenvía hola@somos-calma.com -> hola@inbound.somos-calma.com;
// Resend recibe el correo y avisa a este endpoint. El webhook de Resend trae
// SOLO METADATOS: el cuerpo y los headers se obtienen del Receiving API
// (GET /emails/receiving/{email_id}) y los adjuntos del Attachments API.
//
// Pasos: verificar firma svix -> traer el correo completo -> resolver hilo
// (in-reply-to / references contra message_id existentes) -> insertar en
// public.email_inbox (idempotente por message_id: Resend reintenta ~27 h) ->
// descargar adjuntos al bucket email-attachments -> notificar in-app a admins.
//
// Secrets requeridos: RESEND_INBOUND_SECRET (whsec_... de la ruta/webhook de
// Resend), RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_INBOUND_SECRET = Deno.env.get("RESEND_INBOUND_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verificación svix estándar (id.timestamp.payload firmado con HMAC-SHA256;
// la clave va en base64 tras el prefijo whsec_).
async function verifySvixSignature(payload: string, req: Request, secret: string): Promise<boolean> {
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const keyB64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = `${id}.${timestamp}.${payload}`;
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed)));
  let expected = "";
  for (const byte of mac) expected += String.fromCharCode(byte);
  expected = btoa(expected);

  return signature.split(" ").some((s) => s.startsWith("v1,") && timingSafeEqual(s.slice(3), expected));
}

function parseAddress(raw: string | null | undefined): { email: string; name: string | null } {
  if (!raw) return { email: "", name: null };
  const m = raw.match(/^(?:"?([^"]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (m) return { email: m[2], name: m[1]?.trim() || null };
  return { email: raw.trim(), name: null };
}

function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/<([^<>\s]+@[^<>\s]+)>/);
  return (m ? m[1] : raw.trim()) || null;
}

function parseReferences(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(/\s+/).map(normalizeMessageId).filter((v): v is string => Boolean(v));
}

interface ReceivedEmail {
  id: string;
  from?: string;
  to?: string[];
  subject?: string | null;
  text?: string | null;
  html?: string | null;
  headers?: Record<string, string> | null;
  message_id?: string | null;
  attachments?: { id: string; filename: string; size?: number; content_type?: string | null; content_disposition?: string | null }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET") return json({ ok: true, service: "inbound-email" });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  if (!RESEND_INBOUND_SECRET) {
    return json({ error: "RESEND_INBOUND_SECRET no está configurado" }, 500);
  }
  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  // El cuerpo se lee como texto crudo: la firma se calcula sobre los bytes exactos.
  const rawBody = await req.text();
  if (!(await verifySvixSignature(rawBody, req, RESEND_INBOUND_SECRET))) {
    return json({ error: "Firma de webhook inválida" }, 401);
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  // Solo el evento de recepción; otros eventos se confirman sin acción.
  if (event.type !== "email.received") {
    return json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return json({ error: "Falta email_id" }, 400);
  }

  // ---------------------------------------------------------------------------
  // Cuerpo completo vía Receiving API (metadata + text + html + headers).
  // ---------------------------------------------------------------------------
  const emailRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, Accept: "application/json" },
  });
  if (!emailRes.ok) {
    const text = await emailRes.text();
    console.error("Receiving API rechazó:", emailRes.status, text);
    // 5xx para que Resend reintente (el correo queda almacenado 30 días en su dashboard).
    return json({ error: "No se pudo obtener el correo" }, 502);
  }
  const email = (await emailRes.json()) as ReceivedEmail;

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const from = parseAddress(email.from);
  const toEmail = Array.isArray(email.to) && email.to.length > 0 ? parseAddress(email.to[0]).email : "";
  const headers = email.headers ?? {};
  const messageId = normalizeMessageId(email.message_id ?? headers["message-id"]);
  const inReplyTo = normalizeMessageId(headers["in-reply-to"]);
  const references = parseReferences(headers["references"]);

  // ---------------------------------------------------------------------------
  // Resolver hilo: ¿a qué mensaje existente responde este correo?
  // ---------------------------------------------------------------------------
  let threadRootId: string | null = null;
  const candidates = [inReplyTo, ...references].filter((v): v is string => Boolean(v));
  if (candidates.length > 0) {
    const { data: parent } = await adminClient
      .from("email_inbox")
      .select("id, thread_root_id")
      .in("message_id", candidates)
      .limit(1)
      .maybeSingle();
    if (parent) {
      threadRootId = parent.thread_root_id ?? parent.id;
    }
  }

  const rowId = crypto.randomUUID();

  // ---------------------------------------------------------------------------
  // Adjuntos: se guardan en el bucket privado email-attachments/{rowId}/{nombre}.
  // Se omiten los inline (imágenes embebidas: el html ya trae data_uri).
  // ---------------------------------------------------------------------------
  const attachmentMeta: { name: string; size: number; content_type: string; path: string }[] = [];
  const wanted = (email.attachments ?? []).filter((a) => a.content_disposition !== "inline");
  if (wanted.length > 0) {
    const listRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, Accept: "application/json" },
    });
    if (listRes.ok) {
      const list = (await listRes.json()) as { data?: { id: string; filename: string; download_url: string }[] };
      const byId = new Map((list.data ?? []).map((a) => [a.id, a]));
      for (const att of wanted) {
        const downloadable = byId.get(att.id);
        if (!downloadable) continue;
        try {
          const fileRes = await fetch(downloadable.download_url);
          if (!fileRes.ok) continue;
          const bytes = new Uint8Array(await fileRes.arrayBuffer());
          if (bytes.byteLength > 10 * 1024 * 1024) continue; // límite del bucket
          const safeName = (att.filename || `adjunto-${att.id}`).replace(/[/\\]/g, "_");
          const path = `${rowId}/${safeName}`;
          const { error: upErr } = await adminClient.storage
            .from("email-attachments")
            .upload(path, bytes, { contentType: att.content_type ?? "application/octet-stream" });
          if (!upErr) {
            attachmentMeta.push({
              name: safeName,
              size: att.size ?? bytes.byteLength,
              content_type: att.content_type ?? "application/octet-stream",
              path,
            });
          }
        } catch (e) {
          console.error("Adjunto falló (best-effort):", att.filename, e);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Insertar (idempotente por message_id; Resend reintenta el webhook).
  // ---------------------------------------------------------------------------
  const { error: insertError } = await adminClient.from("email_inbox").insert({
    id: rowId,
    direction: "in",
    from_email: from.email,
    from_name: from.name,
    to_email: toEmail,
    subject: email.subject ?? "(sin asunto)",
    text_body: email.text ?? null,
    html_body: email.html ?? null,
    message_id: messageId,
    in_reply_to: inReplyTo,
    refs: references,
    thread_root_id: threadRootId,
    attachments: attachmentMeta,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      // Ya estaba registrado: confirmar para que Resend deje de reintentar.
      // Se intenta limpiar archivos que se hayan subido en este intento duplicado.
      for (const a of attachmentMeta) {
        await adminClient.storage.from("email-attachments").remove([a.path]);
      }
      return json({ ok: true, duplicate: true });
    }
    console.error("Insert email_inbox falló:", insertError);
    return json({ error: "No se pudo registrar el correo" }, 500);
  }

  // ---------------------------------------------------------------------------
  // Notificación in-app a los administradores.
  // ---------------------------------------------------------------------------
  const { data: admins } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);

  const sender = from.name ? `${from.name} <${from.email}>` : from.email;
  const notifBody = `${sender} — ${email.subject ?? "(sin asunto)"}`;
  for (const admin of admins ?? []) {
    const { error: notifErr } = await adminClient.from("notifications").insert({
      profile_id: admin.id,
      type: "inbox_email",
      title: "Nuevo correo en la bandeja",
      body: notifBody.slice(0, 300),
      link: "/admin/bandeja",
    });
    if (notifErr) console.error("Notificación admin falló (best-effort):", notifErr);
  }

  return json({ ok: true, id: rowId, thread_root_id: threadRootId });
});
