import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { useGame } from '../state/GameContext'
import { fmt, useLexicon } from '../theme'

/** Private per-player: everyone secretly approves or rejects the proposed team. */
export function Vote() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()

  const pending = state.players.filter((p) => !(p.id in state.votes))
  const current = pending[0]
  if (!current) return null
  const voted = state.players.length - pending.length

  const team = state.proposedTeam
    .map((id) => state.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <PassPhoneGate key={current.id} name={current.name}>
      <div className="flex min-h-full animate-rise flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-label text-faint">
          {fmt(lex.vote.progress, { done: voted, total: state.players.length })}
        </p>
        <div className="w-full max-w-sm rounded-card border border-line bg-surface/80 p-5 shadow-card">
          <p className="font-mono text-xs uppercase tracking-label text-faint">
            {lex.vote.teamLabel}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">{team}</p>
        </div>
        <p className="text-muted">{lex.vote.question}</p>
        <div className="flex w-full max-w-sm gap-3">
          <Button
            className="flex-1"
            onClick={() => dispatch({ type: 'CAST_VOTE', playerId: current.id, vote: 'approve' })}
          >
            {lex.vote.approve}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => dispatch({ type: 'CAST_VOTE', playerId: current.id, vote: 'reject' })}
          >
            {lex.vote.reject}
          </Button>
        </div>
      </div>
    </PassPhoneGate>
  )
}
