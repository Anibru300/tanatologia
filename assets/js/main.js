document.addEventListener('DOMContentLoaded', () => {
    // Año actual en el footer
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // Menú móvil
    const toggle = document.querySelector('.nav__toggle');
    const menu = document.querySelector('.nav__menu');

    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!isExpanded));
            menu.classList.toggle('is-active');
        });

        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggle.setAttribute('aria-expanded', 'false');
                menu.classList.remove('is-active');
            });
        });
    }

    // Smooth scroll para anclas
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (event) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Validación básica de formularios
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (event) => {
            const requiredFields = form.querySelectorAll('[required]');
            let isValid = true;

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = 'var(--color-error)';
                } else {
                    field.style.borderColor = '';
                }
            });

            if (!isValid) {
                event.preventDefault();
                const firstInvalid = form.querySelector('[style*="border-color"][required]');
                if (firstInvalid) firstInvalid.focus();
            } else {
                // En este MVP los formularios no envían datos a servidor
                event.preventDefault();
                showFormMessage(form, 'Gracias por confiar en nosotros. Hemos recibido tu mensaje y te responderemos con calma (modo demostración).');
                form.reset();
            }
        });
    });

    function showFormMessage(form, message) {
        let messageEl = form.querySelector('.form__message');
        if (!messageEl) {
            messageEl = document.createElement('p');
            messageEl.className = 'form__message';
            messageEl.style.cssText = 'padding: 0.75rem; border-radius: var(--radius-sm); background: rgba(122, 158, 126, 0.12); color: var(--color-success); margin-top: 0.5rem; font-weight: 500;';
            form.appendChild(messageEl);
        }
        messageEl.textContent = message;
        setTimeout(() => messageEl.remove(), 5000);
    }
});
