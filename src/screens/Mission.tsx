import { Button } from '../components/Button'
import { PassPhoneGate } from '../components/PassPhoneGate'
import { useGame } from '../state/GameContext'
import { fmt, useLexicon } from '../theme'

/** Private per-team-member: play Succeed/Fail. Resistance is locked to Succeed. */
export function Mission() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()

  const pending = state.proposedTeam.filter((id) => !(id in state.missionCards))
  const currentId = pending[0]
  if (currentId === undefined) return null
  const player = state.players.find((p) => p.id === currentId)
  if (!player) return null

  const played = state.proposedTeam.length - pending.length
  const isSpy = player.role === 'spy'

  return (
    <PassPhoneGate key={player.id} name={player.name}>
      <div className="flex min-h-full animate-rise flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="font-mono text-xs uppercase tracking-label text-faint">
          {fmt(lex.mission.progress, { done: played, total: state.proposedTeam.length })}
        </p>
        <p className="text-lg text-muted">{lex.mission.prompt}</p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            onClick={() => dispatch({ type: 'PLAY_CARD', playerId: player.id, card: 'success' })}
          >
            {lex.mission.succeed}
          </Button>
          {isSpy ? (
            <Button
              variant="danger"
              onClick={() => dispatch({ type: 'PLAY_CARD', playerId: player.id, card: 'fail' })}
            >
              {lex.mission.fail}
            </Button>
          ) : (
            <p className="text-xs leading-relaxed text-faint">{lex.mission.lockedHint}</p>
          )}
        </div>
      </div>
    </PassPhoneGate>
  )
}
