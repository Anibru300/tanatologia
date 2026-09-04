import { createClient } from "jsr:@supabase/supabase-js@^2";

// track-view — beacon público de analítica first-party.
// Recibe { path, referrer, sessionKey, source } desde el sitio estático y la app,
// limita por IP en memoria (60 req/min) y delega el rate-limit por sesión al
// trigger 016. Sin JWT (verify_jwt=false); escribe con service role.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_PATH = /^\/[A-Za-z0-9\-_./%?=&+#]*$/;
const VALID_SOURCE = /^(site|app)$/;
const VALID_SESSION = /^[A-Za-z0-9-]{8,64}$/;

const rateByIp = new Map();
function rateLimit(ip) {
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
  return (rateByIp.get(ip)?.count ?? 0) <= 60;
}

function deviceFromUa(ua) {
  const mobile = /Android|iPhone|iPad|iPod|Mobile|webOS/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua);
  const device = tablet ? "tablet" : mobile ? "móvil" : "escritorio";
  let browser = "otro";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  return { device, browser };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip)) {
    return Response.json({ error: "Rate limit" }, { status: 429, headers: corsHeaders });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400, headers: corsHeaders });
  }

  const path = typeof payload.path === "string" ? payload.path.trim().slice(0, 300) : "";
  const referrer = typeof payload.referrer === "string" ? payload.referrer.trim().slice(0, 500) : null;
  const sessionKey = typeof payload.sessionKey === "string" ? payload.sessionKey.trim() : "";
  const source = typeof payload.source === "string" && VALID_SOURCE.test(payload.source) ? payload.source : "site";

  // Sanitiza referrer: solo origen (protocolo + host) para no filtrar datos de
  // las páginas externas ni query strings con tokens.
  let referrerOrigin = null;
  if (referrer) {
    try {
      const u = new URL(referrer);
      if (u.protocol === "http:" || u.protocol === "https:") {
        referrerOrigin = u.origin;
      }
    } catch {
      referrerOrigin = null;
    }
  }

  if (!VALID_PATH.test(path)) {
    return Response.json({ error: "path inválido" }, { status: 400, headers: corsHeaders });
  }
  if (!VALID_SESSION.test(sessionKey)) {
    return Response.json({ error: "sessionKey inválida" }, { status: 400, headers: corsHeaders });
  }

  const { device, browser } = deviceFromUa(req.headers.get("user-agent") || "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

  const { error } = await supabase.from("page_views").insert({
    path,
    referrer: referrerOrigin,
    session_key: sessionKey,
    source,
    device,
    browser,
  });

  if (error) {
    // Rate limit por sesión del trigger → aceptado silenciosamente (204)
    if (error.message.includes("Rate limit")) {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    console.error("track-view insert", error);
    return Response.json({ error: "No se pudo registrar" }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ ok: true }, { status: 200, headers: corsHeaders });
});
