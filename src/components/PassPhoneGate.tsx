import { useState, type ReactNode } from 'react'
import { Button } from './Button'

/**
 * The core secrecy primitive. Renders a "pass the phone to NAME" handoff and
 * does NOT show its children until the named player taps to confirm they're
 * holding the device. Remount it with a `key` (e.g. the player id) to reset
 * between players.
 */
export function PassPhoneGate({
  name,
  prompt = 'Pass the phone to',
  children,
}: {
  name: string
  prompt?: string
  children: ReactNode
}) {
  const [revealed, setRevealed] = useState(false)

  if (revealed) return <>{children}</>

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center">
      <p className="text-lg uppercase tracking-widest text-slate-400">{prompt}</p>
      <h2 className="text-5xl font-extrabold">{name}</h2>
      <Button onClick={() => setRevealed(true)}>I'm {name} — Tap</Button>
      <p className="max-w-xs text-xs text-slate-500">
        Make sure nobody else can see the screen before tapping.
      </p>
    </div>
  )
}
