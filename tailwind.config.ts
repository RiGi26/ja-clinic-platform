import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:     { DEFAULT: '#0891B2', hover: '#0e7490' },
        secondary:   { DEFAULT: '#0C2340' },
        accent:      { DEFAULT: '#06B6D4' },
        success:     { DEFAULT: '#10B981' },
        warning:     { DEFAULT: '#F59E0B' },
        danger:      { DEFAULT: '#EF4444' },
        destructive: { DEFAULT: '#EF4444' },
        background:  '#F0F9FF',
        muted: {
          DEFAULT:    '#E0F2FE',
          foreground: '#64748B',
        },
        bg: {
          DEFAULT: '#F0F9FF',
          card:    '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:  '0 4px 24px rgba(0,0,0,0.06)',
        panel: '0 8px 40px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}

export default config
