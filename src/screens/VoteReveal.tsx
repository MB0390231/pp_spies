import { useState } from 'react'
import { Button } from '../components/Button'
import { useGame } from '../state/GameContext'
import { fmt, useLexicon } from '../theme'

/** Public screen: reveal each vote one-by-one, then show the verdict. */
export function VoteReveal() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()
  const lastVote = state.lastVote
  // Reveal in player order; start with none shown for the drama.
  const [shown, setShown] = useState(0)

  if (!lastVote) return null
  const allShown = shown >= state.players.length

  return (
    <div className="flex min-h-full animate-rise flex-col items-center gap-5 p-6">
      <h2 className="font-display text-3xl font-bold text-ink">{lex.voteReveal.title}</h2>

      <ul className="flex w-full max-w-sm flex-col gap-2">
        {state.players.map((p, i) => {
          const revealed = i < shown
          const vote = lastVote.votes[p.id]
          const approve = vote === 'approve'
          return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-field border border-line bg-surface px-4 py-3"
            >
              <span className="font-semibold text-ink">{p.name}</span>
              {revealed ? (
                <span
                  className={`animate-pop font-semibold ${approve ? 'text-accent' : 'text-danger'}`}
                >
                  {approve ? `✔ ${lex.vote.approve}` : `✘ ${lex.vote.reject}`}
                </span>
              ) : (
                <span className="text-faint">•••</span>
              )}
            </li>
          )
        })}
      </ul>

      {!allShown ? (
        <Button variant="neutral" className="mt-auto w-full max-w-sm" onClick={() => setShown((s) => s + 1)}>
          {lex.voteReveal.revealNext}
        </Button>
      ) : (
        <div className="mt-auto flex w-full max-w-sm flex-col items-center gap-4">
          <p
            className={`animate-pop font-display text-4xl font-extrabold uppercase ${
              lastVote.approved ? 'text-accent' : 'text-danger'
            }`}
          >
            {lastVote.approved ? lex.voteReveal.approved : lex.voteReveal.rejected}
          </p>
          <p className="font-mono text-xs uppercase tracking-label text-faint">
            {fmt(lex.voteReveal.tally, {
              approve: lastVote.approveCount,
              reject: lastVote.rejectCount,
            })}
          </p>
          <Button className="w-full" onClick={() => dispatch({ type: 'CONFIRM_VOTE' })}>
            {lastVote.approved ? lex.voteReveal.begin : lex.voteReveal.nextLeader}
          </Button>
        </div>
      )}
    </div>
  )
}
