# SOMOS-CALMA

Plataforma mexicana de acompañamiento emocional y tanatología. Conecta a personas en proceso de duelo con tanatólogos y psicólogos verificados, con videollamadas integradas, y ofrece a los profesionales un portal con agenda, pacientes, notas clínicas y verificación documental.

🌐 **Sitio en producción:** https://somos-calma.com (app: https://somos-calma.com/app/)

## Estructura del proyecto

```
tanatologia/
├── index.html, pages/, assets/   # Sitio estático público (16 páginas, GitHub Pages)
│   ├── pages/                    # pacientes, profesionales, membresías, matching,
│   │                             # legales (aviso de privacidad, términos), crisis…
│   └── assets/                   # CSS, JS, imágenes (incluye fotos/videos de fundadoras)
├── app/                          # Build compilado de la plataforma React (generado por CI)
├── platform/
│   ├── web/                      # Plataforma React 19 + Vite + TypeScript + Tailwind
│   │                             # (portales de paciente, profesional y admin)
│   └── supabase/                 # Migraciones SQL y Edge Functions (PostgreSQL + RLS)
├── docs/                         # Brief, arquitectura, roadmap, auditorías y bitácoras
├── recursos/                     # Material original fuera del sitio (no publicado)
└── .github/workflows/            # CI/CD: lint + tests + build + deploy a /app
```

> El repositorio se llama `tanatologia`, pero la marca es **SOMOS-CALMA**.

## Stack

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS, React Router (HashRouter), Lucide.
- **Backend:** Supabase (Auth, PostgreSQL con RLS y triggers ACID, Edge Functions, Storage).
- **Videollamadas:** Jitsi Meet (`meet.jit.si`) con chequeo previo de cámara/micrófono,
  ventana de acceso por cita y dominio configurable (`VITE_JITSI_DOMAIN`) para migrar a JaaS.
- **Correo:** Resend vía Edge Functions (confirmaciones, cotizaciones, formulario de contacto).
- **Analytics:** Google Analytics 4 + Search Console verificado.

## Desarrollo local

```bash
cd platform/web
cp .env.example .env   # completa las claves de Supabase
npm install
npm run dev            # servidor local
npm run test           # pruebas con Vitest
npm run lint           # oxlint
npm run build          # build de producción (tsc + vite)
```

La base de datos se inicializa ejecutando las migraciones de `platform/supabase/migrations/`
en orden (001 → 009) desde el SQL Editor de Supabase o con `supabase db query --linked`.

## Calidad y CI/CD

- Cada push/PR a `platform/web/**` corre **lint + tests + build** en GitHub Actions
  (versión propuesta del workflow en `docs/deploy-app.propuesto.yml`; ver PR #1).
- En `main`, el build se publica automáticamente en `/app` (servido en somos-calma.com/app/).
- Dependabot abre PRs semanales de actualización de dependencias.

## Documentación

| Documento | Contenido |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Convenciones, pendientes críticos y guía operativa |
| [`docs/brief-cliente.md`](docs/brief-cliente.md) | Resumen del brief |
| [`docs/arquitectura-mvp.md`](docs/arquitectura-mvp.md) | Arquitectura tecnológica |
| [`docs/roadmap.md`](docs/roadmap.md) | Roadmap de lanzamiento |
| [`docs/paleta-colores.md`](docs/paleta-colores.md) | Paleta terrosa y justificación |
| [`docs/investigacion-plataforma-2026-07-27.md`](docs/investigacion-plataforma-2026-07-27.md) | Benchmark, pagos, legal |

## Modelo de negocio

- **B2C (pacientes):** membresías mensuales con 2 o 4 sesiones.
- **B2B (profesionales):** membresía con formación, directorio y herramientas.
- **Comisión:** la plataforma retiene ~20% por sesión atendida.
- **Pagos:** próximamente tarjeta (Visa/Mastercard), PayPal y SPEI (vía Openpay + PayPal).

## Licencia

Código propietario. Todos los derechos reservados — ver [LICENSE](LICENSE).
