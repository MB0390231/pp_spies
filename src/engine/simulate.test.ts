import { describe, expect, it } from 'vitest'
import { SPY_COUNTS, teamSize } from './rules'
import {
  cooperativeStrategy,
  obstructionStrategy,
  randomStrategy,
  saboteurStrategy,
  simulateGame,
  type Strategy,
} from './simulate'
import type { GameState } from './types'

const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy', 'Kevin', 'Laura', 'Mallory']
const names = (n: number) => NAMES.slice(0, n)
const PLAYER_COUNTS = [5, 6, 7, 8, 9, 10, 11, 12, 13] as const

describe('simulateGame — win-condition scenarios', () => {
  it('cooperative play lets the Resistance win with 3 successes', () => {
    const { finalState } = simulateGame(names(7), 1, cooperativeStrategy)
    expect(finalState.phase).toBe('gameOver')
    expect(finalState.winner).toBe('resistance')
    expect(finalState.successes).toBe(3)
    expect(finalState.fails).toBe(0)
  })

  it('spies sabotaging every mission win with 3 fails', () => {
    const { finalState } = simulateGame(names(7), 2, saboteurStrategy)
    expect(finalState.phase).toBe('gameOver')
    expect(finalState.winner).toBe('spies')
    expect(finalState.fails).toBe(3)
  })

  it('rejecting every proposal hands the Spies a win on 5 rejects', () => {
    const { finalState } = simulateGame(names(5), 3, obstructionStrategy)
    expect(finalState.phase).toBe('gameOver')
    expect(finalState.winner).toBe('spies')
    expect(finalState.consecutiveRejects).toBe(5)
    expect(finalState.results).toHaveLength(0)
  })
})

describe('simulateGame — every player count completes correctly', () => {
  it.each(PLAYER_COUNTS)('a %i-player game reaches gameOver with valid structure', (n) => {
    const { finalState } = simulateGame(names(n), 100 + n, cooperativeStrategy)
    expect(finalState.phase).toBe('gameOver')
    expect(finalState.winner).not.toBeNull()
    expect(finalState.spyCount).toBe(SPY_COUNTS[n])
    expect(finalState.players.filter((p) => p.role === 'spy')).toHaveLength(SPY_COUNTS[n]!)
    // Every resolved mission used the rulebook's team size for its round.
    for (const result of finalState.results) {
      expect(result.team).toHaveLength(teamSize(n, result.round))
    }
  })
})

describe('simulateGame — Round-4 two-fail rule (7+ players)', () => {
  // One spy on every team. The spy sabotages only on even rounds, so a single
  // fail card lands on R2 (fails) and again on R4 (must NOT fail — needs 2).
  const oneSpyEvenRoundSabotage: Strategy = {
    proposeTeam: (s) => {
      const size = teamSize(s.players.length, s.round)
      const spy = s.players.find((p) => p.role === 'spy')!.id
      const resistance = s.players.filter((p) => p.role === 'resistance').map((p) => p.id)
      return [spy, ...resistance].slice(0, size)
    },
    vote: () => 'approve',
    playCard: (s, id) => {
      const spy = s.players.find((p) => p.id === id)?.role === 'spy'
      return spy && s.round % 2 === 0 ? 'fail' : 'success'
    },
  }

  it.each([7, 8, 9, 10])('one fail card fails R2 but not R4 for %i players', (n) => {
    const { finalState } = simulateGame(names(n), 7, oneSpyEvenRoundSabotage)

    const r2 = finalState.results.find((r) => r.round === 2)
    const r4 = finalState.results.find((r) => r.round === 4)

    // R2: a lone fail card sinks the mission (needs only 1).
    expect(r2).toBeDefined()
    expect(r2!.failCount).toBe(1)
    expect(r2!.success).toBe(false)

    // R4: the same lone fail card is not enough (needs 2), so it succeeds —
    // giving the Resistance its third success and the game.
    expect(r4).toBeDefined()
    expect(r4!.failCount).toBe(1)
    expect(r4!.success).toBe(true)
    expect(finalState.winner).toBe('resistance')
  })
})

describe('simulateGame — invariants hold across many random games', () => {
  it('200 random games each end in a single, rule-consistent win', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const n = PLAYER_COUNTS[seed % PLAYER_COUNTS.length]!
      const { finalState } = simulateGame(names(n), seed, randomStrategy(seed))
      assertTerminalInvariants(finalState, seed)
    }
  })
})

function assertTerminalInvariants(s: GameState, seed: number): void {
  const ctx = `seed ${seed}`
  // The game actually finished with exactly one winner.
  expect(s.phase, ctx).toBe('gameOver')
  expect(s.winner === 'resistance' || s.winner === 'spies', ctx).toBe(true)

  // Score bookkeeping is consistent and never overruns.
  expect(s.successes + s.fails, ctx).toBe(s.results.length)
  expect(s.successes, ctx).toBeLessThanOrEqual(3)
  expect(s.fails, ctx).toBeLessThanOrEqual(3)
  expect(s.consecutiveRejects, ctx).toBeLessThanOrEqual(5)

  // The declared winner matches a satisfied win condition.
  if (s.winner === 'resistance') {
    expect(s.successes, ctx).toBe(3)
  } else {
    expect(s.fails === 3 || s.consecutiveRejects === 5, ctx).toBe(true)
  }
}
