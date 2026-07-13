export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL ?? 'http://localhost:3001',
    },
  },
  compatibilityDate: '2025-07-13',
});
