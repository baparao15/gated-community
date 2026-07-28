/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50: '#FFF3F0', 100: '#FFDAD2', 300: '#FFB4A3', 500: '#B3543D', 600: '#943D28', 700: '#7D2C18', 950: '#3D0700' },
        mint: { 50: '#EEF8F0', 100: '#C8EBD0', 500: '#4B6A54', 600: '#466550' },
        earth: { 50: '#FDF9F4', 100: '#F7F3EE', 200: '#F1EDE8', 300: '#E6E2DD', 500: '#89726D', 700: '#56423E', 900: '#1C1C19' },
        amber: { 50: '#FFF4E8', 100: '#FFDEAC', 500: '#956800', 700: '#5F4100' },
        ink: '#1C1C19',
        canvas: '#FDF9F4',
      },
      fontFamily: { sans: ['Be Vietnam Pro', 'sans-serif'], display: ['Literata', 'serif'] },
      boxShadow: { soft: '0 16px 50px rgba(86, 66, 62, 0.10)', card: '0 8px 28px rgba(86, 66, 62, 0.08)' },
    },
  },
  plugins: [],
};
