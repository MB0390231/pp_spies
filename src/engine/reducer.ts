// The state machine: (state, action) => nextState. Pure — no React, no I/O,
// no Math.random (randomness enters only via the SETUP seed).

import { mulberry32 } from './random'
import {
  MAX_REJECTS,
  MISSIONS,
  MISSIONS_TO_WIN,
  buildRoles,
  isValidPlayerCount,
  missionFails,
  spyCount,
  teamSize,
} from './rules'
import type { Action, GameState, MissionResult, Player } from './types'

export function initialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    spyCount: 0,
    challengeMode: false,
    practice: false,
    round: 1,
    leaderIndex: 0,
    consecutiveRejects: 0,
    proposedTeam: [],
    missionCards: {},
    results: [],
    successes: 0,
    fails: 0,
    lastMission: null,
    winner: null,
  }
}

/**
 * Deal roles from a seed and drop players at a fresh roleReveal. Shared by SETUP
 * and BEGIN_REAL_GAME so real and practice deals use the identical seeded path —
 * no Math.random in the reducer, ever.
 */
function dealGame(
  names: string[],
  seed: number,
  opts: { challengeMode: boolean; practice: boolean },
): GameState {
  const n = names.length
  if (!isValidPlayerCount(n)) {
    throw new Error(`Cannot start with ${n} players`)
  }
  const rng = mulberry32(seed)
  const roles = buildRoles(n, rng)
  const players: Player[] = names.map((name, id) => ({ id, name, role: roles[id]! }))
  const leaderIndex = Math.floor(rng() * n)
  return {
    ...initialState(),
    phase: 'roleReveal',
    players,
    spyCount: spyCount(n),
    challengeMode: opts.challengeMode,
    practice: opts.practice,
    leaderIndex,
  }
}

/** Current leader's player id, or null before setup. */
export function currentLeaderId(state: GameState): number | null {
  return state.players[state.leaderIndex]?.id ?? null
}

/** Required team size for the current round, or 0 if not in a game. */
export function currentTeamSize(state: GameState): number {
  if (state.players.length === 0) return 0
  return teamSize(state.players.length, state.round, state.challengeMode)
}

function nextLeaderIndex(state: GameState): number {
  return (state.leaderIndex + 1) % state.players.length
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SETUP': {
      return dealGame(action.names, action.seed, {
        challengeMode: action.challengeMode ?? false,
        practice: action.practice ?? false,
      })
    }

    case 'BEGIN_REAL_GAME': {
      // Only meaningful while practicing; a no-op otherwise (strict state
      // machine). Re-deal REAL roles with a fresh seed so practice roles never
      // leak, carrying over the same players (by name) and challenge setting.
      if (!state.practice) return state
      return dealGame(
        state.players.map((p) => p.name),
        action.seed,
        { challengeMode: state.challengeMode, practice: false },
      )
    }

    case 'START_ROUNDS': {
      if (state.phase !== 'roleReveal') return state
      return { ...state, phase: 'teamProposal' }
    }

    case 'PROPOSE_TEAM': {
      if (state.phase !== 'teamProposal') return state
      const required = currentTeamSize(state)
      const unique = new Set(action.team)
      const valid =
        unique.size === action.team.length &&
        action.team.length === required &&
        action.team.every((id) => state.players.some((p) => p.id === id))
      if (!valid) {
        throw new Error(
          `Team must have exactly ${required} distinct players from the game`,
        )
      }
      return {
        ...state,
        proposedTeam: [...action.team],
        phase: 'proposalVote',
      }
    }

    case 'RESOLVE_PROPOSAL': {
      // The actual vote happens off-device: the table gives a show of hands
      // and one person records the outcome. No per-player ballots, no phone
      // passing — this single action carries the whole decision.
      if (state.phase !== 'proposalVote') return state
      if (action.approved) {
        return {
          ...state,
          consecutiveRejects: 0,
          missionCards: {},
          phase: 'mission',
        }
      }
      const consecutiveRejects = state.consecutiveRejects + 1
      // In practice, 5 rejects doesn't hand the spies the win — it just resets
      // the counter and rolls on, so the rehearsal never ends.
      if (consecutiveRejects >= MAX_REJECTS && !state.practice) {
        return {
          ...state,
          consecutiveRejects,
          winner: 'spies',
          phase: 'gameOver',
        }
      }
      return {
        ...state,
        consecutiveRejects: state.practice && consecutiveRejects >= MAX_REJECTS ? 0 : consecutiveRejects,
        leaderIndex: nextLeaderIndex(state),
        proposedTeam: [],
        phase: 'teamProposal',
      }
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'mission') return state
      if (!state.proposedTeam.includes(action.playerId)) {
        throw new Error(`Player ${action.playerId} is not on the mission`)
      }
      const player = state.players.find((p) => p.id === action.playerId)!
      // Resistance can never sabotage — coerce any fail card to success.
      const card = player.role === 'resistance' ? 'success' : action.card
      const missionCards = { ...state.missionCards, [action.playerId]: card }
      if (Object.keys(missionCards).length < state.proposedTeam.length) {
        return { ...state, missionCards }
      }
      // All cards are in — compute the outcome.
      const n = state.players.length
      const failCount = Object.values(missionCards).filter(
        (c) => c === 'fail',
      ).length
      const success = !missionFails(n, state.round, failCount)
      const lastMission: MissionResult = {
        round: state.round,
        team: [...state.proposedTeam],
        failCount,
        success,
      }
      return { ...state, missionCards, lastMission, phase: 'missionReveal' }
    }

    case 'CONFIRM_MISSION': {
      if (state.phase !== 'missionReveal' || !state.lastMission) return state

      // Practice: the reveal has already been shown; now loop into a FRESH
      // practice round. Rotate the leader and cycle the round (1..5) so team
      // sizes vary, but never touch the real score/results and never end.
      if (state.practice) {
        const nextRound = (state.round % MISSIONS) + 1
        return {
          ...state,
          round: nextRound,
          leaderIndex: nextLeaderIndex(state),
          consecutiveRejects: 0,
          proposedTeam: [],
          missionCards: {},
          lastMission: null,
          phase: 'teamProposal',
        }
      }

      const results = [...state.results, state.lastMission]
      const successes = state.successes + (state.lastMission.success ? 1 : 0)
      const fails = state.fails + (state.lastMission.success ? 0 : 1)

      if (successes >= MISSIONS_TO_WIN) {
        return { ...state, results, successes, fails, winner: 'resistance', phase: 'gameOver' }
      }
      if (fails >= MISSIONS_TO_WIN) {
        return { ...state, results, successes, fails, winner: 'spies', phase: 'gameOver' }
      }
      return {
        ...state,
        results,
        successes,
        fails,
        round: state.round + 1,
        leaderIndex: nextLeaderIndex(state),
        consecutiveRejects: 0,
        proposedTeam: [],
        missionCards: {},
        phase: 'teamProposal',
      }
    }

    case 'RESET':
      return initialState()

    default:
      return state
  }
}
