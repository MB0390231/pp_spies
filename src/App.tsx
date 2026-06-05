// Top-level router: switch on the engine's `state.phase` to pick the screen.
// The engine drives all transitions — screens only dispatch actions.

import { useState, type ComponentType } from 'react'
import { PauseOverlay } from './components/PauseOverlay'
import { RulesOverlay } from './components/RulesOverlay'
import { ScoreTrack } from './components/ScoreTrack'
import type { Phase } from './engine'
import { Tutorial } from './tutorial/Tutorial'
import { GameOver } from './screens/GameOver'
import { Mission } from './screens/Mission'
import { MissionReveal } from './screens/MissionReveal'
import { RoleReveal } from './screens/RoleReveal'
import { Setup } from './screens/Setup'
import { TeamProposal } from './screens/TeamProposal'
import { Vote } from './screens/Vote'
import { VoteReveal } from './screens/VoteReveal'
import { useGame } from './state/GameContext'
import { usePaused } from './state/usePaused'

const SCREENS: Record<Phase, ComponentType> = {
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

// Phases where a game is in progress and can be paused (everything but setup/gameOver).
const PAUSABLE: ReadonlySet<Phase> = new Set<Phase>([
  'roleReveal',
  'teamProposal',
  'vote',
  'voteReveal',
  'mission',
  'missionReveal',
])

export default function App() {
  const { state, dispatch } = useGame()
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [paused, setPaused] = usePaused()
  const Screen = SCREENS[state.phase]
  const canPause = PAUSABLE.has(state.phase)

  function handleQuit() {
    dispatch({ type: 'RESET' })
    setPaused(false)
  }

  return (
    <div className="flex min-h-full flex-col items-center bg-slate-900 text-slate-100">
      {canPause && !paused && (
        <div className="flex w-full max-w-md justify-end gap-2 px-3 pt-3">
          <button
            type="button"
            aria-label="Open rules"
            onClick={() => setRulesOpen(true)}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-600 active:scale-95"
          >
            Rules
          </button>
          <button
            type="button"
            aria-label="Pause game"
            onClick={() => setPaused(true)}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-600 active:scale-95"
          >
            Pause
          </button>
        </div>
      )}
      {IN_GAME.has(state.phase) && <ScoreTrack state={state} />}
      <main className="flex w-full max-w-md flex-1 flex-col">
        {state.phase === 'setup' ? (
          <Setup onHowToPlay={() => setTutorialOpen(true)} />
        ) : (
          <Screen />
        )}
      </main>
      {/* Overlay: renders above the (still-mounted) Setup so typed names survive.
          The tutorial never dispatches, so the persisted game stays untouched. */}
      {tutorialOpen && <Tutorial onExit={() => setTutorialOpen(false)} />}
      {/* Pause overlay: opaque, hides the board entirely. Gated on a pausable
          phase so a stale persisted flag can never cover setup/gameOver. */}
      {paused && canPause && (
        <PauseOverlay
          onResume={() => setPaused(false)}
          onQuit={handleQuit}
          onViewRules={() => setRulesOpen(true)}
        />
      )}
      {/* Rules sheet: transient quick-reference, never persisted. At z-[60] it
          opens above the Pause overlay (z-50) and closes back to it. */}
      {rulesOpen && <RulesOverlay onClose={() => setRulesOpen(false)} />}
    </div>
  )
}
