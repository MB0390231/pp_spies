// The rulebook as pure data + functions. These are the numbers the README
// pins down; everything here is covered by rules.test.ts.

import { shuffle } from './random'
import type { Role } from './types'

export const MIN_PLAYERS = 5
export const MAX_PLAYERS = 10
export const MISSIONS = 5
export const MISSIONS_TO_WIN = 3
export const MAX_REJECTS = 5

/** Number of spies by player count. */
export const SPY_COUNTS: Readonly<Record<number, number>> = {
  5: 2,
  6: 2,
  7: 3,
  8: 3,
  9: 3,
  10: 4,
}

/** Mission team size by player count, indexed [round-1] for rounds 1..5. */
export const TEAM_SIZES: Readonly<Record<number, readonly number[]>> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
}

export function isValidPlayerCount(n: number): boolean {
  return Number.isInteger(n) && n >= MIN_PLAYERS && n <= MAX_PLAYERS
}

function assertPlayerCount(n: number): void {
  if (!isValidPlayerCount(n)) {
    throw new Error(`Invalid player count: ${n} (must be ${MIN_PLAYERS}-${MAX_PLAYERS})`)
  }
}

function assertRound(round: number): void {
  if (!Number.isInteger(round) || round < 1 || round > MISSIONS) {
    throw new Error(`Invalid round: ${round} (must be 1-${MISSIONS})`)
  }
}

/** Spies for a given player count. */
export function spyCount(n: number): number {
  assertPlayerCount(n)
  return SPY_COUNTS[n]!
}

/** Required team size for a player count and 1-based round. */
export function teamSize(n: number, round: number): number {
  assertPlayerCount(n)
  assertRound(round)
  return TEAM_SIZES[n]![round - 1]!
}

/**
 * How many fail cards are needed to fail a mission. Round 4 with 7+ players
 * needs 2; every other mission needs 1.
 */
export function failsToFail(n: number, round: number): number {
  assertPlayerCount(n)
  assertRound(round)
  return round === 4 && n >= 7 ? 2 : 1
}

/** Whether a mission fails given the number of fail cards played. */
export function missionFails(n: number, round: number, failCount: number): boolean {
  return failCount >= failsToFail(n, round)
}

/** A resistance-vs-spy role list of length n, shuffled by the given rng. */
export function buildRoles(n: number, rng: () => number): Role[] {
  const spies = spyCount(n)
  const roles: Role[] = [
    ...Array<Role>(spies).fill('spy'),
    ...Array<Role>(n - spies).fill('resistance'),
  ]
  return shuffle(roles, rng)
}

/** A vote passes only with a strict majority of approvals; ties reject. */
export function voteApproved(approveCount: number, rejectCount: number): boolean {
  return approveCount > rejectCount
}
