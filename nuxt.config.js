export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/strapi',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/seo',
    'shadcn-nuxt'
  ],
  css: ['~/assets/css/main.css'],
  strapi: {
    url: process.env.STRAPI_URL || 'http://localhost:1337',
    prefix: '/api',
    version: 'v5'
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    name: 'Maison JLA',
    description: 'Bijoux fantaisie Maison JLA : colliers, bracelets, bagues et boucles d’oreilles à porter au quotidien, à choisir pour soi ou à offrir.',
    defaultLocale: 'fr',
    indexable: true
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      titleTemplate: '%s %separator %siteName',
      templateParams: { separator: '·' }
    }
  },
  robots: {
    disallow: ['/checkout', '/commande', '/retractation']
  },
  sitemap: {
    exclude: ['/checkout', '/commande/**', '/retractation'],
    sources: ['/api/__sitemap__/urls']
  },
  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'Maison JLA',
      legalName: 'Julia Touret',
      logo: '/logo-maison-jla.png',
      email: 'contact@maisonjla.fr',
      telephone: '+33-6-77-88-69-09',
      address: {
        streetAddress: '5 Rue Joliot-Curie',
        addressLocality: 'Doingt',
        postalCode: '80200',
        addressCountry: 'FR'
      }
    }
  },
  ogImage: {
    enabled: false
  },
  runtimeConfig: {
    mollieApiKey: process.env.MOLLIE_API_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      strapiUrl: process.env.STRAPI_URL || 'http://localhost:1337'
    }
  }
})
