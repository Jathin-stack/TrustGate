/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0A0A0B',
        panel: '#141110',
        line: '#3A2E22',
        secondary: '#29211A',
        ember: '#F59E0B',
        ambersoft: '#FBBF24',
        coral: '#F43F5E',
        crimson: '#E11D48',
        verdant: '#10B981',
        mint: '#34D399',
        rose: '#FB7185',
        cream: '#FAF7F2',
        'muted-foreground': '#A8A094',
        'primary-foreground': '#1A1005',
      },
      fontFamily: {
        headings: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'tg-spin-slow': 'tg-spin-slow 22s linear infinite',
        'tg-spin-slower': 'tg-spin-slow 38s linear infinite reverse',
        'tg-breathe': 'tg-orb-breathe 4.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'tg-blink': 'tg-blink 1.6s ease infinite',
        'tg-float-1': 'tg-float 6s ease-in-out infinite',
        'tg-float-2': 'tg-float 7s ease-in-out 0.8s infinite',
        'tg-float-3': 'tg-float 6.5s ease-in-out 1.6s infinite',
        'tg-float-4': 'tg-float 7.5s ease-in-out 2.2s infinite',
      }
    },
  },
  plugins: [],
}
