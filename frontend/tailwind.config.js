/** @type {import('tailwindcss').Config} */
const tokens = require('./src/utils/parseTokens.cjs');

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OVHcloud primary color
        primary: tokens.colors.primary || '#0050d7',
        // Palette colors
        ...tokens.colors,
        // Standard Tailwind colors with OVHcloud overrides
        blue: {
          50: tokens.colors.palette6 || '#bef1ff',
          100: tokens.colors.palette6 || '#bef1ff',
          500: tokens.colors.primary || '#0050d7',
          600: tokens.colors.palette3 || '#0050d7',
          700: tokens.colors.palette4 || '#00185e',
        },
        gray: {
          50: '#f9fafb',
          100: tokens.colors.border7 || '#dcdcdc',
          200: tokens.colors.border5 || '#cccccc',
          300: tokens.colors.border7 || '#dcdcdc',
          400: tokens.colors.border5 || '#cccccc',
          500: tokens.colors.palette2 || '#4d5693',
          600: tokens.colors.palette2 || '#4d5693',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      spacing: {
        ...tokens.spacing,
      },
      borderRadius: {
        ...tokens.borderRadius,
        DEFAULT: tokens.borderRadius['3'] || '8px',
      },
      boxShadow: {
        ...tokens.boxShadow,
        DEFAULT: tokens.boxShadow['1'] || '0 14px 156px 0.2px rgba(0, 0, 0, 0.1)',
        sm: tokens.boxShadow['1'] || '0 14px 156px 0.2px rgba(0, 0, 0, 0.1)',
        md: tokens.boxShadow['2'] || '0 14px 156px 0.2px rgba(0, 0, 0, 0.1)',
        lg: tokens.boxShadow['3'] || '0 14px 156px 0.2px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: tokens.fontFamily?.sans || [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        ...tokens.fontFamily,
      },
      fontSize: {
        ...tokens.fontSize,
      },
      fontWeight: {
        ...tokens.fontWeight,
      },
    },
  },
  plugins: [],
}
