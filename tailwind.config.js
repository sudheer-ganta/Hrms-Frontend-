/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9fc',
          100: '#e0f2f8',
          200: '#bae4f2',
          300: '#7dcde8',
          400: '#38b1dc',
          500: '#1184b0',
          600: '#0e6c92',
          700: '#0f5776',
          800: '#114963',
          900: '#133e53',
          950: '#011638',
          base: '#011638',
          accent: '#1184b0',
          accentHover: '#0d6c92',
          lightBg: '#f8fafc',
          cardBg: '#ffffff',
          border: '#e2e8f0',
        },
        navy: {
          800: '#082559',
          850: '#051e47',
          900: '#03193d',
          950: '#011638',
          1000: '#010e24',
        },
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        sans: ['Open Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'soft': '0 10px 25px -5px rgba(17, 132, 176, 0.08), 0 8px 10px -6px rgba(1, 22, 56, 0.04)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
