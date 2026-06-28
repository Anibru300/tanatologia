# SOMOS-CALMA

Tu espacio seguro para sanar y encontrar alivio. Plataforma de tanatología y salud mental en México que conecta a personas en proceso de duelo con tanatólogos y psicólogos certificados, mientras forma a profesionales con un modelo de membresía.

## Estructura del proyecto

```
SOMOS-CALMA/
├── assets/                 # Recursos estáticos
│   ├── css/                # Hojas de estilo
│   │   ├── main.css        # Estilos base, componentes y utilidades
│   │   └── pages.css       # Estilos específicos de páginas internas
│   ├── js/                 # Scripts
│   │   ├── components.js   # Header, footer y botón de salida rápida
│   │   ├── main.js         # Menú móvil, validación, smooth scroll
│   │   └── matching.js     # Cuestionario de matching empático
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
│   ├── matching.html       # Cuestionario de matching empático
│   └── login.html          # Pantalla de inicio de sesión
├── index.html              # Página principal
├── .gitignore              # Archivos ignorados por Git
└── README.md               # Este archivo
```

## Paleta de color

La paleta sigue la directriz del cliente: evitar azules clínicos y colores hiper-estimulantes. Se usa una gama terrosa y neutra que transmite calidez, estabilidad y cobijo:

- **Blanco roto (`#F7F5F2`):** fondo general, reduce fatiga visual.
- **Beige suave (`#EDE8E1`):** secciones alternas, calidez.
- **Gris arena (`#E8E4DE`):** fondos de contención.
- **Verde salvia (`#7A8B6E`):** botones principales, crecimiento y calma.
- **Azul sereno (`#7A9AA8`):** acentos secundarios, reduce ansiedad.
- **Terracota suave (`#C9A28E`):** CTAs cálidos, acogida humana.

Más detalles en [`docs/paleta-colores.md`](docs/paleta-colores.md).

## 🌐 Sitio publicado

El sitio ya está publicado en GitHub Pages:

**https://anibru300.github.io/tanatologia/app/**

*Nota: el repositorio se llama `tanatologia`, pero la marca es SOMOS-CALMA. Cuando compres el dominio propio, solo hay que actualizar la URL.*

## Cómo usar en local

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

Proyecto en construcción. Avances definidos:

- ✅ Marca: SOMOS-CALMA
- ✅ País de operación: México
- ✅ Paleta terrosa y tipografía redondeada (Poppins)
- ✅ Flujo de matching empático con una pregunta por pantalla
- ✅ Botón de salida rápida
- ⏳ Dominio propio por configurar
- ⏳ Logo e imágenes reales
- ⏳ Precios finales en MXN
- ⏳ Textos legales (aviso de privacidad, términos)
- ⏳ Perfiles reales de profesionales y testimonios
- ⏳ Stack tecnológico final (No-Code vs. a la medida)
