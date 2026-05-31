import { useState } from 'react'
import { Button } from '../components/Button'
import { useGame } from '../state/GameContext'

/** Public screen: reveal each vote one-by-one, then show the verdict. */
export function VoteReveal() {
  const { state, dispatch } = useGame()
  const lastVote = state.lastVote
  // Reveal in player order; start with none shown for the drama.
  const [shown, setShown] = useState(0)

  if (!lastVote) return null
  const allShown = shown >= state.players.length

  return (
    <div className="flex min-h-full flex-col items-center gap-5 p-6">
      <h2 className="text-2xl font-bold">The vote</h2>

      <ul className="flex w-full max-w-sm flex-col gap-2">
        {state.players.map((p, i) => {
          const revealed = i < shown
          const vote = lastVote.votes[p.id]
          return (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
            >
              <span className="font-semibold">{p.name}</span>
              {revealed ? (
                <span className={vote === 'approve' ? 'text-emerald-400' : 'text-rose-400'}>
                  {vote === 'approve' ? '✔ Approve' : '✘ Reject'}
                </span>
              ) : (
                <span className="text-slate-600">•••</span>
              )}
            </li>
          )
        })}
      </ul>

      {!allShown ? (
        <Button variant="neutral" onClick={() => setShown((s) => s + 1)}>
          Reveal next
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <p
            className={`text-3xl font-extrabold ${lastVote.approved ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {lastVote.approved ? 'APPROVED' : 'REJECTED'}
          </p>
          <p className="text-slate-400">
            {lastVote.approveCount} approve · {lastVote.rejectCount} reject
          </p>
          <Button onClick={() => dispatch({ type: 'CONFIRM_VOTE' })}>
            {lastVote.approved ? 'Begin mission' : 'Next leader'}
          </Button>
        </div>
      )}
    </div>
  )
}
