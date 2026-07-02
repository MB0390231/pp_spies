import { Button } from '../components/Button'
import { useGame } from '../state/GameContext'
import { useLexicon } from '../theme'

/**
 * Public screen: record the table's verdict on the proposed team in one tap.
 * The vote itself happens off-device — everyone gives a thumbs up/down in real
 * life — so this deliberately does NOT sit behind a PassPhoneGate and there is
 * no per-player ballot: one person taps whether the proposal passed or failed.
 */
export function ProposalVote() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()

  const team = state.proposedTeam
    .map((id) => state.players.find((p) => p.id === id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <div className="flex min-h-full animate-rise flex-col items-center justify-center gap-6 p-6 text-center">
      <h2 className="font-display text-3xl font-bold text-ink">{lex.proposalVote.title}</h2>
      <div className="w-full max-w-sm rounded-card border border-line bg-surface/80 p-5 shadow-card">
        <p className="font-mono text-xs uppercase tracking-label text-faint">
          {lex.proposalVote.teamLabel}
        </p>
        <p className="mt-2 text-xl font-semibold text-ink">{team}</p>
      </div>
      <p className="max-w-sm text-muted">{lex.proposalVote.instruction}</p>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button onClick={() => dispatch({ type: 'RESOLVE_PROPOSAL', approved: true })}>
          {lex.proposalVote.passed}
        </Button>
        <Button
          variant="danger"
          onClick={() => dispatch({ type: 'RESOLVE_PROPOSAL', approved: false })}
        >
          {lex.proposalVote.failed}
        </Button>
      </div>
    </div>
  )
}
