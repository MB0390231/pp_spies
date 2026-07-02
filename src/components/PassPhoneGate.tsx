import { useState, type ReactNode } from 'react'
import { fmt, useLexicon } from '../theme'
import { Button } from './Button'

/**
 * The core secrecy primitive. Renders a "pass the phone to NAME" handoff and
 * does NOT show its children until the named player taps to confirm they're
 * holding the device. Remount it with a `key` (e.g. the player id) to reset
 * between players.
 */
export function PassPhoneGate({
  name,
  prompt,
  children,
}: {
  name: string
  /** Override the eyebrow line; defaults to the theme's handoff prompt. */
  prompt?: string
  children: ReactNode
}) {
  const lex = useLexicon()
  const [revealed, setRevealed] = useState(false)

  if (revealed) return <>{children}</>

  return (
    <div className="flex min-h-full animate-rise flex-col items-center justify-center gap-8 p-6 text-center">
      <p className="font-mono text-sm uppercase tracking-label text-faint">
        {prompt ?? lex.handoff.prompt}
      </p>
      <h2 className="font-display text-5xl font-extrabold text-ink">{name}</h2>
      <Button onClick={() => setRevealed(true)}>{fmt(lex.handoff.confirm, { name })}</Button>
      <p className="max-w-xs text-xs leading-relaxed text-faint">
        {fmt(lex.handoff.privacy, { name })}
      </p>
    </div>
  )
}
