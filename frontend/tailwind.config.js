/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#09090b',
          2: '#111113',
          3: '#18181b',
        },
        panel: {
          DEFAULT: 'rgba(24,24,27,0.80)',
          solid: '#18181b',
          hover: 'rgba(39,39,42,0.60)',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          light: 'rgba(255,255,255,0.10)',
        },
        text: {
          DEFAULT: '#fafafa',
          secondary: '#a1a1aa',
          muted: '#71717a',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
          glow: 'rgba(139,92,246,0.25)',
          2: '#06b6d4',
        },
        danger: {
          DEFAULT: '#ef4444',
          bg: 'rgba(239,68,68,0.10)',
        },
        success: {
          DEFAULT: '#22c55e',
          bg: 'rgba(34,197,94,0.10)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          bg: 'rgba(245,158,11,0.10)',
        },
        tier: {
          pro: '#8b5cf6',
          standard: '#06b6d4',
          mini: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'Cascadia Code', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.3)',
        DEFAULT: '0 4px 24px rgba(0,0,0,0.4)',
        lg: '0 12px 48px rgba(0,0,0,0.5)',
        accent: '0 8px 32px rgba(139,92,246,0.3)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
        'accent-gradient-hover': 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)',
        'user-bubble': 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.08))',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
