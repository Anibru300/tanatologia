# Avance 2026-09-06 — Videollamadas: diagnóstico del fallback silencioso a meet.jit.si

## Reporte del cliente
Una videollamada real entre paciente y profesional (cita agendada en la plataforma)
abrió en **meet.jit.si con el aviso de "solo demostración, 5 minutos"** y murió a los
5 minutos. Además, la calidad se veía mala.

## Diagnóstico (por qué pasó)
1. El backend de JaaS **nunca falló**: se replicó el camino exacto del navegador
   (`supabase.functions.invoke('jaas-token')` con sesión real de paciente y de
   profesional, cita real de prueba) en `scripts/test-jaas-invoke.mjs` → el token
   se emitió correctamente para ambos (`error: null`, firma RS256 válida, moderador
   correcto). Secrets `JAAS_*` verificados en Supabase Cloud; Edge Function desplegada.
2. La causa de la sesión fallida: **los navegadores de la prueba traían el bundle
   viejo en caché** (el de antes del 4-sep, sin código JaaS) y cayeron directo al
   fallback de meet.jit.si.
3. El defecto real de producto: **el fallback era silencioso** — `fetchJaasToken`
   devolvía `null` ante cualquier fallo y nadie se enteraba; la sesión simplemente
   moría a los 5 min sin explicación.
4. La mala calidad es consecuencia del punto 2: la config 720p solo aplica de verdad
   en JaaS; meet.jit.si gratuito adapta la calidad por banda del servidor público.

## Fix implementado y desplegado (commit `c26e091`)
- **`src/lib/jaasService.ts`**: `fetchJaasToken` ahora devuelve `{ token, reason }`;
  nunca lanza; el motivo del fallo se traduce (401 sesión expirada, 404 cita no
  encontrada, 409 cita no activa, 501 JaaS no configurado, error de red, etc.).
- **`src/components/video/VideoCallExperience.tsx`**: reintenta la obtención del token
  una vez (2 s después, cubre cold-start/red transitoria) y si sigue sin token muestra
  un **`Alert` warning en el prejoin**: "No pudimos activar la sala principal… sala de
  respaldo (máximo 5 minutos). Recarga con Ctrl+F5… Motivo: \<razón\>". Además log en
  consola (`[videollamada] sin token JaaS: …`).
- **`scripts/test-jaas-invoke.mjs`** (nuevo): replica el `functions.invoke` exacto del
  navegador con cita real de prueba; útil para futuros diagnósticos sin browser.
- Verificado: tsc, 31/31 tests, lint 0 errores, build OK; bundle nuevo servido en
  vivo desde `somos-calma.com/app` (chunk `VideoCallExperience-kRu1w1t2.js` con el aviso).

## Pendiente (prueba real — 2026-09-07)
- [ ] **Videollamada real de 2 personas (paciente + profesional) en 8x8.vc**, con
      **Ctrl+F5 en ambos navegadores** (o incógnito). Nunca se ha confirmado una
      sesión real en JaaS.
- [ ] **Verificar el `JAAS_KID`**: el almacenado termina en `/77f45a` **sin el sufijo
      `-<NOMBRE_APP>`** que documenta 8x8 (`vpaas-magic-cookie-…/<hex>-<NOMBRE_APP>`).
      Confirmar en la consola JaaS (API Key ID). Si está truncado, actualizar el
      secret con `supabase secrets set JAAS_KID=...`.
- [ ] Si aparece el **aviso amarillo** en la prueba: anotar el motivo exacto que muestra.
- [ ] Si la sala de 8x8 da error de autenticación al entrar: es el `kid`; corregir y repetir.
- [ ] Confirmar que la sesión **dura más de 5 min** y que la **calidad se ve mejor** (720p).

### Guía rápida de interpretación de la prueba
| Resultado | Significado |
|---|---|
| Sala abre con marca 8x8 y dura > 5 min | ✅ Caso cerrado |
| Aviso amarillo antes de entrar | Falló el token; el texto indica el motivo |
| Sala 8x8 rechaza la entrada | `JAAS_KID` truncado; corregir secret |

## Notas
- `index.html` de `/app/` se sirve con `Cache-Control: max-age=600` (10 min); tras un
  deploy hay que Ctrl+F5 (o esperar 10 min) para no usar el bundle anterior.
- La sala manual del profesional ("Unirse manualmente con nombre de sala") sigue a
  propósito en meet.jit.si (5 min, solo pruebas) — no es un bug.
