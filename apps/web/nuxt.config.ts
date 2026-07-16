import { buildAppUrl, DEFAULT_API_PORT, DEFAULT_APP_HOST } from '@libheros/contracts';

const host = process.env.APP_HOST ?? DEFAULT_APP_HOST;
const apiPort = process.env.API_PORT ?? String(DEFAULT_API_PORT);

export default defineNuxtConfig({
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'libheros Tasks',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
        },
      ],
      meta: [
        {
          name: 'description',
          content: 'Organize and sync your task lists — built for libheros.',
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ?? buildAppUrl({ host, port: apiPort, path: '/api' }),
      wsUrl: process.env.NUXT_PUBLIC_WS_URL ?? buildAppUrl({ host, port: apiPort }),
    },
  },
  compatibilityDate: '2025-07-13',
});
