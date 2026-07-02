// A full-game driver for the pure engine. Plays a complete game by dispatching
// the *real* reducer (no rules duplicated) given a pluggable Strategy, so logic
// can be exercised end-to-end without the UI. Stays framework-agnostic — no
// React, no DOM, no Math.random (any randomness comes from a seed).

import { mulberry32, shuffle } from './random'
import { currentTeamSize, initialState, reducer } from './reducer'
import { MAX_REJECTS, MISSIONS_TO_WIN } from './rules'
import type { GameState, MissionCard, Player } from './types'

/** Decides every choice a game requires. Pure functions of the public state. */
export interface Strategy {
  /** The current leader's team pick (size is validated by the reducer). */
  proposeTeam(state: GameState): number[]
  /**
   * The table's one-tap verdict on the proposed team. Voting happens out
   * loud (show of hands); the engine only records the outcome.
   */
  approveProposal(state: GameState): boolean
  /** The card `playerId` plays on the mission (resistance is coerced to success). */
  playCard(state: GameState, playerId: number): MissionCard
}

export interface TranscriptEntry {
  round: number
  text: string
}

export interface SimResult {
  finalState: GameState
  transcript: TranscriptEntry[]
  /** Number of missions that were actually resolved. */
  rounds: number
}

// Guard against a strategy that somehow never reaches gameOver. A real game
// resolves in well under this many reducer steps.
const MAX_STEPS = 500

function nameOf(state: GameState, id: number): string {
  return state.players.find((p) => p.id === id)?.name ?? `#${id}`
}

/**
 * Play a complete game and return the final state plus a human-readable
 * transcript. Deterministic for a given (names, seed, strategy).
 */
export function simulateGame(names: string[], seed: number, strategy: Strategy): SimResult {
  let state = reducer(initialState(), { type: 'SETUP', names, seed })
  state = reducer(state, { type: 'START_ROUNDS' })

  const transcript: TranscriptEntry[] = []
  let steps = 0

  while (state.phase !== 'gameOver') {
    if (++steps > MAX_STEPS) {
      throw new Error('simulateGame exceeded the step cap — the game did not terminate')
    }

    switch (state.phase) {
      case 'teamProposal': {
        const leader = nameOf(state, state.players[state.leaderIndex]!.id)
        const team = strategy.proposeTeam(state)
        state = reducer(state, { type: 'PROPOSE_TEAM', team })
        const picks = team.map((id) => nameOf(state, id)).join(', ')
        transcript.push({ round: state.round, text: `R${state.round}: ${leader} proposes [${picks}]` })
        break
      }

      case 'proposalVote': {
        const approved = strategy.approveProposal(state)
        transcript.push({
          round: state.round,
          text: `  proposal: ${approved ? 'PASSED' : 'FAILED'}`,
        })
        state = reducer(state, { type: 'RESOLVE_PROPOSAL', approved })
        if (!approved && state.phase === 'teamProposal') {
          transcript.push({
            round: state.round,
            text: `  rejected (${state.consecutiveRejects}/${MAX_REJECTS} consecutive) — leader rotates`,
          })
        }
        break
      }

      case 'mission': {
        for (const id of state.proposedTeam) {
          state = reducer(state, {
            type: 'PLAY_CARD',
            playerId: id,
            card: strategy.playCard(state, id),
          })
        }
        break
      }

      case 'missionReveal': {
        const m = state.lastMission!
        transcript.push({
          round: m.round,
          text: `  mission: ${m.team.length} cards, ${m.failCount} fail → ${m.success ? 'SUCCEEDED ✔' : 'FAILED ✘'}`,
        })
        state = reducer(state, { type: 'CONFIRM_MISSION' })
        break
      }

      default:
        throw new Error(`simulateGame reached an unexpected phase: ${state.phase}`)
    }
  }

  const reason =
    state.winner === 'resistance'
      ? `${state.successes} missions succeeded`
      : state.fails >= MISSIONS_TO_WIN
        ? `${state.fails} missions failed`
        : `${MAX_REJECTS} consecutive rejected proposals`
  transcript.push({
    round: state.round,
    text: `=> ${state.winner === 'resistance' ? 'RESISTANCE' : 'SPIES'} WIN (${reason})`,
  })

  return { finalState: state, transcript, rounds: state.results.length }
}

// --- Built-in strategies ---------------------------------------------------
// Strategies read role data straight off `state.players`, so they're fully
// deterministic without introducing any new randomness.

function isSpy(state: GameState, id: number): boolean {
  return state.players.find((p) => p.id === id)?.role === 'spy'
}

/** Required-size team, listing `preferred` ids first, then everyone else. */
function teamPreferring(state: GameState, preferred: number[]): number[] {
  const size = currentTeamSize(state)
  const ids = state.players.map((p) => p.id)
  const rest = ids.filter((id) => !preferred.includes(id))
  return [...preferred.filter((id) => ids.includes(id)), ...rest].slice(0, size)
}

const spyIds = (state: GameState): number[] =>
  state.players.filter((p) => p.role === 'spy').map((p) => p.id)

/** Every proposal passes and every card succeeds → the Resistance wins. */
export const cooperativeStrategy: Strategy = {
  proposeTeam: (s) => teamPreferring(s, []),
  approveProposal: () => true,
  playCard: () => 'success',
}

/** Leaders stack the team with spies who always sabotage → the Spies win. */
export const saboteurStrategy: Strategy = {
  proposeTeam: (s) => teamPreferring(s, spyIds(s)),
  approveProposal: () => true,
  playCard: (s, id) => (isSpy(s, id) ? 'fail' : 'success'),
}

/** The table rejects every proposal → the Spies win on 5 consecutive rejects. */
export const obstructionStrategy: Strategy = {
  proposeTeam: (s) => teamPreferring(s, []),
  approveProposal: () => false,
  playCard: () => 'success',
}

/** Seeded random play, for stress-testing engine invariants over many games. */
export function randomStrategy(seed: number): Strategy {
  const rng = mulberry32(seed)
  return {
    proposeTeam: (s) => shuffle(s.players.map((p: Player) => p.id), rng).slice(0, currentTeamSize(s)),
    approveProposal: () => rng() < 0.5,
    playCard: (s, id) => (isSpy(s, id) && rng() < 0.5 ? 'fail' : 'success'),
  }
}
