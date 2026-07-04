// Mock game states, one per screen + variant, for the visual storybook. Each is
// built off the engine's initialState() with overrides so they can't drift from
// the real GameState shape. Selecting a scenario renders the *real* screen
// against this state — what you see is the actual component.

import { initialState } from '../engine'
import type { ComponentType } from 'react'
import type { GameState, Player } from '../engine'
import { GameOver } from '../screens/GameOver'
import { Mission } from '../screens/Mission'
import { MissionReveal } from '../screens/MissionReveal'
import { ProposalVote } from '../screens/ProposalVote'
import { RoleReveal } from '../screens/RoleReveal'
import { Setup } from '../screens/Setup'
import { TeamProposal } from '../screens/TeamProposal'

export interface Scenario {
  id: string
  label: string
  /** The phase screen to render. Omitted for full-frame overlays (see `overlay`). */
  Screen?: ComponentType
  state: GameState
  /** Optional caption shown under the title (e.g. handoff hint for private screens). */
  note?: string
  /** Render the public ScoreTrack header above the screen, as the live app does. */
  showScore?: boolean
  /** Render a full-frame overlay instead of a phase Screen. */
  overlay?: 'pause' | 'rules' | 'settings' | 'tutorial'
}

const GATE_HINT = 'Private screen — tap the handoff to reveal what the player sees.'

// 5 players, 2 spies (Bob, Eve) — the default cast.
const P5: Player[] = [
  { id: 0, name: 'Alice', role: 'resistance' },
  { id: 1, name: 'Bob', role: 'spy' },
  { id: 2, name: 'Charlie', role: 'resistance' },
  { id: 3, name: 'Diana', role: 'resistance' },
  { id: 4, name: 'Eve', role: 'spy' },
]

// 7 players, 3 spies — needed to show the Round-4 "needs 2 fails" rule.
const P7: Player[] = [
  { id: 0, name: 'Alice', role: 'resistance' },
  { id: 1, name: 'Bob', role: 'spy' },
  { id: 2, name: 'Charlie', role: 'resistance' },
  { id: 3, name: 'Diana', role: 'resistance' },
  { id: 4, name: 'Eve', role: 'spy' },
  { id: 5, name: 'Frank', role: 'resistance' },
  { id: 6, name: 'Grace', role: 'spy' },
]

// RoleReveal shows players[0], so swap Alice's role to drive the two variants.
const spyFirst: Player[] = [{ id: 0, name: 'Alice', role: 'spy' }, ...P5.slice(1)]

function make(overrides: Partial<GameState>): GameState {
  return { ...initialState(), ...overrides }
}

export const scenarios: Scenario[] = [
  {
    id: 'setup',
    label: 'Setup',
    Screen: Setup,
    state: make({ phase: 'setup' }),
  },
  {
    id: 'role-spy',
    label: 'Role Reveal — Spy',
    Screen: RoleReveal,
    note: GATE_HINT,
    state: make({ phase: 'roleReveal', players: spyFirst, spyCount: 2 }),
  },
  {
    id: 'role-resistance',
    label: 'Role Reveal — Resistance',
    Screen: RoleReveal,
    note: GATE_HINT,
    state: make({ phase: 'roleReveal', players: P5, spyCount: 2 }),
  },
  {
    id: 'role-practice',
    label: 'Role Reveal — Practice',
    Screen: RoleReveal,
    note: 'Practice deals throwaway roles — note the "practice role" label so nobody thinks it’s their real one.',
    state: make({ phase: 'roleReveal', players: P5, spyCount: 2, practice: true }),
  },
  {
    id: 'team-proposal',
    label: 'Team Proposal',
    Screen: TeamProposal,
    showScore: true,
    state: make({ phase: 'teamProposal', players: P5, spyCount: 2, round: 1, leaderIndex: 0 }),
  },
  {
    id: 'team-proposal-practice',
    label: 'Team Proposal — Practice',
    Screen: TeamProposal,
    note: 'A practice round in progress — the score track shows the practice badge; nothing counts.',
    showScore: true,
    state: make({
      phase: 'teamProposal',
      players: P5,
      spyCount: 2,
      round: 3,
      leaderIndex: 1,
      practice: true,
    }),
  },
  {
    id: 'proposal-vote',
    label: 'Proposal Vote',
    Screen: ProposalVote,
    note: 'Public one-tap outcome: the table votes out loud, one person records it.',
    showScore: true,
    state: make({
      phase: 'proposalVote',
      players: P5,
      spyCount: 2,
      round: 1,
      proposedTeam: [1, 3],
    }),
  },
  {
    id: 'mission-spy',
    label: 'Mission — Spy',
    Screen: Mission,
    note: GATE_HINT,
    showScore: true,
    // proposedTeam[0] is Bob (spy) → the Fail (sabotage) button appears.
    state: make({ phase: 'mission', players: P5, spyCount: 2, round: 1, proposedTeam: [1, 3] }),
  },
  {
    id: 'mission-resistance',
    label: 'Mission — Resistance',
    Screen: Mission,
    note: GATE_HINT,
    showScore: true,
    // proposedTeam[0] is Alice (resistance) → no Fail button, only Succeed.
    state: make({ phase: 'mission', players: P5, spyCount: 2, round: 1, proposedTeam: [0, 2] }),
  },
  {
    id: 'mission-success',
    label: 'Mission Reveal — Success',
    Screen: MissionReveal,
    showScore: true,
    state: make({
      phase: 'missionReveal',
      players: P5,
      spyCount: 2,
      round: 1,
      lastMission: { round: 1, team: [0, 2], failCount: 0, success: true },
    }),
  },
  {
    id: 'mission-failed-r4',
    label: 'Mission Reveal — Failed (R4 rule)',
    Screen: MissionReveal,
    showScore: true,
    // 7 players on Round 4: two fail cards were needed, and two landed.
    state: make({
      phase: 'missionReveal',
      players: P7,
      spyCount: 3,
      round: 4,
      successes: 1,
      fails: 2,
      results: [
        { round: 1, team: [0, 1], failCount: 0, success: true },
        { round: 2, team: [0, 1, 2], failCount: 1, success: false },
        { round: 3, team: [0, 1, 2], failCount: 1, success: false },
      ],
      lastMission: { round: 4, team: [1, 4, 6, 0], failCount: 2, success: false },
    }),
  },
  {
    id: 'gameover-resistance',
    label: 'Game Over — Resistance wins',
    Screen: GameOver,
    state: make({ phase: 'gameOver', players: P5, spyCount: 2, winner: 'resistance', successes: 3, fails: 1 }),
  },
  {
    id: 'gameover-spies',
    label: 'Game Over — Spies win',
    Screen: GameOver,
    state: make({ phase: 'gameOver', players: P5, spyCount: 2, winner: 'spies', successes: 1, fails: 3 }),
  },
  {
    id: 'pause',
    label: 'Pause Overlay',
    note: 'Shown mid-game; tap "Quit to menu" to see the confirm state.',
    overlay: 'pause',
    state: make({ phase: 'teamProposal', players: P5, spyCount: 2, round: 1, leaderIndex: 0 }),
  },
  {
    id: 'rules',
    label: 'Rules Overlay',
    note: 'Mid-game quick reference; opened from the top bar or the Pause screen.',
    overlay: 'rules',
    state: make({ phase: 'teamProposal', players: P5, spyCount: 2, round: 1, leaderIndex: 0 }),
  },
  {
    id: 'settings',
    label: 'Settings Sheet',
    note: 'Opened from the gear on Setup. Theme picks here are previews only (not persisted).',
    overlay: 'settings',
    state: make({ phase: 'setup' }),
  },
  {
    id: 'tutorial',
    label: 'Tutorial',
    note: 'The full guided walkthrough — step forward to the one-tap proposal-vote scene.',
    overlay: 'tutorial',
    state: make({ phase: 'setup' }),
  },
]
