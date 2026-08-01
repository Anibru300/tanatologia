// Plantilla de correo con branding SOMOS-CALMA (misma línea visual que el
// correo de recuperación de contraseña configurado en Supabase).
// Compatible con clientes de correo: tablas + estilos inline.

export interface BrandedEmailOptions {
  /** Título principal dentro de la tarjeta */
  title: string
  /** Saludo, p. ej. "Hola Carlos," */
  greeting: string
  /** Párrafos/filas del cuerpo en HTML (ya sanitizados por el llamador) */
  bodyHtml: string
  /** Texto del botón (opcional) */
  ctaText?: string
  /** URL del botón (obligatoria si hay ctaText) */
  ctaUrl?: string
  /** Nota pequeña al final del cuerpo (opcional) */
  note?: string
}

export function brandedEmail({
  title,
  greeting,
  bodyHtml,
  ctaText,
  ctaUrl,
  note,
}: BrandedEmailOptions): string {
  const ctaBlock =
    ctaText && ctaUrl
      ? `
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr><td align="center" style="background-color:#5F6F55;border-radius:999px;">
                <a href="${ctaUrl}"
                   style="display:inline-block;padding:14px 36px;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;">
                  ${ctaText}
                </a>
              </td></tr>
            </table>`
      : ''

  const noteBlock = note
    ? `<p style="margin:16px 0 0;color:#999;font-size:13px;line-height:1.5;">${note}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F7F5F0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F7F5F0;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(76,88,69,0.08);">
        <tr>
          <td style="background-color:#5F6F55;padding:28px 32px;text-align:center;">
            <span style="color:#FFFFFF;font-size:22px;letter-spacing:2px;font-weight:bold;">SOMOS-CALMA</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 32px;">
            <h1 style="margin:0 0 16px;color:#4C5845;font-size:24px;font-weight:bold;">${title}</h1>
            <p style="margin:0 0 12px;color:#555;font-size:15px;line-height:1.6;">${greeting}</p>
            ${bodyHtml}
            ${ctaBlock}
            ${noteBlock}
          </td>
        </tr>
        <tr>
          <td style="background-color:#F7F5F0;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#999;font-size:12px;">
              SOMOS-CALMA · Acompañamiento emocional y tanatología<br>
              <a href="https://somos-calma.com" style="color:#8BAE7A;text-decoration:none;">somos-calma.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Fila de detalle (etiqueta + valor) para el cuerpo del correo. */
export function emailDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;color:#999;font-size:14px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#4C5845;font-size:14px;font-weight:bold;">${value}</td>
  </tr>`
}

/** Tabla contenedora de filas de detalle. */
export function emailDetailsTable(rows: string[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;width:100%;background-color:#F7F5F0;border-radius:12px;padding:16px 20px;">
    ${rows.join('\n')}
  </table>`
}
