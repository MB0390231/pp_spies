import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'danger' | 'neutral' | 'ghost'

// All colors are semantic theme tokens (tailwind.config.js → CSS variables),
// so every button restyles with the active theme.
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink shadow-glow-accent hover:brightness-110',
  danger: 'bg-danger text-danger-ink shadow-glow-danger hover:brightness-110',
  neutral: 'border border-line bg-raised text-ink hover:border-line-strong',
  ghost: 'bg-transparent text-muted hover:text-ink',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/** Big, thumb-friendly button used across every screen. */
export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={`select-none rounded-control px-6 py-4 font-body text-lg font-semibold transition duration-fast ease-theme active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
    />
  )
}
