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
    // La empresa aún no está constituida: operamos como persona física
    companyName: 'SOMOS-CALMA (operada por la Dra. Lupita Muñoz Campuzano, persona física)',
    // Sin domicilio fiscal por ahora
    address: 'Ciudad de México, México',
    // Teléfono oficial de SOMOS-CALMA
    phone: '477 125 0075',
    country: 'México',
  },

  // Contacto corporativo
  contact: {
    // Correo oficial único de SOMOS-CALMA
    hello: 'hola@somos-calma.com',
    privacy: 'hola@somos-calma.com',
    legal: 'hola@somos-calma.com',
    support: 'hola@somos-calma.com',
    crisis: 'hola@somos-calma.com',
    whatsapp: {
      number: '5214771250075',
      label: 'WhatsApp',
      hours: 'Lunes a sábado, 9:00 a 20:00 hrs (CDMX)',
      message:
        'Hola, estoy interesado/a en los servicios de SOMOS-CALMA. ¿Podrían orientarme?',
    },
    social: {
      instagram: '',
      facebook: 'https://www.facebook.com/profile.php?id=61594989341298',
      linkedin: '',
    },
  },

  // RESERVADO PARA FASE DE MONETIZACIÓN — No mostrar durante la Beta.
  // Fuente central de precios públicos en MXN. La UI no consume estos valores
  // mientras la plataforma opera en modo Beta (pago directo profesional→paciente).
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
    // Base del sitio estático legacy (mismo dominio, raíz)
    legacy: '/',
    // Base de la app React
    app: '/app/',
    canonical: 'https://somos-calma.com/',
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
    responsible: 'SOMOS-CALMA (operada por la Dra. Lupita Muñoz Campuzano, persona física)',
    purpose:
      'Prestación de servicios de acompañamiento emocional, tanatología, psicología y formación profesional.',
  },
} as const

export type SiteConfig = typeof siteConfig
