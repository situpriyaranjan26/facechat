/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#7C3AED',
          secondary: '#EC4899',
          purple: '#7C3AED',
          pink: '#EC4899',
          cyan: '#06B6D4',
          dark: '#0A0A0F',
          surface: '#111118',
          surface2: '#1A1A26',
          border: '#2A2A3A',
          gold: '#F59E0B',
          muted: '#8B8BA7',
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'card-gradient': 'linear-gradient(180deg, rgba(26,26,38,0.7) 0%, rgba(17,17,24,0.9) 100%)',
      },
    },
  },
  plugins: [],
};
