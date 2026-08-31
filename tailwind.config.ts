import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        surface: {
          DEFAULT: '#0A0A0A',
          raised: '#101010',
          hover: '#161616',
        },
        border: {
          subtle: '#1A1A1A',
          active: '#2A2A2A',
        },
        text: {
          primary: '#F5F5F5',
          secondary: '#A1A1AA',
          muted: '#71717A',
        },
        risk: {
          safe: {
            bg: 'rgba(34, 197, 94, 0.1)',
            border: 'rgba(34, 197, 94, 0.25)',
            text: '#4ade80',
          },
          review: {
            bg: 'rgba(234, 179, 8, 0.1)',
            border: 'rgba(234, 179, 8, 0.25)',
            text: '#facc15',
          },
          protected: {
            bg: 'rgba(239, 68, 68, 0.1)',
            border: 'rgba(239, 68, 68, 0.25)',
            text: '#f87171',
          },
          unknown: {
            bg: 'rgba(161, 161, 170, 0.1)',
            border: 'rgba(161, 161, 170, 0.25)',
            text: '#a1a1aa',
          },
        },
        ai: {
          accent: '#818cf8',
          bg: 'rgba(99, 102, 241, 0.1)',
          border: 'rgba(99, 102, 241, 0.25)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
