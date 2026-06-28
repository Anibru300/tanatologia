# SOMOS-CALMA — Plataforma (Beta)

Aplicación web React + Vite + TypeScript + Tailwind CSS con backend en Supabase.

## Estructura

```
platform/
├── web/                    # Aplicación React
│   ├── src/
│   │   ├── app/            # Router y layouts
│   │   ├── features/       # Módulos: auth, patient, professional, admin
│   │   ├── components/ui/  # Componentes reutilizables
│   │   ├── lib/            # Utilidades y cliente Supabase
│   │   └── styles/         # Estilos globales
│   └── package.json
└── supabase/migrations/    # Esquema SQL
```

## Requisitos

- Node.js 20+
- Cuenta en Supabase (free tier)
- Cuenta en Resend para emails (free tier)

## Configuración

1. Copiar `.env.example` a `.env` y llenar con tus credenciales de Supabase:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

2. Ejecutar el archivo `supabase/migrations/001_initial_schema.sql` en el SQL Editor de Supabase.

3. Instalar dependencias:

```bash
cd platform/web
npm install
```

4. Iniciar servidor de desarrollo:

```bash
npm run dev
```

5. Para producción:

```bash
npm run build
```

## Cuentas demo

- Paciente: `paciente@demo.com` / `demo123`
- Profesional: `profesional@demo.com` / `demo123`
- Admin: `admin@demo.com` / `demo123`

> Estas cuentas son solo para desarrollo. Se reemplarán por autenticación real de Supabase.
