import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'danger' | 'neutral' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-emerald-500 text-slate-900 hover:bg-emerald-400',
  danger: 'bg-rose-500 text-slate-900 hover:bg-rose-400',
  neutral: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
  ghost: 'bg-transparent text-slate-300 hover:text-slate-100',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

/** Big, thumb-friendly button used across every screen. */
export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={`rounded-xl px-6 py-4 text-lg font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
    />
  )
}
