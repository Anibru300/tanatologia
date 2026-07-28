# Investigación y Plan Estratégico — Plataforma SOMOS-CALMA

**Fecha:** 2026-07-27
**Autor:** Consultoría técnica (Kimi Code CLI)
**Alcance:** Benchmark competitivo, auditoría funcional, validación de psicólogos, arquitectura técnica, sistema de pagos, marco legal y roadmap de implementación.

---

## Resumen ejecutivo

SOMOS-CALMA ya cuenta con una base técnica sólida y poco común en MVPs de esta etapa:

- Autenticación real multi-rol con Supabase Auth (paciente / profesional / admin).
- Base de datos PostgreSQL con RLS endurecido, triggers transaccionales y 4 migraciones aplicadas en producción.
- Agendamiento de citas funcional de punta a punta (reserva → registro en DB → sala Jitsi auto-generada → videollamada).
- Panel administrativo con gestión de profesionales, pacientes, citas y cotizaciones.
- Edge Function de correo desplegada (pendiente solo la API key de Resend).

Las brechas críticas para operar como plataforma real son: **(1)** no hay profesionistas reales dados de alta ni flujo de verificación documental; **(2)** los perfiles no persisten cambios; **(3)** no hay disponibilidad/horarios conectados ni notas clínicas; **(4)** no hay notificaciones; **(5)** no hay sistema de pagos (deliberadamente pospuesto); **(6)** sin CI/CD ni pruebas.

La estrategia recomendada: **Fase 1 = operación manual asistida** (validar el negocio con 1–5 profesionistas verificados manualmente, sin pagos), **Fase 2 = robustecer la operación** (notificaciones, disponibilidad real, expediente), **Fase 3 = monetización** (pagos, comisiones, payouts, membresías) con arquitectura diseñada desde hoy para no rediseñar después.

---

# FASE 1 — Benchmark de plataformas competidoras

> Precios y comisiones consultados el 2026-07-27; varían por país y promoción. Fuentes citadas al final de cada apartado.

## 1.1 Panorama general

Existen **dos modelos de negocio dominantes** en el mercado:

- **(A) Marketplace con comisión por sesión**: la plataforma cobra al paciente y se queda con un porcentaje (Terapify ~38%; BetterHelp/Talkspace retienen ~50–70% de la suscripción). Control total de la experiencia, pero exige pasarela de pagos, payouts y facturación.
- **(B) Cuota fija al profesional, sin comisión**: directorio + herramientas SaaS (Doctoralia $1,740–2,970 MXN/mes; Psychology Today $29.95 USD/mes; Encuadrado en Chile). Mucho más simple legal y fiscalmente; el pago de la sesión ocurre fuera de la plataforma.

**El modelo híbrido que describe SOMOS-CALMA (comisión al paciente + membresía al profesionista) combina ambos.** Recomendación: arrancar cobrando solo membresía/comisión simple y evolucionar — no intentar los dos esquemas completos desde el día uno.

## 1.2 Fichas por plataforma

### Doctoralia (México/Latam — directorio + SaaS)
- **Modelo:** gratis para pacientes; el profesional paga suscripción ($1,740 / $2,340 / $2,970 MXN + IVA al mes) + comisión del 2.95–4.95% solo si usa sus pagos online. SaaS de gestión (agenda, recordatorios SMS/WhatsApp, facturación CFDI 4.0, IA de notas clínicas "Noa Notes" $550/mes).
- **Flujo paciente:** búsqueda por especialidad/ubicación/aseguradora → perfil con reseñas (>80% de visitantes las lee) → reserva 24/7 con agenda en tiempo real → recordatorios → reseña moderada.
- **Flujo profesional:** registro en 2 min → **verificación manual de cédula contra SEP en ~24 h** (si no valida en una semana, se elimina el perfil) → configura agenda/precios → widget de reservas para su propia web.
- **Video:** telemedicina propia (solo en planes Plus/VIP); el profesional también puede usar su propia solución.
- **Lección:** la verificación SEP manual en 24 h es el estándar mínimo aceptable; el caso Marilyn Cote (falsa psiquiatra que pasó su verificación) demuestra el riesgo reputacional de fallar.

### BetterHelp (EE. UU. — suscripción con matching algorítmico)
- **Modelo:** suscripción $70–100 USD/semana todo incluido (1 sesión en vivo + mensajería ilimitada). El terapeuta recibe ~$30–70 USD/sesión → la plataforma retiene la mayor parte.
- **Verificación (la más estricta de la industria):** licencia estatal + National Practitioner Data Bank + entrevista + **examen clínico de caso** + 3 años/1,000 h de experiencia + seguro de malpractice. Solo ~1/3 de aplicantes pasa.
- **Sin directorio navegable:** el algoritmo asigna; cambio de terapeuta gratis.
- **Advertencia:** multa FTC 2023 de $7.8 M USD por compartir datos de salud con anunciantes — lección de privacidad.

### Talkspace (EE. UU. — suscripción + seguros)
- **Modelo:** $69–120 USD/sem según nivel (mensajería / video / workshops); fuerte canal B2B y aseguradoras (copago $0 para muchos usuarios).
- **Flujo:** assessment <2 min → el algoritmo propone **3 terapeutas** y el usuario elige → sala digital el mismo día → sesión introductoria de 10 min gratis.
- **Profesionista:** requiere licencia independiente + seguro malpractice + NPI/CAQH; paga $70 USD por sesión de 60 min + extra por mensajería.

### Terapify (México — la referencia más cercana)
- **Modelo:** marketplace de pago por sesión con **precio unificado** (el psicólogo no pone su tarifa): individual ~$449–600 MXN; paquetes de 4/6/8 con 5–15% dto.; **garantía de primera cita** (si no hay conexión, cambio gratis). **Comisión implícita ≈ 38%** (el psicólogo recibe ~62%); **pago semanal** al profesional.
- **Requisitos de admisión:** título + **cédula profesional verificada ante autoridades**, maestría en psicoterapia, **mínimo 5 años de experiencia clínica**, RFC en regla, proceso de admisión.
- **Flujo paciente:** test de afinidad → recomendación o directorio con perfiles (cédula visible, enfoque, opiniones) → calendario en tiempo real → pago (tarjeta, PayPal, transferencia, OXXO) → **videollamada propia integrada** de 50 min → reagendar/cancelar desde la cuenta.
- **Escala:** +400 psicólogos, +300,000 sesiones, también B2B/EAP.

### Psychology Today (directorio puro)
- Cuota fija $29.95 USD/mes, sin comisiones; el paciente contacta directo y la plataforma no cierra el loop (sin pagos ni agenda). Incluye "Sessions", su teleterapia HIPAA gratis. Verificación de licencia inicial y al expirar. Debilidad: saturación — los terapeutas reportan caída de 8–15 contactos/mes a 1–3.

### Calmerry (EE. UU. — suscripción económica)
- $228–360 USD/mes según nivel; asignación por agente humano en ~24 h; terapeuta gana ~$49 USD/h. Sesiones de solo 30 min (debilidad explotable).

### Mindy (Chile — referencia Latam)
- Pago por sesión con precio único; integración con seguros públicos (Fonasa); agenda en 2 min sin registro; **sesión de orientación gratuita de 30 min**; recordatorio por llamada 10 min antes; devolución de primera sesión si no satisface.

### Yana (México — NO marketplace, IA)
- App freemium de autoayuda con chatbot TCC (~$5 USD/mes premium). Relevante como canal de derivación y referencia de protocolo de crisis con IA (fase 5 de nuestro roadmap).

### Otras Latam
- **TerapyX (MX):** primera conexión gratuita de 15 min; sesiones desde $600 MXN; paquetes con 20% dto.
- **Sanarai:** latinos en EE. UU. con psicólogos Latam; primera consulta $25 USD; **usa Zoom** y aun así opera (valida que Jitsi es suficiente para empezar).
- **Encuadrado (Chile):** SaaS sin marketplace (agenda+pagos+ficha clínica), modelo cuota fija.

## 1.3 Tabla comparativa: competencia vs. SOMOS-CALMA

| Funcionalidad | Estándar de mercado | ¿La tenemos? | Prioridad | Complejidad | Recomendación |
|---|---|---|---|---|---|
| Registro/login multi-rol | Universal | ✅ Sí | — | — | Listo |
| Verificación de cédula (SEP) | Universal y obligatoria | ⚠️ Columna existe, sin flujo | **Alta** | Media | Manual primero (24–48 h), semi-automática después (Fase 3) |
| Perfil profesional público (cédula, especialidad, bio, precio, reseñas) | Universal | ⚠️ UI sin persistencia | **Alta** | Baja | Conectar formularios a Supabase |
| Directorio con filtros | Universal | ⚠️ Funciona, sin profesionistas reales | **Alta** | Baja | Depende del alta de profesionistas |
| Reserva con calendario en tiempo real | Universal | ⚠️ Booking funciona pero sin disponibilidad real | **Alta** | Media | Conectar tabla `availability` |
| Videollamada integrada a la cita | Universal | ✅ Sí (Jitsi) | Media | — | Migrar a Jitsi propio/Daily.co antes de cobrar |
| Recordatorios automáticos | Universal (email/SMS/WhatsApp) | ❌ No | **Alta** | Baja | Cron + Resend (email 24 h/1 h) |
| Mensajería asíncrona | Estándar en suscripción (EE. UU.); rara en Latam | ❌ No | Media | Media | Fase 2 con Supabase Realtime |
| Reseñas/calificaciones | Universal | ❌ No | Media | Baja | Fase 2, moderadas por admin |
| Notas clínicas / expediente | Doctoralia, Terapify, Encuadrado | ⚠️ Tabla existe, sin UI | Media | Media | Fase 2, RLS estricto (NOM-004) |
| Pagos y comisiones | Modelo A | ❌ No (deliberado) | Fase 3 | Alta | Ver Fase 5 |
| Membresías/suscripciones | BetterHelp, Talkspace, Calmerry | ❌ No | Fase 3 | Alta | Diseñar sobre Stripe Billing o equivalente |
| Garantía de primera cita | Terapify, Mindy | ❌ No | Media | Baja | Gran diferenciador de conversión; barato de implementar |
| Test de afinidad/matching | BetterHelp, Talkspace, Terapify | ⚠️ Existe `matching.html` estático | Media | Media | Fase 4, cuestionario que filtra el directorio |
| Panel admin con KPIs reales | Universal | ⚠️ Listas reales, dashboard stub | **Alta** | Media | Conectar métricas de DB |
| App móvil | BetterHelp, Talkspace, Terapify | ❌ No | Baja | Alta | Fase 6 (PWA primero) |
| Especialización en tanatología/duelo | **Ningún competidor grande** | ✅ Es nuestro nicho | — | — | **Ventaja competitiva central: explotarla en copy, programas y recursos** |

## 1.4 Patrones y oportunidades clave

1. **El nicho está vacío:** ningún competidor grande se especializa en tanatología/duelo; Terapify y Sanarai solo la listan como una especialidad más. SOMOS-CALMA puede posicionarse como *la* plataforma de duelo en español.
2. **La garantía de primera cita** (Terapify/Mindy) es el diferenciador de conversión más barato de copiar.
3. **Precio unificado vs. tarifa libre:** Terapify unifica precios (simpleza, control de margen); Doctoralia deja tarifa libre (más oferta). Para empezar con pocos profesionistas, **tarifa libre con rango sugerido** es más fácil de reclutar.
4. **Sesiones de 50–60 min** son el estándar Latam; las de 30 min (Calmerry/BetterHelp) generan quejas.
5. **La verificación visible genera confianza:** mostrar "cédula verificada ante SEP" con número en el perfil público (como Terapify) es un diferenciador de confianza barato.
6. **No copiar el modelo de suscripción gringo todavía:** exige mensajería 24/7 y caseload alto; en Latam funciona mejor pago por sesión + paquetes con descuento.

**Fuentes principales:** pro.doctoralia.com.mx/precios · betterhelp.com · talkspace.com · terapify.com + Forbes México (modelo 38/62) · join.psychologytoday.com · calmerry.com/pricing · mindy.cl · sanarai.com · terapyx.com

---

# FASE 2 — Auditoría funcional del proyecto actual

> Se presenta primero que el benchmark porque define la línea base sobre la que se comparan las competidoras (la tabla comparativa de la Fase 1 usa esta misma auditoría).

## 2.1 Módulo Paciente

| Funcionalidad | Estado | Detalle |
|---|---|---|
| Registro | ✅ Funcional | Supabase Auth + trigger crea perfil y subperfil atómicamente |
| Inicio de sesión | ✅ Funcional | Sesión persistente, rutas protegidas por rol |
| Recuperar contraseña | ✅ Funcional | `ForgotPasswordPage` / `UpdatePasswordPage` |
| Editar perfil | ❌ Falta | `PatientProfile.tsx` es formulario sin persistencia |
| Subir fotografía | ❌ Falta | Requiere Supabase Storage + columna `avatar_url` |
| Buscar psicólogos | ⚠️ Parcial | `TherapistDirectory` lee DB real, pero no hay profesionistas verificados dados de alta |
| Filtrar resultados | ⚠️ Parcial | Filtros básicos; falta por especialidad real, precio, disponibilidad |
| Reservar citas | ✅ Funcional | Flujo 4 pasos conectado a `appointments` |
| Cancelar citas | ⚠️ Parcial | Existe estado en DB; falta flujo UX de cancelación con políticas |
| Historial | ❌ Stub | `PatientHistory.tsx` con datos locales |
| Videollamadas | ✅ Funcional | Jitsi `meet.jit.si` con sala aleatoria por cita (trigger SQL) |
| Mensajería | ❌ ComingSoon | Página placeholder |
| Favoritos | ❌ Falta | No existe tabla ni UI |
| Calificaciones/reseñas | ❌ Falta | No existe tabla ni UI |
| Notificaciones | ❌ Falta | Sin in-app ni email (email listo, falta Resend API key) |
| Recordatorios de cita | ❌ Falta | Requiere cron (pg_cron / Edge Function programada) |

## 2.2 Módulo Profesional (psicólogo/tanatólogo)

| Funcionalidad | Estado | Detalle |
|---|---|---|
| Registro | ✅ Funcional | Con metadata de rol; subperfil automático |
| Perfil profesional | ❌ Stub | `ProfessionalProfile.tsx` sin persistencia (bio, especialidades, experiencia, idiomas) |
| Tarifas | ❌ Falta | Campo en UI, sin persistencia ni modelo de precios |
| Horarios/disponibilidad | ❌ Stub | `ProfessionalAvailability.tsx` hardcodeado; tabla `availability` existe en DB sin usar |
| Calendario/agenda | ⚠️ Parcial | `ProfessionalAgenda` lee citas reales; no hay bloqueo de horarios ni sincronización externa |
| Historial de pacientes | ❌ Stub | `ProfessionalPatients.tsx` con datos locales |
| Notas clínicas | ❌ Stub | Tabla `clinical_notes` existe con RLS; sin service ni UI conectada |
| Subida de documentos | ❌ Falta | No hay Storage buckets ni flujo de verificación |
| Validación / estado de aprobación | ⚠️ Parcial | Columna `is_verified` existe y admin puede verificar; falta flujo documental completo (pendiente → en revisión → aprobado/rechazado) |
| Videollamadas | ✅ Funcional | `ProfessionalVideoRoom` con Jitsi |
| Configuración de pagos (CLABE) | ❌ Falta | Sin tabla de datos bancarios |
| Ingresos/reportes/estadísticas | ❌ ComingSoon | `ProfessionalEarnings`, `AdminReports` placeholders |
| Membresía | ❌ ComingSoon | Sin modelo de membresías |

## 2.3 Módulo Administrador

| Funcionalidad | Estado | Detalle |
|---|---|---|
| Dashboard | ❌ Stub | Datos locales; falta KPIs reales (citas, usuarios, ingresos) |
| Gestión de profesionales | ⚠️ Parcial | Lista real + verificación; falta revisión documental y aprobar/rechazar con motivo |
| Gestión de pacientes | ⚠️ Parcial | Lista real; falta detalle, suspensión, edición |
| Gestión de citas | ⚠️ Parcial | Lista real; falta intervención (reagendar, cancelar, reembolsar) |
| Cotizaciones | ✅ Funcional | Tabla `quotes` + panel admin |
| Revisión de documentos | ❌ Falta | No existe (depende de Storage + flujo de verificación) |
| Gestión de pagos/comisiones | ❌ ComingSoon | Fase de monetización |
| Configuración de plataforma | ❌ Stub | `AdminConfig.tsx` local (precios, comisiones, textos deberían vivir en DB) |
| Soporte | ❌ Stub | `AdminSupport.tsx` local; falta bandeja de tickets o integración |
| Auditoría/logs | ⚠️ Parcial | Tabla `audit_logs` existe en DB; `AdminAudit.tsx` no conectado |
| CMS de recursos | ❌ Stub | `AdminCMS.tsx` local; los artículos viven en HTML estático |

## 2.4 Infraestructura y transversales

| Área | Estado | Detalle |
|---|---|---|
| Base de datos | ✅ Maduro | 8 tablas, RLS, triggers, rate-limit de quotes |
| Emails transaccionales | ⚠️ 90% | Edge Function desplegada; falta `RESEND_API_KEY` y dominio propio |
| CI/CD | ❌ Falta | `.github/workflows/` vacío; despliegue manual a `/app/` |
| Tests | ❌ Falta | Cero tests (unitarios, integración, E2E) |
| Monitoreo/errores | ❌ Falta | Sin Sentry ni logging de frontend |
| Almacenamiento de archivos | ❌ Falta | Supabase Storage sin configurar (fotos, documentos) |
| Código muerto | ⚠️ Limpieza | `mockAppointments.ts`, `LandingPage.tsx` sin ruta, `chatbot.js`/`atencion-bot.js` sin referenciar, portal legacy con 12 `href="#"` |
| Legales | ⚠️ Parcial | Aviso/términos con `[DOMICILIO FISCAL PENDIENTE]` |
| Sitio legacy | ✅ Estable | Sin enlaces rotos; convive con la app React |

---

# FASE 3 — Sistema de validación de psicólogos

## 3.1 ¿Se puede consultar la cédula contra la SEP de forma automática?

**Hallazgo técnico (verificado directamente el 2026-07-27):** el portal `cedulaprofesional.sep.gob.mx` es hoy una SPA Angular que consume una API interna (`/api/solr/profesionista/consultar/byDetalle`) protegida con **Google reCAPTCHA por consulta** + token Bearer. Conclusiones:

- ❌ **No existe API pública oficial** documentada.
- ❌ **Scraping propio: NO recomendado.** Requiere bypassear reCAPTCHA (granjas de captcha), es frágil (cambios del sitio rompen el cliente) y de legalidad gris (términos de uso). Riesgo operativo > beneficio.
- ✅ **Los datos de la cédula son de acceso público** por determinación del INAI (resolución RRA 1024/16 y Criterio 15/17): número de cédula, nombre del titular, profesión, institución y año **no son confidenciales**. Consultarlos no requiere consentimiento (LFPDPPP art. 10 fracc. IV). Lo confidencial es la CURP y la firma.
- ✅ **Existen servicios de terceros** que ya resuelven la consulta como API (ellos absorben la capa de captcha):

| Servicio | Qué ofrece | Costo |
|---|---|---|
| **RapidAPI "Consulta Cédula Profesional México" (zohar-devs)** | Solo cédula SEP | Gratis (prueba) / **$44 USD/mes** PRO |
| **Nubarium** (RapidAPI) | Cédula SEP + CURP, RFC, INE, CEP/SPEI, IMSS | **$134 USD/mes** PRO |
| **Kiban** (kiban.cloud) | API limpia: numCédula, nombre, profesión, institución, tipo; **sandbox gratis** | Cotización |
| **AlphaTech CEDULA-FINDER** | Por CURP devuelve todas las cédulas; webhook, zero-retention | Cotización |
| **Círculo de Crédito Identity API** | CURP + INE + cédula en una sola API | Cotización |

## 3.2 Cómo lo hacen los competidores

**Doctoralia y Terapify usan el mismo patrón: revisión humana de documentos + consulta manual al registro SEP + entrevista.** Doctoralia valida en ~24 h y elimina el perfil si no valida en una semana; Terapify exige además maestría, 5 años de experiencia y simulaciones terapéuticas. Nadie en el sector publica un pipeline 100% automatizado — la decisión final es humana. (El caso Marilyn Cote en Doctoralia demuestra el costo reputacional de fallar.)

## 3.3 Documentos a solicitar y almacenamiento seguro

| Documento | ¿Obligatorio? | Para qué |
|---|---|---|
| **Cédula profesional** (número + escaneo/foto) | Sí | Validación contra SEP |
| **Título profesional** | Sí | Respaldo de la cédula |
| **Identificación oficial (INE/pasaporte)** | Sí | Ligar persona↔cédula (la SEP confirma que la cédula existe, NO que quien se registra es el titular) |
| **Comprobante de domicilio** | Sí (KYC/PLD) | Datos fiscales y contractuales |
| **Constancia de situación fiscal + RFC** | Al activar pagos | CFDI y retenciones |
| **CURP** | Opcional/para pagos | Validaciones cruzadas (dato confidencial: cifrar y minimizar) |
| **CLABE bancaria a su nombre** | Al activar pagos | Payouts (validar coincidencia con RFC) |

**Almacenamiento recomendado (Supabase Storage):**
- Bucket privado `professional-documents` con políticas RLS: solo el profesional dueño (`auth.uid()`) y admins pueden leer/escribir.
- URLs firmadas (signed URLs) de corta duración para que el admin revise; nunca URLs públicas.
- Tabla `professional_documents (id, professional_id, type, storage_path, status, reviewed_by, reviewed_at, rejection_reason)` para el flujo de revisión.
- Retención: eliminar documentos de profesionistas rechazados tras el periodo legal definido; registrar todo en `audit_logs` (la tabla ya existe).

## 3.4 Flujo completo de verificación (de la subida a la activación)

```
1. Registro (rol profesional) + acepta T&C, aviso de privacidad y consentimiento de datos
2. Onboarding documental: captura número(s) de cédula + sube título, INE, comprobante
   → estado: pending
3. Automático (Edge Function "verify-cedula"):
   consulta API tercero (RapidAPI $44/mes o Kiban sandbox) con número + nombre
   ├─ cédula encontrada + nombre coincide (fuzzy) + profesión de salud mental
   │   → estado: in_review (pre-aprobado) + evidencia JSON guardada en DB
   └─ no encontrada / no coincide → estado: in_review (con alerta)
4. Admin revisa en panel: documentos (signed URLs) + resultado SEP
   (si la API falló, consulta manual gratuita en cedulaprofesional.sep.gob.mx)
   ├─ aprueba → acepta contrato de prestación de servicios + comisiones
   │   → estado: approved → perfil visible en directorio con badge
   │   "Cédula verificada ante SEP"
   └─ rechaza con motivo → estado: rejected → puede corregir y reenviar
5. Entrevista breve (video 15 min) antes de la primera cita asignada — estándar del sector
6. Re-verificación periódica (cron trimestral) contra SEP
```

**Regla de oro:** la automatización pre-aprueba; **un humano aprueba**. Con el volumen de un MVP (decenas de altas/mes) son ~10 min por verificación.

**Evolución:** Fase 1 → consulta automática + aprobación manual (lo de arriba). Fase 2 → KYC de identidad (INE + selfie) con **Didit** ($0.30/verificación, 500 gratis/mes) o **VerifyMX** (desde $1.80 MXN, mexicano) para ligar persona↔cédula. **No contratar KYC enterprise (Incode/Jumio) en esta etapa.**

## 3.5 Nuevo esquema de datos necesario

```sql
professional_profiles:
  + license_number text          -- cédula
  + verification_status text     -- pending | in_review | approved | rejected (CHECK)
  + verified_at timestamptz, verified_by uuid
  + rejection_reason text
professional_documents (nueva tabla, ver 3.3)
cedula_verifications (nueva: professional_id, request, response jsonb, result, created_at)
```

---

# FASE 4 — Arquitectura técnica recomendada

Stack actual: React 19 + Vite + TypeScript + Tailwind, Supabase (Auth + PostgreSQL + Edge Functions + Storage), Jitsi, GitHub Pages. **La recomendación central es seguir sobre Supabase**: cubre DB, auth, storage, functions y realtime con un solo proveedor y costo mínimo, sin rediseñar nada de lo construido.

| Servicio | Qué hace | ¿Indispensable? | Recomendación | Costo aprox. | ¿Cuándo? |
|---|---|---|---|---|---|
| **Base de datos** | Datos de usuarios, citas, expedientes | Sí (ya existe) | Supabase PostgreSQL (plan Pro al lanzar) | $25 USD/mes | Ya / al lanzar |
| **Autenticación** | Login, roles, sesiones | Sí (ya existe) | Supabase Auth (agregar MFA para admin/profesional después) | Incluido | Ya |
| **Almacenamiento de archivos** | Fotos de perfil, documentos de verificación, recursos | **Sí — es la siguiente pieza** | Supabase Storage con buckets privados + RLS (ver Fase 3) | Incluido (1 GB free) | **Ahora (Fase 1)** |
| **Videollamadas** | Sesiones de terapia | Sí (ya existe) | Corto plazo: Jitsi `meet.jit.si`. **Mediano plazo: migrar** — para datos de salud lo correcto es Jitsi auto-hospedado (VPS) o Daily.co/Whereby con BAA | Jitsi propio: ~$20–40 USD/mes VPS; Daily.co: desde $0 (2,000 min) | Migrar antes de cobrar |
| **Chat/mensajería** | Comunicación paciente–profesional | Media | Supabase Realtime (tabla `messages` + suscripción). Evita pagar Twilio/Stream ($$$) en MVP | Incluido | Fase 2 |
| **Notificaciones** | Recordatorios de cita, avisos | Alta | Emails vía Resend (ya preparado) + notificaciones in-app (tabla `notifications` + Realtime). Push (FCM) solo si hay app móvil | Resend: $0 (100/día) → $20/mes | **Fase 1 (emails)** |
| **Correos** | Transaccionales (confirmación, recibos) | Sí | Resend con dominio propio verificado (SPF/DKIM) | Dominio ~$12 USD/año | **Ahora** |
| **Calendario** | Disponibilidad y agenda | Sí | Tabla `availability` (ya existe) + lógica propia de slots. Integración Google Calendar (OAuth) en fase posterior | $0 | Fase 2 |
| **Recordatorios** | Email 24 h / 1 h antes de la cita | Alta | pg_cron o Supabase Scheduled Edge Function que consulta citas próximas y llama `send-email` | Incluido | Fase 2 |
| **Analytics** | Entender uso y conversión | Media | Plausible/Umami (privacidad-friendly) o PostHog | $0–9/mes | Fase 2 |
| **Logs de errores** | Detectar fallos en producción | Alta | Sentry (frontend + Edge Functions) | $0 (5k eventos) | **Fase 1** |
| **Seguridad** | RLS (✅ ya), rate limiting (✅ parcial), headers | Sí | Agregar: verificación de email obligatoria, MFA admin, políticas de Storage, CAPTCHA (Turnstile, gratis) en registro/quotes | $0 | Fase 1–2 |
| **Backups** | Recuperación ante desastre | Sí | Supabase Pro incluye backups diarios (7 días); export manual mensual a Drive | Incluido en Pro | Al lanzar |
| **Escalabilidad** | Crecer sin reescribir | Diseño desde ya | Índices (✅), lazy loading (✅), paginación en listados, colas con pg_net para jobs | — | Continuo |
| **Monitoreo** | Salud del sistema | Media | Supabase Dashboard + UptimeRobot (gratis) | $0 | Fase 2 |
| **CDN/Hosting** | Servir la app | Sí | GitHub Pages (actual) → **Vercel/Netlify gratis** al tener dominio propio (mejor SPA routing, headers de seguridad) | $0 | Al comprar dominio |
| **Dominio + SSL** | Identidad y confianza | Alta | `somoscalma.mx` o similar; SSL automático en Vercel/Netlify | ~$12–20 USD/año | **Fase 1** |
| **Firewall/anti-ataques** | Protección DDoS/bots | Media | Cloudflare gratis (CDN + WAF básico + Turnstile) | $0 | Al tener dominio |
| **Roles y permisos** | patient/professional/admin | ✅ Ya existe | Mantener RLS como única fuente de verdad; nunca confiar en el frontend | — | Ya |
| **Auditorías** | Trazabilidad de acciones sensibles | Sí (salud) | Conectar `audit_logs` (tabla ya existe) a `AdminAudit` + triggers en cambios de verificación/pagos | $0 | Fase 2 |

### Decisiones de arquitectura clave para no rediseñar después

1. **RLS siempre**: toda regla de acceso en la base de datos, no en React. Esto ya está bien hecho; mantenerlo en cada tabla nueva (`documents`, `messages`, `notifications`, `payments`).
2. **Tablas pensando en pagos desde hoy**: al crear `appointments` ya se guarda lo necesario; agregar columnas `price_mxn`, `platform_fee`, `professional_payout` (nullable) ahora cuesta nada y evita migraciones dolorosas en Fase 3.
3. **Estados explícitos**: máquinas de estado claras con CHECK constraints — `appointments.status` (scheduled/confirmed/completed/cancelled/no_show) y `professional_profiles.verification_status` (pending/in_review/approved/rejected). Ya existe parcialmente; formalizar.
4. **Storage desde el día 1**: definir buckets `avatars` (público), `professional-documents` (privado, solo dueño + admin), `resources` (público).
5. **Jobs asíncronos en DB**: para recordatorios y (después) payouts, usar tablas de trabajo + cron, no lógica en el cliente.

---

# FASE 5 — Sistema de pagos (diseño para segunda etapa)

> No se implementa aún, pero la arquitectura queda definida desde hoy para no rediseñar después. **Advertencia:** las comisiones citadas son públicas a julio 2026 y algunas provienen de fuentes secundarias; verificar antes de contratar. El análisis fiscal tiene zonas grises activas — **validar con contador fiscal mexicano antes de lanzar cobros**.

## 5.1 Comparativa de proveedores para marketplace en México

| | **Openpay (BBVA)** | **Stripe Connect** | **Mercado Pago** | **Conekta** |
|---|---|---|---|---|
| Tarjeta nacional | **2.9% + $2.50** | 3.6% + $3 | 2.9–3.49% + $4 | 3.4% + $3 |
| OXXO/efectivo | 2.9% + $2.50 (Paynet) | 4% + $3 | 3.79% + $4 | **2.6% + $3** |
| SPEI (cobro) | **$8 fijo** | ~$7 (verificar) | ~3.49% + $4 | $12.50 fijo |
| Split/marketplace nativo | ✅ fees + **payouts API a CLABE** | ✅ Connect Express | ✅ Split 1:1 (cae a cuenta MP) | ❌ descontinuado |
| Suscripciones | ✅ | ✅ Billing (mejor dunning, cupones) | ✅ (sin split en suscripciones) | ✅ |
| Costo fijo marketplace | **$0** | $35 MXN/cuenta activa/mes + 0.25% + $12 por payout | $0 | — |
| Liquidación | 1 día hábil (BBVA) | 7 días (1ª), luego 2–3 | Instantáneo–30 días | 48 h (1ª hasta T+10) |
| Soporte español | Sí | Parcial | Sí | Sí |
| Otros | KYC de afiliados más manual | Mejor DX; MSI; OXXO limitado en Connect | Lock-in fuerte; retenciones a cuentas nuevas | 100% mexicana, CNBV |

**Recomendación:**
- **Proveedor primario para empezar: Openpay.** Único stack local que cubre el ciclo completo (cobro tarjeta más barato, OXXO, SPEI $8, suscripciones, **payout programático a CLABE**) sin costos fijos. Con 50 psicólogos activos, Stripe Express costaría ~$1,750 MXN/mes solo en cuentas.
- **Plan B/evolución: Stripe Connect Express** cuando haya tracción (mejor experiencia de desarrollo, KYC delegado a Stripe, Billing superior para membresías, expansión internacional).
- Mercado Pago es buena marca pero con lock-in (el dinero cae a la cuenta MP del psicólogo, no a su banco) y sin payout API a CLABE.

## 5.2 Arquitectura del flujo de dinero

**Modelo recomendado Fase 1 de monetización: "la plataforma cobra y dispersa" (con cautelas regulatorias):**

```
Paciente paga $X (tarjeta/OXXO/SPEI) → cuenta Openpay de SOMOS-CALMA
  → ledger interno: tabla payments (appointment_id, monto_bruto, fee_pasarela,
     comision_plataforma, payout_profesional, retenciones, status)
  → dispersión semanal automática vía Openpay Payout API a la CLABE del psicólogo
     (agrupar payouts reduce el costo fijo por dispersión)
```

Cautelas:
1. **No retener fondos más de lo necesario** (dispersión semanal, no mensual) y firmar **contrato de comisión mercantil** con cada profesionista — retener fondos de terceros indefinidamente puede rozar la figura de IFPE (Ley Fintech).
2. **Evolución a split nativo** (Stripe Connect o MP) cuando el volumen lo justifique: el dinero del psicólogo nunca toca la cuenta de la plataforma → menor riesgo regulatorio y contable.
3. Datos bancarios del profesionista: tabla `professional_payout_accounts` con CLABE **cifrada**, banco, titular, RFC; validar que la CLABE esté a nombre del titular.

## 5.3 Fiscal (decisión arquitectónica crítica)

- **Régimen de plataformas digitales (LISR 113-A a 113-D):** obliga a retener ISR/IVA a quienes venden vía plataformas, pero aplica a "actividades empresariales"; los **honorarios profesionales están fuera según la interpretación dominante** (tema discutido, el SAT lo vigila).
- **Si la plataforma (persona moral) paga honorarios al psicólogo (persona física):** retención ISR 10% (art. 106) y retención IVA de 2/3 (10.6667%) — si el servicio causa IVA. Si el psicólogo está en **RESICO**: retención ISR de solo **1.25%** (art. 113-J).
- **IVA del servicio:** medicina con título está exenta (art. 15 LIVA); **psicología/tanatología generalmente SÍ causa IVA 16%**. Si la plataforma revende el servicio, causa IVA sobre el total. → El modelo **"el psicólogo factura directo al paciente y la plataforma cobra solo su comisión"** puede ser más eficiente fiscalmente que "la plataforma vende y dispersa". **Esta decisión define el checkout: resolverla con contador ANTES de implementar.**

## 5.4 Facturación CFDI 4.0

- Cada psicólogo emite CFDI al paciente con **su propio RFC** (multi-RFC); la plataforma emite CFDI al psicólogo solo por su comisión.
- Proveedores de timbrado API: **Facturapi** ($299 MXN/mes + $0.60/timbre; tiene app lista para Stripe), **Facturama** ($1,650/año + $0.50/folio), **SW Sapien** (paquetes prepago ~$1.89/timbre).
- Requisitos propios: RFC emisor, certificado CSD/e.firma, régimen fiscal (requiere razón social constituida).

## 5.5 Funcionalidades de pago a soportar (checklist de diseño)

| Funcionalidad | Cómo se resuelve |
|---|---|
| Cobro al paciente | Checkout Openpay (tarjeta/OXXO/SPEI); link de pago para cotizaciones |
| Comisión plataforma | Configurable en `platform_settings` (ej. 15–25% sobre la sesión — bajo el ~38% de Terapify como ventaja de reclutamiento) |
| Payout al psicólogo | Payout API semanal; estado `pending/paid/failed` en ledger |
| Reembolsos | API de refunds; nota de crédito CFDI si ya se facturó |
| Cancelaciones | Política por ventana (ej. >24 h reembolso total; <24 h cargo 50%; no-show sin reembolso) |
| Suscripciones/membresías paciente | Planes con N sesiones/mes (Stripe Billing u Openpay suscripciones) |
| Membresía profesionista | Cuota mensual (modelo Doctoralia) — activable después |
| Cupones/promociones | Tabla `coupons` (código, tipo, valor, vigencia, usos) validada en checkout |
| Paquetes de sesiones | 4/6/8 sesiones con 5/10/15% dto. (patrón Terapify probado) |
| Garantía primera cita | Reembolso/reasignación automática si el paciente la reporta |

---

# FASE 6 — Flujo legal

## 6.1 Documentos que debe aceptar el profesionista y en qué momento

| # | Documento | Momento exacto del flujo |
|---|---|---|
| 1 | **Términos y condiciones de la plataforma** | Al crear la cuenta (checkbox obligatorio con versión y fecha registradas) |
| 2 | **Aviso de privacidad** (LFPDPPP) | Junto con T&C en el registro |
| 3 | **Consentimiento de tratamiento de datos personales** (incluye datos sensibles: salud del paciente) | Junto con T&C; checkbox separado por tratarse de datos sensibles |
| 4 | **Contrato de prestación de servicios profesionales** (relación comercial plataforma↔profesional: comisión, payouts, obligaciones, no-exclusividad, terminación) | Después de subir documentos, **antes de activar su perfil** (aceptación electrónica registrada; idealmente firma electrónica simple con registro de IP/fecha) |
| 5 | **Aceptación del esquema de comisiones** (puede ser anexo del contrato) | Mismo paso que el contrato; se muestra el % vigente |
| 6 | **Política de cancelaciones y reembolsos** | Mismo paso; el profesionista se obliga a respetarla |
| 7 | **Carta de confidencialidad y obligaciones profesionales** (secreto profesional, protocolo de crisis, NOM-004 si maneja expediente clínico) | Mismo paso de activación |

**Registro de aceptaciones**: tabla `legal_acceptances (user_id, document_type, version, accepted_at, ip_address)`. Sin esto, las aceptaciones no tienen valor probatorio.

## 6.2 Documentos que acepta el paciente

- T&C + aviso de privacidad + consentimiento de datos sensibles (salud mental = dato sensible, requiere consentimiento expreso según LFPDPPP art. 3 fracc. VI y 8) — en el registro.
- Consentimiento informado de teleterapia (la sesión no sustituye atención de urgencias; protocolo de crisis) — antes de la **primera cita**.
- Política de cancelación/reembolso — al reservar (checkbox en el último paso del booking).

## 6.3 Marco regulatorio aplicable (México)

- **LFPDPPP**: datos de salud son sensibles → consentimiento expreso, aviso de privacidad específico, medidas de seguridad, derechos ARCO. La plataforma es "encargada/responsable" del tratamiento.
- **NOM-004-SSA3-2012** (expediente clínico): si se guardan notas clínicas, aplican requisitos de conservación, confidencialidad y acceso. Las notas deben pertenecer al profesionista, no ser visibles para admin por defecto.
- **NOM-024-SSA3-2012** (sistemas de información de registro electrónico para la salud): si el expediente se vuelve formal.
- **Cédula profesional**: requisito legal para ejercer psicología con fines clínicos (Ley de Profesiones). La verificación SEP es el núcleo del modelo de confianza (ver Fase 3).
- **Publicidad**: cuidado con promesas terapéuticas (COFEPRIS regula publicidad de servicios de salud).
- **Fiscal**: al monetizar, la plataforma retiene/comisiona → obligaciones de CFDI y posiblemente régimen de plataformas tecnológicas (detalle en Fase 5).

## 6.4 Recomendaciones

1. Constituir la razón social (S.A.P.I. de C.V. asumida en los legales aún no existe) y obtener domicilio fiscal **antes de lanzar la beta con usuarios reales** — hoy los textos legales tienen placeholders.
2. Contratar 1–2 horas de abogado para el contrato de prestación de servicios y el consentimiento de teleterapia; el resto puede partir de plantillas.
3. Versionar todos los documentos legales y guardar aceptaciones con IP y fecha.
4. Protocolo de crisis documentado y visible (ya existe página `/crisis` ✅ — enlazarla en el consentimiento informado).

---

# FASE 7 — Roadmap de implementación

## Fase 1 — MVP operable sin pagos (2–3 semanas) ⭐ PRIORIDAD MÁXIMA

**Objetivo:** que un paciente real pueda registrarse, encontrar un profesionista verificado, agendar y tener su videollamada; y que la Dra. Edith (y hasta 4 profesionistas más) operen con verificación manual.

| Entregable | Detalle | Estimación |
|---|---|---|
| Perfiles editables con persistencia | Paciente y profesional guardan en Supabase; foto con Storage | 3–4 días |
| Alta y verificación manual de profesionistas | Bucket privado `professional-documents`, subida de cédula/INE/comprobante, estados `pending/in_review/approved/rejected`, panel admin de revisión documental, consulta manual a cedulaprofesional.sep.gob.mx registrando evidencia | 4–5 días |
| Disponibilidad real | Conectar tabla `availability` (ya existe) → UI de horarios → booking solo muestra slots libres | 2–3 días |
| Emails activados | `RESEND_API_KEY` + dominio propio verificado; confirmación de cita y registro | 1 día |
| Notificaciones básicas | Tabla `notifications` + campana in-app (Realtime) | 2 días |
| Datos fiscales en legales | Sustituir placeholders de aviso de privacidad y términos | Input del cliente |
| Sentry + CI/CD | Monitoreo de errores + workflow GitHub Actions (build → `/app/`) | 1 día |
| Smoke test E2E | Script/manual: registro → verificar → agendar → videollamada → completar | 1 día |
| Limpieza | Borrar código muerto (`mockAppointments`, `LandingPage`, portal legacy o redirigirlo) | 0.5 día |

**Dependencias:** dominio propio, datos fiscales, documentos de la Dra. Edith.
**Riesgos:** sin profesionistas reales no hay nada que probar — la verificación documental es el cuello de botella; por eso se hace manual primero.
**Criterio de salida:** 5+ citas reales completadas de punta a punta sin intervención técnica.

## Fase 2 — Operación robusta (3–4 semanas)

**Objetivo:** que la plataforma se opere sola en lo cotidiano.

- Recordatorios automáticos de cita (cron + email 24 h/1 h antes).
- Mensajería paciente↔profesional (Realtime, tabla `messages` con RLS).
- Notas clínicas conectadas a `clinical_notes` (solo el profesional las ve; RLS estricto; cumplir NOM-004 básico).
- Cancelaciones con política (ventana de tiempo, penalización configurable).
- Dashboard admin con KPIs reales + auditoría conectada a `audit_logs`.
- Calificaciones y reseñas post-sesión (tabla `reviews`, promedio en directorio).
- Favoritos, filtros avanzados del directorio, historial del paciente real.
- Migración de videollamada a Jitsi auto-hospedado o Daily.co (datos de salud).
- Analytics (Umami/PostHog), UptimeRobot, CAPTCHA en formularios públicos.
- Recursos dinámicos (CMS real sobre tabla `resources`).

**Riesgos:** mensajería y notas clínicas elevan el estándar de privacidad (datos sensibles) — revisar RLS y cifrado.
**Criterio de salida:** operación de 2 semanas sin tareas manuales del equipo técnico.

## Fase 3 — Monetización (3–5 semanas)

**Objetivo:** cobrar al paciente, comisionar y pagar al profesionista (diseño completo en Fase 5).

- Checkout con el proveedor elegido (Stripe Connect o alternativa MX — ver comparativa Fase 5).
- Modelo de comisiones configurable en DB (`platform_settings`).
- Datos bancarios del profesionista (CLABE, RFC) cifrados + payouts (automáticos o dispersión semanal).
- Reembolsos y cancelaciones con cargo; cupones/promociones.
- Facturación CFDI 4.0 (Facturapi/Facturama) si se ofrece factura al paciente.
- Contrato de prestación de servicios + aceptación de comisiones (Fase 6) activado en el flujo.
- Membresías/planes para pacientes (suscripción mensual con N sesiones) y plan de profesionistas.

**Dependencias:** razón social constituida, cuenta bancaria empresarial, RFC, contratos legales firmados.
**Riesgos:** regulatorio-fiscal (retenciones plataformas digitales) — validar con contador antes de activar.

## Fase 4 — Automatización y crecimiento (4–6 semanas)

- Verificación de cédula semi-automática (servicio tercero o scraping controlado — ver Fase 3).
- KYC con INE + selfie (Metamap/Truora/Incode) para altas sin revisión manual.
- Matching con cuestionario (especialidad, modalidad, presupuesto) — ya existe `matching.html` estático como base conceptual.
- Integración Google Calendar (sincronización de agenda del profesionista).
- Programas/cursos (LMS básico sobre tabla `programs`).
- Reportes financieros completos para admin y profesionista.

## Fase 5 — Inteligencia artificial (exploración)

- Chatbot de triage/orientación (ya hay `chatbot.js` sin usar como antecedente).
- Sugerencia de profesionista por síntomas (con disclaimers estrictos; nunca diagnóstico).
- Resúmenes de sesión asistidos para el profesionista (requiere consentimiento explícito; alto estándar de privacidad — evaluar con cuidado por datos de salud).

## Fase 6 — Escalabilidad

- App móvil (React Native reutilizando servicios) o PWA avanzada.
- Multi-especialidad (nutriólogos, coaches) reutilizando la misma arquitectura de verificación.
- Métricas de negocio (cohorts, churn, LTV) con PostHog.
- Evaluar migración de hosting según tráfico; réplicas de lectura en Supabase si aplica.

---

# Recomendaciones finales

## Decisiones estratégicas

1. **Quedarse en Supabase** (DB + Auth + Storage + Edge Functions + Realtime). Cubre el 90% de lo que falta sin nuevos proveedores ni rediseño.
2. **El nicho de tanatología/duelo es la ventaja competitiva real** — ningún competidor grande lo ocupa. Reflejarlo en verificación (validar formación tanatológica además de psicológica), programas, recursos y copy.
3. **Operación manual asistida primero, automatización después.** El patrón probado del sector (Doctoralia/Terapify) es: API de consulta como apoyo + decisión humana + entrevista. No sobre-ingenierizar el MVP.
4. **Sin pagos hasta validar la operación** (decisión correcta del equipo). Pero dejar preparadas las columnas de dinero en `appointments` y la tabla de aceptaciones legales desde ya — cuesta horas hoy, semanas después.
5. **Resolver lo fiscal con contador antes de activar cobros**: el modelo "psicólogo factura al paciente + plataforma cobra comisión" vs. "plataforma revende" cambia IVA, retenciones y el diseño del checkout.
6. **Constituir la razón social y domicilio fiscal** — desbloquea legales reales, Openpay/Stripe, facturación y contratos. Es el bloqueante raíz de la monetización.

## Las 10 acciones inmediatas (ordenadas)

1. Alta de la Dra. Edith como profesional (datos + documentos) — sin esto no hay qué probar.
2. Implementar flujo de verificación documental (Storage + estados + panel admin) — Fase 3 de este documento.
3. Conectar persistencia de perfiles (paciente y profesional) + foto con Storage.
4. Conectar `availability` para que el booking muestre solo horarios reales.
5. Activar Resend (API key + dominio propio) → confirmaciones de cita.
6. Sustituir placeholders fiscales en textos legales.
7. Dominio propio + migrar hosting a Vercel/Netlify + Cloudflare.
8. Sentry + workflow de GitHub Actions (build → `/app/`).
9. Smoke test E2E del flujo completo con usuarios reales.
10. Agregar columnas financieras nullable a `appointments` y tabla `legal_acceptances` (preparación de pagos sin implementar pagos).

## Riesgos principales

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Verificar mal a un profesionista (caso Marilyn Cote) | Reputacional/legal severo | Flujo Fase 3: documentos + SEP + entrevista + badge visible |
| Datos de salud mental mal protegidos | Legal (LFPDPPP) + reputacional | RLS estricto, Storage privado, Jitsi propio antes de cobrar, Sentry sin PII |
| Zona gris fiscal de plataformas | Fiscal | Contador antes de Fase 3 de monetización; contrato de comisión mercantil |
| Retener fondos de terceros (Ley Fintech) | Regulatorio | Dispersión semanal; migrar a split nativo al crecer |
| meet.jit.si público para datos de salud | Privacidad | Migración a Jitsi propio/Daily.co en Fase 2 (Sanarai opera con Zoom: no es bloqueante hoy) |
| Sin profesionistas no hay marketplace | Negocio | Reclutar 5–10 profesionistas manualmente con comisión baja de lanzamiento |

## Costos mensuales estimados por etapa

| Etapa | Servicios | Costo aprox. |
|---|---|---|
| **Hoy (MVP sin pagos)** | Supabase Free/Pro $25 + Resend $0 + dominio ~$1 + API cédula RapidAPI $44 (opcional; manual = $0) + Sentry $0 | **$25–70 USD/mes** |
| **Operación robusta** | + Supabase Pro $25 + Resend $20 + Jitsi VPS $30 + KYC Didit (uso) | **~$100 USD/mes** |
| **Con pagos** | + Openpay (solo comisión por transacción, $0 fijo) + Facturapi $18 + contador | **~$150 USD/mes + % por transacción** |

---

*Documento generado a partir de: auditoría directa del código del repositorio, investigación web con fuentes citadas (precios/comisiones consultados el 2026-07-27 y sujetos a cambio) y buenas prácticas de la industria de marketplaces de salud mental. Validar los puntos fiscales y legales con profesionales mexicanos antes de ejecutar las fases de monetización.*
