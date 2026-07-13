import { buildAppUrl, DEFAULT_API_PORT, DEFAULT_APP_HOST } from '@libheros/contracts';

const host = process.env.APP_HOST ?? DEFAULT_APP_HOST;
const apiPort = process.env.API_PORT ?? String(DEFAULT_API_PORT);

export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBaseUrl:
        process.env.NUXT_PUBLIC_API_BASE_URL ?? buildAppUrl({ host, port: apiPort, path: '/api' }),
      wsUrl: process.env.NUXT_PUBLIC_WS_URL ?? buildAppUrl({ host, port: apiPort }),
    },
  },
  compatibilityDate: '2025-07-13',
});
