/**
 * Componentes reutilizables: header, footer y boton de salida rapida.
 * Detecta automaticamente si la pagina esta en /pages/ para ajustar rutas.
 */
(function () {
    function getRootPath() {
        const path = window.location.pathname;
        return path.includes('/pages/') ? '../' : './';
    }

    const root = window.SOMOS_CALMA_ROOT || getRootPath();

    const headerHTML = `
    <header class="header">
        <nav class="nav container">
            <a href="${root}index.html" class="logo">
                <img src="${root}assets/images/logo.jpeg" alt="Somos Calma" class="logo__img">
            </a>
            <button class="nav__toggle" aria-label="Abrir menú" aria-expanded="false">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <ul class="nav__menu">
                <li><a href="${root}pages/nosotros.html">Nosotros</a></li>
                <li><a href="${root}pages/pacientes.html">Para pacientes</a></li>
                <li><a href="${root}pages/profesionales.html">Para profesionales</a></li>
                <li><a href="${root}pages/recursos.html">Recursos</a></li>
                <li><a href="${root}pages/membresias.html">Beta gratuita</a></li>
                <li><a href="${root}pages/matching.html">Encuentra terapeuta</a></li>
                <li><a href="${root}index.html#contacto">Contacto</a></li>
            </ul>
            <div class="nav__actions">
                <a href="/app/#/login" class="btn btn--ghost btn--sm">Iniciar sesión</a>
                <a href="/app/#/register" class="btn btn--primary btn--sm">Comenzar</a>
            </div>
        </nav>
    </header>
    `;

    const footerHTML = `
    <footer class="footer">
        <div class="container">
            <div class="footer__grid">
                <div class="footer__brand">
                    <a href="${root}index.html" class="logo logo--footer">
                        <span class="logo__wrap"><img src="${root}assets/images/logo.jpeg" alt="Somos Calma" class="logo__img"></span>
                    </a>
                    <p>Terapia en línea para México, Estados Unidos y Latinoamérica. Tu espacio seguro para sanar y encontrar alivio. Formación para profesionales, acompañamiento para quienes duelen.</p>
                </div>
                <div>
                    <h4 class="footer__title">SOMOS-CALMA</h4>
                    <ul class="footer__links">
                        <li><a href="${root}pages/nosotros.html">Nosotros</a></li>
                        <li><a href="${root}pages/recursos.html">Recursos</a></li>
                        <li><a href="${root}pages/matching.html">Encontrar terapeuta</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="footer__title">Pacientes</h4>
                    <ul class="footer__links">
                        <li><a href="${root}pages/pacientes.html">Cómo funciona</a></li>
                        <li><a href="${root}pages/membresias.html">Beta gratuita</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="footer__title">Profesionales</h4>
                    <ul class="footer__links">
                        <li><a href="${root}pages/profesionales.html">Únete al directorio</a></li>
                        <li><a href="${root}pages/profesionales.html#portal">Formación</a></li>
                        <li><a href="/app/#/login">Iniciar sesión</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="footer__title">Legal</h4>
                    <ul class="footer__links">
                        <li><a href="${root}pages/aviso-privacidad.html">Aviso de privacidad</a></li>
                        <li><a href="${root}pages/terminos.html">Términos y condiciones</a></li>
                        <li><a href="${root}pages/cancelacion.html">Política de cancelación</a></li>
                        <li><a href="${root}pages/crisis.html">Líneas de emergencia</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer__bottom">
                <p>&copy; <span id="year"></span> SOMOS-CALMA. Todos los derechos reservados.</p>
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

    function injectQuickExit() {
        const existing = document.getElementById('quick-exit-btn');
        if (existing) return;

        const btn = document.createElement('button');
        btn.id = 'quick-exit-btn';
        btn.className = 'quick-exit';
        btn.textContent = 'Salir rápido';
        btn.setAttribute('aria-label', 'Salir rápido de este sitio');
        btn.setAttribute('type', 'button');
        btn.addEventListener('click', function () {
            // Reemplaza la página actual por un sitio neutro y común.
            // Esto ayuda a quienes comparten dispositivo o están en situación de riesgo.
            try {
                window.location.replace('https://www.google.com');
            } catch (e) {
                window.location.href = 'https://www.google.com';
            }
        });
        document.body.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectComponents();
            injectQuickExit();
        });
    } else {
        injectComponents();
        injectQuickExit();
    }

    // Cargar configuración centralizada
    const configScript = document.createElement('script');
    configScript.async = false;
    configScript.src = `${root}assets/js/siteConfig.js`;
    document.head.appendChild(configScript);

    // Cargar botón flotante de WhatsApp y bot de atención al cliente
    const whatsappScript = document.createElement('script');
    whatsappScript.async = false;
    whatsappScript.src = `${root}assets/js/chatbot.js`;
    document.head.appendChild(whatsappScript);

    const atencionBotScript = document.createElement('script');
    atencionBotScript.async = false;
    atencionBotScript.src = `${root}assets/js/atencion-bot.js`;
    document.head.appendChild(atencionBotScript);
})();

/* === GOOGLE ANALYTICS 4 (G-CJ0QQ9JY27) === */
(function () {
    if (window.gtag) return; // evitar doble carga
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-CJ0QQ9JY27';
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-CJ0QQ9JY27');
})();
