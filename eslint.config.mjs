import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

const nuxtGlobals = {
  definePageMeta: 'readonly',
  defineNuxtConfig: 'readonly',
  defineNuxtRouteMiddleware: 'readonly',
  defineNuxtPlugin: 'readonly',
  defineNuxtComponent: 'readonly',
  useRuntimeConfig: 'readonly',
  useNuxtApp: 'readonly',
  navigateTo: 'readonly',
  $fetch: 'readonly',
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/node_modules/**',
      '**/coverage/**',
      'eslint.config.mjs',
      'lint-staged.config.mjs',
      'apps/web/eslint.config.mjs',
      '**/jest.config.js',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-duplicate-imports': 'error',
      'no-throw-literal': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  ...eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...nuxtGlobals,
      },
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineOptions', 'definePageMeta', 'defineProps', 'defineEmits', 'defineSlots'],
        },
      ],
      'vue/html-self-closing': [
        'error',
        {
          html: { void: 'always', normal: 'always', component: 'always' },
          svg: 'always',
          math: 'always',
        },
      ],
      'vue/multi-word-component-names': 'off',
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,mjs}'],
    languageOptions: {
      globals: nuxtGlobals,
    },
  },
  {
    files: ['**/*.{spec,test}.ts', '**/*.e2e-spec.ts', '**/test/**/*.ts'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.{config,conf}.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
);
