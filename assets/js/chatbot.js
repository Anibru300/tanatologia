/**
 * Chatbot cálido de Somos Calma.
 * Tono cercano, pausado y consciente.
 * Ofrece atención humana vía WhatsApp con Lupita Muñoz.
 */
(function () {
    const WHATSAPP_NUMBER = '5214772541540';
    const WHATSAPP_NAME = 'Lupita Muñoz';
    const WHATSAPP_MESSAGE = encodeURIComponent(
        'Hola Lupita, me interesa recibir información de Somos Calma. ¿Podrías orientarme?'
    );
    const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

    const consciousLoadingMessages = [
        'Aprovecha estos segundos para respirar profundo...',
        'Tu espacio de paz se está preparando...',
        'Respira. Estamos contigo.',
        'Un momento, organizamos la mejor respuesta para ti...',
        'Aquí no hay prisa. Gracias por tu paciencia.'
    ];

    const openingHoursText = 'Estamos disponibles de 7 a.m. a 11 p.m. para acompañarte.';

    const quickOptions = [
        {
            id: 'consulta',
            label: 'Quiero una consulta aislada',
            response: `Por supuesto. A veces un solo espacio de 50 minutos ayuda a que el día pese menos. Puedes agendar desde $400 MXN, o escribirle a ${WHATSAPP_NAME} por WhatsApp para que te oriente.`,
            actions: [
                { label: 'Ir al matching', href: 'pages/matching.html', primary: true },
                { label: 'Escribir por WhatsApp', href: WHATSAPP_URL, external: true }
            ]
        },
        {
            id: 'programa',
            label: 'Quiero un programa de 4 o 6 sesiones',
            response: 'Qué bueno que busques acompañarte de forma guiada. Tenemos dos programas: bienestar emocional (4 sesiones) y duelo, muerte o pérdida (6 sesiones).',
            actions: [
                { label: 'Ver programas', href: 'pages/membresias.html', primary: true },
                { label: 'Preguntar a Lupita', href: WHATSAPP_URL, external: true }
            ]
        },
        {
            id: 'horario',
            label: '¿A qué horas puedo agendar?',
            response: 'Contamos con cobertura de 7:00 a.m. a 11:00 p.m., todos los días de la semana. Tú eliges el horario que mejor te funcione.',
            actions: [
                { label: 'Ver opciones', href: 'pages/membresias.html', primary: true },
                { label: 'Escribir por WhatsApp', href: WHATSAPP_URL, external: true }
            ]
        },
        {
            id: 'profesional',
            label: 'Soy psicólogo o tanatólogo',
            response: 'Qué gusto que quieras ser parte. En Somos Calma formamos una comunidad de tanatólogos y psicólogos. La membresía trimestral es de $300 e incluye conferencias, biblioteca y flujo de pacientes.',
            actions: [
                { label: 'Conocer beneficios', href: 'pages/profesionales.html', primary: true },
                { label: 'Contactar a Lupita', href: WHATSAPP_URL, external: true }
            ]
        },
        {
            id: 'humano',
            label: 'Necesito hablar con alguien',
            response: `Claro que sí. A veces lo mejor es una conversación humana. ${WHATSAPP_NAME} está atenta para escucharte y orientarte sin prisa.`,
            actions: [
                { label: 'Escribir a Lupita por WhatsApp', href: WHATSAPP_URL, external: true, primary: true }
            ]
        },
        {
            id: 'emergencia',
            label: 'Estoy en crisis o emergencia',
            response: 'Lamento mucho que estés pasando por esto. Somos Calma no sustituye la atención de emergencia. Si tú o alguien cercano está en riesgo inminente, por favor llama al 911 o a una línea de crisis.',
            actions: [
                { label: 'Ver líneas de emergencia', href: 'pages/crisis.html', primary: true },
                { label: '911', href: 'tel:911' }
            ]
        }
    ];

    function getRootPath() {
        const path = window.location.pathname;
        return path.includes('/pages/') ? '../' : './';
    }

    const root = getRootPath();

    const chatbotHTML = `
    <div class="chatbot-widget" id="chatbot-widget">
        <button class="chatbot-toggle" id="chatbot-toggle" type="button" aria-label="Abrir chat de apoyo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.03 2 11c0 2.76 1.36 5.23 3.5 6.86V22l4.09-2.24c.78.15 1.58.24 2.41.24 5.52 0 10-4.03 10-9s-4.48-9-10-9zm1 12h-2v-2h2v2zm0-4h-2V7h2v3z"/>
            </svg>
            <span class="chatbot-toggle__pulse"></span>
        </button>
        <div class="chatbot-window" id="chatbot-window" role="dialog" aria-hidden="true" aria-label="Ventana de chat de Somos Calma">
            <div class="chatbot-header">
                <div class="chatbot-header__avatar" aria-hidden="true">🌿</div>
                <div class="chatbot-header__info">
                    <strong>Somos Calma</strong>
                    <span>Respondemos con calma y cercanía</span>
                </div>
                <button class="chatbot-close" id="chatbot-close" type="button" aria-label="Cerrar chat">×</button>
            </div>
            <div class="chatbot-messages" id="chatbot-messages"></div>
            <div class="chatbot-options" id="chatbot-options"></div>
        </div>
    </div>

    <a class="whatsapp-float" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer" aria-label="Contactar por WhatsApp a ${WHATSAPP_NAME}">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span class="whatsapp-float__tooltip">WhatsApp con Lupita</span>
    </a>
    `;

    function injectChatbot() {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = chatbotHTML;
        document.body.appendChild(wrapper);

        const toggle = document.getElementById('chatbot-toggle');
        const close = document.getElementById('chatbot-close');
        const windowEl = document.getElementById('chatbot-window');
        const messagesEl = document.getElementById('chatbot-messages');
        const optionsEl = document.getElementById('chatbot-options');

        let isOpen = false;

        function toggleChat(show) {
            isOpen = show;
            windowEl.classList.toggle('is-open', show);
            windowEl.setAttribute('aria-hidden', String(!show));
            toggle.setAttribute('aria-label', show ? 'Cerrar chat de apoyo' : 'Abrir chat de apoyo');
            if (show) {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
        }

        toggle.addEventListener('click', () => toggleChat(!isOpen));
        close.addEventListener('click', () => toggleChat(false));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isOpen) {
                toggleChat(false);
            }
        });

        function appendMessage(text, sender = 'bot') {
            const msg = document.createElement('div');
            msg.className = `chatbot-message chatbot-message--${sender}`;
            const bubble = document.createElement('div');
            bubble.className = 'chatbot-message__bubble';
            bubble.textContent = text;
            msg.appendChild(bubble);
            messagesEl.appendChild(msg);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function showTyping() {
            const typing = document.createElement('div');
            typing.className = 'chatbot-message chatbot-message--bot chatbot-message--typing';
            typing.id = 'chatbot-typing';
            const bubble = document.createElement('div');
            bubble.className = 'chatbot-message__bubble';
            const consciousText = consciousLoadingMessages[Math.floor(Math.random() * consciousLoadingMessages.length)];
            bubble.innerHTML = `<span class="chatbot-typing__dots"><span></span><span></span><span></span></span><span class="chatbot-typing__text">${consciousText}</span>`;
            typing.appendChild(bubble);
            messagesEl.appendChild(typing);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return typing;
        }

        function removeTyping() {
            const typing = document.getElementById('chatbot-typing');
            if (typing) typing.remove();
        }

        function renderOptions(actions = null) {
            optionsEl.innerHTML = '';
            const buttons = actions || quickOptions;

            buttons.forEach((opt) => {
                const btn = document.createElement('button');
                btn.className = `chatbot-option${opt.primary ? ' chatbot-option--primary' : ''}`;
                btn.type = 'button';
                btn.textContent = opt.label;
                btn.addEventListener('click', () => handleOptionClick(opt));
                optionsEl.appendChild(btn);
            });
        }

        function resolveHref(href) {
            if (href.startsWith('http') || href.startsWith('tel:')) return href;
            return root + href;
        }

        function handleOptionClick(option) {
            if (option.href) {
                window.open(resolveHref(option.href), option.external ? '_blank' : '_self');
                return;
            }

            appendMessage(option.label, 'user');
            optionsEl.innerHTML = '';
            const typing = showTyping();

            const delay = 1200 + Math.random() * 800;
            setTimeout(() => {
                removeTyping();
                appendMessage(option.response, 'bot');
                if (option.actions && option.actions.length) {
                    renderOptions(option.actions);
                } else {
                    renderOptions([
                        { label: 'Escribir a Lupita por WhatsApp', href: WHATSAPP_URL, external: true, primary: true },
                        { label: 'Volver al inicio', href: 'index.html' }
                    ]);
                }
            }, delay);
        }

        function init() {
            appendMessage('Hola, nos da gusto saludarte. Cuéntanos, ¿cómo podemos aligerar tu día hoy?', 'bot');
            const sub = document.createElement('div');
            sub.className = 'chatbot-subtle';
            sub.textContent = openingHoursText;
            messagesEl.appendChild(sub);
            renderOptions(quickOptions);
        }

        init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectChatbot);
    } else {
        injectChatbot();
    }
})();
