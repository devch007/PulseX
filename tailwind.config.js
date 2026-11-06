/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        canvas: { DEFAULT: '#f6f7fb', dark: '#0f1117' },
        card: { DEFAULT: '#ffffff', dark: '#181b25' },
        line: { DEFAULT: '#e9ebf2', dark: '#262a38' },
        ink: { DEFAULT: '#171a26', soft: '#5b6075', mute: '#9095a8', darkp: '#eef0f6', darks: '#aab0c3', darkm: '#6d7389' },
        accent: { DEFAULT: '#4f46e5', soft: '#eef0ff', dark: '#8b84ff', darksoft: '#262a4a' },
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgba(23,26,38,0.04), 0 4px 16px rgba(23,26,38,0.05)',
        cardDark: '0 1px 2px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}
