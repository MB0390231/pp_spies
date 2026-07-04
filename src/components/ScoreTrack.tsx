import { MAX_REJECTS, MISSIONS } from '../engine'
import type { GameState } from '../engine'
import { fmt, useLexicon } from '../theme'

/** Header showing per-mission outcomes, current round, and the reject counter. */
export function ScoreTrack({ state }: { state: GameState }) {
  const lex = useLexicon()
  return (
    <header className="flex w-full max-w-md flex-col gap-2 px-4 pt-4">
      {state.practice && (
        <span className="mx-auto rounded-chip border border-line-strong bg-raised px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-label text-muted">
          {lex.scoreTrack.practiceTag}
        </span>
      )}
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-label text-faint">
        <span>{fmt(lex.scoreTrack.round, { round: state.round, total: MISSIONS })}</span>
        <span className={state.consecutiveRejects >= 3 ? 'text-danger' : ''}>
          {fmt(lex.scoreTrack.rejects, { count: state.consecutiveRejects, max: MAX_REJECTS })}
        </span>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: MISSIONS }, (_, i) => {
          const result = state.results[i]
          const color =
            result === undefined ? 'bg-raised' : result.success ? 'bg-accent' : 'bg-danger'
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition duration-slow ease-theme ${color} ${
                i + 1 === state.round && !result ? 'ring-2 ring-line-strong' : ''
              }`}
            />
          )
        })}
      </div>
    </header>
  )
}
