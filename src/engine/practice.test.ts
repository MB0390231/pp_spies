// Practice-mode engine tests: SETUP deals throwaway roles; the practice loop
// never touches the real score or reaches gameOver; 5 rejects in practice
// resets rather than ending; BEGIN_REAL_GAME re-deals fresh roles with a new
// seed and resets everything; and the whole thing stays deterministic.

import { describe, expect, it } from 'vitest'
import { currentTeamSize, initialState, reducer } from './reducer'
import type { Action, GameState, MissionCard } from './types'

const NAMES7 = ['Al', 'Bo', 'Cy', 'Di', 'Ed', 'Fi', 'Gu']

function apply(state: GameState, actions: Action[]): GameState {
  return actions.reduce(reducer, state)
}

/** A practice game advanced to teamProposal. */
function practiceGame(names = NAMES7, seed = 123): GameState {
  return apply(initialState(), [
    { type: 'SETUP', names, seed, practice: true },
    { type: 'START_ROUNDS' },
  ])
}

function approveTeam(state: GameState, team: number[]): GameState {
  const proposed = reducer(state, { type: 'PROPOSE_TEAM', team })
  return reducer(proposed, { type: 'RESOLVE_PROPOSAL', approved: true })
}

/** Play the current proposed team (spies fail if listed) and reveal. */
function playMission(state: GameState, failers: number[] = []): GameState {
  return state.proposedTeam.reduce<GameState>((s, id) => {
    const card: MissionCard = failers.includes(id) ? 'fail' : 'success'
    return reducer(s, { type: 'PLAY_CARD', playerId: id, card })
  }, state)
}

/** Ids for a team of the current required size. */
function anyTeam(state: GameState): number[] {
  return state.players.slice(0, currentTeamSize(state)).map((p) => p.id)
}

describe('SETUP with practice', () => {
  it('deals roles and flags the game as practice', () => {
    const s = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 1, practice: true })
    expect(s.practice).toBe(true)
    expect(s.phase).toBe('roleReveal')
    expect(s.players).toHaveLength(7)
    expect(s.players.filter((p) => p.role === 'spy')).toHaveLength(3)
  })

  it('defaults practice to false for a normal game', () => {
    const s = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 1 })
    expect(s.practice).toBe(false)
  })

  it('practice deal is deterministic for a seed (same temp roles across rounds)', () => {
    const a = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 42, practice: true })
    const b = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 42, practice: true })
    expect(a.players.map((p) => p.role)).toEqual(b.players.map((p) => p.role))
  })
})

describe('practice loop: missions never count and never end the game', () => {
  it('a completed practice mission loops to a fresh round, real score untouched', () => {
    let s = practiceGame()
    const rolesBefore = s.players.map((p) => p.role)
    const leaderBefore = s.leaderIndex

    // Run a full practice mission with a sabotage — outcome shown, then loop.
    const spy = s.players.find((p) => p.role === 'spy')!
    const team = [spy.id, ...s.players.filter((p) => p.id !== spy.id).slice(0, currentTeamSize(s) - 1).map((p) => p.id)]
    s = approveTeam(s, team)
    s = playMission(s, [spy.id])
    expect(s.phase).toBe('missionReveal')
    expect(s.lastMission?.success).toBe(false) // reveal mechanic still works

    s = reducer(s, { type: 'CONFIRM_MISSION' })
    // Looped back to a fresh practice round — NOT gameOver.
    expect(s.phase).toBe('teamProposal')
    expect(s.practice).toBe(true)
    expect(s.winner).toBeNull()
    // Real score/results are all untouched.
    expect(s.successes).toBe(0)
    expect(s.fails).toBe(0)
    expect(s.results).toHaveLength(0)
    expect(s.lastMission).toBeNull()
    // Leader rotated, team/cards cleared, round cycled for varied sizes.
    expect(s.leaderIndex).toBe((leaderBefore + 1) % s.players.length)
    expect(s.proposedTeam).toEqual([])
    expect(s.missionCards).toEqual({})
    // Same temp roles persist — you rehearse YOUR role.
    expect(s.players.map((p) => p.role)).toEqual(rolesBefore)
  })

  it('three practice successes do NOT win — it keeps looping', () => {
    let s = practiceGame()
    for (let i = 0; i < 4; i++) {
      s = approveTeam(s, anyTeam(s))
      s = playMission(s) // all success
      s = reducer(s, { type: 'CONFIRM_MISSION' })
      expect(s.phase).toBe('teamProposal')
      expect(s.winner).toBeNull()
      expect(s.successes).toBe(0)
    }
  })

  it('the round cycles 1..5 across practice rounds so team sizes vary', () => {
    let s = practiceGame()
    const rounds: number[] = [s.round]
    for (let i = 0; i < 6; i++) {
      s = approveTeam(s, anyTeam(s))
      s = playMission(s)
      s = reducer(s, { type: 'CONFIRM_MISSION' })
      rounds.push(s.round)
    }
    // 1 → 2 → 3 → 4 → 5 → 1 → 2 (cycles, never stops)
    expect(rounds).toEqual([1, 2, 3, 4, 5, 1, 2])
  })
})

describe('practice: 5 consecutive rejects resets instead of ending', () => {
  it('does not hand the spies the win; counter resets and it rolls on', () => {
    let s = practiceGame()
    for (let i = 0; i < 5; i++) {
      const proposed = reducer(s, { type: 'PROPOSE_TEAM', team: anyTeam(s) })
      s = reducer(proposed, { type: 'RESOLVE_PROPOSAL', approved: false })
    }
    expect(s.phase).toBe('teamProposal')
    expect(s.winner).toBeNull()
    expect(s.consecutiveRejects).toBe(0) // reset, not 5-and-over
  })

  it('a normal game still ends on 5 rejects (unchanged)', () => {
    let s = apply(initialState(), [
      { type: 'SETUP', names: NAMES7, seed: 123 },
      { type: 'START_ROUNDS' },
    ])
    for (let i = 0; i < 5; i++) {
      const proposed = reducer(s, { type: 'PROPOSE_TEAM', team: anyTeam(s) })
      s = reducer(proposed, { type: 'RESOLVE_PROPOSAL', approved: false })
    }
    expect(s.phase).toBe('gameOver')
    expect(s.winner).toBe('spies')
  })
})

describe('BEGIN_REAL_GAME', () => {
  it('re-deals real roles with a new seed and resets everything', () => {
    // Advance practice a couple rounds so state is dirty.
    let s = practiceGame(NAMES7, 1)
    s = approveTeam(s, anyTeam(s))
    s = playMission(s)
    s = reducer(s, { type: 'CONFIRM_MISSION' })
    expect(s.practice).toBe(true)

    s = reducer(s, { type: 'BEGIN_REAL_GAME', seed: 999 })
    expect(s.practice).toBe(false)
    expect(s.phase).toBe('roleReveal')
    expect(s.round).toBe(1)
    expect(s.successes).toBe(0)
    expect(s.fails).toBe(0)
    expect(s.consecutiveRejects).toBe(0)
    expect(s.results).toHaveLength(0)
    expect(s.players.map((p) => p.name)).toEqual(NAMES7)
    expect(s.players.filter((p) => p.role === 'spy')).toHaveLength(3)
  })

  it('the real deal is independent of the practice deal (no spoiler)', () => {
    // Same setup seed for practice; a DIFFERENT real seed → generally different roles.
    const practice = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 5, practice: true })
    const real = reducer(practice, { type: 'BEGIN_REAL_GAME', seed: 12345 })
    // The real roles come from the real seed, not the practice seed.
    const fromRealSeed = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 12345 })
    expect(real.players.map((p) => p.role)).toEqual(fromRealSeed.players.map((p) => p.role))
  })

  it('preserves the challenge-mode setting into the real game', () => {
    const practice = reducer(initialState(), {
      type: 'SETUP',
      names: NAMES7,
      seed: 5,
      practice: true,
      challengeMode: true,
    })
    const real = reducer(practice, { type: 'BEGIN_REAL_GAME', seed: 7 })
    expect(real.challengeMode).toBe(true)
    expect(real.practice).toBe(false)
  })

  it('is a no-op outside practice (strict state machine)', () => {
    const normal = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 1 })
    expect(reducer(normal, { type: 'BEGIN_REAL_GAME', seed: 2 })).toBe(normal)
    expect(reducer(initialState(), { type: 'BEGIN_REAL_GAME', seed: 2 })).toEqual(initialState())
  })

  it('is deterministic for a seed', () => {
    const practice = reducer(initialState(), { type: 'SETUP', names: NAMES7, seed: 5, practice: true })
    const a = reducer(practice, { type: 'BEGIN_REAL_GAME', seed: 77 })
    const b = reducer(practice, { type: 'BEGIN_REAL_GAME', seed: 77 })
    expect(a).toEqual(b)
  })
})

describe('leader rotates across practice rounds', () => {
  it('rotates on every practice mission and every practice rejection', () => {
    let s = practiceGame()
    const start = s.leaderIndex
    // A rejection rotates.
    const proposed = reducer(s, { type: 'PROPOSE_TEAM', team: anyTeam(s) })
    s = reducer(proposed, { type: 'RESOLVE_PROPOSAL', approved: false })
    expect(s.leaderIndex).toBe((start + 1) % s.players.length)
    // A completed mission rotates again.
    const afterReject = s.leaderIndex
    s = approveTeam(s, anyTeam(s))
    s = playMission(s)
    s = reducer(s, { type: 'CONFIRM_MISSION' })
    expect(s.leaderIndex).toBe((afterReject + 1) % s.players.length)
  })
})
