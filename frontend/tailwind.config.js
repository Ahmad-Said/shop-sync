/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        neon: '#00F5A0',
        coral: '#FF6B6B',
        amber: '#FFD93D',
        surface: '#16161D',
        base: '#0C0C0F',
        border: '#2A2A35',
        muted: '#6B7280',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease forwards',
        'pop': 'pop 0.2s ease forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 245, 160, 0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 245, 160, 0.8)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
