import { Button } from '../components/Button'
import { useGame } from '../state/GameContext'
import { fmt, useLexicon } from '../theme'

/** Public screen: announce the winner, reveal all roles, offer a rematch. */
export function GameOver() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()
  const resistanceWon = state.winner === 'resistance'

  return (
    <div className="flex min-h-full animate-rise flex-col items-center gap-6 p-6 pt-10 text-center">
      <p className="font-mono text-sm uppercase tracking-label text-faint">
        {lex.gameOver.eyebrow}
      </p>
      <h2
        className={`animate-pop font-display text-5xl font-extrabold uppercase ${
          resistanceWon ? 'text-accent' : 'text-danger'
        }`}
      >
        {resistanceWon ? lex.gameOver.goodWins : lex.gameOver.badWins}
      </h2>
      <p className="font-mono text-xs uppercase tracking-label text-faint">
        {fmt(lex.gameOver.tally, { successes: state.successes, fails: state.fails })}
      </p>

      <div className="w-full max-w-sm">
        <p className="mb-2 font-mono text-xs uppercase tracking-label text-faint">
          {lex.gameOver.rolesLabel}
        </p>
        <ul className="flex flex-col gap-2">
          {state.players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-field border border-line bg-surface px-4 py-3"
            >
              <span className="font-semibold text-ink">{p.name}</span>
              <span
                className={`font-semibold ${p.role === 'spy' ? 'text-danger' : 'text-accent'}`}
              >
                {p.role === 'spy' ? lex.factions.bad.member : lex.factions.good.member}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button onClick={() => dispatch({ type: 'RESET' })} className="mt-auto w-full max-w-sm">
        {lex.gameOver.playAgain}
      </Button>
    </div>
  )
}
