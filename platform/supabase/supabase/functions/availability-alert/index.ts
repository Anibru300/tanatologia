import { createClient } from "jsr:@supabase/supabase-js@^2";

// availability-alert — alta pública de "Avísame cuando abra agenda".
// La llama el directorio del paciente (app autenticada) y el sitio estático
// (anónimo): { professional_profile_id, email }. Valida que el profesional
// exista, esté verificado y sea visible; inserta con service role (la tabla no
// acepta inserts directos por RLS). Idempotente: el UNIQUE (profesional,
// lower(email)) convierte reintentos en { duplicate: true }. Sin JWT
// (verify_jwt=false); rate-limit por IP en memoria (10 req/min).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const rateByIp = new Map();
function rateLimit(ip: string) {
  const nowTs = Date.now();
  const entry = rateByIp.get(ip);
  if (!entry || nowTs - entry.start > 60_000) {
    rateByIp.set(ip, { start: nowTs, count: 1 });
  } else {
    entry.count += 1;
  }
  if (rateByIp.size > 5000) {
    for (const [k, v] of rateByIp) {
      if (nowTs - v.start > 60_000) rateByIp.delete(k);
    }
  }
  return (rateByIp.get(ip)?.count ?? 0) <= 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip)) {
    return Response.json({ error: "Rate limit" }, { status: 429, headers: corsHeaders });
  }

  let body: { professional_profile_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400, headers: corsHeaders });
  }

  const professionalProfileId = String(body.professional_profile_id ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!UUID_RE.test(professionalProfileId)) {
    return Response.json({ error: "professional_profile_id inválido" }, { status: 400, headers: corsHeaders });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ error: "Correo inválido" }, { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Solo profesionales verificados y visibles pueden recibir avisos.
  const { data: professional, error: profError } = await supabase
    .from("professional_profiles")
    .select("id")
    .eq("id", professionalProfileId)
    .eq("verification_status", "verified")
    .eq("is_visible", true)
    .maybeSingle();

  if (profError) {
    console.error("availability-alert professional", profError);
    return Response.json({ error: "No se pudo validar al profesional" }, { status: 500, headers: corsHeaders });
  }
  if (!professional) {
    return Response.json({ error: "Profesional no encontrado" }, { status: 404, headers: corsHeaders });
  }

  const { error: insertError } = await supabase
    .from("availability_alerts")
    .insert({ professional_profile_id: professionalProfileId, email });

  if (insertError) {
    // 23505 = ya existe (profesional, correo): es un reintento, no un error.
    if (insertError.code === "23505") {
      return Response.json({ ok: true, duplicate: true }, { status: 200, headers: corsHeaders });
    }
    console.error("availability-alert insert", insertError);
    return Response.json({ error: "No se pudo guardar tu solicitud" }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ ok: true, duplicate: false }, { status: 200, headers: corsHeaders });
});
