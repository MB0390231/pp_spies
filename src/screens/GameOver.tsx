import { useState } from 'react'
import { Button } from '../components/Button'
import { clearPersistedGame, useGame } from '../state/GameContext'
import { fmt, useLexicon } from '../theme'

/**
 * Public screen: announce the winner, then reveal roles one player at a time —
 * the table guesses each allegiance before tapping that row's reveal button.
 */
export function GameOver({ onExitToMenu }: { onExitToMenu?: () => void } = {}) {
  const { state, dispatch } = useGame()
  const lex = useLexicon()
  const [revealedIds, setRevealedIds] = useState<ReadonlySet<number>>(new Set())
  const resistanceWon = state.winner === 'resistance'
  const allRevealed = state.players.every((p) => revealedIds.has(p.id))

  const revealOne = (id: number) => {
    setRevealedIds((prev) => new Set(prev).add(id))
  }

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
        <p className="mb-1 font-mono text-xs uppercase tracking-label text-faint">
          {lex.gameOver.rolesLabel}
        </p>
        <p className="mb-3 text-xs text-muted">{lex.gameOver.guessHint}</p>
        <ul className="flex flex-col gap-2">
          {state.players.map((p) => {
            const isRevealed = revealedIds.has(p.id)
            return (
              <li
                key={p.id}
                className="flex min-h-[3.25rem] items-center justify-between rounded-field border border-line bg-surface px-4 py-2.5"
              >
                <span className="font-semibold text-ink">{p.name}</span>
                {isRevealed ? (
                  <span
                    className={`animate-pop font-semibold ${
                      p.role === 'spy' ? 'text-danger' : 'text-accent'
                    }`}
                  >
                    {p.role === 'spy' ? lex.factions.bad.member : lex.factions.good.member}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => revealOne(p.id)}
                    className="select-none rounded-chip border border-line bg-raised px-3 py-1.5 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:border-line-strong hover:text-ink active:scale-[0.95]"
                  >
                    {lex.gameOver.reveal}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {!allRevealed && (
          <button
            type="button"
            onClick={() => setRevealedIds(new Set(state.players.map((p) => p.id)))}
            className="mt-3 font-mono text-xs uppercase tracking-label text-faint transition duration-fast ease-theme hover:text-ink"
          >
            {lex.gameOver.revealAll}
          </button>
        )}
      </div>

      <div className="mt-auto flex w-full max-w-sm flex-col gap-3">
        <Button onClick={() => dispatch({ type: 'RESET' })}>{lex.gameOver.playAgain}</Button>
        {onExitToMenu && (
          <Button
            variant="ghost"
            onClick={() => {
              // Leaving to the menu unmounts the provider, so clear the finished
              // game directly instead of dispatching a RESET that won't persist.
              clearPersistedGame()
              onExitToMenu()
            }}
          >
            {lex.pause.quit}
          </Button>
        )}
      </div>
    </div>
  )
}
