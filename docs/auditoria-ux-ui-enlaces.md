# Auditoría UX/UI y enlaces — SOMOS-CALMA

**Fecha:** 2026-07-12  
**Alcance:** sitio estático legacy (`index.html`, `pages/*.html`, `assets/js/*`) + app React (`platform/web/src/*`) + build publicada (`app/`).  
**Método:** revisión estática de código, existencia de archivos y consistencia de rutas.

---

## 1. Enlaces rotos y rutas que fallan

### 🔴 Críticos (rompen la navegación o cargan recursos 404)

| Archivo | Problema | Impacto |
|---------|----------|---------|
| `404.html` (línea 34) | Inyecta la app React con hashes de build obsoletos: `index-CwC8gXFd.js` / `index-D4bszZdh.css`. Los archivos actuales son `index-DqcAZXrK.js` / `index-BvVX-MXa.css`. | Si un usuario entra a una ruta inexistente de `/tanatologia/app/...`, la SPA no cargará (404 de assets). |
| `pages/recursos/carta-a-quien-ya-no-esta.html` | Referencia `../../assets/images/frase-brazos.png` en `<img>` y en metas OG/Twitter. El archivo **no existe** en `assets/images/`. | Imagen rota en artículo de recursos; preview social rota. |
| `pages/login.html` (línea 7) | `<meta http-equiv="refresh" content="0; url=/tanatologia/app/login">` sin `#`. El router es HashRouter. | Redirige a una ruta que GitHub Pages no puede servir como SPA; probablemente de 404. Debería ser `/tanatologia/app/#/login`. |
| `index.html` y páginas públicas | CTA principales apuntan a `/tanatologia/app/#/register?role=patient`, pero el header dice `/tanatologia/app/#/register` (sin role). | El flujo de "Comenzar" no preselecciona rol; genera fricción. |

### 🟡 Placeholders / `href="#"` que no llevan a ningún lado

Aparecen 12 enlaces `href="#"` en el portal de profesionales legacy (`pages/profesionales/*.html`):

- `dashboard.html`: botones "Ingresar" y "Preparar" de próximas consultas.
- `biblioteca.html`: todos los botones "Descargar" (5) y "Ver ficha" (1).
- `aula.html`: botones "Ver conferencia" (3) y "Recordarme" (1).
- `soporte.html`: "Próxima sesión" y "Unirme a la lista de espera".

**Impacto:** confusión para profesionales que prueban el demo; acciones principales no hacen nada.

### 🟢 Rutas relativas bien resueltas

- `assets/js/components.js` detecta `/pages/` y ajusta `root` a `../`. Header/footer y botón de salida rápida se inyectan correctamente.
- `assets/js/atencion-bot.js` usa `BASE = '/tanatologia/'` para rutas absolutas en subcarpetas anidadas.
- `pages/recursos.html` enlaza correctamente a los 4 artículos.
- `portal-components.js` usa rutas relativas `./dashboard.html`, etc.


---

## 2. Navegación

### Sitio legacy

- **Header/footer consistentes:** se inyectan desde `components.js` en todas las páginas revisadas. ✅
- **Skip link:** presente en `index.html` y páginas. ✅
- **Menú móvil:** tiene `aria-label="Abrir menú"` y `aria-expanded` en `components.js`; el toggle funciona. ✅
- **Menú de navegación del header:** orden claro: Nosotros, Para pacientes, Para profesionales, Recursos, Membresías, Encuentra terapeuta, Contacto.
- **CTA duales:** "Iniciar sesión" (ghost) y "Comenzar" (primary) visibles en desktop; en móvil se ocultan (`nav__actions { display: none }`), por lo que el usuario no puede registrarse desde el menú desplegado. ⚠️

### App React

- **RootLayout:** navegación superior clara con logo, links de rol y login/registro. Footer con enlaces legales. ✅
- **Layouts de portal (Patient/Professional/Admin):** sidebar en desktop, menú hamburguesa en móvil. Navegación consistente entre roles. ✅
- **Problema de conversión:** en `RootLayout.tsx` los `navLinks` solo muestran "Cotización" si el usuario no está autenticado. No hay enlace directo a "Registrarme" en la barra de navegación pública más allá del botón superior.
- **Redirección genérica:** `<Route path="*" element={<Navigate to="/" replace />} />` manda cualquier URL desconocida al login, pero sin explicación. Un usuario que escriba mal una URL no sabrá qué pasó.

---

## 3. Responsive

### Legacy CSS

- **Media queries** presentes en `main.css` y `pages.css` para `max-width: 768px`.
- **Problemas detectados:**
  - El portal de profesionales (`pages/profesionales/*.html`) usa `portal-layout { grid-template-columns: 260px 1fr; }`. En móvil la media query cambia a 1 columna, pero **no hay menú hamburguesa ni colapso del sidebar**: el sidebar se apila completo antes del contenido, ocupando mucho scroll vertical. ⚠️
  - Tabla de comparativa en `pages/membresias.html` usa `overflow-x: auto`, lo cual funciona, pero no hay indicador visual de scroll horizontal. ⚠️
  - `grid--2`, `grid--3`, `grid--4` usan `auto-fit` con `minmax`; se adaptan bien en la mayoría de casos. ✅
  - La `video-welcome__player` tiene `max-width: 520px` y se adapta; control de silencio accesible. ✅

### App React

- Uso extensivo de Tailwind (`md:`, `lg:`) para breakpoints. ✅
- Los layouts de portal ocultan sidebar en móvil (`hidden lg:flex`) y muestran header fijo. ✅
- **Problema:** en `PatientLayout`/`ProfessionalLayout`/`AdminLayout` el botón de menú móvil no tiene `aria-label` ni `aria-expanded`. Un lector de pantalla no anunciará su función. ⚠️


---

## 4. Accesibilidad

### Puntos positivos

- `lang="es"` en todas las páginas HTML. ✅
- `meta viewport` presente. ✅
- Skip link funcional en legacy. ✅
- Imágenes revisadas en `index.html` y páginas principales **tienen `alt` descriptivo**. ✅
- Botones del chatbot y WhatsApp flotante tienen `aria-label`. ✅
- El botón de salida rápida tiene `aria-label="Salir rápido de este sitio"`. ✅

### Problemas detectados

| Problema | Ubicación | Impacto |
|----------|-----------|---------|
| **Inputs sin `id` / labels sin `htmlFor`.** | App React: `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `UpdatePasswordPage`, etc., usan `<Label>Texto</Label>` + `<Input ... />` sin asociación explícita. | Lectores de pantalla no relacionan etiqueta con campo. |
| **Selector de especialidad en `TherapistDirectory.tsx`** sin `label` visible ni `aria-label`. | Líneas 107-117 | Usuarios de NVDA/VoiceOver no saben para qué sirve el `<select>`. |
| **Campo de búsqueda en `TherapistDirectory.tsx`** sin `label` ni `aria-label`. | Líneas 97-103 | Idem. |
| **Campo de búsqueda en `biblioteca.html`** sin `label` ni `aria-label`. | Línea 28 | Idem. |
| **Botón menú móvil en layouts de React** sin `aria-label`/`aria-expanded`. | `PatientLayout.tsx`, `ProfessionalLayout.tsx`, `AdminLayout.tsx` | No se anuncia como control de navegación. |
| **Botón cerrar modal en `TherapistDirectory.tsx`** sin `aria-label`. | Línea 219 | Solo muestra icono `X`. |
| **Enlaces `Link` con `target="_blank"`** en `RegisterPage.tsx`. | Líneas 188, 192 | React Router no abre `_blank` como un `<a>` normal; además falta `rel="noopener noreferrer"`. |
| **Contraste del texto sobre fondos con transparencia.** | `.section--glass`, `.section--alt` con texto gris sobre degradados/aurora. | Puede no alcanzar WCAG AA en ciertos fondos animados. Recomendación: verificar con herramienta de contraste. |
| **Animación de fondo aurora.** | `body.page-with-bg::before/::after` con `animation` continua. | Puede afectar a usuarios con trastornos vestibulares; falta `prefers-reduced-motion`. |

---

## 5. Mensajes de error amigables

### App React

- **Errores de formulario:** se muestran en cajas rojas con texto legible (`bg-error/10 text-error text-sm`). ✅
- **Login/Registro:** mensajes genéricos del tipo "Error al iniciar sesión" o directamente `error.message` de Supabase. Algunos mensajes técnicos de Supabase no son amigables (p. ej., "Invalid login credentials"). ⚠️
- **Errores de red:** no hay mensaje específico de "Parece que no tienes conexión". Se muestra el error crudo o "Error al cargar".
- **`QuotePage.tsx` usa `alert(...)` para errores.** | Línea 60 | Rompe el flujo y no es accesible; debería mostrarse inline.
- **Errores en dashboards:** se mandan a `console.error` y no se muestran al usuario. | `PatientDashboard.tsx:45`, `ProfessionalDashboard.tsx:45` | Si falla la carga de citas, el usuario ve "Cargando..." o tarjetas vacías sin saber por qué.

### Legacy

- **Formulario de contacto:** mensajes claros de éxito/error en `main.js`. ✅
- **Matching:** mensaje de error suave si no se selecciona opción. ✅


---

## 6. Estados vacíos y loading

### App React

| Pantalla | Loading | Vacío |
|----------|---------|-------|
| `TherapistDirectory` | ✅ "Cargando profesionales..." | ✅ Icono + CTA a cotización |
| `PatientAppointments` | ✅ "Cargando citas..." | ✅ "No tienes citas registradas." |
| `ProfessionalAgenda` | ✅ "Cargando citas..." | ✅ "No tienes citas registradas." |
| `ProfessionalAppointments` | ✅ "Cargando citas..." | ✅ "No tienes citas registradas." |
| `BookAppointment` | ✅ Spinner de carga de terapeutas | ✅ Lista vacía no contemplada explícitamente |
| `AdminAppointments`, `AdminPatients`, etc. | ✅ Spinner animado | ❌ No hay estado vacío claro en algunas; solo tabla vacía |
| `PatientDashboard` | ✅ "Cargando..." | ✅ "No tienes citas confirmadas próximas." + CTA |
| `ProfessionalDashboard` | ✅ "Cargando citas..." | ✅ "No tienes citas confirmadas próximas." |
| `PatientVideoRoom` / `ProfessionalVideoRoom` | ✅ Spinner | ✅ Mensaje de error si no hay sala |

### Legacy

- El portal de profesionales no tiene estados vacíos explícitos; usa datos de ejemplo fijos.
- Las páginas de recursos individuales no muestran fallback si la imagen no carga.

---

## 7. Botón de salida rápida

- **Legacy:** inyectado por `components.js` en todas las páginas que cargan el script. Estilo `.quick-exit` en `main.css` y `pages.css`. ✅
- **App React:** componente `QuickExitButton.tsx` montado en `RootLayout.tsx`. ✅
- **Problema:** no está presente en los layouts autenticados (`PatientLayout`, `ProfessionalLayout`, `AdminLayout`). Un usuario que entre a `/paciente` no verá el botón de salida rápida. ⚠️
- **Mejora sugerida:** usar tecla de escape como atajo para activar la salida rápida, y redirigir a una URL configurable (no siempre Google) para contextos donde Google pueda ser sospechoso.

---

## 8. Páginas legales

### Legacy

- `pages/aviso-privacidad.html` ✅
- `pages/terminos.html` ✅
- `pages/cancelacion.html` ✅
- `pages/crisis.html` ✅

Todas accesibles desde el footer inyectado por `components.js`.

### App React

- `/aviso-de-privacidad` → `PrivacyPage.tsx` ✅
- `/terminos` → `TermsPage.tsx` ✅
- `/cancelacion` → `CancellationPage.tsx` ✅
- `/crisis` → `CrisisPage.tsx` ✅

Todas accesibles desde el footer de `RootLayout.tsx`.

### Problemas legales

- **Dirección fiscal pendiente:** tanto el HTML legacy como `siteConfig.ts` muestran `[DOMICILIO FISCAL PENDIENTE]`. No se puede publicar un aviso de privacidad sin domicilio fiscal real.
- **Datos de contacto oficiales:** todos los correos apuntan a `lupitamcampuzano@outlook.com`. Es correcto mientras se defina un correo institucional, pero debe documentarse.
- **Última actualización:** 20 de junio de 2026 en legacy; `PrivacyPage.tsx` no muestra fecha de actualización.


---

## 9. Problemas de UX que afectan conversión

### 🔴 Alto impacto

1. **CTA "Comenzar" del header no preselecciona rol.** Lleva a `/register` genérico. El usuario debe elegir rol de nuevo, lo que aumenta abandono.
2. **Página `login.html` redirige mal a la app.** Usuarios que lleguen desde búsquedas o bookmarks verán 404.
3. **404 de la app con assets rotos.** Cualquier URL incorrecta dentro de `/app/` deja al usuario en blanco.
4. **Formulario de contacto legacy redirige a Formspree.** Funciona, pero no hay seguimiento ni captura de leads en la app. Pérdida de conversión.
5. **Página `QuotePage` usa `alert()` para errores.** Mensaje abrupto; muchos usuarios cierran alertas sin leer.

### 🟡 Medio impacto

6. **Matching legacy termina en `membresias.html`.** El flujo de conversión pasa de "encuentra terapeuta" a "opciones y precios", pero no hay registro de datos del usuario; si abandona, se pierde el lead.
7. **No hay indicadores de carga en botones** de algunas acciones (solo en formularios principales).
8. **El footer público de la app solo muestra 3 enlaces.** En el sitio legacy el footer es más rico y mejora SEO/confianza.
9. **No hay página de "Gracias" después del formulario de contacto legacy.** El mensaje aparece bajo el formulario, pero el usuario no es reorientado a una acción.
10. **Imagen rota en artículo de recursos** (`frase-brazos.png`) reduce credibilidad.

### 🟢 Bajo impacto

11. **Meta `og:title` de `membresias.html` habla de "Membresías para profesionales"**, pero el contenido principal es para pacientes. Discordancia que puede confundir en redes sociales.
12. **Botones `href="#"`** en portal de profesionales dan sensación de producto incompleto.

---

## 10. Recomendaciones priorizadas

### Inmediatas (antes de publicidad/tráfico)

1. **Actualizar `404.html`** para que inyecte los assets con los hashes actuales de la build (`app/assets/index-DqcAZXrK.js` y `index-BvVX-MXa.css`). Idealmente automatizar esto en el workflow de GitHub Actions.
2. **Corregir `pages/login.html`**: cambiar redirección a `/tanatologia/app/#/login`.
3. **Crear/reemplazar `assets/images/frase-brazos.png`** o cambiar la referencia en `pages/recursos/carta-a-quien-ya-no-esta.html`.
4. **Agregar `htmlFor`/`id` a todos los formularios de React** o usar el prop `label` del componente `Input`.
5. **Agregar `aria-label` a botones de menú móvil y controles solo-icono** en React.
6. **Incluir `<QuickExitButton />` en `PatientLayout`, `ProfessionalLayout` y `AdminLayout`**.
7. **Reemplazar `alert()` en `QuotePage.tsx`** por mensaje inline con estilo de error.
8. **Mostrar errores de carga en dashboards** (`PatientDashboard`, `ProfessionalDashboard`) en lugar de solo `console.error`.

### Corto plazo

9. **Sincronizar CTA del header legacy** para que "Comenzar" lleve a `/tanatologia/app/#/register?role=patient` y "Soy profesional" sea más prominente.
10. **Añadir `rel="noopener noreferrer"`** a los enlaces legales de `RegisterPage.tsx` y cambiar `Link target="_blank"` por `<a>` si realmente se quiere abrir en pestaña nueva.
11. **Agregar `prefers-reduced-motion`** al fondo aurora y a animaciones de scroll.
12. **Mejorar el responsive del portal legacy** con un sidebar colapsable o menú hamburguesa.
13. **Añadir indicador visual de scroll horizontal** a la tabla de `membresias.html`.
14. **Capturar leads del formulario de contacto legacy** en Supabase (Edge Function o formulario conectado a BD) para seguimiento.

### Mediano plazo

15. **Definir y actualizar domicilio fiscal y correo institucional** en avisos de privacidad y `siteConfig.ts`.
16. **Unificar footer entre legacy y app React** para que ambos tengan la misma riqueza de enlaces legales y de servicio.
17. **Revisar contraste de todos los textos** sobre fondos animados/glass con una herramienta como WebAIM Contrast Checker.
18. **Implementar breadcrumbs** en la app React para portales con muchas páginas.
19. **Añadir tests de integridad de enlaces** al workflow de CI (ej. `lychee` o script propio) para detectar roturas en cada build.


---

## Resumen ejecutivo

El proyecto tiene una **base sólida**: navegación consistente en legacy, buen uso de skip links, alt text en imágenes principales, estados vacíos en la app React y páginas legales accesibles desde ambos sitios. Sin embargo, existen **tres bloqueantes que deben corregirse antes de cualquier campaña de tráfico**:

1. El 404 de la app sirve assets rotos.
2. La página de login legacy redirige a una URL que la SPA no puede servir.
3. Hay enlaces `href="#"` y una imagen rota que dañan la credibilidad.

Además, la accesibilidad de formularios en React y la presencia del botón de salida rápida en zonas autenticadas son mejoras de bajo esfuerzo y alto valor para usuarios en situación vulnerable.
