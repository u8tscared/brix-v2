/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        surface: 'var(--surface)',
        side: 'var(--side)',
        sub: 'var(--sub)',
        line: 'var(--line)',
        line2: 'var(--line2)',
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink2)', 3: 'var(--ink3)' },
        brand: 'var(--brand)',
        vi: { DEFAULT: '#6d28d9', 50: '#f5f0ff', 100: '#ebe2fe', 200: '#d9c9fd', 300: '#b9a2f5', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
        mag: '#d946ef',
        peach: '#fb923c',
        ok: { DEFAULT: '#16a34a', bg: '#ecfdf3' },
        warn: { DEFAULT: '#d97706', bg: '#fff7e8' },
        bad: { DEFAULT: '#dc2626', bg: '#fef2f2' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        dawn: 'linear-gradient(100deg,#6d28d9 0%,#d946ef 55%,#fb923c 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,20,40,.04), 0 0 0 1px var(--line)',
        pop: '0 0 0 1px rgba(20,20,40,.06), 0 18px 40px -16px rgba(30,20,70,.28), 0 8px 16px -8px rgba(30,20,70,.14)',
        dawn: '0 6px 16px -6px rgba(190,60,200,.55), inset 0 1px 0 rgba(255,255,255,.25)',
      },
      borderRadius: { xl2: '14px' },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.97)' }, to: { opacity: '1', transform: 'none' } },
        shine: { from: { left: '-60px' }, to: { left: '120%' } },
        pulse2: { '0%': { boxShadow: '0 0 0 0 rgba(22,163,74,.45)' }, '100%': { boxShadow: '0 0 0 8px rgba(22,163,74,0)' } },
        wave: { '0%,100%': { transform: 'scaleY(.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.8,.2,1) both',
        'scale-in': 'scale-in .2s cubic-bezier(.2,.8,.2,1) both',
        shine: 'shine 2.8s ease-in-out infinite',
        pulse2: 'pulse2 1.6s ease-out infinite',
        wave: 'wave 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
