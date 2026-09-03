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

    // Animaciones fade-in al hacer scroll
    const animatedElements = document.querySelectorAll('.section__header, .card, .feature, .step, .pricing__card, .faq__item, .hero__stat');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        animatedElements.forEach((el, index) => {
            el.classList.add('fade-in');
            // Añadir delay escalonado a elementos hermanos
            const delayClass = `fade-in-delay-${(index % 3) + 1}`;
            if (el.parentElement && el.parentElement.children.length > 1) {
                el.classList.add(delayClass);
            }
            observer.observe(el);
        });
    } else {
        animatedElements.forEach(el => el.classList.add('is-visible'));
    }

    // Estadísticas del hero (valores finales estáticos para evitar parpadeos)
    const stats = document.querySelectorAll('.hero__stat strong[data-count]');
    stats.forEach(stat => {
        const target = parseInt(stat.dataset.count, 10);
        const text = stat.textContent.trim();
        const prefix = text.startsWith('$') ? '$' : '';
        const suffix = text.replace(/[0-9,$]/g, '').trim();
        if (!isNaN(target)) {
            stat.textContent = prefix + target.toLocaleString('es-MX') + (suffix ? ' ' + suffix : '');
        }
    });

    // FAQ acordeón
    const faqItems = document.querySelectorAll('.faq__item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq__question');
        const answer = item.querySelector('.faq__answer');

        if (question && answer) {
            // Inicialmente cerrado
            item.classList.remove('is-open');

            question.addEventListener('click', () => {
                const isOpen = item.classList.contains('is-open');

                // Cerrar los demás (comportamiento acordeón)
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('is-open');
                    }
                });

                item.classList.toggle('is-open', !isOpen);
            });
        }
    });

    // Botón volver arriba
    const backToTop = document.createElement('button');
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Volver arriba');
    backToTop.innerHTML = '↑';
    document.body.appendChild(backToTop);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTop.classList.add('is-visible');
        } else {
            backToTop.classList.remove('is-visible');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Validación y envío de formularios
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        // Formularios con manejador propio (contacto, matching, etc.) se saltan
        // este listener genérico para no pintar campos en rojo tras un envío
        // exitoso ni competir con su lógica de validación.
        if (form.id === 'contact-form' || form.hasAttribute('data-external-handler') || form.hasAttribute('onsubmit')) {
            return;
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

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
                const firstInvalid = form.querySelector('[style*="border-color: var(--color-error)"]');
                if (firstInvalid) firstInvalid.focus();
                return;
            }

            const action = form.getAttribute('action');
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton ? submitButton.textContent : '';

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Enviando...';
            }

            // Si el formulario apunta a Formspree u otro servicio externo
            if (action && action.startsWith('http')) {
                try {
                    const formData = new FormData(form);
                    const response = await fetch(action, {
                        method: 'POST',
                        body: formData,
                        headers: { Accept: 'application/json' }
                    });

                    if (response.ok) {
                        showFormMessage(form, 'Gracias por confiar en nosotros. Hemos recibido tu mensaje y te responderemos con calma.');
                        form.reset();
                    } else {
                        showFormMessage(form, 'No pudimos enviar tu mensaje en este momento. Por favor, intenta de nuevo o escríbenos directamente.');
                    }
                } catch (error) {
                    showFormMessage(form, 'Hubo un problema de conexión. Intenta de nuevo en unos momentos.');
                }
            } else {
                // Sin servicio configurado: mensaje honesto, nunca simular un envío
                showFormMessage(form, 'Este formulario aún no está disponible. Escríbenos directamente a hola@somos-calma.com y te responderemos con calma.', 'error');
            }

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    });

    function showFormMessage(form, message, type = 'success') {
        let messageEl = form.querySelector('.form__message');
        if (!messageEl) {
            messageEl = document.createElement('p');
            messageEl.className = 'form__message';
            form.appendChild(messageEl);
        }

        const bgColor = type === 'success' ? 'rgba(122, 158, 126, 0.12)' : 'rgba(212, 163, 115, 0.15)';
        const textColor = type === 'success' ? 'var(--color-success)' : 'var(--color-warning)';

        messageEl.style.cssText = `padding: 0.85rem 1rem; border-radius: var(--radius-sm); background: ${bgColor}; color: ${textColor}; margin-top: 0.5rem; font-weight: 500;`;
        messageEl.textContent = message;
        setTimeout(() => messageEl.remove(), 6000);
    }
});
