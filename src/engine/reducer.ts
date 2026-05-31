// The state machine: (state, action) => nextState. Pure — no React, no I/O,
// no Math.random (randomness enters only via the SETUP seed).

import { mulberry32 } from './random'
import {
  MAX_REJECTS,
  MISSIONS_TO_WIN,
  buildRoles,
  isValidPlayerCount,
  missionFails,
  spyCount,
  teamSize,
  voteApproved,
} from './rules'
import type { Action, GameState, MissionResult, Player, VoteRecord } from './types'

export function initialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    spyCount: 0,
    round: 1,
    leaderIndex: 0,
    consecutiveRejects: 0,
    proposedTeam: [],
    votes: {},
    missionCards: {},
    results: [],
    successes: 0,
    fails: 0,
    lastVote: null,
    lastMission: null,
    winner: null,
  }
}

/** Current leader's player id, or null before setup. */
export function currentLeaderId(state: GameState): number | null {
  return state.players[state.leaderIndex]?.id ?? null
}

/** Required team size for the current round, or 0 if not in a game. */
export function currentTeamSize(state: GameState): number {
  if (state.players.length === 0) return 0
  return teamSize(state.players.length, state.round)
}

function nextLeaderIndex(state: GameState): number {
  return (state.leaderIndex + 1) % state.players.length
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SETUP': {
      const n = action.names.length
      if (!isValidPlayerCount(n)) {
        throw new Error(`Cannot start with ${n} players`)
      }
      const rng = mulberry32(action.seed)
      const roles = buildRoles(n, rng)
      const players: Player[] = action.names.map((name, id) => ({
        id,
        name,
        role: roles[id]!,
      }))
      const leaderIndex = Math.floor(rng() * n)
      return {
        ...initialState(),
        phase: 'roleReveal',
        players,
        spyCount: spyCount(n),
        leaderIndex,
      }
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
        votes: {},
        phase: 'vote',
      }
    }

    case 'CAST_VOTE': {
      if (state.phase !== 'vote') return state
      const known = state.players.some((p) => p.id === action.playerId)
      if (!known) throw new Error(`Unknown player: ${action.playerId}`)
      const votes = { ...state.votes, [action.playerId]: action.vote }
      if (Object.keys(votes).length < state.players.length) {
        return { ...state, votes }
      }
      // All votes are in — compute the reveal.
      let approveCount = 0
      let rejectCount = 0
      for (const v of Object.values(votes)) {
        if (v === 'approve') approveCount++
        else rejectCount++
      }
      const approved = voteApproved(approveCount, rejectCount)
      const lastVote: VoteRecord = {
        round: state.round,
        team: [...state.proposedTeam],
        votes,
        approveCount,
        rejectCount,
        approved,
      }
      return { ...state, votes, lastVote, phase: 'voteReveal' }
    }

    case 'CONFIRM_VOTE': {
      if (state.phase !== 'voteReveal' || !state.lastVote) return state
      if (state.lastVote.approved) {
        return {
          ...state,
          consecutiveRejects: 0,
          missionCards: {},
          phase: 'mission',
        }
      }
      const consecutiveRejects = state.consecutiveRejects + 1
      if (consecutiveRejects >= MAX_REJECTS) {
        return {
          ...state,
          consecutiveRejects,
          winner: 'spies',
          phase: 'gameOver',
        }
      }
      return {
        ...state,
        consecutiveRejects,
        leaderIndex: nextLeaderIndex(state),
        proposedTeam: [],
        votes: {},
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
        votes: {},
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
