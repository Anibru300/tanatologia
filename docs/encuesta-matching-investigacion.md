# Investigación: Encuesta de registro (intake) y matching — 2026-09-02

Objetivo: diseñar la encuesta que responde el paciente al registrarse para **filtrar el
directorio** de profesionales (psicólogo clínico, educativo, tanatólogo, etc.) basándose en
instrumentos y buenas prácticas reales, no en preguntas inventadas.

## 1. Lo que se investigó

### 1.1 Cuestionarios clínicos validados en español (tamizaje)

| Instrumento | Mide | Ítems | Tiempo | Validación en español/México | Dominio público |
|---|---|---|---|---|---|
| **PHQ-9** (Kroenke, Spitzer & Williams, 2001) | Síntomas depresivos (últimas 2 semanas) | 9 | 2–3 min | Sí, múltiples validaciones en población mexicana y latinoamericana (sens. ~88% / esp. ~88%, corte ≥10) | Sí (PRIME-MD) |
| **GAD-7** (Spitzer et al., 2006) | Ansiedad generalizada | 7 | 2–3 min | Sí, validado en español (cortes 5/10/15) | Sí |
| **PG-13** (Prigerson et al.; adaptación española Estevan et al., 2019) | Duelo prolongado | 13 | ~10 min | Validado al castellano (alfa 0.92; esp. 94%) | Sí |
| **RDC** (Parkes & Weiss; adapt. García-García 2001) | Riesgo de duelo complicado | 8 | ~5 min | Validado al castellano | Sí |
| PHQ-4 | Malestar combinado (depresión+ansiedad) | 4 | <1 min | Sí | Sí |
| K10 / WHO-5 | Malestar general / bienestar | 10 / 5 | — | Sí | Sí |

Fuentes: Kroenke et al. (2001); Spitzer et al. (2006); Estevan Burdeus et al., *Medicina
Paliativa* 2019;26(1):22-35 (DOI 10.20986/medpal.2019.1033/2019); guía de cribado en español
(formacionpsicoterapia.com, 2026); revisión de tamizaje en atención primaria peruana
(Rev Peru Med Exp Salud Pública 2022;39(3)).

### 1.2 Buenas prácticas de plataformas (intake de matching, no clínico)

- Las plataformas de terapia online (BetterHelp, Talkspace, Alma, Doctoralia) usan un
  **cuestionario de preferencias y motivo de consulta** para el *matching*, separado de
  cualquier tamizaje clínico (literatura: tesis Lund University sobre customer journey de
  plataformas de terapia online; JMIR Mental Health 2020 sobre diseño centrado en usuarios).
- Principio rector (Eholo Health, 2026): un cuestionario previo a la primera sesión **recoge
  datos, no hace terapia**. Funciona bien: motivo de consulta en palabras propias, historial
  terapéutico básico (¿primera vez en terapia?), situación vital básica.
- El matching efectivo usa: **tipo de necesidad** (salud mental vs. duelo/pérdida vs.
  orientación), **tema principal**, **preferencias** (género del terapeuta, horario) — no
  diagnósticos.

## 2. Diseño adoptado para SOMOS-CALMA

Dos bloques, claramente separados:

### Bloque A — Encuesta de matching (obligatoria, ~2 min)

1. **¿Qué tipo de acompañamiento buscas?** (elige uno)
   - Apoyo emocional / salud mental (ansiedad, depresión, estrés…)
   - Duelo y pérdida (muerte de un ser querido)
   - Pérdida no mortuoria (separación, divorcio, cambios de vida)
   - Acompañamiento en enfermedad o fin de vida
   - Orientación educativa / otra
2. **¿Qué te gustaría trabajar?** (multi-selección): ansiedad, estrés, depresión/tristeza,
   duelo por muerte, pérdida o separación, enfermedad propia o de un ser querido,
   autoestima, relaciones familiares, cambios de vida, otro.
3. **Preferencia de género del profesional**: mujer / hombre / indiferente.
4. **Horario preferido**: mañana / tarde / noche / flexible.
5. **¿Es tu primera vez en terapia?**: sí / no.
6. **Motivo de consulta** (abierta, opcional, ≤500 caracteres) — se guarda también en
   `patient_profiles.reason_for_visit`.

El resultado filtra el directorio: bloque 1 y 2 → `specialties[]` del profesional; bloque 3
→ preferencia (informativa, no bloquea); bloque 4 → sugerencia de horario.

### Bloque B — Tamizaje opcional (marcado como OPCIONAL y "no es un diagnóstico")

- **PHQ-9** (9 reactivos, 0–3) → puntaje 0–27 con interpretación estándar.
- **GAD-7** (7 reactivos, 0–3) → puntaje 0–21.
- Si el ítem 9 del PHQ-9 (ideación suicida) es > 0 → se muestra **inmediatamente** la tarjeta
  de crisis (Línea de la Vida 800 911 2000, SAPTEL 55 5259 8121, emergencias 911) y se
  sugiere contacto inmediato. Esto es obligatorio por seguridad clínica.
- Resultado visible solo para el paciente y, de forma agregada, como contexto para el
  profesional que ya tiene cita con él (no en el directorio).

> **Por qué no el PG-13/RDC en el registro:** son instrumentos de cribado con criterio
> temporal (pérdida ≥6 meses) y valor predictivo limitado como autotest (sensibilidad 50%).
> El tamizaje de duelo se deja al profesional en la primera sesión; el bloque A ya deriva a
> tanatólogos sin necesidad de puntuar el duelo.

## 3. Privacidad y ética

- El Bloque B es **opcional y revocable** (el paciente puede borrar sus respuestas desde su
  perfil). Nunca se muestra a otros pacientes ni en el directorio.
- El tamizaje **no filtra el directorio por gravedad** (riesgo de discriminación por
  diagnóstico); solo filtra por necesidad/tema.
- Las reseñas públicas de profesionales son anónimas ("Paciente verificado") — la tabla
  expone una vista sin `patient_profile_id`.
- La calificación del paciente (por el profesional) **no es pública**: solo la ven el propio
  paciente (no), admin y profesionales que ya tienen o tuvieron cita con ese paciente.

## 4. Recordatorios de cita (decisión técnica)

- **Email (Resend, ya integrado):** 24 h antes y 15 min antes, a paciente y profesional, con
  enlace directo a la sala y botón "Agregar a Google Calendar". Edge Function programada con
  pg_cron cada 10 min.
- **Notificación in-app ("alarma"):** misma Edge Function inserta en `notifications`
  (campana en vivo vía Realtime, ya existe en los 3 portales).
- **WhatsApp:** NO se puede enviar un mensaje automático de WhatsApp sin la **WhatsApp
  Business API** (Meta Cloud API o proveedores como Twilio/360dialog), que requiere
  verificación de negocio de Meta y tiene costo por mensaje (~US$0.015–0.08 según
  categoría/plantilla en México). Las alternativas gratuitas (wa.me con texto prellenado,
  sandbox de Twilio) NO son recordatorios reales. **Decisión:** email + alarma in-app ahora;
  WhatsApp queda como integración posterior cuando el cliente apruebe costo/verificación de
  Meta. Documentado en backlog.

## 5. Referencias

1. Kroenke K., Spitzer R.L., Williams J.B. — The PHQ-9 (2001).
2. Spitzer R.L. et al. — GAD-7 (2006).
3. Estevan Burdeus P. et al. — Adaptación transcultural y validación del PG-13. Med Paliat.
   2019;26(1):22-35. DOI 10.20986/medpal.2019.1033/2019.
4. García-García J.A. et al. — Adaptación del RDC al castellano (2001).
5. Guía de instrumentos de cribado en español — formacionpsicoterapia.com (2026).
6. JMIR Mental Health 2020;7(9):e15972 — diseño centrado en usuarios de plataforma de
   terapia online.
7. Eholo Health — "Qué preguntar antes de la primera sesión" (2026).
8. Meta for Developers — WhatsApp Business Platform / Cloud API pricing.
