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

    // Contador animado en estadísticas del hero
    const stats = document.querySelectorAll('.hero__stat strong[data-count]');

    const countUp = (element, target, suffix = '') => {
        if (element.dataset.counted === 'true') return;
        element.dataset.counted = 'true';

        const duration = 1600;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(target * easeOut);
            element.textContent = current.toLocaleString('es-MX') + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = target.toLocaleString('es-MX') + suffix;
            }
        };

        requestAnimationFrame(update);
    };

    if ('IntersectionObserver' in window) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const strong = entry.target.querySelector('strong[data-count]');
                    if (strong) {
                        const target = parseInt(strong.dataset.count, 10);
                        const originalText = strong.textContent.trim();
                        const suffix = originalText.replace(/[0-9,]/g, '');
                        if (!isNaN(target)) {
                            countUp(strong, target, suffix);
                        }
                    }
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        stats.forEach(stat => {
            const statContainer = stat.closest('.hero__stat');
            if (statContainer) statsObserver.observe(statContainer);
        });
    } else {
        stats.forEach(stat => {
            const target = parseInt(stat.dataset.count, 10);
            const suffix = stat.textContent.trim().replace(/[0-9,]/g, '');
            if (!isNaN(target)) stat.textContent = target.toLocaleString('es-MX') + suffix;
        });
    }

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
                const firstInvalid = form.querySelector('[style*="border-color: var(--color-error)"]');
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
            messageEl.style.cssText = 'padding: 0.85rem 1rem; border-radius: var(--radius-sm); background: rgba(122, 158, 126, 0.12); color: var(--color-success); margin-top: 0.5rem; font-weight: 500;';
            form.appendChild(messageEl);
        }
        messageEl.textContent = message;
        setTimeout(() => messageEl.remove(), 5000);
    }
});
