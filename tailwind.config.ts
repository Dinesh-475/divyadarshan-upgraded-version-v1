import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        saffron: {
          50: '#FFF8ED',
          100: '#FFEDD1',
          200: '#FFD79A',
          300: '#FFC063',
          400: '#FFAC3D',
          500: '#F48A1F',
          600: '#DB6A12',
          700: '#B84E10',
          800: '#8F3D13',
          900: '#743414',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(17, 24, 39, 0.08)',
        card: '0 12px 40px rgba(17, 24, 39, 0.10)',
        ring: '0 0 0 6px rgba(244, 138, 31, 0.10)',
      },
      borderRadius: {
        card: '1.25rem',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'SF Pro Display',
          'SF Pro Text',
          'Inter',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1200px 0' },
          '100%': { backgroundPosition: '1200px 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;

