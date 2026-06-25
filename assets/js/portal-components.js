/**
 * Componentes del portal de profesionales de Somos Calma.
 * Inyecta header, sidebar y footer en las páginas del portal.
 */
(function () {
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

    function isActive(page) {
        return currentPage === page ? 'is-active' : '';
    }

    const portalHeaderHTML = `
    <header class="portal-header">
        <div class="container portal-header__inner">
            <a href="../../index.html" class="logo logo--portal">
                <img src="../../assets/images/logo.jpeg" alt="Somos Calma" class="logo__img">
            </a>
            <nav class="portal-header__nav">
                <a href="../../index.html" class="portal-header__link">Volver al sitio</a>
                <a href="../../index.html#contacto" class="btn btn--primary btn--sm">Cerrar sesión</a>
            </nav>
        </div>
    </header>
    `;

    const portalSidebarHTML = `
    <aside class="portal-sidebar">
        <div class="portal-sidebar__brand">
            <span class="portal-sidebar__title">Portal del profesional</span>
            <span class="portal-sidebar__subtitle">Tu espacio de trabajo</span>
        </div>
        <nav class="portal-sidebar__nav">
            <a href="./dashboard.html" class="portal-sidebar__link ${isActive('dashboard.html')}">
                <span class="portal-sidebar__icon">🏠</span>
                <span>Dashboard</span>
            </a>
            <a href="./agenda.html" class="portal-sidebar__link ${isActive('agenda.html')}">
                <span class="portal-sidebar__icon">📅</span>
                <span>Mi Agenda</span>
            </a>
            <a href="./biblioteca.html" class="portal-sidebar__link ${isActive('biblioteca.html')}">
                <span class="portal-sidebar__icon">📚</span>
                <span>Biblioteca</span>
            </a>
            <a href="./aula.html" class="portal-sidebar__link ${isActive('aula.html')}">
                <span class="portal-sidebar__icon">🎓</span>
                <span>Aula Magna</span>
            </a>
            <a href="./soporte.html" class="portal-sidebar__link ${isActive('soporte.html')}">
                <span class="portal-sidebar__icon">🤝</span>
                <span>Soporte y Comunidad</span>
            </a>
        </nav>
        <div class="portal-sidebar__footer">
            <a href="https://wa.me/4772541540?text=Hola%20Lupita%2C%20soy%20profesional%20de%20Somos%20Calma%20y%20necesito%20apoyo" target="_blank" rel="noopener noreferrer" class="portal-sidebar__help">
                <span>🆘</span>
                <span>Botón de alerta</span>
            </a>
        </div>
    </aside>
    `;

    const portalFooterHTML = `
    <footer class="portal-footer">
        <div class="container">
            <p>&copy; <span id="year"></span> Somos Calma. Portal del profesional.</p>
        </div>
    </footer>
    `;

    function injectPortalComponents() {
        const headerPlaceholder = document.getElementById('portal-header-component');
        const sidebarPlaceholder = document.getElementById('portal-sidebar-component');
        const footerPlaceholder = document.getElementById('portal-footer-component');

        if (headerPlaceholder) {
            headerPlaceholder.outerHTML = portalHeaderHTML;
        }

        if (sidebarPlaceholder) {
            sidebarPlaceholder.outerHTML = portalSidebarHTML;
        }

        if (footerPlaceholder) {
            footerPlaceholder.outerHTML = portalFooterHTML;
        }

        const yearSpan = document.getElementById('year');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectPortalComponents);
    } else {
        injectPortalComponents();
    }
})();
