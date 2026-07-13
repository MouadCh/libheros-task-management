import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    files: ['**/*.{vue,ts,mjs}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
    languageOptions: {
      globals: {
        definePageMeta: 'readonly',
        defineNuxtConfig: 'readonly',
        defineNuxtRouteMiddleware: 'readonly',
        defineNuxtPlugin: 'readonly',
        defineNuxtComponent: 'readonly',
        useRuntimeConfig: 'readonly',
        useNuxtApp: 'readonly',
        navigateTo: 'readonly',
        $fetch: 'readonly',
      },
    },
  },
];
