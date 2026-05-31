import { describe, expect, it } from 'vitest'
import { mulberry32 } from './random'
import {
  buildRoles,
  failsToFail,
  isValidPlayerCount,
  missionFails,
  spyCount,
  teamSize,
  voteApproved,
} from './rules'

describe('spyCount', () => {
  it('matches the README table', () => {
    expect([5, 6, 7, 8, 9, 10].map(spyCount)).toEqual([2, 2, 3, 3, 3, 4])
  })

  it('rejects invalid player counts', () => {
    expect(() => spyCount(4)).toThrow()
    expect(() => spyCount(11)).toThrow()
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

describe('voteApproved', () => {
  it('passes only on a strict majority', () => {
    expect(voteApproved(3, 2)).toBe(true)
    expect(voteApproved(2, 2)).toBe(false) // tie rejects
    expect(voteApproved(2, 3)).toBe(false)
  })
})

describe('isValidPlayerCount', () => {
  it('accepts 5-10 only', () => {
    expect([5, 6, 7, 8, 9, 10].every(isValidPlayerCount)).toBe(true)
    expect(isValidPlayerCount(4)).toBe(false)
    expect(isValidPlayerCount(11)).toBe(false)
  })
})
