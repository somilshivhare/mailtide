/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Light theme backgrounds ---
        background: '#FFFFFF',
        surface: '#F8FAFC',
        'surface-elevated': '#FFFFFF',

        // --- Borders ---
        border: '#E5E7EB',

        // --- Text ---
        text: '#111827',
        muted: '#6B7280',

        // --- Primary accent: Indigo (Linear / Stripe style) ---
        accent: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          muted: 'rgba(99, 102, 241, 0.08)',
          light: '#EEF2FF',
        },

        // --- Semantic colors (light-mode tuned) ---
        success: '#10B981',
        'success-bg': '#ECFDF5',
        'success-border': '#A7F3D0',

        warning: '#F59E0B',
        'warning-bg': '#FFFBEB',
        'warning-border': '#FDE68A',

        danger: '#EF4444',
        'danger-bg': '#FEF2F2',
        'danger-border': '#FECACA',

        // --- Chart palette ---
        chart: {
          1: '#6366F1',
          2: '#8B5CF6',
          3: '#10B981',
          4: '#F59E0B',
          5: '#EF4444',
          6: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Clean, professional shadows — no glow
        card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        modal: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        dropdown: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        // Legacy aliases (used by existing components, not removed)
        premium: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        glow: 'none',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
