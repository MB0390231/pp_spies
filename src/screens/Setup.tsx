import { useState } from 'react'
import { Button } from '../components/Button'
import { MAX_PLAYERS, MIN_PLAYERS, spyCount } from '../engine'
import { useGame } from '../state/GameContext'

/** Public screen: choose player count and enter names, then assign roles. */
export function Setup({ onHowToPlay }: { onHowToPlay?: () => void }) {
  const { dispatch } = useGame()
  const [names, setNames] = useState<string[]>(() => Array(MIN_PLAYERS).fill(''))
  const [challengeMode, setChallengeMode] = useState(false)

  const trimmed = names.map((n) => n.trim())
  const allNamed = trimmed.every((n) => n.length > 0)
  const unique = new Set(trimmed).size === trimmed.length
  const canStart = allNamed && unique

  function setName(i: number, value: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? value : n)))
  }

  function start() {
    dispatch({ type: 'SETUP', names: trimmed, seed: Date.now(), challengeMode })
  }

  return (
    <div className="flex min-h-full flex-col items-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">🕵️ Spies</h1>
        <p className="mt-1 text-slate-400">
          {names.length} players · {spyCount(names.length)} spies
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {names.map((name, i) => (
          <input
            key={i}
            value={name}
            onChange={(e) => setName(i, e.target.value)}
            placeholder={`Player ${i + 1}`}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-lg outline-none focus:border-emerald-500"
          />
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="neutral"
          onClick={() => setNames((prev) => prev.slice(0, -1))}
          disabled={names.length <= MIN_PLAYERS}
        >
          – Player
        </Button>
        <Button
          variant="neutral"
          onClick={() => setNames((prev) => [...prev, ''])}
          disabled={names.length >= MAX_PLAYERS}
        >
          + Player
        </Button>
      </div>

      <label className="flex w-full max-w-sm cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
        <input
          type="checkbox"
          checked={challengeMode}
          onChange={(e) => setChallengeMode(e.target.checked)}
          className="h-5 w-5 accent-emerald-500"
        />
        <span className="flex flex-col">
          <span className="text-lg">Challenge mode</span>
          <span className="text-sm text-slate-400">Missions 1 &amp; 2 send +1 player.</span>
        </span>
      </label>

      <Button onClick={start} disabled={!canStart} className="w-full max-w-sm">
        {canStart ? 'Assign roles' : !unique ? 'Names must be unique' : 'Enter every name'}
      </Button>

      {onHowToPlay && (
        <Button variant="neutral" onClick={onHowToPlay} className="w-full max-w-sm">
          How to play
        </Button>
      )}
    </div>
  )
}
