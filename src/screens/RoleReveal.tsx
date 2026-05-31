import { useState } from 'react'
import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { useGame } from '../state/GameContext'

/** Private per-player: each player views their secret role behind a handoff. */
export function RoleReveal() {
  const { state, dispatch } = useGame()
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
      <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-slate-400">You are</p>
        <h2 className={`text-5xl font-extrabold ${isSpy ? 'text-rose-400' : 'text-emerald-400'}`}>
          {isSpy ? 'A SPY' : 'RESISTANCE'}
        </h2>
        <p className="max-w-xs text-slate-300">
          {isSpy
            ? 'Sabotage missions without being caught. You know your fellow spies are out there.'
            : 'Make missions succeed. Find the spies before they win.'}
        </p>
        <Button onClick={next} variant="neutral">
          {isLast ? 'Start the game' : 'Got it — pass on'}
        </Button>
      </div>
    </PassPhoneGate>
  )
}
