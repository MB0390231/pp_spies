import { MISSIONS } from '../engine'
import type { GameState } from '../engine'

/** Header showing per-mission outcomes, current round, and the reject counter. */
export function ScoreTrack({ state }: { state: GameState }) {
  return (
    <header className="flex w-full max-w-md flex-col gap-2 px-4 pt-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
        <span>
          Round {state.round} / {MISSIONS}
        </span>
        <span className={state.consecutiveRejects >= 3 ? 'text-rose-400' : ''}>
          Rejects {state.consecutiveRejects} / 5
        </span>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: MISSIONS }, (_, i) => {
          const result = state.results[i]
          const color =
            result === undefined
              ? 'bg-slate-700'
              : result.success
                ? 'bg-emerald-500'
                : 'bg-rose-500'
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${color} ${i + 1 === state.round && !result ? 'ring-2 ring-slate-400' : ''}`}
            />
          )
        })}
      </div>
    </header>
  )
}
