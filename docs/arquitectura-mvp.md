# Arquitectura del MVP — Plataforma de Tanatología

## Flujo de usuarios

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Paciente      │     │   Plataforma    │     │  Profesional    │
│   (B2C)         │────▶│   (Web/App)     │◀────│   (B2B)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
   Cuestionario              Matching              Perfil + Agenda
   Suscripción              Directorio            Formación (LMS)
   Agenda cita              Videollamada          Expedientes
   Recursos                 Pagos                 Pagos
```

## Módulos del MVP

### 1. Landing y marca
- Página principal con propuesta de valor.
- Secciones: servicios, cómo funciona, planes, testimonios, FAQ, contacto.

### 2. Directorio de profesionales
- Perfiles con foto, especialidad, modalidad, disponibilidad, precio.
- Filtros por especialidad, idioma, modalidad y horario.

### 3. Sistema de matching
- Cuestionario de 4 preguntas.
- Algoritmo simple de filtrado basado en respuestas.
- Mostrar 3 mejores coincidencias.

### 4. Membresías y pagos
- Planes para pacientes (Acompañamiento y Proceso).
- Planes para profesionales (mensual/anual).
- Pasarela Stripe/PayPal con suscripciones recurrentes.

### 5. Formación (LMS)
- Cursos en video para profesionales.
- Exámenes y lecturas.
- Certificados básicos.

### 6. Agenda y videollamadas
- Calendario integrado (Calendly/Acuity).
- Enlaces de videollamada (Daily.co/Whereby/Zoom).
- Recordatorios automáticos.

### 7. Expediente clínico básico
- Notas de evolución post-sesión.
- Historial de citas.
- Acceso restringido solo al profesional.

### 8. Automatizaciones
- Bienvenida tras pago.
- Enlace de agendamiento.
- Recordatorio de sesión.
- Solicitud de nota de evolución.

## Stack tecnológico recomendado

### Opción A: No-Code / Low-Code (recomendado para MVP)
| Capa | Herramienta |
|---|---|
| Web | WordPress + Elementor / Framer |
| LMS | Kajabi / Podia / LearnDash |
| Pagos | Stripe / PayPal Subscriptions |
| Agenda | Calendly / Acuity Scheduling |
| Videollamada | Daily.co / Whereby / Zoom HIPAA |
| Formularios | Typeform / Tally |
| Automatización | Zapier / Make |
| Hosting | SiteGround / Cloudways / Webflow |

### Opción B: Desarrollo a la medida
| Capa | Tecnología |
|---|---|
| Frontend | React / Next.js |
| Backend | Node.js + Express / Python + FastAPI |
| Base de datos | PostgreSQL |
| Auth | Auth0 / Firebase Auth |
| Pagos | Stripe |
| Videollamada | Daily.co API / Twilio |
| Hosting | Vercel / AWS / DigitalOcean |
| CMS/LMS | Sanity / Strapi |

## Decisiones pendientes
- [ ] Definir nombre de marca y dominio.
- [ ] Elegir entre No-Code o desarrollo a la medida.
- [ ] Confirmar país de operación (afecta cumplimiento legal y pasarelas).
- [ ] Validar precios de membresía con profesionales potenciales.
- [ ] Definir si el primer curso de formación ya existe o se debe crear.
