import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { useGame } from '../state/GameContext'

/** Private per-player: everyone secretly approves or rejects the proposed team. */
export function Vote() {
  const { state, dispatch } = useGame()

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
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          {voted}/{state.players.length} voted
        </p>
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-400">Proposed team</p>
          <p className="mt-1 text-xl font-semibold text-slate-100">{team}</p>
        </div>
        <p className="text-slate-300">Send this team on the mission?</p>
        <div className="flex w-full max-w-sm gap-3">
          <Button
            className="flex-1"
            onClick={() => dispatch({ type: 'CAST_VOTE', playerId: current.id, vote: 'approve' })}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => dispatch({ type: 'CAST_VOTE', playerId: current.id, vote: 'reject' })}
          >
            Reject
          </Button>
        </div>
      </div>
    </PassPhoneGate>
  )
}
