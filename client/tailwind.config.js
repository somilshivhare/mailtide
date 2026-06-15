/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#111118',
        border: '#ffffff10',
        accent: {
          DEFAULT: '#7c6aff',
          hover: '#6654ff',
          muted: 'rgba(124, 106, 255, 0.1)',
        },
        success: '#6affb8',
        warning: '#ffb86a',
        danger: '#ff6a9e',
        text: '#e8e8f0',
        muted: '#8888aa',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 0 20px rgba(124, 106, 255, 0.15)',
        glow: '0 0 10px rgba(124, 106, 255, 0.3)',
      }
    },
  },
  plugins: [],
}
