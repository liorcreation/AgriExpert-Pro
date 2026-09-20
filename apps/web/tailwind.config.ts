import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        territory: {
          950: '#071D16',
          900: '#0F3D2E',
          800: '#14533D',
          700: '#176A4D',
          600: '#0F8A63',
          500: '#10B981',
          400: '#34D399',
          300: '#6EE7B7',
          100: '#D1FAE5',
          50: '#ECFDF5',
        },
        gold: {
          700: '#9B7B1E',
          600: '#B89525',
          500: '#D4AF37',
          300: '#E8D48A',
          100: '#F8F1D5',
        },
        obsidian: {
          950: '#090D16',
          900: '#101722',
          800: '#172231',
          700: '#243244',
          600: '#33445A',
        },
        cream: {
          50: '#FFFEFB',
          100: '#FAF8F1',
          200: '#F1EEDF',
          300: '#E2DDCC',
        },
        medical: {
          600: '#0E7490',
          500: '#0891B2',
          100: '#CFFAFE',
          50: '#ECFEFF',
        },
        danger: {
          700: '#B42318',
          600: '#D92D20',
          500: '#F04438',
          100: '#FEE4E2',
          50: '#FEF3F2',
        },
        warning: {
          600: '#CA8504',
          500: '#F79009',
          100: '#FEF0C7',
          50: '#FFFAEB',
        },
        success: {
          600: '#039855',
          500: '#12B76A',
          100: '#D1FADF',
          50: '#ECFDF3',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '700' }],
        'display-lg': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.035em', fontWeight: '700' }],
        'heading-xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '700' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.02em', fontWeight: '700' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65' }],
        body: ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
      },
      boxShadow: {
        soft: '0 10px 40px rgba(15, 61, 46, 0.08)',
        'soft-dark': '0 14px 45px rgba(0, 0, 0, 0.24)',
        glass: '0 12px 36px rgba(15, 61, 46, 0.12)',
        emergency: '0 0 0 4px rgba(240, 68, 56, 0.14), 0 12px 30px rgba(217, 45, 32, 0.28)',
      },
      borderRadius: {
        card: '1.25rem',
        'card-lg': '1.75rem',
        control: '0.875rem',
      },
      backdropBlur: {
        glass: '18px',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.78', transform: 'scale(1.04)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-in': 'slide-in 240ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
