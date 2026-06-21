# Tanatólogo

Plataforma web de tanatología y salud mental que conecta a pacientes con tanatólogos y psicólogos certificados, mientras forma a profesionales con un modelo de membresía.

## Estructura del proyecto

```
PROYECTO TANATOLOGO/
├── assets/                 # Recursos estáticos
│   ├── css/                # Hojas de estilo
│   │   ├── main.css        # Estilos base, componentes y utilidades
│   │   └── pages.css       # Estilos específicos de páginas internas
│   ├── js/                 # Scripts
│   │   ├── main.js         # Menú móvil, smooth scroll, año actual
│   │   └── matching.js     # Cuestionario de matching de pacientes
│   ├── images/             # Imágenes del sitio
│   └── fonts/              # Tipografías personalizadas
├── docs/                   # Documentación del proyecto
│   ├── brief-cliente.md    # Resumen del brief recibido
│   ├── arquitectura-mvp.md # Arquitectura tecnológica propuesta
│   ├── paleta-colores.md   # Paleta de color y justificación
│   └── roadmap.md          # Roadmap de lanzamiento
├── pages/                  # Páginas internas
│   ├── pacientes.html      # Landing para pacientes
│   ├── profesionales.html  # Landing para profesionales
│   ├── membresias.html     # Comparativa de planes
│   ├── matching.html       # Cuestionario de matching
│   └── login.html          # Pantalla de inicio de sesión
├── index.html              # Página principal
├── .gitignore              # Archivos ignorados por Git
└── README.md               # Este archivo
```

## Paleta de color

La paleta está basada en investigación de psicología del color para sitios de terapia, duelo y salud mental:

- **Azul pizarra (`#5A7D8C`):** calma, confianza y estabilidad.
- **Verde salvia (`#8FA38C`):** crecimiento, renovación y naturaleza.
- **Terracota suave (`#C9A28E`):** calidez humana y acogida.
- **Crema cálido (`#FAF8F5`):** fondo limpio y reconfortante.
- **Lavanda suave (`#E8E0EB`):** paz, espiritualidad y contención.

Más detalles en [`docs/paleta-colores.md`](docs/paleta-colores.md).

## Cómo usar

1. Abre `index.html` en tu navegador para ver la landing principal.
2. Navega entre las páginas internas en la carpeta `pages/`.
3. Edita estilos en `assets/css/`.
4. Agrega interactividad en `assets/js/`.
5. Reemplaza las imágenes de placeholder en `assets/images/`.

## Modelo de negocio

- **B2C (pacientes):** membresías mensuales con 2 o 4 sesiones.
- **B2B (profesionales):** membresía mensual/anual con acceso a formación, directorio y herramientas.
- **Comisión:** la plataforma retiene ~20% por sesión atendida.

## Arquitectura recomendada para el MVP

Ver [`docs/arquitectura-mvp.md`](docs/arquitectura-mvp.md).

## Roadmap

Ver [`docs/roadmap.md`](docs/roadmap.md).

## Estado

Proyecto en construcción. Se requiere definir:

- Nombre definitivo de marca y dominio.
- Stack tecnológico final (No-Code vs. a medida).
- País de operación y textos legales.
- Primer curso de formación y profesionales fundadores.
