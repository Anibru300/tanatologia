import { createClient } from "jsr:@supabase/supabase-js@^2";

// jaas-token — firma un JWT de JaaS (8x8.vc) para la sala de una cita específica.
// Solo el paciente o el profesional de la cita reciben token (RLS de appointments);
// el profesional entra como moderador. Sin los secrets de JaaS configurados
// responde 501 y el frontend sigue usando meet.jit.si (fallback automático).
//
// Secrets requeridos (supabase secrets set):
//   JAAS_APP_ID      → vpaas-magic-cookie-xxxxxxxxxxxx
//   JAAS_KID         → API Key ID del par de claves de JaaS
//   JAAS_PRIVATE_KEY → clave privada PEM (RSA) descargada de la consola JaaS
//   JAAS_DOMAIN      → opcional, por defecto "8x8.vc"

const ALLOWED_STATUS = ["pending", "confirmed"];

function b64url(data: Uint8Array | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/g, "")
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function signRs256(payload: object, kid: string, pem: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(pem) as BufferSource,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const header = { alg: "RS256", kid, typ: "JWT" };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    new TextEncoder().encode(body) as BufferSource,
  );
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let appointmentId = "";
  try {
    appointmentId = (await req.json())?.appointmentId ?? "";
  } catch { /* cuerpo inválido */ }
  if (typeof appointmentId !== "string" || appointmentId.length === 0) {
    return Response.json({ error: "appointmentId requerido" }, { status: 400 });
  }

  // Cliente con el JWT del usuario: el RLS de appointments garantiza que solo
  // el paciente o el profesional de la cita pueden leerla.
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const user = userData.user;

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, video_link, status, professional_profile_id")
    .eq("id", appointmentId)
    .single();
  if (apptError || !appt?.video_link) {
    return Response.json({ error: "Cita no encontrada" }, { status: 404 });
  }
  if (!ALLOWED_STATUS.includes(appt.status)) {
    return Response.json({ error: "La cita no está activa" }, { status: 409 });
  }

  // ¿Es el profesional de la cita? → moderador de la sala.
  const { data: proProfile } = await supabase
    .from("professional_profiles")
    .select("profile_id")
    .eq("id", appt.professional_profile_id)
    .single();
  const moderator = proProfile?.profile_id === user.id;

  const appId = Deno.env.get("JAAS_APP_ID");
  const kid = Deno.env.get("JAAS_KID");
  const pem = Deno.env.get("JAAS_PRIVATE_KEY");
  if (!appId || !kid || !pem) {
    // JaaS aún no configurado: el frontend cae a meet.jit.si automáticamente.
    return Response.json({ error: "JaaS no configurado" }, { status: 501 });
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = await signRs256(
    {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: appt.video_link,
      exp: now + 3 * 3600,
      nbf: now - 10,
      context: {
        user: {
          id: user.id,
          name: user.user_metadata?.full_name ?? "",
          email: user.email ?? "",
          moderator,
        },
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          "outbound-call": false,
        },
      },
    },
    kid,
    pem,
  );

  return Response.json({
    jwt,
    appId,
    domain: Deno.env.get("JAAS_DOMAIN") || "8x8.vc",
    moderator,
  });
});
