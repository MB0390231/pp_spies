import { describe, expect, it } from 'vitest'
import { mulberry32 } from './random'
import {
  buildRoles,
  failsToFail,
  isValidPlayerCount,
  missionFails,
  spyCount,
  teamSize,
} from './rules'

describe('spyCount', () => {
  it('matches the README table', () => {
    expect([5, 6, 7, 8, 9, 10, 11, 12, 13].map(spyCount)).toEqual([2, 2, 3, 3, 3, 4, 4, 4, 5])
  })

  it('rejects invalid player counts', () => {
    expect(() => spyCount(4)).toThrow()
    expect(() => spyCount(14)).toThrow()
    expect(() => spyCount(5.5)).toThrow()
  })
})

describe('teamSize', () => {
  const table: Record<number, number[]> = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5],
    11: [4, 5, 5, 6, 6],
    12: [4, 5, 6, 6, 6],
    13: [4, 5, 6, 6, 7],
  }

  it('matches the README table for every player count and round', () => {
    for (const [n, sizes] of Object.entries(table)) {
      for (let round = 1; round <= 5; round++) {
        expect(teamSize(Number(n), round)).toBe(sizes[round - 1])
      }
    }
  })

  it('rejects out-of-range rounds', () => {
    expect(() => teamSize(5, 0)).toThrow()
    expect(() => teamSize(5, 6)).toThrow()
  })

  describe('challenge mode', () => {
    it('adds one player on rounds 1 and 2 for every player count', () => {
      for (const n of Object.keys(table).map(Number)) {
        expect(teamSize(n, 1, true)).toBe(teamSize(n, 1) + 1)
        expect(teamSize(n, 2, true)).toBe(teamSize(n, 2) + 1)
      }
    })

    it('leaves rounds 3-5 unchanged', () => {
      for (const n of Object.keys(table).map(Number)) {
        for (const round of [3, 4, 5]) {
          expect(teamSize(n, round, true)).toBe(teamSize(n, round))
        }
      }
    })

    it('defaults to baseline sizes when the flag is omitted', () => {
      expect(teamSize(7, 1)).toBe(2)
      expect(teamSize(7, 1, false)).toBe(2)
    })
  })
})

describe('failsToFail (Round 4 special rule)', () => {
  it('requires 2 fails on round 4 with 7+ players', () => {
    expect(failsToFail(7, 4)).toBe(2)
    expect(failsToFail(8, 4)).toBe(2)
    expect(failsToFail(10, 4)).toBe(2)
  })

  it('requires 1 fail on round 4 with fewer than 7 players', () => {
    expect(failsToFail(5, 4)).toBe(1)
    expect(failsToFail(6, 4)).toBe(1)
  })

  it('requires 1 fail on every non-4 round', () => {
    for (const round of [1, 2, 3, 5]) {
      expect(failsToFail(10, round)).toBe(1)
    }
  })
})

describe('missionFails', () => {
  it('fails on a single fail card normally', () => {
    expect(missionFails(7, 1, 1)).toBe(true)
    expect(missionFails(7, 1, 0)).toBe(false)
  })

  it('needs two fail cards on round 4 with 7+ players', () => {
    expect(missionFails(7, 4, 1)).toBe(false)
    expect(missionFails(7, 4, 2)).toBe(true)
  })

  it('still fails on one card on round 4 with fewer than 7 players', () => {
    expect(missionFails(6, 4, 1)).toBe(true)
  })
})

describe('buildRoles', () => {
  it('produces the right spy count for each player size', () => {
    for (const n of [5, 6, 7, 8, 9, 10]) {
      const roles = buildRoles(n, mulberry32(1))
      expect(roles).toHaveLength(n)
      expect(roles.filter((r) => r === 'spy')).toHaveLength(spyCount(n))
    }
  })

  it('is deterministic for a given seed', () => {
    expect(buildRoles(7, mulberry32(42))).toEqual(buildRoles(7, mulberry32(42)))
  })
})

describe('isValidPlayerCount', () => {
  it('accepts 5-13 only', () => {
    expect([5, 6, 7, 8, 9, 10, 11, 12, 13].every(isValidPlayerCount)).toBe(true)
    expect(isValidPlayerCount(4)).toBe(false)
    expect(isValidPlayerCount(14)).toBe(false)
  })
})
