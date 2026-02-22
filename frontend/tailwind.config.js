/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OVHcloud Design System Colors
        ovh: {
          primary: '#0050d7',      // Primary blue
          'primary-dark': '#00185e', // Dark navy
          'primary-light': '#007bff', // Light blue
          secondary: '#4d5693',    // Purple/blue
          accent: '#bef1ff',       // Cyan accent
          white: '#ffffff',
          black: '#000000',
        },
        // Semantic colors
        primary: {
          50: '#e6f0ff',
          100: '#bef1ff',
          200: '#99d6ff',
          300: '#66b8ff',
          400: '#3399ff',
          500: '#0050d7',
          600: '#0050d7',
          700: '#00185e',
          800: '#001047',
          900: '#000830',
        },
        // Gray scale with OVHcloud tones
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#dcdcdc',
          400: '#cccccc',
          500: '#4d5693',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: [
          '"Source Sans Pro"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'heading-1': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'button': ['0.875rem', { lineHeight: '1', fontWeight: '500' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        '1': '1px',
        '2': '2px',
        '3': '4px',
        '4': '8px',
        '5': '12px',
        '6': '16px',
        '7': '20px',
        '8': '24px',
        '9': '32px',
        '10': '40px',
        '11': '48px',
        '12': '64px',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 24, 94, 0.05)',
        'DEFAULT': '0 4px 6px -1px rgba(0, 24, 94, 0.1), 0 2px 4px -1px rgba(0, 24, 94, 0.06)',
        'md': '0 10px 15px -3px rgba(0, 24, 94, 0.1), 0 4px 6px -2px rgba(0, 24, 94, 0.05)',
        'lg': '0 20px 25px -5px rgba(0, 24, 94, 0.1), 0 10px 10px -5px rgba(0, 24, 94, 0.04)',
        'xl': '0 25px 50px -12px rgba(0, 24, 94, 0.25)',
        'card': '0 2px 8px rgba(0, 24, 94, 0.08)',
        'nav': '0 1px 3px rgba(0, 24, 94, 0.12)',
      },
      borderColor: {
        DEFAULT: '#dcdcdc',
      },
    },
  },
  plugins: [],
}
