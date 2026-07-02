// A static mirror of ScoreTrack for the tutorial. Takes plain props instead of a
// full GameState so the tutorial stays free of any engine/state coupling.

import { fmt, useLexicon } from '../theme'

const MISSIONS = 5
const MAX_REJECTS = 5

type Result = 'success' | 'fail' | undefined

export function FauxScoreTrack({
  round,
  results,
  rejects,
}: {
  round: number
  results: Result[]
  rejects: number
}) {
  const lex = useLexicon()
  return (
    <header className="flex w-full max-w-md flex-col gap-2 px-4 pt-4">
      <div className="flex items-center justify-between font-mono text-xs uppercase tracking-label text-faint">
        <span>{fmt(lex.scoreTrack.round, { round, total: MISSIONS })}</span>
        <span className={rejects >= 3 ? 'text-danger' : ''}>
          {fmt(lex.scoreTrack.rejects, { count: rejects, max: MAX_REJECTS })}
        </span>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: MISSIONS }, (_, i) => {
          const result = results[i]
          const color = result === undefined ? 'bg-raised' : result === 'success' ? 'bg-accent' : 'bg-danger'
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${color} ${
                i + 1 === round && !result ? 'ring-2 ring-line-strong' : ''
              }`}
            />
          )
        })}
      </div>
    </header>
  )
}
