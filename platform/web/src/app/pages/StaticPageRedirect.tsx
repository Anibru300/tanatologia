import { useEffect } from 'react'

/**
 * Las páginas legales y de crisis viven en el sitio estático
 * (`/pages/*.html`), que es la fuente canónica con SEO y contenido completo.
 * Este componente mantiene compatibilidad con las rutas históricas de la app
 * (`/app/#/aviso-de-privacidad`, etc.) redirigiendo a la versión estática,
 * para no mantener el contenido duplicado en dos lugares.
 */
export function StaticPageRedirect({ to, label }: { to: string; label: string }) {
  useEffect(() => {
    // Se abre en pestaña nueva a propósito: si la app está instalada (PWA),
    // ninguna página pública debe reemplazar la ventana de la app.
    window.open(to, '_blank', 'noopener')
  }, [to])

  return (
    <div className="section-calma">
      <div className="container-calma max-w-md mx-auto text-center">
        <p className="text-text-light">
          Redirigiendo a {label}…{' '}
          <a href={to} className="text-primary-dark hover:underline">
            Ir ahora
          </a>
        </p>
      </div>
    </div>
  )
}
