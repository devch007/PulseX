/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Samsung Sharp Sans"', '"SamsungSharpSans"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: { DEFAULT: '#f2f3f8', dark: '#0b0c12' },
        card: { DEFAULT: '#ffffff', dark: '#171923' },
        line: { DEFAULT: 'rgba(60,60,67,0.12)', dark: 'rgba(255,255,255,0.09)' },
        ink: { DEFAULT: '#1c1c1e', soft: '#5d5f6b', mute: '#8e8e93', darkp: '#f5f5f7', darks: '#b5b7c3', darkm: '#7b7e8c' },
        accent: { DEFAULT: '#0a7aff', soft: 'rgba(10,122,255,0.10)', dark: '#4da3ff', darksoft: 'rgba(77,163,255,0.16)' },
      },
      borderRadius: { xl2: '22px', xl3: '28px' },
      boxShadow: {
        glass: '0 1px 1px rgba(255,255,255,0.7) inset, 0 10px 40px -10px rgba(28,28,30,0.12), 0 2px 6px rgba(28,28,30,0.04)',
        glassDark: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 60px -20px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)',
        lift: '0 18px 50px -14px rgba(28,28,30,0.22)',
        btn: '0 1px 2px rgba(10,122,255,0.25), 0 6px 16px -6px rgba(10,122,255,0.45)',
      },
      transitionTimingFunction: { apple: 'cubic-bezier(0.32, 0.72, 0, 1)' },
    },
  },
  plugins: [],
}
