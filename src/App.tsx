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
import { ProposalVote } from './screens/ProposalVote'
import { Setup } from './screens/Setup'
import { TeamProposal } from './screens/TeamProposal'
import { useGame } from './state/GameContext'
import { usePaused } from './state/usePaused'
import { useLexicon } from './theme'

const SCREENS: Record<Phase, ComponentType> = {
  setup: Setup,
  roleReveal: RoleReveal,
  teamProposal: TeamProposal,
  proposalVote: ProposalVote,
  mission: Mission,
  missionReveal: MissionReveal,
  gameOver: GameOver,
}

// Phases that show the public score header.
const IN_GAME: ReadonlySet<Phase> = new Set<Phase>([
  'teamProposal',
  'proposalVote',
  'mission',
  'missionReveal',
])

// Phases where a game is in progress and can be paused (everything but setup/gameOver).
const PAUSABLE: ReadonlySet<Phase> = new Set<Phase>([
  'roleReveal',
  'teamProposal',
  'proposalVote',
  'mission',
  'missionReveal',
])

/** Quiet top-bar action (Rules / Pause) — a labeled utility, not a primary CTA. */
function TopBarButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-control border border-line bg-surface/80 px-4 py-2 font-mono text-xs uppercase tracking-label text-muted transition duration-fast ease-theme hover:border-line-strong hover:text-ink active:scale-95"
    >
      {label}
    </button>
  )
}

export default function App() {
  const { state, dispatch } = useGame()
  const lex = useLexicon()
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
    <div className="flex min-h-full flex-col items-center text-ink">
      {canPause && !paused && (
        <div className="flex w-full max-w-md justify-end gap-2 px-3 pt-3">
          <TopBarButton label={lex.topBar.rules} onClick={() => setRulesOpen(true)} />
          <TopBarButton label={lex.topBar.pause} onClick={() => setPaused(true)} />
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
