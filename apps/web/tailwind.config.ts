import type { Config } from 'tailwindcss';

export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        lh: {
          ink: 'rgb(var(--lh-ink) / <alpha-value>)',
          muted: 'rgb(var(--lh-muted) / <alpha-value>)',
          line: 'rgb(var(--lh-line) / <alpha-value>)',
          surface: 'rgb(var(--lh-surface) / <alpha-value>)',
          'surface-2': 'rgb(var(--lh-surface-2) / <alpha-value>)',
          white: 'rgb(var(--lh-white) / <alpha-value>)',
          teal: 'rgb(var(--lh-teal) / <alpha-value>)',
          'teal-deep': 'rgb(var(--lh-teal-deep) / <alpha-value>)',
          'teal-soft': 'rgb(var(--lh-teal-soft) / <alpha-value>)',
          coral: 'rgb(var(--lh-coral) / <alpha-value>)',
          'coral-deep': 'rgb(var(--lh-coral-deep) / <alpha-value>)',
          'rose-soft': 'rgb(var(--lh-rose-soft) / <alpha-value>)',
          'amber-soft': 'rgb(var(--lh-amber-soft) / <alpha-value>)',
          amber: 'rgb(var(--lh-amber) / <alpha-value>)',
          danger: 'rgb(var(--lh-danger) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Outfit"', 'system-ui', 'sans-serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lh: 'var(--lh-shadow)',
        'lh-sm': 'var(--lh-shadow-sm)',
      },
    },
  },
  plugins: [],
} satisfies Config;
