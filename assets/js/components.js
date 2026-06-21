/**
 * Componentes reutilizables: header y footer.
 * Detecta automáticamente si la página está en /pages/ para ajustar rutas.
 */
(function () {
    function getRootPath() {
        const path = window.location.pathname;
        return path.includes('/pages/') ? '../' : './';
    }

    const root = getRootPath();

    const headerHTML = `
    <header class="header">
        <nav class="nav container">
            <a href="${root}index.html" class="logo">Tanatólogo</a>
            <button class="nav__toggle" aria-label="Abrir menú" aria-expanded="false">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <ul class="nav__menu">
                <li><a href="${root}pages/pacientes.html">Para pacientes</a></li>
                <li><a href="${root}pages/profesionales.html">Para profesionales</a></li>
                <li><a href="${root}pages/membresias.html">Membresías</a></li>
                <li><a href="${root}pages/matching.html">Encuentra terapeuta</a></li>
                <li><a href="${root}index.html#contacto">Contacto</a></li>
            </ul>
            <div class="nav__actions">
                <a href="${root}pages/login.html" class="btn btn--ghost btn--sm">Iniciar sesión</a>
                <a href="${root}pages/matching.html" class="btn btn--primary btn--sm">Comenzar</a>
            </div>
        </nav>
    </header>
    `;

    const footerHTML = `
    <footer class="footer">
        <div class="container">
            <div class="footer__grid">
                <div class="footer__brand">
                    <a href="${root}index.html" class="logo">Tanatólogo</a>
                    <p>Plataforma especializada en tanatología y salud mental. Formación para profesionales, acompañamiento para quienes duelen.</p>
                </div>
                <div>
                    <h4 class="footer__title">Pacientes</h4>
                    <ul class="footer__links">
                        <li><a href="${root}pages/matching.html">Encontrar terapeuta</a></li>
                        <li><a href="${root}pages/membresias.html">Membresías</a></li>
                        <li><a href="${root}pages/pacientes.html">Cómo funciona</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="footer__title">Profesionales</h4>
                    <ul class="footer__links">
                        <li><a href="${root}pages/profesionales.html">Únete al directorio</a></li>
                        <li><a href="${root}pages/profesionales.html#formacion">Formación</a></li>
                        <li><a href="${root}pages/login.html">Iniciar sesión</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="footer__title">Legal</h4>
                    <ul class="footer__links">
                        <li><a href="#">Aviso de privacidad</a></li>
                        <li><a href="#">Términos y condiciones</a></li>
                        <li><a href="#">Política de cancelación</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer__bottom">
                <p>&copy; <span id="year"></span> Tanatólogo. Todos los derechos reservados.</p>
            </div>
        </div>
    </footer>
    `;

    function injectComponents() {
        const headerPlaceholder = document.getElementById('header-component');
        const footerPlaceholder = document.getElementById('footer-component');

        if (headerPlaceholder) {
            headerPlaceholder.outerHTML = headerHTML;
        }

        if (footerPlaceholder) {
            footerPlaceholder.outerHTML = footerHTML;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectComponents);
    } else {
        injectComponents();
    }
})();
