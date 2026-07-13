// SOMOS-CALMA — Configuración centralizada del sitio
//
// ⚠️  IMPORTANTE: Los valores marcados con /* PENDIENTE */ deben ser
// completados por el equipo de SOMOS-CALMA antes del lanzamiento público.
// Mientras tanto se usan placeholders visibles para facilitar la revisión.

export const siteConfig = {
  brand: {
    name: 'SOMOS-CALMA',
    tagline: 'Tu espacio seguro para sanar y encontrar alivio.',
    year: new Date().getFullYear(),
  },

  // Datos legales / fiscales
  legal: {
    // PENDIENTE: Confirmar razón social constituida
    companyName: 'SOMOS-CALMA, S.A.P.I. de C.V.',
    // PENDIENTE: Domicilio fiscal completo
    address: '[DOMICILIO FISCAL PENDIENTE — Ciudad de México, México]',
    // Teléfono oficial de la Dra. Lupita Muñoz Campuzano
    phone: '477 254 1540',
    country: 'México',
  },

  // Contacto corporativo
  contact: {
    // Correo oficial de la Dra. Lupita Muñoz Campuzano
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
    // PENDIENTE: Agregar redes sociales reales
    social: {
      instagram: '',
      facebook: '',
      linkedin: '',
    },
  },

  // Precios públicos en MXN
  // PENDIENTE: Validar precios finales con el equipo
  pricing: {
    currency: 'MXN',
    session: {
      single: 400,
      singleLabel: 'Consulta aislada',
    },
    program4: {
      price: 1600,
      label: 'Programa Salud Mental',
      sessions: 4,
      subtitle: '4 sesiones al mes',
    },
    program6: {
      price: 2200,
      label: 'Acompañamiento por duelo',
      sessions: 6,
      subtitle: '6 sesiones al mes',
    },
    professional: {
      monthly: 300,
      yearly: 3000,
      trialMonths: 3,
    },
  },

  // URLs
  urls: {
    // Base del sitio estático legacy (GitHub Pages)
    legacy: '/tanatologia/',
    // Base de la app React
    app: '/tanatologia/app/',
    // PENDIENTE: Dominio propio cuando se compre
    canonical: 'https://anibru300.github.io/tanatologia/',
  },

  // Líneas de emergencia en México
  crisis: {
    title: 'Líneas de emergencia y apoyo emocional',
    description:
      'Si estás en riesgo inminente o necesitas atención inmediata, comunícate con estas líneas gratuitas las 24 horas.',
    lines: [
      { name: 'Emergencias', number: '911', note: 'Atención inmediata 24/7' },
      {
        name: 'SAPTEL',
        number: '800 4727 835',
        note: 'Atención psicológica telefónica 24/7',
      },
      {
        name: 'Línea de la Vida',
        number: '800 911 2000',
        note: 'CONADIC / CONASAMA',
      },
      {
        name: 'Locatel CDMX',
        number: '55 5658 1111',
        note: 'Atención ciudadana 24/7',
      },
      {
        name: 'Cruz Roja Mexicana',
        number: '065',
        note: 'Emergencias médicas',
      },
    ],
  },

  // Textos legales — extractos clave
  legalNotice: {
    responsible: 'SOMOS-CALMA, S.A.P.I. de C.V.',
    purpose:
      'Prestación de servicios de acompañamiento emocional, tanatología, psicología y formación profesional.',
  },
} as const

export type SiteConfig = typeof siteConfig
