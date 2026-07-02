// Scenario / edge-case coverage that drives the *real reducer* (and the
// simulate harness) through situations the unit tests don't pin down — most
// importantly the Round-4 "needs two fails" rule across every player count and
// its sharp 6→7 boundary, plus a few whole-game flow edges.

import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './reducer'
import { spyCount, teamSize } from './rules'
import { cooperativeStrategy, simulateGame, type Strategy } from './simulate'
import type { GameState, MissionCard, Player } from './types'

const WITH_RULE = [7, 8, 9, 10, 11, 12, 13] as const // counts where Round 4 needs two fails
const WITHOUT_RULE = [5, 6] as const

// Players where ids [0, spyCount) are spies and the rest are resistance — a
// fixed, readable layout so teams can be composed by id.
function buildPlayers(n: number): Player[] {
  const spies = spyCount(n)
  return Array.from({ length: n }, (_, id) => ({
    id,
    name: `P${id}`,
    role: id < spies ? 'spy' : 'resistance',
  }))
}

const spyIds = (n: number): number[] => Array.from({ length: spyCount(n) }, (_, i) => i)
const resistanceIds = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i).filter((i) => i >= spyCount(n))

/** A valid 'mission' state for `round` whose team holds exactly `spiesOnTeam` spies. */
function missionState(n: number, round: number, spiesOnTeam: number): GameState {
  const size = teamSize(n, round)
  const spies = spyIds(n).slice(0, spiesOnTeam)
  const fill = resistanceIds(n).slice(0, size - spies.length)
  const team = [...spies, ...fill]
  if (team.length !== size) {
    throw new Error(`cannot build a ${size}-player team with ${spiesOnTeam} spies for ${n} players`)
  }
  return {
    ...initialState(),
    phase: 'mission',
    players: buildPlayers(n),
    spyCount: spyCount(n),
    round,
    proposedTeam: team,
    missionCards: {},
  }
}

/** Resolve a mission where the first `fails` spies on the team play a fail card. */
function resolveMission(state: GameState, fails: number) {
  const teamSpies = state.proposedTeam.filter(
    (id) => state.players.find((p) => p.id === id)?.role === 'spy',
  )
  const failers = new Set(teamSpies.slice(0, fails))
  const done = state.proposedTeam.reduce<GameState>((s, id) => {
    const card: MissionCard = failers.has(id) ? 'fail' : 'success'
    return reducer(s, { type: 'PLAY_CARD', playerId: id, card })
  }, state)
  return done.lastMission!
}

/** Outcome of playing `failCount` fail cards on `round` in an `n`-player game. */
function outcome(n: number, round: number, failCount: number) {
  return resolveMission(missionState(n, round, failCount), failCount)
}

describe('Round 4 rule — two fails required with 7+ players', () => {
  it.each(WITHOUT_RULE)('one fail card still sinks Round 4 with %i players', (n) => {
    const m = outcome(n, 4, 1)
    expect(m.failCount).toBe(1)
    expect(m.success).toBe(false)
  })

  it.each(WITH_RULE)('one fail card is NOT enough on Round 4 with %i players', (n) => {
    const m = outcome(n, 4, 1)
    expect(m.failCount).toBe(1)
    expect(m.success).toBe(true)
  })

  it.each(WITH_RULE)('two fail cards do sink Round 4 with %i players', (n) => {
    const m = outcome(n, 4, 2)
    expect(m.failCount).toBe(2)
    expect(m.success).toBe(false)
  })

  it.each(WITH_RULE)('three fail cards also sink Round 4 with %i players', (n) => {
    const m = outcome(n, 4, 3)
    expect(m.failCount).toBe(3)
    expect(m.success).toBe(false)
  })

  it('flips exactly at the 6→7 player boundary', () => {
    expect(outcome(6, 4, 1).success).toBe(false) // 6 players: one fail fails
    expect(outcome(7, 4, 1).success).toBe(true) //  7 players: one fail survives
  })
})

describe('Round 4 is the only special round', () => {
  it.each([1, 2, 3, 5])('Round %i fails on a single fail card even with 10 players', (round) => {
    const m = outcome(10, round, 1)
    expect(m.failCount).toBe(1)
    expect(m.success).toBe(false)
  })
})

describe('mission card edge cases', () => {
  it('a spy on the team who plays success does not fail the mission', () => {
    // One spy is present but chooses not to sabotage.
    const m = resolveMission(missionState(7, 1, 1), 0)
    expect(m.failCount).toBe(0)
    expect(m.success).toBe(true)
  })

  it('failCount counts only the spies who actually sabotage', () => {
    // Two spies on a Round 2 team, but only one plays a fail card.
    const m = resolveMission(missionState(7, 2, 2), 1)
    expect(m.failCount).toBe(1)
    expect(m.success).toBe(false) // round 2 needs only one
  })
})

// A scripted strategy: one spy per team who sabotages only on even rounds. With
// 5 players (no Round-4 rule) this yields S, F, S, F across rounds 1-4, forcing
// the game to the deciding 5th mission.
const oneSpyEvenRoundSabotage: Strategy = {
  proposeTeam: (s) => {
    const size = teamSize(s.players.length, s.round)
    const spy = s.players.find((p) => p.role === 'spy')!.id
    const resistance = s.players.filter((p) => p.role === 'resistance').map((p) => p.id)
    return [spy, ...resistance].slice(0, size)
  },
  vote: () => 'approve',
  playCard: (s, id) =>
    s.players.find((p) => p.id === id)?.role === 'spy' && s.round % 2 === 0 ? 'fail' : 'success',
}

describe('whole-game flow edges', () => {
  it('can be decided on the 5th mission', () => {
    const { finalState } = simulateGame(['A', 'B', 'C', 'D', 'E'], 1, oneSpyEvenRoundSabotage)
    expect(finalState.results).toHaveLength(5)
    expect(finalState.results[finalState.results.length - 1]!.round).toBe(5)
    expect(finalState.successes).toBe(3)
    expect(finalState.fails).toBe(2)
    expect(finalState.winner).toBe('resistance')
  })

  it('ends immediately on the earliest possible win (3 straight) with no extra rounds', () => {
    const { finalState } = simulateGame(['A', 'B', 'C', 'D', 'E', 'F', 'G'], 1, cooperativeStrategy)
    expect(finalState.round).toBe(3)
    expect(finalState.results).toHaveLength(3)
    expect(finalState.winner).toBe('resistance')
  })
})

// --- Voting edge cases driven straight through the reducer ------------------

function started(n: number, seed = 1): GameState {
  const setup = reducer(initialState(), {
    type: 'SETUP',
    names: Array.from({ length: n }, (_, i) => `P${i}`),
    seed,
  })
  return reducer(setup, { type: 'START_ROUNDS' })
}

describe('even-count vote ties reject', () => {
  it.each([6, 8, 10])('a %i-player even split ties and rejects', (n) => {
    const size = teamSize(n, 1)
    const team = Array.from({ length: size }, (_, i) => i)
    const proposed = reducer(started(n), { type: 'PROPOSE_TEAM', team })
    const half = n / 2
    const voted = proposed.players.reduce(
      (s, p) => reducer(s, { type: 'CAST_VOTE', playerId: p.id, vote: p.id < half ? 'approve' : 'reject' }),
      proposed,
    )
    expect(voted.lastVote).toMatchObject({ approveCount: half, rejectCount: half, approved: false })

    const confirmed = reducer(voted, { type: 'CONFIRM_VOTE' })
    expect(confirmed.phase).toBe('teamProposal')
    expect(confirmed.consecutiveRejects).toBe(1)
  })
})
