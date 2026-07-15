import rootConfig from '../../eslint.config.mjs';

export default [
  ...rootConfig,
  {
    files: ['**/*.{vue,ts,mjs}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/max-attributes-per-line': 'off',
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
        useAuthStore: 'readonly',
        useApiClient: 'readonly',
        useRealtime: 'readonly',
        useListsStore: 'readonly',
        useTasksStore: 'readonly',
        ref: 'readonly',
        computed: 'readonly',
        reactive: 'readonly',
        watch: 'readonly',
        onMounted: 'readonly',
        onBeforeUnmount: 'readonly',
        nextTick: 'readonly',
        useRoute: 'readonly',
        useRouter: 'readonly',
        Teleport: 'readonly',
      },
    },
  },
];
