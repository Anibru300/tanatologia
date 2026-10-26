import { createClient } from "jsr:@supabase/supabase-js@^2";

// public-directory — endpoint público de SOLO LECTURA para el sitio estático.
// Devuelve profesionales verificados y visibles (nombre, avatar, especialidades)
// + conteos de legitimidad (profesionistas verificados, sesiones completadas,
// pacientes). Expone únicamente datos no sensibles y ya públicos dentro de la
// app (el directorio del paciente muestra lo mismo). Sin JWT
// (verify_jwt=false); rate-limit por IP en memoria (30 req/min).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Cache-Control": "public, max-age=300",
};

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
  return (rateByIp.get(ip)?.count ?? 0) <= 30;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip)) {
    return Response.json({ error: "Rate limit" }, { status: 429, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: professionals, error: profError } = await supabase
    .from("professional_profiles")
    .select("specialties, profiles!professional_profiles_profile_id_fkey(full_name, avatar_url)")
    .eq("verification_status", "verified")
    .eq("is_visible", true)
    .order("created_at", { ascending: true })
    .limit(12);

  if (profError) {
    console.error("public-directory professionals", profError);
    return Response.json({ error: "No se pudo cargar el directorio" }, { status: 500, headers: corsHeaders });
  }

  const [{ count: professionalsCount }, { count: sessionsCount }, { count: patientsCount }] =
    await Promise.all([
      supabase
        .from("professional_profiles")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "verified")
        .eq("is_visible", true),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("patient_profiles").select("id", { count: "exact", head: true }),
    ]);

  const directory = (professionals ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      full_name: profile?.full_name ?? "Profesional",
      avatar_url: profile?.avatar_url ?? null,
      specialties: row.specialties ?? [],
    };
  });

  return Response.json(
    {
      directory,
      counts: {
        professionals: professionalsCount ?? 0,
        sessions: sessionsCount ?? 0,
        patients: patientsCount ?? 0,
      },
    },
    { status: 200, headers: corsHeaders },
  );
});
