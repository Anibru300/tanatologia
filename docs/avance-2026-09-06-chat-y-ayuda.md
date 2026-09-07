# Avance 2026-09-06 — Chat en plataforma + rediseño de Ayuda + legales

## Resumen del día
Se construyó y publicó el **chat interno paciente↔profesional** con adjuntos y supervisión
silenciosa del admin, se completó el **rediseño de las secciones de Ayuda** (paciente y
profesional) con paridad total, y se respaldó legalmente la revisión de mensajes.

Todo está en producción (somos-calma.com), probado contra Supabase Cloud, con repo sincronizado.

---

## 1. Chat paciente↔profesional (feature principal)

### Backend — migración 023 (aplicada en Cloud)
- **Tablas:** `conversations` (1 por par paciente/profesional, UNIQUE) y `messages`
  (texto ≤2000 y/o adjunto, `deleted_by_moderation`, `read_at`).
- **Regla de oro:** solo existe conversación si hay ≥1 cita NO cancelada entre ambos (`can_chat()`).
- **Escritura SOLO vía RPCs SECURITY DEFINER:** `start_conversation`, `send_message`
  (crea notificación in-app `chat_message` al otro), `mark_conversation_read`,
  `moderate_message` (admin marca eliminado + `audit_logs`). El cliente jamás inserta directo.
- **Adjuntos:** bucket privado `chat-attachments`, 10 MB/archivo, imágenes + PDF.
  El path ES `{conversation_id}/{uuid}-{nombre}`; la política valida participación.
- **Realtime:** SOLO `conversations` en la publicación (REPLICA IDENTITY FULL). Los `messages`
  NUNCA se publican (su contenido viajaría por WAL sin RLS); al llegar el evento se refetchea por REST.
- **Decisión de seguridad clave:** restringir el broadcast de Realtime a metadatos.

### Frontend
- `src/features/messages/`: `ChatPage` (lista + hilo, responsive móvil/desktop),
  `ConversationThread` (burbujas, preview de imágenes, PDF descargable, Enter envía, leídos),
  `messagesService` (CRUD + suscripciones + signed URLs con cache + rollback de adjuntos).
- Accesos: menú "Mensajes" en ambos portales + botón **"Mensaje"** en `ProfessionalPatients`,
  `ProfessionalAppointments` y `PatientAppointments` (navega `?with=<profile_id>`).
- `MessagesInterim.tsx` **eliminado**.

### Supervisión silenciosa del admin
- Panel `/admin/chats` (menú "Chats"): DataTable de conversaciones, lectura de hilos completos,
  eliminación de mensajes con `ConfirmDialog`. Los participantes ven "Mensaje eliminado por
  moderación" **sin identidad del admin y sin indicador de lectura**. El admin no puede enviar mensajes.

### Pruebas
- `platform/web/scripts/test-chat.mjs` → **28/28 contra Cloud** (RLS negativos, MIME .exe
  rechazado, adjunto fuera de conversación rechazado, moderación auditada, cleanup 0 restantes).
  Uso: `ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/test-chat.mjs`.
- Quirk encontrado: `POST /storage/v1/object/sign/...` requiere body `{ expiresIn: 3600 }`
  (body vacío → 400).

---

## 2. Rediseño de Ayuda (paciente + profesional) — paridad total

Ambas secciones (`PatientHelp`, `ProfessionalHelp`) quedaron idénticas en funcionalidad:
- FAQ en acordeón con **buscador que busca también en el texto de las respuestas** y
  chips de categoría.
- **Chips de tema que pre-llenan el asunto** `[Tema] — describe tu duda` + scroll y foco al mensaje.
- Paciente: 12 FAQs / 4 categorías + tarjeta crisis 911 + banner a su tutorial.
- Profesional: 14 FAQs / 6 categorías (incl. NOM-004 y recordatorios automáticos) + banner a sus 4 tutoriales.
- Contacto solo Correo + WhatsApp (botón Teléfono eliminado en ambos).
- Formulario usa la Edge Function `support-request` (asunto pre-llenado llega al inbox).

Commits: `6bddf04` (mejoras profesional), `fb3b606` (paridad paciente), `e1fa441` (rediseño paciente previo).

---

## 3. Legales — cláusula de revisión de mensajes

- **Términos 10.4:** mensajes cifrados/confidenciales; SOMOS-CALMA puede revisarlos con fines de
  seguridad, prevención de fraude, cumplimiento y verificación de reportes; sin monitorización
  sistemática del contenido terapéutico.
- **Aviso de Privacidad 3.1:** finalidad primaria para operar la mensajería incluyendo su revisión.
- Commit: `360e02f`. Respaldan legalmente el panel de moderación sin revelar detalles operativos.

---

## Estado final
- Repo: local = remoto, 0 pendientes. Build + Pages OK en cada push.
- Migración 023 aplicada y verificada en Cloud (tablas, 6 funciones, 3 políticas RLS + 2 de storage, bucket).
- AGENTS.md actualizado con la sección "Chat paciente↔profesional (2026-09-06, migración 023)".

## Pendientes conscientes (no bloqueantes)
1. **PRs de Dependabot abiertos** (#12, #13, #17, #18, #19): majors de typescript/tailwind/acciones
   de CI — revisar con calma antes de mergear (riesgo de romper build). El usuario los ve como
   "pendientes" en GitHub.
2. **Prueba real de chat entre usuarios reales** (paciente/profesional de la Beta) — recomendada
   antes de anunciar la funcionalidad.
3. **Decisión pendiente del cliente (Hostinger):** crear buzón/reenvío MX de hola@somos-calma.com
   para recuperar el remitente institucional (Plan B sigue en lupitamcampuzano@outlook.com).
4. **WhatsApp en recordatorios:** requiere WhatsApp Business API (de pago) — decisión del cliente.
5. Deuda documentada: re-grabación de tutoriales v1/v5 (PII y flujo desactualizado) cuando haya tiempo.

## Próximos pasos sugeridos
- Dejar operar la Beta y observar adopción del chat (métricas en `/admin/analiticas` + feedback).
- Resolver MX de Hostinger (pendiente del cliente).
- Cuando haya tracción: pagos (Openpay tarjeta+SPEI, PayPal) — ver backlog-post-beta.
