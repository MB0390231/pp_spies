/** @type {import('tailwindcss').Config} */
// Semantic design tokens. Every color/font/radius/shadow here resolves to a CSS
// custom property written by ThemeProvider (src/theme/ThemeContext.tsx), so the
// entire app restyles when the active theme changes. Colors use the
// `rgb(var(--x) / <alpha-value>)` form so Tailwind alpha modifiers
// (`bg-accent/20`) keep working. See THEMES.md for the authoring guide.
export default {
  content: ['./index.html', './storybook.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--c-accent-ink) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'danger-ink': 'rgb(var(--c-danger-ink) / <alpha-value>)',
        focus: 'rgb(var(--c-focus) / <alpha-value>)',
      },
      fontFamily: {
        display: 'var(--f-display)',
        body: 'var(--f-body)',
        mono: 'var(--f-mono)',
      },
      letterSpacing: {
        label: 'var(--tr-label)',
      },
      borderRadius: {
        card: 'var(--r-card)',
        control: 'var(--r-control)',
        field: 'var(--r-field)',
        chip: 'var(--r-chip)',
      },
      boxShadow: {
        card: 'var(--sh-card)',
        pop: 'var(--sh-pop)',
        'glow-accent': 'var(--sh-glow-accent)',
        'glow-danger': 'var(--sh-glow-danger)',
      },
      transitionDuration: {
        fast: 'var(--m-fast)',
        base: 'var(--m-base)',
        slow: 'var(--m-slow)',
      },
      transitionTimingFunction: {
        theme: 'var(--ease)',
        spring: 'var(--ease-spring)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        fade: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        rise: 'rise var(--m-slow) var(--ease) both',
        fade: 'fade var(--m-base) var(--ease) both',
        pop: 'pop var(--m-base) var(--ease-spring) both',
        'sheet-up': 'sheet-up var(--m-slow) var(--ease) both',
      },
    },
  },
  plugins: [],
}
