/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0d6efd',
        blueprint: {
          50: '#EAF2FF',
          100: '#D3E4FF',
          200: '#A8C9FF',
          300: '#7DAEFF',
          400: '#5b8dd9',
          500: '#4d84e0',
          600: '#0d6efd',
          700: '#0a58ca',
          800: '#084298',
          900: '#052c65',
          950: '#03193b',
        },
        navy: {
          DEFAULT: '#212529',
          deep: '#16181b',
        },
        paper: {
          DEFAULT: '#f8f9fa',
          line: '#dee2e6',
        },
        ink: {
          DEFAULT: '#212529',
          soft: '#6c757d',
        },
        amberline: '#d4a843',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
