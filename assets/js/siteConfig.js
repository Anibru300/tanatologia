// SOMOS-CALMA — Configuración centralizada del sitio estático legacy
//
// ⚠️  IMPORTANTE: Los valores marcados con /* PENDIENTE */ deben ser
// completados por el equipo de SOMOS-CALMA antes del lanzamiento público.

(function () {
  window.SOMOS_CALMA_CONFIG = {
    brand: {
      name: 'SOMOS-CALMA',
      tagline: 'Tu espacio seguro para sanar y encontrar alivio.',
    },

    legal: {
      companyName: 'SOMOS-CALMA, S.A.P.I. de C.V.',
      address: '[DOMICILIO FISCAL PENDIENTE — Ciudad de México, México]',
      phone: '477 254 1540',
      country: 'México',
    },

    contact: {
      hello: 'lupitamcampuzano@outlook.com',
      privacy: 'lupitamcampuzano@outlook.com',
      legal: 'lupitamcampuzano@outlook.com',
      support: 'lupitamcampuzano@outlook.com',
      crisis: 'lupitamcampuzano@outlook.com',
      whatsapp: {
        number: '5214772541540',
        label: 'WhatsApp',
        hours: 'Lunes a sábado, 9:00 a 20:00 hrs (CDMX)',
        message:
          'Hola, estoy interesado/a en los servicios de SOMOS-CALMA. ¿Podrían orientarme?',
      },
      social: {
        instagram: '',
        facebook: '',
        linkedin: '',
      },
    },

    pricing: {
      currency: 'MXN',
      session: { single: 400, singleLabel: 'Consulta aislada' },
      program4: { price: 1600, label: 'Programa Salud Mental', sessions: 4, subtitle: '4 sesiones al mes' },
      program6: { price: 2200, label: 'Acompañamiento por duelo', sessions: 6, subtitle: '6 sesiones al mes' },
      professional: { monthly: 300, yearly: 3000, trialMonths: 3 },
    },

    urls: {
      app: '/tanatologia/app/',
      crisis: '/tanatologia/pages/crisis.html',
      privacy: '/tanatologia/pages/aviso-privacidad.html',
      terms: '/tanatologia/pages/terminos.html',
      cancellation: '/tanatologia/pages/cancelacion.html',
      canonical: 'https://anibru300.github.io/tanatologia/',
    },

    crisis: {
      title: 'Líneas de emergencia y apoyo emocional',
      description:
        'Si estás en riesgo inminente o necesitas atención inmediata, comunícate con estas líneas gratuitas las 24 horas.',
      lines: [
        { name: 'Emergencias', number: '911', note: 'Atención inmediata 24/7' },
        { name: 'SAPTEL', number: '800 4727 835', note: 'Atención psicológica telefónica 24/7' },
        { name: 'Línea de la Vida', number: '800 911 2000', note: 'CONADIC / CONASAMA' },
        { name: 'Locatel CDMX', number: '55 5658 1111', note: 'Atención ciudadana 24/7' },
        { name: 'Cruz Roja Mexicana', number: '065', note: 'Emergencias médicas' },
      ],
    },
  };
})();
