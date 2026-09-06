// Función PÚBLICA (sin auth): recibe el formulario de contacto del sitio
// estático y lo envía por Resend a hola@somos-calma.com.
// verify_jwt = false en config.toml; no requiere sesión porque es para
// visitantes anónimos. Protecciones: honeypot + validación estricta.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "SOMOS-CALMA <hola@somos-calma.com>";
const CONTACT_INBOX = Deno.env.get("CONTACT_INBOX") || "hola@somos-calma.com";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_VALIDOS = ["paciente", "profesional", "empresa"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Rate-limit en memoria por IP (mitiga spam; sin dependencias externas).
// Límite: MAX_REQUESTS ventanas de WINDOW_MS por IP. Al ser por instancia de
// la función no es global, pero frena bots y ráfagas simples.
const rateLimits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateLimits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  rateLimits.set(ip, hits);
  // Limpieza ocasional para no crecer sin fin
  if (rateLimits.size > 10_000) {
    for (const [key, times] of rateLimits) {
      if (times.every((t) => now - t > WINDOW_MS)) rateLimits.delete(key);
    }
  }
  return hits.length > MAX_REQUESTS;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return json({ error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo de la solicitud inválido" }, 400);
  }

  // Honeypot: los bots llenan campos ocultos; respondemos éxito falso y salimos.
  if (typeof body._gotcha === "string" && body._gotcha.trim() !== "") {
    return json({ ok: true });
  }

  const nombre = String(body.nombre ?? "").trim();
  const email = String(body.email ?? "").trim();
  const tipo = String(body.tipo ?? "").trim();
  const mensaje = String(body.mensaje ?? "").trim();

  if (!nombre || nombre.length > 120) return json({ error: "Nombre inválido" }, 400);
  if (!EMAIL_REGEX.test(email) || email.length > 200) return json({ error: "Correo inválido" }, 400);
  if (!TIPOS_VALIDOS.includes(tipo)) return json({ error: "Tipo de contacto inválido" }, 400);
  if (!mensaje || mensaje.length > 5000) return json({ error: "Mensaje inválido" }, 400);

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY no está configurada" }, 500);
  }

  const tipoLabel: Record<string, string> = {
    paciente: "Paciente o familiar",
    profesional: "Profesional de salud mental",
    empresa: "Empresa o institución",
  };

  const html = `<!DOCTYPE html>
  <html><head><meta charset="UTF-8"></head><body>
    <h2 style="font-family: sans-serif; color: #4a5d43;">Nuevo mensaje de contacto — somos-calma.com</h2>
    <table style="font-family: sans-serif; font-size: 15px; border-collapse: collapse;">
      <tr><td style="padding: 6px 12px; font-weight: bold;">Nombre:</td><td style="padding: 6px 12px;">${escapeHtml(nombre)}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">Correo:</td><td style="padding: 6px 12px;">${escapeHtml(email)}</td></tr>
      <tr><td style="padding: 6px 12px; font-weight: bold;">Soy:</td><td style="padding: 6px 12px;">${tipoLabel[tipo]}</td></tr>
    </table>
    <p style="font-family: sans-serif; font-size: 15px; font-weight: bold; margin-bottom: 4px;">Mensaje:</p>
    <p style="font-family: sans-serif; font-size: 15px; white-space: pre-wrap; background: #f7f5f2; padding: 12px; border-radius: 8px;">${escapeHtml(mensaje)}</p>
    <p style="font-family: sans-serif; font-size: 12px; color: #888;">Puedes responder directamente a este correo (Reply-To: ${escapeHtml(email)}).</p>
  </body></html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [CONTACT_INBOX],
      reply_to: email,
      subject: `[Contacto web] ${tipoLabel[tipo]} — ${nombre}`,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend rechazó el envío:", detail);
    return json({ error: "No se pudo enviar el mensaje. Intenta más tarde." }, 502);
  }

  return json({ ok: true });
});
