import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'app-muted': 'var(--app-muted)',
        'app-border': 'var(--app-border)',
        'surface-light': 'var(--surface-light)',
        'surface-light-fg': 'var(--surface-light-fg)',
        'surface-light-muted': 'var(--surface-light-muted)',
        'surface-light-border': 'var(--surface-light-border)',
        'surface-light-card': 'var(--surface-light-card)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          ring: 'var(--accent-ring)',
        },
        success: {
          bg: 'var(--success-bg)',
          text: 'var(--success-text)',
          border: 'var(--success-border)',
        },
        error: {
          bg: 'var(--error-bg)',
          text: 'var(--error-text)',
          border: 'var(--error-border)',
        },
        warning: {
          bg: 'var(--warning-bg)',
          text: 'var(--warning-text)',
          border: 'var(--warning-border)',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.2), 0 1px 2px -1px rgb(0 0 0 / 0.2)',
        'card-hover': '0 10px 25px -5px rgb(0 0 0 / 0.25), 0 4px 10px -6px rgb(0 0 0 / 0.2)',
        glow: '0 0 40px -10px rgb(124 58 237 / 0.25)',
        'glow-sm': '0 0 20px -5px rgb(124 58 237 / 0.15)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
