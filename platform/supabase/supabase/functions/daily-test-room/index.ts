import { createClient } from "jsr:@supabase/supabase-js@^2";

// daily-test-room — crea una sala de PRUEBA en Daily.co solo para el panel
// admin, para comparar la calidad de video contra JaaS antes de decidir una
// posible migración. No afecta las salas reales de las citas (JaaS/Jitsi).
//
// Modo de uso (frontend AdminVideoTest): POST {} con sesión de admin.
// Responde { url, name } de la sala Daily (expira en ~3 h).
//
// Secrets requeridos (supabase secrets set):
//   DAILY_API_KEY → API key de una cuenta Daily.co (plan free incluye API)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Cliente con el JWT del usuario: validamos sesión y rol admin (RLS permite
  // leer el propio perfil, igual que jaas-token con testRoom).
  const auth = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: "No autenticado" }, 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  if (profile?.role !== "admin") {
    return json({ error: "Se requiere rol de administrador" }, 403);
  }

  const apiKey = Deno.env.get("DAILY_API_KEY");
  if (!apiKey) {
    // Igual que jaas-token sin secrets: el frontend muestra cómo configurarlo.
    return json({ error: "Daily no configurado" }, 501);
  }

  const now = Math.floor(Date.now() / 1000);
  const name = `somos-calma-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      properties: {
        exp: now + 3 * 3600, // la sala deja de existir a las ~3 h
        enable_chat: false,
        enable_screenshare: true,
        start_video_off: false,
      },
    }),
  });

  if (!dailyRes.ok) {
    const detail = await dailyRes.text().catch(() => "");
    return json(
      { error: `Daily API respondió ${dailyRes.status}`, detail: detail.slice(0, 300) },
      502,
    );
  }

  const room = await dailyRes.json();
  if (!room?.url) {
    return json({ error: "Daily API no devolvió URL de sala" }, 502);
  }

  return json({ url: room.url, name: room.name });
});
