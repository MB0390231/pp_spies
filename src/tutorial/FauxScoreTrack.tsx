// A static mirror of ScoreTrack for the tutorial. Takes plain props instead of a
// full GameState so the tutorial stays free of any engine/state coupling.

const MISSIONS = 5

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
  return (
    <header className="flex w-full max-w-md flex-col gap-2 px-4 pt-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
        <span>
          Round {round} / {MISSIONS}
        </span>
        <span className={rejects >= 3 ? 'text-rose-400' : ''}>Rejects {rejects} / 5</span>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: MISSIONS }, (_, i) => {
          const result = results[i]
          const color =
            result === undefined ? 'bg-slate-700' : result === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
          return (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${color} ${
                i + 1 === round && !result ? 'ring-2 ring-slate-400' : ''
              }`}
            />
          )
        })}
      </div>
    </header>
  )
}
