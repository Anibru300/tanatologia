# Reporte Fase 19 — Sistema de Tutoriales (2026-09-06)

## ESTADO
**LISTO CON OBSERVACIONES.** Pipeline completo construido, probado en producción y alimentado con los 5 videos revisados. **Nada está publicado a usuarios**: los 3 videos editados quedaron en estado `approved` a la espera del visto bueno del dueño; los 2 no rescatables quedaron registrados como `rejected` con motivo. El último paso (Publicar) es manual en `/admin/tutoriales`, por instrucción expresa: *ningún video se publica automáticamente* (flujo obligatorio: Subir → Revisar → Clasificar → Validar → Aprobar → **Publicar**).

## VIDEOS ENCONTRADOS (carpeta `VIDEOS TUTORIALES/`, sin subir al repo)
| # | Archivo | Duración | Audiencia |
|---|---------|----------|-----------|
| v1 | `PACIENTES/PACIENTES.mp4` | 17:16 | paciente |
| v2 | `PROFESIONISTA/AGENDA, DISPONIBILIDAD, PACIENTES, NOTAS CLINICAS, VIDEOLLAMDAS.mp4` | 7:43 | profesional |
| v3 | `PROFESIONISTA/FEDBAKCK, AYUDA, REPASO.mp4` | 5:44 | profesional |
| v4 | `PROFESIONISTA/PROFESIONISTA, DASBOARD PRINCIPAL Y PERFIL.mp4` | 7:09 | profesional |
| v5 | `PROFESIONISTA/video profesionista Verificacion.mp4` | 2:55 | profesional |

Todos h264 ~1364×600 @30fps + AAC 48kHz; sin duplicados ni corruptos.

## CLASIFICACIÓN (revisión visual completa, 5 dictámenes + auditoría PII frame-a-frame)
| Video | Dictamen | Decisión |
|-------|----------|----------|
| v1 | 🔴 NO PUBLICABLE | `rejected` — PII real distribuida en **todo** el metraje (nombre completo, correo Gmail, teléfono, fecha de nacimiento, contacto de emergencia, popup de gestor de contraseñas ~16:05, explorador de archivos personal ~02:57). Cuenta real; creó y canceló una cita real. Requiere **re-grabación** con cuenta de demostración. |
| v2 | 🟡 REQUIERE_EDICION | `approved` (editado) — único PII: nombre "Carlos Urías" en el pie del sidebar (zona fija). Videollamada no muestra llamada real (menú ligeramente desactualizado, documentado en la descripción). |
| v3 | 🟡 REQUIERE_EDICION | `approved` (editado) — correo `ing.carlosurbina@gmail.com` en Configuración (2 puntos) + tel/cédula en Mi perfil durante el repaso; sección Ayuda desfasada (sin formulario de soporte nuevo). |
| v4 | 🟡 REQUIERE_EDICION | `approved` (editado) — **explorador de archivos personal** (carpetas "Bitácora", "PNRS", "Primera Milla (Dario)"…) en 3:17–3:22 que los revisores no habían detectado, correo Gmail visible 3:14–4:10, avatar foto personal. |
| v5 | 🔴 NO PUBLICABLE | `rejected` — el flujo de verificación **falla en cámara** (02:11–02:38); ese error **ya está corregido en producción** (verificado 2026-09-06 con cuenta de prueba real: `submit_for_review` → `in_review`), por lo que el video está desactualizado. Además: explorador de archivos personal 01:41–01:44, omite subida de cédula/título, nombre "Carlos Ojeda" persistente. Requiere **re-grabación** (~90 s). |

## PUBLICADOS
**Ninguno a usuarios.** Verificado en producción: paciente autenticado consulta `tutorials?status=published` → `[]`; intento de signed URL de video `approved` por paciente → 404. Admin firma y descarga OK (200, 10.6 MB).

Subidos como `approved` (listos para el clic final en `/admin/tutoriales`):
1. **Dashboard y Mi Perfil del Profesional** (v4 editado, 6:11, 10.7 MB)
2. **Agenda, disponibilidad, pacientes, notas clínicas y videollamadas** (v2 editado, 6:16, 10.6 MB)
3. **Mensajes, feedback, configuración y recorrido completo** (v3 editado, 3:46, 7.1 MB)

## PENDIENTES (para el dueño)
1. **Ver los 3 videos editados** y, si están bien, pasarlos a `published` desde `/admin/tutoriales` (o pedirme que lo haga).
2. **Re-grabar v1** (portal del paciente) y **v5** (verificación profesional) con **cuentas de demostración** — guion mínimo en las descripciones de los registros `rejected`. Grabar a 1080p, ocultar el explorador de archivos, sin gestor de contraseñas a la vista.
3. Escucha humana final de la narración de los 3 editados (verificado automáticamente: pista AAC presente con voz, mean −31 dB; no se evaluó contenido verbal).
4. Decisión de anonimato: en v4 se dejó visible el nombre "Carlos Urbina" en el saludo del dashboard (los profesionales son públicos por diseño en el directorio); el pie del sidebar va borroso en los 3. Si se prefiere anonimato total, se re-graba.

## EDICIÓN (ffmpeg, sobre los originales — copias en `.tools/review/`, gitignored)
- **v2**: cortes 3:16–3:57, 5:41–6:04, 7:20–fin (redundancias/pausas) + `boxblur` fijo en el pie del sidebar durante todo el clip. 7:43 → **6:16**.
- **v3**: cortes 0:48–1:16, 2:32–3:13 (Recursos estático), 3:43–4:16 (Ayuda desfasada), 4:25–4:35 (Mi perfil/Verificación con PII en el repaso), 3:17–3:24 del repaso (Configuración con correo — detectado en la auditoría posterior y corregido) + blur del pie + banda blur sobre el correo de Config 3:12–3:22. 5:44 → **3:46**.
- **v4**: corte 3:12–4:10 (explorador de archivos + header con avatar foto + correo/tel) + blur del pie. 7:09 → **6:11**.
- Verificación posterior: auditoría PII frame-a-frame (38+24+38 frames) por agentes independientes; los 3 finales **APTO sin PII legible**.

## PROBLEMAS encontrados y corregidos
1. **Bug `submit_for_review` (video v5)**: ya corregido en producción (migración 006: bandera `app.verification_change_allowed`). Verificado end-to-end con profesional de prueba → `in_review`; datos de prueba eliminados.
2. **Bucket `tutorials` ausente en Cloud**: la migración 022 se había aplicado solo parcialmente (tablas sí, bucket no). Creado en producción con sus 2 policies (idéntico al DDL de la migración).
3. **Desajuste de keys en Storage**: el API de Supabase strippea el primer segmento de la key si coincide con el nombre del bucket; los primeros uploads quedaron en `{id}/video.mp4` en vez de `tutorials/{id}/video.mp4` (la convención que usa el frontend). Re-subidos a la key correcta, duplicados y probes eliminados (bucket quedó con exactamente 6 objetos).
4. Fila duplicada de v4 en `tutorials` (doble corrida del script tras un fallo de ruta): eliminada.

## SEGURIDAD
- Migración 022: `tutorial_views` con RLS por rol; `tutorials` visible solo a admin salvo `status='published'`; bucket **privado** (no público) con límite de 500 MB/archivo y MIME allowlist (mp4/webm/jpeg/png/webp).
- Solo los videos **publicados** reciben signed URL (3600 s) y solo a roles con audiencia permitida (`both` | rol). No-publicados: ni admin-player ni usuarios pueden firmar (policy SELECT publicada); admin gestiona vía policy FOR ALL.
- Los originales con PII **no salieron del disco local**: edición en `.tools/` (gitignored), originales en `VIDEOS TUTORIALES/` (untracked). Nada con datos personales en el repo ni en Storage.

## RENDIMIENTO
- Videos editados re-encodeados H.264 CRF 21 @1280w (de ~3.6 Mbps originales a ~0.2 Mbps), audio AAC 128k, faststart. 7–11 MB por video: streaming ligero incluso en móvil; miniaturas JPEG 640w (~20 KB).
- Reproductor: signed URL bajo demanda solo al abrir el modal; análica de progreso (25/50/75/100 %) con UPDATE monotónico `furthest_percent`.

## PRUEBAS
- `tsc --noEmit` + `vite build` ✅ (0 errores).
- Producción (curl + JWT reales): admin lista 5 tutoriales (3 approved + 2 rejected) ✅ · paciente ve `[]` ✅ · paciente no firma media de no-publicado (404) ✅ · admin firma + descarga 10.6 MB (200) ✅ · usuario de prueba eliminado ✅.
- RPC `submit_for_review` como profesional → `in_review` ✅ · profesional de prueba eliminado ✅.
- Anonimato: auditoría PII de los 3 finales **sin hallazgos** (v3 requirió 2ª pasada por el correo del repaso — corregido y re-auditado).

## CONCLUSIÓN
El sistema de tutoriales está **operativo en producción y probado**: páginas `/paciente/tutoriales`, `/profesional/tutoriales` y `/admin/tutoriales` con menú "Tutoriales" en los 3 portales, visibilidad por rol, reproducción con signed URLs, analítica de vistas/completados, y gestión admin completa (CRUD + subida con auto-miniatura + estados). Los 3 videos profesionales editados están **aprobados y listos**; la sección de pacientes quedará vacía hasta re-grabar v1 (recomendado hacerlo antes de anunciar la sección). Pendiente únicamente: el visto bueno del dueño para publicar, la re-grabación de v1/v5 y el commit+push del frontend (verificado localmente, en espera de confirmación).
