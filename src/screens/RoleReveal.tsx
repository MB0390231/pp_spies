import { useState } from 'react'
import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { useGame } from '../state/GameContext'
import { useLexicon } from '../theme'

/** Private per-player: each player views their secret role behind a handoff. */
export function RoleReveal() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()
  const [index, setIndex] = useState(0)

  const player = state.players[index]
  if (!player) return null
  const isLast = index === state.players.length - 1

  function next() {
    if (isLast) dispatch({ type: 'START_ROUNDS' })
    else setIndex((i) => i + 1)
  }

  const isSpy = player.role === 'spy'

  return (
    <PassPhoneGate key={player.id} name={player.name}>
      <div className="flex min-h-full animate-rise flex-col items-center justify-center gap-8 p-6 text-center">
        <p className="font-mono text-sm uppercase tracking-label text-faint">
          {lex.roleReveal.eyebrow}
        </p>
        <h2
          className={`animate-pop font-display text-5xl font-extrabold uppercase ${
            isSpy ? 'text-danger' : 'text-accent'
          }`}
        >
          {isSpy ? lex.roleReveal.badTitle : lex.roleReveal.goodTitle}
        </h2>
        <p className="max-w-xs leading-relaxed text-muted">
          {isSpy ? lex.roleReveal.badBody : lex.roleReveal.goodBody}
        </p>
        <Button onClick={next} variant="neutral" className="w-full max-w-sm">
          {isLast ? lex.roleReveal.last : lex.roleReveal.next}
        </Button>
      </div>
    </PassPhoneGate>
  )
}
