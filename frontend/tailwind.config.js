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
      // Typographie fluide : titres lisibles de 320 px à 1440 px, sans palier brutal.
      fontSize: {
        display: ['clamp(2.125rem, 1.4rem + 3.4vw, 3.75rem)', { lineHeight: '1.04', letterSpacing: '-0.038em' }],
        'title-lg': ['clamp(1.75rem, 1.35rem + 1.8vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        title: ['clamp(1.5rem, 1.25rem + 1.1vw, 2rem)', { lineHeight: '1.15', letterSpacing: '-0.028em' }],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        emphasized: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'fade-out': { from: { opacity: 1 }, to: { opacity: 0 } },
        'rise-in': { from: { opacity: 0, transform: 'translateY(18px)' }, to: { opacity: 1, transform: 'none' } },
        'scale-in': { from: { opacity: 0, transform: 'translateY(-4px) scale(0.97)' }, to: { opacity: 1, transform: 'none' } },
        'pop-in': { '0%': { opacity: 0, transform: 'scale(0.6)' }, '60%': { opacity: 1, transform: 'scale(1.06)' }, '100%': { opacity: 1, transform: 'none' } },
        'sheet-up': { from: { transform: 'translateY(24px)', opacity: 0 }, to: { transform: 'none', opacity: 1 } },
        'sheet-down': { from: { transform: 'none', opacity: 1 }, to: { transform: 'translateY(24px)', opacity: 0 } },
      },
      animation: {
        'fade-up': 'fade-up 320ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'fade-out': 'fade-out 180ms ease-in both',
        'rise-in': 'rise-in 640ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 460ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 300ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-down': 'sheet-down 200ms ease-in both',
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
