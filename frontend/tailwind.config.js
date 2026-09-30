/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        'primary-light': '#818cf8',
        'primary-dark': '#4f46e5',
        secondary: '#06b6d4',
        accent: '#06b6d4',
        dark: '#0f172a',
        light: '#f8fafc',
        // Identité Fatafalta (partagée avec l'application mobile, theme/tokens.js → brand).
        ink: { DEFAULT: '#0D1B32', soft: '#4F5E72', muted: '#7A8697' },
        paper: { DEFAULT: '#FCFAF5', dim: '#F4F0E6' },
        line: { DEFAULT: '#E4DED2', strong: '#CFC7B8' },
        burgundy: { DEFAULT: '#6C2838', wash: '#F4E9EA' },
        gold: { DEFAULT: '#B48A48', wash: '#F6EEDF', ink: '#7A5A24', light: '#E4C997' },
      },
      maxWidth: {
        site: '1180px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(13,27,50,0.04), 0 8px 24px -12px rgba(13,27,50,0.12)',
        lift: '0 2px 4px rgba(13,27,50,0.04), 0 20px 40px -20px rgba(13,27,50,0.25)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'sheet-up': { from: { transform: 'translateY(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
      },
      animation: {
        'fade-up': 'fade-up 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
