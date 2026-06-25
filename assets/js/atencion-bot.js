/**
 * Bot de Atención al Cliente de Somos Calma.
 * Tono humano, cercano y pausado. Simula escritura y ofrece respuestas útiles.
 */
(function () {
    const WHATSAPP_NUMBER = '5214772541540';
    const WHATSAPP_MESSAGE = encodeURIComponent('Hola Lupita, tengo una pregunta sobre Somos Calma. ¿Me puedes ayudar?');
    const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

    const typingMessages = [
        'Déjame buscar la mejor respuesta para ti...',
        'Un momento, por favor. Respira.',
        'Estoy revisando la información...',
        'Gracias por tu paciencia. Ya casi está.',
        'Aquí estoy, con toda la atención para ti.'
    ];

    function getRootPath() {
        const path = window.location.pathname;
        return path.includes('/pages/') ? '../' : './';
    }

    const root = getRootPath();

    const conversationTree = {
        welcome: {
            message: 'Hola, soy tu asistente de Somos Calma. Estoy aquí para aclarar tus dudas con calma. ¿En qué puedo ayudarte hoy?',
            options: [
                { id: 'precios', label: '¿Cuánto cuesta una sesión?' },
                { id: 'programas', label: '¿En qué consisten los programas?' },
                { id: 'horarios', label: '¿A qué horas puedo agendar?' },
                { id: 'psicologo_vs_tanatologo', label: '¿Necesito psicólogo o tanatólogo?' },
                { id: 'profesional', label: 'Soy psicólogo/tanatólogo y quiero unirme' },
                { id: 'humano', label: 'Quiero hablar con una persona' }
            ]
        },
        precios: {
            message: 'Tenemos opciones accesibles:\n\n• Consulta aislada: $400 MXN (una sesión de 50 minutos).\n• Programa de bienestar emocional: 4 sesiones.\n• Programa de duelo, muerte o pérdida: 6 sesiones.\n\nLos programas tienen precios por paquete que puedes consultar directamente con nosotros.',
            options: [
                { id: 'como_pagar', label: '¿Cómo puedo pagar?' },
                { id: 'descuento', label: '¿Hay descuentos?' },
                { id: 'programas', label: 'Cuéntame más de los programas' },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        como_pagar: {
            message: 'Actualmente coordinamos el pago de forma sencilla. Al agendar te indicamos las opciones disponibles. También puedes escribirle a Lupita por WhatsApp y ella te guía paso a paso.',
            options: [
                { id: 'agendar', label: 'Quiero agendar una sesión', primary: true },
                { id: 'whatsapp', label: 'Escribir por WhatsApp', primary: true, external: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        descuento: {
            message: 'De vez en cuando tenemos promociones de lanzamiento. Si te interesa, te sugiero escribirnos por WhatsApp para que Lupita te cuente las condiciones actuales.',
            options: [
                { id: 'whatsapp', label: 'Escribir por WhatsApp', primary: true, external: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        programas: {
            message: 'Diseñamos dos caminos sencillos:\n\n🧠 Bienestar emocional (4 sesiones): para ansiedad, estrés, depresión o autocuidado. Lo imparte un psicólogo.\n\n🕊️ Duelo, muerte o pérdida (6 sesiones): para acompañarte en una pérdida. Lo imparte un tanatólogo.\n\nAmbos incluyen material de apoyo entre sesiones.',
            options: [
                { id: 'psicologo_vs_tanatologo', label: '¿Psicólogo o tanatólogo?' },
                { id: 'agendar', label: 'Quiero comenzar un programa', primary: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        horarios: {
            message: 'Nuestra cobertura es de 7:00 a.m. a 11:00 p.m., todos los días de la semana. Tú eliges el horario que mejor se ajuste a tu día.',
            options: [
                { id: 'agendar', label: 'Agendar una sesión', primary: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        psicologo_vs_tanatologo: {
            message: 'Te ayudo a decidir:\n\n• Si lo que vives está relacionado con ansiedad, depresión, estrés o bienestar emocional general, te vinculamos con un psicólogo.\n\n• Si atraviesas un duelo por muerte, una ruptura, una pérdida importante o una enfermedad, te vinculamos con un tanatólogo.\n\nSi no estás seguro, el matching te orienta.',
            options: [
                { id: 'matching', label: 'Hacer el matching', primary: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        profesional: {
            message: 'Qué gusto que quieras ser parte. La membresía para profesionales es de $300 MXN trimestrales e incluye:\n\n• Perfil en nuestro directorio.\n• 2 conferencias magistrales al mes grabadas.\n• Biblioteca con libros, mapas mentales y actividades.\n• Flexibilidad de horarios y flujo de pacientes.',
            options: [
                { id: 'requisitos', label: '¿Cuáles son los requisitos?' },
                { id: 'portal', label: 'Ver demo del portal' },
                { id: 'aplicar', label: 'Aplicar como profesional', primary: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        requisitos: {
            message: 'Buscamos psicólogos y tanatólogos con:\n\n• Cédula profesional vigente.\n• Formación o experiencia en el área.\n• Competencias digitales básicas.\n• Habilidades de escucha, empatía y manejo de crisis.\n\nEl proceso incluye un formulario, una entrevista con roleplay y una inducción.',
            options: [
                { id: 'aplicar', label: 'Aplicar como profesional', primary: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        humano: {
            message: 'Por supuesto. A veces nada sustituye una conversación humana. Puedes escribirle a Lupita Muñoz por WhatsApp; ella te responderá con calma.',
            options: [
                { id: 'whatsapp', label: 'Escribir a Lupita por WhatsApp', primary: true, external: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        },
        emergencia: {
            message: 'Lamento mucho que estés pasando por esto. Somos Calma no sustituye la atención de emergencia. Si tú o alguien cercano está en riesgo inminente, llama al 911 o a una línea de crisis.',
            options: [
                { id: 'crisis', label: 'Ver líneas de emergencia', primary: true },
                { id: 'volver', label: 'Ver otras opciones' }
            ]
        }
    };

    const actionHandlers = {
        agendar: { href: 'pages/matching.html' },
        matching: { href: 'pages/matching.html' },
        whatsapp: { href: WHATSAPP_URL, external: true },
        aplicar: { href: 'pages/profesionales.html' },
        portal: { href: 'pages/profesionales/dashboard.html' },
        crisis: { href: 'pages/crisis.html' }
    };

    const botHTML = `
    <div class="atencion-bot" id="atencion-bot">
        <button class="atencion-bot__toggle" id="atencion-bot-toggle" type="button" aria-label="Abrir atención al cliente">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.5 10.5V13h-2v-2.5c0-2.48-2.02-4.5-4.5-4.5S8.5 8.02 8.5 10.5V13h-2v-2.5C6.5 6.46 9.96 3 14 3s7.5 3.46 7.5 7.5z"/>
                <path d="M3 13.5C3 12.67 3.67 12 4.5 12S6 12.67 6 13.5v3C6 17.33 5.33 18 4.5 18S3 17.33 3 16.5v-3zM18 13.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-3z"/>
                <path d="M7 13h10v3c0 2.76-2.24 5-5 5s-5-2.24-5-5v-3z"/>
                <path d="M11 18h2v3h-2z"/>
            </svg>
            <span class="atencion-bot__label">Atención al Cliente</span>
        </button>
        <div class="atencion-bot__window" id="atencion-bot-window" role="dialog" aria-hidden="true" aria-label="Atención al cliente de Somos Calma">
            <div class="atencion-bot__header">
                <div class="atencion-bot__avatar" aria-hidden="true">🎧</div>
                <div class="atencion-bot__info">
                    <strong>Atención Somos Calma</strong>
                    <span>Te acompaño con calma</span>
                </div>
                <button class="atencion-bot__close" id="atencion-bot-close" type="button" aria-label="Cerrar chat">×</button>
            </div>
            <div class="atencion-bot__messages" id="atencion-bot-messages"></div>
            <div class="atencion-bot__options" id="atencion-bot-options"></div>
        </div>
    </div>
    `;

    function injectAtencionBot() {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = botHTML;
        document.body.appendChild(wrapper);

        const toggle = document.getElementById('atencion-bot-toggle');
        const close = document.getElementById('atencion-bot-close');
        const windowEl = document.getElementById('atencion-bot-window');
        const messagesEl = document.getElementById('atencion-bot-messages');
        const optionsEl = document.getElementById('atencion-bot-options');

        let isOpen = false;
        let hasStarted = false;

        function toggleBot(show) {
            isOpen = show;
            windowEl.classList.toggle('is-open', show);
            windowEl.setAttribute('aria-hidden', String(!show));
            toggle.setAttribute('aria-label', show ? 'Cerrar atención al cliente' : 'Abrir atención al cliente');

            if (show && !hasStarted) {
                hasStarted = true;
                renderStep('welcome');
            }

            if (show) {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        }

        toggle.addEventListener('click', () => toggleBot(!isOpen));
        close.addEventListener('click', () => toggleBot(false));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                toggleBot(false);
            }
        });

        function appendMessage(text, sender = 'bot') {
            const msg = document.createElement('div');
            msg.className = `atencion-bot__message atencion-bot__message--${sender}`;
            const bubble = document.createElement('div');
            bubble.className = 'atencion-bot__bubble';
            bubble.textContent = text;
            msg.appendChild(bubble);
            messagesEl.appendChild(msg);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function showTyping() {
            const typing = document.createElement('div');
            typing.className = 'atencion-bot__message atencion-bot__message--bot atencion-bot__message--typing';
            typing.id = 'atencion-bot-typing';
            const bubble = document.createElement('div');
            bubble.className = 'atencion-bot__bubble';
            const consciousText = typingMessages[Math.floor(Math.random() * typingMessages.length)];
            bubble.innerHTML = `<span class="atencion-bot__dots"><span></span><span></span><span></span></span><span class="atencion-bot__typing-text">${consciousText}</span>`;
            typing.appendChild(bubble);
            messagesEl.appendChild(typing);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return typing;
        }

        function removeTyping() {
            const typing = document.getElementById('atencion-bot-typing');
            if (typing) typing.remove();
        }

        function resolveHref(href) {
            if (href.startsWith('http') || href.startsWith('tel:')) return href;
            return root + href;
        }

        function handleOption(optionId, label) {
            clearOptions();

            if (label) {
                appendMessage(label, 'user');
            }

            if (actionHandlers[optionId]) {
                const action = actionHandlers[optionId];
                window.open(resolveHref(action.href), action.external ? '_blank' : '_self');
                return;
            }

            if (optionId === 'volver') {
                const typing = showTyping();
                setTimeout(() => {
                    removeTyping();
                    renderStep('welcome');
                }, 800 + Math.random() * 500);
                return;
            }

            const step = conversationTree[optionId];
            if (!step) return;

            const typing = showTyping();
            const delay = 1200 + Math.random() * 800;

            setTimeout(() => {
                removeTyping();
                appendMessage(step.message, 'bot');
                renderOptions(step.options);
            }, delay);
        }

        function clearOptions() {
            optionsEl.innerHTML = '';
        }

        function renderOptions(options = []) {
            clearOptions();
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = `atencion-bot__option${opt.primary ? ' atencion-bot__option--primary' : ''}`;
                btn.type = 'button';
                btn.textContent = opt.label;
                btn.addEventListener('click', () => handleOption(opt.id, opt.label));
                optionsEl.appendChild(btn);
            });
        }

        function renderStep(stepId) {
            const step = conversationTree[stepId];
            if (!step) return;
            appendMessage(step.message, 'bot');
            renderOptions(step.options);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectAtencionBot);
    } else {
        injectAtencionBot();
    }
})();
