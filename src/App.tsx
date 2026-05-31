// Top-level router: switch on the engine's `state.phase` to pick the screen.
// The engine drives all transitions — screens only dispatch actions.

import { ScoreTrack } from './components/ScoreTrack'
import type { Phase } from './engine'
import { GameOver } from './screens/GameOver'
import { Mission } from './screens/Mission'
import { MissionReveal } from './screens/MissionReveal'
import { RoleReveal } from './screens/RoleReveal'
import { Setup } from './screens/Setup'
import { TeamProposal } from './screens/TeamProposal'
import { Vote } from './screens/Vote'
import { VoteReveal } from './screens/VoteReveal'
import { useGame } from './state/GameContext'

const SCREENS: Record<Phase, () => JSX.Element | null> = {
  setup: Setup,
  roleReveal: RoleReveal,
  teamProposal: TeamProposal,
  vote: Vote,
  voteReveal: VoteReveal,
  mission: Mission,
  missionReveal: MissionReveal,
  gameOver: GameOver,
}

// Phases that show the public score header.
const IN_GAME: ReadonlySet<Phase> = new Set<Phase>([
  'teamProposal',
  'vote',
  'voteReveal',
  'mission',
  'missionReveal',
])

export default function App() {
  const { state } = useGame()
  const Screen = SCREENS[state.phase]

  return (
    <div className="flex min-h-full flex-col items-center bg-slate-900 text-slate-100">
      {IN_GAME.has(state.phase) && <ScoreTrack state={state} />}
      <main className="flex w-full max-w-md flex-1 flex-col">
        <Screen />
      </main>
    </div>
  )
}
