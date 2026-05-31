import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { useGame } from '../state/GameContext'

/** Private per-team-member: play Succeed/Fail. Resistance is locked to Succeed. */
export function Mission() {
  const { state, dispatch } = useGame()

  const pending = state.proposedTeam.filter((id) => !(id in state.missionCards))
  const currentId = pending[0]
  if (currentId === undefined) return null
  const player = state.players.find((p) => p.id === currentId)
  if (!player) return null

  const played = state.proposedTeam.length - pending.length
  const isSpy = player.role === 'spy'

  return (
    <PassPhoneGate key={player.id} name={player.name}>
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          {played}/{state.proposedTeam.length} cards played
        </p>
        <p className="text-slate-300">Play your mission card.</p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            onClick={() => dispatch({ type: 'PLAY_CARD', playerId: player.id, card: 'success' })}
          >
            Succeed
          </Button>
          {isSpy ? (
            <Button
              variant="danger"
              onClick={() => dispatch({ type: 'PLAY_CARD', playerId: player.id, card: 'fail' })}
            >
              Fail (sabotage)
            </Button>
          ) : (
            <p className="text-xs text-slate-500">
              Resistance can only succeed — make this mission count.
            </p>
          )}
        </div>
      </div>
    </PassPhoneGate>
  )
}
